"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="error-state">
      <p className="eyebrow">Exceção do sistema</p>
      <h1
        style={{
          fontFamily: "var(--font-serif), 'DM Serif Display', serif",
          fontWeight: 400,
          fontSize: "2.5rem",
          margin: 0,
        }}
      >
        O Daton não conseguiu renderizar esta visão.
      </h1>
      <p style={{ color: "var(--ink-soft)", margin: 0 }}>{error.message}</p>
      <button className="button" onClick={() => reset()} type="button">
        Tentar novamente
      </button>
    </main>
  );
}
