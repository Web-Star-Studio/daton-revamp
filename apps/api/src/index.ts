import * as Sentry from "@sentry/node";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { createWorkOsClient } from "@daton/auth";
import { createNodeDbServices } from "@daton/db";

import { parseServerEnv } from "./env";
import { setRequestSentryContext } from "./lib/sentry";
import { withSession } from "./middleware/auth";
import { bootstrapRoutes } from "./routes/bootstrap";
import { branchRoutes } from "./routes/branches";
import { organizationRoutes } from "./routes/organization";
import type { AppBindings } from "./types";

const app = new Hono<AppBindings>();
let cachedDatabaseUrl: string | null = null;
let cachedServices: {
  client: ReturnType<typeof createNodeDbServices>["client"];
  db: ReturnType<typeof createNodeDbServices>["db"];
  workos: ReturnType<typeof createWorkOsClient>;
  env: ReturnType<typeof parseServerEnv>;
} | null = null;

const readServerEnv = (bindings: AppBindings["Bindings"]) =>
  parseServerEnv({
    DATABASE_URL: bindings.DATABASE_URL,
    WORKOS_API_KEY: bindings.WORKOS_API_KEY,
    WORKOS_CLIENT_ID: bindings.WORKOS_CLIENT_ID,
    WORKOS_AUTHKIT_DOMAIN: bindings.WORKOS_AUTHKIT_DOMAIN,
    NEXT_PUBLIC_APP_URL: bindings.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_URL: bindings.NEXT_PUBLIC_API_URL,
    CORS_ORIGIN: bindings.CORS_ORIGIN,
    SENTRY_DSN: bindings.SENTRY_DSN,
    SENTRY_AUTH_TOKEN: bindings.SENTRY_AUTH_TOKEN,
    SENTRY_ORG: bindings.SENTRY_ORG,
    SENTRY_PROJECT: bindings.SENTRY_PROJECT,
    SENTRY_ENVIRONMENT: bindings.SENTRY_ENVIRONMENT,
    SENTRY_RELEASE: bindings.SENTRY_RELEASE,
    SENTRY_TRACES_SAMPLE_RATE: bindings.SENTRY_TRACES_SAMPLE_RATE,
    ALLOW_FICTIONAL_CNPJ: bindings.ALLOW_FICTIONAL_CNPJ,
  });

const getServices = (bindings: AppBindings["Bindings"]) => {
  const env = readServerEnv(bindings);
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL é obrigatório para iniciar a API.");
  }

  if (cachedServices && cachedDatabaseUrl === databaseUrl) {
    return cachedServices;
  }

  const { client, db } = createNodeDbServices(databaseUrl);
  const workos = createWorkOsClient(env.workos);

  cachedDatabaseUrl = databaseUrl;
  cachedServices = {
    client,
    db,
    env,
    workos,
  };

  return cachedServices;
};

app.use("/api/*", async (c, next) => {
  setRequestSentryContext({
    method: c.req.method,
    path: c.req.path,
  });

  const services = getServices(c.env);

  c.set("db", services.db);
  c.set("workos", services.workos);
  c.set("workosEnv", services.env.workos);

  await next();

  setRequestSentryContext({
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
  });
});

app.use("/api/v1/*", withSession);

app.get("/", (c) =>
  c.json({
    name: "Daton API",
    status: "ok",
  }),
);

app.get("/api/v1/session", async (c) => {
  const snapshot = c.get("sessionSnapshot");

  if (!snapshot) {
    throw new HTTPException(401, {
      message: "Autenticação obrigatória.",
    });
  }

  return c.json(snapshot);
});

app.route("/api/v1", bootstrapRoutes);
app.route("/api/v1", branchRoutes);
app.route("/api/v1", organizationRoutes);

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    if (error.status >= 500) {
      Sentry.captureException(error);
    }

    return c.json(
      {
        message: error.message,
      },
      error.status,
    );
  }

  console.error(error);
  Sentry.captureException(error);

  return c.json(
    {
      message: "Erro interno do servidor.",
    },
    500,
  );
});

export default app;
