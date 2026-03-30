# AGGREGATOR-OPERATING-MODE-NORMALIZATION-v1

Status: Approved normalization artifact for launch-truth alignment

## 1. Purpose and Authority

This artifact normalizes how TexQtic describes, interprets, and carries forward the Aggregator operating mode after the approved design gate selected a bounded launch-retained model.

This document is authoritative for Aggregator normalization across launch-truth, runtime-adjacent interpretation, onboarding language, shell interpretation, and future implementation-design inheritance.

Authority order used for this artifact:

1. Layer 0 governance posture:
   - governance/control/OPEN-SET.md
   - governance/control/NEXT-ACTION.md
   - governance/control/SNAPSHOT.md
   - governance/control/BLOCKED.md
   - governance/log/EXECUTION-LOG.md
2. TECS.md
3. Launch overlay:
   - docs/product-truth/TEXQTIC-LAUNCH-READINESS-REQUIREMENTS-v1.md
   - docs/product-truth/TEXQTIC-LAUNCH-SCOPE-DECISION-RECORD-v1.md
   - docs/product-truth/TEXQTIC-LAUNCH-PLANNING-SPLIT-v1.md
4. Approved baseline:
   - docs/product-truth/AGGREGATOR-OPERATING-MODE-DESIGN-GATE-v1.md
5. Active product-truth stack:
   - docs/product-truth/TEXQTIC-GAP-REGISTER-v2.md
   - docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v2.md
   - docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v2.md
6. Current repo evidence surfaces:
   - App.tsx
   - layouts/Shells.tsx
   - components/Onboarding/OnboardingFlow.tsx
   - README.md
   - docs/strategy/TENANT_DASHBOARD_MATRIX.md
   - shared/contracts/openapi.tenant.json
   - shared/contracts/openapi.control-plane.json
   - services/aiService.ts

This artifact does not change launch scope. It does not approve implementation. It does not reopen the design-gate question. It only normalizes the language and interpretation that must now be used.

## 2. Current Posture Summary

Aggregator remains locked in launch scope.

Aggregator is no longer undefined at the operating-model level. The approved design-gate baseline selected one bounded launch-retained model:

- Curated Directory and Intent-Handoff Workspace

Current repo truth still contains language drift around that baseline.

The main drift pattern is not identity confusion. Aggregator is consistently present as a canonical tenant category in contracts, provisioning, and shell routing. The drift is descriptive and interpretive:

- some surfaces overclaim Aggregator as a mini-platform operator or multi-party commerce orchestrator
- some surfaces under-specify it as only a passive directory
- some surfaces expose shared tenant capabilities in a way that can be misread as proof of a distinct Aggregator operating loop

Normalization is therefore required before implementation-design planning can begin cleanly.

## 3. Approved Aggregator Baseline

The approved Aggregator baseline is:

- Curated Directory and Intent-Handoff Workspace

That baseline means:

- Aggregator is a discovery and qualification surface centered on curated company visibility, trust indicators, and directional market intelligence
- Aggregator may support operator-assisted intent capture and handoff into downstream tenant workflows
- Aggregator is not yet a full brokered exchange, not a network revenue operating mode, and not a fully realized multi-party orchestration console

The bounded launch truth is therefore:

- Aggregator helps users discover curated companies and move qualified intent toward downstream execution surfaces
- Aggregator does not itself prove end-to-end supplier network governance, buyer network governance, RFQ routing automation, negotiation hub depth, multi-party thread management, or take-rate economics

## 4. Aggregator Normalization Surface Audit

| Surface | Current posture | Normalization verdict | Required normalized interpretation |
| --- | --- | --- | --- |
| App.tsx Aggregator home | Discovery-first home with verified supplier language, large company counts, trending industries, active leads, and AI insight panel | Partially aligned but overstates network scale and immediacy | Treat as discovery-oriented landing content only; do not read static counts, active leads, or supplier language as proof of a fully populated governed network |
| layouts/Shells.tsx AggregatorShell | Aggregator has broad nav labels overlapping certifications, traceability, orders, DPP, escrow, escalations, settlement, trades, team | Over-broad for operating-mode interpretation | Treat shell navigation as shared platform access framing, not as proof of a unique Aggregator orchestration model |
| components/Onboarding/OnboardingFlow.tsx | Label is Global Directory; description is Directory, lead generation, and certifications | Closer to baseline but still blurry | Normalize to curated directory plus intent handoff; avoid implying a generic lead-gen business or standalone certification operating model |
| README.md | Describes Aggregator / Directory as one platform experience and preserves broad ecosystem language | Historically useful but descriptively loose | Treat as reference only; do not use README language to expand current launch truth |
| docs/strategy/TENANT_DASHBOARD_MATRIX.md | Defines AGGREGATOR as Platform Orchestrator with supplier network, buyer network, RFQ routing, negotiation hub, network revenue, and multi-party threads | Overclaiming relative to approved launch baseline | Treat as pre-normalization strategy overhang, not current launch truth or implementation-ready scope |
| shared/contracts/openapi.tenant.json | AGGREGATOR present as canonical tenant identity category | Aligned | Preserve as identity-only truth; do not infer capability depth from enum presence |
| shared/contracts/openapi.control-plane.json | AGGREGATOR present as canonical tenant identity category in control-plane tenant object | Aligned | Preserve as identity-only truth; do not infer operating breadth from tenant taxonomy |
| services/aiService.ts | Aggregator gets market insight hinting through tenantType=AGGREGATOR | Aligned but narrow | Treat AI insight as supportive market-intelligence behavior, not proof of a differentiated orchestrator stack |

