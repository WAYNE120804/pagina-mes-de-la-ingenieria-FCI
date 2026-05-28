import client from './client';
import { endpoints } from './endpoints';
import type { Venue } from './venues.api';

export type Tournament = {
  id: string;
  venueId?: string | null;
  name: string;
  sport: string;
  mode: string;
  videoGameTitle?: string | null;
  rulePreset: string;
  format: string;
  status: string;
  description?: string | null;
  rules?: string | null;
  maxTeams?: number | null;
  maxMembersPerTeam?: number | null;
  maxParticipants?: number | null;
  allowsDraws: boolean;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  startsAt?: string | null;
  endsAt?: string | null;
  venue?: Venue | null;
  _count?: {
    groups: number;
    teams: number;
    participants: number;
    matches: number;
  };
};

export type TournamentTeam = {
  id: string;
  name: string;
  logoUrl?: string | null;
  status: string;
  captainId?: string | null;
  captain?: {
    id: string;
    name: string;
    email: string;
    universityCode?: string | null;
  } | null;
  members: Array<{
    id: string;
    userId?: string | null;
    fullName?: string | null;
    identifier?: string | null;
    email?: string | null;
    isCaptain: boolean;
    user?: {
      id: string;
      name: string;
      email: string;
      universityCode?: string | null;
      program?: {
        name: string;
        code?: string | null;
      } | null;
    };
  }>;
  _count?: {
    members: number;
    homeMatches: number;
    awayMatches: number;
  };
};

export type TournamentParticipant = {
  id: string;
  userId?: string | null;
  displayName: string;
  email?: string | null;
  identifier?: string | null;
  status: string;
  seed?: number | null;
  user?: {
    id: string;
    name: string;
    email: string;
    universityCode?: string | null;
    program?: {
      name: string;
      code?: string | null;
    } | null;
  } | null;
};

export type TournamentRegistrations = {
  teams: TournamentTeam[];
  participants: TournamentParticipant[];
};

export type PublicTournamentForm = {
  tournament: {
    id: string;
    name: string;
    sport: string;
    mode: string;
    status: string;
    maxTeams?: number | null;
    maxMembersPerTeam?: number | null;
    maxParticipants?: number | null;
    startsAt?: string | null;
    endsAt?: string | null;
  };
  url: string;
};

export type PublicTournamentOverview = Tournament & {
  matches: TournamentMatch[];
  standings: TournamentStanding[];
};

export type TournamentGroup = {
  id: string;
  name: string;
  teams: TournamentTeam[];
  participants: TournamentParticipant[];
};

export type TournamentMatch = {
  id: string;
  groupId?: string | null;
  venueId?: string | null;
  phase: string;
  status: string;
  scheduledAt?: string | null;
  homeScore: number;
  awayScore: number;
  group?: {
    id: string;
    name: string;
  } | null;
  venue?: Venue | null;
  homeTeam?: {
    id: string;
    name: string;
  } | null;
  awayTeam?: {
    id: string;
    name: string;
  } | null;
  winnerTeam?: {
    id: string;
    name: string;
  } | null;
  homeParticipant?: {
    id: string;
    displayName: string;
  } | null;
  awayParticipant?: {
    id: string;
    displayName: string;
  } | null;
  winnerParticipant?: {
    id: string;
    displayName: string;
  } | null;
};

export type TournamentFixture = {
  groups: TournamentGroup[];
  matches: TournamentMatch[];
};

export type TournamentStanding = {
  id: string;
  groupId?: string | null;
  teamId?: string | null;
  participantId?: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  rank?: number | null;
  qualified: boolean;
  group?: {
    id: string;
    name: string;
  } | null;
  team?: {
    id: string;
    name: string;
  } | null;
  participant?: {
    id: string;
    displayName: string;
  } | null;
};

export type TournamentInput = {
  name: string;
  sport: string;
  mode?: string;
  videoGameTitle?: string | null;
  rulePreset?: string;
  format: string;
  status: string;
  description?: string | null;
  rules?: string | null;
  maxTeams?: number | null;
  maxMembersPerTeam?: number | null;
  maxParticipants?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  venueId?: string | null;
};

export type TeamRegistrationInput = {
  name: string;
  logoUrl?: string | null;
  captainId?: string | null;
  memberIds?: string[];
  members?: Array<{
    userId?: string | null;
    fullName: string;
    identifier: string;
    email: string;
    isCaptain?: boolean;
  }>;
  status?: string;
};

export type IndividualRegistrationInput = {
  userId?: string | null;
  displayName?: string;
  email?: string | null;
  identifier?: string | null;
  status?: string;
  seed?: number | null;
};

