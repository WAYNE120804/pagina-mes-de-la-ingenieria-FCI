import { Router } from 'express';

import { authMiddleware, permissionMiddleware } from '../../middlewares/auth';
import { validateRequest } from '../../middlewares/validate-request';
import { listNotifications, sendListEmail, sendNotification } from './notification.controller';
import { listNotificationsQuerySchema, sendListEmailSchema, sendNotificationSchema } from './notification.schemas';

export const notificationRouter = Router();

notificationRouter.use(authMiddleware);

notificationRouter.get(
  '/',
  permissionMiddleware('events.read'),
  validateRequest({ query: listNotificationsQuerySchema }),
  listNotifications
);

notificationRouter.post(
  '/',
  permissionMiddleware('events.write'),
  validateRequest({ body: sendNotificationSchema }),
  sendNotification
);

notificationRouter.post(
  '/send-list',
  permissionMiddleware('events.write'),
  validateRequest({ body: sendListEmailSchema }),
  sendListEmail
);
