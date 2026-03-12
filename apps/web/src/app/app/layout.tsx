import type { PropsWithChildren, ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { AuthRedirect } from "@/components/auth-redirect";
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
    return <AuthRedirect href="/auth?mode=sign-in" />;
  }

  if (!session.organization) {
    redirect("/auth?mode=sign-up");
  }

  if (session.organization.onboardingStatus !== "completed") {
    redirect("/onboarding/organization");
  }

  return (
    <AppShell modal={modal} session={session}>
      {children}
    </AppShell>
  );
}
