"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { COLLABORATOR_MODAL_VISIBILITY_EVENT } from "@/components/collaborators-events";
import {
  collaboratorStatuses,
  educationLevels,
  employmentTypes,
  formatCpf,
  formatPhone,
  genderOptions,
  todayIsoDate,
  type CollaboratorRecord,
  type CollaboratorRoleRecord,
} from "@/lib/collaborators";
import type { ServerBranch } from "@/lib/server-api";

import { CloseIcon } from "./app-icons";

type CollaboratorEditorModalProps = {
  branches: ServerBranch[];
  editorKey?: string;
  initialCollaborator?: CollaboratorRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (collaborator: CollaboratorRecord) => void;
  roles: CollaboratorRoleRecord[];
};

export function CollaboratorEditorModal({
  branches,
  editorKey,
  initialCollaborator = null,
  isOpen,
  onClose,
  onSubmit,
  roles,
}: CollaboratorEditorModalProps) {
  const portalTarget = usePortalTarget();
  const isEditing = Boolean(initialCollaborator);
  const [selectedDepartment, setSelectedDepartment] = useState(
    initialCollaborator?.department ?? "",
  );
  const [selectedRole, setSelectedRole] = useState(initialCollaborator?.role ?? "");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedDepartment(initialCollaborator?.department ?? "");
    setSelectedRole(initialCollaborator?.role ?? "");
  }, [editorKey, initialCollaborator, isOpen]);

  const departmentOptions = useMemo(() => {
    const departments = new Set<string>();

    roles.forEach((role) => {
      if (role.department.trim()) {
        departments.add(role.department.trim());
      }
    });

    if (initialCollaborator?.department?.trim()) {
      departments.add(initialCollaborator.department.trim());
    }

    return Array.from(departments).sort((left, right) =>
      left.localeCompare(right, "pt-BR"),
    );
  }, [initialCollaborator?.department, roles]);

  const roleOptions = useMemo(() => {
    const filteredRoles = selectedDepartment
      ? roles.filter((role) => role.department.trim() === selectedDepartment)
      : roles;
    const uniqueRoles = new Map<string, string>();

    filteredRoles.forEach((role) => {
      const title = role.title.trim();

      if (title) {
        uniqueRoles.set(title, title);
      }
    });

    if (initialCollaborator?.role?.trim()) {
      uniqueRoles.set(initialCollaborator.role.trim(), initialCollaborator.role.trim());
    }

    return Array.from(uniqueRoles.values()).sort((left, right) =>
      left.localeCompare(right, "pt-BR"),
    );
  }, [initialCollaborator?.role, roles, selectedDepartment]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(COLLABORATOR_MODAL_VISIBILITY_EVENT, {
        detail: { open: isOpen },
      }),
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent(COLLABORATOR_MODAL_VISIBILITY_EVENT, {
          detail: { open: false },
        }),
      );
    };
  }, [isOpen]);

  if (!isOpen || !portalTarget) {
    return null;
  }

  return createPortal(
    <div
      aria-hidden="true"
      className="app-modal app-modal--overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        aria-labelledby="collaborator-editor-title"
        aria-modal="true"
        className="app-modal__dialog app-modal__dialog--collaborators"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="app-modal__header">
          <div className="stack stack--xs">
            <h2 id="collaborator-editor-title">
              {isEditing ? "Editar colaborador" : "Novo funcionário"}
            </h2>
            <p className="app-modal__description">
              {isEditing
                ? "Atualize o cadastro do colaborador mantendo o padrão operacional da base."
                : "Preencha os dados centrais do colaborador sem incluir as seções de experiências e educação complementar."}
            </p>
          </div>
          <button
            aria-label="Fechar edição de colaborador"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </header>

        <form
          className="collaborator-form"
          key={editorKey ?? initialCollaborator?.id ?? "collaborator-editor"}
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            onSubmit(
              buildCollaboratorFromFormData(
                formData,
                branches,
                initialCollaborator,
              ),
            );
          }}
        >
          <div className="app-modal__body collaborator-form__grid form-grid">
            <div className="field">
              <label htmlFor="collaborator-cpf">CPF</label>
              <input
                defaultValue={initialCollaborator?.cpf ?? ""}
                id="collaborator-cpf"
                inputMode="numeric"
                name="cpf"
                onInput={(event) => {
                  event.currentTarget.value = formatCpf(
                    event.currentTarget.value,
                  );
                }}
                placeholder="000.000.000-00"
                required
                type="text"
              />
            </div>
            <div className="field">
              <label htmlFor="collaborator-full-name">Nome Completo</label>
              <input
                defaultValue={initialCollaborator?.fullName ?? ""}
                id="collaborator-full-name"
                name="fullName"
                placeholder="Nome completo do funcionário"
                required
                type="text"
              />
            </div>
            <div className="field">
              <label htmlFor="collaborator-email">E-mail</label>
              <input
                defaultValue={initialCollaborator?.email ?? ""}
                id="collaborator-email"
                name="email"
                placeholder="email@empresa.com"
                type="email"
              />
            </div>
            <div className="field">
              <label htmlFor="collaborator-phone">Telefone</label>
              <input
                defaultValue={initialCollaborator?.phone ?? ""}
                id="collaborator-phone"
                inputMode="tel"
                name="phone"
                onInput={(event) => {
                  event.currentTarget.value = formatPhone(
                    event.currentTarget.value,
                  );
                }}
                placeholder="(11) 99999-9999"
                type="text"
              />
            </div>
            <div className="field">
              <label htmlFor="collaborator-department">Departamento</label>
              <select
                id="collaborator-department"
                name="department"
                onChange={(event) => {
                  const nextDepartment = event.currentTarget.value;

                  setSelectedDepartment(nextDepartment);

                  const roleStillValid =
                    !selectedRole ||
                    roles.some(
                      (role) =>
                        role.title.trim() === selectedRole &&
                        role.department.trim() === nextDepartment,
                    );

                  if (!roleStillValid) {
                    setSelectedRole("");
                  }
                }}
                value={selectedDepartment}
              >
                <option value="">Selecionar departamento</option>
                {departmentOptions.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="collaborator-role">Cargo</label>
              <select
                id="collaborator-role"
                name="role"
                onChange={(event) => {
                  const nextRole = event.currentTarget.value;

                  setSelectedRole(nextRole);

                  if (!selectedDepartment && nextRole) {
                    const matchingRole = roles.find(
                      (role) => role.title.trim() === nextRole,
                    );

                    if (matchingRole?.department.trim()) {
                      setSelectedDepartment(matchingRole.department.trim());
                    }
                  }
                }}
                value={selectedRole}
              >
                <option value="">Selecionar cargo</option>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="collaborator-hire-date">
                Data de Contratação
              </label>
              <input
                defaultValue={initialCollaborator?.hireDate ?? todayIsoDate()}
                id="collaborator-hire-date"
                name="hireDate"
                required
                type="date"
              />
            </div>
            <div className="field">
              <label htmlFor="collaborator-termination-date">
                Data de Demissão
              </label>
              <input
                defaultValue={initialCollaborator?.terminationDate ?? ""}
                id="collaborator-termination-date"
                name="terminationDate"
                type="date"
              />
            </div>
            <div className="field">
              <label htmlFor="collaborator-birth-date">
                Data de Nascimento
              </label>
              <input
                defaultValue={initialCollaborator?.birthDate ?? ""}
                id="collaborator-birth-date"
                name="birthDate"
                type="date"
              />
            </div>
            <div className="field">
              <label htmlFor="collaborator-education-level">Escolaridade</label>
              <select
                defaultValue={initialCollaborator?.educationLevel ?? ""}
                id="collaborator-education-level"
                name="educationLevel"
              >
                <option value="">Selecionar escolaridade</option>
                {educationLevels.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="collaborator-gender">Gênero</label>
              <select
                defaultValue={initialCollaborator?.gender ?? ""}
                id="collaborator-gender"
                name="gender"
              >
                <option value="">Selecionar gênero</option>
                {genderOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="collaborator-employment-type">
                Tipo de Contrato
              </label>
              <select
                defaultValue={initialCollaborator?.employmentType ?? "CLT"}
                id="collaborator-employment-type"
                name="employmentType"
              >
                {employmentTypes.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="collaborator-status">Status</label>
              <select
                defaultValue={initialCollaborator?.status ?? "Ativo"}
                id="collaborator-status"
                name="status"
              >
                {collaboratorStatuses.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="collaborator-branch">Filial</label>
              <select
                defaultValue={
                  initialCollaborator?.branchId ?? branches[0]?.id ?? ""
                }
                id="collaborator-branch"
                name="branchId"
              >
                <option value="">Selecione uma filial</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="collaborator-additional-location">
                Localização Adicional
              </label>
              <input
                defaultValue={initialCollaborator?.additionalLocation ?? ""}
                id="collaborator-additional-location"
                name="additionalLocation"
                placeholder="Ex: Sala 201, Andar 3"
                type="text"
              />
            </div>
            <div className="field field--wide">
              <label htmlFor="collaborator-notes">Informações Adicionais</label>
              <textarea
                defaultValue={initialCollaborator?.notes ?? ""}
                id="collaborator-notes"
                name="notes"
                placeholder="Observações ou informações adicionais sobre o funcionário"
                rows={4}
              />
            </div>
          </div>
          <footer className="collaborator-form__footer">
            <button
              className="button button--secondary"
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button className="button" type="submit">
              {isEditing ? "Salvar alterações" : "Salvar colaborador"}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    portalTarget,
  );
}

function buildCollaboratorFromFormData(
  formData: FormData,
  branches: ServerBranch[],
  initialCollaborator: CollaboratorRecord | null,
): CollaboratorRecord {
  const branchId = String(formData.get("branchId") ?? "");
  const branchName =
    branches.find((branch) => branch.id === branchId)?.name ?? "";

  return {
    id: initialCollaborator?.id ?? crypto.randomUUID(),
    cpf: formatCpf(String(formData.get("cpf") ?? "")),
    fullName: String(formData.get("fullName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: formatPhone(String(formData.get("phone") ?? "")),
    department: String(formData.get("department") ?? "").trim(),
    role: String(formData.get("role") ?? "").trim(),
    hireDate: String(formData.get("hireDate") ?? ""),
    terminationDate: String(formData.get("terminationDate") ?? ""),
    birthDate: String(formData.get("birthDate") ?? ""),
    educationLevel: String(formData.get("educationLevel") ?? ""),
    gender: String(formData.get("gender") ?? ""),
    employmentType: String(formData.get("employmentType") ?? "CLT"),
    status: String(
      formData.get("status") ?? "Ativo",
    ) as CollaboratorRecord["status"],
    branchId,
    branchName,
    additionalLocation: String(formData.get("additionalLocation") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  };
}

function usePortalTarget() {
  return useMemo(
    () => (typeof document === "undefined" ? null : document.body),
    [],
  );
}
