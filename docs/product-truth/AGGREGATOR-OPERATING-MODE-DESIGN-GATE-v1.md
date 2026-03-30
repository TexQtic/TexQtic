# AGGREGATOR-OPERATING-MODE-DESIGN-GATE-v1

## 1. Purpose and Authority

This artifact is a `DESIGN-GATE` document for Aggregator only.

Aggregator is already `LOCKED IN FOR LAUNCH` by the launch overlay authority. This document does not revisit that decision, does not defer Aggregator out of launch scope, and does not authorize implementation by itself.

Authority order used for this design gate:

1. Layer 0 governance posture in `governance/control/OPEN-SET.md`, `NEXT-ACTION.md`, `SNAPSHOT.md`, `BLOCKED.md`, and `governance/log/EXECUTION-LOG.md`
2. TECS doctrine in `TECS.md`
3. Launch overlay authority in:
   - `docs/product-truth/TEXQTIC-LAUNCH-READINESS-REQUIREMENTS-v1.md`
   - `docs/product-truth/TEXQTIC-LAUNCH-SCOPE-DECISION-RECORD-v1.md`
   - `docs/product-truth/TEXQTIC-LAUNCH-PLANNING-SPLIT-v1.md`
4. Active `-v2` product-truth stack in:
   - `docs/product-truth/TEXQTIC-GAP-REGISTER-v2.md`
   - `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v2.md`
   - `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v2.md`
5. Runtime repo truth in `App.tsx`, `layouts/Shells.tsx`, `server/src/routes/public.ts`, `server/src/routes/tenant.ts`, `server/src/routes/control.ts`, `services/aiService.ts`, `services/tenantService.ts`, `shared/contracts/openapi.tenant.json`, `shared/contracts/openapi.control-plane.json`, `docs/strategy/TENANT_DASHBOARD_MATRIX.md`, `README.md`, and onboarding/provisioning surfaces

This document is `PRODUCT-TRUTH / DESIGN-GATE ONLY`.

## 2. Current Repo Posture Summary

| Area | Current posture |
| --- | --- |
| Layer 0 | No active blocker or deferral exists for Aggregator, but Layer 0 and the active `-v2` stack preserve `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE` as `DESIGN_GATE_ONLY`. |
| Launch overlay | Aggregator is `LOCKED IN FOR LAUNCH`, `NOT IMPLEMENTATION-READY`, and explicitly `DESIGN-GATED` first. |
| Active `-v2` stack | Aggregator remains a scope-truth problem, not an implementation wave. The stack repeatedly states that shell/routing presence must not be treated as implementation readiness. |
| Runtime truth | Aggregator is `ROUTED / PRESENT` via canonical tenant identity, shell routing, provisioning, and a visible home surface. Its operating truth is still materially thinner than the strategic language attached to it elsewhere in the repo. |

The key distinction is:

- `ROUTED / PRESENT` means Aggregator exists as a named identity, shell, and visible experience branch.
- `DEFINED OPERATING TRUTH` would mean the repo clearly supports a bounded user/system loop unique to Aggregator.

Current repo truth proves the first and does not yet fully prove the second.

## 3. Aggregator Question Statement

The design-gate question is:

- What exact bounded operating model is TexQtic actually retaining when it says Aggregator is in launch scope?

The design-gate decision must preserve all of the following truths:

- Aggregator is `LOCKED IN FOR LAUNCH`
- Aggregator is `DESIGN-GATED`
- Aggregator is `ROUTED / PRESENT`
- Current runtime is materially thinner than a full "platform orchestrator" claim
- The goal is to define the smallest truthful retained model, not to broaden TexQtic into a generic marketplace or supply-chain super-platform

## 4. Current Repo Truth for Aggregator

### 4.1 Route and shell presence

- `App.tsx` routes `tenant_category = AGGREGATOR` to `AggregatorShell`.
- `App.tsx` also routes `INTERNAL` to `AggregatorShell` by explicit named policy rule.
- `layouts/Shells.tsx` defines `AggregatorShell` with nav to `Companies`, `Certifications`, `Traceability`, `Orders`, `DPP Passport`, `Escrow`, `Escalations`, `Settlement`, `Audit Log`, `Trades`, and `Team`.
- `server/src/routes/admin/tenantProvision.ts` and `shared/contracts/openapi.control-plane.json` allow provisioning of tenants with `tenant_category = AGGREGATOR`.
- `shared/contracts/openapi.tenant.json` and `shared/contracts/openapi.control-plane.json` carry `AGGREGATOR` as a canonical identity enum value.

