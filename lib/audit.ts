import { prisma } from "./prisma";

export interface WriteAuditParams {
  userId?:     string | null;
  action:      string;
  entityType:  string;
  entityId:    string;
  roomId?:     string | null;
  oldValues?:  Record<string, unknown> | null;
  newValues?:  Record<string, unknown> | null;
  ipAddress?:  string | null;
}

/**
 * Persist an audit log record.
 *
 * This function is fire-and-forget: it catches its own errors and logs them
 * via console.error so that a write failure never causes a primary operation
 * to roll back or return an error response.
 */
export async function writeAudit(params: WriteAuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId:     params.userId     ?? null,
        action:     params.action,
        entityType: params.entityType,
        entityId:   params.entityId,
        roomId:     params.roomId     ?? null,
        oldValues:  params.oldValues  ?? undefined,
        newValues:  params.newValues  ?? undefined,
        ipAddress:  params.ipAddress  ?? null,
      },
    });
  } catch (e) {
    console.error("[AuditLog] Failed to write audit record:", e);
  }
}
