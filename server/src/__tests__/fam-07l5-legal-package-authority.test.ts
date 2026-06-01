/**
 * fam-07l5-legal-package-authority.test.ts
 *
 * FAM-07L5 — Unit tests for legalPackageAuthority.ts
 *
 * All tests use fixture files in os.tmpdir(). No real database, no real env
 * values, no production authority record, no governance/legal/fam-07/ access.
 *
 * Test constraints:
 * - No LEGAL_APPROVED synthesis
 * - No ACCEPTED_FINAL event
 * - No real final legal document
 * - No connection to Prisma or any DB
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  buildAuthorityDiagnostic,
  checkAuthorityEnvMatch,
  loadLegalPackageAuthority,
  validateLegalPackageAuthorityRecord,
} from '../lib/legalPackageAuthority.js';

// ── Fixture helpers ────────────────────────────────────────────────────────────

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fam07l5-test-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeTmpFixture(name: string, content: string): string {
  const filePath = path.join(tmpDir, name);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

function absentPath(): string {
  return path.join(tmpDir, 'does-not-exist.json');
}

/** A structurally complete, APPROVED_FOR_RUNTIME authority record fixture. */
function validApprovedRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    unitId: 'FAM-07L3-SUPPLIER-ONBOARDING-TERMS-AUTHORITY-RECORD-CREATE-001',
    artifactVersion: '1.0.0',
    agreementType: 'SUPPLIER_ONBOARDING_TERMS',
    packageVersion: 'v1.0.0',
    packageHash: 'a'.repeat(64),
    hashAlgorithm: 'sha256',
    sourceUrl: 'https://legal.texqtic.com/supplier-terms/v1.0.0.md',
    effectiveDate: '2026-06-01',
    status: 'APPROVED_FOR_RUNTIME',
    approvedBy: 'Paresh Patel',
    approvedByRole: 'FOUNDER_OPERATOR',
    approvalEvidence: 'Approved via FAM-07L3',
    approvalTimestamp: '2026-06-01T10:00:00.000Z',
    legalCounselReference: 'TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001',
    reconsentsRequired: false,
    reconsentsReason: null,
    supersededBy: null,
    revokedAt: null,
    revokedReason: null,
    formatVersion: '1',
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('FAM-07L5 — loadLegalPackageAuthority', () => {
  it('1. absent file returns AUTHORITY_FILE_ABSENT', () => {
    const result = loadLegalPackageAuthority({ filePath: absentPath() });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('AUTHORITY_FILE_ABSENT');
    }
  });

  it('2. malformed JSON returns AUTHORITY_FILE_PARSE_ERROR', () => {
    const filePath = writeTmpFixture('malformed.json', '{bad json,,}');
    const result = loadLegalPackageAuthority({ filePath });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('AUTHORITY_FILE_PARSE_ERROR');
    }
  });

  it('3. missing required field returns AUTHORITY_FIELD_MISSING', () => {
    const record = validApprovedRecord();
    delete (record as Record<string, unknown>)['packageVersion'];
    const filePath = writeTmpFixture('missing-field.json', JSON.stringify(record));
    const result = loadLegalPackageAuthority({ filePath });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('AUTHORITY_FIELD_MISSING');
    }
  });

  it('4. invalid field type returns AUTHORITY_FIELD_INVALID', () => {
    const record = validApprovedRecord({ reconsentsRequired: 'yes' });
    const filePath = writeTmpFixture('invalid-type.json', JSON.stringify(record));
    const result = loadLegalPackageAuthority({ filePath });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('AUTHORITY_FIELD_INVALID');
    }
  });

  it('5. unknown status returns AUTHORITY_FIELD_INVALID', () => {
    const record = validApprovedRecord({ status: 'UNKNOWN_STATUS' });
    const filePath = writeTmpFixture('unknown-status.json', JSON.stringify(record));
    const result = loadLegalPackageAuthority({ filePath });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('AUTHORITY_FIELD_INVALID');
    }
  });

  it('6. DRAFT status returns AUTHORITY_STATUS_DRAFT', () => {
    const record = validApprovedRecord({ status: 'DRAFT' });
    const filePath = writeTmpFixture('draft.json', JSON.stringify(record));
    const result = loadLegalPackageAuthority({ filePath });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('AUTHORITY_STATUS_DRAFT');
    }
  });

  it('7. SUPERSEDED status returns AUTHORITY_STATUS_SUPERSEDED', () => {
    const record = validApprovedRecord({ status: 'SUPERSEDED' });
    const filePath = writeTmpFixture('superseded.json', JSON.stringify(record));
    const result = loadLegalPackageAuthority({ filePath });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('AUTHORITY_STATUS_SUPERSEDED');
    }
  });

  it('8. REVOKED status returns AUTHORITY_STATUS_REVOKED', () => {
    const record = validApprovedRecord({
      status: 'REVOKED',
      revokedAt: '2026-06-01T12:00:00.000Z',
      revokedReason: 'Contract terminated',
    });
    const filePath = writeTmpFixture('revoked.json', JSON.stringify(record));
    const result = loadLegalPackageAuthority({ filePath });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('AUTHORITY_STATUS_REVOKED');
    }
  });

  it('9. APPROVED_FOR_RUNTIME valid record returns ok: true', () => {
    const record = validApprovedRecord();
    const filePath = writeTmpFixture('approved.json', JSON.stringify(record));
    const result = loadLegalPackageAuthority({ filePath });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record.status).toBe('APPROVED_FOR_RUNTIME');
      expect(result.record.agreementType).toBe('SUPPLIER_ONBOARDING_TERMS');
      expect(result.record.packageVersion).toBe('v1.0.0');
    }
  });
});

