import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';

import client from '../../api/client';
import { endpoints } from '../../api/endpoints';
import ErrorBanner from '../../components/common/ErrorBanner';
import Loading from '../../components/common/Loading';
import Topbar from '../../components/Layout/Topbar';
import { useAppConfig } from '../../context/AppConfigContext';
import { formatCOP } from '../../utils/money';

const formatVariantDetail = (variant: {
  color?: string | null;
  talla?: string | null;
}) => {
  const color = String(variant.color || '').toUpperCase();
  const talla = String(variant.talla || '').toUpperCase();

  if (color === 'NO APLICA' && talla === 'NO APLICA') {
    return 'Sin color ni talla';
  }

  if (color === 'NO APLICA') {
    return `Talla ${variant.talla}`;
  }

  if (talla === 'NO APLICA') {
    return `Color ${variant.color}`;
  }

  return `${variant.color}/${variant.talla}`;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDate = (value: Date | string | null | undefined) => {
  if (!value) {
    return 'Sin fecha';
  }

  return new Date(value).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatDateTime = (value: Date | string | null | undefined) => {
  if (!value) {
    return 'Sin fecha';
  }

  return new Date(value).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const buildSuggestedPayments = (separado: any) => {
  const saldo = Number(separado?.saldoPendiente || 0);

  if (!separado?.fechaLimite || saldo <= 0) {
    return [];
  }

  const start = startOfDay(new Date(separado.createdAt));
  const due = startOfDay(new Date(separado.fechaLimite));
  const durationDays = Math.max(1, Math.ceil((due.getTime() - start.getTime()) / 86400000));
  const paymentsCount = Math.max(1, Math.round((durationDays / 30) * 4));
  const baseValue = Math.floor(saldo / paymentsCount);
  const remainder = saldo - baseValue * paymentsCount;

  return Array.from({ length: paymentsCount }, (_, index) => {
    const isLast = index === paymentsCount - 1;

    return {
      number: index + 1,
      date: isLast ? due : addDays(start, 7 * (index + 1)),
      value: baseValue + (isLast ? remainder : 0),
    };
  });
};

const SeparadoTicketPage = () => {
  const { id } = useParams();
  const { config } = useAppConfig();
  const [separado, setSeparado] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSeparado = async () => {
      try {
        if (!id) {
          throw new Error('No se encontro el identificador del separado.');
        }

        const { data } = await client.get(endpoints.separadoById(id));
        setSeparado(data);
      } catch (requestError) {
        setError((requestError as Error).message);
      } finally {
        setLoading(false);
      }
    };

    void loadSeparado();
  }, [id]);

  const suggestedPayments = useMemo(() => buildSuggestedPayments(separado), [separado]);

  return (
    <div>
      <Topbar title="Tirilla de separado" />
      <div className="px-6 py-6">
        <div className="no-print mb-5 flex flex-wrap gap-3">
          <Link
            to="/separados"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700"
          >
            Volver a separados
          </Link>
          <button
            type="button"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
            onClick={() => window.print()}
          >
            Imprimir tirilla
          </button>
        </div>

        <ErrorBanner message={error} />

        {loading ? (
          <Loading label="Cargando tirilla..." />
        ) : separado ? (
          <article className="receipt-ticket mx-auto max-w-[360px] rounded-md bg-white p-5 font-mono text-[12px] leading-tight text-slate-950 shadow-sm">
            <header className="border-b border-dashed border-slate-300 pb-3 text-center">
              {config.logoDataUrl ? (
                <img
                  src={config.logoDataUrl}
                  alt={config.nombreNegocio}
                  className="mx-auto mb-2 h-14 max-w-[180px] object-contain"
                />
              ) : null}
              <h1 className="text-base font-bold uppercase">{config.nombreNegocio}</h1>
              {config.propietarioNombre ? <p>{config.propietarioNombre}</p> : null}
              {config.propietarioTelefono ? <p>Tel: {config.propietarioTelefono}</p> : null}
              {config.direccion ? <p>{config.direccion}</p> : null}
              {config.ciudad || config.departamento ? (
                <p>{[config.ciudad, config.departamento].filter(Boolean).join(' - ')}</p>
              ) : null}
            </header>

            <section className="border-b border-dashed border-slate-300 py-3">
              <div className="flex justify-between gap-3">
                <span>Separado</span>
                <strong>{String(separado.id).slice(-6).toUpperCase()}</strong>
              </div>
              <div className="flex justify-between gap-3">
                <span>Fecha</span>
                <span className="text-right">{formatDateTime(separado.createdAt)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Caduca</span>
                <strong className="text-right">{formatDate(separado.fechaLimite)}</strong>
              </div>
              <div className="flex justify-between gap-3">
                <span>Estado</span>
                <span className="text-right">{separado.estado}</span>
              </div>
              <div className="mt-2">
                <p className="font-bold">Cliente</p>
                <p>{separado.cliente?.nombreCompleto || 'N/A'}</p>
                <p>Cedula: {separado.cliente?.cedula || 'N/A'}</p>
                {separado.cliente?.telefonoCelular ? <p>Tel: {separado.cliente.telefonoCelular}</p> : null}
              </div>
            </section>

            <section className="border-b border-dashed border-slate-300 py-3">
              <div className="mb-2 grid grid-cols-[1fr_34px_72px] gap-2 text-[11px] font-bold uppercase">
                <span>Producto</span>
                <span className="text-right">Cant</span>
                <span className="text-right">Total</span>
              </div>
              <div className="space-y-2">
                {separado.items?.map((item: any) => {
                  const barcode =
                    item.variante?.codigos?.find((code: any) => code.principal)?.codigo ||
                    item.variante?.codigos?.[0]?.codigo ||
                    null;

                  return (
                    <div key={item.id} className="grid grid-cols-[1fr_34px_72px] gap-2">
                      <div>
                        <p className="font-bold">{item.variante?.producto?.nombre || 'Producto'}</p>
                        <p className="text-[11px]">
                          {formatVariantDetail(item.variante || {})}
                          {item.variante?.sku ? ` | SKU ${item.variante.sku}` : ''}
                        </p>
                        {barcode ? <p className="text-[11px]">Cod: {barcode}</p> : null}
                        <p className="text-[11px]">Vr unit: {formatCOP(item.precioUnitario)}</p>
                      </div>
                      <span className="text-right">{item.cantidad}</span>
                      <span className="text-right">{formatCOP(item.subtotal)}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="border-b border-dashed border-slate-300 py-3">
              <div className="flex justify-between">
                <span>Total</span>
                <span>{formatCOP(separado.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pago abonado</span>
                <span>{formatCOP(separado.totalAbonado)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span>Debe</span>
                <span>{formatCOP(separado.saldoPendiente)}</span>
              </div>
            </section>

            {separado.abonos?.length ? (
              <section className="border-b border-dashed border-slate-300 py-3">
                <p className="mb-2 font-bold">Abonos registrados</p>
                <div className="space-y-1">
                  {separado.abonos.map((abono: any) => (
                    <div key={abono.id} className="flex justify-between gap-3">
                      <span>{formatDate(abono.createdAt)}</span>
                      <span className="text-right">{formatCOP(abono.valor)}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="border-b border-dashed border-slate-300 py-3">
              <p className="mb-2 font-bold">Pagos sugeridos</p>
              {suggestedPayments.length > 0 ? (
                <div className="space-y-1">
                  {suggestedPayments.map((payment) => (
                    <div key={payment.number} className="grid grid-cols-[30px_1fr_82px] gap-2">
                      <span>#{payment.number}</span>
                      <span>{formatDate(payment.date)}</span>
                      <span className="text-right">{formatCOP(payment.value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p>Sin saldo pendiente.</p>
              )}
            </section>

            {separado.observaciones ? (
              <section className="border-b border-dashed border-slate-300 py-3">
                <p className="font-bold">Observaciones</p>
                <p>{separado.observaciones}</p>
              </section>
            ) : null}

            <footer className="pt-3 text-center">
              <p>Conserve esta tirilla para el seguimiento del separado.</p>
              <p className="mt-2 text-[10px]">Sistema administrativo de almacen</p>
            </footer>
          </article>
        ) : null}
      </div>
    </div>
  );
};

export default SeparadoTicketPage;
