import {
  CompetitionMode,
  MatchStatus,
  Sport,
  TournamentFormat,
  TournamentPhase,
  TournamentRulePreset,
  TournamentStatus,
  VideoGameTitle,
} from '../../lib/prisma-client';
import { bogotaDateTimeSchema } from '../../utils/datetime';
import { z } from 'zod';

const semesterSchema = z.enum([
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'POSGRADO',
  'NO_APLICA',
]);

const careerSchema = z.enum([
  'ING_SISTEMAS_TELECOMUNICACIONES',
  'ING_ANALITICA_DATOS',
  'ING_INDUSTRIAL',
  'ING_LOGISTICA',
  'ING_SEGURIDAD_INFORMACION',
  'POSGRADOS',
  'NO_APLICA',
]);

export const tournamentIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const tournamentTeamIdParamsSchema = tournamentIdParamsSchema.extend({
  teamId: z.string().uuid(),
});

export const tournamentParticipantIdParamsSchema = tournamentIdParamsSchema.extend({
  participantId: z.string().uuid(),
});

export const publicTournamentParamsSchema = z.object({
  tournamentId: z.string().trim().min(1).max(160),
});

export const tournamentMatchIdParamsSchema = tournamentIdParamsSchema.extend({
  matchId: z.string().uuid(),
});

export const tournamentStandingIdParamsSchema = tournamentIdParamsSchema.extend({
  standingId: z.string().uuid(),
});

export const listTournamentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  sport: z.nativeEnum(Sport).optional(),
  mode: z.nativeEnum(CompetitionMode).optional(),
  status: z.nativeEnum(TournamentStatus).optional(),
});

const tournamentBodySchema = z.object({
  eventId: z.string().uuid().optional().nullable(),
  venueId: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(3),
  sport: z.nativeEnum(Sport),
  mode: z.nativeEnum(CompetitionMode).optional(),
  videoGameTitle: z.nativeEnum(VideoGameTitle).optional().nullable(),
  rulePreset: z.nativeEnum(TournamentRulePreset).optional(),
  format: z.nativeEnum(TournamentFormat),
  status: z.nativeEnum(TournamentStatus).default(TournamentStatus.DRAFT),
  description: z.string().trim().optional().nullable(),
  rules: z.string().trim().optional().nullable(),
  maxTeams: z.number().int().positive().optional().nullable(),
  maxMembersPerTeam: z.number().int().positive().optional().nullable(),
  maxParticipants: z.number().int().positive().optional().nullable(),
  pointsWin: z.number().int().min(0).optional(),
  pointsDraw: z.number().int().min(0).optional(),
  pointsLoss: z.number().int().min(0).optional(),
  allowsDraws: z.boolean().optional(),
  startsAt: bogotaDateTimeSchema.optional().nullable(),
  endsAt: bogotaDateTimeSchema.optional().nullable(),
});

export const createTournamentSchema = tournamentBodySchema.refine(
  (data) => !data.startsAt || !data.endsAt || data.endsAt > data.startsAt,
  {
    message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    path: ['endsAt'],
  }
);

export const updateTournamentSchema = tournamentBodySchema.partial().refine(
  (data) => !data.startsAt || !data.endsAt || data.endsAt > data.startsAt,
  {
    message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    path: ['endsAt'],
  }
);

export const tournamentRegistrationMemberSchema = z.object({
  userId: z.string().uuid().optional().nullable(),
  fullName: z.string().trim().min(2),
  identifier: z.string().trim().min(3),
  email: z.string().email().trim().toLowerCase(),
  semester: semesterSchema.optional().nullable(),
  career: careerSchema.optional().nullable(),
  isCaptain: z.boolean().optional(),
});

const teamRegistrationBodySchema = z.object({
  name: z.string().trim().min(2),
  logoUrl: z.string().trim().max(2_000_000).optional().nullable(),
  captainId: z.string().uuid().optional().nullable(),
  memberIds: z.array(z.string().uuid()).min(1).optional(),
  members: z.array(tournamentRegistrationMemberSchema).min(1).optional(),
  status: z.string().trim().min(2).default('APPROVED'),
});

export const teamRegistrationSchema = teamRegistrationBodySchema.refine((data) => data.memberIds?.length || data.members?.length, {
  message: 'Debes registrar integrantes del equipo',
  path: ['members'],
});

export const updateTeamRegistrationSchema = teamRegistrationBodySchema.partial();

const individualRegistrationBodySchema = z.object({
  userId: z.string().uuid().optional().nullable(),
  displayName: z.string().trim().min(2).optional(),
  email: z.string().email().trim().toLowerCase().optional().nullable(),
  identifier: z.string().trim().min(3).optional().nullable(),
  semester: semesterSchema.optional().nullable(),
  career: careerSchema.optional().nullable(),
  status: z.string().trim().min(2).default('APPROVED'),
  seed: z.number().int().positive().optional().nullable(),
});

