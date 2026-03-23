# IMPERSONATION-STOP-PATH-REPO-TRUTH-VALIDATION-001

Date: 2026-03-23
Type: GOVERNANCE ANALYSIS
Status: RECORDED
Scope: Repo-truth and governance-truth validation only. No implementation authorized. No Layer 0 status transition.

## Original Pending-Candidate Framing

The carried-forward pending framing treated impersonation stop-path or cleanup as a separate
candidate from impersonation session rehydration.

That separation is real in governance history: multiple W5 records explicitly preserve
`IMPERSONATION-STOP-CLEANUP-001` as separate from identity-truth, auth-shell transition, tenant
runtime `500` behavior, and impersonation session rehydration.

The question for this analysis is narrower than preservation: whether current repo truth and current
governance history still evidence an unresolved distinct stop-path or cleanup defect as currently
named.

## Repo-Truth Evidence

### 1. A concrete server-side stop path exists

Current repo truth includes an explicit control-plane stop route and service:

- `server/src/routes/admin/impersonation.ts` defines `POST /api/control/impersonation/stop`
- `server/src/services/impersonation.service.ts` validates session existence, ownership, already-ended
  state, and already-expired state before setting `endedAt` and writing `IMPERSONATION_STOP`

This is direct repo evidence that the stop path is not absent.

### 2. Current frontend exit flow performs explicit local cleanup

`App.tsx` currently performs all of the following in `handleExitImpersonation`:

1. switches the client realm back to `CONTROL_PLANE`
2. attempts the server stop call when `impersonationId` exists
3. clears the persisted impersonation session regardless of stop-call outcome
4. clears in-memory impersonation state
5. returns the SPA to `CONTROL_PLANE`

This is direct repo evidence that a concrete exit or teardown path exists on the client.

### 3. Current mount-time behavior fail-closes invalid impersonation state

`App.tsx` also contains multiple fail-closed cleanup branches:

- invalid stored impersonation payload clears persisted impersonation state
- mismatched or expired admin identity clears persisted impersonation state
- invalid restored tenant context clears persisted impersonation state

In addition, `IMPERSONATION-SESSION-REHYDRATION-002` already records that invalid persisted
impersonation state now fails closed in the exercised path.

This is direct repo truth against any broad framing that impersonation cleanup is generically
missing.

### 4. Repo truth still exposes narrower stop-path ambiguities

Although the stop and cleanup path exists, two narrower behaviors remain visible in the repo:

1. `App.tsx` deliberately ignores stop-call failure and still clears local impersonation state:
   `[Impersonation] stop error (ignored, clearing state)`
2. `server/src/routes/admin/impersonation.ts` explicitly states that real-time revocation in
   tenant auth middleware is out of scope and that short token TTL is the primary revocation
   mechanism

Those are real repo truths, but they are narrower than the generic candidate name. They describe
potential stop-failure or revocation-semantics ambiguity, not direct proof that a current broad
stop-cleanup defect is happening.

### 5. Server-side failure modes exist, but no current defect occurrence is evidenced

The current stop service and route define explicit stop-path error modes:

- `SESSION_NOT_FOUND`
- `NOT_AUTHORIZED`
- `ALREADY_ENDED`
- `ALREADY_EXPIRED`

That proves the code anticipates stop-path edge cases. It does not, by itself, prove that a current
repo-truth defect is occurring on any one of those branches.

No current repo evidence found in this analysis proves an active observed failure such as:

- repeated stop-path `state not found` in a validated runtime path
- actor or tenant state remaining uncleared in the current code path
- cleanup reversal failing after exit in a currently evidenced scenario

## Governance-History Evidence

### 1. The candidate name is preserved as separate in governance history

Current governance history repeatedly preserves impersonation stop cleanup as separate from the
closed rehydration work:

- `governance/control/OPEN-SET.md`
- `governance/control/SNAPSHOT.md`
- `governance/units/IMPERSONATION-SESSION-REHYDRATION-001.md`
- `governance/units/IMPERSONATION-SESSION-REHYDRATION-002.md`
- `governance/units/AUTH-IDENTITY-TRUTH-DEPLOYED-001.md`

This is sufficient governance evidence that the candidate was intentionally kept outside the
rehydration slice.

### 2. No dedicated governed unit for `IMPERSONATION-STOP-CLEANUP-001` was found

This analysis found no standalone unit file, decision record, opening record, or closure record for
`IMPERSONATION-STOP-CLEANUP-001` itself.

