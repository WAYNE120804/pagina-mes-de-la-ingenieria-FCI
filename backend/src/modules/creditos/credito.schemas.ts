import { MetodoPago } from '../../lib/prisma-client';
import { AppError } from '../../lib/app-error';

type CreditoItemInput = {
  varianteId?: unknown;
  cantidad?: unknown;
};

type CreditoInput = {
  clienteId?: unknown;
  fechaLimite?: unknown;
  items?: unknown;
  pagoInicial?: unknown;
  metodoPago?: unknown;
  referencia?: unknown;
  observacionPago?: unknown;
  observaciones?: unknown;
};

type PagoInput = {
  valor?: unknown;
  metodoPago?: unknown;
  referencia?: unknown;
  observacion?: unknown;
};

type CancelacionInput = {
  observacion?: unknown;
};

export type CreditoItemPayload = {
  varianteId: string;
  cantidad: number;
};

export type CreditoPayload = {
  clienteId: string;
  fechaLimite: Date | null;
  items: CreditoItemPayload[];
  pagoInicial: number;
  metodoPago: MetodoPago;
  referencia: string | null;
  observacionPago: string | null;
  observaciones: string | null;
};

export type PagoCreditoPayload = {
  valor: number;
  metodoPago: MetodoPago;
  referencia: string | null;
  observacion: string | null;
};

export type CancelacionCreditoPayload = {
  observacion: string | null;
};

function parseRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(`El campo "${fieldName}" es obligatorio.`);
  }

  return value.trim();
}

function parseOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function parsePositiveInt(value: unknown, fieldName: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new AppError(`El campo "${fieldName}" debe ser mayor que cero.`);
  }

  return Math.trunc(parsed);
}

function parseMoney(value: unknown, fieldName: string, allowZero = false) {
  const parsed = Number(value || 0);
  const isValid = Number.isFinite(parsed) && (allowZero ? parsed >= 0 : parsed > 0);

  if (!isValid) {
    throw new AppError(`El campo "${fieldName}" debe ser mayor que cero.`);
  }

  return parsed;
}

function parseMetodoPago(value: unknown) {
  if (typeof value === 'string' && value in MetodoPago) {
    return value as MetodoPago;
  }

  throw new AppError('Debes seleccionar un metodo de pago valido.');
}

function parseOptionalDate(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError('La fecha limite no es valida.');
  }

  return date;
}

function parseCreditoItem(input: CreditoItemInput): CreditoItemPayload {
  return {
    varianteId: parseRequiredString(input.varianteId, 'varianteId'),
    cantidad: parsePositiveInt(input.cantidad, 'cantidad'),
  };
}

export function parseCreditoPayload(input: CreditoInput): CreditoPayload {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new AppError('Debes agregar al menos una variante al credito.');
  }

  const items = input.items.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new AppError(`El item ${index + 1} del credito no es valido.`);
    }

    return parseCreditoItem(item as CreditoItemInput);
  });

  return {
    clienteId: parseRequiredString(input.clienteId, 'clienteId'),
    fechaLimite: parseOptionalDate(input.fechaLimite),
    items,
    pagoInicial: parseMoney(input.pagoInicial, 'pagoInicial', true),
    metodoPago: input.metodoPago ? parseMetodoPago(input.metodoPago) : MetodoPago.EFECTIVO,
    referencia: parseOptionalString(input.referencia),
    observacionPago: parseOptionalString(input.observacionPago),
    observaciones: parseOptionalString(input.observaciones),
  };
}

export function parsePagoCreditoPayload(input: PagoInput): PagoCreditoPayload {
  return {
    valor: parseMoney(input.valor, 'valor'),
    metodoPago: parseMetodoPago(input.metodoPago),
    referencia: parseOptionalString(input.referencia),
    observacion: parseOptionalString(input.observacion),
  };
}

export function parseCancelacionCreditoPayload(input: CancelacionInput): CancelacionCreditoPayload {
  return {
    observacion: parseOptionalString(input.observacion),
  };
}
