---
unit_id: TEXQTIC-PUBLIC-DPP-TRUST-ORIGIN-PASSPORT-REPO-TRUTH-DESIGN-VALIDATION-001
title: Public DPP / Trust / Origin Passport Page — repo-truth design validation
type: GOVERNANCE
status: CLOSED
wave: PUBLIC_ATTRACTION
plane: PUBLIC
opened: 2026-05-17
closed: 2026-05-17
verified: 2026-05-17
mode: REPO_TRUTH_VALIDATION_ONLY
commit: N/A — repo-truth/design validation only; no runtime changes
doctrine_constraints:
  - D-007: governance-only unit; no runtime/schema/contract/test implementation
  - D-016: public surface projection-gating preserved; no private data exposed
  - PUBLIC-DOCTRINE-001: public-safe CTAs route to existing surfaces only
blockers: []
---

## 1. UNIT

- **Unit ID:** TEXQTIC-PUBLIC-DPP-TRUST-ORIGIN-PASSPORT-REPO-TRUTH-DESIGN-VALIDATION-001
- **Mode:** Repo-truth validation and bounded design refinement only. No runtime changes.
- **Family:** Public Attraction Layer
- **Page:** 8. Public DPP / Trust / Origin Passport Page
- **Public-facing label:** Trust & Origin Passport

---

## 2. EXECUTIVE SUMMARY

**Is implementation feasible?** YES — with important scope clarification.

**Existing route/data/API support found:**

The repo has **substantial, production-deployed DPP/passport infrastructure** that directly supports this page:

1. **`PUBLIC_PASSPORT` app state** already exists in `App.tsx` (line 1963).
2. **`/passport/:id` route** is already active, captured as `publicPassportIdFromPath`, and renders `<PublicPassport />`.
3. **`PublicPassport.tsx`** is a complete, rendered component at `components/Public/PublicPassport.tsx` — fetches `GET /api/public/dpp/:publicPassportId`, displays product identity, supply chain traceability, maturity tier, certifications, evidence summary, label config, and a QR code. This is a live, functional page.
4. **`GET /api/public/dpp/:publicPassportId`** is a live, rate-limited, two-phase RLS-enforced backend route in `server/src/routes/public.ts` (line 751+). It serves `PUBLISHED` passports only via `public_token` UUID lookup.
5. **`GET /api/public/dpp/:publicPassportId/structured-data`** (JSON-LD endpoint) is also live.
6. **`dpp_passport_states`** model with `public_token` is live in `server/prisma/schema.prisma` (line 1381+).
7. **`PublicProductDetail`** already shows a "Trust, origin, and passport signals" section with `trustSignals` badges and a "Public passport available" label when `hasPassport === true` (though `hasPassport` is currently hardcoded to `null` in the projection).
8. **`PublicSupplierProfile`** already shows `certificationCount`, `certificationTypes`, `hasTraceabilityEvidence` as trust signals with appropriate notice copy.

**Main gaps / scope for this page:**

The `/passport/:id` route is a **passport detail page** — it renders a specific, individually-identified passport record. There is currently **no public trust landing page** at `/trust` (or `/trust-passport` or `/origin`). Page 8 as designed in the prompt is a **trust explanation / discovery landing page** distinct from the existing passport detail page.

The implementation for Page 8 therefore requires:
- A new `/trust` route and `PUBLIC_TRUST_LANDING` app state (touching `App.tsx`)
- A new `PublicTrustLanding.tsx` component (static, no new API required)
- No new backend API or schema changes are required for the landing page itself

**Recommended implementation shape:**
- Implement `PUBLIC_TRUST_LANDING` as a **static trust explanation and entry-point page** at `/trust`, distinct from the existing `/passport/:id` detail route.
- The existing `PublicPassport.tsx` and `/passport/:id` route remain untouched — they serve individual passport records.
- The trust landing page has no public passport listing (none exists in the backend); it uses static copy explaining trust concepts, signals public fields that may appear on passport pages (maturity tiers, certifications, traceability depth), and provides CTAs routing to browse/B2B/sign-in/request-access.
- An optional "entry point" section can reference that public passports are accessible at `/passport/:id` via QR code or direct link when published by a supplier.

---

## 3. CURRENT REPO TRUTH

### Files Inspected

