# OPEN-SET.md — Layer 0 Governed Posture and Read Order

**Layer:** 0 — Control Plane  
**Authority:** governance/control/TEXQTIC-OPENING-LAYER-GOVERNANCE-AUTHORITY-AND-POINTER-LAYER-2026-04-10.md  
**Last Updated:** 2026-04-25 (TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001 — VERIFIED_COMPLETE)

> This file is the Layer 0 entry surface for current governed posture. Read `OPEN-SET.md`, then
> `NEXT-ACTION.md`, then `BLOCKED.md`; consult `SNAPSHOT.md` only when restore context or
> historical ambiguity requires it.

---

## Layer 0 Role

- Layer 0 confirms current governed-unit state, blocker/hold posture, audit posture, and
  governance exceptions.
- Layer 0 does not originate ordinary product delivery sequencing.
- Ordinary product sequencing is read from the product-truth authority stack listed below.

## Control-Plane Read Order

1. `governance/control/OPEN-SET.md`
2. `governance/control/NEXT-ACTION.md`
3. `governance/control/BLOCKED.md`
4. `governance/control/SNAPSHOT.md` only when restore context or historical ambiguity matters

## Live Canon Package

| Role | File |
| --- | --- |
| Repo/runtime baseline truth | `governance/analysis/TEXQTIC-REPO-TRUTH-BASELINE-AND-GOVERNANCE-RESET-OPTIONS-2026-04-09.md` |
| Opening-layer taxonomy truth | `governance/control/TEXQTIC-OPENING-LAYER-TAXONOMY-TRUTH-BASELINE-2026-04-09.md` |
| Canon-and-pointer decision | `governance/analysis/TEXQTIC-OPENING-LAYER-CANON-AND-POINTER-SET-DECISION-2026-04-10.md` |

## Live Control Set

| Role | File |
| --- | --- |
| Opening-layer governance authority/pointer layer | `governance/control/TEXQTIC-OPENING-LAYER-GOVERNANCE-AUTHORITY-AND-POINTER-LAYER-2026-04-10.md` |
| Opening-layer sequencing authority | `governance/control/TEXQTIC-OPENING-LAYER-SEQUENCING-AND-NEXT-CYCLE-ENTRY-2026-04-10.md` |
| Layer 0 open-set control surface | `governance/control/OPEN-SET.md` |
| Layer 0 next-action pointer | `governance/control/NEXT-ACTION.md` |
| Layer 0 blocked/hold register | `governance/control/BLOCKED.md` |
| Layer 0 snapshot | `governance/control/SNAPSHOT.md` |

## Product-Truth Authority Stack

| Role | File |
| --- | --- |
| Preserved gap baseline | `docs/product-truth/TEXQTIC-GAP-REGISTER-v1.md` |
| Preserved dependency-ordered roadmap baseline | `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v1.md` |
| Preserved immediate-delivery baseline | `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v1.md` |

## Operating Notes

- Governing posture: `HOLD-FOR-BOUNDARY-TIGHTENING` remains in effect.
- TECS-B2B-BUYER-CATALOG-BROWSE-001 Phase 1 is VERIFIED_WITH_NON-BLOCKING_NOTES (2026-05-08).
  Verification artifact: docs/TECS-B2B-BUYER-CATALOG-BROWSE-001-VERIFICATION-v1.md.
  All static gates passed. Runtime API checks pending production verification.
- TECS-B2B-BUYER-CATALOG-SUPPLIER-SELECT-001 is VERIFIED_COMPLETE (2026-04-24).
  Parent buyer-side catalog supplier-select unit closed after all bounded implementation and
  verification sub-units completed: buyer-safe supplier selection, buyer nav boundary isolation,
  active-state/header polish, production verification, and neighbor-path compatibility checks.
  Route binding fix: commit `1e499ad`. Boundary violations: BV-001 FIXED, BV-002/BV-003/BV-005 FIXED, BV-004 BY-DESIGN.
  Sub-unit chain: TECS-B2B-BUYER-NAV-BOUNDARY-FIX-001 VERIFIED_COMPLETE (fba9f2e + ec78e65);
  TECS-B2B-BUYER-NAV-POLISH-001 VERIFIED_COMPLETE (0ea9c67 + 65b37ef).
  Docs: docs/TECS-B2B-BUYER-CATALOG-SUPPLIER-SELECT-001-v1.md, docs/TECS-B2B-BUYER-CATALOG-SUPPLIER-SELECT-001-VERIFICATION-v1.md.
  Note: current catalog access is intentionally launch-accelerated and too open long-term.
  Future relationship-scoped buyer catalog visibility requires a separate design/product cycle.
  Phase 3+ items (supplier selection UX polish, search, item detail, price disclosure,
  buyer-supplier allowlist) remain candidates only — each requires explicit human authorization.
- TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001 is VERIFIED_COMPLETE (2026-04-25).
  Unit scope: Keyword Search MVP — server-side keyword search (name + sku, case-insensitive OR).
  Design commits: a1b41d5 (original) + aa0b9a6 (amendment). Implementation commit: 4aaa8a3.
  Design artifact: docs/TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001-DESIGN-v1.md.
  Slices delivered: Slice 1 backend q param + Prisma OR filter; Slice 2 service q param;
    Slice 3+4 frontend state + search input + debounce (350ms) + Load More passthrough;
    Slice 5 new test file (19/19 PASS).
  Validation: frontend tsc --noEmit PASS; search tests 19/19 PASS; catalog listing regression
    31/31 PASS; supplier-selection regression 18/18 PASS; full suite pre-existing failures only.
  Production: https://app.texqtic.com, actor qa.buyer@texqtic.com.
    M-SEARCH-1 through M-SEARCH-9 PASS; M-SEARCH-10 N/A (14-item catalog, no nextCursor).
  No schema changes. No textile filters. No price. No PDP. No RFQ expansion.
  Mandatory next-cycle carry-forward (NOT to be opened without Paresh explicit authorization):
    TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001
    (full textile attr schema + migration + supplier data-entry + buyer filter UI).
- TECS-B2B-BUYER-CATALOG-LISTING-001 is VERIFIED_COMPLETE (2026-04-24).
  Design commits: c5cdcb5 + 9c4f4f6. Implementation commit: f6ff2a8. Truth sync: a2c907f.
  Design artifact: docs/TECS-B2B-BUYER-CATALOG-LISTING-001-DESIGN-v1.md.
  Slices delivered: state isolation (buyerCatalogLoadingMore + buyerCatalogLoadMoreError);
  supplier header cleanup + card polish (remove 'Viewing' badge, MOQ → 'Min. Order: N',
  image lazy load + fallback label 'No image', card spacing + weight refinement);
  two-sentence empty state; focused listing tests (32/32 PASS, new test file).
  Validation: frontend TS PASS; focused listing tests 32/32 PASS;
  supplier-selection regression 17/17 PASS; full suite pre-existing failures only.
  Runtime verdict: RUNTIME_VERIFIED_WITH_NON_BLOCKING_NOTES.
  Production: https://app.texqtic.com, actor qa.buyer@texqtic.com, 9/9 executable checks PASS.
  Non-executable in production (covered by unit tests): M9 image fallback (all seed images valid),
    M11/M12/M13 Load More (14-item catalog, no nextCursor), M14 initial load failure.
  Blockers: none.
  Changed files: App.tsx (modified), tests/b2b-buyer-catalog-listing.test.tsx (created).
  No search/filter/sort/PDP/pricing/RFQ/backend/API/schema/auth changes.
- TECS-B2B-BUYER-MARKETPLACE-BOUNDARY-DESIGN-001 is DESIGN_COMPLETE (2026-05-08).
  Design artifact: docs/TECS-B2B-BUYER-MARKETPLACE-BOUNDARY-DESIGN-001-v1.md.
  5 boundary violations identified: BV-001 FIXED, BV-002/BV-003/BV-005 FIXED, BV-004 BY-DESIGN.
  TECS-B2B-BUYER-NAV-BOUNDARY-FIX-001 is VERIFIED_COMPLETE (commits fba9f2e + ec78e65).
  Verification artifact: docs/TECS-B2B-BUYER-NAV-BOUNDARY-FIX-001-DEEP-VERIFICATION-v1.md.
- TECS-B2B-BUYER-NAV-POLISH-001 is VERIFIED_COMPLETE (2026-04-24).
  Implementation commit: `0ea9c67` — layouts/Shells.tsx only (+ docs record).
  IC-001 closed: desktop B2B sidebar active-state CSS added.
  IC-003 closed: B2B mobile menu active-state support added (MobileShellMenu backward-compatible fix).
  NB-001 closed: header identity replaced — {tenant.name} / {shellLabel} confirmed in production.
  Production evidence: header shows 'QA Buyer / B2B WORKSPACE'; Catalog sidebar item shows blue active pill.
  Verification artifact: docs/TECS-B2B-BUYER-NAV-POLISH-001-v1.md.
- TECS-B2B-BUYER-SUPPLIER-SELECTION-UX-REFINE-001 is IMPLEMENTATION_COMPLETE (2026-04-24).
  Design commit: 0c47d7e. Implementation commit: 3e9086a.
  Design artifact: docs/TECS-B2B-BUYER-SUPPLIER-SELECTION-UX-REFINE-001-DESIGN-v1.md.
  All four implementation slices delivered: card visual clarity (slug removed, primarySegment chip,
  full-card clickable with keyboard support), Phase B selected-state polish + Retry, empty/loading/error
  standardization, buyer catalog test coverage (new test file, 17/17 passing).
  Validation: frontend tsc --noEmit PASS; focused tests 17/17 PASS; full suite 471 PASS /
  7 known pre-existing server-integration failures (unrelated to this unit).
  Runtime status: pending production/manual verification before final close.
  Changed files: App.tsx (modified), tests/b2b-buyer-catalog-supplier-selection.test.tsx (created).
