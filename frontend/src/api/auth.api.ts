import client, { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from './client';
import { endpoints } from './endpoints';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type AuthPayload = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export async function loginRequest(email: string, password: string) {
  const response = await client.post<ApiResponse<AuthPayload>>(endpoints.auth.login(), {
    email,
    password,
  });

  return response.data.data;
}

export async function meRequest() {
  const response = await client.get<ApiResponse<AuthUser>>(endpoints.auth.me());

  return response.data.data;
}

export async function logoutRequest() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

  if (!refreshToken) {
    return;
  }

  await client.post(endpoints.auth.logout(), { refreshToken });
}

export function persistSession(payload: AuthPayload) {
  localStorage.setItem(ACCESS_TOKEN_KEY, payload.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken);
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function hasStoredSession() {
  return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
}
