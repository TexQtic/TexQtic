# SUBSCRIPTION-BOUNDED-TECS-OPENING-CANDIDATE-ANALYSIS-v1

## 1. Purpose and Authority

This artifact is a bounded opening-candidate-analysis document for the subscription / entitlement family.

It answers one planning question only:

- what is the first lawful, smallest, repo-truth-backed TECS opening candidate inside the approved subscription implementation-design boundary

This document does not authorize an opening by itself.

It does not:

- open a governed unit
- assign a TECS unit ID
- authorize implementation
- modify Layer 0
- widen subscription scope into billing-platform, payments, finance-ops, or product-wide entitlement architecture

Subscription scope and model are already fixed by prior authority:

- subscription / commercial packaging is `LOCKED IN FOR LAUNCH`
- the family has already passed normalization
- the implementation-design artifact already concluded `READY FOR BOUNDED TECS OPENING CANDIDATE ANALYSIS`
- canonical plan vocabulary remains `FREE / STARTER / PROFESSIONAL / ENTERPRISE`
- AI budget governance remains the one materially real commercial enforcement class
- broad product-wide entitlement gating remains unsafe to claim

Authority order used for this analysis:

1. Layer 0 governance posture:
   - `governance/control/OPEN-SET.md`
   - `governance/control/NEXT-ACTION.md`
   - `governance/control/SNAPSHOT.md`
   - `governance/control/BLOCKED.md`
   - `governance/log/EXECUTION-LOG.md`
2. `TECS.md`
3. Launch overlay authority:
   - `docs/product-truth/TEXQTIC-LAUNCH-READINESS-REQUIREMENTS-v1.md`
   - `docs/product-truth/TEXQTIC-LAUNCH-SCOPE-DECISION-RECORD-v1.md`
   - `docs/product-truth/TEXQTIC-LAUNCH-PLANNING-SPLIT-v1.md`
4. Subscription authority:
   - `docs/product-truth/SUBSCRIPTION-ENTITLEMENT-NORMALIZATION-v1.md`
   - `docs/product-truth/SUBSCRIPTION-ENTITLEMENT-IMPLEMENTATION-DESIGN-v1.md`
5. Active broad product-truth stack:
   - `docs/product-truth/TEXQTIC-GAP-REGISTER-v2.md`
   - `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v2.md`
   - `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v2.md`
6. Runtime truth inspected only as needed for separability and dependency judgment:
   - `App.tsx`
   - `types.ts`
   - `components/ControlPlane/TenantRegistry.tsx`
   - `components/ControlPlane/TenantDetails.tsx`
   - `services/controlPlaneService.ts`
   - `services/tenantService.ts`
   - `server/src/lib/aiBudget.ts`
   - `server/src/routes/tenant.ts`
   - `server/prisma/schema.prisma`
   - `shared/contracts/openapi.tenant.json`
   - `shared/contracts/openapi.control-plane.json`

All referenced paths existed in current repo truth.

## 2. Current Posture Summary

Current posture is planning-only and bounded.

- Layer 0 still shows one separate sole product-facing `ACTIVE_DELIVERY` unit: `ENTERPRISE-RFQ-TO-NEGOTIATION-BRIDGE-CONTINUITY`.
- No subscription unit is open.
- The launch overlay locks subscription / commercial packaging `IN_SCOPE`, `PRE-LAUNCH_REQUIRED`, and previously `NORMALIZATION-FIRST`.
- The subscription normalization artifact already fixed the commercial truth boundary: canonical plan vocabulary is `FREE / STARTER / PROFESSIONAL / ENTERPRISE`, AI budget governance is materially real, and broad entitlement gating is not yet safe to claim.
- The subscription implementation-design artifact then converted that normalized truth into bounded slices and concluded that the family is `READY FOR BOUNDED TECS OPENING CANDIDATE ANALYSIS`.

That makes opening-candidate analysis the lawful next planning step because:

- normalization is complete
- scope is already bounded
- implementation design exists
- the family still needs the smallest safe first opening candidate rather than one broad commercial-program opening

## 3. Candidate Slice Set

The implementation-design artifact exposes four opening-candidate slice families for evaluation.

