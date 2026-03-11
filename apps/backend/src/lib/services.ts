import { createClerkClient, type ClerkClient } from "@clerk/backend";
import { createNodeDbServices } from "@daton/db";

import type { AppEnvironment } from "../config/env";

let cachedDatabaseUrl: string | null = null;
let cachedClerkSecretKey: string | null = null;
let cachedServices: ApiServices | null = null;

export type ApiServices = {
  client: ReturnType<typeof createNodeDbServices>["client"];
  db: ReturnType<typeof createNodeDbServices>["db"];
  clerk: ClerkClient;
  env: AppEnvironment;
};

export const getApiServices = async (env: AppEnvironment): Promise<ApiServices> => {
  const databaseUrl = env.DATABASE_URL;
  const clerkSecretKey = env.CLERK_SECRET_KEY;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL é obrigatório para iniciar a API.");
  }

  if (
    cachedServices &&
    cachedDatabaseUrl === databaseUrl &&
    cachedClerkSecretKey === clerkSecretKey
  ) {
    return cachedServices;
  }

  if (cachedServices) {
    await cachedServices.client.end();
  }

  const { client, db } = createNodeDbServices(databaseUrl);
  const clerk = createClerkClient({
    secretKey: clerkSecretKey,
  });

  cachedDatabaseUrl = databaseUrl;
  cachedClerkSecretKey = clerkSecretKey;
  cachedServices = {
    client,
    clerk,
    db,
    env,
  };

  return cachedServices;
};