| File | Relevant Findings |
|---|---|
| `App.tsx` (lines 1955–2115, 6690–6700) | `PUBLIC_PASSPORT` in `AppState` union; `/passport/:id` regex match in `resolveInitialAppState()`; `publicPassportIdFromPath` state; renders `<PublicPassport publicPassportId={...} />`; no `/trust`, `/origin`, `/trust-passport` route handling found |
| `components/Public/PublicPassport.tsx` (full file) | Complete passport detail page; fetches `GET /api/public/dpp/:publicPassportId`; displays maturity tier, product identity, supply chain traceability timeline, evidence summary, certification cards, QR code, label config; safe 404 + error states present |
| `components/Public/PublicProductDetail.tsx` (lines 230–275) | "Trust, origin, and passport signals" section present; renders `trustSignals[]` as pill badges; renders "Public passport available" badge when `hasPassport === true`; no link to `/passport/:id` yet (badge is presentational only, no CTA to trust page) |
| `components/Public/PublicSupplierProfile.tsx` (full grep) | Shows `certificationCount`, `certificationTypes`, `hasTraceabilityEvidence` in a "Trust signals" section; has a `trustNotice` copy line; no link to `/trust` or `/passport` present |
| `components/Public/` (directory listing) | No `PublicTrustLanding.tsx` exists; no trust landing page component present |
| `server/src/routes/public.ts` (lines 751–1140+) | `GET /api/public/dpp/:publicPassportId` live; `GET /api/public/dpp/:publicPassportId/structured-data` (JSON-LD) live; no `/trust`, `/passports` listing, `/origin` endpoint; two-phase lookup: Phase 1 via `texqtic_public_lookup` role, Phase 2 via `withDbContext({orgId})` RLS-scoped queries |
| `server/src/services/publicB2CProjection.service.ts` (lines 430–490) | `hasPassport: null` — hardcoded null; `trustSignals` built as label array but does not include public passport ID linking or `/passport/:id` CTA; no `publicPassportId` field surfaced in product detail projection |
| `server/src/services/publicB2BProjection.service.ts` (lines 67–472) | `certificationCount: number`, `certificationTypes: string[]`, `hasTraceabilityEvidence: boolean` — all live in supplier profile projection |
| `server/prisma/schema.prisma` (lines 1381–1398, 972–1001) | `dpp_passport_states` with `public_token UUID UNIQUE` (gate for published passports); `TraceabilityNode` model; `Certification` model (line 914); `dpp_evidence_items` (visibility-gated); models are internal-only — no direct public exposure without projection layer |
| `shared/contracts/openapi.tenant.json` | `/api/public/b2c/products`, `/api/public/b2c/products/{slug}`, `/api/public/supplier/{slug}`, `/api/public/inquiry/submit` registered; **`/api/public/dpp/{publicPassportId}` is NOT registered** in OpenAPI contract |

### Route Inventory (Public Attraction Layer — current state)

| Route | App State | Status | Component |
|---|---|---|---|
| `/` | `PUBLIC_ENTRY` | Live | Homepage |
| `/product/:slug` | `PUBLIC_PRODUCT_DETAIL` | Live | `PublicProductDetail` |
| `/supplier/:slug` | `PUBLIC_SUPPLIER_PROFILE` | Live | `PublicSupplierProfile` |
| `/collections` | `PUBLIC_COLLECTIONS` | Live (stub) | `PublicCollectionsStub` |
| `/collections/:slug` | `PUBLIC_COLLECTION_DETAIL_UNAVAILABLE` | Live (stub) | `PublicCollectionUnavailable` |
| `/passport/:id` | `PUBLIC_PASSPORT` | Live (full) | `PublicPassport` |
| `/join/:referral_code` | `PUBLIC_REFERRAL_LANDING` | Live | `PublicReferralLanding` |
| `/trust` | ❌ NOT PRESENT | Missing | No component |
| `/origin` | ❌ NOT PRESENT | Missing | No component |
| `/trust-passport` | ❌ NOT PRESENT | Missing | No component |

---

## 4. DPP / PASSPORT DATA MODEL FINDINGS

### What Exists

| Model | Table | Status | Public-Safe? |
|---|---|---|---|
| `dpp_passport_states` | `dpp_passport_states` | Live | Via `public_token` gate only; PUBLISHED records only |
| `TraceabilityNode` | `traceability_nodes` | Live | Internal; exposed via DPP projection snapshots |
| `Certification` | `certifications` | Live | Internal; count/types surfaced in supplier profile projection |
| `dpp_evidence_items` | `dpp_evidence_items` | Live | Internal; `visibility='PRIVATE'` by default; `document_url` / `storage URLs` strictly excluded |
| DPP snapshot views | `dpp_snapshot_products_v1`, `dpp_snapshot_lineage_v1`, `dpp_snapshot_certifications_v1` | Live | Used by DPP API; filtered by `withDbContext({orgId})` RLS |
| `dpp_passport_label_config` | `dpp_passport_label_config` | Live | Partial exposure via label config in DPP API response |

