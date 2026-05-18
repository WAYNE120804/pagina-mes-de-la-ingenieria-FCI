import { RoleCode, UserPosition, UserStatus } from '../../lib/prisma-client';
import { z } from 'zod';

export const userIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  role: z.nativeEnum(RoleCode).optional(),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8),
  position: z.nativeEnum(UserPosition).default(UserPosition.ESTUDIANTE),
  phone: z.string().trim().optional(),
  programId: z.string().uuid().optional().nullable(),
  semester: z.number().int().min(1).max(12).optional().nullable(),
  universityCode: z.string().trim().optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  status: z.nativeEnum(UserStatus).default(UserStatus.ACTIVE),
  roles: z.array(z.nativeEnum(RoleCode)).default([RoleCode.PARTICIPANTE]),
});

export const updateUserSchema = createUserSchema
  .partial()
  .extend({
    password: z.string().min(8).optional(),
    roles: z.array(z.nativeEnum(RoleCode)).optional(),
  });

export const resetUserPasswordSchema = z.object({
  password: z.string().min(8),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetUserPasswordInput = z.infer<typeof resetUserPasswordSchema>;
