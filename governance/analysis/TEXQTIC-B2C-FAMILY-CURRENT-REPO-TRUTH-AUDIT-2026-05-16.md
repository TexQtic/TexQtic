# TEXQTIC — B2C Family Current Repo-Truth Audit (2026-05-16)

Audit ID: TEXQTIC-B2C-FAMILY-CURRENT-REPO-TRUTH-AUDIT-2026-05-16  
Mode: STRICT_REPO_TRUTH_AUDIT / GOVERNANCE_ONLY / SAFE_WRITE_REPORT_ONLY  
Status: COMPLETE (report-only)  
Date: 2026-05-16

## 1) Purpose

This artifact records current repo truth for the B2C family so final architecture discussion can proceed before any implementation unit is opened.

This audit does not authorize implementation, schema changes, route/service/frontend/test mutation, migration activity, Layer 0 mutation, or unit opening.

## 2) Layer 0 Control Read (Read-Only Authority)

Files read first as required:
- governance/control/OPEN-SET.md
- governance/control/NEXT-ACTION.md
- governance/control/BLOCKED.md
- governance/control/SNAPSHOT.md
- governance/control/DOCTRINE.md
- docs/governance/control/GOV-OS-001-DESIGN.md

Current Layer 0 posture observed:
- Active delivery posture: HOLD_FOR_AUTHORIZATION / no currently authorized product implementation opening in this audit scope.
- Next-candidate control posture: HOLD_FOR_COUNSEL_FEEDBACK in Layer 0 pointer context.
- Governance doctrine enforces one active unit at a time and explicit opening control (D-004, D-015, D-016).
- White Label Co remains REVIEW-UNKNOWN hold (non-blocking by default for unrelated bounded slices; fresh reassessment still required where overlap exists).

Relevance to this B2C investigation:
- TradeTrust Pay and Network Connection holds remain real, but do not block read-only B2C investigation.
- CRM staging dependency context remains real for CRM/Main Platform work, but does not block read-only B2C investigation.
- Investigation is lawful now; implementation opening still requires explicit governance authorization.

## 3) B2C Authority Stack Classification

### 3.1 Decision authority (locked/decided planning authority)

Read:
- governance/decisions/TEXQTIC-B2C-PUBLIC-BROWSE-CART-CHECKOUT-BOUNDARY-DECISION-v1.md
- governance/decisions/TEXQTIC-PUBLIC-MARKETPLACE-ARCHITECTURE-DECISION-v1.md
- governance/decisions/TEXQTIC-PUBLIC-VS-AUTHENTICATED-SURFACE-BOUNDARY-DECISION-v1.md
- governance/decisions/TEXQTIC-PUBLIC-VISIBILITY-AND-PROJECTION-MODEL-DECISION-v1.md
- governance/decisions/TEXQTIC-PUBLIC-DOWNSTREAM-PAGE-ARCHITECTURE-AND-SCOPE-DECISION-v1.md
- governance/decisions/TEXQTIC-PUBLIC-SHELL-AND-TRANSITION-ARCHITECTURE-DECISION-v1.md
- governance/decisions/TEXQTIC-NEUTRAL-PLATFORM-PUBLIC-ENTRY-SURFACE-DECISION-v1.md
- governance/decisions/GOV-DEC-B2C-FAMILY-REDUCTION-POST-PUBLIC-RUNTIME-PLANNING.md
- governance/decisions/TEXQTIC-B2C-PUBLIC-BROWSE-READINESS-ASSESSMENT-v1.md
- governance/decisions/TEXQTIC-B2C-PUBLIC-BROWSE-FINAL-READINESS-REASSESSMENT-v1.md

Authority truth from these decisions:
- B2C public posture is explicitly bounded to public-safe browse plus entry intent.
- Cart and wishlist intent are defined as public-triggered entry semantics.
- Checkout/account/order/returns/post-purchase continuity are explicitly authenticated/downstream ownership.
- Public projection model is two-tier gated: tenant eligibility + object publication posture.
- PUBLIC_B2C_BROWSE state/page architecture is decided at planning authority level.

### 3.2 Product-truth design authority (family planning anchors)

