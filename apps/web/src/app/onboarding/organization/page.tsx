import { redirect } from "next/navigation";

import { OrganizationOnboardingWaiting } from "@/components/organization-onboarding-waiting";
import { OrganizationProfileForm } from "@/components/organization-profile-form";
import { requireSession } from "@/lib/session";

export default async function OrganizationOnboardingPage() {
  const session = await requireSession();

  if (!session) {
    redirect("/sign-in");
  }

  if (!session.organization) {
    redirect("/create-organization");
  }

  if (session.organization.onboardingStatus === "completed") {
    redirect("/app/settings/organization");
  }

  const canManageOrganization = session.effectiveRoles.some(
    (role) => role === "owner" || role === "admin",
  );
  const organizationName =
    session.organization.tradeName ?? session.organization.legalName;

  return (
    <main className="auth-shell auth-shell--fullbleed">
      <section className="auth-panel auth-panel--immersive">
        <div className="auth-panel__lead auth-panel__lead--visual organization-onboarding-lead">
          <div className="auth-panel__brand">
            <span className="brandmark__wordmark" style={{ color: "#fff" }}>
              Daton
            </span>
          </div>

          <div className="organization-onboarding-lead__copy">
            <p className="eyebrow">Onboarding da organização</p>
            <h1>
              Estruture {organizationName} antes de liberar o ambiente
              operacional.
            </h1>
            <p>
              Esse wizard reúne contexto operacional, objetivos e dados
              cadastrais em uma única passagem, mantendo coerência com o
              workspace que será aberto em seguida.
            </p>
          </div>

          <ul className="signal-list">
            <li>Fluxo dedicado, sem distrações do `/app`.</li>
            <li>As informações ficam editáveis depois em Organização.</li>
            <li>Conclua o perfil para liberar o workspace principal.</li>
          </ul>
        </div>

        <div className="auth-panel__form auth-panel__form--chrome organization-onboarding-shell">
          <p className="form-kicker">Preparar organização</p>
          {canManageOrganization ? (
            <>
              <p className="organization-onboarding-shell__intro">
                Preencha os blocos abaixo uma única vez. Ao concluir, o Daton
                usa esse contexto como base do ambiente.
              </p>
              <OrganizationProfileForm
                mode="wizard"
                onSuccessHref="/app/settings/organization"
                organization={session.organization}
                saveLabel="Concluir e entrar no app"
              />
            </>
          ) : (
            <article className="organization-onboarding-waiting">
              <OrganizationOnboardingWaiting />
              <h2>Ambiente aguardando liberação</h2>
              <p>
                O onboarding desta organização ainda não foi concluído por um
                responsável com permissão de gestão.
              </p>
              <p>
                Assim que o perfil operacional e os dados cadastrais forem
                finalizados, o acesso ao `/app` será liberado automaticamente.
              </p>
            </article>
          )}
        </div>
      </section>
    </main>
  );
}
