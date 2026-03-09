import { z } from "zod";

export const roles = [
  "owner",
  "admin",
  "hr_admin",
  "branch_manager",
  "document_controller",
  "collaborator",
  "viewer",
] as const;

export const branchStatuses = ["active", "archived"] as const;
export const organizationMemberStatuses = ["active", "inactive"] as const;

export const auditActions = [
  "auth.sign_in",
  "auth.sign_out",
  "organization.bootstrap",
  "organization.update",
  "branch.create",
  "branch.update",
  "branch.archive",
  "branch.assign_manager",
  "role.assign",
  "role.revoke",
] as const;

export const roleSchema = z.enum(roles);
export const branchStatusSchema = z.enum(branchStatuses);
export const organizationMemberStatusSchema = z.enum(organizationMemberStatuses);
export const auditActionSchema = z.enum(auditActions);

export type Role = z.infer<typeof roleSchema>;
export type BranchStatus = z.infer<typeof branchStatusSchema>;
export type OrganizationMemberStatus = z.infer<typeof organizationMemberStatusSchema>;
export type AuditAction = z.infer<typeof auditActionSchema>;

const trimmedString = (min: number, max: number) =>
  z.string().trim().min(min).max(max);

export const normalizeCnpj = (value: string) => value.replace(/\D/g, "");

export const formatCnpj = (value: string) => {
  const digits = normalizeCnpj(value).slice(0, 14);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 5) {
    return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  }

  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }

  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

export const isValidCnpj = (value: string) => {
  const digits = normalizeCnpj(value);

  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) {
    return false;
  }

  const calculateCheckDigit = (base: string, startWeight: number) => {
    let weight = startWeight;
    let total = 0;

    for (const digit of base) {
      total += Number(digit) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }

    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstCheckDigit = calculateCheckDigit(digits.slice(0, 12), 5);
  const secondCheckDigit = calculateCheckDigit(digits.slice(0, 12) + String(firstCheckDigit), 6);

  return digits === `${digits.slice(0, 12)}${firstCheckDigit}${secondCheckDigit}`;
};

const cnpjDigitsSchema = z
  .string()
  .trim()
  .transform(normalizeCnpj)
  .refine((value) => value.length === 14, "Informe um CNPJ com 14 dígitos.");

export const createCnpjSchema = (options?: { allowFictional?: boolean }) =>
  cnpjDigitsSchema.refine(
    (value) => (options?.allowFictional ? true : isValidCnpj(value)),
    "Informe um CNPJ válido.",
  );

export const cnpjSchema = createCnpjSchema();

export const createBootstrapOrganizationSchema = (options?: { allowFictional?: boolean }) =>
  z.object({
    legalName: trimmedString(2, 160),
    tradeName: z.string().trim().max(160).optional().or(z.literal("")),
    legalIdentifier: createCnpjSchema(options),
    adminFullName: trimmedString(2, 120),
    adminEmail: z.email(),
    password: z.string().min(8).max(128),
    headquarters: z.object({
      name: trimmedString(2, 120),
      code: trimmedString(2, 32).regex(/^[A-Z0-9_-]+$/i, "Use letters, numbers, underscores, or dashes."),
      legalIdentifier: createCnpjSchema(options),
    }),
  });

export const bootstrapOrganizationSchema = createBootstrapOrganizationSchema();

export const createBranchBaseSchema = (options?: { allowFictional?: boolean }) =>
  z.object({
    name: trimmedString(2, 120),
    code: trimmedString(2, 32).regex(/^[A-Z0-9_-]+$/i, "Use letters, numbers, underscores, or dashes."),
    legalIdentifier: createCnpjSchema(options),
    email: z.email().optional().or(z.literal("")),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    addressLine1: z.string().trim().max(160).optional().or(z.literal("")),
    addressLine2: z.string().trim().max(160).optional().or(z.literal("")),
    city: z.string().trim().max(80).optional().or(z.literal("")),
    stateOrProvince: z.string().trim().max(80).optional().or(z.literal("")),
    postalCode: z.string().trim().max(24).optional().or(z.literal("")),
    country: z.string().trim().max(80).optional().or(z.literal("")),
    isHeadquarters: z.boolean().default(false),
    parentBranchId: z.uuid().optional().nullable(),
    managerMemberId: z.uuid().optional().nullable(),
  });

export const branchBaseSchema = createBranchBaseSchema();

export const createBranchSchema = branchBaseSchema;
export const createCreateBranchSchema = createBranchBaseSchema;

export const createUpdateBranchSchema = (options?: { allowFictional?: boolean }) =>
  createBranchBaseSchema(options).extend({
    status: branchStatusSchema.optional(),
  });

export const updateBranchSchema = createUpdateBranchSchema();

export const branchIdSchema = z.object({
  branchId: z.uuid(),
});

export const sessionUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string().nullable(),
});

export const organizationSummarySchema = z.object({
  id: z.uuid(),
  legalName: z.string(),
  tradeName: z.string().nullable(),
  legalIdentifier: z.string(),
});

export const organizationMemberSummarySchema = z.object({
  id: z.uuid(),
  userId: z.string(),
  fullName: z.string(),
  email: z.email(),
  status: organizationMemberStatusSchema,
});

export const organizationMemberListSchema = z.array(
  organizationMemberSummarySchema,
);

export const branchSummarySchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  name: z.string(),
  code: z.string(),
  legalIdentifier: z.string(),
  isHeadquarters: z.boolean(),
  parentBranchId: z.uuid().nullable(),
  managerMemberId: z.uuid().nullable(),
  status: branchStatusSchema,
});

export const sessionResponseSchema = z.object({
  user: sessionUserSchema,
  organization: organizationSummarySchema.nullable(),
  member: organizationMemberSummarySchema.nullable(),
  effectiveRoles: z.array(roleSchema),
  branchScope: z.array(z.uuid()),
});

export type BootstrapOrganizationInput = z.infer<typeof bootstrapOrganizationSchema>;
export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
export type BranchSummary = z.infer<typeof branchSummarySchema>;
export type OrganizationMemberSummary = z.infer<
  typeof organizationMemberSummarySchema
>;
