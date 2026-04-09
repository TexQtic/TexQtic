# TEXQTIC-GOVERNANCE-ALIGNMENT-PLAN-FROM-REPO-TRUTH-2026-04-09

Status: planning only
Date: 2026-04-09
Scope: governance alignment from canonical repo-truth baseline
Primary authority: TEXQTIC-REPO-TRUTH-BASELINE-AND-GOVERNANCE-RESET-OPTIONS-2026-04-09.md

## 1. Purpose

This document defines the safest and most durable plan to realign TexQtic governance authority to
current repo truth without beginning governance reconciliation in this pass.

The goal is to rebuild the opening-layer truth and pointer layer from confirmed repo/runtime
authority, preserve the already aligned technical and family-level anchors, and then govern a
later family-by-family reconciliation sequence from a cleaner baseline.

This is a planning artifact only.

## 2. Decision context

The canonical repo-truth baseline established the following controlling facts:

- Confirmed: TexQtic is a two-package application repo, not a formal pnpm/Turbo workspace in the
  current filesystem state.
- Confirmed: the backend is a modular monolith, not a microservice platform.
- Confirmed: tenancy is constitutionally anchored on `org_id` and `app.org_id`.
- Confirmed: the strongest current technical authority sits in repo truth, shared contracts, and
  the stronger April 2026 family-normalization artifacts.
- Confirmed: the largest current governance distortion is concentrated in the opening/pointer/
  planning layer rather than the best technical contracts or the strongest family-level design
  anchors.
- Confirmed: Layer 0 still points live sequencing authority at the older `-v2` planning stack.

The planning question is therefore not whether governance needs alignment. The planning question
is which alignment strategy produces the cleanest authority hierarchy with the lowest risk of
carrying forward stale structure.

## 3. Cross-track interpretations preserved

The following interpretations are controlling for this plan and must remain visible in later
execution:

1. TexQtic's biggest near-term risk is authority sprawl more than raw code sprawl.
2. The strongest immediate win is restoring a clean authority hierarchy: repo/runtime truth,
   aligned technical contracts, aligned family design anchors, reconciled downstream governance,
   and only then delivery planning.
3. The modular monolith remains an asset and must not be destabilized through governance cleanup.
4. The medium-term technical debt center of gravity is legacy-to-`org_id` tenancy convergence.
5. White-label must be treated as capability architecture and overlay truth, not as a separate
   runtime family or a naming-only cleanup item.

## 4. Why reconcile-forward is insufficient

Reconcile-forward is not the optimal primary strategy for TexQtic because:

- Confirmed: the current opening and pointer layer still inherits the older `TEXQTIC-GAP-
  REGISTER-v2.md` and `TEXQTIC-NEXT-DELIVERY-PLAN-v2.md` stack as live sequencing authority.
- Confirmed: the repo-truth baseline already found that those layers are materially drifted as the
  next-cycle starting point.
- Confirmed: patching the old opening layer in place would keep stale sequencing assumptions,
  stale taxonomy residue, and mixed historical authority chains alive.
- Recommended: governance reset should remove inherited ambiguity rather than document it more
  carefully.

Conclusion:

- reconcile-forward remains useful only after the opening-layer authority is rebuilt from current
  truth
- it is not sufficient as the primary next move

## 5. Why recreate-all is excessive

Full recreation of the entire governance and design corpus is not the best path because:

- Confirmed: `shared/contracts/rls-policy.md` and `shared/contracts/ARCHITECTURE-GOVERNANCE.md`
  remain aligned with current code truth.
- Confirmed: April family artifacts such as `WHITE-LABEL-OVERLAY-NORMALIZATION-v1.md`,
  `AGGREGATOR-OPERATING-MODE-NORMALIZATION-v1.md`,
  `PLATFORM-CONTROL-PLANE-FAMILY-REPLAN-v1.md`,
  `IDENTITY-TENANCY-WORKSPACE-CONTINUITY-DESIGN-v1.md`,
  `B2B-EXCHANGE-OPERATING-MODE-DESIGN-v1.md`,
  `B2C-OPERATING-MODE-DESIGN-v1.md`, and
  `ENTERPRISE-WITHIN-B2B-DEPTH-BOUNDARY-v1.md` are materially stronger than the older opening
  stack and are worth preserving.
- Recommended: replacing already aligned anchors would create churn without reducing risk.

Conclusion:

- recreate-all is unnecessarily destructive
- preserve-then-rebuild-openings is cleaner and lower-risk

