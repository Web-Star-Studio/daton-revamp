"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useDeferredValue, useMemo, useState } from "react";

import type { Role } from "@daton/contracts";

import {
  describeAccessRole,
  formatAccessRole,
  formatBranchScope,
  formatMemberStatus,
  getBranchNamesForMember,
} from "@/lib/organization-members";
import type { ServerBranch, ServerOrganizationMember } from "@/lib/server-api";

type CollaboratorsWorkspaceProps = {
  branches: ServerBranch[];
  members: ServerOrganizationMember[];
};

type RoleSummary = {
  branchIds: string[];
  hasGlobalAccess: boolean;
  key: Role;
  members: ServerOrganizationMember[];
};

export function CollaboratorsWorkspace({
  branches,
  members,
}: CollaboratorsWorkspaceProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState("");
  const [roleSearchValue, setRoleSearchValue] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue);
  const deferredRoleSearchValue = useDeferredValue(roleSearchValue);
  const activeTab = searchParams.get("tab") === "roles" ? "roles" : "overview";
  const selectedRoleId = searchParams.get("role") ?? "";
  const activeMembers = members.filter((member) => member.status === "active").length;
  const representedBranches = new Set(
    members.flatMap((member) => member.branchIds).filter(Boolean),
  ).size;
  const membersWithGlobalAccess = members.filter(
    (member) => member.hasGlobalAccess,
  ).length;

  const filteredMembers = useMemo(() => {
    const normalizedSearch = deferredSearchValue.trim().toLocaleLowerCase("pt-BR");

    if (!normalizedSearch) {
      return members;
    }

    return members.filter((member) =>
      [
        member.fullName,
        member.email,
        member.roles.map((role) => formatAccessRole(role)).join(" "),
        formatBranchScope(member, branches),
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedSearch),
    );
  }, [branches, deferredSearchValue, members]);

  const roleSummaries = useMemo(() => {
    const summaries = new Map<string, RoleSummary>();

    members.forEach((member) => {
      member.roles.forEach((role) => {
        const current = summaries.get(role);

        if (current) {
          current.members.push(member);
          current.hasGlobalAccess ||= member.hasGlobalAccess;
          member.branchIds.forEach((branchId) => {
            if (!current.branchIds.includes(branchId)) {
              current.branchIds.push(branchId);
            }
          });
          return;
        }

        summaries.set(role, {
          branchIds: [...member.branchIds],
          hasGlobalAccess: member.hasGlobalAccess,
          key: role,
          members: [member],
        });
      });
    });

    return Array.from(summaries.values()).sort((left, right) =>
      formatAccessRole(left.key).localeCompare(formatAccessRole(right.key), "pt-BR"),
    );
  }, [members]);

  const filteredRoles = useMemo(() => {
    const normalizedSearch = deferredRoleSearchValue
      .trim()
      .toLocaleLowerCase("pt-BR");

    if (!normalizedSearch) {
      return roleSummaries;
    }

    return roleSummaries.filter((role) =>
      [
        formatAccessRole(role.key),
        describeAccessRole(role.key),
        role.members.map((member) => member.fullName).join(" "),
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedSearch),
    );
  }, [deferredRoleSearchValue, roleSummaries]);

  const selectedRole = filteredRoles.find((role) => role.key === selectedRoleId) ?? null;

  const tabs = [
    {
      key: "overview",
      label: "Colaboradores",
      href: pathname,
    },
    {
      key: "roles",
      label: "Perfis de acesso",
      href: `${pathname}?tab=roles`,
    },
  ] as const;

  function toggleRoleSelection(roleId: string) {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("tab", "roles");

    if (selectedRoleId === roleId) {
      nextSearchParams.delete("role");
    } else {
      nextSearchParams.set("role", roleId);
    }

    const nextQuery = nextSearchParams.toString();

    startTransition(() => {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    });
  }

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
                <div className="collaborators-panel__filters collaborators-panel__filters--single">
                  <label className="collaborators-field collaborators-field--search">
                    <span>Buscar</span>
                    <input
                      onChange={(event) => setSearchValue(event.currentTarget.value)}
                      placeholder="Nome, e-mail, perfil de acesso ou unidade"
                      type="search"
                      value={searchValue}
                    />
                  </label>
                </div>
              </div>

              {filteredMembers.length > 0 ? (
                <div className="collaborators-table">
                  <div className="collaborators-table__head">
                    <span>Colaborador</span>
                    <span>Perfis de acesso</span>
                    <span>Escopo</span>
                    <span>Status</span>
                  </div>
                  <ul className="collaborators-table__body">
                    {filteredMembers.map((member) => (
                      <li key={member.id}>
                        <Link
                          className="collaborators-row collaborators-row--interactive"
                          href={`/app/social/collaborators/${member.id}`}
                        >
                          <div className="collaborators-row__primary">
                            <strong>{member.fullName}</strong>
                            <span>{member.email}</span>
                            <span>{member.userId}</span>
                          </div>
                          <div className="collaborators-row__secondary">
                            <strong>
                              {member.roles.length > 0
                                ? member.roles.map((role) => formatAccessRole(role)).join(", ")
                                : "Sem perfis atribuídos"}
                            </strong>
                            <span>
                              {member.roles.length > 0
                                ? member.roles.map((role) => describeAccessRole(role)).join(" ")
                                : "Nenhum papel de acesso ativo foi encontrado para este membro."}
                            </span>
                          </div>
                          <div className="collaborators-row__branch">
                            <strong>{formatBranchScope(member, branches)}</strong>
                            <span>
                              {member.managedBranchIds.length > 0
                                ? "Possui gestão ativa de unidade."
                                : "Sem gestão de unidade vinculada."}
                            </span>
                            <span>
                              {getBranchNamesForMember(member, branches).length > 0
                                ? getBranchNamesForMember(member, branches).join(", ")
                                : "Sem unidade específica vinculada"}
                            </span>
                          </div>
                          <div className="collaborators-row__status">
                            <strong>{formatMemberStatus(member.status)}</strong>
                            <span>
                              {member.hasGlobalAccess
                                ? "Acesso organizacional amplo"
                                : "Acesso restrito ao escopo listado"}
                            </span>
                            <span>{member.id}</span>
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
                    A busca atual não retornou membros da organização com base
                    nos dados reais da API.
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
                      placeholder="Perfil, descrição ou colaborador"
                      type="search"
                      value={roleSearchValue}
                    />
                  </label>
                </div>
              </div>

              {filteredRoles.length > 0 ? (
                <div className="collaborators-table collaborators-table--roles">
                  <div className="collaborators-table__head collaborators-table__head--roles">
                    <span>Perfil</span>
                    <span>Descrição</span>
                    <span>Membros vinculados</span>
                  </div>
                  <ul className="collaborators-table__body">
                    {filteredRoles.map((role) => (
                      <li key={role.key}>
                        <button
                          className={`collaborators-row collaborators-row--interactive collaborators-row--roles${
                            selectedRole?.key === role.key
                              ? " collaborators-row--selected"
                              : ""
                          }`}
                          onClick={() => toggleRoleSelection(role.key)}
                          type="button"
                        >
                          <div className="collaborators-row__primary">
                            <strong>{formatAccessRole(role.key)}</strong>
                            <span>{describeAccessRole(role.key)}</span>
                            <span>{role.key}</span>
                          </div>
                          <div className="collaborators-row__secondary">
                            <strong>
                              {role.hasGlobalAccess
                                ? "Todas as unidades ativas"
                                : `${role.branchIds.length} unidade${role.branchIds.length === 1 ? "" : "s"} com escopo`}
                            </strong>
                            <span>
                              {role.hasGlobalAccess
                                ? "Há pelo menos um membro com acesso global."
                                : "Escopo agregado a partir dos vínculos reais dos membros."}
                            </span>
                          </div>
                          <div className="collaborators-row__branch">
                            <strong>
                              {role.members.length} membro
                              {role.members.length === 1 ? "" : "s"}
                            </strong>
                            <span>
                              {role.members
                                .slice(0, 3)
                                .map((member) => member.fullName)
                                .join(", ") || "Nenhum membro ativo"}
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="collaborators-empty-state">
                  <strong>Nenhum perfil encontrado</strong>
                  <p>
                    Não há perfis de acesso reais compatíveis com a busca atual.
                  </p>
                </div>
              )}

              {selectedRole ? (
                <div className="content-panel collaborator-profile__notes-panel">
                  <div className="section-heading">
                    <h3>{formatAccessRole(selectedRole.key)}</h3>
                  </div>
                  <p className="workspace-copy">
                    {describeAccessRole(selectedRole.key)}
                  </p>
                  <p className="workspace-copy">
                    {selectedRole.hasGlobalAccess
                      ? "Este perfil possui ao menos um membro com acesso global a todas as unidades ativas."
                      : "Este perfil está vinculado apenas às unidades listadas pelos membros atuais."}
                  </p>
                  <p className="workspace-copy">
                    {selectedRole.members
                      .map((member) => member.fullName)
                      .join(", ")}
                  </p>
                </div>
              ) : null}
            </>
          )}
        </div>
      </article>

      <div className="workspace-copy">
        {activeMembers} membro{activeMembers === 1 ? "" : "s"} ativo
        {activeMembers === 1 ? "" : "s"} · {representedBranches} unidade
        {representedBranches === 1 ? "" : "s"} representada
        {representedBranches === 1 ? "" : "s"} · {membersWithGlobalAccess} com
        acesso global
      </div>
    </section>
  );
}
