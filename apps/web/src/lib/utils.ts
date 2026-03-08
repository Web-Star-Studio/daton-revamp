import { clsx, type ClassValue } from "clsx";

export const cn = (...values: ClassValue[]) => clsx(values);

const roleLabels: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  hr_admin: "Administrador de RH",
  branch_manager: "Gestor da filial",
  document_controller: "Controlador de documentos",
  collaborator: "Colaborador",
  viewer: "Visualizador",
};

const branchStatusLabels: Record<string, string> = {
  active: "Ativa",
  archived: "Arquivada",
};

export const formatRole = (role: string) =>
  roleLabels[role] ??
  role.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

export const formatBranchStatus = (status: string) => branchStatusLabels[status] ?? status;

export const formatShortName = (fullName: string) => {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
};
