---
unit_id: SOFT-LAUNCH-REPO-TRUTH-RT2-A-AGGREGATOR-DIRECTORY-ROUTE-DATA-AUDIT
title: RT2-A — Aggregator Directory Route and Data Source Audit (Repo Truth)
type: AUDIT
status: COMPLETE
date: 2026-05-21
commit_basis: 83c503a36d9078c000082ba0d4de1be6de812cf8
scope: /products, /product/:slug, /aggregator (directory surface classification only)
authorized_by: Paresh Patel
---

# RT2-A — Aggregator Directory Route and Data Source Audit

**Unit:** `SOFT-LAUNCH-REPO-TRUTH-RT2-A-AGGREGATOR-DIRECTORY-ROUTE-DATA-AUDIT`
**Date:** 2026-05-21
**Authority:** Repo source code, routes, components, services, tests. Governance docs are secondary comparison only.
**Basis commit:** `83c503a36d9078c000082ba0d4de1be6de812cf8`

---

## §1 Unit Header and Authority Boundary

This is a read-only repo-truth audit of the core aggregator/B2B directory route and data-source surfaces. It covers exactly three URL surfaces:

- `/products`
- `/product/:slug`
- `/aggregator` — only to determine whether it is directly part of the aggregator directory discovery surface

**Authority order:**
1. Actual repo source code: routes, components, services, tests
2. Existing test artifacts and previously recorded pass evidence
3. Governance and TLRH docs — secondary comparison only

**Out of scope for this packet:**
- `/supplier/:slug` supplier profile page
- Public inquiry submission
- Notification loop / SMTP
- Legal pages, marketing website
- Demo/reference labeling
- Collections, D2C surfaces
- FAM-06, data seeding, HD-002 recheck
- Any implementation work

---

## §2 Methodology

Repo truth first. Each surface was inspected by reading:

1. `App.tsx` — URL pattern matching and state-to-component mapping
2. Component source files — what data is fetched, how empty state is handled
3. Service files — what API endpoints are called
4. Backend route files (`server/src/routes/public.ts`) — what endpoints exist, what projection service they call
5. Projection service files — what safety gates apply, what projection shape is returned
6. Test files — what unit tests exist and what they cover

Governance documents were consulted only after repo inspection, to identify drift.

---

## §3 Git / Worktree Truth

| Field | Value |
|---|---|
| HEAD commit | `83c503a36d9078c000082ba0d4de1be6de812cf8` |
| Worktree status | **CLEAN** — `git status --short` returned no output at session start |
| Working tree changes | None |
| Staged changes | None |

---

## §4 Route / Component / Data-Source Table

### 4.1 `/products` → `PUBLIC_B2C_BROWSE`

| Field | Value |
|---|---|
| URL pattern | `pathname === '/products'` or `pathname === '/products/'` |
| App.tsx line | 2063 |
| App state | `PUBLIC_B2C_BROWSE` |
| Component | `B2CBrowsePage` (`components/Public/B2CBrowse.tsx`) |
| Service call | `getPublicB2CProducts(params?)` (`services/publicB2CService.ts`) |
| Backend endpoint | `GET /api/public/b2c/products` (query params: `geo`, `page`, `limit`) |
| Projection service | `publicB2CProjection.service.ts` → `listPublicB2CProducts()` |
| Data surface type | **B2C public storefront browse** — NOT B2B aggregator |
| Auth required | None |
| Safe empty state | YES — returns `{ items: [], total: 0, page: 1, limit: 20 }` — NOT 404 |
| Component empty handling | YES — renders no product cards; graceful UI |
| Filter / search | Search text, category chip filter (4 chips: Garments, Home Textiles, Technical Textiles, Fabrics) |

**Projection safety gates (all five must pass — any fail = tenant silently excluded):**
- Gate A: `tenant.publicEligibilityPosture === 'PUBLICATION_ELIGIBLE'`
- Gate B: `org.publication_posture IN ('B2C_PUBLIC', 'BOTH')`
- Gate C: `org.org_type === 'B2C'`
- Gate D: `org.status IN ('ACTIVE', 'VERIFICATION_APPROVED')`
- Gate E: prohibited fields excluded (org UUIDs, risk_score, plan, registration_no, etc.)

