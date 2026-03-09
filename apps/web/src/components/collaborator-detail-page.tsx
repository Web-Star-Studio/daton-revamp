"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CollaboratorEditorModal } from "@/components/collaborator-editor-modal";
import {
  createInitialRoles,
  formatDateLabel,
  getCollaboratorStatusClass,
  getDisplayValue,
  mergeCollaborators,
  mergeRoles,
  readStoredCollaborators,
  readStoredRoles,
  writeStoredCollaborators,
  writeStoredRoles,
  type CollaboratorRecord,
} from "@/lib/collaborators";
import type { ServerBranch } from "@/lib/server-api";

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
      <dd>{getDisplayValue(value)}</dd>
    </div>
  );
}

export function CollaboratorDetailPage({
  branches,
  collaboratorId,
  initialCollaborator,
}: {
  branches: ServerBranch[];
  collaboratorId: string;
  initialCollaborator: CollaboratorRecord | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [collaborator, setCollaborator] = useState(initialCollaborator);
  const [hasResolvedCollaborator, setHasResolvedCollaborator] = useState(
    Boolean(initialCollaborator),
  );
  const isEditorOpen = searchParams.get("edit") === "1";

  const closeEditor = () => {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete("edit");
    const nextUrl = nextSearchParams.toString()
      ? `${pathname}?${nextSearchParams.toString()}`
      : pathname;

    router.replace(nextUrl);
  };

  useEffect(() => {
    const syncCollaborator = () => {
      const storedCollaborators = readStoredCollaborators();
      const storedCollaborator =
        storedCollaborators?.find((item) => item.id === collaboratorId) ?? null;

      setCollaborator(storedCollaborator ?? initialCollaborator);
      setHasResolvedCollaborator(true);
    };

    syncCollaborator();
    window.addEventListener("storage", syncCollaborator);

    return () => {
      window.removeEventListener("storage", syncCollaborator);
    };
  }, [collaboratorId, initialCollaborator]);

  if (!hasResolvedCollaborator) {
    return (
      <section className="workspace-section collaborator-profile-page">
        <header className="workspace-intro collaborator-profile__intro">
          <p className="organization-pane-label">Registro individual</p>
          <h2>Carregando colaborador</h2>
          <p className="workspace-copy">
            Preparando a ficha individual com os dados mais recentes.
          </p>
        </header>
      </section>
    );
  }

  if (!collaborator) {
    return (
      <section className="workspace-section collaborator-profile-page">
        <header className="workspace-intro collaborator-profile__intro">
          <p className="organization-pane-label">Registro individual</p>
          <h2>Colaborador não encontrado</h2>
          <p className="workspace-copy">
            Não foi possível localizar este cadastro na base atual de
            colaboradores.
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

  const roleLine = [collaborator.role, collaborator.department]
    .filter(Boolean)
    .join(" • ");
  const availableRoles = (() => {
    const storedRoles = readStoredRoles();

    if (storedRoles?.length) {
      return storedRoles;
    }

    return createInitialRoles(collaborator ? [collaborator] : []);
  })();

  const updateCollaborator = (nextCollaborator: CollaboratorRecord) => {
    const storedCollaborators = readStoredCollaborators();
    const storedRoles = readStoredRoles();
    const nextCollaborators = mergeCollaborators(
      storedCollaborators?.length
        ? storedCollaborators
        : initialCollaborator
          ? [initialCollaborator]
          : [],
      [nextCollaborator],
    );
    const nextRoles = mergeRoles(
      storedRoles?.length ? storedRoles : createInitialRoles(nextCollaborators),
      createInitialRoles([nextCollaborator]),
    );

    writeStoredCollaborators(nextCollaborators);
    writeStoredRoles(nextRoles);
    setCollaborator(nextCollaborator);
    closeEditor();
  };

  return (
    <>
      <section className="workspace-section workspace-section--fill collaborator-profile-page">
        <header className="workspace-intro collaborator-profile__intro">
          <p className="organization-pane-label">Registro individual</p>
          <h2>{collaborator.fullName}</h2>
          <p className="workspace-copy">
            {roleLine ||
              "Ficha individual do colaborador com dados operacionais, contratuais e cadastrais."}
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
                <CollaboratorDetailItem label="CPF" value={collaborator.cpf} />
                <CollaboratorDetailItem
                  label="ID interno"
                  value={collaborator.id}
                />
                <CollaboratorDetailItem
                  label="Data de nascimento"
                  value={formatDateLabel(collaborator.birthDate)}
                />
                <CollaboratorDetailItem
                  label="Gênero"
                  value={collaborator.gender}
                />
                <CollaboratorDetailItem
                  label="Escolaridade"
                  value={collaborator.educationLevel}
                />
              </dl>
            </article>

            <article className="content-panel">
              <div className="section-heading">
                <h3>Contato e lotação</h3>
              </div>
              <dl className="definition-list">
                <CollaboratorDetailItem
                  label="E-mail"
                  value={collaborator.email}
                />
                <CollaboratorDetailItem
                  label="Telefone"
                  value={collaborator.phone}
                />
                <CollaboratorDetailItem
                  label="Departamento"
                  value={collaborator.department}
                />
                <CollaboratorDetailItem
                  label="Cargo"
                  value={collaborator.role}
                />
                <CollaboratorDetailItem
                  label="Filial"
                  value={collaborator.branchName}
                />
                <CollaboratorDetailItem
                  label="ID da filial"
                  value={collaborator.branchId}
                />
                <CollaboratorDetailItem
                  label="Localização adicional"
                  value={collaborator.additionalLocation}
                />
              </dl>
            </article>
          </div>

          <div className="collaborator-profile__column collaborator-profile__column--aside">
            <article className="content-panel">
              <div className="section-heading">
                <h3>Resumo profissional</h3>
              </div>
              <dl className="definition-list">
                <div>
                  <dt>Status</dt>
                  <dd>
                    <span
                      className={getCollaboratorStatusClass(
                        collaborator.status,
                      )}
                    >
                      {collaborator.status}
                    </span>
                  </dd>
                </div>
                <CollaboratorDetailItem
                  label="Contrato"
                  value={collaborator.employmentType}
                />
                <CollaboratorDetailItem
                  label="Admissão"
                  value={formatDateLabel(collaborator.hireDate)}
                />
                <CollaboratorDetailItem
                  label="Demissão"
                  value={formatDateLabel(collaborator.terminationDate)}
                />
              </dl>
            </article>

            <article className="content-panel collaborator-profile__notes-panel">
              <div className="section-heading">
                <h3>Observações</h3>
              </div>
              <p className="collaborator-profile__notes">
                {getDisplayValue(collaborator.notes)}
              </p>
            </article>
          </div>
        </div>
      </section>

      <CollaboratorEditorModal
        branches={branches}
        initialCollaborator={collaborator}
        isOpen={isEditorOpen}
        onClose={closeEditor}
        onSubmit={updateCollaborator}
        roles={availableRoles}
      />
    </>
  );
}
