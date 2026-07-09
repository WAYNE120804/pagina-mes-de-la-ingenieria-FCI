import { FormEvent, useEffect, useMemo, useState } from 'react';

import {
  addEventResponsibleRequest,
  createEventRequest,
  deleteEventRequest,
  getEventRequest,
  getPublicEventFormRequest,
  getPublicEventQrSvgRequest,
  listAttendanceRequest,
  listEventsRequest,
  updateEventRequest,
  type AttendanceItem,
  type EventItem,
} from '../../api/events.api';
import { getApiErrorMessage } from '../../api/client';
import {
  createSpeakerRequest,
  createTalkRequest,
  listSpeakersRequest,
  updateTalkRequest,
  type Speaker,
} from '../../api/talks.api';
import { createTournamentRequest } from '../../api/tournaments.api';
import { listUsersRequest, type UserRow } from '../../api/users.api';
import { listVenuesRequest, type Venue } from '../../api/venues.api';
import Topbar from '../../components/Layout/Topbar';
import FormModal from '../../components/common/FormModal';
import {
  formatDateTime as formatColombiaDateTime,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from '../../utils/dates';
import {
  attendanceMethodLabels,
  attendanceStatusLabels,
  eventStatusLabels,
  eventTypeLabels,
  labelFor,
  roleLabels,
  tournamentFormatLabels,
  tournamentSportLabels,
  tournamentStatusLabels,
} from '../../utils/labels';

const eventTypes = Object.keys(eventTypeLabels);
const eventStatuses = Object.keys(eventStatusLabels);
const competitionSports = ['MARATON_PROGRAMACION', 'CAPTURA_BANDERA'];
const competitionFormats = Object.keys(tournamentFormatLabels);

type EventForm = {
  id?: string;
  title: string;
  type: string;
  status: string;
  description: string;
  venueId: string;
  startsAt: string;
  endsAt: string;
  capacity: string;
  topic: string;
  speakerId: string;
  speakerName: string;
  speakerEmail: string;
  speakerCompany: string;
  speakerBio: string;
  speakerPhotoUrl: string;
  competitionSport: string;
  competitionFormat: string;
  competitionMaxTeams: string;
  competitionMaxMembersPerTeam: string;
};

const emptyForm: EventForm = {
  title: '',
  type: 'TALK',
  status: 'PUBLISHED',
  description: '',
  venueId: '',
  startsAt: '',
  endsAt: '',
  capacity: '',
  topic: '',
  speakerId: '',
  speakerName: '',
  speakerEmail: '',
  speakerCompany: '',
  speakerBio: '',
  speakerPhotoUrl: '',
  competitionSport: 'MARATON_PROGRAMACION',
  competitionFormat: 'ROUND_ROBIN',
  competitionMaxTeams: '',
  competitionMaxMembersPerTeam: '',
};

function defaultCompetitionFormat(sport: string) {
  return sport === 'MARATON_PROGRAMACION' || sport === 'CAPTURA_BANDERA' ? 'ROUND_ROBIN' : 'KNOCKOUT';
}

function tournamentStatusFromEventStatus(status: string) {
  if (status === 'PUBLISHED') return 'REGISTRATION_OPEN';
  if (status === 'FINISHED') return 'FINISHED';
  if (status === 'CANCELLED') return 'CANCELLED';
  return 'DRAFT';
}

function oneHourAfterLocalInput(value: string) {
  if (!value) {
    return '';
  }

  const date = new Date(fromDateTimeLocalValue(value));
  date.setHours(date.getHours() + 1);
  return toDateTimeLocalValue(date.toISOString());
}

function formatDate(value?: string) {
  if (!value) {
    return 'Sin fecha';
  }

  return new Date(value).toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(value?: string) {
  if (!value) {
    return 'Sin hora';
  }

  return new Date(value).toLocaleTimeString('es-CO', {
    timeZone: 'America/Bogota',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getDurationMinutes(startsAt?: string, endsAt?: string) {
  if (!startsAt || !endsAt) {
    return null;
  }

  const minutes = Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
}

function formatAttendanceWindow(event: EventItem) {
  const opensAt = new Date(new Date(event.startsAt).getTime() - 30 * 60000).toISOString();
  const closesAt = new Date(new Date(event.endsAt).getTime() + 30 * 60000).toISOString();
  return `${formatTime(opensAt)} - ${formatTime(closesAt)}`;
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

async function downloadPublicEventCard(
  svg: string,
  event: EventItem,
  mode: 'registration' | 'attendance',
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

  context.fillStyle = '#18261c';
  for (let x = 0; x < canvas.width; x += 30) {
    for (let y = 0; y < canvas.height; y += 30) {
      context.beginPath();
      context.arc(x, y, 1.2, 0, Math.PI * 2);
      context.fill();
    }
  }

  context.fillStyle = '#1a1f1d';
  context.strokeStyle = '#5adf82';
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(54, 54, canvas.width - 108, canvas.height - 108, 28);
  context.fill();
  context.stroke();

  context.fillStyle = '#5adf82';
  context.font = '800 24px Arial';
  context.textAlign = 'center';
  context.fillText('MES DE LA INGENIERIA', canvas.width / 2, 128);

  context.fillStyle = '#f4fff0';
  context.font = '900 48px Arial';
  const titleBottom = wrapCanvasText(context, event.title, canvas.width / 2, 208, 850, 58);

  const modeLabel = mode === 'registration' ? 'INSCRIPCION' : 'ASISTENCIA';
  const day = new Date(event.startsAt).toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'long',
  });
  const date = new Date(event.startsAt).toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const schedule = `${formatTime(event.startsAt)} - ${formatTime(event.endsAt)}`;
  const venue = event.venue?.name || 'Sin espacio asignado';

  context.fillStyle = '#8be694';
  context.font = '800 24px Arial';
  context.fillText(modeLabel, canvas.width / 2, titleBottom + 54);

  const detailsY = titleBottom + 118;
  context.textAlign = 'left';
  context.fillStyle = '#cfe6ca';
  context.font = '700 30px Arial';
  context.fillText('Fecha', 130, detailsY);
  context.fillText('Dia', 130, detailsY + 92);
  context.fillText('Horario', 130, detailsY + 184);
  context.fillText('Lugar', 130, detailsY + 276);

  context.fillStyle = '#f4fff0';
  context.font = '700 34px Arial';
  context.fillText(date, 330, detailsY);
  context.fillText(day.charAt(0).toUpperCase() + day.slice(1), 330, detailsY + 92);
  context.fillText(schedule, 330, detailsY + 184);
  wrapCanvasText(context, venue, 330, detailsY + 276, 590, 42);

  const qrSize = 560;
  const qrX = (canvas.width - qrSize) / 2;
  const qrY = 710;
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
  context.fillText(publicLink, canvas.width / 2, 1310);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });

  if (!blob) {
    throw new Error('No fue posible descargar la tarjeta.');
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `tarjeta-${mode === 'registration' ? 'inscripción' : 'asistencia'}-${fileSafeName(event.title) || 'evento'}.png`;
  link.click();
  URL.revokeObjectURL(url);
}

function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const EventsPage = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceItem[]>([]);
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [responsibleNote, setResponsibleNote] = useState('');
  const [publicQrSvg, setPublicQrSvg] = useState('');
  const [publicLink, setPublicLink] = useState('');
  const [publicLinkTitle, setPublicLinkTitle] = useState('');
  const [publicLinkEvent, setPublicLinkEvent] = useState<EventItem | null>(null);
  const [publicLinkMode, setPublicLinkMode] = useState<'registration' | 'attendance'>('attendance');
  const [showEventModal, setShowEventModal] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const responsibleCandidates = useMemo(
    () => users.filter((user) => user.roles.some((role) => ['ADMIN', 'COORDINADOR', 'LOGISTICA', 'PONENTE'].includes(role))),
    [users]
  );

  const requiresTalkData = form.type === 'TALK' || form.type === 'WORKSHOP';
  const selectedCheckedIn = selectedAttendance.filter((item) => item.status === 'CHECKED_IN').length;
  const selectedRegistered = selectedAttendance.filter((item) => item.status === 'REGISTERED').length;
  const selectedActiveAttendance = selectedAttendance.filter((item) => item.status !== 'CANCELLED').length;
  const selectedAvailable = selectedEvent?.capacity ? Math.max(selectedEvent.capacity - selectedActiveAttendance, 0) : null;
  const selectedDuration = selectedEvent ? getDurationMinutes(selectedEvent.startsAt, selectedEvent.endsAt) : null;

  async function loadData() {
    const [eventsData, venuesData, usersData, speakerData] = await Promise.all([
      listEventsRequest({ search: search || undefined, type: filterType || undefined, status: filterStatus || undefined }),
      listVenuesRequest(),
      listUsersRequest(),
      listSpeakersRequest(),
    ]);
    setEvents(eventsData);
    setVenues(venuesData);
    setUsers(usersData.users);
    setSpeakers(speakerData);
  }

  useEffect(() => {
    loadData().catch(() => setError('No fue posible cargar la agenda.'));
  }, []);

  async function applyFilters() {
    setError('');
    await loadData().catch(() => setError('No fue posible aplicar los filtros.'));
  }

  function editEvent(event: EventItem) {
    setForm({
      id: event.id,
      title: event.title,
      type: event.type,
      status: event.status,
      description: event.description || '',
      venueId: event.venue?.id || '',
      startsAt: toDateTimeLocalValue(event.startsAt),
      endsAt: toDateTimeLocalValue(event.endsAt),
      capacity: event.capacity ? String(event.capacity) : '',
      topic: event.talk?.topic || '',
      speakerId: event.talk?.speaker?.id || '',
      speakerName: event.talk?.speaker?.fullName || '',
      speakerEmail: event.talk?.speaker?.email || '',
      speakerCompany: event.talk?.speaker?.company || '',
      speakerBio: event.talk?.speaker?.bio || '',
      speakerPhotoUrl: event.talk?.speaker?.photoUrl || '',
      competitionSport: 'MARATON_PROGRAMACION',
      competitionFormat: 'ROUND_ROBIN',
      competitionMaxTeams: '',
      competitionMaxMembersPerTeam: '',
    });
    setShowEventModal(true);
  }

  function updateStartDateTime(value: string) {
    setForm({
      ...form,
      startsAt: value,
      endsAt: oneHourAfterLocalInput(value),
    });
  }

  function resetForm() {
    setForm(emptyForm);
  }

  function openCreateModal() {
    setError('');
    setMessage('');
    setForm(emptyForm);
    setShowEventModal(true);
  }

  function closeEventModal() {
    setShowEventModal(false);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    // "Competencia" es una puerta de entrada desde agenda, no un Event real.
    // Al guardar se crea un Tournament para reutilizar inscripciones, equipos,
    // fixture, rankings y publicacion del modulo Torneos.
    if (form.type === 'COMPETITION') {
      if (form.id) {
        setError('Un evento existente no se puede convertir en competencia. Crea una competencia nueva para que se registre como torneo.');
        return;
      }

      try {
        await createTournamentRequest({
          name: form.title,
          sport: form.competitionSport,
          mode: 'TEAM',
          format: form.competitionFormat,
          status: tournamentStatusFromEventStatus(form.status),
          videoGameTitle: null,
          venueId: form.venueId || null,
          description: form.description || null,
          rules: null,
          maxTeams: form.competitionMaxTeams ? Number(form.competitionMaxTeams) : null,
          maxMembersPerTeam: form.competitionMaxMembersPerTeam ? Number(form.competitionMaxMembersPerTeam) : null,
          maxParticipants: null,
          startsAt: form.startsAt ? fromDateTimeLocalValue(form.startsAt) : null,
          endsAt: form.endsAt ? fromDateTimeLocalValue(form.endsAt) : null,
        });

        resetForm();
        setShowEventModal(false);
        setMessage('La competencia no se guardó como evento: se creó como torneo y se gestiona desde el módulo Torneos.');
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, 'No fue posible crear el torneo de competencia.'));
      }
      return;
    }

    const payload = {
      title: form.title,
      description: form.description || null,
      type: form.type,
      status: form.status,
      venueId: form.venueId || null,
      startsAt: fromDateTimeLocalValue(form.startsAt),
      endsAt: fromDateTimeLocalValue(form.endsAt),
      capacity: form.capacity ? Number(form.capacity) : null,
    };

    try {
      let savedEvent: EventItem;

      if (form.id) {
        savedEvent = await updateEventRequest(form.id, payload);
      } else {
        savedEvent = await createEventRequest(payload);
      }

      if (requiresTalkData) {
        let selectedSpeakerId = form.speakerId || null;

        if (!selectedSpeakerId && form.speakerName) {
          const speaker = await createSpeakerRequest({
            fullName: form.speakerName,
            email: form.speakerEmail || undefined,
            company: form.speakerCompany || undefined,
            bio: form.speakerBio || null,
            photoUrl: form.speakerPhotoUrl || null,
          });
          selectedSpeakerId = speaker.id;
        }

        if (savedEvent.talk?.id) {
          await updateTalkRequest(savedEvent.talk.id, {
            eventId: savedEvent.id,
            speakerId: selectedSpeakerId,
            topic: form.topic || savedEvent.title,
          });
        } else {
          await createTalkRequest({
            eventId: savedEvent.id,
            speakerId: selectedSpeakerId,
            topic: form.topic || savedEvent.title,
          });
        }
      }

      resetForm();
      setShowEventModal(false);
      await loadData();
    } catch {
      setError('No fue posible guardar el evento. Revisa horario, espacio y datos.');
    }
  }

  async function removeEvent(id: string) {
    if (!confirm('Eliminar este evento?')) {
      return;
    }

    await deleteEventRequest(id);
    if (selectedEvent?.id === id) {
      setSelectedEvent(null);
      setSelectedAttendance([]);
    }
    await loadData();
  }

  async function openDetail(id: string) {
    setError('');
    try {
      const [eventDetail, attendance] = await Promise.all([
        getEventRequest(id),
        listAttendanceRequest(id),
      ]);
      setSelectedEvent(eventDetail);
      setSelectedAttendance(attendance);
    } catch {
      setError('No fue posible abrir el detalle del evento.');
    }
  }

  async function showPublicLink(event: EventItem, mode: 'registration' | 'attendance') {
    setError('');
    try {
      const publicEventKey = event.slug || event.id;
      const [formData, svg] = await Promise.all([
        getPublicEventFormRequest(publicEventKey, mode),
        getPublicEventQrSvgRequest(publicEventKey, mode),
      ]);
      setPublicLink(formData.url);
      setPublicQrSvg(svg);
      setPublicLinkTitle(`${mode === 'registration' ? 'Inscripción' : 'Asistencia'} - ${event.title}`);
      setPublicLinkEvent(event);
      setPublicLinkMode(mode);
    } catch {
      setError('No fue posible generar el link y QR para este evento.');
    }
  }

  async function assignResponsible(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEvent || !responsibleUserId) {
      return;
    }

    await addEventResponsibleRequest(selectedEvent.id, {
      userId: responsibleUserId,
      roleNote: responsibleNote,
    });
    setResponsibleUserId('');
    setResponsibleNote('');
    await openDetail(selectedEvent.id);
  }

  async function updateSpeakerPhoto(file?: File) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('La foto del ponente debe ser una imagen.');
      return;
    }

    if (file.size > 1_500_000) {
      setError('La foto del ponente no puede superar 1.5 MB.');
      return;
    }

    setForm({ ...form, speakerPhotoUrl: await readImageAsDataUrl(file) });
  }

  return (
    <div>
      <Topbar title="Eventos" />
      <div className="px-6 py-6">
        <FormModal
          open={showEventModal}
          title={form.id ? 'Editar evento' : 'Nuevo evento'}
          description="Configura los datos principales del evento. Si es charla o taller, agrega el tema y el ponente."
          onClose={closeEventModal}
          size="xl"
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-700">
              Título
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Descripcion
              <textarea
                className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Describe el objetivo, contenido o requisitos de la charla o taller"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-slate-700">
                Tipo
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.type}
                  onChange={(event) => {
                    const type = event.target.value;
                    setForm({
                      ...form,
                      type,
                      competitionFormat:
                        type === 'COMPETITION'
                          ? defaultCompetitionFormat(form.competitionSport)
                          : form.competitionFormat,
                    });
                  }}
                >
                  {eventTypes.map((item) => <option key={item} value={item}>{eventTypeLabels[item]}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Estado
                <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                  {eventStatuses.map((item) => <option key={item} value={item}>{eventStatusLabels[item]}</option>)}
                </select>
              </label>
            </div>
            {form.type === 'COMPETITION' ? (
              <div className="space-y-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">
                  Esta categoría no se guarda como evento. Al guardar se creará un torneo y se administrará desde el módulo Torneos.
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block font-medium">
                    Disciplina
                    <select
                      className="mt-1 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900"
                      value={form.competitionSport}
                      onChange={(event) => {
                        const sport = event.target.value;
                        setForm({
                          ...form,
                          competitionSport: sport,
                          competitionFormat: defaultCompetitionFormat(sport),
                        });
                      }}
                    >
                      {competitionSports.map((sport) => (
                        <option key={sport} value={sport}>{tournamentSportLabels[sport]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block font-medium">
                    Formato del torneo
                    <select
                      className="mt-1 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900"
                      value={form.competitionFormat}
                      onChange={(event) => setForm({ ...form, competitionFormat: event.target.value })}
                    >
                      {competitionFormats.map((format) => (
                        <option key={format} value={format}>{tournamentFormatLabels[format]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block font-medium">
                    Máximo de equipos
                    <input
                      className="mt-1 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900"
                      type="number"
                      min="1"
                      value={form.competitionMaxTeams}
                      onChange={(event) => setForm({ ...form, competitionMaxTeams: event.target.value })}
                      placeholder="Sin límite"
                    />
                  </label>
                  <label className="block font-medium">
                    Máximo integrantes por equipo
                    <input
                      className="mt-1 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900"
                      type="number"
                      min="1"
                      value={form.competitionMaxMembersPerTeam}
                      onChange={(event) => setForm({ ...form, competitionMaxMembersPerTeam: event.target.value })}
                      placeholder="Sin límite"
                    />
                  </label>
                </div>
                <p className="text-xs">
                  Estado resultante del torneo: {tournamentStatusLabels[tournamentStatusFromEventStatus(form.status)]}.
                </p>
              </div>
            ) : null}
            <label className="block text-sm font-medium text-slate-700">
              Espacio
              <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.venueId} onChange={(event) => setForm({ ...form, venueId: event.target.value })}>
                <option value="">Sin espacio</option>
                {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-slate-700">
                Inicio
                <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="datetime-local" value={form.startsAt} onChange={(event) => updateStartDateTime(event.target.value)} required />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Fin
                <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} required />
              </label>
            </div>
            {form.type !== 'COMPETITION' ? (
              <label className="block text-sm font-medium text-slate-700">
                Capacidad
                <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min="1" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} />
              </label>
            ) : null}
            {requiresTalkData ? (
              <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-950">
                  {form.type === 'WORKSHOP' ? 'Datos del taller' : 'Datos de la charla'}
                </p>
                <label className="block text-sm font-medium text-slate-700">
                  Tema
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} placeholder="Tema o título académico" />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Ponente registrado
                  <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.speakerId} onChange={(event) => setForm({ ...form, speakerId: event.target.value, speakerName: event.target.value ? '' : form.speakerName })}>
                    <option value="">Crear nuevo ponente</option>
                    {speakers.map((speaker) => <option key={speaker.id} value={speaker.id}>{speaker.fullName}</option>)}
                  </select>
                </label>
                {!form.speakerId ? (
                  <>
                    <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Nombre del ponente" value={form.speakerName} onChange={(event) => setForm({ ...form, speakerName: event.target.value })} />
                    <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Correo del ponente" type="email" value={form.speakerEmail} onChange={(event) => setForm({ ...form, speakerEmail: event.target.value })} />
                    <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Empresa o institucion" value={form.speakerCompany} onChange={(event) => setForm({ ...form, speakerCompany: event.target.value })} />
                    <textarea
                      className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="¿Quien es? Perfil breve del ponente"
                      value={form.speakerBio}
                      onChange={(event) => setForm({ ...form, speakerBio: event.target.value })}
                    />
                    <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-3">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-500">
                        {form.speakerPhotoUrl ? (
                          <img className="h-full w-full object-cover" src={form.speakerPhotoUrl} alt="Foto del ponente" />
                        ) : (
                          'Foto'
                        )}
                      </div>
                      <label className="block flex-1 text-sm font-medium text-slate-700">
                        Foto del ponente
                        <input
                          className="mt-1 w-full text-xs"
                          type="file"
                          accept="image/*"
                          onChange={(event) => void updateSpeakerPhoto(event.target.files?.[0])}
                        />
                      </label>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">{form.id ? 'Guardar cambios' : 'Crear evento'}</button>
              <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" type="button" onClick={closeEventModal}>Cancelar</button>
            </div>
          </form>
        </FormModal>

        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Buscar evento" value={search} onChange={(event) => setSearch(event.target.value)} />
              <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={filterType} onChange={(event) => setFilterType(event.target.value)}>
                <option value="">Todos los tipos</option>
                {eventTypes.map((item) => <option key={item} value={item}>{eventTypeLabels[item]}</option>)}
              </select>
              <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
                <option value="">Todos los estados</option>
                {eventStatuses.map((item) => <option key={item} value={item}>{eventStatusLabels[item]}</option>)}
              </select>
              <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white" type="button" onClick={() => void applyFilters()}>Filtrar</button>
            </div>
          </section>
          {message ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              {message}
            </p>
          ) : null}
          {error && !showEventModal ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-950">Agenda</h3>
              <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white" type="button" onClick={openCreateModal}>
                Nuevo evento
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="theme-table-head">
                  <tr>
                    <th className="px-5 py-3 text-left">Evento</th>
                    <th className="px-5 py-3 text-left">Tipo</th>
                    <th className="px-5 py-3 text-left">Espacio</th>
                    <th className="px-5 py-3 text-left">Inicio</th>
                    <th className="px-5 py-3 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td className="px-5 py-3 font-medium text-slate-950">{event.title}</td>
                      <td className="px-5 py-3 text-slate-600">{labelFor(eventTypeLabels, event.type)}</td>
                      <td className="px-5 py-3 text-slate-600">{event.venue?.name || 'Sin espacio'}</td>
                      <td className="px-5 py-3 text-slate-600">{formatColombiaDateTime(event.startsAt)}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold" onClick={() => void openDetail(event.id)}>Detalle</button>
                          <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold" onClick={() => void showPublicLink(event, 'attendance')}>Asistencia</button>
                          {event.type === 'WORKSHOP' ? (
                            <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold" onClick={() => void showPublicLink(event, 'registration')}>Inscripción</button>
                          ) : null}
                          <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold" onClick={() => editEvent(event)}>Editar</button>
                          <button className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700" onClick={() => void removeEvent(event.id)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {publicQrSvg ? (
            <section className="overflow-hidden rounded-xl border border-[#5adf82]/35 bg-[#191d1c] shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#5adf82]/20 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8be694]">
                    Link público
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-[#f4fff0]">{publicLinkTitle}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-md border border-[#5adf82]/35 px-3 py-2 text-sm font-semibold text-[#f4fff0]" type="button" onClick={() => void navigator.clipboard.writeText(publicLink)}>Copiar link</button>
                  {publicLinkEvent ? (
                    <button
                      className="rounded-md bg-[#8be694] px-3 py-2 text-sm font-semibold text-[#0d1210]"
                      type="button"
                      onClick={() => {
                        downloadPublicEventCard(publicQrSvg, publicLinkEvent, publicLinkMode, publicLink)
                          .catch(() => setError('No fue posible descargar la tarjeta QR.'));
                      }}
                    >
                      Descargar tarjeta
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-5 p-5 lg:grid-cols-[320px_1fr]">
                <div className="rounded-xl border border-[#5adf82]/35 bg-[#0f1513] p-5">
                  <div
                    className="qr-svg-fit mx-auto aspect-square w-full max-w-[260px] rounded-lg border border-[#8be694]/50 bg-white p-3 shadow-[0_0_28px_rgba(90,223,130,0.16)]"
                    dangerouslySetInnerHTML={{ __html: publicQrSvg }}
                  />
                </div>
                <div className="flex min-w-0 flex-col justify-center rounded-xl border border-[#5adf82]/25 bg-[#101613] p-5">
                  {publicLinkEvent ? (
                    <>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8be694]">
                        {publicLinkMode === 'registration' ? 'Inscripción' : 'Asistencia'}
                      </p>
                      <h4 className="mt-2 text-2xl font-extrabold text-[#f4fff0]">{publicLinkEvent.title}</h4>
                      <dl className="mt-5 grid gap-3 text-sm text-[#cfe6ca] sm:grid-cols-2">
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8aa08a]">Fecha</dt>
                          <dd className="mt-1 font-semibold">{formatDate(publicLinkEvent.startsAt)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8aa08a]">Horario</dt>
                          <dd className="mt-1 font-semibold">{formatTime(publicLinkEvent.startsAt)} - {formatTime(publicLinkEvent.endsAt)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8aa08a]">Lugar</dt>
                          <dd className="mt-1 font-semibold">{publicLinkEvent.venue?.name || 'Sin espacio'}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8aa08a]">Tipo</dt>
                          <dd className="mt-1 font-semibold">{labelFor(eventTypeLabels, publicLinkEvent.type)}</dd>
                        </div>
                      </dl>
                    </>
                  ) : null}
                  <p className="mt-5 break-all rounded-lg border border-[#5adf82]/20 bg-[#0b100e] px-3 py-2 text-xs text-[#b9cbb8]">{publicLink}</p>
                </div>
              </div>
            </section>
          ) : null}

          {selectedEvent ? (
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">{selectedEvent.title}</h3>
                  <p className="mt-2 text-sm font-medium text-slate-700">
                    {formatDate(selectedEvent.startsAt)} de {formatTime(selectedEvent.startsAt)} a {formatTime(selectedEvent.endsAt)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{labelFor(eventTypeLabels, selectedEvent.type)} - {labelFor(eventStatusLabels, selectedEvent.status)} - {selectedEvent.venue?.name || 'Sin espacio'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold" type="button" onClick={() => void showPublicLink(selectedEvent, 'attendance')}>Asistencia</button>
                  {selectedEvent.type === 'WORKSHOP' ? (
                    <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold" type="button" onClick={() => void showPublicLink(selectedEvent, 'registration')}>Inscripción</button>
                  ) : null}
                  <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold" type="button" onClick={() => setSelectedEvent(null)}>Cerrar detalle</button>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Confirmados</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{selectedCheckedIn}</p>
                  <p className="mt-1 text-xs text-slate-500">Asistencia registrada</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Preinscritos</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{selectedRegistered}</p>
                  <p className="mt-1 text-xs text-slate-500">{selectedEvent.type === 'WORKSHOP' ? 'Inscripción previa' : 'Registros pendientes'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Capacidad</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{selectedEvent.capacity || 'Sin límite'}</p>
                  <p className="mt-1 text-xs text-slate-500">{selectedAvailable === null ? 'Sin cupo maximo' : `${selectedAvailable} disponibles`}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Responsables</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{selectedEvent.responsibles?.length || 0}</p>
                  <p className="mt-1 text-xs text-slate-500">Equipo asignado</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Programacion</p>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">Fecha</dt>
                      <dd className="mt-1 font-semibold capitalize text-slate-950">{formatDate(selectedEvent.startsAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Horario</dt>
                      <dd className="mt-1 font-semibold text-slate-950">{formatTime(selectedEvent.startsAt)} - {formatTime(selectedEvent.endsAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Duracion</dt>
                      <dd className="mt-1 font-semibold text-slate-950">{selectedDuration ? `${selectedDuration} minutos` : 'Sin duracion'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Ventana de asistencia</dt>
                      <dd className="mt-1 font-semibold text-slate-950">{formatAttendanceWindow(selectedEvent)}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Espacio</p>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">Auditorio / salon</dt>
                      <dd className="mt-1 font-semibold text-slate-950">{selectedEvent.venue?.name || 'Sin espacio asignado'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Ubicación</dt>
                      <dd className="mt-1 font-semibold text-slate-950">{selectedEvent.venue?.location || 'Sin ubicación'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Estado</dt>
                      <dd className="mt-1 font-semibold text-slate-950">{labelFor(eventStatusLabels, selectedEvent.status)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Tipo</dt>
                      <dd className="mt-1 font-semibold text-slate-950">{labelFor(eventTypeLabels, selectedEvent.type)}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
                    {labelFor(eventTypeLabels, selectedEvent.type)}
                  </p>
                  <dl className="mt-3 grid gap-3 text-sm">
                    <div>
                      <dt className="text-slate-500">Tema</dt>
                      <dd className="mt-1 break-words font-semibold text-slate-950">{selectedEvent.talk?.topic || selectedEvent.title}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Descripcion</dt>
                      <dd className="mt-1 break-words text-slate-700">{selectedEvent.description || 'Sin descripcion registrada'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Ponente</p>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">Nombre</dt>
                      <dd className="mt-1 font-semibold text-slate-950">{selectedEvent.talk?.speaker?.fullName || 'Sin ponente asignado'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Correo</dt>
                      <dd className="mt-1 break-all font-semibold text-slate-950">{selectedEvent.talk?.speaker?.email || 'Sin correo'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Empresa / institucion</dt>
                      <dd className="mt-1 font-semibold text-slate-950">{selectedEvent.talk?.speaker?.company || 'Sin empresa'}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-slate-500">¿Quien es?</dt>
                      <dd className="mt-1 break-words text-slate-700">{selectedEvent.talk?.speaker?.bio || 'Sin descripcion del ponente'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Formulario</dt>
                      <dd className="mt-1 font-semibold text-slate-950">{selectedEvent.type === 'WORKSHOP' ? 'Inscripción y asistencia' : 'Asistencia'}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <form className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={assignResponsible}>
                <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={responsibleUserId} onChange={(event) => setResponsibleUserId(event.target.value)} required>
                  <option value="">Selecciona responsable</option>
                  {responsibleCandidates.map((user) => <option key={user.id} value={user.id}>{user.name} - {user.roles.map((role) => labelFor(roleLabels, role)).join(', ')}</option>)}
                </select>
                <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Rol en el evento" value={responsibleNote} onChange={(event) => setResponsibleNote(event.target.value)} />
                <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Asignar</button>
              </form>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-semibold text-slate-950">Responsables</h4>
                  <div className="mt-2 space-y-2">
                    {selectedEvent.responsibles?.map((responsible) => (
                      <div key={responsible.id} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
                        <p className="font-semibold text-slate-950">{responsible.user.name}</p>
                        <p className="text-slate-500">{responsible.roleNote || responsible.user.email}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-950">Ultimos asistentes</h4>
                  <div className="mt-2 space-y-2">
                    {selectedAttendance.slice(0, 5).map((item) => (
                      <div key={item.id} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
                        <p className="font-semibold text-slate-950">{item.user?.name || item.fullName}</p>
                        <p className="text-slate-500">{labelFor(attendanceStatusLabels, item.status)} - {labelFor(attendanceMethodLabels, item.method)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default EventsPage;

