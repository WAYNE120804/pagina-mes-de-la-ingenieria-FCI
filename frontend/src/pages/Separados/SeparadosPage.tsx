import { Link, useNavigate } from 'react-router-dom';
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

const paymentOptions = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'NEQUI', label: 'Nequi' },
  { value: 'DAVIPLATA', label: 'Daviplata' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'OTRO', label: 'Otro' },
];

const statusOptions = [
  { value: '', label: 'Todos' },
  { value: 'ACTIVO', label: 'Activos' },
  { value: 'VENCIDO', label: 'Vencidos' },
  { value: 'ENTREGADO', label: 'Entregados' },
  { value: 'CANCELADO', label: 'Cancelados' },
];

const initialForm = {
  clienteId: '',
  fechaLimite: '',
  abonoInicial: 0,
  metodoPago: 'EFECTIVO',
  referencia: '',
  observacionAbono: '',
  observaciones: '',
};

const initialAbonoForm = {
  valor: 0,
  metodoPago: 'EFECTIVO',
  referencia: '',
  observacion: '',
};

const initialClientForm = {
  nombreCompleto: '',
  cedula: '',
  telefonoCelular: '',
  email: '',
  fechaNacimiento: '',
};

const normalizeSearchValue = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const formatVariantDetail = (variant: {
  color?: string | null;
  talla?: string | null;
}) => {
  const color = String(variant.color || '').toUpperCase();
  const talla = String(variant.talla || '').toUpperCase();

  if (color === 'NO APLICA' && talla === 'NO APLICA') {
    return 'Sin color ni talla';
  }

  if (color === 'NO APLICA') {
    return `Talla ${variant.talla}`;
  }

  if (talla === 'NO APLICA') {
    return `Color ${variant.color}`;
  }

  return `${variant.color}/${variant.talla}`;
};

const statusClass = (estado: string) => {
  if (estado === 'ENTREGADO') {
    return 'bg-emerald-100 text-emerald-700';
  }

  if (estado === 'VENCIDO') {
    return 'bg-amber-100 text-amber-700';
  }

  if (estado === 'CANCELADO') {
    return 'bg-rose-100 text-rose-700';
  }

  return 'bg-sky-100 text-sky-700';
};