Classification: `ROUTED / PRESENT`

### 4.2 Visible UI surfaces

The reviewed Aggregator-specific runtime surface is concentrated in one App-level branch rather than in dedicated Aggregator feature modules.

- `App.tsx` renders an Aggregator home experience with:
  - a headline: `Discover Verified Global Suppliers`
  - hard-coded directory-style summary counts for manufacturers, wholesalers, and trading houses
  - hard-coded trending industries cards with `120+ Active Leads`
  - an `AI Market Analysis` box backed by `getPlatformInsights()`
- No dedicated Aggregator page, directory component, sourcing component, inquiry component, or onboarding-owned operating workspace was found under `components/` or `layouts/` beyond the shared shell file and this App-level content branch.
- The onboarding selector labels Aggregator as `Global Directory` with the description `Directory, lead generation, and certifications.`

Classification: `DISCOVERY-ONLY` plus `PARTIAL`

### 4.3 Actual user actions supported now

What an Aggregator user can materially do now based on repo evidence:

- sign in as an Aggregator-class tenant
- land in `AggregatorShell`
- view the discovery-oriented home surface
- receive AI insight text in the Aggregator home surface
- navigate to shared tenant surfaces such as orders, trades, certifications, traceability, escrow, escalations, settlement, audit log, and team/memberships

What the reviewed repo does not evidence as an Aggregator-specific action loop:

- no Aggregator-specific browse list driven by backend company/directory data
- no Aggregator company detail or supplier profile workflow
- no Aggregator-specific search/filter implementation
- no Aggregator-specific inquiry, lead capture, request-routing, or sourcing request flow
- no Aggregator-specific supplier network or buyer network management workflow
- no Aggregator-specific negotiation hub, approval chain, or communications thread implementation
- no Aggregator-specific finance, take-rate, invoice, or settlement orchestration loop

Classification: `PARTIAL` and `UNDER-DEFINED`

### 4.4 Backend and service support directly tied to Aggregator behavior

Repo evidence found:

- `services/aiService.ts` passes `tenantType=AGGREGATOR` to `/api/ai/insights`, and the Aggregator home surface shows that returned insight string.
- control-plane provisioning and tenant identity contracts know about `AGGREGATOR` as a tenant category.
- generic tenant routes in `server/src/routes/tenant.ts` expose shared tenant capabilities such as catalog, RFQ, orders, trades, escrow, and related tenant-plane operations, but they are not Aggregator-specific by contract or route naming.
- `server/src/routes/public.ts` exposes public tenant resolution and by-email lookup only. No Aggregator directory/discovery API is present there.
- `server/src/routes/control.ts` exposes generic admin tenant listing/detail and onboarding operations. No Aggregator operating API is present there.

Classification: `WORKFLOW-BACKED` only for identity/provisioning and AI insight; not for an Aggregator-specific operating loop.

### 4.5 What is absent

Absent from current repo truth:

- a workflow-backed Aggregator directory
- a workflow-backed Aggregator lead-routing layer
- a workflow-backed sourcing hub
- a workflow-backed marketplace intermediary loop unique to Aggregator
- any explicit Aggregator handoff contract from discovery into RFQ/trade continuation
- any dedicated tests proving an Aggregator-specific operating loop

### 4.6 Strategic overhang vs runtime truth

`docs/strategy/TENANT_DASHBOARD_MATRIX.md` describes Aggregator as a `Platform Orchestrator` and lists broad modules such as supplier network, buyer network, RFQ routing, negotiation hub, network revenue, pricing governance, multi-party threads, and approval chains.

Those modules are mostly marked `Stub`, `Product-defined`, or `Not started`, and the reviewed runtime does not evidence them as materially live Aggregator loops.

This is the main design-gate tension:

- strategy language implies a broad operating tenant mode
- runtime truth currently supports a much narrower discovery-oriented surface plus shared tenant handoff surfaces

## 5. Candidate Operating-Model Interpretations

