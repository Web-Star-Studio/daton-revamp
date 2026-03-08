import { z } from "zod";

import { parseAuthEnv } from "@daton/auth";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_API_URL: z.url(),
  CORS_ORIGIN: z.url(),
  COOKIE_DOMAIN: z.string().trim().optional(),
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
