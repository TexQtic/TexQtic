# FAM-07L4 — Control-Plane Legal Authority Technical Foundation Design

**Unit ID:** FAM-07L4-CONTROL-PLANE-LEGAL-AUTHORITY-TECHNICAL-FOUNDATION-DESIGN-001  
**Mode:** DESIGN ONLY — No source, test, backend, schema, migration, or governance tracker edits.  
**Status:** COMPLETE — Design produced.  
**Artifact type:** Technical foundation design (read-only; no implementation in this unit)  
**Governs:** Future `FAM-07L5` loader implementation unit

---

## Section 1 — Unit Identity and Mode Declaration

| Field | Value |
|---|---|
| **Unit ID** | FAM-07L4-CONTROL-PLANE-LEGAL-AUTHORITY-TECHNICAL-FOUNDATION-DESIGN-001 |
| **Layer** | L4 — Technical Foundation Design |
| **Family** | FAM-07 (Supplier Onboarding Legal Gate) |
| **Mode** | DESIGN ONLY |
| **Operator** | Paresh Patel (Founder / Operator) |
| **Authorized edits** | One new artifact file only |
| **Forbidden actions** | Source edits, test edits, backend edits, schema/migration edits, env edits, governance tracker edits, `governance/legal/fam-07/` creation, `LEGAL_APPROVED` synthesis, FAM-07 closure |

This unit exists to design the safest possible technical foundation for loading and validating a future legal package authority record, while lawyers are still reviewing the final legal text. It does not advance the legal gate, does not approve any package, and does not change any runtime behavior.

---

## Section 2 — Branch and HEAD

| Field | Value |
|---|---|
| **Branch** | `main` |
| **HEAD** | `be0e23d1` |
| **L3 commit** | `be0e23d1` — `docs(control-plane): record FAM-07 legal authority input blocker` |
| **L2 commit** | `6e819d75` — `docs(control-plane): design legal package authority` |
| **L1 commit** | `f163bacb` — (L1 legal gate next-action design) |

---

## Section 3 — Preflight Results

```
git status --short     →  (no output — clean tree)
git rev-parse --short HEAD  →  be0e23d1
L3 ancestry: 0 (confirmed)
L2 ancestry: 0 (confirmed)
L1 ancestry: 0 (confirmed)
K14 ancestry: 0 (confirmed)
```

**Preflight: PASS.** Tree is clean. All required ancestry checks pass.

---

## Section 4 — Lineage Confirmation

| Ancestor | Commit | Status | Final Enum |
|---|---|---|---|
| **L3** | `be0e23d1` | BLOCKED — authority record not created | `FAM_07L3_BLOCKED_MISSING_FINAL_PACKAGE_INPUTS` |
| **L2** | `6e819d75` | COMPLETE — authority design documented | `FAM_07L2_LEGAL_PACKAGE_AUTHORITY_DESIGN_COMPLETE` |
| **L1** | `f163bacb` | COMPLETE — gap inventory documented | `FAM_07L1_SELECTED_LEGAL_PACKAGE_AUTHORITY_DESIGN` |

**L3 block consequence:** The directory `governance/legal/fam-07/` does not exist. No authority record JSON exists. The L4 loader MUST safely handle the absent-file case as its primary runtime state until L3 can be unblocked with final lawyer-approved inputs.

---

## Section 5 — Repo-Truth Basis

The following surfaces were read and confirmed before writing this design. No source edits were made.

### 5a. `server/src/lib/legalConsentContracts.ts`

Contract-defined types confirmed:

| Type | Values |
|---|---|
| `LegalConsentStatus` | `LEGAL_PENDING`, `LEGAL_APPROVED`, `SUPERSEDED` |
| `LegalConsentEventType` | `CHECKPOINT_PRESENTED`, `ACCEPTED_PENDING`, `ACCEPTED_FINAL`, `SUPERSEDED`, `RECONSENT_REQUIRED`, `RECONSENT_COMPLETED`, `GATE_REJECTED` |
| `LegalConsentSourceFlow` | `ACTIVATE_NEW_USER`, `ACTIVATE_AUTHENTICATED_INVITE`, `ADMIN_REVIEW` |
| `LegalConsentAgreementType` | `PLATFORM_TERMS`, `SUPPLIER_ONBOARDING_TERMS`, `PRIVACY_NOTICE_ACK` |

