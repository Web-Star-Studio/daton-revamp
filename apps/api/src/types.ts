import type { WorkOsManagementEnv, createWorkOsClient } from "@daton/auth";

import type { AppDb, SessionContext, SessionSnapshot } from "./lib/session";

export type AppBindings = {
  Bindings: {
    DATABASE_URL?: string;
    WORKOS_API_KEY: string;
    WORKOS_CLIENT_ID: string;
    WORKOS_AUTHKIT_DOMAIN?: string;
    NEXT_PUBLIC_APP_URL: string;
    NEXT_PUBLIC_API_URL: string;
    CORS_ORIGIN: string;
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
    workos: ReturnType<typeof createWorkOsClient>;
    workosEnv: WorkOsManagementEnv;
    sessionContext: SessionContext | null;
    sessionSnapshot: SessionSnapshot | null;
  };
};
