import { AuditAction, Prisma } from '../../lib/prisma-client';

import { AppError } from '../../lib/app-error';
import { getPrisma } from '../../lib/prisma';
import { createAuditLog } from '../../utils/audit';
import { buildPaginationMeta, type PaginationParams } from '../../utils/pagination';
import { onlyActive, softDeleteData } from '../../utils/soft-delete';
import type {
  CreateChallengeInput,
  CreateCompanyInput,
  CreateDeliverableInput,
  CreateHackathonEventInput,
  CreateHackathonTeamInput,
  ListCompaniesQuery,
  ListHackathonEventsQuery,
  UpdateChallengeInput,
  UpdateCompanyInput,
  UpdateDeliverableInput,
  UpdateHackathonEventInput,
  UpdateHackathonTeamInput,
} from './hackathon.schemas';

const userSelect = {
  id: true,
  name: true,
  email: true,
  universityCode: true,
  program: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
} satisfies Prisma.UserSelect;

const hackathonEventInclude = {
  event: true,
  _count: {
    select: {
      challenges: true,
      teams: true,
      rubricItems: true,
    },
  },
} satisfies Prisma.HackathonEventInclude;

const companyInclude = {
  _count: {
    select: {
      challenges: true,
    },
  },
} satisfies Prisma.CompanyInclude;

const challengeInclude = {
  company: true,
  _count: {
    select: {
      teams: true,
    },
  },
} satisfies Prisma.HackathonChallengeInclude;

const teamInclude = {
  challenge: {
    include: {
      company: true,
    },
  },
  leader: {
    select: userSelect,
  },
  members: {
    include: {
      user: {
        select: userSelect,
      },
    },
    orderBy: { createdAt: 'asc' },
  },
  _count: {
    select: {
      deliverables: true,
      evaluations: true,
    },
  },
} satisfies Prisma.HackathonTeamInclude;

const deliverableInclude = {
  hackathonTeam: {
    select: {
      id: true,
      name: true,
      hackathonEventId: true,
    },
  },
} satisfies Prisma.HackathonDeliverableInclude;

function requirePrisma() {
  const prisma = getPrisma();

  if (!prisma) {
    throw new AppError('Base de datos no configurada', 500, 'DATABASE_NOT_CONFIGURED');
  }

  return prisma;
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids));
}