### Can Models Support the Trust Landing Page?

**YES — no new schema required for the trust landing page.**

The trust landing page is a static explanation surface. It does not need to enumerate or list passport records. The existing `/passport/:id` + `GET /api/public/dpp/:publicPassportId` backend serves individual published passports.

### Public-Safety Classification

- `public_token` UUID is the **sole safe public identifier** for a passport record. Internal `id`, `org_id`, `node_id`, `reviewed_by_user_id` must never be surfaced.
- Certification `type` strings (e.g. `"GOTS"`, `"OEKO-TEX"`) and lifecycle state name `"APPROVED"` are public-safe signals.
- `document_url`, `storage URLs`, `claim_value`, `extractionId`, `approved_by`, `confidence scores` are explicitly excluded in the DPP route handler (lines 1080–1090 in `public.ts`).
- `dpp_evidence_items.visibility = 'PRIVATE'` records must never appear on any public surface.

### Missing Fields for Trust Landing Page Context

The trust landing page itself needs **no new data fields** — it is a static explanation page. However, two adjacent fields are missing if future cross-linking is desired:
1. **`publicPassportId` in `publicB2CProductDetail`** — `hasPassport` is currently `null` in the projection; the actual public token is not surfaced, so product detail cannot yet link to a specific `/passport/:id`.
2. **No public listing of passports** — there is no endpoint or projection to enumerate published passports for display.

---

## 5. ROUTE FINDINGS

### Existing Route Support

- `/passport/:id` is live and fully functional — routes to `PublicPassport.tsx` via `PUBLIC_PASSPORT` state.
- No trust landing page route (`/trust`, `/origin`, etc.) exists in `App.tsx`.

### Recommended Route Pattern

**`/trust`** — canonical public trust landing page.

Rationale:
- Short, brand-safe, visitor-friendly URL.
- Distinct from `/passport/:id` which is a record-specific surface.
- Aligns with the "Trust & Origin Passport" public-facing label.
- Does not conflict with any existing route.

### App.tsx Impact

`App.tsx` must be touched to:
1. Add `'PUBLIC_TRUST_LANDING'` to the `AppState` union type.
2. Add a `/trust` path match in `resolveInitialAppState()`.
3. Add a render case for `PUBLIC_TRUST_LANDING`.

This is standard, minimal, and consistent with the pattern used for all other Public Attraction Layer pages.

---

## 6. API / PROJECTION FINDINGS

### Public Passport Detail Endpoint

| Item | Status |
|---|---|
| `GET /api/public/dpp/:publicPassportId` | ✅ Live — serves published passport records by UUID token |
| `GET /api/public/dpp/:publicPassportId/structured-data` | ✅ Live — JSON-LD representation |
| Rate limiting | ✅ `max 100/15 min per IP` via `@fastify/rate-limit` |
| Auth required | ✅ None — fully public |
| RLS enforced | ✅ Two-phase: `texqtic_public_lookup` + `withDbContext({orgId})` |
| Safe 404 for unpublished/missing | ✅ "DPP passport not found" — does not reveal status |

### Public Passport Listing Endpoint

| Item | Status |
|---|---|
| `GET /api/public/passports` or similar | ❌ Does NOT exist |
| Public passport enumeration | ❌ Not implemented |
| Projection service for passport listing | ❌ Not implemented |

**Implication for Page 8:** The trust landing page **cannot show live public passport examples** because there is no listing projection or endpoint. The page must either:
- Use static explanatory copy only (recommended for trust landing stub), OR
- Defer live passport examples until a listing projection is implemented (separate unit).

### Backend Projection Required Before Implementation

**For the trust landing page itself:** No new backend projection is required. It is a static attraction surface.

**For future live passport examples on the trust page:** A `publicPassportListingProjection.service.ts` would be needed. This is deferred as an adjacent finding (`PUBLIC-PASSPORT-LISTING-PROJECTION-001`).

---

## 7. CONTRACT FINDINGS

### OpenAPI Entries Registered

| Endpoint | OpenAPI Contract |
|---|---|
| `GET /api/public/b2c/products` | ✅ Registered in `openapi.tenant.json` |
| `GET /api/public/b2c/products/{slug}` | ✅ Registered |
| `GET /api/public/supplier/{slug}` | ✅ Registered |
| `POST /api/public/inquiry/submit` | ✅ Registered |
| `GET /api/public/dpp/{publicPassportId}` | ❌ **NOT registered** in `openapi.tenant.json` |
| `GET /api/public/dpp/{publicPassportId}/structured-data` | ❌ **NOT registered** |

### Contract Gaps

