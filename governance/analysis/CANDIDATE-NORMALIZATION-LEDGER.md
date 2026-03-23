# CANDIDATE-NORMALIZATION-LEDGER

Date: 2026-03-23
Type: GOVERNANCE ANALYSIS LEDGER
Status: ACTIVE / CANONICAL
Authority: `GOVERNANCE-SENTINEL-AND-DELIVERY-OS-001`
Supersedes: `governance/analysis/STEP2-PENDING-CANDIDATE-LEDGER.md`
Scope: Permanent canonical ledger for bounded candidate normalization, disposition recording,
delivery classification, negative-evidence recording, and broad-label retirement. No
implementation authorized. No Layer 0 status transition by implication.

## Canonical Role

This ledger is the standing normalization layer for TexQtic candidate governance.

It is the canonical place to record:

- exact bounded candidate naming
- candidate kind taxonomy
- validation disposition and delivery classification
- negative evidence that blocks over-broad carry-forward
- broad-label retirement results
- links to validation artifacts and execution-log references

This ledger does not itself open units, close units, or authorize implementation.

## Governance Role Relative To Other Surfaces

### Relative to Layer 0

Layer 0 remains authoritative for currently authorized non-terminal work only.

This ledger feeds Layer 0 indirectly:

- `ACTIVE_DELIVERY` items must already be open in Layer 0 or Layer 1
- `OPENING_QUEUE` and `DECISION_QUEUE` items remain non-authorizing until a separate governance
  decision or opening changes Layer 0
- this ledger must not be used to bypass `NEXT-ACTION.md`

### Relative to execution-log linkage

Each normalized row must carry the most recent validation artifact reference and the most recent
execution-log or governance unit reference that justifies the disposition.

### Relative to candidate validation artifacts

Per-candidate analysis artifacts prove repo truth. This ledger records the canonical normalized
result from those artifacts.

### Relative to carry-forward summaries

Carry-forward summaries may summarize this ledger, but may not replace it, widen it, or revive a
retired broad label without new exact validation evidence.

## Delivery-Steering Doctrine

Hold-first / operator-stall posture is replaced at doctrine level by delivery-steering queue
governance.

Approved delivery classes:

- `ACTIVE_DELIVERY` — exactly authorized OPEN implementation-ready work. May appear in Layer 0.
- `OPENING_QUEUE` — exact bounded candidate already validated as opening-worthy or readiness-worthy;
  not yet open; requires separate Opening step.
- `DECISION_QUEUE` — exact bounded candidate still requires a decision/disposition before any
  Opening may be considered.
- `DESIGN_GATE_QUEUE` — broad stream held behind explicit design/product/security gate; not opening-
  eligible until that gate is resolved.
- `BLOCKED_QUEUE` — work or candidate path cannot lawfully progress until explicit blocker evidence
  is resolved.
- `DEFERRED_QUEUE` — valid but intentionally unscheduled by governance/product posture.

Delivery class steers sequencing only. It does not replace unit status, collapse TECS phases, or
authorize work by implication.

## Candidate Taxonomy

Every normalized candidate must use one exact bounded candidate kind.

Approved candidate kinds:

- `runtime_route_failure`
- `state_rehydration_gap`
- `auth_or_shell_transition_gap`
- `resource_fallback_gap`
- `ui_affordance_gap`
- `identity_truth_gap`
- `applicability_gap`
- `persistence_or_logging_gap`
- `role_or_boundary_gap`
- `discovery_note_only`

Broad umbrellas such as `auth/session instability`, `tenant-runtime-other`, `media behavior`, or
equivalent catch-all carry-forward labels are not acceptable when an exact bounded label is
available.

## Canonical Disposition / Status Taxonomy

Approved normalization outcomes:

- `ACTIVE_DELIVERY_CONFIRMED`
- `OPENING_CANDIDATE`
- `READY_FOR_OPENING`
- `DECISION_REQUIRED`
- `SPLIT_REQUIRED`
- `BLOCKED_PENDING_PRIOR_DECISION`
- `BLOCKED_PENDING_EVIDENCE`
- `DEFERRED`
- `ALREADY_GOVERNED_ELSEWHERE`
- `ALREADY_RESOLVED`
- `STALE_BROAD_LABEL`
- `SUPERSEDED_BY_NARROWER_CANDIDATE`
- `INSUFFICIENT_EVIDENCE`
- `INFORMATIONAL_ONLY`

