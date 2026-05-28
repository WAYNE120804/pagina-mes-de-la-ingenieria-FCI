import { MetodoPago } from '../../lib/prisma-client';
import { AppError } from '../../lib/app-error';

type SeparadoItemInput = {
  varianteId?: unknown;
  cantidad?: unknown;
};

type SeparadoInput = {
  clienteId?: unknown;
  fechaLimite?: unknown;
  items?: unknown;
  abonoInicial?: unknown;
  metodoPago?: unknown;
  referencia?: unknown;
  observacionAbono?: unknown;
  observaciones?: unknown;
};

type AbonoInput = {
  valor?: unknown;
  metodoPago?: unknown;
  referencia?: unknown;
  observacion?: unknown;
};

type CancelacionInput = {
  observacion?: unknown;
};

export type SeparadoItemPayload = {
  varianteId: string;
  cantidad: number;
};

export type SeparadoPayload = {
  clienteId: string;
  fechaLimite: Date | null;
  items: SeparadoItemPayload[];
  abonoInicial: number;
  metodoPago: MetodoPago;
  referencia: string | null;
  observacionAbono: string | null;
  observaciones: string | null;
};

export type AbonoSeparadoPayload = {
  valor: number;
  metodoPago: MetodoPago;
  referencia: string | null;
  observacion: string | null;
};

export type CancelacionSeparadoPayload = {
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

function parseSeparadoItem(input: SeparadoItemInput): SeparadoItemPayload {
  return {
    varianteId: parseRequiredString(input.varianteId, 'varianteId'),
    cantidad: parsePositiveInt(input.cantidad, 'cantidad'),
  };
}

export function parseSeparadoPayload(input: SeparadoInput): SeparadoPayload {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new AppError('Debes agregar al menos una variante al separado.');
  }

  const items = input.items.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new AppError(`El item ${index + 1} del separado no es valido.`);
    }

    return parseSeparadoItem(item as SeparadoItemInput);
  });

  const abonoInicial = parseMoney(input.abonoInicial, 'abonoInicial', true);

  return {
    clienteId: parseRequiredString(input.clienteId, 'clienteId'),
    fechaLimite: parseOptionalDate(input.fechaLimite),
    items,
    abonoInicial,
    metodoPago: input.metodoPago ? parseMetodoPago(input.metodoPago) : MetodoPago.EFECTIVO,
    referencia: parseOptionalString(input.referencia),
    observacionAbono: parseOptionalString(input.observacionAbono),
    observaciones: parseOptionalString(input.observaciones),
  };
}

export function parseAbonoSeparadoPayload(input: AbonoInput): AbonoSeparadoPayload {
  return {
    valor: parseMoney(input.valor, 'valor'),
    metodoPago: parseMetodoPago(input.metodoPago),
    referencia: parseOptionalString(input.referencia),
    observacion: parseOptionalString(input.observacion),
  };
}

export function parseCancelacionSeparadoPayload(
  input: CancelacionInput
): CancelacionSeparadoPayload {
  return {
    observacion: parseOptionalString(input.observacion),
  };
}
