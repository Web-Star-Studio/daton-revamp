import fp from "fastify-plugin";

import type { FastifyPluginAsync } from "fastify";

const rootPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.get("/", async () => ({
    name: "Daton API",
    status: "ok",
  }));
};

export default fp(rootPlugin, {
  name: "root-plugin",
});
