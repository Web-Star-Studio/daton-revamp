import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  accessTokenRefreshWindowSeconds,
  authenticateWithWorkOsEmailVerification,
  authenticateWithWorkOsPassword,
  createDatonSessionPayload,
  createWorkOsClient,
  datonSessionCookieName,
  decodeWorkOsAccessToken,
  getWorkOsEmailVerification,
  isWorkOsAuthenticationFailure as isSharedWorkOsAuthenticationFailure,
  parseDatonSessionEnv,
  pendingEmailVerificationLifetimeSeconds,
  parseWorkOsManagementEnv,
  sealPendingEmailVerification,
  sendWorkOsVerificationEmail,
  refreshWorkOsAuthentication,
  sealDatonSession,
  unsealPendingEmailVerification,
  unsealDatonSession,
  type DatonSessionCookiePayload,
  type PendingEmailVerificationCookiePayload,
} from "@daton/auth";
import { sessionResponseSchema } from "@daton/contracts";

import { appConfig, toInternalApiUrl } from "./config";

const loopbackHosts = new Set(["127.0.0.1", "localhost", "::1"]);
const sessionLifetimeSeconds = 60 * 60 * 24 * 7;
const pendingEmailVerificationCookieName = "daton-pending-email-verification";

const sessionContextSchema = z.object({
  membershipCount: z.number().int().nonnegative(),
  session: sessionResponseSchema,
  workosOrganizationId: z.string().nullable(),
});

type AuthSessionErrorKind = "auth" | "network" | "schema" | "upstream";

export class AuthSessionError extends Error {
  readonly clearSession: boolean;
  readonly code?: string;
  readonly kind: AuthSessionErrorKind;
  readonly status: number;

  constructor(input: {
    message: string;
    kind: AuthSessionErrorKind;
    status: number;
    clearSession: boolean;
    code?: string;
    cause?: unknown;
  }) {
    super(input.message);
    this.name = "AuthSessionError";
    this.clearSession = input.clearSession;
    this.code = input.code;
    this.kind = input.kind;
    this.status = input.status;

    if (input.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = input.cause;
    }
  }
}

const getErrorStatus = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return null;
  }

  if ("status" in error && typeof error.status === "number") {
    return error.status;
  }

  if ("statusCode" in error && typeof error.statusCode === "number") {
    return error.statusCode;
  }

  return null;
};

const getErrorCode = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  if ("code" in error && typeof error.code === "string") {
    return error.code;
  }

  if ("error" in error && typeof error.error === "string") {
    return error.error;
  }

  return undefined;
};

export const isWorkOsAuthenticationFailure =
  isSharedWorkOsAuthenticationFailure;

const toAuthSessionError = (error: unknown, fallbackMessage: string) => {
  if (error instanceof AuthSessionError) {
    return error;
  }

  if (error instanceof z.ZodError) {
    return new AuthSessionError({
      message: "A resposta do servidor é inválida.",
      kind: "schema",
      status: 502,
      clearSession: false,
      cause: error,
    });
  }

  const status = getErrorStatus(error);
  const code = getErrorCode(error);

  if (status === 401 || status === 403) {
    return new AuthSessionError({
      message:
        error instanceof Error && error.message
          ? error.message
          : "Autenticação obrigatória.",
      kind: "auth",
      status,
      clearSession: true,
      code,
      cause: error,
    });
  }

  if (status !== null) {
    return new AuthSessionError({
      message:
        error instanceof Error && error.message
          ? error.message
          : fallbackMessage,
      kind: "upstream",
      status: 502,
      clearSession: false,
      code,
      cause: error,
    });
  }

  return new AuthSessionError({
    message:
      error instanceof Error && error.message ? error.message : fallbackMessage,
    kind: "network",
    status: 503,
    clearSession: false,
    cause: error,
  });
};

const isSecureCookie = () => {
  try {
    return !loopbackHosts.has(
      normalizeHostname(new URL(appConfig.appBaseUrl).hostname),
    );
  } catch {
    return process.env.NODE_ENV === "production";
  }
};

const getCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  maxAge,
  path: "/",
  sameSite: "lax" as const,
  secure: isSecureCookie(),
});

const getSessionCookieOptions = () => getCookieOptions(sessionLifetimeSeconds);

