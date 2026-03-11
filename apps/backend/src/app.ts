import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import * as Sentry from "@sentry/node";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

import {
  createApiSentryOptions,
  setRequestSentryContext,
} from "../../api/src/lib/sentry";
import type { AppEnvironment } from "../../api/src/types";
import { parseRuntimeEnv, toApiEnvironment } from "./config/env";
import healthPlugin from "./plugins/health";
import legacyApiPlugin from "./plugins/legacy-api";

const expandAllowedOrigins = (values: string[]) => {
  const origins = new Set<string>();

  values.forEach((value) => {
    origins.add(value);

    try {
      const url = new URL(value);

      if (url.hostname === "127.0.0.1") {
        const localhostUrl = new URL(value);
        localhostUrl.hostname = "localhost";
        origins.add(localhostUrl.toString());
      }

      if (url.hostname === "localhost") {
        const loopbackUrl = new URL(value);
        loopbackUrl.hostname = "127.0.0.1";
        origins.add(loopbackUrl.toString());
      }
    } catch {
      // Ignore malformed URLs so startup validation remains centralized in zod.
    }
  });

  return Array.from(origins);
};

export const buildApp = () => {
  const env = parseRuntimeEnv();
  const apiEnv: AppEnvironment = toApiEnvironment(env);

  Sentry.init(createApiSentryOptions(apiEnv));

  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
    trustProxy: true,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.addHook("onRequest", async (request) => {
    setRequestSentryContext({
      method: request.method,
      path: request.url,
    });
  });

  app.addHook("onResponse", async (request, reply) => {
    setRequestSentryContext({
      method: request.method,
      path: request.url,
      status: reply.statusCode,
    });
  });

  app.setErrorHandler((error, _request, reply) => {
    Sentry.captureException(error);
    app.log.error(error);

    if (reply.sent) {
      return;
    }

    reply.status(500).send({
      message: "Erro interno do servidor.",
    });
  });

  const allowedOrigins = expandAllowedOrigins([
    env.CORS_ORIGIN,
    env.NEXT_PUBLIC_APP_URL,
  ]);

  app.register(cookie);
  app.register(helmet);
  app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS", "HEAD"],
  });
  app.register(healthPlugin, {
    databaseUrl: env.DATABASE_URL,
  });
  app.register(legacyApiPlugin, {
    apiEnv,
  });

  return {
    app,
    env,
  };
};
