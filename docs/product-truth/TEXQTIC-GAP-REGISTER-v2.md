# TEXQTIC-GAP-REGISTER-v2

## Purpose

This document is the fresh post-v1 product-truth gap register for TexQtic.

It records the externally generated A1 fresh repo gap discovery, A2 bounded candidate-family
synthesis, and A3 first-opening prioritization inside the repo so those findings are no longer
chat-only.

The completed `-v1` stack remains historical baseline for the prior cycle. This `-v2` register is
the fresh bounded planning base for the next product-facing opening decision.

## Authority Statement

Authority for this document is product-truth-first and repo-reality-first.

The governing assumptions for this register are:

- repo reality overrides stale planning language
- completed `-v1` outcomes remain historical and are not rewritten here
- distinct candidate families must remain distinct unless repo truth proves the same bounded reality
- a recommendation to open a candidate does not itself open a unit
- a design-gate candidate must not be treated as implementation-ready work

## Launch Overlay Note

This `-v2` gap register remains the active broad product-truth base for next-cycle candidate-family
truth.

For launch-specific posture, also see:

- `docs/product-truth/TEXQTIC-LAUNCH-READINESS-REQUIREMENTS-v1.md`
- `docs/product-truth/TEXQTIC-LAUNCH-SCOPE-DECISION-RECORD-v1.md`
- `docs/product-truth/TEXQTIC-LAUNCH-PLANNING-SPLIT-v1.md`

This document is not superseded wholesale; launch-specific interpretation is supplemented by those
launch-overlay artifacts. In particular, launch-specific scope/status for B2B, B2C, Aggregator,
platform-admin/control-center boundaries, and subscription/commercial packaging is further
constrained by the launch overlay.

## Cycle Summary

The A1/A2/A3 cycle established four fresh candidate families for the next planning cycle, and a
later bounded decision phase formalized one additional design-gate candidate family:

1. `TENANT-CATALOG-MANAGEMENT-CONTINUITY`
2. `CONTROL-PLANE-TENANT-OPERATIONS-REALITY`
3. `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY`
4. `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE`
5. `RFQ-NEGOTIATION-CONTINUITY`

The cycle also established these postures:

- `TENANT-CATALOG-MANAGEMENT-CONTINUITY` — `CLOSED` after lawful opening, bounded implementation, recorded `VERIFIED_COMPLETE` production verification, and bounded governance close
- `CONTROL-PLANE-TENANT-OPERATIONS-REALITY` — `LATER_READY_CANDIDATE`
- `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY` — `LATER_READY_CANDIDATE`
- `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE` — `NEEDS_DESIGN_GATE`
- `RFQ-NEGOTIATION-CONTINUITY` — `NEEDS_DESIGN_GATE`

## Candidate Posture Taxonomy

| Candidate Posture | Meaning |
|---|---|
| `ACTIVE_DELIVERY` | The single bounded product-facing unit currently open in the v2 cycle |
| `CLOSED` | Candidate family has been completed and closed in bounded form; it is no longer open/active |
| `READY_FOR_OPENING` | Bounded and evidence-backed candidate family that can lawfully support a fresh opening decision |
| `RECOMMENDED_NEXT_OPENING` | The single `READY_FOR_OPENING` candidate currently recommended to open first |
| `LATER_READY_CANDIDATE` | A still-bounded `READY_FOR_OPENING` candidate that should remain later in order |
| `NEEDS_DESIGN_GATE` | Candidate requires product-definition or scope-truth resolution before implementation opening |

## Gap Table Schema

Every v2 gap entry uses the following fields:

| Field | Meaning |
|---|---|
| `Gap ID` | Stable gap identifier for the v2 cycle |
| `Title` | Short bounded description |
| `Candidate Posture` | Current opening posture for the candidate |
| `Layer` | `OS`, `WORKFLOW`, or `EXCHANGE` |
| `Category` | Product-truth category label |
| `Launch Impact` | Why the candidate matters to launch credibility |
| `Current Reality` | Repo-evidenced summary of what exists now |
| `Required Outcome` | The minimally true closure target for a future unit |
| `Primary Surface` | File or surface that anchors the candidate |
| `Notes` | Boundaries, exclusions, and priority cautions |

