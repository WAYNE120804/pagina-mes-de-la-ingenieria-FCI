import type { NextFunction, Response } from 'express';

import type { AuthenticatedRequest } from '../../middlewares/auth';
import { successResponse } from '../../utils/api-response';
import { getPaginationParams } from '../../utils/pagination';
import * as auditService from './audit.service';

export async function listAuditLogs(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const pagination = getPaginationParams(req);
    const result = await auditService.listAuditLogs(req.query, pagination);

    res.json(successResponse('Registros de auditoria consultados', result.logs, result.meta));
  } catch (error) {
    next(error);
  }
}
