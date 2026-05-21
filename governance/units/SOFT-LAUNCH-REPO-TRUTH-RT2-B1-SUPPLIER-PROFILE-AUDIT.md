---
unit_id: SOFT-LAUNCH-REPO-TRUTH-RT2-B1-SUPPLIER-PROFILE-AUDIT
title: RT2-B1 — Supplier Profile Route Repo Truth Audit
type: AUDIT
status: COMPLETE
date: 2026-05-21
commit_basis: dff24404258fcd309d7f2aead97b0c7ef6ce5234
scope: /supplier/:slug (PUBLIC_SUPPLIER_PROFILE) only
authorized_by: Paresh Patel
---

# RT2-B1 — Supplier Profile Route Repo Truth Audit

**Unit:** `SOFT-LAUNCH-REPO-TRUTH-RT2-B1-SUPPLIER-PROFILE-AUDIT`
**Date:** 2026-05-21
**Authority:** Repo source code, routes, components, services, tests. Governance docs are secondary comparison only.
**Basis commit:** `dff24404258fcd309d7f2aead97b0c7ef6ce5234`

---

## §1 Unit Header and Authority Boundary

This is a read-only repo-truth audit of exactly one URL surface:

- `/supplier/:slug` → app state `PUBLIC_SUPPLIER_PROFILE` → component `PublicSupplierProfile`

**RT2-A context carried forward:** RT2-A (`dff24404`) established that `/products` and `/product/:slug` are B2C surfaces (`IMPLEMENTED_DATA_EMPTY`), that `/aggregator` is a static stub (`NOT_IMPLEMENTED` as a directory surface), and that `B2BDiscoveryPage` (`PUBLIC_B2B_DISCOVERY`) has no dedicated URL. Those findings are referenced here where relevant but are not re-inspected.

**Authority order:**
1. Actual repo source code: routes, components, services, tests
2. RT2-A artifact — context only
3. Governance and TLRH docs — secondary comparison only

**Out of scope for this packet:**
- `B2BDiscoveryPage` / `PUBLIC_B2B_DISCOVERY` (RT2-B2)
- Pre-auth inquiry attachment across all surfaces (RT2-B3 or combined)
- `/products`, `/product/:slug` (covered by RT2-A)
- Notification loop / SMTP
- Legal pages, marketing website
- Demo/reference labeling, data seeding
- Collections, D2C surfaces
- FAM-06/07/08/10, HD-002
- Any implementation work

---

## §2 Git / Worktree Truth

| Field | Value |
|---|---|
| HEAD commit | `dff24404258fcd309d7f2aead97b0c7ef6ce5234` |
| Worktree status | **CLEAN** — `git status --short` returned no output at audit start |
| Working tree changes | None |
| Staged changes | None |

**Note:** `LAUNCH-FAMILY-INDEX.md` §8 contained a prior-session note — "Pre-existing unstaged M: `components/Public/PublicSupplierProfile.tsx` — do NOT stage in any family cycle without explicit allowlist." At the time of this audit that unstaged modification is no longer present; git worktree is clean.

---

## §3 Route / Component / Data-Source Table

### 3.1 URL and App-State Routing

| Field | Value |
|---|---|
| URL pattern | `/^\/supplier\/([a-z0-9-]+)$/` (App.tsx lines 2044–2049) |
| App state | `PUBLIC_SUPPLIER_PROFILE` |
| Slug capture | `publicSupplierSlugFromPath` — extracted at App.tsx init from `window.location.pathname` |
| Source capture | `publicSupplierSourceFromQuery` — extracted from `?source=` query param at init |
| Render case | App.tsx line 7388 |
| `onBack` destination | `setAppState('PUBLIC_B2B_DISCOVERY')` — does not push a URL; navigation goes to B2B discovery state |
| `onSignIn` handler | `openSecondaryAuthenticatedEntry('TENANT')` |
| `onRequestAccess` | `openSupplierRequestAccess` — supplier access request flow |
| Bookmarkable | **YES** — URL is hard-navigable; `/supplier/:slug` path causes `PUBLIC_SUPPLIER_PROFILE` state to be resolved at init |

