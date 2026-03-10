import type { DatonAuth } from "@daton/auth";

import type { AppDb, SessionSnapshot } from "./lib/session";

export type AppBindings = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
    BETTER_AUTH_PASSWORD_HASH_ITERATIONS?: string;
    NEXT_PUBLIC_APP_URL: string;
    NEXT_PUBLIC_API_URL: string;
    CORS_ORIGIN: string;
    COOKIE_DOMAIN?: string;
    SENTRY_DSN?: string;
    SENTRY_AUTH_TOKEN?: string;
    SENTRY_ORG?: string;
    SENTRY_PROJECT?: string;
    SENTRY_ENVIRONMENT?: string;
    SENTRY_RELEASE?: string;
    SENTRY_TRACES_SAMPLE_RATE?: string;
    ALLOW_FICTIONAL_CNPJ?: "true" | "false";
    HYPERDRIVE?: {
      connectionString: string;
    };
  };
  Variables: {
    db: AppDb;
    auth: DatonAuth;
    sessionSnapshot: SessionSnapshot | null;
  };
};
