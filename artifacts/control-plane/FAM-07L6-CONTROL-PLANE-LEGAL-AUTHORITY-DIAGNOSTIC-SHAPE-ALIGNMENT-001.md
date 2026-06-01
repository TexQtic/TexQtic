# FAM-07L6 — Control Plane Legal Authority Diagnostic Shape Alignment

**Unit:** FAM-07L6  
**Scope:** `server/src/routes/control.ts` + integration test alignment  
**Branch:** main  
**Parent commit (L5):** `9cb27c64`  
**Governance mode:** TECS Safe-Write Always On  
**Status:** CLOSED  
**Final enum:** `FAM_07L6_AUTHORITY_DIAGNOSTIC_SHAPE_ALIGNED_TEST_CONFIRMED`

---

## 1. Objective

Correct the L5 structural deviation by moving `authority_record` from its temporary
sibling position (top-level peer of `consent_scaffold_observability`) to its canonical
nested position **inside** `consent_scaffold_observability`. Update the strict integration
test assertions that previously prevented this nesting in L5.

---

## 2. L5 Deviation — Context

FAM-07L5 placed `authority_record` as a sibling of `consent_scaffold_observability` to
avoid breaking `control-onboarding-outcome.integration.test.ts`, which was **not** in
the L5 allowlist. The deviation was explicitly documented with a `// Future: move…`
comment and a forward reference to L6.

L6 includes `control-onboarding-outcome.integration.test.ts` in the allowlist and
resolves the deviation.

---

## 3. Files Changed

| File | Change |
|---|---|
| `server/src/routes/control.ts` | Moved `authority_record` inside `consent_scaffold_observability`; removed sibling deviation comment |
| `server/src/__tests__/control-onboarding-outcome.integration.test.ts` | Updated both `consent_scaffold_observability` assertions to include nested `authority_record` |

---

## 4. Files Read-Only (Not Modified)

| File | Reason |
|---|---|
| `server/src/lib/legalPackageAuthority.ts` | Fully implemented in L5; no changes needed |
| `server/src/__tests__/fam-07l5-legal-package-authority.test.ts` | 18/18 passing in L5; unaffected by L6 changes |
| `server/prisma/schema.prisma` | Not in scope |
| `.env` / connection strings | Never read or modified |

---

## 5. Canonical Nested Shape

After L6, the shape emitted by the `GET /api/control/tenants/:tenantId` route is:

```json
{
  "consent_scaffold_observability": {
    "has_records": false,
    "has_legal_approved_record": false,
    "latest_snapshot": null,
    "recent_events": [],
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
```

`authority_record` values reflect the runtime environment. In test environments (and any
environment where `governance/legal/fam-07/supplier-onboarding-terms-authority.json` is
absent), `blocking_reason_code` is `AUTHORITY_FILE_ABSENT` and `present` is `false`.

---

## 6. `toPublicControlTenantReadModel` — Type Safety Confirmation

Lines 332–340 of `control.ts` confirm that `toPublicControlTenantReadModel` is a generic
identity passthrough (`<T>(data: T): T => data`). It imposes no structural constraints.
Nesting `authority_record` inside `consent_scaffold_observability` requires no TypeScript
changes beyond the object literal itself.

---

## 7. Integration Test Changes

### Assertion 1 — `expect.objectContaining` (null / empty consent scaffold)

`consent_scaffold_observability` object previously had 4 fields:
`has_records`, `has_legal_approved_record`, `latest_snapshot`, `recent_events`.

L6 adds a 5th field: `authority_record` with `AUTHORITY_FILE_ABSENT` shape.

### Assertion 2 — `toEqual` (populated consent snapshot + event)

`consent_scaffold_observability` `toEqual` block previously had 4 fields + deep
`latest_snapshot` + `recent_events`.

L6 adds `authority_record` with `AUTHORITY_FILE_ABSENT` shape at the same level as
`has_records`.

Both produce `AUTHORITY_FILE_ABSENT` because the authority file path does not exist in
the test environment.

---

## 8. Validation Results

### TypeScript

```
npx tsc --noEmit  →  (no output — clean)
```

### Unit + Integration Tests

| Test file | Tests | Result |
|---|---|---|
| `fam-07l5-legal-package-authority.test.ts` | 18 | ✅ PASS |
| `control-onboarding-outcome.integration.test.ts` | 11 | ✅ PASS |
| **Total** | **29** | **✅ 29/29** |

---

## 9. Governance Constraints Observed

- `governance/legal/fam-07/` — NOT created (authority file remains absent by design)
- Authority record JSON — NOT created
- `LEGAL_APPROVED`, `ACCEPTED_FINAL`, `ADMIN_REVIEW` statuses — NOT emitted
- `server/src/lib/legalPackageAuthority.ts` — NOT modified
- `server/prisma/schema.prisma` / migrations — NOT touched
- FAM-07, FTR-LEGAL-003, HD-001 family/tracker statuses — UNCHANGED
- No secrets read, logged, or printed
- `artifacts/` is git-ignored; `git add -f` required

---

## 10. Risks / Follow-up

1. **Authority file creation (FAM-07L7):** `governance/legal/fam-07/supplier-onboarding-terms-authority.json`
   does not exist. Runtime diagnostic will always return `AUTHORITY_FILE_ABSENT` until L7
   creates the authority record file. Recommended next unit: `FAM-07L7-CONTROL-PLANE-LEGAL-AUTHORITY-DIAGNOSTIC-RUNTIME-VERIFY-001`.

2. **`present: true` path coverage:** Integration tests cover the `AUTHORITY_FILE_ABSENT`
   path only. A test covering a valid authority file (env-matched, `present: true`,
   `blocking_reason_code: null`) is a follow-up concern for L7 or a dedicated test extension.

3. **OpenAPI contract:** `consent_scaffold_observability` shape in OpenAPI contracts has not
   been updated to reflect the new `authority_record` field. This is an adjacent governance
   concern for a follow-up prompt.

---

## 11. Commit

```
[TEXQTIC] control-plane: nest authority_record inside consent_scaffold_observability (FAM-07L6)
```

Staged files:
- `server/src/routes/control.ts`
- `server/src/__tests__/control-onboarding-outcome.integration.test.ts`
- `artifacts/control-plane/FAM-07L6-CONTROL-PLANE-LEGAL-AUTHORITY-DIAGNOSTIC-SHAPE-ALIGNMENT-001.md` (via `git add -f`)

---

## 12. Final Enum

`FAM_07L6_AUTHORITY_DIAGNOSTIC_SHAPE_ALIGNED_TEST_CONFIRMED`
