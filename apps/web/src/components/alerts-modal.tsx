"use client";

import Link from "next/link";
import { useEffect } from "react";

import type { ServerNotification } from "@/lib/server-api";

import { CloseIcon, MaterialIcon } from "./app-icons";

type AlertsModalProps = {
  notifications: ServerNotification[];
  open: boolean;
  onClear: () => void;
  onClose: () => void;
};

const toneMeta = {
  critical: {
    itemClassName: "alerts-modal__item--critical",
  },
  warning: {
    itemClassName: "alerts-modal__item--warning",
  },
  neutral: {
    itemClassName: "alerts-modal__item--neutral",
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
  onClear,
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
            <h2 id="alerts-modal-title">Notificações</h2>
            <span className="alerts-modal__count">{notifications.length}</span>
          </div>
          <div className="alerts-modal__header-actions">
            <button
              className="alerts-modal__clear"
              disabled={notifications.length === 0}
              onClick={onClear}
              type="button"
            >
              Limpar
            </button>
            <button
              aria-label="Fechar notificações"
              className="icon-button"
              onClick={onClose}
              type="button"
            >
              <CloseIcon />
            </button>
          </div>
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
                  <div className="alerts-modal__copy">
                    <div className="alerts-modal__topline">
                      <h3>{notification.title}</h3>
                      <span className="alerts-modal__timestamp">
                        {formatNotificationDate(notification.createdAt)}
                      </span>
                    </div>
                    <p>{notification.description}</p>
                    <div className="alerts-modal__actions">
                      {notification.href ? (
                        <Link
                          className="button"
                          href={notification.href}
                          onClick={onClose}
                        >
                          Ver mais
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <article
              className="alerts-modal__item alerts-modal__item--neutral"
              role="listitem"
            >
              <div className="alerts-modal__copy">
                <div className="alerts-modal__topline">
                  <h3>Sem notificações recentes</h3>
                </div>
                <p>Ainda não há eventos recentes.</p>
              </div>
            </article>
          )}
        </div>
        <footer className="alerts-modal__footer">
          {latestNotification ? (
            <span>
              {`Último evento em ${formatNotificationDate(latestNotification.createdAt)}`}
            </span>
          ) : (
            <span />
          )}
          {notifications.length > 0 ? (
            <Link
              className="alerts-modal__footer-action"
              href="/app/settings/organization"
              onClick={onClose}
            >
              <span>Ver tudo</span>
              <MaterialIcon icon="arrow_forward" />
            </Link>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
