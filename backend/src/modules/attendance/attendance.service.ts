import crypto from 'node:crypto';

import QRCode from 'qrcode';

import { AttendanceMethod, AttendanceStatus, AuditAction, EventType, Prisma } from '../../lib/prisma-client';
import { AppError } from '../../lib/app-error';
import { getPrisma } from '../../lib/prisma';
import { createAuditLog } from '../../utils/audit';
import { buildPaginationMeta, type PaginationParams } from '../../utils/pagination';
import { onlyActive } from '../../utils/soft-delete';
import { sendEmailSafe } from '../../services/email.service';
import type {
  CreateAttendanceInput,
  ListAttendanceQuery,
  PublicAttendanceInput,
  PublicCheckInInput,
  ScanAttendanceInput,
  UpdateAttendanceInput,
} from './attendance.schemas';

const attendanceInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      universityCode: true,
    },
  },
  scanner: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.AttendanceInclude;

function requirePrisma() {
  const prisma = getPrisma();

  if (!prisma) {
    throw new AppError('Base de datos no configurada', 500, 'DATABASE_NOT_CONFIGURED');
  }

  return prisma;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function formatEventDate(event: Awaited<ReturnType<typeof getActiveEvent>>) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(event.startsAt);
}

function attendanceEmail(attendance: Prisma.AttendanceGetPayload<{ include: typeof attendanceInclude }>) {
  return attendance.user?.email || attendance.email || '';
}

function attendanceName(attendance: Prisma.AttendanceGetPayload<{ include: typeof attendanceInclude }>) {
  return attendance.user?.name || attendance.fullName || 'Asistente';
}

function sendEventRegistrationEmail(
  event: Awaited<ReturnType<typeof getActiveEvent>>,
  attendance: Prisma.AttendanceGetPayload<{ include: typeof attendanceInclude }>
) {
  const email = attendanceEmail(attendance);

  if (!email) {
    return;
  }

  void sendEmailSafe({
    to: { email, name: attendanceName(attendance) },
    subject: `Confirmacion de inscripción - ${event.title}`,
    text: [
      `Hola ${attendanceName(attendance)},`,
      '',
      `Tu inscripción al evento "${event.title}" fue registrada correctamente.`,
      `Fecha y hora: ${formatEventDate(event)}`,
      '',
      'Conserva este correo como soporte de tu registro.',
    ].join('\n'),
    html: `<p>Hola ${attendanceName(attendance)},</p><p>Tu inscripción al evento <strong>${event.title}</strong> fue registrada correctamente.</p><p><strong>Fecha y hora:</strong> ${formatEventDate(event)}</p><p>Conserva este correo como soporte de tu registro.</p>`,
  });
}

function sendEventCheckInEmail(
  event: Awaited<ReturnType<typeof getActiveEvent>>,
  attendance: Prisma.AttendanceGetPayload<{ include: typeof attendanceInclude }>
) {
  const email = attendanceEmail(attendance);

  if (!email) {
    return;
  }

  void sendEmailSafe({
    to: { email, name: attendanceName(attendance) },
    subject: `Asistencia confirmada - ${event.title}`,
    text: [
      `Hola ${attendanceName(attendance)},`,
      '',
      `Tu asistencia al evento "${event.title}" fue registrada correctamente.`,
      `Fecha y hora del evento: ${formatEventDate(event)}`,
      attendance.checkedInAt ? `Registro de asistencia: ${formatEventDate({ ...event, startsAt: attendance.checkedInAt } as any)}` : '',
      '',
      'Este correo sirve como soporte de asistencia.',
    ].filter(Boolean).join('\n'),
    html: `<p>Hola ${attendanceName(attendance)},</p><p>Tu asistencia al evento <strong>${event.title}</strong> fue registrada correctamente.</p><p><strong>Fecha y hora del evento:</strong> ${formatEventDate(event)}</p><p>Este correo sirve como soporte de asistencia.</p>`,
  });
}

async function getActiveEvent(eventId: string) {
  const prisma = requirePrisma();
  const normalizedEventId = slugify(eventId);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId);
  const directEvent = await prisma.event.findFirst({
    where: {
      OR: [
        isUuid ? { id: eventId } : undefined,
        { slug: eventId },
      ].filter(Boolean) as Prisma.EventWhereInput[],
      ...onlyActive,
    },
  });

  if (directEvent) {
    return directEvent;
  }

  const publicSlugEvent = await prisma.event.findFirst({
    where: {
      ...onlyActive,
      title: {
        equals: eventId.replace(/-/g, ' '),
        mode: 'insensitive',
      },
    },
  });

  const event = publicSlugEvent || (await prisma.event.findMany({ where: onlyActive }))
    .find((item) => slugify(item.title) === normalizedEventId);

  if (!event) {
    throw new AppError('Evento no encontrado', 404, 'EVENT_NOT_FOUND');
  }

  return event;
}

