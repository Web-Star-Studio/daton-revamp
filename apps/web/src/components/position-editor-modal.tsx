"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type { CreatePositionInput, UpdatePositionInput } from "@daton/contracts";

import { educationLevels } from "@/lib/collaborators";
import type { ServerDepartment, ServerPosition } from "@/lib/server-api";

import { COLLABORATOR_MODAL_VISIBILITY_EVENT } from "./collaborators-events";
import { CloseIcon } from "./app-icons";

type PositionEditorModalProps = {
  departments: ServerDepartment[];
  initialPosition?: ServerPosition | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreatePositionInput | UpdatePositionInput) => Promise<void>;
  positions: ServerPosition[];
};

export function PositionEditorModal({
  departments,
  initialPosition = null,
  isOpen,
  onClose,
  onSubmit,
  positions,
}: PositionEditorModalProps) {
  const portalTarget = usePortalTarget();
  const isEditing = Boolean(initialPosition);
  const [isSaving, setIsSaving] = useState(false);

  const handleClose = () => {
    if (isSaving) {
      return;
    }

    onClose();
  };

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

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, isOpen, isSaving]);

  const reportOptions = useMemo(
    () =>
      positions
        .filter((position) => position.id !== initialPosition?.id)
        .slice()
        .sort((left, right) => left.title.localeCompare(right.title, "pt-BR")),
    [initialPosition?.id, positions],
  );

  if (!isOpen || !portalTarget) {
    return null;
  }

  return createPortal(
    <div
      className="app-modal app-modal--overlay"
      onClick={handleClose}
      role="presentation"
    >
      <div
        aria-labelledby="position-editor-title"
        aria-modal="true"
        className="app-modal__dialog app-modal__dialog--role-editor"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="app-modal__header">
          <div className="stack stack--xs">
            <h2 id="position-editor-title">
              {isEditing ? "Editar cargo" : "Novo cargo"}
            </h2>
            <p className="app-modal__description">
              Estruture o cargo com escopo, requisitos e enquadramento salarial.
            </p>
          </div>
          <button
            aria-label="Fechar edição de cargo"
            className="icon-button"
            disabled={isSaving}
            onClick={handleClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </header>

        <form
          className="collaborator-role-form"
          key={initialPosition?.id ?? "position-editor"}
          onSubmit={async (event) => {
            event.preventDefault();

            const formData = new FormData(event.currentTarget);
            const requirements = String(formData.get("requirements") ?? "")
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean);
            const responsibilities = String(
              formData.get("responsibilities") ?? "",
            )
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean);
            const salaryRangeMin = String(formData.get("salaryRangeMin") ?? "").trim();
            const salaryRangeMax = String(formData.get("salaryRangeMax") ?? "").trim();
            const experienceYears = String(
              formData.get("requiredExperienceYears") ?? "",
            ).trim();

            const payload = {
              departmentId: String(formData.get("departmentId") ?? "").trim() || null,
              title: String(formData.get("title") ?? "").trim(),
              description: String(formData.get("description") ?? "").trim(),
              level: String(formData.get("level") ?? "").trim(),
              salaryRangeMin: salaryRangeMin
                ? Number(salaryRangeMin.replace(",", "."))
                : null,
              salaryRangeMax: salaryRangeMax
                ? Number(salaryRangeMax.replace(",", "."))
                : null,
              requirements,
              responsibilities,
              reportsToPositionId:
                String(formData.get("reportsToPositionId") ?? "").trim() || null,
              requiredEducationLevel: String(
                formData.get("requiredEducationLevel") ?? "",
              ).trim(),
              requiredExperienceYears: experienceYears
                ? Number(experienceYears)
                : null,
            } satisfies CreatePositionInput | UpdatePositionInput;

            setIsSaving(true);

            try {
              await onSubmit(payload);
            } finally {
              setIsSaving(false);
            }
          }}
        >
          <fieldset className="app-modal__fieldset" disabled={isSaving}>
            <div className="app-modal__body collaborator-role-form__body">
              <div className="field">
                <label htmlFor="position-title">Cargo</label>
                <input
                  autoFocus
                  defaultValue={initialPosition?.title ?? ""}
                  id="position-title"
                  name="title"
                  placeholder="Ex: Analista de Processos"
                  required
                  type="text"
                />
              </div>
              <div className="field">
                <label htmlFor="position-department">Departamento</label>
                <select
                  defaultValue={initialPosition?.departmentId ?? ""}
                  id="position-department"
                  name="departmentId"
                >
                  <option value="">Selecionar departamento</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="position-level">Nível</label>
                <input
                  defaultValue={initialPosition?.level ?? ""}
                  id="position-level"
                  name="level"
                  placeholder="Ex: Pleno"
                  type="text"
                />
              </div>
              <div className="field">
                <label htmlFor="position-reports-to">Reporta para</label>
                <select
                  defaultValue={initialPosition?.reportsToPositionId ?? ""}
                  id="position-reports-to"
                  name="reportsToPositionId"
                >
                  <option value="">Sem cargo superior</option>
                  {reportOptions.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="position-salary-range-min">Faixa salarial mínima</label>
                <input
                  defaultValue={
                    typeof initialPosition?.salaryRangeMin === "number"
                      ? String(initialPosition.salaryRangeMin)
                      : ""
                  }
                  id="position-salary-range-min"
                  inputMode="decimal"
                  name="salaryRangeMin"
                  placeholder="Ex: 3500"
                  type="number"
                />
              </div>
              <div className="field">
                <label htmlFor="position-salary-range-max">Faixa salarial máxima</label>
                <input
                  defaultValue={
                    typeof initialPosition?.salaryRangeMax === "number"
                      ? String(initialPosition.salaryRangeMax)
                      : ""
                  }
                  id="position-salary-range-max"
                  inputMode="decimal"
                  name="salaryRangeMax"
                  placeholder="Ex: 5200"
                  type="number"
                />
              </div>
              <div className="field">
                <label htmlFor="position-required-education">
                  Escolaridade exigida
                </label>
                <select
                  defaultValue={initialPosition?.requiredEducationLevel ?? ""}
                  id="position-required-education"
                  name="requiredEducationLevel"
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
                <label htmlFor="position-required-experience">
                  Experiência mínima (anos)
                </label>
                <input
                  defaultValue={
                    typeof initialPosition?.requiredExperienceYears === "number"
                      ? String(initialPosition.requiredExperienceYears)
                      : ""
                  }
                  id="position-required-experience"
                  inputMode="numeric"
                  min="0"
                  name="requiredExperienceYears"
                  type="number"
                />
              </div>
              <div className="field field--wide">
                <label htmlFor="position-description">Descrição</label>
                <textarea
                  defaultValue={initialPosition?.description ?? ""}
                  id="position-description"
                  name="description"
                  rows={4}
                />
              </div>
              <div className="field field--wide">
                <label htmlFor="position-requirements">
                  Requisitos
                </label>
                <textarea
                  defaultValue={initialPosition?.requirements.join("\n") ?? ""}
                  id="position-requirements"
                  name="requirements"
                  placeholder="Um requisito por linha"
                  rows={4}
                />
              </div>
              <div className="field field--wide">
                <label htmlFor="position-responsibilities">
                  Responsabilidades
                </label>
                <textarea
                  defaultValue={initialPosition?.responsibilities.join("\n") ?? ""}
                  id="position-responsibilities"
                  name="responsibilities"
                  placeholder="Uma responsabilidade por linha"
                  rows={4}
                />
              </div>
            </div>
            <footer className="collaborator-form__footer">
              <button
                className="button button--secondary"
                disabled={isSaving}
                onClick={handleClose}
                type="button"
              >
                Cancelar
              </button>
              <button className="button" disabled={isSaving} type="submit">
                {isSaving
                  ? "Salvando..."
                  : isEditing
                    ? "Salvar cargo"
                    : "Criar cargo"}
              </button>
            </footer>
          </fieldset>
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
