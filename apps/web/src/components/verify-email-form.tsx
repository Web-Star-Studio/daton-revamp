"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

import {
  pendingEmailVerificationSummaryStorageKey,
  type VerificationRequiredAuthResult,
  verificationRequiredAuthResultSchema,
} from "@/lib/auth-flow";
import {
  cancelEmailVerification,
  resendEmailVerificationCode,
  verifyEmailCode,
} from "@/lib/api";

type VerifyEmailFormProps = {
  pendingVerification?: VerificationRequiredAuthResult | null;
};

export function VerifyEmailForm({
  pendingVerification,
}: VerifyEmailFormProps) {
  const router = useRouter();
  const [clientPendingVerification, setClientPendingVerification] =
    useState<VerificationRequiredAuthResult | null>(pendingVerification ?? null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (pendingVerification) {
      setClientPendingVerification(pendingVerification);
      window.sessionStorage.setItem(
        pendingEmailVerificationSummaryStorageKey,
        JSON.stringify(pendingVerification),
      );
      return;
    }

    const rawValue = window.sessionStorage.getItem(
      pendingEmailVerificationSummaryStorageKey,
    );

    if (!rawValue) {
      return;
    }

    try {
      setClientPendingVerification(
        verificationRequiredAuthResultSchema.parse(JSON.parse(rawValue)),
      );
    } catch {
      window.sessionStorage.removeItem(
        pendingEmailVerificationSummaryStorageKey,
      );
    }
  }, [pendingVerification]);

  const activePendingVerification = clientPendingVerification ?? {
    email: "",
    flow: "sign-in" as const,
    message:
      "Informe o código enviado para o seu e-mail para concluir o acesso.",
    status: "verification_required" as const,
  };

  return (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const code = String(formData.get("code") ?? "").trim();

        setError(null);
        setInfo(null);
        setIsPending(true);

        startTransition(async () => {
          try {
            const result = await verifyEmailCode({ code });
            window.sessionStorage.removeItem(
              pendingEmailVerificationSummaryStorageKey,
            );
            window.location.assign(result.redirectTo);
          } catch (verificationError) {
            setError(
              verificationError instanceof Error
                ? verificationError.message
                : "Não foi possível concluir a verificação do e-mail agora.",
            );
          } finally {
            setIsPending(false);
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
        {activePendingVerification.message}
        {activePendingVerification.email
          ? (
              <>
                {" "}Enviamos o código para{" "}
                <strong>{activePendingVerification.email}</strong>.
              </>
            )
          : null}
      </p>
      {info ? <p className="form-note">{info}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      <button className="button" disabled={isPending} type="submit">
        {isPending
          ? "Verificando código…"
          : activePendingVerification.flow === "sign-up"
            ? "Verificar e continuar"
            : "Verificar e entrar"}
      </button>
      <button
        className="button button--ghost"
        disabled={isResending}
        type="button"
        onClick={() => {
          setError(null);
          setInfo(null);
          setIsResending(true);

          startTransition(async () => {
            try {
              const result = await resendEmailVerificationCode();
              setInfo(result.message);
            } catch (resendError) {
              setError(
                resendError instanceof Error
                  ? resendError.message
                  : "Não foi possível reenviar o código agora.",
              );
            } finally {
              setIsResending(false);
            }
          });
        }}
      >
        {isResending ? "Reenviando código…" : "Reenviar código"}
      </button>
      <button
        className="button button--ghost"
        disabled={isCancelling}
        type="button"
        onClick={() => {
          setError(null);
          setInfo(null);
          setIsCancelling(true);

          startTransition(async () => {
            try {
              const result = await cancelEmailVerification();
              window.sessionStorage.removeItem(
                pendingEmailVerificationSummaryStorageKey,
              );
              router.replace(result.redirectTo);
              router.refresh();
            } catch (cancelError) {
              setError(
                cancelError instanceof Error
                  ? cancelError.message
                  : "Não foi possível voltar agora.",
              );
            } finally {
              setIsCancelling(false);
            }
          });
        }}
      >
        {isCancelling
          ? "Voltando…"
          : activePendingVerification.flow === "sign-up"
            ? "Voltar para o cadastro"
            : "Voltar para a entrada"}
      </button>
    </form>
  );
}
