# TEXQTIC-PUBLIC-ATTRACTION-AND-D2C-ENABLEMENT-REPO-TRUTH-AUDIT-001

Mode: STRICT REPO-TRUTH AUDIT / GOVERNANCE-ONLY / SAFE-WRITE REPORT ONLY

## Scope and Method
- Read-only repo-truth audit.
- Layer 0 control files treated as first authority for opening posture.
- Runtime code treated as primary implementation truth where docs and code differ.
- No runtime/product/schema/contract/test implementation performed.

## A) Layer 0 and governance posture
1. Open units relevant to this topic:
- No new public-attraction or D2C implementation unit is opened by this audit.
- Layer 0 posture in current files indicates hold-oriented governance state (authorization/counsel gating still active for delivery opening sequence).

2. Investigation vs implementation permission:
- Current posture supports investigation/reporting.
- This artifact does not constitute implementation authorization.

3. Relevance of held families (Trade Trust Pay, Network Connection, CRM, WL):
- These hold families are relevant as boundary constraints and contamination risks.
- They are not required to complete this repo-truth investigation.

4. Before lawful implementation opening:
- A separate bounded governance opening decision is required for whichever next slice is selected.
- Contract/runtime parity and boundary definitions should be explicit before opening execution slices.

5. Layer 0 mutation confirmation:
- Confirmed: no Layer 0 control file was modified.

## B) Current public unauthenticated page inventory
| Surface | Classification | Repo truth summary |
|---|---|---|
| General homepage/landing | PRESENT_RUNTIME | Public entry state exists in app state machine and renders neutral/public attraction UI |
| B2B public discovery | PRESENT_RUNTIME | Public B2B discovery component + client + backend route present |
| B2C public browse | PRESENT_RUNTIME | Public B2C browse component + client + backend route present |
| D2C public drops | NOT_EVIDENCED | No dedicated runtime route/component for public D2C drops found |
| Aggregator public directory preview | NOT_EVIDENCED | Aggregator runtime exists, but as authenticated workspace, not public preview |
| Trust/origin/passport pages | PARTIAL_RUNTIME | Public DPP passport route/page exists; broader trust/origin page family not found as dedicated public pages |
| Industry category pages | NOT_EVIDENCED | No dedicated public industry page runtime surfaces found |
| Regional cluster pages | NOT_EVIDENCED | No dedicated public cluster page runtime surfaces found |
| Public education/story pages | DEPRECATED_OR_AMBIGUOUS | Story-like planning language exists; no clear dedicated public story runtime routes found |
| Public profile pages | PRESENT_RUNTIME | Public supplier profile page and route by slug are present |
| Public product detail pages | NOT_EVIDENCED | Public browse preview exists; no clear public product-detail route/page family found |
| Public storefront pages | PARTIAL_RUNTIME | Public B2C browse storefront-like entries exist, but no dedicated storefront route family identified |

## C) Public/authenticated boundary findings
For public surfaces currently implemented (entry, B2B discovery, B2C browse, supplier profile, inquiry, public DPP):
- Uses public-safe projection patterns: YES for B2B/B2C profile/browse routes and services.
- Uses publication/eligibility gating: YES (publication posture + tenant eligibility gates are explicit in public projection services/routes).
- Exposes only public-approved data: PARTIAL YES (designed and tested for redaction in projection tests; keep parity checks active).
- CTA-led auth handoff: YES (public components drive sign-in/continue flows).
- Avoids transaction ownership in public pages: YES (cart/checkout/orders remain authenticated tenant surfaces).
- Avoids private B2B pricing in B2B public projection: YES.
- Avoids order/checkout/account state in public projection: YES.
- Avoids admin/seller/internal data in public projection: YES by design/test intent.
- Avoids raw tenant/org IDs in public payloads: YES in tested projection outputs.
- Avoids CRM/legal/private workflow state: YES in observed public payload shapes.

## D) B2B public discovery truth
What exists:
- Public supplier discovery route for B2B list.
- Public supplier profile by slug.
- Pre-auth public inquiry submit route.
- Projection service with explicit five-gate model and prohibited-field exclusions.

What is projection-gated:
- Supplier eligibility posture.
- Organization publication posture.
- Organization type/status checks.
- Output redaction/public-safe payload.

What is private/auth-only:
- Aggregator discovery intelligence route.
- Tenant operations, order/trade/account flows.

