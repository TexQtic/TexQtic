# TECS-BUYER-CATALOG-B2C-POSTURE-GATE-001 — Evidence Report

**Task ID:** TECS-BUYER-CATALOG-B2C-POSTURE-GATE-001  
**Policy Decision:** `POLICY_B_BLOCK_B2C_ITEM_POSTURE_FROM_B2B`  
**Execution Date:** 2025-07-13  
**Operator:** GitHub Copilot (automated agent)  
**Mode:** READ-ONLY investigation + bounded code fix + unit tests  

---

## 1. Plan

Investigate whether `B2C_PUBLIC` item-level publication posture is correctly excluded from B2B buyer catalog surfaces (browse, PDP, RFQ). If a gap exists, apply the minimal fix, add tests, and document evidence.

**Files to change:**
- `server/src/routes/tenant.ts` — add channel eligibility gate in browse filterClauses and PDP SQL
- `server/src/routes/tenant.catalogB2cPostureGate.test.ts` — new unit tests B2C-01..B2C-10
- `docs/TECS-BUYER-CATALOG-B2C-POSTURE-GATE-001-REPORT.md` — this report

**Governance contracts applicable:**
- `ARCHITECTURE-GOVERNANCE.md` — channel separation doctrine
- `openapi.tenant.json` — browse/PDP route schemas (shapes unchanged)
- `rls-policy.md` — no RLS changes required

---

## 2. Phase 0 — Preflight

| Check | Result |
|---|---|
| `git diff --name-only` | Clean (no pending diffs at start) |
| Prior commit `6771cc6` | Confirmed: `ux(pdp): clarify self-supplier restricted item message` |
| Prior commit `d250bee` | Confirmed: PDP Gate 1 SQL posture filter removed (correct prior fix) |

---

## 3. Phase 1 — Code Discovery

### 3.1 `server/src/services/catalogVisibilityPolicyResolver.ts`

`mapPostureToPolicy()` function:

```ts
case 'B2B_PUBLIC':
case 'B2C_PUBLIC':    // ← maps B2C_PUBLIC → PUBLIC, same as B2B_PUBLIC
case 'BOTH':
  return 'PUBLIC';
case 'PRIVATE_OR_AUTH_ONLY':
  return 'AUTHENTICATED_ONLY';
```

**Finding:** The resolver is channel-agnostic and maps `B2C_PUBLIC → PUBLIC` in the fallback path. This is correct for the B2C storefront route (`GET /api/public/b2c/products`). The gap is at the B2B route layer, not in the resolver. **No resolver changes are made.**

Existing test R-03 documents this behavior and is preserved unchanged.

### 3.2 Browse route `GET /api/tenant/catalog/supplier/:supplierOrgId/items`

**Gate 1 (org-level):** `org.publication_posture === 'B2B_PUBLIC' || org.publication_posture === 'BOTH'` — correctly blocks `B2C_PUBLIC` *orgs* from B2B browse.

**Item-level (before fix):** `filterClauses` only filtered by `tenantId` and `active: true`. No `publication_posture` item-level channel filter. `B2C_PUBLIC` items at a `B2B_PUBLIC` org would resolve to `PUBLIC` via the fallback resolver and appear in browse results.

**Item-level (after fix):** `filterClauses` now includes `{ publicationPosture: { not: 'B2C_PUBLIC' } }`. B2C_PUBLIC items are excluded at the Prisma query level before any visibility evaluation.

### 3.3 PDP route `GET /api/tenant/catalog/items/:itemId`

**Gate 1 (SQL, before fix):** `WHERE id = ${itemId}::uuid AND active = true` — no `publication_posture` filter since `d250bee` fix. A `B2C_PUBLIC` item at a `B2B_PUBLIC` org would pass Gate 1 and then resolve to `PUBLIC` via the fallback resolver.

**Gate 1 (SQL, after fix):** `WHERE id = ${itemId}::uuid AND active = true AND publication_posture != 'B2C_PUBLIC'` — B2C_PUBLIC items return an empty rowset → PDP returns 404.

