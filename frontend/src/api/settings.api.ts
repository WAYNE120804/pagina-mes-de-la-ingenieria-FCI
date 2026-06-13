import client from './client';
import { endpoints } from './endpoints';

export type SiteSettings = {
  id: string;
  brandName: string;
  heroTitle: string;
  logoUrl?: string | null;
  smtpEnabled?: boolean;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpSecure?: boolean;
  smtpUser?: string | null;
  smtpPasswordConfigured?: boolean;
  smtpFromName?: string | null;
  smtpFromEmail?: string | null;
  smtpReplyTo?: string | null;
  smtpBatchSize?: number;
  smtpBatchDelayMs?: number;
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
  smtpEnabled: false,
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  smtpPasswordConfigured: false,
  smtpFromName: 'Mes de la Ingenieria',
  smtpFromEmail: '',
  smtpReplyTo: '',
  smtpBatchSize: 40,
  smtpBatchDelayMs: 1500,
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
  smtpEnabled?: boolean;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpSecure?: boolean;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  smtpFromName?: string | null;
  smtpFromEmail?: string | null;
  smtpReplyTo?: string | null;
  smtpBatchSize?: number;
  smtpBatchDelayMs?: number;
}) {
  const response = await client.patch<ApiResponse<SiteSettings>>(endpoints.settings.detail(), input);

  return response.data.data;
}
