import type { NextFunction, Request, Response } from 'express';

import type { AuthenticatedRequest } from '../../middlewares/auth';
import { successResponse } from '../../utils/api-response';
import { getPaginationParams } from '../../utils/pagination';
import * as eventService from './event.service';

export async function listEvents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const pagination = getPaginationParams(req);
    const result = await eventService.listEvents(req.query, pagination);

    res.json(successResponse('Eventos consultados', result.events, result.meta));
  } catch (error) {
    next(error);
  }
}

export async function listPublicEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const origin = String(req.query.origin || req.get('origin') || 'http://localhost:5173');
    const events = await eventService.listPublicEvents(origin);

    res.json(successResponse('Eventos publicos consultados', events));
  } catch (error) {
    next(error);
  }
}

export async function getEvent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const event = await eventService.getEventById(String(req.params.id));

    res.json(successResponse('Evento consultado', event));
  } catch (error) {
    next(error);
  }
}

export async function createEvent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const event = await eventService.createEvent(req.body, req.user?.id);

    res.status(201).json(successResponse('Evento creado', event));
  } catch (error) {
    next(error);
  }
}

export async function updateEvent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const event = await eventService.updateEvent(String(req.params.id), req.body, req.user?.id);

    res.json(successResponse('Evento actualizado', event));
  } catch (error) {
    next(error);
  }
}

export async function deleteEvent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await eventService.deleteEvent(String(req.params.id), req.user?.id);

    res.json(successResponse('Evento eliminado'));
  } catch (error) {
    next(error);
  }
}

export async function addResponsible(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const responsible = await eventService.addResponsible(
      String(req.params.id),
      req.body,
      req.user?.id
    );

    res.status(201).json(successResponse('Responsable asignado', responsible));
  } catch (error) {
    next(error);
  }
}
