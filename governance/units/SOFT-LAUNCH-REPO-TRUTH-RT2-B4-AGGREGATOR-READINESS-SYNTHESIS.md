---
unit_id: SOFT-LAUNCH-REPO-TRUTH-RT2-B4-AGGREGATOR-READINESS-SYNTHESIS
title: RT2-B4 — Aggregator Directory Soft-Launch Readiness Synthesis
type: SYNTHESIS
status: COMPLETE
date: 2026-05-21
commit_basis: 7a6e61095af9c5bff5e2d66e51d8dd6ddc00742a
authorized_by: Paresh Patel
---

# RT2-B4 — Aggregator Directory Soft-Launch Readiness Synthesis

**Unit:** `SOFT-LAUNCH-REPO-TRUTH-RT2-B4-AGGREGATOR-READINESS-SYNTHESIS`  
**Packet:** RT2 final — Soft Launch Repo Truth: Directory & Public Surface Readiness  
**Sequence:** RT2-A → RT2-B1 → RT2-B2 → RT2-B3 → **RT2-B4 (synthesis)**  
**Author:** Paresh Patel  
**Date:** 2026-05-21  
**Type:** Synthesis — no new source inspection; all findings drawn from RT2-A through RT2-B3  
**Status:** COMPLETE

---

## TLRH (Too Long Read Here)

- **Overall aggregator directory posture:** `IMPLEMENTED_DATA_EMPTY` — all architectural layers are in place for B2B supplier discovery and supplier profile access; the pipeline is empty because no B2B-public-eligible supplier data is provisioned.
- **The real B2B aggregator directory surface is `B2BDiscoveryPage`** — not `/products`. `/products` is B2C public storefront browse; it projects B2C org suppliers only (`org_type = 'B2C'`). The two surfaces use separate projection services with separate gates.
- **`/aggregator` is a static entry stub** — it renders a marketing landing page with no data fetch. It is confirmed NOT a directory discovery surface.
- **`/supplier/:slug` is the strongest surface** — `IMPLEMENTED_TEST_COVERED` with full 5-gate projection, inline inquiry form, and bookmarkable URL. FAM-09 claims `NOT_ASSESSED` but repo truth shows substantially complete implementation.
- **P1 soft-launch blocker for real buyer outreach: FTR-B2C-004** — inquiry endpoint writes audit log only; no SMTP or supplier notification is in place. Buyers can submit inquiries; suppliers will not know.
- **P0 prerequisite: zero B2B-public-eligible supplier data in production.** No B2B supplier will appear in any directory surface until ≥1 supplier is provisioned and posture-assigned.
- **`source_surface` attribution gap (P2):** Both supplier-context inquiry paths submit without `source_surface`; backend normalizes to `'DIRECT'`. Analytics gap only, not a functional blocker.
- **Governance drift:** Five confirmed drift items across RT2 — "aggregator directory" terminology conflates B2C and B2B surfaces; `/aggregator` PRODUCTION_VERIFIED claim is based on wrong unit closure; `B2BDiscoveryPage` absent from Q4 minimum checklist; FAM-09 understates supplier profile readiness; `'SUPPLIER_PROFILE'` source surface value is defined but never emitted.

**This artifact is part of the TexQtic Launch Readiness Hub repo-truth audit record.**

---

## §1 Header and Authority Boundary

### 1.1 Unit scope

RT2-B4 is a synthesis packet. It draws exclusively from the four RT2 input artifacts below. No new source files were read for this packet. Findings are synthesized into a consolidated readiness definition, a classification table, a buyer outreach blocker assessment, and governance drift summary.

**Synthesis inputs:**

| Artifact | Commit | Surfaces covered |
|---|---|---|
| RT2-A | `dff24404` | `/products`, `/product/:slug`, `/aggregator` |
| RT2-B1 | `971743c` | `/supplier/:slug` |
| RT2-B2 | `3672be3` | `B2BDiscoveryPage` / `PUBLIC_B2B_DISCOVERY` |
| RT2-B3 | `a654b84` | Directory inquiry attachment (all 5 surfaces + `/inquiry` model) |

### 1.2 Authority order

1. RT2-A through RT2-B3 artifacts — all findings are carried forward as accepted repo truth
2. Prior TLRH governance docs — secondary comparison for drift identification only
3. This artifact — synthesis and gate assessment only; no new findings

### 1.3 Boundary statement

This packet does **not**:
- Re-inspect source code
- Modify any source, test, schema, env, config, or data file
- Update TLRH indexes, Layer 0 docs, launch-readiness docs, or governance source registers
- Authorize any implementation work
- Open any family cycle

---

## §2 TLRH Storage Note

This artifact is stored under `governance/units/` per the storage rule established in `TEXQTIC-LAUNCH-READINESS-HUB-ARTIFACT-INVENTORY-001.md §6`. All future RT artifacts must follow the same naming convention and header format.

