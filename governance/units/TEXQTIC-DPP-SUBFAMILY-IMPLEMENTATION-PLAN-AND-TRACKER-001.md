---
unit_id: TEXQTIC-DPP-SUBFAMILY-IMPLEMENTATION-PLAN-AND-TRACKER-001
title: DPP sub-family implementation plan and tracker
type: GOVERNANCE
status: TRACKER
wave: B2B_DPP
plane: PUBLIC_AND_TENANT
opened: 2026-05-17
mode: REPO_TRUTH_PLANNING_ONLY
blockers: []
---

# DPP Sub-Family Implementation Plan and Tracker

## Status Summary

TexQtic already has a real public DPP foundation, not a hypothetical placeholder. The repo now contains a live public passport route at `/passport/:id`, a live public DPP JSON endpoint at `GET /api/public/dpp/:publicPassportId`, a live structured-data endpoint at `GET /api/public/dpp/:publicPassportId/structured-data`, a public token gate on `dpp_passport_states.public_token`, and a static trust landing page at `/trust` established by `de72ac7` and closed in governance by `06ba552`.

What remains incomplete is not the existence of DPP itself, but the continuity around it. Public contract registration is missing, public product detail does not yet expose a usable passport link, public supplier profile does not yet route into `/trust`, public passport detail does not yet provide an explicit authenticated continuation panel, and `/trust` cannot show live passport examples because there is no approved public listing projection.

This matters before any B2C or D2C family work relies on DPP trust claims. Product passports, trust badges, origin claims, collection-level trust surfaces, or consumer-facing continuity should not depend on ad hoc assumptions when the repo already shows a real but bounded public DPP architecture with explicit privacy and publication rules.

## Current Public DPP Runtime Truth

### Public entry and routing

- `/trust` exists as a static public Trust and Origin Passport landing page.
- `PUBLIC_PASSPORT` app state exists in `App.tsx`.
- `/passport/:id` exists as the public passport detail route.
- `App.tsx` renders `PublicPassport` for `PUBLIC_PASSPORT` and `PublicTrustLandingStub` for `PUBLIC_TRUST_LANDING`.

### Public DPP API and publication gate

- `GET /api/public/dpp/:publicPassportId` is live in `server/src/routes/public.ts`.
- `GET /api/public/dpp/:publicPassportId/structured-data` is live in `server/src/routes/public.ts`.
- The public identifier is `dpp_passport_states.public_token`, not `node_id` or `org_id`.
- Public reads require `status = 'PUBLISHED'` and a matching `public_token`.
- Missing or unpublished passports fail safe with a generic 404 response.
- Public route comments and implementation explicitly preserve RLS and org scoping by resolving the owner org first, then reading through org-scoped views.

### Public UI surfaces

- `components/Public/PublicPassport.tsx` renders a full public passport detail page.
- `components/Public/PublicProductDetail.tsx` already includes a trust, origin, and passport signals section.
- `components/Public/PublicSupplierProfile.tsx` already includes certification and traceability trust signals.
- `components/Public/PublicTrustLandingStub.tsx` is the explanatory public trust surface, not a listing or live record viewer.

### Current known omissions

- `shared/contracts/openapi.tenant.json` does not currently register the live public DPP detail or structured-data routes.
- `server/src/services/publicB2CProjection.service.ts` still returns `hasPassport: null` and does not surface `publicPassportId`.
- `components/Public/PublicProductDetail.tsx` therefore cannot link to `/passport/:id`.
- `components/Public/PublicSupplierProfile.tsx` shows trust signals but does not link to `/trust`.
- `components/Public/PublicPassport.tsx` receives only `publicPassportId` and does not yet expose an explicit authenticated continuation panel.
- No safe public passport listing projection or listing endpoint is present.

## Public / Private Boundary

### Allowed public signals confirmed in repo

