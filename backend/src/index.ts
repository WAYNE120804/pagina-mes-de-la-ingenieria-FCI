import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';

async function start() {
  const app = createApp();

  app.listen(env.port, () => {
    logger.info(`Servidor backend escuchando en http://localhost:${env.port}`);
  });
}

start().catch((error) => {
  logger.error('No fue posible iniciar el backend.', error);
  process.exit(1);
});
