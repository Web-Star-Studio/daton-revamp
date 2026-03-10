"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { authClient } from "@/lib/auth-client";

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
              throw new Error("E-mail ou senha inválidos.");
            }

            router.replace("/app");
            router.refresh();
          } catch (signInError) {
            setError(
              signInError instanceof Error
                ? signInError.message
                : "Não foi possível entrar com essas credenciais.",
            );
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
