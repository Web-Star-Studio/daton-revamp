import * as Sentry from "@sentry/cloudflare";
import { cors } from "hono/cors";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { createWorkOsClient, expandLocalOriginAliases } from "@daton/auth";
import { createNodeDbServices } from "@daton/db";

import { parseServerEnv } from "./env";
import { createApiSentryOptions, setRequestSentryContext } from "./lib/sentry";
import { withSession } from "./middleware/auth";
import { bootstrapRoutes } from "./routes/bootstrap";
import { branchRoutes } from "./routes/branches";
import { organizationRoutes } from "./routes/organization";
import type { AppBindings } from "./types";

const app = new Hono<AppBindings>();

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
  const databaseUrl = bindings.HYPERDRIVE?.connectionString ?? env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL ou binding HYPERDRIVE é obrigatório para iniciar a API.",
    );
  }

  const { client, db } = createNodeDbServices(databaseUrl);
  const workos = createWorkOsClient(env.workos);

  return {
    client,
    db,
    env,
    workos,
  };
};

app.use("/api/*", async (c, next) => {
  setRequestSentryContext({
    method: c.req.method,
    path: c.req.path,
  });

  const env = readServerEnv(c.env);

  return cors({
    origin: expandLocalOriginAliases([
      env.CORS_ORIGIN,
      env.NEXT_PUBLIC_APP_URL,
    ]),
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
    credentials: true,
    exposeHeaders: ["set-cookie"],
  })(c, next);
});

app.use("/api/*", async (c, next) => {
  const services = getServices(c.env);

  c.set("db", services.db);
  c.set("workos", services.workos);
  c.set("workosEnv", services.env.workos);

  try {
    await next();
  } finally {
    await services.client.end({ timeout: 0 });
  }

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

const sentryHandler = app as unknown as ExportedHandler<AppBindings["Bindings"]>;

export default Sentry.withSentry(
  (env: AppBindings["Bindings"]) => createApiSentryOptions(env),
  sentryHandler,
);
