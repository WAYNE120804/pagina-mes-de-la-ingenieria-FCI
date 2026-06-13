import { FormEvent, useEffect, useMemo, useState } from 'react';

import { listAuditLogsRequest, type AuditLogRow, type AuditMeta } from '../../api/audit.api';
import Topbar from '../../components/Layout/Topbar';

const actionLabels: Record<string, string> = {
  LOGIN: 'Inicio de sesion',
  LOGOUT: 'Cierre de sesion',
  CREATE: 'Creacion',
  UPDATE: 'Actualizacion',
  DELETE: 'Eliminacion',
  EVALUATE: 'Evaluacion',
  MATCH_CREATE: 'Partido creado',
  MATCH_UPDATE: 'Partido actualizado',
  ADMIN_CHANGE: 'Cambio administrativo',
};

const entityLabels: Record<string, string> = {
  Attendance: 'Asistencia',
  Event: 'Evento',
  Hackathon: 'Hackathon',
  Match: 'Partido',
  PublicSetting: 'Configuracion publica',
  Speaker: 'Ponente',
  Talk: 'Charla/Taller',
  Tournament: 'Torneo',
  TournamentRegistration: 'Inscripcion torneo',
  TournamentStanding: 'Tabla torneo',
  User: 'Usuario',
  Venue: 'Espacio',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function labelFor(map: Record<string, string>, value: string | null | undefined) {
  if (!value) {
    return 'Sin dato';
  }

  return map[value] || value;
}

function summarizeBrowser(userAgent: string | null) {
  if (!userAgent) {
    return 'No registrado';
  }

  if (userAgent.includes('Edg/')) {
    return 'Microsoft Edge';
  }

  if (userAgent.includes('Chrome/')) {
    return 'Chrome';
  }

  if (userAgent.includes('Firefox/')) {
    return 'Firefox';
  }

  return userAgent.slice(0, 80);
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) {
    return 'Sin dato';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value, null, 2);
}

function AuditDetails({ row }: { row: AuditLogRow }) {
  return (
    <details className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
      <summary className="cursor-pointer font-semibold text-slate-800">Ver datos registrados</summary>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div>
          <p className="mb-1 font-semibold text-slate-700">Antes</p>
          <pre className="max-h-44 overflow-auto whitespace-pre-wrap rounded-md bg-white p-3 text-[11px] leading-5">
            {formatValue(row.oldValues)}
          </pre>
        </div>
        <div>
          <p className="mb-1 font-semibold text-slate-700">Despues</p>
          <pre className="max-h-44 overflow-auto whitespace-pre-wrap rounded-md bg-white p-3 text-[11px] leading-5">
            {formatValue(row.newValues)}
          </pre>
        </div>
      </div>
    </details>
  );
}

const AuditPage = () => {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [meta, setMeta] = useState<AuditMeta | null>(null);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadAudit(filters?: { search?: string; action?: string; entity?: string }) {
    setLoading(true);
    setError('');

    try {
      const result = await listAuditLogsRequest({
        limit: 50,
        search: filters?.search || undefined,
        action: filters?.action || undefined,
        entity: filters?.entity || undefined,
      });

      setLogs(result.logs);
      setMeta(result.meta || null);
    } catch {
      setError('No fue posible cargar los registros de auditoria.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAudit();
  }, []);

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadAudit({ search, action, entity });
  }

  const entities = useMemo(() => meta?.byEntity.map((item) => item.entity).sort() || [], [meta]);
  const actions = useMemo(() => meta?.byAction.map((item) => item.action).sort() || [], [meta]);

  return (
    <div>
      <Topbar title="Auditoria" />
      <div className="space-y-6 px-6 py-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="theme-summary-card rounded-lg p-5 shadow-sm">
            <p className="theme-summary-label">Registros</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{meta?.total || logs.length}</p>
          </div>
          <div className="theme-summary-card rounded-lg p-5 shadow-sm">
            <p className="theme-summary-label">Usuarios activos en bitacora</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">
              {new Set(logs.map((log) => log.actor?.id).filter(Boolean)).size}
            </p>
          </div>
          <div className="theme-summary-card rounded-lg p-5 shadow-sm">
            <p className="theme-summary-label">Modulos auditados</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{meta?.byEntity.length || 0}</p>
          </div>
        </div>

        <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_220px_220px_auto]" onSubmit={submitFilters}>
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Buscar por usuario, correo o modulo"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={action}
            onChange={(event) => setAction(event.target.value)}
          >
            <option value="">Todas las acciones</option>
            {actions.map((item) => (
              <option key={item} value={item}>
                {labelFor(actionLabels, item)}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={entity}
            onChange={(event) => setEntity(event.target.value)}
          >
            <option value="">Todos los modulos</option>
            {entities.map((item) => (
              <option key={item} value={item}>
                {labelFor(entityLabels, item)}
              </option>
            ))}
          </select>
          <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white" type="submit">
            Filtrar
          </button>
        </form>

        {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-950">Bitacora operativa</h3>
            <p className="mt-1 text-sm text-slate-500">
              Registra quien hizo la accion, cuando ocurrio, sobre que modulo y que datos cambiaron.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[1280px] table-fixed divide-y divide-slate-200 text-sm">
              <thead className="theme-table-head">
                <tr>
                  <th className="w-[190px] px-5 py-3 text-left">Fecha y hora</th>
                  <th className="w-[240px] px-5 py-3 text-left">Usuario</th>
                  <th className="w-[170px] px-5 py-3 text-left">Accion</th>
                  <th className="w-[170px] px-5 py-3 text-left">Modulo</th>
                  <th className="w-[300px] px-5 py-3 text-left">Detalle</th>
                  <th className="w-[140px] px-5 py-3 text-left">IP</th>
                  <th className="w-[170px] px-5 py-3 text-left">Navegador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td className="px-5 py-6 text-center text-slate-500" colSpan={7}>
                      Cargando registros...
                    </td>
                  </tr>
                ) : logs.length ? (
                  logs.map((row) => (
                    <tr key={row.id} className="align-top hover:bg-slate-50">
                      <td className="px-5 py-4 font-medium text-slate-950">{formatDate(row.createdAt)}</td>
                      <td className="px-5 py-4 text-slate-600">
                        <span className="block font-semibold text-slate-900">{row.actor?.name || 'Sistema'}</span>
                        <span className="block break-all text-xs">{row.actor?.email || 'Sin usuario asociado'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {labelFor(actionLabels, row.action)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <span className="block font-semibold text-slate-900">{labelFor(entityLabels, row.entity)}</span>
                        {row.entityId ? <span className="block break-all text-xs">{row.entityId}</span> : null}
                      </td>
                      <td className="space-y-2 px-5 py-4 text-slate-600">
                        <p>{row.summary || 'Accion registrada sin detalle adicional.'}</p>
                        <AuditDetails row={row} />
                      </td>
                      <td className="px-5 py-4 text-slate-600">{row.ipAddress || 'No registrada'}</td>
                      <td className="px-5 py-4 text-slate-600">{summarizeBrowser(row.userAgent)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-5 py-6 text-center text-slate-500" colSpan={7}>
                      No hay registros para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AuditPage;
