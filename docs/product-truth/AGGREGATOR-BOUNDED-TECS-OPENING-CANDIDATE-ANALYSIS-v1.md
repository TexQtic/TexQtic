# AGGREGATOR-BOUNDED-TECS-OPENING-CANDIDATE-ANALYSIS-v1

Status: PRODUCT-TRUTH / OPENING-CANDIDATE-ANALYSIS ONLY

## 1. Purpose and Authority

This document is a bounded opening-candidate-analysis artifact for Aggregator only.

It determines the first lawful, smallest, repo-truth-backed TECS opening candidate for the approved Aggregator implementation design. It does not authorize an opening by itself. It does not assign a TECS unit ID. It does not authorize implementation.

Aggregator scope and model are already fixed by prior authority:

- approved design-gate outcome
- approved normalization outcome
- approved implementation-design outcome

APPROVED NORMALIZED MODEL:

- Curated Directory and Intent-Handoff Workspace

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
   - docs/product-truth/AGGREGATOR-IMPLEMENTATION-DESIGN-v1.md
5. Active broad product-truth stack:
   - docs/product-truth/TEXQTIC-GAP-REGISTER-v2.md
   - docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v2.md
   - docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v2.md
6. Runtime truth reviewed only as needed:
   - App.tsx
   - layouts/Shells.tsx
   - services/aiService.ts
   - services/catalogService.ts
   - services/tradeService.ts
   - server/prisma/schema.prisma

## 2. Current Posture Summary

Launch overlay posture keeps Aggregator locked in launch scope.

The Aggregator design-gate outcome selected one bounded retained model rather than allowing a broad platform-orchestrator interpretation.

The Aggregator normalization outcome fixed how runtime-adjacent surfaces must now be read:

- Aggregator identity and shell presence are real
- current discovery copy is still thinner than a fully material workflow
- shared tenant surfaces remain downstream-owned rather than Aggregator-owned proof

The Aggregator implementation-design outcome then split the approved model into five bounded slices and concluded that Aggregator is READY FOR BOUNDED TECS OPENING CANDIDATE ANALYSIS.

Opening-candidate analysis is therefore the lawful next planning step because:

- the model is already fixed
- the implementation slices are already bounded
- the remaining decision is not whether Aggregator should exist, but which slice is smallest and safest to open first under TECS

## 3. Candidate Slice Set

The candidate slices under evaluation are:

1. Discovery workspace truthfulness
   - Replace static Aggregator promo/discovery content with a real curated discovery surface.
2. Counterparty inspection
   - Add a detail/inspection view for one selected company or capability profile.
3. Intent capture and confirmation
   - Add a workflow-backed inquiry or sourcing-intent action with confirmation.
4. Downstream handoff visibility
   - Show where an already-created handoff continues and which surface owns it next.
5. AI insight contextualization
   - Improve placement of existing AI insight support around real discovery records.

## 4. Candidate Evaluation Criteria

The first candidate is judged using these criteria:

- boundedness: can it be framed as one narrow truth-closure unit rather than an Aggregator program
- repo-truth support: does current repo already provide enough scaffolding to support the slice without speculative redesign
- separability: can it be opened without implicitly requiring one or more later slices in the same unit
- dependency burden: how much new backend, service, or data work it likely drags in
- schema dependence risk: whether the slice appears to force unresolved new entity design before user-visible truth can improve
- ability to prove user-visible truth improvement: whether a later opening could show clear runtime truth gain
- risk of scope drift: how easily the slice would expand into routing, negotiation, network management, or broader marketplace logic
- fit with approved Aggregator boundary: whether the slice preserves the Aggregator-owned versus downstream-owned stop boundary

## 5. Comparative Candidate Analysis Table

