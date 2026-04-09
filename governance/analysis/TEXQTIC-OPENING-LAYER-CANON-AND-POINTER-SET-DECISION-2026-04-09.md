# TEXQTIC-OPENING-LAYER-CANON-AND-POINTER-SET-DECISION-2026-04-09

Status: bounded decision record only
Date: 2026-04-09
Scope: opening-layer canon and pointer-set definition only
Primary authorities:

1. TEXQTIC-REPO-TRUTH-BASELINE-AND-GOVERNANCE-RESET-OPTIONS-2026-04-09.md
2. TEXQTIC-GOVERNANCE-ALIGNMENT-PLAN-FROM-REPO-TRUTH-2026-04-09.md
3. TEXQTIC-LEGACY-TECH-DEBT-CLEANUP-PLAN-2026-04-09.md
4. TEXQTIC-ARCHITECTURE-EVOLUTION-AND-TRANSITION-PLAN-2026-04-09.md

## 1. Purpose

This decision record defines the exact replacement opening-layer canon and the exact replacement
pointer set that should become the new live top-level governance authority for TexQtic after a
later reset execution unit.

This artifact does not execute the reset.

This artifact does not rebind Layer 0.

This artifact does not reconcile downstream governance families.

## 2. Decision context

The controlling repo-truth and planning inputs already establish the following:

- Confirmed: repo truth is cleaner than the current opening/pointer/planning stack.
- Confirmed: the strongest current live technical authority sits in repo/runtime truth, aligned
  contracts, and aligned April family-level design anchors.
- Confirmed: the largest current governance distortion is concentrated in the opening layer,
  pointer layer, and live sequencing chain.
- Confirmed: current Layer 0 files still point live product sequencing and candidate truth toward
  `TEXQTIC-NEXT-DELIVERY-PLAN-v2.md` and `TEXQTIC-GAP-REGISTER-v2.md`.
- Confirmed: governance reset, debt cleanup, and architecture evolution must remain separate
  tracks.
- Recommended: the next bounded unit is to define the exact replacement opening-layer canon and
  pointer set before any reset execution begins.

The decision to make in this pass is therefore narrow:

- what exactly the future live opening layer should contain
- what exactly Layer 0 should point to after rebinding
- what must exist before rebinding is lawful

## 3. Why this decision must be made before reset execution

This decision must exist before any reset execution for four reasons:

1. Without a fixed minimum canon, Layer 0 could be rebound to an incomplete replacement set and
   recreate the same pointer ambiguity now being removed.
2. Without a fixed preserve-versus-de-authorize judgment, the reset could erase useful lineage or
   preserve stale authority chains by accident.
3. Without a fixed pointer-set model, Layer 0 could continue routing operators into the old `-v2`
   chain even after new opening documents exist.
4. Without a fixed non-mixing rule, governance reset could expand into debt cleanup or architecture
   work during the same execution unit.

## 4. Definition of opening-layer canon

For TexQtic, `opening-layer canon` means the smallest safe set of live top-level governance
artifacts that:

- summarize the current repo/runtime baseline
- fix the current taxonomy and authority hierarchy
- define what downstream artifacts are authoritative by topic
- define the current sequencing and next-cycle entry posture
- sit above downstream contracts, family-level design anchors, and delivery planning

Opening-layer canon is not:

- the full governance corpus
- a rewrite of aligned contracts
- a rewrite of aligned April family anchors
- downstream delivery planning
- debt-cleanup planning
- architecture-evolution planning

## 5. Definition of opening-layer pointer set

For TexQtic, `opening-layer pointer set` means the bounded set of live documents and pointer
responsibilities that route operators from Layer 0 control files into the correct opening-layer
truth and then into aligned downstream authority.

The pointer set must:

- make Layer 0 references explicit
- stop direct live dependence on the old `-v2` chain
- preserve discoverability of historical lineage
- prevent delivery-planning documents from self-upgrading into truth authority

## 6. Supporting definitions used by this decision

### 6.1 Opening-layer truth

Opening-layer truth is the live top-level summary and authority layer that interprets current repo
truth for future governance movement.

### 6.2 Opening-layer sequencing authority

Opening-layer sequencing authority is the live top-level document that states the current next-cycle
entry posture and the lawful next bounded move. It is not the same as the full delivery-planning
stack.

### 6.3 Aligned downstream live authority

