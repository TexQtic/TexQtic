---
unit_id: TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-003
title: B2C New Arrivals placeholder-image fallback remediation
type: ACTIVE_DELIVERY
status: VERIFIED_COMPLETE
delivery_class: ACTIVE_DELIVERY
wave: W5
plane: TENANT
opened: 2026-03-24
closed: null
verified: 2026-03-24
commit: "d50b20834adf0e54fb628a93fa3613109da26388"
evidence: "OPENING_CONFIRMATION: current Layer 0 had no compelled successor ACTIVE_DELIVERY, NEXT-ACTION was OPERATOR_DECISION_REQUIRED, and no ACTIVE_DELIVERY unit was OPEN before this opening · NORMALIZED_REPO_TRUTH_CONFIRMATION: the canonical normalization ledger preserved one exact surviving openable product-facing candidate only, the B2C New Arrivals placeholder-image fallback surface at App.tsx:1698 · ROOT_CAUSE_CONFIRMATION: the B2C New Arrivals branch used p.imageUrl || https://via.placeholder.com/400x500 when imageUrl was absent · IMPLEMENTATION_COMMIT: d50b20834adf0e54fb628a93fa3613109da26388 removed that remote fallback from the exact bounded surface only and now renders a local Image unavailable state when imageUrl is absent · VERIFICATION_RESULT: VERIFIED_COMPLETE after bounded verification confirmed the exact B2C branch now renders a real image when imageUrl exists, renders a local missing-image state when imageUrl is absent, introduced no broader image/media/catalog refactor, and required no separate verification-record commit · GOVERNANCE_SYNC_CONFIRMATION: this unit is now sync-complete and postured for separate Close only while remaining the same sole ACTIVE_DELIVERY stream"
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

Result: `VERIFIED_COMPLETE`.

The authoritative implementation baseline is commit
`d50b20834adf0e54fb628a93fa3613109da26388`.

This unit remains the same sole authorized `ACTIVE_DELIVERY` stream pending separate Close only.
It is delivery-first, does not authorize new Governance OS development, does not reopen
`TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-001` or `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002`, and
does not authorize broader catalog/media/image work.

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

- [x] The exact B2C `New Arrivals` fallback surface in `App.tsx` is inspected
- [x] The reason that exact surface falls back to `https://via.placeholder.com/400x500` when
   `imageUrl` is absent is identified
- [x] The minimum lawful fix for that exact fallback behavior is implemented
- [x] Bounded storefront validation proves that exact surface no longer depends on the placeholder
   fallback incorrectly
- [x] Scope remains limited to that one surviving surface only
- [x] No broader catalog/media/image refactor is introduced
- [x] No unrelated placeholder surface, upload pipeline, DNS remediation, control-plane,
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

## Implementation Record

- authoritative implementation commit: `d50b20834adf0e54fb628a93fa3613109da26388`
- exact bounded surface fixed: B2C `New Arrivals` branch in `App.tsx`
- exact root cause removed: `p.imageUrl || https://via.placeholder.com/400x500`
- resulting bounded behavior:
   - real image renders when `imageUrl` exists
   - local `Image unavailable` state renders when `imageUrl` is absent
- boundedness preserved: no broader image/media/catalog refactor, no new helper/component/system,
   and no unrelated application or governance surface was modified during implementation

## Verification Record

- verification result: `VERIFIED_COMPLETE`
- verification date: `2026-03-24`
- verification baseline: implementation commit `d50b20834adf0e54fb628a93fa3613109da26388`
- evidence summary:
   - exact B2C branch no longer uses the remote `400x500` placeholder fallback
   - real image branch remains present when `imageUrl` exists
   - local missing-image branch now renders when `imageUrl` is absent
   - implementation change remained bounded to the exact `App.tsx` surface only
   - no separate verification-record commit was required

## Governance Sync

- governance sync phase: completed
- status transition: `OPEN` -> `VERIFIED_COMPLETE`
- current Layer 0 posture: same sole `ACTIVE_DELIVERY` stream, now closure-ready only
- next lawful lifecycle step after this sync: separate Close for
   `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-003` only
- no closure is implied by this sync

## Current Layer 0 Rule

`TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-003` remains the sole authorized current
`ACTIVE_DELIVERY` stream and is now `VERIFIED_COMPLETE`.

Concurrent governance-only units remain `DECISION_QUEUE` only. No consumed historical unit is
reopened by implication, no successor unit is created, and no closure has yet occurred.

## Last Governance Confirmation

2026-03-24 — governance sync recorded `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-003` as
`VERIFIED_COMPLETE` after bounded verification confirmed that implementation commit
`d50b20834adf0e54fb628a93fa3613109da26388` removed the remote `400x500` placeholder dependency
from the exact B2C `New Arrivals` branch in `App.tsx`, preserved the real-image path when
`imageUrl` exists, and rendered a local `Image unavailable` state when `imageUrl` is absent. The
change remained bounded to that exact storefront surface only, no broader image/media/catalog
refactor was authorized, and the next lawful lifecycle step is separate Close only.