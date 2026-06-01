/**
 * legalPackageAuthority.ts
 *
 * Pure utility module for loading and validating the legal package authority record.
 *
 * Design constraints (FAM-07L4):
 * - No database reads or writes
 * - No runtime mutations
 * - No Prisma client import
 * - Never throws for absent file, malformed JSON, or invalid data
 * - Returns typed discriminated-union result
 * - Does not log or expose secrets or env values
 * - Path resolved from process.cwd() (repo root)
 * - Test-only path override via LoadOptions.filePath
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

// ── Path constants ─────────────────────────────────────────────────────────────

export const AUTHORITY_RECORD_RELATIVE_PATH =
  'governance/legal/fam-07/supplier-onboarding-terms-authority.json';

export const AUTHORITY_RECORD_ABSOLUTE_PATH = path.resolve(
  process.cwd(),
  AUTHORITY_RECORD_RELATIVE_PATH,
);

// ── Enums / union types ────────────────────────────────────────────────────────

export type AuthorityRecordStatus =
  | 'DRAFT'
  | 'APPROVED_FOR_RUNTIME'
  | 'SUPERSEDED'
  | 'REVOKED';

export type AuthorityDiagnosticCode =
  | 'AUTHORITY_FILE_ABSENT'
  | 'AUTHORITY_FILE_PARSE_ERROR'
  | 'AUTHORITY_FIELD_MISSING'
  | 'AUTHORITY_FIELD_INVALID'
  | 'AUTHORITY_FIELD_LENGTH_EXCEEDED'
  | 'AUTHORITY_STATUS_DRAFT'
  | 'AUTHORITY_STATUS_SUPERSEDED'
  | 'AUTHORITY_STATUS_REVOKED'
  | 'AUTHORITY_ENV_MISMATCH';

// ── DB-imposed field length limits (from schema.prisma VarChar annotations) ───

const MAX_PACKAGE_VERSION_LENGTH = 120;
const MAX_PACKAGE_HASH_LENGTH = 256;
const MAX_SOURCE_URL_LENGTH = 1024;

// ── Allowed authority record status values ─────────────────────────────────────

const VALID_AUTHORITY_STATUSES: readonly AuthorityRecordStatus[] = [
  'DRAFT',
  'APPROVED_FOR_RUNTIME',
  'SUPERSEDED',
  'REVOKED',
];

// ── Types ──────────────────────────────────────────────────────────────────────

export interface LegalPackageAuthorityRecord {
  unitId: string;
  artifactVersion: string;
  agreementType: string;
  packageVersion: string;
  packageHash: string;
  hashAlgorithm: string;
  sourceUrl: string;
  effectiveDate: string;
  status: AuthorityRecordStatus;
  approvedBy: string;
  approvedByRole: string;
  approvalEvidence: string;
  approvalTimestamp: string;
  legalCounselReference: string;
  reconsentsRequired: boolean;
  reconsentsReason: string | null;
  supersededBy: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
  formatVersion: string;
}

export type AuthorityLoadResult =
  | { ok: true; record: LegalPackageAuthorityRecord }
  | { ok: false; code: AuthorityDiagnosticCode; message: string };

export interface AuthorityEnvMatchResult {
  match: boolean;
  code: AuthorityDiagnosticCode | null;
}

export interface AuthorityDiagnostic {
  present: boolean;
  status: string | null;
  package_version: string | null;
  source_url: string | null;
  env_match: boolean | null;
  legal_approved_transition_allowed: boolean;
  blocking_reason_code: string | null;
}

export interface LoadOptions {
  /**
   * Override the authority file path.
   * Intended for use in tests only. Do not pass runtime user input here.
   */
  filePath?: string;
}

// ── Loader ─────────────────────────────────────────────────────────────────────

/**
 * Load and validate the legal package authority record from the committed
 * governance file. Safe to call at any time — returns a typed failure result
 * for any error condition without throwing.
 */
