# WL-BLUEPRINT-RUNTIME-RESIDUE-001-DESIGN-v1

## Mission

Define the bounded white-label runtime-residue cleanup plan for `WL-BLUEPRINT-RUNTIME-RESIDUE-001`.

This unit exists to remove or truth-bound the still-live non-control-plane `Blueprint` exposure
that remains reachable in current white-label tenant runtime after the bounded white-label
operating-mode closure chain and the already-closed control-plane blueprint cleanup.

This design is planning only. No implementation has started in this phase.

## Unit Summary

`WL-BLUEPRINT-RUNTIME-RESIDUE-001` is one bounded white-label runtime-residue unit.

It exists only to stop the live tenant-facing blueprint path from presenting architecture
authority in current WL runtime. It does not authorize broad white-label runtime cleanup, shell
redesign, document reconciliation, or any reopening of prior closed units.

## Why This Unit Exists

The remaining truth problem is not a document-authority defect and is not the already-closed
control-plane blueprint placeholder issue.

Current repo truth shows that:

- `TRUTH-CLEANUP-001` correctly handled the preserved control-plane blueprint placeholder
- `TENANT-TRUTH-CLEANUP-001` correctly remains bounded to tenant-facing document authority only
- a separate live runtime path still exists in `App.tsx`, where a non-control-plane `Blueprint`
	control renders `components/ArchitectureDiagram.tsx` as a tenant-facing overlay

This unit therefore exists to retire that still-live WL runtime authority residue only.

## Unit Boundary

`WL-BLUEPRINT-RUNTIME-RESIDUE-001` is limited to bounded white-label runtime-residue cleanup only.

The unit may only remove, truth-bound, or otherwise de-authorize the exact live non-control-plane
blueprint exposure already established in:

- `docs/product-truth/TEXQTIC-GAP-REGISTER-v1.md`
- `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v1.md`
- `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v1.md`
- the current Layer 0 opening basis for `WL-BLUEPRINT-RUNTIME-RESIDUE-001`

The unit does not authorize broad white-label runtime cleanup, shell redesign, architecture
redesign, document reconciliation, or reopening any previously closed delivery unit.

## In Scope

### `App.tsx`

In scope because current repo truth shows that the shared app-root floating control renders a live
`Blueprint` button for every non-control-plane state. That button remains reachable in WL tenant
runtime, including `EXPERIENCE` and `WL_ADMIN`, and directly mounts the runtime residue path.

### `components/ArchitectureDiagram.tsx`

In scope because it is the exact overlay surface rendered by the app-root blueprint path. Its
content still reads as active platform architecture authority when shown inside live tenant
runtime.

## Out of Scope

- the document-authority surfaces governed by `TENANT-TRUTH-CLEANUP-001`
- the already-closed control-plane placeholder cleanup under `TRUTH-CLEANUP-001`
- broad white-label runtime cleanup outside the exact blueprint exposure path
- unrelated shell or routing redesign
- architecture redesign, replacement blueprint authoring, or platform-strategy rewrite
- runtime surfaces not required for the established `Blueprint` exposure path
- `WL-COMPLETE-001` reopening or residual mode-completeness reassessment
- frontend or server changes unrelated to the exact blueprint path
- schema, migration, Prisma, database, test, deployment, or verification execution work
- opening any new unit or creating new replacement authority outside the established product-truth stack

## Runtime Authority Analysis

### `App.tsx`

- Current runtime role:
	Shared app-root state container and floating utility control host for non-control-plane runtime.
- Tenant context:
	White-label tenant runtime directly, because `WL_ADMIN` and `EXPERIENCE` are both live
	non-control-plane states and the `Blueprint` button is rendered whenever `appState !== 'CONTROL_PLANE'`.
- Why authority-bearing:
	It exposes an explicit `Blueprint` affordance in live tenant runtime and toggles the overlay that
	presents architecture content as an active runtime surface rather than preserved history.
- Why misleading / stale / conflicting:
	The bounded product-truth stack already records this as misleading-authority residue, and the
	earlier control-plane blueprint cleanup closed on the basis that blueprint-style authority should
	no longer remain active beside replacement truth. Keeping a live tenant-facing trigger in the
	app root conflicts with that bounded truth posture.
- Replacement authority:
	`docs/product-truth/TEXQTIC-GAP-REGISTER-v1.md`,
	`docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v1.md`,
	`docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v1.md`, and the current Layer 0 opening basis for
	`WL-BLUEPRINT-RUNTIME-RESIDUE-001`.
- Required action:
	`remove exposure`

### `components/ArchitectureDiagram.tsx`

- Current runtime role:
	Tenant-visible overlay body rendered by the app-root blueprint toggle.
- Tenant context:
	White-label tenant runtime directly when the live `Blueprint` control is used from
	`EXPERIENCE` or `WL_ADMIN`.
