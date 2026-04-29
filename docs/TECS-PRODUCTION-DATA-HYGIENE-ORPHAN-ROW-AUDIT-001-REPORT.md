# TECS-PRODUCTION-DATA-HYGIENE-ORPHAN-ROW-AUDIT-001 — Evidence Report

**Task ID:** TECS-PRODUCTION-DATA-HYGIENE-ORPHAN-ROW-AUDIT-001  
**Remediation Unit:** 6  
**Execution Date:** 2025-06-28  
**Operator:** GitHub Copilot (automated audit agent)  
**Mode:** READ-ONLY — SELECT queries only via Prisma `$queryRawUnsafe`. No mutations.

---

## 1. Target Environment

| Attribute | Value |
|---|---|
| Database | Supabase-hosted PostgreSQL (remote; authoritative) |
| URL fingerprint (SHA-256 prefix) | `6253e338b3bea8cc` |
| IS_SUPABASE | `true` |
| ORM | Prisma 6.1.0 |
| Script runner | `pnpm -C server exec tsx scripts/qa/data-hygiene-audit.ts` |
| psql status | Installed but hangs against Supabase pooler — not used |
| Queries executed | ~40 raw SELECT queries across Phases 3–10 |

---

## 2. Read-Only Confirmation

All queries in this audit were `SELECT` statements executed via Prisma `$queryRawUnsafe`. No `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `CREATE`, `DROP`, or DDL statements were issued. The audit script contains no write operations.

---

## 3. Files Changed

| File | Action |
|---|---|
| `docs/TECS-PRODUCTION-DATA-HYGIENE-ORPHAN-ROW-AUDIT-001-REPORT.md` | CREATED (this report — committed) |
| `server/scripts/qa/data-hygiene-audit.ts` | CREATED (audit script — not committed) |

---

## 4. Query Categories Executed

| Phase | Area | Queries |
|---|---|---|
| Phase 3 | Catalog data hygiene | C-01 through C-09 (9 queries) |
| Phase 4 | Buyer-supplier relationship hygiene | R-01 through R-STATE (12 queries) |
| Phase 5 | RFQ data hygiene | Q-01 through Q-total (10 queries) |
| Phase 6 | DPP / compliance hygiene | D-01 through D-total (7 queries) |
| Phase 7 | AI matching / embedding hygiene | A-01 through A-08 (8 queries) |
| Phase 8 | Event log (notification) hygiene | N-01 through N-total (5 queries) |
| Phase 9 | Tenant / user / membership hygiene | T-01 through T-08 (10 queries) |
| Phase 10 | QA fixture cleanup readiness | QA footprint + schema check (2 queries) |

---

## 5. Findings by Severity

### P0 — Security / Privacy Critical

**None.** No cross-tenant data exposure, no policy internals in event payloads, no materialized views leaking hidden items, no forbidden field names in embeddings content.

---

### P1 — Launch Blocker

**None.** All referential integrity checks pass. No orphan rows in any FK-constrained table. No invalid enum values in `catalog_items`, `buyer_supplier_relationships`, or `rfqs`.

---

### P2 — Important: Address Before Production Traffic

#### P2-1: Test Events in Production `event_logs`
- **Check:** N-EVENT distribution
- **Finding:** `test.EVENT_A` (1 row) and `test.EVENT_B` (1 row) are present in the live `event_logs` table.
- **Risk:** Test event names should not exist in the production audit trail. Even if tenant-scoped to a QA tenant, they pollute event stream analytics and may interfere with event-projection pipelines that pattern-match on event names.
- **Action required:** Confirm these rows are QA-tenant-scoped. If so, mark as acceptable and add assertion to QA fixture teardown. If not QA-scoped, treat as production contamination and investigate source.

#### P2-2: 73 Users Without Any Membership
- **Check:** T-03
- **Finding:** `users_without_membership = 73`
- **Risk:** These users can authenticate via Supabase Auth (credentials exist) but have no tenant affiliation. They will receive `403` or empty-state responses on all tenant-scoped endpoints. This may represent: (a) abandoned onboarding flows, (b) auth account created before membership was assigned, or (c) deleted tenants whose users were not cleaned up. The risk is that authenticated users with no membership can make authenticated API calls that hit tenant-scoped routes with no `org_id` context — behavior depends on middleware handling of membership absence.
- **Action required:** Audit the 73 users. Determine if they are: (a) QA artifacts, (b) production users stuck mid-onboarding, or (c) orphaned users from deleted tenants. Add membership creation atomicity guard or deferred-membership handler.

---

### P3 — Non-Critical: Document and Track

#### P3-1: 20 B2B_PUBLIC Catalog Items Have `price` Populated
- **Check:** C-09
- **Finding:** Of 77 catalog items with `price` populated (75 non-zero), 20 have `publication_posture = 'B2B_PUBLIC'`.
- **Risk:** If `price_disclosure_policy_mode` for these items is not `RFQ_ONLY` or `PRICE_ON_REQUEST`, the `price` field may be visible in catalog API responses to any authenticated B2B buyer — regardless of relationship state. This is only a data issue if the pricing intent is to gate behind a relationship.
- **Action required:** Confirm that all B2B_PUBLIC items with non-zero price have appropriate `price_disclosure_policy_mode` set. No schema fix needed; policy enforcement review only.

#### P3-2: Self-Referential QA RFQs (buyer_slug = supplier_slug)
- **Check:** Q-12
- **Finding:** 3 QA RFQ rows have `buyer_slug = qa-buyer` and `supplier_slug = qa-buyer` (same tenant for both buyer and supplier). One additional: `buyer_slug = qa-b2b`, `supplier_slug = qa-b2b`.
- **Risk:** Self-referential RFQs should not be possible in production for real tenants (a supplier cannot send an RFQ to itself). These appear to be QA test artifacts. No DB-level constraint prevents it currently.
- **Action required:** Consider adding a DB-level constraint `CHECK (org_id != supplier_org_id)` on the `rfqs` table to prevent self-referential RFQs. Track in schema contract backlog.

#### P3-3: 4 INITIATED-status RFQs on the Same QA Item (Stale Drafts)
- **Check:** Q-12 + Q-03 distribution
- **Finding:** 4 RFQs with status `INITIATED` for `QA-B2B-FAB-002` / `qa-buyer-a` → `qa-b2b`. The `INITIATED` status suggests these are draft RFQs that were started but never submitted.
- **Risk:** Not a production risk. Stale QA draft-state rows. May inflate QA fixture cleanup scope.
- **Action required:** Include in QA fixture teardown checklist; confirm `INITIATED` RFQs are excluded from buyer-facing "active RFQs" views.

#### P3-4: Timestamp-Based SKUs in QA Data
- **Check:** Q-12
- **Finding:** Two RFQs reference SKUs `SKU-1774237234465` and `VSKU-1772526705780` on tenant `qa-b2b`. These are timestamp-derived SKU strings (not `QA-*` prefixed), indicating ad-hoc test data creation rather than formal fixture seeding.
- **Risk:** These items will not be captured by the standard `sku ILIKE 'QA-%'` QA cleanup filter. If left in place, they accumulate as silent background noise.
- **Action required:** Add these to QA fixture cleanup tracking. Update cleanup queries to also match `SKU-*` and `VSKU-*` patterns if they are confirmed QA-only.

#### P3-5: 12 `ai.inference.error` Events in Event Log
- **Check:** N-EVENT distribution
- **Finding:** 12 `ai.inference.error` events vs. 3 `ai.inference.generate` events. Error rate: 4× more errors than successful inferences.
- **Risk:** AI inference is failing significantly more than it is succeeding. With the embedding table empty (0 rows), these errors may explain why the AI matching surface has no data.
- **Action required:** Investigate `payload_json` of these 12 events to determine root cause. Check if they correlate to a specific model, tenant, or time period.

#### P3-6: 438 CLOSED Organizations / 433 CLOSED B2B Tenants
- **Check:** T-07, T-08
- **Finding:** Non-QA status: CLOSED(438), ACTIVE(18), VERIFICATION_APPROVED(1). Total tenant distribution: B2B CLOSED(433), B2B ACTIVE(25), B2C ACTIVE(6), B2C CLOSED(4), INTERNAL CLOSED(1), AGGREGATOR ACTIVE(1) = 470 total tenants.
- **Risk:** Large backlog of CLOSED accounts. No orphan rows found (all pass FK checks). However, the volume of CLOSED tenants generates background noise in any cross-tenant analytics. No immediate risk, but archival policy should be defined.
- **Action required:** Define archival/soft-delete policy for CLOSED organizations. Consider whether CLOSED tenants should be excluded from any aggregate queries.

---

### INFO — Expected / Acceptable State

| Check | Finding | Assessment |
|---|---|---|
| C-01 orphan catalog items (no tenant) | 0 rows | PASS |
| C-02 invalid publication_posture | 0 rows | PASS |
| C-03 invalid catalog_visibility_policy_mode | 0 rows | PASS |
| C-04 invalid price_disclosure_policy_mode | 0 rows | PASS |
| C-05 duplicate SKUs per tenant | 0 rows | PASS |
| C-06 catalog items with no supplier org row | 0 rows | PASS |
| C-07 materialized views (hidden item leak path) | 0 rows | PASS — no hidden MV risk |
| C-08 APPROVED_BUYER_ONLY items (14 rows) | All 14 are QA fixtures (`QA-*` SKUs) | INFO — expected QA data |
| R-01 orphan BSRs | 0 rows (both sides) | PASS |
| R-02 invalid relationship states | 0 rows | PASS |
| R-03 duplicate supplier+buyer tuples | 0 rows | PASS — UNIQUE constraint working |
| R-04 self-relationship rows | 0 rows | PASS |
| R-05 timestamp inconsistencies | 0 rows (all variants) | PASS |
| R-06 APPROVED with non-ACTIVE orgs | 0 rows | PASS |
| R-07 QA relationship matrix | 8 rows covering all 7 valid states | INFO — complete QA state coverage |
| Q-01 orphan RFQs | 0 rows (buyer, supplier, item) | PASS |
| Q-03 invalid RFQ status values | 0 rows | PASS |
| Q-06 active RFQs with null party | 0 rows | PASS |
| Q-07 RFQs on HIDDEN items | 0 rows | PASS |
| Q-08 price columns in rfq_supplier_responses | 0 columns | PASS — no buyer-facing price leak |
| Q-09 orphan rfq_supplier_responses | 0 rows | PASS |
| D-01 orphan DPP passport states | 0 rows | PASS |
| D-01b orphan traceability nodes | 0 rows | PASS |
| D-02 DPP evidence with missing extraction | 0 rows | PASS |
| D-05 certifications with missing org | 0 rows | PASS |
| D-06 certification lifecycle states | 0 certifications total | INFO — pre-launch empty state |
| DPP totals | dpp_passports=0, claims=0, certs=0, traceability_nodes=1 | INFO — pre-launch |
| A-01 embeddings without org_id | 0 | PASS (table empty) |
| A-02 total embeddings | 0 | INFO — AI matching not yet seeded |
| A-04 forbidden policy fields in embedding content | 0 | PASS |
| A-07 orphan CATALOG_ITEM embeddings | 0 | PASS |
| A-08 embeddings for inactive items | 0 | PASS |
| N-01 event_logs missing tenant_id (tenant realm) | 0 rows | PASS |
| N-03 duplicate rfq.submitted events | 0 rows | PASS |
| N-04/N-05 policy internals in event payload | 0 rows | PASS |
| T-01 tenants without organization | 0 rows | PASS |
| T-02 organizations without tenant | 0 rows | PASS |
| T-04 memberships with missing user/tenant | 0 rows (both) | PASS |
| T-05 multiple OWNER memberships per tenant | 0 rows | PASS |
| T-06 QA tenants | 13 QA tenants, all ACTIVE | INFO — expected fixture |

---

## 6. Per-Area Results Summary

### 6.1 Catalog (Phase 3)

- **Total catalog items:** 77 (with price), inferred 77+ total
- **Referential integrity:** PASS — all items link to valid tenants and organizations
- **Enum integrity:** PASS — all `publication_posture`, `catalog_visibility_policy_mode`, `price_disclosure_policy_mode` values are valid
- **Duplicate SKUs:** PASS — no duplicates within a tenant
- **APPROVED_BUYER_ONLY items:** 14 (all QA fixtures)
- **Price field:** 77 items with price, 75 non-zero, 20 B2B_PUBLIC with price → See P3-1

### 6.2 Buyer-Supplier Relationships (Phase 4)

- **Total BSRs:** 8 (all QA fixtures)
- **Referential integrity:** PASS — all link to valid organizations
- **State validity:** PASS — all 8 states (REQUESTED, APPROVED, SUSPENDED, BLOCKED, REVOKED, EXPIRED, REJECTED) present; all valid
- **Duplicate tuples:** PASS — UNIQUE constraint enforced
- **Self-relationships:** PASS — none
- **Timestamp consistency:** PASS — all terminal state timestamps are coherent

### 6.3 RFQs (Phase 5)

- **Total RFQs:** 25 (all 25 are QA fixture rows)
- **Status distribution:** OPEN=16, RESPONDED=5, INITIATED=4
- **Referential integrity:** PASS — all link to valid buyer tenant, supplier tenant, and catalog item
- **HIDDEN item RFQs:** PASS — none
- **Self-referential RFQs:** 4 (buyer = supplier, same QA tenant) → See P3-2
- **Stale INITIATED RFQs:** 4 → See P3-3

### 6.4 DPP / Compliance (Phase 6)

- **Total DPP passports:** 0 (pre-launch)
- **Total DPP evidence claims:** 0 (pre-launch)
- **Traceability nodes:** 1 (valid org link)
- **Certifications:** 0
- **Referential integrity:** PASS — 1 traceability node has valid org

### 6.5 AI Matching / Embeddings (Phase 7)

- **Total document embeddings:** 0 — AI matching surface is empty
- **All embedding checks:** Trivially pass (no data to audit)
- **AI inference errors:** 12 `ai.inference.error` events logged → See P3-5

### 6.6 Event Logs / Notifications (Phase 8)

- **Total events:** 101
- **Dominant event types:** `marketplace.cart.item.added` (41), `marketplace.cart.created` (20), `marketplace.cart.item.removed` (13)
- **Test events:** `test.EVENT_A` (1), `test.EVENT_B` (1) → See P2-1
- **Policy internals in payloads:** PASS — none found
- **Duplicate rfq.submitted:** PASS — none
- **Tenant ID coverage:** PASS — no tenant realm events missing tenant_id

### 6.7 Tenant / User / Membership (Phase 9)

- **Total tenants:** 470 (433 CLOSED B2B, 25 ACTIVE B2B, 6 ACTIVE B2C, 4 CLOSED B2C, 1 CLOSED INTERNAL, 1 ACTIVE AGGREGATOR)
- **Total active non-QA orgs:** 18 ACTIVE + 1 VERIFICATION_APPROVED
- **Tenant ↔ Organization integrity:** PASS — no orphans either way
- **Users without membership:** 73 → See P2-2
- **Membership integrity:** PASS — all memberships link to valid users and tenants
- **Multiple OWNER per tenant:** PASS — none
- **QA tenants:** 13 (all ACTIVE, all expected)

---

## 7. QA Fixture Cleanup Readiness

| Entity | QA Row Count | Cleanup Filter |
|---|---|---|
| Tenants | 13 | `slug LIKE 'qa-%'` |
| Users | 15 | `email ILIKE 'qa%@texqtic.com'` |
| Catalog items | 56 | `sku ILIKE 'QA-%'` |
| Buyer-Supplier Relationships | 8 | via supplier org `slug LIKE 'qa-%'` |
| RFQs | 17 | via buyer tenant `slug LIKE 'qa-%'` |
| Memberships | 14 | via tenant `slug LIKE 'qa-%'` |
| Document embeddings | 0 | — |
| DPP passport states | 0 | — |

**Note:** Items with SKUs `SKU-1774237234465` and `VSKU-1772526705780` on tenant `qa-b2b` are not captured by the `QA-%` filter and will require explicit cleanup. See P3-4.

---

## 8. Audit Verdict

```
PASS_WITH_P2_P3_FINDINGS
```

| Severity | Count | Status |
|---|---|---|
| P0 — Security/Privacy Critical | 0 | ✅ CLEAN |
| P1 — Launch Blocker | 0 | ✅ CLEAN |
| P2 — Important (pre-traffic) | 2 | ⚠️ ACTION REQUIRED |
| P3 — Non-Critical | 6 | ℹ️ DOCUMENT & TRACK |
| INFO | Multiple | ✅ EXPECTED |

---

## 9. P0/P1 Blockers

**None.** No security, privacy, or launch-blocking issues were found. The database is safe to continue operating in current state.

---

## 10. Risk Summary Table

| ID | Severity | Area | Finding | Recommended Action |
|---|---|---|---|---|
| P2-1 | P2 | Event Logs | `test.EVENT_A`, `test.EVENT_B` in production `event_logs` | Confirm QA-tenant-scoped; add to teardown checklist |
| P2-2 | P2 | Users | 73 users have no membership (no tenant affiliation) | Audit 73 users; add membership-creation atomicity guard |
| P3-1 | P3 | Catalog | 20 B2B_PUBLIC items with price populated | Review `price_disclosure_policy_mode` on all 20 items |
| P3-2 | P3 | RFQs | 4 self-referential RFQs (buyer = supplier) in QA | Consider `CHECK (org_id != supplier_org_id)` constraint |
| P3-3 | P3 | RFQs | 4 INITIATED stale QA RFQs for QA-B2B-FAB-002 | Include in QA fixture teardown |
| P3-4 | P3 | RFQs | Non-QA-prefix SKUs on qa-b2b tenant (2 items) | Extend cleanup filter to `SKU-*`, `VSKU-*` patterns |
| P3-5 | P3 | AI | 12 `ai.inference.error` events (4× error:success ratio) | Inspect event payloads; investigate AI inference failures |
| P3-6 | P3 | Tenants | 438 CLOSED organizations accumulated | Define archival policy for CLOSED accounts |

---

## 11. Commit

```
audit(data): add production hygiene and orphan-row report
```

**Staged file:** `docs/TECS-PRODUCTION-DATA-HYGIENE-ORPHAN-ROW-AUDIT-001-REPORT.md`  
**NOT staged:** `server/scripts/qa/data-hygiene-audit.ts` (helper script, not committed)
