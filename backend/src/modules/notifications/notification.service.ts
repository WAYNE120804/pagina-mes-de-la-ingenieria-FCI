import { AuditAction, NotificationChannel, NotificationStatus, Prisma } from '../../lib/prisma-client';
import ExcelJS from 'exceljs';
import { AppError } from '../../lib/app-error';
import { getPrisma } from '../../lib/prisma';
import { createAuditLog } from '../../utils/audit';
import { sendBulkEmailSafe } from '../../services/email.service';
import type { SendListEmailInput, SendNotificationInput } from './notification.schemas';

function requirePrisma() {
  const prisma = getPrisma();

  if (!prisma) {
    throw new AppError('Base de datos no configurada', 500, 'DATABASE_NOT_CONFIGURED');
  }

  return prisma;
}

function uniqueRecipients(recipients: Array<{ email?: string | null; name?: string | null }>) {
  const seen = new Set<string>();

  return recipients
    .map((recipient) => ({
      email: (recipient.email || '').trim().toLowerCase(),
      name: recipient.name || null,
    }))
    .filter((recipient) => {
      if (!recipient.email || seen.has(recipient.email)) {
        return false;
      }

      seen.add(recipient.email);
      return true;
    });
}

async function resolveEventRecipients(prisma: Prisma.TransactionClient, eventId: string, audience: SendNotificationInput['audience']) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, deletedAt: null },
    select: { id: true, title: true },
  });

  if (!event) {
    throw new AppError('Evento no encontrado', 404, 'EVENT_NOT_FOUND');
  }

  const attendance = await prisma.attendance.findMany({
    where: {
      eventId,
      deletedAt: null,
      status: audience === 'EVENT_CHECKED_IN' ? 'CHECKED_IN' : { in: ['REGISTERED', 'CHECKED_IN'] },
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return {
    targetName: event.title,
    recipients: uniqueRecipients(
      attendance.map((item) => ({
        email: item.user?.email || item.email,
        name: item.user?.name || item.fullName,
      }))
    ),
  };
}

async function resolveTournamentRecipients(prisma: Prisma.TransactionClient, tournamentId: string) {
  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, deletedAt: null },
    select: { id: true, name: true },
  });

  if (!tournament) {
    throw new AppError('Torneo no encontrado', 404, 'TOURNAMENT_NOT_FOUND');
  }

  const [participants, members] = await Promise.all([
    prisma.tournamentParticipant.findMany({
      where: { tournamentId, deletedAt: null },
      include: { user: { select: { name: true, email: true } } },
    }),
    (prisma.teamMember.findMany as any)({
      where: {
        team: { tournamentId, deletedAt: null },
      },
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  return {
    targetName: tournament.name,
    recipients: uniqueRecipients([
      ...participants.map((item) => ({
        email: item.user?.email || item.email,
        name: item.user?.name || item.displayName,
      })),
      ...(members as any[]).map((item) => ({
        email: item.user?.email || item.email,
        name: item.user?.name || item.fullName,
      })),
    ]),
  };
}

export async function listNotifications(limit = 50) {
  const prisma = requirePrisma();

  return prisma.notification.findMany({
    where: { deletedAt: null },
    include: {
      creator: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function sendNotification(input: SendNotificationInput, actorId?: string) {
  const prisma = requirePrisma();

  if (input.channel !== NotificationChannel.EMAIL) {
    throw new AppError('Por ahora el envío operativo está disponible por correo', 400, 'CHANNEL_NOT_SUPPORTED');
  }

  const resolved =
    input.targetType === 'EVENT'
      ? await resolveEventRecipients(prisma, input.targetId, input.audience)
      : await resolveTournamentRecipients(prisma, input.targetId);

  if (!resolved.recipients.length) {
    throw new AppError('No hay correos disponibles para esta audiencia', 400, 'NO_RECIPIENTS');
  }

  const notification = await prisma.notification.create({
    data: {
      creatorId: actorId || null,
      channel: input.channel,
      status: NotificationStatus.PENDING,
      title: input.title,
      body: input.body,
      payload: {
        targetType: input.targetType,
        targetId: input.targetId,
        targetName: resolved.targetName,
        audience: input.audience,
        recipients: resolved.recipients.length,
      },
    },
  });

  const result = await sendBulkEmailSafe({
    to: resolved.recipients,
    subject: input.title,
    text: `${input.body}\n\nActividad: ${resolved.targetName}`,
    html: `<p>${input.body.replace(/\n/g, '<br>')}</p><p><strong>Actividad:</strong> ${resolved.targetName}</p>`,
  });

  const status = result.sent > 0 ? NotificationStatus.SENT : NotificationStatus.FAILED;
  const updated = await prisma.notification.update({
    where: { id: notification.id },
    data: {
      status,
      sentAt: status === NotificationStatus.SENT ? new Date() : null,
      payload: {
        targetType: input.targetType,
        targetId: input.targetId,
        targetName: resolved.targetName,
        audience: input.audience,
        recipients: resolved.recipients.length,
        sent: result.sent,
      },
    },
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.CREATE,
    entity: 'Notification',
    entityId: updated.id,
    newValues: { title: input.title, sent: result.sent, audience: input.audience },
  });

  return updated;
}

async function buildEventAttendanceWorkbook(prisma: ReturnType<typeof requirePrisma>, eventId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, deletedAt: null },
    include: { venue: true },
  });

  if (!event) {
    throw new AppError('Evento no encontrado', 404, 'EVENT_NOT_FOUND');
  }

  const attendance = await prisma.attendance.findMany({
    where: { eventId, deletedAt: null },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Asistencia');
  sheet.columns = [
    { header: 'Nombre', key: 'name', width: 34 },
    { header: 'Correo', key: 'email', width: 34 },
    { header: 'Código/Cédula', key: 'identifier', width: 18 },
    { header: 'Cargo', key: 'category', width: 18 },
    { header: 'Semestre', key: 'semester', width: 16 },
    { header: 'Carrera', key: 'career', width: 30 },
    { header: 'Estado', key: 'status', width: 16 },
    { header: 'Ingreso', key: 'checkedInAt', width: 24 },
  ];

  attendance.forEach((item) => {
    sheet.addRow({
      name: item.user?.name || item.fullName || '',
      email: item.user?.email || item.email || '',
      identifier: item.user?.universityCode || item.identifier || '',
      category: item.category || '',
      semester: item.semester || '',
      career: item.career || '',
      status: item.status,
      checkedInAt: item.checkedInAt ? item.checkedInAt.toISOString() : '',
    });
  });

  return {
    targetName: event.title,
    filename: `asistencia-${event.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.xlsx`,
    buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
    summary: `Evento: ${event.title}\nLugar: ${event.venue?.name || 'Sin lugar'}\nInscritos/asistentes: ${attendance.length}`,
  };
}

async function buildTournamentWorkbook(prisma: ReturnType<typeof requirePrisma>, tournamentId: string) {
  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, deletedAt: null },
    include: { venue: true },
  });

  if (!tournament) {
    throw new AppError('Torneo no encontrado', 404, 'TOURNAMENT_NOT_FOUND');
  }

  const [teams, participants] = await Promise.all([
    (prisma.team.findMany as any)({
      where: { tournamentId, deletedAt: null },
      include: { members: { include: { user: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.tournamentParticipant.findMany({
      where: { tournamentId, deletedAt: null },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Inscripciones');
  sheet.columns = [
    { header: 'Equipo/Participante', key: 'team', width: 34 },
    { header: 'Nombre', key: 'name', width: 34 },
    { header: 'Correo', key: 'email', width: 34 },
    { header: 'Código/Cédula', key: 'identifier', width: 18 },
    { header: 'Capitan', key: 'captain', width: 12 },
    { header: 'Estado', key: 'status', width: 16 },
  ];

  (teams as any[]).forEach((team) => {
    (team.members || []).forEach((member: any) => {
      sheet.addRow({
        team: team.name,
        name: member.user?.name || member.fullName || '',
        email: member.user?.email || member.email || '',
        identifier: member.user?.universityCode || member.identifier || '',
        captain: member.isCaptain ? 'Si' : 'No',
        status: team.status,
      });
    });
  });

  participants.forEach((participant) => {
    sheet.addRow({
      team: participant.displayName,
      name: participant.user?.name || participant.displayName,
      email: participant.user?.email || participant.email || '',
      identifier: participant.user?.universityCode || participant.identifier || '',
      captain: 'No aplica',
      status: participant.status,
    });
  });

  return {
    targetName: tournament.name,
    filename: `inscritos-${tournament.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.xlsx`,
    buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
    summary: `Torneo: ${tournament.name}\nLugar: ${tournament.venue?.name || 'Sin lugar'}\nEquipos: ${teams.length}\nParticipantes individuales: ${participants.length}`,
  };
}

export async function sendListEmail(input: SendListEmailInput, actorId?: string) {
  const prisma = requirePrisma();
  const report =
    input.targetType === 'EVENT'
      ? await buildEventAttendanceWorkbook(prisma, input.targetId)
      : await buildTournamentWorkbook(prisma, input.targetId);

  const result = await sendBulkEmailSafe({
    to: input.recipients.map((email) => ({ email })),
    subject: input.subject,
    text: `${input.body}\n\n${report.summary}`,
    html: `<p>${input.body.replace(/\n/g, '<br>')}</p><pre>${report.summary}</pre>`,
    attachments: [
      {
        filename: report.filename,
        content: report.buffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    ],
  });

  const notification = await prisma.notification.create({
    data: {
      creatorId: actorId || null,
      channel: NotificationChannel.EMAIL,
      status: result.sent > 0 ? NotificationStatus.SENT : NotificationStatus.FAILED,
      title: input.subject,
      body: input.body,
      sentAt: result.sent > 0 ? new Date() : null,
      payload: {
        targetType: input.targetType,
        targetId: input.targetId,
        targetName: report.targetName,
        recipients: input.recipients.length,
        sent: result.sent,
        attachment: report.filename,
      },
    },
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.CREATE,
    entity: 'Notification',
    entityId: notification.id,
    newValues: { listSent: true, targetType: input.targetType, targetName: report.targetName, sent: result.sent },
  });

  return notification;
}