Read:
- docs/product-truth/B2C-OPERATING-MODE-DESIGN-v1.md
- docs/product-truth/B2C-LAUNCH-CONTINUITY-ARTIFACT-v1.md
- docs/product-truth/B2C-TENANT-BRANDED-COMMERCE-POST-SEAM-RECONCILIATION-v1.md
- docs/product-truth/CATALOG-DISCOVERY-PRODUCT-DATA-CONTINUITY-FAMILY-DESIGN-v1.md
- docs/product-truth/ORDERS-CHECKOUT-POST-PURCHASE-CONTINUITY-FAMILY-DESIGN-v1.md

Design truth from these anchors:
- B2C is a parent family, not just a browse seam.
- B2C must remain distinct from catalog/discovery family ownership and from downstream orders/checkout family ownership.
- Closed storefront browse continuity truth is valid but does not imply full B2C transaction-depth completion.

### 3.3 Historical/analysis inputs (supporting, not overriding runtime)

Read:
- governance/analysis/TEXQTIC-B2C-STOREFRONT-CONTINUITY-CLOSEOUT-SNAPSHOT-2026-04-10.md

Used as lineage context only; implementation reality in current code is treated as primary where wording differs.

## 4) Runtime Truth — Frontend Surfaces

Runtime files inspected:
- App.tsx
- layouts/Shells.tsx
- components/Public/B2CBrowse.tsx
- services/publicB2CService.ts
- components/Cart/Cart.tsx
- contexts/CartContext.tsx
- components/Tenant/EXPOrdersPanel.tsx (via runtime references)

### 4.1 What exists now

1. PUBLIC_B2C_BROWSE state exists in AppState.
- App.tsx includes 'PUBLIC_B2C_BROWSE'.

2. Public B2C browse page exists.
- components/Public/B2CBrowse.tsx renders B2C public browse with unauthenticated fetch from /api/public/b2c/products and sign-in CTA.

3. Neutral public entry CTAs to B2C browse are wired.
- App.tsx contains multiple setAppState('PUBLIC_B2C_BROWSE') entry actions.

4. Public B2C browse currently provides:
- storefront card list,
- limited product preview per storefront,
- public pricing visibility where available,
- sign-in handoff prompt.

5. Cart and checkout runtime exist in authenticated tenant shell.
- Cart drawer uses components/Cart/Cart.tsx.
- Checkout call uses POST /api/tenant/checkout.
- Successful checkout transitions to ORDER_CONFIRMED app state.

6. Orders continuity runtime exists in authenticated tenant shell.
- Orders panel wiring exists through components/Tenant/EXPOrdersPanel.tsx and /api/tenant/orders.

### 4.2 What is missing or not evident in runtime

1. Dedicated B2C wishlist bridge is not present.
- No wishlist route/component/service/model evidence found in inspected runtime surfaces.

2. Dedicated B2C returns/post-purchase returns flow is not evident as a B2C-specific surface.
- Orders continuity exists; returns-specific B2C continuity surface is not clearly implemented.

3. Public B2C browse currently does not evidence richer compare/filter/search depth in the standalone public page.
- Current page shape is storefront listing + preview cards, not full compare pipeline.

4. components/Marketplace, components/B2C, components/Storefront, components/Checkout directories are absent in current structure.
- B2C surfaces are implemented through App.tsx + components/Public + existing shared/tenant panels.

## 5) Runtime Truth — Backend / Projection / Routes

Runtime files inspected:
- server/src/routes/public.ts
- server/src/routes/tenant.ts
- server/src/services/publicB2CProjection.service.ts
- server/src/services/publicB2BProjection.service.ts

### 5.1 What exists now

1. Public B2C projection service exists.
- server/src/services/publicB2CProjection.service.ts enforces explicit projection gates and field restrictions.

2. Public B2C route exists.
- GET /api/public/b2c/products in server/src/routes/public.ts.

3. Public B2B route also exists (separate pillar).
- GET /api/public/b2b/suppliers.

4. Authenticated cart/checkout/orders routes exist in tenant routes.
- /api/tenant/cart, /api/tenant/cart/items, /api/tenant/checkout, /api/tenant/orders, /api/tenant/orders/:id, /api/tenant/orders/:id/status.

5. Response envelope helpers are used in routes.
- sendSuccess/sendError/sendValidationError pattern aligns with response-envelope contract shape.

### 5.2 Missing/partial contract alignment findings

1. Public B2C endpoint is not found in shared OpenAPI contracts inspected.
- /api/public/b2c/products is present in runtime route code, but not found in shared/contracts/openapi.tenant.json nor in shared/contracts/openapi.control-plane.json.

