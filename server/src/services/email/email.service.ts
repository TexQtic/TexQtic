/**
 * G-012 — Canonical Phase-1 Email Service
 *
 * Environment gating:
 *   development / test → structured console log (EMAIL_DEV_LOG) — no send
 *   production → SMTP via nodemailer; on SMTP config absent → structured log + warning
 *                                      on send failure → log error + re-throw
 *
 * Tenant safety: pure function — no RLS context, no DB reads.
 * Audit write is caller's responsibility (service writes only email events here).
 *
 * Stop-loss validation:
 *   - missing `to`      → throws EmailValidationError (MISSING_TO)
 *   - invalid email fmt → throws EmailValidationError (INVALID_TO)
 *   - missing `subject` → throws EmailValidationError (MISSING_SUBJECT)
 *   - no body content   → throws EmailValidationError (MISSING_BODY)
 */

import nodemailer from 'nodemailer';
import { config } from '../../config/index.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmailParams {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  /** Caller-supplied metadata attached to the dev log for traceability. */
  metadata?: Record<string, unknown>;
}

export interface EmailContext {
  tenantId?: string | null;
  triggeredBy?: 'user' | 'admin' | 'system';
  actorId?: string | null;
}

export type EmailDispatchStatus = 'DEV_LOGGED' | 'SKIPPED_SMTP_UNCONFIGURED' | 'SENT';

export interface EmailDispatchOutcome {
  status: EmailDispatchStatus;
}

// ---------------------------------------------------------------------------
// Error class (stop-loss)
// ---------------------------------------------------------------------------

export class EmailValidationError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'EmailValidationError';
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(params: EmailParams): void {
  if (!params.to || typeof params.to !== 'string') {
    throw new EmailValidationError('MISSING_TO', 'Email recipient (to) is required');
  }
  if (!EMAIL_RE.test(params.to)) {
    throw new EmailValidationError('INVALID_TO', `Invalid recipient email: ${params.to}`);
  }
  if (!params.subject || typeof params.subject !== 'string') {
    throw new EmailValidationError('MISSING_SUBJECT', 'Email subject is required');
  }
  if (!params.html && !params.text) {
    throw new EmailValidationError('MISSING_BODY', 'Email must include at least one of html or text');
  }
}

/** Returns true if SMTP is configured (all required vars present). */
function isSmtpConfigured(): boolean {
  return !!(config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS && config.SMTP_FROM);
}

/** Lazily-created transporter — recreated if called again (stateless module). */
function createTransporter() {
  return nodemailer.createTransport({
    host: config.SMTP_HOST ?? '',
    port: config.SMTP_PORT ?? 587,
    secure: (config.SMTP_PORT ?? 587) === 465,
    auth: {
      user: config.SMTP_USER ?? '',
      pass: config.SMTP_PASS ?? '',
    },
  });
}

// ---------------------------------------------------------------------------
// Canonical send function
// ---------------------------------------------------------------------------

/**
 * Send an email governed by Phase-1 rules:
 * - Validates inputs before any I/O (stop-loss)
 * - dev/test: structured log, no real send
 * - production + SMTP configured: real SMTP send; on failure → re-throw
 * - production + SMTP absent: structured log with WARNING (graceful fallback)
 *
 * @throws EmailValidationError  on bad inputs
 * @throws Error                 on SMTP send failure (production only)
 */
