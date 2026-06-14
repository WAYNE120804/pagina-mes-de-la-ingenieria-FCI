import {
  AuditAction,
  CompetitionMode,
  MatchStatus,
  Prisma,
  RoleCode,
  Sport,
  TournamentFormat,
  TournamentPhase,
  TournamentRulePreset,
  TournamentStatus,
} from '../../lib/prisma-client';
import ExcelJS from 'exceljs';
import QRCode from 'qrcode';
import { AppError } from '../../lib/app-error';
import { getPrisma } from '../../lib/prisma';
import { createAuditLog } from '../../utils/audit';
import { buildPaginationMeta, type PaginationParams } from '../../utils/pagination';
import { onlyActive, softDeleteData } from '../../utils/soft-delete';
import type {
  CreateTournamentInput,
  CreateMatchInput,
  GenerateFixtureInput,
  GenerateGroupsInput,
  IndividualRegistrationInput,
  ListTournamentsQuery,
  PublicTournamentRegistrationInput,
  ScoreMatchInput,
  TeamRegistrationInput,
  UpdateStandingInput,
  UpdateMatchInput,
  UpdateIndividualRegistrationInput,
  UpdateTeamRegistrationInput,
  UpdateTournamentInput,
} from './tournament.schemas';

const tournamentInclude = {
  event: true,
  venue: true,
  _count: {
    select: {
      groups: { where: { deletedAt: null } },
      teams: { where: { deletedAt: null } },
      participants: { where: { deletedAt: null } },
      matches: { where: { deletedAt: null } },
    },
  },
} satisfies Prisma.TournamentInclude;

const teamInclude = {
  captain: {
    select: {
      id: true,
      name: true,
      email: true,
      universityCode: true,
    },
  },
  group: true,
  members: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          universityCode: true,
          program: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  },
  _count: {
    select: {
      members: true,
      homeMatches: true,
      awayMatches: true,
    },
  },
} satisfies Prisma.TeamInclude;

const participantInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      universityCode: true,
      program: true,
    },
  },
  group: true,
  _count: {
    select: {
      homeMatches: true,
      awayMatches: true,
    },
  },
} satisfies Prisma.TournamentParticipantInclude;

const groupInclude = {
  teams: {
    where: { deletedAt: null },
    include: teamInclude,
    orderBy: { name: 'asc' },
  },
  participants: {
    where: { deletedAt: null },
    include: participantInclude,
    orderBy: [{ seed: 'asc' }, { displayName: 'asc' }],
  },
} satisfies Prisma.TournamentGroupInclude;

const matchInclude = {
  group: true,
  venue: true,
  homeTeam: true,
  awayTeam: true,
  winnerTeam: true,
  homeParticipant: true,
  awayParticipant: true,
  winnerParticipant: true,
} satisfies Prisma.MatchInclude;

const standingInclude = {
  group: true,
  team: {
    include: teamInclude,
  },
  participant: true,
} satisfies Prisma.TournamentStandingInclude;

