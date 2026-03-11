"use client";

import { sessionResponseSchema } from "@daton/contracts";

import { toApiUrl } from "./config";

const wait = (timeMs: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, timeMs);
  });

export const getAuthErrorMessage = (error: unknown, fallback: string) => {
  if (
    error &&
    typeof error === "object" &&
    "errors" in error &&
    Array.isArray(error.errors)
  ) {
    const firstError = error.errors[0];

    if (firstError && typeof firstError === "object") {
      if (
        "longMessage" in firstError &&
        typeof firstError.longMessage === "string" &&
        firstError.longMessage
      ) {
        return firstError.longMessage;
      }

      if (
        "message" in firstError &&
        typeof firstError.message === "string" &&
        firstError.message
      ) {
        return firstError.message;
      }
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export const splitFullName = (fullName: string) => {
  const normalized = fullName.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return {
      firstName: undefined,
      lastName: undefined,
    };
  }

  const [firstName, ...rest] = normalized.split(" ");
  const lastName = rest.join(" ").trim();

  return {
    firstName,
    lastName: lastName || undefined,
  };
};

export const resolvePostAuthRedirect = async () => {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(toApiUrl("/api/v1/session"), {
      credentials: "include",
      cache: "no-store",
    });

    if (response.ok) {
      const session = sessionResponseSchema.parse(await response.json());
      return session.organization?.onboardingStatus === "completed"
        ? "/app"
        : "/onboarding/organization";
    }

    if (response.status !== 401) {
      break;
    }

    await wait(150 * (attempt + 1));
  }

  return "/auth?mode=sign-up";
};