// ── checkAuthorityEnvMatch ─────────────────────────────────────────────────────

describe('FAM-07L5 — checkAuthorityEnvMatch', () => {
  const approvedRecord = validApprovedRecord() as {
    packageVersion: string;
    packageHash: string;
    sourceUrl: string;
    [key: string]: unknown;
  };

  const matchingEnv = {
    CONSENT_SCAFFOLD_EXPECTED_VERSION: approvedRecord['packageVersion'] as string,
    CONSENT_SCAFFOLD_EXPECTED_HASH: approvedRecord['packageHash'] as string,
    CONSENT_SCAFFOLD_EXPECTED_SOURCE_URL: approvedRecord['sourceUrl'] as string,
  };

  // Load a valid record for env-match tests
  let validRecord: ReturnType<typeof validateLegalPackageAuthorityRecord> & { ok: true };

  beforeAll(() => {
    const filePath = writeTmpFixture('env-match-base.json', JSON.stringify(approvedRecord));
    const result = loadLegalPackageAuthority({ filePath });
    if (!result.ok) throw new Error('Fixture setup failed: ' + result.code);
    validRecord = result as typeof validRecord;
  });

  it('10. env match succeeds when all three fields match', () => {
    const result = checkAuthorityEnvMatch(validRecord.record, matchingEnv);
    expect(result.match).toBe(true);
    expect(result.code).toBeNull();
  });

  it('11. env mismatch on version returns AUTHORITY_ENV_MISMATCH', () => {
    const result = checkAuthorityEnvMatch(validRecord.record, {
      ...matchingEnv,
      CONSENT_SCAFFOLD_EXPECTED_VERSION: 'v999.0.0',
    });
    expect(result.match).toBe(false);
    expect(result.code).toBe('AUTHORITY_ENV_MISMATCH');
  });

  it('12. env mismatch on hash returns AUTHORITY_ENV_MISMATCH', () => {
    const result = checkAuthorityEnvMatch(validRecord.record, {
      ...matchingEnv,
      CONSENT_SCAFFOLD_EXPECTED_HASH: 'b'.repeat(64),
    });
    expect(result.match).toBe(false);
    expect(result.code).toBe('AUTHORITY_ENV_MISMATCH');
  });

  it('13. env mismatch on source URL returns AUTHORITY_ENV_MISMATCH', () => {
    const result = checkAuthorityEnvMatch(validRecord.record, {
      ...matchingEnv,
      CONSENT_SCAFFOLD_EXPECTED_SOURCE_URL: 'https://other.example.com/terms.md',
    });
    expect(result.match).toBe(false);
    expect(result.code).toBe('AUTHORITY_ENV_MISMATCH');
  });
});

// ── Field length limits ────────────────────────────────────────────────────────

