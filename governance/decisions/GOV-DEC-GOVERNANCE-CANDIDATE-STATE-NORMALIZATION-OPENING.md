# GOV-DEC-GOVERNANCE-CANDIDATE-STATE-NORMALIZATION-OPENING

Date: 2026-03-24
Type: Governance Decision + Opening
Status: Accepted
Unit: GOVERNANCE-CANDIDATE-STATE-NORMALIZATION-001
Domain: GOVERNANCE
Delivery Class: DECISION_QUEUE

## Decision

TexQtic authorizes one separate bounded governance normalization unit to reconcile stale or mixed
candidate-state records so future operator decisions and future openings are based on current
control-plane truth rather than consumed historical opening cycles or ambiguous carry-forward text.

The latest operator audit found that no currently named candidate is cleanly compelled by Layer 0
as the next lawful opening. The same audit found that some candidate records are stale, mixed, or
historically consumed and therefore unsafe to reuse casually as new openings.

This decision records that:

- this unit is governance normalization only
- this unit does not authorize implementation work
- this unit does not authorize a new `ACTIVE_DELIVERY` stream
- this unit does not reopen consumed historical units
- this unit does not authorize Sentinel doctrine expansion, automation rollout, CI integration,
  hooks, bots, or auto-triggering
- this unit must remain as narrow as possible
- current `OPERATOR_DECISION_REQUIRED` posture remains preserved unless Layer 0 truth already
  differs
- no candidate may be reopened by implication from stale `READY_FOR_OPENING`, mixed open/closed
  text, or consumed opening artifacts

## Opening

TexQtic opens exactly one bounded concurrent governance unit:

- `GOVERNANCE-CANDIDATE-STATE-NORMALIZATION-001`
- title: `Candidate state normalization`
- type: `GOVERNANCE`
- status: `OPEN`
- delivery class: `DECISION_QUEUE`

Reason:

- this is concurrent governance normalization only
- it is not `ACTIVE_DELIVERY`
- it must not displace `OPERATOR_DECISION_REQUIRED`
- it exists only to normalize stale candidate-state truth before any new next-unit selection is
  made

## Exact In-Scope Boundary

This opening authorizes only the following bounded work:

1. inspect candidate-related governance records for stale, mixed, or consumed state signals
2. reconcile conflicts between Layer 0 carry-forward text and candidate/unit history where current
   repo truth is already determinable
3. normalize candidate-state wording so closed historical openings are not casually reused as
   current-ready openings
4. preserve `OPERATOR_DECISION_REQUIRED` until a later explicit operator choice is made from
   normalized repo truth
5. produce a clean operator-facing picture of which candidates are:
   - `CLOSED` historical units
   - `OPEN` concurrent governance units
   - `READY_FOR_OPENING` only
   - `DESIGN_GATE` only
   - governance-eligible only

## Exact Out-of-Scope Boundary

This opening explicitly forbids:

- opening a new `ACTIVE_DELIVERY` unit in this step
- opening a new product/governance child by implication
- reopening `GOV-NAV-01`, `GOV-VERIFY-01`, `TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001`, or any other
  consumed closed unit
- any certification product/service/route/test/schema/migration change
- any DB/Prisma/SQL execution
- any Sentinel runner/spec/schema/template/package change
- any CI integration
- any git hook or watcher integration
- any auto-trigger rollout
- any broad governance redesign
- any opportunistic cleanup outside the exact candidate-state normalization scope

## Layer 0 Effect

- `OPEN-SET.md` must show `GOVERNANCE-CANDIDATE-STATE-NORMALIZATION-001` as `OPEN` with
  `DECISION_QUEUE`
- `NEXT-ACTION.md` must preserve `OPERATOR_DECISION_REQUIRED` as the current posture
- `SNAPSHOT.md` must reflect the newly opened concurrent normalization unit and preserve the same
  operator-decision posture

This opening does not authorize a successor `ACTIVE_DELIVERY` by implication. The purpose of this
bounded unit is to make later operator choice reliable and technically correct.