## 6. Recommended model: hybrid reset-plus-reconciliation

The recommended governance model is:

1. Recreate the opening-layer truth, baseline truth, and pointer-layer documents from repo truth.
2. Preserve aligned technical contracts without rewrite.
3. Preserve aligned April family-level design anchors without rewrite.
4. Reconcile remaining downstream governance families only after the new opening layer is live.
5. Keep debt cleanup and architecture change explicitly out of the first governance reset pass.

Assessment of alternatives:

- Better alternative found: no.
- Recommended judgment: the refined hybrid reset-plus-reconciliation model from the repo-truth
  baseline remains the best available plan.

## 7. Preserve / recreate / reconcile / de-authorize matrix

| Artifact family | Classification | Planning action | Rationale |
| --- | --- | --- | --- |
| Repo-truth baseline | Confirmed current authority | Preserve as canonical baseline | It is the cleanest pre-audit truth record now available |
| Shared contracts: RLS, architecture governance, sampled OpenAPI | Aligned | Preserve | Current code truth supports them |
| April family design anchors | Aligned | Preserve | They already carry the cleaner family taxonomy |
| Layer 0 opening and pointer surfaces | Partially drifted | Recreate selectively | Structure remains useful; live authority chain is outdated |
| Product-facing `-v2` planning stack | Materially drifted as next-cycle baseline | Reconcile later from new opening layer | Useful as historical/evidence context, unsafe as fresh opening authority |
| Historical execution logs and closed units | Historical evidence | Retain as evidence only | Valuable lineage, not live authority |
| `server/README.md` as operational authority | Obsolete / unsafe | De-authorize explicitly | Conflicts with current DB, RLS, and Prisma posture |
| Root `README.md` as live platform authority | Self-de-authorized / partial reference | Retain as reference only | Useful orientation, not canonical truth |
| Onboarding system design | Partially drifted | Reconcile after taxonomy and canon reset | Still useful, but enterprise shorthand and older branching language need controlled requalification |

## 8. Opening-layer reset sequence

Minimum viable replacement canon gate:

Before any Layer 0 rebinding or old-pointer de-authorization occurs, the replacement opening-layer
canon must be explicitly enumerated and approved as a bounded package.

At minimum, that replacement canon should contain:

1. the repo/runtime baseline
2. the taxonomy-truth baseline
3. the governance authority and pointer layer
4. the preserve-versus-recreate matrix
5. the source-of-truth canon matrix
6. the current sequencing and next-cycle entry document

The opening-layer reset should proceed in the following order:

1. Freeze the repo-truth baseline as the controlling pre-audit truth record.
2. Open one bounded governance decision that authorizes opening-layer reset and defines the
   preserve-versus-recreate matrix.
3. Define and approve the exact replacement opening-layer canon and pointer set before any pointer
  rebinding.
4. Create the missing opening-layer documents required by that approved canon package.
5. Create a new governance-authority and pointer-layer document that replaces the old live pointer
  chain.
6. Only after the minimum viable replacement canon exists, rebind Layer 0 to the new opening layer.
7. Only after those new openings exist and Layer 0 is safely rebound, de-authorize the old
  opening-layer pointer chain as live authority while preserving historical lineage.

Planning rule:

- no downstream reconciliation work starts before Step 5 is complete

## 9. Downstream reconciliation order

After the opening layer is reset, downstream reconciliation should proceed family-by-family in the
following order:

1. Governance authority and pointer surfaces
2. Taxonomy and naming surfaces
3. Technical contract parity surfaces
4. Cross-cutting identity / tenancy / workspace continuity surfaces
5. Platform control-plane and onboarding-adjacent planning surfaces
6. B2B, B2C, WL, and Aggregator downstream family descendants
7. Delivery-planning and sequencing surfaces

Why this order:

- recommended: authority must stabilize before semantics
- recommended: semantics must stabilize before contract or delivery interpretation
- recommended: delivery planning is the last consumer of cleaned governance, not the first source
  of truth

## 10. Governance Canon / Source-of-Truth Matrix

This matrix defines which artifact should be treated as authoritative by topic once the new opening
layer is created.

