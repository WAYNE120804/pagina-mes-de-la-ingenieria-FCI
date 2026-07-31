import { DeliverableType, HackathonStatus } from '../../lib/prisma-client';
import { bogotaDateTimeSchema } from '../../utils/datetime';
import { z } from 'zod';

export const hackathonEventIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const companyIdParamsSchema = z.object({
  companyId: z.string().uuid(),
});

export const hackathonChallengeIdParamsSchema = z.object({
  challengeId: z.string().uuid(),
});

export const hackathonTeamIdParamsSchema = z.object({
  teamId: z.string().uuid(),
});

export const hackathonNestedChallengeParamsSchema = hackathonEventIdParamsSchema.extend({
  challengeId: z.string().uuid(),
});

export const hackathonNestedTeamParamsSchema = hackathonEventIdParamsSchema.extend({
  teamId: z.string().uuid(),
});

export const hackathonDeliverableParamsSchema = hackathonNestedTeamParamsSchema.extend({
  deliverableId: z.string().uuid(),
});

export const listHackathonEventsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  status: z.nativeEnum(HackathonStatus).optional(),
});

export const listCompaniesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
});

const hackathonEventBodySchema = z.object({
  eventId: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(3),
  status: z.nativeEnum(HackathonStatus).default(HackathonStatus.REGISTRATION_OPEN),
  description: z.string().trim().optional().nullable(),
  startsAt: bogotaDateTimeSchema.optional().nullable(),
  endsAt: bogotaDateTimeSchema.optional().nullable(),
});

export const createHackathonEventSchema = hackathonEventBodySchema.refine(
  (data) => !data.startsAt || !data.endsAt || data.endsAt > data.startsAt,
  {
    message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    path: ['endsAt'],
  }
);

export const updateHackathonEventSchema = hackathonEventBodySchema.partial().refine(
  (data) => !data.startsAt || !data.endsAt || data.endsAt > data.startsAt,
  {
    message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    path: ['endsAt'],
  }
);

export const companyBodySchema = z.object({
  name: z.string().trim().min(2),
  contactName: z.string().trim().optional().nullable(),
  contactEmail: z.string().email().trim().toLowerCase().optional().nullable(),
});

export const createCompanySchema = companyBodySchema;
export const updateCompanySchema = companyBodySchema.partial();

const challengeBodySchema = z.object({
  companyId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(3),
  description: z.string().trim().min(5),
  requirements: z.string().trim().optional().nullable(),
  suggestedTech: z.string().trim().optional().nullable(),
});

export const createChallengeSchema = challengeBodySchema;
export const updateChallengeSchema = challengeBodySchema.partial();

const nullableUrlSchema = z
  .string()
  .trim()
  .url()
  .optional()
  .nullable()
  .or(z.literal('').transform(() => null));

const teamBodySchema = z.object({
  challengeId: z.string().uuid().optional().nullable(),
  leaderId: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(2),
  projectName: z.string().trim().optional().nullable(),
  githubUrl: nullableUrlSchema,
  demoUrl: nullableUrlSchema,
  memberIds: z.array(z.string().uuid()).min(1),
});

export const createHackathonTeamSchema = teamBodySchema;
export const updateHackathonTeamSchema = teamBodySchema.partial().extend({
  memberIds: z.array(z.string().uuid()).min(1).optional(),
});

const deliverableBodySchema = z.object({
  type: z.nativeEnum(DeliverableType),
  title: z.string().trim().min(2),
  url: z.string().trim().url(),
  submittedAt: bogotaDateTimeSchema.optional().nullable(),
});

export const createDeliverableSchema = deliverableBodySchema;
export const updateDeliverableSchema = deliverableBodySchema.partial();

export type ListHackathonEventsQuery = z.infer<typeof listHackathonEventsQuerySchema>;
export type ListCompaniesQuery = z.infer<typeof listCompaniesQuerySchema>;
export type CreateHackathonEventInput = z.infer<typeof createHackathonEventSchema>;
export type UpdateHackathonEventInput = z.infer<typeof updateHackathonEventSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
export type UpdateChallengeInput = z.infer<typeof updateChallengeSchema>;
export type CreateHackathonTeamInput = z.infer<typeof createHackathonTeamSchema>;
export type UpdateHackathonTeamInput = z.infer<typeof updateHackathonTeamSchema>;
export type CreateDeliverableInput = z.infer<typeof createDeliverableSchema>;
export type UpdateDeliverableInput = z.infer<typeof updateDeliverableSchema>;
