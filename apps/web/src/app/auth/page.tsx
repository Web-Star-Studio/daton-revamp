import Image from "next/image";
import { redirect } from "next/navigation";

import { BootstrapForm } from "@/components/bootstrap-form";
import { SignInForm } from "@/components/sign-in-form";
import { VerifyEmailForm } from "@/components/verify-email-form";
import { getPendingEmailVerificationFromCookieStore } from "@/lib/auth-session";
import {
  getVerifyEmailCopy,
  type VerificationRequiredAuthResult,
} from "@/lib/auth-flow";
import { getServerSession } from "@/lib/server-api";

type AuthPageProps = {
  searchParams: Promise<{
    mode?: string;
  }>;
};

type AuthMode = "sign-in" | "sign-up" | "verify-email";

const authModes: Record<
  Exclude<AuthMode, "verify-email">,
  {
    description: string;
    kicker: string;
    title: string;
  }
> = {
  "sign-in": {
    kicker: "Entrar",
    title: "Bem-vindo ao Daton — sua plataforma de gestão ESG.",
    description:
      "Informe suas credenciais para acessar o ambiente e conduzir a operação.",
  },
  "sign-up": {
    kicker: "Estruturar organização",
    title:
      "Estruture a organização e habilite o primeiro responsável para sustentar a governança ESG desde o primeiro dia.",
    description:
      "Isso estabelece a base identitária da qual o restante do Daton depende: entidade legal, acesso inicial e a base de governança que depois pode se expandir para múltiplas unidades.",
  },
};

const getAuthMode = (value?: string): AuthMode =>
  value === "sign-up"
    ? "sign-up"
    : value === "verify-email"
      ? "verify-email"
      : "sign-in";

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const resolvedSearchParams = await searchParams;
  const mode = getAuthMode(resolvedSearchParams.mode);
  const session = await getServerSession();
  const pendingVerification = mode === "verify-email"
    ? await getPendingEmailVerificationFromCookieStore()
    : null;

  if (session?.organization) {
    redirect(
      session.organization.onboardingStatus === "completed"
        ? "/app"
        : "/onboarding/organization",
    );
  }

  if (mode === "sign-in" && session) {
    redirect("/auth?mode=sign-up");
  }

  const verificationState =
    mode === "verify-email" && pendingVerification
      ? {
          email: pendingVerification.email,
          flow: pendingVerification.flow,
          message: getVerifyEmailCopy(pendingVerification.flow).inlineMessage,
          status: "verification_required" as const,
        }
      : null;

  const content = verificationState
    ? getVerifyEmailCopy(verificationState.flow)
    : mode === "verify-email"
      ? {
          description:
            "Para concluir a autenticação, confirme o código enviado para o seu e-mail de trabalho.",
          kicker: "Verificar e-mail",
          title:
            "Confirme o código de verificação para concluir a entrada no Daton.",
        }
      : authModes[mode];

  return (
    <main className="auth-shell auth-shell--fullbleed">
      <section className={`auth-panel auth-panel--immersive${
        mode === "sign-up" ? " auth-panel--wide" : ""
      }`}
      >
        <div className="auth-panel__lead auth-panel__lead--visual">
          <div className="auth-panel__brand">
            <Image
              alt="Daton"
              className="auth-panel__brand-logo"
              height={28}
              priority
              src="/daton-logo-header-DC_evyPp.png"
              width={84}
            />
          </div>
          <h1>{content.title}</h1>
        </div>
        <div className="auth-panel__form auth-panel__form--chrome">
          <p className="form-kicker">{content.kicker}</p>
          <p className="auth-panel__description">{content.description}</p>
          {mode === "sign-in" ? (
            <SignInForm />
          ) : mode === "sign-up" ? (
            <BootstrapForm session={session} />
          ) : (
            <VerifyEmailForm pendingVerification={verificationState} />
          )}
        </div>
      </section>
    </main>
  );
}
