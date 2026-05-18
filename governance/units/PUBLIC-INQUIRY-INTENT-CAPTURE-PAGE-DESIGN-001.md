# PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-DESIGN-001
## Public Inquiry Intent-Capture Page — Design Unit

**Unit ID:** PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-DESIGN-001
**Family:** Public Attraction Layer Governance
**Status:** DESIGN_COMPLETE
**Date:** 2026-07-08
**Authorized by:** Paresh
**Artifact class:** Governance design — design-only, no runtime changes
**Placement:** `governance/units/`

---

## 1. Status Summary

| Field | Value |
|---|---|
| Unit ID | PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-DESIGN-001 |
| Status | DESIGN_COMPLETE |
| Scope | Page 11 standalone public inquiry intent-capture page — design only |
| Prior state | No PUBLIC_INQUIRY app state, no /inquiry route, inline supplier inquiry only |
| Decision | Add /inquiry route + PUBLIC_INQUIRY app state; Phase 1 supplier-context-only; Phase 2 endpoint extension deferred |
| Runtime changes introduced | None — design only |
| Schema changes introduced | None — design only |
| API changes introduced | None — design only |
| Blocking | Phase 2 scope: pending PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001 |

---

## 2. Design Authority References

| Document | Role |
|---|---|
| `PUBLIC-FACING-PAGES-SEQUENCE-DECISION-001.md` | Page 11 sequencing and status authority |
| `governance/units/PUBLIC-PAGES-NAVBAR-IA-AUDIT-AND-DESIGN-001.md` | Page 11/12 IA and nav treatment authority |
| `governance/units/TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md` | B2C inquiry sequencing tracker |
| `docs/product-truth/MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v2.md` | INQUIRY-004 original design authority |
| `governance/decisions/TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1.md` | Inquiry object model; prohibited payload categories |
| `shared/contracts/openapi.tenant.json` | Existing `POST /api/public/inquiry/submit` contract |
| `config/publicIndustryClusterTaxonomy.ts` | Taxonomy vocabulary; Layer 7 inquiry context terms (DEFERRED) |
| `PUBLIC-SEO-INFRASTRUCTURE-DECISION-001.md` | SEO utility pattern |

---

## 3. Purpose

Page 11 of the TexQtic public attraction layer is the **standalone public inquiry intent-capture page**. It provides a dedicated URL (`/inquiry`) for unauthenticated visitors to express sourcing intent, curiosity, or a desire to connect — without revealing contact information and without initiating a commercial or binding RFQ workflow.

The page is:
- **Intent-only**: captures bounded, non-binding pre-auth signals.
- **Non-PII**: does not collect name, email, phone, or any identifying personal data.
- **Public-safe**: no private fields, tenant IDs, org UUIDs, pricing, negotiation, or order state.
- **Phased**: Phase 1 is supplier-context-only (reuses existing endpoint with no backend changes); Phase 2 extends to general/multi-context (requires endpoint design unit).
- **SEO-indexable**: `/inquiry` renders generic public copy suitable for `index, follow`.

---

## 4. Repo-Truth Baseline Inspection

### 4.1 Inspection Summary

Files inspected:
- `App.tsx` — `resolveInitialAppState()` lines 2015–2110
- `services/publicB2BService.ts` — lines 1–200 (full inquiry section)
- `server/src/routes/public.ts` — lines 1235–1320 (INQUIRY-004 route)
- `shared/contracts/openapi.tenant.json` — `/api/public/inquiry/submit` path lines 4957–5030
- `components/Public/PublicSupplierProfile.tsx` — lines 1–60 (inquiry form usage)
- `tests/frontend/public-supplier-profile-inquiry.test.tsx` — lines 1–100 (inquiry test suite)
- `config/publicIndustryClusterTaxonomy.ts` — Layer 7 section (lines 180–194)
- `utils/publicPageMeta.ts` — lines 1–60 (SEO utility scope)
- `vercel.json` — full (SPA routing, no inquiry-specific rules)
- `PUBLIC-FACING-PAGES-SEQUENCE-DECISION-001.md` — sections 2.4 and 2.5 (Page 11/12 state)
- `governance/units/PUBLIC-PAGES-NAVBAR-IA-AUDIT-AND-DESIGN-001.md` — section 9 (Page 11 treatment)

### 4.2 13 Repo-Truth Inspection Questions — Answers

