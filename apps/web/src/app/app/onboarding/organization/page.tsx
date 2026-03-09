import { redirect } from "next/navigation";

import { OrganizationProfileForm } from "@/components/organization-profile-form";
import { requireSession } from "@/lib/session";

const organizationManagers = new Set(["owner", "admin"]);

export default async function OrganizationOnboardingPage() {
  const session = await requireSession();

  if (!session?.organization) {
    redirect("/create-organization");
  }

  const canManageOrganization = session.effectiveRoles.some((role) =>
    organizationManagers.has(role),
  );

  if (
    !canManageOrganization ||
    session.organization.onboardingStatus !== "pending"
  ) {
    redirect("/app/settings/organization");
  }

  return (
    <section className="workspace-section organization-onboarding-page">
      <header className="workspace-intro organization-onboarding-page__intro">
        <p className="workspace-kicker">Onboarding da organização</p>
        <h2>Complete os dados fiscais da empresa antes de seguir.</h2>
        <p>
          Você pode preencher apenas o que já tiver agora ou pular esta etapa e
          ajustar depois em Organização.
        </p>
      </header>

      <article className="content-panel organization-profile-card">
        <div className="section-heading">
          <h3>Dados fiscais complementares</h3>
        </div>
        <OrganizationProfileForm
          allowSkip
          onSuccessHref="/app/settings/organization"
          organization={session.organization}
          saveLabel="Salvar e continuar"
        />
      </article>
    </section>
  );
}