export type CreateMatchInput = {
  groupId?: string | null;
  venueId?: string | null;
  homeTeamId?: string | null;
  awayTeamId?: string | null;
  homeParticipantId?: string | null;
  awayParticipantId?: string | null;
  phase: string;
  scheduledAt?: string | null;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export async function listTournamentsRequest(filters?: {
  search?: string;
  sport?: string;
  mode?: string;
  status?: string;
}) {
  const response = await client.get<ApiResponse<Tournament[]>>(endpoints.tournaments.list(), {
    params: filters,
  });

  return response.data.data;
}

export async function createTournamentRequest(input: TournamentInput) {
  const response = await client.post<ApiResponse<Tournament>>(endpoints.tournaments.create(), input);

  return response.data.data;
}

export async function updateTournamentRequest(id: string, input: Partial<TournamentInput>) {
  const response = await client.patch<ApiResponse<Tournament>>(
    endpoints.tournaments.detail(id),
    input
  );

  return response.data.data;
}

export async function deleteTournamentRequest(id: string) {
  await client.delete(endpoints.tournaments.detail(id));
}

export async function getTournamentRegistrationsRequest(id: string) {
  const response = await client.get<ApiResponse<TournamentRegistrations>>(
    endpoints.tournaments.registrations(id)
  );

  return response.data.data;
}

export async function getTournamentFixtureRequest(id: string) {
  const response = await client.get<ApiResponse<TournamentFixture>>(
    endpoints.tournaments.fixture(id)
  );

  return response.data.data;
}

export async function generateTournamentGroupsRequest(
  id: string,
  input: { groupCount: number; overwrite?: boolean }
) {
  const response = await client.post<ApiResponse<TournamentFixture>>(
    endpoints.tournaments.generateGroups(id),
    input
  );

  return response.data.data;
}

export async function generateTournamentFixtureRequest(
  id: string,
  input: {
    overwrite?: boolean;
    scheduledStartAt?: string | null;
    matchIntervalMinutes?: number;
    matchesPerDay?: number;
    venueId?: string | null;
  }
) {
  const response = await client.post<ApiResponse<TournamentFixture>>(
    endpoints.tournaments.generateFixture(id),
    input
  );

  return response.data.data;
}

export async function createManualMatchRequest(id: string, input: CreateMatchInput) {
  const response = await client.post<ApiResponse<TournamentMatch>>(
    endpoints.tournaments.matches(id),
    input
  );

  return response.data.data;
}

export async function updateMatchScheduleRequest(
  id: string,
  matchId: string,
  input: {
    groupId?: string | null;
    venueId?: string | null;
    homeTeamId?: string | null;
    awayTeamId?: string | null;
    homeParticipantId?: string | null;
    awayParticipantId?: string | null;
    phase?: string;
    scheduledAt?: string | null;
    status?: string;
  }
) {
  const response = await client.patch<ApiResponse<TournamentMatch>>(
    endpoints.tournaments.matchDetail(id, matchId),
    input
  );

  return response.data.data;
}

export async function updateMatchScoreRequest(
  id: string,
  matchId: string,
  input: { homeScore: number; awayScore: number }
) {
  const response = await client.patch<ApiResponse<TournamentMatch>>(
    endpoints.tournaments.matchScore(id, matchId),
    input
  );

  return response.data.data;
}

export async function closeMatchRequest(
  id: string,
  matchId: string,
  input: { homeScore: number; awayScore: number }
) {
  const response = await client.post<ApiResponse<TournamentMatch>>(
    endpoints.tournaments.matchClose(id, matchId),
    input
  );

  return response.data.data;
}

export async function getTournamentStandingsRequest(id: string) {
  const response = await client.get<ApiResponse<TournamentStanding[]>>(
    endpoints.tournaments.standings(id)
  );

  return response.data.data;
}

export async function recalculateTournamentStandingsRequest(id: string) {
  const response = await client.post<ApiResponse<TournamentStanding[]>>(
    endpoints.tournaments.recalculateStandings(id)
  );

  return response.data.data;
}

export async function exportTournamentExcelRequest(id: string) {
  const response = await client.get<Blob>(endpoints.tournaments.exportExcel(id), {
    responseType: 'blob',
  });

  return response.data;
}

export async function registerTeamRequest(id: string, input: TeamRegistrationInput) {
  const response = await client.post<ApiResponse<TournamentTeam>>(
    endpoints.tournaments.teams(id),
    input
  );

  return response.data.data;
}

export async function updateTeamRegistrationRequest(
  id: string,
  teamId: string,
  input: Partial<TeamRegistrationInput>
) {
  const response = await client.patch<ApiResponse<TournamentTeam>>(
    endpoints.tournaments.teamDetail(id, teamId),
    input
  );

  return response.data.data;
}

export async function deleteTeamRegistrationRequest(id: string, teamId: string) {
  await client.delete(endpoints.tournaments.teamDetail(id, teamId));
}

export async function registerIndividualParticipantRequest(
  id: string,
  input: IndividualRegistrationInput
) {
  const response = await client.post<ApiResponse<TournamentParticipant>>(
    endpoints.tournaments.participants(id),
    input
  );

  return response.data.data;
}

export async function updateIndividualParticipantRequest(
  id: string,
  participantId: string,
  input: Partial<IndividualRegistrationInput>
) {
  const response = await client.patch<ApiResponse<TournamentParticipant>>(
    endpoints.tournaments.participantDetail(id, participantId),
    input
  );

  return response.data.data;
}

export async function deleteIndividualParticipantRequest(id: string, participantId: string) {
  await client.delete(endpoints.tournaments.participantDetail(id, participantId));
}

export async function getPublicTournamentFormRequest(
  tournamentId: string,
  origin = window.location.origin
) {
  const response = await client.get<ApiResponse<PublicTournamentForm>>(
    endpoints.public.tournamentForm(tournamentId),
    { params: { origin } }
  );

  return response.data.data;
}

export async function listPublicTournamentsRequest() {
  const response = await client.get<ApiResponse<PublicTournamentOverview[]>>(
    endpoints.public.tournaments()
  );

  return response.data.data;
}

export async function getPublicTournamentQrSvgRequest(
  tournamentId: string,
  origin = window.location.origin
) {
  const response = await client.get<string>(endpoints.public.tournamentFormQr(tournamentId), {
    params: { origin },
    responseType: 'text',
  });

  return response.data;
}

export async function publicRegisterTournamentRequest(
  tournamentId: string,
  input: {
    teamName?: string;
    logoUrl?: string | null;
    captainIndex?: number;
    members: Array<{
      fullName: string;
      identifier: string;
      email: string;
      semester: string;
      career: string;
    }>;
  }
) {
  const response = await client.post<ApiResponse<unknown>>(
    endpoints.public.tournamentRegister(tournamentId),
    input
  );

  return response.data.data;
}
