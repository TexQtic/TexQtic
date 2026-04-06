# GOV-DEC-IMPERSONATION-STOP-CLEANUP-404-ADJACENT-FINDING

Decision ID: GOV-DEC-IMPERSONATION-STOP-CLEANUP-404-ADJACENT-FINDING
Title: Record impersonation-stop cleanup 404 as a separate adjacent finding and confirm it is non-blocking for the closed B2C shell unit
Status: DECIDED
Date: 2026-04-06
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- `MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION` is already `VERIFIED_COMPLETE`
  on live production proof for the exact non-WL B2C `HOME` path
- `CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-001` is also already
  `VERIFIED_COMPLETE` as the separate blocker-removal support unit
- the earlier blocked tenant-context entry symptom chain no longer reproduces
- the earlier enterprise `Orders` neighbor-smoke issue did not reproduce on rerun
- the live rerun also observed a separate exit-path console event during impersonation stop:
  - `Failed to load resource: the server responded with a status of 404 ()`
  - `[Impersonation] stop error (ignored, clearing state): APIError: Impersonation session 1d7e79ee-658a-4500-aebf-3aaaab35d10c not found`

Current repo truth also already preserves narrower impersonation stop-path ambiguity as a separate
historical class in `governance/analysis/IMPERSONATION-STOP-PATH-REPO-TRUTH-VALIDATION.md`, where
the current code is documented as deliberately ignoring stop-call failure and clearing local state.

The current question is therefore not remediation. It is whether this newly observed live 404 can
now be recorded as a separate adjacent finding, how narrowly it should be classified, and whether
it blocks lawful closure of the already-verified B2C shell unit.

## Required Determinations

### 1. Can `IMPERSONATION-STOP-CLEANUP-404-001` be recorded as a separate adjacent finding now?

Yes.

Reason:

- the 404 occurred on impersonation exit cleanup, not on entry into the exact governed B2C `HOME`
  path
- the exact B2C proof path had already been reached and verified successfully before the stop-path
  error was observed
- repo truth already preserves impersonation stop-path ambiguity as separate from session
  rehydration, realm-boundary shell-affordance work, and the B2C shell unit
- the newly observed 404 is narrow enough to be preserved as one separate adjacent finding without
  reopening or widening the active B2C unit

### 2. Why is this finding separate from `MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION`?

It is separate because:

- the active B2C unit is bounded only to authenticated-only shell-affordance separation on the
  exact non-WL B2C `HOME` path
- the acceptance criteria for that unit concern truthful reachability of that exact path, the
  preserved branded/search entry-facing frame, and the absence of authenticated-only shell
  affordances on that path
- the observed 404 occurred later on impersonation-stop cleanup after those bounded acceptance
  conditions had already been satisfied
- stop cleanup semantics are not part of the exact B2C `HOME` path acceptance boundary and must
  not be absorbed into the closed B2C unit by implication

### 3. Is the observed 404 non-blocking for closure of the B2C unit?

Yes.

Reason:

- the exact governed B2C `HOME` path was successfully reached in live production from both bounded
  entry surfaces before the stop-path error occurred
- the branded/search entry-facing frame remained intact on that exact path
- authenticated-only shell affordances were not visible on that exact path
- the earlier blocked tenant-context entry symptom no longer reproduced
- exit still returned the runtime to control-plane state successfully even though the stop call
  logged a `404`
- there is no evidence in the exercised rerun that this stop-path error invalidated or reversed the
  verified B2C shell outcome

### 4. What is the likely minimum future file surface if TexQtic later sequences this finding?

Likely minimum future file surface:

- `App.tsx`
- `services/controlPlaneService.ts`
- `server/src/routes/admin/impersonation.ts`
- `server/src/services/impersonation.service.ts`

This is a likely minimum only. No implementation is authorized by this decision.

### 5. What is the readiness classification?

`decision-gated`

Reason:

- current repo truth proves a narrower live stop-path occurrence exists, but this pass does not yet
  authorize whether the eventual remedy should be client-side idempotent cleanup hardening,
  server-side stop-path semantics hardening, or both
- the correct remediation boundary must be fixed in a later separate bounded governance step before
  any implementation opening is lawful

## Decision Result

`IMPERSONATION_STOP_CLEANUP_404_ADJACENT_FINDING_RECORDED`

TexQtic now records `IMPERSONATION-STOP-CLEANUP-404-001` as a separate adjacent finding only.

This decision records that:

- the finding is separate from the B2C shell unit
- the finding is non-blocking for closure of the B2C shell unit
- the finding is `decision-gated`, not open, and not implementation-authorized
- no implicit successor opening is created by this record
- `g026-platform-subdomain-routing.spec.ts` remains unrelated and out of scope