### Frontend canonical vocabulary alignment

Meaning:

- remove frontend treatment of `TRIAL / PAID / ENTERPRISE` as canonical commercial identity
- align frontend identity typing and App-level plan normalization to the canonical backend vocabulary

### Control-plane surface correction

Meaning:

- correct admin-facing registry and tenant-detail surfaces that currently mix plan, billing, and status truth in misleading ways

### Contract and service boundary tightening

Meaning:

- tighten tenant-plane and control-plane plan semantics at route, contract, and service boundaries so `plan` is exposed as identity metadata rather than implied proof of broad entitlement maturity

### Optional bounded operator plan-assignment refinement

Meaning:

- clarify or add limited operator-admin plan-assignment behavior only if repo truth supports it, without turning the family into subscription checkout or billing lifecycle work

AI budget enforcement is intentionally not treated as a first opening candidate here.

- It is already `REPO-SUPPORTED` and `MATERIALLY ENFORCED`.
- In this family it should remain reused context and proof anchor, not the first opening target.

## 4. Candidate Evaluation Criteria

The first candidate is selected by smallest lawful truth closure, not by ambition.

Evaluation criteria:

1. `boundedness`
   - can the slice stay narrow under TECS without collapsing into the whole subscription family
2. `repo-truth support`
   - does current repo evidence clearly show both the problem and the smallest credible remedy shape
3. `separability`
   - can the slice be opened without requiring completion of later subscription slices first
4. `dependency burden`
   - how many other slice families must move with it for the unit to stay truthful
5. `schema dependence risk`
   - would the slice likely force schema or persistence redesign rather than consume current truth
6. `ability to prove visible truth improvement`
   - can the slice produce clear user-visible or admin-visible truth improvement in bounded form
7. `risk of scope drift`
   - how likely is the slice to drag in billing-platform, payments, broad entitlement, or launch-model redesign
8. `fit with approved subscription boundary`
   - does the slice preserve the already approved rule that this family is about truth alignment first, not monetization architecture

## 5. Comparative Candidate Analysis Table

