"use client";

import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { CloseIcon } from "./app-icons";

export function NewBranchModal({ children }: PropsWithChildren) {
  const router = useRouter();

  const close = () => {
    router.back();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="app-modal app-modal--overlay"
      onClick={close}
      role="presentation"
    >
      <div
        aria-labelledby="new-branch-modal-title"
        aria-modal="true"
        className="app-modal__dialog app-modal__dialog--editor"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="app-modal__header">
          <div className="stack stack--xs">
            <h2 id="new-branch-modal-title">Criar filial</h2>
            <p className="app-modal__description">
              Preencha os dados essenciais para adicionar uma nova unidade à
              organização.
            </p>
          </div>
          <button
            aria-label="Fechar criação de filial"
            className="icon-button"
            onClick={close}
            type="button"
          >
            <CloseIcon />
          </button>
        </header>
        <div className="app-modal__body app-modal__body--editor">
          {children}
        </div>
      </div>
    </div>
  );
}
