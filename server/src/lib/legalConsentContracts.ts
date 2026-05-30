import { z } from 'zod';

export const legalConsentStatusSchema = z.enum([
  'LEGAL_PENDING',
  'LEGAL_APPROVED',
  'SUPERSEDED',
]);

export const legalConsentSourceFlowSchema = z.enum([
  'ACTIVATE_NEW_USER',
  'ACTIVATE_AUTHENTICATED_INVITE',
  'ADMIN_REVIEW',
]);

export const legalConsentAgreementTypeSchema = z.enum([
  'PLATFORM_TERMS',
  'SUPPLIER_ONBOARDING_TERMS',
  'PRIVACY_NOTICE_ACK',
]);

export const legalConsentEventTypeSchema = z.enum([
  'CHECKPOINT_PRESENTED',
  'ACCEPTED_PENDING',
  'ACCEPTED_FINAL',
  'SUPERSEDED',
  'RECONSENT_REQUIRED',
  'RECONSENT_COMPLETED',
  'GATE_REJECTED',
]);

export const consentAgreementMetadataSchema = z.object({
  agreementType: legalConsentAgreementTypeSchema,
  agreementVersion: z.string().min(1),
  agreementHash: z.string().min(1),
  agreementSourceUrl: z.string().url(),
  legalStatus: legalConsentStatusSchema,
});

export const consentAcceptanceSchema = consentAgreementMetadataSchema.extend({
  sourceFlow: legalConsentSourceFlowSchema,
  accepted: z.boolean(),
  acceptedAt: z.string().datetime(),
  reviewedAt: z.string().datetime().optional(),
  correlationId: z.string().uuid().optional(),
  requestId: z.string().min(1).max(100).optional(),
  metadataJson: z.record(z.any()).optional(),
});

export const consentSnapshotSchema = consentAgreementMetadataSchema.extend({
  actorUserId: z.string().uuid(),
  orgId: z.string().uuid(),
  tenantId: z.string().uuid().optional(),
  sourceFlow: legalConsentSourceFlowSchema,
  acceptedAt: z.string().datetime().optional(),
  reviewedAt: z.string().datetime().optional(),
  correlationId: z.string().uuid().optional(),
  requestId: z.string().min(1).max(100).optional(),
  metadataJson: z.record(z.any()).optional(),
});

export type LegalConsentStatus = z.infer<typeof legalConsentStatusSchema>;
export type LegalConsentSourceFlow = z.infer<typeof legalConsentSourceFlowSchema>;
export type LegalConsentAgreementType = z.infer<typeof legalConsentAgreementTypeSchema>;
export type LegalConsentEventType = z.infer<typeof legalConsentEventTypeSchema>;

export type ConsentAgreementMetadata = z.infer<typeof consentAgreementMetadataSchema>;
export type ConsentAcceptance = z.infer<typeof consentAcceptanceSchema>;
export type ConsentSnapshot = z.infer<typeof consentSnapshotSchema>;
