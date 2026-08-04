import { FormEvent, useEffect, useMemo, useState } from 'react';

import {
  createTournamentRequest,
  closeMatchRequest,
  createManualMatchRequest,
  deleteIndividualParticipantRequest,
  deleteTeamRegistrationRequest,
  deleteTournamentRequest,
  exportTournamentExcelRequest,
  getTournamentStandingsRequest,
  getTournamentFixtureRequest,
  getTournamentRegistrationsRequest,
  getPublicTournamentFormRequest,
  getPublicTournamentQrSvgRequest,
  listTournamentsRequest,
  recalculateTournamentStandingsRequest,
  sendTournamentRegistrationListRequest,
  updateIndividualParticipantRequest,
  updateMatchScheduleRequest,
  updateMatchScoreRequest,
  updateTournamentStandingRequest,
  updateTeamRegistrationRequest,
  updateTournamentRequest,
  type Tournament,
  type TournamentFixture,
  type TournamentParticipant,
  type TournamentRegistrations,
  type TournamentStanding,
  type TournamentTeam,
} from '../../api/tournaments.api';
import { getApiErrorMessage } from '../../api/client';
import Topbar from '../../components/Layout/Topbar';
import FormModal from '../../components/common/FormModal';
import RegistrationsModal, { type RegistrationModalRow } from '../../components/common/RegistrationsModal';
import { listVenuesRequest, type Venue } from '../../api/venues.api';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../../utils/dates';
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
const judgedSports = ['MARATON_PROGRAMACION', 'CAPTURA_BANDERA'];

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

type MatchForm = {
  groupId: string;
  venueId: string;
  homeId: string;
  awayId: string;
  phase: string;
  scheduledAt: string;
  scheduledEndsAt: string;
};

type ScoreInputs = Record<string, { homeScore: string; awayScore: string }>;
type StandingInputs = Record<string, { points: string; rank: string; qualified: boolean }>;
type MatchScheduleInputs = Record<string, {
  scheduledAt: string;
  scheduledEndsAt: string;
  venueId: string;
  phase: string;
  homeId: string;
  awayId: string;
  groupId: string;
}>;
type TeamMemberEditForm = {
  userId?: string | null;
  fullName: string;
  identifier: string;
  email: string;
  phone: string;
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
  phone: string;
  seed: string;
};

const emptyForm: TournamentForm = {
  name: '',
  sport: 'FUTBOL',
  format: 'MIXED',
  status: 'REGISTRATION_OPEN',
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

const emptyMatchForm: MatchForm = {
  groupId: '',
  venueId: '',
  homeId: '',
  awayId: '',
  phase: 'FASE_GRUPOS',
  scheduledAt: '',
  scheduledEndsAt: '',
};

const emptyMemberForm: TeamMemberEditForm = {
  userId: null,
  fullName: '',
  identifier: '',
  email: '',
  phone: '',
  isCaptain: false,
};

function modeForSport(sport: string) {
  return ['VIDEOJUEGOS', 'PING_PONG', 'AJEDREZ'].includes(sport) ? 'INDIVIDUAL' : 'TEAM';
}

function defaultFormatForSport(sport: string) {
  if (sport === 'FUTBOL' || sport === 'BALONCESTO') {
    return 'MIXED';
  }

  if (sport === 'ROBOTICA' || sport === 'VIDEOJUEGOS' || judgedSports.includes(sport)) {
    return 'ROUND_ROBIN';
  }

  return 'KNOCKOUT';
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Fecha y hora por definir';
  }

  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatMatchDateRange(startsAt?: string | null, endsAt?: string | null) {
  if (!startsAt) {
    return 'Fecha y hora por definir';
  }

  const startText = formatDateTime(startsAt);
  const endText = endsAt
    ? new Intl.DateTimeFormat('es-CO', {
        timeZone: 'America/Bogota',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(endsAt))
    : 'fin por definir';

  return `${startText} - ${endText}`;
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'Fecha por confirmar';
  }

  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDay(value?: string | null) {
  if (!value) {
    return 'Dia por confirmar';
  }

  const day = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'long',
  }).format(new Date(value));
  return day.charAt(0).toUpperCase() + day.slice(1);
}

function formatTime(value?: string | null) {
  if (!value) {
    return 'Por confirmar';
  }

  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function fileSafeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;
    if (context.measureText(nextLine).width > maxWidth && line) {
      context.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = nextLine;
    }
  }

  if (line) {
    context.fillText(line, x, currentY);
  }

  return currentY;
}

