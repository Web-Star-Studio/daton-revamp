"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

import {
  createInitialRoles,
  getDisplayValue,
  collaboratorStatuses,
  createInitialCollaborators,
  exportColumns,
  formatDateLabel,
  getCollaboratorStatusClass,
  getRoleAssociationKey,
  mergeCollaborators,
  mergeRoles,
  readStoredCollaborators,
  readStoredRoles,
  roleExportColumns,
  toCollaboratorFromSpreadsheetRow,
  toRoleFromSpreadsheetRow,
  writeStoredCollaborators,
  writeStoredRoles,
  type CollaboratorRecord,
  type CollaboratorRoleRecord,
  type CollaboratorStatus,
} from "@/lib/collaborators";
import type { ServerBranch } from "@/lib/server-api";

import { CollaboratorEditorModal } from "./collaborator-editor-modal";
import { CollaboratorRoleEditorModal } from "./collaborator-role-editor-modal";
import {
  COLLABORATOR_MODAL_VISIBILITY_EVENT,
  OPEN_COLLABORATOR_CREATION_EVENT,
  OPEN_COLLABORATOR_EXPORT_EVENT,
  OPEN_COLLABORATOR_IMPORT_EVENT,
  OPEN_ROLE_CREATION_EVENT,
  OPEN_ROLE_EDITION_EVENT,
  OPEN_ROLE_EXPORT_EVENT,
  OPEN_ROLE_IMPORT_EVENT,
} from "./collaborators-events";

type CollaboratorsWorkspaceProps = {
  branches: ServerBranch[];
};

