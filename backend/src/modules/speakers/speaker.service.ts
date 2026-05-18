import { AuditAction, Prisma } from '../../lib/prisma-client';
import { AppError } from '../../lib/app-error';
import { getPrisma } from '../../lib/prisma';
import { createAuditLog } from '../../utils/audit';
import { buildPaginationMeta, type PaginationParams } from '../../utils/pagination';
import { onlyActive, softDeleteData } from '../../utils/soft-delete';
import type {
  CreateSpeakerInput,
  ListSpeakersQuery,
  UpdateSpeakerInput,
} from './speaker.schemas';

function requirePrisma() {
  const prisma = getPrisma();

  if (!prisma) {
    throw new AppError('Base de datos no configurada', 500, 'DATABASE_NOT_CONFIGURED');
  }

  return prisma;
}

export async function listSpeakers(query: ListSpeakersQuery, pagination: PaginationParams) {
  const prisma = requirePrisma();
  const where: Prisma.SpeakerProfileWhereInput = {
    ...onlyActive,
    OR: query.search
      ? [
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { company: { contains: query.search, mode: 'insensitive' } },
        ]
      : undefined,
  };

  const [total, speakers] = await Promise.all([
    prisma.speakerProfile.count({ where }),
    prisma.speakerProfile.findMany({
      where,
      orderBy: { fullName: 'asc' },
      skip: pagination.skip,
      take: pagination.take,
    }),
  ]);

  return {
    speakers,
    meta: buildPaginationMeta(total, pagination),
  };
}

export async function getSpeakerById(id: string) {
  const prisma = requirePrisma();
  const speaker = await prisma.speakerProfile.findFirst({
    where: { id, ...onlyActive },
  });

  if (!speaker) {
    throw new AppError('Ponente no encontrado', 404, 'SPEAKER_NOT_FOUND');
  }

  return speaker;
}

export async function createSpeaker(input: CreateSpeakerInput, actorId?: string) {
  const prisma = requirePrisma();
  const speaker = await prisma.speakerProfile.create({
    data: {
      userId: input.userId || null,
      fullName: input.fullName,
      email: input.email || null,
      company: input.company || null,
      bio: input.bio || null,
      photoUrl: input.photoUrl || null,
    },
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.CREATE,
    entity: 'SpeakerProfile',
    entityId: speaker.id,
    newValues: { fullName: speaker.fullName, email: speaker.email },
  });

  return speaker;
}

export async function updateSpeaker(id: string, input: UpdateSpeakerInput, actorId?: string) {
  const prisma = requirePrisma();
  const existingSpeaker = await getSpeakerById(id);
  const speaker = await prisma.speakerProfile.update({
    where: { id },
    data: {
      userId: input.userId === undefined ? undefined : input.userId,
      fullName: input.fullName,
      email: input.email === undefined ? undefined : input.email,
      company: input.company === undefined ? undefined : input.company,
      bio: input.bio === undefined ? undefined : input.bio,
      photoUrl: input.photoUrl === undefined ? undefined : input.photoUrl,
    },
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.UPDATE,
    entity: 'SpeakerProfile',
    entityId: speaker.id,
    oldValues: { fullName: existingSpeaker.fullName, email: existingSpeaker.email },
    newValues: { fullName: speaker.fullName, email: speaker.email },
  });

  return speaker;
}

export async function deleteSpeaker(id: string, actorId?: string) {
  const prisma = requirePrisma();
  const speaker = await getSpeakerById(id);

  await prisma.speakerProfile.update({
    where: { id },
    data: softDeleteData(),
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.DELETE,
    entity: 'SpeakerProfile',
    entityId: id,
    oldValues: { fullName: speaker.fullName },
  });
}
