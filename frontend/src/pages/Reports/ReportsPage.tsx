import { useEffect, useState } from 'react';

import { listEventsRequest, type EventItem } from '../../api/events.api';
import {
  exportTournamentExcelRequest,
  listTournamentsRequest,
  type Tournament,
} from '../../api/tournaments.api';
import { listHackathonsRequest, type HackathonEvent } from '../../api/hackathon.api';
import Topbar from '../../components/Layout/Topbar';
import { eventTypeLabels, labelFor, tournamentSportLabels } from '../../utils/labels';

function fileSafeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function downloadCsv(fileName: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

const ReportsPage = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [hackathons, setHackathons] = useState<HackathonEvent[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([listEventsRequest(), listTournamentsRequest(), listHackathonsRequest()])
      .then(([eventData, tournamentData, hackathonData]) => {
        setEvents(eventData);
        setTournaments(tournamentData);
        setHackathons(hackathonData);
      })
      .catch(() => setError('No fue posible cargar reportes.'));
  }, []);

  async function downloadTournament(tournament: Tournament) {
    const blob = await exportTournamentExcelRequest(tournament.id);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileSafeName(tournament.name) || 'torneo'}-torneo.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadEventsCsv() {
    downloadCsv('eventos-semana-ingenieria.csv', [
      ['Evento', 'Tipo', 'Estado', 'Inicio', 'Fin', 'Espacio'],
      ...events.map((event) => [
        event.title,
        labelFor(eventTypeLabels, event.type),
        event.status,
        new Date(event.startsAt).toLocaleString('es-CO'),
        new Date(event.endsAt).toLocaleString('es-CO'),
        event.venue?.name || '',
      ]),
    ]);
  }

  return (
    <div>
      <Topbar title="Reportes" />
      <div className="space-y-6 px-6 py-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="theme-summary-card rounded-lg p-5 shadow-sm">
            <p className="theme-summary-label">Eventos</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{events.length}</p>
            <button className="mt-4 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold" type="button" onClick={downloadEventsCsv}>
              Descargar CSV
            </button>
          </div>
          <div className="theme-summary-card rounded-lg p-5 shadow-sm">
            <p className="theme-summary-label">Torneos</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{tournaments.length}</p>
            <p className="mt-2 text-sm text-slate-500">Excel individual por torneo</p>
          </div>
          <div className="theme-summary-card rounded-lg p-5 shadow-sm">
            <p className="theme-summary-label">Hackathon</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{hackathons.length}</p>
            <p className="mt-2 text-sm text-slate-500">Eventos tecnologicos configurados</p>
          </div>
        </div>

        {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-950">Reportes de torneos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] table-fixed divide-y divide-slate-200 text-sm">
              <thead className="theme-table-head">
                <tr>
                  <th className="w-[300px] px-5 py-3 text-left">Torneo</th>
                  <th className="w-[180px] px-5 py-3 text-left">Deporte</th>
                  <th className="w-[150px] px-5 py-3 text-left">Estado</th>
                  <th className="w-[130px] px-5 py-3 text-left">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tournaments.map((tournament) => (
                  <tr key={tournament.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-950">{tournament.name}</td>
                    <td className="px-5 py-4 text-slate-600">{labelFor(tournamentSportLabels, tournament.sport)}</td>
                    <td className="px-5 py-4 text-slate-600">{tournament.status}</td>
                    <td className="px-5 py-4">
                      <button className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold" type="button" onClick={() => void downloadTournament(tournament)}>
                        Excel
                      </button>
                    </td>
                  </tr>
                ))}
                {tournaments.length === 0 ? (
                  <tr>
                    <td className="px-5 py-6 text-center text-slate-500" colSpan={4}>
                      No hay torneos configurados.
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

export default ReportsPage;
