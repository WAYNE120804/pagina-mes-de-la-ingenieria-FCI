import client from './client';
import { endpoints } from './endpoints';

export type Speaker = {
  id: string;
  fullName: string;
  email?: string | null;
  company?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
};

export type Talk = {
  id: string;
  topic: string;
  event: {
    id: string;
    title: string;
    startsAt: string;
  };
  speaker?: Speaker | null;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export async function listSpeakersRequest(filters?: { search?: string }) {
  const response = await client.get<ApiResponse<Speaker[]>>(endpoints.speakers.list(), {
    params: filters,
  });

  return response.data.data;
}

export async function createSpeakerRequest(input: {
  fullName: string;
  email?: string;
  company?: string;
  bio?: string | null;
  photoUrl?: string | null;
}) {
  const response = await client.post<ApiResponse<Speaker>>(endpoints.speakers.create(), input);

  return response.data.data;
}

export async function updateSpeakerRequest(
  id: string,
  input: {
    fullName?: string;
    email?: string | null;
    company?: string | null;
    bio?: string | null;
    photoUrl?: string | null;
  }
) {
  const response = await client.patch<ApiResponse<Speaker>>(endpoints.speakers.detail(id), input);

  return response.data.data;
}

export async function deleteSpeakerRequest(id: string) {
  await client.delete(endpoints.speakers.detail(id));
}

export async function listTalksRequest(filters?: { search?: string }) {
  const response = await client.get<ApiResponse<Talk[]>>(endpoints.talks.list(), {
    params: filters,
  });

  return response.data.data;
}

export async function createTalkRequest(input: {
  eventId: string;
  speakerId?: string | null;
  topic: string;
}) {
  const response = await client.post<ApiResponse<Talk>>(endpoints.talks.create(), {
    ...input,
    speakerId: input.speakerId || null,
  });

  return response.data.data;
}

export async function updateTalkRequest(
  id: string,
  input: { eventId?: string; speakerId?: string | null; topic?: string }
) {
  const response = await client.patch<ApiResponse<Talk>>(endpoints.talks.detail(id), input);

  return response.data.data;
}

export async function deleteTalkRequest(id: string) {
  await client.delete(endpoints.talks.detail(id));
}
