import { FormEvent, useEffect, useState } from 'react';

import {
  createAttendanceRequest,
  getAttendanceCertificateRequest,
  getPublicEventFormRequest,
  getPublicEventQrSvgRequest,
  getAttendanceStatsRequest,
  listAttendanceRequest,
  listEventsRequest,
  updateAttendanceStatusRequest,
  type AttendanceItem,
  type AttendanceStats,
  type EventItem,
} from '../../api/events.api';
import Topbar from '../../components/Layout/Topbar';
import {
  attendanceMethodLabels,
  attendanceStatusLabels,
  attendeeCategoryLabels,
  labelFor,
} from '../../utils/labels';

const categories = Object.keys(attendeeCategoryLabels);

const emptyStats: AttendanceStats = {
  capacity: null,
  total: 0,
  registered: 0,
  checkedIn: 0,
  cancelled: 0,
  activeTotal: 0,
  available: null,
  checkInRate: 0,
};

function fileSafeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function attendeeName(item: AttendanceItem) {
  return item.user?.name || item.fullName || '';
}

function attendeeEmail(item: AttendanceItem) {
  return item.user?.email || item.email || '';
}

function attendeeIdentifier(item: AttendanceItem) {
  return item.user?.universityCode || item.identifier || '';
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;
    if (context.measureText(nextLine).width > maxWidth && line) {
      context.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = nextLine;
    }
  }

  if (line) {
    context.fillText(line, x, currentY);
  }

  return currentY;
}

