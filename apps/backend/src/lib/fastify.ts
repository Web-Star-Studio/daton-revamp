import "fastify";
import type { ClerkClient } from "@clerk/backend";

import type { AppEnvironment } from "../config/env";
import type { AppDb, SessionContext, SessionSnapshot } from "./session";

declare module "fastify" {
  interface FastifyInstance {
    apiEnv: AppEnvironment;
  }

  interface FastifyRequest {
    clerk: ClerkClient;
    db: AppDb;
    sessionContext: SessionContext | null;
    sessionSnapshot: SessionSnapshot | null;
  }
}

export {};
