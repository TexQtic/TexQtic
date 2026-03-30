# AGGREGATOR-IMPLEMENTATION-DESIGN-v1

Status: PRODUCT-TRUTH / IMPLEMENTATION-DESIGN ONLY

## 1. Purpose and Authority

This document is the bounded implementation-design artifact for Aggregator only.

The operating model is already fixed by the approved design-gate artifact. The launch-truth interpretation is already fixed by the approved normalization artifact.

APPROVED NORMALIZED MODEL:

- Curated Directory and Intent-Handoff Workspace

This document translates that approved model into a minimal implementation-design plan. It does not authorize implementation by itself. It does not open a TECS unit. It does not modify launch scope. It does not broaden Aggregator into orchestrator, marketplace-intermediary, or network-revenue scope.

Authority order used:

1. Layer 0 governance posture:
   - governance/control/OPEN-SET.md
   - governance/control/NEXT-ACTION.md
   - governance/control/SNAPSHOT.md
   - governance/control/BLOCKED.md
   - governance/log/EXECUTION-LOG.md
2. TECS doctrine:
   - TECS.md
3. Launch overlay:
   - docs/product-truth/TEXQTIC-LAUNCH-READINESS-REQUIREMENTS-v1.md
   - docs/product-truth/TEXQTIC-LAUNCH-SCOPE-DECISION-RECORD-v1.md
   - docs/product-truth/TEXQTIC-LAUNCH-PLANNING-SPLIT-v1.md
4. Aggregator authority docs:
   - docs/product-truth/AGGREGATOR-OPERATING-MODE-DESIGN-GATE-v1.md
   - docs/product-truth/AGGREGATOR-OPERATING-MODE-NORMALIZATION-v1.md
5. Active broad product-truth stack:
   - docs/product-truth/TEXQTIC-GAP-REGISTER-v2.md
   - docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v2.md
   - docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v2.md
6. Runtime truth reviewed for implementation design:
   - App.tsx
   - layouts/Shells.tsx
   - components/Onboarding/OnboardingFlow.tsx
   - README.md
   - docs/strategy/TENANT_DASHBOARD_MATRIX.md
   - services/aiService.ts
   - services/tenantService.ts
   - services/catalogService.ts
   - services/tradeService.ts
   - server/src/routes/public.ts
   - server/src/routes/tenant.ts
   - server/src/routes/control.ts
   - server/src/routes/admin/tenantProvision.ts
   - shared/contracts/openapi.tenant.json
   - shared/contracts/openapi.control-plane.json
   - server/prisma/schema.prisma

## 2. Current Posture Summary

Launch overlay posture keeps Aggregator locked in launch scope.

The design-gate outcome fixed the smallest truthful retained operating model as a curated discovery-plus-handoff workspace rather than a platform orchestrator.

The normalization outcome fixed how current repo surfaces must now be interpreted:

- AGGREGATOR identity, shell routing, provisioning, and AI insight support are real
- broad shell access and strategy language do not prove a distinct Aggregator orchestration stack
- future work must begin from discovery, trust-signaled company visibility, intent capture, and handoff into downstream ownership

Bounded implementation-design planning is now lawful because the missing question is no longer "what is Aggregator?" The remaining question is "what is the smallest implementation shape needed to make the approved model materially true?"

## 3. Fixed Aggregator Boundary

Aggregator is:

- AGGREGATOR-OWNED curated discovery workspace
- AGGREGATOR-OWNED trust-signaled company visibility layer
- AGGREGATOR-OWNED intent capture entry point
- AGGREGATOR-OWNED handoff launcher into downstream workflow ownership

Aggregator is not:

- OUT OF SCOPE full supplier-network governance console
- OUT OF SCOPE full buyer-network governance console
- OUT OF SCOPE automated RFQ routing or automated matching layer
- OUT OF SCOPE negotiation hub
- OUT OF SCOPE multi-party communication fabric
- OUT OF SCOPE network revenue or take-rate mode
- OUT OF SCOPE aggregator-owned settlement or transaction orchestration

