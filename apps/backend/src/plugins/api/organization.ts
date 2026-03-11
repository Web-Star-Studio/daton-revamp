import { and, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { ZodError } from "zod";

import {
  roles,
  createCreateDepartmentSchema,
  createCreateEmployeeSchema,
  createCreatePositionSchema,
  createUpdateDepartmentSchema,
  createUpdateEmployeeSchema,
  createUpdatePositionSchema,
  departmentSummarySchema,
  departmentIdSchema,
  employeeIdSchema,
  employeeSummarySchema,
  organizationDirectoryMemberListSchema,
  organizationSummarySchema,
  positionIdSchema,
  positionSummarySchema,
  updateOrganizationSchema,
  type AuditAction,
  type CreateDepartmentInput,
  type CreateEmployeeInput,
  type CreatePositionInput,
  type DepartmentSummary,
  type EmployeeSummary,
  type NotificationLevel,
  type PositionSummary,
  type UpdateDepartmentInput,
  type UpdateEmployeeInput,
  type UpdateOrganizationInput,
  type UpdatePositionInput,
} from "@daton/contracts";
import {
  auditEvents,
  branchManagerAssignments,
  branches,
  employees,
  departments,
  departmentBranchAssignments,
  memberRoleAssignments,
  organizationMembers,
  organizations,
  positions,
} from "@daton/db";

import { requireRoles } from "../../lib/auth";
import { recordAuditEvent } from "../../lib/audit";
import { HTTPException } from "../../lib/errors";
import { createRouteContext, type AppRouteContext } from "../../lib/route-context";
import type { AppDbExecutor, SessionSnapshot } from "../../lib/session";
import { parseOrThrow } from "../../lib/validation";
import type { FastifyPluginAsync } from "fastify";

const normalizeEmpty = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const roleOrder = new Map(roles.map((role, index) => [role, index]));
const fullEmployeeAccessRoles = new Set([
  "owner",
  "admin",
  "hr_admin",
  "document_controller",
]);

const normalizeNumber = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value) ? String(value) : null;

const parseStoredNumber = (value: unknown) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const serializeDateValue = (value: string | Date | null | undefined) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
};

const serializeTimestampValue = (value: string | Date) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const normalizeStringArray = (values: string[]) =>
  values.map((value) => value.trim()).filter(Boolean);

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
  c: AppRouteContext,
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
  c: AppRouteContext,
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

const parseCreateEmployeeInput = async (
  c: AppRouteContext,
): Promise<CreateEmployeeInput> => {
  try {
    return createCreateEmployeeSchema().parse(await c.req.json());
  } catch (error) {
    if (error instanceof ZodError) {
      throw new HTTPException(400, {
        message: error.issues[0]?.message ?? "Dados inválidos.",
      });
    }

    throw error;
  }
};

const parseUpdateEmployeeInput = async (
  c: AppRouteContext,
): Promise<UpdateEmployeeInput> => {
  try {
    return createUpdateEmployeeSchema().parse(await c.req.json());
  } catch (error) {
    if (error instanceof ZodError) {
      throw new HTTPException(400, {
        message: error.issues[0]?.message ?? "Dados inválidos.",
      });
    }

    throw error;
  }
};

const parseCreatePositionInput = async (
  c: AppRouteContext,
): Promise<CreatePositionInput> => {
  try {
    return createCreatePositionSchema().parse(await c.req.json());
  } catch (error) {
    if (error instanceof ZodError) {
      throw new HTTPException(400, {
        message: error.issues[0]?.message ?? "Dados inválidos.",
      });
    }

    throw error;
  }
};

