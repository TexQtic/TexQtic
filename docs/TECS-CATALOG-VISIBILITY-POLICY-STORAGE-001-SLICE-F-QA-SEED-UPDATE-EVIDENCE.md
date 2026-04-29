# TECS-CATALOG-VISIBILITY-POLICY-STORAGE-001 — Slice F: QA Seed Update Evidence

**Ticket:** TECS-CATALOG-VISIBILITY-POLICY-STORAGE-001  
**Slice:** F — QA Seed Matrix Update  
**Commit:** `qa(seed): restore visibility policy intent via catalog_visibility_policy_mode`  
**Date:** 2025-07-14  
**Predecessor commits:** `feb9e5f` (A) · `9d29798` (B) · `57b6e6c` (C) · `59e9207` (D) · `9c71d14` (E)

---

## Objective

Restore original catalog visibility intent in the QA seed script by writing
`catalog_visibility_policy_mode` values that were lossy-mapped in Slice C-ALT (Option A).

The `catalog_visibility_policy_mode` column was added in Slice B (migration `9d29798`,
`VARCHAR(30)` nullable on `catalog_items`). Slice C-ALT's Option A workaround mapped
`APPROVED_BUYER_ONLY → B2B_PUBLIC` and `HIDDEN → PRIVATE_OR_AUTH_ONLY` because the
DB constraint `catalog_items_publication_posture_check` does not allow those values in
`publication_posture`. Slice F uses the durable `catalog_visibility_policy_mode` column
to store the intended access-control policy explicitly.

This unblocks **E2E-07**, **E2E-08**, **E2E-09** at the data layer. Playwright-level
verification remains Slice G's responsibility.

---

## File Modified

| File | Change |
|---|---|
| `server/scripts/qa/current-db-multi-segment-qa-seed.ts` | Added `catalogVisibilityPolicyMode` to `QA_B2B_CATALOG_PATCHES`, `CatalogItemSpec` type, `buildSupplierCatalogItems()`, Block 7 `updateMany`, idempotent re-seed path, and Slice F validations (V-F01 through V-F10) |

**No other files changed.** No migrations, no schema changes, no route changes.

---

## Phase 0 — Preflight

```
git status --short
(clean working tree — all Slices A-E committed)

git log --oneline -6
9c71d14 security(ai): exclude catalog_visibility_policy_mode from all AI paths
59e9207 feat(rfq): add item-level visibility policy gate to RFQ prefill and submit
57b6e6c prompt-sliceC catalog: wire visibility policy resolver into catalog browse and PDP routes
9d29798 migration(catalog): add catalog_visibility_policy_mode column
feb9e5f feat(catalog): add visibility policy resolver with fallback mapping
```

---

## Phase 1 — Column Verification

```
pnpm -C server exec prisma migrate status
→ Database schema is up to date! (107 migrations applied)

schema.prisma line 362:
catalogVisibilityPolicyMode String? @map("catalog_visibility_policy_mode") @db.VarChar(30)
→ CONFIRMED
```

---

## Phase 2 — Seed Script Changes Summary

### `QA_B2B_CATALOG_PATCHES` (Block 7)

| SKU | publication_posture | priceDisclosurePolicyMode | catalogVisibilityPolicyMode | Notes |
|---|---|---|---|---|
| QA-B2B-FAB-002 | B2B_PUBLIC | NULL | NULL | unchanged |
| QA-B2B-FAB-003 | B2B_PUBLIC | RELATIONSHIP_ONLY | NULL | unchanged |
| QA-B2B-FAB-004 | B2B_PUBLIC | NULL | `APPROVED_BUYER_ONLY` | **Slice F restore** |
| QA-B2B-FAB-005 | B2B_PUBLIC | RELATIONSHIP_ONLY | `APPROVED_BUYER_ONLY` | **Slice F restore** |
| QA-B2B-FAB-006 | PRIVATE_OR_AUTH_ONLY | NULL | `HIDDEN` | **Slice F restore** |

### `buildSupplierCatalogItems()` — New 10-item distribution (per supplier: qa-knt-b, qa-dye-c, qa-gmt-d)

