# TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001 — Slice C-ALT: QA Seed Evidence

**Date:** 2026-04-29
**Status:** COMPLETE
**Database:** Current QA/dev database (`DATABASE_URL` — Supabase-hosted PostgreSQL)
**Script:** `server/scripts/qa/current-db-multi-segment-qa-seed.ts`

---

## 1. Objective

Seed 7 net-new QA tenants plus associated organizations, users, memberships, role positions, catalog items, and 8 `buyer_supplier_relationships` rows against the current authorized database — completing the QA tenant matrix established by prior slices (A, B).

---

## 2. Prior Slice State

| Slice | Commit  | Summary |
|-------|---------|---------|
| Slice A | ad0c4d1 | Anchor tenants qa-agg, qa-b2b, qa-buyer seeded |
| Slice B | 26ac709 | Staging seed plan doc committed (TECS-...-SLICE-B-STAGING-SEED-PLAN.md) |
| Slice C-ALT (this) | — | Net-new tenants + catalog + relationships on current DB |

---

## 3. Schema Constraint Mismatch — Blocker Resolution

### 3.1 Blocker

During Block 7 execution, the seed script attempted to update `catalog_items.publication_posture` to `APPROVED_BUYER_ONLY` (per Slice B plan), which triggered:

```
ERROR 23514 — new row for relation "catalog_items" violates check constraint
"catalog_items_publication_posture_check"
```

### 3.2 Root Cause

Migration `20260422000000_b2b_public_projection_preconditions` defines:

```sql
ALTER TABLE public.catalog_items
ADD CONSTRAINT catalog_items_publication_posture_check CHECK (
    publication_posture IN (
      'PRIVATE_OR_AUTH_ONLY',
      'B2B_PUBLIC',
      'B2C_PUBLIC',
      'BOTH'
    )
);
```

The Slice B plan used `APPROVED_BUYER_ONLY` and `HIDDEN` which are not in this set.

### 3.3 Decision: Option A

**Mapping applied:**
- `APPROVED_BUYER_ONLY` → `B2B_PUBLIC`
- `HIDDEN` → `PRIVATE_OR_AUTH_ONLY`

**Rationale:** This is a data-only slice. Schema constraints cannot be altered. Relationship/catalog approval gating is handled at the service layer using `buyer_supplier_relationships.state`, not the `publication_posture` column alone. The QA matrix can still exercise all 8 relationship states with this mapping.

**Authoritative wording (per authorization):**

> "Slice B planned `APPROVED_BUYER_ONLY` and `HIDDEN` as catalog posture values, but current DB constraint does not permit those values. Slice C-ALT proceeded with valid current-schema mapping: `APPROVED_BUYER_ONLY → B2B_PUBLIC` and `HIDDEN → PRIVATE_OR_AUTH_ONLY`. This preserves QA seed execution but leaves DB-native catalog posture expansion as a future governed schema question."

### 3.4 Partial Seed State Before Resume

Blocks 1–6 had succeeded before the constraint error. No catalog items or relationships were written. State before resume:

| Entity | Count | Notes |
|--------|-------|-------|
| Net-new tenants | 7 | In DB — qa-knt-b, qa-dye-c, qa-gmt-d, qa-buyer-a, qa-buyer-c, qa-svc-tst-a, qa-svc-log-b |
| Organizations | 7 | Same IDs |
| Role positions | 7 | In DB |
| Users | 7 | In DB |
| Memberships | 7 | In DB |
| Catalog patches (qa-b2b) | 0 | Not yet applied |
| New catalog items | 0 | Not yet inserted |
| Relationships | 0 | Not yet inserted |

---

## 4. Seed Execution

### 4.1 Script

`server/scripts/qa/current-db-multi-segment-qa-seed.ts`

Run from `server/` directory: `npx tsx scripts/qa/current-db-multi-segment-qa-seed.ts`

### 4.2 Block Results

