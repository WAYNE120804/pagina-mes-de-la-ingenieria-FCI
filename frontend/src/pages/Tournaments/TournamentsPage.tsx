import { FormEvent, useEffect, useMemo, useState } from 'react';

import {
  createTournamentRequest,
  closeMatchRequest,
  createManualMatchRequest,
  deleteIndividualParticipantRequest,
  deleteTeamRegistrationRequest,
  deleteTournamentRequest,
  exportTournamentExcelRequest,
  generateTournamentFixtureRequest,
  generateTournamentGroupsRequest,
  getTournamentStandingsRequest,
  getTournamentFixtureRequest,
  getTournamentRegistrationsRequest,
  getPublicTournamentFormRequest,
  getPublicTournamentQrSvgRequest,
  listTournamentsRequest,
  recalculateTournamentStandingsRequest,
  updateIndividualParticipantRequest,
  updateMatchScoreRequest,
  updateTeamRegistrationRequest,
  updateTournamentRequest,
  type Tournament,
  type TournamentFixture,
  type TournamentParticipant,
  type TournamentRegistrations,
  type TournamentStanding,
  type TournamentTeam,
} from '../../api/tournaments.api';
import Topbar from '../../components/Layout/Topbar';
import FormModal from '../../components/common/FormModal';
import { listVenuesRequest, type Venue } from '../../api/venues.api';
import {
  competitionModeLabels,
  labelFor,
  matchStatusLabels,
  tournamentFormatLabels,
  tournamentPhaseLabels,
  tournamentRulePresetLabels,
  tournamentSportLabels,
  tournamentStatusLabels,
  videoGameTitleLabels,
} from '../../utils/labels';

const sports = Object.keys(tournamentSportLabels);
const formats = Object.keys(tournamentFormatLabels);
const statuses = Object.keys(tournamentStatusLabels);
const videoGames = Object.keys(videoGameTitleLabels);
const phases = Object.keys(tournamentPhaseLabels);

type TournamentForm = {
  id?: string;
  name: string;
  sport: string;
  format: string;
  status: string;
  videoGameTitle: string;
  venueId: string;
  description: string;
  rules: string;
  maxTeams: string;
  maxMembersPerTeam: string;
  maxParticipants: string;
  startsAt: string;
  endsAt: string;
};

type FixtureForm = {
  groupCount: string;
  overwriteGroups: boolean;
  overwriteFixture: boolean;
};

type MatchForm = {
  groupId: string;
  venueId: string;
  homeId: string;
  awayId: string;
  phase: string;
  scheduledAt: string;
};

type ScoreInputs = Record<string, { homeScore: string; awayScore: string }>;
type TeamMemberEditForm = {
  userId?: string | null;
  fullName: string;
  identifier: string;
  email: string;
  isCaptain: boolean;
};

type TeamEditForm = {
  name: string;
  logoUrl: string;
  members: TeamMemberEditForm[];
};

type ParticipantEditForm = {
  displayName: string;
  identifier: string;
  email: string;
  seed: string;
};

const emptyForm: TournamentForm = {
  name: '',
  sport: 'FUTBOL',
  format: 'MIXED',
  status: 'DRAFT',
  videoGameTitle: '',
  venueId: '',
  description: '',
  rules: '',
  maxTeams: '',
  maxMembersPerTeam: '',
  maxParticipants: '',
  startsAt: '',
  endsAt: '',
};

const emptyFixtureForm: FixtureForm = {
  groupCount: '2',
  overwriteGroups: false,
  overwriteFixture: false,
};

const emptyMatchForm: MatchForm = {
  groupId: '',
  venueId: '',
  homeId: '',
  awayId: '',
  phase: 'FASE_GRUPOS',
  scheduledAt: '',
};

const emptyMemberForm: TeamMemberEditForm = {
  userId: null,
  fullName: '',
  identifier: '',
  email: '',
  isCaptain: false,
};

function modeForSport(sport: string) {
  return ['VIDEOJUEGOS', 'PING_PONG', 'AJEDREZ'].includes(sport) ? 'INDIVIDUAL' : 'TEAM';
}

function defaultFormatForSport(sport: string) {
  if (sport === 'FUTBOL' || sport === 'BALONCESTO') {
    return 'MIXED';
  }

  if (sport === 'ROBOTICA' || sport === 'VIDEOJUEGOS') {
    return 'ROUND_ROBIN';
  }

  return 'KNOCKOUT';
}

