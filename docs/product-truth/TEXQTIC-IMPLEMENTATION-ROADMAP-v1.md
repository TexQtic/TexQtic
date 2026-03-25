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
- A surfaced RFQ response loop without tenant-visible trade actions still stops before execution.
- Operational casework hardening matters after execution loops exist, not before.
- Mode completeness matters after the shared core is credible.
- Truth cleanup happens last because replacement authority must already exist.

## Roadmap Summary Table

| Wave | Name | Primary Goal | Included Gap IDs | Dependency Reason |
|---|---|---|---|---|
| Wave 1 | Enterability | Make tenant entry and first-owner onboarding materially usable | `GAP-ENTRY-001`, `GAP-ENTRY-002` | No downstream execution matters if tenants cannot reliably enter |
| Wave 2 | Two-Sided Exchange Activation | Complete the first real buyer-supplier exchange loop | `GAP-EXCHANGE-001` | The product must become two-sided before trade execution can be meaningfully surfaced |
| Wave 3 | Trade Execution Loop | Turn exchange into visible tenant-side execution continuity | `GAP-EXCHANGE-002` | Trade execution depends on a completed exchange loop |
| Wave 4 | Operational Control Hardening | Strengthen live admin casework around financial, compliance, and dispute operations | `GAP-OPS-001`, `GAP-OPS-002`, `GAP-OPS-003` | Operational control should harden around a working execution loop |
| Wave 5 | Mode Completeness | Remove major mode-specific incompleteness and narrow-scope product truth gaps | `GAP-MODE-001`, `GAP-SCOPE-001`, `GAP-SCOPE-002` | Mode polish and scope completion follow the core execution path |
| Wave 6 | Truth Cleanup / Misleading Surface Retirement | Retire misleading authority surfaces after replacement product-truth docs exist | `GAP-TRUTH-001`, `GAP-TRUTH-002` | Truth cleanup must not preempt replacement authority |

## Wave 1 — Enterability

### Objective

Make first-use entry materially usable for a newly provisioned tenant and first owner.

### Included Gaps

- `GAP-ENTRY-001`
- `GAP-ENTRY-002`

### Rationale

TexQtic cannot be launch-ready if the user cannot complete entry into a trade-capable tenant context. Enterability is the first dependency in the product chain.

### Exit Criteria

- Business verification in onboarding is materially operational rather than placeholder-only.
- Tenant provisioning reaches a coherent first-owner activation handoff.
- First-owner onboarding no longer depends on broken intermediate steps or manual detours that undermine launch usability.

### Dependencies

- None. This is the first dependency layer.

### Risks If Deferred

- Every downstream delivery remains launch-constrained.
- Exchange and execution improvements remain partially unusable because entry into the product remains broken.
- Launch readiness continues to be overstated.

## Wave 2 — Two-Sided Exchange Activation

### Objective

Complete the first real two-sided exchange loop between buyer and supplier.

### Included Gaps

- `GAP-EXCHANGE-001`

### Rationale

TexQtic already has buyer-side RFQ initiation and backend support for supplier responses. The missing dependency is the supplier-facing product surface that turns the repo into an actual two-sided exchange environment.

### Exit Criteria

- Supplier RFQ inbox is materially surfaced.
- Supplier RFQ detail is materially surfaced.
- Supplier response actions are materially surfaced.
- Buyer-side visibility reflects supplier response outcomes in a usable product loop.

### Dependencies

- Wave 1 must be complete enough that new tenants can actually reach exchange surfaces.

### Risks If Deferred

- TexQtic remains one-sided despite real backend exchange capability.
- Marketplace and exchange claims remain only partially true.
- Trade execution cannot become product-credible because the upstream loop is still incomplete.

## Wave 3 — Trade Execution Loop

### Objective

Convert the now-complete two-sided exchange loop into visible tenant-side trade execution.

### Included Gaps

- `GAP-EXCHANGE-002`

### Rationale

The backend already contains meaningful trade lifecycle capability. Once the product supports two-sided RFQ exchange, the next dependency is tenant-visible trade creation and lifecycle progression so the loop can move from interaction into execution.

### Exit Criteria

- Tenant trade creation is materially surfaced.
- Tenant trade lifecycle actions are materially surfaced.
- Trade progression is visible in the tenant product surface instead of remaining backend-only.
- Execution continuity between exchange, trade state, and downstream escrow/settlement path is product-credible.

### Dependencies

- Wave 2 must complete the two-sided exchange loop first.

### Risks If Deferred

- Exchange will stop at response handling rather than execution.
- TexQtic remains workflow-rich but execution-thin in the tenant experience.
- Backend capability continues to overstate product readiness.

## Wave 4 — Operational Control Hardening

### Objective

Harden live admin casework around the execution loop so financial, compliance, and dispute operations are materially usable.

### Included Gaps

- `GAP-OPS-001`
- `GAP-OPS-002`
- `GAP-OPS-003`

### Rationale

Once entry, exchange, and trade execution are credible, the next dependency is operational control around real exceptions and decisions. These surfaces are already wired, but they remain thinner than their labels imply.

### Exit Criteria

- Finance operations are materially stronger than thin event-backed authority views.
- Compliance operations are materially stronger than thin event-backed authority views.
- Dispute operations are materially stronger than thin event-backed authority views.
- Admin casework can be treated as operational control rather than shallow oversight.

### Dependencies

- Waves 1 through 3 must establish a real product loop worth controlling.

### Risks If Deferred

- Operational teams inherit weak control surfaces around real execution.
- Launch risk rises as the product moves into live exceptions without durable casework.
- Control-plane depth will lag behind product-visible execution.

## Wave 5 — Mode Completeness

### Objective

Close the most important mode-specific incompleteness and narrow-scope truth gaps after the shared core loop is working.

### Included Gaps

- `GAP-MODE-001`
- `GAP-SCOPE-001`
- `GAP-SCOPE-002`

### Rationale

White-label completeness and narrower-than-marketed product scope matter, but they do not precede enterability, two-sided exchange, or execution-loop credibility. They are the next layer of truthful product completion after the core is working.

### Exit Criteria

- White-label admin can be treated as consistently real for promised operator use.
- DPP/passport scope is either materially broader or clearly no longer overstated in execution planning.
- AI governance is no longer treated as a mixed real/static surface.

### Dependencies

- Waves 1 through 4 must have already established a credible shared execution and operations base.

### Risks If Deferred

- Mode-specific launch claims remain uneven.
- White-label remains partially credible rather than consistently credible.
- Scope-truth confusion continues around DPP and AI governance.

## Wave 6 — Truth Cleanup / Misleading Surface Retirement

### Objective

Retire misleading authority-bearing and fake-complete surfaces only after the replacement truth set exists and is in use.

### Included Gaps

- `GAP-TRUTH-001`
- `GAP-TRUTH-002`

### Rationale

Truth cleanup is necessary, but it must happen after replacement authority exists. The product-truth doc set is the replacement base; misleading surfaces can be retired only after that base is complete and internally consistent.

### Exit Criteria

- Replacement truth documents exist and are internally consistent.
- Misleading API-doc and architecture-blueprint surfaces are no longer able to function as planning truth.
- Truth cleanup does not remove history or create authority ambiguity.

### Dependencies

- Waves 1 through 5 complete enough that product-truth replacement authority is stable.
- Stale-authority retirement plan exists before any retirement pass begins.

### Risks If Deferred

- Misleading authority survives alongside the new truth set.
- Future execution can still be misrouted by fake-complete or stack-misaligned surfaces.
- Planning truth remains split between replacement docs and stale surfaces.

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