Aligned downstream live authority means preserved contracts and preserved family-level design
anchors that remain authoritative inside their topic boundaries after the opening layer is reset.

### 6.4 Historical evidence only

Historical evidence only means artifacts that remain valuable for lineage, audit trail, or prior
decision context but must no longer control live top-level opening authority.

## 7. Evaluation of the suggested replacement canon categories

The suggested category set was:

1. repo/runtime baseline
2. taxonomy truth baseline
3. governance authority / pointer layer
4. preserve-versus-recreate matrix
5. source-of-truth canon matrix
6. current sequencing / next-cycle entry document

Decision on that set:

- Sufficient in content: yes.
- Overly broad if treated as six separate permanent live documents: yes.
- Missing a necessary opening-layer artifact: no.
- Mixing opening-layer truth with downstream execution planning: not inherently, but it would do so
  if the preserve-versus-recreate matrix were turned into a permanent live authority document.

Refined judgment:

- the replacement opening-layer canon should remain four live artifacts, not six
- the source-of-truth canon matrix is necessary live opening-layer content, but it should live
  inside the governance authority / pointer-layer document rather than as a separate permanent file
- the preserve-versus-recreate matrix is necessary reset-control content, but it should remain in
  the decision/reset-control path rather than become a permanent live opening-layer authority file

This keeps the opening layer as small as possible without dropping necessary control content.

## 8. Exact proposed replacement opening-layer canon

The replacement opening-layer canon should consist of exactly four live artifacts.

| Proposed artifact | Purpose | Why it belongs in the opening layer | New / preserved / derived | Mandatory before Layer 0 rebinding |
| --- | --- | --- | --- | --- |
| `TEXQTIC-REPO-TRUTH-BASELINE-AND-GOVERNANCE-RESET-OPTIONS-2026-04-09.md` | Canonical repo/runtime baseline truth | It is the current top-level factual baseline for repo, runtime, taxonomy drift, and reset rationale | Preserved | Yes |
| `TEXQTIC-OPENING-LAYER-TAXONOMY-TRUTH-BASELINE-2026-04-09.md` | Fix runtime-family, tenancy, lifecycle, WL, and enterprise classification language | Opening-layer reset must remove taxonomy drift before pointer rebinding | New | Yes |
| `TEXQTIC-OPENING-LAYER-GOVERNANCE-AUTHORITY-AND-POINTER-LAYER-2026-04-09.md` | Define live authority hierarchy, pointer responsibilities, and embedded source-of-truth canon matrix | Operators need one root authority document that tells them what is live truth and what each Layer 0 file points to | New | Yes |
| `TEXQTIC-OPENING-LAYER-SEQUENCING-AND-NEXT-CYCLE-ENTRY-2026-04-09.md` | State current lawful sequencing posture and the current next bounded move | Layer 0 must point to a cleaned sequencing authority rather than the old `-v2` chain | New | Yes |

Decision on this decision record:

- this document is mandatory as the pre-reset authorization and shape decision
- this document is not part of the steady-state live opening-layer canon itself

## 9. Exact proposed replacement pointer set

The replacement pointer set should contain one new root pointer document plus rebound
responsibilities for the existing Layer 0 files.

| Pointer surface | Responsibility after rebinding | Must point to | Must stop pointing to as live authority |
| --- | --- | --- | --- |
| `TEXQTIC-OPENING-LAYER-GOVERNANCE-AUTHORITY-AND-POINTER-LAYER-2026-04-09.md` | Root pointer and authority map for the opening layer | Baseline truth, taxonomy baseline, sequencing document, preserved aligned downstream authorities, historical lineage locations | Any direct live top-level dependence on the old `-v2` chain |
| `governance/control/NEXT-ACTION.md` | Current authorized next move pointer | New sequencing and next-cycle entry document, plus the governance authority / pointer-layer document | `TEXQTIC-NEXT-DELIVERY-PLAN-v2.md`, `TEXQTIC-GAP-REGISTER-v2.md`, `TEXQTIC-IMPLEMENTATION-ROADMAP-v2.md` as live opening authority |
| `governance/control/OPEN-SET.md` | Current non-terminal posture summary | Governance authority / pointer-layer document and new sequencing authority in operating notes | Direct live sequencing/candidate truth references to the old `-v2` chain |
| `governance/control/SNAPSHOT.md` | Restore-grade current authority snapshot | Baseline truth, taxonomy baseline, governance authority / pointer-layer document, and sequencing authority | Direct live opening authority references to the old `-v2` chain |
| `governance/control/BLOCKED.md` | Blocker and design-gate register | Governance authority / pointer-layer document when blocker interpretation affects current next move | Any implicit authority claim over opening-layer truth or sequencing beyond blocker posture |

