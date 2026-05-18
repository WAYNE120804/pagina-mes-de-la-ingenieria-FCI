import { FormEvent, useState } from 'react';

import Topbar from '../../components/Layout/Topbar';

type NotificationDraft = {
  id: string;
  title: string;
  channel: string;
  audience: string;
  status: string;
};

const initialDrafts: NotificationDraft[] = [
  {
    id: '1',
    title: 'Cambio de horario',
    channel: 'Websocket',
    audience: 'Asistentes registrados',
    status: 'Borrador',
  },
  {
    id: '2',
    title: 'Publicacion de resultados',
    channel: 'Correo',
    audience: 'Participantes de torneos',
    status: 'Listo',
  },
];

const NotificationsPage = () => {
  const [drafts, setDrafts] = useState<NotificationDraft[]>(initialDrafts);
  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState('Websocket');
  const [audience, setAudience] = useState('Todos');

  function submitDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDrafts((current) => [
      {
        id: crypto.randomUUID(),
        title,
        channel,
        audience,
        status: 'Borrador',
      },
      ...current,
    ]);
    setTitle('');
    setChannel('Websocket');
    setAudience('Todos');
  }

  function markReady(id: string) {
    setDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, status: 'Listo' } : draft))
    );
  }

  function removeDraft(id: string) {
    setDrafts((current) => current.filter((draft) => draft.id !== id));
  }

  return (
    <div>
      <Topbar title="Notificaciones" />
      <div className="space-y-6 px-6 py-6">
        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">Nueva comunicacion</h3>
            <form className="mt-4 space-y-4" onSubmit={submitDraft}>
              <label className="block text-sm font-medium text-slate-700">
                Titulo
                <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={title} onChange={(event) => setTitle(event.target.value)} required />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Canal
                <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={channel} onChange={(event) => setChannel(event.target.value)}>
                  <option>Websocket</option>
                  <option>Correo</option>
                  <option>Push</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Audiencia
                <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={audience} onChange={(event) => setAudience(event.target.value)}>
                  <option>Todos</option>
                  <option>Asistentes registrados</option>
                  <option>Participantes de torneos</option>
                  <option>Equipos hackathon</option>
                </select>
              </label>
              <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                Guardar borrador
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-950">Bandeja operativa</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[760px] table-fixed divide-y divide-slate-200 text-sm">
                <thead className="theme-table-head">
                  <tr>
                    <th className="w-[280px] px-5 py-3 text-left">Titulo</th>
                    <th className="w-[140px] px-5 py-3 text-left">Canal</th>
                    <th className="w-[220px] px-5 py-3 text-left">Audiencia</th>
                    <th className="w-[110px] px-5 py-3 text-left">Estado</th>
                    <th className="w-[160px] px-5 py-3 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {drafts.map((draft) => (
                    <tr key={draft.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-medium text-slate-950">{draft.title}</td>
                      <td className="px-5 py-4 text-slate-600">{draft.channel}</td>
                      <td className="px-5 py-4 text-slate-600">{draft.audience}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${draft.status === 'Listo' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {draft.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold" type="button" onClick={() => markReady(draft.id)}>Listo</button>
                          <button className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700" type="button" onClick={() => removeDraft(draft.id)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
