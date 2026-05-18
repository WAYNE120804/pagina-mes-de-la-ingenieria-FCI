import { AuditAction } from '../../lib/prisma-client';
import { AppError } from '../../lib/app-error';
import { getPrisma } from '../../lib/prisma';
import { createAuditLog } from '../../utils/audit';
import type { UpdateSiteSettingsInput } from './settings.schemas';

const SETTINGS_ID = 'public';

const defaultSettings = {
  id: SETTINGS_ID,
  brandName: 'Mes de la Ingenieria',
  heroTitle: 'Innovacion que transforma el futuro.',
  logoUrl: null,
};

function requirePrisma() {
  const prisma = getPrisma();

  if (!prisma) {
    throw new AppError('Base de datos no configurada', 500, 'DATABASE_NOT_CONFIGURED');
  }

  return prisma;
}

export async function getSiteSettings() {
  const prisma = requirePrisma();

  return prisma.siteSetting.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: defaultSettings,
  });
}

export async function updateSiteSettings(input: UpdateSiteSettingsInput, actorId?: string) {
  const prisma = requirePrisma();
  const current = await getSiteSettings();
  const settings = await prisma.siteSetting.update({
    where: { id: SETTINGS_ID },
    data: {
      brandName: input.brandName === undefined ? undefined : input.brandName,
      heroTitle: input.heroTitle === undefined ? undefined : input.heroTitle,
      logoUrl: input.logoUrl === undefined ? undefined : input.logoUrl,
    },
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.UPDATE,
    entity: 'SiteSetting',
    oldValues: current,
    newValues: settings,
  });

  return settings;
}