Normalization conclusion from the surface audit:

- the repo already supports Aggregator as identity, routing, and bounded discovery context
- the repo does not support reading Aggregator as a launch-ready platform orchestrator mode
- future interpretation must center on curated discovery plus intent handoff, with shared surfaces treated carefully as inherited platform capabilities rather than Aggregator-specific operating proof

## 5. Normalized Aggregator Launch Definition

For launch-truth purposes, Aggregator shall be defined as:

- a curated directory and intent-handoff workspace for discovering relevant companies, reviewing trust-oriented signals, and moving qualified commercial intent toward downstream execution surfaces

Launch-safe language to use:

- curated directory
- company discovery workspace
- trust-signaled discovery
- operator-assisted intent capture
- intent handoff into downstream workflow surfaces
- market-intelligence-assisted discovery

Launch-unsafe language to avoid:

- platform orchestrator
- mini-platform operator
- brokered network exchange
- automated RFQ routing layer
- negotiation hub
- multi-party operating console
- network revenue or take-rate mode
- end-to-end aggregator-managed transaction flow

## 6. Normalized Capability Statement

The normalized Aggregator capability statement is:

- Aggregator can present curated discovery-oriented company context, directional market insight, and a workspace from which qualified intent may be handed into broader TexQtic workflow surfaces.

The normalized Aggregator capability statement is not:

- Aggregator governs a full supplier network
- Aggregator governs a full buyer network
- Aggregator automatically matches and routes RFQs
- Aggregator runs a dedicated multi-party negotiation layer
- Aggregator operates a distinct network economics model at launch

## 7. Normalized User/System Loop Statement

The normalized user/system loop for launch is:

1. A user enters the Aggregator workspace to discover relevant companies and trust-oriented context.
2. The system presents discovery signals, market context, and bounded navigation into broader shared platform surfaces.
3. The user identifies a relevant company or market direction and captures intent.
4. That intent is handed off into downstream workflow surfaces where actual execution depth lives or will later be designed.

This loop is intentionally narrower than a full aggregator-managed sourcing, routing, negotiation, settlement, or revenue loop.

## 8. Required Target-State Inheritance for Future Implementation-Design

Any future implementation-design for Aggregator must inherit the following fixed truths unless a later product-truth decision explicitly replaces them:

1. Aggregator is not to be redesigned from scratch as an unconstrained marketplace intermediary.
2. Aggregator implementation-design must begin from curated directory plus intent handoff, not from platform orchestrator assumptions.
3. Shared tenant capabilities exposed in Aggregator surfaces must be explicitly classified as either:
   - inherited platform capability available from the Aggregator context, or
   - true Aggregator-owned operating capability
4. Any future deeper Aggregator loop must be separately justified rather than inferred from shell presence, route presence, or strategy-era wording.
5. Future design work must clearly distinguish:
   - discovery
   - qualification
   - intent capture
   - handoff
   - downstream execution ownership

## 9. Remaining Normalization Gaps

The following gaps still exist after this normalization artifact, but they are now clearly bounded:

1. Runtime copy still contains stronger discovery and network-scale claims than the approved baseline strictly proves.
2. Aggregator shell navigation still presents a broad operational surface that can be misread without explicit interpretation rules.
3. Onboarding language still compresses directory, lead generation, and certifications into one shorthand description.
4. Strategy-layer documentation still contains a broader platform-orchestrator model that must not be read as launch truth.

These are normalization gaps, not implementation approvals.

## 10. Post-Normalization Recommendation

After normalization, Aggregator is ready for implementation-design planning only at the bounded level established here.

That means implementation-design planning may proceed if it stays inside:

- curated company discovery
- trust-signaled directory behavior
- intent capture
- handoff rules into downstream workflow ownership

Implementation-design planning may not proceed on the assumption that launch Aggregator already includes:

- full network governance
- automated RFQ routing
- multi-party negotiation management
- network economics or take-rate logic
- a fully distinct transaction orchestration stack

## 11. Boundaries and Non-Decisions

This artifact does not:

- change launch scope
- authorize implementation work by itself
- define UI copy changes
- define API changes
- define schema changes
- define ownership of every shared workflow surface reachable from Aggregator
- decide whether a later phase should expand Aggregator beyond the current bounded model

Those decisions require separate scoped work.

## 12. Completion Checklist

- Aggregator retained in launch scope: preserved
- Approved design-gate baseline preserved: yes
- Current surface drift classified: yes
- Normalized launch-safe language defined: yes
- Launch-unsafe language explicitly banned: yes
- Future implementation-design inheritance fixed: yes
- Aggregator declared implementation-ready only within bounded post-normalization limits: yes