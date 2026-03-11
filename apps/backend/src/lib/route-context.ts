import type { FastifyReply, FastifyRequest } from "fastify";

import type { AppEnvironment } from "../config/env";
import type { AppDb, SessionContext, SessionSnapshot } from "./session";

type ValidatedInput = {
  param?: unknown;
};

export type AppRouteContext = {
  env: AppEnvironment;
  get(key: "db"): AppDb;
  get(key: "workos"): FastifyRequest["workos"];
  get(key: "workosEnv"): FastifyRequest["workosEnv"];
  get(key: "sessionContext"): SessionContext | null;
  get(key: "sessionSnapshot"): SessionSnapshot | null;
  req: {
    json: () => unknown;
    valid: (target: "param") => unknown;
  };
  json: (payload: unknown, status?: number) => Promise<FastifyReply>;
};

export const createRouteContext = (
  request: FastifyRequest,
  reply: FastifyReply,
  validated: ValidatedInput = {},
): AppRouteContext => {
  function get(key: "db"): AppDb;
  function get(key: "workos"): FastifyRequest["workos"];
  function get(key: "workosEnv"): FastifyRequest["workosEnv"];
  function get(key: "sessionContext"): SessionContext | null;
  function get(key: "sessionSnapshot"): SessionSnapshot | null;
  function get(
    key: "db" | "workos" | "workosEnv" | "sessionContext" | "sessionSnapshot",
  ) {
    switch (key) {
      case "db":
        return request.db;
      case "workos":
        return request.workos;
      case "workosEnv":
        return request.workosEnv;
      case "sessionContext":
        return request.sessionContext;
      case "sessionSnapshot":
        return request.sessionSnapshot;
    }
  }

  return {
    env: request.server.apiEnv,
    get,
    req: {
      json: () => request.body,
      valid: (target) => {
        if (target === "param") {
          if (validated.param == null) {
            throw new Error(
              `Unsupported validation target: param; validated.param is missing and request.params fallback is disabled.`,
            );
          }

          return validated.param;
        }

        throw new Error(`Unsupported validation target: ${target}; supported: param`);
      },
    },
    json: async (payload, status = 200) => reply.code(status).send(payload),
  };
};
