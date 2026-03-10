"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { formatCnpj } from "@daton/contracts";
import { bootstrapOrganization } from "@/lib/api";

export function BootstrapForm() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
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
        setIsPending(true);

        startTransition(async () => {
          try {
            await bootstrapOrganization(payload);
            router.replace("/onboarding/organization");
            router.refresh();
          } catch (bootstrapError) {
            setError(
              bootstrapError instanceof Error
                ? bootstrapError.message
                : "Não foi possível criar o ambiente agora.",
            );
          } finally {
            setIsPending(false);
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
        <input autoComplete="name" id="adminFullName" name="adminFullName" required type="text" />
      </div>
      <div className="field">
        <label htmlFor="adminEmail">E-mail do administrador</label>
        <input autoComplete="email" id="adminEmail" name="adminEmail" required type="email" />
      </div>
      <div className="field">
        <label htmlFor="password">Senha</label>
        <input autoComplete="new-password" id="password" name="password" required type="password" />
      </div>
      <label className="checkbox">
        <input id="terms" name="terms" required type="checkbox" />
        <span>
          Ao marcar esta caixa, declaro que li, entendi e concordo com os Termos de Serviço,
          a Política de Privacidade, o EULA e a Política de Uso Aceitável do Daton.
        </span>
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="button" disabled={isPending} type="submit">
        {isPending ? "Criando ambiente" : "Criar ambiente Daton"}
      </button>
      <p className="form-note">
        Já possui um ambiente? <Link href="/auth?mode=sign-in">Entrar</Link>
      </p>
    </form>
  );
}
