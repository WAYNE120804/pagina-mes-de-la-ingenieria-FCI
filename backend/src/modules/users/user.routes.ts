import { Router } from 'express';

import { authMiddleware, roleMiddleware } from '../../middlewares/auth';
import { validateRequest } from '../../middlewares/validate-request';
import {
  changeOwnPassword,
  createUser,
  deleteUser,
  getUser,
  listUsers,
  resetUserPassword,
  updateOwnProfile,
  updateUser,
} from './user.controller';
import {
  changeOwnPasswordSchema,
  createUserSchema,
  listUsersQuerySchema,
  resetUserPasswordSchema,
  updateOwnProfileSchema,
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
  roleMiddleware('SUPER_ADMIN'),
  validateRequest({ body: createUserSchema }),
  createUser
);
userRouter.patch(
  '/me',
  validateRequest({ body: updateOwnProfileSchema }),
  updateOwnProfile
);
userRouter.patch(
  '/me/password',
  validateRequest({ body: changeOwnPasswordSchema }),
  changeOwnPassword
);
userRouter.get(
  '/:id',
  validateRequest({ params: userIdParamsSchema }),
  getUser
);
userRouter.post(
  '/:id/reset-password',
  roleMiddleware('SUPER_ADMIN'),
  validateRequest({ params: userIdParamsSchema, body: resetUserPasswordSchema }),
  resetUserPassword
);
userRouter.patch(
  '/:id',
  roleMiddleware('SUPER_ADMIN'),
  validateRequest({ params: userIdParamsSchema, body: updateUserSchema }),
  updateUser
);
userRouter.delete(
  '/:id',
  roleMiddleware('SUPER_ADMIN'),
  validateRequest({ params: userIdParamsSchema }),
  deleteUser
);