| Topic | Authoritative artifact(s) | Status | Planning action |
| --- | --- | --- | --- |
| Repo/runtime baseline truth | TEXQTIC-REPO-TRUTH-BASELINE-AND-GOVERNANCE-RESET-OPTIONS-2026-04-09.md | Confirmed | Preserve |
| Runtime-family truth | New opening-layer runtime/taxonomy baseline plus `runtime/sessionRuntimeDescriptor.ts` as repo authority | Recommended | Recreate opening-layer summary; preserve repo authority |
| Tenancy isolation truth | `shared/contracts/rls-policy.md` plus `shared/contracts/ARCHITECTURE-GOVERNANCE.md` | Confirmed | Preserve |
| Structural tenancy boundary | Repo code and schema truth anchored on `org_id` / `app.org_id`; opening-layer tenancy baseline to summarize | Confirmed + recommended summary | Preserve code truth; recreate summary |
| B2B family truth | `B2B-EXCHANGE-OPERATING-MODE-DESIGN-v1.md` | Confirmed aligned anchor | Preserve |
| B2C family truth | `B2C-OPERATING-MODE-DESIGN-v1.md` | Confirmed aligned anchor | Preserve |
| WL classification truth | `WHITE-LABEL-OVERLAY-NORMALIZATION-v1.md` | Confirmed aligned anchor | Preserve |
| Aggregator family truth | `AGGREGATOR-OPERATING-MODE-NORMALIZATION-v1.md` | Confirmed aligned anchor | Preserve |
| Enterprise classification truth | `ENTERPRISE-WITHIN-B2B-DEPTH-BOUNDARY-v1.md` | Confirmed aligned anchor | Preserve |
| Control-plane boundary truth | `PLATFORM-CONTROL-PLANE-FAMILY-REPLAN-v1.md` | Confirmed aligned anchor | Preserve |
| Identity / workspace continuity truth | `IDENTITY-TENANCY-WORKSPACE-CONTINUITY-DESIGN-v1.md` | Confirmed aligned anchor | Preserve |
| Onboarding loop truth | `TEXQTIC-ONBOARDING-SYSTEM-DESIGN-v1.md`, but only after taxonomy normalization and canon reset | Partially drifted | Reconcile later |
| Delivery sequencing truth | New opening-layer sequencing pointer to be created from cleaned authority hierarchy | Recommended | Recreate |
| Historical closure lineage | Existing execution logs, closed units, and prior `-v2` planning stack | Historical evidence | Retain as evidence only |

## 11. Drift-prevention controls

The new governance model should include the following controls:

1. Opening-layer documents must declare their upstream canon explicitly.
2. Delivery-planning documents must not self-upgrade into truth authority.
3. Any artifact using `enterprise` must state the B2B child/depth meaning explicitly.
4. Any artifact using `white-label` must state overlay/capability meaning explicitly.
5. Any artifact discussing tenancy must use `org_id` and `app.org_id` as the canonical boundary.
6. Layer 0 pointers must reference the new opening-layer truth set, not the old `-v2` planning
   stack, once the reset is executed.
7. Governance updates must separate preserve, reconcile, rewrite, and historical-evidence actions
   instead of mixing them in one file.
8. No debt cleanup or architecture proposals may be smuggled into governance reset units.

## 12. Risks and guardrails

Key risks:

- Confirmed: pointer-layer replacement can accidentally erase historical lineage if done too early.
- Confirmed: old terminology can leak back in through downstream family artifacts.
- High-confidence: delivery pressure could try to reuse the old `-v2` stack before the new canon is
  live.
- High-confidence: onboarding truth can be re-dirtied if it is reconciled before taxonomy and
  tenancy canon are stabilized.

Guardrails:

1. Do not de-authorize old opening documents before the new opening layer exists.
2. Do not rewrite already aligned contracts or family-level anchors in the reset phase.
3. Do not mix governance alignment with debt cleanup or architecture change.
4. Require every new governance document to declare whether it is live authority, derived summary,
   or historical evidence.
5. Use the canon matrix as a mandatory review checklist before any future governance edit.

## 13. Proposed execution sequence

1. Approve this governance alignment plan.
2. Open one bounded governance reset authorization record.
3. Define the exact replacement opening-layer canon and pointer set.
4. Create the missing opening-layer truth and pointer documents from that approved canon package.
5. Rebind Layer 0 live authority to the new opening layer only after the minimum viable
  replacement canon is complete.
6. Classify the old opening and planning stack into preserved historical evidence versus candidate
   downstream reconciliation inputs.
7. Run family-by-family downstream reconciliation in the order defined above.
8. Only after that reconciliation frame is stable, regenerate delivery-planning truth.

## 14. Completion state for this pass

This plan does not execute the reset.

It only defines the alignment strategy, authority matrix, sequence, and guardrails needed for the
next phase.
