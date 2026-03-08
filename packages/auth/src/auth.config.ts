import { createNodeDb } from "../../db/src/index";

import { createDatonAuth } from "./auth";
import { parseAuthEnv } from "./env";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for Better Auth CLI commands.");
}

const env = parseAuthEnv(process.env);
const db = createNodeDb(databaseUrl);

export const auth = createDatonAuth(db, env);

export default auth;
