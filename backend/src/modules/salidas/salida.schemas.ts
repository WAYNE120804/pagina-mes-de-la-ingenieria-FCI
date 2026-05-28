import { EstadoSalidaProducto, TipoSalidaProducto } from '../../lib/prisma-client';
import { AppError } from '../../lib/app-error';

type SalidaItemInput = {
  varianteId?: unknown;
  cantidad?: unknown;
  observacion?: unknown;
};

type SalidaInput = {
  clienteId?: unknown;
  tipo?: unknown;
  responsableNombre?: unknown;
  responsableCedula?: unknown;
  responsableTelefono?: unknown;
  destino?: unknown;
  fechaCompromiso?: unknown;
  observaciones?: unknown;
  items?: unknown;
};

type CierreInput = {
  estado?: unknown;
  valorRecibido?: unknown;
  observaciones?: unknown;
  devolverInventario?: unknown;
};

export type SalidaItemPayload = {
  varianteId: string;
  cantidad: number;
  observacion: string | null;
};

export type SalidaPayload = {
  clienteId: string | null;
  tipo: TipoSalidaProducto;
  tipoOperacion: string;
  responsableNombre: string;
  responsableCedula: string | null;
  responsableTelefono: string | null;
  destino: string | null;
  fechaCompromiso: Date | null;
  observaciones: string | null;
  items: SalidaItemPayload[];
};

export type CierreSalidaPayload = {
  estado: EstadoSalidaProducto;
  valorRecibido: number | null;
  observaciones: string | null;
  devolverInventario: boolean;
};

const tipoLabels: Record<string, string> = {
  PRESTAMO: 'Prestamo',
  CONSIGNACION: 'Consignacion',
  ENVIO_OTRO_ALMACEN: 'Envio a otro almacen',
  TRUEQUE: 'Trueque',
  DEVOLUCION: 'Devolucion',
  OTRO: 'Otro',
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

function parseOptionalMoney(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new AppError('El valor recibido debe ser un numero valido.');
  }

  return parsed;
}

function parseOptionalDate(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError('La fecha de compromiso no es valida.');
  }

  return date;
}

function parseTipoSalida(value: unknown) {
  const raw = parseRequiredString(value, 'tipo').toUpperCase();

  if (!tipoLabels[raw]) {
    throw new AppError('Debes seleccionar un tipo de salida valido.');
  }

  if (raw === 'ENVIO_OTRO_ALMACEN' || raw === 'DEVOLUCION') {
    return {
      tipo: TipoSalidaProducto.OTRO,
      tipoOperacion: raw,
    };
  }

  return {
    tipo: raw as TipoSalidaProducto,
    tipoOperacion: raw,
  };
}

function parseEstadoCierre(value: unknown) {
  if (typeof value === 'string' && value in EstadoSalidaProducto) {
    return value as EstadoSalidaProducto;
  }

  throw new AppError('Debes seleccionar un estado de cierre valido.');
}

function parseSalidaItem(input: SalidaItemInput): SalidaItemPayload {
  return {
    varianteId: parseRequiredString(input.varianteId, 'varianteId'),
    cantidad: parsePositiveInt(input.cantidad, 'cantidad'),
    observacion: parseOptionalString(input.observacion),
  };
}

export function parseSalidaPayload(input: SalidaInput): SalidaPayload {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new AppError('Debes agregar al menos una variante a la salida.');
  }

  const tipo = parseTipoSalida(input.tipo);
  const items = input.items.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new AppError(`El item ${index + 1} de la salida no es valido.`);
    }

    return parseSalidaItem(item as SalidaItemInput);
  });

  return {
    clienteId: parseOptionalString(input.clienteId),
    ...tipo,
    responsableNombre: parseRequiredString(input.responsableNombre, 'responsableNombre'),
    responsableCedula: parseOptionalString(input.responsableCedula),
    responsableTelefono: parseOptionalString(input.responsableTelefono),
    destino: parseOptionalString(input.destino),
    fechaCompromiso: parseOptionalDate(input.fechaCompromiso),
    observaciones: parseOptionalString(input.observaciones),
    items,
  };
}

export function parseCierreSalidaPayload(input: CierreInput): CierreSalidaPayload {
  return {
    estado: parseEstadoCierre(input.estado),
    valorRecibido: parseOptionalMoney(input.valorRecibido),
    observaciones: parseOptionalString(input.observaciones),
    devolverInventario: Boolean(input.devolverInventario),
  };
}

export function getTipoOperacionLabel(value: string) {
  return tipoLabels[value] || value;
}