export async function sendEmail(
  params: EmailParams,
  context: EmailContext = {}
): Promise<EmailDispatchOutcome> {
  // Stop-loss — validate before any I/O
  validate(params);

  const env = config.NODE_ENV;
  const timestamp = new Date().toISOString();
  const smtpAvailable = isSmtpConfigured();

  const devPayload = {
    EVENT: 'EMAIL_DEV_LOG',
    timestamp,
    environment: env,
    to: params.to,
    subject: params.subject,
    htmlPreview: params.html ? `${params.html.slice(0, 200)}…` : undefined,
    textPreview: params.text ? `${params.text.slice(0, 200)}…` : undefined,
    tenantId: context.tenantId ?? null,
    triggeredBy: context.triggeredBy ?? 'system',
    actorId: context.actorId ?? null,
    metadata: params.metadata ?? {},
  };

  // --- Development / Test ---
  if (env !== 'production') {
    console.log(JSON.stringify(devPayload));
    return { status: 'DEV_LOGGED' };
  }

  // --- Production without SMTP config ---
  if (!smtpAvailable) {
    console.warn(
      JSON.stringify({
        EVENT: 'EMAIL_SMTP_UNCONFIGURED',
        timestamp,
        to: params.to,
        subject: params.subject,
        message:
          'SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS/SMTP_FROM missing). ' +
          'Email not sent. Set SMTP env vars to enable delivery in production.',
      })
    );
    return { status: 'SKIPPED_SMTP_UNCONFIGURED' };
  }

  // --- Production with SMTP ---
  const transporter = createTransporter();
  try {
    const info = await transporter.sendMail({
      from: config.SMTP_FROM ?? '',
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    console.log(
      JSON.stringify({
        EVENT: 'EMAIL_SENT',
        timestamp,
        to: params.to,
        subject: params.subject,
        messageId: info.messageId,
        tenantId: context.tenantId ?? null,
        triggeredBy: context.triggeredBy ?? 'system',
      })
    );
    return { status: 'SENT' };
  } catch (err) {
    console.error(
      JSON.stringify({
        EVENT: 'EMAIL_SEND_FAILED',
        timestamp,
        to: params.to,
        subject: params.subject,
        error: err instanceof Error ? err.message : String(err),
        tenantId: context.tenantId ?? null,
      })
    );
    throw err; // re-throw — caller handles error propagation
  }
}

// ---------------------------------------------------------------------------
// Named wrappers (backward-compatible call sites)
// ---------------------------------------------------------------------------

const FRONTEND_URL = config.FRONTEND_URL ?? 'http://localhost:4000';

/**
 * Send a password-reset email with the reset link.
 * `resetToken` is embedded in the link; the raw token is never logged.
 */
export async function sendPasswordResetEmail(
  to: string,
  resetToken: string,
  context: EmailContext = {}
): Promise<void> {
  const resetLink = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(resetToken)}`;
  await sendEmail(
    {
      to,
      subject: 'Reset your TexQtic password',
      html: `
        <p>You requested a password reset.</p>
        <p><a href="${resetLink}">Click here to reset your password</a></p>
        <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
      `.trim(),
      text: `Reset your password:\n${resetLink}\n\nThis link expires in 1 hour.`,
      metadata: { flow: 'password_reset' },
    },
    context
  );
}

/**
 * Send an email-verification email with the verification link.
 * `verificationToken` is embedded in the link; the raw token is never logged.
 */
export async function sendEmailVerificationEmail(
  to: string,
  verificationToken: string,
  context: EmailContext = {}
): Promise<void> {
  const verificationLink = `${FRONTEND_URL}/verify-email?token=${encodeURIComponent(verificationToken)}`;
  await sendEmail(
    {
      to,
      subject: 'Verify your TexQtic email address',
      html: `
        <p>Please verify your email address to complete registration.</p>
        <p><a href="${verificationLink}">Click here to verify your email</a></p>
      `.trim(),
      text: `Verify your email:\n${verificationLink}`,
      metadata: { flow: 'email_verification' },
    },
    context
  );
}

/**
 * Send a tenant member invitation email with the invite link.
 */
export async function sendInviteMemberEmail(
  to: string,
  inviteToken: string,
  orgName: string,
  context: EmailContext = {}
): Promise<EmailDispatchOutcome> {
  const inviteLink = `${FRONTEND_URL}/accept-invite?token=${encodeURIComponent(inviteToken)}&action=invite`;
  return sendEmail(
    {
      to,
      subject: `You've been invited to join ${orgName} on TexQtic`,
      html: `
        <p>You have been invited to join <strong>${orgName}</strong> on TexQtic.</p>
        <p><a href="${inviteLink}">Accept your invitation</a></p>
        <p>This invitation expires in 7 days.</p>
      `.trim(),
      text: `You've been invited to join ${orgName}.\nAccept: ${inviteLink}\n\nExpires in 7 days.`,
      metadata: { flow: 'member_invite', orgName },
    },
    context
  );
}
