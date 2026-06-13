import { FormEvent, useEffect, useMemo, useState } from 'react';

import { listEventsRequest, type EventItem } from '../../api/events.api';
import {
  listNotificationsRequest,
  sendNotificationRequest,
  type NotificationItem,
} from '../../api/notifications.api';
import { listTournamentsRequest, type Tournament } from '../../api/tournaments.api';
import Topbar from '../../components/Layout/Topbar';

const audienceLabels: Record<string, string> = {
  EVENT_REGISTERED: 'Inscritos/asistentes del evento',
  EVENT_CHECKED_IN: 'Solo asistentes confirmados',
  TOURNAMENT_REGISTERED: 'Participantes del torneo',
};

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<'EVENT' | 'TOURNAMENT'>('EVENT');
  const [targetId, setTargetId] = useState('');
  const [audience, setAudience] = useState<'EVENT_REGISTERED' | 'EVENT_CHECKED_IN' | 'TOURNAMENT_REGISTERED'>('EVENT_REGISTERED');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function loadData() {
    const [nextNotifications, nextEvents, nextTournaments] = await Promise.all([
      listNotificationsRequest(),
      listEventsRequest(),
      listTournamentsRequest(),
    ]);

    setNotifications(nextNotifications);
    setEvents(nextEvents);
    setTournaments(nextTournaments);

    if (!targetId) {
      setTargetId(nextEvents[0]?.id || nextTournaments[0]?.id || '');
    }
  }

  useEffect(() => {
    loadData().catch(() => setError('No fue posible cargar notificaciones.'));
  }, []);

  const targets = targetType === 'EVENT' ? events : tournaments;

  const availableAudiences = useMemo(() => {
    if (targetType === 'EVENT') {
      return ['EVENT_REGISTERED', 'EVENT_CHECKED_IN'] as const;
    }

    return ['TOURNAMENT_REGISTERED'] as const;
  }, [targetType]);

  function changeTargetType(value: 'EVENT' | 'TOURNAMENT') {
    setTargetType(value);
    setAudience(value === 'EVENT' ? 'EVENT_REGISTERED' : 'TOURNAMENT_REGISTERED');
    setTargetId(value === 'EVENT' ? events[0]?.id || '' : tournaments[0]?.id || '');
  }

  async function submitCommunication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError('');
    setNotice('');

    try {
      await sendNotificationRequest({
        title,
        body,
        channel: 'EMAIL',
        targetType,
        targetId,
        audience,
      });
      setTitle('');
      setBody('');
      setNotice('Mensaje enviado. Si SMTP no esta configurado, queda registrado como no enviado.');
      await loadData();
    } catch {
      setError('No fue posible enviar el mensaje. Revisa SMTP o si hay correos en la audiencia.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <Topbar title="Notificaciones" />
      <div className="space-y-6 px-6 py-6">
        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">Nueva comunicacion</h3>
            <p className="mt-1 text-sm text-slate-500">Envia mensajes por correo a inscritos o asistentes de una actividad.</p>
            <form className="mt-4 space-y-4" onSubmit={submitCommunication}>
              <label className="block text-sm font-medium text-slate-700">
                Titulo
                <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={title} onChange={(event) => setTitle(event.target.value)} required />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Mensaje
                <textarea className="mt-1 min-h-32 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={body} onChange={(event) => setBody(event.target.value)} required />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Tipo de audiencia
                <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={targetType} onChange={(event) => changeTargetType(event.target.value as 'EVENT' | 'TOURNAMENT')}>
                  <option value="EVENT">Evento</option>
                  <option value="TOURNAMENT">Torneo</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Actividad
                <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={targetId} onChange={(event) => setTargetId(event.target.value)} required>
                  {targets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {'title' in target ? target.title : target.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Audiencia
                <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={audience} onChange={(event) => setAudience(event.target.value as typeof audience)}>
                  {availableAudiences.map((item) => (
                    <option key={item} value={item}>
                      {audienceLabels[item]}
                    </option>
                  ))}
                </select>
              </label>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
              <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300" disabled={sending || !targetId}>
                {sending ? 'Enviando...' : 'Enviar mensaje'}
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-950">Bandeja operativa</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[900px] table-fixed divide-y divide-slate-200 text-sm">
                <thead className="theme-table-head">
                  <tr>
                    <th className="w-[260px] px-5 py-3 text-left">Titulo</th>
                    <th className="w-[120px] px-5 py-3 text-left">Canal</th>
                    <th className="w-[240px] px-5 py-3 text-left">Audiencia</th>
                    <th className="w-[110px] px-5 py-3 text-left">Estado</th>
                    <th className="w-[170px] px-5 py-3 text-left">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {notifications.map((notification) => (
                    <tr key={notification.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-medium text-slate-950">{notification.title}</td>
                      <td className="px-5 py-4 text-slate-600">{notification.channel}</td>
                      <td className="px-5 py-4 text-slate-600">
                        {audienceLabels[String(notification.payload?.audience || '')] || 'No aplica'}
                        {notification.payload?.targetName ? <span className="block text-xs">{String(notification.payload.targetName)}</span> : null}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${notification.status === 'SENT' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {notification.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{new Date(notification.createdAt).toLocaleString('es-CO')}</td>
                    </tr>
                  ))}
                  {notifications.length === 0 ? (
                    <tr>
                      <td className="px-5 py-6 text-center text-slate-500" colSpan={5}>
                        No hay notificaciones registradas.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
