import { Router } from 'express';

import { authMiddleware } from '../../middlewares/auth';
import { validateRequest } from '../../middlewares/validate-request';
import {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  resetUserPassword,
  updateUser,
} from './user.controller';
import {
  createUserSchema,
  listUsersQuerySchema,
  resetUserPasswordSchema,
  updateUserSchema,
  userIdParamsSchema,
} from './user.schemas';

export const userRouter = Router();

userRouter.use(authMiddleware);

userRouter.get(
  '/',
  validateRequest({ query: listUsersQuerySchema }),
  listUsers
);
userRouter.post(
  '/',
  validateRequest({ body: createUserSchema }),
  createUser
);
userRouter.get(
  '/:id',
  validateRequest({ params: userIdParamsSchema }),
  getUser
);
userRouter.post(
  '/:id/reset-password',
  validateRequest({ params: userIdParamsSchema, body: resetUserPasswordSchema }),
  resetUserPassword
);
userRouter.patch(
  '/:id',
  validateRequest({ params: userIdParamsSchema, body: updateUserSchema }),
  updateUser
);
userRouter.delete(
  '/:id',
  validateRequest({ params: userIdParamsSchema }),
  deleteUser
);
