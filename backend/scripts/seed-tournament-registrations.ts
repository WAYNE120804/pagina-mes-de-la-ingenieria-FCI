import 'dotenv/config';

import { CompetitionMode, PrismaClient, TournamentStatus } from '@prisma/client';

const prisma = new PrismaClient();

const footballTeams = [
  'equipo fortinet',
  'DevOps United',
  'Data FC',
  'Industrial City',
  'Logistica Real',
  'Cyber Wolves',
  'Sistemas Athletic',
  'Telecom Stars',
];

const fifaPlayers = [
  'Santiago Rivas',
  'Daniel Vargas',
  'Mariana Lopez',
  'Kevin Arias',
  'Natalia Gomez',
  'Juan Esteban Cano',
  'Valeria Mesa',
  'Cristian Salazar',
];

const codPlayers = [
  'Mateo Hernandez',
  'Julian Ramirez',
  'Laura Cardenas',
  'Simon Quintero',
  'Camila Jaramillo',
  'Esteban Molina',
  'Sara Botero',
  'Miguel Angel Ortiz',
];

function augustDate(day: number, hour: number) {
  return `2026-08-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00-05:00`;
}

async function findTournament(name: string) {
  const tournament = await prisma.tournament.findFirst({ where: { name, deletedAt: null } });

  if (!tournament) {
    throw new Error(`No encontre el torneo "${name}". Crealo primero desde el panel.`);
  }

  return tournament;
}

async function clearTournamentOrganization(tournamentId: string) {
  await prisma.match.deleteMany({ where: { tournamentId } });
  await prisma.tournamentStanding.deleteMany({ where: { tournamentId } });
  await prisma.team.updateMany({ where: { tournamentId }, data: { groupId: null } });
  await prisma.tournamentParticipant.updateMany({ where: { tournamentId }, data: { groupId: null } });
  await prisma.tournamentGroup.deleteMany({ where: { tournamentId } });
}

async function ensureFootballTeams(tournamentId: string) {
  for (const [teamIndex, teamName] of footballTeams.entries()) {
    const existingTeam = await prisma.team.findFirst({
      where: { tournamentId, name: teamName },
      include: { members: true },
    });
    const team = existingTeam
      ? await prisma.team.update({
          where: { id: existingTeam.id },
          data: { status: 'APPROVED', deletedAt: null, groupId: null },
        })
      : await prisma.team.create({
          data: { tournamentId, name: teamName, status: 'APPROVED' },
        });

    for (let memberIndex = 0; memberIndex < 3; memberIndex += 1) {
      const identifier = `FUT-${String(teamIndex + 1).padStart(2, '0')}-${memberIndex + 1}`;
      const fullName = `${teamName} Jugador ${memberIndex + 1}`;
      const email = `${teamName.toLowerCase().replace(/[^a-z0-9]+/g, '.')}.${memberIndex + 1}@demo.umanizales.edu.co`;
      const member = await prisma.teamMember.findFirst({ where: { teamId: team.id, identifier } });

      if (member) {
        await prisma.teamMember.update({
          where: { id: member.id },
          data: {
            fullName,
            email,
            isCaptain: memberIndex === 0,
            semester: String(((teamIndex + memberIndex) % 10) + 1),
            career: 'ING_SISTEMAS_TELECOMUNICACIONES',
          },
        });
      } else {
        await prisma.teamMember.create({
          data: {
            teamId: team.id,
            fullName,
            identifier,
            email,
            isCaptain: memberIndex === 0,
            semester: String(((teamIndex + memberIndex) % 10) + 1),
            career: 'ING_SISTEMAS_TELECOMUNICACIONES',
          },
        });
      }
    }
  }
}

async function ensureParticipants(tournamentId: string, names: string[], prefix: string) {
  for (const [index, name] of names.entries()) {
    const seed = index + 1;
    const identifier = `${prefix}-${String(seed).padStart(3, '0')}`;
    const email = `${prefix.toLowerCase()}.${seed}@demo.umanizales.edu.co`;
    const existing = await prisma.tournamentParticipant.findFirst({
      where: {
        tournamentId,
        OR: [{ identifier }, { email }],
      },
    });

    if (existing) {
      await prisma.tournamentParticipant.update({
        where: { id: existing.id },
        data: {
          displayName: name,
          identifier,
          email,
          seed,
          status: 'APPROVED',
          groupId: null,
          deletedAt: null,
          semester: String(((seed - 1) % 10) + 1),
          career: 'ING_SISTEMAS_TELECOMUNICACIONES',
        },
      });
    } else {
      await prisma.tournamentParticipant.create({
        data: {
          tournamentId,
          displayName: name,
          identifier,
          email,
          seed,
          status: 'APPROVED',
          semester: String(((seed - 1) % 10) + 1),
          career: 'ING_SISTEMAS_TELECOMUNICACIONES',
        },
      });
    }
  }
}

async function prepareFootball() {
  const tournament = await findTournament('Copa FCI');

  await clearTournamentOrganization(tournament.id);
  await ensureFootballTeams(tournament.id);
  await prisma.tournament.update({
    where: { id: tournament.id },
    data: {
      mode: CompetitionMode.TEAM,
      status: TournamentStatus.IN_PROGRESS,
      startsAt: augustDate(12, 14),
      endsAt: augustDate(23, 17),
      maxTeams: 8,
      maxMembersPerTeam: 5,
      description: 'Equipos base listos para organizar partidos en agosto.',
    },
  });
}

async function prepareVideoGame(name: string, players: string[], prefix: string, startDay: number) {
  const tournament = await findTournament(name);

  await clearTournamentOrganization(tournament.id);
  await ensureParticipants(tournament.id, players, prefix);
  await prisma.tournament.update({
    where: { id: tournament.id },
    data: {
      mode: CompetitionMode.INDIVIDUAL,
      status: TournamentStatus.IN_PROGRESS,
      startsAt: augustDate(startDay, 10),
      endsAt: augustDate(startDay + 2, 16),
      maxParticipants: 8,
      description: 'Participantes base listos para organizar partidos en agosto.',
    },
  });
}

async function main() {
  await prepareFootball();
  await prepareVideoGame('Copa FIFA PS5', fifaPlayers, 'FIFA', 18);
  await prepareVideoGame('Torneo CALL OF DUTY PS5', codPlayers, 'COD', 25);

  const tournaments = await prisma.tournament.findMany({
    where: {
      name: { in: ['Copa FCI', 'Copa FIFA PS5', 'Torneo CALL OF DUTY PS5'] },
      deletedAt: null,
    },
    include: {
      _count: {
        select: {
          teams: { where: { deletedAt: null } },
          participants: { where: { deletedAt: null } },
          matches: { where: { deletedAt: null } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  console.table(tournaments.map((tournament) => ({
    torneo: tournament.name,
    estado: tournament.status,
    equipos: tournament._count.teams,
    participantes: tournament._count.participants,
    partidos: tournament._count.matches,
    inicio: tournament.startsAt?.toISOString().slice(0, 10),
    fin: tournament.endsAt?.toISOString().slice(0, 10),
  })));
}

main()
  .catch((error) => {
    console.error('No fue posible preparar inscritos base.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