2. Public B2B suppliers list endpoint similarly lacks explicit OpenAPI path entry in inspected shared contract files.
- (A public supplier-by-slug endpoint is present in openapi.tenant.json.)

Implication:
- Runtime truth includes public B2C projection endpoints that appear ahead of contract registration in shared OpenAPI docs.

## 6) Data / Schema / Publication Posture Truth

Files inspected:
- server/prisma/schema.prisma
- server/prisma/migrations (targeted searches and migration listings)

### 6.1 Confirmed schema/data foundations

1. Tenant public eligibility posture exists.
- Tenant.publicEligibilityPosture enum supports NO_PUBLIC_PRESENCE, LIMITED_PUBLIC_PRESENCE, PUBLICATION_ELIGIBLE.

2. Publication posture exists on both organizations and catalog items.
- organizations.publication_posture (string-based constrained posture model at DB level).
- CatalogItem.publicationPosture (mapped to publication_posture).

3. B2C_PUBLIC and BOTH posture vocabulary is present and used by projection services.

4. Cart/order data models exist and are tenant-scoped.
- Cart, CartItem, Order, OrderItem models present and wired.

5. No wishlist model found in schema.

### 6.2 Data-readiness evidence limits

- Unit tests confirm projection gate behavior and payload sanitization logic.
- This audit did not run DB queries and does not claim current production/staging row counts for B2C-public-eligible storefront inventory.
- Therefore, runtime capability is confirmed, while live data sufficiency for broad public render remains a data-precondition question for future slices.

## 7) Public vs Authenticated Boundary (Current Truth)

Observed in current code + authority docs alignment:

1. Public storefront browse:
- Implemented (PUBLIC_B2C_BROWSE + /api/public/b2c/products).

2. Catalog/product detail browse:
- Public page currently exposes storefront-level previews; full detail continuity remains mixed between public and authenticated surfaces depending on route.

3. Cart intent:
- Practical flow is authenticated cart operations in tenant route layer.
- Public browse currently promotes sign-in continuation rather than a standalone persisted pre-auth cart-intent store.

4. Wishlist intent:
- Planning authority exists; runtime implementation evidence absent.

5. Authenticated checkout:
- Implemented via /api/tenant/checkout and cart drawer checkout flow.

6. Authenticated account/order continuity:
- Orders implemented in authenticated tenant shell.
- Returns-specific continuity not clearly surfaced as a distinct implemented pathway.

## 8) Architecture Input (Repo-Grounded, Not Final Architecture)

### Layer 1 — Public Browse Layer
- Existing code truth: Present (PUBLIC_B2C_BROWSE + B2CBrowse page + public endpoint call).
- Existing planning truth: Strongly decided and bounded.
- Missing pieces: richer browse/search/filter/compare depth standardization.
- Likely dependencies: projection payload breadth, catalog quality, UX routing coherence.
- Risks: overreading preview page as full anonymous commerce.
- Classification: DESIGN_GATED + DATA_GATED (for depth), implementation baseline present.

### Layer 2 — Public-Safe Projection Layer
- Existing code truth: Present (publicB2CProjection.service.ts with gates).
- Existing planning truth: Strongly decided.
- Missing pieces: OpenAPI contract parity for public B2C endpoint.
- Likely dependencies: contract governance sync, test expansion.
- Risks: contract/runtime drift.
- Classification: IMPLEMENTATION_PRESENT, CONTRACT_GATED.

### Layer 3 — Cart/Wishlist Intent Layer
- Existing code truth: Cart exists but in authenticated tenant flow; wishlist bridge absent.
- Existing planning truth: cart/wishlist intent both defined.
- Missing pieces: explicit public pre-auth intent bridge model and wishlist implementation.
- Likely dependencies: identity handoff model, session bridge semantics, data retention policy.
- Risks: conflating public intent with authenticated cart ownership.
- Classification: REQUIRES_DESIGN_DECISION.

### Layer 4 — Authentication Handoff Layer
- Existing code truth: Public browse sign-in handoff present.
- Existing planning truth: Strong shell/transition decisions exist.
- Missing pieces: explicit durable context-transfer contract (public selection -> auth continuity) for all B2C intent variants.
- Likely dependencies: auth/session contract + neutral shell consistency.
- Risks: context loss or ambiguity at seam.
- Classification: DESIGN_GATED.

