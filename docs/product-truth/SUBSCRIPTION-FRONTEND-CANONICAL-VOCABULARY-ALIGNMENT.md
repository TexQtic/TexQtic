# SUBSCRIPTION-FRONTEND-CANONICAL-VOCABULARY-ALIGNMENT

Status: Opening draft only for later bounded TECS approval

## Opening Title

Subscription frontend canonical vocabulary alignment

## 1. Purpose and Authority

This artifact is a TECS opening draft only for one bounded Subscription / Entitlement child unit.

It exists to prepare the smallest lawful first product-facing unit inside the already approved Subscription family boundary.

This draft does not:

- authorize implementation by itself
- open a governed unit by itself
- assign a TECS implementation result
- modify Layer 0 by itself
- widen Subscription into billing-platform, payment, invoice, finance-ops, or broad entitlement architecture

This draft inherits already-decided family truth:

- Subscription / commercial packaging is `LOCKED IN FOR LAUNCH`
- normalization is complete
- implementation design is complete
- opening-candidate analysis is complete
- the selected first candidate is `Frontend canonical vocabulary alignment`
- AI budget governance is already materially real and must remain reused context only
- broad product-wide entitlement gating remains unsafe to claim

Authority stack honored by this draft:

1. Layer 0 / governance posture
   - `governance/control/OPEN-SET.md`
   - `governance/control/NEXT-ACTION.md`
   - `governance/control/SNAPSHOT.md`
   - `governance/control/BLOCKED.md`
   - `governance/log/EXECUTION-LOG.md`
2. `TECS.md`
3. Launch overlay authority
   - `docs/product-truth/TEXQTIC-LAUNCH-READINESS-REQUIREMENTS-v1.md`
   - `docs/product-truth/TEXQTIC-LAUNCH-SCOPE-DECISION-RECORD-v1.md`
   - `docs/product-truth/TEXQTIC-LAUNCH-PLANNING-SPLIT-v1.md`
4. Subscription family authority
   - `docs/product-truth/SUBSCRIPTION-ENTITLEMENT-NORMALIZATION-v1.md`
   - `docs/product-truth/SUBSCRIPTION-ENTITLEMENT-IMPLEMENTATION-DESIGN-v1.md`
   - `docs/product-truth/SUBSCRIPTION-BOUNDED-TECS-OPENING-CANDIDATE-ANALYSIS-v1.md`
5. Active broad product-truth stack
   - `docs/product-truth/TEXQTIC-GAP-REGISTER-v2.md`
   - `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v2.md`
   - `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v2.md`

## 2. Why This Unit Is Being Opened Now

This unit is being drafted now because the Subscription family has already completed the lawful prior planning stages and now has one selected lowest-risk first opening candidate.

Current repo truth shows the smallest visible truth drift in this family is not payment behavior, invoice behavior, plan assignment workflow, or broad entitlement enforcement.

The smallest visible truth drift is frontend canonical commercial identity drift:

- frontend identity handling currently treats `TRIAL / PAID / ENTERPRISE` as if they were canonical commercial identity
- approved canonical plan vocabulary is instead:
  - `FREE`
  - `STARTER`
  - `PROFESSIONAL`
  - `ENTERPRISE`
- current frontend shared typing, App-level normalization, and directly coupled display propagation can silently substitute non-canonical commercial identity for the approved canonical vocabulary

This unit therefore exists to close the smallest visible truth drift in current repo reality.

It is a truth-alignment unit, not a monetization architecture unit.

## 3. Exact Bounded Scope

This unit is bounded to frontend canonical vocabulary alignment only.

In scope:

- frontend shared plan typing
- App-level or frontend identity plan normalization
- directly coupled frontend/service typing only where required to keep canonical frontend identity coherent
- admin-visible plan display paths only if directly coupled to the same frontend canonical vocabulary drift

Expected closure target:

- frontend canonical plan identity no longer treats `TRIAL / PAID / ENTERPRISE` as the source-of-truth commercial vocabulary
- frontend identity handling aligns to the approved canonical commercial identity:
  - `FREE`
  - `STARTER`
  - `PROFESSIONAL`
  - `ENTERPRISE`
- any retained display shorthand or compatibility handling is explicitly secondary and non-canonical

This unit is not a general commercial cleanup stream.

## 4. Explicit Exclusions

This unit explicitly excludes all of the following:

- payment processor integration
- checkout flow work
- invoice generation
- billing statements
- receivables, collections, or finance-ops redesign
- tax, MRR, or revenue reporting
- broad subscription lifecycle design
- broad contract redesign
- route redesign unless a minimal directly necessary typed adjustment is unavoidable
- schema or persistence changes
- DB migration work
- broad entitlement matrix definition
- broad plan-gated access control
- product-wide entitlement architecture
- operator commercial workflow expansion
- plan-assignment workflow expansion
- reopening AI budget governance as the target of this unit
- any widening into B2B, B2C, Aggregator, WL, or platform-admin launch families