---

## §3 Git / Worktree Truth

```
git status --short     → (empty — clean worktree at synthesis creation)
git rev-parse HEAD     → 7a6e61095af9c5bff5e2d66e51d8dd6ddc00742a
```

**Worktree:** CLEAN  
**HEAD commit:** `7a6e610` — `[TEXQTIC] docs: inventory launch readiness hub audit artifacts` (INVENTORY-001)

---

## §4 Input Artifacts Reviewed

### 4.1 RT2-A — Aggregator Directory Route and Data Source Audit

**Commit:** `dff24404`  
**Key findings carried forward:**
- `/products` = `PUBLIC_B2C_BROWSE` — B2C public storefront browse (Gate C: `org_type = 'B2C'`). Full stack implemented. `IMPLEMENTED_DATA_EMPTY`.
- `/product/:slug` = `PUBLIC_PRODUCT_DETAIL` — B2C product detail. Full stack implemented. FAM-01 VERIFIED_COMPLETE. `IMPLEMENTED_DATA_EMPTY`.
- `/aggregator` = `PUBLIC_AGGREGATOR` — static marketing/entry stub. No data fetch. No API call. `NOT_IMPLEMENTED` as a directory discovery surface.
- `B2BDiscoveryPage` (`PUBLIC_B2B_DISCOVERY`) — has no dedicated URL; noted as §4.4 finding, deferred to RT2-B2.
- Naming inconsistency confirmed: governance docs use "aggregator directory" loosely to mean the public discovery platform including B2C browse; code sharply separates B2C (Gate C: `org_type = 'B2C'`) from B2B (`org_type = 'B2B'`) into separate projection services.

### 4.2 RT2-B1 — Supplier Profile Route Repo Truth Audit

**Commit:** `971743c`  
**Key findings carried forward:**
- `/supplier/:slug` = `IMPLEMENTED_TEST_COVERED`. Full stack: route, 5-gate projection service, frontend component with hero/snapshot/trust-signals/value-chain/offering-preview/inquiry form/auth handoff.
- Bookmarkable URL. Clean empty state (graceful 404 page).
- INQUIRY-004 inline form embedded — always rendered when profile loads.
- `source_surface` attribution gap: form submits without `source_surface`; backend normalizes to `'DIRECT'`.
- 8 backend projection tests + 8 frontend inquiry tests + 12 backend inquiry tests.
- Frontend profile component (non-inquiry) has no unit test coverage.
- FAM-09 status `NOT_ASSESSED` — understates actual implementation depth.

### 4.3 RT2-B2 — B2B Discovery Surface Repo Truth Audit

**Commit:** `3672be3`  
**Key findings carried forward:**
- `B2BDiscoveryPage` / `PUBLIC_B2B_DISCOVERY` = `IMPLEMENTED_DATA_EMPTY`.
- Full stack: route, 5-gate projection (`listPublicB2BSuppliers`), frontend component with hero/search/5-dimension client-side filtering/category cards/results grid/buyer CTAs/safety notice.
- **No dedicated URL** — page is reached only via `setAppState('PUBLIC_B2B_DISCOVERY')`; URL bar remains at whatever state it was last set to (typically `/`).
- "View Public Profile" navigates via `window.location.assign('/supplier/${slug}')` — supplier profiles ARE bookmarkable.
- No inline inquiry form on directory surface. Inquiry deferred to individual supplier profile.
- 10 backend unit tests (projection gates, shape, prohibited fields, pagination, offering cap).
- No frontend component tests; no route-level endpoint tests.
- No-URL finding: soft-launch personal outreach UX/marketing limitation, not a functional blocker.

### 4.4 RT2-B3 — Directory Inquiry Attachment Audit

**Commit:** `a654b84`  
**Key findings carried forward:**
- Overall inquiry attachment classification: `PARTIAL` (2 of 5 surfaces have an inquiry entry point).
- `/supplier/:slug` — inline form (INQUIRY-004). `source_surface` gap: `'DIRECT'` stored instead of `'SUPPLIER_PROFILE'`.
- `/product/:slug` — hard-nav CTA to `/inquiry?productSlug=...&sourceSurface=PRODUCT_DETAIL`. Attribution CORRECT. No dedicated component test for the CTA.
- `/products`, `/aggregator`, `B2BDiscoveryPage` — no inquiry form or CTA.
- Inquiry endpoint `POST /api/public/inquiry/submit` — `PRODUCTION_VERIFIED` (FAM-03). Audit log capture working. **No SMTP/email delivery** — FTR-B2C-004 `NOT_STARTED`.
- PII safety confirmed across all surfaces and backend pipeline.
- 27 backend inquiry tests; 8 supplier profile inquiry frontend tests; 25 inquiry page frontend tests.
- `'SUPPLIER_PROFILE'` is a valid value in `VALID_SOURCE_SURFACES` but is never emitted by any current code path.

