# TECS-CATALOG-VISIBILITY-POLICY-STORAGE-001 — Durable Catalog Visibility Policy Storage Design v1

> **⚠️ DESIGN ONLY — NO IMPLEMENTATION AUTHORIZED**
>
> This artifact is a planning document. No application code, Prisma schema edits, SQL migrations,
> seed scripts, route handlers, frontend files, or `.env` modifications are included.
> Each implementation slice requires explicit authorization before opening.

**Unit ID:** TECS-CATALOG-VISIBILITY-POLICY-STORAGE-001  
**Title:** Durable Catalog Visibility Policy Storage — Supplier Approval-Gated Catalogue Access  
**Mode:** DESIGN ONLY  
**Status:** `DESIGN_DRAFT`  
**Design date:** 2026-04-30  
**Author:** GitHub Copilot (TECS SAFE-WRITE Mode — Design / Reporting Only)  
**Predecessor units:**  
- `TECS-B2B-BUYER-CATALOG-PDP-001` — VERIFIED_COMPLETE  
- `TECS-B2B-BUYER-PRICE-DISCLOSURE-001` — VERIFIED_COMPLETE  
- `TECS-B2B-BUYER-RFQ-INTEGRATION-001` — VERIFIED_COMPLETE  
- `TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001` — VERIFIED_COMPLETE  
- `TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001` — DESIGN_DRAFT  
- `TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001` — SEED_COMPLETE (Slice C-ALT commit `7ef508f`)

