import client from './client';
import { endpoints } from './endpoints';

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type HackathonEvent = {
  id: string;
  eventId?: string | null;
  name: string;
  status: string;
  description?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  _count?: {
    challenges: number;
    teams: number;
    rubricItems: number;
  };
};

export type Company = {
  id: string;
  name: string;
  contactName?: string | null;
  contactEmail?: string | null;
  _count?: {
    challenges: number;
  };
};

export type HackathonChallenge = {
  id: string;
  hackathonEventId: string;
  companyId?: string | null;
  title: string;
  description: string;
  requirements?: string | null;
  suggestedTech?: string | null;
  company?: Company | null;
  _count?: {
    teams: number;
  };
};

export type HackathonTeam = {
  id: string;
  hackathonEventId: string;
  challengeId?: string | null;
  leaderId?: string | null;
  name: string;
  projectName?: string | null;
  githubUrl?: string | null;
  demoUrl?: string | null;
  finalScore?: string | number | null;
  finalRank?: number | null;
  challenge?: HackathonChallenge | null;
  leader?: {
    id: string;
    name: string;
    email: string;
    universityCode?: string | null;
  } | null;
  members: Array<{
    id: string;
    userId: string;
    isLeader: boolean;
    user: {
      id: string;
      name: string;
      email: string;
      universityCode?: string | null;
      program?: {
        id?: string;
        name: string;
        code?: string | null;
      } | null;
    };
  }>;
  _count?: {
    deliverables: number;
    evaluations: number;
  };
};

export type HackathonDeliverable = {
  id: string;
  hackathonTeamId: string;
  type: string;
  title: string;
  url: string;
  submittedAt: string;
  createdAt: string;
  hackathonTeam?: {
    id: string;
    name: string;
    hackathonEventId: string;
  };
};

export type HackathonEventInput = {
  eventId?: string | null;
  name: string;
  status: string;
  description?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
};

export type CompanyInput = {
  name: string;
  contactName?: string | null;
  contactEmail?: string | null;
};

export type HackathonChallengeInput = {
  companyId?: string | null;
  title: string;
  description: string;
  requirements?: string | null;
  suggestedTech?: string | null;
};

export type HackathonTeamInput = {
  challengeId?: string | null;
  leaderId?: string | null;
  name: string;
  projectName?: string | null;
  githubUrl?: string | null;
  demoUrl?: string | null;
  memberIds: string[];
};

export type HackathonDeliverableInput = {
  type: string;
  title: string;
  url: string;
  submittedAt?: string | null;
};

export async function listHackathonsRequest(filters?: { search?: string; status?: string }) {
  const response = await client.get<ApiResponse<HackathonEvent[]>>(endpoints.hackathon.list(), {
    params: filters,
  });

  return response.data.data;
}

export async function createHackathonRequest(input: HackathonEventInput) {
  const response = await client.post<ApiResponse<HackathonEvent>>(endpoints.hackathon.create(), input);

  return response.data.data;
}

export async function updateHackathonRequest(id: string, input: Partial<HackathonEventInput>) {
  const response = await client.patch<ApiResponse<HackathonEvent>>(endpoints.hackathon.detail(id), input);

  return response.data.data;
}

export async function deleteHackathonRequest(id: string) {
  await client.delete(endpoints.hackathon.detail(id));
}

export async function listCompaniesRequest(filters?: { search?: string }) {
  const response = await client.get<ApiResponse<Company[]>>(endpoints.hackathon.companies(), {
    params: filters,
  });

  return response.data.data;
}

export async function createCompanyRequest(input: CompanyInput) {
  const response = await client.post<ApiResponse<Company>>(endpoints.hackathon.companies(), input);

  return response.data.data;
}

export async function updateCompanyRequest(companyId: string, input: Partial<CompanyInput>) {
  const response = await client.patch<ApiResponse<Company>>(
    endpoints.hackathon.companyDetail(companyId),
    input
  );

  return response.data.data;
}

export async function deleteCompanyRequest(companyId: string) {
  await client.delete(endpoints.hackathon.companyDetail(companyId));
}

export async function listChallengesRequest(hackathonId: string) {
  const response = await client.get<ApiResponse<HackathonChallenge[]>>(
    endpoints.hackathon.challenges(hackathonId)
  );

  return response.data.data;
}

export async function createChallengeRequest(hackathonId: string, input: HackathonChallengeInput) {
  const response = await client.post<ApiResponse<HackathonChallenge>>(
    endpoints.hackathon.challenges(hackathonId),
    input
  );

  return response.data.data;
}

export async function updateChallengeRequest(
  challengeId: string,
  input: Partial<HackathonChallengeInput>
) {
  const response = await client.patch<ApiResponse<HackathonChallenge>>(
    endpoints.hackathon.challengeDetail(challengeId),
    input
  );

  return response.data.data;
}

export async function deleteChallengeRequest(challengeId: string) {
  await client.delete(endpoints.hackathon.challengeDetail(challengeId));
}

export async function listHackathonTeamsRequest(hackathonId: string) {
  const response = await client.get<ApiResponse<HackathonTeam[]>>(
    endpoints.hackathon.teams(hackathonId)
  );

  return response.data.data;
}

export async function createHackathonTeamRequest(hackathonId: string, input: HackathonTeamInput) {
  const response = await client.post<ApiResponse<HackathonTeam>>(
    endpoints.hackathon.teams(hackathonId),
    input
  );

  return response.data.data;
}

export async function updateHackathonTeamRequest(
  hackathonId: string,
  teamId: string,
  input: Partial<HackathonTeamInput>
) {
  const response = await client.patch<ApiResponse<HackathonTeam>>(
    endpoints.hackathon.teamDetail(hackathonId, teamId),
    input
  );

  return response.data.data;
}

export async function deleteHackathonTeamRequest(hackathonId: string, teamId: string) {
  await client.delete(endpoints.hackathon.teamDetail(hackathonId, teamId));
}

export async function listTeamDeliverablesRequest(hackathonId: string, teamId: string) {
  const response = await client.get<ApiResponse<HackathonDeliverable[]>>(
    endpoints.hackathon.deliverables(hackathonId, teamId)
  );

  return response.data.data;
}

export async function createTeamDeliverableRequest(
  hackathonId: string,
  teamId: string,
  input: HackathonDeliverableInput
) {
  const response = await client.post<ApiResponse<HackathonDeliverable>>(
    endpoints.hackathon.deliverables(hackathonId, teamId),
    input
  );

  return response.data.data;
}

export async function updateTeamDeliverableRequest(
  hackathonId: string,
  teamId: string,
  deliverableId: string,
  input: Partial<HackathonDeliverableInput>
) {
  const response = await client.patch<ApiResponse<HackathonDeliverable>>(
    endpoints.hackathon.deliverableDetail(hackathonId, teamId, deliverableId),
    input
  );

  return response.data.data;
}

export async function deleteTeamDeliverableRequest(
  hackathonId: string,
  teamId: string,
  deliverableId: string
) {
  await client.delete(endpoints.hackathon.deliverableDetail(hackathonId, teamId, deliverableId));
}