- Published passport existence via `public_token`.
- Public-safe product identity and narrative.
- Public-safe manufacturer identity fields where approved by the public DPP response shape.
- Passport maturity and maturity label.
- Lineage summary and limited traceability presentation.
- Public-safe certification summary and approved certification display.
- QR verification payload pointing to `/passport/:id`.
- Public-safe trust signals on product and supplier surfaces.
- Supplier certification count, certification types, and traceability evidence presence.
- Static trust explanation and routing at `/trust`.

### Forbidden or protected fields and behaviors

- No public enumeration of unpublished or private passports.
- No `org_id`, `node_id`, internal source identifiers, or tenant identifiers in public route inputs or output identity.
- No private evidence URLs, protected document locations, commercial terms, negotiation data, or internal workflow state.
- No public trust API that bypasses published passport gating.
- No public listing of records absent a dedicated privacy-reviewed listing projection.

### Authenticated-only workflows

- Tenant DPP publish and revoke behavior in tenant routes.
- Label configuration and publication controls.
- Any deeper operational, document, commercial, or business intelligence path.
- Any continuation from public trust into tenant workflows should reuse sign-in or request-access handoffs rather than expose new public write paths.

## Existing Docs Found

### Core DPP and passport docs located

- `docs/TECS-DPP-PASSPORT-FOUNDATION-001-DESIGN-v1.md`
- `docs/TECS-DPP-PASSPORT-NETWORK-002-DESIGN-v1.md`
- `docs/TECS-DPP-PASSPORT-NETWORK-010-DESIGN-v1.md`
- `docs/architecture/DPP-SNAPSHOT-VIEWS-DISCOVERY.md`
- `docs/architecture/DPP-SNAPSHOT-VIEWS-DESIGN.md`
- `docs/ops/REMOTE-MIGRATION-APPLY-LOG.md`
- `governance/units/TEXQTIC-PUBLIC-DPP-TRUST-ORIGIN-PASSPORT-LANDING-STUB-VERIFICATION-001.md`
- `governance/control/SNAPSHOT.md`

### Read-only conclusions from those docs

- Existing DPP architecture and public publication logic are materially real and already documented.
- The trust landing work closed only the static explanatory page, not the adjacent runtime queue.
- Snapshot-view and passport-network design anchors remain useful reference material for later DPP work.
- Some older design text now risks drift against current repo truth, especially where historical docs describe public-route limitations that the repo has since closed.

### Recommended future docs to update in a separate explicit sync unit

- `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v1.md`
- `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v1.md`
- `governance/control/OPEN-SET.md` if DPP hold posture or authorized queue posture changes
- `governance/control/SNAPSHOT.md` if DPP status or recorded adjacency needs refresh

No document above was modified in this pass.

## Implementation Queue

### 1. PUBLIC-PASSPORT-DETAIL-CONTRACT-PARITY-001

**Purpose**

Register the already-live public DPP detail and structured-data endpoints in OpenAPI so contract truth matches runtime truth.

**Repo truth**

- `server/src/routes/public.ts` exposes both public DPP routes.
- `shared/contracts/openapi.tenant.json` does not currently describe them.
- The route shape appears stable and already has mature privacy boundaries, rate limiting, and structured-data behavior.

**Readiness**

`READY`

**Dependencies**

- No schema change.
- No runtime API creation required.
- Best opened before any further public DPP surface expansion.

**Likely files**

- `shared/contracts/openapi.tenant.json`

**Verification plan**

- Verify both path entries exist in OpenAPI.
- Verify parameters and response shape match the live route contract.
- Verify privacy notes exclude protected fields.
- Verify no runtime code changes are introduced if the unit remains contract-only.

**Suggested commit message**

- `[TEXQTIC] governance: register public dpp detail contract parity`

### 2. PRIVATE-DPP-AUTH-HANDOFF-001

**Purpose**

Add an explicit authenticated continuation panel to public passport detail so users can move from public trust verification into the correct tenant or request-access path.

**Repo truth**

- `components/Public/PublicPassport.tsx` renders the full public passport page but has no explicit authenticated continuation panel.
- `App.tsx` currently renders `PublicPassport` with only `publicPassportId`.
- Neighbor public surfaces already use sign-in and request-access callbacks, so the missing element is continuity, not capability.

