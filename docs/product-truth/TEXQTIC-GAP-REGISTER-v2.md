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

## Cycle Summary

The A1/A2/A3 cycle established four fresh candidate families for the next planning cycle:

1. `TENANT-CATALOG-MANAGEMENT-CONTINUITY`
2. `CONTROL-PLANE-TENANT-OPERATIONS-REALITY`
3. `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY`
4. `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE`

The cycle also established these postures:

- `TENANT-CATALOG-MANAGEMENT-CONTINUITY` — `ACTIVE_DELIVERY` after lawful opening as the sole current product-facing unit
- `CONTROL-PLANE-TENANT-OPERATIONS-REALITY` — `READY_FOR_OPENING`
- `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY` — `READY_FOR_OPENING`
- `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE` — `NEEDS_DESIGN_GATE`

## Candidate Posture Taxonomy

| Candidate Posture | Meaning |
|---|---|
| `ACTIVE_DELIVERY` | The single bounded product-facing unit currently open in the v2 cycle |
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
| `GAP-V2-001` | Tenant catalog management continuity is materially incomplete | `ACTIVE_DELIVERY` | `EXCHANGE` | `MODE_COMPLETENESS` | Leaves real tenant catalog ownership create-and-read only after onboarding even though backend lifecycle support exists | Tenant-facing catalog services and surfaced product flows expose fetch, search, create, and RFQ continuity, while backend PATCH and DELETE item routes already exist without materially surfaced edit/delete continuity | Tenant catalog item lifecycle becomes materially usable across bounded operator-owned product surfaces without widening into catalog redesign, merchandising, search, or B2C strategy | `services/catalogService.ts` | Sole current open product-facing unit; remains separate from B2C storefront continuity and from control-plane tenant operations reality |
| `GAP-V2-002` | Control-plane tenant operations surface is fake-complete | `LATER_READY_CANDIDATE` | `OS` | `OPS_CASEWORK` | Overstates operator readiness around tenant lifecycle, onboarding outcome review, billing, and risk administration | The Tenant Details surface exposes one real activation action alongside unwired tenant lifecycle controls, UI-only billing / risk affordances, and under-construction tab depth | The bounded tenant deep-dive becomes truthful and materially usable for tenant lifecycle and onboarding-review operations without widening into general control-plane modernization | `components/ControlPlane/TenantDetails.tsx` | Separate from the catalog continuity family and from any broad admin/platform completeness reopen |
| `GAP-V2-003` | B2C storefront continuity is partially decorative | `LATER_READY_CANDIDATE` | `OS` | `MODE_COMPLETENESS` | Leaves a public-facing B2C storefront shell with browse / search affordances that overstate real continuity | The B2C shell exposes search, `Shop Now`, and `See All` affordances, but those primary controls remain unwired or presentation-only in the bounded reviewed surface | The bounded B2C storefront path becomes truthful and materially continuous for browse-oriented entry without widening into broad B2C strategy or catalog management redesign | `App.tsx` | Separate from tenant catalog management continuity because the affected behavior is storefront continuity rather than item lifecycle management |
| `GAP-V2-004` | Aggregator operating mode remains a scope-truth problem | `NEEDS_DESIGN_GATE` | `OS` | `PRODUCT_SCOPE_TRUTH` | Keeps a named tenant mode in repo truth materially thinner than its declared operating role | Aggregator runtime remains largely promotional and discovery-oriented while the broader operating model remains under-defined and partially stubbed | Product truth must first define the exact bounded aggregator operating model before any implementation-ready unit is opened | `App.tsx` | Must remain design-gate only; do not treat as implementation-ready and do not merge into a broad enterprise or mode redesign |

## Opening Posture Summary

### Current Open Unit

- `GAP-V2-001` / `TENANT-CATALOG-MANAGEMENT-CONTINUITY`

### Later Ready Candidates

- `GAP-V2-002` / `CONTROL-PLANE-TENANT-OPERATIONS-REALITY`
- `GAP-V2-003` / `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY`

### Design-Gate Only Candidate

- `GAP-V2-004` / `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE`

## Explicit Non-Merge / Non-Reopen Rules

- Do not merge the distinct v2 candidates into one broad “commerce improvement” or “platform completeness” program.
- Do not reopen `WL-BLUEPRINT-RUNTIME-RESIDUE-001`, `TENANT-TRUTH-CLEANUP-001`, or `WL-ADMIN-ENTRY-DISCOVERABILITY-001` through this v2 stack.
- Do not treat `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE` as implementation-ready.
- Do not reopen enterprise redesign through any v2 candidate unless later repo truth explicitly justifies it.

## Relationship To v1

The `-v1` stack remains the completed historical record of the prior planning cycle. This `-v2`
register starts a fresh next-cycle basis after the v1 sequence was completed and exhausted.