---

## §5 Consolidated RT2 Classification Table

Full surface-by-surface classification derived from all four RT2 input artifacts:

| Surface | Route | App State | Classification | Data state | Inquiry entry | source_surface | Tests |
|---|---|---|---|---|---|---|---|
| B2C Product Browse | `/products` | `PUBLIC_B2C_BROWSE` | `IMPLEMENTED_DATA_EMPTY` | Empty (no B2C-eligible suppliers) | NONE | N/A | Backend: 10 unit (projection); Frontend: none |
| B2C Product Detail | `/product/:slug` | `PUBLIC_PRODUCT_DETAIL` | `IMPLEMENTED_DATA_EMPTY` | Empty (depends on B2C browse data) | Hard-nav CTA → `/inquiry?productSlug=...&sourceSurface=PRODUCT_DETAIL` | CORRECT — `PRODUCT_DETAIL` via URL param | Backend: 10 unit (shared); Frontend: none; Inquiry: indirect PII-021 |
| Aggregator Preview | `/aggregator` | `PUBLIC_AGGREGATOR` | `NOT_IMPLEMENTED` (as directory) | Static — no data | NONE | N/A | None |
| B2B Supplier Profile | `/supplier/:slug` | `PUBLIC_SUPPLIER_PROFILE` | `IMPLEMENTED_TEST_COVERED` | Graceful 404 when empty; will auto-populate | Inline form (INQUIRY-004) — always rendered | **GAP** — `'DIRECT'` stored instead of `'SUPPLIER_PROFILE'` | Backend projection: 8; Frontend inquiry: 8; Backend inquiry: 12; Profile component (non-inquiry): NONE |
| B2B Discovery Directory | SPA state only | `PUBLIC_B2B_DISCOVERY` | `IMPLEMENTED_DATA_EMPTY` | Empty (no B2B-eligible suppliers) | NONE — routes to `/supplier/:slug` profiles | N/A | Backend projection: 10; Frontend: NONE; Route: NONE |
| Directory Inquiry (overall) | — | — | `PARTIAL` | — | 2 of 5 surfaces | 2 of 4 paths have gap | Multiple (see §4.4) |
| Inquiry endpoint | `POST /api/public/inquiry/submit` | `PUBLIC_INQUIRY` | `PRODUCTION_VERIFIED` (FAM-03) | — | — | Backend normalizes unknown → `'DIRECT'` | 27 backend unit tests |

---

## §6 100% Aggregator Directory Readiness Definition

The following defines what "100% aggregator directory ready for soft-launch" means in repo-truth terms. Each dimension must be satisfied before the aggregator directory can support real buyer outreach.

### 6.1 Readiness dimensions

| # | Dimension | Readiness gate | Current state | Met? |
|---|---|---|---|---|
| 1 | **Public entry / landing clarity** | `/aggregator` renders a usable entry portal with working navigation to B2B discovery and B2C browse | Confirmed — `PublicAggregatorPreview` renders static portal with CTAs; `onExploreB2B` → B2B discovery state | ✅ READY |
| 2 | **B2B discovery list readiness** | `B2BDiscoveryPage` renders correctly with any data and safely in empty state | Confirmed — `IMPLEMENTED_DATA_EMPTY`; safe `200 { items: [] }`; graceful empty card | ✅ READY (impl) ⚠️ DATA needed |
| 3 | **Supplier profile readiness** | `/supplier/:slug` renders correctly, serves projection-gated profile, handles graceful 404 | Confirmed — `IMPLEMENTED_TEST_COVERED`; graceful 404 for any unconfigured slug | ✅ READY (impl) ⚠️ DATA needed |
| 4 | **Product browse / detail relationship clarity** | B2C and B2B surfaces are clearly distinct with separate projection gates; product detail links to supplier profile | Confirmed — `org_type = 'B2C'` (browse) vs `'B2B'` (discovery) separation; `publicSupplierSlug` in product detail enables `onViewSupplierProfile()` | ✅ READY (impl) ⚠️ DATA needed |
| 5 | **Inquiry attachment readiness** | ≥1 discovery surface has a functional inquiry entry point; endpoint works | Supplier profile has inline form; product detail has nav CTA; endpoint PRODUCTION_VERIFIED (FAM-03) | ✅ PARTIAL — functional; `source_surface` gap is P2 |
| 6 | **Notification dependency (P1 blocker)** | Supplier receives notification when a buyer submits an inquiry | FTR-B2C-004 `NOT_STARTED` — endpoint writes audit log only; no SMTP | ❌ NOT MET — P1 blocker |
| 7 | **Demo / reference labeling dependency** | Public-facing data is labeled as demo/reference data during soft launch to manage buyer expectations | NOT STARTED — no demo labels on any public surface | ⚠️ SOFT BLOCKER — required before real buyer data collection at scale |
| 8 | **Minimum data requirement** | ≥1 B2B-public-eligible supplier with provisioned profile data appears in directory | Zero B2B-eligible suppliers in production (HD-002 VERIFIED_FAIL finding) | ❌ NOT MET — P0 prerequisite |
| 9 | **URL / deep-link decision** | `B2BDiscoveryPage` has a bookmarkable URL OR decision is accepted that personal outreach via homepage nav is sufficient for soft launch | RT2-B2 accepted finding: no-URL is a soft-launch UX/marketing limitation, not a functional blocker for personal outreach | ✅ ACCEPTED — decision deferred to marketing campaign phase; not a blocker for Phase 1 personal outreach |
| 10 | **Marketing CTA requirement** | An entry-point URL exists for external links in marketing materials | `/aggregator` exists and is usable as an entry URL; individual supplier profiles at `/supplier/:slug` are shareable | ✅ ACCEPTABLE — `/aggregator` + `/supplier/:slug` are shareable; `/b2b` directory URL would be ideal but is not required for personal outreach |

