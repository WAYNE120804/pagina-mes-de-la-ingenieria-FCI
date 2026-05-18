import type { NextFunction, Request, Response } from 'express';

import type { AuthenticatedRequest } from '../../middlewares/auth';
import { successResponse } from '../../utils/api-response';
import { getPaginationParams } from '../../utils/pagination';
import * as tournamentService from './tournament.service';

export async function listTournaments(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const pagination = getPaginationParams(req);
    const result = await tournamentService.listTournaments(req.query, pagination);

    res.json(successResponse('Torneos consultados', result.tournaments, result.meta));
  } catch (error) {
    next(error);
  }
}

export async function listPublicTournaments(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const tournaments = await tournamentService.listPublicTournaments();

    res.json(successResponse('Torneos publicos consultados', tournaments));
  } catch (error) {
    next(error);
  }
}

export async function getTournament(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const tournament = await tournamentService.getTournamentById(String(req.params.id));

    res.json(successResponse('Torneo consultado', tournament));
  } catch (error) {
    next(error);
  }
}

export async function createTournament(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const tournament = await tournamentService.createTournament(req.body, req.user?.id);

    res.status(201).json(successResponse('Torneo creado', tournament));
  } catch (error) {
    next(error);
  }
}

export async function updateTournament(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const tournament = await tournamentService.updateTournament(
      String(req.params.id),
      req.body,
      req.user?.id
    );

    res.json(successResponse('Torneo actualizado', tournament));
  } catch (error) {
    next(error);
  }
}

export async function deleteTournament(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    await tournamentService.deleteTournament(String(req.params.id), req.user?.id);

    res.json(successResponse('Torneo eliminado'));
  } catch (error) {
    next(error);
  }
}

export async function getRegistrations(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const registrations = await tournamentService.getTournamentRegistrations(String(req.params.id));

    res.json(successResponse('Inscripciones consultadas', registrations));
  } catch (error) {
    next(error);
  }
}

export async function registerTeam(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const team = await tournamentService.registerTeam(String(req.params.id), req.body, req.user?.id);

    res.status(201).json(successResponse('Equipo inscrito', team));
  } catch (error) {
    next(error);
  }
}

export async function updateTeamRegistration(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const team = await tournamentService.updateTeamRegistration(
      String(req.params.id),
      String(req.params.teamId),
      req.body,
      req.user?.id
    );

    res.json(successResponse('Equipo actualizado', team));
  } catch (error) {
    next(error);
  }
}

export async function deleteTeamRegistration(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    await tournamentService.deleteTeamRegistration(
      String(req.params.id),
      String(req.params.teamId),
      req.user?.id
    );

    res.json(successResponse('Equipo retirado'));
  } catch (error) {
    next(error);
  }
}

export async function registerIndividualParticipant(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const participant = await tournamentService.registerIndividualParticipant(
      String(req.params.id),
      req.body,
      req.user?.id
    );

    res.status(201).json(successResponse('Participante inscrito', participant));
  } catch (error) {
    next(error);
  }
}

export async function getPublicTournamentForm(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const origin = typeof req.query.origin === 'string' ? req.query.origin : `${req.protocol}://${req.get('host')}`;
    const form = await tournamentService.getPublicTournamentForm(
      String(req.params.tournamentId),
      origin
    );

    res.json(successResponse('Formulario publico de torneo consultado', form));
  } catch (error) {
    next(error);
  }
}

export async function getPublicTournamentFormQr(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const origin = typeof req.query.origin === 'string' ? req.query.origin : `${req.protocol}://${req.get('host')}`;
    const svg = await tournamentService.getPublicTournamentFormQrSvg(
      String(req.params.tournamentId),
      origin
    );

    res.type('image/svg+xml').send(svg);
  } catch (error) {
    next(error);
  }
}

export async function publicRegisterTournament(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const registration = await tournamentService.publicRegisterTournament(
      String(req.params.tournamentId),
      req.body
    );

    res.status(201).json(successResponse('Inscripcion publica de torneo registrada', registration));
  } catch (error) {
    next(error);
  }
}

export async function updateIndividualParticipant(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const participant = await tournamentService.updateIndividualParticipant(
      String(req.params.id),
      String(req.params.participantId),
      req.body,
      req.user?.id
    );

    res.json(successResponse('Participante actualizado', participant));
  } catch (error) {
    next(error);
  }
}

export async function deleteIndividualParticipant(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    await tournamentService.deleteIndividualParticipant(
      String(req.params.id),
      String(req.params.participantId),
      req.user?.id
    );

    res.json(successResponse('Participante retirado'));
  } catch (error) {
    next(error);
  }
}

export async function getFixture(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const fixture = await tournamentService.getTournamentFixture(String(req.params.id));

    res.json(successResponse('Fixture consultado', fixture));
  } catch (error) {
    next(error);
  }
}

export async function generateGroups(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const fixture = await tournamentService.generateTournamentGroups(
      String(req.params.id),
      req.body,
      req.user?.id
    );

    res.json(successResponse('Grupos generados', fixture));
  } catch (error) {
    next(error);
  }
}

export async function generateFixture(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const fixture = await tournamentService.generateTournamentFixture(
      String(req.params.id),
      req.body,
      req.user?.id
    );

    res.json(successResponse('Fixture generado', fixture));
  } catch (error) {
    next(error);
  }
}

export async function createMatch(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const match = await tournamentService.createManualMatch(
      String(req.params.id),
      req.body,
      req.user?.id
    );

    res.status(201).json(successResponse('Partido creado', match));
  } catch (error) {
    next(error);
  }
}

export async function updateMatch(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const match = await tournamentService.updateMatchSchedule(
      String(req.params.id),
      String(req.params.matchId),
      req.body,
      req.user?.id
    );

    res.json(successResponse('Partido actualizado', match));
  } catch (error) {
    next(error);
  }
}

export async function scoreMatch(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const match = await tournamentService.updateMatchScore(
      String(req.params.id),
      String(req.params.matchId),
      req.body,
      req.user?.id
    );

    res.json(successResponse('Marcador actualizado', match));
  } catch (error) {
    next(error);
  }
}

export async function closeMatch(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const match = await tournamentService.closeMatch(
      String(req.params.id),
      String(req.params.matchId),
      req.body,
      req.user?.id
    );

    res.json(successResponse('Partido cerrado', match));
  } catch (error) {
    next(error);
  }
}

export async function getStandings(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const standings = await tournamentService.getTournamentStandings(String(req.params.id));

    res.json(successResponse('Tabla consultada', standings));
  } catch (error) {
    next(error);
  }
}

export async function refreshStandings(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const standings = await tournamentService.refreshTournamentStandings(
      String(req.params.id),
      req.user?.id
    );

    res.json(successResponse('Tabla recalculada', standings));
  } catch (error) {
    next(error);
  }
}

export async function exportTournamentExcel(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const report = await tournamentService.buildTournamentExcelReport(String(req.params.id));

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
    res.send(report.buffer);
  } catch (error) {
    next(error);
  }
}
