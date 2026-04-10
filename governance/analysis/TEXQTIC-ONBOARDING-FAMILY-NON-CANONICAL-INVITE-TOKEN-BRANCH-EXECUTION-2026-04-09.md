# TEXQTIC — ONBOARDING-FAMILY NON-CANONICAL INVITE-TOKEN BRANCH EXECUTION — 2026-04-09

## 1. Purpose

This execution record captures one bounded deferred-remainder execution unit for the already-opened
onboarding-family non-canonical invite-token branch only.

Its purpose is to inspect only the locked first-wave invite activation seam plus its allowed
governance and design anchors, determine what repo truth currently shows about non-canonical
invite-token behavior, classify the current posture of that remainder relative to the already-closed
supported canonical path, and record whether a later second wave is needed.

This pass is execution-analysis-only.

It does not reopen the remediation chain, reopen the consumer-regeneration chain, reopen the
supported canonical-path closure decision, merge reused-existing-user edge cases into this branch,
widen into canonical provisioning or control-plane work, begin implementation planning, change
code, change schema, change runtime behavior, change product behavior, or begin broader redesign or
cleanup.

## 2. Scope boundary

This pass was limited to:

- the live opening-layer authority documents needed to anchor lawful invite-token branch execution
- the onboarding-family remediation closeout snapshot
- the onboarding-family post-closeout entry guard
- the onboarding-family deferred-remainder branch decision
- the onboarding-family consumer-regeneration closeout snapshot
- the onboarding-family post-consumer-closeout branch-sequencing decision
- the onboarding-family non-canonical invite-token branch decision-to-open
- the bounded onboarding-family consolidation note
- the allowed governance and design anchors for invite-token classification
- the locked first-wave implementation-adjacent invite activation seam in
  `components/Onboarding/OnboardingFlow.tsx`, `services/tenantService.ts`, and
  `server/src/routes/tenant.ts`
- one bounded governance execution artifact

This pass did **not** inspect canonical provisioning or control-plane surfaces as primary targets,
inspect reused-existing-user edge cases beyond unavoidable boundary coupling already present in the
locked seam, reopen white-label completeness, reopen billing or subscription continuation, reopen
broader auth or provisioning redesign, reopen consumer-regeneration files as execution targets,
rewrite onboarding design authorities, perform debt cleanup, begin architecture evolution, begin
implementation planning, change code, change schema, change runtime behavior, change product
behavior, perform broad historical cleanup, or perform broad consumer-guidance cleanup.

## 3. Settled truths preserved

The following settled truths were preserved without reopening them:

1. the opening-layer canon remains live
2. onboarding-family remediation closeout snapshot is complete
3. onboarding-family post-closeout entry guard is complete
4. onboarding-family deferred-remainder branch decision is complete
5. onboarding-family consumer-regeneration closeout snapshot is complete
6. onboarding-family post-consumer-closeout branch-sequencing decision is complete
7. onboarding-family non-canonical invite-token branch decision-to-open is complete
8. the old `-v2` chain remains historical evidence and reconciliation input only
9. `White Label Co` remains the sole `REVIEW-UNKNOWN` hold and was not touched
10. onboarding-family closure remains bounded to the supported canonical path
11. invite fallback is no longer required for canonical first-owner usability on the supported path
12. preserved historical and launch-adjacent artifacts are not current onboarding-family authority
13. explicit deferred remainder remains outside current onboarding-family closure truth except for
    the selected invite-token bucket under inspection
14. completed remediation and consumer-regeneration passes must not be reopened unless a specific
    repo-truth regression is proven
15. downstream consumer routing is already sufficiently normalized for current use
16. reused-existing-user edge cases remain a separate deferred bucket even where the inspected seam
    contains limited user-reuse coupling
17. canonical provisioning and control-plane work remain outside this branch unless a later bounded
    pass is separately authorized

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
9. `docs/product-truth/ONBOARDING-PROVISIONING-ACTIVATION-FAMILY-CONSOLIDATION-v1.md`
10. `governance/analysis/TEXQTIC-ONBOARDING-ADJACENT-REMAINDER-INVENTORY-AND-BOUNDARY-CLASSIFICATION-2026-04-09.md`
11. `docs/product-truth/TEXQTIC-ONBOARDING-PROVISIONING-HANDOFF-DESIGN-v1.md`
12. `governance/analysis/TEXQTIC-PLATFORM-REPO-TRUTH-EVIDENCE-RECORD-v1.md`, limited to
    onboarding or handoff excerpts tied to invite activation
13. `docs/product-truth/TEXQTIC-ONBOARDING-SYSTEM-DESIGN-v1.md`
14. `components/Onboarding/OnboardingFlow.tsx`
15. `services/tenantService.ts`
16. `server/src/routes/tenant.ts`

## 5. Invite-token seam inspected

The exact invite-token seam inspected in this pass is:

1. `components/Onboarding/OnboardingFlow.tsx` carries `inviteToken` into the activation form state
   and submits that token as part of the completion payload.
2. `governance/analysis/TEXQTIC-PLATFORM-REPO-TRUTH-EVIDENCE-RECORD-v1.md` records that the
   onboarding submit path calls tenant activation, stores the returned JWT, and then rehydrates
   tenant state through `getCurrentUser`.
3. `services/tenantService.ts` exposes `activateTenant()` as the dedicated client seam into
   `POST /api/tenant/activate`.