### Layer 5 — Authenticated Checkout Layer
- Existing code truth: Implemented checkout endpoint and UI flow.
- Existing planning truth: aligned to authenticated ownership model.
- Missing pieces: B2C-specific checkout architecture clarification vs shared tenant checkout.
- Likely dependencies: account model, payment/finance adjacent governance constraints.
- Risks: accidental coupling with held families.
- Classification: IMPLEMENTATION_PRESENT, ARCHITECTURE_DISCUSSION_REQUIRED.

### Layer 6 — Account / Order / Returns Continuity Layer
- Existing code truth: orders continuity exists; returns continuity unclear/not evidenced.
- Existing planning truth: downstream family is explicitly distinct from B2C parent.
- Missing pieces: explicit returns/post-purchase B2C continuity path definition.
- Likely dependencies: orders family design authority, authenticated account continuity rules.
- Risks: family-boundary blur between B2C and downstream orders family.
- Classification: REQUIRES_DESIGN_DECISION.

### Layer 7 — Tenant Admin / Seller Operations Layer
- Existing code truth: tenant/admin operation surfaces exist but are separate from public page.
- Existing planning truth: clear exclusion from public ownership.
- Missing pieces: stricter seam hardening where shell links could imply blended ownership.
- Likely dependencies: shell navigation governance, route-group policy.
- Risks: admin affordance bleed into public interpretation.
- Classification: GOVERNANCE_GATED / DESIGN_GATED.

### Layer 8 — Trust / Eligibility / Publication Governance Layer
- Existing code truth: posture fields and projection gates exist.
- Existing planning truth: two-tier visibility model decided.
- Missing pieces: stronger evidence pack for live data posture and periodic governance checks.
- Likely dependencies: data audits, migration lineage, policy tests.
- Risks: enabling public surfaces without verified eligible dataset quality.
- Classification: DATA_GATED + GOVERNANCE_GATED.

## 9) Candidate Future Slices (Do Not Open)

### 9.1 Candidate: B2C Public Browse Projection Contract Sync
- Purpose: align shared OpenAPI contracts with live /api/public/b2c/products runtime truth.
- Minimum likely file surface: shared/contracts/openapi.tenant.json and/or dedicated public OpenAPI contract files, governance decision/writeback artifacts.
- Excluded surfaces: frontend runtime, server route logic, schema, migrations.
- Dependencies: contract ownership decision (where public endpoints are canonized).
- Verification needs: contract lint/parity checks against public route map.
- Readiness classification: READY_FOR_ARCHITECTURE_DISCUSSION.

### 9.2 Candidate: PUBLIC_B2C_BROWSE UX Depth Narrowing
- Purpose: decide and implement bounded search/filter/compare depth for public B2C page without crossing auth boundary.
- Minimum likely file surface: components/Public/B2CBrowse.tsx, services/publicB2CService.ts, possibly server projection query params.
- Excluded surfaces: checkout/orders/auth internals.
- Dependencies: explicit design cut on which browse controls are in-scope.
- Verification needs: public browse UI tests + projection response tests.
- Readiness classification: REQUIRES_DESIGN_DECISION.

### 9.3 Candidate: B2C Tenant/Product Eligibility Audit Slice
- Purpose: produce evidence-grade data posture report for B2C-public-eligible tenants/items.
- Minimum likely file surface: governance analysis artifact(s), read-only scripts or query protocol (if authorized).
- Excluded surfaces: route/service/schema mutations.
- Dependencies: approved audit query pathway.
- Verification needs: reproducible counts and posture assertions.
- Readiness classification: REQUIRES_DATA_PRECONDITION.

### 9.4 Candidate: B2C Cart-Intent Pre-Auth Bridge Design Slice
- Purpose: define whether/how pre-auth cart intent is preserved before authenticated cart ownership begins.
- Minimum likely file surface: governance decisions + possibly App/auth seam specs.
- Excluded surfaces: payments/orders execution changes.
- Dependencies: shell/transition contract clarity and security posture decisions.
- Verification needs: seam test design, non-leakage checks.
- Readiness classification: REQUIRES_DESIGN_DECISION.

