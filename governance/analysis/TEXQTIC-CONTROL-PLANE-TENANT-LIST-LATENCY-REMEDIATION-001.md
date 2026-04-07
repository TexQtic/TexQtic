# TexQtic Control-Plane Tenant-List Latency Remediation 001

## 1. Header

- Date: 2026-04-07
- Type: bounded remediation record
- Scope: control-plane tenant-list duplicate-read containment, single-request latency reduction, and default summary-load slimming only

## 2. Opening Scope

This record now covers three bounded remediation units on the same Super Admin tenant-list entry path inside the Staff Control Plane.

Unit A allowed focus:

- `getTenants()` call sites on initial control-plane entry
- duplicate or overlapping tenant-list reads
- minimum containment needed to reduce avoidable request duplication

Unit B allowed focus:

- the control-plane tenant route and handler behind `GET /api/control/tenants`
- directly relevant query shape and helper usage behind the tenant-list read
- `services/controlPlaneService.ts` only insofar as it remained the active client entry point
- this remediation record only for final evidence sync

Unit C allowed focus:

- the default `/api/control/tenants` response shape used by first-entry Tenant Registry continuity
- the minimum frontend adjustment required if the default payload became summary-only
- `components/ControlPlane/TenantRegistry.tsx` only insofar as deeper tenant detail moved behind the existing detail endpoint
- `services/controlPlaneService.ts` only insofar as summary/detail typing needed to stay truthful

These units did not:

- redesign `/api/me` bootstrap gating
- change unrelated control-plane views
- broaden into catalog or tenant-shell fetch cleanup
- reopen Audit Logs, DPP, impersonation, or route-contract redesign

## 3. Confirmed Defect Baseline

The settled baseline before any remediation remained:

- Super Admin was still `SLOW_LOAD_BUT_RECOVERS`
- the strongest observed live bottleneck was tenant-list continuity on `GET /api/control/tenants`
- default control-plane entry had two separate `getTenants()` callers
- no service-layer containment or deduping existed in the control-plane tenant-list path

Exact duplicate-read topology confirmed by repo trace:

- `App.tsx` calls `getTenants()` from a control-plane effect when `appState === 'CONTROL_PLANE'`
- `components/ControlPlane/TenantRegistry.tsx` independently calls `getTenants()` on mount
- default Super Admin entry lands on the `TENANTS` admin view, which mounts `TenantRegistry`
- both callers therefore participate in the same first-entry control-plane load window

After Unit A landed, duplicate reads were contained, but the strongest remaining bottleneck became the latency of the single surviving `/api/control/tenants` request itself.

After Unit B landed, the remaining hot-path question became whether the default first-entry registry load was still paying for tenant-detail fields that the visible registry state did not actually need.

## 4. Root Cause

Unit A fixed this cause:

- the control-plane tenant-list service had no in-flight dedupe or containment
- overlapping first-entry `getTenants()` callers therefore each issued their own network request to `/api/control/tenants`
- this made duplicate tenant-list reads a credible latency amplifier on the already-slow Super Admin entry path

Unit B fixed this follow-on cause:

- the single surviving tenant-list request still performed avoidable relation expansion and aggregate work in `server/src/routes/control.ts`
- the route loaded `domains`, `_count.memberships`, and `_count.auditLogs` for every tenant even though current control-plane list consumers do not use those fields
- the route also performed a separate status-enrichment pass after the main tenant query
- the hot path therefore remained heavier than the current list consumer contract required

Unit C fixed this follow-on cause:

- the default registry first-load path still used a list response that carried data needed only after a tenant row was opened
- default first paint did not need `onboarding_status`, timestamps, or branding detail on every tenant row
- the summary list therefore still paid for detail-oriented fields instead of deferring them behind the existing `GET /api/control/tenants/:id` path

Important boundary note:

- the duplicate caller topology in `App.tsx` and `TenantRegistry.tsx` still exists after these units
- these remediations contain overlapping reads and narrow the list-route payload, rather than redesigning the broader control-plane data-loading model
- Unit C further separates summary load from detail load without redesigning the broader control-plane data-loading model

## 5. Files Changed

Product files changed across these remediation units:

- `services/controlPlaneService.ts`
- `server/src/routes/control.ts`
- `components/ControlPlane/TenantRegistry.tsx`

