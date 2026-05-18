import type { NextFunction, Response } from 'express';

import type { AuthenticatedRequest } from '../../middlewares/auth';
import { successResponse } from '../../utils/api-response';
import { getPaginationParams } from '../../utils/pagination';
import * as hackathonService from './hackathon.service';

export async function listHackathonEvents(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const pagination = getPaginationParams(req);
    const result = await hackathonService.listHackathonEvents(req.query, pagination);

    res.json(successResponse('Hackathones consultados', result.hackathons, result.meta));
  } catch (error) {
    next(error);
  }
}

export async function getHackathonEvent(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const hackathon = await hackathonService.getHackathonEventById(String(req.params.id));

    res.json(successResponse('Hackathon consultado', hackathon));
  } catch (error) {
    next(error);
  }
}

export async function createHackathonEvent(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const hackathon = await hackathonService.createHackathonEvent(req.body, req.user?.id);

    res.status(201).json(successResponse('Hackathon creado', hackathon));
  } catch (error) {
    next(error);
  }
}

export async function updateHackathonEvent(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const hackathon = await hackathonService.updateHackathonEvent(
      String(req.params.id),
      req.body,
      req.user?.id
    );

    res.json(successResponse('Hackathon actualizado', hackathon));
  } catch (error) {
    next(error);
  }
}

export async function deleteHackathonEvent(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    await hackathonService.deleteHackathonEvent(String(req.params.id), req.user?.id);

    res.json(successResponse('Hackathon eliminado'));
  } catch (error) {
    next(error);
  }
}

export async function listCompanies(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const pagination = getPaginationParams(req);
    const result = await hackathonService.listCompanies(req.query, pagination);

    res.json(successResponse('Empresas consultadas', result.companies, result.meta));
  } catch (error) {
    next(error);
  }
}

export async function createCompany(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const company = await hackathonService.createCompany(req.body, req.user?.id);

    res.status(201).json(successResponse('Empresa creada', company));
  } catch (error) {
    next(error);
  }
}

export async function updateCompany(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const company = await hackathonService.updateCompany(
      String(req.params.companyId),
      req.body,
      req.user?.id
    );

    res.json(successResponse('Empresa actualizada', company));
  } catch (error) {
    next(error);
  }
}

export async function deleteCompany(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    await hackathonService.deleteCompany(String(req.params.companyId), req.user?.id);

    res.json(successResponse('Empresa eliminada'));
  } catch (error) {
    next(error);
  }
}

export async function listChallenges(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const challenges = await hackathonService.listChallenges(String(req.params.id));

    res.json(successResponse('Retos consultados', challenges));
  } catch (error) {
    next(error);
  }
}

export async function createChallenge(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const challenge = await hackathonService.createChallenge(
      String(req.params.id),
      req.body,
      req.user?.id
    );

    res.status(201).json(successResponse('Reto creado', challenge));
  } catch (error) {
    next(error);
  }
}

export async function updateChallenge(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const challenge = await hackathonService.updateChallenge(
      String(req.params.challengeId),
      req.body,
      req.user?.id
    );

    res.json(successResponse('Reto actualizado', challenge));
  } catch (error) {
    next(error);
  }
}

export async function deleteChallenge(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    await hackathonService.deleteChallenge(String(req.params.challengeId), req.user?.id);

    res.json(successResponse('Reto eliminado'));
  } catch (error) {
    next(error);
  }
}

export async function listTeams(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const teams = await hackathonService.listTeams(String(req.params.id));

    res.json(successResponse('Equipos consultados', teams));
  } catch (error) {
    next(error);
  }
}

export async function createHackathonTeam(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const team = await hackathonService.createHackathonTeam(
      String(req.params.id),
      req.body,
      req.user?.id
    );

    res.status(201).json(successResponse('Equipo creado', team));
  } catch (error) {
    next(error);
  }
}

export async function updateHackathonTeam(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const team = await hackathonService.updateHackathonTeam(
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

export async function deleteHackathonTeam(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    await hackathonService.deleteHackathonTeam(
      String(req.params.id),
      String(req.params.teamId),
      req.user?.id
    );

    res.json(successResponse('Equipo eliminado'));
  } catch (error) {
    next(error);
  }
}

export async function listTeamDeliverables(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const deliverables = await hackathonService.listDeliverables(
      String(req.params.id),
      String(req.params.teamId)
    );

    res.json(successResponse('Entregables consultados', deliverables));
  } catch (error) {
    next(error);
  }
}

export async function createTeamDeliverable(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const deliverable = await hackathonService.createDeliverable(
      String(req.params.id),
      String(req.params.teamId),
      req.body,
      req.user?.id
    );

    res.status(201).json(successResponse('Entregable registrado', deliverable));
  } catch (error) {
    next(error);
  }
}

export async function updateTeamDeliverable(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const deliverable = await hackathonService.updateDeliverable(
      String(req.params.id),
      String(req.params.teamId),
      String(req.params.deliverableId),
      req.body,
      req.user?.id
    );

    res.json(successResponse('Entregable actualizado', deliverable));
  } catch (error) {
    next(error);
  }
}

export async function deleteTeamDeliverable(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    await hackathonService.deleteDeliverable(
      String(req.params.id),
      String(req.params.teamId),
      String(req.params.deliverableId),
      req.user?.id
    );

    res.json(successResponse('Entregable eliminado'));
  } catch (error) {
    next(error);
  }
}

export async function getHackathonOverview(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const overview = await hackathonService.getHackathonOverview(String(req.params.id));

    res.json(successResponse('Resumen de hackathon consultado', overview));
  } catch (error) {
    next(error);
  }
}
