# TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001 — Slice B: Staging SQL Seed Plan

**Document ID:** TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001-SLICE-B  
**Version:** 1.0  
**Status:** DESIGN ONLY — NO SEED EXECUTION AUTHORIZED  
**Author:** QA Governance  
**Slice sequence:** Slice B of H  
**Depends on:** TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001-DESIGN-v1 (Slice A — committed ad0c4d1)  
**Authorises:** Nothing. All SQL shown is advisory pseudo-code for human review.  

---

## Governance Header

```
STRICT DATABASE MODE ENABLED.
Copilot is forbidden from modifying database configuration, Prisma migration state,
or connection URLs unless explicitly instructed.

No SQL in this document has been executed.
No staging or production data has been mutated.
This document is a reviewable plan artifact only.
```

**Forbidden throughout this slice:**
- `psql` execution  
- `prisma migrate dev / db push`  
- Any INSERT, UPDATE, DELETE, or DDL against any environment  
- `.env` printing or secrets exposure  
- Code changes outside `docs/`

---

## Document Summary

This document specifies the **complete staging SQL seed plan** for the MVP 10-tenant multi-segment
QA matrix defined in Slice A. It covers:

- All entity creation targets (tenants, users, memberships, catalog items, relationships)  
- Idempotent CTE-based pseudo-SQL for each table  
- Relationship state coverage (9 tuples, 8 explicit states + NONE)  
- Price disclosure policy coverage (8 item variants)  
- RFQ runtime scenario matrix (14 scenarios — runtime only, no pre-created rows)  
- DPP, AI embedding, and service-provider fixture constraints  
- Preflight checks, post-seed validation queries (SELECT only), and rollback plan  
- Slice C prompt skeleton  

---

## Section 1 — Staging Environment Assumptions

### 1.1 Environment Target

This plan targets a **dedicated staging Supabase PostgreSQL instance**, separate from production.  
The staging instance must have the same schema migration level as production at execution time.

**Staging availability at time of authorship:** UNKNOWN — not yet confirmed.

**Consequence:** Slice C (staging seed execution) is  
**STATUS: BLOCKED_BY_STAGING_ENV** until the following are confirmed by the authorising user:

| Requirement | Status |
|---|---|
| Staging Supabase project URL confirmed | UNKNOWN |
| Staging `DATABASE_URL` available in staging `.env` | UNKNOWN |
| Staging migration state matches production | UNKNOWN |
| Staging `texqtic_app` role exists with correct grants | UNKNOWN |
| Staging RLS policies deployed | UNKNOWN |

### 1.2 Schema Assumptions

All SQL in this document assumes the schema state as introspected from `server/prisma/schema.prisma`
at commit `ad0c4d1`. The following table names and column names are canonical:

| Prisma Model | DB Table | Key columns |
|---|---|---|
| `Tenant` | `tenants` | `id`, `slug`, `name`, `type`, `status`, `plan`, `is_white_label`, `public_eligibility_posture` |
| `organizations` | `organizations` | `id` (= `tenants.id`), `slug`, `legal_name`, `jurisdiction`, `org_type`, `status`, `plan`, `is_white_label`, `primary_segment_key`, `publication_posture`, `price_disclosure_policy_mode` |
| `User` | `users` | `id`, `email`, `password_hash`, `email_verified` |
| `Membership` | `memberships` | `id`, `user_id`, `tenant_id`, `role` |
| `CatalogItem` | `catalog_items` | `id`, `tenant_id`, `name`, `sku`, `publication_posture`, `price_disclosure_policy_mode`, `product_category`, `fabric_type`, `moq`, `price` |
| `BuyerSupplierRelationship` | `buyer_supplier_relationships` | `id`, `supplier_org_id`, `buyer_org_id`, `state`, `requested_at`, `approved_at`, `decided_at`, `suspended_at`, `revoked_at`, `expires_at` |
| `OrganizationSecondarySegment` | `organization_secondary_segments` | `org_id`, `segment_key` |
| `OrganizationRolePosition` | `organization_role_positions` | `org_id`, `role_position_key` |

### 1.3 Auth Architecture

TexQtic uses **custom password-based auth** (`users.password_hash`), NOT Supabase Auth.  
QA user creation = INSERT into `users` (with bcrypt hash) + INSERT into `memberships`.  
No Supabase Auth magic link, no `auth.users` table involvement.

QA password for all seeded users: `Password123!` (bcrypt hash pre-computed at seed time).  
This document uses the placeholder `<QA_BCRYPT_HASH>` wherever the hash appears.  
**The actual hash must never be printed in logs, chat, or documents.**

### 1.4 Dual-Table Tenancy Model

`organizations.id` is a **foreign key to `tenants.id`** (shared UUID).  
Both tables must be seeded for every tenant. Insertion order:

```
1. INSERT INTO tenants (...)
2. INSERT INTO organizations (...) -- same id as tenants row
3. INSERT INTO users (...)
4. INSERT INTO memberships (...)
5. INSERT INTO organization_secondary_segments (...)  [if applicable]
6. INSERT INTO organization_role_positions (...)  [if applicable]
```

Failure to insert the `organizations` row will cause FK violations on  
`buyer_supplier_relationships`, `trade_lifecycle_logs`, `escalation_events`, and RLS guards.

---

## Section 2 — Entity Creation Plan

### 2.1 MVP Tenant Register (10 tenants)

| # | Key | Slug | Display Name | Type | Segment | Role Position | Disposition |
|---|---|---|---|---|---|---|---|
| 1 | `QA_WVG_A` | `qa-b2b` | QA B2B (Weaving Supplier A) | B2B | Weaving | manufacturer | **REUSE existing** |
| 2 | `QA_KNT_B` | `qa-knt-b` | QA Knitting Supplier B | B2B | Knitting | manufacturer | **NEW** |
| 3 | `QA_DYE_C` | `qa-dye-c` | QA Dyeing Supplier C | B2B | Fabric Processing | manufacturer | **NEW** |
| 4 | `QA_GMT_D` | `qa-gmt-d` | QA Garment Supplier D | B2B | Garment | manufacturer | **NEW** |
| 5 | `QA_BUYER_A` | `qa-buyer-a` | QA Buyer A | B2B | Weaving | trader | **NEW** |
| 6 | `QA_BUYER_B` | `qa-buyer` | QA Buyer (Buyer B) | B2B | Weaving | trader | **REUSE existing** |
| 7 | `QA_BUYER_C` | `qa-buyer-c` | QA Buyer C (Public Browse Only) | B2B | Knitting | trader | **NEW** |
| 8 | `QA_SVC_TST_A` | `qa-svc-tst-a` | QA Testing Lab A | B2B | null | service_provider | **NEW** |
| 9 | `QA_SVC_LOG_B` | `qa-svc-log-b` | QA Logistics Provider B | B2B | null | service_provider | **NEW** |
| 10 | `QA_AGG_A` | `qa-agg` | QA Aggregator | AGGREGATOR | null | null | **REUSE existing** |

**Net-new tenants to seed:** 6 (rows 2–4, 5, 7, 8–9)  
**Reused tenants (UPDATE only if fields diverge):** 3 (rows 1, 6, 10)

### 2.2 Tenant Detail Specifications

#### QA_KNT_B — Knitting Supplier B

| Field | Value |
|---|---|
| `tenants.id` | `gen_random_uuid()` — assigned at seed time, captured as `$QA_KNT_B_ID` |
| `tenants.slug` | `qa-knt-b` |
| `tenants.name` | `QA Knitting Supplier B` |
| `tenants.type` | `B2B` |
| `tenants.status` | `ACTIVE` |
| `tenants.plan` | `PROFESSIONAL` |
| `tenants.is_white_label` | `false` |
| `tenants.public_eligibility_posture` | `PUBLICATION_ELIGIBLE` |
| `organizations.legal_name` | `QA Knitting Supplier B Pvt Ltd` |
| `organizations.jurisdiction` | `IN` |
| `organizations.org_type` | `B2B` |
| `organizations.status` | `ACTIVE` |
| `organizations.plan` | `PROFESSIONAL` |
| `organizations.primary_segment_key` | `Knitting` |
| `organizations.publication_posture` | `B2B_PUBLIC` |
| User email | `qa.supplier.knt.b@texqtic.com` |
| Membership role | `OWNER` |
| Role position | `manufacturer` |

#### QA_DYE_C — Dyeing Supplier C

| Field | Value |
|---|---|
| `tenants.slug` | `qa-dye-c` |
| `tenants.name` | `QA Dyeing Supplier C` |
| `tenants.type` | `B2B` |
| `tenants.plan` | `PROFESSIONAL` |
| `tenants.public_eligibility_posture` | `PUBLICATION_ELIGIBLE` |
| `organizations.legal_name` | `QA Dyeing Supplier C Pvt Ltd` |
| `organizations.jurisdiction` | `IN` |
| `organizations.primary_segment_key` | `Fabric Processing` |
| `organizations.publication_posture` | `B2B_PUBLIC` |
| User email | `qa.supplier.dye.c@texqtic.com` |
| Membership role | `OWNER` |
| Role position | `manufacturer` |

#### QA_GMT_D — Garment Supplier D

| Field | Value |
|---|---|
| `tenants.slug` | `qa-gmt-d` |
| `tenants.name` | `QA Garment Supplier D` |
| `tenants.type` | `B2B` |
| `tenants.plan` | `PROFESSIONAL` |
| `tenants.public_eligibility_posture` | `PUBLICATION_ELIGIBLE` |
| `organizations.legal_name` | `QA Garment Supplier D Pvt Ltd` |
| `organizations.jurisdiction` | `IN` |
| `organizations.primary_segment_key` | `Garment` |
| `organizations.publication_posture` | `B2B_PUBLIC` |
| User email | `qa.supplier.gmt.d@texqtic.com` |
| Membership role | `OWNER` |
| Role position | `manufacturer` |