## Fresh v2 Gap Entries

| Gap ID | Title | Candidate Posture | Layer | Category | Launch Impact | Current Reality | Required Outcome | Primary Surface | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `GAP-V2-001` | Tenant catalog management continuity closed in bounded form | `CLOSED` | `EXCHANGE` | `MODE_COMPLETENESS` | Bounded closure restores truthful tenant catalog ownership continuity without widening scope | Tenant-facing catalog services and surfaced product flows now expose materially usable update/delete continuity across the reviewed tenant-owned product surfaces; authoritative production verification confirmed Acme B2B visible Edit/Delete plus update/delete end to end while WL Products remained non-regressed | Closed in bounded form; no active bounded defect remains inside this unit | `services/catalogService.ts` | Former sole current open product-facing unit; now closed after bounded update/delete continuity completion and remains separate from B2C storefront continuity, control-plane tenant operations reality, the image-upload adjacent finding, and the RFQ / negotiation adjacent finding |
| `GAP-V2-002` | Control-plane tenant operations reality remains materially real but uneven | `LATER_READY_CANDIDATE` | `OS` | `OPS_CASEWORK` | Mixed-maturity tenant-ops wording can overstate thin tenant deep-dive, billing, and risk surfaces while obscuring materially real control-plane runtime | The control-plane family is materially real across tenant registry, disputes, finance supervision, feature flags, and bounded admin-registry runtime, while Tenant Details and adjacent operator surfaces still preserve preview-only billing / risk, minimal system-health, and other thin subareas | Broad family wording must narrow to the exact thin surfaces that remain bounded without collapsing materially real control-plane runtime into family-wide fake-complete framing or widening into general control-plane modernization | `components/ControlPlane/TenantDetails.tsx` | Separate from the catalog continuity family and from any broad admin/platform completeness reopen; preserves materially real control-plane runtime while keeping billing / risk / system-health and other thin areas explicitly bounded |
| `GAP-V2-003` | B2C storefront continuity remains bounded beyond the materially real browse-entry seam | `LATER_READY_CANDIDATE` | `OS` | `MODE_COMPLETENESS` | Stale broad wording can understate materially real browse-entry continuity while the broader downstream B2C family still remains incomplete | The reviewed non-WL B2C `HOME` path is materially real for browse-entry: search drives catalog query, `Shop Now` scrolls into the catalog section, `See All` / load-more behavior is tied to loaded product state and cursor availability, and the browse surface is catalog-backed; the broader downstream B2C family remains incomplete and must not be overclaimed | Governance wording must preserve that browse-entry continuity is real in bounded form while keeping broader B2C family continuity, collection depth, and downstream commerce completeness outside this candidate row | `App.tsx` | Separate from tenant catalog management continuity because the affected behavior is bounded browse-entry continuity rather than seller/admin item lifecycle management or whole-family B2C completion |
| `GAP-V2-004` | Aggregator operating mode remains a scope-truth problem | `NEEDS_DESIGN_GATE` | `OS` | `PRODUCT_SCOPE_TRUTH` | Keeps a named tenant mode with real bounded discovery runtime but an under-defined operating model that can still be overclaimed | Aggregator runtime now evidences a bounded but real curated discovery workspace with trust cues, AI insight, and loading/error behavior, while the broader operating model remains under-defined and must not be read as a full orchestrator mode | Product truth must keep Aggregator at design-gate posture and define the exact bounded operating model from this real discovery baseline before any implementation-ready unit is opened | `App.tsx` | Must remain design-gate only; do not treat as implementation-ready, do not widen discovery runtime into full intermediary/orchestrator claims, and do not merge into a broad enterprise or mode redesign |
| `GAP-V2-005` | RFQ / negotiation continuity is mode-incomplete and still pre-negotiation | `NEEDS_DESIGN_GATE` | `WORKFLOW` | `MODE_COMPLETENESS` | Overstates exchange continuity by exposing partial RFQ surfaces without a materially continuous RFQ-to-negotiation path across the reviewed white-label and enterprise runtime | White-label reviewed runtime exposes browse, product detail, add-to-cart, and a separate `Trades` shell entry but no evidenced RFQ affordance, while enterprise runtime exposes `Request Quote`, buyer RFQ detail/list, and supplier RFQ inbox/detail surfaces that are explicitly pre-negotiation and first-response-only. Backend trade-from-RFQ support exists, but the reviewed frontend does not evidence a materially continuous RFQ-to-negotiation bridge | Product truth must define the exact bounded cross-mode RFQ / negotiation continuity target before any implementation-ready opening is authorized | `App.tsx` | One bounded cross-mode candidate family with WL missing RFQ exposure and enterprise negotiation-depth limitations as sub-findings. Remains separate from tenant catalog management continuity, image-upload/media continuity, B2C storefront continuity, control-plane tenant operations reality, aggregator scope truth, and enterprise redesign |

