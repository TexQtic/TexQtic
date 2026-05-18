# PUBLIC-FACING-PAGES-SEQUENCE-DECISION-001
## Public-Facing Pages Sequence Decision

**Unit ID:** PUBLIC-FACING-PAGES-SEQUENCE-DECISION-001
**Family:** Public Attraction Layer Governance
**Status:** DECIDED
**Date:** 2026-05-18
**Authorized by:** Paresh
**Artifact class:** Governance decision — decision-only, no runtime changes
**Placement:** Repo root

---

## 1. Status Summary

| Field | Value |
|---|---|
| Unit ID | PUBLIC-FACING-PAGES-SEQUENCE-DECISION-001 |
| Status | DECIDED |
| Scope | Public-facing page sequencing after D2C public collections slice close |
| Prior state | D2C public collections public-surface slice: CLOSE-READY |
| Decision | Complete all public-facing pages first (B2C public family → Page 11/12 design → public SEO/domain strategy), then begin authenticated families |
| Runtime changes introduced | None |
| Schema changes introduced | None |
| API changes introduced | None |
| Blocking | None |

---

## 2. Current Repo Truth

### 2.1 Complete Public Route / App State Inventory

Confirmed by direct inspection of `App.tsx` (lines 1968–1987, 2013–2069, path resolution logic):

| Page | Path | App State | Component | Implementation Status |
|---|---|---|---|---|
| Public Entry / Home | `/` (neutral unauthenticated) | `PUBLIC_ENTRY` | (inline) | IMPLEMENTED |
| B2B Network / Discovery | state-backed | `PUBLIC_B2B_DISCOVERY` | `B2BDiscoveryPage` | IMPLEMENTED |
| Public Supplier Profile | `/supplier/:slug` | `PUBLIC_SUPPLIER_PROFILE` | `PublicSupplierProfile` | IMPLEMENTED |
| B2C Browse / Products | state-backed | `PUBLIC_B2C_BROWSE` | `B2CBrowsePage` | IMPLEMENTED |
| Public Product Detail | `/product/:slug` | `PUBLIC_PRODUCT_DETAIL` | `PublicProductDetail` | IMPLEMENTED |
| D2C Collections List | `/collections` | `PUBLIC_COLLECTIONS` | `PublicCollectionsStub` | IMPLEMENTED (5 static cards) |
| D2C Collection Detail | `/collections/:slug` (approved) | `PUBLIC_COLLECTION_DETAIL` | `PublicCollectionDetail` | IMPLEMENTED (5 approved slugs) |
| D2C Collection Unavailable | `/collections/:slug` (unknown) | `PUBLIC_COLLECTION_DETAIL_UNAVAILABLE` | `PublicCollectionUnavailable` | IMPLEMENTED (safe placeholder) |
| Trust & Origin Landing | `/trust` | `PUBLIC_TRUST_LANDING` | `PublicTrustLandingStub` | IMPLEMENTED |
| Public Passport Detail | `/passport/:id` | `PUBLIC_PASSPORT` | `PublicPassport` | IMPLEMENTED |
| Aggregator Preview | `/aggregator` | `PUBLIC_AGGREGATOR` | `PublicAggregatorPreview` | IMPLEMENTED (static preview) |
| Industry / Cluster Landing | `/industries` | `PUBLIC_INDUSTRY_CLUSTER_LANDING` | `PublicIndustryClusterLanding` | IMPLEMENTED |
| Referral Landing | `/join/:referral_code` | `PUBLIC_REFERRAL_LANDING` | `PublicReferralLanding` | IMPLEMENTED (contextual/campaign) |
| Page 11: Public Inquiry | none | none (no route/state) | none | PROPOSED — NOT IMPLEMENTED |
| Page 12: Auth Handoff Patterns | none (standalone) | none (no standalone route) | CTAs/Sign-in actions only | CONCEPT AS CTAs — NOT A STANDALONE PAGE |

**Source for Page 11 / Page 12 labels:** `governance/units/PUBLIC-PAGES-NAVBAR-IA-AUDIT-AND-DESIGN-001.md`, section 3 and section 9.

### 2.2 D2C Public Collections — Completed Slice (as of 2026-05-18)

Confirmed by D2C tracker section 17 (`TEXQTIC-D2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md`, section 17.3):

- `/collections` renders 5 approved public-safe collection cards from `config/publicCollectionsProjection.ts` (static config, no backend API).
- `/collections/:slug` for approved slugs (`natural-fabric-stories`, `garment-supply-chain-context`, `home-textiles-showcase`, `textile-services-ecosystem`, `technical-textiles-context`) renders `PublicCollectionDetail`.
- Unknown slugs render `PublicCollectionUnavailable`.
- Stage 1 SEO metadata implemented for all three states (`applyPublicPageMeta` in `App.tsx`): title, description, robots, canonical, OG, Twitter Card.
- Phase 1 DPP/trust linking: `trustContextMode: 'CONDITIONAL_PRODUCT_CONTEXT_ONLY'`; `collectionHasTrustContext: false` (fail-closed).
- CTA metadata formalized: `{ action: 'AUTH_CONTINUE', intent: 'COLLECTION_CONTINUATION', sourceSurface: 'COLLECTION_LIST', authRequired: true }`.
- Auth trigger: `openSecondaryAuthenticatedEntry('TENANT')` → TENANT modal in-place; URL stays on collection route.
- **Post-auth continuation: NOT IMPLEMENTED. Deferred to D2C-AUTHENTICATED-COLLECTION-CONTINUATION family.**
- No JSON-LD, no sitemap, no structured data. Deferred.