| Item | publication_posture | catalogVisibilityPolicyMode | Design intent |
|---|---|---|---|
| 001 | B2B_PUBLIC | NULL | fallback → PUBLIC |
| 002 | B2B_PUBLIC | NULL | fallback → PUBLIC |
| 003 | B2B_PUBLIC | APPROVED_BUYER_ONLY | approval-gated, discoverable |
| 004 | B2B_PUBLIC | APPROVED_BUYER_ONLY | approval-gated, discoverable |
| 005 | PRIVATE_OR_AUTH_ONLY | NULL | fallback → AUTHENTICATED_ONLY |
| 006 | PRIVATE_OR_AUTH_ONLY | NULL | fallback → AUTHENTICATED_ONLY |
| 007 | PRIVATE_OR_AUTH_ONLY | APPROVED_BUYER_ONLY | auth + approval-gated |
| 008 | PRIVATE_OR_AUTH_ONLY | APPROVED_BUYER_ONLY | auth + approval-gated |
| 009 | PRIVATE_OR_AUTH_ONLY | HIDDEN | supplier-private, hidden |
| 010 | B2B_PUBLIC | RELATIONSHIP_GATED | discoverable, relationship-gated |

### Idempotent re-seed path

For tenants that already have catalog items, the script now patches
`catalogVisibilityPolicyMode` (and `publicationPosture`) via `updateMany` instead of
silently skipping. This ensures re-runs are safe and idempotent.

---

## Phase 3 — Seed Execution Output

```
[QA-SEED] Slice C-ALT — starting multi-segment QA seed
[QA-SEED] DB: Supabase PostgreSQL (DATABASE_URL loaded from .env)

[PREFLIGHT] P1 PASS: All 8 required tables present
[PREFLIGHT] P2 PASS: Anchor tenants: qa-agg, qa-b2b, qa-buyer
[PREFLIGHT] P3 INFO: All net-new tenants already exist — running in IDEMPOTENT UPDATE mode
[PREFLIGHT] P4: 8 existing QA relationship rows
[PREFLIGHT] P5: Found 6/6 qa-b2b QA catalog items

[SEED] Block 1 DONE: 7 tenant rows processed
[SEED] Block 2 DONE: 7 organization rows processed
[SEED] Block 3 DONE: 7 role position rows
[SEED] Block 4 SKIP: No secondary segments for net-new tenants
[SEED] Block 5 DONE: 7 user rows processed
[SEED] Block 6 DONE: 7 membership rows

[SEED] Block 7 DONE: 5 catalog items patched for qa-b2b (including catalogVisibilityPolicyMode — Slice F)
[SEED] Catalog qa-knt-b: already seeded — patched 10 catalogVisibilityPolicyMode values (Slice F)
[SEED] Catalog qa-dye-c: already seeded — patched 10 catalogVisibilityPolicyMode values (Slice F)
[SEED] Catalog qa-gmt-d: already seeded — patched 10 catalogVisibilityPolicyMode values (Slice F)

[SEED] Block 11 DONE: 0 inserted + 8 updated relationship rows
```

---

## Phase 4 — Post-Seed Validation Results

### Original Slice C-ALT Validations (V-01 through V-07) — still passing

| ID | Validation | Result |
|---|---|---|
| V-01 | QA tenant count by type | PASS: B2B=10, AGGREGATOR=1 |
| V-02 | Organizations parity | PASS: tenant_count=13, org_count=13 |
| V-03 | Membership coverage | PASS: All 13 QA tenants have OWNER |
| V-04 | Catalog posture coverage | PASS (see distribution below) |
| V-05 | Relationship state coverage | PASS: 8 rows |
| V-06 | NONE scenario (qa-b2b ↔ qa-buyer-c) | PASS: 0 rows confirmed |
| V-07 | Role positions coverage | DONE (9 assignments verified) |

### V-04 Distribution

```
qa-b2b | B2B_PUBLIC | 5
qa-b2b | PRIVATE_OR_AUTH_ONLY | 25
qa-dye-c | B2B_PUBLIC | 5
qa-dye-c | PRIVATE_OR_AUTH_ONLY | 5
qa-gmt-d | B2B_PUBLIC | 5
qa-gmt-d | PRIVATE_OR_AUTH_ONLY | 5
qa-knt-b | B2B_PUBLIC | 5
qa-knt-b | PRIVATE_OR_AUTH_ONLY | 5
```

### Slice F Validations (V-F01 through V-F10)

