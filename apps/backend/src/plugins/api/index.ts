import { getApiServices } from "../../lib/services";
import { resolveSessionContext, type SessionSnapshot } from "../../lib/session";
import { setSessionSentryContext } from "../../lib/sentry";
import type { FastifyPluginAsync } from "fastify";

import branchesPlugin from "./branches";
import bootstrapPlugin from "./bootstrap";
import organizationPlugin from "./organization";
import sessionPlugin from "./session";

const apiPlugin: FastifyPluginAsync = async (fastify) => {
  const prefix = "/api/v1";

  fastify.decorateRequest(
    "clerk",
    null as unknown as import("@clerk/backend").ClerkClient,
  );
  fastify.decorateRequest("db", null as unknown as import("../../lib/session").AppDb);
  fastify.decorateRequest("sessionContext", null);
  fastify.decorateRequest("sessionSnapshot", null);

  fastify.addHook("preHandler", async (request) => {
    const services = await getApiServices(fastify.apiEnv);
    const authorizationHeader = request.headers.authorization;
    const sessionContext = await resolveSessionContext(
      services.db,
      services.clerk,
      fastify.apiEnv.CLERK_SECRET_KEY,
      typeof authorizationHeader === "string" ? authorizationHeader : null,
    );
    const snapshot = sessionContext?.snapshot ?? null;

    request.clerk = services.clerk;
    request.db = services.db;
    request.sessionContext = sessionContext;
    request.sessionSnapshot = snapshot;
    setSessionSentryContext(snapshot as SessionSnapshot | null);
  });

  fastify.register(sessionPlugin, { prefix });
  fastify.register(bootstrapPlugin, { prefix });
  fastify.register(branchesPlugin, { prefix });
  fastify.register(organizationPlugin, { prefix });
};

export default apiPlugin;
