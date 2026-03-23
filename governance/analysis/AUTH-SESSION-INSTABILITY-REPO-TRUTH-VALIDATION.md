# AUTH-SESSION-INSTABILITY-REPO-TRUTH-VALIDATION-001

Date: 2026-03-23
Type: GOVERNANCE ANALYSIS
Status: RECORDED
Scope: Repo-truth and governance-truth validation only. No implementation authorized. No Layer 0 status transition.

## Original Pending-Candidate Framing

The pending framing treated `auth/session instability` as if it could still be one current broad
defect candidate spanning auth persistence, token restoration, shell entry, session rehydration,
and related continuity failures.

This analysis validates whether that broad name still maps to one real current sequencing candidate
in repo and governance truth, whether the evidence actually resolves into narrower already-governed
issue families, or whether the broad candidate is now stale or insufficiently evidenced.

## Repo-Truth Evidence

### 1. Current code contains explicit stale-token and loop-prevention safeguards

Current auth code contains direct comments and logic aimed at preventing session-instability failure
loops rather than exhibiting them as unresolved current behavior.

In `services/authService.ts`, tenant or control-plane login clears stale auth before posting
credentials. The file explicitly records the historical failure mode it prevents: stale bearer
tokens attached to login produced `401` responses and a visible `spinner -> back to login` loop.

In `services/apiClient.ts`, auth routes intentionally skip bearer attachment and the generic
non-auth `401` path intentionally does not hard-redirect or clear auth automatically. The file
explicitly records the historical failure class it avoids: `login succeeds -> catalog 401 ->
clearAuth -> reload -> back to login`.

This is direct repo evidence that at least part of the historical `auth/session instability`
surface has already been recognized and hardened in current code.

### 2. Current control-plane mount-time rehydration is fail-closed and no longer looks like an unresolved generic instability

`App.tsx` now validates stored control-plane auth state on mount before entering the control-plane
shell:

1. read stored admin JWT claims
2. read stored control-plane identity
3. reject expired, missing, or mismatched identity state
4. clear auth and persisted impersonation on invalid state
5. re-enter `CONTROL_PLANE` only when stored claims and stored identity align

That is current repo truth for explicit control-plane session restoration with fail-closed invalid
state handling, not a generic unresolved unstable session path.

### 3. Current impersonation reload persistence is implemented separately and fail-closed

`App.tsx` also now contains an impersonation rehydration path that:

1. reads stored impersonation state
2. validates alignment between admin claims, stored control-plane identity, and stored
   impersonation admin identity
3. restores impersonation token override and tenant context only when the state is coherent
4. clears persisted impersonation state if restoration fails or tenant validation fails

This means the previously observed reload-loss behavior for active impersonation is no longer just a
live broad `auth/session instability` symptom in current repo truth. It has its own implemented,
bounded restoration path.

### 4. Tenant login continuity is also explicitly hydrated in current code

In `App.tsx`, tenant login success now calls `/api/me` before transitioning in order to avoid the
historical `Loading workspace...` hang caused by empty tenant context. If `/api/me` fails, the code
still seeds a bounded fallback tenant stub so the UI does not collapse back into an auth/session
loop.

This is direct repo evidence that tenant-side session continuity has also been specifically handled
rather than left as one vague unresolved instability family.

### 5. Current repo truth does not expose one single remaining auth/session-instability branch as named

Across the inspected current frontend auth/session code, the remaining logic is organized around
separate bounded surfaces:

- control-plane auth-shell entry and mount-time rehydration
- impersonation session restoration
- tenant login hydration and continuity
- stale-token and wrong-realm protection

The current repo does not expose one named broad `auth/session instability` branch or TODO that
still truthfully collapses all of those surfaces into one active unresolved candidate.

## Governance-History Evidence

### 1. Governance history already split the broad family into narrower units

Current governance history shows that the broad auth/session-adjacent surface was already separated
into narrower, explicitly bounded units rather than preserved as one lawful broad implementation
candidate.

The key already-governed units are:

- `CONTROL-PLANE-AUTH-SHELL-TRANSITION-001`
- `CONTROL-PLANE-AUTH-SHELL-TRANSITION-002`
- `IMPERSONATION-SESSION-REHYDRATION-001`
- `IMPERSONATION-SESSION-REHYDRATION-002`
- `AUTH-IDENTITY-TRUTH-DEPLOYED-001`

### 2. The control-plane auth-shell transition defect was separately named, opened, and closed

`CONTROL-PLANE-AUTH-SHELL-TRANSITION-001` explicitly recorded the narrower defect where valid
control-plane authentication succeeded at the token and API layer while the SPA failed to enter the
authenticated control-plane shell.

`CONTROL-PLANE-AUTH-SHELL-TRANSITION-002` then closed that bounded slice with explicit proof that:

- control-plane login enters the authenticated shell
- reload rehydrates the shell from valid stored auth
- invalid stored auth is rejected
- unauthenticated control-plane API access remains `401`
- tenant-vs-control-plane separation remains intact

This is direct governance evidence that one major concrete `auth/session instability` slice was
already separately governed and closed.

### 3. The impersonation reload-loss defect was separately named, opened, and closed

`IMPERSONATION-SESSION-REHYDRATION-001` explicitly separated active impersonation reload-loss from
baseline auth-shell transition, identity truth, tenant-shell behavior, and stop cleanup.

