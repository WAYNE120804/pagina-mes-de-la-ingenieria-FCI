import { useEffect, useState } from 'react';

import { listEventsRequest, type EventItem } from '../../api/events.api';
import { listTournamentsRequest, type Tournament } from '../../api/tournaments.api';
import Topbar from '../../components/Layout/Topbar';
import { eventTypeLabels, labelFor, tournamentSportLabels } from '../../utils/labels';

type AuditRow = {
  id: string;
  module: string;
  action: string;
  detail: string;
  status: string;
};

const AuditPage = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([listEventsRequest(), listTournamentsRequest()])
      .then(([eventData, tournamentData]) => {
        setEvents(eventData);
        setTournaments(tournamentData);
      })
      .catch(() => setError('No fue posible cargar auditoria operativa.'));
  }, []);

  const rows: AuditRow[] = [
    ...events.map((event) => ({
      id: `event-${event.id}`,
      module: 'Eventos',
      action: labelFor(eventTypeLabels, event.type),
      detail: event.title,
      status: event.status,
    })),
    ...tournaments.map((tournament) => ({
      id: `tournament-${tournament.id}`,
      module: 'Torneos',
      action: labelFor(tournamentSportLabels, tournament.sport),
      detail: tournament.name,
      status: tournament.status,
    })),
  ];

  return (
    <div>
      <Topbar title="Auditoria" />
      <div className="space-y-6 px-6 py-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="theme-summary-card rounded-lg p-5 shadow-sm">
            <p className="theme-summary-label">Registros</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{rows.length}</p>
          </div>
          <div className="theme-summary-card rounded-lg p-5 shadow-sm">
            <p className="theme-summary-label">Eventos</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{events.length}</p>
          </div>
          <div className="theme-summary-card rounded-lg p-5 shadow-sm">
            <p className="theme-summary-label">Torneos</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{tournaments.length}</p>
          </div>
        </div>

        {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-950">Bitacora operativa</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] table-fixed divide-y divide-slate-200 text-sm">
              <thead className="theme-table-head">
                <tr>
                  <th className="w-[150px] px-5 py-3 text-left">Modulo</th>
                  <th className="w-[180px] px-5 py-3 text-left">Tipo</th>
                  <th className="w-[320px] px-5 py-3 text-left">Detalle</th>
                  <th className="w-[140px] px-5 py-3 text-left">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-950">{row.module}</td>
                    <td className="px-5 py-4 text-slate-600">{row.action}</td>
                    <td className="px-5 py-4 text-slate-600">{row.detail}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-5 py-6 text-center text-slate-500" colSpan={4}>
                      No hay registros para mostrar.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AuditPage;
