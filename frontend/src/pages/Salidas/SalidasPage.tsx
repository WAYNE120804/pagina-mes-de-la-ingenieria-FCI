import { useEffect, useMemo, useState } from 'react';

import client from '../../api/client';
import { endpoints } from '../../api/endpoints';
import DataTable from '../../components/common/DataTable';
import EmptyState from '../../components/common/EmptyState';
import ErrorBanner from '../../components/common/ErrorBanner';
import FormModal from '../../components/common/FormModal';
import Loading from '../../components/common/Loading';
import MoneyInput from '../../components/common/MoneyInput';
import Topbar from '../../components/Layout/Topbar';
import { formatCOP } from '../../utils/money';

const tipoOptions = [
  { value: 'PRESTAMO', label: 'Prestamo' },
  { value: 'CONSIGNACION', label: 'Consignacion' },
  { value: 'ENVIO_OTRO_ALMACEN', label: 'Envio a otro almacen' },
  { value: 'TRUEQUE', label: 'Trueque' },
  { value: 'DEVOLUCION', label: 'Devolucion' },
  { value: 'OTRO', label: 'Otro' },
];

const estadoOptions = [
  { value: '', label: 'Todos' },
  { value: 'PRESTADO', label: 'Abiertos' },
  { value: 'DEVUELTO', label: 'Devueltos' },
  { value: 'VENDIDO_EXTERNAMENTE', label: 'Vendidos externo' },
  { value: 'TRUEQUEADO', label: 'Truequeados' },
  { value: 'CANCELADO', label: 'Cancelados' },
];

