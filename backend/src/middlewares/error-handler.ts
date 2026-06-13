import type { NextFunction, Request, Response } from 'express';

import { logger } from '../lib/logger';
import { errorResponse } from '../utils/api-response';

type AppError = Error & {
  statusCode?: number;
  status?: number;
  errorCode?: string;
  details?: unknown;
  type?: string;
};

export function errorHandler(
  error: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error('Unhandled error', error);

  const rawMessage = error.message || '';
  const isMissingSportMigration =
    rawMessage.includes('enum "Sport"') &&
    (rawMessage.includes('MARATON_PROGRAMACION') || rawMessage.includes('CAPTURA_BANDERA'));
  const statusCode = isMissingSportMigration ? 500 : error.statusCode || error.status || 500;
  const isPayloadTooLarge =
    statusCode === 413 || error.type === 'entity.too.large';
  const message =
    isMissingSportMigration
      ? 'La base de datos no tiene aplicada la migracion de las nuevas competencias. Aplica las migraciones de Prisma y reinicia el backend.'
      : isPayloadTooLarge
      ? 'La imagen es demasiado pesada. Intenta con un logo mas liviano.'
      : statusCode >= 500
        ? 'Error interno del servidor'
        : error.message;

  res
    .status(statusCode)
    .json(errorResponse(message, error.errorCode, error.details));
}