async function downloadPublicTournamentCard(
  svg: string,
  tournament: Tournament,
  publicLink: string
) {
  const image = new Image();
  const imageLoaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('No fue posible preparar el QR.'));
  });

  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await imageLoaded;

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('No fue posible crear la tarjeta.');
  }

  context.fillStyle = '#0d1210';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = '#17241b';
  for (let x = 0; x < canvas.width; x += 30) {
    for (let y = 0; y < canvas.height; y += 30) {
      context.beginPath();
      context.arc(x, y, 1.25, 0, Math.PI * 2);
      context.fill();
    }
  }

  context.fillStyle = '#1a1f1d';
  context.strokeStyle = '#5adf82';
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(54, 54, canvas.width - 108, canvas.height - 108, 32);
  context.fill();
  context.stroke();

  context.textAlign = 'center';
  context.fillStyle = '#5adf82';
  context.font = '800 24px Arial';
  context.fillText('MES DE LA INGENIERIA', canvas.width / 2, 126);

  context.fillStyle = '#8be694';
  context.font = '800 28px Arial';
  context.fillText('FORMULARIO DE INSCRIPCION', canvas.width / 2, 178);

  context.fillStyle = '#f4fff0';
  context.font = '900 50px Arial';
  const titleBottom = wrapCanvasText(context, tournament.name, canvas.width / 2, 260, 850, 58);

  context.fillStyle = '#cfe6ca';
  context.font = '700 26px Arial';
  context.fillText(labelFor(tournamentSportLabels, tournament.sport), canvas.width / 2, titleBottom + 54);

  const detailsY = titleBottom + 120;
  context.textAlign = 'left';
  context.fillStyle = '#8be694';
  context.font = '800 24px Arial';
  context.fillText('Fecha', 130, detailsY);
  context.fillText('Dia', 130, detailsY + 78);
  context.fillText('Horario', 130, detailsY + 156);
  context.fillText('Lugar', 130, detailsY + 234);

  context.fillStyle = '#f4fff0';
  context.font = '700 30px Arial';
  context.fillText(formatDate(tournament.startsAt), 330, detailsY);
  context.fillText(formatDay(tournament.startsAt), 330, detailsY + 78);
  context.fillText(`${formatTime(tournament.startsAt)} - ${formatTime(tournament.endsAt)}`, 330, detailsY + 156);
  wrapCanvasText(context, tournament.venue?.name || 'Sitio por confirmar', 330, detailsY + 234, 590, 38);

  const qrSize = 560;
  const qrX = (canvas.width - qrSize) / 2;
  const qrY = 700;
  context.fillStyle = '#f8fff7';
  context.beginPath();
  context.roundRect(qrX - 28, qrY - 28, qrSize + 56, qrSize + 56, 24);
  context.fill();
  context.strokeStyle = '#8be694';
  context.lineWidth = 3;
  context.stroke();
  context.drawImage(image, qrX, qrY, qrSize, qrSize);

  context.fillStyle = '#9fb39d';
  context.font = '600 20px Arial';
  context.textAlign = 'center';
  wrapCanvasText(context, publicLink, canvas.width / 2, 1310, 900, 24);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });

  if (!blob) {
    throw new Error('No fue posible descargar la tarjeta.');
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `tarjeta-inscripción-${fileSafeName(tournament.name) || 'torneo'}.png`;
  link.click();
  URL.revokeObjectURL(url);
}

