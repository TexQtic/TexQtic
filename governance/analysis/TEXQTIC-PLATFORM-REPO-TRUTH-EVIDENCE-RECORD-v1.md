# TEXQTIC-PLATFORM-REPO-TRUTH-EVIDENCE-RECORD-v1

## 1. Title and Artifact Purpose

This artifact preserves validated repo-only platform truth for TexQtic.

It is evidence-first, pre-reconciliation, and non-sequencing.

It does not itself:

- update live sequencing posture
- select the next unit
- reconcile older governance truth
- authorize implementation
- authorize a product-facing opening

This file must be consumed before any later governance reconciliation of older broad product-truth
surfaces so that reconciliation compares governance-recorded truth against a preserved repo-truth
evidence record rather than against memory or compressed summary.

## 2. Scope and Method

The underlying pass that produced this evidence record:

- was repo-first
- did not consult governance documents during Phase 1
- validated repo truth across database, backend, frontend, wiring, runtime-sensitive surfaces,
  placeholders, TODOs, stubs, and bounded-only surfaces
- classified findings using bounded evidence-aware categories
- did not perform governance reconciliation in the evidence pass

This artifact preserves the output of that pass as-is.

## 3. Validated Report Body

```text
1. Status
PLATFORM_REALITY_VALIDATED_WITH_ACTIONABLE_EVIDENCE

2. Executive Reality Summary
This repo-first pass validates TexQtic as a real multi-tenant commerce/governance platform with broad schema depth, substantial tenant and control-plane route coverage, and multiple genuinely wired frontend-to-backend flows. It is not a thin shell, not a mostly-mock admin console, and not a schema-only platform.

The equally important counterpoint is that repo breadth does not equal family completion. A large number of surfaces are intentionally bounded, read-only, preview-only, supervision-only, or mode-limited. The strongest false-completion risk is not “nothing is real”; it is “real bounded capabilities can be mistaken for full family completion.”

This report is repo-only and evidence-first. No governance reconciliation is performed here.

3. Platform Evidence Register
Foundational schema / lifecycle model
Primary classification: DB_PRESENT_BUT_NOT_RUNTIME_COMPLETE
Confidence level: high
Evidence:

schema.prisma: Tenant, User, Membership, Invite, AdminUser, AuditLog, EventLog, FeatureFlag, AiBudget, AiUsageMeter, and ImpersonationSession prove broad structural support for identity, governance, control-plane, and AI budgeting. Proof level: structural.
schema.prisma: CatalogItem, Cart, CartItem, Order, OrderItem, Rfq, RfqSupplierResponse, Trade, LifecycleState, AllowedTransition, PendingApproval, ApprovalSignature, Certification, TraceabilityNode, TraceabilityEdge, escrow tables, sanctions, and DocumentEmbedding prove broad structural support across commerce, approvals, compliance, finance-state, and AI/vector features. Proof level: structural.
tenant.ts:2077, tenant.ts:2240, and control.ts:769: selected schema families are consumed by real routes, proving the schema is not purely speculative. Proof level: wiring.
What is validated as real: TexQtic has a genuinely large domain model with lifecycle, audit, approval, finance-state, compliance, and AI-related tables behind real routes.
What remains partial / bounded / unclear: schema breadth exceeds runtime proof. Some families are structurally present but were not proven end-to-end in this pass.
False-completion risk: model/table presence alone would materially overstate runtime completeness.

Identity / tenancy / workspace continuity / tenant entry
Primary classification: VALIDATED_PARTIAL
Confidence level: high
Evidence:

auth.ts:73: unified login route branches tenant vs admin, rate-limits tenant login, checks membership, checks email verification, and blocks inactive tenants. Proof level: runtime-confidence.
public.ts:35 and public.ts:89: public tenant resolution by slug and by email proves server-backed tenant discovery for login selection. Proof level: wiring.
authService.ts: client wrappers for login, public tenant resolution, current-user fetch, forgot/reset password, and verify email prove frontend wiring into the auth/public routes. Proof level: wiring.
App.tsx:405: canonical shell resolution by tenant category and white-label flag proves runtime mode assignment is policy-driven, not ad hoc. Proof level: wiring.
App.tsx:1494: handleAuthSuccess hydrates tenant context through /api/me, fail-closes if hydration fails, and routes WL-admin separately from tenant experience. Proof level: runtime-confidence.
tenant.ts:397: /api/me rejects wrong/malformed realm state and returns an explicit “organisation not yet provisioned” 404 instead of hanging. Proof level: runtime-confidence.
What is validated as real: realm-based login, tenant lookup for login, tenant shell routing, current-user hydration, and fail-closed tenant bootstrap are materially implemented.
What remains partial / bounded / unclear: this pass did not prove every cross-realm cleanup edge.
False-completion risk: working login/bootstrap code should not be misread as proof that every impersonation/session edge case is solved. The adjacent impersonation cleanup residue remains separate and was not absorbed into this classification.

Onboarding / provisioning / handoff
Primary classification: VALIDATED_PARTIAL
Confidence level: high
Evidence:

OnboardingFlow.tsx: multi-step activation form captures org data, account setup, mode selection, and verification details. Proof level: structural.
App.tsx:3149: onboarding submit path calls tenant activation, stores the JWT, then rehydrates tenant state through getCurrentUser. Proof level: wiring.
tenantService.ts: activateTenant() proves a dedicated client seam into /api/tenant/activate. Proof level: wiring.
tenant.ts:2451: activation route validates invite token, creates or finds user, creates membership, updates organization verification state, writes audit, and returns a tenant JWT. Proof level: runtime-confidence.
TenantRegistry.tsx:41 and controlPlaneService.ts:342: control-plane tenant registry can submit provisioning requests from the UI. Proof level: wiring.
tenantProvision.ts:153: SUPER_ADMIN or approved-onboarding service-token provisioning route proves canonical provisioning is live server-side. Proof level: runtime-confidence.
control.ts:263 and control.ts:397: onboarding outcome recording and approved-activation routes exist in the control plane. Proof level: structural.
What is validated as real: invite activation, admin tenant provisioning, and onboarding outcome/activation seams are materially present across client and server.
What remains partial / bounded / unclear: full operator workflow maturity still needs runtime validation; the registry empty-state copy still says provisioning “will be enabled,” which lags actual wiring.
False-completion risk: form plus route plus service does not, by itself, prove production-grade operator smoothness.

B2C storefront / entry / browse continuity
Primary classification: VALIDATED_PARTIAL
Confidence level: high
Evidence:

App.tsx:1057: non-WL B2C HOME is explicitly identified as the browse-entry surface, with authenticated affordances hidden on that path. Proof level: wiring.
App.tsx:1178: B2C browse state drives a debounced catalog fetch with query support. Proof level: wiring.
App.tsx:2807: See All / Load More logic is tied to loaded product state and cursor availability, not decorative shell text. Proof level: runtime-confidence.
App.tsx:2830: Shop Now scrolls to the catalog section rather than acting as a dead button. Proof level: runtime-confidence.
tenant.ts:720 and catalogService.ts: catalog query route and client wrapper prove B2C browse is data-backed. Proof level: wiring.
App.tsx:2912: prior decorative “Explore the Collection” affordance was explicitly removed. Proof level: runtime-confidence.
What is validated as real: B2C browse-entry continuity, search-backed loading, and entry-surface honesty are materially real in repo truth.
What remains partial / bounded / unclear: this validates browse-entry continuity, not the whole downstream B2C transaction family.
False-completion risk: B2C shell presence could still be misread as proof of complete consumer-commerce depth.

B2B exchange / commercial flows
Primary classification: VALIDATED_PARTIAL
Confidence level: high
Evidence:

tenant.ts:1406, tenant.ts:1466, tenant.ts:1742, and tenant.ts:1814: buyer RFQ list/detail/create and supplier inbox/respond routes exist. Proof level: structural.
catalogService.ts: RFQ client wrappers for create, list, detail, inbox, and respond prove the frontend seam into those routes. Proof level: wiring.
TradesPanel.tsx:15: tenant trade UI explicitly exposes existing lifecycle transition routes. Proof level: runtime-confidence.
BuyerRfqDetailSurface.tsx:162 and BuyerRfqDetailSurface.tsx:522: RFQ detail surfaces still contain “not available right now” states, which is direct evidence of incompleteness inside the family. Proof level: runtime-confidence.
What is validated as real: RFQ creation, RFQ inbox/detail handling, and trade lifecycle exposure are materially present.
What remains partial / bounded / unclear: this pass did not validate a fully complete negotiation/commercial loop across all exchange states.
False-completion risk: exchange shell depth and route count could overstate negotiation/commercial continuity.

White-label admin + storefront overlay
Primary classification: VALIDATED_PARTIAL
Confidence level: high
Evidence:

App.tsx:2332: active WL-admin content renders Branding, Products, Collections, Orders, and Domains instead of a generic stub path. Proof level: wiring.
App.tsx:2610: WL storefront HOME renders WLStorefront with RFQ and buyer-RFQ callbacks. Proof level: wiring.
WLStorefront.tsx:26: WL storefront owns catalog fetch, product detail, client-side search, and add-to-cart/RFQ hooks. Proof level: wiring.
WLStorefront.tsx:45: remote/debounced search is explicitly not implemented. Proof level: runtime-confidence.
WLStorefront.tsx:258 and App.tsx:2611: “View My RFQs” and request-quote behavior are wired, not decorative. Proof level: runtime-confidence.
WLProductDetailPage.tsx:269: if no cart handler is supplied, the page can fall back to a disabled placeholder. Proof level: runtime-confidence.
WLCollectionsPanel.tsx:8: collections panel is intentionally read-only. Proof level: runtime-confidence.
WLDomainsPanel.tsx:12: platform domain is read-only, but custom domain add/remove is live. Proof level: runtime-confidence.
WLStubPanel.tsx:2: explicit historical WL stub residue remains in the tree. Proof level: structural.
What is validated as real: WL storefront and multiple WL-admin surfaces are real and wired.
What remains partial / bounded / unclear: WL search is client-side only; some admin surfaces are read-only; full gallery/cart depth is bounded.
False-completion risk: old stub residue can make WL look thinner than active runtime, while the active WL shell can also overstate depth if read as full family completion.

Aggregator discovery / workspace
Primary classification: BOUNDED_ONLY
Confidence level: high
Evidence:

tenant.ts:668: aggregator discovery route exists, is auth-scoped, and is explicitly limited to AGGREGATOR / INTERNAL tenants. Proof level: runtime-confidence.
App.tsx:1060: aggregator discovery is only mounted on the intended entry surface. Proof level: wiring.
AggregatorDiscoveryWorkspace.tsx: data-backed discovery workspace includes trust cues, AI insight, and loading/error states. Proof level: runtime-confidence.
What is validated as real: curated discovery workspace and intent-context entry are real.
What remains partial / bounded / unclear: no repo proof here of full aggregator orchestration, network operations, or broader execution ownership.
False-completion risk: shell presence and broad mode language can overstate the runtime.

Catalog / discovery / search
Primary classification: VALIDATED_PARTIAL
Confidence level: high
Evidence:

catalogService.ts: catalog query, cursoring, CRUD, and RFQ-adjacent wrappers are all present. Proof level: structural.
tenant.ts:720: catalog read route supports q, limit, and cursor under tenant auth and db context. Proof level: runtime-confidence.
tenant.ts:785: catalog create route has OWNER/ADMIN gating, writes audit, and enqueues vector ingestion. Proof level: runtime-confidence.
App.tsx:1178: B2C search actually affects the query sent to the catalog route. Proof level: wiring.
WLSearchBar.tsx:16: WL search explicitly omits autocomplete, remote search, and debounced network fetch. Proof level: runtime-confidence.
What is validated as real: catalog read/write and search-backed discovery are materially present.
What remains partial / bounded / unclear: mode-specific search behavior is uneven, and there is no proof here of complete cross-mode discovery maturity.
False-completion risk: catalog CRUD presence could be mistaken for solved merchandising/search family depth.

Orders / checkout / cart / post-purchase continuity
Primary classification: VALIDATED_PARTIAL
Confidence level: high
Evidence:

tenant.ts:2077: checkout converts cart to order, computes totals, writes audit, and records initial lifecycle state. Proof level: runtime-confidence.
tenant.ts:2240: order list/detail includes items and recent lifecycle history. Proof level: runtime-confidence.
tenant.ts:2320: order status transition route exists and maps semantic state into the current DB enum/lifecycle log model. Proof level: runtime-confidence.
WLOrdersPanel.tsx: WL admin exposes order list/status operations on top of those endpoints. Proof level: wiring.
schema.prisma: Order, OrderItem, Cart, CartItem, MarketplaceCartSummary, and lifecycle log tables structurally support this family. Proof level: structural.
What is validated as real: cart-to-checkout-to-order continuity and bounded lifecycle progression are materially implemented.
What remains partial / bounded / unclear: full operational confidence still requires runtime validation; broader fulfillment/billing depth is not equally proven.
False-completion risk: order panels can overstate the maturity of the whole downstream commerce family.

Payments / escrow / settlement
Primary classification: VALIDATED_PARTIAL
Confidence level: medium
Evidence:

EscrowPanel.tsx:4: tenant escrow UI includes list plus mutation/transition surfaces. Proof level: runtime-confidence.
escrowService.ts:4: comments preserve earlier read-only tranche language while the same file exposes detail/create/transaction/transition calls. Proof level: structural.
SettlementPreview.tsx:17: two-phase preview-confirm settlement UI is present. Proof level: runtime-confidence.
SettlementPreview.tsx:20: AI-triggered path, maker-checker role selection UI, and control-plane settlement are explicitly out of scope. Proof level: runtime-confidence.
EscrowAdminPanel.tsx:2: control-plane escrow is explicitly read-only. Proof level: runtime-confidence.
schema.prisma: escrow accounts/transactions and settlement-adjacent tables are structurally present. Proof level: structural.
What is validated as real: tenant escrow and settlement preview/commit paths are more than placeholder logic.
What remains partial / bounded / unclear: admin/control-plane depth is largely read-only; payment/settlement authority is intentionally constrained.
False-completion risk: finance-state schema breadth could be misread as proof of full money-movement operations.

Compliance / certifications / traceability / audit
Primary classification: VALIDATED_PARTIAL
Confidence level: high
Evidence:

CertificationsPanel.tsx:19: tenant certification create/detail/transition flow is present.
Proof level: runtime-confidence.
CertificationsPanel.tsx:91 and CertificationsPanel.tsx:97: tenant UI explicitly handles pending approval and escalation-required outcomes. Proof level: runtime-confidence.
TraceabilityPanel.tsx:19: node/edge create plus 1-hop neighbor view are present. Proof level: runtime-confidence.
TenantAuditLogs.tsx:2: tenant audit logs are materially real but explicitly read-only. Proof level: runtime-confidence.
control.ts:963: control-plane compliance surface is backed by canonical certification rows, not synthetic placeholders. Proof level: runtime-confidence.
CertificationsAdmin.tsx:2 and TraceabilityAdmin.tsx:2: cross-tenant admin surfaces are explicitly read-only. Proof level: runtime-confidence.
What is validated as real: tenant-side governance-evidence flows are real, and control-plane oversight is materially present.
What remains partial / bounded / unclear: many admin/control-plane surfaces are inspection/supervision only, not full mutation workflows.
False-completion risk: seeing many governance panels at once can overstate family-wide mutation depth.

Platform control-plane / finance ops / disputes / feature governance / RBAC
Primary classification: VALIDATED_PARTIAL
Confidence level: high
Evidence:

control.ts:180: control-plane tenant registry routes exist. Proof level: structural.
control.ts:769: finance records are backed by settlement-ledger rows. Proof level: runtime-confidence.
control.ts:1151: disputes route exists. Proof level: structural.
control.ts:594 and control.ts:608: feature flag read/write routes exist. Proof level: runtime-confidence.
control.ts:1239: admin access registry read/revoke routes exist. Proof level: runtime-confidence.
FinanceOps.tsx:47 and FinanceOps.tsx:103: finance supervision UI loads records and records outcomes. Proof level: wiring.
DisputeCases.tsx:64: disputes UI loads real data and can submit decisions. Proof level: wiring.
FeatureFlags.tsx:1: feature flag UI is wired for read and toggle. Proof level: wiring.
AdminRBAC.tsx:59: admin registry surface is explicitly bounded, not full RBAC administration. Proof level: runtime-confidence.
TenantDetails.tsx:53: PLAN / FEATURES are limited and BILLING / RISK are preview-only. Proof level: runtime-confidence.
control.ts:1456 and control.ts:1458: system health is present but explicitly minimal. Proof level: runtime-confidence.
What is validated as real: the control plane is materially real across registry, disputes, finance supervision, feature flags, and bounded admin registry.
What remains partial / bounded / unclear: tenant deep-dive tabs, system health, billing/risk depth, and some oversight surfaces are intentionally thin or preview/read-only.
False-completion risk: the control plane is real, but not every panel inside it has the same operational depth.

Maker-checker / approval / replay evidence
Primary classification: BOUNDED_ONLY
Confidence level: high
Evidence:

makerChecker.ts: internal tenant and control-plane list/detail/sign/replay routes exist behind internal header and auth requirements. Proof level: runtime-confidence.
controlPlaneService.ts:1177: control-plane client wrapper for approval listing exists. Proof level: wiring.
MakerCheckerConsole.tsx:13: current console is explicitly read-only.
Proof level: runtime-confidence.
MakerCheckerConsole.tsx:124: current UI only lists approvals via adminListApprovals. Proof level: wiring.
What is validated as real: the approval queue and replay/sign backend exist.
What remains partial / bounded / unclear: exposed operator runtime is currently read-only.
False-completion risk: a visible queue can be mistaken for complete maker-checker operator workflow completion.

AI governance / advisory automation
Primary classification: BOUNDED_ONLY
Confidence level: high
Evidence:

ai.ts:45: tenant AI insights route exists with budget/error handling. Proof level: runtime-confidence.
ai.ts:149: tenant negotiation advice route exists. Proof level: runtime-confidence.
ai.g028.ts: control-plane AI health and insights routes exist and are SUPER_ADMIN-gated. Proof level: runtime-confidence.
AiGovernance.tsx:82: real control-plane AI insight request UI exists. Proof level: wiring.
AiGovernance.tsx:152: prompt registry is static presentation, not proven persisted control data. Proof level: runtime-confidence.
AiGovernance.tsx:172: tenant usage and budgets are surfaced in UI. Proof level: wiring.
geminiService.ts.deprecated: deprecated placeholder-key client remains in-tree as inactive residue. Proof level: structural.
What is validated as real: advisory tenant AI calls, control-plane insights, and budget visibility.
What remains partial / bounded / unclear: advisory-only posture, mixed real/static governance page sections, no proof of autonomous action.
False-completion risk: AI governance surface can be overread as mature automation governance rather than bounded advisory oversight.

Billing / commercial admin operations
Primary classification: BOUNDED_ONLY
Confidence level: medium
Evidence:

FinanceOps.tsx:47: finance supervision is real. Proof level: wiring.
control.ts:769: finance record source is durable settlement-ledger data. Proof level: runtime-confidence.
TenantDetails.tsx:55: Billing tab is preview-only. Proof level: runtime-confidence.
TenantDetails.tsx:186: tenant deep-dive explicitly says invoice handling, statement generation, and usage-backed financial detail are not exposed there. Proof level: runtime-confidence.
TenantRegistry.tsx:130, TenantRegistry.tsx:132, and TenantRegistry.tsx:133: derived aiUsage, hard-coded billingStatus: 'CURRENT', and riskScore: 0 show frontend summary shaping that should not be mistaken for mature billing/risk operations. Proof level: runtime-confidence.
What is validated as real: bounded control-plane finance supervision.
What remains partial / bounded / unclear: tenant billing, reconciliation, statements, and broader commercial-admin operations are not strongly evidenced.
False-completion risk: finance supervision and registry summaries can be misread as full billing/commercial-admin maturity.

Preserved placeholder / demo residue
Primary classification: PLACEHOLDER_OR_STUB
Confidence level: high
Evidence:

WLStubPanel.tsx:2: explicit WL “coming soon” stub remains in tree. Proof level: structural.
ArchitectureBlueprints.tsx:38: preserved blueprint placeholder is explicit. Proof level: structural.
ApiDocs.tsx:49: preserved API placeholder is explicit. Proof level: structural.
geminiService.ts.deprecated: deprecated placeholder-key AI client remains. Proof level: structural.
What is validated as real: the repo still contains explicit placeholder/demo residue.
What remains partial / bounded / unclear: these should not be treated as active product/runtime truth unless separately wired.
False-completion risk: preserved placeholder files can distort reality classification if read as active capability.

4. Repo Reality Map

Validated complete: public tenant resolution for login selection; tenant invite activation flow; control-plane feature-flag read/write; WL domains CRUD-lite.
Validated partial: B2C browse-entry continuity; B2B exchange/commercial flows; white-label overlay; catalog/discovery/search; orders/checkout/post-purchase; payments/escrow/settlement; compliance/certifications/traceability/audit; platform control-plane; identity/tenancy/workspace continuity; onboarding/provisioning/handoff.
Backend only: maker-checker sign/replay mutations beyond the current read-only queue; control-plane finance/compliance authority-action routes not proven through current UI.
Frontend only: AI Governance prompt registry presentation; tenant registry billing/risk summary shaping.
DB present but not runtime-complete: foundational schema breadth as a whole; untraced vector/embedding, sanctions, and other long-tail tables beyond the reviewed runtime.
Placeholder/stub: WLStubPanel; preserved control-plane blueprint/API placeholder pages; deprecated Gemini client file.
Bounded only: Aggregator discovery workspace; maker-checker console; control-plane trade/escrow/certification/traceability/cart-summary read surfaces; AI governance/advisory automation; billing/commercial admin supervision.
Runtime-sensitive / needs production proof: checkout/order lifecycle under real tenant data; settlement apply path; onboarding outcome to approved activation; provisioning handoff; impersonation bootstrap/exit behavior.
Insufficient evidence: mature tenant billing/reconciliation/statements; full multi-party aggregator orchestration; full anonymous B2C transaction depth; broad release-management beyond bounded feature flags.

5. Blind-Stop / TODO / Placeholder Map

Explicit placeholder/stub files: WLStubPanel.tsx:2, ArchitectureBlueprints.tsx:38, ApiDocs.tsx:49, geminiService.ts.deprecated.
UI dead ends or bounded fallbacks: WLProductDetailPage.tsx:269 can show a disabled cart placeholder; SettlementPreview.tsx:20 explicitly excludes AI-triggered, maker-checker-role-selection, and control-plane settlement paths; BuyerRfqDetailSurface.tsx:162 and BuyerRfqDetailSurface.tsx:522 still surface “not available right now” states.
Thin supervision-only surfaces: TradeOversight.tsx:2, EscrowAdminPanel.tsx:2, CertificationsAdmin.tsx:2, TraceabilityAdmin.tsx:2, CartSummariesPanel.tsx:2, and AdminRBAC.tsx:59 are intentionally bounded.
Schema-first but runtime-thin areas: schema.prisma contains families that were not fully proven in runtime, especially long-tail governance/AI/finance tables beyond the reviewed routes.
Misleading runtime impressions: TenantDetails.tsx:53 exposes multiple limited/preview tabs; TenantRegistry.tsx:132 and TenantRegistry.tsx:133 inject billing/risk summaries that are not proof of mature operations; control.ts:1458 explicitly labels system health as a minimal implementation.
Adjacent residue kept separate: the evidence pass did not absorb the impersonation-stop cleanup residue or the g026 subdomain-routing residue into broader platform truth.

6. Sequencing-Relevant Truth

More real than a superficial read would suggest: B2C browse continuity, WL overlay runtime, Aggregator discovery, control-plane casework, onboarding/provisioning seams, and maker-checker backend depth.
Thinner than they look: billing/commercial admin, control-plane tenant deep-dive tabs, AI governance as a broader family, and many admin oversight panels that are inspection/supervision only.
Most likely later governance-reconciliation targets: broad B2C storefront family framing, broad control-plane tenant-operations family framing, bounded Aggregator classification, and under-formalized billing/commercial-admin truth.
Most likely later runtime-validation targets before “complete” claims: checkout/order lifecycle, settlement apply path, onboarding outcome/provisioning handoff, and impersonation bootstrap/exit flows.

7. Next-Step Recommendation
Recommend exactly one next move: governance reconciliation.

Narrowest truthful reconciliation target: refresh the broad repo-truth wording in the live v2 product-truth stack so it matches current repo evidence, starting with the over-broad family descriptions for B2C storefront continuity and control-plane tenant-operations reality, without reopening implementation.

NO_COMMIT_REQUIRED
```

## 4. Preservation Rule

This evidence record preserves repo truth as found in the validated repo-first evidence pass.

Later reconciliation must compare governance-recorded truth against this file.

No sequencing, reduction, family selection, or opening may treat this file alone as an
implementation decision.

Bounded, partial, backend-only, frontend-only, DB-present-but-not-runtime-complete,
placeholder-or-stub, runtime-sensitive, and insufficient-evidence warnings remain fully in force.

Separate-residue preservation remains explicit and unchanged:

- `IMPERSONATION-STOP-CLEANUP-404-001`
- `g026-platform-subdomain-routing.spec.ts`

These remain separate and must not be absorbed into broader platform truth by this record.