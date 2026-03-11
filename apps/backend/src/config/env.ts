import { z } from "zod";

import { loadLocalDevelopmentEnv } from "@daton/db";

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
  CLERK_SECRET_KEY: z.string().trim().min(1),
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
export type AppEnvironment = RuntimeEnv;

export const parseRuntimeEnv = (
  environment: NodeJS.ProcessEnv = process.env,
): RuntimeEnv => runtimeEnvSchema.parse(loadLocalDevelopmentEnv(environment));

export const toApiEnvironment = (env: RuntimeEnv): AppEnvironment => env;