### 6.2 Readiness summary

| Gate | Status | Blocking what |
|---|---|---|
| Implementation architecture | ✅ COMPLETE | — |
| Data provisioning (P0) | ❌ MISSING | Nothing visible without ≥1 eligible supplier |
| Notification loop (P1) | ❌ MISSING | Real buyer outreach (suppliers unaware of inquiries) |
| Demo labeling | ⚠️ MISSING | Broad public presentation; acceptable for limited personal outreach |
| `source_surface` attribution (P2) | ⚠️ GAP | Analytics attribution only; not a UX or security gap |
| URL for B2B discovery | ✅ ACCEPTED LIMITATION | Marketing/SEO only; not a personal outreach blocker |

---

## §7 Readiness Category Tables

### A. Ready now — no additional work required

| Item | Evidence |
|---|---|
| `/aggregator` as public entry portal | Static stub; CTA navigation to B2B discovery, B2C browse, trust landing, sign-in, request access all working |
| Inquiry endpoint (`POST /api/public/inquiry/submit`) | PRODUCTION_VERIFIED (FAM-03); 27 backend unit tests; PII-safe; rate-limited; audit-logged |
| Graceful empty states on all surfaces | `items: []` (200) for browse/discovery; graceful 404 for unknown slugs; no broken states |
| `/supplier/:slug` projection pipeline | 5-gate safe projection; prohibited fields excluded; inquiry form; auth handoff panel |
| `/product/:slug` → `/inquiry` context handoff | Hard-nav CTA with `productSlug` + `sourceSurface=PRODUCT_DETAIL` — attribution correct (PII-021) |
| PII protection | Confirmed across all inquiry surfaces and backend pipeline |
| Rate limiting on inquiry endpoint | 20 req / 15 min per IP |

### B. Implemented but data-empty — works; shows empty state until data provisioned

| Item | Gap type | Evidence |
|---|---|---|
| `B2BDiscoveryPage` — supplier list | Data — no B2B-public-eligible suppliers in production | RT2-B2 §9; HD-002 VERIFIED_FAIL |
| `/products` — product browse | Data — no B2C-public-eligible suppliers in production | RT2-A §7 Finding 1 |
| `/product/:slug` — product detail | Data — depends on B2C eligible products | RT2-A §7 Finding 1 |
| `/supplier/:slug` profile pages | Data — graceful 404 for any slug without a provisioned B2B-eligible supplier | RT2-B1 §8 |

### C. Implemented but missing URL / deep-link

| Item | Gap detail | Blocking? |
|---|---|---|
| `B2BDiscoveryPage` — no dedicated URL | No `/b2b` or `/discover` path; `setAppState` only; URL bar unchanged | NOT blocking for Phase 1 personal outreach; marketing/SEO gap if external directory link needed |
| `/products` — no URL update on nav | `onGoProducts` calls `setAppState` only, no `replaceState` | Same as above; homepage → navbar is the discovery path |

### D. Implemented but missing tests

| Item | Gap detail | Priority |
|---|---|---|
| `B2BDiscoveryPage` — frontend component | No test for mount, load states, filtering, card rendering, profile navigation | P3 — implementation correct; projection is tested |
| `B2CBrowsePage` — frontend component | No frontend component test | P3 |
| `PublicProductDetail` — frontend component | No frontend component test; inquiry CTA `<a href>` has no dedicated test | P3 |
| `PublicSupplierProfile` — profile render (non-inquiry) | No test for hero, snapshot, trust signals, value-chain, offering preview, auth handoff | P3 |
| `GET /api/public/b2b/suppliers` — route-level endpoint | No Fastify route integration test; query param validation untested at route level | P3 |

### E. Partial inquiry attachment

