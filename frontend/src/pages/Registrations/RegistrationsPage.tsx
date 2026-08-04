import { useEffect, useMemo, useState } from 'react';

import {
  listAttendanceRequest,
  listEventsRequest,
  updateAttendanceStatusRequest,
  type AttendanceItem,
  type EventItem,
} from '../../api/events.api';
import { getApiErrorMessage } from '../../api/client';
import {
  getTournamentRegistrationsRequest,
  listTournamentsRequest,
  type Tournament,
  type TournamentRegistrations,
} from '../../api/tournaments.api';
import Topbar from '../../components/Layout/Topbar';
import RegistrationsModal, { type RegistrationModalRow } from '../../components/common/RegistrationsModal';
import {
  attendanceMethodLabels,
  attendanceStatusLabels,
  eventStatusLabels,
  eventTypeLabels,
  labelFor,
  tournamentSportLabels,
  tournamentStatusLabels,
} from '../../utils/labels';

type ActivityRow =
  | {
      kind: 'event';
      id: string;
      title: string;
      category: string;
      status: string;
      venue: string;
      count?: number | null;
      source: EventItem;
    }
  | {
      kind: 'tournament';
      id: string;
      title: string;
      category: string;
      status: string;
      venue: string;
      count?: number | null;
      source: Tournament;
    };

const emptyTournamentRegistrations: TournamentRegistrations = {
  teams: [],
  participants: [],
};

