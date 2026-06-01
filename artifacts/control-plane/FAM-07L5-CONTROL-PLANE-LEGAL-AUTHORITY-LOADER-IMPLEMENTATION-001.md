# FAM-07L5 — Control-Plane Legal Authority Loader Implementation

## Artifact Metadata

| Field | Value |
|---|---|
| Unit ID | FAM-07L5-CONTROL-PLANE-LEGAL-AUTHORITY-LOADER-IMPLEMENTATION-001 |
| Parent family | FAM-07 |
| Layer | L5 |
| Sequence | Follows FAM-07L4 (`6172bfc3`) |
| Artifact type | Implementation record |
| Created | 2026-06-03 |
| Author | GitHub Copilot — TexQtic Safe-Write agent |
| Governance mode | TECS Safe-Write Always On |

---

## 1. Unit Summary

This unit implemented the legal package authority loader and validator (`legalPackageAuthority.ts`), its 18-case unit test suite, and a control-plane diagnostic extension to expose authority record observability on the `GET /api/control/tenants/:id` endpoint. The loader resolves the committed governance authority record from disk (`process.cwd()`), validates all 20 fields, enforces DB-aligned length limits, and emits typed failure codes for all 9 diagnostic states.

No authority record exists yet. The `governance/legal/fam-07/` directory does not exist. The loader returns `AUTHORITY_FILE_ABSENT` at runtime until L3 blocking inputs are resolved.

---

## 2. Lineage

| Ancestor | Status at L5 entry |
|---|---|
| FAM-07L4 | `FAM_07L4_LEGAL_AUTHORITY_TECHNICAL_FOUNDATION_DESIGNED` — committed `6172bfc3` |
| FAM-07L3 | `FAM_07L3_BLOCKED_MISSING_FINAL_PACKAGE_INPUTS` — committed `be0e23d1` |
| FAM-07L2 | Committed per session history |
| FAM-07L1 | Committed per session history |

---

## 3. Files Created / Modified

| File | Action | Governance class |
|---|---|---|
| `server/src/lib/legalPackageAuthority.ts` | Created | New loader module |
| `server/src/__tests__/fam-07l5-legal-package-authority.test.ts` | Created | New unit test suite |
| `server/src/routes/control.ts` | Modified | Diagnostic extension |
| `artifacts/control-plane/FAM-07L5-CONTROL-PLANE-LEGAL-AUTHORITY-LOADER-IMPLEMENTATION-001.md` | Created | This artifact |

### Files explicitly NOT modified (governance boundary)

- `server/src/routes/tenant.ts` — LEGAL_PENDING intake is independent; not touched
- `server/prisma/schema.prisma` — no schema changes
- `server/prisma/migrations/` — no migration created
- `server/src/__tests__/control-onboarding-outcome.integration.test.ts` — not in allowlist
- `.env` / `.env.local` — never read, never modified

---

## 4. Loader Module Design (`legalPackageAuthority.ts`)

### Constants

```typescript
AUTHORITY_RECORD_RELATIVE_PATH = 'governance/legal/fam-07/supplier-onboarding-terms-authority.json'
AUTHORITY_RECORD_ABSOLUTE_PATH = path.resolve(process.cwd(), AUTHORITY_RECORD_RELATIVE_PATH)
```

### Exported Types

| Type | Purpose |
|---|---|
| `LegalPackageAuthorityRecord` | Typed authority record (20 fields) |
| `AuthorityRecordStatus` | `DRAFT \| APPROVED_FOR_RUNTIME \| SUPERSEDED \| REVOKED` |
| `AuthorityDiagnosticCode` | Union of 9 failure codes |
| `AuthorityLoadResult` | Discriminated union: `{ok: true, record}` or `{ok: false, code, message}` |
| `AuthorityEnvMatchResult` | `{match: boolean, code: AuthorityDiagnosticCode \| null}` |
| `AuthorityDiagnostic` | 7-field safe diagnostic block for API output |
| `LoadOptions` | `{filePath?: string}` for test path override |

### Exported Functions

