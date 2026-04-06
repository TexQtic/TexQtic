# GOV-DEC-B2C-SHELL-CLOSE-WITH-ADJACENT-FINDING

Decision ID: GOV-DEC-B2C-SHELL-CLOSE-WITH-ADJACENT-FINDING
Title: Close the bounded B2C shell authenticated-affordance separation unit while preserving the impersonation-stop cleanup 404 as a separate adjacent finding
Status: DECIDED
Date: 2026-04-06
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- `MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION` is already
  `VERIFIED_COMPLETE`
- live production rerun proved that the exact non-WL B2C `HOME` path is reachable again from both
  bounded control-plane entry surfaces
- the branded/search entry-facing frame remains intact on that exact path
- authenticated-only shell affordances are not visible on that exact path
- the earlier blocked tenant-context entry symptom no longer reproduces
- the earlier enterprise `Orders` neighbor-smoke issue did not reproduce on rerun
- `CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-001` remains separately
  `VERIFIED_COMPLETE` and close-ready as the support blocker-removal unit
- `GOV-DEC-IMPERSONATION-STOP-CLEANUP-404-ADJACENT-FINDING` now records the observed stop-path
  `404` as a separate adjacent finding and confirms it is non-blocking for the B2C unit

The current question is therefore not readiness or remediation. It is whether the B2C unit can now
be lawfully moved from `VERIFIED_COMPLETE` to `CLOSED`, how Layer 0 must be updated, and whether
the support unit should remain separately close-ready rather than being absorbed here.

## Required Determinations

### 1. Is it lawful to close `MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION` now?

Yes.

Reason:

- the unit already reached `VERIFIED_COMPLETE` on bounded live production proof
- its exact acceptance boundary has been satisfied on the exercised path
- the earlier blocked tenant-context entry failure no longer reproduces
- the adjacent impersonation-stop cleanup `404` is separately recorded and confirmed non-blocking
- no in-scope blocker remains open against this unit

### 2. Must the observed impersonation-stop cleanup `404` remain separate from this close?

Yes.

Reason:

- it occurs outside the exact B2C `HOME` path acceptance boundary
- it is now recorded separately as `IMPERSONATION-STOP-CLEANUP-404-001`
- absorbing it here would widen the B2C unit into impersonation-stop semantics and violate the
  bounded close

### 3. Should `CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-001` be closed in this same pass?

No.

Reason:

- current repo doctrine allows separate same-pass support-unit closure only when an explicit close
  decision covers both units together
- this pass is explicitly scoped to close the active B2C unit while preserving the support unit as
  separately complete and close-ready
- the support unit fulfilled its sole remit and is already `VERIFIED_COMPLETE`, but it should keep
  its own bounded close pass rather than being absorbed implicitly here

### 4. What is the minimum lawful Layer 0 sync?

The minimum truthful sync is:

- remove `MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION` from `OPEN-SET.md`
  because Layer 0 tracks non-terminal units only
- preserve `CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-001` as
  `VERIFIED_COMPLETE` and separately close-ready
- update `NEXT-ACTION.md` to point only to the support unit's separate close step
- update `SNAPSHOT.md` to record zero open product-facing `ACTIVE_DELIVERY`, preserve the support
  unit as the remaining `VERIFIED_COMPLETE` non-terminal unit, preserve the new adjacent finding as
  non-opening decision-only truth, and keep `g026` explicit as unrelated residue

## Decision Result

`B2C_UNIT_CLOSED_SUPPORT_UNIT_PENDING_SEPARATE_CLOSE`

TexQtic now closes `MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION` as complete.

This close does not:

- absorb `IMPERSONATION-STOP-CLEANUP-404-001`
- close `CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-001`
- authorize any successor opening
- widen into impersonation/system redesign, enterprise `Orders`, or `g026`