**Critical gap:** `GET /api/public/dpp/:publicPassportId` and its structured-data variant are live production endpoints but have no OpenAPI contract entry. This is an existing contract parity gap (predates this unit) that must be addressed in a separate contract sync unit.

**Contract sync required:** `PUBLIC-PASSPORT-DETAIL-CONTRACT-PARITY-001` — add `GET /api/public/dpp/{publicPassportId}` and `GET /api/public/dpp/{publicPassportId}/structured-data` to `openapi.tenant.json`.

**No new contract needed for the trust landing page** (static frontend only; no new API).

---

## 8. RELATIONSHIP TO PRODUCT DETAIL

### Current State

`PublicProductDetail.tsx` has a "Trust, origin, and passport signals" section (line 236) that:
- Renders `trustSignals[]` as pill badges (currently includes `"Public-safe projection only"` and optionally `"Traceability evidence available"`)
- Renders a `"Public passport available"` badge when `hasPassport === true`
- **Does not link to `/passport/:id`** — badge is presentational only, no CTA or link to a specific passport

### `hasPassport` Status

In `publicB2CProjection.service.ts` (line 475): `hasPassport: null` — hardcoded null. The projection does not currently query `dpp_passport_states` to determine whether a published passport exists for a given product node. The "Public passport available" badge in `PublicProductDetail.tsx` is a dead code path.

### Limitations

- Product detail cannot link to a specific `/passport/:id` without a `publicPassportId` field in the B2C projection.
- Product detail cannot link to `/trust` either — no CTA to the trust landing page exists yet.
- Both linking gaps are adjacent findings, not in scope for the trust landing page stub itself.

---

## 9. RELATIONSHIP TO SUPPLIER PROFILE

### Current State

`PublicSupplierProfile.tsx` has a "Trust signals" section (line 464+) that shows:
- `certificationCount` — number of certified records
- `certificationTypes[]` — type string labels (e.g. `"GOTS"`, `"ISO"`)
- `hasTraceabilityEvidence` — boolean flag

These fields are live and populated by `publicB2BProjection.service.ts` which queries `certifications` and `traceability_nodes` tables with appropriate tenant scoping.

### Limitations

- Supplier profile does not link to `/trust` or to any specific `/passport/:id`.
- Certification type strings are currently used as raw DB values; they have not been mapped to a safe display vocabulary (could surface internal enum strings if DB values are not already safe labels).
- No `CTA` exists on supplier profile pointing to a trust explanation page.

---

## 10. AUTH / PRIVATE TRUST HANDOFF FINDINGS

### Deeper Trust Workflows That Must Remain Authenticated

| Workflow | Plane | Auth Required |
|---|---|---|
| DPP passport creation and publishing | Tenant | ✅ Yes |
| Certification management | Tenant | ✅ Yes |
| Evidence/document upload and review | Tenant | ✅ Yes |
| Traceability node management | Tenant | ✅ Yes |
| Internal DPP compliance workflow state | Tenant | ✅ Yes |
| Passport admin approval/rejection | Control Plane | ✅ Yes |
| Buyer-specific trust record access | Tenant/Buyer | ✅ Yes |
| Private DPP record audit trail | Tenant | ✅ Yes |
| WL DPP Label admin config | WL Admin | ✅ Yes |
| RFQ compliance context | Tenant | ✅ Yes |

### Existing Handoff Patterns Confirmed

- `setAppState('AUTH')` / `openSecondaryAuthenticatedEntry('TENANT')` patterns are established in all existing public pages.
- Supplier request-access CTA routes to `https://texqtic.com/request-access` — confirmed live.
- All existing public pages include explicit trust notices ("only authenticated workflows can access...").

### Sign-In Handoff for Trust Page

The trust landing page must use:
- `onSignIn` → existing auth entry (same pattern as all Public Attraction Layer pages)
- `https://texqtic.com/request-access` for supplier/listing CTA
- No new authenticated entry points; no new session handling

---

## 11. SAFE UNAVAILABLE STATE FINDINGS

### Existing Patterns

| Page | Safe Unavailable Pattern | Notes |
|---|---|---|
| `PublicPassport.tsx` | ✅ Present — "Passport not found" / "Unable to load passport" — does not distinguish "not found" from "not PUBLISHED" | Lines 169–199 |
| `PublicProductDetail` | ✅ Has loading/error states | |
| `PublicCollectionUnavailable.tsx` | ✅ Present — "This Verified Collection Preview is not available" | Committed 22123b2 |
| Trust landing (`/trust`) | ❌ No component exists yet | |

### Recommended Unavailable State for Trust Landing

The trust landing page is a static explanation surface — it has no unique "not found" state because it does not fetch a specific record. However, it should handle:

1. **No public passport list available** — use static copy only; do not show empty list state or "no passports published" message (reveals operational status).
2. **Entry point copy for `/passport/:id`** — state that individual trust passports are available at direct links / via QR code; do not enumerate or count them.
3. **If a passport link is surfaced and the passport is unavailable** — the existing `PublicPassport.tsx` safe 404 state handles this correctly at `/passport/:id`.

Recommended copy for the "no listing available" case (embedded in static copy):
> "TexQtic Trust & Origin Passports are published by suppliers for specific textile products. They are accessible via direct link or QR code."

This avoids implying a browsable list while remaining accurate to the existing infrastructure.

---

## 12. REFINED PAGE 8 DESIGN

```
PAGE NAME:
Public Trust Landing Page

PUBLIC-FACING LABEL:
Trust & Origin Passport

PAGE PURPOSE:
A public-safe trust and origin explanation surface that describes how TexQtic connects
textile products, suppliers, origin, traceability, certifications, and verification signals
to help visitors understand textile trust context — while routing deeper verification
workflows, private documents, compliance records, and full DPP passport records into
authenticated TexQtic surfaces.

TARGET VISITOR:
Consumer buyers; B2B textile buyers; sourcing teams; brands; retailers;
semi-wholesale buyers; suppliers considering listing; manufacturers; exporters;
compliance and service providers; general public trust/origin visitors.

PUBLIC STATUS:
Static attraction page. No live data fetch required for initial implementation.
No public passport listing (not yet available). Individual passports accessible
via /passport/:id (existing route) via direct link or QR code.

PRIMARY USER QUESTION:
How does TexQtic help me understand textile trust, origin, and verification without
exposing private business records?

ABOVE-THE-FOLD CONTENT:
- TexQtic logo / brand header
- Hero heading: "Trust and origin behind every textile journey."
- Hero subheading: "TexQtic connects textile discovery with public-safe trust, origin,
  traceability, and verification context — while protecting private business records and
  authenticated workflows."
- Supporting line: "From supplier capability to product confidence."
- Primary CTA: "Browse Products" (routes to B2C Browse shell)
- Secondary CTA: "Explore B2B Network" (routes to B2B Discovery shell)

MAIN SECTIONS:
1. Hero / trust promise (above the fold)
2. "What is a Trust & Origin Passport?" — explanation section
3. "What can be shown publicly?" — public trust signal examples with 3–4 static cards
4. "What stays protected?" — private boundary notice
5. "How trust connects across TexQtic" — static diagram / narrative connecting
   product detail → supplier profile → passport → auth continuation
6. "How to access a Trust & Origin Passport" — QR/direct link explanation
   (individual passports accessible via direct link or QR code from suppliers;
   NOT a browsable list)
7. Authenticated handoff panel — "Need deeper verification? Sign in to continue."
8. Optional: "List your business / become a supplier" CTA

CARD / DISPLAY TYPES:
- Hero block (heading + subheading + CTAs)
- Explanation card (What is a Trust & Origin Passport?)
- Trust signal grid (3–4 static cards: Product Origin, Traceability Depth,
  Certifications, Verification Posture) — static labels only, no live data
- Protected boundary notice block (what stays protected)
- Trust connection narrative / flow block (static)
- Passport access explanation block (QR/link model)
- Authenticated handoff panel
- Public notice footer

ALLOWED DATA (for initial stub — all static):
- Public-safe explanatory copy
- Static trust signal label examples:
  "Product origin summary", "Traceability evidence", "Certification signals",
  "Verification posture", "Maturity tier"
- Maturity tier descriptions: LOCAL_TRUST, TRADE_READY, COMPLIANCE, GLOBAL_DPP
  (as defined in the existing DPP system — these are already public via PublicPassport.tsx)
- Generic product/supplier/passport copy (no specific IDs, slugs, or records)
- CTA targets: B2C Browse, B2B Discovery, Auth sign-in, request-access URL

FORBIDDEN DATA:
- Internal DPP IDs, passport IDs, tenant IDs, org IDs
- Any live passport records or listing
- Private certificates, documents, audit trails
- Internal compliance state, verification failure reasons
- Admin notes, supplier contacts
- Private factory addresses
- Buyer-specific records
- Order, contract, or negotiation data
- Internal scores or AI confidence values
- Any Aggregator intelligence surface
- Private DPP evidence items

PRIMARY CTA:
"Browse Products" → routes to PUBLIC_B2C_BROWSE state

ALTERNATIVE PRIMARY CTA (if "Browse Products" is less relevant for page):
"Explore Public Passports" → CTA explaining that passports are available via
supplier direct links / QR codes; no browse list

SECONDARY CTA:
"Explore B2B Network" → routes to PUBLIC_B2B_DISCOVERY state

AUTHENTICATED HANDOFF:
"Sign in to Continue" → routes to auth entry (existing TENANT auth pattern)
"List Your Business" → https://texqtic.com/request-access

DEPENDENT PROJECTION / API:
None for initial trust landing stub. (Static page only.)
Future: PUBLIC-PASSPORT-LISTING-PROJECTION-001 if live examples are added.
Future: PRODUCT-TO-PASSPORT-LINKING-001 if product detail needs /passport/:id link.

CONTRACT NEED:
No new API contract needed for trust landing page itself.
Existing contract gap: /api/public/dpp/{publicPassportId} missing from openapi.tenant.json
→ must be resolved in PUBLIC-PASSPORT-DETAIL-CONTRACT-PARITY-001 (separate unit).

RISK NOTES:
1. No public passport listing exists — trust page must not imply one.
2. hasPassport is null in B2C projection — product detail "Public passport available"
   badge is a dead code path. Trust page cannot reference live product → passport linking
   until PRODUCT-TO-PASSPORT-LINKING-001 is resolved.
3. certificationTypes in supplier profile projection are raw DB strings — review that
   values are safe display labels before surfacing on trust page.
4. /passport/:id route must not be replaced or merged with /trust — they serve
   different purposes (record-specific vs. explanation landing).
5. App.tsx modification (adding PUBLIC_TRUST_LANDING + /trust route) must be
   tested with all existing Public Attraction Layer neighbor paths.

DESIGN STATUS:
READY_FOR_TRUST_LANDING_STUB_ONLY
```