async function assertCapacity(eventId: string, capacity?: number | null) {
  if (!capacity) {
    return;
  }

  const prisma = requirePrisma();
  const currentCount = await prisma.attendance.count({
    where: {
      eventId,
      deletedAt: null,
      status: { in: [AttendanceStatus.REGISTERED, AttendanceStatus.CHECKED_IN] },
    },
  });

  if (currentCount >= capacity) {
    throw new AppError('El evento ya alcanzo su capacidad maxima', 409, 'EVENT_CAPACITY_FULL');
  }
}

async function assertNoDuplicate(eventId: string, input: CreateAttendanceInput) {
  const prisma = requirePrisma();

  if (input.userId) {
    const existingByUser = await prisma.attendance.findFirst({
      where: {
        eventId,
        userId: input.userId,
        deletedAt: null,
      },
    });

    if (existingByUser) {
      throw new AppError('El usuario ya tiene asistencia registrada', 409, 'ATTENDANCE_DUPLICATED');
    }
  }

  if (input.email) {
    const existingByEmail = await prisma.attendance.findFirst({
      where: {
        eventId,
        email: input.email,
        deletedAt: null,
      },
    });

    if (existingByEmail) {
      throw new AppError('El correo ya tiene asistencia registrada', 409, 'ATTENDANCE_DUPLICATED');
    }
  }

  if (input.identifier) {
    const existingByIdentifier = await prisma.attendance.findFirst({
      where: {
        eventId,
        identifier: input.identifier,
        deletedAt: null,
      },
    });

    if (existingByIdentifier) {
      throw new AppError('El código o cédula ya tiene registro en este evento', 409, 'ATTENDANCE_DUPLICATED');
    }
  }
}

function createQrToken(eventId: string) {
  return `att:${eventId}:${crypto.randomBytes(24).toString('hex')}`;
}

function createTempCode() {
  return String(crypto.randomInt(100000, 999999));
}

export async function listAttendance(
  eventId: string,
  query: ListAttendanceQuery,
  pagination: PaginationParams
) {
  const prisma = requirePrisma();

  const event = await getActiveEvent(eventId);

  const where: Prisma.AttendanceWhereInput = {
    eventId,
    ...onlyActive,
    status: query.status,
  };

  const [total, attendance] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      include: attendanceInclude,
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
    }),
  ]);

  return {
    attendance,
    meta: buildPaginationMeta(total, pagination),
  };
}

export async function createAttendance(
  eventId: string,
  input: CreateAttendanceInput,
  actorId?: string
) {
  const prisma = requirePrisma();
  const event = await getActiveEvent(eventId);

  await assertCapacity(eventId, event.capacity);
  await assertNoDuplicate(eventId, input);

  const attendance = await prisma.attendance.create({
    data: {
      eventId,
      userId: input.userId || null,
      scannerId: actorId || null,
      fullName: input.fullName || null,
      email: input.email || null,
      identifier: input.identifier || null,
      category: input.category || null,
      semester: input.semester || null,
      career: input.career || null,
      method: input.method,
      status: input.status,
      tempCode: input.tempCode || null,
      checkedInAt: input.status === AttendanceStatus.CHECKED_IN ? new Date() : null,
    },
    include: attendanceInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.CREATE,
    entity: 'Attendance',
    entityId: attendance.id,
    newValues: { eventId, userId: input.userId, email: input.email },
  });

  if (attendance.status === AttendanceStatus.CHECKED_IN) {
    sendEventCheckInEmail(event, attendance);
  } else {
    sendEventRegistrationEmail(event, attendance);
  }

  return attendance;
}

export async function preregisterAttendance(
  eventId: string,
  input: CreateAttendanceInput,
  actorId?: string
) {
  const prisma = requirePrisma();
  const event = await getActiveEvent(eventId);

  await assertCapacity(eventId, event.capacity);
  await assertNoDuplicate(eventId, input);

  const attendance = await prisma.attendance.create({
    data: {
      eventId,
      userId: input.userId || null,
      scannerId: null,
      fullName: input.fullName || null,
      email: input.email || null,
      identifier: input.identifier || null,
      category: input.category || null,
      semester: input.semester || null,
      career: input.career || null,
      method: AttendanceMethod.QR,
      status: AttendanceStatus.REGISTERED,
      qrCode: createQrToken(eventId),
      tempCode: createTempCode(),
      checkedInAt: null,
    },
    include: attendanceInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.CREATE,
    entity: 'Attendance',
    entityId: attendance.id,
    newValues: { eventId, userId: input.userId, email: input.email, method: AttendanceMethod.QR },
  });

  sendEventRegistrationEmail(event, attendance);

  return attendance;
}

