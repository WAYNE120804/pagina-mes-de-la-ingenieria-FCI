import type { NextFunction, Request, Response } from 'express';

import {
  cancelarCredito,
  createCredito,
  getCreditoById,
  getCreditoDefaults,
  listCreditos,
  pagarCredito,
} from './credito.service';
import {
  parseCancelacionCreditoPayload,
  parseCreditoPayload,
  parsePagoCreditoPayload,
} from './credito.schemas';

function getIdParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || '';
}

export async function getCreditos(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(
      await listCreditos({
        search: String(req.query.search || ''),
        estado: typeof req.query.estado === 'string' ? req.query.estado : '',
      })
    );
  } catch (error) {
    next(error);
  }
}

export async function getCredito(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getCreditoById(getIdParam(req.params.id)));
  } catch (error) {
    next(error);
  }
}

export async function getCreditosDefaults(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(getCreditoDefaults());
  } catch (error) {
    next(error);
  }
}

export async function postCredito(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await createCredito(parseCreditoPayload(req.body || {}), req.authUser?.id));
  } catch (error) {
    next(error);
  }
}

export async function postCreditoPago(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(
      await pagarCredito(
        getIdParam(req.params.id),
        parsePagoCreditoPayload(req.body || {}),
        req.authUser?.id
      )
    );
  } catch (error) {
    next(error);
  }
}

export async function postCreditoCancelacion(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(
      await cancelarCredito(
        getIdParam(req.params.id),
        parseCancelacionCreditoPayload(req.body || {}),
        req.authUser?.id
      )
    );
  } catch (error) {
    next(error);
  }
}
