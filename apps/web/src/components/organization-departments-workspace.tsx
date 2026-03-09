"use client";

import {
  startTransition,
  type ChangeEvent,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  createInitialCollaborators,
  createInitialRoles,
  getDisplayValue,
  readStoredCollaborators,
  readStoredRoles,
  type CollaboratorRecord,
  type CollaboratorRoleRecord,
} from "@/lib/collaborators";
import type { ServerBranch } from "@/lib/server-api";

import { CloseIcon, MaterialIcon } from "./app-icons";
import {
  DEPARTMENT_MODAL_VISIBILITY_EVENT,
  OPEN_DEPARTMENT_CREATION_EVENT,
  OPEN_DEPARTMENT_EXPORT_EVENT,
  OPEN_DEPARTMENT_IMPORT_EVENT,
} from "./organization-departments-events";

type OrganizationDepartmentsWorkspaceProps = {
  branches: ServerBranch[];
};

type DepartmentStatusFilter = "all" | "active" | "archived";

type OrganizationDepartmentRecord = {
  activeCount: number;
  branchIds: string[];
  branchNames: string[];
  code: string;
  headcount: number;
  id: string;
  managerName: string;
  managerRole: string;
  name: string;
  notes: string;
  roleCount: number;
  status: Exclude<DepartmentStatusFilter, "all">;
};

type OrganizationDepartmentDraft = Omit<
  OrganizationDepartmentRecord,
  "activeCount" | "headcount" | "roleCount"
>;

const DEPARTMENTS_STORAGE_KEY = "daton:organization-departments";

