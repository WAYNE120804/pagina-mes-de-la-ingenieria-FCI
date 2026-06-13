import { AppError } from '../../lib/app-error';
import { Prisma } from '../../lib/prisma-client';
import { getPrisma } from '../../lib/prisma';
import { buildPaginationMeta, type PaginationParams } from '../../utils/pagination';
import type { ListAuditLogsQuery } from './audit.schemas';

const auditLogInclude = {
  actor: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.AuditLogInclude;

function requirePrisma() {
  const prisma = getPrisma();

  if (!prisma) {
    throw new AppError('Base de datos no configurada', 500, 'DATABASE_NOT_CONFIGURED');
  }

  return prisma;
}

function normalizeJson(value: Prisma.JsonValue | null) {
  return value === null ? null : value;
}

function summarizeValues(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const entries = Object.entries(value)
    .filter(([, entryValue]) => entryValue !== undefined && entryValue !== null)
    .slice(0, 6);

  if (!entries.length) {
    return null;
  }

  return entries
    .map(([key, entryValue]) => {
      if (typeof entryValue === 'object') {
        return `${key}: actualizado`;
      }

      return `${key}: ${String(entryValue)}`;
    })
    .join(' | ');
}

function sanitizeAuditLog(log: Prisma.AuditLogGetPayload<{ include: typeof auditLogInclude }>) {
  return {
    id: log.id,
    actor: log.actor
      ? {
          id: log.actor.id,
          name: log.actor.name,
          email: log.actor.email,
        }
      : null,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    oldValues: normalizeJson(log.oldValues),
    newValues: normalizeJson(log.newValues),
    summary: summarizeValues(log.newValues) || summarizeValues(log.oldValues),
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt,
  };
}

export async function listAuditLogs(query: ListAuditLogsQuery, pagination: PaginationParams) {
  const prisma = requirePrisma();
  const where: Prisma.AuditLogWhereInput = {
    action: query.action,
    entity: query.entity,
    actorId: query.actorId,
    OR: query.search
      ? [
          { entity: { contains: query.search, mode: 'insensitive' } },
          { actor: { name: { contains: query.search, mode: 'insensitive' } } },
          { actor: { email: { contains: query.search, mode: 'insensitive' } } },
        ]
      : undefined,
  };

  const [total, logs, groupedByAction, groupedByEntity] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: auditLogInclude,
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.auditLog.groupBy({
      by: ['action'],
      _count: { _all: true },
    }),
    prisma.auditLog.groupBy({
      by: ['entity'],
      _count: { _all: true },
    }),
  ]);

  return {
    logs: logs.map(sanitizeAuditLog),
    meta: {
      ...buildPaginationMeta(total, pagination),
      byAction: groupedByAction.map((item) => ({
        action: item.action,
        count: item._count._all,
      })),
      byEntity: groupedByEntity.map((item) => ({
        entity: item.entity,
        count: item._count._all,
      })),
    },
  };
}