Downstream surfaces Aggregator may hand off into:

- DOWNSTREAM-OWNED existing tenant RFQ creation and RFQ read continuity
- DOWNSTREAM-OWNED existing trade continuity where a bounded RFQ-derived trade bridge already exists separately in repo truth
- DOWNSTREAM-OWNED existing shared orders, trades, escrow, settlement, certification, and traceability surfaces where those workflows belong to broader tenant-plane continuity rather than Aggregator-specific ownership

The fixed stop boundary is:

- Aggregator owns discovery, inspection, intent submission, and handoff confirmation
- downstream surfaces own negotiation depth, trade creation rules, execution lifecycle, and post-handoff continuity

## 4. Existing Repo Capabilities Reuse Map

| Existing Surface / Capability | Current Role in Repo Truth | Reuse for Aggregator? | Why | Constraint / Caveat |
| --- | --- | --- | --- | --- |
| AggregatorShell in layouts/Shells.tsx | Existing routed shell for AGGREGATOR and INTERNAL tenants | PARTIAL | Reusable as the outer shell and nav frame for the bounded Aggregator experience | Shell presence must not be treated as proof of Aggregator-owned workflow depth |
| Current App.tsx Aggregator home | Discovery-styled landing branch with static counts, trending industries, and AI insight panel | PARTIAL | Reusable as the current home entry point and visual placeholder for a future real discovery workspace | Current content is decorative and static; it cannot serve as the final proof surface |
| Shared tenant navigation surfaces | Orders, trades, certifications, traceability, escrow, settlement, audit log, team | PARTIAL | Reusable as downstream continuation destinations after Aggregator handoff | Must be labeled as inherited platform access, not Aggregator-owned modules |
| AI insights surface via services/aiService.ts | Tenant-scoped market insight text using AGGREGATOR hinting | YES | Reusable as bounded market-intelligence support inside discovery | Supportive only; must not become proof of orchestrator logic |
| Existing RFQ continuity via services/catalogService.ts and server/src/routes/tenant.ts | Tenant-plane RFQ create, buyer read, supplier inbox/read, supplier response | PARTIAL | Reusable as one likely downstream handoff target for Aggregator intent | Current RFQ model is catalog-item-centered, not directory-counterparty-centered |
| Existing trade continuity via services/tradeService.ts and backend trade-from-RFQ support | Shared downstream trade read and transition continuity | PARTIAL | Reusable as later downstream continuation after lawful handoff | Not Aggregator-owned; not the first implementation slice |
| Existing order continuity | Shared tenant order workflow | NO | Orders belong after commerce execution, not inside the minimum Aggregator claim | Including orders in the Aggregator build would widen scope incorrectly |
| Public tenant resolution in server/src/routes/public.ts | Public-safe tenant lookup for login entry | NO | Useful for platform identity, not for Aggregator directory discovery | Resolves tenant identity only; does not list or inspect counterparties |
| Control-plane tenant provisioning and AGGREGATOR identity handling | Admin-created AGGREGATOR tenants and canonical tenant_category contracts | YES | Reusable identity/provisioning basis for Aggregator tenancy | Identity support does not supply discovery or handoff workflow |
| OpenAPI tenant/control-plane enums for AGGREGATOR | Canonical tenant identity definition | YES | Reusable as identity truth already in contracts | Contract presence does not imply endpoint completeness for Aggregator workflow |
| Company or counterparty directory surface | No repo-backed Aggregator directory list/detail surface found | NO | No existing surface was found that truthfully implements curated company discovery for Aggregator | NEW BOUNDED NEED |

## 5. Required Bounded Aggregator Modules

