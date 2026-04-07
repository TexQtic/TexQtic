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

- a live authenticated control-plane session was not available in the browser at remediation time
- therefore the live admin-page recheck could not be truthfully completed in this unit

What is still verified despite that runtime limitation:

- the request contract now matches the backend contract exactly
- the controls are no longer disabled in code
- the component now issues requests using supported filter params instead of a hardcoded unfiltered load only

## 8. Residual Limits / Adjacent Findings

Residual limitation in this unit:

- no live authenticated control-plane runtime pass was available to re-observe the control-plane audit page with the new filters in production

Adjacent finding kept out of scope:

- backend still supports only exact-match `action` and `tenantId` filtering
- broader actor/admin search is not implemented server-side and was not added here

## 9. Close Recommendation

This remediation should be treated as the bounded fix for the confirmed frontend wiring gap.

Production verification recheck on 2026-04-07 completed and failed.

Observed live production truth:

- a real authenticated super-admin session was obtained through the production `Staff Control Plane` flow
- the live `GET /api/control/audit-logs?limit=50` request fired and returned `200`
- the Audit Logs page then crashed into the error boundary with `Cannot read properties of null (reading 'substring')`
- the page therefore did not remain usable long enough to truthfully exercise the visible filter controls end to end

Bounded supporting evidence gathered during the same authenticated production session:

- direct authenticated audit-log API reads returned `200`
- the unfiltered response returned `50` rows
- the live payload included rows where `actorId` was `null`
- the live payload included rows where `tenantId` was `null`
- exact-match backend filtering itself still responded successfully for both:
  - `tenantId`
  - `action`

Current close posture:

- production verification result = `FAILED`
- this unit is not truthfully closed
- the pushed filter wiring fix cannot be considered production-verified because the live page now fails before filter interaction can be completed

Post-remediation status after the null-safe rendering fix:

- the bounded frontend render-safety fix is now implemented locally
- targeted diagnostics and targeted lint are clean
- truthful post-fix production verification is currently `BLOCKED` because the updated frontend code has not yet been deployed to `https://app.texqtic.com`
- until that deployment happens, the production browser can only observe the previously deployed crashing bundle, not the local remediation
- this unit is therefore still not truthfully closed

## 10. Footer

NO_OPENING_AUTHORITY_CREATED