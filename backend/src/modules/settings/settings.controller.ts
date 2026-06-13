import type { NextFunction, Response } from 'express';

import type { AuthenticatedRequest } from '../../middlewares/auth';
import { successResponse } from '../../utils/api-response';
import * as settingsService from './settings.service';

export async function getSiteSettings(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const settings = await settingsService.getSiteSettings();
    const isAdminRequest = Boolean(req.user);

    res.json(successResponse('Configuracion publica consultada', settingsService.sanitizeSiteSettings(settings, isAdminRequest)));
  } catch (error) {
    next(error);
  }
}

export async function updateSiteSettings(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const settings = await settingsService.updateSiteSettings(req.body, req.user?.id);

    res.json(successResponse('Configuracion publica actualizada', settingsService.sanitizeSiteSettings(settings, true)));
  } catch (error) {
    next(error);
  }
}