**Note on d250bee:** The prior fix correctly removed `AND publication_posture IN ('B2B_PUBLIC', 'BOTH')` which was also blocking `PRIVATE_OR_AUTH_ONLY` items. The new condition `!= 'B2C_PUBLIC'` only excludes the B2C channel posture. `PRIVATE_OR_AUTH_ONLY` items are NOT excluded — this preserves the d250bee fix intent.

### 3.4 RFQ path `resolveCatalogRfqDraftContext`

**SQL gate (pre-existing):** `AND publication_posture IN ('B2B_PUBLIC', 'BOTH')` — already excludes `B2C_PUBLIC` AND `PRIVATE_OR_AUTH_ONLY` from RFQ drafts. This was the existing inconsistency: RFQ was stricter than browse/PDP.

**After fix:** Browse and PDP are now consistent with RFQ on the critical `B2C_PUBLIC` exclusion. The minor remaining difference (`PRIVATE_OR_AUTH_ONLY` accessible via browse/PDP but not via RFQ) is a separate intentional design decision documented elsewhere.

---

## 4. Phase 2 — Data Check

**Finding:** `LIVE_B2C_PUBLIC_AT_B2B_ORG_RUNTIME_NOT_APPLICABLE`

| Evidence | Source |
|---|---|
| All QA B2B seed items use `B2B_PUBLIC` or `PRIVATE_OR_AUTH_ONLY` posture | `server/scripts/qa/current-db-multi-segment-qa-seed.ts` |
| B2C_PUBLIC items only exist at `qa-b2c` org (B2C_PUBLIC org posture) | `server/scripts/assign-b2c-public-posture.ts` — `QA-B2C-001/002/003` |
| `qa-b2c` org is already blocked by org-level eligibility gate (`B2B_PUBLIC \| BOTH`) | Both browse and PDP routes, Gate 1 (org-level) |
| Hygiene audit: 0 invalid `publication_posture` values, all items accounted for | `TECS-PRODUCTION-DATA-HYGIENE-ORPHAN-ROW-AUDIT-001-REPORT.md` §6.1 |
| Hygiene audit: B2B_PUBLIC items specifically noted; no B2C_PUBLIC-at-B2B-org anomaly | Same report §P3-1 |

The gap is a **code correctness issue for a zero-data edge case** — it does not affect any current production or QA item. The fix is a pre-launch hardening measure.

---

## 5. Phase 3 — Policy Decision

**Selected: `POLICY_B_BLOCK_B2C_ITEM_POSTURE_FROM_B2B`**

| Criterion | Assessment |
|---|---|
| `B2C_PUBLIC` posture intent | Consumer-channel-only item projection. `BOTH` already exists for cross-channel items. |
| RFQ path precedent | Already enforces `B2B_PUBLIC \| BOTH` via SQL — blocking `B2C_PUBLIC` is consistent. |
| Resolver channel-agnosticism | Resolver correctly maps `B2C_PUBLIC → PUBLIC` for B2C surfaces. B2B gate must be at route layer. |
| d250bee regression risk | `!= 'B2C_PUBLIC'` does NOT re-block `PRIVATE_OR_AUTH_ONLY` — preserves d250bee fix intent. |
| Zero data impact today | No production or QA items are affected. Pure code hardening. |

---

## 6. Phase 4 — Implementation

### Files Changed

| File | Change |
|---|---|
| `server/src/routes/tenant.ts` | Browse: `filterClauses` +1 clause. PDP SQL: +1 condition. |

### Browse change (line ~3292)

**Before:**
```ts
const filterClauses: Prisma.CatalogItemWhereInput[] = [
  { tenantId: supplierOrgId, active: true },
];
```

**After:**
```ts
// Channel-eligibility gate: B2C_PUBLIC items are intentionally excluded from B2B buyer
// browse surfaces. Use BOTH posture for cross-channel items. (POLICY_B — consistent with
// the RFQ path which already gates on B2B_PUBLIC | BOTH via SQL.)
const filterClauses: Prisma.CatalogItemWhereInput[] = [
  { tenantId: supplierOrgId, active: true },
  { publicationPosture: { not: 'B2C_PUBLIC' } },
];
```

### PDP change (line ~2488)

**Before:**
```sql
WHERE id = ${itemId}::uuid
  AND active = true
```

