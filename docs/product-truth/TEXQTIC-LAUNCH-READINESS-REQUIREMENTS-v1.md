> CLEANUP NOTE — RECONCILED LAUNCH-OVERLAY BASELINE
>
> This artifact is preserved as the 2026-03-30 launch-readiness baseline and historical
> launch-overlay input. It is not the sole current launch-readiness authority after the post-reset
> authority realignment.
>
> For current onboarding-family consumer reading specifically, use:
> - Layer 0 posture in `governance/control/OPEN-SET.md`, `governance/control/NEXT-ACTION.md`, and `governance/control/BLOCKED.md`
> - the live opening-layer canon in `governance/control/TEXQTIC-OPENING-LAYER-GOVERNANCE-AUTHORITY-AND-POINTER-LAYER-2026-04-09.md` and `governance/control/TEXQTIC-OPENING-LAYER-SEQUENCING-AND-NEXT-CYCLE-ENTRY-2026-04-09.md`
> - `governance/analysis/TEXQTIC-ONBOARDING-ADJACENT-PLANNING-RECONCILIATION-2026-04-09.md`
> - `governance/analysis/TEXQTIC-ONBOARDING-ADJACENT-REMAINDER-INVENTORY-AND-BOUNDARY-CLASSIFICATION-2026-04-09.md`
> - `docs/product-truth/ONBOARDING-PROVISIONING-ACTIVATION-FAMILY-CONSOLIDATION-v1.md` as bounded onboarding-family reading note only
> - `docs/product-truth/TEXQTIC-LAUNCH-FAMILY-CHAIN-BASELINE-AND-SEQUENCING-FRICTION-v1.md` as preserved context and sequencing-friction input only
>
> The old `-v2` chain remains historical evidence and must not be read as current onboarding-family authority.
>
> Onboarding capability statements preserved below remain historical launch-baseline guidance only. They do not imply whole-family completion, deferred remainder resolution, or broader current onboarding-family authority.
>
> This banner narrows authority only. The historical analysis below is preserved.

# TEXQTIC-LAUNCH-READINESS-REQUIREMENTS-v1

## Status

- Mode: `PRODUCT-TRUTH / DESIGN-PLANNING ONLY`
- Authority posture: `REPO-REALITY-FIRST`
- Creation date: `2026-03-30`
- File purpose: preserved launch-readiness requirements baseline derived from then-current repo truth

## 1. Purpose and Authority

This document preserves the launch-readiness requirements baseline produced for TexQtic on `2026-03-30`.

It is product-truth-first and repo-reality-first. It exists to answer one bounded planning question:

- what TexQtic must materially support before it can be treated as launchable for real tenants and users

This document does not authorize implementation by itself.

It does not open governed units, does not approve sequencing, and does not overrule Layer 0. Any future
implementation, opening, or scope change still requires separate lawful product and governance decisions.

Authority order used for this register:

1. Layer 0 governance posture in `governance/control/*` and `governance/log/EXECUTION-LOG.md`
2. TECS operating doctrine in `TECS.md`
3. Product-truth planning stack requested by prompt in the `-v1` files
4. Broad product-truth planning stack reviewed in this historical register
5. Current frontend, backend, service, contract, and schema surfaces

Important repo-authority note:

- The prompt named the `-v1` planning stack, and those files were reviewed.
- At the time of this historical register, the reviewed `-v2` files were used as broad planning
   input alongside the requested `-v1` stack.
- For current onboarding-family reading, the live opening-layer canon and bounded onboarding
   reconciliation artifacts now control; the old `-v2` chain remains historical evidence and
   reconciliation input only.

Path-normalization note:

- The prompt referenced `server/src/prisma/schema.prisma`.
- That path does not exist in current repo truth.
- The nearest authoritative schema surface is `server/prisma/schema.prisma`, which was used instead.

## 2. Current Repo Posture Summary

Current repo posture is not a blank slate.

- Layer 0 currently proves one open product-facing unit: `ENTERPRISE-RFQ-TO-NEGOTIATION-BRIDGE-CONTINUITY`
  is the sole open `ACTIVE_DELIVERY` unit.
