import { Router } from 'express';

import { requireRole } from '../../middlewares/auth';
import { RolUsuario } from '../../lib/prisma-client';
import {
  getCredito,
  getCreditos,
  getCreditosDefaults,
  postCredito,
  postCreditoCancelacion,
  postCreditoPago,
} from './credito.controller';

export const creditoRouter = Router();

creditoRouter.get(
  '/',
  requireRole(RolUsuario.ADMIN, RolUsuario.CAJERO, RolUsuario.VENDEDOR),
  getCreditos
);
creditoRouter.get(
  '/defaults',
  requireRole(RolUsuario.ADMIN, RolUsuario.CAJERO, RolUsuario.VENDEDOR),
  getCreditosDefaults
);
creditoRouter.get(
  '/:id',
  requireRole(RolUsuario.ADMIN, RolUsuario.CAJERO, RolUsuario.VENDEDOR),
  getCredito
);
creditoRouter.post(
  '/',
  requireRole(RolUsuario.ADMIN, RolUsuario.CAJERO, RolUsuario.VENDEDOR),
  postCredito
);
creditoRouter.post(
  '/:id/pagos',
  requireRole(RolUsuario.ADMIN, RolUsuario.CAJERO, RolUsuario.VENDEDOR),
  postCreditoPago
);
creditoRouter.post(
  '/:id/cancelacion',
  requireRole(RolUsuario.ADMIN, RolUsuario.CAJERO, RolUsuario.VENDEDOR),
  postCreditoCancelacion
);