#### QA_BUYER_A — Buyer A

| Field | Value |
|---|---|
| `tenants.slug` | `qa-buyer-a` |
| `tenants.name` | `QA Buyer A` |
| `tenants.type` | `B2B` |
| `tenants.plan` | `PROFESSIONAL` |
| `tenants.public_eligibility_posture` | `NO_PUBLIC_PRESENCE` |
| `organizations.legal_name` | `QA Buyer A Trading Co` |
| `organizations.jurisdiction` | `IN` |
| `organizations.primary_segment_key` | `Weaving` |
| `organizations.publication_posture` | `PRIVATE_OR_AUTH_ONLY` |
| User email | `qa.buyer.wvg.a@texqtic.com` |
| Membership role | `OWNER` |
| Role position | `trader` |

#### QA_BUYER_C — Buyer C (public browse only, no relationship)

| Field | Value |
|---|---|
| `tenants.slug` | `qa-buyer-c` |
| `tenants.name` | `QA Buyer C` |
| `tenants.type` | `B2B` |
| `tenants.plan` | `PROFESSIONAL` |
| `tenants.public_eligibility_posture` | `NO_PUBLIC_PRESENCE` |
| `organizations.legal_name` | `QA Buyer C Trading Co` |
| `organizations.jurisdiction` | `IN` |
| `organizations.primary_segment_key` | `Knitting` |
| `organizations.publication_posture` | `PRIVATE_OR_AUTH_ONLY` |
| User email | `qa.buyer.knt.c@texqtic.com` |
| Membership role | `OWNER` |
| Role position | `trader` |

#### QA_SVC_TST_A — Testing Lab A

| Field | Value |
|---|---|
| `tenants.slug` | `qa-svc-tst-a` |
| `tenants.name` | `QA Testing Lab A` |
| `tenants.type` | `B2B` |
| `tenants.plan` | `STARTER` |
| `tenants.public_eligibility_posture` | `NO_PUBLIC_PRESENCE` |
| `organizations.legal_name` | `QA Testing Lab A Ltd` |
| `organizations.jurisdiction` | `IN` |
| `organizations.primary_segment_key` | `null` |
| `organizations.publication_posture` | `PRIVATE_OR_AUTH_ONLY` |
| User email | `qa.svc.tst.a@texqtic.com` |
| Membership role | `OWNER` |
| Role position | `service_provider` |

#### QA_SVC_LOG_B — Logistics Provider B

| Field | Value |
|---|---|
| `tenants.slug` | `qa-svc-log-b` |
| `tenants.name` | `QA Logistics Provider B` |
| `tenants.type` | `B2B` |
| `tenants.plan` | `STARTER` |
| `tenants.public_eligibility_posture` | `NO_PUBLIC_PRESENCE` |
| `organizations.legal_name` | `QA Logistics Provider B Ltd` |
| `organizations.jurisdiction` | `IN` |
| `organizations.primary_segment_key` | `null` |
| `organizations.publication_posture` | `PRIVATE_OR_AUTH_ONLY` |
| User email | `qa.svc.log.b@texqtic.com` |
| Membership role | `OWNER` |
| Role position | `service_provider` |

---

## Section 3 — Existing Tenant Reuse Decision

**Decision: OPTION 1 — REUSE existing production QA tenants**

| Tenant | Slug | ID (production) | Action |
|---|---|---|---|
| QA_WVG_A | `qa-b2b` | `faf2e4a7-5d79-4b00-811b-8d0dce4f4d80` | Verify staging parity; patch `publication_posture` items as specified |
| QA_BUYER_B | `qa-buyer` | (from production `qa-buyer` row) | Verify staging parity; confirm OWNER membership exists |
| QA_AGG_A | `qa-agg` | (from production `qa-agg` row) | Verify staging parity |

**Rationale:**
- Production QA tenants carry canonical slugs referenced in existing QA scripts and verification docs.  
- Re-creating them with new UUIDs would orphan those references and invalidate commit `eb5dcba` evidence.  
- If the staging DB was cloned from production, these rows will exist. If it is a fresh DB, they must be
  seeded using the existing `seed.ts` patterns.

**Pre-seed verification query (SELECT only — no mutation):**

```sql
SELECT slug, id, status, type
FROM tenants
WHERE slug IN ('qa-b2b', 'qa-buyer', 'qa-agg')
ORDER BY slug;
```

Expected: 3 rows returned. If fewer, seed the missing ones using the seed.ts `QA_B2B_SPEC`,
`QA_BUYER_SPEC`, `QA_AGG_SPEC` definitions before proceeding.

---

## Section 4 — Catalogue Seed Plan

### 4.1 QA_WVG_A (qa-b2b) Catalogue: Existing 14 Items

The existing 14 catalog items (`QA-B2B-FAB-001` through `QA-B2B-FAB-014`) are all seeded with:
- `publication_posture = 'PRIVATE_OR_AUTH_ONLY'`  
- `price_disclosure_policy_mode = NULL`

**This slice requires patching 6 of those items** to create the required posture/price-disclosure
coverage matrix. The remaining 8 items retain `PRIVATE_OR_AUTH_ONLY / NULL`.

#### Patch targets for QA_WVG_A:

| SKU | Target `publication_posture` | Target `price_disclosure_policy_mode` | Rationale |
|---|---|---|---|
| `QA-B2B-FAB-001` | `PRIVATE_OR_AUTH_ONLY` | `NULL` (default) | Baseline authenticated-only, price visible |
| `QA-B2B-FAB-002` | `B2B_PUBLIC` | `NULL` | Public discoverable, price visible |
| `QA-B2B-FAB-003` | `B2B_PUBLIC` | `RELATIONSHIP_ONLY` | Public discoverable, price hidden until approved |
| `QA-B2B-FAB-004` | `APPROVED_BUYER_ONLY` | `NULL` | Approved buyers only, price visible |
| `QA-B2B-FAB-005` | `APPROVED_BUYER_ONLY` | `RELATIONSHIP_ONLY` | Approved buyers only, price gated |
| `QA-B2B-FAB-006` | `HIDDEN` | `NULL` | Hidden (supplier-internal only) |
| `QA-B2B-FAB-007` through `QA-B2B-FAB-014` | `PRIVATE_OR_AUTH_ONLY` | `NULL` | No change from existing |

### 4.2 QA_KNT_B Catalogue (net-new, 10 items)

SKU convention: `QA-KNT-B-{TYPE}-{SEQ:03}`

| SKU | Name | `publication_posture` | `price_disclosure_policy_mode` | Price | MOQ |
|---|---|---|---|---|---|
| `QA-KNT-B-FAB-001` | QA Knit Single Jersey | `B2B_PUBLIC` | `NULL` | 14.50 | 100 |
| `QA-KNT-B-FAB-002` | QA Knit Rib 1x1 | `B2B_PUBLIC` | `RELATIONSHIP_ONLY` | 16.00 | 80 |
| `QA-KNT-B-FAB-003` | QA Knit French Terry | `PRIVATE_OR_AUTH_ONLY` | `NULL` | 22.00 | 75 |
| `QA-KNT-B-FAB-004` | QA Knit Interlock | `PRIVATE_OR_AUTH_ONLY` | `RELATIONSHIP_ONLY` | 18.00 | 90 |
| `QA-KNT-B-FAB-005` | QA Knit Fleece Brushed | `APPROVED_BUYER_ONLY` | `NULL` | 25.00 | 60 |
| `QA-KNT-B-FAB-006` | QA Knit Pique Polo | `APPROVED_BUYER_ONLY` | `RELATIONSHIP_ONLY` | 20.00 | 100 |
| `QA-KNT-B-FAB-007` | QA Knit Velour | `HIDDEN` | `NULL` | 30.00 | 50 |
| `QA-KNT-B-FAB-008` | QA Knit Thermal | `B2B_PUBLIC` | `NULL` | 19.00 | 80 |
| `QA-KNT-B-FAB-009` | QA Knit Waffle | `PRIVATE_OR_AUTH_ONLY` | `NULL` | 17.00 | 100 |
| `QA-KNT-B-FAB-010` | QA Knit Ponte Roma | `B2B_PUBLIC` | `RELATIONSHIP_ONLY` | 23.00 | 75 |

### 4.3 QA_DYE_C Catalogue (net-new, 10 items)

SKU convention: `QA-DYE-C-FAB-{SEQ:03}`

| SKU | Name | `publication_posture` | `price_disclosure_policy_mode` | Price | MOQ |
|---|---|---|---|---|---|
| `QA-DYE-C-FAB-001` | QA Reactive Dyed Plain | `B2B_PUBLIC` | `NULL` | 12.00 | 150 |
| `QA-DYE-C-FAB-002` | QA Pigment Dyed Canvas | `B2B_PUBLIC` | `RELATIONSHIP_ONLY` | 15.00 | 100 |
| `QA-DYE-C-FAB-003` | QA Acid Dyed Silk | `APPROVED_BUYER_ONLY` | `NULL` | 45.00 | 30 |
| `QA-DYE-C-FAB-004` | QA Vat Dyed Denim | `PRIVATE_OR_AUTH_ONLY` | `NULL` | 20.00 | 100 |
| `QA-DYE-C-FAB-005` | QA Discharge Printed Voile | `PRIVATE_OR_AUTH_ONLY` | `RELATIONSHIP_ONLY` | 18.00 | 80 |
| `QA-DYE-C-FAB-006` | QA Digital Printed Jersey | `B2B_PUBLIC` | `NULL` | 22.00 | 75 |
| `QA-DYE-C-FAB-007` | QA Space Dyed Yarn Knit | `APPROVED_BUYER_ONLY` | `RELATIONSHIP_ONLY` | 28.00 | 50 |
| `QA-DYE-C-FAB-008` | QA Enzyme Washed Twill | `HIDDEN` | `NULL` | 24.00 | 80 |
| `QA-DYE-C-FAB-009` | QA Burnout Velvet | `B2B_PUBLIC` | `NULL` | 38.00 | 40 |
| `QA-DYE-C-FAB-010` | QA Cold Pad Batch Cotton | `PRIVATE_OR_AUTH_ONLY` | `NULL` | 16.00 | 120 |

