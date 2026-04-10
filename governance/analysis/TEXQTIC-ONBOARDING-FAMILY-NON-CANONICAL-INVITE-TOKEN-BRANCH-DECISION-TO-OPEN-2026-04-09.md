# TEXQTIC — ONBOARDING-FAMILY NON-CANONICAL INVITE-TOKEN BRANCH DECISION-TO-OPEN — 2026-04-09

## 1. Purpose

This execution record captures one bounded governance opening-decision unit for the selected
onboarding-family deferred-remainder branch covering non-canonical invite-token behaviors only.

Its purpose is to formally open that selected branch, identify the exact files and surfaces eligible
for inspection in the later execution pass, identify plausible adjacent surfaces that remain out of
scope, state the exact branch boundary, and lock the anti-widening rules that must govern the
future execution pass.

This pass is decision-to-open-only.

It does not execute the invite-token branch, reopen completed remediation or consumer-regeneration
passes, reopen reused-existing-user work, reopen white-label completeness work, reopen billing or
subscription continuation, reopen broader auth or provisioning redesign, regenerate consumer
surfaces, rewrite onboarding design authorities, begin implementation planning, or begin broader
cleanup.

## 2. Scope boundary

This pass was limited to:

- the live opening-layer authority documents needed to anchor lawful post-consumer-closeout branch
  opening
- the onboarding-family remediation closeout snapshot
- the onboarding-family post-closeout entry guard
- the onboarding-family deferred-remainder branch decision
- the onboarding-family consumer-regeneration closeout snapshot
- the onboarding-family post-consumer-closeout branch-sequencing decision
- the bounded onboarding-family consolidation note
- the minimum governance, product-truth, and repo-evidence surfaces needed to classify the
  non-canonical invite-token branch truthfully
- one bounded governance opening artifact

This pass did **not** execute the invite-token branch, reopen completed remediation or regeneration
passes, reopen reused-existing-user edge-case work, reopen white-label completeness work, reopen
billing or subscription continuation, reopen broader auth or provisioning redesign, rewrite
onboarding design authorities, perform debt cleanup, begin architecture evolution, begin
implementation planning, change code, change schema, change runtime behavior, change product
behavior, perform broad historical cleanup, perform broad consumer-guidance cleanup, or perform
broader launch-family baseline or context cleanup.

## 3. Settled truths preserved

The following settled truths were preserved without reopening them:

1. the opening-layer canon remains live
2. onboarding-family remediation closeout snapshot is complete
3. onboarding-family post-closeout entry guard is complete
4. onboarding-family deferred-remainder branch decision is complete
5. onboarding-family consumer-regeneration closeout snapshot is complete
6. onboarding-family post-consumer-closeout branch-sequencing decision is complete
7. the old `-v2` chain remains historical evidence and reconciliation input only
8. `White Label Co` remains the sole `REVIEW-UNKNOWN` hold and was not touched
9. onboarding-family closure remains bounded to the supported canonical path
10. invite fallback is no longer required for canonical first-owner usability on the supported path
11. preserved historical and launch-adjacent artifacts are not current onboarding-family authority
12. explicit deferred remainder remains outside current onboarding-family closure truth except for
    the specifically opened branch under inspection
13. completed remediation and consumer-regeneration passes must not be reopened unless a specific
    repo-truth regression is proven
14. downstream consumer routing is already sufficiently normalized for current use
15. reused existing-user edge cases remain separate from the selected non-canonical invite-token
    branch
16. white-label overlay completeness, billing and subscription continuation, broader auth or
    provisioning redesign, and broader launch-family baseline or context cleanup remain separate
    deferred buckets

## 4. Inputs inspected

The following inputs were inspected in this pass:

1. `governance/control/TEXQTIC-OPENING-LAYER-GOVERNANCE-AUTHORITY-AND-POINTER-LAYER-2026-04-09.md`
2. `governance/control/TEXQTIC-OPENING-LAYER-SEQUENCING-AND-NEXT-CYCLE-ENTRY-2026-04-09.md`
3. `governance/analysis/TEXQTIC-ONBOARDING-FAMILY-REMEDIATION-CLOSEOUT-SNAPSHOT-2026-04-09.md`
4. `governance/analysis/TEXQTIC-ONBOARDING-FAMILY-POST-CLOSEOUT-ENTRY-GUARD-2026-04-09.md`
5. `governance/analysis/TEXQTIC-ONBOARDING-FAMILY-DEFERRED-REMAINDER-BRANCH-DECISION-2026-04-09.md`
6. `governance/analysis/TEXQTIC-ONBOARDING-FAMILY-CONSUMER-REGENERATION-CLOSEOUT-SNAPSHOT-2026-04-09.md`
7. `governance/analysis/TEXQTIC-ONBOARDING-FAMILY-POST-CONSUMER-CLOSEOUT-BRANCH-SEQUENCING-DECISION-2026-04-09.md`
8. `docs/product-truth/ONBOARDING-PROVISIONING-ACTIVATION-FAMILY-CONSOLIDATION-v1.md`
9. `governance/analysis/TEXQTIC-ONBOARDING-ADJACENT-REMAINDER-INVENTORY-AND-BOUNDARY-CLASSIFICATION-2026-04-09.md`
10. `docs/product-truth/TEXQTIC-ONBOARDING-PROVISIONING-HANDOFF-DESIGN-v1.md`
11. `docs/product-truth/TEXQTIC-ONBOARDING-SYSTEM-DESIGN-v1.md`
12. `governance/analysis/TEXQTIC-PLATFORM-REPO-TRUTH-EVIDENCE-RECORD-v1.md`