- No other product-facing unit is currently open.
- `BLOCKED.md` shows no currently blocked units and no currently deferred units.
- The absence of an active blocker register does not mean launch readiness is complete; it means the
  current governed open set is not formally blocked.
- The live planning stack still records unresolved launch-relevant families:
  `CONTROL-PLANE-TENANT-OPERATIONS-REALITY`,
  `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY`,
  `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE`, and the broader `RFQ-NEGOTIATION-CONTINUITY` family.
- Broad admin redesign is not currently justified by repo truth. The repo instead shows bounded admin
  reality with one fake-complete tenant deep-dive family and one security-sensitive admin-RBAC family
  still held at design-gate posture.
- Design-gated streams remain design-gated. Current repo truth does not authorize collapsing
  aggregator mode scope truth, the broader RFQ family, or security-sensitive admin authority work into
  implementation-ready launch scope merely because neighboring runtime already exists.

Practical posture summary:

- TexQtic has materially real launch-adjacent loops now.
- TexQtic is not yet truthfully reducible to “everything needed for launch is complete.”
- The main remaining problem is no longer foundational multi-tenant runtime. The main remaining problem is
  launch-scope normalization across modes, thin control-plane operator depth, mixed commercial plan truth,
  and a small set of still-open continuity gaps.

## 3. Launch Readiness Framing

For TexQtic, launch readiness means launch to real tenants and real users, not just internal demo
navigation.

The minimum credible launch question is:

- can a real tenant be provisioned, activated, signed in, and placed into a materially usable operating
  loop with truthful admin and product continuity for the modes TexQtic chooses to keep in launch scope

This register uses the following launch framing:

- `DAY_1`: must be materially true before launch can be claimed
- `PRE-LAUNCH`: must be resolved before launch if the related mode or promise is retained in launch scope
- `POST-LAUNCH`: useful and likely necessary later, but not required for the first truthful launch claim
- `DEFERRED`: should be explicitly out of day-1 scope

This register also distinguishes:

- launch-critical: without it, the supported launch loop is not truthful
- launch-important: should be materially present if the related operating surface remains in scope
- deferred: can remain out of day-1 without breaking the core launch promise if explicitly excluded

The required analysis lens is system loops, not screens:

- onboarding / enterability loop
- public discovery to tenant-user conversion loop
- buyer / supplier exchange loop
- execution / fulfillment continuity loop
- control-plane review / approval / lifecycle loop
- catalog lifecycle loop
- admin operations loop

## 4. Requirement Taxonomy

This register uses the following requirement categories.

| Category | Meaning |
| --- | --- |
| `ENTERABILITY / ONBOARDING / PROVISIONING` | Public-safe discovery, tenant resolution, provisioning, activation, login, first-owner entry |
| `TENANT OPERATING CORE` | Catalog, cart, checkout, orders, memberships, branding, tenant-side operating continuity |
| `EXCHANGE LOOP` | RFQ, supplier response, trade creation, negotiation bridge, exchange continuity |
| `EXECUTION / FULFILLMENT / SHIPMENT CONTINUITY` | Trade lifecycle, fulfillment, settlement, shipment-adjacent continuity |
| `PUBLIC DISCOVERY / PUBLIC SURFACES` | Public-safe tenant discovery and any public-facing mode surfaces kept in launch scope |
| `CONTROL-PLANE / PLATFORM OPERATIONS` | Tenant registry, onboarding review, lifecycle ops, feature flags, health, audit, admin supervision |
| `SUBSCRIPTION / ENTITLEMENT / PLAN GATING` | Plan names, plan selection, gating, entitlements, AI budgets, commercial readiness |
| `MODE COMPLETENESS (B2B / B2C / WL / Aggregator)` | Whether declared operating modes are materially real or only partially truthful |
| `SUPPORT / RISK / BILLING / ADMIN OPERATIONS` | Platform admin casework, billing visibility, disputes, compliance, finance, admin access |
| `DEFERRED / NON-LAUNCH` | Capabilities that should remain explicitly outside day-1 scope |