const publicStandingInclude = {
  group: true,
  team: {
    select: {
      id: true,
      name: true,
      members: {
        select: {
          id: true,
          fullName: true,
          isCaptain: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  },
  participant: {
    select: {
      id: true,
      displayName: true,
    },
  },
} satisfies Prisma.TournamentStandingInclude;

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

function getDefaultMode(sport: Sport) {
  if (sport === Sport.VIDEOJUEGOS || sport === Sport.PING_PONG || sport === Sport.AJEDREZ) {
    return CompetitionMode.INDIVIDUAL;
  }

  return CompetitionMode.TEAM;
}

function getDefaultRulePreset(sport: Sport) {
  const presets: Record<Sport, TournamentRulePreset> = {
    FUTBOL: TournamentRulePreset.FOOTBALL,
    BALONCESTO: TournamentRulePreset.BASKETBALL,
    VIDEOJUEGOS: TournamentRulePreset.VIDEO_GAME,
    PING_PONG: TournamentRulePreset.TABLE_TENNIS,
    AJEDREZ: TournamentRulePreset.CHESS,
    ROBOTICA: TournamentRulePreset.ROBOTICS_BATTLE,
    VOLEIBOL: TournamentRulePreset.CUSTOM,
    MARATON_PROGRAMACION: TournamentRulePreset.CUSTOM,
    CAPTURA_BANDERA: TournamentRulePreset.CUSTOM,
  };

  return presets[sport];
}

function normalizeInput(input: CreateTournamentInput | UpdateTournamentInput) {
  const sport = input.sport;
  const mode = sport ? input.mode || getDefaultMode(sport) : input.mode;
  const rulePreset = sport ? input.rulePreset || getDefaultRulePreset(sport) : input.rulePreset;
  const isIndividual = mode === CompetitionMode.INDIVIDUAL;

  if (sport === Sport.VIDEOJUEGOS && !input.videoGameTitle) {
    throw new AppError('Debes seleccionar FIFA o Call of Duty', 400, 'VIDEO_GAME_REQUIRED');
  }

  if (sport && sport !== Sport.VIDEOJUEGOS && input.videoGameTitle) {
    throw new AppError(
      'Solo los torneos de videojuegos pueden tener juego asociado',
      400,
      'INVALID_VIDEO_GAME_TITLE'
    );
  }

  if (
    sport &&
    (sport === Sport.FUTBOL ||
      sport === Sport.BALONCESTO ||
      sport === Sport.ROBOTICA ||
      sport === Sport.VOLEIBOL ||
      sport === Sport.MARATON_PROGRAMACION ||
      sport === Sport.CAPTURA_BANDERA) &&
    mode === CompetitionMode.INDIVIDUAL
  ) {
    throw new AppError('Esta disciplina debe configurarse por equipos', 400, 'INVALID_COMPETITION_MODE');
  }

  if (
    sport &&
    (sport === Sport.PING_PONG || sport === Sport.AJEDREZ || sport === Sport.VIDEOJUEGOS) &&
    mode === CompetitionMode.TEAM
  ) {
    throw new AppError('Esta disciplina debe configurarse individual', 400, 'INVALID_COMPETITION_MODE');
  }

  return {
    mode,
    rulePreset,
    restrictionGroup: sport === Sport.VIDEOJUEGOS ? 'VIDEOJUEGOS' : undefined,
    maxTeams: isIndividual ? null : input.maxTeams,
    maxMembersPerTeam: isIndividual ? null : input.maxMembersPerTeam,
    maxParticipants: isIndividual ? input.maxParticipants : input.maxParticipants,
    allowsDraws:
      input.allowsDraws ??
      Boolean(
        sport && (sport === Sport.FUTBOL || sport === Sport.BALONCESTO || sport === Sport.AJEDREZ)
      ),
    pointsWin: input.pointsWin ?? 3,
    pointsDraw: input.pointsDraw ?? 1,
    pointsLoss: input.pointsLoss ?? 0,
  };
}

export async function listTournaments(
  query: ListTournamentsQuery,
  pagination: PaginationParams
) {
  const prisma = requirePrisma();
  const where: Prisma.TournamentWhereInput = {
    ...onlyActive,
    sport: query.sport,
    mode: query.mode,
    status: query.status,
    OR: query.search
      ? [
          { name: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
          { rules: { contains: query.search, mode: 'insensitive' } },
        ]
      : undefined,
  };

  const [total, tournaments] = await Promise.all([
    prisma.tournament.count({ where }),
    prisma.tournament.findMany({
      where,
      include: tournamentInclude,
      orderBy: [{ startsAt: 'asc' }, { createdAt: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
    }),
  ]);

  return {
    tournaments,
    meta: buildPaginationMeta(total, pagination),
  };
}

export async function listPublicTournaments() {
  const prisma = requirePrisma();

  return prisma.tournament.findMany({
    where: {
      ...onlyActive,
      status: {
        in: [
          TournamentStatus.REGISTRATION_OPEN,
          TournamentStatus.IN_PROGRESS,
          TournamentStatus.FINISHED,
        ],
      },
    },
    include: {
      ...tournamentInclude,
      matches: {
        where: { deletedAt: null },
        include: matchInclude,
        orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
      },
      standings: {
        include: publicStandingInclude,
        orderBy: [{ group: { name: 'asc' } }, { rank: 'asc' }, { points: 'desc' }],
      },
    },
    orderBy: [{ startsAt: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function getTournamentById(id: string) {
  const prisma = requirePrisma();
  const tournament = await prisma.tournament.findFirst({
    where: { id, ...onlyActive },
    include: tournamentInclude,
  });

  if (!tournament) {
    throw new AppError('Torneo no encontrado', 404, 'TOURNAMENT_NOT_FOUND');
  }

  return tournament;
}

export async function createTournament(input: CreateTournamentInput, actorId?: string) {
  const prisma = requirePrisma();
  const normalized = normalizeInput(input);

  const tournament = await prisma.tournament.create({
    data: {
      eventId: input.eventId || null,
      venueId: input.venueId || null,
      name: input.name,
      sport: input.sport,
      mode: normalized.mode,
      videoGameTitle: input.sport === Sport.VIDEOJUEGOS ? input.videoGameTitle : null,
      rulePreset: normalized.rulePreset,
      format: input.format,
      status: input.status,
      description: input.description || null,
      rules: input.rules || null,
      maxTeams: normalized.maxTeams,
      maxMembersPerTeam: normalized.maxMembersPerTeam,
      maxParticipants: normalized.maxParticipants,
      pointsWin: normalized.pointsWin,
      pointsDraw: normalized.pointsDraw,
      pointsLoss: normalized.pointsLoss,
      allowsDraws: normalized.allowsDraws,
      restrictionGroup: normalized.restrictionGroup,
      startsAt: input.startsAt || null,
      endsAt: input.endsAt || null,
    },
    include: tournamentInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.CREATE,
    entity: 'Tournament',
    entityId: tournament.id,
    newValues: { name: tournament.name, sport: tournament.sport, mode: tournament.mode },
  });

  return tournament;
}

export async function updateTournament(id: string, input: UpdateTournamentInput, actorId?: string) {
  const prisma = requirePrisma();
  const existingTournament = await getTournamentById(id);
  const merged = {
    ...existingTournament,
    ...input,
    eventId: input.eventId === undefined ? existingTournament.eventId : input.eventId,
    venueId: input.venueId === undefined ? existingTournament.venueId : input.venueId,
    videoGameTitle:
      input.videoGameTitle === undefined ? existingTournament.videoGameTitle : input.videoGameTitle,
    startsAt: input.startsAt === undefined ? existingTournament.startsAt : input.startsAt,
    endsAt: input.endsAt === undefined ? existingTournament.endsAt : input.endsAt,
  } as CreateTournamentInput;
  const normalized = normalizeInput(merged);

  const tournament = await prisma.tournament.update({
    where: { id },
    data: {
      eventId: input.eventId === undefined ? undefined : input.eventId,
      venueId: input.venueId === undefined ? undefined : input.venueId,
      name: input.name,
      sport: input.sport,
      mode: input.sport || input.mode ? normalized.mode : undefined,
      videoGameTitle:
        input.sport || input.videoGameTitle !== undefined
          ? merged.sport === Sport.VIDEOJUEGOS
            ? merged.videoGameTitle
            : null
          : undefined,
      rulePreset: input.sport || input.rulePreset ? normalized.rulePreset : undefined,
      format: input.format,
      status: input.status,
      description: input.description === undefined ? undefined : input.description,
      rules: input.rules === undefined ? undefined : input.rules,
      maxTeams:
        input.sport || input.mode || input.maxTeams !== undefined ? normalized.maxTeams : undefined,
      maxMembersPerTeam:
        input.sport || input.mode || input.maxMembersPerTeam !== undefined
          ? normalized.maxMembersPerTeam
          : undefined,
      maxParticipants:
        input.sport || input.mode || input.maxParticipants !== undefined
          ? normalized.maxParticipants
          : undefined,
      pointsWin: input.pointsWin === undefined ? undefined : normalized.pointsWin,
      pointsDraw: input.pointsDraw === undefined ? undefined : normalized.pointsDraw,
      pointsLoss: input.pointsLoss === undefined ? undefined : normalized.pointsLoss,
      allowsDraws: input.allowsDraws === undefined ? undefined : normalized.allowsDraws,
      restrictionGroup: input.sport ? normalized.restrictionGroup : undefined,
      startsAt: input.startsAt === undefined ? undefined : input.startsAt,
      endsAt: input.endsAt === undefined ? undefined : input.endsAt,
    },
    include: tournamentInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.UPDATE,
    entity: 'Tournament',
    entityId: tournament.id,
    oldValues: { name: existingTournament.name, status: existingTournament.status },
    newValues: { name: tournament.name, status: tournament.status },
  });

  return tournament;
}

export async function deleteTournament(id: string, actorId?: string) {
  const prisma = requirePrisma();
  const tournament = await getTournamentById(id);

  await prisma.tournament.update({
    where: { id },
    data: softDeleteData(),
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.DELETE,
    entity: 'Tournament',
    entityId: id,
    oldValues: { name: tournament.name, sport: tournament.sport },
  });
}

async function resolveTournamentByPublicKey(tournamentKey: string) {
  const prisma = requirePrisma();
  const normalizedKey = slugify(tournamentKey);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tournamentKey);

  if (isUuid) {
    return getTournamentById(tournamentKey);
  }

  const directNameMatch = await prisma.tournament.findFirst({
    where: {
      ...onlyActive,
      name: {
        equals: tournamentKey.replace(/-/g, ' '),
        mode: 'insensitive',
      },
    },
    include: tournamentInclude,
  });

  if (directNameMatch) {
    return directNameMatch;
  }

  const tournaments = await prisma.tournament.findMany({
    where: onlyActive,
    include: tournamentInclude,
  });
  const tournament = tournaments.find((item) => slugify(item.name) === normalizedKey);

  if (!tournament) {
    throw new AppError('Torneo no encontrado', 404, 'TOURNAMENT_NOT_FOUND');
  }

  return tournament;
}

async function getTournamentForRegistration(tournamentKey: string) {
  const tournament = await resolveTournamentByPublicKey(tournamentKey);

  if (tournament.status === TournamentStatus.CANCELLED || tournament.status === TournamentStatus.FINISHED) {
    throw new AppError('El torneo no recibe inscripciones en este estado', 400, 'TOURNAMENT_NOT_OPEN');
  }

  return tournament;
}

function buildPublicTournamentUrl(origin: string, tournament: { id: string; name: string }) {
  return `${origin.replace(/\/$/, '')}/public/torneos/${slugify(tournament.name) || tournament.id}/inscripcion`;
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids));
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean)));
}

async function ensureUsersExist(prisma: ReturnType<typeof requirePrisma>, userIds: string[]) {
  const ids = uniqueIds(userIds);
  const users = await prisma.user.findMany({
    where: {
      id: { in: ids },
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      universityCode: true,
    },
  });

  if (users.length !== ids.length) {
    throw new AppError('Uno o mas participantes no existen', 400, 'USER_NOT_FOUND');
  }

  return users;
}

async function ensureParticipantRole(
  prisma: ReturnType<typeof requirePrisma>,
  userId: string
) {
  const participantRole = await prisma.role.findUnique({
    where: { code: RoleCode.PARTICIPANTE },
    select: { id: true },
  });

  if (!participantRole) {
    return;
  }

  await prisma.userRoleAssignment.upsert({
    where: {
      userId_roleId: {
        userId,
        roleId: participantRole.id,
      },
    },
    update: {},
    create: {
      userId,
      roleId: participantRole.id,
    },
  });
}

async function findOrCreatePublicUser(
  prisma: ReturnType<typeof requirePrisma>,
  input: { fullName: string; identifier: string; email: string }
) {
  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { email: input.email },
        { universityCode: input.identifier },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      universityCode: true,
    },
  });

  if (user) {
    if (user.email !== input.email || (user.universityCode && user.universityCode !== input.identifier)) {
      throw new AppError(
        'El correo o código ya está asociado a otro participante',
        409,
        'PUBLIC_USER_CONFLICT'
      );
    }

    await ensureParticipantRole(prisma, user.id);

    if (!user.universityCode || user.name !== input.fullName) {
      return prisma.user.update({
        where: { id: user.id },
        data: {
          name: input.fullName,
          universityCode: user.universityCode || input.identifier,
        },
        select: {
          id: true,
          name: true,
          email: true,
          universityCode: true,
        },
      });
    }

    return user;
  }

  const createdUser = await prisma.user.create({
    data: {
      name: input.fullName,
      email: input.email,
      universityCode: input.identifier,
      status: 'PENDING',
    },
    select: {
      id: true,
      name: true,
      email: true,
      universityCode: true,
    },
  });

  await ensureParticipantRole(prisma, createdUser.id);
  return createdUser;
}

type NormalizedTeamMember = {
  userId?: string | null;
  fullName: string;
  identifier: string;
  email: string;
  semester?: string | null;
  career?: string | null;
  isCaptain: boolean;
};

async function normalizeTeamMembers(
  prisma: ReturnType<typeof requirePrisma>,
  input: {
    memberIds?: string[];
    members?: TeamRegistrationInput['members'];
    existingMembers?: Array<{
      userId?: string | null;
      fullName?: string | null;
      identifier?: string | null;
      email?: string | null;
      semester?: string | null;
      career?: string | null;
      isCaptain: boolean;
      user?: {
        id: string;
        name: string;
        email: string;
        universityCode?: string | null;
      } | null;
    }>;
  }
): Promise<NormalizedTeamMember[]> {
  let members: NormalizedTeamMember[] = [];

  if (input.members?.length) {
    members = input.members.map((member) => ({
      userId: member.userId || null,
      fullName: member.fullName,
      identifier: member.identifier,
      email: member.email,
      semester: member.semester || null,
      career: member.career || null,
      isCaptain: Boolean(member.isCaptain),
    }));
  } else if (input.memberIds?.length) {
    const users = await ensureUsersExist(prisma, uniqueIds(input.memberIds));
    members = users.map((user, index) => ({
      userId: user.id,
      fullName: user.name,
      identifier: user.universityCode || user.id,
      email: user.email,
      semester: null,
      career: null,
      isCaptain: index === 0,
    }));
  } else if (input.existingMembers?.length) {
    members = input.existingMembers.map((member) => ({
      userId: member.userId || null,
      fullName: member.fullName || member.user?.name || '',
      identifier: member.identifier || member.user?.universityCode || member.userId || '',
      email: member.email || member.user?.email || '',
      semester: member.semester || null,
      career: member.career || null,
      isCaptain: member.isCaptain,
    }));
  }

  if (!members.length) {
    throw new AppError('Debes registrar integrantes del equipo', 400, 'TEAM_MEMBERS_REQUIRED');
  }

  const emails = uniqueValues(members.map((member) => member.email));
  const identifiers = uniqueValues(members.map((member) => member.identifier));

  if (emails.length !== members.length || identifiers.length !== members.length) {
    throw new AppError(
      'Hay correos o códigos repetidos dentro del equipo',
      400,
      'DUPLICATED_TEAM_MEMBERS'
    );
  }

  const hasCaptain = members.some((member) => member.isCaptain);
  if (!hasCaptain) {
    members[0].isCaptain = true;
  }

  return members.map((member) => ({
    ...member,
    fullName: member.fullName.trim(),
    identifier: member.identifier.trim(),
    email: member.email.trim().toLowerCase(),
  }));
}

async function ensureTeamCapacity(
  prisma: ReturnType<typeof requirePrisma>,
  tournamentId: string,
  maxTeams?: number | null,
  excludeTeamId?: string
) {
  if (!maxTeams) {
    return;
  }

  const registeredTeams = await prisma.team.count({
    where: {
      tournamentId,
      deletedAt: null,
      id: excludeTeamId ? { not: excludeTeamId } : undefined,
    },
  });

  if (registeredTeams >= maxTeams) {
    throw new AppError('El torneo ya alcanzo el maximo de equipos', 400, 'TEAM_LIMIT_REACHED');
  }
}

async function ensureTeamMembersAreNotInAnotherTeam(
  prisma: ReturnType<typeof requirePrisma>,
  tournamentId: string,
  members: NormalizedTeamMember[],
  excludeTeamId?: string
) {
  const userIds = uniqueIds(members.map((member) => member.userId).filter(Boolean) as string[]);
  const emails = uniqueValues(members.map((member) => member.email));
  const identifiers = uniqueValues(members.map((member) => member.identifier));

  const duplicateMembership = await prisma.teamMember.findFirst({
    where: {
      team: {
        tournamentId,
        deletedAt: null,
        id: excludeTeamId ? { not: excludeTeamId } : undefined,
      },
      OR: [
        userIds.length ? { userId: { in: userIds } } : undefined,
        { email: { in: emails } },
        { identifier: { in: identifiers } },
      ].filter(Boolean) as Prisma.TeamMemberWhereInput[],
    },
    include: {
      user: true,
      team: true,
    },
  });

  if (duplicateMembership) {
    const memberName =
      duplicateMembership.fullName ||
      duplicateMembership.user?.name ||
      duplicateMembership.email ||
      'Este integrante';
    throw new AppError(
      `${memberName} ya está inscrito en el equipo ${duplicateMembership.team.name}`,
      400,
      'USER_ALREADY_IN_TEAM'
    );
  }
}

async function ensureIndividualCapacity(
  prisma: ReturnType<typeof requirePrisma>,
  tournamentId: string,
  maxParticipants?: number | null,
  excludeParticipantId?: string
) {
  if (!maxParticipants) {
    return;
  }

  const registeredParticipants = await prisma.tournamentParticipant.count({
    where: {
      tournamentId,
      deletedAt: null,
      id: excludeParticipantId ? { not: excludeParticipantId } : undefined,
    },
  });

  if (registeredParticipants >= maxParticipants) {
    throw new AppError(
      'El torneo ya alcanzo el maximo de participantes',
      400,
      'PARTICIPANT_LIMIT_REACHED'
    );
  }
}

async function ensureNoDuplicateIndividual(
  prisma: ReturnType<typeof requirePrisma>,
  tournamentId: string,
  input: { userId?: string | null; email?: string | null; identifier?: string | null },
  excludeParticipantId?: string
) {
  const duplicate = await prisma.tournamentParticipant.findFirst({
    where: {
      tournamentId,
      deletedAt: null,
      id: excludeParticipantId ? { not: excludeParticipantId } : undefined,
      OR: [
        input.userId ? { userId: input.userId } : undefined,
        input.email ? { email: input.email } : undefined,
        input.identifier ? { identifier: input.identifier } : undefined,
      ].filter(Boolean) as Prisma.TournamentParticipantWhereInput[],
    },
  });

  if (duplicate) {
    throw new AppError('El participante ya está inscrito en este torneo', 400, 'PARTICIPANT_DUPLICATED');
  }
}

async function ensureVideoGameRestriction(
  prisma: ReturnType<typeof requirePrisma>,
  tournament: Awaited<ReturnType<typeof getTournamentById>>,
  input: { userId?: string | null; email?: string | null; identifier?: string | null },
  excludeParticipantId?: string
) {
  if (!tournament.restrictionGroup || tournament.restrictionGroup !== 'VIDEOJUEGOS') {
    return;
  }

  const existing = await prisma.tournamentParticipant.findFirst({
    where: {
      deletedAt: null,
      id: excludeParticipantId ? { not: excludeParticipantId } : undefined,
      OR: [
        input.userId ? { userId: input.userId } : undefined,
        input.email ? { email: input.email } : undefined,
        input.identifier ? { identifier: input.identifier } : undefined,
      ].filter(Boolean) as Prisma.TournamentParticipantWhereInput[],
      tournament: {
        id: { not: tournament.id },
        restrictionGroup: tournament.restrictionGroup,
        deletedAt: null,
      },
    },
    include: {
      tournament: true,
    },
  });

  if (existing) {
    throw new AppError(
      `El participante ya está inscrito en ${existing.tournament.name}. Solo puede competir en un torneo de videojuegos.`,
      400,
      'VIDEO_GAME_RESTRICTION'
    );
  }
}

export async function getTournamentRegistrations(tournamentId: string) {
  const prisma = requirePrisma();
  await getTournamentById(tournamentId);

  const [teams, participants] = await Promise.all([
    prisma.team.findMany({
      where: {
        tournamentId,
        deletedAt: null,
      },
      include: teamInclude,
      orderBy: { createdAt: 'asc' },
    }),
    prisma.tournamentParticipant.findMany({
      where: {
        tournamentId,
        deletedAt: null,
      },
      include: participantInclude,
      orderBy: [{ seed: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

  return { teams, participants };
}

export async function registerTeam(
  tournamentId: string,
  input: TeamRegistrationInput,
  actorId?: string
) {
  const prisma = requirePrisma();
  const tournament = await getTournamentForRegistration(tournamentId);

  if (tournament.mode !== CompetitionMode.TEAM) {
    throw new AppError('Este torneo es individual y no permite equipos', 400, 'INVALID_REGISTRATION_MODE');
  }

  const members = await normalizeTeamMembers(prisma, input);

  if (tournament.maxMembersPerTeam && members.length > tournament.maxMembersPerTeam) {
    throw new AppError('El equipo supera el maximo de integrantes', 400, 'TEAM_MEMBER_LIMIT_REACHED');
  }

  await ensureTeamCapacity(prisma, tournamentId, tournament.maxTeams);
  await ensureTeamMembersAreNotInAnotherTeam(prisma, tournamentId, members);

  const team = await prisma.team.create({
    data: {
      tournamentId,
      name: input.name,
      logoUrl: input.logoUrl || null,
      captainId: input.captainId || null,
      status: input.status,
      members: {
        create: members.map((member) => ({
          userId: member.userId || null,
          fullName: member.fullName,
          identifier: member.identifier,
          email: member.email,
          isCaptain: member.isCaptain,
        })),
      },
    },
    include: teamInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.CREATE,
    entity: 'Team',
    entityId: team.id,
    newValues: { tournamentId, name: team.name, members },
  });

  return team;
}

export async function updateTeamRegistration(
  tournamentId: string,
  teamId: string,
  input: UpdateTeamRegistrationInput,
  actorId?: string
) {
  const prisma = requirePrisma();
  const tournament = await getTournamentForRegistration(tournamentId);

  if (tournament.mode !== CompetitionMode.TEAM) {
    throw new AppError('Este torneo es individual y no permite equipos', 400, 'INVALID_REGISTRATION_MODE');
  }

  const existingTeam = await prisma.team.findFirst({
    where: { id: teamId, tournamentId, deletedAt: null },
    include: teamInclude,
  });

  if (!existingTeam) {
    throw new AppError('Equipo no encontrado', 404, 'TEAM_NOT_FOUND');
  }

  const members = await normalizeTeamMembers(prisma, {
    memberIds: input.memberIds,
    members: input.members,
    existingMembers: existingTeam.members,
  });

  if (tournament.maxMembersPerTeam && members.length > tournament.maxMembersPerTeam) {
    throw new AppError('El equipo supera el maximo de integrantes', 400, 'TEAM_MEMBER_LIMIT_REACHED');
  }

  await ensureTeamMembersAreNotInAnotherTeam(prisma, tournamentId, members, teamId);

  const team = await prisma.$transaction(async (tx) => {
    await tx.teamMember.deleteMany({
      where: { teamId },
    });

    return tx.team.update({
      where: { id: teamId },
      data: {
        name: input.name,
        logoUrl: input.logoUrl === undefined ? undefined : input.logoUrl,
        captainId: input.captainId === undefined ? existingTeam.captainId : input.captainId,
        status: input.status,
        members: {
          create: members.map((member) => ({
            userId: member.userId || null,
            fullName: member.fullName,
            identifier: member.identifier,
            email: member.email,
            isCaptain: member.isCaptain,
          })),
        },
      },
      include: teamInclude,
    });
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.UPDATE,
    entity: 'Team',
    entityId: team.id,
    oldValues: { name: existingTeam.name, members: existingTeam.members },
    newValues: { name: team.name, members },
  });

  return team;
}

export async function deleteTeamRegistration(tournamentId: string, teamId: string, actorId?: string) {
  const prisma = requirePrisma();
  const team = await prisma.team.findFirst({
    where: { id: teamId, tournamentId, deletedAt: null },
  });

  if (!team) {
    throw new AppError('Equipo no encontrado', 404, 'TEAM_NOT_FOUND');
  }

  await prisma.team.update({
    where: { id: teamId },
    data: softDeleteData(),
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.DELETE,
    entity: 'Team',
    entityId: teamId,
    oldValues: { tournamentId, name: team.name },
  });
}

export async function registerIndividualParticipant(
  tournamentId: string,
  input: IndividualRegistrationInput,
  actorId?: string
) {
  const prisma = requirePrisma();
  const tournament = await getTournamentForRegistration(tournamentId);

  if (tournament.mode !== CompetitionMode.INDIVIDUAL) {
    throw new AppError('Este torneo es por equipos y no permite inscripción individual', 400, 'INVALID_REGISTRATION_MODE');
  }

  await ensureIndividualCapacity(prisma, tournamentId, tournament.maxParticipants);

  const user = input.userId
    ? (await ensureUsersExist(prisma, [input.userId]))[0]
    : null;
  const displayName = user?.name || input.displayName || '';
  const email = user?.email || input.email || null;
  const identifier = user?.universityCode || input.identifier || null;

  await ensureNoDuplicateIndividual(prisma, tournamentId, { userId: input.userId, email, identifier });
  await ensureVideoGameRestriction(prisma, tournament, { userId: input.userId, email, identifier });

  const participant = await prisma.tournamentParticipant.create({
    data: {
      tournamentId,
      userId: input.userId || null,
      displayName,
      email,
      identifier,
      semester: input.semester || null,
      career: input.career || null,
      status: input.status,
      seed: input.seed || null,
    },
    include: participantInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.CREATE,
    entity: 'TournamentParticipant',
    entityId: participant.id,
    newValues: { tournamentId, displayName, email },
  });

  return participant;
}

export async function getPublicTournamentForm(tournamentId: string, origin: string) {
  const tournament = await getTournamentForRegistration(tournamentId);

  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      sport: tournament.sport,
      mode: tournament.mode,
      status: tournament.status,
      description: tournament.description,
      rules: tournament.rules,
      maxTeams: tournament.maxTeams,
      maxMembersPerTeam: tournament.maxMembersPerTeam,
      maxParticipants: tournament.maxParticipants,
      startsAt: tournament.startsAt,
      endsAt: tournament.endsAt,
      venue: tournament.venue,
    },
    url: buildPublicTournamentUrl(origin, tournament),
  };
}

export async function getPublicTournamentFormQrSvg(tournamentId: string, origin: string) {
  const form = await getPublicTournamentForm(tournamentId, origin);

  return QRCode.toString(form.url, {
    type: 'svg',
    margin: 1,
    width: 256,
    errorCorrectionLevel: 'M',
  });
}

export async function publicRegisterTournament(
  tournamentId: string,
  input: PublicTournamentRegistrationInput
) {
  const prisma = requirePrisma();
  const tournament = await getTournamentForRegistration(tournamentId);
  const resolvedTournamentId = tournament.id;
  const emails = uniqueValues(input.members.map((member) => member.email));
  const identifiers = uniqueValues(input.members.map((member) => member.identifier));

  if (emails.length !== input.members.length || identifiers.length !== input.members.length) {
    throw new AppError(
      'Hay correos o códigos repetidos dentro de la inscripción',
      400,
      'PUBLIC_REGISTRATION_DUPLICATED_MEMBERS'
    );
  }

  if (tournament.mode === CompetitionMode.TEAM) {
    if (!input.teamName) {
      throw new AppError('Debes escribir el nombre del equipo', 400, 'TEAM_NAME_REQUIRED');
    }

    if (input.members.length < 2) {
      throw new AppError('Un equipo debe tener al menos dos integrantes', 400, 'TEAM_MIN_MEMBERS');
    }

    if (tournament.maxMembersPerTeam && input.members.length > tournament.maxMembersPerTeam) {
      throw new AppError('El equipo supera el maximo de integrantes', 400, 'TEAM_MEMBER_LIMIT_REACHED');
    }

    if (input.captainIndex === undefined || input.captainIndex === null) {
      throw new AppError('Debes seleccionar el capitan del equipo', 400, 'TEAM_CAPTAIN_REQUIRED');
    }

    const captainIndex = input.captainIndex;

    if (!input.members[captainIndex]) {
      throw new AppError('Debes seleccionar un capitan válido', 400, 'CAPTAIN_NOT_IN_TEAM');
    }

    await ensureTeamCapacity(prisma, resolvedTournamentId, tournament.maxTeams);
    const members = await normalizeTeamMembers(prisma, {
      members: input.members.map((member, index) => ({
        ...member,
        isCaptain: index === captainIndex,
      })),
    });

    await ensureTeamMembersAreNotInAnotherTeam(prisma, resolvedTournamentId, members);

    const team = await prisma.team.create({
      data: {
        tournamentId: resolvedTournamentId,
        name: input.teamName,
        logoUrl: input.logoUrl || null,
        status: 'APPROVED',
        members: {
          create: members.map((member) => ({
            fullName: member.fullName,
            identifier: member.identifier,
            email: member.email,
            semester: member.semester || null,
            career: member.career || null,
            isCaptain: member.isCaptain,
          })),
        },
      },
      include: teamInclude,
    });

    await createAuditLog({
      prisma,
      action: AuditAction.CREATE,
      entity: 'Team',
      entityId: team.id,
      newValues: { tournamentId: resolvedTournamentId, publicRegistration: true, teamName: team.name, members },
    });

    return { mode: tournament.mode, team, participant: null };
  }

  if (input.members.length !== 1) {
    throw new AppError(
      'Un torneo individual solo permite un participante por inscripción',
      400,
      'INDIVIDUAL_REGISTRATION_ONE_MEMBER'
    );
  }

  await ensureIndividualCapacity(prisma, resolvedTournamentId, tournament.maxParticipants);
  const member = input.members[0];

  await ensureNoDuplicateIndividual(prisma, resolvedTournamentId, {
    email: member.email,
    identifier: member.identifier,
  });
  await ensureVideoGameRestriction(prisma, tournament, {
    email: member.email,
    identifier: member.identifier,
  });

  const participant = await prisma.tournamentParticipant.create({
    data: {
      tournamentId: resolvedTournamentId,
      displayName: member.fullName,
      email: member.email,
      identifier: member.identifier,
      semester: member.semester,
      career: member.career,
      status: 'APPROVED',
    },
    include: participantInclude,
  });

  await createAuditLog({
    prisma,
    action: AuditAction.CREATE,
    entity: 'TournamentParticipant',
    entityId: participant.id,
    newValues: { tournamentId: resolvedTournamentId, publicRegistration: true, displayName: participant.displayName },
  });

  return { mode: tournament.mode, team: null, participant };
}

export async function updateIndividualParticipant(
  tournamentId: string,
  participantId: string,
  input: UpdateIndividualRegistrationInput,
  actorId?: string
) {
  const prisma = requirePrisma();
  const tournament = await getTournamentForRegistration(tournamentId);

  if (tournament.mode !== CompetitionMode.INDIVIDUAL) {
    throw new AppError('Este torneo es por equipos y no permite inscripción individual', 400, 'INVALID_REGISTRATION_MODE');
  }

  const existingParticipant = await prisma.tournamentParticipant.findFirst({
    where: { id: participantId, tournamentId, deletedAt: null },
  });

  if (!existingParticipant) {
    throw new AppError('Participante no encontrado', 404, 'PARTICIPANT_NOT_FOUND');
  }

  await ensureIndividualCapacity(prisma, tournamentId, tournament.maxParticipants, participantId);

  const nextUserId = input.userId === undefined ? existingParticipant.userId : input.userId;
  const user = nextUserId ? (await ensureUsersExist(prisma, [nextUserId]))[0] : null;

  const displayName = user?.name || input.displayName || existingParticipant.displayName;
  const email = user?.email || input.email || existingParticipant.email;
  const identifier = user?.universityCode || input.identifier || existingParticipant.identifier;

  await ensureNoDuplicateIndividual(prisma, tournamentId, { userId: nextUserId, email, identifier }, participantId);
  await ensureVideoGameRestriction(prisma, tournament, { userId: nextUserId, email, identifier }, participantId);

  const participant = await prisma.tournamentParticipant.update({
    where: { id: participantId },
    data: {
      userId: nextUserId || null,
      displayName,
      email,
      identifier,
      status: input.status,
      seed: input.seed === undefined ? undefined : input.seed,
    },
    include: participantInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.UPDATE,
    entity: 'TournamentParticipant',
    entityId: participant.id,
    oldValues: { displayName: existingParticipant.displayName, email: existingParticipant.email },
    newValues: { displayName: participant.displayName, email: participant.email },
  });

  return participant;
}

export async function deleteIndividualParticipant(
  tournamentId: string,
  participantId: string,
  actorId?: string
) {
  const prisma = requirePrisma();
  const participant = await prisma.tournamentParticipant.findFirst({
    where: { id: participantId, tournamentId, deletedAt: null },
  });

  if (!participant) {
    throw new AppError('Participante no encontrado', 404, 'PARTICIPANT_NOT_FOUND');
  }

  await prisma.tournamentParticipant.update({
    where: { id: participantId },
    data: softDeleteData(),
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.DELETE,
    entity: 'TournamentParticipant',
    entityId: participantId,
    oldValues: { tournamentId, displayName: participant.displayName, email: participant.email },
  });
}

function buildGroupNames(groupCount: number) {
  return Array.from({ length: groupCount }, (_, index) => `Grupo ${String.fromCharCode(65 + index)}`);
}

function buildPairs<T extends { id: string }>(items: T[]) {
  const pairs: Array<[T, T]> = [];

  for (let homeIndex = 0; homeIndex < items.length; homeIndex += 1) {
    for (let awayIndex = homeIndex + 1; awayIndex < items.length; awayIndex += 1) {
      pairs.push([items[homeIndex], items[awayIndex]]);
    }
  }

  return pairs;
}

function buildKnockoutPairs<T extends { id: string }>(items: T[]) {
  const pairs: Array<[T, T]> = [];
  const bracketOrder = [...items];

  for (let index = 0; index < Math.floor(bracketOrder.length / 2); index += 1) {
    const home = bracketOrder[index];
    const away = bracketOrder[bracketOrder.length - 1 - index];

    if (home && away) {
      pairs.push([home, away]);
    }
  }

  return pairs;
}

function getKnockoutPhase(totalCompetitors: number) {
  if (totalCompetitors <= 2) {
    return TournamentPhase.FINAL;
  }

  if (totalCompetitors <= 4) {
    return TournamentPhase.SEMIFINAL;
  }

  if (totalCompetitors <= 8) {
    return TournamentPhase.CUARTOS;
  }

  return TournamentPhase.OCTAVOS;
}

async function ensureFixtureCanBeOverwritten(
  prisma: ReturnType<typeof requirePrisma>,
  tournamentId: string,
  overwrite?: boolean
) {
  const existingMatches = await prisma.match.findMany({
    where: {
      tournamentId,
      deletedAt: null,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!existingMatches.length) {
    return;
  }

  if (!overwrite) {
    throw new AppError(
      'El torneo ya tiene partidos generados. Activa sobrescribir para regenerar.',
      400,
      'FIXTURE_ALREADY_EXISTS'
    );
  }

  const hasLockedMatches = existingMatches.some(
    (match) => match.status === MatchStatus.LIVE || match.status === MatchStatus.FINISHED
  );

  if (hasLockedMatches) {
    throw new AppError(
      'No se puede regenerar un fixture con partidos en vivo o finalizados',
      400,
      'FIXTURE_HAS_LOCKED_MATCHES'
    );
  }

  await prisma.match.updateMany({
    where: {
      tournamentId,
      deletedAt: null,
    },
    data: softDeleteData(),
  });
}

export async function generateTournamentGroups(
  tournamentId: string,
  input: GenerateGroupsInput,
  actorId?: string
) {
  const prisma = requirePrisma();
  const tournament = await getTournamentById(tournamentId);

  if (tournament.format !== TournamentFormat.GROUPS && tournament.format !== TournamentFormat.MIXED) {
    throw new AppError('Este formato no requiere grupos', 400, 'GROUPS_NOT_REQUIRED');
  }

  const existingGroups = await prisma.tournamentGroup.findMany({
    where: { tournamentId, deletedAt: null },
    include: {
      teams: { where: { deletedAt: null }, select: { id: true } },
      participants: { where: { deletedAt: null }, select: { id: true } },
    },
  });

  if (existingGroups.length && !input.overwrite) {
    throw new AppError(
      'El torneo ya tiene grupos. Activa sobrescribir para reorganizarlos.',
      400,
      'GROUPS_ALREADY_EXISTS'
    );
  }

  const competitors =
    tournament.mode === CompetitionMode.TEAM
      ? await prisma.team.findMany({
          where: { tournamentId, deletedAt: null },
          orderBy: { createdAt: 'asc' },
        })
      : await prisma.tournamentParticipant.findMany({
          where: { tournamentId, deletedAt: null },
          orderBy: [{ seed: 'asc' }, { createdAt: 'asc' }],
        });

  if (competitors.length < 2) {
    throw new AppError('Necesitas al menos dos inscritos para crear grupos', 400, 'NOT_ENOUGH_COMPETITORS');
  }

  if (input.groupCount > competitors.length) {
    throw new AppError('No puede haber mas grupos que inscritos', 400, 'TOO_MANY_GROUPS');
  }

  await prisma.$transaction(async (tx) => {
    if (existingGroups.length) {
      await tx.match.updateMany({
        where: { tournamentId, deletedAt: null, groupId: { in: existingGroups.map((group) => group.id) } },
        data: softDeleteData(),
      });
      await tx.team.updateMany({
        where: { tournamentId, deletedAt: null },
        data: { groupId: null },
      });
      await tx.tournamentParticipant.updateMany({
        where: { tournamentId, deletedAt: null },
        data: { groupId: null },
      });
      await tx.tournamentGroup.updateMany({
        where: { tournamentId, deletedAt: null },
        data: softDeleteData(),
      });
    }

    const groups = await Promise.all(
      buildGroupNames(input.groupCount).map((name) =>
        tx.tournamentGroup.create({
          data: {
            tournamentId,
            name,
          },
        })
      )
    );

    await Promise.all(
      competitors.map((competitor, index) => {
        const groupId = groups[index % groups.length].id;

        if (tournament.mode === CompetitionMode.TEAM) {
          return tx.team.update({
            where: { id: competitor.id },
            data: { groupId },
          });
        }

        return tx.tournamentParticipant.update({
          where: { id: competitor.id },
          data: { groupId },
        });
      })
    );
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.ADMIN_CHANGE,
    entity: 'TournamentGroup',
    entityId: tournamentId,
    newValues: { tournamentId, groupCount: input.groupCount, overwrite: input.overwrite },
  });

  return getTournamentFixture(tournamentId);
}

export async function getTournamentFixture(tournamentId: string) {
  const prisma = requirePrisma();
  await getTournamentById(tournamentId);

  const [groups, matches] = await Promise.all([
    prisma.tournamentGroup.findMany({
      where: {
        tournamentId,
        deletedAt: null,
      },
      include: groupInclude,
      orderBy: { name: 'asc' },
    }),
    prisma.match.findMany({
      where: {
        tournamentId,
        deletedAt: null,
      },
      include: matchInclude,
      orderBy: [{ phase: 'asc' }, { scheduledAt: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

  return { groups, matches };
}

async function buildFixtureMatchData(
  prisma: ReturnType<typeof requirePrisma>,
  tournament: Awaited<ReturnType<typeof getTournamentById>>
) {
  if (tournament.mode === CompetitionMode.TEAM) {
    const teams = await prisma.team.findMany({
      where: { tournamentId: tournament.id, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });

    if (teams.length < 2) {
      throw new AppError('Necesitas al menos dos equipos para generar partidos', 400, 'NOT_ENOUGH_COMPETITORS');
    }

    if (tournament.format === TournamentFormat.GROUPS || tournament.format === TournamentFormat.MIXED) {
      const groups = await prisma.tournamentGroup.findMany({
        where: { tournamentId: tournament.id, deletedAt: null },
        include: { teams: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } } },
        orderBy: { name: 'asc' },
      });

      if (!groups.length) {
        throw new AppError('Primero debes generar grupos', 400, 'GROUPS_REQUIRED');
      }

      return groups.flatMap((group) =>
        buildPairs(group.teams).map(([home, away]) => ({
          tournamentId: tournament.id,
          groupId: group.id,
          phase: TournamentPhase.FASE_GRUPOS,
          homeTeamId: home.id,
          awayTeamId: away.id,
        }))
      );
    }

    const phase =
      tournament.format === TournamentFormat.KNOCKOUT
        ? getKnockoutPhase(teams.length)
        : TournamentPhase.FASE_GRUPOS;

    const pairs = tournament.format === TournamentFormat.KNOCKOUT ? buildKnockoutPairs(teams) : buildPairs(teams);

    return pairs.map(([home, away]) => ({
      tournamentId: tournament.id,
      phase,
      homeTeamId: home.id,
      awayTeamId: away.id,
    }));
  }

  const participants = await prisma.tournamentParticipant.findMany({
    where: { tournamentId: tournament.id, deletedAt: null },
    orderBy: [{ seed: 'asc' }, { createdAt: 'asc' }],
  });

  if (participants.length < 2) {
    throw new AppError('Necesitas al menos dos participantes para generar partidos', 400, 'NOT_ENOUGH_COMPETITORS');
  }

  if (tournament.format === TournamentFormat.GROUPS || tournament.format === TournamentFormat.MIXED) {
    const groups = await prisma.tournamentGroup.findMany({
      where: { tournamentId: tournament.id, deletedAt: null },
      include: {
        participants: { where: { deletedAt: null }, orderBy: [{ seed: 'asc' }, { createdAt: 'asc' }] },
      },
      orderBy: { name: 'asc' },
    });

    if (!groups.length) {
      throw new AppError('Primero debes generar grupos', 400, 'GROUPS_REQUIRED');
    }

    return groups.flatMap((group) =>
      buildPairs(group.participants).map(([home, away]) => ({
        tournamentId: tournament.id,
        groupId: group.id,
        phase: TournamentPhase.FASE_GRUPOS,
        homeParticipantId: home.id,
        awayParticipantId: away.id,
      }))
    );
  }

  const phase =
    tournament.format === TournamentFormat.KNOCKOUT
      ? getKnockoutPhase(participants.length)
      : TournamentPhase.FASE_GRUPOS;

  const pairs =
    tournament.format === TournamentFormat.KNOCKOUT
      ? buildKnockoutPairs(participants)
      : buildPairs(participants);

  return pairs.map(([home, away]) => ({
    tournamentId: tournament.id,
    phase,
    homeParticipantId: home.id,
    awayParticipantId: away.id,
  }));
}

export async function generateTournamentFixture(
  tournamentId: string,
  input: GenerateFixtureInput,
  actorId?: string
) {
  const prisma = requirePrisma();
  const tournament = await getTournamentById(tournamentId);

  await ensureFixtureCanBeOverwritten(prisma, tournamentId, input.overwrite);
  const matches = await buildFixtureMatchData(prisma, tournament);

  if (!matches.length) {
    throw new AppError('No hay cruces para generar', 400, 'EMPTY_FIXTURE');
  }

  const scheduledStartAt = input.scheduledStartAt ? new Date(input.scheduledStartAt) : null;
  const matchIntervalMinutes = input.matchIntervalMinutes || 60;
  const matchesPerDay = input.matchesPerDay || 1;
  const matchesWithSchedule = matches.map((match, index) => {
    const scheduledAt = scheduledStartAt
      ? new Date(
          scheduledStartAt.getTime() +
            Math.floor(index / matchesPerDay) * 24 * 60 * 60_000 +
            (index % matchesPerDay) * matchIntervalMinutes * 60_000
        )
      : undefined;

    return {
      ...match,
      venueId: input.venueId || tournament.venueId || undefined,
      scheduledAt,
      scheduledEndsAt: scheduledAt
        ? new Date(scheduledAt.getTime() + matchIntervalMinutes * 60_000)
        : undefined,
    };
  });

  await prisma.match.createMany({
    data: matchesWithSchedule,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.MATCH_CREATE,
    entity: 'Match',
    entityId: tournamentId,
    newValues: {
      tournamentId,
      matches: matches.length,
      overwrite: input.overwrite,
      scheduledStartAt: input.scheduledStartAt,
      matchIntervalMinutes,
      matchesPerDay,
    },
  });

  return getTournamentFixture(tournamentId);
}

async function ensureCompetitorsBelongToTournament(
  prisma: ReturnType<typeof requirePrisma>,
  tournament: Awaited<ReturnType<typeof getTournamentById>>,
  input: CreateMatchInput
) {
  if (tournament.mode === CompetitionMode.TEAM) {
    if (!input.homeTeamId || !input.awayTeamId || input.homeTeamId === input.awayTeamId) {
      throw new AppError('Debes seleccionar dos equipos diferentes', 400, 'INVALID_MATCH_TEAMS');
    }

    const teams = await prisma.team.count({
      where: {
        id: { in: [input.homeTeamId, input.awayTeamId] },
        tournamentId: tournament.id,
        deletedAt: null,
      },
    });

    if (teams !== 2) {
      throw new AppError('Uno o mas equipos no pertenecen al torneo', 400, 'TEAM_NOT_IN_TOURNAMENT');
    }

    return;
  }

  if (
    !input.homeParticipantId ||
    !input.awayParticipantId ||
    input.homeParticipantId === input.awayParticipantId
  ) {
    throw new AppError('Debes seleccionar dos participantes diferentes', 400, 'INVALID_MATCH_PARTICIPANTS');
  }

  const participants = await prisma.tournamentParticipant.count({
    where: {
      id: { in: [input.homeParticipantId, input.awayParticipantId] },
      tournamentId: tournament.id,
      deletedAt: null,
    },
  });

  if (participants !== 2) {
    throw new AppError('Uno o mas participantes no pertenecen al torneo', 400, 'PARTICIPANT_NOT_IN_TOURNAMENT');
  }
}

export async function createManualMatch(
  tournamentId: string,
  input: CreateMatchInput,
  actorId?: string
) {
  const prisma = requirePrisma();
  const tournament = await getTournamentById(tournamentId);

  await ensureCompetitorsBelongToTournament(prisma, tournament, input);

  const match = await prisma.match.create({
    data: {
      tournamentId,
      groupId: input.groupId || null,
      venueId: input.venueId || null,
      phase: input.phase,
      scheduledAt: input.scheduledAt || null,
      scheduledEndsAt: input.scheduledEndsAt || null,
      homeTeamId: tournament.mode === CompetitionMode.TEAM ? input.homeTeamId : null,
      awayTeamId: tournament.mode === CompetitionMode.TEAM ? input.awayTeamId : null,
      homeParticipantId:
        tournament.mode === CompetitionMode.INDIVIDUAL ? input.homeParticipantId : null,
      awayParticipantId:
        tournament.mode === CompetitionMode.INDIVIDUAL ? input.awayParticipantId : null,
    },
    include: matchInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.MATCH_CREATE,
    entity: 'Match',
    entityId: match.id,
    newValues: {
      tournamentId,
      phase: match.phase,
      scheduledAt: match.scheduledAt,
      scheduledEndsAt: match.scheduledEndsAt,
    },
  });

  return match;
}

export async function updateMatchSchedule(
  tournamentId: string,
  matchId: string,
  input: UpdateMatchInput,
  actorId?: string
) {
  const prisma = requirePrisma();
  const tournament = await getTournamentById(tournamentId);
  const existingMatch = await prisma.match.findFirst({
    where: { id: matchId, tournamentId, deletedAt: null },
  });

  if (!existingMatch) {
    throw new AppError('Partido no encontrado', 404, 'MATCH_NOT_FOUND');
  }

  const competitorFieldsWereEdited =
    input.homeTeamId !== undefined ||
    input.awayTeamId !== undefined ||
    input.homeParticipantId !== undefined ||
    input.awayParticipantId !== undefined;

  if (competitorFieldsWereEdited) {
    await ensureCompetitorsBelongToTournament(prisma, tournament, {
      groupId: input.groupId === undefined ? existingMatch.groupId : input.groupId,
      venueId: input.venueId === undefined ? existingMatch.venueId : input.venueId,
      phase: input.phase || existingMatch.phase,
      scheduledAt: input.scheduledAt === undefined ? existingMatch.scheduledAt : input.scheduledAt,
      scheduledEndsAt:
        input.scheduledEndsAt === undefined
          ? existingMatch.scheduledEndsAt
          : input.scheduledEndsAt,
      homeTeamId:
        input.homeTeamId === undefined ? existingMatch.homeTeamId : input.homeTeamId,
      awayTeamId:
        input.awayTeamId === undefined ? existingMatch.awayTeamId : input.awayTeamId,
      homeParticipantId:
        input.homeParticipantId === undefined
          ? existingMatch.homeParticipantId
          : input.homeParticipantId,
      awayParticipantId:
        input.awayParticipantId === undefined
          ? existingMatch.awayParticipantId
          : input.awayParticipantId,
    });
  }

  const nextScheduledAt =
    input.scheduledAt === undefined ? existingMatch.scheduledAt : input.scheduledAt;
  const nextScheduledEndsAt =
    input.scheduledEndsAt === undefined ? existingMatch.scheduledEndsAt : input.scheduledEndsAt;

  if (nextScheduledAt && nextScheduledEndsAt && nextScheduledEndsAt <= nextScheduledAt) {
    throw new AppError(
      'La hora de fin debe ser posterior a la hora de inicio',
      400,
      'INVALID_MATCH_END_TIME'
    );
  }

  const match = await prisma.match.update({
    where: { id: matchId },
    data: {
      groupId: input.groupId === undefined ? undefined : input.groupId,
      venueId: input.venueId === undefined ? undefined : input.venueId,
      phase: input.phase,
      scheduledAt: input.scheduledAt === undefined ? undefined : input.scheduledAt,
      scheduledEndsAt: input.scheduledEndsAt === undefined ? undefined : input.scheduledEndsAt,
      status: competitorFieldsWereEdited ? MatchStatus.SCHEDULED : input.status,
      homeTeamId:
        tournament.mode === CompetitionMode.TEAM && input.homeTeamId !== undefined
          ? input.homeTeamId
          : undefined,
      awayTeamId:
        tournament.mode === CompetitionMode.TEAM && input.awayTeamId !== undefined
          ? input.awayTeamId
          : undefined,
      homeParticipantId:
        tournament.mode === CompetitionMode.INDIVIDUAL && input.homeParticipantId !== undefined
          ? input.homeParticipantId
          : undefined,
      awayParticipantId:
        tournament.mode === CompetitionMode.INDIVIDUAL && input.awayParticipantId !== undefined
          ? input.awayParticipantId
          : undefined,
      winnerTeamId: competitorFieldsWereEdited ? null : undefined,
      winnerParticipantId: competitorFieldsWereEdited ? null : undefined,
      homeScore: competitorFieldsWereEdited ? 0 : undefined,
      awayScore: competitorFieldsWereEdited ? 0 : undefined,
      startedAt: competitorFieldsWereEdited ? null : undefined,
      finishedAt: competitorFieldsWereEdited ? null : undefined,
    },
    include: matchInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.MATCH_UPDATE,
    entity: 'Match',
    entityId: match.id,
    oldValues: {
      scheduledAt: existingMatch.scheduledAt,
      scheduledEndsAt: existingMatch.scheduledEndsAt,
      status: existingMatch.status,
    },
    newValues: {
      scheduledAt: match.scheduledAt,
      scheduledEndsAt: match.scheduledEndsAt,
      status: match.status,
    },
  });

  if (competitorFieldsWereEdited) {
    await recalculateTournamentStandings(prisma, tournamentId);
  }

  return match;
}

type StandingAccumulator = {
  tournamentId: string;
  groupId: string | null;
  teamId?: string | null;
  participantId?: string | null;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  rank?: number;
  qualified: boolean;
};

function standingKey(groupId: string | null, competitorId: string) {
  return `${groupId || 'general'}:${competitorId}`;
}

function compareStandings(a: StandingAccumulator, b: StandingAccumulator) {
  return (
    b.points - a.points ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor ||
    a.goalsAgainst - b.goalsAgainst ||
    a.name.localeCompare(b.name)
  );
}

async function recalculateTournamentStandings(
  prisma: ReturnType<typeof requirePrisma>,
  tournamentId: string
) {
  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, deletedAt: null },
  });

  if (!tournament) {
    throw new AppError('Torneo no encontrado', 404, 'TOURNAMENT_NOT_FOUND');
  }

  const standings = new Map<string, StandingAccumulator>();

  if (tournament.mode === CompetitionMode.TEAM) {
    const teams = await prisma.team.findMany({
      where: { tournamentId, deletedAt: null },
      orderBy: { name: 'asc' },
    });

    for (const team of teams) {
      standings.set(standingKey(team.groupId, team.id), {
        tournamentId,
        groupId: team.groupId,
        teamId: team.id,
        participantId: null,
        name: team.name,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        qualified: false,
      });
    }
  } else {
    const participants = await prisma.tournamentParticipant.findMany({
      where: { tournamentId, deletedAt: null },
      orderBy: [{ seed: 'asc' }, { displayName: 'asc' }],
    });

    for (const participant of participants) {
      standings.set(standingKey(participant.groupId, participant.id), {
        tournamentId,
        groupId: participant.groupId,
        teamId: null,
        participantId: participant.id,
        name: participant.displayName,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        qualified: false,
      });
    }
  }

  const matches = await prisma.match.findMany({
    where: {
      tournamentId,
      deletedAt: null,
      status: MatchStatus.FINISHED,
    },
  });

  for (const match of matches) {
    const homeId = tournament.mode === CompetitionMode.TEAM ? match.homeTeamId : match.homeParticipantId;
    const awayId = tournament.mode === CompetitionMode.TEAM ? match.awayTeamId : match.awayParticipantId;

    if (!homeId || !awayId) {
      continue;
    }

    const home = standings.get(standingKey(match.groupId, homeId));
    const away = standings.get(standingKey(match.groupId, awayId));

    if (!home || !away) {
      continue;
    }

    home.played += 1;
    away.played += 1;
    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.won += 1;
      away.lost += 1;
      home.points += tournament.pointsWin;
      away.points += tournament.pointsLoss;
    } else if (match.homeScore < match.awayScore) {
      away.won += 1;
      home.lost += 1;
      away.points += tournament.pointsWin;
      home.points += tournament.pointsLoss;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += tournament.pointsDraw;
      away.points += tournament.pointsDraw;
    }

    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;
  }

  const grouped = Array.from(standings.values()).reduce<Record<string, StandingAccumulator[]>>(
    (acc, standing) => {
      const key = standing.groupId || 'general';
      acc[key] = acc[key] || [];
      acc[key].push(standing);
      return acc;
    },
    {}
  );

  for (const groupStandings of Object.values(grouped)) {
    groupStandings.sort(compareStandings);
    groupStandings.forEach((standing, index) => {
      standing.rank = index + 1;
      standing.qualified =
        tournament.format === TournamentFormat.GROUPS || tournament.format === TournamentFormat.MIXED
          ? index < 2
          : index === 0;
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.tournamentStanding.deleteMany({ where: { tournamentId } });
    await tx.tournamentStanding.createMany({
      data: Array.from(standings.values()).map((standing) => ({
        tournamentId,
        groupId: standing.groupId,
        teamId: standing.teamId || null,
        participantId: standing.participantId || null,
        played: standing.played,
        won: standing.won,
        drawn: standing.drawn,
        lost: standing.lost,
        points: standing.points,
        goalsFor: standing.goalsFor,
        goalsAgainst: standing.goalsAgainst,
        goalDifference: standing.goalDifference,
        rank: standing.rank,
        qualified: standing.qualified,
      })),
    });
  });
}

function getWinnerData(
  tournament: Awaited<ReturnType<typeof getTournamentById>>,
  match: Prisma.MatchGetPayload<{}>,
  input: ScoreMatchInput
) {
  if (input.homeScore === input.awayScore) {
    if (!tournament.allowsDraws) {
      throw new AppError('Este torneo no permite empates', 400, 'DRAW_NOT_ALLOWED');
    }

    return {
      winnerTeamId: null,
      winnerParticipantId: null,
    };
  }

  const homeWins = input.homeScore > input.awayScore;

  return tournament.mode === CompetitionMode.TEAM
    ? {
        winnerTeamId: homeWins ? match.homeTeamId : match.awayTeamId,
        winnerParticipantId: null,
      }
    : {
        winnerTeamId: null,
        winnerParticipantId: homeWins ? match.homeParticipantId : match.awayParticipantId,
    };
}

function ensureMatchHasBothCompetitors(
  tournament: Awaited<ReturnType<typeof getTournamentById>>,
  match: Prisma.MatchGetPayload<{}>
) {
  const hasBothCompetitors =
    tournament.mode === CompetitionMode.TEAM
      ? Boolean(match.homeTeamId && match.awayTeamId)
      : Boolean(match.homeParticipantId && match.awayParticipantId);

  if (!hasBothCompetitors) {
    throw new AppError(
      'El partido aún no tiene los dos competidores definidos',
      400,
      'MATCH_COMPETITORS_PENDING'
    );
  }
}

function getNextKnockoutPhase(phase: TournamentPhase) {
  const nextPhaseByCurrentPhase: Partial<Record<TournamentPhase, TournamentPhase>> = {
    [TournamentPhase.OCTAVOS]: TournamentPhase.CUARTOS,
    [TournamentPhase.CUARTOS]: TournamentPhase.SEMIFINAL,
    [TournamentPhase.SEMIFINAL]: TournamentPhase.FINAL,
  };

  return nextPhaseByCurrentPhase[phase] || null;
}

async function advanceWinnerToNextKnockoutMatch(
  prisma: ReturnType<typeof requirePrisma>,
  tournament: Awaited<ReturnType<typeof getTournamentById>>,
  match: Prisma.MatchGetPayload<{}>
) {
  const nextPhase = getNextKnockoutPhase(match.phase);

  if (!nextPhase) {
    return;
  }

  const winnerId =
    tournament.mode === CompetitionMode.TEAM ? match.winnerTeamId : match.winnerParticipantId;

  if (!winnerId) {
    return;
  }

  const phaseMatches = await prisma.match.findMany({
    where: {
      tournamentId: tournament.id,
      phase: match.phase,
      deletedAt: null,
    },
    orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
    select: { id: true },
  });
  const matchIndex = phaseMatches.findIndex((phaseMatch) => phaseMatch.id === match.id);

  if (matchIndex < 0) {
    return;
  }

  const nextMatchIndex = Math.floor(matchIndex / 2);
  const winnerGoesHome = matchIndex % 2 === 0;
  const nextPhaseMatches = await prisma.match.findMany({
    where: {
      tournamentId: tournament.id,
      phase: nextPhase,
      deletedAt: null,
    },
    orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
    select: { id: true },
  });
  const orderedNextPhaseMatches = [...nextPhaseMatches];
  const createPlaceholderData = {
    tournamentId: tournament.id,
    venueId: match.venueId || tournament.venueId || null,
    phase: nextPhase,
    status: MatchStatus.SCHEDULED,
  };

  while (orderedNextPhaseMatches.length <= nextMatchIndex) {
    const placeholder = await prisma.match.create({
      data: createPlaceholderData,
      select: { id: true },
    });
    orderedNextPhaseMatches.push(placeholder);
  }

  const nextMatch = orderedNextPhaseMatches[nextMatchIndex];
  const teamData =
    tournament.mode === CompetitionMode.TEAM
      ? {
          homeTeamId: winnerGoesHome ? winnerId : undefined,
          awayTeamId: winnerGoesHome ? undefined : winnerId,
        }
      : {};
  const participantData =
    tournament.mode === CompetitionMode.INDIVIDUAL
      ? {
          homeParticipantId: winnerGoesHome ? winnerId : undefined,
          awayParticipantId: winnerGoesHome ? undefined : winnerId,
        }
      : {};

  await prisma.match.update({
    where: { id: nextMatch.id },
    data: {
      ...teamData,
      ...participantData,
    },
  });
}

export async function updateMatchScore(
  tournamentId: string,
  matchId: string,
  input: ScoreMatchInput,
  actorId?: string
) {
  const prisma = requirePrisma();
  const existingMatch = await prisma.match.findFirst({
    where: { id: matchId, tournamentId, deletedAt: null },
  });

  if (!existingMatch) {
    throw new AppError('Partido no encontrado', 404, 'MATCH_NOT_FOUND');
  }

  if (existingMatch.status === MatchStatus.FINISHED) {
    throw new AppError('No puedes editar marcador de un partido finalizado', 400, 'MATCH_ALREADY_FINISHED');
  }

  const tournament = await getTournamentById(tournamentId);
  ensureMatchHasBothCompetitors(tournament, existingMatch);

  const match = await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore: input.homeScore,
      awayScore: input.awayScore,
      status: MatchStatus.LIVE,
      startedAt: existingMatch.startedAt || new Date(),
    },
    include: matchInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.MATCH_UPDATE,
    entity: 'Match',
    entityId: match.id,
    oldValues: { homeScore: existingMatch.homeScore, awayScore: existingMatch.awayScore },
    newValues: { homeScore: match.homeScore, awayScore: match.awayScore, status: match.status },
  });

  return match;
}

export async function closeMatch(
  tournamentId: string,
  matchId: string,
  input: ScoreMatchInput,
  actorId?: string
) {
  const prisma = requirePrisma();
  const tournament = await getTournamentById(tournamentId);
  const existingMatch = await prisma.match.findFirst({
    where: { id: matchId, tournamentId, deletedAt: null },
  });

  if (!existingMatch) {
    throw new AppError('Partido no encontrado', 404, 'MATCH_NOT_FOUND');
  }

  if (existingMatch.status === MatchStatus.FINISHED) {
    throw new AppError('El partido ya está cerrado', 400, 'MATCH_ALREADY_FINISHED');
  }

  ensureMatchHasBothCompetitors(tournament, existingMatch);
  const winnerData = getWinnerData(tournament, existingMatch, input);
  const match = await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore: input.homeScore,
      awayScore: input.awayScore,
      status: MatchStatus.FINISHED,
      startedAt: existingMatch.startedAt || new Date(),
      finishedAt: new Date(),
      ...winnerData,
    },
    include: matchInclude,
  });

  await advanceWinnerToNextKnockoutMatch(prisma, tournament, match);
  await recalculateTournamentStandings(prisma, tournamentId);

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.MATCH_UPDATE,
    entity: 'Match',
    entityId: match.id,
    oldValues: { status: existingMatch.status, homeScore: existingMatch.homeScore, awayScore: existingMatch.awayScore },
    newValues: { status: match.status, homeScore: match.homeScore, awayScore: match.awayScore },
  });

  return match;
}

export async function getTournamentStandings(tournamentId: string) {
  const prisma = requirePrisma();
  await getTournamentById(tournamentId);

  return prisma.tournamentStanding.findMany({
    where: { tournamentId },
    include: standingInclude,
    orderBy: [{ group: { name: 'asc' } }, { rank: 'asc' }, { points: 'desc' }],
  });
}

export async function refreshTournamentStandings(tournamentId: string, actorId?: string) {
  const prisma = requirePrisma();

  await recalculateTournamentStandings(prisma, tournamentId);

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.ADMIN_CHANGE,
    entity: 'TournamentStanding',
    entityId: tournamentId,
    newValues: { recalculated: true },
  });

  return getTournamentStandings(tournamentId);
}