| Candidate | What it means | Loop implied | Repo support strength | Conflicts / gaps |
| --- | --- | --- | --- | --- |
| `Candidate A — Directory / Discovery Layer` | Aggregator is primarily an authenticated discovery workspace for finding verified counterparties, scanning categories, and viewing market signals. | Browse companies or categories, inspect trust/capability cues, then leave the surface or hand off elsewhere. | `STRONGEST` fit to the current home surface, onboarding label, README reference, and product-truth notes describing Aggregator as discovery-oriented. | Current runtime lacks a real backend-driven company directory and lacks company detail continuity. The current home surface is still mostly presentation-oriented. |
| `Candidate B — Curated Sourcing / Intent Handoff Layer` | Aggregator is a discovery layer with one bounded next action: capture sourcing intent and hand it into an existing TexQtic exchange workflow or human follow-up path. | Discover counterparties or categories, express sourcing intent, then hand off into existing RFQ/trade continuity or manual broker follow-up. | `MEDIUM` support because the repo already has shared RFQ/trade infrastructure and the onboarding copy mentions lead generation, but the Aggregator surface itself does not yet expose that handoff. | No Aggregator-specific lead capture, routing, or sourcing-request contract exists today. |
| `Candidate C — Operating Tenant Mode / Mini-Platform Orchestrator` | Aggregator is a broad operating tenant mode that manages supplier networks, buyer networks, RFQ routing, negotiations, communications, compliance, and network finance. | Operate a full intermediary business inside TexQtic as a distinct multi-party control surface. | `WEAK` support. The strategic dashboard matrix names this posture, and the shell exposes many shared nav items. | Most of the claimed modules are explicitly stubbed or product-defined, and the reviewed runtime does not support this as a truthful launch model. |

Decision from the candidate set:

- Candidate C is too broad for launch truth.
- Candidate A is clearly supported but too thin on its own if Aggregator is to remain a retained launch family with a real operating claim.
- Candidate B is the smallest bounded model that preserves launch scope without overstating current runtime.

## 6. Recommended Bounded Aggregator Model

### RECOMMENDED BOUNDED MODEL

`Curated Directory and Intent-Handoff Workspace`

Aggregator in launch terms should be defined as an authenticated, curated discovery workspace where an Aggregator operator can review counterparties, categories, and trust-oriented market signals, then initiate a bounded sourcing or inquiry handoff into an existing TexQtic exchange path or an explicit human follow-up path.

Why this is the best fit to current repo truth:

- it preserves the discovery-heavy reality of the current Aggregator home surface
- it respects the onboarding and README language around directory and lead generation more than a pure decorative landing page would
- it uses the fact that TexQtic already has shared RFQ/trade infrastructure without pretending that Aggregator already has its own routing engine
- it is materially smaller and truer than the dashboard-matrix vision of a full orchestrator tenant mode

Why this is bounded enough for launch planning:

- it requires only one distinct Aggregator-owned loop beyond presentation: discovery plus one explicit handoff action
- it does not require network finance, pricing governance, multi-party negotiation management, or broad intermediary operations to be launch-complete
- it gives TexQtic a lawful basis to keep Aggregator in scope without claiming a full marketplace intermediary

What it explicitly excludes:

- automated lead matching
- full buyer-network and supplier-network administration
- full negotiation hub ownership
- invoice or settlement orchestration unique to Aggregator
- margin / take-rate / brokered network revenue operations
- broad platform-within-a-platform claims

## 7. Minimum Truthful Aggregator Loop

The minimum truthful end-to-end loop for the recommended model is:

| Loop element | Minimum truthful definition |
| --- | --- |
| Starting user | An authenticated Aggregator tenant operator (`OWNER`, `ADMIN`, or `MEMBER`) entering a retained Aggregator workspace. |
| Entry point | Login or session hydration resolves `tenant_category = AGGREGATOR` and lands the user in `AggregatorShell`, defaulting to the `Companies` home surface. |
| Discovery / browse / search behavior | The user can browse a bounded company/capability discovery surface with verification or trust signals and category-level market cues. Search/filter may be minimal, but the surface must be materially more than static promotional cards. |
| Inquiry / intent / lead / request behavior | The user can take one explicit next action from a discovered counterparty or sourcing need: record an intent, inquiry, or sourcing request. This action must be workflow-backed, not decorative. |
| How counterparties are surfaced or connected | Counterparties are surfaced as directory entries or company profiles inside the Aggregator discovery surface. The connection step is a bounded handoff, not a full intermediary routing engine. |
| Whether transaction execution is inside or outside the Aggregator loop | Transaction execution is outside the Aggregator-owned loop. The Aggregator loop ends at discovery plus intent handoff. Downstream RFQ, trade, or order execution may continue in existing TexQtic exchange surfaces. |
| Success condition | The operator successfully identifies a counterparty or category opportunity and creates a bounded, recorded handoff into the next exchange step. |
| Handoff to another TexQtic mode | If the opportunity becomes product-specific or exchange-specific, the flow hands off into existing shared RFQ/trade/order continuity rather than claiming a fully self-contained Aggregator transaction engine. |

