import type { AuditAction, Prisma, PrismaClient } from '../lib/prisma-client';
import { getRequestContext } from './request-context';

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
  const context = getRequestContext();

  return prisma.auditLog.create({
    data: {
      actorId: actorId || null,
      action,
      entity,
      entityId: entityId || null,
      oldValues: oldValues === undefined ? undefined : oldValues,
      newValues: newValues === undefined ? undefined : newValues,
      ipAddress: ipAddress || context.ipAddress || null,
      userAgent: userAgent || context.userAgent || null,
    },
  });
}
