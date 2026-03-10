import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { createAuthMiddleware } from "better-auth/api";
import { betterAuth } from "better-auth";

import { schema, type DatonDb } from "../../db/src/client";

import type { DatonAuthEnv } from "./env";
import { expandLocalOriginAliases } from "./origins";
import { hashPassword, isLegacyScryptHash, verifyPassword } from "./password";

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
      password: {
        hash: (password) => hashPassword(password, env.BETTER_AUTH_PASSWORD_HASH_ITERATIONS),
        verify: ({ hash, password }) => verifyPassword({ hash, password }),
      },
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
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-in/email") {
          return;
        }

        const password =
          typeof ctx.body === "object" &&
          ctx.body !== null &&
          "password" in ctx.body &&
          typeof ctx.body.password === "string"
            ? ctx.body.password
            : null;

        const userId = ctx.context.newSession?.user.id;

        if (!password || !userId) {
          return;
        }

        const credentialAccount = (await ctx.context.internalAdapter.findAccounts(userId)).find(
          (account) => account.providerId === "credential",
        );
        const currentPasswordHash = credentialAccount?.password;

        if (!currentPasswordHash || !isLegacyScryptHash(currentPasswordHash)) {
          return;
        }

        const nextPasswordHash = await hashPassword(
          password,
          env.BETTER_AUTH_PASSWORD_HASH_ITERATIONS,
        );

        await ctx.context.internalAdapter.updatePassword(userId, nextPasswordHash);
      }),
    },
  });

export type DatonAuth = ReturnType<typeof createDatonAuth>;

export const getAuthSession = (auth: DatonAuth, headers: Headers) =>
  auth.api.getSession({
    headers,
  });
