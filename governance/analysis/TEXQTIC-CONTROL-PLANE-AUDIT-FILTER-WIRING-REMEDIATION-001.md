# TexQtic Control-Plane Audit Filter Wiring Remediation 001

## 1. Header

- Date: 2026-04-07
- Type: bounded wiring remediation record
- Scope: control-plane audit filter/search continuity only

## 2. Opening Scope

This unit was limited to the control-plane audit-log filter/search gap identified by the runtime-to-implementation wiring audit.

Allowed focus in this unit:

- control-plane audit log UI controls
- control-plane service request shape
- matching backend route/query behavior
- minimum viable frontend remediation needed to use existing backend support

This unit did not:

- broaden into control-plane redesign
- change the audit-log data model
- change unrelated control-plane panels
- reopen DPP, impersonation, orders, or slow-load work

## 3. Confirmed Defect Baseline

Confirmed authoritative baseline before remediation:

- the backend already accepted audit-log query parameters on `GET /api/control/audit-logs`
- the supported parameters were `tenantId`, `action`, and `limit`
- the control-plane service wrapper already supported those same query parameters
- the control-plane `AuditLogs` component still fetched only `limit: 50`
- the visible search/filter affordances in the `AuditLogs` component were disabled and not wired

This confirmed the gap as:

- existing backend capability present
- frontend continuity absent
- bounded wiring defect rather than shell-only fake UI

## 4. Root Cause

Root cause was frontend-only.

Exact issue:

- `components/ControlPlane/AuditLogs.tsx` rendered a disabled text input and disabled filter button
- the component never passed `tenantId` or `action` into `getAuditLogs(...)`
- the UI copy also implied broader “search by admin or action” behavior than the current backend contract actually supports

Refined live-production crash cause confirmed after the wiring fix:

- the live Audit Logs page rendered rows using `log.actorId.substring(0, 8)`
- the same render path also used `log.tenantId.substring(0, 8)` when no tenant object was present
- the production audit-log payload can lawfully contain `actorId = null`
- the production audit-log payload can lawfully contain `tenantId = null`
- the page therefore crashed in the row render path before the now-wired filter controls could be truthfully exercised

The backend route remained successful during live verification; the failure was null-unsafe frontend rendering against a truthful nullable payload.

Second-pass root cause confirmed after commit `dee2a8d` deployed:

- the deployed Audit Logs bundle still retained `substring()`-based preview helpers in the live row-render path
- the first pass narrowed obvious null field access, but it did not eliminate `substring()` from the Audit Logs page surface itself
- the Audit Logs page was also still typed against `metadata` while the live API payload exposes `metadataJson`
- the narrow truthful fix was therefore to remove `substring()` from the Audit Logs render surface entirely and align the page with the actual audit-log response shape used in production

The backend route and the control-plane service wrapper did not require change for this unit.

## 5. Files Changed

Product file changed:

- `components/ControlPlane/AuditLogs.tsx`
- `services/controlPlaneService.ts`

Governance record changed:

- `governance/analysis/TEXQTIC-CONTROL-PLANE-AUDIT-FILTER-WIRING-REMEDIATION-001.md`

## 6. Fix Summary

Applied the minimum viable frontend fix in `components/ControlPlane/AuditLogs.tsx`:

- enabled the control-plane audit controls
- replaced the misleading disabled placeholder with truthful supported filters:
  - `action` exact-match filter
  - `tenantId` admin query filter
- added `Apply` and `Clear` actions
- wired Enter key handling for both inputs
- moved fetch behavior onto an `activeFilters` state so the component now refetches when filters are applied or cleared
- preserved the existing initial load behavior at `limit: 50`
- kept the backend/service contract unchanged
- clarified the UI help text so it reflects the actual backend support instead of implying unsupported actor/admin search behavior

Additional bounded render-safety fix after truthful production failure:

- updated the directly related `AuditLog` type to reflect live nullable `actorId`, `tenantId`, and optional `tenant`
- replaced direct `substring(...)` calls on nullable audit identifiers with null-safe preview helpers
- added explicit, truthful fallback display values for nullable fields:
  - `ACTOR_TYPE:(no actor id)`
  - `(no tenant context)`
