import cors from 'cors';
import express from 'express';

import { errorHandler } from './middlewares/error-handler';
import { notFoundHandler } from './middlewares/not-found-handler';
import { serializeResponse } from './middlewares/serialize-response';
import { apiRouter } from './routes';
import { successResponse } from './utils/api-response';
import { requestContextMiddleware } from './utils/request-context';

export function createApp() {
  const app = express();

  app.set('trust proxy', true);
  app.use(cors());
  app.use(requestContextMiddleware);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(serializeResponse);

  app.get('/', (_req, res) => {
    res.json(successResponse('API operativa', {
      name: 'Semana de Ingenieria API',
      status: 'ok',
      phase: 'fase-3d-public-academic-forms',
    }));
  });

  app.use('/api', apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