**Target agreement type for FAM-07:** `SUPPLIER_ONBOARDING_TERMS`

### 5b. `server/prisma/schema.prisma` — Field Length Constraints (CRITICAL for authority record)

| DB field | Column type | Constraint |
|---|---|---|
| `agreementVersion` | `VarChar(120)` | Authority record `packageVersion` MUST fit within 120 characters |
| `agreementHash` | `VarChar(256)` | Authority record `packageHash` MUST fit within 256 characters |
| `agreementSourceUrl` | `VarChar(1024)` | Authority record `sourceUrl` MUST fit within 1024 characters |

These constraints are not set by the loader — they are DB-level guards. The loader validation design MUST enforce these limits before any downstream write could fail with a DB constraint error.

### 5c. `server/src/routes/tenant.ts` — Runtime Env Policy Surface (READ-ONLY)

Runtime consent policy is driven by three environment variables:

| Env variable | Used in | Current behavior |
|---|---|---|
| `FAM07_CONSENT_SCAFFOLD_ENFORCE` | `isConsentScaffoldEnforced()` | Must equal `'true'` to enforce |
| `CONSENT_SCAFFOLD_EXPECTED_VERSION` | `getConsentPolicyExpectation()` | Trimmed; `null` if empty |
| `CONSENT_SCAFFOLD_EXPECTED_HASH` | `getConsentPolicyExpectation()` | Trimmed; `null` if empty |
| `CONSENT_SCAFFOLD_EXPECTED_SOURCE_URL` | `getConsentPolicyExpectation()` | Trimmed; `null` if empty |

Existing `validateConsentForActivation()` validates: source-flow match, then version / hash / sourceUrl against policy — and returns typed error objects (`CONSENT_VERSION_MISMATCH`, `CONSENT_HASH_MISMATCH`, `CONSENT_SOURCE_MISMATCH`).

**Existing intake path (`recordLegalPendingConsentScaffold`)** writes only `legalStatus: LEGAL_PENDING` and `eventType: ACCEPTED_PENDING`. This path must remain untouched by L4 and L5.

### 5d. `server/src/routes/control.ts` — Diagnostic Surface (READ-ONLY)

The control-plane tenant detail endpoint already exposes:

```typescript
consent_scaffold_observability: {
  has_records: boolean,
  has_legal_approved_record: boolean,   // derived — always false in production
  latest_snapshot: ...,
  recent_events: [...],
}
```

`hasLegalApprovedRecord` is derived as:
```typescript
latestConsentSnapshot?.legalStatus === 'LEGAL_APPROVED' ||
consentEvents.some(e => e.legalStatus === 'LEGAL_APPROVED')
```

This is always `false` in production because no `ACCEPTED_FINAL` / `LEGAL_APPROVED` write path exists yet. The L4 design adds authority-record diagnostic fields to this surface — to be implemented in L5+.

### 5e. Existing Test Files (READ-ONLY)

| File | Coverage |
|---|---|
| `fam-07e1-consent-scaffold.contract.test.ts` | Schema structure, enum definitions, migration presence |
| `fam-07e5o-handoff-consent-transaction.test.ts` | Transaction safety, consent persistence, hash outside TX |

No existing test file covers authority record loading, validation, or diagnostic output. The L4 design specifies the full future test plan (Section 12).

---

## Section 6 — Loader Purpose

The authority record loader is a **single-responsibility read-only utility** whose only job is:

1. Read the committed JSON authority record from a deterministic repo-relative path.
2. Validate it structurally (required fields, known enums, value constraints).
3. Return a typed result that callers can use to make gating decisions.
4. **Never** throw an unhandled exception — it must be safe to call at any time, including when the file does not exist.

**Canonical authority record path** (from L2 design):
```
governance/legal/fam-07/supplier-onboarding-terms-authority.json
```

**Loader resolution rule:** The path is resolved relative to the repository root — not relative to the calling module's location. This avoids path drift across environments and build artifacts.

