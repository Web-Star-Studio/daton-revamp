"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { authClient } from "@/lib/auth-client";

const isInvalidCredentialsError = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const status = "status" in value ? value.status : undefined;
  const code = "code" in value ? value.code : undefined;
  const message =
    "message" in value && typeof value.message === "string" ? value.message : "";

  return (
    status === 401 ||
    code === "INVALID_EMAIL_OR_PASSWORD" ||
    message.toLowerCase().includes("invalid email or password") ||
    message.toLowerCase().includes("invalid password")
  );
};

export function SignInForm() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const email = String(formData.get("email") ?? "").trim();
        const password = String(formData.get("password") ?? "");

        setError(null);
        setIsPending(true);

        startTransition(async () => {
          try {
            const result = await authClient.signIn.email({
              email,
              password,
            });

            if (result?.error) {
              if (isInvalidCredentialsError(result.error)) {
                throw new Error("E-mail ou senha inválidos.");
              }

              throw new Error("Não foi possível entrar no ambiente agora.");
            }

            router.replace("/app");
            router.refresh();
          } catch (signInError) {
            if (isInvalidCredentialsError(signInError)) {
              setError("E-mail ou senha inválidos.");
            } else {
              setError("Não foi possível entrar no ambiente agora.");
            }
          } finally {
            setIsPending(false);
          }
        });
      }}
    >
      <div className="field field--wide">
        <label htmlFor="email">E-mail de trabalho</label>
        <input autoComplete="email" id="email" name="email" placeholder="Digite seu e-mail *" required type="email" />
      </div>
      <div className="field field--wide">
        <label htmlFor="password">Senha</label>
        <input
          autoComplete="current-password"
          id="password"
          name="password"
          placeholder="Digite sua senha"
          required
          type="password"
        />
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="button" disabled={isPending} type="submit">
        {isPending ? "Abrindo ambiente…" : "Entrar no ambiente"}
        <span aria-hidden="true" style={{ marginLeft: "0.35rem" }}>→</span>
      </button>
      <p className="form-note">
        Precisa criar um ambiente? <Link href="/auth?mode=sign-up">Criar uma organização</Link>
      </p>
    </form>
  );
}
