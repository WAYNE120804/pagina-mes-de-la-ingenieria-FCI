import path from 'node:path';

import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3002),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtAccessSecret:
    process.env.JWT_ACCESS_SECRET ||
    (process.env.NODE_ENV === 'production' ? '' : 'dev-access-secret-change-me'),
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
  refreshTokenDays: Number(process.env.REFRESH_TOKEN_DAYS || 7),
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@semanaingenieria.local',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin12345!',
};
