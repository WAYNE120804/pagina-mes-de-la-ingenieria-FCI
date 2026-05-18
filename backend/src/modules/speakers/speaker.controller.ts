import type { NextFunction, Response } from 'express';

import type { AuthenticatedRequest } from '../../middlewares/auth';
import { successResponse } from '../../utils/api-response';
import { getPaginationParams } from '../../utils/pagination';
import * as speakerService from './speaker.service';

export async function listSpeakers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const pagination = getPaginationParams(req);
    const result = await speakerService.listSpeakers(req.query, pagination);

    res.json(successResponse('Ponentes consultados', result.speakers, result.meta));
  } catch (error) {
    next(error);
  }
}

export async function getSpeaker(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const speaker = await speakerService.getSpeakerById(String(req.params.id));

    res.json(successResponse('Ponente consultado', speaker));
  } catch (error) {
    next(error);
  }
}

export async function createSpeaker(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const speaker = await speakerService.createSpeaker(req.body, req.user?.id);

    res.status(201).json(successResponse('Ponente creado', speaker));
  } catch (error) {
    next(error);
  }
}

export async function updateSpeaker(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const speaker = await speakerService.updateSpeaker(String(req.params.id), req.body, req.user?.id);

    res.json(successResponse('Ponente actualizado', speaker));
  } catch (error) {
    next(error);
  }
}

export async function deleteSpeaker(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    await speakerService.deleteSpeaker(String(req.params.id), req.user?.id);

    res.json(successResponse('Ponente eliminado'));
  } catch (error) {
    next(error);
  }
}