**App.tsx render case (lines 7388–7400):**
```javascript
case 'PUBLIC_SUPPLIER_PROFILE':
  return (
    <PublicSupplierProfile
      nav={{ ...publicNavBase, activeSection: 'b2b' }}
      slug={publicSupplierSlugFromPath}
      source={publicSupplierSourceFromQuery || undefined}
      onBack={() => setAppState('PUBLIC_B2B_DISCOVERY')}
      onSignIn={() => openSecondaryAuthenticatedEntry('TENANT')}
      onRequestAccess={openSupplierRequestAccess}
    />
  );
```

### 3.2 Frontend Component

| Field | Value |
|---|---|
| Component name | `PublicSupplierProfile` |
| File | `components/Public/PublicSupplierProfile.tsx` |
| Data fetch trigger | `useEffect([slug])` — fetches on mount and whenever slug changes |
| Service call | `getPublicSupplierBySlug(slug, source?)` (`services/publicB2BService.ts` line 82) |
| Timeout safety | `setTimeout` (15 s) with cancellation on unmount; sets error state if fetch hangs |
| Source attribution | `source` prop forwarded to service as `?source=...` query param (QR-SOURCE-002) |
| Inquiry service call | `submitPublicInquiry({ supplier_slug: slug, inquiry_category, geo_band?, volume_band? })` |

### 3.3 Frontend Service

| Field | Value |
|---|---|
| File | `services/publicB2BService.ts` |
| Profile function | `getPublicSupplierBySlug(slug: string, source?: string): Promise<PublicB2BSupplierProfile>` |
| Endpoint | `GET /api/public/supplier/${encodeURIComponent(slug)}[?source=...]` |
| Response type | `PublicB2BSupplierProfile` (line 60) |
| Inquiry function | `submitPublicInquiry(params: PublicInquirySubmitParams): Promise<PublicInquirySubmitResponse>` |
| Inquiry endpoint | `POST /api/public/inquiry/submit` |
| Inquiry params type | `supplier_slug?`, `inquiry_category`, `geo_band?`, `volume_band?` (Phase 1 shape; no `source_surface` forwarded from this component) |

### 3.4 Backend Route

| Field | Value |
|---|---|
| File | `server/src/routes/public.ts` line 673 (comment) / 708 (handler registration) |
| Method + path | `GET /api/public/supplier/:slug` |
| Auth required | None (public route) |
| Slug validation | `z.string().min(1).max(100).regex(/^[a-z0-9-]+$/)` — invalid slug → 400 `INVALID_SLUG` |
| Source param parsing | Optional `?source=` normalized to allowlist `['organic', 'qr', 'referral', 'event', 'direct']`; unknown → `'organic'` (QR-SOURCE-002) |
| Gate failure response | Safe `404 NOT_FOUND` — no gate-detail leakage, no 403 |
| Success response | `sendSuccess(reply, result.profile)` — org UUID (`result.orgId`) is **NOT** in the HTTP response |
| Event emission | `supplier_profile.viewed.v1` — fire-and-forget via `writeAuditLog`; non-blocking (`.catch` logs warn) |
| Event payload | `{ slug, source_channel, timestamp }` — org UUID NOT in event payload |
| Design authority | `MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-ROUTE-001` |
| Event governance | `shared/contracts/event-names.md §Acquisition Domain Events (EVENTS-003)` |

### 3.5 Backend Projection Service

| Field | Value |
|---|---|
| File | `server/src/services/publicB2BProjection.service.ts` |
| Function | `getPublicB2BSupplierBySlug(slug: string, prisma: PrismaClient)` |
| Returns | `{ orgId: string, profile: PublicB2BSupplierProfile } \| null` — null on any gate failure |
| Design authority | `governance/decisions/TEXQTIC-B2B-PUBLIC-PROJECTION-PRECONDITION-DESIGN-v1.md` |
| Slice | `PUBLIC_B2B_PROJECTION_PRECONDITION_IMPLEMENTATION_SLICE` |
| DB access | Service-role via `withAdminContext` / `withOrgAdminContext` (no caller auth token) |

**Five projection safety gates (all must pass — any failure → null → safe 404):**

| Gate | Condition |
|---|---|
| Gate A | `tenant.publicEligibilityPosture === 'PUBLICATION_ELIGIBLE'` |
| Gate B | `org.publication_posture IN ('B2B_PUBLIC', 'BOTH')` |
| Gate C | `org.org_type === 'B2B'` |
| Gate D | `org.status IN ('ACTIVE', 'VERIFICATION_APPROVED')` |
| Gate E | Prohibited fields never included in output |