export async function updateTournamentStanding(
  tournamentId: string,
  standingId: string,
  input: UpdateStandingInput,
  actorId?: string
) {
  const prisma = requirePrisma();
  await getTournamentById(tournamentId);

  const existingStanding = await prisma.tournamentStanding.findFirst({
    where: { id: standingId, tournamentId },
    include: standingInclude,
  });

  if (!existingStanding) {
    throw new AppError('Registro de tabla no encontrado', 404, 'STANDING_NOT_FOUND');
  }

  const standing = await prisma.tournamentStanding.update({
    where: { id: standingId },
    data: {
      points: input.points,
      rank: input.rank === undefined ? undefined : input.rank,
      qualified: input.qualified,
    },
    include: standingInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.ADMIN_CHANGE,
    entity: 'TournamentStanding',
    entityId: standing.id,
    oldValues: {
      points: existingStanding.points,
      rank: existingStanding.rank,
      qualified: existingStanding.qualified,
    },
    newValues: {
      points: standing.points,
      rank: standing.rank,
      qualified: standing.qualified,
    },
  });

  return standing;
}

export async function buildTournamentExcelReport(tournamentId: string) {
  const tournament = await getTournamentById(tournamentId);
  const [registrations, standings, fixture] = await Promise.all([
    getTournamentRegistrations(tournamentId),
    getTournamentStandings(tournamentId),
    getTournamentFixture(tournamentId),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Semana de Ingeniería';
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet('Resumen');
  summarySheet.columns = [
    { header: 'Campo', key: 'field', width: 28 },
    { header: 'Valor', key: 'value', width: 48 },
  ];
  summarySheet.addRows([
    { field: 'Torneo', value: tournament.name },
    { field: 'Deporte', value: tournament.sport },
    { field: 'Modalidad', value: tournament.mode },
    { field: 'Formato', value: tournament.format },
    { field: 'Estado', value: tournament.status },
    { field: 'Equipos inscritos', value: registrations.teams.length },
    { field: 'Participantes individuales', value: registrations.participants.length },
    { field: 'Partidos', value: fixture.matches.length },
    { field: 'Generado', value: new Date().toISOString() },
  ]);

  if (tournament.mode === CompetitionMode.TEAM) {
    const teamsSheet = workbook.addWorksheet('Equipos');
    teamsSheet.columns = [
      { header: 'Equipo', key: 'team', width: 32 },
      { header: 'Estado', key: 'status', width: 16 },
      { header: 'Capitan', key: 'captain', width: 32 },
      { header: 'Integrantes', key: 'members', width: 14 },
      { header: 'Escudo', key: 'logo', width: 42 },
    ];

    registrations.teams.forEach((team) => {
      const captain = team.members.find((member) => member.isCaptain);
      teamsSheet.addRow({
        team: team.name,
        status: team.status,
        captain: captain?.fullName || captain?.user?.name || team.captain?.name || '',
        members: team.members.length,
        logo: team.logoUrl || '',
      });
    });

    const membersSheet = workbook.addWorksheet('Integrantes');
    membersSheet.columns = [
      { header: 'Equipo', key: 'team', width: 32 },
      { header: 'Nombre', key: 'name', width: 32 },
      { header: 'Código o cédula', key: 'identifier', width: 22 },
      { header: 'Correo', key: 'email', width: 34 },
      { header: 'Capitan', key: 'captain', width: 12 },
    ];

    registrations.teams.forEach((team) => {
      team.members.forEach((member) => {
        membersSheet.addRow({
          team: team.name,
          name: member.fullName || member.user?.name || '',
          identifier: member.identifier || member.user?.universityCode || '',
          email: member.email || member.user?.email || '',
          captain: member.isCaptain ? 'Si' : 'No',
        });
      });
    });
  } else {
    const participantsSheet = workbook.addWorksheet('Participantes');
    participantsSheet.columns = [
      { header: 'Nombre', key: 'name', width: 32 },
      { header: 'Código o cédula', key: 'identifier', width: 22 },
      { header: 'Correo', key: 'email', width: 34 },
      { header: 'Estado', key: 'status', width: 16 },
      { header: 'Semilla', key: 'seed', width: 12 },
    ];

    registrations.participants.forEach((participant) => {
      participantsSheet.addRow({
        name: participant.displayName,
        identifier: participant.identifier || participant.user?.universityCode || '',
        email: participant.email || participant.user?.email || '',
        status: participant.status,
        seed: participant.seed || '',
      });
    });
  }

  const rankingSheet = workbook.addWorksheet('Ranking');
  rankingSheet.columns = [
    { header: 'Grupo', key: 'group', width: 18 },
    { header: 'Posicion', key: 'rank', width: 10 },
    { header: 'Competidor', key: 'name', width: 32 },
    { header: 'PJ', key: 'played', width: 8 },
    { header: 'G', key: 'won', width: 8 },
    { header: 'E', key: 'drawn', width: 8 },
    { header: 'P', key: 'lost', width: 8 },
    { header: 'Puntos', key: 'points', width: 10 },
    { header: 'Favor', key: 'goalsFor', width: 10 },
    { header: 'Contra', key: 'goalsAgainst', width: 10 },
    { header: 'Diferencia', key: 'goalDifference', width: 12 },
    { header: 'Clasifica', key: 'qualified', width: 12 },
  ];

  standings.forEach((standing) => {
    rankingSheet.addRow({
      group: standing.group?.name || 'General',
      rank: standing.rank || '',
      name: standing.team?.name || standing.participant?.displayName || '',
      played: standing.played,
      won: standing.won,
      drawn: standing.drawn,
      lost: standing.lost,
      points: standing.points,
      goalsFor: standing.goalsFor,
      goalsAgainst: standing.goalsAgainst,
      goalDifference: standing.goalDifference,
      qualified: standing.qualified ? 'Si' : 'No',
    });
  });

  const matchesSheet = workbook.addWorksheet('Partidos');
  matchesSheet.columns = [
    { header: 'Fase', key: 'phase', width: 18 },
    { header: 'Grupo', key: 'group', width: 18 },
    { header: 'Local', key: 'home', width: 32 },
    { header: 'Visitante', key: 'away', width: 32 },
    { header: 'Marcador', key: 'score', width: 12 },
    { header: 'Estado', key: 'status', width: 16 },
    { header: 'Ganador', key: 'winner', width: 32 },
    { header: 'Inicio', key: 'scheduledAt', width: 22 },
    { header: 'Fin', key: 'scheduledEndsAt', width: 22 },
  ];

  fixture.matches.forEach((match) => {
    matchesSheet.addRow({
      phase: match.phase,
      group: match.group?.name || '',
      home: match.homeTeam?.name || match.homeParticipant?.displayName || '',
      away: match.awayTeam?.name || match.awayParticipant?.displayName || '',
      score: `${match.homeScore} - ${match.awayScore}`,
      status: match.status,
      winner: match.winnerTeam?.name || match.winnerParticipant?.displayName || '',
      scheduledAt: match.scheduledAt ? match.scheduledAt.toISOString() : '',
      scheduledEndsAt: match.scheduledEndsAt ? match.scheduledEndsAt.toISOString() : '',
    });
  });

  for (const worksheet of workbook.worksheets) {
    worksheet.getRow(1).font = { bold: true };
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return {
    fileName: `${tournament.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-torneo.xlsx`,
    buffer: Buffer.from(buffer),
  };
}
