import Image from "next/image";
import Link from "next/link";

import { formatCnpj } from "@daton/contracts";

import { CopyButton } from "@/components/copy-button";
import { MaterialIcon } from "@/components/app-icons";
import { BranchEditorModal } from "@/components/branch-editor-modal";
import { getServerBranches, type ServerBranch } from "@/lib/server-api";
import { requireSession } from "@/lib/session";
import { formatBranchStatus, formatRole } from "@/lib/utils";

type OrganizationSettingsPageProps = {
  searchParams: Promise<{
    branch?: string;
    edit?: string;
  }>;
};

type BranchTreeNode = {
  branch: ServerBranch;
  children: BranchTreeNode[];
};

const collator = new Intl.Collator("pt-BR");

function sortBranches(branches: ServerBranch[]) {
  return [...branches].sort(
    (left, right) =>
      Number(right.isHeadquarters) - Number(left.isHeadquarters) ||
      collator.compare(left.name, right.name),
  );
}

function buildBranchTree(branches: ServerBranch[]) {
  const branchIds = new Set(branches.map((branch) => branch.id));
  const childrenByParent = new Map<string | null, ServerBranch[]>();

  for (const branch of branches) {
    const parentId =
      branch.parentBranchId && branchIds.has(branch.parentBranchId)
        ? branch.parentBranchId
        : null;
    const current = childrenByParent.get(parentId) ?? [];
    current.push(branch);
    childrenByParent.set(parentId, current);
  }

  const toNode = (
    branch: ServerBranch,
    visited = new Set<string>(),
  ): BranchTreeNode => {
    if (visited.has(branch.id)) {
      return {
        branch,
        children: [],
      };
    }

    const nextVisited = new Set(visited);
    nextVisited.add(branch.id);

    return {
      branch,
      children: sortBranches(childrenByParent.get(branch.id) ?? []).map(
        (child) => toNode(child, nextVisited),
      ),
    };
  };

  const topLevelBranches = sortBranches(childrenByParent.get(null) ?? []);
  const headquarterBranch =
    topLevelBranches.find((branch) => branch.isHeadquarters) ??
    sortBranches(branches).find((branch) => branch.isHeadquarters) ??
    topLevelBranches[0] ??
    null;

  if (!headquarterBranch) {
    return {
      headquarterNode: null,
      topLevelBranches,
    };
  }

  const directChildren = sortBranches(
    childrenByParent.get(headquarterBranch.id) ?? [],
  );
  const reparentedTopLevelSiblings = topLevelBranches.filter(
    (branch) => branch.id !== headquarterBranch.id,
  );

  return {
    headquarterNode: {
      branch: headquarterBranch,
      children: [...directChildren, ...reparentedTopLevelSiblings].map(
        (branch) => toNode(branch),
      ),
    },
    topLevelBranches,
  };
}

function getInitials(value: string | null | undefined) {
  if (!value) {
    return "DT";
  }

  const parts = value.trim().split(/\s+/).filter(Boolean);
  const firstPart = parts[0] ?? "";

  if (parts.length === 0) {
    return "DT";
  }

  if (parts.length === 1) {
    return firstPart.slice(0, 2).toUpperCase();
  }

  const lastPart = parts[parts.length - 1] ?? "";
  return `${firstPart.charAt(0)}${lastPart.charAt(0)}`.toUpperCase();
}

function buildOrganizationHref(
  branchId?: string | null,
  headquarterId?: string | null,
) {
  if (!branchId || branchId === headquarterId) {
    return "/app/settings/organization";
  }

  return `/app/settings/organization?branch=${branchId}`;
}

function renderBranchNodes(
  nodes: BranchTreeNode[],
  selectedBranchId: string | null,
  headquarterId: string | null,
) {
  if (nodes.length === 0) {
    return null;
  }

  return (
    <ul className="organization-tree__list organization-tree__list--nested">
      {nodes.map((node) => {
        const isActive = node.branch.id === selectedBranchId;

        return (
          <li className="organization-tree__item" key={node.branch.id}>
            <Link
              className={`organization-tree__link${isActive ? " organization-tree__link--active" : ""}`}
              href={buildOrganizationHref(node.branch.id, headquarterId)}
            >
              <span className="organization-tree__icon-wrap" aria-hidden="true">
                <MaterialIcon
                  className="organization-tree__icon"
                  icon="storefront"
                />
              </span>
              <span className="organization-tree__content">
                <span className="organization-tree__title">
                  {node.branch.name}
                </span>
                <span className="organization-tree__meta">
                  {formatCnpj(node.branch.legalIdentifier)}
                </span>
              </span>
              <span className="organization-tree__actions" aria-hidden="true">
                <MaterialIcon
                  className="organization-tree__action-icon"
                  icon="more_horiz"
                />
              </span>
            </Link>
            {renderBranchNodes(node.children, selectedBranchId, headquarterId)}
          </li>
        );
      })}
    </ul>
  );
}

