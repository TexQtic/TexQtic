# GOV-DEC-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION-PRODUCTION-VERIFICATION

Decision ID: GOV-DEC-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION-PRODUCTION-VERIFICATION
Title: Production verification for the open B2C shell authenticated-affordance separation unit is blocked by live tenant-context entry failure
Status: DECIDED
Date: 2026-04-06
Authorized by: Paresh

## Context

TexQtic currently records:

- `MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION` is the sole open product-facing
  `ACTIVE_DELIVERY` unit
- the unit is bounded to the exact non-WL B2C `HOME` shell path only
- the latest implementation result is commit `bfb6dea`
- this pass is production verification only and does not authorize implementation, redesign, or
  closure

Repo-practice production verification continues to require live deployed proof rather than local
proof alone.

This pass therefore exercised the live deployed runtime at `https://app.texqtic.com/` and the
current production admin workflow used to reach tenant-context inspection surfaces.

## Live Verification Steps Run

### 1. Tenant runtime access check

- tenant login with `owner@acme.example.com` succeeded on `https://app.texqtic.com/`
- the runtime resolved into the enterprise tenant shell and exposed authenticated tenant navigation

### 2. Control-plane access check

- control-plane login with `admin@texqtic.com` succeeded on `https://app.texqtic.com/`
- the live tenant registry loaded successfully

### 3. Exact B2C proof-tenant discovery

- the live tenant registry contains `B2C Browse Proof 20260402080229`
- the registry detail surface shows:
  - tenant id: `743c73aa-1b55-4560-a018-e8e554ca65f6`
  - slug: `b2c-browse-proof-20260402080229`
  - bounded action: `Enter Tenant Context`

### 4. Exact B2C tenant-context entry attempt

- selecting `App Shells` with `B2C Browse Proof 20260402080229` chosen in the live tenant picker
  left the runtime stuck on `Loading workspace...`
- the live browser console emitted:
  - `REALM_MISMATCH: Tenant endpoint requires TENANT realm, got CONTROL_PLANE`
- opening the tenant detail and using `Enter Tenant Context` surfaced the bounded impersonation
  modal correctly
- entering a verification-specific reason and pressing `Start Impersonation` left the runtime stuck
  in `Starting...`

Result: the exact governed B2C tenant shell could not be entered from the live deployed admin
workflow, so the exact non-WL B2C `HOME` path could not be observed directly in production during
this pass.

### 5. Limited neighbor smoke check

- in the enterprise tenant runtime, the authenticated home shell loaded successfully
- clicking the authenticated `Orders` path produced a live runtime failure state:
  - visible UI result: `Invalid or expired token`
  - console evidence included `Failed to load catalog: APIError: Invalid or expired token`

This limited smoke check confirms the deployed runtime is reachable, but it also surfaced a
separate authenticated-session issue outside the active B2C unit boundary.

## Exact In-Scope Verification Result

The exact governed non-WL B2C `HOME` path was **not** verified successfully in production during
this pass.

Reason:

- the live production admin workflow can discover the exact B2C proof tenant
- but the runtime does not successfully enter tenant context for that tenant
- because tenant-context entry remains blocked, this pass cannot truthfully confirm in production
  whether the branded/home-return and browse-search entry-facing frame remains intact on the exact
  governed path
- for the same reason, this pass cannot truthfully confirm in production whether authenticated-only
  shell affordances are suppressed on that exact path

## Neighbor-Path Smoke-Check Result

The intended same-branch B2C neighbor-path smoke checks could not be completed because the exact B2C
tenant context was not reachable from live production.

Limited live smoke executed anyway:

- enterprise tenant authenticated home shell: reachable
- enterprise authenticated `Orders` path: failed with `Invalid or expired token`

No truthful same-branch B2C non-`HOME` authenticated smoke check was possible in this pass.

## Adjacent Findings

### 1. CONTROL-PLANE-B2C-TENANT-CONTEXT-ENTRY-REALM-MISMATCH-001

- concise rationale: the live control-plane `App Shells` / `Enter Tenant Context` workflow can
  identify the exact B2C proof tenant but does not successfully enter tenant context; the runtime
  remains stuck and emits `REALM_MISMATCH: Tenant endpoint requires TENANT realm, got CONTROL_PLANE`
- likely minimum file allowlist:
  - `App.tsx`
  - `components/ControlPlane/TenantDetails.tsx`
  - `services/authService.ts`
- readiness classification: `design-gated`
- separate-unit note: this remains separate from
  `MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION`

### 2. ENTERPRISE-AUTHENTICATED-ORDERS-TOKEN-EXPIRY-NEIGHBOR-SMOKE-001

- concise rationale: the live enterprise tenant shell loaded, but the authenticated `Orders` path
  surfaced `Invalid or expired token` in both visible UI and console output during neighbor smoke
- likely minimum file allowlist:
  - `services/authService.ts`
  - `services/apiClient.ts`
  - `App.tsx`
- readiness classification: `decision-gated`
- separate-unit note: this remains separate from
  `MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION`

## Decision Result

`PRODUCTION_VERIFICATION_BLOCKED`

This pass does not authorize closure.

The blocking condition is not local-proof absence. It is failure to reach the exact governed live
tenant shell path through the current production tenant-context entry workflow.

## Governance Sync Statement

This record is governance evidence only.

- no product/application files were modified
- no implementation was performed
- no closure writeback was performed
