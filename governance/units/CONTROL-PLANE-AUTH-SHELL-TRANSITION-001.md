---
unit_id: CONTROL-PLANE-AUTH-SHELL-TRANSITION-001
title: Control-plane auth-shell transition failure decision posture
type: GOVERNANCE
status: CLOSED
wave: W5
plane: CONTROL
opened: 2026-03-22
closed: 2026-03-22
verified: 2026-03-22
commit: null
evidence: "LAYER_0_CONFIRMATION: CONTROL-PLANE-IDENTITY-TRUTH-002 remains the sole non-terminal implementation unit and remains OPEN in VERIFICATION on entry · DEPLOYED_RUNTIME_FINDING_CONFIRMATION: browser-context admin login returned 200 with a token-bearing success payload for admin@texqtic.com, the issued admin token returned 200 from /api/control/tenants in the same live browser context, and stale tenant storage was a real confounder but not the root blocker · GOVERNANCE_DECISION: OPENING_CANDIDATE because a separate bounded implementation opening is now justified for control-plane auth-shell transition failure only, while CONTROL-PLANE-IDENTITY-TRUTH-002 stays OPEN in VERIFICATION and blocked by this separate runtime defect"
doctrine_constraints:
  - D-004: this is one bounded decision unit only; it must not absorb banner identity truth, tenant-shell identity truth, white-label behavior, stop-cleanup, or any broader auth program
  - D-007: governance-only units must not touch product code, schema, tests, CI, runtime configuration, or implementation files outside the allowlist
  - D-011: valid control-plane auth/token/API success must remain explicitly separate from shell-entry failure and must not be generalized into tenant or white-label claims without proof
  - D-013: OPENING_CANDIDATE is not OPEN, recommendation is not authorization, and this unit must not open implementation by implication
decisions_required: []
blockers: []
---

## Unit Summary

`CONTROL-PLANE-AUTH-SHELL-TRANSITION-001` is the sole bounded decision unit for the newly proven
deployed runtime defect where valid control-plane authentication succeeds at the API and token
layer but the SPA does not transition into the authenticated control-plane shell.

Selected option: `OPENING_CANDIDATE`.

This unit records the defect family only. It does not open implementation, does not modify product
code, and does not merge this defect into `CONTROL-PLANE-IDENTITY-TRUTH-002`.

## Layer 0 State Confirmation

Layer 0 on entry is:

- `OPEN-SET.md`: `CONTROL-PLANE-IDENTITY-TRUTH-002` remains the sole `OPEN` implementation unit
- `NEXT-ACTION.md`: `CONTROL-PLANE-IDENTITY-TRUTH-002` remains the single active unit posture
- `SNAPSHOT.md`: `CONTROL-PLANE-IDENTITY-TRUTH-002` remains open in verification-sensitive posture

This confirms all required carry-forward truths:

- `CONTROL-PLANE-IDENTITY-TRUTH-002` remains `OPEN` in `VERIFICATION`
- runtime acceptance for `CONTROL-PLANE-IDENTITY-TRUTH-002` is currently blocked by a separate deployed runtime defect
- the new finding must remain separate from banner identity truth
- no tenant-shell, white-label, or stop-cleanup scope is authorized here

## Defect Statement

New deployed finding:

- valid control-plane authentication succeeds at the API and token layer on the live deployment
- the issued control-plane token is accepted by live control-plane APIs
- despite that valid authenticated state, the deployed SPA remains on the login screen and does not transition into the authenticated control-plane shell

Normalized interpretation:

- this is a control-plane auth-shell transition defect
- this is not a credential-validity defect
- this is not a control-plane API protection defect
- this is not evidence against the banner repair in `CONTROL-PLANE-IDENTITY-TRUTH-002`

## Decision Question

Choose exactly one:

- `OPENING_CANDIDATE`
- `HOLD`
- `RECORD_ONLY`
- `SPLIT_REQUIRED`

## Options Considered

### 1. `OPENING_CANDIDATE`

Selected.

The live evidence is now strong enough to justify one later bounded implementation opening for the
control-plane auth-shell transition failure only. The defect can be stated truthfully without
merging it into banner identity truth, tenant-shell behavior, or broader auth redesign.

### 2. `HOLD`

Rejected.

Evidence is already sufficient. A real browser-context admin login succeeded, a live control-plane
token was issued, and the same token was accepted by `/api/control/tenants` with `200`. The defect
surface is now concrete rather than speculative.

### 3. `RECORD_ONLY`

Rejected.

