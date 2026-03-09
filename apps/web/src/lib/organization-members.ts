import type { Role } from "@daton/contracts";

import type { ServerBranch, ServerOrganizationMember } from "./server-api";

const roleLabels: Record<Role, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  hr_admin: "Administrador de RH",
  branch_manager: "Gestor de unidade",
  document_controller: "Controlador documental",
  collaborator: "Colaborador",
  viewer: "Leitor",
};

const roleDescriptions: Record<Role, string> = {
  owner: "Controle total da organização, estrutura e permissões.",
  admin: "Administra usuários, estrutura e rotinas operacionais.",
  hr_admin: "Administra cadastros e rotinas de RH.",
  branch_manager: "Opera e acompanha uma ou mais unidades.",
  document_controller: "Controla documentação e conformidade operacional.",
  collaborator: "Acessa o ambiente operacional como membro da organização.",
  viewer: "Acompanha dados com acesso restrito a leitura.",
};

export function formatAccessRole(role: Role) {
  return roleLabels[role];
}

export function describeAccessRole(role: Role) {
  return roleDescriptions[role];
}

export function formatMemberStatus(
  status: ServerOrganizationMember["status"],
) {
  return status === "active" ? "Ativo" : "Inativo";
}

export function getBranchNamesForMember(
  member: ServerOrganizationMember,
  branches: ServerBranch[],
) {
  const branchNameById = new Map(branches.map((branch) => [branch.id, branch.name]));

  return member.branchIds
    .map((branchId) => branchNameById.get(branchId) ?? "")
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "pt-BR"));
}

export function formatBranchScope(
  member: ServerOrganizationMember,
  branches: ServerBranch[],
) {
  if (member.hasGlobalAccess) {
    return "Todas as unidades ativas";
  }

  const names = getBranchNamesForMember(member, branches);

  if (names.length === 0) {
    return "Sem unidade vinculada";
  }

  return names.join(", ");
}
