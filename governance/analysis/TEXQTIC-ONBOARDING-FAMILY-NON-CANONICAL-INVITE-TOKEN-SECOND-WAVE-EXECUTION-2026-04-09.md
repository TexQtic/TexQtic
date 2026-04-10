# TEXQTIC — ONBOARDING-FAMILY NON-CANONICAL INVITE-TOKEN SECOND-WAVE EXECUTION — 2026-04-09

## 1. Purpose

This execution record captures one bounded deferred-remainder execution unit for the selected
onboarding-family non-canonical invite-token second wave only.

Its purpose is to inspect only the downstream post-activation client rehydration continuity seam
selected by the completed second-wave decision, determine what repo truth currently shows about
post-activation JWT persistence and current-user or tenant rehydration after invite-token
activation, classify that downstream continuity posture, state how that result refines the current
overall `partial` posture of the invite-token remainder, and record whether a later third wave is
needed.

This pass is execution-analysis-only.

It does not reopen the remediation chain, reopen the consumer-regeneration chain, reopen the
supported canonical-path closure decision, reopen the first-wave invite-token execution result,
reopen the second-wave decision artifact, reopen reused-existing-user work, widen into token
provenance or issuance execution, widen into canonical provisioning or control-plane work, begin
implementation planning, change code, change schema, change runtime behavior, change product
behavior, or begin broader redesign or cleanup.

## 2. Scope boundary

This pass was limited to:

- the live opening-layer authority documents needed to anchor lawful second-wave execution
- the onboarding-family remediation closeout snapshot
- the onboarding-family post-closeout entry guard
- the onboarding-family deferred-remainder branch decision
- the onboarding-family consumer-regeneration closeout snapshot
- the onboarding-family post-consumer-closeout branch-sequencing decision
- the onboarding-family non-canonical invite-token branch decision-to-open
- the onboarding-family non-canonical invite-token branch execution artifact
- the onboarding-family non-canonical invite-token second-wave decision artifact
- the bounded onboarding-family consolidation note
- the already-identified activation-to-rehydration repo-evidence excerpt
- the immediate upstream invite activation references in `components/Onboarding/OnboardingFlow.tsx`,
  `services/tenantService.ts`, and `server/src/routes/tenant.ts`
- the exact downstream client rehydration seam in `App.tsx`, `services/apiClient.ts`,
  `services/authService.ts`, and the immediate `/api/me` tenant-session surface in
  `server/src/routes/tenant.ts`
- `docs/product-truth/TEXQTIC-ONBOARDING-SYSTEM-DESIGN-v1.md` as a context-only guardrail
- one bounded governance execution artifact

This pass did **not** inspect token provenance or issuance ownership as a primary target, inspect
reused-existing-user edge cases as a primary target, inspect canonical provisioning or
control-plane issuance or approval paths as primary targets, reopen white-label completeness,
reopen billing or subscription continuation, reopen broader auth or provisioning redesign, reopen
consumer-regeneration files as execution targets, rewrite onboarding design authorities, perform
debt cleanup, begin architecture evolution, begin implementation planning, change code, change
schema, change runtime behavior, change product behavior, perform broad historical cleanup, or
perform broad consumer-guidance cleanup.

## 3. Settled truths preserved

The following settled truths were preserved without reopening them:

1. the opening-layer canon remains live
2. onboarding-family remediation closeout snapshot is complete
3. onboarding-family post-closeout entry guard is complete
4. onboarding-family deferred-remainder branch decision is complete
5. onboarding-family consumer-regeneration closeout snapshot is complete
6. onboarding-family post-consumer-closeout branch-sequencing decision is complete
7. onboarding-family non-canonical invite-token branch decision-to-open is complete
8. onboarding-family non-canonical invite-token branch execution is complete
9. onboarding-family non-canonical invite-token second-wave decision is complete
10. the old `-v2` chain remains historical evidence and reconciliation input only
11. `White Label Co` remains the sole `REVIEW-UNKNOWN` hold and was not touched
12. onboarding-family closure remains bounded to the supported canonical path
13. invite fallback is no longer required for canonical first-owner usability on the supported path
14. explicit deferred remainder remains outside current onboarding-family closure truth except for
    the invite-token bucket under bounded inspection
15. completed remediation and consumer-regeneration passes must not be reopened unless a specific
    repo-truth regression is proven
16. first-wave invite-token execution truthfully concluded `partial`
17. reused-existing-user edge cases remain separate from this second-wave work unless explicitly
    and separately authorized

## 4. Inputs inspected

The following inputs were inspected in this pass:

