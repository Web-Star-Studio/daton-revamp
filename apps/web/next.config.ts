import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

import {
  getWebSentryEnvironment,
  getWebSentryRelease,
  getWebSentryTracesSampleRate,
  hasSentryBuildConfiguration,
} from "./src/lib/sentry";

const sentryRelease = getWebSentryRelease();
const hasSentryUpload = hasSentryBuildConfiguration();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  env: {
    SENTRY_ENVIRONMENT: getWebSentryEnvironment(),
    SENTRY_RELEASE: sentryRelease ?? "",
    SENTRY_TRACES_SAMPLE_RATE: String(getWebSentryTracesSampleRate()),
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  release: sentryRelease,
  telemetry: false,
  silent: true,
  sourcemaps: {
    disable: !hasSentryUpload,
    deleteSourcemapsAfterUpload: true,
  },
});
