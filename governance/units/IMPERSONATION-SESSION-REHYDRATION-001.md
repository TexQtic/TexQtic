---
unit_id: IMPERSONATION-SESSION-REHYDRATION-001
title: Impersonation session persistence across reload decision posture
type: GOVERNANCE
status: CLOSED
wave: W5
plane: CONTROL
opened: 2026-03-22
closed: 2026-03-22
verified: 2026-03-22
commit: null
evidence: "LAYER_0_CONFIRMATION: OPEN-SET contains no OPEN implementation unit, NEXT-ACTION is OPERATOR_DECISION_REQUIRED, and SNAPSHOT preserves the closed identity-truth result plus the separate impersonation reload-loss observation as candidate-only follow-on work · VERIFIED_DEFECT_CONFIRMATION: during active impersonation, reload returns the app to AUTH and does not restore the impersonation session · GOVERNANCE_DECISION: OPENING_CANDIDATE because this is a separate bounded impersonation session lifecycle defect limited to persistence across reload, restoration on mount, and preservation of the control-plane actor to impersonated tenant relationship after reload, while identity-truth, auth-shell transition, tenant-shell behavior, and stop-cleanup all remain separate"
doctrine_constraints:
  - D-004: this is one bounded governance-only decision unit; no implementation opening or product work may be mixed in
  - D-007: governance-only units must not touch application code, schema, tests, CI, runtime configuration, or non-allowlisted files
  - D-011: impersonation session lifecycle must remain separate from identity-truth, baseline auth-shell transition, tenant-shell correctness, and white-label claims unless separately proven
  - D-013: OPENING_CANDIDATE is not OPEN, recommendation is not authorization, and NEXT-ACTION must remain OPERATOR_DECISION_REQUIRED after this record
decisions_required: []
blockers: []
---

## Unit Summary

`IMPERSONATION-SESSION-REHYDRATION-001` is the sole bounded governance decision unit for the newly
observed defect where active impersonation does not persist across reload and the app returns to
`AUTH` instead of restoring the impersonation session.

Selected option: `OPENING_CANDIDATE`.

This unit records the defect family only. It does not open implementation, does not modify product
code, and does not merge this defect into `CONTROL-PLANE-IDENTITY-TRUTH-002` or
`CONTROL-PLANE-AUTH-SHELL-TRANSITION-002`.

## Layer 0 State Confirmation

Layer 0 on entry is:

- `OPEN-SET.md`: no implementation-ready unit is `OPEN`
- `NEXT-ACTION.md`: `OPERATOR_DECISION_REQUIRED`
- `SNAPSHOT.md`: `CONTROL-PLANE-IDENTITY-TRUTH-002` is `CLOSED` after deployed PASS and the
  impersonation reload-loss observation is preserved as separate candidate-only follow-on work

This confirms all required carry-forward truths:

- `CONTROL-PLANE-IDENTITY-TRUTH-002` is already `CLOSED` and must not be reopened
- `CONTROL-PLANE-AUTH-SHELL-TRANSITION-002` is already `CLOSED` and must not be reopened
- the new finding remains separate from tenant-shell logic and from impersonation stop cleanup
- no implementation-ready unit is currently `OPEN`

## Defect Statement

Verified runtime finding:

- during active impersonation, reload returns the app to `AUTH`
- the impersonation session is not restored on mount
- the actor-plus-tenant impersonation relationship is therefore lost across reload

Normalized interpretation:

- this is an impersonation session lifecycle defect
- this is not an identity-truth defect
- this is not the already-closed baseline auth-shell transition defect
- this is not evidence about tenant-shell correctness
- this is not evidence about impersonation stop cleanup

## Decision Question

Choose exactly one:

- `OPENING_CANDIDATE`
- `DEFER`
- `MERGE`

## Options Considered

### 1. `OPENING_CANDIDATE`

Selected.

The defect is now narrow enough for one later bounded implementation opening. The failure surface
is specific to impersonation session persistence across reload, restoration of impersonation state
on mount, and preservation of the control-plane actor to impersonated tenant relationship after
reload.

