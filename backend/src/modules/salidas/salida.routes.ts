import { Router } from 'express';

import { RolUsuario } from '../../lib/prisma-client';
import { requireRole } from '../../middlewares/auth';
import { getSalida, getSalidas, postSalida, postSalidaCierre } from './salida.controller';

export const salidaRouter = Router();

salidaRouter.get(
  '/',
  requireRole(RolUsuario.ADMIN, RolUsuario.CAJERO, RolUsuario.VENDEDOR),
  getSalidas
);
salidaRouter.get(
  '/:id',
  requireRole(RolUsuario.ADMIN, RolUsuario.CAJERO, RolUsuario.VENDEDOR),
  getSalida
);
salidaRouter.post(
  '/',
  requireRole(RolUsuario.ADMIN, RolUsuario.CAJERO, RolUsuario.VENDEDOR),
  postSalida
);
salidaRouter.post(
  '/:id/cierre',
  requireRole(RolUsuario.ADMIN, RolUsuario.CAJERO, RolUsuario.VENDEDOR),
  postSalidaCierre
);
