"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { sessionResponseSchema } from "@daton/contracts";

import { clientApiFetch } from "@/lib/api";

export function OrganizationOnboardingWaiting() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const syncSession = async () => {
      try {
        const session = await clientApiFetch("/api/v1/session", {
          schema: sessionResponseSchema,
        });

        if (cancelled || !session?.organization) {
          return;
        }

        if (session.organization.onboardingStatus === "completed") {
          router.replace("/app");
          router.refresh();
        }
      } catch {
        if (!cancelled) {
          router.refresh();
        }
      }
    };

    void syncSession();
    const intervalId = window.setInterval(() => {
      void syncSession();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [router]);

  return null;
}
