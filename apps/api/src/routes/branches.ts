import { zValidator } from "@hono/zod-validator";
import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

import {
  branchIdSchema,
  createCreateBranchSchema,
  createUpdateBranchSchema,
  type CreateBranchInput,
  type UpdateBranchInput,
} from "@daton/contracts";
import {
  branchManagerAssignments,
  branches,
  memberRoleAssignments,
  organizationMembers,
} from "@daton/db";

import { recordAuditEvent } from "../lib/audit";
import { parseServerEnv } from "../env";
import type { AppDbExecutor } from "../lib/session";
import { requireRoles } from "../middleware/auth";
import type { AppBindings } from "../types";

const normalizeEmpty = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const parseCreateBranchInput = async (c: any): Promise<CreateBranchInput> => {
  const env = parseServerEnv(c.env);

  try {
    return createCreateBranchSchema({
      allowFictional: env.ALLOW_FICTIONAL_CNPJ,
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

const parseUpdateBranchInput = async (c: any): Promise<UpdateBranchInput> => {
  const env = parseServerEnv(c.env);

  try {
    return createUpdateBranchSchema({
      allowFictional: env.ALLOW_FICTIONAL_CNPJ,
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

const assertHeadquartersAvailability = async (
  db: AppDbExecutor,
  organizationId: string,
  branchId?: string,
) => {
  const [existingHeadquarters] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(
      and(
        eq(branches.organizationId, organizationId),
        eq(branches.isHeadquarters, true),
        eq(branches.status, "active"),
        branchId ? ne(branches.id, branchId) : undefined,
      ),
    )
    .limit(1);

  if (existingHeadquarters) {
    throw new HTTPException(409, {
      message: "Apenas uma filial matriz ativa é permitida.",
    });
  }
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

export const branchRoutes = new Hono<AppBindings>();

branchRoutes.use("/branches/*", requireRoles("owner", "admin"));

branchRoutes.get("/branches", async (c) => {
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

branchRoutes.post("/branches", async (c) => {
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

    if (branch.isHeadquarters) {
      await assertHeadquartersAvailability(tx, organization.id, branch.id);
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

branchRoutes.get("/branches/:branchId", zValidator("param", branchIdSchema), async (c) => {
  const snapshot = c.get("sessionSnapshot");

  if (!snapshot?.organization) {
    throw new HTTPException(401, { message: "Autenticação obrigatória." });
  }

  const { branchId } = c.req.valid("param");

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
});

branchRoutes.patch(
  "/branches/:branchId",
  zValidator("param", branchIdSchema),
  async (c) => {
    const snapshot = c.get("sessionSnapshot");

    if (!snapshot?.organization || !snapshot.member) {
      throw new HTTPException(401, { message: "Autenticação obrigatória." });
    }

    const organization = snapshot.organization;
    const member = snapshot.member;

    const { branchId } = c.req.valid("param");
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

    if (input.status === "archived" && existingBranch.isHeadquarters) {
      throw new HTTPException(400, {
        message: "Promova outra filial antes de arquivar a matriz ativa.",
      });
    }

    if (existingBranch.isHeadquarters && input.isHeadquarters === false) {
      throw new HTTPException(400, {
        message: "A matriz ativa não pode ser desmarcada sem promover outra filial.",
      });
    }

    await db.transaction(async (tx: AppDbExecutor) => {
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
          parentBranchId: input.parentBranchId ?? null,
          status: input.status ?? existingBranch.status,
          updatedAt: new Date(),
        })
        .where(eq(branches.id, branchId));

      if (input.isHeadquarters && !existingBranch.isHeadquarters) {
        await assertHeadquartersAvailability(tx, organization.id, branchId);
      }

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
          status: input.status ?? existingBranch.status,
        },
      });
    });

    return c.json(await serializeBranch(db, branchId));
  },
);