- Why authority-bearing:
	It renders `Platform Architecture Overview` plus layered platform/system content that reads as
	current architecture authority inside a live runtime surface.
- Why misleading / stale / conflicting:
	The overlay still presents conceptual platform architecture as if it were current runtime truth,
	even though the replacement authority already lives in the product-truth stack and the earlier
	control-plane truth cleanup already retired blueprint-style authority in that separate scope.
- Replacement authority:
	`docs/product-truth/TEXQTIC-GAP-REGISTER-v1.md`,
	`docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v1.md`,
	`docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v1.md`, and the current Layer 0 opening basis for
	`WL-BLUEPRINT-RUNTIME-RESIDUE-001`.
- Required action:
	`truth-bound exposure`

## Separate-Unit Rationale

This must remain a separate bounded runtime-residue unit because the proven defect class is a live
runtime/UI authority path, not document drift.

This should not become:

- part of `TENANT-TRUTH-CLEANUP-001`, because that active unit is explicitly document-only and does
	not authorize runtime or shell implementation
- `no unit`, because the live app-root `Blueprint` path still exposes tenant-facing architecture
	authority and is already recorded as open `GAP-TRUTH-006`
- a broad white-label runtime cleanup, because the evidence only proves one exact runtime residue
	path bounded to `App.tsx` and `components/ArchitectureDiagram.tsx`

The correct shape is therefore one bounded white-label runtime-residue unit only.

## Action Classification

### `App.tsx`

- Required action: `remove exposure`
- Rationale:
	`App.tsx` is the live entry point that surfaces the misleading blueprint path into WL tenant
	runtime. The minimum lawful execution shape is to stop the non-control-plane app root from
	offering that active blueprint trigger.

### `components/ArchitectureDiagram.tsx`

- Required action: `truth-bound exposure`
- Rationale:
	If the diagram component remains on disk after the live trigger is removed, it must no longer
	function as active architecture authority. This unit does not require broad architecture rewrite,
	but it does require that any retained surface cease reading as current platform truth if still
	reachable.

## Slice Plan

### Slice 1 — Bounded runtime exposure confirmation

Confirm the exact retained runtime exposure path from `App.tsx` into
`components/ArchitectureDiagram.tsx` and preserve the existing repo truth that this is a live WL
runtime residue rather than a document-authority problem.

### Slice 2 — App-root blueprint exposure removal

Remove the live non-control-plane `Blueprint` trigger from `App.tsx` so WL tenant runtime no
longer exposes the blueprint path as an active app-root affordance.

### Slice 3 — Overlay authority truth-bound reconciliation

Truth-bound `components/ArchitectureDiagram.tsx` so any retained surface no longer reads as active
platform architecture authority in tenant runtime.

### Slice 4 — Bounded frontend verification

Verify that the live WL runtime path no longer exposes blueprint authority and that the shared
app-root control area remains sound after the bounded change.

### Slice 5 — Governance sync and close

Verify that `GAP-TRUTH-006` is satisfied, synchronize the governance/product-truth records, and
close only if no active WL blueprint runtime authority remains in the bounded scope.

## Verification Basis

The verification discipline for this unit is frontend verification first.

Required carry-forward rules:

- no unit closes without verification
- shared app-root control changes require neighbor-path smoke checks where the control cluster is shared
- if live frontend behavior changes, the later execution order remains
	`implement -> commit -> deploy -> verify -> close`

Expected verification class for `WL-BLUEPRINT-RUNTIME-RESIDUE-001`:

- primary: frontend verification
- plus: shared-path / neighbor-path smoke checks because `App.tsx` hosts the floating global control cluster
- escalation only if later implementation proves the residue cannot be classified cleanly without
	additional runtime entry-path evidence

## Completion Standard

`WL-BLUEPRINT-RUNTIME-RESIDUE-001` is complete only when:

1. white-label tenant runtime no longer exposes a live non-control-plane `Blueprint` path
2. `components/ArchitectureDiagram.tsx` no longer functions as active tenant-facing architecture
	 authority in this bounded runtime scope
3. the established product-truth stack remains the sole active replacement authority for this
	 bounded blueprint-residue scope
4. no broad white-label cleanup, shell redesign, document cleanup, or closed-unit reopening was
	 pulled into the unit

## Guardrails

- Do not widen from the exact blueprint exposure path into broad white-label runtime cleanup.
- Do not absorb this unit into `TENANT-TRUTH-CLEANUP-001`.
- Do not reopen `TRUTH-CLEANUP-001`, `WL-COMPLETE-001`, or any other closed unit.
- Do not redesign tenant shells, routing, onboarding, exchange, or platform architecture here.
- Do not create new replacement authority outside the established product-truth stack.
- Do not turn this unit into a platform-architecture rewrite or blueprint reauthoring effort.
- Do not pull in unrelated runtime residue just because it sits near `App.tsx`.
- Do not execute tests, deployment, or verification during this design phase.