| # | Question | Answer |
|---|---|---|
| 1 | Does a standalone public inquiry route currently exist? | **NO** — no `/inquiry` path in `resolveInitialAppState()` |
| 2 | Does `PUBLIC_INQUIRY` app state exist? | **NO** — no such literal in App.tsx or types |
| 3 | Does `submitPublicInquiry` already exist and what scope? | **YES** — exists in `services/publicB2BService.ts`; **supplier-scoped only**; requires `supplier_slug` as mandatory field |
| 4 | Is existing inquiry behavior supplier-profile-scoped only? | **YES** — inline form in `PublicSupplierProfile`; `supplier_slug` is the `slug` prop on the component |
| 5 | Does `/api/public/inquiry/submit` exist and what fields? | **YES** — implemented in `server/src/routes/public.ts` (INQUIRY-004); accepts: `supplier_slug` (required), `inquiry_category` (required enum), `geo_band` (optional), `volume_band` (optional) |
| 6 | Does OpenAPI document public inquiry submission? | **YES** — `shared/contracts/openapi.tenant.json` path `/api/public/inquiry/submit` is present and governed |
| 7 | Does any inquiry form capture RFQ/buyer-intent/private fields? | **NO** — existing form explicitly prohibits raw email, phone, buyer name, org UUID, pricing, negotiation state, order state |
| 8 | Which public surfaces could link to inquiry? | `/supplier/:slug` (has inline form), `/product/:slug`, `/products`, `/products/category/:slug`, `/collections`, `/collections/:slug`, `/trust`, `/industries`, `/aggregator` |
| 9 | Which context fields are public-safe for context carriage? | `sourceSurface` (enum), `supplierSlug` (slug string), `productSlug` (slug string), `categorySlug` (slug string), `collectionSlug` (slug string) — all derived from existing public URL segments, no private IDs |
| 10 | Schema/backend/OpenAPI changes required? | **PARTIAL** — supplier-context Phase 1: no changes needed; general/multi-context Phase 2: backend extension required (see section 13) |
| 11 | Public/private boundary risk in current inquiry code? | **NONE OBSERVED** — existing INQUIRY-004 is cleanly scoped; supplier visibility gated by same five projection gates as ROUTE-001 |
| 12 | Is Page 12 auth handoff still CTA semantics only? | **YES** — confirmed by NAVBAR-IA-AUDIT-AND-DESIGN-001 section 9; no standalone `PUBLIC_HANDOFF` route or state |
| 13 | Is authenticated continuation deferred? | **YES** — post-auth inquiry follow-up is in authenticated family; deferred per B2C tracker |

---

## 5. Problem Statement

The TexQtic public attraction layer currently has no dedicated standalone URL for expressing sourcing intent. Inquiry functionality exists only as an inline form inside `PublicSupplierProfile` — scoped exclusively to supplier-specific pre-auth signals.

The absence of Page 11 creates three problems:

1. **No discoverable inquiry entry point** — visitors arriving from search, QR, or direct link have no canonical place to express intent without first finding a specific supplier profile.
2. **No shareable inquiry URL** — marketing materials and CTAs cannot point to a stable `/inquiry` path.
3. **No cross-surface inquiry hook** — B2C product pages, category story pages, and collection pages have no inquiry handoff destination.

The design goal is to establish `/inquiry` as a canonical, SEO-safe, PII-free intent-capture surface that serves both supplier-context and general (non-supplier) visitor journeys.

---

## 6. Route Model Decision

### Options Considered

| Option | Path | Rationale | Verdict |
|---|---|---|---|
| A | `/inquiry` | Clean, discoverable, distinct from product/supplier paths, matches Page 11 label | **SELECTED** |
| B | `/request` | Ambiguous — conflicts semantically with `texqtic.com/request-access` (existing constant in App.tsx line 2002) | Rejected |
| C | `/products/inquiry` | Too narrow — B2C-scoped, excludes supplier, collection, and general use cases | Rejected |
| D | No standalone route — CTAs only | Loses canonical SEO surface, no shareable URL, misses Page 11 value proposition | Rejected |

### Selected Route

```
/inquiry
```

### Route Pattern in App.tsx

```typescript
// To be added in resolveInitialAppState() — implementation unit only
const inquiryPathMatch = globalThis.window.location.pathname === '/inquiry' ||
  globalThis.window.location.pathname === '/inquiry/';
if (inquiryPathMatch) {
  return 'PUBLIC_INQUIRY';
}
```

