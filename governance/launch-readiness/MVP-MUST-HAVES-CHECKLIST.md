# MVP Must-Haves Checklist

**Hub:** `governance/launch-readiness/`
**Status:** SKELETON — PENDING POPULATION
**Population unit:** `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-POPULATION-001`
**Last updated:** 2026-05-19 (skeleton created)
**Design authority:** `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-DESIGN-001`

---

> **SKELETON NOTE**
>
> This checklist will be fully populated in `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-POPULATION-001`.
> Rows marked `NOT_ASSESSED` are placeholders only.
> Items marked `PRODUCTION_VERIFIED` reflect known closed units as of this skeleton date.

---

## 1. Purpose

This document is the binary launch checklist for TexQtic.

For each dimension, the answer is:

- `YES` — Done and production-verified. No remaining obligation.
- `PARTIAL` — Partially done; gaps identified.
- `NO` — Not started or not available.
- `BLOCKED` — Blocked by a known hold or dependency.
- `DEFERRED` — Explicitly deferred with rationale. Needs review against P0/P1 classification.
- `LAUNCH_BLOCKER` — Hard blocker. Launch cannot proceed if this is not resolved.
- `NOT_ASSESSED` — No inspection done; must be resolved before launch window opens.

**The cutline rule:**
> Any item marked `LAUNCH_BLOCKER` that is not resolved to `YES` before launch is a hard stop.
> No item may be quietly removed from the checklist under time pressure.
> Removal or demotion requires Paresh's explicit written decision with documented rationale.

---

## 2. Auth / Onboarding

| # | Item | Status | Priority | Notes |
|---|---|---|---|---|
| A-1 | Supplier can sign up and create an account | NOT_ASSESSED | P0 | — |
| A-2 | Invite-token onboarding flow works end-to-end | NOT_ASSESSED | P0 | — |
| A-3 | Email verification fires and completes | NOT_ASSESSED | P0 | — |
| A-4 | Tenant workspace is provisioned on activation | NOT_ASSESSED | P0 | — |
| A-5 | Auth session persists correctly across refresh | NOT_ASSESSED | P0 | — |
| A-6 | Password reset flow works | NOT_ASSESSED | P1 | — |
| A-7 | Reused-existing-user edge case handled safely | NOT_ASSESSED | P1 | BOUNDED_DEFERRED_REMAINDER — check Layer 0 |
| A-8 | Onboarding state inspection visible to control plane | NOT_ASSESSED | P1 | — |

---

## 3. Tenant Core Workspace

| # | Item | Status | Priority | Notes |
|---|---|---|---|---|
| T-1 | Supplier can log in and access their workspace | NOT_ASSESSED | P0 | — |
| T-2 | Tenant org_id is correctly isolated in all routes | NOT_ASSESSED | P0 | CONSTITUTIONAL |
| T-3 | Feature flags provision correctly for new tenants | NOT_ASSESSED | P1 | — |
| T-4 | Tenant plan/subscription metadata resolves correctly | NOT_ASSESSED | P1 | — |
| T-5 | Admin settings surface is accessible | NOT_ASSESSED | P1 | — |
| T-6 | Tenant context does not leak cross-tenant | NOT_ASSESSED | P0 | RLS POLICY |

---

## 4. Supplier Profile / Product Data

| # | Item | Status | Priority | Notes |
|---|---|---|---|---|
| S-1 | Supplier can create and publish a product | NOT_ASSESSED | P0 | — |
| S-2 | Product appears in public B2C browse | NOT_ASSESSED | P0 | — |
| S-3 | Product detail page shows correct data | NOT_ASSESSED | P0 | B2C unit verified but with QA data |
| S-4 | Supplier profile is public and accessible via slug | NOT_ASSESSED | P1 | — |
| S-5 | Product image upload and display works | NOT_ASSESSED | P1 | — |
| S-6 | Catalog management surface allows edits | NOT_ASSESSED | P1 | — |
| S-7 | Out-of-stock / inactive product hides from public browse | NOT_ASSESSED | P1 | — |

---

## 5. Public Surface / B2C

| # | Item | Status | Priority | Notes |
|---|---|---|---|---|
| B-1 | B2C browse page renders and loads products | YES — `PRODUCTION_VERIFIED` | P0 | Public B2C browse unit closed |
| B-2 | B2C product detail page renders correctly | YES — `PRODUCTION_VERIFIED` | P0 | Public product detail unit closed |
| B-3 | B2C category story pages (4 approved) render | YES — `PRODUCTION_VERIFIED` | P1 | Category story unit closed |
| B-4 | Public collections pages (5 approved) render | YES — `PRODUCTION_VERIFIED` | P1 | D2C public slice closed |
| B-5 | Public passport linking works when available | YES — `PRODUCTION_VERIFIED` | P1 | DPP passport unit closed |
| B-6 | Trust signals render on product detail | NOT_ASSESSED | P1 | — |
| B-7 | Supplier sign-in handoff from public pages works | NOT_ASSESSED | P1 | — |
| B-8 | Public browse shows safe states for empty/error | NOT_ASSESSED | P1 | — |
| B-9 | Public pages do not show internal or tenant data | NOT_ASSESSED | P0 | Data isolation |

---

## 6. Inquiry (B2B Contact / Lead Capture)

