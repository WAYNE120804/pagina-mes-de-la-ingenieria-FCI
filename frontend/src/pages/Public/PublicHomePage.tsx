import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { listPublicEventsRequest, type PublicEventItem } from '../../api/events.api';
import {
  listPublicTournamentsRequest,
  type PublicTournamentOverview,
} from '../../api/tournaments.api';
import {
  defaultSiteSettings,
  getPublicSettingsRequest,
  type SiteSettings,
} from '../../api/settings.api';
import { eventTypeLabels, labelFor, tournamentSportLabels } from '../../utils/labels';
import PublicLayout from './PublicLayout';
import { publicHeroImage, roboticsImage } from './publicContent';

function tournamentSlug(tournament: { id: string; name: string }) {
  const slug = tournament.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return slug || tournament.id;
}

function formatEventDate(value: string) {
  return new Date(value)
    .toLocaleDateString('es-CO', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
    .replace(' de 20', ' del 20');
}

function formatEventTime(value: string) {
  return new Date(value).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function eventDetailPath(event: PublicEventItem) {
  const basePath =
    event.type === 'TALK'
      ? '/public/charlas'
      : event.type === 'WORKSHOP'
        ? '/public/talleres'
        : '/public/cronograma';

  return `${basePath}?evento=${event.id}`;
}

const PublicHomePage = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<PublicEventItem[]>([]);
  const [tournaments, setTournaments] = useState<PublicTournamentOverview[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([listPublicEventsRequest(), listPublicTournamentsRequest(), getPublicSettingsRequest()])
      .then(([eventData, tournamentData, siteSettings]) => {
        setEvents(eventData);
        setTournaments(tournamentData);
        setSettings(siteSettings);
      })
      .catch(() => setError('No fue posible cargar la informacion publica.'))
      .finally(() => setLoading(false));
  }, []);

  const featuredTournament = tournaments[0];

  return (
    <PublicLayout>
      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 public-technical-grid opacity-45" />
          <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-10 px-4 py-16 md:grid-cols-[1.05fr_0.95fr] md:px-12">
            <div className="relative z-10">
              <span className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-[#5adf82]">
                Facultad de Ciencias e Ingenieria
              </span>
              <h1 className="mt-5 max-w-3xl font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-[#f0ffed] md:text-7xl">
                {settings.heroTitle}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#b9cbb8]">
                Explora la agenda publica, torneos, talleres y registros del Mes de la Ingenieria
                UManizales.
              </p>
              <div className="mt-9 flex flex-wrap gap-4">
                <Link
                  to="/public/cronograma"
                  className="rounded-xl bg-[#5adf82] px-7 py-4 font-bold text-[#003917] transition-transform active:scale-95"
                >
                  Ver cronograma
                </Link>
                <Link
                  to="/public/torneos"
                  className="rounded-xl border border-[#849584] px-7 py-4 font-bold text-[#e0e3e5] transition-colors hover:bg-[#1d2022]"
                >
                  Centro de torneos
                </Link>
              </div>
            </div>
            <div className="relative z-10">
              <div className="absolute -inset-5 rounded-[2rem] bg-[#5adf82]/20 blur-3xl" />
              <img
                className="relative aspect-[4/3] w-full rounded-2xl border border-[#3b4b3c] object-cover shadow-2xl"
                src={publicHeroImage}
                alt="Laboratorio de ingenieria y tecnologia"
              />
            </div>
          </div>
        </section>

        <section className="bg-[#0b0f10] py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-12">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="font-display text-3xl font-bold text-[#5adf82]">Proximos eventos</h2>
                <div className="mt-3 h-1 w-24 rounded-full bg-[#00ff7f]" />
              </div>
              <Link className="font-mono text-xs font-bold uppercase tracking-wider text-[#5adf82]" to="/public/cronograma">
                Ver agenda completa
              </Link>
            </div>

            {loading ? (
              <p className="rounded-xl border border-[#3b4b3c] bg-[#1d2022] p-6 text-[#b9cbb8]">
                Cargando datos publicados...
              </p>
            ) : error ? (
              <p className="rounded-xl border border-[#ffb4ab]/30 bg-[#93000a]/20 p-6 text-[#ffb4ab]">{error}</p>
            ) : events.length === 0 ? (
              <p className="rounded-xl border border-[#3b4b3c] bg-[#1d2022] p-6 text-[#b9cbb8]">
                Aun no hay eventos publicados desde el panel administrativo.
              </p>
            ) : (
              <div className="grid gap-5 lg:grid-cols-3">
                {events.slice(0, 3).map((event) => (
                  <article
                    key={event.id}
                    className="flex min-h-72 cursor-pointer flex-col rounded-xl border border-[#3b4b3c] bg-[#1d2022] p-6 transition-colors hover:border-[#5adf82]"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(eventDetailPath(event))}
                    onKeyDown={(keyboardEvent) => {
                      if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                        keyboardEvent.preventDefault();
                        navigate(eventDetailPath(event));
                      }
                    }}
                  >
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <span className="rounded bg-[#323537] px-3 py-1 font-mono text-xs uppercase text-[#e0e3e5]">
                        {labelFor(eventTypeLabels, event.type)}
                      </span>
                      <span className="font-mono text-xs uppercase text-[#849584]">{formatEventDate(event.startsAt)}</span>
                    </div>
                    <h3 className="font-display text-xl font-bold text-[#f0ffed]">{event.title}</h3>
                    <p className="mt-4 flex-1 text-sm leading-6 text-[#b9cbb8]">
                      {event.description || 'Sin descripcion registrada.'}
                    </p>
                    {event.talk?.speaker?.fullName ? (
                      <p className="mt-4 inline-flex items-center gap-2 text-sm text-[#b9cbb8]">
                        <span className="material-symbols-outlined text-sm text-[#5adf82]">person</span>
                        Ponente: {event.talk.speaker.fullName}
                      </p>
                    ) : null}
                    <div className="mt-6 border-t border-[#3b4b3c] pt-5">
                      <div className="flex items-center gap-2 font-mono text-xs text-[#e0e3e5]">
                        <span className="material-symbols-outlined text-[#5adf82]">schedule</span>
                        {formatEventTime(event.startsAt)} - {event.venue?.name || 'Espacio por confirmar'}
                      </div>
                      {event.type === 'TALK' ? (
                        <Link
                          className="mt-4 inline-flex rounded-lg border border-[#5adf82]/40 px-4 py-2 text-sm font-bold text-[#5adf82]"
                          to={eventDetailPath(event)}
                          onClick={(clickEvent) => clickEvent.stopPropagation()}
                        >
                          Ver charla
                        </Link>
                      ) : event.type === 'WORKSHOP' ? (
                        <Link
                          className="mt-4 inline-flex rounded-lg border border-[#5adf82]/40 px-4 py-2 text-sm font-bold text-[#5adf82]"
                          to={eventDetailPath(event)}
                          onClick={(clickEvent) => clickEvent.stopPropagation()}
                        >
                          Ver taller
                        </Link>
                      ) : event.registrationUrl || event.attendanceUrl ? (
                        <Link
                          className="mt-4 inline-flex rounded-lg bg-[#5adf82] px-4 py-2 text-sm font-bold text-[#003917]"
                          to={event.registrationUrl || event.attendanceUrl || '#'}
                          onClick={(clickEvent) => clickEvent.stopPropagation()}
                        >
                          {event.registrationUrl ? 'Inscribirse' : 'Confirmar asistencia'}
                        </Link>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="border-y border-[#3b4b3c] bg-[#101415] py-20">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 md:grid-cols-4 md:grid-rows-2 md:px-12">
            <article className="relative min-h-[460px] overflow-hidden rounded-2xl border border-[#3b4b3c] md:col-span-2 md:row-span-2">
              <img className="absolute inset-0 h-full w-full object-cover" src={roboticsImage} alt="Robotica de combate" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f10] via-[#0b0f10]/50 to-transparent" />
              <div className="absolute bottom-0 left-0 p-8">
                <h3 className="font-display text-3xl font-bold text-[#5adf82]">
                  {featuredTournament?.name || 'Torneos publicados'}
                </h3>
                <p className="mt-3 max-w-md text-[#b9cbb8]">
                  {featuredTournament?.description ||
                    'Los torneos creados y publicados desde el panel apareceran aqui.'}
                </p>
              </div>
            </article>
            {tournaments.slice(0, 3).map((item) => (
              <article key={item.id} className="rounded-2xl border border-[#3b4b3c] bg-[#1d2022] p-6">
                <span className="material-symbols-outlined text-4xl text-[#5adf82]">
                  {item.sport === 'VIDEOJUEGOS'
                    ? 'sports_esports'
                    : item.sport === 'FUTBOL'
                      ? 'sports_soccer'
                      : item.sport === 'ROBOTICA'
                        ? 'smart_toy'
                        : item.sport === 'MARATON_PROGRAMACION'
                          ? 'code'
                          : item.sport === 'CAPTURA_BANDERA'
                            ? 'flag'
                            : 'grid_view'}
                </span>
                <h3 className="mt-4 font-display text-xl font-bold text-[#f0ffed]">{item.name}</h3>
                <p className="mt-3 text-sm leading-6 text-[#b9cbb8]">
                  {labelFor(tournamentSportLabels, item.sport)} - {item._count?.teams || item._count?.participants || 0} inscritos
                </p>
                {item.status === 'REGISTRATION_OPEN' ? (
                  <Link
                    className="mt-5 inline-flex rounded-lg bg-[#5adf82] px-4 py-2 text-sm font-bold text-[#003917]"
                    to={`/public/torneos/${tournamentSlug(item)}/inscripcion`}
                  >
                    Inscribirse
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </main>
    </PublicLayout>
  );
};

export default PublicHomePage;
