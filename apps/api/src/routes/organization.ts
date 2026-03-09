import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

import {
  organizationSummarySchema,
  createCreateDepartmentSchema,
  createUpdateDepartmentSchema,
  departmentIdSchema,
  updateOrganizationSchema,
  type AuditAction,
  type CreateDepartmentInput,
  type NotificationLevel,
  type UpdateOrganizationInput,
  type UpdateDepartmentInput,
} from "@daton/contracts";
import {
  auditEvents,
  branches,
  departments,
  departmentBranchAssignments,
  organizationMembers,
  organizations,
} from "@daton/db";

import { recordAuditEvent } from "../lib/audit";
import type { AppDbExecutor } from "../lib/session";
import { requireRoles } from "../middleware/auth";
import type { AppBindings } from "../types";

const normalizeEmpty = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizeOrganizationProfile = (
  input: UpdateOrganizationInput["companyProfile"],
) => ({
  sector: input.sector,
  customSector:
    input.sector === "other" ? normalizeEmpty(input.customSector) : null,
  size: input.size,
  goals: input.goals,
  maturityLevel: input.maturityLevel,
  currentChallenges: input.currentChallenges
    .map((challenge) => challenge.trim())
    .filter(Boolean),
});

const parseCreateDepartmentInput = async (
  c: any,
): Promise<CreateDepartmentInput> => {
  try {
    return createCreateDepartmentSchema().parse(await c.req.json());
  } catch (error) {
    if (error instanceof ZodError) {
      throw new HTTPException(400, {
        message: error.issues[0]?.message ?? "Dados inválidos.",
      });
    }

    throw error;
  }
};

const parseUpdateDepartmentInput = async (
  c: any,
): Promise<UpdateDepartmentInput> => {
  try {
    return createUpdateDepartmentSchema().parse(await c.req.json());
  } catch (error) {
    if (error instanceof ZodError) {
      throw new HTTPException(400, {
        message: error.issues[0]?.message ?? "Dados inválidos.",
      });
    }

    throw error;
  }
};

const parseUpdateOrganizationInput = async (
  c: any,
): Promise<UpdateOrganizationInput> => {
  try {
    return updateOrganizationSchema.parse(await c.req.json());
  } catch (error) {
    if (error instanceof ZodError) {
      throw new HTTPException(400, {
        message: error.issues[0]?.message ?? "Dados inválidos.",
      });
    }

    throw error;
  }
};

const ensureDepartmentCodeUnique = async (
  db: AppDbExecutor,
  organizationId: string,
  code: string,
  departmentId?: string,
) => {
  const [duplicate] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(
      and(
        eq(departments.organizationId, organizationId),
        eq(departments.code, code),
        departmentId ? ne(departments.id, departmentId) : undefined,
      ),
    )
    .limit(1);

  if (duplicate) {
    throw new HTTPException(409, {
      message: "O código do departamento deve ser único dentro da organização.",
    });
  }
};

const assertManagerMember = async (
  db: AppDbExecutor,
  organizationId: string,
  memberId: string | null,
) => {
  if (!memberId) {
    return;
  }

  const [member] = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.id, memberId),
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.status, "active"),
      ),
    )
    .limit(1);

  if (!member) {
    throw new HTTPException(400, {
      message: "O responsável do departamento precisa ser um membro ativo da organização.",
    });
  }
};

const ensureDepartmentBranches = async (
  db: AppDbExecutor,
  organizationId: string,
  branchIds: string[],
) => {
  if (branchIds.length === 0) {
    return [];
  }

  const availableBranches = await db
    .select({
      id: branches.id,
      name: branches.name,
    })
    .from(branches)
    .where(
      and(
        eq(branches.organizationId, organizationId),
        inArray(branches.id, branchIds),
      ),
    );

  if (availableBranches.length !== new Set(branchIds).size) {
    throw new HTTPException(400, {
      message: "Uma ou mais unidades vinculadas ao departamento não foram encontradas.",
    });
  }

  return availableBranches;
};

