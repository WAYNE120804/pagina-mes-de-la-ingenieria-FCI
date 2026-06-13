import { AsyncLocalStorage } from 'async_hooks';
import type { NextFunction, Request, Response } from 'express';

type RequestContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

const requestContext = new AsyncLocalStorage<RequestContext>();

function getClientIp(req: Request) {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0]?.trim() || null;
  }

  return req.ip || req.socket.remoteAddress || null;
}

export function requestContextMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  requestContext.run(
    {
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || null,
    },
    next
  );
}

export function getRequestContext() {
  return requestContext.getStore() || {};
}
