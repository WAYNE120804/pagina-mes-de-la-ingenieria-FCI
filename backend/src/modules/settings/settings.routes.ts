import { Router } from 'express';

import { authMiddleware, permissionMiddleware } from '../../middlewares/auth';
import { validateRequest } from '../../middlewares/validate-request';
import { getSiteSettings, updateSiteSettings } from './settings.controller';
import { updateSiteSettingsSchema } from './settings.schemas';

export const settingsRouter = Router();

settingsRouter.get('/', authMiddleware, permissionMiddleware('events.read'), getSiteSettings);
settingsRouter.patch(
  '/',
  authMiddleware,
  permissionMiddleware('events.write'),
  validateRequest({ body: updateSiteSettingsSchema }),
  updateSiteSettings
);