const SeparadosPage = () => {
  const navigate = useNavigate();
  const [separados, setSeparados] = useState<any[]>([]);
  const [variantes, setVariantes] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [defaultFechaLimite, setDefaultFechaLimite] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [abonoTarget, setAbonoTarget] = useState<any | null>(null);
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
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
  const [abonoForm, setAbonoForm] = useState(initialAbonoForm);
  const [cancelObservation, setCancelObservation] = useState('');
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
      subtotal: number;
    }>
  >([]);

  const loadData = async () => {
    const [separadosRes, variantesRes, clientesRes, defaultsRes] = await Promise.all([
      client.get(endpoints.separados()),
      client.get(endpoints.productoVariantes()),
      client.get(endpoints.clientes()),
      client.get(endpoints.separadosDefaults()),
    ]);

    setSeparados(separadosRes.data);
    setVariantes(variantesRes.data);
    setClientes(clientesRes.data);
    setDefaultFechaLimite(defaultsRes.data.defaultFechaLimite || '');
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

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const saldoInicial = Math.max(0, subtotal - Number(form.abonoInicial || 0));
  const normalizedVariantSearch = normalizeSearchValue(variantSearch);
  const normalizedClientSearch = normalizeSearchValue(clientSearch);
  const selectedClient = clientes.find((item) => item.id === form.clienteId) || null;

  const reservableVariants = useMemo(
    () => variantes.filter((item) => item.estado !== 'INACTIVO' && Number(item.stockActual || 0) > 0),
    [variantes]
  );

  const filteredVariantResults = useMemo(() => {
    if (!normalizedVariantSearch) {
      return [];
    }

    return reservableVariants
      .filter((item) => {
        const barcode = item.codigos?.find((code: any) => code.principal)?.codigo || '';
        const terms = [
          item.producto?.nombre || '',
          item.producto?.marca || '',
          item.sku || '',
          barcode,
          formatVariantDetail(item),
        ];

        return terms.some((term) => normalizeSearchValue(String(term)).includes(normalizedVariantSearch));
      })
      .slice(0, 8);
  }, [reservableVariants, normalizedVariantSearch]);

  const filteredClientes = useMemo(() => {
    if (!normalizedClientSearch) {
      return [];
    }

    return clientes
      .filter((clientItem) =>
        [
          clientItem.nombreCompleto,
          clientItem.cedula,
          clientItem.telefonoCelular,
          clientItem.email,
        ]
          .filter(Boolean)
          .some((value) => normalizeSearchValue(String(value)).includes(normalizedClientSearch))
      )
      .slice(0, 6);
  }, [clientes, normalizedClientSearch]);

  const filteredSeparados = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return separados.filter((separado) => {
      if (estadoFilter && separado.estado !== estadoFilter) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return [
        separado.id,
        separado.cliente?.nombreCompleto,
        separado.cliente?.cedula,
        separado.items
          ?.map(
            (item: any) =>
              `${item.variante?.producto?.nombre} ${item.variante?.sku || ''} ${formatVariantDetail(item.variante || {})}`
          )
          .join(' '),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [separados, search, estadoFilter]);

  const resetCreateForm = () => {
    setForm({
      ...initialForm,
      fechaLimite: defaultFechaLimite,
    });
    setVariantSearch('');
    setClientSearch('');
    setShowClientForm(false);
    setClientForm(initialClientForm);
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
      setModalError(`No puedes separar mas de ${variant.stockActual} unidades de ${variant.producto?.nombre}.`);
      return;
    }

    const barcode = variant.codigos?.find((code: any) => code.principal)?.codigo || null;

    setItems((current) => {
      const existingItem = current.find((item) => item.varianteId === variant.id);

      if (existingItem) {
        return current.map((item) =>
          item.varianteId === variant.id
            ? {
                ...item,
                cantidad: totalQuantity,
                subtotal: totalQuantity * Number(variant.precioVenta || 0),
              }
            : item
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
          subtotal: nextQuantity * Number(variant.precioVenta || 0),
        },
      ];
    });

    setModalError(null);
    setVariantSearch('');
    setSelectedQuantity(1);
  };

  const handleVariantSearchSubmit = () => {
    if (!normalizedVariantSearch) {
      return;
    }

    const exactVariant = reservableVariants.find((item) => {
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
        if (item.varianteId !== varianteId) {
          return item;
        }

        const quantity = Math.max(1, Math.min(item.stockActual, Math.trunc(rawValue || 1)));

        return {
          ...item,
          cantidad: quantity,
          subtotal: quantity * item.precioVenta,
        };
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
    setForm((current) => ({ ...current, clienteId: data.id }));
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
      let clienteIdForSeparado = form.clienteId;

      if (!clienteIdForSeparado) {
        if (
          showClientForm &&
          [clientForm.nombreCompleto, clientForm.cedula, clientForm.telefonoCelular].some((value) =>
            String(value || '').trim()
          )
        ) {
          setSavingClient(true);
          const createdClient = await createQuickClient();
          setSavingClient(false);
          clienteIdForSeparado = createdClient.id;
        } else {
          throw new Error('Debes seleccionar o crear un cliente.');
        }
      }

      if (items.length === 0) {
        throw new Error('Debes agregar al menos un producto.');
      }

      if (Number(form.abonoInicial || 0) > subtotal) {
        throw new Error('El abono inicial no puede superar el total.');
      }

      const payload = {
        clienteId: clienteIdForSeparado,
        fechaLimite: form.fechaLimite || null,
        items: items.map((item) => ({
          varianteId: item.varianteId,
          cantidad: item.cantidad,
        })),
        abonoInicial: form.abonoInicial,
        metodoPago: form.metodoPago,
        referencia: form.referencia,
        observacionAbono: form.observacionAbono,
        observaciones: form.observaciones,
      };

      const { data } = await client.post(endpoints.separados(), payload);

      await loadData();
      closeCreateModal();
      setSuccess(`Separado ${String(data.id).slice(-6).toUpperCase()} creado por ${formatCOP(data.total)}.`);
      navigate(`/separados/${data.id}/tirilla`);
    } catch (requestError) {
      setModalError((requestError as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const openAbonoModal = (separado: any) => {
    setAbonoTarget(separado);
    setAbonoForm({
      ...initialAbonoForm,
      valor: Number(separado.saldoPendiente || 0),
    });
    setModalError(null);
    setSuccess(null);
  };

  const closeAbonoModal = () => {
    setAbonoTarget(null);
    setAbonoForm(initialAbonoForm);
    setModalError(null);
  };

  const handleAbonoSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!abonoTarget) {
      return;
    }

    setSaving(true);
    setModalError(null);

    try {
      const { data } = await client.post(endpoints.separadoAbonos(abonoTarget.id), abonoForm);
      await loadData();
      closeAbonoModal();
      setSuccess(
        data.estado === 'ENTREGADO'
          ? 'Separado pagado completo y marcado como entregado.'
          : 'Abono registrado.'
      );
    } catch (requestError) {
      setModalError((requestError as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const openCancelModal = (separado: any) => {
    setCancelTarget(separado);
    setCancelObservation('');
    setModalError(null);
    setSuccess(null);
  };

  const closeCancelModal = () => {
    setCancelTarget(null);
    setCancelObservation('');
    setModalError(null);
  };

  const handleCancelSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!cancelTarget) {
      return;
    }

    setSaving(true);
    setModalError(null);

    try {
      await client.post(endpoints.separadoCancelacion(cancelTarget.id), {
        observacion: cancelObservation,
      });
      await loadData();
      closeCancelModal();
      setSuccess('Separado cancelado e inventario devuelto.');
    } catch (requestError) {
      setModalError((requestError as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'codigo',
      header: 'SEPARADO',
      render: (row: any) => (
        <div>
          <div className="font-semibold text-slate-900">{String(row.id).slice(-6).toUpperCase()}</div>
          <div className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleString('es-CO')}</div>
        </div>
      ),
    },
    {
      key: 'cliente',
      header: 'CLIENTE',
      render: (row: any) => (
        <div>
          <div className="font-semibold text-slate-900">{row.cliente?.nombreCompleto}</div>
          <div className="text-xs text-slate-500">{row.cliente?.cedula}</div>
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
      key: 'saldo',
      header: 'SALDO',
      render: (row: any) => (
        <div>
          <div className="font-semibold text-slate-900">{formatCOP(row.saldoPendiente)}</div>
          <div className="text-xs text-slate-500">Abonado {formatCOP(row.totalAbonado)} de {formatCOP(row.total)}</div>
        </div>
      ),
    },
    {
      key: 'fechaLimite',
      header: 'VENCE',
      render: (row: any) =>
        row.fechaLimite ? new Date(row.fechaLimite).toLocaleDateString('es-CO') : 'Sin fecha',
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
      render: (row: any) => (
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/separados/${row.id}/tirilla`}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Tirilla
          </Link>
          {['ACTIVO', 'VENCIDO'].includes(row.estado) ? (
            <>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                onClick={() => openAbonoModal(row)}
              >
                Abonar
              </button>
              <button
                type="button"
                className="rounded-md border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700"
                onClick={() => openCancelModal(row)}
              >
                Cancelar
              </button>
            </>
          ) : (
            <span className="text-sm text-slate-500">Cerrado</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <Topbar title="Separados" />
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
              <span className="text-slate-600">Buscar separado</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cliente, cedula, producto, SKU o codigo..."
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Estado</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                value={estadoFilter}
                onChange={(event) => setEstadoFilter(event.target.value)}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
              onClick={openCreateModal}
            >
              Crear separado
            </button>
          </div>
        </section>

        <section className="theme-section-card rounded-2xl p-6 shadow-sm">
          {loading ? (
            <Loading label="Cargando separados..." />
          ) : filteredSeparados.length === 0 ? (
            <EmptyState title="Sin separados" description="Crea el primer separado para reservar inventario y controlar abonos." />
          ) : (
            <DataTable columns={columns} data={filteredSeparados} />
          )}
        </section>
      </div>

      <FormModal
        open={isCreateOpen}
        title="Crear separado"
        description="Selecciona cliente, productos, fecha limite y abono inicial."
        onClose={closeCreateModal}
        size="2xl"
      >
        <ErrorBanner message={modalError} />
        <form onSubmit={handleCreateSubmit} className="space-y-6">
          <section className="rounded-2xl border border-slate-200 p-4">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">1. Cliente</h3>
            <label className="text-sm">
              <span className="text-slate-600">Buscar cliente</span>
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
                      setForm((current) => ({ ...current, clienteId: clientItem.id }));
                      setClientSearch(clientItem.nombreCompleto);
                    }}
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{clientItem.nombreCompleto}</div>
                      <div className="text-xs text-slate-500">
                        {clientItem.cedula} | {clientItem.telefonoCelular}
                      </div>
                    </div>
                    <span className="rounded-md border border-slate-300 px-3 py-2 text-sm">Usar</span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-4">
              <button
                type="button"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
                onClick={() => setShowClientForm((current) => !current)}
              >
                {showClientForm ? 'Ocultar formulario' : 'Crear cliente rapido'}
              </button>
            </div>

            {showClientForm ? (
              <div className="mt-4 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                <label className="text-sm md:col-span-2">
                  <span className="text-slate-600">Nombre completo</span>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                    value={clientForm.nombreCompleto}
                    onChange={(event) =>
                      setClientForm((current) => ({ ...current, nombreCompleto: event.target.value }))
                    }
                  />
                </label>
                <label className="text-sm">
                  <span className="text-slate-600">Cedula</span>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                    value={clientForm.cedula}
                    onChange={(event) =>
                      setClientForm((current) => ({ ...current, cedula: event.target.value }))
                    }
                  />
                </label>
                <label className="text-sm">
                  <span className="text-slate-600">Telefono celular</span>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                    value={clientForm.telefonoCelular}
                    onChange={(event) =>
                      setClientForm((current) => ({ ...current, telefonoCelular: event.target.value }))
                    }
                  />
                </label>
                <label className="text-sm">
                  <span className="text-slate-600">Correo electronico</span>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                    value={clientForm.email}
                    onChange={(event) =>
                      setClientForm((current) => ({ ...current, email: event.target.value }))
                    }
                  />
                </label>
                <label className="text-sm">
                  <span className="text-slate-600">Fecha de nacimiento</span>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                    value={clientForm.fechaNacimiento}
                    onChange={(event) =>
                      setClientForm((current) => ({ ...current, fechaNacimiento: event.target.value }))
                    }
                  />
                </label>
                <div className="md:col-span-2">
                  <button
                    type="button"
                    disabled={savingClient}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
                    onClick={() => void handleCreateQuickClient()}
                  >
                    {savingClient ? 'Guardando cliente...' : 'Guardar cliente y usarlo en el separado'}
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 p-4">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">2. Productos reservados</h3>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_140px]">
              <label className="text-sm">
                <span className="text-slate-600">Buscar producto</span>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  value={variantSearch}
                  onChange={(event) => {
                    setVariantSearch(event.target.value);
                    setModalError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleVariantSearchSubmit();
                    }
                  }}
                  placeholder="Nombre, SKU o codigo de barras..."
                />
              </label>
              <label className="text-sm">
                <span className="text-slate-600">Cantidad</span>
                <input
                  type="number"
                  min="1"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  value={selectedQuantity}
                  onChange={(event) => setSelectedQuantity(Number(event.target.value || 1))}
                />
              </label>
            </div>

            {filteredVariantResults.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_140px_120px_100px_140px_120px] gap-3 border-b border-slate-200 bg-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-slate-600">
                  <div>Nombre</div>
                  <div>Categoria</div>
                  <div>Color</div>
                  <div>Talla</div>
                  <div>Stock</div>
                  <div>Precio</div>
                  <div>Accion</div>
                </div>
                {filteredVariantResults.map((variant: any) => {
                  const barcode = variant.codigos?.find((item: any) => item.principal)?.codigo;

                  return (
                    <div
                      key={variant.id}
                      className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_140px_120px_100px_140px_120px] gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{variant.producto?.nombre}</div>
                        <div className="text-xs text-slate-500">
                          SKU: {variant.sku || 'Sin SKU'} | Codigo: {barcode || 'Sin codigo'}
                        </div>
                      </div>
                      <div className="text-sm text-slate-700">{variant.producto?.categoria?.nombre || 'Sin categoria'}</div>
                      <div className="text-sm text-slate-700">
                        {String(variant.color || '').toUpperCase() === 'NO APLICA' ? 'No aplica' : variant.color}
                      </div>
                      <div className="text-sm text-slate-700">
                        {String(variant.talla || '').toUpperCase() === 'NO APLICA' ? 'No aplica' : variant.talla}
                      </div>
                      <div className="text-sm text-slate-700">{variant.stockActual}</div>
                      <div className="text-sm text-slate-700">{formatCOP(variant.precioVenta)}</div>
                      <div className="flex justify-start">
                        <button
                          type="button"
                          className="rounded-md border border-slate-300 px-4 py-2 text-sm"
                          onClick={() => addVariant(variant)}
                        >
                          Agregar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="mb-3 text-sm font-semibold text-slate-900">Productos agregados</h4>
              {items.length === 0 ? (
                <p className="text-sm text-slate-500">Aun no has agregado productos al separado.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="grid grid-cols-[minmax(0,1.5fr)_130px_140px_120px] gap-3 border-b border-slate-200 bg-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-slate-600">
                    <div>Producto</div>
                    <div>Cantidad</div>
                    <div>Subtotal</div>
                    <div>Accion</div>
                  </div>
                  {items.map((item) => (
                    <div
                      key={item.varianteId}
                      className="grid grid-cols-[minmax(0,1.5fr)_130px_140px_120px] gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{item.nombre}</div>
                        <div className="text-xs text-slate-500">
                          {item.detalle} | SKU: {item.sku || 'Sin SKU'} | Codigo: {item.codigoBarras || 'Sin codigo'}
                        </div>
                      </div>
                      <input
                        type="number"
                        min="1"
                        max={item.stockActual}
                        className="w-full rounded-md border border-slate-300 px-3 py-2"
                        value={item.cantidad}
                        onChange={(event) => handleUpdateItemQuantity(item.varianteId, Number(event.target.value || 1))}
                      />
                      <div className="text-sm font-semibold text-slate-900">{formatCOP(item.subtotal)}</div>
                      <div className="flex justify-start">
                        <button
                          type="button"
                          className="text-sm font-semibold text-rose-700 underline"
                          onClick={() => setItems((current) => current.filter((row) => row.varianteId !== item.varianteId))}
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">3. Abono y vencimiento</h3>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="text-sm">
                <span className="text-slate-600">Fecha limite</span>
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  value={form.fechaLimite}
                  onChange={(event) => setForm((current) => ({ ...current, fechaLimite: event.target.value }))}
                />
              </label>
              <label className="text-sm">
                <span className="text-slate-600">Metodo de pago</span>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  value={form.metodoPago}
                  onChange={(event) => setForm((current) => ({ ...current, metodoPago: event.target.value }))}
                >
                  {paymentOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <MoneyInput
                label="Abono inicial"
                value={form.abonoInicial}
                onChange={(value) => setForm((current) => ({ ...current, abonoInicial: value }))}
              />
              <label className="text-sm">
                <span className="text-slate-600">Referencia de pago opcional</span>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  value={form.referencia}
                  onChange={(event) => setForm((current) => ({ ...current, referencia: event.target.value }))}
                  placeholder="Numero de comprobante o transaccion"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Total</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{formatCOP(subtotal)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Abonado</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{formatCOP(form.abonoInicial)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Saldo pendiente</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{formatCOP(saldoInicial)}</p>
              </div>
            </div>

            <label className="mt-4 block text-sm">
              <span className="text-slate-600">Observaciones</span>
              <textarea
                className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2"
                value={form.observaciones}
                onChange={(event) => setForm((current) => ({ ...current, observaciones: event.target.value }))}
              />
            </label>
          </section>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || items.length === 0}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Confirmar separado'}
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm"
              onClick={closeCreateModal}
            >
              Cancelar
            </button>
          </div>
        </form>
      </FormModal>

      <FormModal
        open={Boolean(abonoTarget)}
        title="Registrar abono"
        description="El abono entra a la caja diaria y actualiza el saldo pendiente."
        onClose={closeAbonoModal}
        size="xl"
      >
        <ErrorBanner message={modalError} />
        <form onSubmit={handleAbonoSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
            <p className="text-sm text-slate-600">Saldo pendiente</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{formatCOP(abonoTarget?.saldoPendiente || 0)}</p>
          </div>
          <MoneyInput
            label="Valor del abono"
            value={abonoForm.valor}
            onChange={(value) => setAbonoForm((current) => ({ ...current, valor: value }))}
          />
          <label className="text-sm">
            <span className="text-slate-600">Metodo de pago</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={abonoForm.metodoPago}
              onChange={(event) => setAbonoForm((current) => ({ ...current, metodoPago: event.target.value }))}
            >
              {paymentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-slate-600">Referencia de pago opcional</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={abonoForm.referencia}
              onChange={(event) => setAbonoForm((current) => ({ ...current, referencia: event.target.value }))}
              placeholder="Numero de comprobante o transaccion"
            />
          </label>
          <label className="text-sm">
            <span className="text-slate-600">Observacion</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={abonoForm.observacion}
              onChange={(event) => setAbonoForm((current) => ({ ...current, observacion: event.target.value }))}
            />
          </label>
          <div className="flex gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Registrar abono'}
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm"
              onClick={closeAbonoModal}
            >
              Cancelar
            </button>
          </div>
        </form>
      </FormModal>

      <FormModal
        open={Boolean(cancelTarget)}
        title="Cancelar separado"
        description="La cancelacion devuelve los productos reservados al inventario."
        onClose={closeCancelModal}
        size="xl"
      >
        <ErrorBanner message={modalError} />
        <form onSubmit={handleCancelSubmit} className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Los abonos ya registrados quedan como historial de caja; esta accion solo libera inventario y cierra el separado.
          </div>
          <label className="block text-sm">
            <span className="text-slate-600">Motivo u observacion</span>
            <textarea
              className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2"
              value={cancelObservation}
              onChange={(event) => setCancelObservation(event.target.value)}
            />
          </label>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-rose-700 px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {saving ? 'Cancelando...' : 'Cancelar separado'}
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm"
              onClick={closeCancelModal}
            >
              Volver
            </button>
          </div>
        </form>
      </FormModal>
    </div>
  );
};

export default SeparadosPage;
