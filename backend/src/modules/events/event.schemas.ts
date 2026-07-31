import { EventModality, EventStatus, EventType } from '../../lib/prisma-client';
import { bogotaDateTimeSchema } from '../../utils/datetime';
import { z } from 'zod';

export const eventIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listEventsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  type: z.nativeEnum(EventType).optional(),
  status: z.nativeEnum(EventStatus).optional(),
});

const eventBodySchema = z.object({
  parentId: z.string().uuid().optional().nullable(),
  venueId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(3),
  slug: z.string().trim().min(3).optional(),
  description: z.string().trim().optional().nullable(),
  type: z.nativeEnum(EventType),
  status: z.nativeEnum(EventStatus).default(EventStatus.PUBLISHED),
  modality: z.nativeEnum(EventModality).default(EventModality.PRESENTIAL),
  streamUrl: z.string().trim().url('El link de transmisión debe ser una URL válida').optional().nullable(),
  startsAt: bogotaDateTimeSchema,
  endsAt: bogotaDateTimeSchema,
  capacity: z.number().int().positive().optional().nullable(),
});

export const createEventSchema = eventBodySchema.refine((data) => data.endsAt > data.startsAt, {
    message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    path: ['endsAt'],
  });

export const updateEventSchema = eventBodySchema.partial().refine(
  (data) => {
    if (!data.startsAt || !data.endsAt) {
      return true;
    }

    return data.endsAt > data.startsAt;
  },
  {
    message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    path: ['endsAt'],
  }
);

export const responsibleSchema = z.object({
  userId: z.string().uuid(),
  roleNote: z.string().trim().optional().nullable(),
});

export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type ResponsibleInput = z.infer<typeof responsibleSchema>;
