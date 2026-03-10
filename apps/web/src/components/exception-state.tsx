"use client";

import Link from "next/link";

type ExceptionStateProps = {
  errorMessage?: string;
  homeHref?: string;
  homeLabel?: string;
  retryLabel: string;
  title: string;
  onRetry: () => void;
};

const fallbackMessage =
  "Ocorreu uma inconsistência interna. Tente recarregar a visualização para continuar.";

export function ExceptionState({
  errorMessage,
  homeHref = "/app",
  homeLabel = "Ir para o ambiente",
  retryLabel,
  title,
  onRetry,
}: ExceptionStateProps) {
  const detail = errorMessage?.trim() ? errorMessage.trim() : fallbackMessage;

  return (
    <main className="exception-shell">
      <section className="exception-layout">
        <div className="exception-visual">
          <div className="exception-visual__copy">
            <h1>{title}</h1>
          </div>
        </div>

        <div className="exception-panel">
          <div className="exception-panel__body">
            <div className="exception-panel__detail">
              <span>Detalhe técnico</span>
              <p>{detail}</p>
            </div>
          </div>

          <div className="exception-panel__actions">
            <button className="button" onClick={onRetry} type="button">
              {retryLabel}
            </button>
            <Link className="button button--secondary" href={homeHref}>
              {homeLabel}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
