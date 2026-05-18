import client from './client';
import { endpoints } from './endpoints';

export type Venue = {
  id: string;
  name: string;
  location?: string | null;
  photoUrl?: string | null;
  capacity?: number | null;
  isActive: boolean;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export async function listVenuesRequest() {
  const response = await client.get<ApiResponse<Venue[]>>(endpoints.venues.list());

  return response.data.data;
}

export async function createVenueRequest(input: {
  name: string;
  location?: string | null;
  photoUrl?: string | null;
  capacity?: number | null;
}) {
  const response = await client.post<ApiResponse<Venue>>(endpoints.venues.create(), {
    ...input,
    capacity: input.capacity || null,
  });

  return response.data.data;
}

export async function updateVenueRequest(
  id: string,
  input: { name?: string; location?: string | null; photoUrl?: string | null; capacity?: number | null; isActive?: boolean }
) {
  const response = await client.patch<ApiResponse<Venue>>(endpoints.venues.detail(id), input);

  return response.data.data;
}

export async function deleteVenueRequest(id: string) {
  await client.delete(endpoints.venues.detail(id));
}
