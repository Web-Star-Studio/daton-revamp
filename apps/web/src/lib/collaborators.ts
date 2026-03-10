import type { ServerBranch } from "./server-api";

export type CollaboratorStatus = "Ativo" | "Desligado" | "Em admissão";

export type CollaboratorRecord = {
  additionalLocation: string;
  birthDate: string;
  branchId: string;
  branchName: string;
  cpf: string;
  department: string;
  educationLevel: string;
  email: string;
  employmentType: string;
  fullName: string;
  gender: string;
  hireDate: string;
  id: string;
  notes: string;
  phone: string;
  role: string;
  status: CollaboratorStatus;
  terminationDate: string;
};

export type CollaboratorRoleRecord = {
  department: string;
  description: string;
  educationRequirement: string;
  employmentType: string;
  id: string;
  requirements: string;
  responsibilities: string;
  title: string;
};

export const educationLevels = [
  "Ensino Fundamental",
  "Ensino Médio",
  "Ensino Técnico",
  "Ensino Superior Completo",
  "Pós-graduação",
  "Mestrado",
  "Doutorado",
] as const;

export const genderOptions = [
  "Feminino",
  "Masculino",
  "Não binário",
  "Prefiro não informar",
] as const;

export const employmentTypes = [
  "CLT",
  "PJ",
  "Temporário",
  "Estágio",
  "Aprendiz",
] as const;

export const collaboratorStatuses = [
  "Ativo",
  "Em admissão",
  "Desligado",
] as const;

export const exportColumns: Array<{
  key: keyof CollaboratorRecord;
  label: string;
}> = [
  { key: "cpf", label: "CPF" },
  { key: "fullName", label: "Nome Completo" },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Telefone" },
  { key: "department", label: "Departamento" },
  { key: "role", label: "Cargo" },
  { key: "hireDate", label: "Data de Contratação" },
  { key: "terminationDate", label: "Data de Demissão" },
  { key: "birthDate", label: "Data de Nascimento" },
  { key: "educationLevel", label: "Escolaridade" },
  { key: "gender", label: "Gênero" },
  { key: "employmentType", label: "Tipo de Contrato" },
  { key: "status", label: "Status" },
  { key: "branchName", label: "Filial" },
  { key: "additionalLocation", label: "Localização Adicional" },
  { key: "notes", label: "Observações" },
];

export const roleExportColumns: Array<{
  key: keyof CollaboratorRoleRecord;
  label: string;
}> = [
  { key: "title", label: "Cargo" },
  { key: "department", label: "Departamento" },
  { key: "educationRequirement", label: "Escolaridade Exigida" },
  { key: "employmentType", label: "Tipo de Contrato" },
  { key: "requirements", label: "Requisitos" },
  { key: "responsibilities", label: "Responsabilidades" },
  { key: "description", label: "Descrição" },
];

const COLLABORATORS_STORAGE_KEY = "daton:collaborators";
const COLLABORATOR_ROLES_STORAGE_KEY = "daton:collaborator-roles";

export function createInitialCollaborators(
  branches: ServerBranch[],
): CollaboratorRecord[] {
  return [
    {
      id: "seed-ana-ribeiro",
      cpf: "298.145.870-14",
      fullName: "Ana Paula Ribeiro",
      email: "ana.ribeiro@daton.local",
      phone: "(11) 99876-1024",
      department: "Operações",
      role: "Analista de Processos",
      hireDate: "2024-04-01",
      terminationDate: "",
      birthDate: "1992-06-18",
      educationLevel: "Ensino Superior Completo",
      gender: "Feminino",
      employmentType: "CLT",
      status: "Ativo",
      branchId: branches[0]?.id ?? "",
      branchName: branches[0]?.name ?? "Unidade principal",
      additionalLocation: "Sala 203, 2º andar",
      notes:
        "Responsável pelo onboarding documental e apoio às rotinas sociais.",
    },
    {
      id: "seed-marcos-costa",
      cpf: "417.532.980-33",
      fullName: "Marcos Costa Lima",
      email: "marcos.costa@daton.local",
      phone: "(21) 98741-2201",
      department: "Recursos Humanos",
      role: "Coordenador de RH",
      hireDate: "2023-09-14",
      terminationDate: "",
      birthDate: "1988-11-02",
      educationLevel: "Pós-graduação",
      gender: "Masculino",
      employmentType: "CLT",
      status: "Ativo",
      branchId: branches[1]?.id ?? branches[0]?.id ?? "",
      branchName: branches[1]?.name ?? branches[0]?.name ?? "Unidade principal",
      additionalLocation: "Andar administrativo",
      notes: "Ponto focal para admissões, contratos e movimentações internas.",
    },
  ];
}

