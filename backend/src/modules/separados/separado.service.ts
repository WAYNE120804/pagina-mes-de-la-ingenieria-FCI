import {
  EstadoProducto,
  EstadoSeparado,
  Prisma,
  TipoMovimientoCaja,
  TipoMovimientoInventario,
} from '../../lib/prisma-client';
import { AppError } from '../../lib/app-error';
import { getPrisma } from '../../lib/prisma';
import { ensureOpenDailyCaja } from '../cajas/caja.service';
import type {
  AbonoSeparadoPayload,
  CancelacionSeparadoPayload,
  SeparadoPayload,
} from './separado.schemas';

function prismaClient() {
  const prisma = getPrisma();

  if (!prisma) {
    throw new AppError('DATABASE_URL no esta configurado en el backend.', 500);
  }

  return prisma;
}

const separadoInclude = Prisma.validator<Prisma.SeparadoInclude>()({
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
  abonos: {
    include: {
      usuario: {
        select: {
          id: true,
          nombre: true,
          email: true,
          rol: true,
        },
      },
      caja: {
        select: {
          id: true,
          nombre: true,
          tipo: true,
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
  sku: string | null;
  stockActual: number;
  costoPromedio: Prisma.Decimal;
  precioVenta: Prisma.Decimal;
  estado: EstadoProducto;
  producto: {
    id: string;
    nombre: string;
    marca: string | null;
  };
};

function toMoneyNumber(value: Prisma.Decimal | number | string) {
  return Number(value);
}

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

function groupItems(items: SeparadoPayload['items']) {
  const grouped = new Map<string, number>();

  for (const item of items) {
    grouped.set(item.varianteId, (grouped.get(item.varianteId) || 0) + item.cantidad);
  }

  return grouped;
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function addOneMonth(date: Date) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return next;
}

async function refreshProductState(tx: Prisma.TransactionClient, productoId: string) {
  const variantsForProduct = await tx.productoVariante.findMany({
    where: { productoId },
    select: {
      stockActual: true,
      estado: true,
    },
  });

  const nextState = variantsForProduct.some((variant) => variant.stockActual > 0)
    ? EstadoProducto.ACTIVO
    : EstadoProducto.AGOTADO;

  await tx.producto.update({
    where: { id: productoId },
    data: { estado: nextState },
  });
}

async function markExpiredSeparados(tx: Prisma.TransactionClient) {
  await tx.separado.updateMany({
    where: {
      estado: EstadoSeparado.ACTIVO,
      fechaLimite: {
        lt: new Date(),
      },
    },
    data: {
      estado: EstadoSeparado.VENCIDO,
    },
  });
}

async function addCajaIncomeForAbono(
  tx: Prisma.TransactionClient,
  input: {
    separadoId: string;
    abonoId: string;
    cajaId: string;
    usuarioId?: string;
    valor: number;
    descripcion: string;
  }
) {
  const caja = await tx.caja.findUniqueOrThrow({
    where: { id: input.cajaId },
  });
  const saldoAnterior = Number(caja.saldoActual || 0);
  const saldoPosterior = saldoAnterior + input.valor;

  await tx.caja.update({
    where: { id: input.cajaId },
    data: { saldoActual: saldoPosterior },
  });

  await tx.movimientoCaja.create({
    data: {
      cajaId: input.cajaId,
      usuarioId: input.usuarioId,
      tipo: TipoMovimientoCaja.INGRESO,
      valor: input.valor,
      saldoAnterior,
      saldoPosterior,
      descripcion: input.descripcion,
      referenciaTipo: 'SEPARADO_ABONO',
      referenciaId: input.abonoId,
    },
  });
}

export async function listSeparados(filters?: { search?: string; estado?: string }) {
  const prisma = prismaClient();
  const search = filters?.search?.trim();
  const estado =
    typeof filters?.estado === 'string' && filters.estado in EstadoSeparado
      ? (filters.estado as EstadoSeparado)
      : undefined;

  await prisma.$transaction((tx) => markExpiredSeparados(tx));

  return prisma.separado.findMany({
    where: {
      ...(estado ? { estado } : {}),
      ...(search
        ? {
            OR: [
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
                        {
                          producto: {
                            nombre: { contains: search, mode: 'insensitive' },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: separadoInclude,
    orderBy: [{ createdAt: 'desc' }],
    take: 100,
  });
}

export function getSeparadoDefaults() {
  const serverDate = new Date();
  const defaultFechaLimite = addOneMonth(serverDate);

  return {
    serverDate: formatDateInputValue(serverDate),
    defaultFechaLimite: formatDateInputValue(defaultFechaLimite),
    defaultDias: 30,
  };
}

export async function getSeparadoById(id: string) {
  const prisma = prismaClient();

  await prisma.$transaction((tx) => markExpiredSeparados(tx));

  const separado = await prisma.separado.findUnique({
    where: { id },
    include: separadoInclude,
  });

  if (!separado) {
    throw new AppError('El separado no existe.', 404);
  }

  return separado;
}

export async function createSeparado(payload: SeparadoPayload, usuarioId?: string) {
  const prisma = prismaClient();
  const groupedItems = groupItems(payload.items);
  const variantIds = [...groupedItems.keys()];

  const cliente = await prisma.cliente.findUnique({
    where: { id: payload.clienteId },
    select: { id: true },
  });

  if (!cliente) {
    throw new AppError('El cliente seleccionado ya no existe.', 404);
  }

  const variants = await prisma.productoVariante.findMany({
    where: { id: { in: variantIds } },
    select: {
      id: true,
      talla: true,
      color: true,
      sku: true,
      stockActual: true,
      costoPromedio: true,
      precioVenta: true,
      estado: true,
      producto: {
        select: {
          id: true,
          nombre: true,
          marca: true,
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

  const separadoItems = [...groupedItems.entries()].map(([varianteId, cantidad]) => {
    const variant = variantMap.get(varianteId);

    if (!variant) {
      throw new AppError('Una o varias variantes ya no existen.', 404);
    }

    if (variant.stockActual < cantidad) {
      throw new AppError(
        `No hay suficiente stock para separar "${variant.producto.nombre}" (${formatVariantDescriptor(variant)}). Disponible: ${variant.stockActual}.`,
        409
      );
    }

    const costoUnitario = toMoneyNumber(variant.costoPromedio);
    const precioUnitario = toMoneyNumber(variant.precioVenta);

    return {
      variante: variant,
      cantidad,
      costoUnitario,
      precioUnitario,
      subtotal: precioUnitario * cantidad,
    };
  });

  const subtotal = separadoItems.reduce((sum, item) => sum + item.subtotal, 0);
  const total = subtotal;

  if (payload.abonoInicial > total) {
    throw new AppError('El abono inicial no puede superar el total del separado.', 409);
  }

  return prisma.$transaction(async (tx) => {
    const caja = payload.abonoInicial > 0 ? await ensureOpenDailyCaja(tx, usuarioId) : null;
    const estado =
      total > 0 && payload.abonoInicial >= total
        ? EstadoSeparado.ENTREGADO
        : EstadoSeparado.ACTIVO;
    const separado = await tx.separado.create({
      data: {
        clienteId: payload.clienteId,
        usuarioId,
        estado,
        fechaLimite: payload.fechaLimite || addOneMonth(new Date()),
        subtotal,
        total,
        totalAbonado: payload.abonoInicial,
        saldoPendiente: Math.max(0, total - payload.abonoInicial),
        observaciones: payload.observaciones,
        entregadoAt: estado === EstadoSeparado.ENTREGADO ? new Date() : null,
        items: {
          create: separadoItems.map((item) => ({
            varianteId: item.variante.id,
            cantidad: item.cantidad,
            costoUnitario: item.costoUnitario,
            precioUnitario: item.precioUnitario,
            subtotal: item.subtotal,
          })),
        },
      },
    });

    let abonoId: string | null = null;

    if (payload.abonoInicial > 0 && caja) {
      const abono = await tx.separadoAbono.create({
        data: {
          separadoId: separado.id,
          usuarioId,
          cajaId: caja.id,
          metodo: payload.metodoPago,
          valor: payload.abonoInicial,
          referencia: payload.referencia,
          observacion: payload.observacionAbono,
        },
      });
      abonoId = abono.id;

      await addCajaIncomeForAbono(tx, {
        separadoId: separado.id,
        abonoId: abono.id,
        cajaId: caja.id,
        usuarioId,
        valor: payload.abonoInicial,
        descripcion: `Abono inicial separado ${separado.id.slice(-6).toUpperCase()}`,
      });
    }

    for (const item of separadoItems) {
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
          tipo: TipoMovimientoInventario.SEPARADO,
          cantidad: item.cantidad,
          stockAnterior,
          stockPosterior,
          costoUnitario: item.costoUnitario,
          precioUnitario: item.precioUnitario,
          detalle: `Separado ${separado.id.slice(-6).toUpperCase()} - ${item.variante.producto.nombre} (${formatVariantDescriptor(item.variante)})`,
          referenciaTipo: 'SEPARADO',
          referenciaId: separado.id,
        },
      });
    }

    const touchedProductIds = [...new Set(separadoItems.map((item) => item.variante.producto.id))];

    for (const productoId of touchedProductIds) {
      await refreshProductState(tx, productoId);
    }

    return {
      ...(await tx.separado.findUniqueOrThrow({
        where: { id: separado.id },
        include: separadoInclude,
      })),
      abonoId,
    };
  });
}

export async function abonarSeparado(
  id: string,
  payload: AbonoSeparadoPayload,
  usuarioId?: string
) {
  const prisma = prismaClient();

  return prisma.$transaction(async (tx) => {
    await markExpiredSeparados(tx);

    const separado = await tx.separado.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!separado) {
      throw new AppError('El separado no existe.', 404);
    }

    if (separado.estado !== EstadoSeparado.ACTIVO && separado.estado !== EstadoSeparado.VENCIDO) {
      throw new AppError('Este separado ya no acepta abonos.', 409);
    }

    const saldoPendiente = Number(separado.saldoPendiente || 0);

    if (payload.valor > saldoPendiente) {
      throw new AppError('El abono no puede superar el saldo pendiente.', 409);
    }

    const caja = await ensureOpenDailyCaja(tx, usuarioId);
    const totalAbonado = Number(separado.totalAbonado || 0) + payload.valor;
    const nextSaldo = Math.max(0, Number(separado.total || 0) - totalAbonado);
    const isFullyPaid = nextSaldo <= 0;
    const abono = await tx.separadoAbono.create({
      data: {
        separadoId: separado.id,
        usuarioId,
        cajaId: caja.id,
        metodo: payload.metodoPago,
        valor: payload.valor,
        referencia: payload.referencia,
        observacion: payload.observacion,
      },
    });

    await addCajaIncomeForAbono(tx, {
      separadoId: separado.id,
      abonoId: abono.id,
      cajaId: caja.id,
      usuarioId,
      valor: payload.valor,
      descripcion: `Abono separado ${separado.id.slice(-6).toUpperCase()}`,
    });

    await tx.separado.update({
      where: { id: separado.id },
      data: {
        totalAbonado,
        saldoPendiente: nextSaldo,
        estado: isFullyPaid ? EstadoSeparado.ENTREGADO : EstadoSeparado.ACTIVO,
        entregadoAt: isFullyPaid ? new Date() : null,
      },
    });

    return tx.separado.findUniqueOrThrow({
      where: { id: separado.id },
      include: separadoInclude,
    });
  });
}

export async function cancelarSeparado(
  id: string,
  payload: CancelacionSeparadoPayload,
  usuarioId?: string
) {
  const prisma = prismaClient();

  return prisma.$transaction(async (tx) => {
    await markExpiredSeparados(tx);

    const separado = await tx.separado.findUnique({
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

    if (!separado) {
      throw new AppError('El separado no existe.', 404);
    }

    if (separado.estado !== EstadoSeparado.ACTIVO && separado.estado !== EstadoSeparado.VENCIDO) {
      throw new AppError('Solo se pueden cancelar separados activos o vencidos.', 409);
    }

    for (const item of separado.items) {
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
          tipo: TipoMovimientoInventario.DEVOLUCION_CLIENTE,
          cantidad: item.cantidad,
          stockAnterior,
          stockPosterior,
          costoUnitario: item.costoUnitario,
          precioUnitario: item.precioUnitario,
          detalle:
            payload.observacion ||
            `Cancelacion separado ${separado.id.slice(-6).toUpperCase()}`,
          referenciaTipo: 'SEPARADO_CANCELADO',
          referenciaId: separado.id,
        },
      });
    }

    const touchedProductIds = [
      ...new Set(separado.items.map((item) => item.variante.productoId)),
    ];

    for (const productoId of touchedProductIds) {
      await refreshProductState(tx, productoId);
    }

    await tx.separado.update({
      where: { id: separado.id },
      data: {
        estado: EstadoSeparado.CANCELADO,
        canceladoAt: new Date(),
        observaciones: payload.observacion
          ? [separado.observaciones, `Cancelado: ${payload.observacion}`]
              .filter(Boolean)
              .join('\n')
          : separado.observaciones,
      },
    });

    return tx.separado.findUniqueOrThrow({
      where: { id: separado.id },
      include: separadoInclude,
    });
  });
}
