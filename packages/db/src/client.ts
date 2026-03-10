import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as authSchema from "./auth-schema";
import * as domainSchema from "./schema";

export const schema = {
  ...authSchema,
  ...domainSchema,
};

export const createNodeDbServices = (connectionString: string) => {
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client, { schema });

  return {
    client,
    db,
  };
};

export const createNodeDb = (connectionString: string) => createNodeDbServices(connectionString).db;

export type DatonDb = ReturnType<typeof createNodeDb>;
