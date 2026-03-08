import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { Role } from "@daton/contracts";

import { getSessionSnapshot } from "../lib/session";
import type { AppBindings } from "../types";

export const withSession = createMiddleware<AppBindings>(async (c, next) => {
  const snapshot = await getSessionSnapshot(c.get("db"), c.get("auth"), c.req.raw.headers);
  c.set("sessionSnapshot", snapshot);
  await next();
});

export const requireSession = createMiddleware<AppBindings>(async (c, next) => {
  const snapshot = c.get("sessionSnapshot");

  if (!snapshot?.member || !snapshot.organization) {
    throw new HTTPException(401, {
      message: "Autenticação obrigatória.",
    });
  }

  await next();
});

export const requireRoles = (...roles: Role[]) =>
  createMiddleware<AppBindings>(async (c, next) => {
    const snapshot = c.get("sessionSnapshot");

    if (!snapshot?.member || !snapshot.organization) {
      throw new HTTPException(401, {
        message: "Autenticação obrigatória.",
      });
    }

    const allowed = snapshot.effectiveRoles.some((role) => roles.includes(role));

    if (!allowed) {
      throw new HTTPException(403, {
        message: "Você não tem acesso a esta ação.",
      });
    }

    await next();
  });
