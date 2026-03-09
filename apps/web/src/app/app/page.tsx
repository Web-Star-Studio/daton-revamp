import { redirect } from "next/navigation";

import { requireSession } from "@/lib/session";

const organizationManagers = new Set(["owner", "admin"]);

export default async function AppHomePage() {
  const session = await requireSession();

  if (!session) {
    redirect("/sign-in");
  }

  if (!session.organization) {
    redirect("/create-organization");
  }

  const canManageOrganization = session.effectiveRoles.some((role) =>
    organizationManagers.has(role),
  );

  if (
    canManageOrganization &&
    session.organization.onboardingStatus === "pending"
  ) {
    redirect("/app/onboarding/organization");
  }

  redirect("/app/settings/organization");
}
