import client from './client';
import { endpoints } from './endpoints';

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  channel: string;
  status: string;
  payload?: Record<string, unknown> | null;
  sentAt?: string | null;
  createdAt: string;
  creator?: {
    name: string;
    email: string;
  } | null;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export async function listNotificationsRequest() {
  const response = await client.get<ApiResponse<NotificationItem[]>>(endpoints.notifications.list());

  return response.data.data;
}

export async function sendNotificationRequest(input: {
  title: string;
  body: string;
  channel: 'EMAIL';
  targetType: 'EVENT' | 'TOURNAMENT';
  targetId: string;
  audience: 'EVENT_REGISTERED' | 'EVENT_CHECKED_IN' | 'TOURNAMENT_REGISTERED';
}) {
  const response = await client.post<ApiResponse<NotificationItem>>(endpoints.notifications.send(), input);

  return response.data.data;
}

export async function sendListEmailRequest(input: {
  targetType: 'EVENT' | 'TOURNAMENT';
  targetId: string;
  recipients: string[];
  subject: string;
  body: string;
}) {
  const response = await client.post<ApiResponse<NotificationItem>>(endpoints.notifications.sendList(), input);

  return response.data.data;
}