Status labels used in this register:

| Label | Meaning |
| --- | --- |
| `EXISTS_NOW` | Repo evidence proves the capability is present in some material form |
| `MATERIAL` | The bounded end-to-end loop is materially usable now |
| `PARTIAL` | Some of the loop is real, but launch truth would overstate it if claimed complete |
| `FAKE_COMPLETE` | Surface appears deeper than it really is |
| `BACKEND_ONLY` | Backend or contract support exists without sufficient user-facing continuity |
| `FRONTEND_ONLY` | UI exists without enough backend reality |
| `STUB` | Explicitly unfinished or under-construction |
| `DECORATIVE` | Affordance exists, but the promised loop is not materially live |
| `MISSING` | No sufficient repo evidence supports the capability |
| `NEEDS_SCOPE_DECISION` | Launch should not assume this family is in scope without explicit product choice |
| `NEEDS_DESIGN_GATE` | The bounded target state is still under-defined |
| `READY_FOR_LATER_BOUNDING` | A bounded later opening could be justified after higher-priority scope decisions |
| `DEFERRED` | Explicitly appropriate to keep out of day-1 launch |

## 5. Launch Requirements Register

| Requirement ID | Capability / Requirement | Domain / Layer | Launch Criticality | Current Repo Posture | Current Runtime Reality | Existing Evidence Surface(s) | Required Target Outcome | Readiness Class | Needs Design Gate? | Needs Scope Decision? | Candidate For Later Bounded Opening? | Notes / exclusions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `LR-001` | Public tenant discovery and realm-safe login entry | `PUBLIC DISCOVERY / ENTERABILITY` | `DAY_1` | `EXISTS_NOW` | Public tenant resolution by slug and by email exists; tenant login and `/api/me` session bootstrap are materially wired. This is a login/discovery loop, not a public marketplace loop. | `server/src/routes/public.ts`, `services/authService.ts`, `App.tsx`, `shared/contracts/openapi.tenant.json` | A real tenant user can discover the correct tenant context and enter the correct authenticated realm without manual back-office intervention. | `MATERIAL` | `NO` | `NO` | `NO` | Excludes claims of a broad public B2B marketplace or public catalog launch. |
| `LR-002` | Control-plane provisioning, approved activation, and canonical first-owner handoff | `ENTERABILITY / ONBOARDING / PROVISIONING` | `DAY_1` | `EXISTS_NOW` | Control-plane tenant provisioning exists, onboarding outcome persistence exists, approved activation exists, and the prior onboarding entry gaps are recorded closed for the canonical path. | `components/ControlPlane/TenantRegistry.tsx`, `components/Onboarding/OnboardingFlow.tsx`, `server/src/routes/control.ts`, `services/controlPlaneService.ts`, `services/tenantService.ts`, `docs/product-truth/TEXQTIC-GAP-REGISTER-v1.md` | A provisioned tenant can move from admin-created org to approved activation to usable first-owner sign-in on the supported path. | `MATERIAL` | `NO` | `NO` | `NO` | No public self-serve tenant creation path is evidenced; launch must assume admin-led provisioning. |
| `LR-003` | Tenant auth/session bootstrap and plane isolation | `ENTERABILITY / CONTROL-PLANE SAFETY` | `DAY_1` | `EXISTS_NOW` | Tenant and control-plane realms are explicitly separated in frontend service clients and backend route guards. App-level bootstrap persists and rehydrates the correct realm. | `services/apiClient.ts`, `services/adminApiClient.ts`, `services/authService.ts`, `App.tsx`, `server/src/routes/control.ts` | Tenant users and control-plane admins enter only their lawful plane and keep correct session continuity. | `MATERIAL` | `NO` | `NO` | `NO` | This is foundational and already materially present. |
| `LR-004` | B2B tenant commerce core: catalog, cart, checkout, orders | `TENANT OPERATING CORE` | `DAY_1` | `EXISTS_NOW` | B2B surfaces expose catalog management, add-to-cart, checkout, orders, RFQ entry points, and the closed exchange-core loop baseline. | `App.tsx`, `shared/contracts/openapi.tenant.json`, `server/src/routes/tenant.ts`, `docs/product-truth/TEXQTIC-GAP-REGISTER-v1.md` | A B2B tenant can perform the core catalog-to-order commerce loop truthfully. | `MATERIAL` | `NO` | `NO` | `NO` | This is the strongest currently evidenced launchable tenant loop. |
| `LR-005` | Tenant admin core: memberships, branding, and basic operator controls | `TENANT OPERATING CORE` | `PRE-LAUNCH` | `EXISTS_NOW` | Memberships and branding updates exist. WL admin has a dedicated shell. Domain and richer admin depth remain mixed or thin across modes. | `services/tenantService.ts`, `layouts/Shells.tsx`, `App.tsx`, `shared/contracts/openapi.tenant.json` | Supported launch modes must expose truthful operator/admin controls for staff, branding, and basic org management. | `PARTIAL` | `NO` | `NO` | `NO` | Launch can rely on bounded admin continuity, not on a claim of fully complete tenant administration across all modes. |
| `LR-006` | Buyer-supplier exchange core through trade, escrow, and settlement | `EXCHANGE LOOP` | `DAY_1` | `EXISTS_NOW` | The prior `-v1` exchange core was recorded closed end to end. Current runtime still exposes buyer RFQs, supplier inbox/detail/respond routes, trades, escrow, and settlement. | `server/src/routes/tenant.ts`, `server/src/routes/tenant/trades.g017.ts`, `components/Tenant/TradesPanel.tsx`, `shared/contracts/openapi.tenant.json`, `docs/product-truth/TEXQTIC-GAP-REGISTER-v1.md` | Supported B2B exchange can move from RFQ into execution and settlement without relying on backend-only hidden steps. | `MATERIAL` | `NO` | `NO` | `NO` | This is materially stronger than the older planning language implied. |
| `LR-007` | Enterprise responded-RFQ bridge into existing trade / negotiation continuity | `EXCHANGE LOOP` | `PRE-LAUNCH` | `ACTIVE_DELIVERY` | Enterprise RFQ create/list/detail and supplier first-response already exist, but the reviewed frontend still lacks the minimum bridge from responded RFQ into the existing trade / negotiation continuity. | `governance/control/OPEN-SET.md`, `docs/product-truth/TEXQTIC-GAP-REGISTER-v2.md`, `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v2.md`, `server/src/routes/tenant/trades.g017.ts`, `App.tsx` | If enterprise RFQ depth remains in launch scope, the enterprise RFQ path must no longer stop after first response. | `PARTIAL` | `NO` | `NO` | `NO` | This is already the sole open product-facing delivery unit. |
| `LR-008` | White-label storefront plus bounded WL operator continuity | `MODE COMPLETENESS (WL)` | `PRE-LAUNCH` | `EXISTS_NOW` | WL storefront browse/product detail/RFQ entry is materially present on the reviewed path, and WL admin has a dedicated shell with products, collections, orders, and domains surfaces. | `components/WL/WLStorefront.tsx`, `components/WL/WLProductDetailPage.tsx`, `layouts/Shells.tsx`, `App.tsx`, `docs/product-truth/TEXQTIC-GAP-REGISTER-v2.md` | If WL remains in launch scope, it must be launched only on the bounded storefront-plus-operator path the repo actually supports. | `PARTIAL` | `NO` | `YES` | `NO` | Do not overstate WL as full retail operations completeness; bounded WL launch is possible, broader WL promise is not yet evidenced. |
| `LR-009` | Control-plane tenant lifecycle, onboarding review, billing/risk deep-dive | `CONTROL-PLANE / PLATFORM OPERATIONS` | `PRE-LAUNCH` | `READY_FOR_LATER_BOUNDING` | Tenant Registry is real, onboarding activation is real, but `TenantDetails` is visibly mixed: overview and one activation path are real while several tabs remain under construction or thin. | `components/ControlPlane/TenantRegistry.tsx`, `components/ControlPlane/TenantDetails.tsx`, `server/src/routes/control.ts`, `docs/product-truth/TEXQTIC-GAP-REGISTER-v2.md` | Platform operators must have a truthful tenant deep-dive for lifecycle, review, and supported tenant operations if that depth is required before launch. | `FAKE_COMPLETE` | `NO` | `YES` | `YES` | This is a high-signal launch-readiness gap even though broader admin redesign is not justified. |
| `LR-010` | Platform governance, risk, audit, health, and casework operations | `SUPPORT / RISK / BILLING / ADMIN OPERATIONS` | `PRE-LAUNCH` | `EXISTS_NOW` | Compliance queue, disputes, audit logs, finance oversight, feature flags, health, event stream, traceability admin, settlement admin, escrow admin, and maker-checker surfaces are materially present. | `layouts/SuperAdminShell.tsx`, `components/ControlPlane/ComplianceQueue.tsx`, `components/ControlPlane/DisputeCases.tsx`, `components/ControlPlane/FinanceOps.tsx`, `components/ControlPlane/SystemHealth.tsx`, `components/ControlPlane/EventStream.tsx`, `docs/strategy/CONTROL_CENTER_TAXONOMY.md` | Platform staff can monitor and supervise the launched product without relying on fake-only back-office control. | `MATERIAL` | `NO` | `NO` | `NO` | This area is materially stronger than the tenant deep-dive family. |
| `LR-011` | Control-plane admin access governance and broader admin RBAC posture | `SUPPORT / RISK / ADMIN OPERATIONS` | `PRE-LAUNCH` | `DESIGN_GATE + PARTIAL_RUNTIME` | The repo has a bounded admin access registry and bounded revoke/remove route, but Layer 0 still preserves a separate security-sensitive `TECS-FBW-ADMINRBAC` design gate. | `server/src/routes/control.ts`, `services/controlPlaneService.ts`, `governance/control/OPEN-SET.md`, `governance/control/BLOCKED.md` | Launch must either accept a bounded fixed-staff admin model or explicitly resolve broader admin authority scope first. | `PARTIAL` | `YES` | `YES` | `YES` | Current runtime is enough for bounded existing-admin operations, not enough to claim broader admin authority completeness. |
| `LR-012` | Subscription, plan naming, entitlement, and budget truth | `SUBSCRIPTION / ENTITLEMENT / PLAN GATING` | `PRE-LAUNCH` | `EXISTS_NOW` | Canonical DB plan enums exist, org plan fields exist, AI budgets exist and are enforced, but frontend plan vocabulary is normalized differently and broad plan-driven entitlements are not materially enforced across the product. Provisioning does not expose a launch-grade plan-selection flow. | `server/prisma/schema.prisma`, `types.ts`, `App.tsx`, `components/ControlPlane/TenantRegistry.tsx`, `services/controlPlaneService.ts`, `server/src/lib/aiBudget.ts` | TexQtic needs one canonical commercial truth: plan names, selection, display, and any enforced entitlements must reconcile before launch claims rely on them. | `NEEDS_SCOPE_DECISION` | `NO` | `YES` | `YES` | Launch can proceed only if subscriptions remain manual or informational except for bounded AI budget controls. |
| `LR-013` | Billing, fee ledger, tenant billing status, and commercial admin operations | `SUPPORT / RISK / BILLING / ADMIN OPERATIONS` | `POST-LAUNCH` | `EXISTS_NOW but THIN` | Finance oversight is real as supervision/casework, but commercial billing surfaces are mostly not started, stubbed, or informational only. | `components/ControlPlane/TenantDetails.tsx`, `docs/strategy/CONTROL_CENTER_TAXONOMY.md`, `components/ControlPlane/FinanceOps.tsx` | If commercial billing is part of launch promise, it needs separate bounded definition and implementation. Otherwise it should be explicitly deferred. | `PARTIAL` | `NO` | `YES` | `YES` | This should not be silently assumed complete just because plan fields exist. |
| `LR-014` | Public-facing B2C storefront continuity | `MODE COMPLETENESS (B2C)` | `PRE-LAUNCH` | `READY_FOR_LATER_BOUNDING` | B2C shell and catalog rendering exist, but primary affordances such as `Shop Now` and `See All` are decorative in the reviewed path and the current candidate family remains later-ready. | `App.tsx`, `docs/product-truth/TEXQTIC-GAP-REGISTER-v2.md`, `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v2.md` | If B2C remains in launch scope, its primary browse-entry path must become truthful and materially continuous. | `DECORATIVE` | `NO` | `YES` | `YES` | Current B2C presence is not enough to claim a public retail launch. |
| `LR-015` | Aggregator operating mode | `MODE COMPLETENESS (AGGREGATOR)` | `DEFERRED` | `DESIGN_GATE_ONLY` | Aggregator is named and routable, but the reviewed runtime is still mostly promotional/discovery-oriented and the operating model remains under-defined. | `App.tsx`, `layouts/Shells.tsx`, `docs/product-truth/TEXQTIC-GAP-REGISTER-v2.md`, `docs/strategy/TENANT_DASHBOARD_MATRIX.md` | Launch must either explicitly exclude aggregator mode or first define the exact bounded aggregator operating model. | `NEEDS_DESIGN_GATE` | `YES` | `YES` | `YES` | This is the clearest case where declared mode presence does not equal launch readiness. |
| `LR-016` | Fulfillment, shipment, and returns continuity across launched modes | `EXECUTION / FULFILLMENT / SHIPMENT CONTINUITY` | `POST-LAUNCH` | `EXISTS_NOW but NARROW` | Trade lifecycle exposes a `FULFILLMENT` state transition, and order panels mention fulfillment status, but the repo does not evidence a separately material shipment or returns operating loop across modes. | `components/Tenant/TradesPanel.tsx`, `components/WhiteLabelAdmin/WLOrdersPanel.tsx`, `App.tsx` | Launch must either keep fulfillment/shipment out of the core promise or define a bounded post-order operating loop first. | `PARTIAL` | `NO` | `YES` | `YES` | The repo supports post-order progression better than shipment operations depth. |

