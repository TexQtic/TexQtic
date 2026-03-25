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

| Order | Unit ID | Unit Name | System Loop Completed | Roadmap Alignment | Gap IDs | Why This Unit Exists |
|---|---|---|---|---|---|---|
| 1 | `ONBOARDING-ENTRY-001` | Business verification activation loop | `onboarding loop` | Wave 1 | `GAP-ENTRY-001` | No exchange or execution work matters if a tenant cannot become verification-complete and trade-capable |
| 2 | `ONBOARDING-ENTRY-002` | Tenant provisioning to first-owner activation loop | `onboarding loop` | Wave 1 | `GAP-ENTRY-002` | A tenant record without clean first-owner activation still breaks real entry into the platform |
| 3 | `EXCHANGE-CORE-LOOP-001` | RFQ-to-settlement execution continuity loop | `exchange loop`, `trade execution loop` | Waves 2 and 3, preserved in roadmap order | `GAP-EXCHANGE-001`, `GAP-EXCHANGE-002` | TexQtic cannot claim a real exchange core until RFQ flow continues through supplier response, trade creation, trade lifecycle, and escrow/settlement continuity |
| 4 | `OPS-CASEWORK-001` | Live execution casework control loop | `operations control loop` | Wave 4 | `GAP-OPS-001`, `GAP-OPS-002`, `GAP-OPS-003` | Live execution requires credible admin control around finance, compliance, and dispute intervention |
| 5 | `WL-COMPLETE-001` | White-label operating mode completion loop | `onboarding loop`, `operations control loop` | Wave 5 | `GAP-MODE-001`, `GAP-SCOPE-001`, `GAP-SCOPE-002` | White-label and scope-truth work must close a real operating mode, not remain a mixed collection of partial operator surfaces and overstated capabilities |
| 6 | `TRUTH-CLEANUP-001` | Replacement-authority truth cleanup loop | `operations control loop` | Wave 6 | `GAP-TRUTH-001`, `GAP-TRUTH-002` | Misleading authority cannot remain active once the replacement truth set exists and governs execution |

## Unit 1 — ONBOARDING-ENTRY-001

### Unit Name

Business verification activation loop

### System Loop Completed

`onboarding loop`

### Roadmap Alignment

Wave 1 — Enterability

### Gap Alignment

- `GAP-ENTRY-001`

### Capability Closure

This unit is complete only when a new tenant user can move from onboarding entry through business verification, receive a real verification outcome, and reach a trade-capable state without the verification step remaining a placeholder.

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

### Unit Name

Tenant provisioning to first-owner activation loop

### System Loop Completed

`onboarding loop`

### Roadmap Alignment

Wave 1 — Enterability

### Gap Alignment

- `GAP-ENTRY-002`

### Capability Closure

This unit is complete only when tenant provisioning reaches a coherent first-owner handoff and the newly created tenant can be entered by the intended first operator without a broken manual detour.

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

### Gap Alignment

- `GAP-EXCHANGE-001`
- `GAP-EXCHANGE-002`

### Capability Closure

This unit is complete only when the system supports the full path below as one materially usable chain:

1. buyer creates RFQ
2. supplier receives RFQ in a real inbox
3. supplier reviews RFQ detail and responds
4. response outcome creates or advances a trade path
5. tenant-visible trade creation occurs
6. tenant-visible trade lifecycle progression occurs
7. downstream escrow and settlement continuity remains visible and credible as the execution path continues

### Required Continuity

The loop must explicitly connect:

`RFQ -> supplier response -> trade creation -> trade lifecycle -> escrow/settlement continuity`

This continuity must be true in the product, not just across disconnected backend routes.

### Primary Surfaces

- buyer RFQ surfaces already present in tenant product flows
- supplier RFQ routes and product-facing supplier response surfaces required to make the loop two-sided
- `components/Tenant/TradesPanel.tsx`
- trade, escrow, and settlement surfaces required to make the execution chain visible rather than backend-only

### Closure Standard

This unit does not close when supplier response UI exists by itself.

This unit does not close when trade routes exist but tenant users still cannot progress execution visibly.

This unit closes only when TexQtic can truthfully claim that a live exchange path continues from RFQ initiation into trade execution with credible downstream continuity.

### Why This Is Not A UI Unit

The unit is not "build supplier inbox" or "add trade actions to the trade panel."

The unit is "close the exchange core so the marketplace path becomes a real execution loop rather than a read-only or backend-only chain."

## Unit 4 — OPS-CASEWORK-001

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

This unit is complete only when live execution can be supervised through materially usable financial, compliance, and dispute casework rather than thin event-backed oversight.

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

This unit is complete only when the white-label operating mode becomes consistently usable as a real product mode, and the narrow-scope realities inside that mode are no longer overstated as broader finished capability.

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

1. `ONBOARDING-ENTRY-001`
2. `ONBOARDING-ENTRY-002`
3. `EXCHANGE-CORE-LOOP-001`
4. `OPS-CASEWORK-001`

They are included here to preserve the full roadmap-backed unit set, not to weaken dependency-first execution.

## Plan Use Rules

1. Execute units in the order listed here.
2. Do not split `EXCHANGE-CORE-LOOP-001` into disconnected feature tickets that stop before execution continuity.
3. Do not mark a unit complete because one screen, route, or backend action exists.
4. When a unit closes, the closure statement must describe the system capability that became materially true.
5. If roadmap ordering changes, update this document only after the roadmap is updated first.