**Response shape:** `{ items: PublicB2CStorefrontEntry[], total, page, limit }` where each `PublicB2CStorefrontEntry` contains: `slug`, `legalName`, `orgType`, `jurisdiction`, `productsPreview[]` (max 5), `publicationPosture`, `eligibilityPosture`. The `B2CBrowsePage` flattens storefronts to a flat product grid.

**Error state text:** "We could not load public product previews right now."

---

### 4.2 `/product/:slug` → `PUBLIC_PRODUCT_DETAIL`

| Field | Value |
|---|---|
| URL pattern | `/^\/product\/([a-z0-9-]+)$/` regex match |
| App.tsx line | 2056 |
| App state | `PUBLIC_PRODUCT_DETAIL` |
| Component | `PublicProductDetail` (`components/Public/PublicProductDetail.tsx`) |
| Service call | `getPublicB2CProductBySlug(slug)` (`services/publicB2CService.ts`) |
| Backend endpoint | `GET /api/public/b2c/products/:slug` (slug validated: `/^[a-z0-9-]+(?:--[a-z0-9-]+)?$/`) |
| Projection service | `publicB2CProjection.service.ts` → `getPublicB2CProductBySlug()` |
| Data surface type | **B2C product detail** — NOT B2B aggregator |
| Auth required | None |
| 404 handling | Graceful empty state — "Back to Product Browse" and "Sign in to Continue" |
| Supplier cross-link | YES — `publicSupplierSlug` field enables `onViewSupplierProfile(slug)` → `location.assign('/supplier/${slug}')` |
| SEO signal | YES — emits `onProductMetaReady` (name, category, material, fabricType, summary, description, publicSupplierName) for App-level meta tags |
| Related products | YES — `relatedProducts[]` with `/product/:slug` href links rendered as `RelatedProductCard` |

**Response shape (`PublicB2CProductDetail`):** `slug`, `name`, `category`, `material`, `fabricType`, `summary`, `description`, `imageUrls[]`, `publicSupplierName`, `publicSupplierSlug`, `publicPriceLabel`, `publicMoqLabel`, `trustSignals[]`, `hasTraceabilityEvidence`, `hasPassport`, `publicPassportId?`, `publicStatusLabel`, `tags[]`, `relatedProducts[]`

---

### 4.3 `/aggregator` → `PUBLIC_AGGREGATOR`

| Field | Value |
|---|---|
| URL pattern | `pathname === '/aggregator'` |
| App.tsx line | 2041 |
| App state | `PUBLIC_AGGREGATOR` |
| Component | `PublicAggregatorPreview` (`components/Public/PublicAggregatorPreview.tsx`) |
| Data fetch | **NONE** — no `useEffect`, no API call, no loading state, no data state |
| Data surface type | **Static marketing / entry stub** — NOT a directory discovery surface |
| Auth required | None |
| Content | Static marketing copy about the TexQtic Aggregator; CTA buttons to B2B discovery, product browse, trust landing, sign-in, request access |
| Portal role | Entry point navigating to other surfaces |
| Footer | "Public preview only. Deeper intelligence is available to authenticated TexQtic participants." |
| `onExploreB2B` | Navigates to `PUBLIC_B2B_DISCOVERY` state — sets URL to `/` (no dedicated URL for B2B discovery) |

**Classification for directory purposes:** `/aggregator` is NOT a directory discovery surface. It renders a static landing page with no data fetch. It cannot be classified as part of the aggregator directory data surface.

**Relationship to `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS`:** The closed PRODUCTION_VERIFIED unit of that name addressed the **tenant-side** `AggregatorDiscoveryWorkspace` component (authenticated, `tenantGet()`), not the public `/aggregator` page. The public `/aggregator` stub is a separate, independent surface.

---

### 4.4 B2B Discovery Surface — No URL (noted for context only; out of RT2-A scope)

Not in scope for this packet (no dedicated URL), but documented because governance docs use "aggregator directory" to mean this surface:

| Field | Value |
|---|---|
| URL pattern | **NONE** — accessible only via `setAppState('PUBLIC_B2B_DISCOVERY')` nav action |
| Triggered from | `onGoB2B` nav callback in `App.tsx`; `onExploreB2B` in `PublicAggregatorPreview` (sets URL to `/`, not `/b2b`) |
| App state | `PUBLIC_B2B_DISCOVERY` |
| Component | `B2BDiscoveryPage` (`components/Public/B2BDiscovery.tsx`) |
| Service call | `getPublicB2BSuppliers(params?)` (`services/publicB2BService.ts`) |
| Backend endpoint | `GET /api/public/b2b/suppliers` |
| Projection service | `publicB2BProjection.service.ts` → `listPublicB2BSuppliers()` |
| Data surface type | **B2B supplier aggregator directory** (org_type = 'B2B') |
| Safe empty state | YES — returns `{ items: [], total: 0, page: 1, limit: 20 }` — NOT 404 |
| Direct URL | **NONE** — no path in router; no deep-link or bookmark possible |

---

## §5 Test / Evidence Table

| Surface | Test File | Test Count | Coverage Summary |
|---|---|---|---|
| `/products` B2C browse projection | `server/src/__tests__/public-b2c-projection.unit.test.ts` | 10 unit tests (backend) | Five projection gates (A–E); empty result shape `{ items: [], total: 0 }`; prohibited fields absent; BOTH posture inclusion; products preview capped at 5 |
| `/product/:slug` B2C product detail | `server/src/__tests__/public-b2c-projection.unit.test.ts` | Included in 10 tests | Correct detail shape returned for valid slug; prohibited fields absent; related products included |
| `/aggregator` static stub | None found | 0 | No test for `PublicAggregatorPreview` component |
| B2B suppliers `GET /b2b/suppliers` (no URL) | `server/src/__tests__/public-b2b-projection.unit.test.ts` | Present (out of RT2-A scope) | B2B supplier projection gates |

**No frontend component tests exist for any of the three RT2-A surfaces:**
- `B2CBrowsePage` — no frontend component test
- `PublicProductDetail` — no frontend component test
- `PublicAggregatorPreview` — no frontend component test

**Previously recorded pass evidence:**
- FAM-01 (B2C Public Browse and Product Detail): `VERIFIED_COMPLETE` — multiple slices confirmed in `governance/units/TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md`
- `public-b2c-projection.unit.test.ts`: unit test pass confirmed per B2C tracker slice closures
- `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md`: FAM-01 = `VERIFIED_COMPLETE` / `PRODUCTION_CONFIRMED`

---

## §6 Surface Classification Table

| Surface | URL | Classification | Rationale |
|---|---|---|---|
| B2C public browse | `/products` | **IMPLEMENTED_DATA_EMPTY** | Full stack implemented, unit tested (10 backend tests), FAM-01 VERIFIED_COMPLETE; currently data-empty after QA fixture quarantine (HD-002 VERIFIED_FAIL); safe empty state (200 + `items: []`) |
| B2C product detail | `/product/:slug` | **IMPLEMENTED_DATA_EMPTY** | Full stack implemented, unit tested, FAM-01 VERIFIED_COMPLETE; graceful 404 when slug not found; data-empty because no real B2C-public-eligible products in production |
| Aggregator landing | `/aggregator` | **NOT_IMPLEMENTED** (as directory surface) | Static marketing stub only; no data fetch; no API call; cannot display directory data; classified as entry portal, not a discovery surface |

---

## §7 Data-Empty vs Implementation-Gap Findings

### Finding 1 — `/products` and `/product/:slug`: Implementation complete; data absent

The implementation is complete end-to-end. The gap is exclusively data.

