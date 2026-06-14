import express from 'express';

import { errorHandler } from './middlewares/error-handler';
import { notFoundHandler } from './middlewares/not-found-handler';
import { serializeResponse } from './middlewares/serialize-response';
import {
  corsMiddleware,
  globalRateLimiter,
  permissionsPolicy,
  securityHeaders,
} from './middlewares/security';
import { apiRouter } from './routes';
import { successResponse } from './utils/api-response';
import { requestContextMiddleware } from './utils/request-context';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(securityHeaders);
  app.use(permissionsPolicy);
  app.use(corsMiddleware);
  app.use(globalRateLimiter);
  app.use(requestContextMiddleware);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(serializeResponse);

  app.get('/', (_req, res) => {
    res.json(successResponse('API operativa', {
      name: 'Semana de Ingeniería API',
      status: 'ok',
      phase: 'fase-3d-public-academic-forms',
    }));
  });

  app.use('/api', apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