**Implementation module** (for L5):
```
server/src/lib/legalPackageAuthority.ts
```

**The loader must NOT:**
- Read or compare env variables (that is the env-match step, separate from loading).
- Write to the database.
- Accept external input — the path is hardcoded, not caller-supplied.
- Throw for absent file, malformed JSON, or invalid field values — it returns a typed failure result instead.
- Log or expose secrets.

---

## Section 7 — Validation Model

### 7a. Required Fields (from L2 design)

The authority record JSON must contain all of the following at the top level:

| Field | Type | Constraint |
|---|---|---|
| `unitId` | string | Non-empty |
| `artifactVersion` | string | Non-empty |
| `agreementType` | string | Must equal `SUPPLIER_ONBOARDING_TERMS` |
| `packageVersion` | string | Non-empty; MUST be ≤ 120 characters (DB constraint) |
| `packageHash` | string | Non-empty; MUST be ≤ 256 characters (DB constraint) |
| `hashAlgorithm` | string | Must equal `sha256` |
| `sourceUrl` | string | Valid URL format; MUST be ≤ 1024 characters (DB constraint) |
| `effectiveDate` | string | ISO 8601 date format (`YYYY-MM-DD`) |
| `status` | string | Must be one of the authority status enum (Section 7b) |
| `approvedBy` | string | Non-empty |
| `approvedByRole` | string | Non-empty |
| `approvalEvidence` | string | Non-empty |
| `approvalTimestamp` | string | ISO 8601 datetime format |
| `legalCounselReference` | string | Non-empty |
| `reconsentsRequired` | boolean | Must be a boolean |
| `reconsentsReason` | string or null | String if reconsentsRequired is true, null if false |
| `supersededBy` | string or null | Package version string or null |
| `revokedAt` | string or null | ISO 8601 datetime or null |
| `revokedReason` | string or null | String if revokedAt is set, null otherwise |
| `formatVersion` | string | Must equal `1` |

### 7b. Authority Status Enum

The authority record's `status` field uses a **separate enum from `LegalConsentStatus`**. The DB `LegalConsentStatus` enum governs snapshot/event rows; the authority record status governs the governance file.

| Authority Status Value | Meaning |
|---|---|
| `DRAFT` | Record created but not yet approved; legal gate blocked |
| `APPROVED_FOR_RUNTIME` | Fully approved; legal gate allowed (subject to env match) |
| `SUPERSEDED` | Replaced by a newer version; legal gate blocked for new transitions |
| `REVOKED` | Explicitly revoked; legal gate blocked; re-consent may be required |

### 7c. Validation Failure Codes

All validation failures return a structured result with a `code` field:

| Code | Trigger |
|---|---|
| `AUTHORITY_FILE_ABSENT` | File does not exist at the expected path |
| `AUTHORITY_FILE_PARSE_ERROR` | File exists but is not valid JSON |
| `AUTHORITY_FIELD_MISSING` | A required field is absent or null |
| `AUTHORITY_FIELD_INVALID` | A field fails type/format/enum validation |
| `AUTHORITY_FIELD_LENGTH_EXCEEDED` | A field exceeds a DB-imposed length limit |
| `AUTHORITY_STATUS_DRAFT` | Record exists and is structurally valid but `status === 'DRAFT'` |
| `AUTHORITY_STATUS_SUPERSEDED` | `status === 'SUPERSEDED'` |
| `AUTHORITY_STATUS_REVOKED` | `status === 'REVOKED'` |
| `AUTHORITY_ENV_MISMATCH` | Env variables do not match record fields (separate step, not loader) |

---

## Section 8 — Failure Behavior Matrix

This matrix defines the complete behavior of the technical foundation across all possible authority record states. "LEGAL_APPROVED transition allowed" refers to whether a future `ACCEPTED_FINAL` write would be gated open or blocked. Existing `LEGAL_PENDING` intake is **always unaffected** by every failure mode.

