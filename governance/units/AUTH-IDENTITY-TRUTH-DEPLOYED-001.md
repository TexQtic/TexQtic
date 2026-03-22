---
unit_id: AUTH-IDENTITY-TRUTH-DEPLOYED-001
title: Deployed identity-truth defect posture decision after realm-boundary closure
type: GOVERNANCE
status: CLOSED
wave: W5
plane: BOTH
opened: 2026-03-22
closed: 2026-03-22
verified: 2026-03-22
commit: null
evidence: "LAYER_0_CONFIRMATION: NEXT-ACTION entered this unit as decision-only after REALM-BOUNDARY-SHELL-AFFORDANCE-001 closed on deployed proof for ddeb579 · DEPLOYED_FINDING_CONFIRMATION: remaining identity-truth observations are still mixed across control-plane displayed identity truth, tenant-shell displayed identity truth, and impersonation persona labeling clarity · GOVERNANCE_DECISION: SPLIT_REQUIRED because shell-specific evidence is not yet sufficient to justify one truthful implementation opening without over-generalizing or silently merging stop-path cleanup"
doctrine_constraints:
  - D-004: this is one bounded decision unit only; no implementation opening, no child implementation creation, and no mixed lifecycle work may be bundled in
  - D-007: governance-only units must not touch product code, schema, tests, CI, or runtime configuration
  - D-011: identity-truth analysis must preserve explicit tenant versus control-plane boundary truth and must not generalize one shell's evidence to another without proof
  - D-013: any closure of this decision unit must preserve that recommendation is not authorization and candidate is not open
decisions_required: []
blockers: []
---

## Unit Summary

`AUTH-IDENTITY-TRUTH-DEPLOYED-001` is the sole bounded decision unit for the remaining deployed
identity-truth defect family after closure of `REALM-BOUNDARY-SHELL-AFFORDANCE-001`.

The decision question is whether the remaining finding is already narrow enough for one bounded
implementation opening or whether it must remain non-open.

The selected result is `SPLIT_REQUIRED`.

The current finding is still mixed across multiple narrower concerns:

- control-plane displayed identity truth
- tenant-shell displayed identity truth
- impersonation persona labeling and persona clarity

In addition, `IMPERSONATION-STOP-CLEANUP-001` remains causally separate and must not be merged into
this decision unit.

## Layer 0 State Confirmation

Layer 0 on entry to this unit is:

- `OPEN-SET.md`: no implementation-ready unit is `OPEN`
- `NEXT-ACTION.md`: `AUTH-IDENTITY-TRUTH-DEPLOYED-001` decision only
- `SNAPSHOT.md`: `REALM-BOUNDARY-SHELL-AFFORDANCE-001` is `CLOSED` and does not authorize broader auth, impersonation, routing, or control-plane continuation by implication

## Decision Question

Choose the single narrowest truthful next disposition for the deployed identity-truth finding:

- `OPENING_CANDIDATE`
- `DECISION_REQUIRED_CONTINUE`
- `SPLIT_REQUIRED`
- `HOLD`
- `RECORD_ONLY`

## Options Considered

### 1. `OPENING_CANDIDATE`

Rejected.

This would be premature because current evidence is not yet one unified bounded slice. The observed
identity-truth issue family crosses at least three distinct surfaces, and white-label or tenant-shell
behavior must not be inferred from enterprise-shell or control-plane observations alone.

### 2. `DECISION_REQUIRED_CONTINUE`

Rejected.

More refinement is not the core problem. The current issue is not merely missing wording or a missing
tie-breaker; it is that the remaining finding already resolves into narrower sub-slices and should be
explicitly split before any opening can be truthful.

### 3. `SPLIT_REQUIRED`

Selected.

This is the narrowest truthful posture because the finding is still mixed across shell contexts and
persona-display concerns. A single opening now would overstate certainty and risk smuggling multiple
runtime-sensitive defects into one implementation unit.

### 4. `HOLD`

Rejected.

The finding remains active enough to require governance posture, so a pure hold would understate the
need for next-step precision.

### 5. `RECORD_ONLY`

Rejected.

The finding is stronger than a passive record. It is a real deployed defect family with enough signal
to require explicit split discipline before any opening is considered.

## Selected Option

`SPLIT_REQUIRED`

## Rationale

The remaining deployed identity-truth observations are not yet one truthful bounded slice.

### Control-plane identity truth

Evidence supports a remaining concern in authenticated control-plane chrome and displayed identity
truth, especially where impersonation context affects what the chrome claims about who the operator is.

### Tenant-shell identity truth

Tenant-shell identity truth remains a separate question. Shell-specific evidence must be kept bounded,
and white-label behavior must not be generalized from enterprise-shell observations unless explicitly
proven.

