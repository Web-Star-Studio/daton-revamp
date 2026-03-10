"use client";

import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { ServerSession } from "@/lib/server-api";

import { CloseIcon } from "./app-icons";
import { ORGANIZATION_PROFILE_MODAL_VISIBILITY_EVENT } from "./organization-profile-events";
import { OrganizationProfileForm } from "./organization-profile-form";

type SessionOrganization = NonNullable<ServerSession["organization"]>;

type OrganizationProfileModalProps = {
  onSuccessHref: string;
  open: boolean;
  organization: SessionOrganization;
};

export function OrganizationProfileModal({
  onSuccessHref,
  open,
  organization,
}: OrganizationProfileModalProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const portalTarget = usePortalTarget();

  const close = () => {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete("edit");
    const nextUrl = nextSearchParams.toString()
      ? `${pathname}?${nextSearchParams.toString()}`
      : pathname;
    router.replace(nextUrl);
  };

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(ORGANIZATION_PROFILE_MODAL_VISIBILITY_EVENT, {
        detail: { open },
      }),
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent(ORGANIZATION_PROFILE_MODAL_VISIBILITY_EVENT, {
          detail: { open: false },
        }),
      );
    };
  }, [open]);

  if (!open || !portalTarget) {
    return null;
  }

  return createPortal(
    <div
      aria-hidden="true"
      className="app-modal app-modal--overlay"
      onClick={close}
      role="presentation"
    >
      <div
        aria-labelledby="organization-profile-modal-title"
        aria-modal="true"
        className="app-modal__dialog app-modal__dialog--editor"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="app-modal__header">
          <div className="stack stack--xs">
            <h2 id="organization-profile-modal-title">Editar dados</h2>
            <p className="app-modal__description">
              Atualize o perfil operacional e os dados cadastrais sem sair da
              visão geral.
            </p>
          </div>
          <button
            aria-label="Fechar edição da organização"
            className="icon-button"
            onClick={close}
            type="button"
          >
            <CloseIcon />
          </button>
        </header>
        <OrganizationProfileForm
          onCancel={close}
          onSuccessHref={onSuccessHref}
          organization={organization}
          variant="modal"
        />
      </div>
    </div>,
    portalTarget,
  );
}

function usePortalTarget() {
  return useMemo(
    () => (typeof document === "undefined" ? null : document.body),
    [],
  );
}