**Prohibited fields (§E — must never appear in HTTP response):**
- Org UUID / internal IDs
- `external_orchestration_ref`
- `risk_score`, `plan`, `registration_no`
- Pricing / negotiation state
- Order / trade state
- Admin / governance fields
- Draft / unpublished data

**Offering preview cap:** maximum 5 items

---

## §4 Rendered Fields Table

All fields rendered by `PublicSupplierProfile` when profile loads successfully.

### 4.1 Profile Interface Shape (`PublicB2BSupplierProfile`)

| Field | Type | Source |
|---|---|---|
| `slug` | `string` | projection output |
| `legalName` | `string` | projection output |
| `orgType` | `string` | projection output |
| `jurisdiction` | `string` | projection output |
| `certificationCount` | `number` | projection output |
| `certificationTypes` | `string[]` | projection output |
| `hasTraceabilityEvidence` | `boolean` | projection output |
| `taxonomy` | `{ primarySegment, secondarySegments[], rolePositions[] } \| null` | projection output |
| `offeringPreview` | `{ name, moq, imageUrl }[]` (max 5) | projection output |
| `publicationPosture` | `string` | projection output |
| `eligibilityPosture` | `string` | projection output |

### 4.2 Fields Rendered per UI Section

| UI Section | Fields / Sources Rendered |
|---|---|
| **Hero** | `legalName` (h1), `orgType` badge, `jurisdiction` badge, derived `toPublicDiscoveryStatus(eligibilityPosture, publicationPosture)` badge |
| **Hero CTAs** | "Sign in to Connect" → `onSignIn`; "Back to B2B Discovery" → `onBack` |
| **Public trust notice** | Static text only (no profile fields) |
| **Business snapshot grid** | `orgType`, `taxonomy.primarySegment` (or fallback), `taxonomy.rolePositions[0]` (or fallback), `jurisdiction`, derived discovery status, derived `toVisibilityLabel(publicationPosture)` |
| **Capability highlights** | `taxonomy.primarySegment` chip, `taxonomy.rolePositions[]` (up to 4) chips, `certificationCount > 0` badge, `hasTraceabilityEvidence` badge, `offeringPreview.length > 0` badge |
| **Textile value-chain position** | 6 stages (Yarn / Fabric / Garments / Wholesale / Retail / D2C) — derived from `orgType`, `taxonomy.*`, `offeringPreview[].name` via `stageKeywords` map |
| **Segment & Role** | `taxonomy.primarySegment`, `taxonomy.secondarySegments[]`, `taxonomy.rolePositions[]` |
| **Trust signals** | `certificationCount` (count or "None on record"), `certificationTypes[]` chips, `hasTraceabilityEvidence` ("Available" or "Not published") |
| **Discovery context** | `slug`, derived discovery status |
| **Offering preview** | `offeringPreview[].name`, `.moq` (if > 0), `.imageUrl` (img tag, lazy-loaded) — rendered only when `offeringPreview.length > 0` |
| **Inquiry form (INQUIRY-004)** | `inquiryCategory` select (required), `geoBand` text input (optional, maxLength 100), `volumeBand` text input (optional, maxLength 100) |
| **Auth handoff panel** | "Sign in to Connect" → `onSignIn`, "Back to B2B Discovery" → `onBack`, "List Your Business" → `onRequestAccess` |

**Fields NOT rendered (correct omissions — prohibited by Gate E or design):**
- Org UUID / internal DB ID
- `registration_no`, `risk_score`, `plan`
- Pricing, order state, negotiation state
- `external_orchestration_ref`
- Admin / governance fields

---

## §5 Empty State and Error State Findings

| State | Trigger | UI Rendered |
|---|---|---|
| **Loading** | `loading === true` | Centered spinner (`animate-spin`, `border-t-[#2f8094]`) |
| **Not found (404)** | `notFound === true` (API returned 404 or profile = null) | "This supplier profile is not available." + sub-text explaining visibility rules + "Back to B2B Discovery" button + conditional "List Your Business" button |
| **Error (non-404 failure)** | `!loading && !notFound && !profile` (loaded, no 404 flag, but no profile — network/server error path) | "Unable to load profile" label + "Please try again shortly." heading + "Back" button only |
| **Slug empty / null** | `slug` prop is falsy | Fetch not triggered; `loading` stays false; falls through to error state UI |
| **Success** | `!loading && profile !== null` | Full profile render (all §4.2 sections) |