### 2.3 B2C Public Family — Current State

Confirmed by `governance/units/TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md`, sections 2–4, and direct App.tsx inspection:

- B2C browse (`/products` state-backed) and public product detail (`/product/:slug`) baselines: **VERIFIED CLOSED** (per B2C tracker).
- B2C frontend service (`services/publicB2CService.ts`): `GET /api/public/b2c/products`, `GET /api/public/b2c/products/:slug`.
- Backend projection (`server/src/services/publicB2CProjection.service.ts`): five-gate projection enforcing org_id, publication posture, B2C org_type, ACTIVE/VERIFICATION_APPROVED status, and strict public-safe fields.
- OpenAPI contract: `/api/public/b2c/products` and `/api/public/b2c/products/{slug}` documented in `shared/contracts/openapi.tenant.json`.
- **B2C category story pages: NOT IMPLEMENTED. Status: DESIGN_GATED** (per B2C tracker, unit `B2C-PUBLIC-CATEGORY-STORY-PAGES-DESIGN-001`).
- **B2C SEO metadata expansion: NOT IMPLEMENTED. Status: DESIGN_GATED** (per B2C tracker, unit `B2C-SEO-METADATA-EXPANSION-DESIGN-001`).
- **B2C inquiry handoff: NOT IMPLEMENTED. Status: DESIGN_GATED** (per B2C tracker, unit `B2C-PUBLIC-INQUIRY-HANDOFF-DESIGN-001`).
- **B2C category taxonomy alignment: NOT COMPLETED as formal unit** (per B2C tracker, unit `B2C-CATEGORY-TAXONOMY-ALIGNMENT-001`, status `READY_FOR_GOVERNANCE_ALIGNMENT`).
- Industry static config (`INDUSTRY-STATIC-CONFIG-001`) is closed; taxonomy vocabulary is available.
- B2C next ready units per tracker: `B2C-PUBLIC-BROWSE-BASELINE-SYNC-001` (READY_FOR_SYNC), `B2C-PRODUCT-DETAIL-BASELINE-SYNC-001` (READY_FOR_SYNC), `B2C-CATEGORY-TAXONOMY-ALIGNMENT-001` (READY_FOR_GOVERNANCE_ALIGNMENT).

### 2.4 Page 11 (Public Inquiry) — Current State

Confirmed by `governance/units/PUBLIC-PAGES-NAVBAR-IA-AUDIT-AND-DESIGN-001.md`, section 2 and section 9:

- **No `PUBLIC_INQUIRY` app state exists in `App.tsx`.**
- **No `/inquiry` public route mapping exists.**
- `submitPublicInquiry` function exists in `services/publicB2BService.ts` (used by `PublicSupplierProfile` for supplier-level inquiry), but this is not a standalone inquiry page or route.
- Backend endpoint `/api/public/inquiry/submit` is documented in `shared/contracts/openapi.tenant.json`.
- A standalone public inquiry page (Page 11) requires: dedicated route/app state, schema-governed context design, evidence-gated claim rules, and a dedicated implementation unit.
- **Status: PROPOSED — NOT IMPLEMENTED. Prerequisite: dedicated inquiry route/UX governance and schema-bound context design unit.**

### 2.5 Page 12 (Authenticated Handoff Patterns) — Current State

Confirmed by `governance/units/PUBLIC-PAGES-NAVBAR-IA-AUDIT-AND-DESIGN-001.md`, section 9:

- **No standalone `PUBLIC_HANDOFF` app state or `/handoff` route exists.**
- Auth handoff patterns exist as CTA/action behavior: Sign In buttons, Request Access links, `SUPPLIER_REQUEST_ACCESS_URL = 'https://texqtic.com/request-access'` in `App.tsx`.
- `openSecondaryAuthenticatedEntry('TENANT')` pattern is implemented for in-place TENANT modal.
- **Governance recommendation (from NAVBAR-IA-AUDIT-AND-DESIGN-001): Page 12 should not become a standalone public page; keep as CTA and action semantics.**
- **Status: CONCEPT IMPLEMENTED AS CTAs — standalone page not required or recommended.**

### 2.6 SEO Metadata Coverage by Route

| Route / State | title | description | canonical | robots | OG tags | Twitter Card | JSON-LD | Sitemap entry |
|---|---|---|---|---|---|---|---|---|
| `/collections` (PUBLIC_COLLECTIONS) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `/collections/:slug` (PUBLIC_COLLECTION_DETAIL) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `/collections/:slug` (unavailable) | ✅ | ✅ | ✅ | noindex | ✅ | ✅ | ❌ | ❌ |
| All other public routes | `document.title` only | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

- No `robots.txt` exists anywhere in the repo.
- No `sitemap.xml` exists anywhere in the repo.
- No JSON-LD structured data exists on any public route.
- `utils/publicPageMeta.ts` (introduced by `PUBLIC-SEO-INFRASTRUCTURE-DECISION-001` / commit `7818429`) implements the `applyPublicPageMeta` / `clearPublicPageMeta` pattern. This utility is usable by B2C and Page 11 routes with no new dependencies.
- SEO utility is available and tested for D2C surfaces. Extension to B2C surfaces is technically ready without infrastructure changes.

