import type { NextFunction, Response } from 'express';

import type { AuthenticatedRequest } from '../../middlewares/auth';
import { successResponse } from '../../utils/api-response';
import { getPaginationParams } from '../../utils/pagination';
import * as userService from './user.service';

export async function listUsers(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const pagination = getPaginationParams(req);
    const result = await userService.listUsers(req.query, pagination);

    res.json(successResponse('Usuarios consultados', result.users, result.meta));
  } catch (error) {
    next(error);
  }
}

export async function getUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await userService.getUserById(String(req.params.id));

    res.json(successResponse('Usuario consultado', user));
  } catch (error) {
    next(error);
  }
}

export async function createUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await userService.createUser(req.body, req.user?.id);

    res.status(201).json(successResponse('Usuario creado', user));
  } catch (error) {
    next(error);
  }
}

export async function updateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await userService.updateUser(String(req.params.id), req.body, req.user?.id);

    res.json(successResponse('Usuario actualizado', user));
  } catch (error) {
    next(error);
  }
}

export async function resetUserPassword(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await userService.resetUserPassword(
      String(req.params.id),
      req.body,
      req.user?.id
    );

    res.json(successResponse('Contrasena restablecida', user));
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    await userService.deleteUser(String(req.params.id), req.user?.id);

    res.json(successResponse('Usuario eliminado'));
  } catch (error) {
    next(error);
  }
}
