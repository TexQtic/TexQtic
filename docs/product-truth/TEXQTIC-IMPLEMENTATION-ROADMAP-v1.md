# TEXQTIC-IMPLEMENTATION-ROADMAP-v1

## Purpose

This document is the dependency-ordered implementation roadmap for TexQtic.

It translates the verified gap reality recorded in [docs/product-truth/TEXQTIC-GAP-REGISTER-v1.md](docs/product-truth/TEXQTIC-GAP-REGISTER-v1.md) into an execution-first sequence that prioritizes launch enterability, two-sided exchange, and credible execution loops before secondary control polish or truth-retirement work.

This roadmap is not a governance tracker, not a doctrine wave plan, and not a broad strategy narrative.

It is a bounded execution roadmap derived from current repo truth.

## Roadmap North Star

TexQtic becomes launch-credible when a tenant can:

1. enter the system cleanly
2. complete a real two-sided buyer-supplier exchange loop
3. progress that loop into visible trade execution
4. operate with minimum viable admin casework and mode-specific completeness
5. retire misleading planning authority only after replacement truth exists

## Sequencing Principles

The roadmap follows these rules:

1. enterability before scale
2. two-sided exchange before secondary optimization
3. execution loops before control-plane polish
4. truth cleanup only after replacement authority exists
5. repo reality overrides stale doctrine
6. sequence by dependency chain, not governance preference

## Inherited Gap Taxonomy

This roadmap inherits the gap categorization model exactly as defined in [docs/product-truth/TEXQTIC-GAP-REGISTER-v1.md](docs/product-truth/TEXQTIC-GAP-REGISTER-v1.md):

- `ENTERABILITY`
- `TWO_SIDED_EXCHANGE`
- `EXECUTION_LOOP`
- `OPS_CASEWORK`
- `MODE_COMPLETENESS`
- `PRODUCT_SCOPE_TRUTH`
- `MISLEADING_SURFACE`

The roadmap also inherits the gap status taxonomy from the gap register without modification.

## Dependency-First Roadmap Logic

The roadmap order is driven by actual product dependency:

- A broken entry path blocks everything behind it.
- A one-sided exchange surface cannot become a real marketplace loop.
- A surfaced RFQ response loop without continuity fixes still stops before execution, even when backend domain slices already exist.
- EXCHANGE-CORE-LOOP-001 is not directly executable from current repo truth and requires MICRO_FIXES_THEN_EXECUTION.
- Operational casework hardening matters after execution loops exist, not before.
- Mode completeness matters after the shared core is credible.
- Truth cleanup happens last because replacement authority must already exist.

The ordered wave list below is the sequencing source for this roadmap.
Completed waves remain listed in sequence as baseline context, and this roadmap does not use a
separate live-status table for current priority.

## Roadmap Summary Table

