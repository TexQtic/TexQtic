# TRUTH-CLEANUP-001-DESIGN-v1

## Mission

Define the bounded replacement-authority truth cleanup plan for `TRUTH-CLEANUP-001`.

This unit exists to remove the remaining misleading authority signal carried by a small set of
preserved fake-complete control-plane surfaces now that the replacement product-truth stack is
stable and governs execution sequencing.

This design is planning only. No implementation has started in this phase.

## Unit Boundary

`TRUTH-CLEANUP-001` is limited to replacement-authority truth cleanup only.

The unit may only retire, downgrade, relabel, or reconcile misleading authority-bearing surfaces
that materially conflict with the active replacement authority already established in:

- `docs/product-truth/TEXQTIC-GAP-REGISTER-v1.md`
- `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v1.md`
- `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v1.md`

The unit does not authorize runtime behavior changes, broad documentation cleanup, architecture
redesign, or reopening any previously closed delivery unit.

## In Scope

### `components/ControlPlane/ApiDocs.tsx`

In scope because `GAP-TRUTH-001` explicitly identifies this surface as fake-complete and
misleading. The component still renders a static authority-bearing API contract surface with hard-
coded endpoints and contract language.

### `components/ControlPlane/ArchitectureBlueprints.tsx`

In scope because `GAP-TRUTH-002` explicitly identifies this surface as fake-complete and stack-
misaligned. The component still renders architecture and roadmap-style guidance that conflicts
with current repo truth.

### `docs/strategy/CONTROL_CENTER_TAXONOMY.md`

In scope because it still preserves a current-surface authority signal by listing Architecture
Blueprints and API Docs as implemented control-center modules. That creates residual ambiguity
after nav removal and conflicts with the replacement product-truth classification.

### `docs/status/TEXQTIC_CURRENT_STATE__2026-02-24.md`

In scope because it still presents Architecture Blueprints and API Docs as current SuperAdmin shell
views inside a current-state status document. That preserves an additional current-authority signal
that would remain misleading if the unit only changed the component files and taxonomy document.

## Out of Scope

- product or runtime behavior changes
- frontend or server implementation work
- schema, migration, Prisma, or database changes
- tests or deployment work
- runtime verification execution
- broad documentation refresh or generalized stale-doc cleanup
- architecture redesign or new blueprint creation
- reopening `WL-COMPLETE-001`, onboarding, exchange, or any other closed unit
- unrelated preserved static surfaces not explicitly opened under `GAP-TRUTH-001` or
  `GAP-TRUTH-002`
- rewriting historical audit or tracker records whose purpose is historical preservation rather
  than current authority

## Authority Analysis

### `components/ControlPlane/ApiDocs.tsx`

- Current authority signal:
  Presents a static "API Contract Skeleton" with grouped endpoint definitions that read like live
  platform API authority.
- Why misleading:
  The rendered endpoints are hard-coded and not established as runtime-backed authority. The gap
  register already classifies this panel as fake-complete and explicitly states that it does not
  represent live runtime authority.
- Replacement authority:
  `docs/product-truth/TEXQTIC-GAP-REGISTER-v1.md` and the Wave 6 planning authority in the product-
  truth roadmap and next-delivery plan.

### `components/ControlPlane/ArchitectureBlueprints.tsx`

- Current authority signal:
  Presents "Platform Blueprints" and "Formal architectural specifications and strategic roadmap"
  language that reads like current architecture authority.
- Why misleading:
  The component recommends stack and identity patterns that conflict with current repo reality,
  including Clerk/Auth0, NestJS or Go, `tenant_id`, and roadmap-style messaging that is superseded
  by the product-truth stack.
- Replacement authority:
  `docs/product-truth/TEXQTIC-GAP-REGISTER-v1.md`, `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v1.md`,
  and `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v1.md`.

### `docs/strategy/CONTROL_CENTER_TAXONOMY.md`

- Current authority signal:
  Still labels Architecture Blueprints and API Docs as implemented control-center modules.
- Why misleading:
  Repo truth already preserves that these placeholder panels were removed from SuperAdmin nav while
  the component files remained on disk. Keeping them described as implemented control-center
  modules preserves a stronger authority signal than the bounded truth-cleanup unit should allow.
- Replacement authority:
  The product-truth gap register plus the preserved historical record that the panels were removed
  from nav and are no longer current planning authority.

