import type { PropsWithChildren, ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { AuthRedirect } from "@/components/auth-redirect";
import { getServerNotifications } from "@/lib/server-api";
import { requireSession } from "@/lib/session";

type WorkspaceLayoutProps = PropsWithChildren<{
  modal: ReactNode;
}>;

export default async function WorkspaceLayout({
  children,
  modal,
}: WorkspaceLayoutProps) {
  const session = await requireSession();

  if (!session) {
    return <AuthRedirect href="/sign-in" />;
  }

  const notifications = session.organization
    ? await getServerNotifications()
    : [];

  return (
    <AppShell modal={modal} notifications={notifications} session={session}>
      {children}
    </AppShell>
  );
}