**Readiness**

`READY`

**Dependencies**

- Contract parity is preferable first, but not technically blocking.
- No schema change expected.
- Likely frontend prop threading only.

**Likely files**

- `App.tsx`
- `components/Public/PublicPassport.tsx`

**Verification plan**

- Verify continuation panel renders on public passport detail.
- Verify sign-in CTA routes into the tenant auth handoff.
- Verify request-access or equivalent CTA routes into the approved external path if included.
- Verify no private fields or authenticated content are exposed on the public page.

**Suggested commit message**

- `[TEXQTIC] frontend: add public passport auth handoff`

### 3. SUPPLIER-TO-TRUST-LINKING-001

**Purpose**

Connect supplier public trust signals to the now-live `/trust` explanatory surface.

**Repo truth**

- `components/Public/PublicSupplierProfile.tsx` already shows certification and traceability signals.
- `/trust` is live and already framed as the public trust explanation and handoff surface.
- Supplier profile does not currently link into `/trust`.

**Readiness**

`READY`

**Dependencies**

- `/trust` must exist first, which is now satisfied.
- No backend change expected.

**Likely files**

- `components/Public/PublicSupplierProfile.tsx`

**Verification plan**

- Verify a clear CTA or trust explainer link appears near supplier trust signals.
- Verify it routes to `/trust`.
- Verify supplier profile remains projection-only and does not overclaim live passport coverage.

**Suggested commit message**

- `[TEXQTIC] frontend: link supplier trust signals to trust landing`

### 4. PRODUCT-TO-PASSPORT-LINKING-001

**Purpose**

Expose a safe public passport link from public product detail when a published public passport exists.

**Repo truth**

- `components/Public/PublicProductDetail.tsx` has a trust, origin, and passport signals section.
- `server/src/services/publicB2CProjection.service.ts` still returns `hasPassport: null`.
- No `publicPassportId` is surfaced into the public product detail payload.
- Because the projection does not carry the public reference, product detail cannot link to `/passport/:id`.

**Readiness**

`READY_FOR_IMPLEMENTATION_PROMPT`

**Dependencies**

- Requires projection and frontend wiring.
- Should rely on existing published passport/public token rules rather than inventing a second publication mechanism.
- No schema change appears necessary from current repo truth.

**Likely files**

- `server/src/services/publicB2CProjection.service.ts`
- `shared/contracts/openapi.tenant.json`
- `components/Public/PublicProductDetail.tsx`

**Verification plan**

- Verify public product payload includes a public-safe passport reference only when passport status is `PUBLISHED` and a public token exists.
- Verify product detail renders the passport link only when safe.
- Verify unpublished or absent passports fail closed.
- Verify no internal node or org identifiers leak into the public product contract.

**Suggested commit message**

- `[TEXQTIC] frontend: link public product detail to published passport`

### 5. PUBLIC-PASSPORT-LISTING-PROJECTION-001

**Purpose**

Design and implement a privacy-safe listing projection for published public passports, if TexQtic decides that public passport examples or listing behavior are product-appropriate.

**Repo truth**

- `/trust` is intentionally static and does not enumerate live passports.
- No listing endpoint or listing projection exists.
- Public DPP today is direct-link and QR-entry oriented, not browse-oriented.
- Listing published passports has privacy, business, and discoverability implications not resolved by current repo truth alone.

**Readiness**

`NEEDS_DESIGN_DECISION`

**Dependencies**

- Product and privacy decision on whether passport examples should be publicly browsable.
- Definition of a public allowlist for listing fields.
- Contract and projection design before implementation.

**Likely files**

- `server/src/routes/public.ts`
- `shared/contracts/openapi.tenant.json`
- `components/Public/PublicTrustLandingStub.tsx` or successor component
- A new listing projection service, if authorized

**Verification plan**

- Verify design approval defines listing-allowed fields.
- Verify only published passports appear.
- Verify no token enumeration or scraping amplification risk is introduced without explicit mitigation.
- Verify `/trust` remains public-safe and does not become a private record browser.

**Suggested commit message**

