"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useClerk, useSignIn } from "@clerk/nextjs";

import { getAuthErrorMessage, resolvePostAuthRedirect } from "@/lib/auth-client";

type VerificationStep = {
  email: string;
};

export function SignInForm() {
  const router = useRouter();
  const { loaded } = useClerk();
  const { signIn } = useSignIn();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationStep, setVerificationStep] = useState<VerificationStep | null>(
    null,
  );

  const finalizeSignIn = async () => {
    const result = await signIn.finalize();

    if (result.error) {
      throw result.error;
    }

    const redirectTo = await resolvePostAuthRedirect();
    router.replace(redirectTo);
    router.refresh();
  };

  const handlePasswordSignIn = async (email: string, password: string) => {
    setError(null);
    setIsSubmitting(true);

    try {
      if (!loaded || !signIn) {
        throw new Error("A autenticação ainda está carregando. Tente novamente em instantes.");
      }

      const result = await signIn.password({
        emailAddress: email,
        password,
      });

      if (result.error) {
        throw result.error;
      }

      if (signIn.status === "complete") {
        await finalizeSignIn();
        return;
      }

      if (signIn.status === "needs_client_trust") {
        const sendCodeResult = await signIn.emailCode.sendCode();

        if (sendCodeResult.error) {
          throw sendCodeResult.error;
        }

        setVerificationStep({ email });
        return;
      }

      throw new Error("Não foi possível concluir a autenticação agora.");
    } catch (signInError) {
      setError(
        getAuthErrorMessage(
          signInError,
          "Não foi possível autenticar com as credenciais informadas.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailCodeVerification = async (code: string) => {
    setError(null);
    setIsSubmitting(true);

    try {
      if (!loaded || !signIn) {
        throw new Error("A autenticação ainda está carregando. Tente novamente em instantes.");
      }

      const result = await signIn.emailCode.verifyCode({ code });

      if (result.error) {
        throw result.error;
      }

      if (signIn.status !== "complete") {
        throw new Error("Não foi possível concluir a entrada no momento.");
      }

      await finalizeSignIn();
    } catch (signInError) {
      setError(
        getAuthErrorMessage(
          signInError,
          "Não foi possível validar o código enviado por e-mail.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return verificationStep ? (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const code = String(formData.get("code") ?? "").trim();
        void handleEmailCodeVerification(code);
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
        Enviamos um código para <strong>{verificationStep.email}</strong> para
        confirmar este dispositivo.
      </p>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="button" disabled={isSubmitting || !loaded} type="submit">
        {isSubmitting ? "Validando..." : "Verificar e entrar"}
      </button>
      <button
        className="button button--ghost"
        disabled={isSubmitting}
        type="button"
        onClick={() => {
          setVerificationStep(null);
          setError(null);
          if (signIn) {
            void signIn.reset();
          }
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
        const email = String(formData.get("email") ?? "").trim();
        const password = String(formData.get("password") ?? "");
        void handlePasswordSignIn(email, password);
      }}
    >
      <div className="field">
        <label htmlFor="email">E-mail de trabalho</label>
        <input autoComplete="email" id="email" name="email" required type="email" />
      </div>
      <div className="field">
        <label htmlFor="password">Senha</label>
        <input
          autoComplete="current-password"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="button" disabled={isSubmitting || !loaded} type="submit">
        {isSubmitting ? "Entrando..." : "Entrar no Daton"}
      </button>
      <p className="form-note">
        Vai estruturar uma nova organização?{" "}
        <Link href="/auth?mode=sign-up">Criar ambiente</Link>
      </p>
    </form>
  );
}
