import { cors } from "hono/cors";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { createDatonAuth, expandLocalOriginAliases } from "@daton/auth";
import { createNodeDb } from "@daton/db";

import { parseServerEnv } from "./env";
import { getSessionSnapshot } from "./lib/session";
import { withSession } from "./middleware/auth";
import { bootstrapRoutes } from "./routes/bootstrap";
import { branchRoutes } from "./routes/branches";
import type { AppBindings } from "./types";

const app = new Hono<AppBindings>();

app.use("/api/*", async (c, next) => {
  const env = parseServerEnv(c.env);

  return cors({
    origin: expandLocalOriginAliases([env.CORS_ORIGIN, env.NEXT_PUBLIC_APP_URL]),
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
    credentials: true,
    exposeHeaders: ["set-cookie"],
  })(c, next);
});

app.use("/api/*", async (c, next) => {
  const env = parseServerEnv(c.env);

  c.set("db", createNodeDb(env.DATABASE_URL));
  c.set("auth", createDatonAuth(c.get("db"), env.auth));

  await next();
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

app.on(["GET", "POST"], "/api/auth/*", async (c) => {
  const response = await c.get("auth").handler(c.req.raw);
  return response;
});

app.route("/api/v1", bootstrapRoutes);
app.route("/api/v1", branchRoutes);

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return c.json(
      {
        message: error.message,
      },
      error.status,
    );
  }

  console.error(error);

  return c.json(
    {
      message: "Erro interno do servidor.",
    },
    500,
  );
});

export default app;