| # | Item | Status | Priority | Notes |
|---|---|---|---|---|
| I-1 | Inquiry form renders on public inquiry page | YES — `PRODUCTION_VERIFIED` | P0 | Inquiry Phase 1 closed |
| I-2 | Inquiry submission saves to database | YES — `PRODUCTION_VERIFIED` | P0 | Inquiry Phase 1 closed |
| I-3 | Inquiry context handoff (B2C → inquiry) works | YES — `PRODUCTION_VERIFIED` | P1 | Handoff unit closed |
| I-4 | Minimum inquiry notification reaches supplier/admin | NOT_ASSESSED | P1 | MVP_CRITICAL. Minimum path only — not full messaging platform. Required before buyer-facing outreach / soft-launch inquiry promotion. Full platform remains POST_MVP/P3 per ROADMAP row 26. See PRIT-033, FTR-B2C-004. R-013 resolved by TEXQTIC-NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001. |
| I-5 | Inquiry CRM visibility (tenant back office) | NOT_ASSESSED | P1 | — |
| I-6 | No PII leaked in error or logging paths | NOT_ASSESSED | P0 | Security |

---

## 7. SEO / Indexability

| # | Item | Status | Priority | Notes |
|---|---|---|---|---|
| SEO-1 | Title, description, og: tags fire on all public pages | YES — `PRODUCTION_VERIFIED` | P1 | publicPageMeta.ts wired |
| SEO-2 | `sitemap.xml` is live and accessible at production URL | YES — `PRODUCTION_VERIFIED` | P1 | Sitemap unit closed |
| SEO-3 | `robots.txt` is live and allows crawl of public pages | YES — `PRODUCTION_VERIFIED` | P1 | Robots unit closed |
| SEO-4 | Auth/tenant pages are noindex | NOT_ASSESSED | P0 | Critical — must confirm |
| SEO-5 | Canonical URL strategy is correct and consistent | NOT_ASSESSED | P1 | `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001` pending |
| SEO-6 | JSON-LD web type fires on relevant pages | YES — `PRODUCTION_VERIFIED` | P1 | JSON-LD unit closed |
| SEO-7 | Product detail pages are indexed (not noindex) | NOT_ASSESSED | P1 | — |
| SEO-8 | Sitemap includes all live indexable pages | NOT_ASSESSED | P1 | Expansion deferred |

---

## 8. Control Plane / Platform Ops

| # | Item | Status | Priority | Notes |
|---|---|---|---|---|
| CP-1 | Control plane shell and navigation accessible to super admin | NOT_ASSESSED | P0 | — |
| CP-2 | Tenant registry (list, select, inspect) works | NOT_ASSESSED | P0 | Boundary artifact exists |
| CP-3 | Approved-onboarding activation works from control plane | NOT_ASSESSED | P0 | — |
| CP-4 | Bounded tenant impersonation entry works | NOT_ASSESSED | P1 | — |
| CP-5 | Audit logs readable by platform operator | NOT_ASSESSED | P1 | — |

---

## 9. Data / Compliance / Security

| # | Item | Status | Priority | Notes |
|---|---|---|---|---|
| D-1 | RLS policies are correctly wired for all tenant tables | NOT_ASSESSED | P0 | CONSTITUTIONAL |
| D-2 | No cross-tenant data leakage is possible via any API | NOT_ASSESSED | P0 | CONSTITUTIONAL |
| D-3 | PII is not exposed in public routes | NOT_ASSESSED | P0 | — |
| D-4 | Error responses do not reveal stack traces or internal state | NOT_ASSESSED | P1 | — |
| D-5 | GDPR/data handling basics are in place | NOT_ASSESSED | P1 | Surat/India + EU buyer paths |
| D-6 | No .env secrets in production logs | NOT_ASSESSED | P0 | — |

---

## 10. Operational / Infrastructure

| # | Item | Status | Priority | Notes |
|---|---|---|---|---|
| O-1 | Production deploy pipeline works (Vercel + Supabase) | NOT_ASSESSED | P0 | — |
| O-2 | Rollback procedure exists and is documented | NOT_ASSESSED | P1 | — |
| O-3 | Health check endpoint returns 200 | NOT_ASSESSED | P0 | GET /health |
| O-4 | Error monitoring/alerting is in place | NOT_ASSESSED | P1 | — |
| O-5 | DB connection pool is tuned for Supabase + Vercel | NOT_ASSESSED | P1 | NC Tx timeout fix exists |
| O-6 | Performance is acceptable at expected Surat pilot load | NOT_ASSESSED | P1 | — |

---

## 11. Summary Launch Readiness Score

```
# PENDING POPULATION — to be completed in TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-POPULATION-001

Total checklist items: [N]
YES (verified): [n]
PARTIAL: [n]
NO: [n]
BLOCKED: [n]
DEFERRED: [n]
NOT_ASSESSED: [n]
LAUNCH_BLOCKER (unresolved): [n]

Overall readiness: NOT_ASSESSED
```

---

## 12. Update History

| Date | Change | Who |
|---|---|---|
| 2026-05-19 | Skeleton created by TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-DESIGN-001 | Copilot/Design unit |
| 2026-07-14 | I-4 reclassified P0→P1/MVP_CRITICAL; note added: minimum inquiry notification only; full messaging platform remains POST_MVP per ROADMAP row 26; R-013 resolved | TEXQTIC-NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001 |
| — | (To be populated) | — |
