import type { NextFunction, Request, Response } from 'express';

import { cerrarSalida, createSalida, getSalidaById, listSalidas } from './salida.service';
import { parseCierreSalidaPayload, parseSalidaPayload } from './salida.schemas';

function getIdParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || '';
}

export async function getSalidas(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(
      await listSalidas({
        search: String(req.query.search || ''),
        estado: typeof req.query.estado === 'string' ? req.query.estado : '',
        tipo: typeof req.query.tipo === 'string' ? req.query.tipo : '',
      })
    );
  } catch (error) {
    next(error);
  }
}

export async function getSalida(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getSalidaById(getIdParam(req.params.id)));
  } catch (error) {
    next(error);
  }
}

export async function postSalida(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await createSalida(parseSalidaPayload(req.body || {}), req.authUser?.id));
  } catch (error) {
    next(error);
  }
}

export async function postSalidaCierre(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(
      await cerrarSalida(
        getIdParam(req.params.id),
        parseCierreSalidaPayload(req.body || {}),
        req.authUser?.id
      )
    );
  } catch (error) {
    next(error);
  }
}
