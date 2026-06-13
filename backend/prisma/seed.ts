import {
  PrismaClient,
  RoleCode,
  UserStatus,
  type Permission,
  type Role,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const seedAdminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@semanaingenieria.local';
const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin12345!';

const roles: Array<{ code: RoleCode; name: string; description: string }> = [
  {
    code: RoleCode.SUPER_ADMIN,
    name: 'Super administrador',
    description: 'Acceso total a configuracion, usuarios, auditoria y operacion.',
  },
  {
    code: RoleCode.ADMIN,
    name: 'Administrador',
    description: 'Gestion operativa general de la Semana de Ingenieria.',
  },
  {
    code: RoleCode.COORDINADOR,
    name: 'Coordinador',
    description: 'Gestion de eventos, equipos, torneos y actividades asignadas.',
  },
  {
    code: RoleCode.JURADO,
    name: 'Jurado',
    description: 'Evaluacion de entregables y proyectos del hackathon.',
  },
  {
    code: RoleCode.PONENTE,
    name: 'Ponente',
    description: 'Consulta de charlas, agenda y asistencia asociada.',
  },
  {
    code: RoleCode.LOGISTICA,
    name: 'Logistica',
    description: 'Registro de asistencia y apoyo operativo en espacios.',
  },
  {
    code: RoleCode.PARTICIPANTE,
    name: 'Participante',
    description: 'Inscripcion y participacion en eventos, torneos y hackathon.',
  },
];

const permissions = [
  ['users.read', 'users', 'read', 'Consultar usuarios'],
  ['users.write', 'users', 'write', 'Crear y editar usuarios'],
  ['roles.manage', 'roles', 'manage', 'Gestionar roles y permisos'],
  ['events.read', 'events', 'read', 'Consultar eventos'],
  ['events.write', 'events', 'write', 'Crear y editar eventos'],
  ['attendance.read', 'attendance', 'read', 'Consultar asistencia'],
  ['attendance.write', 'attendance', 'write', 'Registrar asistencia'],
  ['tournaments.read', 'tournaments', 'read', 'Consultar torneos'],
  ['tournaments.write', 'tournaments', 'write', 'Gestionar torneos y partidos'],
  ['hackathon.read', 'hackathon', 'read', 'Consultar hackathon'],
  ['hackathon.write', 'hackathon', 'write', 'Gestionar retos, equipos y entregables'],
  ['evaluations.read', 'evaluations', 'read', 'Consultar evaluaciones'],
  ['evaluations.write', 'evaluations', 'write', 'Registrar evaluaciones'],
  ['reports.read', 'reports', 'read', 'Consultar reportes'],
  ['reports.export', 'reports', 'export', 'Exportar reportes'],
  ['audit.read', 'audit', 'read', 'Consultar auditoria'],
] as const;

const nonSuperAdminPermissionCodes = permissions
  .map(([code]) => code)
  .filter((code) => !['users.write', 'roles.manage'].includes(code));

const rolePermissionCodes: Record<RoleCode, string[]> = {
  SUPER_ADMIN: permissions.map(([code]) => code),
  ADMIN: nonSuperAdminPermissionCodes,
  COORDINADOR: nonSuperAdminPermissionCodes,
  JURADO: nonSuperAdminPermissionCodes,
  PONENTE: nonSuperAdminPermissionCodes,
  LOGISTICA: nonSuperAdminPermissionCodes,
  PARTICIPANTE: nonSuperAdminPermissionCodes,
};

const academicPrograms = [
  ['Ingenieria en Sistemas y Telecomunicaciones', 'IST'],
  ['Ingenieria en Analitica de Datos', 'IAD'],
  ['Ingenieria en Ciberseguridad', 'ICIB'],
  ['Ingenieria Industrial', 'II'],
  ['Ingenieria Logistica', 'IL'],
];

const venues = [
  { name: 'Auditorio principal', location: 'Bloque central', capacity: 250 },
  { name: 'Sala de conferencias', location: 'Bloque academico', capacity: 120 },
  { name: 'Laboratorio de innovacion', location: 'Bloque de laboratorios', capacity: 40 },
  { name: 'Cancha multiple', location: 'Zona deportiva', capacity: 300 },
  { name: 'Coliseo universitario', location: 'Zona deportiva', capacity: 500 },
];

async function seedRoles() {
  const result = new Map<RoleCode, Role>();

  for (const role of roles) {
    const savedRole = await prisma.role.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        description: role.description,
      },
      create: role,
    });

    result.set(savedRole.code, savedRole);
  }

  return result;
}

async function seedPermissions() {
  const result = new Map<string, Permission>();

  for (const [code, module, action, description] of permissions) {
    const savedPermission = await prisma.permission.upsert({
      where: { code },
      update: {
        module,
        action,
        description,
      },
      create: {
        code,
        module,
        action,
        description,
      },
    });

    result.set(savedPermission.code, savedPermission);
  }

  return result;
}

async function seedRolePermissions(
  seededRoles: Map<RoleCode, Role>,
  seededPermissions: Map<string, Permission>
) {
  for (const [roleCode, permissionCodes] of Object.entries(rolePermissionCodes)) {
    const role = seededRoles.get(roleCode as RoleCode);

    if (!role) {
      continue;
    }

    const allowedPermissionIds = permissionCodes
      .map((permissionCode) => seededPermissions.get(permissionCode)?.id)
      .filter((permissionId): permissionId is string => Boolean(permissionId));

    await prisma.rolePermission.deleteMany({
      where: {
        roleId: role.id,
        permissionId: { notIn: allowedPermissionIds },
      },
    });

    for (const permissionCode of permissionCodes) {
      const permission = seededPermissions.get(permissionCode);

      if (!permission) {
        continue;
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }
}

async function seedAcademicPrograms() {
  for (const [name, code] of academicPrograms) {
    await prisma.academicProgram.upsert({
      where: { name },
      update: {
        code,
        isActive: true,
        deletedAt: null,
      },
      create: {
        name,
        code,
      },
    });
  }
}

async function seedVenues() {
  for (const venue of venues) {
    await prisma.venue.upsert({
      where: {
        name_location: {
          name: venue.name,
          location: venue.location,
        },
      },
      update: {
        capacity: venue.capacity,
        isActive: true,
        deletedAt: null,
      },
      create: venue,
    });
  }
}

async function seedAdminUser(seededRoles: Map<RoleCode, Role>) {
  const superAdminRole = seededRoles.get(RoleCode.SUPER_ADMIN);

  if (!superAdminRole) {
    return;
  }

  const passwordHash = await bcrypt.hash(seedAdminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: seedAdminEmail },
    update: {
      name: 'Administrador Semana de Ingenieria',
      passwordHash,
      status: UserStatus.ACTIVE,
      deletedAt: null,
    },
    create: {
      name: 'Administrador Semana de Ingenieria',
      email: seedAdminEmail,
      passwordHash,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.userRoleAssignment.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: superAdminRole.id,
    },
  });
}

async function main() {
  const seededRoles = await seedRoles();
  const seededPermissions = await seedPermissions();

  await seedRolePermissions(seededRoles, seededPermissions);
  await seedAcademicPrograms();
  await seedVenues();
  await seedAdminUser(seededRoles);

  console.log(
    `Seed completado: roles, permisos, programas academicos, espacios y admin (${seedAdminEmail}).`
  );
}

main()
  .catch((error) => {
    console.error('No fue posible ejecutar el seed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
