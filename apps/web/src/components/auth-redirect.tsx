"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type AuthRedirectProps = {
  href: string;
};

export function AuthRedirect({ href }: AuthRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    router.replace(href);
  }, [href, router]);

  return (
    <main className="loading-state">
      <p className="eyebrow">Daton</p>
      <h1
        style={{
          fontFamily: "var(--font-serif), 'DM Serif Display', serif",
          fontWeight: 400,
          fontSize: "2.5rem",
          margin: 0,
        }}
      >
        Redirecionando para autenticação…
      </h1>
    </main>
  );
}
