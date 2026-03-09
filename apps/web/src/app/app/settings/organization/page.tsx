import Link from "next/link";

import { formatCnpj } from "@daton/contracts";

import { AuthRedirect } from "@/components/auth-redirect";
import { CopyButton } from "@/components/copy-button";
import { MaterialIcon } from "@/components/app-icons";
import { OrganizationProfileForm } from "@/components/organization-profile-form";
import { OrganizationDepartmentsWorkspace } from "@/components/organization-departments-workspace";
import { OrganizationUnitsWorkspace } from "@/components/organization-units-workspace";
import {
  getServerBranches,
  getServerDepartments,
  getServerOrganizationMembers,
  type ServerBranch,
  type ServerDepartment,
  type ServerOrganizationMember,
  type ServerSession,
} from "@/lib/server-api";
import { requireSession } from "@/lib/session";
import { formatBranchStatus } from "@/lib/utils";

type OrganizationSettingsSearchParams = {
  branch?: string;
  departmentBranch?: string;
  departmentQ?: string;
  departmentStatus?: string;
  edit?: string;
  kind?: string;
  q?: string;
  status?: string;
  tab?: string;
};

type OrganizationSettingsPageProps = {
  searchParams: Promise<OrganizationSettingsSearchParams>;
};

type BranchTreeNode = {
  branch: ServerBranch;
  children: BranchTreeNode[];
};

type OrganizationTab = "units" | "departments";
type OrganizationUnitStatusFilter = "all" | "active" | "archived";
type OrganizationUnitKindFilter = "all" | "headquarters" | "branch";
type SessionOrganization = NonNullable<ServerSession["organization"]>;

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
  };
}

function getActiveOrganizationTab(tab?: string): OrganizationTab {
  if (tab === "departments") {
    return "departments";
  }

  return "units";
}

function buildOrganizationHref({
  branchId,
  headquarterId,
  tab = "units",
  departmentBranch = "all",
  departmentSearch,
  departmentStatus = "all",
  unitSearch,
  unitStatus = "all",
  unitKind = "all",
}: {
  branchId?: string | null;
  departmentBranch?: string;
  departmentSearch?: string;
  departmentStatus?: "all" | "active" | "archived";
  headquarterId?: string | null;
  tab?: OrganizationTab;
  unitSearch?: string;
  unitStatus?: OrganizationUnitStatusFilter;
  unitKind?: OrganizationUnitKindFilter;
}) {
  const searchParams = new URLSearchParams();

  if (tab !== "units") {
    searchParams.set("tab", tab);
  }

  if (branchId && branchId !== headquarterId) {
    searchParams.set("branch", branchId);
  }

  if (tab === "units") {
    const normalizedSearch = unitSearch?.trim() ?? "";

    if (normalizedSearch) {
      searchParams.set("q", normalizedSearch);
    }

    if (unitStatus !== "all") {
      searchParams.set("status", unitStatus);
    }

    if (unitKind !== "all") {
      searchParams.set("kind", unitKind);
    }
  }

  if (tab === "departments") {
    const normalizedSearch = departmentSearch?.trim() ?? "";

    if (normalizedSearch) {
      searchParams.set("departmentQ", normalizedSearch);
    }

    if (departmentStatus !== "all") {
      searchParams.set("departmentStatus", departmentStatus);
    }

    if (departmentBranch !== "all") {
      searchParams.set("departmentBranch", departmentBranch);
    }
  }

  const query = searchParams.toString();
  return query
    ? `/app/settings/organization?${query}`
    : "/app/settings/organization";
}

function getUnitStatusFilter(
  value?: string,
): OrganizationUnitStatusFilter {
  if (value === "active" || value === "archived") {
    return value;
  }

  return "all";
}

function getUnitKindFilter(value?: string): OrganizationUnitKindFilter {
  if (value === "headquarters" || value === "branch") {
    return value;
  }

  return "all";
}

function formatOrganizationValue(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : "Não informado";
}

function formatOrganizationOpeningDate(value?: string | null) {
  if (!value) {
    return "Não informado";
  }

  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return "Não informado";
  }

  return `${day}/${month}/${year}`;
}

function formatOnboardingStatus(status: SessionOrganization["onboardingStatus"]) {
  switch (status) {
    case "completed":
      return "Onboarding concluído";
    case "skipped":
      return "Onboarding pulado";
    default:
      return "Onboarding pendente";
  }
}

function renderBranchNodes(
  nodes: BranchTreeNode[],
  selectedBranchId: string | null,
  headquarterId: string | null,
  activeTab: OrganizationTab,
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
              href={buildOrganizationHref({
                branchId: node.branch.id,
                headquarterId,
                tab: activeTab,
              })}
            >
              <span
                className="organization-tree__icon-wrap organization-tree__icon-wrap--branch"
                aria-hidden="true"
              >
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
            {renderBranchNodes(
              node.children,
              selectedBranchId,
              headquarterId,
              activeTab,
            )}
          </li>
        );
      })}
    </ul>
  );
}