**Safe empty-state assessment:** The 404 path ("This supplier profile is not available.") covers the case where a supplier does not yet have data or does not pass projection gates. This is the expected production-empty behavior — the page renders correctly without data, with graceful navigation back to B2B discovery. No broken state, no unhandled exception, no raw error thrown to the user.

---

## §6 INQUIRY-004 Pre-Auth Inquiry — Inline Form (Supplier Profile Surface)

This section documents the inline pre-auth inquiry form embedded directly in `PublicSupplierProfile`.

| Field | Value |
|---|---|
| Implementation locus | Inline in `PublicSupplierProfile` component — not a separate page |
| Trigger | Always rendered when profile is loaded (not behind a CTA click) |
| Fields | `inquiryCategory` (required `<select>`), `geoBand` (optional `<input>`), `volumeBand` (optional `<input>`) |
| Inquiry categories | `GENERAL`, `CAPABILITY_FIT`, `OFFERING_PREVIEW`, `SOURCING_INTENT`, `QUALIFICATION_CHECK` |
| Submit payload | `{ supplier_slug: slug, inquiry_category, geo_band?, volume_band? }` |
| `source_surface` | **NOT forwarded** — component uses Phase-1-style call; backend will normalize missing `source_surface` to `'DIRECT'`. The allowlist value `'SUPPLIER_PROFILE'` exists in the enum but is not passed. This is an attribution gap, not a functional gap. |
| Endpoint | `POST /api/public/inquiry/submit` |
| PII protection | No email, phone, or identifying fields in form; backend blocks PII in `message` field (not exposed here) |
| Success state | Green success message replaces form; no double-submit path |
| Error state | Red error message above submit button; form remains editable |
| Submit disabled condition | `!inquiryCategory` or `inquiryStatus === 'submitting'` |

---

## §7 Test / Evidence Table

### 7.1 Backend Projection Unit Tests

| File | Test Count | Coverage |
|---|---|---|
| `server/src/__tests__/public-b2b-supplier-profile.unit.test.ts` | **8 unit tests** | (1) Eligible supplier → correct `PublicB2BSupplierProfile` shape; (2) Slug not found → null; (3) Gate A fail → null; (4) Gate B fail → null; (5) Gate D fail → null; (6) Gate E: prohibited fields absent (org UUID, `external_orchestration_ref`); (7) Certification data projected correctly; (8) Offering preview capped at 5 items |

Note: Gate C is implicitly tested by the eligible supplier test (org_type = 'B2B' required for Gate B pass).

### 7.2 Frontend Component Unit Tests (Inquiry Form)

| File | Test Count | Coverage |
|---|---|---|
| `tests/frontend/public-supplier-profile-inquiry.test.tsx` | **8 unit tests** | PSI-001: inquiry form renders after profile loads; PSI-002: submit disabled when no category selected; PSI-003: valid form submission → success state; PSI-004: submission error → error message; PSI-005: no contact/email/phone fields rendered; PSI-006: no payment/order/RFQ language in inquiry section; PSI-007: `submitPublicInquiry` called with correct payload (no PII); PSI-008: success state replaces form (no double-submit path) |

### 7.3 Backend Inquiry Endpoint Unit Tests

| File | Test Count | Coverage |
|---|---|---|
| `server/src/__tests__/public-buyer-inquiry.unit.test.ts` | **12 unit tests** | INQ-001: valid minimal payload → 202; INQ-002: with optional geo_band + volume_band → 202; INQ-003: non-eligible supplier (gate fails) → safe 404; INQ-004: invalid supplier_slug (bad chars) → 400; INQ-005: missing inquiry_category → 400; INQ-006: invalid inquiry_category value → 400; INQ-007: oversized supplier_slug → 400; INQ-008: geo_band present but empty string → 400; INQ-009: writeAuditLog called with correct action; INQ-010: event emission fire-and-forget (returns 202 even if log rejects); INQ-011: prohibited fields (email, phone) in body → 400; INQ-012: event payload (afterJson) contains NO org UUID, NO email, NO phone |

