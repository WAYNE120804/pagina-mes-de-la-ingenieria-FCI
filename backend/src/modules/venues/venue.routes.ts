import { Router } from 'express';

import { authMiddleware, permissionMiddleware } from '../../middlewares/auth';
import { validateRequest } from '../../middlewares/validate-request';
import { createVenue, deleteVenue, getVenue, listVenues, updateVenue } from './venue.controller';
import {
  createVenueSchema,
  listVenuesQuerySchema,
  updateVenueSchema,
  venueIdParamsSchema,
} from './venue.schemas';

export const venueRouter = Router();

venueRouter.use(authMiddleware);

venueRouter.get(
  '/',
  permissionMiddleware('events.read'),
  validateRequest({ query: listVenuesQuerySchema }),
  listVenues
);
venueRouter.post(
  '/',
  permissionMiddleware('events.write'),
  validateRequest({ body: createVenueSchema }),
  createVenue
);
venueRouter.get(
  '/:id',
  permissionMiddleware('events.read'),
  validateRequest({ params: venueIdParamsSchema }),
  getVenue
);
venueRouter.patch(
  '/:id',
  permissionMiddleware('events.write'),
  validateRequest({ params: venueIdParamsSchema, body: updateVenueSchema }),
  updateVenue
);
venueRouter.delete(
  '/:id',
  permissionMiddleware('events.write'),
  validateRequest({ params: venueIdParamsSchema }),
  deleteVenue
);
