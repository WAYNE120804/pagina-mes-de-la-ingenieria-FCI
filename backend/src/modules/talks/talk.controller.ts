import type { NextFunction, Response } from 'express';

import type { AuthenticatedRequest } from '../../middlewares/auth';
import { successResponse } from '../../utils/api-response';
import { getPaginationParams } from '../../utils/pagination';
import * as talkService from './talk.service';

export async function listTalks(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const pagination = getPaginationParams(req);
    const result = await talkService.listTalks(req.query, pagination);

    res.json(successResponse('Charlas consultadas', result.talks, result.meta));
  } catch (error) {
    next(error);
  }
}

export async function getTalk(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const talk = await talkService.getTalkById(String(req.params.id));

    res.json(successResponse('Charla consultada', talk));
  } catch (error) {
    next(error);
  }
}

export async function createTalk(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const talk = await talkService.createTalk(req.body, req.user?.id);

    res.status(201).json(successResponse('Charla creada', talk));
  } catch (error) {
    next(error);
  }
}

export async function updateTalk(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const talk = await talkService.updateTalk(String(req.params.id), req.body, req.user?.id);

    res.json(successResponse('Charla actualizada', talk));
  } catch (error) {
    next(error);
  }
}

export async function deleteTalk(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await talkService.deleteTalk(String(req.params.id), req.user?.id);

    res.json(successResponse('Charla eliminada'));
  } catch (error) {
    next(error);
  }
}