function buildStandingInputs(rows: TournamentStanding[]) {
  return rows.reduce<StandingInputs>((acc, standing) => {
    acc[standing.id] = {
      points: String(standing.points),
      rank: standing.rank ? String(standing.rank) : '',
      qualified: standing.qualified,
    };
    return acc;
  }, {});
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
  const [standingInputs, setStandingInputs] = useState<StandingInputs>({});
  const [matchForm, setMatchForm] = useState<MatchForm>(emptyMatchForm);
  const [registrationError, setRegistrationError] = useState('');
  const [fixtureError, setFixtureError] = useState('');
  const [scoreInputs, setScoreInputs] = useState<ScoreInputs>({});
  const [matchScheduleInputs, setMatchScheduleInputs] = useState<MatchScheduleInputs>({});
  const [phaseFilter, setPhaseFilter] = useState('');
  const [publicRegistrationLink, setPublicRegistrationLink] = useState('');
  const [publicRegistrationQrSvg, setPublicRegistrationQrSvg] = useState('');
  const [publicFormTournament, setPublicFormTournament] = useState<Tournament | null>(null);
  const [registrationsModalTournament, setRegistrationsModalTournament] = useState<Tournament | null>(null);
  const [registrationsModalData, setRegistrationsModalData] = useState<TournamentRegistrations>({
    teams: [],
    participants: [],
  });
  const [showRegistrationsModal, setShowRegistrationsModal] = useState(false);
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [listRecipients, setListRecipients] = useState('');
  const [listSubject, setListSubject] = useState('');
  const [listBody, setListBody] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<TournamentTeam | null>(null);
  const [teamEditForm, setTeamEditForm] = useState<TeamEditForm>({ name: '', logoUrl: '', members: [] });
  const [selectedParticipant, setSelectedParticipant] = useState<TournamentParticipant | null>(null);
  const [participantEditForm, setParticipantEditForm] = useState<ParticipantEditForm>({
    displayName: '',
    identifier: '',
    email: '',
    phone: '',
    seed: '',
  });

  const mode = useMemo(() => modeForSport(form.sport), [form.sport]);
  const isJudgedTournament = Boolean(selectedTournament && judgedSports.includes(selectedTournament.sport));
  const tournamentRegistrationRows = useMemo<RegistrationModalRow[]>(() => {
    if (registrationsModalTournament?.mode === 'TEAM') {
      return registrationsModalData.teams.flatMap((team) =>
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

    return registrationsModalData.participants.map((participant) => ({
      id: participant.id,
      group: registrationsModalTournament?.name || '',
      name: participant.displayName || participant.user?.name || '',
      email: participant.email || participant.user?.email || '',
      phone: participant.phone || '',
      identifier: participant.identifier || participant.user?.universityCode || '',
      status: participant.status,
      detail: participant.seed ? `Semilla ${participant.seed}` : 'Participante',
    }));
  }, [registrationsModalData, registrationsModalTournament]);

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

  function syncStandings(rows: TournamentStanding[]) {
    setStandings(rows);
    setStandingInputs(buildStandingInputs(rows));
  }

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
      startsAt: toDateTimeLocalValue(tournament.startsAt),
      endsAt: toDateTimeLocalValue(tournament.endsAt),
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
      startsAt: form.startsAt ? fromDateTimeLocalValue(form.startsAt) : null,
      endsAt: form.endsAt ? fromDateTimeLocalValue(form.endsAt) : null,
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
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No fue posible guardar el torneo.'));
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
      syncStandings([]);
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
    syncStandings(standingsData);
    setScoreInputs(
      fixtureData.matches.reduce<ScoreInputs>((acc, match) => {
        acc[match.id] = {
          homeScore: String(match.homeScore),
          awayScore: String(match.awayScore),
        };
        return acc;
      }, {})
    );
    setMatchScheduleInputs(
      fixtureData.matches.reduce<MatchScheduleInputs>((acc, match) => {
        acc[match.id] = {
          scheduledAt: toDateTimeLocalValue(match.scheduledAt),
          scheduledEndsAt: toDateTimeLocalValue(match.scheduledEndsAt),
          venueId: match.venueId || tournament.venue?.id || '',
          phase: match.phase,
          homeId: tournament.mode === 'TEAM' ? match.homeTeam?.id || '' : match.homeParticipant?.id || '',
          awayId: tournament.mode === 'TEAM' ? match.awayTeam?.id || '' : match.awayParticipant?.id || '',
          groupId: match.groupId || '',
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
      setRegistrationError('No fue posible generar el formulario público del torneo.');
    }
  }

  async function openTournamentRegistrationsModal(tournament = publicFormTournament) {
    if (!tournament) {
      return;
    }

    try {
      setRegistrationError('');
      setRegistrationsModalTournament(tournament);
      setRegistrationsModalData(await getTournamentRegistrationsRequest(tournament.id));
      setShowRegistrationsModal(true);
    } catch (requestError) {
      setRegistrationError(getApiErrorMessage(requestError, 'No fue posible cargar los inscritos del torneo.'));
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
        phone: member.phone || '',
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
      phone: participant.phone || '',
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
        phone: participantEditForm.phone || null,
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

  function matchHasBothCompetitors(match: TournamentFixture['matches'][number]) {
    return selectedTournament?.mode === 'TEAM'
      ? Boolean(match.homeTeam && match.awayTeam)
      : Boolean(match.homeParticipant && match.awayParticipant);
  }

  function buildScheduleInputs(matches: TournamentFixture['matches']) {
    return matches.reduce<MatchScheduleInputs>((acc, match) => {
      acc[match.id] = {
        scheduledAt: toDateTimeLocalValue(match.scheduledAt),
        scheduledEndsAt: toDateTimeLocalValue(match.scheduledEndsAt),
        venueId: match.venueId || selectedTournament?.venue?.id || '',
        phase: match.phase,
        homeId: selectedTournament?.mode === 'TEAM' ? match.homeTeam?.id || '' : match.homeParticipant?.id || '',
        awayId: selectedTournament?.mode === 'TEAM' ? match.awayTeam?.id || '' : match.awayParticipant?.id || '',
        groupId: match.groupId || '',
      };
      return acc;
    }, {});
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
        scheduledAt: matchForm.scheduledAt ? fromDateTimeLocalValue(matchForm.scheduledAt) : null,
        scheduledEndsAt: matchForm.scheduledEndsAt
          ? fromDateTimeLocalValue(matchForm.scheduledEndsAt)
          : null,
        homeTeamId: selectedTournament.mode === 'TEAM' ? matchForm.homeId : null,
        awayTeamId: selectedTournament.mode === 'TEAM' ? matchForm.awayId : null,
        homeParticipantId: selectedTournament.mode === 'INDIVIDUAL' ? matchForm.homeId : null,
        awayParticipantId: selectedTournament.mode === 'INDIVIDUAL' ? matchForm.awayId : null,
      });
      setMatchForm(emptyMatchForm);
      const data = await getTournamentFixtureRequest(selectedTournament.id);
      setFixture(data);
      setMatchScheduleInputs(buildScheduleInputs(data.matches));
      syncStandings(await getTournamentStandingsRequest(selectedTournament.id));
      await loadTournaments();
    } catch {
      setFixtureError('No fue posible crear el partido manual. Selecciona rivales diferentes.');
    }
  }

  const visibleMatches = phaseFilter
    ? fixture.matches.filter((match) => match.phase === phaseFilter)
    : fixture.matches;
  const matchesByPhase = visibleMatches.reduce<Record<string, typeof fixture.matches>>((acc, match) => {
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

  function standingFor(standing: TournamentStanding) {
    return standingInputs[standing.id] || {
      points: String(standing.points),
      rank: standing.rank ? String(standing.rank) : '',
      qualified: standing.qualified,
    };
  }

  function setStandingInput(
    standing: TournamentStanding,
    key: 'points' | 'rank' | 'qualified',
    value: string | boolean
  ) {
    setStandingInputs({
      ...standingInputs,
      [standing.id]: {
        ...standingFor(standing),
        [key]: value,
      },
    });
  }

  async function saveStanding(standing: TournamentStanding) {
    if (!selectedTournament) {
      return;
    }

    const input = standingFor(standing);
    await updateTournamentStandingRequest(selectedTournament.id, standing.id, {
      points: Number(input.points || 0),
      rank: input.rank ? Number(input.rank) : null,
      qualified: input.qualified,
    });
    syncStandings(await getTournamentStandingsRequest(selectedTournament.id));
  }

  function scheduleFor(matchId: string) {
    return matchScheduleInputs[matchId] || {
      scheduledAt: '',
      scheduledEndsAt: '',
      venueId: selectedTournament?.venue?.id || '',
      phase: 'FASE_GRUPOS',
      homeId: '',
      awayId: '',
      groupId: '',
    };
  }

  function setMatchScheduleInput(
    matchId: string,
    key: 'scheduledAt' | 'scheduledEndsAt' | 'venueId' | 'phase' | 'homeId' | 'awayId' | 'groupId',
    value: string
  ) {
    setMatchScheduleInputs({
      ...matchScheduleInputs,
      [matchId]: {
        ...scheduleFor(matchId),
        [key]: value,
      },
    });
  }

  async function saveMatchSchedule(matchId: string) {
    if (!selectedTournament) {
      return;
    }

    const schedule = scheduleFor(matchId);
    await updateMatchScheduleRequest(selectedTournament.id, matchId, {
      groupId: schedule.groupId || null,
      scheduledAt: schedule.scheduledAt ? fromDateTimeLocalValue(schedule.scheduledAt) : null,
      scheduledEndsAt: schedule.scheduledEndsAt
        ? fromDateTimeLocalValue(schedule.scheduledEndsAt)
        : null,
      venueId: schedule.venueId || null,
      phase: schedule.phase,
      homeTeamId:
        selectedTournament.mode === 'TEAM' && schedule.homeId && schedule.awayId
          ? schedule.homeId
          : undefined,
      awayTeamId:
        selectedTournament.mode === 'TEAM' && schedule.homeId && schedule.awayId
          ? schedule.awayId
          : undefined,
      homeParticipantId:
        selectedTournament.mode === 'INDIVIDUAL' && schedule.homeId && schedule.awayId
          ? schedule.homeId
          : undefined,
      awayParticipantId:
        selectedTournament.mode === 'INDIVIDUAL' && schedule.homeId && schedule.awayId
          ? schedule.awayId
          : undefined,
    });
    const fixtureData = await getTournamentFixtureRequest(selectedTournament.id);
    setFixture(fixtureData);
    setMatchScheduleInputs(buildScheduleInputs(fixtureData.matches));
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
    const fixtureData = await getTournamentFixtureRequest(selectedTournament.id);
    setFixture(fixtureData);
    setMatchScheduleInputs(buildScheduleInputs(fixtureData.matches));
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
      setMatchScheduleInputs(buildScheduleInputs(fixtureData.matches));
      syncStandings(standingsData);
    } catch {
      setFixtureError('No fue posible cerrar el partido. Revisa si el empate esta permitido.');
    }
  }

  async function recalculateStandings() {
    if (!selectedTournament) {
      return;
    }

    syncStandings(await recalculateTournamentStandingsRequest(selectedTournament.id));
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

  async function sendRegistrationList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTournament) {
      return;
    }

    const recipients = listRecipients
      .split(/[;,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      setRegistrationError('');
      await sendTournamentRegistrationListRequest(selectedTournament.id, {
        recipients,
        subject: listSubject || `Lista de inscritos - ${selectedTournament.name}`,
        body: listBody || 'Adjunto la lista de inscritos para soporte de permiso académico.',
      });
      setShowListModal(false);
      setListRecipients('');
      setRegistrationError('');
    } catch {
      setRegistrationError('No fue posible enviar la lista. Revisa correos destino o configuración SMTP.');
    }
  }

  return (
    <div>
      <Topbar title="Torneos" />
      <div className="px-6 py-6">
        <FormModal
          open={showListModal}
          title="Enviar lista de inscritos"
          description="Envia a profesores o responsables un Excel con equipos o participantes inscritos."
          onClose={() => setShowListModal(false)}
        >
          <form className="mt-4 space-y-4" onSubmit={sendRegistrationList}>
            <label className="block text-sm font-medium text-slate-700">
              Correos destino
              <textarea className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={listRecipients} onChange={(event) => setListRecipients(event.target.value)} placeholder="profesor@umanizales.edu.co; otro@umanizales.edu.co" required />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Asunto
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={listSubject} onChange={(event) => setListSubject(event.target.value)} placeholder={`Lista de inscritos - ${selectedTournament?.name || 'Torneo'}`} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Mensaje
              <textarea className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={listBody} onChange={(event) => setListBody(event.target.value)} placeholder="Adjunto la lista para permiso académico." />
            </label>
            <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Enviar lista</button>
          </form>
        </FormModal>
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
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Inicio del torneo
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
                />
                <span className="mt-1 block text-xs text-slate-500">Opcional. Si queda vacio se mostrara como fecha por definir.</span>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Finalizacion del torneo
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
                />
                <span className="mt-1 block text-xs text-slate-500">Opcional. Sirve para torneos de varios días.</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
                  {mode === 'TEAM' ? (
                  <>
                  <label className="block text-sm font-medium text-slate-700">
                    Max. equipos
                    <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Sin límite" type="number" min="1" value={form.maxTeams} onChange={(event) => setForm({ ...form, maxTeams: event.target.value })} />
                    <span className="mt-1 block text-xs text-slate-500">Opcional. Dejalo vacio para permitir cualquier cantidad de equipos.</span>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Max. integrantes
                    <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min="1" value={form.maxMembersPerTeam} onChange={(event) => setForm({ ...form, maxMembersPerTeam: event.target.value })} />
                    <span className="mt-1 block text-xs text-slate-500">Opcional. Por ejemplo, 2 limita cada equipo a dos integrantes.</span>
                  </label>
                  </>
                  ) : (
                  <label className="block text-sm font-medium text-slate-700">
                    Max. participantes
                    <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Sin límite" type="number" min="1" value={form.maxParticipants} onChange={(event) => setForm({ ...form, maxParticipants: event.target.value })} />
                    <span className="mt-1 block text-xs text-slate-500">Opcional. Dejalo vacio para permitir cualquier cantidad de participantes.</span>
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
                    <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Código o cédula" value={member.identifier} onChange={(event) => updateTeamMember(index, 'identifier', event.target.value)} required />
                    <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Correo" type="email" value={member.email} onChange={(event) => updateTeamMember(index, 'email', event.target.value)} required />
                    <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Telefono" type="tel" value={member.phone} onChange={(event) => updateTeamMember(index, 'phone', event.target.value)} required />
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
              Código o cédula
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={participantEditForm.identifier} onChange={(event) => setParticipantEditForm({ ...participantEditForm, identifier: event.target.value })} required />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Correo
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="email" value={participantEditForm.email} onChange={(event) => setParticipantEditForm({ ...participantEditForm, email: event.target.value })} required />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Telefono
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="tel" value={participantEditForm.phone} onChange={(event) => setParticipantEditForm({ ...participantEditForm, phone: event.target.value })} required />
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
          title="Formulario de inscripción"
          description={publicFormTournament ? publicFormTournament.name : 'Link público del torneo.'}
          onClose={() => setPublicFormTournament(null)}
        >
          <div className="space-y-4">
            {publicRegistrationQrSvg ? (
              <>
                <div className="rounded-xl border border-[#5adf82]/30 bg-[#0f1513] p-5">
                  <div
                    className="qr-svg-fit mx-auto aspect-square w-full max-w-[260px] rounded-lg border border-[#8be694]/50 bg-white p-3 shadow-[0_0_28px_rgba(90,223,130,0.16)]"
                    dangerouslySetInnerHTML={{ __html: publicRegistrationQrSvg }}
                  />
                </div>
                <div className="rounded-xl border border-[#5adf82]/25 bg-[#101613] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8be694]">
                    Link público
                  </p>
                  <p className="mt-2 break-all text-sm font-medium text-[#d8f3d5]">{publicRegistrationLink}</p>
                  {publicFormTournament ? (
                    <dl className="mt-4 grid gap-3 text-sm text-[#cfe6ca] sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8aa08a]">Fecha</dt>
                        <dd className="mt-1 font-semibold">{formatDate(publicFormTournament.startsAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8aa08a]">Horario</dt>
                        <dd className="mt-1 font-semibold">{formatTime(publicFormTournament.startsAt)} - {formatTime(publicFormTournament.endsAt)}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8aa08a]">Lugar</dt>
                        <dd className="mt-1 font-semibold">{publicFormTournament.venue?.name || 'Sitio por confirmar'}</dd>
                      </div>
                    </dl>
                  ) : null}
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {publicFormTournament ? (
                    <button
                      className="rounded-md border border-[#5adf82]/35 px-4 py-2 text-sm font-semibold text-[#f4fff0]"
                      type="button"
                      onClick={() => void openTournamentRegistrationsModal(publicFormTournament)}
                    >
                      Ver inscritos
                    </button>
                  ) : null}
                  <button className="rounded-md border border-[#5adf82]/35 px-4 py-2 text-sm font-semibold text-[#f4fff0]" type="button" onClick={() => void navigator.clipboard.writeText(publicRegistrationLink)}>
                    Copiar link
                  </button>
                  {publicFormTournament ? (
                    <button
                      className="rounded-md bg-[#8be694] px-4 py-2 text-sm font-semibold text-[#0d1210]"
                      type="button"
                      onClick={() => {
                        downloadPublicTournamentCard(publicRegistrationQrSvg, publicFormTournament, publicRegistrationLink)
                          .catch(() => setRegistrationError('No fue posible descargar la tarjeta QR.'));
                      }}
                    >
                      Descargar tarjeta
                    </button>
                  ) : null}
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

        <RegistrationsModal
          open={showRegistrationsModal}
          title={`Inscritos - ${registrationsModalTournament?.name || 'Torneo'}`}
          description="Lista de equipos, participantes e integrantes inscritos."
          rows={tournamentRegistrationRows}
          emptyMessage="Este torneo no tiene inscritos registrados."
          onClose={() => setShowRegistrationsModal(false)}
          onNotice={setRegistrationError}
        />

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
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold" type="button" onClick={() => void exportExcel(selectedTournament)}>
                    Descargar Excel
                  </button>
                  <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold" type="button" onClick={() => setShowListModal(true)}>
                    Enviar lista
                  </button>
                </div>
              </div>
              <div className="space-y-5 p-5">
                {registrationError ? <p className="mb-3 text-sm text-red-600">{registrationError}</p> : null}
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                    <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
                      {selectedTournament.mode === 'TEAM' ? 'Equipos' : 'Participantes'}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-950">
                      {selectedTournament.mode === 'TEAM' ? registrations.teams.length : registrations.participants.length}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                    <p className="font-mono text-xs uppercase tracking-widest text-slate-500">Formato</p>
                    <p className="mt-2 text-lg font-bold text-slate-950">{labelFor(tournamentFormatLabels, selectedTournament.format)}</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                    <p className="font-mono text-xs uppercase tracking-widest text-slate-500">Estado</p>
                    <p className="mt-2 text-lg font-bold text-slate-950">{labelFor(tournamentStatusLabels, selectedTournament.status)}</p>
                  </div>
                </div>

                {selectedTournament.mode === 'TEAM' ? (
                  registrations.teams.length ? (
                    <>
                      <div className="grid gap-3 xl:grid-cols-2">
                        {registrations.teams.map((team) => {
                          const captain = team.members.find((member) => member.isCaptain);
                          return (
                            <article key={team.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-lg font-bold text-slate-950">{team.name}</p>
                                  <p className="mt-1 text-sm text-slate-600">
                                    Capitan: {captain?.fullName || captain?.user?.name || team.captain?.name || 'Sin capitan'}
                                  </p>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                  <button className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold" type="button" onClick={() => openTeamDetail(team)}>Detalle</button>
                                  <button className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700" type="button" onClick={() => void removeTeamRegistration(team.id)}>Retirar</button>
                                </div>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-2">
                                {team.members.map((member) => (
                                  <span key={member.id} className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600">
                                    {member.fullName || member.user?.name || 'Sin nombre'}
                                  </span>
                                ))}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                      <div className="hidden overflow-x-auto xl:block">
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
                                <td className="px-4 py-3 font-medium text-slate-950">{team.name}</td>
                                <td className="px-4 py-3 text-slate-600">{team.members.find((member) => member.isCaptain)?.fullName || team.captain?.name || 'Sin capitan'}</td>
                                <td className="max-w-xl px-4 py-3 text-slate-600">{team.members.map((member) => member.fullName || member.user?.name || 'Sin nombre').join(', ')}</td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-wrap gap-2">
                                    <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold" type="button" onClick={() => openTeamDetail(team)}>Detalle</button>
                                    <button className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700" type="button" onClick={() => void removeTeamRegistration(team.id)}>Retirar</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <p className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
                      Este torneo no tiene equipos inscritos.
                    </p>
                  )
                ) : registrations.participants.length ? (
                  <>
                    <div className="grid gap-3 xl:grid-cols-2">
                      {registrations.participants.map((participant) => (
                        <article key={participant.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-lg font-bold text-slate-950">{participant.displayName}</p>
                              <p className="mt-1 break-all text-sm text-slate-600">{participant.email || 'Sin correo'}</p>
                              <p className="mt-1 text-sm text-slate-600">Semilla: {participant.seed || 'Sin semilla'}</p>
                            </div>
                            <div className="flex shrink-0 gap-2">
                              <button className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold" type="button" onClick={() => openParticipantDetail(participant)}>Detalle</button>
                              <button className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700" type="button" onClick={() => void removeIndividualRegistration(participant.id)}>Retirar</button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                    <div className="hidden overflow-x-auto xl:block">
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
                                  <button className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700" type="button" onClick={() => void removeIndividualRegistration(participant.id)}>Retirar</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
                    Este torneo no tiene participantes inscritos.
                  </p>
                )}
              </div>
            </section>
          ) : null}

          {selectedTournament ? (
            <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-base font-semibold text-slate-950">Organizar partidos</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Crea los partidos manualmente con los equipos o participantes inscritos. Puedes ajustar rivales, fase, lugar, fecha y hora antes de registrar resultados.
                </p>
              </div>
              <div className="space-y-5 p-5">
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold" type="button" onClick={() => void recalculateStandings()}>
                    {isJudgedTournament ? 'Crear ranking desde inscritos' : 'Recalcular tabla'}
                  </button>
                  <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold" type="button" onClick={() => void exportExcel()}>Exportar Excel</button>
                </div>
                {fixtureError ? <p className="text-sm text-red-600">{fixtureError}</p> : null}

                {standings.length ? (
                  <div className="overflow-x-auto">
                    <h4 className="text-sm font-semibold text-slate-950">
                      {isJudgedTournament ? 'Ranking por jurados' : 'Tabla de posiciones'}
                    </h4>
                    {isJudgedTournament ? (
                      <table className="mt-3 min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="theme-table-head">
                          <tr>
                            <th className="px-3 py-2 text-left">Pos.</th>
                            <th className="px-3 py-2 text-left">Equipo</th>
                            <th className="px-3 py-2 text-left">Integrantes</th>
                            <th className="px-3 py-2 text-left">Puntos jurados</th>
                            <th className="px-3 py-2 text-left">Podio</th>
                            <th className="px-3 py-2 text-left">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {standings.map((standing) => {
                            const input = standingFor(standing);
                            return (
                              <tr key={standing.id}>
                                <td className="px-3 py-2">
                                  <input
                                    className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
                                    min="1"
                                    type="number"
                                    value={input.rank}
                                    onChange={(event) => setStandingInput(standing, 'rank', event.target.value)}
                                  />
                                </td>
                                <td className="px-3 py-2 font-medium text-slate-950">{standing.team?.name || 'Equipo'}</td>
                                <td className="px-3 py-2 text-slate-600">
                                  <div className="flex max-w-xl flex-wrap gap-1">
                                    {(standing.team?.members || []).map((member) => (
                                      <span key={member.id} className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                                        {member.fullName || member.user?.name}
                                        {member.isCaptain ? ' (capitan)' : ''}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm"
                                    min="0"
                                    type="number"
                                    value={input.points}
                                    onChange={(event) => setStandingInput(standing, 'points', event.target.value)}
                                  />
                                </td>
                                <td className="px-3 py-2 text-slate-600">
                                  <label className="inline-flex items-center gap-2">
                                    <input
                                      checked={input.qualified}
                                      type="checkbox"
                                      onChange={(event) => setStandingInput(standing, 'qualified', event.target.checked)}
                                    />
                                    Mostrar
                                  </label>
                                </td>
                                <td className="px-3 py-2">
                                  <button className="rounded-md border border-slate-300 px-3 py-1 font-semibold" type="button" onClick={() => void saveStanding(standing)}>
                                    Guardar
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
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
                    )}
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

                <form className="grid gap-3 rounded-md border border-slate-200 p-3 xl:grid-cols-[1fr_1fr_150px_160px_180px_190px_190px_auto]" onSubmit={submitManualMatch}>
                  <div className="xl:col-span-8">
                    <h4 className="font-semibold text-slate-950">Manual</h4>
                    <p className="mt-1 text-sm text-slate-600">
                      Crea o ajusta partidos escogiendo rivales, fase, grupo, fecha, hora y lugar.
                    </p>
                  </div>
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
                  <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={matchForm.groupId} onChange={(event) => setMatchForm({ ...matchForm, groupId: event.target.value })}>
                    <option value="">Sin grupo</option>
                    {fixture.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                  </select>
                  <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={matchForm.venueId} onChange={(event) => setMatchForm({ ...matchForm, venueId: event.target.value })}>
                    <option value="">Sitio del torneo</option>
                    {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
                  </select>
                  <label className="grid gap-1 text-xs font-semibold text-slate-600">
                    Inicio
                    <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" type="datetime-local" value={matchForm.scheduledAt} onChange={(event) => setMatchForm({ ...matchForm, scheduledAt: event.target.value })} />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold text-slate-600">
                    Fin
                    <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" type="datetime-local" value={matchForm.scheduledEndsAt} onChange={(event) => setMatchForm({ ...matchForm, scheduledEndsAt: event.target.value })} />
                  </label>
                  <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">Crear partido</button>
                </form>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h4 className="font-semibold text-slate-950">Partidos</h4>
                  <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={phaseFilter} onChange={(event) => setPhaseFilter(event.target.value)}>
                    <option value="">Todas las fases</option>
                    {phases.map((phase) => (
                      <option key={phase} value={phase}>{tournamentPhaseLabels[phase]}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  {Object.keys(matchesByPhase).length ? Object.entries(matchesByPhase).map(([phase, matches]) => (
                    <div key={phase}>
                      <h4 className="text-sm font-semibold text-slate-950">{labelFor(tournamentPhaseLabels, phase)}</h4>
                      <div className="mt-3 grid gap-3">
                        {matches.map((match) => (
                          <div key={match.id} className="min-w-0 rounded-md border border-slate-200 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-semibold uppercase text-slate-500">{match.group?.name || labelFor(tournamentPhaseLabels, match.phase)}</span>
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{labelFor(matchStatusLabels, match.status)}</span>
                            </div>
                            <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
                              <p className="font-semibold text-slate-950">{participantName(match.homeTeam || match.homeParticipant)}</p>
                              <span className="rounded-md bg-slate-950 px-2 py-1 text-xs font-semibold text-white">vs</span>
                              <p className="text-right font-semibold text-slate-950">{participantName(match.awayTeam || match.awayParticipant)}</p>
                            </div>
                            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-[minmax(160px,1fr)_minmax(160px,1fr)_150px_150px_180px_180px_190px_110px]">
                              <select
                                className="min-w-0 rounded-md border border-slate-300 px-2 py-1 text-sm"
                                value={scheduleFor(match.id).homeId}
                                onChange={(event) => setMatchScheduleInput(match.id, 'homeId', event.target.value)}
                              >
                                <option value="">Local pendiente</option>
                                {competitors.map((item) => (
                                  <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                              </select>
                              <select
                                className="min-w-0 rounded-md border border-slate-300 px-2 py-1 text-sm"
                                value={scheduleFor(match.id).awayId}
                                onChange={(event) => setMatchScheduleInput(match.id, 'awayId', event.target.value)}
                              >
                                <option value="">Visitante pendiente</option>
                                {competitors.map((item) => (
                                  <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                              </select>
                              <select
                                className="min-w-0 rounded-md border border-slate-300 px-2 py-1 text-sm"
                                value={scheduleFor(match.id).phase}
                                onChange={(event) => setMatchScheduleInput(match.id, 'phase', event.target.value)}
                              >
                                {phases.map((phase) => (
                                  <option key={phase} value={phase}>{tournamentPhaseLabels[phase]}</option>
                                ))}
                              </select>
                              <select
                                className="min-w-0 rounded-md border border-slate-300 px-2 py-1 text-sm"
                                value={scheduleFor(match.id).groupId}
                                onChange={(event) => setMatchScheduleInput(match.id, 'groupId', event.target.value)}
                              >
                                <option value="">Sin grupo</option>
                                {fixture.groups.map((group) => (
                                  <option key={group.id} value={group.id}>{group.name}</option>
                                ))}
                              </select>
                              <label className="grid min-w-0 gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Inicio
                                <input
                                  className="min-w-0 rounded-md border border-slate-300 px-2 py-1 text-sm normal-case tracking-normal"
                                  type="datetime-local"
                                  value={scheduleFor(match.id).scheduledAt}
                                  onChange={(event) => setMatchScheduleInput(match.id, 'scheduledAt', event.target.value)}
                                />
                              </label>
                              <label className="grid min-w-0 gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Fin
                                <input
                                  className="min-w-0 rounded-md border border-slate-300 px-2 py-1 text-sm normal-case tracking-normal"
                                  type="datetime-local"
                                  value={scheduleFor(match.id).scheduledEndsAt}
                                  onChange={(event) => setMatchScheduleInput(match.id, 'scheduledEndsAt', event.target.value)}
                                />
                              </label>
                              <select
                                className="min-w-0 rounded-md border border-slate-300 px-2 py-1 text-sm"
                                value={scheduleFor(match.id).venueId}
                                onChange={(event) => setMatchScheduleInput(match.id, 'venueId', event.target.value)}
                              >
                                <option value="">Sin sitio asignado</option>
                                {venues.map((venue) => (
                                  <option key={venue.id} value={venue.id}>{venue.name}</option>
                                ))}
                              </select>
                              <button className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold" type="button" onClick={() => void saveMatchSchedule(match.id)}>
                                Actualizar
                              </button>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                              {formatMatchDateRange(match.scheduledAt, match.scheduledEndsAt)} - {match.venue?.name || selectedTournament.venue?.name || 'Sin sitio asignado'}
                            </p>
                            <div className="mt-3 grid gap-2 sm:grid-cols-[80px_80px_minmax(140px,1fr)_minmax(140px,1fr)]">
                              <input className="min-w-0 rounded-md border border-slate-300 px-2 py-1 text-sm" type="number" min="0" value={scoreFor(match.id).homeScore} onChange={(event) => setMatchScoreInput(match.id, 'homeScore', event.target.value)} disabled={match.status === 'FINISHED' || !matchHasBothCompetitors(match)} />
                              <input className="min-w-0 rounded-md border border-slate-300 px-2 py-1 text-sm" type="number" min="0" value={scoreFor(match.id).awayScore} onChange={(event) => setMatchScoreInput(match.id, 'awayScore', event.target.value)} disabled={match.status === 'FINISHED' || !matchHasBothCompetitors(match)} />
                              <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold disabled:opacity-50" type="button" onClick={() => void saveMatchScore(match.id)} disabled={match.status === 'FINISHED' || !matchHasBothCompetitors(match)}>Guardar</button>
                              <button className="rounded-md bg-slate-950 px-2 py-1 text-xs font-semibold text-white disabled:bg-slate-300" type="button" onClick={() => void closeMatch(match.id)} disabled={match.status === 'FINISHED' || !matchHasBothCompetitors(match)}>Cerrar</button>
                            </div>
                            {!matchHasBothCompetitors(match) ? (
                              <p className="mt-2 text-xs text-slate-500">Esperando ganador del otro partido para completar este cruce.</p>
                            ) : null}
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