## 6. Launch-Scope Decision Matrix

| Mode / Surface Family | In current repo truth | Materially launchable now | Launch-critical if kept in scope | Needs design gate | Can be deferred | Requires explicit scope decision | Evidence-led decision statement |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B2B public-facing surfaces | `YES, minimally` | `PARTIAL` | `YES` | `NO` | `NO` | `YES` | Current public truth supports tenant discovery and login entry, not a broad public B2B marketplace promise. |
| B2C public-facing surfaces | `YES` | `NO` | `YES if in scope` | `NO` | `YES` | `YES` | B2C runtime exists but key browse-entry CTAs remain decorative. |
| Aggregator mode | `YES` | `NO` | `YES if in scope` | `YES` | `YES` | `YES` | Aggregator remains a named mode with under-defined operating truth and should not be assumed in launch. |
| White-label admin/runtime | `YES` | `PARTIAL` | `YES if in scope` | `NO` | `NO` | `YES` | WL is launchable only on the bounded storefront/operator path the repo materially supports now. |
| Super admin / platform admin / tenant admin control centers | `YES` | `PARTIAL` | `YES` | `PARTIAL` | `NO` | `YES` | Control-plane casework is material, but tenant deep-dive depth and broader admin authority claims are still mixed. |
| Subscription tiers / plan gating / entitlements | `YES` | `NO` | `YES if launch uses commercial gating` | `NO` | `YES` | `YES` | Plan data exists, but the commercial truth is mixed and not yet coherent enough to carry launch claims. |
| Catalog CRUD completeness | `YES` | `YES for bounded B2B/WL catalog ownership` | `YES` | `NO` | `NO` | `NO` | Tenant catalog management continuity is materially stronger now and should be treated as launch-ready in bounded form. |
| Control-plane onboarding review and tenant lifecycle operations | `YES` | `PARTIAL` | `YES` | `NO` | `NO` | `YES` | Activation and tenant registry are material, but tenant deep-dive lifecycle/billing/risk depth is still fake-complete in places. |