These are candidate-normalization outcomes only. They are not interchangeable with Layer 0 unit
status vocabulary.

## Rich Schema Requirements

Every normalization row must record all of the following fields.

| Field | Requirement |
| --- | --- |
| Exact Candidate Name | Required. Role-based, exact, bounded label only. |
| Candidate Kind | Required. One value from the approved candidate taxonomy. |
| Original Framing | Required. Preserve the prior broad or ambiguous framing for audit. |
| Exact Surface / Boundary | Required. Name the exact route, UI surface, service boundary, or governance boundary. |
| Validation Artifact | Required. Exact artifact path or unit that proved current repo truth. |
| Positive Evidence Summary | Required. Exact present evidence, not generalized prose. |
| Negative Evidence Summary | Required. Exact evidence that disproves over-broad carry-forward or blocks promotion. |
| Prior Governance Exclusions | Required where present. Record exclusions that remain valid negative evidence. |
| Disposition | Required. One value from the canonical disposition taxonomy. |
| Delivery Class | Required. One value from the delivery-steering taxonomy. |
| Broad Label Retirement | Required. `active`, `retired`, `superseded`, or `not_applicable`. |
| Next Lawful Step | Required. `none`, `decision`, `opening`, `implementation`, `blocked`, or exact bounded note. |
| Confidence | Required. `LOW`, `MEDIUM`, or `HIGH`. |
| Last Validated | Required. Date plus unit or artifact identifier. |

## Broad-Label Retirement Rule

Once exact bounded normalization proves that a broad umbrella label is stale, over-broad, already
resolved, or better represented by one or more exact narrower candidates:

- the broad label must be marked `retired` or `superseded`
- it must not remain an active sequencing label
- it must not be reused later unless a new validation proves a genuinely broader unresolved family
  now exists

## Negative-Evidence Doctrine

Negative evidence is affirmative governance evidence, not silence.

Valid negative evidence includes:

- current repo truth proving the allegedly missing capability or path is already present
- governance history proving the exact broad family was already split, resolved, or bounded away
- prior explicit exclusions that remain applicable to the currently reviewed surface
- mirror-check results showing that the proposed broad label cannot be supported across the claimed
  surfaces

Absence of new evidence is not enough by itself. The disproving evidence must be named.

## Capability-Present Is Not Defect-Evidenced Doctrine

The mere presence of a route, control, helper, panel, comment, TODO, or deferred note is not by
itself defect evidence.

Promotion requires one of the following:

- exact failing behavior
- exact non-application on an exposed path
- exact contradiction between governance claim and current repo truth
- exact missing prerequisite on a currently exercised causal chain

## Prior Governance Exclusions As Valid Negative Evidence

If a prior governed unit explicitly excluded a surface and current repo truth does not add new
contrary evidence, that exclusion remains valid negative evidence against broad relabeling.

Prior exclusions may therefore block:

- candidate merging
- broad-label revival
- over-generalized carry-forward summaries

## Secret-Safe Discovery Doctrine

Repo-truth sweeps must remain secret-safe.

Required secret-safe sweep rules:

- search only allowlisted discovery surfaces for the bounded question at hand
- do not search or print env files, connection strings, secret-bearing config, generated outputs,
  backups, copied-secret surfaces, or log dumps
- record discovery scope explicitly in the validation artifact
- summarize secret-bearing presence only as redacted existence when relevant
- do not widen discovery to opportunistic repo-wide searches when a bounded sweep is enough

## Governance Sentinel Relationship

Governance Sentinel uses this ledger as the canonical input for:

- taxonomy/schema linting
- broad-label retirement enforcement
- negative-evidence presence checks
- delivery-class presence checks for candidate-bearing artifacts

## Canonical Normalization Ledger

