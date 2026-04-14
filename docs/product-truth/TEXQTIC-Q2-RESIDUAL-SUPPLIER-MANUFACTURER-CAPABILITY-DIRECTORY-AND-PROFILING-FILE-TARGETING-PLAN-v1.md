# TEXQTIC-Q2-RESIDUAL-SUPPLIER-MANUFACTURER-CAPABILITY-DIRECTORY-AND-PROFILING-FILE-TARGETING-PLAN-v1

**Status:** PLANNING-ONLY  
**Scope:** Residual Q2 file-targeting only  
**Date:** 2026-04-14  
**Predecessor:** `docs/product-truth/TEXQTIC-Q2-DISCOVERY-SAFE-DIRECTORY-AND-TAXONOMY-TRANSFER-BUNDLE-FILE-TARGETING-PLAN-v1.md`

## 1. Objective and Inherited Closure State

This pass exists only because the exact same-file Q2 row trio in
`docs/strategy/TENANT_DASHBOARD_MATRIX.md` is now closed while the broader Q2 lineage is still
open due to the separate residual item `Supplier / Manufacturer Capability Directory / Profiling`.

Inherited controlling truth for this pass:

- the exact same-file Q2 row trio in `docs/strategy/TENANT_DASHBOARD_MATRIX.md` remains closed and
  is not reopened here
- Aggregator may consume only a discovery-safe subset and must not imply taxonomy ownership
  transfer
- this pass is file-targeting and allowlist planning only

## 2. Exact Evidence Trace

| File | Evidence class | Observed label or data | Residual-Q2 relevance | Targeting conclusion |
| --- | --- | --- | --- | --- |
| `docs/product-truth/TEXQTIC-FINAL-FAMILY-INVENTORY-PLACEMENT-NORMALIZATION-v1.md` | exact current product-truth row | `Supplier / Manufacturer Capability Directory / Profiling` placed under `Aggregator Directory Discovery and Intent-Handoff Workspace` | exact current residual item owner | IN SCOPE: exact current owner row |
| `docs/product-truth/TEXQTIC-SURFACE-TO-NORMALIZED-LABEL-APPLICATION-MAP-v1.md` | normalization map | maps `Supplier / Manufacturer Capability Directory / Profiling` to `Discovery-safe counterparty profile directory` in the family-placement row | confirms normalized target and owner file | SUPPORTING LINEAGE ONLY: not an implementation owner |
| `docs/product-truth/TEXQTIC-VISIBLE-LABEL-IMPLEMENTATION-PREPARATION-QUEUE-v1.md` | grouped queue lineage | broader Q2 bundle still includes `Supplier / Manufacturer Capability Directory / Profiling` alongside the now-closed strategy-matrix trio | proves broader Q2 lineage is still open | SUPPORTING LINEAGE ONLY: not an implementation owner |
| `docs/product-truth/TEXQTIC-TAXONOMY-PROPAGATION-AND-DISCOVERY-SAFE-EXPOSURE-MAP-v1.md` | analytical anti-drift guard | states the placement under Aggregator is discovery-surface only and does not move taxonomy administration or execution ownership out of B2B | preserves non-owning interpretation boundary | ANALYTICAL SUPPORT ONLY: not an implementation owner by default |
| `docs/product-truth/TEXQTIC-Q2-DISCOVERY-SAFE-DIRECTORY-AND-TAXONOMY-TRANSFER-BUNDLE-FILE-TARGETING-PLAN-v1.md` | predecessor targeting artifact | separated the exact closed matrix row trio from this residual item | inherited closure boundary | CONTROLLING PREDECESSOR: confirms this pass must not reopen the closed trio |

## 3. Residual Q2 Targeting Findings

Exact current owner file set for the residual Q2 item:

- one product-truth file only: `docs/product-truth/TEXQTIC-FINAL-FAMILY-INVENTORY-PLACEMENT-NORMALIZATION-v1.md`

Classification result:

- the residual item is currently planning-facing product-truth, not a live runtime surface
- no second live-facing descriptive owner was found for the exact residual label
- the queue, application map, and taxonomy-propagation files preserve lineage or anti-drift rules,
  but they do not currently own the implementation target text

