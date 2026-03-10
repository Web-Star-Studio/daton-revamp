import { createNodeDb } from "../../db/src/index";
import { loadLocalDevelopmentEnv } from "../../db/src/load-local-development-env";

import { createDatonAuth } from "./auth";
import { parseAuthEnv } from "./env";

const env = loadLocalDevelopmentEnv(process.env);
const databaseUrl = env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for Better Auth CLI commands.");
}

const authEnv = parseAuthEnv(env);
const db = createNodeDb(databaseUrl);

export const auth = createDatonAuth(db, authEnv);

export default auth;
