import { z } from 'zod';

const imageUrlSchema = z.string().trim().refine(
  (value) => value.startsWith('data:image/') || z.string().url().safeParse(value).success,
  { message: 'El logo debe ser una URL valida o una imagen cargada' }
);

export const updateSiteSettingsSchema = z.object({
  brandName: z.string().trim().min(2).max(80).optional(),
  heroTitle: z.string().trim().min(4).max(140).optional(),
  logoUrl: imageUrlSchema.optional().nullable(),
});

export type UpdateSiteSettingsInput = z.infer<typeof updateSiteSettingsSchema>;