### `docs/status/TEXQTIC_CURRENT_STATE__2026-02-24.md`

- Current authority signal:
  Presents Architecture Blueprints and API Docs as current SuperAdmin shell views inside a
  current-state status summary.
- Why misleading:
  Repo-truth validation against current TypeScript sources shows no live code reference to either
  surface outside the component files themselves, while preserved governance history records that
  these placeholder panels were removed from SuperAdmin nav and left on disk only.
- Replacement authority:
  The product-truth gap register, the current Layer 0 opening basis for `TRUTH-CLEANUP-001`, and
  the preserved governance history that records nav removal.

## Action Classification

### `components/ControlPlane/ApiDocs.tsx`

- Required action: `downgrade`
- Rationale:
  The component should stop functioning as an authority-bearing API contract surface, but this unit
  does not require deleting history or inventing a new API authority source.

### `components/ControlPlane/ArchitectureBlueprints.tsx`

- Required action: `downgrade`
- Rationale:
  The component should stop functioning as live architecture or planning authority, but this unit
  does not authorize broad architecture rewrite or replacement blueprint authoring.

### `docs/strategy/CONTROL_CENTER_TAXONOMY.md`

- Required action: `reconcile`
- Rationale:
  The document should stop preserving a current implemented-authority interpretation for the two
  in-scope surfaces and should align with the replacement product-truth classification.

### `docs/status/TEXQTIC_CURRENT_STATE__2026-02-24.md`

- Required action: `reconcile`
- Rationale:
  The document should stop preserving a current-state shell-view interpretation for the two
  downgraded surfaces and should align with the bounded repo truth that they are preserved on disk
  but not current active planning or navigation authority.

## Slice Plan

### Slice 1 — Bounded retained-surface confirmation

Confirm the exact retained status of `ApiDocs.tsx` and `ArchitectureBlueprints.tsx` and preserve
the existing repo truth that they were removed from nav earlier and remain on disk only as
preserved surfaces.

### Slice 2 — API docs authority downgrade

Downgrade `components/ControlPlane/ApiDocs.tsx` so it no longer presents itself as live API or
contract authority.

### Slice 3 — Blueprint authority downgrade

Downgrade `components/ControlPlane/ArchitectureBlueprints.tsx` so it no longer presents itself as
current architecture or roadmap authority.

### Slice 4 — Taxonomy reconciliation

Reconcile `docs/strategy/CONTROL_CENTER_TAXONOMY.md` so it no longer describes the two downgraded
surfaces as current implemented authority-bearing control-center modules.

### Slice 5 — Current-state status reconciliation

Reconcile `docs/status/TEXQTIC_CURRENT_STATE__2026-02-24.md` so it no longer preserves a current
SuperAdmin-view authority signal for the downgraded surfaces.

### Slice 6 — Bounded truth verification and governance sync

Verify that the replacement product-truth stack is the sole active authority for this bounded
scope, then perform governance sync and close only if no misleading active authority signal
remains.

## Verification Basis

The verification discipline for this unit is repo-truth verification first.

Required carry-forward rules:

- no unit closes without verification
- backend units require tests if backend files are changed
- frontend/auth/mode-entry units require Vercel verification if live frontend behavior is changed
- shared-shell changes require neighbor-path smoke checks if shell behavior is changed
- if production verification becomes required, the order remains `implement -> commit -> deploy -> verify -> close`

Expected verification class for `TRUTH-CLEANUP-001`:

- primary: governance/repo-truth verification
- escalation only if implementation proves the misleading surfaces are still reachable as live UI
  authority paths: frontend verification

## Completion Standard

`TRUTH-CLEANUP-001` is complete only when:

1. the in-scope misleading surfaces no longer function as active planning or architecture authority
2. the replacement product-truth stack is the sole active authority for this bounded scope
3. any retained historical references are clearly non-authoritative
4. no unrelated stale surfaces, broad doc cleanup, or product behavior changes were pulled into the
   unit

## Guardrails

- Do not implement runtime or product behavior changes under this unit.
- Do not widen from the two opened gap surfaces into broad documentation cleanup.
- Do not redesign architecture, auth, routing, onboarding, white-label, or exchange flows here.
- Do not demote historical records that are serving truthful archival purpose only.
- Do not reopen any previously closed unit.
- Do not create replacement authority outside the already-established product-truth stack.