"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { ExceptionState } from "@/components/exception-state";

function createReferenceId(error: Error) {
  const source = [error.name, error.message, error.stack ?? ""].join("|");
  let hash = 0;

  for (const character of source) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return `ERR-${hash.toString(36).toUpperCase().padStart(6, "0").slice(0, 8)}`;
}

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
      referenceId={createReferenceId(error)}
      retryLabel="Tentar novamente"
      title="O Daton não conseguiu renderizar esta visão."
      onRetry={() => reset()}
    />
  );
}
