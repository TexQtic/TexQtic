import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  consentAcceptanceSchema,
  consentSnapshotSchema,
  legalConsentAgreementTypeSchema,
  legalConsentEventTypeSchema,
  legalConsentSourceFlowSchema,
  legalConsentStatusSchema,
} from '../lib/legalConsentContracts';

const SERVER_ROOT = path.resolve(__dirname, '../../');
const SCHEMA_PATH = path.join(SERVER_ROOT, 'prisma/schema.prisma');
const MIGRATION_PATH = path.join(
  SERVER_ROOT,
  'prisma/migrations/20260537000000_fam_07e1_consent_scaffold_contract/migration.sql',
);
const TENANT_ROUTE_PATH = path.join(SERVER_ROOT, 'src/routes/tenant.ts');

function extractModelBlock(schema: string, modelName: string): string {
  const startIdx = schema.indexOf(`model ${modelName} {`);
  expect(startIdx).toBeGreaterThan(-1);

  let depth = 0;
  let i = startIdx;
  while (i < schema.length) {
    if (schema[i] === '{') depth++;
    else if (schema[i] === '}') {
      depth--;
      if (depth === 0) return schema.slice(startIdx, i + 1);
    }
    i++;
  }

  return schema.slice(startIdx);
}

describe('FAM-07E1 — static schema scaffold', () => {
  let schema: string;

  beforeAll(() => {
    expect(fs.existsSync(SCHEMA_PATH)).toBe(true);
    schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  });

  it('defines LegalConsentSnapshot model with placeholder metadata fields', () => {
    const block = extractModelBlock(schema, 'LegalConsentSnapshot');
    expect(block).toContain('agreementVersion');
    expect(block).toContain('agreementHash');
    expect(block).toContain('agreementSourceUrl');
    expect(block).toContain('legalStatus');
    expect(block).toContain('sourceFlow');
    expect(block).toContain('metadataJson');
    expect(block).toContain('@@map("legal_consent_snapshots")');
  });

  it('defines LegalConsentEvent immutable history model', () => {
    const block = extractModelBlock(schema, 'LegalConsentEvent');
    expect(block).toContain('occurredAt');
    expect(block).toContain('eventType');
    expect(block).toContain('agreementVersion');
    expect(block).toContain('agreementHash');
    expect(block).toContain('agreementSourceUrl');
    expect(block).toContain('@@map("legal_consent_events")');
    expect(block).not.toContain('updatedAt');
  });

  it('defines stable legal consent enums', () => {
    expect(schema).toMatch(/enum LegalConsentStatus\s*\{[\s\S]*LEGAL_PENDING[\s\S]*LEGAL_APPROVED[\s\S]*SUPERSEDED/);
    expect(schema).toMatch(/enum LegalConsentSourceFlow\s*\{[\s\S]*ACTIVATE_NEW_USER[\s\S]*ACTIVATE_AUTHENTICATED_INVITE[\s\S]*ADMIN_REVIEW/);
    expect(schema).toMatch(/enum LegalConsentAgreementType\s*\{[\s\S]*PLATFORM_TERMS[\s\S]*SUPPLIER_ONBOARDING_TERMS[\s\S]*PRIVACY_NOTICE_ACK/);
    expect(schema).toMatch(/enum LegalConsentEventType\s*\{[\s\S]*CHECKPOINT_PRESENTED[\s\S]*ACCEPTED_PENDING[\s\S]*GATE_REJECTED/);
  });
});

describe('FAM-07E1 — migration scaffold exists and is contract-aligned', () => {
  let sql: string;

  beforeAll(() => {
    expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
    sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
  });

  it('declares legal consent enum types and tables', () => {
    expect(sql).toContain('CREATE TYPE public.legal_consent_status AS ENUM');
    expect(sql).toContain('CREATE TYPE public.legal_consent_source_flow AS ENUM');
    expect(sql).toContain('CREATE TYPE public.legal_consent_agreement_type AS ENUM');
    expect(sql).toContain('CREATE TYPE public.legal_consent_event_type AS ENUM');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.legal_consent_snapshots');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.legal_consent_events');
  });

  it('keeps legal-pending posture available by default', () => {
    expect(sql).toContain("DEFAULT 'LEGAL_PENDING'");
  });
});

describe('FAM-07E1 — contract validators', () => {
  it('supports LEGAL_PENDING placeholder metadata without legal-final wording', () => {
    const parsed = consentAcceptanceSchema.parse({
      agreementType: 'PLATFORM_TERMS',
      agreementVersion: 'PENDING_FINAL_LEGAL_PACKAGE',
      agreementHash: 'PENDING_FINAL_LEGAL_PACKAGE',
      agreementSourceUrl: 'https://app.texqtic.com/legal/pending-final-package',
      legalStatus: 'LEGAL_PENDING',
      sourceFlow: 'ACTIVATE_NEW_USER',
      accepted: true,
      acceptedAt: new Date().toISOString(),
      requestId: 'fam-07e1-contract-test',
      metadataJson: { note: 'placeholder metadata accepted' },
    });

    expect(parsed.legalStatus).toBe('LEGAL_PENDING');
  });

  it('exposes stable enums for downstream activation contract wiring', () => {
    expect(legalConsentStatusSchema.options).toEqual([
      'LEGAL_PENDING',
      'LEGAL_APPROVED',
      'SUPERSEDED',
    ]);
    expect(legalConsentSourceFlowSchema.options).toEqual([
      'ACTIVATE_NEW_USER',
      'ACTIVATE_AUTHENTICATED_INVITE',
      'ADMIN_REVIEW',
    ]);
    expect(legalConsentAgreementTypeSchema.options).toEqual([
      'PLATFORM_TERMS',
      'SUPPLIER_ONBOARDING_TERMS',
      'PRIVACY_NOTICE_ACK',
    ]);
    expect(legalConsentEventTypeSchema.options).toEqual([
      'CHECKPOINT_PRESENTED',
      'ACCEPTED_PENDING',
      'ACCEPTED_FINAL',
      'SUPERSEDED',
      'RECONSENT_REQUIRED',
      'RECONSENT_COMPLETED',
      'GATE_REJECTED',
    ]);
  });

  it('keeps snapshot contract placeholder-friendly', () => {
    const parsed = consentSnapshotSchema.parse({
      actorUserId: '11111111-1111-4111-8111-111111111111',
      orgId: '22222222-2222-4222-8222-222222222222',
      agreementType: 'SUPPLIER_ONBOARDING_TERMS',
      agreementVersion: 'PENDING_FINAL_LEGAL_PACKAGE',
      agreementHash: 'PENDING_FINAL_LEGAL_PACKAGE',
      agreementSourceUrl: 'https://app.texqtic.com/legal/pending-final-package',
      legalStatus: 'LEGAL_PENDING',
      sourceFlow: 'ACTIVATE_AUTHENTICATED_INVITE',
      acceptedAt: new Date().toISOString(),
    });

    expect(parsed.agreementVersion).toBe('PENDING_FINAL_LEGAL_PACKAGE');
  });
});

describe('FAM-07E1 — activation behavior not wired in this unit', () => {
  it('does not introduce consent enforcement error codes into activation routes', () => {
    const tenantRoute = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
    expect(tenantRoute).not.toContain('CONSENT_REQUIRED');
    expect(tenantRoute).not.toContain('CONSENT_VERSION_MISMATCH');
    expect(tenantRoute).not.toContain('CONSENT_HASH_MISMATCH');
    expect(tenantRoute).not.toContain('CONSENT_SOURCE_MISMATCH');
  });
});