| Module Name | Purpose | Already Partially Exists? | What Remains Missing | Why It Is Required |
| --- | --- | --- | --- | --- |
| Aggregator discovery workspace | AGGREGATOR-OWNED home surface showing curated counterparties or capability entries with trust-oriented signals | PARTIAL | Real data-backed list content, bounded search/filter, non-decorative result cards | The approved model cannot be true if discovery remains static promo content only |
| Counterparty detail surface | AGGREGATOR-OWNED inspection view for a selected company or capability profile | NO | Read-only detail view with identity, capability, and trust summary | The normalized model requires inspection before intent can be captured truthfully |
| Intent capture / inquiry handoff surface | AGGREGATOR-OWNED action that records sourcing intent and launches downstream continuation | PARTIAL | A workflow-backed handoff record and a bounded submission flow anchored to discovery rather than catalog-only RFQ | The approved model explicitly requires intent capture and handoff |
| Handoff resolution / continuation indicator | AGGREGATOR-OWNED confirmation state showing where the request goes next | NO | Success state, downstream target reference, and clear ownership boundary | Without this, Aggregator still stops in ambiguous decorative space |
| Optional market-intelligence support panel | Supportive AI insight panel inside discovery or detail contexts | YES | Better contextual placement around real discovery records | It can improve the bounded discovery experience without widening scope |

Required module discipline:

- The first four modules are the minimum truthful set.
- The AI support panel is optional and secondary.
- No additional Aggregator-specific finance, negotiation, messaging, or network-governance modules are required for the approved model.

## 6. Minimal Data / Entity Design Notes

This section is bounded data-shape design only. It is not a migration plan.

| Data Shape | Existing Reusable Truth | Probable New Bounded Need | Minimal Record Concept | Notes |
| --- | --- | --- | --- | --- |
| Directory company profile / counterparty profile | UNKNOWN / VERIFY IN REPO as a reusable Aggregator-ready entity; current repo exposes tenant and organization identity but not a discovery-ready company directory surface | NEW BOUNDED NEED likely | One discoverable company profile with identity, summary, capability tags, jurisdiction, and trust-oriented summary fields | Existing Tenant and organizations truth may provide the identity base, but no reviewed Aggregator-ready directory contract was found |
| Trust signals / verification summary | PARTIAL REUSE from existing onboarding status, organization identity, certifications, and related shared records | NEW BOUNDED NEED likely for Aggregator-ready aggregation | A compact trust summary attached to a counterparty card/detail view | The design should reuse existing source truth where possible and avoid inventing a second verification system |
| Intent / inquiry / sourcing request | PARTIAL REUSE from existing RFQ concepts and bounded request flows | NEW BOUNDED NEED likely for Aggregator-origin metadata | One submitted intent record tying actor, selected counterparty or category, user message, and downstream target type together | Existing RFQ is too catalog-item-specific to serve as the only Aggregator-owned record without adaptation |
| Handoff target reference | PARTIAL REUSE via existing RFQ identifiers and downstream trade continuity | YES, but may need a small Aggregator-origin reference concept | One reference to the downstream continuation path and current ownership boundary | The minimum design needs a durable confirmation handle even if deeper workflow remains elsewhere |
| Market insight snapshot | YES via AI insight support | NO immediate new entity required | A read-time insight payload or cached summary shown in discovery context | This should remain optional and should not block the first bounded slices |

Minimal data-design conclusion:

- existing reusable truth covers tenant identity, memberships, organization identity, certifications, RFQs, and trades
- probable new bounded need starts at directory-ready profile shaping plus an Aggregator-owned intent/handoff record
- unknowns should be verified in repo before any future schema work is proposed

## 7. Endpoint / Service Contract Design Notes

This section defines the minimum contract support likely needed. It does not assume these endpoints already exist unless repo evidence supports them.

