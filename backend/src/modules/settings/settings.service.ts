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
  smtpEnabled: false,
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: null,
  smtpPassword: null,
  smtpFromName: 'Mes de la Ingenieria',
  smtpFromEmail: null,
  smtpReplyTo: null,
  smtpBatchSize: 40,
  smtpBatchDelayMs: 1500,
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

  return (prisma.siteSetting.upsert as any)({
    where: { id: SETTINGS_ID },
    update: {},
    create: defaultSettings,
  });
}

export function sanitizeSiteSettings(settings: any, includeSmtp = false) {
  const base = {
    id: settings.id,
    brandName: settings.brandName,
    heroTitle: settings.heroTitle,
    logoUrl: settings.logoUrl,
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };

  if (!includeSmtp) {
    return base;
  }

  return {
    ...base,
    smtpEnabled: Boolean(settings.smtpEnabled),
    smtpHost: settings.smtpHost || 'smtp.gmail.com',
    smtpPort: settings.smtpPort || 587,
    smtpSecure: Boolean(settings.smtpSecure),
    smtpUser: settings.smtpUser || '',
    smtpPasswordConfigured: Boolean(settings.smtpPassword),
    smtpFromName: settings.smtpFromName || settings.brandName || 'Mes de la Ingenieria',
    smtpFromEmail: settings.smtpFromEmail || '',
    smtpReplyTo: settings.smtpReplyTo || '',
    smtpBatchSize: settings.smtpBatchSize || 40,
    smtpBatchDelayMs: settings.smtpBatchDelayMs ?? 1500,
  };
}

export async function updateSiteSettings(input: UpdateSiteSettingsInput, actorId?: string) {
  const prisma = requirePrisma();
  const current = await getSiteSettings();
  const settings = await (prisma.siteSetting.update as any)({
    where: { id: SETTINGS_ID },
    data: {
      brandName: input.brandName === undefined ? undefined : input.brandName,
      heroTitle: input.heroTitle === undefined ? undefined : input.heroTitle,
      logoUrl: input.logoUrl === undefined ? undefined : input.logoUrl,
      smtpEnabled: input.smtpEnabled === undefined ? undefined : input.smtpEnabled,
      smtpHost: input.smtpHost === undefined ? undefined : input.smtpHost,
      smtpPort: input.smtpPort === undefined ? undefined : input.smtpPort,
      smtpSecure: input.smtpSecure === undefined ? undefined : input.smtpSecure,
      smtpUser: input.smtpUser === undefined ? undefined : input.smtpUser,
      smtpPassword:
        input.smtpPassword === undefined
          ? undefined
          : input.smtpPassword
            ? input.smtpPassword
            : null,
      smtpFromName: input.smtpFromName === undefined ? undefined : input.smtpFromName,
      smtpFromEmail: input.smtpFromEmail === undefined ? undefined : input.smtpFromEmail,
      smtpReplyTo: input.smtpReplyTo === undefined ? undefined : input.smtpReplyTo,
      smtpBatchSize: input.smtpBatchSize === undefined ? undefined : input.smtpBatchSize,
      smtpBatchDelayMs:
        input.smtpBatchDelayMs === undefined ? undefined : input.smtpBatchDelayMs,
    },
  });

  await createAuditLog({
    prisma,
    actorId,
    action: AuditAction.UPDATE,
    entity: 'SiteSetting',
    oldValues: sanitizeSiteSettings(current, true),
    newValues: sanitizeSiteSettings(settings, true),
  });

  return settings;
}
