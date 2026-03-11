import fp from "fastify-plugin";
import { sql } from "drizzle-orm";
import { createNodeDbServices } from "@daton/db";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

import type { FastifyPluginAsync } from "fastify";

const liveResponseSchema = z.object({
  status: z.literal("ok"),
});

const readyResponseSchema = z.object({
  status: z.literal("ok"),
  checks: z.object({
    database: z.literal("ok"),
  }),
});

const healthPlugin: FastifyPluginAsync<{
  databaseUrl: string;
}> = async (fastify, options) => {
  const typed = fastify.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/health/live",
    {
      schema: {
        response: {
          200: liveResponseSchema,
        },
      },
    },
    async () => ({
      status: "ok" as const,
    }),
  );

  typed.get(
    "/health/ready",
    {
      schema: {
        response: {
          200: readyResponseSchema,
        },
      },
    },
    async () => {
      const { client, db } = createNodeDbServices(options.databaseUrl);

      try {
        await db.execute(sql`select 1`);
      } finally {
        await client.end({ timeout: 0 });
      }

      return {
        status: "ok" as const,
        checks: {
          database: "ok" as const,
        },
      };
    },
  );
};

export default fp(healthPlugin, {
  name: "health-plugin",
});
