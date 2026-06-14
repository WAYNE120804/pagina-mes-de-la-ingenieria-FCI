import { FormEvent, useEffect, useMemo, useState } from 'react';

import { listEventsRequest, type EventItem } from '../../api/events.api';
import {
  createSpeakerRequest,
  createTalkRequest,
  deleteSpeakerRequest,
  deleteTalkRequest,
  listSpeakersRequest,
  listTalksRequest,
  updateSpeakerRequest,
  updateTalkRequest,
  type Speaker,
  type Talk,
} from '../../api/talks.api';
import Topbar from '../../components/Layout/Topbar';
import { eventTypeLabels } from '../../utils/labels';

const TalksPage = () => {
  const [talks, setTalks] = useState<Talk[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [speakerEditingId, setSpeakerEditingId] = useState('');
  const [speakerName, setSpeakerName] = useState('');
  const [speakerEmail, setSpeakerEmail] = useState('');
  const [speakerCompany, setSpeakerCompany] = useState('');
  const [speakerPhotoUrl, setSpeakerPhotoUrl] = useState('');
  const [talkEditingId, setTalkEditingId] = useState('');
  const [topic, setTopic] = useState('');
  const [eventId, setEventId] = useState('');
  const [speakerId, setSpeakerId] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const talkEvents = useMemo(
    () => events.filter((event) => event.type === 'TALK' || event.type === 'ACADEMIC' || event.type === 'WORKSHOP'),
    [events]
  );

  const filteredTalks = talks.filter((talk) => {
    const query = search.toLowerCase();
    return (
      talk.topic.toLowerCase().includes(query) ||
      talk.event.title.toLowerCase().includes(query) ||
      (talk.speaker?.fullName || '').toLowerCase().includes(query)
    );
  });

  async function loadData() {
    const [talkData, speakerData, eventData] = await Promise.all([
      listTalksRequest(),
      listSpeakersRequest(),
      listEventsRequest(),
    ]);
    setTalks(talkData);
    setSpeakers(speakerData);
    setEvents(eventData);
  }

  useEffect(() => {
    loadData().catch(() => setError('No fue posible cargar charlas y ponentes.'));
  }, []);

  function resetSpeakerForm() {
    setSpeakerEditingId('');
    setSpeakerName('');
    setSpeakerEmail('');
    setSpeakerCompany('');
    setSpeakerPhotoUrl('');
  }

  function resetTalkForm() {
    setTalkEditingId('');
    setTopic('');
    setEventId('');
    setSpeakerId('');
  }

  function editSpeaker(speaker: Speaker) {
    setSpeakerEditingId(speaker.id);
    setSpeakerName(speaker.fullName);
    setSpeakerEmail(speaker.email || '');
    setSpeakerCompany(speaker.company || '');
    setSpeakerPhotoUrl(speaker.photoUrl || '');
  }

  function readImageAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
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

    setSpeakerPhotoUrl(await readImageAsDataUrl(file));
  }

  function editTalk(talk: Talk) {
    setTalkEditingId(talk.id);
    setTopic(talk.topic);
    setEventId(talk.event.id);
    setSpeakerId(talk.speaker?.id || '');
  }

  async function saveSpeaker(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      const payload = {
        fullName: speakerName,
        email: speakerEmail || null,
        company: speakerCompany || null,
        photoUrl: speakerPhotoUrl || null,
      };

      if (speakerEditingId) {
        await updateSpeakerRequest(speakerEditingId, payload);
      } else {
        await createSpeakerRequest({
          fullName: speakerName,
          email: speakerEmail || undefined,
          company: speakerCompany || undefined,
          photoUrl: speakerPhotoUrl || null,
        });
      }

      resetSpeakerForm();
      await loadData();
    } catch {
      setError('No fue posible guardar el ponente.');
    }
  }

  async function saveTalk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      const payload = {
        eventId,
        speakerId: speakerId || null,
        topic,
      };

      if (talkEditingId) {
        await updateTalkRequest(talkEditingId, payload);
      } else {
        await createTalkRequest(payload);
      }

      resetTalkForm();
      await loadData();
    } catch {
      setError('No fue posible guardar. Usa un evento tipo Charla, Taller o Académico.');
    }
  }

  async function removeSpeaker(id: string) {
    if (!confirm('Eliminar este ponente?')) {
      return;
    }

    await deleteSpeakerRequest(id);
    await loadData();
  }

  async function removeTalk(id: string) {
    if (!confirm('Eliminar esta charla?')) {
      return;
    }

    await deleteTalkRequest(id);
    await loadData();
  }

  return (
    <div>
      <Topbar title="Charlas y talleres" />
      <div className="grid gap-6 px-6 py-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">{speakerEditingId ? 'Editar ponente' : 'Nuevo ponente'}</h3>
            <form className="mt-4 space-y-4" onSubmit={saveSpeaker}>
              <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Nombre" value={speakerName} onChange={(event) => setSpeakerName(event.target.value)} required />
              <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Correo" type="email" value={speakerEmail} onChange={(event) => setSpeakerEmail(event.target.value)} />
              <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Empresa" value={speakerCompany} onChange={(event) => setSpeakerCompany(event.target.value)} />
              <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white text-xs text-slate-500">
                  {speakerPhotoUrl ? (
                    <img className="h-full w-full object-cover" src={speakerPhotoUrl} alt="Foto del ponente" />
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
              <div className="flex flex-wrap gap-2">
                <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">{speakerEditingId ? 'Guardar' : 'Crear ponente'}</button>
                {speakerEditingId ? <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold" type="button" onClick={resetSpeakerForm}>Cancelar</button> : null}
              </div>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950">{talkEditingId ? 'Editar charla o taller' : 'Nueva charla o taller'}</h3>
            <form className="mt-4 space-y-4" onSubmit={saveTalk}>
              <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Tema" value={topic} onChange={(event) => setTopic(event.target.value)} required />
              <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={eventId} onChange={(event) => setEventId(event.target.value)} required>
                <option value="">Selecciona evento</option>
                {talkEvents.map((event) => <option key={event.id} value={event.id}>{event.title} · {eventTypeLabels[event.type]}</option>)}
              </select>
              <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={speakerId} onChange={(event) => setSpeakerId(event.target.value)}>
                <option value="">Sin ponente</option>
                {speakers.map((speaker) => <option key={speaker.id} value={speaker.id}>{speaker.fullName}</option>)}
              </select>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <div className="flex flex-wrap gap-2">
                <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">{talkEditingId ? 'Guardar' : 'Crear charla'}</button>
                {talkEditingId ? <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold" type="button" onClick={resetTalkForm}>Cancelar</button> : null}
              </div>
            </form>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-950">Charlas y talleres registrados</h3>
              <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm md:w-72" placeholder="Buscar charla" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="theme-table-head">
                  <tr>
                    <th className="px-5 py-3 text-left">Tema</th>
                    <th className="px-5 py-3 text-left">Evento</th>
                    <th className="px-5 py-3 text-left">Ponente</th>
                    <th className="px-5 py-3 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTalks.map((talk) => (
                    <tr key={talk.id}>
                      <td className="px-5 py-3 font-medium text-slate-950">{talk.topic}</td>
                      <td className="px-5 py-3 text-slate-600">{talk.event.title}</td>
                      <td className="px-5 py-3 text-slate-600">{talk.speaker?.fullName || 'Sin ponente'}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold" onClick={() => editTalk(talk)}>Editar</button>
                          <button className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700" onClick={() => void removeTalk(talk.id)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-950">Ponentes</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="theme-table-head">
                  <tr>
                    <th className="px-5 py-3 text-left">Foto</th>
                    <th className="px-5 py-3 text-left">Nombre</th>
                    <th className="px-5 py-3 text-left">Correo</th>
                    <th className="px-5 py-3 text-left">Empresa</th>
                    <th className="px-5 py-3 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {speakers.map((speaker) => (
                    <tr key={speaker.id}>
                      <td className="px-5 py-3">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                          {speaker.photoUrl ? (
                            <img className="h-full w-full object-cover" src={speaker.photoUrl} alt={speaker.fullName} />
                          ) : (
                            speaker.fullName.slice(0, 2).toUpperCase()
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-950">{speaker.fullName}</td>
                      <td className="px-5 py-3 text-slate-600">{speaker.email || 'Sin correo'}</td>
                      <td className="px-5 py-3 text-slate-600">{speaker.company || 'Sin empresa'}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold" onClick={() => editSpeaker(speaker)}>Editar</button>
                          <button className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700" onClick={() => void removeSpeaker(speaker.id)}>Eliminar</button>
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

export default TalksPage;
