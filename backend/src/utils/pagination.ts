import type { Request } from 'express';

export type PaginationParams = {
  page: number;
  limit: number;
  skip: number;
  take: number;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function getPaginationParams(req: Request): PaginationParams {
  const page = Number(req.query.page || DEFAULT_PAGE);
  const limit = Number(req.query.limit || DEFAULT_LIMIT);
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : DEFAULT_PAGE;
  const safeLimit =
    Number.isFinite(limit) && limit > 0
      ? Math.min(Math.floor(limit), MAX_LIMIT)
      : DEFAULT_LIMIT;

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

export function buildPaginationMeta(
  total: number,
  pagination: Pick<PaginationParams, 'page' | 'limit'>
): PaginationMeta {
  const totalPages = Math.max(Math.ceil(total / pagination.limit), 1);

  return {
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages,
    hasNextPage: pagination.page < totalPages,
    hasPreviousPage: pagination.page > 1,
  };
}
