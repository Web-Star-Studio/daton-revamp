import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as authSchema from "./auth-schema";
import * as domainSchema from "./schema";

export const schema = {
  ...authSchema,
  ...domainSchema,
};

export const createNodeDb = (connectionString: string) => {
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
};

export type DatonDb = ReturnType<typeof createNodeDb>;