## 5. Candidate invite-token branch surfaces considered

The candidate invite-token branch surfaces considered in this opening pass are:

| Surface | Surface role | Invite-token branch fit | First execution-wave fit | Disposition |
| --- | --- | --- | --- | --- |
| `docs/product-truth/TEXQTIC-ONBOARDING-PROVISIONING-HANDOFF-DESIGN-v1.md` | family-truth design authority for first-owner handoff, including the canonical-versus-invite split | direct | yes | include as a first-wave inspection anchor |
| `governance/analysis/TEXQTIC-ONBOARDING-ADJACENT-REMAINDER-INVENTORY-AND-BOUNDARY-CLASSIFICATION-2026-04-09.md` | governance classification of deferred remainder buckets | direct | yes | include as a first-wave governance anchor |
| `governance/analysis/TEXQTIC-PLATFORM-REPO-TRUTH-EVIDENCE-RECORD-v1.md` | repo-evidence record naming actual onboarding, activation, provisioning, and control-plane seams | direct, but excerpt-bounded | yes | include as a first-wave evidence anchor, limited to onboarding or handoff excerpts tied to invite activation |
| `components/Onboarding/OnboardingFlow.tsx` | owner-entry or activation UI seam named by repo evidence | direct | yes | include as a first-wave invite activation inspection surface |
| `services/tenantService.ts` | client seam into tenant activation | direct | yes | include as a first-wave invite activation inspection surface |
| `server/src/routes/tenant.ts` | backend invite activation seam named by repo evidence | direct | yes | include as a first-wave invite activation inspection surface |
| `docs/product-truth/TEXQTIC-ONBOARDING-SYSTEM-DESIGN-v1.md` | upstream activation and verification design authority that separates verification closure from later handoff continuity | partial and guardrail-only | no | keep as context-only boundary guard, not as a first-wave execution target |
| `components/ControlPlane/TenantRegistry.tsx`, `services/controlPlaneService.ts`, `server/src/routes/admin/tenantProvision.ts`, `server/src/routes/control.ts` | canonical provisioning and control-plane outcome surfaces adjacent to invite activation | adjacent only | no | keep out of scope unless later exact coupling proof shows invite-token inspection cannot be truthful without them |
| normalized downstream consumer set: `docs/product-truth/TEXQTIC-GAP-REGISTER-v1.md`, `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v1.md`, `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v1.md`, `docs/product-truth/TEXQTIC-LAUNCH-READINESS-REQUIREMENTS-v1.md`, `docs/product-truth/TEXQTIC-LAUNCH-PLANNING-SPLIT-v1.md`, `docs/product-truth/TEXQTIC-LAUNCH-SCOPE-DECISION-RECORD-v1.md` | already-normalized downstream consumer materials | no longer needed for branch opening | no | keep out of scope because consumer safety is already sufficiently normalized |

## 6. Decision logic

The decision logic used in this opening pass is:

1. the selected branch should open now only if it still fits the post-closeout entry rule and the
   post-consumer-closeout sequencing decision without reopening any completed pass
2. the opening boundary must preserve the supported canonical-path closure truth and must not let
   alternative invite-token behavior redefine the closure standard for the canonical path
3. the eligible execution-wave inspection set should isolate the invite activation seam itself,
   rather than immediately importing broader canonical provisioning, reused-existing-user edge
   cases, or redesign surfaces
4. current downstream consumer safety is already sufficient, so consumer-regeneration files should
   not be reopened as part of this branch-opening decision
5. adjacent control-plane provisioning and outcome-recording surfaces should remain out of scope
   unless later execution proves that invite-token behavior cannot be inspected truthfully without
   them

Applying those rules yields the following judgment:

- the non-canonical invite-token branch should open now because it is the already-selected next
  lawful deferred-remainder branch after consumer-regeneration closeout
- the truthful first execution-wave inspection set is the invite activation chain itself: handoff
  design authority, deferred-remainder classification, repo-evidence excerpts, the onboarding
  activation UI seam, the client activation seam, and the backend tenant activation seam