- hardened metadata preview generation so it does not assume a truthy stringified value
- preserved the already-implemented exact-match filter/search wiring and current backend semantics

Second-pass bounded crash fix after the first deployed null-safety attempt still failed:

- aligned the Audit Logs page to the actual control-plane audit response fields:
  - `realm`
  - `entity`
  - `entityId`
  - `beforeJson`
  - `afterJson`
  - `metadataJson`
  - `reasoningLogId`
- removed `substring()` entirely from the Audit Logs render surface and replaced previewing with stricter string guards plus `slice()`-based formatting
- made action, timestamp, actor-type, tenant, and metadata preview rendering explicit for non-string or empty values
- preserved the current exact-match `tenantId` and `action` filter semantics unchanged

## 7. Verification Evidence

Code-contract verification completed:

- backend route confirmed existing support for:
  - `tenantId`
  - `action`
  - `limit`
- control-plane service wrapper confirmed existing support for the same query shape
- edited component validated cleanly with editor diagnostics after the fix

Targeted validation result:

- `components/ControlPlane/AuditLogs.tsx` -> no errors
- `services/controlPlaneService.ts` -> no errors
- `pnpm exec eslint components/ControlPlane/AuditLogs.tsx services/controlPlaneService.ts` -> clean

Runtime verification status:

- post-push production verification was re-run with a real authenticated control-plane super-admin session after second-pass commit `3219873`
- the deployed production bundle changed from `index-CmAL0DYK.js` to `index-vHRtfJGu.js`
- Staff Control Plane login succeeded and the control-plane shell remained authenticated after reload
- the live `GET /api/control/audit-logs?limit=50` request returned `200`
- the Audit Logs page rendered and stayed usable with no error boundary on the live payload
- the current unfiltered live payload still contained nullable ids while the page remained stable:
  - `nullActorIdCount = 2`
  - `nullTenantIdCount = 40`
- tenant filter verification via `Apply` succeeded:
  - request: `GET /api/control/audit-logs?tenantId=960c2e3b-64cf-4ba8-88d1-4e8f72d61782&limit=50`
  - response: `200`
  - rendered rows: `50`
  - visible results updated to the `white-label-co` tenant slice
- action filter verification via `Enter` succeeded:
  - request: `GET /api/control/audit-logs?action=ADMIN_AUDIT_LOG_VIEW&limit=50`
  - response: `200`
  - rendered rows: `27`
  - visible results updated to the exact-match `ADMIN_AUDIT_LOG_VIEW` slice
- `Clear` succeeded:
  - request: `GET /api/control/audit-logs?limit=50`
  - response: `200`
  - both inputs reset to empty
  - rendered rows returned to the unfiltered `50` row state

## 8. Residual Limits / Adjacent Findings

Residual limitation in this unit:

- no remaining page-level blocker was observed in the bounded Audit Logs surface after second-pass deployment

Adjacent finding kept out of scope:

- backend still supports only exact-match `action` and `tenantId` filtering
- broader actor/admin search is not implemented server-side and was not added here

## 9. Close Recommendation

This remediation should be treated as the bounded fix for the confirmed frontend wiring gap.

Production verification recheck on 2026-04-07 completed and passed after the second-pass crash fix.

Observed live production truth:

- a real authenticated super-admin session was obtained through the production `Staff Control Plane` flow
- the live `GET /api/control/audit-logs?limit=50` request fired and returned `200`
- the deployed second-pass bundle rendered the Audit Logs page without crashing on live rows that still contained nullable ids
- filter/search continuity was truthfully completed end to end on the deployed build:
  - tenant filter via `Apply`
  - action filter via `Enter`
  - `Clear` reset

Bounded supporting evidence gathered during the same authenticated production session:

- direct authenticated audit-log API reads returned `200`
- the unfiltered response returned `50` rows
- the live payload still included rows where `actorId` was `null`
- the live payload still included rows where `tenantId` was `null`
- exact-match backend filtering responded successfully for both:
  - `tenantId`
  - `action`
- second-pass commit created: `3219873`
- second-pass push result: `main -> main` succeeded

Current close posture:

- production verification result = `PASSED`
- this unit is now truthfully closed
- no second remediation artifact was required

## 10. Footer

NO_OPENING_AUTHORITY_CREATED