Launch-scope normalization implied by current repo truth:

- B2B core can be treated as the clearest current launch anchor.
- WL can be treated as a bounded optional launch mode only if its promise is narrowed to the reviewed path.
- B2C should not remain silently in launch scope without an explicit decision.
- Aggregator should not remain silently in launch scope at all.
- Commercial subscription/billing claims should not be used as launch truth without a separate scope decision.

## 7. Fresh Repo-Truth Gaps Not Fully Captured in Current Stack

The reviewed `-v2` stack captured several high-signal gaps correctly at the time of this
historical register. It did not fully capture all launch-readiness truth that the runtime then
exposed.

## 7.1 Subscription / entitlement normalization is underplanned

Current repo truth shows:

- canonical plan values at the database layer: `FREE`, `STARTER`, `PROFESSIONAL`, `ENTERPRISE`
- org-level `plan` persistence
- frontend normalization to `TRIAL`, `PAID`, `ENTERPRISE`
- a legacy `BASIC -> TRIAL` mapping branch in the tenant registry
- enforced AI-budget controls via `ai_budgets`
- no equally clear product-wide entitlement model that gates onboarding or major operating surfaces

This is not a pure billing problem. It is a launch-truth normalization problem. If launch readiness depends on
commercial packaging, this family needs a planning artifact of its own.

