---
unit_id: CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-001
title: Decision posture for the certification lifecycle transition/logging gap
type: DECISION
status: CLOSED
wave: W5
plane: BOTH
opened: 2026-03-23
closed: 2026-03-23
verified: null
commit: null
evidence: "LAYER_0_CONFIRMATION: OPEN-SET contains no OPEN implementation-ready unit, NEXT-ACTION is OPERATOR_DECISION_REQUIRED, and ADDITIONAL-REPO-TRUTH-CANDIDATES-001 already preserved the certification transition/logging surface as the sole new high-confidence survivor · EXPOSED_TRANSITION_SURFACE_CONFIRMATION: tenant Certifications UI exposes Submit Transition, frontend transitionCertification() is live, and tenant POST /api/tenant/certifications/:id/transition is installed · BACKEND_NON_APPLICATION_CONFIRMATION: CertificationService.transitionCertification() routes into StateMachineService.transition(), current CERTIFICATION path always returns CERTIFICATION_LOG_DEFERRED, and the denial message states that certification_lifecycle_logs does not exist · FRAMING_CORRECTION: current code/governance still points this deferred path at G-023 even though G-023 is a different already-closed reasoning-log stream, so the candidate must be framed as its own exact certification transition/logging decision"
doctrine_constraints:
  - D-004: this decision remains limited to the certification lifecycle transition/logging gap and must not merge certification metadata PATCH UI, maker-checker mutation work, broad certification redesign, or unrelated AI/governance follow-ons
  - D-011: the decision must distinguish transition-surface exposure, backend non-application, and lifecycle-log absence explicitly, and must not collapse them into vague certification-platform redesign
  - D-013: OPENING_CANDIDATE is not OPEN, recommendation is not authorization, and NEXT-ACTION must remain OPERATOR_DECISION_REQUIRED until a separate opening prompt is executed
decisions_required: []
blockers: []
---

## Unit Summary

`CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-001` records the bounded governance decision for the
currently evidenced certification lifecycle transition/logging gap.

The decision question is whether the truthful future sequencing posture is one bounded opening
candidate, a required split, a blocked dependency posture, or no recommendation.

Result: `OPENING_CANDIDATE`.

## Layer 0 State Confirmation

Exact Layer 0 posture on entry:

- `OPEN-SET.md`: no implementation-ready unit is `OPEN`
- `NEXT-ACTION.md`: `OPERATOR_DECISION_REQUIRED`
- `SNAPSHOT.md`: the most recent closed unit is `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002`
- `ADDITIONAL-REPO-TRUTH-CANDIDATES-001`: the certification transition/logging surface is already
  preserved as the sole new high-confidence additional candidate outside the normalized Step 2
  ledger

This confirms the current question is decision-only posture, not implementation or opening.

## Decision Question

Choose the single narrowest truthful next disposition for the certification lifecycle
transition/logging gap:

- `OPENING_CANDIDATE`
- `SPLIT_REQUIRED`
- `BLOCKED_PENDING_PRIOR_DECISION`
- `NOT_RECOMMENDED`

## Candidate Framings Considered

### 1. `certification lifecycle transition/logging gap`

Evidence for:

- `components/Tenant/CertificationsPanel.tsx` exposes a real tenant transition form and live
  `Submit Transition` action
- `services/certificationService.ts` exports `transitionCertification()` as a live helper, not a
  stub
- `server/src/routes/tenant/certifications.g019.ts` exposes `POST /api/tenant/certifications/:id/transition`
- `server/src/services/certification.g019.service.ts` converts the state-machine denial into
  `TRANSITION_NOT_APPLIED`
- `server/src/services/stateMachine.service.ts` explicitly denies `CERTIFICATION` transitions
  because `certification_lifecycle_logs` does not exist

Evidence against:

- the label could become too broad if it were used to absorb unrelated certification metadata,
  maker-checker mutation, or broader certification redesign work

Assessment:

This is the narrowest truthful framing if the later opening remains explicitly limited to the
already-exposed certification transition path plus the missing lifecycle-log persistence that blocks
application.

### 2. `certification transition surface exposed before backend readiness`

Evidence for:

- the tenant UI, frontend helper, and tenant route are all live today
- the backend currently returns a guaranteed non-applied path for the exposed transition attempt

Evidence against:

- this framing over-centers the presentation surface and under-describes the actual enforcement
  cause in the state machine
- hiding or reclassifying the UI alone would not resolve the underlying transition applicability
  gap already present in the installed route/service path

Assessment:

Useful as a descriptive symptom, but too surface-weighted to be the primary governance framing.

