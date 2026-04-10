# TEXQTIC — ONBOARDING-FAMILY NON-CANONICAL INVITE-TOKEN SECOND-WAVE DECISION — 2026-04-09

## 1. Purpose

This execution record captures one bounded governance sequencing unit for invite-token second-wave
selection only.

Its purpose is to evaluate the lawful second-wave proof targets after the completed first-wave
invite-token execution returned a `partial` result, decide which single proof target should go
first, record why that target should go first, record why the other candidate proof targets should
not go first yet, and state the exact boundary of the chosen second wave without executing it.

This pass is second-wave-decision-only.

It does not execute a second wave, reopen completed remediation or consumer-regeneration work,
begin implementation planning, widen into reused-existing-user edge cases, widen into canonical
provisioning or control-plane work, begin architecture work, or begin broader cleanup.

## 2. Scope boundary

This pass was limited to:

- the live opening-layer authority documents needed to anchor lawful second-wave selection
- the onboarding-family remediation closeout snapshot
- the onboarding-family post-closeout entry guard
- the onboarding-family deferred-remainder branch decision
- the onboarding-family consumer-regeneration closeout snapshot
- the onboarding-family post-consumer-closeout branch-sequencing decision
- the onboarding-family non-canonical invite-token branch decision-to-open
- the onboarding-family non-canonical invite-token branch execution artifact
- the bounded onboarding-family consolidation note
- the already-identified candidate second-wave proof target references from the first-wave result
- one bounded governance decision artifact

This pass did **not** execute a second wave, reopen completed remediation or regeneration passes,
reopen reused-existing-user edge-case work, reopen white-label completeness work, reopen billing or
subscription continuation, reopen broader auth or provisioning redesign, rewrite onboarding design
authorities, perform debt cleanup, begin architecture evolution, begin implementation planning,
change code, change schema, change runtime behavior, change product behavior, perform broad
historical cleanup, or perform broad consumer-guidance cleanup.

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
9. the old `-v2` chain remains historical evidence and reconciliation input only
10. `White Label Co` remains the sole `REVIEW-UNKNOWN` hold and was not touched
11. onboarding-family closure remains bounded to the supported canonical path
12. invite fallback is no longer required for canonical first-owner usability on the supported path
13. explicit deferred remainder remains outside current onboarding-family closure truth except for
    the invite-token bucket under bounded inspection
14. completed remediation and consumer-regeneration passes must not be reopened unless a specific
    repo-truth regression is proven
15. first-wave invite-token execution truthfully concluded `partial`
16. reused-existing-user edge cases remain separate from invite-token second-wave work unless
    explicitly and separately authorized

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
10. `docs/product-truth/ONBOARDING-PROVISIONING-ACTIVATION-FAMILY-CONSOLIDATION-v1.md`

## 5. Candidate second-wave proof targets considered

The candidate second-wave proof targets considered in this pass are:

| Candidate proof target | Fit with first-wave `partial` result | Ambiguity reduction value | Widening risk | Decision disposition |
| --- | --- | --- | --- | --- |
| downstream post-activation client rehydration continuity | high | high | medium-low | first |
| token provenance / issuance boundary for the invite-token path | medium | medium | high | later |
| hold at `partial` for now with no second wave | medium | low | low | later |

These candidates were derived directly from the first-wave execution result:

- the first wave explicitly identified the post-activation client handoff as a bounded proof gap,
  because allowed evidence already showed that `App.tsx` stores the returned JWT and then
  rehydrates tenant state through `getCurrentUser`
- the first wave explicitly identified token provenance as still unproven, because it did not
  inspect canonical provisioning or control-plane issuance paths
- the first wave already produced a truthful `partial` result, so a hold option remains lawful if
  no narrower ambiguity-reducing next proof target exists

## 6. Decision logic

The decision logic used in this pass is:

1. the next second-wave target should directly reduce the ambiguity that made the first wave land at
   `partial`
2. the next target must preserve the settled supported canonical-path closure truth rather than
   reframe invite-token proof as a prerequisite for reopening canonical closure
3. the next target should be inspectable without silently widening into reused-existing-user work or
   canonical provisioning or control-plane work
