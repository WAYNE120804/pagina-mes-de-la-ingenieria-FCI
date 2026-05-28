import {
  EstadoCredito,
  EstadoProducto,
  Prisma,
  TipoMovimientoCaja,
  TipoMovimientoInventario,
} from '../../lib/prisma-client';
import { AppError } from '../../lib/app-error';
import { getPrisma } from '../../lib/prisma';
import { ensureOpenDailyCaja } from '../cajas/caja.service';
import type {
  CancelacionCreditoPayload,
  CreditoPayload,
  PagoCreditoPayload,
} from './credito.schemas';

function prismaClient() {
  const prisma = getPrisma();

  if (!prisma) {
    throw new AppError('DATABASE_URL no esta configurado en el backend.', 500);
  }

  return prisma;
}

const creditoInclude = Prisma.validator<Prisma.CreditoInclude>()({
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
  pagos: {
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

function groupItems(items: CreditoPayload['items']) {
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

async function markExpiredCreditos(tx: Prisma.TransactionClient) {
  await tx.credito.updateMany({
    where: {
      estado: EstadoCredito.ACTIVO,
      fechaLimite: {
        lt: new Date(),
      },
    },
    data: {
      estado: EstadoCredito.VENCIDO,
    },
  });
}

async function addCajaIncomeForPago(
  tx: Prisma.TransactionClient,
  input: {
    creditoId: string;
    pagoId: string;
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
      referenciaTipo: 'CREDITO_PAGO',
      referenciaId: input.pagoId,
    },
  });
}

export function getCreditoDefaults() {
  const serverDate = new Date();
  const defaultFechaLimite = addOneMonth(serverDate);

  return {
    serverDate: formatDateInputValue(serverDate),
    defaultFechaLimite: formatDateInputValue(defaultFechaLimite),
    defaultDias: 30,
  };
}

export async function listCreditos(filters?: { search?: string; estado?: string }) {
  const prisma = prismaClient();
  const search = filters?.search?.trim();
  const estado =
    typeof filters?.estado === 'string' && filters.estado in EstadoCredito
      ? (filters.estado as EstadoCredito)
      : undefined;

  await prisma.$transaction((tx) => markExpiredCreditos(tx));

  return prisma.credito.findMany({
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
    include: creditoInclude,
    orderBy: [{ createdAt: 'desc' }],
    take: 100,
  });
}

export async function getCreditoById(id: string) {
  const prisma = prismaClient();

  await prisma.$transaction((tx) => markExpiredCreditos(tx));

  const credito = await prisma.credito.findUnique({
    where: { id },
    include: creditoInclude,
  });

  if (!credito) {
    throw new AppError('El credito no existe.', 404);
  }

  return credito;
}

export async function createCredito(payload: CreditoPayload, usuarioId?: string) {
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

  const creditoItems = [...groupedItems.entries()].map(([varianteId, cantidad]) => {
    const variant = variantMap.get(varianteId);

    if (!variant) {
      throw new AppError('Una o varias variantes ya no existen.', 404);
    }

    if (variant.stockActual < cantidad) {
      throw new AppError(
        `No hay suficiente stock para fiar "${variant.producto.nombre}" (${formatVariantDescriptor(variant)}). Disponible: ${variant.stockActual}.`,
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

  const subtotal = creditoItems.reduce((sum, item) => sum + item.subtotal, 0);
  const total = subtotal;

  if (payload.pagoInicial > total) {
    throw new AppError('El pago inicial no puede superar el total del credito.', 409);
  }

  return prisma.$transaction(async (tx) => {
    const caja = payload.pagoInicial > 0 ? await ensureOpenDailyCaja(tx, usuarioId) : null;
    const estado = payload.pagoInicial >= total ? EstadoCredito.PAGADO : EstadoCredito.ACTIVO;
    const credito = await tx.credito.create({
      data: {
        clienteId: payload.clienteId,
        usuarioId,
        estado,
        fechaInicio: new Date(),
        fechaLimite: payload.fechaLimite || addOneMonth(new Date()),
        subtotal,
        total,
        totalPagado: payload.pagoInicial,
        saldoPendiente: Math.max(0, total - payload.pagoInicial),
        observaciones: payload.observaciones,
        entregadoAt: new Date(),
        items: {
          create: creditoItems.map((item) => ({
            varianteId: item.variante.id,
            cantidad: item.cantidad,
            costoUnitario: item.costoUnitario,
            precioUnitario: item.precioUnitario,
            subtotal: item.subtotal,
          })),
        },
      },
    });

    if (payload.pagoInicial > 0 && caja) {
      const pago = await tx.creditoPago.create({
        data: {
          creditoId: credito.id,
          usuarioId,
          cajaId: caja.id,
          metodo: payload.metodoPago,
          valor: payload.pagoInicial,
          referencia: payload.referencia,
          observacion: payload.observacionPago,
        },
      });

      await addCajaIncomeForPago(tx, {
        creditoId: credito.id,
        pagoId: pago.id,
        cajaId: caja.id,
        usuarioId,
        valor: payload.pagoInicial,
        descripcion: `Pago inicial credito ${credito.id.slice(-6).toUpperCase()}`,
      });
    }

    for (const item of creditoItems) {
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
          tipo: TipoMovimientoInventario.CREDITO,
          cantidad: item.cantidad,
          stockAnterior,
          stockPosterior,
          costoUnitario: item.costoUnitario,
          precioUnitario: item.precioUnitario,
          detalle: `Credito ${credito.id.slice(-6).toUpperCase()} - ${item.variante.producto.nombre} (${formatVariantDescriptor(item.variante)})`,
          referenciaTipo: 'CREDITO',
          referenciaId: credito.id,
        },
      });
    }

    const touchedProductIds = [...new Set(creditoItems.map((item) => item.variante.producto.id))];

    for (const productoId of touchedProductIds) {
      await refreshProductState(tx, productoId);
    }

    return tx.credito.findUniqueOrThrow({
      where: { id: credito.id },
      include: creditoInclude,
    });
  });
}

export async function pagarCredito(id: string, payload: PagoCreditoPayload, usuarioId?: string) {
  const prisma = prismaClient();

  return prisma.$transaction(async (tx) => {
    await markExpiredCreditos(tx);

    const credito = await tx.credito.findUnique({
      where: { id },
    });

    if (!credito) {
      throw new AppError('El credito no existe.', 404);
    }

    if (credito.estado !== EstadoCredito.ACTIVO && credito.estado !== EstadoCredito.VENCIDO) {
      throw new AppError('Este credito ya no acepta pagos.', 409);
    }

    const saldoPendiente = Number(credito.saldoPendiente || 0);

    if (payload.valor > saldoPendiente) {
      throw new AppError('El pago no puede superar el saldo pendiente.', 409);
    }

    const caja = await ensureOpenDailyCaja(tx, usuarioId);
    const totalPagado = Number(credito.totalPagado || 0) + payload.valor;
    const nextSaldo = Math.max(0, Number(credito.total || 0) - totalPagado);
    const isFullyPaid = nextSaldo <= 0;
    const pago = await tx.creditoPago.create({
      data: {
        creditoId: credito.id,
        usuarioId,
        cajaId: caja.id,
        metodo: payload.metodoPago,
        valor: payload.valor,
        referencia: payload.referencia,
        observacion: payload.observacion,
      },
    });

    await addCajaIncomeForPago(tx, {
      creditoId: credito.id,
      pagoId: pago.id,
      cajaId: caja.id,
      usuarioId,
      valor: payload.valor,
      descripcion: `Pago credito ${credito.id.slice(-6).toUpperCase()}`,
    });

    await tx.credito.update({
      where: { id: credito.id },
      data: {
        totalPagado,
        saldoPendiente: nextSaldo,
        estado: isFullyPaid ? EstadoCredito.PAGADO : EstadoCredito.ACTIVO,
      },
    });

    return tx.credito.findUniqueOrThrow({
      where: { id: credito.id },
      include: creditoInclude,
    });
  });
}

export async function cancelarCredito(
  id: string,
  payload: CancelacionCreditoPayload,
  usuarioId?: string
) {
  const prisma = prismaClient();

  return prisma.$transaction(async (tx) => {
    await markExpiredCreditos(tx);

    const credito = await tx.credito.findUnique({
      where: { id },
    });

    if (!credito) {
      throw new AppError('El credito no existe.', 404);
    }

    if (credito.estado !== EstadoCredito.ACTIVO && credito.estado !== EstadoCredito.VENCIDO) {
      throw new AppError('Solo se pueden cancelar creditos activos o vencidos.', 409);
    }

    await tx.credito.update({
      where: { id: credito.id },
      data: {
        estado: EstadoCredito.CANCELADO,
        canceladoAt: new Date(),
        observaciones: payload.observacion
          ? [credito.observaciones, `Cancelado por ${usuarioId || 'sistema'}: ${payload.observacion}`]
              .filter(Boolean)
              .join('\n')
          : credito.observaciones,
      },
    });

    return tx.credito.findUniqueOrThrow({
      where: { id: credito.id },
      include: creditoInclude,
    });
  });
}