### 2. `DEFER`

Rejected.

The behavior is not a minor polish issue. Losing active impersonation state on reload breaks a
real exercised control-plane workflow and can invalidate truthful runtime continuity while the
operator is still inside the impersonation lifecycle.

### 3. `MERGE`

Rejected.

Merging would collapse distinct defect families incorrectly. `CONTROL-PLANE-IDENTITY-TRUTH-002` is
already closed and accepted on its own bounded actor-truth criteria, and
`CONTROL-PLANE-AUTH-SHELL-TRANSITION-002` is already closed on its own bounded baseline shell-entry
criteria. The remaining failure concerns impersonation session restoration after reload, which is a
different lifecycle boundary.

## Selected Option

`OPENING_CANDIDATE`

## Rationale

This defect belongs in its own bounded future opening because the exercised runtime failure now has
its own independent acceptance surface:

- baseline control-plane identity truth already passed and was closed separately
- baseline control-plane auth-shell transition already passed and was closed separately
- the remaining failure appears only during active impersonation after reload
- the app falls back to `AUTH` instead of restoring impersonation state
- the lost state includes both the impersonating control-plane actor context and the currently
  impersonated tenant context

That makes the truthful defect class: impersonation session lifecycle / rehydration failure.

This unit therefore confirms all required separations:

- not an identity-truth defect
- not an auth-shell transition defect
- not tenant-shell correctness
- not white-label behavior
- not impersonation stop cleanup
- not broader auth redesign

## Exact In-Scope Boundary

This unit covers only:

- impersonation session persistence across reload
- restoration of impersonation state on app mount
- preservation of the actor and tenant relationship after reload
- determination of whether this defect is a separate bounded opening candidate
- exact future opening boundary for this defect only

## Exact Out-of-Scope Boundary

This unit excludes all of the following:

- implementation work
- product code changes
- identity-truth repair already closed under `CONTROL-PLANE-IDENTITY-TRUTH-002`
- auth-shell transition repair already closed under `CONTROL-PLANE-AUTH-SHELL-TRANSITION-002`
- tenant-shell correctness
- white-label behavior
- impersonation stop cleanup
- broader auth redesign
- DB, schema, migration, Prisma, API, or contract redesign

## Future Opening Definition

If TexQtic later chooses to proceed, the exact future opening boundary must remain:

- one bounded implementation unit only
- objective: restore active impersonation session continuity across reload
- focus limited to mount-time impersonation restoration, reload persistence, and preservation of
  the control-plane actor to impersonated tenant relationship
- no merge with identity-truth, baseline auth-shell transition, tenant-shell correctness, or stop
  cleanup
- no broader auth or session architecture rewrite

## Future Verification Profile

Any later opening for this defect must require:

- runtime-sensitive verification
- effective deployed verification
- explicit proof that active impersonation survives reload on the target deployed build
- explicit proof that the restored state preserves both the control-plane actor and the currently
  impersonated tenant context
- explicit confirmation that stop-cleanup behavior remains separate from reload persistence

## Resulting NEXT-ACTION Posture

`OPERATOR_DECISION_REQUIRED`

This decision does not open implementation automatically.

The resulting Layer 0 posture is:

- no implementation-ready unit is `OPEN`
- `IMPERSONATION-SESSION-REHYDRATION-001` is now `CLOSED` as `OPENING_CANDIDATE` only
- `NEXT-ACTION` remains `OPERATOR_DECISION_REQUIRED` until a separate explicit opening is chosen

## Risks / Blockers

- a future opening must not use this defect to reopen or re-litigate identity-truth acceptance
- a future opening must not silently absorb baseline auth-shell transition logic that already
  passed in its own closed unit
- actor restoration and tenant restoration are adjacent here and should stay in one bounded slice
  only if the later opening preserves the exact reload/rehydration boundary

## Atomic Commit

`[IMPERSONATION-SESSION-REHYDRATION-001] record decision for impersonation session persistence defect`

**Read control-plane files before this unit file. This file refines unit-specific truth only.**