| Block | Description | Result | Rows |
|-------|-------------|--------|------|
| B1 | 7 tenant upserts | PASS (idempotent) | 7 |
| B2 | 7 org upserts | PASS (idempotent) | 7 |
| B3 | 7 role position upserts | PASS (idempotent) | 7 |
| B4 | Secondary segments | SKIP (none planned) | 0 |
| B5 | 7 user upserts | PASS (idempotent) | 7 |
| B6 | 7 membership upserts | PASS (idempotent) | 7 |
| B7 | qa-b2b catalog patches (5 items) | PASS | 5 |
| B8 | qa-knt-b catalog items | PASS | 10 inserted |
| B9 | qa-dye-c catalog items | PASS | 10 inserted |
| B10 | qa-gmt-d catalog items | PASS | 10 inserted |
| B11 | buyer_supplier_relationships (8 rows) | PASS | 8 inserted |

**Total seed output:** 30 new catalog items, 5 catalog patches, 8 relationship rows.

### 4.3 Catalog Posture Applied (Option A Mapping)

**Block 7 — qa-b2b catalog patches:**

| SKU | publication_posture applied | price_disclosure_policy_mode | Note |
|-----|-----------------------------|------------------------------|------|
| QA-B2B-FAB-002 | B2B_PUBLIC | NULL | — |
| QA-B2B-FAB-003 | B2B_PUBLIC | RELATIONSHIP_ONLY | — |
| QA-B2B-FAB-004 | B2B_PUBLIC | NULL | was APPROVED_BUYER_ONLY |
| QA-B2B-FAB-005 | B2B_PUBLIC | RELATIONSHIP_ONLY | was APPROVED_BUYER_ONLY |
| QA-B2B-FAB-006 | PRIVATE_OR_AUTH_ONLY | NULL | was HIDDEN |

**Blocks 8–10 — new supplier catalogs (10 items each, per supplier):**

| Index | publication_posture | Planned | Note |
|-------|---------------------|---------|------|
| 001–004 | B2B_PUBLIC | B2B_PUBLIC | unchanged |
| 005–007 | PRIVATE_OR_AUTH_ONLY | PRIVATE_OR_AUTH_ONLY | unchanged |
| 008–009 | B2B_PUBLIC | APPROVED_BUYER_ONLY | mapped (Option A) |
| 010 | PRIVATE_OR_AUTH_ONLY | HIDDEN | mapped (Option A) |

### 4.4 Relationships Seeded (Block 11)

All 8 rows use QA-only orgs on both sides.

| T-ID | Supplier | Buyer | State | Notes |
|------|----------|-------|-------|-------|
| T-01 | qa-b2b | qa-buyer-a | APPROVED | requestedAt=30d, approvedAt=28d |
| T-02 | qa-b2b | qa-buyer | REQUESTED | requestedAt=5d |
| T-03 | — | — | NONE | Absence row — no entry for qa-b2b↔qa-buyer-c |
| T-04 | qa-knt-b | qa-buyer-a | APPROVED | requestedAt=20d, approvedAt=18d |
| T-05 | qa-knt-b | qa-buyer | REJECTED | requestedAt=25d, decidedAt=23d |
| T-06 | qa-dye-c | qa-buyer-a | BLOCKED | requestedAt=40d, decidedAt=38d |
| T-07 | qa-dye-c | qa-buyer | SUSPENDED | suspendedAt=14d |
| T-08 | qa-gmt-d | qa-buyer-a | EXPIRED | expiresAt=5d ago |
| T-09 | qa-gmt-d | qa-buyer | REVOKED | revokedAt=10d ago |

---

## 5. Post-Seed SELECT Validation

All validations run inline in the seed script after Block 11.

### V-01: QA Tenant Count by Type

```
type=AGGREGATOR  count=1
type=B2B         count=10
type=B2C         count=2
```

**Status: PASS** (B2B ≥ 9, AGGREGATOR ≥ 1)

Note: B2B=10 (9 planned from prior slices + 1 new anchor type counted here). B2C=2 reflects prior slice data. Counts are net of all prior slices — consistent.

### V-02: Organizations Parity

```
tenant_count=13, org_count=13
```

**Status: PASS** (org_count = tenant_count)

### V-03: Membership Coverage

```
All 13 QA tenants have OWNER
```

**Status: PASS**

### V-04: Catalog Posture Coverage