## Opening Posture Summary

### Current Open Unit

- No current product-facing `ACTIVE_DELIVERY` unit is open in the `-v2` stack.
- `ENTERPRISE-RFQ-TO-NEGOTIATION-BRIDGE-CONTINUITY` is now `CLOSED` after bounded implementation
	and bounded live production verification established that the reviewed enterprise responded-RFQ
	path now truthfully bridges into the existing trade / negotiation continuity.
- `WL-RFQ-EXPOSURE-CONTINUITY` is now `CLOSED` after bounded implementation and successful
	bounded live production verification established that the reviewed WL storefront/product-detail
	path now exposes RFQ initiation, supports the minimum lawful buyer RFQ follow-up continuity, and
	no longer stops before RFQ begins.
- No active bounded defect remains inside `WL-RFQ-EXPOSURE-CONTINUITY` itself.
- `TENANT-CATALOG-MANAGEMENT-CONTINUITY` remains `CLOSED` after bounded implementation,
	recorded `VERIFIED_COMPLETE` production verification, and bounded governance close.
- The broader `RFQ-NEGOTIATION-CONTINUITY` family remains preserved in `NEEDS_DESIGN_GATE`
	posture for the family-level cross-mode continuity problem even though its two recommended split
	units are now closed separately.
- Any future product-facing opening still requires a fresh bounded product decision against the
	preserved `-v2` stack.
- No exact bounded next candidate is currently selected in controlling repo truth after
	`SUBSCRIPTION-FRONTEND-CANONICAL-VOCABULARY-ALIGNMENT` closed.
- The strongest preserved later-ready contenders remain `GAP-V2-002` /
	`CONTROL-PLANE-TENANT-OPERATIONS-REALITY` and `GAP-V2-003` /
	`MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY`, but each remains a broad family remainder rather
	than one exact bounded next unit.
- Within `GAP-V2-002` / `CONTROL-PLANE-TENANT-OPERATIONS-REALITY`, current repo truth now also
  records the exact bounded child candidate
  `CONTROL-PLANE-ONBOARDING-OUTCOME-HANDLING-HARDENING` for later lawful-opening evaluation only;
  this does not change the current global no-selection posture.
- Subscription / commercial packaging retains no currently selected second bounded slice in the
	active `-v2` stack after closure of the first bounded subscription unit.

### Adjacent Finding Pending Unit Assignment

- Observed during `TENANT-CATALOG-MANAGEMENT-CONTINUITY` verification: the Add Item flow appears
	to lack materially usable product image upload capability.
- Current posture: investigation required before unit assignment.
- Reason: repo truth currently shows URL-based image reference support rather than end-to-end file
	upload/storage continuity, so this may indicate a separate catalog media continuity gap and must
	not be auto-merged into the current update/delete continuity unit without later bounded
	repo-truth confirmation.

- Observed during bounded repo-truth investigation after `TENANT-CATALOG-MANAGEMENT-CONTINUITY`
	verification: RFQ / negotiation continuity and mode parity appeared materially incomplete across
	white-label and enterprise tenant runtime.
- Current posture: this finding has now been formalized as `GAP-V2-005` /
	`RFQ-NEGOTIATION-CONTINUITY` in `NEEDS_DESIGN_GATE` posture rather than remaining unassigned.
- Reason: current repo truth supports one bounded cross-mode candidate family, but the exact
	implementation-ready target state still requires design clarification before a lawful delivery
	opening.