Governance file changed:

- `governance/analysis/TEXQTIC-CONTROL-PLANE-TENANT-LIST-LATENCY-REMEDIATION-001.md`

No other product files were changed in these units.

## 6. Fix Summary

Unit A applied the minimum truthful containment in `services/controlPlaneService.ts`:

- added an in-flight promise guard for `getTenants()`
- when a tenant-list request is already active, subsequent `getTenants()` callers now await the same promise instead of issuing a second `/api/control/tenants` request
- the in-flight guard clears on completion so later intentional refreshes still perform a fresh read

Unit B applied the minimum truthful route reduction in `server/src/routes/control.ts`:

- narrowed the tenant-list query from broad `include` usage to explicit `select`
- removed `domains`, `_count.memberships`, and `_count.auditLogs` from the hot path
- retained only fields used by current control-plane list consumers: core tenant identity/status fields, minimal branding, and `organizations.status`
- derived `onboarding_status` directly from the selected `organizations.status` relation in the same mapping pass
- left the broader detail-route helper usage intact so the change stayed bounded to the list route only

Unit C applied the minimum truthful summary/detail split:

- slimmed the default `GET /api/control/tenants` path in `server/src/routes/control.ts` down to the visible registry summary fields only
- removed `onboarding_status`, timestamps, and branding detail from the default first-load list response
- kept tenant detail depth behind the already-existing `GET /api/control/tenants/:id` endpoint
- updated `components/ControlPlane/TenantRegistry.tsx` to fetch tenant detail only when a row is opened, preserving the detail-pane continuity without forcing the default registry load to carry detail-only data for all tenants
- updated `services/controlPlaneService.ts` typing so summary reads and detail reads remain truthful under the slimmer default payload

## 7. Verification Evidence

Repo-path verification completed:

- `App.tsx` confirmed one control-plane entry `getTenants()` caller
- `components/ControlPlane/TenantRegistry.tsx` confirmed a second mount-time `getTenants()` caller
- `services/controlPlaneService.ts` confirmed the previous lack of dedupe and now contains the in-flight containment guard
- `server/src/routes/control.ts` confirmed the old broad include path and now contains the narrowed select path
- current `getTenants()` consumers were verified not to require `domains` or `_count` on the default control-plane list path
- `components/ControlPlane/TenantRegistry.tsx` confirmed the default grid only needs summary fields on first paint and can defer deeper tenant data to row-open time

Targeted local verification completed:

- editor diagnostics for `services/controlPlaneService.ts` -> clean
- editor diagnostics for `server/src/routes/control.ts` -> clean
- editor diagnostics for `components/ControlPlane/TenantRegistry.tsx` -> no new errors; one pre-existing inline-style rule remains on the existing AI usage progress bar
- `pnpm exec eslint services/controlPlaneService.ts` -> clean
- `pnpm exec eslint components/ControlPlane/TenantRegistry.tsx services/controlPlaneService.ts` -> clean
- `pnpm -C server exec eslint src/routes/control.ts` -> 0 errors, with only pre-existing `no-explicit-any` warnings elsewhere in the file
- `server/src/__tests__/wave3-realm-isolation.spec.ts` -> 17 passed, 0 failed
- direct injected verification of `GET /api/control/tenants` after Unit B -> `statusCode = 200`, `success = true`, live tenant data returned
- local benchmark of the old query shape failed with Prisma `P2028` after exceeding the 5000 ms interactive transaction window at roughly `6221 ms`
- local benchmark of the new query shape completed successfully with:
  - `tenantCount = 440`
  - `ms = 4654.76`
  - `bytes = 154222`
- local benchmark of the Unit C summary-only default list path completed successfully with:
  - `listStatus = 200`
  - `listMs = 3628.86`
  - `listBytes = 101213`
  - `tenantCount = 440`
  - `firstTenantKeys = id, slug, name, type, status, plan, isWhiteLabel`
- local detail-handoff verification after Unit C completed successfully with:
  - `detailStatus = 200`
  - `detailMs = 5000.22`
  - tenant detail still returned the expected deeper keys including `domains`, `branding`, `aiBudget`, `memberships`, and `onboarding_status`

Additional local note:

- `server/src/__tests__/gate-e-2-cross-realm.integration.test.ts` still had one unrelated failure on `/api/control/system/health` returning `401` instead of `200`; this was not caused by the tenant-list route change and was not used as a blocker for this bounded remediation unit

Push/deploy verification outcome:

- Unit A fix commit `348dbc22df27dee6595439640099208b5d1c8bfc` was pushed to `origin/main`
- Unit B fix commit `003ce7a23c59fa586950fd07cc785ce00db63451` was pushed to `origin/main`
- Unit C fix commit `6642793a1254930c9d919d8a423cdcf35e80fc9d` was pushed to `origin/main`
- production verification was completed against `https://app.texqtic.com/`

Production runtime verification completed:

- Staff Control Plane login succeeded
- Tenant Registry hydrated successfully with live tenant data (`TOTAL TENANTS = 440`)

Production posture after Unit A duplicate-read containment:

- first entry recorded exactly one `/api/control/tenants` request:
  - `count = 1`
  - `startMs = 9457`
  - `durationMs = 9418`
  - `elapsedMs = 22062`
- reload also recorded exactly one `/api/control/tenants` request:
  - `count = 1`
  - `startMs = 1379`
  - `durationMs = 9037`
  - `elapsedMs = 10527`

Production posture after Unit B single-request latency reduction:

- first entry still recorded exactly one `/api/control/tenants` request:
  - `count = 1`
  - `startMs = 58375`
  - `durationMs = 5634`
  - `elapsedMs = 23078`
- reload still recorded exactly one `/api/control/tenants` request:
  - `count = 1`
  - `startMs = 136`
  - `durationMs = 7743`
  - `elapsedMs = unavailable from the captured browser timing export`

Production posture after Unit C default summary-load slimming:

- fresh Staff Control Plane login still succeeded
- Tenant Registry still loaded correctly with `TOTAL TENANTS = 440`
- first entry still recorded exactly one `/api/control/tenants` request:
  - `count = 1`
  - `startMs = 7712691`
  - `durationMs = 5170`
  - `elapsedMs = 43224`
- row-to-detail continuity still worked in production after the summary/detail split:
  - first-row config open resolved into the tenant deep-dive successfully
  - deep-dive rendered core identity and overview content for the selected tenant
- reload still recorded exactly one `/api/control/tenants` request:
  - `count = 1`
  - `startMs = 1481`
  - `durationMs = 5091`
  - `elapsedMs = unavailable from the captured browser timing export`

Therefore runtime result for the current overall posture remains:

- `PARTIAL_IMPROVEMENT`

## 8. Current Posture

What is now truthfully proven in production:

- overlapping first-entry `getTenants()` callers no longer produce overlapping network requests
- duplicate-read containment is live for both first entry and reload
- the remaining single `/api/control/tenants` request is materially faster after the route narrowing
- the default first-entry registry load is materially faster again after the summary/detail split
- control-plane login and Tenant Registry hydration still succeed after all three remediations
- default row-to-detail continuity still succeeds after Unit C moved detail-only fields off the first-load path

Measured production improvement now proven:

- first-entry single-request duration improved from `9418 ms` to `5634 ms`
- reload single-request duration improved from `9037 ms` to `7743 ms`
- first-entry single-request duration improved again from `5634 ms` to `5170 ms`
- reload single-request duration improved again from `7743 ms` to `5091 ms`

What remains unresolved:

- the remaining single `/api/control/tenants` request is still slow enough to preserve the broader `SLOW_LOAD_BUT_RECOVERS` posture
- this bounded work did not introduce pagination, bootstrap redesign, or broader control-plane data-model changes
- the underlying tenant list is still large enough that further closure work would require a different remediation class than these three narrow fixes

## 9. Close Recommendation

This record should not be treated as a full closure of the tenant-list latency problem.

Truthful current posture:

- duplicate-read containment = implemented and proven
- single-request route-shape reduction = implemented and production-improved
- default summary-load slimming = implemented and production-improved
- targeted local verification = passed
- push/deploy verification = completed
- production continuity = proven
- remaining bottleneck = single-request tenant-list latency at a still-slow runtime level
- final runtime result = `PARTIAL_IMPROVEMENT`
- unit close status = partial improvement only, not full closure

## 10. Footer

NO_OPENING_AUTHORITY_CREATED