export function readStoredCollaborators() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(COLLABORATORS_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed
      .map((item) => sanitizeCollaboratorRecord(item))
      .filter((item): item is CollaboratorRecord => item !== null);
  } catch {
    return null;
  }
}

export function createInitialRoles(
  collaborators: CollaboratorRecord[],
): CollaboratorRoleRecord[] {
  const rolesByKey = new Map<string, CollaboratorRoleRecord>();

  collaborators.forEach((collaborator) => {
    if (!collaborator.role.trim()) {
      return;
    }

    const role = buildRoleFromCollaborator(collaborator);
    rolesByKey.set(getRoleAssociationKey(role.title, role.department), role);
  });

  return Array.from(rolesByKey.values()).sort((left, right) => {
    const departmentCompare = left.department.localeCompare(right.department);

    if (departmentCompare !== 0) {
      return departmentCompare;
    }

    return left.title.localeCompare(right.title);
  });
}

export function readStoredRoles() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(
      COLLABORATOR_ROLES_STORAGE_KEY,
    );

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed
      .map((item) => sanitizeRoleRecord(item))
      .filter((item): item is CollaboratorRoleRecord => item !== null);
  } catch {
    return null;
  }
}

export function writeStoredCollaborators(collaborators: CollaboratorRecord[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      COLLABORATORS_STORAGE_KEY,
      JSON.stringify(collaborators),
    );
  } catch {}
}

export function writeStoredRoles(roles: CollaboratorRoleRecord[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      COLLABORATOR_ROLES_STORAGE_KEY,
      JSON.stringify(roles),
    );
  } catch {}
}

export function mergeCollaborators(
  currentCollaborators: CollaboratorRecord[],
  importedCollaborators: CollaboratorRecord[],
) {
  const collaboratorsByCpf = new Map(
    currentCollaborators.map((collaborator) => [
      normalizeCpf(collaborator.cpf),
      collaborator,
    ]),
  );

  importedCollaborators.forEach((collaborator) => {
    const collaboratorCpf = normalizeCpf(collaborator.cpf);
    const currentCollaborator = collaboratorsByCpf.get(collaboratorCpf);

    collaboratorsByCpf.set(
      collaboratorCpf,
      currentCollaborator
        ? {
            ...currentCollaborator,
            ...collaborator,
            id: currentCollaborator.id,
          }
        : collaborator,
    );
  });

  return Array.from(collaboratorsByCpf.values()).sort((left, right) => {
    if (!left.hireDate && !right.hireDate) {
      return left.fullName.localeCompare(right.fullName);
    }

    if (!left.hireDate) {
      return 1;
    }

    if (!right.hireDate) {
      return -1;
    }

    return right.hireDate.localeCompare(left.hireDate);
  });
}

export function mergeRoles(
  currentRoles: CollaboratorRoleRecord[],
  importedRoles: CollaboratorRoleRecord[],
) {
  const rolesByKey = new Map(
    currentRoles.map((role) => [
      getRoleAssociationKey(role.title, role.department),
      role,
    ]),
  );

  importedRoles.forEach((role) => {
    const roleKey = getRoleAssociationKey(role.title, role.department);
    const currentRole = rolesByKey.get(roleKey);

    rolesByKey.set(
      roleKey,
      currentRole
        ? {
            ...currentRole,
            ...role,
            id: currentRole.id,
          }
        : role,
    );
  });

  return Array.from(rolesByKey.values()).sort((left, right) => {
    const departmentCompare = left.department.localeCompare(right.department);

    if (departmentCompare !== 0) {
      return departmentCompare;
    }

    return left.title.localeCompare(right.title);
  });
}

