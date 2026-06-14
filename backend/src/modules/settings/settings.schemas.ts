import { z } from 'zod';

const imageUrlSchema = z.string().trim().refine(
  (value) => value.startsWith('data:image/') || z.string().url().safeParse(value).success,
  { message: 'El logo debe ser una URL válida o una imagen cargada' }
);

export const updateSiteSettingsSchema = z.object({
  brandName: z.string().trim().min(2).max(80).optional(),
  heroTitle: z.string().trim().min(4).max(140).optional(),
  logoUrl: imageUrlSchema.optional().nullable(),
  smtpEnabled: z.boolean().optional(),
  smtpHost: z.string().trim().min(2).optional().nullable(),
  smtpPort: z.coerce.number().int().positive().max(65535).optional().nullable(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().trim().optional().nullable(),
  smtpPassword: z.string().optional().nullable(),
  smtpFromName: z.string().trim().max(120).optional().nullable(),
  smtpFromEmail: z.string().email().trim().toLowerCase().optional().nullable(),
  smtpReplyTo: z.string().email().trim().toLowerCase().optional().nullable(),
  smtpBatchSize: z.coerce.number().int().min(1).max(100).optional(),
  smtpBatchDelayMs: z.coerce.number().int().min(0).max(60000).optional(),
});

export type UpdateSiteSettingsInput = z.infer<typeof updateSiteSettingsSchema>;