| State | `LEGAL_APPROVED` transition allowed? | Diagnostic code | Admin-safe message | `LEGAL_PENDING` intake impact |
|---|---|---|---|---|
| **File absent** (`governance/legal/fam-07/` does not exist or JSON not present) | ❌ Blocked | `AUTHORITY_FILE_ABSENT` | "Legal package authority record not found. Authority record must be committed before legal-final transition can proceed." | None — unaffected |
| **File malformed** (not valid JSON) | ❌ Blocked | `AUTHORITY_FILE_PARSE_ERROR` | "Legal package authority record is not valid JSON. File must be corrected before legal-final transition can proceed." | None — unaffected |
| **Field missing** (any required field absent) | ❌ Blocked | `AUTHORITY_FIELD_MISSING` | "Legal package authority record is missing required field: {fieldName}." | None — unaffected |
| **Field invalid** (wrong type, format, or enum value) | ❌ Blocked | `AUTHORITY_FIELD_INVALID` | "Legal package authority record has an invalid value for field: {fieldName}." | None — unaffected |
| **Field length exceeded** (exceeds DB constraint) | ❌ Blocked | `AUTHORITY_FIELD_LENGTH_EXCEEDED` | "Legal package authority record field {fieldName} exceeds maximum allowed length ({maxLen})." | None — unaffected |
| **Status = DRAFT** | ❌ Blocked | `AUTHORITY_STATUS_DRAFT` | "Legal package authority is in DRAFT status. Explicit APPROVED_FOR_RUNTIME authorization required." | None — unaffected |
| **Status = SUPERSEDED** | ❌ Blocked | `AUTHORITY_STATUS_SUPERSEDED` | "Legal package authority has been superseded. A current APPROVED_FOR_RUNTIME record is required." | None — unaffected |
| **Status = REVOKED** | ❌ Blocked | `AUTHORITY_STATUS_REVOKED` | "Legal package authority has been revoked. Re-consent may be required." | None — unaffected |
| **Status = APPROVED_FOR_RUNTIME + env match** | ✅ Allowed (after L5+ implements write path) | `null` | No blocking message | None — unaffected |
| **Status = APPROVED_FOR_RUNTIME + env mismatch** | ❌ Blocked | `AUTHORITY_ENV_MISMATCH` | "Env-configured consent policy coordinates do not match the committed authority record. Deployment configuration must be corrected." | None — unaffected |

**Key design principle:** The loader **fails closed**. Any failure mode — including absent file — blocks the `LEGAL_APPROVED` transition. It never fails open. The existing `LEGAL_PENDING` intake path remains independent of the authority record in all cases.

---

## Section 9 — Runtime Env Comparison Design

### 9a. What the loader does NOT do

The loader module (`legalPackageAuthority.ts`) does **not** read environment variables. Reading env variables is a separate step performed by a separate function, modeled after the existing `getConsentPolicyExpectation()` pattern.

### 9b. Env-match function design (separate from loader)

A new function `getAuthorityEnvExpectation()` (or extended `getConsentPolicyExpectation()`) would return the three env-configured coordinates:

```
CONSENT_SCAFFOLD_EXPECTED_VERSION  →  expected packageVersion
CONSENT_SCAFFOLD_EXPECTED_HASH     →  expected packageHash
CONSENT_SCAFFOLD_EXPECTED_SOURCE_URL → expected sourceUrl
```

These already exist and are already used by `validateConsentForActivation()` for intake gating.

### 9c. Env-match rule

The env-match step is only required immediately before a `LEGAL_APPROVED` transition is attempted. It is **not** required for `LEGAL_PENDING` intake. This preserves the existing intake path without modification.

Match logic:
- If `APPROVED_FOR_RUNTIME` record is loaded and valid:
  - `record.packageVersion` must equal the env `CONSENT_SCAFFOLD_EXPECTED_VERSION`
  - `record.packageHash` must equal the env `CONSENT_SCAFFOLD_EXPECTED_HASH`
  - `record.sourceUrl` must equal the env `CONSENT_SCAFFOLD_EXPECTED_SOURCE_URL`
  - Any mismatch → `AUTHORITY_ENV_MISMATCH` (transition blocked)
  - All three match → transition allowed

### 9d. What changes in L4 vs existing behavior

**Nothing changes in L4.** The env-match rule is documented here as a design constraint for L5. No env variables are added, removed, or renamed. The existing env policy variables already carry the right semantics — they simply need to be compared against the authority record, not just against the incoming consent payload.