export async function scanAttendance(
  eventId: string,
  input: ScanAttendanceInput,
  actorId?: string
) {
  const prisma = requirePrisma();

  const event = await getActiveEvent(eventId);

  const codeFilters: Prisma.AttendanceWhereInput[] = [];

  if (input.qrCode) {
    codeFilters.push({ qrCode: input.qrCode });
  }

  if (input.tempCode) {
    codeFilters.push({ tempCode: input.tempCode });
  }

  const attendance = await prisma.attendance.findFirst({
    where: {
      eventId,
      deletedAt: null,
      OR: codeFilters,
    },
  });

  if (!attendance) {
    throw new AppError('Código de asistencia inválido', 404, 'ATTENDANCE_CODE_NOT_FOUND');
  }

  if (attendance.status === AttendanceStatus.CANCELLED) {
    throw new AppError('La asistencia esta cancelada', 409, 'ATTENDANCE_CANCELLED');
  }

  const updatedAttendance = await prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      scannerId: actorId || null,
      status: AttendanceStatus.CHECKED_IN,
      checkedInAt: attendance.checkedInAt || new Date(),
    },
    include: attendanceInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.UPDATE,
    entity: 'Attendance',
    entityId: attendance.id,
    oldValues: { status: attendance.status },
    newValues: { status: updatedAttendance.status, scanned: true },
  });

  sendEventCheckInEmail(event, updatedAttendance);

  return updatedAttendance;
}

export async function getAttendanceStats(eventId: string) {
  const prisma = requirePrisma();
  const event = await getActiveEvent(eventId);
  const [registered, checkedIn, cancelled, total] = await Promise.all([
    prisma.attendance.count({
      where: { eventId, deletedAt: null, status: AttendanceStatus.REGISTERED },
    }),
    prisma.attendance.count({
      where: { eventId, deletedAt: null, status: AttendanceStatus.CHECKED_IN },
    }),
    prisma.attendance.count({
      where: { eventId, deletedAt: null, status: AttendanceStatus.CANCELLED },
    }),
    prisma.attendance.count({
      where: { eventId, deletedAt: null },
    }),
  ]);
  const activeTotal = registered + checkedIn;
  const capacity = event.capacity || null;

  return {
    eventId,
    capacity,
    total,
    registered,
    checkedIn,
    cancelled,
    activeTotal,
    available: capacity === null ? null : Math.max(capacity - activeTotal, 0),
    checkInRate: activeTotal === 0 ? 0 : Math.round((checkedIn / activeTotal) * 100),
  };
}

export async function getAttendanceQrSvg(id: string) {
  const prisma = requirePrisma();
  const attendance = await prisma.attendance.findFirst({
    where: { id, ...onlyActive },
  });

  if (!attendance?.qrCode) {
    throw new AppError('QR no encontrado para esta asistencia', 404, 'QR_NOT_FOUND');
  }

  return QRCode.toString(attendance.qrCode, {
    type: 'svg',
    margin: 1,
    width: 256,
    errorCorrectionLevel: 'M',
  });
}

function assertPublicEventType(event: Awaited<ReturnType<typeof getActiveEvent>>) {
  const publicTypes: EventType[] = [EventType.TALK, EventType.ACADEMIC, EventType.WORKSHOP];

  if (!publicTypes.includes(event.type)) {
    throw new AppError('Este formulario solo está disponible para charlas y talleres', 400, 'INVALID_PUBLIC_EVENT');
  }
}

function assertWorkshopEvent(event: Awaited<ReturnType<typeof getActiveEvent>>) {
  if (event.type !== EventType.WORKSHOP) {
    throw new AppError('La inscripción previa solo aplica para talleres', 400, 'INVALID_WORKSHOP_REGISTRATION');
  }
}

function assertAttendanceWindow(event: Awaited<ReturnType<typeof getActiveEvent>>) {
  const now = new Date().getTime();
  const opensAt = event.startsAt.getTime() - 30 * 60 * 1000;
  const closesAt = event.endsAt.getTime() + 30 * 60 * 1000;

  if (now < opensAt || now > closesAt) {
    throw new AppError(
      'El formulario de asistencia no está disponible fuera del rango permitido',
      409,
      'ATTENDANCE_WINDOW_CLOSED'
    );
  }
}