| ID | Validation | Result |
|---|---|---|
| V-F01 | `catalog_visibility_policy_mode` column exists (type=character varying) | ✅ PASS |
| V-F02 | FAB-004=APPROVED_BUYER_ONLY, FAB-005=APPROVED_BUYER_ONLY, FAB-006=HIDDEN | ✅ PASS |
| V-F03 | No invalid `catalog_visibility_policy_mode` values | ✅ PASS |
| V-F04 | Per-supplier distribution: NULL=4, ABO=4, HIDDEN=1, RG=1 | ✅ PASS (all 3 suppliers) |
| V-F05 | All `publication_posture` values constraint-valid | ✅ PASS |
| V-F06 | APPROVED_BUYER_ONLY items=14, HIDDEN items=4 | ✅ PASS |
| V-F07 | All 7 relationship states present (APPROVED, BLOCKED, EXPIRED, REJECTED, REQUESTED, REVOKED, SUSPENDED) | ✅ PASS |
| V-F08 | No non-QA rows touched | ✅ PASS |
| V-F09 | No duplicate QA catalog SKUs per tenant | ✅ PASS |
| V-F10 | Slice C-ALT V-01 through V-07 still hold | ✅ PASS |

### V-F04 Detailed Distribution

```
qa-dye-c | cvpm=NULL              | count=4
qa-dye-c | cvpm=APPROVED_BUYER_ONLY | count=4
qa-dye-c | cvpm=HIDDEN            | count=1
qa-dye-c | cvpm=RELATIONSHIP_GATED | count=1

qa-gmt-d | cvpm=NULL              | count=4
qa-gmt-d | cvpm=APPROVED_BUYER_ONLY | count=4
qa-gmt-d | cvpm=HIDDEN            | count=1
qa-gmt-d | cvpm=RELATIONSHIP_GATED | count=1

qa-knt-b | cvpm=NULL              | count=4
qa-knt-b | cvpm=APPROVED_BUYER_ONLY | count=4
qa-knt-b | cvpm=HIDDEN            | count=1
qa-knt-b | cvpm=RELATIONSHIP_GATED | count=1
```

### V-F06 E2E Blocker Resolution

```
APPROVED_BUYER_ONLY items: 14  (E2E-07, E2E-09 data requirement met)
HIDDEN items: 4                (E2E-08 data requirement met)
```

---

## Phase 7 — TypeScript + ESLint + Regression Tests

### TypeScript

```
pnpm exec tsc --noEmit
→ (no output — 0 errors)
```

### ESLint

```
npx eslint scripts/qa/current-db-multi-segment-qa-seed.ts
→ 0 errors, 1 warning (file not in ESLint config scope — expected)
```

### Regression Tests

```
pnpm exec vitest run "src/__tests__/catalogVisibilityPolicyResolver.test.ts"
→ 25 tests passed

pnpm exec vitest run "src/routes/tenant.rfqVisibilityPolicyGate.test.ts" \
                     "src/services/ai/__tests__/ai-data-contracts.test.ts" \
                     "src/__tests__/catalogRouteVisibility.test.ts"
→ 70 tests passed (12 + 48 + 10)

Total: 95 tests passed, 0 failures
```

---

## E2E Status Post Slice F

| Scenario | Status before Slice F | Status after Slice F | Next gate |
|---|---|---|---|
| E2E-07: APPROVED_BUYER_ONLY item hidden from unapproved buyer | `BLOCKED_BY_CURRENT_PUBLICATION_POSTURE_SCHEMA` | **Data blocker resolved** | Slice G Playwright |
| E2E-08: HIDDEN item not returned in any browse | `BLOCKED_BY_CURRENT_PUBLICATION_POSTURE_SCHEMA` | **Data blocker resolved** | Slice G Playwright |
| E2E-09: APPROVED_BUYER_ONLY item blocks RFQ for non-approved buyer | `BLOCKED_BY_CURRENT_PUBLICATION_POSTURE_SCHEMA` | **Data blocker resolved** | Slice G Playwright |

---

## Governance

- No DDL executed — data-only seed.
- No migration state changed.
- No non-QA rows touched (V-F08 PASS).
- No secrets printed.
- `publication_posture` constraint respected throughout (V-F05 PASS).
- `REGION_CHANNEL_SENSITIVE` not seeded (excluded by design).

---

## Commit

```
git add server/scripts/qa/current-db-multi-segment-qa-seed.ts
git add docs/TECS-CATALOG-VISIBILITY-POLICY-STORAGE-001-SLICE-F-QA-SEED-UPDATE-EVIDENCE.md
git status --short   # ONLY above 2 files staged
git commit -m "qa(seed): restore visibility policy intent via catalog_visibility_policy_mode"
```

*End of Slice F evidence.*
