import { FormEvent, useEffect, useState } from 'react';

import {
  createAttendanceRequest,
  getAttendanceCertificateRequest,
  getPublicEventFormRequest,
  getPublicEventQrSvgRequest,
  getAttendanceStatsRequest,
  listAttendanceRequest,
  listEventsRequest,
  sendEventAttendanceListRequest,
  updateAttendanceStatusRequest,
  type AttendanceItem,
  type AttendanceStats,
  type EventItem,
} from '../../api/events.api';
import Topbar from '../../components/Layout/Topbar';
import FormModal from '../../components/common/FormModal';
import {
  attendanceMethodLabels,
  attendanceStatusLabels,
  attendeeCategoryLabels,
  labelFor,
} from '../../utils/labels';

const categories = Object.keys(attendeeCategoryLabels);
const semesterLabels: Record<string, string> = {
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  TECNICO: 'Técnico',
  TECNOLOGO: 'Tecnólogo',
  POSGRADO: 'Posgrado',
  NO_APLICA: 'No aplica',
};
const careerLabels: Record<string, string> = {
  ING_SISTEMAS_TELECOMUNICACIONES: 'Ing. Sistemas y Telecomunicaciones',
  ING_ANALITICA_DATOS: 'Ing. Analitica de Datos',
  ING_INDUSTRIAL: 'Ing. Industrial',
  ING_LOGISTICA: 'Ing. Logistica',
  ING_SEGURIDAD_INFORMACION: 'Ing. Seguridad de Información',
  POSGRADOS: 'Posgrados',
  NO_APLICA: 'No aplica',
};

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

function attendeePhone(item: AttendanceItem) {
  return item.phone || '';
}

function attendeeIdentifier(item: AttendanceItem) {
  return item.user?.universityCode || item.identifier || '';
}