export function toCollaboratorFromSpreadsheetRow(
  row: Record<string, unknown>,
  branches: ServerBranch[],
): CollaboratorRecord | null {
  const cpf = formatCpf(readSpreadsheetValue(row, ["CPF", "cpf"]));
  const fullName = readSpreadsheetValue(row, [
    "Nome Completo",
    "Nome Completo*",
    "fullName",
    "nomeCompleto",
  ]);

  if (!cpf || !fullName) {
    return null;
  }

  const branchNameFromRow = readSpreadsheetValue(row, [
    "Filial",
    "branchName",
    "filial",
  ]);
  const branchId = readSpreadsheetValue(row, ["branchId", "Filial ID"]);
  const matchedBranch =
    branches.find((branch) => branch.id === branchId) ??
    branches.find(
      (branch) => branch.name.toLowerCase() === branchNameFromRow.toLowerCase(),
    );

  const statusValue =
    readSpreadsheetValue(row, ["Status", "status"]) || "Ativo";
  const collaboratorStatus = isCollaboratorStatus(statusValue)
    ? statusValue
    : "Ativo";

  return {
    id: crypto.randomUUID(),
    cpf,
    fullName,
    email: readSpreadsheetValue(row, ["E-mail", "Email", "email"]),
    phone: formatPhone(readSpreadsheetValue(row, ["Telefone", "phone"])),
    department: readSpreadsheetValue(row, ["Departamento", "department"]),
    role: readSpreadsheetValue(row, ["Cargo", "role"]),
    hireDate: normalizeSpreadsheetDate(
      readSpreadsheetValue(row, ["Data de Contratação", "hireDate"]),
    ),
    terminationDate: normalizeSpreadsheetDate(
      readSpreadsheetValue(row, ["Data de Demissão", "terminationDate"]),
    ),
    birthDate: normalizeSpreadsheetDate(
      readSpreadsheetValue(row, ["Data de Nascimento", "birthDate"]),
    ),
    educationLevel: readSpreadsheetValue(row, [
      "Escolaridade",
      "educationLevel",
    ]),
    gender: readSpreadsheetValue(row, ["Gênero", "Genero", "gender"]),
    employmentType:
      readSpreadsheetValue(row, ["Tipo de Contrato", "employmentType"]) ||
      "CLT",
    status: collaboratorStatus,
    branchId: matchedBranch?.id ?? "",
    branchName: matchedBranch?.name ?? branchNameFromRow,
    additionalLocation: readSpreadsheetValue(row, [
      "Localização Adicional",
      "additionalLocation",
    ]),
    notes: readSpreadsheetValue(row, [
      "Observações",
      "Informações Adicionais",
      "notes",
    ]),
  };
}

export function toRoleFromSpreadsheetRow(
  row: Record<string, unknown>,
): CollaboratorRoleRecord | null {
  const title = readSpreadsheetValue(row, ["Cargo", "title", "cargo"]);
  const department = readSpreadsheetValue(row, [
    "Departamento",
    "department",
    "departamento",
  ]);

  if (!title) {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    title,
    department,
    educationRequirement: readSpreadsheetValue(row, [
      "Escolaridade Exigida",
      "educationRequirement",
      "escolaridadeExigida",
    ]),
    employmentType:
      readSpreadsheetValue(row, ["Tipo de Contrato", "employmentType"]) ||
      "CLT",
    requirements: readSpreadsheetValue(row, [
      "Requisitos",
      "requirements",
      "requisitos",
    ]),
    responsibilities: readSpreadsheetValue(row, [
      "Responsabilidades",
      "responsibilities",
      "responsabilidades",
    ]),
    description: readSpreadsheetValue(row, [
      "Descrição",
      "description",
      "descricao",
    ]),
  };
}

