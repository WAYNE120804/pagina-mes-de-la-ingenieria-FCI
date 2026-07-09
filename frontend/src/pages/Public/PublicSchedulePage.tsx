import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import {
  listPublicEventsRequest,
  type PublicEventItem,
} from '../../api/events.api';
import { eventTypeLabels, labelFor } from '../../utils/labels';
import PublicLayout from './PublicLayout';
import { campusImage } from './publicContent';

type PublicSchedulePageProps = {
  eventType?: 'TALK' | 'WORKSHOP' | 'COMPETITION';
};

function dayLabel(value: string) {
  const formatted = new Date(value).toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return formatted.replace(' de 20', ' del 20');
}

function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function weekdayOnlyLabel(value: string) {
  return new Date(value).toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'long',
  });
}

function dateOnlyLabel(value: string) {
  return new Date(value).toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function durationLabel(start: string, end: string) {
  const minutes = Math.max(
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000),
    0
  );

  if (minutes < 60) {
    return `${minutes} minutos`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} h ${remainingMinutes} min` : `${hours} horas`;
}

const copyByType = {
  TALK: {
    title: 'Charlas',
    subtitle: 'Conferencias y sesiones académicas publicadas desde el panel administrativo.',
    loading: 'Cargando charlas publicadas...',
    empty: 'Aún no hay charlas publicadas desde el panel administrativo.',
  },
  WORKSHOP: {
    title: 'Talleres',
    subtitle: 'Talleres con inscripción previa publicados desde el panel administrativo.',
    loading: 'Cargando talleres publicados...',
    empty: 'Aún no hay talleres publicados desde el panel administrativo.',
  },
  COMPETITION: {
    title: 'Competencias',
    subtitle: 'Retos, maratones y actividades competitivas publicadas desde el panel administrativo.',
    loading: 'Cargando competencias publicadas...',
    empty: 'Aún no hay competencias publicadas desde el panel administrativo.',
  },
};

const defaultCopy = {
  title: 'Cronograma de Actividades',
  subtitle: 'Agenda publicada desde el panel administrativo para la comunidad FCI.',
  loading: 'Cargando cronograma publicado...',
  empty: 'Aún no hay eventos publicados desde el panel administrativo.',
};

const PublicSchedulePage = ({ eventType }: PublicSchedulePageProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allEvents, setAllEvents] = useState<PublicEventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [profileEvent, setProfileEvent] = useState<PublicEventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const copy = eventType ? copyByType[eventType] : defaultCopy;
  const requestedEventId = searchParams.get('evento') || '';

  useEffect(() => {
    listPublicEventsRequest()
      .then(setAllEvents)
      .catch(() => setError('No fue posible cargar el cronograma publicado.'))
      .finally(() => setLoading(false));
  }, []);

  const events = useMemo(
    () => (eventType ? allEvents.filter((event) => event.type === eventType) : allEvents),
    [allEvents, eventType]
  );
  const selectedEvent =
    events.find((event) => event.id === selectedEventId) ||
    events.find((event) => event.id === requestedEventId) ||
    events[0] ||
    null;

  useEffect(() => {
    if (!requestedEventId || events.length === 0) {
      return;
    }

    const eventFromUrl = events.find((event) => event.id === requestedEventId);

    if (eventFromUrl) {
      setSelectedEventId(eventFromUrl.id);
      setProfileEvent(eventFromUrl);
    }
  }, [events, requestedEventId]);

  function openEventProfile(event: PublicEventItem) {
    setSelectedEventId(event.id);
    setProfileEvent(event);
    setSearchParams({ evento: event.id });
  }

  function closeEventProfile() {
    setProfileEvent(null);
    setSearchParams({});
  }

  const groupedEvents = useMemo(
    () =>
      events.reduce<Record<string, PublicEventItem[]>>((groups, event) => {
        const key = dayLabel(event.startsAt);
        groups[key] = groups[key] || [];
        groups[key].push(event);
        return groups;
      }, {}),
    [events]
  );

  return (
    <PublicLayout>
      <main className="public-technical-grid mx-auto max-w-7xl px-4 py-12 md:px-12">
        <section className="mb-12">
          <h1 className="font-display text-5xl font-extrabold leading-tight text-[#f0ffed]">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-2xl text-[#b9cbb8]">
            {copy.subtitle}
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-12">
          <aside className="space-y-6 lg:col-span-3">
            <section className="rounded-xl border border-[#3b4b3c] bg-[#1d2022]/80 p-6 backdrop-blur">
              <h2 className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#5adf82]">
                Categorías publicadas
              </h2>
              <div className="mt-5 space-y-3 text-sm text-[#b9cbb8]">
                {Array.from(new Set(allEvents.map((event) => event.type))).length ? (
                  Array.from(new Set(allEvents.map((event) => event.type))).map((type) => (
                    <div key={type} className="flex items-center justify-between border-b border-[#3b4b3c] pb-2">
                      <span>{labelFor(eventTypeLabels, type)}</span>
                      <span className="font-mono text-[#5adf82]">
                        {allEvents.filter((event) => event.type === type).length}
                      </span>
                    </div>
                  ))
                ) : (
                  <p>No hay categorías disponibles.</p>
                )}
              </div>
            </section>
            <section className="rounded-xl border border-[#5adf82]/30 bg-[#02a752]/10 p-6">
              <h2 className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#5adf82]">
                Ubicación central
              </h2>
              <p className="mt-3 font-display text-xl font-bold leading-tight text-[#f0ffed]">
                {selectedEvent?.venue?.name || 'Selecciona una actividad'}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#b9cbb8]">
                {selectedEvent?.venue?.location || 'Haz clic en una actividad para ver su ubicación.'}
              </p>
              <div className="relative mt-5 h-32 overflow-hidden rounded-lg border border-[#3b4b3c]">
                <img
                  className="h-full w-full object-cover opacity-50 grayscale"
                  src={selectedEvent?.venue?.photoUrl || campusImage}
                  alt={selectedEvent?.venue?.name || 'Mapa del campus'}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-[#5adf82]">location_on</span>
                </div>
              </div>
            </section>
          </aside>

          <section className="space-y-12 lg:col-span-9">
            {loading ? (
              <p className="rounded-xl border border-[#3b4b3c] bg-[#1d2022] p-6 text-[#b9cbb8]">
                {copy.loading}
              </p>
            ) : error ? (
              <p className="rounded-xl border border-[#ffb4ab]/30 bg-[#93000a]/20 p-6 text-[#ffb4ab]">{error}</p>
            ) : events.length === 0 ? (
              <p className="rounded-xl border border-[#3b4b3c] bg-[#1d2022] p-6 text-[#b9cbb8]">
                {copy.empty}
              </p>
            ) : (
              Object.entries(groupedEvents).map(([day, dayEvents]) => (
                <div key={day}>
                  <div className="mb-6 flex items-center gap-6">
                    <h2 className="font-display text-2xl font-bold text-[#5adf82]">{day}</h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-[#5adf82]/50 to-transparent" />
                  </div>
                  <div className="space-y-5">
                    {dayEvents.map((event) => (
                      <article
                        key={event.id}
                        className={[
                          'cursor-pointer rounded-2xl border bg-[#1d2022]/80 p-6 backdrop-blur transition-colors hover:border-[#5adf82]',
                          selectedEvent?.id === event.id
                            ? 'border-[#5adf82] shadow-[0_0_0_1px_rgba(90,223,130,0.35)]'
                            : 'border-[#3b4b3c]',
                        ].join(' ')}
                        role="button"
                        tabIndex={0}
                        onClick={() => openEventProfile(event)}
                        onKeyDown={(keyboardEvent) => {
                          if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                            keyboardEvent.preventDefault();
                            openEventProfile(event);
                          }
                        }}
                      >
                        <div className="flex flex-col gap-6 md:flex-row">
                          <div className="md:w-36 md:border-r md:border-[#3b4b3c]">
                            <span className="block font-mono text-lg font-bold text-[#5adf82]">{timeLabel(event.startsAt)}</span>
                            <span className="font-mono text-xs uppercase tracking-wider text-[#849584]">
                              {durationLabel(event.startsAt, event.endsAt)}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <h3 className="font-display text-xl font-bold text-[#f0ffed]">{event.title}</h3>
                              <span className="w-fit rounded-full border border-[#5adf82]/20 bg-[#5adf82]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[#5adf82]">
                                {labelFor(eventTypeLabels, event.type)}
                              </span>
                            </div>
                            <p className="mt-4 text-sm leading-6 text-[#b9cbb8]">
                              {event.description || 'Sin descripcion registrada.'}
                            </p>
                            <div className="mt-5 flex flex-wrap gap-4 text-sm text-[#b9cbb8]">
                              {event.talk?.speaker?.fullName ? (
                                <span className="inline-flex items-center gap-2">
                                  <span className="material-symbols-outlined text-sm text-[#5adf82]">person</span>
                                  Ponente: {event.talk.speaker.fullName}
                                </span>
                              ) : event.type === 'TALK' || event.type === 'WORKSHOP' ? (
                                <span className="inline-flex items-center gap-2">
                                  <span className="material-symbols-outlined text-sm text-[#5adf82]">person_off</span>
                                  Sin ponente asignado
                                </span>
                              ) : null}
                              <span className="group/location relative inline-flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm text-[#5adf82]">location_on</span>
                                {event.venue?.name || 'Espacio por confirmar'}
                                <span className="pointer-events-none absolute left-0 top-full z-30 mt-3 hidden w-72 overflow-hidden rounded-2xl border border-[#5adf82]/30 bg-[#101415] shadow-2xl shadow-black/40 group-hover/location:block">
                                  <img
                                    className="h-32 w-full object-cover opacity-80"
                                    src={event.venue?.photoUrl || campusImage}
                                    alt={event.venue?.name || 'Ubicación'}
                                  />
                                  <span className="block p-4">
                                    <span className="block font-mono text-[10px] font-bold uppercase tracking-widest text-[#5adf82]">
                                      Ubicación
                                    </span>
                                    <span className="mt-1 block font-semibold text-[#f0ffed]">
                                      {event.venue?.name || 'Espacio por confirmar'}
                                    </span>
                                    <span className="mt-1 block text-xs leading-5 text-[#b9cbb8]">
                                      {event.venue?.location || 'Ubicación pendiente desde administracion.'}
                                    </span>
                                  </span>
                                </span>
                              </span>
                            </div>
                          </div>
                          {event.type === 'TALK' ? (
                            <div className="md:w-52">
                              <div className="rounded-2xl border border-[#5adf82]/30 bg-[#101415] p-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#3b4b3c] bg-[#1d2022]">
                                    {event.talk?.speaker?.photoUrl ? (
                                      <img
                                        className="h-full w-full object-cover"
                                        src={event.talk.speaker.photoUrl}
                                        alt={event.talk.speaker.fullName}
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-[#5adf82]">
                                        <span className="material-symbols-outlined">person</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#5adf82]">
                                      Ponente
                                    </p>
                                    <p className="mt-1 truncate font-bold text-[#f0ffed]">
                                      {event.talk?.speaker?.fullName || 'Sin ponente'}
                                    </p>
                                    {event.talk?.speaker?.company ? (
                                      <p className="mt-1 truncate text-xs text-[#b9cbb8]">
                                        {event.talk.speaker.company}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : event.registrationUrl || event.attendanceUrl ? (
                            <div className="flex items-center md:w-44">
                              <Link
                                className="w-full rounded-xl bg-[#5adf82] px-4 py-3 text-center font-bold text-[#003917] transition-transform active:scale-95"
                                to={event.registrationUrl || event.attendanceUrl || '#'}
                                onClick={(clickEvent) => clickEvent.stopPropagation()}
                              >
                                {event.registrationUrl ? 'Inscribirse' : 'Asistencia'}
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
        {profileEvent ? (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
            <button
              className="absolute inset-0 cursor-default"
              type="button"
              aria-label="Cerrar detalle del evento"
              onClick={closeEventProfile}
            />
            <section className="relative max-h-[calc(100vh-4rem)] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#5adf82]/40 bg-[#101415] p-6 shadow-2xl shadow-black/50 md:p-8">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <span className="inline-flex rounded-full border border-[#5adf82]/30 bg-[#5adf82]/10 px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-[#5adf82]">
                    {labelFor(eventTypeLabels, profileEvent.type)}
                  </span>
                  <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight text-[#f0ffed]">
                    {profileEvent.talk?.topic || profileEvent.title}
                  </h2>
                </div>
                <button
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#3b4b3c] text-[#b9cbb8] transition-colors hover:border-[#5adf82] hover:text-[#5adf82]"
                  type="button"
                  aria-label="Cerrar"
                  onClick={closeEventProfile}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="mt-7 grid gap-5 md:grid-cols-2">
                <div className="rounded-xl border border-[#3b4b3c] bg-[#1d2022]/80 p-5">
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#5adf82]">
                    Detalle
                  </p>
                  <dl className="mt-4 grid gap-4 text-sm text-[#b9cbb8]">
                    <div>
                      <dt className="text-[#849584]">Dia</dt>
                      <dd className="mt-1 font-semibold capitalize text-[#f0ffed]">
                        {weekdayOnlyLabel(profileEvent.startsAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#849584]">Fecha</dt>
                      <dd className="mt-1 font-semibold text-[#f0ffed]">
                        {dateOnlyLabel(profileEvent.startsAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#849584]">Hora</dt>
                      <dd className="mt-1 font-semibold text-[#f0ffed]">
                        {timeLabel(profileEvent.startsAt)} - {timeLabel(profileEvent.endsAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#849584]">Lugar</dt>
                      <dd className="mt-1 font-semibold text-[#f0ffed]">
                        {profileEvent.venue?.name || 'Espacio por confirmar'}
                      </dd>
                      {profileEvent.venue?.location ? (
                        <dd className="mt-1 text-xs leading-5 text-[#b9cbb8]">
                          {profileEvent.venue.location}
                        </dd>
                      ) : null}
                    </div>
                  </dl>
                </div>

                <div className="rounded-xl border border-[#5adf82]/30 bg-[#02a752]/10 p-5">
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#5adf82]">
                    Ponente
                  </p>
                  <div className="mt-4 flex gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#3b4b3c] bg-[#1d2022] text-[#5adf82]">
                      {profileEvent.talk?.speaker?.photoUrl ? (
                        <img
                          className="h-full w-full object-cover"
                          src={profileEvent.talk.speaker.photoUrl}
                          alt={profileEvent.talk.speaker.fullName}
                        />
                      ) : (
                        <span className="material-symbols-outlined text-3xl">person</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="break-words font-display text-xl font-bold text-[#f0ffed]">
                        {profileEvent.talk?.speaker?.fullName || 'Sin ponente asignado'}
                      </p>
                      <p className="mt-1 text-sm text-[#b9cbb8]">
                        {profileEvent.talk?.speaker?.company || 'Empresa o institucion pendiente'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 border-t border-[#3b4b3c] pt-4">
                    <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#5adf82]">
                      ¿Quien es?
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#dbe8d8]">
                      {profileEvent.talk?.speaker?.bio || 'Sin descripcion del ponente registrada.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-[#3b4b3c] bg-[#1d2022]/80 p-5">
                <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#5adf82]">
                  Descripcion
                </p>
                <p className="mt-3 text-sm leading-7 text-[#dbe8d8]">
                  {profileEvent.description || 'Sin descripcion registrada.'}
                </p>
              </div>
            </section>
          </div>
        ) : null}
      </main>
    </PublicLayout>
  );
};

export default PublicSchedulePage;