export function OrganizationDepartmentsWorkspace({
  branches,
}: OrganizationDepartmentsWorkspaceProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [collaborators, setCollaborators] = useState<CollaboratorRecord[]>(() =>
    createInitialCollaborators(branches),
  );
  const [roles, setRoles] = useState<CollaboratorRoleRecord[]>(() =>
    createInitialRoles(createInitialCollaborators(branches)),
  );
  const [departmentDrafts, setDepartmentDrafts] = useState<
    OrganizationDepartmentDraft[]
  >([]);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState("department-editor-initial");
  const [searchInput, setSearchInput] = useState("");
  const [statusInput, setStatusInput] = useState<DepartmentStatusFilter>("all");
  const [branchInput, setBranchInput] = useState("all");
  const [showFilters, setShowFilters] = useState(true);
  const searchFieldRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const deferredSearchInput = useDeferredValue(searchInput);
  const searchValue = searchParams.get("departmentQ") ?? "";
  const statusFilter = getDepartmentStatusFilter(
    searchParams.get("departmentStatus"),
  );
  const branchFilter = searchParams.get("departmentBranch") ?? "all";

  useEffect(() => {
    const storedCollaborators = readStoredCollaborators();
    const nextCollaborators = storedCollaborators?.length
      ? storedCollaborators
      : createInitialCollaborators(branches);
    const storedRoles = readStoredRoles();

    setCollaborators(nextCollaborators);
    setRoles(
      storedRoles?.length ? storedRoles : createInitialRoles(nextCollaborators),
    );
    setDepartmentDrafts(readStoredDepartmentDrafts());
    setHasHydrated(true);
  }, [branches]);

  useEffect(() => {
    setSearchInput(searchValue);
  }, [searchValue]);

  useEffect(() => {
    setStatusInput(statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    setBranchInput(branchFilter);
  }, [branchFilter]);

  useEffect(() => {
    const openCreation = () => {
      setEditorKey(crypto.randomUUID());
      setIsEditorOpen(true);
    };
    const openImport = () => importFileInputRef.current?.click();
    const openExport = () => setIsExportOpen(true);

    window.addEventListener(OPEN_DEPARTMENT_CREATION_EVENT, openCreation);
    window.addEventListener(OPEN_DEPARTMENT_IMPORT_EVENT, openImport);
    window.addEventListener(OPEN_DEPARTMENT_EXPORT_EVENT, openExport);

    return () => {
      window.removeEventListener(OPEN_DEPARTMENT_CREATION_EVENT, openCreation);
      window.removeEventListener(OPEN_DEPARTMENT_IMPORT_EVENT, openImport);
      window.removeEventListener(OPEN_DEPARTMENT_EXPORT_EVENT, openExport);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(DEPARTMENT_MODAL_VISIBILITY_EVENT, {
        detail: {
          open: isEditorOpen || isExportOpen,
        },
      }),
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent(DEPARTMENT_MODAL_VISIBILITY_EVENT, {
          detail: { open: false },
        }),
      );
    };
  }, [isEditorOpen, isExportOpen]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    writeStoredDepartmentDrafts(departmentDrafts);
  }, [departmentDrafts, hasHydrated]);

  useEffect(() => {
    const normalizedSearch = deferredSearchInput.trim();
    const currentSearch = searchParams.get("departmentQ") ?? "";
    const currentStatus = getDepartmentStatusFilter(
      searchParams.get("departmentStatus"),
    );
    const currentBranch = searchParams.get("departmentBranch") ?? "all";

    if (
      currentSearch === normalizedSearch &&
      currentStatus === statusInput &&
      currentBranch === branchInput &&
      searchParams.get("tab") === "departments"
    ) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams.toString());

    nextSearchParams.set("tab", "departments");
    nextSearchParams.delete("branch");

    if (normalizedSearch) {
      nextSearchParams.set("departmentQ", normalizedSearch);
    } else {
      nextSearchParams.delete("departmentQ");
    }

    if (statusInput !== "all") {
      nextSearchParams.set("departmentStatus", statusInput);
    } else {
      nextSearchParams.delete("departmentStatus");
    }

    if (branchInput !== "all") {
      nextSearchParams.set("departmentBranch", branchInput);
    } else {
      nextSearchParams.delete("departmentBranch");
    }

    startTransition(() => {
      router.replace(`${pathname}?${nextSearchParams.toString()}`, {
        scroll: false,
      });
    });
  }, [branchInput, deferredSearchInput, pathname, router, searchParams, statusInput]);

  const departments = useMemo(
    () =>
      mergeDepartmentDrafts(
        buildDerivedDepartments({ branches, collaborators, roles }),
        departmentDrafts,
      ),
    [branches, collaborators, departmentDrafts, roles],
  );

  const branchOptions = useMemo(() => {
    const seen = new Set<string>();

    return departments
      .flatMap((department) =>
        department.branchIds.map((branchId, index) => ({
          id: branchId,
          name: department.branchNames[index] ?? "",
        })),
      )
      .filter((branch) => branch.id && branch.name)
      .filter((branch) => {
        if (seen.has(branch.id)) {
          return false;
        }

        seen.add(branch.id);
        return true;
      })
      .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  }, [departments]);

  const filteredDepartments = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLocaleLowerCase("pt-BR");

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
        department.branchNames.join(" "),
        department.managerName,
        department.managerRole,
        department.notes,
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedSearch);
    });
  }, [branchFilter, departments, searchValue, statusFilter]);

  const activeDepartments = departments.filter(
    (department) => department.status === "active",
  ).length;
  const representedBranches = new Set(
    departments.flatMap((department) => department.branchIds).filter(Boolean),
  ).size;

  async function handleImportChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        setFeedback(
          "O arquivo selecionado não possui nenhuma aba para importar departamentos.",
        );
        return;
      }

      const firstSheet = workbook.Sheets[firstSheetName];

      if (!firstSheet) {
        setFeedback(
          "Não foi possível ler a primeira aba do arquivo selecionado.",
        );
        return;
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        firstSheet,
        { defval: "" },
      );
      const importedDepartments = rows
        .map((row) => toDepartmentDraftFromSpreadsheetRow(row, branches))
        .filter(
          (department): department is OrganizationDepartmentDraft =>
            department !== null,
        );

      if (importedDepartments.length === 0) {
        setFeedback(
          "Nenhum departamento válido foi encontrado no arquivo selecionado.",
        );
        return;
      }

      startTransition(() => {
        setDepartmentDrafts((currentDrafts) =>
          mergeDepartmentDraftState(currentDrafts, importedDepartments),
        );
      });
      setFeedback(
        `${importedDepartments.length} departamento${importedDepartments.length > 1 ? "s foram importados" : " foi importado"} com sucesso.`,
      );
    } catch {
      setFeedback(
        "Não foi possível importar o arquivo. Verifique se ele está em CSV ou XLSX.",
      );
    } finally {
      event.currentTarget.value = "";
    }
  }

  async function handleExport(format: "csv" | "xlsx") {
    const rows = departments.map((department) => ({
      Departamento: department.name,
      Código: department.code,
      Unidades: department.branchNames.join(", "),
      Status: getDepartmentStatusLabel(department.status),
      Responsável: department.managerName,
      Cargo: department.managerRole,
      Colaboradores: department.headcount,
      Ativos: department.activeCount,
      Cargos: department.roleCount,
      Observações: department.notes,
    }));

    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const stamp = new Date().toISOString().slice(0, 10);

    if (format === "csv") {
      const csvContent = `\uFEFF${XLSX.utils.sheet_to_csv(worksheet)}`;
      const csvBlob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const downloadUrl = URL.createObjectURL(csvBlob);

      triggerDownload(downloadUrl, `departamentos-${stamp}.csv`);
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
      setIsExportOpen(false);
      return;
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Departamentos");
    XLSX.writeFileXLSX(workbook, `departamentos-${stamp}.xlsx`);
    setIsExportOpen(false);
  }

  function handleCreateDepartment(department: OrganizationDepartmentDraft) {
    setFeedback(null);
    startTransition(() => {
      setDepartmentDrafts((currentDrafts) =>
        mergeDepartmentDraftState(currentDrafts, [department]),
      );
    });
    setIsEditorOpen(false);
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
                      onChange={(event) =>
                        setSearchInput(event.currentTarget.value)
                      }
                      placeholder="Departamento, código, unidade ou responsável"
                      ref={searchFieldRef}
                      type="search"
                      value={searchInput}
                    />
                  </label>
                  <label className="collaborators-field collaborators-field--compact">
                    <span>Unidade</span>
                    <select
                      onChange={(event) => setBranchInput(event.currentTarget.value)}
                      value={branchInput}
                    >
                      <option value="all">Todas</option>
                      {branchOptions.map((branch) => (
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
                        setStatusInput(
                          event.currentTarget.value as DepartmentStatusFilter,
                        )
                      }
                      value={statusInput}
                    >
                      <option value="all">Todos</option>
                      <option value="active">Ativos</option>
                      <option value="archived">Arquivados</option>
                    </select>
                  </label>
                </div>
              
            </div>
          </div>

          {feedback ? (
            <p className="collaborators-panel__feedback">{feedback}</p>
          ) : null}

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
                    <div className="collaborators-row organization-departments-row">
                      <div className="collaborators-row__primary">
                        <div className="organization-departments-row__identity">
                          <div className="organization-departments-row__copy">
                            <strong>{department.name}</strong>
                            <span>
                              {department.notes.trim() || "Estrutura ativa da organização"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="collaborators-row__branch">
                        <h1>{department.code}</h1>
                        <p>
                          {department.headcount} colaborador
                          {department.headcount === 1 ? "" : "es"} •{" "}
                          {department.roleCount} cargo
                          {department.roleCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="collaborators-row__status organization-departments-row__status">
                        <strong>{getDepartmentStatusLabel(department.status)}</strong>
                      </div>
                      <div className="organization-departments-row__manager">
                        <strong>{getDisplayValue(department.managerName)}</strong>
                        <span>{getDisplayValue(department.managerRole)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="collaborators-empty-state">
              <strong>Nenhum departamento encontrado</strong>
              <p>
                Ajuste a busca, troque os filtros ou importe uma planilha para
                estruturar os departamentos da organização.
              </p>
            </div>
          )}
        </div>
      </article>

      <input
        accept=".csv,.xlsx,.xls"
        className="sr-only"
        onChange={handleImportChange}
        ref={importFileInputRef}
        type="file"
      />

      <DepartmentEditorModal
        branches={branches}
        collaborators={collaborators}
        editorKey={editorKey}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSubmit={handleCreateDepartment}
      />
      <DepartmentExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onExport={handleExport}
      />
    </section>
  );
}

function DepartmentEditorModal({
  branches,
  collaborators,
  editorKey,
  isOpen,
  onClose,
  onSubmit,
}: {
  branches: ServerBranch[];
  collaborators: CollaboratorRecord[];
  editorKey: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (department: OrganizationDepartmentDraft) => void;
}) {
  const portalTarget = usePortalTarget();
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const selectedManager =
    collaborators.find((collaborator) => collaborator.id === selectedManagerId) ??
    null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedManagerId("");
  }, [editorKey, isOpen]);

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

    return () => {
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
        aria-labelledby="department-editor-title"
        aria-modal="true"
        className="app-modal__dialog app-modal__dialog--role-editor"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="app-modal__header">
          <div className="stack stack--xs">
            <h2 id="department-editor-title">Novo departamento</h2>
            <p className="app-modal__description">
              Configure a estrutura base do departamento antes de vinculá-lo.
            </p>
          </div>
          <button
            aria-label="Fechar cadastro de departamento"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </header>

        <form
          className="collaborator-role-form"
          key={editorKey}
          onSubmit={(event) => {
            event.preventDefault();

            const formData = new FormData(event.currentTarget);
            const name = String(formData.get("name") ?? "").trim();
            const selectedBranchIds = formData
              .getAll("branchIds")
              .map((value) => String(value).trim())
              .filter(Boolean);
            const selectedBranches = branches.filter((branch) =>
              selectedBranchIds.includes(branch.id),
            );
            const managerCollaboratorId = String(
              formData.get("managerCollaboratorId") ?? "",
            ).trim();
            const managerCollaborator =
              collaborators.find(
                (collaborator) => collaborator.id === managerCollaboratorId,
              ) ?? null;

            if (!name) {
              return;
            }

            onSubmit({
              id: crypto.randomUUID(),
              name,
              code:
                String(formData.get("code") ?? "").trim() ||
                buildDepartmentCode(name),
              status:
                String(formData.get("status") ?? "active").trim() === "archived"
                  ? "archived"
                  : "active",
              branchIds: selectedBranches.map((branch) => branch.id),
              branchNames: selectedBranches.map((branch) => branch.name),
              managerName: managerCollaborator?.fullName ?? "",
              managerRole: managerCollaborator?.role ?? "",
              notes: String(formData.get("notes") ?? "").trim(),
            });
          }}
        >
          <div className="app-modal__body collaborator-role-form__body">
            <div className="field">
              <label htmlFor="department-name">Nome do departamento</label>
              <input
                autoFocus
                id="department-name"
                name="name"
                placeholder="Ex.: Operações"
                required
                type="text"
              />
            </div>
            <div className="field">
              <label htmlFor="department-code">Código</label>
              <input
                id="department-code"
                name="code"
                placeholder="Ex.: DEP-OPERACOES"
                type="text"
              />
            </div>
            <div className="field field--wide">
              <label>Unidades</label>
              <div className="organization-checkbox-list">
                {branches.map((branch) => (
                  <label className="checkbox" key={branch.id}>
                    <input name="branchIds" type="checkbox" value={branch.id} />
                    <span>{branch.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="department-status">Status</label>
              <select defaultValue="active" id="department-status" name="status">
                <option value="active">Ativo</option>
                <option value="archived">Arquivado</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="department-manager-name">Responsável</label>
              <select
                defaultValue=""
                id="department-manager-name"
                name="managerCollaboratorId"
                onChange={(event) => setSelectedManagerId(event.currentTarget.value)}
              >
                <option value="">Selecionar colaborador</option>
                {collaborators
                  .slice()
                  .sort((left, right) =>
                    left.fullName.localeCompare(right.fullName, "pt-BR"),
                  )
                  .map((collaborator) => (
                    <option key={collaborator.id} value={collaborator.id}>
                      {collaborator.fullName}
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="department-manager-role">Cargo do responsável</label>
              <input
                id="department-manager-role"
                disabled
                placeholder="Preenchido a partir do colaborador selecionado"
                value={selectedManager?.role ?? ""}
                readOnly
                type="text"
              />
            </div>
            <div className="field field--wide">
              <label htmlFor="department-notes">Observações</label>
              <textarea
                id="department-notes"
                name="notes"
                placeholder="Contexto, escopo ou observações rápidas sobre o departamento."
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
              Criar departamento
            </button>
          </footer>
        </form>
      </div>
    </div>,
    portalTarget,
  );
}

function DepartmentExportModal({
  isOpen,
  onClose,
  onExport,
}: {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: "csv" | "xlsx") => Promise<void>;
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

    return () => {
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
        aria-labelledby="department-export-title"
        aria-modal="true"
        className="app-modal__dialog app-modal__dialog--export"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="app-modal__header">
          <div className="stack stack--xs">
            <h2 id="department-export-title">
              Escolha o formato da base de departamentos
            </h2>
          </div>
          <button
            aria-label="Fechar exportação"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </header>
        <div className="app-modal__body collaborators-export__body">
          <div className="collaborators-export__actions">
            <button
              className="button button--secondary"
              onClick={() => void onExport("csv")}
              type="button"
            >
              Exportar CSV
            </button>
            <button className="button" onClick={() => void onExport("xlsx")} type="button">
              Exportar Excel
            </button>
          </div>
        </div>
      </div>
    </div>,
    portalTarget,
  );
}

function buildDerivedDepartments({
  branches,
  collaborators,
  roles,
}: {
  branches: ServerBranch[];
  collaborators: CollaboratorRecord[];
  roles: CollaboratorRoleRecord[];
}) {
  const departmentMap = new Map<
    string,
    {
      activeCount: number;
      branchCounts: Map<string, { id: string; name: string; total: number }>;
      collaborators: CollaboratorRecord[];
      manager: CollaboratorRecord | null;
      name: string;
      notes: string;
      roleNames: Set<string>;
      status: OrganizationDepartmentRecord["status"];
    }
  >();

  const ensureDepartment = (value: string) => {
    const name = value.trim();

    if (!name) {
      return null;
    }

    const key = normalizeDepartmentKey(name);
    const current = departmentMap.get(key);

    if (current) {
      return current;
    }

    const next = {
      activeCount: 0,
      branchCounts: new Map<string, { id: string; name: string; total: number }>(),
      collaborators: [],
      manager: null,
      name,
      notes: "",
      roleNames: new Set<string>(),
      status: "active" as OrganizationDepartmentRecord["status"],
    };

    departmentMap.set(key, next);
    return next;
  };

  collaborators.forEach((collaborator) => {
    const department = ensureDepartment(collaborator.department);

    if (!department) {
      return;
    }

    department.collaborators.push(collaborator);

    if (collaborator.role.trim()) {
      department.roleNames.add(collaborator.role.trim());
    }

    if (collaborator.notes.trim() && !department.notes) {
      department.notes = collaborator.notes.trim();
    }

    if (collaborator.status !== "Desligado") {
      department.activeCount += 1;
      department.status = "active";
    } else if (department.activeCount === 0) {
      department.status = "archived";
    }

    if (collaborator.branchName.trim()) {
      const branchKey = collaborator.branchId.trim() || collaborator.branchName.trim();
      const currentBranch = department.branchCounts.get(branchKey);

      department.branchCounts.set(branchKey, {
        id: collaborator.branchId.trim(),
        name: collaborator.branchName.trim(),
        total: (currentBranch?.total ?? 0) + 1,
      });
    }

    if (
      collaborator.status !== "Desligado" &&
      (!department.manager ||
        hasLeadershipRole(collaborator.role) ||
        !hasLeadershipRole(department.manager.role))
    ) {
      department.manager = collaborator;
    }
  });

  roles.forEach((role) => {
    const department = ensureDepartment(role.department);

    if (!department) {
      return;
    }

    if (role.title.trim()) {
      department.roleNames.add(role.title.trim());
    }

    if (role.description.trim() && !department.notes) {
      department.notes = role.description.trim();
    }
  });

  return Array.from(departmentMap.values())
    .map((department) => {
      const linkedBranches = Array.from(department.branchCounts.values()).sort(
        (left, right) => right.total - left.total || left.name.localeCompare(right.name, "pt-BR"),
      );
      const fallbackHeadquarters =
        branches.find((branch) => branch.isHeadquarters) ?? null;
      const branchIds =
        linkedBranches.length > 0
          ? linkedBranches.map((branch) => branch.id).filter(Boolean)
          : fallbackHeadquarters?.id
            ? [fallbackHeadquarters.id]
            : [];
      const branchNames =
        linkedBranches.length > 0
          ? linkedBranches.map((branch) => branch.name).filter(Boolean)
          : fallbackHeadquarters?.name
            ? [fallbackHeadquarters.name]
            : [];

      return {
        activeCount: department.activeCount,
        branchIds,
        branchNames,
        code: buildDepartmentCode(department.name),
        headcount: department.collaborators.length,
        id: `department:${normalizeDepartmentKey(department.name)}`,
        managerName: department.manager?.fullName ?? "",
        managerRole: department.manager?.role ?? "",
        name: department.name,
        notes: department.notes,
        roleCount: department.roleNames.size,
        status:
          department.activeCount > 0
            ? "active"
            : department.collaborators.length > 0
              ? "archived"
              : "active",
      } satisfies OrganizationDepartmentRecord;
    })
    .sort(
      (left, right) =>
        Number(right.status === "active") - Number(left.status === "active") ||
        left.name.localeCompare(right.name, "pt-BR"),
    );
}

function mergeDepartmentDrafts(
  derivedDepartments: OrganizationDepartmentRecord[],
  drafts: OrganizationDepartmentDraft[],
) {
  const merged = new Map(
    derivedDepartments.map((department) => [
      normalizeDepartmentKey(department.name || department.code),
      department,
    ]),
  );

  drafts.forEach((draft) => {
    const key = normalizeDepartmentKey(draft.name || draft.code);
    const currentDepartment = merged.get(key);

    if (currentDepartment) {
      merged.set(key, {
        ...currentDepartment,
        ...draft,
      });
      return;
    }

    merged.set(key, {
      ...draft,
      activeCount: 0,
      headcount: 0,
      roleCount: 0,
    });
  });

  return Array.from(merged.values()).sort(
    (left, right) =>
      Number(right.status === "active") - Number(left.status === "active") ||
      left.name.localeCompare(right.name, "pt-BR"),
  );
}

function mergeDepartmentDraftState(
  currentDrafts: OrganizationDepartmentDraft[],
  incomingDrafts: OrganizationDepartmentDraft[],
) {
  const drafts = new Map(
    currentDrafts.map((draft) => [
      normalizeDepartmentKey(draft.name || draft.code),
      draft,
    ]),
  );

  incomingDrafts.forEach((draft) => {
    drafts.set(normalizeDepartmentKey(draft.name || draft.code), draft);
  });

  return Array.from(drafts.values()).sort((left, right) =>
    left.name.localeCompare(right.name, "pt-BR"),
  );
}

function getDepartmentStatusFilter(value: string | null) {
  if (value === "active" || value === "archived") {
    return value;
  }

  return "all";
}

function getDepartmentStatusLabel(value: OrganizationDepartmentRecord["status"]) {
  return value === "active" ? "Ativo" : "Desativado";
}

function buildDepartmentCode(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();

  return normalized ? `DEP-${normalized}` : `DEP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function normalizeDepartmentKey(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasLeadershipRole(value: string) {
  return /(coordenador|gerente|lider|líder|head|supervisor|diretor)/i.test(
    value,
  );
}

function readStoredDepartmentDrafts() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(DEPARTMENTS_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => sanitizeDepartmentDraft(item))
      .filter(
        (department): department is OrganizationDepartmentDraft =>
          department !== null,
      );
  } catch {
    return [];
  }
}

function writeStoredDepartmentDrafts(drafts: OrganizationDepartmentDraft[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(DEPARTMENTS_STORAGE_KEY, JSON.stringify(drafts));
  } catch {}
}

function sanitizeDepartmentDraft(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const name = toTrimmedString(record.name);

  if (!name) {
    return null;
  }

  return {
    id: toTrimmedString(record.id) || crypto.randomUUID(),
    name,
    code: toTrimmedString(record.code) || buildDepartmentCode(name),
    status: toTrimmedString(record.status) === "archived" ? "archived" : "active",
    branchIds: normalizeStoredArray(record.branchIds, record.branchId),
    branchNames: normalizeStoredArray(record.branchNames, record.branchName),
    managerName: toTrimmedString(record.managerName),
    managerRole: toTrimmedString(record.managerRole),
    notes: toTrimmedString(record.notes),
  } satisfies OrganizationDepartmentDraft;
}

function toDepartmentDraftFromSpreadsheetRow(
  row: Record<string, unknown>,
  branches: ServerBranch[],
) {
  const name = readSpreadsheetValue(row, [
    "Departamento",
    "department",
    "departamento",
    "Nome",
    "name",
  ]);

  if (!name) {
    return null;
  }

  const rawBranchNames = readSpreadsheetValue(row, [
    "Unidades",
    "Unidade",
    "Filial",
    "branchNames",
    "branchName",
  ]);
  const rawBranchIds = readSpreadsheetValue(row, [
    "branchIds",
    "branchId",
    "Filial ID",
    "Unidade ID",
  ]);
  const selectedBranchIds = splitListValue(rawBranchIds);
  const selectedBranchNames = splitListValue(rawBranchNames);
  const matchedBranches = branches.filter(
    (branch) =>
      selectedBranchIds.includes(branch.id) ||
      selectedBranchNames.some(
        (branchName) =>
          branch.name.toLocaleLowerCase("pt-BR") ===
          branchName.toLocaleLowerCase("pt-BR"),
      ),
  );
  const branchIds = matchedBranches.map((branch) => branch.id);
  const branchNames = matchedBranches.map((branch) => branch.name);

  return {
    id: crypto.randomUUID(),
    name,
    code: readSpreadsheetValue(row, ["Código", "code", "codigo"]) || buildDepartmentCode(name),
    status:
      readSpreadsheetValue(row, ["Status", "status"]).toLocaleLowerCase("pt-BR") ===
      "arquivado"
        ? "archived"
        : "active",
    branchIds: branchIds.length > 0 ? branchIds : selectedBranchIds,
    branchNames: branchNames.length > 0 ? branchNames : selectedBranchNames,
    managerName: readSpreadsheetValue(row, [
      "Responsável",
      "managerName",
      "Gestor",
    ]),
    managerRole: readSpreadsheetValue(row, ["Cargo", "managerRole", "role"]),
    notes: readSpreadsheetValue(row, ["Observações", "notes", "descricao"]),
  } satisfies OrganizationDepartmentDraft;
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

function toTrimmedString(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function normalizeStoredArray(value: unknown, fallback?: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => toTrimmedString(item))
      .filter(Boolean);
  }

  const normalizedFallback = toTrimmedString(value) || toTrimmedString(fallback);

  if (!normalizedFallback) {
    return [];
  }

  return splitListValue(normalizedFallback);
}

function splitListValue(value: string) {
  return value
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function triggerDownload(href: string, fileName: string) {
  const anchor = document.createElement("a");

  anchor.href = href;
  anchor.download = fileName;
  anchor.click();
}

function usePortalTarget() {
  return useMemo(
    () => (typeof document === "undefined" ? null : document.body),
    [],
  );
}