| Capability | Purpose | Likely Placement | Current Support | Read / Mutation | What It Must Explicitly Not Do |
| --- | --- | --- | --- | --- | --- |
| Directory list / search | Return bounded discovery results for companies or capabilities | tenant-plane | NO | Read-only | Must not claim full public marketplace search, full network governance, or cross-tenant admin control |
| Counterparty detail read | Return the inspection view for one selected company or capability profile | tenant-plane | NO | Read-only | Must not become a broad company-admin profile editor |
| Intent capture mutation | Record an Aggregator-origin inquiry or sourcing intent | tenant-plane | NO as Aggregator-specific contract; PARTIAL via existing RFQ mutation | Mutation | Must not automatically match, route, negotiate, or create settlement state |
| Handoff continuation read | Return the downstream target reference and status for the submitted intent | tenant-plane | NO | Read-only | Must not pretend that downstream execution is still Aggregator-owned |
| Market insight read reuse | Show bounded AI market context inside discovery flow | tenant-plane | YES | Read-only | Must not generate workflow decisions or automated matching |

Contract design notes:

- tenant-plane placement is the best fit because the Aggregator workspace is an authenticated tenant mode
- public placement is not supported by current approved truth because the approved model is not a public marketplace directory
- control-plane placement is wrong for the core user loop because Aggregator operation is tenant-owned, not admin-owned

## 8. UI / Surface Design Notes

| Surface | Purpose | Minimum Truthful Behavior | What Must Stop Being Decorative | What Remains Out of Scope |
| --- | --- | --- | --- | --- |
| Aggregator home / discovery surface | Present curated discovery entries and bounded market context | Show real directory-backed entries, trust-oriented summary signals, and a clear path to inspect or initiate intent | Static counts, static active-lead cards, and discovery language with no real list backing | OUT OF SCOPE full orchestrator dashboard, network consoles, or transaction command center |
| Counterparty detail / inspection view | Let the operator inspect one company before acting | Show identity, capabilities, trust summary, and one clear intent action | Pure promotional copy with no inspection data | OUT OF SCOPE editable company admin console or negotiation workspace |
| Intent capture action | Let the operator express sourcing intent from discovery/detail | Submit a bounded inquiry with target context and confirmation | Decorative CTA that merely navigates without recording intent | OUT OF SCOPE automated dispatch, automated supplier selection, or multi-party thread creation |
| Handoff confirmation / next-step signal | Show that the Aggregator loop has ended and where the next step continues | Present success state, reference handle, and downstream-owned next step | Silent redirection into another surface without boundary explanation | OUT OF SCOPE downstream workflow ownership or transaction completion |

## 9. Workflow / State Notes

The smallest bounded workflow/state model is:

| State / Step | Meaning | Why It Exists | Ownership |
| --- | --- | --- | --- |
| Discovery viewed | Operator is in the Aggregator discovery workspace and can browse curated entries | Establishes the start of the Aggregator-owned loop | AGGREGATOR-OWNED |
| Counterparty selected | Operator has opened one company/capability detail surface | Required to move from browsing into inspection | AGGREGATOR-OWNED |
| Intent drafted | Operator has entered inquiry context but not submitted it yet | Separates browsing from a real action | AGGREGATOR-OWNED |
| Intent submitted | A bounded inquiry or sourcing intent has been recorded | Creates the minimum truthful workflow-backed action | AGGREGATOR-OWNED |
| Handoff created | The system has assigned the downstream continuation target or reference | Marks the exact stop boundary between Aggregator and downstream continuity | AGGREGATOR-OWNED |
| Handed off downstream | The next meaningful execution step now lives in shared RFQ/trade continuity or explicit human follow-up | Prevents Aggregator from falsely owning later workflow depth | DOWNSTREAM-OWNED |

This model deliberately avoids a workflow engine. It only defines the minimum states needed to make the approved claim true.

## 10. Bounded Build Slices