### 2.7 Marketing Website / Domain References in Repo

Confirmed by direct inspection of `App.tsx`, `middleware.ts`, `vercel.json`, `playwright.config.ts`, and `public/dpp/v1/context.jsonld`:

- `app.texqtic.com` is the production platform URL (Playwright base URL, `window.location.origin` in SEO canonical calls).
- `texqtic.com` appears in:
  - `SUPPLIER_REQUEST_ACCESS_URL = 'https://texqtic.com/request-access'` (`App.tsx` line 1999).
  - `middleware.ts` CORS allowlist: `texqtic.com`, `app.texqtic.com`, `www.texqtic.com`.
  - `public/dpp/v1/context.jsonld` JSON-LD context base URI: `https://texqtic.com/dpp/v1#`.
- `vercel.json`: SPA routing only — all non-API and non-filesystem paths route to `index.html`. No domain-specific redirects. No `texqtic.com` → `app.texqtic.com` redirect configured.
- **No marketing website code exists in this repo.** `texqtic.com` is referenced as an external domain only.
- **No DNS/domain configuration exists in this repo.**
- There is no evidence of a separate `texqtic.com` codebase in this workspace.

---

## 3. Problem Statement

The D2C public collections public-surface slice is close-ready as of 2026-05-18. Five collection routes are live with Stage 1 SEO metadata and Phase 1 DPP trust linking. The immediate question is: what is the next technically correct family to begin?

Three candidate paths exist:

1. **Authenticated continuation** — begin D2C authenticated collection continuation (post-auth collection context, collection-scoped RFQ/inquiry, private collection UX). This requires schema design, Prisma migrations, RLS review, and new authenticated app states. It is high-risk and primarily visible to logged-in users only. It does not expand the public attraction layer.

2. **Public-facing layer completion** — complete all remaining public-facing pages (B2C category story pages, Page 11 inquiry design/implementation) before beginning any authenticated work. This grows the publicly indexable surface, increases brand visibility, and creates a more complete public attraction layer before investing in authenticated complexity.

3. **Sitemap / indexing now** — implement sitemap/robots.txt/JSON-LD immediately against the current narrow public surface (D2C collections only). This is technically premature: B2C product pages and industry/trust/aggregator pages have no metadata yet; a collection-only sitemap would be incomplete and risk misleading search engine expectations about the site's scope.

The sequencing decision determines:
- Whether authenticated complexity is introduced before the public attraction layer is complete.
- Whether sitemap/indexing is done at optimal coverage or at a fragmented partial-surface moment.
- Whether the app public pages could eventually replace or supersede the existing `texqtic.com` marketing website.
- Whether B2C category story pages and Page 11 inquiry are addressed as a coherent public family before auth scope begins.

---

## 4. Decision Goals

1. **Complete the public attraction layer before adding authenticated complexity.** Authenticated families introduce schema, RLS, migration, and auth state risks that should not be interleaved with incomplete public surfaces.
2. **Maximize SEO surface area before investing in sitemap/indexing.** A sitemap covering only `/collections` routes creates fragmented search engine expectations when B2C product pages and category pages are coming next. Wait for broader public coverage.
3. **Preserve public/private boundary rigor.** Authenticated D2C and B2C families must not begin until their upstream public surface dependencies (category story pages, inquiry design) are closed or clearly deferred by explicit decision.
4. **Evaluate domain/marketing strategy only after public app surfaces are strong enough to serve as the brand landing experience.** Do not redirect or replace `texqtic.com` until B2C public pages and Page 11 are complete.
5. **Avoid authenticated scope creep into public families.** Page 12 (auth handoff) is already implemented as CTA patterns. It does not require a standalone page.

---

## 5. Options Considered

---

### Option A — Start D2C authenticated collection continuation now

**Description:** Begin design and implementation of post-auth collection context (authenticated collection detail, collection-scoped inquiry/RFQ, saved collections, private collection UX) as the next family.

**Technical readiness:** LOW
- Post-auth collection state requires new `AppState` values and routing logic in `App.tsx`.
- Requires schema design for authenticated collection objects (collection saves, inquiry context, private collection-level actions).
- Requires Prisma schema changes, migration, RLS review.
- `D2C-COLLECTION-SEMANTICS-DECISION-001` is closed (collection semantics decided), but the authenticated continuation design (`D2C-AUTHENTICATED-COLLECTION-CONTINUATION`) has not been started.
- Auth handoff infrastructure is in place (`openSecondaryAuthenticatedEntry('TENANT')`) but the post-auth routing for collection context is not designed.

**Dependencies:** D2C authenticated continuation design unit (not yet created), schema migration approval, B2C-D2C-BOUNDARY-DECISION-001.

**Implementation risk:** HIGH — schema changes, RLS, migration, new authenticated app states.

**Public/private boundary risk:** MEDIUM — authenticated surfaces must not leak collection semantics into public routes; handoff boundary must be preserved.

**Customer/demo value:** MEDIUM — only visible to logged-in users; does not grow the public attract layer.

**SEO implications:** None — authenticated surfaces are not indexed.

**Interaction with authenticated future units:** Opens the authenticated D2C family; would create pressure to also begin authenticated B2C family in parallel, increasing complexity.

**Verdict:** DEFER. Authenticated continuation must not begin while the public attraction layer is incomplete. B2C category story pages and inquiry surfaces (Page 11) are higher-value public investments for the current phase.

