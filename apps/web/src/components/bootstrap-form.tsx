"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { useSignUp } from "@clerk/nextjs";

import { formatCnpj, type SessionResponse } from "@daton/contracts";

import { getAuthErrorMessage, splitFullName } from "@/lib/auth-client";
import { bootstrapOrganization } from "@/lib/api";

type BootstrapFormProps = {
  session?: SessionResponse | null;
};

type VerificationStep = {
  email: string;
  payload: {
    adminEmail: string;
    adminFullName: string;
    legalIdentifier: string;
    legalName: string;
    password: string;
    tradeName: string;
  };
};

export function BootstrapForm({ session }: BootstrapFormProps) {
  const router = useRouter();
  const { signUp } = useSignUp();
  const [error, setError] = useState<string | null>(null);
  const [verificationStep, setVerificationStep] = useState<VerificationStep | null>(
    null,
  );
  const isAuthenticated = Boolean(session?.user && !session.organization);

  const finishBootstrap = async (payload: VerificationStep["payload"]) => {
    const result = await bootstrapOrganization(payload);
    router.replace(
      result.organization?.onboardingStatus === "completed"
        ? "/app"
        : "/onboarding/organization",
    );
    router.refresh();
  };

  return verificationStep ? (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const code = String(formData.get("code") ?? "").trim();

        setError(null);

        startTransition(async () => {
          try {
            const verifyResult = await signUp.verifications.verifyEmailCode({ code });

            if (verifyResult.error) {
              throw verifyResult.error;
            }

            if (signUp.status !== "complete") {
              throw new Error("A verificação do e-mail não foi concluída.");
            }

            const finalizeResult = await signUp.finalize();

            if (finalizeResult.error) {
              throw finalizeResult.error;
            }

            await finishBootstrap(verificationStep.payload);
          } catch (bootstrapError) {
            setError(
              getAuthErrorMessage(
                bootstrapError,
                "Não foi possível validar o e-mail do administrador agora.",
              ),
            );
          }
        });
      }}
    >
      <div className="field field--wide">
        <label htmlFor="code">Código de verificação</label>
        <input
          autoComplete="one-time-code"
          id="code"
          inputMode="numeric"
          name="code"
          placeholder="Digite o código recebido"
          required
          type="text"
        />
      </div>
      <p className="form-note">
        Enviamos um código para <strong>{verificationStep.email}</strong>. Após a
        validação, o ambiente inicial será criado.
      </p>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="button" type="submit">
        Verificar e criar ambiente
      </button>
      <button
        className="button button--ghost"
        type="button"
        onClick={() => {
          setVerificationStep(null);
          setError(null);
          void signUp.reset();
        }}
      >
        Voltar
      </button>
    </form>
  ) : (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        const payload = {
          legalName: String(formData.get("legalName") ?? ""),
          tradeName: String(formData.get("tradeName") ?? ""),
          legalIdentifier: String(formData.get("legalIdentifier") ?? ""),
          adminFullName: String(formData.get("adminFullName") ?? ""),
          adminEmail: String(formData.get("adminEmail") ?? ""),
          password: String(formData.get("password") ?? ""),
        };

        setError(null);

        startTransition(async () => {
          try {
            if (isAuthenticated) {
              await finishBootstrap(payload);
              return;
            }

            const { firstName, lastName } = splitFullName(payload.adminFullName);
            const createResult = await signUp.password({
              emailAddress: payload.adminEmail,
              password: payload.password,
              firstName,
              lastName,
            });

            if (createResult.error) {
              throw createResult.error;
            }

            const sendCodeResult = await signUp.verifications.sendEmailCode();

            if (sendCodeResult.error) {
              throw sendCodeResult.error;
            }

            setVerificationStep({
              email: payload.adminEmail,
              payload,
            });
          } catch (bootstrapError) {
            setError(
              getAuthErrorMessage(
                bootstrapError,
                "Não foi possível criar o ambiente agora.",
              ),
            );
          }
        });
      }}
    >
      <div className="field">
        <label htmlFor="legalName">Razão social</label>
        <input autoComplete="organization" id="legalName" name="legalName" required type="text" />
      </div>
      <div className="field">
        <label htmlFor="tradeName">Nome fantasia</label>
        <input id="tradeName" name="tradeName" type="text" />
      </div>
      <div className="field">
        <label htmlFor="legalIdentifier">CNPJ</label>
        <input
          id="legalIdentifier"
          inputMode="numeric"
          name="legalIdentifier"
          onInput={(event) => {
            event.currentTarget.value = formatCnpj(event.currentTarget.value);
          }}
          placeholder="00.000.000/0000-00"
          required
          type="text"
        />
      </div>
      <div className="field">
        <label htmlFor="adminFullName">Nome completo do administrador</label>
        <input
          autoComplete="name"
          defaultValue={session?.user.name ?? ""}
          id="adminFullName"
          name="adminFullName"
          readOnly={isAuthenticated}
          required
          type="text"
        />
      </div>
      <div className="field">
        <label htmlFor="adminEmail">E-mail do administrador</label>
        <input
          autoComplete="email"
          defaultValue={session?.user.email ?? ""}
          id="adminEmail"
          name="adminEmail"
          readOnly={isAuthenticated}
          required
          type="email"
        />
      </div>
      {!isAuthenticated ? (
        <div className="field">
          <label htmlFor="password">Senha</label>
          <input autoComplete="new-password" id="password" name="password" required type="password" />
        </div>
      ) : null}
      <label className="checkbox">
        <input id="terms" name="terms" required type="checkbox" />
        <span>
          Ao marcar esta caixa, declaro que li, entendi e concordo com os Termos de Serviço,
          a Política de Privacidade, o EULA e a Política de Uso Aceitável do Daton.
        </span>
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="button" type="submit">
        {isAuthenticated ? "Criar ambiente Daton" : "Continuar com a criação"}
      </button>
      <p className="form-note">
        Já possui um ambiente? <Link href="/auth?mode=sign-in">Entrar</Link>
      </p>
      {!isAuthenticated ? (
        <p className="form-note">
          Sua organização já existe?{" "}
          <Link href="/auth?mode=create-account">Criar credencial</Link>
        </p>
      ) : null}
    </form>
  );
}
