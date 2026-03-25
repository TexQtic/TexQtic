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
| 1 | `ONBOARDING-LOOP-001` | Business verification activation loop | `onboarding loop` | Wave 1 | `GAP-ENTRY-001` | No exchange or execution work matters if a tenant cannot become verification-complete and trade-capable |
| 2 | `ONBOARDING-LOOP-002` | Tenant provisioning to first-owner activation loop | `onboarding loop` | Wave 1 | `GAP-ENTRY-002` | A tenant record without clean first-owner activation still breaks real entry into the platform |
| 3 | `EXCHANGE-CORE-LOOP-001` | RFQ-to-settlement execution continuity loop | `exchange loop`, `trade execution loop` | Waves 2 and 3, preserved in roadmap order | `GAP-EXCHANGE-001`, `GAP-EXCHANGE-002` | TexQtic cannot claim a real exchange core until RFQ flow continues through supplier response, trade creation, trade lifecycle, and escrow/settlement continuity |
| 4 | `OPS-CONTROL-LOOP-001` | Live execution casework control loop | `operations control loop` | Wave 4 | `GAP-OPS-001`, `GAP-OPS-002`, `GAP-OPS-003` | Live execution requires credible admin control around finance, compliance, and dispute intervention |

## Unit 1 — ONBOARDING-LOOP-001

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

## Unit 2 — ONBOARDING-LOOP-002

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

## Unit 4 — OPS-CONTROL-LOOP-001

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

## What Is Explicitly Not A Delivery Unit

The following are not valid unit definitions in this plan:

- "supplier inbox UI"
- "trade panel actions"
- "tenant registry polish"
- "finance dashboard refresh"
- any unit that names a component instead of a closed system path

These may be implementation slices inside a unit, but they are not valid delivery units on their own.

## Out Of Immediate Scope

The following roadmap work remains valid but is not part of the immediate next-delivery unit set:

- Wave 5 mode completeness work
- Wave 6 truth cleanup and misleading-surface retirement work

Those items remain downstream of the core loop closures above and must not displace them.

## Plan Use Rules

1. Execute units in the order listed here.
2. Do not split `EXCHANGE-CORE-LOOP-001` into disconnected feature tickets that stop before execution continuity.
3. Do not mark a unit complete because one screen, route, or backend action exists.
4. When a unit closes, the closure statement must describe the system capability that became materially true.
5. If roadmap ordering changes, update this document only after the roadmap is updated first.