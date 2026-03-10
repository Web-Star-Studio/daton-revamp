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
export const departmentStatuses = ["active", "archived"] as const;
export const organizationMemberStatuses = ["active", "inactive"] as const;
export const organizationOnboardingStatuses = [
  "pending",
  "completed",
  "skipped",
] as const;
export const notificationLevels = ["neutral", "warning", "critical"] as const;
export const companySectors = [
  "manufacturing",
  "agro",
  "food_beverage",
  "mining",
  "oil_gas",
  "energy",
  "chemical",
  "pulp_paper",
  "steel",
  "logistics",
  "financial",
  "telecom",
  "public",
  "pharma_cosmetics",
  "automotive",
  "technology",
  "consumer_goods",
  "utilities",
  "healthcare",
  "education",
  "retail",
  "construction",
  "services",
  "other",
] as const;
export const companySizes = [
  "micro",
  "small",
  "medium",
  "large",
  "xlarge",
  "enterprise",
] as const;
export const businessGoals = [
  "emissions_reduction",
  "environmental_compliance",
  "health_safety",
  "energy_efficiency",
  "water_management",
  "waste_reduction",
  "sustainability",
  "quality",
  "compliance",
  "performance",
  "innovation",
  "cost_reduction",
] as const;
export const maturityLevels = ["beginner", "intermediate", "advanced"] as const;

export const auditActions = [
  "auth.sign_in",
  "auth.sign_out",
  "organization.bootstrap",
  "organization.update",
  "branch.create",
  "branch.update",
  "branch.archive",
  "branch.assign_manager",
  "department.create",
  "department.update",
  "department.archive",
  "role.assign",
  "role.revoke",
] as const;

export const roleSchema = z.enum(roles);
export const branchStatusSchema = z.enum(branchStatuses);
export const departmentStatusSchema = z.enum(departmentStatuses);
export const organizationMemberStatusSchema = z.enum(organizationMemberStatuses);
export const organizationOnboardingStatusSchema = z.enum(
  organizationOnboardingStatuses,
);
export const notificationLevelSchema = z.enum(notificationLevels);
export const auditActionSchema = z.enum(auditActions);
export const companySectorSchema = z.enum(companySectors);
export const companySizeSchema = z.enum(companySizes);
export const businessGoalSchema = z.enum(businessGoals);
export const maturityLevelSchema = z.enum(maturityLevels);

export type Role = z.infer<typeof roleSchema>;
export type BranchStatus = z.infer<typeof branchStatusSchema>;
export type DepartmentStatus = z.infer<typeof departmentStatusSchema>;
export type OrganizationMemberStatus = z.infer<typeof organizationMemberStatusSchema>;
export type OrganizationOnboardingStatus = z.infer<
  typeof organizationOnboardingStatusSchema
>;
export type NotificationLevel = z.infer<typeof notificationLevelSchema>;
export type AuditAction = z.infer<typeof auditActionSchema>;
export type CompanySector = z.infer<typeof companySectorSchema>;
export type CompanySize = z.infer<typeof companySizeSchema>;
export type BusinessGoal = z.infer<typeof businessGoalSchema>;
export type MaturityLevel = z.infer<typeof maturityLevelSchema>;

const trimmedString = (min: number, max: number) =>
  z.string().trim().min(min).max(max);
const optionalTrimmedString = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));
const optionalIsoDateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.")
  .optional()
  .or(z.literal(""));
const companyProfileFieldShape = {
  sector: companySectorSchema,
  size: companySizeSchema,
  goals: z.array(businessGoalSchema).min(1, "Selecione ao menos um objetivo."),
  maturityLevel: maturityLevelSchema,
  currentChallenges: z
    .array(z.string().trim().min(1).max(120))
    .max(12, "Informe no máximo 12 desafios atuais."),
};

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

export const departmentIdSchema = z.object({
  departmentId: z.uuid(),
});

export const employeeIdSchema = z.object({
  employeeId: z.uuid(),
});

export const positionIdSchema = z.object({
  positionId: z.uuid(),
});

export const createDepartmentBaseSchema = () =>
  z.object({
    name: trimmedString(2, 120),
    code: trimmedString(2, 32).regex(/^[A-Z0-9_-]+$/i, "Use letters, numbers, underscores, or dashes."),
    description: z.string().trim().max(1000).optional().or(z.literal("")),
    parentDepartmentId: z.uuid().optional().nullable(),
    managerEmployeeId: z.uuid().optional().nullable(),
    branchIds: z.array(z.uuid()).default([]),
    managerMemberId: z.uuid().optional().nullable(),
    budget: z.number().nonnegative().optional().nullable(),
    costCenter: z.string().trim().max(80).optional().or(z.literal("")),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
  });