1. `governance/control/TEXQTIC-OPENING-LAYER-GOVERNANCE-AUTHORITY-AND-POINTER-LAYER-2026-04-09.md`
2. `governance/control/TEXQTIC-OPENING-LAYER-SEQUENCING-AND-NEXT-CYCLE-ENTRY-2026-04-09.md`
3. `governance/analysis/TEXQTIC-ONBOARDING-FAMILY-REMEDIATION-CLOSEOUT-SNAPSHOT-2026-04-09.md`
4. `governance/analysis/TEXQTIC-ONBOARDING-FAMILY-POST-CLOSEOUT-ENTRY-GUARD-2026-04-09.md`
5. `governance/analysis/TEXQTIC-ONBOARDING-FAMILY-DEFERRED-REMAINDER-BRANCH-DECISION-2026-04-09.md`
6. `governance/analysis/TEXQTIC-ONBOARDING-FAMILY-CONSUMER-REGENERATION-CLOSEOUT-SNAPSHOT-2026-04-09.md`
7. `governance/analysis/TEXQTIC-ONBOARDING-FAMILY-POST-CONSUMER-CLOSEOUT-BRANCH-SEQUENCING-DECISION-2026-04-09.md`
8. `governance/analysis/TEXQTIC-ONBOARDING-FAMILY-NON-CANONICAL-INVITE-TOKEN-BRANCH-DECISION-TO-OPEN-2026-04-09.md`
9. `governance/analysis/TEXQTIC-ONBOARDING-FAMILY-NON-CANONICAL-INVITE-TOKEN-BRANCH-EXECUTION-2026-04-09.md`
10. `governance/analysis/TEXQTIC-ONBOARDING-FAMILY-NON-CANONICAL-INVITE-TOKEN-SECOND-WAVE-DECISION-2026-04-09.md`
11. `governance/analysis/TEXQTIC-PLATFORM-REPO-TRUTH-EVIDENCE-RECORD-v1.md`, limited to the
    already-identified activation-to-rehydration excerpt
12. `docs/product-truth/ONBOARDING-PROVISIONING-ACTIVATION-FAMILY-CONSOLIDATION-v1.md`
13. `docs/product-truth/TEXQTIC-ONBOARDING-SYSTEM-DESIGN-v1.md`
14. `components/Onboarding/OnboardingFlow.tsx`
15. `services/tenantService.ts`
16. `services/apiClient.ts`
17. `services/authService.ts`
18. `App.tsx`
19. `server/src/routes/tenant.ts`

## 5. Rehydration seam inspected

The exact downstream continuity seam inspected in this pass is:

1. `components/Onboarding/OnboardingFlow.tsx` carries the invite token into activation form state
   and submits the activation payload through the parent completion callback.
2. `services/tenantService.ts` exposes `activateTenant()` as the dedicated client seam into
   `POST /api/tenant/activate`.
3. `server/src/routes/tenant.ts` shows the already-proven upstream activation seam returning a
   tenant JWT together with tenant session identity.
4. `App.tsx` uses the invite-token onboarding completion path to:
   - call `activateTenant(...)`
   - store the returned JWT through `setToken(raw.token, 'TENANT')`
   - immediately call `getCurrentUser()`
   - build canonical tenant state through `buildTenantSnapshot(me.tenant)`
   - derive runtime state through `applyTenantBootstrapState(...)`
   - advance only when a valid tenant runtime state is resolved
5. `services/apiClient.ts` shows that `setToken(token, 'TENANT')` persists the JWT in the
   canonical tenant token slot (`texqtic_tenant_token`) and sets the stored auth realm to
   `TENANT`.
6. `services/authService.ts` shows that `getCurrentUser()` uses the stored token to call
   `GET /api/me`.
7. `server/src/routes/tenant.ts` shows that `GET /api/me` requires tenant-authenticated JWT
   context and returns `user`, `tenant`, and `role`, where `tenant` includes the fields later
   required by the app-side canonical tenant snapshot.
8. `App.tsx` also contains the stored-token restore path for tenant continuity, which again calls
   `getCurrentUser()`, revalidates canonical tenant identity through `buildTenantSnapshot(...)`,
   applies runtime state through `applyTenantBootstrapState(...)`, and fails closed by clearing
   auth and returning to `AUTH` if the tenant snapshot or runtime descriptor is invalid.

## 6. Repo-truth findings

The repo-truth findings from the inspected rehydration seam are:

1. the exact client seam that stores the activation JWT after invite-token activation is the
   onboarding completion callback in `App.tsx`, which calls `setToken(raw.token, 'TENANT')`
   immediately after `activateTenant(...)` returns.
2. the exact storage primitive is `services/apiClient.ts`, where `setToken(token, 'TENANT')`
   writes the token to `localStorage` under the canonical tenant key `texqtic_tenant_token` and
   records the active auth realm as `TENANT`.
3. the exact seam that rehydrates current-user and tenant state after that storage step is the same
   `App.tsx` callback, which immediately calls `getCurrentUser()` and then requires a non-null
   canonical tenant snapshot plus a valid tenant runtime descriptor before advancing state.
4. the immediate downstream rehydration call is not documentation-only intent. `services/authService.ts`
   shows `getCurrentUser()` calling `GET /api/me`, and `server/src/routes/tenant.ts` shows that
   endpoint requiring a tenant JWT and returning `user`, `tenant`, and `role` for the authenticated
   tenant session.
5. the rehydration seam is guarded against incomplete identity. `buildTenantSnapshot(...)` in
   `App.tsx` returns `null` unless `tenant.id`, `tenant.slug`, `tenant.name`, `tenant.status`,
   `tenant.plan`, `tenant.tenant_category`, and `tenant.is_white_label` are all present, so the
   path does not silently continue on partial tenant identity.
