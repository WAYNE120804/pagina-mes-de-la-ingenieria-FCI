import type { NextFunction, Response } from 'express';

import type { AuthenticatedRequest } from '../../middlewares/auth';
import { successResponse } from '../../utils/api-response';
import * as settingsService from './settings.service';

export async function getSiteSettings(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const settings = await settingsService.getSiteSettings();

    res.json(successResponse('Configuracion publica consultada', settings));
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

    res.json(successResponse('Configuracion publica actualizada', settings));
  } catch (error) {
    next(error);
  }
}
