import { z } from "zod";

import { parseAuthEnv } from "@daton/auth";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  BETTER_AUTH_PASSWORD_HASH_ITERATIONS: z.string().trim().optional(),
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_API_URL: z.url(),
  CORS_ORIGIN: z.url(),
  COOKIE_DOMAIN: z.string().trim().optional(),
  SENTRY_DSN: z.url().optional(),
  SENTRY_AUTH_TOKEN: z.string().trim().min(1).optional(),
  SENTRY_ORG: z.string().trim().min(1).optional(),
  SENTRY_PROJECT: z.string().trim().min(1).optional(),
  SENTRY_ENVIRONMENT: z.string().trim().min(1).optional(),
  SENTRY_RELEASE: z.string().trim().min(1).optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.string().trim().min(1).optional(),
  ALLOW_FICTIONAL_CNPJ: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export const parseServerEnv = (source: Record<string, string | undefined>) => {
  const env = serverEnvSchema.parse(source);

  return {
    ...env,
    auth: parseAuthEnv(source),
  };
};
