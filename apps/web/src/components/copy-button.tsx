"use client";

import { useState } from "react";

import { CopyIcon } from "./app-icons";

type CopyButtonProps = {
  value: string;
  size?: "default" | "compact";
};

export function CopyButton({ value, size = "default" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      aria-label={copied ? "Copiado" : "Copiar valor"}
      className={`icon-button${size === "compact" ? " icon-button--compact" : ""}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        } catch {
          setCopied(false);
        }
      }}
      type="button"
    >
      <CopyIcon />
    </button>
  );
}
