import { Router } from 'express';

import { attendanceRouter } from '../modules/attendance/attendance.routes';
import { auditRouter } from '../modules/audit/audit.routes';
import { authRouter } from '../modules/auth/auth.routes';
import { eventRouter } from '../modules/events/event.routes';
import { hackathonRouter } from '../modules/hackathon/hackathon.routes';
import { healthRouter } from '../modules/health/health.routes';
import { notificationRouter } from '../modules/notifications/notification.routes';
import { publicRouter } from '../modules/public/public.routes';
import { settingsRouter } from '../modules/settings/settings.routes';
import { speakerRouter } from '../modules/speakers/speaker.routes';
import { talkRouter } from '../modules/talks/talk.routes';
import { tournamentRouter } from '../modules/tournaments/tournament.routes';
import { userRouter } from '../modules/users/user.routes';
import { venueRouter } from '../modules/venues/venue.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/audit', auditRouter);
apiRouter.use('/health', healthRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/public', publicRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/venues', venueRouter);
apiRouter.use('/events', eventRouter);
apiRouter.use('/speakers', speakerRouter);
apiRouter.use('/talks', talkRouter);
apiRouter.use('/tournaments', tournamentRouter);
apiRouter.use('/hackathon', hackathonRouter);
apiRouter.use('/', attendanceRouter);
