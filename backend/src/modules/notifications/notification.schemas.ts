import { NotificationChannel } from '../../lib/prisma-client';
import { z } from 'zod';

export const listNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const sendNotificationSchema = z.object({
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(3).max(5000),
  channel: z.nativeEnum(NotificationChannel).default(NotificationChannel.EMAIL),
  targetType: z.enum(['EVENT', 'TOURNAMENT']),
  targetId: z.string().uuid(),
  audience: z.enum(['EVENT_REGISTERED', 'EVENT_CHECKED_IN', 'TOURNAMENT_REGISTERED']),
});

export const sendListEmailSchema = z.object({
  targetType: z.enum(['EVENT', 'TOURNAMENT']),
  targetId: z.string().uuid(),
  recipients: z.array(z.string().email().trim().toLowerCase()).min(1).max(20),
  subject: z.string().trim().min(3).max(160),
  body: z.string().trim().min(3).max(5000),
});

export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;
export type SendListEmailInput = z.infer<typeof sendListEmailSchema>;
