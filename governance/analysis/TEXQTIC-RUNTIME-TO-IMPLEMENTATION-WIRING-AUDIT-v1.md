# TexQtic Runtime-to-Implementation Wiring Audit v1

## Authority and Scope

- Runtime authority for this audit is `governance/analysis/TEXQTIC-CORRECTED-RUNTIME-TRUTH-EVIDENCE-RECORD-v1.md`.
- The earlier flawed runtime report is explicitly excluded from this audit.
- Repo posture was checked against Layer 0 control authority before tracing implementation:
  - `governance/control/DOCTRINE.md`
  - `docs/governance/control/GOV-OS-001-DESIGN.md`
  - `governance/control/OPEN-SET.md`
  - `governance/control/NEXT-ACTION.md`
  - `governance/control/BLOCKED.md`
- This unit is audit-only. It creates no opening authority, no product delivery authority, and no product/runtime code changes.

## Method

- Start from corrected runtime truth, not from repo claims.
- For each surface, trace the active path across:
  - top-level app routing
  - shell/navigation surface
  - rendered panel/component
  - client/service call
  - backend route presence
- Use the bounded classification set requested for this audit:
  - `WORKING_END_TO_END`
  - `WORKING_BUT_THIN`
  - `SLOW_LOAD_BUT_RECOVERS`
  - `FRONTEND_PRESENT_BACKEND_MISSING`
  - `BACKEND_PRESENT_FRONTEND_NOT_WIRED`
  - `UI_PLACEHOLDER_OR_INERT`
  - `WIRING_DEFECT`
  - `NON_WIRING_RUNTIME_DEFECT`
  - `INTENTIONALLY_BOUNDED_OR_DEFERRED`
  - `NEEDS_TARGETED_RUNTIME_RECHECK`

## Executive Readout

- The corrected live shells are real routed surfaces, not shell-only facades. The strongest repeated runtime issue is slow recovery/bootstrap, not absent frontend-backend continuity.
- The cleanest current end-to-end continuity is app-side auth/sign-in, tenant audit-log read, and control-plane tenant list/detail continuity.
- Several major surfaces are real but explicitly bounded: RFQ continuity, tenant deep-dive secondary tabs, WL admin collections, and enterprise audit-log depth.
- The clearest repo-confirmed wiring gap in the audited set is control-plane audit filtering: the backend accepts filters, while the current frontend search/filter affordances remain disabled.
- Historical WL stub residue still exists in the repo, but it is not currently routed into the live WL admin shell.

## Surface Matrix