| Exact Candidate Name | Candidate Kind | Original Framing | Exact Surface / Boundary | Validation Artifact | Positive Evidence Summary | Negative Evidence Summary | Prior Governance Exclusions | Disposition | Delivery Class | Broad Label Retirement | Next Lawful Step | Confidence | Last Validated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| impersonation stop-path / cleanup | `discovery_note_only` | `impersonation stop-path / cleanup` | control-plane impersonation stop path, client exit cleanup, stale-state clearing | `governance/analysis/IMPERSONATION-STOP-PATH-REPO-TRUTH-VALIDATION.md` | Current repo truth shows implemented server stop path, implemented client exit cleanup, and fail-closed stale-state clearing. | No exact narrower failing stop-cleanup mode is evidenced in current repo truth. | Prior governance already separated session rehydration and identity-truth from stop-cleanup. | `INSUFFICIENT_EVIDENCE` | `DECISION_QUEUE` | `retired` | `none` | `HIGH` | `2026-03-23 · STEP2-PENDING-CANDIDATE-LEDGER-SYNC-001` |
| tenant eligibility | `role_or_boundary_gap` | `tenant eligibility` | control-plane impersonation start flow member-resolution / empty-membership handling | `governance/analysis/TENANT-ELIGIBILITY-REPO-TRUTH-VALIDATION.md` | Current repo truth ties the observed message to a local control-plane impersonation preflight when no memberships are returned. | Evidence does not support a broader tenant-eligibility family outside the exact impersonation-member-resolution surface. | Prior impersonation and tenant-runtime units did not authorize a broader tenant-eligibility defect family. | `SUPERSEDED_BY_NARROWER_CANDIDATE` | `DECISION_QUEUE` | `retired` | `none` | `HIGH` | `2026-03-23 · PENDING-LIST-SYNC-TENANT-ELIGIBILITY-001` |
| auth/session instability | `auth_or_shell_transition_gap` | `auth/session instability` | previously mixed umbrella across auth persistence, shell entry, and session restoration | `governance/analysis/AUTH-SESSION-INSTABILITY-REPO-TRUTH-VALIDATION.md` | Current repo truth shows explicit stale-token protections, control-plane restoration safeguards, impersonation restoration logic, and tenant hydration safeguards. | Closed narrower units already resolved the evidenced failures for control-plane auth-shell transition and impersonation session rehydration. | Prior governed exclusions explicitly denied broad auth redesign and broader tenant-shell correctness from those slices. | `STALE_BROAD_LABEL` | `DECISION_QUEUE` | `retired` | `none` | `HIGH` | `2026-03-23 · PENDING-LIST-SYNC-AUTH-SESSION-INSTABILITY-001` |
| tenant-runtime-other | `runtime_route_failure` | `tenant-runtime-other` | previously mixed tenant runtime umbrella beyond exact separated runtime/image/auth surfaces | `governance/analysis/TENANT-RUNTIME-OTHER-REPO-TRUTH-VALIDATION.md` | Current tenant code is organized around explicit per-surface loading, error, empty, retry, and degraded states. | Repo and governance truth do not preserve a broader unresolved shared tenant-runtime family beyond already separated exact findings. | Prior runtime, image, and auth/session exclusions remain valid and separate. | `STALE_BROAD_LABEL` | `DECISION_QUEUE` | `retired` | `none` | `HIGH` | `2026-03-23 · PENDING-LIST-SYNC-TENANT-RUNTIME-OTHER-001` |
| B2C New Arrivals placeholder-image fallback surface | `resource_fallback_gap` | `other image surfaces beyond App.tsx:1522` | exact B2C `New Arrivals` placeholder-image fallback at `App.tsx:1698` | `governance/analysis/IMAGE-SURFACE-REPO-TRUTH-VALIDATION.md` | Current repo search shows one remaining exact product-code remote placeholder fallback using `https://via.placeholder.com/400x500` on the B2C `New Arrivals` branch. | No second unresolved product/runtime placeholder source was found in the bounded scan. | Prior exact `App.tsx:1522` placeholder-image unit remains closed and bounded; WL image behavior remains separate. | `OPENING_CANDIDATE` | `OPENING_QUEUE` | `superseded` | `opening` | `HIGH` | `2026-03-23 · PENDING-LIST-SYNC-IMAGE-SURFACE-001` |
| media behavior | `resource_fallback_gap` | `media behavior` | previously broad media/CDN/platform umbrella beyond exact image surfaces | `governance/analysis/MEDIA-BEHAVIOR-REPO-TRUTH-VALIDATION.md` | The only meaningful unresolved remote placeholder behavior remaining in product code is already isolated to the exact B2C fallback surface. | Decorative remote media existence alone does not support a broader unresolved media family. | Prior exact image-surface exclusions and WL image closures remain valid negative evidence. | `STALE_BROAD_LABEL` | `DECISION_QUEUE` | `retired` | `none` | `HIGH` | `2026-03-23 · PENDING-LIST-SYNC-MEDIA-BEHAVIOR-001` |

## Maintenance Rule

Future normalization results must update this ledger instead of starting parallel canonical ledgers.
Per-candidate analysis artifacts may still be added as separate evidence documents, but this file
remains the canonical normalized view.