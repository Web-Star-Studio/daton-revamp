"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
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
import type { ServerBranch, ServerOrganizationMember } from "@/lib/server-api";

import { CloseIcon, EditIcon } from "./app-icons";
import { DEPARTMENT_MODAL_VISIBILITY_EVENT } from "./organization-departments-events";

type OrganizationDepartmentsWorkspaceProps = {
  branches: ServerBranch[];
  initialDepartments: ServerDepartment[];
  members: ServerOrganizationMember[];
};

export function OrganizationDepartmentsWorkspace({
  branches,
  initialDepartments,
  members,
}: OrganizationDepartmentsWorkspaceProps) {
  const router = useRouter();
  const [departments, setDepartments] = useState(initialDepartments);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<ServerDepartment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExportPending, setIsExportPending] = useState(false);
  const deferredSearchValue = useDeferredValue(searchValue);

  useEffect(() => {
    setDepartments(initialDepartments);
  }, [initialDepartments]);

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

  const filteredDepartments = useMemo(() => {
    const normalizedSearch = deferredSearchValue.trim().toLocaleLowerCase("pt-BR");

    return departments.filter((department) => {
      if (statusFilter !== "all" && department.status !== statusFilter) {
        return false;
      }

      if (
        branchFilter !== "all" &&
        !department.branchIds.includes(branchFilter)
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        department.name,
        department.code,
        department.managerName ?? "",
        department.notes ?? "",
        department.branchNames.join(" "),
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedSearch);
    });
  }, [branchFilter, deferredSearchValue, departments, statusFilter]);

  const selectedDepartment = filteredDepartments[0] ?? null;

  async function handleExport() {
    setIsExportPending(true);

    try {
      const rows = departments.map((department) => ({
        Departamento: department.name,
        Código: department.code,
        Status: department.status === "active" ? "Ativo" : "Arquivado",
        Responsável: department.managerName ?? "",
        Unidades: department.branchNames.join(", "),
        Observações: department.notes ?? "",
      }));

      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      const stamp = new Date().toISOString().slice(0, 10);

      XLSX.utils.book_append_sheet(workbook, worksheet, "Departamentos");
      XLSX.writeFileXLSX(workbook, `departamentos-${stamp}.xlsx`);
    } finally {
      setIsExportPending(false);
    }
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
                    placeholder="Departamento, código, unidade ou responsável"
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
              <div className="organization-departments-toolbar__actions">
                <button
                  className="button button--secondary"
                  disabled={isExportPending}
                  onClick={() => void handleExport()}
                  type="button"
                >
                  Exportar
                </button>
                <button className="button" onClick={openCreateModal} type="button">
                  Novo departamento
                </button>
              </div>
            </div>
          </div>

          {error ? <p className="collaborators-panel__feedback">{error}</p> : null}

          {filteredDepartments.length > 0 ? (
            <div className="collaborators-table organization-departments-table">
              <div className="collaborators-table__head organization-departments-table__head">
                <span>Departamento</span>
                <span>Identificação</span>
                <span>Status</span>
                <span>Responsável</span>
              </div>
              <ul className="collaborators-table__body">
                {filteredDepartments.map((department) => (
                  <li key={department.id}>
                    <button
                      className="collaborators-row organization-departments-row collaborators-row--interactive"
                      onClick={() => openEditModal(department)}
                      type="button"
                    >
                      <div className="collaborators-row__primary">
                        <div className="organization-departments-row__identity">
                          <div className="organization-departments-row__copy">
                            <strong>{department.name}</strong>
                            <span>
                              {department.notes?.trim() ||
                                "Departamento persistido no backend"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="collaborators-row__branch">
                        <h1>{department.code}</h1>
                        <p>{department.branchNames.join(", ") || "Sem unidades vinculadas"}</p>
                      </div>
                      <div className="collaborators-row__status organization-departments-row__status">
                        <strong>
                          {department.status === "active" ? "Ativo" : "Arquivado"}
                        </strong>
                      </div>
                      <div className="organization-departments-row__manager">
                        <strong>{department.managerName ?? "Sem responsável"}</strong>
                        <span>{department.managerMemberId ?? "Sem vínculo de membro"}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="collaborators-empty-state">
              <strong>Nenhum departamento encontrado</strong>
              <p>
                A busca atual não retornou departamentos persistidos na API.
              </p>
            </div>
          )}
        </div>
      </article>

      {selectedDepartment ? (
        <article className="content-panel collaborator-profile__notes-panel">
          <div className="section-heading">
            <h3>{selectedDepartment.name}</h3>
            <button
              className="button button--secondary"
              onClick={() => openEditModal(selectedDepartment)}
              type="button"
            >
              <EditIcon />
              <span>Editar</span>
            </button>
          </div>
          <p className="workspace-copy">
            Código {selectedDepartment.code} ·{" "}
            {selectedDepartment.status === "active" ? "Ativo" : "Arquivado"}
          </p>
          <p className="workspace-copy">
            Responsável: {selectedDepartment.managerName ?? "Sem responsável"}
          </p>
          <p className="workspace-copy">
            Unidades:{" "}
            {selectedDepartment.branchNames.join(", ") || "Sem unidades vinculadas"}
          </p>
          <p className="workspace-copy">
            {selectedDepartment.notes?.trim() || "Sem observações registradas."}
          </p>
        </article>
      ) : null}

      <DepartmentEditorModal
        branches={branches}
        department={editingDepartment}
        isOpen={isEditorOpen}
        members={members}
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

function DepartmentEditorModal({
  branches,
  department,
  isOpen,
  members,
  onClose,
  onSubmit,
}: {
  branches: ServerBranch[];
  department: ServerDepartment | null;
  isOpen: boolean;
  members: ServerOrganizationMember[];
  onClose: () => void;
  onSubmit: (payload: CreateDepartmentInput | UpdateDepartmentInput) => Promise<void>;
}) {
  const portalTarget = usePortalTarget();

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
              Salve a estrutura do departamento diretamente no backend.
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
            const payload = {
              name: String(formData.get("name") ?? "").trim(),
              code:
                String(formData.get("code") ?? "").trim() ||
                buildDepartmentCode(String(formData.get("name") ?? "")),
              branchIds: formData
                .getAll("branchIds")
                .map((value) => String(value).trim())
                .filter(Boolean),
              managerMemberId:
                String(formData.get("managerMemberId") ?? "").trim() || null,
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
            <div className="field">
              <label htmlFor="department-manager-member">Responsável</label>
              <select
                defaultValue={department?.managerMemberId ?? ""}
                id="department-manager-member"
                name="managerMemberId"
              >
                <option value="">Sem responsável</option>
                {members
                  .slice()
                  .sort((left, right) =>
                    left.fullName.localeCompare(right.fullName, "pt-BR"),
                  )
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.fullName} • {member.email}
                    </option>
                  ))}
              </select>
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

function upsertDepartment(
  departments: ServerDepartment[],
  department: ServerDepartment,
) {
  const next = departments.filter((item) => item.id !== department.id);
  next.unshift(department);

  return next.sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}
