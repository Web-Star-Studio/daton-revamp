import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { Role } from "@daton/contracts";

import { resolveSessionContext } from "../lib/session";
import { setSessionSentryContext } from "../lib/sentry";
import type { AppBindings } from "../types";

export const withSession = createMiddleware<AppBindings>(async (c, next) => {
  const sessionContext = await resolveSessionContext(
    c.get("db"),
    c.get("workosEnv"),
    c.req.raw.headers.get("authorization"),
  );
  const snapshot = sessionContext?.snapshot ?? null;

  c.set("sessionContext", sessionContext);
  c.set("sessionSnapshot", snapshot);
  setSessionSentryContext(snapshot);
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

    const allowed = snapshot.effectiveRoles.some((role) =>
      roles.includes(role),
    );

    if (!allowed) {
      throw new HTTPException(403, {
        message: "Você não tem acesso a esta ação.",
      });
    }

    await next();
  });
