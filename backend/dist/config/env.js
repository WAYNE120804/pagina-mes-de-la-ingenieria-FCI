"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: node_path_1.default.resolve(process.cwd(), '.env') });
const isProduction = process.env.NODE_ENV === 'production';
function splitCsv(value) {
    return (value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}
const configuredCorsOrigins = splitCsv(process.env.CORS_ALLOWED_ORIGINS);
const appOrigins = splitCsv([process.env.APP_URL, process.env.FRONTEND_URL].filter(Boolean).join(','));
const corsAllowedOrigins = Array.from(new Set([...configuredCorsOrigins, ...appOrigins]));
const jwtAccessSecret = process.env.JWT_ACCESS_SECRET ||
    (isProduction ? '' : 'dev-access-secret-change-me');
if (isProduction) {
    const missing = [];
    if (!process.env.DATABASE_URL) {
        missing.push('DATABASE_URL');
    }
    if (!jwtAccessSecret || jwtAccessSecret.length < 32) {
        missing.push('JWT_ACCESS_SECRET (mínimo 32 caracteres)');
    }
    if (corsAllowedOrigins.length === 0) {
        missing.push('CORS_ALLOWED_ORIGINS o APP_URL');
    }
    if (missing.length > 0) {
        throw new Error(`Configuración de seguridad incompleta: ${missing.join(', ')}`);
    }
}
exports.env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction,
    port: Number(process.env.PORT || 3002),
    databaseUrl: process.env.DATABASE_URL || '',
    jwtAccessSecret,
    accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
    refreshTokenDays: Number(process.env.REFRESH_TOKEN_DAYS || 7),
    seedAdminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@semanaingenieria.local',
    seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin12345!',
    corsAllowedOrigins,
    rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 600),
    authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
    publicWriteRateLimitMax: Number(process.env.PUBLIC_WRITE_RATE_LIMIT_MAX || 60),
};
