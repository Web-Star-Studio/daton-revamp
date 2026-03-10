import { redirect } from "next/navigation";

import { requireSession } from "@/lib/session";

export default async function AppHomePage() {
  const session = await requireSession();

  if (!session) {
    redirect("/auth?mode=sign-in");
  }

  if (!session.organization) {
    redirect("/auth?mode=sign-up");
  }

  redirect("/app/settings/organization");
}
