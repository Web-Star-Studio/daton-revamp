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

import type { ServerBranch } from "@/lib/server-api";

import {
  COLLABORATOR_MODAL_VISIBILITY_EVENT,
  OPEN_COLLABORATOR_CREATION_EVENT,
  OPEN_COLLABORATOR_EXPORT_EVENT,
  OPEN_COLLABORATOR_IMPORT_EVENT,
} from "./collaborators-events";

type CollaboratorStatus = "Ativo" | "Desligado" | "Em admissão";

type CollaboratorRecord = {
  additionalLocation: string;
  birthDate: string;
  branchId: string;
  branchName: string;
  cpf: string;
  department: string;
  educationLevel: string;
  email: string;
  employmentType: string;
  fullName: string;
  gender: string;
  hireDate: string;
  id: string;
  notes: string;
  phone: string;
  role: string;
  status: CollaboratorStatus;
  terminationDate: string;
};

type CollaboratorsWorkspaceProps = {
  branches: ServerBranch[];
};

const educationLevels = [
  "Ensino Fundamental",
  "Ensino Médio",
  "Ensino Técnico",
  "Ensino Superior Completo",
  "Pós-graduação",
  "Mestrado",
  "Doutorado",
] as const;

const genderOptions = [
  "Feminino",
  "Masculino",
  "Não binário",
  "Prefiro não informar",
] as const;
const employmentTypes = [
  "CLT",
  "PJ",
  "Temporário",
  "Estágio",
  "Aprendiz",
] as const;
const collaboratorStatuses = ["Ativo", "Em admissão", "Desligado"] as const;

const exportColumns: Array<{ key: keyof CollaboratorRecord; label: string }> = [
  { key: "cpf", label: "CPF" },
  { key: "fullName", label: "Nome Completo" },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Telefone" },
  { key: "department", label: "Departamento" },
  { key: "role", label: "Cargo" },
  { key: "hireDate", label: "Data de Contratação" },
  { key: "terminationDate", label: "Data de Demissão" },
  { key: "birthDate", label: "Data de Nascimento" },
  { key: "educationLevel", label: "Escolaridade" },
  { key: "gender", label: "Gênero" },
  { key: "employmentType", label: "Tipo de Contrato" },
  { key: "status", label: "Status" },
  { key: "branchName", label: "Filial" },
  { key: "additionalLocation", label: "Localização Adicional" },
  { key: "notes", label: "Observações" },
];

