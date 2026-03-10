"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import type { CreateEmployeeInput, UpdateEmployeeInput } from "@daton/contracts";

import { updateEmployee } from "@/lib/api";
import type {
  ServerBranch,
  ServerDepartment,
  ServerEmployee,
  ServerPosition,
} from "@/lib/server-api";

import { EmployeeEditorModal } from "./employee-editor-modal";

function CollaboratorDetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "Não informado"}</dd>
    </div>
  );
}

type CollaboratorDetailPageProps = {
  branches: ServerBranch[];
  canManagePeople: boolean;
  collaborator: ServerEmployee | null;
  departments: ServerDepartment[];
  employees: ServerEmployee[];
  isEditing: boolean;
  positions: ServerPosition[];
};

export function CollaboratorDetailPage({
  branches,
  canManagePeople,
  collaborator,
  departments,
  employees,
  isEditing,
  positions,
}: CollaboratorDetailPageProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentCollaborator, setCurrentCollaborator] = useState(collaborator);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentCollaborator(collaborator);
  }, [collaborator]);

  if (!currentCollaborator) {
    return (
      <section className="workspace-section collaborator-profile-page">
        <header className="workspace-intro collaborator-profile__intro">
          <p className="organization-pane-label">Registro individual</p>
          <h2>Colaborador não encontrado</h2>
          <p className="workspace-copy">
            Não foi possível localizar este colaborador na base de RH.
          </p>
        </header>

        <article className="content-panel collaborator-profile__missing">
          <p>Volte para a lista principal e selecione um colaborador válido.</p>
          <div className="collaborator-profile__header-actions">
            <Link className="button" href="/app/social/collaborators">
              Ir para colaboradores
            </Link>
          </div>
        </article>
      </section>
    );
  }

  const collaboratorRecord = currentCollaborator;

  async function handleSubmit(
    payload: CreateEmployeeInput | UpdateEmployeeInput,
  ) {
    setError(null);

    try {
      const savedEmployee = await updateEmployee(
        collaboratorRecord.id,
        payload as UpdateEmployeeInput,
      );
      setCurrentCollaborator(savedEmployee);
      router.refresh();

      const nextSearchParams = new URLSearchParams(searchParams.toString());
      nextSearchParams.delete("edit");
      const query = nextSearchParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Não foi possível atualizar o colaborador.",
      );
    }
  }

  return (
    <section className="workspace-section workspace-section--fill collaborator-profile-page">
      <header className="workspace-intro collaborator-profile__intro">
        <p className="organization-pane-label">Registro individual</p>
        <h2>{collaboratorRecord.fullName}</h2>
        <p className="workspace-copy">
          {collaboratorRecord.positionName || "Cargo não definido"} ·{" "}
          {collaboratorRecord.departmentName || "Sem departamento"} ·{" "}
          {collaboratorRecord.status}
        </p>
      </header>

      {error ? <p className="collaborators-panel__feedback">{error}</p> : null}

      <div className="detail-grid collaborator-profile__grid">
        <div className="collaborator-profile__column">
          <article className="content-panel">
            <div className="section-heading">
              <h3>Identificação</h3>
            </div>
            <dl className="definition-list">
              <CollaboratorDetailItem
                label="Nome completo"
                value={collaboratorRecord.fullName}
              />
              <CollaboratorDetailItem
                label="Código do colaborador"
                value={collaboratorRecord.employeeCode ?? "Não informado"}
              />
              <CollaboratorDetailItem
                label="CPF"
                value={collaboratorRecord.cpf ?? "Não informado"}
              />
              <CollaboratorDetailItem
                label="E-mail"
                value={collaboratorRecord.email ?? "Não informado"}
              />
              <CollaboratorDetailItem
                label="Telefone"
                value={collaboratorRecord.phone ?? "Não informado"}
              />
            </dl>
          </article>

          <article className="content-panel">
            <div className="section-heading">
              <h3>Estrutura operacional</h3>
            </div>
            <dl className="definition-list">
              <CollaboratorDetailItem
                label="Departamento"
                value={collaboratorRecord.departmentName ?? "Não informado"}
              />
              <CollaboratorDetailItem
                label="Cargo"
                value={collaboratorRecord.positionName ?? "Não informado"}
              />
              <CollaboratorDetailItem
                label="Unidade"
                value={collaboratorRecord.branch?.name ?? "Não informado"}
              />
              <CollaboratorDetailItem
                label="Gestor"
                value={collaboratorRecord.manager?.fullName ?? "Não informado"}
              />
              <CollaboratorDetailItem
                label="Localização"
                value={collaboratorRecord.location ?? "Não informado"}
              />
            </dl>
          </article>
        </div>

        <div className="collaborator-profile__column collaborator-profile__column--aside">
          <article className="content-panel">
            <div className="section-heading">
              <h3>Vínculo</h3>
            </div>
            <dl className="definition-list">
              <CollaboratorDetailItem
                label="Status"
                value={collaboratorRecord.status}
              />
              <CollaboratorDetailItem
                label="Tipo de contrato"
                value={collaboratorRecord.employmentType}
              />
              <CollaboratorDetailItem
                label="Data de contratação"
                value={formatDate(collaboratorRecord.hireDate)}
              />
              <CollaboratorDetailItem
                label="Data de desligamento"
                value={formatDate(collaboratorRecord.terminationDate)}
              />
              <CollaboratorDetailItem
                label="Salário"
                value={formatCurrency(collaboratorRecord.salary)}
              />
            </dl>
          </article>

          <article className="content-panel collaborator-profile__notes-panel">
            <div className="section-heading">
              <h3>Dados complementares</h3>
            </div>
            <dl className="definition-list">
              <CollaboratorDetailItem
                label="Data de nascimento"
                value={formatDate(collaboratorRecord.birthDate)}
              />
              <CollaboratorDetailItem
                label="Gênero"
                value={collaboratorRecord.gender ?? "Não informado"}
              />
              <CollaboratorDetailItem
                label="Raça / etnia"
                value={collaboratorRecord.ethnicity ?? "Não informado"}
              />
              <CollaboratorDetailItem
                label="Escolaridade"
                value={collaboratorRecord.educationLevel ?? "Não informado"}
              />
            </dl>
            <div className="stack stack--xs">
              <p className="organization-pane-label">Observações</p>
              <p className="workspace-copy">
                {collaboratorRecord.notes || "Sem observações registradas para este colaborador."}
              </p>
            </div>
          </article>
        </div>
      </div>

      {canManagePeople ? (
        <EmployeeEditorModal
          branches={branches}
          departments={departments}
          employees={employees}
          initialEmployee={collaboratorRecord}
          isOpen={isEditing}
          onClose={() => {
            const nextSearchParams = new URLSearchParams(searchParams.toString());
            nextSearchParams.delete("edit");
            const query = nextSearchParams.toString();
            router.replace(query ? `${pathname}?${query}` : pathname, {
              scroll: false,
            });
          }}
          onSubmit={handleSubmit}
          positions={positions}
        />
      ) : null}
    </section>
  );
}

function formatCurrency(value: number | null) {
  if (typeof value !== "number") {
    return "Não informado";
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
