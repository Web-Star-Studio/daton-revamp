"use client";

import { useEffect } from "react";

import { AiChatIcon, CloseIcon } from "./app-icons";

type AiChatModalProps = {
  open: boolean;
  onClose: () => void;
};

const starters = [
  "Resuma os riscos fiscais visíveis nesta organização.",
  "Quais filiais precisam de revisão cadastral?",
  "Monte um plano de conferência mensal para a equipe.",
];

export function AiChatModal({ open, onClose }: AiChatModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="app-modal app-modal--overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        aria-labelledby="ai-chat-modal-title"
        aria-modal="true"
        className="app-modal__dialog app-modal__dialog--chat"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="app-modal__header">
          <div className="stack stack--xs">
            <h2 id="ai-chat-modal-title">Assistente operacional</h2>
            <p className="app-modal__description">
              Use o chat para resumir pendências, estruturar rotinas e explorar
              os dados visíveis do workspace.
            </p>
          </div>
          <button
            aria-label="Fechar AI Chat"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </header>
        <div className="app-modal__body app-modal__body--chat">
          <label className="chat-field" htmlFor="ai-chat-input">
            <span>Pergunta</span>
            <textarea
              id="ai-chat-input"
              placeholder="Escreva uma pergunta ou comando para iniciar a conversa."
              rows={5}
            />
          </label>
          <div className="chat-starters">
            {starters.map((starter) => (
              <button className="chat-starter" key={starter} type="button">
                {starter}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
