# TEXQTIC-NEXT-IMPLEMENTATION-UNIT-OPENING-DECISION-2026-04-15

## Status

- Status: COMPLETE
- Mode: GOVERNANCE-ONLY / DECISION-ONLY / NEXT-UNIT CONFIRMATION
- Date: 2026-04-15
- Layer 0 mutation: none in this pass
- Product-truth mutation: none in this pass
- Implementation opening: exactly one bounded next implementation unit selected
- Product-facing next-opening selection: exactly one bounded unit selected
- Decision outcome: `NEXT_IMPLEMENTATION_UNIT_OPENED`

## Decision Question

What is the single best next bounded implementation unit to open now, after the successful
implementation, verification, closeout, and clean-state restoration of Subscription slice 3A,
given current repo truth, launch-acceleration value, boundedness, authority cleanliness,
dependency readiness, and the requirement to preserve zero-open posture until one exact next unit
is lawfully selected?

## Closed Baseline Units

Closed baseline preserved in this pass:

- `Subscription slice 2 — control-plane surface correction`
   - implementation commit: `3df60d3`
   - closeout commit: `9834b90`
- `Subscription slice 3A — frontend service-boundary plan metadata tightening`
   - implementation commit: `6a9027c`
   - closeout commit: `16b6b41`

Fixed closed-baseline facts preserved:

1. slice 2 remains implemented, deployed-verified, and closed
2. slice 3A remains implemented, VERIFIED_CLEAN, and closeout-recorded in `SNAPSHOT.md`
3. no product-facing implementation unit is currently open
4. zero-open posture remains intact until one exact next unit is lawfully selected
5. no White Label, family-anchor, or broader governance chain may be reopened here

## Candidate Units Considered

### Candidate 1

- `Subscription slice 3 — broader Module C contract-and-boundary tightening`

Bounded meaning:

- continue beyond slice 3A into the remaining contract and backend-adjacent boundary surfaces
- treat OpenAPI and tenant-route plan typing drift together as one bundle

### Candidate 2

- `Subscription slice 3B — OpenAPI contract plan metadata tightening`

Bounded meaning:

- tighten the tenant-plane and control-plane OpenAPI `plan` fields from unconstrained string to
   canonical plan metadata contract truth only
- keep the unit inside the two OpenAPI contract files without reopening services, routes,
   provisioning, or UI surfaces

### Candidate 3

- `Subscription slice 4 — bounded operator plan-assignment refinement`

Bounded meaning:

- add or clarify explicit operator-admin plan assignment during provisioning or adjacent admin
  workflow

## Comparison of Candidates

