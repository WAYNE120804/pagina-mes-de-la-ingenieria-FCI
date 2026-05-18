import { Router } from 'express';

import { authMiddleware, permissionMiddleware } from '../../middlewares/auth';
import { validateRequest } from '../../middlewares/validate-request';
import {
  closeMatch,
  createMatch,
  createTournament,
  deleteIndividualParticipant,
  deleteTeamRegistration,
  deleteTournament,
  exportTournamentExcel,
  generateFixture,
  generateGroups,
  getFixture,
  getRegistrations,
  getStandings,
  getTournament,
  listTournaments,
  registerIndividualParticipant,
  registerTeam,
  refreshStandings,
  scoreMatch,
  updateIndividualParticipant,
  updateMatch,
  updateTeamRegistration,
  updateTournament,
} from './tournament.controller';
import {
  createMatchSchema,
  createTournamentSchema,
  generateFixtureSchema,
  generateGroupsSchema,
  individualRegistrationSchema,
  listTournamentsQuerySchema,
  scoreMatchSchema,
  teamRegistrationSchema,
  tournamentMatchIdParamsSchema,
  tournamentParticipantIdParamsSchema,
  tournamentTeamIdParamsSchema,
  tournamentIdParamsSchema,
  updateIndividualRegistrationSchema,
  updateMatchSchema,
  updateTeamRegistrationSchema,
  updateTournamentSchema,
} from './tournament.schemas';

export const tournamentRouter = Router();

tournamentRouter.use(authMiddleware);

tournamentRouter.get(
  '/',
  permissionMiddleware('tournaments.read'),
  validateRequest({ query: listTournamentsQuerySchema }),
  listTournaments
);
tournamentRouter.post(
  '/',
  permissionMiddleware('tournaments.write'),
  validateRequest({ body: createTournamentSchema }),
  createTournament
);
tournamentRouter.get(
  '/:id/registrations',
  permissionMiddleware('tournaments.read'),
  validateRequest({ params: tournamentIdParamsSchema }),
  getRegistrations
);
tournamentRouter.get(
  '/:id/fixture',
  permissionMiddleware('tournaments.read'),
  validateRequest({ params: tournamentIdParamsSchema }),
  getFixture
);
tournamentRouter.get(
  '/:id/standings',
  permissionMiddleware('tournaments.read'),
  validateRequest({ params: tournamentIdParamsSchema }),
  getStandings
);
tournamentRouter.post(
  '/:id/standings/recalculate',
  permissionMiddleware('tournaments.write'),
  validateRequest({ params: tournamentIdParamsSchema }),
  refreshStandings
);
tournamentRouter.get(
  '/:id/export.xlsx',
  permissionMiddleware('tournaments.read'),
  validateRequest({ params: tournamentIdParamsSchema }),
  exportTournamentExcel
);
tournamentRouter.post(
  '/:id/groups/generate',
  permissionMiddleware('tournaments.write'),
  validateRequest({ params: tournamentIdParamsSchema, body: generateGroupsSchema }),
  generateGroups
);
tournamentRouter.post(
  '/:id/fixture/generate',
  permissionMiddleware('tournaments.write'),
  validateRequest({ params: tournamentIdParamsSchema, body: generateFixtureSchema }),
  generateFixture
);
tournamentRouter.post(
  '/:id/matches',
  permissionMiddleware('tournaments.write'),
  validateRequest({ params: tournamentIdParamsSchema, body: createMatchSchema }),
  createMatch
);
tournamentRouter.patch(
  '/:id/matches/:matchId',
  permissionMiddleware('tournaments.write'),
  validateRequest({ params: tournamentMatchIdParamsSchema, body: updateMatchSchema }),
  updateMatch
);
tournamentRouter.patch(
  '/:id/matches/:matchId/score',
  permissionMiddleware('tournaments.write'),
  validateRequest({ params: tournamentMatchIdParamsSchema, body: scoreMatchSchema }),
  scoreMatch
);
tournamentRouter.post(
  '/:id/matches/:matchId/close',
  permissionMiddleware('tournaments.write'),
  validateRequest({ params: tournamentMatchIdParamsSchema, body: scoreMatchSchema }),
  closeMatch
);
tournamentRouter.post(
  '/:id/teams',
  permissionMiddleware('tournaments.write'),
  validateRequest({ params: tournamentIdParamsSchema, body: teamRegistrationSchema }),
  registerTeam
);
tournamentRouter.patch(
  '/:id/teams/:teamId',
  permissionMiddleware('tournaments.write'),
  validateRequest({ params: tournamentTeamIdParamsSchema, body: updateTeamRegistrationSchema }),
  updateTeamRegistration
);
tournamentRouter.delete(
  '/:id/teams/:teamId',
  permissionMiddleware('tournaments.write'),
  validateRequest({ params: tournamentTeamIdParamsSchema }),
  deleteTeamRegistration
);
tournamentRouter.post(
  '/:id/participants',
  permissionMiddleware('tournaments.write'),
  validateRequest({ params: tournamentIdParamsSchema, body: individualRegistrationSchema }),
  registerIndividualParticipant
);
tournamentRouter.patch(
  '/:id/participants/:participantId',
  permissionMiddleware('tournaments.write'),
  validateRequest({
    params: tournamentParticipantIdParamsSchema,
    body: updateIndividualRegistrationSchema,
  }),
  updateIndividualParticipant
);
tournamentRouter.delete(
  '/:id/participants/:participantId',
  permissionMiddleware('tournaments.write'),
  validateRequest({ params: tournamentParticipantIdParamsSchema }),
  deleteIndividualParticipant
);
tournamentRouter.get(
  '/:id',
  permissionMiddleware('tournaments.read'),
  validateRequest({ params: tournamentIdParamsSchema }),
  getTournament
);
tournamentRouter.patch(
  '/:id',
  permissionMiddleware('tournaments.write'),
  validateRequest({ params: tournamentIdParamsSchema, body: updateTournamentSchema }),
  updateTournament
);
tournamentRouter.delete(
  '/:id',
  permissionMiddleware('tournaments.write'),
  validateRequest({ params: tournamentIdParamsSchema }),
  deleteTournament
);
