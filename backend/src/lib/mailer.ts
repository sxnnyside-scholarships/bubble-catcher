import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config';
import { logger } from './logger';

/** Generic SMTP, not a vendor-specific API — works with any provider. Falls back to logging the link when SMTP isn't configured. */
let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!config.smtp) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: config.smtp.user && config.smtp.password ? { user: config.smtp.user, pass: config.smtp.password } : undefined,
  });

  return transporter;
}

async function sendMail(to: string, subject: string, text: string, logEvent: string, logLink: string): Promise<void> {
  const smtp = getTransporter();

  if (!smtp || !config.smtp) {
    logger.info(logEvent, { to, link: logLink });
    return;
  }

  try {
    await smtp.sendMail({ from: config.smtp.from, to, subject, text });
  } catch (err) {
    /* Never let a mail-delivery failure break the auth flow that triggered it — log and move on. */
    logger.error('mailer.send_failed', { to, reason: err instanceof Error ? err.message : String(err) });
  }
}

export function sendPasswordResetEmail(email: string, token: string): void {
  const link = `${config.frontendUrl}/reset-password?token=${token}`;
  void sendMail(
    email,
    'Reset your Bubble Catcher password',
    `Reset your password: ${link}\n\nThis link expires in ${config.passwordResetTokenExpiresInMinutes} minutes. If you didn't request this, ignore this email.`,
    'mailer.password_reset',
    link,
  );
}

export function sendEmailVerificationEmail(email: string, token: string): void {
  const link = `${config.frontendUrl}/verify-email?token=${token}`;
  void sendMail(
    email,
    'Verify your Bubble Catcher email',
    `Verify your email: ${link}\n\nThis link expires in ${config.emailVerificationTokenExpiresInHours} hours.`,
    'mailer.email_verification',
    link,
  );
}