---

### Option B — Continue B2C public-family next

**Description:** Execute the B2C public family next: B2C baseline sync, category taxonomy alignment, category story pages design, and (later) category story page implementation.

**Technical readiness:** HIGH
- B2C browse and product detail baselines are verified closed.
- B2C tracker (`TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md`) exists with a ready implementation queue.
- Next B2C units are immediately executable: `B2C-PUBLIC-BROWSE-BASELINE-SYNC-001` (READY_FOR_SYNC), `B2C-CATEGORY-TAXONOMY-ALIGNMENT-001` (READY_FOR_GOVERNANCE_ALIGNMENT).
- Industry taxonomy vocabulary is available (`INDUSTRY-STATIC-CONFIG-001` closed).
- `applyPublicPageMeta` SEO utility is available and tested; extension to B2C product/category pages requires no new infrastructure.

**Dependencies:** Industry taxonomy vocabulary (available). No schema changes needed for baseline sync and taxonomy alignment.

**Implementation risk:** LOW for baseline sync and taxonomy alignment; MEDIUM for category story pages design (must define page IA, claim boundaries, SEO ownership).

**Public/private boundary risk:** LOW — B2C browse/detail public boundaries are well-governed; category story pages extend the same projection/boundary model.

**Customer/demo value:** HIGH — product browse and category storytelling are the primary public discovery and brand channels. Completing B2C public surfaces creates the most immediate public-facing value.

**SEO implications:** HIGH value — B2C product pages and category pages are primary textile industry search targets; completing their metadata coverage and adding story content maximizes indexable surface.

**Interaction with authenticated future units:** B2C category story pages and inquiry design must be complete (or formally deferred) before B2C authenticated inquiry handoff is valuable. Completing B2C public first creates a clean basis for future B2C authenticated continuation.

**Verdict:** STRONG CANDIDATE. B2C public family is technically ready and provides the highest near-term public attraction value.

---

### Option C — Complete pending Page 11 / Page 12 next

**Description:** Design and implement the public inquiry page (Page 11) and/or formalize authenticated handoff patterns (Page 12) as standalone pages before doing B2C category story work.

**Technical readiness:**
- **Page 11 (Public Inquiry):** LOW. No route, no app state, no schema-governed inquiry context design exists. A standalone inquiry page requires: dedicated route in `App.tsx`, inquiry context schema definition, evidence-gated claim rules, and a full design and implementation unit. The supplier-level `submitPublicInquiry` exists but covers only supplier profile context — not a general product/category/collection inquiry surface.
- **Page 12 (Auth Handoff):** NOT APPLICABLE as a new standalone page. Governance recommendation from `PUBLIC-PAGES-NAVBAR-IA-AUDIT-AND-DESIGN-001` is explicit: "Page 12: keep as CTA and action semantics; do not expose as a standalone public page." The handoff pattern is already implemented.

**Dependencies:** Page 11 requires B2C category story page design to define which contexts pass into the inquiry surface (product, category, supplier, collection). Starting Page 11 before B2C category pages creates a decontextualized inquiry surface.

**Implementation risk:** MEDIUM for Page 11 (inquiry schema risk; over-capture of buyer intent is a governance concern per B2C tracker). LOW for Page 12 (no action needed).

**Public/private boundary risk:** MEDIUM — inquiry payload schema must not over-capture buyer intent or expose private RFQ fields; this requires explicit schema-governed design before implementation.

**Customer/demo value:** MEDIUM — inquiry closes the "interested buyer" loop but is most valuable when the category context that generates inquiry interest is already complete (B2C category story pages).

**SEO implications:** Page 11 could be a low-authority inquiry landing page; not a primary SEO target. Page 12 not relevant.

**Interaction with authenticated future units:** Page 11 inquiry context is a prerequisite input for future authenticated B2C inquiry handoff design. Best done after B2C category story pages establish the context scope.

**Verdict:** SEQUENCE AFTER B2C CATEGORY STORY PAGES. Page 11 design should begin after B2C category alignment is complete and the inquiry context scope is defined. Page 12 requires no new unit.

---

### Option D — Start sitemap / indexing next

**Description:** Implement `sitemap.xml`, `robots.txt`, JSON-LD structured data, and sitemap submission strategy as the next work stream.

**Technical readiness:** LOW
- Only D2C collection routes (`/collections`, `/collections/:slug`) have per-page metadata (title, description, canonical, robots, OG, Twitter Card).
- No metadata exists on B2C product pages, B2B discovery, industry/trust/aggregator/supplier profile pages.
- A sitemap covering only D2C collection routes would represent a small fraction of the planned public surface area.
- `robots.txt` does not exist; JSON-LD structured data does not exist; no sitemap generation infrastructure exists.

**Dependencies:** Broader public metadata coverage is required before sitemap strategy is valid. B2C category pages, Page 11, and other public routes need metadata before sitemap inclusion is meaningful.

**Implementation risk:** LOW to MEDIUM — sitemap generation is not complex, but premature sitemap submission risks signaling an incomplete site scope to search engines and creating canonical inconsistencies when B2C and Page 11 routes are added later.

**Public/private boundary risk:** LOW.

**Customer/demo value:** LOW — a collection-only sitemap has minimal immediate SEO benefit. Full-surface sitemap (including B2C product, category, and inquiry routes) is the real SEO milestone.