const getPendingEmailVerificationCookieOptions = () =>
  getCookieOptions(pendingEmailVerificationLifetimeSeconds);

const parseJsonResponse = async <T>(
  response: Response,
  schema: z.ZodType<T>,
) => {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : "A solicitação falhou.";
    throw new AuthSessionError({
      message,
      kind:
        response.status === 401 || response.status === 403
          ? "auth"
          : "upstream",
      status:
        response.status === 401 || response.status === 403
          ? response.status
          : 502,
      clearSession: response.status === 401 || response.status === 403,
      cause: payload,
    });
  }

  try {
    return schema.parse(payload);
  } catch (error) {
    throw toAuthSessionError(error, "A resposta do servidor é inválida.");
  }
};

export const getWorkOsManagementEnv = () =>
  parseWorkOsManagementEnv({
    WORKOS_API_KEY: process.env.WORKOS_API_KEY,
    WORKOS_CLIENT_ID: process.env.WORKOS_CLIENT_ID,
    WORKOS_AUTHKIT_DOMAIN: process.env.WORKOS_AUTHKIT_DOMAIN,
  });

export const getDatonSessionEnv = () =>
  parseDatonSessionEnv({
    DATON_SESSION_SECRET: process.env.DATON_SESSION_SECRET,
  });

export const readRequestMeta = (headers: Headers) => ({
  ipAddress:
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    headers
      .get("x-forwarded-for")
      ?.split(",")
      .map((value) => value.trim())
      .find(Boolean),
  userAgent: headers.get("user-agent") ?? undefined,
});

export const getDatonSessionFromCookieStore = async () => {
  const cookieStore = await cookies();
  return unsealDatonSession(
    cookieStore.get(datonSessionCookieName)?.value,
    getDatonSessionEnv(),
  );
};

export const setDatonSessionCookie = async (
  response: NextResponse,
  payload: DatonSessionCookiePayload,
) => {
  const sealed = await sealDatonSession(payload, getDatonSessionEnv());
  response.cookies.set(
    datonSessionCookieName,
    sealed,
    getSessionCookieOptions(),
  );
};

export const clearDatonSessionCookie = (response: NextResponse) => {
  response.cookies.set(datonSessionCookieName, "", {
    ...getSessionCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  });
};

export const getPendingEmailVerificationFromCookieStore = async () => {
  const cookieStore = await cookies();
  return unsealPendingEmailVerification(
    cookieStore.get(pendingEmailVerificationCookieName)?.value,
    getDatonSessionEnv(),
  );
};

export const setPendingEmailVerificationCookie = async (
  response: NextResponse,
  payload: PendingEmailVerificationCookiePayload,
) => {
  const sealed = await sealPendingEmailVerification(payload, getDatonSessionEnv());
  response.cookies.set(
    pendingEmailVerificationCookieName,
    sealed,
    getPendingEmailVerificationCookieOptions(),
  );
};

export const clearPendingEmailVerificationCookie = (response: NextResponse) => {
  response.cookies.set(pendingEmailVerificationCookieName, "", {
    ...getPendingEmailVerificationCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  });
};

export const refreshDatonSessionIfNeeded = async (
  payload: DatonSessionCookiePayload | null,
  headers: Headers,
) => {
  if (!payload) {
    return {
      payload: null,
      rotated: false,
      error: null,
    };
  }

  const expiresAt = Date.parse(payload.accessTokenExpiresAt);

  if (
    Number.isFinite(expiresAt) &&
    expiresAt > Date.now() + accessTokenRefreshWindowSeconds * 1000
  ) {
    return {
      payload,
      rotated: false,
      error: null,
    };
  }

  try {
    const authentication = await refreshWorkOsAuthentication(
      getWorkOsManagementEnv(),
      {
        ...readRequestMeta(headers),
        organizationId: payload.workosOrganizationId,
        refreshToken: payload.refreshToken,
      },
    );

    return {
      payload: createDatonSessionPayload(authentication),
      rotated: true,
      error: null,
    };
  } catch (error) {
    const status = getErrorStatus(error);
    const accessTokenStillValid =
      Number.isFinite(expiresAt) && expiresAt > Date.now();
    const authFailure =
      isWorkOsAuthenticationFailure(error) || status === 401 || status === 403;

    if (!authFailure && accessTokenStillValid) {
      return {
        payload,
        rotated: false,
        error: null,
      };
    }

    return {
      payload: authFailure ? null : accessTokenStillValid ? payload : null,
      rotated: false,
      error: authFailure
        ? new AuthSessionError({
            message: "Autenticação obrigatória.",
            kind: "auth",
            status: 401,
            clearSession: true,
            code: getErrorCode(error),
            cause: error,
          })
        : toAuthSessionError(error, "Não foi possível renovar a sessão agora."),
    };
  }
};