| Surface | Attachment state | Attribution state |
|---|---|---|
| `/supplier/:slug` | INLINE FORM — always rendered | GAP — `'DIRECT'` stored instead of `'SUPPLIER_PROFILE'` |
| `/product/:slug` | NAV CTA — hard navigation to `/inquiry` with correct context | CORRECT — `'PRODUCT_DETAIL'` flows end-to-end |
| `/products` | NONE | N/A |
| `/aggregator` | NONE | N/A |
| `B2BDiscoveryPage` | NONE — routes to `/supplier/:slug` profiles which have inline forms | N/A |
| `/inquiry` FORM mode (supplier context) | YES — `InquiryForm` subcomponent | GAP — `sourceSurface` prop not forwarded from `PublicInquiryPage` to `InquiryForm` |
| `/inquiry` NO_CONTEXT mode (product/category/collection) | YES — `GeneralInquiryForm` | CORRECT — `resolveSourceSurface()` used |

### F. Blocks buyer outreach — open items from RT2-B3

| ID | Item | Priority | Detail |
|---|---|---|---|
| OI-B3-004 | FTR-B2C-004 minimum notification loop | **P1** | Inquiry endpoint writes audit log only; no SMTP/email delivery to supplier; supplier does not know when buyer submits inquiry; real buyer outreach must not begin at scale until this is resolved |
| (P0) | No B2B-public-eligible supplier data | **P0 prerequisite** | Zero B2B-eligible suppliers in production; nothing visible without data provisioning; this is not a code gap — requires Paresh to provision real or demo suppliers via F1/F2/G1/G2 sequence |
| OI-B3-005 | PRIT-034 legal pages bundle not deployed | **P0** (per RT2-B3 §11.1) | Required before public buyer data collection at scale |
| OI-B3-001 | `source_surface` attribution gap | P2 | Analytics only; all supplier-context inquiries stored as `'DIRECT'`; not a UX or security gap |

### G. Later P2/P3 cleanups (non-blocking for soft-launch)

| Item | Priority | Scope |
|---|---|---|
| Fix `source_surface: 'SUPPLIER_PROFILE'` on supplier-context inquiry paths | P2 | `SOFT-LAUNCH-SOURCE-SURFACE-ATTRIBUTION-FIX-001` (OI-B3-001 + OI-B3-002) |
| Add URL for `B2BDiscoveryPage` (`/b2b` path) | P2 | Small `resolveInitialAppState()` + `replaceState` in `onGoB2B` |
| Add frontend component tests for all untested public components | P3 | Per §D above |
| Add `/product/:slug` inquiry CTA link presence test | P3 | Low regression risk (static `<a>` href) |
| Add route-level integration test for `GET /api/public/b2b/suppliers` | P3 | Query param validation; response envelope shape |
| Demo / reference labeling for soft-launch data | P2 | Separate RT3 scope |

---

## §8 Minimum Data Requirement for Aggregator Directory Visibility

The following is the minimum set of DB state required before any supplier appears in any public directory surface. This is derived from the projection gate analysis across RT2-A, RT2-B1, and RT2-B2.

### For a supplier to appear in `B2BDiscoveryPage` (B2B directory list):

All five gates must pass simultaneously:

| Gate | Required DB state |
|---|---|
| Gate A | `tenant.publicEligibilityPosture = 'PUBLICATION_ELIGIBLE'` |
| Gate B | `org.publication_posture IN ('B2B_PUBLIC', 'BOTH')` |
| Gate C | `org.org_type = 'B2B'` |
| Gate D | `org.status IN ('ACTIVE', 'VERIFICATION_APPROVED')` |
| Gate E | No prohibited fields present in projection (automatic — no action needed) |

### For the supplier's profile to render at `/supplier/:slug`:

Same five gates (same projection service). Additionally:

| Field | Required to show | Notes |
|---|---|---|
| `slug` | YES — must be non-null, valid `[a-z0-9-]+` format | Routing depends on this |
| `legalName` | YES — rendered as h1 in hero | Required for meaningful profile |
| `taxonomy.primarySegment` | Recommended | Fallback "Textile Supplier" shown if absent |
| `taxonomy.rolePositions[]` | Recommended | Fallback shown if absent |
| `jurisdiction` | Recommended | Fallback "Not specified" if absent |
| `offeringPreview[]` | Recommended | Section hidden if no offerings |
| `certificationCount` / `certificationTypes[]` | Recommended | "None on record" shown if absent |
| `hasTraceabilityEvidence` | Optional | "Not published" shown if false |

### For a product to appear in `/products` (B2C browse) or `/product/:slug` (B2C detail):

These are B2C surfaces with separate gates:

| Gate | Required DB state |
|---|---|
| Gate A | `tenant.publicEligibilityPosture = 'PUBLICATION_ELIGIBLE'` |
| Gate B | `org.publication_posture IN ('B2C_PUBLIC', 'BOTH')` |
| Gate C | `org.org_type = 'B2C'` |
| Gate D | `org.status IN ('ACTIVE', 'VERIFICATION_APPROVED')` |
| Gate E | Prohibited fields excluded (automatic) |

