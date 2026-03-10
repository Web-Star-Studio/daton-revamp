import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  accessTokenRefreshWindowSeconds,
  authenticateWithWorkOsPassword,
  createDatonSessionPayload,
  createWorkOsClient,
  datonSessionCookieName,
  decodeWorkOsAccessToken,
  parseDatonSessionEnv,
  parseWorkOsManagementEnv,
  refreshWorkOsAuthentication,
  sealDatonSession,
  unsealDatonSession,
  type DatonSessionCookiePayload,
} from "@daton/auth";
import { sessionResponseSchema } from "@daton/contracts";

import { appConfig, toInternalApiUrl } from "./config";

const loopbackHosts = new Set(["127.0.0.1", "localhost"]);
const sessionLifetimeSeconds = 60 * 60 * 24 * 7;

const sessionContextSchema = z.object({
  membershipCount: z.number().int().nonnegative(),
  session: sessionResponseSchema,
  workosOrganizationId: z.string().nullable(),
});

const isSecureCookie = () => {
  try {
    return !loopbackHosts.has(new URL(appConfig.appBaseUrl).hostname);
  } catch {
    return process.env.NODE_ENV === "production";
  }
};

const getSessionCookieOptions = () => ({
  httpOnly: true,
  maxAge: sessionLifetimeSeconds,
  path: "/",
  sameSite: "lax" as const,
  secure: isSecureCookie(),
});

const parseJsonResponse = async <T>(response: Response, schema: z.ZodType<T>) => {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "message" in payload && typeof payload.message === "string"
        ? payload.message
        : "A solicitação falhou.";
    throw new Error(message);
  }

  return schema.parse(payload);
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
  return unsealDatonSession(cookieStore.get(datonSessionCookieName)?.value, getDatonSessionEnv());
};

export const setDatonSessionCookie = async (
  response: NextResponse,
  payload: DatonSessionCookiePayload,
) => {
  const sealed = await sealDatonSession(payload, getDatonSessionEnv());
  response.cookies.set(datonSessionCookieName, sealed, getSessionCookieOptions());
};

export const clearDatonSessionCookie = (response: NextResponse) => {
  response.cookies.set(datonSessionCookieName, "", {
    ...getSessionCookieOptions(),
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
    };
  }

  const expiresAt = Date.parse(payload.accessTokenExpiresAt);

  if (Number.isFinite(expiresAt) && expiresAt > Date.now() + accessTokenRefreshWindowSeconds * 1000) {
    return {
      payload,
      rotated: false,
    };
  }

  try {
    const authentication = await refreshWorkOsAuthentication(getWorkOsManagementEnv(), {
      ...readRequestMeta(headers),
      organizationId: payload.workosOrganizationId,
      refreshToken: payload.refreshToken,
    });

    return {
      payload: createDatonSessionPayload(authentication),
      rotated: true,
    };
  } catch {
    return {
      payload: null,
      rotated: true,
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

export const fetchSessionContext = async (accessToken: string) =>
  parseJsonResponse(
    await fetch(toInternalApiUrl("/api/v1/auth/session-context"), {
      cache: "no-store",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    }),
    sessionContextSchema,
  );

export const fetchServerSession = async (accessToken: string) =>
  parseJsonResponse(
    await fetch(toInternalApiUrl("/api/v1/session"), {
      cache: "no-store",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    }),
    sessionResponseSchema,
  );

export const revokeDatonSession = async (payload: DatonSessionCookiePayload | null) => {
  if (!payload) {
    return;
  }

  try {
    const claims = decodeWorkOsAccessToken(payload.accessToken);
    await createWorkOsClient(getWorkOsManagementEnv()).userManagement.revokeSession({
      sessionId: claims.sid,
    });
  } catch {
    // Best effort only.
  }
};
