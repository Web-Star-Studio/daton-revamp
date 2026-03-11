import { requireSession } from "../../lib/auth";
import type { FastifyPluginAsync } from "fastify";

const sessionPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.get("/session", { preHandler: requireSession }, async (request) => request.sessionSnapshot);
};

export default sessionPlugin;
