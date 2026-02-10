import type { FastifyInstance } from 'fastify';

/**
 * Email Notification Stubs
 *
 * Provides placeholder functions for email notifications.
 * In production, these would integrate with SendGrid, AWS SES, or similar.
 *
 * Current behavior: Logs to console (can be replaced with actual email service)
 */

/**
 * Sends password reset email with token link
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  fastify: FastifyInstance
): Promise<void> {
  // In production, send actual email with reset link
  // For now, log to console (can be replaced with email service)
  fastify.log.info({
    type: 'EMAIL_STUB',
    action: 'PASSWORD_RESET',
    email,
    resetLink: `${process.env.FRONTEND_URL || 'http://localhost:4000'}/reset-password?token=${resetToken}`,
  });

  // TODO: Replace with actual email service integration
  // Example: await sendgrid.send({ to: email, template: 'password-reset', data: { resetToken } });
}

/**
 * Sends email verification email with token link
 */
export async function sendEmailVerificationEmail(
  email: string,
  verificationToken: string,
  fastify: FastifyInstance
): Promise<void> {
  // In production, send actual email with verification link
  // For now, log to console (can be replaced with email service)
  fastify.log.info({
    type: 'EMAIL_STUB',
    action: 'EMAIL_VERIFICATION',
    email,
    verificationLink: `${process.env.FRONTEND_URL || 'http://localhost:4000'}/verify-email?token=${verificationToken}`,
  });

  // TODO: Replace with actual email service integration
  // Example: await sendgrid.send({ to: email, template: 'email-verification', data: { verificationToken } });
}