What is missing for broader public B2B discovery breadth:
- Explicit public directory families for all participant classes (consultants/logistics/cert agencies as separate surfaces).
- Dedicated public region/cluster/category directories.
- Broader public profile taxonomy navigation surfaces.

Readiness statement:
- Public B2B discovery baseline exists and is projection-gated.
- Expansion into broader directory intelligence needs bounded architecture and scope decisions.

## E) B2C public browse truth
1. PUBLIC_B2C_BROWSE state/page: PRESENT.
2. B2C public browse component: PRESENT.
3. Public B2C backend endpoint: PRESENT (/api/public/b2c/products).
4. Public-safe projection service: PRESENT (publicB2CProjection service).
5. Storefront/product preview payload: PRESENT (preview items, limited fields).
6. Public price behavior: PRESENT (public price visibility in B2C projection).
7. Material/origin/trust fields: PARTIAL (not a broad dedicated trust-origin story surface in B2C browse payload).
8. Sign-in/auth handoff: PRESENT.
9. Cart/checkout/order boundary: PRESENT (authenticated tenant routes own these).
10. Wishlist/returns evidence: wishlist model not evidenced; clear public returns continuity not evidenced.
11. Shared OpenAPI/contract parity: PARTIAL/MISMATCH (runtime public B2C endpoint present; not found in shared OpenAPI checks used in this audit).

Classification:
- implemented baseline

## F) D2C / Verified Drops truth
| Capability | Classification | Repo truth |
|---|---|---|
| D2C terminology in planning docs | PLANNING_ONLY | D2C concepts appear in planning/governance text |
| Drops/capsules/launchpad runtime surfaces | NOT_EVIDENCED | No dedicated runtime public route/component family found |
| D2C product drafts/readiness checklist | PLANNING_ONLY | Planning language exists; no implemented checklist flow found |
| Stakeholder-to-consumer productization runtime | SHOULD_NOT_BE_ASSUMED | Not evidenced as a dedicated implemented layer |
| Drop listing/detail pages | NOT_EVIDENCED | No explicit drop listing/detail route families found |
| Stakeholder credit model | PLANNING_ONLY | Not evidenced as runtime structure in audited surfaces |
| Origin story model | PARTIAL_RUNTIME | DPP public passport exposes some origin-related attributes; not a full D2C story engine |
| Product/trust passport model | PARTIAL_RUNTIME | Public DPP passport route exists |
| D2C publication flow | NOT_EVIDENCED | No dedicated D2C publication pipeline identified |
| D2C-to-B2C projection | SHOULD_NOT_BE_ASSUMED | B2C public projection exists, but dedicated D2C projection semantics are not explicit |
| D2C auth handoff | PLANNING_ONLY | CTA/auth handoff patterns exist generally; no dedicated D2C handoff surface found |
| D2C demand signal tracking | NOT_EVIDENCED | No dedicated D2C demand telemetry slice found |

## G) Aggregator public preview truth
1. Does Aggregator exist?:
- YES as runtime + prior planning/governance history.

2. Public preview surfaces?:
- Not evidenced as dedicated unauthenticated aggregator preview pages/routes.

3. Authenticated-only intelligence?:
- YES. Aggregator discovery route and workspace are authenticated tenant surfaces.

4. Public pages exposing aggregator-like functionality?:
- No clear dedicated public aggregator page found; do not infer from authenticated workspace.

5. Category/cluster/capability/profile directories present?:
- Partial capability data appears in projection/services, but dedicated public directory page family is not evidenced.

6. Overexposure risk:
- High if authenticated aggregator capabilities are overread as public.

Readiness classification:
- authenticated-only
- requires boundary decision

## H) Trust / origin / passport truth
Supported in current repo truth:
- Trust signals/certification summaries in public B2B projection.
- Public DPP passport endpoint/page with PUBLISHED posture boundary.
- Public-safe DPP security hardening tests and constraints.

Partially supported / constrained:
- Origin-related details exist in DPP-oriented models/payloads.
- Broader trust-origins public page family (separate from DPP view) not clearly evidenced.

Must remain authenticated/private:
- Private evidence docs and internal certification controls.
- Operational/private tenant identifiers and governance internals.

