import Link from "next/link";
import { redirect } from "next/navigation";

import { OrganizationOnboardingWaiting } from "@/components/organization-onboarding-waiting";
import { OrganizationProfileForm } from "@/components/organization-profile-form";
import { OrganizationProfileReview } from "@/components/organization-profile-review";
import {
  getOrganizationProfileDefaults,
  normalizeOrganizationProfileDraft,
} from "@/lib/organization-profile";
import { requireSession } from "@/lib/session";

export default async function OrganizationOnboardingPage() {
  const session = await requireSession();

  if (!session) {
    redirect("/auth?mode=sign-in");
  }

  if (!session.organization) {
    redirect("/auth?mode=sign-up");
  }

  const canManageOrganization = session.effectiveRoles.some(
    (role) => role === "owner" || role === "admin",
  );
  const organizationName =
    session.organization.tradeName ?? session.organization.legalName;
  const organizationReview = normalizeOrganizationProfileDraft(
    getOrganizationProfileDefaults(session.organization),
  );

  return (
    <main className="organization-onboarding-page organization-onboarding-page--glass">
      {session.organization.onboardingStatus === "completed" ? (
        <section className="organization-onboarding-stage organization-onboarding-stage--waiting">
          <article className="organization-onboarding-waiting organization-onboarding-waiting--completed">
            <h1>Revise os dados antes de seguir</h1>
            <p className="organization-onboarding-waiting__intro">
              Seu ambiente já foi liberado. Os dados informados no onboarding
              ficam visíveis aqui para uma última checagem antes de entrar no
              app.
            </p>
            <OrganizationProfileReview draft={organizationReview} />
            <div className="organization-profile-form__actions">
              <Link className="button" href="/app/settings/organization">
                Entrar no app
              </Link>
              <Link
                className="button button--secondary"
                href="/app/settings/organization"
              >
                Editar dados da organização
              </Link>
            </div>
          </article>
        </section>
      ) : canManageOrganization ? (
        <section className="organization-onboarding-stage">
          <OrganizationProfileForm
            mode="wizard"
            onSuccessHref="/onboarding/organization"
            organization={session.organization}
            saveLabel="Concluir onboarding"
          />
        </section>
      ) : (
        <section className="organization-onboarding-stage organization-onboarding-stage--waiting">
          <article className="organization-onboarding-waiting">
            <OrganizationOnboardingWaiting />
            <p className="organization-onboarding-waiting__eyebrow">
              Onboarding da organização
            </p>
            <h1>{organizationName}</h1>
            <p>
              O onboarding ainda não foi concluído por um responsável com
              permissão de gestão.
            </p>
            <p>
              Assim que o perfil operacional e os dados cadastrais forem
              finalizados, o acesso ao `/app` será liberado automaticamente.
            </p>
          </article>
        </section>
      )}
    </main>
  );
}
