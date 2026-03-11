import type { Role } from "@daton/contracts";
import type { preHandlerHookHandler } from "fastify";

import { AppHttpError } from "./errors";

export const requireSession: preHandlerHookHandler = async (request) => {
  if (!request.sessionSnapshot?.member || !request.sessionSnapshot.organization) {
    throw new AppHttpError(401, "Autenticação obrigatória.");
  }
};

export const requireRoles = (...roles: Role[]): preHandlerHookHandler => {
  return async (request) => {
    const snapshot = request.sessionSnapshot;

    if (!snapshot?.member || !snapshot.organization) {
      throw new AppHttpError(401, "Autenticação obrigatória.");
    }

    const allowed = snapshot.effectiveRoles.some((role) => roles.includes(role));

    if (!allowed) {
      throw new AppHttpError(403, "Você não tem acesso a esta ação.");
    }
  };
};
