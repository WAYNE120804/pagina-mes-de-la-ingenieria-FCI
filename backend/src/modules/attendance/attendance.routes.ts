import { Router } from 'express';

import { authMiddleware } from '../../middlewares/auth';
import { validateRequest } from '../../middlewares/validate-request';
import {
  createAttendance,
  getAttendanceCertificate,
  getAttendanceQr,
  getAttendanceStats,
  listAttendance,
  preregisterAttendance,
  scanAttendance,
  updateAttendanceStatus,
} from './attendance.controller';
import {
  attendanceIdParamsSchema,
  createAttendanceSchema,
  eventAttendanceParamsSchema,
  listAttendanceQuerySchema,
  scanAttendanceSchema,
  updateAttendanceSchema,
} from './attendance.schemas';

export const attendanceRouter = Router();

attendanceRouter.use(authMiddleware);

attendanceRouter.get(
  '/events/:eventId/attendance',
  validateRequest({ params: eventAttendanceParamsSchema, query: listAttendanceQuerySchema }),
  listAttendance
);
attendanceRouter.get(
  '/events/:eventId/attendance/stats',
  validateRequest({ params: eventAttendanceParamsSchema }),
  getAttendanceStats
);
attendanceRouter.post(
  '/events/:eventId/attendance',
  validateRequest({ params: eventAttendanceParamsSchema, body: createAttendanceSchema }),
  createAttendance
);
attendanceRouter.post(
  '/events/:eventId/attendance/preregister',
  validateRequest({ params: eventAttendanceParamsSchema, body: createAttendanceSchema }),
  preregisterAttendance
);
attendanceRouter.post(
  '/events/:eventId/attendance/scan',
  validateRequest({ params: eventAttendanceParamsSchema, body: scanAttendanceSchema }),
  scanAttendance
);
attendanceRouter.get(
  '/attendance/:id/qr',
  validateRequest({ params: attendanceIdParamsSchema }),
  getAttendanceQr
);
attendanceRouter.get(
  '/attendance/:id/certificate',
  validateRequest({ params: attendanceIdParamsSchema }),
  getAttendanceCertificate
);
attendanceRouter.patch(
  '/attendance/:id',
  validateRequest({ params: attendanceIdParamsSchema, body: updateAttendanceSchema }),
  updateAttendanceStatus
);
