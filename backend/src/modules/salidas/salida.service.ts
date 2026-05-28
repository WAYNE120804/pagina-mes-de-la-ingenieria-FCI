import {
  EstadoProducto,
  EstadoSalidaProducto,
  Prisma,
  TipoMovimientoInventario,
  TipoSalidaProducto,
} from '../../lib/prisma-client';
import { AppError } from '../../lib/app-error';
import { getPrisma } from '../../lib/prisma';
import type { CierreSalidaPayload, SalidaPayload } from './salida.schemas';
import { getTipoOperacionLabel } from './salida.schemas';

function prismaClient() {
  const prisma = getPrisma();

  if (!prisma) {
    throw new AppError('DATABASE_URL no esta configurado en el backend.', 500);
  }

  return prisma;
}

const salidaInclude = Prisma.validator<Prisma.SalidaProductoInclude>()({
  cliente: {
    select: {
      id: true,
      nombreCompleto: true,
      cedula: true,
      telefonoCelular: true,
      email: true,
    },
  },
  usuario: {
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
    },
  },
  items: {
    include: {
      variante: {
        include: {
          producto: {
            include: {
              categoria: true,
            },
          },
          codigos: {
            orderBy: [{ principal: 'desc' }, { createdAt: 'asc' }],
          },
        },
      },
    },
    orderBy: [{ createdAt: 'asc' }],
  },
});

type VariantSnapshot = {
  id: string;
  talla: string;
  color: string;
  stockActual: number;
  costoPromedio: Prisma.Decimal;
  precioVenta: Prisma.Decimal;
  estado: EstadoProducto;
  producto: {
    id: string;
    nombre: string;
  };
};

function formatVariantDescriptor(input: { color: string; talla: string }) {
  const color = (input.color || '').toUpperCase();
  const talla = (input.talla || '').toUpperCase();

  if (color === 'NO APLICA' && talla === 'NO APLICA') {
    return 'sin color ni talla';
  }

  if (color === 'NO APLICA') {
    return `talla ${input.talla}`;
  }

  if (talla === 'NO APLICA') {
    return `color ${input.color}`;
  }

  return `${input.color}/${input.talla}`;
}

function groupItems(items: SalidaPayload['items']) {
  const grouped = new Map<string, { cantidad: number; observacion: string | null }>();

  for (const item of items) {
    const existing = grouped.get(item.varianteId);
    grouped.set(item.varianteId, {
      cantidad: (existing?.cantidad || 0) + item.cantidad,
      observacion: item.observacion || existing?.observacion || null,
    });
  }

  return grouped;
}

function buildOpenState(tipoOperacion: string) {
  if (tipoOperacion === 'TRUEQUE') {
    return EstadoSalidaProducto.TRUEQUEADO;
  }

  return EstadoSalidaProducto.PRESTADO;
}

function buildTipoDetalle(payload: SalidaPayload) {
  const label = getTipoOperacionLabel(payload.tipoOperacion);

  if (payload.tipoOperacion === String(payload.tipo)) {
    return payload.observaciones;
  }

  return [`Tipo especial: ${label}`, payload.observaciones].filter(Boolean).join('\n') || null;
}

async function refreshProductState(tx: Prisma.TransactionClient, productoId: string) {
  const variantsForProduct = await tx.productoVariante.findMany({
    where: { productoId },
    select: {
      stockActual: true,
    },
  });

  await tx.producto.update({
    where: { id: productoId },
    data: {
      estado: variantsForProduct.some((variant) => variant.stockActual > 0)
        ? EstadoProducto.ACTIVO
        : EstadoProducto.AGOTADO,
    },
  });
}

