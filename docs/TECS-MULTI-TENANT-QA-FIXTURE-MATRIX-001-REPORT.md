# TECS-MULTI-TENANT-QA-FIXTURE-MATRIX-001 — Multi-Tenant QA Fixture Matrix Readiness Report

**Unit ID:** TECS-MULTI-TENANT-QA-FIXTURE-MATRIX-001  
**Mode:** DISCOVERY / SETUP PLAN ONLY  
**Verdict:** `NOT_READY_FOR_APPROVAL_GATE_QA`  
**Report date:** 2026-04-29  
**Author:** GitHub Copilot (TECS SAFE-WRITE Mode — Discovery / Reporting Only)  
**Session head commit:** `eb5dcba` — `audit(launch): correct RFQ verification evidence`

> **Stop rule:** This artifact is discovery and planning only. No backend routes, frontend
> components, schema changes, Prisma migrations, or DB mutations are implemented or
> authorized in this unit. No production data was mutated. All Playwright calls in this
> unit were read-only (GET requests only). All relationship fixture injection is explicitly
> blocked until Paresh authorizes the follow-on seed unit.

---

## 1. Summary

This report inventories the multi-tenant QA fixture state required to verify the TexQtic
supplier catalogue **approval-gate trust model** — the mechanism by which a supplier controls
which B2B buyers can access gated catalogue items, gated price disclosure, and gated RFQ
workflows based on the `BuyerSupplierRelationship` state.

**Verdict: `NOT_READY_FOR_APPROVAL_GATE_QA`**

Two distinct B2B organisations exist in production (`qa-b2b` supplier + `qa-buyer` buyer) and
the service-layer approval-gate logic is fully implemented. However, no catalogue items are
configured to require relationship approval, no `BuyerSupplierRelationship` records exist
between the two orgs, and no tenant-facing API surface exists to manage relationships.
The approval-gate code is present but unexercisable with current fixture data.

---

## 2. Why This Matrix Is Required

The approval-gate trust model (`TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001`) introduces
multi-tenant cross-org access decisions that are structurally different from all
previously verified QA passes:

| Prior QA coverage | Gap addressed by this matrix |
|---|---|
| Single-tenant RLS isolation | Cross-org access decision (buyer browsing supplier's catalog) |
| Own-catalog CRUD | Gated catalog visibility by relationship state |
| RFQ buyer leakage (TECS-RFQ-BUYER-LEAKAGE-BOUNDARY-TIGHTENING-001) | Relationship-gated RFQ acceptance (`APPROVED_BUYERS_ONLY`) |
| Auth realm isolation | Buyer-as-actor browsing a different org's catalog |
| Price display for own catalog | Relationship-gated price disclosure (`RELATIONSHIP_ONLY`) |

Verifying the approval gate requires:
1. At least **two distinct authenticated B2B sessions** (a buyer and a supplier)
2. At least one catalogue item configured with `APPROVED_BUYER_ONLY` visibility
3. A `BuyerSupplierRelationship` record covering at least the `NONE`, `REQUESTED`, and
   `APPROVED` states
4. Optionally: `BLOCKED` and `REVOKED` states for negative-path coverage

---

## 3. Evidence Collection Method

All evidence collected via read-only Playwright API calls against `https://app.texqtic.com`
while authenticated as `qa.b2b@texqtic.com` (org `qa-b2b`):

| Call | HTTP Method | Endpoint | Purpose |
|------|-------------|----------|---------|
| A | GET | `/api/me` | Confirm active session identity |
| B | GET | `/api/tenant/b2b/eligible-suppliers` | Enumerate eligible supplier orgs |
| C | GET | `/api/tenant/catalog/items?limit=50` | Enumerate own catalog items |
| D | GET | `/api/tenant/catalog/supplier/{tenantId}/items?limit=50` | Self-browse as supplier |

No write operations, no `DELETE`, no `POST`, no relationship mutations. No `.env` contents
or DB URLs were accessed.

---

## 4. Current Org Fixture Inventory (Production State)

### 4.1 Eligible supplier orgs

**Endpoint:** `GET /api/tenant/b2b/eligible-suppliers`  
**HTTP status:** 200  
**Response:** `total: 1`

| Org | ID | Slug | Primary Segment | Eligible as supplier? |
|-----|----|------|----------------|----------------------|
| `QA B2B` | `faf2e4a7-5d79-4b00-811b-8d0dce4f4d80` | `qa-b2b` | Weaving | ✅ YES |

**Note:** The route filters on `publication_posture IN ('B2B_PUBLIC', 'BOTH')` AND
`publicEligibilityPosture = 'PUBLICATION_ELIGIBLE'`. Only `qa-b2b` qualifies.

### 4.2 QA seed actor registry (production state per seed output `d68108d`)

| Key | Email | Slug | Tenant Type | Org Status | Role Position | Eligible as supplier? | Seeded? |
|-----|-------|------|-------------|------------|---------------|-----------------------|---------|
| `QA_B2B` | `qa.b2b@texqtic.com` | `qa-b2b` | B2B | ACTIVE | manufacturer | ✅ YES | ✅ YES |
| `QA_B2C` | `qa.b2c@texqtic.com` | `qa-b2c` | B2C | ACTIVE | — | ❌ N/A (B2C) | ✅ YES |
| `QA_WL` | `qa.wl@texqtic.com` | `qa-wl` | B2C (WL) | ACTIVE | — | ❌ N/A (B2C/WL) | ✅ YES |
| `QA_AGG` | `qa.agg@texqtic.com` | `qa-agg` | AGGREGATOR | ACTIVE | — | ❌ N/A (AGG) | ✅ YES |
| `QA_PEND` | `qa.pending@texqtic.com` | `qa-pend` | B2B | PENDING_VERIFICATION | — | ❌ NO (pending) | ✅ YES |
| **`QA_BUYER`** | **`qa.buyer@texqtic.com`** | **`qa-buyer`** | **B2B** | **ACTIVE** | **trader** | **❌ NO** | **✅ YES** |

**`QA_BUYER` notes:**
- Successfully seeded in commit `d68108d` (QA-SEED-TX-TIMEOUT-FIX-001) — `qaBuyer.pass: true`
- Exists in the `organizations` table as ACTIVE, B2B, jurisdiction=IN, taxonomy: Weaving / trader
- Does NOT appear in `eligible-suppliers` because it has no catalog, no `publication_posture =
  B2B_PUBLIC`, and no `publicEligibilityPosture = PUBLICATION_ELIGIBLE` — correct behaviour
  (a buyer-role tenant should not appear as a discoverable supplier)
- Has no catalog items (correct — buyer actor, not a supplier)

### 4.3 Org pairing assessment

**Buyer actor:** `qa-buyer` (`qa.buyer@texqtic.com`) — ACTIVE B2B, trader role-position  
**Supplier actor:** `qa-b2b` (`qa.b2b@texqtic.com`) — ACTIVE B2B, manufacturer role-position, 14 active catalog items, publication-eligible  
**Org pairing: READY** — two distinct B2B orgs exist; one is a buyer, one is a supplier with a populated catalog.

---

## 5. Catalogue Item Policy Inventory (Production State)

**Endpoint:** `GET /api/tenant/catalog/items?limit=50` (authenticated as `qa-b2b`)  
**HTTP status:** 200  
**Total items:** 14

### 5.1 `publicationPosture` distribution

| `publicationPosture` value | Count | Maps to `CatalogVisibilityPolicy` |
|---------------------------|-------|----------------------------------|
| `PRIVATE_OR_AUTH_ONLY` | 11 | `AUTHENTICATED_ONLY` |
| `B2B_PUBLIC` | 3 | `PUBLIC` |
| `APPROVED_BUYER_ONLY` | **0** | `APPROVED_BUYER_ONLY` — **NOT PRESENT** |
| `HIDDEN` | **0** | `HIDDEN` — **NOT PRESENT** |

### 5.2 Price disclosure policy distribution

| `priceDisclosurePolicyMode` value | Count |
|----------------------------------|-------|
| `null` (no override) | 14 |
| `RELATIONSHIP_ONLY` | **0** — **NOT PRESENT** |
| `VISIBLE` | 0 |
| `HIDDEN` | 0 |

### 5.3 RFQ acceptance mode distribution

No `rfqAcceptanceMode` field is exposed via the `GET /api/tenant/catalog/items` endpoint.
Based on schema inspection of `CatalogItem`, no items are known to have
`rfqAcceptanceMode: APPROVED_BUYERS_ONLY`.

### 5.4 Full item inventory with policy classification

| ID | Name | `publicationPosture` | `priceDisclosurePolicyMode` |
|----|------|---------------------|---------------------------|
| `39dda966` | Upholstery Chenille Weave | `PRIVATE_OR_AUTH_ONLY` | `null` |
| `5226ddd6` | Floral Viscose Challis Print | `PRIVATE_OR_AUTH_ONLY` | `null` |
| `57ab8313` | Warp Knit Performance Mesh | `PRIVATE_OR_AUTH_ONLY` | `null` |
| `8a5050c1` | Technical Softshell 3-Layer | `PRIVATE_OR_AUTH_ONLY` | `null` |
| `e402099e` | Recycled Polyester Taffeta | `PRIVATE_OR_AUTH_ONLY` | `null` |
| `abfbec7d` | Viscose Crepe Drape | `PRIVATE_OR_AUTH_ONLY` | `null` |
| `d68b1c6d` | Sandwashed Silk Blend Satin | `PRIVATE_OR_AUTH_ONLY` | `null` |
| `6844d148` | Comfort Stretch Denim 9.5 oz | `PRIVATE_OR_AUTH_ONLY` | `null` |
| `e302ccce` | Indigo Denim 11 oz | `PRIVATE_OR_AUTH_ONLY` | `null` |
| `cff2e7ec` | Linen Cotton Herringbone | `PRIVATE_OR_AUTH_ONLY` | `null` |
| `2103b171` | European Linen Plain Weave | `PRIVATE_OR_AUTH_ONLY` | `null` |
| `e1526ebe` | Stretch Cotton Sateen | `B2B_PUBLIC` | `null` |
| `5a2b41a2` | Combed Cotton Twill | `B2B_PUBLIC` | `null` |
| `9effba8b` | Organic Cotton Poplin | `B2B_PUBLIC` | `null` |

---

## 6. Relationship Fixture Inventory (Production State)

### 6.1 Known relationship records

No `BuyerSupplierRelationship` record exists between `qa-buyer` and `qa-b2b`.

**Evidence:**
- No relationship management API routes exist in `server/src/routes/tenant.ts` (confirmed
  by full route inventory of the tenant router)
- No `GET /api/tenant/relationships` endpoint exists
- No `POST /api/tenant/relationships/request-access` endpoint exists
- Therefore, no tenant-facing mechanism has ever been used to create a relationship

Since `BuyerSupplierRelationship` records can only be created via:
1. The (unimplemented) relationship management API, or
2. Direct psql injection (authorized by Paresh only)

**Current relationship state between `qa-buyer` and `qa-b2b`: NONE (no DB row)**

### 6.2 Required relationship states for approval-gate QA

| State | Required for | DB row needed | Currently present |
|-------|-------------|---------------|------------------|
| `NONE` | Verify: unapproved buyer gets `canAccessCatalog: false` on APPROVED_BUYER_ONLY items | No row (default) | ✅ Implicitly true |
| `REQUESTED` | Verify: pending buyer gets `RELATIONSHIP_PENDING` denial | Row with `state=REQUESTED` | ❌ Missing |
| `APPROVED` | Verify: approved buyer gets full access to APPROVED_BUYER_ONLY items | Row with `state=APPROVED` | ❌ Missing |
| `BLOCKED` | Verify: blocked buyer gets `RELATIONSHIP_BLOCKED` denial | Row with `state=BLOCKED` | ❌ Missing |
| `REVOKED` | Optional — verify revoked buyer is treated as unapproved | Row with `state=REVOKED` | ❌ Missing |
| `REJECTED` | Optional — verify rejected buyer sees rejection denial | Row with `state=REJECTED` | ❌ Missing |
| `SUSPENDED` | Optional — extended coverage | Row with `state=SUSPENDED` | ❌ Missing |
| `EXPIRED` | Optional — extended coverage | Row with `state=EXPIRED` | ❌ Missing |

**Note on state machine constraint:** The `buyer_supplier_relationships` table has a unique
constraint on `(supplierOrgId, buyerOrgId)`. Only ONE relationship row can exist for the
`qa-buyer` → `qa-b2b` pair at any given time. Sequential QA passes (update state between
passes) are required to cover multiple relationship states with the current org fixture
set, or additional buyer/supplier org pairs must be seeded.

### 6.3 Relationship management API — availability

| Route | Available | Notes |
|-------|-----------|-------|
| `POST /api/tenant/relationships/request-access` | ❌ NOT IMPLEMENTED | Design-draft only (`TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001`) |
| `POST /api/tenant/relationships/:id/approve` | ❌ NOT IMPLEMENTED | Same |
| `POST /api/tenant/relationships/:id/reject` | ❌ NOT IMPLEMENTED | Same |
| `POST /api/tenant/relationships/:id/block` | ❌ NOT IMPLEMENTED | Same |
| `GET /api/tenant/relationships` | ❌ NOT IMPLEMENTED | Same |

The relationship management API surface is entirely absent. The service-layer logic
(`evaluateBuyerCatalogVisibility`, `evaluateBuyerRelationshipRfqEligibility`) is fully
implemented and will behave correctly once the relationship records exist, but the API
routes that would allow tenants to manage relationships have not been built yet.

---

## 7. Approval-Gate Service Layer Status

The following service functions are implemented and form the basis for approval-gate QA:

| Function | File | Status |
|----------|------|--------|
| `evaluateBuyerCatalogVisibility()` | `server/src/services/relationshipAccess.service.ts` | ✅ IMPLEMENTED |
| `evaluateBuyerRelationshipRfqEligibility()` | `server/src/services/relationshipAccess.service.ts` | ✅ IMPLEMENTED |
| `evaluateBuyerRelationshipPriceEligibility()` | `server/src/services/relationshipAccess.service.ts` | ✅ IMPLEMENTED |
| `evaluateBuyerSupplierRelationshipAccess()` | `server/src/services/relationshipAccess.service.ts` | ✅ IMPLEMENTED |
| `getRelationshipOrNone()` | `server/src/services/relationshipAccessStorage.service.ts` | ✅ IMPLEMENTED |

Gate invocation points in `server/src/routes/tenant.ts`:
- `GET /tenant/catalog/supplier/:supplierOrgId/items` — calls `evaluateBuyerCatalogVisibility()`
  before returning items; returns 404 if `canAccessCatalog: false`

---

## 8. Complete Fixture Readiness Matrix

### 8.1 Org fixture matrix

| Fixture | Required | Status | Notes |
|---------|----------|--------|-------|
| Supplier org (ACTIVE, B2B, PUBLICATION_ELIGIBLE, has catalog) | ✅ Required | ✅ READY | `qa-b2b` — 14 items |
| Buyer org (ACTIVE, B2B, distinct from supplier) | ✅ Required | ✅ READY | `qa-buyer` — seeded, no catalog |
| Buyer auth session (`qa.buyer@texqtic.com`) | ✅ Required | ⚠️ AUTH NOT VERIFIED | Org exists; login not tested in this unit |
| Supplier auth session (`qa.b2b@texqtic.com`) | ✅ Required | ✅ VERIFIED | Active session confirmed via `/api/me` |

### 8.2 Catalogue item policy fixture matrix

| Fixture | Required | Status | Notes |
|---------|----------|--------|-------|
| 1+ item with `publicationPosture: B2B_PUBLIC` | ✅ Required | ✅ READY | 3 items (Stretch Cotton Sateen, Combed Cotton Twill, Organic Cotton Poplin) |
| 1+ item with `publicationPosture: APPROVED_BUYER_ONLY` | ✅ Required | ❌ MISSING | 0 of 14 items have this posture |
| 1+ item with `publicationPosture: PRIVATE_OR_AUTH_ONLY` | ✅ Required | ✅ READY | 11 items |
| 1+ item with `publicationPosture: HIDDEN` | Optional | ❌ MISSING | 0 of 14 items |
| 1+ item with `priceDisclosurePolicyMode: RELATIONSHIP_ONLY` | ✅ Required | ❌ MISSING | All 14 items have `null` |
| 1+ item configured for `APPROVED_BUYERS_ONLY` RFQ | ✅ Required | ❌ MISSING | None confirmed |

### 8.3 Relationship state fixture matrix

| Fixture | Required | Status | Notes |
|---------|----------|--------|-------|
| Relationship: `qa-buyer` ← `qa-b2b`, state = NONE | ✅ Required | ✅ Implicit (no row = NONE) | Service evaluates absence of row as NONE |
| Relationship: `qa-buyer` ← `qa-b2b`, state = REQUESTED | ✅ Required | ❌ MISSING | No row exists |
| Relationship: `qa-buyer` ← `qa-b2b`, state = APPROVED | ✅ Required | ❌ MISSING | No row exists |
| Relationship: `qa-buyer` ← `qa-b2b`, state = BLOCKED | ✅ Required | ❌ MISSING | No row exists |
| Relationship: `qa-buyer` ← `qa-b2b`, state = REJECTED | Optional | ❌ MISSING | No row exists |
| Relationship: `qa-buyer` ← `qa-b2b`, state = REVOKED | Optional | ❌ MISSING | No row exists |

### 8.4 API surface fixture matrix

| Fixture | Required for | Status | Notes |
|---------|-------------|--------|-------|
| `GET /api/tenant/catalog/supplier/:id/items` | Catalog browse gating test | ✅ AVAILABLE | Deployed, returns 200 |
| `POST /api/tenant/relationships/request-access` | Relationship lifecycle test | ❌ NOT IMPLEMENTED | Design-draft; no route |
| `POST /api/tenant/relationships/:id/approve` | Relationship approval flow test | ❌ NOT IMPLEMENTED | Design-draft; no route |
| `GET /api/tenant/relationships` | Relationship state verification | ❌ NOT IMPLEMENTED | Design-draft; no route |

### 8.5 Summary fixture readiness score

| Category | Required fixtures | Ready | Missing |
|----------|------------------|-------|---------|
| Org fixtures | 4 | 3 (buyer auth unverified) | 1 (buyer session unverified) |
| Catalog item policy | 6 | 2 | 4 |
| Relationship state | 6 | 1 (implicit NONE) | 5 |
| API surface | 4 | 1 | 3 |
| **Total** | **20** | **7 (35%)** | **13 (65%)** |

---

## 9. Why `NOT_READY_FOR_APPROVAL_GATE_QA`

The approval-gate QA cannot be executed for the following hard-blocking reasons:

### Blocker 1 — No APPROVED_BUYER_ONLY catalog items (CRITICAL)

All 14 `qa-b2b` catalog items are `PRIVATE_OR_AUTH_ONLY` or `B2B_PUBLIC`. Neither
posture triggers the relationship approval gate in `evaluateBuyerCatalogVisibility()`.
For the gate to fire, at least one item must have a posture that maps to
`CatalogVisibilityPolicy: APPROVED_BUYER_ONLY`. Without this fixture, the access
denial path (`RELATIONSHIP_REQUIRED`, `RELATIONSHIP_PENDING`) is unreachable.

### Blocker 2 — No RELATIONSHIP_ONLY price items (CRITICAL)

All 14 items have `priceDisclosurePolicyMode: null`. The `RELATIONSHIP_ONLY` price
disclosure gate in `evaluateBuyerRelationshipPriceEligibility()` is unreachable without
at least one item with this policy.

### Blocker 3 — No relationship records in any non-NONE state (CRITICAL)

No `BuyerSupplierRelationship` row exists between `qa-buyer` and `qa-b2b`. Even with
`APPROVED_BUYER_ONLY` items present, the `APPROVED` path cannot be verified without
a row with `state = APPROVED`. The `REQUESTED`, `BLOCKED`, and other negative states
are also untestable.

### Blocker 4 — No relationship management API surface (STRUCTURAL)

The `TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001` design exists in `DESIGN_DRAFT` status.
No `POST /api/tenant/relationships/*` routes are implemented. The relationship
lifecycle flow (buyer requests access → supplier approves) cannot be tested end-to-end
through the application surface. This means QA can only verify the access-decision
behaviour (given a pre-seeded relationship state, does the gate enforce correctly?) but
NOT the full relationship workflow.

### Blocker 5 — Buyer session not runtime-verified (MINOR)

`qa.buyer@texqtic.com` was confirmed seeded via seed output. However, its runtime
login session was not tested in this unit (current Playwright session is `qa-b2b`).
A separate auth verification step is required before buyer-side browse tests can run.

---

## 10. What IS Ready (Partial Readiness)

| Component | Status | Evidence |
|-----------|--------|---------|
| Supplier org (`qa-b2b`) — ACTIVE, PUBLICATION_ELIGIBLE | ✅ | `eligible-suppliers` → 1 result, confirmed `qa-b2b` |
| Buyer org (`qa-buyer`) — ACTIVE, B2B, distinct | ✅ | Seed output `d68108d`: `qaBuyer.pass: true` |
| Supplier catalog — 14 active items with UUIDs | ✅ | `GET /api/tenant/catalog/items` → 14 items confirmed |
| 3 `B2B_PUBLIC` items (gate bypass path) | ✅ | Stretch Cotton Sateen, Combed Cotton Twill, Organic Cotton Poplin |
| Service-layer approval gate code | ✅ | `evaluateBuyerCatalogVisibility`, `evaluateBuyerRelationshipRfqEligibility` |
| `buyer_supplier_relationships` schema | ✅ | Prisma model confirmed at `schema.prisma:1016–1040` |
| Relationship state types | ✅ | `RelationshipState` union in `relationshipAccess.types.ts` |
| Browse supplier catalog API route | ✅ | `GET /api/tenant/catalog/supplier/:id/items` → 200 |
| Implicit NONE relationship state | ✅ | Absence of DB row = NONE; service evaluates correctly |

---

## 11. Required Fixture Injection (Blocked — Pending Paresh Authorization)

The following DB fixtures must be injected to enable approval-gate QA. These require
explicit Paresh authorization before any injection is attempted.

### 11.1 Catalog item policy updates (on `qa-b2b` catalog)

| Item | Required change | DB table | Column | New value |
|------|-----------------|----------|--------|-----------|
| Any 1 item (suggest: Organic Cotton Poplin `9effba8b`) | Set APPROVED_BUYER_ONLY visibility | `catalog_items` | `publication_posture` | `APPROVED_BUYER_ONLY` |
| Any 1 item (suggest: Combed Cotton Twill `5a2b41a2`) | Set RELATIONSHIP_ONLY price | `catalog_items` | `price_disclosure_policy_mode` | `RELATIONSHIP_ONLY` |
| Any 1 item (suggest: Stretch Cotton Sateen `e1526ebe`) | Remain as B2B_PUBLIC control item | — | — | No change |

### 11.2 Relationship state records (in `buyer_supplier_relationships`)

For sequential QA (single row, state changed between passes):

| State to test | Row to inject | Method |
|--------------|--------------|--------|
| REQUESTED | INSERT row: `(supplierOrgId=qa-b2b, buyerOrgId=qa-buyer, state='REQUESTED', requestedAt=NOW())` | psql via DATABASE_URL |
| APPROVED | UPDATE row: `state='APPROVED', approvedAt=NOW(), decidedAt=NOW()` | psql |
| BLOCKED | UPDATE row: `state='BLOCKED', decidedAt=NOW()` | psql |

For simultaneous multi-state QA (multiple buyer orgs needed):
- A second buyer org (e.g. `QA_BUYER_2`) would need to be seeded
- This is out of scope for this unit

### 11.3 Org eligibility posture (if buyer-as-supplier test is needed)

No change needed — `qa-buyer` is correctly configured as a buyer-only actor and
should NOT appear in `eligible-suppliers`. This is validated behaviour.

---

## 12. Data Access Boundaries

| Operation | Authorized in this unit | Notes |
|-----------|------------------------|-------|
| Read-only GET requests via authenticated Playwright session | ✅ YES | Performed — no mutations |
| DB read via psql / DATABASE_URL | ❌ NOT IN THIS UNIT | Discovery only |
| DB write via psql / DATABASE_URL | ❌ BLOCKED | Requires explicit Paresh authorization |
| Modification of catalog item policies via UI | ❌ NOT IN THIS UNIT | Out of scope |
| Modification of org `publication_posture` | ❌ NOT IN THIS UNIT | Out of scope |
| Seed script execution | ❌ NOT IN THIS UNIT | Out of scope |

---

## 13. Required Next Step — TECS-MULTI-TENANT-QA-FIXTURE-MATRIX-001-DATA-SEED

Before approval-gate QA can begin, the following seed unit must be authorized and executed:

**Proposed unit:** `TECS-MULTI-TENANT-QA-FIXTURE-MATRIX-001-DATA-SEED`  
**Type:** Bounded DB fixture injection (psql, non-ORM, no schema change)  
**Authorization required from:** Paresh  
**Allowlist for data-seed unit:**
- SQL injection via `psql` against `DATABASE_URL` (not a code file edit)
- `catalog_items` table: update `publication_posture` on 1 item to `APPROVED_BUYER_ONLY`
- `catalog_items` table: update `price_disclosure_policy_mode` on 1 item to `RELATIONSHIP_ONLY`
- `buyer_supplier_relationships` table: insert 1 row for `(qa-b2b, qa-buyer)` with desired test state

**This unit (TECS-MULTI-TENANT-QA-FIXTURE-MATRIX-001) does NOT implement this.**

After the data-seed unit completes, the approval-gate QA pass
(`TECS-SUPPLIER-CATALOG-APPROVAL-GATE-QA-001`) can proceed.

---

## 14. Recommended QA Execution Sequence (Once Fixtures Are Ready)

### Phase A — Verify gate blocks unapproved buyer (NONE state)
1. Authenticate as `qa.buyer@texqtic.com`
2. `GET /api/tenant/catalog/supplier/{qa-b2b-tenantId}/items`
3. **Expected:** 404 or `canAccessCatalog: false` for the `APPROVED_BUYER_ONLY` item
4. **Expected:** Items with `B2B_PUBLIC` or `PRIVATE_OR_AUTH_ONLY` posture are accessible

### Phase B — Verify gate blocks pending buyer (REQUESTED state)
1. Inject `BuyerSupplierRelationship(state=REQUESTED)` via psql
2. Authenticate as `qa.buyer@texqtic.com`
3. `GET /api/tenant/catalog/supplier/{qa-b2b-tenantId}/items`
4. **Expected:** `RELATIONSHIP_PENDING` denial for `APPROVED_BUYER_ONLY` item

### Phase C — Verify gate allows approved buyer (APPROVED state)
1. Update relationship row to `state=APPROVED`
2. Authenticate as `qa.buyer@texqtic.com`
3. `GET /api/tenant/catalog/supplier/{qa-b2b-tenantId}/items`
4. **Expected:** `APPROVED_BUYER_ONLY` item is visible

### Phase D — Verify price disclosure gate (RELATIONSHIP_ONLY price, APPROVED state)
1. Verify relationship is `state=APPROVED`
2. Authenticate as `qa.buyer@texqtic.com`
3. Check price visibility for item with `priceDisclosurePolicyMode=RELATIONSHIP_ONLY`
4. **Expected:** Price is visible for approved buyer

### Phase E — Verify gate re-blocks blocked buyer (BLOCKED state)
1. Update relationship row to `state=BLOCKED`
2. Authenticate as `qa.buyer@texqtic.com`
3. `GET /api/tenant/catalog/supplier/{qa-b2b-tenantId}/items`
4. **Expected:** `RELATIONSHIP_BLOCKED` denial for `APPROVED_BUYER_ONLY` item

---

## 15. Governance

| Contract | Applicable | Status |
|----------|-----------|--------|
| `db-naming-rules.md` | No DB change in this unit | N/A |
| `schema-budget.md` | No schema change in this unit | N/A |
| `rls-policy.md` | No new RLS path in this unit | N/A |
| `openapi.tenant.json` | No route change in this unit | N/A |
| `event-names.md` | No event in this unit | N/A |
| `ARCHITECTURE-GOVERNANCE.md` | Discovery only; no boundary change | N/A |

Multi-tenancy: All Playwright calls used `qa-b2b`'s own token. No cross-tenant token
injection or impersonation was performed. Discovery of `qa-buyer`'s DB state was
inferred from seed output artifacts only.

---

## 16. Allowlist Compliance

| File | Action in this unit |
|------|---------------------|
| `docs/TECS-MULTI-TENANT-QA-FIXTURE-MATRIX-001-REPORT.md` | Created (this file) |

No other files were modified, created, or deleted.

---

## 17. Commit Message

```
audit(qa): add multi-tenant fixture matrix readiness report
```
