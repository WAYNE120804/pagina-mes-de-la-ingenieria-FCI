import { Router } from 'express';

import { authMiddleware, permissionMiddleware } from '../../middlewares/auth';
import { validateRequest } from '../../middlewares/validate-request';
import {
  createSpeaker,
  deleteSpeaker,
  getSpeaker,
  listSpeakers,
  updateSpeaker,
} from './speaker.controller';
import {
  createSpeakerSchema,
  listSpeakersQuerySchema,
  speakerIdParamsSchema,
  updateSpeakerSchema,
} from './speaker.schemas';

export const speakerRouter = Router();

speakerRouter.use(authMiddleware);

speakerRouter.get(
  '/',
  permissionMiddleware('events.read'),
  validateRequest({ query: listSpeakersQuerySchema }),
  listSpeakers
);
speakerRouter.post(
  '/',
  permissionMiddleware('events.write'),
  validateRequest({ body: createSpeakerSchema }),
  createSpeaker
);
speakerRouter.get(
  '/:id',
  permissionMiddleware('events.read'),
  validateRequest({ params: speakerIdParamsSchema }),
  getSpeaker
);
speakerRouter.patch(
  '/:id',
  permissionMiddleware('events.write'),
  validateRequest({ params: speakerIdParamsSchema, body: updateSpeakerSchema }),
  updateSpeaker
);
speakerRouter.delete(
  '/:id',
  permissionMiddleware('events.write'),
  validateRequest({ params: speakerIdParamsSchema }),
  deleteSpeaker
);