export async function listHackathonEvents(
  query: ListHackathonEventsQuery,
  pagination: PaginationParams
) {
  const prisma = requirePrisma();
  const where: Prisma.HackathonEventWhereInput = {
    ...onlyActive,
    status: query.status,
    OR: query.search
      ? [
          { name: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ]
      : undefined,
  };

  const [total, hackathons] = await Promise.all([
    prisma.hackathonEvent.count({ where }),
    prisma.hackathonEvent.findMany({
      where,
      include: hackathonEventInclude,
      orderBy: [{ startsAt: 'asc' }, { createdAt: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
    }),
  ]);

  return {
    hackathons,
    meta: buildPaginationMeta(total, pagination),
  };
}

export async function getHackathonEventById(id: string) {
  const prisma = requirePrisma();
  const hackathon = await prisma.hackathonEvent.findFirst({
    where: { id, ...onlyActive },
    include: hackathonEventInclude,
  });

  if (!hackathon) {
    throw new AppError('Hackathon no encontrado', 404, 'HACKATHON_NOT_FOUND');
  }

  return hackathon;
}

export async function createHackathonEvent(input: CreateHackathonEventInput, actorId?: string) {
  const prisma = requirePrisma();
  const hackathon = await prisma.hackathonEvent.create({
    data: {
      eventId: input.eventId || null,
      name: input.name,
      status: input.status,
      description: input.description || null,
      startsAt: input.startsAt || null,
      endsAt: input.endsAt || null,
    },
    include: hackathonEventInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.CREATE,
    entity: 'HackathonEvent',
    entityId: hackathon.id,
    newValues: { name: hackathon.name, status: hackathon.status },
  });

  return hackathon;
}

export async function updateHackathonEvent(
  id: string,
  input: UpdateHackathonEventInput,
  actorId?: string
) {
  const prisma = requirePrisma();
  const existingHackathon = await getHackathonEventById(id);
  const hackathon = await prisma.hackathonEvent.update({
    where: { id },
    data: {
      eventId: input.eventId === undefined ? undefined : input.eventId,
      name: input.name,
      status: input.status,
      description: input.description === undefined ? undefined : input.description,
      startsAt: input.startsAt === undefined ? undefined : input.startsAt,
      endsAt: input.endsAt === undefined ? undefined : input.endsAt,
    },
    include: hackathonEventInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.UPDATE,
    entity: 'HackathonEvent',
    entityId: hackathon.id,
    oldValues: { name: existingHackathon.name, status: existingHackathon.status },
    newValues: { name: hackathon.name, status: hackathon.status },
  });

  return hackathon;
}

export async function deleteHackathonEvent(id: string, actorId?: string) {
  const prisma = requirePrisma();
  const hackathon = await getHackathonEventById(id);
  const deletedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.hackathonEvent.update({ where: { id }, data: softDeleteData(deletedAt) });
    await tx.hackathonChallenge.updateMany({
      where: { hackathonEventId: id, deletedAt: null },
      data: softDeleteData(deletedAt),
    });
    await tx.hackathonTeam.updateMany({
      where: { hackathonEventId: id, deletedAt: null },
      data: softDeleteData(deletedAt),
    });
    await tx.hackathonDeliverable.updateMany({
      where: {
        deletedAt: null,
        hackathonTeam: { hackathonEventId: id },
      },
      data: softDeleteData(deletedAt),
    });
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.DELETE,
    entity: 'HackathonEvent',
    entityId: id,
    oldValues: { name: hackathon.name, status: hackathon.status },
  });
}

export async function listCompanies(query: ListCompaniesQuery, pagination: PaginationParams) {
  const prisma = requirePrisma();
  const where: Prisma.CompanyWhereInput = {
    ...onlyActive,
    OR: query.search
      ? [
          { name: { contains: query.search, mode: 'insensitive' } },
          { contactName: { contains: query.search, mode: 'insensitive' } },
          { contactEmail: { contains: query.search, mode: 'insensitive' } },
        ]
      : undefined,
  };

  const [total, companies] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      include: companyInclude,
      orderBy: { name: 'asc' },
      skip: pagination.skip,
      take: pagination.take,
    }),
  ]);

  return {
    companies,
    meta: buildPaginationMeta(total, pagination),
  };
}

export async function getCompanyById(id: string) {
  const prisma = requirePrisma();
  const company = await prisma.company.findFirst({
    where: { id, ...onlyActive },
    include: companyInclude,
  });

  if (!company) {
    throw new AppError('Empresa no encontrada', 404, 'COMPANY_NOT_FOUND');
  }

  return company;
}

export async function createCompany(input: CreateCompanyInput, actorId?: string) {
  const prisma = requirePrisma();
  const company = await prisma.company.create({
    data: {
      name: input.name,
      contactName: input.contactName || null,
      contactEmail: input.contactEmail || null,
    },
    include: companyInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.CREATE,
    entity: 'Company',
    entityId: company.id,
    newValues: { name: company.name, contactEmail: company.contactEmail },
  });

  return company;
}

export async function updateCompany(id: string, input: UpdateCompanyInput, actorId?: string) {
  const prisma = requirePrisma();
  const existingCompany = await getCompanyById(id);
  const company = await prisma.company.update({
    where: { id },
    data: {
      name: input.name,
      contactName: input.contactName === undefined ? undefined : input.contactName,
      contactEmail: input.contactEmail === undefined ? undefined : input.contactEmail,
    },
    include: companyInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.UPDATE,
    entity: 'Company',
    entityId: company.id,
    oldValues: { name: existingCompany.name, contactEmail: existingCompany.contactEmail },
    newValues: { name: company.name, contactEmail: company.contactEmail },
  });

  return company;
}