**Placement:** After the `/aggregator` match (line ~2041 in App.tsx) and before the supplier path match — or at the position consistent with existing public route ordering.

**Vercel routing:** No change required. Existing fallthrough rule `"src": "/(.*)"` → `"/index.html"` already covers `/inquiry`.

---

## 7. App State Design

### New App State Literal

```
PUBLIC_INQUIRY
```

### State Registration Requirements

1. Add `'PUBLIC_INQUIRY'` to the `AppState` type union in `types.ts` (or wherever `AppState` is declared — confirm at implementation time).
2. Add path match `'/inquiry'` in `resolveInitialAppState()` in `App.tsx` returning `'PUBLIC_INQUIRY'`.
3. Add `PUBLIC_INQUIRY` render branch in the main `appState` switch/conditional in `App.tsx`.

### Navigation to PUBLIC_INQUIRY

Navigation is **programmatic via `setAppState`** (consistent with existing pattern). No `<a href>` tags to `/inquiry` from within the SPA. Buttons/CTAs call `setAppState('PUBLIC_INQUIRY')` and optionally update `window.history.pushState` to `/inquiry` (matching the pattern used by other public states).

Direct URL load (cold navigate, deep-link) is handled by `resolveInitialAppState()`.

---

## 8. Component Name and File Placement

### Component Name

```
PublicInquiryPage
```

### File Path

```
components/Public/PublicInquiryPage.tsx
```

### Component Props Interface (for design reference — implementation unit finalizes)

```typescript
interface PublicInquiryPageProps {
  readonly context: PublicInquiryContext;     // from navigation or URL params (see section 10)
  readonly onBack: () => void;                // returns to calling surface or PUBLIC_ENTRY
  readonly onSignIn: () => void;              // auth handoff CTA
  readonly nav: PublicNavbarProps;            // consistent with all other public pages
}
```

---

## 9. URL Pattern and Navigation Entry Points

### Primary URL

```
/inquiry
```

### Context Delivery Mechanism

Context fields (supplier, product, category, collection slug; source surface) are delivered via:
- **URL query parameters** for cold-load / deep-link: `/inquiry?sourceSurface=SUPPLIER_PROFILE&supplierSlug=acme-textiles`
- **In-memory navigation state** for SPA transitions: passed as `context` prop to `PublicInquiryPage`

Query param parsing for cold-load is the responsibility of the implementation unit. Parameters MUST be validated against the public-safe context model (section 10). Unknown or invalid slugs must be silently ignored (fail-closed to general context).

### Planned Linking Surfaces (Phase 1 only)

| Source Surface | Context Available | CTA Label |
|---|---|---|
| `PublicSupplierProfile` | supplierSlug | "Send inquiry" → moves to `/inquiry?supplierSlug=<slug>` OR keeps inline (design preference at implementation time) |
| Navbar / global CTA | none | "Inquire" or "Express Interest" → plain `/inquiry` |

### Planned Linking Surfaces (Phase 2 — deferred)

| Source Surface | Context Available | Status |
|---|---|---|
| `PublicProductDetail` | productSlug | Deferred — requires endpoint extension |
| `B2CBrowsePage` | categorySlug (if filtered) | Deferred — requires endpoint extension |
| `PublicCategoryStory` | categorySlug | Deferred — requires endpoint extension |
| `PublicCollectionDetail` | collectionSlug | Deferred — requires endpoint extension |

---

## 10. Source Surface Registry

### `PublicInquirySourceSurface` Enum (design-time; implementation unit declares type)

| Value | Source | Context fields populated |
|---|---|---|
| `SUPPLIER_PROFILE` | `/supplier/:slug` | `supplierSlug` |
| `PRODUCT_DETAIL` | `/product/:slug` | `productSlug` — **Phase 2 only** |
| `B2C_BROWSE` | `/products` | none | — **Phase 2 only** |
| `CATEGORY_STORY` | `/products/category/:slug` | `categorySlug` — **Phase 2 only** |
| `COLLECTION_DETAIL` | `/collections/:slug` | `collectionSlug` — **Phase 2 only** |
| `COLLECTION_LIST` | `/collections` | none — **Phase 2 only** |
| `TRUST_LANDING` | `/trust` | none — **Phase 2 only** |
| `INDUSTRY_LANDING` | `/industries` | none — **Phase 2 only** |
| `DIRECT` | direct URL load, navbar | none |
| `UNKNOWN` | fallback / validation failure | none |

