import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  listPublicTournamentsRequest,
  type PublicTournamentOverview,
  type TournamentMatch,
} from '../../api/tournaments.api';
import {
  competitionModeLabels,
  labelFor,
  matchStatusLabels,
  tournamentPhaseLabels,
  tournamentSportLabels,
  tournamentStatusLabels,
} from '../../utils/labels';
import PublicLayout from './PublicLayout';
import { campusImage } from './publicContent';

function competitorName(match: TournamentMatch, side: 'home' | 'away') {
  if (side === 'home') {
    return match.homeTeam?.name || match.homeParticipant?.displayName || 'Por definir';
  }

  return match.awayTeam?.name || match.awayParticipant?.displayName || 'Por definir';
}

const PublicTournamentsPage = () => {
  const [tournaments, setTournaments] = useState<PublicTournamentOverview[]>([]);
  const [activeId, setActiveId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listPublicTournamentsRequest()
      .then((data) => {
        setTournaments(data);
        setActiveId(data[0]?.id || '');
      })
      .catch(() => setError('No fue posible cargar los torneos publicados.'))
      .finally(() => setLoading(false));
  }, []);

  const activeTournament = tournaments.find((item) => item.id === activeId) || tournaments[0];
  const matchesByPhase = useMemo(() => {
    return (activeTournament?.matches || []).reduce<Record<string, TournamentMatch[]>>((groups, match) => {
      groups[match.phase] = groups[match.phase] || [];
      groups[match.phase].push(match);
      return groups;
    }, {});
  }, [activeTournament]);

  const registrationCount = activeTournament
    ? activeTournament.mode === 'TEAM'
      ? activeTournament._count?.teams || 0
      : activeTournament._count?.participants || 0
    : 0;
  const activeVenue = activeTournament?.venue || activeTournament?.matches?.find((match) => match.venue)?.venue || null;
  const activeVenueImage = activeVenue?.photoUrl || campusImage;

  return (
    <PublicLayout>
      <main className="mx-auto max-w-7xl px-4 py-12 md:px-12">
        <section className="mb-12 border-l-4 border-[#5adf82] pl-6">
          <h1 className="font-display text-5xl font-extrabold leading-tight text-[#f0ffed]">Centro de Torneos</h1>
          <p className="mt-4 max-w-2xl text-[#b9cbb8]">
            Torneos, fixtures y tablas publicados desde el panel administrativo.
          </p>
        </section>

        {loading ? (
          <p className="rounded-xl border border-[#3b4b3c] bg-[#1d2022] p-6 text-[#b9cbb8]">
            Cargando torneos publicados...
          </p>
        ) : error ? (
          <p className="rounded-xl border border-[#ffb4ab]/30 bg-[#93000a]/20 p-6 text-[#ffb4ab]">{error}</p>
        ) : tournaments.length === 0 ? (
          <p className="rounded-xl border border-[#3b4b3c] bg-[#1d2022] p-6 text-[#b9cbb8]">
            Aun no hay torneos publicados desde el panel administrativo.
          </p>
        ) : (
          <>
            <section className="mb-10 flex flex-wrap gap-3 rounded-2xl border border-[#3b4b3c] bg-[#1d2022] p-2">
              {tournaments.map((tournament) => (
                <button
                  key={tournament.id}
                  className={[
                    'inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold transition-colors',
                    tournament.id === activeTournament?.id
                      ? 'bg-[#5adf82] text-[#003917]'
                      : 'text-[#b9cbb8] hover:bg-[#272a2c] hover:text-[#5adf82]',
                  ].join(' ')}
                  type="button"
                  onClick={() => setActiveId(tournament.id)}
                >
                  <span className="material-symbols-outlined">
                    {tournament.sport === 'FUTBOL'
                      ? 'sports_soccer'
                      : tournament.sport === 'ROBOTICA'
                        ? 'smart_toy'
                        : tournament.sport === 'VIDEOJUEGOS'
                          ? 'sports_esports'
                          : 'grid_view'}
                  </span>
                  {tournament.name}
                </button>
              ))}
            </section>

            <div className="grid gap-5 lg:grid-cols-12">
              <section className="relative overflow-hidden rounded-3xl border border-[#3b4b3c] bg-[#191c1e] p-6 lg:col-span-8 md:p-8">
                <div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-[#5adf82]/10 blur-3xl" />
                <div className="relative z-10 mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <span className="rounded-full bg-[#5adf82]/10 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-[#5adf82]">
                      {activeTournament ? labelFor(tournamentStatusLabels, activeTournament.status) : ''}
                    </span>
                    <h2 className="mt-4 font-display text-3xl font-bold text-[#f0ffed]">{activeTournament?.name}</h2>
                    <p className="mt-2 text-sm text-[#b9cbb8]">
                      {activeTournament
                        ? `${labelFor(tournamentSportLabels, activeTournament.sport)} - ${labelFor(
                            competitionModeLabels,
                            activeTournament.mode
                          )} - ${registrationCount} inscritos`
                        : ''}
                    </p>
                    <p className="mt-2 inline-flex items-center gap-2 text-sm text-[#b9cbb8]">
                      <span className="material-symbols-outlined text-sm text-[#5adf82]">location_on</span>
                      {activeVenue?.name || 'Sitio por confirmar'}
                    </p>
                  </div>
                  {activeTournament?.status === 'REGISTRATION_OPEN' ? (
                    <Link
                      className="rounded-xl bg-[#5adf82] px-5 py-3 font-bold text-[#003917]"
                      to={`/public/torneos/${activeTournament.id}/inscripcion`}
                    >
                      Inscribirse
                    </Link>
                  ) : null}
                </div>

                {Object.keys(matchesByPhase).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#3b4b3c] bg-[#101415] p-8 text-center text-[#b9cbb8]">
                    No hay partidos publicados para este torneo.
                  </div>
                ) : (
                  <div className="overflow-x-auto pb-3">
                    <div className="flex min-w-[820px] gap-5 py-4">
                      {Object.entries(matchesByPhase).map(([phase, matches]) => (
                        <div key={phase} className="w-64 shrink-0 space-y-4">
                          <p className="text-center font-mono text-xs uppercase tracking-widest text-[#849584]">
                            {labelFor(tournamentPhaseLabels, phase)}
                          </p>
                          {matches.map((match) => (
                            <article key={match.id} className="rounded-xl border border-[#3b4b3c] bg-[#1d2022] p-4">
                              <div className="flex justify-between gap-3 border-b border-[#3b4b3c] pb-3">
                                <span className="font-semibold text-[#f0ffed]">{competitorName(match, 'home')}</span>
                                <span className="font-mono font-bold text-[#5adf82]">{match.homeScore}</span>
                              </div>
                              <div className="flex justify-between gap-3 pt-3">
                                <span className="text-[#b9cbb8]">{competitorName(match, 'away')}</span>
                                <span className="font-mono font-bold text-[#5adf82]">{match.awayScore}</span>
                              </div>
                              <p className="mt-3 rounded-full bg-[#323537] px-3 py-1 text-center font-mono text-[10px] uppercase text-[#b9cbb8]">
                                {labelFor(matchStatusLabels, match.status)}
                              </p>
                              <p className="mt-2 text-center text-xs text-[#849584]">
                                {match.venue?.name || activeVenue?.name || 'Sitio por confirmar'}
                              </p>
                            </article>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <aside className="space-y-5 lg:col-span-4">
                <section className="rounded-3xl border border-[#3b4b3c] bg-[#191c1e] p-6">
                  <div className="mb-6 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5adf82]/20 text-[#5adf82]">
                      <span className="material-symbols-outlined">format_list_numbered</span>
                    </span>
                    <h2 className="font-display text-2xl font-bold text-[#f0ffed]">Tabla</h2>
                  </div>
                  {activeTournament?.standings?.length ? (
                    <div className="space-y-3">
                      {activeTournament.standings.slice(0, 8).map((standing) => (
                        <div key={standing.id} className="grid grid-cols-6 items-center rounded-xl border border-[#3b4b3c] bg-[#1d2022] p-3">
                          <div className="col-span-3 flex items-center gap-3">
                            <span className="h-2 w-2 rounded-full bg-[#5adf82]" />
                            <span className="truncate font-bold text-[#e0e3e5]">
                              {standing.team?.name || standing.participant?.displayName || 'Competidor'}
                            </span>
                          </div>
                          <span className="text-center font-mono font-bold text-[#5adf82]">{standing.points}</span>
                          <span className="text-center font-mono text-[#b9cbb8]">{standing.won}</span>
                          <span className="text-center font-mono text-[#b9cbb8]">{standing.lost}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm leading-6 text-[#b9cbb8]">
                      Aun no hay tabla de posiciones para este torneo.
                    </p>
                  )}
                </section>
                <section className="rounded-3xl bg-[#5adf82] p-6 text-[#003917]">
                  <h2 className="font-display text-2xl font-bold">{activeTournament?.name}</h2>
                  <p className="mt-3 text-sm leading-6 text-[#003917]/80">
                    {activeTournament?.description || 'Informacion publicada desde el panel administrativo.'}
                  </p>
                  {activeTournament?.status === 'REGISTRATION_OPEN' ? (
                    <Link
                      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#003917] px-5 py-3 font-bold text-[#5adf82]"
                      to={`/public/torneos/${activeTournament.id}/inscripcion`}
                    >
                      Inscribete aqui
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </Link>
                  ) : null}
                </section>
              </aside>
            </div>

            <section className="mt-5 grid gap-5 md:grid-cols-3">
              {tournaments.map((item) => (
                <article key={item.id} className="rounded-2xl border border-[#3b4b3c] bg-[#1d2022] p-6">
                  <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#5adf82]">
                    {labelFor(tournamentStatusLabels, item.status)}
                  </span>
                  <h3 className="mt-4 font-display text-xl font-bold text-[#f0ffed]">{item.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#b9cbb8]">
                    {item.description || labelFor(tournamentSportLabels, item.sport)}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3 text-xs text-[#b9cbb8]">
                    <span className="rounded-full bg-[#323537] px-3 py-1">
                      {item.mode === 'TEAM'
                        ? `${item._count?.teams || 0}${item.maxTeams ? `/${item.maxTeams}` : ''} equipos`
                        : `${item._count?.participants || 0}${item.maxParticipants ? `/${item.maxParticipants}` : ''} participantes`}
                    </span>
                    <span className="rounded-full bg-[#323537] px-3 py-1">{labelFor(tournamentSportLabels, item.sport)}</span>
                    <span className="rounded-full bg-[#323537] px-3 py-1">{item.venue?.name || 'Sin sitio'}</span>
                  </div>
                </article>
              ))}
              <article className="relative overflow-hidden rounded-2xl border border-[#3b4b3c] md:col-span-2">
                <img className="h-64 w-full object-cover" src={activeVenueImage} alt={activeVenue?.name || 'Ubicacion de encuentros'} />
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-[#0b0f10] to-transparent p-6">
                  <div>
                    <h3 className="font-display text-2xl font-extrabold text-[#f0ffed]">
                      {activeVenue?.name || 'Sitio por confirmar'}
                    </h3>
                    <p className="mt-1 text-sm text-[#b9cbb8]">
                      {activeVenue
                        ? activeVenue.location || 'Ubicacion pendiente desde administracion.'
                        : 'Consulta el espacio asignado en cada partido publicado por administracion.'}
                    </p>
                  </div>
                </div>
              </article>
            </section>
          </>
        )}
      </main>
    </PublicLayout>
  );
};

export default PublicTournamentsPage;
