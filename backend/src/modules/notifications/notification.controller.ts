import type { NextFunction, Response } from 'express';

import type { AuthenticatedRequest } from '../../middlewares/auth';
import { successResponse } from '../../utils/api-response';
import * as notificationService from './notification.service';

export async function listNotifications(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const notifications = await notificationService.listNotifications(Number(req.query.limit || 50));

    res.json(successResponse('Notificaciones consultadas', notifications));
  } catch (error) {
    next(error);
  }
}

export async function sendNotification(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const notification = await notificationService.sendNotification(req.body, req.user?.id);

    res.status(201).json(successResponse('Notificacion enviada', notification));
  } catch (error) {
    next(error);
  }
}

export async function sendListEmail(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const notification = await notificationService.sendListEmail(req.body, req.user?.id);

    res.status(201).json(successResponse('Lista enviada por correo', notification));
  } catch (error) {
    next(error);
  }
}