### Public-Safe Context Model

```typescript
interface PublicInquiryContext {
  sourceSurface: PublicInquirySourceSurface;
  supplierSlug?: string;    // only when source = SUPPLIER_PROFILE
  productSlug?: string;     // Phase 2 only — deferred
  categorySlug?: string;    // Phase 2 only — deferred
  collectionSlug?: string;  // Phase 2 only — deferred
}
```

**Safety rule:** Context fields contain only slug strings — public URL segments. No org IDs, tenant IDs, auth tokens, internal UUIDs, or private references are allowed in the context model.

---

## 11. Form Field Model

### Phase 1 Allowed Fields (supplier-context; no backend changes required)

| Field | Type | Required | Source | Notes |
|---|---|---|---|---|
| `inquiry_category` | Bounded enum | Required | User selects | Reuses existing `PublicInquiryCategory` enum |
| `geo_band` | Free text, max 100 chars | Optional | User inputs | Geography qualifier |
| `volume_band` | Free text, max 100 chars | Optional | User inputs | Volume qualifier |
| Context summary | Read-only display | N/A | Derived from context | Shows "Regarding: [supplierName]" or equivalent public-safe label |

### Phase 2 Additional Fields (deferred — requires endpoint extension)

| Field | Type | Required | Notes |
|---|---|---|---|
| `source_surface` | Enum | Server-inferred | Sent in extended request payload |
| `product_slug` | String | Optional | From context |
| `category_slug` | String | Optional | From context |
| `collection_slug` | String | Optional | From context |
| `message` | Free text, max 500 chars | Optional | Requires backend schema extension |

### Explicit Forbidden Fields (all phases, unconditionally)

The following MUST NOT appear in the form, in the request payload, in URL parameters, or in any metadata:

| Forbidden Field | Reason |
|---|---|
| `name` / buyer name | PII — prohibited by INQUIRY-004 design authority |
| `email` / `emailAddress` | PII — prohibited by INQUIRY-004 design authority |
| `phone` / `phoneNumber` | PII — prohibited by INQUIRY-004 design authority |
| `company` / `companyName` | PII — links to identifiable business entity |
| `budget` | Commerce boundary — no money semantics on public surface |
| `price` / `pricing` | Commerce boundary |
| `quantity` | RFQ semantics — prohibited |
| `delivery` / `delivery_date` | RFQ semantics — prohibited |
| `rfq` / RFQ intent signals | Commerce boundary |
| `org_id` | Tenant ID — private, never in public payload |
| `tenantId` | Tenant ID — private |
| `userId` | User ID — private |
| Any internal UUID | Private internal reference |
| Auth token / session state | Security boundary |

---

## 12. Inquiry Type Vocabulary

### Phase 1: Reuse Existing Enum

The existing `PublicInquiryCategory` enum from `services/publicB2BService.ts` is reused in Phase 1:

```typescript
export type PublicInquiryCategory =
  | 'GENERAL'
  | 'CAPABILITY_FIT'
  | 'OFFERING_PREVIEW'
  | 'SOURCING_INTENT'
  | 'QUALIFICATION_CHECK';
```

### Phase 1 UI Labels

| Enum value | Display label |
|---|---|
| `GENERAL` | General inquiry |
| `CAPABILITY_FIT` | Capability fit |
| `OFFERING_PREVIEW` | Offering preview |
| `SOURCING_INTENT` | Sourcing interest |
| `QUALIFICATION_CHECK` | Supplier qualification |

### Phase 2 Extended Vocabulary (deferred)

The Layer 7 terms in `config/publicIndustryClusterTaxonomy.ts` (`INQUIRY_CONTEXT_TERMS`) are **DEFERRED** — status `DEFERRED` per taxonomy file, pending `INDUSTRY-CLUSTER-INQUIRY-CONTEXT-001`. Phase 2 vocabulary is gated on that unit.

---

## 13. Backend Endpoint Assessment

### Existing Endpoint

```
POST /api/public/inquiry/submit
```

**Status:** IMPLEMENTED and documented  
**Auth:** None required  
**Rate limit:** 20 req / 15 min / IP  
**Visibility gate:** Supplier must pass all five projection gates  