### 4.4 QA_GMT_D Catalogue (net-new, 10 items)

SKU convention: `QA-GMT-D-FAB-{SEQ:03}`

| SKU | Name | `publication_posture` | `price_disclosure_policy_mode` | Price | MOQ |
|---|---|---|---|---|---|
| `QA-GMT-D-FAB-001` | QA Cut Shirt CMT | `B2B_PUBLIC` | `NULL` | 8.50 | 200 |
| `QA-GMT-D-FAB-002` | QA Woven Trouser CMT | `B2B_PUBLIC` | `RELATIONSHIP_ONLY` | 12.00 | 150 |
| `QA-GMT-D-FAB-003` | QA Jersey T-Shirt CMT | `PRIVATE_OR_AUTH_ONLY` | `NULL` | 6.00 | 300 |
| `QA-GMT-D-FAB-004` | QA Jacket Shell CMT | `APPROVED_BUYER_ONLY` | `NULL` | 22.00 | 80 |
| `QA-GMT-D-FAB-005` | QA Dress Knit CMT | `APPROVED_BUYER_ONLY` | `RELATIONSHIP_ONLY` | 14.00 | 120 |
| `QA-GMT-D-FAB-006` | QA Polo Shirt CMT | `B2B_PUBLIC` | `NULL` | 9.00 | 200 |
| `QA-GMT-D-FAB-007` | QA Denim Jean CMT | `PRIVATE_OR_AUTH_ONLY` | `RELATIONSHIP_ONLY` | 16.00 | 100 |
| `QA-GMT-D-FAB-008` | QA Active Short CMT | `HIDDEN` | `NULL` | 7.50 | 250 |
| `QA-GMT-D-FAB-009` | QA Blazer Woven CMT | `B2B_PUBLIC` | `NULL` | 28.00 | 60 |
| `QA-GMT-D-FAB-010` | QA Knitwear Cardigan CMT | `APPROVED_BUYER_ONLY` | `NULL` | 18.00 | 100 |

### 4.5 Catalogue Coverage Summary

After seeding, the combined catalogue must satisfy:

| `publication_posture` | Min count (cross all suppliers) |
|---|---|
| `B2B_PUBLIC` | ≥ 10 items |
| `PRIVATE_OR_AUTH_ONLY` | ≥ 10 items |
| `APPROVED_BUYER_ONLY` | ≥ 6 items |
| `HIDDEN` | ≥ 3 items |

| `price_disclosure_policy_mode` | Min count |
|---|---|
| `NULL` (price visible) | ≥ 20 items |
| `RELATIONSHIP_ONLY` | ≥ 8 items |

---

## Section 5 — Relationship Seed Plan

### 5.1 Uniqueness Constraint

`buyer_supplier_relationships` has a UNIQUE constraint on `(supplier_org_id, buyer_org_id)`.  
**One row per supplier-buyer pair.** Separate buyer orgs must be used for each distinct state.

### 5.2 Nine-Tuple Relationship Matrix

`supplier_org_id` and `buyer_org_id` reference `organizations.id`.  
Assign `$ORG_ID_<KEY>` at seed execution time from the `organizations.id` of each tenant.

| # | Supplier | Buyer | `state` | Row exists? | Notes |
|---|---|---|---|---|---|
| T-01 | `QA_WVG_A` | `QA_BUYER_A` | `APPROVED` | Yes | Approved relationship — full catalog access |
| T-02 | `QA_WVG_A` | `QA_BUYER_B` | `REQUESTED` | Yes | Pending approval — PRIVATE_OR_AUTH_ONLY access only |
| T-03 | `QA_WVG_A` | `QA_BUYER_C` | NONE | No row | No relationship — public items only |
| T-04 | `QA_KNT_B` | `QA_BUYER_A` | `APPROVED` | Yes | Second APPROVED pair (cross-supplier) |
| T-05 | `QA_KNT_B` | `QA_BUYER_B` | `REJECTED` | Yes | Rejected access — same as NONE for visibility |
| T-06 | `QA_DYE_C` | `QA_BUYER_A` | `BLOCKED` | Yes | Blocked — access denied |
| T-07 | `QA_DYE_C` | `QA_BUYER_B` | `SUSPENDED` | Yes | Suspended — temporary access denial |
| T-08 | `QA_GMT_D` | `QA_BUYER_A` | `EXPIRED` | Yes | Expired — access no longer valid |
| T-09 | `QA_GMT_D` | `QA_BUYER_B` | `REVOKED` | Yes | Revoked — permanent access removal |

### 5.3 Timestamp Conventions for Non-APPROVED States

| `state` | `requested_at` | `approved_at` | `decided_at` | `suspended_at` | `revoked_at` | `expires_at` |
|---|---|---|---|---|---|---|
| `APPROVED` | `NOW()-30d` | `NOW()-28d` | `NOW()-28d` | NULL | NULL | NULL |
| `REQUESTED` | `NOW()-3d` | NULL | NULL | NULL | NULL | NULL |
| `REJECTED` | `NOW()-10d` | NULL | `NOW()-8d` | NULL | NULL | NULL |
| `BLOCKED` | `NOW()-20d` | `NOW()-18d` | `NOW()-15d` | NULL | NULL | NULL |
| `SUSPENDED` | `NOW()-25d` | `NOW()-22d` | `NOW()-14d` | `NOW()-14d` | NULL | NULL |
| `EXPIRED` | `NOW()-60d` | `NOW()-58d` | `NOW()-58d` | NULL | NULL | `NOW()-5d` |
| `REVOKED` | `NOW()-45d` | `NOW()-43d` | `NOW()-10d` | NULL | `NOW()-10d` | NULL |

---

## Section 6 — Price Disclosure Coverage Plan

The following 8 price-disclosure states must be exercisable during QA runtime:

| State | `publication_posture` | `price_disclosure_policy_mode` | Visible to | Expected behaviour |
|---|---|---|---|---|
| PD-01 | `B2B_PUBLIC` | `NULL` | Any authenticated user | Price shown freely |
| PD-02 | `B2B_PUBLIC` | `RELATIONSHIP_ONLY` | Any authenticated user | Price hidden; shown only to APPROVED buyers |
| PD-03 | `PRIVATE_OR_AUTH_ONLY` | `NULL` | Authenticated users only | Price shown to authenticated users |
| PD-04 | `PRIVATE_OR_AUTH_ONLY` | `RELATIONSHIP_ONLY` | Authenticated users only | Price hidden; shown only to APPROVED buyers |
| PD-05 | `APPROVED_BUYER_ONLY` | `NULL` | APPROVED buyers only | Item + price visible only to approved buyer |
| PD-06 | `APPROVED_BUYER_ONLY` | `RELATIONSHIP_ONLY` | APPROVED buyers only | Item visible; price additionally gated |
| PD-07 | `HIDDEN` | `NULL` | No buyer | Item not visible to any buyer session |
| PD-08 | `HIDDEN` | `RELATIONSHIP_ONLY` | No buyer | Not reachable (HIDDEN wins) |

Coverage mapping to catalogue items:

| State | Supplier | SKU |
|---|---|---|
| PD-01 | QA_WVG_A | `QA-B2B-FAB-002` |
| PD-02 | QA_WVG_A | `QA-B2B-FAB-003` |
| PD-03 | QA_WVG_A | `QA-B2B-FAB-001` |
| PD-04 | QA_KNT_B | `QA-KNT-B-FAB-004` |
| PD-05 | QA_WVG_A | `QA-B2B-FAB-004` |
| PD-06 | QA_WVG_A | `QA-B2B-FAB-005` |
| PD-07 | QA_WVG_A | `QA-B2B-FAB-006` |
| PD-08 | _(no representative item needed — HIDDEN wins before price)_ | N/A |

---

## Section 7 — RFQ Seed / Runtime Plan

### 7.1 Seeding decision: NO pre-created RFQ rows

RFQ rows (`rfqs` table) are **NOT pre-created** in the staging seed.  
All 14 RFQ scenarios are **runtime-only**: a Playwright test actor submits the RFQ via the API  
and the test validates the HTTP response + resulting DB state.

**Rationale:** Pre-created RFQ rows require `created_by_user_id` + `catalogItemId` FKs that may not
be stable across environments. Runtime creation is simpler and tests the full submission path.

### 7.2 RFQ Model Reference

`rfqs` table key fields:

| Column | Type | Notes |
|---|---|---|
| `org_id` | UUID | Buyer's `tenants.id` |
| `supplier_org_id` | UUID | Supplier's `tenants.id` |
| `catalog_item_id` | UUID | Must be active item owned by supplier |
| `quantity` | INT | ≥ 1 |
| `status` | `rfq_status` enum | `INITIATED \| OPEN \| RESPONDED \| CLOSED` |
| `created_by_user_id` | UUID nullable | Buyer user who submitted |

