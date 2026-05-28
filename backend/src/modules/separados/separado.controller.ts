import type { NextFunction, Request, Response } from 'express';

import {
  abonarSeparado,
  cancelarSeparado,
  createSeparado,
  getSeparadoDefaults,
  getSeparadoById,
  listSeparados,
} from './separado.service';
import {
  parseAbonoSeparadoPayload,
  parseCancelacionSeparadoPayload,
  parseSeparadoPayload,
} from './separado.schemas';

function getIdParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || '';
}

export async function getSeparados(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(
      await listSeparados({
        search: String(req.query.search || ''),
        estado: typeof req.query.estado === 'string' ? req.query.estado : '',
      })
    );
  } catch (error) {
    next(error);
  }
}

export async function getSeparado(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getSeparadoById(getIdParam(req.params.id)));
  } catch (error) {
    next(error);
  }
}

export async function getSeparadosDefaults(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(getSeparadoDefaults());
  } catch (error) {
    next(error);
  }
}

export async function postSeparado(req: Request, res: Response, next: NextFunction) {
  try {
    res
      .status(201)
      .json(await createSeparado(parseSeparadoPayload(req.body || {}), req.authUser?.id));
  } catch (error) {
    next(error);
  }
}

export async function postSeparadoAbono(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(
      await abonarSeparado(
        getIdParam(req.params.id),
        parseAbonoSeparadoPayload(req.body || {}),
        req.authUser?.id
      )
    );
  } catch (error) {
    next(error);
  }
}

export async function postSeparadoCancelacion(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(
      await cancelarSeparado(
        getIdParam(req.params.id),
        parseCancelacionSeparadoPayload(req.body || {}),
        req.authUser?.id
      )
    );
  } catch (error) {
    next(error);
  }
}