function attendeeTeam(item: AttendanceItem) {
  return item.teamName || '';
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

  context.fillStyle = '#101415';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = '#18261c';
  for (let x = 0; x < canvas.width; x += 28) {
    for (let y = 0; y < canvas.height; y += 28) {
      context.beginPath();
      context.arc(x, y, 1.2, 0, Math.PI * 2);
      context.fill();
    }
  }

  context.strokeStyle = '#5adf82';
  context.lineWidth = 3;
  context.strokeRect(54, 54, canvas.width - 108, canvas.height - 108);

  context.fillStyle = '#5adf82';
  context.font = '700 18px Arial';
  context.textAlign = 'center';
  context.fillText('MES DE LA INGENIERIA', canvas.width / 2, 104);

  context.fillStyle = '#f0ffed';
  context.font = '800 36px Arial';
  context.textAlign = 'center';
  const titleBottom = wrapCanvasText(context, title, canvas.width / 2, 158, 720, 46);

  context.font = '500 24px Arial';
  context.fillStyle = '#b9cbb8';
  context.fillText('QR público para registrar asistencia', canvas.width / 2, titleBottom + 56);

  const qrSize = 620;
  const qrX = (canvas.width - qrSize) / 2;
  const qrY = 318;
  context.fillStyle = '#f8fff7';
  context.fillRect(qrX - 24, qrY - 24, qrSize + 48, qrSize + 48);
  context.strokeStyle = '#5adf82';
  context.lineWidth = 2;
  context.strokeRect(qrX - 24, qrY - 24, qrSize + 48, qrSize + 48);
  context.drawImage(image, qrX, qrY, qrSize, qrSize);

  context.fillStyle = '#849584';
  context.font = '600 20px Arial';
  context.fillText('Facultad de Ciencias e Ingeniería - UManizales', canvas.width / 2, 1014);

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
        attendeeTeam(item),
        attendeeName(item),
        attendeeEmail(item),
        attendeePhone(item),
        attendeeIdentifier(item),
        labelFor(labels.categories, item.category),
        labelFor(semesterLabels, item.semester),
        labelFor(careerLabels, item.career),
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
          <tr><th colspan="11">${escapeHtml(eventTitle)}</th></tr>
          <tr>
            <th>Equipo</th>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Telefono</th>
            <th>Código/Cédula</th>
            <th>Cargo</th>
            <th>Semestre</th>
            <th>Carrera</th>
            <th>Método</th>
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
  const [phone, setPhone] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [category, setCategory] = useState('ESTUDIANTE');
  const [semester, setSemester] = useState('');
  const [career, setCareer] = useState('');
  const [publicQrSvg, setPublicQrSvg] = useState('');
  const [publicLink, setPublicLink] = useState('');
  const [showListModal, setShowListModal] = useState(false);
  const [listRecipients, setListRecipients] = useState('');
  const [listSubject, setListSubject] = useState('');
  const [listBody, setListBody] = useState('');
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
    loadPublicAttendanceForm(eventId).catch(() => setError('No fue posible cargar el QR público.'));
  }, [eventId]);

  async function registerManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');

    try {
      await createAttendanceRequest(eventId, { fullName, email, phone, identifier, category, semester, career });
      setFullName('');
      setEmail('');
      setPhone('');
      setIdentifier('');
      setSemester('');
      setCareer('');
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
      setError('El certificado solo está disponible para asistencias confirmadas.');
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

  async function sendAttendanceList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!eventId) {
      return;
    }

    const recipients = listRecipients
      .split(/[;,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      setError('');
      setNotice('');
      await sendEventAttendanceListRequest(eventId, {
        recipients,
        subject: listSubject || `Lista de asistencia - ${selectedEvent?.title || 'Evento'}`,
        body: listBody || 'Adjunto la lista de asistencia para soporte de permiso académico.',
      });
      setShowListModal(false);
      setListRecipients('');
      setNotice('Lista enviada por correo. Si SMTP falla, la app sigue funcionando y queda registrado.');
    } catch {
      setError('No fue posible enviar la lista. Revisa correos destino o configuración SMTP.');
    }
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
        <FormModal
          open={showListModal}
          title="Enviar lista de asistencia"
          description="Envia a profesores o responsables un Excel con los inscritos/asistentes."
          onClose={() => setShowListModal(false)}
        >
          <form className="mt-4 space-y-4" onSubmit={sendAttendanceList}>
            <label className="block text-sm font-medium text-slate-700">
              Correos destino
              <textarea className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={listRecipients} onChange={(event) => setListRecipients(event.target.value)} placeholder="profesor@umanizales.edu.co; otro@umanizales.edu.co" required />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Asunto
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={listSubject} onChange={(event) => setListSubject(event.target.value)} placeholder={`Lista de asistencia - ${selectedEvent?.title || 'Evento'}`} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Mensaje
              <textarea className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={listBody} onChange={(event) => setListBody(event.target.value)} placeholder="Adjunto la lista para permiso académico." />
            </label>
            <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Enviar lista</button>
          </form>
        </FormModal>
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
            <p className="mt-2 text-2xl font-semibold text-slate-950">{stats.available ?? 'Sin límite'}</p>
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
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Código o cédula" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required />
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={category} onChange={(event) => setCategory(event.target.value)} required>
                  {categories.map((item) => <option key={item} value={item}>{attendeeCategoryLabels[item]}</option>)}
                </select>
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={semester} onChange={(event) => setSemester(event.target.value)} required>
                  <option value="">Semestre</option>
                  {Object.entries(semesterLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={career} onChange={(event) => setCareer(event.target.value)} required>
                  <option value="">Carrera</option>
                  {Object.entries(careerLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Correo" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Telefono" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required />
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white" type="submit">Registrar ingreso</button>
                </div>
              </form>

              {publicQrSvg ? (
                <div className="mt-5 overflow-hidden rounded-lg border border-[#5adf82]/40 bg-[#101415] p-4 text-center shadow-[0_0_0_1px_rgba(90,223,130,0.12)]">
                  <div className="mx-auto flex max-w-full flex-col items-center gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#f0ffed]">{selectedEvent?.title || 'Evento seleccionado'}</p>
                      <p className="mt-1 text-xs text-[#b9cbb8]">QR público para registrar asistencia</p>
                    </div>
                    <div className="qr-scan-surface rounded-xl border border-[#5adf82]/40 p-3">
                      <div className="h-56 w-56 max-w-full shrink-0 [&_svg]:block [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: publicQrSvg }} />
                    </div>
                    <p className="w-full max-w-sm break-all rounded-md border border-[#3b4b3c] bg-[#1d2022] px-3 py-2 text-xs leading-5 text-[#b9cbb8]">{publicLink}</p>
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
                <button className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled={attendance.length === 0} onClick={() => setShowListModal(true)}>
                  Enviar lista
                </button>
              </div>
            </div>
            {notice ? <p className="border-b border-slate-100 px-5 py-3 text-sm text-emerald-700">{notice}</p> : null}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] table-fixed divide-y divide-slate-200 text-sm">
                <thead className="theme-table-head">
                  <tr>
                    <th className="w-[12%] px-4 py-3 text-left">Equipo</th>
                    <th className="w-[13%] px-4 py-3 text-left">Nombre</th>
                    <th className="w-[16%] px-4 py-3 text-left">Correo</th>
                    <th className="w-[10%] px-4 py-3 text-left">Telefono</th>
                    <th className="w-[12%] px-4 py-3 text-left">Código/Cédula</th>
                    <th className="w-[9%] px-4 py-3 text-left">Cargo</th>
                    <th className="w-[8%] px-4 py-3 text-left">Semestre</th>
                    <th className="w-[17%] px-4 py-3 text-left">Carrera</th>
                    <th className="w-[8%] px-4 py-3 text-left">Método</th>
                    <th className="w-[10%] px-4 py-3 text-left">Estado</th>
                    <th className="w-[12%] px-4 py-3 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendance.length === 0 ? (
                    <tr>
                      <td className="px-5 py-6 text-center text-slate-500" colSpan={11}>
                        No hay asistentes registrados para este evento.
                      </td>
                    </tr>
                  ) : null}
                  {attendance.map((item) => (
                    <tr key={item.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-4 align-top text-slate-600">
                        <span className="block break-words leading-5">{attendeeTeam(item) || 'N/A'}</span>
                      </td>
                      <td className="px-5 py-4 align-top font-medium text-slate-950">
                        <span className="block break-words leading-5">{attendeeName(item) || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-4 align-top text-slate-600">
                        <span className="block break-all leading-5">{attendeeEmail(item) || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-4 align-top text-slate-600">{attendeePhone(item) || 'N/A'}</td>
                      <td className="px-4 py-4 align-top text-slate-600">{attendeeIdentifier(item) || 'N/A'}</td>
                      <td className="px-4 py-4 align-top text-slate-600">{labelFor(attendeeCategoryLabels, item.category)}</td>
                      <td className="px-4 py-4 align-top text-slate-600">{labelFor(semesterLabels, item.semester)}</td>
                      <td className="px-4 py-4 align-top text-slate-600">{labelFor(careerLabels, item.career)}</td>
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