```
qa-b2b          | B2B_PUBLIC           |  5
qa-b2b          | PRIVATE_OR_AUTH_ONLY | 25
qa-b2c          | B2C_PUBLIC           |  3
qa-buyer        | PRIVATE_OR_AUTH_ONLY |  5
qa-dye-c        | B2B_PUBLIC           |  6
qa-dye-c        | PRIVATE_OR_AUTH_ONLY |  4
qa-gmt-d        | B2B_PUBLIC           |  6
qa-gmt-d        | PRIVATE_OR_AUTH_ONLY |  4
qa-knt-b        | B2B_PUBLIC           |  6
qa-knt-b        | PRIVATE_OR_AUTH_ONLY |  4
qa-pend         | PRIVATE_OR_AUTH_ONLY |  1
qa-wl           | PRIVATE_OR_AUTH_ONLY |  3
```

**Status: PASS** — No invalid posture values (`APPROVED_BUYER_ONLY`, `HIDDEN`) appear. All values are within constraint-allowed set.

Confirmed present: `B2B_PUBLIC`, `PRIVATE_OR_AUTH_ONLY`, `B2C_PUBLIC`
Confirmed absent: `APPROVED_BUYER_ONLY`, `HIDDEN`
`price_disclosure_policy_mode = RELATIONSHIP_ONLY` applied to FAB-003 and FAB-005.

### V-05: Relationship State Coverage

```
Total QA relationship rows: 8

qa-b2b   → qa-buyer-a: APPROVED
qa-knt-b → qa-buyer-a: APPROVED
qa-dye-c → qa-buyer-a: BLOCKED
qa-gmt-d → qa-buyer-a: EXPIRED
qa-knt-b → qa-buyer:   REJECTED
qa-b2b   → qa-buyer:   REQUESTED
qa-gmt-d → qa-buyer:   REVOKED
qa-dye-c → qa-buyer:   SUSPENDED
```

**Status: PASS** — All 7 enumerable states present (APPROVED ×2, BLOCKED, EXPIRED, REJECTED, REQUESTED, REVOKED, SUSPENDED). NONE scenario confirmed by V-06.

### V-06: NONE Scenario

```
0 rows confirmed (NONE scenario) for qa-b2b ↔ qa-buyer-c
```

**Status: PASS**

### V-07: Role Position Coverage

```
qa-b2b:       manufacturer
qa-buyer:     trader
qa-buyer-a:   trader
qa-buyer-c:   trader
qa-dye-c:     manufacturer
qa-gmt-d:     manufacturer
qa-knt-b:     manufacturer
qa-svc-log-b: service_provider
qa-svc-tst-a: service_provider
```

**Status: PASS** — 3 manufacturer, 3 trader, 2 service_provider, covering all planned role types.

---

## 6. Posture Constraint Validation (Post-Seed Explicit Check)

Confirmed via V-04 output: zero rows contain `APPROVED_BUYER_ONLY` or `HIDDEN`.
All `catalog_items.publication_posture` values for QA tenants are within the DB constraint-allowed set:
- `PRIVATE_OR_AUTH_ONLY` ✓
- `B2B_PUBLIC` ✓
- `B2C_PUBLIC` ✓

`BOTH` is not used (no row requires it at this seed stage).

---

## 7. Duplicate SKU Check

No `UNIQUE(tenant_id, sku)` constraint exists on `catalog_items`, but the seed script uses pre-existence checks (by tenant_id + SKU set) before inserting. Each tenant received exactly the planned SKU set with no duplicates.

Blocks 8–10 each inserted exactly 10 items (confirmed by `[SEED] Catalog <slug>: inserted 10 items` output). Re-running the script would skip these blocks (`already seeded` path).

---

## 8. Non-QA Data Safety

- All inserts scoped by `qa-`-prefixed slugs and `qa.`-prefixed emails.
- `assertQaSlug()` / `assertQaEmail()` guards in script — any non-QA value would throw at runtime.
- SC-05 guard: Block 11 refuses to overwrite any relationship row whose `internalReason` does not start with `QA:`.
- SC-06 guard: Block 7 refuses to patch > 5 rows total and > 1 row per SKU.
- No live/customer tenant data was touched.

---

## 9. Runtime Playwright Validation

**Status: NOT RUN (DEFERRED)**

Playwright runtime validation was planned but not executed in this slice. The following test categories are deferred to `TECS-SUPPLIER-CATALOG-APPROVAL-GATE-QA-001`:

| Scenario | Category | Status |
|----------|----------|--------|
| Login for seeded QA users | Auth | DEFERRED |
| Catalog browse for qa-knt-b, qa-dye-c, qa-gmt-d | Catalog | DEFERRED |
| `price_disclosure_policy_mode = RELATIONSHIP_ONLY` price gate | Catalog | DEFERRED |
| APPROVED relationship: buyer sees RELATIONSHIP_ONLY price | Relationship-gate | DEFERRED |
| REQUESTED relationship: price gate still active | Relationship-gate | DEFERRED |
| REJECTED/BLOCKED/SUSPENDED/EXPIRED/REVOKED: access denied | Relationship-gate | DEFERRED |
| NONE scenario (qa-b2b ↔ qa-buyer-c): no catalog access | Relationship-gate | DEFERRED |

---

## 10. Scenarios Blocked by Current Schema

The following QA test scenarios **cannot be verified with current `catalog_items.publication_posture` values** because the required DB-native values (`APPROVED_BUYER_ONLY`, `HIDDEN`) do not exist in the current constraint.

| Scenario ID | Description | Blocked Reason |
|-------------|-------------|----------------|
| E2E-07 | DB-level approved-only item hidden from unapproved buyer | `BLOCKED_BY_CURRENT_PUBLICATION_POSTURE_SCHEMA` |
| E2E-08 | DB-level hidden item not returned in any buyer browse | `BLOCKED_BY_CURRENT_PUBLICATION_POSTURE_SCHEMA` |
| E2E-09 | RFQ denied due to item-level approved-only posture (DB-native) | `BLOCKED_BY_CURRENT_PUBLICATION_POSTURE_SCHEMA` |

These are **NOT marked as passed**. They require a future governed schema unit:
`TECS-CATALOG-VISIBILITY-POLICY-STORAGE-001`

---

## 11. Files Changed

| File | Change |
|------|--------|
| `server/scripts/qa/current-db-multi-segment-qa-seed.ts` | Updated `QA_B2B_CATALOG_PATCHES` and `buildSupplierCatalogItems()` to apply Option A posture mapping |
| `docs/TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001-SLICE-C-ALT-QA-SEED-EVIDENCE.md` | Created (this file) |

Probe file `server/scripts/qa/_probe.ts` created during diagnostics — **to be deleted before commit** (not in allowlist).

---

## 12. Recommended Next Authorization

**If approval-gate Playwright runtime is the next priority:**
> `TECS-SUPPLIER-CATALOG-APPROVAL-GATE-QA-001` — runtime verification using current QA matrix (relationship-state gating, price disclosure, RFQ allowed/denied)

**If DB-native catalog visibility policy storage is required first:**
> `TECS-CATALOG-VISIBILITY-POLICY-STORAGE-001` — design-only investigation of persistent catalog visibility policy storage (APPROVED_BUYER_ONLY / HIDDEN) as a governed schema unit

Do not start either unit without explicit authorization.

---

## 13. Slice C-ALT Final Verdict

| Criterion | Status |
|-----------|--------|
| 7 net-new QA tenants seeded | ✓ PASS |
| Organizations parity (13/13) | ✓ PASS |
| Users with correct email pattern | ✓ PASS |
| Memberships (OWNER) for all tenants | ✓ PASS |
| Role positions (manufacturer/trader/service_provider) | ✓ PASS |
| qa-b2b catalog patches (5 items, valid postures) | ✓ PASS |
| 30 new catalog items (10 per supplier, valid postures) | ✓ PASS |
| 8 buyer_supplier_relationships with full state coverage | ✓ PASS |
| NONE scenario (no row qa-b2b↔qa-buyer-c) | ✓ PASS |
| No invalid posture values in DB | ✓ PASS |
| No non-QA data mutated | ✓ PASS |
| Schema constraint blocker documented | ✓ RESOLVED (Option A) |
| DB-native APPROVED_BUYER_ONLY/HIDDEN scenarios | ✗ BLOCKED_BY_CURRENT_PUBLICATION_POSTURE_SCHEMA |

**Slice C-ALT: SEED COMPLETE — PARTIAL VALIDATION (catalog posture expansion deferred)**