### Schema Compatibility Matrix

| Use case | Existing endpoint compatible? | Notes |
|---|---|---|
| Supplier-context inquiry (supplierSlug known) | **YES** — safe to reuse | `supplier_slug` is present; all required fields are available |
| General inquiry (no supplier context) | **NO** — `supplier_slug` is required | Cannot submit without a valid publication-eligible supplier |
| Product-context inquiry | **NO** — no `product_slug` field | Endpoint schema does not accept product context |
| Category-context inquiry | **NO** — no `category_slug` field | Endpoint schema does not accept category context |
| Collection-context inquiry | **NO** — no `collection_slug` field | Endpoint schema does not accept collection context |
| Free-text message | **NO** — no `message` field | Endpoint schema does not include free text |
| Source surface attribution | **NO** — no `source_surface` field | Endpoint schema does not accept surface context |

### Backend-Gated Determination

**Phase 1 (supplier-context-only):** NO backend changes required. Existing endpoint fully supports the Phase 1 use case. Implementation can proceed immediately.

**Phase 2 (general + multi-context):** BACKEND-GATED. The following changes to the backend are required before Phase 2 can be implemented:
1. Make `supplier_slug` optional in `inquirySubmitBodySchema` (currently required)
2. Add `source_surface` enum field (optional)
3. Add `product_slug`, `category_slug`, `collection_slug` context fields (all optional)
4. Add `message` field (optional, max 500 chars, sanitized)
5. Update OpenAPI contract to reflect extended schema
6. Review rate-limit budget adequacy for general (no-supplier) inquiries
7. Update event payload for `buyer_inquiry.created.v1` to include new context fields

These changes must be governed by `PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001` before Phase 2 implementation begins.

---

## 14. Phase Model

### Phase 1 — Supplier-Context Mode

**Scope:** Standalone `/inquiry` page that renders only when a `supplierSlug` is present in context (URL query param or SPA navigation state).

**Behavior when no supplier context:**
- Renders a "no context" state with a CTA to browse suppliers (`/`) and a message: "Start by finding a supplier to enquire about."
- Does NOT render the inquiry form.
- Does NOT make any API call.

**Submission flow:**
1. User arrives at `/inquiry` with `supplierSlug` in context (e.g., from supplier profile CTA)
2. `PUBLIC_INQUIRY` app state resolved; `PublicInquiryPage` renders
3. Supplier context summary shown (supplier name, read-only, public-safe)
4. Form: `inquiry_category` (required) + optional `geo_band` + optional `volume_band`
5. Submit → `POST /api/public/inquiry/submit` with `supplier_slug`, `inquiry_category`, optional fields
6. Success state: "Your interest has been recorded." + auth handoff CTA ("Create an account to follow up")
7. Error state: retry CTA; no partial data revealed

**Backend changes:** NONE

**Gating:** Can proceed to implementation immediately after design acceptance.

### Phase 2 — General and Multi-Context Mode

**Scope:** Standalone `/inquiry` page that works from any surface — including with no context (direct URL load, navbar).

**Additional capabilities:**
- General form (no supplier required)
- Product/category/collection context carriage
- `message` free-text field
- Extended source surface attribution

**Backend changes:** REQUIRED — see section 13. Governed by `PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001`.

**Gating:** BLOCKED until `PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001` is DESIGN_COMPLETE.

---

## 15. SEO Metadata Design

### Route

```
/inquiry
```

### Page-level Metadata (using `applyPublicPageMeta` from `utils/publicPageMeta.ts`)

| Tag | Value |
|---|---|
| `<title>` | `Express Interest — TexQtic` |
| `<meta name="description">` | `Tell us what you're looking for. Share sourcing interest with TexQtic-verified suppliers — no account required.` |
| `<link rel="canonical">` | `https://app.texqtic.com/inquiry` (regardless of query params) |
| `robots` | `index, follow` |
| `og:type` | `website` (consistent with current `publicPageMeta.ts` type constraint) |
| `og:title` | Same as `<title>` |
| `og:description` | Same as description |
| `og:image` | `PUBLIC_META_OG_FALLBACK_IMAGE` (`/brand/texqtic-logo.png`) |
| `twitter:card` | `summary` |
| `twitter:title` | Same as `<title>` |
| `twitter:description` | Same as description |

### Robots Rationale

