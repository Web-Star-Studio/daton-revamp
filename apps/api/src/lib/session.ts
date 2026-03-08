import { and, eq, inArray, isNull } from "drizzle-orm";

import {
  branches,
  createNodeDb,
  memberRoleAssignments,
  organizationMembers,
  organizations,
} from "@daton/db";
import type { Role } from "@daton/contracts";
import type { DatonAuth } from "@daton/auth";

export type AppDb = ReturnType<typeof createNodeDb>;
export type AppDbExecutor = Pick<AppDb, "insert" | "update" | "select">;

export type SessionSnapshot = {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  organization: {
    id: string;
    legalName: string;
    tradeName: string | null;
    legalIdentifier: string;
  } | null;
  member: {
    id: string;
    userId: string;
    fullName: string;
    email: string;
    status: "active" | "inactive";
  } | null;
  effectiveRoles: Role[];
  branchScope: string[];
};

export const getSessionSnapshot = async (
  db: AppDb,
  auth: DatonAuth,
  headers: Headers,
): Promise<SessionSnapshot | null> => {
  const authSession = await auth.api.getSession({
    headers,
  });

  if (!authSession) {
    return null;
  }

  const [member] = await db
    .select({
      id: organizationMembers.id,
      userId: organizationMembers.userId,
      fullName: organizationMembers.fullName,
      email: organizationMembers.email,
      status: organizationMembers.status,
      organizationId: organizationMembers.organizationId,
      organizationLegalName: organizations.legalName,
      organizationTradeName: organizations.tradeName,
      organizationLegalIdentifier: organizations.legalIdentifier,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(eq(organizationMembers.userId, authSession.user.id))
    .limit(1);

  if (!member) {
    return {
      user: {
        id: authSession.user.id,
        email: authSession.user.email,
        name: authSession.user.name ?? null,
      },
      organization: null,
      member: null,
      effectiveRoles: [],
      branchScope: [],
    };
  }

  const assignments = await db
    .select({
      role: memberRoleAssignments.role,
      branchScopeId: memberRoleAssignments.branchScopeId,
    })
    .from(memberRoleAssignments)
    .where(
      and(
        eq(memberRoleAssignments.memberId, member.id),
        eq(memberRoleAssignments.organizationId, member.organizationId),
        isNull(memberRoleAssignments.revokedAt),
      ),
    );

  const effectiveRoles = [...new Set(assignments.map((assignment) => assignment.role))] as Role[];
  const scopedBranchIds = assignments
    .map((assignment) => assignment.branchScopeId)
    .filter((branchId): branchId is string => Boolean(branchId));

  const hasGlobalAccess = effectiveRoles.some((role) =>
    ["owner", "admin", "hr_admin", "document_controller"].includes(role),
  );

  const branchScope = hasGlobalAccess
    ? (
        await db
          .select({ id: branches.id })
          .from(branches)
          .where(
            and(eq(branches.organizationId, member.organizationId), eq(branches.status, "active")),
          )
      ).map((branch) => branch.id)
    : scopedBranchIds;

  return {
    user: {
      id: authSession.user.id,
      email: authSession.user.email,
      name: authSession.user.name ?? null,
    },
    organization: {
      id: member.organizationId,
      legalName: member.organizationLegalName,
      tradeName: member.organizationTradeName,
      legalIdentifier: member.organizationLegalIdentifier,
    },
    member: {
      id: member.id,
      userId: member.userId,
      fullName: member.fullName,
      email: member.email,
      status: member.status,
    },
    effectiveRoles,
    branchScope,
  };
};

export const ensureBranchScope = async (
  db: AppDb,
  organizationId: string,
  branchIds: string[],
) => {
  if (branchIds.length === 0) {
    return [];
  }

  const available = await db
    .select({ id: branches.id })
    .from(branches)
    .where(and(eq(branches.organizationId, organizationId), inArray(branches.id, branchIds)));

  return available.map((branch) => branch.id);
};