export const departmentBaseSchema = createDepartmentBaseSchema();
export const createDepartmentSchema = createDepartmentBaseSchema();
export const createCreateDepartmentSchema = createDepartmentBaseSchema;
export const createUpdateDepartmentSchema = () =>
  createDepartmentBaseSchema().extend({
    status: departmentStatusSchema.optional(),
  });
export const updateDepartmentSchema = createUpdateDepartmentSchema();

export const createEmployeeBaseSchema = () =>
  z.object({
    employeeCode: z.string().trim().max(64).optional().or(z.literal("")),
    cpf: z.string().trim().max(20).optional().or(z.literal("")),
    fullName: trimmedString(2, 160),
    email: z.email().optional().or(z.literal("")),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    departmentId: z.uuid().optional().nullable(),
    positionId: z.uuid().optional().nullable(),
    hireDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida."),
    birthDate: optionalIsoDateString,
    gender: z.string().trim().max(40).optional().or(z.literal("")),
    ethnicity: z.string().trim().max(80).optional().or(z.literal("")),
    educationLevel: z.string().trim().max(80).optional().or(z.literal("")),
    salary: z.number().nonnegative().optional().nullable(),
    employmentType: trimmedString(2, 80),
    status: trimmedString(2, 40),
    managerId: z.uuid().optional().nullable(),
    location: z.string().trim().max(160).optional().or(z.literal("")),
    branchId: z.uuid().optional().nullable(),
    terminationDate: optionalIsoDateString,
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
  });

export const employeeBaseSchema = createEmployeeBaseSchema();
export const createEmployeeSchema = createEmployeeBaseSchema();
export const createCreateEmployeeSchema = createEmployeeBaseSchema;
export const createUpdateEmployeeSchema = () => createEmployeeBaseSchema();
export const updateEmployeeSchema = createUpdateEmployeeSchema();

export const createPositionBaseSchema = () =>
  z.object({
    departmentId: z.uuid().optional().nullable(),
    title: trimmedString(2, 120),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    level: z.string().trim().max(80).optional().or(z.literal("")),
    salaryRangeMin: z.number().nonnegative().optional().nullable(),
    salaryRangeMax: z.number().nonnegative().optional().nullable(),
    requirements: z.array(z.string().trim().min(1).max(240)).default([]),
    responsibilities: z.array(z.string().trim().min(1).max(240)).default([]),
    reportsToPositionId: z.uuid().optional().nullable(),
    requiredEducationLevel: z.string().trim().max(120).optional().or(z.literal("")),
    requiredExperienceYears: z.number().int().nonnegative().optional().nullable(),
  });

export const positionBaseSchema = createPositionBaseSchema();
export const createPositionSchema = createPositionBaseSchema();
export const createCreatePositionSchema = createPositionBaseSchema;
export const createUpdatePositionSchema = () => createPositionBaseSchema();
export const updatePositionSchema = createUpdatePositionSchema();

const normalizeOptionalString = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const requireCustomSectorIfOther = (
  value: { customSector?: string | null; sector: string },
  ctx: z.RefinementCtx,
) => {
  if (value.sector === "other" && !normalizeOptionalString(value.customSector)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Informe o setor da empresa.",
      path: ["customSector"],
    });
  }
};

export const companyProfileSchema = z
  .object({
    ...companyProfileFieldShape,
    customSector: optionalTrimmedString(120),
  })
  .superRefine(requireCustomSectorIfOther);

export const onboardingCompanyProfileSchema = z
  .object({
    ...companyProfileFieldShape,
    customSector: z.string().trim().max(120).nullable(),
  })
  .superRefine(requireCustomSectorIfOther);

export const onboardingDataSchema = z.object({
  company_profile: onboardingCompanyProfileSchema.nullable(),
});