| Function | Behaviour |
|---|---|
| `loadLegalPackageAuthority(options?)` | Reads file, parses JSON, delegates to validator. Never throws. |
| `validateLegalPackageAuthorityRecord(value)` | Full 20-field validation + status gate. Never throws. |
| `checkAuthorityEnvMatch(record, env?)` | Compares 3 identity fields to env config. Never returns raw env values. |
| `buildAuthorityDiagnostic(loadResult, envMatchResult?)` | Produces admin-safe diagnostic object. Omits `packageHash`. |

### Fail-Closed Behaviour Matrix (9 states)

| Code | Trigger | `ok` | `present` |
|---|---|---|---|
| `AUTHORITY_FILE_ABSENT` | File not found | false | false |
| `AUTHORITY_FILE_PARSE_ERROR` | Invalid JSON | false | true |
| `AUTHORITY_FIELD_MISSING` | Required field absent or null | false | true |
| `AUTHORITY_FIELD_INVALID` | Type, enum, or constraint violation | false | true |
| `AUTHORITY_FIELD_LENGTH_EXCEEDED` | DB length limit breached | false | true |
| `AUTHORITY_STATUS_DRAFT` | `status === 'DRAFT'` | false | true |
| `AUTHORITY_STATUS_SUPERSEDED` | `status === 'SUPERSEDED'` | false | true |
| `AUTHORITY_STATUS_REVOKED` | `status === 'REVOKED'` | false | true |
| `AUTHORITY_ENV_MISMATCH` | Env identity mismatch | n/a | n/a |

### Field Validation Rules

| Field | Rule |
|---|---|
| `agreementType` | Must equal `'SUPPLIER_ONBOARDING_TERMS'` |
| `hashAlgorithm` | Must equal `'sha256'` |
| `formatVersion` | Must equal `'1'` |
| `status` | Must be one of the 4 known `AuthorityRecordStatus` values |
| `packageVersion` | Max 120 chars (matches `agreementVersion VarChar(120)`) |
| `packageHash` | Max 256 chars (matches `agreementHash VarChar(256)`) |
| `sourceUrl` | Max 1024 chars (matches `agreementSourceUrl VarChar(1024)`) |
| `reconsentsRequired` | Must be boolean |
| `reconsentsReason` | Required non-empty if `reconsentsRequired === true` |
| `revokedAt`, `revokedReason` | `revokedReason` required non-empty if `revokedAt` is set |
| All 15 string fields | Must be present, non-null, non-empty string |
| `supersededBy`, `revokedAt`, `revokedReason`, `reconsentsReason` | Must be present in record (even if null) |

---

## 5. Env-Match Coordinate Mapping

| Authority record field | Env variable |
|---|---|
| `packageVersion` | `CONSENT_SCAFFOLD_EXPECTED_VERSION` |
| `packageHash` | `CONSENT_SCAFFOLD_EXPECTED_HASH` |
| `sourceUrl` | `CONSENT_SCAFFOLD_EXPECTED_SOURCE_URL` |

All three must be present and equal for `match: true`. Missing or mismatched variables return `AUTHORITY_ENV_MISMATCH`.

---

## 6. Diagnostic Block Shape

```typescript
interface AuthorityDiagnostic {
  present: boolean;              // false = file absent; true = file found (even if invalid)
  status: string | null;         // authority record status, or null if load failed
  package_version: string | null;
  source_url: string | null;
  env_match: boolean | null;     // null if load failed
  legal_approved_transition_allowed: boolean; // true only when APPROVED_FOR_RUNTIME + env match
  blocking_reason_code: string | null;
}
```

**Deliberately omitted:** `packageHash` (avoids oracle risk). Raw env values are never included.

---

## 7. Control-Plane Diagnostic Extension

### Handler modified

`GET /api/control/tenants/:id` (in `server/src/routes/control.ts`)

### Structural decision: `authority_record` as sibling

The L4 specification described `authority_record` as a property nested inside `consent_scaffold_observability`. However, `control-onboarding-outcome.integration.test.ts` (not in the L5 allowlist) contains two assertions that test the exact shape of `consent_scaffold_observability`:

