# TECS-QA-FIXTURE-CLEANUP-BEFORE-LAUNCH-001 — Pre-Launch QA Fixture Cleanup Plan

> **⚠️ DESIGN ONLY — NO DATA MUTATION AUTHORIZED**
>
> This artifact is a planning and design document only. No production data has been mutated.
> No psql writes have been executed. No DELETE, UPDATE, or TRUNCATE statements have been run.
> No schema or migration changes have been made. No seed scripts have been modified.
> Cleanup execution is **explicitly blocked** until Paresh authorizes Slice C.

**Unit ID:** TECS-QA-FIXTURE-CLEANUP-BEFORE-LAUNCH-001  
**Mode:** DESIGN ONLY  
**Status:** `DESIGN_COMPLETE — CLEANUP_NOT_AUTHORIZED`  
**Design date:** 2025-07-23  
**Author:** GitHub Copilot (TECS SAFE-WRITE Mode — Design / Reporting Only)  
**Source artifacts reviewed:**
- `docs/TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001-DESIGN-v1.md`
- `docs/TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001-SLICE-C-ALT-QA-SEED-EVIDENCE.md`
- `docs/TECS-CATALOG-VISIBILITY-POLICY-STORAGE-001-SLICE-F-QA-SEED-UPDATE-EVIDENCE.md`
- `docs/TECS-SUPPLIER-CATALOG-APPROVAL-GATE-QA-001-EVIDENCE.md`
- `docs/TECS-PRODUCTION-DATA-HYGIENE-ORPHAN-ROW-AUDIT-001-REPORT.md`
- `docs/TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001-SLICE-F-FULL-RUNTIME-QA-EVIDENCE.md`
- `tests/e2e/full-textile-chain-runtime-qa.spec.ts` (commit `ba76fb5`)

