import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";

import { schema, type DatonDb } from "../../db/src/client";

import type { DatonAuthEnv } from "./env";
import { expandLocalOriginAliases } from "./origins";

export const createDatonAuth = (db: DatonDb, env: DatonAuthEnv) =>
  betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
      transaction: true,
    }),
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: expandLocalOriginAliases([
      env.CORS_ORIGIN,
      env.NEXT_PUBLIC_APP_URL,
      env.NEXT_PUBLIC_API_URL,
    ]),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      requireEmailVerification: false,
      autoSignIn: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 12,
    },
    advanced: {
      cookiePrefix: "daton",
      crossSubDomainCookies: env.COOKIE_DOMAIN
        ? {
            enabled: true,
            domain: env.COOKIE_DOMAIN,
          }
        : undefined,
      defaultCookieAttributes: {
        sameSite: "lax",
        secure: env.BETTER_AUTH_URL.startsWith("https://"),
        httpOnly: true,
      },
    },
  });

export type DatonAuth = ReturnType<typeof createDatonAuth>;

export const getAuthSession = (auth: DatonAuth, headers: Headers) =>
  auth.api.getSession({
    headers,
  });