export async function deleteCompany(id: string, actorId?: string) {
  const prisma = requirePrisma();
  const company = await getCompanyById(id);

  await prisma.company.update({
    where: { id },
    data: softDeleteData(),
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.DELETE,
    entity: 'Company',
    entityId: id,
    oldValues: { name: company.name },
  });
}

async function ensureCompanyExists(prisma: ReturnType<typeof requirePrisma>, companyId?: string | null) {
  if (!companyId) {
    return;
  }

  const company = await prisma.company.findFirst({ where: { id: companyId, deletedAt: null } });

  if (!company) {
    throw new AppError('Empresa no encontrada', 404, 'COMPANY_NOT_FOUND');
  }
}

async function getChallengeById(challengeId: string) {
  const prisma = requirePrisma();
  const challenge = await prisma.hackathonChallenge.findFirst({
    where: { id: challengeId, deletedAt: null },
    include: challengeInclude,
  });

  if (!challenge) {
    throw new AppError('Reto no encontrado', 404, 'CHALLENGE_NOT_FOUND');
  }

  return challenge;
}

async function ensureChallengeBelongsToHackathon(
  prisma: ReturnType<typeof requirePrisma>,
  hackathonEventId: string,
  challengeId?: string | null
) {
  if (!challengeId) {
    return;
  }

  const challenge = await prisma.hackathonChallenge.findFirst({
    where: { id: challengeId, hackathonEventId, deletedAt: null },
  });

  if (!challenge) {
    throw new AppError('El reto no pertenece a este hackathon', 400, 'CHALLENGE_NOT_IN_HACKATHON');
  }
}

export async function listChallenges(hackathonEventId: string) {
  const prisma = requirePrisma();
  await getHackathonEventById(hackathonEventId);

  return prisma.hackathonChallenge.findMany({
    where: { hackathonEventId, deletedAt: null },
    include: challengeInclude,
    orderBy: { createdAt: 'asc' },
  });
}

export async function createChallenge(
  hackathonEventId: string,
  input: CreateChallengeInput,
  actorId?: string
) {
  const prisma = requirePrisma();
  await getHackathonEventById(hackathonEventId);
  await ensureCompanyExists(prisma, input.companyId);

  const challenge = await prisma.hackathonChallenge.create({
    data: {
      hackathonEventId,
      companyId: input.companyId || null,
      title: input.title,
      description: input.description,
      requirements: input.requirements || null,
      suggestedTech: input.suggestedTech || null,
    },
    include: challengeInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.CREATE,
    entity: 'HackathonChallenge',
    entityId: challenge.id,
    newValues: { hackathonEventId, title: challenge.title, companyId: challenge.companyId },
  });

  return challenge;
}

export async function updateChallenge(challengeId: string, input: UpdateChallengeInput, actorId?: string) {
  const prisma = requirePrisma();
  const existingChallenge = await getChallengeById(challengeId);
  await ensureCompanyExists(prisma, input.companyId);

  const challenge = await prisma.hackathonChallenge.update({
    where: { id: challengeId },
    data: {
      companyId: input.companyId === undefined ? undefined : input.companyId,
      title: input.title,
      description: input.description,
      requirements: input.requirements === undefined ? undefined : input.requirements,
      suggestedTech: input.suggestedTech === undefined ? undefined : input.suggestedTech,
    },
    include: challengeInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.UPDATE,
    entity: 'HackathonChallenge',
    entityId: challenge.id,
    oldValues: { title: existingChallenge.title, companyId: existingChallenge.companyId },
    newValues: { title: challenge.title, companyId: challenge.companyId },
  });

  return challenge;
}