---

## Section 10 — Control-Plane Diagnostic Design

### 10a. Extension to `consent_scaffold_observability`

The existing `consent_scaffold_observability` block in `GET /api/control/tenants/:id` should be extended in L5 to include authority record diagnostics. No secrets must appear in the diagnostic output.

**Proposed additional fields:**

```typescript
authority_record: {
  present: boolean,                      // true if file was found at expected path
  status: string | null,                 // authority status enum value or null if absent/parse error
  package_version: string | null,        // record.packageVersion or null
  source_url: string | null,             // record.sourceUrl or null (not a secret)
  env_match: boolean | null,             // true/false if APPROVED_FOR_RUNTIME; null otherwise
  legal_approved_transition_allowed: boolean,  // computed gate result
  blocking_reason_code: string | null,   // one of the Section 7c codes or null if allowed
}
```

### 10b. Fields that must NOT appear in diagnostics

| Field | Reason excluded |
|---|---|
| `packageHash` | Not useful for admin diagnosis; omitting avoids any hash-as-oracle risk |
| Full env variable values | Never logged or exposed per secrets governance |
| `approvalEvidence` raw text | Contains internal governance references; not suitable for API surface |
| `legalCounselReference` | Internal reference; not for API exposure |

### 10c. `has_legal_approved_record` preservation

The existing `has_legal_approved_record` field is derived from DB records (always `false` in production). It must **not** be replaced or overridden by the authority-record diagnostic. It is a DB-truth field; the new `authority_record.legal_approved_transition_allowed` is a governance-gate field. They serve different purposes and should coexist.

---

## Section 11 — Future Implementation File Candidates

The following files are the minimal surface required to implement this design. None are created or modified in this unit.

### 11a. New module (to create in L5)

```
server/src/lib/legalPackageAuthority.ts
```

Responsibilities:
- Define `AuthorityRecordStatus` enum (`DRAFT`, `APPROVED_FOR_RUNTIME`, `SUPERSEDED`, `REVOKED`)
- Define `AuthorityRecord` type (20 fields from Section 7a)
- Define `AuthorityLoadResult` discriminated union (`ok: true, record: AuthorityRecord` | `ok: false, code: string, message: string`)
- Export `loadLegalPackageAuthority(): AuthorityLoadResult` — reads from fixed path, validates, returns typed result
- Export `checkAuthorityEnvMatch(record: AuthorityRecord): { match: boolean; code: string | null }` — env comparison step

**No class, no DI, no singleton state.** Pure function — called on demand.

**Path resolution rule:** Use `path.resolve(process.cwd(), 'governance/legal/fam-07/supplier-onboarding-terms-authority.json')`. This is safe in both server runtime and test environments where `cwd()` is the repo root.

### 11b. New test file (to create in L5)

```
server/src/__tests__/fam-07l5-legal-package-authority.test.ts
```

(See Section 12 for full test plan.)

### 11c. Integration point in existing file (to modify in L5)

```
server/src/routes/control.ts  (GET /api/control/tenants/:id handler)
```

Change: call `loadLegalPackageAuthority()` and `checkAuthorityEnvMatch()` inside the existing handler; extend `consent_scaffold_observability` response with `authority_record` diagnostic block.

**No other files should change in L5.** The intake path in `tenant.ts` must not be touched.

---

## Section 12 — Future Test Plan

All tests use static fixtures (no real file system writes, no DB, no env secrets). Test isolation: each case uses a mocked or fixture-path authority record.