1. `expect(response.json().data.tenant).toEqual(expect.objectContaining({ consent_scaffold_observability: {<exact-4-field-object>} }))` — uses strict object equality on the inner value
2. `expect(response.json().data.tenant.consent_scaffold_observability).toEqual({<exact-4-field-object>})` — strict equality

Nesting `authority_record` inside `consent_scaffold_observability` would fail both assertions. Since the test file was not in the allowlist, `authority_record` was placed as a **top-level sibling** to `consent_scaffold_observability` on the tenant response object.

The `expect.objectContaining` at the tenant level tolerates extra properties, so both assertions continue to pass without modification.

**Recommended follow-up (FAM-07L6 pre-work):** Add `control-onboarding-outcome.integration.test.ts` to the allowlist and migrate `authority_record` inside `consent_scaffold_observability` for the canonical nested structure.

### Response shape (post-L5)

```json
{
  "data": {
    "tenant": {
      "...existing fields": "...",
      "consent_scaffold_observability": {
        "has_records": false,
        "has_legal_approved_record": false,
        "latest_snapshot": null,
        "recent_events": []
      },
      "authority_record": {
        "present": false,
        "status": null,
        "package_version": null,
        "source_url": null,
        "env_match": null,
        "legal_approved_transition_allowed": false,
        "blocking_reason_code": "AUTHORITY_FILE_ABSENT"
      }
    }
  }
}
```

---

## 8. Unit Test Coverage (18 cases)

| # | Description | Assertion target |
|---|---|---|
| 1 | Absent file | `AUTHORITY_FILE_ABSENT` |
| 2 | Malformed JSON | `AUTHORITY_FILE_PARSE_ERROR` |
| 3 | Missing required field (`packageVersion`) | `AUTHORITY_FIELD_MISSING` |
| 4 | Invalid field type (`reconsentsRequired: 'yes'`) | `AUTHORITY_FIELD_INVALID` |
| 5 | Unknown status string | `AUTHORITY_FIELD_INVALID` |
| 6 | `DRAFT` status | `AUTHORITY_STATUS_DRAFT` |
| 7 | `SUPERSEDED` status | `AUTHORITY_STATUS_SUPERSEDED` |
| 8 | `REVOKED` status | `AUTHORITY_STATUS_REVOKED` |
| 9 | Valid `APPROVED_FOR_RUNTIME` record | `ok: true`, correct field values |
| 10 | Env match — all three fields match | `match: true`, `code: null` |
| 11 | Env mismatch — version wrong | `AUTHORITY_ENV_MISMATCH` |
| 12 | Env mismatch — hash wrong | `AUTHORITY_ENV_MISMATCH` |
| 13 | Env mismatch — source URL wrong | `AUTHORITY_ENV_MISMATCH` |
| 14 | `packageVersion` 121 chars | `AUTHORITY_FIELD_LENGTH_EXCEEDED` |
| 15 | `packageHash` 257 chars | `AUTHORITY_FIELD_LENGTH_EXCEEDED` |
| 16 | `sourceUrl` 1025 chars | `AUTHORITY_FIELD_LENGTH_EXCEEDED` |
| 17 | Diagnostic shape — no `packageHash`, no env values | Structural assertion |
| 18 | Module source does not import Prisma or tenant route | Source-read contract assertion |

### Test run result

```
PASS  server/src/__tests__/fam-07l5-legal-package-authority.test.ts
Tests:  18 passed, 18 failed 0
```

---

## 9. TypeScript Check

```
pnpm -C server exec tsc --noEmit
# (no output — 0 errors)
```

---

## 10. Governance Status Invariants (unchanged by L5)

| Item | Status | Note |
|---|---|---|
| FAM-07 | `PARTIALLY_IMPLEMENTED / TEST_CONFIRMED` | Loader implemented; authority record absent |
| FTR-LEGAL-003 | `OPEN / MVP_CRITICAL` | Blocking inputs (package hash, notarized PDF) still unresolved |
| HD-001 | `RUNTIME_CONFIRMED_CONFIGURED` | Env configuration confirmed active |
| `LEGAL_APPROVED` status | **NOT created** | Authority record does not exist |
| `governance/legal/fam-07/` | **Does not exist** | No authority record committed yet |

