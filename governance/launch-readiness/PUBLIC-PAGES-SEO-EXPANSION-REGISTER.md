# Public Pages and SEO Expansion Register

**Hub:** `governance/launch-readiness/`
**Status:** SKELETON — PENDING POPULATION
**Population unit:** `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-POPULATION-001`
**Last updated:** 2026-05-25 — `TLRH-PUBLIC-SEO-REFERENCE-PREVIEW-GUARDRAIL-SYNC-005A`
**Design authority:** `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-DESIGN-001`

---

> **SKELETON NOTE**
>
> This register tracks the SEO expansion roadmap and all future public pages.
> It does NOT replace the B2C family tracker (`TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001`)
> or the D2C tracker. Those trackers own the delivery sequencing of their unit families.
> This register provides a single consolidated view for launch readiness planning only.

---

## 1. Purpose

This document is the consolidated public pages and SEO expansion register for launch readiness.

It answers:
1. Which public pages are currently live and indexed?
2. Which public pages are live but noindex (stubs)?
3. Which future pages are planned but not yet built?
4. Which deferred SEO units must be opened before specific pages can be indexed?
5. What is the SEO expansion priority sequence?

**Authority boundary:** This register does not govern delivery sequencing. Unit sequencing is
governed by Layer 0 and family trackers. This register is a planning visibility artifact only.

---

## 2. Currently Live + Indexed Public Pages

Pages that are live in production and indexable (not noindex) as of the skeleton date.

| # | Route | SEO Metadata | sitemap.xml | robots.txt | JSON-LD | Status |
|---|---|---|---|---|---|---|
| 1 | `/products` | YES | YES | ALLOW | YES (WebPage) | PRODUCTION_VERIFIED |
| 2 | `/product/:slug` | YES | YES | ALLOW | YES (Product) | PRODUCTION_VERIFIED |
| 3 | `/collections` | YES | YES | ALLOW | YES (WebPage) | PRODUCTION_VERIFIED |
| 4 | `/collections/:slug` | YES | YES | ALLOW | YES (WebPage) | PRODUCTION_VERIFIED |
| 5 | `/inquiry` | YES | YES | ALLOW | YES (WebPage) | PRODUCTION_VERIFIED |
| 6 | `/passport/:id` | YES | YES | ALLOW | YES (WebPage) | PRODUCTION_VERIFIED |
| 7 | `/category/silk-sarees` | YES | YES | ALLOW | YES (WebPage) | PRODUCTION_VERIFIED |
| 8 | `/category/cotton-fabrics` | YES | YES | ALLOW | YES (WebPage) | PRODUCTION_VERIFIED |
| 9 | `/category/synthetic-fabrics` | YES | YES | ALLOW | YES (WebPage) | PRODUCTION_VERIFIED |
| 10 | `/category/textile-accessories` | YES | YES | ALLOW | YES (WebPage) | PRODUCTION_VERIFIED |

*Source: PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001 (VERIFIED_COMPLETE 2026-05-19)*

---

## 3. Currently Live — Noindex Stubs (Not Yet Indexed)

Pages that exist as routes but are intentionally noindex pending content or SEO authorization.

| # | Route | Reason Noindex | Indexability Gate | Priority | Status |
|---|---|---|---|---|---|
| N-1 | `/trust` | Content not ready; trust narrative not written | Content strategy decision + copywriting | P2 | OPEN_STUB |
| N-2 | `/industries` | Industry cluster content not designed | Industry cluster taxonomy completion + content | P2 | OPEN_STUB |
| N-3 | `/aggregator` | Aggregator positioning design not complete | Aggregator page design decision | P3 | OPEN_STUB |
| N-4 | `/supplier/:slug` | Supplier profile indexability gate not defined | `PUBLIC-SEO-SUPPLIER-PROFILE-INDEXABILITY-001` decision | P2 | DESIGN_GATED |

---

## 4. Future Public Pages — Planned But Not Yet Built

Pages that are planned for future phases but do not yet exist as routes.