### 7.3 Fourteen RFQ Scenario Matrix

| # | Buyer | Supplier | Item posture | Relationship state | Expected submission outcome |
|---|---|---|---|---|---|
| RFQ-01 | QA_BUYER_A | QA_WVG_A | `B2B_PUBLIC` | APPROVED | 201 Created — OPEN |
| RFQ-02 | QA_BUYER_A | QA_WVG_A | `APPROVED_BUYER_ONLY` | APPROVED | 201 Created — OPEN |
| RFQ-03 | QA_BUYER_A | QA_WVG_A | `PRIVATE_OR_AUTH_ONLY` | APPROVED | 201 Created — OPEN |
| RFQ-04 | QA_BUYER_B | QA_WVG_A | `B2B_PUBLIC` | REQUESTED | 201 Created — OPEN (public item, RFQ open to all) |
| RFQ-05 | QA_BUYER_B | QA_WVG_A | `APPROVED_BUYER_ONLY` | REQUESTED | 403 Forbidden (item requires APPROVED) |
| RFQ-06 | QA_BUYER_C | QA_WVG_A | `B2B_PUBLIC` | NONE | 201 Created — OPEN (public item) |
| RFQ-07 | QA_BUYER_C | QA_WVG_A | `APPROVED_BUYER_ONLY` | NONE | 403 Forbidden (item requires APPROVED, no relationship) |
| RFQ-08 | QA_BUYER_C | QA_WVG_A | `HIDDEN` | NONE | 404 Not Found (item not visible) |
| RFQ-09 | QA_BUYER_A | QA_KNT_B | `APPROVED_BUYER_ONLY` | APPROVED | 201 Created — OPEN |
| RFQ-10 | QA_BUYER_B | QA_KNT_B | `B2B_PUBLIC` | REJECTED | 201 Created — OPEN (public item; REJECTED = no special access) |
| RFQ-11 | QA_BUYER_A | QA_DYE_C | `B2B_PUBLIC` | BLOCKED | 403 Forbidden (BLOCKED overrides public access) |
| RFQ-12 | QA_BUYER_B | QA_DYE_C | `B2B_PUBLIC` | SUSPENDED | 403 Forbidden (SUSPENDED = access denied) |
| RFQ-13 | QA_BUYER_A | QA_GMT_D | `APPROVED_BUYER_ONLY` | EXPIRED | 403 Forbidden (EXPIRED = access lost) |
| RFQ-14 | QA_BUYER_B | QA_GMT_D | `B2B_PUBLIC` | REVOKED | 403 Forbidden (REVOKED = permanent denial) |

> **Note on RFQ-11, RFQ-12, RFQ-13, RFQ-14:** The expected HTTP codes assume the service layer
> enforces relationship state checks even for `B2B_PUBLIC` / `APPROVED_BUYER_ONLY` items when the
> buyer has a terminal-denial state (BLOCKED, SUSPENDED, EXPIRED, REVOKED).
> The exact enforcement behaviour must be verified against  
> `server/src/services/relationshipAccess.types.ts` before Slice C execution.
> If enforcement is not currently implemented, these scenarios become **BLOCKED** in Slice C.

---

## Section 8 — Service-Provider Tenant Plan

### 8.1 Purpose

`QA_SVC_TST_A` (testing lab) and `QA_SVC_LOG_B` (logistics provider) are seeded to exercise:
- Service-provider role position (`role_position_key = 'service_provider'`)  
- Non-supplier, non-buyer tenant sessions  
- Future DPP certification and traceability node attachment (Slice E)

### 8.2 No catalogue items for service providers in this slice

Service-provider tenants do **not** have `catalog_items` in the MVP seed.  
They are purely identity entities used as `orgId` references in certification and DPP fixtures (Slice E).

### 8.3 Memberships

Each service-provider tenant has one user with `OWNER` role.

---

## Section 9 — DPP / Compliance Fixture Plan

### 9.1 Scope in this slice: PLAN ONLY — no rows created

DPP and compliance fixtures (`traceability_nodes`, `traceability_edges`, `certifications`,
`node_certifications`, `document_extraction_drafts`, `dpp_evidence_claims`) are  
**OUT OF SCOPE for Slice B seeding.**

These will be planned in Slice E (DPP/AI fixture execution).

### 9.2 DPP domain model reference (for planning)

| Table | Key columns | Role in DPP |
|---|---|---|
| `traceability_nodes` | `org_id`, `batch_id`, `node_type`, `meta`, `visibility` | One per supply-chain batch |
| `traceability_edges` | `org_id`, `from_node_id`, `to_node_id`, `edge_type` | Directed graph edges between batches |
| `certifications` | `org_id`, `certification_type`, `lifecycle_state_id` | Cert records (GOTS, OEKO_TEX, …) |
| `node_certifications` | `org_id`, `node_id`, `certification_id` | Links nodes to certs |
| `document_extraction_drafts` | `org_id`, `document_id`, `extracted_fields`, `status`, `human_review_required` | AI extraction results — always require human review |
| `dpp_evidence_claims` | `org_id`, `node_id`, `extraction_id`, `claim_type`, `claim_value`, `approved_by` | Human-approved AI claims on a traceability node |

### 9.3 Slice E prerequisites

Before DPP seeding is authorised, the following must exist from this slice:
- QA_WVG_A, QA_KNT_B, QA_DYE_C `organizations` rows (for `org_id` FK)
- QA_SVC_TST_A `organizations` row (certification creator)
- At least one `lifecycle_state` row for entity_type='CERTIFICATION' (must exist from governance migrations)

---

## Section 10 — AI Matching Fixture Plan

### 10.1 Scope in this slice: PLAN ONLY — no embeddings generated

`document_embeddings` rows (pgvector 768-dim) are **NOT generated in Slice B.**  
AI embedding generation requires the embedding service to be running against staging, which is
a Slice F concern.

### 10.2 DocumentEmbedding model reference

| Column | Type | Notes |
|---|---|---|
| `org_id` | UUID | FK to organizations |
| `source_type` | VARCHAR | `'CATALOG_ITEM'` for item embeddings |
| `source_id` | UUID | `catalog_items.id` |
| `chunk_index` | INT | 0-indexed; typically 0 for single-chunk items |
| `content` | TEXT | Chunk text used for embedding |
| `content_hash` | VARCHAR | SHA-256 of content — unique key for idempotent upsert |
| `embedding` | `vector` | 768-dim — Prisma `Unsupported("vector")`, requires `$queryRaw` |
| `metadata` | JSON | `{ source_version, language, model, indexed_at }` |

### 10.3 Slice F prerequisites

- All catalog items seeded (this slice)  
- All `organizations` rows seeded (this slice)  
- Embedding service endpoint confirmed in staging  
- `pgvector` extension confirmed installed on staging Supabase instance

---

## Section 11 — SQL Seed Plan (Pseudo-SQL, Advisory Only)

> **CRITICAL:** The SQL below is pseudo-code for human review.  
> It MUST NOT be executed by Copilot.  
> All UUIDs shown as `gen_random_uuid()` calls are illustrative.  
> All `<QA_BCRYPT_HASH>` placeholders must be replaced with the actual bcrypt(10) hash of
> `Password123!` computed at seed time — **never printed in logs**.

### 11.1 Variable declarations (execution-time)

```sql
-- Computed at seed execution time, not stored here.
-- $QA_B2B_ID      := (SELECT id FROM tenants WHERE slug = 'qa-b2b')
-- $QA_BUYER_ID    := (SELECT id FROM tenants WHERE slug = 'qa-buyer')
-- $QA_AGG_ID      := (SELECT id FROM tenants WHERE slug = 'qa-agg')
-- $QA_KNT_B_ID    := gen_random_uuid()  [for new tenant]
-- $QA_DYE_C_ID    := gen_random_uuid()
-- $QA_GMT_D_ID    := gen_random_uuid()
-- $QA_BUYER_A_ID  := gen_random_uuid()
-- $QA_BUYER_C_ID  := gen_random_uuid()
-- $QA_SVC_TST_ID  := gen_random_uuid()
-- $QA_SVC_LOG_ID  := gen_random_uuid()
```

### 11.2 Block 1: New Tenants (idempotent)

