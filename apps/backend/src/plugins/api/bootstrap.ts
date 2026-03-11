import * as Sentry from "@sentry/node";
import { ZodError } from "zod";

import {
  bootstrapOrganizationWithWorkOs,
  classifyWorkOsUserFacingError,
} from "@daton/auth";
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
import type { FastifyBaseLogger, FastifyPluginAsync } from "fastify";

const transientErrorCodes = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "ETIMEDOUT",
  "EAI_AGAIN",
]);

const normalizeComparableName = (value: string | null | undefined) =>
  value?.trim().replace(/\s+/g, " ").toLocaleLowerCase() ?? null;

const getErrorChain = (error: unknown) => {
  const queue = [error];
  const seen = new Set<unknown>();
  const chain: Array<Record<string, unknown>> = [];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current || typeof current !== "object" || seen.has(current)) {
      continue;
    }

    seen.add(current);
    chain.push(current as Record<string, unknown>);

    if (current instanceof AggregateError) {
      queue.push(...current.errors);
    }

    if ("cause" in current) {
      queue.push(current.cause);
    }
  }

  return chain;
};

const getErrorStatus = (error: unknown) => {
  for (const candidate of getErrorChain(error)) {
    if (typeof candidate.status === "number") {
      return candidate.status;
    }

    if (typeof candidate.statusCode === "number") {
      return candidate.statusCode;
    }
  }

  return null;
};

const getErrorCode = (error: unknown) => {
  for (const candidate of getErrorChain(error)) {
    if (typeof candidate.code === "string") {
      return candidate.code;
    }
  }

  return null;
};

const getErrorName = (error: unknown) => {
  for (const candidate of getErrorChain(error)) {
    if (typeof candidate.name === "string") {
      return candidate.name;
    }
  }

  return null;
};

const isLegalIdentifierConflict = (error: unknown) => {
  return getErrorChain(error).some((candidate) => {
    if (typeof candidate.code !== "string" || candidate.code !== "23505") {
      return false;
    }

    const values = [
      typeof candidate.constraint === "string" ? candidate.constraint : null,
      typeof candidate.constraint_name === "string"
        ? candidate.constraint_name
        : null,
      typeof candidate.column === "string" ? candidate.column : null,
      typeof candidate.column_name === "string" ? candidate.column_name : null,
      typeof candidate.detail === "string" ? candidate.detail : null,
      typeof candidate.message === "string" ? candidate.message : null,
    ]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase());

    return values.some(
      (value) =>
        value.includes("organizations_legal_identifier_idx") ||
        value.includes("legal_identifier"),
    );
  });
};

export const classifyBootstrapError = (
  error: unknown,
  logger: Pick<FastifyBaseLogger, "warn">,
): { message: string; status: 400 | 409 | 500 | 502 | 503 } => {
  const status = getErrorStatus(error);
  const code = getErrorCode(error);
  const name = getErrorName(error);

  if (isLegalIdentifierConflict(error)) {
    return {
      message: "Já existe uma organização com este CNPJ.",
      status: 409,
    };
  }

  const classifiedWorkOsError = classifyWorkOsUserFacingError(
    error,
    "bootstrap",
  );

  if (classifiedWorkOsError.isExpected) {
    return {
      message: classifiedWorkOsError.message,
      status: 400,
    };
  }

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

    logger.warn(
      { err: error },
      "Unexpected TypeError while bootstrapping organization.",
    );
  }

  return {
    message: "Erro interno ao criar o ambiente inicial.",
    status: 500,
  };
};

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

const bootstrapPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.post("/bootstrap/organization", async (request, reply) => {
    const c = createRouteContext(request, reply);
    const sessionContext = c.get("sessionContext");
    const snapshot = c.get("sessionSnapshot");

    if (sessionContext?.membershipCount && sessionContext.membershipCount > 0) {
      throw new HTTPException(409, {
        message: "Este usuário já pertence a uma organização.",
      });
    }

    const input = await parseBootstrapInput(c);
    const db = c.get("db");

    if (!snapshot && !input.password) {
      throw new HTTPException(400, {
        message: "A senha inicial é obrigatória para criar o primeiro acesso.",
      });
    }

    if (snapshot) {
      assertAuthenticatedBootstrapIdentity(snapshot, input);
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
      const classified = classifyBootstrapError(error, request.log);

      if (classified.status >= 500) {
        Sentry.withScope((scope) => {
          scope.setTag(
            "auth.error_kind",
            classifyWorkOsUserFacingError(error, "bootstrap").kind,
          );
          scope.setTag("auth.flow", "bootstrap");
          Sentry.captureException(error);
        });
      }

      if (error instanceof HTTPException) {
        throw error;
      }

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
      request.log.error(
        {
          err: error,
          action: "organization.bootstrap",
          organizationId: result.organization.id,
          actorUserId: result.workosUser.id,
        },
        "Failed to record bootstrap audit event.",
      );
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

  fastify.get("/auth/session-context", async (request, reply) => {
    const c = createRouteContext(request, reply);
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
};

export default bootstrapPlugin;