`index, follow` is safe because:
- Page renders generic public copy not tied to any supplier, tenant, or private data
- Canonical is stable (`/inquiry` regardless of query params)
- No private or gated content is rendered
- Query params (`supplierSlug`, `sourceSurface`) are state-only; page degrades gracefully to no-context state when params are absent

### Canonical Rule

The canonical URL MUST always be `/inquiry` — never `/inquiry?supplierSlug=...` or any parameterized variant. This prevents duplicate indexing from parameterized entry points.

### SEO Governance Compliance

- No supplier names, org names, or tenant-specific strings in SEO metadata
- No pricing, RFQ, order, or commerce language in description or title
- No trust/certification claims in description (evidence-gated rule)
- No private field exposure in any meta tag

---

## 16. Public/Private Boundary Rules

The following rules apply to `PublicInquiryPage` in all phases:

1. **No PII collection.** No email, name, phone, company fields anywhere in the form or submission payload.
2. **No private ID exposure.** No `org_id`, `tenantId`, `userId`, internal UUID in form, URL, or API call.
3. **Context fields contain slugs only.** `supplierSlug`, `productSlug`, `categorySlug`, `collectionSlug` are public URL-segment values. No internal reference IDs.
4. **Context summary is public-safe.** If showing "Regarding: [supplierName]", the supplier name must be fetched from the public projection (same five-gate check as ROUTE-001) or derived from public-safe data already in navigation state. Do NOT pass supplier names from URL params without validation.
5. **Inquiry result is opaque.** API response is `{ acknowledged: true, message: "..." }` — no internal IDs, event IDs, or tenant refs exposed to frontend.
6. **No inquiry history exposed.** The page does not render previously submitted inquiries. Inquiry history is an authenticated-only concept.
7. **Form clears on success.** After successful submission, the form is replaced by a success message. No "submitted inquiry" data retained in page state beyond the opaque acknowledgment.

---

## 17. Auth Handoff CTA Design

### Post-submission CTA (success state)

After successful inquiry submission, the success state renders an auth handoff CTA:

**Label:** "Create an account to follow up"  
**Sub-copy:** "Track this inquiry and connect with verified suppliers after you sign in."  
**Action:** Calls `onSignIn()` prop → existing `openSecondaryAuthenticatedEntry('TENANT')` pattern  
**CTA type:** Secondary button (consistent with existing public page patterns)

### No-context CTA (when no supplier context available)

**Label:** "Find suppliers to enquire about"  
**Action:** Navigates to `PUBLIC_ENTRY` or `PUBLIC_B2B_DISCOVERY` via `setAppState`

### Page 12 compliance

Per NAVBAR-IA-AUDIT-AND-DESIGN-001 section 9: Page 12 (Auth Handoff) remains as CTA semantics only. The auth handoff CTAs on the inquiry page are inline actions, not a navigation to a separate `/handoff` page. This is consistent with the governance decision.

---

## 18. Navbar/IA Alignment

Per NAVBAR-IA-AUDIT-AND-DESIGN-001 section 9 and section 3:

| Nav slot | Treatment |
|---|---|
| Primary nav | `/inquiry` link added once `PUBLIC_INQUIRY` is implemented; label "Inquire" or "Express Interest" |
| Mobile hamburger | Same as primary nav — add once implemented |
| Pre-implementation treatment | Omit entirely (per NAVBAR-IA-AUDIT-AND-DESIGN-001 recommendation); do NOT add disabled "coming soon" link |

**Important:** The navbar change (adding the `/inquiry` link) is part of the implementation unit, not this design unit. No navbar files change here.

---

## 19. Copy Governance Rules

All copy on the inquiry page must comply with the following rules derived from existing taxonomy and claim-safety governance:

1. **No money-movement language.** No "Pay", "Order", "Buy", "Invoice", "Transaction", "RFQ" terminology.
2. **No unverified trust claims.** Cannot say "All suppliers are certified" or "Verified manufacturers." Can say "TexQtic-listed suppliers" or "supplier discovery."
3. **No ranking or recommendation language.** No "Top suppliers", "Best match", "AI-recommended."
4. **No volume/pricing promises.** No "Get the best price", "Bulk discount inquiry."
5. **No urgency patterns.** No "Limited time", "Act now", "Only N suppliers available."
6. **Approved framing.** "Express sourcing interest", "Tell us what you're looking for", "Connect with suppliers" are acceptable neutral framing patterns.

