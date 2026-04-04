# ADMINRBAC-PARENT-CHILD-POSTURE-CLARIFICATION-v1

## Status

Product-truth clarification note for formal-audit preparation only.

This artifact does not open a new AdminRBAC slice, does not change Layer 0, and does not close the
broad parent family.

## Area / family

Admin Authority / Control-Plane RBAC.

## Current controlling family authority

- `governance/control/OPEN-SET.md`
- `governance/decisions/GOV-DEC-ADMINRBAC-REGISTRY-READ-OPENING.md`
- `governance/decisions/GOV-DEC-ADMINRBAC-POST-CLOSE-DISPOSITION.md`
- `docs/product-truth/TEXQTIC-LAUNCH-FAMILY-CHAIN-BASELINE-AND-SEQUENCING-FRICTION-v1.md`

Current controlling posture remains:

- the broad parent `TECS-FBW-ADMINRBAC` is still `DESIGN_GATE`
- the preserved first bounded child slice was registry-read only and is closed
- no broader parent continuation is implied by the closed child

## Older or mixed-era artifacts still in play

- `docs/strategy/CONTROL_CENTER_TAXONOMY.md`
- `components/ControlPlane/AdminRBAC.tsx`

These remain important because the taxonomy describes Admin RBAC as implemented, while current
runtime now evidences a bounded access-registry surface with revoke behavior that is broader than
the originally closed read-only child slice but still narrower than the gated parent family.

## What current repo truth must be preserved

- AdminRBAC remains control-plane only
- `TenantAdmin`, `PlatformAdmin`, and `SuperAdmin` remain distinct terms
- no blanket `SuperAdmin can read everything` posture is authorized
- the broad parent family still owns invite, broader revoke/remove authority, role partition, and
  any later authority redesign

## What bounded child closure(s), seam closure(s), or runtime truths remain valid

- the closed child `TECS-FBW-ADMINRBAC-REGISTRY-READ-001` remains valid bounded lineage
- the child closure still proves one real bounded registry-read slice completed truthfully
- current repo runtime in `components/ControlPlane/AdminRBAC.tsx` remains valid runtime truth for a
  bounded control-plane admin registry surface with protected `SuperAdmin` handling and bounded
  revoke interaction for non-`SuperAdmin` rows

## What is explicitly not implied

This clarification does not imply:

- that the broad parent family is now closed
- that invite, role-change, self-elevation, or broader authority-partition work is complete
- that current bounded revoke behavior automatically resolves the whole parent stream
- that a next bounded AdminRBAC slice is selected or opened

## Current remainder or unresolved boundary

The unresolved parent-family remainder still includes:

- full invite authority
- broader revoke/remove semantics beyond the current bounded runtime
- role assignment or role partition mutation
- any next bounded child-slice selection
- any broader admin-authority design beyond the preserved closed child and current bounded runtime

The broad parent therefore remains gated even though current runtime truth is stronger than the
original closed child posture alone.

## Why this reconciliation is needed before the formal audit

Without this clarification, the later audit would have to choose between two false readings:

- underread the family by treating only the original closed child as real
- overread the family by flattening current runtime behavior into broad parent completion

This note preserves both truths at once: the closed child remains real, the current bounded runtime
remains real, and the parent family still remains gated.