## I) SEO / industry / cluster public pages
1. Industry category pages: NOT_EVIDENCED as dedicated runtime public pages.
2. Regional cluster pages: NOT_EVIDENCED as dedicated runtime public pages.
3. Public story pages: NOT_EVIDENCED as dedicated runtime route family.
4. Public slug routing: PARTIAL (supplier slug/profile and public passport token routing exist).
5. Dynamic public landing pages: PARTIAL (public entry + projection-driven pages exist).
6. SEO metadata: PARTIAL (general app/web config exists; no dedicated audited SEO page engine found).
7. Sitemap/robots behavior: PARTIAL (DPP public security work indicates robots/noindex controls for passport surfaces).
8. Publication gating for SEO pages: NOT_EVIDENCED for dedicated industry/cluster SEO surfaces.

Classification summary:
- existing: partial slug-based public surfaces
- partial: general public entry + supplier/profile/passport paths
- not evidenced: dedicated industry/cluster public page system
- risky if public without projection gating: YES

## J) Data and schema posture
Observed schema truths relevant to this audit:
- Tenant public eligibility posture exists.
- Organization/catalog publication posture fields exist.
- Publication vocabulary includes B2B_PUBLIC, B2C_PUBLIC, BOTH, private posture values.
- Cart/order models exist.
- Wishlist model not found in this audit pass.
- Explicit drop/capsule/collection model family not found in this audit pass.
- DPP/passport state/token and related models exist.
- AGGREGATOR org type exists.
- Dedicated cluster/category schema entities for public SEO pages not clearly evidenced in this pass.

## K) Contract/runtime parity
Endpoint checks:
1. /api/public/b2c/products
- runtime exists: YES
- contract exists: NOT FOUND in checked shared OpenAPI paths
- tests exist: YES (public B2C projection tests)
- envelope aligned: YES (service/route pattern aligned to success/data/error style)
- redaction tested: YES
- missing from OpenAPI: LIKELY YES

2. /api/public/b2b/suppliers
- runtime exists: YES
- contract exists: NOT FOUND in checked shared OpenAPI paths
- tests exist: YES (public B2B projection tests)
- envelope aligned: YES
- redaction tested: YES
- missing from OpenAPI: LIKELY YES

3. /api/public/supplier/{slug}
- runtime exists: YES
- contract exists: YES in tenant OpenAPI
- tests exist: YES
- envelope aligned: YES
- redaction tested: YES

4. /api/public/inquiry/submit
- runtime exists: YES
- contract exists: YES in tenant OpenAPI
- tests exist: YES
- envelope aligned: YES
- redaction tested: PARTIAL (validation/privacy assertions present)

5. /api/public/dpp/{publicPassportId}
- runtime exists: YES
- contract exists: NOT FOUND in checked shared OpenAPI paths
- tests exist: YES (public passport/security tests)
- envelope aligned: YES route pattern
- redaction tested: YES
- missing from OpenAPI: LIKELY YES

6. /api/public/entry/resolve and tenant-resolve helpers
- runtime exists: YES in public routes
- contract exists: NOT FOUND in checked shared OpenAPI paths
- tests exist: not confirmed in this pass