---

## 13. IMPLEMENTATION READINESS DECISION

```
READY_FOR_TRUST_LANDING_STUB_ONLY
```

**Rationale:**
- No new backend API, projection, or schema changes are required for an initial trust landing stub at `/trust`.
- The trust landing page is a static explanation surface following the same pattern as `PublicCollectionsStub.tsx`.
- The existing `/passport/:id` detail route and `PublicPassport.tsx` are fully functional and must not be changed.
- The existing DPP/passport backend infrastructure supports the trust model conceptually; live data linking is deferred.
- Contract parity for the existing `/api/public/dpp/:publicPassportId` endpoint must be addressed separately.

---

## 14. RECOMMENDED IMPLEMENTATION ORDER

### Order for Page 8

1. **Implement trust landing page stub first** — static `/trust` route with `PublicTrustLandingStub.tsx`. No new API. Follows the same stub pattern as `/collections`.
2. **Then: Contract parity sync** — add `/api/public/dpp/{publicPassportId}` to `openapi.tenant.json` (separate unit: `PUBLIC-PASSPORT-DETAIL-CONTRACT-PARITY-001`).
3. **Then: Product-to-passport linking** — if product detail should link to `/passport/:id`, resolve `PRODUCT-TO-PASSPORT-LINKING-001` (separate unit; requires updating `publicB2CProjection.service.ts` to surface `publicPassportId` when a PUBLISHED passport exists for a product).
4. **Then: Supplier-to-trust linking** — if supplier profile should link to `/trust`, resolve `SUPPLIER-TO-TRUST-LINKING-001` (minor UI addition; separate unit).
5. **Last: Public passport listing** — `PUBLIC-PASSPORT-LISTING-PROJECTION-001` is the most complex adjacent unit and should be deferred until business need is confirmed.

### Do Not

- Do not implement a live passport listing on the trust landing page before the listing projection exists.
- Do not replace the existing `/passport/:id` route with `/trust`.
- Do not surface `publicPassportId` in product detail projection without a dedicated contract-reviewed unit.

---

## 15. PROPOSED IMPLEMENTATION FILE ALLOWLIST

For the next implementation unit (trust landing stub only):

**MODIFY:**
- `App.tsx` — add `'PUBLIC_TRUST_LANDING'` to `AppState` union; add `/trust` path match in `resolveInitialAppState()`; add render case for `PUBLIC_TRUST_LANDING`

**CREATE:**
- `components/Public/PublicTrustLandingStub.tsx` — new static trust explanation and entry-point page

**READ-ONLY (do not modify):**
- `components/Public/PublicPassport.tsx` — existing passport detail; must not be changed
- `components/Public/PublicProductDetail.tsx` — neighbor path; must not be changed
- `components/Public/PublicSupplierProfile.tsx` — neighbor path; must not be changed
- `server/src/routes/public.ts` — existing backend; must not be changed
- `shared/contracts/openapi.tenant.json` — contract sync deferred to separate unit
- `server/prisma/schema.prisma` — no schema changes

