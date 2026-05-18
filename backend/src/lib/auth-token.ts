import crypto from 'node:crypto';

import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import type { UserWithAccess } from '../modules/auth/auth.service';

export function createAccessToken(user: UserWithAccess) {
  const roles = user.roles.map((assignment) => assignment.role.code);
  const permissions = [
    ...new Set(
      user.roles.flatMap((assignment) =>
        assignment.role.permissions.map((rolePermission) => rolePermission.permission.code)
      )
    ),
  ];

  const options: jwt.SignOptions = {
    subject: user.id,
    expiresIn: env.accessTokenExpiresIn as jwt.SignOptions['expiresIn'],
  };

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      roles,
      permissions,
    },
    env.jwtAccessSecret,
    options
  );
}

export function createRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

export function hashRefreshToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getRefreshExpirationDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.refreshTokenDays);
  return expiresAt;
}
