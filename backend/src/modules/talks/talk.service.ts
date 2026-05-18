import { AuditAction, EventType, Prisma } from '../../lib/prisma-client';
import { AppError } from '../../lib/app-error';
import { getPrisma } from '../../lib/prisma';
import { createAuditLog } from '../../utils/audit';
import { buildPaginationMeta, type PaginationParams } from '../../utils/pagination';
import { onlyActive, softDeleteData } from '../../utils/soft-delete';
import type { CreateTalkInput, ListTalksQuery, UpdateTalkInput } from './talk.schemas';

const talkInclude = {
  event: {
    include: {
      venue: true,
    },
  },
  speaker: true,
} satisfies Prisma.TalkInclude;

function requirePrisma() {
  const prisma = getPrisma();

  if (!prisma) {
    throw new AppError('Base de datos no configurada', 500, 'DATABASE_NOT_CONFIGURED');
  }

  return prisma;
}

async function assertTalkEvent(eventId: string) {
  const prisma = requirePrisma();
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      deletedAt: null,
    },
  });

  if (!event) {
    throw new AppError('Evento no encontrado', 404, 'EVENT_NOT_FOUND');
  }

  if (event.type !== EventType.TALK && event.type !== EventType.ACADEMIC && event.type !== EventType.WORKSHOP) {
    throw new AppError(
      'El evento debe ser de tipo TALK, ACADEMIC o WORKSHOP para crear una charla o taller',
      400,
      'INVALID_TALK_EVENT'
    );
  }
}

export async function listTalks(query: ListTalksQuery, pagination: PaginationParams) {
  const prisma = requirePrisma();
  const where: Prisma.TalkWhereInput = {
    ...onlyActive,
    OR: query.search
      ? [
          { topic: { contains: query.search, mode: 'insensitive' } },
          { event: { title: { contains: query.search, mode: 'insensitive' } } },
          { speaker: { fullName: { contains: query.search, mode: 'insensitive' } } },
        ]
      : undefined,
  };

  const [total, talks] = await Promise.all([
    prisma.talk.count({ where }),
    prisma.talk.findMany({
      where,
      include: talkInclude,
      orderBy: { event: { startsAt: 'asc' } },
      skip: pagination.skip,
      take: pagination.take,
    }),
  ]);

  return {
    talks,
    meta: buildPaginationMeta(total, pagination),
  };
}

export async function getTalkById(id: string) {
  const prisma = requirePrisma();
  const talk = await prisma.talk.findFirst({
    where: { id, ...onlyActive },
    include: talkInclude,
  });

  if (!talk) {
    throw new AppError('Charla no encontrada', 404, 'TALK_NOT_FOUND');
  }

  return talk;
}

export async function createTalk(input: CreateTalkInput, actorId?: string) {
  const prisma = requirePrisma();

  await assertTalkEvent(input.eventId);

  const talk = await prisma.talk.create({
    data: {
      eventId: input.eventId,
      speakerId: input.speakerId || null,
      topic: input.topic,
      qrSecret: input.qrSecret || null,
    },
    include: talkInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.CREATE,
    entity: 'Talk',
    entityId: talk.id,
    newValues: { topic: talk.topic, eventId: talk.eventId },
  });

  return talk;
}

export async function updateTalk(id: string, input: UpdateTalkInput, actorId?: string) {
  const prisma = requirePrisma();
  const existingTalk = await getTalkById(id);

  if (input.eventId) {
    await assertTalkEvent(input.eventId);
  }

  const talk = await prisma.talk.update({
    where: { id },
    data: {
      eventId: input.eventId,
      speakerId: input.speakerId === undefined ? undefined : input.speakerId,
      topic: input.topic,
      qrSecret: input.qrSecret === undefined ? undefined : input.qrSecret,
    },
    include: talkInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.UPDATE,
    entity: 'Talk',
    entityId: talk.id,
    oldValues: { topic: existingTalk.topic },
    newValues: { topic: talk.topic },
  });

  return talk;
}

export async function deleteTalk(id: string, actorId?: string) {
  const prisma = requirePrisma();
  const talk = await getTalkById(id);

  await prisma.talk.update({
    where: { id },
    data: softDeleteData(),
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.DELETE,
    entity: 'Talk',
    entityId: id,
    oldValues: { topic: talk.topic },
  });
}
