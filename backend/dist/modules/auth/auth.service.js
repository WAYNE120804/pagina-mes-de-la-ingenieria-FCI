"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.refresh = refresh;
exports.logout = logout;
exports.getMe = getMe;
const prisma_client_1 = require("../../lib/prisma-client");
const app_error_1 = require("../../lib/app-error");
const auth_token_1 = require("../../lib/auth-token");
const prisma_1 = require("../../lib/prisma");
const password_1 = require("../../lib/password");
const audit_1 = require("../../utils/audit");
const userAccessInclude = {
    roles: {
        include: {
            role: {
                include: {
                    permissions: {
                        include: {
                            permission: true,
                        },
                    },
                },
            },
        },
    },
};
function requirePrisma() {
    const prisma = (0, prisma_1.getPrisma)();
    if (!prisma) {
        throw new app_error_1.AppError('Base de datos no configurada', 500, 'DATABASE_NOT_CONFIGURED');
    }
    return prisma;
}
function sanitizeUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        programId: user.programId,
        semester: user.semester,
        universityCode: user.universityCode,
        photoUrl: user.photoUrl,
        status: user.status,
        roles: user.roles.map((assignment) => assignment.role.code),
        permissions: [
            ...new Set(user.roles.flatMap((assignment) => assignment.role.permissions.map((rolePermission) => rolePermission.permission.code))),
        ],
    };
}
async function createSession(userId, reqMeta) {
    const prisma = requirePrisma();
    const refreshToken = (0, auth_token_1.createRefreshToken)();
    await prisma.refreshSession.create({
        data: {
            userId,
            tokenHash: (0, auth_token_1.hashRefreshToken)(refreshToken),
            expiresAt: (0, auth_token_1.getRefreshExpirationDate)(),
            userAgent: reqMeta?.userAgent,
            ipAddress: reqMeta?.ipAddress,
        },
    });
    return refreshToken;
}
async function login(input, reqMeta) {
    const prisma = requirePrisma();
    const user = await prisma.user.findUnique({
        where: { email: input.email },
        include: userAccessInclude,
    });
    if (!user || user.deletedAt || user.status !== prisma_client_1.UserStatus.ACTIVE || !user.passwordHash) {
        throw new app_error_1.AppError('Credenciales invalidas', 401, 'INVALID_CREDENTIALS');
    }
    const validPassword = await (0, password_1.verifyPassword)(input.password, user.passwordHash);
    if (!validPassword) {
        throw new app_error_1.AppError('Credenciales invalidas', 401, 'INVALID_CREDENTIALS');
    }
    await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
    });
    await (0, audit_1.createAuditLog)({
        prisma,
        actorId: user.id,
        action: prisma_client_1.AuditAction.LOGIN,
        entity: 'User',
        entityId: user.id,
        ipAddress: reqMeta?.ipAddress,
        userAgent: reqMeta?.userAgent,
    });
    return {
        user: sanitizeUser(user),
        accessToken: (0, auth_token_1.createAccessToken)(user),
        refreshToken: await createSession(user.id, reqMeta),
    };
}
async function refresh(input) {
    const prisma = requirePrisma();
    const tokenHash = (0, auth_token_1.hashRefreshToken)(input.refreshToken);
    const session = await prisma.refreshSession.findUnique({
        where: { tokenHash },
        include: {
            user: {
                include: userAccessInclude,
            },
        },
    });
    if (!session ||
        session.revokedAt ||
        session.expiresAt < new Date() ||
        session.user.deletedAt ||
        session.user.status !== prisma_client_1.UserStatus.ACTIVE) {
        throw new app_error_1.AppError('Refresh token inválido', 401, 'INVALID_REFRESH_TOKEN');
    }
    await prisma.refreshSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
    });
    return {
        user: sanitizeUser(session.user),
        accessToken: (0, auth_token_1.createAccessToken)(session.user),
        refreshToken: await createSession(session.userId),
    };
}
async function logout(input, actorId) {
    const prisma = requirePrisma();
    const tokenHash = (0, auth_token_1.hashRefreshToken)(input.refreshToken);
    const session = await prisma.refreshSession.findUnique({
        where: { tokenHash },
    });
    if (session && !session.revokedAt) {
        await prisma.refreshSession.update({
            where: { id: session.id },
            data: { revokedAt: new Date() },
        });
    }
    if (actorId) {
        await (0, audit_1.createAuditLog)({
            prisma,
            actorId,
            action: prisma_client_1.AuditAction.LOGOUT,
            entity: 'User',
            entityId: actorId,
        });
    }
}
async function getMe(userId) {
    const prisma = requirePrisma();
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: userAccessInclude,
    });
    if (!user || user.deletedAt) {
        throw new app_error_1.AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }
    return sanitizeUser(user);
}