- Layer 0 posture: `DESIGN_COMPLETE_AMENDED` — TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001 Keyword Search MVP design
  amended (2026-04-24). Awaiting Paresh implementation authorization.
- Prior governance slices `B2C_PUBLIC_FINAL_READINESS_REASSESSMENT_SLICE` (commit `3ad5417`) and
  `B2C_WL_CO_SLICE3_COMPATIBILITY_REASSESSMENT_SLICE` (commit `1f01a84`) are closed as pre-opening gates.
- `PUBLIC_B2B_DISCOVERY_IMPLEMENTATION_SLICE` closed `VERIFIED_COMPLETE` (commit `04dc375`, 2026-04-22).
  All three bounded deliverables confirmed: `PUBLIC_B2B_DISCOVERY` AppState in `App.tsx`; B2B
  discovery page component (`components/Public/B2BDiscovery.tsx`); homepage B2B CTAs upgraded from
  temporary scroll behavior to `setAppState('PUBLIC_B2B_DISCOVERY')` state transition.
- `PUBLIC_B2C_PROJECTION_PRECONDITION_IMPLEMENTATION_SLICE` closed `VERIFIED_COMPLETE` (commit `7baf50a`, 2026-04-22).
  Three deliverables confirmed: `server/src/services/publicB2CProjection.service.ts` (5-gate B2C projection
  service); `GET /api/public/b2c/products` registered in `server/src/routes/public.ts`; 10/10 unit tests passing.
- `B2C_PUBLIC_DATA_POSTURE_ASSIGNMENT_SLICE` closed `VERIFIED_COMPLETE` (commit `6dbc5e9`, 2026-04-22).
  `qa-b2c` tenant (`isWhiteLabel:false`) assigned `publicEligibilityPosture=PUBLICATION_ELIGIBLE`,
  org `publication_posture=B2C_PUBLIC`, all three catalog items `publicationPosture=B2C_PUBLIC`.
  `GET /api/public/b2c/products` confirmed returning one truthful non-placeholder B2C result (HTTP 200).
  Image URLs preserved (zero drift). No WL-parented tenants touched.
- `PUBLIC_B2C_BROWSE_IMPLEMENTATION_SLICE` closed `VERIFIED_COMPLETE` (commits `34a6f84` + `d78fa79`, 2026-04-22).
  All four bounded deliverables confirmed: `PUBLIC_B2C_BROWSE` AppState in `App.tsx`; B2C browse page
  component (`components/Public/B2CBrowsePage.tsx`); `case 'PUBLIC_B2C_BROWSE'` render case in App.tsx;
  all B2C CTAs upgraded from `selectNeutralPublicEntryPath('B2C')` scroll to
  `setAppState('PUBLIC_B2C_BROWSE')` state transition. Closure basis: production verification
  `VERIFIED_PRODUCTION_PASS` at `https://app.texqtic.com/`. In-scope production wording fix applied
  in `d78fa79`. Runtime, schema, and data unchanged throughout.
- D-016 posture: **ACTIVE** — zero active product-delivery units; decision control required per D-016.
- D-015 post-close authority reconciliation: complete (2026-04-22).
- D-013 carry-forward result: `SUCCESSOR_CHAIN_PRESERVED`.
  D-020 artifact: `governance/decisions/TEXQTIC-PUBLIC-MARKET-ACCESS-FAMILY-SUCCESSOR-CHAIN-D020-v1.md`.
- All prior product-delivery units (`PUBLIC_B2B_PROJECTION_PRECONDITION_IMPLEMENTATION_SLICE`,
  `PUBLIC_B2B_DISCOVERY_IMPLEMENTATION_SLICE`, `PUBLIC_B2C_PROJECTION_PRECONDITION_IMPLEMENTATION_SLICE`,
  `B2C_PUBLIC_DATA_POSTURE_ASSIGNMENT_SLICE`, and `PUBLIC_B2C_BROWSE_IMPLEMENTATION_SLICE`) are closed.
  Their design authorities remain locked historical evidence only.
- Planning-package recommendations outside the product-truth authority stack remain guidance and
  decision input only, not live authority.
- Preserved aligned anchors, including the closed onboarding-family handoff chain, remain outside
  the live canon package and outside the live control set.
- The old `-v2` chain remains historical evidence and reconciliation input only.
