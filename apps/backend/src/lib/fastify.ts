import "fastify";
import type { WorkOsManagementEnv, createWorkOsClient } from "@daton/auth";

import type { AppEnvironment } from "../config/env";
import type { AppDb, SessionContext, SessionSnapshot } from "./session";

declare module "fastify" {
  interface FastifyInstance {
    apiEnv: AppEnvironment;
  }

  interface FastifyRequest {
    db: AppDb;
    workos: ReturnType<typeof createWorkOsClient>;
    workosEnv: WorkOsManagementEnv;
    sessionContext: SessionContext | null;
    sessionSnapshot: SessionSnapshot | null;
  }
}

export {};