4. `server/src/routes/tenant.ts` implements `POST /api/tenant/activate`, which:
   - validates the invite token payload and user data
   - hashes the invite token and loads an unaccepted, unexpired invite
   - requires email match between invite and submitted user data
   - creates or finds the user by email
   - updates organization verification fields and sets organization status to
     `PENDING_VERIFICATION`
   - optionally updates tenant naming data
   - creates a membership for the activated user
   - accepts the invite
   - writes audit
   - resolves tenant session identity and returns a tenant JWT plus tenant summary
5. The same locked route file also shows that invite tokens are used as a broader tenant-plane
   primitive through `POST /api/tenant/memberships`, which creates invite tokens for tenant member
   invitations.

## 6. Repo-truth findings

The repo-truth findings from the locked seam are:

1. a non-canonical invite-token activation path is materially present in the repo as a real token
   consumption and acceptance seam rather than as documentation-only intent
2. the seam is not first-owner-exclusive; it is a shared invite acceptance mechanism that can serve
   either first-owner activation or later invited membership depending on whether an `OWNER`
   membership already exists on the tenant
3. the seam contains unavoidable user-reuse coupling because the activation route does `findUnique`
   by email and falls back to user creation only when no existing user is found
4. the server-side activation seam does not directly prove approved owner-ready continuity; the
   inspected route updates organization status to `PENDING_VERIFICATION`, and the inspected
   `resolveTenantSessionIdentity` helper in the same file returns the current organization status
   rather than proving a later approved handoff state
5. the locked seam therefore proves invite-token activation is materially real as an onboarding or
   acceptance path, but it does not prove a fully separate, fully closed, non-canonical owner-ready
   handoff path beyond the supported canonical closure
6. the locked seam also does not prove token provenance for first-owner fallback separately from the
   broader invite primitive, because this pass inspected token consumption and tenant-plane invite
   creation only, not canonical provisioning or control-plane issuance paths
7. allowed evidence shows one adjacent downstream handoff remains outside this pass: after
   activation, the client stores the returned JWT and rehydrates state through `getCurrentUser`, but
   that rehydration surface was not inspected here

## 7. Classification of current invite-token remainder posture

The current invite-token remainder posture is:

`partial`

Reasoning:

1. it is not `broken` because the locked seam materially proves a real invite-token activation route
   across UI state, client service, backend route, membership creation, invite acceptance, audit,
   and JWT issuance
2. it is not `materially supported` as a fully closed remainder because the inspected path lands in
   `PENDING_VERIFICATION`, shares logic with later tenant-member invite handling, and includes
   create-or-find user behavior that crosses into reused-existing-user boundary concerns without
   resolving them here
3. it is not purely `under-evidenced` because the repo contains strong structural and route-level
   evidence for the server-side acceptance seam itself
4. the truthful current statement is therefore that non-canonical invite-token behavior is
   materially real as a shared invite activation seam, but only partially established as a distinct
   onboarding-family remainder relative to the already-closed supported canonical path

## 8. Boundary separation from adjacent deferred buckets

The exact boundary separation preserved in this pass is:

1. from supported canonical path truth:
   the supported canonical path remains closed and no longer depends on invite fallback for
   canonical first-owner usability; the inspected invite-token seam is therefore a separate
   alternative-path remainder and not a prerequisite for reopening canonical closure
2. from reused-existing-user edge cases:
   the locked seam does include `find-or-create user` behavior, so boundary coupling is materially
   present at the route level; however this pass only records that coupling and does not evaluate
   account-reuse variants, pre-existing identity collisions, or full reused-user behavior as a
   separate branch
3. from canonical provisioning or control-plane concerns:
   this pass inspected invite-token consumption and tenant-plane invite creation only; it did not
   inspect canonical provisioning issuance, control-plane approval routing, or provisioning console
   behavior, so it does not restate or reopen those concerns
4. from white-label, billing, and broader auth or provisioning redesign:
   none of those buckets were inspected or needed to classify the locked invite-token seam; they
   remain separate deferred work
5. from consumer-regeneration work:
   already-normalized downstream consumer materials were not reopened, because current consumer
   safety is already sufficiently normalized and this pass was execution-analysis of the invite seam
   only

## 9. Whether a later second wave is needed

A later second wave is needed.

It is needed for the following bounded reasons:

1. this first wave proves the server-side invite acceptance seam is real, but it does not prove
   whether the non-canonical invite-token path should be interpreted as a distinct first-owner
   fallback path or as a shared invite primitive that overlaps materially with later member-invite
   and reused-existing-user behavior
2. allowed evidence already shows one precise adjacent out-of-scope handoff after activation:
   `App.tsx` stores the returned JWT and rehydrates tenant state through `getCurrentUser`; that
   downstream rehydration step was not inspected in this pass and remains a bounded proof gap for
   end-to-end post-activation continuity
3. because the current result is already truthful as `partial`, this pass does not widen
   automatically; any second wave must remain separately authorized and must decide whether to prove
   the downstream rehydration handoff, the exact first-owner token provenance, or the reused-user
   boundary first

Second-wave verdict:

- yes, a later second wave is warranted
- no automatic widening occurred in this pass
- no canonical provisioning or control-plane reopening is justified yet from this first-wave result

## 10. Completion state

This pass remained bounded and execution-only.

Exactly one new governance analysis artifact was created.

No code or product-truth file was edited.

No onboarding design authority was edited.

No Layer 0 sync was required because this execution-analysis pass did not change live authority,
operational control posture, or settled onboarding-family truth; it only classified what the
locked invite-token seam currently proves and where that remainder remains partial.
