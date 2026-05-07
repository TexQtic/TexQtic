# TEXQTIC-NC-PHASE1-POOL-DISCOVERY-DESIGN-001
## Network Commerce Pool Discovery and Listing Surface Design

Document ID: TEXQTIC-NC-PHASE1-POOL-DISCOVERY-DESIGN-001
Status: DESIGN ONLY - NOT AUTHORIZED FOR IMPLEMENTATION
Type: TECS bounded design-only packet
Date: 2026-05-07

Implementation gate:
- This packet defines discovery/list visibility, auth, privacy, and route-safety decisions.
- This packet does NOT authorize route implementation, schema changes, migrations, tests, or UI work.

---

## 1) Pre-work Verification

### 1.1 Preflight git status
- `git status --short` returned empty output (clean working tree at packet start).

### 1.2 Required commits confirmed present
All required commit objects were confirmed present:
- 6680026ef27db0ac7d851b4e462b834571d50648
- 0b9949b
- e0b4533
- b9d760f7adf287f98341ed902e21f0995800a796
- e3a806492d7981cb695f1663da7780c15cec0c20
- ac3bc28
- 45ae401
- ea53b0f

---

## 2) Files Inspected

Governance sequencing:
- governance/control/OPEN-SET.md
- governance/control/NEXT-ACTION.md
- governance/control/GOVERNANCE-CHANGELOG.md

Network Commerce design and recent pool artifacts:
- governance/TEXQTIC-NETWORK-COMMERCE-DESIGN-FOUNDATION-001.md
- governance/TEXQTIC-NC-PHASE1-POOL-ROUTE-DESIGN-001.md
- docs/TEXQTIC-NC-PHASE1-POOL-FEATURE-FLAG-PROD-VERIFY-001.md

Implementation anchors:
- server/prisma/schema.prisma
- server/src/services/networkPool.service.ts
- server/src/routes/tenant/pools.ts
- server/src/routes/tenant/pools.integration.test.ts
- server/src/middleware/ncPoolFeatureGate.middleware.ts
- server/src/routes/tenant.ts

List/discovery and response/auth patterns:
- server/src/utils/response.ts
- server/src/middleware/auth.ts
- server/src/middleware/database-context.middleware.ts
- server/src/routes/tenant/traceability.g016.ts
- server/src/routes/tenant/certifications.g019.ts
- server/src/routes/tenant.ts (catalog list cursor pattern)
- server/src/routes/admin/traceability.g016.ts (admin/control separation precedent)

Repo-truth findings relevant to this packet:
- Current pool routes are 5 endpoints only (create, open, join, get-by-id, get-membership).
- No pool discovery/list endpoint exists yet.
- Pool feature gate middleware is already implemented and enforced on all pool tenant routes.
- Feature gate semantics are fail-closed (503 FEATURE_DISABLED) for missing/disabled flags and DB errors.
- Pool service currently has no list methods.
- NetworkPool and NetworkPoolMembership models already exist; this packet does not require schema change.

---

## 3) Discovery Personas

### A. Pool owner/admin org
- MUST be able to discover/read pools it owns.
- Existing get-by-id remains owner scoped.
- Discovery/list addition should include owner-scoped list.

### B. Member / prospective participant org
- MAY need discovery in future, but broad open-pool discovery introduces commercial leakage risk.
- For this packet, non-owner prospective discovery is deferred by default.

### C. Pool participant org (joined)
- SHOULD be able to list pools where the caller org has membership.
- MUST see only own membership details; never other member identities/quantities.

### D. Control-plane/platform admin
- Cross-tenant discovery is a separate control-plane concern and should not be implemented in tenant routes.
- If needed, design as a dedicated future control-plane packet.

---

## 4) Tenant Discovery Posture Decision

Chosen posture: Option D - Two-list model.

Included now (next implementation packet target):
1. Owner list
2. Joined list

Deferred:
- Broad open-pool discovery (OPEN/AGGREGATING pools not owned/joined)

Rationale:
- Lowest leakage profile while still solving immediate discoverability for real actors.
- Aligns with current owner/member scoped patterns in pool get-by-id and get-membership routes.
- Avoids exposing market demand signals before explicit business policy on metadata sensitivity.
- Reduces risk of side-channel leakage via list cardinality and aggregate quantities.

---

## 5) Metadata Visibility Matrix

Legend:
- VISIBLE = returned in route response
- HIDDEN = not returned
- CONDITIONAL = only returned under explicit policy flag (not part of first implementation)

