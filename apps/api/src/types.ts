import type { DatonAuth } from "@daton/auth";

import type { AppDb, SessionSnapshot } from "./lib/session";

export type AppBindings = {
  Bindings: {
    DATABASE_URL: string;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
    NEXT_PUBLIC_APP_URL: string;
    NEXT_PUBLIC_API_URL: string;
    CORS_ORIGIN: string;
    COOKIE_DOMAIN?: string;
  };
  Variables: {
    db: AppDb;
    auth: DatonAuth;
    sessionSnapshot: SessionSnapshot | null;
  };
};