**SEO implications:** Premature sitemap risks misleading crawlers about the site's full scope. Waiting for B2C public completion before sitemap submission is the safer and more effective strategy.

**Interaction with authenticated future units:** None — sitemap covers public routes only.

**Verdict:** DEFER. Sitemap and indexing strategy should be revisited after B2C public pages and Page 11 are complete, creating a meaningful full-surface sitemap.

---

### Option E — Staged public-facing page completion sequence: B2C public → Page 11/12 design → public SEO/indexing/domain strategy → authenticated families

**Description:** Complete all public-facing pages in sequence before beginning authenticated continuation. B2C public family first, then Page 11 (Public Inquiry) design and implementation, then domain/SEO/indexing strategy across the full public surface, then authenticated D2C and B2C.

**Technical readiness:** HIGH for the sequence overall.
- B2C: READY (trackers, baseline sync units, taxonomy alignment all ready).
- Page 11: DESIGN_GATED — starts with design unit; no runtime work until design is closed.
- Domain/SEO strategy: DECISION_ONLY — addressable once public surface is complete.
- Authenticated D2C/B2C: blocked until public families are complete; block is deliberate.

**Dependencies:** Sequential — each family gates the next for quality reasons, not technical blocking. B2C category story pages create the inquiry context for Page 11. Page 11 informs the full inquiry surface before sitemap inclusion. Full public surface completion informs domain canonical strategy.

**Implementation risk:** LOW at each stage — additive public work; no schema changes until authenticated scope begins.

**Public/private boundary risk:** LOW — public attraction layer only; no authenticated surface work creates private leakage risk.

**Customer/demo value:** VERY HIGH — completing the public attraction layer creates a coherent, fully-indexed public presence: product browse, category stories, collections, inquiry entry, and clear brand identity.

**SEO implications:** HIGHEST VALUE — B2C category pages and inquiry page (Page 11) add the most SEO-relevant surface area. Comprehensive sitemap after full public completion is the correct timing.

**Interaction with authenticated future units:** Authenticated families start from a stronger public foundation. Auth handoff patterns are already implemented as CTAs; the authenticated families begin on a clean, fully-indexed public surface.

**Verdict:** RECOMMENDED. This is the technically correct and most value-generating sequence.

---

## 6. Recommended Sequence Decision

**Decision: Option E — Staged public-facing page completion sequence.**

Execute public-facing families in this exact order:

### Stage 1: B2C Public Family (Immediate — current next)

1. `B2C-PUBLIC-BROWSE-BASELINE-SYNC-001` — Reconfirm and lock B2C browse baseline against taxonomy and current boundary state. (READY_FOR_SYNC)
2. `B2C-PRODUCT-DETAIL-BASELINE-SYNC-001` — Reconfirm product detail baseline and safe unavailable behavior. (READY_FOR_SYNC)
3. `B2C-CATEGORY-TAXONOMY-ALIGNMENT-001` — Align all B2C category and material vocabulary to approved industry taxonomy. (READY_FOR_GOVERNANCE_ALIGNMENT)
4. `B2C-PUBLIC-CATEGORY-STORY-PAGES-DESIGN-001` — Design B2C category storytelling IA, claim boundaries, and SEO ownership. (DESIGN_GATED — opens after taxonomy alignment)
5. `B2C-PUBLIC-CATEGORY-STORY-PAGES-IMPLEMENTATION-001` — Implement approved B2C category story pages. (BLOCKED_ON_DESIGN)
6. `B2C-DPP-PASSPORT-LINKAGE-SYNC-001` — Synchronize B2C trust and passport language with conditional data truth. (READY_FOR_SYNC — may run in parallel with taxonomy alignment)
7. `B2C-SEO-METADATA-EXPANSION-DESIGN-001` — Design B2C route-level SEO metadata model and ownership. (DESIGN_GATED — after SEO foundation)
8. `B2C-SEO-METADATA-EXPANSION-IMPLEMENTATION-001` — Implement approved B2C SEO metadata using existing `applyPublicPageMeta` utility. (BLOCKED_ON_DESIGN)

### Stage 2: Page 11 — Public Inquiry (Follows B2C category story completion)

1. **PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-DESIGN-001** (or equivalent unit) — Design the standalone public inquiry page: route/app state, inquiry context schema, evidence-gated claim rules, taxonomy-aligned content categories, boundary rules.
2. **PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-IMPLEMENTATION-001** — Implement approved public inquiry page with `submitPublicInquiry` endpoint integration and schema-governed context fields.

**Page 12 treatment:** No new unit required. Auth handoff is already implemented as CTA semantics. If a standalone Page 12 is desired, it requires a separate dedicated decision unit before any design work begins. Current recommendation: omit as a standalone page.

### Stage 3: Public SEO / Sitemap / Domain Strategy (Follows Page 11 completion)

1. **PUBLIC-SEO-SITEMAP-STRATEGY-DECISION-001** (or `SEO-SITEMAP-METADATA-STRUCTURED-DATA-001` per trackers) — Decide sitemap/robots.txt/JSON-LD strategy across the full public surface.
2. **PUBLIC-SITEMAP-IMPLEMENTATION-001** — Implement `sitemap.xml`, `robots.txt`, and selected JSON-LD schemas.
3. **PUBLIC-COLLECTION-SITEMAP-INDEXING-DECISION-001** — Decide collection-specific indexing rules (currently registered as decision-gated in D2C tracker; revisit here once sitemap strategy is decided for the full surface).
4. **DOMAIN-CANONICAL-STRATEGY-DECISION-001** — Decide `texqtic.com` vs `app.texqtic.com` canonical treatment after full public surface is live and strong.