**Evidence:**
- Backend `GET /api/public/b2c/products` and `GET /api/public/b2c/products/:slug` are implemented and registered in `server/src/routes/public.ts` (lines 644 and 659)
- `publicB2CProjection.service.ts` applies five safety gates correctly; returns safe `{ items: [], total: 0, page: 1, limit: 20 }` when no eligible data
- `B2CBrowsePage` handles empty storefronts gracefully — UI renders, no product cards shown, no error state
- `PublicProductDetail` handles 404 gracefully — empty state with navigation CTAs
- Unit tests (`public-b2c-projection.unit.test.ts`) cover all five projection gates and edge cases
- FAM-01 is `VERIFIED_COMPLETE` across all tracked slice units

**Current data state:**
`GET /api/public/b2c/products` returns `{ items: [], total: 0, page: 1, limit: 20 }` because no supplier with `org_type = 'B2C'`, `publication_posture IN ('B2C_PUBLIC', 'BOTH')`, `status IN ('ACTIVE', 'VERIFICATION_APPROVED')`, and `tenant.publicEligibilityPosture = 'PUBLICATION_ELIGIBLE'` currently exists in production. This was confirmed by HD-002 VERIFIED_FAIL.

**Empty state safety:**
- Browse page renders a graceful empty browse grid — no broken state, no error thrown
- Product detail returns a graceful 404 page with "Back to Product Browse" — no broken state

**Implementation gap:** NONE.
**Data gap:** Real B2C-public-eligible supplier data must be provisioned and posture-assigned before products appear.

---

### Finding 2 — `/aggregator`: Static stub; not a directory surface

`PublicAggregatorPreview` is a static marketing landing page. It has no data fetch, no loading state, no API call. It renders the same static markup regardless of data state. It serves as an entry portal with navigation CTAs to other surfaces.

This is not an implementation gap for the aggregator directory itself — the directory data surfaces exist separately (B2C browse, B2B discovery). However, `/aggregator` as a standalone page provides no discovery value beyond navigation to those surfaces.

**Relationship to closed `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` unit:**
That closed unit addressed the tenant-side `AggregatorDiscoveryWorkspace` (authenticated, `tenantGet()` calls). The public `/aggregator` stub is a separate surface, added independently, and was not covered by that closure.

---

### Finding 3 — Naming separation: B2B directory vs B2C browse are distinct surfaces

Governance docs frequently use "aggregator directory" to refer to `/products` and `/product/:slug`. However, the code makes a sharp separation:

| Surface | URL | Gate C (`org_type`) | Projection service |
|---|---|---|---|
| B2C public browse | `/products` | `'B2C'` | `publicB2CProjection.service.ts` |
| B2C product detail | `/product/:slug` | `'B2C'` | `publicB2CProjection.service.ts` |
| B2B supplier discovery | No URL (nav-only) | `'B2B'` | `publicB2BProjection.service.ts` |

These are separate data sets with separate projection gates. A B2B supplier does NOT appear in `/products` browse. A B2C storefront does NOT appear in B2B discovery. The B2B aggregator discovery page (`B2BDiscoveryPage`) has no dedicated URL.

This is a labeling inconsistency in governance docs, not a code error. Docs should distinguish "B2C public product browse" from "B2B supplier aggregator directory" when making seeding or readiness decisions.

---

## §8 Governance / TLRH Drift Table (limited to RT2-A scope)