| # | Route Pattern | Purpose | Dependencies | Priority | Launch Class |
|---|---|---|---|---|---|
| F-1 | `/supplier/:slug` | Public supplier profile page — Surat supplier directory | Supplier profile indexability unit; completeness gate | P2 | LAUNCH_DEPENDENCY |
| F-2 | `/category/:slug` (expansion) | Additional industry category story pages beyond the 4 approved | B2C category story governance + content | P2 | LAUNCH_DEPENDENCY |
| F-3 | `/collections/:slug` (expansion) | Additional D2C collection pages beyond the 5 approved | D2C governance + content | P2 | LAUNCH_DEPENDENCY |
| F-4 | `/blog` or `/stories` | Long-form content for organic SEO | Content strategy decision | P3 | POST_MVP |
| F-5 | `/about` | Brand about page | Copywriting | P2 | PILOT_REQUIRED |
| F-6 | `/contact` | Contact / sales inquiry page | Copywriting | P2 | PILOT_REQUIRED |

---

## 5. Deferred SEO Governance Units

Units that were explicitly deferred by closed implementation units and must be opened
before their specific SEO goals can be achieved.

| # | Unit ID | Title | Deferred By | What It Unblocks | Priority | Status |
|---|---|---|---|---|---|---|
| SU-1 | `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001` | Canonical URL strategy decision and implementation | PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001 | sitemap expansion, supplier profile indexing, domain redirect policy | P1 | NOT_OPENED |
| SU-2 | `PUBLIC-SEO-PRODUCT-SITEMAP-EXPANSION-001` | Add individual product detail pages to sitemap | PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001 | Dynamic `/product/:slug` pages in sitemap | P2 | NOT_OPENED |
| SU-3 | `PUBLIC-SEO-SUPPLIER-PROFILE-INDEXABILITY-001` | Define and implement supplier profile indexability gate | PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001 | `/supplier/:slug` public pages indexed | P2 | NOT_OPENED |
| SU-4 | `PUBLIC-SEO-DOMAIN-CANONICAL-IMPLEMENTATION-001` | Implement canonical redirect policy, update canonical tags site-wide, and update sitemap.xml origin URL | `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001` (SU-1 strategy outcome) | Correct canonical URL authority; no domain-split indexing | P1 | NOT_OPENED |
| SU-5 | `PUBLIC-SEO-PRODUCT-DETAIL-JSONLD-EXPANSION-001` | Add safe JSON-LD structured data (Product/ItemList type) to individual product pages — no Offer, price, or inventory schema | PUBLIC-SEO-JSONLD-WEBTYPE-IMPLEMENTATION-001 (product data model not stable) | Rich result eligibility for individual product pages | P2 | NOT_OPENED |
| SU-6 | `PUBLIC-SEO-SUPPLIER-JSONLD-IMPLEMENTATION-001` | Implement JSON-LD structured data for public supplier profile pages after indexability policy is defined | SU-3 indexability decision; supplier publication consent rules | Rich result eligibility for supplier directory pages | P2 | NOT_OPENED |

**Dependencies:** SU-2, SU-3, and SU-4 all depend on SU-1. SU-5 depends on SU-1 and a stable product data model. SU-6 depends on SU-3 (indexability policy). Do not open SU-2, SU-3, or SU-4 before SU-1 is decided.

---

## 6. SEO Expansion Priority Sequence

```
# Indicative priority sequence — not a delivery commitment

Phase 0 (Before any public buyer-facing link is shared):
  → Verify noindex on all auth/tenant routes (BS-003 in blind spot register)
  → Validate JSON-LD with Google Rich Results Test (BS-005)
  → Confirm sitemap is submitted to Google Search Console

Phase 1 (Pilot launch — Surat supplier activation):
  → Current live + indexed pages are sufficient (Section 2)
  → Domain canonical strategy (SU-1) — must be decided before any press/backlinks
  → /about and /contact pages (F-5, F-6) — low build cost, high trust signal

Phase 2 (Post-pilot proof):
  → Supplier profile pages (F-1) → requires SU-1 + SU-3
  → Product sitemap expansion (SU-2) → requires SU-1
  → /trust page (N-1) → requires content strategy decision

Phase 3 (Organic growth):
  → Category expansion (F-2) → based on search demand data
  → Collections expansion (F-3) → based on D2C traction
  → /industries page (N-2) → after industry taxonomy is complete
  → Blog / stories (F-4) → content marketing investment decision
```

---

## 7. SEO Baseline Health Checklist

Confirm before any buyer-facing outreach:

