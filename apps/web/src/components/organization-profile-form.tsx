"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { type UpdateOrganizationInput } from "@daton/contracts";

import {
  skipOrganizationOnboarding,
  updateOrganization,
} from "@/lib/api";
import type { ServerSession } from "@/lib/server-api";

type SessionOrganization = NonNullable<ServerSession["organization"]>;

type OrganizationProfileFormProps = {
  allowSkip?: boolean;
  cancelHref?: string;
  organization: SessionOrganization;
  onSuccessHref: string;
  saveLabel?: string;
  skipLabel?: string;
};

export function OrganizationProfileForm({
  allowSkip = false,
  cancelHref,
  organization,
  onSuccessHref,
  saveLabel = "Salvar dados",
  skipLabel = "Pular por agora",
}: OrganizationProfileFormProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<"save" | "skip" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const isPending = pendingAction !== null;

  return (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        const payload = {
          openingDate: String(formData.get("openingDate") ?? ""),
          taxRegime: String(formData.get("taxRegime") ?? ""),
          primaryCnae: String(formData.get("primaryCnae") ?? ""),
          stateRegistration: String(formData.get("stateRegistration") ?? ""),
          municipalRegistration: String(
            formData.get("municipalRegistration") ?? "",
          ),
        } satisfies UpdateOrganizationInput;

        setError(null);
        setPendingAction("save");

        startTransition(async () => {
          try {
            await updateOrganization(payload);
            router.replace(onSuccessHref);
            router.refresh();
          } catch (organizationError) {
            setError(
              organizationError instanceof Error
                ? organizationError.message
                : "Não foi possível salvar os dados da organização.",
            );
          } finally {
            setPendingAction(null);
          }
        });
      }}
    >
      <div className="field">
        <label htmlFor="openingDate">Data de abertura</label>
        <input
          defaultValue={organization.openingDate ?? ""}
          id="openingDate"
          name="openingDate"
          type="date"
        />
      </div>
      <div className="field">
        <label htmlFor="taxRegime">Regime tributário</label>
        <input
          defaultValue={organization.taxRegime ?? ""}
          id="taxRegime"
          name="taxRegime"
          placeholder="Ex: Simples Nacional"
          type="text"
        />
      </div>
      <div className="field field--wide">
        <label htmlFor="primaryCnae">CNAE principal</label>
        <input
          defaultValue={organization.primaryCnae ?? ""}
          id="primaryCnae"
          name="primaryCnae"
          placeholder="Ex: 62.01-5-01"
          type="text"
        />
      </div>
      <div className="field">
        <label htmlFor="stateRegistration">Inscrição estadual</label>
        <input
          defaultValue={organization.stateRegistration ?? ""}
          id="stateRegistration"
          name="stateRegistration"
          type="text"
        />
      </div>
      <div className="field">
        <label htmlFor="municipalRegistration">Inscrição municipal</label>
        <input
          defaultValue={organization.municipalRegistration ?? ""}
          id="municipalRegistration"
          name="municipalRegistration"
          type="text"
        />
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="organization-profile-form__actions">
        <button className="button" disabled={isPending} type="submit">
          {pendingAction === "save" ? "Salvando dados" : saveLabel}
        </button>
        {cancelHref ? (
          <Link
            className="button button--secondary"
            href={cancelHref}
            aria-disabled={isPending}
          >
            Cancelar
          </Link>
        ) : null}
        {allowSkip ? (
          <button
            className="button button--secondary"
            disabled={isPending}
            onClick={() => {
              setError(null);
              setPendingAction("skip");

              startTransition(async () => {
                try {
                  await skipOrganizationOnboarding();
                  router.replace(onSuccessHref);
                  router.refresh();
                } catch (organizationError) {
                  setError(
                    organizationError instanceof Error
                      ? organizationError.message
                      : "Não foi possível pular o onboarding agora.",
                  );
                } finally {
                  setPendingAction(null);
                }
              });
            }}
            type="button"
          >
            {pendingAction === "skip" ? "Pulando onboarding" : skipLabel}
          </button>
        ) : null}
      </div>
    </form>
  );
}