Adjacency boundary result:

- the residual item is row-local inside one family-placement inventory table
- the exact row label, its placement classification, its parent placement
  `Aggregator Directory Discovery and Intent-Handoff Workspace`, and its rationale text form the
  required same-row context for any later implementation pass
- adjacent inventory rows are not coupled rename targets by default

## 4. Canonical Residual-Q2 File-Targeting Plan

Primary targeting conclusion:

- the exact current residual-Q2 owner remains one product-truth source surface only:
  `docs/product-truth/TEXQTIC-FINAL-FAMILY-INVENTORY-PLACEMENT-NORMALIZATION-v1.md`

Smallest safe future implementation allowlist if this residual remains local:

- `docs/product-truth/TEXQTIC-FINAL-FAMILY-INVENTORY-PLACEMENT-NORMALIZATION-v1.md`

Required future same-row target:

- `Supplier / Manufacturer Capability Directory / Profiling`

Required same-row context that must remain in scope during a later residual-Q2 correction pass, but
does not require automatic rename by default:

- the row classification `EXPLICIT_SUBFAMILY_INSIDE_EXISTING_PARENT`
- the row parent placement `Aggregator Directory Discovery and Intent-Handoff Workspace`
- the row rationale explaining why the lane currently sits under Aggregator

## 5. Local-Bundle Versus Widening Rules

This residual-Q2 item remains local when all of the following stay true:

- the future write remains planning-only or descriptive-only
- the future write corrects only the exact residual row inside
  `docs/product-truth/TEXQTIC-FINAL-FAMILY-INVENTORY-PLACEMENT-NORMALIZATION-v1.md`
- the future write keeps the row's parent placement and rationale in scope as row-local context
- the future write does not reopen the already closed exact same-file Q2 row trio in
  `docs/strategy/TENANT_DASHBOARD_MATRIX.md`

This residual-Q2 item widens beyond its safe local boundary only if any of the following is
attempted:

- reopening the closed exact same-file Q2 row trio in `docs/strategy/TENANT_DASHBOARD_MATRIX.md`
- treating the queue or application map as a second implementation owner that must be edited in the
  same pass
- attempting to normalize the analytical anti-drift wording in
  `docs/product-truth/TEXQTIC-TAXONOMY-PROPAGATION-AND-DISCOVERY-SAFE-EXPOSURE-MAP-v1.md` in the
  same pass
- reopening runtime shells, routes, or other non-product-truth surfaces by implication

## 6. Allowed and Disallowed Targeting Interpretations

Allowed:

- treating `docs/product-truth/TEXQTIC-FINAL-FAMILY-INVENTORY-PLACEMENT-NORMALIZATION-v1.md` as
  the exact current owner of the residual item
- treating the residual as one row-local family-placement correction rather than a second
  multi-surface rewrite
- treating the application map, queue, and taxonomy-propagation map as supporting lineage or guard
  surfaces rather than current implementation owners

Disallowed:

- treating every residual mention across product-truth files as proof of multi-file implementation
  ownership
- claiming whole-line Q2 closure beyond the exact same-file strategy-matrix trio plus this residual
  row without a later residual-specific close
- reopening Q1 or the already closed exact same-file Q2 row trio by implication

## 7. Blockers and Edge Cases

- no blocker prevents this residual item from remaining a one-file-local planning-facing correction
- one edge case remains inside the future implementation pass: the parent placement line can stay
  as preserved row context by default, but if a later row-local rewrite cannot make the residual
  explicitly discovery-safe and non-owning without touching the rationale text, that rationale edit
  must remain inside the same row only
- one scope edge case remains from queue lineage: the broader Q2 queue entry still groups this row
  with the now-closed strategy-matrix trio, so any later residual close must speak precisely about
  what is closing and what was already closed earlier

## 8. Immediate Next Step

Open a future implementation-facing residual-Q2 pass limited to
`docs/product-truth/TEXQTIC-FINAL-FAMILY-INVENTORY-PLACEMENT-NORMALIZATION-v1.md` and correct only
the exact row `Supplier / Manufacturer Capability Directory / Profiling` to explicit discovery-safe
and non-owning wording.