| Wave | Name | Primary Goal | Included Gap IDs | Dependency Reason |
|---|---|---|---|---|
| Wave 1 | Enterability | Make tenant entry and first-owner onboarding materially usable | `GAP-ENTRY-001`, `GAP-ENTRY-002` | Completed via `ONBOARDING-ENTRY-001` and `ONBOARDING-ENTRY-002` |
| Wave 2 | Exchange Enablers and Supplier Operability | Repair authority and product gaps that prevent the exchange core from becoming a usable two-sided path | `GAP-EXCHANGE-001`, `GAP-EXCHANGE-003`, `GAP-EXCHANGE-004`, `GAP-EXCHANGE-005`, `GAP-EXCHANGE-006` | Completed via `EXCHANGE-CORE-LOOP-001` |
| Wave 3 | Exchange Core Continuity Execution | Convert the exchange path into credible execution through RFQ linkage, trade integrity, escrow attachment, and settlement validation | `GAP-EXCHANGE-002`, `GAP-EXCHANGE-007`, `GAP-EXCHANGE-008`, `GAP-EXCHANGE-009`, `GAP-EXCHANGE-010`, `GAP-EXCHANGE-011`, `GAP-EXCHANGE-012`, `GAP-EXCHANGE-013` | Completed via `EXCHANGE-CORE-LOOP-001` |
| Wave 4 | Operational Control Hardening | Strengthen live admin casework around financial, compliance, and dispute operations | `GAP-OPS-001`, `GAP-OPS-002`, `GAP-OPS-003` | Completed via `OPS-CASEWORK-001` |
| Wave 5 | Mode Completeness | Remove major mode-specific incompleteness and narrow-scope product truth gaps | `GAP-MODE-001`, `GAP-SCOPE-001`, `GAP-SCOPE-002` | Completed via `WL-COMPLETE-001` |
| Wave 6 | Truth Cleanup / Misleading Surface Retirement | Retire misleading authority surfaces after replacement product-truth docs exist | `GAP-TRUTH-001`, `GAP-TRUTH-002` | Completed via `TRUTH-CLEANUP-001` |
| Wave 7 | Tenant Truth Cleanup / Shared Tenant Authority Reconciliation | Reconcile remaining tenant-facing misleading authority after shared runtime truth exists | `GAP-TRUTH-003`, `GAP-TRUTH-004`, `GAP-TRUTH-005` | Opened via `TENANT-TRUTH-CLEANUP-001` after Wave 6 confirmed the prior truth-cleanup scope was control-plane only |
| Wave 8 | White-Label Blueprint Runtime Residue | Retire the separately proven live WL blueprint runtime authority residue without widening into broad WL cleanup | `GAP-TRUTH-006` | Opened via `WL-BLUEPRINT-RUNTIME-RESIDUE-001` after runtime investigation proved the residue is outside `TENANT-TRUTH-CLEANUP-001` |
| Wave 9 | White-Label Admin Entry Discoverability | Restore reliable owner/admin entry into the real WL admin runtime without widening into broad WL redesign | `GAP-MODE-002` | Opened via `WL-ADMIN-ENTRY-DISCOVERABILITY-001` after WL-only admin-entry investigation proved the issue is separate from enterprise admin and separate from the blueprint-residue path |

## Wave 1 — Enterability

- Execution Status: `COMPLETED`
- Completed Units: `ONBOARDING-ENTRY-001`, `ONBOARDING-ENTRY-002`

### Objective

Make first-use entry materially usable for a newly provisioned tenant and first owner.

### Included Gaps

- `GAP-ENTRY-001`
- `GAP-ENTRY-002`

### Rationale

TexQtic could not be launch-ready while entry into a trade-capable tenant context remained broken. Wave 1 is now completed through the bounded closures of `ONBOARDING-ENTRY-001` and `ONBOARDING-ENTRY-002`, which together established truthful business-verification activation continuity and a coherent canonical first-owner activation handoff.

### Exit Criteria

- Business verification in onboarding is materially operational rather than placeholder-only. Completed via `ONBOARDING-ENTRY-001`.
- Tenant provisioning reaches a coherent first-owner activation handoff.
- First-owner onboarding no longer depends on broken intermediate steps or manual detours that undermine launch usability.

### Dependencies

- None. This is the first dependency layer.

### Risks If Deferred

- Deferred risk for this wave is closed by the completed enterability chain under `ONBOARDING-ENTRY-001` and `ONBOARDING-ENTRY-002`.

## Wave 2 — Two-Sided Exchange Activation

- Execution Status: `COMPLETED`
- Completed Via: `EXCHANGE-CORE-LOOP-001`
- Implementation Units: `EXC-ENABLER-001`, `EXC-ENABLER-002`

### Objective

Complete-state closure of the first real two-sided exchange loop between buyer and supplier.

### Included Gaps

- `GAP-EXCHANGE-001`
- `GAP-EXCHANGE-003`
- `GAP-EXCHANGE-004`
- `GAP-EXCHANGE-005`
- `GAP-EXCHANGE-006`

### Rationale (Completed State)

Exchange enablers and supplier operability were completed through `EXCHANGE-CORE-LOOP-001`, establishing the two-sided exchange layer required before execution continuity.

### Exit Criteria