4. the next target should be the narrowest lawful proof target already identified by the first-wave
   result, rather than a broader provenance or issuance problem if a nearer continuity gap exists
5. a hold-at-partial outcome should be chosen only if no meaningful narrower ambiguity-reducing
   second wave exists

Applying those rules yields the following judgment:

- the best next proof target is downstream post-activation client rehydration continuity
- it should go first because the first-wave execution already isolated that handoff as the nearest
  bounded proof gap after the materially real server-side invite acceptance seam
- it reduces ambiguity about whether the invite-token path merely returns a JWT or actually reaches
  a coherent post-activation client continuity state without first forcing the branch into token
  provenance or provisioning issuance analysis
- token provenance or issuance boundary should not go first because that question is broader and
  more likely to drag the branch into canonical provisioning or control-plane territory that the
  first-wave result explicitly left unopened
- holding at `partial` should not go first because a narrower lawful next proof target already
  exists and was explicitly named by the first-wave result

## 7. Recommended next step

The recommended next step is:

`downstream post-activation client rehydration continuity` as the bounded second-wave proof target
for the invite-token branch.

This target should go first because:

1. it is the nearest unresolved continuity seam immediately downstream of the already-proven
   server-side invite acceptance path
2. it meaningfully reduces the ambiguity behind the current `partial` result by testing whether the
   returned activation token actually carries forward into coherent client rehydration
3. it can be bounded around the already-cited post-activation handoff rather than broadening into
   issuance provenance or provisioning ownership questions too early
4. it preserves the separation between invite-token inspection and reused-existing-user or
   canonical provisioning/control-plane buckets

This second wave is recommended next, but it is **not** executed by this artifact.

## 8. Exact boundary for the recommended second wave

The exact boundary for the recommended second wave is:

- inspect the downstream post-activation client handoff only
- start from the live opening-layer canon, the remediation closeout snapshot, the post-closeout
  entry guard, the deferred-remainder branch decision, the consumer-regeneration closeout snapshot,
  the post-consumer-closeout branch-sequencing decision, the invite-token branch decision-to-open,
  the invite-token branch execution artifact, and the bounded onboarding-family consolidation note
- use only the already-identified first-wave proof reference that the activation response is stored
  in the client and then rehydrated through `getCurrentUser`
- focus only on whether post-activation JWT persistence and current-user rehydration form a
  coherent bounded continuity seam after invite-token activation
- do not reopen or reclassify the first-wave server-side activation seam except as the immediate
  upstream input to the rehydration handoff
- do not inspect token provenance or issuance ownership as a primary target in that second wave
- do not inspect canonical provisioning or control-plane issuance paths as primary targets
- do not silently import reused-existing-user edge cases, white-label completeness, billing or
  subscription continuation, broader auth or provisioning redesign, or broader cleanup into the
  same second wave
- do not turn that second wave into implementation planning, code work, redesign work, or broader
  continuity proof beyond the single post-activation client rehydration target

## 9. Why other proof targets do not go first yet

The other candidate proof targets do not go first yet for the following reasons:

1. `token provenance / issuance boundary for the invite-token path` does not go first because the
   first-wave result already showed that proving provenance would likely require following the token
   back toward broader invite issuance, canonical provisioning, or control-plane boundaries, which
   is a higher-widening-risk problem than the nearer rehydration continuity gap.
2. `hold at partial for now with no second wave` does not go first because the first-wave artifact
   already named a specific narrower proof gap that can be pursued without automatically widening
   into the broader deferred buckets.
3. reused-existing-user edge-case follow-up does not go first because the current first-wave result
   only recorded boundary coupling at the route level; it did not show that reused-user proof must
   be the next move before the downstream rehydration continuity seam is understood.
4. canonical provisioning or control-plane reopening does not go first because the first-wave
   result explicitly concluded that no such reopening was yet justified from the initial invite seam
   analysis.

## 10. Completion state

This pass remained bounded and decision-only.

Exactly one new governance analysis artifact was created.

No code or product-truth file was edited.

No onboarding design authority was edited.

No Layer 0 sync was required because this second-wave decision did not change live authority,
operational control posture, or settled onboarding-family truth; it only selected the next lawful
proof target after the first-wave `partial` result.