| Candidate | Launch-Acceleration Value | Boundedness | Authority Cleanliness | Dependency Readiness | Broader Reopening Risk | Smallest Safe Modify Allowlist | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Subscription slice 3 — broader Module C contract-and-boundary tightening` | `MEDIUM-HIGH` | `MEDIUM-LOW` | `MEDIUM` | `MEDIUM-LOW` | `HIGH` | contracts + tenant route + adjacent backend typing surfaces | `REJECTED AS TOO BROAD` |
| `Subscription slice 3B — OpenAPI contract plan metadata tightening` | `MEDIUM-HIGH` | `HIGH` | `HIGH` | `HIGH` | `LOW` | `shared/contracts/openapi.tenant.json`, `shared/contracts/openapi.control-plane.json` | `SELECT` |
| `Subscription slice 4 — bounded operator plan-assignment refinement` | `MEDIUM` | `LOW` | `MEDIUM-LOW` | `LOW` | `HIGH` | provisioning/service/admin workflow bundle | `REJECTED AS NOT READY` |

Exact comparison basis from current repo truth:

1. slice 3A already tightened the two frontend service boundaries to canonical `CommercialPlan`
   typing
2. both OpenAPI contract surfaces still expose `plan` as plain string
3. `server/src/routes/tenant.ts` and `server/src/lib/database-context.ts` still expose `plan`
   as string, so a broader Module C continuation would widen immediately beyond a crisp two-file
   next unit
4. provisioning request and service truth still contain no explicit plan-selection input, so slice 4
   would widen into backend/provisioning semantics immediately
5. family-anchor eligibility artifacts remain non-selectors and do not produce a safer exact
   implementation allowlist than the narrowed contract-only follow-on unit

## Selected Next Unit

`Subscription slice 3B — OpenAPI contract plan metadata tightening`

## Why This Unit Is Next

This unit is next because it is the smallest implementation-ready continuation after the closed
slice 3A service-boundary tightening.

Why it wins on bounded merits:

1. it directly continues the remaining Module C drift at the external contract boundary without
   reopening the now-closed service or UI slices
2. it addresses live remaining drift that is still present in current repo truth: both
   `shared/contracts/openapi.tenant.json` and `shared/contracts/openapi.control-plane.json` still
   describe `plan` as unconstrained string
3. it has a crisp two-file allowlist and does not require route, helper, provisioning, or UI
   mutation to begin truthfully
4. it improves launch-facing boundary clarity by making plan identity contract truth explicit while
   preserving the rule that plan remains metadata rather than a full entitlement matrix
5. it is cleaner than the broader Module C remainder because the route/helper typing seam is real
   but not required to tighten the two public contract surfaces first
6. it is cleaner than slice 4 because explicit operator plan assignment remains unready under the
   current provisioning request shape

Why other candidate classes are not next:

1. the broader Module C remainder is not the smallest lawful move because current repo truth shows
   that tenant-route and helper typing drift would enlarge the allowlist beyond a clean contract
   pair immediately
2. slice 4 remains blocked by dependency readiness because provisioning truth still carries tenant
   category and white-label capability, but no explicit plan input
3. no family-anchor or alternate adjacent candidate produces a smaller safe allowlist than the two
   OpenAPI contract files

## Modify Allowlist

Modify only:

1. `shared/contracts/openapi.tenant.json`
2. `shared/contracts/openapi.control-plane.json`

No additional modify targets are opened by this decision.

## Read-Only Evidence Set

Read-only evidence set for the next implementation pass:

1. `governance/control/NEXT-ACTION.md`
2. `governance/control/OPEN-SET.md`
3. `governance/control/BLOCKED.md`
4. `governance/control/SNAPSHOT.md`
5. `governance/control/TEXQTIC-OPENING-LAYER-GOVERNANCE-AUTHORITY-AND-POINTER-LAYER-2026-04-10.md`
6. `governance/analysis/TEXQTIC-LIVE-AUTHORITY-SPINE-RECONCILIATION-DECISION-2026-04-14.md`
7. `governance/analysis/TEXQTIC-APRIL-13-14-WAVE-ELEVATION-DECISION-2026-04-14.md`
8. `governance/analysis/TEXQTIC-FAMILY-UNIT-CONDITIONAL-ELEVATION-ELIGIBILITY-DECISION-2026-04-14.md`
9. `docs/product-truth/SUBSCRIPTION-ENTITLEMENT-IMPLEMENTATION-DESIGN-v1.md`
10. `types.ts`
11. `services/controlPlaneService.ts`
12. `services/tenantService.ts`
13. `server/src/routes/tenant.ts`
14. `server/src/lib/database-context.ts`
15. `server/src/types/tenantProvision.types.ts`
16. `server/src/services/tenantProvision.service.ts`
17. `components/ControlPlane/TenantDetails.tsx`
18. `components/ControlPlane/TenantRegistry.tsx`

## Approved Commands

Approved terminal commands for the next implementation pass:

1. `git diff --name-only`
2. `git status --short`
3. `pnpm exec tsc --noEmit`
4. `git diff --check`

## Validation Commands

Validation commands for the next implementation pass:

1. `pnpm exec tsc --noEmit`
2. `git diff --check`

## Stop Conditions

Stop immediately and do not widen scope if any of the following becomes true during the next
implementation pass:

1. truthful contract tightening requires modifying `services/controlPlaneService.ts`,
   `services/tenantService.ts`, `server/src/routes/tenant.ts`, `server/src/lib/database-context.ts`,
   `server/src/services/tenantProvision.service.ts`, `server/src/types/tenantProvision.types.ts`,
   `components/ControlPlane/TenantDetails.tsx`, or `components/ControlPlane/TenantRegistry.tsx`
2. truthful contract tightening requires introducing explicit operator plan assignment,
   onboarding commercial choice, AI-budget reinterpretation, or broader entitlement semantics
3. current runtime truth cannot support constraining the contract `plan` field to canonical plan
   metadata without contradiction
4. any additional modify target beyond the two OpenAPI files becomes necessary to complete the unit
   truthfully
5. the unit starts drifting into the broader Module C remainder instead of the exact contract-only
   follow-on selected here

## Completion Checklist

- [x] Mandatory pre-flight completed before write
- [x] No file-creep blocker found before write
- [x] Current zero-open control posture preserved
- [x] Closed Subscription slice 2 baseline preserved as fixed
- [x] Closed Subscription slice 3A baseline preserved as fixed
- [x] Strongest realistic candidate next units compared on bounded criteria
- [x] Exactly one next implementation unit selected
- [x] Exact modify allowlist defined
- [x] Exact approved commands defined
- [x] Exact validation commands defined
- [x] Exact stop conditions defined
- [x] No implementation code opened in this pass
- [x] No control file edited in this pass
- [x] No product code edited in this pass
- [x] Decision outcome recorded as `NEXT_IMPLEMENTATION_UNIT_OPENED`