| # | Test name | Input state | Expected result |
|---|---|---|---|
| 1 | `absent file returns AUTHORITY_FILE_ABSENT` | No file at path | `ok: false, code: AUTHORITY_FILE_ABSENT` |
| 2 | `malformed JSON returns AUTHORITY_FILE_PARSE_ERROR` | File is `{bad json` | `ok: false, code: AUTHORITY_FILE_PARSE_ERROR` |
| 3 | `missing required field returns AUTHORITY_FIELD_MISSING` | Valid JSON but `packageVersion` omitted | `ok: false, code: AUTHORITY_FIELD_MISSING` |
| 4 | `invalid field type returns AUTHORITY_FIELD_INVALID` | `reconsentsRequired: "yes"` instead of boolean | `ok: false, code: AUTHORITY_FIELD_INVALID` |
| 5 | `unknown status returns AUTHORITY_FIELD_INVALID` | `status: "UNKNOWN_STATUS"` | `ok: false, code: AUTHORITY_FIELD_INVALID` |
| 6 | `DRAFT status returns AUTHORITY_STATUS_DRAFT` | Structurally valid; `status: DRAFT` | `ok: false, code: AUTHORITY_STATUS_DRAFT` |
| 7 | `SUPERSEDED status returns AUTHORITY_STATUS_SUPERSEDED` | Structurally valid; `status: SUPERSEDED` | `ok: false, code: AUTHORITY_STATUS_SUPERSEDED` |
| 8 | `REVOKED status returns AUTHORITY_STATUS_REVOKED` | Structurally valid; `status: REVOKED` | `ok: false, code: AUTHORITY_STATUS_REVOKED` |
| 9 | `APPROVED_FOR_RUNTIME valid record returns ok: true` | Fully valid; `status: APPROVED_FOR_RUNTIME` | `ok: true, record: AuthorityRecord` |
| 10 | `env match succeeds when all three fields equal` | Valid record + matching env | `match: true, code: null` |
| 11 | `env mismatch on version returns AUTHORITY_ENV_MISMATCH` | Valid record + wrong version in env | `match: false, code: AUTHORITY_ENV_MISMATCH` |
| 12 | `env mismatch on hash returns AUTHORITY_ENV_MISMATCH` | Valid record + wrong hash in env | `match: false, code: AUTHORITY_ENV_MISMATCH` |
| 13 | `env mismatch on sourceUrl returns AUTHORITY_ENV_MISMATCH` | Valid record + wrong URL in env | `match: false, code: AUTHORITY_ENV_MISMATCH` |
| 14 | `packageVersion exceeding 120 chars returns AUTHORITY_FIELD_LENGTH_EXCEEDED` | `packageVersion` = 121-char string | `ok: false, code: AUTHORITY_FIELD_LENGTH_EXCEEDED` |
| 15 | `packageHash exceeding 256 chars returns AUTHORITY_FIELD_LENGTH_EXCEEDED` | `packageHash` = 257-char string | `ok: false, code: AUTHORITY_FIELD_LENGTH_EXCEEDED` |
| 16 | `sourceUrl exceeding 1024 chars returns AUTHORITY_FIELD_LENGTH_EXCEEDED` | `sourceUrl` = 1025-char URL | `ok: false, code: AUTHORITY_FIELD_LENGTH_EXCEEDED` |
| 17 | `diagnostic output contains no hash, no secrets` | Valid APPROVED_FOR_RUNTIME record | Diagnostic output omits `packageHash` and all env values |
| 18 | `LEGAL_PENDING intake is not affected by absent authority record` | No authority record file | Existing `validateConsentForActivation` returns `ok: true` for valid LEGAL_PENDING input |

Tests 1–17 are unit tests of `legalPackageAuthority.ts`. Test 18 is a contract assertion on `tenant.ts` (source read, no DB) confirming that the intake validation function does not reference `legalPackageAuthority` at all.

---

## Section 13 — Development-Continuation Safety Statement

This L4 unit:

1. **Does not approve any legal package.** No `APPROVED_FOR_RUNTIME` authority record is created. No legal gate is advanced. The `governance/legal/fam-07/` directory remains absent.

2. **Does not create any `LEGAL_APPROVED` status.** No DB write path for `ACCEPTED_FINAL` or `LEGAL_APPROVED` is designed, implemented, or triggered in this unit or as a consequence of this design.

3. **Does not change runtime behavior.** The intake path (`validateConsentForActivation`, `recordLegalPendingConsentScaffold`) is unchanged. All env variables retain their current values and semantics. No new env variables are introduced.

4. **Fails closed for the legal-final transition.** The loader's default state is fail-closed: absent file, malformed record, and non-`APPROVED_FOR_RUNTIME` statuses all block the transition. There is no implicit allow path.

