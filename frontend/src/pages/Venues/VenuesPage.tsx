import { FormEvent, useEffect, useState } from 'react';

import {
  createVenueRequest,
  deleteVenueRequest,
  listVenuesRequest,
  updateVenueRequest,
  type Venue,
} from '../../api/venues.api';
import Topbar from '../../components/Layout/Topbar';

const VenuesPage = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [editingId, setEditingId] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [capacity, setCapacity] = useState('');
  const [allowsConcurrentEvents, setAllowsConcurrentEvents] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const filteredVenues = venues.filter((venue) => {
    const query = search.toLowerCase();
    return (
      venue.name.toLowerCase().includes(query) ||
      (venue.location || '').toLowerCase().includes(query)
    );
  });

  async function loadVenues() {
    const data = await listVenuesRequest();
    setVenues(data);
  }

  useEffect(() => {
    loadVenues()
      .catch(() => setError('No fue posible cargar los espacios.'))
      .finally(() => setLoading(false));
  }, []);

  function resetForm() {
    setEditingId('');
    setName('');
    setLocation('');
    setPhotoUrl('');
    setCapacity('');
    setAllowsConcurrentEvents(false);
  }

  function editVenue(venue: Venue) {
    setEditingId(venue.id);
    setName(venue.name);
    setLocation(venue.location || '');
    setPhotoUrl(venue.photoUrl || '');
    setCapacity(venue.capacity ? String(venue.capacity) : '');
    setAllowsConcurrentEvents(Boolean(venue.allowsConcurrentEvents));
  }

  function readImageAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function updateVenuePhoto(file?: File) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('La foto del espacio debe ser una imagen.');
      return;
    }

    if (file.size > 5_000_000) {
      setError('La foto del espacio no puede superar 5 MB.');
      return;
    }

    setPhotoUrl(await readImageAsDataUrl(file));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    try {
      const payload = {
        name,
        location: location || null,
        photoUrl: photoUrl || null,
        capacity: capacity ? Number(capacity) : null,
        allowsConcurrentEvents,
      };

      if (editingId) {
        await updateVenueRequest(editingId, payload);
      } else {
        await createVenueRequest(payload);
      }

      resetForm();
      await loadVenues();
    } catch {
      setError('No fue posible guardar el espacio.');
    }
  }

  async function removeVenue(id: string) {
    if (!confirm('Eliminar este espacio?')) {
      return;
    }

    await deleteVenueRequest(id);
    await loadVenues();
  }

  return (
    <div>
      <Topbar title="Espacios" />
      <div className="grid gap-6 px-6 py-6 xl:grid-cols-[380px_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-950">{editingId ? 'Editar espacio' : 'Nuevo espacio'}</h3>
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-700">
              Nombre
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Ubicación
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={location} onChange={(event) => setLocation(event.target.value)} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Capacidad
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} />
            </label>
            <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <input
                className="mt-1"
                type="checkbox"
                checked={allowsConcurrentEvents}
                onChange={(event) => setAllowsConcurrentEvents(event.target.checked)}
              />
              <span>
                <span className="block font-semibold text-slate-950">Disponible al mismo tiempo para eventos</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Activa esta opcion para plazoletas, pasillos o espacios grandes que pueden albergar varios eventos en el mismo horario.
                </span>
              </span>
            </label>
            <div className="grid gap-3 rounded-md border border-slate-200 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-20 w-28 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-400">
                  {photoUrl ? <img className="h-full w-full object-cover" src={photoUrl} alt="Foto del espacio" /> : 'Sin foto'}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Foto del sitio
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      type="file"
                      accept="image/*"
                      onChange={(event) => void updateVenuePhoto(event.target.files?.[0])}
                    />
                  </label>
                  {photoUrl ? (
                    <button className="mt-2 text-xs font-semibold text-red-600" type="button" onClick={() => setPhotoUrl('')}>
                      Quitar foto
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">{editingId ? 'Guardar cambios' : 'Crear espacio'}</button>
              {editingId ? <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" type="button" onClick={resetForm}>Cancelar</button> : null}
            </div>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-950">Espacios registrados</h3>
            <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm md:w-72" placeholder="Buscar espacio" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="theme-table-head">
                <tr>
                  <th className="px-5 py-3 text-left">Foto</th>
                  <th className="px-5 py-3 text-left">Nombre</th>
                  <th className="px-5 py-3 text-left">Ubicación</th>
                  <th className="px-5 py-3 text-left">Capacidad</th>
                  <th className="px-5 py-3 text-left">Simultaneos</th>
                  <th className="px-5 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td className="px-5 py-4 text-slate-500" colSpan={6}>Cargando...</td></tr>
                ) : filteredVenues.map((venue) => (
                  <tr key={venue.id}>
                    <td className="px-5 py-3">
                      <div className="h-12 w-16 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                        {venue.photoUrl ? <img className="h-full w-full object-cover" src={venue.photoUrl} alt={venue.name} /> : null}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-950">{venue.name}</td>
                    <td className="px-5 py-3 text-slate-600">{venue.location || 'Sin ubicación'}</td>
                    <td className="px-5 py-3 text-slate-600">{venue.capacity || 'Sin límite'}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {venue.allowsConcurrentEvents ? (
                        <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Permitidos</span>
                      ) : (
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Uno a la vez</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold" onClick={() => editVenue(venue)}>Editar</button>
                        <button className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700" onClick={() => void removeVenue(venue.id)}>Eliminar</button>
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
  );
};

export default VenuesPage;
