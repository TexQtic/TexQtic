# TEXQTIC-NEXT-DELIVERY-PLAN-v1

## Purpose

This document defines the next bounded delivery units for TexQtic.

It converts the dependency-first roadmap in [docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v1.md](docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v1.md) into execution units that close system capabilities rather than screens, panels, or isolated UI tasks.

This is not a governance wave tracker, not a doctrine sequence, and not a design wishlist.

It is the immediate delivery plan for closing the next real product loops in dependency order.

## Authority and Inputs

This plan is derived from:

- [docs/product-truth/TEXQTIC-GAP-REGISTER-v1.md](docs/product-truth/TEXQTIC-GAP-REGISTER-v1.md)
- [docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v1.md](docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v1.md)

The governing rules are:

1. dependency order is inherited from the roadmap and may not be reordered for convenience
2. a delivery unit is valid only if it closes a system capability loop
3. UI presence alone does not count as closure
4. backend presence alone does not count as closure
5. a unit must end in materially usable continuity, not a partial handoff to another hidden path

## System Loop Model

Every delivery unit in this plan must explicitly state which system loop it completes.

The allowed loop labels are:

- `onboarding loop`
- `exchange loop`
- `trade execution loop`
- `operations control loop`

For this plan, a loop is complete only when the user or operator can traverse the full intended path with product-visible continuity across the required surfaces.

## Delivery Unit Rules

1. Define units as capability closures, not component shipments.
2. Do not define units by panel, tab, route shell, or UI container.
3. Closure must describe the end-to-end path that becomes materially usable.
4. Each unit must identify the gap IDs it closes or materially advances.
5. Each unit must identify the repo surfaces that must change for the loop to become true.
6. If a unit stops at a screen boundary, it is not a valid unit.

## Immediate Delivery Sequence

The numbered order below is the sequencing source for this plan.
Completed units remain listed in sequence as baseline continuity; they are not separate live
`NEXT` posture.

After closure of `ONBOARDING-ENTRY-001`, `ONBOARDING-ENTRY-002`, `EXCHANGE-CORE-LOOP-001`,
`OPS-CASEWORK-001`, and `WL-COMPLETE-001`, the next remaining unit in dependency order is
`TRUTH-CLEANUP-001`.

| Order | Unit ID | Unit Name | System Loop Completed | Roadmap Alignment | Gap IDs | Why This Unit Exists |
|---|---|---|---|---|---|---|
| 1 | `ONBOARDING-ENTRY-001` | Business verification activation loop | `onboarding loop` | Wave 1, completed | `GAP-ENTRY-001` | Closed when onboarding truthfully progressed from verification submission through approved trade-capable activation continuity |
| 2 | `ONBOARDING-ENTRY-002` | Tenant provisioning to first-owner activation loop | `onboarding loop` | Wave 1, completed | `GAP-ENTRY-002` | Closed when tenant creation and canonical first-owner activation formed one coherent operating path |
| 3 | `EXCHANGE-CORE-LOOP-001` | RFQ-to-settlement execution continuity loop | `exchange loop`, `trade execution loop` | Waves 2 and 3, completed in roadmap order | `GAP-EXCHANGE-001`, `GAP-EXCHANGE-002` | Closed when RFQ flow continued through supplier response, trade creation, trade lifecycle, and escrow/settlement continuity |
| 4 | `OPS-CASEWORK-001` | Live execution casework control loop | `operations control loop` | Wave 4, completed | `GAP-OPS-001`, `GAP-OPS-002`, `GAP-OPS-003` | Closed when live execution gained materially usable finance, compliance, and dispute casework control |
| 5 | `WL-COMPLETE-001` | White-label operating mode completion loop | `onboarding loop`, `operations control loop` | Wave 5, completed | `GAP-MODE-001`, `GAP-SCOPE-001`, `GAP-SCOPE-002` | Closed when WL mode became coherently real and truthfully scoped on the bounded supported path |
| 6 | `TRUTH-CLEANUP-001` | Replacement-authority truth cleanup loop | `operations control loop` | Wave 6, next remaining unit | `GAP-TRUTH-001`, `GAP-TRUTH-002` | Misleading authority cannot remain active once the replacement truth set exists and governs execution |

## Unit 1 — ONBOARDING-ENTRY-001

- Status: `COMPLETED`
- Closed By: `ONBOARDING-ENTRY-001-SLICE-1..5`
- Commit References: `33ae6d8`, `d280c68`, `f541383`, `e02407c`, `e1ef18f`
- Result: `Verification submission -> pending preservation -> persisted outcome -> explicit approved activation continuity established`

### Unit Name

Business verification activation loop

### System Loop Completed

`onboarding loop`

### Roadmap Alignment

Wave 1 — Enterability

### Gap Alignment

- `GAP-ENTRY-001`

### Capability Closure

Closure recorded as `COMPLETED` under `ONBOARDING-ENTRY-001` after the bounded onboarding verification activation loop became materially usable from submission through approved trade-capable activation continuity.

### Required Continuity

The loop must hold across:

1. onboarding entry
2. business verification submission
3. review or approval state visibility
4. activation into a trade-capable tenant context

### Primary Surfaces

- `components/Onboarding/OnboardingFlow.tsx`
- any verification-backed service or route surfaces required to make the approval path materially true

### Closure Standard

This unit does not close when the upload step merely exists in UI.

It closes only when business verification changes system state in a way that removes the current blocker between onboarding and trade-capable use.

### Why This Is Not A UI Unit

The unit is not "finish the verification screen."

The unit is "close the onboarding loop so verification is operational and activation truthfully continues into product use."

## Unit 2 — ONBOARDING-ENTRY-002

- Status: `COMPLETED`
- Closed By: `ONBOARDING-ENTRY-002`
- Result: `Canonical provisioned first-owner activation handoff and tenant entry continuity established`

### Unit Name

Tenant provisioning to first-owner activation loop

### System Loop Completed

`onboarding loop`

### Roadmap Alignment

Wave 1 — Enterability, completed.

### Gap Alignment

- `GAP-ENTRY-002`

### Capability Closure

Closure recorded as `COMPLETED` under `ONBOARDING-ENTRY-002` after tenant provisioning reached a coherent canonical first-owner handoff and the newly created tenant could be entered by the intended first operator without a broken manual detour on the supported path.

### Required Continuity

The loop must hold across:

1. control-plane tenant creation
2. first-owner assignment or invite generation
3. first-owner acceptance or activation
4. entry into the tenant context as the initial operating user

### Primary Surfaces

- `components/ControlPlane/TenantRegistry.tsx`
- tenant invite and membership activation surfaces required for the first-owner handoff to become materially true

### Closure Standard

This unit does not close when a tenant record is created successfully but the operator is instructed to complete the real handoff elsewhere later.

It closes only when tenant creation and first-owner activation form a single coherent operating path.

### Why This Is Not A UI Unit

The unit is not "improve tenant registry controls."

The unit is "close the provisioning loop so a created tenant reliably becomes an entered tenant."

## Unit 3 — EXCHANGE-CORE-LOOP-001

- Status: `COMPLETED`
- Completion Mode: `MICRO_FIXES_THEN_EXECUTION`
- Closed By: `EXC-ENABLER-001..006`
- Commit References: `99258252de206d0357ad1934de4fce31197bc8d1`, `3d704188d32e33b7acca12b16941b2dba6ad4664`, `92f6aa0e10adc55a972852e4dac69701cd6c4a4c`, `24588d7d0bb36a1f54020193aa32e670d04b38b4`, `75b05f238b0ae91ede8291e6e337ac414e307e2d`, `fdb14465dacd25ef58fce6510d890c5876d31021`
- Result: `RFQ -> Supplier Response -> Trade Creation -> Trade Lifecycle -> Escrow -> Settlement continuity established`

### Unit Name

RFQ-to-settlement execution continuity loop

### System Loops Completed

- `exchange loop`
- `trade execution loop`

### Roadmap Alignment

Wave 2 must be satisfied before Wave 3 is considered complete.

This unit preserves roadmap dependency order by treating exchange activation and trade execution as one execution chain with two ordered closure layers:

1. first close the missing two-sided exchange path
2. then continue that path into visible trade execution continuity

This unit follows:

- MICRO_FIXES_THEN_EXECUTION

### Gap Alignment

- `GAP-EXCHANGE-001` through `GAP-EXCHANGE-013`

### Capability Closure

Implemented via bounded internal sequencing across `EXC-ENABLER-001..006`.

### Required Continuity

The loop must explicitly connect:

`RFQ -> Supplier Response -> Trade Creation -> Trade Lifecycle -> Escrow -> Settlement`

Execution completed via `MICRO_FIXES_THEN_EXECUTION` across `EXC-ENABLER-001..006`.

### Primary Surfaces

- buyer RFQ surfaces already present in tenant product flows
- supplier RFQ routes and product-facing supplier response surfaces required to make the loop two-sided
- `components/Tenant/TradesPanel.tsx`
- trade, escrow, and settlement surfaces required to make the execution chain visible rather than backend-only

### Closure Standard

Closure recorded as `COMPLETED` under `EXCHANGE-CORE-LOOP-001`.

### Why This Is Not A UI Unit

The unit is not "build supplier inbox" or "add trade actions to the trade panel."

The unit is "close the exchange core so the marketplace path becomes a real execution loop rather than a read-only or backend-only chain."

That now requires a bounded internal sequence:

1. enabling micro-fixes
2. then loop execution

## Unit 4 — OPS-CASEWORK-001

- Status: `COMPLETED`
- Closed By: `OPS-CASEWORK-001`
- Result: `Dispute, finance, and compliance casework control continuity established on canonical durable records`

### Unit Name

Live execution casework control loop

### System Loop Completed

`operations control loop`

### Roadmap Alignment

Wave 4 — Operational Control Hardening

### Gap Alignment

- `GAP-OPS-001`
- `GAP-OPS-002`
- `GAP-OPS-003`

### Capability Closure

