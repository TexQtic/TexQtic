# DPP Snapshot Views — Discovery Document

**TECS ID:** G-025-DPP-SNAPSHOT-VIEWS-INVESTIGATION-001  
**Status:** ✅ Discovery Complete — Pending Design TECS  
**Date:** 2026-03-04  
**Wave:** 4 — DPP Snapshot Views  
**Governance Sync:** GOVERNANCE-SYNC-078  
**Author:** GitHub Copilot — investigation only, no schema/code changes

---

## 1. System Context (Wave 4 — G-025)

Phase A platform hardening closed at GOVERNANCE-SYNC-077 (2026-03-15) with RLS Maturity
5.0/5, 73 migrations applied, and all lifecycle state machines (TRADE / ESCROW / CERTIFICATION
/ ORDER) fully enforced.

Wave 4 opens with **G-025 — DPP Snapshot Views**: the goal is to expose a
**regulator-facing Digital Product Passport (DPP) read model** derived from the existing
Wave 3 traceability graph without touching live write paths or the schema migration ledger.

This document is the output of the **investigation phase only**. Nothing in this document
represents a schema change, view creation, or migration. All findings are derived from:

- `server/prisma/schema.prisma` (Prisma models)
- `server/prisma/migrations/20260312000000_g016_traceability_graph_phase_a/migration.sql`
- `server/prisma/migrations/20260311000000_g019_certifications_domain/migration.sql`
- `governance/wave-execution-log.md` (GOVERNANCE-SYNC-008 / GOVERNANCE-SYNC-009)
- `governance/gap-register.md` (complete audit trail)

---

## 2. Source Table Inventory

### 2.1 `traceability_nodes`

**Migration:** `20260312000000_g016_traceability_graph_phase_a` (GOVERNANCE-SYNC-009)  
**Prisma model:** `TraceabilityNode`

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `UUID` | NOT NULL | PK — `gen_random_uuid()` |
| `org_id` | `UUID` | NOT NULL | RLS boundary. FK → `organizations(id) ON DELETE RESTRICT` |
| `batch_id` | `TEXT` | NOT NULL | Human-readable batch identifier (e.g., `SKU-LOT-2026-001`) |
| `node_type` | `TEXT` | NOT NULL | Open-coded stage classifier (see §3.1 for observed values) |
| `meta` | `JSONB` | NOT NULL | Extensible metadata blob. Default `{}`. Application-layer size stop-loss enforced. |
| `visibility` | `TEXT` | NOT NULL | `TENANT` (default) or `SHARED` (future cross-org sharing) |
| `geo_hash` | `TEXT` | NULL | Optional geospatial hash (geohash / H3 index) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | Default `now()` |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | Default `now()`. Maintained by trigger `trg_traceability_nodes_set_updated_at` (BEFORE UPDATE) |

**Indexes:**
- `UNIQUE (org_id, batch_id)` — enforces one node per batch per org
- `INDEX (org_id, node_type)` — supports stage-filtered queries

**Constraints:**
- No DELETE grant issued (`GRANT SELECT, INSERT, UPDATE` only) — nodes are immutable-by-convention
- `ON DELETE RESTRICT` from `organizations` prevents orphan nodes

**Missing fields (DPP relevance — see §5):**
- No explicit `product_id` or `catalog_item_id` column
- No `facility_id` or `supplier_id` column
- No `material_composition` column
- Product and facility linkage must be encoded in `meta JSONB`

---

### 2.2 `traceability_edges`

**Migration:** `20260312000000_g016_traceability_graph_phase_a` (same)  
**Prisma model:** `TraceabilityEdge`

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `UUID` | NOT NULL | PK — `gen_random_uuid()` |
| `org_id` | `UUID` | NOT NULL | RLS boundary. FK → `organizations(id) ON DELETE RESTRICT` |
| `from_node_id` | `UUID` | NOT NULL | Source node. FK → `traceability_nodes(id) ON DELETE CASCADE` |
| `to_node_id` | `UUID` | NOT NULL | Target node. FK → `traceability_nodes(id) ON DELETE CASCADE` |
| `edge_type` | `TEXT` | NOT NULL | Open-coded edge classifier (see §3.2 for migration-documented values) |
| `transformation_id` | `TEXT` | NULL | Optional transformation reference (processing batch, recipe ID, etc.) |
| `meta` | `JSONB` | NOT NULL | Extensible metadata blob. Default `{}` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | Default `now()` |