const serializeDepartment = async (db: AppDbExecutor, departmentId: string) => {
  const [record] = await db
    .select({
      id: departments.id,
      organizationId: departments.organizationId,
      name: departments.name,
      code: departments.code,
      status: departments.status,
      managerMemberId: departments.managerMemberId,
      managerName: organizationMembers.fullName,
      notes: departments.notes,
    })
    .from(departments)
    .leftJoin(
      organizationMembers,
      eq(departments.managerMemberId, organizationMembers.id),
    )
    .where(eq(departments.id, departmentId))
    .limit(1);

  if (!record) {
    throw new HTTPException(404, {
      message: "Departamento não encontrado.",
    });
  }

  const assignments = await db
    .select({
      branchId: departmentBranchAssignments.branchId,
      branchName: branches.name,
    })
    .from(departmentBranchAssignments)
    .innerJoin(branches, eq(departmentBranchAssignments.branchId, branches.id))
    .where(eq(departmentBranchAssignments.departmentId, departmentId));

  const sortedAssignments = [...assignments].sort((left, right) =>
    left.branchName.localeCompare(right.branchName, "pt-BR"),
  );

  return {
    ...record,
    notes: record.notes ?? null,
    managerName: record.managerName ?? null,
    branchIds: sortedAssignments.map((assignment) => assignment.branchId),
    branchNames: sortedAssignments.map((assignment) => assignment.branchName),
  };
};

