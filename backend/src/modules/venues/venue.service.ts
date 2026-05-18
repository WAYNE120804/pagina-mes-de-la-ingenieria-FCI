import { AuditAction, Prisma } from '../../lib/prisma-client';
import { AppError } from '../../lib/app-error';
import { getPrisma } from '../../lib/prisma';
import { createAuditLog } from '../../utils/audit';
import { buildPaginationMeta, type PaginationParams } from '../../utils/pagination';
import { onlyActive, softDeleteData } from '../../utils/soft-delete';
import type { CreateVenueInput, ListVenuesQuery, UpdateVenueInput } from './venue.schemas';

function requirePrisma() {
  const prisma = getPrisma();

  if (!prisma) {
    throw new AppError('Base de datos no configurada', 500, 'DATABASE_NOT_CONFIGURED');
  }

  return prisma;
}

export async function listVenues(query: ListVenuesQuery, pagination: PaginationParams) {
  const prisma = requirePrisma();
  const where: Prisma.VenueWhereInput = {
    ...onlyActive,
    isActive: query.isActive,
    OR: query.search
      ? [
          { name: { contains: query.search, mode: 'insensitive' } },
          { location: { contains: query.search, mode: 'insensitive' } },
        ]
      : undefined,
  };

  const [total, venues] = await Promise.all([
    prisma.venue.count({ where }),
    prisma.venue.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: pagination.skip,
      take: pagination.take,
    }),
  ]);

  return {
    venues,
    meta: buildPaginationMeta(total, pagination),
  };
}

export async function getVenueById(id: string) {
  const prisma = requirePrisma();
  const venue = await prisma.venue.findFirst({
    where: { id, ...onlyActive },
  });

  if (!venue) {
    throw new AppError('Espacio no encontrado', 404, 'VENUE_NOT_FOUND');
  }

  return venue;
}

export async function createVenue(input: CreateVenueInput, actorId?: string) {
  const prisma = requirePrisma();
  const venue = await prisma.venue.create({
    data: {
      name: input.name,
      location: input.location || null,
      photoUrl: input.photoUrl || null,
      capacity: input.capacity || null,
      isActive: input.isActive,
    },
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.CREATE,
    entity: 'Venue',
    entityId: venue.id,
    newValues: { name: venue.name, location: venue.location },
  });

  return venue;
}

export async function updateVenue(id: string, input: UpdateVenueInput, actorId?: string) {
  const prisma = requirePrisma();
  const existingVenue = await getVenueById(id);
  const venue = await prisma.venue.update({
    where: { id },
    data: {
      name: input.name,
      location: input.location === undefined ? undefined : input.location,
      photoUrl: input.photoUrl === undefined ? undefined : input.photoUrl,
      capacity: input.capacity === undefined ? undefined : input.capacity,
      isActive: input.isActive,
    },
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.UPDATE,
    entity: 'Venue',
    entityId: venue.id,
    oldValues: { name: existingVenue.name, location: existingVenue.location },
    newValues: { name: venue.name, location: venue.location },
  });

  return venue;
}

export async function deleteVenue(id: string, actorId?: string) {
  const prisma = requirePrisma();
  const venue = await getVenueById(id);

  await prisma.venue.update({
    where: { id },
    data: softDeleteData(),
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.DELETE,
    entity: 'Venue',
    entityId: id,
    oldValues: { name: venue.name, location: venue.location },
  });
}