> ⚠️ **No `updated_at` column on `traceability_edges`** — edges are append-only by design.

**Indexes:**
```
UNIQUE (org_id, from_node_id, to_node_id, edge_type) WHERE transformation_id IS NULL
UNIQUE (org_id, from_node_id, to_node_id, edge_type, transformation_id) WHERE transformation_id IS NOT NULL
INDEX  (org_id, from_node_id)   -- forward traversal
INDEX  (org_id, to_node_id)     -- reverse traversal (lineage walk-up)
```

**Directionality:** Directed graph. `from_node_id → to_node_id`. Forward and reverse
lookup indexes both present, supporting both downstream and upstream graph traversal.

**Ordering guarantee:** No explicit ordering column exists on edges. Traversal order
must be derived from `created_at ASC` or from application-layer path reconstruction.
Edge ordering within a stage transition is not enforced at the DB level.

---

### 2.3 `certifications`

**Migration:** `20260311000000_g019_certifications_domain` (GOVERNANCE-SYNC-008)  
**Prisma model:** `Certification`

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `UUID` | NOT NULL | PK — `gen_random_uuid()` |
| `org_id` | `UUID` | NOT NULL | RLS boundary. FK → `organizations(id) ON DELETE RESTRICT` |
| `certification_type` | `TEXT` | NOT NULL | Open-coded: `GOTS`, `OEKO_TEX`, `ISO_9001`, etc. Not an enum (schema-churn avoidance). |
| `lifecycle_state_id` | `UUID` | NOT NULL | FK → `lifecycle_states(id) ON DELETE RESTRICT`. entity_type must be `CERTIFICATION`. |
| `issued_at` | `TIMESTAMPTZ` | NULL | Null at SUBMITTED / UNDER_REVIEW. Set on APPROVED. |
| `expires_at` | `TIMESTAMPTZ` | NULL | Null for non-expiring certifications. |
| `created_by_user_id` | `UUID` | NULL | Audit trail for cert initiator. Not FK-enforced. |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | Default `now()` |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | Default `now()`. Maintained by trigger `trg_certifications_set_updated_at` |

**Lifecycle states (entity_type = 'CERTIFICATION', G-020):**
```
SUBMITTED → UNDER_REVIEW → APPROVED → EXPIRED | REVOKED
```
(6 states seeded. EXPIRED / REVOKED are terminal. Revocation uses lifecycle transition, not DELETE.)

**Constraints:**
- `CHECK (issued_at IS NULL OR expires_at IS NULL OR expires_at > issued_at)` — expiry must follow issuance
- `UNIQUE (org_id, certification_type) WHERE issued_at IS NULL` — one pending cert per type per org
- `UNIQUE (org_id, certification_type, issued_at) WHERE issued_at IS NOT NULL` — one issued cert per type+date per org
- No DELETE grant (`GRANT SELECT, INSERT, UPDATE` only)

**🔴 CRITICAL GAP — No FK to `traceability_nodes` or products:**

> The `certifications` table has **no direct FK** to `traceability_nodes`, `catalog_items`,
> or any product identifier column. The only shared key is `org_id` (same organisation).
>
> This means: for a DPP snapshot view, certifications can only be joined to the
> traceability graph via `org_id` (org-level, not node-level) unless node-to-cert
> associations are encoded inside the `meta JSONB` blob on either table.
>
> **Action required:** The Design TECS must decide how to resolve node-to-cert linkage.
> Options are documented in §7.

---

### 2.4 Supporting Tables — `catalog_items`

**Prisma model:** `CatalogItem`

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `UUID` | NOT NULL | PK |
| `tenant_id` | `UUID` | NOT NULL | RLS boundary. FK → `tenants(id)` (NOT `organizations`) |
| `name` | `VARCHAR(255)` | NOT NULL | Product name |
| `sku` | `VARCHAR(100)` | NULL | SKU identifier |
| `description` | `TEXT` | NULL | Product description |
| `price` | `DECIMAL(10,2)` | NULL | Unit price |
| `active` | `BOOLEAN` | NOT NULL | Default `true` |
| `moq` | `INT` | NOT NULL | Minimum order quantity. Default `1` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | |

> ⚠️ **RLS scope mismatch:** `catalog_items` is scoped by `tenant_id` (FK → `tenants`),
> while `traceability_nodes` is scoped by `org_id` (FK → `organizations`). These are
> the same underlying UUID (tenants.id === organizations.id by platform design per Decision-0001),
> but they reference different Prisma models. A JOIN across these two tables requires an explicit
> UUID equality predicate (`catalog_items.tenant_id = traceability_nodes.org_id`).
>
> **No `catalog_item_id` column exists on `traceability_nodes`**. Product linkage is
> therefore implicit (via `meta` JSONB or `batch_id` pattern convention).

---

### 2.5 Supporting Tables — `suppliers`, `facilities`, `product_batches`

> **NOT FOUND in schema.prisma or any migration file.**
>
> No `suppliers`, `facilities`, or `product_batches` tables exist in the current Wave 3
> schema. These are expected DPP fields (origin, manufacturer, facility) and represent
> **Schema Gap G-025-A** (see §8).

---

### 2.6 `organizations` (Identity Reference)

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `UUID` | NOT NULL | PK. Same UUID as `tenants.id` (canonical cross-plane entity per Decision-0001) |
| `slug` | `VARCHAR(100)` | NOT NULL | Unique org identifier |
| `legal_name` | `VARCHAR(500)` | NOT NULL | Legal entity name — usable as DPP "manufacturer" field |
| `jurisdiction` | `VARCHAR(100)` | NOT NULL | Default `UNKNOWN` — usable as DPP "origin/country" field |
| `registration_no` | `VARCHAR(200)` | NULL | Legal registration number |
| `org_type` | `VARCHAR(50)` | NOT NULL | Default `B2B` |
| `risk_score` | `SMALLINT` | NOT NULL | Default `0` |
| `status` | `VARCHAR(30)` | NOT NULL | Default `ACTIVE` |
| `effective_at` | `TIMESTAMPTZ` | NOT NULL | Temporal versioning anchor |
| `superseded_at` | `TIMESTAMPTZ` | NULL | Temporal versioning close |

`organizations` provides the **manufacturer identity** for a DPP: `legal_name` + `jurisdiction`
+ `registration_no` are the closest available analogues to DPP regulatory fields.

---

## 3. Traceability Graph Model

### 3.1 Node Type Vocabulary

The `node_type` column is open-coded TEXT. From the G-016 migration comments and the
platform's textile/fashion domain, the expected node taxonomy is:

| `node_type` value | DPP Stage | Description |
|-------------------|-----------|-------------|
| `RAW_MATERIAL` | Stage 1 | Fibre, yarn input |
| `PROCESSING` | Stage 2 | Spinning, weaving, dyeing |
| `DISTRIBUTION` | Stage 3 | Logistics / warehousing |
| `RETAIL` | Stage 4 | Final sale unit |

> **Finding:** No enum or CHECK constraint enforces these values at the DB level.
> The node_type vocabulary is application-convention only. A DPP snapshot view must
> either filter for known values or treat node_type as opaque text.

Expected full lineage for a textile product:
```
RAW_MATERIAL → PROCESSING → DISTRIBUTION → RETAIL
```

The migration comment also implies a `garment` / `batch` / `shipment` level — these
may be encoded as `node_type` values not yet defined in schema documentation.

---

### 3.2 Edge Type Vocabulary

The `edge_type` column is open-coded TEXT. From the G-016 migration comments:

| `edge_type` value | Semantics |
|-------------------|-----------|
| `SOURCED_FROM` | Node B was sourced from Node A |
| `PROCESSED_INTO` | Node A was processed to produce Node B |
| `SHIPPED_TO` | Node A was shipped to location of Node B |

> **Finding:** Like `node_type`, no enum or CHECK constraint enforces these values.
> The edge vocabulary is application-convention only.

---

### 3.3 Canonical Graph Traversal Pattern

A full DPP lineage walk follows this structure:

```
traceability_nodes (RAW_MATERIAL)
          │
          │  edge_type = SOURCED_FROM / PROCESSED_INTO
          ▼
traceability_nodes (PROCESSING)
          │
          │  edge_type = PROCESSED_INTO
          ▼
traceability_nodes (DISTRIBUTION)
          │
          │  edge_type = SHIPPED_TO
          ▼
traceability_nodes (RETAIL)
```

**Traversal query pattern (illustrative — NOT a view, investigation only):**