```sql
BEGIN;

-- QA_KNT_B
INSERT INTO tenants (id, slug, name, type, status, plan, is_white_label, public_eligibility_posture, created_at, updated_at)
VALUES (
    $QA_KNT_B_ID, 'qa-knt-b', 'QA Knitting Supplier B',
    'B2B', 'ACTIVE', 'PROFESSIONAL', false, 'PUBLICATION_ELIGIBLE',
    NOW(), NOW()
)
ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name,
        status = EXCLUDED.status,
        plan = EXCLUDED.plan,
        public_eligibility_posture = EXCLUDED.public_eligibility_posture,
        updated_at = NOW();

-- QA_DYE_C
INSERT INTO tenants (id, slug, name, type, status, plan, is_white_label, public_eligibility_posture, created_at, updated_at)
VALUES (
    $QA_DYE_C_ID, 'qa-dye-c', 'QA Dyeing Supplier C',
    'B2B', 'ACTIVE', 'PROFESSIONAL', false, 'PUBLICATION_ELIGIBLE',
    NOW(), NOW()
)
ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name, status = EXCLUDED.status,
        plan = EXCLUDED.plan, public_eligibility_posture = EXCLUDED.public_eligibility_posture,
        updated_at = NOW();

-- QA_GMT_D
INSERT INTO tenants (id, slug, name, type, status, plan, is_white_label, public_eligibility_posture, created_at, updated_at)
VALUES (
    $QA_GMT_D_ID, 'qa-gmt-d', 'QA Garment Supplier D',
    'B2B', 'ACTIVE', 'PROFESSIONAL', false, 'PUBLICATION_ELIGIBLE',
    NOW(), NOW()
)
ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name, status = EXCLUDED.status,
        plan = EXCLUDED.plan, public_eligibility_posture = EXCLUDED.public_eligibility_posture,
        updated_at = NOW();

-- QA_BUYER_A
INSERT INTO tenants (id, slug, name, type, status, plan, is_white_label, public_eligibility_posture, created_at, updated_at)
VALUES (
    $QA_BUYER_A_ID, 'qa-buyer-a', 'QA Buyer A',
    'B2B', 'ACTIVE', 'PROFESSIONAL', false, 'NO_PUBLIC_PRESENCE',
    NOW(), NOW()
)
ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name, status = EXCLUDED.status,
        plan = EXCLUDED.plan, updated_at = NOW();

-- QA_BUYER_C
INSERT INTO tenants (id, slug, name, type, status, plan, is_white_label, public_eligibility_posture, created_at, updated_at)
VALUES (
    $QA_BUYER_C_ID, 'qa-buyer-c', 'QA Buyer C',
    'B2B', 'ACTIVE', 'PROFESSIONAL', false, 'NO_PUBLIC_PRESENCE',
    NOW(), NOW()
)
ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name, status = EXCLUDED.status,
        plan = EXCLUDED.plan, updated_at = NOW();

-- QA_SVC_TST_A
INSERT INTO tenants (id, slug, name, type, status, plan, is_white_label, public_eligibility_posture, created_at, updated_at)
VALUES (
    $QA_SVC_TST_ID, 'qa-svc-tst-a', 'QA Testing Lab A',
    'B2B', 'ACTIVE', 'STARTER', false, 'NO_PUBLIC_PRESENCE',
    NOW(), NOW()
)
ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name, status = EXCLUDED.status, updated_at = NOW();

-- QA_SVC_LOG_B
INSERT INTO tenants (id, slug, name, type, status, plan, is_white_label, public_eligibility_posture, created_at, updated_at)
VALUES (
    $QA_SVC_LOG_ID, 'qa-svc-log-b', 'QA Logistics Provider B',
    'B2B', 'ACTIVE', 'STARTER', false, 'NO_PUBLIC_PRESENCE',
    NOW(), NOW()
)
ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name, status = EXCLUDED.status, updated_at = NOW();

COMMIT;
```

> **ON CONFLICT target:** `tenants.slug` is UNIQUE — safe upsert key.

### 11.3 Block 2: Organizations (idempotent, same IDs as tenants)

```sql
BEGIN;

-- Re-read tenant IDs from DB after Block 1 commit:
-- $QA_KNT_B_ID := (SELECT id FROM tenants WHERE slug = 'qa-knt-b')
-- etc.

INSERT INTO organizations (
    id, slug, legal_name, jurisdiction, org_type, status, plan,
    is_white_label, primary_segment_key, publication_posture,
    price_disclosure_policy_mode, effective_at, created_at, updated_at
)
VALUES
    -- QA_KNT_B
    ($QA_KNT_B_ID, 'qa-knt-b', 'QA Knitting Supplier B Pvt Ltd', 'IN',
     'B2B', 'ACTIVE', 'PROFESSIONAL', false, 'Knitting', 'B2B_PUBLIC', NULL, NOW(), NOW(), NOW()),
    -- QA_DYE_C
    ($QA_DYE_C_ID, 'qa-dye-c', 'QA Dyeing Supplier C Pvt Ltd', 'IN',
     'B2B', 'ACTIVE', 'PROFESSIONAL', false, 'Fabric Processing', 'B2B_PUBLIC', NULL, NOW(), NOW(), NOW()),
    -- QA_GMT_D
    ($QA_GMT_D_ID, 'qa-gmt-d', 'QA Garment Supplier D Pvt Ltd', 'IN',
     'B2B', 'ACTIVE', 'PROFESSIONAL', false, 'Garment', 'B2B_PUBLIC', NULL, NOW(), NOW(), NOW()),
    -- QA_BUYER_A
    ($QA_BUYER_A_ID, 'qa-buyer-a', 'QA Buyer A Trading Co', 'IN',
     'B2B', 'ACTIVE', 'PROFESSIONAL', false, 'Weaving', 'PRIVATE_OR_AUTH_ONLY', NULL, NOW(), NOW(), NOW()),
    -- QA_BUYER_C
    ($QA_BUYER_C_ID, 'qa-buyer-c', 'QA Buyer C Trading Co', 'IN',
     'B2B', 'ACTIVE', 'PROFESSIONAL', false, 'Knitting', 'PRIVATE_OR_AUTH_ONLY', NULL, NOW(), NOW(), NOW()),
    -- QA_SVC_TST_A
    ($QA_SVC_TST_ID, 'qa-svc-tst-a', 'QA Testing Lab A Ltd', 'IN',
     'B2B', 'ACTIVE', 'STARTER', false, NULL, 'PRIVATE_OR_AUTH_ONLY', NULL, NOW(), NOW(), NOW()),
    -- QA_SVC_LOG_B
    ($QA_SVC_LOG_ID, 'qa-svc-log-b', 'QA Logistics Provider B Ltd', 'IN',
     'B2B', 'ACTIVE', 'STARTER', false, NULL, 'PRIVATE_OR_AUTH_ONLY', NULL, NOW(), NOW(), NOW())
ON CONFLICT (id) DO UPDATE
    SET legal_name = EXCLUDED.legal_name,
        jurisdiction = EXCLUDED.jurisdiction,
        status = EXCLUDED.status,
        plan = EXCLUDED.plan,
        primary_segment_key = EXCLUDED.primary_segment_key,
        publication_posture = EXCLUDED.publication_posture,
        updated_at = NOW();

COMMIT;
```

> **ON CONFLICT target:** `organizations.id` (PK) — shared with tenants.id.

### 11.4 Block 3: Organization Role Positions

```sql
BEGIN;

INSERT INTO organization_role_positions (org_id, role_position_key, created_at)
VALUES
    ($QA_KNT_B_ID, 'manufacturer', NOW()),
    ($QA_DYE_C_ID, 'manufacturer', NOW()),
    ($QA_GMT_D_ID, 'manufacturer', NOW()),
    ($QA_BUYER_A_ID, 'trader', NOW()),
    ($QA_BUYER_C_ID, 'trader', NOW()),
    ($QA_SVC_TST_ID, 'service_provider', NOW()),
    ($QA_SVC_LOG_ID, 'service_provider', NOW())
ON CONFLICT (org_id, role_position_key) DO NOTHING;

COMMIT;
```

### 11.5 Block 4: Organization Secondary Segments

```sql
BEGIN;

-- QA_KNT_B has no secondary segments in MVP
-- Add secondary segments here if needed; ON CONFLICT DO NOTHING for idempotency

-- QA_WVG_A secondary segment: 'Fabric Processing' (from existing seed.ts QA_B2B_SPEC)
-- These should already exist if seed.ts ran. Verify before inserting:
-- SELECT * FROM organization_secondary_segments WHERE org_id = $QA_B2B_ID;

COMMIT;
```

### 11.6 Block 5: Users (idempotent)

```sql
BEGIN;

INSERT INTO users (id, email, password_hash, email_verified, created_at, updated_at)
VALUES
    (gen_random_uuid(), 'qa.supplier.knt.b@texqtic.com', '<QA_BCRYPT_HASH>', true, NOW(), NOW()),
    (gen_random_uuid(), 'qa.supplier.dye.c@texqtic.com', '<QA_BCRYPT_HASH>', true, NOW(), NOW()),
    (gen_random_uuid(), 'qa.supplier.gmt.d@texqtic.com', '<QA_BCRYPT_HASH>', true, NOW(), NOW()),
    (gen_random_uuid(), 'qa.buyer.wvg.a@texqtic.com',    '<QA_BCRYPT_HASH>', true, NOW(), NOW()),
    (gen_random_uuid(), 'qa.buyer.knt.c@texqtic.com',    '<QA_BCRYPT_HASH>', true, NOW(), NOW()),
    (gen_random_uuid(), 'qa.svc.tst.a@texqtic.com',      '<QA_BCRYPT_HASH>', true, NOW(), NOW()),
    (gen_random_uuid(), 'qa.svc.log.b@texqtic.com',      '<QA_BCRYPT_HASH>', true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE
    SET email_verified = true,
        updated_at = NOW();
    -- DO NOT update password_hash on conflict — preserve existing QA credentials

COMMIT;
```

> **Security note:** `<QA_BCRYPT_HASH>` must be computed using `bcrypt.hash('Password123!', 10)`
> at seed execution time. Never committed or logged.

### 11.7 Block 6: Memberships (idempotent)

```sql
BEGIN;

-- $USER_KNT_B_ID := (SELECT id FROM users WHERE email = 'qa.supplier.knt.b@texqtic.com')
-- ... (repeat for all 6 new users)

INSERT INTO memberships (id, user_id, tenant_id, role, created_at, updated_at)
VALUES
    (gen_random_uuid(), $USER_KNT_B_ID,   $QA_KNT_B_ID,   'OWNER', NOW(), NOW()),
    (gen_random_uuid(), $USER_DYE_C_ID,   $QA_DYE_C_ID,   'OWNER', NOW(), NOW()),
    (gen_random_uuid(), $USER_GMT_D_ID,   $QA_GMT_D_ID,   'OWNER', NOW(), NOW()),
    (gen_random_uuid(), $USER_BUYER_A_ID, $QA_BUYER_A_ID, 'OWNER', NOW(), NOW()),
    (gen_random_uuid(), $USER_BUYER_C_ID, $QA_BUYER_C_ID, 'OWNER', NOW(), NOW()),
    (gen_random_uuid(), $USER_SVC_TST_ID, $QA_SVC_TST_ID, 'OWNER', NOW(), NOW()),
    (gen_random_uuid(), $USER_SVC_LOG_ID, $QA_SVC_LOG_ID, 'OWNER', NOW(), NOW())
ON CONFLICT (user_id, tenant_id) DO UPDATE
    SET role = EXCLUDED.role,
        updated_at = NOW();

COMMIT;
```

