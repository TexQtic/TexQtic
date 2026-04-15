# TEXQTIC-NEXT-IMPLEMENTATION-UNIT-OPENING-DECISION-2026-04-15

## Status

- Status: COMPLETE
- Mode: GOVERNANCE-ONLY / DECISION-ONLY / FORMAL NEXT-UNIT OPENING WRITEBACK
- Date: 2026-04-15
- Layer 0 mutation: none in this pass
- Product-truth mutation: none in this pass
- Implementation opening: exactly one bounded next implementation unit selected
- Product-facing next-opening selection: exactly one bounded unit selected
- Decision outcome: `NEXT_IMPLEMENTATION_UNIT_OPENED`

## Decision Question

What is the single best next bounded implementation unit to open now, after the successful
implementation, verification, closeout, and clean-state restoration of Subscription slice 3C,
given current repo truth, launch-acceleration value, boundedness, authority cleanliness,
dependency readiness, the requirement to preserve zero-open posture until one exact next unit is
lawfully selected, and the requirement not to mix in the separate future-cycle Tenant Registry
closed/open segregation observation?

## Closed Baseline Units

Closed baseline preserved in this pass:

- `Subscription slice 2 — control-plane surface correction`
   - implementation commit: `3df60d3`
   - closeout commit: `9834b90`
- `Subscription slice 3A — frontend service-boundary plan metadata tightening`
   - implementation commit: `6a9027c`
   - closeout commit: `16b6b41`
- `Subscription slice 3B — OpenAPI contract plan metadata tightening`
   - implementation commit: `af5827a`
   - closeout commit: `927ba94`
- `Subscription slice 3C — backend runtime plan canonicalization and typing tightening`
   - implementation commit: `35bc83f9bae5b4941fe964a8a84d9b6d198202f5`
   - closeout commit: `9efa8318d0cd4f27b785a1c2a696a3de58ad007a`

Fixed closed-baseline facts preserved:

1. slice 2 remains implemented, deployed-verified, and closed
2. slice 3A remains implemented, VERIFIED_CLEAN, and closed
3. slice 3B remains implemented, VERIFIED_CLEAN, and closed
4. slice 3C remains implemented from commit `35bc83f9bae5b4941fe964a8a84d9b6d198202f5`,
   VERIFIED_CLEAN, and closed out in commit `9efa8318d0cd4f27b785a1c2a696a3de58ad007a`
5. the temporary repo-health remediation cycle used to clear the slice 3C gate is complete and
   closed as consumed history, not an active unit
6. no product-facing implementation unit is currently open
7. zero-open posture remains intact until one exact next unit is lawfully selected
8. no White Label work, no broader governance chain, and no Tenant Registry future-cycle
   observation may be reopened here

## Candidate Units Considered

### Candidate 1

- `Subscription slice 4 — broader remaining subscription/runtime/provisioning continuation`

Bounded meaning:

- continue the post-3C subscription remainder as one broader bundle across provisioning,
  control-plane wiring, and any adjacent operator plan-consumer surfaces
- treat legacy admin provisioning, approved-onboarding provisioning, and any adjacent admin
  workflow follow-ons as one continuation unit

### Candidate 2

- `Subscription slice 4 — bounded operator plan-assignment refinement`

Bounded meaning:

- add or clarify explicit operator-admin plan assignment during provisioning or adjacent admin
  workflow
- allow the unit to span whichever operator-facing mutation path proves necessary once the current
  provisioning seam is inspected

### Candidate 3

- `Subscription slice 4A — legacy-admin provisioning explicit operator plan-selection wiring`

Bounded meaning:

- add canonical `FREE | STARTER | PROFESSIONAL | ENTERPRISE` plan selection only to the legacy
  admin provisioning path
- cover only the control-plane provision modal, frontend control-plane provisioning service
  contract, control-plane OpenAPI provisioning branch, backend provisioning request typing,
  backend provisioning route validation, and backend provisioning service create path
- do not widen into approved-onboarding service-bearer semantics, existing-tenant plan mutation,
  billing or entitlement enforcement, tenant-plane contracts, auth, or Tenant Registry
  closed/open segregation

## Comparison of Candidates

