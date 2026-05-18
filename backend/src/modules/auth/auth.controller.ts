import type { NextFunction, Request, Response } from 'express';

import type { AuthenticatedRequest } from '../../middlewares/auth';
import { successResponse } from '../../utils/api-response';
import * as authService from './auth.service';

function getRequestMeta(req: Request) {
  return {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  };
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(req.body, getRequestMeta(req));

    res.json(successResponse('Sesion iniciada', result));
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.refresh(req.body);

    res.json(successResponse('Token renovado', result));
  } catch (error) {
    next(error);
  }
}

export async function logout(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    await authService.logout(req.body, req.user?.id);

    res.json(successResponse('Sesion cerrada'));
  } catch (error) {
    next(error);
  }
}

export async function me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = await authService.getMe(req.user?.id || '');

    res.json(successResponse('Usuario autenticado', user));
  } catch (error) {
    next(error);
  }
}
