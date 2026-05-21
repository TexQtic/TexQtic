# SOFT-LAUNCH-REPO-TRUTH-RT2-B3-DIRECTORY-INQUIRY-ATTACHMENT-AUDIT

**Unit ID:** RT2-B3  
**Title:** Directory Inquiry Attachment Audit — Public Discovery Surfaces  
**Packet:** RT2 — Soft Launch Repo Truth: Directory & Public Surface Readiness  
**Sequence:** RT2-A → RT2-B1 → RT2-B2 → **RT2-B3** → RT2-B4  
**Author:** Paresh Patel  
**Date:** 2026-07-08  
**Type:** Read-only repo truth audit  
**Status:** COMPLETE

---

## TLRH (Too Long Read Here)

- **Inquiry endpoint:** `POST /api/public/inquiry/submit` — PRODUCTION_VERIFIED (FAM-03). No SMTP delivery in this route; captures audit log only. Supplier notification deferred to FTR-B2C-004 (NOT_STARTED).
- **Inquiry attachment on directory surfaces:** PARTIAL — `/supplier/:slug` has an inline form; `/product/:slug` has a hard-navigation CTA to `/inquiry` with correct context params. `/products`, `/aggregator`, and B2BDiscoveryPage have no inquiry attachment.
- **`source_surface` attribution:** 2 of 4 inquiry submission paths have an attribution gap — both supplier-context paths (`/supplier/:slug` inline form and `PublicInquiryPage` FORM mode) submit without `source_surface`, which the backend normalizes to `'DIRECT'`. This gap is not caught by any existing test. General-context paths correctly resolve and pass `source_surface`.
- **PII safety:** Confirmed across all surfaces — no PII fields in any inquiry form; backend blocks email/phone patterns in message; audit log afterJson verified clean.
- **Next packet (RT2-B4):** Aggregator readiness synthesis — requires no new implementation; write-up only.

---

## 1. Audit Authority and Scope

### 1.1 Purpose

This audit answers the question: **Do public directory and discovery surfaces attach an inquiry CTA or form, and if so, what context do they pass to the backend inquiry endpoint?**

It is a repo-truth exercise only — no code is changed, no schema is modified, no server is started. All findings are drawn from direct file reads and targeted searches.

### 1.2 Surfaces in Scope

| Surface | Route | App State | Component |
|---|---|---|---|
| B2C Product Browse | `/products` | `PUBLIC_B2C_BROWSE` | `B2CBrowse.tsx` |
| B2C Product Detail | `/product/:slug` | `PUBLIC_PRODUCT_DETAIL` | `PublicProductDetail.tsx` |
| B2B Supplier Profile | `/supplier/:slug` | `PUBLIC_B2B_PROFILE` | `PublicSupplierProfile.tsx` |
| Aggregator Preview | `/aggregator` | `PUBLIC_AGGREGATOR` | `PublicAggregatorPreview.tsx` |
| B2B Discovery Directory | n/a (SPA state) | `PUBLIC_B2B_DISCOVERY` | `B2BDiscovery.tsx` |
| Inquiry Page (model only) | `/inquiry` | `PUBLIC_INQUIRY` | `PublicInquiryPage.tsx` |

> **Inquiry page inclusion note:** `/inquiry` is not a discovery surface but is included as a model surface — all inquiry CTAs on other surfaces route here, and its behavior directly affects `source_surface` attribution findings.

### 1.3 Out of Scope

- SMTP / email notification delivery (FTR-B2C-004 scope — `DESIGN_GATED` per governance)
- RLS policy correctness (RT2-B5 scope)
- DPP / collection pages inquiry (separate surface family)
- Any code change

---

## 2. Git Preflight

```
git status --short     → (empty — clean worktree)
git rev-parse HEAD     → 3672be38806aa0e1ecb616b923725c752abe77a6
```

**Worktree:** CLEAN  
**HEAD commit:** `3672be3` — `[TEXQTIC] docs: audit B2B discovery route truth` (RT2-B2)

---

## 3. Prior RT2 Artifacts Reviewed