## 7.2 Fulfillment / shipment / returns truth is thinner than the declared surface set

Current repo truth shows:

- trade lifecycle continuity includes a `FULFILLMENT` state transition
- order panels mention fulfillment status
- no separately evidenced shipment management or returns operating loop across the reviewed runtime

This is not fully captured as an active product-truth family today. It may be correctly deferred, but that should
be explicit rather than implied.

## 7.3 Public launch scope is narrower than the mode list suggests

Current repo truth shows:

- strong authenticated tenant loops
- public-safe tenant discovery and login entry
- no reviewed evidence of a fully public B2B marketplace operating loop
- decorative B2C browse-entry affordances

The launch question is therefore not only “what modes exist.” It is also “what is the truthful public launch promise.”

## 7.4 Aggregator remains more than a later implementation gap; it is still a scope-truth gap

The current stack correctly keeps aggregator at design-gate posture. That posture should be preserved. The launch
register must make explicit that a named mode with real shell routing is still not enough to treat aggregator as
launch scope.

## 8. Subscription / Plan / Entitlement Planning Notes

Current repo truth around subscriptions and plans is mixed.

## Canonical values evidenced in repo

- `server/prisma/schema.prisma` defines `TenantPlan` as `FREE`, `STARTER`, `PROFESSIONAL`, `ENTERPRISE`
- `organizations.plan` also exists as a string-backed org field
- frontend tenant config normalizes plan display to `TRIAL`, `PAID`, `ENTERPRISE`
- `App.tsx` maps `PROFESSIONAL -> PAID`
- `components/ControlPlane/TenantRegistry.tsx` still carries a legacy `BASIC -> TRIAL` mapping branch

