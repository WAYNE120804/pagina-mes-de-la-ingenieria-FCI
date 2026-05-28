import { Router } from 'express';

import { requireRole } from '../../middlewares/auth';
import { RolUsuario } from '../../lib/prisma-client';
import {
  getSeparado,
  getSeparadosDefaults,
  getSeparados,
  postSeparado,
  postSeparadoAbono,
  postSeparadoCancelacion,
} from './separado.controller';

export const separadoRouter = Router();

separadoRouter.get(
  '/',
  requireRole(RolUsuario.ADMIN, RolUsuario.CAJERO, RolUsuario.VENDEDOR),
  getSeparados
);
separadoRouter.get(
  '/defaults',
  requireRole(RolUsuario.ADMIN, RolUsuario.CAJERO, RolUsuario.VENDEDOR),
  getSeparadosDefaults
);
separadoRouter.get(
  '/:id',
  requireRole(RolUsuario.ADMIN, RolUsuario.CAJERO, RolUsuario.VENDEDOR),
  getSeparado
);
separadoRouter.post(
  '/',
  requireRole(RolUsuario.ADMIN, RolUsuario.CAJERO, RolUsuario.VENDEDOR),
  postSeparado
);
separadoRouter.post(
  '/:id/abonos',
  requireRole(RolUsuario.ADMIN, RolUsuario.CAJERO, RolUsuario.VENDEDOR),
  postSeparadoAbono
);
separadoRouter.post(
  '/:id/cancelacion',
  requireRole(RolUsuario.ADMIN, RolUsuario.CAJERO, RolUsuario.VENDEDOR),
  postSeparadoCancelacion
);
