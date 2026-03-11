import * as Sentry from "@sentry/node";
import type { ClerkClient, User } from "@clerk/backend";
import { verifyToken } from "@clerk/backend";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";

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
  claims: {
    sid: string | null;
    sub: string;
  };
  membershipCount: number;
  snapshot: SessionSnapshot;
};

type LocalMembershipRecord = {
  memberId: string;
  organizationId: string;
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

const normalizeName = (user: Pick<User, "firstName" | "lastName">) => {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || null;
};

const getPrimaryEmail = (user: User) =>
  user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress
  ?? user.emailAddresses[0]?.emailAddress
  ?? null;

const countActiveMemberships = async (db: AppDb, userId: string) => {
  const [result] = await db
    .select({
      count: sql<number>`count(${organizationMembers.id})`,
    })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.status, "active"),
      ),
    );

  return Number(result?.count ?? 0);
};

const claimMembershipsByEmail = async (
  db: AppDb,
  input: {
    email: string;
    userId: string;
  },
) => {
  await db
    .update(organizationMembers)
    .set({
      userId: input.userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(organizationMembers.status, "active"),
        sql`lower(${organizationMembers.email}) = lower(${input.email})`,
      ),
    );
};

const findPrimaryMembership = async (
  db: AppDb,
  userId: string,
): Promise<LocalMembershipRecord | null> => {
  const [membership] = await db
    .select({
      memberId: organizationMembers.id,
      organizationId: organizationMembers.organizationId,
    })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.status, "active"),
      ),
    )
    .orderBy(asc(organizationMembers.createdAt))
    .limit(1);

  return membership ?? null;
};

const buildDetachedSessionSnapshot = async (
  clerk: ClerkClient,
  userId: string,
): Promise<SessionSnapshot | null> => {
  try {
    const user = await clerk.users.getUser(userId);
    const email = getPrimaryEmail(user);

    if (!email) {
      return null;
    }

    return {
      user: {
        id: user.id,
        email,
        name: normalizeName(user),
      },
      organization: null,
      member: null,
      effectiveRoles: [],
      branchScope: [],
    };
  } catch (error) {
    console.error("Fetching detached Clerk session user failed.", error);
    Sentry.captureException(error);
    return null;
  }
};

const getClerkUserForClaim = async (clerk: ClerkClient, userId: string) => {
  try {
    return await clerk.users.getUser(userId);
  } catch (error) {
    console.error("Fetching Clerk user for membership claim failed.", error);
    Sentry.captureException(error);
    return null;
  }
};

export const resolveSessionContext = async (
  db: AppDb,
  clerk: ClerkClient,
  secretKey: string,
  authorizationHeader: string | null,
): Promise<SessionContext | null> => {
  const accessToken = extractBearerToken(authorizationHeader);

  if (!accessToken) {
    return null;
  }

  let claims: Awaited<ReturnType<typeof verifyToken>>;

  try {
    claims = await verifyToken(accessToken, {
      secretKey,
    });
  } catch {
    return null;
  }

  const userId = typeof claims.sub === "string" ? claims.sub : null;

  if (!userId) {
    return null;
  }

  let membershipCount = await countActiveMemberships(db, userId);

  if (membershipCount === 0) {
    const user = await getClerkUserForClaim(clerk, userId);
    const email = user ? getPrimaryEmail(user) : null;

    if (email) {
      await claimMembershipsByEmail(db, {
        email,
        userId,
      });
      membershipCount = await countActiveMemberships(db, userId);
    }
  }

  const membership = await findPrimaryMembership(db, userId);

  if (!membership) {
    const snapshot = await buildDetachedSessionSnapshot(clerk, userId);

    if (!snapshot) {
      return null;
    }

    return {
      claims: {
        sid: typeof claims.sid === "string" ? claims.sid : null,
        sub: userId,
      },
      membershipCount,
      snapshot,
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
    claims: {
      sid: typeof claims.sid === "string" ? claims.sid : null,
      sub: userId,
    },
    membershipCount,
    snapshot: {
      user: {
        id: userId,
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
  };
};

export const getSessionSnapshot = async (
  db: AppDb,
  clerk: ClerkClient,
  secretKey: string,
  authorizationHeader: string | null,
): Promise<SessionSnapshot | null> =>
  (
    await resolveSessionContext(
      db,
      clerk,
      secretKey,
      authorizationHeader,
    )
  )?.snapshot ?? null;

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