export async function deleteChallenge(challengeId: string, actorId?: string) {
  const prisma = requirePrisma();
  const challenge = await getChallengeById(challengeId);

  await prisma.$transaction(async (tx) => {
    await tx.hackathonTeam.updateMany({
      where: { challengeId, deletedAt: null },
      data: { challengeId: null },
    });
    await tx.hackathonChallenge.update({ where: { id: challengeId }, data: softDeleteData() });
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.DELETE,
    entity: 'HackathonChallenge',
    entityId: challengeId,
    oldValues: { title: challenge.title, hackathonEventId: challenge.hackathonEventId },
  });
}

async function ensureUsersExist(prisma: ReturnType<typeof requirePrisma>, userIds: string[]) {
  const ids = uniqueIds(userIds);
  const users = await prisma.user.findMany({
    where: { id: { in: ids }, deletedAt: null },
    select: userSelect,
  });

  if (users.length !== ids.length) {
    throw new AppError('Uno o mas integrantes no existen', 400, 'USER_NOT_FOUND');
  }

  return users;
}

async function ensureUsersAreAvailableForHackathon(
  prisma: ReturnType<typeof requirePrisma>,
  hackathonEventId: string,
  memberIds: string[],
  excludeTeamId?: string
) {
  const existingMembership = await prisma.hackathonTeamMember.findFirst({
    where: {
      userId: { in: memberIds },
      hackathonTeam: {
        hackathonEventId,
        deletedAt: null,
        id: excludeTeamId ? { not: excludeTeamId } : undefined,
      },
    },
    include: {
      user: true,
      hackathonTeam: true,
    },
  });

  if (existingMembership) {
    throw new AppError(
      `${existingMembership.user.name} ya esta inscrito en el equipo ${existingMembership.hackathonTeam.name}`,
      400,
      'USER_ALREADY_IN_HACKATHON_TEAM'
    );
  }
}

function resolveTeamMembers(input: {
  memberIds?: string[];
  leaderId?: string | null;
  fallbackMemberIds?: string[];
  fallbackLeaderId?: string | null;
}) {
  const memberIds = uniqueIds(input.memberIds || input.fallbackMemberIds || []);
  const leaderId =
    input.leaderId === undefined ? input.fallbackLeaderId || memberIds[0] : input.leaderId || memberIds[0];

  if (!memberIds.length) {
    throw new AppError('Debes seleccionar al menos un integrante', 400, 'TEAM_MEMBERS_REQUIRED');
  }

  if (input.memberIds && memberIds.length !== input.memberIds.length) {
    throw new AppError('Hay integrantes repetidos dentro del equipo', 400, 'DUPLICATED_TEAM_MEMBERS');
  }

  if (leaderId && !memberIds.includes(leaderId)) {
    throw new AppError('El lider debe estar dentro de los integrantes', 400, 'LEADER_NOT_IN_TEAM');
  }

  return { memberIds, leaderId };
}

export async function listTeams(hackathonEventId: string) {
  const prisma = requirePrisma();
  await getHackathonEventById(hackathonEventId);

  return prisma.hackathonTeam.findMany({
    where: { hackathonEventId, deletedAt: null },
    include: teamInclude,
    orderBy: { createdAt: 'asc' },
  });
}

export async function createHackathonTeam(
  hackathonEventId: string,
  input: CreateHackathonTeamInput,
  actorId?: string
) {
  const prisma = requirePrisma();
  await getHackathonEventById(hackathonEventId);
  await ensureChallengeBelongsToHackathon(prisma, hackathonEventId, input.challengeId);

  const { memberIds, leaderId } = resolveTeamMembers({
    memberIds: input.memberIds,
    leaderId: input.leaderId,
  });

  await ensureUsersExist(prisma, memberIds);
  await ensureUsersAreAvailableForHackathon(prisma, hackathonEventId, memberIds);

  const team = await prisma.hackathonTeam.create({
    data: {
      hackathonEventId,
      challengeId: input.challengeId || null,
      leaderId,
      name: input.name,
      projectName: input.projectName || null,
      githubUrl: input.githubUrl || null,
      demoUrl: input.demoUrl || null,
      members: {
        create: memberIds.map((userId) => ({
          userId,
          isLeader: userId === leaderId,
        })),
      },
    },
    include: teamInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.CREATE,
    entity: 'HackathonTeam',
    entityId: team.id,
    newValues: { hackathonEventId, name: team.name, challengeId: team.challengeId, memberIds },
  });

  return team;
}

