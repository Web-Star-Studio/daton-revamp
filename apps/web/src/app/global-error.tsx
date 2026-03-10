"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { ExceptionState } from "@/components/exception-state";

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
        <ExceptionState
          errorMessage={error.digest ? `${error.message} · ref ${error.digest}` : error.message}
          retryLabel="Recarregar"
          title="O Daton não conseguiu recuperar a aplicação."
          onRetry={() => reset()}
        />
      </body>
    </html>
  );
}