Pointer rule:

- Layer 0 files remain operational control surfaces
- the new governance authority / pointer-layer document becomes the root map they rely on

## 10. Minimum viable replacement canon

The minimum viable replacement canon required before any Layer 0 rebinding is:

1. the preserved repo/runtime baseline report
2. the new taxonomy-truth baseline
3. the new governance authority / pointer-layer document, including the embedded source-of-truth
   canon matrix
4. the new sequencing and next-cycle entry document

Mandatory clarification:

- the preserve-versus-recreate matrix is not required as a separate permanent live opening-layer
  document
- its controlling reset judgment is carried by this decision record and then by the later reset
  execution unit

## 11. Preserve / rebind / de-authorize / historical matrix

| Artifact family or document class | Classification | Decision |
| --- | --- | --- |
| Repo-truth baseline report | Preserve as live authority | Remains the top factual opening-layer baseline |
| New taxonomy-truth baseline | Create and preserve as live authority | Mandatory new opening-layer artifact |
| New governance authority / pointer-layer document | Create and preserve as live authority | Mandatory new opening-layer artifact |
| New sequencing and next-cycle entry document | Create and preserve as live authority | Mandatory new opening-layer artifact |
| Layer 0 `OPEN-SET.md` | Rebind pointer to new opening layer | Remains live control surface, not root truth source |
| Layer 0 `NEXT-ACTION.md` | Rebind pointer to new opening layer | Remains live control surface, not root truth source |
| Layer 0 `SNAPSHOT.md` | Rebind pointer to new opening layer | Remains restore-grade control surface |
| Layer 0 `BLOCKED.md` | Rebind interpretation path where needed | Remains blocker register only |
| `shared/contracts/rls-policy.md` | Preserve as aligned live authority | Remains downstream authority for tenancy isolation truth |
| `shared/contracts/ARCHITECTURE-GOVERNANCE.md` | Preserve as aligned live authority | Remains downstream authority for architecture governance truth |
| Sampled OpenAPI contracts | Preserve as aligned live authority | Remain downstream contract authority subject to later parity sweep |
| April family anchors: B2B, B2C, WL, Aggregator, enterprise-boundary, control-plane, identity/workspace | Preserve as aligned live authority | Remain downstream family-level authority |
| `TEXQTIC-GAP-REGISTER-v2.md` | De-authorize as live opening-layer authority | Retain as historical evidence and later reconciliation input |
| `TEXQTIC-NEXT-DELIVERY-PLAN-v2.md` | De-authorize as live opening-layer authority | Retain as historical evidence and later reconciliation input |
| `TEXQTIC-IMPLEMENTATION-ROADMAP-v2.md` | De-authorize as live opening-layer authority | Retain as derived historical context only |
| Existing historical execution logs and closed unit files | Retain as historical evidence only | Keep lineage, remove live opening authority role |
| `server/README.md` | De-authorize as live authority | Unsafe for current DB/RLS/Prisma posture |
| Root `README.md` | Retain as reference only | Not live opening-layer authority |
| `TEXQTIC-ONBOARDING-SYSTEM-DESIGN-v1.md` | Reconcile later from new baseline | Not safe as opening-layer authority, still useful downstream |
| Three-track planning package | Retain as planning authority and execution input | Supports reset, debt, and architecture decisions but is not steady-state opening-layer canon |

## 12. Layer 0 rebinding preconditions

Layer 0 files may be rebound only when all of the following are true:

1. This decision record is approved and frozen as the reset-shape authority.
2. The preserved repo/runtime baseline remains the acknowledged top factual baseline.
3. The new taxonomy-truth baseline exists.
4. The new governance authority / pointer-layer document exists and includes the source-of-truth
   canon matrix.
5. The new sequencing and next-cycle entry document exists.
6. The new governance authority / pointer-layer document explicitly maps what `OPEN-SET`,
   `NEXT-ACTION`, `SNAPSHOT`, and `BLOCKED` should reference.
7. Historical lineage to the old `-v2` chain remains discoverable before any de-authorization
   writeback occurs.
