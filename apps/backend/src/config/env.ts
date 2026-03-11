import { z } from "zod";

import { loadLocalDevelopmentEnv } from "@daton/db";

import type { AppEnvironment } from "../../../api/src/types";

const optionalTrimmedString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const runtimeEnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8787),
  HOST: z.string().trim().min(1).default("0.0.0.0"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  DATABASE_URL: z.string().trim().min(1),
  WORKOS_API_KEY: z.string().trim().min(1),
  WORKOS_CLIENT_ID: z.string().trim().min(1),
  WORKOS_AUTHKIT_DOMAIN: optionalTrimmedString,
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_API_URL: z.url(),
  CORS_ORIGIN: z.url(),
  SENTRY_DSN: z.url().optional(),
  SENTRY_AUTH_TOKEN: optionalTrimmedString,
  SENTRY_ORG: optionalTrimmedString,
  SENTRY_PROJECT: optionalTrimmedString,
  SENTRY_ENVIRONMENT: optionalTrimmedString,
  SENTRY_RELEASE: optionalTrimmedString,
  SENTRY_TRACES_SAMPLE_RATE: optionalTrimmedString,
  ALLOW_FICTIONAL_CNPJ: z.enum(["true", "false"]).optional(),
});

export type RuntimeEnv = z.infer<typeof runtimeEnvSchema>;

export const parseRuntimeEnv = (
  environment: NodeJS.ProcessEnv = process.env,
): RuntimeEnv => runtimeEnvSchema.parse(loadLocalDevelopmentEnv(environment));

export const toApiEnvironment = (env: RuntimeEnv): AppEnvironment => ({
  DATABASE_URL: env.DATABASE_URL,
  WORKOS_API_KEY: env.WORKOS_API_KEY,
  WORKOS_CLIENT_ID: env.WORKOS_CLIENT_ID,
  WORKOS_AUTHKIT_DOMAIN: env.WORKOS_AUTHKIT_DOMAIN,
  NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_API_URL: env.NEXT_PUBLIC_API_URL,
  CORS_ORIGIN: env.CORS_ORIGIN,
  SENTRY_DSN: env.SENTRY_DSN,
  SENTRY_AUTH_TOKEN: env.SENTRY_AUTH_TOKEN,
  SENTRY_ORG: env.SENTRY_ORG,
  SENTRY_PROJECT: env.SENTRY_PROJECT,
  SENTRY_ENVIRONMENT: env.SENTRY_ENVIRONMENT,
  SENTRY_RELEASE: env.SENTRY_RELEASE,
  SENTRY_TRACES_SAMPLE_RATE: env.SENTRY_TRACES_SAMPLE_RATE,
  ALLOW_FICTIONAL_CNPJ: env.ALLOW_FICTIONAL_CNPJ,
});