```sql
-- Forward walk from a root node
WITH RECURSIVE lineage AS (
  SELECT id, org_id, node_type, batch_id, meta, 0 AS depth
  FROM   traceability_nodes
  WHERE  id = $root_node_id

  UNION ALL

  SELECT n.id, n.org_id, n.node_type, n.batch_id, n.meta, l.depth + 1
  FROM   traceability_nodes n
  JOIN   traceability_edges e ON e.from_node_id = l.id AND e.to_node_id = n.id
  JOIN   lineage l ON true
  WHERE  n.org_id = l.org_id   -- RLS must also be in effect
    AND  l.depth < 20           -- cycle guard
)
SELECT * FROM lineage ORDER BY depth;
```

**Directionality enforcement:**
- The schema enforces a directed graph (from_node_id → to_node_id) but does NOT
  enforce acyclicity at the DB level. Cycle detection must be done in the recursive
  CTE or application layer.
- Reverse traversal (upstream lineage) is supported via the `org_to_idx` index.

---

## 4. Certification Linkage

### 4.1 Current Linkage Model

```
organizations ◄─── org_id ─── certifications
organizations ◄─── org_id ─── traceability_nodes
```

**Current state:** Certifications and traceability nodes share only the `org_id` key.
There is **no node-level cert linkage** — a certification is org-scoped, not node-scoped.

### 4.2 Certification Lifecycle Relevance for DPP

The `lifecycle_state_id` FK → `lifecycle_states` encodes the cert status. The relevant
DPP fields derivable today:

| DPP Field | Source | Availability |
|-----------|--------|--------------|
| Certification type | `certifications.certification_type` | ✅ Available |
| Issuing status | `lifecycle_states.name` (via JOIN on `lifecycle_state_id`) | ✅ Available |
| Issue date | `certifications.issued_at` | ✅ Available (nullable) |
| Expiry date | `certifications.expires_at` | ✅ Available (nullable) |
| Revocation | `certifications.lifecycle_state_id` → REVOKED state | ✅ Available via lifecycle join |
| Issuing body | ❌ Not stored — no `issuing_body` column | 🔴 Gap |
| Certificate number | ❌ Not stored | 🔴 Gap |
| Linked node / product | ❌ No FK — org-level linkage only | 🔴 Gap |

### 4.3 STOP CONDITION TRIGGERED — Certifications do not link to nodes/products

> **🔴 STOP CONDITION: Documented per TECS instruction.**
>
> The `certifications` table does not link directly to `traceability_nodes` or any
> product/SKU identifier. The only shared identifier is `org_id`.
>
> **Impact on DPP snapshot design:**
> - A snapshot view that joins certifications to a specific product lineage is
>   **not directly derivable** from the current schema without additional schema changes.
> - Org-level certification summary (all certs for a given org) is derivable.
> - Node-level or product-level certification lookup requires either:
>   a. A new FK column on `certifications` (e.g., `node_id UUID NULL`), or
>   b. Application-layer JSONB convention in `certifications.meta` or `traceability_nodes.meta`
>
> This gap is recorded as **Schema Gap G-025-B** in §8.
> No schema change is made in this TECS. Design decision deferred to Design TECS.

---

## 5. Regulatory DPP Field Mapping

Below maps EU-model DPP minimum field set against current TexQtic schema.

