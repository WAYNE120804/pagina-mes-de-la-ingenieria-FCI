"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.roleMiddleware = roleMiddleware;
exports.permissionMiddleware = permissionMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const app_error_1 = require("../lib/app-error");
function getBearerToken(req) {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
        return null;
    }
    return authorization.slice('Bearer '.length);
}
function authMiddleware(req, _res, next) {
    try {
        const token = getBearerToken(req);
        if (!token) {
            throw new app_error_1.AppError('Token de autenticacion requerido', 401, 'AUTH_REQUIRED');
        }
        if (!env_1.env.jwtAccessSecret) {
            throw new app_error_1.AppError('JWT no configurado', 500, 'JWT_NOT_CONFIGURED');
        }
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.jwtAccessSecret);
        req.user = {
            id: payload.id || payload.sub || '',
            email: payload.email,
            roles: payload.roles || [],
            permissions: payload.permissions || [],
        };
        if (!req.user.id) {
            throw new app_error_1.AppError('Token inválido', 401, 'INVALID_TOKEN');
        }
        next();
    }
    catch (error) {
        if (error instanceof app_error_1.AppError) {
            next(error);
            return;
        }
        next(new app_error_1.AppError('Token inválido o expirado', 401, 'INVALID_TOKEN'));
    }
}
function roleMiddleware(...roles) {
    return (req, _res, next) => {
        const hasRole = req.user?.roles.some((role) => roles.includes(role));
        if (!hasRole) {
            next(new app_error_1.AppError('No tienes rol suficiente para esta acción', 403, 'ROLE_FORBIDDEN'));
            return;
        }
        next();
    };
}
function permissionMiddleware(...permissions) {
    return (req, _res, next) => {
        const hasPermission = req.user?.permissions.some((permission) => permissions.includes(permission));
        if (!hasPermission) {
            next(new app_error_1.AppError('No tienes permiso suficiente para esta acción', 403, 'PERMISSION_FORBIDDEN'));
            return;
        }
        next();
    };
}
