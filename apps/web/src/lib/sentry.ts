import type { ErrorEvent } from "@sentry/nextjs";

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

const getDefaultSampleRate = () =>
  process.env.NODE_ENV === "production"
    ? DEFAULT_REMOTE_SAMPLE_RATE
    : DEFAULT_LOCAL_SAMPLE_RATE;

const getOrigins = (values: Array<string | undefined>) => {
  const origins = new Set<string>();

  values.forEach((value) => {
    if (!value) {
      return;
    }

    try {
      origins.add(new URL(value).origin);
    } catch {
      // Ignore malformed URLs and fall back to local route tracing only.
    }
  });

  return Array.from(origins);
};

export const getWebSentryEnvironment = () =>
  process.env.SENTRY_ENVIRONMENT ??
  (process.env.NODE_ENV === "production" ? "production" : "development");

export const getWebSentryRelease = () =>
  process.env.SENTRY_RELEASE ??
  process.env.GITHUB_SHA ??
  process.env.VERCEL_GIT_COMMIT_SHA;

export const getWebSentryTracesSampleRate = () =>
  parseSampleRate(
    process.env.SENTRY_TRACES_SAMPLE_RATE,
    getDefaultSampleRate(),
  );

export const getWebTracePropagationTargets = (): Array<string | RegExp> => [
  /^\//,
  ...getOrigins([
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_API_URL,
  ]),
];

export const hasSentryBuildConfiguration = () =>
  Boolean(
    process.env.SENTRY_AUTH_TOKEN &&
    process.env.SENTRY_ORG &&
    process.env.SENTRY_PROJECT,
  );

export const sanitizeSentryEvent = (event: ErrorEvent) => {
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
};