export function formatDateLabel(value: string) {
  if (!value) {
    return "Não informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function getDisplayValue(value: string | null | undefined) {
  return value?.trim() || "Não informado";
}

export function getCollaboratorInitials(value: string | null | undefined) {
  const parts = value?.trim().split(/\s+/).filter(Boolean).slice(0, 2) ?? [];

  if (parts.length === 0) {
    return "CL";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function getCollaboratorStatusClass(status: CollaboratorStatus) {
  switch (status) {
    case "Ativo":
      return "badge badge--success";
    case "Em admissão":
      return "badge badge--warning";
    case "Desligado":
      return "badge badge--neutral";
    default:
      return "badge badge--neutral";
  }
}

export function getRoleAssociationKey(title: string, department: string) {
  return `${title.trim().toLowerCase()}::${department.trim().toLowerCase()}`;
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeCpf(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function formatCpf(value: string) {
  const digits = normalizeCpf(value);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }

  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) {
    return digits ? `(${digits}` : "";
  }

  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function sanitizeCollaboratorRecord(value: unknown): CollaboratorRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const fullName = toTrimmedString(record.fullName);
  const cpf = formatCpf(toTrimmedString(record.cpf));

  if (!fullName || !cpf) {
    return null;
  }

  const statusValue = toTrimmedString(record.status);

  return {
    id: toTrimmedString(record.id) || crypto.randomUUID(),
    additionalLocation: toTrimmedString(record.additionalLocation),
    birthDate: normalizeSpreadsheetDate(toTrimmedString(record.birthDate)),
    branchId: toTrimmedString(record.branchId),
    branchName: toTrimmedString(record.branchName),
    cpf,
    department: toTrimmedString(record.department),
    educationLevel: toTrimmedString(record.educationLevel),
    email: toTrimmedString(record.email),
    employmentType: toTrimmedString(record.employmentType) || "CLT",
    fullName,
    gender: toTrimmedString(record.gender),
    hireDate: normalizeSpreadsheetDate(toTrimmedString(record.hireDate)),
    notes: toTrimmedString(record.notes),
    phone: formatPhone(toTrimmedString(record.phone)),
    role: toTrimmedString(record.role),
    status: isCollaboratorStatus(statusValue) ? statusValue : "Ativo",
    terminationDate: normalizeSpreadsheetDate(
      toTrimmedString(record.terminationDate),
    ),
  };
}

function sanitizeRoleRecord(value: unknown): CollaboratorRoleRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const title = toTrimmedString(record.title);

  if (!title) {
    return null;
  }

  return {
    id: toTrimmedString(record.id) || crypto.randomUUID(),
    title,
    department: toTrimmedString(record.department),
    educationRequirement: toTrimmedString(record.educationRequirement),
    employmentType: toTrimmedString(record.employmentType) || "CLT",
    requirements: toTrimmedString(record.requirements),
    responsibilities: toTrimmedString(record.responsibilities),
    description: toTrimmedString(record.description),
  };
}

function toTrimmedString(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function isCollaboratorStatus(value: string): value is CollaboratorStatus {
  return collaboratorStatuses.includes(value as CollaboratorStatus);
}

function buildRoleFromCollaborator(
  collaborator: CollaboratorRecord,
): CollaboratorRoleRecord {
  return {
    id: crypto.randomUUID(),
    title: collaborator.role.trim(),
    department: collaborator.department.trim(),
    educationRequirement: collaborator.educationLevel.trim(),
    employmentType: collaborator.employmentType.trim() || "CLT",
    requirements: "",
    responsibilities: "",
    description: collaborator.notes.trim(),
  };
}

function readSpreadsheetValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
  }

  return "";
}

function normalizeSpreadsheetDate(value: string) {
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const [day, month, year] = value.split("/");
  if (day && month && year && year.length === 4) {
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return "";
}
