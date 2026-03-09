"use client";

import * as Sentry from "@sentry/nextjs";
import Image from "next/image";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import {
  type PropsWithChildren,
  type ReactNode,
  useEffect,
  useState,
} from "react";

import type { ServerNotification, ServerSession } from "@/lib/server-api";
import { formatShortName } from "@/lib/utils";

import { AiChatModal } from "./ai-chat-modal";
import { AlertsModal } from "./alerts-modal";
import { AppHeader } from "./app-header";
import { AppNavigation } from "./app-navigation";
import { BRANCH_EDITOR_MODAL_VISIBILITY_EVENT } from "./branch-editor-modal";
import { COLLABORATOR_MODAL_VISIBILITY_EVENT } from "./collaborators-events";
import { DEPARTMENT_MODAL_VISIBILITY_EVENT } from "./organization-departments-events";
import { UNIT_MODAL_VISIBILITY_EVENT } from "./organization-units-events";
import { SignOutButton } from "./sign-out-button";

type AppShellProps = PropsWithChildren<{
  modal?: ReactNode;
  notifications: ServerNotification[];
  session: ServerSession;
}>;

const navigation = [
  { href: "/app", label: "Visão geral", icon: "dashboard" as const },
  {
    label: "Social",
    icon: "social" as const,
    children: [
      { href: "/app/social/collaborators", label: "Gestão de Colaboradores" },
    ],
  },
  {
    href: "/app/settings/organization",
    label: "Organização",
    icon: "organization" as const,
  },
];

export function AppShell({
  children,
  modal,
  notifications,
  session,
}: AppShellProps) {
  const activeModalSegment = useSelectedLayoutSegment("modal");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isBranchEditorOpen, setIsBranchEditorOpen] = useState(false);
  const [isCollaboratorModalOpen, setIsCollaboratorModalOpen] = useState(false);
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const memberName = formatShortName(
    session.member?.fullName ?? session.user.email,
  );
  const isAnyModalOpen =
    isAlertsOpen ||
    isAiChatOpen ||
    isBranchEditorOpen ||
    isCollaboratorModalOpen ||
    isDepartmentModalOpen ||
    isUnitModalOpen ||
    Boolean(activeModalSegment);

  useEffect(() => {
    Sentry.setUser({
      id: session.user.id,
    });

    if (session.organization) {
      Sentry.setTag("organization.id", session.organization.id);
      Sentry.setTag(
        "organization.onboarding_status",
        session.organization.onboardingStatus,
      );
    }

    if (session.effectiveRoles.length > 0) {
      Sentry.setTag("membership.roles", session.effectiveRoles.join(","));
      Sentry.setTag("membership.primary_role", session.effectiveRoles[0]);
    }

    Sentry.setContext("membership", {
      branchScope: session.branchScope,
      memberId: session.member?.id ?? null,
      organizationId: session.organization?.id ?? null,
      roles: session.effectiveRoles,
    });
  }, [session]);

  useEffect(() => {
    document.body.classList.toggle("app-modal-open", isAnyModalOpen);

    return () => {
      document.body.classList.remove("app-modal-open");
    };
  }, [isAnyModalOpen]);

  useEffect(() => {
    const handleBranchEditorVisibility = (event: Event) => {
      const modalEvent = event as CustomEvent<{ open?: boolean }>;
      setIsBranchEditorOpen(Boolean(modalEvent.detail?.open));
    };
    const handleCollaboratorModalVisibility = (event: Event) => {
      const modalEvent = event as CustomEvent<{ open?: boolean }>;
      setIsCollaboratorModalOpen(Boolean(modalEvent.detail?.open));
    };
    const handleDepartmentModalVisibility = (event: Event) => {
      const modalEvent = event as CustomEvent<{ open?: boolean }>;
      setIsDepartmentModalOpen(Boolean(modalEvent.detail?.open));
    };
    const handleUnitModalVisibility = (event: Event) => {
      const modalEvent = event as CustomEvent<{ open?: boolean }>;
      setIsUnitModalOpen(Boolean(modalEvent.detail?.open));
    };

    window.addEventListener(
      BRANCH_EDITOR_MODAL_VISIBILITY_EVENT,
      handleBranchEditorVisibility as EventListener,
    );
    window.addEventListener(
      COLLABORATOR_MODAL_VISIBILITY_EVENT,
      handleCollaboratorModalVisibility as EventListener,
    );
    window.addEventListener(
      DEPARTMENT_MODAL_VISIBILITY_EVENT,
      handleDepartmentModalVisibility as EventListener,
    );
    window.addEventListener(
      UNIT_MODAL_VISIBILITY_EVENT,
      handleUnitModalVisibility as EventListener,
    );

    return () => {
      window.removeEventListener(
        BRANCH_EDITOR_MODAL_VISIBILITY_EVENT,
        handleBranchEditorVisibility as EventListener,
      );
      window.removeEventListener(
        COLLABORATOR_MODAL_VISIBILITY_EVENT,
        handleCollaboratorModalVisibility as EventListener,
      );
      window.removeEventListener(
        DEPARTMENT_MODAL_VISIBILITY_EVENT,
        handleDepartmentModalVisibility as EventListener,
      );
      window.removeEventListener(
        UNIT_MODAL_VISIBILITY_EVENT,
        handleUnitModalVisibility as EventListener,
      );
    };
  }, []);

  return (
    <div className={`app-shell${isSidebarCollapsed ? " is-collapsed" : ""}`}>
      <div
        aria-hidden={isAnyModalOpen}
        className="app-shell__frame"
        inert={isAnyModalOpen}
      >
        <aside className="app-sidebar">
          <div className="app-sidebar__inner">
            <div className="app-sidebar__top">
              <Link
                aria-label="Ir para o workspace"
                className="app-sidebar__brand"
                href="/app"
              >
                <Image
                  alt="Daton"
                  className="app-sidebar__brand-logo"
                  height={28}
                  priority
                  src="/daton-logo-header-DC_evyPp.png"
                  width={84}
                />
              </Link>
              <AppNavigation items={navigation} />
            </div>
            <div className="app-sidebar__footer">
              <div className="app-sidebar__profile">
                <div className="app-sidebar__avatar" aria-hidden="true">
                  {memberName ? memberName.charAt(0).toUpperCase() : "?"}
                </div>
                {!isSidebarCollapsed ? (
                  <>
                    <div className="app-sidebar__profilecopy">
                      <strong>{memberName}</strong>
                    </div>
                    <div className="app-sidebar__signout">
                      <SignOutButton />
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </aside>
        <main className="app-main">
          <div className="app-main__inner">
            <AppHeader
              notificationCount={notifications.length}
              onAiChatOpen={() => setIsAiChatOpen(true)}
              onAlertsOpen={() => setIsAlertsOpen(true)}
              onSidebarToggle={() =>
                setIsSidebarCollapsed((current) => !current)
              }
            />
            {children}
          </div>
        </main>
      </div>
      <AlertsModal
        notifications={notifications}
        open={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
      />
      <AiChatModal open={isAiChatOpen} onClose={() => setIsAiChatOpen(false)} />
      {modal}
    </div>
  );
}