Current governance truth therefore shows a preserved candidate name, but not a separately governed
and fully articulated stop-cleanup unit.

### 3. Governance language is definitional, not evidentiary

`governance/units/AUTH-IDENTITY-TRUTH-DEPLOYED-001.md` gives a useful definition:

- a stop-path cleanup defect concerns exit or teardown behavior
- it is causally separate from identity-truth during active runtime

That clarifies category boundaries. It does not provide direct validated evidence that the stop-path
candidate is still a currently proved live defect.

## Current Exact Status

Current exact repo and governance truth is:

1. impersonation stop path exists on the server
2. impersonation exit cleanup exists in the current SPA
3. stale or invalid persisted impersonation state is already fail-closed in current code and in the
   closed rehydration verification record
4. governance still preserves `IMPERSONATION-STOP-CLEANUP-001` as a separate candidate name
5. no dedicated governed unit was found for that candidate
6. no current repo or governance evidence found in this analysis proves a live broad stop-path or
   cleanup defect as currently named

The only residual repo-truth ambiguities are narrower and more specific:

- stop-call failure is intentionally ignored locally while local impersonation state is still
  cleared
- immediate server-backed token revocation is not implemented as part of the current stop flow

Those are not the same as direct evidence that a generic stop-cleanup defect remains open.

## Relationship To Closed Impersonation Rehydration Work

This candidate remains separate from the already closed impersonation session rehydration work.

That closed work was bounded to:

- persistence across reload
- restoration on mount
- preservation of the actor-target impersonation relationship after reload

This analysis confirms the stop-path surface is not the same slice.

It also confirms the closed rehydration work already delivered one cleanup-related truth that must
not be re-litigated here: invalid persisted impersonation state now fails closed.

So the required separation from rehydration remains correct, but separation alone is not enough to
prove that the generic stop-cleanup candidate is still currently evidenced.

## Exact Classification

`insufficient evidence`

Reason:

- governance preserves the candidate name as separate, but no dedicated governed unit was found
- current repo truth shows implemented stop and cleanup behavior rather than an absent stop path
- current repo truth shows explicit fail-closed stale-state cleanup rather than a proved generic
  cleanup omission
- the remaining visible concerns are narrower unverified ambiguities around stop-call failure
  handling and revocation semantics, not direct proof of the broad candidate as currently named

## Risks / Ambiguities

1. `App.tsx` clears local impersonation state even when the server stop call fails, which can hide
   whether the server-side stop action actually completed
2. current route documentation explicitly leaves real-time revocation out of scope, so stop does not
   prove immediate tenant-token invalidation semantics
3. current code defines `SESSION_NOT_FOUND`, `ALREADY_ENDED`, and `ALREADY_EXPIRED` branches, but no
   current runtime or governance evidence in this analysis proves one of those branches is the live
   defect candidate under discussion
4. because the preserved candidate has no dedicated unit file, its current intended defect boundary
   is under-specified in governance history

## Recommended Future Handling

Do not treat the current generic candidate name as implementation-ready on present repo truth.

If future direct evidence is collected, the next truthful handling should be one of the following:

1. open a new bounded decision record with direct runtime or repo evidence for the exact stop-path
   behavior that is failing
2. rename the candidate away from generic `stop cleanup` language and toward the exact proved
   surface, such as stop-failure client/server divergence or immediate revocation semantics
3. split only if future evidence proves two distinct bounded defects instead of one

On current evidence alone, the lawful handling is to record that the preserved candidate remains
under-evidenced rather than to reopen or authorize follow-on work.

## Confidence Level

Confidence: HIGH

Basis for confidence:

1. direct repo inspection of the current frontend exit flow and server stop path
2. direct repo inspection of current stale-state fail-closed logic
3. direct governance-history inspection of the rehydration units, identity-truth decision, Layer 0
   control files, and execution log
4. direct confirmation that no standalone governance record for
   `IMPERSONATION-STOP-CLEANUP-001` currently exists

## Final Validation Statement

Current governance truth still preserves impersonation stop cleanup as a separate candidate name,
and that separation from the already closed impersonation session rehydration work remains correct.

Current repo truth, however, does not evidence a still-valid broad impersonation stop-path or
cleanup defect as currently named. The stop path exists, local cleanup exists, and stale persisted
state already fail-closes.

The exact current classification is therefore `insufficient evidence`.