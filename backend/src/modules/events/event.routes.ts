import { Router } from 'express';

import { authMiddleware, permissionMiddleware } from '../../middlewares/auth';
import { validateRequest } from '../../middlewares/validate-request';
import {
  addResponsible,
  createEvent,
  deleteEvent,
  getEvent,
  listEvents,
  updateEvent,
} from './event.controller';
import {
  createEventSchema,
  eventIdParamsSchema,
  listEventsQuerySchema,
  responsibleSchema,
  updateEventSchema,
} from './event.schemas';

export const eventRouter = Router();

eventRouter.use(authMiddleware);

eventRouter.get(
  '/',
  permissionMiddleware('events.read'),
  validateRequest({ query: listEventsQuerySchema }),
  listEvents
);
eventRouter.post(
  '/',
  permissionMiddleware('events.write'),
  validateRequest({ body: createEventSchema }),
  createEvent
);
eventRouter.get(
  '/:id',
  permissionMiddleware('events.read'),
  validateRequest({ params: eventIdParamsSchema }),
  getEvent
);
eventRouter.patch(
  '/:id',
  permissionMiddleware('events.write'),
  validateRequest({ params: eventIdParamsSchema, body: updateEventSchema }),
  updateEvent
);
eventRouter.delete(
  '/:id',
  permissionMiddleware('events.write'),
  validateRequest({ params: eventIdParamsSchema }),
  deleteEvent
);
eventRouter.post(
  '/:id/responsibles',
  permissionMiddleware('events.write'),
  validateRequest({ params: eventIdParamsSchema, body: responsibleSchema }),
  addResponsible
);