| Candidate | Launch-Acceleration Value | Boundedness | Authority Cleanliness | Dependency Readiness | Broader Reopening Risk | Smallest Safe Modify Allowlist | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Subscription slice 4 — broader remaining subscription/runtime/provisioning continuation` | `MEDIUM-HIGH` | `LOW` | `MEDIUM` | `MEDIUM` | `HIGH` | provisioning + contract + service + admin workflow bundle | `REJECTED AS TOO BROAD` |
| `Subscription slice 4 — bounded operator plan-assignment refinement` | `MEDIUM-HIGH` | `MEDIUM-LOW` | `MEDIUM` | `MEDIUM` | `MEDIUM-HIGH` | provisioning plus possible approved-onboarding or adjacent admin workflow surfaces | `REJECTED AS STILL BROADER THAN NECESSARY` |
| `Subscription slice 4A — legacy-admin provisioning explicit operator plan-selection wiring` | `MEDIUM-HIGH` | `HIGH` | `HIGH` | `HIGH` | `LOW` | `server/src/types/tenantProvision.types.ts`, `server/src/routes/admin/tenantProvision.ts`, `server/src/services/tenantProvision.service.ts`, `shared/contracts/openapi.control-plane.json`, `services/controlPlaneService.ts`, `components/ControlPlane/TenantRegistry.tsx` | `SELECT` |

Exact comparison basis from current repo truth:

1. slice 3A already tightened the frontend service boundaries to canonical `CommercialPlan`
   typing
2. slice 3B already tightened the tenant-plane and control-plane OpenAPI `plan` fields to the
   canonical four-plan metadata contract and kept plan meaning metadata-only
3. slice 3C already canonicalized the backend runtime seam so `organizations.plan` is consumed as
   canonical `TenantPlan` inside `server/src/lib/database-context.ts` and
   `server/src/routes/tenant.ts`
4. canonical backend plan identity already exists as `TenantPlan = 'FREE' | 'STARTER' |
   'PROFESSIONAL' | 'ENTERPRISE'` in `server/src/types/index.ts`
5. legacy admin provisioning truth currently exposes `orgName`, `primaryAdminEmail`,
   `primaryAdminPassword`, `tenant_category`, and `is_white_label` across frontend service,
   backend request typing, backend route validation, and backend service create flow, but no
   explicit plan-selection input
6. the control-plane provision modal in `components/ControlPlane/TenantRegistry.tsx` currently
   collects the same legacy admin provisioning fields and therefore has a precise, bounded missing
   operator-input seam
7. the provisioning service currently creates `tenant.plan` and `organizations.plan` through the
   defaulted tenant-create path, so operator plan choice is not yet expressible at creation time
8. approved-onboarding provisioning is protected by a distinct service-bearer branch and adding
   plan selection there would widen immediately into CRM and onboarding handoff semantics outside
   this opening
9. no existing-tenant plan-mutation route or UI is present in current repo truth, so the broader
   slice 4 wording about "adjacent admin workflow" would weaken boundedness immediately
10. tenant-plane contracts and runtime identity already expose canonical plan metadata and do not
    need reopening for the next lawful unit
11. the separate Tenant Registry closed/open segregation observation remains out of scope and is
    not a selector for this next-unit decision

## Selected Next Unit

`Subscription slice 4A — legacy-admin provisioning explicit operator plan-selection wiring`

## Why This Unit Is Next

This unit is next because it is the smallest implementation-ready continuation after the closed
slice 3C runtime canonicalization.

Why it wins on bounded merits:

1. it directly continues the remaining subscription-adjacent drift by making operator plan choice
   explicit at tenant creation without reopening the already closed runtime, contract, or tenant
   identity slices
2. it matches the exact remaining missing seam in current repo truth: legacy admin provisioning can
   create a tenant but cannot yet express a canonical plan choice at creation time
3. it has a crisp six-file allowlist spanning only the required frontend modal, frontend service
   contract, control-plane OpenAPI provisioning branch, backend request typing, backend validation,
   and backend create path
4. it preserves the bounded meaning of `plan` as canonical commercial identity metadata and does
   not require any claim that billing, entitlement enforcement, or broader plan-driven product
   gating already exist
5. it is cleaner than the broader slice 4 framing because it stays inside the already-real legacy
   admin provisioning path instead of widening into approved-onboarding or adjacent admin workflow
   semantics that are not yet required to begin truthfully
6. it is cleaner than a broader remainder continuation because no smaller lawful subscription-
   adjacent allowlist exists after slices 3A, 3B, and 3C than the exact provisioning seam selected

Why other candidate classes are not next:

1. the broader remaining subscription/runtime/provisioning continuation is not the smallest lawful
   move because it weakens the allowlist boundary beyond the exact plan-selection seam now proven by
   repo truth
2. the broader slice 4 operator plan-assignment refinement remains broader than necessary because
   current repo truth does not yet expose any adjacent admin workflow or existing-tenant mutation
   seam that must be opened together with legacy admin provisioning
3. no other subscription-adjacent candidate yields a smaller safe modify allowlist than the exact
   six-file legacy-admin provisioning seam selected here

## Modify Allowlist

Modify only:

1. `server/src/types/tenantProvision.types.ts`
2. `server/src/routes/admin/tenantProvision.ts`
3. `server/src/services/tenantProvision.service.ts`
4. `shared/contracts/openapi.control-plane.json`
5. `services/controlPlaneService.ts`
6. `components/ControlPlane/TenantRegistry.tsx`

No additional modify targets are opened by this decision.

## Read-Only Evidence Set

Read-only evidence set for the next implementation pass:

1. `governance/control/OPEN-SET.md`
2. `governance/control/NEXT-ACTION.md`
3. `governance/control/BLOCKED.md`
4. `governance/control/SNAPSHOT.md`
5. `governance/analysis/TEXQTIC-NEXT-IMPLEMENTATION-UNIT-OPENING-DECISION-2026-04-15.md`
6. `docs/product-truth/SUBSCRIPTION-ENTITLEMENT-IMPLEMENTATION-DESIGN-v1.md`
7. `governance/control/TEXQTIC-OPENING-LAYER-GOVERNANCE-AUTHORITY-AND-POINTER-LAYER-2026-04-10.md`
8. `docs/governance/control/GOV-OS-001-DESIGN.md`
9. `server/src/types/tenantProvision.types.ts`
10. `server/src/services/tenantProvision.service.ts`
11. `server/src/routes/admin/tenantProvision.ts`
12. `server/src/routes/control.ts`
13. `server/src/routes/tenant.ts`
14. `server/src/lib/database-context.ts`
15. `server/src/types/index.ts`
16. `shared/contracts/openapi.control-plane.json`
17. `shared/contracts/openapi.tenant.json`
18. `services/controlPlaneService.ts`
19. `services/tenantService.ts`
20. `components/ControlPlane/TenantRegistry.tsx`
21. `components/ControlPlane/TenantDetails.tsx`
22. `types.ts`
23. `server/prisma/schema.prisma`
24. `package.json`

## Approved Commands

Approved terminal commands for the next implementation pass:

1. `git diff --name-only`
2. `git status --short`
3. `pnpm -C server exec eslint src/routes/admin/tenantProvision.ts src/services/tenantProvision.service.ts src/types/tenantProvision.types.ts`
4. `pnpm exec eslint services/controlPlaneService.ts components/ControlPlane/TenantRegistry.tsx`
5. `pnpm -C server exec tsc --noEmit`
6. `pnpm exec tsc --noEmit`
7. `git diff --check`

## Validation Commands

Validation commands for the next implementation pass:

1. `pnpm -C server exec eslint src/routes/admin/tenantProvision.ts src/services/tenantProvision.service.ts src/types/tenantProvision.types.ts`
2. `pnpm exec eslint services/controlPlaneService.ts components/ControlPlane/TenantRegistry.tsx`
3. `pnpm -C server exec tsc --noEmit`
4. `pnpm exec tsc --noEmit`
5. `git diff --check`

## Stop Conditions

Stop immediately and do not widen scope if any of the following becomes true during the next
implementation pass:

1. truthful implementation requires edits outside the six-file allowlist
2. explicit plan selection cannot remain legacy-admin provisioning-only and instead requires
   approved-onboarding service-bearer changes, tenant-plane contract changes, existing-tenant
   plan-mutation surfaces, auth widening, or billing and entitlement semantics
3. the pass drifts into Tenant Registry closed/open segregation or any other future-cycle item
4. `git diff --check` fails due local normalization and needs separate blocker-resolution

## Completion Checklist

- [x] mandatory pre-flight completed before write
- [x] no file-creep blocker found before write
- [x] slices 2, 3A, 3B, and 3C treated as fixed and closed
- [x] exactly one next implementation unit selected
- [x] exact modify allowlist defined
- [x] exact approved commands defined
- [x] exact validation commands defined
- [x] exact stop conditions defined
- [x] no implementation code opened in this pass
- [x] exactly one atomic governance commit created