export const authenticateBrowserPassword = async (
  input: {
    email: string;
    password: string;
  },
  headers: Headers,
) =>
  authenticateWithWorkOsPassword(getWorkOsManagementEnv(), {
    ...input,
    ...readRequestMeta(headers),
  });

export const authenticateBrowserEmailVerification = async (
  input: {
    code: string;
    pendingAuthenticationToken: string;
  },
  headers: Headers,
) =>
  authenticateWithWorkOsEmailVerification(getWorkOsManagementEnv(), {
    ...input,
    ...readRequestMeta(headers),
  });

export const resendBrowserEmailVerification = async (
  emailVerificationId: string,
) => {
  const emailVerification = await getWorkOsEmailVerification(
    getWorkOsManagementEnv(),
    emailVerificationId,
  );

  return sendWorkOsVerificationEmail(getWorkOsManagementEnv(), {
    userId: emailVerification.userId,
  });
};

export const completeBrowserAuthentication = async (
  authentication: Awaited<ReturnType<typeof authenticateWithWorkOsPassword>>,
  headers: Headers,
  options?: {
    targetWorkosOrganizationId?: string | null;
  },
) => {
  let nextAuthentication = authentication;
  const requestMeta = readRequestMeta(headers);
  const preferredOrganizationId = options?.targetWorkosOrganizationId ?? null;

  if (
    preferredOrganizationId &&
    nextAuthentication.organizationId !== preferredOrganizationId
  ) {
    nextAuthentication = await refreshWorkOsAuthentication(
      getWorkOsManagementEnv(),
      {
        ...requestMeta,
        organizationId: preferredOrganizationId,
        refreshToken: nextAuthentication.refreshToken,
      },
    );
  }

  const sessionContext = await fetchSessionContext(nextAuthentication.accessToken);
  const sessionOrganizationId =
    preferredOrganizationId ?? sessionContext.workosOrganizationId;

  if (
    sessionOrganizationId &&
    nextAuthentication.organizationId !== sessionOrganizationId
  ) {
    nextAuthentication = await refreshWorkOsAuthentication(
      getWorkOsManagementEnv(),
      {
        ...requestMeta,
        organizationId: sessionOrganizationId,
        refreshToken: nextAuthentication.refreshToken,
      },
    );
  }

  return {
    sessionContext,
    sessionPayload: createDatonSessionPayload(nextAuthentication),
  };
};

export const fetchSessionContext = async (accessToken: string) => {
  try {
    return await parseJsonResponse(
      await fetch(toInternalApiUrl("/api/v1/auth/session-context"), {
        cache: "no-store",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      }),
      sessionContextSchema,
    );
  } catch (error) {
    throw toAuthSessionError(error, "Não foi possível validar a sessão agora.");
  }
};

export const fetchServerSession = async (accessToken: string) => {
  try {
    return await parseJsonResponse(
      await fetch(toInternalApiUrl("/api/v1/session"), {
        cache: "no-store",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      }),
      sessionResponseSchema,
    );
  } catch (error) {
    throw toAuthSessionError(
      error,
      "Não foi possível carregar a sessão agora.",
    );
  }
};

export const revokeDatonSession = async (
  payload: DatonSessionCookiePayload | null,
) => {
  if (!payload) {
    return;
  }

  try {
    const claims = decodeWorkOsAccessToken(payload.accessToken);
    await createWorkOsClient(
      getWorkOsManagementEnv(),
    ).userManagement.revokeSession({
      sessionId: claims.sid,
    });
  } catch (error) {
    console.warn("revokeDatonSession failed.", error);
    // Best effort only.
  }
};
const normalizeHostname = (hostname: string) =>
  hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;
