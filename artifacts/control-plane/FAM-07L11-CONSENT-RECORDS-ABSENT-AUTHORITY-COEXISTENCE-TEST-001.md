# FAM-07L11 — CONSENT-RECORDS-ABSENT-AUTHORITY-COEXISTENCE-TEST-001

**Unit ID:** FAM-07L11-CONSENT-RECORDS-ABSENT-AUTHORITY-COEXISTENCE-TEST-001
**Unit Type:** Bounded Test Coverage
**Status:** VERIFIED_COMPLETE
**Closed:** 2026-06-01
**Branch:** main
**Depends on:** FAM-07L10-LEGAL-AUTHORITY-LANE-GOVERNANCE-TRACKER-SYNC-001 (afc7f791)
**Next Recommended Unit:** FAM-07L12-LEGAL-AUTHORITY-INPUT-CHECKLIST-ARTIFACT-001

---

## 1. Unit Summary

This unit adds bounded, DB-free test coverage for the diagonal coexistence scenario:

- `consent_scaffold_observability.has_records === true` (consent records exist)
- `consent_scaffold_observability.authority_record.present === false` (authority file still absent)

This is the "diagonal" case not covered by L7. L7 tested absent-authority with no consent records (`has_records=false`). L11 closes the gap by proving the two concerns are independent: record presence does not bypass the authority gate, and authority absence does not suppress consent record visibility.

---

## 2. Preflight Evidence

```
git status --short       → (clean — no output)
git rev-parse --short HEAD → afc7f791
ancestry check           → 0 (afc7f791 is ancestor of HEAD)
artifacts/control-plane/FAM-07L10-*.md → True
artifacts/control-plane/FAM-07L9-*.md  → True
governance/legal/fam-07  → False  (directory absent — legal gate intact)
governance/legal/fam-07/supplier-onboarding-terms-authority.json → False (authority file absent)
```

Legal gate confirmed absent. Proceeding to test implementation.

---

## 3. Test Location Decision

**Primary candidates:**
1. `server/src/__tests__/control-onboarding-outcome.integration.test.ts` — route-level tests, full `FAKE_TX` mock infrastructure including `legalConsentSnapshot` and `legalConsentEvent`, already contains `describe('control tenant read routes', ...)` with consent scaffold observability tests.
2. `server/src/__tests__/fam-07l5-legal-package-authority.test.ts` — pure unit tests for `legalPackageAuthority.ts` functions only; no context about consent records.

**Decision: `control-onboarding-outcome.integration.test.ts`**

Rationale:
- The coexistence scenario requires both consent record presence AND authority diagnostic — two concerns that are composed at the route level (`GET /api/control/tenants/:id`).
- The `fam-07l5` file tests isolated pure functions and has no awareness of consent records; it cannot assert the coexistence of the two domains.
- The integration test already has `legalConsentSnapshot.findMany` and `legalConsentEvent.findMany` mocks in `FAKE_TX`, a live Fastify instance via `buildServer()`, and an existing test that exercises the same shape (`returns consent scaffold observability from org-scoped snapshot and event reads`).
- The new test reuses the existing `beforeEach`/`afterEach` lifecycle in `describe('control tenant read routes', ...)` without any new infrastructure.

---

## 4. Coexistence Scenario Covered

| Assertion | Value | Why |
|---|---|---|
| `has_records` | `true` | `legalConsentSnapshot.findMany` returns one LEGAL_PENDING snapshot |
| `has_legal_approved_record` | `false` | No snapshot with a legal-approved status |
| `latest_snapshot` | non-null | Latest of the returned snapshots |
| `latest_snapshot.id` | `coexistence-snapshot-1` | Exact fixture ID verified |
| `authority_record.present` | `false` | No authority file at `governance/legal/fam-07/supplier-onboarding-terms-authority.json` |
| `authority_record.legal_approved_transition_allowed` | `false` | Authority absent → transition blocked |
| `authority_record.blocking_reason_code` | `AUTHORITY_FILE_ABSENT` | Exact diagnostic code confirmed |
| `tenant.authority_record` | absent (property not present) | `authority_record` is nested under `consent_scaffold_observability`, not a top-level sibling |

---

## 5. Files Changed

| File | Change Type | Description |
|---|---|---|
| `server/src/__tests__/control-onboarding-outcome.integration.test.ts` | Modified (test added) | New `it()` block added inside `describe('control tenant read routes', ...)` |
| `artifacts/control-plane/FAM-07L11-*.md` | Created | This artifact |

No runtime source files, routes, schemas, migrations, OpenAPI contracts, or governance tracker files were modified.

---

## 6. Test Implementation Summary

Added one new `it()` block at the end of `describe('control tenant read routes', ...)`:

```typescript
it('FAM-07L11: coexistence — consent records present AND authority absent simultaneously', async () => {
  // FAKE_TX.organizations.findMany called twice (auth check + data query)
  // FAKE_TX.legalConsentSnapshot.findMany → returns one LEGAL_PENDING snapshot
  // FAKE_TX.legalConsentEvent.findMany → returns empty (events not required for this assertion)

  // Asserts:
  // - statusCode 200
  // - observability.has_records === true
  // - observability.has_legal_approved_record === false
  // - observability.latest_snapshot.id === 'coexistence-snapshot-1'
  // - observability.authority_record.present === false
  // - observability.authority_record.legal_approved_transition_allowed === false
  // - observability.authority_record.blocking_reason_code === 'AUTHORITY_FILE_ABSENT'
  // - response.json().data.tenant does NOT have a top-level 'authority_record' property
});
```

The test uses no new imports, no new helper functions, and no changes to any mocking infrastructure. It is fully DB-free (all Prisma calls mocked via `FAKE_TX`). The authority file absence is structural — the test does not create, read, or delete any governance file.

---

## 7. Validation Commands and Results

### Test run

```
cd C:\Users\PARESH\TexQtic\server
pnpm vitest run --reporter=verbose "src/__tests__/control-onboarding-outcome.integration.test.ts"
```

**Result:**
```
 ✓ control onboarding outcome route > records a status transition ... 149ms
 ✓ control onboarding outcome route > rejects a duplicate ... 10ms
 ✓ control onboarding outcome route > archives a tenant ... 14ms
 ✓ control onboarding outcome route > activates an approved onboarding tenant ... 8ms
 ✓ control onboarding outcome route > denies non-SUPER_ADMIN onboarding outcome ... 7ms
 ✓ control onboarding outcome route > denies non-SUPER_ADMIN approved activation ... 6ms
 ✓ control onboarding outcome route > denies non-SUPER_ADMIN archive ... 7ms
 ✓ control onboarding outcome route > blocks archive attempts for protected ... 4ms
 ✓ control tenant read routes > includes tenant_category on control tenant list ... 12ms
 ✓ control tenant read routes > includes tenant_category on control tenant detail ... 6ms
 ✓ control tenant read routes > returns consent scaffold observability from org-scoped ... 8ms
 ✓ control tenant read routes > FAM-07L11: coexistence — consent records present AND authority absent simultaneously 4ms

 Test Files  1 passed (1)
      Tests  12 passed (12)
   Duration  1.74s
```

All 12 tests pass. New coexistence test: ✅ PASS.

### TypeScript check

```
cd C:\Users\PARESH\TexQtic\server
pnpm tsc --noEmit
```

**Result:** No output (zero errors). ✅ PASS.

---

## 8. Diff Scope Confirmation

```
git diff --name-only
```

Expected: `server/src/__tests__/control-onboarding-outcome.integration.test.ts`

Only one runtime-tracked file modified. Artifact is in `artifacts/` (git-ignored; requires `git add -f`).

No changes to:
- `server/src/lib/legalPackageAuthority.ts` ✅
- `server/src/routes/control.ts` ✅
- `shared/contracts/openapi.control-plane.json` ✅
- `server/prisma/schema.prisma` ✅
- `governance/control/NEXT-ACTION.md` ✅
- `governance/control/OPEN-SET.md` ✅
- `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` ✅
- `governance/legal/fam-07/` ✅ (does not exist — legal gate intact)

---

## 9. Legal Authority State Confirmation

These invariants are unchanged and confirmed:

| Invariant | State |
|---|---|
| `governance/legal/fam-07/` | Does NOT exist |
| `governance/legal/fam-07/supplier-onboarding-terms-authority.json` | Does NOT exist |
| Runtime diagnostic: `present` | `false` |
| Runtime diagnostic: `blocking_reason_code` | `AUTHORITY_FILE_ABSENT` |
| Runtime diagnostic: `legal_approved_transition_allowed` | `false` |

---

## 10. Status Preservation Statement

The following statuses are preserved and unchanged:

- **FAM-07:** NOT VERIFIED_COMPLETE
- **FTR-LEGAL-003:** MVP_CRITICAL / OPEN
- **HD-001:** RUNTIME_CONFIRMED_CONFIGURED
- No LEGAL_APPROVED, ACCEPTED_FINAL, or ADMIN_REVIEW references introduced
- No authority file created or simulated as present

---

## 11. Next Recommended Unit

**FAM-07L12-LEGAL-AUTHORITY-INPUT-CHECKLIST-ARTIFACT-001**

Legal inputs required before authority file creation can proceed remain pending (external legal counsel, founder sign-off, agreed package version/hash, sourceUrl). L12 should produce a planning artifact defining the exact inputs required and the responsible party for each, so the legal gate can be cleared in a future unit when those inputs are available.

---

## 12. Risks / Follow-up

- None arising from this unit. Test is purely additive, DB-free, and does not modify any runtime behavior.
- The coexistence scenario is now explicitly covered at the route level. If the route logic for `consent_scaffold_observability` composition is changed in future units, the new test at L11 will catch any regression in the coexistence assertion.

---

## 13. Final Enum

```
FAM_07L11_CONSENT_RECORDS_ABSENT_AUTHORITY_TEST_COMPLETE
```
