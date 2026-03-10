import Link from "next/link";
import type { ReactNode } from "react";

import { formatCnpj } from "@daton/contracts";

import { AuthRedirect } from "@/components/auth-redirect";
import { CopyButton } from "@/components/copy-button";
import { OrganizationProfileModal } from "@/components/organization-profile-modal";
import { OrganizationDepartmentsWorkspace } from "@/components/organization-departments-workspace";
import { OrganizationUnitsWorkspace } from "@/components/organization-units-workspace";
import {
  getServerBranches,
  getServerDepartments,
  getServerEmployees,
  getServerOrganizationMembers,
  type ServerBranch,
  type ServerDepartment,
  type ServerEmployee,
  type ServerOrganizationMember,
  type ServerSession,
} from "@/lib/server-api";
import { requireSession } from "@/lib/session";

type OrganizationSettingsSearchParams = {
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

type OrganizationTab = "overview" | "units" | "departments";
type OrganizationUnitStatusFilter = "all" | "active" | "archived";
type OrganizationUnitKindFilter = "all" | "headquarters" | "branch";
type SessionOrganization = NonNullable<ServerSession["organization"]>;

function getActiveOrganizationTab(tab?: string): OrganizationTab {
  if (tab === "overview") {
    return "overview";
  }

  if (tab === "units") {
    return "units";
  }

  if (tab === "departments") {
    return "departments";
  }

  return "overview";
}

function buildOrganizationHref({
  tab = "overview",
  departmentBranch = "all",
  departmentSearch,
  departmentStatus = "all",
  unitSearch,
  unitStatus = "all",
  unitKind = "all",
}: {
  departmentBranch?: string;
  departmentSearch?: string;
  departmentStatus?: "all" | "active" | "archived";
  tab?: OrganizationTab;
  unitSearch?: string;
  unitStatus?: OrganizationUnitStatusFilter;
  unitKind?: OrganizationUnitKindFilter;
}) {
  const searchParams = new URLSearchParams();

  if (tab !== "overview") {
    searchParams.set("tab", tab);
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

function formatOrganizationLongDate(value?: string | null) {
  if (!value) {
    return "Não informado";
  }

  const normalizedValue = `${value}T12:00:00`;
  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return "Não informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatHeadquartersLocation(branch?: ServerBranch) {
  if (!branch) {
    return "Sede não cadastrada";
  }

  const parts = [branch.city, branch.stateOrProvince, branch.country]
    .map((value) => value?.trim())
    .filter(Boolean);

  return parts.join(", ") || "Localização não informada";
}

function formatHeadquartersAddress(branch?: ServerBranch) {
  if (!branch) {
    return "Cadastre uma sede para exibir o endereço aqui.";
  }

  const parts = [branch.addressLine1, branch.addressLine2]
    .map((value) => value?.trim())
    .filter(Boolean);

  return parts.join(" • ") || "Endereço não informado";
}

function formatOverviewOperationalStatus(branches: ServerBranch[]) {
  return branches.some((branch) => branch.status === "active")
    ? "Ativa"
    : "Em configuração";
}

function OrganizationOverviewField({
  title,
  value,
  children,
}: {
  title: string;
  value: string;
  children?: ReactNode;
}) {
  return (
    <article className="organization-overview__field">
      <p className="organization-overview__field-label">{title}</p>
      <div className="organization-overview__field-value-row">
        <p className="organization-overview__field-value">{value}</p>
        {children}
      </div>
    </article>
  );
}

function OrganizationOverviewPanel({
  branches,
  organization,
}: {
  branches: ServerBranch[];
  organization: SessionOrganization;
}) {
  const headquarters = branches.find((branch) => branch.isHeadquarters);
  const operationalStatus = formatOverviewOperationalStatus(branches);
  const tradeName = organization.tradeName?.trim() || organization.legalName;
  const headquartersLocation = formatHeadquartersLocation(headquarters);
  const headquartersAddress = formatHeadquartersAddress(headquarters);

  return (
    <div className="organization-overview">
      <section className="organization-overview__section">
        <h3 className="organization-overview__section-title">Dados Cadastrais</h3>
        <div className="organization-overview__grid">
          <OrganizationOverviewField
            title="Razão Social"
            value={organization.legalName}
          />
          <OrganizationOverviewField
            title="CNPJ"
            value={formatCnpj(organization.legalIdentifier)}
          >
            <CopyButton
              size="compact"
              value={formatCnpj(organization.legalIdentifier)}
            />
          </OrganizationOverviewField>
          <OrganizationOverviewField
            title="Nome Fantasia"
            value={formatOrganizationValue(organization.tradeName)}
          />
          <OrganizationOverviewField
            title="Data de Fundação"
            value={formatOrganizationLongDate(organization.openingDate)}
          />
          <OrganizationOverviewField
            title="Inscrição Estadual"
            value={formatOrganizationValue(organization.stateRegistration)}
          />
          <OrganizationOverviewField
            title="Status Operacional"
            value={operationalStatus}
          >
            <span
              aria-hidden="true"
              className="organization-overview__status-dot"
            />
          </OrganizationOverviewField>
        </div>
      </section>

      <section className="organization-overview__section">
        <h3 className="organization-overview__section-title">Sede Principal</h3>
        <div className="organization-overview__hq-card">
          <div aria-hidden="true" className="organization-overview__hq-map" />
          <div aria-hidden="true" className="organization-overview__hq-overlay-mask" />

          <div className="organization-overview__hq-overlay">
            <h4>{headquarters?.name ?? tradeName}</h4>
            <p>{headquartersLocation}</p>
            <span>{headquartersAddress}</span>
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
    return <AuthRedirect href="/auth?mode=sign-in" />;
  }

  if (!session.organization) {
    return <AuthRedirect href="/auth?mode=sign-up" />;
  }

  const activeTab = getActiveOrganizationTab(resolvedSearchParams.tab);
  const [branches, members, departments, employees] = (await Promise.all([
    getServerBranches(),
    activeTab === "units" ? getServerOrganizationMembers() : Promise.resolve([]),
    activeTab === "departments" ? getServerDepartments() : Promise.resolve([]),
    activeTab === "departments" ? getServerEmployees() : Promise.resolve([]),
  ])) as [
    ServerBranch[],
    ServerOrganizationMember[],
    ServerDepartment[],
    ServerEmployee[],
  ];

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

  const organization = session.organization;
  const currentViewHref = buildOrganizationHref({
    tab: activeTab,
    departmentBranch: departmentBranchFilter,
    departmentSearch: departmentSearchValue,
    departmentStatus: departmentStatusFilter,
    unitSearch: unitSearchValue,
    unitStatus: unitStatusFilter,
    unitKind: unitKindFilter,
  });

  const tabs = [
    {
      key: "overview",
      label: "Visão Geral",
      href: buildOrganizationHref({
        tab: "overview",
      }),
    },
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
        departmentBranch: departmentBranchFilter,
        departmentSearch: departmentSearchValue,
        departmentStatus: departmentStatusFilter,
        tab: "departments",
      }),
    },
  ] as const;

  return (
    <section className="workspace-section workspace-section--fill organization-page">
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

      {activeTab === "overview" ? (
        <OrganizationOverviewPanel
          branches={branches}
          organization={organization}
        />
      ) : null}

      {isEditOrganization ? (
        <OrganizationProfileModal
          onSuccessHref={currentViewHref}
          open={isEditOrganization}
          organization={organization}
        />
      ) : null}

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
          employees={employees}
          initialDepartments={departments}
        />
      ) : null}
    </section>
  );
}