| Candidate Slice | User-Visible Gain | Repo-Truth Support | Dependency Burden | Likely Schema Dependence | Risk of Scope Drift | Lawful as First Opening? | Why |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Discovery workspace truthfulness | High | PARTIAL REPO SUPPORT | Medium | SCHEMA RISK but bounded | Low | YES | It creates the first real Aggregator-owned truth closure and can improve the current static home without yet forcing intent or downstream coupling |
| Counterparty inspection | Medium | LOW PARTIAL REPO SUPPORT | Medium to high | SCHEMA RISK | Medium | POSSIBLY | It depends on discovery truth first because a detail surface without a real discovery source risks becoming another isolated decorative page |
| Intent capture and confirmation | High | PARTIAL REPO SUPPORT only through RFQ reuse | HIGH DEPENDENCY BURDEN | SCHEMA RISK | High | NO | It immediately drags in Aggregator-origin request semantics, downstream target semantics, and handoff ownership boundaries |
| Downstream handoff visibility | Medium | LOW PARTIAL REPO SUPPORT | HIGH DEPENDENCY BURDEN | Low to medium | High | NO | It depends on intent and handoff objects already existing, so it cannot be the first truthful closure |
| AI insight contextualization | Low to medium | REPO-SUPPORTED | LOW DEPENDENCY BURDEN | Low | Low | NO | It is too optional and does not close the core Aggregator truth gap by itself |

Strict conclusion:

- FIRST OPENING CANDIDATE: Discovery workspace truthfulness
- NOT FIRST: Counterparty inspection, Intent capture and confirmation, Downstream handoff visibility, AI insight contextualization

## 6. Recommended First Opening Candidate

FIRST OPENING CANDIDATE:

- Discovery workspace truthfulness

Why it is first:

- it targets the clearest current Aggregator truth defect in repo reality: the home surface is still largely static and promotional
- it is the smallest slice that improves an Aggregator-owned surface without immediately dragging in downstream workflow ownership
- it preserves the approved boundary by stopping before inquiry submission, routing, negotiation, or trade continuity

Why it is smaller and safer than the alternatives:

- smaller than counterparty inspection because it can focus on list-level truth before detail continuity exists
- safer than intent capture because it avoids introducing Aggregator-origin mutation semantics on the first opening
- safer than downstream handoff visibility because it does not require a preexisting handoff object
- stronger than AI contextualization because it closes a core truth gap rather than a secondary enhancement

Exact bounded outcome it should target:

- the Aggregator home/discovery surface becomes materially truthful as a curated discovery workspace rather than a static promo card set

What it must explicitly exclude:

- counterparty detail continuity
- inquiry submission
- handoff creation
- downstream RFQ or trade continuity changes
- automated matching or routing
- network/operator dashboard expansion

## 7. Candidate Boundary Definition

The exact boundary of the recommended candidate is:

Included user-visible surfaces:

- the Aggregator home/discovery surface currently rendered in App.tsx
- bounded curated result cards or list items that make the discovery workspace materially real
- minimal list-level trust-signaled discovery cues

Included service/backend touchpoints if any:

- only the minimum read support needed to populate discovery truthfully if static content cannot be truthfully retained
- optional reuse of existing AI market insight read support only if it remains secondary to the discovery list itself

Excluded downstream-owned surfaces:

- RFQ creation
- RFQ detail
- trade creation
- trades workspace continuity
- orders, escrow, settlement, certifications, and other shared tenant modules as proof of Aggregator depth

Excluded broader Aggregator slices:

- counterparty inspection
- intent capture and confirmation
- downstream handoff visibility
- AI insight contextualization as a primary goal

Excluded data/model ambitions:

- broad company graph or network model
- supplier/buyer network administration
- full trust-verification subsystem redesign
- Aggregator-owned transaction objects

Runtime-only truthfulness first or bounded data support?

- this candidate likely needs bounded data support rather than runtime-only copy cleanup
- a purely decorative UI rewrite would not close the approved truth gap safely
- however, the candidate should still be constrained to the smallest read-only discovery data shape necessary to make the home surface truthful

## 8. Likely File / Surface Family

