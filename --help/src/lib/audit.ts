import { auditEvents } from "@daton/db";
import type { AuditAction } from "@daton/contracts";

import type { AppDbExecutor } from "./session";

type AuditEventInput = {
  action: AuditAction;
  entityType: string;
  entityId: string;
  organizationId?: string | null;
  actorUserId?: string | null;
  actorMemberId?: string | null;
  metadata?: Record<string, unknown>;
};

export const recordAuditEvent = async (db: AppDbExecutor, input: AuditEventInput) => {
  await db.insert(auditEvents).values({
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    organizationId: input.organizationId ?? null,
    actorUserId: input.actorUserId ?? null,
    actorMemberId: input.actorMemberId ?? null,
    metadata: input.metadata ?? {},
  });
};