**Minimum implementation: 2 files modified/created (App.tsx + PublicTrustLandingStub.tsx)**

---

## 16. VERIFICATION PLAN FOR NEXT UNIT

After implementing the trust landing stub:

### Required Route Checks

| Route | Verification |
|---|---|
| `/trust` | Returns 200; renders trust landing page with correct heading and sections |
| `/trust` | No live data fetch attempted; static only |
| `/trust` | Title resolves to "TexQtic — Trust & Origin Passport" (or equivalent) |
| `/passport/:id` (existing) | Still returns 200; PublicPassport.tsx renders correctly (regression check) |
| `/passport/invalid-uuid` | Returns safe unavailable state — "Passport not found" |
| `/` | Homepage stable (neighbor path) |
| `/product/:slug` | Product detail stable (neighbor path) |
| `/supplier/:slug` | Supplier profile stable (neighbor path) |
| `/collections` | Collections stub stable (neighbor path) |
| `/collections/:slug` | Collection unavailable stable (neighbor path) |

### CTA Behavior Checks

| CTA | Target | Expected |
|---|---|---|
| Browse Products | B2C Browse shell | Routes correctly |
| Explore B2B Network | B2B Discovery shell | Routes correctly |
| Sign in to Continue | Auth entry | Routes correctly |
| List Your Business | https://texqtic.com/request-access | Routes correctly |

### Data Boundary Checks

| Check | Expected |
|---|---|
| No API call on `/trust` | Confirmed — static page, no network request |
| No passport IDs in page source | Confirmed |
| No org IDs, node IDs, tenant IDs | Confirmed |
| No private document URLs | Confirmed |
| No live passport records rendered | Confirmed |
| No Aggregator intelligence | Confirmed |

### API Checks (if any new API is added)

Not applicable for trust landing stub — no new API.

---

## 17. ADJACENT FINDINGS

The following adjacent findings were identified during repo-truth validation. They are **outside the scope of this validation unit and the trust landing stub implementation unit**. Each must be opened as a separate bounded unit before implementation.

---

### A. PUBLIC-PASSPORT-DETAIL-CONTRACT-PARITY-001

**Candidate Title:** Register public DPP detail endpoints in OpenAPI contract

**Rationale:**
`GET /api/public/dpp/:publicPassportId` and `GET /api/public/dpp/:publicPassportId/structured-data` are live production endpoints (since ~commit 5ba6db9 / subsequent) but are not registered in `shared/contracts/openapi.tenant.json`. This is an existing contract parity gap.

**Likely Minimum File Surface:**
- `shared/contracts/openapi.tenant.json` — add path entries for both endpoints with request/response schema

**Readiness Classification:**
READY — endpoints are live and their response shapes are well-defined in `public.ts` (`D6PublicDppData` type, `D6MaturityLevel` enum, certification array, lineage summary, label config).

**Why Outside This Unit:**
Contract-only change with no runtime impact; should be isolated atomic commit.

---

### B. PUBLIC-PASSPORT-LISTING-PROJECTION-001

**Candidate Title:** Public passport listing projection for trust landing page

**Rationale:**
The trust landing page currently cannot show any live public passport examples because no listing endpoint or projection service exists. If the product team decides the trust landing page should show live passport examples (e.g., recently published passports, supplier-approved public records), a listing projection would be required.

**Likely Minimum File Surface:**
- `server/src/routes/public.ts` — new `GET /api/public/passports` endpoint (or similar)
- `server/src/services/publicPassportListingProjection.service.ts` — new service
- `shared/contracts/openapi.tenant.json` — new endpoint contract
- Frontend: `PublicTrustLandingStub.tsx` upgraded to `PublicTrustLanding.tsx` with live examples

**Readiness Classification:**
NEEDS_DESIGN_DECISION — no product decision on whether/how to list published passports publicly exists yet. Privacy implications of listing passport records must be reviewed (even PUBLISHED records may be supplier-sensitive in listing form).

**Why Outside This Unit:**
Requires backend implementation, new API contract, and a product decision on listing gate rules.

---

### C. PRODUCT-TO-PASSPORT-LINKING-001

**Candidate Title:** Link product detail to public passport via publicPassportId

**Rationale:**
`PublicProductDetail.tsx` has a "Trust, origin, and passport signals" section that conditionally renders "Public passport available" when `hasPassport === true`. However `hasPassport` is hardcoded to `null` in `publicB2CProjection.service.ts` (line 475). Additionally, there is no `publicPassportId` field in the projection that could power a link to `/passport/:id`.

Resolving this would allow product detail pages to carry a live link to the product's specific passport when one is published.

