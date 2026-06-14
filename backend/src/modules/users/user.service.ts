import { AuditAction, Prisma, RoleCode } from '../../lib/prisma-client';
import { AppError } from '../../lib/app-error';
import { getPrisma } from '../../lib/prisma';
import { hashPassword, verifyPassword } from '../../lib/password';
import { createAuditLog } from '../../utils/audit';
import { buildPaginationMeta, type PaginationParams } from '../../utils/pagination';
import { onlyActive, softDeleteData } from '../../utils/soft-delete';
import type {
  ChangeOwnPasswordInput,
  CreateUserInput,
  ListUsersQuery,
  ResetUserPasswordInput,
  UpdateOwnProfileInput,
  UpdateUserInput,
} from './user.schemas';

const DEFAULT_RESET_PASSWORD = 'UmzFCI2026*$';

const userInclude = {
  program: true,
  roles: {
    include: {
      role: true,
    },
  },
} satisfies Prisma.UserInclude;

function requirePrisma() {
  const prisma = getPrisma();

  if (!prisma) {
    throw new AppError('Base de datos no configurada', 500, 'DATABASE_NOT_CONFIGURED');
  }

  return prisma;
}

function sanitizeUser(user: Prisma.UserGetPayload<{ include: typeof userInclude }>) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    position: user.position,
    phone: user.phone,
    program: user.program,
    semester: user.semester,
    universityCode: user.universityCode,
    photoUrl: user.photoUrl,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    roles: user.roles.map((assignment) => assignment.role.code),
  };
}

async function resolveRoleIds(roleCodes: RoleCode[]) {
  const prisma = requirePrisma();
  const roles = await prisma.role.findMany({
    where: {
      code: { in: roleCodes },
    },
  });

  if (roles.length !== roleCodes.length) {
    throw new AppError('Uno o mas roles no existen', 400, 'ROLE_NOT_FOUND');
  }

  return roles.map((role) => role.id);
}

export async function listUsers(query: ListUsersQuery, pagination: PaginationParams) {
  const prisma = requirePrisma();
  const where: Prisma.UserWhereInput = {
    ...onlyActive,
    passwordHash: { not: null },
    status: query.status,
    OR: query.search
      ? [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { universityCode: { contains: query.search, mode: 'insensitive' } },
        ]
      : undefined,
    roles: query.role
      ? {
          some: {
            role: {
              code: query.role,
            },
          },
        }
      : undefined,
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: userInclude,
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
    }),
  ]);

  return {
    users: users.map(sanitizeUser),
    meta: buildPaginationMeta(total, pagination),
  };
}

export async function getUserById(id: string) {
  const prisma = requirePrisma();
  const user = await prisma.user.findFirst({
    where: {
      id,
      ...onlyActive,
    },
    include: userInclude,
  });

  if (!user) {
    throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
  }

  return sanitizeUser(user);
}

export async function createUser(input: CreateUserInput, actorId?: string) {
  const prisma = requirePrisma();
  const roleIds = await resolveRoleIds(input.roles);
  const passwordHash = input.password ? await hashPassword(input.password) : undefined;

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      position: input.position,
      passwordHash,
      phone: input.phone,
      programId: input.programId || null,
      semester: input.semester || null,
      universityCode: input.universityCode || null,
      photoUrl: input.photoUrl || null,
      status: input.status,
      roles: {
        create: roleIds.map((roleId) => ({ roleId })),
      },
    },
    include: userInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.CREATE,
    entity: 'User',
    entityId: user.id,
    newValues: { email: user.email, roles: input.roles },
  });

  return sanitizeUser(user);
}

