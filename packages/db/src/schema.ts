import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  auditActions,
  branchStatuses,
  departmentStatuses,
  organizationOnboardingStatuses,
  organizationMemberStatuses,
  roles,
} from "../../contracts/src/index";

export const roleEnum = pgEnum("role", roles);
export const branchStatusEnum = pgEnum("branch_status", branchStatuses);
export const departmentStatusEnum = pgEnum("department_status", departmentStatuses);
export const organizationMemberStatusEnum = pgEnum(
  "organization_member_status",
  organizationMemberStatuses,
);
export const organizationOnboardingStatusEnum = pgEnum(
  "organization_onboarding_status",
  organizationOnboardingStatuses,
);
export const auditActionEnum = pgEnum("audit_action", auditActions);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    legalName: text("legal_name").notNull(),
    tradeName: text("trade_name"),
    legalIdentifier: text("legal_identifier").notNull(),
    openingDate: date("opening_date"),
    taxRegime: text("tax_regime"),
    primaryCnae: text("primary_cnae"),
    stateRegistration: text("state_registration"),
    municipalRegistration: text("municipal_registration"),
    onboardingStatus: organizationOnboardingStatusEnum("onboarding_status")
      .default("pending")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    legalIdentifierIdx: uniqueIndex("organizations_legal_identifier_idx").on(table.legalIdentifier),
  }),
);

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    status: organizationMemberStatusEnum("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgUserIdx: uniqueIndex("organization_members_org_user_idx").on(table.organizationId, table.userId),
    orgEmailIdx: uniqueIndex("organization_members_org_email_idx").on(table.organizationId, table.email),
  }),
);

export const memberRoleAssignments = pgTable(
  "member_role_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => organizationMembers.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
    branchScopeId: uuid("branch_scope_id"),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => ({
    memberRoleIdx: index("member_role_assignments_member_role_idx").on(table.memberId, table.role),
  }),
);

export const branches = pgTable(
  "branches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code").notNull(),
    legalIdentifier: text("legal_identifier").notNull(),
    email: text("email"),
    phone: text("phone"),
    addressLine1: text("address_line_1"),
    addressLine2: text("address_line_2"),
    city: text("city"),
    stateOrProvince: text("state_or_province"),
    postalCode: text("postal_code"),
    country: text("country"),
    isHeadquarters: boolean("is_headquarters").default(false).notNull(),
    parentBranchId: uuid("parent_branch_id"),
    status: branchStatusEnum("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgCodeIdx: uniqueIndex("branches_org_code_idx").on(table.organizationId, table.code),
    orgHeadquartersIdx: index("branches_org_headquarters_idx").on(table.organizationId, table.isHeadquarters),
  }),
);

export const branchManagerAssignments = pgTable(
  "branch_manager_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => organizationMembers.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
    unassignedAt: timestamp("unassigned_at", { withTimezone: true }),
  },
  (table) => ({
    branchActiveManagerIdx: index("branch_manager_assignments_branch_idx").on(table.branchId, table.unassignedAt),
  }),
);

export const departments = pgTable(
  "departments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code").notNull(),
    managerMemberId: uuid("manager_member_id").references(() => organizationMembers.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    status: departmentStatusEnum("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgCodeIdx: uniqueIndex("departments_org_code_idx").on(table.organizationId, table.code),
  }),
);

export const departmentBranchAssignments = pgTable(
  "department_branch_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    departmentBranchUniqueIdx: uniqueIndex("department_branch_assignments_unique_idx").on(
      table.departmentId,
      table.branchId,
    ),
    branchIdx: index("department_branch_assignments_branch_idx").on(table.branchId),
  }),
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id"),
    actorMemberId: uuid("actor_member_id").references(() => organizationMembers.id, { onDelete: "set null" }),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    action: auditActionEnum("action").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgEntityIdx: index("audit_events_org_entity_idx").on(table.organizationId, table.entityType, table.entityId),
    actorIdx: index("audit_events_actor_idx").on(table.actorUserId, table.actorMemberId),
  }),
);

export const organizationRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  branches: many(branches),
  departments: many(departments),
  auditEvents: many(auditEvents),
}));

export const organizationMemberRelations = relations(organizationMembers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  roles: many(memberRoleAssignments),
  managerAssignments: many(branchManagerAssignments),
  managedDepartments: many(departments),
}));

export const branchRelations = relations(branches, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [branches.organizationId],
    references: [organizations.id],
  }),
  parentBranch: one(branches, {
    fields: [branches.parentBranchId],
    references: [branches.id],
  }),
  managerAssignments: many(branchManagerAssignments),
  departmentAssignments: many(departmentBranchAssignments),
}));

export const departmentRelations = relations(departments, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [departments.organizationId],
    references: [organizations.id],
  }),
  managerMember: one(organizationMembers, {
    fields: [departments.managerMemberId],
    references: [organizationMembers.id],
  }),
  branchAssignments: many(departmentBranchAssignments),
}));

export const departmentBranchAssignmentRelations = relations(
  departmentBranchAssignments,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [departmentBranchAssignments.organizationId],
      references: [organizations.id],
    }),
    department: one(departments, {
      fields: [departmentBranchAssignments.departmentId],
      references: [departments.id],
    }),
    branch: one(branches, {
      fields: [departmentBranchAssignments.branchId],
      references: [branches.id],
    }),
  }),
);