export async function updateHackathonTeam(
  hackathonEventId: string,
  teamId: string,
  input: UpdateHackathonTeamInput,
  actorId?: string
) {
  const prisma = requirePrisma();
  const existingTeam = await prisma.hackathonTeam.findFirst({
    where: { id: teamId, hackathonEventId, deletedAt: null },
    include: teamInclude,
  });

  if (!existingTeam) {
    throw new AppError('Equipo no encontrado', 404, 'HACKATHON_TEAM_NOT_FOUND');
  }

  await ensureChallengeBelongsToHackathon(prisma, hackathonEventId, input.challengeId);

  const fallbackMemberIds = existingTeam.members.map((member) => member.userId);
  const { memberIds, leaderId } = resolveTeamMembers({
    memberIds: input.memberIds,
    leaderId: input.leaderId,
    fallbackMemberIds,
    fallbackLeaderId: existingTeam.leaderId,
  });

  if (input.memberIds || input.leaderId !== undefined) {
    await ensureUsersExist(prisma, memberIds);
    await ensureUsersAreAvailableForHackathon(prisma, hackathonEventId, memberIds, teamId);
  }

  const team = await prisma.$transaction(async (tx) => {
    if (input.memberIds || input.leaderId !== undefined) {
      await tx.hackathonTeamMember.deleteMany({ where: { hackathonTeamId: teamId } });
    }

    await tx.hackathonTeam.update({
      where: { id: teamId },
      data: {
        challengeId: input.challengeId === undefined ? undefined : input.challengeId,
        leaderId,
        name: input.name,
        projectName: input.projectName === undefined ? undefined : input.projectName,
        githubUrl: input.githubUrl === undefined ? undefined : input.githubUrl,
        demoUrl: input.demoUrl === undefined ? undefined : input.demoUrl,
        members:
          input.memberIds || input.leaderId !== undefined
            ? {
                create: memberIds.map((userId) => ({
                  userId,
                  isLeader: userId === leaderId,
                })),
              }
            : undefined,
      },
    });

    return tx.hackathonTeam.findFirstOrThrow({
      where: { id: teamId },
      include: teamInclude,
    });
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.UPDATE,
    entity: 'HackathonTeam',
    entityId: team.id,
    oldValues: { name: existingTeam.name, challengeId: existingTeam.challengeId },
    newValues: { name: team.name, challengeId: team.challengeId, leaderId: team.leaderId },
  });

  return team;
}

export async function deleteHackathonTeam(hackathonEventId: string, teamId: string, actorId?: string) {
  const prisma = requirePrisma();
  const team = await prisma.hackathonTeam.findFirst({
    where: { id: teamId, hackathonEventId, deletedAt: null },
  });

  if (!team) {
    throw new AppError('Equipo no encontrado', 404, 'HACKATHON_TEAM_NOT_FOUND');
  }

  const deletedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.hackathonTeam.update({
      where: { id: teamId },
      data: softDeleteData(deletedAt),
    });
    await tx.hackathonDeliverable.updateMany({
      where: { hackathonTeamId: teamId, deletedAt: null },
      data: softDeleteData(deletedAt),
    });
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.DELETE,
    entity: 'HackathonTeam',
    entityId: teamId,
    oldValues: { name: team.name, hackathonEventId },
  });
}

