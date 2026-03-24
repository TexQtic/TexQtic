---
unit_id: TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-003
title: B2C New Arrivals placeholder-image fallback remediation
type: ACTIVE_DELIVERY
status: OPEN
delivery_class: ACTIVE_DELIVERY
wave: W5
plane: TENANT
opened: 2026-03-24
closed: null
verified: null
commit: null
evidence: "LAYER_0_CONFIRMATION: current Layer 0 had no compelled successor ACTIVE_DELIVERY, NEXT-ACTION was OPERATOR_DECISION_REQUIRED, and no ACTIVE_DELIVERY unit was OPEN before this opening · NORMALIZED_REPO_TRUTH_CONFIRMATION: the canonical normalization ledger preserves one exact surviving openable product-facing candidate only, the B2C New Arrivals placeholder-image fallback surface at App.tsx:1698 · SURFACE_CONFIRMATION: current repo truth shows the B2C New Arrivals fallback still uses https://via.placeholder.com/400x500 when imageUrl is absent · NON_REOPENING_CONFIRMATION: TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-001 and TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002 remain closed bounded historical units and are not reopened by this opening"
doctrine_constraints:
  - D-004: this is one bounded ACTIVE_DELIVERY unit only; it must not be merged with broader catalog, media, image, runtime, or governance-system work
  - D-007: no product/server/schema/migration/test/package/CI/hook/Sentinel-tooling surface outside the exact allowlist is authorized
  - D-011: this unit is now the sole authorized next ACTIVE_DELIVERY and concurrent governance-only units remain DECISION_QUEUE only
  - D-013: consumed historical placeholder-image units must not be reopened by implication
decisions_required:
  - GOV-DEC-TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-003-OPENING: DECIDED (2026-03-24, Paresh)
blockers: []
---

## Unit Summary

`TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-003` is one bounded `ACTIVE_DELIVERY` unit.

It exists only to remediate the exact surviving B2C `New Arrivals` placeholder-image fallback
surface in `App.tsx` that still uses `https://via.placeholder.com/400x500` when `imageUrl` is
absent.

This unit is the sole authorized next `ACTIVE_DELIVERY`. It is delivery-first, does not authorize
new Governance OS development, does not reopen `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-001` or
`TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002`, and does not authorize broader catalog/media/image
work.

## Source Truth

Current normalized repo truth preserves exactly one surviving openable product-facing candidate:

- the B2C `New Arrivals` placeholder-image fallback surface
- in `App.tsx`
- still using `https://via.placeholder.com/400x500` when `imageUrl` is absent

This exact surviving surface is separate from all of the following:

1. the already closed exact `App.tsx:1522` placeholder-image surface under
   `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002`
2. the already closed image-capability family under `TENANT-CATALOG-IMAGE-UPLOAD-GAP-001` and
   `002`
3. separately governed white-label image behavior
4. broader media/CDN/platform behavior
5. generic catalog correctness or broader tenant runtime correctness

## Acceptance Criteria

- [ ] The exact B2C `New Arrivals` fallback surface in `App.tsx` is inspected
- [ ] The reason that exact surface falls back to `https://via.placeholder.com/400x500` when
      `imageUrl` is absent is identified
- [ ] The minimum lawful fix for that exact fallback behavior is implemented
- [ ] Bounded storefront validation proves that exact surface no longer depends on the placeholder
      fallback incorrectly
- [ ] Scope remains limited to that one surviving surface only
- [ ] No broader catalog/media/image refactor is introduced
- [ ] No unrelated placeholder surface, upload pipeline, DNS remediation, control-plane,
      certification, AdminRBAC, DB/schema, or governance-system work is performed

## Files Allowlisted (Modify)

This decision/opening authorizes modification of these files only:

- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/SNAPSHOT.md`
- `governance/log/EXECUTION-LOG.md`
- `governance/decisions/GOV-DEC-TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-003-OPENING.md`
- `governance/units/TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-003.md`

All future implementation must use exact repo-relative allowlists only.

## Exact In-Scope Boundary

This unit authorizes only the following bounded work:

1. inspect the exact B2C `New Arrivals` fallback surface in `App.tsx`
2. determine why that surface falls back to `https://via.placeholder.com/400x500` when `imageUrl`
   is absent
3. implement the minimum lawful fix for that exact fallback behavior
4. validate only the bounded storefront behavior necessary to prove the surface no longer depends
   on the placeholder fallback incorrectly
5. preserve exact scope to this one surviving surface only

## Exact Out-of-Scope Boundary

This unit does **not** authorize:

- broad catalog/image/media refactors
- tenant image-upload pipeline changes
- unrelated placeholder surfaces elsewhere in the app
- general DNS remediation beyond this exact fallback surface
- AdminRBAC work
- control-plane auth/identity/impersonation work
- certification work
- migration/Prisma/schema/DB changes unless exact repo truth during implementation proves they are
  strictly necessary, in which case implementation must halt and report blocker rather than widen
  scope
- Sentinel/governance-system development
- any new child opening by implication

## Drift Guard

Implementation under this unit must remain as narrow as possible.

Do not widen this unit into:

- generic image-surface cleanup
- catalog card redesign
- media/CDN/platform redesign
- upload flow or storage redesign
- unrelated runtime defect remediation

If exact repo truth during implementation proves that DB/schema/migration/Prisma work is strictly
necessary, implementation must halt and report blocker rather than widen scope.

## Current Layer 0 Rule

`TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-003` is now the sole authorized next `ACTIVE_DELIVERY`.

Concurrent governance-only units remain `DECISION_QUEUE` only. No consumed historical unit is
reopened by implication.