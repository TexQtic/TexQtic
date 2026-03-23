---
unit_id: GOVERNANCE-SENTINEL-AND-DELIVERY-OS-001
title: Decide Governance OS delivery-steering upgrade and Sentinel enforcement framework
type: GOVERNANCE
status: CLOSED
wave: W5
plane: CONTROL
opened: 2026-03-23
closed: 2026-03-23
verified: null
commit: null
evidence: "LAYER_0_CONFIRMATION: CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002 remains the sole OPEN implementation-ready unit, NEXT-ACTION points to that exact unit, and TECS-FBW-ADMINRBAC remains DESIGN_GATE · GOVERNANCE_ANALYSIS_CONFIRMATION: current Step 2 pending-candidate ledger exists under a phase-based name, no permanent role-based canonical normalization ledger existed yet, and current candidate normalization already relies on exact bounded analysis artifacts and negative evidence · DOCTRINE_PRESERVATION_CONFIRMATION: GOV-OS-001 design authority still requires Layer 0 first-read discipline, explicit lifecycle stages, controlled status vocabulary, governance-vs-implementation separation, exact allowlists, and no operational truth from historical files"
doctrine_constraints:
  - D-004: this decision remains governance-only and may not open, implement, verify, sync, or close any product unit by implication
  - D-007: no application code, schema, migration, contract, CI, or Sentinel tooling implementation is authorized in this unit
  - D-011: delivery steering must preserve TECS lifecycle stages and must not collapse status, authorization, or bounded-unit discipline
  - D-013: recommendation is not authorization, doctrine approval is not Sentinel implementation completion, and governance decision is not an Opening step
decisions_required:
  - GOV-DEC-GOVERNANCE-SENTINEL-AND-DELIVERY-OS-001: DECIDED (2026-03-23, Paresh)
blockers: []
---

## Unit Summary

`GOVERNANCE-SENTINEL-AND-DELIVERY-OS-001` records one bounded governance-only doctrine decision.

It decides TexQtic's Governance OS delivery-steering upgrade, candidate-normalization doctrine, the
permanent normalization-ledger rename, and the mandatory Governance Sentinel enforcement posture
without authorizing implementation tooling or product work.

## Acceptance Criteria

- [x] Core TECS non-negotiables are explicitly retained
- [x] Delivery-steering queue governance is explicitly decided
- [x] Exact queue classes and meanings are fixed
- [x] Exact candidate taxonomy and disposition taxonomy are fixed
- [x] Rich normalization-ledger schema requirements are fixed
- [x] Broad-label retirement and negative-evidence doctrine are fixed
- [x] Secret-safe discovery doctrine is fixed
- [x] `STEP2-PENDING-CANDIDATE-LEDGER.md` is explicitly superseded by a permanent canonical name
- [x] Governance Sentinel is approved as a binary enforcement gate
- [x] Sentinel v1 and v2 scopes are fixed without authorizing implementation

## Files Allowlisted (Modify)

- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/SNAPSHOT.md`
- `governance/analysis/STEP2-PENDING-CANDIDATE-LEDGER.md`
- `governance/analysis/CANDIDATE-NORMALIZATION-LEDGER.md`
- `governance/analysis/ADDITIONAL-REPO-TRUTH-CANDIDATES-001.md`
- `governance/units/CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-001.md`
- `governance/units/CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002.md`
- `governance/units/GOVERNANCE-SENTINEL-AND-DELIVERY-OS-001.md`
- `governance/decisions/GOV-DEC-GOVERNANCE-SENTINEL-AND-DELIVERY-OS-001.md`
- `governance/log/EXECUTION-LOG.md`

## Files Read-Only

- all application/product source files outside governance and repo-tooling surfaces
- all env files
- all backup files
- all log/output artifacts
- all generated artifacts
- all migration files
- all certification implementation code
- all API contracts unless directly needed as read-only context for governance naming
- all non-governance product docs unrelated to this Governance OS upgrade
- any secret-bearing or copied-secret surface

## Findings / Root Cause

### 1. Core TECS authority is not the problem

Current governance truth already correctly preserves:

- Layer 0 first-read authority
- strict phase sequencing
- safe-write / allowlist doctrine
- bounded-unit / no-drift discipline
- same-close mandatory sync plus audit closure doctrine

Those foundations remain correct and must not be weakened.

### 2. The remaining process weakness is delivery steering, not lifecycle shape

Current posture still falls back too easily to `OPERATOR_DECISION_REQUIRED` or phase-specific
pending phrasing even when exact normalized candidates, readiness states, and design-gated streams
already exist.

That creates a stall-oriented governance posture instead of a steering-oriented posture.

### 3. Phase-based candidate-ledger naming is now incorrect

`STEP2-PENDING-CANDIDATE-LEDGER.md` now owns a standing governance role that is larger than a
single phase. Its permanent role is normalization, negative-evidence recording, and broad-label
retirement, so a phase-bound name is no longer truthful.

### 4. Enforcement is still doctrine-only without a mandatory gate

Governance rules, normalization rules, and safe-write discipline exist, but there is no single
binary mechanism that can refuse progression when governance requirements are false.

## Decision

Approved bounded doctrine result:

- retain TECS core authority and lifecycle rules exactly
- replace hold-first / operator-stall posture with delivery-steering queue governance
- formalize candidate normalization around exact bounded taxonomy and negative evidence
- supersede the phase-based Step 2 ledger with a permanent canonical normalization ledger
- adopt Governance Sentinel as a mandatory binary enforcement gate

## Retained Non-Negotiable TECS Rules

- Layer 0 first-read authority remains mandatory
- `Decision -> Opening -> Implementation -> Verification -> Governance Sync -> Close` remains the
  canonical lifecycle
- governance and implementation remain separate
- exact allowlists / safe-write doctrine remain mandatory
- bounded-unit / no-drift doctrine remains mandatory
- close remains invalid unless mandatory sync plus post-close audit occur in the same close
  operation

## Exact Delivery-Steering Decision

Approved: hold-first / operator-decision stall posture is replaced by delivery-steering queue
governance.

Delivery steering means:

- governance carries exact queue class for candidate and non-terminal work
- queue class steers sequencing visibility
- queue class does not authorize by implication
- current authorized Layer 0 work remains authoritative until separately changed

## Exact Approved Queue Classes And Meanings

- `ACTIVE_DELIVERY` — the exact currently authorized OPEN implementation-ready unit
- `OPENING_QUEUE` — exact bounded candidate already validated for later Opening
- `DECISION_QUEUE` — exact bounded candidate still requiring a decision/disposition
- `DESIGN_GATE_QUEUE` — exact broad stream held behind an explicit prior gate decision
- `BLOCKED_QUEUE` — progression blocked by explicit unresolved blocker evidence
- `DEFERRED_QUEUE` — valid but intentionally unscheduled by governance/product posture

## Exact Approved Candidate Taxonomy / Status List

Approved candidate kinds:

- `runtime_route_failure`
- `state_rehydration_gap`
- `auth_or_shell_transition_gap`
- `resource_fallback_gap`
- `ui_affordance_gap`
- `identity_truth_gap`
- `applicability_gap`
- `persistence_or_logging_gap`
- `role_or_boundary_gap`
- `discovery_note_only`

Approved normalization dispositions:

- `ACTIVE_DELIVERY_CONFIRMED`
- `OPENING_CANDIDATE`
- `READY_FOR_OPENING`
- `DECISION_REQUIRED`
- `SPLIT_REQUIRED`
- `BLOCKED_PENDING_PRIOR_DECISION`
- `BLOCKED_PENDING_EVIDENCE`
- `DEFERRED`
- `ALREADY_GOVERNED_ELSEWHERE`
- `ALREADY_RESOLVED`
- `STALE_BROAD_LABEL`
- `SUPERSEDED_BY_NARROWER_CANDIDATE`
- `INSUFFICIENT_EVIDENCE`
- `INFORMATIONAL_ONLY`

## Exact Rich-Schema Requirements

Candidate normalization artifacts must capture:

- exact candidate name
- candidate kind
- original framing
- exact surface / boundary
- validation artifact
- positive evidence summary
- negative evidence summary
- prior governance exclusions
- disposition
- delivery class
- broad-label retirement state
- next lawful step
- confidence
- last validated marker

## Broad-Label Retirement Rule

Broad umbrella labels must be retired or superseded once exact narrower bounded truth exists. A
retired broad label must not remain an active sequencing label and must not be reused unless a new
validation later proves a genuinely broad unresolved family.

## Negative-Evidence Rule

Negative evidence is affirmative evidence that disproves over-broad framing, not silence.

## Capability-Present vs Defect-Evidenced Rule

Route presence, helper presence, control presence, TODO presence, or deferred-note presence alone
is not defect evidence.

## Prior Governance Exclusions Rule

Prior explicit governance exclusions remain valid negative evidence unless new exact contrary
evidence is produced.

## Secret-Safe Discovery Rule

Repo-truth sweeps must stay bounded to non-secret-bearing discovery surfaces and must record that
bounded scope explicitly.

## Rename / Supersession Decision

Approved canonical replacement artifact:

- `governance/analysis/CANDIDATE-NORMALIZATION-LEDGER.md`

Old artifact posture:

- `governance/analysis/STEP2-PENDING-CANDIDATE-LEDGER.md` is superseded
- retained temporarily for migration/reference only
- deprecated fully by a later governance sync / migration unit

## Exact Governance Sentinel Framework Decision

Approved: Governance Sentinel is a mandatory enforcement gate, not advisory review.

## Exact Sentinel Checkpoint Triggers

- before canonical candidate-normalization progression is recorded
- before any Opening changes candidate posture into open work
- before any governance sync claims reconciliation completeness
- before any Close step
- before any next-action change not already compelled by the existing open unit
- before any governance review that claims clean bounded compliance

## Exact AVM / Binary Gate Doctrine

Sentinel checks are binary only: `PASS` or `FAIL`. Failed mandatory checks refuse progression.

## Exact Failure / Stop-Work Protocol

If any mandatory Sentinel check is false:

- stop progression immediately
- refuse Opening / Sync / Close / next-action advancement
- mark governance review invalid for progression purposes
- run correction-order protocol before retry

## Exact Minimum Sentinel v1 Scope

- taxonomy/schema linter
- prompt linter
- mirror-check / negative-evidence review
- Layer 0 consistency checker
- ledger / execution-log sync checker
- allowlist / boundary checker
- binary pass/fail gate
- correction-order protocol for implementation-agent drift

## Exact Recommended Sentinel v2 Scope

- CI / hook integration
- structural size-budget enforcement for Layer 0 files
- stale-candidate aging and revalidation triggers
- deeper cross-file decision/reference integrity checks
- stronger close-operation audit completeness checks
- guided correction suggestions

## Risks / Boundary Cautions

- Sentinel v1 is doctrine-approved only; no implementation exists yet
- strict Sentinel enforcement will require a later bounded Opening and artifact/spec work before it
  can become executable repo policy
- Layer 0 currently preserves an already-open implementation unit, so delivery steering must not be
  misread as overriding that authorization
- broad-label retirement must stay disciplined or old umbrella labels will re-enter carry-forward
  summaries informally

## Next Lawful Governance Step

Recommended next governance step only:

- one later separate Opening for governance artifact updates plus Governance Sentinel v1
  specification

This recommendation is not an Opening and does not alter the current authorized `NEXT-ACTION`.

## Layer 0 Impact Statement

Layer 0 now reflects delivery class on active non-terminal work, but current authorization remains
unchanged:

- `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` remains the sole `ACTIVE_DELIVERY`
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE_QUEUE`
- no new implementation unit is opened
- no open implementation unit is closed

## Atomic Commit

`[GOVERNANCE-SENTINEL-AND-DELIVERY-OS-001] decide governance OS delivery upgrade and Sentinel enforcement framework`