This is intentionally a `DISCOVERY-FIRST` loop, not a full intermediary transaction loop.

## 8. Required Launch-Complete Target State

Before Aggregator can be claimed truthfully as part of launch, the retained model must minimally support the following.

### Required surfaces

- a real Aggregator discovery surface for companies, suppliers, or capability profiles
- a real detail or inspection surface for a selected counterparty, source, or capability profile
- one explicit intent-handoff action from that discovery/detail surface

### Required continuity

- the user must be able to move from discovery into a recorded inquiry or sourcing-intent step without hitting decorative dead space
- the handoff must clearly indicate whether it continues into an existing shared RFQ/trade flow or into a bounded human/manual follow-up path

### Required backend / service truth

- Aggregator directory/discovery content must come from a workflow-backed data source rather than static home-page cards alone
- the intent-handoff action must persist or transmit a real request, inquiry, or follow-up record
- the downstream handoff target must be explicit in route/service truth

### Required user actions

- browse or search counterparties/capabilities
- inspect a bounded counterparty detail view
- submit one bounded inquiry, sourcing intent, or routing request

### Required exclusions / boundaries

- no claim of automated routing or matching is required
- no claim of full multi-party negotiation orchestration is required
- no claim of Aggregator-owned settlement, invoicing, or fee accounting is required

### What must stop being decorative or ambiguous

- hard-coded summary counts and lead counts cannot remain the primary proof of Aggregator scope
- the distinction between Aggregator discovery and downstream B2B exchange must be explicit
- the dashboard-matrix overhang must stop implying a full orchestrator mode unless those modules materially exist

## 9. Forbidden Aggregator Claims

At launch, TexQtic is `FORBIDDEN TO CLAIM` the following unless further work exists:

1. Aggregator is a full marketplace intermediary with end-to-end deal execution inside its own mode.
2. Aggregator already provides automated lead routing, supplier matching, or broker-style RFQ dispatch.
3. Aggregator already supports a materially complete buyer network and supplier network operating console.
4. Aggregator already provides a real negotiation hub, multi-party threads, approval chains, or orchestration center.
5. Aggregator already manages network revenue, take-rate accounting, invoicing, or multi-party settlement.
6. Aggregator home-page discovery cards are proof of a launch-ready operating mode by themselves.
7. Shared tenant features such as orders, trades, certifications, escrow, or audit log are proof that Aggregator has a unique operating model.
8. The current dashboard-matrix description of Aggregator as a broad `Platform Orchestrator` is already runtime-true in launch scope.

## 10. Post-Design-Gate Recommendation

### Recommendation

`NORMALIZATION ARTIFACT NEXT`

### Why

This design gate is sufficient to narrow Aggregator to one recommended bounded model, but the repo still contains mixed surfaces that overstate or blur that model:

- the runtime home surface is narrower than the strategic dashboard-matrix definition
- onboarding labels, README language, and strategy language are not yet normalized around one exact operating claim
- the current Aggregator home surface is still largely static and discovery-oriented, while the recommended model requires an explicit workflow-backed intent handoff

Because of that mismatch, the next lawful step should be a normalization artifact that reconciles:

- what Aggregator is allowed to claim
- what Aggregator must stop claiming
- which existing surfaces are in or out of the bounded launch promise
- what exact implementation-design target survives after normalization

Implementation-design planning should follow only after that normalization pass makes the bounded model operationally consistent across product-truth and runtime-adjacent surfaces.

## 11. Boundaries and Non-Decisions

This document does not:

- authorize implementation
- create a TECS opening
- modify Layer 0
- change launch scope
- defer Aggregator out of launch
- merge Aggregator into a broad marketplace redesign
- decide monetization, billing, take-rate, or revenue architecture for Aggregator
- resolve unrelated B2B, B2C, WL, platform-admin, or RFQ family decisions
- claim that current runtime already satisfies the recommended model

This artifact only defines the bounded operating model TexQtic is truthfully retaining for launch planning.

## 12. Completion Checklist

- [x] Layer 0 reviewed
- [x] TECS doctrine reviewed
- [x] Launch overlay docs reviewed
- [x] Active `-v2` product-truth stack reviewed
- [x] Runtime Aggregator surfaces inspected
- [x] Routed/shell presence distinguished from operating truth
- [x] Candidate interpretations kept bounded
- [x] One recommended bounded model selected
- [x] Minimum truthful Aggregator loop defined
- [x] Forbidden claims listed
- [x] Post-design-gate recommendation made
- [x] No runtime/schema/governance files modified beyond allowlist