export function CollaboratorsWorkspace({
  branches,
}: CollaboratorsWorkspaceProps) {
  const [collaborators, setCollaborators] = useState<CollaboratorRecord[]>(() =>
    createInitialCollaborators(branches),
  );
  const [searchValue, setSearchValue] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue);
  const [statusFilter, setStatusFilter] = useState<
    CollaboratorStatus | "Todos"
  >("Todos");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [editorKey, setEditorKey] = useState("collaborator-editor-initial");
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const openEditor = () => {
      setEditorKey(crypto.randomUUID());
      setIsEditorOpen(true);
    };
    const openImport = () => fileInputRef.current?.click();
    const openExport = () => setIsExportOpen(true);

    window.addEventListener(OPEN_COLLABORATOR_CREATION_EVENT, openEditor);
    window.addEventListener(OPEN_COLLABORATOR_IMPORT_EVENT, openImport);
    window.addEventListener(OPEN_COLLABORATOR_EXPORT_EVENT, openExport);

    return () => {
      window.removeEventListener(OPEN_COLLABORATOR_CREATION_EVENT, openEditor);
      window.removeEventListener(OPEN_COLLABORATOR_IMPORT_EVENT, openImport);
      window.removeEventListener(OPEN_COLLABORATOR_EXPORT_EVENT, openExport);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(COLLABORATOR_MODAL_VISIBILITY_EVENT, {
        detail: { open: isEditorOpen || isExportOpen },
      }),
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent(COLLABORATOR_MODAL_VISIBILITY_EVENT, {
          detail: { open: false },
        }),
      );
    };
  }, [isEditorOpen, isExportOpen]);

  const normalizedSearch = deferredSearchValue.trim().toLowerCase();
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

  const activeCollaborators = collaborators.filter(
    (collaborator) => collaborator.status === "Ativo",
  ).length;
  const representedBranches = new Set(
    collaborators
      .map((collaborator) => collaborator.branchName)
      .filter(Boolean),
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
        setCollaborators((currentCollaborators) =>
          mergeCollaborators(currentCollaborators, importedCollaborators),
        );
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

  async function handleExport(format: "csv" | "xlsx") {
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
      setIsExportOpen(false);
      return;
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Colaboradores");
    XLSX.writeFileXLSX(workbook, `colaboradores-${stamp}.xlsx`);
    setIsExportOpen(false);
  }

  function handleCreateCollaborator(collaborator: CollaboratorRecord) {
    setImportFeedback(null);
    startTransition(() => {
      setCollaborators((currentCollaborators) => [
        collaborator,
        ...currentCollaborators,
      ]);
    });
    setIsEditorOpen(false);
  }

  return (
    <section className="workspace-section workspace-section--fill collaborators-page">
      <header className="workspace-intro">
        <h2>Gestão de Colaboradores</h2>
        <p className="workspace-copy">
          Centralize admissões, cadastro e acompanhamento operacional dos
          colaboradores em uma base pronta para importação e exportação.
        </p>
      </header>

      <article className="detail-grid collaborators-page__grid">
        <div className="content-panel content-panel--fill">
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
                      event.currentTarget.value as CollaboratorStatus | "Todos",
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
            <p className="collaborators-panel__feedback">{importFeedback}</p>
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
                  <li className="collaborators-row" key={collaborator.id}>
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
                      <strong>{collaborator.branchName || "Sem filial"}</strong>
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
        </div>
      </article>

      <input
        accept=".csv,.xlsx,.xls"
        className="sr-only"
        onChange={handleImportChange}
        ref={fileInputRef}
        type="file"
      />

      <CollaboratorEditorModal
        branches={branches}
        editorKey={editorKey}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSubmit={handleCreateCollaborator}
      />
      <ExportCollaboratorsModal
        collaboratorCount={collaborators.length}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onExport={handleExport}
      />
    </section>
  );
}

function CollaboratorEditorModal({
  branches,
  editorKey,
  isOpen,
  onClose,
  onSubmit,
}: {
  branches: ServerBranch[];
  editorKey: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (collaborator: CollaboratorRecord) => void;
}) {
  const portalTarget = usePortalTarget();

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
        aria-labelledby="collaborator-editor-title"
        aria-modal="true"
        className="app-modal__dialog app-modal__dialog--collaborators"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="app-modal__header">
          <div className="stack stack--xs">
            <h2 id="collaborator-editor-title">Novo funcionário</h2>
            <p className="app-modal__description">
              Preencha os dados centrais do colaborador sem incluir as seções de
              experiências e educação complementar.
            </p>
          </div>
          <button
            aria-label="Fechar cadastro de colaborador"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </header>

        <form
          className="collaborator-form"
          key={editorKey}
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            onSubmit(buildCollaboratorFromFormData(formData, branches));
          }}
        >
          <div className="app-modal__body collaborator-form__grid form-grid">
            <div className="field">
              <label htmlFor="collaborator-cpf">CPF</label>
              <input
                defaultValue=""
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
                defaultValue=""
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
                defaultValue=""
                id="collaborator-email"
                name="email"
                placeholder="email@empresa.com"
                type="email"
              />
            </div>
            <div className="field">
              <label htmlFor="collaborator-phone">Telefone</label>
              <input
                defaultValue=""
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
              <input
                defaultValue=""
                id="collaborator-department"
                name="department"
                type="text"
              />
            </div>
            <div className="field">
              <label htmlFor="collaborator-role">Cargo</label>
              <input
                defaultValue=""
                id="collaborator-role"
                name="role"
                type="text"
              />
            </div>
            <div className="field">
              <label htmlFor="collaborator-hire-date">
                Data de Contratação
              </label>
              <input
                defaultValue={todayIsoDate()}
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
                defaultValue=""
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
                defaultValue=""
                id="collaborator-birth-date"
                name="birthDate"
                type="date"
              />
            </div>
            <div className="field">
              <label htmlFor="collaborator-education-level">Escolaridade</label>
              <select
                defaultValue=""
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
              <select defaultValue="" id="collaborator-gender" name="gender">
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
                defaultValue="CLT"
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
                defaultValue="Ativo"
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
                defaultValue={branches[0]?.id ?? ""}
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
                defaultValue=""
                id="collaborator-additional-location"
                name="additionalLocation"
                placeholder="Ex: Sala 201, Andar 3"
                type="text"
              />
            </div>
            <div className="field field--wide">
              <label htmlFor="collaborator-notes">Informações Adicionais</label>
              <textarea
                defaultValue=""
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
              Salvar colaborador
            </button>
          </footer>
        </form>
      </div>
    </div>,
    portalTarget,
  );
}

