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
  'TECNICO',
  'TECNOLOGO',
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
    phone: z.string().trim().min(7).max(30).optional().nullable(),
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

const publicRegistrationMemberSchema = z.object({
  fullName: z.string().trim().min(2),
  identifier: z.string().trim().min(3),
  category: z.nativeEnum(AttendeeCategory),
  semester: semesterSchema,
  career: careerSchema,
  email: z.string().email().trim().toLowerCase().optional().nullable(),
  phone: z.string().trim().min(7).max(30),
});

export const publicAttendanceSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  identifier: z.string().trim().min(3).optional(),
  category: z.nativeEnum(AttendeeCategory).optional(),
  semester: semesterSchema.optional(),
  career: careerSchema.optional(),
  email: z.string().email().trim().toLowerCase().optional().nullable(),
  phone: z.string().trim().min(7).max(30).optional(),
  teamName: z.string().trim().min(2).max(120).optional().nullable(),
  members: z.array(publicRegistrationMemberSchema).min(2).max(50).optional(),
  whatsappConsent: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.members?.length) {
    if (!data.teamName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debes indicar el nombre del equipo',
        path: ['teamName'],
      });
    }
    return;
  }

  (['fullName', 'identifier', 'category', 'semester', 'career', 'phone'] as const).forEach((field) => {
    if (!data[field]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Campo requerido',
        path: [field],
      });
    }
  });
});

export const publicCheckInSchema = publicRegistrationMemberSchema.partial({
  fullName: true,
  category: true,
  semester: true,
  career: true,
  email: true,
  phone: true,
}).extend({
  identifier: z.string().trim().min(3),
  whatsappConsent: z.boolean().optional(),
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
