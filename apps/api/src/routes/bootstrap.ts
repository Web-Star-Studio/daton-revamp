import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

import {
  createBootstrapOrganizationSchema,
  branchSummarySchema,
  organizationMemberSummarySchema,
  organizationSummarySchema,
} from "@daton/contracts";
import {
  branches,
  memberRoleAssignments,
  organizationMembers,
  organizations,
} from "@daton/db";

import { recordAuditEvent } from "../lib/audit";
import { parseServerEnv } from "../env";
import type { AppDbExecutor } from "../lib/session";
import type { AppBindings } from "../types";

export const bootstrapRoutes = new Hono<AppBindings>();
const parseBootstrapInput = async (c: any) => {
  const env = parseServerEnv(c.env);

  try {
    return createBootstrapOrganizationSchema({
      allowFictional: env.ALLOW_FICTIONAL_CNPJ,
    }).parse(await c.req.json());
  } catch (error) {
    if (error instanceof ZodError) {
      throw new HTTPException(400, {
        message: error.issues[0]?.message ?? "Dados inválidos.",
      });
    }

    throw error;
  }
};

bootstrapRoutes.post("/bootstrap/organization", async (c) => {
  const snapshot = c.get("sessionSnapshot");

  if (snapshot?.user) {
    throw new HTTPException(409, {
      message: "Você já está autenticado. Conclua a configuração pelo aplicativo.",
    });
  }

  if (snapshot?.organization || snapshot?.member) {
    throw new HTTPException(409, {
      message: "Este usuário já pertence a uma organização.",
    });
  }

  const input = await parseBootstrapInput(c);
  const db = c.get("db");

  if (input.headquarters.legalIdentifier !== input.legalIdentifier) {
    throw new HTTPException(400, {
      message: "No cadastro inicial, o CNPJ da organização e o da matriz devem ser iguais.",
    });
  }

  const [existingOrganization] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.legalIdentifier, input.legalIdentifier))
      .limit(1);

  if (existingOrganization) {
    throw new HTTPException(409, {
      message: "Já existe uma organização com este CNPJ.",
    });
  }

  const authResult = await c
      .get("auth")
      .api.signUpEmail({
        headers: c.req.raw.headers,
        body: {
          name: input.adminFullName,
          email: input.adminEmail,
          password: input.password,
        },
        returnHeaders: true,
      })
      .catch(() => {
        throw new HTTPException(400, {
          message: "Não foi possível criar o acesso inicial com os dados informados.",
        });
      });

  const user = authResult.response.user;

  const result = await db.transaction(async (tx: AppDbExecutor) => {
      const [organization] = await tx
        .insert(organizations)
        .values({
          legalName: input.legalName,
          tradeName: input.tradeName || null,
          legalIdentifier: input.legalIdentifier,
        })
        .returning();

      if (!organization) {
        throw new HTTPException(500, { message: "Não foi possível criar a organização." });
      }

      const [member] = await tx
        .insert(organizationMembers)
        .values({
          organizationId: organization.id,
          userId: user.id,
          fullName: user.name ?? user.email,
          email: user.email,
        })
        .returning();

      if (!member) {
        throw new HTTPException(500, { message: "Não foi possível criar o membro da organização." });
      }

      await tx.insert(memberRoleAssignments).values([
        {
          organizationId: organization.id,
          memberId: member.id,
          role: "owner",
        },
        {
          organizationId: organization.id,
          memberId: member.id,
          role: "admin",
        },
      ]);

      const [headquarters] = await tx
        .insert(branches)
        .values({
          organizationId: organization.id,
          name: input.headquarters.name,
          code: input.headquarters.code,
          legalIdentifier: input.legalIdentifier,
          isHeadquarters: true,
          status: "active",
        })
        .returning();

      if (!headquarters) {
        throw new HTTPException(500, { message: "Não foi possível criar a filial matriz." });
      }

      await recordAuditEvent(tx, {
        action: "organization.bootstrap",
        entityType: "organization",
        entityId: organization.id,
        organizationId: organization.id,
        actorUserId: user.id,
        actorMemberId: member.id,
        metadata: {
          branchId: headquarters.id,
          branchCode: headquarters.code,
        },
      });

      return {
        organization,
        member,
        headquarters,
      };
    });

  const response = c.json({
    organization: organizationSummarySchema.parse(result.organization),
    member: organizationMemberSummarySchema.parse(result.member),
    branch: branchSummarySchema.parse({
      ...result.headquarters,
      managerMemberId: null,
    }),
  });

  authResult.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      response.headers.append(key, value);
    }
  });

  return response;
});
