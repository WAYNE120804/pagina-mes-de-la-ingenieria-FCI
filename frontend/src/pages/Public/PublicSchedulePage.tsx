import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  listPublicEventsRequest,
  type PublicEventItem,
} from '../../api/events.api';
import { eventTypeLabels, labelFor } from '../../utils/labels';
import PublicLayout from './PublicLayout';
import { campusImage } from './publicContent';

type PublicSchedulePageProps = {
  eventType?: 'TALK' | 'WORKSHOP';
};

function dayLabel(value: string) {
  const formatted = new Date(value).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return formatted.replace(' de 20', ' del 20');
}

function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
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
    subtitle: 'Conferencias y sesiones academicas publicadas desde el panel administrativo.',
    loading: 'Cargando charlas publicadas...',
    empty: 'Aun no hay charlas publicadas desde el panel administrativo.',
  },
  WORKSHOP: {
    title: 'Talleres',
    subtitle: 'Talleres con inscripcion previa publicados desde el panel administrativo.',
    loading: 'Cargando talleres publicados...',
    empty: 'Aun no hay talleres publicados desde el panel administrativo.',
  },
};

const defaultCopy = {
  title: 'Cronograma de Actividades',
  subtitle: 'Agenda publicada desde el panel administrativo para la comunidad FCI.',
  loading: 'Cargando cronograma publicado...',
  empty: 'Aun no hay eventos publicados desde el panel administrativo.',
};

const PublicSchedulePage = ({ eventType }: PublicSchedulePageProps) => {
  const [allEvents, setAllEvents] = useState<PublicEventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const copy = eventType ? copyByType[eventType] : defaultCopy;

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
  const selectedEvent = events.find((event) => event.id === selectedEventId) || events[0] || null;

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
                Categorias publicadas
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
                  <p>No hay categorias disponibles.</p>
                )}
              </div>
            </section>
            <section className="rounded-xl border border-[#5adf82]/30 bg-[#02a752]/10 p-6">
              <h2 className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#5adf82]">
                Ubicacion central
              </h2>
              <p className="mt-3 font-display text-xl font-bold leading-tight text-[#f0ffed]">
                {selectedEvent?.venue?.name || 'Selecciona una actividad'}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#b9cbb8]">
                {selectedEvent?.venue?.location || 'Haz clic en una charla o taller para ver su ubicacion.'}
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
                        onClick={() => setSelectedEventId(event.id)}
                        onKeyDown={(keyboardEvent) => {
                          if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                            keyboardEvent.preventDefault();
                            setSelectedEventId(event.id);
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
                                    alt={event.venue?.name || 'Ubicacion'}
                                  />
                                  <span className="block p-4">
                                    <span className="block font-mono text-[10px] font-bold uppercase tracking-widest text-[#5adf82]">
                                      Ubicacion
                                    </span>
                                    <span className="mt-1 block font-semibold text-[#f0ffed]">
                                      {event.venue?.name || 'Espacio por confirmar'}
                                    </span>
                                    <span className="mt-1 block text-xs leading-5 text-[#b9cbb8]">
                                      {event.venue?.location || 'Ubicacion pendiente desde administracion.'}
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
      </main>
    </PublicLayout>
  );
};

export default PublicSchedulePage;
