import type { AuditAction, Prisma, PrismaClient } from '../lib/prisma-client';

type CreateAuditLogInput = {
  prisma: PrismaClient;
  actorId?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  oldValues?: Prisma.InputJsonValue;
  newValues?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function createAuditLog({
  prisma,
  actorId,
  action,
  entity,
  entityId,
  oldValues,
  newValues,
  ipAddress,
  userAgent,
}: CreateAuditLogInput) {
  return prisma.auditLog.create({
    data: {
      actorId: actorId || null,
      action,
      entity,
      entityId: entityId || null,
      oldValues: oldValues === undefined ? undefined : oldValues,
      newValues: newValues === undefined ? undefined : newValues,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    },
  });
}