`IMPERSONATION-SESSION-REHYDRATION-002` then closed that bounded slice with deployed PASS that:

- active impersonation survives reload/remount
- the control-plane actor is preserved after reload
- the impersonated tenant target is preserved after reload
- the actor-target relationship is preserved after reload
- invalid persisted impersonation state fails closed

This is direct governance evidence that another major session-continuity slice was already
separately governed and closed.

### 4. `AUTH-IDENTITY-TRUTH-DEPLOYED-001` is adjacent but not a remaining session-instability authority

`AUTH-IDENTITY-TRUTH-DEPLOYED-001` closed as `SPLIT_REQUIRED`, but its remaining mixed finding is
explicitly about displayed identity truth across shell contexts and persona-labeling clarity.

That unit expressly forbids collapsing those observations into one broad auth claim and expressly
keeps stop-cleanup separate.

So while it is auth-adjacent, it is not current authority for preserving one active broad
`auth/session instability` candidate.

### 5. Layer 0 does not currently preserve a broad active auth/session-instability candidate

Current Layer 0 carry-forward truth does not keep `auth/session instability` as an open or active
future sequencing candidate.

Instead, Layer 0 preserves the already closed and separated truths:

- control-plane auth-shell transition slice: closed
- impersonation session rehydration slice: closed
- identity-truth family: split-required decision already recorded and kept separate

## Current Exact Status

Current repo and governance truth is:

1. the broad `auth/session instability` label does not map cleanly to one current active defect
   candidate
2. the meaningful concrete session-state failures that were previously evidenced have already been
   split into narrower issue families
3. the control-plane auth-shell transition slice is already governed and already closed
4. the impersonation session reload/rehydration slice is already governed and already closed
5. current code now contains explicit safeguards against stale-token loops, invalid stored-auth
   restoration, invalid persisted impersonation state, and tenant login hydration collapse
6. no current Layer 0 or governance-analysis record preserves one still-active broad
   `auth/session instability` sequencing candidate as named

## Relationship To Already Closed Auth / Identity / Impersonation Units

This finding must remain separate from all of the following:

1. `CONTROL-PLANE-AUTH-SHELL-TRANSITION-001` and `002`
2. `IMPERSONATION-SESSION-REHYDRATION-001` and `002`
3. `AUTH-IDENTITY-TRUTH-DEPLOYED-001`
4. impersonation stop-path / cleanup
5. tenant eligibility / member-resolution
6. trade creation placement
7. broader tenant runtime `500` behavior
8. image/media/CDN behavior

Current governance truth already gave the session-adjacent live defects their own bounded names.
This analysis does not reopen or merge any of them.

## Exact Classification

`already resolved / stale`

Reason:

- the broad candidate name historically over-compressed multiple narrower issue families
- the concrete session/auth-state defects that were actually evidenced were already split into
  narrower units
- those narrower session slices are now already governed and already closed
- current code contains explicit hardening and fail-closed behavior for the known session-state
  problem classes inspected here
- current Layer 0 and governance history do not preserve one remaining active broad
  `auth/session instability` candidate as named

## Risks / Ambiguities

1. this analysis is repo-inspection and governance-history inspection only; it does not provide new
   runtime proof for every shell or session path
2. `AUTH-IDENTITY-TRUTH-DEPLOYED-001` remains a separate mixed identity-truth decision family, so
   future identity or persona-display findings must not be misread as revived session instability
3. tenant login continuity still includes a fallback tenant-stub path when `/api/me` fails, which
   preserves continuity but does not itself prove all tenant provisioning or downstream data-state
   behavior is perfect
4. if future deployed evidence shows a new session failure, it should be named by the exact bounded
   surface rather than by reusing the broad `auth/session instability` label

## Recommended Future Handling

Do not keep `auth/session instability` as an active future sequencing candidate in its current broad
form.

If future evidence emerges, handle it only by naming the exact bounded surface, for example:

1. control-plane shell entry or mount-time rehydration
2. impersonation session restoration across reload
3. tenant continuity or provisioning hydration on login
4. wrong-realm or stale-token loop behavior

Do not reopen the broad name unless new evidence proves one truthful unresolved cross-slice failure
family that is not already captured by the closed units above.

## Confidence Level

Confidence: HIGH

Basis for confidence:

1. direct repo inspection of current auth/session code in `App.tsx`, `services/authService.ts`, and
   `services/apiClient.ts`
2. direct governance-history inspection of the already closed auth-shell transition,
   impersonation-session rehydration, and identity-truth units
3. direct Layer 0 inspection showing no active broad `auth/session instability` candidate remains
4. direct evidence that current code now contains explicit fail-closed and anti-loop protections for
   the historically relevant session-state surfaces

## Final Validation Statement

The broad `auth/session instability` candidate does not remain a truthful active sequencing
candidate in current repo or governance truth.

Current repo truth shows explicit stale-token protections, explicit control-plane mount-time
rehydration safeguards, explicit impersonation-session restoration logic, and explicit tenant-login
hydration safeguards. Current governance truth shows that the concrete live session failures were
already split into narrower bounded units for control-plane auth-shell transition and impersonation
session rehydration, and those session slices are already closed.

The exact current classification is therefore `already resolved / stale`. The broad candidate should
not remain active as named.