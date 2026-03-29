# TEXQTIC-IMPLEMENTATION-ROADMAP-v2

## Purpose

This document is the fresh implementation roadmap for the next TexQtic product-truth cycle.

It starts after the `-v1` roadmap completed and the fresh A1/A2/A3 cycle identified the next
bounded candidate families. The `-v1` roadmap remains historical and complete; this `-v2` roadmap
defines the next ordered wave structure without opening any unit by itself.

## Roadmap North Star

The next cycle prioritizes bounded product-facing continuity work that:

1. closes the strongest frontend/backend completeness gap first
2. preserves distinct candidate-family boundaries
3. keeps fake-complete operator surfaces separate from tenant commerce continuity
4. keeps scope-truth problems at design-gate posture until their target state is defined

## Governing Rules

1. The completed `-v1` roadmap remains historical and is not rewritten here.
2. A recorded recommendation does not itself open a unit.
3. Later-ready candidates remain distinct from the first recommended opening.
4. Design-gate candidates must not be promoted into implementation-ready work without a separate decision.
5. Recently closed WL / tenant-truth units remain closed and separate from this roadmap.

## v2 Roadmap Summary Table

| Wave | Name | Posture | Primary Goal | Included Candidate Family | Dependency Reason |
|---|---|---|---|---|---|
| Wave 1 | Tenant Catalog Management Continuity | `FIRST_RECOMMENDED_OPENING` | Close the clearest tenant-facing catalog lifecycle completeness gap | `TENANT-CATALOG-MANAGEMENT-CONTINUITY` | Strongest bounded frontend/backend completeness gap and safest next opening |
| Wave 2 | Control-Plane Tenant Operations Reality | `READY_LATER` | Make the tenant deep-dive operator surface truthful and materially usable | `CONTROL-PLANE-TENANT-OPERATIONS-REALITY` | Should remain separate from catalog continuity and follow the stronger commerce-operability gap |
| Wave 3 | B2C Storefront Continuity | `READY_LATER` | Make bounded B2C browse-entry affordances truthful and materially continuous | `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY` | Important public-facing continuity work, but narrower and less foundational than Wave 1 |
| Design Gate | Aggregator Operating Mode Scope Truth | `DESIGN_GATE_ONLY` | Define the exact bounded aggregator operating model before any implementation opening | `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE` | Current repo truth is insufficiently specific to support a lawful implementation opening |

## Historical Carry-Forward

The `-v1` roadmap is now the completed historical sequence for:

- enterability
- exchange-core enablement and execution continuity
- ops casework hardening
- WL bounded completeness
- truth-cleanup and tenant-truth reconciliation
- WL blueprint runtime residue closure
- WL admin entry discoverability closure

No `-v1` wave is reopened by this `-v2` roadmap.

## Wave 1 — Tenant Catalog Management Continuity

- Posture: `FIRST_RECOMMENDED_OPENING`
- Candidate Family: `TENANT-CATALOG-MANAGEMENT-CONTINUITY`

### Objective

Close the bounded tenant catalog lifecycle continuity gap so real tenant-owned product surfaces are
not materially create-and-read only when backend lifecycle support already exists.

### Why First

- This is the strongest evidence-backed frontend/backend completeness gap in the fresh cycle.
- It is safer to open than the control-plane truth gap and more foundational than the B2C
  storefront continuity gap.
- It does not require a product-scope redesign.

### Boundaries

- Do not widen this wave into marketplace redesign, merchandising, search, or broad B2C strategy.
- Do not absorb control-plane tenant operations reality.
- Do not treat this wave as a reopen of the completed WL completeness cycle.

## Wave 2 — Control-Plane Tenant Operations Reality

- Posture: `READY_LATER`
- Candidate Family: `CONTROL-PLANE-TENANT-OPERATIONS-REALITY`

### Objective

Make the bounded tenant deep-dive control-plane surface truthful and materially usable without
widening into general control-plane modernization.

### Why Later

- It is a valid ready candidate, but it is more supervisory than the first-order tenant catalog
  lifecycle continuity gap.
- It should follow rather than absorb Wave 1.

## Wave 3 — B2C Storefront Continuity

- Posture: `READY_LATER`
- Candidate Family: `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY`

### Objective

Repair the bounded B2C storefront entry and browse continuity gap where primary affordances still
overstate live behavior.

### Why Later

- It is real and launch-relevant, but narrower in platform impact than Wave 1.
- It should remain separate from tenant catalog lifecycle work.

## Design Gate — Aggregator Operating Mode Scope Truth

- Posture: `DESIGN_GATE_ONLY`
- Candidate Family: `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE`

### Objective

Define the exact bounded aggregator operating model that repo truth is expected to support before
any implementation-ready opening is considered.

### Explicit Rule

This candidate must remain design-gate only in the `-v2` cycle until the required bounded outcome
is explicitly defined. It must not be promoted into an implementation wave by implication.