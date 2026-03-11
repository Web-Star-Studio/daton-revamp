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
const requiredUrlEnvKeys = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_API_URL",
  "INTERNAL_API_URL",
] as const;
const requiredUrlEnv = {
  NEXT_PUBLIC_APP_URL:
    process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "http://127.0.0.1:3000",
  NEXT_PUBLIC_API_URL:
    process.env.NEXT_PUBLIC_API_URL?.trim() ?? "http://127.0.0.1:3000",
  INTERNAL_API_URL:
    process.env.INTERNAL_API_URL?.trim() ?? "http://127.0.0.1:8787",
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  output: "standalone",
  env: {
    NEXT_PUBLIC_APP_URL: requiredUrlEnv.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_URL: requiredUrlEnv.NEXT_PUBLIC_API_URL,
    INTERNAL_API_URL: requiredUrlEnv.INTERNAL_API_URL,
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
