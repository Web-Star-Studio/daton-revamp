"use client";

import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  type ServerBranch,
  type ServerOrganizationMember,
} from "@/lib/server-api";

import { BranchForm } from "./branch-form";
import { CloseIcon } from "./app-icons";

export const BRANCH_EDITOR_MODAL_VISIBILITY_EVENT =
  "daton:branch-editor-modal-visibility";

type BranchEditorModalProps = {
  branch: ServerBranch;
  branches: ServerBranch[];
  members: ServerOrganizationMember[];
  open: boolean;
};

export function BranchEditorModal({
  branch,
  branches,
  members,
  open,
}: BranchEditorModalProps) {
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
  }, [close, open]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(BRANCH_EDITOR_MODAL_VISIBILITY_EVENT, {
        detail: { open },
      }),
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent(BRANCH_EDITOR_MODAL_VISIBILITY_EVENT, {
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
        aria-labelledby="branch-editor-title"
        aria-modal="true"
        className="app-modal__dialog app-modal__dialog--editor"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="app-modal__header">
          <div className="stack stack--xs">
            <h2 id="branch-editor-title">Editar dados</h2>
            <p className="app-modal__description">
              Atualize o cadastro central da filial sem sair da visão atual.
            </p>
          </div>
          <button
            aria-label="Fechar edição"
            className="icon-button"
            onClick={close}
            type="button"
          >
            <CloseIcon />
          </button>
        </header>
        <div className="app-modal__body app-modal__body--editor">
          <BranchForm
            branch={branch}
            branches={branches}
            members={members}
            onSuccess={close}
          />
        </div>
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