The finding is stronger than a passive record because the narrow implementation boundary is already
apparent: post-login shell transition, session rehydration on mount, and login-success-to-shell
state propagation.

### 4. `SPLIT_REQUIRED`

Rejected.

Further splitting would be artificial at this stage. The newly proven failure modes still belong to
one bounded shell-transition slice and can be carried in one later implementation opening if that
opening preserves strict exclusions.

## Selected Option

`OPENING_CANDIDATE`

## Rationale

The current evidence proves a separate runtime defect that sits in front of
`CONTROL-PLANE-IDENTITY-TRUTH-002` verification:

- real control-plane credentials are valid on the deployed runtime
- browser-context admin login returned `200`
- an admin token was issued
- the token worked against `/api/control/tenants` with `200`
- stale tenant storage was a confounder, but clearing it did not restore shell transition
- the SPA still did not enter the authenticated control-plane shell

That means the proven failure lies in the runtime handoff between successful control-plane auth and
control-plane shell entry. This is a separate defect family from the banner identity-truth slice.

The likely bounded defect surface is now credible and specific:

- app boot begins in `AUTH`
- entry into `CONTROL_PLANE` is tied to runtime handler paths rather than an obvious mount-time
  rehydration path
- login-success propagation may be failing between the auth form and the app-shell transition

This is sufficient to justify one later bounded opening candidate without silently widening scope.

## Exact In-Scope Boundary

This unit covers only:

- control-plane post-login shell transition
- control-plane session rehydration on app mount
- login-success-to-shell-state propagation
- the separation between valid auth/token/API success and shell-entry failure
- exact future opening recommendation for this defect only

## Exact Out-of-Scope Boundary

This unit excludes all of the following:

- implementation work
- product code changes
- banner identity-truth repair
- tenant-shell identity truth
- white-label behavior
- impersonation stop cleanup
- broader auth redesign
- token model redesign beyond the bounded shell-transition defect
- DB, schema, migration, Prisma, API, or contract redesign
- any merge into `CONTROL-PLANE-IDENTITY-TRUTH-002`

## Future Opening Definition

If TexQtic later chooses to proceed, the exact future opening boundary must remain:

- one bounded implementation unit only
- objective: restore truthful control-plane shell entry after valid control-plane auth succeeds
- focus limited to post-login shell transition, session rehydration on mount, and
  login-success-to-shell-state propagation
- no banner identity-truth repair bundled in
- no tenant-shell or white-label generalization
- no broader auth redesign or token/session architecture rewrite

## Future Verification Profile

Any later opening for this defect must require:

- runtime-sensitive verification
- effective deployed verification
- explicit proof of valid control-plane login success
- explicit proof of shell entry success or failure after the same auth event
- explicit confirmation that banner identity truth remains a separate acceptance surface

## Resulting NEXT-ACTION Posture

`CONTROL-PLANE-IDENTITY-TRUTH-002` remains the sole `OPEN` unit and remains in `VERIFICATION`, but
its runtime acceptance path is blocked by this separate deployed runtime defect.

This decision does not open implementation automatically.

The resulting Layer 0 posture is:

- `CONTROL-PLANE-IDENTITY-TRUTH-002` remains `OPEN` in `VERIFICATION`
- `CONTROL-PLANE-AUTH-SHELL-TRANSITION-001` is now `CLOSED` as `OPENING_CANDIDATE` only
- the next lawful move for the separate transition defect, if separately chosen later, is one
  bounded opening step only

## Risks / Blockers

- `CONTROL-PLANE-IDENTITY-TRUTH-002` cannot complete runtime verification while the control-plane
  shell remains unreachable through the live UI path
- a future opening must not use this defect to smuggle in banner repair or broader auth redesign
- mount-time rehydration and login-success propagation are adjacent and should remain one slice only
  if the later opening preserves strict boundary discipline

## Mandatory Post-Close Audit

- whether this unit opened implementation: `NO`
- whether `CONTROL-PLANE-IDENTITY-TRUTH-002` remains open: `YES`
- whether the new defect was kept separate from banner identity truth: `YES`
- whether tenant-shell or white-label scope was introduced: `NO`
- whether broader auth redesign was introduced: `NO`
- exact next lawful move for this defect family: one later separate bounded opening may be
  considered for control-plane auth-shell transition failure only

## Atomic Commit

`[CONTROL-PLANE-AUTH-SHELL-TRANSITION-001] record decision posture for control-plane auth-shell transition defect`

**Read control-plane files before this unit file. This file refines unit-specific truth only.**