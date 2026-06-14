import type { NextFunction, Request, Response } from 'express';

import type { AuthenticatedRequest } from '../../middlewares/auth';
import { successResponse } from '../../utils/api-response';
import { getPaginationParams } from '../../utils/pagination';
import * as attendanceService from './attendance.service';

export async function listAttendance(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const pagination = getPaginationParams(req);
    const result = await attendanceService.listAttendance(
      String(req.params.eventId),
      req.query,
      pagination
    );

    res.json(successResponse('Asistencia consultada', result.attendance, result.meta));
  } catch (error) {
    next(error);
  }
}

export async function createAttendance(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const attendance = await attendanceService.createAttendance(
      String(req.params.eventId),
      req.body,
      req.user?.id
    );

    res.status(201).json(successResponse('Asistencia registrada', attendance));
  } catch (error) {
    next(error);
  }
}

export async function preregisterAttendance(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const attendance = await attendanceService.preregisterAttendance(
      String(req.params.eventId),
      req.body,
      req.user?.id
    );

    res.status(201).json(successResponse('Preregistro QR creado', attendance));
  } catch (error) {
    next(error);
  }
}

export async function scanAttendance(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const attendance = await attendanceService.scanAttendance(
      String(req.params.eventId),
      req.body,
      req.user?.id
    );

    res.json(successResponse('Asistencia escaneada', attendance));
  } catch (error) {
    next(error);
  }
}

export async function getAttendanceStats(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const stats = await attendanceService.getAttendanceStats(String(req.params.eventId));

    res.json(successResponse('Estadísticas de asistencia consultadas', stats));
  } catch (error) {
    next(error);
  }
}

export async function getAttendanceQr(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const svg = await attendanceService.getAttendanceQrSvg(String(req.params.id));

    res.type('image/svg+xml').send(svg);
  } catch (error) {
    next(error);
  }
}

export async function getAttendanceCertificate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const html = await attendanceService.getAttendanceCertificateHtml(String(req.params.id));

    res.type('html').send(html);
  } catch (error) {
    next(error);
  }
}

export async function updateAttendanceStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const attendance = await attendanceService.updateAttendanceStatus(
      String(req.params.id),
      req.body,
      req.user?.id
    );

    res.json(successResponse('Asistencia actualizada', attendance));
  } catch (error) {
    next(error);
  }
}

function getPublicOrigin(req: Request) {
  return String(req.query.origin || req.get('origin') || 'http://localhost:5173');
}

export async function getPublicEventForm(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const form = await attendanceService.getPublicEventForm(
      String(req.params.eventId),
      String(req.query.mode || 'attendance') as 'registration' | 'attendance',
      getPublicOrigin(req)
    );

    res.json(successResponse('Formulario público consultado', form));
  } catch (error) {
    next(error);
  }
}

export async function getPublicEventFormQr(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const svg = await attendanceService.getPublicFormQrSvg(
      String(req.params.eventId),
      String(req.query.mode || 'attendance') as 'registration' | 'attendance',
      getPublicOrigin(req)
    );

    res.type('image/svg+xml').send(svg);
  } catch (error) {
    next(error);
  }
}

export async function publicRegisterAttendance(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const attendance = await attendanceService.publicRegisterAttendance(
      String(req.params.eventId),
      req.body
    );

    res.status(201).json(successResponse('Inscripción registrada', attendance));
  } catch (error) {
    next(error);
  }
}

export async function publicCheckInAttendance(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const attendance = await attendanceService.publicCheckInAttendance(
      String(req.params.eventId),
      req.body
    );

    res.json(successResponse('Asistencia confirmada', attendance));
  } catch (error) {
    next(error);
  }
}