- upstream activation or verification design remains relevant only as a guardrail so the branch
  does not drift back into `ONBOARDING-ENTRY-001`
- canonical provisioning, control-plane outcome recording, reused-existing-user edge cases,
  white-label completeness, billing continuation, broader auth or provisioning redesign, and
  broader cleanup remain out of scope in this opening pass and in the future first execution wave

## 7. Recommended next step

The non-canonical invite-token branch should open now.

The recommended next step after this opening decision is:

- execute one bounded onboarding-family non-canonical invite-token branch pass that inspects only
  the exact opening boundary defined below

That later execution pass should begin by validating the already-named invite activation seam and
its family-truth anchors before considering any adjacent surface.

This opening artifact formally authorizes that bounded later execution pass, but it does not
perform it.

## 8. Exact opening boundary for the invite-token branch

The exact opening boundary for the now-opened non-canonical invite-token branch is:

- open one bounded onboarding-family deferred-remainder branch for non-canonical invite-token
  behaviors only
- start from the live opening-layer canon, the remediation closeout snapshot, the post-closeout
  entry guard, the deferred-remainder branch decision, the consumer-regeneration closeout snapshot,
  the post-consumer-closeout branch-sequencing decision, and the bounded onboarding-family
  consolidation note
- allow the later execution pass to inspect exactly these governance and design anchors:
  - `governance/analysis/TEXQTIC-ONBOARDING-ADJACENT-REMAINDER-INVENTORY-AND-BOUNDARY-CLASSIFICATION-2026-04-09.md`
  - `docs/product-truth/TEXQTIC-ONBOARDING-PROVISIONING-HANDOFF-DESIGN-v1.md`
  - `governance/analysis/TEXQTIC-PLATFORM-REPO-TRUTH-EVIDENCE-RECORD-v1.md`, limited to
    onboarding or handoff excerpts tied to invite activation
- allow the later execution pass to inspect exactly these first-wave implementation-adjacent
  invite-token surfaces:
  - `components/Onboarding/OnboardingFlow.tsx`
  - `services/tenantService.ts`
  - `server/src/routes/tenant.ts`
- keep `docs/product-truth/TEXQTIC-ONBOARDING-SYSTEM-DESIGN-v1.md` as context-only guardrail
  input so the branch preserves the boundary between verification-loop closure and later invite-path
  remainder work
- preserve the supported canonical-path closure boundary exactly as settled
- preserve the explicit remainder set outside current closure truth except for the selected
  non-canonical invite-token bucket under inspection
- do not reopen the completed remediation chain or the completed consumer-regeneration chain
- do not silently import reused-existing-user edge cases, white-label completeness, billing and
  subscription continuation, broader auth or provisioning redesign, canonical provisioning
  broadening, control-plane outcome broadening, or broader launch-family baseline or context cleanup
  into the same branch
- do not turn the branch into implementation planning, redesign, code work, or broader cleanup

## 9. Why adjacent deferred buckets remain out of scope

Adjacent deferred buckets and surfaces remain out of scope for the following reasons:

1. `reused existing-user edge cases` remain out of scope because they are a separate
   alternative-path remainder bucket and should not be silently merged with the broader invite-token
   bucket before that bucket is first classified and inspected in bounded form.
2. canonical provisioning and control-plane outcome surfaces remain out of scope because the
   settled supported canonical path is already closed, so reopening tenant registry, provisioning,
   or control-plane approval routing now would blur supported-path closure with non-canonical-path
   hardening.
3. `white-label overlay completeness beyond bounded continuity` remains out of scope because it is
   an overlay-family remainder, not the next invite-path truth-restoration need.
4. `billing and subscription continuation` remains out of scope because commercial posture must not
   be pulled inward as if it defined invite-token branch completion.
5. `broader auth and provisioning redesign` remains out of scope because it is the highest-risk
   cross-cutting remainder bucket and would collapse this bounded branch into redesign.
6. broader launch-family baseline or context cleanup remains out of scope because downstream
   consumer routing is already sufficiently normalized, so broader cleanup is now separate from the
   invite-token remainder.
7. normalized downstream consumer materials remain out of scope because the invite-token branch is
   not a consumer-regeneration pass and does not need those already-safe consumer surfaces reopened
   to open truthfully.

## 10. Completion state

This pass remained bounded and decision-to-open-only.

Exactly one new governance analysis artifact was created.

No consumer surface was regenerated.

No historical file was edited.

No onboarding design authority was edited.

No Layer 0 sync was required because this opening decision did not change live opening-layer
authority, operational control posture, or settled onboarding-family truth; it only formally
opened the next bounded deferred-remainder branch and recorded its lawful future inspection
boundary.