function OrganizationTreePane({
  activeTab,
  headquarterNode,
  selectedBranchId,
}: {
  activeTab: OrganizationTab;
  headquarterNode: BranchTreeNode | null;
  selectedBranchId: string | null;
}) {
  return (
    <aside className="organization-tree-pane">
      <p className="organization-pane-label">Estrutura hierárquica</p>
      {headquarterNode ? (
        <div className="organization-tree">
          <Link
            className={`organization-tree__link organization-tree__link--root${
              selectedBranchId === headquarterNode.branch.id
                ? " organization-tree__link--active"
                : ""
            }`}
            href={buildOrganizationHref({
              branchId: headquarterNode.branch.id,
              headquarterId: headquarterNode.branch.id,
              tab: activeTab,
            })}
          >
            <span
              className="organization-tree__icon-wrap organization-tree__icon-wrap--matrix"
              aria-hidden="true"
            >
              <MaterialIcon className="organization-tree__icon" icon="domain" />
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
            selectedBranchId,
            headquarterNode.branch.id,
            activeTab,
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
  );
}

function OrganizationEntityHeader({
  title,
  subtitle,
  badges,
  editHref,
}: {
  title: string;
  subtitle: string;
  badges: Array<{ label: string; tone: "muted" | "success" }>;
  editHref?: string | null;
}) {
  return (
    <div className="organization-entity">
      <div className="organization-entity__identity">
        <div className="organization-entity__copy">
          <div className="organization-entity__title-row">
            <h2 className="organization-entity__title">{title}</h2>
            {badges.map((badge) => (
              <span
                className={`organization-chip organization-chip--${badge.tone}`}
                key={badge.label}
              >
                {badge.label}
              </span>
            ))}
          </div>
          <p className="organization-entity__subtitle">
            <MaterialIcon icon="location_on" />
            <span>{subtitle}</span>
          </p>
        </div>
      </div>
      {editHref ? (
        <Link className="button button--secondary organization-entity__edit" href={editHref}>
          <MaterialIcon icon="edit" />
          <span>Editar dados</span>
        </Link>
      ) : null}
    </div>
  );
}

function OrganizationOverviewPanel({
  activeTab,
  headquarterNode,
  selectedBranch,
  organization,
  detailTitle,
  branchLine,
  selectedKind,
  selectedStatus,
  editHref,
}: {
  activeTab: OrganizationTab;
  headquarterNode: BranchTreeNode | null;
  selectedBranch: ServerBranch | null;
  organization: SessionOrganization;
  detailTitle: string;
  branchLine: string;
  selectedKind: string;
  selectedStatus: string;
  editHref?: string | null;
}) {
  return (
    <div className="organization-layout">
      <OrganizationTreePane
        activeTab={activeTab}
        headquarterNode={headquarterNode}
        selectedBranchId={selectedBranch?.id ?? null}
      />

      <section className="organization-detail-pane">
        <div className="organization-detail__inner">
          <OrganizationEntityHeader
            badges={[
              { label: selectedKind, tone: "muted" },
              { label: selectedStatus, tone: "success" },
            ]}
            editHref={editHref}
            subtitle={branchLine}
            title={detailTitle}
          />

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
                  <dd>{organization.legalName}</dd>
                </div>
                <div>
                  <dt>Nome Fantasia</dt>
                  <dd>{formatOrganizationValue(organization.tradeName)}</dd>
                </div>
                <div>
                  <dt>CNPJ</dt>
                  <dd className="organization-inline-value">
                    <span className="organization-data-list__mono">
                      {formatCnpj(organization.legalIdentifier)}
                    </span>
                    <CopyButton
                      size="compact"
                      value={formatCnpj(organization.legalIdentifier)}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Data de Abertura</dt>
                  <dd>{formatOrganizationOpeningDate(organization.openingDate)}</dd>
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
                  {formatOnboardingStatus(organization.onboardingStatus)}
                </span>
              </div>
              <dl className="organization-data-list">
                <div>
                  <dt>Regime Tributário</dt>
                  <dd>{formatOrganizationValue(organization.taxRegime)}</dd>
                </div>
                <div>
                  <dt>CNAE Principal</dt>
                  <dd>{formatOrganizationValue(organization.primaryCnae)}</dd>
                </div>
                <div>
                  <dt>Inscrição Estadual</dt>
                  <dd className="organization-data-list__mono">
                    {formatOrganizationValue(organization.stateRegistration)}
                  </dd>
                </div>
                <div>
                  <dt>Inscrição Municipal</dt>
                  <dd className="organization-data-list__mono">
                    {formatOrganizationValue(organization.municipalRegistration)}
                  </dd>
                </div>
              </dl>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}

export default async function OrganizationSettingsPage({
  searchParams,
}: OrganizationSettingsPageProps) {
  const [resolvedSearchParams, session] = await Promise.all([
    searchParams,
    requireSession(),
  ]);

  if (!session) {
    return <AuthRedirect href="/sign-in" />;
  }

  if (!session.organization) {
    return <AuthRedirect href="/create-organization" />;
  }

  const [branches, members, departments] = (await Promise.all([
    getServerBranches(),
    getServerOrganizationMembers(),
    getServerDepartments(),
  ])) as [
    ServerBranch[],
    ServerOrganizationMember[],
    ServerDepartment[],
  ];

  const branchId = resolvedSearchParams.branch;
  const activeTab = getActiveOrganizationTab(resolvedSearchParams.tab);
  const isEditOrganization = resolvedSearchParams.edit === "organization";
  const unitSearchValue = resolvedSearchParams.q?.trim() ?? "";
  const unitStatusFilter = getUnitStatusFilter(resolvedSearchParams.status);
  const unitKindFilter = getUnitKindFilter(resolvedSearchParams.kind);
  const departmentSearchValue = resolvedSearchParams.departmentQ?.trim() ?? "";
  const departmentStatusFilter =
    resolvedSearchParams.departmentStatus === "active" ||
    resolvedSearchParams.departmentStatus === "archived"
      ? resolvedSearchParams.departmentStatus
      : "all";
  const departmentBranchFilter =
    resolvedSearchParams.departmentBranch?.trim() || "all";

  const { headquarterNode } = buildBranchTree(branches);
  const headquarterBranch = headquarterNode?.branch ?? null;
  const selectedBranch =
    branches.find((branch) => branch.id === branchId) ??
    headquarterBranch ??
    branches[0] ??
    null;
  const organization = session.organization;
  const canManageOrganization = session.effectiveRoles.some(
    (role) => role === "owner" || role === "admin",
  );
  const currentViewHref = buildOrganizationHref({
    branchId: selectedBranch?.id ?? null,
    headquarterId: headquarterBranch?.id ?? null,
    tab: activeTab,
    departmentBranch: departmentBranchFilter,
    departmentSearch: departmentSearchValue,
    departmentStatus: departmentStatusFilter,
    unitSearch: unitSearchValue,
    unitStatus: unitStatusFilter,
    unitKind: unitKindFilter,
  });
  const organizationEditHref = currentViewHref.includes("?")
    ? `${currentViewHref}&edit=organization`
    : `${currentViewHref}?edit=organization`;
  const detailTitle =
    selectedBranch?.name ??
    organization.tradeName ??
    organization.legalName;
  const branchLine =
    [
      selectedBranch?.addressLine1,
      selectedBranch?.city,
      selectedBranch?.stateOrProvince,
      selectedBranch?.country,
    ]
      .filter(Boolean)
      .join(" • ") || "Localização da unidade não informada";
  const selectedKind = selectedBranch
    ? selectedBranch.isHeadquarters
      ? "Matriz"
      : "Filial"
    : "Organização";
  const selectedStatus = selectedBranch
    ? formatBranchStatus(selectedBranch.status)
    : "Sem unidades";

  const tabs = [
    {
      key: "units",
      label: "Unidades",
      href: buildOrganizationHref({
        tab: "units",
        unitSearch: unitSearchValue,
        unitStatus: unitStatusFilter,
        unitKind: unitKindFilter,
      }),
    },
    {
      key: "departments",
      label: "Departamentos",
      href: buildOrganizationHref({
        branchId: selectedBranch?.id ?? null,
        headquarterId: headquarterBranch?.id ?? null,
        departmentBranch: departmentBranchFilter,
        departmentSearch: departmentSearchValue,
        departmentStatus: departmentStatusFilter,
        tab: "departments",
      }),
    },
  ] as const;

  return (
    <section className="workspace-section workspace-section--fill organization-page">
      {isEditOrganization ? (
        <article className="content-panel organization-profile-card">
          <header className="organization-profile-card__header">
            <p className="workspace-kicker">Organização</p>
            <h2>Atualize os dados fiscais e cadastrais complementares.</h2>
            <p>
              Este é o mesmo formulário usado no onboarding inicial da
              organização. Você pode salvar parcialmente e revisar quando quiser.
            </p>
          </header>
          <OrganizationProfileForm
            cancelHref={currentViewHref}
            onSuccessHref={currentViewHref}
            organization={organization}
          />
        </article>
      ) : (
        <OrganizationOverviewPanel
          activeTab={activeTab}
          branchLine={branchLine}
          detailTitle={detailTitle}
          editHref={canManageOrganization ? organizationEditHref : null}
          headquarterNode={headquarterNode}
          organization={organization}
          selectedBranch={selectedBranch}
          selectedKind={selectedKind}
          selectedStatus={selectedStatus}
        />
      )}

      <nav aria-label="Seções da organização" className="workspace-tabs">
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

      {activeTab === "units" ? (
        <OrganizationUnitsWorkspace
          branches={branches}
          kindFilter={unitKindFilter}
          members={members}
          searchValue={unitSearchValue}
          statusFilter={unitStatusFilter}
        />
      ) : null}

      {activeTab === "departments" ? (
        <OrganizationDepartmentsWorkspace
          branches={branches}
          initialDepartments={departments}
          members={members}
        />
      ) : null}
    </section>
  );
}
