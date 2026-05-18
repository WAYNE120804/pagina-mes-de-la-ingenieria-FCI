import { z } from 'zod';

const imageUrlSchema = z
  .string()
  .trim()
  .refine((value) => value.startsWith('data:image/') || z.string().url().safeParse(value).success, {
    message: 'La foto debe ser una URL valida o una imagen cargada',
  });

export const speakerIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listSpeakersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
});

export const createSpeakerSchema = z.object({
  userId: z.string().uuid().optional().nullable(),
  fullName: z.string().trim().min(2),
  email: z.string().email().trim().toLowerCase().optional().nullable(),
  company: z.string().trim().optional().nullable(),
  bio: z.string().trim().optional().nullable(),
  photoUrl: imageUrlSchema.optional().nullable(),
});

export const updateSpeakerSchema = createSpeakerSchema.partial();

export type ListSpeakersQuery = z.infer<typeof listSpeakersQuerySchema>;
export type CreateSpeakerInput = z.infer<typeof createSpeakerSchema>;
export type UpdateSpeakerInput = z.infer<typeof updateSpeakerSchema>;
