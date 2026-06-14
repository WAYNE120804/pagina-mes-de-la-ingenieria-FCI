import { Router } from 'express';

import { authMiddleware } from '../../middlewares/auth';
import { authRateLimiter } from '../../middlewares/security';
import { validateRequest } from '../../middlewares/validate-request';
import { login, logout, me, refresh } from './auth.controller';
import { loginSchema, logoutSchema, refreshTokenSchema } from './auth.schemas';

export const authRouter = Router();

authRouter.post('/login', authRateLimiter, validateRequest({ body: loginSchema }), login);
authRouter.post('/refresh', authRateLimiter, validateRequest({ body: refreshTokenSchema }), refresh);
authRouter.post('/logout', authMiddleware, validateRequest({ body: logoutSchema }), logout);
authRouter.get('/me', authMiddleware, me);