### 11.8 Block 7: Catalog Items — patch QA_WVG_A existing items

```sql
BEGIN;

UPDATE catalog_items
SET publication_posture = 'B2B_PUBLIC',
    price_disclosure_policy_mode = NULL,
    updated_at = NOW()
WHERE sku = 'QA-B2B-FAB-002'
  AND tenant_id = $QA_B2B_ID;

UPDATE catalog_items
SET publication_posture = 'B2B_PUBLIC',
    price_disclosure_policy_mode = 'RELATIONSHIP_ONLY',
    updated_at = NOW()
WHERE sku = 'QA-B2B-FAB-003'
  AND tenant_id = $QA_B2B_ID;

UPDATE catalog_items
SET publication_posture = 'APPROVED_BUYER_ONLY',
    price_disclosure_policy_mode = NULL,
    updated_at = NOW()
WHERE sku = 'QA-B2B-FAB-004'
  AND tenant_id = $QA_B2B_ID;

UPDATE catalog_items
SET publication_posture = 'APPROVED_BUYER_ONLY',
    price_disclosure_policy_mode = 'RELATIONSHIP_ONLY',
    updated_at = NOW()
WHERE sku = 'QA-B2B-FAB-005'
  AND tenant_id = $QA_B2B_ID;

UPDATE catalog_items
SET publication_posture = 'HIDDEN',
    price_disclosure_policy_mode = NULL,
    updated_at = NOW()
WHERE sku = 'QA-B2B-FAB-006'
  AND tenant_id = $QA_B2B_ID;

COMMIT;
```

### 11.9 Block 8: Catalog Items — QA_KNT_B (new, 10 items)

```sql
BEGIN;

INSERT INTO catalog_items (
    id, tenant_id, name, sku, description, price, active, moq,
    publication_posture, price_disclosure_policy_mode,
    product_category, fabric_type, created_at, updated_at
)
VALUES
    (gen_random_uuid(), $QA_KNT_B_ID, 'QA Knit Single Jersey',
     'QA-KNT-B-FAB-001', 'Single jersey knit for QA coverage.', 14.50, true, 100,
     'B2B_PUBLIC', NULL, 'Knit', 'Single Jersey', NOW(), NOW()),

    (gen_random_uuid(), $QA_KNT_B_ID, 'QA Knit Rib 1x1',
     'QA-KNT-B-FAB-002', '1x1 rib knit for QA price disclosure test.', 16.00, true, 80,
     'B2B_PUBLIC', 'RELATIONSHIP_ONLY', 'Knit', 'Rib', NOW(), NOW()),

    (gen_random_uuid(), $QA_KNT_B_ID, 'QA Knit French Terry',
     'QA-KNT-B-FAB-003', 'French terry for QA auth-only test.', 22.00, true, 75,
     'PRIVATE_OR_AUTH_ONLY', NULL, 'Knit', 'French Terry', NOW(), NOW()),

    (gen_random_uuid(), $QA_KNT_B_ID, 'QA Knit Interlock',
     'QA-KNT-B-FAB-004', 'Interlock knit for auth + price-gated test.', 18.00, true, 90,
     'PRIVATE_OR_AUTH_ONLY', 'RELATIONSHIP_ONLY', 'Knit', 'Interlock', NOW(), NOW()),

    (gen_random_uuid(), $QA_KNT_B_ID, 'QA Knit Fleece Brushed',
     'QA-KNT-B-FAB-005', 'Brushed fleece for approved-buyer-only test.', 25.00, true, 60,
     'APPROVED_BUYER_ONLY', NULL, 'Knit', 'Fleece', NOW(), NOW()),

    (gen_random_uuid(), $QA_KNT_B_ID, 'QA Knit Pique Polo',
     'QA-KNT-B-FAB-006', 'Pique polo knit for approved + price-gated test.', 20.00, true, 100,
     'APPROVED_BUYER_ONLY', 'RELATIONSHIP_ONLY', 'Knit', 'Pique', NOW(), NOW()),

    (gen_random_uuid(), $QA_KNT_B_ID, 'QA Knit Velour',
     'QA-KNT-B-FAB-007', 'Velour knit for hidden-item test.', 30.00, true, 50,
     'HIDDEN', NULL, 'Knit', 'Velour', NOW(), NOW()),

    (gen_random_uuid(), $QA_KNT_B_ID, 'QA Knit Thermal',
     'QA-KNT-B-FAB-008', 'Thermal knit for QA public browse test.', 19.00, true, 80,
     'B2B_PUBLIC', NULL, 'Knit', 'Thermal', NOW(), NOW()),

    (gen_random_uuid(), $QA_KNT_B_ID, 'QA Knit Waffle',
     'QA-KNT-B-FAB-009', 'Waffle knit for QA auth-only browse.', 17.00, true, 100,
     'PRIVATE_OR_AUTH_ONLY', NULL, 'Knit', 'Waffle', NOW(), NOW()),

    (gen_random_uuid(), $QA_KNT_B_ID, 'QA Knit Ponte Roma',
     'QA-KNT-B-FAB-010', 'Ponte Roma for public + relationship-price test.', 23.00, true, 75,
     'B2B_PUBLIC', 'RELATIONSHIP_ONLY', 'Knit', 'Ponte Roma', NOW(), NOW())

ON CONFLICT DO NOTHING;

-- NOTE: catalog_items has no unique constraint on (tenant_id, sku) in schema.prisma.
-- Idempotency for catalog items must be managed by pre-checking existence:
--   SELECT COUNT(*) FROM catalog_items WHERE tenant_id = $QA_KNT_B_ID AND sku LIKE 'QA-KNT-B-%';
-- If count = 10, skip Block 8. If count = 0, run Block 8. Partial seeds must be handled manually.

COMMIT;
```

> **Idempotency note for catalog_items:** There is no UNIQUE constraint on `(tenant_id, sku)` in
> the current schema. `ON CONFLICT DO NOTHING` without a conflict target will fail.  
> **Recommended pre-check pattern at execution time:**
> ```sql
> SELECT sku FROM catalog_items WHERE tenant_id = $QA_KNT_B_ID ORDER BY sku;
> ```
> If items already exist, skip insertion. Full replacement requires DELETE + re-insert, which is
> a manual step — **not automated in Slice C without explicit authorisation**.

### 11.10 Block 9: Catalog Items — QA_DYE_C and QA_GMT_D

Same pattern as Block 8, replacing `$QA_KNT_B_ID` with `$QA_DYE_C_ID` / `$QA_GMT_D_ID`
and using the SKUs from Sections 4.3 and 4.4 respectively. Full SQL omitted here to avoid
duplication — the execution script follows the identical INSERT structure.

### 11.11 Block 10: Buyer-Supplier Relationships (idempotent)

