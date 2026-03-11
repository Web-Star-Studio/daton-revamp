import { createWorkOsClient } from "@daton/auth";
import { createNodeDbServices } from "@daton/db";

import { toWorkOsManagementEnv, type AppEnvironment } from "../config/env";

let cachedDatabaseUrl: string | null = null;
let cachedWorkosKey: string | null = null;
let cachedServices: ApiServices | null = null;

export type ApiServices = {
  client: ReturnType<typeof createNodeDbServices>["client"];
  db: ReturnType<typeof createNodeDbServices>["db"];
  env: AppEnvironment;
  workos: ReturnType<typeof createWorkOsClient>;
  workosEnv: ReturnType<typeof toWorkOsManagementEnv>;
};

const getWorkosCacheKey = (env: AppEnvironment) =>
  [
    env.WORKOS_API_KEY,
    env.WORKOS_CLIENT_ID,
    env.WORKOS_AUTHKIT_DOMAIN ?? "",
  ].join("::");

export const getApiServices = async (env: AppEnvironment): Promise<ApiServices> => {
  const databaseUrl = env.DATABASE_URL;
  const workosCacheKey = getWorkosCacheKey(env);

  if (!databaseUrl) {
    throw new Error("DATABASE_URL é obrigatório para iniciar a API.");
  }

  if (
    cachedServices &&
    cachedDatabaseUrl === databaseUrl &&
    cachedWorkosKey === workosCacheKey
  ) {
    return cachedServices;
  }

  if (cachedServices) {
    await cachedServices.client.end();
  }

  const { client, db } = createNodeDbServices(databaseUrl);
  const workosEnv = toWorkOsManagementEnv(env);
  const workos = createWorkOsClient(workosEnv);

  cachedDatabaseUrl = databaseUrl;
  cachedWorkosKey = workosCacheKey;
  cachedServices = {
    client,
    db,
    env,
    workos,
    workosEnv,
  };

  return cachedServices;
};