---

## 20. Rate Limit Awareness

The implementation unit must be aware that `POST /api/public/inquiry/submit` is rate-limited at **20 requests per 15 minutes per IP**. The frontend should handle the 429 response code gracefully:

- Show a rate-limit error message: "Too many submissions. Please wait a moment and try again."
- Do not reveal the specific rate limit window or threshold in the UI copy.
- This is a pre-existing backend constraint; no changes required in the design unit.

---

## 21. Component Architecture (for implementation reference)

### Rendering Modes

`PublicInquiryPage` renders in one of three modes based on context:

| Mode | Condition | UI |
|---|---|---|
| `SUPPLIER_CONTEXT` | `context.supplierSlug` is present and valid | Form + context summary + submit + auth CTA |
| `NO_CONTEXT` | No slug context present | "No context" state + "Find suppliers" CTA |
| `SUBMITTED_SUCCESS` | After successful API call | Success message + auth handoff CTA |
| `SUBMITTED_ERROR` | After failed API call | Error message + retry option |

### State Machine (sketch)

```
LOADING (if supplier validation needed)
  → SUPPLIER_CONTEXT (valid supplier) → SUBMITTED_SUCCESS | SUBMITTED_ERROR
  → NO_CONTEXT (no slug or invalid)
```

### Phase 1 does NOT require a new API call to validate the supplier before showing the form. The existing `POST /api/public/inquiry/submit` will return 404 if the supplier is not publication-eligible. The form can be shown eagerly; the 404 response is handled in the `SUBMITTED_ERROR` state with appropriate copy ("This supplier is not currently available for inquiry.").

---

## 22. Files to Change at Implementation Time

This is a design unit — no runtime files change now. The following files are approved to change in the implementation unit (`PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-IMPLEMENTATION-001`):

| File | Change |
|---|---|
| `App.tsx` | Add `PUBLIC_INQUIRY` render branch + `resolveInitialAppState` path match for `/inquiry` |
| `types.ts` | Add `'PUBLIC_INQUIRY'` to `AppState` type union |
| `components/Public/PublicInquiryPage.tsx` | CREATE — new component |
| `utils/publicPageMeta.ts` | Minor extension if `ogType: 'website'` constraint needs clarification; likely no change |

### Files That MAY Also Change (implementation judgment call)

| File | Reason |
|---|---|
| `components/Public/PublicNavbar.tsx` | Add `/inquiry` nav link (post-implementation) |
| `components/Public/PublicSupplierProfile.tsx` | Optionally add "More options → /inquiry" CTA alongside inline form (implementation choice) |

### Files Forbidden from Change in Implementation Unit

| File | Reason |
|---|---|
| `server/src/routes/public.ts` | No backend changes in Phase 1 |
| `shared/contracts/openapi.tenant.json` | No API contract changes in Phase 1 |
| `server/prisma/schema.prisma` | No schema changes |
| `services/publicB2BService.ts` | No changes to existing `submitPublicInquiry` interface — reuse as-is |
| `config/publicIndustryClusterTaxonomy.ts` | Layer 7 is DEFERRED |
| Any migration file | Not applicable |
| `.env` | Not applicable |

---

## 23. Files Forbidden from Change in This Design Unit

This unit is design-only. The following rules apply to the current unit:

- No changes to `App.tsx`
- No changes to `types.ts`
- No creation of `components/Public/PublicInquiryPage.tsx`
- No changes to `services/publicB2BService.ts`
- No changes to `server/src/routes/public.ts`
- No changes to `shared/contracts/openapi.tenant.json`
- No changes to `config/publicIndustryClusterTaxonomy.ts`
- No changes to `.env` or any environment file

**Files modified in this design unit:** This file (`PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-DESIGN-001.md`) + `TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md` (Section 27).

---

## 24. Explicit Deferrals

