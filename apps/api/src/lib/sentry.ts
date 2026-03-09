import * as Sentry from "@sentry/cloudflare";

import type { SessionSnapshot } from "./session";
import type { AppBindings } from "../types";

const DEFAULT_LOCAL_SAMPLE_RATE = 1;
const DEFAULT_REMOTE_SAMPLE_RATE = 0.1;
const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-forwarded-for",
  "cf-connecting-ip",
]);

const parseSampleRate = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    return fallback;
  }

  return parsed;
};

const isLocalUrl = (value: string) => {
  try {
    const host = new URL(value).hostname;
    return host === "127.0.0.1" || host === "localhost";
  } catch {
    return false;
  }
};

export const getApiSentryEnvironment = (bindings: AppBindings["Bindings"]) =>
  bindings.SENTRY_ENVIRONMENT ??
  (isLocalUrl(bindings.NEXT_PUBLIC_APP_URL) ? "development" : "production");

export const getApiSentryRelease = (bindings: AppBindings["Bindings"]) =>
  bindings.SENTRY_RELEASE;

export const getApiSentryTracesSampleRate = (
  bindings: AppBindings["Bindings"],
) =>
  parseSampleRate(
    bindings.SENTRY_TRACES_SAMPLE_RATE,
    isLocalUrl(bindings.NEXT_PUBLIC_APP_URL)
      ? DEFAULT_LOCAL_SAMPLE_RATE
      : DEFAULT_REMOTE_SAMPLE_RATE,
  );

export const createApiSentryOptions = (
  bindings: AppBindings["Bindings"],
): Sentry.CloudflareOptions => ({
  dsn: bindings.SENTRY_DSN,
  enabled: Boolean(bindings.SENTRY_DSN),
  defaultIntegrations: Sentry.getDefaultIntegrations({
    dsn: bindings.SENTRY_DSN,
    sendDefaultPii: false,
  }).filter((integration) => integration.name !== "Hono"),
  sendDefaultPii: false,
  environment: getApiSentryEnvironment(bindings),
  release: getApiSentryRelease(bindings),
  tracesSampleRate: getApiSentryTracesSampleRate(bindings),
  beforeSend(event) {
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      delete event.user.username;
    }

    if (event.request) {
      delete event.request.cookies;
      delete event.request.data;

      if (event.request.headers) {
        event.request.headers = Object.fromEntries(
          Object.entries(event.request.headers).filter(
            ([headerName]) => !SENSITIVE_HEADERS.has(headerName.toLowerCase()),
          ),
        );
      }
    }

    return event;
  },
});

export const setRequestSentryContext = (input: {
  method: string;
  path: string;
  status?: number;
}) => {
  Sentry.setTag("request.method", input.method);
  Sentry.setTag("request.path", input.path);

  if (typeof input.status === "number") {
    Sentry.setTag("http.status_code", String(input.status));
  }
};

export const setSessionSentryContext = (snapshot: SessionSnapshot | null) => {
  if (!snapshot) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: snapshot.user.id,
  });

  if (snapshot.organization) {
    Sentry.setTag("organization.id", snapshot.organization.id);
    Sentry.setTag(
      "organization.onboarding_status",
      snapshot.organization.onboardingStatus,
    );
  }

  if (snapshot.effectiveRoles.length > 0) {
    Sentry.setTag("membership.roles", snapshot.effectiveRoles.join(","));
    Sentry.setTag("membership.primary_role", snapshot.effectiveRoles[0]);
  }

  Sentry.setContext("membership", {
    organizationId: snapshot.organization?.id ?? null,
    memberId: snapshot.member?.id ?? null,
    roles: snapshot.effectiveRoles,
    branchScope: snapshot.branchScope,
  });
};
