import { z } from 'zod';

const imageUrlSchema = z.string().trim().refine(
  (value) => value.startsWith('data:image/') || z.string().url().safeParse(value).success,
  { message: 'La foto debe ser una URL válida o una imagen cargada' }
);

export const venueIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listVenuesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const createVenueSchema = z.object({
  name: z.string().trim().min(2),
  location: z.string().trim().optional().nullable(),
  photoUrl: imageUrlSchema.optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateVenueSchema = createVenueSchema.partial();

export type ListVenuesQuery = z.infer<typeof listVenuesQuerySchema>;
export type CreateVenueInput = z.infer<typeof createVenueSchema>;
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>;
