# OPEN-SET.md — Layer 0 Governed Posture and Read Order

**Layer:** 0 — Control Plane  
**Authority:** governance/control/TEXQTIC-OPENING-LAYER-GOVERNANCE-AUTHORITY-AND-POINTER-LAYER-2026-04-10.md  
**Last Updated:** 2026-04-26 (TECS-B2B-RFQ-STRUCTURED-REQUIREMENT-001 — DESIGN_COMPLETE)

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
- TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001 is VERIFIED_COMPLETE (2026-04-24).
  Status: VERIFIED_COMPLETE. Runtime verdict: RUNTIME_VERIFIED_WITH_NON_BLOCKING_NOTES.
  Unit scope: Textile attribute schema (9 new nullable columns on catalog_items) + supplier data entry
    extension + buyer filter bar + AI-readable attribute contract + G-028 vectorText extension.
  Design artifact: docs/TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001-DESIGN-v1.md.
  Design commit: fa1dcc9. Implementation commit: 1d63513. Truth-sync commit: 77457a6.
  Hotfix commit: ec91ad2 — fix certification filter column mapping (image_url AS "imageUrl").
  Attribute fields: product_category, fabric_type, gsm, material, composition, color, width_cm,
    construction, certifications (JSONB). All nullable. No new tables.
  SQL migration applied (ALTER TABLE + 6 CREATE INDEX, no errors). Prisma db pull PASS. Prisma generate PASS.
  Validation: TypeScript tsc --noEmit PASS. 108/108 tests PASS (6 focused suites).
  Changed files (9): migration.sql, schema.prisma, catalogService.ts, tenant.ts, App.tsx,
    openapi.tenant.json, b2b-supplier-catalog-attributes.test.tsx,
    b2b-buyer-catalog-filters.test.tsx, b2b-buyer-catalog-ai-contract.test.tsx.
  Production verification:
    - Supplier add/edit textile attributes: verified.
    - Buyer filter bar: verified.
    - productCategory, material, GSM filters: HTTP 200, active badge, correct empty state.
    - Certification filter (GOTS): initial HTTP 500 found; hotfix ec91ad2 applied;
      post-hotfix verification confirmed HTTP 200 with clean empty state.
    - Keyword + filter composition (AND-compose): verified.
    - RFQ dialog regression: verified (opens correctly).
  Blockers: none.
  Non-blocking notes:
    - Some QA B2B fixture items have null textile attributes, so some visual chip/filter result
      cases are fixture-limited; not a code defect.
    - Clear Filters requires Apply Filters to reload; existing behavior, not a blocker.
  Adjacent deferred unit: TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001.
    Reason: Yarn is a core textile supply-chain material requiring stage-specific attribute modeling.
  Non-goals preserved: AI matching, embeddings, vector search, RFQ AI, PDP, price disclosure,
    relationship-scoped access, cross-supplier search, bulk attribute assignment.
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
- TECS-AI-FOUNDATION-DATA-CONTRACTS-001 is IMPLEMENTATION_COMPLETE (2026-04-26).
  Design artifact: docs/TECS-AI-FOUNDATION-DATA-CONTRACTS-001-DESIGN-v1.md.
  Implementation commit: f671995.
  Scope: Constitutional AI data contracts and guardrails — design + full test implementation.
  Test files (4): ai-data-contracts.test.ts, ai-context-packs.test.ts,
    ai-explainability-contracts.test.ts, ai-forbidden-data.test.ts.
  Tests: 163/163 PASS. TypeScript PASS.
  Sections: A (AI data access matrix), B (forbidden data), C (action boundary), D (explainability
    contract), E (storage contract), F (read models / context packs), G (supplier-buyer matching
    foundation), H (RFQ intelligence foundation), I (profile completeness foundation),
    J (document intelligence foundation), K (trade workflow assistant foundation),
    L (market intelligence foundation — operator-only), M (trust score foundation),
    N (tenant / RLS / security contract), O (audit / observability contract),
    P (AI provider / model abstraction), Q (future implementation roadmap — 8 units).
  Key findings from repo truth inspection:
    - G-028 A1–A7 vector infrastructure: VERIFIED COMPLETE (DocumentEmbedding, querySimilar,
      ingestSourceText, ragContextBuilder, vectorWorker, AI event schemas, budget metering).
    - Embedding model text-embedding-004, dim 768 LOCKED (ADR-028 §5.1).
    - Inference model gemini-1.5-flash confirmed. GEMINI_API_KEY required.
    - price + publicationPosture explicitly excluded from all AI paths (constitutional).
    - D-020-C aiTriggered pattern established on TradeLifecycleLog, EscrowLifecycleLog,
      CertificationLifecycleLog, PendingApproval.
    - catalogItemAttributeCompleteness() live, stage-aware, [0,1], transient (not stored).
    - PII guard (piiGuard.ts): pre-send redaction + post-receive scan confirmed.
    - Budget enforcement, rate limit (60/min/tenant), idempotency (24h) confirmed.
    - OP_G028_VECTOR_ENABLED feature flag gates all RAG retrieval.
  Future units identified (Q.1–Q.8): each requires explicit Paresh authorization before opening.
  No schema changes. No API additions. No frontend changes.
- TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001 is VERIFIED_COMPLETE (2026-04-25).
  Status: VERIFIED_COMPLETE. Runtime verdict: RUNTIME_VERIFIED_WITH_NON_BLOCKING_NOTES.
  Design artifact: docs/TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001-DESIGN-v1.md.
  Design commit: 96763db. Backend/Foundation commit: ad3568d. Frontend/UI commit: 3fe5a8a.
  Truth-sync commit: 4fd9806.
  Architecture: Option C Hybrid — catalog_stage VARCHAR(50) + stage_attributes JSONB on
    catalog_items; existing 9 fabric columns preserved unchanged; full backward compatibility.
  Stage taxonomy: 14 values (YARN, FIBER, FABRIC_WOVEN, FABRIC_KNIT, FABRIC_PROCESSED,
    GARMENT, ACCESSORY_TRIM, CHEMICAL_AUXILIARY, MACHINE, MACHINE_SPARE, PACKAGING,
    SERVICE, SOFTWARE_SAAS, OTHER).
  Delivered slices:
    - SQL migration: catalog_stage + stage_attributes JSONB + 2 indexes applied.
    - Prisma db pull + generate PASS.
    - Backend validation: stage-specific required fields per catalogStage value.
    - Supplier POST/PATCH: catalogStage + stageAttributes in payload.
    - Buyer filter: catalogStage query param forwarded.
    - AI contract: buildCatalogItemVectorText + catalogItemAttributeCompleteness stage-aware.
    - OpenAPI contract updated.
    - Supplier add/edit form: stage selector + 6 dynamic stage-field sections.
    - Buyer filter UI: <select id="buyer-catalog-stage-filter"> with CATALOG_STAGE_VALUES.
    - Buyer item card: catalogStage chip (violet, replace _ with space).
    - Legacy null catalogStage compatibility preserved.
  Validation:
    - TypeScript tsc --noEmit PASS (both slices).
    - 9 test files / 135 tests PASS.
    - Backend/foundation tests PASS. Frontend/UI tests PASS.
  Production verification: https://app.texqtic.com, actor qa.buyer@texqtic.com.
    30/32 M-STAGE checks PASS. 2/32 LIMITED (multi-tenant chip constraint, code-confirmed).
    Stage selector works. Stage-specific fields render. Items created. Stage filter works.
    Stage filter composes with keyword. Legacy items unaffected. No price/AI exposure.
    RFQ unaffected.
  Non-blocking notes:
    FABRIC_WOVEN: no dynamic fields — BY DESIGN (existing 9 textile fields cover stage).
    Chip rendering limited verification (multi-tenant constraint); code implementation confirmed.
    UI/schema mismatch: enum stageAttributes fields allow free text; backend enforces strict enums.
  Non-goals preserved: No AI matching, no price disclosure, no PDP, no RFQ expansion,
    no cross-supplier search, no bulk import, no service marketplace workflow,
    no Phase 4+ ServiceCapability model.
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
- TECS-B2B-RFQ-STRUCTURED-REQUIREMENT-001 is DESIGN_COMPLETE (2026-04-26).
  Design artifact: docs/TECS-B2B-RFQ-STRUCTURED-REQUIREMENT-001-DESIGN-v1.md.
  Scope: Structured RFQ requirement layer — design only, no implementation authorized.
  Sections: A (current baseline — 2 fields), B (field evaluation matrix), C (stage-aware JSONB
    requirement attributes — 14 stages), D (schema architecture options — Option C Hybrid RECOMMENDED),
    E (AI-readable requirement context contract — StructuredRFQRequirementContext), F (buyer UX
    progressive disclosure), G (supplier UX / response impact), H (API design — backward-compat),
    I (migration / compat), J (audit / field source governance), K (testing plan), L (production
    verification plan), M (non-goals — 12 explicit exclusions), N (7 implementation slices),
    O (governance compliance), P (risks).
  Architecture recommendation: Option C Hybrid — 9 typed columns + stage_requirement_attributes JSONB;
    mirrors TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001 precedent.
  Key decisions:
    - buyer_message and quantity RETAINED unchanged at DB and API level.
    - All new columns nullable; full backward compatibility.
    - price, publicationPosture, delivery_location, target_delivery_date excluded from AI paths.
    - humanConfirmationRequired: true preserved (requirement_confirmed_at timestamp).
    - AI_SUGGESTED FieldSource reserved; not used until TECS-AI-RFQ-ASSISTANT-MVP-001 authorized.
    - 7 implementation slices defined; none authorized; each requires Paresh sign-off.
  No implementation changes. No schema changes. No API additions. No frontend changes.
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