```sql
BEGIN;

-- Re-read org IDs at execution time:
-- $ORG_WVG_A   := (SELECT id FROM organizations WHERE slug = 'qa-b2b')
-- $ORG_KNT_B   := (SELECT id FROM organizations WHERE slug = 'qa-knt-b')
-- $ORG_DYE_C   := (SELECT id FROM organizations WHERE slug = 'qa-dye-c')
-- $ORG_GMT_D   := (SELECT id FROM organizations WHERE slug = 'qa-gmt-d')
-- $ORG_BUYER_A := (SELECT id FROM organizations WHERE slug = 'qa-buyer-a')
-- $ORG_BUYER_B := (SELECT id FROM organizations WHERE slug = 'qa-buyer')

INSERT INTO buyer_supplier_relationships (
    id, supplier_org_id, buyer_org_id, state,
    requested_at, approved_at, decided_at,
    suspended_at, revoked_at, expires_at,
    internal_reason, created_at, updated_at
)
VALUES
    -- T-01: QA_WVG_A ↔ QA_BUYER_A: APPROVED
    (gen_random_uuid(), $ORG_WVG_A, $ORG_BUYER_A, 'APPROVED',
     NOW()-INTERVAL'30 days', NOW()-INTERVAL'28 days', NOW()-INTERVAL'28 days',
     NULL, NULL, NULL, 'QA: approved relationship seeded by Slice B', NOW(), NOW()),

    -- T-02: QA_WVG_A ↔ QA_BUYER_B: REQUESTED
    (gen_random_uuid(), $ORG_WVG_A, $ORG_BUYER_B, 'REQUESTED',
     NOW()-INTERVAL'3 days', NULL, NULL,
     NULL, NULL, NULL, 'QA: requested relationship seeded by Slice B', NOW(), NOW()),

    -- T-04: QA_KNT_B ↔ QA_BUYER_A: APPROVED
    (gen_random_uuid(), $ORG_KNT_B, $ORG_BUYER_A, 'APPROVED',
     NOW()-INTERVAL'30 days', NOW()-INTERVAL'28 days', NOW()-INTERVAL'28 days',
     NULL, NULL, NULL, 'QA: approved relationship seeded by Slice B', NOW(), NOW()),

    -- T-05: QA_KNT_B ↔ QA_BUYER_B: REJECTED
    (gen_random_uuid(), $ORG_KNT_B, $ORG_BUYER_B, 'REJECTED',
     NOW()-INTERVAL'10 days', NULL, NOW()-INTERVAL'8 days',
     NULL, NULL, NULL, 'QA: rejected relationship seeded by Slice B', NOW(), NOW()),

    -- T-06: QA_DYE_C ↔ QA_BUYER_A: BLOCKED
    (gen_random_uuid(), $ORG_DYE_C, $ORG_BUYER_A, 'BLOCKED',
     NOW()-INTERVAL'20 days', NOW()-INTERVAL'18 days', NOW()-INTERVAL'15 days',
     NULL, NULL, NULL, 'QA: blocked relationship seeded by Slice B', NOW(), NOW()),

    -- T-07: QA_DYE_C ↔ QA_BUYER_B: SUSPENDED
    (gen_random_uuid(), $ORG_DYE_C, $ORG_BUYER_B, 'SUSPENDED',
     NOW()-INTERVAL'25 days', NOW()-INTERVAL'22 days', NOW()-INTERVAL'14 days',
     NOW()-INTERVAL'14 days', NULL, NULL, 'QA: suspended relationship seeded by Slice B', NOW(), NOW()),

    -- T-08: QA_GMT_D ↔ QA_BUYER_A: EXPIRED
    (gen_random_uuid(), $ORG_GMT_D, $ORG_BUYER_A, 'EXPIRED',
     NOW()-INTERVAL'60 days', NOW()-INTERVAL'58 days', NOW()-INTERVAL'58 days',
     NULL, NULL, NOW()-INTERVAL'5 days', 'QA: expired relationship seeded by Slice B', NOW(), NOW()),

    -- T-09: QA_GMT_D ↔ QA_BUYER_B: REVOKED
    (gen_random_uuid(), $ORG_GMT_D, $ORG_BUYER_B, 'REVOKED',
     NOW()-INTERVAL'45 days', NOW()-INTERVAL'43 days', NOW()-INTERVAL'10 days',
     NULL, NOW()-INTERVAL'10 days', NULL, 'QA: revoked relationship seeded by Slice B', NOW(), NOW())

ON CONFLICT (supplier_org_id, buyer_org_id) DO UPDATE
    SET state           = EXCLUDED.state,
        requested_at    = EXCLUDED.requested_at,
        approved_at     = EXCLUDED.approved_at,
        decided_at      = EXCLUDED.decided_at,
        suspended_at    = EXCLUDED.suspended_at,
        revoked_at      = EXCLUDED.revoked_at,
        expires_at      = EXCLUDED.expires_at,
        internal_reason = EXCLUDED.internal_reason,
        updated_at      = NOW();

-- T-03 (NONE): No row for QA_WVG_A ↔ QA_BUYER_C — this is the absence-of-relationship scenario.

COMMIT;
```

---

## Section 12 — Idempotency Strategy

| Table | Idempotency key | ON CONFLICT strategy |
|---|---|---|
| `tenants` | `slug` (UNIQUE) | `DO UPDATE SET` — safe to re-run |
| `organizations` | `id` (PK) | `DO UPDATE SET` — safe to re-run |
| `organization_role_positions` | `(org_id, role_position_key)` (PK) | `DO NOTHING` |
| `organization_secondary_segments` | `(org_id, segment_key)` (PK) | `DO NOTHING` |
| `users` | `email` (UNIQUE) | `DO UPDATE SET` — do NOT overwrite `password_hash` |
| `memberships` | `(user_id, tenant_id)` (UNIQUE) | `DO UPDATE SET role` |
| `catalog_items` | **No UNIQUE constraint in schema** | Pre-check existence; skip if present |
| `buyer_supplier_relationships` | `(supplier_org_id, buyer_org_id)` (UNIQUE) | `DO UPDATE SET` — safe to re-run |

**Catalog items special note:** Because `catalog_items` has no UNIQUE constraint on `(tenant_id, sku)`,
each seed run must pre-check item existence and skip if already seeded. Partial seed scenarios
(some items seeded, some missing) must be resolved manually.

---

## Section 13 — Rollback Plan

### 13.1 Scope

Rollback targets QA-prefixed rows only. Production safety rules in Section 17 prohibit rollback
execution in production.

### 13.2 Rollback SQL (advisory, SELECT-verified before execution)

```sql
BEGIN;

-- 1. Remove relationship rows (idempotent: won't fail if already gone)
DELETE FROM buyer_supplier_relationships
WHERE internal_reason LIKE 'QA:%';

-- 2. Remove catalog items for new suppliers
DELETE FROM catalog_items
WHERE sku LIKE 'QA-KNT-B-%'
   OR sku LIKE 'QA-DYE-C-%'
   OR sku LIKE 'QA-GMT-D-%';

-- 3. Restore patched QA_WVG_A items to original state
UPDATE catalog_items
SET publication_posture = 'PRIVATE_OR_AUTH_ONLY',
    price_disclosure_policy_mode = NULL,
    updated_at = NOW()
WHERE sku IN ('QA-B2B-FAB-002','QA-B2B-FAB-003','QA-B2B-FAB-004','QA-B2B-FAB-005','QA-B2B-FAB-006')
  AND tenant_id = (SELECT id FROM tenants WHERE slug = 'qa-b2b');

-- 4. Remove memberships for new QA users (by user email)
DELETE FROM memberships
WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE 'qa.supplier.%@texqtic.com'
       OR email LIKE 'qa.buyer.wvg.%@texqtic.com'
       OR email LIKE 'qa.buyer.knt.%@texqtic.com'
       OR email LIKE 'qa.svc.%@texqtic.com'
);

-- 5. Remove new QA users (NOT existing qa-b2b, qa-buyer, qa-agg owners)
DELETE FROM users
WHERE email LIKE 'qa.supplier.knt.%@texqtic.com'
   OR email LIKE 'qa.supplier.dye.%@texqtic.com'
   OR email LIKE 'qa.supplier.gmt.%@texqtic.com'
   OR email LIKE 'qa.buyer.wvg.a@texqtic.com'
   OR email LIKE 'qa.buyer.knt.c@texqtic.com'
   OR email LIKE 'qa.svc.tst.%@texqtic.com'
   OR email LIKE 'qa.svc.log.%@texqtic.com';

-- 6. Remove organizations for new tenants (CASCADE handles secondary_segments, role_positions)
DELETE FROM organizations
WHERE slug IN ('qa-knt-b','qa-dye-c','qa-gmt-d','qa-buyer-a','qa-buyer-c','qa-svc-tst-a','qa-svc-log-b');

-- 7. Remove tenants (CASCADE to organizations handled by FK — but org delete must come first
--    because organizations FK points TO tenants, not the other way around)
--    Actually: organizations.id FK → tenants.id with ON DELETE CASCADE.
--    Deleting organizations first (step 6) then tenants is correct.
DELETE FROM tenants
WHERE slug IN ('qa-knt-b','qa-dye-c','qa-gmt-d','qa-buyer-a','qa-buyer-c','qa-svc-tst-a','qa-svc-log-b');

COMMIT;
```

> **STOP CONDITION:** If any DELETE in the rollback block affects more rows than the known QA count,
> ROLLBACK the transaction and report. Never proceed with an oversized delete.

---

## Section 14 — Preflight Checks

All checks are **SELECT-only**. Execute before any seed block.

### 14.1 Schema migration parity

```sql
-- Confirm all required tables exist on staging
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'tenants','organizations','users','memberships',
    'catalog_items','buyer_supplier_relationships',
    'organization_role_positions','organization_secondary_segments'
  )
ORDER BY table_name;
```

Expected: 8 rows. If fewer, staging migration is behind — **STOP and report**.

### 14.2 Existing QA anchor tenants

```sql
SELECT slug, id, status, type, plan
FROM tenants
WHERE slug IN ('qa-b2b','qa-buyer','qa-agg')
ORDER BY slug;
```

Expected: 3 rows. If fewer → reuse seed.ts to create missing tenants before proceeding.

### 14.3 Confirm no existing net-new QA slugs (idempotency gate)

```sql
SELECT slug FROM tenants
WHERE slug IN ('qa-knt-b','qa-dye-c','qa-gmt-d','qa-buyer-a','qa-buyer-c','qa-svc-tst-a','qa-svc-log-b')
ORDER BY slug;
```

If rows are returned: seed was partially run. Run idempotency checks per Section 12 before
re-running seed blocks.

### 14.4 Confirm no existing relationship rows for QA pairs

```sql
SELECT s.slug AS supplier, b.slug AS buyer, bsr.state
FROM buyer_supplier_relationships bsr
JOIN organizations s ON s.id = bsr.supplier_org_id
JOIN organizations b ON b.id = bsr.buyer_org_id
WHERE s.slug LIKE 'qa-%' OR b.slug LIKE 'qa-%'
ORDER BY s.slug, b.slug;
```

Expected before first seed: 0 rows. If rows returned: prior seed run exists — run idempotent
DO UPDATE blocks, verify state matches plan.

### 14.5 Catalog item posture check for QA_WVG_A

```sql
SELECT sku, publication_posture, price_disclosure_policy_mode
FROM catalog_items
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'qa-b2b')
  AND sku IN ('QA-B2B-FAB-001','QA-B2B-FAB-002','QA-B2B-FAB-003',
              'QA-B2B-FAB-004','QA-B2B-FAB-005','QA-B2B-FAB-006')
ORDER BY sku;
```

Verify expected postures before patching (Block 7).

---

## Section 15 — Post-Seed Validation (SELECT only)

Execute after all seed blocks commit successfully. All queries are read-only.

### V-01: Tenant count