| Artifact | Commit | Surfaces Audited | Inquiry Claims |
|---|---|---|---|
| RT2-A (Aggregator + B2C Routes) | `dff24404` | `/products`, `/product/:slug`, `/aggregator` | No inquiry attachment on any; `/product/:slug` classified as `IMPLEMENTED_DATA_EMPTY` for discovery features — inquiry CTA present but not the primary audit focus of that packet |
| RT2-B1 (Supplier Profile) | `971743c` | `/supplier/:slug` | Inline inquiry form present (INQUIRY-004); source_surface gap identified (not passed; backend stores `'DIRECT'`); PSI-001–008 test coverage confirmed |
| RT2-B2 (B2B Discovery) | `3672be3` | `B2BDiscoveryPage` | `IMPLEMENTED_DATA_EMPTY`; no inline inquiry form; "Sign in to Connect" and supplier profile navigation only; confirmed B2B URL routing gap separately resolved |

This audit consolidates and extends inquiry-specific findings across all surfaces and adds full model coverage for the `/inquiry` page itself.

---

## 4. Surface-by-Surface Inquiry Attachment Findings

### 4.1 `/products` — `B2CBrowsePage`

**File:** `components/Public/B2CBrowse.tsx`

**Inquiry form:** NONE  
**Inquiry CTA:** NONE  
**CTAs present:**
- "Sign in to Continue" → `onSignIn` callback
- ProductCard "View Details" → `<a href="/product/${product.slug}">` (individual detail)
- Footer "List Your Products" → `https://texqtic.com/request-access` (external)

**Key evidence (grep):**
- Zero matches for `inquiry`, `submitPublicInquiry`, `/inquiry`, or `href="/inquiry"` in `B2CBrowse.tsx`

**Classification:** `NOT_IMPLEMENTED` — no inquiry entry point on this surface  
**Note:** Product cards navigate to `/product/:slug` which does have an inquiry CTA (see §4.2).

---

### 4.2 `/product/:slug` — `PublicProductDetail`

**File:** `components/Public/PublicProductDetail.tsx`

**Inquiry form:** NONE (no inline form)  
**Inquiry CTA:** YES — hard-navigation `<a href>` element

**CTA code (line 327):**
```tsx
<a
  href={`/inquiry?productSlug=${encodeURIComponent(slug)}&sourceSurface=PRODUCT_DETAIL`}
  ...
>
  Send a sourcing inquiry
</a>
```

**Context passed:**
- `productSlug` → URL query param → captured by `App.tsx` as `publicInquiryProductSlugFromQuery` (regex-validated to `[a-z0-9-]+`)
- `sourceSurface=PRODUCT_DETAIL` → URL query param → captured by `App.tsx` as `publicInquirySourceSurfaceFromQuery`

**App.tsx render (line 7404):**
```tsx
case 'PUBLIC_INQUIRY':
  return (
    <PublicInquiryPage
      supplierSlug={publicInquirySupplierSlugFromQuery}   // empty (no supplierSlug in this URL)
      productSlug={publicInquiryProductSlugFromQuery || undefined}
      sourceSurface={publicInquirySourceSurfaceFromQuery || undefined}
      ...
    />
  );
```

**Flow:** Hard navigation → `/inquiry?productSlug=...&sourceSurface=PRODUCT_DETAIL` → `PUBLIC_INQUIRY` state → `PublicInquiryPage` with empty `supplierSlug` → triggers `NO_CONTEXT` mode → `GeneralInquiryForm` → `submitPublicInquiry({ product_slug, source_surface: 'PRODUCT_DETAIL', inquiry_category, ... })`

**source_surface attribution:** CORRECT — `'PRODUCT_DETAIL'` flows end-to-end via URL param  
**Tests:** PII-021 covers `productSlug + sourceSurface=PRODUCT_DETAIL` context handoff — PASS  
**Missing test:** No dedicated test on `PublicProductDetail` for the CTA's link presence or param construction (low-risk: static `<a href>` string, no logic)

**Classification:** `IMPLEMENTED_UNVERIFIED` — CTA present and context is correct; no dedicated component test for the CTA itself

---

### 4.3 `/supplier/:slug` — `PublicSupplierProfile`

**File:** `components/Public/PublicSupplierProfile.tsx`