function buildPublicFormUrl(origin: string, eventTitle: string, fallbackSlug: string, mode: 'registration' | 'attendance') {
  const pathMode = mode === 'registration' ? 'inscripcion' : 'asistencia';
  const eventSlug = slugify(eventTitle) || fallbackSlug;

  return `${origin.replace(/\/$/, '')}/public/eventos/${eventSlug}/${pathMode}`;
}

export async function getPublicEventForm(
  eventId: string,
  mode: 'registration' | 'attendance',
  origin: string
) {
  const event = await getActiveEvent(eventId);
  assertPublicEventType(event);

  if (mode === 'registration') {
    assertWorkshopEvent(event);
  }

  return {
    event: {
      id: event.id,
      title: event.title,
      type: event.type,
      status: event.status,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      capacity: event.capacity,
    },
    mode,
    url: buildPublicFormUrl(origin, event.title, event.slug || event.id, mode),
    attendanceOpensAt: new Date(event.startsAt.getTime() - 30 * 60 * 1000),
    attendanceClosesAt: new Date(event.endsAt.getTime() + 30 * 60 * 1000),
  };
}

export async function getPublicFormQrSvg(
  eventId: string,
  mode: 'registration' | 'attendance',
  origin: string
) {
  const form = await getPublicEventForm(eventId, mode, origin);

  return QRCode.toString(form.url, {
    type: 'svg',
    margin: 1,
    width: 256,
    errorCorrectionLevel: 'M',
  });
}

export async function publicRegisterAttendance(eventId: string, input: PublicAttendanceInput) {
  const prisma = requirePrisma();
  const event = await getActiveEvent(eventId);
  const resolvedEventId = event.id;

  assertWorkshopEvent(event);
  await assertCapacity(resolvedEventId, event.capacity);
  await assertNoDuplicate(resolvedEventId, {
    ...input,
    method: AttendanceMethod.QR,
    status: AttendanceStatus.REGISTERED,
  });

  const attendance = await prisma.attendance.create({
    data: {
      eventId: resolvedEventId,
      fullName: input.fullName,
      email: input.email || null,
      identifier: input.identifier,
      category: input.category,
      semester: input.semester,
      career: input.career,
      method: AttendanceMethod.QR,
      status: AttendanceStatus.REGISTERED,
      qrCode: createQrToken(resolvedEventId),
      tempCode: createTempCode(),
    },
    include: attendanceInclude,
  });

  await createAuditLog({
    prisma,
    action: AuditAction.CREATE,
    entity: 'Attendance',
    entityId: attendance.id,
    newValues: { eventId: resolvedEventId, identifier: input.identifier, publicRegistration: true },
  });

  sendEventRegistrationEmail(event, attendance);

  return attendance;
}

export async function publicCheckInAttendance(eventId: string, input: PublicCheckInInput) {
  const prisma = requirePrisma();
  const event = await getActiveEvent(eventId);
  const resolvedEventId = event.id;

  assertPublicEventType(event);
  assertAttendanceWindow(event);

  const existingAttendance = await prisma.attendance.findFirst({
    where: {
      eventId: resolvedEventId,
      deletedAt: null,
      OR: [
        { identifier: input.identifier },
        input.email ? { email: input.email } : undefined,
      ].filter(Boolean) as Prisma.AttendanceWhereInput[],
    },
  });

  if (existingAttendance) {
    const attendance = await prisma.attendance.update({
      where: { id: existingAttendance.id },
      data: {
        fullName: input.fullName || existingAttendance.fullName,
        email: input.email === undefined ? existingAttendance.email : input.email,
        category: input.category || existingAttendance.category,
        semester: input.semester || existingAttendance.semester,
        career: input.career || existingAttendance.career,
        status: AttendanceStatus.CHECKED_IN,
        checkedInAt: existingAttendance.checkedInAt || new Date(),
      },
      include: attendanceInclude,
    });

    await createAuditLog({
      prisma,
      action: AuditAction.UPDATE,
      entity: 'Attendance',
      entityId: attendance.id,
      oldValues: { status: existingAttendance.status },
      newValues: { status: attendance.status, publicCheckIn: true },
    });

    sendEventCheckInEmail(event, attendance);

    return attendance;
  }

  if (!input.fullName || !input.category) {
    throw new AppError(
      'Debes completar nombre y cargo para registrar la asistencia',
      400,
      'PUBLIC_ATTENDANCE_REQUIRED_FIELDS'
    );
  }

  await assertCapacity(resolvedEventId, event.capacity);

  const attendance = await prisma.attendance.create({
    data: {
      eventId: resolvedEventId,
      fullName: input.fullName,
      email: input.email || null,
      identifier: input.identifier,
      category: input.category,
      semester: input.semester || null,
      career: input.career || null,
      method: AttendanceMethod.QR,
      status: AttendanceStatus.CHECKED_IN,
      checkedInAt: new Date(),
      qrCode: createQrToken(resolvedEventId),
      tempCode: createTempCode(),
    },
    include: attendanceInclude,
  });

  await createAuditLog({
    prisma,
    action: AuditAction.CREATE,
    entity: 'Attendance',
    entityId: attendance.id,
    newValues: { eventId: resolvedEventId, identifier: input.identifier, publicCheckIn: true },
  });

  sendEventCheckInEmail(event, attendance);

  return attendance;
}

