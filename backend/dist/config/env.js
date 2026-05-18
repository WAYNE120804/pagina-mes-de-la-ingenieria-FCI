"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: node_path_1.default.resolve(process.cwd(), '.env') });
exports.env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 3002),
    databaseUrl: process.env.DATABASE_URL || '',
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET ||
        (process.env.NODE_ENV === 'production' ? '' : 'dev-access-secret-change-me'),
    accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
    refreshTokenDays: Number(process.env.REFRESH_TOKEN_DAYS || 7),
    seedAdminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@semanaingenieria.local',
    seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin12345!',
};
