import fp from "fastify-plugin";

import apiApp from "../../../api/src/index";
import type { AppEnvironment } from "../../../api/src/types";
import type { FastifyPluginAsync } from "fastify";

import { sendWebResponse, toWebRequest } from "../lib/http";

const apiPlugin: FastifyPluginAsync<{
  apiEnv: AppEnvironment;
}> = async (fastify, options) => {
  fastify.route({
    method: ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"],
    url: "/",
    handler: async (request, reply) => {
      const webRequest = toWebRequest(request);
      const response = await apiApp.fetch(webRequest, options.apiEnv);
      return sendWebResponse(reply, response);
    },
  });

  fastify.route({
    method: ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"],
    url: "/*",
    handler: async (request, reply) => {
      const webRequest = toWebRequest(request);
      const response = await apiApp.fetch(webRequest, options.apiEnv);
      return sendWebResponse(reply, response);
    },
  });
};

export default fp(apiPlugin, {
  name: "legacy-api-plugin",
});
