import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';
export const ACCESS_TOKEN_KEY = 'semana_ingenieria_access_token';
export const REFRESH_TOKEN_KEY = 'semana_ingenieria_refresh_token';

const client = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default client;

type ApiErrorPayload = {
  message?: string;
  error?: string;
  code?: string;
  details?: unknown;
};

function zodDetailsToMessage(details: unknown) {
  const issues = (details as { issues?: Array<{ path?: Array<string | number>; message?: string }> })?.issues;

  if (!Array.isArray(issues) || !issues.length) {
    return '';
  }

  return issues
    .slice(0, 3)
    .map((issue) => {
      const field = issue.path?.length ? `${issue.path.join('.')}: ` : '';
      return `${field}${issue.message || 'valor invalido'}`;
    })
    .join(' | ');
}

export function getApiErrorMessage(error: unknown, fallback = 'No fue posible completar la accion.') {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    const payload = error.response?.data;
    const detailsMessage = zodDetailsToMessage(payload?.details);
    const message = detailsMessage || payload?.message || payload?.error;
    const code = payload?.code ? ` (${payload.code})` : '';

    if (message) {
      return `${message}${code}`;
    }

    if (error.response?.status) {
      return `${fallback} Codigo HTTP ${error.response.status}.`;
    }
  }

  return error instanceof Error ? error.message : fallback;
}