| DPP Regulatory Field | Source Table | Source Column | Status | Notes |
|---------------------|--------------|---------------|--------|-------|
| Product identifier | `traceability_nodes` | `batch_id` | 🟡 Partial | `batch_id` is a batch ref, not a canonical product ID. SKU only in `catalog_items.sku` (separate RLS scope). |
| Manufacturer (legal name) | `organizations` | `legal_name` | ✅ Available | Via `org_id` join |
| Manufacturer (registration no) | `organizations` | `registration_no` | ✅ Available | Nullable |
| Country of origin / jurisdiction | `organizations` | `jurisdiction` | 🟡 Partial | `DEFAULT 'UNKNOWN'` — quality depends on data entry |
| Facility (production site) | None | — | 🔴 Gap | No `facilities` table exists (Gap G-025-A) |
| Supplier | None | — | 🔴 Gap | No `suppliers` table exists (Gap G-025-A) |
| Material composition | `traceability_nodes` | `meta JSONB` | 🟡 Partial | Convention-dependent. No schema-enforced field. |
| Certification type | `certifications` | `certification_type` | ✅ Available | |
| Certification status | `lifecycle_states` | `name` | ✅ Available | Via lifecycle JOIN |
| Certification issue date | `certifications` | `issued_at` | ✅ Available | Nullable |
| Certification expiry | `certifications` | `expires_at` | ✅ Available | Nullable |
| Revocation status | `certifications` | `lifecycle_state_id` | ✅ Available | Via lifecycle JOIN on REVOKED state |
| Issuing body / authority | None | — | 🔴 Gap | No `issuing_body` column (Gap G-025-B) |
| Certificate reference number | None | — | 🔴 Gap | No cert number column (Gap G-025-B) |
| Traceability chain hash | None | — | 🔴 Gap | No lineage hash column (Gap G-025-C) |
| Lineage depth / path | Derived | — | 🟡 Partial | Derivable via recursive CTE on edges, but not stored. |
| Supply-chain stage | `traceability_nodes` | `node_type` | 🟡 Partial | Open-coded; no enum enforcement |
| Geographic location | `traceability_nodes` | `geo_hash` | 🟡 Partial | Nullable; H3/geohash format — requires decode |

**Summary:** 5 fields fully available, 6 partially available (quality / schema convention
dependent), 5 fields not yet present in schema.

---

## 6. RLS Inheritance Analysis

### 6.1 Per-Table RLS Status

| Table | FORCE RLS | Policy Count | Guard Pattern | Tenant Predicate | Admin Arm | VIEW-safe? |
|-------|-----------|--------------|---------------|-----------------|-----------|-----------|
| `traceability_nodes` | ✅ Yes | 5 | RESTRICTIVE `FOR ALL TO texqtic_app` | `org_id = app.current_org_id()` | `app.is_admin='true'` | ✅ Yes |
| `traceability_edges` | ✅ Yes | 5 | RESTRICTIVE `FOR ALL TO texqtic_app` | `org_id = app.current_org_id()` | `app.is_admin='true'` | ✅ Yes |
| `certifications` | ✅ Yes | 5 | RESTRICTIVE `FOR ALL TO texqtic_app` | `org_id = app.current_org_id()` | `app.is_admin='true'` | ✅ Yes |
| `organizations` | ⚠️ Unknown | — | Not documented in Wave 3 migrations reviewed | `id = app.current_org_id()`? | Unknown | ⚠️ Verify |
| `catalog_items` | ✅ Yes | 5 | RESTRICTIVE `FOR ALL TO texqtic_app` | `tenant_id = app.current_org_id()` | `app.is_admin='true'` | ✅ Yes |

### 6.2 RLS Policy Shape (all three core tables)

All three tables implement the canonical **Wave 3 Tail** RLS pattern:

```
1 RESTRICTIVE guard (FOR ALL TO texqtic_app):
  - pass if: app.require_org_context() OR app.bypass_enabled() OR app.is_admin='true'

4 PERMISSIVE policies:
  - tenant_select:  USING (org_id = app.current_org_id() OR app.bypass_enabled())
  - tenant_insert:  WITH CHECK (app.require_org_context() AND org_id = app.current_org_id() OR bypass)
  - tenant_update:  USING + WITH CHECK same as above
  - admin_select:   USING (app.is_admin = 'true')  -- cross-tenant read
```

No `UPDATE` or `DELETE` grant on `certifications`. No `DELETE` grant on `traceability_nodes`
or `traceability_edges`.

### 6.3 View RLS Inheritance

**PostgreSQL behavior for SQL VIEWs:**
- A regular SQL VIEW executes with the security context of the **calling role** (INVOKER)
  unless `SECURITY DEFINER` is set.
- All three core tables have `FORCE ROW LEVEL SECURITY` — this applies even if the view
  definition does not reference `org_id` directly.
- Provided the view is created `WITH (security_invoker = true)` (PG15+) or is a simple
  pass-through, RLS on underlying tables fires automatically.

**Conclusion:** Live SQL views on `traceability_nodes`, `traceability_edges`, and
`certifications` will **safely inherit RLS** without additional policy work, provided:
1. The view does not use `SECURITY DEFINER`
2. The calling role is `texqtic_app` (which has the policies)
3. The session context (`app.org_id`, `app.is_admin`) is set correctly before query

