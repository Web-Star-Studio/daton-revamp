"use client";

import { useEffect } from "react";

import { CloseIcon, MaterialIcon } from "./app-icons";

type AlertsModalProps = {
  open: boolean;
  onClose: () => void;
};

const alerts = [
  {
    icon: "error",
    itemClassName: "alerts-modal__item--critical",
    iconClassName: "alerts-modal__icon--critical",
    tone: "critical",
    level: "Crítico",
    title: "Certificado Digital Vencido",
    description:
      "O certificado A1 da filial RJ expirou há 2 dias. A emissão fiscal precisa de revisão imediata.",
    action: "Renovar Agora",
    secondaryAction: "Ignorar",
  },
  {
    icon: "warning",
    itemClassName: "alerts-modal__item--warning",
    iconClassName: "alerts-modal__icon--warning",
    tone: "warning",
    level: "Atenção",
    title: "Inconsistência Cadastral",
    description:
      "Endereço da filial SP diverge do cadastro principal e precisa ser revisado.",
    action: "Revisar Dados",
  },
  {
    icon: "payments",
    itemClassName: "alerts-modal__item--neutral",
    iconClassName: "alerts-modal__icon--neutral",
    tone: "neutral",
    level: "Vence em 5 dias",
    title: "Guia DAS Disponível",
    description:
      "A guia mensal do Simples Nacional já pode ser emitida para a próxima competência.",
    action: "Baixar Guia",
  },
];

export function AlertsModal({ open, onClose }: AlertsModalProps) {
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
        aria-labelledby="alerts-modal-title"
        aria-modal="true"
        className="app-modal__dialog app-modal__dialog--alerts"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="app-modal__header">
          <div className="alerts-modal__headline">
            <h2 id="alerts-modal-title">Central de Alertas</h2>
            <span className="alerts-modal__count">{alerts.length}</span>
          </div>
          <button
            aria-label="Fechar alertas"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </header>
        <div className="alerts-modal__list" role="list">
          {alerts.map((alert) => (
            <article
              className={`alerts-modal__item ${alert.itemClassName}`}
              key={alert.title}
              role="listitem"
            >
              <div
                className={`alerts-modal__icon ${alert.iconClassName}`}
                aria-hidden="true"
              >
                <MaterialIcon icon={alert.icon} />
              </div>
              <div className="alerts-modal__copy">
                <div className="alerts-modal__topline">
                  <h3>{alert.title}</h3>
                  <span className={`pill pill--${alert.tone}`}>
                    {alert.level}
                  </span>
                </div>
                <p>{alert.description}</p>
                <div className="alerts-modal__actions">
                  <button
                    className={`button${alert.tone === "critical" ? "" : " button--secondary"}`}
                    type="button"
                  >
                    {alert.icon === "payments" ? (
                      <>
                        <MaterialIcon icon="download" />
                        <span>{alert.action}</span>
                      </>
                    ) : (
                      alert.action
                    )}
                  </button>
                  {alert.secondaryAction ? (
                    <button
                      className="alerts-modal__secondary-action"
                      type="button"
                    >
                      {alert.secondaryAction}
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
        <footer className="alerts-modal__footer">
          <span>Última verificação: há 5 min</span>
          <button className="alerts-modal__footer-action" type="button">
            <span>Ver histórico completo</span>
            <MaterialIcon icon="arrow_forward" />
          </button>
        </footer>
      </div>
    </div>
  );
}