const serializeOrganization = async (
  db: AppDbExecutor,
  organizationId: string,
) => {
  const [organization] = await db
    .select({
      id: organizations.id,
      legalName: organizations.legalName,
      tradeName: organizations.tradeName,
      legalIdentifier: organizations.legalIdentifier,
      openingDate: organizations.openingDate,
      taxRegime: organizations.taxRegime,
      primaryCnae: organizations.primaryCnae,
      stateRegistration: organizations.stateRegistration,
      municipalRegistration: organizations.municipalRegistration,
      onboardingData: organizations.onboardingData,
      onboardingStatus: organizations.onboardingStatus,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!organization) {
    throw new HTTPException(404, {
      message: "Organização não encontrada.",
    });
  }

  return organizationSummarySchema.parse(organization);
};

function toNotificationSummary(record: {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}) {
  const metadata = record.metadata ?? {};
  const branchCode = typeof metadata.code === "string" ? metadata.code : null;
  const departmentCode = typeof metadata.code === "string" ? metadata.code : null;
  const departmentName =
    typeof metadata.name === "string" ? metadata.name : departmentCode;

  const mapping: Record<
    AuditAction,
    {
      actionLabel: string | null;
      description: string;
      href: string | null;
      level: NotificationLevel;
      title: string;
    }
  > = {
    "auth.sign_in": {
      actionLabel: null,
      description: "Uma nova autenticação foi registrada neste ambiente.",
      href: null,
      level: "neutral",
      title: "Acesso autenticado",
    },
    "auth.sign_out": {
      actionLabel: null,
      description: "Uma sessão foi encerrada.",
      href: null,
      level: "neutral",
      title: "Sessão encerrada",
    },
    "organization.bootstrap": {
      actionLabel: "Ver organização",
      description: `A organização foi inicializada com a unidade ${String(metadata.branchCode ?? "principal")}.`,
      href: "/app/settings/organization",
      level: "neutral",
      title: "Ambiente criado",
    },
    "organization.update": {
      actionLabel: "Ver organização",
      description: "Os dados centrais da organização foram atualizados.",
      href: "/app/settings/organization",
      level: "neutral",
      title: "Organização atualizada",
    },
    "branch.create": {
      actionLabel: "Abrir unidade",
      description: `A unidade ${branchCode ?? record.entityId} foi criada com sucesso.`,
      href: `/app/branches/${record.entityId}`,
      level: "neutral",
      title: "Nova unidade criada",
    },
    "branch.update": {
      actionLabel: "Abrir unidade",
      description: `A unidade ${branchCode ?? record.entityId} teve seus dados atualizados.`,
      href: `/app/branches/${record.entityId}`,
      level: "warning",
      title: "Unidade atualizada",
    },
    "branch.archive": {
      actionLabel: "Abrir unidade",
      description: `A unidade ${branchCode ?? record.entityId} foi arquivada.`,
      href: `/app/branches/${record.entityId}`,
      level: "critical",
      title: "Unidade arquivada",
    },
    "branch.assign_manager": {
      actionLabel: "Abrir unidade",
      description: "A gestão responsável pela unidade foi alterada.",
      href: `/app/branches/${record.entityId}`,
      level: "warning",
      title: "Gestor de unidade alterado",
    },
    "department.create": {
      actionLabel: "Ver departamentos",
      description: `O departamento ${departmentName ?? record.entityId} foi criado.`,
      href: "/app/settings/organization?tab=departments",
      level: "neutral",
      title: "Novo departamento criado",
    },
    "department.update": {
      actionLabel: "Ver departamentos",
      description: `O departamento ${departmentName ?? record.entityId} teve seus dados atualizados.`,
      href: "/app/settings/organization?tab=departments",
      level: "warning",
      title: "Departamento atualizado",
    },
    "department.archive": {
      actionLabel: "Ver departamentos",
      description: `O departamento ${departmentName ?? record.entityId} foi arquivado.`,
      href: "/app/settings/organization?tab=departments",
      level: "critical",
      title: "Departamento arquivado",
    },
    "role.assign": {
      actionLabel: null,
      description: "Um perfil de acesso foi atribuído a um membro.",
      href: "/app/social/collaborators?tab=roles",
      level: "warning",
      title: "Perfil atribuído",
    },
    "role.revoke": {
      actionLabel: null,
      description: "Um perfil de acesso foi revogado.",
      href: "/app/social/collaborators?tab=roles",
      level: "warning",
      title: "Perfil revogado",
    },
  };

  const summary = mapping[record.action];

  return {
    id: record.id,
    level: summary.level,
    title: summary.title,
    description: summary.description,
    actionLabel: summary.actionLabel,
    href: summary.href,
    createdAt: record.createdAt.toISOString(),
  };
}

export const organizationRoutes = new Hono<AppBindings>();

organizationRoutes.use("/departments*", requireRoles("owner", "admin", "hr_admin"));

organizationRoutes.patch(
  "/organization",
  requireRoles("owner", "admin"),
  async (c) => {
    const snapshot = c.get("sessionSnapshot");

    if (!snapshot?.organization || !snapshot.member) {
      throw new HTTPException(401, { message: "Autenticação obrigatória." });
    }

    const input = await parseUpdateOrganizationInput(c);
    const db = c.get("db");
    const organization = snapshot.organization;
    const member = snapshot.member;
    const companyProfile = normalizeOrganizationProfile(input.companyProfile);

    await db.transaction(async (tx: AppDbExecutor) => {
      await tx
        .update(organizations)
        .set({
          openingDate: normalizeEmpty(input.openingDate),
          taxRegime: normalizeEmpty(input.taxRegime),
          primaryCnae: normalizeEmpty(input.primaryCnae),
          stateRegistration: normalizeEmpty(input.stateRegistration),
          municipalRegistration: normalizeEmpty(input.municipalRegistration),
          onboardingData: {
            company_profile: companyProfile,
          },
          onboardingStatus: "completed",
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, organization.id));

      await recordAuditEvent(tx, {
        action: "organization.update",
        entityType: "organization",
        entityId: organization.id,
        organizationId: organization.id,
        actorUserId: snapshot.user.id,
        actorMemberId: member.id,
        metadata: {
          onboardingStatus: "completed",
          openingDate: normalizeEmpty(input.openingDate),
          taxRegime: normalizeEmpty(input.taxRegime),
          primaryCnae: normalizeEmpty(input.primaryCnae),
          companyProfile,
        },
      });
    });

    return c.json(await serializeOrganization(db, organization.id));
  },
);

organizationRoutes.get("/notifications", async (c) => {
  const snapshot = c.get("sessionSnapshot");

  if (!snapshot?.organization) {
    throw new HTTPException(401, { message: "Autenticação obrigatória." });
  }

  const records = await c
    .get("db")
    .select({
      id: auditEvents.id,
      action: auditEvents.action,
      entityType: auditEvents.entityType,
      entityId: auditEvents.entityId,
      metadata: auditEvents.metadata,
      createdAt: auditEvents.createdAt,
    })
    .from(auditEvents)
    .where(eq(auditEvents.organizationId, snapshot.organization.id))
    .orderBy(desc(auditEvents.createdAt))
    .limit(12);

  return c.json(records.map(toNotificationSummary));
});

organizationRoutes.get("/departments", async (c) => {
  const snapshot = c.get("sessionSnapshot");

  if (!snapshot?.organization) {
    throw new HTTPException(401, { message: "Autenticação obrigatória." });
  }

  const db = c.get("db");
  const records = await db
    .select({ id: departments.id })
    .from(departments)
    .where(eq(departments.organizationId, snapshot.organization.id));

  const serialized = await Promise.all(
    records.map((record) => serializeDepartment(db, record.id)),
  );

  return c.json(
    serialized.sort((left, right) => left.name.localeCompare(right.name, "pt-BR")),
  );
});

organizationRoutes.post("/departments", async (c) => {
  const snapshot = c.get("sessionSnapshot");

  if (!snapshot?.organization || !snapshot.member) {
    throw new HTTPException(401, { message: "Autenticação obrigatória." });
  }

  const input = await parseCreateDepartmentInput(c);
  const db = c.get("db");
  const organization = snapshot.organization;
  const member = snapshot.member;

  await ensureDepartmentCodeUnique(db, organization.id, input.code);
  await assertManagerMember(db, organization.id, input.managerMemberId ?? null);
  const availableBranches = await ensureDepartmentBranches(
    db,
    organization.id,
    input.branchIds,
  );

  const result = await db.transaction(async (tx: AppDbExecutor) => {
    const [department] = await tx
      .insert(departments)
      .values({
        organizationId: organization.id,
        name: input.name,
        code: input.code,
        managerMemberId: input.managerMemberId ?? null,
        notes: normalizeEmpty(input.notes),
      })
      .returning({ id: departments.id });

    if (!department) {
      throw new HTTPException(500, {
        message: "Não foi possível criar o departamento.",
      });
    }

    if (availableBranches.length > 0) {
      await tx.insert(departmentBranchAssignments).values(
        availableBranches.map((branch) => ({
          organizationId: organization.id,
          departmentId: department.id,
          branchId: branch.id,
        })),
      );
    }

    await recordAuditEvent(tx, {
      action: "department.create",
      entityType: "department",
      entityId: department.id,
      organizationId: organization.id,
      actorUserId: snapshot.user.id,
      actorMemberId: member.id,
      metadata: {
        code: input.code,
        name: input.name,
        managerMemberId: input.managerMemberId ?? null,
      },
    });

    return department.id;
  });

  return c.json(await serializeDepartment(db, result), 201);
});

organizationRoutes.patch(
  "/departments/:departmentId",
  zValidator("param", departmentIdSchema),
  async (c) => {
    const snapshot = c.get("sessionSnapshot");

    if (!snapshot?.organization || !snapshot.member) {
      throw new HTTPException(401, { message: "Autenticação obrigatória." });
    }

    const { departmentId } = c.req.valid("param");
    const input = await parseUpdateDepartmentInput(c);
    const db = c.get("db");
    const organization = snapshot.organization;
    const member = snapshot.member;

    const [existingDepartment] = await db
      .select({ id: departments.id, status: departments.status })
      .from(departments)
      .where(
        and(
          eq(departments.id, departmentId),
          eq(departments.organizationId, organization.id),
        ),
      )
      .limit(1);

    if (!existingDepartment) {
      throw new HTTPException(404, {
        message: "Departamento não encontrado.",
      });
    }

    await ensureDepartmentCodeUnique(db, organization.id, input.code, departmentId);
    await assertManagerMember(db, organization.id, input.managerMemberId ?? null);
    const availableBranches = await ensureDepartmentBranches(
      db,
      organization.id,
      input.branchIds,
    );

    await db.transaction(async (tx: AppDbExecutor) => {
      await tx
        .update(departments)
        .set({
          name: input.name,
          code: input.code,
          managerMemberId: input.managerMemberId ?? null,
          notes: normalizeEmpty(input.notes),
          status: input.status ?? existingDepartment.status,
          updatedAt: new Date(),
        })
        .where(eq(departments.id, departmentId));

      await tx
        .delete(departmentBranchAssignments)
        .where(eq(departmentBranchAssignments.departmentId, departmentId));

      if (availableBranches.length > 0) {
        await tx.insert(departmentBranchAssignments).values(
          availableBranches.map((branch) => ({
            organizationId: organization.id,
            departmentId,
            branchId: branch.id,
          })),
        );
      }

      await recordAuditEvent(tx, {
        action: input.status === "archived" ? "department.archive" : "department.update",
        entityType: "department",
        entityId: departmentId,
        organizationId: organization.id,
        actorUserId: snapshot.user.id,
        actorMemberId: member.id,
        metadata: {
          code: input.code,
          name: input.name,
          managerMemberId: input.managerMemberId ?? null,
          status: input.status ?? existingDepartment.status,
        },
      });
    });

    return c.json(await serializeDepartment(db, departmentId));
  },
);
