"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { signOut } from "@/lib/api";

export function SignOutButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  return (
    <div className="stack stack--xs">
      <button
        className="button button--ghost"
        disabled={isPending}
        onClick={() => {
          setIsPending(true);
          setError(null);

          startTransition(async () => {
            try {
              const result = await signOut();
              router.replace(result.redirectTo);
              router.refresh();
            } catch (signOutError) {
              setError(signOutError instanceof Error ? signOutError.message : "Não foi possível sair.");
            } finally {
              setIsPending(false);
            }
          });
        }}
        type="button"
      >
        {isPending ? "Saindo…" : "Sair"}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