export async function listSalidas(filters?: { search?: string; estado?: string; tipo?: string }) {
  const search = filters?.search?.trim();
  const estado =
    typeof filters?.estado === 'string' && filters.estado in EstadoSalidaProducto
      ? (filters.estado as EstadoSalidaProducto)
      : undefined;
  const tipo =
    typeof filters?.tipo === 'string' && filters.tipo in TipoSalidaProducto
      ? (filters.tipo as TipoSalidaProducto)
      : undefined;

  return prismaClient().salidaProducto.findMany({
    where: {
      ...(estado ? { estado } : {}),
      ...(tipo ? { tipo } : {}),
      ...(search
        ? {
            OR: [
              { responsableNombre: { contains: search, mode: 'insensitive' } },
              { responsableCedula: { contains: search, mode: 'insensitive' } },
              { responsableTelefono: { contains: search, mode: 'insensitive' } },
              { destino: { contains: search, mode: 'insensitive' } },
              { observaciones: { contains: search, mode: 'insensitive' } },
              { cliente: { nombreCompleto: { contains: search, mode: 'insensitive' } } },
              { cliente: { cedula: { contains: search, mode: 'insensitive' } } },
              {
                items: {
                  some: {
                    variante: {
                      OR: [
                        { sku: { contains: search, mode: 'insensitive' } },
                        { color: { contains: search, mode: 'insensitive' } },
                        { talla: { contains: search, mode: 'insensitive' } },
                        { producto: { nombre: { contains: search, mode: 'insensitive' } } },
                      ],
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: salidaInclude,
    orderBy: [{ createdAt: 'desc' }],
    take: 100,
  });
}

export async function getSalidaById(id: string) {
  const salida = await prismaClient().salidaProducto.findUnique({
    where: { id },
    include: salidaInclude,
  });

  if (!salida) {
    throw new AppError('La salida no existe.', 404);
  }

  return salida;
}

export async function createSalida(payload: SalidaPayload, usuarioId?: string) {
  const prisma = prismaClient();
  const groupedItems = groupItems(payload.items);
  const variantIds = [...groupedItems.keys()];

  if (payload.clienteId) {
    const cliente = await prisma.cliente.findUnique({
      where: { id: payload.clienteId },
      select: { id: true },
    });

    if (!cliente) {
      throw new AppError('El cliente seleccionado ya no existe.', 404);
    }
  }

  const variants = await prisma.productoVariante.findMany({
    where: { id: { in: variantIds } },
    select: {
      id: true,
      talla: true,
      color: true,
      stockActual: true,
      costoPromedio: true,
      precioVenta: true,
      estado: true,
      producto: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  });

  if (variants.length !== variantIds.length) {
    throw new AppError('Una o varias variantes ya no existen.', 404);
  }

  const variantMap = new Map<string, VariantSnapshot>(
    variants.map((variant) => [variant.id, variant])
  );

  const salidaItems = [...groupedItems.entries()].map(([varianteId, item]) => {
    const variant = variantMap.get(varianteId);

    if (!variant) {
      throw new AppError('Una o varias variantes ya no existen.', 404);
    }

    if (variant.stockActual < item.cantidad) {
      throw new AppError(
        `No hay suficiente stock para sacar "${variant.producto.nombre}" (${formatVariantDescriptor(variant)}). Disponible: ${variant.stockActual}.`,
        409
      );
    }

    return {
      variante: variant,
      cantidad: item.cantidad,
      observacion: item.observacion,
      costoUnitario: Number(variant.costoPromedio || 0),
      precioReferencia: Number(variant.precioVenta || 0),
    };
  });

  return prisma.$transaction(async (tx) => {
    const salida = await tx.salidaProducto.create({
      data: {
        clienteId: payload.clienteId,
        usuarioId,
        tipo: payload.tipo,
        estado: buildOpenState(payload.tipoOperacion),
        responsableNombre: payload.responsableNombre,
        responsableCedula: payload.responsableCedula,
        responsableTelefono: payload.responsableTelefono,
        destino: payload.destino || getTipoOperacionLabel(payload.tipoOperacion),
        fechaCompromiso: payload.fechaCompromiso,
        observaciones: buildTipoDetalle(payload),
        cerradoAt: payload.tipoOperacion === 'TRUEQUE' ? new Date() : null,
        items: {
          create: salidaItems.map((item) => ({
            varianteId: item.variante.id,
            cantidad: item.cantidad,
            costoUnitario: item.costoUnitario,
            precioReferencia: item.precioReferencia,
            observacion: item.observacion,
          })),
        },
      },
    });

    for (const item of salidaItems) {
      const stockAnterior = item.variante.stockActual;
      const stockPosterior = stockAnterior - item.cantidad;

      await tx.productoVariante.update({
        where: { id: item.variante.id },
        data: {
          stockActual: stockPosterior,
          estado:
            stockPosterior <= 0
              ? EstadoProducto.AGOTADO
              : item.variante.estado === EstadoProducto.AGOTADO
                ? EstadoProducto.ACTIVO
                : item.variante.estado,
        },
      });

      await tx.movimientoInventario.create({
        data: {
          varianteId: item.variante.id,
          usuarioId,
          tipo:
            payload.tipoOperacion === 'TRUEQUE'
              ? TipoMovimientoInventario.TRUEQUE_SALIDA
              : TipoMovimientoInventario.SALIDA_PRESTAMO,
          cantidad: item.cantidad,
          stockAnterior,
          stockPosterior,
          costoUnitario: item.costoUnitario,
          precioUnitario: item.precioReferencia,
          detalle: `${getTipoOperacionLabel(payload.tipoOperacion)} ${salida.id.slice(-6).toUpperCase()} - ${item.variante.producto.nombre} (${formatVariantDescriptor(item.variante)})`,
          referenciaTipo: 'SALIDA_PRODUCTO',
          referenciaId: salida.id,
        },
      });
    }

    const touchedProductIds = [...new Set(salidaItems.map((item) => item.variante.producto.id))];

    for (const productoId of touchedProductIds) {
      await refreshProductState(tx, productoId);
    }

    return tx.salidaProducto.findUniqueOrThrow({
      where: { id: salida.id },
      include: salidaInclude,
    });
  });
}

export async function cerrarSalida(id: string, payload: CierreSalidaPayload, usuarioId?: string) {
  const prisma = prismaClient();

  return prisma.$transaction(async (tx) => {
    const salida = await tx.salidaProducto.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variante: {
              include: {
                producto: true,
              },
            },
          },
        },
      },
    });

    if (!salida) {
      throw new AppError('La salida no existe.', 404);
    }

    if (salida.cerradoAt || salida.estado !== EstadoSalidaProducto.PRESTADO) {
      throw new AppError('Esta salida ya esta cerrada.', 409);
    }

    const shouldReturnStock =
      payload.devolverInventario || payload.estado === EstadoSalidaProducto.DEVUELTO;

    if (shouldReturnStock) {
      for (const item of salida.items) {
        const stockAnterior = item.variante.stockActual;
        const stockPosterior = stockAnterior + item.cantidad;

        await tx.productoVariante.update({
          where: { id: item.varianteId },
          data: {
            stockActual: stockPosterior,
            estado:
              item.variante.estado === EstadoProducto.AGOTADO && stockPosterior > 0
                ? EstadoProducto.ACTIVO
                : item.variante.estado,
          },
        });

        await tx.movimientoInventario.create({
          data: {
            varianteId: item.varianteId,
            usuarioId,
            tipo: TipoMovimientoInventario.RETORNO_PRESTAMO,
            cantidad: item.cantidad,
            stockAnterior,
            stockPosterior,
            costoUnitario: item.costoUnitario,
            precioUnitario: item.precioReferencia,
            detalle: `Cierre salida ${salida.id.slice(-6).toUpperCase()} - retorno de ${item.variante.producto.nombre}`,
            referenciaTipo: 'SALIDA_PRODUCTO_CIERRE',
            referenciaId: salida.id,
          },
        });
      }

      const touchedProductIds = [...new Set(salida.items.map((item) => item.variante.productoId))];

      for (const productoId of touchedProductIds) {
        await refreshProductState(tx, productoId);
      }
    }

    await tx.salidaProducto.update({
      where: { id: salida.id },
      data: {
        estado: payload.estado,
        valorRecibido: payload.valorRecibido,
        cerradoAt: new Date(),
        observaciones: payload.observaciones
          ? [salida.observaciones, `Cierre: ${payload.observaciones}`].filter(Boolean).join('\n')
          : salida.observaciones,
      },
    });

    return tx.salidaProducto.findUniqueOrThrow({
      where: { id: salida.id },
      include: salidaInclude,
    });
  });
}
