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

Runtime verification status:

- truthful live verification of the modified code was not completed in this unit
- attempted local browser targets returned connection refusal:
  - `http://127.0.0.1:5173/` -> `ERR_CONNECTION_REFUSED`
  - `http://127.0.0.1:4173/` -> `ERR_CONNECTION_REFUSED`
  - `http://127.0.0.1:3001/health` -> `ERR_CONNECTION_REFUSED`
- no deploy/push step was in scope for this prompt

Therefore runtime result for this unit is:

- `BLOCKED`

## 8. Current Posture

What is truthfully improved by code inspection and local verification:

- overlapping first-entry `getTenants()` callers no longer need to produce overlapping network requests
- the duplicate-read amplifier has been contained at the narrowest directly relevant layer

What is not yet truthfully proven:

- actual live Super Admin entry improvement timing
- whether tenant-list continuity now feels materially faster in runtime
- whether further work is still required beyond duplicate-read containment

## 9. Close Recommendation

This unit should not yet be treated as truthfully closed.

Truthful current posture:

- code fix implemented = yes
- targeted local verification = passed
- runtime verification of the modified build = blocked
- unit close status = not yet closed

The next bounded runtime-sensitive lane remains:

- `/api/me` bootstrap gating

## 10. Footer

NO_OPENING_AUTHORITY_CREATED