```sql
SELECT type, COUNT(*) AS cnt
FROM tenants
WHERE slug LIKE 'qa-%'
GROUP BY type
ORDER BY type;
```

Expected: `AGGREGATOR=1, B2B=9` (10 total QA tenants).

### V-02: Organizations parity

```sql
SELECT COUNT(*) AS tenant_count FROM tenants WHERE slug LIKE 'qa-%';
SELECT COUNT(*) AS org_count    FROM organizations WHERE slug LIKE 'qa-%';
```

Both counts must match. If `org_count < tenant_count`, organizations block failed for some tenants.

### V-03: Membership coverage

```sql
SELECT t.slug, m.role, u.email
FROM memberships m
JOIN tenants t ON t.id = m.tenant_id
JOIN users u ON u.id = m.user_id
WHERE t.slug LIKE 'qa-%'
ORDER BY t.slug;
```

Expected: ≥ 1 row per QA tenant, each with role = `OWNER`.

### V-04: Catalog item posture coverage

```sql
SELECT
    t.slug,
    ci.publication_posture,
    ci.price_disclosure_policy_mode,
    COUNT(*) AS item_count
FROM catalog_items ci
JOIN tenants t ON t.id = ci.tenant_id
WHERE t.slug LIKE 'qa-%' AND t.slug != 'qa-agg'
GROUP BY t.slug, ci.publication_posture, ci.price_disclosure_policy_mode
ORDER BY t.slug, ci.publication_posture;
```

Verify coverage per Section 4.5 targets.

### V-05: Relationship state coverage

```sql
SELECT
    s.slug AS supplier,
    b.slug AS buyer,
    bsr.state,
    bsr.requested_at,
    bsr.approved_at,
    bsr.expires_at,
    bsr.revoked_at
FROM buyer_supplier_relationships bsr
JOIN organizations s ON s.id = bsr.supplier_org_id
JOIN organizations b ON b.id = bsr.buyer_org_id
WHERE s.slug LIKE 'qa-%' OR b.slug LIKE 'qa-%'
ORDER BY bsr.state, s.slug;
```

Expected: 8 rows (7 states: APPROVED×2, REQUESTED, REJECTED, BLOCKED, SUSPENDED, EXPIRED, REVOKED).

### V-06: NONE scenario confirmation

```sql
SELECT COUNT(*)
FROM buyer_supplier_relationships
WHERE supplier_org_id = (SELECT id FROM organizations WHERE slug = 'qa-b2b')
  AND buyer_org_id    = (SELECT id FROM organizations WHERE slug = 'qa-buyer-c');
```

Expected: 0 (confirming the NONE scenario has no row).

### V-07: Role positions

```sql
SELECT o.slug, r.role_position_key
FROM organization_role_positions r
JOIN organizations o ON o.id = r.org_id
WHERE o.slug LIKE 'qa-%'
ORDER BY o.slug, r.role_position_key;
```

---

## Section 16 — Runtime Playwright Verification Plan

The following scenarios must be exercised via Playwright E2E tests in Slice C after seed runs.
These are **plan descriptions only** — no test code in this artifact.

| Test ID | Actor session | Endpoint | Expected outcome |
|---|---|---|---|
| E2E-01 | `qa.buyer.wvg.a@texqtic.com` (QA_BUYER_A) | `GET /api/catalog?supplierSlug=qa-b2b` | Returns B2B_PUBLIC + PRIVATE + APPROVED_BUYER_ONLY items; HIDDEN excluded |
| E2E-02 | `qa.buyer@texqtic.com` (QA_BUYER_B) | `GET /api/catalog?supplierSlug=qa-b2b` | Returns B2B_PUBLIC + PRIVATE items; APPROVED_BUYER_ONLY excluded (REQUESTED state) |
| E2E-03 | `qa.buyer.knt.c@texqtic.com` (QA_BUYER_C) | `GET /api/catalog?supplierSlug=qa-b2b` | Returns B2B_PUBLIC only; PRIVATE + APPROVED_BUYER_ONLY + HIDDEN excluded |
| E2E-04 | `qa.buyer.wvg.a@texqtic.com` | `GET /api/catalog/item/QA-B2B-FAB-003` | Price field absent or masked (RELATIONSHIP_ONLY, APPROVED pair: price shown) |
| E2E-05 | `qa.buyer.knt.c@texqtic.com` | `GET /api/catalog/item/QA-B2B-FAB-003` | Item visible (B2B_PUBLIC), price absent (RELATIONSHIP_ONLY, no relationship) |
| E2E-06 | `qa.buyer.wvg.a@texqtic.com` | `POST /api/rfq` (QA-B2B-FAB-002, qty=100) | 201 Created |
| E2E-07 | `qa.buyer@texqtic.com` | `POST /api/rfq` (QA-B2B-FAB-004, qty=100) | 403 Forbidden |
| E2E-08 | `qa.buyer.knt.c@texqtic.com` | `POST /api/rfq` (QA-B2B-FAB-006, qty=50) | 404 Not Found |
| E2E-09 | `qa.buyer.wvg.a@texqtic.com` | `POST /api/rfq` against QA_DYE_C (BLOCKED) | 403 Forbidden |
| E2E-10 | `qa.supplier.knt.b@texqtic.com` | `GET /api/tenant/catalog` | Returns all 10 KNT_B items |
| E2E-11 | `qa.svc.tst.a@texqtic.com` | `GET /api/tenant/catalog` | Returns empty catalog |

---

## Section 17 — Production Safety Rules

The following rules apply unconditionally during Slice C execution:

1. **All SQL must run against the staging database only.** The connection string for staging must be
   sourced from the staging `.env` file. The production `DATABASE_URL` must not be used.

2. **Seed script must scope all INSERTs with QA-prefix slugs and emails.** If any statement would
   touch a row without a `qa-` slug prefix or `@texqtic.com` QA email, it must STOP.

3. **QA catalog item SKUs use the `QA-` prefix.** Any UPDATE to a non-QA SKU must STOP.

4. **RFQ rows are runtime-only.** No pre-created RFQ rows in staging or production seed.

5. **No schema changes.** This slice is data-only. No DDL, no migration commands.

6. **No `prisma migrate dev` or `prisma db push`.** If schema changes are needed, they require a
   separate governance-approved migration slice.

7. **Secrets must not be printed.** `DATABASE_URL`, password hashes, and JWT tokens must not
   appear in terminal output, logs, or chat.

8. **Staging DB is not production.** Any doubt about which DB is targeted = STOP.

---

## Section 18 — Stop Conditions

Halt execution and emit a Blocker Report if any of the following occur:

| # | Condition | Required action |
|---|---|---|
| SC-01 | Staging `DATABASE_URL` is unavailable or points to production | STOP; request staging credentials from authorised user |
| SC-02 | Staging schema migration level is behind production | STOP; run `prisma migrate deploy` on staging with explicit approval |
| SC-03 | Block 1 reports more than 7 affected rows | STOP; inspect which extra tenants were created |
| SC-04 | `organizations.id` INSERT fails FK violation (tenants row missing) | STOP; re-check Block 1 commit |
| SC-05 | `buyer_supplier_relationships` INSERT fails UNIQUE violation with unexpected data | STOP; inspect existing rows; do not overwrite blindly |
| SC-06 | Any UPDATE to catalog_items affects more rows than the 5 target SKUs | STOP; inspect WHERE clause |
| SC-07 | Any QA DELETE in rollback affects non-QA rows | STOP; ROLLBACK transaction |
| SC-08 | `password_hash` value is printed in terminal, log, or output | STOP; redact output; report secrets leak |
| SC-09 | V-02 post-seed check reports `org_count < tenant_count` | STOP; identify missing org rows; re-run Block 2 |
| SC-10 | Staging RLS policies block INSERT for `texqtic_app` role | STOP; verify role grants with Supabase admin |

---

## Section 19 — Slice C Prompt Skeleton

When authorised by the user, issue the following prompt to initiate Slice C (staging execution):

---

```
TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001 — Slice C: Staging Seed Execution

Context:
- Slice A (design): committed ad0c4d1
- Slice B (plan): committed [<SLICE_B_COMMIT>]
- Staging environment: [<CONFIRM: staging Supabase URL + migration state>]

Objective:
Execute the seed plan from Slice B against the confirmed staging database.

Execution authority:
- This prompt explicitly authorises execution of the SQL blocks in Slice B Sections 11.2–11.11
  against staging only.
- All stop conditions in Section 18 apply unconditionally.
- No production database must be touched.

Allowlist (Modify):
- None (data-only execution; no file modifications)

Allowlist (Read):
- docs/TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001-SLICE-B-STAGING-SEED-PLAN.md
- server/prisma/seed.ts (reference only)
- .env (staging, read DATABASE_URL only — do NOT print value)

Approved commands:
- psql -f (SQL from Slice B plan, applied to staging DATABASE_URL)
- SELECT queries for preflight checks (Section 14) and post-seed validation (Section 15)
- git diff --name-only ; git status --short (preflight)

Forbidden:
- prisma migrate dev / db push
- npx prisma (use pnpm -C server exec prisma only)
- Any mutation against production
- Printing DATABASE_URL, password hashes, or JWT values

Stop conditions:
- All SC-01 through SC-10 from Section 18 apply

Evidence required:
- Preflight Section 14 output (SELECT results confirming staging state)
- Each seed block confirmation (row counts only)
- Post-seed validation Section 15 output (full V-01 through V-07)
- git status --short confirming no file changes

Commit:
- No commit required for staging execution (data-only, no file changes)
- If a verification doc is produced: commit message = "qa(staging): seed execution evidence slice-c"
```

---

*End of TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001 Slice B*
