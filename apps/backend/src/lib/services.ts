import { createWorkOsClient } from "@daton/auth";
import { createNodeDbServices } from "@daton/db";

import { toWorkOsManagementEnv, type AppEnvironment } from "../config/env";

let cachedDatabaseUrl: string | null = null;
let cachedServices: ApiServices | null = null;

export type ApiServices = {
  client: ReturnType<typeof createNodeDbServices>["client"];
  db: ReturnType<typeof createNodeDbServices>["db"];
  env: AppEnvironment;
  workos: ReturnType<typeof createWorkOsClient>;
  workosEnv: ReturnType<typeof toWorkOsManagementEnv>;
};

export const getApiServices = (env: AppEnvironment): ApiServices => {
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL é obrigatório para iniciar a API.");
  }

  if (cachedServices && cachedDatabaseUrl === databaseUrl) {
    return cachedServices;
  }

  const { client, db } = createNodeDbServices(databaseUrl);
  const workosEnv = toWorkOsManagementEnv(env);
  const workos = createWorkOsClient(workosEnv);

  cachedDatabaseUrl = databaseUrl;
  cachedServices = {
    client,
    db,
    env,
    workos,
    workosEnv,
  };

  return cachedServices;
};