- Supplier RFQ inbox is materially surfaced.
- Supplier RFQ detail is materially surfaced.
- Supplier response actions are materially surfaced.
- RFQ authority and RFQ create/read contract truth are aligned.
- Supplier response semantics are sufficient to support downstream continuity planning.
- Buyer-side visibility reflects supplier response outcomes in a usable product loop.

### Dependencies

- Wave 1 must be complete enough that new tenants can actually reach exchange surfaces.
- Downstream execution continuity is now closed under `EXCHANGE-CORE-LOOP-001`.

### Risks If Deferred

- Deferred risk for this wave is closed by completed execution under `EXCHANGE-CORE-LOOP-001`.

## Wave 3 — Trade Execution Loop

- Execution Status: `COMPLETED`
- Completed Via: `EXCHANGE-CORE-LOOP-001`
- Implementation Units: `EXC-ENABLER-003`, `EXC-ENABLER-004`, `EXC-ENABLER-005`, `EXC-ENABLER-006`

### Objective

Complete-state closure of visible tenant-side execution across the exchange path.

### Included Gaps

- `GAP-EXCHANGE-002`
- `GAP-EXCHANGE-007`
- `GAP-EXCHANGE-008`
- `GAP-EXCHANGE-009`
- `GAP-EXCHANGE-010`
- `GAP-EXCHANGE-011`
- `GAP-EXCHANGE-012`
- `GAP-EXCHANGE-013`

### Rationale (Completed State)

Exchange execution continuity was completed through `EXCHANGE-CORE-LOOP-001`, establishing RFQ linkage, trade integrity, escrow continuity, and settlement validation as one credible execution chain.

### Exit Criteria

- RFQ response can materially advance into trade creation through an explicit continuity path.
- Tenant trade creation is materially surfaced with safe org derivation and trustworthy creation integrity.
- Tenant trade lifecycle actions are materially surfaced.
- Trade progression is visible in the tenant product surface instead of remaining backend-only.
- Trade can materially attach or hand off into escrow.
- Settlement preview and settlement execution validate real trade-to-escrow continuity.
- Execution continuity between exchange, trade state, escrow, and settlement is product-credible.

### Dependencies

- Wave 2 completed first under `EXCHANGE-CORE-LOOP-001`.
- Execution Status for the wave is `COMPLETED`.

### Risks If Deferred

- Deferred risk for this wave is closed by completed execution under `EXCHANGE-CORE-LOOP-001`.

## Wave 4 — Operational Control Hardening

- Execution Status: `COMPLETED`
- Completed Via: `OPS-CASEWORK-001`

### Objective

Harden live admin casework around the execution loop so financial, compliance, and dispute operations are materially usable.

### Included Gaps

- `GAP-OPS-001`
- `GAP-OPS-002`
- `GAP-OPS-003`

### Rationale

Operational control hardening is now completed through `OPS-CASEWORK-001`, which established materially usable finance, compliance, and dispute casework on canonical durable records after the core execution loop became credible.

### Exit Criteria

- Finance operations are materially stronger than thin event-backed authority views.
- Compliance operations are materially stronger than thin event-backed authority views.
- Dispute operations are materially stronger than thin event-backed authority views.
- Admin casework can be treated as operational control rather than shallow oversight.

### Dependencies

- Waves 1 through 3 established the real product loop that `OPS-CASEWORK-001` hardened.

### Risks If Deferred

- Deferred risk for this wave is closed by completed execution under `OPS-CASEWORK-001`.

## Wave 5 — Mode Completeness

- Execution Status: `COMPLETED`
- Completed Via: `WL-COMPLETE-001`

### Objective

Close the most important mode-specific incompleteness and narrow-scope truth gaps after the shared core loop is working.

### Included Gaps

- `GAP-MODE-001`
- `GAP-SCOPE-001`
- `GAP-SCOPE-002`

### Rationale

White-label completeness and narrower-than-marketed product scope did not precede enterability, two-sided exchange, or execution-loop credibility. The wave is now completed through `WL-COMPLETE-001`, which closed the bounded WL operating-mode loop by proving real WL-qualified entry, real operator/admin continuity, removal of closure-critical generic stub dependence, truth-bounded DPP/passport scope, non-overcredited AI governance, restored neighboring Orders/DPP coherence, and live runtime soundness for Collections and Domains.