const parseUpdatePositionInput = async (
  c: AppRouteContext,
): Promise<UpdatePositionInput> => {
  try {
    return createUpdatePositionSchema().parse(await c.req.json());
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
  c: AppRouteContext,
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

const isUniqueConstraintConflict = (
  error: unknown,
  candidates: string[],
) => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code =
    "code" in error && typeof error.code === "string" ? error.code : null;

  if (code !== "23505") {
    return false;
  }

  const details = [
    "constraint" in error && typeof error.constraint === "string"
      ? error.constraint
      : null,
    "constraint_name" in error && typeof error.constraint_name === "string"
      ? error.constraint_name
      : null,
    "column" in error && typeof error.column === "string" ? error.column : null,
    "column_name" in error && typeof error.column_name === "string"
      ? error.column_name
      : null,
    "detail" in error && typeof error.detail === "string" ? error.detail : null,
    "message" in error && typeof error.message === "string" ? error.message : null,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());

  return candidates.some((candidate) =>
    details.some((detail) => detail.includes(candidate.toLowerCase())),
  );
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

const assertEmployee = async (
  db: AppDbExecutor,
  organizationId: string,
  employeeId: string | null,
  message: string,
) => {
  if (!employeeId) {
    return;
  }

  const [employee] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(
      and(
        eq(employees.id, employeeId),
        eq(employees.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!employee) {
    throw new HTTPException(400, { message });
  }
};

const assertDepartment = async (
  db: AppDbExecutor,
  organizationId: string,
  departmentId: string | null,
  message: string,
) => {
  if (!departmentId) {
    return;
  }

  const [department] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(
      and(
        eq(departments.id, departmentId),
        eq(departments.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!department) {
    throw new HTTPException(400, { message });
  }
};

const assertPosition = async (
  db: AppDbExecutor,
  organizationId: string,
  positionId: string | null,
  message: string,
) => {
  if (!positionId) {
    return null;
  }

  const [position] = await db
    .select({
      id: positions.id,
      departmentId: positions.departmentId,
    })
    .from(positions)
    .where(
      and(
        eq(positions.id, positionId),
        eq(positions.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!position) {
    throw new HTTPException(400, { message });
  }

  return position;
};

const assertBranch = async (
  db: AppDbExecutor,
  organizationId: string,
  branchId: string | null,
  message: string,
) => {
  if (!branchId) {
    return;
  }

  const [branch] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(
      and(
        eq(branches.id, branchId),
        eq(branches.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!branch) {
    throw new HTTPException(400, { message });
  }
};

const assertDepartmentHierarchy = async (
  db: AppDbExecutor,
  organizationId: string,
  departmentId: string | null,
  parentDepartmentId: string | null,
) => {
  if (!parentDepartmentId) {
    return;
  }

  if (departmentId && departmentId === parentDepartmentId) {
    throw new HTTPException(400, {
      message: "Um departamento não pode ser pai de si mesmo.",
    });
  }

  let cursor: string | null = parentDepartmentId;
  const visited = new Set<string>();

  while (cursor) {
    if (visited.has(cursor)) {
      throw new HTTPException(400, {
        message: "A hierarquia de departamentos contém um ciclo.",
      });
    }

    visited.add(cursor);

    const [parent] = await db
      .select({
        id: departments.id,
        parentDepartmentId: departments.parentDepartmentId,
      })
      .from(departments)
      .where(
        and(
          eq(departments.id, cursor),
          eq(departments.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (!parent) {
      throw new HTTPException(400, {
        message: "O departamento pai informado não existe nesta organização.",
      });
    }

    if (departmentId && parent.id === departmentId) {
      throw new HTTPException(400, {
        message: "A hierarquia de departamentos criaria um ciclo.",
      });
    }

    cursor = parent.parentDepartmentId;
  }
};

const assertPositionHierarchy = async (
  db: AppDbExecutor,
  organizationId: string,
  positionId: string | null,
  reportsToPositionId: string | null,
) => {
  if (!reportsToPositionId) {
    return;
  }

  if (positionId && positionId === reportsToPositionId) {
    throw new HTTPException(400, {
      message: "Um cargo não pode reportar para si mesmo.",
    });
  }

  let cursor: string | null = reportsToPositionId;
  const visited = new Set<string>();

  while (cursor) {
    if (visited.has(cursor)) {
      throw new HTTPException(400, {
        message: "A hierarquia de cargos contém um ciclo.",
      });
    }

    visited.add(cursor);

    const [parent] = await db
      .select({
        id: positions.id,
        reportsToPositionId: positions.reportsToPositionId,
      })
      .from(positions)
      .where(
        and(
          eq(positions.id, cursor),
          eq(positions.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (!parent) {
      throw new HTTPException(400, {
        message: "O cargo superior informado não existe nesta organização.",
      });
    }

    if (positionId && parent.id === positionId) {
      throw new HTTPException(400, {
        message: "A hierarquia de cargos criaria um ciclo.",
      });
    }

    cursor = parent.reportsToPositionId;
  }
};

const ensureEmployeeCodeUnique = async (
  db: AppDbExecutor,
  organizationId: string,
  employeeCode: string | null,
  employeeId?: string,
) => {
  if (!employeeCode) {
    return;
  }

  const [duplicate] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(
      and(
        eq(employees.organizationId, organizationId),
        eq(employees.employeeCode, employeeCode),
        employeeId ? ne(employees.id, employeeId) : undefined,
      ),
    )
    .limit(1);

  if (duplicate) {
    throw new HTTPException(409, {
      message: "O código do colaborador deve ser único dentro da organização.",
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

const uniqueValues = <T>(values: Array<T | null | undefined>) =>
  [...new Set(values.filter((value): value is T => value !== null && value !== undefined))];

const serializeDepartmentsBatch = async (
  db: AppDbExecutor,
  organizationId: string,
  departmentIds: string[],
): Promise<DepartmentSummary[]> => {
  if (departmentIds.length === 0) {
    return [];
  }

  const records = await db
    .select({
      id: departments.id,
      organizationId: departments.organizationId,
      name: departments.name,
      description: departments.description,
      parentDepartmentId: departments.parentDepartmentId,
      managerEmployeeId: departments.managerEmployeeId,
      managerMemberId: departments.managerMemberId,
      code: departments.code,
      status: departments.status,
      budget: departments.budget,
      costCenter: departments.costCenter,
      notes: departments.notes,
      createdAt: departments.createdAt,
      updatedAt: departments.updatedAt,
    })
    .from(departments)
    .where(
      and(
        eq(departments.organizationId, organizationId),
        inArray(departments.id, departmentIds),
      ),
    );

  const managerMemberIds = uniqueValues(records.map((record) => record.managerMemberId));
  const managerEmployeeIds = uniqueValues(records.map((record) => record.managerEmployeeId));
  const parentDepartmentIds = uniqueValues(records.map((record) => record.parentDepartmentId));

  const [legacyManagers, employeeManagers, parentDepartments, employeeCounts, subDepartments, assignments] =
    await Promise.all([
      managerMemberIds.length === 0
        ? Promise.resolve([])
        : db
            .select({
              id: organizationMembers.id,
              fullName: organizationMembers.fullName,
            })
            .from(organizationMembers)
            .where(
              and(
                eq(organizationMembers.organizationId, organizationId),
                inArray(organizationMembers.id, managerMemberIds),
              ),
            ),
      managerEmployeeIds.length === 0
        ? Promise.resolve([])
        : db
            .select({
              id: employees.id,
              fullName: employees.fullName,
            })
            .from(employees)
            .where(
              and(
                eq(employees.organizationId, organizationId),
                inArray(employees.id, managerEmployeeIds),
              ),
            ),
      parentDepartmentIds.length === 0
        ? Promise.resolve([])
        : db
            .select({
              id: departments.id,
              name: departments.name,
            })
            .from(departments)
            .where(
              and(
                eq(departments.organizationId, organizationId),
                inArray(departments.id, parentDepartmentIds),
              ),
            ),
      db
        .select({
          departmentId: employees.departmentId,
          count: sql<number>`count(${employees.id})`,
        })
        .from(employees)
        .where(
          and(
            eq(employees.organizationId, organizationId),
            inArray(employees.departmentId, departmentIds),
          ),
        )
        .groupBy(employees.departmentId),
      db
        .select({
          id: departments.id,
          name: departments.name,
          parentDepartmentId: departments.parentDepartmentId,
        })
        .from(departments)
        .where(
          and(
            eq(departments.organizationId, organizationId),
            inArray(departments.parentDepartmentId, departmentIds),
          ),
        ),
      db
        .select({
          departmentId: departmentBranchAssignments.departmentId,
          branchId: departmentBranchAssignments.branchId,
          branchName: branches.name,
        })
        .from(departmentBranchAssignments)
        .innerJoin(branches, eq(departmentBranchAssignments.branchId, branches.id))
        .where(
          and(
            eq(departmentBranchAssignments.organizationId, organizationId),
            eq(branches.organizationId, organizationId),
            inArray(departmentBranchAssignments.departmentId, departmentIds),
          ),
        ),
    ]);

  const managerMemberMap = new Map(
    legacyManagers.map((manager) => [manager.id, { fullName: manager.fullName }]),
  );
  const managerEmployeeMap = new Map(employeeManagers.map((manager) => [manager.id, manager]));
  const parentDepartmentMap = new Map(parentDepartments.map((department) => [department.id, department]));
  const employeeCountMap = new Map(
    employeeCounts.map((entry) => [entry.departmentId, Number(entry.count ?? 0)]),
  );
  const subDepartmentMap = new Map<string, Array<{ id: string; name: string }>>();

  for (const subDepartment of subDepartments) {
    if (!subDepartment.parentDepartmentId) {
      continue;
    }

    const siblings = subDepartmentMap.get(subDepartment.parentDepartmentId) ?? [];
    siblings.push({
      id: subDepartment.id,
      name: subDepartment.name,
    });
    subDepartmentMap.set(subDepartment.parentDepartmentId, siblings);
  }

  const assignmentMap = new Map<string, Array<{ branchId: string; branchName: string }>>();

  for (const assignment of assignments) {
    const departmentAssignments = assignmentMap.get(assignment.departmentId) ?? [];
    departmentAssignments.push({
      branchId: assignment.branchId,
      branchName: assignment.branchName,
    });
    assignmentMap.set(assignment.departmentId, departmentAssignments);
  }

  const recordMap = new Map(records.map((record) => [record.id, record]));

  return departmentIds.map((departmentId) => {
    const record = recordMap.get(departmentId);

    if (!record) {
      throw new HTTPException(404, {
        message: "Departamento não encontrado.",
      });
    }

    const legacyManager = record.managerMemberId
      ? managerMemberMap.get(record.managerMemberId) ?? null
      : null;
    const employeeManager = record.managerEmployeeId
      ? managerEmployeeMap.get(record.managerEmployeeId) ?? null
      : null;
    const parentDepartment = record.parentDepartmentId
      ? parentDepartmentMap.get(record.parentDepartmentId) ?? null
      : null;
    const sortedAssignments = [
      ...(assignmentMap.get(record.id) ?? []),
    ].sort((left, right) => left.branchName.localeCompare(right.branchName, "pt-BR"));
    const sortedSubDepartments = [
      ...(subDepartmentMap.get(record.id) ?? []),
    ].sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));

    return departmentSummarySchema.parse({
      id: record.id,
      organizationId: record.organizationId,
      name: record.name,
      description: record.description ?? null,
      parentDepartmentId: record.parentDepartmentId ?? null,
      managerEmployeeId: record.managerEmployeeId ?? null,
      budget: parseStoredNumber(record.budget),
      costCenter: record.costCenter ?? null,
      code: record.code,
      status: record.status,
      managerMemberId: record.managerMemberId ?? null,
      managerName: employeeManager?.fullName ?? legacyManager?.fullName ?? null,
      notes: record.notes ?? null,
      branchIds: sortedAssignments.map((assignment) => assignment.branchId),
      branchNames: sortedAssignments.map((assignment) => assignment.branchName),
      createdAt: serializeTimestampValue(record.createdAt),
      updatedAt: serializeTimestampValue(record.updatedAt),
      manager: employeeManager,
      parentDepartment,
      subDepartments: sortedSubDepartments,
      employeeCount: employeeCountMap.get(record.id) ?? 0,
    });
  });
};

const serializeDepartment = async (
  db: AppDbExecutor,
  organizationId: string,
  departmentId: string,
) => {
  const [record] = await serializeDepartmentsBatch(db, organizationId, [departmentId]);
  return record;
};

const serializePositionsBatch = async (
  db: AppDbExecutor,
  organizationId: string,
  positionIds: string[],
): Promise<PositionSummary[]> => {
  if (positionIds.length === 0) {
    return [];
  }

  const records = await db
    .select({
      id: positions.id,
      organizationId: positions.organizationId,
      departmentId: positions.departmentId,
      title: positions.title,
      description: positions.description,
      level: positions.level,
      salaryRangeMin: positions.salaryRangeMin,
      salaryRangeMax: positions.salaryRangeMax,
      requirements: positions.requirements,
      responsibilities: positions.responsibilities,
      reportsToPositionId: positions.reportsToPositionId,
      requiredEducationLevel: positions.requiredEducationLevel,
      requiredExperienceYears: positions.requiredExperienceYears,
      createdAt: positions.createdAt,
      updatedAt: positions.updatedAt,
    })
    .from(positions)
    .where(
      and(
        eq(positions.organizationId, organizationId),
        inArray(positions.id, positionIds),
      ),
    );

  const departmentIds = uniqueValues(records.map((record) => record.departmentId));
  const reportsToPositionIds = uniqueValues(records.map((record) => record.reportsToPositionId));

  const [relatedDepartments, reportsToPositions] = await Promise.all([
    departmentIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            id: departments.id,
            name: departments.name,
          })
          .from(departments)
          .where(
            and(
              eq(departments.organizationId, organizationId),
              inArray(departments.id, departmentIds),
            ),
          ),
    reportsToPositionIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            id: positions.id,
            title: positions.title,
          })
          .from(positions)
          .where(
            and(
              eq(positions.organizationId, organizationId),
              inArray(positions.id, reportsToPositionIds),
            ),
          ),
  ]);

  const departmentMap = new Map(relatedDepartments.map((department) => [department.id, department]));
  const reportsToPositionMap = new Map(
    reportsToPositions.map((position) => [position.id, position]),
  );
  const recordMap = new Map(records.map((record) => [record.id, record]));

  return positionIds.map((positionId) => {
    const record = recordMap.get(positionId);

    if (!record) {
      throw new HTTPException(404, {
        message: "Cargo não encontrado.",
      });
    }

    return positionSummarySchema.parse({
      id: record.id,
      organizationId: record.organizationId,
      departmentId: record.departmentId ?? null,
      title: record.title,
      description: record.description ?? null,
      level: record.level ?? null,
      salaryRangeMin: parseStoredNumber(record.salaryRangeMin),
      salaryRangeMax: parseStoredNumber(record.salaryRangeMax),
      requirements: normalizeStringArray((record.requirements as string[] | null) ?? []),
      responsibilities: normalizeStringArray(
        (record.responsibilities as string[] | null) ?? [],
      ),
      reportsToPositionId: record.reportsToPositionId ?? null,
      requiredEducationLevel: record.requiredEducationLevel ?? null,
      requiredExperienceYears: record.requiredExperienceYears ?? null,
      createdAt: serializeTimestampValue(record.createdAt),
      updatedAt: serializeTimestampValue(record.updatedAt),
      department: record.departmentId ? departmentMap.get(record.departmentId) ?? null : null,
      reportsToPosition: record.reportsToPositionId
        ? reportsToPositionMap.get(record.reportsToPositionId) ?? null
        : null,
    });
  });
};

const serializePosition = async (
  db: AppDbExecutor,
  organizationId: string,
  positionId: string,
) => {
  const [record] = await serializePositionsBatch(db, organizationId, [positionId]);
  return record;
};

const serializeEmployeesBatch = async (
  db: AppDbExecutor,
  organizationId: string,
  employeeIds: string[],
): Promise<EmployeeSummary[]> => {
  if (employeeIds.length === 0) {
    return [];
  }

  const records = await db
    .select({
      id: employees.id,
      organizationId: employees.organizationId,
      employeeCode: employees.employeeCode,
      cpf: employees.cpf,
      fullName: employees.fullName,
      email: employees.email,
      phone: employees.phone,
      departmentId: employees.departmentId,
      positionId: employees.positionId,
      hireDate: employees.hireDate,
      birthDate: employees.birthDate,
      gender: employees.gender,
      ethnicity: employees.ethnicity,
      educationLevel: employees.educationLevel,
      salary: employees.salary,
      employmentType: employees.employmentType,
      status: employees.status,
      managerId: employees.managerId,
      location: employees.location,
      branchId: employees.branchId,
      terminationDate: employees.terminationDate,
      notes: employees.notes,
      createdAt: employees.createdAt,
      updatedAt: employees.updatedAt,
    })
    .from(employees)
    .where(
      and(
        eq(employees.organizationId, organizationId),
        inArray(employees.id, employeeIds),
      ),
    );

  const departmentIds = uniqueValues(records.map((record) => record.departmentId));
  const positionIds = uniqueValues(records.map((record) => record.positionId));
  const managerIds = uniqueValues(records.map((record) => record.managerId));
  const branchIds = uniqueValues(records.map((record) => record.branchId));

  const [relatedDepartments, relatedPositions, managers, relatedBranches] = await Promise.all([
    departmentIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            id: departments.id,
            name: departments.name,
          })
          .from(departments)
          .where(
            and(
              eq(departments.organizationId, organizationId),
              inArray(departments.id, departmentIds),
            ),
          ),
    positionIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            id: positions.id,
            title: positions.title,
          })
          .from(positions)
          .where(
            and(
              eq(positions.organizationId, organizationId),
              inArray(positions.id, positionIds),
            ),
          ),
    managerIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            id: employees.id,
            fullName: employees.fullName,
          })
          .from(employees)
          .where(
            and(
              eq(employees.organizationId, organizationId),
              inArray(employees.id, managerIds),
            ),
          ),
    branchIds.length === 0
      ? Promise.resolve([])
      : db
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
          ),
  ]);

  const departmentMap = new Map(relatedDepartments.map((department) => [department.id, department]));
  const positionMap = new Map(relatedPositions.map((position) => [position.id, position]));
  const managerMap = new Map(managers.map((manager) => [manager.id, manager]));
  const branchMap = new Map(relatedBranches.map((branch) => [branch.id, branch]));
  const recordMap = new Map(records.map((record) => [record.id, record]));

  return employeeIds.map((employeeId) => {
    const record = recordMap.get(employeeId);

    if (!record) {
      throw new HTTPException(404, {
        message: "Colaborador não encontrado.",
      });
    }

    const department = record.departmentId
      ? departmentMap.get(record.departmentId) ?? null
      : null;
    const position = record.positionId ? positionMap.get(record.positionId) ?? null : null;
    const manager = record.managerId ? managerMap.get(record.managerId) ?? null : null;
    const branch = record.branchId ? branchMap.get(record.branchId) ?? null : null;

    return employeeSummarySchema.parse({
      id: record.id,
      organizationId: record.organizationId,
      employeeCode: record.employeeCode ?? null,
      cpf: record.cpf ?? null,
      fullName: record.fullName,
      email: record.email ?? null,
      phone: record.phone ?? null,
      departmentId: record.departmentId ?? null,
      departmentName: department?.name ?? null,
      positionId: record.positionId ?? null,
      positionName: position?.title ?? null,
      hireDate: serializeDateValue(record.hireDate),
      birthDate: serializeDateValue(record.birthDate),
      gender: record.gender ?? null,
      ethnicity: record.ethnicity ?? null,
      educationLevel: record.educationLevel ?? null,
      salary: parseStoredNumber(record.salary),
      employmentType: record.employmentType,
      status: record.status,
      managerId: record.managerId ?? null,
      location: record.location ?? null,
      branchId: record.branchId ?? null,
      terminationDate: serializeDateValue(record.terminationDate),
      notes: record.notes ?? null,
      createdAt: serializeTimestampValue(record.createdAt),
      updatedAt: serializeTimestampValue(record.updatedAt),
      branch,
      department,
      position,
      manager,
    });
  });
};

const serializeEmployee = async (
  db: AppDbExecutor,
  organizationId: string,
  employeeId: string,
) => {
  const [record] = await serializeEmployeesBatch(db, organizationId, [employeeId]);
  return record;
};

const listOrganizationMembers = async (
  db: AppDbExecutor,
  organizationId: string,
) => {
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
        .where(eq(organizationMembers.organizationId, organizationId)),
      db
        .select({
          id: branches.id,
        })
        .from(branches)
        .where(
          and(
            eq(branches.organizationId, organizationId),
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
            eq(memberRoleAssignments.organizationId, organizationId),
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
            eq(branchManagerAssignments.organizationId, organizationId),
            eq(branches.organizationId, organizationId),
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

  return [...records]
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
    .sort((left, right) => collator.compare(left.fullName, right.fullName));
};

const resolveEmployeeReadScope = (snapshot: SessionSnapshot) => {
  if (snapshot.effectiveRoles.some((role) => fullEmployeeAccessRoles.has(role))) {
    return { branchIds: null as string[] | null };
  }

  if (snapshot.effectiveRoles.includes("branch_manager")) {
    return { branchIds: snapshot.branchScope };
  }

  throw new HTTPException(403, {
    message: "Você não tem acesso a estes colaboradores.",
  });
};

const assertCanReadEmployee = (
  snapshot: SessionSnapshot,
  branchId: string | null,
) => {
  const scope = resolveEmployeeReadScope(snapshot);

  if (scope.branchIds === null) {
    return;
  }

  if (branchId && scope.branchIds.includes(branchId)) {
    return;
  }

  throw new HTTPException(403, {
    message: "Você não tem acesso a este colaborador.",
  });
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
      description: "A organização foi inicializada e está pronta para concluir o onboarding.",
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
    "branch.unassign_manager": {
      actionLabel: "Abrir unidade",
      description: "A gestão responsável pela unidade foi removida.",
      href: `/app/branches/${record.entityId}`,
      level: "warning",
      title: "Gestor de unidade removido",
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
      href: null,
      level: "warning",
      title: "Perfil atribuído",
    },
    "role.revoke": {
      actionLabel: null,
      description: "Um perfil de acesso foi revogado.",
      href: null,
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

const organizationPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.patch(
    "/organization",
    {
      preHandler: requireRoles("owner", "admin"),
    },
    async (request, reply) => {
      const c = createRouteContext(request, reply);
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

  fastify.get("/notifications", async (request, reply) => {
    const c = createRouteContext(request, reply);
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

      return c.json(
        organizationDirectoryMemberListSchema.parse(
          await listOrganizationMembers(c.get("db"), snapshot.organization.id),
        ),
      );
    },
  );

  fastify.get(
    "/departments",
    {
      preHandler: requireRoles("owner", "admin", "hr_admin"),
    },
    async (request, reply) => {
      const c = createRouteContext(request, reply);
      const snapshot = c.get("sessionSnapshot");

      if (!snapshot?.organization) {
        throw new HTTPException(401, { message: "Autenticação obrigatória." });
      }

      const organizationId = snapshot.organization.id;
      const db = c.get("db");
      const records = await db
        .select({ id: departments.id })
        .from(departments)
        .where(eq(departments.organizationId, organizationId));

      const serialized = await serializeDepartmentsBatch(
        db,
        organizationId,
        records.map((record) => record.id),
      );

      return c.json(
        serialized.sort((left, right) => left.name.localeCompare(right.name, "pt-BR")),
      );
    },
  );

  fastify.post(
    "/departments",
    {
      preHandler: requireRoles("owner", "admin", "hr_admin"),
    },
    async (request, reply) => {
      const c = createRouteContext(request, reply);
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
      await assertEmployee(
        db,
        organization.id,
        input.managerEmployeeId ?? null,
        "O gestor do departamento precisa ser um colaborador válido da organização.",
      );
      await assertDepartmentHierarchy(
        db,
        organization.id,
        null,
        input.parentDepartmentId ?? null,
      );
      const availableBranches = await ensureDepartmentBranches(db, organization.id, input.branchIds);

      const result = await db.transaction(async (tx: AppDbExecutor) => {
        let department;

        try {
          [department] = await tx
            .insert(departments)
            .values({
              organizationId: organization.id,
              name: input.name,
              code: input.code,
              description: normalizeEmpty(input.description),
              parentDepartmentId: input.parentDepartmentId ?? null,
              managerEmployeeId: input.managerEmployeeId ?? null,
              managerMemberId: input.managerMemberId ?? null,
              budget: normalizeNumber(input.budget),
              costCenter: normalizeEmpty(input.costCenter),
              notes: normalizeEmpty(input.notes),
            })
            .returning({ id: departments.id });
        } catch (error) {
          if (
            isUniqueConstraintConflict(error, [
              "departments_org_code_idx",
              "organization_id, code",
            ])
          ) {
            throw new HTTPException(409, {
              message: "O código do departamento deve ser único dentro da organização.",
            });
          }

          throw error;
        }

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
            parentDepartmentId: input.parentDepartmentId ?? null,
            managerEmployeeId: input.managerEmployeeId ?? null,
            managerMemberId: input.managerMemberId ?? null,
          },
        });

        return department.id;
      });

      return c.json(await serializeDepartment(db, organization.id, result), 201);
    },
  );

  fastify.patch(
    "/departments/:departmentId",
    {
      preHandler: requireRoles("owner", "admin", "hr_admin"),
    },
    async (request, reply) => {
      const c = createRouteContext(request, reply, {
        param: parseOrThrow(departmentIdSchema, request.params),
      });
      const snapshot = c.get("sessionSnapshot");

      if (!snapshot?.organization || !snapshot.member) {
        throw new HTTPException(401, { message: "Autenticação obrigatória." });
      }

      const { departmentId } = c.req.valid("param") as { departmentId: string };
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
      await assertEmployee(
        db,
        organization.id,
        input.managerEmployeeId ?? null,
        "O gestor do departamento precisa ser um colaborador válido da organização.",
      );
      await assertDepartmentHierarchy(
        db,
        organization.id,
        departmentId,
        input.parentDepartmentId ?? null,
      );
      const availableBranches = await ensureDepartmentBranches(db, organization.id, input.branchIds);

      await db.transaction(async (tx: AppDbExecutor) => {
        try {
          await tx
            .update(departments)
            .set({
              name: input.name,
              code: input.code,
              description: normalizeEmpty(input.description),
              parentDepartmentId: input.parentDepartmentId ?? null,
              managerEmployeeId: input.managerEmployeeId ?? null,
              managerMemberId: input.managerMemberId ?? null,
              budget: normalizeNumber(input.budget),
              costCenter: normalizeEmpty(input.costCenter),
              notes: normalizeEmpty(input.notes),
              status: input.status ?? existingDepartment.status,
              updatedAt: new Date(),
            })
            .where(eq(departments.id, departmentId));
        } catch (error) {
          if (
            isUniqueConstraintConflict(error, [
              "departments_org_code_idx",
              "organization_id, code",
            ])
          ) {
            throw new HTTPException(409, {
              message: "O código do departamento deve ser único dentro da organização.",
            });
          }

          throw error;
        }

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
            parentDepartmentId: input.parentDepartmentId ?? null,
            managerEmployeeId: input.managerEmployeeId ?? null,
            managerMemberId: input.managerMemberId ?? null,
            status: input.status ?? existingDepartment.status,
          },
        });
      });

      return c.json(await serializeDepartment(db, organization.id, departmentId));
    },
  );

  fastify.get("/employees", async (request, reply) => {
    const c = createRouteContext(request, reply);
    const snapshot = c.get("sessionSnapshot");

    if (!snapshot?.organization) {
      throw new HTTPException(401, { message: "Autenticação obrigatória." });
    }

    const organizationId = snapshot.organization.id;
    const scope = resolveEmployeeReadScope(snapshot);
    if (scope.branchIds !== null && scope.branchIds.length === 0) {
      return c.json([]);
    }

    const db = c.get("db");
    const records = await db
      .select({ id: employees.id })
      .from(employees)
      .where(
        and(
          eq(employees.organizationId, organizationId),
          scope.branchIds === null ? undefined : inArray(employees.branchId, scope.branchIds),
        ),
      );

    const serialized = await serializeEmployeesBatch(
      db,
      organizationId,
      records.map((record) => record.id),
    );

    return c.json(
      serialized.sort((left, right) => left.fullName.localeCompare(right.fullName, "pt-BR")),
    );
  });

  fastify.get("/employees/:employeeId", async (request, reply) => {
    const c = createRouteContext(request, reply, {
      param: parseOrThrow(employeeIdSchema, request.params),
    });
    const snapshot = c.get("sessionSnapshot");

    if (!snapshot?.organization) {
      throw new HTTPException(401, { message: "Autenticação obrigatória." });
    }

    const { employeeId } = c.req.valid("param") as { employeeId: string };
    const db = c.get("db");
    const [employee] = await db
      .select({ id: employees.id, branchId: employees.branchId })
      .from(employees)
      .where(
        and(
          eq(employees.id, employeeId),
          eq(employees.organizationId, snapshot.organization.id),
        ),
      )
      .limit(1);

    if (!employee) {
      throw new HTTPException(404, { message: "Colaborador não encontrado." });
    }

    assertCanReadEmployee(snapshot, employee.branchId);

    return c.json(await serializeEmployee(db, snapshot.organization.id, employeeId));
  });

  fastify.post(
    "/employees",
    {
      preHandler: requireRoles("owner", "admin", "hr_admin"),
    },
    async (request, reply) => {
      const c = createRouteContext(request, reply);
      const snapshot = c.get("sessionSnapshot");

      if (!snapshot?.organization) {
        throw new HTTPException(401, { message: "Autenticação obrigatória." });
      }

      const input = await parseCreateEmployeeInput(c);
      const db = c.get("db");
      const organizationId = snapshot.organization.id;

      await ensureEmployeeCodeUnique(db, organizationId, normalizeEmpty(input.employeeCode));
      await assertBranch(
        db,
        organizationId,
        input.branchId ?? null,
        "A unidade vinculada não existe nesta organização.",
      );
      await assertEmployee(
        db,
        organizationId,
        input.managerId ?? null,
        "O gestor informado não existe nesta organização.",
      );
      await assertDepartment(
        db,
        organizationId,
        input.departmentId ?? null,
        "O departamento informado não existe nesta organização.",
      );
      const position = await assertPosition(
        db,
        organizationId,
        input.positionId ?? null,
        "O cargo informado não existe nesta organização.",
      );

      if (
        input.departmentId &&
        position?.departmentId &&
        position.departmentId !== input.departmentId
      ) {
        throw new HTTPException(400, {
          message: "O cargo informado pertence a outro departamento.",
        });
      }

      const resolvedDepartmentId = input.departmentId ?? position?.departmentId ?? null;

      let employee;

      try {
        [employee] = await db
          .insert(employees)
          .values({
            organizationId,
            employeeCode: normalizeEmpty(input.employeeCode),
            cpf: normalizeEmpty(input.cpf),
            fullName: input.fullName.trim(),
            email: normalizeEmpty(input.email),
            phone: normalizeEmpty(input.phone),
            departmentId: resolvedDepartmentId,
            positionId: input.positionId ?? null,
            hireDate: input.hireDate,
            birthDate: normalizeEmpty(input.birthDate),
            gender: normalizeEmpty(input.gender),
            ethnicity: normalizeEmpty(input.ethnicity),
            educationLevel: normalizeEmpty(input.educationLevel),
            salary: normalizeNumber(input.salary),
            employmentType: input.employmentType.trim(),
            status: input.status.trim(),
            managerId: input.managerId ?? null,
            location: normalizeEmpty(input.location),
            branchId: input.branchId ?? null,
            terminationDate: normalizeEmpty(input.terminationDate),
            notes: normalizeEmpty(input.notes),
          })
          .returning({ id: employees.id });
      } catch (error) {
        if (
          isUniqueConstraintConflict(error, [
            "employees_org_employee_code_idx",
            "organization_id, employee_code",
          ])
        ) {
          throw new HTTPException(409, {
            message: "O código do colaborador deve ser único dentro da organização.",
          });
        }

        throw error;
      }

      if (!employee) {
        throw new HTTPException(500, {
          message: "Não foi possível criar o colaborador.",
        });
      }

      return c.json(await serializeEmployee(db, organizationId, employee.id), 201);
    },
  );

  fastify.patch(
    "/employees/:employeeId",
    {
      preHandler: requireRoles("owner", "admin", "hr_admin"),
    },
    async (request, reply) => {
      const c = createRouteContext(request, reply, {
        param: parseOrThrow(employeeIdSchema, request.params),
      });
      const snapshot = c.get("sessionSnapshot");

      if (!snapshot?.organization) {
        throw new HTTPException(401, { message: "Autenticação obrigatória." });
      }

      const { employeeId } = c.req.valid("param") as { employeeId: string };
      const input = await parseUpdateEmployeeInput(c);
      const db = c.get("db");
      const organizationId = snapshot.organization.id;

      const [existingEmployee] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(
          and(
            eq(employees.id, employeeId),
            eq(employees.organizationId, organizationId),
          ),
        )
        .limit(1);

      if (!existingEmployee) {
        throw new HTTPException(404, { message: "Colaborador não encontrado." });
      }

      if (input.managerId && input.managerId === employeeId) {
        throw new HTTPException(400, {
          message: "Um colaborador não pode ser o próprio gestor.",
        });
      }

      await ensureEmployeeCodeUnique(
        db,
        organizationId,
        normalizeEmpty(input.employeeCode),
        employeeId,
      );
      await assertBranch(
        db,
        organizationId,
        input.branchId ?? null,
        "A unidade vinculada não existe nesta organização.",
      );
      await assertEmployee(
        db,
        organizationId,
        input.managerId ?? null,
        "O gestor informado não existe nesta organização.",
      );
      await assertDepartment(
        db,
        organizationId,
        input.departmentId ?? null,
        "O departamento informado não existe nesta organização.",
      );
      const position = await assertPosition(
        db,
        organizationId,
        input.positionId ?? null,
        "O cargo informado não existe nesta organização.",
      );

      if (
        input.departmentId &&
        position?.departmentId &&
        position.departmentId !== input.departmentId
      ) {
        throw new HTTPException(400, {
          message: "O cargo informado pertence a outro departamento.",
        });
      }

      const resolvedDepartmentId = input.departmentId ?? position?.departmentId ?? null;

      try {
        await db
          .update(employees)
          .set({
            employeeCode: normalizeEmpty(input.employeeCode),
            cpf: normalizeEmpty(input.cpf),
            fullName: input.fullName.trim(),
            email: normalizeEmpty(input.email),
            phone: normalizeEmpty(input.phone),
            departmentId: resolvedDepartmentId,
            positionId: input.positionId ?? null,
            hireDate: input.hireDate,
            birthDate: normalizeEmpty(input.birthDate),
            gender: normalizeEmpty(input.gender),
            ethnicity: normalizeEmpty(input.ethnicity),
            educationLevel: normalizeEmpty(input.educationLevel),
            salary: normalizeNumber(input.salary),
            employmentType: input.employmentType.trim(),
            status: input.status.trim(),
            managerId: input.managerId ?? null,
            location: normalizeEmpty(input.location),
            branchId: input.branchId ?? null,
            terminationDate: normalizeEmpty(input.terminationDate),
            notes: normalizeEmpty(input.notes),
            updatedAt: new Date(),
          })
          .where(eq(employees.id, employeeId));
      } catch (error) {
        if (
          isUniqueConstraintConflict(error, [
            "employees_org_employee_code_idx",
            "organization_id, employee_code",
          ])
        ) {
          throw new HTTPException(409, {
            message: "O código do colaborador deve ser único dentro da organização.",
          });
        }

        throw error;
      }

      return c.json(await serializeEmployee(db, organizationId, employeeId));
    },
  );

  fastify.get(
    "/positions",
    {
      preHandler: requireRoles("owner", "admin", "hr_admin"),
    },
    async (request, reply) => {
      const c = createRouteContext(request, reply);
      const snapshot = c.get("sessionSnapshot");

      if (!snapshot?.organization) {
        throw new HTTPException(401, { message: "Autenticação obrigatória." });
      }

      const organizationId = snapshot.organization.id;
      const db = c.get("db");
      const records = await db
        .select({ id: positions.id })
        .from(positions)
        .where(eq(positions.organizationId, organizationId));

      const serialized = await serializePositionsBatch(
        db,
        organizationId,
        records.map((record) => record.id),
      );

      return c.json(
        serialized.sort((left, right) => left.title.localeCompare(right.title, "pt-BR")),
      );
    },
  );

  fastify.get(
    "/positions/:positionId",
    {
      preHandler: requireRoles("owner", "admin", "hr_admin"),
    },
    async (request, reply) => {
      const c = createRouteContext(request, reply, {
        param: parseOrThrow(positionIdSchema, request.params),
      });
      const snapshot = c.get("sessionSnapshot");

      if (!snapshot?.organization) {
        throw new HTTPException(401, { message: "Autenticação obrigatória." });
      }

      const { positionId } = c.req.valid("param") as { positionId: string };
      const db = c.get("db");
      const [position] = await db
        .select({ id: positions.id })
        .from(positions)
        .where(
          and(
            eq(positions.id, positionId),
            eq(positions.organizationId, snapshot.organization.id),
          ),
        )
        .limit(1);

      if (!position) {
        throw new HTTPException(404, { message: "Cargo não encontrado." });
      }

      return c.json(
        await serializePosition(db, snapshot.organization.id, positionId),
      );
    },
  );

  fastify.post(
    "/positions",
    {
      preHandler: requireRoles("owner", "admin", "hr_admin"),
    },
    async (request, reply) => {
      const c = createRouteContext(request, reply);
      const snapshot = c.get("sessionSnapshot");

      if (!snapshot?.organization) {
        throw new HTTPException(401, { message: "Autenticação obrigatória." });
      }

      const input = await parseCreatePositionInput(c);
      const db = c.get("db");
      const organizationId = snapshot.organization.id;

      await assertDepartment(
        db,
        organizationId,
        input.departmentId ?? null,
        "O departamento informado não existe nesta organização.",
      );
      await assertPositionHierarchy(
        db,
        organizationId,
        null,
        input.reportsToPositionId ?? null,
      );

      const [position] = await db
        .insert(positions)
        .values({
          organizationId,
          departmentId: input.departmentId ?? null,
          title: input.title.trim(),
          description: normalizeEmpty(input.description),
          level: normalizeEmpty(input.level),
          salaryRangeMin: normalizeNumber(input.salaryRangeMin),
          salaryRangeMax: normalizeNumber(input.salaryRangeMax),
          requirements: normalizeStringArray(input.requirements),
          responsibilities: normalizeStringArray(input.responsibilities),
          reportsToPositionId: input.reportsToPositionId ?? null,
          requiredEducationLevel: normalizeEmpty(input.requiredEducationLevel),
          requiredExperienceYears:
            typeof input.requiredExperienceYears === "number"
              ? input.requiredExperienceYears
              : null,
        })
        .returning({ id: positions.id });

      if (!position) {
        throw new HTTPException(500, {
          message: "Não foi possível criar o cargo.",
        });
      }

      return c.json(await serializePosition(db, organizationId, position.id), 201);
    },
  );

  fastify.patch(
    "/positions/:positionId",
    {
      preHandler: requireRoles("owner", "admin", "hr_admin"),
    },
    async (request, reply) => {
      const c = createRouteContext(request, reply, {
        param: parseOrThrow(positionIdSchema, request.params),
      });
      const snapshot = c.get("sessionSnapshot");

      if (!snapshot?.organization) {
        throw new HTTPException(401, { message: "Autenticação obrigatória." });
      }

      const { positionId } = c.req.valid("param") as { positionId: string };
      const input = await parseUpdatePositionInput(c);
      const db = c.get("db");
      const organizationId = snapshot.organization.id;

      const [existingPosition] = await db
        .select({ id: positions.id })
        .from(positions)
        .where(
          and(
            eq(positions.id, positionId),
            eq(positions.organizationId, organizationId),
          ),
        )
        .limit(1);

      if (!existingPosition) {
        throw new HTTPException(404, { message: "Cargo não encontrado." });
      }

      await assertDepartment(
        db,
        organizationId,
        input.departmentId ?? null,
        "O departamento informado não existe nesta organização.",
      );
      await assertPositionHierarchy(
        db,
        organizationId,
        positionId,
        input.reportsToPositionId ?? null,
      );

      await db
        .update(positions)
        .set({
          departmentId: input.departmentId ?? null,
          title: input.title.trim(),
          description: normalizeEmpty(input.description),
          level: normalizeEmpty(input.level),
          salaryRangeMin: normalizeNumber(input.salaryRangeMin),
          salaryRangeMax: normalizeNumber(input.salaryRangeMax),
          requirements: normalizeStringArray(input.requirements),
          responsibilities: normalizeStringArray(input.responsibilities),
          reportsToPositionId: input.reportsToPositionId ?? null,
          requiredEducationLevel: normalizeEmpty(input.requiredEducationLevel),
          requiredExperienceYears:
            typeof input.requiredExperienceYears === "number"
              ? input.requiredExperienceYears
              : null,
          updatedAt: new Date(),
        })
        .where(eq(positions.id, positionId));

      return c.json(await serializePosition(db, organizationId, positionId));
    },
  );
};

export default organizationPlugin;