export async function updateUser(id: string, input: UpdateUserInput, actorId?: string) {
  const prisma = requirePrisma();
  const existingUser = await prisma.user.findFirst({
    where: {
      id,
      ...onlyActive,
    },
    include: userInclude,
  });

  if (!existingUser) {
    throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
  }

  const roleIds = input.roles ? await resolveRoleIds(input.roles) : null;
  const user = await prisma.$transaction(async (tx) => {
    if (roleIds) {
      await tx.userRoleAssignment.deleteMany({
        where: { userId: id },
      });
    }

    return tx.user.update({
      where: { id },
      data: {
        name: input.name,
        email: input.email,
        position: input.position,
        phone: input.phone,
        programId: input.programId === undefined ? undefined : input.programId,
        semester: input.semester === undefined ? undefined : input.semester,
        universityCode:
          input.universityCode === undefined ? undefined : input.universityCode,
        photoUrl: input.photoUrl === undefined ? undefined : input.photoUrl,
        status: input.status,
        roles: roleIds
          ? {
              create: roleIds.map((roleId) => ({ roleId })),
            }
          : undefined,
      },
      include: userInclude,
    });
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.UPDATE,
    entity: 'User',
    entityId: user.id,
    oldValues: {
      email: existingUser.email,
      roles: existingUser.roles.map((assignment) => assignment.role.code),
    },
    newValues: {
      email: user.email,
      roles: user.roles.map((assignment) => assignment.role.code),
    },
  });

  return sanitizeUser(user);
}

export async function updateOwnProfile(
  id: string,
  input: UpdateOwnProfileInput,
  actorId?: string
) {
  const prisma = requirePrisma();
  const existingUser = await prisma.user.findFirst({
    where: {
      id,
      ...onlyActive,
    },
    include: userInclude,
  });

  if (!existingUser) {
    throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      name: input.name,
      email: input.email,
      position: input.position,
      phone: input.phone,
      programId: input.programId === undefined ? undefined : input.programId,
      semester: input.semester === undefined ? undefined : input.semester,
      universityCode:
        input.universityCode === undefined ? undefined : input.universityCode,
      photoUrl: input.photoUrl === undefined ? undefined : input.photoUrl,
    },
    include: userInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.UPDATE,
    entity: 'User',
    entityId: id,
    oldValues: {
      email: existingUser.email,
      name: existingUser.name,
    },
    newValues: {
      email: user.email,
      name: user.name,
    },
  });

  return sanitizeUser(user);
}

export async function changeOwnPassword(
  id: string,
  input: ChangeOwnPasswordInput,
  actorId?: string
) {
  const prisma = requirePrisma();
  const user = await prisma.user.findFirst({
    where: {
      id,
      ...onlyActive,
    },
    include: userInclude,
  });

  if (!user || !user.passwordHash) {
    throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
  }

  const isValidPassword = await verifyPassword(input.currentPassword, user.passwordHash);

  if (!isValidPassword) {
    throw new AppError('La contraseña actual no es correcta', 400, 'INVALID_CURRENT_PASSWORD');
  }

  const passwordHash = await hashPassword(input.password);
  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      passwordHash,
    },
    include: userInclude,
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.UPDATE,
    entity: 'User',
    entityId: id,
    oldValues: { passwordChanged: false },
    newValues: { passwordChanged: true },
  });

  return sanitizeUser(updatedUser);
}

export async function resetUserPassword(
  id: string,
  _input: ResetUserPasswordInput,
  actorId?: string
) {
  const prisma = requirePrisma();
  const user = await prisma.user.findFirst({
    where: {
      id,
      ...onlyActive,
    },
    include: userInclude,
  });

  if (!user) {
    throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
  }

  const passwordHash = await hashPassword(DEFAULT_RESET_PASSWORD);
  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      passwordHash,
    },
    include: userInclude,
  });

  await prisma.refreshSession.updateMany({
    where: {
      userId: id,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.UPDATE,
    entity: 'User',
    entityId: id,
    oldValues: { passwordReset: false },
    newValues: { passwordReset: true },
  });

  return sanitizeUser(updatedUser);
}

export async function deleteUser(id: string, actorId?: string) {
  const prisma = requirePrisma();
  const user = await prisma.user.findFirst({
    where: {
      id,
      ...onlyActive,
    },
  });

  if (!user) {
    throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
  }

  await prisma.user.update({
    where: { id },
    data: softDeleteData(),
  });

  await prisma.refreshSession.updateMany({
    where: {
      userId: id,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.DELETE,
    entity: 'User',
    entityId: id,
    oldValues: { email: user.email },
  });
}
