import * as Sentry from "@sentry/nextjs";

import {
  getWebSentryEnvironment,
  getWebSentryRelease,
  getWebSentryTracesSampleRate,
  sanitizeSentryEvent,
} from "./src/lib/sentry";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  sendDefaultPii: false,
  environment: getWebSentryEnvironment(),
  release: getWebSentryRelease(),
  tracesSampleRate: getWebSentryTracesSampleRate(),
  beforeSend: sanitizeSentryEvent,
});