### 9.5 Candidate: B2C Wishlist-Intent Bridge Foundation Slice
- Purpose: introduce explicit wishlist intent model (currently absent in runtime).
- Minimum likely file surface: schema + service + route + UI (if moved to implementation later).
- Excluded surfaces: checkout/orders.
- Dependencies: product decision confirming wishlist as near-term family requirement.
- Verification needs: schema tests, API tests, boundary tests.
- Readiness classification: NOT_READY / TOO_WIDE (requires prior design narrowing).

### 9.6 Candidate: Authenticated Checkout Handoff Clarification Slice
- Purpose: formalize B2C public->auth checkout handoff context transfer rules.
- Minimum likely file surface: App handoff state contracts, auth flow interfaces, governance decision docs.
- Excluded surfaces: pricing/payment mechanics and held families.
- Dependencies: seam decision between public intent and tenant cart ownership.
- Verification needs: handoff integration tests and context persistence tests.
- Readiness classification: REQUIRES_DESIGN_DECISION.

### 9.7 Candidate: Account/Orders/Returns Continuity Boundary Clarification
- Purpose: explicitly map what B2C owns vs what downstream orders family owns for post-purchase continuity.
- Minimum likely file surface: product-truth docs and decisions only (initially).
- Excluded surfaces: runtime code until boundary lock.
- Dependencies: ORDERS-CHECKOUT family authority alignment.
- Verification needs: governance review and contradiction checks.
- Readiness classification: READY_FOR_ARCHITECTURE_DISCUSSION.

### 9.8 Candidate: Storefront Trust-Signal Projection Expansion
- Purpose: enrich public trust-confidence object payloads while preserving prohibited-field boundaries.
- Minimum likely file surface: publicB2CProjection.service.ts + tests + contract docs.
- Excluded surfaces: auth/checkout/orders.
- Dependencies: trust-signal field governance and data quality readiness.
- Verification needs: payload redaction tests and field allowlist tests.
- Readiness classification: REQUIRES_DATA_PRECONDITION.

## 10) CURRENT_B2C_REPO_TRUTH_SUMMARY

- B2C public browse is no longer only planning authority; a real runtime baseline exists.
- Runtime today includes PUBLIC_B2C_BROWSE state, a public browse page, and a live public projection endpoint.
- Projection gating and publication/eligibility posture model are implemented in backend service logic.
- Authenticated cart/checkout/orders continuity exists in tenant runtime.
- Wishlist bridge and explicit returns continuity remain unimplemented or not clearly evidenced.
- Public endpoint contract registration appears incomplete relative to runtime.
- B2C family boundary still requires architecture clarification across public intent, auth handoff, and downstream continuity ownership.

## 11) B2C_ARCHITECTURE_DISCUSSION_INPUTS

1. Confirm whether public B2C should remain storefront-preview-first or expand to richer public product detail/search depth now.
2. Decide canonical pre-auth intent model for cart and wishlist separately.
3. Lock the context-transfer contract at public->authenticated seam.
4. Clarify whether returns continuity is a near-term B2C concern or exclusively downstream orders-family concern in this cycle.
5. Decide where public API contracts are canonically documented so runtime/contract drift is eliminated.

## 12) NOT_IMPLEMENTED_GAPS

- Wishlist intent bridge (frontend/backend/schema absent in current evidence).
- Public B2C contract path entry in shared OpenAPI artifacts (runtime exists without clear contract registration).
- Explicit returns continuity surface evidence for B2C.
- Broader public browse controls (search/filter/compare depth) on standalone public B2C page.

## 13) RISK_REGISTER

1. Runtime-contract drift risk: public endpoints exist but are not fully reflected in shared OpenAPI contracts.
2. Boundary overread risk: existing authenticated checkout/orders may be mistaken for complete B2C public commerce continuity.
3. Data sufficiency risk: capability exists, but broad public rendering quality depends on real eligible/published inventory posture.
4. Family ownership drift risk: B2C parent-family scope could be conflated with downstream orders family scope without explicit architecture lock.

## 14) CANDIDATE_NEXT_SLICES

See Section 9. No slice opened by this artifact.

## 15) STOP / DO NOT IMPLEMENT STATEMENT

STOP. This is an investigation-only governance artifact.

No product/runtime implementation is authorized by this report.
No Layer 0 control mutation is performed by this report.
No implementation unit is opened by this report.

Any future B2C implementation work requires explicit human opening authorization after architecture discussion and scope lock.