**Note:** A B2B supplier WILL NOT appear in `/products` even if fully provisioned. A B2C supplier WILL NOT appear in `B2BDiscoveryPage`. These are separate, non-overlapping publication postures. An org with `publication_posture = 'BOTH'` can appear in both.

### Minimum for a meaningful soft-launch demo:

For the aggregator directory to provide non-trivial discovery value at soft launch:
- **≥1 B2B-eligible supplier** provisioned with `legalName`, `slug`, `taxonomy`, ≥1 certification or traceability evidence, and ≥1 offering preview item
- **≥1 B2C-eligible supplier** provisioned with ≥1 `catalogItem` with a product name and category if B2C browse is to be demonstrated
- Both sets require `publicEligibilityPosture = 'PUBLICATION_ELIGIBLE'` on the tenant record

This data provisioning sequence is the subject of the F1 → F2 → G1 → G2 onboarding chain.

---

## §9 Buyer Outreach Blocker Summary

### P0 — No data in production (prerequisite to all outreach)

**Condition:** Zero B2B-public-eligible suppliers provisioned.  
**Effect:** `B2BDiscoveryPage` renders "No public profiles match this view yet." — a correct and safe state, but one that provides no discovery value.  
**Resolution path:** Provision ≥1 real B2B-eligible Surat textile supplier via the F1/F2/G1/G2 onboarding sequence. Requires Paresh to complete F1 questionnaire and initiate F2.

### P1 — FTR-B2C-004 minimum notification loop (blocker for real buyer outreach at scale)

**Condition:** Inquiry endpoint (`POST /api/public/inquiry/submit`) writes audit log only. No SMTP, no email, no in-app notification delivered to the supplier when a buyer submits an inquiry.  
**Effect:** A buyer submits an inquiry. The inquiry is recorded. The supplier receives no signal. The inquiry sits silently in the audit log. No follow-up is possible unless Paresh manually reviews audit logs and relays the information to the supplier.  
**Soft-launch acceptability:** For very limited personal outreach (1–3 buyers directly introduced by Paresh to a specific supplier), Paresh can manually relay inquiries. This is not scalable and is not suitable for even a small soft launch involving multiple buyers.  
**Resolution path:** Implement `SOFT-LAUNCH-MINIMUM-NOTIFICATION-LOOP-UNIT-001` — minimum viable notification: `writeAuditLog` on inquiry creation already works; the P1 unit adds an email dispatch from the server on `public.buyer.inquiry.created` to the supplier's verified email.  
**Classification:** `NOT_STARTED` per governance docs. This is the single most important functional gap for buyer-facing soft launch.

### P0 — PRIT-034 legal pages bundle (prerequisite for formal public data collection)

**Condition:** Legal pages (privacy policy, terms of service) not deployed per RT2-B3 OI-B3-005.  
**Effect:** Collecting buyer contact intent without visible privacy policy creates compliance exposure.  
**Note:** The inquiry form itself collects no PII (confirmed across all surfaces). However, the broader buyer data pathway requires legal pages to be visible.

### P2 — `source_surface` attribution gap (analytics only)

**Condition:** Both supplier-context inquiry paths (`/supplier/:slug` inline form and `PublicInquiryPage` FORM mode) do not forward `source_surface`; backend normalizes to `'DIRECT'`.  
**Effect:** Analytics and attribution for inquiries from supplier profiles will be attributed to `'DIRECT'`. The buyer's inquiry is still received and recorded. No inquiry is lost. No UX error occurs. Only sourcing analytics are affected.  
**Resolution path:** OI-B3-001 — `SOFT-LAUNCH-SOURCE-SURFACE-ATTRIBUTION-FIX-001`. Small frontend change.

### Summary table

| Blocker | Priority | Condition | Resolution path | Blocks real buyer outreach? |
|---|---|---|---|---|
| No B2B-eligible supplier data | P0 | No provisioned suppliers | F1 → F2 → G1 → G2 onboarding chain | YES — nothing to show |
| FTR-B2C-004 notification loop | P1 | No SMTP/notification from inquiry endpoint | `SOFT-LAUNCH-MINIMUM-NOTIFICATION-LOOP-UNIT-001` | YES — supplier unaware of inquiries |
| PRIT-034 legal pages | P0 | Legal pages not deployed | Separate unit | YES — before formal public data collection |
| `source_surface` attribution | P2 | Analytics gap only | `SOFT-LAUNCH-SOURCE-SURFACE-ATTRIBUTION-FIX-001` | NO — functional non-blocker |

---

## §10 Governance Drift Summary

All drift findings confirmed by RT2-A through RT2-B3. This section consolidates them.

