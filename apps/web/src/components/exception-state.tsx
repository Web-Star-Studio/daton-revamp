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

const buildSupportReference = (errorMessage?: string) => {
  const normalized = errorMessage?.trim();

  if (!normalized) {
    return null;
  }

  let hash = 0;

  for (const character of normalized) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return `ERR-${hash.toString(36).toUpperCase().padStart(6, "0").slice(0, 8)}`;
};

export function ExceptionState({
  errorMessage,
  homeHref,
  homeLabel = "Ir para o início",
  retryLabel,
  title,
  onRetry,
}: ExceptionStateProps) {
  const normalizedHomeHref = homeHref?.trim();
  const supportReference = buildSupportReference(errorMessage);
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
              {supportReference ? (
                <p>Referência de suporte: {supportReference}</p>
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
