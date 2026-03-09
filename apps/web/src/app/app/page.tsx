import { redirect } from "next/navigation";

import { requireSession } from "@/lib/session";

export default async function AppHomePage() {
  const session = await requireSession();

  if (!session) {
    redirect("/sign-in");
  }

  if (!session.organization) {
    redirect("/create-organization");
  }

  redirect("/app/settings/organization");
}