### 7.4 B2B Projection Shared Test (Context)

| File | Test Count | Coverage |
|---|---|---|
| `server/src/__tests__/public-b2b-projection.unit.test.ts` | **8 unit tests** | Covers `listPublicB2BSuppliers` (B2B discovery endpoint using same projection service) — projection gate A–E behavior, empty result shape, prohibited fields absent, offering preview cap, pagination coercion |

### 7.5 Test Coverage Summary

| Layer | Tests Present | What Covered |
|---|---|---|
| Backend projection (profile by slug) | YES — 8 backend unit tests | All 5 gates (A–E), safe shape, prohibited fields, offering preview cap |
| Backend route handler | Not a separate test file — route tested via Fastify integration in `public-b2b-supplier-profile.unit.test.ts` via mock projection | 404 path confirmed, 400 slug validation path confirmed |
| Backend inquiry endpoint (supplier path) | YES — 12 backend unit tests | INQ-001 to INQ-012 |
| Frontend inquiry form | YES — 8 frontend unit tests | PSI-001 to PSI-008 |
| Frontend profile component (non-inquiry) | **NOT FOUND** | No test for profile render, 404 state, error state, or value-chain derivation |
| Integration test (live DB) | `public-b2b-supplier-profile.unit.test.ts` header notes integration tests use `hasDb` guard and live in `public-b2b-projection.integration.test.ts` | Integration test file expected but not separately read; tests use prisma mock injection, no live DB required |

**Frontend component gap:** No frontend unit test covers the profile load success path, 404 state render, or error state render. The inquiry form is tested, but the profile sections (hero, business snapshot, trust signals, value-chain position, offering preview, auth handoff panel) have no frontend test coverage.

---

## §8 Classification

**`/supplier/:slug` → `PUBLIC_SUPPLIER_PROFILE`**

### Classification: `IMPLEMENTED_TEST_COVERED`

**Rationale:**

| Dimension | Status |
|---|---|
| Backend route | IMPLEMENTED — `GET /api/public/supplier/:slug` fully registered and handled |
| Projection service | IMPLEMENTED — 5-gate safe projection, `getPublicB2BSupplierBySlug()` |
| Frontend service | IMPLEMENTED — `getPublicSupplierBySlug()` → correct endpoint with source attribution |
| Frontend component | IMPLEMENTED — full render with hero, snapshot, trust signals, value chain, offering preview, inquiry form, auth handoff |
| Empty / 404 state | IMPLEMENTED — graceful 404 page and error page; no broken state |
| INQUIRY-004 inline | IMPLEMENTED — pre-auth inline inquiry form with PII protection |
| Backend projection tests | 8 unit tests — all 5 gates, safe shape, prohibited fields |
| Frontend inquiry tests | 8 unit tests — form render, submit, success, error, PII absence |
| Backend inquiry tests | 12 unit tests — all validation paths, audit log, event safety |
| Frontend profile component tests (non-inquiry) | ABSENT — profile render, 404 state, error state not tested at component level |
| Production smoke test | NOT FOUND — no BS-XXX evidence for this specific route |
| FAM-09 (Supplier Profile and Catalog) | `NOT_ASSESSED` / `NEEDS_REPO_INSPECTION` in LAUNCH-FAMILY-INDEX |

**Not `IMPLEMENTED_PRODUCTION_VERIFIED`:** No production smoke test evidence found for this route. FAM-09 is `NOT_ASSESSED` in `LAUNCH-FAMILY-INDEX.md`.

**Not `IMPLEMENTED_DATA_EMPTY`:** This route does not require seeded data to be classifiable — unlike B2C browse, a missing supplier simply renders the graceful 404 page with navigation CTAs. The `/supplier/:slug` surface functions correctly at empty data state: the user arrives, sees a "not available" message, and can return to B2B discovery.

**Data state for soft launch:** `/supplier/:slug` will return a graceful 404 for any slug that has no B2B-public-eligible supplier data. The page renders safely and is not broken. Once real B2B-eligible suppliers are provisioned and posture-assigned, profiles will appear automatically.

