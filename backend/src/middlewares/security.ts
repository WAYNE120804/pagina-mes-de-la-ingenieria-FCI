import cors, { type CorsOptions } from 'cors';
import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { env } from '../config/env';
import { AppError } from '../lib/app-error';
import { errorResponse } from '../utils/api-response';

const developmentOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

function isAllowedOrigin(origin?: string) {
  if (!origin) {
    return true;
  }

  const allowedOrigins = env.isProduction
    ? env.corsAllowedOrigins
    : Array.from(new Set([...env.corsAllowedOrigins, ...developmentOrigins]));

  return allowedOrigins.includes(origin);
}

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new AppError('Origen no permitido por CORS', 403, 'CORS_FORBIDDEN'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  maxAge: 600,
} satisfies CorsOptions);

export const securityHeaders = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: env.isProduction
    ? {
        maxAge: 15552000,
        includeSubDomains: true,
      }
    : false,
  referrerPolicy: {
    policy: 'no-referrer',
  },
});

export function permissionsPolicy(_req: Request, res: Response, next: () => void) {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
  );
  next();
}

function rateLimitHandler(_req: Request, res: Response) {
  res
    .status(429)
    .json(errorResponse('Demasiadas solicitudes. Intenta nuevamente en unos minutos.', 'RATE_LIMITED'));
}

export const globalRateLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: env.rateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
});

export const authRateLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: env.authRateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: rateLimitHandler,
});

export const publicWriteRateLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: env.publicWriteRateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
});
