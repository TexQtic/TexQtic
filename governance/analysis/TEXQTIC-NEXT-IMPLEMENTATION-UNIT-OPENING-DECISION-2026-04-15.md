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

What is the single best next bounded implementation unit to open now, after the successful closeout
of Subscription slice 2, given current repo truth, launch-acceleration value, authority cleanliness,
dependency readiness, and the requirement to preserve zero-open posture until one exact next unit is
lawfully selected?

## Closed Baseline Unit

Closed baseline preserved in this pass:

- `Subscription slice 2 — control-plane surface correction`
- implementation commit: `3df60d3`
- closeout commit: `9834b90`

Fixed closed-baseline facts preserved:

1. only `components/ControlPlane/TenantDetails.tsx` changed in the closed unit
2. `components/ControlPlane/TenantRegistry.tsx` remained intentionally unchanged
3. deployed control-plane tenant-detail verification passed
4. `Plan & AI Budget` and `Billing Scope` are now verified live and must not be reopened here
5. no broader Subscription slice, backend, contract, schema, or governance expansion was consumed

## Candidate Next Units Considered

### Candidate 1

- `Subscription slice 3A — frontend service-boundary plan metadata tightening`

Bounded meaning:

- tighten plan interpretation at the frontend service boundary only
- keep the unit inside `services/controlPlaneService.ts` and `services/tenantService.ts`
- treat plan as canonical identity metadata without reopening slice 1 typing/model work or slice 2
  UI truthfulness work

### Candidate 2

- `Subscription slice 3 — full contract and service boundary tightening`

Bounded meaning:

- open the full Module C family described in the Subscription implementation design, including
  service files plus adjacent contract and route surfaces

### Candidate 3

- `Subscription slice 4 — bounded operator plan-assignment refinement`

Bounded meaning:

- add or clarify explicit operator-admin plan assignment during provisioning or adjacent admin
  workflow

## Comparison of Candidates

| Candidate | Launch-Acceleration Value | Boundedness | Authority Cleanliness | Dependency Readiness | Broader Reopening Risk | Smallest Safe Modify Allowlist | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Subscription slice 3A — frontend service-boundary plan metadata tightening` | `MEDIUM-HIGH` | `HIGH` | `HIGH` | `HIGH` | `LOW` | `services/controlPlaneService.ts`, `services/tenantService.ts` | `SELECT` |
| `Subscription slice 3 — full contract and service boundary tightening` | `MEDIUM` | `MEDIUM-LOW` | `MEDIUM` | `MEDIUM-LOW` | `HIGH` | services + shared contracts + server route surfaces | `REJECTED AS TOO BROAD` |
| `Subscription slice 4 — bounded operator plan-assignment refinement` | `MEDIUM` | `LOW` | `MEDIUM-LOW` | `LOW` | `HIGH` | registry + service + provisioning/backend contract surfaces | `REJECTED AS NOT READY` |

Exact comparison basis from current repo truth:

1. Subscription design orders slice 3 ahead of any plan-assignment refinement.
2. Current service boundaries still expose `plan: string` in both control-plane and tenant-plane
   responses.
3. Current provisioning request shapes still do not accept explicit plan input, so plan-assignment
   work would widen into backend/provisioning semantics immediately.
4. Family-anchor eligibility decisions for B2B, B2C, and taxonomy artifacts do not themselves
   provide a concrete implementation-ready next unit or a smaller safe modify allowlist than the
   narrowed Subscription service-boundary unit.

## Selected Next Unit

`Subscription slice 3A — frontend service-boundary plan metadata tightening`

## Why This Unit Is Next

This unit is next because it is the smallest implementation-ready continuation after the closed
slice 2 surface correction.

Why it wins on bounded merits:

1. it directly follows the Subscription implementation sequence without reopening the closed UI
   truthfulness work
2. it closes live remaining drift that is still present in current repo truth: both
   `services/controlPlaneService.ts` and `services/tenantService.ts` still expose `plan` as plain
   string at the frontend service boundary
3. it has a two-file modify boundary and does not require contract, route, schema, or provisioning
   mutation to begin truthfully
4. it preserves launch value by tightening the commercial identity model where future admin or
   runtime surfaces will consume it next
5. it is cleaner than full Module C because the broader contract/route bundle would create an
   avoidable reopening risk
6. it is cleaner than slice 4 because explicit plan-assignment remains optional and is not yet
   supported by current provisioning request shapes

Why other candidate classes are not next:

1. full Module C is broader than necessary for the next bounded opening because the design itself
   lists contracts and routes as part of the larger boundary
2. operator plan-assignment would widen into provisioning/backend semantics because the current
   request shape carries tenant category and white-label capability, but no plan field
3. conditionally eligible family anchors remain non-selectors under current live-spine rules and do
   not produce a safer exact implementation allowlist than this narrowed Subscription unit

## Modify Allowlist

Modify only:

1. `services/controlPlaneService.ts`
2. `services/tenantService.ts`

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
10. `components/ControlPlane/TenantDetails.tsx`
11. `components/ControlPlane/TenantRegistry.tsx`
12. `types.ts`
13. `services/controlPlaneService.ts`
14. `services/tenantService.ts`
15. `server/src/services/tenantProvision.service.ts`
16. `server/src/types/tenantProvision.types.ts`

## Approved Commands

Approved terminal commands for the next implementation pass:

1. `git diff --name-only`
2. `git status --short`
3. `pnpm exec eslint services/controlPlaneService.ts services/tenantService.ts --ext ts,tsx --report-unused-disable-directives --max-warnings 0`
4. `pnpm exec tsc --noEmit`

## Validation Commands

Validation commands for the next implementation pass:

1. `pnpm exec eslint services/controlPlaneService.ts services/tenantService.ts --ext ts,tsx --report-unused-disable-directives --max-warnings 0`
2. `pnpm exec tsc --noEmit`
3. `git diff --check`

## Stop Conditions

Stop immediately and do not widen scope if any of the following becomes true during the next
implementation pass:

1. truthful service-boundary tightening requires modifying `types.ts`, `App.tsx`,
   `components/ControlPlane/TenantDetails.tsx`, or `components/ControlPlane/TenantRegistry.tsx`,
   because that would reopen closed slice 1 or slice 2 surfaces
2. truthful tightening requires `shared/contracts/openapi.tenant.json`,
   `shared/contracts/openapi.control-plane.json`, `server/src/routes/tenant.ts`,
   `server/src/services/tenantProvision.service.ts`, or
   `server/src/types/tenantProvision.types.ts`, because that would widen into the broader Module C
   bundle or into slice 4 provisioning semantics
3. the unit starts redefining product-wide entitlement meaning or AI budget behavior rather than
   tightening plan metadata at the frontend service boundary
4. the unit starts adding explicit plan-selection, provisioning-choice, or onboarding commercial
   assignment behavior
5. any additional modify target beyond the two service files becomes necessary to complete the unit
   truthfully

## Completion Checklist

- [x] Mandatory pre-flight completed before write
- [x] No file-creep blocker found before write
- [x] Current zero-open control posture preserved
- [x] Closed Subscription slice 2 baseline preserved as fixed
- [x] Strongest realistic candidate next units compared on bounded criteria
- [x] Exactly one next implementation unit selected
- [x] Exact modify allowlist defined
- [x] Exact read-only evidence set defined
- [x] Exact approved commands defined
- [x] Exact validation commands defined
- [x] Exact stop conditions defined
- [x] No implementation code opened in this pass
- [x] No control file edited in this pass
- [x] No product-truth doc edited in this pass
- [x] Decision outcome recorded as `NEXT_IMPLEMENTATION_UNIT_OPENED`