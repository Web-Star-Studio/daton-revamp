import * as Sentry from "@sentry/cloudflare";
import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

import { bootstrapOrganizationWithWorkOs } from "@daton/auth";
import {
  createBootstrapOrganizationSchema,
  organizationMemberSummarySchema,
  organizationSummarySchema,
} from "@daton/contracts";
import {
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
  const sessionContext = c.get("sessionContext");
  const snapshot = c.get("sessionSnapshot");

  if (sessionContext?.membershipCount && sessionContext.membershipCount > 0) {
    throw new HTTPException(409, {
      message: "Este usuário já pertence a uma organização.",
    });
  }

  const input = await parseBootstrapInput(c);
  const db = c.get("db");

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

  if (!snapshot && !input.password) {
    throw new HTTPException(400, {
      message: "A senha inicial é obrigatória para criar o primeiro acesso.",
    });
  }

  let result;

  try {
    result = await bootstrapOrganizationWithWorkOs(
      db,
      c.get("workosEnv"),
      input,
      snapshot
        ? {
            id: snapshot.user.id,
            email: snapshot.user.email,
            firstName: null,
            lastName: null,
          }
        : null,
    );

  } catch (error) {
    Sentry.captureException(error);

    throw new HTTPException(400, {
      message: "Não foi possível criar o ambiente inicial com os dados informados.",
    });
  }

  try {
    await recordAuditEvent(db as AppDbExecutor, {
      action: "organization.bootstrap",
      entityType: "organization",
      entityId: result.organization.id,
      organizationId: result.organization.id,
      actorUserId: result.workosUser.id,
      actorMemberId: result.member.id,
      metadata: {},
    });

  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }

  return c.json({
    member: organizationMemberSummarySchema.parse({
      id: result.member.id,
      userId: result.workosUser.id,
      fullName: result.member.fullName,
      email: result.member.email,
      status: "active",
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
    workosOrganizationId: result.organization.workosOrganizationId,
    workosUserId: result.workosUser.id,
  });
});

bootstrapRoutes.get("/auth/session-context", async (c) => {
  const sessionContext = c.get("sessionContext");

  if (!sessionContext) {
    throw new HTTPException(401, {
      message: "Autenticação obrigatória.",
    });
  }

  return c.json({
    membershipCount: sessionContext.membershipCount,
    session: sessionContext.snapshot,
    workosOrganizationId: sessionContext.workosOrganizationId,
  });
});
