import { and, asc, eq, sql } from "drizzle-orm";
import { decodeJwt, EncryptJWT, createRemoteJWKSet, jwtDecrypt, jwtVerify, type JWTPayload } from "jose";
import {
  WorkOS,
  type AuthenticationResponse,
  type Organization,
  type OrganizationMembership,
  type User,
} from "@workos-inc/node";

import {
  type DatonDb,
  memberRoleAssignments,
  organizationMembers,
  organizations,
} from "@daton/db";

import type { DatonSessionEnv, WorkOsEnv, WorkOsManagementEnv } from "./env";

const textEncoder = new TextEncoder();
const sessionLifetimeSeconds = 60 * 60 * 24 * 7;
const defaultWorkOsIssuer = "https://api.workos.com";

export const datonSessionCookieName = "daton-session";
export const accessTokenRefreshWindowSeconds = 60;

export type DatonSessionCookiePayload = {
  refreshToken: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  workosUserId: string;
  workosOrganizationId: string | null;
};

export type WorkOsAccessTokenClaims = JWTPayload & {
  sid: string;
  sub: string;
  org_id?: string;
};

export type LocalMembershipRecord = {
  organizationId: string;
  memberId: string;
  workosOrganizationId: string | null;
};

export type BootstrapOrganizationInput = {
  legalName: string;
  tradeName?: string | null;
  legalIdentifier: string;
  adminFullName: string;
  adminEmail: string;
  password?: string | null;
};

export type BootstrapOrganizationResult = {
  member: {
    id: string;
    email: string;
    fullName: string;
    organizationId: string;
  };
  organization: {
    id: string;
    legalIdentifier: string;
    legalName: string;
    tradeName: string | null;
    workosOrganizationId: string;
  };
  workosMembership: OrganizationMembership;
  workosOrganization: Organization;
  workosUser: User;
};

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
const sessionKeyDerivationSalt = textEncoder.encode("daton.session.v1");
const sessionKeyDerivationInfo = textEncoder.encode("daton/session-encryption");

const getWorkOsJwks = (clientId: string) => {
  const cached = jwksCache.get(clientId);

  if (cached) {
    return cached;
  }

  const jwks = createRemoteJWKSet(
    new URL(`https://api.workos.com/sso/jwks/${clientId}`),
    { cooldownDuration: 1000 * 60 * 5 },
  );
  jwksCache.set(clientId, jwks);
  return jwks;
};

const normalizeIssuerBase = (issuer: string) => issuer.replace(/\/+$/, "");

const getExpectedWorkOsIssuers = (env: WorkOsEnv) => {
  const issuerBase = normalizeIssuerBase(
    env.WORKOS_AUTHKIT_DOMAIN?.startsWith("http")
      ? env.WORKOS_AUTHKIT_DOMAIN
      : env.WORKOS_AUTHKIT_DOMAIN
        ? `https://${env.WORKOS_AUTHKIT_DOMAIN}`
        : defaultWorkOsIssuer,
  );

  return [issuerBase, `${issuerBase}/`];
};

const getSessionEncryptionKey = async (secret: string) => {
  const importedKey = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    "HKDF",
    false,
    ["deriveBits"],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: sessionKeyDerivationSalt,
      info: sessionKeyDerivationInfo,
    },
    importedKey,
    256,
  );

  return new Uint8Array(derivedBits);
};

const assertAccessTokenClaims = (payload: JWTPayload): WorkOsAccessTokenClaims => {
  const subject = typeof payload.sub === "string" ? payload.sub : null;
  const sessionId =
    "sid" in payload && typeof payload.sid === "string" ? payload.sid : null;

  if (!subject || !sessionId) {
    throw new Error("Missing required WorkOS access token claims.");
  }

  return payload as WorkOsAccessTokenClaims;
};

export const createWorkOsClient = (env: WorkOsEnv & { WORKOS_API_KEY?: string }) =>
  new WorkOS({
    apiKey: env.WORKOS_API_KEY,
    clientId: env.WORKOS_CLIENT_ID,
    fetchFn: fetch,
  });

export const decodeWorkOsAccessToken = (accessToken: string): WorkOsAccessTokenClaims =>
  assertAccessTokenClaims(decodeJwt(accessToken));

export const verifyWorkOsAccessToken = async (
  accessToken: string,
  env: WorkOsEnv,
): Promise<WorkOsAccessTokenClaims> => {
  const { payload } = await jwtVerify(accessToken, getWorkOsJwks(env.WORKOS_CLIENT_ID), {
    issuer: getExpectedWorkOsIssuers(env),
    audience: env.WORKOS_CLIENT_ID,
    algorithms: ["RS256"],
  });
  return assertAccessTokenClaims(payload);
};

