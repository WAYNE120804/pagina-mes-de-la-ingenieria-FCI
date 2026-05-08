import { Router } from 'express';

import { authRouter, usuarioRouter } from '../modules/auth/auth.routes';
import { cajaRouter } from '../modules/cajas/caja.routes';
import { categoriaRouter } from '../modules/categorias/categoria.routes';
import { clienteRouter } from '../modules/clientes/cliente.routes';
import { configuracionRouter } from '../modules/configuracion/configuracion.routes';
import { creditoRouter } from '../modules/creditos/credito.routes';
import { fondoRouter } from '../modules/fondos/fondo.routes';
import { gastoRouter } from '../modules/gastos/gasto.routes';
import { healthRouter } from '../modules/health/health.routes';
import { informeRouter } from '../modules/informes/informe.routes';
import { productoRouter } from '../modules/productos/producto.routes';
import { salidaRouter } from '../modules/salidas/salida.routes';
import { separadoRouter } from '../modules/separados/separado.routes';
import { ventaRouter } from '../modules/ventas/venta.routes';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/usuarios', usuarioRouter);
apiRouter.use('/cajas', cajaRouter);
apiRouter.use('/categorias', categoriaRouter);
apiRouter.use('/clientes', clienteRouter);
apiRouter.use('/productos', productoRouter);
apiRouter.use('/ventas', ventaRouter);
apiRouter.use('/separados', separadoRouter);
apiRouter.use('/creditos', creditoRouter);
apiRouter.use('/salidas', salidaRouter);
apiRouter.use('/fondos', fondoRouter);
apiRouter.use('/gastos', gastoRouter);
apiRouter.use('/informes', informeRouter);
apiRouter.use('/configuracion', configuracionRouter);
apiRouter.use('/cajas', cajaRouter);
