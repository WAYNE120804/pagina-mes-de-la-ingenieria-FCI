import { Router } from 'express';

import { authMiddleware, permissionMiddleware } from '../../middlewares/auth';
import { validateRequest } from '../../middlewares/validate-request';
import { createTalk, deleteTalk, getTalk, listTalks, updateTalk } from './talk.controller';
import {
  createTalkSchema,
  listTalksQuerySchema,
  talkIdParamsSchema,
  updateTalkSchema,
} from './talk.schemas';

export const talkRouter = Router();

talkRouter.use(authMiddleware);

talkRouter.get(
  '/',
  permissionMiddleware('events.read'),
  validateRequest({ query: listTalksQuerySchema }),
  listTalks
);
talkRouter.post(
  '/',
  permissionMiddleware('events.write'),
  validateRequest({ body: createTalkSchema }),
  createTalk
);
talkRouter.get(
  '/:id',
  permissionMiddleware('events.read'),
  validateRequest({ params: talkIdParamsSchema }),
  getTalk
);
talkRouter.patch(
  '/:id',
  permissionMiddleware('events.write'),
  validateRequest({ params: talkIdParamsSchema, body: updateTalkSchema }),
  updateTalk
);
talkRouter.delete(
  '/:id',
  permissionMiddleware('events.write'),
  validateRequest({ params: talkIdParamsSchema }),
  deleteTalk
);
