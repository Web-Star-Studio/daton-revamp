"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type { CreateEmployeeInput, UpdateEmployeeInput } from "@daton/contracts";

import {
  educationLevels,
  employmentTypes,
  formatCpf,
  formatPhone,
  genderOptions,
  todayIsoDate,
} from "@/lib/collaborators";
import type {
  ServerBranch,
  ServerDepartment,
  ServerEmployee,
  ServerPosition,
} from "@/lib/server-api";

import { COLLABORATOR_MODAL_VISIBILITY_EVENT } from "./collaborators-events";
import { CloseIcon } from "./app-icons";

const employeeStatuses = ["Ativo", "Inativo", "Afastado"] as const;
const ethnicityOptions = [
  "Branca",
  "Preta",
  "Parda",
  "Amarela",
  "Indígena",
  "Prefiro não informar",
] as const;

type EmployeeEditorModalProps = {
  branches: ServerBranch[];
  departments: ServerDepartment[];
  employees: ServerEmployee[];
  initialEmployee?: ServerEmployee | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateEmployeeInput | UpdateEmployeeInput) => Promise<void>;
  positions: ServerPosition[];
};

export function EmployeeEditorModal({
  branches,
  departments,
  employees,
  initialEmployee = null,
  isOpen,
  onClose,
  onSubmit,
  positions,
}: EmployeeEditorModalProps) {
  const portalTarget = usePortalTarget();
  const isEditing = Boolean(initialEmployee);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(
    initialEmployee?.departmentId ?? "",
  );
  const [selectedPositionId, setSelectedPositionId] = useState(
    initialEmployee?.positionId ?? "",
  );

  useEffect(() => {
    return () => {
      window.dispatchEvent(
        new CustomEvent(COLLABORATOR_MODAL_VISIBILITY_EVENT, {
          detail: { open: false },
        }),
      );
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedDepartmentId(initialEmployee?.departmentId ?? "");
    setSelectedPositionId(initialEmployee?.positionId ?? "");
  }, [initialEmployee, isOpen]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(COLLABORATOR_MODAL_VISIBILITY_EVENT, {
        detail: { open: isOpen },
      }),
    );
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const positionOptions = useMemo(() => {
    if (!selectedDepartmentId) {
      return positions;
    }

    return positions.filter(
      (position) => position.departmentId === selectedDepartmentId,
    );
  }, [positions, selectedDepartmentId]);

  const managerOptions = useMemo(
    () =>
      employees
        .filter((employee) => employee.id !== initialEmployee?.id)
        .slice()
        .sort((left, right) => left.fullName.localeCompare(right.fullName, "pt-BR")),
    [employees, initialEmployee?.id],
  );

  if (!isOpen || !portalTarget) {
    return null;
  }

  return createPortal(
    <div
      className="app-modal app-modal--overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        aria-labelledby="employee-editor-title"
        aria-modal="true"
        className="app-modal__dialog app-modal__dialog--collaborators"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="app-modal__header">
          <div className="stack stack--xs">
            <h2 id="employee-editor-title">
              {isEditing ? "Editar colaborador" : "Novo colaborador"}
            </h2>
            <p className="app-modal__description">
              {isEditing
                ? "Atualize os dados de RH do colaborador."
                : "Cadastre um novo colaborador na base da organização."}
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
          key={initialEmployee?.id ?? "employee-editor"}
          onSubmit={(event) => {
            event.preventDefault();

            const formData = new FormData(event.currentTarget);
            const salaryValue = String(formData.get("salary") ?? "").trim();
            const payload = {
              employeeCode: String(formData.get("employeeCode") ?? "").trim(),
              cpf: formatCpf(String(formData.get("cpf") ?? "")),
              fullName: String(formData.get("fullName") ?? "").trim(),
              email: String(formData.get("email") ?? "").trim(),
              phone: formatPhone(String(formData.get("phone") ?? "")),
              departmentId: String(formData.get("departmentId") ?? "").trim() || null,
              positionId: String(formData.get("positionId") ?? "").trim() || null,
              hireDate:
                String(formData.get("hireDate") ?? "").trim() || todayIsoDate(),
              birthDate: String(formData.get("birthDate") ?? "").trim(),
              gender: String(formData.get("gender") ?? "").trim(),
              ethnicity: String(formData.get("ethnicity") ?? "").trim(),
              educationLevel: String(formData.get("educationLevel") ?? "").trim(),
              salary: salaryValue ? Number(salaryValue.replace(",", ".")) : null,
              employmentType:
                String(formData.get("employmentType") ?? "").trim() || "CLT",
              status:
                String(formData.get("status") ?? "").trim() || "Ativo",
              managerId: String(formData.get("managerId") ?? "").trim() || null,
              location: String(formData.get("location") ?? "").trim(),
              branchId: String(formData.get("branchId") ?? "").trim() || null,
              terminationDate: String(formData.get("terminationDate") ?? "").trim(),
              notes: String(formData.get("notes") ?? "").trim(),
            } satisfies CreateEmployeeInput | UpdateEmployeeInput;

            void onSubmit(payload);
          }}
        >
          <div className="app-modal__body collaborator-form__grid form-grid">
            <div className="field">
              <label htmlFor="employee-code">Código do colaborador</label>
              <input
                defaultValue={initialEmployee?.employeeCode ?? ""}
                id="employee-code"
                name="employeeCode"
                type="text"
              />
            </div>
            <div className="field">
              <label htmlFor="employee-cpf">CPF</label>
              <input
                defaultValue={initialEmployee?.cpf ?? ""}
                id="employee-cpf"
                inputMode="numeric"
                name="cpf"
                onInput={(event) => {
                  event.currentTarget.value = formatCpf(event.currentTarget.value);
                }}
                placeholder="000.000.000-00"
                type="text"
              />
            </div>
            <div className="field">
              <label htmlFor="employee-full-name">Nome completo</label>
              <input
                autoFocus
                defaultValue={initialEmployee?.fullName ?? ""}
                id="employee-full-name"
                name="fullName"
                required
                type="text"
              />
            </div>
            <div className="field">
              <label htmlFor="employee-email">E-mail</label>
              <input
                defaultValue={initialEmployee?.email ?? ""}
                id="employee-email"
                name="email"
                type="email"
              />
            </div>
            <div className="field">
              <label htmlFor="employee-phone">Telefone</label>
              <input
                defaultValue={initialEmployee?.phone ?? ""}
                id="employee-phone"
                inputMode="tel"
                name="phone"
                onInput={(event) => {
                  event.currentTarget.value = formatPhone(event.currentTarget.value);
                }}
                type="text"
              />
            </div>
            <div className="field">
              <label htmlFor="employee-status">Status</label>
              <select
                defaultValue={initialEmployee?.status ?? "Ativo"}
                id="employee-status"
                name="status"
              >
                {employeeStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="employee-department">Departamento</label>
              <select
                id="employee-department"
                name="departmentId"
                onChange={(event) => {
                  const nextDepartmentId = event.currentTarget.value;
                  setSelectedDepartmentId(nextDepartmentId);

                  if (
                    !selectedPositionId ||
                    !positions.some(
                      (position) =>
                        position.id === selectedPositionId &&
                        (!nextDepartmentId ||
                          position.departmentId === nextDepartmentId),
                    )
                  ) {
                    setSelectedPositionId("");
                  }
                }}
                value={selectedDepartmentId}
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
              <label htmlFor="employee-position">Cargo</label>
              <select
                id="employee-position"
                name="positionId"
                onChange={(event) => setSelectedPositionId(event.currentTarget.value)}
                value={selectedPositionId}
              >
                <option value="">Selecionar cargo</option>
                {positionOptions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="employee-manager">Gestor</label>
              <select
                defaultValue={initialEmployee?.managerId ?? ""}
                id="employee-manager"
                name="managerId"
              >
                <option value="">Sem gestor definido</option>
                {managerOptions.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="employee-branch">Unidade</label>
              <select
                defaultValue={initialEmployee?.branchId ?? ""}
                id="employee-branch"
                name="branchId"
              >
                <option value="">Selecionar unidade</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="employee-employment-type">Tipo de contrato</label>
              <select
                defaultValue={initialEmployee?.employmentType ?? "CLT"}
                id="employee-employment-type"
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
              <label htmlFor="employee-hire-date">Data de contratação</label>
              <input
                defaultValue={initialEmployee?.hireDate ?? todayIsoDate()}
                id="employee-hire-date"
                name="hireDate"
                required
                type="date"
              />
            </div>
            <div className="field">
              <label htmlFor="employee-termination-date">Data de desligamento</label>
              <input
                defaultValue={initialEmployee?.terminationDate ?? ""}
                id="employee-termination-date"
                name="terminationDate"
                type="date"
              />
            </div>
            <div className="field">
              <label htmlFor="employee-birth-date">Data de nascimento</label>
              <input
                defaultValue={initialEmployee?.birthDate ?? ""}
                id="employee-birth-date"
                name="birthDate"
                type="date"
              />
            </div>
            <div className="field">
              <label htmlFor="employee-gender">Gênero</label>
              <select
                defaultValue={initialEmployee?.gender ?? ""}
                id="employee-gender"
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
              <label htmlFor="employee-ethnicity">Raça / etnia</label>
              <select
                defaultValue={initialEmployee?.ethnicity ?? ""}
                id="employee-ethnicity"
                name="ethnicity"
              >
                <option value="">Selecionar opção</option>
                {ethnicityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="employee-education-level">Escolaridade</label>
              <select
                defaultValue={initialEmployee?.educationLevel ?? ""}
                id="employee-education-level"
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
              <label htmlFor="employee-salary">Salário</label>
              <input
                defaultValue={
                  typeof initialEmployee?.salary === "number"
                    ? String(initialEmployee.salary)
                    : ""
                }
                id="employee-salary"
                inputMode="decimal"
                name="salary"
                placeholder="Ex: 4500.00"
                type="number"
              />
            </div>
            <div className="field field--wide">
              <label htmlFor="employee-location">Localização</label>
              <input
                defaultValue={initialEmployee?.location ?? ""}
                id="employee-location"
                name="location"
                type="text"
              />
            </div>
            <div className="field field--wide">
              <label htmlFor="employee-notes">Observações</label>
              <textarea
                defaultValue={initialEmployee?.notes ?? ""}
                id="employee-notes"
                name="notes"
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
              {isEditing ? "Salvar colaborador" : "Criar colaborador"}
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
