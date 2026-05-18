import type { NextFunction, Request, Response } from 'express';

import { getPrisma } from '../../lib/prisma';
import { successResponse } from '../../utils/api-response';

export async function getHealth(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const prisma = getPrisma();
    let databaseStatus = 'not-configured';
    let databaseLatencyMs: number | null = null;

    if (prisma) {
      const startedAt = Date.now();

      await prisma.$queryRaw`SELECT 1`;

      databaseLatencyMs = Date.now() - startedAt;
      databaseStatus = 'ok';
    }

    res.json(successResponse('Servicio disponible', {
      status: 'ok',
      timestamp: new Date().toISOString(),
      phase: 'fase-3d-public-academic-forms',
      checks: {
        api: 'ok',
        database: databaseStatus,
        databaseLatencyMs,
      },
    }));
  } catch (error) {
    next(error);
  }
}
