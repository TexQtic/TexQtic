import type { FastifyInstance } from 'fastify';
import {
  sendPasswordResetEmail as _sendPasswordReset,
  sendEmailVerificationEmail as _sendEmailVerification,
} from '../services/email/email.service.js';

/**
 * @deprecated G-012: These stubs are superseded by email.service.ts.
 * This module is retained for historical reference only and delegates to
 * the canonical service. Do NOT add new flows here — use email.service.ts directly.
 */

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  _fastify: FastifyInstance
): Promise<void> {
  return _sendPasswordReset(email, resetToken);
}

export async function sendEmailVerificationEmail(
  email: string,
  verificationToken: string,
  _fastify: FastifyInstance
): Promise<void> {
  return _sendEmailVerification(email, verificationToken);
}
