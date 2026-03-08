"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { authClient } from "@/lib/auth-client";

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
              await authClient.signOut();
              router.replace("/sign-in");
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
