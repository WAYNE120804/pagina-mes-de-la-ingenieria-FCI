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
import {
  createSpeakerRequest,
  createTalkRequest,
  listSpeakersRequest,
  updateTalkRequest,
  type Speaker,
} from '../../api/talks.api';
import { listUsersRequest, type UserRow } from '../../api/users.api';
import { listVenuesRequest, type Venue } from '../../api/venues.api';
import Topbar from '../../components/Layout/Topbar';
import FormModal from '../../components/common/FormModal';
import {
  attendanceMethodLabels,
  attendanceStatusLabels,
  eventStatusLabels,
  eventTypeLabels,
  labelFor,
  roleLabels,
} from '../../utils/labels';

const eventTypes = Object.keys(eventTypeLabels);
const eventStatuses = Object.keys(eventStatusLabels);

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
  speakerPhotoUrl: string;
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
  speakerPhotoUrl: '',
};

function toLocalInputValue(value: string) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function oneHourAfterLocalInput(value: string) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  date.setHours(date.getHours() + 1);
  return toLocalInputValue(date.toISOString());
}

function formatDate(value?: string) {
  if (!value) {
    return 'Sin fecha';
  }

  return new Date(value).toLocaleDateString('es-CO', {
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
  const [showEventModal, setShowEventModal] = useState(false);
  const [error, setError] = useState('');

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
      startsAt: toLocalInputValue(event.startsAt),
      endsAt: toLocalInputValue(event.endsAt),
      capacity: event.capacity ? String(event.capacity) : '',
      topic: event.talk?.topic || '',
      speakerId: event.talk?.speaker?.id || '',
      speakerName: event.talk?.speaker?.fullName || '',
      speakerEmail: event.talk?.speaker?.email || '',
      speakerCompany: event.talk?.speaker?.company || '',
      speakerPhotoUrl: event.talk?.speaker?.photoUrl || '',
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

    const payload = {
      title: form.title,
      description: form.description || null,
      type: form.type,
      status: form.status,
      venueId: form.venueId || null,
      startsAt: form.startsAt,
      endsAt: form.endsAt,
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
      const [formData, svg] = await Promise.all([
        getPublicEventFormRequest(event.id, mode),
        getPublicEventQrSvgRequest(event.id, mode),
      ]);
      setPublicLink(formData.url);
      setPublicQrSvg(svg);
      setPublicLinkTitle(`${mode === 'registration' ? 'Inscripcion' : 'Asistencia'} - ${event.title}`);
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
              Titulo
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
                <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
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
            <label className="block text-sm font-medium text-slate-700">
              Capacidad
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min="1" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} />
            </label>
            {requiresTalkData ? (
              <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-950">
                  {form.type === 'WORKSHOP' ? 'Datos del taller' : 'Datos de la charla'}
                </p>
                <label className="block text-sm font-medium text-slate-700">
                  Tema
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} placeholder="Tema o titulo academico" />
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
                      <td className="px-5 py-3 text-slate-600">{new Date(event.startsAt).toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold" onClick={() => void openDetail(event.id)}>Detalle</button>
                          <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold" onClick={() => void showPublicLink(event, 'attendance')}>Asistencia</button>
                          {event.type === 'WORKSHOP' ? (
                            <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold" onClick={() => void showPublicLink(event, 'registration')}>Inscripcion</button>
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
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">{publicLinkTitle}</h3>
                  <p className="mt-1 break-all text-sm text-slate-600">{publicLink}</p>
                </div>
                <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold" type="button" onClick={() => void navigator.clipboard.writeText(publicLink)}>Copiar link</button>
              </div>
              <div className="mt-4 h-48 w-48 rounded-md border border-slate-200 bg-slate-50 p-3" dangerouslySetInnerHTML={{ __html: publicQrSvg }} />
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
                    <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold" type="button" onClick={() => void showPublicLink(selectedEvent, 'registration')}>Inscripcion</button>
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
                  <p className="mt-1 text-xs text-slate-500">{selectedEvent.type === 'WORKSHOP' ? 'Inscripcion previa' : 'Registros pendientes'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Capacidad</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{selectedEvent.capacity || 'Sin limite'}</p>
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
                      <dt className="text-slate-500">Ubicacion</dt>
                      <dd className="mt-1 font-semibold text-slate-950">{selectedEvent.venue?.location || 'Sin ubicacion'}</dd>
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
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">{selectedEvent.type === 'WORKSHOP' ? 'Taller' : 'Charla'}</p>
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
                    <div>
                      <dt className="text-slate-500">Formulario</dt>
                      <dd className="mt-1 font-semibold text-slate-950">{selectedEvent.type === 'WORKSHOP' ? 'Inscripcion y asistencia' : 'Asistencia'}</dd>
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

