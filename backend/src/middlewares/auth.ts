import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { AppError } from '../lib/app-error';

export type AuthUser = {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
};

export type AuthenticatedRequest = Request & {
  user?: AuthUser;
};

type AccessTokenPayload = jwt.JwtPayload & AuthUser;

function getBearerToken(req: Request) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.slice('Bearer '.length);
}

export function authMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      throw new AppError('Token de autenticacion requerido', 401, 'AUTH_REQUIRED');
    }

    if (!env.jwtAccessSecret) {
      throw new AppError('JWT no configurado', 500, 'JWT_NOT_CONFIGURED');
    }

    const payload = jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;

    req.user = {
      id: payload.id || payload.sub || '',
      email: payload.email,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
    };

    if (!req.user.id) {
      throw new AppError('Token invalido', 401, 'INVALID_TOKEN');
    }

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(new AppError('Token invalido o expirado', 401, 'INVALID_TOKEN'));
  }
}

export function roleMiddleware(...roles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const hasRole = req.user?.roles.some((role) => roles.includes(role));

    if (!hasRole) {
      next(new AppError('No tienes rol suficiente para esta accion', 403, 'ROLE_FORBIDDEN'));
      return;
    }

    next();
  };
}

export function permissionMiddleware(...permissions: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const hasPermission = req.user?.permissions.some((permission) =>
      permissions.includes(permission)
    );

    if (!hasPermission) {
      next(
        new AppError(
          'No tienes permiso suficiente para esta accion',
          403,
          'PERMISSION_FORBIDDEN'
        )
      );
      return;
    }

    next();
  };
}
