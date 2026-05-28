import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';

import client from '../../api/client';
import { endpoints } from '../../api/endpoints';
import ErrorBanner from '../../components/common/ErrorBanner';
import Loading from '../../components/common/Loading';
import Topbar from '../../components/Layout/Topbar';
import { useAppConfig } from '../../context/AppConfigContext';
import { formatCOP } from '../../utils/money';

const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString('es-CO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Sin fecha';

const CreditoPagoTicketPage = () => {
  const { id, pagoId } = useParams();
  const { config } = useAppConfig();
  const [credito, setCredito] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCredito = async () => {
      try {
        if (!id || !pagoId) throw new Error('No se encontro el identificador del recibo.');
        const { data } = await client.get(endpoints.creditoById(id));
        setCredito(data);
      } catch (requestError) {
        setError((requestError as Error).message);
      } finally {
        setLoading(false);
      }
    };

    void loadCredito();
  }, [id, pagoId]);

  const pago = useMemo(
    () => credito?.pagos?.find((item: any) => item.id === pagoId) || null,
    [credito, pagoId]
  );

  return (
    <div>
      <Topbar title="Recibo de cuota" />
      <div className="px-6 py-6">
        <div className="no-print mb-5 flex flex-wrap gap-3">
          <Link to="/creditos" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700">
            Volver a creditos
          </Link>
          <button type="button" className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white" onClick={() => window.print()}>
            Imprimir recibo
          </button>
        </div>

        <ErrorBanner message={error} />

        {loading ? (
          <Loading label="Cargando recibo..." />
        ) : credito && pago ? (
          <article className="receipt-ticket mx-auto max-w-[360px] rounded-md bg-white p-5 font-mono text-[12px] leading-tight text-slate-950 shadow-sm">
            <header className="border-b border-dashed border-slate-300 pb-3 text-center">
              {config.logoDataUrl ? <img src={config.logoDataUrl} alt={config.nombreNegocio} className="mx-auto mb-2 h-14 max-w-[180px] object-contain" /> : null}
              <h1 className="text-base font-bold uppercase">{config.nombreNegocio}</h1>
              {config.propietarioNombre ? <p>{config.propietarioNombre}</p> : null}
              {config.propietarioTelefono ? <p>Tel: {config.propietarioTelefono}</p> : null}
              {config.direccion ? <p>{config.direccion}</p> : null}
              {config.ciudad || config.departamento ? <p>{[config.ciudad, config.departamento].filter(Boolean).join(' - ')}</p> : null}
            </header>

            <section className="border-b border-dashed border-slate-300 py-3">
              <div className="flex justify-between gap-3">
                <span>Recibo cuota</span>
                <strong>{String(pago.id).slice(-6).toUpperCase()}</strong>
              </div>
              <div className="flex justify-between gap-3">
                <span>Credito</span>
                <strong>{String(credito.id).slice(-6).toUpperCase()}</strong>
              </div>
              <div className="flex justify-between gap-3">
                <span>Fecha pago</span>
                <span className="text-right">{formatDateTime(pago.createdAt)}</span>
              </div>
              <div className="mt-2">
                <p className="font-bold">Cliente</p>
                <p>{credito.cliente?.nombreCompleto || 'N/A'}</p>
                <p>Cedula: {credito.cliente?.cedula || 'N/A'}</p>
              </div>
            </section>

            <section className="border-b border-dashed border-slate-300 py-3">
              <div className="flex justify-between text-sm font-bold">
                <span>Valor recibido</span>
                <span>{formatCOP(pago.valor)}</span>
              </div>
              <div className="mt-2 flex justify-between">
                <span>Total credito</span>
                <span>{formatCOP(credito.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total pagado</span>
                <span>{formatCOP(credito.totalPagado)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span>Saldo pendiente</span>
                <span>{formatCOP(credito.saldoPendiente)}</span>
              </div>
            </section>

            <section className="border-b border-dashed border-slate-300 py-3">
              <div className="flex justify-between">
                <span>Metodo</span>
                <span>{pago.metodo}</span>
              </div>
              {pago.referencia ? (
                <div className="flex justify-between gap-3">
                  <span>Referencia</span>
                  <span className="text-right">{pago.referencia}</span>
                </div>
              ) : null}
              {pago.observacion ? (
                <div className="mt-2">
                  <p className="font-bold">Observacion</p>
                  <p>{pago.observacion}</p>
                </div>
              ) : null}
            </section>

            <footer className="pt-3 text-center">
              <p>Recibo de pago de credito.</p>
              <p className="mt-2 text-[10px]">Sistema administrativo de almacen</p>
            </footer>
          </article>
        ) : (
          <EmptyReceipt />
        )}
      </div>
    </div>
  );
};

const EmptyReceipt = () => (
  <div className="mx-auto max-w-md rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
    No se encontro el pago solicitado.
  </div>
);

export default CreditoPagoTicketPage;