function toLocalInputValue(value?: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Sin horario';
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const TournamentsPage = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [form, setForm] = useState<TournamentForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [filterSport, setFilterSport] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [error, setError] = useState('');
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistrations>({
    teams: [],
    participants: [],
  });
  const [fixture, setFixture] = useState<TournamentFixture>({
    groups: [],
    matches: [],
  });
  const [standings, setStandings] = useState<TournamentStanding[]>([]);
  const [fixtureForm, setFixtureForm] = useState<FixtureForm>(emptyFixtureForm);
  const [matchForm, setMatchForm] = useState<MatchForm>(emptyMatchForm);
  const [registrationError, setRegistrationError] = useState('');
  const [fixtureError, setFixtureError] = useState('');
  const [scoreInputs, setScoreInputs] = useState<ScoreInputs>({});
  const [publicRegistrationLink, setPublicRegistrationLink] = useState('');
  const [publicRegistrationQrSvg, setPublicRegistrationQrSvg] = useState('');
  const [publicFormTournament, setPublicFormTournament] = useState<Tournament | null>(null);
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TournamentTeam | null>(null);
  const [teamEditForm, setTeamEditForm] = useState<TeamEditForm>({ name: '', logoUrl: '', members: [] });
  const [selectedParticipant, setSelectedParticipant] = useState<TournamentParticipant | null>(null);
  const [participantEditForm, setParticipantEditForm] = useState<ParticipantEditForm>({
    displayName: '',
    identifier: '',
    email: '',
    seed: '',
  });

  const mode = useMemo(() => modeForSport(form.sport), [form.sport]);

  async function loadTournaments() {
    const [data, venueData] = await Promise.all([
      listTournamentsRequest({
        search: search || undefined,
        sport: filterSport || undefined,
        status: filterStatus || undefined,
      }),
      listVenuesRequest(),
    ]);
    setTournaments(data);
    setVenues(venueData);
  }

  useEffect(() => {
    loadTournaments().catch(() => setError('No fue posible cargar los torneos.'));
  }, []);

  function resetForm() {
    setForm(emptyForm);
  }

  function openCreateTournamentModal() {
    setForm(emptyForm);
    setError('');
    setShowTournamentModal(true);
  }

  function closeTournamentModal() {
    setShowTournamentModal(false);
    setForm(emptyForm);
  }

  function changeSport(sport: string) {
    setForm({
      ...form,
      sport,
      format: defaultFormatForSport(sport),
      videoGameTitle: sport === 'VIDEOJUEGOS' ? form.videoGameTitle || 'FIFA' : '',
      maxTeams: modeForSport(sport) === 'TEAM' ? form.maxTeams : '',
      maxMembersPerTeam: modeForSport(sport) === 'TEAM' ? form.maxMembersPerTeam : '',
      maxParticipants: modeForSport(sport) === 'INDIVIDUAL' ? form.maxParticipants : '',
    });
  }

  function editTournament(tournament: Tournament) {
    setForm({
      id: tournament.id,
      name: tournament.name,
      sport: tournament.sport,
      format: tournament.format,
      status: tournament.status,
      videoGameTitle: tournament.videoGameTitle || '',
      venueId: tournament.venue?.id || tournament.venueId || '',
      description: tournament.description || '',
      rules: tournament.rules || '',
      maxTeams: tournament.maxTeams ? String(tournament.maxTeams) : '',
      maxMembersPerTeam: tournament.maxMembersPerTeam ? String(tournament.maxMembersPerTeam) : '',
      maxParticipants: tournament.maxParticipants ? String(tournament.maxParticipants) : '',
      startsAt: toLocalInputValue(tournament.startsAt),
      endsAt: toLocalInputValue(tournament.endsAt),
    });
    setShowTournamentModal(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const payload = {
      name: form.name,
      sport: form.sport,
      mode,
      format: form.format,
      status: form.status,
      videoGameTitle: form.sport === 'VIDEOJUEGOS' ? form.videoGameTitle || 'FIFA' : null,
      venueId: form.venueId || null,
      description: form.description || null,
      rules: form.rules || null,
      maxTeams: mode === 'TEAM' && form.maxTeams ? Number(form.maxTeams) : null,
      maxMembersPerTeam:
        mode === 'TEAM' && form.maxMembersPerTeam ? Number(form.maxMembersPerTeam) : null,
      maxParticipants: mode === 'INDIVIDUAL' && form.maxParticipants ? Number(form.maxParticipants) : null,
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
    };

    try {
      if (form.id) {
        await updateTournamentRequest(form.id, payload);
      } else {
        await createTournamentRequest(payload);
      }

      resetForm();
      setShowTournamentModal(false);
      await loadTournaments();
    } catch {
      setError('No fue posible guardar el torneo. Revisa la modalidad y los datos.');
    }
  }

  async function applyFilters() {
    setError('');
    await loadTournaments().catch(() => setError('No fue posible aplicar los filtros.'));
  }

  async function removeTournament(id: string) {
    if (!confirm('Eliminar este torneo?')) {
      return;
    }

    await deleteTournamentRequest(id);
    await loadTournaments();
    if (selectedTournament?.id === id) {
      setSelectedTournament(null);
      setRegistrations({ teams: [], participants: [] });
      setFixture({ groups: [], matches: [] });
      setStandings([]);
    }
  }

  async function selectTournament(tournament: Tournament) {
    setRegistrationError('');
    setFixtureError('');
    setSelectedTournament(tournament);
    setPublicRegistrationLink('');
    setPublicRegistrationQrSvg('');
    setMatchForm(emptyMatchForm);
    const [registrationData, fixtureData, standingsData] = await Promise.all([
      getTournamentRegistrationsRequest(tournament.id),
      getTournamentFixtureRequest(tournament.id),
      getTournamentStandingsRequest(tournament.id),
    ]);
    setRegistrations(registrationData);
    setFixture(fixtureData);
    setStandings(standingsData);
    setScoreInputs(
      fixtureData.matches.reduce<ScoreInputs>((acc, match) => {
        acc[match.id] = {
          homeScore: String(match.homeScore),
          awayScore: String(match.awayScore),
        };
        return acc;
      }, {})
    );
  }

  async function showPublicTournamentForm(tournament: Tournament) {
    setRegistrationError('');
    setPublicFormTournament(tournament);
    setPublicRegistrationLink('');
    setPublicRegistrationQrSvg('');

    try {
      const [formData, svg] = await Promise.all([
        getPublicTournamentFormRequest(tournament.id),
        getPublicTournamentQrSvgRequest(tournament.id),
      ]);
      setPublicRegistrationLink(formData.url);
      setPublicRegistrationQrSvg(svg);
    } catch {
      setRegistrationError('No fue posible generar el formulario publico del torneo.');
    }
  }

  async function removeTeamRegistration(teamId: string) {
    if (!selectedTournament || !confirm('Retirar este equipo del torneo?')) {
      return;
    }

    await deleteTeamRegistrationRequest(selectedTournament.id, teamId);
    await selectTournament(selectedTournament);
    await loadTournaments();
  }

  async function removeIndividualRegistration(participantId: string) {
    if (!selectedTournament || !confirm('Retirar este participante del torneo?')) {
      return;
    }

    await deleteIndividualParticipantRequest(selectedTournament.id, participantId);
    await selectTournament(selectedTournament);
    await loadTournaments();
  }

  function openTeamDetail(team: TournamentTeam) {
    setSelectedTeam(team);
    setTeamEditForm({
      name: team.name,
      logoUrl: team.logoUrl || '',
      members: team.members.map((member) => ({
        userId: member.userId || null,
        fullName: member.fullName || member.user?.name || '',
        identifier: member.identifier || member.user?.universityCode || '',
        email: member.email || member.user?.email || '',
        isCaptain: member.isCaptain,
      })),
    });
  }

  async function updateTeamLogo(file?: File) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setRegistrationError('El escudo debe ser una imagen.');
      return;
    }

    if (file.size > 1_500_000) {
      setRegistrationError('El escudo no puede superar 1.5 MB.');
      return;
    }

    const logoUrl = await readImageAsDataUrl(file);
    setTeamEditForm((current) => ({ ...current, logoUrl }));
  }

  function updateTeamMember(index: number, field: keyof TeamMemberEditForm, value: string | boolean) {
    setTeamEditForm((current) => ({
      ...current,
      members: current.members.map((member, memberIndex) =>
        memberIndex === index ? { ...member, [field]: value } : member
      ),
    }));
  }

  function setCaptain(index: number) {
    setTeamEditForm((current) => ({
      ...current,
      members: current.members.map((member, memberIndex) => ({
        ...member,
        isCaptain: memberIndex === index,
      })),
    }));
  }

  function addTeamMember() {
    setTeamEditForm((current) => ({
      ...current,
      members: [...current.members, { ...emptyMemberForm }],
    }));
  }

  function removeTeamMember(index: number) {
    setTeamEditForm((current) => {
      const nextMembers = current.members.filter((_, memberIndex) => memberIndex !== index);
      const hasCaptain = nextMembers.some((member) => member.isCaptain);
      return {
        ...current,
        members: nextMembers.map((member, memberIndex) => ({
          ...member,
          isCaptain: hasCaptain ? member.isCaptain : memberIndex === 0,
        })),
      };
    });
  }

  async function saveTeamDetail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTournament || !selectedTeam) {
      return;
    }

    try {
      setRegistrationError('');
      await updateTeamRegistrationRequest(selectedTournament.id, selectedTeam.id, {
        name: teamEditForm.name,
        logoUrl: teamEditForm.logoUrl || null,
        members: teamEditForm.members,
        status: selectedTeam.status,
      });
      setSelectedTeam(null);
      await selectTournament(selectedTournament);
      await loadTournaments();
    } catch {
      setRegistrationError('No fue posible actualizar el equipo. Revisa datos repetidos o integrantes.');
    }
  }

  function openParticipantDetail(participant: TournamentParticipant) {
    setSelectedParticipant(participant);
    setParticipantEditForm({
      displayName: participant.user?.name || participant.displayName,
      identifier: participant.user?.universityCode || participant.identifier || '',
      email: participant.user?.email || participant.email || '',
      seed: participant.seed ? String(participant.seed) : '',
    });
  }

  async function saveParticipantDetail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTournament || !selectedParticipant) {
      return;
    }

    try {
      setRegistrationError('');
      await updateIndividualParticipantRequest(selectedTournament.id, selectedParticipant.id, {
        displayName: participantEditForm.displayName,
        email: participantEditForm.email,
        identifier: participantEditForm.identifier || null,
        seed: participantEditForm.seed ? Number(participantEditForm.seed) : null,
        status: selectedParticipant.status,
      });
      setSelectedParticipant(null);
      await selectTournament(selectedTournament);
      await loadTournaments();
    } catch {
      setRegistrationError('No fue posible actualizar el participante. Revisa datos repetidos.');
    }
  }

  const competitors = selectedTournament?.mode === 'TEAM'
    ? registrations.teams.map((team) => ({ id: team.id, name: team.name }))
    : registrations.participants.map((participant) => ({ id: participant.id, name: participant.displayName }));

  function participantName(matchSide?: { name?: string; displayName?: string } | null) {
    return matchSide?.name || matchSide?.displayName || 'Pendiente';
  }

  async function generateGroups() {
    if (!selectedTournament) {
      return;
    }

    try {
      setFixtureError('');
      const data = await generateTournamentGroupsRequest(selectedTournament.id, {
        groupCount: Number(fixtureForm.groupCount || 2),
        overwrite: fixtureForm.overwriteGroups,
      });
      setFixture(data);
      const registrationData = await getTournamentRegistrationsRequest(selectedTournament.id);
      setRegistrations(registrationData);
    } catch {
      setFixtureError('No fue posible generar grupos. Revisa inscritos, formato o grupos existentes.');
    }
  }

  async function generateFixture() {
    if (!selectedTournament) {
      return;
    }

    try {
      setFixtureError('');
      const data = await generateTournamentFixtureRequest(selectedTournament.id, {
        overwrite: fixtureForm.overwriteFixture,
      });
      setFixture(data);
      setStandings(await getTournamentStandingsRequest(selectedTournament.id));
      await loadTournaments();
    } catch {
      setFixtureError('No fue posible generar el fixture. Revisa grupos, inscritos o partidos existentes.');
    }
  }

  async function submitManualMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTournament) {
      return;
    }

    try {
      setFixtureError('');
      await createManualMatchRequest(selectedTournament.id, {
      groupId: matchForm.groupId || null,
      venueId: matchForm.venueId || selectedTournament.venue?.id || null,
      phase: matchForm.phase,
        scheduledAt: matchForm.scheduledAt || null,
        homeTeamId: selectedTournament.mode === 'TEAM' ? matchForm.homeId : null,
        awayTeamId: selectedTournament.mode === 'TEAM' ? matchForm.awayId : null,
        homeParticipantId: selectedTournament.mode === 'INDIVIDUAL' ? matchForm.homeId : null,
        awayParticipantId: selectedTournament.mode === 'INDIVIDUAL' ? matchForm.awayId : null,
      });
      setMatchForm(emptyMatchForm);
      const data = await getTournamentFixtureRequest(selectedTournament.id);
      setFixture(data);
      setStandings(await getTournamentStandingsRequest(selectedTournament.id));
      await loadTournaments();
    } catch {
      setFixtureError('No fue posible crear el partido manual. Selecciona rivales diferentes.');
    }
  }

  const matchesByPhase = fixture.matches.reduce<Record<string, typeof fixture.matches>>((acc, match) => {
    acc[match.phase] = acc[match.phase] || [];
    acc[match.phase].push(match);
    return acc;
  }, {});

  function scoreFor(matchId: string) {
    return scoreInputs[matchId] || { homeScore: '0', awayScore: '0' };
  }

  function setMatchScoreInput(matchId: string, key: 'homeScore' | 'awayScore', value: string) {
    setScoreInputs({
      ...scoreInputs,
      [matchId]: {
        ...scoreFor(matchId),
        [key]: value,
      },
    });
  }

  async function saveMatchScore(matchId: string) {
    if (!selectedTournament) {
      return;
    }

    const score = scoreFor(matchId);
    await updateMatchScoreRequest(selectedTournament.id, matchId, {
      homeScore: Number(score.homeScore || 0),
      awayScore: Number(score.awayScore || 0),
    });
    setFixture(await getTournamentFixtureRequest(selectedTournament.id));
  }

  async function closeMatch(matchId: string) {
    if (!selectedTournament) {
      return;
    }

    try {
      setFixtureError('');
      const score = scoreFor(matchId);
      await closeMatchRequest(selectedTournament.id, matchId, {
        homeScore: Number(score.homeScore || 0),
        awayScore: Number(score.awayScore || 0),
      });
      const [fixtureData, standingsData] = await Promise.all([
        getTournamentFixtureRequest(selectedTournament.id),
        getTournamentStandingsRequest(selectedTournament.id),
      ]);
      setFixture(fixtureData);
      setStandings(standingsData);
    } catch {
      setFixtureError('No fue posible cerrar el partido. Revisa si el empate esta permitido.');
    }
  }

  async function recalculateStandings() {
    if (!selectedTournament) {
      return;
    }

    setStandings(await recalculateTournamentStandingsRequest(selectedTournament.id));
  }

  async function exportExcel(tournament = selectedTournament) {
    if (!tournament) {
      return;
    }

    const blob = await exportTournamentExcelRequest(tournament.id);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tournament.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-torneo.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <Topbar title="Torneos" />
      <div className="px-6 py-6">
        <FormModal
          open={showTournamentModal}
          title={form.id ? 'Editar torneo' : 'Nuevo torneo'}
          description="Configura la competencia, modalidad y cupos del torneo."
          onClose={closeTournamentModal}
          size="xl"
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-700">
              Nombre
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-slate-700">
                Competencia
                <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.sport} onChange={(event) => changeSport(event.target.value)}>
                  {sports.map((sport) => <option key={sport} value={sport}>{tournamentSportLabels[sport]}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Modalidad
                <input className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm" value={competitionModeLabels[mode]} readOnly />
              </label>
            </div>
            {form.sport === 'VIDEOJUEGOS' ? (
              <label className="block text-sm font-medium text-slate-700">
                Juego
                <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.videoGameTitle || 'FIFA'} onChange={(event) => setForm({ ...form, videoGameTitle: event.target.value })}>
                  {videoGames.map((game) => <option key={game} value={game}>{videoGameTitleLabels[game]}</option>)}
                </select>
              </label>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-slate-700">
                Formato
                <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.format} onChange={(event) => setForm({ ...form, format: event.target.value })}>
                  {formats.map((format) => <option key={format} value={format}>{tournamentFormatLabels[format]}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Estado
                <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                  {statuses.map((status) => <option key={status} value={status}>{tournamentStatusLabels[status]}</option>)}
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Sitio del torneo
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.venueId}
                onChange={(event) => setForm({ ...form, venueId: event.target.value })}
              >
                <option value="">Sin sitio asignado</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}{venue.location ? ` - ${venue.location}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {mode === 'TEAM' ? (
                <>
                  <label className="block text-sm font-medium text-slate-700">
                    Max. equipos
                    <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min="1" value={form.maxTeams} onChange={(event) => setForm({ ...form, maxTeams: event.target.value })} />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Max. integrantes
                    <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min="1" value={form.maxMembersPerTeam} onChange={(event) => setForm({ ...form, maxMembersPerTeam: event.target.value })} />
                  </label>
                </>
              ) : (
                <label className="block text-sm font-medium text-slate-700">
                  Max. participantes
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min="1" value={form.maxParticipants} onChange={(event) => setForm({ ...form, maxParticipants: event.target.value })} />
                </label>
              )}
            </div>
            <textarea
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Descripcion publica del torneo"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
            <textarea className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Reglas o notas del torneo" value={form.rules} onChange={(event) => setForm({ ...form, rules: event.target.value })} />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">{form.id ? 'Guardar cambios' : 'Crear torneo'}</button>
              <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold" type="button" onClick={closeTournamentModal}>Cancelar</button>
            </div>
          </form>
        </FormModal>

        <FormModal
          open={Boolean(selectedTeam)}
          title="Detalle del equipo"
          description="Edita integrantes, datos de contacto y capitan del equipo."
          onClose={() => setSelectedTeam(null)}
          size="xl"
        >
          <form className="space-y-4" onSubmit={saveTeamDetail}>
            <label className="block text-sm font-medium text-slate-700">
              Nombre del equipo
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={teamEditForm.name} onChange={(event) => setTeamEditForm({ ...teamEditForm, name: event.target.value })} required />
            </label>

            <div className="grid gap-3 md:grid-cols-[96px_1fr]">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                {teamEditForm.logoUrl ? (
                  <img className="h-full w-full object-cover" src={teamEditForm.logoUrl} alt="Escudo del equipo" />
                ) : (
                  <span className="px-2 text-center text-xs text-slate-500">Sin escudo</span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Escudo o logo
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="file" accept="image/*" onChange={(event) => void updateTeamLogo(event.target.files?.[0])} />
                </label>
                {teamEditForm.logoUrl ? (
                  <button className="mt-2 rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700" type="button" onClick={() => setTeamEditForm({ ...teamEditForm, logoUrl: '' })}>
                    Quitar escudo
                  </button>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              {teamEditForm.members.map((member, index) => (
                <div key={`${member.userId || 'nuevo'}-${index}`} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950">Integrante {index + 1}</p>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input type="radio" name="teamCaptain" checked={member.isCaptain} onChange={() => setCaptain(index)} />
                      Capitan
                    </label>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Nombre" value={member.fullName} onChange={(event) => updateTeamMember(index, 'fullName', event.target.value)} required />
                    <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Codigo o cedula" value={member.identifier} onChange={(event) => updateTeamMember(index, 'identifier', event.target.value)} required />
                    <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Correo" type="email" value={member.email} onChange={(event) => updateTeamMember(index, 'email', event.target.value)} required />
                  </div>
                  {teamEditForm.members.length > 1 ? (
                    <button className="mt-3 rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700" type="button" onClick={() => removeTeamMember(index)}>
                      Quitar integrante
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold" type="button" onClick={addTeamMember}>Agregar integrante</button>
              <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Guardar cambios</button>
            </div>
          </form>
        </FormModal>

        <FormModal
          open={Boolean(selectedParticipant)}
          title="Detalle del participante"
          description="Edita los datos del inscrito individual."
          onClose={() => setSelectedParticipant(null)}
        >
          <form className="space-y-4" onSubmit={saveParticipantDetail}>
            <label className="block text-sm font-medium text-slate-700">
              Nombre
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={participantEditForm.displayName} onChange={(event) => setParticipantEditForm({ ...participantEditForm, displayName: event.target.value })} required />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Codigo o cedula
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={participantEditForm.identifier} onChange={(event) => setParticipantEditForm({ ...participantEditForm, identifier: event.target.value })} required />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Correo
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="email" value={participantEditForm.email} onChange={(event) => setParticipantEditForm({ ...participantEditForm, email: event.target.value })} required />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Semilla
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min="1" value={participantEditForm.seed} onChange={(event) => setParticipantEditForm({ ...participantEditForm, seed: event.target.value })} />
            </label>
            <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Guardar cambios</button>
          </form>
        </FormModal>

        <FormModal
          open={Boolean(publicFormTournament)}
          title="Formulario de inscripcion"
          description={publicFormTournament ? publicFormTournament.name : 'Link publico del torneo.'}
          onClose={() => setPublicFormTournament(null)}
        >
          <div className="space-y-4">
            {publicRegistrationQrSvg ? (
              <>
                <div className="mx-auto h-48 w-48 rounded-md border border-slate-200 bg-white p-3 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: publicRegistrationQrSvg }} />
                <p className="break-all rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">{publicRegistrationLink}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold" type="button" onClick={() => void navigator.clipboard.writeText(publicRegistrationLink)}>
                    Copiar link
                  </button>
                  <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white" type="button" onClick={() => setPublicFormTournament(null)}>
                    Cerrar
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-600">Generando formulario...</p>
            )}
          </div>
        </FormModal>

        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[1fr_180px_220px_auto]">
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Buscar torneo" value={search} onChange={(event) => setSearch(event.target.value)} />
              <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={filterSport} onChange={(event) => setFilterSport(event.target.value)}>
                <option value="">Todos</option>
                {sports.map((sport) => <option key={sport} value={sport}>{tournamentSportLabels[sport]}</option>)}
              </select>
              <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
                <option value="">Todos los estados</option>
                {statuses.map((status) => <option key={status} value={status}>{tournamentStatusLabels[status]}</option>)}
              </select>
              <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white" type="button" onClick={() => void applyFilters()}>Filtrar</button>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-950">Torneos configurados</h3>
              <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white" type="button" onClick={openCreateTournamentModal}>
                Nuevo torneo
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="theme-table-head">
                  <tr>
                    <th className="px-5 py-3 text-left">Torneo</th>
                    <th className="px-5 py-3 text-left">Competencia</th>
                    <th className="px-5 py-3 text-left">Formato</th>
                    <th className="px-5 py-3 text-left">Sitio</th>
                    <th className="px-5 py-3 text-left">Reglas</th>
                    <th className="px-5 py-3 text-left">Estado</th>
                    <th className="px-5 py-3 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tournaments.map((tournament) => (
                    <tr key={tournament.id}>
                      <td className="px-5 py-3 font-medium text-slate-950">{tournament.name}</td>
                      <td className="px-5 py-3 text-slate-600">
                        {labelFor(tournamentSportLabels, tournament.sport)}
                        {tournament.videoGameTitle ? ` - ${labelFor(videoGameTitleLabels, tournament.videoGameTitle)}` : ''}
                      </td>
                      <td className="px-5 py-3 text-slate-600">{labelFor(tournamentFormatLabels, tournament.format)}</td>
                      <td className="px-5 py-3 text-slate-600">{tournament.venue?.name || 'Sin sitio'}</td>
                      <td className="px-5 py-3 text-slate-600">{labelFor(tournamentRulePresetLabels, tournament.rulePreset)}</td>
                      <td className="px-5 py-3 text-slate-600">{labelFor(tournamentStatusLabels, tournament.status)}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold" onClick={() => editTournament(tournament)}>Editar</button>
                          <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold" onClick={() => void selectTournament(tournament)}>Inscripciones</button>
                          <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold" onClick={() => void showPublicTournamentForm(tournament)}>Formulario</button>
                          <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold" type="button" onClick={() => void exportExcel(tournament)}>Excel</button>
                          <button className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700" onClick={() => void removeTournament(tournament.id)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {selectedTournament ? (
            <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">Inscripciones</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedTournament.name} - {labelFor(competitionModeLabels, selectedTournament.mode)}
                  </p>
                </div>
                <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold" type="button" onClick={() => void exportExcel(selectedTournament)}>
                  Descargar Excel
                </button>
              </div>
              <div className="p-5">
                {registrationError ? <p className="mb-3 text-sm text-red-600">{registrationError}</p> : null}
                <div className="overflow-x-auto">
                  {selectedTournament.mode === 'TEAM' ? (
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="theme-table-head">
                        <tr>
                          <th className="px-4 py-3 text-left">Equipo</th>
                          <th className="px-4 py-3 text-left">Capitan</th>
                          <th className="px-4 py-3 text-left">Integrantes</th>
                          <th className="px-4 py-3 text-left">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {registrations.teams.map((team) => (
                          <tr key={team.id}>
                            <td className="px-4 py-3 font-medium text-slate-950">
                              <div className="flex items-center gap-3">
                                {team.logoUrl ? <img className="h-9 w-9 rounded-md object-cover" src={team.logoUrl} alt="" /> : null}
                                {team.name}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{team.members.find((member) => member.isCaptain)?.fullName || team.captain?.name || 'Sin capitan'}</td>
                            <td className="px-4 py-3 text-slate-600">{team.members.map((member) => member.fullName || member.user?.name || 'Sin nombre').join(', ')}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold" type="button" onClick={() => openTeamDetail(team)}>Detalle</button>
                                <button className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700" onClick={() => void removeTeamRegistration(team.id)}>Retirar</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="theme-table-head">
                        <tr>
                          <th className="px-4 py-3 text-left">Participante</th>
                          <th className="px-4 py-3 text-left">Correo</th>
                          <th className="px-4 py-3 text-left">Semilla</th>
                          <th className="px-4 py-3 text-left">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {registrations.participants.map((participant) => (
                          <tr key={participant.id}>
                            <td className="px-4 py-3 font-medium text-slate-950">{participant.displayName}</td>
                            <td className="px-4 py-3 text-slate-600">{participant.email}</td>
                            <td className="px-4 py-3 text-slate-600">{participant.seed || 'Sin semilla'}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold" type="button" onClick={() => openParticipantDetail(participant)}>Detalle</button>
                                <button className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700" onClick={() => void removeIndividualRegistration(participant.id)}>Retirar</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </section>
          ) : null}

          {false && selectedTournament ? (
            <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-base font-semibold text-slate-950">Fixture y mapa visual</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Cruces, grupos e historial de {selectedTournament.name}
                </p>
              </div>
              <div className="space-y-5 p-5">
                <div className="grid gap-3 lg:grid-cols-[120px_1fr_1fr]">
                  <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min="1" max="16" value={fixtureForm.groupCount} onChange={(event) => setFixtureForm({ ...fixtureForm, groupCount: event.target.value })} />
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={fixtureForm.overwriteGroups} onChange={(event) => setFixtureForm({ ...fixtureForm, overwriteGroups: event.target.checked })} />
                    Sobrescribir grupos
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={fixtureForm.overwriteFixture} onChange={(event) => setFixtureForm({ ...fixtureForm, overwriteFixture: event.target.checked })} />
                    Sobrescribir fixture
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold" type="button" onClick={() => void generateGroups()}>Generar grupos</button>
                  <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white" type="button" onClick={() => void generateFixture()}>Generar fixture</button>
                  <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold" type="button" onClick={() => void recalculateStandings()}>Recalcular tabla</button>
                  <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold" type="button" onClick={() => void exportExcel()}>Exportar Excel</button>
                </div>
                {fixtureError ? <p className="text-sm text-red-600">{fixtureError}</p> : null}

                {standings.length ? (
                  <div className="overflow-x-auto">
                    <h4 className="text-sm font-semibold text-slate-950">Tabla de posiciones</h4>
                    <table className="mt-3 min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="theme-table-head">
                        <tr>
                          <th className="px-3 py-2 text-left">Grupo</th>
                          <th className="px-3 py-2 text-left">Pos.</th>
                          <th className="px-3 py-2 text-left">Competidor</th>
                          <th className="px-3 py-2 text-left">PJ</th>
                          <th className="px-3 py-2 text-left">G</th>
                          <th className="px-3 py-2 text-left">E</th>
                          <th className="px-3 py-2 text-left">P</th>
                          <th className="px-3 py-2 text-left">Pts</th>
                          <th className="px-3 py-2 text-left">Dif.</th>
                          <th className="px-3 py-2 text-left">Clasifica</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {standings.map((standing) => (
                          <tr key={standing.id}>
                            <td className="px-3 py-2 text-slate-600">{standing.group?.name || 'General'}</td>
                            <td className="px-3 py-2 text-slate-600">{standing.rank || '-'}</td>
                            <td className="px-3 py-2 font-medium text-slate-950">{standing.team?.name || standing.participant?.displayName}</td>
                            <td className="px-3 py-2 text-slate-600">{standing.played}</td>
                            <td className="px-3 py-2 text-slate-600">{standing.won}</td>
                            <td className="px-3 py-2 text-slate-600">{standing.drawn}</td>
                            <td className="px-3 py-2 text-slate-600">{standing.lost}</td>
                            <td className="px-3 py-2 font-semibold text-slate-950">{standing.points}</td>
                            <td className="px-3 py-2 text-slate-600">{standing.goalDifference}</td>
                            <td className="px-3 py-2 text-slate-600">{standing.qualified ? 'Si' : 'No'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {fixture.groups.length ? (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-950">Grupos</h4>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {fixture.groups.map((group) => (
                        <div key={group.id} className="rounded-md border border-slate-200 p-3">
                          <p className="text-sm font-semibold text-slate-950">{group.name}</p>
                          <div className="mt-2 space-y-1 text-sm text-slate-600">
                            {(selectedTournament.mode === 'TEAM' ? group.teams : group.participants).map((item) => (
                              <p key={item.id}>{'name' in item ? item.name : item.displayName}</p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <form className="grid gap-3 rounded-md border border-slate-200 p-3 lg:grid-cols-[1fr_1fr_160px_180px_190px_auto]" onSubmit={submitManualMatch}>
                  <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={matchForm.homeId} onChange={(event) => setMatchForm({ ...matchForm, homeId: event.target.value })} required>
                    <option value="">Local</option>
                    {competitors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={matchForm.awayId} onChange={(event) => setMatchForm({ ...matchForm, awayId: event.target.value })} required>
                    <option value="">Visitante</option>
                    {competitors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={matchForm.phase} onChange={(event) => setMatchForm({ ...matchForm, phase: event.target.value })}>
                    {phases.map((phase) => <option key={phase} value={phase}>{tournamentPhaseLabels[phase]}</option>)}
                  </select>
                  <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={matchForm.venueId} onChange={(event) => setMatchForm({ ...matchForm, venueId: event.target.value })}>
                    <option value="">Sitio del torneo</option>
                    {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
                  </select>
                  <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" type="datetime-local" value={matchForm.scheduledAt} onChange={(event) => setMatchForm({ ...matchForm, scheduledAt: event.target.value })} />
                  <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">Crear partido</button>
                </form>

                <div className="space-y-4">
                  {Object.keys(matchesByPhase).length ? Object.entries(matchesByPhase).map(([phase, matches]) => (
                    <div key={phase}>
                      <h4 className="text-sm font-semibold text-slate-950">{labelFor(tournamentPhaseLabels, phase)}</h4>
                      <div className="mt-3 grid gap-3 xl:grid-cols-2">
                        {matches.map((match) => (
                          <div key={match.id} className="rounded-md border border-slate-200 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-semibold uppercase text-slate-500">{match.group?.name || labelFor(tournamentPhaseLabels, match.phase)}</span>
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{labelFor(matchStatusLabels, match.status)}</span>
                            </div>
                            <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
                              <p className="font-semibold text-slate-950">{participantName(match.homeTeam || match.homeParticipant)}</p>
                              <span className="rounded-md bg-slate-950 px-2 py-1 text-xs font-semibold text-white">vs</span>
                              <p className="text-right font-semibold text-slate-950">{participantName(match.awayTeam || match.awayParticipant)}</p>
                            </div>
                            <p className="mt-3 text-xs text-slate-500">{formatDateTime(match.scheduledAt)}</p>
                            <p className="mt-1 text-xs text-slate-500">{match.venue?.name || selectedTournament.venue?.name || 'Sin sitio asignado'}</p>
                            <div className="mt-3 grid grid-cols-[70px_70px_auto_auto] gap-2">
                              <input className="rounded-md border border-slate-300 px-2 py-1 text-sm" type="number" min="0" value={scoreFor(match.id).homeScore} onChange={(event) => setMatchScoreInput(match.id, 'homeScore', event.target.value)} disabled={match.status === 'FINISHED'} />
                              <input className="rounded-md border border-slate-300 px-2 py-1 text-sm" type="number" min="0" value={scoreFor(match.id).awayScore} onChange={(event) => setMatchScoreInput(match.id, 'awayScore', event.target.value)} disabled={match.status === 'FINISHED'} />
                              <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold" type="button" onClick={() => void saveMatchScore(match.id)} disabled={match.status === 'FINISHED'}>Guardar</button>
                              <button className="rounded-md bg-slate-950 px-2 py-1 text-xs font-semibold text-white disabled:bg-slate-300" type="button" onClick={() => void closeMatch(match.id)} disabled={match.status === 'FINISHED'}>Cerrar</button>
                            </div>
                            {match.status === 'FINISHED' ? (
                              <p className="mt-2 text-xs font-semibold text-slate-700">Ganador: {participantName(match.winnerTeam || match.winnerParticipant)}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )) : <p className="text-sm text-slate-600">No hay partidos generados.</p>}
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default TournamentsPage;