## L) Architecture input map
| Layer | Runtime truth | Planning truth | Missing pieces | Risks | Likely file surfaces | Status |
|---|---|---|---|---|---|---|
| Public Attraction Layer | Partial multipage public runtime exists | Strong planning intent exists | Unified public router + parity sync | scope drift | App.tsx, components/Public, server/src/routes/public.ts | IMPLEMENTATION_PRESENT + CONTRACT_GATED |
| General Public Homepage/Router | Public entry state exists | Planning supports multi-door entry | explicit route decomposition | overloading app-state transitions | App.tsx | IMPLEMENTATION_PRESENT |
| B2B Public Discovery | Live public list/profile/inquiry | Planning aligns | richer participant classes/directories | private data leakage if widened incorrectly | components/Public/B2BDiscovery.tsx, services/publicB2BService.ts, publicB2BProjection.service.ts | IMPLEMENTATION_PRESENT |
| B2C Public Browse | Live public browse baseline | Planning aligns | contract sync + richer trust content | overread into public checkout ownership | components/Public/B2CBrowse.tsx, services/publicB2CService.ts, publicB2CProjection.service.ts | IMPLEMENTATION_PRESENT + CONTRACT_GATED |
| D2C Verified Drops | Not dedicated runtime | Planning/design language exists | dedicated models/routes/pages | false assumption of capability | docs/product-truth, governance/decisions, runtime not found | PLANNING_ONLY + DESIGN_GATED + DATA_GATED |
| Aggregator Public Directory Preview | No dedicated unauth preview | Aggregator planning exists | clear public preview boundary slice | overexposure of authenticated intelligence | components/Tenant/AggregatorDiscoveryWorkspace.tsx, services/aggregatorDiscoveryService.ts, tenant route | AUTHENTICATED_ONLY + REQUIRES_BOUNDARY_DECISION |
| Trust/Origin/Passport Public Pages | Public DPP route exists, B2B trust signals exist | Planning broadens trust posture | dedicated non-DPP trust page family | claim exposure without approval | components/Public/PublicPassport.tsx, server/src/routes/public.ts, DPP tests | PARTIAL_RUNTIME + DESIGN_GATED |
| SEO/Industry/Cluster Pages | Not clearly implemented | Planning mentions direction | explicit page model + routing + publication rules | SEO pages exposing ungated data | App.tsx/public components/planning docs | NOT_READY + DESIGN_GATED + DATA_GATED |
| Public-Safe Projection Layer | B2B/B2C projection services exist | Planning aligned | consolidation and parity standards | drift between services/contracts | server/src/services/publicB2BProjection.service.ts, publicB2CProjection.service.ts | IMPLEMENTATION_PRESENT |
| Publication/Eligibility Governance Layer | Gate checks are explicit | Planning aligned | cross-route consistency and contract declaration | inconsistent gate interpretation | schema.prisma, projection services, public routes | IMPLEMENTATION_PRESENT |
| Authenticated Handoff Layer | CTA handoff patterns present | Planning aligned | standardized handoff contract | UX/identity drift | App.tsx, public components | IMPLEMENTATION_PRESENT + CONTRACT_GATED |
| Authenticated Commerce/Account/Connection Layer | Cart/checkout/orders and aggregator discovery are authenticated | Planning aligned | held-family sequencing for adjacent domains | contamination with held families | server/src/routes/tenant.ts, tenant components/services | IMPLEMENTATION_PRESENT + GOVERNANCE_GATED |

## M) Risk register
1. Public pages becoming transaction owners by drift.
2. Raw tenant/private data leakage if projection gates are bypassed.
3. Runtime-contract drift for public endpoints not reflected in shared OpenAPI.
4. B2B private pricing exposure risk if B2B projection expands unsafely.
5. Aggregator overexposure risk (auth intelligence inferred as public capability).
6. D2C misframing as generic storefront instead of verified-drop enablement architecture.
7. Public browse overread as public checkout/order ownership.
8. Data sufficiency for broad public directories/drops not yet proven.
9. Trust/certification public claim governance may overrun evidence controls.
10. Held-family contamination risk (Trade Trust Pay, Network Connection, CRM, WL) if boundaries are not explicit.

## N) Candidate future slices (not opened)
1. Candidate: Public Attraction Layer Architecture Decision
- purpose: lock neutral public multi-door architecture and ownership boundaries.
- minimum likely file surface: governance/decisions only.
- excluded surfaces: runtime/schema/contracts.
- dependencies: this audit, Layer 0 opening authorization.
- verification: governance consistency check.
- readiness: READY_FOR_ARCHITECTURE_DISCUSSION

2. Candidate: Public Route/Contract Parity Sync
- purpose: align shared OpenAPI with existing public runtime endpoints.
- minimum likely file surface: shared/contracts/openapi.tenant.json (and parity notes/tests if approved).
- excluded surfaces: product behavior changes.
- dependencies: endpoint inventory freeze.
- verification: contract diff + route parity check.
- readiness: REQUIRES_CONTRACT_SYNC

3. Candidate: General Homepage Public Router Hardening
- purpose: normalize public entry routing/state transitions.
- minimum likely file surface: App.tsx and public navigation constants.
- excluded surfaces: commerce workflows.
- dependencies: boundary decision.
- verification: public navigation tests.
- readiness: REQUIRES_GOVERNANCE_OPENING

4. Candidate: B2B Public Discovery Expansion Planning
- purpose: define lawful expansion to broader participant/directory classes.
- minimum likely file surface: governance/decisions + product-truth docs.
- excluded surfaces: immediate runtime broadening.
- dependencies: taxonomy/data sufficiency.
- verification: projection gate matrix.
- readiness: REQUIRES_DESIGN_DECISION