| Surface | Corrected Runtime Baseline | Repo Wiring Truth | Classification | Audit Notes |
| --- | --- | --- | --- | --- |
| Super Admin / Staff Control Plane | Live verified as slow but recoverable | `App.tsx` routes `adminView` into real control-plane components; `layouts/SuperAdminShell.tsx` exposes live nav; `/api/control/*` routes are registered in `server/src/index.ts` and implemented in `server/src/routes/control.ts` plus admin plugins | `SLOW_LOAD_BUT_RECOVERS` | Current defect shape is runtime slowness/bootstrap recovery, not missing wiring. |
| Tenant Registry / tenant-management continuity | Observed within the corrected control-plane run | `components/ControlPlane/TenantRegistry.tsx` calls `getTenants()` and `provisionTenant()`; `components/ControlPlane/TenantDetails.tsx` uses tenant detail plus approved activation; `App.tsx` opens bounded impersonation flow; `services/controlPlaneService.ts` and `server/src/routes/admin/impersonation.ts` back tenant-context entry | `WORKING_BUT_THIN` | Registry list, detail, approved activation, provisioning, and bounded tenant-context entry are real. The deep-dive is not a full lifecycle suite. |
| Tenant deep-dive secondary tabs | Not a primary corrected runtime target | `components/ControlPlane/TenantDetails.tsx` marks `PLAN`, `FEATURES`, `BILLING`, `RISK`, and `AUDIT` as limited, preview, or separate-surface tabs | `INTENTIONALLY_BOUNDED_OR_DEFERRED` | These tabs preserve topology and boundary framing. They should not be misread as broken wiring by default. |
| Enterprise shell | Live verified as slow but recoverable | `layouts/Shells.tsx` exposes real enterprise nav; `App.tsx` routes `expView` into orders, DPP, RFQ, audit log, members, and related panels | `SLOW_LOAD_BUT_RECOVERS` | The enterprise shell is a real routed shell. Runtime slowness is the current issue, not missing implementation. |
| White-Label shell | Live verified as slow but recoverable | `layouts/Shells.tsx` exposes both storefront and WL admin nav; `App.tsx` routes WL admin views into branding, collections, orders, and domains; `components/WL/WLStorefront.tsx` owns storefront catalog fetch | `SLOW_LOAD_BUT_RECOVERS` | The WL shell is real, with mixed maturity across sub-surfaces, not an inert wrapper. |
| Catalog browse / storefront read path | Indirectly supported by corrected WL and enterprise shell runtime | `components/WL/WLStorefront.tsx` fetches catalog items once via `getCatalogItems()`; `components/WhiteLabelAdmin/WLCollectionsPanel.tsx` reads the same catalog data grouped by category; `server/src/routes/tenant.ts` implements `GET /api/tenant/catalog/items` | `WORKING_END_TO_END` | Read continuity is concrete across shell, service, and backend route. |
| Catalog admin mutation path | Not directly rerun in the corrected live pass | `App.tsx` contains active WL admin add/edit/delete item controls; `services/catalogService.ts` exposes create/update/delete calls; `server/src/routes/tenant.ts` implements `POST`, `PATCH`, and `DELETE` for `/api/tenant/catalog/items` | `NEEDS_TARGETED_RUNTIME_RECHECK` | Repo truth says this is a real path, not a stub. A dedicated live mutation pass is still advisable before calling it runtime-proven. |
| RFQ continuity | Not disproved live, but not fully runtime-proved in the corrected pass | Buyer and supplier list/detail surfaces are routed in `App.tsx`; `components/Tenant/BuyerRfqListSurface.tsx` and `components/Tenant/BuyerRfqDetailSurface.tsx` explicitly frame the flow as read-only / pre-negotiation; `services/catalogService.ts` and `server/src/routes/tenant.ts` implement create/list/detail/inbox/respond endpoints | `INTENTIONALLY_BOUNDED_OR_DEFERRED` | This is not a shell-only fake. It is a real but explicitly bounded RFQ surface, with first-response continuity and no full negotiation workflow. This matches current Layer 0 posture. |
| Orders continuity | Not directly rerun through transitions in the corrected live pass | `components/Tenant/EXPOrdersPanel.tsx` and `components/WhiteLabelAdmin/WLOrdersPanel.tsx` consume `GET /api/tenant/orders` and `PATCH /api/tenant/orders/:id/status`; `server/src/routes/tenant.ts` returns lifecycle state plus recent lifecycle logs and applies bounded transitions | `NEEDS_TARGETED_RUNTIME_RECHECK` | Repo wiring is real on both tenant and WL admin sides. A targeted live transition pass is still needed before upgrading this to runtime-proven. |
| DPP | Not directly rerun with a known-good node in the corrected live pass | `components/Tenant/DPPPassport.tsx` validates UUIDs and calls `GET /api/tenant/dpp/:nodeId`; `server/src/routes/tenant.ts` reads three security-invoker snapshot views and writes a tenant read audit entry | `NEEDS_TARGETED_RUNTIME_RECHECK` | Repo continuity is real. The remaining gap is fresh live proof with a valid node path, not missing implementation. |
| Members / user management | Not independently runtime-proved in the corrected pass | `components/Tenant/TeamManagement.tsx` lists memberships and supports bounded OWNER-only role edits; `components/Tenant/InviteMemberForm.tsx` sends invites; `services/tenantService.ts` and `server/src/routes/tenant.ts` implement membership read, invite, and update routes | `WORKING_BUT_THIN` | Real continuity exists, but the surface is intentionally role-bounded and is not a broad IAM/admin suite. |
| Enterprise Audit Log | Live follow-up verified as working | `components/Tenant/TenantAuditLogs.tsx` calls `tenantGet('/api/tenant/audit-logs')`; `server/src/routes/tenant.ts` returns tenant-scoped logs ordered newest-first with a hard take of 50 | `WORKING_BUT_THIN` | This is a real end-to-end read surface. It is thin by current design: no filters, no pagination, no detail drilldown. |
| App-side auth / sign-in continuity | Live unauthenticated app entry and marketing handoff verified as working | `components/Auth/AuthFlows.tsx` performs server-driven tenant selection; `services/authService.ts` calls `/api/public/tenants/by-email`, `/api/auth/login`, and `/api/auth/admin/login`; `server/src/routes/public.ts` and `server/src/routes/auth.ts` implement the full lookup and realm-specific login path | `WORKING_END_TO_END` | Corrected runtime and repo truth align cleanly here. This is one of the strongest currently verified continuity chains. |
| Control-plane audit filtering affordances | Not the primary runtime defect, but visible in repo truth | `server/src/routes/control.ts` accepts `tenantId`, `action`, and `limit` on `GET /api/control/audit-logs`; `components/ControlPlane/AuditLogs.tsx` fetches only `limit: 50` and leaves search/filter inputs disabled | `BACKEND_PRESENT_FRONTEND_NOT_WIRED` | This is the clearest bounded frontend-backend wiring gap inside the audited set. |
| Legacy WL stub residue | Not part of corrected live routing | `components/WhiteLabelAdmin/WLStubPanel.tsx` still exists, but workspace search shows no active imports or route wiring | `UI_PLACEHOLDER_OR_INERT` | Historical residue only. Do not treat this as an active live-shell blocker without new evidence. |

## Explicit Non-Findings

- No clear `FRONTEND_PRESENT_BACKEND_MISSING` case was confirmed inside the bounded audited set.
- No high-confidence `WIRING_DEFECT` was confirmed inside the bounded audited set.
- The strongest currently observed live issue remains shell/bootstrap slowness, which reads as a runtime/performance class problem rather than a missing route/component/service chain.

## Candidate Follow-Up Targets

1. Investigate slow bootstrap/recovery in control-plane, enterprise, and WL shells as a `NON_WIRING_RUNTIME_DEFECT`, not as a missing-implementation issue.
2. Open a bounded control-plane audit UI wiring unit if operator-side search/filter controls are needed now; backend support already exists.
3. Run targeted live rechecks before making stronger runtime claims for:
   - catalog admin mutations
   - order lifecycle transitions
   - DPP known-good node fetch
   - impersonation start/stop continuity
4. Do not open RFQ as a generic bug solely because negotiation depth is absent. Current repo and Layer 0 truth describe a bounded, pre-negotiation surface by design.

## Audit Conclusion

- The corrected runtime baseline and current repo truth materially agree that the major shells are real.
- The repo does not support the claim that the current platform is dominated by shell-only fake surfaces.
- The primary distinctions are:
  - real but slow shells
  - real but thin/bounded surfaces
  - a small number of bounded frontend wiring gaps against already-present backend capability

NO_OPENING_AUTHORITY_CREATED
NO_PRODUCT_FILES_TOUCHED