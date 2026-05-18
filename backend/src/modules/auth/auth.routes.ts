import { Router } from 'express';

import { authMiddleware } from '../../middlewares/auth';
import { validateRequest } from '../../middlewares/validate-request';
import { login, logout, me, refresh } from './auth.controller';
import { loginSchema, logoutSchema, refreshTokenSchema } from './auth.schemas';

export const authRouter = Router();

authRouter.post('/login', validateRequest({ body: loginSchema }), login);
authRouter.post('/refresh', validateRequest({ body: refreshTokenSchema }), refresh);
authRouter.post('/logout', authMiddleware, validateRequest({ body: logoutSchema }), logout);
authRouter.get('/me', authMiddleware, me);
