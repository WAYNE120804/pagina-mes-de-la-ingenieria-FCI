import { AuditAction, Prisma, UserStatus } from '../../lib/prisma-client';
import { AppError } from '../../lib/app-error';
import {
  createAccessToken,
  createRefreshToken,
  getRefreshExpirationDate,
  hashRefreshToken,
} from '../../lib/auth-token';
import { getPrisma } from '../../lib/prisma';
import { verifyPassword } from '../../lib/password';
import { createAuditLog } from '../../utils/audit';
import type { LoginInput, RefreshTokenInput } from './auth.schemas';

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
} satisfies Prisma.UserInclude;

export type UserWithAccess = Prisma.UserGetPayload<{
  include: typeof userAccessInclude;
}>;

function requirePrisma() {
  const prisma = getPrisma();

  if (!prisma) {
    throw new AppError('Base de datos no configurada', 500, 'DATABASE_NOT_CONFIGURED');
  }

  return prisma;
}

function sanitizeUser(user: UserWithAccess) {
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
      ...new Set(
        user.roles.flatMap((assignment) =>
          assignment.role.permissions.map((rolePermission) => rolePermission.permission.code)
        )
      ),
    ],
  };
}

async function createSession(userId: string, reqMeta?: { userAgent?: string; ipAddress?: string }) {
  const prisma = requirePrisma();
  const refreshToken = createRefreshToken();

  await prisma.refreshSession.create({
    data: {
      userId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: getRefreshExpirationDate(),
      userAgent: reqMeta?.userAgent,
      ipAddress: reqMeta?.ipAddress,
    },
  });

  return refreshToken;
}

export async function login(input: LoginInput, reqMeta?: { userAgent?: string; ipAddress?: string }) {
  const prisma = requirePrisma();
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: userAccessInclude,
  });

  if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE || !user.passwordHash) {
    throw new AppError('Credenciales invalidas', 401, 'INVALID_CREDENTIALS');
  }

  const validPassword = await verifyPassword(input.password, user.passwordHash);

  if (!validPassword) {
    throw new AppError('Credenciales invalidas', 401, 'INVALID_CREDENTIALS');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createAuditLog({
    prisma,
    actorId: user.id,
    action: AuditAction.LOGIN,
    entity: 'User',
    entityId: user.id,
    ipAddress: reqMeta?.ipAddress,
    userAgent: reqMeta?.userAgent,
  });

  return {
    user: sanitizeUser(user),
    accessToken: createAccessToken(user),
    refreshToken: await createSession(user.id, reqMeta),
  };
}

export async function refresh(input: RefreshTokenInput) {
  const prisma = requirePrisma();
  const tokenHash = hashRefreshToken(input.refreshToken);
  const session = await prisma.refreshSession.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: userAccessInclude,
      },
    },
  });

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt < new Date() ||
    session.user.deletedAt ||
    session.user.status !== UserStatus.ACTIVE
  ) {
    throw new AppError('Refresh token inválido', 401, 'INVALID_REFRESH_TOKEN');
  }

  await prisma.refreshSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  return {
    user: sanitizeUser(session.user),
    accessToken: createAccessToken(session.user),
    refreshToken: await createSession(session.userId),
  };
}

export async function logout(input: RefreshTokenInput, actorId?: string) {
  const prisma = requirePrisma();
  const tokenHash = hashRefreshToken(input.refreshToken);
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
    await createAuditLog({
      prisma,
      actorId,
      action: AuditAction.LOGOUT,
      entity: 'User',
      entityId: actorId,
    });
  }
}

export async function getMe(userId: string) {
  const prisma = requirePrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: userAccessInclude,
  });

  if (!user || user.deletedAt) {
    throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
  }

  return sanitizeUser(user);
}
