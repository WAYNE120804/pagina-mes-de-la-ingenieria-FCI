import nodemailer from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';

import { getPrisma } from '../lib/prisma';
import { logger } from '../lib/logger';

type EmailRecipient = {
  email: string;
  name?: string | null;
};

type EmailMessage = {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  text: string;
  html?: string;
  attachments?: Mail.Attachment[];
};

function normalizeRecipients(to: EmailRecipient | EmailRecipient[]) {
  const recipients = Array.isArray(to) ? to : [to];
  const seen = new Set<string>();

  return recipients
    .map((recipient) => ({
      ...recipient,
      email: recipient.email.trim().toLowerCase(),
    }))
    .filter((recipient) => {
      if (!recipient.email || seen.has(recipient.email)) {
        return false;
      }

      seen.add(recipient.email);
      return true;
    });
}

function formatAddress(recipient: EmailRecipient) {
  return recipient.name
    ? { name: recipient.name, address: recipient.email }
    : recipient.email;
}

export async function getEmailSettings() {
  const prisma = getPrisma();

  if (!prisma) {
    return null;
  }

  const settings = await (prisma.siteSetting.upsert as any)({
    where: { id: 'public' },
    update: {},
    create: {
      id: 'public',
      brandName: 'Mes de la Ingenieria',
      heroTitle: 'Innovacion que transforma el futuro.',
      smtpEnabled: false,
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpSecure: false,
      smtpBatchSize: 40,
      smtpBatchDelayMs: 1500,
    },
  });

  return settings;
}

export function isEmailConfigured(settings: any) {
  return Boolean(
    settings?.smtpEnabled &&
      settings.smtpHost &&
      settings.smtpPort &&
      settings.smtpUser &&
      settings.smtpPassword &&
      settings.smtpFromEmail
  );
}

function createTransport(settings: any) {
  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: Boolean(settings.smtpSecure),
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPassword,
    },
  });
}

export async function sendEmailSafe(message: EmailMessage) {
  try {
    const settings = await getEmailSettings();

    if (!isEmailConfigured(settings)) {
      logger.info('Correo omitido: SMTP no configurado.');
      return { sent: 0, skipped: true, error: null };
    }

    const recipients = normalizeRecipients(message.to);

    if (!recipients.length) {
      return { sent: 0, skipped: true, error: null };
    }

    const transporter = createTransport(settings);
    const fromName = settings.smtpFromName || settings.brandName || 'Mes de la Ingenieria';
    const fromEmail = settings.smtpFromEmail;

    for (const recipient of recipients) {
      await transporter.sendMail({
        from: { name: fromName, address: fromEmail },
        to: formatAddress(recipient),
        replyTo: settings.smtpReplyTo || fromEmail,
        subject: message.subject,
        text: message.text,
        html: message.html,
        attachments: message.attachments,
        headers: {
          'X-Auto-Response-Suppress': 'All',
          'List-Unsubscribe': `<mailto:${settings.smtpReplyTo || fromEmail}>`,
        },
      });
    }

    return { sent: recipients.length, skipped: false, error: null };
  } catch (error) {
    logger.error('Fallo envio de correo opcional.', error);
    return { sent: 0, skipped: false, error };
  }
}

export async function sendBulkEmailSafe(message: EmailMessage) {
  const settings = await getEmailSettings();
  const recipients = normalizeRecipients(message.to);
  const batchSize = Math.max(Number(settings?.smtpBatchSize || 40), 1);
  const delayMs = Math.max(Number(settings?.smtpBatchDelayMs || 1500), 0);
  let sent = 0;

  for (let index = 0; index < recipients.length; index += batchSize) {
    const batch = recipients.slice(index, index + batchSize);
    const result = await sendEmailSafe({ ...message, to: batch });
    sent += result.sent;

    if (delayMs > 0 && index + batchSize < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { sent, total: recipients.length };
}
