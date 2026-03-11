import * as Sentry from "@sentry/node";
import { and, eq, inArray, isNull } from "drizzle-orm";

import {
  countActiveMemberships,
  createWorkOsClient,
  findPrimaryMembership,
  formatWorkOsUserName,
  verifyWorkOsAccessToken,
  type WorkOsAccessTokenClaims,
  type WorkOsManagementEnv,
} from "@daton/auth";
import {
  branches,
  createNodeDb,
  memberRoleAssignments,
  organizationMembers,
  organizations,
} from "@daton/db";
import type { OnboardingData, Role } from "@daton/contracts";

export type AppDb = ReturnType<typeof createNodeDb>;
export type AppDbExecutor = Pick<
  AppDb,
  "delete" | "insert" | "select" | "transaction" | "update"
>;

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
    openingDate: string | null;
    taxRegime: string | null;
    primaryCnae: string | null;
    stateRegistration: string | null;
    municipalRegistration: string | null;
    onboardingData: OnboardingData;
    onboardingStatus: "pending" | "completed" | "skipped";
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

export type SessionContext = {
  claims: WorkOsAccessTokenClaims;
  membershipCount: number;
  snapshot: SessionSnapshot;
  workosOrganizationId: string | null;
};

const GLOBAL_ACCESS_ROLES: Role[] = [
  "owner",
  "admin",
  "hr_admin",
  "document_controller",
];

const extractBearerToken = (authorizationHeader: string | null) => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, value] = authorizationHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !value) {
    return null;
  }

  return value;
};

const buildDetachedSessionSnapshot = async (
  env: WorkOsManagementEnv,
  claims: WorkOsAccessTokenClaims,
): Promise<SessionSnapshot | null> => {
  try {
    const user = await createWorkOsClient(env).userManagement.getUser(
      claims.sub,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: formatWorkOsUserName(user),
      },
      organization: null,
      member: null,
      effectiveRoles: [],
      branchScope: [],
    };
  } catch (error) {
    console.error("Fetching detached WorkOS session user failed.", error);
    Sentry.captureException(error);
    return null;
  }
};

export const resolveSessionContext = async (
  db: AppDb,
  env: WorkOsManagementEnv,
  authorizationHeader: string | null,
): Promise<SessionContext | null> => {
  const accessToken = extractBearerToken(authorizationHeader);

  if (!accessToken) {
    return null;
  }

  let claims: WorkOsAccessTokenClaims;

  try {
    claims = await verifyWorkOsAccessToken(accessToken, env);
  } catch {
    return null;
  }

  const membershipCount = await countActiveMemberships(db, claims.sub);

  if (membershipCount > 1 && !claims.org_id) {
    const message = `Resolved WorkOS session without org_id for multi-membership user ${claims.sub}.`;
    console.warn(message);
    Sentry.captureMessage(message, "warning");
  }

  const membership = await findPrimaryMembership(
    db,
    claims.sub,
    claims.org_id ?? null,
  );

  if (!membership) {
    const snapshot = await buildDetachedSessionSnapshot(env, claims);

    if (!snapshot) {
      return null;
    }

    return {
      claims,
      membershipCount,
      snapshot,
      workosOrganizationId: claims.org_id ?? null,
    };
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
      organizationOpeningDate: organizations.openingDate,
      organizationTaxRegime: organizations.taxRegime,
      organizationPrimaryCnae: organizations.primaryCnae,
      organizationStateRegistration: organizations.stateRegistration,
      organizationMunicipalRegistration: organizations.municipalRegistration,
      organizationOnboardingData: organizations.onboardingData,
      organizationOnboardingStatus: organizations.onboardingStatus,
    })
    .from(organizationMembers)
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id),
    )
    .where(eq(organizationMembers.id, membership.memberId))
    .limit(1);

  if (!member) {
    return null;
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

  const effectiveRoles = [
    ...new Set(assignments.map((assignment) => assignment.role)),
  ] as Role[];
  const scopedBranchIds = assignments
    .map((assignment) => assignment.branchScopeId)
    .filter((branchId): branchId is string => Boolean(branchId));

  const hasGlobalAccess = effectiveRoles.some((role) =>
    GLOBAL_ACCESS_ROLES.includes(role),
  );

  const branchScope = hasGlobalAccess
    ? (
        await db
          .select({ id: branches.id })
          .from(branches)
          .where(
            and(
              eq(branches.organizationId, member.organizationId),
              eq(branches.status, "active"),
            ),
          )
      ).map((branch) => branch.id)
    : scopedBranchIds;

  return {
    claims,
    membershipCount,
    snapshot: {
      user: {
        id: claims.sub,
        email: member.email,
        name: member.fullName,
      },
      organization: {
        id: member.organizationId,
        legalName: member.organizationLegalName,
        tradeName: member.organizationTradeName,
        legalIdentifier: member.organizationLegalIdentifier,
        openingDate: member.organizationOpeningDate,
        taxRegime: member.organizationTaxRegime,
        primaryCnae: member.organizationPrimaryCnae,
        stateRegistration: member.organizationStateRegistration,
        municipalRegistration: member.organizationMunicipalRegistration,
        onboardingData: member.organizationOnboardingData,
        onboardingStatus: member.organizationOnboardingStatus,
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
    },
    workosOrganizationId:
      membership.workosOrganizationId ?? claims.org_id ?? null,
  };
};

export const getSessionSnapshot = async (
  db: AppDb,
  env: WorkOsManagementEnv,
  authorizationHeader: string | null,
): Promise<SessionSnapshot | null> =>
  (await resolveSessionContext(db, env, authorizationHeader))?.snapshot ?? null;

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
    .where(
      and(
        eq(branches.organizationId, organizationId),
        inArray(branches.id, branchIds),
      ),
    );

  return available.map((branch) => branch.id);
};
