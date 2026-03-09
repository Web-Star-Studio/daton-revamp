"use client";

import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

import {
  educationLevels,
  type CollaboratorRoleRecord,
} from "@/lib/collaborators";

import { CloseIcon } from "./app-icons";

type CollaboratorRoleEditorModalProps = {
  departmentOptions: string[];
  editorKey?: string;
  initialRole?: CollaboratorRoleRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (role: CollaboratorRoleRecord) => void;
};

export function CollaboratorRoleEditorModal({
  departmentOptions,
  editorKey,
  initialRole = null,
  isOpen,
  onClose,
  onSubmit,
}: CollaboratorRoleEditorModalProps) {
  const portalTarget = usePortalTarget();
  const isEditing = Boolean(initialRole);

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
        aria-labelledby="collaborator-role-editor-title"
        aria-modal="true"
        className="app-modal__dialog app-modal__dialog--role-editor"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="app-modal__header">
          <div className="stack stack--xs">
            <h2 id="collaborator-role-editor-title">
              {isEditing ? "Editar cargo" : "Novo cargo"}
            </h2>
            <p className="app-modal__description">
              Estruture os cargos que serão usados como referência para o
              cadastro e a leitura da equipe.
            </p>
          </div>
          <button
            aria-label="Fechar edição de cargo"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </header>

        <form
          className="collaborator-role-form"
          key={editorKey ?? initialRole?.id ?? "collaborator-role-editor"}
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            onSubmit({
              id: initialRole?.id ?? crypto.randomUUID(),
              title: String(formData.get("title") ?? "").trim(),
              department: String(formData.get("department") ?? "").trim(),
              educationRequirement: String(
                formData.get("educationRequirement") ?? "",
              ).trim(),
              employmentType:
                String(formData.get("employmentType") ?? "").trim() || "CLT",
              requirements: String(formData.get("requirements") ?? "").trim(),
              responsibilities: String(
                formData.get("responsibilities") ?? "",
              ).trim(),
              description: String(formData.get("description") ?? "").trim(),
            });
          }}
        >
          <div className="app-modal__body collaborator-role-form__body">
            <div className="field">
              <label htmlFor="collaborator-role-title">Cargo</label>
              <input
                defaultValue={initialRole?.title ?? ""}
                id="collaborator-role-title"
                name="title"
                placeholder="Ex: Analista de Processos"
                required
                type="text"
              />
            </div>
            <div className="field">
              <label htmlFor="collaborator-role-department">Departamento</label>
              <select
                defaultValue={initialRole?.department ?? ""}
                id="collaborator-role-department"
                name="department"
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
              <label htmlFor="collaborator-role-employment-type">
                Tipo de Contrato
              </label>
              <input
                defaultValue={initialRole?.employmentType ?? "CLT"}
                id="collaborator-role-employment-type"
                name="employmentType"
                placeholder="Ex: CLT"
                type="text"
              />
            </div>
            <div className="field">
              <label htmlFor="collaborator-role-education-requirement">
                Escolaridade exigida
              </label>
              <select
                defaultValue={initialRole?.educationRequirement ?? ""}
                id="collaborator-role-education-requirement"
                name="educationRequirement"
              >
                <option value="">Selecionar escolaridade</option>
                {educationLevels.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="field field--wide">
              <label htmlFor="collaborator-role-description">Descrição</label>
              <textarea
                defaultValue={initialRole?.description ?? ""}
                id="collaborator-role-description"
                name="description"
                placeholder="Escopo resumido do cargo, responsabilidades ou observações."
                rows={4}
              />
            </div>
            <div className="field field--wide">
              <label htmlFor="collaborator-role-requirements">Requisitos</label>
              <textarea
                defaultValue={initialRole?.requirements ?? ""}
                id="collaborator-role-requirements"
                name="requirements"
                placeholder="Liste qualificações, certificações ou pré-requisitos do cargo."
                rows={4}
              />
            </div>
            <div className="field field--wide">
              <label htmlFor="collaborator-role-responsibilities">
                Responsabilidades
              </label>
              <textarea
                defaultValue={initialRole?.responsibilities ?? ""}
                id="collaborator-role-responsibilities"
                name="responsibilities"
                placeholder="Descreva as principais responsabilidades e entregas esperadas."
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
              {isEditing ? "Salvar cargo" : "Adicionar cargo"}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    portalTarget,
  );
}

function usePortalTarget() {
  return useMemo(
    () => (typeof document === "undefined" ? null : document.body),
    [],
  );
}