**Blocking report:** `TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001-SLICE-C-ALT-QA-SEED-EVIDENCE.md`  
Scenarios E2E-07, E2E-08, E2E-09 blocked by `BLOCKED_BY_CURRENT_PUBLICATION_POSTURE_SCHEMA`.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Candidate Storage Models](#3-candidate-storage-models)
4. [Recommended Model](#4-recommended-model)
5. [Decision Matrix — Policy × Relationship → Outcome](#5-decision-matrix--policy--relationship--outcome)
6. [API / Response Shaping Requirements](#6-api--response-shaping-requirements)
7. [Route Integration Points](#7-route-integration-points)
8. [Tests Required](#8-tests-required)
9. [QA Fixture Update Plan](#9-qa-fixture-update-plan)
10. [Migration Strategy](#10-migration-strategy)
11. [Rollout Strategy](#11-rollout-strategy)
12. [Explicit Non-Goals](#12-explicit-non-goals)
13. [Proposed Implementation Slices](#13-proposed-implementation-slices)
14. [Open Questions](#14-open-questions)

---

## 1. Executive Summary

The Slice C-ALT QA seed execution (commit `7ef508f`) exposed a structural gap between the
service-layer type system and the database storage contract:

- The service layer (`relationshipAccess.types.ts`) defines `CatalogVisibilityPolicy` with
  `APPROVED_BUYER_ONLY`, `HIDDEN`, and `REGION_CHANNEL_SENSITIVE` — types actively tested in
  the unit and isolation test suites.
- The database constraint (`catalog_items_publication_posture_check`) only permits
  `PRIVATE_OR_AUTH_ONLY`, `B2B_PUBLIC`, `B2C_PUBLIC`, `BOTH` — a vocabulary designed for
  **public projection posture** (B2B discovery surface eligibility), not access-control gating.
- The route resolver (`getTrustedCatalogVisibilityPolicyForRoute`) reads
  `catalogVisibilityPolicy` or `catalog_visibility_policy` from the Prisma result, but neither
  field is persisted in `catalog_items`. The resolver always returns `undefined` in production;
  the service degrades to a default allow posture for all authenticated buyers.

The consequence: three QA scenarios that require `APPROVED_BUYER_ONLY` or `HIDDEN`
visibility policy at DB level are currently impossible to satisfy without a governed schema
change. The workaround applied in Slice C-ALT (mapping `APPROVED_BUYER_ONLY → B2B_PUBLIC`)
is intentionally lossy and must not become permanent.

This unit defines the design contract for introducing **durable catalog visibility policy
storage** as a governed, separate column alongside the existing `publication_posture` column,
preserving backward compatibility and enabling the full approval-gated catalog access model
already implemented at the service layer.

**Core recommendation:** Add a nullable `catalog_visibility_policy_mode VARCHAR(30)` column to
`catalog_items`. Keep `publication_posture` for its existing public-projection semantics.
Resolve visibility policy by reading `catalog_visibility_policy_mode` first; fall back to a
mapping from `publication_posture` if NULL. This preserves all existing behavior with zero
breaking changes and unlocks the full `CatalogVisibilityPolicy` vocabulary.

---

## 2. Current State Analysis

### 2.1 Schema Reality

**`catalog_items.publication_posture` (currently the only visibility column)**

| DB value | Semantic intent | Allowed by constraint |
|---|---|---|
| `PRIVATE_OR_AUTH_ONLY` | Authenticated buyer access; no public B2B discovery | ✅ |
| `B2B_PUBLIC` | Eligible for B2B public catalog projection | ✅ |
| `B2C_PUBLIC` | Eligible for B2C public projection | ✅ |
| `BOTH` | Eligible for both B2B and B2C projection | ✅ |
| `APPROVED_BUYER_ONLY` | Approved-buyer gate | ❌ NOT IN CONSTRAINT |
| `HIDDEN` | Supplier-private, no buyer exposure | ❌ NOT IN CONSTRAINT |

The constraint is defined in migration
`20260422000000_b2b_public_projection_preconditions/migration.sql` (lines 38-46). It is a
hard PostgreSQL CHECK constraint and cannot be bypassed at application layer.

**`organizations.publication_posture` (org-level counterpart)**

Same constraint vocabulary (`PRIVATE_OR_AUTH_ONLY | B2B_PUBLIC | B2C_PUBLIC | BOTH`). Also
serves as a tenant-level public projection gate (Gate B in the migration design authority).
The `APPROVED_BUYER_ONLY` and `HIDDEN` values are equally absent here and would require a
parallel governed decision if supplier-level defaults are added in a future slice.

### 2.2 Service-Layer Reality

**`CatalogVisibilityPolicy` type** (in `server/src/services/relationshipAccess.types.ts`):

```ts
export type CatalogVisibilityPolicy =
  | 'PUBLIC'                    // All authenticated buyers see product
  | 'AUTHENTICATED_ONLY'        // Only logged-in buyers see product
  | 'APPROVED_BUYER_ONLY'       // Only relationship-APPROVED buyers see product
  | 'HIDDEN'                    // Supplier-private; no buyer exposure
  | 'REGION_CHANNEL_SENSITIVE'; // Future boundary; not implemented in Slice A
```

This type is fully implemented in `relationshipAccess.service.ts` and tested in
`relationshipCatalogVisibility.test.ts` and `relationshipTenantIsolation.test.ts`.
The evaluator correctly handles all five values including `APPROVED_BUYER_ONLY` and
`HIDDEN` with the expected deny semantics.

**Route resolver** (`tenant.ts` lines 92-101):

```ts
function getTrustedCatalogVisibilityPolicyForRoute(
  item: Record<string, unknown>,
): unknown {
  return (
    item.catalogVisibilityPolicy ??
    item.catalog_visibility_policy ??
    item.visibilityTier ??
    item.visibility_tier ??
    undefined
  );
}
```

The function reads from the Prisma query result. None of the four field names it checks
(`catalogVisibilityPolicy`, `catalog_visibility_policy`, `visibilityTier`, `visibility_tier`)
are persisted in `catalog_items`. At runtime, this function always returns `undefined`.
The service evaluator then treats `undefined` as equivalent to `AUTHENTICATED_ONLY` (its
default allow posture), meaning all `APPROVED_BUYER_ONLY` and `HIDDEN` enforcement is
currently a no-op in production despite being correctly implemented at the service layer.

### 2.3 QA Fixture Reality (Post Slice C-ALT)

After the Option A mapping applied in commit `7ef508f`, the current QA fixture distribution
across `catalog_items.publication_posture` is:

| Posture value | Items | Source |
|---|---|---|
| `B2B_PUBLIC` | 6 (of 10 per supplier) | `APPROVED_BUYER_ONLY → B2B_PUBLIC` (Option A lossy mapping) |
| `PRIVATE_OR_AUTH_ONLY` | 4 (of 10 per supplier) | `HIDDEN → PRIVATE_OR_AUTH_ONLY` (Option A lossy mapping) |
| `B2B_PUBLIC` | 5 (qa-b2b patches) | Direct assignment |

Scenarios E2E-07 (approved-only hidden from unapproved buyer), E2E-08 (hidden item excluded
from browse), and E2E-09 (RFQ denied for approved-only item) are **structurally blocked**
until a separate column allows `APPROVED_BUYER_ONLY` and `HIDDEN` to be stored without
conflicting with the public-projection constraint.

### 2.4 Mapping Between Vocabularies

The two vocabularies serve orthogonal concerns that must remain independent:

| Column | Semantic concern | Who reads it |
|---|---|---|
| `publication_posture` | Public-projection eligibility (Gate B) | B2B/B2C catalog discovery engine, org-level visibility rules |
| `catalog_visibility_policy_mode` (proposed) | Buyer access-control gate (relationship-enforced) | Catalog browse route, PDP route, RFQ prefill gate |

An item can be `B2B_PUBLIC` (discoverable by all authenticated buyers) while having
`catalog_visibility_policy_mode = APPROVED_BUYER_ONLY` (price and RFQ gated by relationship).
These are not contradictory — they represent different layers of the access model.

### 2.5 AI Safety Note

`publicationPosture` is constitutionally excluded from all AI inference paths
(`aiDataContracts.ts` line 71; `aiContextPacks.ts` lines 65, 117, 150, 319).
The same exclusion must apply to `catalog_visibility_policy_mode` — it controls supplier
commercial interests and relationship policy and must never enter any AI embedding, context
pack, or vector signal.

---

## 3. Candidate Storage Models

Four candidate models are evaluated below.

---

### Model A — Extend the `publication_posture` CHECK constraint (Merge)

**Approach:** Drop the existing `catalog_items_publication_posture_check` constraint and
replace it with an expanded vocabulary that includes `APPROVED_BUYER_ONLY`, `HIDDEN`,
`RELATIONSHIP_GATED`, and optionally `REGION_CHANNEL_SENSITIVE`.

**Schema sketch:**
```sql
-- Drop old constraint
ALTER TABLE catalog_items DROP CONSTRAINT catalog_items_publication_posture_check;
-- Re-add with expanded vocabulary
ALTER TABLE catalog_items ADD CONSTRAINT catalog_items_publication_posture_check
  CHECK (publication_posture IN (
    'PRIVATE_OR_AUTH_ONLY', 'B2B_PUBLIC', 'B2C_PUBLIC', 'BOTH',
    'APPROVED_BUYER_ONLY', 'HIDDEN', 'RELATIONSHIP_GATED'
  ));
```

**Pros:**
- No new column; minimal schema surface change.
- Existing seed scripts, route queries, and Prisma field reference `publicationPosture` need
  minimal adjustment.

**Cons:**
- Merges two orthogonal concerns into a single column. A product may be `B2B_PUBLIC`
  (publicly discoverable) AND `APPROVED_BUYER_ONLY` (access-gated) simultaneously, which
  a single column cannot express without combinatorial values (e.g., `B2B_PUBLIC_GATED`).
- The `publication_posture` column is read by the public B2B projection precondition gate
  (the tenant/org Gate B). Mixing access-control values into it breaks Gate B semantics and
  may cause catalog browse routes to include or exclude items incorrectly.
- The same constraint exists on `organizations.publication_posture`. Expanding it there
  would require a separate governed decision for org-level visibility.
- Route consumers of `publication_posture` (catalog discovery, public projection eligibility)
  would need defensive checks against the new values — coupling two independent concerns.
- Backward compatibility risk: existing Prisma queries selecting `active = true` items and
  filtering by `publication_posture = 'B2B_PUBLIC'` would silently miss `APPROVED_BUYER_ONLY`
  items regardless of the buyer's relationship state.

**Verdict: NOT RECOMMENDED.** The semantic merge creates an unresolvable coupling between
public-projection eligibility and access-control gating.

---

### Model B — Replace `publication_posture` with a single unified policy column (Replace)

**Approach:** Migrate `publication_posture` to a new unified `visibility_policy_mode` column
that encodes both public-projection posture and access-control semantics using a richer
value set. Deprecate and eventually drop `publication_posture`.

**Schema sketch:**
```sql
ALTER TABLE catalog_items
  ADD COLUMN visibility_policy_mode VARCHAR(30)
    NOT NULL DEFAULT 'AUTHENTICATED_ONLY'
    CHECK (visibility_policy_mode IN (
      'PUBLIC', 'AUTHENTICATED_ONLY', 'APPROVED_BUYER_ONLY',
      'HIDDEN', 'RELATIONSHIP_GATED', 'REGION_CHANNEL_SENSITIVE'
    ));
```

**Pros:**
- Single column, single truth. Service-layer `CatalogVisibilityPolicy` type aligns directly
  with DB values without a mapping layer.
- No ambiguity about which column is authoritative for access control.

**Cons:**
- Requires a data migration from `publication_posture` vocabulary to `visibility_policy_mode`
  vocabulary for all existing rows. The mapping is non-trivial for `B2C_PUBLIC` and `BOTH`
  which have no equivalent in `CatalogVisibilityPolicy`.
- Breaks the Gate B public-projection model. The existing migration and governance authority
  (`TEXQTIC-B2B-PUBLIC-PROJECTION-PRECONDITION-DESIGN-v1.md`) explicitly separates Gate A
  (tenant eligibility) and Gate B (object-level projection posture). Replacing Gate B with
  access-control semantics collapses a governed architectural boundary.
- All existing route consumers, Prisma selects, and tests that reference `publicationPosture`
  must be updated — high surface area change for a design-only unit scope.
- `organizations.publication_posture` would diverge from `catalog_items`, creating an
  inconsistency in the Gate B model.

**Verdict: NOT RECOMMENDED.** The migration cost and governance boundary violation outweigh
the cleanliness benefit.

---

### Model C — Separate column on `catalog_items` (Additive — Recommended)

**Approach:** Add a new nullable `catalog_visibility_policy_mode VARCHAR(30)` column to
`catalog_items`. Keep `publication_posture` unchanged. Resolve the effective
`CatalogVisibilityPolicy` by reading `catalog_visibility_policy_mode` first; fall back to a
deterministic mapping from `publication_posture` if NULL.

**Schema sketch:**
```sql
ALTER TABLE catalog_items
  ADD COLUMN IF NOT EXISTS catalog_visibility_policy_mode VARCHAR(30)
  CHECK (catalog_visibility_policy_mode IS NULL OR catalog_visibility_policy_mode IN (
    'PUBLIC', 'AUTHENTICATED_ONLY', 'APPROVED_BUYER_ONLY',
    'HIDDEN', 'RELATIONSHIP_GATED'
  ));
```

`REGION_CHANNEL_SENSITIVE` is intentionally excluded from the CHECK constraint in the
initial migration. It is a future boundary only and must not be storable until that slice
is explicitly authorized.

**Fallback mapping from `publication_posture` when `catalog_visibility_policy_mode IS NULL`:**

| `publication_posture` | Resolved `CatalogVisibilityPolicy` |
|---|---|
| `B2B_PUBLIC` | `PUBLIC` |
| `B2C_PUBLIC` | `PUBLIC` |
| `BOTH` | `PUBLIC` |
| `PRIVATE_OR_AUTH_ONLY` | `AUTHENTICATED_ONLY` |

**Pros:**
- Zero breaking change. All existing rows have `catalog_visibility_policy_mode = NULL`
  and the fallback mapping preserves exactly current behavior.
- Orthogonal concerns remain separated. Gate B (`publication_posture`) serves the discovery
  engine; access-control policy (`catalog_visibility_policy_mode`) serves the relationship
  evaluator.
- Service-layer `CatalogVisibilityPolicy` values align directly to DB values without
  translation — `APPROVED_BUYER_ONLY`, `HIDDEN`, `RELATIONSHIP_GATED` are stored exactly.
- `getTrustedCatalogVisibilityPolicyForRoute` can be updated to read
  `item.catalogVisibilityPolicyMode ?? item.catalog_visibility_policy_mode` and the
  fallback logic can live in a pure resolver function.
- Nullable column with CHECK IS NULL OR allows the constraint to accept NULL gracefully
  without requiring a NOT NULL DEFAULT that would force every existing item through a
  data migration.
- Supplier-level default (`organizations.catalog_visibility_policy_mode`) can be added
  in a future slice if needed, without altering item-level storage.
- AI exclusion is straightforward: add the new field to the `AI_FORBIDDEN_FIELDS` set in
  `aiDataContracts.ts`.

**Cons:**
- Two columns to reason about instead of one. Route consumers must understand the fallback
  resolution logic.
- The fallback resolver must be the single authoritative resolution path; ad hoc consumers
  must not re-implement it.
- `REGION_CHANNEL_SENSITIVE` cannot be stored and requires a future governed migration to
  add to the CHECK constraint.

**Verdict: RECOMMENDED.** See Section 4 for the detailed model specification.

---

### Model D — JSONB policy bag on `catalog_items` (Policy Object)

**Approach:** Add a nullable `visibility_policy_json JSONB` column to `catalog_items` that
stores a structured policy bag: `{ mode, expiresAt, channelRestrictions, ... }`.

**Pros:**
- Extensible without schema changes for new policy attributes.
- Future fields (`expiresAt`, `channelKey`, `regionCode`) can be added without migrations.

**Cons:**
- JSONB is schemaless. CHECK constraints cannot validate policy structure without custom
  PL/pgSQL functions. Malformed policy bags are storable.
- Prisma does not generate typed accessors for JSONB fields. Service consumers receive
  `unknown` or `Record<string, unknown>` requiring runtime validation at every call site.
- `catalog_items` already has a `stageAttributes` JSONB column for stage-specific metadata.
  Adding another JSONB column for access policy increases the schema's informal surface area.
- Query performance: filtering or indexing on JSONB values requires GIN indexes and
  cannot use btree range scans — a concern for catalog browse at scale.
- The primary need is a simple, deterministic scalar value (`APPROVED_BUYER_ONLY`, `HIDDEN`).
  JSONB is over-engineering for a single-dimension policy mode.

**Verdict: NOT RECOMMENDED.** Over-engineered for current requirements. Deferred as
an option for Slice H if policy dimensions multiply.

---

## 4. Recommended Model

### 4.1 Model C — Separate `catalog_visibility_policy_mode` Column

**Canonical column definition:**

```
Table: catalog_items
Column: catalog_visibility_policy_mode
Type: VARCHAR(30)
Nullable: TRUE (no default)
Constraint: CHECK (
  catalog_visibility_policy_mode IS NULL OR
  catalog_visibility_policy_mode IN (
    'PUBLIC',
    'AUTHENTICATED_ONLY',
    'APPROVED_BUYER_ONLY',
    'HIDDEN',
    'RELATIONSHIP_GATED'
  )
)
```

**Allowed values:**

| Value | Semantic | Relationship required | Notes |
|---|---|---|---|
| `NULL` | Defer to `publication_posture` fallback mapping | No | Safe default; preserves existing behavior for all current items |
| `PUBLIC` | All authenticated buyers see item | No | Explicit override to broadest access; supersedes `publication_posture` |
| `AUTHENTICATED_ONLY` | Logged-in buyers only | No | Explicit same-as-default; useful for documents that need explicit audit trail |
| `APPROVED_BUYER_ONLY` | Only relationship-APPROVED buyers | Yes (`APPROVED`) | Gated; unapproved buyers receive non-disclosing denial |
| `HIDDEN` | No buyer exposure; supplier-internal | N/A | Not returned in catalog browse or PDP; non-disclosing 404 |
| `RELATIONSHIP_GATED` | Gated by active (non-expired, non-revoked) relationship | Yes (any non-terminal) | Permits APPROVED; blocks NONE, REJECTED, BLOCKED, SUSPENDED, EXPIRED, REVOKED |

**NOT storable in this slice:**

| Value | Status |
|---|---|
| `REGION_CHANNEL_SENSITIVE` | Future boundary — NOT in CHECK constraint for Slice B |

### 4.2 Fallback Resolver Contract

A single authoritative resolver function must be the only path to determine the effective
`CatalogVisibilityPolicy` for a given catalog item. No ad hoc column reads are permitted.

**Pure resolver logic (conceptual — not implementation):**

```
function resolveItemVisibilityPolicy(item):
  if item.catalog_visibility_policy_mode IS NOT NULL:
    return item.catalog_visibility_policy_mode  // explicit policy wins
  // Fallback: map from publication_posture
  switch item.publication_posture:
    case 'B2B_PUBLIC', 'B2C_PUBLIC', 'BOTH':
      return 'PUBLIC'
    case 'PRIVATE_OR_AUTH_ONLY':
      return 'AUTHENTICATED_ONLY'
    default:
      return 'AUTHENTICATED_ONLY'  // fail-safe for unknown values
```

This resolver replaces the ad hoc `getTrustedCatalogVisibilityPolicyForRoute` function and
must be the single call site for all route and service consumers.

### 4.3 Relationship Between `publication_posture` and `catalog_visibility_policy_mode`

The two columns are orthogonal. The table below shows valid combinations and their combined
semantics:

| `publication_posture` | `catalog_visibility_policy_mode` | Effective behavior |
|---|---|---|
| `B2B_PUBLIC` | `NULL` | Discoverable by all authenticated buyers |
| `B2B_PUBLIC` | `APPROVED_BUYER_ONLY` | Discoverable in search (B2B public), but item detail/price/RFQ gated to APPROVED buyers |
| `B2B_PUBLIC` | `HIDDEN` | INVALID — a B2B_PUBLIC item with HIDDEN policy is a contradiction; should be blocked by application validation |
| `PRIVATE_OR_AUTH_ONLY` | `NULL` | Authenticated buyers only; not on public B2B discovery |
| `PRIVATE_OR_AUTH_ONLY` | `APPROVED_BUYER_ONLY` | Authenticated-only discovery AND approved-buyer gate |
| `PRIVATE_OR_AUTH_ONLY` | `HIDDEN` | Hidden from all buyers regardless of auth/relationship |
| `PRIVATE_OR_AUTH_ONLY` | `RELATIONSHIP_GATED` | Authenticated-only discovery AND any active relationship required |

**Application-layer validation rule:** `publication_posture = B2B_PUBLIC` combined with
`catalog_visibility_policy_mode = HIDDEN` is semantically contradictory and MUST be rejected
at the service/route layer before persistence. This validation is application-enforced, not
a DB constraint, because the DB cannot express cross-column business rules as efficiently.

### 4.4 Supplier-Level Default (Future Slice Only)

The supplier organization (`organizations`) could carry an optional default
`catalog_visibility_policy_mode` that applies to all its items without an explicit item-level
override. This is explicitly deferred to a future slice. The item-level column NULL fallback
is sufficient for Slice B.

If implemented in a future slice, the resolution order would be:

1. `catalog_items.catalog_visibility_policy_mode` (explicit item policy) — highest priority
2. `organizations.catalog_visibility_policy_mode` (supplier default, if present) — future
3. Fallback mapping from `catalog_items.publication_posture` — lowest priority

---

## 5. Decision Matrix — Policy × Relationship → Outcome

The table below defines the deterministic access decision for every relevant combination of
`catalog_visibility_policy_mode` (effective resolved policy) and `RelationshipState`
(from `buyer_supplier_relationships`).

The `Outcome` column maps to the service evaluator result types already defined in
`relationshipAccess.types.ts`.

| Effective Policy | Relationship State | Outcome | Internal Denial Reason | Client-Safe Reason |
|---|---|---|---|---|
| `PUBLIC` | `NONE` | **ALLOW** | `NONE` | — |
| `PUBLIC` | `REQUESTED` | **ALLOW** | `NONE` | — |
| `PUBLIC` | `APPROVED` | **ALLOW** | `NONE` | — |
| `PUBLIC` | `REJECTED` | **ALLOW** | `NONE` | — |
| `PUBLIC` | `BLOCKED` | **ALLOW** | `NONE` | — |
| `AUTHENTICATED_ONLY` | any authenticated | **ALLOW** | `NONE` | — |
| `AUTHENTICATED_ONLY` | unauthenticated | **DENY** | `AUTH_REQUIRED` | `LOGIN_REQUIRED` |
| `APPROVED_BUYER_ONLY` | `APPROVED` | **ALLOW** | `NONE` | — |
| `APPROVED_BUYER_ONLY` | `NONE` | **DENY** | `RELATIONSHIP_REQUIRED` | `REQUEST_ACCESS` |
| `APPROVED_BUYER_ONLY` | `REQUESTED` | **DENY** | `RELATIONSHIP_PENDING` | `ACCESS_PENDING` |
| `APPROVED_BUYER_ONLY` | `REJECTED` | **DENY** | `RELATIONSHIP_REJECTED` | `ACCESS_DENIED` |
| `APPROVED_BUYER_ONLY` | `BLOCKED` | **DENY** | `RELATIONSHIP_BLOCKED` | `ACCESS_DENIED` |
| `APPROVED_BUYER_ONLY` | `SUSPENDED` | **DENY** | `RELATIONSHIP_SUSPENDED` | `ACCESS_DENIED` |
| `APPROVED_BUYER_ONLY` | `EXPIRED` | **DENY** | `RELATIONSHIP_EXPIRED` | `ACCESS_DENIED` |
| `APPROVED_BUYER_ONLY` | `REVOKED` | **DENY** | `RELATIONSHIP_REVOKED` | `ACCESS_DENIED` |
| `HIDDEN` | `APPROVED` | **DENY** | `CATALOG_HIDDEN` | `NOT_FOUND` |
| `HIDDEN` | `NONE` | **DENY** | `CATALOG_HIDDEN` | `NOT_FOUND` |
| `HIDDEN` | any other | **DENY** | `CATALOG_HIDDEN` | `NOT_FOUND` |
| `RELATIONSHIP_GATED` | `APPROVED` | **ALLOW** | `NONE` | — |
| `RELATIONSHIP_GATED` | `NONE` | **DENY** | `RELATIONSHIP_REQUIRED` | `REQUEST_ACCESS` |
| `RELATIONSHIP_GATED` | `REQUESTED` | **DENY** | `RELATIONSHIP_PENDING` | `ACCESS_PENDING` |
| `RELATIONSHIP_GATED` | `REJECTED` | **DENY** | `RELATIONSHIP_REJECTED` | `ACCESS_DENIED` |
| `RELATIONSHIP_GATED` | `BLOCKED` | **DENY** | `RELATIONSHIP_BLOCKED` | `ACCESS_DENIED` |
| `RELATIONSHIP_GATED` | `SUSPENDED` | **DENY** | `RELATIONSHIP_SUSPENDED` | `ACCESS_DENIED` |
| `RELATIONSHIP_GATED` | `EXPIRED` | **DENY** | `RELATIONSHIP_EXPIRED` | `ACCESS_DENIED` |
| `RELATIONSHIP_GATED` | `REVOKED` | **DENY** | `RELATIONSHIP_REVOKED` | `ACCESS_DENIED` |
| `REGION_CHANNEL_SENSITIVE` | any | **DENY** | `UNSUPPORTED_POLICY` | `NOT_AVAILABLE_IN_REGION` |

**Key invariants from this matrix:**

1. `HIDDEN` denies ALL buyers regardless of relationship state — including `APPROVED`.
   No approved relationship can override a supplier's explicit `HIDDEN` policy.
2. `APPROVED_BUYER_ONLY` denies based on all terminal and pending non-APPROVED states.
3. `RELATIONSHIP_GATED` has identical semantics to `APPROVED_BUYER_ONLY` in the initial
   implementation. Future slices may differentiate (e.g., any non-terminal state allows),
   but the initial implementation should treat them identically until differentiation is
   explicitly designed.
4. `REGION_CHANNEL_SENSITIVE` always denies with `UNSUPPORTED_POLICY` until that slice is
   authorized. No partial implementation is permitted.
5. Unauthenticated buyers are denied at the authentication gate before policy evaluation.
   The decision matrix above assumes authenticated buyer context.

---

## 6. API / Response Shaping Requirements

### 6.1 Catalog Browse (Buyer Catalog List)

- The `catalog_visibility_policy_mode` column value (resolved via the fallback resolver)
  is passed to `filterBuyerVisibleCatalogItems()` as the `getCatalogVisibilityPolicy`
  callback input.
- Items where the resolved policy results in `DENY` for the buyer's relationship state
  **must not appear** in the response array. They are silently excluded — no count
  adjustment, no `hiddenCount` field, no metadata leak.
- `count` in the response reflects only visible items.
- `nextCursor` pagination must not reveal the existence of hidden/gated items between
  visible ones.

### 6.2 PDP (Product Detail Page — Buyer View)

- If the resolved policy results in `DENY` for the buyer, the route must return HTTP 404
  (not 401 or 403). This is the non-disclosing denial posture already established in the
  relationship access design.
- The 404 response body must not include product name, supplier identity, policy reason,
  or any field that would leak the existence of the item.
- For `HIDDEN` items, the 404 posture applies even to `APPROVED` buyers.

### 6.3 RFQ Prefill / Submit Gate

- RFQ prefill reads the catalog item to build the prefill context. If the resolved policy
  denies the buyer at that moment, RFQ prefill must fail with `RELATIONSHIP_REQUIRED` or
  `CATALOG_HIDDEN` reason (internal) and a non-disclosing client error.
- The submit route independently validates the item's resolved policy and the buyer's
  current relationship state. Prefill approval does not carry forward as a submit bypass.
- RFQ items seeded with `APPROVED_BUYER_ONLY` policy must deny non-approved buyers at
  both prefill and submit stages independently.

### 6.4 Supplier Catalog Management (Internal)

- When a supplier manages their catalog items (CRUD), the `catalog_visibility_policy_mode`
  value should be readable and writable through the supplier route.
- The supplier route must validate that the combination of `publication_posture` and
  `catalog_visibility_policy_mode` is not semantically contradictory (e.g., `B2B_PUBLIC`
  + `HIDDEN` is invalid — see Section 4.3).
- Supplier-facing display should use the effective resolved policy label, not the raw
  `catalog_visibility_policy_mode` value, in any UI output.

### 6.5 Response Field Inclusion Policy

| Field | Buyer catalog response | Supplier catalog response | PDP | RFQ prefill |
|---|---|---|---|---|
| `catalog_visibility_policy_mode` | ❌ NEVER | ✅ Readable | ❌ NEVER | ❌ NEVER |
| `publication_posture` | ❌ NEVER | ✅ Readable | ❌ NEVER | ❌ NEVER |
| `catalogVisibilityPolicy` (resolved) | ❌ NEVER | ⚠️ Internal only | ❌ NEVER | ❌ NEVER |

Visibility policy internals must never be serialized to buyer-facing responses. The buyer
sees only the outcome (item present or absent; access allowed or not-found).

---

## 7. Route Integration Points

The following routes in `server/src/routes/tenant.ts` are affected. This section identifies
the integration points only — no code changes are authorized in this design unit.

### 7.1 `GET /buyer/supplier/:supplierOrgId/catalog` (Buyer Catalog Browse)

**Current behavior:** `getTrustedCatalogVisibilityPolicyForRoute()` reads from the Prisma
result. Since no matching field is present on `CatalogItem`, returns `undefined`.
`filterBuyerVisibleCatalogItems()` treats `undefined` as `AUTHENTICATED_ONLY` (allow for
all authenticated buyers).

**Required change (Slice C):** Include `catalogVisibilityPolicyMode` in the Prisma select
for catalog items. Pass through the fallback resolver before calling
`filterBuyerVisibleCatalogItems()`.

### 7.2 `GET /buyer/supplier/:supplierOrgId/catalog/:catalogItemId` (PDP — Buyer View)

**Current behavior:** Same as above. `undefined` → default allow.

**Required change (Slice C):** Read `catalogVisibilityPolicyMode` from the fetched item.
Apply the fallback resolver. If the resolved policy results in `DENY`, return HTTP 404
immediately without serializing item data.

### 7.3 `POST /rfq/draft` / `POST /rfq/submit` (RFQ Prefill and Submit)

**Current behavior:** RFQ prefill and submit do not evaluate `catalogVisibilityPolicy` at
the item level for access gating. They rely on the catalog item being `active = true` and
belonging to the supplier tenant.

**Required change (Slice D):** Add item-level policy gate to RFQ prefill resolution and
submit validation. If the resolved policy is `HIDDEN` or the buyer's relationship does not
satisfy `APPROVED_BUYER_ONLY` / `RELATIONSHIP_GATED`, deny the RFQ action with a safe error.

### 7.4 Supplier Catalog Item Create / Update Routes

**Current behavior:** Prisma `create`/`update` on `catalog_items` does not include
`catalog_visibility_policy_mode` — it doesn't exist yet.

**Required change (Slice C):** Add optional `catalogVisibilityPolicyMode` field to the
supplier catalog item create/update input schema. Validate the field value against the
allowed CHECK constraint vocabulary. Apply cross-column validation (B2B_PUBLIC + HIDDEN
contradiction check).

---

## 8. Tests Required

The following test coverage is required before any slice is marked complete. No test
files are to be created or modified in this design-only unit.

### 8.1 Unit Tests — Resolver Contract

File (proposed): `server/src/__tests__/catalogVisibilityPolicyResolver.test.ts`

| Test ID | Scenario | Expected result |
|---|---|---|
| R-01 | NULL mode, `B2B_PUBLIC` posture → `PUBLIC` | Pass |
| R-02 | NULL mode, `PRIVATE_OR_AUTH_ONLY` posture → `AUTHENTICATED_ONLY` | Pass |
| R-03 | NULL mode, `B2C_PUBLIC` posture → `PUBLIC` | Pass |
| R-04 | NULL mode, `BOTH` posture → `PUBLIC` | Pass |
| R-05 | NULL mode, unknown posture string → `AUTHENTICATED_ONLY` (fail-safe) | Pass |
| R-06 | `APPROVED_BUYER_ONLY` explicit → `APPROVED_BUYER_ONLY` (posture ignored) | Pass |
| R-07 | `HIDDEN` explicit → `HIDDEN` (posture ignored) | Pass |
| R-08 | `RELATIONSHIP_GATED` explicit → `RELATIONSHIP_GATED` (posture ignored) | Pass |
| R-09 | `PUBLIC` explicit → `PUBLIC` (posture ignored) | Pass |
| R-10 | `REGION_CHANNEL_SENSITIVE` explicit → rejection / UNSUPPORTED (not in constraint) | Error |

### 8.2 Unit Tests — Decision Matrix Coverage

File (proposed): extend `server/src/__tests__/relationshipCatalogVisibility.test.ts`
or create `server/src/__tests__/catalogVisibilityDecisionMatrix.test.ts`

| Test ID | Policy | State | Expected outcome |
|---|---|---|---|
| M-01 | `APPROVED_BUYER_ONLY` | `APPROVED` | ALLOW |
| M-02 | `APPROVED_BUYER_ONLY` | `NONE` | DENY / RELATIONSHIP_REQUIRED |
| M-03 | `APPROVED_BUYER_ONLY` | `REQUESTED` | DENY / RELATIONSHIP_PENDING |
| M-04 | `APPROVED_BUYER_ONLY` | `REJECTED` | DENY / RELATIONSHIP_REJECTED |
| M-05 | `APPROVED_BUYER_ONLY` | `BLOCKED` | DENY / RELATIONSHIP_BLOCKED |
| M-06 | `APPROVED_BUYER_ONLY` | `SUSPENDED` | DENY / RELATIONSHIP_SUSPENDED |
| M-07 | `APPROVED_BUYER_ONLY` | `EXPIRED` | DENY / RELATIONSHIP_EXPIRED |
| M-08 | `APPROVED_BUYER_ONLY` | `REVOKED` | DENY / RELATIONSHIP_REVOKED |
| M-09 | `HIDDEN` | `APPROVED` | DENY / CATALOG_HIDDEN |
| M-10 | `HIDDEN` | `NONE` | DENY / CATALOG_HIDDEN |
| M-11 | `RELATIONSHIP_GATED` | `APPROVED` | ALLOW |
| M-12 | `RELATIONSHIP_GATED` | `NONE` | DENY / RELATIONSHIP_REQUIRED |
| M-13 | `RELATIONSHIP_GATED` | `EXPIRED` | DENY / RELATIONSHIP_EXPIRED |
| M-14 | `RELATIONSHIP_GATED` | `REVOKED` | DENY / RELATIONSHIP_REVOKED |
| M-15 | `PUBLIC` | `NONE` | ALLOW |
| M-16 | `PUBLIC` | `REJECTED` | ALLOW |
| M-17 | `REGION_CHANNEL_SENSITIVE` | any | DENY / UNSUPPORTED_POLICY |

### 8.3 Integration Tests — Route Layer

File (proposed): extend `server/src/__tests__/catalogRouteVisibility.test.ts`
or create new within the existing test infrastructure.

| Test ID | Route | Scenario | Expected HTTP |
|---|---|---|---|
| I-01 | GET catalog (browse) | `APPROVED_BUYER_ONLY` item, buyer `APPROVED` | Appears in list |
| I-02 | GET catalog (browse) | `APPROVED_BUYER_ONLY` item, buyer `NONE` | Absent from list, no 4xx for list |
| I-03 | GET catalog (browse) | `HIDDEN` item | Always absent, any relationship |
| I-04 | GET PDP | `APPROVED_BUYER_ONLY`, buyer `APPROVED` | 200 |
| I-05 | GET PDP | `APPROVED_BUYER_ONLY`, buyer `NONE` | 404 (non-disclosing) |
| I-06 | GET PDP | `HIDDEN` item, buyer `APPROVED` | 404 (non-disclosing) |
| I-07 | POST RFQ prefill | `APPROVED_BUYER_ONLY` item, buyer `NONE` | 403/deny non-disclosing |
| I-08 | POST RFQ submit | `APPROVED_BUYER_ONLY`, buyer `NONE` | 403/deny non-disclosing |
| I-09 | NULL mode item, `B2B_PUBLIC` posture | Authenticated buyer, any state | ALLOW (backward compat) |
| I-10 | NULL mode item, `PRIVATE_OR_AUTH_ONLY` | Authenticated buyer | ALLOW (backward compat) |

### 8.4 AI Safety Tests

Verify `catalog_visibility_policy_mode` is in the `AI_FORBIDDEN_FIELDS` set and not
present in any context pack, vector text build, or embedding input.

| Test ID | Scenario | Expected result |
|---|---|---|
| A-01 | `buildCatalogItemContextPack` — field present | Field absent from output |
| A-02 | `buildCatalogItemVectorText` — field present | Field absent from output |

### 8.5 Cross-Column Contradiction Validation

| Test ID | Scenario | Expected result |
|---|---|---|
| V-01 | Supplier sets `B2B_PUBLIC` + `HIDDEN` | Application validation error |
| V-02 | Supplier sets `B2B_PUBLIC` + `APPROVED_BUYER_ONLY` | Allowed (distinct semantics) |
| V-03 | Supplier sets `PRIVATE_OR_AUTH_ONLY` + `HIDDEN` | Allowed |

---

## 9. QA Fixture Update Plan

When Slice F is authorized, the QA seed matrix must be updated to replace the Option A
lossy posture mappings with explicit `catalog_visibility_policy_mode` values.

### 9.1 Current State (Post Slice C-ALT — Option A Mapping)

All supplier catalog items (qa-knt-b, qa-dye-c, qa-gmt-d) currently use the lossy mapping:
- `APPROVED_BUYER_ONLY → B2B_PUBLIC` (6 items per supplier)
- `HIDDEN → PRIVATE_OR_AUTH_ONLY` (4 items per supplier)

The `catalog_visibility_policy_mode` column does not yet exist; these items have no
access-control policy stored.

### 9.2 Target State (Post Slice F)

Each supplier's 10 catalog items should be updated to set explicit
`catalog_visibility_policy_mode` values, with `publication_posture` retained for its
current public-projection role. Proposed target distribution per supplier:

| Items | `publication_posture` | `catalog_visibility_policy_mode` | Semantic |
|---|---|---|---|
| 2 of 10 | `B2B_PUBLIC` | `NULL` (fallback → PUBLIC) | Discoverable, open access |
| 2 of 10 | `B2B_PUBLIC` | `APPROVED_BUYER_ONLY` | Discoverable but gated |
| 2 of 10 | `PRIVATE_OR_AUTH_ONLY` | `NULL` (fallback → AUTHENTICATED_ONLY) | Auth-required, open |
| 2 of 10 | `PRIVATE_OR_AUTH_ONLY` | `APPROVED_BUYER_ONLY` | Auth-required and gated |
| 1 of 10 | `PRIVATE_OR_AUTH_ONLY` | `HIDDEN` | Supplier-private |
| 1 of 10 | `B2B_PUBLIC` | `RELATIONSHIP_GATED` | Discoverable, any active relationship required |

This distribution enables QA coverage for:
- E2E-07: `APPROVED_BUYER_ONLY` item hidden from buyer with `NONE` relationship (2 items)
- E2E-08: `HIDDEN` item never returned in any browse (1 item)
- E2E-09: `APPROVED_BUYER_ONLY` item blocks RFQ for non-approved buyer (2 items)
- E2E-10 (new): `RELATIONSHIP_GATED` item allows any active relationship (1 item)
- Backward-compat scenarios: NULL-fallback items (4 items)

### 9.3 qa-b2b Catalog Patches

The 5 qa-b2b patches applied in Slice C-ALT should also be updated in Slice F to set
explicit `catalog_visibility_policy_mode` values appropriate for the existing test scenarios:

| Item | Current `publication_posture` | Proposed `catalog_visibility_policy_mode` |
|---|---|---|
| FAB-001 | (existing) | `NULL` (no change) |
| FAB-002 | (existing) | `NULL` (no change) |
| FAB-003 | (existing) | `NULL` (no change) |
| FAB-004 | `B2B_PUBLIC` (was `APPROVED_BUYER_ONLY`) | `APPROVED_BUYER_ONLY` (restore intent) |
| FAB-005 | `B2B_PUBLIC` (was `APPROVED_BUYER_ONLY`) | `APPROVED_BUYER_ONLY` (restore intent) |
| FAB-006 | `PRIVATE_OR_AUTH_ONLY` (was `HIDDEN`) | `HIDDEN` (restore intent) |

### 9.4 Seed Script Scope

The QA seed script to be updated in Slice F is:
`server/scripts/qa/current-db-multi-segment-qa-seed.ts`

The update adds `catalog_visibility_policy_mode` assignments to the upsert operations for
catalog items and qa-b2b patches. No other files change in Slice F.

---

## 10. Migration Strategy

### 10.1 Migration Sequence

Per the TexQtic database governance rules, the required execution sequence is:

1. Author a SQL migration file:
   `server/prisma/migrations/<timestamp>_catalog_visibility_policy_mode/migration.sql`

2. Apply the SQL manually via `psql` using `DATABASE_URL` — NOT via `prisma migrate dev` or
   `prisma db push`.

3. Verify SQL success: no `ERROR` or `ROLLBACK` in output.

4. Run `pnpm -C server exec prisma db pull` to sync `schema.prisma`.

5. Run `pnpm -C server exec prisma generate` to regenerate the Prisma client.

6. Restart the server.

### 10.2 Migration SQL Outline (Design Only — Not for Execution)

```sql
-- DESIGN SKETCH — NOT AUTHORIZED FOR EXECUTION
-- Requires explicit authorization before applying
BEGIN;

ALTER TABLE public.catalog_items
  ADD COLUMN IF NOT EXISTS catalog_visibility_policy_mode VARCHAR(30)
  CONSTRAINT catalog_items_catalog_visibility_policy_mode_check CHECK (
    catalog_visibility_policy_mode IS NULL OR
    catalog_visibility_policy_mode IN (
      'PUBLIC',
      'AUTHENTICATED_ONLY',
      'APPROVED_BUYER_ONLY',
      'HIDDEN',
      'RELATIONSHIP_GATED'
    )
  );

CREATE INDEX IF NOT EXISTS idx_catalog_items_visibility_policy_mode
  ON public.catalog_items (tenant_id, catalog_visibility_policy_mode)
  WHERE catalog_visibility_policy_mode IS NOT NULL;

COMMIT;
```

**Index rationale:** The partial index covers the common catalog browse query pattern:
filter by `tenant_id` (supplier), then filter out or include items by policy mode.
The `WHERE IS NOT NULL` clause keeps the index compact (most existing items will be NULL
and do not need to be indexed until explicitly set).

### 10.3 No Data Migration Required

All existing rows will have `catalog_visibility_policy_mode = NULL`. The fallback resolver
(Section 4.2) handles NULL correctly by mapping from `publication_posture`. No UPDATE
statements are required to migrate existing data. This is the primary advantage of the
nullable additive column design.

### 10.4 Backward Compatibility Guarantee

After the migration:
- All existing API responses remain identical (the resolver's NULL fallback preserves current
  behavior exactly).
- All existing Prisma queries that do not select `catalogVisibilityPolicyMode` continue to
  work without modification.
- All existing tests that do not reference the new column continue to pass.
- The only behavioral change is that new rows and explicitly updated rows can now carry
  `APPROVED_BUYER_ONLY`, `HIDDEN`, or `RELATIONSHIP_GATED` access-control policy.

---

## 11. Rollout Strategy

### 11.1 Staging (QA environment)

1. Authorize and execute Slice B (migration).
2. Run `prisma db pull` and `prisma generate`.
3. Run existing test suite — expect no regressions.
4. Authorize Slice C (route integration).
5. Run catalog browse, PDP, and RFQ integration tests — verify backward compat via NULL items.
6. Authorize Slice F (QA seed update).
7. Run Slice C-ALT re-execution with explicit `catalog_visibility_policy_mode` values.
8. Verify E2E-07, E2E-08, E2E-09 now pass (previously `BLOCKED_BY_CURRENT_PUBLICATION_POSTURE_SCHEMA`).

### 11.2 Production Readiness Gates

| Gate | Condition |
|---|---|
| Schema migration applied and verified | No `ERROR` or `ROLLBACK` in psql output |
| `prisma db pull` output matches migration intent | `catalog_visibility_policy_mode` present in schema |
| `prisma generate` success | No type errors from generated client |
| Server restart: health check `GET /health` returns 200 | All registered routes active |
| Backward compat test: existing NULL items still accessible | Browse, PDP, RFQ unchanged |
| Resolver unit tests pass | All R-01 through R-10 |
| Decision matrix tests pass | All M-01 through M-17 |
| AI safety tests pass | A-01, A-02 |
| Playwright E2E: E2E-07, E2E-08, E2E-09 pass | Slice G authorization required |

### 11.3 Rollback Strategy

The migration adds a nullable column with a CHECK constraint. Rollback (if required):

```sql
-- Rollback sketch — requires explicit authorization
ALTER TABLE public.catalog_items
  DROP COLUMN IF EXISTS catalog_visibility_policy_mode;
```

This is safe because:
- The column is nullable; removing it does not break NOT NULL invariants elsewhere.
- All existing rows return to their pre-migration state (no data loss).
- The `publication_posture` column is unaffected.

Application code that was updated to read `catalogVisibilityPolicyMode` would need to be
reverted simultaneously. This must be a coordinated deploy rollback, not a DB-only change.

---

## 12. Explicit Non-Goals

The following are explicitly out of scope for this unit and must not be implemented even
if the opportunity appears during implementation:

| Non-goal | Why |
|---|---|
| Implementing application code, routes, or services | This is a design-only unit |
| Modifying `server/prisma/schema.prisma` | No schema changes until Slice B is authorized |
| Running any SQL migration | No SQL execution until Slice B is authorized |
| Modifying `server/src/routes/tenant.ts` | No route changes until Slice C is authorized |
| Modifying `server/src/services/relationshipAccess.service.ts` | No service changes until Slice C |
| Updating `server/src/services/relationshipAccess.types.ts` | No type changes until Slice C |
| Modifying AI context packs or data contracts | No AI changes until Slice E |
| Modifying QA seed scripts | No seed changes until Slice F |
| Adding `REGION_CHANNEL_SENSITIVE` to the DB constraint | Future boundary; requires separate design |
| Expanding `organizations.publication_posture` vocabulary | Separate governed decision; not in this unit |
| Adding supplier-level `catalog_visibility_policy_mode` default | Deferred to future slice |
| Building supplier dashboard UI for visibility policy management | Frontend; future authorized slice |
| Building buyer-facing "request access" UI | Frontend; existing design boundary from TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001 |
| DPP / passport publication gated by visibility policy | Separate bounded surface |
| Payment, escrow, subscription, or commission logic | Constitutionally out of scope |
| Relationship state mutation or approval workflow | Governed by TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001 |
| Modifying `.env`, connection URLs, or DB secrets | Constitutionally forbidden |
| Running `prisma migrate dev` or `prisma db push` | Forbidden by TexQtic Prisma execution rules |

---

## 13. Proposed Implementation Slices

Each slice requires explicit authorization before opening. No slice is authorized by this
design document.

---

### Slice A — Visibility Policy Contract and Resolver

**Scope:** Service layer only. No DB changes, no route changes.

**Files to change:**
- `server/src/services/catalogVisibilityPolicyResolver.ts` (new file)
- `server/src/__tests__/catalogVisibilityPolicyResolver.test.ts` (new file)
- Optional: add `catalog_visibility_policy_mode` to `AI_FORBIDDEN_FIELDS` in
  `server/src/services/ai/aiDataContracts.ts`

**Deliverable:**
- Pure TypeScript resolver function implementing the fallback logic from Section 4.2.
- Unit tests R-01 through R-10.
- AI safety verification.

**Authorization gate:** Slice A complete when all resolver unit tests pass, `pnpm --filter server typecheck` passes, no regressions.

**Commit message:** `feat(catalog): add visibility policy resolver with fallback mapping`

---

### Slice B — Persistent Storage Migration (Design-to-Code)

**Scope:** DB migration only. Adds `catalog_visibility_policy_mode` column with CHECK
constraint and partial index to `catalog_items`.

**Files to change:**
- `server/prisma/migrations/<timestamp>_catalog_visibility_policy_mode/migration.sql` (new)
- `server/prisma/schema.prisma` (after `prisma db pull` — automatic)

**Execution sequence:** Apply SQL → verify → `prisma db pull` → `prisma generate` → restart.

**Authorization gate:** Slice B complete when:
- `psql` output shows no `ERROR` or `ROLLBACK`
- `prisma db pull` adds `catalogVisibilityPolicyMode` field to `CatalogItem` model
- `prisma generate` succeeds
- `GET /health` returns 200 after restart
- No existing tests regress

**Commit message:** `migration(catalog): add catalog_visibility_policy_mode column`

---

### Slice C — Catalog and PDP Route Integration

**Scope:** Route and service integration. Wires the resolver from Slice A into the catalog
browse, PDP, and supplier catalog routes.

**Files to change:**
- `server/src/routes/tenant.ts`
  - Replace `getTrustedCatalogVisibilityPolicyForRoute` with resolver from Slice A
  - Add `catalogVisibilityPolicyMode` to Prisma selects for catalog items
  - Add contradiction validation for supplier create/update paths
- `server/src/__tests__/catalogRouteVisibility.test.ts` (new or extend existing)

**Tests:** I-01 through I-10 (Section 8.3).

**Authorization gate:** All integration tests pass; backward compat verified via NULL items;
health check stable.

**Commit message:** `feat(catalog): wire visibility policy resolver into catalog and PDP routes`

---

### Slice D — RFQ Integration Gate

**Scope:** RFQ prefill and submit routes. Adds item-level visibility policy gate to the RFQ
access path.

**Files to change:**
- `server/src/routes/tenant.ts` (RFQ prefill/submit sections)
- Possibly `server/src/services/catalogRfqPrefill.service.ts` or equivalent

**Tests:** I-07, I-08 from Section 8.3; extend existing RFQ test suite.

**Authorization gate:** RFQ deny tests pass; existing RFQ tests do not regress.

**Commit message:** `feat(rfq): add item-level visibility policy gate to RFQ prefill and submit`

---

### Slice E — AI Matching Exclusion

**Scope:** Ensure `catalog_visibility_policy_mode` is constitutionally excluded from all AI
inference paths.

**Files to change:**
- `server/src/services/ai/aiDataContracts.ts` (add to `AI_FORBIDDEN_FIELDS`)
- `server/src/services/ai/aiContextPacks.ts` (add exclusion comments)
- `server/src/__tests__/aiDataContracts.test.ts` (extend to cover new field)

**Tests:** A-01, A-02 from Section 8.4.

**Authorization gate:** AI safety tests pass; no context pack includes the new field.

**Commit message:** `security(ai): exclude catalog_visibility_policy_mode from all AI paths`

---

### Slice F — QA Seed Matrix Update

**Scope:** Update QA seed scripts to replace Option A lossy mappings with explicit
`catalog_visibility_policy_mode` values. Enables E2E-07, E2E-08, E2E-09 to pass.

**Files to change:**
- `server/scripts/qa/current-db-multi-segment-qa-seed.ts`
  - Add `catalog_visibility_policy_mode` to `buildSupplierCatalogItems()` output
  - Update `QA_B2B_CATALOG_PATCHES` to restore FAB-004 → `APPROVED_BUYER_ONLY`,
    FAB-005 → `APPROVED_BUYER_ONLY`, FAB-006 → `HIDDEN`

**Prerequisite:** Slice B (migration) must be complete. The column must exist in DB before
seed script can write to it.

**Authorization gate:** Seed runs without errors; E2E-07, E2E-08, E2E-09 are no longer
`BLOCKED_BY_CURRENT_PUBLICATION_POSTURE_SCHEMA`; all prior validations V-01 through V-07
still pass.

**Commit message:** `qa(seed): restore visibility policy intent via catalog_visibility_policy_mode`

---

### Slice G — Production / Staging Playwright Runtime Verification

**Scope:** End-to-end Playwright tests covering the gating scenarios that are currently
blocked.

**Tests to cover:** E2E-07, E2E-08, E2E-09 (currently blocked), plus regression for
existing E2E-01 through E2E-06.

**Authorization gate:** All Playwright tests pass against staging; no regressions.

**Commit message:** `test(e2e): add visibility policy gating E2E scenarios`

---

### Slice H — Governance Closure

**Scope:** Update governance artifacts, close open questions, update coverage matrix.

**Files to change:**
- `governance/coverage-matrix.md`
- This design document status → `IMPLEMENTATION_COMPLETE`
- `AGENTS.md` / `TECS.md` if roadmap section requires update

**Authorization gate:** Coverage matrix updated; no open questions remain unresolved.

**Commit message:** `governance(catalog): close TECS-CATALOG-VISIBILITY-POLICY-STORAGE-001`

---

## 14. Open Questions

The following questions are open and must be resolved before the relevant slice is opened.

| OQ-ID | Question | Relevant slice | Priority |
|---|---|---|---|
| OQ-01 | Should `RELATIONSHIP_GATED` and `APPROVED_BUYER_ONLY` remain semantically identical in Slice C, or should `RELATIONSHIP_GATED` permit any non-terminal state (e.g., `REQUESTED`)? The current design aligns them; differentiation requires an explicit decision. | Slice A, C | High |
| OQ-02 | Should `B2B_PUBLIC` + `APPROVED_BUYER_ONLY` be allowed (item is publicly discoverable but access-gated), or should public discoverability be suppressed for gated items? This affects whether `APPROVED_BUYER_ONLY` items appear in catalog browse with a "request access" placeholder or are completely absent. | Slice C | High |
| OQ-03 | Should the supplier-level `catalog_visibility_policy_mode` default on `organizations` be added in Slice B or deferred to a later slice? Adding it in Slice B is efficient but increases migration scope. | Slice B | Medium |
| OQ-04 | How should the Prisma field name be styled? `catalogVisibilityPolicyMode` (camelCase, mapped from `catalog_visibility_policy_mode`) is the natural choice. Confirm no conflict with existing generated types after Slice B. | Slice B | Medium |
| OQ-05 | Is there a need for a `RELATIONSHIP_GATED_WITH_EXPIRY` variant that auto-denies based on relationship `expiresAt`? The current `EXPIRED` RelationshipState already handles expiry at the state level. Confirm no double-gating is needed. | Slice A | Low |
| OQ-06 | `REGION_CHANNEL_SENSITIVE` is not storable in Slice B. When is this boundary expected to open? Does the matcher/AI layer need it before production, or is it a post-launch feature? Impacts whether the CHECK constraint should be pre-expanded. | Slice H | Low |
| OQ-07 | Should the partial index `WHERE catalog_visibility_policy_mode IS NOT NULL` be combined with a `tenant_id` filter index, or should a separate multi-column index be created? Decision depends on expected query patterns for gated-item-heavy tenants. | Slice B | Low |
| OQ-08 | Does the AI supplier matching layer (`TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001`) need to filter out `HIDDEN` items from matching candidates before feeding to the embedding pipeline? This should be explicit in the AI matching design, not inferred. | Slice E | Medium |

---

*This document is DESIGN ONLY. No implementation is authorized without explicit per-slice authorization.*

*Last updated: 2026-04-30 — TECS-CATALOG-VISIBILITY-POLICY-STORAGE-001 Design v1*
