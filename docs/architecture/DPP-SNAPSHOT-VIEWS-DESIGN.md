# DPP Snapshot Views — Design Anchor

**TECS ID:** G-025-DPP-SNAPSHOT-VIEWS-DESIGN-001  
**Status:** ✅ Design Anchor Complete — Awaiting Approval (D1–D6)  
**Date:** 2026-03-04  
**Wave:** 4 — DPP Snapshot Views  
**Governance Sync:** GOVERNANCE-SYNC-079  
**Predecessor:** [DPP Snapshot Views — Discovery Document](DPP-SNAPSHOT-VIEWS-DISCOVERY.md) (GOVERNANCE-SYNC-078)  
**Author:** GitHub Copilot — design anchor only; no schema/code changes

---

## 1. Executive Summary

Digital Product Passport (DPP) Snapshot Views are a **regulator-facing read layer** built
on top of the TexQtic Wave 3 traceability graph (`traceability_nodes`, `traceability_edges`,
`certifications`). They expose a structured, tenant-isolated, point-in-time view of a
product's supply-chain lineage and compliance state — suitable for regulatory disclosure
under frameworks such as the EU Ecodesign Regulation, EUDR, and GOTS audit trails.

This design anchor locks the key structural decisions identified in the discovery phase
(GOVERNANCE-SYNC-078) — specifically how certifications link to lineage nodes (the critical
blocker, G-025-B), which regulatory fields appear in v1, which snapshot strategy is adopted,
and how graph traversal is made deterministic — so that a single implementation TECS sequence
(4A → 4B → 4C → 4D) can proceed without mid-flight design drift. **This document does not
create any views, migrations, or routes.** All implementation is deferred to the TECS
sequence defined in §7.

---

## 2. Non-Goals (Hard — v1)

The following are explicitly out of scope for v1 and must not be implemented in TECS 4A/4B:

| Non-Goal | Reason |
|----------|--------|
| Write-path changes (existing routes / services) | Discovery constraint; DPP is read-only |
| Materialized views | RLS is not inherited by mat-views; access-control rebuilding deferred |
| Cross-org `SHARED` visibility traversal | `visibility='SHARED'` not implemented; G-025-G deferred |
| `suppliers` / `facilities` first-class tables | G-025-A; schema-budget decision required; v2 scope |
| `issuing_body` / `cert_number` columns | G-025-B-2; `certifications` schema extension deferred to separate TECS |
| Cryptographic lineage hash (`lineage_hash`) | G-025-C; auditor signature model not yet specified |
| `sku` / `catalog_items` join in views | G-025-H FK mismatch risk; defer until catalog-traceability linkage canonicalized |
| New API routes or frontend surfaces | TECS 4C/4D; separate from view creation |

---

## 3. Current Schema Facts