describe('FAM-07L5 — field length limits', () => {
  it('14. packageVersion >120 chars returns AUTHORITY_FIELD_LENGTH_EXCEEDED', () => {
    const record = validApprovedRecord({ packageVersion: 'v' + 'x'.repeat(120) }); // 121 chars
    const result = validateLegalPackageAuthorityRecord(record);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('AUTHORITY_FIELD_LENGTH_EXCEEDED');
    }
  });

  it('15. packageHash >256 chars returns AUTHORITY_FIELD_LENGTH_EXCEEDED', () => {
    const record = validApprovedRecord({ packageHash: 'a'.repeat(257) });
    const result = validateLegalPackageAuthorityRecord(record);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('AUTHORITY_FIELD_LENGTH_EXCEEDED');
    }
  });

  it('16. sourceUrl >1024 chars returns AUTHORITY_FIELD_LENGTH_EXCEEDED', () => {
    const longUrl = 'https://legal.texqtic.com/' + 'x'.repeat(1000); // >1024
    const record = validApprovedRecord({ sourceUrl: longUrl });
    const result = validateLegalPackageAuthorityRecord(record);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('AUTHORITY_FIELD_LENGTH_EXCEEDED');
    }
  });
});

// ── Diagnostic shape ───────────────────────────────────────────────────────────

describe('FAM-07L5 — buildAuthorityDiagnostic', () => {
  it('17. diagnostic output omits package hash and raw env values', () => {
    const record = validApprovedRecord();
    const filePath = writeTmpFixture('diag-test.json', JSON.stringify(record));
    const loadResult = loadLegalPackageAuthority({ filePath });
    expect(loadResult.ok).toBe(true);

    const envMatchResult = { match: true, code: null };
    const diag = buildAuthorityDiagnostic(loadResult, envMatchResult);

    // Must have the required fields
    expect(diag).toHaveProperty('present');
    expect(diag).toHaveProperty('status');
    expect(diag).toHaveProperty('package_version');
    expect(diag).toHaveProperty('source_url');
    expect(diag).toHaveProperty('env_match');
    expect(diag).toHaveProperty('legal_approved_transition_allowed');
    expect(diag).toHaveProperty('blocking_reason_code');

    // Must NOT expose packageHash
    expect(diag).not.toHaveProperty('packageHash');
    expect(diag).not.toHaveProperty('package_hash');

    // Must NOT expose raw env values
    expect(diag).not.toHaveProperty('CONSENT_SCAFFOLD_EXPECTED_VERSION');
    expect(diag).not.toHaveProperty('CONSENT_SCAFFOLD_EXPECTED_HASH');
    expect(diag).not.toHaveProperty('CONSENT_SCAFFOLD_EXPECTED_SOURCE_URL');

    // Absent file → present: false, transition blocked, correct code
    const absentResult = loadLegalPackageAuthority({ filePath: absentPath() });
    const absentDiag = buildAuthorityDiagnostic(absentResult);
    expect(absentDiag.present).toBe(false);
    expect(absentDiag.legal_approved_transition_allowed).toBe(false);
    expect(absentDiag.blocking_reason_code).toBe('AUTHORITY_FILE_ABSENT');
    expect(absentDiag.status).toBeNull();
    expect(absentDiag).not.toHaveProperty('packageHash');
    expect(absentDiag).not.toHaveProperty('package_hash');
  });
});

// ── LEGAL_PENDING intake independence ─────────────────────────────────────────

describe('FAM-07L5 — LEGAL_PENDING intake independence', () => {
  it('18. legalPackageAuthority module does not import Prisma or tenant route functions', async () => {
    /**
     * Contract assertion: the loader module must be fully self-contained.
     * It must not import Prisma, tenant route functions, or any DB surface.
     * This ensures the authority record gate cannot interfere with existing
     * LEGAL_PENDING intake behavior.
     */
    const authorityModulePath = path.resolve(
      process.cwd(),
      'src/lib/legalPackageAuthority.ts',
    );
    expect(fs.existsSync(authorityModulePath)).toBe(true);

    const source = fs.readFileSync(authorityModulePath, 'utf-8');

    // Must not import Prisma client
    expect(source).not.toMatch(/@prisma\/client/);
    expect(source).not.toMatch(/from ['"]\.\.\/db\/prisma/);
    expect(source).not.toMatch(/from ['"]\.\.\/\.\.\/db\/prisma/);

    // Must not import tenant route functions
    expect(source).not.toMatch(/from ['"].*routes\/tenant/);
    expect(source).not.toMatch(/recordLegalPendingConsentScaffold/);
    expect(source).not.toMatch(/validateConsentForActivation/);
    expect(source).not.toMatch(/getConsentPolicyExpectation/);
  });
});