### Exit Criteria

- White-label admin can be treated as consistently real for promised operator use.
- DPP/passport scope is either materially broader or clearly no longer overstated in execution planning.
- AI governance is no longer treated as a mixed real/static surface.

### Dependencies

- Waves 1 through 4 must have already established a credible shared execution and operations base.

### Risks If Deferred

- Deferred risk for this wave is closed by completed execution under `WL-COMPLETE-001`.

## Wave 6 — Truth Cleanup / Misleading Surface Retirement

- Execution Status: `COMPLETED`
- Completed Via: `TRUTH-CLEANUP-001`

### Objective

Retire misleading authority-bearing and fake-complete surfaces only after the replacement truth set exists and is in use.

### Included Gaps

- `GAP-TRUTH-001`
- `GAP-TRUTH-002`

### Rationale

Truth cleanup was necessary, but it could only happen after replacement authority existed. The wave is now completed through `TRUTH-CLEANUP-001`, which verified that the treated API-doc, architecture-blueprint, taxonomy, and current-state surfaces no longer function as competing active authority and that the replacement product-truth stack is the sole active authority for this bounded scope.

### Exit Criteria

- Replacement truth documents exist and are internally consistent.
- Misleading API-doc and architecture-blueprint surfaces are no longer able to function as planning truth.
- Truth cleanup does not remove history or create authority ambiguity.

### Dependencies

- Waves 1 through 5 complete enough that product-truth replacement authority is stable.
- Stale-authority retirement plan exists before any retirement pass begins.

### Risks If Deferred

- Deferred risk for this wave is closed by completed execution under `TRUTH-CLEANUP-001`.

## Wave 7 — Tenant Truth Cleanup / Shared Tenant Authority Reconciliation

- Execution Status: `OPEN`
- Opened Via: `TENANT-TRUTH-CLEANUP-001`

### Objective

Retire the remaining tenant-facing misleading authority only after bounded runtime truth for the
enterprise and white-label tenant surfaces is already materially present.

### Included Gaps

- `GAP-TRUTH-003`
- `GAP-TRUTH-004`
- `GAP-TRUTH-005`

### Rationale

The initial tenant follow-up investigation confirmed that `TRUTH-CLEANUP-001` was correctly
bounded to the control-plane authority cleanup only and that the remaining then-open misleading
authority was a shared tenant doc-authority drift problem. Later runtime investigation proved one
separate white-label blueprint runtime residue outside this document-only boundary, so Wave 7
remains limited to the tenant dashboard matrix, the cross-surface control/tenant/WL dashboard
matrix, and the tenant-facing authority sections of the current-state document only.

### Exit Criteria

- Tenant-facing authority docs describe current enterprise and white-label runtime truth without
	stale stub-era claims.
- Cross-surface dashboard authority no longer understates or misstates the bounded WL and tenant
	surfaces already present in repo reality.
- Current-state tenant authority is reconciled without widening into runtime implementation,
	architecture rewrite, or broader stale-doc cleanup.

### Dependencies

- Waves 1 through 6 complete enough that the shared tenant runtime truth already exists.
- `TRUTH-CLEANUP-001` remains closed on its bounded control-plane-only basis.

### Risks If Deferred

- Tenant-facing planning and status authority will continue to misstate enterprise and white-label
	repo truth even though the bounded runtime closure chain already changed the product reality.

## Wave 8 — White-Label Blueprint Runtime Residue

- Execution Status: `OPEN`
- Opened Via: `WL-BLUEPRINT-RUNTIME-RESIDUE-001`

### Objective

Retire the separately proven live non-control-plane blueprint authority residue that remains
tenant-facing in current white-label runtime.

### Included Gaps

- `GAP-TRUTH-006`

### Rationale