| Document | Claim | Repo Truth | Drift Type |
|---|---|---|---|
| `SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md` §5 line 85 | Labels `/products` and `/product/:slug` as "B2B / aggregator directory" | These URLs serve B2C public storefronts (Gate C: `org_type === 'B2C'`). The B2B aggregator discovery surface (`B2BDiscoveryPage`) has no dedicated URL. | **Naming inconsistency.** "Aggregator directory" is used loosely in docs to mean the entire public-facing product discovery platform, but code separates B2C and B2B into distinct surfaces with different projection gates. Not a code error; doc terminology is imprecise. |
| `SOFT-LAUNCH-PRIORITY-RESET-REQUIREMENTS-INTAKE-REVIEW-001.md` §7 | Labels "B2B products browse (`/products`)" as PRODUCTION_VERIFIED | `/products` is B2C browse (not B2B products). The B2B supplier discovery has no URL. | **Same naming inconsistency as above.** PRODUCTION_VERIFIED status for implementation is accurate; the B2C/B2B label mismatch is the drift. |
| `SOFT-LAUNCH-PRIORITY-RESET-REQUIREMENTS-INTAKE-REVIEW-001.md` §7 | "Aggregator discovery workspace (`/aggregator`) — PRODUCTION_VERIFIED (bounded); `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` CLOSED" | `/aggregator` renders `PublicAggregatorPreview` — a static marketing stub with no data fetch. The closed `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` unit addressed the tenant-side authenticated workspace (`AggregatorDiscoveryWorkspace`), not this public page. | **Stale / incorrect attribution.** The public `/aggregator` page is a static stub that was not covered by the AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS closure. Classifying it as PRODUCTION_VERIFIED based on a tenant-side unit closure is incorrect. |
| `SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md` §Q4 | Lists "/products browse with real textile supplier product data" as part of "MVP-ready B2B/aggregator directory" | `/products` is B2C browse (B2C_PUBLIC storefronts, `org_type = 'B2C'`). Intent is correct (public product discovery). | **Naming inconsistency — intent correct, label imprecise.** B2C_PUBLIC data is the public-facing product discovery surface. The B2B/B2C conflation is the only drift. |
| `TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md` | Multiple slices `VERIFIED_COMPLETE` for B2C browse and product detail | FAM-01 VERIFIED_COMPLETE. Route, component, service, projection, and backend endpoint confirmed as implemented in repo source at basis commit. | **No drift.** FAM-01 status is accurate to repo truth. |
| `LAUNCH-FAMILY-INDEX.md` | FAM-01: `VERIFIED_COMPLETE` / `PRODUCTION_CONFIRMED` | Confirmed — `/products` and `/product/:slug` are B2C surfaces and FAM-01 title is accurate. | **No drift.** |
| `SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md` line 85 | "real supplier data seeding required (BS-001)" | Confirmed — DB empty after QA quarantine; safe empty state renders. | **Confirmed accurate.** |

---

## §9 Recommended Next Packet

**Recommended unit:** `SOFT-LAUNCH-REPO-TRUTH-RT2-B-SUPPLIER-PROFILE-INQUIRY-AGGREGATOR-SYNTHESIS`

**Scope:**
- `/supplier/:slug` (`PublicSupplierProfile`): implementation depth, projection gates, test coverage, readiness classification
- `B2BDiscoveryPage` (`PUBLIC_B2B_DISCOVERY`, no URL): B2B aggregator surface implementation depth and URL-gap assessment
- Inquiry form pre-auth path (INQUIRY-004): readiness at the public surface
- Aggregator readiness synthesis: combined assessment of all public-facing discovery surfaces (RT2-A + RT2-B findings)

**Rationale:** RT2-A established that `/products` and `/product/:slug` (B2C surfaces) are fully implemented and data-empty, and that `/aggregator` is a static stub. The remaining open questions for aggregator soft-launch readiness are: (a) whether the B2B supplier discovery surface is similarly complete and data-empty; (b) whether `/supplier/:slug` is fully production-ready; (c) whether the B2B discovery no-URL finding constitutes a readiness gap requiring a dedicated route; and (d) what constitutes a minimum viable data set for the aggregator directory to provide non-trivial discovery value at soft launch.

---

## §10 No-Authorization Statement

This audit unit:
- **Did NOT** modify any source file
- **Did NOT** modify any test file
- **Did NOT** modify any schema, migration, or RLS policy
- **Did NOT** modify any `.env` or configuration file
- **Did NOT** mutate any production data
- **Did NOT** seed any suppliers or products
- **Did NOT** run any SQL
- **Did NOT** run any data-mutating scripts
- **Did NOT** run HD-002 recheck
- **Did NOT** run broad test suites
- **Did NOT** update any TLRH or governance doc other than creating this artifact
- **Created exactly one file:** `governance/units/SOFT-LAUNCH-REPO-TRUTH-RT2-A-AGGREGATOR-DIRECTORY-ROUTE-DATA-AUDIT.md`

This artifact is informational only. No implementation work has been authorized or performed.
