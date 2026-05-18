import type { NextFunction, Response } from 'express';

import type { AuthenticatedRequest } from '../../middlewares/auth';
import { successResponse } from '../../utils/api-response';
import { getPaginationParams } from '../../utils/pagination';
import * as venueService from './venue.service';

export async function listVenues(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const pagination = getPaginationParams(req);
    const result = await venueService.listVenues(req.query, pagination);

    res.json(successResponse('Espacios consultados', result.venues, result.meta));
  } catch (error) {
    next(error);
  }
}

export async function getVenue(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const venue = await venueService.getVenueById(String(req.params.id));

    res.json(successResponse('Espacio consultado', venue));
  } catch (error) {
    next(error);
  }
}

export async function createVenue(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const venue = await venueService.createVenue(req.body, req.user?.id);

    res.status(201).json(successResponse('Espacio creado', venue));
  } catch (error) {
    next(error);
  }
}

export async function updateVenue(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const venue = await venueService.updateVenue(String(req.params.id), req.body, req.user?.id);

    res.json(successResponse('Espacio actualizado', venue));
  } catch (error) {
    next(error);
  }
}

export async function deleteVenue(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await venueService.deleteVenue(String(req.params.id), req.user?.id);

    res.json(successResponse('Espacio eliminado'));
  } catch (error) {
    next(error);
  }
}