export const updateOrganizationSchema = z.object({
  openingDate: optionalIsoDateString,
  taxRegime: optionalTrimmedString(120),
  primaryCnae: optionalTrimmedString(120),
  stateRegistration: optionalTrimmedString(64),
  municipalRegistration: optionalTrimmedString(64),
  companyProfile: companyProfileSchema,
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
  openingDate: z.string().nullable(),
  taxRegime: z.string().nullable(),
  primaryCnae: z.string().nullable(),
  stateRegistration: z.string().nullable(),
  municipalRegistration: z.string().nullable(),
  onboardingStatus: organizationOnboardingStatusSchema,
  onboardingData: onboardingDataSchema,
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

export const organizationDirectoryMemberSchema =
  organizationMemberSummarySchema.extend({
    roles: z.array(roleSchema),
    branchIds: z.array(z.uuid()),
    managedBranchIds: z.array(z.uuid()),
    hasGlobalAccess: z.boolean(),
  });

export const organizationDirectoryMemberListSchema = z.array(
  organizationDirectoryMemberSchema,
);

export const branchSummarySchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  name: z.string(),
  code: z.string(),
  legalIdentifier: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  city: z.string().nullable(),
  stateOrProvince: z.string().nullable(),
  postalCode: z.string().nullable(),
  country: z.string().nullable(),
  isHeadquarters: z.boolean(),
  parentBranchId: z.uuid().nullable(),
  managerMemberId: z.uuid().nullable(),
  status: branchStatusSchema,
});

export const departmentReferenceSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

export const employeeReferenceSchema = z.object({
  id: z.uuid(),
  fullName: z.string(),
});

export const positionReferenceSchema = z.object({
  id: z.uuid(),
  title: z.string(),
});

export const branchReferenceSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

export const departmentSummarySchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  parentDepartmentId: z.uuid().nullable(),
  managerEmployeeId: z.uuid().nullable(),
  budget: z.number().nullable(),
  costCenter: z.string().nullable(),
  code: z.string(),
  status: departmentStatusSchema,
  managerMemberId: z.uuid().nullable(),
  managerName: z.string().nullable(),
  notes: z.string().nullable(),
  branchIds: z.array(z.uuid()),
  branchNames: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  manager: employeeReferenceSchema.nullable(),
  parentDepartment: departmentReferenceSchema.nullable(),
  subDepartments: z.array(departmentReferenceSchema),
  employeeCount: z.number().int().nonnegative(),
});

export const departmentListSchema = z.array(departmentSummarySchema);

export const employeeSummarySchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  employeeCode: z.string().nullable(),
  cpf: z.string().nullable(),
  fullName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  departmentId: z.uuid().nullable(),
  departmentName: z.string().nullable(),
  positionId: z.uuid().nullable(),
  positionName: z.string().nullable(),
  hireDate: z.string(),
  birthDate: z.string().nullable(),
  gender: z.string().nullable(),
  ethnicity: z.string().nullable(),
  educationLevel: z.string().nullable(),
  salary: z.number().nullable(),
  employmentType: z.string(),
  status: z.string(),
  managerId: z.uuid().nullable(),
  location: z.string().nullable(),
  branchId: z.uuid().nullable(),
  terminationDate: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  branch: branchReferenceSchema.nullable(),
  department: departmentReferenceSchema.nullable(),
  position: positionReferenceSchema.nullable(),
  manager: employeeReferenceSchema.nullable(),
});

export const employeeListSchema = z.array(employeeSummarySchema);

export const positionSummarySchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  departmentId: z.uuid().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  level: z.string().nullable(),
  salaryRangeMin: z.number().nullable(),
  salaryRangeMax: z.number().nullable(),
  requirements: z.array(z.string()),
  responsibilities: z.array(z.string()),
  reportsToPositionId: z.uuid().nullable(),
  requiredEducationLevel: z.string().nullable(),
  requiredExperienceYears: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  department: departmentReferenceSchema.nullable(),
  reportsToPosition: positionReferenceSchema.nullable(),
});

export const positionListSchema = z.array(positionSummarySchema);

export const notificationSummarySchema = z.object({
  id: z.uuid(),
  level: notificationLevelSchema,
  title: z.string(),
  description: z.string(),
  actionLabel: z.string().nullable(),
  href: z.string().nullable(),
  createdAt: z.string(),
});

export const notificationListSchema = z.array(notificationSummarySchema);

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
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type CreatePositionInput = z.infer<typeof createPositionSchema>;
export type UpdatePositionInput = z.infer<typeof updatePositionSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
export type BranchSummary = z.infer<typeof branchSummarySchema>;
export type DepartmentSummary = z.infer<typeof departmentSummarySchema>;
export type EmployeeSummary = z.infer<typeof employeeSummarySchema>;
export type PositionSummary = z.infer<typeof positionSummarySchema>;
export type OnboardingCompanyProfile = z.infer<typeof onboardingCompanyProfileSchema>;
export type OnboardingData = z.infer<typeof onboardingDataSchema>;
export type OrganizationMemberSummary = z.infer<
  typeof organizationMemberSummarySchema
>;
export type OrganizationDirectoryMember = z.infer<
  typeof organizationDirectoryMemberSchema
>;
export type NotificationSummary = z.infer<typeof notificationSummarySchema>;
