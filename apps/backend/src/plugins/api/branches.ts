import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { ZodError } from "zod";

import {
  branchIdSchema,
  createCreateBranchSchema,
  createUpdateBranchSchema,
  roles,
  type CreateBranchInput,
  type UpdateBranchInput,
} from "@daton/contracts";
import {
  branchManagerAssignments,
  branches,
  memberRoleAssignments,
  organizationMembers,
} from "@daton/db";

import { requireRoles } from "../../lib/auth";
import { recordAuditEvent } from "../../lib/audit";
import { HTTPException } from "../../lib/errors";
import { createRouteContext, type AppRouteContext } from "../../lib/route-context";
import type { AppDbExecutor } from "../../lib/session";
import { parseOrThrow } from "../../lib/validation";
import type { FastifyPluginAsync } from "fastify";

const normalizeEmpty = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const roleOrder = new Map(roles.map((role, index) => [role, index]));

const parseCreateBranchInput = async (c: AppRouteContext): Promise<CreateBranchInput> => {
  try {
    return createCreateBranchSchema({
      allowFictional: c.env.ALLOW_FICTIONAL_CNPJ === "true",
    }).parse(await c.req.json());
  } catch (error) {
    if (error instanceof ZodError) {
      throw new HTTPException(400, {
        message: error.issues[0]?.message ?? "Dados inválidos.",
      });
    }

    throw error;
  }
};

const parseUpdateBranchInput = async (c: AppRouteContext): Promise<UpdateBranchInput> => {
  try {
    return createUpdateBranchSchema({
      allowFictional: c.env.ALLOW_FICTIONAL_CNPJ === "true",
    }).parse(await c.req.json());
  } catch (error) {
    if (error instanceof ZodError) {
      throw new HTTPException(400, {
        message: error.issues[0]?.message ?? "Dados inválidos.",
      });
    }

    throw error;
  }
};

const getActiveManagerId = async (db: AppDbExecutor, branchId: string) => {
  const [manager] = await db
    .select({
      memberId: branchManagerAssignments.memberId,
    })
    .from(branchManagerAssignments)
    .where(and(eq(branchManagerAssignments.branchId, branchId), isNull(branchManagerAssignments.unassignedAt)))
    .limit(1);

  return manager?.memberId ?? null;
};

const assertParentBranch = async (
  db: AppDbExecutor,
  organizationId: string,
  branchId: string | null,
  parentBranchId: string | null,
) => {
  if (!parentBranchId) {
    return;
  }

  if (branchId && branchId === parentBranchId) {
    throw new HTTPException(400, {
      message: "Uma filial não pode ser pai de si mesma.",
    });
  }

  let cursor: string | null = parentBranchId;

  while (cursor) {
    const [parent] = await db
      .select({
        id: branches.id,
        parentBranchId: branches.parentBranchId,
      })
      .from(branches)
      .where(and(eq(branches.id, cursor), eq(branches.organizationId, organizationId)))
      .limit(1);

    if (!parent) {
      throw new HTTPException(400, {
        message: "A filial pai não foi encontrada nesta organização.",
      });
    }

    if (branchId && parent.id === branchId) {
      throw new HTTPException(400, {
        message: "Essa relação hierárquica criaria um ciclo.",
      });
    }

    cursor = parent.parentBranchId;
  }
};

const ensureUniqueCode = async (
  db: AppDbExecutor,
  organizationId: string,
  code: string,
  branchId?: string,
) => {
  const [duplicate] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(
      and(
        eq(branches.organizationId, organizationId),
        eq(branches.code, code),
        branchId ? ne(branches.id, branchId) : undefined,
      ),
    )
    .limit(1);

  if (duplicate) {
    throw new HTTPException(409, {
      message: "O código da filial deve ser único dentro da organização.",
    });
  }
};

const hasOtherActiveHeadquarters = async (
  db: AppDbExecutor,
  organizationId: string,
  branchId?: string,
) => {
  const [headquarters] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(
      and(
        eq(branches.organizationId, organizationId),
        eq(branches.status, "active"),
        eq(branches.isHeadquarters, true),
        branchId ? ne(branches.id, branchId) : undefined,
      ),
    )
    .limit(1);

  return Boolean(headquarters);
};