| Item | Status | Blocking unit |
|---|---|---|
| General inquiry (no supplier context) | DEFERRED — Phase 2 | `PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001` |
| Product/category/collection context carriage | DEFERRED — Phase 2 | `PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001` |
| `message` free-text field | DEFERRED — Phase 2 | `PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001` |
| `source_surface` backend attribution | DEFERRED — Phase 2 | `PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001` |
| Layer 7 inquiry taxonomy vocabulary | DEFERRED | `INDUSTRY-CLUSTER-INQUIRY-CONTEXT-001` |
| JSON-LD structured data | DEFERRED | Post domain strategy decision |
| Sitemap entry | DEFERRED | Post domain strategy decision |
| Authenticated inquiry follow-up / history | DEFERRED | Authenticated family; separate tracker |
| B2C product page → inquiry deep-link | DEFERRED — Phase 2 | `PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001` |
| Collection page → inquiry deep-link | DEFERRED — Phase 2 | `PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001` |
| Category story page → inquiry deep-link | DEFERRED — Phase 2 | `PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001` |
| `B2C-PUBLIC-INQUIRY-HANDOFF-DESIGN-001` (B2C tracker unit 6) | SUBSUMED — this unit covers the design scope; see section 25 |  — |

---

## 25. Relationship to B2C Tracker Unit 6 (`B2C-PUBLIC-INQUIRY-HANDOFF-DESIGN-001`)

The B2C tracker (section 6) references a unit `B2C-PUBLIC-INQUIRY-HANDOFF-DESIGN-001` for "bounded inquiry handoff from B2C product/category context." That unit has status `DESIGN_GATED`.

**Reconciliation:**
- `PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-DESIGN-001` (this unit) covers the broader Page 11 design, including the standalone route, app state, form model, SEO, and phase model.
- The B2C-specific inquiry handoff (product/category/collection context carriage) is the **Phase 2** scope of this design — explicitly deferred to `PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001`.
- `B2C-PUBLIC-INQUIRY-HANDOFF-DESIGN-001` is effectively **subsumed** by this unit + its Phase 2 follow-on. The B2C tracker section 6 should be updated to reflect this when Section 27 is written.

---

## 26. Stop Conditions Evaluated

| Stop condition | Evaluated | Result |
|---|---|---|
| B2C tracker not found | ✅ | NO — tracker exists |
| Public-facing sequence decision missing | ✅ | NO — exists at repo root |
| Standalone inquiry page already exists | ✅ | NO — confirmed absent |
| Existing endpoint unsafe (PII leak, tenant leak) | ✅ | SAFE — INQUIRY-004 is cleanly scoped; no unsafe behavior |
| Route model conflicts with App.tsx | ✅ | NO — `/inquiry` is unused, no conflict |
| Public/private boundary cannot be preserved | ✅ | PRESERVED — No PII in design; slug-only context model |
| Design requires immediate backend changes for Phase 1 | ✅ | NO — Phase 1 reuses existing endpoint |
| Design requires immediate backend changes for Phase 2 | ✅ | YES — Phase 2 is explicitly DEFERRED to endpoint design unit |

**BACKEND_GATED verdict:** Phase 1 is NOT backend-gated. Phase 2 is backend-gated and deferred.

---

## 27. Acceptance Criteria for This Design Unit

This design unit is complete only if:
- Route model decision is documented with options evaluated
- App state `PUBLIC_INQUIRY` is designed and placement in `resolveInitialAppState` is specified
- Context model is documented with public-safe fields only
- Form field model is documented with explicit allowed and forbidden fields
- Inquiry type vocabulary is documented with Phase 1 reuse decision
- Backend endpoint compatibility is assessed and phase model is documented
- SEO metadata design is complete (title, description, canonical, robots, OG, Twitter Card)
- Public/private boundary rules are explicit
- Auth handoff CTA design is specified
- Deferrals are explicit
- Relationship to B2C tracker unit 6 is reconciled
- No runtime files were modified in this unit
- Section 27 of B2C tracker is updated

---

## 28. Next Unit Recommendation

### Recommended immediate next unit

```
PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-IMPLEMENTATION-001
```

**Scope:** Implement Phase 1 only — standalone `/inquiry` page with `PUBLIC_INQUIRY` app state, supplier-context mode, reusing existing `POST /api/public/inquiry/submit` endpoint. No backend changes.

### Parallel deferred unit (Phase 2 prerequisite)

```
PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001
```

**Scope:** Design extended endpoint schema for general/multi-context inquiry (optional `supplier_slug`, add `source_surface`, `product_slug`, `category_slug`, `collection_slug`, `message`). Governs backend + OpenAPI changes. Not blocking Phase 1 implementation.

---

## 29. Commit Message

```
[TEXQTIC] governance: design public inquiry intent capture
```
