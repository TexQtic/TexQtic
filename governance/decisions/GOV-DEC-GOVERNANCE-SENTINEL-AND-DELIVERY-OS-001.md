# GOV-DEC-GOVERNANCE-SENTINEL-AND-DELIVERY-OS-001

Decision ID: GOV-DEC-GOVERNANCE-SENTINEL-AND-DELIVERY-OS-001
Title: Decide Governance OS delivery-steering upgrade and Sentinel enforcement framework
Status: DECIDED
Date: 2026-03-23
Authorized by: Paresh

## Decision Summary

TexQtic approves one bounded Governance OS upgrade that preserves core TECS authority and lifecycle
discipline while installing two doctrine changes only:

- delivery-steering queue governance replaces hold-first / operator-stall posture
- Governance Sentinel is adopted as a mandatory binary governance enforcement gate

This decision does not authorize Sentinel implementation tooling, CI wiring, hooks, scripts, or
product work.

## Retained Non-Negotiable Rules

The following remain non-negotiable and unchanged:

- Layer 0 first-read authority
- `Decision -> Opening -> Implementation -> Verification -> Governance Sync -> Close`
- governance-vs-implementation separation
- exact file allowlists / safe-write doctrine
- bounded-unit / no-drift doctrine
- close invalid unless mandatory sync plus post-close audit occur in the same close operation

## Delivery-Steering Decision

Approved: current hold-first / operator-decision stall posture is replaced at doctrine level by an
explicit delivery-steering queue model.

The delivery-steering model governs prioritization and sequencing only. It does not:

- open work by implication
- replace TECS lifecycle stages
- change unit status vocabulary
- overrule the currently authorized `NEXT-ACTION`

## Approved Queue Classes

- `ACTIVE_DELIVERY` — exact currently authorized OPEN implementation-ready work
- `OPENING_QUEUE` — exact bounded candidate already validated for later Opening
- `DECISION_QUEUE` — exact bounded candidate still awaiting decision/disposition
- `DESIGN_GATE_QUEUE` — exact broad stream held behind prior design/product/security gate
- `BLOCKED_QUEUE` — progression blocked until explicit blocker evidence is resolved
- `DEFERRED_QUEUE` — valid but intentionally unscheduled by governance/product posture

Every open candidate, opening candidate, and open implementation-ready unit must carry one delivery
class in its authoritative artifact.

## Layer 0 Reflection Rule

Layer 0 must reflect delivery-steering state as follows:

- `OPEN-SET.md` must show delivery class for every non-terminal unit listed there
- `NEXT-ACTION.md` must show delivery class for the currently authorized action
- `SNAPSHOT.md` must summarize current delivery-steering state

Where a candidate is not yet a Layer 0 item, delivery class must still be recorded in its
authoritative normalization or unit artifact.

## Candidate Normalization Decision

Approved: candidate normalization must use exact bounded taxonomy and exact disposition recording.

Broad umbrella carry-forward labels are no longer acceptable when exact bounded labels are
available.

## Canonical Disposition Rules

Canonical normalization outcomes are fixed in
`governance/analysis/CANDIDATE-NORMALIZATION-LEDGER.md` and remain distinct from Layer 0 status
vocabulary.

## Negative-Evidence And Broad-Label Rules

Approved:

- negative evidence is affirmative evidence, not silence
- capability-present is not defect-evidenced
- prior governance exclusions remain valid negative evidence unless new exact contrary evidence is
  produced
- broad labels must be retired or superseded once exact narrower truth is established

## Secret-Safe Discovery Decision

Approved: repo-truth sweeps must be bounded and secret-safe. Secret-bearing surfaces are excluded
from opportunistic discovery and must never be printed.

## Canonical Ledger Rename Decision

Approved canonical replacement:

- `governance/analysis/CANDIDATE-NORMALIZATION-LEDGER.md`

Old path posture:

- `governance/analysis/STEP2-PENDING-CANDIDATE-LEDGER.md` is `superseded`
- retained temporarily for transition/reference only
- deprecated fully by a later governance sync / migration unit

This rename is approved because the artifact now owns a standing role, not a temporary phase-only
Step 2 role.

## Governance Sentinel Decision

Approved: Governance Sentinel is adopted as an enforcement layer, not advisory review.

Governance review is invalid without a clean Sentinel gate result once Sentinel is the relevant
required checkpoint.

## Required Sentinel Operating Parts

- taxonomy/schema linter
- prompt linter
- mirror-check / negative-evidence review
- Layer 0 consistency checker
- ledger / execution-log sync checker
- allowlist / boundary checker
- AVM-style binary gate
- correction-order protocol for implementation-agent drift

## Mandatory Checkpoint Triggers

Sentinel must run before progression at these checkpoints:

- before recording a new candidate normalization result as canonical
- before any Opening decision changes a candidate into open work
- before any governance sync that claims implementation and verification are reconciled
- before any Close step
- before any Layer 0 next-action change not already compelled by an open unit
- before any governance review that claims clean bounded compliance

## AVM / Binary Gate Doctrine

Each required Sentinel check is binary only:

- `PASS`
- `FAIL`

No partial pass, advisory warning, or narrative override is sufficient for progression on a failed
mandatory gate.

## Failure / Stop-Work Protocol

If any mandatory Sentinel check is false:

- progression is refused
- no Opening, Sync, Close, or next-action advancement may be recorded
- governance review is invalid for progression purposes
- the correction-order protocol must run before Sentinel may be re-run

## Minimum Sentinel v1 Scope

Approved minimum v1 scope:

- controlled taxonomy/schema checks for normalization artifacts and prompt metadata
- delivery-class presence checks on candidate-bearing and open-work artifacts
- mirror-check / negative-evidence presence checks
- Layer 0 internal consistency checks
- ledger / execution-log linkage checks
- allowlist / boundary checks
- binary pass/fail gate output
- correction-order enforcement

## Recommended Sentinel v2 Expansion

Recommended later v2 scope only:

- CI / hook integration
- structural size-budget enforcement for Layer 0 files
- stale-candidate aging and revalidation triggers
- cross-file decision/unit/reference integrity checks
- auto-generated correction suggestions
- stronger close-operation audit completeness checks

## Next Governance Recommendation

Recommended next governance move: one later separate Opening-phase unit for governance artifact
updates plus Governance Sentinel v1 specification only.

That recommendation is not an Opening and does not override the current authorized implementation
unit already recorded in Layer 0.