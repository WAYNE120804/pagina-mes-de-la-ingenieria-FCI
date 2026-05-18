import { Router } from 'express';

import { authMiddleware, permissionMiddleware } from '../../middlewares/auth';
import { validateRequest } from '../../middlewares/validate-request';
import {
  createChallenge,
  createCompany,
  createHackathonEvent,
  createHackathonTeam,
  createTeamDeliverable,
  deleteChallenge,
  deleteCompany,
  deleteHackathonEvent,
  deleteHackathonTeam,
  deleteTeamDeliverable,
  getHackathonEvent,
  getHackathonOverview,
  listChallenges,
  listCompanies,
  listHackathonEvents,
  listTeamDeliverables,
  listTeams,
  updateChallenge,
  updateCompany,
  updateHackathonEvent,
  updateHackathonTeam,
  updateTeamDeliverable,
} from './hackathon.controller';
import {
  companyIdParamsSchema,
  createChallengeSchema,
  createCompanySchema,
  createDeliverableSchema,
  createHackathonEventSchema,
  createHackathonTeamSchema,
  hackathonChallengeIdParamsSchema,
  hackathonDeliverableParamsSchema,
  hackathonEventIdParamsSchema,
  hackathonNestedTeamParamsSchema,
  listCompaniesQuerySchema,
  listHackathonEventsQuerySchema,
  updateChallengeSchema,
  updateCompanySchema,
  updateDeliverableSchema,
  updateHackathonEventSchema,
  updateHackathonTeamSchema,
} from './hackathon.schemas';

export const hackathonRouter = Router();

hackathonRouter.use(authMiddleware);

hackathonRouter.get(
  '/',
  permissionMiddleware('hackathon.read'),
  validateRequest({ query: listHackathonEventsQuerySchema }),
  listHackathonEvents
);
hackathonRouter.post(
  '/',
  permissionMiddleware('hackathon.write'),
  validateRequest({ body: createHackathonEventSchema }),
  createHackathonEvent
);
hackathonRouter.get(
  '/companies',
  permissionMiddleware('hackathon.read'),
  validateRequest({ query: listCompaniesQuerySchema }),
  listCompanies
);
hackathonRouter.post(
  '/companies',
  permissionMiddleware('hackathon.write'),
  validateRequest({ body: createCompanySchema }),
  createCompany
);
hackathonRouter.patch(
  '/companies/:companyId',
  permissionMiddleware('hackathon.write'),
  validateRequest({ params: companyIdParamsSchema, body: updateCompanySchema }),
  updateCompany
);
hackathonRouter.delete(
  '/companies/:companyId',
  permissionMiddleware('hackathon.write'),
  validateRequest({ params: companyIdParamsSchema }),
  deleteCompany
);
hackathonRouter.patch(
  '/challenges/:challengeId',
  permissionMiddleware('hackathon.write'),
  validateRequest({ params: hackathonChallengeIdParamsSchema, body: updateChallengeSchema }),
  updateChallenge
);
hackathonRouter.delete(
  '/challenges/:challengeId',
  permissionMiddleware('hackathon.write'),
  validateRequest({ params: hackathonChallengeIdParamsSchema }),
  deleteChallenge
);
hackathonRouter.get(
  '/:id/overview',
  permissionMiddleware('hackathon.read'),
  validateRequest({ params: hackathonEventIdParamsSchema }),
  getHackathonOverview
);
hackathonRouter.get(
  '/:id/challenges',
  permissionMiddleware('hackathon.read'),
  validateRequest({ params: hackathonEventIdParamsSchema }),
  listChallenges
);
hackathonRouter.post(
  '/:id/challenges',
  permissionMiddleware('hackathon.write'),
  validateRequest({ params: hackathonEventIdParamsSchema, body: createChallengeSchema }),
  createChallenge
);
hackathonRouter.get(
  '/:id/teams',
  permissionMiddleware('hackathon.read'),
  validateRequest({ params: hackathonEventIdParamsSchema }),
  listTeams
);
hackathonRouter.post(
  '/:id/teams',
  permissionMiddleware('hackathon.write'),
  validateRequest({ params: hackathonEventIdParamsSchema, body: createHackathonTeamSchema }),
  createHackathonTeam
);
hackathonRouter.patch(
  '/:id/teams/:teamId',
  permissionMiddleware('hackathon.write'),
  validateRequest({ params: hackathonNestedTeamParamsSchema, body: updateHackathonTeamSchema }),
  updateHackathonTeam
);
hackathonRouter.delete(
  '/:id/teams/:teamId',
  permissionMiddleware('hackathon.write'),
  validateRequest({ params: hackathonNestedTeamParamsSchema }),
  deleteHackathonTeam
);
hackathonRouter.get(
  '/:id/teams/:teamId/deliverables',
  permissionMiddleware('hackathon.read'),
  validateRequest({ params: hackathonNestedTeamParamsSchema }),
  listTeamDeliverables
);
hackathonRouter.post(
  '/:id/teams/:teamId/deliverables',
  permissionMiddleware('hackathon.write'),
  validateRequest({ params: hackathonNestedTeamParamsSchema, body: createDeliverableSchema }),
  createTeamDeliverable
);
hackathonRouter.patch(
  '/:id/teams/:teamId/deliverables/:deliverableId',
  permissionMiddleware('hackathon.write'),
  validateRequest({ params: hackathonDeliverableParamsSchema, body: updateDeliverableSchema }),
  updateTeamDeliverable
);
hackathonRouter.delete(
  '/:id/teams/:teamId/deliverables/:deliverableId',
  permissionMiddleware('hackathon.write'),
  validateRequest({ params: hackathonDeliverableParamsSchema }),
  deleteTeamDeliverable
);
hackathonRouter.get(
  '/:id',
  permissionMiddleware('hackathon.read'),
  validateRequest({ params: hackathonEventIdParamsSchema }),
  getHackathonEvent
);
hackathonRouter.patch(
  '/:id',
  permissionMiddleware('hackathon.write'),
  validateRequest({ params: hackathonEventIdParamsSchema, body: updateHackathonEventSchema }),
  updateHackathonEvent
);
hackathonRouter.delete(
  '/:id',
  permissionMiddleware('hackathon.write'),
  validateRequest({ params: hackathonEventIdParamsSchema }),
  deleteHackathonEvent
);