**Predecessor deliverables:**
- Full textile-chain runtime QA: 55 passed / 3 skipped / 0 failed (commit `092a8c9`)
- All 8 QA blockers resolved and deployed (commit `ba76fb5`)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Why Cleanup Is Required Before Launch](#2-why-cleanup-is-required-before-launch)
3. [Source QA Fixture Inventory](#3-source-qa-fixture-inventory)
4. [Table Dependency Map](#4-table-dependency-map)
5. [Cleanup Strategy Options](#5-cleanup-strategy-options)
6. [Recommended Cleanup Strategy (Option C — Hybrid)](#6-recommended-cleanup-strategy-option-c--hybrid)
7. [Proposed Cleanup Execution Phases](#7-proposed-cleanup-execution-phases)
8. [Dry-Run Query Plan (SELECT Only)](#8-dry-run-query-plan-select-only)
9. [Write Execution Plan (Not Authorized)](#9-write-execution-plan-not-authorized)
10. [Rollback Plan](#10-rollback-plan)
11. [Post-Cleanup Validation Plan](#11-post-cleanup-validation-plan)
12. [Auth / Supabase User Cleanup Considerations](#12-auth--supabase-user-cleanup-considerations)
13. [Event Log and Audit Trail Retention](#13-event-log-and-audit-trail-retention)
14. [Stop Conditions](#14-stop-conditions)
15. [Proposed Implementation Slices (A–E)](#15-proposed-implementation-slices-ae)
16. [Open Questions](#16-open-questions)

---

## 1. Executive Summary

The TexQtic launch-grade QA cycle seeded **13 QA tenants**, **35+ catalog items**, **8
buyer-supplier relationship rows**, **25 RFQ rows**, and associated linked records into the
Supabase-hosted PostgreSQL database that serves `https://app.texqtic.com`. These fixtures
were required to drive the full Playwright test suite (58 tests; 55 passed, 3 skipped,
0 failed after remediation).

Before opening the platform to production traffic, these QA fixtures must be handled
systematically. They cannot simply be left in place because:
- QA catalog items appear in real buyer browse / eligible-supplier surfaces alongside
  production items.
- QA RFQs inflate analytics, event stream projections, and inbox counts.
- QA tenant accounts can authenticate via Supabase Auth and reach all tenant-scoped routes.
- Test event names (`test.EVENT_A`, `test.EVENT_B`) pollute the production audit trail.

**This document defines the cleanup plan.** It does not authorize execution. Cleanup
authorization must be explicit and incremental, slice by slice.

**Recommended strategy:** Option C — Hybrid (see §6).

---

## 2. Why Cleanup Is Required Before Launch

### 2.1 Impact of leaving QA fixtures in place

| Surface | Impact |
|---------|--------|
| Buyer catalog browse | QA items (`QA-*` SKUs) appear alongside real supplier items for real buyers |
| Eligible-supplier list | QA tenants (`qa-*` slugs) appear in supplier discovery results |
| RFQ inbox (suppliers) | 25 QA RFQs inflate supplier inboxes and response counts |
| Analytics / event projections | `test.EVENT_A`, `test.EVENT_B` and QA-scoped events pollute audit trails |
| Onboarding flows | 73 users without membership (see P2-2 hygiene finding) may include QA auth accounts |
| Playwright auth sessions | `.auth/qa-*.json` files hold live Supabase JWT tokens that can authenticate to production |

### 2.2 Scope boundary

**In scope for this cleanup:**
- All rows in any table where `org_id`, `tenant_id`, `slug`, or `email` identifies a
  `qa-*` tenant or `qa.*@texqtic.com` email.
- RFQs with `sku ILIKE 'QA-%'` or on a `qa-*` tenant.
- Timestamp-derived test SKUs (`SKU-*`, `VSKU-*`) on `qa-*` tenants confirmed by hygiene audit.
- Test event rows (`event_name LIKE 'test.%'`) in `event_logs`.
- One DPP traceability node associated with a QA tenant.

**Out of scope (do not touch):**
- Any row belonging to a non-QA tenant (slug not starting with `qa-`).
- Any row where the `org_id` / `tenant_id` predicate is uncertain.
- Supabase Auth user records — these require a separate Supabase admin procedure (see §12).
- The `.auth/*.json` session files — these must be archived manually by the operator.
- Schema, migrations, Prisma configuration, or any product code.
- Event log rows scoped to `CLOSED` non-QA tenants (438 CLOSED orgs are out-of-scope noise).

### 2.3 Authority reference

| Prior document | Relevant section |
|----------------|-----------------|
| `TECS-PRODUCTION-DATA-HYGIENE-ORPHAN-ROW-AUDIT-001-REPORT.md` | §5 P2-2, P3-2, P3-3, P3-4 — explicitly flags QA rows needing teardown |
| `TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001-DESIGN-v1.md` | §17 — Rollback/cleanup plan included in original seed design |
| `TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001-SLICE-C-ALT-QA-SEED-EVIDENCE.md` | §4.2 — Block-level seed records for reversal |

---

## 3. Source QA Fixture Inventory

### 3.1 QA Tenant Register (13 tenants)

All 13 QA tenants were seeded across Slices A, B, and C-ALT. All have status `ACTIVE`.

| Slug | Type | Segment | Email | Auth file | Source slice |
|------|------|---------|-------|-----------|-------------|
| `qa-agg` | AGGREGATOR | — | `qa.agg@texqtic.com` | `.auth/qa-b2b.json`* | Slice A |
| `qa-b2b` | B2B | Weaving/supplier | `qa.b2b@texqtic.com` | `.auth/qa-b2b.json` | Slice A |
| `qa-buyer` | B2B | DomesticTrader | `qa.buyer@texqtic.com` | `.auth/qa-buyer-b.json`† | Slice A |
| `qa-knt-b` | B2B | Knitting | `qa.supplier.knitting.b@texqtic.com` | none | Slice C-ALT |
| `qa-dye-c` | B2B | DyeingHouse | `qa.processor.dyeing.c@texqtic.com` | none | Slice C-ALT |
| `qa-gmt-d` | B2B | GarmentManufacturer | `qa.supplier.garment.d@texqtic.com` | none | Slice C-ALT |
| `qa-buyer-a` | B2B | BrandBuyer | `qa.buyer.brand.a@texqtic.com` | `.auth/qa-buyer-a.json` | Slice C-ALT |
| `qa-buyer-c` | B2B | ExportBuyer | `qa.buyer.export.c@texqtic.com` | `.auth/qa-buyer-c.json` | Slice C-ALT |
| `qa-svc-tst-a` | B2B | TestingLab | `qa.service.testing.a@texqtic.com` | none (skipped) | Slice C-ALT |
| `qa-svc-log-b` | B2B | LogisticsProvider | `qa.service.logistics.b@texqtic.com` | none (skipped) | Slice C-ALT |
| `qa-b2c` | B2C | — | (unknown, pre-Slice A) | none | Pre-existing |
| `qa-wl` | B2B | — | (white-label QA) | none | Pre-existing |
| `qa-pend` | B2B | — | (pending QA) | none | Pre-existing |

*`qa-agg` may share or have its own auth file — requires confirmation.  
†`qa-buyer` is mapped to Buyer B (REQUESTED state) in approval-gate tests using `.auth/qa-buyer-b.json`.

### 3.2 QA Catalog Item Inventory

#### 3.2.1 qa-b2b catalog items

Seeded across Slice A (original 14 items) and patched in Slice C-ALT Block 7 (5 items).

| SKU pattern | Count (approx.) | `publication_posture` | `catalog_visibility_policy_mode` | Source |
|-------------|----------------|----------------------|----------------------------------|--------|
| `QA-B2B-FAB-*` | ~6 active items | `B2B_PUBLIC` (5) + `PRIVATE_OR_AUTH_ONLY` (25) | varied (APPROVED_BUYER_ONLY, HIDDEN, NULL) | Slices A, C-ALT, F |
| `SKU-*` | 1–2 items | unknown | unknown | Ad-hoc QA (P3-4 hygiene finding) |
| `VSKU-*` | 1–2 items | unknown | unknown | Ad-hoc QA (P3-4 hygiene finding) |

> Note: Hygiene audit confirms 30 total rows for qa-b2b. Of these, 5 are `B2B_PUBLIC`.

#### 3.2.2 qa-knt-b catalog items

10 items seeded in Slice C-ALT Block 8.

| SKU pattern | Count | `publication_posture` | `catalog_visibility_policy_mode` |
|-------------|-------|-----------------------|----------------------------------|
| `QA-KNT-B-FAB-*` | 10 | `B2B_PUBLIC` (6) + `PRIVATE_OR_AUTH_ONLY` (4) | APPROVED_BUYER_ONLY (items 003, 004, 007, 008), HIDDEN (010), RELATIONSHIP_GATED (010), NULL rest |

#### 3.2.3 qa-dye-c catalog items

10 items seeded in Slice C-ALT Block 9.

| SKU pattern | Count | `publication_posture` |
|-------------|-------|-----------------------|
| `QA-DYE-C-FAB-*` | 10 | `B2B_PUBLIC` (6) + `PRIVATE_OR_AUTH_ONLY` (4) |

#### 3.2.4 qa-gmt-d catalog items

10 items seeded in Slice C-ALT Block 10.

| SKU pattern | Count | `publication_posture` |
|-------------|-------|-----------------------|
| `QA-GMT-D-FAB-*` | 10 | `B2B_PUBLIC` (6) + `PRIVATE_OR_AUTH_ONLY` (4) |

#### 3.2.5 Other QA tenant items

| Tenant | Count | Notes |
|--------|-------|-------|
| `qa-buyer` | 5 | `PRIVATE_OR_AUTH_ONLY` — confirmed in V-04 |
| `qa-b2c` | 3 | `B2C_PUBLIC` — confirmed in V-04 |
| `qa-wl` | 3 | `PRIVATE_OR_AUTH_ONLY` — confirmed in V-04 |
| `qa-pend` | 1 | `PRIVATE_OR_AUTH_ONLY` — confirmed in V-04 |

**Total QA catalog items (estimated): 77 (all catalog items in DB are QA fixtures per hygiene audit)**

### 3.3 Buyer-Supplier Relationship Rows (8 rows)

All 8 rows were seeded in Slice C-ALT Block 11. All are QA-only (both sides are `qa-*` orgs).

| Row ID | Supplier | Buyer | State | Notes |
|--------|----------|-------|-------|-------|
| T-01 | qa-b2b | qa-buyer-a | `APPROVED` | Primary approval-gate positive path |
| T-02 | qa-b2b | qa-buyer | `REQUESTED` | Primary approval-gate pending path |
| T-03 | — | — | NONE | Absence row — no entry for qa-b2b ↔ qa-buyer-c |
| T-04 | qa-knt-b | qa-buyer-a | `APPROVED` | Cross-supplier isolation |
| T-05 | qa-knt-b | qa-buyer | `REJECTED` | Cross-supplier rejection |
| T-06 | qa-dye-c | qa-buyer-a | `BLOCKED` | Dyeing house blocked |
| T-07 | qa-dye-c | qa-buyer | `SUSPENDED` | Dyeing house suspended |
| T-08 | qa-gmt-d | qa-buyer-a | `EXPIRED` | Garment expired |
| T-09 | qa-gmt-d | qa-buyer | `REVOKED` | Garment revoked |

> Note: T-03 is an absence row — no DB entry exists; no delete needed.

### 3.4 QA RFQ Rows (25 rows)

All 25 RFQ rows confirmed as QA fixtures in the hygiene audit (Q-total = 25).

| Buyer tenant | Supplier tenant | Status | Count | Notes |
|-------------|----------------|--------|-------|-------|
| qa-buyer-a | qa-b2b | OPEN | ~10 | Various Slice F test RFQs |
| qa-buyer | qa-b2b | OPEN, RESPONDED | ~8 | Test RFQ submissions |
| qa-buyer-a / qa-b2b | qa-b2b | INITIATED (stale) | 4 | Stale drafts (P3-3 hygiene finding) |
| qa-buyer / qa-b2b (self-ref) | qa-buyer / qa-b2b | mixed | 4 | Self-referential QA rows (P3-2 hygiene finding) |

### 3.5 DPP / Traceability Rows (1 row)

| Table | Count | Notes |
|-------|-------|-------|
| `dpp_traceability_nodes` | 1 | Single node associated with a QA tenant |
| `dpp_passports` | 0 | Empty — pre-launch |
| `dpp_claims` | 0 | Empty |
| `dpp_certifications` | 0 | Empty |

### 3.6 Test Event Log Rows

| Event name | Count | Notes |
|-----------|-------|-------|
| `test.EVENT_A` | 1 | Test-name event (P2-1 hygiene finding) |
| `test.EVENT_B` | 1 | Test-name event (P2-1 hygiene finding) |
| QA-tenant-scoped events | Unknown | All event_logs with `tenant_id` in QA set |

### 3.7 Auth Session Files (local workspace)

| File | Tenant | State at last run |
|------|--------|------------------|
| `.auth/qa-buyer-a.json` | qa-buyer-a | APPROVED (Slice F confirmed) |
| `.auth/qa-buyer-b.json` | qa-buyer | REQUESTED (Slice F confirmed) |
| `.auth/qa-buyer-c.json` | qa-buyer-c | NONE (Slice F confirmed) |
| `.auth/qa-b2b.json` | qa-b2b | Supplier/owner (Slice F confirmed) |

> These files are `.gitignore`d but exist on disk and contain live Supabase JWTs.

---

## 4. Table Dependency Map

The following diagram shows FK dependency order. Cleanup must proceed **leaves first,
roots last** to avoid FK constraint violations.

```
tenants (root)
  └─ organizations (FK → tenants)
       ├─ org_role_positions (FK → organizations)
       ├─ catalog_items (FK → organizations)
       │    ├─ catalog_item_tags (FK → catalog_items)
       │    ├─ catalog_item_media (FK → catalog_items)
       │    └─ rfqs (FK → catalog_items + buyer_org + supplier_org)
       │         ├─ rfq_supplier_responses (FK → rfqs)
       │         └─ rfq_line_items (FK → rfqs) [if present]
       ├─ buyer_supplier_relationships (FK → organizations × 2)
       ├─ dpp_traceability_nodes (FK → organizations)
       └─ notifications (FK → users, organizations)
            └─ (no children)
  └─ users (FK → tenants via memberships)
       └─ memberships (FK → users, organizations)
event_logs (FK → tenants — may be nullable; confirm)
```

### 4.1 Required delete order (FK-safe)

1. `rfq_supplier_responses` where RFQ is QA-scoped
2. `rfq_line_items` (if table exists) where RFQ is QA-scoped
3. `rfqs` where buyer_org or supplier_org is a QA org
4. `catalog_item_tags` where catalog_item is QA-scoped
5. `catalog_item_media` where catalog_item is QA-scoped
6. `catalog_items` where org is QA org (`sku ILIKE 'QA-%' OR sku ILIKE 'SKU-%' OR sku ILIKE 'VSKU-%'` AND on QA org)
7. `buyer_supplier_relationships` where both sides are QA orgs
8. `dpp_traceability_nodes` where org is QA org
9. `notifications` where user/org is QA-scoped
10. `event_logs` where `event_name LIKE 'test.%'` OR `tenant_id` is QA tenant
11. `org_role_positions` where org is QA org
12. `memberships` where org is QA org
13. `organizations` where tenant is QA tenant
14. `users` where email `ILIKE 'qa.%@texqtic.com'` (after membership check)
15. `tenants` where slug `ILIKE 'qa-%'`

> **Warning:** Steps 13–15 are irreversible without re-seeding. Separate authorization
> required. See §6.3 for soft-deactivation alternative.

---

## 5. Cleanup Strategy Options

### Option A — Hard Delete All QA Rows

**Description:** DELETE all rows in all tables identified in §3 and §4, in FK-safe order.
Includes tenants, orgs, users, memberships, catalog items, RFQs, relationships,
event logs, DPP rows.

| Criterion | Assessment |
|-----------|-----------|
| Completeness | ✅ Complete |
| Reversibility | ❌ Irreversible without full re-seed |
| Risk to production data | ⚠️ High — any predicate error deletes real data |
| Playwright test re-runability | ❌ All 58 tests would fail (no QA fixtures) |
| Auth file invalidation | ⚠️ Auth JWTs become invalid; Playwright tests require new auth setup |
| Recommended for | Post-launch teardown only, when QA suite is no longer needed |

### Option B — Soft Deactivate All QA Rows

**Description:** UPDATE `status` to `INACTIVE` or `CLOSED` for QA tenants, orgs, and users.
Leave all catalog items, RFQs, relationships in place.

| Criterion | Assessment |
|-----------|-----------|
| Completeness | ❌ Incomplete — items still appear in browse results unless API filters by status |
| Reversibility | ✅ Fully reversible (UPDATE back to ACTIVE) |
| Risk to production data | ✅ Low — soft changes only |
| Playwright test re-runability | ⚠️ Requires reactivation before re-running tests |
| Browse surface cleanliness | ❌ QA catalog items still returned for ACTIVE sessions |
| Recommended for | Not recommended — does not solve buyer browse contamination |

### Option C — Hybrid (Recommended)

**Description:**
- **Hard delete** all volatile runtime rows: RFQs, `rfq_supplier_responses`,
  `rfq_line_items`, notifications, `test.*` event_logs, QA-scoped event_logs.
- **Hard delete** all QA catalog items and associated child rows
  (`catalog_item_tags`, `catalog_item_media`).
- **Hard delete** all `buyer_supplier_relationships` where both sides are QA orgs.
- **Hard delete** `dpp_traceability_nodes` for QA orgs.
- **Soft deactivate** (UPDATE status/state to INACTIVE/CLOSED) for: tenants, organizations,
  users, memberships — to preserve audit trail and allow re-activation for future QA runs.
- Auth files and Supabase Auth user accounts handled separately (see §12).

| Criterion | Assessment |
|-----------|-----------|
| Browse surface cleanliness | ✅ No QA items in browse (items hard deleted) |
| RFQ / inbox cleanliness | ✅ No QA RFQs in supplier inboxes or analytics |
| Audit trail | ✅ Tenant/org/user rows preserved in INACTIVE/CLOSED state |
| Reversibility | ⚠️ Partial — tenant/org/user can be reactivated; deleted rows cannot |
| Risk level | ✅ Moderate — predicates clearly bounded to `qa-*` slugs and `QA-*` SKUs |
| Re-seeding cost if needed | ✅ Lower — anchor rows preserved; only runtime data re-seeded |
| Recommended for | **Pre-launch cleanup with re-runability option preserved** |

### Option D — Archival to Separate Schema

**Description:** Move all QA rows into a `qa_archive` schema via `CREATE TABLE AS SELECT`
or `INSERT INTO qa_archive.catalog_items SELECT ...`, then DELETE from live schema.

| Criterion | Assessment |
|-----------|-----------|
| Completeness | ✅ Complete |
| Reversibility | ✅ High — data preserved in archive schema |
| Risk | ✅ Low for data loss, but schema changes require explicit approval |
| Complexity | ❌ High — requires schema creation, FK constraints review |
| Recommended for | Not recommended for this phase — over-engineered for QA fixture scope |

---

## 6. Recommended Cleanup Strategy (Option C — Hybrid)

### 6.1 Rationale

Option C is recommended because:

1. **Browse cleanliness is the primary goal.** QA catalog items must not appear in real
   buyer-facing surfaces. Hard deletion is the only clean path for items.

2. **RFQ / inbox integrity.** 25 QA RFQs inflate supplier inbox counts and event projections.
   These have no production value and should be hard deleted.

3. **Audit trail preservation.** Tenant, org, and user rows carry the identity context
   for all QA activity. Soft-deactivating them preserves the audit trail while blocking
   those accounts from active use.

4. **Re-activation path.** By preserving tenant/org/user rows in INACTIVE state, the QA
   environment can be reactivated for future QA cycles without a full re-seed. Only runtime
   data (items, relationships, RFQs) needs re-seeding.

5. **Bounded predicate safety.** The `slug ILIKE 'qa-%'` predicate and `sku ILIKE 'QA-%'`
   pattern are specific enough that a predicate error is visually identifiable in a dry run.

### 6.2 Hybrid cleanup: what is hard deleted vs. soft deactivated

| Category | Action | Predicate | Reason |
|----------|--------|-----------|--------|
| `catalog_items` | **HARD DELETE** | `sku ILIKE 'QA-%' OR sku ILIKE 'SKU-%' OR sku ILIKE 'VSKU-%'` on QA org | Items appear in browse; must be removed |
| `catalog_item_tags` | **HARD DELETE** | cascade from catalog_items | FK child |
| `catalog_item_media` | **HARD DELETE** | cascade from catalog_items | FK child |
| `buyer_supplier_relationships` | **HARD DELETE** | both `supplierOrgId` and `buyerOrgId` on QA orgs | Relationship state affects approval gate tests |
| `rfqs` | **HARD DELETE** | buyer_org OR supplier_org in QA org set | RFQs inflate inbox, analytics |
| `rfq_supplier_responses` | **HARD DELETE** | cascade from rfqs | FK child |
| `dpp_traceability_nodes` | **HARD DELETE** | org_id in QA org set | 1 row; safe to remove |
| `notifications` | **HARD DELETE** | tenant_id in QA tenant set | QA-scoped only |
| `event_logs` (test.* events) | **HARD DELETE** | `event_name LIKE 'test.%'` | Test-name pollution |
| `event_logs` (QA tenant) | **HARD DELETE** | `tenant_id` in QA tenant set | QA-scoped |
| `org_role_positions` | **HARD DELETE** | org_id in QA org set | No audit value; re-seedable |
| `memberships` | **SOFT DEACTIVATE** | org_id in QA org set | Preserve membership audit trail |
| `users` (QA emails) | **SOFT DEACTIVATE** | `email ILIKE 'qa.%@texqtic.com'` | Preserve user audit trail; Supabase Auth handled separately |
| `organizations` (QA orgs) | **SOFT DEACTIVATE** | `tenant_id` in QA tenant set | Preserve org identity for re-seed |
| `tenants` (QA tenants) | **SOFT DEACTIVATE** | `slug ILIKE 'qa-%'` | Preserve tenant rows; blocks active use |

### 6.3 Soft deactivation definition

**Tenants:** `UPDATE tenants SET status = 'INACTIVE' WHERE slug ILIKE 'qa-%'`  
**Organizations:** `UPDATE organizations SET status = 'INACTIVE' WHERE tenant_id IN (QA tenant IDs)`  
**Users:** No `status` column — users are deactivated by disabling their Supabase Auth
account (out-of-band; see §12). DB user row left as-is.  
**Memberships:** No `status` column on memberships table — memberships are not soft-deletable
unless schema supports it. If no status field exists: leave memberships in place (they are
inaccessible if the org/tenant is INACTIVE).

> **Schema confirmation required** before execution: verify `tenants.status`,
> `organizations.status` column names and allowed values. This design assumes `INACTIVE`
> is a valid enum value. If not, confirm the correct value (`CLOSED`, `DEACTIVATED`, etc.).

---

## 7. Proposed Cleanup Execution Phases

### Phase 0 — Pre-cleanup dry run and inventory confirmation

Run all SELECT queries from §8. Confirm:
- Row counts match expected inventory (§3).
- No non-QA tenant slug appears in any result.
- No production catalog item SKU appears.
- No active production org would be affected.

**Authorization gate:** All row counts must match. Any unexpected count → STOP.

### Phase 1 — Volatile runtime data deletion (lowest risk)

Delete in FK-safe order:
1. `rfq_supplier_responses` on QA RFQs
2. `rfqs` on QA orgs
3. `notifications` on QA tenants
4. `event_logs` (test events + QA tenant events)

**Risk:** Lowest. These rows have no persistence value. Predicate is bounded.

### Phase 2 — Catalog item deletion

Delete in FK-safe order:
1. `catalog_item_tags` on QA items
2. `catalog_item_media` on QA items
3. `catalog_items` with QA SKU patterns on QA orgs

**Risk:** Low-medium. Predicate requires double check: QA org AND QA SKU (belt-and-suspenders).

### Phase 3 — Relationship and DPP deletion

1. `buyer_supplier_relationships` where both sides are QA orgs
2. `dpp_traceability_nodes` for QA orgs

**Risk:** Low. Both predicates are unambiguous.

### Phase 4 — Org role positions deletion

1. `org_role_positions` for QA orgs

**Risk:** Low. Re-seedable.

### Phase 5 — Tenant / org / user soft deactivation

1. `UPDATE tenants SET status = 'INACTIVE'` for QA slugs
2. `UPDATE organizations SET status = 'INACTIVE'` for QA tenant set
3. No DB mutation for users — handled via Supabase Auth (see §12)

**Risk:** Moderate. Soft change; reversible. Confirm status column values before running.

### Phase 6 — Auth file archival (manual, out-of-band)

Operator archives or removes:
- `.auth/qa-buyer-a.json`
- `.auth/qa-buyer-b.json`
- `.auth/qa-buyer-c.json`
- `.auth/qa-b2b.json`

> These are `.gitignore`d workspace files. Git history is not affected. Archival is manual.

---

## 8. Dry-Run Query Plan (SELECT Only)

The following SELECT-only queries form the Slice A dry run. They produce row counts and
sample data for operator review. **No writes.**

### INV-01 — QA tenant count and slug list

```sql
SELECT id, slug, status, type
FROM tenants
WHERE slug ILIKE 'qa-%'
ORDER BY slug;
-- Expected: 13 rows; all ACTIVE; slugs match §3.1 list
```

### INV-02 — QA org count and ID list

```sql
SELECT o.id, o.slug, o.status, t.slug AS tenant_slug
FROM organizations o
JOIN tenants t ON o.tenant_id = t.id
WHERE t.slug ILIKE 'qa-%'
ORDER BY t.slug;
-- Expected: 13 rows (org_count = tenant_count per V-02)
```

### INV-03 — QA catalog item count by tenant and SKU prefix

```sql
SELECT t.slug AS tenant_slug, ci.sku, ci.publication_posture, ci.catalog_visibility_policy_mode
FROM catalog_items ci
JOIN organizations o ON ci.org_id = o.id
JOIN tenants t ON o.tenant_id = t.id
WHERE t.slug ILIKE 'qa-%'
ORDER BY t.slug, ci.sku;
-- Expected: ~77 rows; ALL should be on qa-* tenants
-- CRITICAL: confirm no non-QA tenant appears
```

### INV-04 — Timestamp-based SKUs on QA tenants

```sql
SELECT t.slug AS tenant_slug, ci.sku, ci.publication_posture
FROM catalog_items ci
JOIN organizations o ON ci.org_id = o.id
JOIN tenants t ON o.tenant_id = t.id
WHERE t.slug ILIKE 'qa-%'
  AND (ci.sku ILIKE 'SKU-%' OR ci.sku ILIKE 'VSKU-%')
ORDER BY ci.sku;
-- Expected: 2–4 rows (P3-4 hygiene finding); confirm QA tenant only
```

### INV-05 — QA buyer-supplier relationships

```sql
SELECT bsr.id, ts.slug AS supplier_slug, tb.slug AS buyer_slug, bsr.state
FROM buyer_supplier_relationships bsr
JOIN organizations os ON bsr.supplier_org_id = os.id
JOIN tenants ts ON os.tenant_id = ts.id
JOIN organizations ob ON bsr.buyer_org_id = ob.id
JOIN tenants tb ON ob.tenant_id = tb.id
WHERE ts.slug ILIKE 'qa-%' OR tb.slug ILIKE 'qa-%'
ORDER BY ts.slug, tb.slug;
-- Expected: 8 rows; BOTH sides must be qa-* tenants
-- STOP if any row has a non-QA side
```

### INV-06 — QA RFQs

```sql
SELECT r.id, ts.slug AS supplier_slug, tb.slug AS buyer_slug, r.status, r.created_at
FROM rfqs r
JOIN organizations os ON r.supplier_org_id = os.id
JOIN tenants ts ON os.tenant_id = ts.id
JOIN organizations ob ON r.buyer_org_id = ob.id
JOIN tenants tb ON ob.tenant_id = tb.id
WHERE ts.slug ILIKE 'qa-%' OR tb.slug ILIKE 'qa-%'
ORDER BY r.created_at DESC;
-- Expected: 25 rows; all on qa-* tenants on both sides
-- STOP if any row has a non-QA party
```

### INV-07 — Self-referential QA RFQs

```sql
SELECT r.id, ts.slug, tb.slug
FROM rfqs r
JOIN organizations os ON r.supplier_org_id = os.id
JOIN tenants ts ON os.tenant_id = ts.id
JOIN organizations ob ON r.buyer_org_id = ob.id
JOIN tenants tb ON ob.tenant_id = tb.id
WHERE ts.slug = tb.slug;
-- Expected: 4 rows (P3-2 hygiene finding); all on qa-* tenants
```

### INV-08 — RFQ supplier responses on QA RFQs

```sql
SELECT rsr.id, rsr.rfq_id
FROM rfq_supplier_responses rsr
JOIN rfqs r ON rsr.rfq_id = r.id
JOIN organizations os ON r.supplier_org_id = os.id
JOIN tenants ts ON os.tenant_id = ts.id
WHERE ts.slug ILIKE 'qa-%';
-- Expected: unknown count; verify all are QA-scoped
```

### INV-09 — Test event_logs entries

```sql
SELECT event_name, COUNT(*) AS cnt
FROM event_logs
WHERE event_name LIKE 'test.%'
GROUP BY event_name;
-- Expected: test.EVENT_A=1, test.EVENT_B=1 (P2-1 hygiene finding)
```

### INV-10 — QA tenant event_logs count

```sql
SELECT t.slug, COUNT(*) AS event_count
FROM event_logs el
JOIN tenants t ON el.tenant_id = t.id
WHERE t.slug ILIKE 'qa-%'
GROUP BY t.slug
ORDER BY t.slug;
-- Expected: total across all QA tenants; confirm bounded
```

### INV-11 — DPP traceability nodes on QA orgs

```sql
SELECT dtn.id, dtn.org_id, t.slug
FROM dpp_traceability_nodes dtn
JOIN organizations o ON dtn.org_id = o.id
JOIN tenants t ON o.tenant_id = t.id
WHERE t.slug ILIKE 'qa-%';
-- Expected: 1 row (hygiene audit D-total)
```

### INV-12 — QA user count by email pattern

```sql
SELECT COUNT(*) AS user_count, array_agg(email ORDER BY email) AS emails
FROM users
WHERE email ILIKE 'qa.%@texqtic.com';
-- Expected: ~13 users matching QA email patterns
-- Cross-check against §3.1 email list
```

### INV-13 — QA membership count

```sql
SELECT t.slug, COUNT(m.id) AS membership_count
FROM memberships m
JOIN organizations o ON m.org_id = o.id
JOIN tenants t ON o.tenant_id = t.id
WHERE t.slug ILIKE 'qa-%'
GROUP BY t.slug
ORDER BY t.slug;
-- Expected: 13 rows (all OWNER memberships per V-03)
```

### INV-14 — QA org role positions count

```sql
SELECT t.slug, COUNT(rp.id) AS role_position_count
FROM org_role_positions rp
JOIN organizations o ON rp.org_id = o.id
JOIN tenants t ON o.tenant_id = t.id
WHERE t.slug ILIKE 'qa-%'
GROUP BY t.slug
ORDER BY t.slug;
-- Expected: 13 rows (one per tenant; some may have secondary segments)
```

### INV-15 — Notifications on QA tenants

```sql
SELECT t.slug, COUNT(n.id) AS notification_count
FROM notifications n
JOIN tenants t ON n.tenant_id = t.id
WHERE t.slug ILIKE 'qa-%'
GROUP BY t.slug;
-- Expected: unknown count; verify all are QA-scoped
```

### INV-16 — Confirm no non-QA catalog items would be touched

```sql
SELECT ci.sku, t.slug
FROM catalog_items ci
JOIN organizations o ON ci.org_id = o.id
JOIN tenants t ON o.tenant_id = t.id
WHERE (ci.sku ILIKE 'QA-%' OR ci.sku ILIKE 'SKU-%' OR ci.sku ILIKE 'VSKU-%')
  AND t.slug NOT ILIKE 'qa-%';
-- Expected: 0 rows
-- CRITICAL: if any rows returned, STOP — the SKU pattern has non-QA matches
```

---

## 9. Write Execution Plan (Not Authorized)

> **STATUS: NOT AUTHORIZED. Do not execute until Paresh grants explicit Slice C approval.**
>
> This section describes the write operations that would be executed IF Slice C is authorized.
> It is provided here for review and pre-approval planning only. No SQL has been run.

The write plan follows the FK-safe order defined in §4.1 and the Phase plan in §7.
Each step is preceded by a corresponding SELECT (see §8) to confirm the target row set.

### W-01 through W-05 — Phase 1: Volatile runtime data

```sql
-- W-01: rfq_supplier_responses
DELETE FROM rfq_supplier_responses
WHERE rfq_id IN (
  SELECT r.id FROM rfqs r
  JOIN organizations ob ON r.buyer_org_id = ob.id
  JOIN tenants tb ON ob.tenant_id = tb.id
  WHERE tb.slug ILIKE 'qa-%'
);

-- W-02: rfqs
DELETE FROM rfqs
WHERE buyer_org_id IN (
  SELECT o.id FROM organizations o
  JOIN tenants t ON o.tenant_id = t.id WHERE t.slug ILIKE 'qa-%'
)
OR supplier_org_id IN (
  SELECT o.id FROM organizations o
  JOIN tenants t ON o.tenant_id = t.id WHERE t.slug ILIKE 'qa-%'
);

-- W-03: notifications
DELETE FROM notifications
WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug ILIKE 'qa-%'
);

-- W-04: test event_logs
DELETE FROM event_logs WHERE event_name LIKE 'test.%';

-- W-05: QA tenant event_logs
DELETE FROM event_logs
WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug ILIKE 'qa-%'
);
```

### W-06 through W-08 — Phase 2: Catalog items

```sql
-- W-06: catalog_item_tags
DELETE FROM catalog_item_tags
WHERE catalog_item_id IN (
  SELECT ci.id FROM catalog_items ci
  JOIN organizations o ON ci.org_id = o.id
  JOIN tenants t ON o.tenant_id = t.id
  WHERE t.slug ILIKE 'qa-%'
    AND (ci.sku ILIKE 'QA-%' OR ci.sku ILIKE 'SKU-%' OR ci.sku ILIKE 'VSKU-%')
);

-- W-07: catalog_item_media
DELETE FROM catalog_item_media
WHERE catalog_item_id IN (
  SELECT ci.id FROM catalog_items ci
  JOIN organizations o ON ci.org_id = o.id
  JOIN tenants t ON o.tenant_id = t.id
  WHERE t.slug ILIKE 'qa-%'
    AND (ci.sku ILIKE 'QA-%' OR ci.sku ILIKE 'SKU-%' OR ci.sku ILIKE 'VSKU-%')
);

-- W-08: catalog_items (belt-and-suspenders: BOTH org predicate AND SKU predicate required)
DELETE FROM catalog_items
WHERE id IN (
  SELECT ci.id FROM catalog_items ci
  JOIN organizations o ON ci.org_id = o.id
  JOIN tenants t ON o.tenant_id = t.id
  WHERE t.slug ILIKE 'qa-%'
    AND (ci.sku ILIKE 'QA-%' OR ci.sku ILIKE 'SKU-%' OR ci.sku ILIKE 'VSKU-%')
);
```

### W-09 through W-10 — Phase 3: Relationships and DPP

```sql
-- W-09: buyer_supplier_relationships (both sides must be QA)
DELETE FROM buyer_supplier_relationships
WHERE supplier_org_id IN (
  SELECT o.id FROM organizations o
  JOIN tenants t ON o.tenant_id = t.id WHERE t.slug ILIKE 'qa-%'
)
AND buyer_org_id IN (
  SELECT o.id FROM organizations o
  JOIN tenants t ON o.tenant_id = t.id WHERE t.slug ILIKE 'qa-%'
);

-- W-10: dpp_traceability_nodes
DELETE FROM dpp_traceability_nodes
WHERE org_id IN (
  SELECT o.id FROM organizations o
  JOIN tenants t ON o.tenant_id = t.id WHERE t.slug ILIKE 'qa-%'
);
```

### W-11 — Phase 4: Org role positions

```sql
-- W-11: org_role_positions
DELETE FROM org_role_positions
WHERE org_id IN (
  SELECT o.id FROM organizations o
  JOIN tenants t ON o.tenant_id = t.id WHERE t.slug ILIKE 'qa-%'
);
```

### W-12 through W-13 — Phase 5: Soft deactivation (UPDATE, not DELETE)

```sql
-- W-12: organizations soft deactivate
-- *** Confirm allowed status value before running ***
UPDATE organizations
SET status = 'INACTIVE'
WHERE tenant_id IN (
  SELECT id FROM tenants WHERE slug ILIKE 'qa-%'
);

-- W-13: tenants soft deactivate
-- *** Confirm allowed status value before running ***
UPDATE tenants
SET status = 'INACTIVE'
WHERE slug ILIKE 'qa-%';
```

### Pre-execution checklist before any W-* step

- [ ] INV dry run (§8) executed for that step, row count confirmed
- [ ] `INV-16` returned 0 rows (no non-QA SKU matches)
- [ ] `INV-05` confirmed all relationship sides are QA
- [ ] `INV-06` confirmed all RFQ parties are QA
- [ ] Working tree clean: `git status --short` shows no uncommitted changes
- [ ] No active Playwright run in progress
- [ ] Operator has acknowledged that this is the authorized cleanup scope

---

## 10. Rollback Plan

### For hard-deleted rows (Phases 1–4)

Hard-deleted rows cannot be recovered from the DB. Rollback requires re-seeding via
the seed script: `server/scripts/qa/current-db-multi-segment-qa-seed.ts`

The seed script is idempotent for Blocks 1–7. Re-running it after cleanup will re-create:
- 13 QA tenants (Block 1)
- 13 organizations (Block 2)
- 13 role positions (Block 3)
- 13 users (Block 5)
- 13 memberships (Block 6)
- qa-b2b catalog patches (Block 7)
- New supplier catalog items (Blocks 8–10)
- Buyer-supplier relationships (Block 11)

**Auth session files:** Must be regenerated via Playwright auth setup. The
`qa-buyer-a.json`, `qa-buyer-b.json`, `qa-buyer-c.json`, `qa-b2b.json` session files
will be invalid after Supabase Auth account deactivation (see §12). Regeneration requires
re-activating the Supabase Auth accounts and re-running the Playwright auth flow.

**Rollback window estimate:** ~30 minutes for full re-seed + auth regeneration.

### For soft-deactivated rows (Phase 5)

Rollback is a single SQL UPDATE per table:

```sql
-- Rollback: reactivate QA tenants
UPDATE tenants SET status = 'ACTIVE' WHERE slug ILIKE 'qa-%';

-- Rollback: reactivate QA organizations
UPDATE organizations SET status = 'ACTIVE'
WHERE tenant_id IN (SELECT id FROM tenants WHERE slug ILIKE 'qa-%');
```

**This rollback is fast and low-risk.** Soft deactivation is the safest cleanup option
for tenant/org rows.

---

## 11. Post-Cleanup Validation Plan

After cleanup execution (Slice C), the following verification queries and tests confirm
the cleanup was complete and no production data was affected.

### POST-V-01 — Catalog surface is clean

```sql
SELECT COUNT(*) FROM catalog_items ci
JOIN organizations o ON ci.org_id = o.id
JOIN tenants t ON o.tenant_id = t.id
WHERE t.slug ILIKE 'qa-%';
-- Expected: 0
```

### POST-V-02 — No QA RFQs remain

```sql
SELECT COUNT(*) FROM rfqs r
JOIN organizations ob ON r.buyer_org_id = ob.id
JOIN tenants tb ON ob.tenant_id = tb.id
WHERE tb.slug ILIKE 'qa-%';
-- Expected: 0
```

### POST-V-03 — No QA relationships remain

```sql
SELECT COUNT(*) FROM buyer_supplier_relationships bsr
JOIN organizations os ON bsr.supplier_org_id = os.id
JOIN tenants ts ON os.tenant_id = ts.id
WHERE ts.slug ILIKE 'qa-%';
-- Expected: 0
```

### POST-V-04 — No test event names remain

```sql
SELECT COUNT(*) FROM event_logs WHERE event_name LIKE 'test.%';
-- Expected: 0
```

### POST-V-05 — QA tenants exist but are INACTIVE

```sql
SELECT slug, status FROM tenants WHERE slug ILIKE 'qa-%' ORDER BY slug;
-- Expected: 13 rows; all status = 'INACTIVE' (soft deactivated)
```

### POST-V-06 — Production catalog count unchanged

```sql
SELECT COUNT(*) FROM catalog_items ci
JOIN organizations o ON ci.org_id = o.id
JOIN tenants t ON o.tenant_id = t.id
WHERE t.slug NOT ILIKE 'qa-%';
-- Compare against baseline count from dry run
-- Expected: same count as before cleanup
```

### POST-V-07 — GET /api/health still returns 200

```bash
curl -s -o /dev/null -w "%{http_code}" https://app.texqtic.com/api/health
# Expected: 200
```

### POST-V-08 — Smoke test: eligible-suppliers no longer returns qa-* slugs

```bash
curl -s -H "Authorization: Bearer <real-buyer-token>" \
  "https://app.texqtic.com/api/tenant/catalog/eligible-suppliers" \
  | grep -c '"qa-'
# Expected: 0
```

---

## 12. Auth / Supabase User Cleanup Considerations

### 12.1 Scope

QA users were created via Supabase Auth as part of the seeding process. The DB `users`
table rows correspond to Supabase Auth `auth.users` rows. Deleting or deactivating the
DB `users` row alone is **insufficient** — the Supabase Auth account remains active and
can still receive a JWT and authenticate to production.

### 12.2 Required out-of-band action

After DB soft deactivation of QA tenants/orgs, the following Supabase Auth users must
be **disabled** (not deleted — to preserve audit trail) via the Supabase admin dashboard
or Management API:

| Email | Supabase action |
|-------|----------------|
| `qa.b2b@texqtic.com` | Disable account |
| `qa.buyer@texqtic.com` | Disable account |
| `qa.buyer.brand.a@texqtic.com` | Disable account |
| `qa.buyer.export.c@texqtic.com` | Disable account |
| `qa.supplier.knitting.b@texqtic.com` | Disable account |
| `qa.processor.dyeing.c@texqtic.com` | Disable account |
| `qa.supplier.garment.d@texqtic.com` | Disable account |
| `qa.service.testing.a@texqtic.com` | Disable account |
| `qa.service.logistics.b@texqtic.com` | Disable account |
| `qa.agg@texqtic.com` | Disable account |
| (other pre-existing QA emails) | Confirm and disable |

**Copilot cannot execute Supabase Auth user management.** This is an operator action
via the Supabase dashboard (`https://app.supabase.com → Authentication → Users`) or
the Supabase Management API.

### 12.3 Auth session files (`.auth/*.json`)

The `.auth/` directory is `.gitignore`d. Files contain live JWTs. After cleanup:
- Archive or delete `.auth/qa-buyer-a.json`
- Archive or delete `.auth/qa-buyer-b.json`
- Archive or delete `.auth/qa-buyer-c.json`
- Archive or delete `.auth/qa-b2b.json`

Leaving these files in place risks accidental Playwright test runs against production
with no QA fixtures — all 55 tests would fail, which is expected but should be explicit.

---

## 13. Event Log and Audit Trail Retention

### 13.1 Test-named events

The two `test.EVENT_A` and `test.EVENT_B` rows have no business value in a production
audit trail. They were flagged as P2-1 in the hygiene audit. These should be hard deleted
unconditionally (W-04).

### 13.2 QA tenant–scoped events

All `event_logs` rows with `tenant_id` pointing to a QA tenant are QA test artifacts.
They should be hard deleted as part of Phase 1 (W-05).

### 13.3 Audit trail for QA cleanup itself

After Slice C executes, a cleanup evidence document (`TECS-QA-FIXTURE-CLEANUP-BEFORE-LAUNCH-001-EXECUTION-EVIDENCE.md`) should be committed with:
- Timestamp of execution
- Row counts deleted per table (from RETURNING clauses or COUNT comparisons)
- INV and POST-V query results
- Operator attestation

This preserves the audit trail for the cleanup operation itself.

### 13.4 AI inference error events

12 `ai.inference.error` events noted in hygiene report (P3-5) are not QA-tenant-scoped
unless they have `tenant_id` in the QA set. They should be **excluded** from cleanup
unless INV-10 confirms they are on QA tenants. Do not delete non-QA event_logs.

---

## 14. Stop Conditions

Cleanup execution **MUST STOP** immediately if any of the following conditions are met.
Emit a Blocker Report and wait for operator instruction.

| Condition | Trigger |
|-----------|---------|
| INV-16 returns > 0 rows | QA SKU pattern matches a non-QA tenant — abort all deletes |
| INV-05 shows a non-QA side in any relationship | A production relationship would be deleted |
| INV-06 shows a non-QA party in any RFQ | A production RFQ would be deleted |
| Any INV query returns > 50% more rows than expected | Predicate may be too broad |
| `organizations.status` or `tenants.status` does not accept `INACTIVE` | Soft deactivation would fail; confirm valid status values |
| A DB error occurs during any W-* step | STOP; do not proceed to next step without diagnosis |
| A FK constraint violation occurs | Delete order may be wrong; re-verify §4.1 |
| Any cleanup step times out | Pooler may not support long-running DML; switch to direct connection |
| Slice C is attempted without explicit written Paresh approval | STOP unconditionally |
| Cleanup would touch any row without a confirmed QA predicate | STOP — no inferences |

---

## 15. Proposed Implementation Slices (A–E)

### Slice A — SELECT-only cleanup inventory (dry-run counts)

**Scope:** Run all INV-01 through INV-16 queries from §8.  
**Output:** Row counts and sample data for each QA entity type.  
**Deliverable:** Evidence table in execution doc.  
**Authorization required:** None (SELECT only, read-only).  
**Risk:** Zero.

### Slice B — Cleanup script implementation (dry-run mode)

**Scope:** Implement `server/scripts/qa/pre-launch-cleanup.ts` with all W-* statements
wrapped in a `DRY_RUN` flag that runs SELECT counts instead of DELETE/UPDATE.  
**Output:** Dry-run output confirming what WOULD be deleted, with counts.  
**Deliverable:** Script file + dry-run output evidence.  
**Authorization required:** Allowlist: `server/scripts/qa/pre-launch-cleanup.ts` (NEW).  
**Risk:** Zero (no DB writes).

### Slice C — Cleanup execution (explicit authorization required)

**Scope:** Execute the cleanup script in write mode. Follow Phase 1–5 order from §7.  
**Output:** DELETE/UPDATE row counts per step. Evidence doc committed.  
**Deliverable:** `docs/TECS-QA-FIXTURE-CLEANUP-BEFORE-LAUNCH-001-EXECUTION-EVIDENCE.md`  
**Authorization required:** **Explicit written authorization from Paresh.**  
**Risk:** Moderate. Hard deletes are irreversible.

### Slice D — Post-cleanup smoke verification

**Scope:** Run POST-V-01 through POST-V-08 from §11.  
**Output:** All checks pass. Health endpoint returns 200.  
**Deliverable:** Evidence appended to execution doc.  
**Authorization required:** None (read-only + health check).  
**Risk:** Zero.

### Slice E — Governance closure / launch readiness update

**Scope:** Update relevant governance docs to reflect cleanup completion.  
**Files:** `governance/coverage-matrix.md` (if applicable), this design doc (status update).  
**Deliverable:** Commit `docs(qa): close pre-launch fixture cleanup, update governance`.  
**Authorization required:** Standard — confirm allowlist.  
**Risk:** Zero.

---

## 16. Open Questions

| # | Question | Priority | Owner |
|---|----------|----------|-------|
| OQ-1 | What is the valid `status` enum value for soft-deactivating a `tenant` row? Is it `INACTIVE`, `CLOSED`, or `DEACTIVATED`? | **High** — needed before W-12/W-13 | Must confirm from schema |
| OQ-2 | Does the `organizations` table have a `status` column? What values are allowed? `CLOSED` is seen in hygiene audit data (438 rows). | **High** — needed before W-12 | Confirm from Prisma schema |
| OQ-3 | Are `memberships` rows linked to anything downstream that would break if left as orphans after org deactivation? | **Medium** | Confirm from schema |
| OQ-4 | Are the `rfq_line_items` and `rfq_supplier_responses` tables the only FK children of `rfqs`? Are there other child tables (e.g., `rfq_attachments`, `rfq_messages`)? | **High** — needed for complete FK order | Confirm from Prisma schema |
| OQ-5 | Does `event_logs` have `tenant_id` as a required FK or is it nullable? If nullable, QA-scoped events may be identifiable only by `event_name` prefix or payload analysis. | **Medium** | Confirm from schema |
| OQ-6 | Should the 73 users without any membership (P2-2 hygiene finding) be audited as part of this cleanup? Some may be QA auth accounts. | **Medium** | Operator decision |
| OQ-7 | Is the seed script (`current-db-multi-segment-qa-seed.ts`) safe to re-run after cleanup without re-creating event_logs or RFQs that were deleted? | **Medium** | Review seed script |
| OQ-8 | Are Supabase Auth accounts for `qa-svc-tst-a` and `qa-svc-log-b` active? These tenants have no `.auth/*.json` files (auth was skipped in Playwright). | **Low** | Supabase dashboard check |
| OQ-9 | For the 3 skipped Playwright tests (FTJ-01, FTJ-02, FTJ-03: service provider + aggregator), should new auth files be created before cleanup, or should those tests be permanently marked as skip? | **Medium** | Product decision |
| OQ-10 | After cleanup, will the full-textile-chain Playwright spec be retired or updated to use production-only fixtures? What is the QA strategy post-launch? | **Medium** | Product decision |

---

## Appendix A — QA Slug / Email Reference

### QA tenant slugs (predicate: `slug ILIKE 'qa-%'`)

```
qa-agg
qa-b2b
qa-b2c
qa-buyer
qa-buyer-a
qa-buyer-c
qa-dye-c
qa-gmt-d
qa-knt-b
qa-pend
qa-svc-log-b
qa-svc-tst-a
qa-wl
```

### QA user email patterns (predicate: `email ILIKE 'qa.%@texqtic.com'`)

```
qa.agg@texqtic.com
qa.b2b@texqtic.com
qa.buyer@texqtic.com
qa.buyer.brand.a@texqtic.com
qa.buyer.export.c@texqtic.com
qa.processor.dyeing.c@texqtic.com
qa.service.logistics.b@texqtic.com
qa.service.testing.a@texqtic.com
qa.supplier.garment.d@texqtic.com
qa.supplier.knitting.b@texqtic.com
```

### QA catalog SKU patterns

- Primary: `sku ILIKE 'QA-%'`
- Supplemental: `sku ILIKE 'SKU-%'` (on QA org only — require double predicate)
- Supplemental: `sku ILIKE 'VSKU-%'` (on QA org only — require double predicate)

---

*Last updated: 2025-07-23 — TECS-QA-FIXTURE-CLEANUP-BEFORE-LAUNCH-001 Design v1.*