6. the rehydration seam is also guarded against invalid runtime mapping. `applyTenantBootstrapState(...)`
   derives a runtime descriptor from canonical tenant identity and authenticated role, then only
   returns a usable next state when that descriptor resolves to `EXPERIENCE` or `WL_ADMIN`.
7. the invite-token completion path therefore does more than store a JWT. It stores the token,
   rehydrates authenticated user and tenant identity through `/api/me`, validates canonical tenant
   identity, resolves a tenant runtime handoff, and only then advances the app.
8. the stored token is not only used for the immediate same-session handoff. The separate tenant
   restore path in `App.tsx` reuses the same `getCurrentUser()` plus canonical snapshot plus
   runtime-descriptor checks and fails closed by clearing auth if rehydration cannot be confirmed.
9. no inspected repo evidence in this second wave shows the downstream continuity seam silently
   bypassing missing tenant identity or falling through to a tenant workspace without a successful
   `getCurrentUser()`-based rehydration.

## 7. Classification of downstream continuity posture

The downstream post-activation continuity posture is:

`materially supported`

Reasoning:

1. it is not `under-evidenced` because the repo contains direct wiring proof for JWT persistence,
   direct client proof for the immediate `getCurrentUser()` rehydration call, direct backend proof
   for the `/api/me` response surface, and direct app-state proof for the canonical tenant snapshot
   and runtime-descriptor gate.
2. it is not `broken` because the inspected path does not end at token storage alone; it continues
   into authenticated user or tenant rehydration and a bounded runtime transition.
3. it is stronger than `partial` at the seam level because the app requires successful tenant
   identity reconstruction before it advances and the stored-token restore path follows the same
   fail-closed continuity pattern.
4. the truthful bounded statement is therefore that the selected downstream post-activation client
   rehydration seam is materially real and coherently guarded in repo truth.

## 8. Effect on overall invite-token remainder posture

The effect of this second-wave result on the overall non-canonical invite-token remainder posture
is:

the overall remainder remains `partial`, but it is now more narrowly defined.

This second-wave result refines the prior `partial` posture as follows:

1. the first-wave `partial` result is not overturned, because this pass did not inspect token
   provenance or issuance ownership and did not reopen the branch-identity question about whether
   the invite-token path should be read as a distinct first-owner fallback path or as a shared
   invite primitive.
2. the specific ambiguity that justified the second wave is now materially reduced. The repo now
   shows that invite-token activation does reach a coherent bounded client continuity seam after JWT
   issuance rather than stopping at raw token return.
3. the truthful residual `partial` posture therefore no longer sits primarily at downstream client
   rehydration. It now sits upstream or lateral to this seam, in the still-unproven provenance and
   branch-identity questions that this pass intentionally did not widen into.

## 9. Boundary separation from adjacent proof targets

The exact boundary separation preserved in this pass is:

1. from token provenance or issuance questions:
   this pass inspected what happens after the activation route returns a JWT; it did not inspect
   where the invite token originates, who lawfully issues it for first-owner fallback, or whether
   canonical provisioning or control-plane issuance paths are involved upstream.
2. from reused-existing-user questions:
   this pass preserved the first-wave rule that reused-existing-user behavior remains a separate
   bucket. It inspected only downstream client continuity after activation and did not evaluate
   account-reuse variants, pre-existing identity collisions, or reused-user ownership semantics.
3. from canonical provisioning or control-plane concerns:
   this pass did not inspect tenant registry, provisioning approval, control-plane onboarding
   outcome recording, or canonical issuance surfaces as primary targets. The supported canonical
   path remains closed and was not reopened.
4. from white-label completeness, billing continuation, and broader auth or provisioning redesign:
   none of those surfaces were needed to classify the bounded rehydration seam and none were pulled
   inward by implication.

## 10. Whether a later third wave is needed

A later third wave is still needed if the program wants to refine the overall invite-token
remainder beyond the now-narrower `partial` posture.

The bounded reason is:

1. this second wave materially supports downstream post-activation client continuity, but it does
   not answer the remaining upstream question of token provenance or issuance boundary for the
   invite-token path.
2. after this pass, the narrowest unresolved proof target named by current repo truth is no longer
   downstream rehydration continuity. It is the provenance or branch-identity question left outside
   both the first-wave activation-seam execution and this second-wave client-continuity execution.
3. reused-existing-user questions remain separate and should not be silently merged into any later
   third wave unless exact repo evidence proves they are required to avoid an untruthful provenance
   result.

Third-wave verdict:

- yes, a later third wave is still warranted if further refinement is desired
- the narrowest remaining third-wave target is token provenance or issuance boundary for the
  invite-token path
- no automatic third wave is opened by this artifact

## 11. Completion state

This pass remained bounded and execution-only.

Exactly one new governance analysis artifact was created.

No code or product-truth file was edited.

No onboarding design authority was edited.

No Layer 0 sync was required because this second-wave execution did not change live authority,
operational control posture, or settled onboarding-family truth; it only classified the selected
downstream post-activation client rehydration seam and refined where the invite-token remainder
still remains `partial`.