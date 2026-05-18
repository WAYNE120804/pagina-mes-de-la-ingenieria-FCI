import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

import { AppError } from '../lib/app-error';

type RequestSchemas = {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
};

export function validateRequest(schemas: RequestSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as Request['params'];
      }

      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as Request['query'];
      }

      next();
    } catch (error) {
      next(new AppError('Datos de entrada invalidos', 400, 'VALIDATION_ERROR', error));
    }
  };
}
