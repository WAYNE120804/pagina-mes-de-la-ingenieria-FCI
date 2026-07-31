import { AuditAction, EventModality, EventStatus, Prisma } from '../../lib/prisma-client';
import { AppError } from '../../lib/app-error';
import { getPrisma } from '../../lib/prisma';
import { createAuditLog } from '../../utils/audit';
import { buildPaginationMeta, type PaginationParams } from '../../utils/pagination';
import { onlyActive, softDeleteData } from '../../utils/soft-delete';
import type {
  CreateEventInput,
  ListEventsQuery,
  ResponsibleInput,
  UpdateEventInput,
} from './event.schemas';

const eventInclude = {
  venue: true,
  parent: true,
  responsibles: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  },
  talk: {
    include: {
      speaker: true,
    },
  },
} satisfies Prisma.EventInclude;

const publicEventInclude = {
  venue: true,
  talk: {
    include: {
      speaker: {
        select: {
          id: true,
          fullName: true,
          company: true,
          bio: true,
          photoUrl: true,
        },
      },
    },
  },
} satisfies Prisma.EventInclude;

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

function buildPublicFormUrl(origin: string, eventTitle: string, fallbackSlug: string, mode: 'registration' | 'attendance') {
  const pathMode = mode === 'registration' ? 'inscripcion' : 'asistencia';
  const eventSlug = slugify(eventTitle) || fallbackSlug;

  return `${origin.replace(/\/$/, '')}/public/eventos/${eventSlug}/${pathMode}`;
}

function assertTransmissionLink(input: { modality?: EventModality | null; streamUrl?: string | null }) {
  if (input.modality && input.modality !== EventModality.PRESENTIAL && !input.streamUrl) {
    throw new AppError(
      'Los eventos híbridos o virtuales deben tener link de transmisión',
      400,
      'STREAM_URL_REQUIRED'
    );
  }
}

async function assertVenueAvailability(input: {
  venueId?: string | null;
  startsAt?: Date;
  endsAt?: Date;
  eventId?: string;
}) {
  if (!input.venueId || !input.startsAt || !input.endsAt) {
    return;
  }

  const prisma = requirePrisma();
  const conflict = await prisma.event.findFirst({
    where: {
      id: input.eventId ? { not: input.eventId } : undefined,
      venueId: input.venueId,
      deletedAt: null,
      status: { not: 'CANCELLED' },
      startsAt: { lt: input.endsAt },
      endsAt: { gt: input.startsAt },
    },
  });

  if (conflict) {
    throw new AppError(
      'El espacio ya tiene un evento programado en ese horario',
      409,
      'VENUE_SCHEDULE_CONFLICT'
    );
  }
}

export async function listEvents(query: ListEventsQuery, pagination: PaginationParams) {
  const prisma = requirePrisma();
  const where: Prisma.EventWhereInput = {
    ...onlyActive,
    type: query.type,
    status: query.status,
    OR: query.search
      ? [
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
          { slug: { contains: query.search, mode: 'insensitive' } },
        ]
      : undefined,
  };

  const [total, events] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      include: eventInclude,
      orderBy: { startsAt: 'asc' },
      skip: pagination.skip,
      take: pagination.take,
    }),
  ]);

  return {
    events,
    meta: buildPaginationMeta(total, pagination),
  };
}

export async function listPublicEvents(origin: string) {
  const prisma = requirePrisma();
  const events = await prisma.event.findMany({
    where: {
      ...onlyActive,
      status: { in: [EventStatus.PUBLISHED, EventStatus.FINISHED] },
    },
    include: publicEventInclude,
    orderBy: { startsAt: 'asc' },
  });

  return events.map((event) => ({
    ...event,
    registrationUrl: buildPublicFormUrl(origin, event.title, event.slug || event.id, 'registration'),
    attendanceUrl: buildPublicFormUrl(origin, event.title, event.slug || event.id, 'attendance'),
    attendanceOpensAt: new Date(event.startsAt.getTime() - 30 * 60 * 1000),
    attendanceClosesAt: new Date(event.endsAt.getTime() + 30 * 60 * 1000),
  }));
}

