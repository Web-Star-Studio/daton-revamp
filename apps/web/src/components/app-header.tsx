"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  OPEN_DEPARTMENT_CREATION_EVENT,
  OPEN_DEPARTMENT_EXPORT_EVENT,
} from "./organization-departments-events";
import {
  OPEN_UNIT_EXPORT_EVENT,
  OPEN_UNIT_IMPORT_EVENT,
} from "./organization-units-events";
import {
  AiChatIcon,
  BellIcon,
  EditIcon,
  ExportIcon,
  SidebarIcon,
} from "./app-icons";

type AppHeaderProps = {
  canManagePeople?: boolean;
  canManageOrganization?: boolean;
  notificationCount: number;
  onAlertsOpen: () => void;
  onAiChatOpen: () => void;
  onSidebarToggle?: () => void;
};

type HeaderCrumb = {
  href: string;
  label: string;
};

type HeaderMeta = {
  crumbs: HeaderCrumb[];
};

const branchDetailMatcher = /^\/app\/branches\/[^/]+$/;
const collaboratorDetailMatcher = /^\/app\/social\/collaborators\/[^/]+$/;

function getHeaderMeta(pathname: string): HeaderMeta {
  if (pathname === "/app") {
    return {
      crumbs: [{ href: "/app", label: "Visão geral" }],
    };
  }

  if (pathname === "/app/branches") {
    return {
      crumbs: [{ href: "/app/settings/organization", label: "Organização" }],
    };
  }

  if (pathname === "/app/branches/new") {
    return {
      crumbs: [
        { href: "/app/settings/organization", label: "Organização" },
        { href: "/app/branches/new", label: "Nova filial" },
      ],
    };
  }

  if (branchDetailMatcher.test(pathname)) {
    return {
      crumbs: [
        { href: "/app/settings/organization", label: "Organização" },
        { href: pathname, label: "Detalhes da filial" },
      ],
    };
  }

  if (pathname === "/app/settings/organization") {
    return {
      crumbs: [{ href: pathname, label: "Organização" }],
    };
  }

  if (pathname === "/app/social/collaborators") {
    return {
      crumbs: [{ href: pathname, label: "Gestão de Colaboradores" }],
    };
  }

  if (collaboratorDetailMatcher.test(pathname)) {
    return {
      crumbs: [
        {
          href: "/app/social/collaborators",
          label: "Gestão de Colaboradores",
        },
        { href: pathname, label: "Detalhes do colaborador" },
      ],
    };
  }

  return {
    crumbs: [{ href: pathname, label: "Workspace" }],
  };
}

