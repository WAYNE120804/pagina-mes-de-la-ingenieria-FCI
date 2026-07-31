import { AttendanceMethod, AttendanceStatus, AttendeeCategory } from '../../lib/prisma-client';
import { z } from 'zod';

const semesterSchema = z.enum([
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'POSGRADO',
  'NO_APLICA',
]);

const careerSchema = z.enum([
  'ING_SISTEMAS_TELECOMUNICACIONES',
  'ING_ANALITICA_DATOS',
  'ING_INDUSTRIAL',
  'ING_LOGISTICA',
  'ING_SEGURIDAD_INFORMACION',
  'POSGRADOS',
  'NO_APLICA',
]);

export const eventAttendanceParamsSchema = z.object({
  eventId: z.string().uuid(),
});

export const attendanceIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listAttendanceQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z.nativeEnum(AttendanceStatus).optional(),
});

export const createAttendanceSchema = z
  .object({
    userId: z.string().uuid().optional().nullable(),
    fullName: z.string().trim().optional().nullable(),
    email: z.string().email().trim().toLowerCase().optional().nullable(),
    identifier: z.string().trim().min(3).optional().nullable(),
    category: z.nativeEnum(AttendeeCategory).optional().nullable(),
    semester: semesterSchema.optional().nullable(),
    career: careerSchema.optional().nullable(),
    whatsappConsent: z.boolean().default(false),
    method: z.nativeEnum(AttendanceMethod).default(AttendanceMethod.MANUAL),
    status: z.nativeEnum(AttendanceStatus).default(AttendanceStatus.CHECKED_IN),
    tempCode: z.string().trim().optional().nullable(),
  })
  .refine((data) => data.userId || (data.fullName && (data.email || data.identifier)), {
    message: 'Debes registrar un usuario o nombre con correo, código o cédula',
    path: ['userId'],
  });

export const publicEventParamsSchema = z.object({
  eventId: z.string().trim().min(1).max(160),
});

export const publicFormQuerySchema = z.object({
  mode: z.enum(['registration', 'attendance']).default('attendance'),
  origin: z.string().url().optional(),
});

export const publicAttendanceSchema = z.object({
  fullName: z.string().trim().min(2),
  identifier: z.string().trim().min(3),
  category: z.nativeEnum(AttendeeCategory),
  semester: semesterSchema,
  career: careerSchema,
  email: z.string().email().trim().toLowerCase().optional().nullable(),
  whatsappConsent: z.boolean().default(false),
});

export const publicCheckInSchema = publicAttendanceSchema.partial({
  fullName: true,
  category: true,
  semester: true,
  career: true,
  email: true,
}).extend({
  identifier: z.string().trim().min(3),
});

export const updateAttendanceSchema = z.object({
  status: z.nativeEnum(AttendanceStatus),
});

export const scanAttendanceSchema = z
  .object({
    qrCode: z.string().trim().optional(),
    tempCode: z.string().trim().optional(),
  })
  .refine((data) => data.qrCode || data.tempCode, {
    message: 'Debes enviar qrCode o tempCode',
    path: ['qrCode'],
  });

export type ListAttendanceQuery = z.infer<typeof listAttendanceQuerySchema>;
export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;
export type ScanAttendanceInput = z.infer<typeof scanAttendanceSchema>;
export type PublicAttendanceInput = z.infer<typeof publicAttendanceSchema>;
export type PublicCheckInInput = z.infer<typeof publicCheckInSchema>;
