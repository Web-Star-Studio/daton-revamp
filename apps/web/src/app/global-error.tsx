"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <main className="error-state">
          <p className="eyebrow">Falha crítica</p>
          <h1
            style={{
              fontFamily: "var(--font-serif), 'DM Serif Display', serif",
              fontSize: "2.5rem",
              fontWeight: 400,
              margin: 0,
            }}
          >
            O Daton não conseguiu recuperar a aplicação.
          </h1>
          <p style={{ color: "var(--ink-soft)", margin: 0 }}>{error.message}</p>
          <button className="button" onClick={() => reset()} type="button">
            Recarregar
          </button>
        </main>
      </body>
    </html>
  );
}