export function AppHeader({
  canManagePeople = false,
  canManageOrganization = false,
  notificationCount,
  onAlertsOpen,
  onAiChatOpen,
  onSidebarToggle,
}: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const meta = getHeaderMeta(pathname);
  const isBranchDetail = branchDetailMatcher.test(pathname);
  const isCollaboratorDetail = collaboratorDetailMatcher.test(pathname);
  const isCollaboratorsPage = pathname === "/app/social/collaborators";
  const isOrganizationPage = pathname === "/app/settings/organization";
  const isOrganizationEditing = searchParams.get("edit") === "organization";
  const isCollaboratorEditing = searchParams.get("edit") === "1";
  const activeCollaboratorsTab =
    searchParams.get("tab") === "positions" ? "positions" : "employees";
  const activeOrganizationTab =
    searchParams.get("tab") === "departments"
      ? "departments"
      : searchParams.get("tab") === "units"
        ? "units"
        : "overview";
  const organizationEditSearchParams = new URLSearchParams(searchParams.toString());
  organizationEditSearchParams.set("edit", "organization");
  const organizationEditHref = `${pathname}?${organizationEditSearchParams.toString()}`;
  const collaboratorCreateSearchParams = new URLSearchParams(searchParams.toString());
  collaboratorCreateSearchParams.delete("tab");
  collaboratorCreateSearchParams.delete("position");
  collaboratorCreateSearchParams.set("create", "employee");
  const collaboratorCreateHref = `${pathname}?${collaboratorCreateSearchParams.toString()}`;
  const positionCreateSearchParams = new URLSearchParams(searchParams.toString());
  positionCreateSearchParams.set("tab", "positions");
  positionCreateSearchParams.delete("position");
  positionCreateSearchParams.set("create", "position");
  const positionCreateHref = `${pathname}?${positionCreateSearchParams.toString()}`;
  const collaboratorEditSearchParams = new URLSearchParams(searchParams.toString());
  collaboratorEditSearchParams.set("edit", "1");
  const collaboratorEditHref = `${pathname}?${collaboratorEditSearchParams.toString()}`;

  const openBranchEditor = () => {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("edit", "1");
    router.replace(`${pathname}?${nextSearchParams.toString()}`);
  };

  return (
    <header className="app-header">
      <div className="app-header__left">
        {onSidebarToggle ? (
          <button
            aria-label="Alternar barra lateral"
            className="icon-button app-header__toggle"
            onClick={onSidebarToggle}
            type="button"
          >
            <SidebarIcon />
          </button>
        ) : null}
        <div className="app-header__copy">
          <nav aria-label="Breadcrumb" className="app-header__breadcrumbs">
            {meta.crumbs.map((crumb, index) => (
              <span
                className="app-header__crumb-wrap"
                key={`${crumb.href}-${crumb.label}`}
              >
                {index > 0 ? (
                  <span className="app-header__crumb-separator">/</span>
                ) : null}
                <Link
                  aria-current={
                    index === meta.crumbs.length - 1 ? "page" : undefined
                  }
                  className={`app-header__crumb${index === meta.crumbs.length - 1 ? " app-header__crumb--current" : ""}`}
                  href={crumb.href}
                >
                  {crumb.label}
                </Link>
              </span>
            ))}
          </nav>
        </div>
      </div>
      <div className="app-header__actions" aria-label="Ações do ambiente">
        {isOrganizationPage && activeOrganizationTab === "units" ? (
          <>
            <button
              className="button button--secondary"
              onClick={() =>
                window.dispatchEvent(new Event(OPEN_UNIT_IMPORT_EVENT))
              }
              type="button"
            >
              Importar
            </button>
            <button
              className="button button--secondary"
              onClick={() =>
                window.dispatchEvent(new Event(OPEN_UNIT_EXPORT_EVENT))
              }
              type="button"
            >
              Exportar
            </button>
            <Link className="button" href="/app/branches/new">
              Criar unidade
            </Link>
          </>
        ) : null}
        {isOrganizationPage && activeOrganizationTab === "departments" ? (
          <>
            <button
              className="button button--secondary"
              onClick={() =>
                window.dispatchEvent(new Event(OPEN_DEPARTMENT_EXPORT_EVENT))
              }
              type="button"
            >
              Exportar
            </button>
            <button
              className="button"
              onClick={() =>
                window.dispatchEvent(new Event(OPEN_DEPARTMENT_CREATION_EVENT))
              }
              type="button"
            >
              Novo departamento
            </button>
          </>
        ) : null}
        {isOrganizationPage &&
        activeOrganizationTab === "overview" &&
        canManageOrganization &&
        !isOrganizationEditing ? (
          <Link className="button" href={organizationEditHref}>
            <EditIcon />
            <span>Editar dados</span>
          </Link>
        ) : null}
        {isCollaboratorsPage && canManagePeople && activeCollaboratorsTab === "employees" ? (
          <Link className="button" href={collaboratorCreateHref}>
            <span>Novo colaborador</span>
          </Link>
        ) : null}
        {isCollaboratorsPage && canManagePeople && activeCollaboratorsTab === "positions" ? (
          <Link className="button" href={positionCreateHref}>
            <span>Novo cargo</span>
          </Link>
        ) : null}
        {isCollaboratorDetail ? (
          <>
            <Link
              className="button button--secondary"
              href="/app/social/collaborators"
            >
              Voltar à lista
            </Link>
            {canManagePeople && !isCollaboratorEditing ? (
              <Link className="button" href={collaboratorEditHref}>
                <EditIcon />
                <span>Editar dados do colaborador</span>
              </Link>
            ) : null}
          </>
        ) : null}
        {isBranchDetail ? (
          <>
            <button
              className="button button--secondary"
              onClick={() => window.print()}
              type="button"
            >
              <ExportIcon />
              <span>Exportar</span>
            </button>
            <button className="button" onClick={openBranchEditor} type="button">
              <EditIcon />
              <span>Editar dados</span>
            </button>
          </>
        ) : null}
        <button
          aria-label="Abrir AI Chat"
          className="icon-button"
          onClick={onAiChatOpen}
          type="button"
        >
          <AiChatIcon />
        </button>
        <button
          aria-label="Abrir central de alertas"
          className="icon-button icon-button--with-badge"
          onClick={onAlertsOpen}
          type="button"
        >
          <BellIcon />
          {notificationCount > 0 ? (
            <span className="icon-button__badge">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          ) : null}
        </button>
      </div>
    </header>
  );
}