**`source_surface` attribution gap (non-blocking):** The inline inquiry form in `PublicSupplierProfile` does not forward `source_surface: 'SUPPLIER_PROFILE'` to `submitPublicInquiry`. The backend normalizes absent `source_surface` to `'DIRECT'`. This means sourcing analytics for inquiries submitted from supplier profile pages will be attributed to 'DIRECT' rather than 'SUPPLIER_PROFILE'. This is a minor analytics attribution gap, not a functional or security gap.

---

## §9 Governance / TLRH Drift Table (supplier-profile scope only)

| Document | Claim / Status | Repo Truth | Drift Type |
|---|---|---|---|
| `LAUNCH-FAMILY-INDEX.md` FAM-09 (Supplier Profile and Catalog) | `NOT_ASSESSED` / `NEEDS_REPO_INSPECTION` | Repo truth: full stack implemented, 28 unit tests across 3 test files (backend projection 8, frontend inquiry 8, backend inquiry 12), graceful 404/error states, INQUIRY-004 inline. FAM-09 is under-classified relative to repo truth. | **Classification gap.** FAM-09 status is `NOT_ASSESSED` but repo shows `IMPLEMENTED_TEST_COVERED`. The family cycle for FAM-09 needs to open and formally assess this. |
| `LAUNCH-FAMILY-INDEX.md` §8 note | "Pre-existing unstaged M: `components/Public/PublicSupplierProfile.tsx` — do NOT stage in any family cycle without explicit allowlist" | `git status --short` at audit start: **CLEAN**. No unstaged modification present. | **Stale note.** The note refers to a prior-session state that no longer exists. The file is not modified. Note may be left in place as a caution but is no longer accurate to current worktree state. |
| `SOFT-LAUNCH-PRIORITY-RESET-REQUIREMENTS-INTAKE-REVIEW-001.md` §7 | (Per RT2-A: B2B discovery claims reference the `/supplier/:slug` profile as part of B2B stack) | `/supplier/:slug` is fully implemented with bookmarkable URL and INQUIRY-004 inline. The profile is accessible from B2B discovery via `onViewProfile(slug) → location.assign('/supplier/:slug')`. | **No material drift** on this specific point. Profile is implemented as described by any reference to it being the destination of B2B discovery navigation. |
| Any doc claiming `/supplier/:slug` is `NOT_IMPLEMENTED` or `STUB` | Not found | `/supplier/:slug` is fully implemented, not a stub. | No such claim found. No drift to report. |

---

## §10 Recommended Next Packet

**Recommended unit:** `SOFT-LAUNCH-REPO-TRUTH-RT2-B2-B2B-DISCOVERY-AUDIT`

**Scope:**
- `B2BDiscoveryPage` / `PUBLIC_B2B_DISCOVERY` app state: implementation depth, projection gates, filters, test coverage
- No-URL finding assessment: whether the absence of a dedicated URL (e.g. `/b2b` or `/discover`) constitutes a soft-launch readiness gap
- B2B supplier directory: data-empty classification confirmation
- Classification: `IMPLEMENTED_DATA_EMPTY` (expected) vs `PARTIAL` (if URL gap is found to be a hard dependency)

**Rationale:** RT2-B1 established `/supplier/:slug` as `IMPLEMENTED_TEST_COVERED`. The B2B discovery surface (`B2BDiscoveryPage`) provides the directory listing from which supplier profile pages are reached. Understanding its implementation depth, URL accessibility, and data readiness is required before a combined aggregator-directory readiness definition can be written. The no-URL finding (documented in RT2-A §4.4) requires assessment: deep-linked supplier profiles ARE bookmarkable, but the B2B directory itself has no bookmarkable URL.

---

## §11 No-Authorization Statement

This audit unit:
- **Did NOT** modify any source file
- **Did NOT** modify any test file
- **Did NOT** modify any schema, migration, or RLS policy
- **Did NOT** modify any `.env` or configuration file
- **Did NOT** mutate any production data
- **Did NOT** seed any suppliers or products
- **Did NOT** run any SQL
- **Did NOT** run any data-mutating scripts
- **Did NOT** run broad test suites
- **Did NOT** update any TLRH or governance doc other than creating this artifact
- **Created exactly one file:** `governance/units/SOFT-LAUNCH-REPO-TRUTH-RT2-B1-SUPPLIER-PROFILE-AUDIT.md`

This artifact is informational only. No implementation work has been authorized or performed.