| Field | Owner View | Joined Member View | Non-member Discovery View | Control Admin View |
|---|---|---|---|---|
| pool_id | VISIBLE | VISIBLE | HIDDEN (deferred) | VISIBLE |
| pool_ref | VISIBLE | VISIBLE (for joined pool) | HIDDEN (deferred) | VISIBLE |
| owner org id | VISIBLE (self) | HIDDEN (or opaque owner_ref) | HIDDEN | VISIBLE |
| owner org name | CONDITIONAL (future policy) | HIDDEN | HIDDEN | VISIBLE |
| commodity_category | VISIBLE | VISIBLE | HIDDEN (deferred) | VISIBLE |
| target_qty | VISIBLE | HIDDEN by default | HIDDEN | VISIBLE |
| qty_unit | VISIBLE | VISIBLE | HIDDEN (deferred) | VISIBLE |
| lifecycle_state_key | VISIBLE | VISIBLE | HIDDEN (deferred) | VISIBLE |
| open_at | VISIBLE | VISIBLE | HIDDEN (deferred) | VISIBLE |
| close_at | VISIBLE | VISIBLE | HIDDEN (deferred) | VISIBLE |
| created_at | VISIBLE | VISIBLE | HIDDEN (deferred) | VISIBLE |
| declared member count | HIDDEN (phase 1 discovery) | HIDDEN | HIDDEN | VISIBLE |
| aggregate declared_qty | HIDDEN | HIDDEN | HIDDEN | VISIBLE |
| own declared_qty | HIDDEN in owner list unless same org is member | VISIBLE | HIDDEN | VISIBLE |
| own membership status | HIDDEN in owner list unless same org is member | VISIBLE | HIDDEN | VISIBLE |
| other member org ids | HIDDEN | HIDDEN | HIDDEN | VISIBLE |
| other member quantities | HIDDEN | HIDDEN | HIDDEN | VISIBLE |
| allocation fields | HIDDEN | HIDDEN | HIDDEN | VISIBLE |
| metadata JSON | HIDDEN by default (safe subset only if introduced later) | HIDDEN | HIDDEN | VISIBLE |

Note:
- Non-member discovery view is intentionally deferred in Option D; matrix values are defined now to prevent accidental overexposure when that surface is later considered.

---

## 6) Quantity Privacy Decision

Decisions for first implementation packet:
- target_qty: visible to owner list only; hidden from joined list by default.
- total declared demand: hidden for all tenant routes.
- member count: hidden for all tenant routes.
- quantities: no exact, bucketed, rounded, or aggregated quantities exposed except caller own declared_qty in joined list.
- joined members seeing aggregate demand: no (deferred).
- non-members seeing aggregate demand: no (deferred).

Reasoning:
- Demand and participation density are commercial signals.
- Even coarse aggregates can leak category momentum and procurement intent.
- Conservative release protects privacy while allowing operational usability for owners and joined members.

---

## 7) Discovery Route Candidates and Minimum Surface

Candidate tenant routes considered:
- GET /api/tenant/network-commerce/pools
- GET /api/tenant/network-commerce/pools/joined
- GET /api/tenant/network-commerce/pools/open
- GET /api/tenant/network-commerce/pools/:poolId/discovery

Minimum route surface selected for next implementation packet:
1. GET /api/tenant/network-commerce/pools
   - owner-scoped list only (where network_pools.org_id = caller org)
2. GET /api/tenant/network-commerce/pools/joined
   - joined-scoped list only (where memberships.org_id = caller org)

Deferred route candidates:
- GET /api/tenant/network-commerce/pools/open
- GET /api/tenant/network-commerce/pools/:poolId/discovery

Reasoning:
- Meets immediate owner/member discoverability without opening non-member visibility.
- Keeps non-leak risk minimal and avoids policy ambiguity.

---

## 8) Query, Pagination, Sorting, and Filters

Pagination style for first implementation:
- Offset pagination (`limit`, `offset`) to align with multiple existing tenant list routes.
- Defaults and bounds:
  - limit default 20
  - limit max 100
  - offset default 0

Sorting:
- Primary: updated_at DESC
- Secondary: id DESC (stable tie-breaker)

Filters (no free-text search in first implementation):
- commodity_category (exact match)
- lifecycle_state_key (exact match)
- qty_unit (exact match)
- open_at range (open_from/open_to)
- close_at range (close_from/close_to)

Notes:
- No free-text search unless a clear NC use case and anti-leak policy is approved.
- Response envelope remains `sendSuccess` shape with list + pagination meta.

---

## 9) RLS and Service Boundary Design

Service boundary recommendation:
- Extend NetworkPoolService with two read methods (no schema changes):
  - listOwnedPools(orgId, query)
  - listJoinedPools(memberOrgId, query)

Why service methods (instead of route-local Prisma queries):
- Keeps pool domain read policy centralized with existing pool domain logic.
- Simplifies testability and reuse.
- Reduces risk of route-specific projection drift.

RLS and scoped query requirements:
- listOwnedPools MUST scope by network_pools.org_id = caller orgId.
- listJoinedPools MUST scope by memberships.org_id = caller orgId and return safe projection only.
- Do not require broad RLS bypass for tenant discovery.
- If admin/cross-tenant discovery is needed, create separate control-plane route design.

---

## 10) Feature Flag Gate Decision

Discovery routes MUST reuse existing:
- ncPoolFeatureGateMiddleware
- feature key: nc.procurement_pools.enabled

