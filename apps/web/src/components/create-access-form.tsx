"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { useSignUp } from "@clerk/nextjs";

import {
  getAuthErrorMessage,
  resolvePostAuthRedirect,
  splitFullName,
} from "@/lib/auth-client";

type VerificationStep = {
  email: string;
};

export function CreateAccessForm() {
  const router = useRouter();
  const { signUp } = useSignUp();
  const [error, setError] = useState<string | null>(null);
  const [verificationStep, setVerificationStep] = useState<VerificationStep | null>(
    null,
  );

  const finalizeSignUp = async () => {
    const result = await signUp.finalize();

    if (result.error) {
      throw result.error;
    }

    const redirectTo = await resolvePostAuthRedirect();
    router.replace(redirectTo);
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
            const result = await signUp.verifications.verifyEmailCode({ code });

            if (result.error) {
              throw result.error;
            }

            if (signUp.status !== "complete") {
              throw new Error("A verificação não foi concluída.");
            }

            await finalizeSignUp();
          } catch (signUpError) {
            setError(
              getAuthErrorMessage(
                signUpError,
                "Não foi possível validar o código enviado por e-mail.",
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
        Confirmamos o vínculo pelo e-mail <strong>{verificationStep.email}</strong>.
        Após a validação, o Daton tentará recuperar os acessos existentes por e-mail.
      </p>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="button" type="submit">
        Verificar e continuar
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
        const fullName = String(formData.get("fullName") ?? "").trim();
        const email = String(formData.get("email") ?? "").trim();
        const password = String(formData.get("password") ?? "");
        const { firstName, lastName } = splitFullName(fullName);

        setError(null);

        startTransition(async () => {
          try {
            const createResult = await signUp.password({
              emailAddress: email,
              password,
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

            setVerificationStep({ email });
          } catch (signUpError) {
            setError(
              getAuthErrorMessage(
                signUpError,
                "Não foi possível preparar a nova credencial agora.",
              ),
            );
          }
        });
      }}
    >
      <div className="field">
        <label htmlFor="fullName">Nome completo</label>
        <input autoComplete="name" id="fullName" name="fullName" required type="text" />
      </div>
      <div className="field">
        <label htmlFor="email">E-mail de trabalho</label>
        <input autoComplete="email" id="email" name="email" required type="email" />
      </div>
      <div className="field">
        <label htmlFor="password">Nova senha</label>
        <input
          autoComplete="new-password"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>
      <p className="form-note">
        Use este fluxo se o vínculo da sua organização já existe na base do Daton e
        você só precisa recriar a credencial.
      </p>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="button" type="submit">
        Criar credencial
      </button>
      <p className="form-note">
        Já possui credencial? <Link href="/auth?mode=sign-in">Entrar</Link>
      </p>
    </form>
  );
}
