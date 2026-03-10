import { defineConfig } from "drizzle-kit";

import { loadLocalDevelopmentEnv } from "./src/load-local-development-env";

const env = loadLocalDevelopmentEnv();
const databaseUrl = env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run drizzle-kit.");
}

export default defineConfig({
  out: "./drizzle",
  schema: ["./src/schema.ts", "./src/auth-schema.ts"],
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