export const individualRegistrationSchema = individualRegistrationBodySchema.refine((data) => data.userId || data.displayName, {
  message: 'Debes seleccionar un usuario o escribir el nombre del participante',
  path: ['displayName'],
}).refine((data) => data.userId || data.email, {
  message: 'Debes escribir el correo si no seleccionas un usuario',
  path: ['email'],
});

export const updateIndividualRegistrationSchema = individualRegistrationBodySchema.partial();

export const publicTournamentMemberSchema = z.object({
  fullName: z.string().trim().min(2),
  identifier: z.string().trim().min(3),
  email: z.string().email().trim().toLowerCase(),
  semester: semesterSchema,
  career: careerSchema,
});

export const publicTournamentRegistrationSchema = z.object({
  teamName: z.string().trim().min(2).optional(),
  logoUrl: z.string().trim().max(2_000_000).optional().nullable(),
  captainIndex: z.number().int().min(0).optional(),
  members: z.array(publicTournamentMemberSchema).min(1).max(20),
});

export const generateGroupsSchema = z.object({
  groupCount: z.number().int().min(1).max(16).default(2),
  overwrite: z.boolean().default(false),
});

export const generateFixtureSchema = z.object({
  overwrite: z.boolean().default(false),
  scheduledStartAt: bogotaDateTimeSchema.optional().nullable(),
  matchIntervalMinutes: z.number().int().min(15).max(240).default(60),
  matchesPerDay: z.number().int().min(1).max(12).default(1),
  venueId: z.string().uuid().optional().nullable(),
});

export const createMatchSchema = z.object({
  groupId: z.string().uuid().optional().nullable(),
  venueId: z.string().uuid().optional().nullable(),
  homeTeamId: z.string().uuid().optional().nullable(),
  awayTeamId: z.string().uuid().optional().nullable(),
  homeParticipantId: z.string().uuid().optional().nullable(),
  awayParticipantId: z.string().uuid().optional().nullable(),
  phase: z.nativeEnum(TournamentPhase).default(TournamentPhase.FASE_GRUPOS),
  scheduledAt: bogotaDateTimeSchema.optional().nullable(),
  scheduledEndsAt: bogotaDateTimeSchema.optional().nullable(),
}).refine((data) => {
  const hasTeams = Boolean(data.homeTeamId && data.awayTeamId);
  const hasParticipants = Boolean(data.homeParticipantId && data.awayParticipantId);
  return hasTeams !== hasParticipants;
}, {
  message: 'Debes seleccionar equipos o participantes, no ambos',
  path: ['homeTeamId'],
}).refine((data) => !data.scheduledAt || !data.scheduledEndsAt || data.scheduledEndsAt > data.scheduledAt, {
  message: 'La hora de fin debe ser posterior a la hora de inicio',
  path: ['scheduledEndsAt'],
});

export const updateMatchSchema = z.object({
  groupId: z.string().uuid().optional().nullable(),
  venueId: z.string().uuid().optional().nullable(),
  homeTeamId: z.string().uuid().optional().nullable(),
  awayTeamId: z.string().uuid().optional().nullable(),
  homeParticipantId: z.string().uuid().optional().nullable(),
  awayParticipantId: z.string().uuid().optional().nullable(),
  phase: z.nativeEnum(TournamentPhase).optional(),
  scheduledAt: bogotaDateTimeSchema.optional().nullable(),
  scheduledEndsAt: bogotaDateTimeSchema.optional().nullable(),
  status: z.nativeEnum(MatchStatus).optional(),
}).refine((data) => !data.scheduledAt || !data.scheduledEndsAt || data.scheduledEndsAt > data.scheduledAt, {
  message: 'La hora de fin debe ser posterior a la hora de inicio',
  path: ['scheduledEndsAt'],
});

export const scoreMatchSchema = z.object({
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
});

export const updateStandingSchema = z.object({
  points: z.number().int().min(0).optional(),
  rank: z.number().int().positive().nullable().optional(),
  qualified: z.boolean().optional(),
});

export type ListTournamentsQuery = z.infer<typeof listTournamentsQuerySchema>;
export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;
export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>;
export type TeamRegistrationInput = z.infer<typeof teamRegistrationSchema>;
export type UpdateTeamRegistrationInput = z.infer<typeof updateTeamRegistrationSchema>;
export type IndividualRegistrationInput = z.infer<typeof individualRegistrationSchema>;
export type UpdateIndividualRegistrationInput = z.infer<typeof updateIndividualRegistrationSchema>;
export type PublicTournamentRegistrationInput = z.infer<typeof publicTournamentRegistrationSchema>;
export type GenerateGroupsInput = z.infer<typeof generateGroupsSchema>;
export type GenerateFixtureInput = z.infer<typeof generateFixtureSchema>;
export type CreateMatchInput = z.infer<typeof createMatchSchema>;
export type UpdateMatchInput = z.infer<typeof updateMatchSchema>;
export type ScoreMatchInput = z.infer<typeof scoreMatchSchema>;
export type UpdateStandingInput = z.infer<typeof updateStandingSchema>;