### Stage 4: Authenticated D2C and B2C Families (Follows Stage 3)

- D2C-AUTHENTICATED-COLLECTION-CONTINUATION family (design → implementation).
- B2C-AUTHENTICATED-INQUIRY-HANDOFF family (design → implementation).
- Auth handoff governance must not open until public stages are fully closed.

---

## 7. Marketing Website / Domain Strategy

**Decision: Evaluate only — do not implement any changes.**

### 7.1 Current Domain Reality (from repo inspection)

- Production app: `app.texqtic.com` — Vite SPA, all public and authenticated surfaces.
- `texqtic.com` references in repo: request-access URL (`App.tsx`), CORS allowlist (`middleware.ts`), DPP JSON-LD context base URI (`public/dpp/v1/context.jsonld`).
- `vercel.json`: SPA routing only; no `texqtic.com → app.texqtic.com` redirect configured.
- No `texqtic.com` marketing website code exists in this repository.
- DNS/domain configuration is external to this repo.

### 7.2 Options Evaluated

**Option M1 — Leave texqtic.com as-is indefinitely.**
- Risk: Visitors to `texqtic.com` reach an external marketing site that may diverge from the app brand experience.
- Benefit: No risk, no action needed.

**Option M2 — Replace texqtic.com content with the app public pages immediately.**
- Risk: Premature — B2C category story pages and inquiry pages are not yet implemented. The current public surface (collections list + product browse) is not yet rich enough to serve as the brand's primary marketing surface.
- Verdict: NOT YET. Public surface must be complete first.

**Option M3 — Make app.texqtic.com canonical and let texqtic.com link in.**
- Benefit: Brand root domain preserved; app becomes the canonical experience.
- Risk: Requires explicit canonical URL decisions on all public routes; `texqtic.com` must redirect consistently.
- Feasibility: Requires DNS change (external to repo) and `vercel.json` update (allowlisted separately). Not appropriate before public surface completion.
- Verdict: DEFERRED — evaluate after Stage 2 (Page 11) is complete.

**Option M4 — Serve app public pages under texqtic.com (same domain as app).**
- Benefit: Eliminates subdomain split; texqtic.com becomes the full platform URL.
- Risk: High migration complexity (DNS, Supabase auth configuration, CORS, Vercel config, all app URL references, Playwright config, SEO canonicals). Auth flows and Supabase may be coupled to `app.texqtic.com`.
- Verdict: LONG-TERM OPTION — requires a dedicated infrastructure planning unit. Not a near-term action.

**Option M5 — texqtic.com becomes a shell redirecting to app.texqtic.com public pages.**
- Benefit: Simple and safe; preserves `texqtic.com` as a brand/root anchor.
- Risk: Requires DNS-level redirect (external to repo) and `vercel.json` 301 route (within repo).
- Verdict: PREFERRED LONG-TERM DIRECTION — but not until app public pages are strong enough to fully replace marketing site content (i.e., after Stage 2).

### 7.3 Recommended Domain Decision

**Do not change texqtic.com behavior now.** The public app surfaces are not yet complete enough to replace a marketing website experience.

**Staged approach (decision-only, not implementation):**
1. Complete B2C public family (Stage 1) — product storytelling, category pages.
2. Complete Page 11 inquiry (Stage 2) — inquiry entry point.
3. Then evaluate Option M3 or M5: configure a `texqtic.com → app.texqtic.com` canonical redirect or shell redirect once the app public pages represent a complete brand marketing experience.
4. A dedicated **DOMAIN-CANONICAL-STRATEGY-DECISION-001** unit should be created at the start of Stage 3 to evaluate and formalize this transition.

**Short-term constraints:**
- Do not remove or modify the `SUPPLIER_REQUEST_ACCESS_URL` (`https://texqtic.com/request-access`) without verifying the target page still exists.
- Do not change `middleware.ts` CORS allowlist entries without explicit infrastructure review.
- Do not modify `public/dpp/v1/context.jsonld` base URI without a versioned DPP governance review.

---

## 8. Sitemap and Indexing Position

**Decision: PUBLIC-COLLECTION-SITEMAP-INDEXING-DECISION-001 remains PENDING.**

### 8.1 Rationale

Current SEO metadata coverage:
- D2C collection routes: Stage 1 metadata complete (title, description, canonical, robots, OG, Twitter Card).
- All other public routes: no metadata beyond `document.title`.

Implementing a sitemap now would cover only D2C collection routes. B2C product pages, B2C category story pages, industry/trust/aggregator/supplier profile pages, and Page 11 inquiry are all coming as the next public families. A collection-only sitemap creates an artificially narrow signal to search engine crawlers and would need to be replaced (not just extended) after B2C pages are live.

**Technically, implementing sitemap before broader public metadata coverage is in place is wasteful and potentially misleading for search engines.**

### 8.2 Sitemap Sequencing Decision

| Sitemap stage | Trigger | Notes |
|---|---|---|
| PUBLIC-COLLECTION-SITEMAP-INDEXING-DECISION-001 | Remains PENDING | Revisit after B2C and Page 11 surfaces are complete |
| `sitemap.xml` implementation | After B2C category story + Page 11 + full metadata coverage | Full-surface sitemap is correct scope |
| `robots.txt` implementation | May be done as part of sitemap unit or separately | Currently absent from repo |
| JSON-LD structured data | Post-sitemap; strategy decided in SEO/domain stage | Currently absent from repo |
| Search console submission | After sitemap is live and validated | External action; out of repo scope |

