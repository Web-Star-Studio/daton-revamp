"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import type { CreateDepartmentInput, UpdateDepartmentInput } from "@daton/contracts";

import {
  createDepartment,
  updateDepartment,
  type ServerDepartment,
} from "@/lib/api";
import type { ServerBranch, ServerEmployee } from "@/lib/server-api";

import { CloseIcon, EditIcon } from "./app-icons";
import {
  DEPARTMENT_MODAL_VISIBILITY_EVENT,
  OPEN_DEPARTMENT_CREATION_EVENT,
  OPEN_DEPARTMENT_EXPORT_EVENT,
} from "./organization-departments-events";

type OrganizationDepartmentsWorkspaceProps = {
  branches: ServerBranch[];
  employees: ServerEmployee[];
  initialDepartments: ServerDepartment[];
};

export function OrganizationDepartmentsWorkspace({
  branches,
  employees,
  initialDepartments,
}: OrganizationDepartmentsWorkspaceProps) {
  const router = useRouter();
  const [departments, setDepartments] = useState(initialDepartments);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(
    initialDepartments[0]?.id ?? "",
  );
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<ServerDepartment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deferredSearchValue = useDeferredValue(searchValue);
  const departmentsRef = useRef(initialDepartments);

  useEffect(() => {
    setDepartments(initialDepartments);
    departmentsRef.current = initialDepartments;
    setSelectedDepartmentId((current) =>
      initialDepartments.some((department) => department.id === current)
        ? current
        : (initialDepartments[0]?.id ?? ""),
    );
  }, [initialDepartments]);

  useEffect(() => {
    departmentsRef.current = departments;
  }, [departments]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(DEPARTMENT_MODAL_VISIBILITY_EVENT, {
        detail: { open: isEditorOpen },
      }),
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent(DEPARTMENT_MODAL_VISIBILITY_EVENT, {
          detail: { open: false },
        }),
      );
    };
  }, [isEditorOpen]);

  useEffect(() => {
    const handleOpenCreate = () => {
      openCreateModal();
    };

    const handleExport = () => {
      void exportDepartments();
    };

    window.addEventListener(OPEN_DEPARTMENT_CREATION_EVENT, handleOpenCreate);
    window.addEventListener(OPEN_DEPARTMENT_EXPORT_EVENT, handleExport);

    return () => {
      window.removeEventListener(OPEN_DEPARTMENT_CREATION_EVENT, handleOpenCreate);
      window.removeEventListener(OPEN_DEPARTMENT_EXPORT_EVENT, handleExport);
    };
  }, []);

  const filteredDepartments = useMemo(() => {
    const normalizedSearch = deferredSearchValue.trim().toLocaleLowerCase("pt-BR");

    return departments.filter((department) => {
      if (statusFilter !== "all" && department.status !== statusFilter) {
        return false;
      }

      if (branchFilter !== "all" && !department.branchIds.includes(branchFilter)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        department.name,
        department.code,
        department.description ?? "",
        department.costCenter ?? "",
        department.manager?.fullName ?? department.managerName ?? "",
        department.parentDepartment?.name ?? "",
        department.notes ?? "",
        department.branchNames.join(" "),
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedSearch);
    });
  }, [branchFilter, deferredSearchValue, departments, statusFilter]);

  const selectedDepartment =
    filteredDepartments.find((department) => department.id === selectedDepartmentId) ??
    filteredDepartments[0] ??
    null;

  useEffect(() => {
    if (!selectedDepartment && filteredDepartments[0]) {
      setSelectedDepartmentId(filteredDepartments[0].id);
    }
  }, [filteredDepartments, selectedDepartment]);

  async function exportDepartments() {
    const rows = departmentsRef.current.map((department) => ({
      Departamento: department.name,
      Código: department.code,
      Status: formatDepartmentStatus(department.status),
      "Departamento pai": department.parentDepartment?.name ?? "",
      "Centro de custo": department.costCenter ?? "",
      Responsável: department.manager?.fullName ?? department.managerName ?? "",
      "Total de colaboradores": department.employeeCount,
      Unidades: department.branchNames.join(", "),
      Orçamento: formatCurrency(department.budget),
      Observações: department.notes ?? "",
    }));

    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    const stamp = new Date().toISOString().slice(0, 10);

    XLSX.utils.book_append_sheet(workbook, worksheet, "Departamentos");
    XLSX.writeFileXLSX(workbook, `departamentos-${stamp}.xlsx`);
  }

  function openCreateModal() {
    setEditingDepartment(null);
    setError(null);
    setIsEditorOpen(true);
  }

  function openEditModal(department: ServerDepartment) {
    setEditingDepartment(department);
    setError(null);
    setIsEditorOpen(true);
  }

  async function handleSubmit(
    payload: CreateDepartmentInput | UpdateDepartmentInput,
  ) {
    setError(null);

    try {
      const saved = editingDepartment
        ? await updateDepartment(editingDepartment.id, payload as UpdateDepartmentInput)
        : await createDepartment(payload as CreateDepartmentInput);

      startTransition(() => {
        setDepartments((current) => upsertDepartment(current, saved));
        setSelectedDepartmentId(saved.id);
        router.refresh();
      });
      setIsEditorOpen(false);
      setEditingDepartment(null);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Não foi possível salvar o departamento.",
      );
    }
  }

  return (
    <section className="stack stack--md">
      <article className="detail-grid collaborators-page__grid organization-units-grid organization-departments-grid">
        <div className="content-panel content-panel--fill">
          <div className="section-heading collaborators-panel__header">
            <div className="organization-departments-toolbar">
              <div className="collaborators-panel__filters organization-departments-filters">
                <label className="collaborators-field collaborators-field--search">
                  <span>Buscar</span>
                  <input
                    onChange={(event) => setSearchValue(event.currentTarget.value)}
                    placeholder="Departamento, código, centro de custo ou gestor"
                    type="search"
                    value={searchValue}
                  />
                </label>
                <label className="collaborators-field collaborators-field--compact">
                  <span>Unidade</span>
                  <select
                    onChange={(event) => setBranchFilter(event.currentTarget.value)}
                    value={branchFilter}
                  >
                    <option value="all">Todas</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="collaborators-field collaborators-field--compact">
                  <span>Status</span>
                  <select
                    onChange={(event) =>
                      setStatusFilter(
                        event.currentTarget.value as "all" | "active" | "archived",
                      )
                    }
                    value={statusFilter}
                  >
                    <option value="all">Todos</option>
                    <option value="active">Ativos</option>
                    <option value="archived">Arquivados</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          {error ? <p className="collaborators-panel__feedback">{error}</p> : null}

          {filteredDepartments.length > 0 ? (
            <div className="collaborators-table organization-departments-table">
              <div className="collaborators-table__head organization-departments-table__head">
                <span>Departamento</span>
                <span>Estrutura</span>
                <span>Operação</span>
                <span>Gestão</span>
              </div>
              <ul className="collaborators-table__body">
                {filteredDepartments.map((department) => (
                  <li key={department.id}>
                    <button
                      className={`collaborators-row organization-departments-row collaborators-row--interactive${
                        selectedDepartment?.id === department.id
                          ? " collaborators-row--selected"
                          : ""
                      }`}
                      onClick={() => setSelectedDepartmentId(department.id)}
                      type="button"
                    >
                      <div className="collaborators-row__primary">
                        <div className="organization-departments-row__identity">
                          <div className="organization-departments-row__copy">
                            <strong>{department.name}</strong>
                            <span>
                              {department.description?.trim() ||
                                "Sem descrição operacional registrada."}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="collaborators-row__secondary">
                        <strong>{department.code}</strong>
                        <span>
                          {department.parentDepartment?.name || "Sem departamento pai"}
                        </span>
                        <span>
                          {department.costCenter
                            ? `Centro de custo ${department.costCenter}`
                            : "Sem centro de custo"}
                        </span>
                      </div>
                      <div className="collaborators-row__branch">
                        <strong>{formatDepartmentStatus(department.status)}</strong>
                        <span>{department.branchNames.join(", ") || "Sem unidades vinculadas"}</span>
                        <span>
                          {department.employeeCount} colaborador
                          {department.employeeCount === 1 ? "" : "es"}
                        </span>
                      </div>
                      <div className="collaborators-row__status organization-departments-row__status">
                        <strong>
                          {department.manager?.fullName ||
                            department.managerName ||
                            "Sem gestor definido"}
                        </strong>
                        <span>{formatCurrency(department.budget)}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="collaborators-empty-state">
              <strong>Nenhum departamento encontrado</strong>
              <p>A busca atual não retornou departamentos persistidos na API.</p>
            </div>
          )}
        </div>
      </article>

      {selectedDepartment ? (
        <article className="content-panel collaborator-profile__notes-panel">
          <div className="section-heading">
            <div className="stack stack--xs">
              <h3>{selectedDepartment.name}</h3>
              <p className="workspace-copy">
                Código {selectedDepartment.code} ·{" "}
                {formatDepartmentStatus(selectedDepartment.status)}
              </p>
            </div>
            <button
              className="button button--secondary"
              onClick={() => openEditModal(selectedDepartment)}
              type="button"
            >
              <EditIcon />
              <span>Editar</span>
            </button>
          </div>

          <dl className="definition-list">
            <DetailItem
              label="Descrição"
              value={
                selectedDepartment.description || "Sem descrição operacional registrada."
              }
            />
            <DetailItem
              label="Departamento pai"
              value={selectedDepartment.parentDepartment?.name || "Não informado"}
            />
            <DetailItem
              label="Gestor"
              value={
                selectedDepartment.manager?.fullName ||
                selectedDepartment.managerName ||
                "Não informado"
              }
            />
            <DetailItem
              label="Centro de custo"
              value={selectedDepartment.costCenter || "Não informado"}
            />
            <DetailItem
              label="Orçamento"
              value={formatCurrency(selectedDepartment.budget)}
            />
            <DetailItem
              label="Total de colaboradores"
              value={String(selectedDepartment.employeeCount)}
            />
            <DetailItem
              label="Unidades"
              value={selectedDepartment.branchNames.join(", ") || "Sem unidades vinculadas"}
            />
            <DetailItem
              label="Subdepartamentos"
              value={
                selectedDepartment.subDepartments.map((item) => item.name).join(", ") ||
                "Nenhum subdepartamento"
              }
            />
          </dl>

          <div className="stack stack--xs">
            <p className="organization-pane-label">Observações</p>
            <p className="workspace-copy">
              {selectedDepartment.notes || "Sem observações registradas."}
            </p>
          </div>
        </article>
      ) : null}

      <DepartmentEditorModal
        branches={branches}
        department={editingDepartment}
        departments={departments}
        employees={employees}
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingDepartment(null);
          setError(null);
        }}
        onSubmit={handleSubmit}
      />
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function DepartmentEditorModal({
  branches,
  department,
  departments,
  employees,
  isOpen,
  onClose,
  onSubmit,
}: {
  branches: ServerBranch[];
  department: ServerDepartment | null;
  departments: ServerDepartment[];
  employees: ServerEmployee[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateDepartmentInput | UpdateDepartmentInput) => Promise<void>;
}) {
  const portalTarget = usePortalTarget();
  const [validationError, setValidationError] = useState<string | null>(null);
  const parentOptions = departments
    .filter((item) => item.id !== department?.id)
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  const managerOptions = employees
    .slice()
    .sort((left, right) => left.fullName.localeCompare(right.fullName, "pt-BR"));

  useEffect(() => {
    if (isOpen) {
      setValidationError(null);
    }
  }, [department?.id, isOpen]);

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
        aria-labelledby="department-editor-title"
        aria-modal="true"
        className="app-modal__dialog app-modal__dialog--role-editor"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="app-modal__header">
          <div className="stack stack--xs">
            <h2 id="department-editor-title">
              {department ? "Editar departamento" : "Novo departamento"}
            </h2>
            <p className="app-modal__description">
              Mantenha a estrutura do departamento com gestão, hierarquia e operação.
            </p>
          </div>
          <button
            aria-label="Fechar departamento"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </header>

        <form
          className="collaborator-role-form"
          onSubmit={(event) => {
            event.preventDefault();

            const formData = new FormData(event.currentTarget);
            const budgetValue = String(formData.get("budget") ?? "").trim();
            const parsedBudget = budgetValue
              ? Number.parseFloat(budgetValue.replace(",", "."))
              : null;

            if (budgetValue && !Number.isFinite(parsedBudget)) {
              setValidationError("Informe um orçamento numérico válido.");
              return;
            }

            setValidationError(null);
            const payload = {
              name: String(formData.get("name") ?? "").trim(),
              code:
                String(formData.get("code") ?? "").trim() ||
                buildDepartmentCode(String(formData.get("name") ?? "")),
              description: String(formData.get("description") ?? "").trim(),
              parentDepartmentId:
                String(formData.get("parentDepartmentId") ?? "").trim() || null,
              managerEmployeeId:
                String(formData.get("managerEmployeeId") ?? "").trim() || null,
              branchIds: formData
                .getAll("branchIds")
                .map((value) => String(value).trim())
                .filter(Boolean),
              budget: parsedBudget,
              costCenter: String(formData.get("costCenter") ?? "").trim(),
              notes: String(formData.get("notes") ?? "").trim(),
              ...(department
                ? {
                    status:
                      String(formData.get("status") ?? "active").trim() ===
                      "archived"
                        ? "archived"
                        : "active",
                  }
                : {}),
            } satisfies CreateDepartmentInput | UpdateDepartmentInput;

            void onSubmit(payload);
          }}
        >
          {validationError ? (
            <p className="collaborators-panel__feedback">{validationError}</p>
          ) : null}
          <div className="app-modal__body collaborator-role-form__body">
            <div className="field">
              <label htmlFor="department-name">Nome do departamento</label>
              <input
                autoFocus
                defaultValue={department?.name ?? ""}
                id="department-name"
                name="name"
                required
                type="text"
              />
            </div>
            <div className="field">
              <label htmlFor="department-code">Código</label>
              <input
                defaultValue={department?.code ?? ""}
                id="department-code"
                name="code"
                type="text"
              />
            </div>
            <div className="field">
              <label htmlFor="department-parent">Departamento pai</label>
              <select
                defaultValue={department?.parentDepartmentId ?? ""}
                id="department-parent"
                name="parentDepartmentId"
              >
                <option value="">Sem departamento pai</option>
                {parentOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="department-manager-employee">Gestor</label>
              <select
                defaultValue={department?.managerEmployeeId ?? ""}
                id="department-manager-employee"
                name="managerEmployeeId"
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
              <label htmlFor="department-cost-center">Centro de custo</label>
              <input
                defaultValue={department?.costCenter ?? ""}
                id="department-cost-center"
                name="costCenter"
                type="text"
              />
            </div>
            <div className="field">
              <label htmlFor="department-budget">Orçamento</label>
              <input
                defaultValue={
                  typeof department?.budget === "number" ? String(department.budget) : ""
                }
                id="department-budget"
                inputMode="decimal"
                name="budget"
                placeholder="Ex: 25000"
                type="number"
              />
            </div>
            {department ? (
              <div className="field">
                <label htmlFor="department-status">Status</label>
                <select
                  defaultValue={department.status}
                  id="department-status"
                  name="status"
                >
                  <option value="active">Ativo</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>
            ) : null}
            <div className="field field--wide">
              <label htmlFor="department-description">Descrição</label>
              <textarea
                defaultValue={department?.description ?? ""}
                id="department-description"
                name="description"
                rows={4}
              />
            </div>
            <div className="field field--wide">
              <label>Unidades</label>
              <div className="organization-checkbox-list">
                {branches.map((branch) => (
                  <label className="checkbox" key={branch.id}>
                    <input
                      defaultChecked={department?.branchIds.includes(branch.id) ?? false}
                      name="branchIds"
                      type="checkbox"
                      value={branch.id}
                    />
                    <span>{branch.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="field field--wide">
              <label htmlFor="department-notes">Observações</label>
              <textarea
                defaultValue={department?.notes ?? ""}
                id="department-notes"
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
              {department ? "Salvar departamento" : "Criar departamento"}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    portalTarget,
  );
}

function usePortalTarget() {
  return typeof document === "undefined" ? null : document.body;
}

function buildDepartmentCode(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}

function formatCurrency(value: number | null) {
  if (typeof value !== "number") {
    return "Orçamento não informado";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDepartmentStatus(status: ServerDepartment["status"]) {
  return status === "active" ? "Ativo" : "Arquivado";
}

function upsertDepartment(
  departments: ServerDepartment[],
  department: ServerDepartment,
) {
  const next = departments.filter((item) => item.id !== department.id);
  next.unshift(department);

  return next.sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}
