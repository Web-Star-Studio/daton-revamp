"use client";

import Link from "next/link";

type ExceptionStateProps = {
  referenceId?: string;
  homeHref?: string;
  homeLabel?: string;
  retryLabel: string;
  title: string;
  onRetry: () => void;
};

const fallbackMessage =
  "Ocorreu uma inconsistência interna. Tente recarregar a visualização para continuar.";

export function ExceptionState({
  referenceId,
  homeHref,
  homeLabel = "Ir para o início",
  retryLabel,
  title,
  onRetry,
}: ExceptionStateProps) {
  const normalizedHomeHref = homeHref?.trim();
  const hasHomeAction = Boolean(normalizedHomeHref);
  const safeHomeHref = normalizedHomeHref ?? "/";

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
              <span>Como seguir</span>
              <p>{fallbackMessage}</p>
              {referenceId ? (
                <p>Referência de suporte: {referenceId}</p>
              ) : null}
            </div>
          </div>

          <div className="exception-panel__actions">
            <button className="button" onClick={onRetry} type="button">
              {retryLabel}
            </button>
            {hasHomeAction ? (
              <Link className="button button--secondary" href={safeHomeHref}>
                {homeLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