> Full inventory in [DPP Snapshot Views — Discovery Document §2](DPP-SNAPSHOT-VIEWS-DISCOVERY.md#2-source-table-inventory)

**`traceability_nodes`** (G-016 Phase A):
- RLS boundary: `org_id` (FK → `organizations`). FORCE RLS = true.
- Open-coded `node_type` TEXT (no DB enum). `meta JSONB` for extensible fields.
- No `product_id`, `facility_id`, `supplier_id`, or `catalog_item_id` column.
- `geo_hash` TEXT (nullable). `visibility` TEXT (default `TENANT`).

**`traceability_edges`** (G-016 Phase A):
- Directed: `from_node_id → to_node_id`. Both FK → `traceability_nodes(id) ON DELETE CASCADE`.
- `org_id` RLS boundary. FORCE RLS = true. Append-only (no `updated_at`, no DELETE grant).
- No ordinal column. No DB-enforced acyclicity.

**`certifications`** (G-019):
- `org_id` RLS boundary. FORCE RLS = true.
- `lifecycle_state_id` FK → `lifecycle_states`. `certification_type` open TEXT.
- **No FK to `traceability_nodes` or any product identifier.** (Critical blocker: G-025-B)
- No `issuing_body`, `cert_number`, or `external_reference` column.

**`organizations`**:
- `legal_name`, `jurisdiction`, `registration_no` — closest available manufacturer fields.
- RLS policy shape **unconfirmed** — must be verified before view inclusion (gate: D4).

---

## 4. Decision Table

> Each decision marked **[ ] Approval required by Paresh** must be confirmed before the
> corresponding implementation TECS is raised. Copilot will block the implementation TECS
> until the approval checkbox is cleared.

---

### D1 — Cert-to-Lineage Linkage Strategy (resolves G-025-B)

**Problem:** `certifications.org_id` = `traceability_nodes.org_id` is the only shared key.
A DPP that links a specific certification to a specific supply-chain node requires an
explicit association not present in the current schema.

**Options:**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A** | Add `node_id UUID NULL FK` on `certifications → traceability_nodes(id)` | Simple; 1-column migration on existing table | Assumes 1:1 cert-to-node; a cert that covers an entire org or multiple nodes cannot be expressed; modifies already-verified table |
| **B** | Add `certification_id UUID NULL FK` on `traceability_nodes → certifications(id)` | Simple read | Violates M:N reality (one node may have many certs); modifies already-verified table |
| **C** | Create join table `node_certifications(id, org_id, node_id, certification_id, created_at)` | M:N correct; does NOT modify existing verified tables; new table gets its own canonical FORCE RLS; org_id on join table preserves tenant isolation | One additional migration / table to manage |
| **D** | JSONB convention only (no schema) | Zero migration cost | Unverifiable; no referential integrity; index-hostile; non-governable; rejected |

**Recommendation: Option C — join table `node_certifications`**

Rationale:
1. **Does not modify existing, verified schema objects** (`certifications` and `traceability_nodes`
   both have production FORCE RLS + canonical Wave 3 Tail policies; touching them introduces
   regression risk).
2. **Correct relational model**: a certification (e.g., GOTS) may cover multiple supply-chain
   stages (raw material + yarn + fabric) and a node may carry multiple certifications. M:N is
   the only correct cardinality.
3. **RLS doctrine compliant**: `node_certifications` can carry `org_id` + FORCE RLS with the
   identical Wave 3 Tail pattern (1 RESTRICTIVE guard + 4 PERMISSIVE policies; `TO texqtic_app`).
4. **Minimal blast radius**: new table is additive; if the design changes, it can be dropped
   without touching the two core tables.
5. **Governable**: explicit FK constraints on both sides provide referential integrity
   verifiable in CI.

**Proposed `node_certifications` shape** (for TECS 4A implementation):

```
node_certifications (
  id               UUID PK DEFAULT gen_random_uuid()
  org_id           UUID NOT NULL FK → organizations(id) ON DELETE RESTRICT    -- RLS boundary
  node_id          UUID NOT NULL FK → traceability_nodes(id) ON DELETE CASCADE
  certification_id UUID NOT NULL FK → certifications(id) ON DELETE CASCADE
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
  UNIQUE (org_id, node_id, certification_id)
)
```

FORCE RLS = true. Grants: `SELECT, INSERT` to `texqtic_app` (join table is
effectively immutable — no UPDATE; DELETE allowed via certification lifecycle
terminal states, but governed by separate policy).

> **[ ] Approval required by Paresh** — D1 strategy locked to Option C before TECS 4A is raised.

**Implementation TECS pointer:** TECS 4A (§7)

---

### D2 — Regulatory Field Surface (v1 minimum)

Define exactly what fields v1 exposes, grouped by DPP section.

**Included in v1:**

| DPP Group | Field | Source | Notes |
|-----------|-------|--------|-------|
| **Product identity** | `batch_id` | `traceability_nodes.batch_id` | Batch-level identifier; not a canonical SKU |
| Product identity | `node_type` | `traceability_nodes.node_type` | Opaque string (see D5) |
| Product identity | `meta` | `traceability_nodes.meta` | JSONB passthrough; consumer responsible for field extraction |
| Product identity | `geo_hash` | `traceability_nodes.geo_hash` | Nullable geohash; consumer responsible for decode |
| **Manufacturer** | `legal_name` | `organizations.legal_name` | Conditional on D4 gate PASS |
| Manufacturer | `jurisdiction` | `organizations.jurisdiction` | Conditional on D4 gate PASS |
| Manufacturer | `registration_no` | `organizations.registration_no` | Nullable; conditional on D4 gate PASS |
| **Lineage chain** | `from_node_id`, `to_node_id`, `edge_type`, `depth` | `traceability_edges` + recursive CTE | Per §6 traversal rules (see D6) |
| Lineage chain | `transformation_id` | `traceability_edges.transformation_id` | Nullable; passthrough |
| **Certifications** | `certification_type`, `issued_at`, `expires_at`, `lifecycle_state_name` | `certifications` + `lifecycle_states` JOIN | Org-level only in v1 until TECS 4A (D1) |

**Explicitly NOT in v1 (deferred):**

| Field | Gap | Deferred to |
|-------|-----|------------|
| SKU | G-025-H (catalog_items FK mismatch) | v2 / separate TECS |
| Issuing body | G-025-B-2 | Separate `certifications` extension TECS |
| Certificate number | G-025-B-2 | Separate `certifications` extension TECS |
| Facility | G-025-A | v2 / `facilities` model TECS |
| Supplier | G-025-A | v2 / `suppliers` model TECS |
| Lineage hash | G-025-C | v2 / cryptographic model TECS |
| Node-level cert linkage | G-025-B | TECS 4A (D1 implementation) |

> **[ ] Approval required by Paresh** — v1 field surface confirmed before TECS 4B is raised.

**Implementation TECS pointer:** TECS 4B (§7)

---

### D3 — Snapshot Strategy

**Options recap (from discovery §7):**

| Option | RLS | Freshness | Scale | v1 fit |
|--------|-----|-----------|-------|--------|
| A — Live SQL Views | ✅ Full (inherited) | ✅ Real-time | 🟡 CTE cost | ✅ |
| B — Materialized Views | 🔴 Broken | 🟡 Lagged | ✅ Pre-computed | ❌ |
| C — Hybrid | ✅ Partial | ✅ Near real-time | 🟡 Two-layer | ⚠️ Overengineered for v1 |

**Recommendation: Option A — Live SQL Views**

Rationale:
- RLS is automatically inherited from base tables (FORCE RLS). No separate access-control
  layer required. This directly aligns with TexQtic's canonical Wave 3 Tail doctrine — any
  deviation is a governance regression.
- Regulator queries for DPP are expected to be **low-frequency reads** (triggered by audit
  request, not dashboard polling). Recursive CTE cost is acceptable at this scale.
- Option B introduces an RLS regression that requires a new access-control subsystem — that
  is a separate design problem not in v1 scope.
- Option C is correct for high-scale production but premature for v1. The hybrid cert cache
  is only needed after TECS 4A (D1) resolves node-level cert linkage; building it now without
  D1 complete would be premature optimization.

**If scale later demands Option B/C:** a future design TECS must produce a verified RLS
replacement strategy for the mat-view layer before any materialized implementation proceeds.

> **No approval gate — Option A is mandatory for v1 per TECS instruction.**

**Implementation TECS pointer:** TECS 4B (§7)

---

### D4 — `organizations` Table Inclusion Gate (resolves G-025-F)

**Problem:** Discovery confirmed that `organizations` RLS policy shape was NOT verified in
the Wave 3 migration set reviewed under GOVERNANCE-SYNC-078. Including `organizations` in a
regulator-facing view without confirmed FORCE RLS + canonical guard risks exposing cross-org
data if the view is queried under a tenant session.

**Gate definition:**

Before TECS 4B raises any view that JOINs `organizations`, the following verification must
be performed and recorded:

```sql
-- Required evidence query (read-only, no schema changes)
SELECT
  c.relrowsecurity     AS force_rls_enabled,
  c.relforcerowsecurity AS force_rls_forced,
  count(p.policyname)  AS policy_count,
  bool_or(p.permissive = 'RESTRICTIVE') AS has_restrictive_guard,
  bool_or(p.qual LIKE '%is_admin%') AS guard_includes_admin
FROM pg_class c
JOIN pg_policies p ON p.tablename = 'organizations' AND p.schemaname = 'public'
WHERE c.relname = 'organizations'
  AND c.relnamespace = 'public'::regnamespace
GROUP BY c.relrowsecurity, c.relforcerowsecurity;
```

**Decision tree:**

```
FORCE RLS = t AND has_restrictive_guard = t AND guard_includes_admin = t
  → ✅ PROCEED: include organizations JOIN in TECS 4B view definitions
  → Record verification output in TECS 4B governance section

FORCE RLS = f OR has_restrictive_guard = f
  → 🔴 STOP TECS 4B
  → Register new gap: G-025-ORGS-RLS-001
  → Raise separate RLS canonicalization TECS for organizations
  → TECS 4B deferred until gap closed; manufacturer fields removed from v1 scope
```

> **[ ] Approval required by Paresh** — D4 gate must be run and PASS recorded before TECS 4B begins.  
> Copilot will execute the verification query and record the result as part of TECS 4B preflight.

**Implementation TECS pointer:** TECS 4B preflight (§7)

---

### D5 — Node/Edge Vocabulary Enforcement (G-025-D)

**Problem:** `node_type` and `edge_type` are open TEXT with no DB CHECK constraint. Snapshot
view queries that filter on specific node types (e.g., `WHERE node_type = 'RAW_MATERIAL'`)
cannot guarantee correctness if application code writes variant values.

**Options:**

| Option | Description | v1 fit |
|--------|-------------|--------|
| A — Treat as opaque strings | Views pass `node_type`/`edge_type` through unchanged; no filtering by known values | ✅ Zero schema churn |
| B — Add CHECK constraint | `ALTER TABLE traceability_nodes ADD CHECK (node_type IN ('RAW_MATERIAL', 'PROCESSING', 'DISTRIBUTION', 'RETAIL'))` | 🔴 Schema migration; locks vocabulary; risks breaking existing data |
| C — Add Prisma enum | Schema.prisma enum → requires migration + Prisma regen | 🔴 Schema migration |

**Recommendation: Option A — opaque strings for v1**

Rationale: Adding a CHECK constraint now would require knowing the complete canonical vocabulary
(which is not documented in any enforcement-ready form) and would block INSERT of any node_type
not in the list. This is architecture work, not v1 view work. The view contract (§5) surfaces
`node_type` as TEXT; consumers apply their own filter logic. Vocabulary locking belongs in a
separate schema governance TECS if regulators require it.

> **No approval gate — decision is v1 default. Schema enforcement is deferred to v2+ scope.**

---

### D6 — Traversal Ordering and Cycle Strategy (G-025-E)

**Problem:** `traceability_edges` has no ordinal column. The recursive CTE must define deterministic
traversal order, a cycle guard, and a depth cap.

**Specified constraints for implementation:**

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Depth cap | `depth < 20` | Consistent with discovery doc CTE; textile supply chains realistically ≤ 6 hops; 20 is safe ceiling |
| Cycle guard strategy | Visited UUID array: `WHERE n.id != ALL(visited_path)` | Prevents infinite loop on cyclic graphs; avoids separate `pg_catalog.array_agg` overhead; standard PostgreSQL pattern |
| Primary order | `depth ASC` | Root-first presentation aligned with forward lineage read |
| Tiebreaker order | `created_at ASC` | Among edges at the same depth, insertion order determines presentation |
| Traversal direction | Forward (downstream) by default for DPP export | Root = earliest supply-chain stage (RAW_MATERIAL); leaf = RETAIL |
| Reverse access | Supported by existing `traceability_edges_org_to_idx` index; exposed optionally in `dpp_snapshot_lineage_v1` as `traversal_direction` parameter or second view | Defer second view to TECS 4B decision |

**Cycle guard CTE skeleton (illustrative only — not SQL for execution):**

```
anchor:
  SELECT id, ..., ARRAY[id] AS visited_path, 0 AS depth
  FROM traceability_nodes WHERE id = $root

recursive:
  SELECT n.id, ..., visited_path || n.id, depth + 1
  FROM traceability_nodes n
  JOIN traceability_edges e ON e.from_node_id = prev.id AND e.to_node_id = n.id
  WHERE n.id != ALL(prev.visited_path)     -- cycle guard
    AND depth < 20                          -- depth cap
    AND n.org_id = prev.org_id             -- RLS co-enforcement
```

> **No approval gate — traversal parameters locked. Implementation uses these exact values in TECS 4B.**

---

## 5. Proposed View Contract (v1)

> Views are defined here as **column contracts only**. No SQL is written in this document.
> SQL definitions belong to TECS 4B.

All three views:
- Scope: `PUBLIC` schema
- Security: `SECURITY INVOKER` (not DEFINER — see §6)
- Role: accessible to `texqtic_app`
- RLS: inherited from base tables (FORCE RLS fires automatically)

---

### 5.1 `dpp_snapshot_products_v1`

**One row per `traceability_node` within the org.**

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `node_id` | `UUID` | `traceability_nodes.id` | PK / join key |
| `org_id` | `UUID` | `traceability_nodes.org_id` | RLS key — automatically filtered |
| `batch_id` | `TEXT` | `traceability_nodes.batch_id` | Primary product identifier for DPP |
| `node_type` | `TEXT` | `traceability_nodes.node_type` | Open string per D5 |
| `meta` | `JSONB` | `traceability_nodes.meta` | Extensible passthrough |
| `visibility` | `TEXT` | `traceability_nodes.visibility` | `TENANT` or `SHARED`; filter = TENANT for v1 |
| `geo_hash` | `TEXT` | `traceability_nodes.geo_hash` | Nullable |
| `manufacturer_name` | `TEXT` | `organizations.legal_name` | Conditional on D4 gate PASS |
| `manufacturer_jurisdiction` | `TEXT` | `organizations.jurisdiction` | Conditional on D4 gate PASS |
| `manufacturer_registration_no` | `TEXT` | `organizations.registration_no` | Nullable; conditional on D4 |
| `node_created_at` | `TIMESTAMPTZ` | `traceability_nodes.created_at` | |
| `node_updated_at` | `TIMESTAMPTZ` | `traceability_nodes.updated_at` | |

> If D4 gate FAILS: `manufacturer_*` columns are removed from this view and G-025-ORGS-RLS-001
> is registered. The view proceeds without org JOIN.

---

### 5.2 `dpp_snapshot_lineage_v1`

**One row per edge in the forward traversal from a given root node.**  
This view is parameterized — it requires a `root_node_id` input. In SQL this is achieved
via a PL/pgSQL function wrapper or a view with a `WHERE` clause on a session-settable
variable. Implementation strategy for parameterization is a TECS 4B decision.

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `root_node_id` | `UUID` | CTE anchor input | The node representing the product being traced |
| `org_id` | `UUID` | `traceability_nodes.org_id` | RLS key |
| `depth` | `INT` | CTE computed | 0 = root; increases downstream |
| `from_node_id` | `UUID` | `traceability_edges.from_node_id` | |
| `from_batch_id` | `TEXT` | `traceability_nodes.batch_id` (from) | |
| `from_node_type` | `TEXT` | `traceability_nodes.node_type` (from) | |
| `to_node_id` | `UUID` | `traceability_edges.to_node_id` | |
| `to_batch_id` | `TEXT` | `traceability_nodes.batch_id` (to) | |
| `to_node_type` | `TEXT` | `traceability_nodes.node_type` (to) | |
| `edge_type` | `TEXT` | `traceability_edges.edge_type` | |
| `transformation_id` | `TEXT` | `traceability_edges.transformation_id` | Nullable |
| `edge_created_at` | `TIMESTAMPTZ` | `traceability_edges.created_at` | |
| `visited_path` | `UUID[]` | CTE cycle guard array | Internal; may be excluded from public contract |

---

### 5.3 `dpp_snapshot_certifications_v1`

**One row per certification for the org (org-level only in v1).**

> ⚠️ **This view is org-level until TECS 4A (D1) is implemented.** The `node_id` column
> will be `NULL` for all rows until the `node_certifications` join table is created.
> This is a known and documented design limitation, not a bug.

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `certification_id` | `UUID` | `certifications.id` | PK |
| `org_id` | `UUID` | `certifications.org_id` | RLS key |
| `certification_type` | `TEXT` | `certifications.certification_type` | e.g., `GOTS`, `OEKO_TEX` |
| `lifecycle_state_name` | `TEXT` | `lifecycle_states.name` (JOIN) | e.g., `APPROVED`, `REVOKED` |
| `lifecycle_state_id` | `UUID` | `certifications.lifecycle_state_id` | FK ref |
| `is_active` | `BOOLEAN` | Derived: `lifecycle_state_name NOT IN ('REVOKED', 'EXPIRED')` | Convenience field |
| `issued_at` | `TIMESTAMPTZ` | `certifications.issued_at` | Nullable |
| `expires_at` | `TIMESTAMPTZ` | `certifications.expires_at` | Nullable |
| `is_expired` | `BOOLEAN` | Derived: `expires_at IS NOT NULL AND expires_at < now()` | Convenience field |
| `node_id` | `UUID` | `node_certifications.node_id` (NULL until TECS 4A) | Post-TECS-4A linkage |
| `cert_created_at` | `TIMESTAMPTZ` | `certifications.created_at` | |
| `cert_updated_at` | `TIMESTAMPTZ` | `certifications.updated_at` | |

---

## 6. RLS & Security Model

### 6.1 View Security Mode

All views defined in TECS 4B **MUST** be created as `SECURITY INVOKER` (the PostgreSQL
default for views). `SECURITY DEFINER` is explicitly prohibited for DPP views because:

- `SECURITY DEFINER` would execute the view as the view owner's role, bypassing the
  `texqtic_app` RLS context stack.
- All three source tables have `FORCE ROW LEVEL SECURITY` — this requires the session
  `app.org_id` / `app.is_admin` GUCs to be set correctly. A DEFINER view that runs as
  a different role breaks this chain.
- TexQtic doctrine (v1.4) prohibits `BYPASSRLS` patterns and any weakening of the
  canonical tenant isolation model.

For PG15+, views may be explicitly created with `WITH (security_invoker = true)` to
make this the default — TECS 4B should use this option if the Supabase Postgres version
supports it.

### 6.2 Base Table RLS Confirmation

As confirmed in discovery (GOVERNANCE-SYNC-078):

| Table | FORCE RLS | Guard | Tenant Predicate | Admin Arm |
|-------|-----------|-------|------------------|-----------|
| `traceability_nodes` | ✅ | RESTRICTIVE FOR ALL TO `texqtic_app` | `org_id = app.current_org_id()` | `app.is_admin='true'` |
| `traceability_edges` | ✅ | RESTRICTIVE FOR ALL TO `texqtic_app` | `org_id = app.current_org_id()` | `app.is_admin='true'` |
| `certifications` | ✅ | RESTRICTIVE FOR ALL TO `texqtic_app` | `org_id = app.current_org_id()` | `app.is_admin='true'` |
| `organizations` | ⚠️ Unconfirmed | — | — | — |

### 6.3 View Grants

View-level grants are not defined in this document — they belong in TECS 4B where the
`CREATE VIEW` SQL is authored. At minimum:

```
GRANT SELECT ON dpp_snapshot_products_v1     TO texqtic_app;
GRANT SELECT ON dpp_snapshot_lineage_v1      TO texqtic_app;
GRANT SELECT ON dpp_snapshot_certifications_v1 TO texqtic_app;
```

No other roles receive grants on DPP views in v1. `app_user` grants are a TECS 4B decision.

### 6.4 `node_certifications` RLS (post-TECS-4A)

The `node_certifications` join table (D1 — Option C) must receive the canonical Wave 3
Tail RLS pattern:

- `FORCE ROW LEVEL SECURITY`
- 1 RESTRICTIVE guard (FOR ALL TO `texqtic_app`):
  `app.require_org_context() OR app.bypass_enabled() OR app.is_admin='true'`
- PERMISSIVE tenant SELECT (`org_id = app.current_org_id()`)
- PERMISSIVE tenant INSERT (WITH CHECK same)
- PERMISSIVE admin SELECT (`app.is_admin='true'`)
- No UPDATE policy (join table is append-only; retract = delete)
- PERMISSIVE tenant DELETE (`org_id = app.current_org_id()`) — needed to detach a cert from a node

---

## 7. TECS Breakdown for Implementation

> These TECS are future work. None are raised in this document. All require explicit
> sign-off before implementation begins.

---

### TECS 4A — Schema Linkage (`node_certifications` join table)

**Type:** Migration  
**Prerequisite:** D1 approval from Paresh  
**Allowlist (Modify):**
- `server/prisma/schema.prisma`
- `server/prisma/migrations/<timestamp>_g025_node_certifications/migration.sql`
- `governance/gap-register.md`
- `docs/governance/IMPLEMENTATION-TRACKER-2026-Q2.md`
- `governance/wave-execution-log.md`

**What it does:**
1. Create `public.node_certifications` per D1 Option C shape (§4 D1)
2. Create indexes: `UNIQUE (org_id, node_id, certification_id)`, `INDEX (org_id, node_id)`, `INDEX (org_id, certification_id)`
3. ENABLE + FORCE RLS per §6.4 pattern
4. `prisma db pull` → `prisma generate`
5. Verifier DO block (FORCE RLS=t, guard count, tenant/admin/delete policy count)

**Gates:**
- SQL applied via `psql "$DATABASE_URL" -f migration.sql` (EXIT 0)
- DO block VERIFIER PASS
- `pnpm -C server exec prisma migrate resolve --applied <migration_name>` (EXIT 0)
- `pnpm -C server exec prisma db pull` (schema updated)
- `pnpm -C server exec prisma generate` (EXIT 0)
- `pnpm run typecheck` (EXIT 0)
- `pnpm run lint` (0 errors)

**Stop conditions:**
- `certifications` or `traceability_nodes` schema does not match expected FK targets → STOP
- Verifier DO block raises EXCEPTION → STOP

**Closes:** G-025-B (partial — FK linkage established; issuing_body/cert_number remain G-025-B-2)

---

### TECS 4B — Views Implementation

**Type:** Migration (SQL view DDL — no Prisma model needed for views)  
**Prerequisites:**
- D2 approval (field surface)
- D4 gate PASS (`organizations` RLS verified)
- TECS 4A complete (if `dpp_snapshot_certifications_v1` is to include `node_id`)
- TECS 4A may be skipped: views proceed without `node_id` in `dpp_snapshot_certifications_v1`

**Allowlist (Modify):**
- `server/prisma/migrations/<timestamp>_g025_dpp_snapshot_views/migration.sql`
- `server/prisma/ops/dpp_snapshot_views_grants.sql`
- `governance/gap-register.md`
- `docs/governance/IMPLEMENTATION-TRACKER-2026-Q2.md`
- `governance/wave-execution-log.md`

**What it does:**
1. D4 gate: run `organizations` RLS verification query; record output; branch on PASS/FAIL
2. Create `dpp_snapshot_products_v1` (SECURITY INVOKER; columns per §5.1)
3. Create `dpp_snapshot_lineage_v1` (SECURITY INVOKER; recursive CTE per D6 traversal spec)
4. Create `dpp_snapshot_certifications_v1` (SECURITY INVOKER; org-level until TECS 4A; `node_id` NULL or via `node_certifications` JOIN if 4A complete)
5. GRANT SELECT on all three views TO `texqtic_app`
6. Verifier DO block: confirm all 3 views present in `information_schema.views`

**Gates:**
- D4 organizations RLS verification output recorded (PASS required)
- SQL applied via `psql "$DATABASE_URL" -f migration.sql` (EXIT 0)
- DO block VERIFIER PASS
- `psql "$DATABASE_URL" -c "SELECT * FROM dpp_snapshot_products_v1 LIMIT 0"` → no error
- `psql "$DATABASE_URL" -c "SELECT * FROM dpp_snapshot_certifications_v1 LIMIT 0"` → no error
- `pnpm run typecheck` (EXIT 0)
- `pnpm run lint` (0 errors)

**Stop conditions:**
- D4 gate FAILS → STOP; register G-025-ORGS-RLS-001; remove org JOIN from view definitions; re-raise reduced TECS 4B
- Recursive CTE produces errors → STOP; report SQL error; do not apply partial migration

**Closes:** G-025-B (fully, if TECS 4A preceded); G-025-D (views accept opaque strings per D5); G-025-F (via D4 gate); G-025-E (via D6 traversal spec)

---

### TECS 4C — API Route Exposure (Optional)

**Type:** server/src changes  
**Prerequisites:** TECS 4B complete  
**Allowlist (Modify):**
- `server/src/routes/tenant.ts` (or a new `server/src/routes/traceability.ts`)
- `server/src/services/dpp.service.ts` (new)
- `governance/gap-register.md`
- `docs/governance/IMPLEMENTATION-TRACKER-2026-Q2.md`
- `governance/wave-execution-log.md`

**What it does:**
- `GET /api/tenant/dpp/products` → queries `dpp_snapshot_products_v1`
- `GET /api/tenant/dpp/lineage/:nodeId` → queries `dpp_snapshot_lineage_v1`
- `GET /api/tenant/dpp/certifications` → queries `dpp_snapshot_certifications_v1`
- All routes: `requireValidJwt` + `withDbContext(tenant)` (canonical auth pattern)
- All routes: `writeAuditLog` read-audit entry (existing control-plane audit pattern applied to tenant plane)

**Gates:** typecheck EXIT 0; lint EXIT 0; curl smoke tests; read-audit entries confirmed

**Stop conditions:** Breaking change to existing tenant routes → STOP; report conflict

---

### TECS 4D — UI / Export Surfaces (Optional)

**Type:** Frontend changes  
**Prerequisites:** TECS 4C complete  
**Allowlist (Modify):**
- `components/Tenant/DPPPassport.tsx` (new)
- `services/dppService.ts` (new)
- `App.tsx` (routing addition only)
- Governance docs

**What it does:**
- Read-only DPP passport display panel (product identity + lineage graph + cert list)
- Optional PDF/JSON export surface for regulator submission
- No write paths; no new backend state

**Gates:** typecheck EXIT 0; lint EXIT 0; visual smoke test

---

## 8. Open Gaps Register

| Gap ID | Description | v1 status | Closing TECS |
|--------|-------------|-----------|--------------|
| G-025-A | No `suppliers` / `facilities` / `product_batches` tables | 🔵 v1 Deferred | v2 scope — new gap TECS required |
| G-025-B | No FK from `certifications` to `traceability_nodes` | 🟠 v1 Required (D1) | TECS 4A |
| G-025-B-2 | No `issuing_body`, `cert_number`, `external_reference` on `certifications` | 🔵 v1 Deferred | Separate `certifications` extension TECS |
| G-025-C | No `lineage_hash` / `chain_id` | 🔵 v1 Deferred | v2 cryptographic model TECS |
| G-025-D | No DB enum enforcement on `node_type` / `edge_type` | 🟢 v1 Resolved (D5: opaque strings) | TECS 4B (by design — no schema change) |
| G-025-E | No ordinal column on `traceability_edges` | 🟢 v1 Resolved (D6: `created_at` + depth) | TECS 4B (traversal spec locked) |
| G-025-F | `organizations` RLS shape unconfirmed | 🟠 v1 Gate Required (D4) | TECS 4B preflight — gate must PASS |
| G-025-G | `visibility='SHARED'` cross-org traversal not implemented | 🔵 v1 Deferred | v2 scope — new design TECS required |
| G-025-H | `catalog_items` FK scope mismatch (`tenant_id` vs `org_id`) | 🔵 v1 Deferred | v2 scope — catalog-traceability linking TECS |

---

## Approval Checklist

| Decision | Status | Required By |
|----------|--------|-------------|
| D1 — Cert linkage: Option C (join table `node_certifications`) | **[ ] Pending Paresh approval** | Before TECS 4A |
| D2 — v1 regulatory field surface | **[ ] Pending Paresh approval** | Before TECS 4B |
| D3 — Option A (Live Views) for v1 | Locked — no approval gate | — |
| D4 — `organizations` RLS gate pass | **[ ] Pending verification** | TECS 4B preflight |
| D5 — Opaque strings for v1 vocabulary | Locked — no approval gate | — |
| D6 — Traversal spec (depth 20, visited array, depth+created_at order) | Locked — no approval gate | — |

---

*Document produced by: GitHub Copilot — G-025-DPP-SNAPSHOT-VIEWS-DESIGN-001*  
*No schema changes. No view creation. No migrations. Design anchor only.*  
*Governance sync: GOVERNANCE-SYNC-079 — 2026-03-04*
