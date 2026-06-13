import { Router } from 'express';

import { authMiddleware, permissionMiddleware } from '../../middlewares/auth';
import { validateRequest } from '../../middlewares/validate-request';
import { listAuditLogs } from './audit.controller';
import { listAuditLogsQuerySchema } from './audit.schemas';

export const auditRouter = Router();

auditRouter.use(authMiddleware);

auditRouter.get(
  '/',
  permissionMiddleware('audit.read'),
  validateRequest({ query: listAuditLogsQuerySchema }),
  listAuditLogs
);
