import { Router } from 'express';

import {
  getPublicEventForm,
  getPublicEventFormQr,
  publicCheckInAttendance,
  publicRegisterAttendance,
} from '../attendance/attendance.controller';
import { listPublicEvents } from '../events/event.controller';
import {
  publicAttendanceSchema,
  publicCheckInSchema,
  publicEventParamsSchema,
  publicFormQuerySchema,
} from '../attendance/attendance.schemas';
import {
  listPublicTournaments,
  getPublicTournamentForm,
  getPublicTournamentFormQr,
  publicRegisterTournament,
} from '../tournaments/tournament.controller';
import {
  publicTournamentParamsSchema,
  publicTournamentRegistrationSchema,
} from '../tournaments/tournament.schemas';
import { publicWriteRateLimiter } from '../../middlewares/security';
import { validateRequest } from '../../middlewares/validate-request';
import { getSiteSettings } from '../settings/settings.controller';

export const publicRouter = Router();

publicRouter.get('/events', listPublicEvents);
publicRouter.get('/settings', getSiteSettings);
publicRouter.get(
  '/events/:eventId/form',
  validateRequest({ params: publicEventParamsSchema, query: publicFormQuerySchema }),
  getPublicEventForm
);
publicRouter.get(
  '/events/:eventId/form-qr.svg',
  validateRequest({ params: publicEventParamsSchema, query: publicFormQuerySchema }),
  getPublicEventFormQr
);
publicRouter.post(
  '/events/:eventId/register',
  publicWriteRateLimiter,
  validateRequest({ params: publicEventParamsSchema, body: publicAttendanceSchema }),
  publicRegisterAttendance
);
publicRouter.post(
  '/events/:eventId/check-in',
  publicWriteRateLimiter,
  validateRequest({ params: publicEventParamsSchema, body: publicCheckInSchema }),
  publicCheckInAttendance
);
publicRouter.get('/tournaments', listPublicTournaments);
publicRouter.get(
  '/tournaments/:tournamentId/form',
  validateRequest({ params: publicTournamentParamsSchema, query: publicFormQuerySchema.pick({ origin: true }) }),
  getPublicTournamentForm
);
publicRouter.get(
  '/tournaments/:tournamentId/form-qr.svg',
  validateRequest({ params: publicTournamentParamsSchema, query: publicFormQuerySchema.pick({ origin: true }) }),
  getPublicTournamentFormQr
);
publicRouter.post(
  '/tournaments/:tournamentId/register',
  publicWriteRateLimiter,
  validateRequest({ params: publicTournamentParamsSchema, body: publicTournamentRegistrationSchema }),
  publicRegisterTournament
);
