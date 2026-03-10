"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  CreateEmployeeInput,
  CreatePositionInput,
  UpdateEmployeeInput,
  UpdatePositionInput,
} from "@daton/contracts";

import {
  createEmployee,
  createPosition,
  updatePosition,
} from "@/lib/api";
import type {
  ServerBranch,
  ServerDepartment,
  ServerEmployee,
  ServerPosition,
} from "@/lib/server-api";

import { EditIcon } from "./app-icons";
import { EmployeeEditorModal } from "./employee-editor-modal";
import { PositionEditorModal } from "./position-editor-modal";

type CollaboratorsWorkspaceProps = {
  branches: ServerBranch[];
  canManagePeople: boolean;
  departments: ServerDepartment[];
  employees: ServerEmployee[];
  positions: ServerPosition[];
};

type WorkspaceTab = "employees" | "positions";

export function CollaboratorsWorkspace({
  branches,
  canManagePeople,
  departments,
  employees: initialEmployees,
  positions: initialPositions,
}: CollaboratorsWorkspaceProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [employees, setEmployees] = useState(initialEmployees);
  const [positions, setPositions] = useState(initialPositions);
  const [employeeSearchValue, setEmployeeSearchValue] = useState("");
  const [positionSearchValue, setPositionSearchValue] = useState("");
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [positionError, setPositionError] = useState<string | null>(null);
  const [editingPosition, setEditingPosition] = useState<ServerPosition | null>(null);
  const deferredEmployeeSearch = useDeferredValue(employeeSearchValue);
  const deferredPositionSearch = useDeferredValue(positionSearchValue);
  const activeTab = searchParams.get("tab") === "positions" ? "positions" : "employees";
  const selectedPositionId = searchParams.get("position") ?? "";
  const createMode = searchParams.get("create");
  const isEmployeeModalOpen =
    canManagePeople && activeTab === "employees" && createMode === "employee";
  const isPositionCreateOpen =
    canManagePeople && activeTab === "positions" && createMode === "position";
  const isPositionModalOpen = isPositionCreateOpen || Boolean(editingPosition);

  useEffect(() => {
    setEmployees(initialEmployees);
  }, [initialEmployees]);

  useEffect(() => {
    setPositions(initialPositions);
  }, [initialPositions]);

  useEffect(() => {
    if (activeTab !== "positions") {
      setEditingPosition(null);
    }
  }, [activeTab]);

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = deferredEmployeeSearch
      .trim()
      .toLocaleLowerCase("pt-BR");

    if (!normalizedSearch) {
      return employees;
    }

    return employees.filter((employee) =>
      [
        employee.employeeCode ?? "",
        employee.fullName,
        employee.email ?? "",
        employee.positionName ?? "",
        employee.departmentName ?? "",
        employee.branch?.name ?? "",
        employee.manager?.fullName ?? "",
        employee.employmentType,
        employee.status,
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedSearch),
    );
  }, [deferredEmployeeSearch, employees]);

  const filteredPositions = useMemo(() => {
    const normalizedSearch = deferredPositionSearch
      .trim()
      .toLocaleLowerCase("pt-BR");

    if (!normalizedSearch) {
      return positions;
    }

    return positions.filter((position) =>
      [
        position.title,
        position.department?.name ?? "",
        position.level ?? "",
        position.description ?? "",
        position.requiredEducationLevel ?? "",
        position.reportsToPosition?.title ?? "",
        position.requirements.join(" "),
        position.responsibilities.join(" "),
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedSearch),
    );
  }, [deferredPositionSearch, positions]);

  const selectedPosition =
    filteredPositions.find((position) => position.id === selectedPositionId) ??
    filteredPositions[0] ??
    null;

  const tabs = [
    {
      key: "employees",
      label: "Colaboradores",
      href: buildTabHref(pathname, searchParams, "employees"),
    },
    {
      key: "positions",
      label: "Cargos",
      href: buildTabHref(pathname, searchParams, "positions"),
    },
  ] as const;

  function replaceSearchParams(
    update: (nextSearchParams: URLSearchParams) => void,
  ) {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    update(nextSearchParams);
    const query = nextSearchParams.toString();

    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  }

  async function handleEmployeeSubmit(
    payload: CreateEmployeeInput | UpdateEmployeeInput,
  ) {
    setEmployeeError(null);

    try {
      const savedEmployee = await createEmployee(payload as CreateEmployeeInput);
      setEmployees((current) => upsertEmployee(current, savedEmployee));
      router.refresh();
      replaceSearchParams((nextSearchParams) => {
        nextSearchParams.delete("create");
      });
    } catch (error) {
      setEmployeeError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o colaborador.",
      );
    }
  }

  async function handlePositionSubmit(
    payload: CreatePositionInput | UpdatePositionInput,
  ) {
    setPositionError(null);

    try {
      const savedPosition = editingPosition
        ? await updatePosition(editingPosition.id, payload as UpdatePositionInput)
        : await createPosition(payload as CreatePositionInput);

      setPositions((current) => upsertPosition(current, savedPosition));
      setEditingPosition(null);
      router.refresh();
      replaceSearchParams((nextSearchParams) => {
        nextSearchParams.set("tab", "positions");
        nextSearchParams.set("position", savedPosition.id);
        nextSearchParams.delete("create");
      });
    } catch (error) {
      setPositionError(
        error instanceof Error ? error.message : "Não foi possível salvar o cargo.",
      );
    }
  }

  return (
    <section className="workspace-section workspace-section--fill collaborators-page">
      <nav aria-label="Seções de colaboradores" className="workspace-tabs">
        {tabs.map((tab) => (
          <Link
            aria-current={activeTab === tab.key ? "page" : undefined}
            className={`workspace-tabs__link${
              activeTab === tab.key ? " workspace-tabs__link--active" : ""
            }`}
            href={tab.href}
            key={tab.key}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <article className="detail-grid collaborators-page__grid">
        <div className="content-panel content-panel--fill">
          {activeTab === "employees" ? (
            <>
              <div className="section-heading collaborators-panel__header">
                <div className="collaborators-panel__filters collaborators-panel__filters--single">
                  <label className="collaborators-field collaborators-field--search">
                    <span>Buscar</span>
                    <input
                      onChange={(event) => setEmployeeSearchValue(event.currentTarget.value)}
                      placeholder="Nome, e-mail, departamento, cargo ou unidade"
                      type="search"
                      value={employeeSearchValue}
                    />
                  </label>
                </div>
              </div>

              {employeeError ? (
                <p className="collaborators-panel__feedback">{employeeError}</p>
              ) : null}

              {filteredEmployees.length > 0 ? (
                <div className="collaborators-table">
                  <div className="collaborators-table__head">
                    <span>Nome</span>
                    <span>Cargo</span>
                    <span>Lotação</span>
                    <span>Status</span>
                  </div>
                  <ul className="collaborators-table__body">
                    {filteredEmployees.map((employee) => (
                      <li key={employee.id}>
                        <Link
                          className="collaborators-row collaborators-row--interactive"
                          href={`/app/social/collaborators/${employee.id}`}
                        >
                          <div className="collaborators-row__primary">
                            <strong>{employee.fullName}</strong>
                            <span>{employee.email || employee.employeeCode || "Sem e-mail cadastrado"}</span>
                          </div>
                          <div className="collaborators-row__secondary">
                            <strong>{employee.positionName || "Cargo não definido"}</strong>
                            <span>{employee.departmentName || "Sem departamento vinculado"}</span>
                            <span>{employee.employmentType}</span>
                          </div>
                          <div className="collaborators-row__branch">
                            <strong>{employee.branch?.name || "Sem unidade vinculada"}</strong>
                            <span>{employee.manager?.fullName || "Sem gestor definido"}</span>
                            <span>{employee.location || "Sem localização complementar"}</span>
                          </div>
                          <div className="collaborators-row__status">
                            <strong>{employee.status}</strong>
                            <span>Admissão em {formatDate(employee.hireDate)}</span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="collaborators-empty-state">
                  <strong>Nenhum colaborador encontrado</strong>
                  <p>A busca atual não retornou colaboradores da base de RH.</p>
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
                      onChange={(event) => setPositionSearchValue(event.currentTarget.value)}
                      placeholder="Cargo, departamento, nível ou requisito"
                      type="search"
                      value={positionSearchValue}
                    />
                  </label>
                </div>
              </div>

              {positionError ? (
                <p className="collaborators-panel__feedback">{positionError}</p>
              ) : null}

              {filteredPositions.length > 0 ? (
                <div className="collaborators-table collaborators-table--roles">
                  <div className="collaborators-table__head collaborators-table__head--roles">
                    <span>Cargo</span>
                    <span>Departamento</span>
                    <span>Faixa</span>
                    <span>Escopo</span>
                  </div>
                  <ul className="collaborators-table__body">
                    {filteredPositions.map((position) => (
                      <li key={position.id}>
                        <button
                          className={`collaborators-row collaborators-row--interactive collaborators-row--roles${
                            selectedPosition?.id === position.id
                              ? " collaborators-row--selected"
                              : ""
                          }`}
                          onClick={() =>
                            replaceSearchParams((nextSearchParams) => {
                              nextSearchParams.set("tab", "positions");
                              nextSearchParams.set("position", position.id);
                              nextSearchParams.delete("create");
                            })
                          }
                          type="button"
                        >
                          <div className="collaborators-row__primary">
                            <strong>{position.title}</strong>
                            <span>{position.description || "Sem descrição cadastrada."}</span>
                          </div>
                          <div className="collaborators-row__secondary">
                            <strong>{position.department?.name || "Sem departamento"}</strong>
                            <span>{position.level || "Nível não definido"}</span>
                            <span>
                              {position.reportsToPosition?.title || "Sem cargo superior"}
                            </span>
                          </div>
                          <div className="collaborators-row__branch">
                            <strong>{formatSalaryRange(position)}</strong>
                            <span>
                              {position.requiredEducationLevel || "Sem escolaridade mínima"}
                            </span>
                            <span>{formatExperience(position.requiredExperienceYears)}</span>
                          </div>
                          <div className="collaborators-row__status">
                            <strong>{position.requirements.length} requisitos</strong>
                            <span>
                              {position.responsibilities.length} responsabilidades principais
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="collaborators-empty-state">
                  <strong>Nenhum cargo encontrado</strong>
                  <p>A busca atual não retornou cargos persistidos na organização.</p>
                </div>
              )}
            </>
          )}
        </div>

        {activeTab === "positions" && selectedPosition ? (
          <aside className="content-panel collaborator-profile__notes-panel">
            <div className="section-heading">
              <div className="stack stack--xs">
                <h3>{selectedPosition.title}</h3>
                <p className="workspace-copy">
                  {selectedPosition.department?.name || "Sem departamento"} ·{" "}
                  {selectedPosition.level || "Nível não definido"}
                </p>
              </div>
              {canManagePeople ? (
                <button
                  className="button button--secondary"
                  onClick={() => {
                    setPositionError(null);
                    setEditingPosition(selectedPosition);
                  }}
                  type="button"
                >
                  <EditIcon />
                  <span>Editar</span>
                </button>
              ) : null}
            </div>

            <dl className="definition-list">
              <DetailItem
                label="Faixa salarial"
                value={formatSalaryRange(selectedPosition)}
              />
              <DetailItem
                label="Reporta para"
                value={selectedPosition.reportsToPosition?.title || "Sem cargo superior"}
              />
              <DetailItem
                label="Escolaridade exigida"
                value={selectedPosition.requiredEducationLevel || "Não informada"}
              />
              <DetailItem
                label="Experiência mínima"
                value={formatExperience(selectedPosition.requiredExperienceYears)}
              />
            </dl>

            <div className="stack stack--sm">
              <div>
                <p className="organization-pane-label">Descrição</p>
                <p className="workspace-copy">
                  {selectedPosition.description || "Sem descrição operacional registrada."}
                </p>
              </div>
              <div>
                <p className="organization-pane-label">Requisitos</p>
                <BulletList
                  emptyLabel="Nenhum requisito definido para este cargo."
                  items={selectedPosition.requirements}
                />
              </div>
              <div>
                <p className="organization-pane-label">Responsabilidades</p>
                <BulletList
                  emptyLabel="Nenhuma responsabilidade registrada para este cargo."
                  items={selectedPosition.responsibilities}
                />
              </div>
            </div>
          </aside>
        ) : null}
      </article>

      <EmployeeEditorModal
        branches={branches}
        departments={departments}
        employees={employees}
        isOpen={isEmployeeModalOpen}
        onClose={() =>
          replaceSearchParams((nextSearchParams) => {
            nextSearchParams.delete("create");
          })
        }
        onSubmit={handleEmployeeSubmit}
        positions={positions}
      />

      <PositionEditorModal
        departments={departments}
        initialPosition={editingPosition}
        isOpen={isPositionModalOpen}
        onClose={() => {
          setEditingPosition(null);
          replaceSearchParams((nextSearchParams) => {
            nextSearchParams.delete("create");
          });
        }}
        onSubmit={handlePositionSubmit}
        positions={positions}
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

function BulletList({
  emptyLabel,
  items,
}: {
  emptyLabel: string;
  items: string[];
}) {
  if (items.length === 0) {
    return <p className="workspace-copy">{emptyLabel}</p>;
  }

  return (
    <ul className="collaborator-profile__access-list">
      {items.map((item) => (
        <li className="collaborator-profile__access-item" key={item}>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function buildTabHref(
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  tab: WorkspaceTab,
) {
  const nextSearchParams = new URLSearchParams(searchParams.toString());
  nextSearchParams.delete("create");

  if (tab === "employees") {
    nextSearchParams.delete("tab");
    nextSearchParams.delete("position");
  } else {
    nextSearchParams.set("tab", "positions");
  }

  const query = nextSearchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function formatCurrency(value: number | null) {
  if (typeof value !== "number") {
    return null;
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Não informado";
  }

  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return "Não informado";
  }

  return `${day}/${month}/${year}`;
}

function formatExperience(value: number | null) {
  if (typeof value !== "number") {
    return "Não informada";
  }

  return `${value} ${value === 1 ? "ano" : "anos"}`;
}

function formatSalaryRange(position: ServerPosition) {
  const min = formatCurrency(position.salaryRangeMin);
  const max = formatCurrency(position.salaryRangeMax);

  if (min && max) {
    return `${min} a ${max}`;
  }

  return min || max || "Faixa salarial não definida";
}

function upsertEmployee(
  currentEmployees: ServerEmployee[],
  savedEmployee: ServerEmployee,
) {
  const nextEmployees = currentEmployees.filter(
    (employee) => employee.id !== savedEmployee.id,
  );
  nextEmployees.unshift(savedEmployee);

  return nextEmployees.sort((left, right) =>
    left.fullName.localeCompare(right.fullName, "pt-BR"),
  );
}

function upsertPosition(
  currentPositions: ServerPosition[],
  savedPosition: ServerPosition,
) {
  const nextPositions = currentPositions.filter(
    (position) => position.id !== savedPosition.id,
  );
  nextPositions.unshift(savedPosition);

  return nextPositions.sort((left, right) =>
    left.title.localeCompare(right.title, "pt-BR"),
  );
}