Required behavior (unchanged from existing pool routes):
- global missing/disabled -> 503 FEATURE_DISABLED
- tenant override missing/disabled -> 503 FEATURE_DISABLED
- DB error in gate path -> 503 FEATURE_DISABLED (fail-closed)

Future implementation must include gate tests for all new discovery routes.

---

## 11) Non-leak Policy

Baseline policy for first implementation:
1. Non-owner unknown pool behavior:
   - Existing get-by-id owner-scoped 404 remains unchanged.
2. Joined list behavior:
   - Return only pools where caller has membership.
   - Include only caller own membership fields.
3. No non-member discovery route in first implementation.
4. No member count or aggregate demand exposure.
5. No metadata JSON raw exposure in tenant discovery responses.
6. Uniform not-found semantics:
   - Avoid returning different errors/messages that reveal pool existence vs lack of access.
7. Projection minimization:
   - Return only explicitly allowlisted fields in discovery DTOs.

Anti-side-channel requirement:
- Avoid per-field conditional errors that could reveal hidden data.
- Keep response timing and error code behavior consistent for denied paths where practical.

---

## 12) Future Implementation Test Matrix

Required tests for TEXQTIC-NC-PHASE1-POOL-DISCOVERY-IMPLEMENTATION-001:

Owner list:
- owner list shows caller owned pools only
- owner list does not include pools owned by other orgs
- owner list supports pagination (limit/offset)
- owner list supports filters (commodity_category, lifecycle_state_key, qty_unit, open/close windows)

Joined list:
- joined list shows only pools where caller has membership
- joined list includes own membership status and own declared_qty only
- joined list does not expose other members or their quantities
- joined list supports pagination and filters

Feature flag:
- discovery owner list blocked with 503 FEATURE_DISABLED when global flag absent/disabled
- discovery joined list blocked with 503 FEATURE_DISABLED when global flag absent/disabled
- tenant override disabled blocks with 503

Auth and safety:
- unauthorized request returns 401
- validation errors return 400 for invalid query params
- no metadata JSON leakage
- no aggregate demand leakage
- no member count leakage

Cleanup:
- integration tests leave no route test pools/memberships/overrides behind

---

## 13) Proposed Implementation Allowlist (Next Packet)

Exact allowlist proposal for TEXQTIC-NC-PHASE1-POOL-DISCOVERY-IMPLEMENTATION-001:
- server/src/routes/tenant/pools.ts
- server/src/services/networkPool.service.ts
- server/src/routes/tenant/pools.integration.test.ts

Optional only if needed by test setup conventions:
- server/src/routes/tenant.ts (only if route registration changes become necessary; expected not required)

Explicitly not required:
- server/prisma/schema.prisma
- server/prisma/migrations/*
- UI files
- control-plane routes

---

## 14) Blockers and Open Questions (Paresh Decision Required)

1. Open-pool discovery policy:
- Should non-member tenants be allowed to discover OPEN/AGGREGATING pools?
- Current recommendation: defer.

2. Owner identity exposure:
- Should owner org name be visible in any future non-member discovery payload?
- Current recommendation: no by default.

3. Quantity sensitivity:
- Is target_qty considered commercially sensitive outside owner context?
- Current recommendation: yes; hide from joined/non-member discovery initially.

4. Member count exposure:
- Can member participation count be shown to joined or non-member viewers?
- Current recommendation: no in first implementation.

5. metadata JSON policy:
- Is any metadata safe for tenant discovery responses?
- Current recommendation: no raw metadata; only explicit safe fields.

6. Control-plane sequencing:
- Should admin cross-tenant discovery be designed first, or after tenant two-list implementation?
- Current recommendation: separate later control-plane design packet.

---

## 15) Recommendation and Readiness

Recommended default retained:
- Implement owner list + joined list first.
- Defer open-pool non-member discovery.
- Expose no aggregate demand, no member counts, and no other-member details.
- Reuse existing nc.procurement_pools.enabled gate middleware.

Can next packet be opened as:
- TEXQTIC-NC-PHASE1-POOL-DISCOVERY-IMPLEMENTATION-001

Answer:
- Yes, with the Option D conservative scope above and explicit acceptance of blockers/open questions defaults in this document.

---

## 16) Completion Checklist

- [x] git status checked
- [x] prerequisite commits confirmed
- [x] Network Commerce design reviewed
- [x] Pool route design reviewed
- [x] Feature gate verification reviewed
- [x] implementation anchors inspected
- [x] discovery personas defined
- [x] tenant discovery posture selected
- [x] metadata visibility matrix defined
- [x] quantity privacy decision recorded
- [x] route candidates evaluated
- [x] minimum next route surface selected
- [x] feature flag gate required for discovery
- [x] non-leak policy defined
- [x] future tests defined
- [x] implementation allowlist proposed
- [x] blockers/open questions listed
- [x] only one design artifact changed
- [x] no code/schema/migration/test changes made
- [ ] one atomic commit made (execution step)