async function getActiveHackathonTeam(hackathonEventId: string, teamId: string) {
  const prisma = requirePrisma();
  const team = await prisma.hackathonTeam.findFirst({
    where: { id: teamId, hackathonEventId, deletedAt: null },
  });

  if (!team) {
    throw new AppError('Equipo no encontrado', 404, 'HACKATHON_TEAM_NOT_FOUND');
  }

  return team;
}

async function getDeliverableById(hackathonEventId: string, teamId: string, deliverableId: string) {
  const prisma = requirePrisma();
  const deliverable = await prisma.hackathonDeliverable.findFirst({
    where: {
      id: deliverableId,
      hackathonTeamId: teamId,
      deletedAt: null,
      hackathonTeam: {
        hackathonEventId,
        deletedAt: null,
      },
    },
    include: deliverableInclude,
  });

  if (!deliverable) {
    throw new AppError('Entregable no encontrado', 404, 'DELIVERABLE_NOT_FOUND');
  }

  return deliverable;
}

export async function listDeliverables(hackathonEventId: string, teamId: string) {
  const prisma = requirePrisma();
  await getActiveHackathonTeam(hackathonEventId, teamId);

  return prisma.hackathonDeliverable.findMany({
    where: { hackathonTeamId: teamId, deletedAt: null },
    include: deliverableInclude,
    orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function createDeliverable(
  hackathonEventId: string,
  teamId: string,
  input: CreateDeliverableInput,
  actorId?: string
) {
  const prisma = requirePrisma();
  await getActiveHackathonTeam(hackathonEventId, teamId);

  const deliverable = await prisma.hackathonDeliverable.create({
    data: {
      hackathonTeamId: teamId,
      type: input.type,
      title: input.title,
      url: input.url,
      submittedAt: input.submittedAt || new Date(),
    },
    include: deliverableInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.CREATE,
    entity: 'HackathonDeliverable',
    entityId: deliverable.id,
    newValues: { hackathonEventId, teamId, type: deliverable.type, title: deliverable.title },
  });

  return deliverable;
}

export async function updateDeliverable(
  hackathonEventId: string,
  teamId: string,
  deliverableId: string,
  input: UpdateDeliverableInput,
  actorId?: string
) {
  const prisma = requirePrisma();
  const existingDeliverable = await getDeliverableById(hackathonEventId, teamId, deliverableId);
  const deliverable = await prisma.hackathonDeliverable.update({
    where: { id: deliverableId },
    data: {
      type: input.type,
      title: input.title,
      url: input.url,
      submittedAt: input.submittedAt === undefined ? undefined : input.submittedAt || new Date(),
    },
    include: deliverableInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.UPDATE,
    entity: 'HackathonDeliverable',
    entityId: deliverable.id,
    oldValues: {
      type: existingDeliverable.type,
      title: existingDeliverable.title,
      url: existingDeliverable.url,
    },
    newValues: { type: deliverable.type, title: deliverable.title, url: deliverable.url },
  });

  return deliverable;
}

export async function deleteDeliverable(
  hackathonEventId: string,
  teamId: string,
  deliverableId: string,
  actorId?: string
) {
  const prisma = requirePrisma();
  const deliverable = await getDeliverableById(hackathonEventId, teamId, deliverableId);

  await prisma.hackathonDeliverable.update({
    where: { id: deliverableId },
    data: softDeleteData(),
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.DELETE,
    entity: 'HackathonDeliverable',
    entityId: deliverableId,
    oldValues: { type: deliverable.type, title: deliverable.title, teamId },
  });
}

export async function getHackathonOverview(hackathonEventId: string) {
  const [hackathon, challenges, teams] = await Promise.all([
    getHackathonEventById(hackathonEventId),
    listChallenges(hackathonEventId),
    listTeams(hackathonEventId),
  ]);

  return {
    hackathon,
    challenges,
    teams,
  };
}
