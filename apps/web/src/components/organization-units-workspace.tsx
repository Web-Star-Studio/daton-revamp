"use client";

import {
  startTransition,
  type ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { formatCnpj, type CreateBranchInput, type UpdateBranchInput } from "@daton/contracts";

import { createBranch, updateBranch } from "@/lib/api";
import type { ServerBranch, ServerOrganizationMember } from "@/lib/server-api";
import { formatBranchStatus } from "@/lib/utils";

import { CloseIcon, MaterialIcon } from "./app-icons";
import { OrganizationUnitsFilters } from "./organization-units-filters";
import {
  OPEN_UNIT_EXPORT_EVENT,
  OPEN_UNIT_IMPORT_EVENT,
  UNIT_MODAL_VISIBILITY_EVENT,
} from "./organization-units-events";

type OrganizationUnitsWorkspaceProps = {
  branches: ServerBranch[];
  kindFilter: "all" | "headquarters" | "branch";
  members: ServerOrganizationMember[];
  searchValue: string;
  statusFilter: "all" | "active" | "archived";
};

const collator = new Intl.Collator("pt-BR");

export function OrganizationUnitsWorkspace({
  branches,
  kindFilter,
  members,
  searchValue,
  statusFilter,
}: OrganizationUnitsWorkspaceProps) {
  const router = useRouter();
  const [branchList, setBranchList] = useState(branches);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBranchList(branches);
  }, [branches]);

  useEffect(() => {
    const openImport = () => importFileInputRef.current?.click();
    const openExport = () => setIsExportOpen(true);

    window.addEventListener(OPEN_UNIT_IMPORT_EVENT, openImport);
    window.addEventListener(OPEN_UNIT_EXPORT_EVENT, openExport);

    return () => {
      window.removeEventListener(OPEN_UNIT_IMPORT_EVENT, openImport);
      window.removeEventListener(OPEN_UNIT_EXPORT_EVENT, openExport);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(UNIT_MODAL_VISIBILITY_EVENT, {
        detail: { open: isExportOpen },
      }),
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent(UNIT_MODAL_VISIBILITY_EVENT, {
          detail: { open: false },
        }),
      );
    };
  }, [isExportOpen]);

  const filteredBranches = useMemo(
    () =>
      filterOrganizationUnits({
        branches: sortBranches(branchList),
        kindFilter,
        searchValue,
        statusFilter,
      }),
    [branchList, kindFilter, searchValue, statusFilter],
  );

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
          "O arquivo selecionado não possui nenhuma aba para importar unidades.",
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

      if (rows.length === 0) {
        setFeedback(
          "Nenhuma unidade válida foi encontrada no arquivo selecionado.",
        );
        return;
      }

      let nextBranches = [...branchList];
      let importedCount = 0;

      for (const row of rows) {
        const payload = toBranchPayloadFromSpreadsheetRow(
          row,
          nextBranches,
          members,
        );

        if (!payload) {
          continue;
        }

        const existingBranch = nextBranches.find(
          (branch) =>
            branch.code.toLowerCase() === payload.code.toLowerCase() ||
            branch.legalIdentifier === payload.legalIdentifier.replace(/\D/g, ""),
        );

        const savedBranch = existingBranch
          ? await updateBranch(
              existingBranch.id,
              mergeBranchUpdatePayload(existingBranch, payload),
            )
          : await createBranch(payload);

        importedCount += 1;
        nextBranches = upsertBranch(nextBranches, savedBranch);
      }

      if (importedCount === 0) {
        setFeedback(
          "Nenhuma unidade válida foi encontrada no arquivo selecionado.",
        );
        return;
      }

      startTransition(() => {
        setBranchList(nextBranches);
        router.refresh();
      });
      setFeedback(
        `${importedCount} unidade${importedCount > 1 ? "s foram importadas" : " foi importada"} com sucesso.`,
      );
    } catch (error) {
      setFeedback(
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível importar o arquivo. Verifique se ele está em CSV ou XLSX.",
      );
    } finally {
      event.currentTarget.value = "";
    }
  }

  async function handleExport(format: "csv" | "xlsx") {
    const rows = branchList.map((branch) => ({
      Unidade: branch.name,
      Código: branch.code,
      CNPJ: formatCnpj(branch.legalIdentifier),
      Tipo: branch.isHeadquarters ? "Headquarters" : "Filial",
      Status: branch.status === "active" ? "Ativa" : "Desativada",
      Gestor: branch.managerMemberId
        ? resolveMemberLabel(members, branch.managerMemberId)
        : "",
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

      triggerDownload(downloadUrl, `unidades-${stamp}.csv`);
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
      setIsExportOpen(false);
      return;
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Unidades");
    XLSX.writeFileXLSX(workbook, `unidades-${stamp}.xlsx`);
    setIsExportOpen(false);
  }

  return (
    <article className="detail-grid collaborators-page__grid organization-units-grid">
      <div className="content-panel content-panel--fill">
        <div className="section-heading collaborators-panel__header">
          <OrganizationUnitsFilters
            kindFilter={kindFilter}
            searchValue={searchValue}
            statusFilter={statusFilter}
          />
        </div>

        {feedback ? (
          <p className="collaborators-panel__feedback">{feedback}</p>
        ) : null}

        {filteredBranches.length > 0 ? (
          <div className="collaborators-table organization-units-table">
            <div className="collaborators-table__head organization-units-table__head">
              <span>Unidade</span>
              <span>Localização</span>
              <span>Identificação</span>
              <span>Status</span>
              <span>Gerente</span>
            </div>
            <ul className="collaborators-table__body">
              {filteredBranches.map((branch) => (
                <li key={branch.id}>
                  <div className="collaborators-row organization-units-row">
                    <div className="collaborators-row__primary">
                      <strong className="organization-units-row__name">
                        <span>{branch.name}</span>
                        {branch.isHeadquarters ? (
                          <MaterialIcon
                            className="organization-units-row__star"
                            icon="star_outline"
                          />
                        ) : null}
                      </strong>
                    </div>
                    <div className="collaborators-row__secondary">
                      <strong>Não informada</strong>
                    </div>
                    <div className="collaborators-row__branch">
                      <h1>{branch.code}</h1>
                      <p>{formatCnpj(branch.legalIdentifier)}</p>
                    </div>
                    <div className="collaborators-row__status">
                      <strong>
                        {branch.status === "active" ? "Ativa" : "Desativada"}
                      </strong>
                    </div>
                    <div className="organization-units-row__manager">
                      <strong>
                        {branch.managerMemberId ? "Vinculado" : "Não vinculado"}
                      </strong>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="collaborators-empty-state">
              <strong>Nenhuma unidade encontrada</strong>
              <p>
              Ajuste a busca ou os filtros para localizar as unidades
              cadastradas.
              </p>
            </div>
        )}
      </div>

      <input
        accept=".csv,.xlsx,.xls"
        className="sr-only"
        onChange={handleImportChange}
        ref={importFileInputRef}
        type="file"
      />
      <UnitsExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onExport={handleExport}
      />
    </article>
  );
}

function UnitsExportModal({
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
        aria-labelledby="units-export-title"
        aria-modal="true"
        className="app-modal__dialog app-modal__dialog--export"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="app-modal__header">
          <div className="stack stack--xs">
            <h2 id="units-export-title">
              Escolha o formato da base de unidades
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

function sortBranches(branches: ServerBranch[]) {
  return [...branches].sort(
    (left, right) =>
      Number(right.isHeadquarters) - Number(left.isHeadquarters) ||
      collator.compare(left.name, right.name),
  );
}

function filterOrganizationUnits({
  branches,
  kindFilter,
  searchValue,
  statusFilter,
}: {
  branches: ServerBranch[];
  kindFilter: "all" | "headquarters" | "branch";
  searchValue: string;
  statusFilter: "all" | "active" | "archived";
}) {
  const normalizedSearch = searchValue.trim().toLocaleLowerCase("pt-BR");

  return branches.filter((branch) => {
    if (statusFilter !== "all" && branch.status !== statusFilter) {
      return false;
    }

    if (kindFilter === "headquarters" && !branch.isHeadquarters) {
      return false;
    }

    if (kindFilter === "branch" && branch.isHeadquarters) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const searchIndex = [
      branch.name,
      branch.code,
      branch.legalIdentifier,
      formatCnpj(branch.legalIdentifier),
      branch.isHeadquarters ? "headquarters" : "filial",
      formatBranchStatus(branch.status),
    ]
      .join(" ")
      .toLocaleLowerCase("pt-BR");

    return searchIndex.includes(normalizedSearch);
  });
}

function toBranchPayloadFromSpreadsheetRow(
  row: Record<string, unknown>,
  branches: ServerBranch[],
  members: ServerOrganizationMember[],
) {
  const name = readSpreadsheetValue(row, ["Unidade", "Nome", "Filial", "name"]);
  const code = readSpreadsheetValue(row, ["Código", "code", "codigo"]);
  const legalIdentifier = readSpreadsheetValue(row, ["CNPJ", "cnpj", "legalIdentifier"]);

  if (!name || !code || !legalIdentifier) {
    return null;
  }

  const typeValue = readSpreadsheetValue(row, ["Tipo", "type", "tipo"]).toLowerCase();
  const statusValue = readSpreadsheetValue(row, ["Status", "status"]).toLowerCase();
  const parentValue = readSpreadsheetValue(row, [
    "Filial Pai",
    "Unidade Pai",
    "parentBranch",
    "parentBranchId",
  ]);
  const managerValue = readSpreadsheetValue(row, [
    "Gestor",
    "Gerente",
    "manager",
    "managerName",
    "managerEmail",
  ]);
  const parentBranch =
    branches.find((branch) => branch.id === parentValue) ??
    branches.find((branch) => branch.code.toLowerCase() === parentValue.toLowerCase()) ??
    branches.find((branch) => branch.name.toLowerCase() === parentValue.toLowerCase()) ??
    null;
  const manager =
    members.find((member) => member.id === managerValue) ??
    members.find((member) => member.email.toLowerCase() === managerValue.toLowerCase()) ??
    members.find((member) => member.fullName.toLowerCase() === managerValue.toLowerCase()) ??
    null;

  return {
    name,
    code,
    legalIdentifier,
    email: readSpreadsheetValue(row, ["E-mail", "Email", "email"]),
    phone: readSpreadsheetValue(row, ["Telefone", "phone"]),
    addressLine1: readSpreadsheetValue(row, ["Endereço", "addressLine1"]),
    addressLine2: readSpreadsheetValue(row, ["Complemento", "addressLine2"]),
    city: readSpreadsheetValue(row, ["Cidade", "city"]),
    stateOrProvince: readSpreadsheetValue(row, ["Estado", "UF", "stateOrProvince"]),
    postalCode: readSpreadsheetValue(row, ["CEP", "postalCode"]),
    country: readSpreadsheetValue(row, ["País", "country"]) || "Brasil",
    isHeadquarters:
      typeValue === "matriz" ||
      readSpreadsheetValue(row, ["Matriz", "isHeadquarters"]).toLowerCase() === "true",
    parentBranchId: parentBranch?.id ?? null,
    managerMemberId: manager?.id ?? null,
    status:
      statusValue === "arquivada" ||
      statusValue === "desativada" ||
      statusValue === "archived"
        ? "archived"
        : "active",
  } satisfies CreateBranchInput & { status: UpdateBranchInput["status"] };
}

function mergeBranchUpdatePayload(
  branch: ServerBranch,
  payload: CreateBranchInput & { status: UpdateBranchInput["status"] },
) {
  return {
    ...payload,
    isHeadquarters: payload.isHeadquarters,
    parentBranchId: payload.parentBranchId ?? branch.parentBranchId,
    managerMemberId:
      payload.managerMemberId !== null
        ? payload.managerMemberId
        : branch.managerMemberId,
  } satisfies UpdateBranchInput;
}

function upsertBranch(branches: ServerBranch[], savedBranch: ServerBranch) {
  const existingIndex = branches.findIndex((branch) => branch.id === savedBranch.id);

  if (existingIndex === -1) {
    return sortBranches([savedBranch, ...branches]);
  }

  const nextBranches = [...branches];
  nextBranches[existingIndex] = savedBranch;
  return sortBranches(nextBranches);
}

function resolveMemberLabel(
  members: ServerOrganizationMember[],
  memberId: string,
) {
  const member = members.find((item) => item.id === memberId);
  return member ? `${member.fullName} • ${member.email}` : "";
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
