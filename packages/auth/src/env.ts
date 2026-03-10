import { z } from "zod";

const authEnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_API_URL: z.url(),
  CORS_ORIGIN: z.url(),
  COOKIE_DOMAIN: z.string().trim().optional(),
  BETTER_AUTH_PASSWORD_HASH_ITERATIONS: z
    .string()
    .trim()
    .optional()
    .refine((value) => value === undefined || /^\d+$/.test(value), {
      message: "BETTER_AUTH_PASSWORD_HASH_ITERATIONS must be a positive integer.",
    })
    .transform((value) => (value ? Number.parseInt(value, 10) : undefined)),
});

export type DatonAuthEnv = z.infer<typeof authEnvSchema>;

export const parseAuthEnv = (source: Record<string, string | undefined>): DatonAuthEnv =>
  authEnvSchema.parse(source);