**Likely Minimum File Surface:**
- `server/src/services/publicB2CProjection.service.ts` — query `dpp_passport_states` WHERE `node_id` matches product's traceability node AND `status = 'PUBLISHED'`; surface `public_token` as `publicPassportId`
- `shared/contracts/openapi.tenant.json` — add `publicPassportId` to `GET /api/public/b2c/products/{slug}` response schema
- `components/Public/PublicProductDetail.tsx` — upgrade "Public passport available" badge to a link CTA to `/passport/:publicPassportId`

**Readiness Classification:**
READY_FOR_IMPLEMENTATION_PROMPT — backend query is straightforward (tenant-scoped); data model fully supports it; no schema change needed.

**Why Outside This Unit:**
Multi-layer change (projection + contract + frontend) that must be a separate bounded unit with its own allowlist and verification plan. Requires contract update.

---

### D. SUPPLIER-TO-TRUST-LINKING-001

**Candidate Title:** Add trust page link CTA to supplier profile

**Rationale:**
`PublicSupplierProfile.tsx` shows certification counts, types, and traceability evidence flags in a "Trust signals" section. A simple CTA linking to `/trust` would allow supplier profile visitors to understand the trust model context.

**Likely Minimum File Surface:**
- `components/Public/PublicSupplierProfile.tsx` — add a "Learn about trust passports" link or button routing to `/trust`

**Readiness Classification:**
READY — but depends on `/trust` route being implemented first (trust landing stub unit).

**Why Outside This Unit:**
Separate, minimal frontend-only change that should be its own atomic commit after the trust landing page is live.

---

### E. PRIVATE-DPP-AUTH-HANDOFF-001

**Candidate Title:** Authenticated handoff from public passport to tenant DPP

**Rationale:**
The public `PublicPassport.tsx` page renders a published passport but does not have an explicit "Sign in for deeper access" CTA. Visitors who arrive via QR code or direct link and are not suppliers/authenticated users may want to continue into authenticated DPP workflows.

**Likely Minimum File Surface:**
- `components/Public/PublicPassport.tsx` — add an authenticated handoff panel at the bottom (sign in to continue; list your business)
- `App.tsx` — pass `onSignIn` and `onRequestAccess` props to `PublicPassport` (currently only takes `publicPassportId`)

**Readiness Classification:**
READY — minor frontend-only enhancement consistent with existing CTA patterns.

**Why Outside This Unit:**
Separate bounded change; touches `PublicPassport.tsx` and `App.tsx` prop threading — must be its own allowlisted unit.

---

## 18. COMMIT INSTRUCTION

This unit produces one governance artifact file:
`governance/units/TEXQTIC-PUBLIC-DPP-TRUST-ORIGIN-PASSPORT-REPO-TRUTH-DESIGN-VALIDATION-001.md`

**Suggested commit message:**
```
[TEXQTIC] governance: validate public trust passport design
```

**Staged files:**
- `governance/units/TEXQTIC-PUBLIC-DPP-TRUST-ORIGIN-PASSPORT-REPO-TRUTH-DESIGN-VALIDATION-001.md`

**No runtime changes made in this unit.**

---

## Completion Checklist

- ✅ Existing public DPP/passport routes checked (`/passport/:id` — live; `/trust` — absent)
- ✅ Existing public DPP/passport components checked (`PublicPassport.tsx` — live and complete)
- ✅ Existing public DPP/passport APIs/projections checked (`GET /api/public/dpp/:publicPassportId` — live; no listing)
- ✅ Existing contracts checked (`openapi.tenant.json` — DPP endpoints NOT registered; gap recorded)
- ✅ Relationship to product detail checked (`hasPassport: null`; no active passport link; trust section exists but not linked)
- ✅ Relationship to supplier profile checked (trust signals live; no trust page CTA)
- ✅ DPP/certification/compliance data model checked (models confirmed; boundary rules confirmed)
- ✅ Authenticated trust handoff reviewed (all deeper workflows remain authenticated)
- ✅ Safe unavailable patterns checked (`PublicPassport.tsx` has safe 404; trust landing is static — no record fetch)
- ✅ Data boundary reviewed (forbidden fields confirmed and documented)
- ✅ Refined Page 8 design template completed
- ✅ Implementation readiness decision provided: `READY_FOR_TRUST_LANDING_STUB_ONLY`
- ✅ Recommended implementation order provided
- ✅ Smallest likely implementation allowlist proposed (2 files)
- ✅ Production verification plan provided
- ✅ Adjacent findings separated (5 findings: A–E)
- ✅ No runtime implementation performed

---

**Unit validated and closed: 2026-05-17**
**Last updated:** 2026-05-17
