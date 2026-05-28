import { FormEvent, useEffect, useMemo, useState } from 'react';

import {
  createSpeakerRequest,
  deleteSpeakerRequest,
  listSpeakersRequest,
  updateSpeakerRequest,
  type Speaker,
} from '../../api/talks.api';
import Topbar from '../../components/Layout/Topbar';

const emptyForm = {
  fullName: '',
  email: '',
  company: '',
  bio: '',
  photoUrl: '',
};

function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const SpeakersPage = () => {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const filteredSpeakers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return speakers;
    }

    return speakers.filter((speaker) =>
      [speaker.fullName, speaker.email, speaker.company, speaker.bio]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [search, speakers]);

  async function loadSpeakers() {
    const data = await listSpeakersRequest(search ? { search } : undefined);
    setSpeakers(data);
  }

  useEffect(() => {
    loadSpeakers()
      .catch(() => setError('No fue posible cargar los ponentes.'))
      .finally(() => setLoading(false));
  }, []);

  function resetForm() {
    setEditingId('');
    setForm(emptyForm);
  }

  function editSpeaker(speaker: Speaker) {
    setEditingId(speaker.id);
    setForm({
      fullName: speaker.fullName,
      email: speaker.email || '',
      company: speaker.company || '',
      bio: speaker.bio || '',
      photoUrl: speaker.photoUrl || '',
    });
  }

  async function updateSpeakerPhoto(file?: File) {
    if (!file) {
      return;
    }

    setError('');

    if (!file.type.startsWith('image/')) {
      setError('La foto del ponente debe ser una imagen.');
      return;
    }

    if (file.size > 5_000_000) {
      setError('La foto del ponente no puede superar 5 MB.');
      return;
    }

    const photoUrl = await readImageAsDataUrl(file);
    setForm((current) => ({ ...current, photoUrl }));
  }

  async function saveSpeaker(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');

    try {
      const payload = {
        fullName: form.fullName,
        email: form.email || null,
        company: form.company || null,
        bio: form.bio || null,
        photoUrl: form.photoUrl || null,
      };

      if (editingId) {
        await updateSpeakerRequest(editingId, payload);
        setNotice('Ponente actualizado.');
      } else {
        await createSpeakerRequest({
          ...payload,
          email: form.email || undefined,
          company: form.company || undefined,
        });
        setNotice('Ponente creado.');
      }

      resetForm();
      await loadSpeakers();
    } catch {
      setError('No fue posible guardar el ponente.');
    }
  }

  async function removeSpeaker(id: string) {
    if (!confirm('Eliminar este ponente?')) {
      return;
    }

    setError('');
    setNotice('');

    try {
      await deleteSpeakerRequest(id);
      await loadSpeakers();
      setNotice('Ponente eliminado.');
      if (selectedSpeaker?.id === id) {
        setSelectedSpeaker(null);
      }
    } catch {
      setError('No fue posible eliminar el ponente.');
    }
  }

  async function applySearch() {
    setError('');
    setLoading(true);
    await loadSpeakers()
      .catch(() => setError('No fue posible buscar ponentes.'))
      .finally(() => setLoading(false));
  }

  return (
    <div>
      <Topbar title="Ponentes" />
      <div className="grid gap-6 px-6 py-6 xl:grid-cols-[420px_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-950">
            {editingId ? 'Editar ponente' : 'Nuevo ponente'}
          </h3>
          <form className="mt-4 space-y-4" onSubmit={saveSpeaker}>
            <label className="block text-sm font-medium text-slate-700">
              Nombre
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Correo privado
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Empresa o institucion
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.company}
                onChange={(event) => setForm({ ...form, company: event.target.value })}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              ¿Quien es?
              <textarea
                className="mt-1 min-h-32 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.bio}
                onChange={(event) => setForm({ ...form, bio: event.target.value })}
                placeholder="Perfil breve que se mostrara en el panel publico."
              />
            </label>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white text-xs text-slate-500">
                  {form.photoUrl ? (
                    <img className="h-full w-full object-cover" src={form.photoUrl} alt="Foto del ponente" />
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
              {form.photoUrl ? (
                <button
                  className="mt-3 text-xs font-semibold text-red-600"
                  type="button"
                  onClick={() => setForm({ ...form, photoUrl: '' })}
                >
                  Quitar foto
                </button>
              ) : null}
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
            <div className="flex flex-wrap gap-2">
              <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                {editingId ? 'Guardar cambios' : 'Crear ponente'}
              </button>
              {editingId ? (
                <button
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold"
                  type="button"
                  onClick={resetForm}
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold text-slate-950">Ponentes registrados</h3>
              <p className="mt-1 text-sm text-slate-500">{filteredSpeakers.length} perfiles</p>
            </div>
            <form className="flex w-full gap-2 md:w-auto" onSubmit={(event) => { event.preventDefault(); void applySearch(); }}>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm md:w-72"
                placeholder="Buscar ponente"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <button className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold" type="submit">
                Buscar
              </button>
            </form>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="theme-table-head">
                <tr>
                  <th className="px-5 py-3 text-left">Foto</th>
                  <th className="px-5 py-3 text-left">Nombre</th>
                  <th className="px-5 py-3 text-left">Correo</th>
                  <th className="px-5 py-3 text-left">Empresa</th>
                  <th className="px-5 py-3 text-left">¿Quien es?</th>
                  <th className="px-5 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td className="px-5 py-6 text-center text-slate-500" colSpan={6}>
                      Cargando ponentes...
                    </td>
                  </tr>
                ) : null}
                {!loading && filteredSpeakers.length === 0 ? (
                  <tr>
                    <td className="px-5 py-6 text-center text-slate-500" colSpan={6}>
                      No hay ponentes registrados.
                    </td>
                  </tr>
                ) : null}
                {filteredSpeakers.map((speaker) => (
                  <tr key={speaker.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-500">
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
                    <td className="max-w-xs px-5 py-3 text-slate-600">
                      <span className="line-clamp-2">{speaker.bio || 'Sin descripcion'}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold"
                          type="button"
                          onClick={() => setSelectedSpeaker(speaker)}
                        >
                          Ver
                        </button>
                        <button
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold"
                          type="button"
                          onClick={() => editSpeaker(speaker)}
                        >
                          Editar
                        </button>
                        <button
                          className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700"
                          type="button"
                          onClick={() => void removeSpeaker(speaker.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selectedSpeaker ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
          <button
            className="absolute inset-0 cursor-default"
            type="button"
            aria-label="Cerrar detalle del ponente"
            onClick={() => setSelectedSpeaker(null)}
          />
          <section className="relative w-full max-w-2xl rounded-2xl border border-[#5adf82]/40 bg-[#101415] p-6 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#3b4b3c] bg-[#1d2022] text-[#5adf82]">
                  {selectedSpeaker.photoUrl ? (
                    <img className="h-full w-full object-cover" src={selectedSpeaker.photoUrl} alt={selectedSpeaker.fullName} />
                  ) : (
                    <span className="material-symbols-outlined text-3xl">person</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#5adf82]">
                    Ponente
                  </p>
                  <h2 className="mt-1 break-words font-display text-2xl font-bold text-[#f0ffed]">
                    {selectedSpeaker.fullName}
                  </h2>
                  <p className="mt-1 text-sm text-[#b9cbb8]">
                    {selectedSpeaker.company || 'Empresa o institucion pendiente'}
                  </p>
                </div>
              </div>
              <button
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#3b4b3c] text-[#b9cbb8] transition-colors hover:border-[#5adf82] hover:text-[#5adf82]"
                type="button"
                aria-label="Cerrar"
                onClick={() => setSelectedSpeaker(null)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="mt-6 grid gap-4 rounded-xl border border-[#3b4b3c] bg-[#1d2022]/80 p-5 text-sm">
              <div>
                <p className="text-[#849584]">Correo privado</p>
                <p className="mt-1 break-all font-semibold text-[#f0ffed]">
                  {selectedSpeaker.email || 'Sin correo'}
                </p>
              </div>
              <div>
                <p className="text-[#849584]">¿Quien es?</p>
                <p className="mt-1 leading-6 text-[#dbe8d8]">
                  {selectedSpeaker.bio || 'Sin descripcion del ponente.'}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className="rounded-md bg-[#5adf82] px-4 py-2 text-sm font-semibold text-[#003917]"
                type="button"
                onClick={() => {
                  editSpeaker(selectedSpeaker);
                  setSelectedSpeaker(null);
                }}
              >
                Editar ponente
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
};

export default SpeakersPage;