export function loadLegalPackageAuthority(options?: LoadOptions): AuthorityLoadResult {
  const filePath = options?.filePath ?? AUTHORITY_RECORD_ABSOLUTE_PATH;

  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch {
    return {
      ok: false,
      code: 'AUTHORITY_FILE_ABSENT',
      message:
        'Legal package authority record not found. Authority record must be committed before legal-final transition can proceed.',
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      code: 'AUTHORITY_FILE_PARSE_ERROR',
      message:
        'Legal package authority record is not valid JSON. File must be corrected before legal-final transition can proceed.',
    };
  }

  return validateLegalPackageAuthorityRecord(parsed);
}

// ── Validator ──────────────────────────────────────────────────────────────────

/**
 * Validate a parsed authority record value against all field rules.
 * Returns a typed result — never throws.
 */
export function validateLegalPackageAuthorityRecord(value: unknown): AuthorityLoadResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      ok: false,
      code: 'AUTHORITY_FIELD_INVALID',
      message: 'Legal package authority record must be a JSON object.',
    };
  }

  const rec = value as Record<string, unknown>;

  // ── Required non-empty string fields ────────────────────────────────────────
  const requiredStringFields: Array<keyof LegalPackageAuthorityRecord> = [
    'unitId',
    'artifactVersion',
    'agreementType',
    'packageVersion',
    'packageHash',
    'hashAlgorithm',
    'sourceUrl',
    'effectiveDate',
    'status',
    'approvedBy',
    'approvedByRole',
    'approvalEvidence',
    'approvalTimestamp',
    'legalCounselReference',
    'formatVersion',
  ];

  for (const field of requiredStringFields) {
    if (!(field in rec) || rec[field] === null || rec[field] === undefined) {
      return {
        ok: false,
        code: 'AUTHORITY_FIELD_MISSING',
        message: `Legal package authority record is missing required field: ${field}.`,
      };
    }
    if (typeof rec[field] !== 'string' || (rec[field] as string).trim().length === 0) {
      return {
        ok: false,
        code: 'AUTHORITY_FIELD_INVALID',
        message: `Legal package authority record has an invalid value for field: ${field}.`,
      };
    }
  }

  // ── agreementType must be SUPPLIER_ONBOARDING_TERMS ─────────────────────────
  if (rec['agreementType'] !== 'SUPPLIER_ONBOARDING_TERMS') {
    return {
      ok: false,
      code: 'AUTHORITY_FIELD_INVALID',
      message: 'Legal package authority record has an invalid value for field: agreementType.',
    };
  }

  // ── hashAlgorithm must be sha256 ─────────────────────────────────────────────
  if (rec['hashAlgorithm'] !== 'sha256') {
    return {
      ok: false,
      code: 'AUTHORITY_FIELD_INVALID',
      message: 'Legal package authority record has an invalid value for field: hashAlgorithm.',
    };
  }

  // ── formatVersion must be '1' ────────────────────────────────────────────────
  if (rec['formatVersion'] !== '1') {
    return {
      ok: false,
      code: 'AUTHORITY_FIELD_INVALID',
      message: 'Legal package authority record has an invalid value for field: formatVersion.',
    };
  }

  // ── status must be a known AuthorityRecordStatus ─────────────────────────────
  if (!VALID_AUTHORITY_STATUSES.includes(rec['status'] as AuthorityRecordStatus)) {
    return {
      ok: false,
      code: 'AUTHORITY_FIELD_INVALID',
      message: 'Legal package authority record has an invalid value for field: status.',
    };
  }

  // ── DB-imposed field length limits ───────────────────────────────────────────
  if ((rec['packageVersion'] as string).length > MAX_PACKAGE_VERSION_LENGTH) {
    return {
      ok: false,
      code: 'AUTHORITY_FIELD_LENGTH_EXCEEDED',
      message: `Legal package authority record field packageVersion exceeds maximum allowed length (${MAX_PACKAGE_VERSION_LENGTH}).`,
    };
  }
  if ((rec['packageHash'] as string).length > MAX_PACKAGE_HASH_LENGTH) {
    return {
      ok: false,
      code: 'AUTHORITY_FIELD_LENGTH_EXCEEDED',
      message: `Legal package authority record field packageHash exceeds maximum allowed length (${MAX_PACKAGE_HASH_LENGTH}).`,
    };
  }
  if ((rec['sourceUrl'] as string).length > MAX_SOURCE_URL_LENGTH) {
    return {
      ok: false,
      code: 'AUTHORITY_FIELD_LENGTH_EXCEEDED',
      message: `Legal package authority record field sourceUrl exceeds maximum allowed length (${MAX_SOURCE_URL_LENGTH}).`,
    };
  }

  // ── reconsentsRequired must be boolean ───────────────────────────────────────
  if (!('reconsentsRequired' in rec)) {
    return {
      ok: false,
      code: 'AUTHORITY_FIELD_MISSING',
      message: 'Legal package authority record is missing required field: reconsentsRequired.',
    };
  }
  if (typeof rec['reconsentsRequired'] !== 'boolean') {
    return {
      ok: false,
      code: 'AUTHORITY_FIELD_INVALID',
      message: 'Legal package authority record has an invalid value for field: reconsentsRequired.',
    };
  }

  // ── reconsentsReason: required non-empty if reconsentsRequired = true ─────────
  if (rec['reconsentsRequired'] === true) {
    if (
      !rec['reconsentsReason'] ||
      typeof rec['reconsentsReason'] !== 'string' ||
      (rec['reconsentsReason'] as string).trim().length === 0
    ) {
      return {
        ok: false,
        code: 'AUTHORITY_FIELD_INVALID',
        message: 'Legal package authority record has an invalid value for field: reconsentsReason.',
      };
    }
  }

  // ── Nullable fields must be present (even if null) ───────────────────────────
  for (const field of ['supersededBy', 'revokedAt', 'revokedReason', 'reconsentsReason'] as const) {
    if (!(field in rec)) {
      return {
        ok: false,
        code: 'AUTHORITY_FIELD_MISSING',
        message: `Legal package authority record is missing required field: ${field}.`,
      };
    }
  }

  // ── revokedReason required if revokedAt is set ───────────────────────────────
  const revokedAt = rec['revokedAt'];
  if (revokedAt !== null && revokedAt !== undefined) {
    const revokedReason = rec['revokedReason'];
    if (
      !revokedReason ||
      typeof revokedReason !== 'string' ||
      (revokedReason as string).trim().length === 0
    ) {
      return {
        ok: false,
        code: 'AUTHORITY_FIELD_INVALID',
        message: 'Legal package authority record has an invalid value for field: revokedReason.',
      };
    }
  }

  // ── Build typed record ───────────────────────────────────────────────────────
  const record: LegalPackageAuthorityRecord = {
    unitId: rec['unitId'] as string,
    artifactVersion: rec['artifactVersion'] as string,
    agreementType: rec['agreementType'] as string,
    packageVersion: rec['packageVersion'] as string,
    packageHash: rec['packageHash'] as string,
    hashAlgorithm: rec['hashAlgorithm'] as string,
    sourceUrl: rec['sourceUrl'] as string,
    effectiveDate: rec['effectiveDate'] as string,
    status: rec['status'] as AuthorityRecordStatus,
    approvedBy: rec['approvedBy'] as string,
    approvedByRole: rec['approvedByRole'] as string,
    approvalEvidence: rec['approvalEvidence'] as string,
    approvalTimestamp: rec['approvalTimestamp'] as string,
    legalCounselReference: rec['legalCounselReference'] as string,
    reconsentsRequired: rec['reconsentsRequired'] as boolean,
    reconsentsReason: (rec['reconsentsReason'] ?? null) as string | null,
    supersededBy: (rec['supersededBy'] ?? null) as string | null,
    revokedAt: (rec['revokedAt'] ?? null) as string | null,
    revokedReason: (rec['revokedReason'] ?? null) as string | null,
    formatVersion: rec['formatVersion'] as string,
  };

  // ── Status-level gate checks ─────────────────────────────────────────────────
  // Structurally valid but non-APPROVED statuses block legal-final transition.
  if (record.status === 'DRAFT') {
    return {
      ok: false,
      code: 'AUTHORITY_STATUS_DRAFT',
      message:
        'Legal package authority is in DRAFT status. Explicit APPROVED_FOR_RUNTIME authorization required.',
    };
  }
  if (record.status === 'SUPERSEDED') {
    return {
      ok: false,
      code: 'AUTHORITY_STATUS_SUPERSEDED',
      message:
        'Legal package authority has been superseded. A current APPROVED_FOR_RUNTIME record is required.',
    };
  }
  if (record.status === 'REVOKED') {
    return {
      ok: false,
      code: 'AUTHORITY_STATUS_REVOKED',
      message: 'Legal package authority has been revoked. Re-consent may be required.',
    };
  }

  return { ok: true, record };
}