**Drift resolution note:** These drift items are NOT corrected in this packet. Correction of governance documents requires a dedicated sync unit authorized by Paresh (`TLRH-GOVERNANCE-SYNC-001` or equivalent).

### Drift item 1 — "Aggregator directory" terminology conflates B2C and B2B surfaces

| Field | Detail |
|---|---|
| Documents affected | `SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md` §5 line 85; `SOFT-LAUNCH-PRIORITY-RESET-REQUIREMENTS-INTAKE-REVIEW-001.md` §7 |
| Claim | Labels `/products` and `/product/:slug` as "B2B / aggregator directory" |
| Repo truth | `/products` and `/product/:slug` are B2C surfaces (Gate C: `org_type = 'B2C'`). The actual B2B supplier aggregator directory is `B2BDiscoveryPage` / `GET /api/public/b2b/suppliers` (Gate C: `org_type = 'B2B'`). These use separate projection services and separate data sets. |
| Drift type | Naming inconsistency. Not a code error. Doc terminology is imprecise. |
| Required correction | Docs should distinguish "B2C public product browse" from "B2B supplier aggregator directory" when making seeding or readiness decisions. |

### Drift item 2 — `/aggregator` classified as PRODUCTION_VERIFIED based on wrong unit closure

| Field | Detail |
|---|---|
| Documents affected | `SOFT-LAUNCH-PRIORITY-RESET-REQUIREMENTS-INTAKE-REVIEW-001.md` §7 |
| Claim | "Aggregator discovery workspace (`/aggregator`) — PRODUCTION_VERIFIED (bounded); `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` CLOSED" |
| Repo truth | The closed `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS` unit addressed the tenant-side authenticated `AggregatorDiscoveryWorkspace` component (`tenantGet()` calls, etc.) — not the public `/aggregator` page. The public `/aggregator` stub is a separate, independent surface: `PublicAggregatorPreview` — a static marketing page with no data fetch. It was NOT covered by that closure. Classifying the public `/aggregator` as PRODUCTION_VERIFIED based on a tenant-side authenticated unit is incorrect. |
| Drift type | Stale / incorrect attribution. The public stub is correctly classified as `NOT_IMPLEMENTED` as a directory surface. |
| Required correction | Public `/aggregator` should be relabeled as "static entry stub" or "marketing portal." Its PRODUCTION_VERIFIED claim based on the wrong closure should be removed. |

### Drift item 3 — `B2BDiscoveryPage` absent from Q4 minimum checklist

| Field | Detail |
|---|---|
| Documents affected | `SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md` §Q4 minimum checklist |
| Claim | Q4 minimum aggregator directory layer: `/products` browse, `/product/:slug`, `/collections`, buyer inquiry, supplier profiles, SEO, legal, analytics |
| Repo truth | `B2BDiscoveryPage` is a fully implemented B2B supplier discovery surface — a dedicated component with 5-gate projection, 5-dimension filtering, safe empty state, and "View Public Profile" navigation. It is the primary B2B aggregator directory page. It is not explicitly named in the Q4 minimum checklist. |
| Drift type | Coverage gap in strategy doc. The B2B discovery surface is not formally assessed in the minimum readiness list. |
| Required correction | Add `B2BDiscoveryPage` to the Q4 minimum checklist (as `IMPLEMENTED_DATA_EMPTY`) and distinguish it from the B2C browse surfaces. |

### Drift item 4 — FAM-09 (`NOT_ASSESSED`) understates supplier profile implementation depth

| Field | Detail |
|---|---|
| Documents affected | `LAUNCH-FAMILY-INDEX.md` FAM-09 entry |
| Claim | FAM-09 "Supplier Profile and Catalog" = `NOT_ASSESSED` / `NEEDS_REPO_INSPECTION` |
| Repo truth | `/supplier/:slug` is `IMPLEMENTED_TEST_COVERED`: full route, 5-gate projection, frontend component with 9 UI sections, inline inquiry form (INQUIRY-004), 8+8+12 unit tests, bookmarkable URL, graceful 404. This substantially exceeds the level of readiness implied by `NOT_ASSESSED`. |
| Drift type | Classification is outdated / conservative. Actual state is significantly stronger than the FAM-09 entry suggests. |
| Required correction | FAM-09 status should be updated to `VERIFIED_COMPLETE` (or at minimum `REPO_TRUTH_CONFIRMED`) after a final smoke test for the profile route. |

### Drift item 5 — `'SUPPLIER_PROFILE'` source surface value is defined but never emitted