8. The rebinding unit explicitly states that it is governance reset only and excludes debt cleanup,
   contract remediation, schema convergence, and architecture change.

## 13. Execution sequence after decision approval

After this decision record is approved, the opening-layer reset should proceed in the following
bounded order:

1. Freeze this decision record as the reset-shape authority.
2. Create the new taxonomy-truth baseline.
3. Create the new governance authority / pointer-layer document with the embedded source-of-truth
   canon matrix.
4. Create the new sequencing and next-cycle entry document.
5. Validate the minimum viable replacement canon against Section 10 of this decision.
6. Rebind `NEXT-ACTION.md`, `OPEN-SET.md`, `SNAPSHOT.md`, and `BLOCKED.md` in a bounded Layer 0
   reset execution unit.
7. De-authorize the old `-v2` chain as live opening-layer authority only after the new canon is
   live and lineage remains explicit.
8. Stop the reset unit there.

Explicit boundary:

- downstream reconciliation begins only after the reset execution unit finishes
- debt cleanup remains separate
- architecture evolution remains separate

## 14. Risks and guardrails

### 14.1 Risks

- Confirmed: historical lineage could be erased too early if old pointers are removed before the
  new canon is complete.
- Confirmed: stale authority chains could survive if Layer 0 keeps pointing at the old `-v2`
  documents after new opening artifacts exist.
- High-confidence: delivery-planning artifacts could self-upgrade into truth authority again if the
  new sequencing document is not clearly scoped.
- High-confidence: taxonomy drift could return through enterprise-as-runtime or white-label-as-mode
  wording if the taxonomy baseline is omitted.
- High-confidence: track-mixing could occur if the reset unit absorbs debt or architecture work.

### 14.2 Guardrails

1. Do not rebind Layer 0 before the minimum viable replacement canon exists.
2. Do not turn the preserve-versus-recreate matrix into a separate permanent live authority file.
3. Do not rewrite aligned contracts or aligned April family anchors during the reset.
4. Do not let `TEXQTIC-NEXT-DELIVERY-PLAN-v2.md`, `TEXQTIC-GAP-REGISTER-v2.md`, or
   `TEXQTIC-IMPLEMENTATION-ROADMAP-v2.md` retain live opening-layer authority after rebinding.
5. Do not mix governance reset with debt cleanup, contract-remediation execution, schema
   convergence, or architecture hardening.
6. Require the taxonomy baseline to state explicitly that:
   - runtime-family truth is B2B workspace, B2C storefront, WL storefront with optional WL admin
     overlay, Aggregator workspace, and control plane
   - `org_id` / `app.org_id` is the constitutional tenant boundary
   - enterprise is B2B depth or billing-plan language, not runtime-family language
   - white-label is overlay capability, not a separate parent commercial mode
7. Require the new sequencing document to state explicitly that it is a consumer of opening-layer
   authority, not the source of taxonomy or contract truth.

## 15. Decision quality check

Decision on the chosen replacement canon:

- Minimal enough: yes, because it limits steady-state live opening authority to four artifacts.
- Complete enough: yes, because baseline, taxonomy, authority hierarchy, and sequencing are all
  covered.
- Drift-resistant enough: yes, because it removes direct Layer 0 dependence on the old `-v2`
  chain and embeds a live source-of-truth matrix in one root authority document.
- Simple enough for future operators to follow: yes, because Layer 0 gets one root authority map,
  one sequencing surface, and explicit preserved downstream authorities.

## 16. Final decision and rationale

Final decision:

- The replacement opening-layer canon will be a four-artifact live authority set built from the
  preserved repo/runtime baseline plus three new opening-layer documents.
- The replacement pointer set will be the new root governance authority / pointer-layer document
  plus rebound Layer 0 responsibilities in `OPEN-SET.md`, `NEXT-ACTION.md`, `SNAPSHOT.md`, and
  `BLOCKED.md`.
- The minimum viable replacement canon for Layer 0 rebinding is fixed by Section 10 of this
  decision.
- The old `-v2` planning stack will no longer serve as live opening-layer authority after the
  later rebinding unit completes.

Rationale:

This is the smallest safe opening-layer model that still resolves authority sprawl, pointer
ambiguity, taxonomy drift, and sequencing drift without expanding the reset into broader
reconciliation, debt cleanup, or architecture work.
