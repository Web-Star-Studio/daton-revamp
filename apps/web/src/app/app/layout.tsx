import type { PropsWithChildren } from "react";

import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";

export default async function WorkspaceLayout({ children }: PropsWithChildren) {
  const session = await requireSession();

  return <AppShell session={session}>{children}</AppShell>;
}