const cierreOptions = [
  { value: 'DEVUELTO', label: 'Devuelto al inventario' },
  { value: 'VENDIDO_EXTERNAMENTE', label: 'Vendido externamente' },
  { value: 'TRUEQUEADO', label: 'Termino en trueque' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

const initialForm = {
  clienteId: '',
  tipo: 'PRESTAMO',
  responsableNombre: '',
  responsableCedula: '',
  responsableTelefono: '',
  destino: '',
  fechaCompromiso: '',
  observaciones: '',
};

const initialClientForm = {
  nombreCompleto: '',
  cedula: '',
  telefonoCelular: '',
  email: '',
  fechaNacimiento: '',
};

const initialCloseForm = {
  estado: 'DEVUELTO',
  valorRecibido: 0,
  observaciones: '',
  devolverInventario: true,
};

const normalizeSearchValue = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const formatVariantDetail = (variant: { color?: string | null; talla?: string | null }) => {
  const color = String(variant.color || '').toUpperCase();
  const talla = String(variant.talla || '').toUpperCase();

  if (color === 'NO APLICA' && talla === 'NO APLICA') return 'Sin color ni talla';
  if (color === 'NO APLICA') return `Talla ${variant.talla}`;
  if (talla === 'NO APLICA') return `Color ${variant.color}`;
  return `${variant.color}/${variant.talla}`;
};

const getTipoLabel = (salida: any) => {
  const notes = String(salida.observaciones || '');
  const specialMatch = notes.match(/Tipo especial:\s*([^\n]+)/i);

  if (specialMatch) {
    return specialMatch[1];
  }

  return tipoOptions.find((option) => option.value === salida.tipo)?.label || salida.tipo;
};

const statusClass = (estado: string) => {
  if (estado === 'PRESTADO') return 'bg-sky-100 text-sky-700';
  if (estado === 'DEVUELTO') return 'bg-emerald-100 text-emerald-700';
  if (estado === 'CANCELADO') return 'bg-rose-100 text-rose-700';
  return 'bg-amber-100 text-amber-700';
};

const SalidasPage = () => {
  const [salidas, setSalidas] = useState<any[]>([]);
  const [variantes, setVariantes] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [closeTarget, setCloseTarget] = useState<any | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [variantSearch, setVariantSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [showClientForm, setShowClientForm] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [clientForm, setClientForm] = useState(initialClientForm);
  const [closeForm, setCloseForm] = useState(initialCloseForm);
  const [items, setItems] = useState<
    Array<{
      varianteId: string;
      nombre: string;
      detalle: string;
      sku: string | null;
      codigoBarras: string | null;
      cantidad: number;
      stockActual: number;
      precioVenta: number;
    }>
  >([]);

  const loadData = async () => {
    const [salidasRes, variantesRes, clientesRes] = await Promise.all([
      client.get(endpoints.salidas()),
      client.get(endpoints.productoVariantes()),
      client.get(endpoints.clientes()),
    ]);

    setSalidas(salidasRes.data);
    setVariantes(variantesRes.data);
    setClientes(clientesRes.data);
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await loadData();
      } catch (requestError) {
        setPageError((requestError as Error).message);
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, []);

  const normalizedVariantSearch = normalizeSearchValue(variantSearch);
  const normalizedClientSearch = normalizeSearchValue(clientSearch);
  const selectedClient = clientes.find((item) => item.id === form.clienteId) || null;
  const availableVariants = useMemo(
    () => variantes.filter((item) => item.estado !== 'INACTIVO' && Number(item.stockActual || 0) > 0),
    [variantes]
  );

  const filteredVariantResults = useMemo(() => {
    if (!normalizedVariantSearch) return [];

    return availableVariants
      .filter((item) => {
        const barcode = item.codigos?.find((code: any) => code.principal)?.codigo || '';
        const terms = [item.producto?.nombre || '', item.producto?.marca || '', item.sku || '', barcode, formatVariantDetail(item)];
        return terms.some((term) => normalizeSearchValue(String(term)).includes(normalizedVariantSearch));
      })
      .slice(0, 8);
  }, [availableVariants, normalizedVariantSearch]);

  const filteredClientes = useMemo(() => {
    if (!normalizedClientSearch) return [];

    return clientes
      .filter((clientItem) =>
        [clientItem.nombreCompleto, clientItem.cedula, clientItem.telefonoCelular, clientItem.email]
          .filter(Boolean)
          .some((value) => normalizeSearchValue(String(value)).includes(normalizedClientSearch))
      )
      .slice(0, 6);
  }, [clientes, normalizedClientSearch]);

  const filteredSalidas = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return salidas.filter((salida) => {
      if (estadoFilter && salida.estado !== estadoFilter) return false;
      if (!normalized) return true;

      return [
        salida.id,
        salida.responsableNombre,
        salida.responsableCedula,
        salida.responsableTelefono,
        salida.destino,
        salida.cliente?.nombreCompleto,
        salida.cliente?.cedula,
        salida.items?.map((item: any) => `${item.variante?.producto?.nombre} ${item.variante?.sku || ''}`).join(' '),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [salidas, search, estadoFilter]);

  const resetCreateForm = () => {
    setForm(initialForm);
    setClientForm(initialClientForm);
    setClientSearch('');
    setVariantSearch('');
    setShowClientForm(false);
    setSelectedQuantity(1);
    setItems([]);
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setModalError(null);
    resetCreateForm();
  };

  const openCreateModal = () => {
    resetCreateForm();
    setModalError(null);
    setPageError(null);
    setSuccess(null);
    setIsCreateOpen(true);
  };

  const addVariant = (variant: any) => {
    const nextQuantity = Math.trunc(Number(selectedQuantity || 1));

    if (!variant || nextQuantity <= 0) {
      setModalError('Debes escoger un producto y una cantidad valida.');
      return;
    }

    const existingQuantity = items.find((item) => item.varianteId === variant.id)?.cantidad || 0;
    const totalQuantity = existingQuantity + nextQuantity;

    if (totalQuantity > Number(variant.stockActual || 0)) {
      setModalError(`No puedes sacar mas de ${variant.stockActual} unidades de ${variant.producto?.nombre}.`);
      return;
    }

    const barcode = variant.codigos?.find((code: any) => code.principal)?.codigo || null;

    setItems((current) => {
      const existingItem = current.find((item) => item.varianteId === variant.id);

      if (existingItem) {
        return current.map((item) =>
          item.varianteId === variant.id ? { ...item, cantidad: totalQuantity } : item
        );
      }

      return [
        ...current,
        {
          varianteId: variant.id,
          nombre: variant.producto?.nombre || 'Variante',
          detalle: formatVariantDetail(variant),
          sku: variant.sku || null,
          codigoBarras: barcode,
          cantidad: nextQuantity,
          stockActual: Number(variant.stockActual || 0),
          precioVenta: Number(variant.precioVenta || 0),
        },
      ];
    });

    setModalError(null);
    setVariantSearch('');
    setSelectedQuantity(1);
  };

  const handleVariantSearchSubmit = () => {
    if (!normalizedVariantSearch) return;

    const exactVariant = availableVariants.find((item) => {
      const barcode = item.codigos?.find((code: any) => code.principal)?.codigo || '';
      const exactTerms = [item.sku || '', item.producto?.nombre || '', barcode];
      return exactTerms.some((term) => normalizeSearchValue(String(term)) === normalizedVariantSearch);
    });

    if (exactVariant) {
      addVariant(exactVariant);
      return;
    }

    if (filteredVariantResults.length === 1) {
      addVariant(filteredVariantResults[0]);
      return;
    }

    setModalError('Escribe un codigo/SKU completo o usa el boton Agregar del producto correcto.');
  };

  const handleUpdateItemQuantity = (varianteId: string, rawValue: number) => {
    setItems((current) =>
      current.map((item) => {
        if (item.varianteId !== varianteId) return item;
        const quantity = Math.max(1, Math.min(item.stockActual, Math.trunc(rawValue || 1)));
        return { ...item, cantidad: quantity };
      })
    );
  };

  const createQuickClient = async () => {
    const { data } = await client.post(endpoints.clientes(), clientForm);
    setClientes((current) => {
      const withoutDuplicate = current.filter((item) => item.id !== data.id);
      return [...withoutDuplicate, data].sort((left, right) =>
        String(left.nombreCompleto || '').localeCompare(String(right.nombreCompleto || ''), 'es')
      );
    });
    setForm((current) => ({
      ...current,
      clienteId: data.id,
      responsableNombre: current.responsableNombre || data.nombreCompleto,
      responsableCedula: current.responsableCedula || data.cedula,
      responsableTelefono: current.responsableTelefono || data.telefonoCelular,
    }));
    setClientSearch(data.nombreCompleto);
    setShowClientForm(false);
    setClientForm(initialClientForm);
    return data;
  };

  const handleCreateQuickClient = async () => {
    setSavingClient(true);
    setModalError(null);

    try {
      await createQuickClient();
    } catch (requestError) {
      setModalError((requestError as Error).message);
    } finally {
      setSavingClient(false);
    }
  };

  const handleCreateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setModalError(null);
    setSuccess(null);

    try {
      let clienteIdForSalida = form.clienteId || null;

      if (
        !clienteIdForSalida &&
        showClientForm &&
        [clientForm.nombreCompleto, clientForm.cedula, clientForm.telefonoCelular].some((value) => String(value || '').trim())
      ) {
        setSavingClient(true);
        const createdClient = await createQuickClient();
        setSavingClient(false);
        clienteIdForSalida = createdClient.id;
      }

      if (!form.responsableNombre.trim()) {
        throw new Error('Debes indicar quien tiene el producto.');
      }

      if (items.length === 0) {
        throw new Error('Debes agregar al menos un producto.');
      }

      const payload = {
        ...form,
        clienteId: clienteIdForSalida,
        items: items.map((item) => ({
          varianteId: item.varianteId,
          cantidad: item.cantidad,
        })),
      };

      const { data } = await client.post(endpoints.salidas(), payload);
      await loadData();
      closeCreateModal();
      setSuccess(`Salida ${String(data.id).slice(-6).toUpperCase()} registrada.`);
    } catch (requestError) {
      setModalError((requestError as Error).message);
    } finally {
      setSaving(false);
      setSavingClient(false);
    }
  };

  const openCloseModal = (salida: any) => {
    setCloseTarget(salida);
    setCloseForm(initialCloseForm);
    setModalError(null);
    setSuccess(null);
  };

  const closeCloseModal = () => {
    setCloseTarget(null);
    setCloseForm(initialCloseForm);
    setModalError(null);
  };

  const handleCloseSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!closeTarget) return;

    setSaving(true);
    setModalError(null);

    try {
      await client.post(endpoints.salidaCierre(closeTarget.id), closeForm);
      await loadData();
      closeCloseModal();
      setSuccess('Salida cerrada.');
    } catch (requestError) {
      setModalError((requestError as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'codigo',
      header: 'SALIDA',
      render: (row: any) => (
        <div>
          <div className="font-semibold text-slate-900">{String(row.id).slice(-6).toUpperCase()}</div>
          <div className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleString('es-CO')}</div>
        </div>
      ),
    },
    {
      key: 'tipo',
      header: 'TIPO',
      render: (row: any) => getTipoLabel(row),
    },
    {
      key: 'responsable',
      header: 'QUIEN LO TIENE',
      render: (row: any) => (
        <div>
          <div className="font-semibold text-slate-900">{row.responsableNombre}</div>
          <div className="text-xs text-slate-500">
            {[row.responsableCedula, row.responsableTelefono].filter(Boolean).join(' | ') || 'Sin datos'}
          </div>
        </div>
      ),
    },
    {
      key: 'productos',
      header: 'PRODUCTOS',
      render: (row: any) => (
        <div className="space-y-1">
          {row.items?.slice(0, 3).map((item: any) => (
            <div key={item.id} className="text-sm text-slate-700">
              {item.cantidad} x {item.variante?.producto?.nombre} {formatVariantDetail(item.variante || {})}
            </div>
          ))}
          {row.items?.length > 3 ? <div className="text-xs text-slate-500">+{row.items.length - 3} mas</div> : null}
        </div>
      ),
    },
    {
      key: 'destino',
      header: 'DESTINO',
      render: (row: any) => row.destino || 'Sin destino',
    },
    {
      key: 'estado',
      header: 'ESTADO',
      render: (row: any) => (
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(row.estado)}`}>
          {row.estado}
        </span>
      ),
    },
    {
      key: 'acciones',
      header: 'ACCIONES',
      render: (row: any) =>
        row.estado === 'PRESTADO' ? (
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
            onClick={() => openCloseModal(row)}
          >
            Cerrar
          </button>
        ) : (
          <span className="text-sm text-slate-500">
            {row.cerradoAt ? `Cerrado ${new Date(row.cerradoAt).toLocaleDateString('es-CO')}` : 'Cerrado'}
          </span>
        ),
    },
  ];

  return (
    <div>
      <Topbar title="Salidas especiales" />
      <div className="space-y-6 px-6 py-6">
        <ErrorBanner message={pageError} />
        {success ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-700">
            {success}
          </div>
        ) : null}

        <section className="theme-section-card rounded-2xl p-6 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_auto] lg:items-end">
            <label className="block text-sm">
              <span className="text-slate-600">Buscar salida</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Responsable, destino, cliente, producto o SKU..."
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Estado</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                value={estadoFilter}
                onChange={(event) => setEstadoFilter(event.target.value)}
              >
                {estadoOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white" onClick={openCreateModal}>
              Registrar salida
            </button>
          </div>
        </section>

        <section className="theme-section-card rounded-2xl p-6 shadow-sm">
          {loading ? (
            <Loading label="Cargando salidas..." />
          ) : filteredSalidas.length === 0 ? (
            <EmptyState title="Sin salidas especiales" description="Registra prestamos, consignaciones, envios, trueques o devoluciones." />
          ) : (
            <DataTable columns={columns} data={filteredSalidas} />
          )}
        </section>
      </div>

      <FormModal open={isCreateOpen} title="Registrar salida especial" description="Controla producto que sale sin venta directa." onClose={closeCreateModal} size="2xl">
        <ErrorBanner message={modalError} />
        <form onSubmit={handleCreateSubmit} className="space-y-6">
          <section className="rounded-2xl border border-slate-200 p-4">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">1. Responsable</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm md:col-span-2">
                <span className="text-slate-600">Buscar cliente opcional</span>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  value={clientSearch}
                  onChange={(event) => {
                    setClientSearch(event.target.value);
                    setModalError(null);
                  }}
                  placeholder="Nombre, cedula o telefono..."
                />
              </label>
            </div>
            {selectedClient ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div className="font-semibold text-emerald-900">{selectedClient.nombreCompleto}</div>
                <div className="text-sm text-emerald-800">
                  Cedula: {selectedClient.cedula} | Telefono: {selectedClient.telefonoCelular}
                </div>
              </div>
            ) : null}
            {filteredClientes.length > 0 ? (
              <div className="mt-4 space-y-2">
                {filteredClientes.map((clientItem) => (
                  <button
                    key={clientItem.id}
                    type="button"
                    className="grid w-full gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left md:grid-cols-[minmax(0,1fr)_auto]"
                    onClick={() => {
                      setForm((current) => ({
                        ...current,
                        clienteId: clientItem.id,
                        responsableNombre: current.responsableNombre || clientItem.nombreCompleto,
                        responsableCedula: current.responsableCedula || clientItem.cedula,
                        responsableTelefono: current.responsableTelefono || clientItem.telefonoCelular,
                      }));
                      setClientSearch(clientItem.nombreCompleto);
                    }}
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{clientItem.nombreCompleto}</div>
                      <div className="text-xs text-slate-500">{clientItem.cedula} | {clientItem.telefonoCelular}</div>
                    </div>
                    <span className="rounded-md border border-slate-300 px-3 py-2 text-sm">Usar</span>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="mt-4">
              <button type="button" className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white" onClick={() => setShowClientForm((current) => !current)}>
                {showClientForm ? 'Ocultar formulario' : 'Crear cliente rapido'}
              </button>
            </div>
            {showClientForm ? (
              <div className="mt-4 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                <label className="text-sm md:col-span-2">
                  <span className="text-slate-600">Nombre completo</span>
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={clientForm.nombreCompleto} onChange={(event) => setClientForm((current) => ({ ...current, nombreCompleto: event.target.value }))} />
                </label>
                <label className="text-sm">
                  <span className="text-slate-600">Cedula</span>
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={clientForm.cedula} onChange={(event) => setClientForm((current) => ({ ...current, cedula: event.target.value }))} />
                </label>
                <label className="text-sm">
                  <span className="text-slate-600">Telefono celular</span>
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={clientForm.telefonoCelular} onChange={(event) => setClientForm((current) => ({ ...current, telefonoCelular: event.target.value }))} />
                </label>
                <label className="text-sm">
                  <span className="text-slate-600">Correo electronico</span>
                  <input type="email" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={clientForm.email} onChange={(event) => setClientForm((current) => ({ ...current, email: event.target.value }))} />
                </label>
                <label className="text-sm">
                  <span className="text-slate-600">Fecha de nacimiento</span>
                  <input type="date" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={clientForm.fechaNacimiento} onChange={(event) => setClientForm((current) => ({ ...current, fechaNacimiento: event.target.value }))} />
                </label>
                <div className="md:col-span-2">
                  <button type="button" disabled={savingClient} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60" onClick={() => void handleCreateQuickClient()}>
                    {savingClient ? 'Guardando cliente...' : 'Guardar cliente y usarlo'}
                  </button>
                </div>
              </div>
            ) : null}
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="text-sm">
                <span className="text-slate-600">Quien lo tiene</span>
                <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.responsableNombre} onChange={(event) => setForm((current) => ({ ...current, responsableNombre: event.target.value }))} />
              </label>
              <label className="text-sm">
                <span className="text-slate-600">Cedula / ID</span>
                <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.responsableCedula} onChange={(event) => setForm((current) => ({ ...current, responsableCedula: event.target.value }))} />
              </label>
              <label className="text-sm">
                <span className="text-slate-600">Telefono</span>
                <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.responsableTelefono} onChange={(event) => setForm((current) => ({ ...current, responsableTelefono: event.target.value }))} />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">2. Tipo y productos</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm">
                <span className="text-slate-600">Tipo</span>
                <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.tipo} onChange={(event) => setForm((current) => ({ ...current, tipo: event.target.value }))}>
                  {tipoOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <span className="text-slate-600">Destino</span>
                <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.destino} onChange={(event) => setForm((current) => ({ ...current, destino: event.target.value }))} placeholder="Almacen, feria, proveedor..." />
              </label>
              <label className="text-sm">
                <span className="text-slate-600">Fecha compromiso</span>
                <input type="date" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.fechaCompromiso} onChange={(event) => setForm((current) => ({ ...current, fechaCompromiso: event.target.value }))} />
              </label>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_140px]">
              <label className="text-sm">
                <span className="text-slate-600">Buscar producto</span>
                <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={variantSearch} onChange={(event) => { setVariantSearch(event.target.value); setModalError(null); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleVariantSearchSubmit(); } }} placeholder="Nombre, SKU o codigo de barras..." />
              </label>
              <label className="text-sm">
                <span className="text-slate-600">Cantidad</span>
                <input type="number" min="1" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={selectedQuantity} onChange={(event) => setSelectedQuantity(Number(event.target.value || 1))} />
              </label>
            </div>
            {filteredVariantResults.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_140px_120px_100px_140px_120px] gap-3 border-b border-slate-200 bg-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-slate-600">
                  <div>Nombre</div><div>Categoria</div><div>Color</div><div>Talla</div><div>Stock</div><div>Precio</div><div>Accion</div>
                </div>
                {filteredVariantResults.map((variant: any) => {
                  const barcode = variant.codigos?.find((item: any) => item.principal)?.codigo;
                  return (
                    <div key={variant.id} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_140px_120px_100px_140px_120px] gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0">
                      <div><div className="font-semibold text-slate-900">{variant.producto?.nombre}</div><div className="text-xs text-slate-500">SKU: {variant.sku || 'Sin SKU'} | Codigo: {barcode || 'Sin codigo'}</div></div>
                      <div className="text-sm text-slate-700">{variant.producto?.categoria?.nombre || 'Sin categoria'}</div>
                      <div className="text-sm text-slate-700">{String(variant.color || '').toUpperCase() === 'NO APLICA' ? 'No aplica' : variant.color}</div>
                      <div className="text-sm text-slate-700">{String(variant.talla || '').toUpperCase() === 'NO APLICA' ? 'No aplica' : variant.talla}</div>
                      <div className="text-sm text-slate-700">{variant.stockActual}</div>
                      <div className="text-sm text-slate-700">{formatCOP(variant.precioVenta)}</div>
                      <div><button type="button" className="rounded-md border border-slate-300 px-4 py-2 text-sm" onClick={() => addVariant(variant)}>Agregar</button></div>
                    </div>
                  );
                })}
              </div>
            ) : null}
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="mb-3 text-sm font-semibold text-slate-900">Productos agregados</h4>
              {items.length === 0 ? (
                <p className="text-sm text-slate-500">Aun no has agregado productos a la salida.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="grid grid-cols-[minmax(0,1.5fr)_130px_140px_120px] gap-3 border-b border-slate-200 bg-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-slate-600">
                    <div>Producto</div><div>Cantidad</div><div>Referencia</div><div>Accion</div>
                  </div>
                  {items.map((item) => (
                    <div key={item.varianteId} className="grid grid-cols-[minmax(0,1.5fr)_130px_140px_120px] gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0">
                      <div><div className="font-semibold text-slate-900">{item.nombre}</div><div className="text-xs text-slate-500">{item.detalle} | SKU: {item.sku || 'Sin SKU'} | Codigo: {item.codigoBarras || 'Sin codigo'}</div></div>
                      <input type="number" min="1" max={item.stockActual} className="w-full rounded-md border border-slate-300 px-3 py-2" value={item.cantidad} onChange={(event) => handleUpdateItemQuantity(item.varianteId, Number(event.target.value || 1))} />
                      <div className="text-sm font-semibold text-slate-900">{formatCOP(item.precioVenta * item.cantidad)}</div>
                      <button type="button" className="text-sm font-semibold text-rose-700 underline" onClick={() => setItems((current) => current.filter((row) => row.varianteId !== item.varianteId))}>Quitar</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <label className="mt-4 block text-sm">
              <span className="text-slate-600">Observaciones</span>
              <textarea className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2" value={form.observaciones} onChange={(event) => setForm((current) => ({ ...current, observaciones: event.target.value }))} />
            </label>
          </section>
          <div className="flex gap-3">
            <button type="submit" disabled={saving || items.length === 0} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60">{saving ? 'Guardando...' : 'Confirmar salida'}</button>
            <button type="button" className="rounded-md border border-slate-300 px-4 py-2 text-sm" onClick={closeCreateModal}>Cancelar</button>
          </div>
        </form>
      </FormModal>

      <FormModal open={Boolean(closeTarget)} title="Cerrar salida" description="Registra como termino el movimiento." onClose={closeCloseModal} size="xl">
        <ErrorBanner message={modalError} />
        <form onSubmit={handleCloseSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="text-slate-600">Como termino</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={closeForm.estado}
              onChange={(event) =>
                setCloseForm((current) => ({
                  ...current,
                  estado: event.target.value,
                  devolverInventario: event.target.value === 'DEVUELTO',
                }))
              }
            >
              {cierreOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <MoneyInput label="Valor recibido" value={closeForm.valorRecibido} onChange={(value) => setCloseForm((current) => ({ ...current, valorRecibido: value }))} />
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm md:col-span-2">
            <input type="checkbox" checked={closeForm.devolverInventario} onChange={(event) => setCloseForm((current) => ({ ...current, devolverInventario: event.target.checked }))} />
            <span>Devolver productos al inventario</span>
          </label>
          <label className="text-sm md:col-span-2">
            <span className="text-slate-600">Observaciones de cierre</span>
            <textarea className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2" value={closeForm.observaciones} onChange={(event) => setCloseForm((current) => ({ ...current, observaciones: event.target.value }))} />
          </label>
          <div className="flex gap-3 md:col-span-2">
            <button type="submit" disabled={saving} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60">{saving ? 'Cerrando...' : 'Cerrar movimiento'}</button>
            <button type="button" className="rounded-md border border-slate-300 px-4 py-2 text-sm" onClick={closeCloseModal}>Cancelar</button>
          </div>
        </form>
      </FormModal>
    </div>
  );
};

export default SalidasPage;