**Inquiry form:** YES — inline pre-auth form (INQUIRY-004)  
**Form fields:** `inquiry_category` (required), `geo_band` (optional), `volume_band` (optional)  
**Endpoint called:** `submitPublicInquiry` → `POST /api/public/inquiry/submit`

**Submission payload (lines ~41–45):**
```tsx
await submitPublicInquiry({
  supplier_slug: slug,
  inquiry_category: inquiryCategory,
  ...(geoBand.trim() ? { geo_band: geoBand.trim() } : {}),
  ...(volumeBand.trim() ? { volume_band: volumeBand.trim() } : {}),
});
```

**source_surface attribution gap:** `source_surface` is **NOT** included in the payload. Backend normalizes absent/unknown `source_surface` to `'DIRECT'`. All inquiries submitted via the supplier profile inline form are stored with `source_surface: 'DIRECT'`, making them analytically indistinguishable from direct API submissions.

**Buyer response:** Inline success state on the profile page — "Your inquiry has been received." + "Sign in to Connect" auth CTA. Form is replaced (no double-submit path — PSI-008).

**PII fields:** None — no email, phone, name, or contact fields rendered (PSI-005, PSI-009).

**Tests:** PSI-001 through PSI-008 (8 tests, `tests/frontend/public-supplier-profile-inquiry.test.tsx`)
- PSI-007 verifies payload contains `supplier_slug`, `inquiry_category`, `geo_band`, `volume_band` and no PII — but does **NOT** assert `source_surface` is present or absent. The attribution gap is not caught by the test suite.

**Classification:** `IMPLEMENTED_TEST_COVERED` with a known source_surface attribution gap (confirmed from RT2-B1; re-verified here)

---

### 4.4 `/aggregator` — `PublicAggregatorPreview`

**File:** `components/Public/PublicAggregatorPreview.tsx`

**Inquiry form:** NONE  
**Inquiry CTA:** NONE  
**CTAs present:**
- "Sign in to Continue" → `onSignIn` callback
- "Explore B2B Network" → `onExploreB2B` callback → `PUBLIC_B2B_DISCOVERY` state
- "Browse Products" → `onBrowseProducts` callback → B2C browse
- "Learn About Trust & Origin" → `onLearnAboutTrust` callback
- "List Your Business" → `onRequestAccess` callback

**Key evidence (grep):** Zero matches for `inquiry`, `submitPublicInquiry`, or `/inquiry` href in `PublicAggregatorPreview.tsx`. The component references B2B sourcing and qualification concepts in marketing copy but contains no submission path.

**Classification:** `NOT_IMPLEMENTED` — static entry stub; no inquiry path  
**Note:** This aligns with RT2-A classification of `/aggregator` as a preview/preview-only surface.

---

### 4.5 B2B Discovery Directory — `B2BDiscovery`

**File:** `components/Public/B2BDiscovery.tsx`

**Inquiry form:** NONE  
**Inquiry CTA:** NONE  
**CTAs present:**
- "View Public Profile" → `window.location.assign('/supplier/${slug}')` (hard nav to supplier profile, which HAS an inline inquiry form)
- "Sign in to Connect" → auth modal
- "List Your Business" → external
- Navbar "Sign In"

**Key evidence (grep):** Zero matches for `inquiry`, `submitPublicInquiry`, or `/inquiry` in `B2BDiscovery.tsx`. The directory is purely a browse/discovery surface; inquiry is deferred to the individual supplier profile.

**Indirect inquiry path:** `B2BDiscovery → /supplier/:slug → inline form` — discoverable but requires an extra navigation step; no inline attach.

**Classification (RT2-B2):** `IMPLEMENTED_DATA_EMPTY` (for the directory surface as a whole). For inquiry specifically: `NOT_IMPLEMENTED` on the directory surface itself.

---

### 4.6 `/inquiry` — `PublicInquiryPage` (Model Surface)

**File:** `components/Public/PublicInquiryPage.tsx`  
**Route:** `/inquiry` (matched via `resolveInitialAppState()`)  
**App state:** `PUBLIC_INQUIRY`

**Component props:**
```tsx
export interface PublicInquiryPageProps {
  readonly supplierSlug: string;
  readonly nav: PublicNavbarProps;
  readonly onBack: () => void;
  readonly onSignIn: () => void;
  readonly productSlug?: string;
  readonly categorySlug?: string;
  readonly collectionSlug?: string;
  readonly sourceSurface?: string;
}
```