5. **Preserves existing intake for `LEGAL_PENDING`.** Supplier onboarding consent collection continues to work exactly as today. The authority record loader is invoked only on the legal-final transition gate, not during intake.

6. **Enables safe development while lawyers review.** Implementation teams can build and test `legalPackageAuthority.ts` and its diagnostic integration using fixture records, without requiring the real final legal document to exist. The loader correctly handles absent-file as its primary production state.

7. **Does not produce observable admin UI changes.** Until `control.ts` is updated in L5 to call the loader, no change is visible to any user or admin. This design only defines what that future call will look like.

---

## Section 14 — Residual Legal-Gate Gaps (All Six From L1 Remain Open)

No L1 gap has been closed by L2, L3, or L4. All six remain open:

| Gap Label | Status |
|---|---|
| `MISSING_FINAL_LEGAL_PACKAGE_AUTHORITY` | **OPEN** — L3 blocked; lawyers have not approved final text |
| `MISSING_VERSION_HASH_SOURCE_ACTOR_PROOF` | **OPEN** — No version, hash, or source URL available yet |
| `MISSING_APPROVAL_STATE_TRANSITION_DESIGN` | **OPEN** — L4 designs the technical foundation; full transition not yet implemented |
| `MISSING_RECONSENT_POLICY` | **OPEN** — L2 documented re-consent triggers; runtime enforcement not yet implemented |
| `MISSING_RUNTIME_VERIFICATION` | **OPEN** — L5 will implement the loader; L6 will implement the transition write path |
| `MISSING_TEST_COVERAGE` | **OPEN** — L4 specifies the test plan; tests not yet written |

---

## Section 15 — Recommended Next Unit

**Recommended:** `FAM-07L5-CONTROL-PLANE-LEGAL-AUTHORITY-LOADER-IMPLEMENTATION-001`

**Scope:** Implement `server/src/lib/legalPackageAuthority.ts` exactly as specified in Sections 6–9. Implement `server/src/__tests__/fam-07l5-legal-package-authority.test.ts` as specified in Section 12. Extend `consent_scaffold_observability` in `server/src/routes/control.ts` with the `authority_record` diagnostic block as specified in Section 10.

**Pre-requisite:** The file `governance/legal/fam-07/supplier-onboarding-terms-authority.json` need NOT exist for L5 to proceed. The loader is designed to handle its absence safely. L5 tests use fixtures only.

**Do not attempt:** `ACCEPTED_FINAL` write path, `LEGAL_APPROVED` DB transitions, or env variable changes. Those belong to L6.

---

## Section 16 — Legal-Gate Preservation Statement

The following governance records are **unchanged** by this unit:

| Record | Current status | Change in this unit |
|---|---|---|
| **FAM-07** | `PARTIALLY_IMPLEMENTED / TEST_CONFIRMED` | None |
| **FTR-LEGAL-003** | `OPEN / MVP_CRITICAL` | None |
| **HD-001** | `RUNTIME_CONFIRMED_CONFIGURED` | None |
| `governance/legal/fam-07/` | Does not exist | None — not created |

The L4 artifact is committed to `artifacts/control-plane/` (git-ignored). It has no effect on any governance tracker, legal authority, or runtime system.

---

## Section 17 — Source / Backend / Schema / Runtime / Governance Action Statement

| Surface | Change in this unit |
|---|---|
| Source code (`server/src/`) | **NO** |
| Test files (`server/src/__tests__/`) | **NO** |
| Schema (`server/prisma/schema.prisma`) | **NO** |
| Migrations (`server/prisma/migrations/`) | **NO** |
| Env variables / `.env` | **NO** |
| Governance trackers | **NO** |
| `governance/legal/fam-07/` directory | **NO** — not created |
| Runtime behavior | **NO** |
| `LEGAL_APPROVED` synthesis | **NO** |
| FAM-07 closure | **NO** |

Only one file is created in this unit: this artifact.

---

## Section 18 — Final Enum

```
FAM_07L4_LEGAL_AUTHORITY_TECHNICAL_FOUNDATION_DESIGNED
```

The technical foundation for loading and validating a future FAM-07 legal package authority record has been designed. Implementation is ready to proceed in L5 without requiring the final lawyer-approved legal document to exist.