export default async function OrganizationSettingsPage({
  searchParams,
}: OrganizationSettingsPageProps) {
  const [resolvedSearchParams, session, branches] = (await Promise.all([
    searchParams,
    requireSession(),
    getServerBranches(),
  ])) as [
    Awaited<OrganizationSettingsPageProps["searchParams"]>,
    Awaited<ReturnType<typeof requireSession>>,
    ServerBranch[],
  ];
  const branchId = resolvedSearchParams.branch;
  const isEditOpen = resolvedSearchParams.edit === "1";

  const { headquarterNode } = buildBranchTree(branches);
  const headquarterBranch = headquarterNode?.branch ?? null;
  const selectedBranch =
    branches.find((branch) => branch.id === branchId) ??
    headquarterBranch ??
    branches[0] ??
    null;
  const organization = session.organization;
  const member = session.member;
  const selectedStatus = selectedBranch
    ? formatBranchStatus(selectedBranch.status)
    : "Ativa";
  const selectedKind = selectedBranch
    ? selectedBranch.isHeadquarters
      ? "Matriz"
      : "Filial"
    : "Organização";
  const detailCnpj =
    selectedBranch?.legalIdentifier ?? organization?.legalIdentifier ?? null;
  const organizationName =
    organization?.legalName ?? selectedBranch?.name ?? "Organização";
  const detailTitle = selectedBranch?.name ?? organizationName;
  const organizationTradeName = organization?.tradeName ?? "Não definido";
  const memberName =
    member?.fullName ?? session.user.name ?? session.user.email;
  const memberRoles = session.effectiveRoles.map((role: string) =>
    formatRole(role),
  );
  const memberBadge = memberRoles[0] ?? "Membro atual";
  const branchLine = selectedBranch
    ? `${selectedBranch.code} • ${selectedBranch.isHeadquarters ? "Unidade matriz" : "Unidade vinculada"}`
    : "Estrutura principal da organização";

  return (
    <section className="workspace-section workspace-section--fill organization-page">
      <div className="organization-layout">
        <aside className="organization-tree-pane">
          <p className="organization-pane-label">Estrutura hierárquica</p>
          {headquarterNode ? (
            <div className="organization-tree">
              <Link
                className={`organization-tree__link organization-tree__link--root${
                  selectedBranch?.id === headquarterNode.branch.id
                    ? " organization-tree__link--active"
                    : ""
                }`}
                href={buildOrganizationHref(
                  headquarterNode.branch.id,
                  headquarterNode.branch.id,
                )}
              >
                <span
                  className="organization-tree__icon-wrap"
                  aria-hidden="true"
                >
                  <MaterialIcon
                    className="organization-tree__icon"
                    icon="domain"
                  />
                </span>
                <span className="organization-tree__content">
                  <span className="organization-tree__title">
                    {headquarterNode.branch.name}
                  </span>
                  <span className="organization-tree__meta">
                    {formatCnpj(headquarterNode.branch.legalIdentifier)}
                  </span>
                </span>
                <span className="organization-tree__actions" aria-hidden="true">
                  <MaterialIcon
                    className="organization-tree__action-icon"
                    icon="more_horiz"
                  />
                </span>
              </Link>
              {renderBranchNodes(
                headquarterNode.children,
                selectedBranch?.id ?? null,
                headquarterNode.branch.id,
              )}
            </div>
          ) : (
            <div className="organization-tree__empty">
              <strong>Nenhuma filial encontrada</strong>
              <p>
                Cadastre a filial matriz para visualizar a estrutura da
                organização.
              </p>
            </div>
          )}
        </aside>

        <section className="organization-detail-pane">
          <div className="organization-detail__inner">
            <div className="organization-entity">
              <div className="organization-entity__identity">
                <div className="organization-entity__copy">
                  <div className="organization-entity__title-row">
                    <h2 className="organization-entity__title">
                      {detailTitle}
                    </h2>
                  </div>
                  <p className="organization-entity__subtitle">
                    <MaterialIcon icon="location_on" />
                    <span>{branchLine}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="organization-card-grid">
              <article className="organization-card">
                <div className="organization-card__heading">
                  <h3 className="organization-card__title">
                    <MaterialIcon icon="badge" />
                    <span>Dados Cadastrais</span>
                  </h3>
                </div>
                <dl className="organization-data-list">
                  <div>
                    <dt>Razão Social</dt>
                    <dd>{organizationName}</dd>
                  </div>
                  <div>
                    <dt>Nome Fantasia</dt>
                    <dd>{organizationTradeName}</dd>
                  </div>
                  <div>
                    <dt>CNPJ</dt>
                    <dd className="organization-inline-value">
                      <span className="organization-data-list__mono">
                        {detailCnpj ? formatCnpj(detailCnpj) : "Indisponível"}
                      </span>
                      {detailCnpj ? (
                        <CopyButton
                          size="compact"
                          value={formatCnpj(detailCnpj)}
                        />
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt>Data de Abertura</dt>
                    <dd>Indisponível no payload atual</dd>
                  </div>
                </dl>
              </article>

              <article className="organization-card">
                <div className="organization-card__heading">
                  <h3 className="organization-card__title">
                    <MaterialIcon icon="account_balance" />
                    <span>Fiscal</span>
                  </h3>
                  <span className="organization-card__status">
                    Em integração
                  </span>
                </div>
                <dl className="organization-data-list">
                  <div>
                    <dt>Regime Tributário</dt>
                    <dd>Indisponível no payload atual</dd>
                  </div>
                  <div>
                    <dt>CNAE Principal</dt>
                    <dd>Indisponível no payload atual</dd>
                  </div>
                  <div>
                    <dt>Inscrição Estadual</dt>
                    <dd className="organization-data-list__mono">
                      Indisponível
                    </dd>
                  </div>
                  <div>
                    <dt>Inscrição Municipal</dt>
                    <dd className="organization-data-list__mono">
                      Indisponível
                    </dd>
                  </div>
                </dl>
              </article>
            </div>
          </div>
        </section>
      </div>
      {selectedBranch ? (
        <BranchEditorModal
          branch={selectedBranch}
          branches={branches}
          open={isEditOpen}
        />
      ) : null}
    </section>
  );
}