export async function getEventById(id: string) {
  const prisma = requirePrisma();
  const event = await prisma.event.findFirst({
    where: { id, ...onlyActive },
    include: eventInclude,
  });

  if (!event) {
    throw new AppError('Evento no encontrado', 404, 'EVENT_NOT_FOUND');
  }

  return event;
}

export async function createEvent(input: CreateEventInput, actorId?: string) {
  const prisma = requirePrisma();
  assertTransmissionLink(input);

  await assertVenueAvailability({
    venueId: input.venueId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
  });

  const event = await prisma.event.create({
    data: {
      parentId: input.parentId || null,
      venueId: input.venueId || null,
      title: input.title,
      slug: input.slug || `${slugify(input.title)}-${Date.now()}`,
      description: input.description || null,
      type: input.type,
      status: input.status,
      modality: input.modality,
      streamUrl: input.streamUrl || null,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      capacity: input.capacity || null,
    },
    include: eventInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.CREATE,
    entity: 'Event',
    entityId: event.id,
    newValues: { title: event.title, startsAt: event.startsAt.toISOString() },
  });

  return event;
}

export async function updateEvent(id: string, input: UpdateEventInput, actorId?: string) {
  const prisma = requirePrisma();
  const existingEvent = await getEventById(id);
  assertTransmissionLink({
    modality: input.modality === undefined ? existingEvent.modality : input.modality,
    streamUrl: input.streamUrl === undefined ? existingEvent.streamUrl : input.streamUrl,
  });
  const startsAt = input.startsAt || existingEvent.startsAt;
  const endsAt = input.endsAt || existingEvent.endsAt;
  const venueId = input.venueId === undefined ? existingEvent.venueId : input.venueId;

  if (endsAt <= startsAt) {
    throw new AppError(
      'La fecha de fin debe ser posterior a la fecha de inicio',
      400,
      'INVALID_EVENT_DATES'
    );
  }

  await assertVenueAvailability({ venueId, startsAt, endsAt, eventId: id });

  const event = await prisma.event.update({
    where: { id },
    data: {
      parentId: input.parentId === undefined ? undefined : input.parentId,
      venueId: input.venueId === undefined ? undefined : input.venueId,
      title: input.title,
      slug: input.slug,
      description: input.description === undefined ? undefined : input.description,
      type: input.type,
      status: input.status,
      modality: input.modality,
      streamUrl: input.streamUrl === undefined ? undefined : input.streamUrl,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      capacity: input.capacity === undefined ? undefined : input.capacity,
    },
    include: eventInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.UPDATE,
    entity: 'Event',
    entityId: event.id,
    oldValues: { title: existingEvent.title, startsAt: existingEvent.startsAt.toISOString() },
    newValues: { title: event.title, startsAt: event.startsAt.toISOString() },
  });

  return event;
}

export async function deleteEvent(id: string, actorId?: string) {
  const prisma = requirePrisma();
  const event = await getEventById(id);

  await prisma.event.update({
    where: { id },
    data: softDeleteData(),
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.DELETE,
    entity: 'Event',
    entityId: id,
    oldValues: { title: event.title },
  });
}

export async function addResponsible(eventId: string, input: ResponsibleInput, actorId?: string) {
  const prisma = requirePrisma();

  await getEventById(eventId);

  const responsible = await prisma.eventResponsible.upsert({
    where: {
      eventId_userId: {
        eventId,
        userId: input.userId,
      },
    },
    update: {
      roleNote: input.roleNote || null,
    },
    create: {
      eventId,
      userId: input.userId,
      roleNote: input.roleNote || null,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.UPDATE,
    entity: 'Event',
    entityId: eventId,
    newValues: { responsibleUserId: input.userId },
  });

  return responsible;
}
