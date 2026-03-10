import { redirect } from "next/navigation";

export default function LegacyOrganizationOnboardingRedirect() {
  redirect("/onboarding/organization");
}
