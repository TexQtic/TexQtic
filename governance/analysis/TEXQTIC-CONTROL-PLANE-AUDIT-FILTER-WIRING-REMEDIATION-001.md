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

The backend route and the control-plane service wrapper did not require change for this unit.

## 5. Files Changed

Product file changed:

- `components/ControlPlane/AuditLogs.tsx`

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

Recommended next close step:

- run one authenticated control-plane runtime recheck to confirm:
  - audit page still loads
  - action filter request fires with the expected query string
  - tenant filter request fires with the expected query string
  - visible results update consistently

If that runtime pass succeeds, this unit can close as a completed frontend wiring remediation with no backend expansion required.

## 10. Footer

NO_OPENING_AUTHORITY_CREATED