| Slice Name | User-Visible Outcome | Backend / Service Dependency | Likely File / Surface Family | New Bounded Data Support? | Why It Is Isolated | Explicitly Excluded |
| --- | --- | --- | --- | --- | --- | --- |
| Slice 1 — Discovery workspace truthfulness | Aggregator home becomes a real curated discovery surface instead of static promo content | Directory list/search read support | App.tsx plus Aggregator-specific tenant surface components | Yes, likely | It establishes the core approved claim without touching handoff yet | No intent submission, no downstream routing, no negotiation |
| Slice 2 — Counterparty inspection | User can open one company/capability detail view and inspect trust-oriented context | Counterparty detail read support | New Aggregator detail component plus App routing/orchestration | Yes, likely | It completes discovery continuity before action is introduced | No admin editing, no supplier-network console |
| Slice 3 — Intent capture and confirmation | User can submit a bounded inquiry and receive a handoff confirmation | Intent capture mutation plus confirmation read | Aggregator intent form/component, tenant service surface, bounded backend contract | Yes, likely | It creates the smallest real workflow-backed action | No automated routing, no negotiation hub, no trade creation orchestration |
| Slice 4 — Downstream handoff visibility | User can see where the request continues and which surface now owns it | Handoff reference read plus reuse of existing RFQ/trade continuity where lawful | Aggregator confirmation surface and links into shared tenant continuity | Possibly small only | It makes the ownership boundary explicit without broadening scope | No downstream workflow redesign |
| Slice 5 — AI insight contextualization | AI market context appears alongside real discovery records | Reuse of existing AI insight read support | App.tsx or new Aggregator panel component | No | It is optional and bounded, so it can ship after the core loop exists | No decision automation or ranking engine |

These slices are intentionally small enough to become later TECS candidates.

## 11. Explicit Out-of-Scope List

OUT OF SCOPE:

- automated matching or routing
- negotiation hub
- multi-party communication layer
- network revenue or take-rate
- aggregator-owned settlement
- broad supplier-network management console
- broad buyer-network management console
- broad marketplace redesign
- public marketplace directory redesign
- unrelated B2B changes
- unrelated B2C changes
- unrelated platform-admin changes
- full contract rewrite across tenant/control-plane APIs
- schema redesign beyond later bounded verification of minimal data support

## 12. Implementation-Design Readiness Recommendation

READY FOR BOUNDED TECS OPENING CANDIDATE ANALYSIS

Justification:

- the approved Aggregator model is now fixed and normalized
- the reuse boundary is clear: shell, identity, provisioning, AI insight, and downstream RFQ/trade continuity are reusable, but directory discovery and Aggregator-owned handoff are not yet present
- the minimum module set is explicit and small
- the workflow stop boundary between AGGREGATOR-OWNED and DOWNSTREAM-OWNED is now defined clearly enough to avoid scope drift
- the build slices are isolated and do not require a broad orchestrator program

This recommendation means Aggregator may move into bounded TECS opening candidate analysis later. It does not authorize opening or implementation in this document.

## 13. Boundaries and Non-Decisions

This document does not:

- authorize implementation
- open a unit
- write migrations
- change schema
- broaden Aggregator scope
- replace the design-gate artifact
- replace the normalization artifact
- resolve unrelated B2B, B2C, subscription, or platform-admin planning
- decide the exact final data model or endpoint names

Those decisions require later bounded work.

## 14. Completion Checklist

- [x] Layer 0 reviewed
- [x] TECS doctrine reviewed
- [x] Launch overlay docs reviewed
- [x] Aggregator design-gate artifact reviewed
- [x] Aggregator normalization artifact reviewed
- [x] Relevant runtime surfaces inspected
- [x] Existing capability reuse map completed
- [x] Required bounded modules defined
- [x] Data/entity design notes bounded
- [x] Endpoint/service design notes bounded
- [x] UI/surface design notes bounded
- [x] Build slices created
- [x] Out-of-scope list explicit
- [x] Readiness recommendation made
- [x] No runtime/schema/governance files modified beyond allowlist