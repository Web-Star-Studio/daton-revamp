"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

export function SignOutButton() {
  const { signOut } = useClerk();
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
              await signOut({ redirectUrl: "/auth?mode=sign-in" });
              router.replace("/auth?mode=sign-in");
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
