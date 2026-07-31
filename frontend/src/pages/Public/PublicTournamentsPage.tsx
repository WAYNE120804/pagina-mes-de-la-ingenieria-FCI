import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import {
  listPublicTournamentsRequest,
  type PublicTournamentOverview,
  type TournamentMatch,
  type TournamentTeam,
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

const phaseOrder = ['FASE_GRUPOS', 'OCTAVOS', 'CUARTOS', 'SEMIFINAL', 'FINAL'];
const judgedSports = ['MARATON_PROGRAMACION', 'CAPTURA_BANDERA'];

function groupMatchesByGroup(matches: TournamentMatch[]) {
  return Object.entries(
    matches.reduce<Record<string, TournamentMatch[]>>((groups, match) => {
      const groupName = match.group?.name || 'Grupo unico';
      groups[groupName] = groups[groupName] || [];
      groups[groupName].push(match);
      return groups;
    }, {})
  ).sort(([first], [second]) => first.localeCompare(second, 'es'));
}

function sportIcon(sport: string) {
  if (sport === 'FUTBOL') return 'sports_soccer';
  if (sport === 'ROBOTICA') return 'smart_toy';
  if (sport === 'VIDEOJUEGOS') return 'sports_esports';
  if (sport === 'MARATON_PROGRAMACION') return 'code';
  if (sport === 'CAPTURA_BANDERA') return 'flag';
  return 'grid_view';
}

function tournamentSlug(tournament: Pick<PublicTournamentOverview, 'id' | 'name'>) {
  const slug = tournament.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return slug || tournament.id;
}

function memberName(member: TournamentTeam['members'][number]) {
  return member.fullName || member.user?.name || 'Integrante';
}

const PublicTournamentsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tournaments, setTournaments] = useState<PublicTournamentOverview[]>([]);
  const [activeId, setActiveId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listPublicTournamentsRequest()
      .then((data) => {
        setTournaments(data);
        const requestedTournament = searchParams.get('torneo') || '';
        const requestedMatch = data.find(
          (tournament) => tournament.id === requestedTournament || tournamentSlug(tournament) === requestedTournament
        );
        setActiveId(requestedMatch?.id || data[0]?.id || '');
      })
      .catch(() => setError('No fue posible cargar los torneos publicados.'))
      .finally(() => setLoading(false));
  }, [searchParams]);

  function selectTournament(tournament: PublicTournamentOverview) {
    setActiveId(tournament.id);
    setSearchParams({ torneo: tournamentSlug(tournament) });
  }

  const activeTournament = tournaments.find((item) => item.id === activeId) || tournaments[0];
  const matchesByPhase = useMemo(() => {
    const grouped = (activeTournament?.matches || []).reduce<Record<string, TournamentMatch[]>>((groups, match) => {
      groups[match.phase] = groups[match.phase] || [];
      groups[match.phase].push(match);
      return groups;
    }, {});

    return Object.entries(grouped).sort(([first], [second]) => {
      const firstIndex = phaseOrder.indexOf(first);
      const secondIndex = phaseOrder.indexOf(second);
      return (firstIndex === -1 ? 99 : firstIndex) - (secondIndex === -1 ? 99 : secondIndex);
    });
  }, [activeTournament]);
  const standingsByGroup = useMemo(() => {
    return Object.entries(
      (activeTournament?.standings || []).reduce<Record<string, PublicTournamentOverview['standings']>>(
        (groups, standing) => {
          const groupName = standing.group?.name || 'General';
          groups[groupName] = groups[groupName] || [];
          groups[groupName].push(standing);
          return groups;
        },
        {}
      )
    ).sort(([first], [second]) => first.localeCompare(second, 'es'));
  }, [activeTournament]);

  const registrationCount = activeTournament
    ? activeTournament.mode === 'TEAM'
      ? activeTournament._count?.teams || 0
      : activeTournament._count?.participants || 0
    : 0;
  const activeVenue = activeTournament?.venue || activeTournament?.matches?.find((match) => match.venue)?.venue || null;
  const activeVenueImage = activeVenue?.photoUrl || campusImage;
  const isJudgedTournament = Boolean(activeTournament && judgedSports.includes(activeTournament.sport));
  const rankedStandings = [...(activeTournament?.standings || [])].sort((first, second) => {
    const firstRank = first.rank || 999;
    const secondRank = second.rank || 999;
    return firstRank - secondRank || second.points - first.points;
  });

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
            Aún no hay torneos publicados desde el panel administrativo.
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
                  onClick={() => selectTournament(tournament)}
                >
                  <span className="material-symbols-outlined">
                    {sportIcon(tournament.sport)}
                  </span>
                  {tournament.name}
                </button>
              ))}
            </section>

            <div className="grid gap-5 lg:grid-cols-12">
              <section className="relative overflow-hidden rounded-3xl border border-[#3b4b3c] bg-[#191c1e] p-4 lg:col-span-8 md:p-6">
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
                  {activeTournament && activeTournament.status !== 'FINISHED' && activeTournament.status !== 'CANCELLED' ? (
                    <Link
                      className="rounded-xl bg-[#5adf82] px-5 py-3 font-bold text-[#003917]"
                      to={`/public/torneos/${tournamentSlug(activeTournament)}/inscripcion`}
                    >
                      Inscribirse
                    </Link>
                  ) : null}
                </div>

                {isJudgedTournament ? (
                  <section className="rounded-3xl border border-[#3b4b3c] bg-[#0b0f10]/70 p-4 shadow-2xl md:p-5">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#3b4b3c] pb-4">
                      <div>
                        <p className="font-mono text-xs font-bold uppercase tracking-[0.35em] text-[#5adf82]">
                          Ranking público
                        </p>
                        <h3 className="mt-1 font-display text-2xl font-bold text-[#f0ffed]">
                          Resultados por jurados
                        </h3>
                      </div>
                      <span className="rounded-full bg-[#5adf82]/10 px-3 py-1 font-mono text-xs font-bold text-[#5adf82]">
                        {rankedStandings.length} equipos
                      </span>
                    </div>

                    {rankedStandings.length ? (
                      <div className="grid gap-4">
                        {rankedStandings.map((standing, index) => {
                          const rank = standing.rank || index + 1;
                          return (
                            <article key={standing.id} className="rounded-2xl border border-[#3b4b3c] bg-[#101415] p-5">
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="flex min-w-0 items-start gap-4">
                                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#5adf82] font-display text-2xl font-extrabold text-[#003917]">
                                    {rank}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="font-display text-xl font-bold text-[#f0ffed]">
                                      {standing.team?.name || 'Equipo'}
                                    </p>
                                    <p className="mt-1 text-sm text-[#b9cbb8]">
                                      {standing.team?.members?.length || 0} integrantes registrados
                                    </p>
                                  </div>
                                </div>
                                <div className="rounded-2xl bg-[#1d2022] px-4 py-3 text-right">
                                  <p className="font-mono text-xs uppercase tracking-widest text-[#849584]">Puntos</p>
                                  <p className="font-mono text-2xl font-extrabold text-[#5adf82]">{standing.points}</p>
                                </div>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-2 border-t border-[#3b4b3c] pt-4">
                                {(standing.team?.members || []).map((member) => (
                                  <span key={member.id} className="rounded-full bg-[#1d2022] px-3 py-1 text-xs text-[#d8f3d5]">
                                    {memberName(member)}
                                    {member.isCaptain ? ' - Capitan' : ''}
                                  </span>
                                ))}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[#3b4b3c] bg-[#101415] p-8 text-center text-[#b9cbb8]">
                        Aún no hay resultados publicados por jurados.
                      </div>
                    )}
                  </section>
                ) : matchesByPhase.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#3b4b3c] bg-[#101415] p-8 text-center text-[#b9cbb8]">
                    No hay partidos publicados para este torneo.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {matchesByPhase.map(([phase, matches]) => {
                      const groupedMatches =
                        phase === 'FASE_GRUPOS'
                          ? groupMatchesByGroup(matches)
                          : [[labelFor(tournamentPhaseLabels, phase), matches] as [string, TournamentMatch[]]];

                      return (
                        <section key={phase} className="rounded-3xl border border-[#3b4b3c] bg-[#0b0f10]/70 p-3 shadow-2xl md:p-4">
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#3b4b3c] pb-4">
                            <div>
                              <p className="font-mono text-xs font-bold uppercase tracking-[0.35em] text-[#5adf82]">
                                {labelFor(tournamentPhaseLabels, phase)}
                              </p>
                              <h3 className="mt-1 font-display text-2xl font-bold text-[#f0ffed]">
                                {phase === 'FASE_GRUPOS' ? 'Grupos publicados' : 'Llave final'}
                              </h3>
                            </div>
                            <span className="rounded-full bg-[#5adf82]/10 px-3 py-1 font-mono text-xs font-bold text-[#5adf82]">
                              {matches.length} partidos
                            </span>
                          </div>

                          <div className={phase === 'FASE_GRUPOS' ? 'grid gap-5 2xl:grid-cols-2' : 'grid gap-4'}>
                            {groupedMatches.map(([groupName, groupMatches]) => (
                              <div key={groupName} className="rounded-2xl border border-[#3b4b3c] bg-[#1d2022] p-4 md:p-5">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5adf82] font-display text-lg font-extrabold text-[#003917]">
                                      {groupName.replace('Grupo ', '').slice(0, 2)}
                                    </span>
                                    <div>
                                      <p className="font-display text-xl font-bold text-[#f0ffed]">{groupName}</p>
                                      <p className="text-xs text-[#849584]">{groupMatches.length} encuentros</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  {groupMatches.map((match) => (
                                    <article key={match.id} className="rounded-2xl border border-[#3b4b3c] bg-[#101415] p-5">
                                      <div className="grid grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)] items-center gap-4">
                                        <div className="min-w-0">
                                          <p className="break-words text-lg font-bold leading-snug text-[#f0ffed]">{competitorName(match, 'home')}</p>
                                          <p className="mt-2 font-mono text-2xl font-extrabold text-[#5adf82]">{match.homeScore}</p>
                                        </div>
                                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5adf82] text-xs font-black text-[#003917]">VS</span>
                                        <div className="min-w-0 text-right">
                                          <p className="break-words text-lg font-bold leading-snug text-[#f0ffed]">{competitorName(match, 'away')}</p>
                                          <p className="mt-2 font-mono text-2xl font-extrabold text-[#5adf82]">{match.awayScore}</p>
                                        </div>
                                      </div>
                                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#3b4b3c] pt-3 text-xs text-[#b9cbb8]">
                                        <span className="rounded-full bg-[#323537] px-3 py-1 font-mono uppercase">
                                          {labelFor(matchStatusLabels, match.status)}
                                        </span>
                                        <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-[#1d2022] px-3 py-1">
                                          <span className="material-symbols-outlined text-sm text-[#5adf82]">schedule</span>
                                          Programacion por definir
                                        </span>
                                        <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-[#1d2022] px-3 py-1">
                                          <span className="material-symbols-outlined text-sm text-[#5adf82]">location_on</span>
                                          {match.venue?.name || activeVenue?.name || 'Sitio por confirmar'}
                                        </span>
                                      </div>
                                    </article>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}
              </section>

              <aside className="space-y-5 lg:col-span-4">
                <section className="rounded-3xl border border-[#3b4b3c] bg-[#191c1e] p-6">
                  <div className="mb-6 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5adf82]/20 text-[#5adf82]">
                      <span className="material-symbols-outlined">format_list_numbered</span>
                    </span>
                    <h2 className="font-display text-2xl font-bold text-[#f0ffed]">
                      {activeTournament?.format === 'KNOCKOUT' ? 'Ranking' : 'Tabla'}
                    </h2>
                  </div>
                  {activeTournament?.standings?.length ? (
                    <div className="space-y-3">
                      {standingsByGroup.map(([groupName, standings]) => (
                        <div key={groupName} className="rounded-2xl border border-[#3b4b3c] bg-[#101415] p-3">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#5adf82]">
                              {groupName}
                            </span>
                            <span className="text-xs text-[#849584]">Pts / G / P</span>
                          </div>
                          <div className="space-y-2">
                            {standings.slice(0, 8).map((standing) => (
                              <div key={standing.id} className="grid grid-cols-6 items-center rounded-xl border border-[#3b4b3c] bg-[#1d2022] p-3">
                                <div className="col-span-3 flex min-w-0 items-center gap-3">
                                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#5adf82]" />
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
                        </div>
                      ))}
                      {activeTournament.format === 'KNOCKOUT' ? (
                        <p className="text-xs leading-5 text-[#849584]">
                          En eliminacion directa el ranking se actualiza por partidos ganados y puntos del marcador.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm leading-6 text-[#b9cbb8]">
                      Aún no hay tabla de posiciones para este torneo.
                    </p>
                  )}
                </section>
                <section className="rounded-3xl bg-[#5adf82] p-6 text-[#003917]">
                  <h2 className="font-display text-2xl font-bold">{activeTournament?.name}</h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#003917]/80">
                    {activeTournament?.description || 'Información publicada desde el panel administrativo.'}
                  </p>
                  {activeTournament && activeTournament.status !== 'FINISHED' && activeTournament.status !== 'CANCELLED' ? (
                    <Link
                      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#003917] px-5 py-3 font-bold text-[#5adf82]"
                      to={`/public/torneos/${tournamentSlug(activeTournament)}/inscripcion`}
                    >
                      Inscribete aquí
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
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#b9cbb8]">
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
                <img className="h-64 w-full object-cover" src={activeVenueImage} alt={activeVenue?.name || 'Ubicación de encuentros'} />
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-[#0b0f10] to-transparent p-6">
                  <div>
                    <h3 className="font-display text-2xl font-extrabold text-[#f0ffed]">
                      {activeVenue?.name || 'Sitio por confirmar'}
                    </h3>
                    <p className="mt-1 text-sm text-[#b9cbb8]">
                      {activeVenue
                        ? activeVenue.location || 'Ubicación pendiente desde administracion.'
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