5. Candidate: B2C Public Browse Contract Sync
- purpose: register existing B2C public endpoint in shared contracts.
- minimum likely file surface: shared/contracts/openapi.tenant.json.
- excluded surfaces: checkout/account changes.
- dependencies: payload freeze.
- verification: contract-to-route parity.
- readiness: REQUIRES_CONTRACT_SYNC

6. Candidate: D2C Verified Drops Architecture Decision
- purpose: define D2C as B2B-to-consumer enablement layer and boundaries.
- minimum likely file surface: governance/decisions and product-truth docs.
- excluded surfaces: immediate drop runtime implementation.
- dependencies: data model and publication policy decisions.
- verification: explicit boundary clauses.
- readiness: REQUIRES_DESIGN_DECISION

7. Candidate: D2C Readiness Checklist Design
- purpose: define stakeholder readiness criteria for verified drops.
- minimum likely file surface: docs/product-truth + governance decision.
- excluded surfaces: checkout/payment.
- dependencies: D2C architecture decision.
- verification: checklist traceability to schema/contracts.
- readiness: REQUIRES_DATA_PRECONDITION

8. Candidate: D2C Drop Listing/Detail Design
- purpose: define public drop listing/detail projections and CTA handoff.
- minimum likely file surface: design/governance docs first.
- excluded surfaces: implementation until opened.
- dependencies: D2C architecture + data preconditions.
- verification: projection/redaction test plan.
- readiness: NOT_READY / TOO_WIDE

9. Candidate: Trust/Origin Passport Planning
- purpose: unify public trust/origin narratives with DPP public controls.
- minimum likely file surface: governance/decisions + contracts planning.
- excluded surfaces: private evidence/document exposure.
- dependencies: trust claim governance constraints.
- verification: allowed-field matrix.
- readiness: READY_FOR_REPO_TRUTH_FOLLOWUP

10. Candidate: Aggregator Public Preview Boundary Decision
- purpose: decide whether/how a bounded unauthenticated aggregator preview may exist.
- minimum likely file surface: governance/decisions only initially.
- excluded surfaces: authenticated intelligence routes/services.
- dependencies: aggregator auth boundary truths.
- verification: clear public vs authenticated capability split.
- readiness: REQUIRES_DESIGN_DECISION

11. Candidate: Industry/Cluster SEO Page Planning
- purpose: define public SEO pages with projection gating and publication governance.
- minimum likely file surface: planning docs first.
- excluded surfaces: ungated public data exposure.
- dependencies: taxonomy/content data model.
- verification: SEO + projection gate checklist.
- readiness: REQUIRES_DATA_PRECONDITION

12. Candidate: Public-Safe Projection Consolidation
- purpose: normalize projection-service patterns and reduce drift.
- minimum likely file surface: service-layer design + contract docs first.
- excluded surfaces: broad behavior changes.
- dependencies: contract parity baseline.
- verification: redaction and gate regression tests.
- readiness: READY_FOR_REPO_TRUTH_FOLLOWUP

13. Candidate: Auth Handoff Context Contract Design
- purpose: standardize public-to-authenticated handoff context contract.
- minimum likely file surface: shared/contracts + frontend handshake docs.
- excluded surfaces: auth provider overhaul.
- dependencies: public surface map finalization.
- verification: handoff integration tests.
- readiness: REQUIRES_CONTRACT_SYNC

## Completion checklist
- [x] Layer 0 read and summarized
- [x] Existing public surfaces inventoried
- [x] B2B public discovery truth assessed
- [x] B2C public browse truth assessed
- [x] D2C/Verified Drops truth assessed
- [x] Aggregator public preview truth assessed
- [x] Trust/origin/passport truth assessed
- [x] SEO/industry/cluster public page truth assessed
- [x] Schema/data/publication posture inspected
- [x] Public route and contract parity checked
- [x] Public/authenticated ownership boundary assessed
- [x] Risk register produced
- [x] Candidate future slices listed but not opened
- [x] No product/runtime/schema/contract/test code modified
- [x] Exactly one governance analysis report created

## Stop statement
This audit is governance-only and report-only. No runtime/product/schema/route/service/test/contract implementation was performed. No implementation unit was opened.