Later runtime investigation proved that the white-label tenant runtime still exposes a live
`Blueprint` control in `App.tsx` and a tenant-facing `Platform Architecture Overview` overlay from
`components/ArchitectureDiagram.tsx`. That residue is not part of the Wave 7 document-authority
cleanup boundary and therefore requires one separate bounded follow-up wave rather than widening
`TENANT-TRUTH-CLEANUP-001` into runtime work.

### Exit Criteria

- White-label tenant runtime no longer exposes a live non-control-plane blueprint authority surface.
- The bounded runtime residue is resolved without widening into broad white-label shell or
	architecture redesign.
- Wave 7 document-authority cleanup remains separate from this runtime-residue follow-up.

### Dependencies

- Waves 1 through 7 remain separate and preserve their already-decided boundaries.
- `TENANT-TRUTH-CLEANUP-001` remains a document-authority unit only.

### Risks If Deferred

- White-label runtime will continue to expose a tenant-facing architecture-authority residue even
	after the bounded doc-authority cleanup chain is complete.

## Wave 9 — White-Label Admin Entry Discoverability

- Execution Status: `OPEN`
- Opened Via: `WL-ADMIN-ENTRY-DISCOVERABILITY-001`

### Objective

Restore reliable, discoverable WL owner/admin entry into the real `WL_ADMIN` runtime without
widening into broad white-label UX, shell, or runtime redesign.

### Included Gaps

- `GAP-MODE-002`

### Rationale

The latest WL-only admin-entry investigation confirmed that enterprise admin remains intentionally
integrated and does not justify a shared redesign unit, while repo truth still shows a real
`WL_ADMIN` runtime, login-time WL admin routing, and WL admin-only panels. The remaining problem
is therefore one separate bounded WL-only admin-entry and discoverability defect rather than a
tenant truth-cleanup problem or a blueprint-residue problem.

### Exit Criteria

- WL owner/admin users can discoverably and reliably reach `WL_ADMIN` on the bounded owner-facing
  path.
- The repair remains limited to the investigated WL admin-entry surfaces and does not widen into
  broad shell or white-label UX redesign.
- Wave 7 tenant doc-authority cleanup and Wave 8 blueprint-residue cleanup remain separate from
  this WL admin-entry follow-up.

### Dependencies

- Waves 1 through 8 remain separate and preserve their already-decided boundaries.
- `TENANT-TRUTH-CLEANUP-001` remains a document-authority unit only.
- `WL-BLUEPRINT-RUNTIME-RESIDUE-001` remains limited to the live blueprint-authority residue path.

### Risks If Deferred

- White-label owner/admin users will continue to have a real admin runtime in repo truth without a
  reliably discoverable bounded live entry path.

## Future Strategic Evaluation Note

- Status: `RECORDED`
- Timing: near TexQtic platform launch readiness
- Current posture: no enterprise-admin redesign or role-separation follow-up unit is justified now
- Evaluation scope: a later product-strategy review may consider whether a stronger
  operator/admin experience is desirable or required across both enterprise admin experience and
  white-label admin experience
- Delivery impact: this is a future strategic evaluation note only, not an active delivery unit,
  and it does not change the current execution sequence

## What Not To Do

To prevent fragmented feature execution, do not:

1. start with control-plane polish before fixing enterability and exchange activation
2. treat backend-only capability as launch-ready product completion
3. treat UI shells, static docs, or conceptual surfaces as delivery proof
4. split the two-sided exchange loop into disconnected sub-features that stop before trade execution
5. push white-label completeness ahead of the shared core execution loop
6. retire stale authority before replacement truth is complete and in use
7. reintroduce doctrine-led sequencing, governance-wave ordering, or broad strategic expansion into this roadmap

## Roadmap Use Rules

1. Use this roadmap together with [docs/product-truth/TEXQTIC-GAP-REGISTER-v1.md](docs/product-truth/TEXQTIC-GAP-REGISTER-v1.md).
2. Treat wave order as dependency order, not organizational preference.
3. If repo truth changes, update the wave content rather than creating a parallel roadmap.
4. If a new unit of work does not advance enterability, two-sided exchange, execution continuity, operations hardening, mode completeness, or truth cleanup, it does not belong in this roadmap by default.