const assignBranchManager = async (
  db: AppDbExecutor,
  input: {
    organizationId: string;
    branchId: string;
    memberId: string | null;
    actorUserId: string;
    actorMemberId: string;
  },
) => {
  const currentManagerId = await getActiveManagerId(db, input.branchId);

  if (currentManagerId === input.memberId) {
    return currentManagerId;
  }

  if (currentManagerId) {
    await db
      .update(branchManagerAssignments)
      .set({
        unassignedAt: new Date(),
      })
      .where(
        and(
          eq(branchManagerAssignments.branchId, input.branchId),
          eq(branchManagerAssignments.memberId, currentManagerId),
          isNull(branchManagerAssignments.unassignedAt),
        ),
      );

    await db
      .update(memberRoleAssignments)
      .set({
        revokedAt: new Date(),
      })
      .where(
        and(
          eq(memberRoleAssignments.organizationId, input.organizationId),
          eq(memberRoleAssignments.memberId, currentManagerId),
          eq(memberRoleAssignments.role, "branch_manager"),
          eq(memberRoleAssignments.branchScopeId, input.branchId),
          isNull(memberRoleAssignments.revokedAt),
        ),
      );
  }

  if (!input.memberId) {
    return null;
  }

  const [member] = await db
    .select({
      id: organizationMembers.id,
    })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.id, input.memberId),
        eq(organizationMembers.organizationId, input.organizationId),
        eq(organizationMembers.status, "active"),
      ),
    )
    .limit(1);

  if (!member) {
    throw new HTTPException(400, {
      message: "O gestor da filial precisa ser um membro ativo da organização.",
    });
  }

  await db.insert(branchManagerAssignments).values({
    organizationId: input.organizationId,
    branchId: input.branchId,
    memberId: input.memberId,
  });

  await db.insert(memberRoleAssignments).values({
    organizationId: input.organizationId,
    memberId: input.memberId,
    role: "branch_manager",
    branchScopeId: input.branchId,
  });

  await recordAuditEvent(db, {
    action: "branch.assign_manager",
    entityType: "branch",
    entityId: input.branchId,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    actorMemberId: input.actorMemberId,
    metadata: {
      managerMemberId: input.memberId,
    },
  });

  return input.memberId;
};

const serializeBranch = async (db: AppDbExecutor, branchId: string) => {
  const [branch] = await db
    .select()
    .from(branches)
    .where(eq(branches.id, branchId))
    .limit(1);

  if (!branch) {
    throw new HTTPException(404, {
      message: "Filial não encontrada.",
    });
  }

  return {
    ...branch,
    managerMemberId: await getActiveManagerId(db, branch.id),
  };
};

const branchesPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.get("/branches", async (request, reply) => {
    const c = createRouteContext(request, reply);
    const snapshot = c.get("sessionSnapshot");

    if (!snapshot?.organization) {
      throw new HTTPException(401, { message: "Autenticação obrigatória." });
    }

    const organization = snapshot.organization;

    const db = c.get("db");
    const visibleBranchIds = snapshot.branchScope.length
      ? snapshot.branchScope
      : (
          await db
            .select({ id: branches.id })
            .from(branches)
            .where(eq(branches.organizationId, organization.id))
        ).map((branch) => branch.id);

    const records = await db
      .select()
      .from(branches)
      .where(
        and(
          eq(branches.organizationId, organization.id),
          visibleBranchIds.length ? inArray(branches.id, visibleBranchIds) : undefined,
        ),
      );

    const managers = await Promise.all(
      records.map(async (branch) => ({
        ...branch,
        managerMemberId: await getActiveManagerId(db, branch.id),
      })),
    );

    return c.json(managers);
  });

  fastify.get(
    "/members",
    {
      preHandler: requireRoles("owner", "admin"),
    },
    async (request, reply) => {
      const c = createRouteContext(request, reply);
      const snapshot = c.get("sessionSnapshot");

      if (!snapshot?.organization) {
        throw new HTTPException(401, { message: "Autenticação obrigatória." });
      }

      const db = c.get("db");
      const [records, activeBranches, assignments, managerAssignments] =
        await Promise.all([
          db
            .select({
              id: organizationMembers.id,
              userId: organizationMembers.userId,
              fullName: organizationMembers.fullName,
              email: organizationMembers.email,
              status: organizationMembers.status,
            })
            .from(organizationMembers)
            .where(eq(organizationMembers.organizationId, snapshot.organization.id)),
          db
            .select({
              id: branches.id,
            })
            .from(branches)
            .where(
              and(
                eq(branches.organizationId, snapshot.organization.id),
                eq(branches.status, "active"),
              ),
            ),
          db
            .select({
              memberId: memberRoleAssignments.memberId,
              role: memberRoleAssignments.role,
              branchScopeId: memberRoleAssignments.branchScopeId,
            })
            .from(memberRoleAssignments)
            .where(
              and(
                eq(memberRoleAssignments.organizationId, snapshot.organization.id),
                isNull(memberRoleAssignments.revokedAt),
              ),
            ),
          db
            .select({
              memberId: branchManagerAssignments.memberId,
              branchId: branchManagerAssignments.branchId,
            })
            .from(branchManagerAssignments)
            .innerJoin(branches, eq(branchManagerAssignments.branchId, branches.id))
            .where(
              and(
                eq(branchManagerAssignments.organizationId, snapshot.organization.id),
                eq(branches.organizationId, snapshot.organization.id),
                eq(branches.status, "active"),
                isNull(branchManagerAssignments.unassignedAt),
              ),
            ),
        ]);

      const activeBranchIds = activeBranches.map((branch) => branch.id);
      const activeBranchSet = new Set(activeBranchIds);
      const rolesByMember = new Map<string, Set<(typeof roles)[number]>>();
      const branchIdsByMember = new Map<string, Set<string>>();
      const managedBranchIdsByMember = new Map<string, Set<string>>();

      assignments.forEach((assignment) => {
        const currentRoles = rolesByMember.get(assignment.memberId) ?? new Set();
        currentRoles.add(assignment.role);
        rolesByMember.set(assignment.memberId, currentRoles);

        if (!assignment.branchScopeId || !activeBranchSet.has(assignment.branchScopeId)) {
          return;
        }

        const currentBranches = branchIdsByMember.get(assignment.memberId) ?? new Set<string>();
        currentBranches.add(assignment.branchScopeId);
        branchIdsByMember.set(assignment.memberId, currentBranches);
      });

      managerAssignments.forEach((assignment) => {
        const currentManagedBranches =
          managedBranchIdsByMember.get(assignment.memberId) ?? new Set<string>();
        currentManagedBranches.add(assignment.branchId);
        managedBranchIdsByMember.set(assignment.memberId, currentManagedBranches);
      });

      const collator = new Intl.Collator("pt-BR");

      return c.json(
        [...records]
          .map((record) => {
            const memberRoles = Array.from(rolesByMember.get(record.id) ?? []).sort(
              (left, right) =>
                (roleOrder.get(left) ?? Number.MAX_SAFE_INTEGER) -
                (roleOrder.get(right) ?? Number.MAX_SAFE_INTEGER),
            );
            const hasGlobalAccess = memberRoles.some((role) =>
              ["owner", "admin", "hr_admin", "document_controller"].includes(role),
            );
            const managedBranchIds = Array.from(
              managedBranchIdsByMember.get(record.id) ?? [],
            ).sort((left, right) => left.localeCompare(right));
            const scopedBranchIds = Array.from(
              branchIdsByMember.get(record.id) ?? [],
            ).sort((left, right) => left.localeCompare(right));

            return {
              ...record,
              roles: memberRoles,
              branchIds: hasGlobalAccess
                ? activeBranchIds
                : Array.from(new Set([...scopedBranchIds, ...managedBranchIds])),
              managedBranchIds,
              hasGlobalAccess,
            };
          })
          .sort((left, right) => collator.compare(left.fullName, right.fullName)),
      );
    },
  );

  fastify.post("/branches", async (request, reply) => {
    const c = createRouteContext(request, reply);
    const snapshot = c.get("sessionSnapshot");

    if (!snapshot?.organization || !snapshot.member) {
      throw new HTTPException(401, { message: "Autenticação obrigatória." });
    }

    const organization = snapshot.organization;
    const member = snapshot.member;

    const input = await parseCreateBranchInput(c);
    const db = c.get("db");

    await ensureUniqueCode(db, organization.id, input.code);
    await assertParentBranch(db, organization.id, null, input.parentBranchId ?? null);

    const result = await db.transaction(async (tx: AppDbExecutor) => {
      if (input.isHeadquarters && (await hasOtherActiveHeadquarters(tx, organization.id))) {
        throw new HTTPException(409, {
          message: "Já existe uma sede ativa cadastrada para esta organização.",
        });
      }

      const [branch] = await tx
        .insert(branches)
        .values({
          organizationId: organization.id,
          name: input.name,
          code: input.code,
          legalIdentifier: input.legalIdentifier,
          email: normalizeEmpty(input.email),
          phone: normalizeEmpty(input.phone),
          addressLine1: normalizeEmpty(input.addressLine1),
          addressLine2: normalizeEmpty(input.addressLine2),
          city: normalizeEmpty(input.city),
          stateOrProvince: normalizeEmpty(input.stateOrProvince),
          postalCode: normalizeEmpty(input.postalCode),
          country: normalizeEmpty(input.country),
          isHeadquarters: Boolean(input.isHeadquarters),
          parentBranchId: input.parentBranchId ?? null,
        })
        .returning();

      if (!branch) {
        throw new HTTPException(500, { message: "Não foi possível criar a filial." });
      }

      const managerMemberId = await assignBranchManager(tx, {
        organizationId: organization.id,
        branchId: branch.id,
        memberId: input.managerMemberId ?? null,
        actorUserId: snapshot.user.id,
        actorMemberId: member.id,
      });

      await recordAuditEvent(tx, {
        action: "branch.create",
        entityType: "branch",
        entityId: branch.id,
        organizationId: organization.id,
        actorUserId: snapshot.user.id,
        actorMemberId: member.id,
        metadata: {
          code: branch.code,
          managerMemberId,
        },
      });

      return {
        branchId: branch.id,
      };
    });

    return c.json(await serializeBranch(db, result.branchId), 201);
  });

  fastify.get(
    "/branches/:branchId",
    {
      preHandler: requireRoles("owner", "admin"),
    },
    async (request, reply) => {
      const c = createRouteContext(request, reply, {
        param: parseOrThrow(branchIdSchema, request.params),
      });
      const snapshot = c.get("sessionSnapshot");

      if (!snapshot?.organization) {
        throw new HTTPException(401, { message: "Autenticação obrigatória." });
      }

      const { branchId } = c.req.valid("param") as { branchId: string };

      if (
        snapshot.branchScope.length > 0 &&
        !snapshot.branchScope.includes(branchId) &&
        !snapshot.effectiveRoles.some((role) => ["owner", "admin"].includes(role))
      ) {
        throw new HTTPException(403, {
          message: "Você não tem acesso a esta filial.",
        });
      }

      return c.json(await serializeBranch(c.get("db"), branchId));
    },
  );

  fastify.patch(
    "/branches/:branchId",
    {
      preHandler: requireRoles("owner", "admin"),
    },
    async (request, reply) => {
      const c = createRouteContext(request, reply, {
        param: parseOrThrow(branchIdSchema, request.params),
      });
      const snapshot = c.get("sessionSnapshot");

      if (!snapshot?.organization || !snapshot.member) {
        throw new HTTPException(401, { message: "Autenticação obrigatória." });
      }

      const organization = snapshot.organization;
      const member = snapshot.member;

      const { branchId } = c.req.valid("param") as { branchId: string };
      const input = await parseUpdateBranchInput(c);
      const db = c.get("db");

      await ensureUniqueCode(db, organization.id, input.code, branchId);
      await assertParentBranch(db, organization.id, branchId, input.parentBranchId ?? null);

      const [existingBranch] = await db
        .select()
        .from(branches)
        .where(and(eq(branches.id, branchId), eq(branches.organizationId, organization.id)))
        .limit(1);

      if (!existingBranch) {
        throw new HTTPException(404, {
          message: "Filial não encontrada.",
        });
      }

      await db.transaction(async (tx: AppDbExecutor) => {
        const nextStatus = input.status ?? existingBranch.status;
        const nextIsHeadquarters = Boolean(input.isHeadquarters);
        const willBeActiveHeadquarters = nextStatus === "active" && nextIsHeadquarters;
        const isActiveHeadquartersToday =
          existingBranch.status === "active" && existingBranch.isHeadquarters;

        if (
          willBeActiveHeadquarters &&
          (await hasOtherActiveHeadquarters(tx, organization.id, branchId))
        ) {
          throw new HTTPException(409, {
            message: "Já existe uma sede ativa cadastrada para esta organização.",
          });
        }

        if (
          isActiveHeadquartersToday &&
          !willBeActiveHeadquarters &&
          !(await hasOtherActiveHeadquarters(tx, organization.id, branchId))
        ) {
          throw new HTTPException(400, {
            message: "A organização precisa manter ao menos uma sede ativa.",
          });
        }

        await tx
          .update(branches)
          .set({
            name: input.name,
            code: input.code,
            legalIdentifier: input.legalIdentifier,
            email: normalizeEmpty(input.email),
            phone: normalizeEmpty(input.phone),
            addressLine1: normalizeEmpty(input.addressLine1),
            addressLine2: normalizeEmpty(input.addressLine2),
            city: normalizeEmpty(input.city),
            stateOrProvince: normalizeEmpty(input.stateOrProvince),
            postalCode: normalizeEmpty(input.postalCode),
            country: normalizeEmpty(input.country),
            isHeadquarters: nextIsHeadquarters,
            parentBranchId: input.parentBranchId ?? null,
            status: nextStatus,
            updatedAt: new Date(),
          })
          .where(eq(branches.id, branchId));

        await assignBranchManager(tx, {
          organizationId: organization.id,
          branchId,
          memberId: input.managerMemberId ?? null,
          actorUserId: snapshot.user.id,
          actorMemberId: member.id,
        });

        await recordAuditEvent(tx, {
          action: input.status === "archived" ? "branch.archive" : "branch.update",
          entityType: "branch",
          entityId: branchId,
          organizationId: organization.id,
          actorUserId: snapshot.user.id,
          actorMemberId: member.id,
          metadata: {
            code: input.code,
            status: nextStatus,
          },
        });
      });

      return c.json(await serializeBranch(db, branchId));
    },
  );
};

export default branchesPlugin;
