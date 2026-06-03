# FAM-09-SUPPLIER-PROFILE-CATALOG-LAUNCH-TEST-SUPPLIER-SEED-001

**Unit:** FAM-09 — Supplier Profile Catalog  
**Sub-unit:** Launch-Test Supplier Seed  
**Status:** CLOSED — `FAM_09_LAUNCH_TEST_SUPPLIER_SEED_READY`  
**Date:** 2026-06-10  
**Classification:** LAUNCH-TEST DATA ONLY — NOT a real supplier

---

## 1. Objective

Seed a deterministic launch-test B2B supplier (`lt-b2b-001`) in the production database so that:

- `GET /api/public/b2b/suppliers` returns `total >= 1` including `slug=lt-b2b-001`
- `GET /api/public/supplier/lt-b2b-001` returns HTTP 200 with a public-safe profile
- All five projection gates are satisfied for the seeded supplier

---

## 2. Script

**File:** `server/scripts/seed-launch-test-b2b-supplier.ts`  
**Execution:** `cd server && pnpm exec tsx scripts/seed-launch-test-b2b-supplier.ts`  
**Idempotent:** Yes — safe to re-run; updates posture and catalog on second+ runs

---

## 3. Five-Gate Verification (DB)

| Gate | Field | Required Value | Result |
|------|-------|----------------|--------|
| A | `tenants.publicEligibilityPosture` | `PUBLICATION_ELIGIBLE` | ✅ PASS |
| B | `organizations.publication_posture` | `B2B_PUBLIC` | ✅ PASS |
| C | `organizations.org_type` | `B2B` | ✅ PASS |
| D | `organizations.status` | `ACTIVE` | ✅ PASS |
| E | `organizations.is_qa_sentinel` | `false` | ✅ PASS |

Catalog items public-eligible: **3**  
SKUs: `LT-B2B-001-FAB-001`, `LT-B2B-001-FAB-002`, `LT-B2B-001-FAB-003`

---

## 4. Endpoint Verification

### `GET /api/public/b2b/suppliers`

```
HTTP 200
{
  "success": true,
  "data": {
    "total": 1,
    "items": [{ "slug": "lt-b2b-001", ... }],
    ...
  }
}
```

**Result:** ✅ PASS — `total=1`, `slug=lt-b2b-001` present

### `GET /api/public/supplier/lt-b2b-001`

```
HTTP 200
{
  "success": true,
  "data": {
    "slug": "lt-b2b-001",
    "legalName": "Launch Test Supplier 001 Pvt Ltd",
    "orgType": "B2B",
    "jurisdiction": "IN",
    "publicationPosture": "B2B_PUBLIC",
    "eligibilityPosture": "PUBLICATION_ELIGIBLE",
    "offeringPreview": [3 items],
    ...
  }
}
```

**Result:** ✅ PASS — 200 OK, public-safe profile returned

---

## 5. Implementation Notes

### DB Trigger Interaction

Migration `20260224000000_g015_phase_a_introduce_organizations` defines trigger  
`trg_sync_tenants_to_org` (AFTER INSERT OR UPDATE on `tenants`).

The trigger automatically creates an `organizations` row on tenant INSERT  
(fields: `id, slug, legal_name=tenants.name, org_type, status, plan`).

The seed script therefore:
1. Creates the tenant (trigger auto-creates org row)
2. Updates the org to set B2B-specific fields not covered by the trigger:  
   `legal_name`, `publication_posture`, `jurisdiction`, `primary_segment_key`

Attempting `organizations.create()` after `tenant.create()` within the same  
transaction raises Prisma P2002 (unique constraint) because the trigger already  
created the org row. Fixed by using `organizations.update()` instead.

### Idempotency

- Second run detects existing `slug=lt-b2b-001` tenant and enters the update path
- `legal_name` on the second run reflects `tenants.name` (trigger UPDATE path  
  re-syncs `legal_name = tenants.name`); this does not affect any gate predicate
- All five gates continue to pass on repeated runs

---

## 6. Invariants Upheld

- No real supplier data (`shraddha-industries`) was touched
- No QA sentinel (`qa-*`) was modified
- `server/prisma/schema.prisma` was not modified
- `server/prisma/seed.ts` was not modified
- `server/scripts/assign-b2b-public-posture.ts` was not modified or executed
- No secrets, env values, UUIDs, or tokens were logged

---

## 7. Final Enum

`FAM_09_LAUNCH_TEST_SUPPLIER_SEED_READY`
