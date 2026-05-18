import client from './client';
import { endpoints } from './endpoints';

export type SiteSettings = {
  id: string;
  brandName: string;
  heroTitle: string;
  logoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export const defaultSiteSettings: SiteSettings = {
  id: 'public',
  brandName: 'Mes de la Ingenieria',
  heroTitle: 'Innovacion que transforma el futuro.',
  logoUrl: null,
};

export async function getPublicSettingsRequest() {
  const response = await client.get<ApiResponse<SiteSettings>>(endpoints.public.settings());

  return response.data.data;
}

export async function getSettingsRequest() {
  const response = await client.get<ApiResponse<SiteSettings>>(endpoints.settings.detail());

  return response.data.data;
}

export async function updateSettingsRequest(input: {
  brandName?: string;
  heroTitle?: string;
  logoUrl?: string | null;
}) {
  const response = await client.patch<ApiResponse<SiteSettings>>(endpoints.settings.detail(), input);

  return response.data.data;
}