### 3. `certification lifecycle-log persistence gap`

Evidence for:

- the explicit denial cause is the missing `certification_lifecycle_logs` table
- `StateMachineService.transition()` names lifecycle-log absence as the exact reason the transition
  was not recorded

Evidence against:

- this framing is too storage-centric and under-represents the fact that the transition surface is
  already exposed end-to-end in the tenant path
- it could encourage a misleading schema-only reading instead of the correct bounded product/runtime
  applicability slice

Assessment:

This identifies the true root cause, but it is too narrow to describe the currently installed
user-visible failure surface by itself.

### 4. `split required between transition exposure and lifecycle-log persistence`

Evidence for:

- the surface exposure and the persistence cause are analytically distinguishable

Evidence against:

- current repo truth shows one direct causal chain, not two independently governable slices
- no separate UI-only child or persistence-only child is justified by current evidence
- a split now would create artificial separation between symptom and root cause inside the same
  already-installed transition path

Assessment:

Rejected. Current evidence does not require split.

## Selected Decision

Selected option: `OPENING_CANDIDATE`.

Selected framing: `certification lifecycle transition/logging gap`.

## Rationale

### The exposed transition surface is real and current

- the tenant Certifications panel currently renders a live transition form
- the frontend transition helper is installed and callable
- the tenant route accepts the transition request and maps backend non-application to HTTP `422`

This is not hypothetical or dead code.

### The backend non-application is real and current

- `CertificationService.transitionCertification()` currently routes into `StateMachineService.transition()`
- the service treats the denial as `TRANSITION_NOT_APPLIED`
- the current state-machine path for `CERTIFICATION` denies the transition before any log write can
  occur

This is current installed behavior, not stale commentary alone.

### Lifecycle-log absence is the bounded root issue

The root cause named by the current code is the absence of certification lifecycle-log persistence.
That is the exact reason the state machine refuses to record or apply the transition.

However, the truthful future unit framing must not be reduced to storage alone, because the repo
already exposes the transition path end-to-end. The opening candidate therefore has to cover the
certification transition applicability gap for the already-exposed tenant path, with lifecycle-log
persistence as the core enabling repair.

### Split is not required

Current repo truth does not show two separately governable defects. It shows one installed
transition surface whose application is blocked by one exact missing persistence capability.

### No prior decision blocks this posture

The candidate is not already governed as an exact active unit, and no prior product ownership
decision is required before recognizing it as one later bounded opening candidate.

### The stale deferred future-unit reference materially affects framing

Yes. The current code and governance history still point the certification deferral at `G-023`, but
current repo truth shows `G-023` is a different already-closed reasoning-log stream. That stale
reference materially matters because it means the certification transition/logging gap cannot be
treated as safely governed under an existing exact future unit. This decision therefore frames it as
its own exact bounded candidate rather than as an implied subtask of `G-023`.

## Exact In-Scope Boundary

This decision is limited to:

- the tenant certification transition surface that is already installed
- the tenant transition helper and tenant route that are already installed
- the backend certification transition path that currently cannot apply transitions
- the missing certification lifecycle-log persistence that causes the current denial
- deciding the narrowest truthful future posture for that one combined slice

## Exact Out-of-Scope Boundary

This decision excludes all of the following:

- implementation
- frontend code changes
- backend code changes
- schema or migration work
- contract/OpenAPI changes
- certification metadata PATCH UI work
- maker-checker mutation work
- vector embedding work
- broader certification redesign
- Governance OS redesign
- automatic implementation opening

## Narrowest Truthful Future Opening Boundary

If a later opening is chosen, it must remain limited to the already-exposed certification
transition path and the minimum persistence/enforcement work required so that certification
lifecycle transitions can be lawfully recorded and applied for that bounded path.

Any later opening must not absorb certification metadata PATCH UI, maker-checker sign/replay
surface expansion, broad certification architecture redesign, or unrelated AI/logging streams.

## Resulting Next-Action Posture

Resulting posture after this decision:

- `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-001` is `CLOSED`
- decision result: `OPENING_CANDIDATE`
- no implementation unit is opened by this decision
- `NEXT-ACTION` remains `OPERATOR_DECISION_REQUIRED`

## Risks / Blockers

- any later opening must stay disciplined and not widen into certification metadata editing,
  maker-checker mutation work, or broad certification redesign
- the later repair will likely touch persistence/enforcement boundaries, but this decision does not
  authorize schema or migration work
- stale `G-023` references remain a governance-framing risk until a later opening or corrective
  governance step explicitly supersedes them

## Atomic Commit

`[CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-001] decide next-step posture for certification lifecycle transition/logging gap`