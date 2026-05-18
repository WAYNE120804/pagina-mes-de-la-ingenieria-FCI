"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.refresh = refresh;
exports.logout = logout;
exports.me = me;
const api_response_1 = require("../../utils/api-response");
const authService = __importStar(require("./auth.service"));
function getRequestMeta(req) {
    return {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
    };
}
async function login(req, res, next) {
    try {
        const result = await authService.login(req.body, getRequestMeta(req));
        res.json((0, api_response_1.successResponse)('Sesion iniciada', result));
    }
    catch (error) {
        next(error);
    }
}
async function refresh(req, res, next) {
    try {
        const result = await authService.refresh(req.body);
        res.json((0, api_response_1.successResponse)('Token renovado', result));
    }
    catch (error) {
        next(error);
    }
}
async function logout(req, res, next) {
    try {
        await authService.logout(req.body, req.user?.id);
        res.json((0, api_response_1.successResponse)('Sesion cerrada'));
    }
    catch (error) {
        next(error);
    }
}
async function me(req, res, next) {
    try {
        const user = await authService.getMe(req.user?.id || '');
        res.json((0, api_response_1.successResponse)('Usuario autenticado', user));
    }
    catch (error) {
        next(error);
    }
}
