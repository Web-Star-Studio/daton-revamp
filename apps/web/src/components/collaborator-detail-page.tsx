"use client";

import Link from "next/link";

import {
  describeAccessRole,
  formatAccessRole,
  formatBranchScope,
  formatMemberStatus,
  getBranchNamesForMember,
} from "@/lib/organization-members";
import type { ServerBranch, ServerOrganizationMember } from "@/lib/server-api";

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
      <dd>{value || "Indisponível"}</dd>
    </div>
  );
}

export function CollaboratorDetailPage({
  branches,
  collaborator,
}: {
  branches: ServerBranch[];
  collaborator: ServerOrganizationMember | null;
}) {
  if (!collaborator) {
    return (
      <section className="workspace-section collaborator-profile-page">
        <header className="workspace-intro collaborator-profile__intro">
          <p className="organization-pane-label">Registro individual</p>
          <h2>Colaborador não encontrado</h2>
          <p className="workspace-copy">
            Não foi possível localizar este membro na base real da organização.
          </p>
        </header>

        <article className="content-panel collaborator-profile__missing">
          <p>
            Volte para a lista principal e selecione um colaborador válido para
            continuar.
          </p>
          <div className="collaborator-profile__header-actions">
            <Link className="button" href="/app/social/collaborators">
              Ir para colaboradores
            </Link>
          </div>
        </article>
      </section>
    );
  }

  const branchNames = getBranchNamesForMember(collaborator, branches);

  return (
    <section className="workspace-section workspace-section--fill collaborator-profile-page">
      <header className="workspace-intro collaborator-profile__intro">
        <p className="organization-pane-label">Registro individual</p>
        <h2>{collaborator.fullName}</h2>
        <p className="workspace-copy">
          Membro real da organização com perfis de acesso e escopo carregados da
          API.
        </p>
      </header>

      <div className="detail-grid collaborator-profile__grid">
        <div className="collaborator-profile__column">
          <article className="content-panel">
            <div className="section-heading">
              <h3>Identificação</h3>
            </div>
            <dl className="definition-list">
              <CollaboratorDetailItem
                label="Nome completo"
                value={collaborator.fullName}
              />
              <CollaboratorDetailItem label="E-mail" value={collaborator.email} />
              <CollaboratorDetailItem label="ID do membro" value={collaborator.id} />
              <CollaboratorDetailItem label="ID do usuário" value={collaborator.userId} />
            </dl>
          </article>

          <article className="content-panel">
            <div className="section-heading">
              <h3>Escopo operacional</h3>
            </div>
            <dl className="definition-list">
              <CollaboratorDetailItem
                label="Unidades"
                value={formatBranchScope(collaborator, branches)}
              />
              <CollaboratorDetailItem
                label="Filiais listadas"
                value={branchNames.join(", ")}
              />
              <CollaboratorDetailItem
                label="Gestão de unidade"
                value={
                  collaborator.managedBranchIds.length > 0
                    ? "Possui atribuição ativa de gestão"
                    : "Sem gestão de unidade vinculada"
                }
              />
            </dl>
          </article>
        </div>

        <div className="collaborator-profile__column collaborator-profile__column--aside">
          <article className="content-panel">
            <div className="section-heading">
              <h3>Resumo de acesso</h3>
            </div>
            <dl className="definition-list">
              <CollaboratorDetailItem
                label="Status"
                value={formatMemberStatus(collaborator.status)}
              />
              <CollaboratorDetailItem
                label="Perfis"
                value={
                  collaborator.roles.length > 0
                    ? collaborator.roles.map((role) => formatAccessRole(role)).join(", ")
                    : "Sem perfis atribuídos"
                }
              />
              <CollaboratorDetailItem
                label="Abrangência"
                value={
                  collaborator.hasGlobalAccess
                    ? "Acesso global às unidades ativas"
                    : "Acesso restrito ao escopo listado"
                }
              />
            </dl>
          </article>

          <article className="content-panel collaborator-profile__notes-panel">
            <div className="section-heading">
              <h3>Descrição dos perfis</h3>
            </div>
            <p className="collaborator-profile__notes">
              {collaborator.roles.length > 0
                ? collaborator.roles
                    .map((role) => `${formatAccessRole(role)}: ${describeAccessRole(role)}`)
                    .join(" ")
                : "Este membro ainda não possui perfis de acesso ativos na organização."}
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
