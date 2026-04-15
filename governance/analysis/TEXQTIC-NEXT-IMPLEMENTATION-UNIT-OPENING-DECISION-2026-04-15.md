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
implementation, verification, closeout, and clean-state restoration of Subscription slice 3B,
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

Fixed closed-baseline facts preserved:

1. slice 2 remains implemented, deployed-verified, and closed
2. slice 3A remains implemented, VERIFIED_CLEAN, and closed
3. slice 3B remains implemented from commit `af5827a`, VERIFIED_CLEAN, and closed
4. no product-facing implementation unit is currently open
5. zero-open posture remains intact until one exact next unit is lawfully selected
6. no White Label work, no broader governance chain, and no Tenant Registry future-cycle
   observation may be reopened here

## Candidate Units Considered

### Candidate 1

- `Subscription slice 3 — broader remaining backend runtime/helper tightening`

Bounded meaning:

- continue beyond slice 3B into the remaining backend runtime and helper plan surfaces as one
  broader bundle
- treat the organization-identity helper seam, tenant route seam, and any adjacent downstream
  backend consumers as one continuation unit

### Candidate 2

- `Subscription slice 3C — backend runtime plan canonicalization and typing tightening`

Bounded meaning:

- canonicalize the backend runtime seam for `organizations.plan` to the canonical four-plan
  vocabulary
- tighten the tenant route identity/runtime consumption to the canonical backend plan type
- keep the unit inside `server/src/lib/database-context.ts` and `server/src/routes/tenant.ts`
- do not widen into provisioning, auth expansion, contracts, UI, or operator plan assignment

### Candidate 3

- `Subscription slice 4 — bounded operator plan-assignment refinement`

Bounded meaning:

- add or clarify explicit operator-admin plan assignment during provisioning or adjacent admin
  workflow

## Comparison of Candidates