// ── Env-match checker ──────────────────────────────────────────────────────────

/**
 * Compare the authority record's package identity against env-configured
 * consent policy coordinates.
 *
 * @param record   A successfully loaded APPROVED_FOR_RUNTIME authority record.
 * @param env      Optional env object for testing. Defaults to process.env.
 *
 * Never returns raw env values in the result.
 */
export function checkAuthorityEnvMatch(
  record: LegalPackageAuthorityRecord,
  env?: Record<string, string | undefined>,
): AuthorityEnvMatchResult {
  const source = env ?? process.env;
  const normalize = (v: string | undefined): string => v?.trim() ?? '';

  const envVersion = normalize(source['CONSENT_SCAFFOLD_EXPECTED_VERSION']);
  const envHash = normalize(source['CONSENT_SCAFFOLD_EXPECTED_HASH']);
  const envSourceUrl = normalize(source['CONSENT_SCAFFOLD_EXPECTED_SOURCE_URL']);

  if (!envVersion || !envHash || !envSourceUrl) {
    return { match: false, code: 'AUTHORITY_ENV_MISMATCH' };
  }

  if (
    envVersion !== record.packageVersion ||
    envHash !== record.packageHash ||
    envSourceUrl !== record.sourceUrl
  ) {
    return { match: false, code: 'AUTHORITY_ENV_MISMATCH' };
  }

  return { match: true, code: null };
}