| # | Check | Status |
|---|---|---|
| GSC-1 | Google Search Console property verified for production domain | NOT_ASSESSED |
| GSC-2 | sitemap.xml submitted to GSC | NOT_ASSESSED |
| GSC-3 | No crawl errors on live public pages | NOT_ASSESSED |
| GSC-4 | Auth/tenant pages confirmed noindex (no accidental indexing) | NOT_ASSESSED |
| GSC-5 | Canonical tags render correctly on all live public pages | NOT_ASSESSED |
| GSC-6 | Google Rich Results Test run on /products, /product/:slug | NOT_ASSESSED |
| GSC-7 | First organic impressions visible in GSC performance report | NOT_ASSESSED |

---

## 9. New Public Page SEO Entry Checklist

This checklist is a **standing governance rule**. Every new public page added to the TexQtic
platform MUST satisfy all 8 gates before the route is set to `index, follow` (removed from noindex).

This checklist applies to any page added after the current baseline (§2). It does not retroactively
change the status of existing PRODUCTION_VERIFIED pages (those were verified in their respective units).

| Gate | Requirement | Notes |
|---|---|---|
| SEO-G1 | Route has a page-specific `<title>` tag | No generic fallback; unique per route |
| SEO-G2 | Route has a page-specific `<meta name="description">` tag | Distinct, keyword-relevant; no generic fallback |
| SEO-G3 | Route has a `<link rel="canonical">` tag with the correct canonical URL | Must use the canonical origin confirmed by SU-1 |
| SEO-G4 | Route has `og:title`, `og:description`, `og:url` Open Graph meta tags | Required for social sharing; must match title/description |
| SEO-G5 | Route has a `<meta name="robots">` tag with correct index/noindex intent | Must be explicit; no implicit fallback |
| SEO-G6 | Route is correctly included in (or intentionally excluded from) `sitemap.xml` | New indexed pages must be added; new noindex stubs must be excluded |
| SEO-G7 | Route is correctly ALLOW or DISALLOW in `robots.txt` | Confirm robots.txt directive matches index intent |
| SEO-G8 | Route has appropriate JSON-LD structured data type markup | WebPage/CollectionPage/BreadcrumbList or domain-specific type as appropriate; must not include forbidden types (Offer, AggregateRating, Review, price, availability, inventory claims) |

**Authority:** `PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001` + `PUBLIC-SEO-JSONLD-WEBTYPE-IMPLEMENTATION-001`.
All 8 gates are mandatory. A governance unit implementing a new indexed public page must include
a verification table confirming each gate passes before marking the unit `VERIFIED_COMPLETE`.

---

## 8. Update History

| Date | Change | Who |
|---|---|---|
| 2026-05-19 | Skeleton created; live pages from PROD-AUDIT-002 and sitemap unit; deferred units from sitemap unit close | Copilot/Design unit |
| 2026-07-14 | Added SU-4 (canonical impl), SU-5 (product JSON-LD), SU-6 (supplier JSON-LD) to §5; updated dependency note; added §9 new public page SEO entry checklist (8 gates) | `PUBLIC-SEO-PENDING-WORK-REGISTER-SYNC-001` |
| 2026-05-25 | Added Reference Preview SEO Guardrail section; standing rule for future sitemap/indexability work | `TLRH-PUBLIC-SEO-REFERENCE-PREVIEW-GUARDRAIL-SYNC-005A` |

---

## Reference Preview SEO Guardrail — 2026-05-25

**Recorded:** 2026-05-25 — `TLRH-PUBLIC-SEO-REFERENCE-PREVIEW-GUARDRAIL-SYNC-005A`

Reference-preview pages (app-side static reference previews and Marketing preview routing) are public preview surfaces. They are static/config-backed and represent preview posture, not live commercial products or suppliers.

**Rules for future sitemap / indexability work:**

- Future sitemap expansion or indexability units must not accidentally promote reference-preview slugs as live commercial pages.
- Before any sitemap expansion or indexability unit opens, verify how reference-preview slugs are handled.
- Reference-preview slugs must either be excluded from sitemap/indexation, or be handled according to an explicitly approved SEO policy.
- No reference-preview content should be described in SEO copy as live products, live suppliers, live inventory, verified marketplace supply, buyer-ready supply, or order-ready commercial offers.

**Scope of this guardrail:**

This is a standing guardrail for future SEO/page expansion work. It does not confirm that noindex is already fully implemented for reference-preview routes; that must be verified in a dedicated unit before it can be claimed.
