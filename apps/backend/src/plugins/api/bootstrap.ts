import * as Sentry from "@sentry/node";
import { ZodError } from "zod";

import {
  memberRoleAssignments,
  organizationMembers,
  organizations,
} from "@daton/db";
import {
  createBootstrapOrganizationSchema,
  organizationMemberSummarySchema,
  organizationSummarySchema,
} from "@daton/contracts";

import { recordAuditEvent } from "../../lib/audit";
import { HTTPException } from "../../lib/errors";
import {
  createRouteContext,
  type AppRouteContext,
} from "../../lib/route-context";
import type { AppDbExecutor, SessionSnapshot } from "../../lib/session";
import type { FastifyPluginAsync } from "fastify";

const normalizeComparableName = (value: string | null | undefined) =>
  value?.trim().replace(/\s+/g, " ").toLocaleLowerCase() ?? null;

const parseBootstrapInput = async (c: AppRouteContext) => {
  try {
    return createBootstrapOrganizationSchema({
      allowFictional: c.env.ALLOW_FICTIONAL_CNPJ === "true",
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

type BootstrapInput = Awaited<ReturnType<typeof parseBootstrapInput>>;

const assertAuthenticatedBootstrapIdentity = (
  snapshot: SessionSnapshot,
  input: BootstrapInput,
) => {
  if (input.adminEmail !== snapshot.user.email) {
    throw new HTTPException(400, {
      message:
        "O e-mail do administrador deve corresponder ao usuário autenticado.",
    });
  }

  if (
    snapshot.user.name &&
    normalizeComparableName(input.adminFullName) !==
      normalizeComparableName(snapshot.user.name)
  ) {
    throw new HTTPException(400, {
      message:
        "O nome do administrador deve corresponder ao usuário autenticado.",
    });
  }
};

const bootstrapOrganization = async (
  db: AppDbExecutor,
  input: BootstrapInput,
  snapshot: SessionSnapshot,
) => {
  return db.transaction(async (tx) => {
    const [organization] = await tx
      .insert(organizations)
      .values({
        legalName: input.legalName,
        tradeName: input.tradeName?.trim() || null,
        legalIdentifier: input.legalIdentifier,
      })
      .returning();

    if (!organization) {
      throw new Error("Failed to create local organization.");
    }

    const [member] = await tx
      .insert(organizationMembers)
      .values({
        organizationId: organization.id,
        userId: snapshot.user.id,
        fullName: snapshot.user.name?.trim() || input.adminFullName.trim(),
        email: snapshot.user.email,
      })
      .returning();

    if (!member) {
      throw new Error("Failed to create local organization member.");
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

    return {
      member,
      organization,
    };
  });
};

export const classifyBootstrapError = (error: unknown) => {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "23505"
  ) {
    const details = [
      "constraint" in error ? error.constraint : null,
      "detail" in error ? error.detail : null,
      "message" in error ? error.message : null,
    ]
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.toLowerCase());

    if (
      details.some(
        (value) =>
          value.includes("organizations_legal_identifier_idx")
          || value.includes("legal_identifier"),
      )
    ) {
      return {
        message: "Já existe uma organização com este CNPJ.",
        status: 409 as const,
      };
    }
  }

  return {
    message: "Erro interno ao criar o ambiente inicial.",
    status: 500 as const,
  };
};

const bootstrapPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.post("/bootstrap/organization", async (request, reply) => {
    const c = createRouteContext(request, reply);
    const sessionContext = c.get("sessionContext");
    const snapshot = c.get("sessionSnapshot");

    if (!sessionContext || !snapshot) {
      throw new HTTPException(401, {
        message: "Autenticação obrigatória.",
      });
    }

    if (sessionContext.membershipCount > 0) {
      throw new HTTPException(409, {
        message: "Este usuário já pertence a uma organização.",
      });
    }

    const input = await parseBootstrapInput(c);
    assertAuthenticatedBootstrapIdentity(snapshot, input);

    let result;

    try {
      result = await bootstrapOrganization(c.get("db") as AppDbExecutor, input, snapshot);
    } catch (error) {
      const classified = classifyBootstrapError(error);

      if (classified.status >= 500) {
        Sentry.captureException(error);
      }

      if (error instanceof HTTPException) {
        throw error;
      }

      throw new HTTPException(classified.status, {
        message: classified.message,
      });
    }

    try {
      await recordAuditEvent(c.get("db") as AppDbExecutor, {
        action: "organization.bootstrap",
        entityType: "organization",
        entityId: result.organization.id,
        organizationId: result.organization.id,
        actorUserId: snapshot.user.id,
        actorMemberId: result.member.id,
        metadata: {},
      });
    } catch (error) {
      Sentry.captureException(error);
      request.log.error(
        {
          err: error,
          action: "organization.bootstrap",
          organizationId: result.organization.id,
          actorUserId: snapshot.user.id,
        },
        "Failed to record bootstrap audit event.",
      );
    }

    return c.json({
      member: organizationMemberSummarySchema.parse({
        id: result.member.id,
        userId: result.member.userId,
        fullName: result.member.fullName,
        email: result.member.email,
        status: result.member.status,
      }),
      organization: organizationSummarySchema.parse({
        id: result.organization.id,
        legalName: result.organization.legalName,
        tradeName: result.organization.tradeName,
        legalIdentifier: result.organization.legalIdentifier,
        openingDate: null,
        taxRegime: null,
        primaryCnae: null,
        stateRegistration: null,
        municipalRegistration: null,
        onboardingData: { company_profile: null },
        onboardingStatus: "pending",
      }),
    });
  });
};

export default bootstrapPlugin;
