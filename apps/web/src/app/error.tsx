"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { ExceptionState } from "@/components/exception-state";

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
    <ExceptionState
      errorMessage={error.message}
      retryLabel="Tentar novamente"
      title="O Daton não conseguiu renderizar esta visão."
      onRetry={() => reset()}
    />
  );
}