**After:**
```sql
WHERE id = ${itemId}::uuid
  AND active = true
  AND publication_posture != 'B2C_PUBLIC'
```

---

## 7. Phase 5 — Tests

New file: `server/src/routes/tenant.catalogB2cPostureGate.test.ts`

| Test | Assertion |
|---|---|
| B2C-01 | Resolver: `B2C_PUBLIC` → `PUBLIC` via fallback (R-03 behavior unchanged) |
| B2C-01b | Resolver: `B2C_PUBLIC` undefined CVPM → `PUBLIC` |
| B2C-02 | Channel gate: `B2C_PUBLIC` → `isB2bChannelEligible = false` |
| B2C-02b | Channel gate: `null`/`undefined` posture → `isB2bChannelEligible = true` (no over-filtering) |
| B2C-03 | Channel gate: `B2B_PUBLIC` → `isB2bChannelEligible = true` |
| B2C-04 | Channel gate: `BOTH` → `isB2bChannelEligible = true` |
| B2C-05 | Channel gate: `PRIVATE_OR_AUTH_ONLY` → `isB2bChannelEligible = true` (d250bee regression guard) |
| B2C-06 | PDP: `B2C_PUBLIC` item fails channel gate before resolver is reached |
| B2C-06b | PDP: `B2C_PUBLIC` + explicit `PUBLIC` CVPM still blocked (POLICY_B strict) |
| B2C-07 | PDP: `B2B_PUBLIC` passes channel gate and resolves to `PUBLIC` |
| B2C-08 | Visibility: `B2B_PUBLIC` + null CVPM + `NONE` relationship → `canAccessCatalog = true` |
| B2C-09 | Visibility: `BOTH` + null CVPM + `NONE` relationship → `canAccessCatalog = true` |
| B2C-10 | Consistency: resolver returns `PUBLIC` for `B2C_PUBLIC` (correct for B2C surfaces) but channel gate prevents B2B exposure; combined result = blocked |
| B2C-10b | Consistency: RFQ `IN ('B2B_PUBLIC', 'BOTH')` list excludes `B2C_PUBLIC` — all three B2B surfaces now consistent |

---

## 8. Phase 6 — Runtime Probes

**Status:** `LIVE_B2C_PUBLIC_AT_B2B_ORG_RUNTIME_NOT_APPLICABLE`

No live runtime probe was required. Zero `B2C_PUBLIC` items exist at any `B2B_PUBLIC` org in the DB. The channel gate is a code correctness fix with no observable data impact at this time.

Regression coverage: existing `tests/e2e/supplier-catalog-approval-gate.spec.ts` Playwright suite covers the browse/PDP surfaces. New unit tests B2C-01..B2C-10 cover the channel gate logic.

---

## 9. Phase 7 — Validation (see Phase 8 below)

*(Recorded in Phase 8 with command output.)*

---

## 10. Risks / Follow-Up

| Risk | Assessment |
|---|---|
| PRIVATE_OR_AUTH_ONLY items at B2B orgs | Not affected — only `B2C_PUBLIC` excluded from browse/PDP. d250bee regression guard (B2C-05) in place. |
| RFQ posture discrepancy | RFQ still excludes `PRIVATE_OR_AUTH_ONLY` via `IN ('B2B_PUBLIC', 'BOTH')`. This is a documented separate design decision (RFQ draft context requires confirmed "published" items). Out of scope for this task. |
| B2C storefront route | `GET /api/public/b2c/products` in `public.ts` is unaffected — it has its own service (`listPublicB2CProducts`) that targets `B2C_PUBLIC` and `BOTH` items. No changes to `public.ts`. |
| Future `BOTH` posture coverage | Suppliers who want items in both channels must set posture to `BOTH`. This is documented and intentional. |

---

## 11. Commit

```
fix(catalog): gate B2C_PUBLIC items from B2B buyer surfaces (POLICY_B)
```

**Files in commit:**
- `server/src/routes/tenant.ts`
- `server/src/routes/tenant.catalogB2cPostureGate.test.ts`
- `docs/TECS-BUYER-CATALOG-B2C-POSTURE-GATE-001-REPORT.md`