## 5. Expected File / Surface Family

Preferred file / surface family for this unit:

- `types.ts`
- `App.tsx`
- `services/controlPlaneService.ts` only if required for client-boundary type alignment
- `services/tenantService.ts` only if required for the same frontend identity model coherence

Allowed but not preferred:

- `components/ControlPlane/TenantRegistry.tsx` only if direct fallout from the same canonical vocabulary drift cannot be closed truthfully without it

Explicitly not presumed necessary for first opening:

- `shared/contracts/openapi.tenant.json`
- `shared/contracts/openapi.control-plane.json`
- `server/src/routes/tenant.ts`
- `server/prisma/schema.prisma`
- `server/src/lib/aiBudget.ts`

Repo-truth note:

- current evidence supports a frontend-first bounded opening because the most explicit drift lives in shared frontend typing and App-level normalization
- contract, route, schema, and AI-budget surfaces are read authority for this unit, not presumed implementation targets

## 6. Acceptance Logic / Completion Conditions

This unit should be considered complete only if all of the following are true:

1. user-visible or admin-visible truth improves in a clearly demonstrable way

2. canonical plan identity in frontend handling no longer depends on `TRIAL / PAID / ENTERPRISE` as the source-of-truth commercial vocabulary

3. canonical commercial identity aligns to:
   - `FREE`
   - `STARTER`
   - `PROFESSIONAL`
   - `ENTERPRISE`

4. any retained display shorthand or compatibility mapping is clearly secondary and non-canonical

5. no payment, invoice, finance, checkout, or broad entitlement work is added

6. touched files remain within the bounded frontend identity family unless explicit re-scope is approved

7. AI budget remains reused context only, not the subject of this opening

8. no schema redesign or migration is required

9. no implication widens other launch-family scope claims

## 7. Rejection / Re-Bound Triggers

This opening becomes unsafe and must be rejected, re-bounded, or escalated if later repo-truth review shows any of the following:

- the candidate cannot be completed without broad contract or route redesign
- the unit requires schema or persistence changes
- the unit implicitly drags in billing, invoice, payment-state, or revenue semantics
- visible truth improvement cannot be shown without combining multiple later slices
- the unit starts redefining entitlement meaning instead of aligning canonical vocabulary
- the unit requires broad launch-family plan gating or mode-access decisions

If any of these conditions appear, this unit is no longer the smallest safe opening and must not proceed unchanged.

## 8. Why This Is The First Unit

This is the first unit instead of later slices because it is the smallest lawful truth closure in the Subscription family.

Why this first unit is stronger than the later slices:

- it addresses the clearest current drift already proven in repo truth
- it is visibly corrective without needing monetization-platform scope
- it has the lowest dependency burden among the evaluated slices
- it can remain bounded under TECS without silently becoming a broader commercial program

### Why not control-plane surface correction first

Not first because admin cleanup should follow canonical vocabulary closure rather than cosmetically patching downstream surfaces first.

### Why not contract and service boundary tightening first

Not first because it is more semantically coupled, less visibly corrective, and more likely to widen the first unit.

### Why not optional operator plan-assignment refinement first

Not first because it is optional, less strongly repo-supported as launch-grade truth closure, and risks expanding into commercial workflow design.

### Why not AI budget enforcement expansion first

Not first because AI budget governance is already materially real and should remain reused proof context rather than being reopened as the target slice.

## 9. Non-Decisions

This draft does not:

- authorize implementation by itself
- assign a TECS implementation result
- widen Subscription into billing-platform work
- decide broad entitlement architecture
- decide checkout or payment lifecycle design
- decide operator plan-assignment as launch-grade workflow
- require contract or schema change unless later explicitly re-approved
- change Layer 0 posture by itself

## 10. Completion Checklist

- [x] Opening is centered only on frontend canonical vocabulary alignment
- [x] Canonical vocabulary is stated exactly as `FREE / STARTER / PROFESSIONAL / ENTERPRISE`
- [x] `TRIAL / PAID / ENTERPRISE` drift is described as the current frontend truth problem
- [x] AI budget governance is preserved as already-real reused context only
- [x] All exclusions are explicit
- [x] All rejection triggers are explicit
- [x] Acceptance logic is bounded and testable
- [x] No billing-platform drift appears
- [x] No schema, contract, or route redesign is presumed
- [x] No second Subscription slice is silently merged into this first opening
- [x] Exactly one draft artifact is produced