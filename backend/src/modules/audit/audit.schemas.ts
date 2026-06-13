import { AuditAction } from '../../lib/prisma-client';
import { z } from 'zod';

export const listAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  action: z.nativeEnum(AuditAction).optional(),
  entity: z.string().trim().optional(),
  actorId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