**Two render modes:**

| Mode | Trigger | Subcomponent | source_surface behaviour |
|---|---|---|---|
| `FORM` | `supplierSlug` passes `/^[a-z0-9-]+$/` | `InquiryForm` | **MISSING** — `InquiryForm` props: `{supplierSlug, onSuccess, onError}` only; `sourceSurface` prop is NOT forwarded; backend receives `null` → normalizes to `'DIRECT'` |
| `NO_CONTEXT` | `supplierSlug` empty or invalid | `GeneralInquiryForm` | **CORRECT** — calls `resolveSourceSurface(sourceSurface)` prop; defaults to `'GENERAL_PUBLIC'` if absent/invalid |

**`resolveSourceSurface` validation:** checks against `VALID_SOURCE_SURFACES` set (12 values: `GENERAL_PUBLIC`, `SUPPLIER_PROFILE`, `PRODUCT_DETAIL`, `PRODUCT_BROWSE`, `CATEGORY_STORY`, `COLLECTION_DETAIL`, `COLLECTION_LIST`, `TRUST_LANDING`, `INDUSTRY_LANDING`, `NAVBAR`, `DIRECT`, `UNKNOWN`). Unknown input → `'GENERAL_PUBLIC'`.

**Context handoff priority (GeneralInquiryForm):** `productSlug > categorySlug > collectionSlug` → maps to payload field `product_slug` / `category_slug` / `collection_slug` respectively.

**Message field:** max 2000 chars input; label: "Do not include email addresses or phone numbers." Max 500 chars enforced by backend after PII sanitization.

**Success state:** "Your interest has been recorded." + "Create account to follow up" auth CTA.

**Footer:** "This page is a public information surface. No payments or binding commitments are made here."

**Error classification (`classifySubmitError`):**
- `400` → "Please do not include contact details in your message."
- `429` → "Too many submissions — please wait before trying again."
- `404` → "This supplier is not currently available for inquiry."
- generic → "We could not record your inquiry right now."

**Test coverage:** PII-001 through PII-025 (25 tests) in `tests/frontend/public-inquiry-page.test.tsx`  
- PII-016 verifies `source_surface: 'GENERAL_PUBLIC'` for general form ✅  
- PII-021 verifies `product_slug` + `source_surface: 'PRODUCT_DETAIL'` context handoff ✅  
- PII-022 verifies `category_slug` + `source_surface: 'CATEGORY_STORY'` ✅  
- PII-023 verifies `collection_slug` + `source_surface: 'COLLECTION_DETAIL'` ✅  
- PII-010 verifies supplier-context form payload — does **NOT** assert `source_surface`; gap invisible to test suite.

**Classification:** `IMPLEMENTED_TEST_COVERED` with a source_surface attribution gap in FORM mode (supplier-context `InquiryForm` subcomponent does not accept or forward `sourceSurface`)

---

## 5. Backend Inquiry Endpoint Summary

**Route:** `POST /api/public/inquiry/submit` (registered in `server/src/routes/public.ts`, lines 1237–1440)  
**Auth required:** NO (public unauthenticated route)  
**Rate limit:** 20 requests / 15 minutes per IP

**Zod body schema:**
| Field | Type | Required | Constraints |
|---|---|---|---|
| `inquiry_category` | enum | YES | `GENERAL \| CAPABILITY_FIT \| OFFERING_PREVIEW \| SOURCING_INTENT \| QUALIFICATION_CHECK` |
| `supplier_slug` | string | NO | min 1 / max 100 / `^[a-z0-9-]+$` |
| `source_surface` | string | NO | max 64 |
| `product_slug` | string | NO | min 1 / max 100 / `^[a-z0-9-]+$` |
| `category_slug` | string | NO | min 1 / max 100 |
| `collection_slug` | string | NO | min 1 / max 100 |
| `geo_band` | string | NO | min 1 / max 100 (if present, empty string → 400) |
| `volume_band` | string | NO | min 1 / max 100 |
| `message` | string | NO | max 2000 input; max 500 after sanitization |

