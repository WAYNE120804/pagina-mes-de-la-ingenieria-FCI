import client from './client';
import { endpoints } from './endpoints';

export type UserRow = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  position?: string | null;
  universityCode?: string | null;
  program?: {
    name: string;
    code?: string | null;
  } | null;
  roles: string[];
};

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

export async function listUsersRequest(filters?: { search?: string; status?: string; role?: string; limit?: number }) {
  const response = await client.get<ApiResponse<UserRow[]>>(endpoints.users.list(), {
    params: filters,
  });

  return {
    users: response.data.data,
    meta: response.data.meta,
  };
}

export type UserInput = {
  name: string;
  email: string;
  password?: string;
  position: string;
  universityCode?: string | null;
  status?: string;
  roles?: string[];
};

export async function createUserRequest(input: UserInput) {
  const response = await client.post<ApiResponse<UserRow>>(endpoints.users.create(), input);

  return response.data.data;
}

export async function updateUserRequest(id: string, input: Partial<UserInput>) {
  const response = await client.patch<ApiResponse<UserRow>>(endpoints.users.detail(id), input);

  return response.data.data;
}

export async function deleteUserRequest(id: string) {
  await client.delete(endpoints.users.detail(id));
}

export async function resetUserPasswordRequest(id: string, password: string) {
  const response = await client.post<ApiResponse<UserRow>>(endpoints.users.resetPassword(id), {
    password,
  });

  return response.data.data;
}
