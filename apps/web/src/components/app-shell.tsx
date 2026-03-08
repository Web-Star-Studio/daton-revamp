"use client";

import Image from "next/image";
import Link from "next/link";
import { type PropsWithChildren, useState } from "react";

import type { ServerSession } from "@/lib/server-api";
import { formatRole, formatShortName } from "@/lib/utils";

import { AppHeader } from "./app-header";
import { AppNavigation } from "./app-navigation";
import { SignOutButton } from "./sign-out-button";

type AppShellProps = PropsWithChildren<{
  session: ServerSession;
}>;

const navigation = [
  { href: "/app", label: "Visão geral" },
  { href: "/app/branches", label: "Filiais" },
  { href: "/app/settings/organization", label: "Organização" },
];

export function AppShell({ children, session }: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const organizationName = session.organization?.tradeName ?? session.organization?.legalName ?? "Daton";
  const memberName = formatShortName(session.member?.fullName ?? session.user.email);

  return (
    <div className={`app-shell${isSidebarCollapsed ? " is-collapsed" : ""}`}>
      <aside className="app-sidebar">
        <div className="app-sidebar__top">
          <Link className="app-sidebar__brand" href="/app">
            <Image
              alt="Daton"
              height={28}
              src="/daton-logo-header-DC_evyPp.png"
              style={{ objectFit: "contain", objectPosition: "left" }}
              width={isSidebarCollapsed ? 32 : 100}
              priority
            />
          </Link>
          <AppNavigation items={navigation} />
        </div>
        <div className="app-sidebar__footer">
          <div className="app-sidebar__profile">
            <div className="app-sidebar__avatar" aria-hidden="true">
              {memberName ? memberName.charAt(0).toUpperCase() : "?"}
            </div>
            {!isSidebarCollapsed && (
              <div className="app-sidebar__profilecopy">
                <strong>{memberName}</strong>
              </div>
            )}
            {!isSidebarCollapsed && (
              <div className="app-sidebar__signout">
                <SignOutButton />
              </div>
            )}
          </div>
        </div>
      </aside>
      <main className="app-main">
        <div className="app-main__inner">
          <AppHeader onSidebarToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
          {children}
        </div>
      </main>
    </div>
  );
}