> ⚠️ **Materialized views are exempt from RLS** — they store rows at refresh time.
> A materialised view would require separate access control (view-level grants, function
> wrapper, or application-layer filtering). This is the primary risk for Option B.

---

## 7. Snapshot Strategy Options (A / B / C)

### Option A — Live SQL Views

**Design:** Create `CREATE VIEW dpp_snapshot AS SELECT … FROM traceability_nodes n JOIN traceability_edges … JOIN certifications … JOIN organizations …`

| Dimension | Assessment |
|-----------|-----------|
| Query cost | High — recursive CTE on every DPP fetch. No pre-computation. |
| RLS | ✅ Automatically inherited from base tables |
| Freshness | ✅ Always current |
| Regulatory auditability | ✅ Point-in-time DPP reflects live state |
| Schema risk | Low — no new tables; only a view object |
| Complexity | Medium — requires correct recursive CTE + join strategy |
| Cert linkage problem | 🔴 Can only join at org level until Schema Gap G-025-B resolved |
| Cross-org DPP (SHARED) | 🔴 `visibility='SHARED'` not yet implemented |

**Best for:** Low-volume regulator queries where freshness is mandatory and
cert-node linkage gap is resolved by adding a FK column.

---

### Option B — Materialized Views (Periodic Refresh)

**Design:** `CREATE MATERIALIZED VIEW dpp_snapshot_mat AS SELECT … REFRESH MATERIALIZED VIEW CONCURRENTLY dpp_snapshot_mat;` — refreshed on a cron schedule.

| Dimension | Assessment |
|-----------|-----------|
| Query cost | Low — pre-computed snapshot, fast reads |
| RLS | 🔴 **NOT inherited.** Materialised views bypass RLS at select time. Requires separate access control mechanism (e.g., row-level grant function or view wrapper over the mat view). |
| Freshness | 🟡 Stale by refresh interval (minutes to hours) |
| Regulatory auditability | 🟡 Snapshot may not reflect latest revocation event |
| Schema risk | Medium — needs `CONCURRENTLY` index + refresh job infra |
| Complexity | High — access control layer must be rebuilt on top |
| Cert linkage problem | 🔴 Same as Option A — structural gap unresolved by strategy choice |
| Cross-org DPP (SHARED) | 🟡 Can be designed in refresh scope |

**Best for:** High-volume regulatory dashboard reads where slight staleness is
acceptable and a separate access control layer is implemented.

> **Critical RLS risk:** Materialised views in PostgreSQL do not participate in
> the RLS policy stack. Any row in a refreshed mat-view is accessible to any
> role with SELECT on that mat-view. This is a **regression from the canonical
> Wave 3 Tail pattern** and must be resolved before Option B is considered.

---

### Option C — Hybrid: Live Lineage + Cached Certification Join

**Design:** Live SQL view on `traceability_nodes` + `traceability_edges` (inherits RLS)
combined with a cached/denormalised certification status table refreshed on lifecycle
state transitions.

| Dimension | Assessment |
|-----------|-----------|
| Query cost | Medium — graph traversal live; cert lookup from cache |
| RLS | ✅ Live lineage view inherits RLS automatically |
| Freshness | ✅ Lineage: always current. Certs: event-driven (on lifecycle state change) |
| Regulatory auditability | ✅ Revocation visible within one certification lifecycle event |
| Schema risk | Medium — requires a new cached cert state table (schema change needed) |
| Complexity | High — two-layer design; event coupling required |
| Cert linkage problem | 🟡 Partially resolved if cached cert table stores `node_id` |
| Cross-org DPP (SHARED) | 🟡 Can be designed modularly |

**Best for:** Production-scale DPP platform where lineage staleness is unacceptable
but cert join cost must be controlled. Requires resolution of Schema Gap G-025-B first.

---

### Comparison Matrix

| Criterion | Option A (Live View) | Option B (Mat View) | Option C (Hybrid) |
|-----------|---------------------|--------------------|--------------------|
| RLS safety | ✅ Full | 🔴 Broken | ✅ Partial |
| Query freshness | ✅ Real-time | 🟡 Lagged | ✅ Near real-time |
| Implementation effort | Low | Medium | High |
| Cert linkage (pre-gap-fix) | Org-level only | Org-level only | Can be schema-extended |
| Cert linkage (post-gap-fix) | ✅ Node-level | ✅ Node-level | ✅ Node-level |
| Scale risk | High (recursive CTE) | Low (pre-computed) | Medium |
| Regulatory compliance fit | High | Medium | High |