### 8.3 Collection Indexing Status

- `/collections`: `robots: index, follow` (conditional on at least one AVAILABLE record — currently true).
- `/collections/:slug` (approved slugs): `robots: index, follow`.
- `/collections/:slug` (unknown slugs): `robots: noindex, nofollow`.
- **Collection indexing rollout gate** (per `D2C-COLLECTION-SEO-GOVERNANCE-001`): decision-gated on Paresh approval. Current state has 5 approved slugs indexable. No change to indexing policy until `PUBLIC-COLLECTION-SITEMAP-INDEXING-DECISION-001` is executed.

---

## 9. Authenticated Family Deferral

**Decision: Defer all authenticated D2C and B2C family work until public-facing pages are complete.**

### 9.1 Basis

- D2C authenticated collection continuation requires schema design, Prisma schema changes, RLS review, and new authenticated `AppState` values. These dependencies are not met and should not be rushed while the public attraction layer is incomplete.
- B2C authenticated inquiry handoff (`B2C-PUBLIC-INQUIRY-HANDOFF-DESIGN-001`) depends on B2C category story pages defining the inquiry context scope. Premature inquiry handoff design risks decontextualized schema choices.
- The auth handoff infrastructure (`openSecondaryAuthenticatedEntry('TENANT')`, TENANT modal) is already in place. The authenticated continuation just has nowhere to go yet. Building the authenticated surface before the public surface means authenticated users will be dropped into an incomplete experience.
- Every new authenticated unit introduces private data boundary risk. Maximizing public-surface completeness before opening authenticated scope is the safest sequencing posture.

### 9.2 Deferred Authenticated Units

| Unit | Status | Gate |
|---|---|---|
| D2C-AUTHENTICATED-COLLECTION-CONTINUATION (design) | DEFERRED | After D2C public slice close + B2C public family complete |
| D2C-AUTHENTICATED-COLLECTION-CONTINUATION (implementation) | DEFERRED | After design |
| B2C-PUBLIC-INQUIRY-HANDOFF-DESIGN-001 | DEFERRED | After B2C category story pages complete (context scope defined) |
| B2C-PUBLIC-INQUIRY-HANDOFF-IMPLEMENTATION-001 | DEFERRED | After design |
| D2C-EARLY-ACCESS-AUTH-HANDOFF-IMPLEMENTATION-001 | DEFERRED | After all D2C public families + authenticated design |

---

## 10. Immediate Next Unit

**Recommended immediate next unit:**

```
B2C-PUBLIC-BROWSE-BASELINE-SYNC-001
```

**Rationale:**
- READY_FOR_SYNC per `TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md`.
- No design gates or schema dependencies.
- Reconfirms and locks the current B2C browse baseline against the updated taxonomy and boundary state (industry static config is now closed and available).
- Creates a clean governance sync point before B2C category taxonomy alignment and story pages design begin.
- Immediately executable without any upstream approvals.

**Alternative: run B2C baseline sync units together.**

The two immediate B2C baseline sync units (`B2C-PUBLIC-BROWSE-BASELINE-SYNC-001` and `B2C-PRODUCT-DETAIL-BASELINE-SYNC-001`) are both READY_FOR_SYNC and may be executed as a combined unit or sequentially in rapid succession. Either approach is acceptable.

**Subsequent unit:** `B2C-CATEGORY-TAXONOMY-ALIGNMENT-001`.

---

## 11. Deferred Units

| Unit | Deferral Reason | Revisit Gate |
|---|---|---|
| PUBLIC-COLLECTION-SITEMAP-INDEXING-DECISION-001 | B2C public and Page 11 surfaces not yet complete | After Stage 2 completion |
| SEO-SITEMAP-METADATA-STRUCTURED-DATA-001 | Full public surface needed for valid scope | After Stage 2 completion |
| DOMAIN-CANONICAL-STRATEGY-DECISION-001 | App public pages not yet strong enough to replace marketing site | After Stage 3 starts |
| D2C-AUTHENTICATED-COLLECTION-CONTINUATION (design) | Public attraction layer incomplete | After Stage 1 + Stage 2 |
| D2C-AUTHENTICATED-COLLECTION-CONTINUATION (implementation) | Design not yet created | After design |
| B2C-PUBLIC-INQUIRY-HANDOFF-DESIGN-001 | Category story context not defined | After B2C category story pages complete |
| B2C-PUBLIC-INQUIRY-HANDOFF-IMPLEMENTATION-001 | Design not yet created | After design |
| B2C-D2C-BOUNDARY-DECISION-001 | Not blocking immediate B2C baseline sync and taxonomy alignment | After B2C category alignment + D2C semantics confirmed stable |
| D2C-ORIGIN-STORYTELLING-GOVERNANCE-001 | Already closed (ed11a5d) | N/A — CLOSED |
| PUBLIC-DPP-COLLECTION-LINKING-DESIGN-001 | Already closed (36b612e) | N/A — CLOSED |
| JSON-LD structured data | Deferred per D2C close | After sitemap decision |
| robots.txt | No sitemap strategy yet | After SEO/sitemap stage |

---