export const getAccessTokenExpiresAt = (accessToken: string) => {
  const payload = decodeWorkOsAccessToken(accessToken);

  if (typeof payload.exp !== "number") {
    throw new Error("Missing exp claim in WorkOS access token.");
  }

  return new Date(payload.exp * 1000).toISOString();
};

export const isAccessTokenExpired = (
  accessTokenExpiresAt: string,
  bufferSeconds = accessTokenRefreshWindowSeconds,
) => Date.parse(accessTokenExpiresAt) <= Date.now() + bufferSeconds * 1000;

export const createDatonSessionPayload = (
  authentication: Pick<AuthenticationResponse, "accessToken" | "refreshToken" | "user" | "organizationId">,
): DatonSessionCookiePayload => ({
  refreshToken: authentication.refreshToken,
  accessToken: authentication.accessToken,
  accessTokenExpiresAt: getAccessTokenExpiresAt(authentication.accessToken),
  workosUserId: authentication.user.id,
  workosOrganizationId: authentication.organizationId ?? null,
});

export const sealDatonSession = async (
  payload: DatonSessionCookiePayload,
  env: DatonSessionEnv,
) =>
  new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${sessionLifetimeSeconds}s`)
    .encrypt(await getSessionEncryptionKey(env.DATON_SESSION_SECRET));

export const unsealDatonSession = async (
  value: string | undefined,
  env: DatonSessionEnv,
): Promise<DatonSessionCookiePayload | null> => {
  if (!value) {
    return null;
  }

  try {
    const { payload } = await jwtDecrypt(
      value,
      await getSessionEncryptionKey(env.DATON_SESSION_SECRET),
      {
        contentEncryptionAlgorithms: ["A256GCM"],
      },
    );

    if (
      typeof payload.refreshToken !== "string" ||
      typeof payload.accessToken !== "string" ||
      typeof payload.accessTokenExpiresAt !== "string" ||
      typeof payload.workosUserId !== "string"
    ) {
      return null;
    }

    return {
      refreshToken: payload.refreshToken,
      accessToken: payload.accessToken,
      accessTokenExpiresAt: payload.accessTokenExpiresAt,
      workosUserId: payload.workosUserId,
      workosOrganizationId:
        typeof payload.workosOrganizationId === "string"
          ? payload.workosOrganizationId
          : null,
    };
  } catch {
    return null;
  }
};

export const authenticateWithWorkOsPassword = async (
  env: WorkOsManagementEnv,
  input: {
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
  },
) =>
  createWorkOsClient(env).userManagement.authenticateWithPassword({
    clientId: env.WORKOS_CLIENT_ID,
    email: input.email,
    password: input.password,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

export const refreshWorkOsAuthentication = async (
  env: WorkOsManagementEnv,
  input: {
    refreshToken: string;
    organizationId?: string | null;
    ipAddress?: string;
    userAgent?: string;
  },
) =>
  createWorkOsClient(env).userManagement.authenticateWithRefreshToken({
    clientId: env.WORKOS_CLIENT_ID,
    refreshToken: input.refreshToken,
    organizationId: input.organizationId ?? undefined,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

export const findPrimaryMembership = async (
  db: DatonDb,
  userId: string,
  workosOrganizationId?: string | null,
): Promise<LocalMembershipRecord | null> => {
  const [membership] = await db
    .select({
      organizationId: organizationMembers.organizationId,
      memberId: organizationMembers.id,
      workosOrganizationId: organizations.workosOrganizationId,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.status, "active"),
        workosOrganizationId
          ? eq(organizations.workosOrganizationId, workosOrganizationId)
          : undefined,
      ),
    )
    .orderBy(asc(organizationMembers.createdAt))
    .limit(1);

  return membership ?? null;
};

export const countActiveMemberships = async (db: DatonDb, userId: string) => {
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

export const formatWorkOsUserName = (user: Pick<User, "firstName" | "lastName" | "email">) => {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || null;
};

export const splitWorkOsName = (fullName: string) => {
  const normalized = fullName.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return {
      firstName: undefined,
      lastName: undefined,
    };
  }

  const [firstName, ...rest] = normalized.split(" ");
  const lastName = rest.join(" ").trim();

  return {
    firstName,
    lastName: lastName || undefined,
  };
};

const cleanupWorkOsBootstrap = async (
  workos: WorkOS,
  created: {
    membershipId?: string | null;
    organizationId?: string | null;
    userId?: string | null;
  },
) => {
  const cleanupErrors: Error[] = [];

  if (created.membershipId) {
    try {
      await workos.userManagement.deleteOrganizationMembership(created.membershipId);
    } catch (error) {
      cleanupErrors.push(error instanceof Error ? error : new Error("Failed to delete WorkOS membership."));
    }
  }

  if (created.organizationId) {
    try {
      await workos.organizations.deleteOrganization(created.organizationId);
    } catch (error) {
      cleanupErrors.push(error instanceof Error ? error : new Error("Failed to delete WorkOS organization."));
    }
  }

  if (created.userId) {
    try {
      await workos.userManagement.deleteUser(created.userId);
    } catch (error) {
      cleanupErrors.push(error instanceof Error ? error : new Error("Failed to delete WorkOS user."));
    }
  }

  return cleanupErrors;
};

export const bootstrapOrganizationWithWorkOs = async (
  db: DatonDb,
  env: WorkOsManagementEnv,
  input: BootstrapOrganizationInput,
  authenticatedUser?: Pick<User, "id" | "email" | "firstName" | "lastName"> | null,
): Promise<BootstrapOrganizationResult> => {
  const workos = createWorkOsClient(env);
  const created: {
    membershipId?: string | null;
    organizationId?: string | null;
    userId?: string | null;
  } = {};

  let workosUser: User;

  if (authenticatedUser) {
    workosUser = await workos.userManagement.getUser(authenticatedUser.id);
  } else {
    const { firstName, lastName } = splitWorkOsName(input.adminFullName);
    workosUser = await workos.userManagement.createUser({
      email: input.adminEmail,
      password: input.password ?? undefined,
      firstName,
      lastName,
    });
    created.userId = workosUser.id;
  }

  try {
    return await db.transaction(async (tx) => {
      const [organization] = await tx
        .insert(organizations)
        .values({
          legalName: input.legalName,
          tradeName: input.tradeName?.trim() || null,
          legalIdentifier: input.legalIdentifier,
        })
        .returning();

      if (!organization) {
        throw new Error("Failed to create local organization.");
      }

      const workosOrganization = await workos.organizations.createOrganization({
        name: input.tradeName?.trim() || input.legalName,
        externalId: organization.id,
      });
      created.organizationId = workosOrganization.id;

      const workosMembership = await workos.userManagement.createOrganizationMembership({
        organizationId: workosOrganization.id,
        userId: workosUser.id,
        roleSlug: "member",
      });
      created.membershipId = workosMembership.id;

      const [updatedOrganization] = await tx
        .update(organizations)
        .set({
          workosOrganizationId: workosOrganization.id,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, organization.id))
        .returning();

      const [member] = await tx
        .insert(organizationMembers)
        .values({
          organizationId: organization.id,
          userId: workosUser.id,
          fullName:
            (authenticatedUser ? formatWorkOsUserName(workosUser) : input.adminFullName.trim()) ||
            formatWorkOsUserName(workosUser) ||
            workosUser.email,
          email: workosUser.email,
        })
        .returning();

      if (!member) {
        throw new Error("Failed to create local organization member.");
      }

      await tx.insert(memberRoleAssignments).values([
        {
          organizationId: organization.id,
          memberId: member.id,
          role: "owner",
        },
        {
          organizationId: organization.id,
          memberId: member.id,
          role: "admin",
        },
      ]);

      return {
        member: {
          id: member.id,
          email: member.email,
          fullName: member.fullName,
          organizationId: member.organizationId,
        },
        organization: {
          id: organization.id,
          legalIdentifier: organization.legalIdentifier,
          legalName: organization.legalName,
          tradeName: organization.tradeName,
          workosOrganizationId:
            updatedOrganization?.workosOrganizationId ?? workosOrganization.id,
        },
        workosMembership,
        workosOrganization,
        workosUser,
      };
    });
  } catch (error) {
    const cleanupErrors = await cleanupWorkOsBootstrap(workos, created);

    if (cleanupErrors.length > 0) {
      console.error("Failed to clean up WorkOS bootstrap resources.", cleanupErrors);

      if (error instanceof Error) {
        (error as Error & { cause?: unknown }).cause = cleanupErrors;
      } else {
        const aggregateError = new Error("WorkOS bootstrap failed and cleanup also reported errors.");
        (aggregateError as Error & { cause?: unknown }).cause = cleanupErrors;
        throw aggregateError;
      }
    }

    throw error;
  }
};
