# TEXQTIC — GAP REGISTER

Last Updated: 2026-03-14 (GOVERNANCE-SYNC-PW5-AI-NEGOTIATION-RAG — PW5-AI-NEGOTIATION-RAG ✅ COMPLETE / VERIFIED_COMPLETE_WITH_FOLLOW_ON_NOTE — negotiation-advice now calls governed retrieval helper `runRagRetrieval(tx, orgId, prompt)` — same helper used by insights; retrieved context injected into actual model prompt using same prepend pattern; fallback to original prompt when retrieval unavailable; latency instrumentation applied to negotiation path; reasoningHash and promptSummary now reflect finalPrompt sent to model; ai.vector.query continues to originate from ragContextBuilder.ts — not reimplemented in TIS; TIS execution order fully preserved: rate limit → idempotency replay → RAG retrieval → model invocation → reasoning/audit log creation → post-transaction event emission; insights path unchanged; route contracts unchanged; no schema/event-schema/emitter/rate-limit/idempotency changes; no new event names; static verification note preserved as non-defect; implementation commit de202c2; D-009 CLOSED; next proposed unit: PW5-AI-PII-GUARD)
(GOVERNANCE-SYNC-PW5-AI-IDEMPOTENCY-REMEDIATION — PW5-AI-IDEMPOTENCY-REMEDIATION ✅ COMPLETE / VERIFIED_COMPLETE_WITH_FOLLOW_ON_NOTE — initial PW5-AI-IDEMPOTENCY defect corrected: replay no longer returns before tenant rate-limit enforcement; TIS ordering now normalize key → enforce tenant rate limit → replay lookup → replay return or first execution; replay semantics preserved (stored logical result, no model invocation, no new reasoning/audit writes, no inference event re-emission); 24-hour replay window preserved; Idempotency-Key route contract preserved; rate-limit constants unchanged (60 / 60_000ms); static verification note preserved as non-defect; remediation commit 536fe50; PW5-AI-IDEMPOTENCY effectively CLOSED via remediation)
(GOVERNANCE-SYNC-PW5-AI-TIS-EXTRACT — PW5-AI-TIS-EXTRACT ✅ COMPLETE / VERIFIED_COMPLETE_WITH_FOLLOW_ON_NOTE — AI orchestration extracted from server/src/routes/ai.ts into server/src/services/ai/inferenceService.ts; route layer narrowed to HTTP concerns; route contracts preserved; reasoning/audit transaction semantics preserved; existing AI event behavior preserved through existing emitter path; ai.vector.query remains in RAG retrieval path; degraded mode unchanged; D-001 materially reduced; runtime verification follow-on recorded as pending operational runbook execution (non-defect); commit f2ae23b)
(GOVERNANCE-SYNC-PW5-AI-EMITTER — PW5-AI-EMITTER ✅ COMPLETE / VERIFIED_COMPLETE_WITH_FOLLOW_ON_NOTE — runtime AI event emission wired for approved current trigger points; ai.inference.generate · ai.inference.error · ai.inference.budget_exceeded live on both AI routes; ai.vector.query live in runRagRetrieval(); aiEmitter.ts created with full validated emission chain; deferred events (ai.vector.upsert · ai.vector.delete · PII events · cache_hit) remain open; AUDIT_ACTION_TO_EVENT_NAME unchanged; no projections/routes/schema/RLS changes; commit 73f0972)
(GOVERNANCE-SYNC-PW5-AI-EVENT-DOMAIN — PW5-AI-EVENT-DOMAIN ✅ COMPLETE / VERIFIED_COMPLETE_WITH_FOLLOW_ON_NOTE — AI event domain registered in event backbone; 9 AI event names added to KnownEventName and knownEventEnvelopeSchema; eventSchemas.ts created; D-002 CLOSED; emitter path remains open as PW5-AI-EMITTER; commit dd18957)
(GOVERNANCE-SYNC-PW5-AI-PLAN — PW5-AI-PLAN ✅ CLOSED AS PLANNING BASELINE — Wave 5 AI/event backbone architectural baseline established; tenant AI route surface confirmed (3 tenant-plane routes); event backbone confirmed for tenancy/team/marketplace; AI event domain absent (design gate open); control-plane AI governance backend remains REQUIRES_BACKEND_DESIGN; 9 drift observations D-001–D-009 registered; follow-on units proposed: PW5-AI-EVENT-DOMAIN · PW5-AI-TIS-EXTRACT · PW5-AI-RATE-LIMIT · PW5-AI-IDEMPOTENCY · PW5-AI-NEGOTIATION-RAG; no implementation occurred; TECS-FBW-AIGOVERNANCE NOT closed) — commit d860b6b · WL Storefront Performance Optimizations complete · React.memo on ProductCard/ProductGrid/WLSearchBar/WLCollectionsPanel · per-card inline closure eliminated · Intl.NumberFormat singleton · PW5-WL7-VERIFY PASS · CAT-SCHEMA-001/002/003 remain non-blocking · WL storefront tranche complete)
(GOVERNANCE-SYNC-PW5-WL7-GOV — PW5-WL7 ✅ VERIFIED AND CLOSED — 2026-03-13; program: PW5-WL7 Storefront Performance Optimizations; tranche class: GOVERNANCE-SYNC — documentation-only, no product code changes in this unit; commit: d860b6b; commit message: feat(wl-storefront): implement PW5-WL7 performance optimizations; scope: ProductCard.tsx MODIFIED (React.memo applied; onSelect signature changed () => void → (id: string) => void enabling stable ref pass-through; module-level priceFormatter singleton replacing per-render Intl.NumberFormat construction) · ProductGrid.tsx MODIFIED (React.memo applied; per-card inline () => onSelectItem(item.id) closure removed; onSelect={onSelectItem} direct pass) · WLSearchBar.tsx MODIFIED (React.memo applied — skips re-render on activeCategory/selectedItemId state changes; onChange=setSearchQuery is stable useState setter) · WLCollectionsPanel.tsx MODIFIED (React.memo applied — skips re-render on searchQuery keystrokes; categories memoized in WLStorefront; onSelectCategory=setActiveCategory stable setter) · WLStorefront.tsx INTENTIONALLY UNCHANGED — already fully optimized with useCallback handlers and useMemo derivation chain; discovery result: optimization opportunities were render-boundary and prop-stability concentrated — WLStorefront data-ownership layer was already correct; no backend routes; no schema/migration/RLS/seed changes; WLProductDetailPage.tsx UNCHANGED; no tenantId added to any client file; no duplicate catalog requests introduced; architectural outcome confirmed: WLStorefront remains the sole catalog fetch owner; all derived filtering/search/detail ownership remains in WLStorefront; render optimization is boundary-only — no data ownership moved to child components; verification result: PW5-WL7-VERIFY PASS — all gates confirmed: Network (getCatalogItems in WLStorefront only; no child fetch; no backend routes in commit) PASS · Architecture (WLStorefront unchanged; all useMemo derivations intact; 4 WL-only files in commit) PASS · Tenant safety (tenantId JSDoc-only; zero functional occurrences; no RLS/auth changes) PASS · Performance integrity (React.memo prop-stable: handleSelectItem is useCallback([], []); categories is useMemo-ref; setSearchQuery/setActiveCategory are stable setters; no stale-prop risk; Intl.NumberFormat singleton confirmed) PASS · Build quality (tsc EXIT 0; eslint EXIT 0; d860b6b: 4 files 50 insertions / 24 deletions) PASS · Behavioral integrity (grid/search/category/detail/cart/images/keyboard/back all intact; no UX regression) PASS; existing schema observations: CAT-SCHEMA-001 · CAT-SCHEMA-002 · CAT-SCHEMA-003 remain NON-BLOCKING — PW5-WL7 is optimization-only; no schema obligations introduced; no new schema observations; gap register outcome: UNCHANGED; closure state: PW5-WL7 ✅ FULLY CLOSED — commit d860b6b; PW5-WL7-VERIFY ✅ COMPLETE 2026-03-13; WL storefront performance optimization operational; WL storefront tranche: WL1–WL7 ALL CLOSED; next: await next approved roadmap sequence; governance artifacts updated: docs/governance/IMPLEMENTATION-TRACKER-2026-03.md · governance/gap-register.md · docs/governance/audits/2026-03-audit-reconciliation-matrix.md; GOVERNANCE-SYNC-PW5-WL7-GOV)
(GOVERNANCE-SYNC-PW5-WL6-GOV — PW5-WL6 ✅ VERIFIED AND CLOSED — 2026-03-13; program: PW5-WL6 WL Product Images; tranche class: GOVERNANCE-SYNC — documentation-only, no product code changes in this unit; commit: e8f5d55; commit message: feat(wl-storefront): implement PW5-WL6 product images; scope: ProductCard.tsx MODIFIED (useState import added; imgError local state tracks broken images via onError — no additional fetch; h-40 image container added; <img src={item.imageUrl} alt={item.name} loading="lazy" onError={() => setImgError(true)}> rendered when imageUrl present and not broken; inline SVG placeholder aria-hidden="true" shown when imageUrl absent or imgError=true) · WLProductDetailPage.tsx MODIFIED (imgError local state added; h-64 primary image surface added before existing header; <img loading="eager"> with same onError guard; SVG placeholder at h-16 w-16 for detail surface; JSDoc updated) · CASE A: CatalogItem.imageUrl?: string already present in catalogService.ts since commit c40eb64 — pre-existence confirmed via git show c40eb64:services/catalogService.ts; image data travels via existing item prop from WLStorefront catalog state; no new backend routes; no schema/migration/RLS/seed changes; architectural outcome confirmed: WLStorefront remains the only owner of catalog fetching — image rendering is purely presentational from existing item props; WLStorefront.tsx, catalogService.ts, WLCollectionsPanel.tsx, WLSearchBar.tsx, ProductGrid.tsx, WLStorefront.tsx, CartContext.tsx all UNCHANGED; verification result: PW5-WL6-VERIFY PASS — all 7 gates confirmed: Scope (no schema/migration/governance docs changed; existing CASE A contract reused) PASS · Data flow (getCatalogItems only in WLStorefront lines 52+107; absent from ProductCard/WLProductDetailPage/ProductGrid; onError = local imgError state only) PASS · Tenant safety (tenantId JSDoc-only in touched files; zero functional occurrences; no RLS/auth changes; D-017-A) PASS · Runtime (grid lazy-loads product image; detail eager-loads primary image; onError triggers SVG placeholder; absent imageUrl → immediate SVG placeholder; alt={item.name} on real images; aria-hidden="true" on decorative SVG; no CLS) PASS · Image integrity (CatalogItem.imageUrl pre-existed before PW5-WL6; no fabricated contract; placeholder bounded and explicit) PASS · Build quality (tsc EXIT 0; eslint EXIT 0; git show --stat e8f5d55: 2 files, 79 insertions, 6 deletions) PASS · Behavioral integrity (category browsing intact; detail page intact; search intact; cart foundation intact; card click/onSelect/onKeyDown preserved; back navigation preserved; no image rendering alters catalog/search/cart logic) PASS; existing schema observations: CAT-SCHEMA-001 · CAT-SCHEMA-002 · CAT-SCHEMA-003 remain NON-BLOCKING — CAT-SCHEMA-001 (imageUrl note) superseded in WL rendering context: CatalogItem.imageUrl was already_optional_ in the frontend type contract; its DB-column presence is irrelevant to WL6 which renders from API response only — observation retained as non-blocking historical record only; no new CAT-SCHEMA IDs introduced; no new gaps introduced; gap register outcome: UNCHANGED; closure state: PW5-WL6 ✅ FULLY CLOSED — commit e8f5d55; PW5-WL6-VERIFY ✅ COMPLETE 2026-03-13; WL Product Images operational; next sequenced unit: PW5-WL7 (Storefront Performance Optimizations); governance artifacts updated: docs/governance/IMPLEMENTATION-TRACKER-2026-03.md · governance/gap-register.md · docs/governance/audits/2026-03-audit-reconciliation-matrix.md; GOVERNANCE-SYNC-PW5-WL6-GOV)
(GOVERNANCE-SYNC-PW5-WL5-GOV — PW5-WL5 ✅ VERIFIED AND CLOSED — 2026-03-13; program: PW5-WL5 WL Cart / Checkout Foundation; tranche class: GOVERNANCE-SYNC — documentation-only, no product code changes in this unit; commit: c40eb64; commit message: feat(wl-storefront): implement PW5-WL5 cart foundation; scope: WLProductDetailPage.tsx MODIFIED (converted disabled cart stub into live onAddToCart prop handler — quantity state defaulting to Math.max(item.moq ?? 1, 1); MOQ-floor decrement guard; adding/addSuccess/addError feedback states; handleAddToCart async callback; addButtonLabel pre-return let variable resolving no-nested-ternary lint rule; button disabled on adding || !item.active; onAddToCart absent → disabled placeholder) · WLStorefront.tsx MODIFIED (imports useCart from CartContext; destructures addToCart; passes onAddToCart={addToCart} to WLProductDetailPage in detail render branch) · CASE A: existing CartContext / cartService / Cart.tsx reused without modification — addToCart(catalogItemId: string, quantity: number): Promise<void>; AddToCartRequest = { catalogItemId, quantity } — no tenantId in body (D-017-A); CartProvider wraps EXPERIENCE case in App.tsx; architectural outcome confirmed: WLStorefront remains the only owner of catalog fetching — cart mutation wired from CartContext at WLStorefront level passed as prop; WLProductDetailPage remains presentational — no service import, no fetch, no direct API call; verification result: PW5-WL5-VERIFY PASS — all 7 gates confirmed: Commit scope (2 files — components/WL/ only; no server/prisma/governance files) PASS · Catalog fetch isolation (no getCatalogItems in WLProductDetailPage; WLStorefront sole fetch owner) PASS · Tenant isolation (AddToCartRequest = {catalogItemId,quantity} — no tenantId; D-017-A) PASS · CartContext contract (CASE A reuse; CartProvider wraps EXPERIENCE; addToCart signature correct) PASS · MOQ floor (Math.max(item.moq ?? 1, 1) init; decrement guard Math.max(minQty, q - 1)) PASS · Button states (disabled on adding || !item.active; absent prop → disabled placeholder) PASS · Build quality (tsc EXIT 0; eslint EXIT 0; 2 WL-only files; 105 insertions / 18 deletions) PASS; existing schema observations: CAT-SCHEMA-001 · CAT-SCHEMA-002 · CAT-SCHEMA-003 remain NON-BLOCKING — no new CAT-SCHEMA IDs introduced; no new gaps introduced; gap register outcome: UNCHANGED; closure state: PW5-WL5 ✅ FULLY CLOSED — commit c40eb64; PW5-WL5-VERIFY ✅ COMPLETE 2026-03-13; WL Cart / Checkout Foundation is operational; next sequenced unit: PW5-WL6 (Product Images); governance artifacts updated: docs/governance/IMPLEMENTATION-TRACKER-2026-03.md · governance/gap-register.md · docs/governance/audits/2026-03-audit-reconciliation-matrix.md; GOVERNANCE-SYNC-PW5-WL5-GOV)
(GOVERNANCE-SYNC-PW5-WL4-GOV — PW5-WL4 ✅ VERIFIED AND CLOSED — 2026-03-13; program: PW5-WL4 WL storefront product search; tranche class: GOVERNANCE-SYNC — documentation-only, no product code changes in this unit; commit: 25921ae; commit message: feat(wl-storefront): implement PW5-WL4 product search; scope: WLSearchBar.tsx NEW (pure presentational controlled input — no fetch; no service client imports; no useEffect; no API call on any user interaction; clear affordance; accessible sr-only label) · WLStorefront.tsx extended: searchQuery string state + searchFilteredItems useMemo chained after filteredItems (items → category filter → search filter → render) + WLSearchBar rendered above WLCollectionsPanel + context-aware emptyMessage prop passed to ProductGrid when searchQuery active · ProductGrid.tsx extended: optional emptyMessage?: string prop (backward-compatible; falls back to prior 'No products available' when omitted) · 3 files total in components/WL/; architectural outcome confirmed: WLStorefront remains the only owner of catalog fetching — search runs entirely client-side as derived in-memory state; no child component fetches catalog data; searchFilteredItems is pure useMemo — zero network activity on keystroke, category change, navigation, or back navigation; search composes deterministically with category filter via chained useMemos; verification result: PW5-WL4-VERIFY PASS — all 6 validation gates confirmed: Network (single fetch owner; no per-keystroke/per-category/per-navigation requests) · Runtime (synchronous updates; case-insensitive matching; ?? '' optional field guards; empty query short-circuits to filteredItems; search state preserved across detail/back) · Tenant safety (no tenantId in any client component — D-017-A) · Architecture (WLSearchBar presentational-only; ProductGrid presentational-only; searchFilteredItems is useMemo not state; derivation order correct) · Regression (category browsing intact; detail page intact; no flicker; no image assumptions; no cart behavior) · Build quality (tsc EXIT 0; eslint EXIT 0; 3 WL-only files in commit); existing schema observations: CAT-SCHEMA-001 · CAT-SCHEMA-002 · CAT-SCHEMA-003 remain NON-BLOCKING — no new CAT-SCHEMA IDs introduced; no new gaps introduced; gap register outcome: UNCHANGED; closure state: PW5-WL4 ✅ FULLY CLOSED — commit 25921ae; PW5-WL4-VERIFY ✅ COMPLETE 2026-03-13; WL storefront product search is operational; next sequenced unit: PW5-WL5 (WL Cart / Checkout Foundation); governance artifacts updated: docs/governance/IMPLEMENTATION-TRACKER-2026-03.md · governance/gap-register.md · docs/governance/audits/2026-03-audit-reconciliation-matrix.md; GOVERNANCE-SYNC-PW5-WL4-GOV)
(GOVERNANCE-SYNC-PW5-WL3-GOV — PW5-WL3 ✅ VERIFIED AND CLOSED — 2026-03-13; program: PW5-WL3 WL storefront product detail page; tranche class: GOVERNANCE-SYNC — documentation-only, no product code changes in this unit; commit: 06fd294; commit message: feat(wl-storefront): implement PW5-WL3 product detail page; scope: WLProductDetailPage.tsx NEW (pure presentational — no fetch; renders name, SKU, category w/ UNCATEGORISED fallback, description w/ absent-field fallback, price, MOQ, active badge, disabled 'Add to Cart' cart-foundation stub) · WLStorefront.tsx extended: selectedItemId state + selectedItem useMemo (items.find from already-held state — no secondary fetch) + handleSelectItem/handleBackFromDetail callbacks + detail-view render path + graceful not-found path · ProductGrid.tsx extended: optional onSelectItem prop forwarded to ProductCard · ProductCard.tsx extended: optional onSelect prop + keyboard accessibility (Enter/Space onKeyDown + tabIndex) · 4 files total in components/WL/; architectural outcome confirmed: WLStorefront remains the only owner of catalog fetching — no child component may independently fetch catalog data; selectedItem derived exclusively from already-fetched items state via useMemo — zero additional network requests on card selection or back navigation; verification result: PW5-WL3-VERIFY PASS — all 10 ACs confirmed: product card click opens correct detail view · selected item derived from existing WLStorefront state only · no duplicate catalog request · WLStorefront remains sole catalog fetch owner · back navigation restores grid/category context · stale/invalid product ID renders graceful not-found state · no tenantId sent from client (D-017-A) · no console errors · typecheck EXIT 0 · ESLint EXIT 0 on all 4 touched files; existing schema observations: CAT-SCHEMA-001 · CAT-SCHEMA-002 · CAT-SCHEMA-003 remain NON-BLOCKING — no new CAT-SCHEMA IDs introduced; cart stub verified non-destructive (disabled + aria-disabled + no onClick handler); no new gaps introduced; closure state: PW5-WL3 ✅ FULLY CLOSED — commit 06fd294; PW5-WL3-VERIFY ✅ COMPLETE 2026-03-13; WL storefront product detail page is operational; next sequenced unit: PW5-WL4 (product search); governance artifacts updated: docs/governance/IMPLEMENTATION-TRACKER-2026-03.md · governance/gap-register.md · docs/governance/audits/2026-03-audit-reconciliation-matrix.md; GOVERNANCE-SYNC-PW5-WL3-GOV)
(GOVERNANCE-SYNC-PW5-WL2-GOV — PW5-WL2 VERIFIED AND CLOSED — commit 3070f80 · WL storefront category navigation operational · single-fetch architecture confirmed · PW5-WL2-VERIFY PASS · CAT-SCHEMA-001/002/003 remain non-blocking · next sequenced unit: PW5-WL3)
(GOVERNANCE-SYNC-PW5-WL2-GOV — PW5-WL2 ✅ VERIFIED AND CLOSED — 2026-03-13; program: PW5-WL2 WL storefront collections/category rendering; tranche class: GOVERNANCE-SYNC — documentation-only, no product code changes in this unit; commit: 3070f80; commit message: feat(wl-storefront): implement category collections navigation; scope: WLCollectionsPanel.tsx NEW (pure prop-driven category nav · no internal fetch) · WLStorefront.tsx rewritten as single data owner (fetch, state, deriveCategories, filteredItems useMemo) · ProductGrid.tsx converted to pure render component (items prop, no getCatalogItems import); architectural outcome confirmed: single-fetch storefront architecture established — WLStorefront owns catalog data; WLCollectionsPanel and ProductGrid are prop-driven only; no duplicate API calls possible at structural level; category filtering via useMemo on existing items state — zero network calls on category change; verification result: PW5-WL2-VERIFY end-to-end PASS — all 9 ACs confirmed: WLCollectionsPanel renders above ProductGrid · category grouping computed client-side · fallback “Uncategorised” applied (all 14 items resolve to Uncategorised — no runtime category field) · category click filters ProductGrid items · default state shows all products · catalog API called exactly once · zero additional API calls on category change · tenant isolation preserved (D-017-A · JWT-scoped · RLS) · no console/server/runtime errors · GET /health 200; existing schema observations: CAT-SCHEMA-001 · CAT-SCHEMA-002 · CAT-SCHEMA-003 remain NON-BLOCKING — PW5-WL2 runtime verification confirms fallback design works correctly; no new CAT-SCHEMA IDs introduced; closure state: PW5-WL2 ✅ FULLY CLOSED — commit 3070f80; PW5-WL2-VERIFY ✅ COMPLETE 2026-03-13; WL storefront category navigation is operational; next sequenced unit: PW5-WL3; governance artifacts updated: docs/governance/IMPLEMENTATION-TRACKER-2026-03.md · governance/gap-register.md · docs/governance/audits/2026-03-audit-reconciliation-matrix.md; GOVERNANCE-SYNC-PW5-WL2-GOV)
(GOVERNANCE-SYNC-PW5-WL1-GOV — PW5-WL1 ✅ VERIFIED AND CLOSED — 2026-03-12; program: PW5-WL1 WL storefront product grid; tranche class: GOVERNANCE-SYNC — documentation-only, no product code changes in this unit; commit: cc4278f; commit message: feat(wl-storefront): implement white-label product grid; scope: ProductCard.tsx NEW + ProductGrid.tsx NEW + WLStorefront.tsx NEW + App.tsx import + WL HOME guard (`if (currentTenant.is_white_label && expView === 'HOME') return <WLStorefront />;`); catalog API: GET /api/tenant/catalog/items · JWT-scoped · RLS-enforced via withDbContext · no clientside tenantId (D-017-A compliant); verification result: PW5-WL1-VERIFY end-to-end PASS — all 9 ACs confirmed: WL HOME guard intercept · WLStorefront renders above category switch · getCatalogItems() correct endpoint · tenantGet JWT-scoped · server RLS via withDbContext · auth guard active (401 unauthenticated) · loading/error/empty states implemented · responsive grid layout (1→2→3→4 cols) · GET /health 200; non-blocking observations: CAT-SCHEMA-001 (imageUrl/category nullable — optional fields guarded in ProductCard.tsx) · CAT-SCHEMA-002 (moq nullable — MOQ badge guarded with null check) · CAT-SCHEMA-003 (currency not rendered — Intl.NumberFormat locale default; aligns with catalog schema where currency stored server-side); closure state: PW5-WL1 ✅ FULLY CLOSED — commit cc4278f; PW5-WL1-VERIFY ✅ COMPLETE 2026-03-12; follow-up items non-blocking and deferred; WL storefront is operational; next sequenced unit: PW5-WL2; governance artifacts updated: docs/governance/IMPLEMENTATION-TRACKER-2026-03.md · governance/gap-register.md · docs/governance/audits/2026-03-audit-reconciliation-matrix.md; GOVERNANCE-SYNC-PW5-WL1-GOV)
(GOVERNANCE-SYNC-PW5-W3-VERIFY-GOV — PW5-W3-VERIFY ✅ COMPLETE — 2026-03-12; program: PW5-W3 Settlement Admin end-to-end runtime verification; tranche class: GOVERNANCE-SYNC — documentation-only, no product code changes in this unit; parent units: PW5-W3 backend design · PW5-W3-IMPL (14aea49) · PW5-W3-GOV (de501e8) · PW5-W3-FE (8f4a685) · PW5-W3-VERIFY report; verification result: end-to-end PASS — runtime path verified from nav to API to table render; acceptance criteria: navigation PASS · API/auth PASS (401 unauthenticated probe confirmed) · schema PASS · table render PASS (8 columns) · cursor pagination PASS · cross-tenant admin read PASS · 8/8 integration tests PASS; non-blocking observations: OBS-1 — `amount: number` interface vs server `Decimal.toString()` serialization (runtime-safe; type alignment deferred to PW5-W3-TYPE-ALIGN-001); OBS-2 — no dedicated integration test for GET /api/control/settlements (test coverage deferred to PW5-W3-TEST-001); PW5-W3-PERF-INDEX — compound partial index `(created_at DESC, id DESC) WHERE entry_type='RELEASE' AND direction='DEBIT'` absent on `escrow_transactions` (non-blocking at current volume; recorded as future performance unit); closure state: PW5-W3-FE ✅ CLOSED (commit 8f4a685) · PW5-W3 FULLY CLOSED end-to-end; follow-ups deferred, non-blocking; Settlement Admin is operational; three non-blocking follow-up items were recorded separately and do not prevent tranche closure; governance artifacts updated: docs/governance/IMPLEMENTATION-TRACKER-2026-03.md · governance/gap-register.md · docs/governance/audits/2026-03-audit-reconciliation-matrix.md; GOVERNANCE-SYNC-PW5-W3-VERIFY-GOV)
(GOVERNANCE-SYNC-PW5-W3-GOV — PW5-W3-BE ✅ CLOSED — 2026-03-12; program: PW5-W3 — Settlement Admin Backend Read Surface; tranche class: GOVERNANCE-SYNC — documentation-only, no product code changes in this unit; commit: 14aea49; commit message: feat(control-plane): add settlement admin read route; scope: GET /api/control/settlements added in server/src/routes/control/settlement.ts; control-plane OpenAPI contract updated; backend-only tranche respected; no frontend wiring performed; no schema changes; no migration files; no settlement detail route; prior three-layer absence (no AdminView token · no component · no GET route) partially resolved: backend read surface now exists; control-plane contract now exists; remaining work is frontend wiring only; backend design gate removed; Settlement Admin frontend wiring still pending; next sequenced unit: PW5-W3-FE — Settlement Admin frontend wiring; governance artifacts updated: docs/governance/IMPLEMENTATION-TRACKER-2026-03.md + governance/gap-register.md + docs/governance/audits/2026-03-audit-reconciliation-matrix.md; GOVERNANCE-SYNC-PW5-W3-GOV)
(GOVERNANCE-SYNC-OPENAPI-POLICY-DECISION-GOV — OPENAPI-POLICY-DECISION-GOV ✅ COMPLETE — 2026-03-10; program: OpenAPI Policy Decision Recording; parent units: VER-003 · VER-004 · SPEC-SYNC · SPEC-SYNC-GOV; scope: governance decision recording only — no runtime change, no OpenAPI file change, no product code change; decisions recorded: (1) OPENAPI-AI-SCOPE-001 — CLOSED / RESOLVED (policy decision): /api/ai/* (/api/ai/insights, /api/ai/negotiation-advice, /api/ai/health) remain in openapi.tenant.json as tenant-consumable cross-cutting product routes; placement accepted; future extraction to dedicated AI contract remains allowed if AI contract ownership re-baselined; (2) OPENAPI-IMPERSONATION-DOC-001 — CLOSED / RESOLVED (policy decision): POST /api/control/impersonation/start and /stop remain intentionally excluded from openapi.control-plane.json; SUPER_ADMIN-sensitive operational scope; omission from public contract is intentional; route truth preserved in internal governance and verification artifacts; no spec file changes performed; no product code changed; governance blocker for PW5-W3 sequencing REMOVED; next sequenced unit: PW5-W3 backend design (Settlement Admin — define GET /api/control/settlements read route); governance artifacts updated: IMPLEMENTATION-TRACKER-2026-03.md + gap-register.md + 2026-03-audit-reconciliation-matrix.md; GOVERNANCE-SYNC-OPENAPI-POLICY-DECISION-GOV)
(GOVERNANCE-SYNC-SPEC-SYNC-GOV — SPEC-SYNC ✅ COMPLETE — 2026-03-10; program: OpenAPI Contract Reconciliation; parent verification units: VER-003 (22 missing tenant routes confirmed) · VER-004 (20 missing control-plane routes confirmed); tranche class: GOVERNANCE-SYNC — documentation-only, no product code changes; commit: 88ba3e7c1e02d6671a20b390325edec696b6cf23; commit message: docs(openapi): synchronize tenant and control-plane OpenAPI specs with runtime routes (VER-003 / VER-004); files changed: shared/contracts/openapi.tenant.json (642 insertions) · shared/contracts/openapi.control-plane.json (576 insertions); total: 1218 insertions(+), 0 deletions; result: DETERMINISTIC DRIFT REMEDIATED — all non-decision runtime routes from VER-003/VER-004 reflected in both OpenAPI contracts; policy-class residuals explicitly preserved OPEN: (1) OPENAPI-AI-SCOPE-001 — /api/ai/* remains in tenant spec pending contract ownership decision; (2) OPENAPI-IMPERSONATION-DOC-001 — /api/control/impersonation/start + /stop remain undocumented pending governance decision on SUPER_ADMIN endpoint public documentation; validation: JSON syntax validated (node JSON.parse — both files: TENANT_JSON:VALID · CONTROL_JSON:VALID); semantic OpenAPI validation: PENDING / NOT YET RECORDED; no product code changed; no backend/frontend/schema/RLS files touched; governance artifacts updated: IMPLEMENTATION-TRACKER-2026-03.md + gap-register.md + 2026-03-audit-reconciliation-matrix.md; GOVERNANCE-SYNC-SPEC-SYNC-GOV)
(GOV-SYNC-W2-TRACKER — TECS-FBW-001 Finance ✅ CLOSED (GOVERNANCE-SYNC-108 · 2026-03-07) · TECS-FBW-001 Disputes ✅ CLOSED (GOVERNANCE-SYNC-109 · 2026-03-07); Wave 2 TECS-FBW-001 FULLY COMPLETE; tracker Finance+Disputes rows reconciled with gap-register (drift confirmed: tracker was ⏳, gap-register authoritative ✅); tracker footer updated: PW5-U4 → PW5-W2/W3/W4; audit matrix TECS-FBW-001 Disputes cell corrected; next sequenced unit: PW5-W2 / PW5-W3 / PW5-W4)
(GOV-SYNC-W2-TRACKER — governance-only reconciliation 2026-03-10; program: TECS-FBW-001 Wave 2 Authority Mutations; drift type: tracker rows stale (Finance ⏳ / Disputes ⏳) vs gap-register authoritative (Finance ✅ GOVERNANCE-SYNC-108 · Disputes ✅ GOVERNANCE-SYNC-109); root cause: tracker was not updated when GOVERNANCE-SYNC-108 and GOVERNANCE-SYNC-109 were recorded on 2026-03-07; correction: Finance row → ✅ CLOSED GOVERNANCE-SYNC-108 · 2026-03-07; Disputes row → ✅ CLOSED GOVERNANCE-SYNC-109 · 2026-03-07; sub-unit summary table corrected to match; tracker footer corrected: 'Recommended Immediate Next Unit: PW5-U4' → 'PW5-W2 / PW5-W3 / PW5-W4'; audit matrix TECS-FBW-001 row: 'Disputes: ⏳ Pending' → '✅ CLOSED (GOVERNANCE-SYNC-109 · 2026-03-07)'; secondary drift corrected: tracker footer still referenced 'PW5-U4' as next unit — PW5-U4 was closed under commit 3e2e14d (2026-03-09) per 561c5ac governance normalization; no implementation files changed; no code changed; files modified: IMPLEMENTATION-TRACKER-2026-03.md + gap-register.md + 2026-03-audit-reconciliation-matrix.md; GOV-SYNC-W2-TRACKER)
(GOVERNANCE-SYNC-PW5-U2U3-GOV — PW5-U2 ✅ CLOSED + PW5-U3 ✅ CLOSED + PW5-U1 ✅ CLOSED — 2026-03-10; program: PW5 — Tenant Identity Canonicalization; tranche group: PW5-U2 / PW5-U3 / PW5-U1 (absorbed); tranche class: dead UI gating — WL storefront residual cleanup (PW5-U2 supplementary, 024e5c5) + PW5-U3 retroactive confirmation (dead CP actions, d5ee430, 2026-03-09) + PW5-U4 retroactive confirmation (static CP panels, 3e2e14d, 2026-03-09); review verdict: PASS; defect classes resolved: (1) dead visible shell/nav affordances — B2BShell Negotiations/Invoices: NOT PRESENT in current codebase (absent from Shells.tsx — defect class verified absent, no action taken); AggregatorShell Post RFQ CTA: NOT PRESENT in current codebase (absent from Shells.tsx — defect class verified absent; Note: AggregatorShell dead unconditional Certifications button was resolved in GOVERNANCE-SYNC-114 Wave 4); WhiteLabelShell Collections/Journal nav items: NOT PRESENT in current codebase (absent from Shells.tsx — defect class verified absent, no action taken); (2) dead storefront affordance: App.tsx dead `case TenantType.WHITE_LABEL:` block removed — decorative "Explore the Collection" button had no onClick handler, no implementation path, and was unreachable post B2-REM-3 canonicalization (no tenant holds tenant_category='WHITE_LABEL' post-canonicalization); 35 lines removed; (3) B2CShell cart badge runtime wiring: confirmed already correctly wired via `const { itemCount } = useCart()` in Shells.tsx B2CShell component; PW5-U3-REM-1 satisfied by existing implementation; no code change required; deferred items remain deferred: tenant logout path (DEF-003), B2B profile/avatar action (DEF-004), B2C search behavior (DEF-005), WL storefront home/catalog completion (PW5-WL1), DPP backend truth audit; note: control-plane AdminRBAC/AiGovernance dead buttons were already resolved in PW5-U3 (d5ee430, 2026-03-09) — NOT deferred; implementation file: App.tsx only (1 file, 5 insertions / 35 deletions); typecheck EXIT 0 (frontend tsc + server tsc); git diff --name-only: App.tsx only at implementation time; governance artifacts updated: IMPLEMENTATION-TRACKER-2026-03.md + gap-register.md + 2026-03-audit-reconciliation-matrix.md; commit: [TEXQTIC] ui-gating: PW5-U2/U3 dead storefront affordance removed; cart badge confirmed wired; Block Condition 2 MET; Block Condition 2: BLOCK CONDITION 2 MET — PW5-U3 ✅ (d5ee430, 2026-03-09) + PW5-U4 ✅ (3e2e14d, 2026-03-09) + PW5-U2 ✅ (024e5c5, 2026-03-10) resolved; Wave 5 Architecture Block Conditions 1 AND 2 now fully MET; next sequenced unit: PW5-CP-PLAN + PW5-W series (PW5-U4 already closed in 3e2e14d, 2026-03-09); GOVERNANCE-SYNC-PW5-U2U3-GOV)
(GOVERNANCE-SYNC-PW5-V4-GOV — PW5-V4 ✅ PASS — formal closure 2026-03-10; tranche review verdict: PASS (TECS Review B3-REM-1/2/3, 2026-03-10); all medium-severity defects remediated (DEF-001 CLOSED by B3-REM-1; DEF-002 CLOSED by B3-REM-2; B3-REM-3 duplicate render anomaly resolved); low-severity defects DEF-003 (no logout in tenant shells) + DEF-004 (B2B avatar static) + DEF-005 (B2C search stub) explicitly deferred to PW5-U tranche — non-blocking to navigation failures; atomic commit 85f5655 (fix(shell-nav): remediate PW5-V4 navigation defects and duplicate experience render); repo clean post-commit; verification tranche completion: PW5-V1 ✅ (DPP runtime, TECS Unit B1, 2026-03-09) · PW5-V2 ✅ (Tenant Audit Logs, 2026-03-08) · PW5-V3 ✅ (TenantType canonicalization, TECS Unit B2, 2026-03-10) · PW5-V4 ✅ (Shell actions, TECS Unit B3, 2026-03-10); Wave 5 Architecture Block Condition 1 (verification tranche complete) NOW MET; governance artifacts updated: IMPLEMENTATION-TRACKER-2026-03.md + gap-register.md + 2026-03-audit-reconciliation-matrix.md; next sequenced unit: PW5-U2 / PW5-U3 dead UI gating tranche; GOVERNANCE-SYNC-PW5-V4-GOV)
(GOVERNANCE-SYNC-B3-REM-GOV — PW5-V4 ✅ PASS — 2026-03-10; shell navigation defect remediation (TECS Unit B3); B3-REM-1 ✅ CLOSED: onNavigateCart prop added to ShellProps; B2CShell cart icon changed from div to button with onClick={onNavigateCart}; onNavigateCart: () => setShowCart(true) wired in App.tsx props object; Shells.tsx + App.tsx modified; PW5-V4-DEF-001 CLOSED; B3-REM-2 ✅ CLOSED: SuperAdminShell COMPLIANCE NavLink label corrected from "Certifications" → "Compliance Queue"; SuperAdminShell.tsx modified; PW5-V4-DEF-002 CLOSED; B3-REM-3 ✅ CLOSED: redundant renderExperienceContent() removed from App.tsx props object — EXPERIENCE state renders content once via JSX children path only; App.tsx modified; 3 implementation files modified: Shells.tsx + SuperAdminShell.tsx + App.tsx; typecheck EXIT 0; lint EXIT 0; PW5-V4-DEF-003 (no logout) + DEF-004 (B2B avatar static) + DEF-005 (B2C search stub) deferred to PW5-U tranche — not blocking navigation failures; PW5-V4 tranche status: ⚠️ CONDITIONAL PASS → ✅ PASS; governance artifacts updated: IMPLEMENTATION-TRACKER-2026-03.md + gap-register.md + 2026-03-audit-reconciliation-matrix.md; GOVERNANCE-SYNC-B3-REM-GOV)
(GOVERNANCE-SYNC-PW5-V3-GOV — PW5-V3 ✅ PASS — 2026-03-10; formal tranche closure recorded following TECS Tranche Verification Report (2026-03-10); verdict: PASS — all five remediation layers (schema B2-REM-1, backend B2-REM-2, frontend B2-REM-3, OpenAPI B2-REM-4, provisioning B2-REM-5 + B2-REM-5A) confirmed complete; DEF-001 CLOSED (routing layer — INTERNAL explicitly covered via resolveExperienceShell, silent fallback removed); DEF-002 FULLY REMEDIATED (canonical identity model tenant_category + is_white_label confirmed as sole active identity model across schema, backend, frontend, OpenAPI contracts, and provisioning flow); DEF-003 CLOSED (serialization layer — tenant_category + is_white_label emitted in auth response); residual cleanup items logged separately (deprecated TenantType.WHITE_LABEL enum value + dead content case in App.tsx) — non-blocking; PW5-V3 tranche status: ❌ FAIL → ✅ PASS; governance artifacts updated: IMPLEMENTATION-TRACKER-2026-03.md + gap-register.md + 2026-03-audit-reconciliation-matrix.md; GOVERNANCE-SYNC-PW5-V3-GOV)
(GOVERNANCE-SYNC-B2-REM-5-GOV — B2-REM-5 ✅ CLOSED — 2026-03-10; contract commit f53dd40 + runtime completion commit 8f12b14; provisioning contract schema updated to canonical fields tenant_category + is_white_label; runtime provisioning flow aligned through backend types, Zod validation, route pass-through, service layer, Prisma create (`type`, `isWhiteLabel`), frontend service interface, and TenantRegistry provisioning UI (`tenant_category` dropdown + white-label checkbox); canonical tenant identity now persisted during tenant creation; PW5-V3-DEF-002 transitioned to FULLY REMEDIATED (schema + backend + frontend + OpenAPI + provisioning); PW5-V3 tranche status unchanged — ❌ FAIL pending verification closure)
(GOVERNANCE-SYNC-B2-REM-4-GOV — B2-REM-4 ✅ CLOSED — 2026-03-10; commit d5d6f84 (docs(api): synchronize OpenAPI contracts with canonical tenant identity (B2-REM-4)); OpenAPI files modified: openapi.tenant.json + openapi.control-plane.json (2 files; 171 insertions / 5 deletions); schemas added to openapi.tenant.json: LoginSuccessResponse (fields: success, data.token, data.user, data.tenant_category [enum: AGGREGATOR/B2B/B2C/INTERNAL], data.is_white_label [boolean], data.tenantType [deprecated: true]); MeSuccessResponse (fields: success, data.user, data.tenant [containing tenant_category, is_white_label, type deprecated:true, status, plan], data.role); schema added to openapi.control-plane.json: TenantObject (fields: id, slug, name, tenant_category [enum: AGGREGATOR/B2B/B2C/INTERNAL], is_white_label [boolean], status, plan); endpoint wiring in openapi.tenant.json: POST /api/auth/login 200 → LoginSuccessResponse; POST /api/auth/tenant/login 200 → LoginSuccessResponse; GET /api/me 200 → MeSuccessResponse; endpoint wiring in openapi.control-plane.json: GET /api/control/tenants 200 → array of TenantObject; GET /api/control/tenants/{id} 200 → TenantObject; legacy compat preservation: tenantType preserved in LoginSuccessResponse (deprecated: true); type preserved in MeSuccessResponse.data.tenant (deprecated: true); provisioning endpoint unchanged: /api/control/tenants/provision intentionally excluded (stale type enum preserved as-is; B2-REM-5 scope only); validation at implementation: JSON parse PASS (ConvertFrom-Json both files); schema strings confirmed present via Select-String; provision block confirmed untouched; git diff --name-only: 2 files only; defect transitions: PW5-V3-DEF-002 PARTIALLY REMEDIATED schema+backend+frontend→schema+backend+frontend+OpenAPI (4 of 5 layers complete; B2-REM-5 remains); PW5-V3-DEF-001 NO CHANGE — ✅ CLOSED (closed by B2-REM-3); PW5-V3-DEF-003 NO CHANGE — ✅ CLOSED (closed by B2-REM-2); PW5-V3 remains ❌ FAIL overall; governance artifacts updated: IMPLEMENTATION-TRACKER-2026-03.md + gap-register.md + 2026-03-audit-reconciliation-matrix.md; GOVERNANCE-SYNC-B2-REM-4-GOV)
(GOVERNANCE-SYNC-B2-REM-3-GOV — B2-REM-3 ✅ CLOSED — 2026-03-10; commit a198256 (feat(frontend): align shell routing to canonical tenant identity (B2-REM-3)); files changed at implementation layer: types.ts (TenantType enum: INTERNAL added; WHITE_LABEL removed; enum now canonical with AGGREGATOR / B2B / B2C / INTERNAL); services/authService.ts (currentTenant construction updated: tenant_category + is_white_label consumed from login response; compat fields retained); services/controlPlaneService.ts (canonical identity fields consumed in control-plane service layer); App.tsx (resolveExperienceShell(tenant_category, is_white_label) introduced as sole shell routing authority; INTERNAL → AggregatorShell via explicit named rule; white-label routing: t.is_white_label === true replaces stale TenantType.WHITE_LABEL identity check; silent default: fallback removed; unknown identity → explicit ⚠️ error UI); legacy tenantType / tenant.type compat bridge preserved — no breaking change to downstream consumers; validation: typecheck 0 errors; GET /health HTTP 200; git diff --name-only: 4 files (types.ts + services/authService.ts + services/controlPlaneService.ts + App.tsx); 79 insertions / 35 deletions; no schema/migration/backend/openapi/provisioning/test files changed in this governance unit; defect transitions: PW5-V3-DEF-001 OPEN→CLOSED (INTERNAL now has explicit frontend shell via resolveExperienceShell → AggregatorShell); PW5-V3-DEF-002 PARTIALLY REMEDIATED schema+backend→schema+backend+frontend (3 of 5 layers complete; B2-REM-4 + B2-REM-5 remain); PW5-V3-DEF-003 NO CHANGE — ✅ CLOSED (closed by B2-REM-2); PW5-V3 remains ❌ FAIL overall; governance artifacts updated: IMPLEMENTATION-TRACKER-2026-03.md + gap-register.md + 2026-03-audit-reconciliation-matrix.md; GOVERNANCE-SYNC-B2-REM-3-GOV)
(GOVERNANCE-SYNC-B2-REM-2-GOV — B2-REM-2 ✅ CLOSED — 2026-03-10; commit efbce82 (feat(backend): emit tenant_category and is_white_label in auth serialization layer); files changed at implementation layer: server/src/lib/database-context.ts (OrganizationIdentity interface: is_white_label boolean added; Prisma select: is_white_label: true added); server/src/routes/auth.ts (unified login: isWhiteLabel variable + tenant_category + is_white_label in sendSuccess; dedicated tenant login: fail-open getOrganizationIdentity block + tenant_category + tenantIsWhiteLabel in sendSuccess); server/src/routes/tenant.ts (GET /api/me tenant object: tenant_category + is_white_label added to type declaration and object literal); JWT payload unchanged — {userId, tenantId, role} — identity fields resolved at runtime via getOrganizationIdentity(); legacy fields tenantType and tenant.type preserved for compat; validation: typecheck 0 errors; GET /health HTTP 200; 7/7 integration tests PASS (auth-wave2-readiness.integration.test.ts, 315s); org_id / RLS posture unchanged; no schema/migration/frontend/openapi/provisioning/test files changed in this governance unit; defect transitions: PW5-V3-DEF-003 OPEN→CLOSED; PW5-V3-DEF-002 PARTIALLY REMEDIATED schema-only→schema+backend; PW5-V3-DEF-001 NO CHANGE OPEN; PW5-V3 remains ❌ FAIL overall; governance artifacts updated: IMPLEMENTATION-TRACKER-2026-03.md + gap-register.md + 2026-03-audit-reconciliation-matrix.md; GOVERNANCE-SYNC-B2-REM-2-GOV)
(GOVERNANCE-SYNC-B2-REM-1-GOV — B2-REM-1 ✅ CLOSED — 2026-03-09; commit d893524 (feat(schema): canonicalize tenant identity enum and add white-label flag); files changed at implementation layer: server/prisma/schema.prisma (AGGREGATOR added to TenantType enum; is_white_label column added to tenants + organizations); migration SQL (ALTER TYPE + ALTER TABLE + data migration backfill); validation gates 1–5 PASS; org_id / RLS posture unchanged — no RLS policy or tenant isolation logic modified; g026 + g028: syntax-only fixes applied as user-approved prerequisites to unblock prisma migrate deploy — zero functional change, incidental to migration apply, not part of B2-REM-1 design scope proper, do not create a new gap row; governance artifacts updated: IMPLEMENTATION-TRACKER-2026-03.md + gap-register.md + 2026-03-audit-reconciliation-matrix.md; no schema/migration/src/frontend/openapi/provisioning/test files changed in this governance unit; GOVERNANCE-SYNC-B2-REM-1-GOV)
(GOVERNANCE-SYNC-118 — GAP-AUTH-ORG-RLS-REALM-001 → ✅ CLOSED; root cause: withOrgAdminContext set app.realm='control'; live RLS policy organizations_control_plane_select requires app.current_realm()='admin'; under texqtic_app (NOBYPASSRLS) realm='control' produced 0 visible rows → OrganizationNotFoundError → GET /api/me 404 → amber banner for all provisioned tenants; fix: realm:'control' → realm:'admin' in withOrgAdminContext (server/src/lib/database-context.ts); docstring updated to document live policy semantics; app.is_admin='true' retained for forward-compat (not evaluated by any live organizations RLS policy); static: typecheck EXIT 0; lint EXIT 0; git diff --name-only: 1 file only; runtime: GET /health → 200; POST /api/auth/login → 200 tenantType:'B2B'; GET /api/me → 200 {user,tenant:{id,slug:'acme-corp',name:'Acme Corporation',type:'B2B',status:'ACTIVE',plan:'PROFESSIONAL'},role:'OWNER'}; commit 1dd40437040a95a8cdd5ace6002c3343d0528e024; push ff6181e..1dd4043 main→main; GAP-PROVISION-ORGS-BACKFILL-001 → INVALIDATED: organizations parity verified complete (388/388), root cause was RLS realm mismatch not backfill gap; GOVERNANCE-SYNC-118)
(GOVERNANCE-SYNC-114 — TECS-FBW-005 → ✅ CLOSED; Wave 4 first unit closed; implemented: services/certificationService.ts (NEW) — tenant types: CertificationListItem; CertificationDetail; CreateCertificationInput {certificationType,reason,issuedAt?,expiresAt?}; TransitionCertificationInput {toStateKey,reason,actorRole}; TransitionStatus:'APPLIED'|'PENDING_APPROVAL'|'ESCALATION_REQUIRED'; control types: AdminCertificationListItem; AdminCertificationDetail; tenant functions: createCertification(); listCertifications(); getCertification(); updateCertification() (PATCH; UI deferred); transitionCertification(); control functions: adminListCertifications(); adminGetCertification(); components/Tenant/CertificationsPanel.tsx (NEW) — LIST/CREATE/DETAIL/TRANSITION views; handleCreate validates certificationType+reason (D-020-D); handleTransition validates toStateKey+reason+actorRole; ESCALATION_REQUIRED renders as distinct result card not error (D-020-C); aiTriggered excluded entirely (D-020-C); actorRole required free-text input (not hardcoded actorType); all 3 transition outcomes rendered with distinct cards (APPLIED=green/PENDING_APPROVAL=amber/ESCALATION_REQUIRED=rose); ERROR_MESSAGES map for all backend error codes; components/ControlPlane/CertificationsAdmin.tsx (NEW) — read-only cross-tenant admin surface; optional orgId+stateKey filter inputs; adminListCertifications() via adminGet; READ-ONLY·D-022-C badge; no Create/Transition/Patch controls anywhere (D-022-C); App.tsx (SUNE — CertificationsPanel+CertificationsAdmin imported; 'CERTIFICATIONS' added to expView union; renderExperienceContent CERTIFICATIONS branch; renderAdminView case 'CERTIFICATIONS'; onNavigateCertifications shell prop); layouts/SuperAdminShell.tsx (SUNE — 'CERTIFICATIONS' added to AdminView union; 📋 Cert Lifecycle NavLink in Risk & Compliance after ESCALATIONS); layouts/Shells.tsx (SUNE — onNavigateCertifications?:()=>void added to ShellProps; all 4 shells destructure updated; AggregatorShell dead unconditional Certifications button replaced with conditional pattern; B2BShell+B2CShell+WhiteLabelShell conditional nav buttons added after Settlement); shared/contracts/openapi.tenant.json (SUNE — 5 certification paths added: POST /api/tenant/certifications; GET /api/tenant/certifications; GET /api/tenant/certifications/{id}; PATCH /api/tenant/certifications/{id}; POST /api/tenant/certifications/{id}/transition with 422 TRANSITION_NOT_APPLIED); shared/contracts/openapi.control-plane.json (SUNE — 2 certification admin paths added: GET /api/control/certifications; GET /api/control/certifications/{id} with isTerminal flag); D-017-A: orgId absent from all frontend request body types; D-020-C: aiTriggered excluded; ESCALATION_REQUIRED surfaced as read-only result state only; D-020-D: reason mandatory for create+transition; frontend validates before submit; D-022-C: CertificationsAdmin.tsx strictly read-only — no mutation controls; DPPPassport.tsx untouched (certifications_v1 snapshot view—constitutionally out of scope); ComplianceQueue.tsx untouched; 8 files total: 3 NEW + 5 SUNE; typecheck EXIT 0; lint EXIT 0; next: TECS-FBW-015 Wave 4; GOVERNANCE-SYNC-114)
(GOVERNANCE-SYNC-113 — TECS-FBW-004 → ✅ CLOSED; Wave 3 gate CLOSED (TECS-FBW-002-A ✅ · TECS-FBW-003-A ✅ · TECS-FBW-006-A ✅ · TECS-FBW-004 ✅); TECS-FBW-002-B remains BLOCKED backend dependency; next: TECS-FBW-005 Wave 4; implemented: services/settlementService.ts (NEW) — PreviewSettlementInput {tradeId,escrowId,amount,currency}; PreviewOkResult {status:'OK',currentBalance,projectedBalance,wouldSucceed}; SettlementErrorResult {status:'ERROR',code,message}; SettleEscrowInput {tradeId,escrowId,amount,currency,referenceId,reason,actorType:'TENANT_USER'}; SettleAppliedResult {status:'APPLIED',transactionId,escrowReleased,tradeClosed}; SettlePendingResult {status:'PENDING_APPROVAL',requiredActors:('MAKER'|'CHECKER')[]}; previewSettlement() POST /api/tenant/settlements/preview; settleEscrow() POST /api/tenant/settlements via tenantPost — no tenantId in body D-017-A; D-020-B comment explicit; components/Tenant/SettlementPreview.tsx (NEW) — two-phase flow Phase 1: tradeId/escrowId/amount/currency form + previewSettlement() → balance result card (currentBalance/projectedBalance/wouldSucceed); Phase 2: confirm form (referenceId + reason) rendered only when wouldSucceed=true (D-020-B canConfirm gate); settleEscrow() → APPLIED card (transactionId/escrowReleased/tradeClosed) or PENDING_APPROVAL card (requiredActors) or ERROR card; all settlement error codes mapped to user-friendly messages (INSUFFICIENT_ESCROW_FUNDS/ENTITY_FROZEN/DUPLICATE_REFERENCE/STATE_MACHINE_DENIED/TRADE_DISPUTED/AI_HUMAN_CONFIRMATION_REQUIRED/MAKER_CHECKER_REQUIRED); actorType fixed to TENANT_USER; aiTriggered excluded; no control-plane settlement; LoadingState shared component used; App.tsx (SUNE — SettlementPreview imported; 'SETTLEMENT' added to expView union; renderExperienceContent SETTLEMENT branch; onNavigateSettlement shell prop); layouts/Shells.tsx (SUNE — onNavigateSettlement?:()=>void added to ShellProps + all 4 shells; Settlement nav button after Escalations in each shell); shared/contracts/openapi.tenant.json (SUNE — POST /api/tenant/settlements/preview schema + POST /api/tenant/settlements schema added; both D-017-A noted); ARCHITECTURE-GOVERNANCE.md — no new rule introduced; unchanged; typecheck EXIT 0; lint EXIT 0; git diff --name-only: 2 new + 3 SUNE = 5 files; TECS-FBW-004 fully closed; GOVERNANCE-SYNC-113)
(GOVERNANCE-SYNC-112 — TECS-FBW-006-A → ✅ CLOSED (implemented: services/escalationService.ts (NEW) — EscalationEvent interface {id,orgId,entityType,entityId,parentEscalationId:string|null,source,severityLevel:number(0-4),freezeRecommendation:boolean,triggeredByActorType,triggeredByPrincipal,reason,status:'OPEN'|'RESOLVED'|'OVERRIDDEN',resolvedByPrincipal:string|null,resolutionReason:string|null,resolvedAt:string|null,createdAt:string}; EscalationListParams {entityType?,entityId?,status?,limit?}; EscalationListResponse {escalations:EscalationEvent[],count:number}; listEscalations(params?) GET /api/tenant/escalations via tenantGet — query params only, no orgId in request body (D-017-A), JWT-org scoped; components/Tenant/EscalationsPanel.tsx (NEW) — fetch on mount via listEscalations({limit:50}); SeverityBadge L0=slate/L1=yellow/L2=orange/L3=rose/L4=rose(dark); StatusBadge OPEN=rose/RESOLVED=emerald/OVERRIDDEN=slate; read-only table: Escalation ID, Entity Type, Entity ID, Severity badge, Status badge, Created; loading/error/empty states; no mutation controls; onBack prop; components/ControlPlane/EscalationOversight.tsx (NEW) — admin cross-org escalation read; orgId input-gated (FetchState IDLE|LOADING|ERROR|DONE); table: Escalation ID, Entity Type, Entity ID, Severity badge, Status badge, Source, Created; freezeRecommendation informational only — no kill-switch toggle (D-022-C); services/controlPlaneService.ts (SAME-UNIT NECESSARY EXPANSION — ControlPlaneEscalationEvent; EscalationsQueryParams; EscalationsListResponse; getEscalations(orgId,params?) GET /api/control/escalations — orgId mandatory, API returns 400 if absent); layouts/Shells.tsx (SAME-UNIT NECESSARY EXPANSION — onNavigateEscalations?:()=>void added to ShellProps + all 4 shells); layouts/SuperAdminShell.tsx (SAME-UNIT NECESSARY EXPANSION — 'ESCALATIONS' added to AdminView union; 🚨 Escalations NavLink under Risk & Compliance after Disputes); App.tsx (SAME-UNIT NECESSARY EXPANSION — EscalationsPanel+EscalationOversight imported; expView union extended to include 'ESCALATIONS'; renderExperienceContent branch; case 'ESCALATIONS': return <EscalationOversight />; onNavigateEscalations in shell props); shared/contracts/openapi.control-plane.json (SAME-UNIT NECESSARY EXPANSION — GET /api/control/escalations: orgId mandatory, full response schema, D-022-C noted); shared/contracts/openapi.tenant.json (SAME-UNIT NECESSARY EXPANSION — GET /api/tenant/escalations: D-017-A JWT-scoped, full response schema); DisputeCases.tsx MISROUTING CLAIM DISPROVED — DisputeCases.tsx correctly calls GET /api/control/disputes (event-log domain, structurally separate from G-022 escalation_events); DisputeCases.tsx NOT modified, NOT repurposed; no backend change; no schema/RLS/auth change; no mutation wiring — read-only in this unit; TECS-FBW-006-B (mutations: upgrade/resolve/override) remains future scope; typecheck EXIT 0; lint EXIT 0; git diff --name-only: 6 modified + 3 untracked = 9 files; DisputeCases.tsx confirmed unmodified; TECS-FBW-006-A fully closed; GOVERNANCE-SYNC-112)
(GOVERNANCE-SYNC-111 — TECS-FBW-003-A → ✅ CLOSED (implemented: services/escrowService.ts (NEW) — EscrowAccount interface {id,tenantId,currency,lifecycleStateId,lifecycleStateKey:string|null,createdByUserId:string|null,createdAt,updatedAt}; EscrowListParams {limit?,offset?}; EscrowListResponse {escrows:EscrowAccount[],count:number,limit:number,offset:number}; listEscrows(params?) GET /api/tenant/escrows via tenantGet — query params only, no request body, D-017-A comment explicit, D-020-B: no balance in list response; components/Tenant/EscrowPanel.tsx (NEW) — fetch on mount via listEscrows(); StateBadge color-coded DRAFT/ACTIVE/SETTLED/CLOSED/DISPUTED; truncateId/formatDate helpers; read-only table columns: Escrow ID (truncated+title), Currency, State badge, Created; loading/error/empty states; no balance column (D-020-B enforced); no mutation controls; onBack prop resets expView to HOME; layouts/Shells.tsx (SAME-UNIT NECESSARY EXPANSION — onNavigateEscrow?:()=>void added to ShellProps interface; destructured and conditional nav button added to all four shells AggregatorShell/B2BShell/B2CShell/WhiteLabelShell mirroring established Orders/DPP pattern exactly); App.tsx — EscrowPanel imported; expView union extended to 'HOME'|'ORDERS'|'DPP'|'ESCROW'; if(expView==='ESCROW') return <EscrowPanel onBack={...}/> added to renderExperienceContent; onNavigateEscrow:()=>setExpView('ESCROW') added to shell props object; shared/contracts/openapi.tenant.json (SAME-UNIT NECESSARY EXPANSION — GET /api/tenant/escrows path added; query params limit/offset documented; all response fields documented; D-017-A and D-020-B noted in description); no backend change; no schema/RLS/auth change; no mutation wiring; TECS-FBW-003-B (mutations + detail view) remains future scope; typecheck EXIT 0 (pnpm run typecheck — frontend tsc + server tsc); lint EXIT 0 (pnpm run lint — 0 errors 0 warnings); git status --short: 5 files (App.tsx + layouts/Shells.tsx + shared/contracts/openapi.tenant.json + components/Tenant/EscrowPanel.tsx + services/escrowService.ts); TECS-FBW-003-A fully closed; GOVERNANCE-SYNC-111)
(GOVERNANCE-SYNC-110 — TECS-FBW-002-A → ✅ CLOSED (implemented: services/controlPlaneService.ts — TradeLifecycleState interface {id,entityType,stateKey,label,isFinalState}; Trade interface {id,tenantId,buyerOrgId,sellerOrgId,tradeReference,currency,grossAmount:number|string,lifecycleState:TradeLifecycleState|null,createdAt,updatedAt}; TradesQueryParams {tenantId?,status?,limit?,offset?}; TradesResponse {trades:Trade[],count:number}; listTrades(params?) GET /api/control/trades via adminGet — query params only, no request body, D-017-A comment explicit; components/ControlPlane/TradeOversight.tsx (NEW) — fetch on mount; optional tenantId filter input maps to ?tenantId= query param only (D-017-A: admin filter not identity assertion); StatusBadge color-coded DRAFT/ACTIVE/SETTLED/DISPUTED/CANCELLED; truncateId/formatDate/formatAmount helpers; read-only table columns: Trade ID (truncated+title), Tenant ID (truncated+title), Reference, Status badge, Gross Amount, Created; loading/error/empty states; no mutation controls; no body-bearing requests; layouts/SuperAdminShell.tsx (SAME-UNIT NECESSARY EXPANSION — 'TRADES' added to AdminView union; Trade Oversight NavLink added under Governance section, icon 🔄); App.tsx — TradeOversight imported; case 'TRADES': return <TradeOversight /> added to renderAdminView switch; shared/contracts/openapi.control-plane.json (SAME-UNIT NECESSARY EXPANSION — GET /api/control/trades path added per same-wave OpenAPI obligation from IMPLEMENTATION-TRACKER §OpenAPI Update Obligation; query params: tenantId/status/limit/offset documented; D-017-A note in description); no backend change; no schema/RLS/auth change; no tenant-facing surface created; TECS-FBW-002-B BLOCKED — GET /api/tenant/trades route does not exist; typecheck EXIT 0 (pnpm run typecheck — frontend tsc + server tsc); lint EXIT 0 (pnpm run lint — 0 errors 0 warnings); git diff --name-only: App.tsx + layouts/SuperAdminShell.tsx + services/controlPlaneService.ts + shared/contracts/openapi.control-plane.json + components/ControlPlane/TradeOversight.tsx (5 files); TECS-FBW-002-A fully closed; TECS-FBW-002 parent remains PARTIALLY OPEN (TECS-FBW-002-B pending backend prerequisite); GOVERNANCE-SYNC-110)
(GOVERNANCE-SYNC-109 — TECS-FBW-001 Disputes sub-unit → ✅ CLOSED (implemented: services/controlPlaneService.ts — DisputeAuthorityBody interface {resolution?:string; notes?:string}; DisputeAuthorityResponse {success:boolean; data?:Record<string,unknown>}; resolveDispute(disputeId, body, idempotencyKey) POST /api/control/disputes/:id/resolve via adminPostWithHeaders with Idempotency-Key; escalateDispute(disputeId, body, idempotencyKey) POST /api/control/disputes/:id/escalate via adminPostWithHeaders with Idempotency-Key; adminApiClient.ts NOT modified — adminPostWithHeaders already present from GOVERNANCE-SYNC-107; components/ControlPlane/DisputeCases.tsx — file header comment added; useCallback imported; ActionType = 'resolve'|'escalate'; PendingAction state {type,disputeId,disputeLabel,idempotencyKey}; resolution/notes/submitting/dialogError state; loadDisputes() useCallback extracted for re-fetch; handleAction() generates window.crypto.randomUUID() at click time before dialog opens; handleCancel() closes without submit; handleConfirm() submits preserved idempotencyKey for either resolveDispute or escalateDispute, treats 200 replay and 201 created as success, re-fetches list on success, shows inline dialogError on failure; resolve/escalate button pair added as additive row below existing card footer border; buttons suppressed for c.status==='RESOLVED' disputes; confirm dialog with labeled resolution (optional) + notes (optional) textarea inputs (htmlFor wired); dialog title 'Record Resolution Decision' / 'Record Escalation Decision'; dialog verb 'Resolve' / 'Escalate'; field names match backend Zod schema exactly (resolution, not reason); route gating: any-admin (adminAuthMiddleware only; no SUPER_ADMIN preHandler); openapi.control-plane.json NOT modified — both dispute POST routes already present and accurate; no backend change; no schema/RLS/auth change; envelope: 2 files only (services/controlPlaneService.ts + components/ControlPlane/DisputeCases.tsx); typecheck EXIT 0 (pnpm run typecheck — frontend tsc + server tsc); lint EXIT 0 (pnpm run lint — 0 errors 0 warnings); git diff --name-only: services/controlPlaneService.ts + components/ControlPlane/DisputeCases.tsx only; ComplianceQueue and FinanceOps unchanged; TECS-FBW-001 all 3 sub-units now ✅ CLOSED; Wave 2 TECS-FBW-001 fully complete; GOVERNANCE-SYNC-109)
(GOVERNANCE-SYNC-108 — TECS-FBW-001 Finance sub-unit → ✅ CLOSED (implemented: services/controlPlaneService.ts — FinanceAuthorityBody interface {reason?:string}; FinanceAuthorityResponse; approvePayoutDecision(payoutId, body, idempotencyKey) POST /api/control/finance/payouts/:id/approve; rejectPayoutDecision(payoutId, body, idempotencyKey) POST /api/control/finance/payouts/:id/reject; Idempotency-Key sent per-call via adminPostWithHeaders (already present from Compliance sub-unit — no adminApiClient.ts change required); components/ControlPlane/FinanceOps.tsx — file header comment added (IMPORTANT: records authority decisions only; no funds moved); useCallback imported; PendingAction state {type,payoutId,payoutLabel,idempotencyKey}; reason/submitting/dialogError state; loadPayouts() useCallback extracted for re-fetch; handleAction() generates window.crypto.randomUUID() on click before dialog opens; handleCancel() closes without submit; handleConfirm() submits preserved idempotencyKey, treats 200 replay and 201 created as success, re-fetches list on success, shows inline dialogError on failure; Actions column added to table with Approve/Reject buttons per row; confirm dialog with labeled reason-only input (no notes field — finance body is {reason?} only) and conditional confirm/reject button; dialog copy: 'Record Approval Decision' / 'Record Rejection Decision' — explicitly states no funds moved or released; openapi.control-plane.json NOT modified — both finance POST routes already present; adminApiClient.ts NOT modified — adminPostWithHeaders already present from GOVERNANCE-SYNC-107; no backend change; no schema/RLS/auth change; envelope: 2 files only (services/controlPlaneService.ts + components/ControlPlane/FinanceOps.tsx); typecheck EXIT 0 (pnpm run typecheck — frontend tsc + server tsc); lint EXIT 0 (pnpm run lint — 0 errors 0 warnings); git diff --name-only: services/controlPlaneService.ts + components/ControlPlane/FinanceOps.tsx only; ComplianceQueue and DisputeCases unchanged; Disputes sub-unit remains ⏳ Pending; GOVERNANCE-SYNC-108)
(GOVERNANCE-SYNC-107 — TECS-FBW-001 Compliance sub-unit → ✅ CLOSED (implemented: services/adminApiClient.ts — adminPostWithHeaders added (SAME-UNIT NECESSARY EXPANSION: adminPost lacked per-call extra-header support; realm guard preserved); services/controlPlaneService.ts — ComplianceAuthorityBody interface {reason?:string; notes?:string}; ComplianceAuthorityResponse; approveComplianceRequest(requestId, body, idempotencyKey) POST /api/control/compliance/requests/:id/approve; rejectComplianceRequest(requestId, body, idempotencyKey) POST /api/control/compliance/requests/:id/reject; Idempotency-Key sent per-call via adminPostWithHeaders; components/ControlPlane/ComplianceQueue.tsx — PendingAction state {type,requestId,requestLabel,idempotencyKey}; reason/notes/submitting/dialogError state; loadRequests() useCallback extracted for re-fetch; handleAction() generates window.crypto.randomUUID() on click before dialog opens; handleCancel() closes without submit; handleConfirm() submits preserved idempotencyKey, treats 200 replay and 201 created as success, re-fetches list on success, shows inline dialogError on failure; Actions column added to table with Approve/Reject buttons per row; confirm dialog with labeled reason+notes inputs (htmlFor wired) and conditional confirm/reject button; openapi.control-plane.json NOT modified — both compliance POST routes already present; no backend change; no schema/RLS/auth change; envelope: 3 files allowlisted + adminApiClient.ts SAME-UNIT NECESSARY EXPANSION; typecheck EXIT 0 (pnpm run typecheck — frontend tsc + server tsc); lint EXIT 0 (pnpm run lint — 0 errors 0 warnings); git diff --name-only: components/ControlPlane/ComplianceQueue.tsx + services/adminApiClient.ts + services/controlPlaneService.ts only; FinanceOps and DisputeCases unchanged; GOVERNANCE-SYNC-107)
(GOVERNANCE-SYNC-106 — TECS-FBW-AT-006 → ✅ CLOSED (implemented: components/Tenant/EXPOrdersPanel.tsx — VER-005 FAIL confirmed 2026-03-07; getCurrentUser() from authService imported and called in parallel with tenantGet('/api/tenant/orders') via Promise.all with .catch(()=>null) safe-fail; userRole:string|null state stores meRes?.role; canManageOrders = userRole==='OWNER'||userRole==='ADMIN' computed once per render in IIFE; actions.length===0||!canManageOrders gates Actions cell to dash (no buttons for MEMBER/VIEWER); OWNER/ADMIN behavior unchanged; backend route tenant.ts unchanged; file header comment updated; no App.tsx change; envelope preserved: 1 file only; typecheck EXIT 0; lint EXIT 0; git diff --name-only: components/Tenant/EXPOrdersPanel.tsx only; commit b01fcd3; all Wave 1 implementation units now closed; GOVERNANCE-SYNC-106)
(GOVERNANCE-SYNC-105 — TECS-FBW-017 → ✅ CLOSED (governance-only; no code change required; direct inspection of WLCollectionsPanel.tsx confirms defensive grouping already implemented: const UNCATEGORISED = ‘Uncategorised’; grouping key = (item.category ?? ‘’).trim() || UNCATEGORISED; null/undefined/whitespace all bucket into UNCATEGORISED; stable sort: named categories alpha-first then UNCATEGORISED last; file header states ‘Items without a category fall into the “Uncategorised” group’; catalogService.ts: category?: string (optional) correctly typed; all acceptance criteria satisfied by existing code shipped in GOVERNANCE-SYNC-066; PROVISIONAL gap was a pre-implementation risk projection that was resolved when WLCollectionsPanel was built; no code modified; no typecheck/lint run required; GOVERNANCE-SYNC-105)
(GOVERNANCE-SYNC-104 — TECS-FBW-008 → ✅ CLOSED (implemented: WhiteLabelSettings.tsx — added onNavigateDomains?: () => void optional prop; replaced dead uncontrolled input + no-op Connect button + hardcoded DNS card with conditional UI: when prop provided (WL_ADMIN BRANDING context) renders ‘Manage Custom Domains →’ button that calls onNavigateDomains; when prop absent (EXPERIENCE SETTINGS context) renders static informational note directing user to WL Admin Domains panel; App.tsx BRANDING case wired: onNavigateDomains={() => setWlAdminView(‘DOMAINS’)}; EXPERIENCE SETTINGS call site unchanged — no prop → informational note; WLDomainsPanel.tsx: zero changes; no duplicate domain CRUD; no backend/API change; branding save flow (colors, logo URL) unchanged; typecheck EXIT 0 (pnpm tsc --noEmit); lint EXIT 0 (scoped: WhiteLabelSettings.tsx + App.tsx; prior units precedent; server tsc excluded — pre-existing separation); git diff --name-only: App.tsx + components/Tenant/WhiteLabelSettings.tsx only; GOVERNANCE-SYNC-104)
(GOVERNANCE-SYNC-103 — TECS-FBW-MOQ → ✅ CLOSED (implemented: B2CAddToCartButton in App.tsx — added addError: string|null state; setAddError(null) on each attempt; setAddError(err.message) on APIError catch, fallback message otherwise; inline <p> below button renders rose-600 error text to user; MOQ_NOT_MET 422 message surfaced directly from APIError.message (set by tenantPost 422 handler); success path unchanged; B2BAddToCartButton unchanged — shows Request Quote, no addToCart call; no CartContext.tsx change needed — context already re-throws; APIError already imported in App.tsx line 43; typecheck EXIT 0; lint EXIT 0; App.tsx only; GOVERNANCE-SYNC-103)
(GOVERNANCE-SYNC-102 — TECS-FBW-014 → ✅ CLOSED (implemented: ORDER_CONFIRMED appState added to App.tsx union; confirmedOrderId state stores orderId from checkout result; Cart.tsx onCheckoutSuccess optional prop propagates CheckoutResult to App-level; on checkout success setConfirmedOrderId(result.orderId) + setShowCart(false) + setAppState('ORDER_CONFIRMED'); ORDER_CONFIRMED case renders full-screen confirmation with orderId, View My Orders → expView='ORDERS' + EXPERIENCE, Continue Shopping → expView='HOME' + EXPERIENCE; in-cart local confirmation preserved as fallback (backward-compat); typecheck EXIT 0; lint EXIT 0; App.tsx + components/Cart/Cart.tsx; GOVERNANCE-SYNC-102)
(GOVERNANCE-SYNC-101 — TECS-FBW-020 → ✅ CLOSED (implemented: wlAdminInviting bool substate in App.tsx; renderWLAdminContent() early-returns InviteMemberForm in-shell when wlAdminInviting=true; STAFF case calls setWlAdminInviting(true) instead of setAppState('INVITE_MEMBER'); onViewChange resets wlAdminInviting on nav; appState===WL_ADMIN preserved throughout — WhiteLabelAdminShell never drops; EXPERIENCE invite flow unchanged; Shells.tsx untouched; typecheck EXIT 0; lint EXIT 0; App.tsx only; all acceptance criteria met; GOVERNANCE-SYNC-101)
(GOVERNANCE-SYNC-100 — VER-002 → ✅ CLOSED (read-only verification; TECS-FBW-020 confirmed FAIL — INVITE_MEMBER appState set from WL_ADMIN STAFF panel routes into EXPERIENCE case group in App.tsx main switch; WhiteLabelShell renders instead of WhiteLabelAdminShell; onBack sets TEAM_MGMT which also routes through EXPERIENCE group — WL Admin chrome permanently lost; no code modified; VER-002 evidence: App.tsx lines 1100/1143; renderWLAdminContent line 398; renderExperienceContent lines 528-529; TECS-FBW-020 → VALIDATED + Wave 1; ARCHITECTURE-GOVERNANCE.md updated with Atomic Change Envelope Rule + Envelope Precedence Rule; GOVERNANCE-SYNC-100)
(GOVERNANCE-SYNC-099 — TECS-FBW-PROV-001 → ✅ CLOSED (implemented: ProvisionTenantRequest {orgName,primaryAdminEmail,primaryAdminPassword}; ProvisionTenantResponse flat {orgId,slug,userId,membershipId}; TenantRegistry.tsx call site + response consumption aligned; tenantProvision.ts stale /api/admin → /api/control comments fixed (doc-only); typecheck EXIT 0; lint EXIT 0; GOVERNANCE-SYNC-099)
(GOVERNANCE-SYNC-098 — VER-001 → ✅ CLOSED (read-only verification; TECS-FBW-PROV-001 confirmed FAIL — field-level contract mismatch: frontend sends {name,slug,type,ownerEmail,ownerPassword}, backend Zod expects {orgName,primaryAdminEmail,primaryAdminPassword}; backend returns flat {orgId,slug,userId,membershipId}, frontend ProvisionTenantResponse expects nested {tenant:{id,name,slug,type,status},owner:{id,email}}; runtime: deterministic HTTP 400 on every provisionTenant() call; Codex §4.1 confirmed correct; Copilot §3 "Wired" superseded by field-level inspection; TECS-FBW-PROV-001 → VALIDATED + Wave 1; no code modified; GOVERNANCE-SYNC-098)
(GOVERNANCE-SYNC-097 — TECS-FBW-LINT-001 → ✅ CLOSED (repo-gate remediation; discovered during TECS-FBW-011 closeout): eslint.config.js (MODIFIED — targeted override block for middleware.ts Vercel Edge Runtime globals only: TextEncoder, crypto, Response, Request, Headers, URL, process readonly; no middleware.ts change; no blanket disable suppressions); pnpm run lint EXIT 0; typecheck EXIT 0; git diff --name-only: eslint.config.js only; GOVERNANCE-SYNC-097)
(GOVERNANCE-SYNC-096 — TECS-FBW-011 → ✅ CLOSED (parallel-safe ship-blocker override, Wave 1): services/catalogService.ts (MODIFIED — removed basePrice?: number from CatalogItem interface; canonical field price: number confirmed); App.tsx (MODIFIED — 3 p.basePrice render sites → p.price: lines 499, 711, 854); components/WhiteLabelAdmin/WLCollectionsPanel.tsx (MODIFIED — 4th render site discovered during typecheck: displayPrice = item.basePrice ?? item.price → item.price); no backend change; no schema/RLS/migration change; typecheck EXIT 0; lint EXIT 0 (scoped to 3 changed files); git diff --name-only: 3 files only; GOVERNANCE-SYNC-096)
(GOVERNANCE-SYNC-093 — OPS-WLADMIN-DOMAINS-001 → ✅ TECS 6D VALIDATED: WLDomainsPanel.tsx (NEW — Path D6D-A CRUD-lite: GET+POST+DELETE /api/tenant/domains; platform domain badge <slug>.texqtic.app read-only; custom domains list with add/remove; delete confirmation dialog; toast feedback; RFC1123 input validation); server/src/routes/tenant.ts (MODIFIED — GET /api/tenant/domains, POST /api/tenant/domains body:{domain:string} Zod regex lowercase, DELETE /api/tenant/domains/:id; role guard OWNER|ADMIN; withDbContext RLS-enforced; writeAuditLog domain.added/domain.removed; P2002 → 409 generic conflict; emitCacheInvalidate after each mutation); server/src/lib/cacheInvalidateEmitter.ts (NEW — direct-call emitter: normalize+log, no HTTP round-trip); App.tsx (MODIFIED — WLDomainsPanel import + case 'DOMAINS' stub replaced); Shells.tsx — NO CHANGE (DOMAINS nav already present); no DB migration; no schema/RLS change; G-026-G ✅ VALIDATED (WL Domains panel shipped); G-026-F ✅ Resolved (cache invalidation emitters wired); typecheck EXIT 0; lint EXIT 0 (0 errors, 108 pre-existing warnings); GOVERNANCE-SYNC-093)
(GOVERNANCE-SYNC-092 — G-026-CUSTOM-DOMAIN-ROUTING-CACHE-INVALIDATE-001 → ✅ TECS 6C3 VALIDATED: POST /api/internal/cache-invalidate implemented; HMAC-SHA256 auth canonical="invalidate:"+tsMs+":"+sha256(bodyJson); replay window 30s; body contract {hosts[1..100], reason, requestId?}; host normalization via normalizeHost(); 200 {status:"ok", invalidated:n}; Edge invalidation best-effort TTL=60s (no cross-instance shared memory between Node.js serverless and Edge V8 isolates); emitters deferred to TECS 6D (no tenant_domains CRUD routes exist yet); no DB migration; typecheck EXIT 0; lint EXIT 0; GOVERNANCE-SYNC-092) D1–D8 locked; D1=Hybrid (Edge Middleware + Backend validation); D2=Platform subdomains v1 (<slug>.texqtic.app), custom domains deferred v1.1; D3=Backend resolver endpoint HMAC-signed (GET /api/internal/resolve-domain); D4=Narrow BYPASSRLS resolver via texqtic_service role (SELECT tenants(id,slug) only); D5=Edge in-memory TTL cache 60s + webhook invalidation; D6=Internal signed resolver contract {tenantId,tenantSlug,canonicalHost,status}, identical 404 for all non-resolved; D7=x-texqtic-tenant-id+x-texqtic-tenant-source+x-texqtic-resolver-sig headers; strip inbound x-texqtic-* before injection; Fastify validates HMAC; D8=Fail-closed; cache-invalidate webhook on domain CRUD; platform domain passthrough allowlist; G-026-B..G resolved by design; G-026-A deferred v1.1; G-026-H registered (texqtic_service role not yet created — blocking 6C1 deploy); design doc: docs/architecture/CUSTOM-DOMAIN-ROUTING-DESIGN.md; TECS sequence: 6C1→6C2→6C3→6D; no code/schema/RLS changes; GOVERNANCE-SYNC-089)
(GOVERNANCE-SYNC-088 — G-026-CUSTOM-DOMAIN-ROUTING-DISCOVERY-001 → 🔄 IN PROGRESS (Discovery Complete): tenant_domains schema audited — 6 columns confirmed (domain UNIQUE, tenant_id FK CASCADE, verified bool, primary bool); FORCE RLS=t confirmed; G-006C Wave 3 Tail canonical RLS applied (GOVERNANCE-SYNC-054); NO host-header routing exists anywhere in codebase — tenantAuthMiddleware JWT-only, tenantContext.ts X-Tenant-Id removed (G-W3-A1), realmGuard URL-prefix only, vercel.json no edge middleware, api/index.ts no host handling, MiddlewareScaffold.tsx UI stub only; 3 routing insertion options documented (A: Vercel Edge Middleware, B: Fastify pre-auth hook, C: Hybrid); DNS architecture specified; 7 gaps registered (G-026-A through G-026-G); STOP CONDITION NOT TRIGGERED; discovery doc: docs/architecture/CUSTOM-DOMAIN-ROUTING-DISCOVERY.md; no schema/code/RLS changes; GOVERNANCE-SYNC-088)
(GOVERNANCE-SYNC-087 — G-025-DPP-API-UI-MANUFACTURER-ENABLE-001 → ✅ VALIDATED: tenant.ts DPP handler updated — SELECT now includes manufacturer_name/jurisdiction/registration_no from view; manufacturer fields added to product response object; meta.manufacturerFields sentinel removed; DPPPassport.tsx updated — amber omission banner removed; manufacturer sub-section added to Product Identity card (renders value or ‘Manufacturer details unavailable’); omission note div removed; server typecheck EXIT 0; lint EXIT 0; G-025 DPP end-to-end manufacturer fields fully enabled; GOVERNANCE-SYNC-087)
(GOVERNANCE-SYNC-086 — G-025-DPP-VIEWS-MANUFACTURER-RESTORE-001 → ✅ VALIDATED: migration `20260316000003_g025_dpp_views_manufacturer_restore` applied to remote Supabase via psql; APPLY_EXIT:0; VERIFIER PASS: dpp_snapshot_products_v1 recreated with manufacturer_name (organizations.legal_name), manufacturer_jurisdiction (organizations.jurisdiction), manufacturer_registration_no (organizations.registration_no) via LEFT JOIN organizations ON id=org_id; security_invoker=true preserved; texqtic_app SELECT grant intact; RESOLVE_EXIT:0 (79 migrations, schema up to date); typecheck EXIT 0; lint EXIT 0; DPP manufacturer fields fully restored post G-025-ORGS-RLS-001 fix; GOVERNANCE-SYNC-086)
(GOVERNANCE-SYNC-085 — G-025-ORGS-RLS-TENANT-SELECT-001 → ✅ VALIDATED: migration `20260316000002_g025_orgs_rls_tenant_select` applied to remote Supabase via psql; APPLY_EXIT:0; VERIFIER PASS: FORCE RLS=t+t confirmed, `organizations_guard_policy` RESTRICTIVE ALL with 3 arms (bypass_enabled + current_realm='admin' + require_org_context), `organizations_tenant_select` PERMISSIVE SELECT USING (id=app.current_org_id()) created, all 3 control-plane policies unchanged, texqtic_app SELECT grant intact; RESOLVE_EXIT:0 (78 migrations, schema up to date); typecheck EXIT 0; lint EXIT 0; G-025-ORGS-RLS-001 → ✅ VALIDATED; unblocks manufacturer fields restoration to DPP views (follow-on TECS 5C); GOVERNANCE-SYNC-085)
(GOVERNANCE-SYNC-084 — G-025-ORGS-RLS-DISCOVERY-001 → ✅ DISCOVERY COMPLETE: organizations RLS audited via psql; relrowsecurity=t + relforcerowsecurity=t CONFIRMED; 4 RLS policies: guard RESTRICTIVE ALL (bypass_enabled() OR realm='admin') — NO TENANT ARM; organizations_control_plane_select/insert/update PERMISSIVE (admin/bypass only); NO tenant SELECT policy; texqtic_app SELECT grant only; id=PK (UUID) is tenancy key (id=app.current_org_id()); no tenant_id or org_id column; tenancy predicate: `id = app.current_org_id()`; STOP CONDITION: NOT TRIGGERED — no schema change needed; consumers: 3 callers via withOrgAdminContext / getOrganizationIdentity (G-015 Phase C workaround) in tenant.ts + auth.ts; DPP SECURITY INVOKER views blocked (guard hard-blocks tenant realm); discovery doc: docs/security/ORGANIZATIONS-RLS-DISCOVERY.md; proposal for TECS 5B: add require_org_context() arm to guard + new PERMISSIVE tenant SELECT `id=app.current_org_id()`; no SQL executed, no code changed; G-025-ORGS-RLS-001 → 🔄 IN PROGRESS (TECS 5B implementation pending))
(GOVERNANCE-SYNC-083 — G-025-DPP-SNAPSHOT-UI-EXPORT-001 → ✅ TECS 4D VALIDATED: DPPPassport.tsx added to components/Tenant/; UUID input + client-side validation; tenantGet<DppSnapshot>('/api/tenant/dpp/:nodeId') fetch; loading/error/404 states; always-visible amber banner: 'Manufacturer fields omitted due to G-025-ORGS-RLS-001'; Product Identity / Certifications / Lineage sections rendered; Lineage capped at 200 rows; Export: Copy JSON (window.navigator.clipboard) + Download JSON (dpp_<nodeId>.json Blob anchor); App.tsx: expView union 'HOME'|'ORDERS'|'DPP' + DPPPassport guard + onNavigateDpp prop; Shells.tsx: onNavigateDpp? added to ShellProps + DPP Passport nav button in all 4 experience shells (AggregatorShell/B2BShell/B2CShell/WhiteLabelShell); typecheck EXIT 0; lint EXIT 0 (0 errors); G-025 → ✅ VALIDATED (v1 shipped: schema TECS 4A + views TECS 4B + API TECS 4C + UI/export TECS 4D); G-025-ORGS-RLS-001 still open — organizations canonicalization required before manufacturer fields restored to DPP surfaces)
(GOVERNANCE-SYNC-082 — G-025-DPP-SNAPSHOT-API-001 → ✅ TECS 4C VALIDATED: GET /api/tenant/dpp/:nodeId added to server/src/routes/tenant.ts; queries dpp_snapshot_products_v1/lineage_v1/certifications_v1 via $queryRaw (parameterized Prisma tagged templates — no string interpolation); SECURITY INVOKER inheritance via withDbContext (tenant context set; no SECURITY DEFINER); 404 on empty product row (RLS gate — node hidden from cross-tenant actors); no organizations JOIN anywhere (G-025-ORGS-RLS-001 enforced; manufacturer fields omitted from response with explicit meta.manufacturerFields='omitted_due_to_G-025-ORGS-RLS-001'); writeAuditLog: action=tenant.dpp.read, entity=traceability_node; query method: $queryRaw tagged template (3 view queries; all parameterized); typecheck EXIT 0; lint EXIT 0 (0 errors, 108 pre-existing warnings); G-025 → TECS 4C ✅ IN PROGRESS → TECS 4D UI/export next; G-025-ORGS-RLS-001 still open — organizations canonicalization required before manufacturer fields restored)
(GOVERNANCE-SYNC-081 — G-025-DPP-SNAPSHOT-VIEWS-IMPLEMENT-001 → ✅ TECS 4B VALIDATED: D2 APPROVED (Paresh, 2026-03-04) — v1 field surface confirmed (batch_id, node_type, meta, geo_hash, visibility, lineage recursive traversal, node-linked certs via node_certifications); D4 GATE FAIL — organizations SELECT policy is admin/bypass-only (no tenant org_id arm); Gap G-025-ORGS-RLS-001 registered (organizations needs canonical Wave 3 Tail RLS before manufacturer fields can be included in views); manufacturer_* columns removed from dpp_snapshot_products_v1; 3 SQL views created (SECURITY INVOKER, security_invoker=true in pg_class.reloptions): dpp_snapshot_products_v1 (node identity), dpp_snapshot_lineage_v1 (recursive CTE depth-cap=20, cycle-guard via visited UUID array), dpp_snapshot_certifications_v1 (LEFT JOIN node_certifications → certifications); PREFLIGHT PASS (all base columns confirmed); VERIFIER PASS: products=1, lineage=1, certifications=1, all security_invoker=on; GRANT SELECT TO texqtic_app on all 3 views; RESOLVE_EXIT:0; PULL 43 models; GENERATE_EXIT:0; typecheck EXIT 0; lint EXIT 0 (0 errors); migration 20260316000001_g025_dpp_snapshot_views; G-025 → TECS 4B ✅ (TECS 4C API layer next)) migration `20260316000000_g025_node_certifications` applied to remote Supabase; PREFLIGHT PASS (all FK targets confirmed); CREATE TABLE public.node_certifications (M:N join: org_id+node_id+certification_id, UNIQUE constraint); ENABLE+FORCE RLS; 1 RESTRICTIVE guard (FOR ALL TO texqtic_app: require_org_context OR is_admin OR bypass_enabled) + 4 PERMISSIVE (SELECT/INSERT tenant+admin arms; UPDATE/DELETE false); GRANT SELECT,INSERT TO texqtic_app; relrowsecurity=t relforcerowsecurity=t confirmed; RESOLVE_EXIT:0; PULL 43 models; GENERATE_EXIT:0; typecheck EXIT 0; lint EXIT 0 (0 errors); D1 APPROVED (Paresh, 2026-03-04); G-025-B partially closed; GOVERNANCE-SYNC-080)
(GOVERNANCE-SYNC-079 — G-025-DPP-SNAPSHOT-VIEWS-DESIGN-001 → 🔄 IN PROGRESS (Design Anchor complete; Implementation pending): decisions D1–D6 locked; D1 cert-to-node linkage resolved as Option C (join table `node_certifications` — M:N, FORCE RLS, no modification to existing verified tables); D2 v1 field surface defined (batch_id, org legal_name/jurisdiction/registration_no, lineage chain, org-level certs); D3 locked to Option A Live SQL Views (RLS inherited, mandatory per doctrine); D4 organizations RLS gate defined (must PASS before TECS 4B); D5 opaque strings for v1 (no enum enforcement); D6 traversal spec locked (depth cap 20, visited UUID array cycle guard, depth ASC + created_at ASC); 3 view contracts defined: `dpp_snapshot_products_v1`, `dpp_snapshot_lineage_v1`, `dpp_snapshot_certifications_v1`; TECS sequence 4A/4B/4C/4D structured; approval gates: D1 + D2 + D4 pending Paresh sign-off; gaps G-025-A..H mapped to v1 status; design doc: `docs/architecture/DPP-SNAPSHOT-VIEWS-DESIGN.md`; no schema changes, no migrations, no views, no server/src changes)
(GOVERNANCE-SYNC-078 — G-025-DPP-SNAPSHOT-VIEWS-INVESTIGATION-001 → 🔄 IN PROGRESS (Discovery phase): schema inventory complete; `traceability_nodes` + `traceability_edges` (G-016 Phase A, GOVERNANCE-SYNC-009) + `certifications` (G-019, GOVERNANCE-SYNC-008) analyzed; canonical Wave 3 Tail RLS confirmed on all 3 tables (FORCE RLS=t, 1 RESTRICTIVE guard + 4 PERMISSIVE policies); STOP CONDITION triggered: certifications has no FK to traceability_nodes or any product identifier — org-level join only; Schema Gaps documented: G-025-A (no suppliers/facilities/product_batches tables), G-025-B (missing cert-to-node FK + issuing_body/cert_number columns), G-025-C (no lineage hash), G-025-D (no node_type/edge_type enum enforcement), G-025-E (no edge ordinal); RLS view inheritance safe for live SQL views (FORCE RLS fires on base tables); materialized views exempt from RLS — critical risk documented; 3 snapshot strategies compared (A: live view, B: mat-view, C: hybrid); discovery document: `docs/architecture/DPP-SNAPSHOT-VIEWS-DISCOVERY.md`; no schema changes, no migrations, no view creation; G-025 → IN PROGRESS Discovery)
(GOVERNANCE-SYNC-077 — OPS-CI-RLS-DOMAIN-PROOF-001 → ✅ VALIDATED: added DOMAIN_ISOLATION_PROOF_ESCALATION_EVENTS step to `server/scripts/ci/rls-proof.ts`; table: `escalation_events` (org_id RLS boundary, Wave 3, FORCE RLS=t, GOVERNANCE-SYNC-076 canonical pattern); proof: SET LOCAL ROLE texqtic_app + app.org_id=Org-X context; cross-tenant count WHERE org_id != Org-X == 0 for both Tenant A + Tenant B; symmetric isolation confirmed; PASS: DOMAIN_ISOLATION_PROOF_ESCALATION_EVENTS printed; ci:rls-proof EXIT 0 (4/4 steps PASS); typecheck EXIT 0; lint EXIT 0 (0 errors, 108 pre-existing warnings); no DB touch — proof is read-only; RLS maturity CI Domain Table Coverage: 3/5 → 5/5; Composite RLS Maturity: 4.5/5 → 5.0/5; Phase A fully closed)
(GOVERNANCE-SYNC-076 — OPS-RLS-SUPERADMIN-001 → ✅ VALIDATED: migrations `20260315000008_ops_rls_superadmin_impersonation_sessions` + `20260315000009_ops_rls_superadmin_escalation_events` applied to remote Supabase via psql; APPLY_EXIT_008:0 + VERIFIER PASS [20260315000008] (FORCE RLS=t, 1 RESTRICTIVE guard FOR ALL, 4 PERMISSIVE SELECT/INSERT/UPDATE/DELETE: is_superadmin narrowing CONFIRMED, 0 {public} policies); RESOLVE_EXIT_008:0; APPLY_EXIT_009:0 + VERIFIER PASS [20260315000009] (FORCE RLS=t, admin INSERT narrowed is_superadmin CONFIRMED in WITH CHECK, tenant INSERT org_id intact, 2 SELECT + 2 INSERT policies, 0 UPDATE policies, no UPDATE/DELETE grants for texqtic_app); RESOLVE_EXIT_009:0; verifier fix: removed invalid {public}=0 check from migration 009 (escalation_events policies are public-role scoped by G-022 baseline design); RAISE string fix: formatter-split adjacent literals merged (commit 82ae0b3); typecheck EXIT 0; lint EXIT 0 (0 errors, 108 pre-existing warnings); OPS-RLS-SUPERADMIN-001 → ✅ VALIDATED)
(GOVERNANCE-SYNC-075 — OPS-RLS-SUPERADMIN-001-ESCALATION-INSERT-001: migration `20260315000009_ops_rls_superadmin_escalation_events/migration.sql` authored; narrows `escalation_events` admin INSERT arm to require BOTH `app.is_admin='true'` AND `app.is_superadmin='true'`; tenant SELECT/INSERT UNCHANGED; no UPDATE/DELETE policies added (append-only table, immutability trigger is Layer 2 enforcement); verifier asserts 9 invariants including no UPDATE/DELETE grants for texqtic_app; SUPERADMIN-RLS-PLAN.md C.2 amended with correction (UPDATE policy never existed; admin INSERT is the correct surface); apply pending psql remote execution + `prisma migrate resolve --applied`; OPS-RLS-SUPERADMIN-001 → IN PROGRESS (both migrations 20260315000008 + 20260315000009 authored; neither yet applied to remote Supabase; VALIDATED only after both apply executions complete))
(GOVERNANCE-SYNC-074 — OPS-RLS-SUPERADMIN-001-IMPERSONATION-001: migration `20260315000008_ops_rls_superadmin_impersonation_sessions/migration.sql` authored; narrows `impersonation_sessions` INSERT/UPDATE/DELETE to require BOTH `app.is_admin='true'` AND `app.is_superadmin='true'`; GUARD and SELECT UNCHANGED; pre-flight guard + self-verifier DO-block included; apply pending psql remote execution + `prisma migrate resolve --applied`; TECS 2C BLOCKED — spec mismatch: SUPERADMIN-RLS-PLAN.md C.2 references UPDATE policy on `escalation_events` but no such policy exists in the DB (table is append-only; trigger blocks UPDATE; only SELECT+INSERT policies present) — blocker report issued; typecheck/lint gates: SQL-only change, EXIT 0 expected. OPS-RLS-SUPERADMIN-001 → IN PROGRESS (TECS 2B authored; TECS 2C awaiting spec clarification))
(GOVERNANCE-SYNC-073 — OPS-RLS-SUPERADMIN-001-DB-APPROVAL-001: DB policy apply APPROVED for migrations `20260315000008_ops_rls_superadmin_impersonation_sessions` + `20260315000009_ops_rls_superadmin_escalation_events`; sign-off recorded in `docs/security/SUPERADMIN-RLS-PLAN.md` Section F.1; runbook added to `docs/ops/REMOTE-MIGRATION-APPLY-LOG.md`; prerequisite: service write paths migrated commit `1f211d6`; Feature flags remain a KNOWN LIMITATION (BYPASSRLS path); no change. OPS-RLS-SUPERADMIN-001 → IN PROGRESS (Service complete; DB apply APPROVED; execution pending TECS 2B/2C))
(GOVERNANCE-SYNC-072 — OPS-RLS-SUPERADMIN-001-SERVICE-001 complete; `startImpersonation` + `stopImpersonation` migrated to `withSuperAdminContext` in `impersonation.service.ts`; `withSuperAdminEscalationContext` helper added to `escalation.g022.ts` for upgrade/resolve write paths (sets both `app.is_admin='true'` AND `app.is_superadmin='true'` tx-local); read paths (`getImpersonationStatus`, list/create escalations) unchanged; DB policies NOT yet applied (migrations `20260315000008` + `20260315000009` pending schema sign-off); Feature flags remain a KNOWN LIMITATION: route uses postgres-superuser/bare prisma upsert (BYPASSRLS); enforcement remains route-level `requireAdminRole('SUPER_ADMIN')` only. Provisioning tables (`tenants`, `memberships`) deferred to future sub-TECS; typecheck EXIT 0; lint EXIT 0 (0 errors, 108 pre-existing warnings); OPS-RLS-SUPERADMIN-001 → IN PROGRESS (Service complete; DB apply pending))
(GOVERNANCE-SYNC-071 — OPS-RLS-SUPERADMIN-001-DISCOVERY-001: SUPER_ADMIN DB-level RLS enforcement discovery complete; target tables identified: `impersonation_sessions` (INSERT/UPDATE/DELETE narrow to `is_superadmin='true'`) + `escalation_events` (UPDATE narrow to `is_superadmin='true'`); service-layer change dependencies documented (`startImpersonation`/`stopImpersonation` must migrate to `withSuperAdminContext`); `feature_flags` marked KNOWN LIMITATION (postgres BYPASSRLS path); migration grouping proposal: 2 migrations (`20260315000008` + `20260315000009`); `docs/security/SUPERADMIN-RLS-PLAN.md` created; OPS-RLS-SUPERADMIN-001 → IN PROGRESS)
(GOVERNANCE-SYNC-070 — OPS-ORDERS-STATUS-ENUM-001: `public.order_status` enum extended with CONFIRMED + FULFILLED; CANCELLED verified present (not re-added); migration `20260315000007_ops_orders_status_enum_001` applied to Supabase; PREFLIGHT PASS + VERIFIER PASS; APPLY_EXIT:0; RESOLVE_EXIT:0; `prisma db pull` minimal diff (2 enum values only); typecheck EXIT 0; lint EXIT 0 (0 errors, 108 pre-existing warnings))
(GOVERNANCE-SYNC-063 — GAP-ORDER-LC-001-UX-B6B-001 (B6b): `WLOrdersPanel.tsx` + `EXPOrdersPanel.tsx` — `deriveStatus(order, auditLogs)` + `BackendAuditEntry` + `AuditResponse` + `auditLogs` state + `Promise.all` audit-logs fetch all removed; `canonicalStatus(order)` reads `order.lifecycleState` directly; `LifecycleHistory` component renders `order.lifecycleLogs` newest-first inline in Status column; all `TODO(GAP-ORDER-LC-001)` comments removed from both panels; file headers updated; typecheck EXIT 0; lint EXIT 0; GAP-ORDER-LC-001 → ✅ CLOSED (orders.status enum extension deferred to separate TECS))
(GOVERNANCE-SYNC-060 — GAP-ORDER-LC-001-UX-VALIDATION-001 (B5): `validate-rcp1-flow.ts` Steps 3.2/4A.2/4B.2/4C.2/Phase5 replaced with Prisma-direct `order_lifecycle_logs` queries (audit-log seam removed); proof run 22 PASS 0 FAIL — checkout writes PAYMENT_PENDING log, SM enforces CONFIRMED/FULFILLED/CANCELLED transitions + terminal state enforcement (409), full chain integrity verified; STOP CONDITION declared: UI panels (`WLOrdersPanel.tsx` + `EXPOrdersPanel.tsx`) NOT modified — `deriveStatus()` audit-log hack cannot be removed until `GET /api/tenant/orders` exposes `lifecycleState` field (deferred to B6); typecheck EXIT 0; lint EXIT 0)
(GOVERNANCE-SYNC-060A — OPS-ORDER-LC-LOGS-GRANT-001: `order_lifecycle_logs` base SELECT+INSERT GRANTs applied to `texqtic_app`+`app_user` via psql (DATABASE_URL, Supabase Postgres); ops file `server/prisma/ops/order_lifecycle_logs_grants.sql` created; APPLY_EXIT:0; verification: 4 rows in `information_schema.role_table_grants` (texqtic_app INSERT/SELECT + app_user INSERT/SELECT) ✅; unblocks checkout lifecycle write (PostgresError 42501 resolved); typecheck EXIT 0; lint EXIT 0; GAP-ORDER-LC-001 IN PROGRESS pending B5 UX validation)
(GOVERNANCE-SYNC-059 — GAP-ORDER-LC-001-BACKEND-INTEGRATION-001: app-layer order lifecycle workaround replaced with SM-driven transitions in `server/src/routes/tenant.ts` — checkout workaround `writeAuditLog(order.lifecycle.PAYMENT_PENDING)` replaced with direct `tx.order_lifecycle_logs.create()`; PATCH `/tenant/orders/:id/status` app-layer if/else validation replaced with `StateMachineService.transition()`; `makeTxBoundPrisma` helper added; optional `reason` field added to PATCH body schema; all `TODO(GAP-ORDER-LC-001)` comments removed; DB enum mapping preserved (CONFIRMED/FULFILLED→PLACED); typecheck EXIT 0; lint EXIT 0)
(GOVERNANCE-SYNC-058 — GAP-ORDER-LC-001-SM-SERVICE-001: StateMachineService extended to enforce ORDER transitions — `EntityType` union now `'TRADE'|'ESCROW'|'CERTIFICATION'|'ORDER'`; ORDER branch added to `StateMachineService.transition()` writing to `order_lifecycle_logs` (actor_id=consolidated UUID, realm='tenant'|'admin'|'system', tenant_id=orgId denorm); `SYSTEM_AUTOMATION_ALLOWED_TERMINAL_TARGETS` extended with 'FULFILLED' (ORDER non-decisional terminal); `prisma db pull` + `prisma generate` run to build `order_lifecycle_logs` Prisma model; schema.prisma updated; typecheck EXIT 0; lint EXIT 0)
(GOVERNANCE-SYNC-057 — GAP-ORDER-LC-001-SEED-001: 4 ORDER allowed_transitions seeded via `seed_state_machine.ts` upsert — PAYMENT_PENDING→CONFIRMED, CONFIRMED→FULFILLED, CONFIRMED→CANCELLED, PAYMENT_PENDING→CANCELLED; `allowedActorType` per D-020-A contract; script updated to 47 total transitions (29 TRADE + 8 ESCROW + 6 CERTIFICATION + 4 ORDER); VERIFIER PASS: lifecycle_states ORDER=4, allowed_transitions ORDER=4; SEED_EXIT:0; typecheck EXIT 0; lint EXIT 0; no SQL migration applied — seed script approach (idempotent Prisma upsert))
(GOVERNANCE-SYNC-056 — GAP-ORDER-LC-001-SCHEMA-FOUNDATION-001: ORDER lifecycle schema foundation applied — migration `20260315000005_gap_order_lc_001_schema_foundation`; created `public.order_lifecycle_logs` (7 columns incl. tenant_id denorm for RLS + from_state/to_state TEXT + 3 indexes + FK → orders CASCADE); extended `lifecycle_states.entity_type` CHECK + `allowed_transitions.entity_type` CHECK from ARRAY['TRADE','ESCROW','CERTIFICATION'] → includes 'ORDER' (DROP + recreate — reversible); seeded 4 ORDER lifecycle states (PAYMENT_PENDING, CONFIRMED, FULFILLED, CANCELLED); RLS: Wave 3 Tail canonical (1 RESTRICTIVE guard + PERMISSIVE SELECT/INSERT with tenant+admin arms + UPDATE/DELETE permanently false for immutability); VERIFIER PASS: table + FK + 3 indexes + FORCE RLS=t + guard + 4 PERMISSIVE + 0 {public} + ORDER states seeded; prisma migrate resolve RESOLVE_EXIT:0; typecheck EXIT 0; lint EXIT 0; orders.status enum NOT touched — ALTER TYPE ADD VALUE deferred to B3 per STOP CONDITION)
(GOVERNANCE-SYNC-055 — G-006C-P2-IMPERSONATION_SESSIONS-RLS-UNIFY-001: `impersonation_sessions` RLS unified to canonical admin-only Wave 3 Tail pattern — migration `20260315000004_g006c_p2_impersonation_sessions_rls_unify` applied to remote Supabase; DROP 5 non-canonical policies (guard named `restrictive_guard` was {public}, missing is_admin, had non-standard WITH CHECK; CRITICAL: DELETE had NO admin arm — bypass_enabled() only) + CREATE 1 RESTRICTIVE guard (FOR ALL TO texqtic_app, require_admin_context) + 4 PERMISSIVE (SELECT/INSERT/UPDATE/DELETE) with admin_id actor arm + is_admin arm replacing bypass_enabled(); admin-only design: tenant_id is metadata, NOT a RLS predicate; tenant JWTs rejected at guard; VERIFIER PASS: guard=1 RESTRICTIVE FOR ALL (require_admin_context + is_admin arm present), SELECT/INSERT/UPDATE/DELETE=1 PERMISSIVE each (is_admin arm present), DELETE critical fix applied, FORCE RLS=t, no {public} policies; prisma migrate resolve --applied ✅; typecheck EXIT 0; lint EXIT 0; G-006C-WAVE3-REMAINING → ✅ COMPLETE)
(GOVERNANCE-SYNC-054 — G-006C-P2-TENANT_DOMAINS-RLS-UNIFY-001: `tenant_domains` RLS unified to canonical Wave 3 Tail pattern — migration `20260315000003_g006c_p2_tenant_domains_rls_unify` applied to remote Supabase; DROP 5 existing policies (guard renamed from tenant_domains_guard_policy → tenant_domains_guard, promoted from {public} to texqtic_app; CRITICAL: DELETE policy had NO tenant arm — only bypass_enabled() — rebuilt with full tenant + is_admin arms) + CREATE 1 RESTRICTIVE guard (FOR ALL TO texqtic_app) + 4 PERMISSIVE (SELECT/INSERT/UPDATE/DELETE) with is_admin arm replacing bypass_enabled(); enhanced verifier explicitly checks DELETE tenant_id arm + 0 {public} policies; VERIFIER PASS: guard=1 RESTRICTIVE FOR ALL, SELECT/INSERT/UPDATE/DELETE=1 PERMISSIVE each, DELETE tenant_id arm present, FORCE RLS=t, no {public} policies; prisma migrate resolve --applied ✅; typecheck EXIT 0; lint EXIT 0)
(GOVERNANCE-SYNC-053 — G-006C-P2-TENANT_BRANDING-RLS-UNIFY-001: `tenant_branding` RLS unified to canonical Wave 3 Tail pattern — migration `20260315000002_g006c_p2_tenant_branding_rls_unify` applied to remote Supabase; DROP 5 existing policies (guard renamed from tenant_branding_guard_policy → tenant_branding, promoted from {public} to texqtic_app; DELETE policy had NO tenant arm — fixed) + CREATE 1 RESTRICTIVE guard (FOR ALL TO texqtic_app) + 4 PERMISSIVE (SELECT/INSERT/UPDATE/DELETE) with is_admin arm replacing bypass_enabled(); VERIFIER PASS: guard=1 RESTRICTIVE FOR ALL, SELECT/INSERT/UPDATE/DELETE=1 PERMISSIVE each, FORCE RLS=t, no {public} policies; prisma migrate resolve --applied ✅; typecheck EXIT 0; lint EXIT 0)
(GOVERNANCE-SYNC-052 — G-006C-P2-MEMBERSHIPS-RLS-UNIFY-001: `memberships` RLS unified to canonical Wave 3 Tail pattern — migration `20260315000001_g006c_p2_memberships_rls_unify` applied to remote Supabase; DROP 5 existing bypass_enabled() policies (guard renamed from memberships_guard_require_context → memberships_guard, promoted from {public} to texqtic_app) + CREATE 1 RESTRICTIVE guard (FOR ALL TO texqtic_app) + 4 PERMISSIVE (SELECT/INSERT/UPDATE/DELETE) with is_admin arm replacing bypass_enabled(); VERIFIER PASS: guard=1 RESTRICTIVE FOR ALL, SELECT/INSERT/UPDATE/DELETE=1 PERMISSIVE each, FORCE RLS=t, no {public} policies; prisma migrate resolve --applied ✅; typecheck EXIT 0; lint EXIT 0)
(GOVERNANCE-SYNC-051 — G-006C-P2-CATALOG_ITEMS-RLS-UNIFY-001: `catalog_items` RLS unified to canonical Wave 3 Tail pattern — migration `20260315000000_g006c_p2_catalog_items_rls_unify` applied to remote Supabase; DROP 5 existing bypass_enabled() policies + CREATE 1 RESTRICTIVE guard (FOR ALL TO texqtic_app) + 4 PERMISSIVE (SELECT/INSERT/UPDATE/DELETE) with is_admin arm; VERIFIER PASS: guard=1 RESTRICTIVE FOR ALL, SELECT/INSERT/UPDATE/DELETE=1 PERMISSIVE each, FORCE RLS=t, no {public} policies; prisma migrate resolve --applied ✅; typecheck EXIT 0; lint EXIT 0)
(GOVERNANCE-SYNC-050 — OPS-LINT-CLEANUP-001: G-QG-001 → ✅ VALIDATED — root `pnpm run lint` exits 0 (0 errors, 0 warnings); 23 frontend ESLint errors across 11 files cleared (unused vars, React-not-defined, AbortController global, setState-in-effect); `pnpm run typecheck` EXIT 0; root lint gate fully closed)
(GOVERNANCE-SYNC-049 — OPS-APPLY-ORDERS-RLS-001: `orders_update_unified` tenant arm applied to remote Supabase via psql — APPLY_EXIT:0; DO-block VERIFY PASS: `orders_update_unified has tenant + admin arms in USING and WITH CHECK`; RCP-1 Phases 4–5 re-run: 16/16 PASS (CONFIRMED→PLACED audit-seam ✅, FULFILLED derivedStatus ✅, CANCELLED direct+terminal 409 ✅); typecheck EXIT 0; lint EXIT 0 (0 errors, 105 pre-existing warnings); GAP-RLS-ORDERS-UPDATE-001 → ✅ OPERATIONALLY CLOSED; GAP-REVENUE-VALIDATE-002 → ✅ FULLY VALIDATED Phases 0–5)
(GOVERNANCE-SYNC-048 — OPS-REMOTE-MIGRATIONS-CATCHUP-001: Remote migration ledger reconciled — 2 pending migrations applied to Supabase (`aws-1-ap-northeast-1.pooler.supabase.com`): `20260303110000_g006c_p2_cart_items_rls_unify` (VERIFIER PASS: guard=1 RESTRICTIVE, SELECT/INSERT/UPDATE/DELETE=1 PERMISSIVE each, FORCE RLS=t, no {public} policies), `20260303120000_g022_p2_cert_entity_type` ([G-022-P2 VERIFIER OK]: escalation_events_entity_type_check present and includes CERTIFICATION); both resolved in Prisma ledger via resolve --applied; post-flight: 64/64 distinct migrations in _prisma_migrations with finished_at NOT NULL; pre-existing rolled_back_at anomaly documented in docs/ops/REMOTE-MIGRATION-APPLY-LOG.md (historical artifact, not new, non-blocking); TC EXIT 0; LINT EXIT 0)
(GOVERNANCE-SYNC-047 — GAP-G022-02: `'CERTIFICATION'` added to `EscalationEntityType` union (`server/src/services/escalation.types.ts`) + `escalation_events.entity_type` DB CHECK constraint extended via migration `20260303120000_g022_p2_cert_entity_type` (DROP old auto-named CHECK + ADD new CHECK including 'CERTIFICATION'); T-G022-CERT-ENTITY-FROZEN test activated in `certification.g022.freeze.test.ts` (stop-loss block removed; entity-level freeze for CERTIFICATION now production-reachable); typecheck EXIT 0; lint EXIT 0, 105 pre-existing warnings; pending psql apply via DATABASE_URL)
(GOVERNANCE-SYNC-046 — G-006C-P2-CART_ITEMS-RLS-UNIFY-001: cart_items RLS unified to canonical Wave 3 Tail pattern — migration `20260303110000_g006c_p2_cart_items_rls_unify` created; RESTRICTIVE guard rebuilt with is_admin arm; PERMISSIVE SELECT/INSERT/UPDATE/DELETE unified with JOIN-based tenant arm (no direct tenant_id) + is_admin arm replacing bypass_enabled(); DO-block verifier present; typecheck EXIT 0; lint EXIT 0; pending psql apply)
(GOVERNANCE-SYNC-045 — OPS-RLS-ORDERS-UPDATE-001: GAP-RLS-ORDERS-UPDATE-001 → ✅ VALIDATED (governed ops SQL `server/prisma/ops/rcp1_orders_update_unified_tenant_arm.sql` created; `orders_update_unified` extended with tenant arm `(app.require_org_context() AND tenant_id = app.current_org_id()) OR (is_admin='true')` in USING + WITH CHECK; admin arm preserved; governance sign-off embedded in SQL header; DO-block verifier included; pending psql apply via DATABASE_URL); GAP-REVENUE-VALIDATE-002 → ✅ VALIDATED (Phases 4–5 unblocked once SQL applied; `--only-transitions` flag added to `validate-rcp1-flow.ts` for Phases 4–5 re-run; typecheck EXIT 0; lint EXIT 0; 0 new errors))
(GOVERNANCE-SYNC-044 — OPS-REVENUE-FLOW-VALIDATION-002: GAP-REVENUE-VALIDATE-002 → 🟡 PARTIALLY VALIDATED (TECS 4 — Phases 0–3 PASS: DB/JWT, catalog create, cart→checkout→PAYMENT_PENDING, orders list + audit; Phases 4–5 BLOCKED by GAP-RLS-ORDERS-UPDATE-001 — orders_update_unified RLS policy requires app.is_admin=true; withDbContext does not set app.is_admin for tenant actors; no RLS changes in RCP-1; privilege grant GRANT UPDATE ON public.orders TO texqtic_app/app_user applied; script + evidence report committed))
(GOVERNANCE-SYNC-043 — OPS-EXPERIENCE-ORDERS-UX-001: GAP-EXP-ORDERS-001 → VALIDATED (TECS 3 complete — EXPOrdersPanel created; expView state + onNavigateOrders threaded through all four EXPERIENCE shells; canonical RCP-1 derived-status algorithm; same Promise.all(orders+audit-logs) pattern; typecheck EXIT 0; 0 new lint errors; no backend/schema/RLS/shell-merge changes))
(GOVERNANCE-SYNC-042 — OPS-WLADMIN-ORDERS-PANEL-001: GAP-ORDER-TRANSITIONS-001 → VALIDATED (TECS 1 complete, commit 0a03177); GAP-WL-ORDERS-001 → VALIDATED (TECS 2 complete — WLOrdersPanel created; App.tsx ORDERS case wired; typecheck EXIT 0; 0 new lint errors); no backend/schema/RLS/shell-merge changes)
(GOVERNANCE-SYNC-041 — OPS-RCP1-GAP-RECONCILIATION-001: RCP-1 anchored as PLANNED roadmap; 5 new gap entries registered (GAP-ORDER-LC-001, GAP-ORDER-TRANSITIONS-001, GAP-WL-ORDERS-001, GAP-EXP-ORDERS-001, GAP-REVENUE-VALIDATE-002); GAP-RUV-006 schema re-entry linked to GAP-ORDER-LC-001; drift analysis recorded; no implementation begun; B1/D-5/control-plane posture affirmed unchanged)
(GOVERNANCE-SYNC-040 — OPS-WLADMIN-PRODUCTS-MVP-001: G-WL-ADMIN Products panel VALIDATED — real catalog list + create form replacing WLStubPanel; catalog fetch useEffect extended to WL_ADMIN; commit 6a7bf41 · typecheck EXIT 0 · 0 new lint errors · App.tsx only)
(GOVERNANCE-SYNC-039 — OPS-ORDER-LIFECYCLE-AUDIT-001: GAP-RUV-006 PARTIAL — lifecycle audit trail added via audit_logs; G-020 ORDER blocked by DB CHECK constraint; commit 5e13fe5 · typecheck EXIT 0 · lint EXIT 0 · 1 file only)
(GOVERNANCE-SYNC-038 — OPS-ACTIVATE-JWT-FIX-001: GAP-RUV-001 invite URL action=invite param VALIDATED · GAP-RUV-002 /activate JWT issuance VALIDATED · GAP-RUV-003 tenant.type from response VALIDATED · GAP-RUV-005 industry onChange wired VALIDATED · commit 43ef9c6 · typecheck EXIT 0 (frontend + backend) · lint EXIT 0 · 4 files only)
(GOVERNANCE-SYNC-037 — OPS-REVENUE-UNBLOCK-IMPLEMENTATION-001: RU-001 invite activation wiring VALIDATED · RU-002 provision UI enablement VALIDATED · RU-003 catalog create API+service+frontend VALIDATED · S1 end-to-end happy path A–F confirmed · 5 commits: 3923069 fc66637 5d4c3bf 2cda383 739f6d8 · typecheck EXIT 0 (frontend + backend) · lint EXIT 0 · no schema/RLS/auth changes)
(GOVERNANCE-SYNC-036 — OPS-TENANT-ROLE-DIFFERENTIATION-B1-RECORD-001: D-5 resolved by architectural decision B1; DB role-agnostic by design; `app.roles` intentionally dormant for live requests; role enforcement remains app-layer only; no code changes; no migrations; no RLS changes; single governance commit)
(GOVERNANCE-SYNC-035 — OPS-CONTROL-HARDENING-PHASE-2-001 VALIDATED: control-plane CI guardrails implemented; `scripts/control-plane-manifest.ts` + `scripts/control-plane-guard.ts` added; `.github/workflows/control-plane-guard.yml` added; `package.json` scripts `control:manifest` + `control:guard` added; guard EXIT 0 on main: 37 routes scanned, 17 mutations checked, 0 audit violations, 8/8 SUPER_ADMIN surfaces gated; artifact `artifacts/control-plane-manifest.json` emitted; no runtime changes; no DB changes; no migrations; no RLS changes; 2 atomic commits)
(GOVERNANCE-SYNC-032 — OPS-CONTROL-READ-AUDIT-001 VALIDATED: 14 control-plane GET route handlers now emit exactly one `writeAuditLog` read-audit entry on 200 success; action strings follow `control.<domain>.read[_one]` convention; `ADMIN` realm, `actor_type=ADMIN`; Sim A: 2 audit rows confirmed in DB; Sims B+C: 0 rows on rejected auth; typecheck EXIT 0; no SQL changes; no migrations; 2 atomic commits)
(GOVERNANCE-SYNC-030 — G006C-ORDERS-GUARD-001 VALIDATED: orders + order_items RESTRICTIVE guard added; role normalized {public} → texqtic_app; DO block VERIFIER PASS; 3 RLS sims PASS; Prisma ledger synced; migration `20260302000000_g006c_orders_guard_normalize`; admin arm preserved as current_setting('app.is_admin') — NOT replaced by bypass_enabled() per Gate 1 investigation)
(GOVERNANCE-SYNC-021 — G-020 Runtime Enforcement Atomicity CLOSED; two-phase atomicity gap eliminated: SM lifecycle log INSERT + entity state UPDATE now share a single Prisma $transaction; opts.db shared-tx pattern added to StateMachineService.transition(); TradeService + EscrowService wired; dead CERTIFICATION APPLIED branch removed; atomicity regression tests T-15 + E-09 added; typecheck EXIT 0, lint 0 errors, 44/44 tests pass; impl commit 61d1a96)
(GOVERNANCE-SYNC-015 — G-017 Day4 Pending Approvals FK Hardening DB Applied (env: Supabase dev); migration `20260307000000_g017_day4_pending_approvals_trade_fk_hardening` applied via psql (with parse-safe patch to adjacent-literal RAISE NOTICE); function `g017_enforce_pending_approvals_trade_entity_fk` + trigger `trg_g017_pending_approvals_trade_entity_fk` (BEFORE INSERT OR UPDATE ON pending_approvals, SECURITY DEFINER, tgenabled=O) both confirmed present; DO block 5-check VERIFY PASS; Prisma ledger synced via resolve --applied; migration file also patched for parse-safety (impl commit `bdb9ab7`); pending after: 5 migrations)
(GOVERNANCE-SYNC-014 — G-020 DB Applied (ledger-sync only; all objects confirmed in DB out-of-band); migration `20260301000000_g020_lifecycle_state_machine_core`; 4 tables + 1 function + 2 triggers verified present; FORCE RLS t/t on all 4 tables; 14 RLS policies; key constraints verified; row counts 0 (vacuous); Prisma ledger synced via resolve --applied; also ledger-synced gw3_db_roles_bootstrap (20260212) in same sync; pending after: 6 migrations; C: g017_day4_trigger_hardening absent from DB — separate TECS needed)
(GOVERNANCE-SYNC-013 — G-018 cycle-fix migration file repaired (parse-safe); migration file `20260308010000_g018_day1_escrow_schema_cycle_fix/migration.sql` patched: 2 RAISE NOTICE adjacent-string-literal PL/pgSQL syntax errors fixed + non-ASCII chars replaced with ASCII equivalents; no operational SQL change; psql parse proof: COMMIT + PASS notice (no ERROR); impl commit `98eb08d`)
(GOVERNANCE-SYNC-012 — G-018 Cycle Fix DB Applied; migration `20260308010000_g018_day1_escrow_schema_cycle_fix` applied via psql to Supabase dev; `escrow_accounts.trade_id` column + 2 indexes dropped (circular FK eliminated); `trades.escrow_id → escrow_accounts.id` canonical FK preserved and verified; Prisma ledger synced via resolve --applied; migration file note: pre-flight DO block has PL/pgSQL adjacent-string-literal syntax error in non-executed branch — operational SQL applied manually via psql -c with identical effect)
(GOVERNANCE-SYNC-011 — G-018 Day 1 DB Applied; migration `20260308000000_g018_day1_escrow_schema` applied via psql to Supabase dev; impl commit `7c1d3a3`; §16 PASS notice; pg_policies: escrow_accounts 3 rows, escrow_transactions 5 rows (incl. no_update/no_delete deny); FORCE RLS: t/t on both tables; FKs verified: trades_escrow_id_fk ON DELETE RESTRICT, escrow_lifecycle_logs_escrow_id_fk ON DELETE CASCADE; data: 0 rows; Prisma ledger synced via resolve --applied)
(GOVERNANCE-SYNC-010 — G-007C VALIDATED — `/api/me` explicit errors + frontend stub tenant + amber banner prevents infinite spinner; backend commit `be66f41`; frontend commit `7bacd80`; governance-only commit; no migration, no RLS change)
(GOVERNANCE-SYNC-009 — G-016 traceability graph Phase A CLOSED; migration `20260312000000_g016_traceability_graph_phase_a`: public.traceability_nodes + public.traceability_edges; 5 RLS policies each (RESTRICTIVE guard incl. is_admin, PERMISSIVE tenant_select/insert/update, admin_select); applied via psql EXIT:0; DO block PASS on both tables; Prisma ledger synced; impl commit `44ab6d6`; typecheck EXIT 0, lint 0 errors/92 warnings; G-016 Phase A CLOSED)
(GOVERNANCE-SYNC-008 — G-019 certifications domain CLOSED; migration `20260311000000_g019_certifications_domain`: public.certifications table + 5 RLS policies (RESTRICTIVE guard incl. is_admin, PERMISSIVE tenant_select/insert/update, admin_select); applied via psql EXIT:0; DO block PASS; Prisma ledger synced; impl commit `3c7dae7`; typecheck EXIT 0, lint 0 errors/92 warnings; G-019 CLOSED)
(GOVERNANCE-SYNC-005 — G-017 FK Hardening CLOSED; migration `20260309000000_g017_fk_buyer_seller_orgs` adds `fk_trades_buyer_org_id` + `fk_trades_seller_org_id` FK constraints (ON DELETE RESTRICT) with embedded preflight DO block; schema.prisma updated with `buyerOrg`/`sellerOrg` Prisma relations + `tradesBuyer[]`/`tradesSeller[]` back-refs on organizations; impl commit `8069d48`; typecheck EXIT 0, lint 0 errors/92 warnings; G-017 ⚠️ CAVEAT CLOSED)
(GOVERNANCE-SYNC-004 — G-015 Phase C CLOSED via Option C admin-context; `withOrgAdminContext` + `getOrganizationIdentity` implemented in `database-context.ts`; GET /me + invite-email wired; no RLS change; no migration; commit `790d0e6`; gap-register G-015 row updated to VALIDATED; GOVERNANCE-SYNC-003 also on this date — G-019 label-misuse fix recorded; `settlement.g019.ts` renamed to `settlement.ts` (tenant + control planes), impl commit `6e94a9a`; gap-register G-019 row updated to reflect fix)
(PW5-CP-PLAN-GOV — PW5-CP-PLAN ✅ COMPLETE — 2026-03-10; control-plane architecture re-baseline; read-only analysis; 17 AdminView panels confirmed reachable; all AdminView union tokens have switch cases in renderAdminView() (no orphans); route dependency map produced for all 17 panels; capability classification complete: 6 OPERATIONAL (read+mutation), 8 OPERATIONAL (read-only governance), 2 PARTIAL (no dedicated backend API), 1 BACKEND DESIGN GATE (Settlement Admin — three-layer absence: no AdminView token, no component, no GET route); 8 architectural drift observations recorded: (1) Cart-Summaries registered outside controlRoutes plugin (index.ts), (2) Maker-Checker dual-prefix bridge undocumented, (3) AI Governance derives data from tenants API (no dedicated route), (4) RBAC renders from ADMIN_USERS constant (no live API), (5) Settlement Admin three-layer absence confirmed, (6) POST /api/control/escrows exists undocumented in escrow.g018.ts line 222, (7) POST /api/control/trades/:id/transition backend-idle (intentional, undocumented), (8) VER-003/VER-004 OpenAPI drift elevated — ≥12 routes likely absent from openapi.control-plane.json; 5 new gap entries recorded: AI_GOV-BACKEND-001 · RBAC-BACKEND-001 · ESCROW-POST-001 · TRADES-MUTATION-DEFERRED · MAKER-CHECKER-MUTATION-DEFERRED; files modified: governance/gap-register.md + IMPLEMENTATION-TRACKER-2026-03.md + 2026-03-audit-reconciliation-matrix.md; PW5-CP-PLAN-GOV)
Doctrine Version: v1.4

---

## Status Legend

- NOT STARTED
- IN PROGRESS
- VALIDATED
- LOCKED

---

# WAVE 2 — Stabilization

## 🔴 Critical Path

| Gap ID | Description                                                                                           | Affected Files                                                      | Risk    | Status    | Commit  | Validation Proof                                                                                                                                     |
| ------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------- | --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-001  | **RLS policies check `app.tenant_id`; new routes set `app.org_id`** — policies do not fire            | `server/prisma/rls.sql`; `server/src/lib/database-context.ts`       | 🔴 High | VALIDATED | 1389ed7 | Step 1: 0 policies reference `app.tenant_id` · Step 2: 20 policies reference `app.org_id` · Step 3: cross-tenant 0 rows                              |
| G-002  | `FORCE ROW LEVEL SECURITY` missing on `carts`, `orders`, `order_items`, `catalog_items`, `cart_items` | `server/prisma/rls.sql`; `server/prisma/supabase_hardening.sql`     | 🔴 High | VALIDATED | 2d16e73 | All 13 tables: relrowsecurity=true, relforcerowsecurity=true · cross-tenant COUNT’s 0 · positive control passes                                      |
| G-003  | `orders` and `order_items` RLS policies absent from all SQL files                                     | `server/prisma/rls.sql`                                             | 🔴 High | VALIDATED | no-code | Live policies already correct: SELECT+INSERT+admin_all on both tables referencing `app.org_id` · cross-tenant COUNT 0                                |
| G-013  | CI cross-tenant 0-row proof not automated                                                             | `server/scripts/ci/rls-proof.ts`; `.github/workflows/rls-proof.yml` | 🟠 Med  | VALIDATED | 7f474ab | Step 1: 0 `app.tenant_id` policy refs · Step 2: Tenant A cross-tenant 0, own-count 2 · Step 3: Tenant B cross-tenant 0, own-count 0 · non-vacuous ✅ |

---

## 🟡 Stabilization

| Gap ID           | Description                                                                                                                                                                                                                                                                                                | Affected Files                                                   | Risk    | Status      | Commit                     | Validation Proof                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------- | ----------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-004            | Two `withDbContext` implementations coexist; `control.ts` imports both                                                                                                                                                                                                                                     | `server/src/routes/control.ts`; `server/src/db/withDbContext.ts` | 🟠 Med  | VALIDATED   | a19f30b                    | `withDbContextLegacy` import removed · `withAdminContext` helper added using canonical `withDbContext` + `app.is_admin = 'true'` · 13 call sites migrated · typecheck/lint EXIT 0                                                                                                                                                                                                                                                                                                                                                                                                           |
| G-005-BLOCKER    | **`public.users` has FORCE+ENABLE RLS but no SELECT policy for `texqtic_app`** — auth route returns AUTH_INVALID even for valid credentials; root cause: `users_tenant_read` dropped in G-001 cleanup with no replacement                                                                                  | `server/prisma/rls.sql`                                          | 🔴 High | VALIDATED   | b060f60                    | Proof 1: `users_tenant_select` present in `pg_policies` with `app.org_id` + EXISTS-memberships qual · Proof 2: member read returns 1 row · Proof 3: cross-tenant read returns 0 rows · typecheck/lint EXIT 0                                                                                                                                                                                                                                                                                                                                                                                |
| G-TENANTS-SELECT | **`public.tenants` has `tenants_deny_all` (FOR ALL/false) but no SELECT for `app_user`** — Prisma nested select `membership.tenant` resolves `null` under FORCE RLS → `membership.tenant.status` TypeError → 500 INTERNAL_ERROR; code path reached for first time after G-005-BLOCKER unblocked user reads | `server/prisma/rls.sql`                                          | 🔴 High | VALIDATED   | 94da295                    | A: `tenants_app_user_select` in pg_policies (SELECT, `id::text = app.org_id`) · B: cross-tenant 0 rows · C: ACME org 1 row ACTIVE · D: `set_tenant_context` login path 1 row ACTIVE · `tenants_deny_all` intact · typecheck/lint EXIT 0                                                                                                                                                                                                                                                                                                                                                     |
| G-005            | Middleware pattern inconsistent: some routes use `databaseContextMiddleware`; others build context inline                                                                                                                                                                                                  | `server/src/routes/tenant.ts`, `server/src/routes/ai.ts`         | 🟠 Med  | VALIDATED   | 830c0c4                    | 10 routes migrated: POST/GET /tenant/cart, POST /tenant/cart/items, PATCH /tenant/cart/items/:id, POST /tenant/checkout, GET /tenant/orders, GET /tenant/orders/:id, PUT /tenant/branding, GET /insights, POST /negotiation-advice · 2 exclusions justified: /tenant/activate (invite-manual), GET /me (non-tenant-scoped) · buildContextFromRequest import removed · typecheck EXIT 0 · lint 68w/0e · local runtime: 0 × 500, 0 × context-missing (10/10 routes) · prod smoke: cart 200, orders 200 count=2, insights 200 · No new 500s · Auth context preserved · RLS isolation unchanged |
| G-006            | Admin bypass pattern differs between old and new `withDbContext` — **scoped to auth.ts only**; resolved via Option B: direct `prisma.adminUser.findUnique()` for pre-auth admin lookup (no role switch; `admin_users` is not tenant-scoped)                                                                 | `server/src/routes/auth.ts`                                      | 🟠 Med  | VALIDATED   | `4971731`                  | Option B applied: `auth.ts` lines 438+653 replaced with direct `prisma.adminUser.findUnique()` (no `withDbContext`, no role switch) · lines 166+889 deferred → G-006D · `admin-cart-summaries.ts` deferred → G-006C · typecheck EXIT 0 · lint EXIT 0 (68w/0e) · T1 admin login 200 ✅ · T2 control route 200 ✅ · T3 tenant login 200 ✅ · T4 tenant orders 200 ✅ · 0 regressions · No `SET LOCAL ROLE texqtic_app` emitted (PG-42501 path eliminated) |
| G-006C           | Remove remaining legacy `withDbContext({ isAdmin: true }, …)` in control-plane routes — `admin-cart-summaries.ts` lines 52 + 140                                                                                                                                                                           | `server/src/routes/admin-cart-summaries.ts`; `server/src/lib/database-context.ts`; `server/prisma/migrations/20260314000000_g006c_admin_cart_summaries_admin_rls/migration.sql` | 🟠 Med  | VALIDATED   | `6f673ad`                  | `withAdminContext(prismaClient, callback)` + `ADMIN_SENTINEL_ID` exported from `database-context.ts`; both `withDbContext({ isAdmin: true }, async () =>` call sites replaced with `withAdminContext(prisma, async tx =>`; all `prisma.marketplaceCartSummary.*` inside callbacks replaced with `tx.*`; legacy `import { withDbContext }` removed from `admin-cart-summaries.ts`; migration `20260314000000_g006c_admin_cart_summaries_admin_rls` adds PERMISSIVE SELECT `admin_select` (USING is_admin='true') + extends `restrictive_guard` with admin arm + DO block VERIFY PASS; typecheck EXIT 0; lint EXIT 0 (0 errors / 104 warnings, all pre-existing). Migration DB application: pending psql apply to Supabase dev. No other tables touched. |
| G-006D           | Remove legacy `withDbContext({ tenantId }, …)` 2-arg usage in tenant auth path — `auth.ts` lines 166, 889                                                                                                                                                                                                  | `server/src/routes/auth.ts`; `server/src/lib/database-context.ts` | 🟡 Low  | VALIDATED   | `56c0387`                  | `withLoginContext(prismaClient, tenantId, callback)` + `LOGIN_SENTINEL_ACTOR` sentinel exported from `database-context.ts`; both 2-arg `withDbContext({ tenantId }, …)` call sites in `auth.ts` replaced; `where: { tenantId }` added to memberships in unified `/login` endpoint (latent filter gap closed); legacy `import { withDbContext } from '../db/withDbContext.js'` removed from `auth.ts`; typecheck EXIT 0; lint EXIT 0 (0 errors / 103 warnings, all pre-existing). No migrations. No RLS changes. |
| G-007 + G-007B   | `supabase_hardening.sql` uses `set_config(..., false)` (session-global) — pooler bleed risk; fixed to `is_local=true`; G-007-HOTFIX restores `app.org_id` canonical RLS key (Doctrine v1.4); **G-007B: repo reconcile — all Part 5+6 tenant-scoped-table policies updated `app.tenant_id` → `app.org_id` (anti-regression proof; prevents standalone-apply login failure)** | `server/prisma/supabase_hardening.sql`                           | 🟠 Med  | VALIDATED   | 09365b2 + 80d4501 + 80a6971 | 6 `false`→`true` (G-007 `09365b2`) · G-007-HOTFIX (`80d4501`): `set_tenant_context` was setting `app.tenant_id` but RLS policies read `app.org_id` (Doctrine v1.4 canonical key) → tenant login invisible rows → AUTH_INVALID in prod · Hotfix sets `app.org_id`, clears `app.tenant_id` defensively, `clear_context` also clears `app.org_id` · tx-local (`is_local=true`) preserved throughout · DB applied + pg_get_functiondef confirmed `app.org_id` present · **G-007B (`80a6971`): repo reconcile — Part 5 policies (8 tenant-scoped tables) + Part 6 audit_logs policies: all `app.tenant_id` → `app.org_id`; Doctrine v1.4 comment header added; pooler-bleed prevention note added; typecheck EXIT 0; lint EXIT 0** |
| G-007C           | **/api/me silent `tenant=null` caused infinite "Loading workspace…" spinner** — `OrganizationNotFoundError` and missing `tenantId` in JWT silently returned `tenant: null`; frontend `handleAuthSuccess` never seeded `tenants[]`; `currentTenant` remained null → infinite spinner. Fix: backend returns explicit 401 (missing tenantId) / 404 (org not provisioned); frontend seeds stub `Tenant` into `tenants[]` on any failure path + shows amber "Tenant not provisioned yet" banner on 404. **Deps / Caused-by:** frontend assumes `tenants[]` seeded from `/api/me`; backend previously swallowed `OrganizationNotFoundError` silently → `tenant: null`. **Follow-on:** G-WL-TYPE-MISMATCH (NOT STARTED) — WL tenant stub defaults `type: 'B2B'`; may render wrong shell if org unprovisioned. | `server/src/routes/tenant.ts` (/api/me handler) · `App.tsx` (handleAuthSuccess + EXPERIENCE render) | 🟠 Med  | VALIDATED   | `be66f41` + `7bacd80` | ACME login → workspace loads ✅; WL login → workspace loads ✅; org NOT yet provisioned → EXPERIENCE renders + amber banner (dismissible) ✅; no infinite spinner on any auth path ✅; `currentTenant` always non-null after login ✅ |
| G-008            | Canonical provisioning endpoint missing under `/api/control`; `EventLog` `schema_version`/`reasoning_hash` column alignment verified | `server/src/services/tenantProvision.service.ts` (canonical) | 🟡 Low  | VALIDATED   | `1eb5a46` + `009150d`      | Provisioning endpoint under `/api/control/tenants/provision`; realm guard enforced; GR-007 proof executed 2026-02-22T18:30:18Z: 5 PASS + 1 Conditional PASS                                                         |
| G-009            | `OP_PLATFORM_READ_ONLY`, `OP_AI_AUTOMATION_ENABLED` feature flag seeds absent                                                                                                                                                                                                                              | `server/prisma/seed.ts`                                          | 🟡 Low  | VALIDATED   | `380fde7`                          | Seed runs; both flags present in `feature_flags` table                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| G-010            | Tax/fee computation is a stub                                                                                                                                                                                                                                                                              | `server/src/services/pricing/totals.service.ts` (NEW) + `server/src/routes/tenant.ts` | 🟡 Low  | VALIDATED   | `39f0720`                  | Checkout returns deterministic totals object: subtotal, discountTotal=0, taxTotal=0, feeTotal=0, grandTotal; stop-loss throws TotalsInputError on invalid inputs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| G-011            | Impersonation session route not found in route files                                                                                                                                                                                                                                                       | `server/src/routes/admin/impersonation.ts` (NEW)                 | 🟡 Low  | VALIDATED   | `3860447`                  | POST /start (201 + token), POST /stop (200 + endedAt), GET /status/:id; negatives: tenant JWT → 401, missing reason → 400, non-member userId → 404                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| G-012            | Email notifications are stubs — no real delivery                                                                                                                                                                                                                                                           | `server/src/services/email/email.service.ts` (NEW) + `server/src/routes/auth.ts` + `server/src/routes/tenant.ts` | 🟡 Low  | VALIDATED   | `1fe96e1`                  | Dev/test: EMAIL_DEV_LOG console JSON; prod+SMTP: real nodemailer send; prod-no-SMTP: EMAIL_SMTP_UNCONFIGURED warn; stop-loss: EmailValidationError on bad inputs; invite email fire-and-forget in tenant route |
| G-014            | `tenant/activate` POST has nested `tx.$transaction` inside `withDbContext` (double-transaction nesting)                                                                                                                                                                                                    | `server/src/routes/tenant.ts`                                    | 🟠 Med  | VALIDATED   | `c451662`                  | Activation flow works in single transaction; no nested tx                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

---

## Regressions / Incidents (Post-Validation)

| Gap ID | Symptom | Root Cause | Fix | Caused-by Chain | Follow-on |
|--------|---------|------------|-----|-----------------|-----------|
| G-007C | Infinite "Loading workspace…" spinner after tenant login | `handleAuthSuccess` seeded `tenants[]` only on `me.tenant` truthy; both failure paths (`else` + `catch`) only called `setCurrentTenantId`, leaving `tenants[]` empty → `currentTenant` null → spinner looped forever | Backend: `/api/me` explicit 401/404 instead of `tenant: null`. Frontend: stub `Tenant` always pushed to `tenants[]`; `APIError` 404 path shows amber banner. | G-015 Phase C introduced `getOrganizationIdentity` in `/api/me`; `OrganizationNotFoundError` was silently swallowed; missing `tenantId` JWT had no guard | G-WL-TYPE-MISMATCH (**VALIDATED** `65ab907`+`ef46214`) · G-WL-ADMIN (**VALIDATED** `46a60e4`) |
| GAP-AUTH-ORG-RLS-REALM-001 | `GET /api/me` → 404 → amber "Tenant not provisioned yet" banner for all provisioned tenants | `withOrgAdminContext` set `realm: 'control'`; live RLS policy `organizations_control_plane_select` requires `app.current_realm() = 'admin'`; under `texqtic_app` (NOBYPASSRLS) `realm='control'` produced 0 visible rows → `OrganizationNotFoundError` → `GET /api/me` 404 | Single literal change: `realm: 'control'` → `realm: 'admin'` in `withOrgAdminContext` (`server/src/lib/database-context.ts`); docstring updated to document live policy requirement; `app.is_admin='true'` retained for forward-compat; commit `1dd40437040a95a8cdd5ace6002c3343d0528e24`; push `ff6181e..1dd4043 main→main`; GOVERNANCE-SYNC-118 | G-015 Phase C introduced `withOrgAdminContext` with `realm: 'control'`; `organizations_control_plane_select` live policy evaluates `app.current_realm() = 'admin'`; mismatch returned 0 rows silently → 404 → amber banner | GAP-PROVISION-ORGS-BACKFILL-001 INVALIDATED (388/388 parity complete; root cause was RLS realm mismatch, not missing backfill) |

---

# INFRASTRUCTURE & RUNTIME GAPS

| Gap ID    | Description                                                          | Files                                                                          | Risk   | Status    | Commit      | Validation Proof                                                                                                        |
| --------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------ | --------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| G-BCR-001 | `bcrypt@5.1.1` native binding fails on Node 24+ — server cannot start | `server/package.json`, `server/src/lib/authTokens.ts`, `server/src/routes/auth.ts`, `server/src/routes/tenant.ts`, `server/src/services/tenantProvision.service.ts`, `server/prisma/seed.ts`, 7 test files | 🟠 Med  | VALIDATED | `3f16bf6`   | bcryptjs@3.0.3 (pure-JS); `GET /health` → 200 on Node 24; hash/compare proof recorded; tsc EXIT 0; eslint EXIT 0 |

> Policy: Wave work may proceed when **all gates pass** (`pnpm -C server run typecheck` + `pnpm -C server run lint` + `pnpm run lint` + `pnpm run typecheck`). Root lint gate closed — G-QG-001 ✅ VALIDATED (GOVERNANCE-SYNC-050).

| Gap ID   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Wave             | Risk   | Status      | Commit | Validation Proof                                   |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------ | ----------- | ------ | -------------------------------------------------- |
| G-QG-001 | **Frontend ESLint debt blocks root lint gate** — 23 errors across 11 files: `App.tsx` (unused vars), `Auth/ForgotPassword.tsx` + `Auth/TokenHandler.tsx` + `Auth/VerifyEmail.tsx` (`React` not defined / unused vars), `Auth/AuthFlows.tsx` (unused var), `Cart/Cart.tsx` (unused vars), `ControlPlane/AuditLogs.tsx` + `ControlPlane/TenantRegistry.tsx` (unused vars), `ControlPlane/EventStream.tsx` (setState-in-effect), `constants.tsx` (unused imports), `services/apiClient.ts` (`AbortController` not defined) | Wave 3 / cleanup | 🟡 Low | ✅ **VALIDATED** — GOVERNANCE-SYNC-050 (OPS-LINT-CLEANUP-001, 2026-03-03) | — | `pnpm run lint` EXIT 0 · 0 errors · 0 warnings; `pnpm run typecheck` EXIT 0; 23→0 errors across 11 files |

---

# WAVE 3 — Canonical Doctrine Buildout

## RLS Entropy Elimination

| Gap ID        | Description                                                                                                              | Affected Files                                                                                                                                                                                                                   | Risk    | Status      | Migration Timestamp Range          | Validation Proof                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| G-006C (RLS)  | **Multiple permissive RLS policies per command per table** — Supabase Performance Advisor flagged policy sprawl across 11 tables; eliminates OR-policy explosion before G-016–G-023 domains are added | `server/prisma/migrations/20260223010000…20260315000004` (11 original + 7 P2 migrations) | 🟠 Med  | ✅ **VALIDATED** (GOVERNANCE-SYNC-064 audit 2026-03-03) — all 11 tables consolidated; 0 bypass_enabled() in active USING/WITH CHECK clauses; 1 RESTRICTIVE guard + 1 PERMISSIVE per command per table; FORCE RLS t on all tables | 20260223010000 – 20260315000004 | All 11 tables complete: audit_logs ✅ · carts ✅ · cart_items ✅ · catalog_items ✅ · orders ✅ · order_items ✅ · memberships ✅ · tenant_branding ✅ · tenant_domains ✅ · event_logs ✅ · impersonation_sessions ✅ |

**Tables in scope (apply in order) — P2 status:**
✅ `audit_logs` (GOVERNANCE-SYNC-029) → ✅ `carts` (OPS-DB-RECOVER-001) → ✅ `cart_items` (20260303110000 — GOVERNANCE-SYNC-046/048; applied) → ✅ `catalog_items` (20260315000000 — GOVERNANCE-SYNC-051) → ✅ `orders` (GOVERNANCE-SYNC-030) → ✅ `order_items` (GOVERNANCE-SYNC-030) → ✅ `memberships` (20260315000001 — GOVERNANCE-SYNC-052) → ✅ `tenant_branding` (20260315000002 — GOVERNANCE-SYNC-053) → ✅ `tenant_domains` (20260315000003 — GOVERNANCE-SYNC-054) → ✅ `event_logs` (GOVERNANCE-SYNC-031) → ✅ `impersonation_sessions` (20260315000004 — GOVERNANCE-SYNC-055)

**Expected end state per table:**
- 1 permissive policy per command (SELECT / INSERT / UPDATE / DELETE)
- RESTRICTIVE guard policies untouched
- FORCE RLS: unchanged
- Cross-tenant 0-row proof: PASS
- Supabase Performance Advisor: cleared

---

## Schema Domain Buildout

> **GOVERNANCE-SYNC-001 (2026-02-27):** Table expanded with Commit + Validation Proof columns. All statuses corrected per drift-detection audit `2066313`. False G-015 Phase C ✅ entry in wave-execution-log retracted. Source: `docs/audits/GAP-015-016-017-019-VALIDATION-REPORT.md`.

| Gap ID | Description | Status | Commit(s) | Validation Proof / Notes |
| ------ | ----------- | ------ | --------- | ------------------------ |
| G-015  | `organizations` table — Phase A: introduce org table + RLS + dual-write trigger; Phase B: deferred FK `organizations.id → tenants.id`; **Phase C: read cutover to `organizations` as canonical identity — IMPLEMENTED via Option C (admin-context; no RLS change; no migration)** | VALIDATED | Phase A: `bb9a898` · Phase B: `a838bd8` · Phase C: `790d0e6` | Phase A ✅ table + trigger + 3 RLS policies (admin-realm-only); Phase B ✅ deferred FK, parity-check preflight; Phase C ✅ implemented via Option C (GOVERNANCE-SYNC-004, 2026-02-27): `withOrgAdminContext` + `getOrganizationIdentity` + `OrganizationNotFoundError` added to `database-context.ts`; GET /me and invite-email paths wired; **tenant realm reads remain blocked by org RESTRICTIVE guard policy** (no RLS change); typecheck EXIT 0 · lint 0 errors |
| G-016  | `traceability_nodes` and `traceability_edges` tables — Phase A schema + RLS + service + tenant/admin routes — **IMPLEMENTED** (`44ab6d6`) | VALIDATED | `44ab6d6` | ✅ migration `20260312000000_g016_traceability_graph_phase_a`: public.traceability_nodes (org_id FK→organizations ON DELETE RESTRICT, UNIQUE(org_id,batch_id), INDEX(org_id,node_type), meta JSONB, visibility, geo_hash, updated_at trigger) + public.traceability_edges (org_id FK→organizations, from_node_id/to_node_id FK→traceability_nodes ON DELETE CASCADE, edge_type, transformation_id, meta JSONB; 2x partial UNIQUE indexes for NULL/NOT NULL transformation_id, 2x graph traversal indexes); ENABLE+FORCE RLS on both tables; 5 policies each (RESTRICTIVE guard incl. is_admin pass-through, PERMISSIVE tenant_select/insert/update, PERMISSIVE admin_select); GRANT SELECT/INSERT/UPDATE TO texqtic_app; DO block PASS (both tables); **DB APPLIED ✅ (GOVERNANCE-SYNC-009, 2026-02-27, env: Supabase dev)**: psql EXIT:0 + migrate resolve --applied; pg_policies: 5 rows each verified; relrowsecurity=t relforcerowsecurity=t on both tables; constraints: pkey + org_id FK on nodes; pkey + org_id FK + from_node_id FK + to_node_id FK on edges; data: 0 rows (vacuous — structure proven by DO block PASS notice); TraceabilityService: createNode/listNodes/createEdge/listEdges/getNodeNeighbors; meta 16KB stop-loss; tenant routes: POST+GET /nodes · GET /nodes/:id/neighbors · POST+GET /edges; admin control routes: GET /traceability/nodes · GET /traceability/edges (cross-tenant, is_admin context); wired in tenant.ts + control.ts; Prisma: TraceabilityNode + TraceabilityEdge models + organizations back-refs; typecheck EXIT 0 · lint 0 errors/92 warnings; **FRONTEND CLOSED ✅ (GOVERNANCE-SYNC-115 · commit df2cc638 · 2026-03-07)**: traceabilityService.ts (tenant CRUD + admin read-only API client) + TraceabilityPanel.tsx (tenant LIST/CREATE/DETAIL/1-hop-neighbors) + TraceabilityAdmin.tsx (control-plane cross-tenant read-only inspection); all 4 shells wired via ShellProps.onNavigateTraceability; SuperAdminShell NavLink added; App.tsx TRACEABILITY expView + adminView case; openapi.tenant.json 5 paths + openapi.control-plane.json 2 paths appended; D-017-A: orgId absent from all frontend request bodies; Phase A: no UPDATE/DELETE controls on any plane; DPPPassport.tsx untouched; typecheck EXIT 0 · lint EXIT 0 |
| G-017  | `trades` + `trade_events` tables + RLS + lifecycle FK + Day 4 pending_approvals trigger hardening + FK hardening for buyer/seller org refs + admin-plane SELECT RLS | VALIDATED | `96b9a1c` `3bc0c0f` `b557cb5` `0bb9cf3` `8069d48` `2512508` `7350164` `bdb9ab7` | ✅ schema + RLS (RESTRICTIVE guard + PERMISSIVE SELECT/INSERT) + lifecycle FK + route (`trades.g017.ts`) + service (`trade.g017.service.ts`) + 17 tests; **FK HARDENING CLOSED (GOVERNANCE-SYNC-005)**: migration `20260309000000_g017_fk_buyer_seller_orgs` adds 2 FK constraints (ON DELETE RESTRICT); embedded preflight DO block; Prisma schema updated; **DB APPLIED ✅ (GOVERNANCE-SYNC-006, 2026-02-27, env: Supabase dev)**: psql + resolve --applied; **ADMIN-PLANE RLS CLOSED ✅ (GOVERNANCE-SYNC-007, 2026-02-27)**: migration `20260310000000_g017_trades_admin_rls` adds `trades_admin_select` + `trade_events_admin_select` (PERMISSIVE SELECT, USING `is_admin=true`); RESTRICTIVE guards on both tables rebuilt with `OR current_setting('app.is_admin',true)='true'`; pattern mirrors GATE-TEST-003 (audit_logs); migration DO block verified all 6 policy invariants (PASS); pg_policies proof: 6 rows — guards RESTRICTIVE with admin pred, tenant_select scoped to current_org_id (isolation preserved), admin_select PERMISSIVE SELECT; data in dev: 0 rows trades/trade_events (vacuous data proof — policy structure proven via DO block); Prisma ledger synced; no admin INSERT/UPDATE/DELETE (SELECT only per scope); gap register was incorrectly NOT STARTED — corrected GOVERNANCE-SYNC-001; **Day4 FK Hardening DB Applied ✅ (GOVERNANCE-SYNC-015, 2026-02-28, env: Supabase dev)**: migration `20260307000000_g017_day4_pending_approvals_trade_fk_hardening` applied via psql (migration file first patched: adjacent-literal RAISE NOTICE in verification DO block merged into single literal, impl commit `bdb9ab7`); function `g017_enforce_pending_approvals_trade_entity_fk` created (RETURNS trigger, LANGUAGE plpgsql, SECURITY DEFINER, SET search_path=public); trigger `trg_g017_pending_approvals_trade_entity_fk` (BEFORE INSERT OR UPDATE ON pending_approvals FOR EACH ROW) created; tgrelid=pending_approvals, tgenabled=O; DO block 5-check VERIFY PASS (function EXISTS, trigger EXISTS, tgenabled=O, pending_approvals EXISTS, trades EXISTS); trigger/function counts post-apply: 1/1; SQLSTATE P0003 enforcement; Prisma ledger synced via resolve --applied; required for pending_approvals → trade entity FK integrity; **trades_domain Ledger-Sync ✅ (GOVERNANCE-SYNC-016, 2026-02-28)**: migration `20260306000000_g017_trades_domain` ledger-synced (resolve-only, no psql apply); `public.trades` + `public.trade_events` confirmed present in DB via to_regclass; applied out-of-band previously as G-017 Day1 schema prerequisite; row counts: trades=0, trade_events=0 (vacuous) |
| G-018  | `escrow_accounts` table + lifecycle FK + Day 3 tenant+control routes | VALIDATED | `7c1d3a3` `efeb752` `8d7d2ee` `98eb08d` | ✅ schema + RLS + service (ledger + lifecycle + governance) + routes (tenant + control); **Day 1 DB Applied ✅ (GOVERNANCE-SYNC-011, 2026-02-28, env: Supabase dev)**: psql apply (migration `20260308000000_g018_day1_escrow_schema`, commit `7c1d3a3`) + resolve --applied; §16 PASS notice; RLS t/t on both tables; FKs verified; **Cycle Fix DB Applied ✅ (GOVERNANCE-SYNC-012, 2026-02-28, env: Supabase dev)**: psql apply (migration `20260308010000_g018_day1_escrow_schema_cycle_fix`) + resolve --applied; `escrow_accounts.trade_id` + 2 indexes dropped; `trades.escrow_id → escrow_accounts.id` canonical FK preserved (ON DELETE RESTRICT); RLS t/t on both escrow tables unchanged; verification PASS; **Migration File Repaired ✅ (GOVERNANCE-SYNC-013, 2026-02-28)**: patched 2 RAISE NOTICE adjacent-string-literal PL/pgSQL syntax errors + non-ASCII chars (em dash `—`, Unicode arrow `→`) replaced with ASCII (`--`, `->`); no operational SQL change; psql parse proof: COMMIT + PASS notice (no ERROR); impl commit `98eb08d` |
| G-019  | `certifications` table — schema + RLS + service + tenant/admin routes — **IMPLEMENTED** (`3c7dae7`) | VALIDATED | `3c7dae7` | ✅ migration `20260311000000_g019_certifications_domain`: public.certifications (org_id FK→organizations ON DELETE RESTRICT, lifecycle_state_id FK→lifecycle_states ON DELETE RESTRICT, CHECK expires_after_issued, partial UNIQUE per-pending + full UNIQUE per-issued); ENABLE+FORCE RLS; 5 policies (RESTRICTIVE guard incl. is_admin pass-through, PERMISSIVE tenant_select/insert/update, PERMISSIVE admin_select); updated_at trigger; GRANT SELECT/INSERT/UPDATE TO texqtic_app; DO block PASS; **DB APPLIED ✅ (GOVERNANCE-SYNC-008, 2026-02-27, env: Supabase dev)**: psql EXIT:0 + migrate resolve --applied; pg_policies: 5 rows verified; relrowsecurity=t relforcerowsecurity=t; constraints: pkey + 2 FKs + CHECK; data: 0 rows (vacuous — structure proven by DO block); CertificationService: create/list/get/update/transition (entity_type='CERTIFICATION' enforced); tenant routes: POST / · GET / · GET /:id · PATCH /:id · POST /:id/transition; admin control routes: GET / · GET /:id (cross-tenant, is_admin context); wired in tenant.ts + control.ts; typecheck EXIT 0 · lint 0 errors/92 warnings |
| G-020  | State machine transition tables (trade, escrow, certification lifecycle) **+ G-020 Runtime Enforcement Atomicity (GOVERNANCE-SYNC-021)** | VALIDATED | `aec967f` `9c3ca28` `61d1a96` | ✅ schema + RLS + seed (43-edge graph across TRADE/ESCROW/CERTIFICATION entities) + `StateMachineService` transition enforcement + 20 tests; CLOSED per wave log; **DB Applied ✅ (GOVERNANCE-SYNC-014, 2026-02-28, env: Supabase dev)**: all 4 tables (`lifecycle_states`, `allowed_transitions`, `trade_lifecycle_logs`, `escrow_lifecycle_logs`) + `prevent_lifecycle_log_update_delete` fn + 2 immutable-log triggers confirmed present in DB out-of-band (applied as prerequisite for G-017 trades); pre-flight guard blocks re-apply (lifecycle_states already existed); FORCE RLS t/t on all 4 tables; 14 RLS policies (lifecycle_states: 2, allowed_transitions: 2, trade_lifecycle_logs: 5, escrow_lifecycle_logs: 5); key constraints: pkey+unique on lifecycle_states, pkey+unique+2FKs+3CHECKs on allowed_transitions, pkey+FKs+CHECKs on log tables; row counts: 0 (vacuous — structure proven by constraints/policies); Prisma ledger synced via resolve --applied; **Runtime Enforcement Atomicity CLOSED ✅ (GOVERNANCE-SYNC-021, 2026-02-28)**: two-phase atomicity gap eliminated — `StateMachineService.transition()` accepts `opts?.db` (shared `PrismaClient`); when provided, SM log write uses `opts.db` directly (no nested `$transaction`); `TradeService.transitionTrade()` wraps SM log INSERT + `trade.lifecycleStateId` UPDATE + `tradeEvent` INSERT in ONE `$transaction`; `EscrowService.transitionEscrow()` wraps SM log INSERT + `$executeRaw UPDATE escrow_accounts.lifecycle_state_id` in ONE `$transaction`; dead CERTIFICATION APPLIED branch removed (SM always returns `CERTIFICATION_LOG_DEFERRED`); atomicity regression tests T-15 (trade) + E-09 (escrow) added; typecheck EXIT 0, lint 0 errors, 44/44 tests pass |
| G-021  | Maker-Checker dual-signature enforcement **+ G-021 Runtime Enforcement Wiring (GOVERNANCE-SYNC-022)** | VALIDATED | `407013a` `de3be8f` `9c15026` | ✅ schema + RLS + replay integrity hash + `maker_id ≠ checker_id` DB trigger + active-uniqueness constraint + idempotency + 29 tests; CLOSED per wave log; **DB Applied ✅ (GOVERNANCE-SYNC-017, 2026-03-01, env: Supabase dev)**: all objects confirmed present in DB out-of-band prior to ledger sync; pre-flight guard blocks re-apply (`pending_approvals` already existed); resolve-only path; 10 RLS policies (pg_policies: 10); ENABLE+FORCE RLS: t/t on both tables (`pending_approvals`, `approval_signatures`); 2 trigger functions (`prevent_approval_signature_modification`, `check_maker_checker_separation`); 2 triggers on `approval_signatures` (immutability BEFORE UPDATE/DELETE + D-021-C AFTER INSERT); partial unique index `pending_approvals_active_unique` (D-021-B: WHERE status IN (REQUESTED, ESCALATED)); row counts: 0/0 (vacuous — structure proven by RLS + triggers + index + constraints); Prisma ledger synced via resolve --applied; **Runtime Enforcement Wiring CLOSED ✅ (GOVERNANCE-SYNC-022, 2026-02-28)**: Fix A — `TradeService` constructor `_makerChecker` unused-underscore removed; `makerChecker` now stored + called on PENDING_APPROVAL; `trade.g017.types.ts` PENDING_APPROVAL result gains `approvalId?: string`; Fix A2 — tenant + control trade transition routes construct `MakerCheckerService` and inject into `TradeService`; Fix B — control-plane escrow route gains POST `/:escrowId/transition` endpoint with MC injection (mirrors tenant plane); Fix C — `buildService()` in `routes/internal/makerChecker.ts` injects `EscalationService` into SM + MC so `verifyAndReplay()` enforces freeze checks (D-022-D); Implementation commit `9c15026`; 19/19 tests pass (17 trade + 2 makerChecker); typecheck EXIT 0 · lint 0 errors; pending migrations = 0 BEFORE + AFTER; **Depends on G-020 SM enforcement boundary; integrates with G-022 escalation freeze checks**; **Prevents trade lifecycle dead-end where PENDING_APPROVAL had no pending_approvals row** |
| G-022  | Escalation levels + kill-switch mechanism **+ G-022 Runtime Enforcement — CERTIFICATION Freeze Wiring (GOVERNANCE-SYNC-023)** | VALIDATED | `e138ff0` `5d8e43c` `e8d0811` | ✅ schema + RLS + `EscalationService` (freeze gate D-022-B/C) + tenant routes (LEVEL_0/1) + control routes (upgrade/resolve) + 28 tests (23 Day2 + 5 Day3); **DB Applied ✅ (GOVERNANCE-SYNC-018, 2026-02-28, env: Supabase dev)**: `escalation_events` table + 2 trigger functions (`escalation_events_immutability`, `escalation_severity_upgrade_check`) + 2 triggers confirmed present in DB out-of-band; pre-flight guard blocks re-apply (escalation_events already existed); resolve-only path; ENABLE+FORCE RLS: t/t; 4 RLS policies (tenant_select, admin_select, tenant_insert, admin_insert); 5 indexes (pkey + entity_freeze + org_freeze + org_id + parent); D-022-A severity upgrade trigger ✅; D-022-B org freeze via entity_type=ORG ✅; row count: 0 (vacuous); Prisma ledger synced via resolve --applied; **GAP-G022-01 CLOSED ✅ (GOVERNANCE-SYNC-023, 2026-02-28)**: CERTIFICATION routes (`certifications.g019.ts`) — all 5 SM instantiation sites now inject `EscalationService` (createCertification, listCertifications, getCertification, updateCertification, transitionCertification); SM Step 3.5 org-level freeze checks now enforced for all CERTIFICATION operations; 2 tests added (T-G022-CERT-ORG-FROZEN: org freeze blocks CERTIFICATION transition ✅, T-G022-CERT-NOT-FROZEN: no freeze → SM proceeds to CERTIFICATION_LOG_DEFERRED ✅); **GAP-G022-02 ✅ VALIDATED (GOVERNANCE-SYNC-047, 2026-03-03)**: `'CERTIFICATION'` added to `EscalationEntityType` union (`escalation.types.ts`) + `escalation_events.entity_type` CHECK constraint extended (migration `20260303120000_g022_p2_cert_entity_type`: DROP `escalation_events_entity_type_check` + ADD with CERTIFICATION included; DO-block verifier present); T-G022-CERT-ENTITY-FROZEN test activated in `certification.g022.freeze.test.ts` (entity-level freeze for CERTIFICATION now production-reachable); stop-loss block removed; typecheck EXIT 0; lint EXIT 0; pending psql apply via DATABASE_URL |
| GATE-TEST-003 | `audit_logs` admin SELECT + RESTRICTIVE guard admin predicate fix | VALIDATED | — | ✅ migration `20260304000000_gatetest003_audit_logs_admin_select`: drops+recreates `audit_logs_guard` RESTRICTIVE policy adding `current_setting('app.is_admin',true)='true'` predicate; adds `audit_logs_admin_select` PERMISSIVE SELECT (admin context, `tenant_id IS NULL` rows only); VERIFY DO block passes 5 invariant checks; parse-safe (no adjacent literals, no non-ASCII in RAISE strings); tenant isolation unchanged; **DB Applied ✅ (GOVERNANCE-SYNC-019, 2026-02-28, env: Supabase dev)**: all objects confirmed present in DB out-of-band; resolve-only path; FORCE RLS t/t on `audit_logs`; 6 total policies (`audit_logs_guard` RESTRICTIVE + `audit_logs_select_unified` PERMISSIVE SELECT + `audit_logs_admin_select` PERMISSIVE SELECT + `audit_logs_insert_unified` + `audit_logs_no_update` + `audit_logs_no_delete`); `has_admin_predicate=t` ✅; PERMISSIVE SELECT policies = 2 (matches VERIFY check); `audit_logs` row count: 55 (live data); Prisma ledger synced via resolve --applied |
| G-023  | `reasoning_logs` table + `reasoning_hash` FK for AI events | VALIDATED | `48a7fd3` `2f432ad` | ✅ schema (reasoning_logs + audit_logs FK) + service (emit reasoning_log per AI call) + wave log evidence doc; **DB Applied ✅ (GOVERNANCE-SYNC-020, 2026-02-28, env: Supabase dev)**: `reasoning_logs` table + `audit_logs.reasoning_log_id` FK column + fn `reasoning_logs_immutability` + trigger `trg_reasoning_logs_immutability` + 3 RLS policies + 4 indexes all confirmed present in DB out-of-band; resolve-only path (migration uses CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS patterns); ENABLE+FORCE RLS: t/t; 3 policies (`reasoning_logs_guard` RESTRICTIVE ALL, `reasoning_logs_tenant_select` PERMISSIVE SELECT, `reasoning_logs_tenant_insert` PERMISSIVE INSERT); 4 indexes on reasoning_logs (pkey + created_at + request_id + tenant_id); immutability trigger enabled=O (append-only, bypass-rls DELETE escape for test seed only); `audit_logs.reasoning_log_id` FK ✅ (col_exists=1); row counts: reasoning_logs=23 (live AI audit data), audit_logs with reasoning_log_id IS NOT NULL=5 (FK live and used); Prisma ledger synced via resolve --applied; **🎉 MILESTONE: All 57 migrations ledger-synced. `Database schema is up to date!`** |
| G-024  | `sanctions` table — runtime enforcement for sanctioned orgs/entities | VALIDATED | `a133123` | M scope; migration `20260313000000_g024_sanctions_domain` adds `public.sanctions` table + SECURITY DEFINER enforcement functions; SanctionsService injected into StateMachineService(3.5a), TradeService(buyer+seller), CertificationService, EscrowService(create+RELEASE); 7 route files wired; replay-safe via SM.transition() path; T-G024-01..06 (6/6 PASS); typecheck EXIT 0; lint 0 errors; **DB Migration APPLIED ✅ (OPS-ENV-002 + OPS-DB-RECOVER-001, 2026-03-01, env: Supabase prod)**; **CLOSED (GOVERNANCE-SYNC-024 / GOVERNANCE-SYNC-026, 2026-03-13 / 2026-03-01)** |

---

# WAVE 4 — Governance + Infrastructure

| Gap ID | Description                                                         | Status      | Notes                                      |
| ------ | ------------------------------------------------------------------- | ----------- | ------------------------------------------ |
| G-025  | DPP snapshot views (`dpp_product_passport`) — MISSING               | NOT STARTED | XL scope; regulator-facing read models     |
| G-026  | Custom domain routing / tenant resolution (white-label) | **TECS 6C1 ✅ Validated (GOVERNANCE-SYNC-090) · TECS 6C2 ✅ Validated (GOVERNANCE-SYNC-091) · TECS 6C3 ✅ Validated (GOVERNANCE-SYNC-092) — TECS 6D pending** | L scope; D1=Hybrid Edge+Backend; D2=platform subdomains v1 (<slug>.texqtic.app); D3=HMAC resolver endpoint; D4=texqtic_service BYPASSRLS narrow; D5=60s Edge TTL cache + POST /api/internal/cache-invalidate webhook (emitters wired in TECS 6D); D6=internal signed contract; D7=x-texqtic-* headers + Edge HMAC signing; D8=fail-closed; G-026-A deferred v1.1; G-026-H ✅; G-026-C ✅; G-026-D ✅; G-026-F ✅ (webhook implemented; emitters TECS 6D); ENV: TEXQTIC_RESOLVER_SECRET required in Vercel Edge + Node.js env vars; TECS 6D queued |
| G-026-H | `texqtic_service` DB role with BYPASSRLS SELECT on tenants(id,slug) | ✅ VALIDATED — TECS 6C1 (GOVERNANCE-SYNC-090) | migration 20260317000000_g026_texqtic_service_role applied to remote Supabase; APPLY_EXIT=0; VERIFIER PASS: texqtic_service role confirmed — BYPASSRLS=true, SELECT on tenants + tenant_domains, granted to postgres |
| G-027  | The Morgue (Level 1+ failure event bundles) — schema foundation + canonical producer complete | **VALIDATED** | L scope; post-mortem + regulator review — `morgue_entries` table + canonical RLS applied 2026-03-03 (GOVERNANCE-SYNC-065); StateMachineService ORDER branch extended to write `morgue_entries` row atomically on terminal transitions (FULFILLED/CANCELLED) with dedup guard — typecheck EXIT 0, lint EXIT 0 (GOVERNANCE-SYNC-068) |
| G-028  | Insight caching / vector store / inference separation for AI        | **✅ COMPLETE (A1–A7) — GOVERNANCE-SYNC-095** | XL scope; pgvector schema + RLS (A1); TVS `$queryRaw` module (A2); shadow retrieval (A3); ingestion pipeline — chunker + Gemini 768-dim (A4); RAG context injection into `/api/ai/insights` (A5); async FIFO index queue (A6); latency benchmark + retrieval scoring framework (A7); 64 A-series tests PASS; commits: `c07af57` `b90245a` `5fb4b8a` `8ee0e31` `59b6f26` `a4c867d` `10bda3e` `d9292df` `dad08f7` `858714b` `ad5bf72` `d31a8d8` `fdb822a` `cddd624`; GOVERNANCE-SYNC-094 + GOVERNANCE-SYNC-095 |
| G-WL-TYPE-MISMATCH | WL tenant renders as wrong shell/type when org is unprovisioned — stub defaulted `type: 'B2B'`; WL org in provisioning gap rendered B2B/Enterprise sidebar | **VALIDATED** | `65ab907` (backend) · `ef46214` (frontend). Backend: `tenantType: string\|null` in login response via `getOrganizationIdentity`; fail-open on `OrganizationNotFoundError`. Frontend: `LoginResponse.tenantType` typed; `stubType` enum-validated from `data.tenantType` (AGGREGATOR fallback); both stub paths fixed. Happy path unchanged. Gates: tsc EXIT 0 · eslint 0 errors · gate-e-4-audit login PASS. |
| G-WL-ADMIN | WL Store Admin back-office surface missing — WL OWNER/ADMIN landed on storefront shell; no back-office access to Branding, Staff, Products, Collections, Orders, Domains | **VALIDATED** | `46a60e4`. `'WL_ADMIN'` appState added. Router rule: WHITE_LABEL + OWNER/ADMIN → `WL_ADMIN` in all handleAuthSuccess paths. `WhiteLabelAdminShell` in Shells.tsx: sidebar with 6 panels (no B2B chrome). BRANDING→WhiteLabelSettings, STAFF→TeamManagement; PRODUCTS/COLLECTIONS/ORDERS/DOMAINS→WLStubPanel (stub). Provision banner compatible. "← Storefront" link restores WhiteLabelShell. Gates: tsc EXIT 0 · eslint 0 errors. Follow-ons: Products, Collections, Orders, Domains full panels (Wave 4). |

---

## Ops / Infrastructure Gaps

| Gap ID | Description | Status | Notes |
| ------ | ----------- | ------ | ----- |
| OPS-ENV-001 | Prisma migration env var naming mismatch: `MIGRATION_DATABASE_URL` (schema.prisma) vs `DIRECT_DATABASE_URL` (TECS prompts + copilot-instructions). Caused 3 consecutive prod deploy blocks during G-024 migration cycle. | **VALIDATED** | Option A: standardized on `DIRECT_DATABASE_URL`. `schema.prisma directUrl` updated. Preflight script (`server/scripts/prisma-env-preflight.ts`) blocks TX_POOLER (exit 1). Deploy wrapper (`server/scripts/migrate-deploy.ts`) auto-loads .env. `package.json` scripts: `prisma:preflight`, `migrate:deploy:prod`. Docs: `docs/ops/prisma-migrations.md`. Proof: 4/4 exit code tests PASS. typecheck EXIT 0. GOVERNANCE-SYNC-025. |
| OPS-ENV-002 | Rename `MIGRATION_DATABASE_URL` → `DIRECT_DATABASE_URL` in `server/.env` (gitignored) and deploy G-024 to production. | **VALIDATED** | `server/.env` key renamed (no tracked change). Preflight: DIRECT_DATABASE_URL, SESSION_POOLER (aws-1-*:5432), EXIT 0. G-024 deploy: SUCCESS — "Applying migration `20260313000000_g024_sanctions_domain`". Post-deploy: "Database schema is up to date!" (0 pending). GOVERNANCE-SYNC-026. |
| OPS-DB-RECOVER-001 | `_prisma_migrations` stuck row for `20260223020000_g006c_rls_carts_consolidation` (finished_at=NULL, applied_steps_count=0 from Mar-1 failed deploy attempt). Blocked G-024 deploy. | **VALIDATED** | Investigation: all carts unified policies already present in DB (carts_select/insert/update/delete_unified + FORCE RLS). Path B chosen: `UPDATE _prisma_migrations SET finished_at=NOW(), applied_steps_count=1 WHERE migration_name='20260223020000_g006c_rls_carts_consolidation' AND finished_at IS NULL AND rolled_back_at IS NULL` — 1 row affected. Deploy unblocked. GOVERNANCE-SYNC-026. |

---

# REVENUE UNBLOCK — OPS-REVENUE-UNBLOCK-IMPLEMENTATION-001

**TECS:** OPS-REVENUE-UNBLOCK-IMPLEMENTATION-001  
**Date:** 2026-03-02  
**Commits:** `3923069` `fc66637` `5d4c3bf` `2cda383` `739f6d8`  
**Scope:** RU-001 (invite activation wiring) · RU-002 (provision UI enablement) · RU-003 (catalog create API + service + frontend inline form)  
**Gates:** typecheck EXIT 0 (frontend + backend) · lint EXIT 0 (0 errors, 1 pre-existing warning)  
**Non-goals preserved:** No schema changes · No migrations · No RLS changes · No auth middleware edits · No new dependencies · No route plugins added outside tenant.ts allowlist

| Gap ID | Description | Affected Files | Risk | Status | Commit(s) | Validation Proof |
| ------ | ----------- | -------------- | ---- | ------ | --------- | ---------------- |
| RU-001 | **Invite activation wiring** — `action=invite` URL token was intercepted by TokenHandler; `pendingInviteToken` state missing in App root; `activateTenant` never called on onboarding completion; OnboardingFlow step 2 had no email/password fields | `App.tsx` · `components/Onboarding/OnboardingFlow.tsx` | 🟠 Med | VALIDATED | `5d4c3bf` `739f6d8` | `action=invite` URL detection routes to ONBOARDING (not TOKEN_HANDLER) ✅ · `pendingInviteToken` state seeded from URL param ✅ · OnboardingFlow step 2 "Set Up Your Account" collects `email` + `password` ✅ · `activateTenant({inviteToken, userData})` called exactly once on step 4 completion ✅ · On success: `tenants[]` seeded, `currentTenantId` set, `pendingInviteToken` cleared, transition to EXPERIENCE ✅ · typecheck EXIT 0 · lint EXIT 0 |
| RU-002 | **Provision UI enablement** — "Provision New Tenant" button was `disabled` with note "will be enabled in Wave 5"; no modal or form existed; `provisionTenant` service function had no UI entry point | `components/ControlPlane/TenantRegistry.tsx` | 🟡 Low | VALIDATED | `2cda383` `739f6d8` | Provision button enabled (removed `disabled` flag) ✅ · Modal opens with form (orgName, ownerEmail, ownerPassword) ✅ · `handleProvision`: auto-slugifies orgName, calls `provisionTenant({name, slug, type:'B2B', ownerEmail, ownerPassword})` ✅ · On success: shows orgId + slug + next-step guidance for invite link ✅ · Tenant list refreshed via `fetchTenants()` ✅ · All form labels a11y-compliant (`htmlFor`/`id`) ✅ · typecheck EXIT 0 · lint EXIT 0 |
| RU-003 | **Catalog item creation** — `POST /api/tenant/catalog/items` endpoint absent; `catalogService.ts` had no write ops; no frontend UI to add items; `catalog.item.created` audit action did not exist | `server/src/routes/tenant.ts` · `services/catalogService.ts` · `App.tsx` | 🟠 Med | VALIDATED | `3923069` `fc66637` `5d4c3bf` `739f6d8` | `POST /api/tenant/catalog/items`: `tenantAuthMiddleware` + `databaseContextMiddleware` guards ✅ · Role guard: OWNER or ADMIN only ✅ · Zod schema: `name` (required), `sku?`, `description?`, `price` (positive), `moq` (int, default 1) ✅ · `withDbContext` → `tx.catalogItem.create` (RLS-safe) ✅ · `writeAuditLog(action: 'catalog.item.created')` ✅ · Returns 201 with created item ✅ · `createCatalogItem(payload)` added to `catalogService.ts` via `tenantPost` ✅ · Inline "+ Add Item" form in B2B (Wholesale Catalog) + B2C (New Arrivals) shells ✅ · typecheck EXIT 0 · lint EXIT 0 |

### S1 Happy Path — Validated (2026-03-02)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| A | Control Plane → Tenant Registry → "Provision New Tenant" → fill form | Success modal: orgId + slug shown; tenant list refreshed | ✅ VALIDATED |
| B | Use invite member flow → capture `?token=<token>&action=invite` URL | Token routed to ONBOARDING — distinct from `reset-password`/`verify-email` (TokenHandler bypassed) | ✅ VALIDATED |
| C | Open invite URL → OnboardingFlow step 2 collects email+password → "Complete Activation" | `POST /api/tenant/activate` called exactly once → transitions to EXPERIENCE | ✅ VALIDATED |
| D | OWNER in B2B or B2C → "+ Add Item" → fill name/price/[sku] → Save | Item prepended to product list; `catalog.item.created` audit row written | ✅ VALIDATED |
| E | Member adds item to cart → checkout | Order appears in orders list | ✅ VALIDATED |
| F | Audit trail check | `control.tenants.provisioned` + `user.activated` + `catalog.item.created` + checkout audit — all present | ✅ VALIDATED |

---

# REVENUE UNBLOCK — OPS-ACTIVATE-JWT-FIX-001

**TECS:** OPS-ACTIVATE-JWT-FIX-001  
**Date:** 2026-03-02  
**Commit:** `43ef9c6`  
**Scope:** GAP-RUV-001 (invite URL action param) · GAP-RUV-002 (activate JWT issuance) · GAP-RUV-003 (tenant type from response) · GAP-RUV-005 (industry field data integrity)  
**Gates:** typecheck EXIT 0 (frontend + backend) · lint EXIT 0 (0 errors, pre-existing warnings only)  
**Non-goals preserved:** No schema changes · No migrations · No RLS changes · No auth middleware edits · No new dependencies · No new routes

| Gap ID | Description | Affected Files | Risk | Status | Commit(s) | Validation Proof |
| ------ | ----------- | -------------- | ---- | ------ | --------- | ---------------- |
| GAP-RUV-001 | **Invite email URL missing `action=invite` param** — invite link generated as `?token=<tok>` only; `App.tsx` `useEffect` routes to ONBOARDING only when `action=invite` present; without it, user lands in TOKEN_HANDLER (password-reset handler) and never reaches activation form | `server/src/services/email/email.service.ts` | 🔴 Revenue Blocker | VALIDATED | `43ef9c6` | `sendInviteMemberEmail` URL now `?token=<tok>&action=invite` ✅ · invite click routes to ONBOARDING (not TOKEN_HANDLER) ✅ |
| GAP-RUV-002 | **`POST /api/tenant/activate` returned no JWT** — backend `sendSuccess` response contained `{user, tenant, membership}` with no `token` field; `setToken()` was never called; all post-activation EXPERIENCE API calls hit `tenantAuthMiddleware` → 401 | `server/src/routes/tenant.ts` | 🔴 Revenue Blocker | VALIDATED | `43ef9c6` | `/activate` calls `reply.tenantJwtSign({userId, tenantId, role})` after `withDbContext` commits ✅ · response includes `{token, user, tenant:{id,name,slug,type}, membership}` ✅ · same JWT claim shape as `/api/auth/login` ✅ · no new signing helper · no new DB queries ✅ |
| GAP-RUV-003 | **`App.tsx` hardcoded `type: 'B2B'` after activation** — `onComplete` in ONBOARDING seeded tenant stub with `type: 'B2B'` regardless of actual provisioned type; WHITE_LABEL invite-activated users would land in B2B EXPERIENCE shell instead of WL shell; `setToken()` was also absent | `App.tsx` | 🟠 User abandonment | VALIDATED | `43ef9c6` | `setToken(raw.token, 'TENANT')` called before `setAppState('EXPERIENCE')` ✅ · `type: (raw.tenant.type ?? 'B2B') as TenantType` — derives type from server response, not hardcoded ✅ · `setToken` import added to `apiClient` import line ✅ |
| GAP-RUV-005 | **`OnboardingFlow.tsx` industry input uncontrolled** — step 1 `<input id="industry">` had no `value` or `onChange`; `formData.industry` was always `''`; data silently dropped on submit; `tenantData.industry` always received undefined | `components/Onboarding/OnboardingFlow.tsx` | 🟡 Data integrity | VALIDATED | `43ef9c6` | `value={formData.industry}` + `onChange={e => setFormData({...formData, industry: e.target.value})}` wired ✅ · field now controlled; data flows into `tenantData.industry` on activate ✅ |

---

# REVENUE UNBLOCK — OPS-ORDER-LIFECYCLE-AUDIT-001

**TECS:** OPS-ORDER-LIFECYCLE-AUDIT-001  
**Date:** 2026-03-02  
**Commit:** `5e13fe5`  
**Scope:** GAP-RUV-006 (order lifecycle audit trail — PARTIAL)  
**Gates:** typecheck EXIT 0 (backend) · lint EXIT 0 (0 errors, pre-existing warnings only)  
**Non-goals preserved:** No schema changes · No migrations · No RLS changes · No stateMachine edits · No new dependencies

| Gap ID | Description | Affected Files | Risk | Status | Commit(s) | Validation Proof |
| ------ | ----------- | -------------- | ---- | ------ | --------- | ---------------- |
| GAP-RUV-006 | **Order lifecycle audit trail — PARTIAL** — G-020 `StateMachineService` supports only `EntityType = 'TRADE' \| 'ESCROW' \| 'CERTIFICATION'`; `LifecycleState` schema has DB-level `CHECK entity_type IN ('TRADE', 'ESCROW', 'CERTIFICATION')` constraint; wiring ORDER into G-020 requires schema migration + new log table + seed data (all out-of-scope). **Interim:** structured lifecycle audit event `action: 'order.lifecycle.PAYMENT_PENDING'` added to checkout tx via existing `writeAuditLog`; recorded inside `withDbContext` transaction (rolls back atomically on failure); `metadataJson` contains `{ fromState: null, toState: 'PAYMENT_PENDING', trigger: 'checkout.completed', orderId, cartId }`. **Re-entry condition:** OPS-ORDER-LIFECYCLE-SCHEMA-001 (separate schema/migration wave) must add `ORDER` to `LifecycleState` CHECK constraint, create `order_lifecycle_logs` table, add ORDER lifecycle seed states, and extend `StateMachineService` before full G-020 wiring is possible. | `server/src/routes/tenant.ts` | 🟡 Operability | PARTIAL (audit-only) | `5e13fe5` | `audit_logs` row with `action='order.lifecycle.PAYMENT_PENDING'`, `entity='order'`, `entityId=<orderId>`, `metadataJson.fromState=null`, `metadataJson.toState='PAYMENT_PENDING'`, `metadataJson.trigger='checkout.completed'` ✅ · `order.CHECKOUT_COMPLETED` audit preserved ✅ · checkout tx rolls back atomically if lifecycle audit insert fails ✅ · typecheck EXIT 0 · lint EXIT 0 |

---

# WL ADMIN — OPS-WLADMIN-PRODUCTS-MVP-001

**TECS:** OPS-WLADMIN-PRODUCTS-MVP-001  
**Date:** 2026-03-02  
**Commit:** `6a7bf41`  
**Scope:** G-WL-ADMIN Products panel — VALIDATED  
**Gates:** typecheck EXIT 0 (frontend) · lint: 0 new errors (pre-existing G-QG-001 debt in non-allowlisted files unchanged)  
**Non-goals preserved:** No server/src changes · No schema/migrations/RLS changes · No new dependencies · Collections/Orders/Domains remain stub

| Gap ID | Description | Affected Files | Risk | Status | Commit(s) | Validation Proof |
| ------ | ----------- | -------------- | ---- | ------ | --------- | ---------------- |
| G-WL-ADMIN (Products panel) | **WL_ADMIN Products panel was WLStubPanel** — OWNER/ADMIN WL users could not manage inventory from the Store Admin console; Products nav item rendered a "Coming Soon" stub. **Fix:** `case 'PRODUCTS'` in `renderWLAdminContent()` replaced with a real panel reusing shared catalog state (`products`, `catalogLoading`, `catalogError`), shared form state (`showAddItemForm`, `addItemFormData`, `addItemLoading`, `addItemError`), shared handler (`handleCreateItem`) and existing services (`getCatalogItems`, `createCatalogItem`). Catalog `useEffect` extended to fire on `appState === 'WL_ADMIN'`. Labels prefixed `wl-` to avoid DOM `id` conflicts with B2B panel inputs. 403 from API surfaced via `addItemError`. Collections/Orders/Domains remain WLStubPanel. | `App.tsx` | 🟡 Operability | **VALIDATED** | `6a7bf41` | A) WL OWNER → Products → Add Item form visible → create item → item appears in grid → `catalog.item.created` audit row written ✅ · B) Catalog loads on enter (useEffect fires for WL_ADMIN) ✅ · C) Empty state: "No products yet" message shown ✅ · D) Error state: API error text displayed ✅ · typecheck EXIT 0 · 0 new lint errors |

**Re-entry conditions:**
- Collections panel: OPS-WLADMIN-COLLECTIONS-001 — ✅ **VALIDATED** (GOVERNANCE-SYNC-067: display-only panel scope complete; commit `3d67f4c`; model-backed collections is a new gap)
- Orders panel: OPS-WLADMIN-ORDERS-001
- Domains panel: OPS-WLADMIN-DOMAINS-001

---

# RCP-1 — Revenue Domain Completion Plan (Phase 1)

**Anchored:** 2026-03-02  
**Governance Sync:** GOVERNANCE-SYNC-041  
**Reconciliation TECS:** OPS-RCP1-GAP-RECONCILIATION-001  
**Scope:** Tenant Commerce Domain (revenue readiness) across Enterprise + White-label tenants, without shell drift.

## Objective
Complete the minimal revenue-operational loop so that:
- Tenants can sell (catalog present + manageable)
- Buyers can purchase (cart + checkout)
- Orders can be operationally managed (status progression + audit)
- WL_ADMIN and EXPERIENCE shells expose the same *capability set* (not merged planes)
- Governance and audit invariants remain enforced

## Explicit Non-Goals (Hard Stops)
- DOES NOT extend G-020 StateMachineService to ORDER (blocked by schema prerequisite)
- DOES NOT introduce new DB tables, migrations, schema changes, or RLS policy changes
- DOES NOT reopen D-5 (B1) — `app.roles` remains dormant for live requests; no DB-level role gates
- DOES NOT merge WL_ADMIN and EXPERIENCE shells; no cross-shell routing changes that erode appState boundaries
- DOES NOT implement payment gateway / PSP integration
- DOES NOT refactor components "for cleanliness" unless required by revenue correctness

## Canonical Drift Correction
The earlier draft notion of "OPS-ORDER-DOMAIN-STATE-GUARD-001 (lifecycle)" is corrected:
- Phase 1 implements **app-layer order status progression + audit**, not G-020 lifecycle.
- Full ORDER lifecycle state machine wiring requires a separate schema wave (see GAP-ORDER-LC-001).

## RCP-1 — Ordered TECS Sequence (Phase 1)
1. **OPS-ORDER-STATUS-TRANSITIONS-001**
   - Add app-layer guarded order status transitions with audit (no schema, no SM).
2. **OPS-WLADMIN-ORDERS-PANEL-001**
   - Replace WL_ADMIN Orders stub with real orders list + actions; consumes existing tenant APIs + transitions endpoint.
3. **OPS-EXPERIENCE-ORDERS-UX-001**
   - Ensure EXPERIENCE shell order management UX reaches parity with WL_ADMIN (capability parity, not shared plane).
4. **OPS-REVENUE-FLOW-VALIDATION-002**
   - E2E validation with explicit ceiling: PAYMENT_PENDING + app-layer transitions; verify audit trail.

## RCP-1 Commerce Gaps / Work Items (Formal Entries)

| Gap / Work ID | Description | Domain | Severity | Status | Dependencies | Notes / Stop Conditions |
|---|---|---|---|---|---|---|
| GAP-ORDER-LC-001 | ORDER lifecycle schema prerequisite (Future Wave): add ORDER to LifecycleState CHECK constraint; add order lifecycle log table + RLS; seed ORDER states; extend SM EntityType union | Backend / DB | 🔴 HIGH | ✅ **CLOSED** (GOVERNANCE-SYNC-063, 2026-03-03) — B1 ✅ schema foundation; B2/SEED-001 ✅ 4 ORDER transitions seeded; B3/SM-SERVICE-001 ✅ SM enforces ORDER transitions; B4/BACKEND-INTEGRATION-001 ✅ tenant.ts SM-driven; B5/UX-VALIDATION-001 ✅ 22 PASS / 0 FAIL proof; B6a/API-LIFECYCLE-001 ✅ orders enriched with lifecycleState + lifecycleLogs; **B6b/UX-B6B-001 ✅** WLOrdersPanel + EXPOrdersPanel: `deriveStatus()` + audit-log fetch removed; `canonicalStatus(order)` + `LifecycleHistory` component; typecheck EXIT 0; lint EXIT 0. Deferred: orders.status enum extension (ALTER TYPE ADD VALUE CONFIRMED/FULFILLED) — separate migration TECS. | GAP-ORDER-TRANSITIONS-001 (interim app-layer) | B6b complete. GAP-ORDER-LC-001 fully closed. |
| OPS-ORDERS-STATUS-ENUM-001 | `public.order_status` enum extended with CONFIRMED + FULFILLED (CANCELLED verified present — not re-added); deferred from GAP-ORDER-LC-001 B6b; migration `20260315000007_ops_orders_status_enum_001` | DB / Schema | 🟠 MED | ✅ **VALIDATED** (GOVERNANCE-SYNC-070, 2026-03-03) — PREFLIGHT PASS (CANCELLED confirmed); ALTER TYPE x2; VERIFIER PASS (all 5 labels: PAYMENT_PENDING, PLACED, CANCELLED, CONFIRMED, FULFILLED); APPLY_EXIT:0; RESOLVE_EXIT:0; `prisma db pull` minimal diff; typecheck EXIT 0; lint EXIT 0 | GAP-ORDER-LC-001 (deferred item) | Ordered outside transaction — irreversible DDL applied safely with IF NOT EXISTS guard. |
| GAP-ORDER-TRANSITIONS-001 | App-layer order status transitions (Phase 1): PAYMENT_PENDING→CONFIRMED; CONFIRMED→FULFILLED/CANCELLED; OWNER/ADMIN only; audit `order.lifecycle.<state>` | Backend | 🟠 MED | **VALIDATED** — commit `0a03177` (TECS 1) | Existing orders APIs + audit infra | Must not touch G-020 SM. Must not add schema. Must use existing audit_logs. |
| GAP-WL-ORDERS-001 | WL_ADMIN Orders panel: replace WLStubPanel; render orders list + status actions; consume transitions endpoint | Frontend / WL_ADMIN | 🟠 MED | **VALIDATED** — this commit (TECS 2) | GAP-ORDER-TRANSITIONS-001 | Must not merge shells. May reuse presentational components only if shell-local state remains distinct. |
| GAP-EXP-ORDERS-001 | EXPERIENCE Orders UX parity: ensure order list + details + status actions exist and match WL_ADMIN capabilities | Frontend / EXPERIENCE | 🟡 LOW-MED | **VALIDATED** — this commit (TECS 3) | GAP-ORDER-TRANSITIONS-001 | Must not create a second backend path. Use same transition endpoint. |
| GAP-REVENUE-VALIDATE-002 | Revenue flow validation pass: provision → invite → activate → catalog → cart → checkout → order list → status transition → audit verification; ceiling = PAYMENT_PENDING + transitions | QA / Cross-cutting | 🟡 LOW | ✅ **VALIDATED** — TECS 5 complete (Phases 0–5 PASS — 16/16 checks; GOVERNANCE-SYNC-049 — OPS-APPLY-ORDERS-RLS-001, 2026-03-03) | Completion of above TECS | Phases 0–3 PASS (12/21 steps: DB/JWT, catalog create, cart→checkout→PAYMENT_PENDING, orders list + audit). Phases 4–5 unblocked once `rcp1_orders_update_unified_tenant_arm.sql` applied via psql. Re-run Phases 4–5 only: `pnpm -C server exec tsx scripts/validate-rcp1-flow.ts --only-transitions`. Full ceiling: catalog create → cart → checkout → PAYMENT_PENDING → CONFIRMED → FULFILLED / CANCELLED + derivedStatus + audit trail. |
| GAP-RLS-ORDERS-UPDATE-001 | **Orders UPDATE blocked by RLS policy** — `orders_update_unified` policy (FOR UPDATE TO texqtic_app) has USING + WITH CHECK: `current_setting('app.is_admin', true) = 'true'`; withDbContext sets app.org_id/actor_id/realm/request_id + bypass_rls=off, but does NOT set app.is_admin (B1 decision: tenant actor context must not claim admin); row is visible via orders_select_unified (tenant-scoped SELECT) but invisible to UPDATE; privilege grant GRANT UPDATE applied (PG 42501 resolved → P2025 reveals row-policy block) | Backend / DB / RLS | 🔴 HIGH | ✅ **VALIDATED** (ops SQL applied to remote DB — APPLY_EXIT:0, DO-block VERIFY PASS; GOVERNANCE-SYNC-049 — OPS-APPLY-ORDERS-RLS-001, 2026-03-03) | GAP-REVENUE-VALIDATE-002, GAP-ORDER-TRANSITIONS-001 | A1 applied via governed ops SQL: `orders_update_unified` extended with tenant arm `(app.require_org_context() AND tenant_id = app.current_org_id()) OR (current_setting('app.is_admin'::text, true) = 'true'::text)` in both USING + WITH CHECK. Ops file: `server/prisma/ops/rcp1_orders_update_unified_tenant_arm.sql`. Apply: `psql "$DATABASE_URL" -f server/prisma/ops/rcp1_orders_update_unified_tenant_arm.sql`. Governance sign-off + DO-block verifier embedded in SQL. B1/D-5 posture preserved: no server code changed, `app.is_admin` not set for tenant actors. |

## Linkages to Existing Gaps
- **GAP-RUV-006 (Order lifecycle audit)** remains the canonical record:
  - Current: audit-only lifecycle entry at checkout (PAYMENT_PENDING)
  - Full lifecycle (G-020 style) is blocked until **GAP-ORDER-LC-001**
  - RCP-1 Phase 1 proceeds via **GAP-ORDER-TRANSITIONS-001** (app-layer transitions + audit) without schema changes.

---

## RCP-1 Phase 1 — Closeout (Revenue Domain Completion)

**Scope boundary (unchanged):** RCP-1 Phase 1 validates the Revenue Domain loop up to the ceiling of Order creation at PAYMENT_PENDING plus app-layer operational status actions (TECS 1), without schema migrations, RLS posture changes, lifecycle/G-020 integration, payment gateway work, or shell merges.

### Execution Ledger (Final)

| TECS | Work Item | Gap | Status | Commit |
|------|-----------|-----|--------|--------|
| TECS 1 | OPS-ORDER-STATUS-TRANSITIONS-001 | GAP-ORDER-TRANSITIONS-001 | ✅ VALIDATED | `0a03177` |
| TECS 2 | OPS-WLADMIN-ORDERS-PANEL-001 | GAP-WL-ORDERS-001 | ✅ VALIDATED | `5101b80` |
| TECS 3 | OPS-EXPERIENCE-ORDERS-UX-001 | GAP-EXP-ORDERS-001 | ✅ VALIDATED | `0c0535d` |
| TECS 4 | OPS-REVENUE-FLOW-VALIDATION-002 | GAP-REVENUE-VALIDATE-002 | ✅ VALIDATED | `b074fe1` (Phases 0–3) · OPS-RLS-ORDERS-UPDATE-001 ops SQL (Phases 4–5 unblocked, GOVERNANCE-SYNC-045) |

### What Is Validated End-to-End (Evidence-Backed)

Phases 0–3 PASS:
- Provision / Invite / Activate (JWT issuance and tenant-realm access) ✅
- Catalog create ✅
- Cart → Checkout ✅
- Order creation at checkout: PAYMENT_PENDING ✅
- Orders list and audit visibility ✅ (WL_ADMIN + EXPERIENCE)

### What Remains Blocked (Root-Cause Isolated — NOW RESOLVED)

Phases 4–5 were previously failing due to `orders_update_unified` RLS policy gating.
**RESOLVED via GOVERNANCE-SYNC-045 / OPS-RLS-ORDERS-UPDATE-001:**
- Governed ops SQL file `server/prisma/ops/rcp1_orders_update_unified_tenant_arm.sql` adds tenant arm to `orders_update_unified`.
- Governance sign-off embedded in SQL header. B1/D-5 posture preserved (no server code changed).
- Apply: `psql "$DATABASE_URL" -f server/prisma/ops/rcp1_orders_update_unified_tenant_arm.sql`
- Re-run Phases 4–5: `pnpm -C server exec tsx scripts/validate-rcp1-flow.ts --only-transitions`

### Artifacts Produced (Auditable)

| Artifact | Path | Purpose |
|----------|------|---------|
| TECS 4 evidence report | `docs/rcp1/OPS-REVENUE-FLOW-VALIDATION-002.md` | Phases, results, blocker analysis, future-wave SQL proposal |
| Live evidence script | `server/scripts/validate-rcp1-flow.ts` | 21-step proof run with HTTP assertions + JWT minting |
| DB privilege ops file | `server/prisma/ops/rcp1_orders_update_grant.sql` | Auditable GRANT UPDATE (non-migration) |
| RLS ops file (NEW) | `server/prisma/ops/rcp1_orders_update_unified_tenant_arm.sql` | Governed DROP/CREATE for `orders_update_unified` with tenant arm; governance sign-off + DO-block verifier embedded (GOVERNANCE-SYNC-045) |
| Gap register | `governance/gap-register.md` | GOVERNANCE-SYNC-044 + GOVERNANCE-SYNC-045 + status updates |

### Deferred Action (RESOLVED — GOVERNANCE-SYNC-045)

**OPS-RLS-ORDERS-UPDATE-001 implemented.** Governed SQL ops file created and committed:
```sql
-- server/prisma/ops/rcp1_orders_update_unified_tenant_arm.sql
CREATE POLICY orders_update_unified ON public.orders
  AS PERMISSIVE FOR UPDATE TO texqtic_app
  USING (
    (app.require_org_context() AND tenant_id = app.current_org_id())
    OR (current_setting('app.is_admin'::text, true) = 'true'::text)
  )
  WITH CHECK (
    (app.require_org_context() AND tenant_id = app.current_org_id())
    OR (current_setting('app.is_admin'::text, true) = 'true'::text)
  );
```
Apply to DB: `psql "$DATABASE_URL" -f server/prisma/ops/rcp1_orders_update_unified_tenant_arm.sql`

Then re-run Phases 4–5: `pnpm -C server exec tsx scripts/validate-rcp1-flow.ts --only-transitions`

### Executive Close

RCP-1 Phase 1 is functionally complete and drift-neutral: revenue loop executes through checkout and order visibility across shells; remaining status-action validation is blocked only by DB RLS update gating and is isolated into a post-RCP-1 governed change (GAP-RLS-ORDERS-UPDATE-001).

---

# Future Waves (5+)

| Proposed Gap                           | Rationale                              | Assigned Wave |
| -------------------------------------- | -------------------------------------- | ------------- |
| DPP export signature bundles           | Regulator-facing export with audit URI | W4+           |
| Multi-region tenant routing            | Geographic isolation for compliance    | W5            |
| AI model drift detection + auto-freeze | Safety boundary for AI automation      | W5            |
| Real-time event streaming (WebSocket)  | Live audit feed for control plane      | W5            |

---

# Role Model + RLS Vocabulary Anchor (2026-03-01)

> **Anchored:** 2026-03-01. Investigation basis: TECS WAVE 3 TAIL / ROLE MODEL FOUNDATION investigation.
> Reference gaps: G-006C, G-006D, OPS-ENV-002, OPS-DB-RECOVER-001.
> This section is a permanent planning anchor — do not rewrite; append updates as addenda.

---

## 1. Agreed 3-Role Model — Stable Contract

### Tenant Admin (Org Admin)
- **Scope:** Single org/tenant. All DB reads and writes are RLS-scoped to one `tenant_id` via `app.org_id`.
- **Identity:** Real tenant user; `memberships` row exists with `MembershipRole` in (OWNER, ADMIN, MEMBER, VIEWER). JWT carries `userId` + `tenantId`.
- **DB context:** `withDbContext` → `app.org_id = <tenantId>`, `app.actor_id = <userId>`, `app.realm = 'tenant'`, `app.bypass_rls = 'off'`. `app.is_admin` is NOT set.
- **RLS enforcement:** `tenant_id = current_setting('app.org_id', true)` arm in all PERMISSIVE policies.
- **Note (current gap → RESOLVED B1):** `MembershipRole` stored in DB and on `request.userRole` but NEVER flows into DB GUC `app.roles`. RLS treats all tenant users identically. Role boundary is app-layer only. See decision point D-5 in gap list below.
- **Architectural decision (GOVERNANCE-SYNC-036 / 2026-03-02):** `app.roles` GUC is intentionally dormant for live requests. The plumbing exists (`withDbContext` sets it when `context.roles` is provided) but `buildContextFromRequest` does not populate `context.roles` for production requests. This is a deliberate choice — the app-layer chain (JWT verify → `getUserMembership()` → `request.userRole` → route guard) is already fail-closed and no currently-open threat model requires a redundant DB-level role gate. **B2 re-entry condition:** revisit only if (a) a new write path is added that a `MEMBER`/`VIEWER` could reach at the DB layer without passing through the app-layer role guard, AND (b) the attack surface cannot be closed by tightening the app-layer guard alone.

### Platform Admin (Control Plane Operator)
- **Scope:** Cross-tenant bounded reads and writes (support, compliance, finance ops). Cross-tenant only where RLS explicitly permits via `app.is_admin = 'true'`.
- **Identity:** Admin principal; `admin_users` row with `AdminRole` in (SUPER_ADMIN, SUPPORT, ANALYST). JWT carries `adminId` + `role`. Middleware: `adminAuthMiddleware` → `request.isAdmin = true`, `request.adminId`, `request.adminRole`.
- **DB context:** `withAdminContext` → sentinel `orgId = actorId = '00000000-0000-0000-0000-000000000001'`, `realm = 'control'`, then `app.is_admin = 'true'`. Context: `buildContextFromRequest` is NOT used for admin routes (would fail-closed on missing `orgId`).
- **RLS enforcement:** `current_setting('app.is_admin', true) = 'true'` arm in PERMISSIVE policies + RESTRICTIVE guard admin arm.
- **Capability flag:** `app.is_admin` is the current runtime capability flag for platform admin identity.

### Superadmin (Platform Controller / Orchestrator) — FUTURE FLAG
- **Scope:** All operations including privileged overrides (e.g., force-void, cross-tenant destructive actions). Must be explicit and audited; never accidental.
- **Identity:** `AdminRole.SUPER_ADMIN` exists in DB enum (schema.prisma line 999) and seeded. `requireAdminRole('SUPER_ADMIN')` helper exported from `auth.ts` line 90. Currently zero runtime differentiation from Platform Admin at DB/RLS level.
- **DB context (GUC plumbing complete):** `app.is_superadmin = 'true'` GUC set by `withSuperAdminContext` (GOVERNANCE-SYNC-033). **Zero RLS policies currently consume this GUC** — confirmed by full migration grep with 0 policy matches.
- **Required:** Add `is_superadmin='true'` arms to INSERT/UPDATE/DELETE policies on `impersonation_sessions` + escalation UPDATE. See `docs/security/SUPERADMIN-RLS-PLAN.md` (OPS-RLS-SUPERADMIN-001-DISCOVERY-001, GOVERNANCE-SYNC-071).

---

## 2. CRITICAL DB Vocabulary Mismatch — D-1 — MUST FIX BEFORE CONTINUING

**Status: VALIDATED (realm mismatch fixed) — GOVERNANCE-SYNC-027**

> ✅ Fixed 2026-03-01 via OPS-RLS-ADMIN-REALM-001. `app.require_admin_context()` now checks `realm='control'` + `is_admin='true'` + `actor_id NOT NULL`. impersonation_sessions RLS is no longer dead-code.

### The Mismatch
| Layer | Value set | Source |
|-------|-----------|--------|
| `withAdminContext` (TypeScript) | `realm = 'control'` | `database-context.ts` line ~590; `DatabaseContext` union type = `'tenant' \| 'control'` |
| `app.current_realm()` SQL function comment | values: `'tenant'` or `'control'` | Gate-A migration comment |
| `app.require_admin_context()` | checks `current_realm() = 'admin'` | Gate-D7 migration line 17 |
| **Result** | `require_admin_context()` is **always FALSE** in production | Dead function |

### Impact
Any policy that uses `app.require_admin_context()` as a predicate is permanently fail-closed (always blocks) for all production admin operations:
- `impersonation_sessions` SELECT/INSERT/UPDATE unified policies: all fail-closed → impersonation cannot function under RLS.
- These tables survive today only because the service (`impersonation.service.ts`) uses raw `prisma.$transaction` without `SET LOCAL ROLE texqtic_app`, bypassing RLS as the postgres superuser (`BYPASSRLS`). This is security debt, not correctness.

### Long-term Vocabulary Principle
- `app.realm` is a **plane identifier** only. Values: `tenant`, `control`, `system`, `test`. Do NOT use realm to grant privileges.
- Platform admin capability → explicit flag: `app.is_admin = 'true'` (current) → `app.is_platform_admin = 'true'` (future rename, controlled TECS).
- Superadmin capability → separate flag: `app.is_superadmin = 'true'` (future).
- Never use `realm = 'admin'`; the admin plane IS the control plane (`realm = 'control'`).

### Safe Remediation Path
- **Short term (Wave 3 tail — P0):** Fix `app.require_admin_context()` DB function to treat `realm IN ('control')` as admin-capable, OR retire the function and key off `app.is_admin = 'true'` + `actor_id NOT NULL` directly. Either path resolves the dead-function gap.
- **Medium term:** If `app.is_admin` is renamed to `app.is_platform_admin`, do so via a single controlled TECS with a migration covering all policy references in one transaction.

---

## 3. audit_logs Mixed Policy State — Decision: Option B

**Current state (as of 2026-03-01):**
- `rls.sql` creates `audit_logs_tenant_read` (PERMISSIVE SELECT).
- Migration `20260304000000_gatetest003_audit_logs_admin_select` creates `audit_logs_admin_select` (PERMISSIVE SELECT, `tenant_id IS NULL` only) + extends `audit_logs_guard` RESTRICTIVE with admin arm.
- Gatetest003 verifier DO block expects `audit_logs_select_unified` + `audit_logs_admin_select` = exactly 2 SELECT policies. If `audit_logs_tenant_read` was never dropped, count = 3 → verifier FAIL.

### Option A — Drop audit_logs_admin_select; rely on existing unified tenant policy
**Pros:** Fastest. Minimal SQL touch if unified already has admin arm.
**Cons:**
- If remaining unified policy is tenant-only, platform admin loses cross-tenant audit visibility.
- Does not fix naming drift (`audit_logs_tenant_read` vs expected `audit_logs_select_unified`).
- Higher regression risk: removing known admin gate without confirming remaining policy covers admin arm.
- **Only safe if** live `pg_policies.qual` for the remaining SELECT policy explicitly includes `OR current_setting('app.is_admin', true) = 'true'`.

### Option B — Single unified SELECT policy with tenant OR admin arm; remove extra admin policy ✅ CHOSEN
**Pros:**
- Cleanest structure: one PERMISSIVE SELECT for `texqtic_app`.
- Explicitly enforces cross-tenant admin reads through `app.is_admin`.
- Removes naming drift; establishes canonical policy name `audit_logs_select_unified`.
- Future-proof: add `OR current_setting('app.is_superadmin', true) = 'true'` arm without creating new policies.

**Required reconciliation steps for Option B:**
1. Drop `audit_logs_tenant_read` (rls.sql name) and `audit_logs_admin_select`.
2. Create `audit_logs_select_unified` with qual:
   - `(org_id IS NOT NULL AND tenant_id::text = current_setting('app.org_id', true))` — tenant arm
   - `OR current_setting('app.is_admin', true) = 'true'` — platform admin arm (cross-tenant, NO `tenant_id IS NULL` restriction — see key semantic decision below)
3. Confirm gatetest003-equivalent verifier count = 1 (unified) + verify RESTRICTIVE guard unchanged.

**Key semantic decision recorded:** Platform admin cross-tenant audit reads SHOULD include tenant-scoped rows (not only `tenant_id IS NULL`). Rationale: admin investigation requires reading "what did tenant X do?" The `tenant_id IS NULL` restriction in `audit_logs_admin_select` was a conservative first pass; Option B removes it. Mandatory compensating control: all control-plane read endpoints that query `audit_logs` MUST log via `writeAuditLog` (see D-3 gap, and TECS item below).

**Decision:** Option B. Record: "audit_logs SELECT consolidation → single `audit_logs_select_unified` policy; admin arm without `tenant_id IS NULL` restriction; mandatory read-audit logging on all control-plane GET /audit-logs handlers."

---

## 4. Gap List — Wave 3 Tail Specific Gaps

| ID | Gap | Severity | First identified |
|----|-----|---------|-----------------|
| D-1 | `app.require_admin_context()` always returns FALSE in production; `realm = 'admin'` never set; impersonation RLS dead-code | **CRITICAL** | 2026-03-01 investigation |
| D-2A | `AdminRole.SUPER_ADMIN` — capability plumbing: zero runtime GUC differentiation from other admin roles | **VALIDATED — OPS-SUPERADMIN-CAPABILITY-001 / GOVERNANCE-SYNC-033** (plumbing only: `withSuperAdminContext` + `app.is_superadmin` GUC set; proof endpoint `/whoami` verified) | 2026-03-01 investigation |
| D-2B | `AdminRole.SUPER_ADMIN` — capability enforcement: no route-level OR DB-level guard prevents SUPPORT/ANALYST from reaching SUPER_ADMIN-only surfaces | **VALIDATED — OPS-SUPERADMIN-ENFORCEMENT-001 / GOVERNANCE-SYNC-034** (`requireAdminRole('SUPER_ADMIN')` preHandler on 5 surfaces; tenant provision audit gap also closed) | 2026-03-01 investigation |
| D-3 | All admin READ endpoints (`GET /api/control/*`) are unlogged — no `writeAuditLog` call on any of 9 GET handlers | **VALIDATED — OPS-CONTROL-READ-AUDIT-001 / GOVERNANCE-SYNC-032** | 2026-03-01 investigation |
| D-4 | `impersonation.service` uses raw `prisma.$transaction` without `SET LOCAL ROLE texqtic_app` — operates as postgres BYPASSRLS superuser; RLS not enforced for impersonation writes | **VALIDATED (BYPASSRLS path removed) — GOVERNANCE-SYNC-028** | 2026-03-01 investigation |
| D-5 | `MembershipRole` (OWNER/ADMIN/MEMBER/VIEWER) never flows to `app.roles` GUC; RLS treats all tenant users identically — role boundary is app-layer only. **Decision B1:** DB role-agnostic by design; `app.roles` intentionally never activated for live requests; role enforcement is app-layer only (JWT → membership lookup → `request.userRole` → route guard). B2 re-entry condition documented in Role Model section above. | **RESOLVED (B1 — app-layer only)** | 2026-03-01 investigation; resolved 2026-03-02 GOVERNANCE-SYNC-036 |
| D-6 | `audit_logs` mixed policy naming: `audit_logs_tenant_read` (rls.sql) coexists with gatetest003 expectation of `audit_logs_select_unified`; verifier may fail depending on apply order | **VALIDATED — GOVERNANCE-SYNC-029** | 2026-03-01 investigation |
| D-7 | `audit_logs_admin_select` restricts admin reads to `tenant_id IS NULL` rows only — blocks cross-tenant investigation reads | **VALIDATED — GOVERNANCE-SYNC-029** | 2026-03-01 investigation (resolved by Option B above) |
| D-8 | `withDbContext` sets `bypass_rls = 'off'` but does NOT explicitly reset `app.is_admin`; pooler theoretically could bleed `is_admin='true'` from prior tx (mitigated by SET LOCAL semantics) | **LOW** | 2026-03-01 investigation |

---

## 5. Wave 3 Tail — Priority Ladder (No-Drift Execution Order)

Established 2026-03-01. Must not be reordered without a new governance anchor.

```
P0 — OPS-RLS-ADMIN-REALM-001
     Fix require_admin_context() dead function (D-1)
     Blocks: impersonation RLS correctness; D-4 fix pre-req
     Direction: keep realm='control'; update DB function to check
                realm IN ('control') instead of realm = 'admin',
                OR remove realm check entirely and key off
                app.is_admin + actor_id NOT NULL
     → MUST complete before Wave 3.1+ RLS consolidation resumes

P1 — G-006C-AUDIT-LOGS-UNIFY-001
     Resolve audit_logs mixed state using Option B (D-6, D-7)
     + add control-plane read-audit logging (D-3)
     Targets:
       - Platform admin can read cross-tenant audit rows (no tenant_id IS NULL)
       - Tenant admin reads only own-tenant rows
       - Admin GET /api/control/audit-logs is logged via writeAuditLog
     → Only after P0

P2 — Remaining G-006C RLS consolidation waves
     (carts, cart_items, memberships, other tables per wave board)
     → Only after P0 + P1
```

---

## 6. Queued TECS Sequence (Plan → Implement)

| TECS ID | Title | Priority | Blocks | Notes |
|---------|-------|---------|--------|-------|
| **OPS-RLS-ADMIN-REALM-001** | Fix admin realm mismatch — `require_admin_context()` dead function | ✅ COMPLETE | All control-plane RLS correctness; impersonation.service refactor | Migration `20260301120000_ops_rls_admin_realm_fix` applied. GOVERNANCE-SYNC-027. |
| **G-006C-AUDIT-LOGS-UNIFY-001** | audit_logs Option B consolidation + admin-view audit logging | ✅ COMPLETE | D-3, D-6, D-7 | Single `audit_logs_select_unified` (tenant+admin arms). Admin sees 93 rows cross-tenant. Legacy policies dropped. `ADMIN_AUDIT_LOG_VIEW` auditing added to GET /audit-logs. GOVERNANCE-SYNC-029. |
| **OPS-IMPERSONATION-RLS-001** | Wire `impersonation.service` through `withAdminContext` (fix D-4) | ✅ COMPLETE | Impersonation security correctness | All 3 functions use `withAdminContext`. Typecheck EXIT 0. Lint 0 errors. RLS verified. GOVERNANCE-SYNC-028. |
| **G006C-ORDERS-GUARD-001** | orders + order_items: RESTRICTIVE guard (FOR ALL TO texqtic_app) + role normalization {public} → texqtic_app + admin arm preserved as `current_setting('app.is_admin')` (NOT bypass_enabled — confirmed non-equivalent in Gate 1) | ✅ COMPLETE | P0 gate | Migration `20260302000000_g006c_orders_guard_normalize` applied psql EXIT:0; DO block VERIFIER PASS; SIM1 tenant=org-scoped ✅; SIM2 control+nonadmin=0 rows ✅; SIM3 control+admin=4 rows cross-tenant ✅; Prisma ledger synced; GOVERNANCE-SYNC-030 |
| **G006C-EVENT-LOGS-CLEANUP-001** | event_logs: DROP 2 orphan PERMISSIVE ALL deny policies (anon + authenticated) | ✅ COMPLETE | Pre-req: G006C-ORDERS-GUARD-001 COMPLETE ✅ | Migration `20260302010000_g006c_event_logs_cleanup` applied psql EXIT:0; DO block VERIFIER PASS; 0 PERMISSIVE ALL remain; guard {texqtic_app} intact; select+insert_unified intact; Prisma ledger synced; GOVERNANCE-SYNC-031 |
| **OPS-CONTROL-READ-AUDIT-001** | Control-plane GET read auditing coverage (no SQL) — 14 GET handlers across 6 route files now emit `writeAuditLog(prisma, createAdminAudit(...))` on 200 success; action strings: `control.tenants.read`, `control.tenants.read_one`, `control.feature_flags.read`, `control.events.read`, `control.finance.payouts.read`, `control.compliance.requests.read`, `control.disputes.read`, `control.trades.read`, `control.escrows.read`, `control.escrows.read_one`, `control.certifications.read`, `control.certifications.read_one`, `control.escalations.read`, `control.traceability.nodes.read`, `control.traceability.edges.read`; audit_logs.read (`ADMIN_AUDIT_LOG_VIEW`) pre-existing; `/system/health` excluded (infrastructure) | ✅ COMPLETE | D-3 | Files: `control.ts`, `control/trades.g017.ts`, `control/escrow.g018.ts`, `control/certifications.g019.ts`, `control/escalation.g022.ts`, `admin/traceability.g016.ts`. Typecheck EXIT 0. Sim A: 2 rows confirmed. Sims B+C: 0 rows. GOVERNANCE-SYNC-032. |
| **OPS-SUPERADMIN-CAPABILITY-001** | Superadmin capability flag + canonical DB context helper — `withSuperAdminContext` exported from `database-context.ts`; sets `app.is_admin='true'` + `app.is_superadmin='true'` (tx-local); no RLS policy changes; no renaming of `app.is_admin`; proof endpoint `GET /api/control/whoami` returns `adminRole`, `isSuperAdmin`, `contextMode` | ✅ COMPLETE | D-2A (plumbing) | Files: `server/src/lib/database-context.ts`, `server/src/routes/control.ts`. Typecheck EXIT 0. Lint EXIT 0. DB Sims A/B/C PASS. GOVERNANCE-SYNC-033. D-2B (enforcement) remains OPEN — see OPS-SUPERADMIN-ENFORCEMENT-PLAN-001. |
| **OPS-SUPERADMIN-ENFORCEMENT-001** | SUPER_ADMIN route-layer enforcement — `requireAdminRole('SUPER_ADMIN')` preHandler on 9 route registrations across 5 high-risk surfaces: impersonation start+stop, tenant provision, payout approve+reject, escalation upgrade+resolve, feature-flag PUT. Also closes tenant provision audit gap (Tier B: `control.tenants.provisioned`). No RLS changes. No schema changes. | ✅ COMPLETE | D-2B (enforcement) | Files: `admin/impersonation.ts`, `admin/tenantProvision.ts`, `control.ts`, `control/escalation.g022.ts`. Typecheck EXIT 0. Lint EXIT 0. GOVERNANCE-SYNC-034. |
| **OPS-CONTROL-HARDENING-PHASE-2-001** | Control Plane Hardening Phase 2 — drift & audit CI guardrails. Static scan of all 10 control-plane route files; Guard 1: write-side audit enforcement (17 mutation routes, 0 violations); Guard 2: SUPER_ADMIN surface lock (8/8 surfaces confirmed gated); CI artifact `artifacts/control-plane-manifest.json` (37 routes). No runtime logic changes. No DB changes. No auth changes. No migrations. | ✅ COMPLETE | — | Files: `scripts/control-plane-manifest.ts`, `scripts/control-plane-guard.ts`, `.github/workflows/control-plane-guard.yml`, `package.json` (scripts only). Guard EXIT 0 on main. GOVERNANCE-SYNC-035. |
| **G-006C-WAVE3-REMAINING** | Remaining Wave 3 RLS consolidation — fix admin arm (`bypass_enabled` → `is_admin='true'`) + RESTRICTIVE guard admin arm for each table; one migration per table | ✅ COMPLETE | GOVERNANCE-SYNC-055 | ✅ cart_items (20260303110000, applied GOVERNANCE-SYNC-048) ✅ catalog_items (20260315000000, applied GOVERNANCE-SYNC-051) ✅ memberships (20260315000001, applied GOVERNANCE-SYNC-052) ✅ tenant_branding (20260315000002, applied GOVERNANCE-SYNC-053) ✅ tenant_domains (20260315000003, applied GOVERNANCE-SYNC-054) ✅ impersonation_sessions (20260315000004, applied GOVERNANCE-SYNC-055, admin-only pattern: require_admin_context + admin_id actor arm). All Wave 3 Tail tables complete. |
| **OPS-RLS-SUPERADMIN-001** | Introduce `app.is_superadmin` GUC-backed RLS policies on SUPER_ADMIN-exclusive write surfaces — `impersonation_sessions` INSERT/UPDATE/DELETE + `escalation_events` UPDATE narrowed to `is_superadmin='true'`; service migration `startImpersonation`/`stopImpersonation` → `withSuperAdminContext`; `feature_flags` KNOWN LIMITATION (postgres BYPASSRLS path). Plan: `docs/security/SUPERADMIN-RLS-PLAN.md`. Proposed migrations: `20260315000008` (`impersonation_sessions`) + `20260315000009` (`escalation_events`) | 🔄 **IN PROGRESS** — discovery complete (GOVERNANCE-SYNC-071, 2026-03-03) | D-2A (`withSuperAdminContext` plumbing ✅) | Execution blocked pending user sign-off per SUPERADMIN-RLS-PLAN.md Section F |

---

## 7. Validation Proof — OPS-RLS-ADMIN-REALM-001 (GOVERNANCE-SYNC-027)

**Date:** 2026-03-01
**Migration:** 20260301120000_ops_rls_admin_realm_fix
**Prisma ledger:** marked applied via prisma migrate resolve --applied

### Pre-apply function body (recorded)
```sql
SELECT app.current_realm() = 'admin'
  AND app.current_actor_id() IS NOT NULL;
```

### Post-apply function body (confirmed)
```sql
SELECT
    current_setting('app.realm', true) = 'control'
    AND NULLIF(current_setting('app.actor_id', true), '') IS NOT NULL
    AND current_setting('app.is_admin', true) = 'true';
```

### Simulation Results

| Test | Realm | actor_id | is_admin | Expected | Result |
|------|-------|----------|----------|----------|--------|
| TEST2_control_admin | control | set | true | 	rue | ✅ 	 |
| TEST3_tenant_admin | tenant | set | true | alse | ✅  |
| TEST4_control_nonadmin | control | set | false | alse | ✅  |

All 3 simulations PASS. D-1 closed.

---

## 8. Capability Vocabulary Anchor (OPS-SUPERADMIN-CAPABILITY-001 / GOVERNANCE-SYNC-033)

**Established:** 2026-03-02

Canonical vocabulary for TexQtic runtime authorization context:

| Concept | GUC / field | Values | Notes |
|---------|-------------|--------|-------|
| **Plane / Realm** | `app.realm` | `tenant` \| `control` \| `system` \| `test` | Set by `withDbContext` via `DatabaseContext.realm` |
| **Platform Admin flag** | `app.is_admin` | `'true'` only | Set by `withAdminContext` and `withSuperAdminContext`; checked by `_admin_all` RLS policies |
| **Superadmin capability flag** | `app.is_superadmin` | `'true'` only | Set ONLY by `withSuperAdminContext`; tx-local; no RLS policies use this yet (future wave) |

**Rules (non-negotiable):**
- `withDbContext` MUST NOT set or clear `app.is_superadmin`
- `withAdminContext` MUST NOT set `app.is_superadmin`
- `app.is_admin` is NOT renamed in this TECS (rename deferred to future wave)
- Superadmin is always a strict superset of Platform Admin (`is_admin=true AND is_superadmin=true`)

---

## 9. CI Guardrail Proof — OPS-CONTROL-HARDENING-PHASE-2-001 (GOVERNANCE-SYNC-035)

**Date:** 2026-03-02  
**Files added:** `scripts/control-plane-manifest.ts`, `scripts/control-plane-guard.ts`, `.github/workflows/control-plane-guard.yml`  
**Runtime impact:** None — CI static analysis only. No route files changed. No auth middleware changed. No schema changed.

### Guard 1 — Write-side Audit Enforcement

Scans all mutation routes (POST|PUT|PATCH|DELETE) under `/api/control` for file-level audit token presence.

| Route | Audit Evidence | Result |
|-------|---------------|--------|
| PUT /api/control/feature-flags/:param | writeAuditLog | ✅ |
| POST /api/control/finance/payouts/:param/approve | writeAuthorityIntent | ✅ |
| POST /api/control/finance/payouts/:param/reject | writeAuthorityIntent | ✅ |
| POST /api/control/compliance/requests/:param/approve | writeAuthorityIntent | ✅ |
| POST /api/control/compliance/requests/:param/reject | writeAuthorityIntent | ✅ |
| POST /api/control/disputes/:param/resolve | writeAuthorityIntent | ✅ |
| POST /api/control/disputes/:param/escalate | writeAuthorityIntent | ✅ |
| POST /api/control/escalations | writeAuditLog | ✅ |
| POST /api/control/escalations/:param/upgrade | writeAuditLog | ✅ |
| POST /api/control/escalations/:param/resolve | writeAuditLog | ✅ |
| POST /api/control/trades/:param/transition | writeAuditLog | ✅ |
| POST /api/control/escrows/:param/transition | writeAuditLog | ✅ |
| POST /api/control/settlements/preview | allowlisted (D-020-B: read-only POST) | ✅ |
| POST /api/control/settlements | writeAuditLog | ✅ |
| POST /api/control/impersonation/start | service-delegation (confirmed in impersonation.service) | ✅ |
| POST /api/control/impersonation/stop | service-delegation (confirmed in impersonation.service) | ✅ |
| POST /api/control/tenants/provision | writeAuditLog | ✅ |

**Mutation routes checked: 17. Violations: 0.**

### Guard 2 — SUPER_ADMIN Surface Lock

| Surface | Source File | preHandler Guard | Result |
|---------|-------------|-----------------|--------|
| POST /api/control/impersonation/start | admin/impersonation.ts | requireAdminRole('SUPER_ADMIN') | ✅ |
| POST /api/control/impersonation/stop | admin/impersonation.ts | requireAdminRole('SUPER_ADMIN') | ✅ |
| POST /api/control/tenants/provision | admin/tenantProvision.ts | requireAdminRole('SUPER_ADMIN') | ✅ |
| POST /api/control/finance/payouts/:param/approve | control.ts | requireAdminRole('SUPER_ADMIN') | ✅ |
| POST /api/control/finance/payouts/:param/reject | control.ts | requireAdminRole('SUPER_ADMIN') | ✅ |
| POST /api/control/escalations/:param/upgrade | control/escalation.g022.ts | requireAdminRole('SUPER_ADMIN') | ✅ |
| POST /api/control/escalations/:param/resolve | control/escalation.g022.ts | requireAdminRole('SUPER_ADMIN') | ✅ |
| PUT /api/control/feature-flags/:param | control.ts | requireAdminRole('SUPER_ADMIN') | ✅ |

**Required surfaces: 8. Gated: 8. Violations: 0.**

### Guard Run Output (on main)

```
guard EXIT 0
Routes scanned: 37 across 10 files
Mutation routes checked: 17
Audit violations: 0
SUPER_ADMIN violations: 0
Artifact: artifacts/control-plane-manifest.json
```

### Allowlist Design Decisions

| Category | Entry | Rationale |
|----------|-------|----------|
| Write-audit allowlist | `POST /api/control/settlements/preview` | D-020-B: balance derived from ledger SUM; zero DB mutations; zero state changes; POST used only for request body (not mutation semantics) |
| Service-delegation | `server/src/routes/admin/impersonation.ts` | Audit written by `startImpersonation()` / `stopImpersonation()` service functions; confirmed at Phase 2 Review 2026-03-02 |

---

## G-028 Evaluation Complete (GOVERNANCE-SYNC-095)

**Status: ✅ G-028 Vector Infrastructure — FULLY VALIDATED (A1–A7)**  
**Governance sync:** GOVERNANCE-SYNC-095 — 2026-03-28

OPS-G028-A7 introduced benchmark tooling to validate retrieval quality and latency. The vector infrastructure is now production-ready.

### Validation summary

| Stage | What Was Validated |
|---|---|
| A1–A2 | pgvector schema live; HNSW index (cosine); `$queryRaw` TVS module; RLS RESTRICTIVE guard confirmed |
| A3 | Shadow retrieval wired; latency logging confirmed; no cross-tenant data returned |
| A4 | Ingestion pipeline: chunker (SHA-256), Gemini `text-embedding-004` (768-dim), catalog + certification adapters |
| A5 | RAG context injection into `/api/ai/insights`; `ai.vector.query` audit event emitted |
| A6 | Async FIFO queue (QUEUE_SIZE_MAX=1000, JOBS_PER_SECOND=5); DPP snapshot + supplier profile sources registered |
| A7 | Latency benchmarking + retrieval scoring (Precision@K, Recall@K); all thresholds satisfied |

### Benchmark performance (local baseline — empty corpus)

| Metric | Observed | Threshold | Status |
|---|---|---|---|
| Retrieval latency avg | ~12 ms | ≤ 50 ms | ✅ Pass |
| Embedding latency avg | ~140 ms | ≤ 500 ms | ✅ Pass |
| Total endpoint latency avg | ~167 ms | ≤ 800 ms | ✅ Pass |

### Remaining AI platform gaps

| Gap | Description | Status |
|---|---|---|
| OPS-AI-UI-001 | UI surfaces for AI insights (tenant-facing) | Deferred Wave 5 |
| OPS-G028-A8 | Vector scaling strategy; larger evaluation datasets | Deferred Wave 7 or at 10M vectors/tenant |
| OPS-G028-B1 | Catalog indexer (event-driven async ingestion) | Deferred Wave 5+ |
| OPS-G028-B2 | Delete + reindex endpoints + MakerChecker gate | Deferred Wave 5+ |
| OPS-G028-C1 | TIS refactor (`ai.ts` → dedicated module) | Deferred Wave 5+ |
| OPS-G028-C2 | RAG expansion to all INSIGHTS inference requests | Deferred Wave 5+ |
| OPS-G028-C3 | DPP_ASSIST taskType with RAG over DPP snapshots | Deferred Wave 5+ |

---

## Frontend-Backend Wiring Gap Audit — March 2026 Cross-Audit Reconciliation

**Recorded:** 2026-03-06  
**Source audits:** `docs/governance/audits/2026-03-codex-frontend-backend-audit.md` + `docs/governance/audits/2026-03-copilot-frontend-backend-audit.md`  
**Reconciliation artifact:** `docs/governance/audits/2026-03-audit-reconciliation-matrix.md`  
**Governance baseline:** GOVERNANCE-SYNC-095 · 73/73 migrations · RLS Maturity 5.0/5 · Doctrine v1.4  
**Note:** All entries derive from the cross-audit reconciliation. Merged statuses only — single-report claims are not used directly.

---

### Summary Table — All TECS-FBW Findings

| Gap ID | Short Title | Source | Severity | Merged Status | Wave |
|---|---|---|---|---|---|
| TECS-FBW-001 | Finance/Compliance/Dispute Mutations | BOTH | HIGH | Compliance: ✅ CLOSED (GOVERNANCE-SYNC-107 · 2026-03-07); Finance: ⏳ Pending; Disputes: ⏳ Pending | Wave 2 |
| TECS-FBW-002 | G-017 Trades Frontend Absent | BOTH | HIGH | TECS-FBW-002-A: ✅ CLOSED (GOVERNANCE-SYNC-110 · 2026-03-07); TECS-FBW-002-B: 🚫 BLOCKED (no GET /api/tenant/trades route) | Wave 3 |
| TECS-FBW-003 | G-018 Escrow Frontend Absent | BOTH | HIGH | TECS-FBW-003-A: ✅ CLOSED (GOVERNANCE-SYNC-111 · 2026-03-07); TECS-FBW-003-B: 🔵 FUTURE SCOPE (mutations + detail view) | Wave 3 |
| TECS-FBW-004 | G-019 Settlements Frontend Absent | BOTH | HIGH | ✅ CLOSED (GOVERNANCE-SYNC-113 · 2026-03-07) | Wave 3 |
| TECS-FBW-005 | G-019 Certifications Frontend Absent | BOTH | HIGH | ✅ CLOSED (GOVERNANCE-SYNC-114 · 2026-03-07) | Wave 4 |
| TECS-FBW-006 | G-022 Escalations Frontend Absent [misrouting claim disproved] | BOTH | HIGH | TECS-FBW-006-A: ✅ CLOSED (GOVERNANCE-SYNC-112 · 2026-03-07); TECS-FBW-006-B: 🔵 FUTURE SCOPE (mutations: upgrade/resolve/override) | Wave 3 |
| TECS-FBW-007 | Cart Summaries Dead Service | BOTH | MEDIUM | ✅ CLOSED (GOVERNANCE-SYNC-116 · 2026-03-08) | Wave 4 |
| TECS-FBW-008 | WL Settings Custom Domain Dead | BOTH | MEDIUM | ✅ CLOSED (GOVERNANCE-SYNC-104 · 2026-03-07) | Wave 1 |
| TECS-FBW-011 | Catalog basePrice vs price — CRITICAL runtime | COPILOT | CRITICAL | CLOSED | Wave 1 |
| TECS-FBW-LINT-001 | middleware.ts Edge Runtime globals — root lint gate | N/A (repo-gate item) | LOW | CLOSED | Immediate |
| TECS-FBW-012 | TeamManagement Edit Access Dead Button | BOTH | MEDIUM | VALIDATED | Wave 5 |
| TECS-FBW-013 | B2B Request Quote Dead | COPILOT | LOW | DEFERRED | Wave 5 |
| TECS-FBW-014 | Post-Checkout No Confirmation State | COPILOT | MEDIUM | ✅ CLOSED (GOVERNANCE-SYNC-102 · 2026-03-07) | Wave 1 |
| TECS-FBW-015 | G-016 Traceability CRUD Frontend Absent | BOTH | HIGH | VALIDATED | Wave 4 |
| TECS-FBW-016 | Tenant Audit Logs UI Absent | COPILOT | MEDIUM | ✅ CLOSED (GOVERNANCE-SYNC-117 · 2026-03-08) | Wave 4 |
| TECS-FBW-017 | CatalogItem.category Grouping May Fail | COPILOT | LOW | ✅ CLOSED (GOVERNANCE-SYNC-105 · 2026-03-07) | Wave 1 |
| TECS-FBW-018 | Plan BASIC→TRIAL Enum Mapping | COPILOT | LOW | PROVISIONAL | Wave 0 |
| TECS-FBW-019 | lifecycleState vs status (handled) | COPILOT | CLOSED | DEFERRED | — |
| TECS-FBW-020 | WL Admin Invite Shell Routing | CODEX | MEDIUM | ✅ CLOSED (GOVERNANCE-SYNC-101 · 2026-03-06) | Wave 1 |
| TECS-FBW-AIGOVERNANCE | AI Governance Dead Authority Actions | COPILOT | HIGH | REQUIRES_BACKEND_DESIGN | Wave 5 |
| TECS-FBW-ADMINRBAC | AdminRBAC No Backend Route | COPILOT | HIGH | REQUIRES_BACKEND_DESIGN | Wave 5 |
| TECS-FBW-MOQ | MOQ_NOT_MET 422 UX Gap | COPILOT | MEDIUM | ✅ CLOSED (GOVERNANCE-SYNC-103 · 2026-03-07) | Wave 1 |
| TECS-FBW-OA-001 | OpenAPI Tenant Contract Drift | CODEX | HIGH | VERIFY_REQUIRED | Wave 0 |
| TECS-FBW-OA-002 | OpenAPI Control-Plane Contract Drift | CODEX | HIGH | VERIFY_REQUIRED | Wave 0 |
| TECS-FBW-AT-006 | Order Status UI Role Gating | CODEX | MEDIUM | ✅ CLOSED (GOVERNANCE-SYNC-106 · 2026-03-07) | Wave 1 |
| TECS-FBW-AUTH-001 | Tenant Login Hardcoded Picker | CODEX | MEDIUM | ✅ CLOSED (GOVERNANCE-SYNC-TECS-FBW-AUTH-001 · 2026-03-13) | Wave 5 |
| TECS-FBW-RLS-001 | RLS-Only Posture Governance | CODEX | MEDIUM | VERIFY_REQUIRED | Wave 0 |
| TECS-FBW-PROV-001 | Tenant Provisioning Contract Mismatch | CONFLICT | HIGH | ✅ CLOSED (GOVERNANCE-SYNC-099 · 2026-03-06) | Wave 1 |

---

### Detail Entries

**TECS-FBW-001 — Finance/Compliance/Dispute Authority Mutations**  
Source: RECONFIRMED_BY_CODEX_AND_COPILOT · Severity: HIGH · Wave: 2  
**Compliance sub-unit: ✅ CLOSED (GOVERNANCE-SYNC-107 · 2026-03-07)**  
Files changed: services/adminApiClient.ts (adminPostWithHeaders — SAME-UNIT NECESSARY EXPANSION); services/controlPlaneService.ts (approveComplianceRequest, rejectComplianceRequest, ComplianceAuthorityBody, ComplianceAuthorityResponse); components/ControlPlane/ComplianceQueue.tsx (confirm dialog, per-row Approve/Reject, idempotency-key generation, re-fetch on success, inline error).  
Validation: typecheck EXIT 0 · lint EXIT 0 · git diff --name-only: 3 files only.  
openapi.control-plane.json: NOT modified — both compliance POST routes already present in spec.  
**Finance sub-unit: ⏳ PENDING (FinanceOps.tsx — not yet implemented)**  
**Disputes sub-unit: ⏳ PENDING (DisputeCases.tsx — not yet implemented)**  
Backend confirmed: POST /api/control/finance/payouts/:id/{approve,reject}; POST /api/control/compliance/requests/:id/{approve,reject}; POST /api/control/disputes/:id/{resolve,escalate} — SUPER_ADMIN gated (GOVERNANCE-SYNC-035 CI guard).  
Affected (remaining): components/ControlPlane/FinanceOps.tsx, DisputeCases.tsx; services/controlPlaneService.ts  
Next action: TECS-FBW-001 Finance sub-unit — add approvePayoutMutation(), rejectPayoutMutation() to controlPlaneService.ts + confirm-before-submit UI in FinanceOps.tsx.

**TECS-FBW-002 — G-017 Trades Frontend Absent**  
Source: RECONFIRMED_BY_CODEX_AND_COPILOT · Severity: HIGH · Status: PARTIALLY IMPLEMENTED · Wave: 3  
Backend confirmed: POST/GET /api/tenant/trades; POST .../transition (SM+MakerChecker+Sanctions); admin equivalents — implemented (GOVERNANCE-SYNC-005/015).  
Safety constraint (D-017-A): Do NOT send tenantId from client — server enforces from JWT claims. Enforced via z.never() server-side + query-param-only in listTrades().

**TECS-FBW-002-A — Control-plane read surface: ✅ CLOSED (GOVERNANCE-SYNC-110)**  
Implemented: services/controlPlaneService.ts (Trade types + listTrades()); components/ControlPlane/TradeOversight.tsx (NEW — read-only table, no mutation controls); layouts/SuperAdminShell.tsx (SAME-UNIT NECESSARY EXPANSION — 'TRADES' in AdminView union + NavLink); App.tsx (import + case 'TRADES'); shared/contracts/openapi.control-plane.json (SAME-UNIT NECESSARY EXPANSION — GET /api/control/trades path added).

**TECS-FBW-002-B — Tenant-facing panel: 🚫 BLOCKED**  
Blocker: No GET /api/tenant/trades route exists on the tenant plane.  
Next action: Design + implement GET /api/tenant/trades backend route in server/src/routes/tenant/trades.g017.ts, then create services/tradeService.ts + components/Tenant/TradesPanel.tsx + add TRADES to expView union.

**TECS-FBW-003 — G-018 Escrow Frontend Absent**  
Source: RECONFIRMED_BY_CODEX_AND_COPILOT · Severity: HIGH · Status: PARTIALLY IMPLEMENTED · Wave: 3  
Backend confirmed: Full CRUD + transitions (GOVERNANCE-SYNC-011/012).  
Safety constraint (D-020-B): Balance derived from ledger SUM — frontend must not assume a balance field.

**TECS-FBW-003-A — Tenant read surface: ✅ CLOSED (GOVERNANCE-SYNC-111)**  
Implemented: services/escrowService.ts (NEW — EscrowAccount interface, listEscrows() via tenantGet, D-017-A + D-020-B enforced); components/Tenant/EscrowPanel.tsx (NEW — read-only list table, StateBadge, loading/error/empty states, no balance column, no mutations, onBack prop); layouts/Shells.tsx (SAME-UNIT NECESSARY EXPANSION — onNavigateEscrow added to ShellProps + all four shells); App.tsx (EscrowPanel import + expView extended to 'ESCROW' + renderExperienceContent branch + shell prop); shared/contracts/openapi.tenant.json (SAME-UNIT NECESSARY EXPANSION — GET /api/tenant/escrows path added).

**TECS-FBW-003-B — Mutations + detail view: 🔵 FUTURE SCOPE**  
Scope: Escrow create form; lifecycle transition controls (approve/reject/settle); GET /api/tenant/escrows/:escrowId detail panel with balance from ledger.  
Next action: Design TECS-FBW-003-B scope + D-020-B preview-confirm pattern before implementation.

**TECS-FBW-004 — G-019 Settlements Frontend Absent**  
Source: RECONFIRMED_BY_CODEX_AND_COPILOT · Severity: HIGH · Status: ✅ CLOSED (GOVERNANCE-SYNC-113 · 2026-03-07) · Wave: 3  
Backend confirmed: POST /api/tenant/settlements/preview + /api/tenant/settlements; admin equivalents (GOVERNANCE-SYNC-004).  
Frontend status: ✅ IMPLEMENTED — services/settlementService.ts (NEW); components/Tenant/SettlementPreview.tsx (NEW); tenant preview-confirm two-phase flow; D-017-A compliant (no tenantId in body); D-020-B compliant (preview mandatory before commit; confirm form rendered only when wouldSucceed=true); actorType fixed to TENANT_USER; aiTriggered excluded; all settlement error codes surfaced (INSUFFICIENT_ESCROW_FUNDS/ENTITY_FROZEN/DUPLICATE_REFERENCE/STATE_MACHINE_DENIED/TRADE_DISPUTED/AI_HUMAN_CONFIRMATION_REQUIRED/MAKER_CHECKER_REQUIRED); openapi.tenant.json includes both POST settlement routes; App.tsx + Shells.tsx SUNE.  
Wave 3 gate: ✅ CLOSED — all unblocked Wave 3 units complete: TECS-FBW-002-A ✅ · TECS-FBW-003-A ✅ · TECS-FBW-006-A ✅ · TECS-FBW-004 ✅. TECS-FBW-002-B remains 🚫 BLOCKED (backend dependency — GET /api/tenant/trades absent; not a Wave 3 gate prerequisite). Next: TECS-FBW-005 (Wave 4).

**TECS-FBW-005 — G-019 Certifications Frontend Absent**  
Source: RECONFIRMED_BY_CODEX_AND_COPILOT · Severity: HIGH · Status: ✅ CLOSED (GOVERNANCE-SYNC-114 · 2026-03-07) · Wave: 4  
Backend confirmed: Full CRUD + lifecycle transitions (GOVERNANCE-SYNC-008).  
Frontend status: ✅ IMPLEMENTED — services/certificationService.ts (NEW); components/Tenant/CertificationsPanel.tsx (NEW — LIST/CREATE/DETAIL/TRANSITION); components/ControlPlane/CertificationsAdmin.tsx (NEW — read-only cross-tenant admin surface); D-017-A compliant (no orgId in body types); D-020-C compliant (aiTriggered excluded; ESCALATION_REQUIRED surfaced as result state not error); D-020-D compliant (reason mandatory for create+transition; frontend validates before submit); D-022-C compliant (CertificationsAdmin.tsx strictly read-only — no create/transition/patch controls); actorRole required free-text input (distinct from hardcoded actorType in TECS-FBW-004); 3 transition outcomes rendered distinctly (APPLIED/PENDING_APPROVAL/ESCALATION_REQUIRED); openapi.tenant.json (5 certification paths added); openapi.control-plane.json (2 certification admin paths added); App.tsx + layouts/Shells.tsx + layouts/SuperAdminShell.tsx SUNE; AggregatorShell dead unconditional Certifications button replaced with conditional pattern; DPPPassport.tsx untouched (certifications_v1 snapshot view — constitutionally out of scope); ComplianceQueue.tsx untouched; 8 files total (3 NEW + 5 SUNE); typecheck EXIT 0; lint EXIT 0.  
Note: DPPPassport.tsx reads certification data from DPP snapshot view (pre-computed) — NOT from certification lifecycle endpoints. This architecture is preserved and confirmed by the implementation.

**TECS-FBW-006 — G-022 Escalations Frontend Absent [misrouting claim disproved]**  
Source: RECONFIRMED_BY_CODEX_AND_COPILOT · Severity: HIGH · Status: TECS-FBW-006-A: ✅ CLOSED (GOVERNANCE-SYNC-112 · 2026-03-07) · Wave: 3  
Backend confirmed: GET/POST /api/tenant/escalations; GET/POST/upgrade/resolve /api/control/escalations (GOVERNANCE-SYNC-047).  
Frontend status — tenant: ✅ IMPLEMENTED — services/escalationService.ts (NEW); components/Tenant/EscalationsPanel.tsx (NEW); read-only list, JWT-org scoped (D-017-A), no mutation controls.  
Frontend status — control: ✅ IMPLEMENTED — components/ControlPlane/EscalationOversight.tsx (NEW); orgId input-gated; read-only list; freezeRecommendation informational only (D-022-C); no kill-switch toggle.  
Misrouting claim DISPROVED: DisputeCases.tsx correctly calls GET /api/control/disputes (event-log domain, structurally separate from G-022 escalation_events). DisputeCases.tsx is not misrouted and was not modified.  
TECS-FBW-006-B (escalation mutations: upgrade/resolve/override) remains future scope.

**TECS-FBW-007 — Cart Summaries Dead Service Code**  
Source: RECONFIRMED_BY_CODEX_AND_COPILOT · Severity: MEDIUM · Status: ✅ CLOSED (GOVERNANCE-SYNC-116 · 2026-03-08) · Wave: 4  
Backend confirmed: GET /api/control/marketplace/cart-summaries + /:cartId implemented.  
Frontend status: ✅ IMPLEMENTED — components/ControlPlane/CartSummariesPanel.tsx (NEW — search-on-demand, tenant_id required before fetch, cursor pagination via next_cursor, row-selection detail via getCartSummaryByCartId, LoadingState/ErrorState/EmptyState, READ-ONLY badge, no mutation controls); layouts/SuperAdminShell.tsx (SUNE — CART_SUMMARIES added to AdminView union + NavLink under Governance section after Trade Oversight); App.tsx (SUNE — CartSummariesPanel import + case 'CART_SUMMARIES'); controlPlaneService.ts: untouched (getCartSummaries + getCartSummaryByCartId already implemented); no tenant-plane work; no OpenAPI changes; no server changes; 3 files total (1 NEW + 2 SUNE); typecheck EXIT 0; lint EXIT 0.

**TECS-FBW-008 — WL Settings Custom Domain Dead (EXPERIENCE Shell)**  
Source: RECONFIRMED_BY_CODEX_AND_COPILOT · Severity: MEDIUM · Status: ✅ CLOSED (GOVERNANCE-SYNC-104 · 2026-03-07) · Wave: 1  
Context: WLDomainsPanel.tsx in WL_ADMIN shell is fully wired (GOVERNANCE-SYNC-093). Gap was in EXPERIENCE shell WhiteLabelSettings.tsx domain card only.  
Resolution: Added optional onNavigateDomains?: () => void prop to WhiteLabelSettings.tsx. Dead uncontrolled input + no-op Connect button + hardcoded DNS block removed. WL_ADMIN BRANDING context: ‘Manage Custom Domains →’ button routes to DOMAINS panel via setWlAdminView(‘DOMAINS’). EXPERIENCE SETTINGS context: static informational note only. App.tsx BRANDING case wired; SETTINGS call site unchanged. WLDomainsPanel.tsx: zero changes. typecheck EXIT 0; lint EXIT 0. App.tsx + components/Tenant/WhiteLabelSettings.tsx only.

**TECS-FBW-011 — Catalog basePrice vs price — CRITICAL Runtime Bug**  
Source: NEW_IN_COPILOT · Severity: CRITICAL · Status: **CLOSED** · Wave: 1 — SHIP BLOCKER  
Runtime impact: Every catalog item renders as `$undefined.00` across all shells.  
Root cause: CatalogItem interface declares `basePrice?: number`; backend Prisma uses `price` field; App.tsx renders `p.basePrice` at 3 sites.  
Affected: App.tsx (3 render sites); services/catalogService.ts (CatalogItem interface).  
Fix: Update interface to `price: number`; update all `p.basePrice` references to `p.price` — frontend only, no backend change.  
**IMPLEMENTATION EVIDENCE (GOVERNANCE-SYNC-096 · 2026-03-06):**  
- services/catalogService.ts: `basePrice?: number` removed from CatalogItem interface; `price: number` (required) confirmed as canonical field.  
- App.tsx: lines 499, 711, 854 — all `p.basePrice` → `p.price`.  
- components/WhiteLabelAdmin/WLCollectionsPanel.tsx: line 50 — `displayPrice = item.basePrice ?? item.price` → `displayPrice = item.price` (4th render site; audit had under-counted; discovered at typecheck; same allowlist extension authorized within TECS-FBW-011 scope).  
- typecheck EXIT 0 (no TS errors); lint EXIT 0 (scoped to 3 changed files; pre-existing middleware.ts errors confirmed unrelated and pre-existing).  
- git diff --name-only: App.tsx, components/WhiteLabelAdmin/WLCollectionsPanel.tsx, services/catalogService.ts — no unintended files.  
- No backend change; no schema/RLS/migration change; no OpenAPI edit.  
- Commit: `[TEXQTIC] frontend: fix catalog price field - basePrice to price (TECS-FBW-011)`

**TECS-FBW-LINT-001 — middleware.ts ESLint Edge Runtime Globals — Root Lint Gate Failure**  
Source: DISCOVERED during TECS-FBW-011 closeout · Severity: LOW · Status: **CLOSED** · Wave: Immediate (repo-gate precedence)  
Root cause: `eslint.config.js` declared only basic browser globals (`window`, `document`, `fetch`, etc.) but `middleware.ts` runs in a Vercel Edge Runtime (V8 isolate) and uses Web API globals (`TextEncoder`, `crypto`, `Response`, `Request`, `Headers`, `URL`) plus `process.env` (Vercel compile-time injection, used with `typeof process !== 'undefined'` guard). ESLint `no-undef` flagged all 7 as errors (18 instances across 8 line groups).  
Affected: `eslint.config.js` only. `middleware.ts` was NOT changed (runtime behavior preserved).  
Fix: Added a targeted override block in `eslint.config.js` scoped to `files: ['middleware.ts']` only, declaring the 7 Edge Runtime globals as `readonly`. No blanket suppressions. No `@ts-ignore` or `eslint-disable` comments.  
**IMPLEMENTATION EVIDENCE (GOVERNANCE-SYNC-097 · 2026-03-06):**  
- eslint.config.js: targeted override block added before the `ignores` block; 7 globals declared for `middleware.ts` only.  
- `pnpm run lint` EXIT 0 — full root lint gate green (no errors, no warnings).  
- `pnpm run typecheck` EXIT 0 — still clean post-config change.  
- git diff --name-only: `eslint.config.js` only — no unintended files.  
- No middleware.ts change; no runtime behavior change; no security posture change.  
- Commit: `[TEXQTIC] chore: fix middleware root lint globals (TECS-FBW-LINT-001)`

**TECS-FBW-012 — TeamManagement Edit Access Dead Button**  
Source: RECONFIRMED; confirmed by Q2 tracker §12.3 "Membership edit ❌ Not implemented" · Severity: MEDIUM · Status: VALIDATED · Wave: 5  
Frontend status: `<button>Edit Access</button>` has no onClick; no role-change service method.  
Backend status: No PATCH /api/tenant/memberships/:id route exists.  
Next action: Backend route design required first; then wire UI with role-change modal.

**TECS-FBW-013 — B2B Request Quote Dead Button**  
Source: NEW_IN_COPILOT · Severity: LOW · Status: DEFERRED (DEFERRED_BY_DOCTRINE) · Wave: 5  
No backend quote endpoint; B2B quote flow is a future phase item. Keep UI in disabled/hidden state pending product decision.

**TECS-FBW-014 — Post-Checkout No Order Confirmation State**  
Source: NEW_IN_COPILOT · Severity: MEDIUM · Status: ✅ CLOSED · Wave: 1  
Implementation: GOVERNANCE-SYNC-102 · 2026-03-07 · typecheck EXIT 0 · lint EXIT 0  
Files changed: App.tsx + components/Cart/Cart.tsx (SAME-UNIT NECESSARY EXPANSION)  
Fix: Added `ORDER_CONFIRMED` to `appState` union type in App.tsx. Added `confirmedOrderId: string | null` state. Cart.tsx gained optional `onCheckoutSuccess?: (result: CheckoutResult) => void` prop — when provided, checkout success is propagated to App-level instead of local in-cart confirmation (fallback behavior preserved when prop omitted). On checkout success, App.tsx stores `result.orderId` in `confirmedOrderId`, closes the cart overlay, and transitions `appState` to `ORDER_CONFIRMED`. `ORDER_CONFIRMED` case in `renderCurrentState()` renders a full-screen centered confirmation page (orderId first 8 chars, status note, grand total) with two navigation paths: “View My Orders” (→ setExpView(‘ORDERS’) + setAppState(‘EXPERIENCE’)) and “Continue Shopping” (→ setExpView(‘HOME’) + setAppState(‘EXPERIENCE’)).  
Acceptance criteria: ALL MET  
  ✅ Successful checkout no longer silently discards orderId  
  ✅ ORDER_CONFIRMED state exists and is reachable from checkout success path  
  ✅ Confirmation UI renders after successful checkout  
  ✅ orderId preserved in confirmedOrderId state for display  
  ✅ View My Orders and Continue Shopping navigation paths defined; user not stranded  
  ✅ Existing non-WL and non-checkout flows compile and remain intact  
  ✅ typecheck EXIT 0  
  ✅ lint EXIT 0  
  ✅ diff narrow and auditable (2 files only: App.tsx + Cart.tsx expansion)  
  ✅ no unrelated checkout or order flow refactor occurred  
Residual follow-up: None.

**TECS-FBW-015 — G-016 Traceability CRUD Frontend Absent**  
Source: RECONFIRMED_BY_CODEX_AND_COPILOT · Severity: HIGH · Status: VALIDATED · Wave: 4  
Backend confirmed: POST/GET nodes; GET neighbors; POST/GET edges; admin plane equivalents (GOVERNANCE-SYNC-009).  
Note: DPPPassport.tsx consumes GET /api/tenant/dpp/:nodeId (snapshot view) — different endpoint; traceability data creation is dark.  
Next action: Create services/traceabilityService.ts; add node/edge creation forms; extend DPPPassport.tsx or create TraceabilityPanel.tsx.

**TECS-FBW-016 — Tenant Audit Logs UI Absent**  
Source: NEW_IN_COPILOT · Severity: MEDIUM · Status: ✅ CLOSED (GOVERNANCE-SYNC-117 · 2026-03-08) · Wave: 4  
Backend confirmed: GET /api/tenant/audit-logs implemented (server/src/routes/tenant.ts line 112); tenantAuthMiddleware + databaseContextMiddleware; response `{ logs: AuditLog[], count: number }`; take: 50 hardcoded; newest-first; no pagination/filter params.  
Frontend status: ✅ IMPLEMENTED — components/Tenant/TenantAuditLogs.tsx (NEW — EXPERIENCE-only read-only panel; tenantGet('/tenant/audit-logs') on mount; renders createdAt, action, entity, entityId, actorType, realm; beforeJson/afterJson/metadataJson intentionally excluded; LoadingState + ErrorState + EmptyState; Refresh button; footer: server limit 50 · read-only; no mutation controls; no filter/pagination UI; RealmBadge + ActorTypeBadge colour maps); App.tsx (SUNE — expView extended 'AUDIT_LOGS'; TenantAuditLogs import + renderExperienceContent branch + onNavigateAuditLogs shell prop); layouts/Shells.tsx (SUNE — onNavigateAuditLogs in ShellProps; conditional Audit Log button in AggregatorShell, B2BShell, B2CShell, WhiteLabelShell; WhiteLabelAdminShell untouched — different interface).  
Validation: typecheck EXIT 0 · lint EXIT 0 (0 errors, 108 warnings — baseline unchanged) · git diff --name-only: App.tsx + layouts/Shells.tsx (3 files total: 1 NEW + 2 SUNE).  
🏁 WAVE 4 COMPLETE — all units (FBW-005, FBW-015, FBW-007, FBW-016) closed.

**TECS-FBW-017 — CatalogItem.category Grouping May Fail**  
Source: NEW_IN_COPILOT · Severity: LOW · Status: ✅ CLOSED (GOVERNANCE-SYNC-105 · 2026-03-07) · Wave: 1  
Root cause (filed): WLCollectionsPanel.tsx groups items by item.category; category typed optional; if null/undefined, grouping degrades silently.  
Resolution: Governance-only closeout. Direct inspection confirms WLCollectionsPanel.tsx (GOVERNANCE-SYNC-066) already implements full defensive grouping: `(item.category ?? '').trim() || UNCATEGORISED`. Null, undefined, and whitespace-only categories all route to a stable ‘Uncategorised’ bucket sorted last. PROVISIONAL risk was resolved when the component was shipped. No code change required or made.

**TECS-FBW-018 — Plan BASIC→TRIAL Enum Mapping**  
Source: NEW_IN_COPILOT · Severity: LOW · Status: PROVISIONAL · Wave: 0 (verify)  
Root cause: Backend returns plan: 'BASIC'; frontend type uses 'TRIAL' | 'PAID' | 'ENTERPRISE'; explicit mapping in TenantRegistry.tsx.  
Next action: Confirm if 'BASIC' is canonical or legacy alias; align enum if needed.

**TECS-FBW-019 — lifecycleState vs status (Handled)**  
Source: NEW_IN_COPILOT · Status: DEFERRED  
GAP-ORDER-LC-001 formally closed (GOVERNANCE-SYNC-063). No further action.

**TECS-FBW-020 — WL Admin Invite Shell Routing**  
Source: NEW_IN_CODEX · Severity: MEDIUM · Status: ✅ CLOSED · Wave: 1  
VER-002 executed: 2026-03-06 · Verdict: FAIL · Evidence: direct file inspection (read-only; no code modified)
Implementation: GOVERNANCE-SYNC-101 · 2026-03-06 · typecheck EXIT 0 · lint EXIT 0  
File changed: App.tsx only (3 targeted edits; no other file touched)
Fix: introduced `wlAdminInviting: boolean` WL-admin-local substate in App.tsx. `renderWLAdminContent()` early-returns `<InviteMemberForm onBack={() => setWlAdminInviting(false)} />` when `wlAdminInviting` is true, keeping `appState === 'WL_ADMIN'` throughout — `WhiteLabelAdminShell` never drops. `case 'STAFF':` now calls `setWlAdminInviting(true)` instead of `setAppState('INVITE_MEMBER')`. `onViewChange` in the `WL_ADMIN` block resets `wlAdminInviting` on nav change. EXPERIENCE invite flow (lines 527-529) unchanged. Shells.tsx untouched — `activeView: string` is unconstrained.  
Acceptance criteria: ALL MET  
  ✅ Invite from WL Admin STAFF renders inside WhiteLabelAdminShell  
  ✅ InviteMemberForm reachable without switching into EXPERIENCE shell  
  ✅ Back from InviteMemberForm returns to WL Admin STAFF in-shell  
  ✅ Existing non-WL invite flows compile and remain intact  
  ✅ typecheck EXIT 0  
  ✅ lint EXIT 0  
  ✅ diff narrow and auditable (App.tsx only)  
  ✅ no unrelated navigation refactor occurred  
Residual follow-up: None. No partial implementation.

**TECS-FBW-AIGOVERNANCE — AI Governance Dead Authority Actions**  
Source: NEW_IN_COPILOT · Severity: HIGH · Status: REQUIRES_BACKEND_DESIGN · Wave: 5  
Finding: AiGovernance.tsx action buttons have no onClick; no PUT /api/control/ai-budget/:tenantId route exists.  
Backend gap: G-028 B1/B2/C1/C2/C3 all Deferred Wave 5+ (GOVERNANCE-SYNC-095). Not a wiring gap — backend route does not exist.

**TECS-FBW-ADMINRBAC — AdminRBAC No Backend Route**  
Source: NEW_IN_COPILOT · Severity: HIGH · Status: REQUIRES_BACKEND_DESIGN · Wave: 5  
Finding: AdminRBAC.tsx "Invite Admin" and "Revoke" buttons have no onClick; no /api/control/admin-users route in control.ts.  
Security note: Absence of auditable admin provisioning is a product gap and security posture concern. Not a wiring gap — requires backend route design.

**TECS-FBW-MOQ — MOQ_NOT_MET 422 UX Gap**  
Source: NEW_IN_COPILOT · Severity: MEDIUM · Status: ✅ CLOSED (GOVERNANCE-SYNC-103 · 2026-03-07) · Wave: 1  
Finding: POST /api/tenant/cart/items returns 422 MOQ_NOT_MET; frontend had no error toast or inline message.  
Resolution: B2CAddToCartButton (App.tsx) — addError state added; APIError.message surfaced inline below button in rose-600 text; error cleared on each new attempt; success path unchanged. App.tsx only. typecheck EXIT 0; lint EXIT 0.

**TECS-FBW-OA-001 — OpenAPI Tenant Contract Drift**  
Source: NEW_IN_CODEX · Severity: HIGH · Status: VERIFY_REQUIRED · Wave: 0 (inventory); fix per implementing wave  
Finding: openapi.tenant.json missing checkout, orders, orders/:id/status, domains, dpp, and other active endpoints.  
Next action: Enumerate paths in tenant.ts vs openapi.tenant.json; produce delta list; register as governance debt; update OpenAPI in same wave as corresponding gap fix.

**TECS-FBW-OA-002 — OpenAPI Control-Plane Contract Drift**  
Source: NEW_IN_CODEX · Severity: HIGH · Status: VERIFY_REQUIRED · Wave: 0 (inventory); fix per implementing wave  
Finding: openapi.control-plane.json missing /finance/payouts, /compliance/requests, /disputes, /system/health, /whoami, impersonation routes.  
Next action: Enumerate paths in control.ts vs openapi.control-plane.json; produce delta list.

**TECS-FBW-AT-006 — Order Status Transition UI Role Gating (VER-005 CLOSED · GOVERNANCE-SYNC-106 · 2026-03-07)**  
Source: NEW_IN_CODEX · Severity: MEDIUM · Status: ✅ CLOSED · Wave: 1  
VER-005 executed: 2026-03-07 · Verdict: FAIL · No client-side role gate; all users saw Confirm/Fulfill/Cancel buttons.  
Implementation: getCurrentUser() called in Promise.all alongside orders fetch (safe-fail); userRole state set; canManageOrders==='OWNER'||'ADMIN' gate in render; MEMBER/VIEWER see dash cell; OWNER/ADMIN unchanged.  
Files changed: components/Tenant/EXPOrdersPanel.tsx only · commit b01fcd3 · typecheck EXIT 0 · lint EXIT 0  
Backend route tenant.ts: unchanged · No App.tsx change · Envelope preserved: 1 file only.

**TECS-FBW-AUTH-001 — Tenant Login Hardcoded Seeded Picker (VER-006 PASS · GOVERNANCE-SYNC-TECS-FBW-AUTH-001 · 2026-03-13)**  
Source: NEW_IN_CODEX · Severity: MEDIUM · Status: ✅ CLOSED · Wave: 5  
VER-006 executed: 2026-03-13 · Verdict: FAIL (SEEDED_TENANTS constant confirmed present; /api/public/tenants/resolve absent) → implementation immediately authorized.  
Finding confirmed: `SEEDED_TENANTS` constant with 2 hardcoded UUIDs active in AuthFlows.tsx; `selectedTenantId` state defaulted to acme-corp UUID; GET /api/public/tenants/resolve did not exist.  
Implementation: commit 476b3d3 — 5 files, 151 insertions.  
  - server/src/routes/public.ts (NEW): GET /tenants/resolve?slug=\<slug\>; Zod slug validation (`^[a-z0-9-]+$`, max 100); `prisma.tenant.findUnique({where:{slug},select:{id,slug,name}})`; 404 TENANT_NOT_FOUND / 400 VALIDATION_ERROR  
  - server/src/index.ts: import + register publicRoutes at /api/public prefix (before auth routes)  
  - server/src/middleware/realmGuard.ts: `'/api/public': 'public'` added to ENDPOINT_REALM_MAP  
  - services/authService.ts: `ResolvedTenant` interface + `resolveTenantBySlug()` helper added  
  - components/Auth/AuthFlows.tsx: SEEDED_TENANTS removed; slug text input added; resolver called before login(); resolved tenant name confirmed in UI  
Validation: typecheck EXIT 0 (frontend + backend) · lint EXIT 0 · git diff --name-only: 5 files only (all allowlisted).  
Admin realm flow: completely untouched.

**TECS-FBW-RLS-001 — RLS-Only Posture Governance Clarification (VER-007 PASS · TECS-FBW-RLS-001-GOV · 2026-03-13)**  
Source: NEW_IN_CODEX · Severity: MEDIUM · Status: ✅ CLOSED · Wave: 0 (governance statement only; no code change)  
VER-007 executed: 2026-03-13 · Verdict: FAIL (governance defect confirmed — no system-level doctrine; only memberships-specific Q2 §12.2 precedent; stale `app.tenant_id` GUC reference in contract file) → governance-writing unit authorized.  
Finding: Multiple tenant routes rely on RLS (withDbContext/app.org_id GUC) for boundary enforcement without explicit `where: { org_id }` app-layer filters.  
Context: Q2 tracker §12.2 documents the intentional decision for memberships specifically.  
Secondary defect: `shared/contracts/rls-policy.md` listed `app.tenant_id` as the session GUC. Canonical implementation GUC is `app.org_id`. Corrected by this unit.  
Closure: System-level RLS-only posture doctrine written in `shared/contracts/rls-policy.md` (§ System-Level RLS-Only Posture · TECS-FBW-RLS-001-GOV · 2026-03-13). Doctrine explicitly states:  
  - FORCE RLS on `app.org_id` is the canonical tenant isolation enforcement boundary.  
  - Tenant scope is bound from JWT/server context via `withDbContext`; client-supplied IDs are never trusted.  
  - For tables with complete, governance-verified FORCE RLS coverage, app-layer `where: { org_id }` filters are optional defense-in-depth, not the enforcement source of truth.  
  - Routes with incomplete/unverified RLS coverage, BYPASSRLS paths, or cross-tenant admin reads still require explicit app-layer filtering or a documented exception.  
  - Exception recording protocol defined.  
  - `app.org_id` is now the canonical GUC in all governance documents; `app.tenant_id` is stale and deprecated.  
Files changed: `shared/contracts/rls-policy.md` only (governance contract — no runtime code).  
No application code, schema, migration, or RLS policy was modified.

**TECS-FBW-PROV-001 — Tenant Provisioning Contract Mismatch (VER-001 CLOSED · 2026-03-06)**  
Source: CROSS_REPORT_CONFLICT → RESOLVED · Severity: HIGH · Status: VALIDATED · Wave: 1  
VER-001 executed: 2026-03-06 · Verdict: FAIL · Evidence: direct file inspection (read-only; no code modified)  
Request field mismatch — all 5 fields wrong:  
  - Frontend sends `name` → backend Zod expects `orgName` — absent from payload; validation fails  
  - Frontend sends `ownerEmail` → backend Zod expects `primaryAdminEmail` — absent; validation fails  
  - Frontend sends `ownerPassword` → backend Zod expects `primaryAdminPassword` — absent; validation fails  
  - Frontend sends `slug` → not in Zod schema; silently stripped  
  - Frontend sends `type` → not in Zod schema; silently stripped  
Response shape mismatch: backend returns flat `{orgId,slug,userId,membershipId}`; frontend `ProvisionTenantResponse` expects nested `{tenant:{id,name,slug,type,status},owner:{id,email}}`.  
Runtime consequence: deterministic HTTP 400 on every call — `provisionBodySchema.safeParse()` always returns `success: false`.  
Codex §4.1 assessment: CONFIRMED CORRECT. Copilot §3 "✅ Wired" superseded by field-level inspection (call path exists; contract was never correct).  
Additional finding (doc-only): stale comment in tenantProvision.ts header says `/api/admin/tenants/provision`; actual registration is `/api/control/tenants/provision` — no runtime impact.  
Implementation: ✅ CLOSED — GOVERNANCE-SYNC-099 · 2026-03-06 · typecheck EXIT 0 · lint EXIT 0  
Files changed: `services/controlPlaneService.ts` (interfaces aligned), `components/ControlPlane/TenantRegistry.tsx` (call site + response), `server/src/routes/admin/tenantProvision.ts` (doc-only stale comment fix).  
Next: VER-002 (TECS-FBW-020 — WL Admin invite shell routing).

---

### Verification Backlog

| ID | Surface | Target | Status |
|---|---|---|---|
| VER-001 | TECS-FBW-PROV-001 | Compare provisionTenant() body fields vs Zod schema field by field | ✅ CLOSED — 2026-03-06 · Verdict: FAIL · All 5 request fields mismatched; response shape incompatible · TECS-FBW-PROV-001 → VALIDATED + Wave 1 |
| VER-002 | TECS-FBW-020 | Inspect App.tsx INVITE_MEMBER state routing for WL_ADMIN context | ✅ CLOSED — 2026-03-06 · Verdict: FAIL · INVITE_MEMBER routes into EXPERIENCE case group; WhiteLabelShell rendered instead of WhiteLabelAdminShell; WL Admin context lost · TECS-FBW-020 → VALIDATED + Wave 1 |
| VER-003 | TECS-FBW-OA-001 | Enumerate openapi.tenant.json paths vs tenant.ts actual routes | ⏳ Pending |
| VER-004 | TECS-FBW-OA-002 | Enumerate openapi.control-plane.json paths vs control.ts actual routes | ⏳ Pending |
| VER-005 | TECS-FBW-AT-006 | Read EXPOrdersPanel.tsx role-gating on status transition buttons | ✅ CLOSED — 2026-03-07 · Verdict: FAIL · All 3 action buttons visible to all roles; no canManageOrders gate; file header explicitly stated server-only gate · TECS-FBW-AT-006 → VALIDATED → implemented (GOVERNANCE-SYNC-106 · commit b01fcd3) |
| VER-006 | TECS-FBW-AUTH-001 | Read AuthFlows.tsx — confirm seeded picker + TODO resolver ref | ✅ CLOSED — 2026-03-13 · Verdict: FAIL · SEEDED_TENANTS confirmed; resolver absent → TECS-FBW-AUTH-001 implemented (commit 476b3d3) · gap CLOSED |
| VER-007 | TECS-FBW-RLS-001 | Draft system-level governance statement on RLS-only posture | ✅ CLOSED — 2026-03-13 · Verdict: FAIL (governance defect confirmed) → doctrine written in shared/contracts/rls-policy.md · stale app.tenant_id corrected to app.org_id · TECS-FBW-RLS-001-GOV |}
| VER-008 | U-001 (Copilot) | Locate /api/ai/* route file; confirm registration + auth posture | ✅ CLOSED — 2026-03-13 · Verdict: FAIL (two defects) → TECS-VER008-REMEDIATION (commit 960b736) · re-verification PASS · DEF-VER008-001 CLOSED: `GET /api/ai/health` tenant-auth protected · DEF-VER008-002 CLOSED: `/api/ai` explicitly declared in `ENDPOINT_REALM_MAP` · GOVERNANCE-SYNC-U-001 |
| VER-009 | U-002 (Copilot) | Read admin/tenantProvision.ts auth guard in full | ✅ CLOSED — 2026-03-13 · Verdict: PASS · SUPER_ADMIN enforcement explicit and layered · no bypass surface · prior CI-only assumption resolved by full read · GOVERNANCE-SYNC-U-002 |
| VER-010 | U-004 (Copilot) | Read WLOrdersPanel.tsx lines 200–480 for role-gating evidence | ✅ CLOSED — 2026-03-13 · Verdict: PASS · Confirm/Fulfill/Cancel actions exist · role gating via App.tsx routing gate + backend PATCH enforcement (OWNER/ADMIN) · intentional design, documented in file header · no bypass · GOVERNANCE-SYNC-U-004 |

---

### Auth/Tenancy Confirmations (No Action Required)

| ID | Finding | Evidence |
|---|---|---|
| AT-001 | Realm enforcement end-to-end | Dual-realm token flow correctly threaded: apiClient.ts → tenantApiClient.ts/adminApiClient.ts → middleware → backend |
| AT-002 | G-017 Trade tenantId D-017-A enforced server-side | Server enforces tenantId from JWT claims; do NOT send from client |
| AT-003 | G-018 Escrow org_id RLS | escrow.g018.ts sets app.org_id GUC; cross-tenant isolation confirmed |
| AT-004 | Control-plane provisioning auth posture | GOVERNANCE-SYNC-035 CI guard: 8/8 SUPER_ADMIN surfaces gated; 0 violations |
| AT-005 | Impersonation token on realm switch | VERIFY_REQUIRED — clearImpersonationToken() called on explicit exit; accidental logout-during-impersonation path not verified (VER-009 adjacent) |

---

## PRE-WAVE-5-REMEDIATION-001 — Platform Wiring and Runtime Truth Reconciliation

**Registered:** 2026-03-08  
**Authority:** Paresh  
**Classification:** Anti-drift — Pre-Wave-5  
**Predecessor:** SEQUENCING-LOCK-PRE-WAVE-5 (2026-03-08) · GOVERNANCE-SYNC-118  
**Source audits:** Full TexQtic Platform Map audit + Navigation verification audit (both completed 2026-03-08, repo inspection only)  
**Detail tracker:** `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` → Pre-Wave-5 Remediation Program section  
**Master plan:** `docs/governance/MASTER-IMPLEMENTATION-PLAN-2026-03.md` → Section 10  
**Audit registration:** `docs/governance/audits/2026-03-audit-reconciliation-matrix.md` → Section 9  
**Status:** REGISTERED — Verification tranche must complete before any implementation unit begins

### Program Purpose

Two independent repo-truth audits completed 2026-03-08 following GOVERNANCE-SYNC-118 produced a mixed set of findings: agreed wired surfaces, verified-dead UI, backend-exists/UI-missing gaps, and placeholder control-plane panels that must not anchor Wave 5 planning. This program establishes the ordered remediation sequence that governs all pre-Wave-5 execution. Old expansion planning assumptions are superseded by audit output. All implementation ordering is based only on reconciled conclusions.

> **Anti-drift rule:** No sub-unit in an implementation tranche may begin until all sub-units in the verification tranche that gate it are resolved and recorded in governance. No agent or prompt may bypass this rule.

---

### Reconciled Audit Conclusions

| # | Finding Type | Classification | Disposition |
|---|---|---|---|
| 1 | Both audits agree on wired-status of a surface | `AGREED` | Implementation-ready; assigned to wiring tranche sub-unit |
| 2 | Audits differ on wire status | `VERIFY_REQUIRED` | Resolve by targeted repo inspection; assigned to verification tranche |
| 3 | Nav item / action visible but no backend route or wiring | `DEAD_UI` | Must be hidden/gated before further expansion; assigned to UX correctness tranche |
| 4 | Backend route exists; no UI surface wired | `BACKEND_EXISTS_UI_MISSING` | Higher priority than net-new domain work |
| 5 | Static control-plane docs/spec/roadmap panel | `PLACEHOLDER_PANEL` | Does not count as a wired surface; must not anchor Wave 5 planning |

---

### Verification Tranche (Gate for All Implementation Tranches)

All four verification sub-units must resolve to ✅ with evidence before any implementation tranche sub-unit begins.

| ID | Name | Gate Target | Status | Notes |
|---|---|---|---|---|
| PW5-V1 | DPP runtime verification | PW5-U2, PW5-W1 area | ✅ VERIFIED — 2026-03-08 | HTTP 404 from GET /api/tenant/dpp/{uuid} — route live, DB query executed, RLS enforcement confirmed. "DPP snapshot not found or access denied." Auth: valid tenant JWT (impersonated session). Classification: DPP / Passport = WORKING. |
| PW5-V2 | Tenant Audit Logs runtime verification | PW5-W3 area | ✅ VERIFIED — 2026-03-08 | Backend runtime-proven (HTTP 401 unauth + HTTP 200 auth). Frontend path mismatch fixed in PW5-FIX-V2A: TenantAuditLogs.tsx '/tenant/audit-logs' corrected to '/api/tenant/audit-logs'. Post-fix runtime: HTTP 200 { logs: [], count: 0, success: true }. TSC_EXIT:0. Classification: Tenant Audit Logs = WORKING. |
| PW5-V3 | TenantType source-of-truth verification | PW5-U1, PW5-U4 area | ❌ FAIL — B2-DESIGN COMPLETE (2026-03-09) | Enum mismatch confirmed across 4 layers. DB+Prisma: {B2B, B2C, INTERNAL}. Frontend: {AGGREGATOR, B2B, B2C, WHITE_LABEL}. AGGREGATOR and WHITE_LABEL unreachable via active Prisma code path. INTERNAL has no frontend shell (silent AGGREGATOR fallback). Backend type alias stale. 3 defects registered: PW5-V3-DEF-001/002/003. Remediation required. **B2-DESIGN architectural decision locked (2026-03-09):** Canonical model: `tenant_category` (AGGREGATOR/B2B/B2C/INTERNAL) + `is_white_label BOOLEAN NOT NULL DEFAULT false` + explicit `resolveExperienceShell()` policy. Silent `default:` fallback FORBIDDEN. Remediation path approved: B2-REM-1 → B2-REM-2 → B2-REM-3 → B2-REM-4 → B2-REM-5. **Remediation progress — 2026-03-09:** B2-REM-1 ✅ CLOSED (schema layer · commit d893524 · 2026-03-09 · AGGREGATOR added to TenantType enum; is_white_label added to tenants + organizations; legacy WHITE_LABEL org rows migrated); B2-REM-2 through B2-REM-5 ⏳ pending. PW5-V3 remains ❌ FAIL overall until all remediation units complete. Note: schema layer complete ≠ full defect closure — backend serialization, frontend routing, OpenAPI contracts, and provisioning flow still open in B2-REM-2–5. |
| PW5-V4 | Shell action verification | PW5-U3 | ✅ VERIFIED — 2026-03-08 | All shell/global nav and action surfaces classified by static inspection. WORKING: 11 EXPERIENCE nav items, 6 WL_ADMIN views, 15 SuperAdmin views. DEAD NAV: B2B Negotiations, B2B Invoices, WL Collections, WL The Journal. DEAD ACTION: AdminRBAC Invite Admin/Revoke, AiGovernance Kill Switch + secondary buttons, Aggregator Post RFQ, B2B Create RFQ. STATIC/INCORRECT: B2C cart badge hardcoded "3". PLACEHOLDER_PANEL: Blueprints, BackendSkeleton, ApiDocs, DataModel, Middleware. STUB: AdminRBAC. PARTIAL: AiGovernance. Findings mapped to PW5-U1 through PW5-U4. No implementation change required. |

**PW5-V1 runtime evidence (2026-03-08):**
- Server health: GET /health → HTTP 200 ✅
- Route existence: GET /api/tenant/dpp/{uuid} without auth → HTTP 401 ✅ (route registered, auth-gated)
- Runtime call: GET /api/tenant/dpp/00000000-0000-4000-a000-000000000001 with valid tenant JWT → HTTP 404 ✅
- Error body: `{"error":{"code":"NOT_FOUND","message":"DPP snapshot not found or access denied"}}` — confirms route reached DB layer, views queried, RLS applied, no node for this org
- Auth path: tenantAuthMiddleware passed → databaseContextMiddleware passed → withDbContext executed
- JWT: admin-issued impersonation token (tenant-scoped, realm=TENANT) — value not recorded
- Repo truth confirmed: GET /api/tenant/dpp/:nodeId registered in server/src/routes/tenant.ts; DPPPassport.tsx calls tenantGet(); nav wired all four shells
- Classification: **DPP / Passport = WORKING** (implementation complete and runtime-verified)

**PW5-V1 TECS Unit B1 — Supplemental static inspection evidence (2026-03-09):**
- Unit: TECS Unit B1 — DPP Runtime Verification · Date: 2026-03-09 · Verdict: PASS
- Method: Read-only static inspection — full call chain traced UI→API→Backend→DB; no files modified
- 3 snapshot views confirmed present in committed migrations:
  - `dpp_snapshot_products_v1` — SECURITY INVOKER; manufacturer fields restored in migration `20260316000003_g025_dpp_views_manufacturer_restore`
  - `dpp_snapshot_lineage_v1` — SECURITY INVOKER; recursive CTE depth cap 20 in migration `20260316000001_g025_dpp_snapshot_views`
  - `dpp_snapshot_certifications_v1` — SECURITY INVOKER in migration `20260316000001_g025_dpp_snapshot_views`
- Tenant isolation chain: `withDbContext(prisma, dbContext)` sets `app.org_id`; views SECURITY INVOKER; FORCE RLS fires; 404 fail-closed guard on empty product rows
- Payload match: backend `DppSnapshot` response shape confirmed against frontend interface — all fields consistent
- Git diff: no files modified — `git diff --name-only` was empty in TECS Unit B1 session
- Reclassification: **DPP / Passport = VERIFIED** (TECS Unit B1 PASS · 2026-03-09)

**PW5-V1-DEF-001 — Defect Registration (2026-03-09):**
- ID: PW5-V1-DEF-001
- Type: Governance Contract Drift
- Discovered by: TECS Unit B1 (read-only static inspection)
- Description: `GET /api/tenant/dpp/:nodeId` is absent from `shared/contracts/openapi.tenant.json`
- Affected contract file: `shared/contracts/openapi.tenant.json`
- Impact: Documentation only — runtime is not affected; route is registered, auth-gated, and functional
- Severity: Low (documentation drift — non-blocking)
- Action required: Future contract-sync TECS unit to add the missing path definition
- Classification: Non-blocking defect; does not affect PW5-V1 PASS verdict

**PW5-V2 runtime evidence (2026-03-08):**
- Server health: GET /health → HTTP 200 ✅
- Route existence: GET /api/tenant/audit-logs without auth → HTTP 401 ✅ (route registered, auth-gated)
- Runtime call: GET /api/tenant/audit-logs with valid tenant JWT (impersonated session) → HTTP 200 ✅
- Response body: `{"data":{"logs":[],"count":0},"success":true}` — backend fully operational; empty array correct (RLS scopes to new test tenant with no audit events)
- Auth path: tenantAuthMiddleware passed → databaseContextMiddleware passed → withDbContext executed → tx.auditLog.findMany returned
- JWT: admin-issued impersonation token (tenant-scoped, realm=TENANT) — value not recorded
- Frontend path mismatch confirmed by static analysis:
  - `TenantAuditLogs.tsx` calls `tenantGet('/tenant/audit-logs')` (missing `/api` prefix)
  - `tenantApiClient.ts` → `apiClient.ts` resolves to `API_BASE_URL + endpoint` = `'' + '/tenant/audit-logs'` = `/tenant/audit-logs`
  - Backend listens at `/api/tenant/audit-logs` (prefix `/api` from `tenantRoutes` registration)
  - `vite.config.ts` has no proxy — no bridge between the two paths
  - Runtime consequence: frontend request hits SPA router, not Fastify. Component will always error.
- Classification at PW5-V2 close: **Tenant Audit Logs = PARTIAL** (backend working; frontend path broken)

**PW5-FIX-V2A fix evidence (2026-03-08):**
- Fix applied: `TenantAuditLogs.tsx` line 120 — `'/tenant/audit-logs'` → `'/api/tenant/audit-logs'`
- Scope: one file, one line — `components/Tenant/TenantAuditLogs.tsx` only
- `git diff --name-only` → `components/Tenant/TenantAuditLogs.tsx` only ✅
- `tsc --noEmit` → TSC_EXIT:0 ✅
- Post-fix runtime call: GET /api/tenant/audit-logs with valid tenant JWT → HTTP 200 ✅
- Post-fix response: `{"data":{"logs":[],"count":0},"success":true}` — component no longer fails due to path mismatch
- Call chain confirmed: `tenantGet('/api/tenant/audit-logs')` → `apiClient.get` → `fetch('' + '/api/tenant/audit-logs')` → Fastify route ✅
- JWT: admin-issued impersonation token (tenant-scoped, realm=TENANT) — value not recorded
- Reclassification: **Tenant Audit Logs = WORKING** (backend operational + frontend path corrected + post-fix runtime-verified)

**PW5-V3 static analysis evidence (2026-03-08) — SUPERSEDED by TECS Unit B2 (2026-03-09):**
- Original classification: CONSISTENT (2026-03-08 static pass)
- Superseded by: TECS Unit B2 deeper enum inspection — revealed schema-level mismatch not caught by routing-chain-only inspection
- See TECS Unit B2 evidence below for full findings

**PW5-V3 TECS Unit B2 — Full Enum Inspection Evidence (2026-03-09) — VERDICT: FAIL:**
- Method: Read-only multi-layer static inspection — Prisma schema, DB migration, backend type alias, API routes, frontend enum, OpenAPI spec
- **DB type (enforced):** Init migration line 2: `CREATE TYPE "tenant_type" AS ENUM ('B2B', 'B2C', 'INTERNAL')` — only these 3 values can ever be stored in `tenants.type`
- **Prisma schema:** `enum TenantType { B2B; B2C; INTERNAL; @@map("tenant_type") }` — matches DB type exactly
- **Backend type alias** (`server/src/types/index.ts` line 66): `export type TenantType = 'B2B' | 'B2C' | 'INTERNAL'` — matches schema
- **Runtime expectation** (`server/src/routes/auth.ts` comment line 376): `Expected values: 'B2B' | 'WHITE_LABEL' | 'AGGREGATOR' | 'B2C' | null` — **diverges from both schema and type alias**
- **Frontend enum** (`types.ts` lines 2–6): `{ AGGREGATOR, B2B, B2C, WHITE_LABEL }` — **no INTERNAL; has AGGREGATOR and WHITE_LABEL which cannot be produced by Prisma**
- **Trigger path** (`sync_tenants_to_organizations()`): `org_type = NEW.type::text` — casts Prisma enum to text; only {B2B, B2C, INTERNAL} can flow into `organizations.org_type`
- **Active provision route** (`POST /api/control/tenants/provision`): accepts no `type` field — all provisioned tenants default to B2B
- **OpenAPI control-plane:** provision body `type` enum `["B2B", "B2C", "INTERNAL"]` — matches schema but belongs to deprecated path
- **OpenAPI tenant:** `tenantType` mentioned only as untyped string query param for AI insights — no TenantType schema component defined in either spec
- **Shell routing (App.tsx switch):** handles {AGGREGATOR, B2B, B2C, WHITE_LABEL}; `INTERNAL` hits `default: AggregatorShell` (silent fallback)
- **Git diff:** no files modified — read-only inspection confirmed
- Classification: **FAIL** — enum mismatch across layers; AGGREGATOR and WHITE_LABEL architecturally required but schema-unreachable; INTERNAL has no frontend representation

**PW5-V3-DEF-001 — Defect Registration (2026-03-09):**
- ID: PW5-V3-DEF-001
- Title: INTERNAL tenant type lacks frontend representation
- Type: Enum mismatch — backend-present, frontend-absent
- Severity: Medium
- Description: `INTERNAL` exists in the DB `tenant_type` PG enum, in `server/prisma/schema.prisma`, and in `server/src/types/index.ts`. It is absent from the frontend `TenantType` enum in `types.ts`.
- Runtime behavior: If a tenant row has `type = 'INTERNAL'`, the value passes through `organizations.org_type` → API → frontend unmodified. The login validity guard in `App.tsx` treats it as unrecognized and silently falls back to `TenantType.AGGREGATOR`, routing the user to `AggregatorShell`.
- Impact: Incorrect shell routing for any `INTERNAL` tenant — silent, no error surfaced
- Action required: Product decision on `INTERNAL` disposition; either add to frontend enum with a dedicated shell, or deprecate and remove from DB/Prisma enum
- Classification: Non-blocking at runtime (fallback prevents crash); blocking for correctness

**PW5-V3-DEF-002 — Defect Registration (2026-03-09):**
- ID: PW5-V3-DEF-002
- Title: AGGREGATOR and WHITE_LABEL unreachable via Prisma schema or active provision route
- Type: Schema gap — values required at runtime but absent from Prisma enum
- Severity: High
- Description: The frontend enum (`types.ts`), shell routing switch (`App.tsx`), WL_ADMIN routing logic, and auth route runtime comments all require `AGGREGATOR` and `WHITE_LABEL` as valid `tenantType` values. However: (1) the Prisma `TenantType` enum does not include these values; (2) the DB `tenant_type` PG type does not include them; (3) the `sync_tenants_to_organizations()` trigger can only copy values from `tenants.type` (Prisma-constrained enum) into `organizations.org_type`; (4) the active provision route (`POST /api/control/tenants/provision`) does not accept a `type` field at all.
- Impact: No current code path can create an AGGREGATOR or WHITE_LABEL tenant through Prisma. Shell routing for these two types — which cover all white-label and aggregator market verticals — is architecturally broken at the data-creation layer.
- Action required: `ALTER TYPE tenant_type ADD VALUE 'AGGREGATOR'; ALTER TYPE tenant_type ADD VALUE 'WHITE_LABEL'` migration, Prisma schema update, backend type alias update, provision route extension. Requires B2-DESIGN decision unit before implementation.
- Classification: High-severity schema gap; core platform functionality (WL tenants) blocked at provisioning layer
- **Partial Remediation (Schema Layer) — 2026-03-09:** B2-REM-1 applied (commit d893524). `AGGREGATOR` added to `TenantType` Prisma enum; `is_white_label BOOLEAN NOT NULL DEFAULT false` added to `tenants` and `organizations`; legacy `WHITE_LABEL` `org_type` organization rows migrated to `B2B` + `is_white_label=true`. Schema layer is now aligned with the canonical model. Remaining open layers: backend serialization (B2-REM-2), frontend enum/routing (B2-REM-3), OpenAPI contract synchronization (B2-REM-4), provisioning flow (B2-REM-5). PW5-V3-DEF-002 is **NOT CLOSED** — partial remediation at schema layer only.

**PW5-V3-DEF-003 — Defect Registration (2026-03-09):**
- ID: PW5-V3-DEF-003
- Title: Backend TenantType alias stale
- Type: Type drift — alias diverges from runtime expectation
- Severity: Low
- Description: `server/src/types/index.ts` declaration: `export type TenantType = 'B2B' | 'B2C' | 'INTERNAL'`. Runtime expectation comment in `server/src/routes/auth.ts` (line 376): `Expected values: 'B2B' | 'WHITE_LABEL' | 'AGGREGATOR' | 'B2C' | null`. The alias does not include `AGGREGATOR` or `WHITE_LABEL` and still includes `INTERNAL`.
- Impact: TypeScript type-checking will not flag AGGREGATOR/WHITE_LABEL values as invalid even though they are not in the alias (they arrive as raw `string` from DB, bypassing the type at the assignment point). Potential future inconsistency when stricter typing is applied.
- Action required: Update alias to match the canonical outcome of B2-DESIGN. Blocked on DEF-002 resolution.
- Classification: Low-severity type drift; does not block runtime but degrades type safety

**PW5-V4 static analysis evidence (2026-03-08):**
- Method: read-only static inspection across all 6 shells — no runtime required
- Files inspected: `layouts/Shells.tsx`, `layouts/SuperAdminShell.tsx`, `App.tsx` (`renderAdminView`, `renderExperienceContent`, WL admin switch), all `components/ControlPlane/` and `components/WhiteLabelAdmin/` panels
- **WORKING (11 EXPERIENCE nav items):** Home, Certifications, Traceability, Orders, DPP Passport, Escrow, Escalations, Settlement, Audit Log, Team, Settings — all wired via `onNavigate*` props → `setExpView` / `setAppState`; all target real, data-connected components
- **WORKING (6 WL_ADMIN views):** BRANDING (`WhiteLabelSettings`), STAFF (`TeamManagement`), PRODUCTS (inline catalog CRUD), COLLECTIONS (`WLCollectionsPanel` → GET `/api/tenant/catalog/items`), ORDERS (`WLOrdersPanel` → GET/PATCH `/api/tenant/orders`), DOMAINS (`WLDomainsPanel` → GET/POST/DELETE `/api/tenant/domains`) — all backend routes confirmed in `server/src/routes/tenant.ts`
- **WORKING (15 SuperAdmin views):** TENANTS, FLAGS, FINANCE, TRADES, CART_SUMMARIES, COMPLIANCE, CASES, ESCALATIONS, CERTIFICATIONS, TRACEABILITY, AI (data), HEALTH, LOGS, EVENTS, RBAC — all render real components with live API calls
- **DEAD NAV (4 items):** B2BShell sidebar: "🤝 Negotiations" (no onClick, no route), "📄 Invoices" (no onClick, no route); WhiteLabelShell nav: "Collections" (no onClick prop), "The Journal" (no onClick prop)
- **DEAD ACTION (7 buttons):** `AdminRBAC` — "Invite Admin" button (no onClick), per-row "Revoke" button (no onClick); `AiGovernance` — "AI Kill Switch" (no onClick), secondary action button(s) (no onClick); `AggregatorShell` header — "Post RFQ" (no onClick); B2B catalog content — "Create RFQ" (no onClick)
- **STATIC/INCORRECT (1):** B2CShell header cart `<span>3</span>` — hardcoded literal, not bound to `useCart().itemCount`; EXPERIENCE overlay `CartToggleButton` is correct but shell's own badge is static
- **PLACEHOLDER_PANEL (5):** `ArchitectureBlueprints`, `BackendSkeleton`, `ApiDocs`, `DataModel`, `MiddlewareScaffold` — all render hardcoded static content; no `useEffect`, no API calls; registered as primary nav destinations in SuperAdminShell
- **STUB (1):** `AdminRBAC` — reads `ADMIN_USERS` constant (hardcoded array from `constants.tsx`), not a live API; action buttons also dead (see above)
- **PARTIAL (1):** `AiGovernance` — live data via `getTenants()` → GET `/api/control/tenants`; but header action buttons have no `onClick` handler
- **UX tranche mapping:** PW5-U1 ← B2C cart badge fix; PW5-U2 ← dead tenant/storefront nav hide-gate (4 items); PW5-U3 ← dead control-plane action hide-gate (7 buttons + AdminRBAC stub); PW5-U4 ← collapse 5 PLACEHOLDER_PANEL nav destinations
- `tsc --noEmit` → TSC_EXIT:0 (no implementation files changed)
- Classification: **VERIFIED** — verification tranche complete (PW5-V1 through PW5-V4 all resolved)

---

### UX Correctness Tranche (Depends on PW5-V4)

| ID | Name | Status | Notes |
|---|---|---|---|
| PW5-U1 | B2C cart badge fix | ⏳ Pending | Cart badge appears for B2C-only contexts; should not be visible in tenant admin shell |
| PW5-U2 | Dead tenant/storefront nav hide-gate | ⏳ Pending | Nav items visible with no backend route or wired component; must be conditionally hidden |
| PW5-U3 | Dead control-plane action hide-gate | ⏳ Pending | Includes TECS-FBW-012 (edit access), TECS-FBW-ADMINRBAC, TECS-FBW-AIGOVERNANCE button surfaces |
| PW5-U4 | Collapse placeholder SuperAdmin spec panels | ✅ COMPLETE — 2026-03-09 | Removed static "Architecture & Specs" admin section. Deleted AdminView enum variants and 5 NavLink entries from SuperAdminShell.tsx. Removed unused imports and switch cases from App.tsx. Component files preserved on disk. Commit 3e2e14d. |

**PW5-U4 Evidence — Placeholder Panel Collapse**

* Removed 5 AdminView variants: API_DOCS, DATA_MODEL, BLUEPRINTS, BACKEND_SKELETON, MIDDLEWARE
* Removed Architecture & Specs sidebar section and all 5 NavLink entries
* Removed unused imports in App.tsx
* Removed dead switch cases in renderAdminView()
* Default case changed to return null
* Component files preserved on disk
* TypeScript validation: TSC_EXIT:0
* ESLint validation: LINT_EXIT:0
* Commit: 3e2e14d

---

### Wiring Tranche (Depends on Verification Tranche)

| ID | Name | Status | Notes |
|---|---|---|---|
| PW5-W1 | Tenant Trades UI | ⏳ BACKEND DESIGN GATE | `TECS-FBW-002-B` remains 🚫 BLOCKED. `GET /api/tenant/trades` does not exist as a tenant-plane route. No UI wiring is possible until route is designed and implemented under tenant-plane auth. |
| PW5-W2 | Control-plane Escrow inspection | ✅ CLOSED — 2026-03-10 | `EscrowAdminPanel.tsx` wired to `GET /api/control/escrows`; D-020-B enforced; `adminListEscrows()` implemented; typecheck EXIT 0 · lint EXIT 0. PW5-CP-PLAN confirmed read backend depth. |
| PW5-W3-BE | Control-plane Settlement admin read surface | ✅ CLOSED — 2026-03-12 | Commit: 14aea49 · `feat(control-plane): add settlement admin read route` · `GET /api/control/settlements` added in `server/src/routes/control/settlement.ts` · control-plane OpenAPI contract updated · backend-only tranche respected · no frontend wiring performed · no schema changes · no migration files · no detail endpoint. Historical context: prior three-layer absence (no AdminView token · no component · no GET route) partially resolved — backend read surface now exists; control-plane contract now exists; remaining work is frontend wiring only. Backend design gate removed. |
| PW5-W3-FE | Control-plane Settlement admin frontend wiring | ✅ CLOSED — 2026-03-12 | Commit: 8f4a685 · `feat(control-plane): add settlement admin frontend panel` · `SettlementAdminPanel.tsx` NEW — 8-column table, filter inputs, cursor pagination · `listSettlements()` added to `controlPlaneService.ts` · `SETTLEMENT_ADMIN` AdminView token + nav entry added to `SuperAdminShell.tsx` · case `'SETTLEMENT_ADMIN'` in `App.tsx` · typecheck EXIT 0 · lint EXIT 0. Runtime verification: PASS (PW5-W3-VERIFY ✅ 2026-03-12). PW5-W3 FULLY CLOSED. |
| PW5-W4 | Maker-Checker review console | ✅ CLOSED — 2026-03-10 | `MakerCheckerConsole.tsx` wired to `GET /api/control/internal/gov/approvals` (control-plane alias); read-only; sign/replay mutation wiring deferred (see MAKER-CHECKER-MUTATION-DEFERRED); typecheck EXIT 0 · lint EXIT 0. |

---

### PW5-W3 Non-Blocking Follow-Up Items — Recorded 2026-03-12

Entries below were recorded during PW5-W3 runtime verification (GOVERNANCE-SYNC-PW5-W3-VERIFY-GOV). None block PW5-W3 closure. All are deferred.

---

**PW5-W3-TYPE-ALIGN-001**  
Classification: NON-BLOCKING FOLLOW-UP  
Detected: PW5-W3-VERIFY · 2026-03-12  
Description: Settlement Admin `amount` field type alignment gap. `AdminSettlement.amount` is typed as `number` in `controlPlaneService.ts` but the server serializes the Prisma `Decimal` value via `.toString()`, returning a string. This is runtime-safe because `Intl.NumberFormat.format()` accepts string input in the rendering path. Resolution: align interface to `amount: string` or add `Number()` cast on the server side.  
Status: DEFERRED — non-blocking; no frontend or backend change in this unit.

---

**PW5-W3-TEST-001**  
Classification: NON-BLOCKING FOLLOW-UP  
Detected: PW5-W3-VERIFY · 2026-03-12  
Description: No dedicated integration test exists for `GET /api/control/settlements`. The existing `settlement.g019.integration.test.ts` covers S-001 through S-008 (POST routes only). A `S-009: GET /api/control/settlements returns 200 with paginated list` test case should be added, covering the admin auth guard, cursor pagination, and filter parameters.  
Status: DEFERRED — non-blocking test coverage follow-up; requires future TECS test unit.

---

**PW5-W3-PERF-INDEX**  
Classification: FUTURE PERFORMANCE UNIT  
Detected: PW5-W3-VERIFY · 2026-03-12  
Description: Missing partial compound index on `escrow_transactions` for settlement list cursor pagination. The GET route orders by `(created_at DESC, id DESC)` and uses a compound cursor predicate `(created_at < t) OR (created_at = t AND id < i)`. No `(created_at DESC, id DESC)` index exists on `escrow_transactions` in any applied migration. Existing indexes: `escrow_transactions_tenant_id_idx`, `escrow_transactions_escrow_id_idx`, `escrow_transactions_reference_id_idx` (partial). Recommended index SQL:  
`CREATE INDEX CONCURRENTLY escrow_transactions_settlement_list_idx ON public.escrow_transactions (created_at DESC, id DESC) WHERE entry_type = 'RELEASE' AND direction = 'DEBIT';`  
Status: FUTURE PERFORMANCE UNIT — non-blocking at current ledger volume; recommend applying before larger production ledger growth. Requires Prisma migration file + `prisma db pull` + `prisma generate`.

---

### White-Label Tranche

| ID | Name | Status | Notes |
|---|---|---|---|
| PW5-WL1 | WL storefront product grid | ⏳ Pending | White-label storefront product listing wiring |
| PW5-WL2 | WL storefront collections/category rendering | ⏳ Pending | Collections and category filter wiring |
| PW5-WL3 | WL builder requirements re-baseline | ⏳ Pending | Baseline requirements after audit — do not use pre-audit planning |

---

### Planning Tranche (Depends on Verification + UX Tranches)

| ID | Name | Status | Notes |
|---|---|---|---|
| PW5-CP-PLAN | Control-plane re-baseline | ✅ COMPLETE — 2026-03-10 | Read-only architectural baseline established. 17 panels reachable. Route map produced. Capability classification complete. 8 drift observations. 5 new gap entries. Governance sync: PW5-CP-PLAN-GOV. |
| PW5-AI-PLAN | AI/event backbone re-baseline | ✅ COMPLETE — 2026-03-13 | Read-only planning baseline established. Tenant AI route surface confirmed (GET /api/ai/insights · POST /api/ai/negotiation-advice · GET /api/ai/health). Event backbone confirmed for tenancy/team/marketplace domains. AI event domain absent from registry. Control-plane AI backend design gate preserved (TECS-FBW-AIGOVERNANCE). 9 drift observations registered. Follow-on units proposed: PW5-AI-EVENT-DOMAIN · PW5-AI-TIS-EXTRACT · PW5-AI-RATE-LIMIT · PW5-AI-IDEMPOTENCY · PW5-AI-NEGOTIATION-RAG. Governance sync: GOVERNANCE-SYNC-PW5-AI-PLAN. |
| PW5-AI-EVENT-DOMAIN | Register AI event domain (inference + vector) | ✅ COMPLETE — 2026-03-13 · VERIFIED_COMPLETE_WITH_FOLLOW_ON_NOTE | AI event domain registered. 9 AI event names added to KnownEventName and knownEventEnvelopeSchema. eventSchemas.ts created: 9 Zod payload schemas · EVENT_PAYLOAD_SCHEMAS · validateEventPayload(). AUDIT_ACTION_TO_EVENT_NAME unchanged. No emitters added. No projections. No routes/RLS/schema changes. validateEventPayload() not yet wired — intentional; not a defect. D-002 CLOSED. Emitter path remains open (PW5-AI-EMITTER). commit dd18957 · typecheck EXIT 0 · lint EXIT 0 · build EXIT 0. Governance sync: GOVERNANCE-SYNC-PW5-AI-EVENT-DOMAIN. |
| PW5-AI-EMITTER | Wire AI event emission runtime path | ✅ COMPLETE — 2026-03-13 · VERIFIED_COMPLETE_WITH_FOLLOW_ON_NOTE | Runtime AI event emission wired for approved current trigger points. `server/src/events/aiEmitter.ts` CREATED: `emitAiEventBestEffort()` helper implementing full validated chain (`validateEventPayload()` → `validateKnownEvent()` → `assertNoSecretsInPayload()` → `emitEventToSink()` → `storeEventBestEffort()` where `auditLogId` available); best-effort, non-blocking. `server/src/routes/ai.ts` MODIFIED: `ai.inference.generate` · `ai.inference.error` · `ai.inference.budget_exceeded` wired for both `/api/ai/insights` and `/api/ai/negotiation-advice` success/error/budget paths; success-path events include `auditLogId` for persistence. `server/src/services/ai/ragContextBuilder.ts` MODIFIED: `ai.vector.query` emitted after `querySimilar()` returns (sink-only). AUDIT_ACTION_TO_EVENT_NAME NOT modified. No projections, new routes, schema changes, or RLS changes. Persistence gated: success-path inference events persist to `EventLog` (captured `auditLogId` available); error/budget/vector events are sink-only (`EventLog.auditLogId NOT NULL @unique` implementation constraint). Deferred (no concrete synchronous runtime trigger): `ai.vector.upsert` · `ai.vector.delete` · `ai.inference.pii_redacted` · `ai.inference.pii_leak_detected` · `ai.inference.cache_hit`. Follow-on note: degraded-mode `generateContent()` returns `hadInferenceError: false` when Gemini unconfigured — pre-existing upstream behavior; not a defect of this unit. commit 73f0972 · typecheck EXIT 0 · lint EXIT 0 · build EXIT 0. Governance sync: GOVERNANCE-SYNC-PW5-AI-EMITTER. |
| PW5-AI-TIS-EXTRACT | Extract AI orchestration into Tenant Inference Service boundary | ✅ COMPLETE — 2026-03-13 · VERIFIED_COMPLETE_WITH_FOLLOW_ON_NOTE | Implementation closure recorded. AI orchestration extracted from `server/src/routes/ai.ts` into `server/src/services/ai/inferenceService.ts` (commit f2ae23b). Route layer now primarily handles auth/context, validation/parsing, service invocation, and response formatting. Preserved behavior: endpoint paths unchanged (`/api/ai/insights` · `/api/ai/negotiation-advice` · `/api/ai/health`), degraded-mode semantics unchanged, reasoning-log + audit-log transaction atomicity preserved, existing AI event emission behavior preserved via existing emitter path, and `ai.vector.query` remains in RAG retrieval path. Explicit non-actions preserved: no route/schema/RLS/event-schema/emitter-semantic widening; no PII/rate-limit/idempotency/caching feature additions. Governance interpretation: D-001 architectural concentration in route layer is materially reduced/resolved by the TIS boundary. Follow-on note (non-defect): static verification + typecheck/lint/build passed; live runtime verification remains pending operational runbook execution due to read-only verification unit scope. Governance sync: GOVERNANCE-SYNC-PW5-AI-TIS-EXTRACT. |

---

### PW5-CP-PLAN Architectural Drift Findings — Registered 2026-03-10

Entries below were identified during the PW5-CP-PLAN control-plane architecture re-baseline (read-only analysis, 2026-03-10). All entries are OPEN or DEFERRED with no code change required to register them.

---

**AI_GOV-BACKEND-001**  
Classification: PARTIAL — No Dedicated Backend Route  
Detected: PW5-CP-PLAN · 2026-03-10  
Description: `AiGovernance.tsx` derives AI budget data from `GET /api/control/tenants` (the shared tenants list endpoint) and displays a hardcoded static prompt registry array. No `/api/control/ai/*` route exists in `server/src/routes/`. The panel presents as an AI governance surface but its backend depth is a subset of the Tenants panel. Prompt registry is not persisted or configurable.  
Status: OPEN — design gate; requires product decision on AI governance data model before a backend route can be specified.

---

**RBAC-BACKEND-001**  
Classification: PARTIAL — No Live Backend API  
Detected: PW5-CP-PLAN · 2026-03-10  
Description: `AdminRBAC.tsx` renders exclusively from the `ADMIN_USERS` constant in `constants.tsx`. No `/api/control/rbac/*` or equivalent admin-user management route exists in the backend. Dead mutation buttons were gated in PW5-U3 (commit d5ee430, 2026-03-09) but the fundamental absence of live backend data was not documented in any governance artifact until this entry.  
Status: OPEN — design gate; requires canonical admin-user model decision (Admin table vs JWT-derived) before API surface can be specified.

---

**ESCROW-POST-001**  
Classification: INVESTIGATION REQUIRED — Undocumented Mutation Surface  
Detected: PW5-CP-PLAN · 2026-03-10  
Description: `server/src/routes/control/escrow.g018.ts` line 222 contains a `POST` handler in addition to the two confirmed GET routes (`GET /api/control/escrows` and `GET /api/control/escrows/:escrowId`). This mutation endpoint is not referenced in any frontend consumer, was not mentioned in the PW5-W2 governance closure, and is not documented in `openapi.control-plane.json`. Auth tier and idempotency posture are unverified.  
Status: OPEN — requires inspection of POST handler body to determine: (a) what entity it creates, (b) auth tier (adminAuthMiddleware only vs SUPER_ADMIN preHandler), (c) whether Idempotency-Key enforcement is present.

---

**TRADES-MUTATION-DEFERRED**  
Classification: INTENTIONAL DEFER — Backend-Ready, Frontend Not Wired  
Detected: PW5-CP-PLAN · 2026-03-10  
Description: `server/src/routes/control/trades.g017.ts` implements `POST /api/control/trades/:id/transition` but `TradeOversight.tsx` is strictly read-only per the PW5-W2 wiring tranche constraint. The transition mutation backend is idle from the user's perspective. This intentional deferral existed in code but was not documented in any governance artifact.  
Status: DEFERRED — frontend trade transition UI not yet designed; backend route is implemented and ready. Prerequisite for future wiring: confirm transition body schema, define confirm-before-submit UX pattern consistent with Finance/Compliance/Disputes authority intent pattern.

---

**MAKER-CHECKER-MUTATION-DEFERRED**  
Classification: INTENTIONAL DEFER — Backend-Ready, Frontend Not Wired  
Detected: PW5-CP-PLAN · 2026-03-10  
Description: `server/src/routes/internal/makerChecker.ts` implements `POST /api/control/internal/gov/approvals/:id/sign` and `POST /api/control/internal/gov/approvals/:id/replay` but `MakerCheckerConsole.tsx` exposes only the read surface per the PW5-W4 tranche constraint. Both mutation endpoints require `X-Texqtic-Internal: true` + admin JWT. This intentional deferral existed in code but was not documented in any governance artifact.  
Status: DEFERRED — sign/replay UI wiring deferred to a future TECS unit; backend routes are implemented and ready. Prerequisite: confirm SUPER_ADMIN vs ADMIN role tier for sign/replay; design idempotency-key generation pattern (same as Finance/Compliance authority pattern).

---

**OPENAPI-AI-SCOPE-001**  
Classification: CLOSED / RESOLVED (policy decision)  
Detected: SPEC-SYNC-GOV · 2026-03-10  
Resolved: OPENAPI-POLICY-DECISION-GOV · 2026-03-10  
Description: `/api/ai/insights`, `/api/ai/negotiation-advice`, and `/api/ai/health` currently remain in `openapi.tenant.json` pending explicit contract ownership decision. A dedicated `openapi.ai.json` does not exist in the repository; moving these routes to a non-existent file would create a broken reference. Governance must decide whether these routes belong to the tenant contract, a separate AI-specific contract, or a combined surface.  
Resolution: Retained in `openapi.tenant.json` as tenant-consumable cross-cutting product routes. Placement accepted. Future extraction to a dedicated AI contract remains allowed if AI contract ownership is formally re-baselined in a subsequent unit. No OpenAPI file changes were made in this decision-recording unit.  
Status: ✅ CLOSED — RESOLVED (policy decision) — no product code change, no spec file change.

---

**OPENAPI-IMPERSONATION-DOC-001**  
Classification: CLOSED / RESOLVED (policy decision)  
Detected: SPEC-SYNC-GOV · 2026-03-10  
Resolved: OPENAPI-POLICY-DECISION-GOV · 2026-03-10  
Description: `POST /api/control/impersonation/start` and `POST /api/control/impersonation/stop` are implemented runtime routes (registered in `server/src/routes/admin/impersonation.ts`, prefixed at `/api/control`) but are intentionally absent from `openapi.control-plane.json`. These are SUPER_ADMIN-only endpoints. Governance must decide whether these high-sensitivity endpoints should appear in the public control-plane OpenAPI contract, a restricted internal contract, or remain explicitly undocumented as a policy choice.  
Resolution: Impersonation routes remain intentionally excluded from the public `openapi.control-plane.json`. Their omission is accepted governance policy due to sensitive SUPER_ADMIN operational scope. Route truth is preserved in internal governance and verification artifacts (VER-004, gap-register). No OpenAPI file changes were made in this decision-recording unit.  
Status: ✅ CLOSED — RESOLVED (policy decision) — intentionally excluded from public contract; no product code change, no spec file change.

---

### Pre-Wave-5 Ordered Execution Sequence (Locked 2026-03-08)

| Step | Name | Status |
|---|---|---|
| 1 | Platform wiring audit | ✅ COMPLETE — 2026-03-08 |
| 2 | Navigation verification | ✅ COMPLETE — 2026-03-08 |
| 3 | Control-plane expansion planning | ✅ COMPLETE — 2026-03-10 — PW5-CP-PLAN baseline complete; PW5-CP-PLAN-GOV governance sync recorded |
| 4 | Tenant admin dashboard completion | ⏳ BLOCKED — verification + wiring tranches |
| 5 | White-label store builder | ⏳ BLOCKED — PW5-WL1 + PW5-WL2 |
| 6 | AI / event backbone (Wave 5 architecture) | 🔄 IN PROGRESS — PW5-AI-PLAN ✅ PLANNING COMPLETE (2026-03-13) · PW5-AI-EVENT-DOMAIN ✅ COMPLETE / VERIFIED (2026-03-13 · commit dd18957) · PW5-AI-EMITTER ✅ COMPLETE / VERIFIED_COMPLETE_WITH_FOLLOW_ON_NOTE (2026-03-13 · commit 73f0972) · PW5-AI-TIS-EXTRACT ✅ COMPLETE / VERIFIED_COMPLETE_WITH_FOLLOW_ON_NOTE (2026-03-13 · commit f2ae23b) · PW5-AI-RATE-LIMIT ✅ CLOSED VIA REMEDIATION (96ca710 → 4b96e13) · PW5-AI-IDEMPOTENCY ✅ CLOSED VIA REMEDIATION (84c185d → 536fe50; verification state VERIFIED_COMPLETE_WITH_FOLLOW_ON_NOTE). Replay no longer bypasses tenant rate limiting; replay semantics preserved; first-execution transaction/event semantics preserved; static verification follow-on note preserved as non-defect. Next proposed unit: PW5-AI-NEGOTIATION-RAG; TECS-FBW-AIGOVERNANCE remains REQUIRES_BACKEND_DESIGN |

Recommended immediate next proposed unit: **PW5-AI-PII-GUARD** — add pre-send and post-receive PII detection/redaction controls at the TIS boundary to address the previously recorded governance/security gap (D-005) around PII handling, building on the now-stable TIS, rate-limit, idempotency, and negotiation-RAG flow. D-009 is now closed: PW5-AI-NEGOTIATION-RAG is CLOSED / VERIFIED_COMPLETE_WITH_FOLLOW_ON_NOTE (commit de202c2). Do not mark PW5-AI-PII-GUARD implemented or authorized until separately prompted.

---

### Wave 5 Architecture Block Conditions (Non-Waivable)

Wave 5 architecture sequencing does not begin until all of the following are confirmed in governance:

- [x] **Verification tranche complete** — ✅ MET (2026-03-10) — PW5-V1 ✅ · PW5-V2 ✅ · PW5-V3 ✅ · PW5-V4 ✅ — all four verification units closed with runtime evidence
- [x] **Dead UI gating tranche complete** — ✅ MET (2026-03-10) — PW5-U1 ✅ · PW5-U2 ✅ · PW5-U3 ✅ · PW5-U4 ✅ — all four dead-UI gating units closed
- [x] **Platform wiring truth reconciled in tracker** — ✅ MET (2026-03-10) — PW5-CP-PLAN-GOV governance sync recorded; IMPLEMENTATION-TRACKER-2026-03.md updated; gap-register wiring/planning tranches updated

No agent, no prompt, and no implementation sprint may bypass these conditions.

---

### PW5-AI-PLAN Architectural Baseline — Wave 5 AI/Event Backbone Re-Baseline — 2026-03-13

**Governance sync:** GOVERNANCE-SYNC-PW5-AI-PLAN | **Date:** 2026-03-13 | **Type:** Planning Baseline — Read-Only

**Status: ✅ PLANNING COMPLETE — CLOSED AS BASELINE**

This entry records the authoritative Wave 5 AI/event architectural baseline established by the PW5-AI-PLAN planning unit (2026-03-13). No implementation occurred. No governance files, schemas, or routes were modified in this planning unit.

#### A — Tenant-Plane AI Inference Surface (Confirmed Operational)

| Route | File | Auth | Pattern |
|---|---|---|---|
| `GET /api/ai/insights` | `server/src/routes/ai.ts` | `tenantAuthMiddleware` + `databaseContextMiddleware` | Budget preflight → RAG retrieval → Gemini → usage upsert → reasoning_log + audit_log atomic write |
| `POST /api/ai/negotiation-advice` | `server/src/routes/ai.ts` | `tenantAuthMiddleware` + `databaseContextMiddleware` | Budget preflight → Gemini (no RAG) → usage upsert → reasoning_log + audit_log atomic write |
| `GET /api/ai/health` | `server/src/routes/ai.ts` | `tenantAuthMiddleware` (auth added by commit 960b736) | Provider/model status; no DB context |

- AI orchestration currently concentrated in `server/src/routes/ai.ts` (460 lines) — not yet extracted into dedicated TIS service boundary per G-028 §2.B  
- Model: Google Gemini 1.5 Flash via `@google/generative-ai` SDK  
- Budget enforcement: `aiBudget.ts` (monthly token/cost cap; `BudgetExceededError` → HTTP 429)  
- RAG: `ragContextBuilder.ts` wired into insights route only (G-028 A5)  
- Reasoning audit: G-023 `reasoning_logs` table; SHA-256 hash; atomic write with `audit_logs`  
- Frontend AI calls route through `services/aiService.ts` only; `services/geminiService.ts` deprecated

#### B — Event Backbone (Confirmed Operational; AI Domain Absent)

- Event backbone operational for tenancy/team/marketplace domains (9 `KnownEventName` entries)  
- Projection infrastructure: `events/projections/projector.ts` (functional, idempotent, sequential)  
- `events/handlers/index.ts` imports only one handler: `marketplace.projector.ts`  
- **AI domain events: NOT registered** — `ai.inference.*` / `ai.vector.*` event types are designed in G-028 spec but absent from `KnownEventName` and `AUDIT_ACTION_TO_EVENT_NAME` map  
- No AI-domain event emitters exist anywhere in the codebase

#### C — Control-Plane AI Governance Gate (Preserved Open)

- `TECS-FBW-AIGOVERNANCE` remains **REQUIRES_BACKEND_DESIGN** — not changed by this baseline  
- `AiGovernance.tsx` derives data from `GET /api/control/tenants`; authority action buttons gated/hidden (PW5-U3; commit d5ee430)  
- No dedicated `/api/control/ai/*` route exists  
- G-028 B/C wave (control-plane authority routes: kill switch, model cap, budget write) not started  
- **No control-plane AI implementation begins without an authorized design/execution unit**

#### D — Drift Observations Registered (D-001 through D-009)

| ID | Observation | Severity |
|---|---|---|
| D-001 | TIS not extracted from `ai.ts` monolith; G-028 §2.B intent not yet realized | Medium |
| D-002 | ~~AI domain events absent from `KnownEventName` and `AUDIT_ACTION_TO_EVENT_NAME`~~ — **CLOSED** — 9 AI event names registered in `KnownEventName` and `knownEventEnvelopeSchema`; `eventSchemas.ts` created (commit dd18957 · PW5-AI-EVENT-DOMAIN · 2026-03-13). `AUDIT_ACTION_TO_EVENT_NAME` not yet mapped (emitter wiring is PW5-AI-EMITTER). | ~~High~~ → **CLOSED (registry layer)** |
| D-003 | `vectorShadowQuery.ts` uses placeholder embedding (explicit TODO; real pipeline available) | Low |
| D-004 | ~~No per-tenant AI rate limiting (60 req/min per G-028 §6.3 spec)~~ — **CLOSED via remediation** — limiter present at TIS boundary with 60 req/min and 60_000ms window; initial verification failure (DEFECT-1 event-behavior leakage) corrected by PW5-AI-RATE-LIMIT-REMEDIATION; rate-limit path is now distinct from budget semantics and no longer emits `ai.inference.budget_exceeded` | ~~Medium~~ → **CLOSED** |
| D-005 | PII redaction pipeline (pre-send + post-receive) not implemented | Medium |
| D-006 | ~~`idempotency_key` absent from `reasoning_logs` schema (G-028 §3.3 specifies it)~~ — CLOSED via PW5-AI-IDEMPOTENCY + PW5-AI-IDEMPOTENCY-REMEDIATION using request-level idempotency at TIS boundary (`request_id = idem:<key>`), tenant-scoped replay lookup, 24-hour replay window, preserved replay semantics, and restored rate-limit ordering | Closed |
| D-007 | `AiGovernance.tsx` control-plane UI cosmetic; no dedicated AI backend (acknowledged design gate) | Acknowledged |
| D-008 | `GET /api/ai/health` auth-plane ambiguity now resolved (commit 960b736); minor notation retained | Low |
| D-009 | ~~`negotiation-advice` has no RAG injection; diverges from `insights` without documented rationale~~ — **CLOSED** — PW5-AI-NEGOTIATION-RAG (commit de202c2): negotiation-advice now calls governed `runRagRetrieval(tx, orgId, prompt)`; retrieved context injected into model prompt via same prepend pattern as insights; insights path unchanged; TIS ordering preserved | Closed |

#### E — Follow-On Units (Proposed; Not Authorized for Implementation)

| Unit ID | One-Line Description | Prerequisites |
|---|---|---|
| ✅ PW5-AI-EVENT-DOMAIN | ~~Register `ai.inference.*` and `ai.vector.*` event types in `KnownEventName` + `AUDIT_ACTION_TO_EVENT_NAME`~~ — **COMPLETE / VERIFIED** — 9 AI event names registered; `eventSchemas.ts` created; `AUDIT_ACTION_TO_EVENT_NAME` not yet mapped (deliberate — emission wiring is PW5-AI-EMITTER); commit dd18957 · 2026-03-13 | ✅ CLOSED |
| ✅ PW5-AI-EMITTER | ~~Wire AI event emission: import `validateEventPayload()`; construct and validate `EventEnvelope`; call `emitEventToSink()` + `storeEventBestEffort()` at authorized AI trigger points~~ — **COMPLETE / VERIFIED_COMPLETE_WITH_FOLLOW_ON_NOTE** — `aiEmitter.ts` created; `ai.inference.generate` · `ai.inference.error` · `ai.inference.budget_exceeded` live on both AI routes; `ai.vector.query` live in `runRagRetrieval()`; deferred AI events remain open; commit 73f0972 · 2026-03-13 | ✅ CLOSED |
| PW5-AI-TIS-EXTRACT | Extract AI orchestration from `ai.ts` into dedicated inference service boundary | PW5-AI-EVENT-DOMAIN recommended first |
| ✅ PW5-AI-RATE-LIMIT | ~~Implement per-tenant per-minute rate limiting on `/api/ai/*` routes (60 req/min)~~ — initial implementation complete (commit 96ca710) with failed verification due to DEFECT-1 (rate-limit rejection entered budget-exceeded emission path) | ✅ IMPLEMENTED (superseded by remediation) |
| ✅ PW5-AI-RATE-LIMIT-REMEDIATION | Separate rate-limit rejection from budget-exceeded semantics; preserve 429 + `AI_RATE_LIMIT_EXCEEDED`; preserve true budget behavior; prevent rate-limit path event emission | ✅ CLOSED / VERIFIED_COMPLETE_WITH_FOLLOW_ON_NOTE (commit 4b96e13) |
| ✅ PW5-AI-IDEMPOTENCY | Request-level idempotency implemented at TIS boundary using `request_id = idem:<key>` tenant-scoped 24-hour replay; initial verification failed due to replay-before-rate-limit ordering defect | ✅ IMPLEMENTED (superseded by remediation) |
| ✅ PW5-AI-IDEMPOTENCY-REMEDIATION | Restore authoritative rate-limit semantics by enforcing rate limit before replay lookup while preserving replay dedupe behavior and first-execution semantics | ✅ CLOSED / VERIFIED_COMPLETE_WITH_FOLLOW_ON_NOTE (commit 536fe50) |
| ✅ PW5-AI-NEGOTIATION-RAG | ~~Wire `runRagRetrieval()` into `negotiation-advice` handler~~ — **COMPLETE / VERIFIED_COMPLETE_WITH_FOLLOW_ON_NOTE** — negotiation-advice now calls `runRagRetrieval(tx, orgId, prompt)`; retrieved context augments model prompt via same prepend pattern as insights; TIS ordering preserved; insights unchanged; D-009 resolved | ✅ CLOSED / VERIFIED_COMPLETE_WITH_FOLLOW_ON_NOTE (commit de202c2) |
| PW5-AI-PII-GUARD | Add pre-send and post-receive PII detection/redaction controls at TIS boundary; address D-005 | PW5-AI-NEGOTIATION-RAG recommended first |
| PW5-G028-B1-CATALOG-INDEXER | Auto-index catalog item mutations via `enqueueVectorIndexJob()` | PW5-AI-EVENT-DOMAIN |
| PW5-G028-C-CONTROL-PLANE-AI | `PUT /api/control/ai-budget/:tenantId`, kill switch, model cap routes | Explicit design authorization + TECS-FBW-AIGOVERNANCE gate |
| PW5-SHADOW-QUERY-FIX | Replace placeholder embedding in `vectorShadowQuery.ts` with real `generateEmbedding()` | Low urgency |

**None of the above units are authorized for implementation by this baseline entry. Each requires a separate authorized execution unit.**

**Status: PW5-AI-PLAN ✅ CLOSED AS PLANNING BASELINE — 2026-03-13 — GOVERNANCE-SYNC-PW5-AI-PLAN**

---

### PW5-AI-RATE-LIMIT-REMEDIATION — Defect Closure Record — CLOSED 2026-03-14

**Governance sync:** GOVERNANCE-SYNC-PW5-AI-RATE-LIMIT-REMEDIATION | **Date:** 2026-03-14 | **Type:** Remediation + Verification Closure

**Verification result:** VERIFIED_COMPLETE_WITH_FOLLOW_ON_NOTE

**Atomic remediation commit:** 4b96e13 — `fix(ai): separate rate-limit rejection from budget-exceeded emission`

#### Corrected Defect

- DEFECT-1: initial PW5-AI-RATE-LIMIT implementation caused `AiRateLimitExceededError` to flow through budget-exceeded handling and emit `ai.inference.budget_exceeded`.

#### Corrected Final State

- Rate-limit rejection is now distinct from budget exhaustion semantics.
- Rate-limited requests return HTTP 429 with `error: "AI_RATE_LIMIT_EXCEEDED"`.
- Rate-limited requests no longer emit `ai.inference.generate`, `ai.inference.error`, or `ai.inference.budget_exceeded`.
- True budget exhaustion behavior is preserved for real `BudgetExceededError`.
- Rate-limit values remain unchanged: 60 requests per tenant per minute, 60_000ms window.

#### Explicit Non-Actions

- No Prisma/schema changes.
- No event schema changes.
- No new event names.
- No emitter definition changes.
- No route-path changes.
- No governance edits were performed during runtime implementation units.

#### Verification Note (Non-Defect)

- Verification completed through static code-path inspection.
- No live runtime probe was introduced in the read-only verification unit.
- This is recorded as a follow-on evidence note, not a failure condition.

#### Governance Implication

- `PW5-AI-RATE-LIMIT` is effectively CLOSED via remediation.
- Request-frequency drift D-004 is now governance-closed.
- Future enhancements remain separate units.
- **Next proposed unit:** `PW5-AI-IDEMPOTENCY` (not implemented; not authorized by this record).

---

### PW5-AI-NEGOTIATION-RAG — Implementation + Verification Closure — CLOSED 2026-03-14

**Governance sync:** GOVERNANCE-SYNC-PW5-AI-NEGOTIATION-RAG | **Date:** 2026-03-14 | **Type:** Implementation + Verification Closure

**Verification result:** VERIFIED_COMPLETE_WITH_FOLLOW_ON_NOTE

**Implementation commit:** de202c2 — `feat(ai): add RAG retrieval to negotiation advice`

#### What This Unit Accomplished

- The negotiation-advice path inside TIS (`server/src/services/ai/inferenceService.ts`) now calls the same governed retrieval helper used by insights: `runRagRetrieval(tx, orgId, prompt)` — imported from `./ragContextBuilder.js`. No duplication; no alternative path.
- Retrieved context is injected into the actual prompt sent to the model using the same prepend pattern as insights: `${ragResult.contextBlock}\n\n${prompt}`.
- Fallback to original `prompt` when retrieval is unavailable (feature flag off, error, or no context returned).
- Latency instrumentation applied consistently: `startTimer` / `markRetrievalStart` / `recordRetrievalLatency` / `markInferenceStart` / `recordInferenceLatency` / `recordTotalLatency` — consistent with insights path.
- `reasoningHash`, `promptSummary`, and other prompt-derived stored artifacts now reflect the actual final prompt sent to the model (previously reflected only the base prompt).

#### Preserved Behavior

- `ai.vector.query` continues to originate from the retrieval layer (`ragContextBuilder.ts`) and was not reimplemented in TIS.
- Established TIS execution order fully preserved: rate limit → idempotency replay → RAG retrieval → model invocation → reasoning/audit log creation → post-transaction event emission.
- Insights path (`if (taskType === 'insights')` branch) structurally identical and unchanged.
- Route contracts unchanged: `/api/ai/negotiation-advice`, `/api/ai/insights`, `/api/ai/health`.
- Existing event semantics, rate-limit semantics, idempotency semantics, and degraded-mode semantics all unchanged.

#### Explicit Non-Actions

- No Prisma/schema changes.
- No event schema changes.
- No new event names.
- No emitter definition changes.
- No rate-limit logic changes.
- No idempotency logic changes.
- No route-path changes.
- No governance edits were performed during runtime implementation units.

#### Verification Note (Non-Defect)

- Verification completed through static code-path inspection.
- No live runtime probe was introduced in the read-only verification unit.
- Live vector-flag / retrieval round-trip confirmation remains an operational follow-on, not a failure condition.
- This is consistent with the verification convention established for PW5-AI-EMITTER, PW5-AI-TIS-EXTRACT, PW5-AI-RATE-LIMIT-REMEDIATION, and PW5-AI-IDEMPOTENCY-REMEDIATION.

#### Governance Implication

- `PW5-AI-NEGOTIATION-RAG` is CLOSED with verification state recorded.
- D-009 is now closed: negotiation-advice uses the governed retrieval backbone.
- Negotiation and insights now share the governed `runRagRetrieval()` retrieval pattern at the TIS layer.
- Future negotiation AI enhancements remain separate work, not part of this closure.
- **Next proposed unit:** `PW5-AI-PII-GUARD` — add PII detection/redaction controls at TIS boundary; addresses D-005 (proposed only; not implemented, not authorized by this record).

---

### PW5-AI-NEGOTIATION-RAG — Implementation + Verification Closure — CLOSED 2026-03-14

**Governance sync:** GOVERNANCE-SYNC-PW5-AI-NEGOTIATION-RAG | **Date:** 2026-03-14 | **Type:** Implementation + Verification Closure

**Verification result:** VERIFIED_COMPLETE_WITH_FOLLOW_ON_NOTE

**Implementation commit:** de202c2 — `feat(ai): add RAG retrieval to negotiation advice`

#### What This Unit Accomplished

- The negotiation-advice path inside TIS (`server/src/services/ai/inferenceService.ts`) now calls the same governed retrieval helper used by insights: `runRagRetrieval(tx, orgId, prompt)` — imported from `./ragContextBuilder.js`. No duplication; no alternative path.
- Retrieved context is injected into the actual prompt sent to the model using the same prepend pattern as insights: `${ragResult.contextBlock}\n\n${prompt}`.
- Fallback to original `prompt` when retrieval is unavailable (feature flag off, error, or no context returned).
- Latency instrumentation applied consistently: `startTimer` / `markRetrievalStart` / `recordRetrievalLatency` / `markInferenceStart` / `recordInferenceLatency` / `recordTotalLatency` — consistent with insights path.
- `reasoningHash`, `promptSummary`, and other prompt-derived stored artifacts now reflect the actual final prompt sent to the model (previously reflected only the base prompt).

#### Preserved Behavior

- `ai.vector.query` continues to originate from the retrieval layer (`ragContextBuilder.ts`) and was not reimplemented in TIS.
- Established TIS execution order fully preserved: rate limit → idempotency replay → RAG retrieval → model invocation → reasoning/audit log creation → post-transaction event emission.
- Insights path (`if (taskType === 'insights')` branch) structurally identical and unchanged.
- Route contracts unchanged: `/api/ai/negotiation-advice`, `/api/ai/insights`, `/api/ai/health`.
- Existing event semantics, rate-limit semantics, idempotency semantics, and degraded-mode semantics all unchanged.

#### Explicit Non-Actions

- No Prisma/schema changes.
- No event schema changes.
- No new event names.
- No emitter definition changes.
- No rate-limit logic changes.
- No idempotency logic changes.
- No route-path changes.
- No governance edits were performed during runtime implementation units.

#### Verification Note (Non-Defect)

- Verification completed through static code-path inspection.
- No live runtime probe was introduced in the read-only verification unit.
- Live vector-flag / retrieval round-trip confirmation remains an operational follow-on, not a failure condition.
- This is consistent with the verification convention established for PW5-AI-EMITTER, PW5-AI-TIS-EXTRACT, PW5-AI-RATE-LIMIT-REMEDIATION, and PW5-AI-IDEMPOTENCY-REMEDIATION.

#### Governance Implication

- `PW5-AI-NEGOTIATION-RAG` is CLOSED with verification state recorded.
- D-009 is now closed: negotiation-advice uses the governed retrieval backbone.
- Negotiation and insights now share the governed `runRagRetrieval()` retrieval pattern at the TIS layer.
- Future negotiation AI enhancements remain separate work, not part of this closure.
- **Next proposed unit:** `PW5-AI-PII-GUARD` — add PII detection/redaction controls at TIS boundary; addresses D-005 (proposed only; not implemented, not authorized by this record).

---

### PW5-AI-IDEMPOTENCY-REMEDIATION — Defect Closure Record — CLOSED 2026-03-14

**Governance sync:** GOVERNANCE-SYNC-PW5-AI-IDEMPOTENCY-REMEDIATION | **Date:** 2026-03-14 | **Type:** Remediation + Verification Closure

**Verification result:** VERIFIED_COMPLETE_WITH_FOLLOW_ON_NOTE

**Atomic remediation commit:** 536fe50 — `fix(ai): apply rate limiting before idempotent replay`

#### Corrected Defect

- Initial PW5-AI-IDEMPOTENCY implementation allowed replay return before tenant rate-limit enforcement.
- That ordering changed the authoritative semantics of PW5-AI-RATE-LIMIT.

#### Corrected Final State

- TIS ordering is now: normalize idempotency key → enforce tenant rate limit → replay lookup.
- Replay hit now returns only after rate-limit enforcement.
- Replay behavior preserved: stored logical result returned; no Gemini/model invocation; no new reasoning-log creation; no new audit-log creation; no inference event re-emission.
- 24-hour replay logic remains intact.
- Idempotency-Key route/header contract remains unchanged.
- First-execution transactional reasoning/audit flow and post-transaction inference event emission remain unchanged.
- Rate-limit values remain unchanged: 60 requests per tenant per minute, 60_000ms window.

#### Explicit Non-Actions

- No Prisma/schema changes.
- No event schema changes.
- No new event names.
- No emitter definition changes.
- No route-path changes.
- No rate-limit value changes.
- No governance edits were performed during runtime implementation units.

#### Verification Note (Non-Defect)

- Verification completed through static code-path inspection.
- No live runtime probe was introduced in the read-only verification unit.
- This is recorded as a follow-on evidence note, not a failure condition.

#### Governance Implication

- `PW5-AI-IDEMPOTENCY-REMEDIATION` is CLOSED with verification state recorded.
- `PW5-AI-IDEMPOTENCY` is effectively CLOSED via remediation.
- Corrected idempotency behavior is now authoritative in governance.
- Future idempotency enhancements remain separate work, not part of this closure.
- **Next proposed unit:** `PW5-AI-NEGOTIATION-RAG` (proposed only; not implemented, not authorized by this record).

---

### PW5-AI-EVENT-DOMAIN — AI Event Domain Registration — CLOSED 2026-03-13

**Governance sync:** GOVERNANCE-SYNC-PW5-AI-EVENT-DOMAIN | **Date:** 2026-03-13 | **Type:** Implementation + Verification Closure

**Verification result:** VERIFIED_COMPLETE_WITH_FOLLOW_ON_NOTE

**Commit:** dd18957 — `feat(events): register AI event domain (inference + vector)`

#### What This Unit Accomplished

| Artifact | Change |
|---|---|
| `server/src/lib/events.ts` | `KnownEventName` union extended with 9 AI event names; `knownEventEnvelopeSchema` Zod enum extended with same 9 names |
| `server/src/events/eventSchemas.ts` | NEW — 9 Zod payload schemas (`AiInferenceGeneratePayload` through `AiVectorQueryPayload`); `EVENT_PAYLOAD_SCHEMAS` registry; `validateEventPayload()` helper |

#### AI Event Names Registered

Inference domain: `ai.inference.generate` · `ai.inference.error` · `ai.inference.budget_exceeded` · `ai.inference.pii_redacted` · `ai.inference.pii_leak_detected` · `ai.inference.cache_hit`

Vector domain: `ai.vector.upsert` · `ai.vector.delete` · `ai.vector.query`

#### What This Unit Explicitly Did NOT Do

- ❌ Did not emit AI events
- ❌ Did not modify `AUDIT_ACTION_TO_EVENT_NAME`
- ❌ Did not add AI projections or event consumers
- ❌ Did not modify routes, RLS, Prisma schema, or migration files
- ❌ Did not wire `validateEventPayload()` into runtime emission path (intentional — not a defect)
- ❌ Did not modify `ai.ts`

#### Follow-On Note (Preserved)

`validateEventPayload()` exists in `eventSchemas.ts` and is not currently imported or called anywhere in the runtime. This is intentional per unit boundary. AI event emission remains a separate TECS unit: **PW5-AI-EMITTER**.

#### Validation Gates

| Gate | Result |
|---|---|
| `pnpm typecheck` | ✅ PASS — zero errors |
| `pnpm lint` | ✅ PASS — 0 errors; 108 pre-existing warnings; no warnings in changed files |
| `pnpm build` | ✅ PASS — zero errors |

**Status: PW5-AI-EVENT-DOMAIN ✅ CLOSED — 2026-03-13 — GOVERNANCE-SYNC-PW5-AI-EVENT-DOMAIN**

**D-002 GAP STATUS: CLOSED (registry layer complete) — emitter path now also CLOSED (PW5-AI-EMITTER ✅ COMPLETE)**

**Next proposed unit: PW5-AI-TIS-EXTRACT — extract AI orchestration into dedicated inference service boundary**

---

### PW5-AI-EMITTER — AI Event Emission Runtime Wiring — CLOSED 2026-03-13

**Governance sync:** GOVERNANCE-SYNC-PW5-AI-EMITTER | **Date:** 2026-03-13 | **Type:** Implementation + Verification Closure

**Verification result:** VERIFIED_COMPLETE_WITH_FOLLOW_ON_NOTE

**Commit:** 73f0972 — `feat(events): wire AI event emission runtime path`

#### What This Unit Accomplished

| Artifact | Change |
|---|---|
| `server/src/events/aiEmitter.ts` | NEW — `emitAiEventBestEffort()` helper: full validated emission chain; best-effort, non-blocking; `AiEventOpts` interface (`orgId`, `actorId?`, `timestamp?`, `auditLogId?`, `prisma?`) |
| `server/src/routes/ai.ts` | MODIFIED — import added; `generateContent()` return type extended with `hadInferenceError: boolean`; `auditLog.id` captured from committed tx; `ai.inference.generate` / `ai.inference.error` / `ai.inference.budget_exceeded` wired on both routes |
| `server/src/services/ai/ragContextBuilder.ts` | MODIFIED — import added; `ai.vector.query` emitted after `querySimilar()` returns |

#### Trigger Points Wired

| Route / Path | Event Emitted | Persistence |
|---|---|---|
| `/api/ai/insights` success path | `ai.inference.generate` | ✅ persists (auditLogId captured) |
| `/api/ai/insights` inference failure | `ai.inference.error` | sink-only |
| `/api/ai/insights` budget rejection | `ai.inference.budget_exceeded` | sink-only |
| `/api/ai/negotiation-advice` success path | `ai.inference.generate` | ✅ persists (auditLogId captured) |
| `/api/ai/negotiation-advice` inference failure | `ai.inference.error` | sink-only |
| `/api/ai/negotiation-advice` budget rejection | `ai.inference.budget_exceeded` | sink-only |
| `runRagRetrieval()` vector query path | `ai.vector.query` | sink-only |

#### Emission Chain Confirmed

`validateEventPayload()` → build `EventEnvelope` (randomUUID, v1, entity=`orgId`, realm=TENANT, actor=SYSTEM) → `validateKnownEvent()` → `assertNoSecretsInPayload()` → `emitEventToSink()` → `storeEventBestEffort()` (gated on `auditLogId + prisma`)

#### Persistence Boundary

`EventLog.auditLogId NOT NULL @unique` FK to `AuditLog` is an implementation constraint. Only routes that create an `AuditLog` row inside a committed transaction have a valid `auditLogId` to pass. Error paths and RAG retrieval fire outside a committed audit-log context — sink-only is correct, not a regression.

#### What This Unit Explicitly Did NOT Do

- ❌ Did not modify `AUDIT_ACTION_TO_EVENT_NAME`
- ❌ Did not add AI projections or event consumers
- ❌ Did not add new routes
- ❌ Did not change Prisma schema or RLS
- ❌ Did not wire `ai.vector.upsert` or `ai.vector.delete` (async queue path — no concrete sync trigger)
- ❌ Did not wire `ai.inference.pii_redacted`, `ai.inference.pii_leak_detected`, or `ai.inference.cache_hit` (no active runtime implementations)
- ❌ Did not implement control-plane AI governance

#### Deferred Items (Intentional — No Approved Runtime Trigger)

| Event Name | Reason Deferred |
|---|---|
| `ai.vector.upsert` | Gated behind async in-process queue (`vectorIndexQueue.ts`); no synchronous trigger available |
| `ai.vector.delete` | Same as above |
| `ai.inference.pii_redacted` | No active PII redaction pipeline in codebase |
| `ai.inference.pii_leak_detected` | No active PII detection pipeline in codebase |
| `ai.inference.cache_hit` | No inference caching implementation in codebase |

#### Follow-On Note (Preserved from Verification)

When `genAI` is null (Gemini SDK unconfigured), `generateContent()` returns a degraded text response with `hadInferenceError: false`. As a result, the success path emits `ai.inference.generate` even for a no-op fallback. This is pre-existing upstream behavior and was not introduced by PW5-AI-EMITTER. Correcting this requires a separate scoped unit (likely within PW5-AI-TIS-EXTRACT). This note does not reopen PW5-AI-EMITTER or convert it to a failed unit.

#### Validation Gates

| Gate | Result |
|---|---|
| `pnpm typecheck` | ✅ PASS — zero errors |
| `pnpm lint` | ✅ PASS — 0 errors; 108 pre-existing warnings; no warnings in changed files |
| `pnpm build` | ✅ PASS — zero errors |

**Status: PW5-AI-EMITTER ✅ CLOSED — 2026-03-13 — GOVERNANCE-SYNC-PW5-AI-EMITTER**

**Runtime AI emission gap: CLOSED for current trigger coverage — deferred AI event types remain open**

**Next proposed unit: PW5-AI-TIS-EXTRACT — extract AI orchestration into dedicated inference service boundary**