## 12. Public / Private Boundary

The following boundary rules apply to the recommended public-facing page sequence:

### Allowed in Stage 1 (B2C public family)
- Product slug, product name, public-safe image data.
- Public-safe category, material, fabricType context.
- Public supplier name, supplier slug, jurisdiction context.
- Category storytelling copy aligned to approved industry taxonomy.
- Trust/passport availability language (conditional only; `hasPassport` gate preserved).
- Public-safe product preview and storytelling copy.
- SEO metadata using existing `applyPublicPageMeta` utility.

### Forbidden in Stage 1
- Private tenant/org/user/internal identifiers in any public component.
- Private supplier records, documents, or pricing.
- Buyer intent payloads or RFQ private fields.
- Universal DPP/passport coverage claims.
- Cart/checkout/wishlist/order implementation on public pages.
- AI/vector output exposure.
- Aggregator intelligence internals.
- Unsupported origin, cluster, or certification claims.

### Allowed in Stage 2 (Page 11 — Public Inquiry)
- Context-scoped inquiry fields: product/category/collection context identifiers (public-safe).
- Inquiry category selection (bounded vocabulary per `PublicInquiryCategory` type).
- Anonymous inquiry submission (no PII capture, per `public-supplier-profile-inquiry.test.tsx` PSI-007 precedent).
- Contact information only if explicitly in schema-governed inquiry design unit.

### Forbidden in Stage 2
- Buyer identity linking without explicit schema approval.
- Private RFQ payload fields.
- Pre-populated private intent from authenticated sessions.
- Inquiry submission result exposing private supplier data.

### Permanent public/private boundary
- `org_id` must never appear in any public surface — not in URL, not in metadata, not in component state.
- Authenticated continuation is accessible via TENANT modal only; no auth state is visible in public page routes or metadata.
- Page 12 (auth handoff) exists only as CTA actions; no standalone route or page is authorized.

---

## 13. Acceptance Criteria

This decision is complete only if all of the following are true:

| Criterion | Status |
|---|---|
| Current repo truth is documented (routes, states, components) | ✅ Documented in section 2 |
| D2C public collections slice status confirmed as close-ready | ✅ Confirmed in sections 1 and 2.2 |
| B2C public family current state documented | ✅ Documented in section 2.3 |
| Page 11 current state documented (no route/state exists) | ✅ Documented in section 2.4 |
| Page 12 current state documented (CTAs only; no standalone page) | ✅ Documented in section 2.5 |
| SEO metadata coverage by route documented | ✅ Documented in section 2.6 |
| Marketing/domain references documented | ✅ Documented in section 2.7 |
| Options A–E compared on technical readiness, risk, value, SEO | ✅ Section 5 |
| Best technical sequence selected and justified | ✅ Section 6 |
| Marketing/domain strategy addressed at decision level only | ✅ Section 7 |
| Sitemap/indexing position recorded as PENDING | ✅ Section 8 |
| Authenticated family deferral decision recorded | ✅ Section 9 |
| Immediate next unit named and justified | ✅ Section 10 |
| Deferred units listed with gates | ✅ Section 11 |
| Public/private boundary rules stated | ✅ Section 12 |
| No runtime changes made | ✅ Decision-only artifact |

---

## Adjacent Findings

The following findings were identified during repo-truth inspection. They are recorded here only; no fixes are included in this unit.

| Finding | Classification | Notes |
|---|---|---|
| B2C tracker's description of D2C state is now outdated (refers to stub-only collections; D2C public slice is now complete) | implementation-ready | Tracker should be updated in a B2C tracker sync unit as part of B2C baseline sync |
| `SUPPLIER_REQUEST_ACCESS_URL` hardcodes `https://texqtic.com/request-access`; no fallback if that page is removed | decision-gated | Domain strategy decision should evaluate this reference; do not change before DOMAIN-CANONICAL-STRATEGY-DECISION-001 |
| No `robots.txt` exists in `public/` | decision-gated | Blocked on sitemap/indexing strategy; record in SEO stage |
| `applyPublicPageMeta` utility is only called for D2C collection states; other public routes have no metadata management | design-gated | Resolved in B2C SEO metadata expansion design unit |
| `B2C-CATEGORY-TAXONOMY-ALIGNMENT-001` has no formal governance artifact yet despite being listed as READY | implementation-ready | Should be the third B2C unit executed; tracker entry is sufficient anchor |
| `B2C-D2C-BOUNDARY-DECISION-001` is listed as DECISION_GATED in both trackers but has no dedicated decision artifact | decision-gated | Not blocking immediate B2C baseline sync; create before collection semantics expansion |
| Page 12 standalone page risk: future units must not accidentally create a `/handoff` public route | verification-gated | Confirm during each public Page 12-adjacent unit that no standalone route is introduced |
| `PublicCollectionDetail` is imported in `App.tsx` alongside the new `PUBLIC_COLLECTION_DETAIL` state; the old `PUBLIC_COLLECTION_DETAIL_UNAVAILABLE` path for unknown slugs and the new `PUBLIC_COLLECTION_DETAIL` for approved slugs both use `getCollectionBySlug`; the D2C tracker confirms this is correct — not a finding | N/A | No action |

---

*Governance artifact — decision-only. No runtime changes. Artifact class: PUBLIC-FACING-PAGES-SEQUENCE-DECISION-001.*
*Date: 2026-05-18. Authorized by Paresh.*