const RegistrationsPage = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<ActivityRow | null>(null);
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceItem[]>([]);
  const [selectedTournamentRegistrations, setSelectedTournamentRegistrations] =
    useState<TournamentRegistrations>(emptyTournamentRegistrations);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadData() {
    const [eventData, tournamentData] = await Promise.all([
      listEventsRequest(),
      listTournamentsRequest(),
    ]);

    setEvents(eventData.filter((event) => event.type !== 'HACKATHON'));
    setTournaments(tournamentData);
  }

  useEffect(() => {
    loadData().catch(() => setError('No fue posible cargar las actividades.'));
  }, []);

  const activities = useMemo<ActivityRow[]>(() => {
    const eventRows: ActivityRow[] = events.map((event) => ({
      kind: 'event',
      id: event.id,
      title: event.title,
      category: labelFor(eventTypeLabels, event.type),
      status: labelFor(eventStatusLabels, event.status),
      venue: event.venue?.name || 'Sin espacio',
      count: null,
      source: event,
    }));

    const tournamentRows: ActivityRow[] = tournaments.map((tournament) => ({
      kind: 'tournament',
      id: tournament.id,
      title: tournament.name,
      category: `Torneo - ${labelFor(tournamentSportLabels, tournament.sport)}`,
      status: labelFor(tournamentStatusLabels, tournament.status),
      venue: tournament.venue?.name || 'Sin sitio',
      count:
        tournament.mode === 'TEAM'
          ? tournament._count?.teams || 0
          : tournament._count?.participants || 0,
      source: tournament,
    }));

    return [...eventRows, ...tournamentRows]
      .filter((activity) => {
        if (typeFilter && activity.kind !== typeFilter) {
          return false;
        }

        const text = `${activity.title} ${activity.category} ${activity.venue}`.toLowerCase();
        return !search || text.includes(search.toLowerCase());
      })
      .sort((a, b) => a.title.localeCompare(b.title, 'es'));
  }, [events, tournaments, search, typeFilter]);

  const modalRows = useMemo<RegistrationModalRow[]>(() => {
    if (selectedActivity?.kind === 'event') {
      return selectedAttendance.map((item) => ({
        id: item.id,
        group: item.teamName || selectedActivity.category,
        name: item.user?.name || item.fullName || '',
        email: item.user?.email || item.email || '',
        phone: item.phone || '',
        identifier: item.user?.universityCode || item.identifier || '',
        status: labelFor(attendanceStatusLabels, item.status),
        detail: labelFor(attendanceMethodLabels, item.method),
        actionLabel: item.status === 'CHECKED_IN' ? 'Desconfirmar ingreso' : 'Confirmar ingreso',
      }));
    }

    if (selectedActivity?.kind === 'tournament') {
      const tournament = selectedActivity.source;

      if (tournament.mode === 'TEAM') {
        return selectedTournamentRegistrations.teams.flatMap((team) =>
          team.members.map((member) => ({
            id: member.id,
            group: team.name,
            name: member.fullName || member.user?.name || '',
            email: member.email || member.user?.email || '',
            phone: member.phone || '',
            identifier: member.identifier || member.user?.universityCode || '',
            status: team.status,
            detail: member.isCaptain ? 'Capitan' : 'Integrante',
          }))
        );
      }

      return selectedTournamentRegistrations.participants.map((participant) => ({
        id: participant.id,
        group: tournament.name,
        name: participant.displayName || participant.user?.name || '',
        email: participant.email || participant.user?.email || '',
        phone: participant.phone || '',
        identifier: participant.identifier || participant.user?.universityCode || '',
        status: participant.status,
        detail: participant.seed ? `Semilla ${participant.seed}` : 'Participante',
      }));
    }

    return [];
  }, [selectedActivity, selectedAttendance, selectedTournamentRegistrations]);

  async function openActivity(activity: ActivityRow) {
    try {
      setError('');
      setMessage('');
      setSelectedActivity(activity);

      if (activity.kind === 'event') {
        setSelectedAttendance(await listAttendanceRequest(activity.id));
        setSelectedTournamentRegistrations(emptyTournamentRegistrations);
      } else {
        setSelectedTournamentRegistrations(await getTournamentRegistrationsRequest(activity.id));
        setSelectedAttendance([]);
      }

      setShowModal(true);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No fue posible cargar los inscritos de la actividad.'));
    }
  }

  async function toggleAttendance(row: RegistrationModalRow) {
    if (selectedActivity?.kind !== 'event') {
      return;
    }

    const current = selectedAttendance.find((item) => item.id === row.id);

    if (!current) {
      return;
    }

    const nextStatus = current.status === 'CHECKED_IN' ? 'REGISTERED' : 'CHECKED_IN';
    const updated = await updateAttendanceStatusRequest(current.id, nextStatus);
    setSelectedAttendance((items) =>
      items.map((item) => (item.id === updated.id ? updated : item))
    );
  }

  return (
    <div>
      <Topbar title="Inscritos" />
      <div className="space-y-6 px-6 py-6">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Buscar actividad"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="">Todos</option>
              <option value="event">Eventos y competencias</option>
              <option value="tournament">Torneos</option>
            </select>
            <button
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
              type="button"
              onClick={() => void loadData()}
            >
              Actualizar
            </button>
          </div>
        </section>

        {message ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-950">Actividades con inscripciones</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="theme-table-head">
                <tr>
                  <th className="px-5 py-3 text-left">Actividad</th>
                  <th className="px-5 py-3 text-left">Tipo</th>
                  <th className="px-5 py-3 text-left">Lugar</th>
                  <th className="px-5 py-3 text-left">Estado</th>
                  <th className="px-5 py-3 text-left">Inscritos</th>
                  <th className="px-5 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activities.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-slate-500" colSpan={6}>
                      No hay actividades para mostrar.
                    </td>
                  </tr>
                ) : null}
                {activities.map((activity) => (
                  <tr key={`${activity.kind}-${activity.id}`}>
                    <td className="px-5 py-3 font-semibold text-slate-950">{activity.title}</td>
                    <td className="px-5 py-3 text-slate-600">{activity.category}</td>
                    <td className="px-5 py-3 text-slate-600">{activity.venue}</td>
                    <td className="px-5 py-3 text-slate-600">{activity.status}</td>
                    <td className="px-5 py-3 text-slate-600">{activity.count ?? 'Ver lista'}</td>
                    <td className="px-5 py-3">
                      <button
                        className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold"
                        type="button"
                        onClick={() => void openActivity(activity)}
                      >
                        Ver inscritos
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <RegistrationsModal
        open={showModal}
        title={`Inscritos - ${selectedActivity?.title || 'Actividad'}`}
        description={selectedActivity?.category}
        rows={modalRows}
        emptyMessage="Esta actividad no tiene inscritos registrados."
        onClose={() => setShowModal(false)}
        onRowAction={selectedActivity?.kind === 'event' ? (row) => void toggleAttendance(row) : undefined}
        onNotice={setMessage}
      />
    </div>
  );
};

export default RegistrationsPage;
