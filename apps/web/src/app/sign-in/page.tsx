import { SignInForm } from "@/components/sign-in-form";

export default function SignInPage() {
  return (
    <main className="auth-shell auth-shell--fullbleed">
      <section className="auth-panel auth-panel--immersive">
        <div className="auth-panel__lead auth-panel__lead--visual">
          <div className="auth-panel__brand">
            <span className="brandmark__wordmark" style={{ color: "#fff" }}>Daton</span>
          </div>
          <h1>
            Bem-vindo ao Daton —
            sua superfície de comando operacional
            para governança multiunidade.
          </h1>
        </div>
        <div className="auth-panel__form auth-panel__form--chrome">
          <p className="form-kicker">Entrar</p>
          <p style={{ color: "var(--ink-soft)", marginTop: 0, marginBottom: "2.5rem", fontSize: "0.9rem" }}>
            Informe suas credenciais para acessar o ambiente e conduzir a operação.
          </p>
          <SignInForm />
        </div>
      </section>
    </main>
  );
}