| Candidate Slice | User/Admin-Visible Gain | Repo-Truth Support | Dependency Burden | Likely Schema Dependence | Risk of Scope Drift | Lawful as First Opening? | Why |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Frontend canonical vocabulary alignment` | `HIGH` | `REPO-SUPPORTED` | `LOW DEPENDENCY BURDEN` | `LOW` | `LOW` | `YES` | Current drift is explicit and concentrated: `App.tsx` normalizes to `TRIAL / PAID / ENTERPRISE`, `types.ts` codifies that union, tenant rehydration defaults to `TRIAL`, and this can be corrected without needing billing semantics or schema work. |
| `Control-plane surface correction` | `HIGH` | `REPO-SUPPORTED` | `MEDIUM DEPENDENCY BURDEN` | `LOW` | `MEDIUM` | `POSSIBLY` | Admin overclaim is real, but the control-plane surfaces currently depend on drifted frontend plan typing and mapping. Opening this first risks patching labels before canonical vocabulary is aligned underneath them. |
| `Contract and service boundary tightening` | `MEDIUM` | `PARTIAL REPO SUPPORT` | `HIGH DEPENDENCY BURDEN` | `LOW to MEDIUM` | `MEDIUM to HIGH` | `POSSIBLY` | Contracts and service types do expose `plan` as plain string, but tightening them first is less visibly corrective and more semantically coupled to later questions about entitlement meaning, canonical value exposure, and route boundary claims. |
| `Optional bounded operator plan-assignment refinement` | `LOW` | `PARTIAL REPO SUPPORT` | `HIGH DEPENDENCY BURDEN` | `LOW to MEDIUM` | `HIGH` | `NO` | Current provisioning does not expose launch-grade plan selection. Opening plan-assignment refinement first would be optional, semantics-heavy, and likely to drag the family toward commercial workflow design rather than smallest truth closure. |

Strict conclusion from comparison:

- `Frontend canonical vocabulary alignment` is the `LOWEST SAFE CANDIDATE`.
- `Control-plane surface correction` is `NOT FIRST` because it is cleaner after canonical vocabulary closure.
- `Contract and service boundary tightening` is `NOT FIRST` because it is more coupled to broader semantics than the visible drift source.
- `Optional bounded operator plan-assignment refinement` is `NOT FIRST` because it is both optional and too close to wider commercial workflow questions.

## 6. Recommended First Opening Candidate

Recommended `FIRST OPENING CANDIDATE`:

- `Frontend canonical vocabulary alignment`

Why it is first:

- it closes the most central truth drift already proven in repo reality
- it is the smallest slice that improves both tenant-visible and admin-visible commercial truth without widening into billing or entitlement architecture
- it is strongly evidenced by existing code rather than inferred from future product ambition

Why it is smaller and safer than the alternatives:

- unlike control-plane surface correction, it does not begin by polishing downstream UI labels while core frontend identity still codifies the wrong commercial vocabulary
- unlike contract/service boundary tightening, it does not require the first unit to settle broader contract semantics or route-level canonical enum exposure
- unlike operator plan-assignment refinement, it does not depend on adding optional commercial workflow behavior that current repo truth does not yet require

Exact bounded outcome it should target:

- frontend shared plan typing and App-level plan normalization stop treating `TRIAL / PAID / ENTERPRISE` as canonical persisted plan identity
- canonical commercial identity displayed or propagated through frontend identity state aligns to `FREE / STARTER / PROFESSIONAL / ENTERPRISE`
- display-only shorthand, if retained at all, is clearly secondary and non-canonical

What it must explicitly exclude:

- payment processor integration
- invoice generation
- billing statements or receivables behavior
- finance-ops redesign
- broad plan-gated access control
- product-wide entitlement matrix
- plan-selection checkout or subscription lifecycle work
- broad contract or route redesign unless a minimal typed boundary adjustment is strictly unavoidable inside the same unit

## 7. Candidate Boundary Definition

Boundary for the recommended candidate must remain tight.

Included user-visible or admin-visible surfaces:

- tenant/frontend identity plan rendering paths that currently normalize canonical values into `TRIAL / PAID / ENTERPRISE`
- admin-visible plan display paths only where they are directly coupled to the same canonical-vocabulary drift

Included service/backend touchpoints if any:

- limited frontend service type surfaces that feed the shared frontend tenant identity model
- no broad backend behavior change is implied

Excluded broader subscription slices:

- control-plane billing/widget truth correction that goes beyond direct fallout from canonical plan realignment
- contract description tightening as a standalone semantic cleanup stream
- operator plan-assignment refinement

Excluded billing/finance/payment ambitions:

- all payment, invoice, statement, MRR, unbilled usage, collections, tax, and revenue-ops scope remains `OUT OF SCOPE`

Runtime/UI truthfulness vs contract/backend tightening:

- this candidate should aim for runtime/UI truthfulness first
- limited service-type tightening is acceptable only where required to keep the frontend identity model coherent
- contract/backend tightening should not be pulled in as the main objective of this first unit

## 8. Likely File / Surface Family

Based on current repo truth, a future opening for the recommended candidate would likely touch this file/surface family:

- `types.ts`
- `App.tsx`
- `services/controlPlaneService.ts` if frontend type alignment requires canonical plan typing at the client boundary
- `services/tenantService.ts` if activation response typing must align with the same frontend model

Possible but not preferred in the first unit:

- `components/ControlPlane/TenantRegistry.tsx` only if canonical plan alignment cannot be completed truthfully without removing the direct `BASIC -> TRIAL` compatibility drift in the same bounded unit

Uncertain and likely better deferred unless unavoidable:

- `shared/contracts/openapi.tenant.json`
- `shared/contracts/openapi.control-plane.json`
- `server/src/routes/tenant.ts`

Current repo evidence does not suggest that the first candidate should require:

- `server/prisma/schema.prisma`
- DB migration work
- AI budget enforcement changes in `server/src/lib/aiBudget.ts`

## 9. Opening Risks and Rejection Triggers

The recommended candidate becomes unsafe to open first if repo-truth review later shows any of the following:

- canonical frontend alignment cannot be completed without broad contract or route redesign
- the unit would require schema or persistence changes rather than consuming current canonical plan truth
- the work would implicitly drag in billing semantics such as invoice state, payment state, or revenue reporting
- visible truth improvement cannot be shown without simultaneously opening control-plane billing correction and contract semantics together
- the candidate starts to redefine entitlement meaning instead of aligning canonical vocabulary
- the candidate requires broad launch-family plan gating or mode-access decisions

If any of those conditions appear, the candidate should be rejected as the first opening and re-bounded before prompt drafting.

## 10. Deferred-to-Later Slice Notes

### Control-plane surface correction

`NOT FIRST`

Why:

- current admin overclaim is real, but the surface still sits on top of the same frontend plan drift
- correcting admin labels first risks a partial cosmetic close while core canonical vocabulary remains inconsistent underneath
- it is stronger as the second follow-on slice after canonical vocabulary is stabilized

### Contract and service boundary tightening

`NOT FIRST`

Why:

- current contracts and service types expose `plan` as plain string, but the most visible truth error still lives in frontend normalization and display behavior
- opening this slice first would pull the first unit toward semantics and contract posture rather than the smallest visible truth closure
- it is better after canonical frontend vocabulary is no longer contradictory

### Optional bounded operator plan-assignment refinement

`NOT FIRST`

Why:

- repo truth does not currently show launch-grade plan selection during provisioning or onboarding
- the slice is explicitly optional in the implementation design
- opening it first would create immediate pressure toward broader commercial workflow design, which violates the approved boundary

### AI budget enforcement as a target slice

`NOT FIRST`

Why:

- AI budget governance is already materially real and should remain reused proof context
- reopening AI budget first would not solve the highest truth drift, which is canonical plan vocabulary mismatch
- it would risk reframing the family around commercial enforcement expansion rather than bounded identity truth correction

## 11. Proof / Acceptance Criteria for Later Opening

A future opening for the recommended candidate should rely on the following bounded acceptance logic:

1. user-visible or admin-visible truth improves in a clearly demonstrable way
   - canonical plan identity no longer depends on `TRIAL / PAID / ENTERPRISE` as the persisted source-of-truth vocabulary

2. no scope drift occurs
   - no payment, invoice, finance-ops, checkout, or broad entitlement work is added

3. bounded file compliance is preserved
   - touched files stay within the narrow frontend identity and directly coupled client-typing family unless an explicit re-scope is approved

4. commercial truth boundary remains preserved
   - AI budget remains the one explicitly materially enforced commercial control
   - the unit does not claim or implement broad plan-driven gating

5. non-regression of other launch families is preserved
   - no change widens B2B, B2C, WL, Aggregator, or platform-admin scope claims by implication

6. compatibility handling, if retained, is explicitly secondary
   - any grouped or legacy display labels are clearly non-canonical rather than silently replacing canonical plan identity

7. schema independence remains intact unless re-approved
   - no migration or schema redesign is required for the first unit to close truthfully

## 12. Recommendation

Recommendation:

- `READY TO DRAFT TECS OPENING PROMPT FOR THIS CANDIDATE`

Justification:

- the first candidate is not ambiguous after repo-truth review
- one slice is materially smaller and safer than the others
- current repo evidence supports a bounded first opening around canonical frontend vocabulary alignment without forcing billing-platform scope
- the deferred slices have clear reasons not to open first

## 13. Boundaries and Non-Decisions

This document does not:

- open a unit
- assign a TECS ID
- authorize implementation
- decide later candidate order beyond the first-candidate judgment
- broaden subscription scope into billing-platform work
- decide that contracts must change now
- decide that schema must change now
- decide that operator plan-assignment should become part of launch-grade commercial workflow now

## 14. Completion Checklist

- [x] Layer 0 reviewed
- [x] TECS doctrine reviewed
- [x] Launch overlay docs reviewed
- [x] Subscription normalization artifact reviewed
- [x] Subscription implementation-design artifact reviewed
- [x] Candidate slices evaluated comparatively
- [x] One first candidate selected
- [x] Boundary defined tightly
- [x] Non-selected slices justified
- [x] Recommendation made
- [x] No runtime/schema/governance files modified beyond allowlist