## What is materially enforced now

- AI budgets are materially real and enforced through `ai_budgets` and `server/src/lib/aiBudget.ts`
- admin and tenant surfaces display plan data
- plan data participates in tenant identity and registry views

## What is not materially evidenced now

- a canonical launch-grade plan selection flow during provisioning
- a single consistent plan vocabulary across database, backend, and frontend runtime
- broad entitlement enforcement for major product capabilities
- a clear commercial rule that onboarding, WL, B2C, or aggregator access is gated by plan in current runtime truth

## Launch-readiness conclusion

- subscriptions are not yet a trustworthy launch-governance mechanism except for bounded AI-budget controls
- if TexQtic wants launch to include commercial packaging, the subscription model needs explicit normalization first
- if TexQtic is willing to launch with manual commercial operations, broad subscription completeness can be deferred

## 9. Admin / Control-Center Planning Notes

Current repo truth shows a materially real control center, but not a uniformly deep one.

## What is materially real now

- `SuperAdminShell` is real and organized around real platform-operator views
- Tenant Registry is real
- onboarding review outcome recording and approved activation are real
- Feature Flags, Audit Logs, Compliance Queue, Dispute Cases, Finance Ops, System Health, Event Stream,
  Traceability Admin, Escrow Admin, Settlement Admin, and Maker-Checker all exist as live surfaces
