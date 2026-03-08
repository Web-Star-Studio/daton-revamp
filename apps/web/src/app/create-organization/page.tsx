import { BootstrapForm } from "@/components/bootstrap-form";

export default function CreateOrganizationPage() {
  return (
    <main className="auth-shell auth-shell--fullbleed">
      <section className="auth-panel auth-panel--wide auth-panel--immersive">
        <div className="auth-panel__lead auth-panel__lead--visual">
          <div className="auth-panel__brand">
            <span className="brandmark__wordmark" style={{ color: "#fff" }}>Daton</span>
          </div>
          <h1>
            Crie a organização, o primeiro operador e a matriz em uma única entrada deliberada.
          </h1>
        </div>
        <div className="auth-panel__form auth-panel__form--chrome">
          <p className="form-kicker">Estruturar organização</p>
          <p style={{ color: "var(--ink-soft)", marginTop: 0, marginBottom: "2.5rem", fontSize: "0.9rem" }}>
            Isso estabelece a base identitária da qual o restante do Daton depende: entidade legal,
            acesso inicial e a primeira fronteira operacional.
          </p>
          <BootstrapForm />
        </div>
      </section>
    </main>
  );
}
