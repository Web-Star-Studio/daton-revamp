import { z } from "zod";

const optionalTrimmedString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const workOsEnvSchema = z.object({
  WORKOS_CLIENT_ID: z.string().trim().min(1),
  WORKOS_AUTHKIT_DOMAIN: optionalTrimmedString,
});

const workOsManagementEnvSchema = workOsEnvSchema.extend({
  WORKOS_API_KEY: z.string().trim().min(1),
});

const datonSessionEnvSchema = z.object({
  DATON_SESSION_SECRET: z.string().trim().min(32),
});

export type WorkOsEnv = z.infer<typeof workOsEnvSchema>;
export type WorkOsManagementEnv = z.infer<typeof workOsManagementEnvSchema>;
export type DatonSessionEnv = z.infer<typeof datonSessionEnvSchema>;

export const parseWorkOsEnv = (source: Record<string, string | undefined>): WorkOsEnv =>
  workOsEnvSchema.parse(source);

export const parseWorkOsManagementEnv = (
  source: Record<string, string | undefined>,
): WorkOsManagementEnv => workOsManagementEnvSchema.parse(source);

export const parseDatonSessionEnv = (
  source: Record<string, string | undefined>,
): DatonSessionEnv => datonSessionEnvSchema.parse(source);
