# TexQtic Control-Plane Tenant-List Latency Remediation 001

## 1. Header

- Date: 2026-04-07
- Type: bounded remediation record
- Scope: control-plane tenant-list latency and duplicate-read containment only

## 2. Opening Scope

This unit was limited to the Super Admin tenant-list entry path inside the Staff Control Plane.

Allowed focus in this unit:

- `getTenants()` call sites on initial control-plane entry
- duplicate or overlapping tenant-list reads
- minimum containment needed to reduce avoidable request duplication

This unit did not:

- redesign `/api/me` bootstrap gating
- change unrelated control-plane views
- broaden into catalog or tenant-shell fetch cleanup
- reopen Audit Logs, DPP, or impersonation work

## 3. Confirmed Defect Baseline

The settled baseline before remediation remained:

- Super Admin is still `SLOW_LOAD_BUT_RECOVERS`
- the strongest observed live bottleneck is tenant-list continuity on `GET /api/control/tenants`
- default control-plane entry currently has two separate `getTenants()` callers
- no service-layer containment or deduping existed in the control-plane tenant-list path

Exact duplicate-read topology confirmed by repo trace:

- `App.tsx` calls `getTenants()` from a control-plane effect when `appState === 'CONTROL_PLANE'`
- `components/ControlPlane/TenantRegistry.tsx` independently calls `getTenants()` on mount
- default Super Admin entry lands on the `TENANTS` admin view, which mounts `TenantRegistry`
- both callers therefore participate in the same first-entry control-plane load window

## 4. Root Cause

The precise cause fixed in this unit was not the full tenant-list latency itself.

The exact cause fixed was:

- the control-plane tenant-list service had no in-flight dedupe or containment
- overlapping first-entry `getTenants()` callers therefore each issued their own network request to `/api/control/tenants`
- this made duplicate tenant-list reads a credible latency amplifier on the already-slow Super Admin entry path

Important boundary note:

- the duplicate caller topology in `App.tsx` and `TenantRegistry.tsx` still exists after this unit
- this remediation contains the overlapping network request, rather than redesigning the broader control-plane data-loading model

## 5. Files Changed

Product file changed:

- `services/controlPlaneService.ts`

Governance file changed:

- `governance/analysis/TEXQTIC-CONTROL-PLANE-TENANT-LIST-LATENCY-REMEDIATION-001.md`

No other product files were changed in this unit.

## 6. Fix Summary

Applied the minimum truthful fix in `services/controlPlaneService.ts`:

- added an in-flight promise guard for `getTenants()`
- when a tenant-list request is already active, subsequent `getTenants()` callers now await the same promise instead of issuing a second `/api/control/tenants` request
- the in-flight guard clears on completion so later intentional refreshes still perform a fresh read

This keeps current component behavior intact while removing the avoidable overlapping network duplication during first-entry control-plane load.

## 7. Verification Evidence

Repo-path verification completed:

- `App.tsx` confirmed one control-plane entry `getTenants()` caller
- `components/ControlPlane/TenantRegistry.tsx` confirmed a second mount-time `getTenants()` caller
- `services/controlPlaneService.ts` confirmed the previous lack of dedupe and now contains the in-flight containment guard

Targeted local verification completed:

- editor diagnostics for `services/controlPlaneService.ts` -> clean
- `pnpm exec eslint services/controlPlaneService.ts` -> clean

Push/deploy verification outcome:

- fix commit `348dbc22df27dee6595439640099208b5d1c8bfc` was pushed to `origin/main`
- production verification was then completed against `https://app.texqtic.com/`

Production runtime verification completed:

- Staff Control Plane login succeeded
- Tenant Registry hydrated successfully with live tenant data (`TOTAL TENANTS = 440`)
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

Therefore runtime result for this unit is:

- `PARTIAL_IMPROVEMENT`

## 8. Current Posture

What is now truthfully proven in production:

- overlapping first-entry `getTenants()` callers no longer produce overlapping network requests
- duplicate-read containment is live for both first entry and reload
- control-plane login and Tenant Registry hydration still succeed after the containment fix

What remains unresolved:

- the remaining single `/api/control/tenants` request is still slow at roughly 9 seconds
- Super Admin tenant-list continuity still fits `SLOW_LOAD_BUT_RECOVERS` at the broader runtime level
- this unit did not remove the underlying single-request tenant-list latency bottleneck

## 9. Close Recommendation

This unit should not be treated as a full closure of the tenant-list latency problem.

Truthful current posture:

- code fix implemented = yes
- targeted local verification = passed
- push/deploy verification = completed
- production duplicate-read containment = proven
- remaining bottleneck = single-request tenant-list latency
- final runtime result = `PARTIAL_IMPROVEMENT`
- unit close status = partial improvement only, not full closure

## 10. Footer

NO_OPENING_AUTHORITY_CREATED