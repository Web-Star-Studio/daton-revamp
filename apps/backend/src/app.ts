import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import * as Sentry from "@sentry/node";
import { ZodError } from "zod";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

import "./lib/fastify";

import {
  createApiSentryOptions,
  setRequestSentryContext,
} from "./lib/sentry";
import { AppHttpError } from "./lib/errors";
import { parseRuntimeEnv, toApiEnvironment } from "./config/env";
import healthPlugin from "./plugins/health";
import apiPlugin from "./plugins/api";
import rootPlugin from "./plugins/root";

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
  const apiEnv = toApiEnvironment(env);

  Sentry.init(createApiSentryOptions(apiEnv));

  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
    trustProxy: true,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorate("apiEnv", apiEnv);

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
    if (reply.sent) {
      return;
    }

    if (error instanceof AppHttpError) {
      if (error.status >= 500) {
        Sentry.captureException(error);
      }

      reply.status(error.status).send({
        message: error.message,
      });
      return;
    }

    if (error instanceof ZodError) {
      reply.status(400).send({
        message: error.issues[0]?.message ?? "Dados inválidos.",
      });
      return;
    }

    Sentry.captureException(error);
    app.log.error(error);

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
  app.register(rootPlugin);
  app.register(apiPlugin);

  return {
    app,
    env,
  };
};