| Candidate | Launch-Acceleration Value | Boundedness | Authority Cleanliness | Dependency Readiness | Broader Reopening Risk | Smallest Safe Modify Allowlist | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Subscription slice 3 — broader remaining backend runtime/helper tightening` | `MEDIUM-HIGH` | `MEDIUM-LOW` | `MEDIUM` | `MEDIUM` | `HIGH` | backend route + helper + possible adjacent consumers | `REJECTED AS TOO BROAD` |
| `Subscription slice 3C — backend runtime plan canonicalization and typing tightening` | `MEDIUM-HIGH` | `HIGH` | `HIGH` | `HIGH` | `LOW` | `server/src/lib/database-context.ts`, `server/src/routes/tenant.ts` | `SELECT` |
| `Subscription slice 4 — bounded operator plan-assignment refinement` | `MEDIUM` | `LOW` | `MEDIUM-LOW` | `LOW` | `HIGH` | provisioning/service/admin workflow bundle | `REJECTED AS NOT READY` |

Exact comparison basis from current repo truth:

1. slice 3A already tightened the two frontend service boundaries to canonical `CommercialPlan`
   typing
2. slice 3B already tightened the tenant-plane and control-plane OpenAPI `plan` fields to the
   canonical four-plan metadata contract and kept plan meaning metadata-only
3. the exact remaining backend plan drift is localized to two runtime declarations:
   `server/src/lib/database-context.ts` still exposes `OrganizationIdentity.plan: string`, and
   `server/src/routes/tenant.ts` still exposes `TenantSessionIdentity.plan: string`
4. canonical backend plan identity already exists as `TenantPlan = 'FREE' | 'STARTER' |
   'PROFESSIONAL' | 'ENTERPRISE'` in `server/src/types/index.ts`
5. `organizations.plan` remains text-backed in repo truth (`String` in `schema.prisma`,
   `VARCHAR(30)` in migration SQL, and sync path fed by `NEW.plan::text`), so the next lawful move
   is runtime canonicalization at the helper/route seam rather than a blind persistence-type swap
6. provisioning request and service truth still contain no explicit plan-selection input, so slice 4
   would widen into backend/provisioning semantics immediately
7. the separate Tenant Registry closed/open segregation observation remains out of scope and is not
   a selector for this next-unit decision

## Selected Next Unit

`Subscription slice 3C — backend runtime plan canonicalization and typing tightening`

## Why This Unit Is Next

This unit is next because it is the smallest implementation-ready continuation after the closed
slice 3B contract tightening.

Why it wins on bounded merits:

1. it directly continues the remaining subscription plan drift at the backend runtime seam without
   reopening the already closed service, contract, provisioning, or UI slices
2. it matches the exact remaining drift surface in current repo truth: one shared organization
   identity helper and one tenant-route runtime identity declaration
3. it has a crisp two-file allowlist and does not require mutation of auth, provisioning,
   contracts, or UI to begin truthfully
4. it respects the actual storage truth that `organizations.plan` is text-backed, so the unit can
   canonicalize runtime behavior at the seam instead of pretending the persistence layer is already
   a native enum on that table
5. it is cleaner than the broader remaining backend bundle because the seam can still be addressed
   inside the helper plus the immediate tenant-route consumer without widening to adjacent backend
   consumers at opening time
6. it is cleaner than slice 4 because explicit operator plan assignment remains unready under the
   current provisioning request shape

Why other candidate classes are not next:

1. the broader remaining backend runtime/helper continuation is not the smallest lawful move
   because it weakens the allowlist boundary immediately beyond the exact helper-and-route seam
2. slice 4 remains blocked by dependency readiness because provisioning truth still has no explicit
   operator plan-selection input
3. no other subscription-adjacent candidate yields a smaller safe modify allowlist than the exact
   two-file backend seam selected here

## Modify Allowlist

Modify only:

1. `server/src/lib/database-context.ts`
2. `server/src/routes/tenant.ts`

No additional modify targets are opened by this decision.

## Read-Only Evidence Set

Read-only evidence set for the next implementation pass:

1. `governance/control/NEXT-ACTION.md`
2. `governance/control/OPEN-SET.md`
3. `governance/control/BLOCKED.md`
4. `governance/control/SNAPSHOT.md`
5. `docs/governance/control/GOV-OS-001-DESIGN.md`
6. `governance/control/TEXQTIC-OPENING-LAYER-GOVERNANCE-AUTHORITY-AND-POINTER-LAYER-2026-04-10.md`
7. `governance/analysis/TEXQTIC-LIVE-AUTHORITY-SPINE-RECONCILIATION-DECISION-2026-04-14.md`
8. `governance/analysis/TEXQTIC-APRIL-13-14-WAVE-ELEVATION-DECISION-2026-04-14.md`
9. `governance/analysis/TEXQTIC-FAMILY-UNIT-CONDITIONAL-ELEVATION-ELIGIBILITY-DECISION-2026-04-14.md`
10. `docs/product-truth/SUBSCRIPTION-ENTITLEMENT-IMPLEMENTATION-DESIGN-v1.md`
11. `server/src/routes/tenant.ts`
12. `server/src/lib/database-context.ts`
13. `server/src/config/index.ts`
14. `server/src/types/index.ts`
15. `server/prisma/schema.prisma`
16. `server/prisma/migrations/**/migration.sql`
17. `shared/contracts/openapi.tenant.json`
18. `shared/contracts/openapi.control-plane.json`
19. `services/controlPlaneService.ts`
20. `services/tenantService.ts`
21. `TEXQTIC-NEXT-IMPLEMENTATION-UNIT-OPENING-DECISION-2026-04-15.md`

## Approved Commands

Approved terminal commands for the next implementation pass:

1. `git diff --name-only`
2. `git status --short`
3. `pnpm -C server exec eslint src/routes/tenant.ts src/lib/database-context.ts`
4. `pnpm -C server exec tsc --noEmit`
5. `git diff --check`

## Validation Commands

Validation commands for the next implementation pass:

1. `pnpm -C server exec eslint src/routes/tenant.ts src/lib/database-context.ts`
2. `pnpm -C server exec tsc --noEmit`
3. `git diff --check`

## Stop Conditions

Stop immediately and do not widen scope if any of the following becomes true during the next
implementation pass:

1. truthful fix requires edits outside `server/src/lib/database-context.ts` and
   `server/src/routes/tenant.ts`
2. the seam cannot be canonicalized to `FREE | STARTER | PROFESSIONAL | ENTERPRISE` without
   broader runtime or provisioning changes
3. the pass starts drifting into auth, provisioning, contracts, or UI
4. `git diff --check` fails from local normalization and needs separate blocker-resolution

## Completion Checklist

- [x] mandatory pre-flight completed before write
- [x] no file-creep blocker found before write
- [x] slice 2 treated as fixed and closed
- [x] slice 3A treated as fixed, verified clean, and closed
- [x] slice 3B treated as fixed, verified clean, and closed
- [x] exactly one next implementation unit selected
- [x] exact modify allowlist defined
- [x] exact approved commands defined
- [x] exact validation commands defined
- [x] exact stop conditions defined
- [x] no implementation code opened in this pass
- [x] exactly one atomic commit created