**Context exclusivity:** `supplier_slug` cannot coexist with `product_slug`, `category_slug`, or `collection_slug` → 400.

**Message sanitization pipeline:** email pattern → 400; phone pattern → 400; strip HTML (`/<[^>]*>/g`); strip URLs (`/https?:\/\/[^\s]+/g`); truncate to 500 chars; if still > 500 → 400.

**source_surface normalization:** backend validates against `KNOWN_SOURCE_SURFACES` set (same 12 values as frontend); unknown/absent → normalizes to `'DIRECT'`.

**Slug approval gates:** `APPROVED_CATEGORY_SLUGS` and `APPROVED_COLLECTION_SLUGS` — fail-closed; unapproved slugs silently dropped from `afterJson`.

**Two execution paths:**
1. **Supplier path:** `getPublicB2BSupplierBySlug` visibility gate → 404 if not found/not eligible; `writeAuditLog` (action: `public.buyer.inquiry.created`, realm: `TENANT`, tenantId: supplier's orgId) — fire-and-forget
2. **General path:** No gate; `writeAuditLog` (action: `public.buyer.inquiry.general.created`, realm: `ADMIN`, tenantId: null, entityId: null) — fire-and-forget; event emission deferred to `PUBLIC-INQUIRY-GENERAL-EVENT-INFRASTRUCTURE-001`

**SMTP / email delivery:** NONE in this endpoint. Inquiry is captured as an audit log entry only. Supplier notification depends on FTR-B2C-004 (minimum notification loop) — NOT_STARTED per governance docs.

**Response:** `202 { success: true, data: { acknowledged: true, message: 'Your inquiry has been received.' } }`

**Design authority:** `PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001`  
**Implementation authority:** `PUBLIC-INQUIRY-ENDPOINT-CONTEXT-IMPLEMENTATION-001`

---

## 6. source_surface Attribution Analysis

All four active inquiry submission paths and their `source_surface` behaviour:

| Submission Path | source_surface in payload | Value | Backend stores |
|---|---|---|---|
| `/supplier/:slug` inline form (`PublicSupplierProfile.tsx`) | **ABSENT** ❌ | not passed | `'DIRECT'` (normalized) |
| `/inquiry` FORM mode — `InquiryForm` (supplier context, valid `supplierSlug`) | **ABSENT** ❌ | `InquiryForm` props do not include `sourceSurface`; `PublicInquiryPage` has `sourceSurface` prop but does not forward it | `'DIRECT'` (normalized) |
| `/inquiry` NO_CONTEXT mode — `GeneralInquiryForm` (product/category/collection context) | **PRESENT** ✅ | `resolveSourceSurface(sourceSurface prop)` — e.g. `'PRODUCT_DETAIL'`, `'CATEGORY_STORY'`, `'COLLECTION_DETAIL'` | Resolved value |
| `/inquiry` NO_CONTEXT mode — `GeneralInquiryForm` (no context, direct visit) | **PRESENT** ✅ | `resolveSourceSurface('')` → `'GENERAL_PUBLIC'` | `'GENERAL_PUBLIC'` |

**Net effect:** All supplier-context inquiry submissions (the majority during soft launch — submitted from supplier profile pages) are stored with `source_surface: 'DIRECT'`. The `'SUPPLIER_PROFILE'` surface value in `VALID_SOURCE_SURFACES` is never written by any current code path.

**Test visibility:** Neither PSI-007 (supplier profile inline form) nor PII-010 (PublicInquiryPage FORM mode) asserts the presence or absence of `source_surface` in the payload. The gap is invisible to the test suite.

---

## 7. PII Safety Findings

### 7.1 Frontend — no PII fields in any inquiry form

Across all 3 surfaces that render inquiry UI (`/supplier/:slug`, `PublicInquiryPage` FORM mode, `PublicInquiryPage` NO_CONTEXT mode):
- No `email`, `phone`, `name`, `buyer_name`, `company`, or `contact` fields rendered
- Verified by: PSI-005, PSI-009, PII-009, PII-014

### 7.2 Backend — PII blocking in message field

- Email pattern in `message` body → 400 (INQ-016, confirmed working)
- Phone pattern in `message` body → 400 (INQ-017, confirmed working)
- HTML tags stripped before storage (INQ-025)
- URLs stripped before storage

### 7.3 Audit log afterJson — no PII or org UUID

Verified by INQ-012 and INQ-027:
- `afterJson` does not contain `email`, `phone`, `buyer_name`, `org_id`, `orgId`, `external_orchestration_ref`
- Supplier path: `afterJson` does not contain the supplier's `orgId` (stored separately in audit row `tenantId`, not in the public event payload)
- General path: `tenantId: null`, `entityId: null`, `afterJson` contains no org identifiers

### 7.4 Buyer response — no message echo

PII-019 verifies that the success state does not echo back the message content the buyer submitted.

---

## 8. Test Evidence Summary

### 8.1 Backend unit tests

**File:** `server/src/__tests__/public-buyer-inquiry.unit.test.ts`  
**Count:** 27 tests (INQ-001 through INQ-027)  
**Harness:** Vitest + Fastify `inject` (no live DB)

| Test ID | Scenario |
|---|---|
| INQ-001 | Valid minimal payload (supplier context) → 202 |
| INQ-002 | Valid payload with optional geo_band + volume_band → 202 |
| INQ-003 | Non-eligible supplier (gate fails) → 404 (no gate detail) |
| INQ-004 | Invalid `supplier_slug` (bad chars) → 400 |
| INQ-005 | Missing `inquiry_category` → 400 |
| INQ-006 | Invalid `inquiry_category` value → 400 |
| INQ-007 | Oversized `supplier_slug` (>100 chars) → 400 |
| INQ-008 | `geo_band` present but empty string → 400 |
| INQ-009 | `writeAuditLog` called with correct action on valid supplier inquiry |
| INQ-010 | Route returns 202 even if `writeAuditLog` rejects (fire-and-forget) |
| INQ-011 | Extra prohibited fields (email, external_ref) stripped by Zod; not in afterJson |
| INQ-012 | afterJson contains no org UUID, email, or phone |
| INQ-013 | General inquiry (no supplier_slug) → 202; supplier gate NOT called |
| INQ-014 | General inquiry with `source_surface: NAVBAR` → 202; preserved in afterJson |
| INQ-015 | General inquiry with message → 202; stored as `inquiry_message` (not `message`) |
| INQ-016 | Message with email address → 400 |
| INQ-017 | Message with phone number → 400 |
| INQ-018 | `product_slug` in valid format (no supplier_slug) → 202; in afterJson |
| INQ-019 | `category_slug: garments` (approved) → 202; in afterJson |
| INQ-020 | `category_slug: unknown-category` (unapproved) → 202; absent from afterJson |
| INQ-021 | `collection_slug: natural-fabric-stories` (approved) → 202; in afterJson |
| INQ-022 | `supplier_slug` + `product_slug` exclusivity violation → 400 |
| INQ-023 | Unknown `source_surface` → 202; normalized to `'DIRECT'` in afterJson |
| INQ-024 | Message >500 chars after sanitization → 400 |
| INQ-025 | Message with HTML tags → 202; HTML stripped in `inquiry_message` |
| INQ-026 | Phase 1 regression: all supplier Phase 1 fields → 202 (backward compatible) |
| INQ-027 | General inquiry afterJson: no org UUID; realm ADMIN; action `general.created` |

### 8.2 Frontend — supplier profile inline form

**File:** `tests/frontend/public-supplier-profile-inquiry.test.tsx`  
**Count:** 8 tests (PSI-001 through PSI-008)  
**Harness:** Vitest + @testing-library/react + jsdom

| Test ID | Scenario |
|---|---|
| PSI-001 | Inquiry form renders after profile loads |
| PSI-002 | Submit disabled when no category selected |
| PSI-003 | Valid form submission → success state |
| PSI-004 | Submission error → error message |
| PSI-005 | No contact/email/phone fields rendered |
| PSI-006 | No payment/order/RFQ language in inquiry section |
| PSI-007 | `submitPublicInquiry` called with correct payload (no PII) — **does NOT assert source_surface** |
| PSI-008 | Success state replaces form (no double-submit) |

### 8.3 Frontend — PublicInquiryPage component

**File:** `tests/frontend/public-inquiry-page.test.tsx`  
**Count:** 25 tests (PII-001 through PII-025)  
**Harness:** Vitest + @testing-library/react + jsdom

| Test range | Scope |
|---|---|
| PII-001–012 | Supplier-context FORM mode: render modes, submit, error handling, PII absence, payload correctness, no payment language |
| PII-013–020 | General mode (NO_CONTEXT): render, PII absence, payload correctness, message handling, source_surface default, error classification |
| PII-021–025 | Context handoff: productSlug, categorySlug, collectionSlug, priority ordering, sourceSurface prop forwarding |

**Key gaps in test coverage:**
- PII-010 (FORM mode payload) does not assert `source_surface` is absent or present — gap is invisible
- No test for `ProductDetail` inquiry CTA link presence or href construction
- No test asserting `'SUPPLIER_PROFILE'` source_surface should be passed by supplier-context form (this gap is therefore un-asserted in the current test suite)

---

## 9. Per-Surface Classification

| Surface | Route | Inquiry Form | Inquiry CTA | source_surface correct | Test coverage | Classification |
|---|---|---|---|---|---|---|
| B2C Product Browse | `/products` | NO | NO | N/A | N/A | `NOT_IMPLEMENTED` |
| B2C Product Detail | `/product/:slug` | NO | YES — nav to `/inquiry` | YES (`PRODUCT_DETAIL` via URL) | Indirect (PII-021) | `IMPLEMENTED_UNVERIFIED` |
| B2B Supplier Profile | `/supplier/:slug` | YES (inline) | — | **NO** (`DIRECT` stored) | PSI-001–008 | `IMPLEMENTED_TEST_COVERED` (source_surface gap) |
| Aggregator Preview | `/aggregator` | NO | NO | N/A | N/A | `NOT_IMPLEMENTED` |
| B2B Discovery | SPA state | NO | NO | N/A | N/A | `NOT_IMPLEMENTED` (routes to profiles) |
| Inquiry Page — FORM mode | `/inquiry?supplierSlug=` | YES | — | **NO** (`DIRECT` stored) | PII-003–012 (source_surface gap invisible) | `IMPLEMENTED_TEST_COVERED` (source_surface gap) |
| Inquiry Page — NO_CONTEXT mode | `/inquiry` | YES | — | YES | PII-013–025 | `IMPLEMENTED_TEST_COVERED` |

### Overall Classification: `PARTIAL`

- **2 of 5 discovery surfaces** have an inquiry entry point (supplier profile inline form; product detail hard-nav CTA)
- **3 of 5 discovery surfaces** have no inquiry attachment (products browse, aggregator, B2B discovery directory)
- **2 of 4 active inquiry submission paths** have a `source_surface` attribution gap
- The inquiry endpoint itself and the general-context path are `IMPLEMENTED_TEST_COVERED`

---

## 10. Governance Drift Assessment

| Governance claim | Source | Repo truth | Status |
|---|---|---|---|
| "Public inquiry submission: PRODUCTION_VERIFIED" | SOFT-LAUNCH-PRIORITY-RESET-REQUIREMENTS-INTAKE-REVIEW-001.md line 200 | Endpoint is production-tested (FAM-03); basic flow is sound | **CONSISTENT** — claim refers to FAM-03 smoke test; audit log capture is working |
| "Buyer inquiry submission: ALLOWED — PRODUCTION_VERIFIED \| FAM-03 VERIFIED_COMPLETE" | SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md line 87 | Consistent | **CONSISTENT** |
| "/product/:slug detail pages with supplier attribution and inquiry CTA" as Q4 minimum | SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md line 139 | Inquiry CTA present and correct at line 327 | **CONSISTENT — CONFIRMED IMPLEMENTED** |
| "Minimum inquiry notification loop operational (FTR-B2C-004) \| DESIGN_GATED" | SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md line 334 | Backend writes audit log only; no SMTP/email delivery in inquiry route | **CONSISTENT — NOT_STARTED confirmed** |
| `source_surface` attribution gap on `/supplier/:slug` | RT2-B1 artifact | Re-confirmed by this audit; gap extends to `/inquiry` FORM mode as well | **DRIFT EXTENDED** — RT2-B1 identified gap on one path; this audit confirms gap on two paths |
| "Public inquiry form: Embedded at product/supplier pages" | SOFT-LAUNCH-PRIORITY-RESET-REQUIREMENTS-INTAKE-REVIEW-001.md line 291 | `/product/:slug` has CTA (nav, not embedded form); `/supplier/:slug` has inline form | **PARTIALLY ACCURATE** — "embedded" overstates for product detail |
| "SMTP / notification loop … SMTP is needed only when PRIT-033 Stage 2 (supplier email notifications) is implemented" | SOFT-LAUNCH-PRIORITY-RESET-REQUIREMENTS-INTAKE-REVIEW-001.md line 144 | No SMTP anywhere in inquiry route; confirmed | **CONSISTENT** |
| `'SUPPLIER_PROFILE'` listed in `VALID_SOURCE_SURFACES` | `PublicInquiryPage.tsx` + `services/publicB2BService.ts` | Defined as a valid value but **never written by any current code path** | **GAP** — value is defined in the type but orphaned; no surface emits it |

---

## 11. Open Items and Recommended Next Packet

### 11.1 Open items from this audit (not in scope to fix here)

| ID | Item | Priority | Suggested scope |
|---|---|---|---|
| OI-B3-001 | `source_surface: 'SUPPLIER_PROFILE'` missing from supplier-context inquiry submissions (`/supplier/:slug` inline form + `PublicInquiryPage` FORM mode) | P2 (soft-launch: analytics gap, not functional blocker) | `SOFT-LAUNCH-SOURCE-SURFACE-ATTRIBUTION-FIX-001` |
| OI-B3-002 | PSI-007 and PII-010 do not assert `source_surface` in payload — gap invisible to tests | P2 | Same unit as OI-B3-001 |
| OI-B3-003 | No dedicated test for `/product/:slug` inquiry CTA link presence and href construction | P3 (static `<a>` link, minimal regression risk) | Can be added to product detail test file |
| OI-B3-004 | FTR-B2C-004 minimum notification loop not started | P1 soft-launch blocker (per governance) | `SOFT-LAUNCH-MINIMUM-NOTIFICATION-LOOP-UNIT-001` |
| OI-B3-005 | PRIT-034 legal pages bundle not yet deployed | P0 prerequisite before public buyer data collection at scale | Separate unit |

### 11.2 Recommended next packet

**RT2-B4 — Aggregator Readiness Synthesis**

The RT2 packet sequence has now audited:
- RT2-A: B2C product browse + product detail + aggregator routes
- RT2-B1: Supplier profile
- RT2-B2: B2B discovery directory
- RT2-B3: Directory inquiry attachment (this artifact)

RT2-B4 should synthesize the full aggregator readiness picture — whether the aggregator (the Aggregator Preview + B2B Discovery + Supplier Profile chain) is ready as a unit for soft launch buyer routing, combining data from all preceding packets and the FTR-B2C-004 dependency status. No new code reads are expected; this is a synthesis and gate-readiness write-up.

---

## 12. No Authorization Statement

This artifact is a read-only repo truth audit. No code changes were made. No schema was modified. No migrations were run. No commits were created for implementation in this packet.

Files read (read-only):
- `components/Public/B2CBrowse.tsx`
- `components/Public/PublicProductDetail.tsx`
- `components/Public/PublicSupplierProfile.tsx`
- `components/Public/PublicAggregatorPreview.tsx`
- `components/Public/B2BDiscovery.tsx`
- `components/Public/PublicInquiryPage.tsx`
- `services/publicB2BService.ts` (lines 96–165)
- `server/src/routes/public.ts` (lines 1237–1450)
- `tests/frontend/public-supplier-profile-inquiry.test.tsx`
- `tests/frontend/public-inquiry-page.test.tsx`
- `server/src/__tests__/public-buyer-inquiry.unit.test.ts`
- `App.tsx` (lines 2217–2290, 7396–7425)
- `governance/units/SOFT-LAUNCH-PRIORITY-RESET-REQUIREMENTS-INTAKE-REVIEW-001.md` (targeted grep)
- `governance/launch-readiness/SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md` (targeted grep)

---

*RT2-B3 COMPLETE. Commit follows.*