export function CollaboratorsWorkspace({
  branches,
}: CollaboratorsWorkspaceProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [collaborators, setCollaborators] = useState<CollaboratorRecord[]>(() =>
    createInitialCollaborators(branches),
  );
  const [roles, setRoles] = useState<CollaboratorRoleRecord[]>(() =>
    createInitialRoles(createInitialCollaborators(branches)),
  );
  const [searchValue, setSearchValue] = useState("");
  const [roleSearchValue, setRoleSearchValue] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue);
  const deferredRoleSearchValue = useDeferredValue(roleSearchValue);
  const [statusFilter, setStatusFilter] = useState<
    CollaboratorStatus | "Todos"
  >("Todos");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCollaboratorExportOpen, setIsCollaboratorExportOpen] =
    useState(false);
  const [isRoleEditorOpen, setIsRoleEditorOpen] = useState(false);
  const [isRoleExportOpen, setIsRoleExportOpen] = useState(false);
  const [editorKey, setEditorKey] = useState("collaborator-editor-initial");
  const [roleEditorKey, setRoleEditorKey] = useState("role-editor-initial");
  const [editingRole, setEditingRole] = useState<CollaboratorRoleRecord | null>(
    null,
  );
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [roleFeedback, setRoleFeedback] = useState<string | null>(null);
  const [hasHydratedCollaborators, setHasHydratedCollaborators] =
    useState(false);
  const collaboratorFileInputRef = useRef<HTMLInputElement>(null);
  const roleFileInputRef = useRef<HTMLInputElement>(null);
  const activeTab = searchParams.get("tab") === "roles" ? "roles" : "overview";
  const selectedRoleId = searchParams.get("role") ?? "";

  useEffect(() => {
    const openEditor = () => {
      setEditorKey(crypto.randomUUID());
      setIsEditorOpen(true);
    };
    const openImport = () => collaboratorFileInputRef.current?.click();
    const openExport = () => setIsCollaboratorExportOpen(true);
    const openRoleEditor = () => {
      setEditingRole(null);
      setRoleEditorKey(crypto.randomUUID());
      setIsRoleEditorOpen(true);
    };
    const openSelectedRoleEditor = (event: Event) => {
      const roleId = (event as CustomEvent<{ roleId?: string }>).detail?.roleId;

      if (!roleId) {
        return;
      }

      const roleToEdit = roles.find((role) => role.id === roleId);

      if (!roleToEdit) {
        return;
      }

      setEditingRole(roleToEdit);
      setRoleEditorKey(crypto.randomUUID());
      setIsRoleEditorOpen(true);
    };
    const openRoleImport = () => roleFileInputRef.current?.click();
    const openRoleExport = () => setIsRoleExportOpen(true);

    window.addEventListener(OPEN_COLLABORATOR_CREATION_EVENT, openEditor);
    window.addEventListener(OPEN_COLLABORATOR_IMPORT_EVENT, openImport);
    window.addEventListener(OPEN_COLLABORATOR_EXPORT_EVENT, openExport);
    window.addEventListener(OPEN_ROLE_CREATION_EVENT, openRoleEditor);
    window.addEventListener(OPEN_ROLE_EDITION_EVENT, openSelectedRoleEditor);
    window.addEventListener(OPEN_ROLE_IMPORT_EVENT, openRoleImport);
    window.addEventListener(OPEN_ROLE_EXPORT_EVENT, openRoleExport);

    return () => {
      window.removeEventListener(OPEN_COLLABORATOR_CREATION_EVENT, openEditor);
      window.removeEventListener(OPEN_COLLABORATOR_IMPORT_EVENT, openImport);
      window.removeEventListener(OPEN_COLLABORATOR_EXPORT_EVENT, openExport);
      window.removeEventListener(OPEN_ROLE_CREATION_EVENT, openRoleEditor);
      window.removeEventListener(
        OPEN_ROLE_EDITION_EVENT,
        openSelectedRoleEditor,
      );
      window.removeEventListener(OPEN_ROLE_IMPORT_EVENT, openRoleImport);
      window.removeEventListener(OPEN_ROLE_EXPORT_EVENT, openRoleExport);
    };
  }, [roles]);

  useEffect(() => {
    const storedCollaborators = readStoredCollaborators();
    const storedRoles = readStoredRoles();
    const nextCollaborators = storedCollaborators?.length
      ? storedCollaborators
      : createInitialCollaborators(branches);

    setCollaborators(nextCollaborators);

    if (storedRoles?.length) {
      setRoles(storedRoles);
    } else {
      setRoles(createInitialRoles(nextCollaborators));
    }

    setHasHydratedCollaborators(true);
  }, []);

  useEffect(() => {
    if (!hasHydratedCollaborators) {
      return;
    }

    writeStoredCollaborators(collaborators);
  }, [collaborators, hasHydratedCollaborators]);

  useEffect(() => {
    if (!hasHydratedCollaborators) {
      return;
    }

    writeStoredRoles(roles);
  }, [roles, hasHydratedCollaborators]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(COLLABORATOR_MODAL_VISIBILITY_EVENT, {
        detail: {
          open:
            isEditorOpen ||
            isCollaboratorExportOpen ||
            isRoleEditorOpen ||
            isRoleExportOpen,
        },
      }),
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent(COLLABORATOR_MODAL_VISIBILITY_EVENT, {
          detail: { open: false },
        }),
      );
    };
  }, [
    isCollaboratorExportOpen,
    isEditorOpen,
    isRoleEditorOpen,
    isRoleExportOpen,
  ]);

  const normalizedSearch = deferredSearchValue.trim().toLowerCase();
  const normalizedRoleSearch = deferredRoleSearchValue.trim().toLowerCase();
  const filteredCollaborators = collaborators.filter((collaborator) => {
    if (statusFilter !== "Todos" && collaborator.status !== statusFilter) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return [
      collaborator.fullName,
      collaborator.cpf,
      collaborator.department,
      collaborator.role,
      collaborator.branchName,
      collaborator.email,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
  });
  const filteredRoles = roles.filter((role) => {
    if (!normalizedRoleSearch) {
      return true;
    }

    return [
      role.title,
      role.department,
      role.educationRequirement,
      role.employmentType,
      role.requirements,
      role.responsibilities,
      role.description,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedRoleSearch);
  });
  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );
  const departmentOptions = useMemo(() => {
    const departments = new Set<string>();

    roles.forEach((role) => {
      if (role.department.trim()) {
        departments.add(role.department.trim());
      }
    });

    return Array.from(departments).sort((left, right) =>
      left.localeCompare(right, "pt-BR"),
    );
  }, [roles]);

  const activeCollaborators = collaborators.filter(
    (collaborator) => collaborator.status === "Ativo",
  ).length;
  const representedBranches = new Set(
    collaborators
      .map((collaborator) => collaborator.branchName)
      .filter(Boolean),
  ).size;

  async function handleCollaboratorImportChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        setImportFeedback(
          "O arquivo selecionado não possui nenhuma aba para importar.",
        );
        return;
      }

      const firstSheet = workbook.Sheets[firstSheetName];

      if (!firstSheet) {
        setImportFeedback(
          "Não foi possível ler a primeira aba do arquivo selecionado.",
        );
        return;
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        firstSheet,
        { defval: "" },
      );
      const importedCollaborators = rows
        .map((row) => toCollaboratorFromSpreadsheetRow(row, branches))
        .filter(
          (collaborator): collaborator is CollaboratorRecord =>
            collaborator !== null,
        );

      if (importedCollaborators.length === 0) {
        setImportFeedback(
          "Nenhum colaborador válido foi encontrado no arquivo selecionado.",
        );
        return;
      }

      startTransition(() => {
        setCollaborators((currentCollaborators) => {
          const nextCollaborators = mergeCollaborators(
            currentCollaborators,
            importedCollaborators,
          );

          writeStoredCollaborators(nextCollaborators);
          return nextCollaborators;
        });
        setRoles((currentRoles) => {
          const nextRoles = mergeRoles(
            currentRoles,
            createInitialRoles(importedCollaborators),
          );

          writeStoredRoles(nextRoles);
          return nextRoles;
        });
      });
      setImportFeedback(
        `${importedCollaborators.length} colaborador${importedCollaborators.length > 1 ? "es foram importados" : " foi importado"} com sucesso.`,
      );
    } catch {
      setImportFeedback(
        "Não foi possível importar o arquivo. Verifique se ele está em CSV ou XLSX.",
      );
    } finally {
      event.currentTarget.value = "";
    }
  }

  async function handleCollaboratorExport(format: "csv" | "xlsx") {
    const rows = collaborators.map((collaborator) =>
      Object.fromEntries(
        exportColumns.map((column) => [column.label, collaborator[column.key]]),
      ),
    );

    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const stamp = new Date().toISOString().slice(0, 10);

    if (format === "csv") {
      const csvContent = `\uFEFF${XLSX.utils.sheet_to_csv(worksheet)}`;
      const csvBlob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const downloadUrl = URL.createObjectURL(csvBlob);

      triggerDownload(downloadUrl, `colaboradores-${stamp}.csv`);
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
      setIsCollaboratorExportOpen(false);
      return;
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Colaboradores");
    XLSX.writeFileXLSX(workbook, `colaboradores-${stamp}.xlsx`);
    setIsCollaboratorExportOpen(false);
  }

  async function handleRoleImportChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        setRoleFeedback(
          "O arquivo selecionado não possui nenhuma aba para importar cargos.",
        );
        return;
      }

      const firstSheet = workbook.Sheets[firstSheetName];

      if (!firstSheet) {
        setRoleFeedback(
          "Não foi possível ler a primeira aba do arquivo selecionado.",
        );
        return;
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        firstSheet,
        { defval: "" },
      );
      const importedRoles = rows
        .map((row) => toRoleFromSpreadsheetRow(row))
        .filter((role): role is CollaboratorRoleRecord => role !== null);

      if (importedRoles.length === 0) {
        setRoleFeedback(
          "Nenhum cargo válido foi encontrado no arquivo selecionado.",
        );
        return;
      }

      startTransition(() => {
        setRoles((currentRoles) => {
          const nextRoles = mergeRoles(currentRoles, importedRoles);

          writeStoredRoles(nextRoles);
          return nextRoles;
        });
      });
      setRoleFeedback(
        `${importedRoles.length} cargo${importedRoles.length > 1 ? "s foram importados" : " foi importado"} com sucesso.`,
      );
    } catch {
      setRoleFeedback(
        "Não foi possível importar o arquivo. Verifique se ele está em CSV ou XLSX.",
      );
    } finally {
      event.currentTarget.value = "";
    }
  }

  async function handleRoleExport(format: "csv" | "xlsx") {
    const rows = roles.map((role) =>
      Object.fromEntries(
        roleExportColumns.map((column) => [column.label, role[column.key]]),
      ),
    );

    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const stamp = new Date().toISOString().slice(0, 10);

    if (format === "csv") {
      const csvContent = `\uFEFF${XLSX.utils.sheet_to_csv(worksheet)}`;
      const csvBlob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const downloadUrl = URL.createObjectURL(csvBlob);

      triggerDownload(downloadUrl, `cargos-${stamp}.csv`);
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
      setIsRoleExportOpen(false);
      return;
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cargos");
    XLSX.writeFileXLSX(workbook, `cargos-${stamp}.xlsx`);
    setIsRoleExportOpen(false);
  }

  function handleCreateCollaborator(collaborator: CollaboratorRecord) {
    setImportFeedback(null);
    startTransition(() => {
      setCollaborators((currentCollaborators) => {
        const nextCollaborators = [collaborator, ...currentCollaborators];

        writeStoredCollaborators(nextCollaborators);
        return nextCollaborators;
      });
      setRoles((currentRoles) => {
        const nextRoles = mergeRoles(
          currentRoles,
          createInitialRoles([collaborator]),
        );

        writeStoredRoles(nextRoles);
        return nextRoles;
      });
    });
    setIsEditorOpen(false);
  }

  function handleSaveRole(role: CollaboratorRoleRecord) {
    setRoleFeedback(null);
    startTransition(() => {
      setRoles((currentRoles) => {
        const nextRoles = mergeRoles(currentRoles, [role]);

        writeStoredRoles(nextRoles);
        return nextRoles;
      });
    });
    setEditingRole(null);
    setIsRoleEditorOpen(false);
  }

  function toggleRoleSelection(roleId: string) {
    const nextSearchParams = new URLSearchParams(searchParams.toString());

    nextSearchParams.set("tab", "roles");

    if (selectedRoleId === roleId) {
      nextSearchParams.delete("role");
    } else {
      nextSearchParams.set("role", roleId);
    }

    const nextQuery = nextSearchParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }

  const tabs = [
    {
      key: "overview",
      label: "Visão geral",
      href: `${pathname}`,
    },
    {
      key: "roles",
      label: "Cargos",
      href: `${pathname}?tab=roles`,
    },
  ] as const;

  return (
    <section className="workspace-section workspace-section--fill collaborators-page">
      <nav aria-label="Seções de colaboradores" className="workspace-tabs">
        {tabs.map((tab) => (
          <Link
            aria-current={activeTab === tab.key ? "page" : undefined}
            className={`workspace-tabs__link${activeTab === tab.key ? " workspace-tabs__link--active" : ""}`}
            href={tab.href}
            key={tab.key}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <article className="detail-grid collaborators-page__grid">
        <div className="content-panel content-panel--fill">
          {activeTab === "overview" ? (
            <>
              <div className="section-heading collaborators-panel__header">
                <div className="collaborators-panel__filters">
                  <label className="collaborators-field collaborators-field--search">
                    <span>Buscar</span>
                    <input
                      onChange={(event) =>
                        setSearchValue(event.currentTarget.value)
                      }
                      placeholder="Nome, CPF, filial, cargo ou e-mail"
                      type="search"
                      value={searchValue}
                    />
                  </label>
                  <label className="collaborators-field collaborators-field--compact">
                    <span>Status</span>
                    <select
                      onChange={(event) =>
                        setStatusFilter(
                          event.currentTarget.value as
                            | CollaboratorStatus
                            | "Todos",
                        )
                      }
                      value={statusFilter}
                    >
                      <option value="Todos">Todos</option>
                      {collaboratorStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {importFeedback ? (
                <p className="collaborators-panel__feedback">
                  {importFeedback}
                </p>
              ) : null}

              {filteredCollaborators.length > 0 ? (
                <div className="collaborators-table">
                  <div className="collaborators-table__head">
                    <span>Colaborador</span>
                    <span>Cargo / Departamento</span>
                    <span>Filial</span>
                    <span>Status</span>
                  </div>
                  <ul className="collaborators-table__body">
                    {filteredCollaborators.map((collaborator) => (
                      <li key={collaborator.id}>
                        <Link
                          className="collaborators-row collaborators-row--interactive"
                          href={`/app/social/collaborators/${collaborator.id}`}
                        >
                          <div className="collaborators-row__primary">
                            <strong>{collaborator.fullName}</strong>
                            <span>{collaborator.cpf}</span>
                            <span>
                              {collaborator.email || "Sem e-mail informado"}
                            </span>
                          </div>
                          <div className="collaborators-row__secondary">
                            <strong>
                              {collaborator.role || "Cargo não informado"}
                            </strong>
                            <span>
                              {collaborator.department ||
                                "Departamento não informado"}
                            </span>
                            <span>{collaborator.employmentType}</span>
                          </div>
                          <div className="collaborators-row__branch">
                            <strong>
                              {collaborator.branchName || "Sem filial"}
                            </strong>
                            <span>
                              {collaborator.additionalLocation ||
                                "Sem localização adicional"}
                            </span>
                            <span>
                              Admissão: {formatDateLabel(collaborator.hireDate)}
                            </span>
                          </div>
                          <div className="collaborators-row__status">
                            <span
                              className={getCollaboratorStatusClass(
                                collaborator.status,
                              )}
                            >
                              {collaborator.status}
                            </span>
                            <span>{collaborator.phone || "Sem telefone"}</span>
                            <span>
                              {collaborator.terminationDate
                                ? `Desligamento: ${formatDateLabel(collaborator.terminationDate)}`
                                : `Nascimento: ${formatDateLabel(collaborator.birthDate)}`}
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="collaborators-empty-state">
                  <strong>Nenhum colaborador encontrado</strong>
                  <p>
                    Ajuste a busca, mude o filtro ou importe uma planilha para
                    popular a base.
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="section-heading collaborators-panel__header">
                <div className="collaborators-panel__filters collaborators-panel__filters--single">
                  <label className="collaborators-field collaborators-field--search">
                    <span>Buscar</span>
                    <input
                      onChange={(event) =>
                        setRoleSearchValue(event.currentTarget.value)
                      }
                      placeholder="Cargo, departamento, contrato ou descrição"
                      type="search"
                      value={roleSearchValue}
                    />
                  </label>
                </div>
              </div>

              {roleFeedback ? (
                <p className="collaborators-panel__feedback">{roleFeedback}</p>
              ) : null}

              {filteredRoles.length > 0 ? (
                <div className="collaborators-table collaborators-table--roles">
                  <div className="collaborators-table__head collaborators-table__head--roles">
                    <span>Cargo</span>
                    <span>Departamento / Contrato</span>
                    <span>Colaboradores associados</span>
                  </div>
                  <ul className="collaborators-table__body">
                    {filteredRoles.map((role) => {
                      const relatedCollaborators = collaborators.filter(
                        (collaborator) =>
                          getRoleAssociationKey(
                            collaborator.role,
                            collaborator.department,
                          ) ===
                          getRoleAssociationKey(role.title, role.department),
                      );

                      return (
                        <li key={role.id}>
                          <button
                            className={`collaborators-row collaborators-row--interactive collaborators-row--roles${
                              selectedRole?.id === role.id
                                ? " collaborators-row--selected"
                                : ""
                            }`}
                            onClick={() => toggleRoleSelection(role.id)}
                            type="button"
                          >
                            <div className="collaborators-row__primary">
                              <strong>{role.title}</strong>
                              <span>{getDisplayValue(role.description)}</span>
                              <span>
                                Escolaridade:{" "}
                                {getDisplayValue(role.educationRequirement)}
                              </span>
                            </div>
                            <div className="collaborators-row__secondary">
                              <strong>
                                {getDisplayValue(role.department)}
                              </strong>
                              <span>
                                {getDisplayValue(role.employmentType)}
                              </span>
                              <span>{getDisplayValue(role.requirements)}</span>
                            </div>
                            <div className="collaborators-row__branch">
                              <strong>
                                {relatedCollaborators.length} associado
                                {relatedCollaborators.length === 1 ? "" : "s"}
                              </strong>
                              <span>
                                {relatedCollaborators.length > 0
                                  ? relatedCollaborators
                                      .slice(0, 3)
                                      .map(
                                        (collaborator) => collaborator.fullName,
                                      )
                                      .join(", ")
                                  : "Nenhum colaborador associado"}
                              </span>
                              <span>
                                {getDisplayValue(role.responsibilities)}
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <div className="collaborators-empty-state">
                  <strong>Nenhum cargo encontrado</strong>
                  <p>
                    Adicione cargos manualmente ou importe uma planilha para
                    estruturar a base de referência da equipe.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </article>

      <input
        accept=".csv,.xlsx,.xls"
        className="sr-only"
        onChange={handleCollaboratorImportChange}
        ref={collaboratorFileInputRef}
        type="file"
      />
      <input
        accept=".csv,.xlsx,.xls"
        className="sr-only"
        onChange={handleRoleImportChange}
        ref={roleFileInputRef}
        type="file"
      />

      <CollaboratorEditorModal
        branches={branches}
        editorKey={editorKey}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSubmit={handleCreateCollaborator}
        roles={roles}
      />
      <CollaboratorRoleEditorModal
        departmentOptions={departmentOptions}
        editorKey={roleEditorKey}
        initialRole={editingRole}
        isOpen={isRoleEditorOpen}
        onClose={() => {
          setEditingRole(null);
          setIsRoleEditorOpen(false);
        }}
        onSubmit={handleSaveRole}
      />
      <ExportDataModal
        isOpen={isCollaboratorExportOpen}
        onClose={() => setIsCollaboratorExportOpen(false)}
        onExport={handleCollaboratorExport}
        title="Escolha o formato da base de colaboradores"
      />
      <ExportDataModal
        isOpen={isRoleExportOpen}
        onClose={() => setIsRoleExportOpen(false)}
        onExport={handleRoleExport}
        title="Escolha o formato da base de cargos"
      />
    </section>
  );
}

function ExportDataModal({
  isOpen,
  onClose,
  onExport,
  title,
}: {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: "csv" | "xlsx") => Promise<void>;
  title: string;
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
        aria-labelledby="collaborator-export-title"
        aria-modal="true"
        className="app-modal__dialog app-modal__dialog--export"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="app-modal__header">
          <div className="stack stack--xs">
            <h2 id="collaborator-export-title">{title}</h2>
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
            <button
              className="button"
              onClick={() => void onExport("xlsx")}
              type="button"
            >
              Exportar Excel
            </button>
          </div>
        </div>
      </div>
    </div>,
    portalTarget,
  );
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

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}