async function downloadQrImage(svg: string, title: string, format: 'png' | 'jpeg') {
  const image = new Image();
  const imageLoaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('No fue posible preparar el QR.'));
  });

  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await imageLoaded;

  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1080;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('No fue posible crear la imagen.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#020617';
  context.font = '700 34px Arial';
  context.textAlign = 'center';
  const titleBottom = wrapCanvasText(context, title, canvas.width / 2, 90, 760, 44);

  context.font = '500 24px Arial';
  context.fillStyle = '#475569';
  context.fillText('Formulario de asistencia', canvas.width / 2, titleBottom + 52);

  const qrSize = 620;
  context.drawImage(image, (canvas.width - qrSize) / 2, 300, qrSize, qrSize);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, `image/${format}`, format === 'jpeg' ? 0.95 : undefined);
  });

  if (!blob) {
    throw new Error('No fue posible descargar la imagen.');
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `qr-asistencia-${fileSafeName(title) || 'evento'}.${format === 'jpeg' ? 'jpg' : 'png'}`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportAttendanceExcel(
  rows: AttendanceItem[],
  eventTitle: string,
  labels: {
    categories: Record<string, string>;
    methods: Record<string, string>;
    statuses: Record<string, string>;
  }
) {
  const tableRows = rows
    .map((item) => {
      const cells = [
        attendeeName(item),
        attendeeEmail(item),
        attendeeIdentifier(item),
        labelFor(labels.categories, item.category),
        labelFor(labels.methods, item.method),
        labelFor(labels.statuses, item.status),
        item.checkedInAt ? new Date(item.checkedInAt).toLocaleString('es-CO') : '',
      ];

      return `<tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`;
    })
    .join('');

  const workbook = `
    <html>
      <head><meta charset="UTF-8" /></head>
      <body>
        <table>
          <tr><th colspan="7">${escapeHtml(eventTitle)}</th></tr>
          <tr>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Codigo/Cedula</th>
            <th>Cargo</th>
            <th>Metodo</th>
            <th>Estado</th>
            <th>Ingreso confirmado</th>
          </tr>
          ${tableRows}
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `asistentes-${fileSafeName(eventTitle) || 'evento'}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

const AttendancePage = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [stats, setStats] = useState<AttendanceStats>(emptyStats);
  const [eventId, setEventId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [category, setCategory] = useState('ESTUDIANTE');
  const [publicQrSvg, setPublicQrSvg] = useState('');
  const [publicLink, setPublicLink] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedEvent = events.find((event) => event.id === eventId);

  async function loadEvents() {
    const eventData = await listEventsRequest();
    setEvents(eventData);
    if (!eventId && eventData[0]) {
      setEventId(eventData[0].id);
    }
  }

  async function loadAttendance(selectedEventId = eventId) {
    if (!selectedEventId) {
      setAttendance([]);
      setStats(emptyStats);
      return;
    }

    const [attendanceData, statsData] = await Promise.all([
      listAttendanceRequest(selectedEventId),
      getAttendanceStatsRequest(selectedEventId),
    ]);
    setAttendance(attendanceData);
    setStats(statsData);
    setError('');
  }

  async function loadPublicAttendanceForm(selectedEventId = eventId) {
    if (!selectedEventId) {
      setPublicLink('');
      setPublicQrSvg('');
      return;
    }

    const [form, svg] = await Promise.all([
      getPublicEventFormRequest(selectedEventId, 'attendance'),
      getPublicEventQrSvgRequest(selectedEventId, 'attendance'),
    ]);
    setPublicLink(form.url);
    setPublicQrSvg(svg);
  }

  useEffect(() => {
    loadEvents().catch(() => setError('No fue posible cargar eventos.'));
  }, []);

  useEffect(() => {
    if (!eventId) {
      return;
    }

    loadAttendance(eventId).catch(() => setError('No fue posible cargar asistencia.'));
    loadPublicAttendanceForm(eventId).catch(() => setError('No fue posible cargar el QR publico.'));
  }, [eventId]);

  async function registerManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');

    try {
      await createAttendanceRequest(eventId, { fullName, email, identifier, category });
      setFullName('');
      setEmail('');
      setIdentifier('');
      await loadAttendance();
    } catch {
      setError('No fue posible registrar asistencia. Revisa duplicados o capacidad.');
    }
  }

  async function openCertificate(attendanceId: string) {
    setError('');
    setNotice('');
    try {
      const html = await getAttendanceCertificateRequest(attendanceId);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setError('El certificado solo esta disponible para asistencias confirmadas.');
    }
  }

  async function toggleAttendanceStatus(item: AttendanceItem) {
    const nextStatus = item.status === 'CHECKED_IN' ? 'REGISTERED' : 'CHECKED_IN';

    try {
      setError('');
      setNotice('');
      await updateAttendanceStatusRequest(item.id, nextStatus);
      await loadAttendance();
      setNotice(nextStatus === 'CHECKED_IN' ? 'Ingreso confirmado.' : 'Ingreso desconfirmado.');
    } catch {
      setError('No fue posible actualizar el ingreso.');
    }
  }

  async function copyEmails() {
    setError('');
    const emails = Array.from(new Set(attendance.map(attendeeEmail).filter(Boolean)));

    if (emails.length === 0) {
      setNotice('No hay correos para copiar.');
      return;
    }

    await navigator.clipboard.writeText(emails.join('; '));
    setNotice(`${emails.length} correos copiados.`);
  }

  function downloadAttendanceExcel() {
    setError('');

    if (attendance.length === 0) {
      setNotice('No hay asistentes para exportar.');
      return;
    }

    exportAttendanceExcel(attendance, selectedEvent?.title || 'Asistentes', {
      categories: attendeeCategoryLabels,
      methods: attendanceMethodLabels,
      statuses: attendanceStatusLabels,
    });
    setNotice('Archivo de asistentes generado.');
  }

  return (
    <div>
      <Topbar title="Asistencia" />
      <div className="space-y-6 px-6 py-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Registrados</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{stats.registered}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Ingresaron</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{stats.checkedIn}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Disponibles</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{stats.available ?? 'Sin limite'}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Check-in</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{stats.checkInRate}%</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="space-y-6">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-950">Registro y QR</h3>
              <form className="mt-4 space-y-4" onSubmit={registerManual}>
                <label className="block text-sm font-medium text-slate-700">
                  Evento
                  <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={eventId} onChange={(event) => setEventId(event.target.value)} required>
                    <option value="">Selecciona evento</option>
                    {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
                  </select>
                </label>
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Nombre asistente" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Codigo o cedula" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required />
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={category} onChange={(event) => setCategory(event.target.value)} required>
                  {categories.map((item) => <option key={item} value={item}>{attendeeCategoryLabels[item]}</option>)}
                </select>
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Correo" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white" type="submit">Registrar ingreso</button>
                </div>
              </form>

              {publicQrSvg ? (
                <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                  <div className="mx-auto flex max-w-full flex-col items-center gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{selectedEvent?.title || 'Evento seleccionado'}</p>
                      <p className="mt-1 text-xs text-slate-500">QR publico para registrar asistencia</p>
                    </div>
                    <div className="h-56 w-56 max-w-full shrink-0 [&_svg]:block [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: publicQrSvg }} />
                    <p className="w-full max-w-sm break-all rounded-md bg-white px-3 py-2 text-xs leading-5 text-slate-700">{publicLink}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <button className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold" type="button" onClick={() => void navigator.clipboard.writeText(publicLink)}>
                      Copiar link
                    </button>
                    <button className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold" type="button" onClick={() => void downloadQrImage(publicQrSvg, selectedEvent?.title || 'Evento', 'png').catch(() => setError('No fue posible descargar el QR.'))}>
                      Descargar PNG
                    </button>
                    <button className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold" type="button" onClick={() => void downloadQrImage(publicQrSvg, selectedEvent?.title || 'Evento', 'jpeg').catch(() => setError('No fue posible descargar el QR.'))}>
                      Descargar JPG
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          </div>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-950">Asistentes</h3>
                <p className="mt-1 text-sm text-slate-500">{selectedEvent?.title || 'Selecciona un evento'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled={attendance.length === 0} onClick={() => void copyEmails().catch(() => setError('No fue posible copiar los correos.'))}>
                  Copiar correos
                </button>
                <button className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled={attendance.length === 0} onClick={downloadAttendanceExcel}>
                  Descargar Excel
                </button>
              </div>
            </div>
            {notice ? <p className="border-b border-slate-100 px-5 py-3 text-sm text-emerald-700">{notice}</p> : null}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] table-fixed divide-y divide-slate-200 text-sm">
                <thead className="theme-table-head">
                  <tr>
                    <th className="w-[18%] px-4 py-3 text-left">Nombre</th>
                    <th className="w-[23%] px-4 py-3 text-left">Correo</th>
                    <th className="w-[14%] px-4 py-3 text-left">Codigo/Cedula</th>
                    <th className="w-[11%] px-4 py-3 text-left">Cargo</th>
                    <th className="w-[9%] px-4 py-3 text-left">Metodo</th>
                    <th className="w-[13%] px-4 py-3 text-left">Estado</th>
                    <th className="w-[12%] px-4 py-3 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendance.length === 0 ? (
                    <tr>
                      <td className="px-5 py-6 text-center text-slate-500" colSpan={7}>
                        No hay asistentes registrados para este evento.
                      </td>
                    </tr>
                  ) : null}
                  {attendance.map((item) => (
                    <tr key={item.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-4 align-top font-medium text-slate-950">
                        <span className="block break-words leading-5">{attendeeName(item) || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-4 align-top text-slate-600">
                        <span className="block break-all leading-5">{attendeeEmail(item) || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-4 align-top text-slate-600">{attendeeIdentifier(item) || 'N/A'}</td>
                      <td className="px-4 py-4 align-top text-slate-600">{labelFor(attendeeCategoryLabels, item.category)}</td>
                      <td className="px-4 py-4 align-top">
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {labelFor(attendanceMethodLabels, item.method)}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${item.status === 'CHECKED_IN' ? 'bg-emerald-50 text-emerald-700' : item.status === 'CANCELLED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                          {labelFor(attendanceStatusLabels, item.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-col gap-2">
                          <button
                            className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                              item.status === 'CHECKED_IN'
                                ? 'border-amber-200 text-amber-700'
                                : 'border-emerald-200 text-emerald-700'
                            }`}
                            type="button"
                            onClick={() => void toggleAttendanceStatus(item)}
                          >
                            {item.status === 'CHECKED_IN' ? 'Desconfirmar ingreso' : 'Confirmar ingreso'}
                          </button>
                          <button
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={item.status !== 'CHECKED_IN'}
                            type="button"
                            onClick={() => void openCertificate(item.id)}
                          >
                            Certificado
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
      </div>
    </div>
  );
};

export default AttendancePage;