- Observed during `WL-RFQ-EXPOSURE-CONTINUITY` production verification: WL Add to Cart returned a
	live production 500-backed error.
- Current posture: investigation required before unit assignment.
- Reason: repo truth shows a distinct WL storefront/cart runtime path through the cart service and
	tenant cart endpoints, so this may indicate a separate storefront/cart continuity defect and must
	not be auto-merged into `WL-RFQ-EXPOSURE-CONTINUITY` without later bounded repo-truth
	confirmation.

- Observed during `WL-RFQ-EXPOSURE-CONTINUITY` production verification: the RFQ follow-up detail
	surface appeared static / not scrollable.
- Current posture: investigation required before unit assignment.
- Reason: repo truth shows this follow-up surface renders inside a fixed RFQ dialog overlay whose
	container currently lacks explicit viewport-height and overflow scrolling controls, so this may
	indicate a separate RFQ-detail UI continuity / usability defect and must not be auto-merged into
	`WL-RFQ-EXPOSURE-CONTINUITY` without later bounded repo-truth confirmation.

### Later Ready Candidates

- `GAP-V2-002` / `CONTROL-PLANE-TENANT-OPERATIONS-REALITY` remains the preserved later-ready family
  remainder; exact bounded child candidate now recorded inside this family:
  `CONTROL-PLANE-ONBOARDING-OUTCOME-HANDLING-HARDENING`.
- `GAP-V2-003` / `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY`

### Launch-Specific Interpretation Note

- For launch-specific posture, `GAP-V2-003` / `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY` is not
	an optional later-mode if B2C remains inside launch scope; the launch overlay locks B2C in scope
	while preserving its normalization-required posture.
- For launch-specific posture, `GAP-V2-004` / `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE` remains
	locked in launch scope but design-gated first; shell/routing presence must not be read as
	implementation-design readiness.
- For launch-specific posture, `GAP-V2-002` / `CONTROL-PLANE-TENANT-OPERATIONS-REALITY` should be
	read alongside the bounded platform-admin launch boundary recorded in the launch overlay, not as
	a broad admin redesign stream.
- Subscription / commercial packaging is still not rebuilt here as a broad standalone `-v2`
	family program, and no second bounded subscription slice is currently selected in the active
	`-v2` stack after closure of the first bounded subscription unit.

### Live Split-Unit Separation Rule

- Closed `WL-RFQ-EXPOSURE-CONTINUITY` does not collapse the broader `RFQ-NEGOTIATION-CONTINUITY`
	family into implementation-complete posture.
- `ENTERPRISE-RFQ-TO-NEGOTIATION-BRIDGE-CONTINUITY` remains separate from the closed WL split unit,
	from adjacent findings, and from neighboring candidate families even though it is now opened.
- The closed WL unit is not image-upload/media continuity, not the separately recorded WL Add to
	Cart 500 finding, not the separately recorded RFQ-detail scrollability finding, not search or
	merchandising work, not B2C storefront continuity, not control-plane tenant operations reality,
	not aggregator scope truth, and not enterprise redesign.

### Design-Gate Only Candidate

- `GAP-V2-004` / `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE`
- `GAP-V2-005` / `RFQ-NEGOTIATION-CONTINUITY`

## Explicit Non-Merge / Non-Reopen Rules

- Do not merge the distinct v2 candidates into one broad “commerce improvement” or “platform completeness” program.
- Do not reopen `WL-BLUEPRINT-RUNTIME-RESIDUE-001`, `TENANT-TRUTH-CLEANUP-001`, or `WL-ADMIN-ENTRY-DISCOVERABILITY-001` through this v2 stack.
- Do not treat `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE` as implementation-ready.
- Do not reopen enterprise redesign through any v2 candidate unless later repo truth explicitly justifies it.
- Do not read launch-specific lane assignment, normalization-first posture, or design-gate-first
	posture without also consulting the launch overlay documents listed above.
- Do not misread the bounded Subscription carry-forward clarification as a broad new `-v2` family
	program rewrite or as implementation authority by itself.

## Relationship To v1

The `-v1` stack remains the completed historical record of the prior planning cycle. This `-v2`
register starts a fresh next-cycle basis after the v1 sequence was completed and exhausted.