Based on current repo truth, a future opening would most likely touch:

- App.tsx
- one or more new Aggregator-specific tenant surface components for the discovery workspace
- limited tenant service layer files if read support is required
- limited tenant route/backend surfaces only if no reusable read source exists already

Uncertainty that must stay explicit:

- UNKNOWN / VERIFY IN REPO whether current tenant or organization truth can support the first read-only discovery slice without a new bounded read contract
- UNKNOWN / VERIFY IN REPO whether the first candidate can remain frontend-plus-read-only-service work or whether a narrow tenant-plane backend read must be added

## 9. Opening Risks and Rejection Triggers

The candidate becomes unsafe to open first if any of the following turn out to be true:

- it requires unbounded schema work before any user-visible truth can improve
- it cannot present a truthful discovery surface without simultaneously inventing counterparty-detail semantics
- it implicitly drags in intent capture or handoff semantics to make the discovery surface meaningful
- it requires broad cross-tenant directory behavior that violates the approved tenant-owned boundary
- it turns into a strategy-level company network or supplier-management console rather than a bounded discovery surface

Concrete rejection triggers:

- no bounded read source can be identified for curated discovery
- discovery truth can only be achieved by introducing a broad new entity family rather than a narrow read model
- the candidate cannot deliver clear user-visible truth improvement without including slice 2 or slice 3 in the same unit

## 10. Deferred-to-Later Slice Notes

Counterparty inspection:

- NOT FIRST because it depends on discovery truth first
- without a truthful discovery layer, detail continuity risks becoming an isolated page with no bounded list-entry logic

Intent capture and confirmation:

- NOT FIRST because it is too coupled to unresolved data-model and handoff questions
- it immediately raises Aggregator-owned versus downstream-owned semantics that the first opening should avoid

Downstream handoff visibility:

- NOT FIRST because it depends on prior intent and handoff existence
- it cannot close truth independently; it only becomes meaningful after a handoff object exists

AI insight contextualization:

- NOT FIRST because it is too optional for first truth closure
- the repo already supports AI insight text, but improving its placement does not fix the core Aggregator discovery defect

## 11. Proof / Acceptance Criteria for Later Opening

If this candidate is later opened, bounded acceptance logic should require:

- the Aggregator home/discovery surface shows a materially truthful curated discovery experience rather than static promotional placeholders alone
- user-visible discovery continuity improves without introducing inquiry submission or downstream ownership changes
- the Aggregator-owned stop boundary remains preserved: no implicit routing, negotiation, or trade execution enters the unit
- any added read support remains bounded, read-only, and specific to the discovery surface
- non-regression is preserved for other launch families and shared tenant continuity
- the resulting surface is specific enough that later counterparty inspection can build on it without reopening discovery truth from scratch

## 12. Recommendation

READY TO DRAFT TECS OPENING PROMPT FOR THIS CANDIDATE

Justification:

- one candidate is clearly smallest and safest
- the non-selected slices are more coupled or more optional
- the recommended candidate has a clear user-visible truth target and a clear rejection boundary
- the remaining uncertainty is bounded to read-source and data-shape verification, not to Aggregator scope itself

## 13. Boundaries and Non-Decisions

This document does not:

- open a unit
- assign a TECS ID
- authorize implementation
- decide the full later-candidate order beyond the first-candidate judgment
- broaden Aggregator scope
- collapse all Aggregator slices into one future opening

## 14. Completion Checklist

- [x] Layer 0 reviewed
- [x] TECS doctrine reviewed
- [x] Launch overlay docs reviewed
- [x] Aggregator design-gate artifact reviewed
- [x] Aggregator normalization artifact reviewed
- [x] Aggregator implementation-design artifact reviewed
- [x] Candidate slices evaluated comparatively
- [x] One first candidate selected
- [x] Boundary defined tightly
- [x] Non-selected slices justified
- [x] Recommendation made
- [x] No runtime/schema/governance files modified beyond allowlist