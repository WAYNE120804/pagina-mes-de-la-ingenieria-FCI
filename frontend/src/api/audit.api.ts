import client from './client';
import { endpoints } from './endpoints';

export type AuditLogRow = {
  id: string;
  actor: {
    id: string;
    name: string;
    email: string;
  } | null;
  action: string;
  entity: string;
  entityId: string | null;
  oldValues: unknown;
  newValues: unknown;
  summary: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type AuditMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  byAction: Array<{ action: string; count: number }>;
  byEntity: Array<{ entity: string; count: number }>;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: AuditMeta;
};

export async function listAuditLogsRequest(filters?: {
  search?: string;
  action?: string;
  entity?: string;
  limit?: number;
  page?: number;
}) {
  const response = await client.get<ApiResponse<AuditLogRow[]>>(endpoints.audit.list(), {
    params: filters,
  });

  return {
    logs: response.data.data,
    meta: response.data.meta,
  };
}