function ExportCollaboratorsModal({
  collaboratorCount,
  isOpen,
  onClose,
  onExport,
}: {
  collaboratorCount: number;
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
        aria-labelledby="collaborator-export-title"
        aria-modal="true"
        className="app-modal__dialog app-modal__dialog--export"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="app-modal__header">
          <div className="stack stack--xs">
            <h2 id="collaborator-export-title">
              Escolha o formato da planilha
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

function buildCollaboratorFromFormData(
  formData: FormData,
  branches: ServerBranch[],
): CollaboratorRecord {
  const branchId = String(formData.get("branchId") ?? "");
  const branchName =
    branches.find((branch) => branch.id === branchId)?.name ?? "";

  return {
    id: crypto.randomUUID(),
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
    status: (String(formData.get("status") ?? "Ativo") ||
      "Ativo") as CollaboratorStatus,
    branchId,
    branchName,
    additionalLocation: String(formData.get("additionalLocation") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  };
}

function createInitialCollaborators(
  branches: ServerBranch[],
): CollaboratorRecord[] {
  return [
    {
      id: "seed-ana-ribeiro",
      cpf: "298.145.870-14",
      fullName: "Ana Paula Ribeiro",
      email: "ana.ribeiro@daton.local",
      phone: "(11) 99876-1024",
      department: "Operações",
      role: "Analista de Processos",
      hireDate: "2024-04-01",
      terminationDate: "",
      birthDate: "1992-06-18",
      educationLevel: "Ensino Superior Completo",
      gender: "Feminino",
      employmentType: "CLT",
      status: "Ativo",
      branchId: branches[0]?.id ?? "",
      branchName: branches[0]?.name ?? "Matriz",
      additionalLocation: "Sala 203, 2º andar",
      notes:
        "Responsável pelo onboarding documental e apoio às rotinas sociais.",
    },
    {
      id: "seed-marcos-costa",
      cpf: "417.532.980-33",
      fullName: "Marcos Costa Lima",
      email: "marcos.costa@daton.local",
      phone: "(21) 98741-2201",
      department: "Recursos Humanos",
      role: "Coordenador de RH",
      hireDate: "2023-09-14",
      terminationDate: "",
      birthDate: "1988-11-02",
      educationLevel: "Pós-graduação",
      gender: "Masculino",
      employmentType: "CLT",
      status: "Ativo",
      branchId: branches[1]?.id ?? branches[0]?.id ?? "",
      branchName: branches[1]?.name ?? branches[0]?.name ?? "Base central",
      additionalLocation: "Andar administrativo",
      notes: "Ponto focal para admissões, contratos e movimentações internas.",
    },
  ];
}

function mergeCollaborators(
  currentCollaborators: CollaboratorRecord[],
  importedCollaborators: CollaboratorRecord[],
) {
  const collaboratorsByCpf = new Map(
    currentCollaborators.map((collaborator) => [
      normalizeCpf(collaborator.cpf),
      collaborator,
    ]),
  );

  importedCollaborators.forEach((collaborator) => {
    const collaboratorCpf = normalizeCpf(collaborator.cpf);
    const currentCollaborator = collaboratorsByCpf.get(collaboratorCpf);

    collaboratorsByCpf.set(
      collaboratorCpf,
      currentCollaborator
        ? {
            ...currentCollaborator,
            ...collaborator,
            id: currentCollaborator.id,
          }
        : collaborator,
    );
  });

  return Array.from(collaboratorsByCpf.values()).sort((left, right) => {
    if (!left.hireDate && !right.hireDate) {
      return left.fullName.localeCompare(right.fullName);
    }

    if (!left.hireDate) {
      return 1;
    }

    if (!right.hireDate) {
      return -1;
    }

    return right.hireDate.localeCompare(left.hireDate);
  });
}

function toCollaboratorFromSpreadsheetRow(
  row: Record<string, unknown>,
  branches: ServerBranch[],
): CollaboratorRecord | null {
  const cpf = formatCpf(readSpreadsheetValue(row, ["CPF", "cpf"]));
  const fullName = readSpreadsheetValue(row, [
    "Nome Completo",
    "Nome Completo*",
    "fullName",
    "nomeCompleto",
  ]);

  if (!cpf || !fullName) {
    return null;
  }

  const branchNameFromRow = readSpreadsheetValue(row, [
    "Filial",
    "branchName",
    "filial",
  ]);
  const branchId = readSpreadsheetValue(row, ["branchId", "Filial ID"]);
  const matchedBranch =
    branches.find((branch) => branch.id === branchId) ??
    branches.find(
      (branch) => branch.name.toLowerCase() === branchNameFromRow.toLowerCase(),
    );

  const statusValue =
    readSpreadsheetValue(row, ["Status", "status"]) || "Ativo";
  const collaboratorStatus = collaboratorStatuses.includes(
    statusValue as CollaboratorStatus,
  )
    ? (statusValue as CollaboratorStatus)
    : "Ativo";

  return {
    id: crypto.randomUUID(),
    cpf,
    fullName,
    email: readSpreadsheetValue(row, ["E-mail", "Email", "email"]),
    phone: formatPhone(readSpreadsheetValue(row, ["Telefone", "phone"])),
    department: readSpreadsheetValue(row, ["Departamento", "department"]),
    role: readSpreadsheetValue(row, ["Cargo", "role"]),
    hireDate: normalizeSpreadsheetDate(
      readSpreadsheetValue(row, ["Data de Contratação", "hireDate"]),
    ),
    terminationDate: normalizeSpreadsheetDate(
      readSpreadsheetValue(row, ["Data de Demissão", "terminationDate"]),
    ),
    birthDate: normalizeSpreadsheetDate(
      readSpreadsheetValue(row, ["Data de Nascimento", "birthDate"]),
    ),
    educationLevel: readSpreadsheetValue(row, [
      "Escolaridade",
      "educationLevel",
    ]),
    gender: readSpreadsheetValue(row, ["Gênero", "Genero", "gender"]),
    employmentType:
      readSpreadsheetValue(row, ["Tipo de Contrato", "employmentType"]) ||
      "CLT",
    status: collaboratorStatus,
    branchId: matchedBranch?.id ?? "",
    branchName: matchedBranch?.name ?? branchNameFromRow,
    additionalLocation: readSpreadsheetValue(row, [
      "Localização Adicional",
      "additionalLocation",
    ]),
    notes: readSpreadsheetValue(row, [
      "Observações",
      "Informações Adicionais",
      "notes",
    ]),
  };
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

function normalizeSpreadsheetDate(value: string) {
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const [day, month, year] = value.split("/");
  if (day && month && year && year.length === 4) {
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return "";
}

function formatDateLabel(value: string) {
  if (!value) {
    return "Não informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function normalizeCpf(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

function formatCpf(value: string) {
  const digits = normalizeCpf(value);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }

  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) {
    return digits ? `(${digits}` : "";
  }

  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function getCollaboratorStatusClass(status: CollaboratorStatus) {
  switch (status) {
    case "Ativo":
      return "badge badge--success";
    case "Em admissão":
      return "badge badge--warning";
    case "Desligado":
      return "badge badge--neutral";
    default:
      return "badge badge--neutral";
  }
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
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
