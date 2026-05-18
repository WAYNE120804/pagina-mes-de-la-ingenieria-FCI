"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAccessToken = createAccessToken;
exports.createRefreshToken = createRefreshToken;
exports.hashRefreshToken = hashRefreshToken;
exports.getRefreshExpirationDate = getRefreshExpirationDate;
const node_crypto_1 = __importDefault(require("node:crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
function createAccessToken(user) {
    const roles = user.roles.map((assignment) => assignment.role.code);
    const permissions = [
        ...new Set(user.roles.flatMap((assignment) => assignment.role.permissions.map((rolePermission) => rolePermission.permission.code))),
    ];
    const options = {
        subject: user.id,
        expiresIn: env_1.env.accessTokenExpiresIn,
    };
    return jsonwebtoken_1.default.sign({
        id: user.id,
        email: user.email,
        roles,
        permissions,
    }, env_1.env.jwtAccessSecret, options);
}
function createRefreshToken() {
    return node_crypto_1.default.randomBytes(64).toString('hex');
}
function hashRefreshToken(token) {
    return node_crypto_1.default.createHash('sha256').update(token).digest('hex');
}
function getRefreshExpirationDate() {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + env_1.env.refreshTokenDays);
    return expiresAt;
}