// ── Diagnostic builder ─────────────────────────────────────────────────────────

/**
 * Build an admin-safe diagnostic block for a given load result and optional
 * env-match result.
 *
 * Rules:
 * - Does not include packageHash (not useful for diagnosis, avoids oracle risk)
 * - Does not include raw env values
 * - legal_approved_transition_allowed is true only when record is APPROVED_FOR_RUNTIME
 *   AND env match is confirmed
 */
export function buildAuthorityDiagnostic(
  loadResult: AuthorityLoadResult,
  envMatchResult?: AuthorityEnvMatchResult,
): AuthorityDiagnostic {
  if (!loadResult.ok) {
    return {
      present: loadResult.code !== 'AUTHORITY_FILE_ABSENT',
      status: null,
      package_version: null,
      source_url: null,
      env_match: null,
      legal_approved_transition_allowed: false,
      blocking_reason_code: loadResult.code,
    };
  }

  const record = loadResult.record;
  const envMatch = envMatchResult?.match ?? null;
  const allowed = record.status === 'APPROVED_FOR_RUNTIME' && envMatch === true;

  return {
    present: true,
    status: record.status,
    package_version: record.packageVersion,
    source_url: record.sourceUrl,
    env_match: envMatch,
    legal_approved_transition_allowed: allowed,
    blocking_reason_code: allowed ? null : (envMatchResult?.code ?? null),
  };
}