- bounded admin access registry and revoke/remove routes exist for current internal control-plane identities

## What remains thin or misleading

- `TenantDetails.tsx` still presents tab depth that is partly under construction
- billing and risk/operator depth inside the tenant deep-dive overstate current readiness
- broader admin authority work remains security-sensitive and design-gated rather than fully normalized
- preserved placeholder panels still exist on disk even if they are no longer active authority

## Tenant admin posture by mode

- B2B tenant admin is materially real in bounded form through memberships, catalog ownership, orders, RFQs,
  and related tenant operating surfaces
- WL admin is materially real in bounded form through a dedicated back-office shell
- B2C admin is much thinner than B2B/WL
- Aggregator admin should not be treated as launch-grade

## Planning conclusion

Broader redesign is not the right current conclusion. The right current conclusion is launch-scope normalization:

- which admin/operator surfaces must be materially complete before launch
- which thin views are acceptable if kept out of the launch promise
- which security-sensitive admin authority questions require a separate design decision

## 10. What Is Required Before Any New Product-Facing Opening

Before any new product-facing opening beyond the currently open enterprise RFQ bridge unit, current repo truth says
the following planning work must happen first.

1. Normalize launch scope explicitly by mode.
   Decide whether launch is:
   - B2B-core only
   - B2B-core plus bounded WL
   - inclusive of B2C
   - inclusive of aggregator

2. Reconcile declared launch scope with actual public/runtime truth.
   Named mode presence, shell routing, and old dashboard matrices must not be allowed to imply launch readiness.

3. Decide whether commercial subscriptions are required for launch truth.
   If yes, plan and entitlement normalization must happen before launch claims rely on them.

4. Decide whether control-plane tenant deep-dive operations are a launch prerequisite.
   If yes, the fake-complete tenant operations family must be treated as a real pre-launch requirement.

5. Preserve design-gate boundaries.
   Aggregator scope truth and broader RFQ family truth must remain gated until separately resolved.

This document does not nominate new governed units. It stops at requirements truth and scope normalization.

## 11. Recommended Next Planning Step

Recommended next planning artifacts, in order:

1. `Launch-scope decision record`
   Define exactly which mode families are in day-1 launch scope: B2B core, bounded WL, B2C, aggregator,
   commercial subscriptions, and control-plane tenant-ops depth.

2. `Subscription / entitlement normalization note`
   Reconcile plan vocabulary, plan-selection posture, and which capabilities are actually gated.

3. `Later bounded-opening analysis only after scope lock`
   If the launch-scope decision keeps them in play, the first later-ready planning targets remain:
   - `CONTROL-PLANE-TENANT-OPERATIONS-REALITY`
   - `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY`

4. `Design-gate queue preservation`
   Keep aggregator and broader RFQ family truth at design-gate posture unless fresh repo truth narrows them further.

This recommendation is planning-only. It is not implementation authorization.

## 12. Completion Checklist

- [x] Layer 0 files reviewed
- [x] TECS doctrine reviewed
- [x] Product-truth stack reviewed
- [x] Runtime frontend surfaces inspected
- [x] Runtime backend/service surfaces inspected
- [x] Fresh launch-relevant gaps distinguished from closed/history-only work
- [x] Requirements separated by launch criticality
- [x] Design-gate needs explicitly identified
- [x] Scope-decision needs explicitly identified
- [x] No implementation sequencing authorized
- [x] No runtime/schema/governance files modified beyond allowlist