export async function getAttendanceCertificateHtml(id: string) {
  const prisma = requirePrisma();
  const attendance = await prisma.attendance.findFirst({
    where: { id, ...onlyActive },
    include: {
      event: {
        include: {
          venue: true,
        },
      },
      user: {
        select: {
          name: true,
          email: true,
          universityCode: true,
        },
      },
    },
  });

  if (!attendance) {
    throw new AppError('Asistencia no encontrada', 404, 'ATTENDANCE_NOT_FOUND');
  }

  if (attendance.status !== AttendanceStatus.CHECKED_IN) {
    throw new AppError(
      'Solo se puede generar certificado para asistencias confirmadas',
      409,
      'CERTIFICATE_NOT_AVAILABLE'
    );
  }

  const attendeeName = attendance.user?.name || attendance.fullName || 'Asistente';
  const attendeeEmail = attendance.user?.email || attendance.email || '';
  const eventDate = attendance.event.startsAt.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Certificado - ${attendance.event.title}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
      .toolbar { width: 900px; margin: 24px auto 0; display: flex; justify-content: flex-end; gap: 10px; }
      .button { border: 1px solid #cbd5e1; background: #0f172a; color: white; border-radius: 8px; padding: 10px 16px; font-weight: 700; cursor: pointer; }
      .button.secondary { background: white; color: #0f172a; }
      .page { width: 900px; min-height: 620px; margin: 40px auto; background: white; border: 10px solid #0f172a; padding: 56px; box-sizing: border-box; }
      .eyebrow { text-transform: uppercase; letter-spacing: 0.16em; color: #64748b; font-size: 13px; font-weight: 700; }
      h1 { margin: 24px 0 8px; font-size: 44px; letter-spacing: 0; }
      .name { margin: 36px 0 12px; font-size: 34px; font-weight: 700; color: #0369a1; }
      .text { font-size: 18px; line-height: 1.7; color: #334155; }
      .footer { margin-top: 56px; display: flex; justify-content: space-between; font-size: 14px; color: #475569; }
      @media print { body { background: white; } .toolbar { display: none; } .page { margin: 0 auto; border-color: #0f172a; } }
    </style>
  </head>
  <body>
    <div class="toolbar">
      <button class="button secondary" type="button" onclick="window.close()">Cerrar</button>
      <button class="button" type="button" onclick="window.print()">Descargar PDF</button>
    </div>
    <main class="page">
      <div class="eyebrow">Semana de Ingeniería</div>
      <h1>Certificado de asistencia</h1>
      <p class="text">La plataforma certifica que:</p>
      <div class="name">${attendeeName}</div>
      <p class="text">${attendeeEmail}</p>
      <p class="text">asistio al evento <strong>${attendance.event.title}</strong>, realizado el ${eventDate}${attendance.event.venue ? ` en ${attendance.event.venue.name}` : ''}.</p>
      <div class="footer">
        <span>Código: ${attendance.id}</span>
        <span>Generado automáticamente</span>
      </div>
    </main>
  </body>
</html>`;
}

export async function updateAttendanceStatus(
  id: string,
  input: UpdateAttendanceInput,
  actorId?: string
) {
  const prisma = requirePrisma();
  const existingAttendance = await prisma.attendance.findFirst({
    where: { id, ...onlyActive },
  });

  if (!existingAttendance) {
    throw new AppError('Asistencia no encontrada', 404, 'ATTENDANCE_NOT_FOUND');
  }

  const attendance = await prisma.attendance.update({
    where: { id },
    data: {
      status: input.status,
      checkedInAt:
        input.status === AttendanceStatus.CHECKED_IN
          ? existingAttendance.checkedInAt || new Date()
          : existingAttendance.checkedInAt,
    },
    include: attendanceInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.UPDATE,
    entity: 'Attendance',
    entityId: id,
    oldValues: { status: existingAttendance.status },
    newValues: { status: attendance.status },
  });

  return attendance;
}