Closure recorded as `COMPLETED` under `OPS-CASEWORK-001` after live execution became supervisable through materially usable financial, compliance, and dispute casework rather than thin event-backed oversight.

### Required Continuity

The loop must hold across:

1. live execution or exception state appears in control surfaces
2. finance, compliance, or dispute review can be performed as durable casework
3. operator action changes the case state in a traceable way
4. the resulting control decision remains visible as part of ongoing execution oversight

### Primary Surfaces

- control-plane finance routes and surfaces
- control-plane compliance routes and surfaces
- control-plane dispute routes and surfaces

### Closure Standard

This unit does not close when event-backed listings merely look authoritative.

It closes only when control-plane operators can perform credible intervention and follow the case through a durable operational path.

### Why This Is Not A UI Unit

The unit is not "improve finance ops panel" or "add dispute details tab."

The unit is "close the operations control loop so execution has real operator governance behind it."

## Unit 5 — WL-COMPLETE-001

- Status: `COMPLETED`
- Closed By: `WL-COMPLETE-001-S1`, `WL-COMPLETE-001-S2`, `WL-COMPLETE-001-S3`
- Result: `WL-qualified runtime entry, operator/admin continuity, scope-truth correction, stub removal, neighboring runtime coherence, and Collections/Domains runtime soundness established on the bounded supported path`

### Unit Name

White-label operating mode completion loop

### System Loops Completed

- `onboarding loop`
- `operations control loop`

### Roadmap Alignment

Wave 5 — Mode Completeness

### Gap Alignment

- `GAP-MODE-001`
- `GAP-SCOPE-001`
- `GAP-SCOPE-002`

### Capability Closure

Closure recorded as `COMPLETED` under `WL-COMPLETE-001` after the white-label operating mode became coherently real and truthfully scoped on the bounded supported path.

### Required Continuity

The loop must hold across:

1. white-label operator entry into a real admin context
2. materially usable white-label administration for promised operator tasks
3. consistent visibility into what DPP/passport and AI governance actually do in this mode
4. mode operation that no longer depends on mixed real, stub, and overstated surfaces

### Primary Surfaces

- `components/WhiteLabelAdmin/WLStubPanel.tsx`
- white-label operator surfaces required for consistent admin use
- product-truth-sensitive mode surfaces where DPP/passport and AI governance are currently overstated or mixed

### Closure Standard

This unit does not close when isolated white-label panels appear complete while the mode still contains stub paths or overstated scope.

It closes only when white-label can be treated as a coherent operating mode with truthful scope boundaries.

### Why This Is Not A UI Unit

The unit is not "finish WL admin screens."

The unit is "close the white-label operating mode so branded entry and operator control become consistently real and truthfully scoped."

## Unit 6 — TRUTH-CLEANUP-001

This is now the next remaining unit after governance close of `WL-COMPLETE-001`.

### Unit Name

Replacement-authority truth cleanup loop

### System Loop Completed

`operations control loop`

### Roadmap Alignment

Wave 6 — Truth Cleanup / Misleading Surface Retirement

### Gap Alignment

- `GAP-TRUTH-001`
- `GAP-TRUTH-002`

### Capability Closure

This unit is complete only when replacement product-truth documents govern execution and the misleading authority-bearing surfaces no longer function as active planning truth.

### Required Continuity

The loop must hold across:

1. replacement truth documents exist and are internally consistent
2. fake-complete API-doc and architecture surfaces are explicitly retired, relabeled, or downgraded from authority
3. execution planning and operator interpretation now follow the replacement truth set
4. no competing stale authority remains capable of redirecting delivery sequencing

### Primary Surfaces

- product-truth replacement documents that establish current authority
- misleading authority surfaces that currently read as active execution truth

### Closure Standard

This unit does not close when replacement docs merely exist beside still-active stale authority.

It closes only when truth cleanup completes the control loop around planning authority and removes misleading execution guidance.

### Why This Is Not A UI Unit

The unit is not "update docs screens" or "archive blueprint page text."

The unit is "close the authority cleanup loop so execution truth has one active source and misleading surfaces no longer distort delivery."

## What Is Explicitly Not A Delivery Unit

The following are not valid unit definitions in this plan:

- "supplier inbox UI"
- "trade panel actions"
- "tenant registry polish"
- "finance dashboard refresh"
- any unit that names a component instead of a closed system path

These may be implementation slices inside a unit, but they are not valid delivery units on their own.

## Dependency Guardrail

Wave 5 and Wave 6 units are part of the mandatory delivery set, but they remain downstream units.

They must not be pulled ahead of:

1. `ONBOARDING-ENTRY-002`

They are included here to preserve the full roadmap-backed unit set, not to weaken dependency-first execution.

## Plan Use Rules

1. Execute units in the order listed here.
2. Do not split `EXCHANGE-CORE-LOOP-001` into disconnected feature tickets that stop before execution continuity.
3. Do not mark a unit complete because one screen, route, or backend action exists.
4. When a unit closes, the closure statement must describe the system capability that became materially true.
5. If roadmap ordering changes, update this document only after the roadmap is updated first.