### Impersonation persona clarity

Impersonation persona labeling and persona clarity are related to displayed identity truth, but they
are not automatically equivalent to stop-path cleanup and are not proven to behave identically across
all shells.

### Stop-path cleanup remains separate

`IMPERSONATION-STOP-CLEANUP-001` remains causally separate. A stop-path cleanup defect concerns exit
or teardown behavior, while identity-truth concerns what authenticated chrome claims during active
runtime. They may be adjacent, but they are not the same slice and must not be merged implicitly.

For those reasons, opening now would be broader than the proved boundary. The truthful next posture is
to require split before any implementation opening.

## Exact In-Scope Boundary

This decision unit covers only:

- deployed identity-truth correctness in authenticated chrome
- control-plane displayed identity truth as a separate concern
- tenant-shell displayed identity truth as a separate concern
- impersonation persona labeling and persona clarity as a separate concern
- determination of whether these observations are one slice or multiple narrower slices
- the exact future opening posture required if a later child is ever proposed

## Exact Out-of-Scope Boundary

This decision unit does not authorize or include:

- implementation work of any kind
- auth architecture rewrite
- token or session redesign
- DB, schema, migration, Prisma, or API changes
- `IMPERSONATION-STOP-CLEANUP-001`
- realm-boundary continuation from `REALM-BOUNDARY-SHELL-AFFORDANCE-001`
- broad impersonation program design
- white-label generalization without explicit proof
- any hidden implementation opening

## Verification Requirement For Any Later Opening

Any future opening, if later separately proposed, must require effective deployed verification and
must not rely on local-only proof.

The minimum future verification posture is:

- exact shell identification for the defect under test
- explicit proof of whether the defect occurs in control-plane chrome, tenant chrome, or both
- explicit proof of whether white-label reproduces or does not reproduce
- explicit proof that persona labeling during impersonation is incorrect, ambiguous, or truthful
- explicit proof that stop-path cleanup is either separate or not implicated for that exact child

No later opening may claim a universal auth defect unless deployed evidence proves cross-shell truth.

## Resulting NEXT-ACTION Posture

`OPERATOR_DECISION_REQUIRED`

Reason: this unit records that split is required, but it does not create child units, does not open
implementation, and does not authorize any one child by implication.

## Risks / Blockers

- shell-specific evidence remains mixed and must not be generalized
- white-label identity-truth behavior is not yet independently proved for this defect family
- impersonation persona clarity and stop-path cleanup are adjacent but not yet one causal slice
- a broad opening now would create hidden scope drift across multiple runtime-sensitive concerns

## Governance Closure

- Closure result: `AUTH-IDENTITY-TRUTH-DEPLOYED-001`
- Status transition: `OPEN` -> `CLOSED`
- Selected posture: `SPLIT_REQUIRED`
- Resulting Layer 0 posture: `OPERATOR_DECISION_REQUIRED`

## Mandatory Post-Close Audit

### 1. State summary

- `AUTH-IDENTITY-TRUTH-DEPLOYED-001` is now `CLOSED`
- the resulting decision posture is `SPLIT_REQUIRED`
- no implementation-ready unit is opened by this decision

### 2. Outstanding gates

- no bounded child identity-truth unit is yet named or opened
- `IMPERSONATION-STOP-CLEANUP-001` remains separate and unopened here
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`

### 3. Natural next-step candidates

- `DECISION_REQUIRED`
- `RECORD_ONLY`
- `HOLD`

### 4. Recommended next governance-valid move

- `DECISION_REQUIRED`

Reason: split is now established, but the narrower child boundaries are not created in this unit and
must not be inferred automatically.

### 5. Why stronger moves remain blocked

- a single implementation opening would over-compress shell-specific evidence into a broader auth claim
- stop-path cleanup remains separate and must not be smuggled into persona-labeling work
- white-label behavior is not yet independently proved for this defect family

### 6. Forbidden next moves

- no implementation opening from this decision
- no merged identity-truth plus stop-cleanup unit
- no broad auth or impersonation program opening
- no shell-generalization without deployed proof

### 7. Resulting Layer 0 posture

- `NEXT-ACTION` returns to `OPERATOR_DECISION_REQUIRED`
- no implementation-ready unit is open
- the next lawful move, if any, is a later separate decision that names narrower identity-truth child boundaries explicitly and keeps stop-path cleanup separate

## Atomic Commit

`[AUTH-IDENTITY-TRUTH-DEPLOYED-001] record decision posture for deployed identity-truth defect`

**Read control-plane files before this unit file. This file refines unit-specific truth only.**