- `[TEXQTIC] design: define public passport listing projection`

## Additional Findings

### ADDITIONAL-FINDING-001 - Public DPP verification assets already exist

- `tests/e2e/dpp-passport-network.spec.ts` already contains extensive public DPP and structured-data coverage.
- Future units should reuse these tests and extend them where needed instead of inventing a second verification path.

### ADDITIONAL-FINDING-002 - DPP documentation drift should be reviewed later

- Some historical DPP design material still describes older route posture, including references that imply the public route lacked rate limiting.
- Current `server/src/routes/public.ts` shows the public DPP route is rate limited.
- This is not a blocker for the queue, but it is a future governance-sync candidate.

### ADDITIONAL-FINDING-003 - Publish flow and label config already exist and should be reused

- Tenant routes already implement DPP status transitions including `TRADE_READY -> PUBLISHED` and `PUBLISHED -> DRAFT`, along with `public_token` assignment and revocation.
- Public route already reads `dpp_passport_label_config`.
- Future public DPP expansions should reuse this publication chain and label config rather than introduce a new publish path.

## Recommended Sequencing

1. `PUBLIC-PASSPORT-DETAIL-CONTRACT-PARITY-001`
   Reason: runtime truth should be reflected in contract truth before additional public DPP expansion.
2. `PRIVATE-DPP-AUTH-HANDOFF-001`
   Reason: the live passport page already exists and needs explicit continuation more urgently than new discovery surfaces.
3. `SUPPLIER-TO-TRUST-LINKING-001`
   Reason: `/trust` is live and supplier trust signals already exist, making this a small bounded continuity improvement.
4. `PRODUCT-TO-PASSPORT-LINKING-001`
   Reason: this is the first unit that touches both projection and frontend contract continuity, so it should follow the simpler bounded surfaces.
5. `PUBLIC-PASSPORT-LISTING-PROJECTION-001`
   Reason: this is the most privacy-sensitive and product-sensitive expansion and should not open until Paresh decides that public listing behavior is desirable.

## Production Verification Requirements

### Contract-only units

- Confirm OpenAPI paths, parameters, and responses match current live behavior.
- Confirm no runtime files, schema, or routes change when the unit is contract-only.

### Frontend-only continuity units

- Verify CTA rendering in browser.
- Verify route handoff behavior.
- Verify no protected fields become visible.
- Verify missing-data states remain safe.

### Projection-plus-frontend units

- Verify the projection exposes only public-safe published fields.
- Verify frontend links render only when the safe public reference exists.
- Verify absent or unpublished references fail closed.
- Verify related pages remain stable.

### Design-gated listing units

- Require explicit design approval before implementation.
- Require privacy review of field allowlist.
- Require anti-enumeration, rate-limit, and scraping posture review.
- Require browser verification that the listing shows only approved public-safe published examples.

## Carry-Forward to B2C/D2C

The DPP public trust and passport foundation should be completed before B2C or D2C family work relies on product passports, collection trust, origin claims, trust badges, public DPP links, or any consumer-facing continuity that would imply broader passport readiness than the repo currently guarantees.

In particular, future B2C or D2C work should not assume:

- every public product can already link to a public passport,
- supplier trust cues already explain the trust surface coherently,
- public DPP endpoints are contract-complete,
- public passport examples are browseable,
- or public passport detail already includes the ideal authenticated continuation path.

## Future Governance Sync Targets

This tracker is the interim planning record only. After Paresh reviews the queue, a separate explicit governance sync unit should decide whether to update:

- `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v1.md`
- `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v1.md`
- `governance/control/OPEN-SET.md` if DPP posture changes at Layer 0
- `governance/control/SNAPSHOT.md` if DPP adjacency or recorded readiness context changes

No broader governance, product-truth, or control-plane file was modified in this pass.

## Governance Notes

- This unit is planning and tracker creation only.
- No runtime code was implemented.
- No schema, contract, route, projection, or data mutation was performed.
- No broader authority document was edited.
- The tracker exists to help Paresh queue the next bounded DPP units in repo-truth order.