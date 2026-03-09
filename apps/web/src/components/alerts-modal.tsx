"use client";

import Link from "next/link";
import { useEffect } from "react";

import type { ServerNotification } from "@/lib/server-api";

import { CloseIcon, MaterialIcon } from "./app-icons";

type AlertsModalProps = {
  notifications: ServerNotification[];
  open: boolean;
  onClose: () => void;
};

const toneMeta = {
  critical: {
    icon: "error",
    iconClassName: "alerts-modal__icon--critical",
    itemClassName: "alerts-modal__item--critical",
    label: "Crítico",
  },
  warning: {
    icon: "warning",
    iconClassName: "alerts-modal__icon--warning",
    itemClassName: "alerts-modal__item--warning",
    label: "Atenção",
  },
  neutral: {
    icon: "notifications",
    iconClassName: "alerts-modal__icon--neutral",
    itemClassName: "alerts-modal__item--neutral",
    label: "Atualização",
  },
} as const;

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AlertsModal({
  notifications,
  open,
  onClose,
}: AlertsModalProps) {
  const latestNotification = notifications[0] ?? null;

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
            <span className="alerts-modal__count">{notifications.length}</span>
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
          {notifications.length > 0 ? (
            notifications.map((notification) => {
              const meta = toneMeta[notification.level];

              return (
                <article
                  className={`alerts-modal__item ${meta.itemClassName}`}
                  key={notification.id}
                  role="listitem"
                >
                  <div
                    className={`alerts-modal__icon ${meta.iconClassName}`}
                    aria-hidden="true"
                  >
                    <MaterialIcon icon={meta.icon} />
                  </div>
                  <div className="alerts-modal__copy">
                    <div className="alerts-modal__topline">
                      <h3>{notification.title}</h3>
                      <span className={`pill pill--${notification.level}`}>
                        {meta.label}
                      </span>
                    </div>
                    <p>{notification.description}</p>
                    <div className="alerts-modal__actions">
                      {notification.href && notification.actionLabel ? (
                        <Link
                          className={`button${notification.level === "critical" ? "" : " button--secondary"}`}
                          href={notification.href}
                          onClick={onClose}
                        >
                          {notification.actionLabel}
                        </Link>
                      ) : null}
                    </div>
                    <span>{formatNotificationDate(notification.createdAt)}</span>
                  </div>
                </article>
              );
            })
          ) : (
            <article
              className="alerts-modal__item alerts-modal__item--neutral"
              role="listitem"
            >
              <div
                className="alerts-modal__icon alerts-modal__icon--neutral"
                aria-hidden="true"
              >
                <MaterialIcon icon="notifications" />
              </div>
              <div className="alerts-modal__copy">
                <div className="alerts-modal__topline">
                  <h3>Sem alertas recentes</h3>
                  <span className="pill pill--neutral">Atualização</span>
                </div>
                <p>
                  Ainda não há eventos recentes persistidos para exibir nesta
                  central.
                </p>
              </div>
            </article>
          )}
        </div>
        <footer className="alerts-modal__footer">
          <span>
            {latestNotification
              ? `Último evento em ${formatNotificationDate(latestNotification.createdAt)}`
              : "Aguardando novos eventos do backend"}
          </span>
          {notifications.length > 0 ? (
            <Link
              className="alerts-modal__footer-action"
              href="/app/settings/organization"
              onClick={onClose}
            >
              <span>Ver organização</span>
              <MaterialIcon icon="arrow_forward" />
            </Link>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