> **No recommendation is made in this TECS** — strategy selection is the responsibility
> of the Design TECS (G-025).

---

## 8. Known Gaps / Unknowns

| Gap ID | Category | Description | Blocking? |
|--------|----------|-------------|-----------|
| **G-025-A** | Missing tables | No `suppliers`, `facilities`, or `product_batches` tables in schema. Facility, supplier, and material-composition DPP fields are unrepresented at the schema level. | 🔴 Yes — for full DPP |
| **G-025-B** | Missing FK | No FK from `certifications` to `traceability_nodes` or any product/SKU identifier. Cert-to-node linkage is not possible without JSONB convention or schema change. | 🔴 Yes — for node-level cert join |
| **G-025-B-2** | Missing columns | `certifications` has no `issuing_body`, `cert_number`, or `external_reference` column. Standard DPP cert fields missing. | 🔴 Yes — for full DPP |
| **G-025-C** | Missing hash | No `lineage_hash` or `chain_id` column on `traceability_nodes` or `traceability_edges`. Cryptographic traceability integrity field absent. | 🟡 Partial — depends on regulatory spec |
| **G-025-D** | No enum enforcement | `node_type` and `edge_type` are open TEXT fields with no DB CHECK constraint. Snapshot views cannot rely on closed vocabulary. | 🟡 Medium risk |
| **G-025-E** | Ordering | `traceability_edges` has no ordinal or sequence column. Graph traversal order is `created_at`-based and cannot be explicitly declared by the application. | 🟡 Medium risk |
| **G-025-F** | `organizations` RLS clarity | `organizations` table RLS policy shape was not confirmed in the migrations reviewed for this TECS. Must be verified before including it in a regulator-facing view. | ⚠️ Verify |
| **G-025-G** | `visibility = SHARED` | Cross-org sharing via `visibility='SHARED'` nodes is not implemented. Cross-org DPP traversal is architecturally blocked until implemented. | 🟡 Deferred |
| **G-025-H** | `catalog_items` FK mismatch | `catalog_items` uses `tenant_id` (→ `tenants`) while traceability tables use `org_id` (→ `organizations`). UUID is the same per platform design but JOIN predicate must be explicit. | 🟡 Implementation caveat |

---

## 9. Inputs Required for Design TECS (G-025)

The following decisions must be made in the G-025 Design TECS before any schema or
view creation begins:

1. **Cert-to-node linkage strategy**  
   Choose: (a) add `node_id UUID NULL FK` to `certifications`, (b) add `cert_id UUID NULL FK`
   to `traceability_nodes`, (c) create a join table `node_certifications`, or
   (d) enforce JSONB convention via application layer.  
   → Resolves G-025-B.

2. **Supplier and facility model**  
   Determine whether `suppliers` and `facilities` are first-class tables or encoded in
   `organizations` / `meta JSONB`.  
   → Resolves G-025-A.

3. **Issuing body and cert reference fields**  
   Add `issuing_body TEXT`, `cert_number TEXT`, `external_reference TEXT` to `certifications`
   or handle in a cert extension table.  
   → Resolves G-025-B-2.

4. **Snapshot strategy selection**  
   Choose Option A / B / C from §7. If Option B: design mat-view access control strategy.

5. **Regulatory field specification**  
   Obtain the exact EU DPP / EUDR / Ecodesign Regulation field list applicable to the
   TexQtic textile use-case to validate the gap map in §5.

6. **`node_type` vocabulary lock**  
   Decide whether to add a DB CHECK constraint or Prisma enum for `node_type` and
   `edge_type` to enable reliable snapshot filtering.

7. **`organizations` RLS verification**  
   Confirm `organizations` table RLS policy shape before including it in a view.

8. **Lineage hash design**  
   Determine whether a cryptographic hash (SHA-256 of the lineage path) should be
   computed at write-time on edges or derived at query-time.

---

*Document produced by: GitHub Copilot — G-025-DPP-SNAPSHOT-VIEWS-INVESTIGATION-001*  
*No schema changes. No view creation. No migrations. Investigation only.*  
*Governance sync: GOVERNANCE-SYNC-078 — 2026-03-04*