---

## 11. L1 Gaps (all remain open)

L5 does not close any L1 gaps. The 6 open gaps identified in L4 remain open:

1. Final PDF legal document not created
2. SHA-256 hash of final document not computed
3. `sourceUrl` (canonical hosting location) not established
4. `governance/legal/fam-07/` directory not created
5. `supplier-onboarding-terms-authority.json` not committed
6. `LEGAL_APPROVED` runtime consent record not yet a target for production

---

## 12. Invariants Confirmed Preserved

- `tenant.ts` not modified — LEGAL_PENDING intake behavior unchanged
- Prisma schema not modified — no migration created
- `control-onboarding-outcome.integration.test.ts` not modified — 0 breakage
- `org_id` tenant isolation unchanged
- RLS policies unchanged
- No secrets printed or leaked
- No env values returned in diagnostic output
- Module does not import Prisma client (confirmed by test 18)

---

## 13. Prohibited Actions Confirmed Not Taken

| Prohibition | Status |
|---|---|
| Created `governance/legal/fam-07/` | NOT done |
| Created authority record JSON | NOT done |
| Emitted `LEGAL_APPROVED` status | NOT done |
| Emitted `ACCEPTED_FINAL` event | NOT done |
| Touched `tenant.ts` | NOT done |
| Modified Prisma schema | NOT done |
| Modified integration test | NOT done |
| Used `npx prisma` | NOT done |
| Ran `prisma migrate dev` or `db push` | NOT done |
| Modified `.env` | NOT done |
| Printed secrets or env values | NOT done |

---

## 14. Commit Summary

**Commit message:** `feat(control-plane): add legal authority diagnostics`

**Files staged (exactly 4):**
```
M  server/src/routes/control.ts
A  server/src/lib/legalPackageAuthority.ts
A  server/src/__tests__/fam-07l5-legal-package-authority.test.ts
A  artifacts/control-plane/FAM-07L5-CONTROL-PLANE-LEGAL-AUTHORITY-LOADER-IMPLEMENTATION-001.md
```

---

## 15. Recommended Next Unit

**FAM-07L6-CONTROL-PLANE-LEGAL-AUTHORITY-DIAGNOSTIC-RUNTIME-VERIFY-001**

Suggested scope:
1. Add `control-onboarding-outcome.integration.test.ts` to the allowlist
2. Update the integration test to cover `authority_record` at its current sibling position
3. Optionally migrate `authority_record` inside `consent_scaffold_observability` (requires updating the integration test simultaneously)
4. Verify the control-plane endpoint returns the full diagnostic block in a staged-environment smoke test
5. Produce a runtime evidence artifact confirming `AUTHORITY_FILE_ABSENT` is the live diagnostic code until L3 is unblocked

---

## 16. Known Deviations from L4 Specification

| Deviation | Reason | Remediation path |
|---|---|---|
| `authority_record` placed as sibling of `consent_scaffold_observability` rather than nested inside it | `control-onboarding-outcome.integration.test.ts` uses strict `toEqual` on `consent_scaffold_observability` and is not in the L5 allowlist | Expand allowlist in FAM-07L6 to include the integration test; migrate nesting at that point |

---

## 17. Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| `AUTHORITY_FILE_ABSENT` returned at runtime for all tenants until L3 is unblocked | Low — diagnostic only, does not affect activation flow | Runtime operators expect ABSENT until authority record is committed |
| `authority_record` sibling location differs from final intended nesting | Low — data is present, just at a different depth | FAM-07L6 remediation |
| `legal_approved_transition_allowed: false` always at current state | Expected — by design until authority record exists | Document in runbook |

---

## 18. Final Enum

```
FAM_07L5_LEGAL_AUTHORITY_LOADER_IMPLEMENTED_TEST_CONFIRMED
```

---

*Artifact closed: FAM-07L5 implementation complete. Tests: 18/18 passed. TypeScript: 0 errors.*
