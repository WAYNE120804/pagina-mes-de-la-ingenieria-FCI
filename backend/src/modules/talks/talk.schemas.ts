import { z } from 'zod';

export const talkIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listTalksQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
});

export const createTalkSchema = z.object({
  eventId: z.string().uuid(),
  speakerId: z.string().uuid().optional().nullable(),
  topic: z.string().trim().min(3),
  qrSecret: z.string().trim().optional().nullable(),
});

export const updateTalkSchema = createTalkSchema.partial();

export type ListTalksQuery = z.infer<typeof listTalksQuerySchema>;
export type CreateTalkInput = z.infer<typeof createTalkSchema>;
export type UpdateTalkInput = z.infer<typeof updateTalkSchema>;
