"use client";

import { usePathname } from "next/navigation";

import { BellIcon, SidebarIcon, SparkIcon } from "./app-icons";

const pageLabels = [
  { match: (pathname: string) => pathname === "/app", label: "Dashboard", section: "Dashboard" },
  { match: (pathname: string) => pathname === "/app/branches", label: "Filiais", section: "Estrutura" },
  { match: (pathname: string) => pathname === "/app/branches/new", label: "Nova filial", section: "Estrutura" },
  {
    match: (pathname: string) => pathname.startsWith("/app/branches/"),
    label: "Detalhes",
    section: "Estrutura",
  },
  {
    match: (pathname: string) => pathname === "/app/settings/organization",
    label: "Configurações",
    section: "Configurações",
  },
];

const defaultPage = pageLabels[0] ?? { label: "Daton", section: "Dashboard" };

export function AppHeader({ onSidebarToggle }: { onSidebarToggle?: () => void }) {
  const pathname = usePathname();
  const currentPage = pageLabels.find((item) => item.match(pathname)) ?? defaultPage;

  return (
    <header className="app-header">
      <div className="app-header__left">
        {onSidebarToggle && (
          <button
            aria-label="Alternar barra lateral"
            className="icon-button app-header__toggle"
            onClick={onSidebarToggle}
            type="button"
          >
            <SidebarIcon />
          </button>
        )}
        <h2>{currentPage.label}</h2>
      </div>
      <div className="app-header__actions" aria-label="Ações do ambiente">
        <button aria-label="Notificações" className="icon-button" type="button">
          <BellIcon />
        </button>
        <button aria-label="Atalhos" className="icon-button" type="button">
          <SparkIcon />
        </button>
      </div>
    </header>
  );
}