| Field | Detail |
|---|---|
| Documents affected | Implied by any governance claim that inquiry attribution is correct for supplier profile surfaces |
| Claim | `VALID_SOURCE_SURFACES` (both frontend and backend) includes `'SUPPLIER_PROFILE'` as a valid value |
| Repo truth | `'SUPPLIER_PROFILE'` is defined in the valid-surface set but is never passed by any current code path. Both supplier-context paths (`/supplier/:slug` inline form and `PublicInquiryPage` FORM mode `InquiryForm` subcomponent) omit `source_surface`; the backend normalizes the absent value to `'DIRECT'`. The enum value is therefore orphaned — defined but unused. |
| Drift type | Dead enum value + attribution gap. Not a security issue. Analytics gap only. |
| Required correction | OI-B3-001 fix: pass `source_surface: 'SUPPLIER_PROFILE'` from both supplier-context paths. |

---

## §11 Recommended Next Packet

### Primary recommendation — RT3

**Unit:** `SOFT-LAUNCH-REPO-TRUTH-RT3-PUBLIC-PAGES-DEMO-LABEL-AUDIT`

**Purpose:**  
RT2 established that all public discovery surfaces are architecturally implemented, with the only remaining gaps being data provisioning, the FTR-B2C-004 notification loop, and minor attribution/test coverage items. The next governance question before real soft-launch data is placed in public view is: **do any public surfaces display "demo," "test," or "reference" data labeling to manage buyer expectations?** This is a repo-truth question — does any component render a "demo data" or "soft launch preview" notice? If not, is that a gap before real data is placed?

**Scope:**
1. Scan all public-facing components for any "demo," "test," "preview," or "soft launch" labeling markers
2. Determine whether any labeling is required before real supplier data is placed in production visibility
3. Assess whether `PublicAggregatorPreview` footer ("Public preview only. Deeper intelligence is available to authenticated TexQtic participants.") is sufficient as the only soft-launch disclaimer
4. Audit whether the trust landing, industry landing, and SEO metadata surfaces need a soft-launch qualifier
5. Confirm whether the inquiry success message ("Your inquiry has been received.") is accurate without the FTR-B2C-004 notification loop — i.e., is there any implied promise of follow-up in the UI text?

### Split recommendation

**Recommended: Keep RT3 as a single packet.**

**Rationale:** All sub-topics (demo labeling, trust/SEO qualifiers, inquiry success message copy) are read-only repo audits with no data fetch. They can be covered in a single synthesis pass without new source inspection beyond targeted grep searches. Expected artifact size: 100–150 lines. A split would only be warranted if the scope expands to cover additional new surfaces (e.g., collections, DPP pages) — in which case:

| If RT3 is kept single | If RT3 is split |
|---|---|
| RT3: Demo label + trust/SEO qualifier + inquiry copy audit | RT3-A: Demo label + inquiry copy audit (5 directory surfaces) |
| RT4: FTR-B2C-004 notification loop implementation audit (after unit is built) | RT3-B: SEO metadata + trust/legal qualifier audit (trust landing, legal pages) |
| — | RT4: FTR-B2C-004 notification loop audit |

**Default recommendation:** Keep single (RT3 one packet, RT4 for notification loop), unless Paresh instructs a split. The single-packet approach is consistent with the RT2 micro-packet pattern and does not conflate SEO/legal concerns with the demo-labeling question.

### Secondary recommendation — RT4

**Unit:** `SOFT-LAUNCH-REPO-TRUTH-RT4-NOTIFICATION-LOOP-AUDIT`  
**Purpose:** After `SOFT-LAUNCH-MINIMUM-NOTIFICATION-LOOP-UNIT-001` is implemented, audit the notification loop implementation: what is triggered, what is delivered, what safeguards exist (rate limit, error handling, idempotency), and whether the supplier email pathway is end-to-end safe for soft launch.  
**Dependency:** Should only begin after FTR-B2C-004 implementation is committed.

---

## §12 Explicit No-Authorization Statement

This is a synthesis packet only.

- **No code changes were made.** No source file, test file, schema file, migration file, env file, config file, or data file was modified.
- **No governance index was updated.** NEXT-ACTION, OPEN-SET, launch-readiness docs, TLRH hub indexes, and source registers are unchanged.
- **No SQL was run.** No database queries, no Prisma commands, no RLS changes.
- **No scripts were executed.** No build, no migration, no seeding, no HD-002 recheck, no test run, no server start.
- **No implementation work was authorized or performed.** This synthesis does not open any family cycle.

Files read (read-only — input artifacts only):
- `governance/units/SOFT-LAUNCH-REPO-TRUTH-RT2-A-AGGREGATOR-DIRECTORY-ROUTE-DATA-AUDIT.md`
- `governance/units/SOFT-LAUNCH-REPO-TRUTH-RT2-B1-SUPPLIER-PROFILE-AUDIT.md`
- `governance/units/SOFT-LAUNCH-REPO-TRUTH-RT2-B2-B2B-DISCOVERY-AUDIT.md`
- `governance/units/SOFT-LAUNCH-REPO-TRUTH-RT2-B3-DIRECTORY-INQUIRY-ATTACHMENT-AUDIT.md`

---

*RT2-B4 COMPLETE. RT2 series closed. Commit follows.*
