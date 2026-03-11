import * as Sentry from "@sentry/node";
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

const transientErrorCodes = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "ETIMEDOUT",
  "EAI_AGAIN",
]);

const classifyBootstrapError = (
  error: unknown,
): { message: string; status: 400 | 500 | 502 | 503 } => {
  const status =
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof error.status === "number"
      ? error.status
      : null;
  const code =
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : null;
  const name =
    error &&
    typeof error === "object" &&
    "name" in error &&
    typeof error.name === "string"
      ? error.name
      : null;

  if (
    status === 400 ||
    status === 409 ||
    name === "BadRequestException" ||
    name === "ConflictException" ||
    code === "23505"
  ) {
    return {
      message:
        "Não foi possível criar o ambiente inicial com os dados informados.",
      status: 400,
    };
  }

  if (status !== null && status >= 500) {
    return {
      message: "Não foi possível criar o ambiente inicial agora.",
      status: 502,
    };
  }

  if (code && transientErrorCodes.has(code)) {
    return {
      message:
        "Os serviços necessários para criar o ambiente estão indisponíveis no momento.",
      status: 503,
    };
  }

  if (name === "TypeError") {
    const message = error instanceof Error ? error.message.toLowerCase() : "";

    if (
      message.includes("failed to fetch") ||
      message.includes("fetch") ||
      message.includes("network")
    ) {
      return {
        message:
          "Os serviços necessários para criar o ambiente estão indisponíveis no momento.",
        status: 503,
      };
    }

    console.warn(
      "Unexpected TypeError while bootstrapping organization.",
      error,
    );
  }

  return {
    message: "Erro interno ao criar o ambiente inicial.",
    status: 500,
  };
};

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

    if (error instanceof HTTPException) {
      throw error;
    }

    const classified = classifyBootstrapError(error);

    throw new HTTPException(classified.status, {
      message: classified.message,
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
