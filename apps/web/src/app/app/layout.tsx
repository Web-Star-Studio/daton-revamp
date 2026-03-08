import type { PropsWithChildren, ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";

type WorkspaceLayoutProps = PropsWithChildren<{
  modal: ReactNode;
}>;

export default async function WorkspaceLayout({
  children,
  modal,
}: WorkspaceLayoutProps) {
  const session = await requireSession();

  return (
    <AppShell modal={modal} session={session}>
      {children}
    </AppShell>
  );
}
