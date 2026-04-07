# TexQtic Impersonation Stop-Path Investigation v1

## Header

- Date: 2026-04-07
- Type: bounded runtime defect investigation
- Scope: impersonation stop path only
- Status: recorded

## Authority Baseline

- Primary runtime authority:
  - `governance/analysis/TEXQTIC-CORRECTED-RUNTIME-TRUTH-EVIDENCE-RECORD-v1.md`
  - `governance/analysis/TEXQTIC-RUNTIME-TO-IMPLEMENTATION-WIRING-AUDIT-v1.md`
  - `governance/analysis/TEXQTIC-TARGETED-RUNTIME-DEPTH-RECHECK-v1.md`
- Adjacent impersonation-specific repo-truth note:
  - `governance/analysis/IMPERSONATION-STOP-PATH-REPO-TRUTH-VALIDATION.md`
- Repo posture was rechecked before investigation:
  - working tree clean
  - no implementation authority opened

## Scope / Non-Scope

### In Scope

- confirm the currently evidenced live stop-path defect
- trace the exact UI -> client -> route -> service/session lifecycle
- determine the narrowest truthful defect shape for the `404`
- preserve next-step readiness without opening remediation work

### Out of Scope

- any product-code fix
- broader auth/session redesign
- re-running broad control-plane review
- DPP, orders, catalog, marketing, CRM, or domain-routing work
- opening authority for remediation in this pass

## Current Confirmed Runtime Truth

The already confirmed runtime truth entering this investigation was:

- impersonation start is real and materially working
- stop returns `404`
- the client restores control-plane context locally anyway
- the currently correct broad classification is `NON_WIRING_RUNTIME_DEFECT`

This investigation adds one tighter live discriminator beyond the targeted runtime recheck:

- while impersonation was visibly active and the staff impersonation banner was rendered, the stored `impersonationId` already failed `GET /api/control/impersonation/status/:id` with `SESSION_NOT_FOUND`

That matters because it proves the stop-path `404` is not primarily explained by a duplicate exit click or by the local exit cleanup itself. The session lookup failure already exists before the user clicks `Exit Impersonation`.

## Start-Path vs Stop-Path Lifecycle Trace

### Start Path

1. UI event
   - `App.tsx` `handleImpersonateConfirm`
2. Client preflight
   - resolves control-plane actor identity
   - fetches tenant detail
   - selects an eligible member user
3. Service wrapper
   - `services/controlPlaneService.ts` `startImpersonationSession`
4. Request shape
   - `POST /api/control/impersonation/start`
   - body: `{ orgId, userId, reason }`
   - via `adminPost(...)`, which requires `CONTROL_PLANE` realm and sends the control-plane realm header
5. Route registration
   - `server/src/index.ts` registers impersonation routes at `/api/control`
   - `server/src/routes/admin/impersonation.ts` exposes `POST /impersonation/start`
6. Backend handler
   - validates body with Zod
   - requires admin auth and `SUPER_ADMIN`
   - calls `startImpersonation(...)`
7. Session lifecycle write path
   - `server/src/services/impersonation.service.ts` validates tenant and membership
   - creates `ImpersonationSession`
   - writes `IMPERSONATION_START` audit log
   - returns `impersonationId`, `userId`, `orgId`, `membershipRole`, `expiresAt`
8. Client storage / handoff
   - `App.tsx` stores `result.impersonationId` in in-memory impersonation state
   - persists the same id in `texqtic_impersonation_session`
   - preserves admin token untouched
   - applies tenant impersonation token override
   - boots tenant shell

### Stop Path

1. UI event
   - `App.tsx` `handleExitImpersonation`
2. Local state transition before request
   - flips stored realm to `CONTROL_PLANE`
   - flips in-memory realm to `CONTROL_PLANE`
3. Service wrapper
   - `services/controlPlaneService.ts` `stopImpersonationSession`
4. Request shape
   - `POST /api/control/impersonation/stop`
   - body: `{ impersonationId, reason }`
   - the body id is sourced from `impersonation.impersonationId`
5. Route registration
   - `server/src/routes/admin/impersonation.ts` exposes `POST /impersonation/stop`
6. Backend handler
   - validates body with Zod
   - requires admin auth and `SUPER_ADMIN`
   - calls `stopImpersonation(...)`
7. Session lookup path
   - `server/src/services/impersonation.service.ts` performs `findUnique({ where: { id: impersonationId } })`
   - then branches to:
     - `SESSION_NOT_FOUND` -> `404`
     - `NOT_AUTHORIZED` -> `403`
     - `ALREADY_ENDED` -> `409`
     - `ALREADY_EXPIRED` -> `409`
     - success -> update `endedAt` + write `IMPERSONATION_STOP`
8. Client cleanup behavior
   - if stop fails, `App.tsx` logs: stop error ignored, clearing state
   - persisted impersonation session is still cleared
   - in-memory impersonation state is cleared
   - SPA returns to control-plane shell

## Exact 404 Defect Analysis

### What Is Ruled Out

1. Wrong route or path being called
   - not supported
   - the live runtime hit `POST /api/control/impersonation/stop`
   - repo route registration and handler path match that exact request

2. Wrong request field name or route contract mismatch
   - not supported
   - start returns `impersonationId`
   - client persists `result.impersonationId`
   - stop and status both expect `impersonationId`
   - repo tests exercise that same lifecycle successfully with the same field

3. Duplicate stop or stale stop as the primary explanation
   - ruled out as primary
   - a new live probe showed `GET /api/control/impersonation/status/:id` already returned `404 SESSION_NOT_FOUND` while impersonation was visibly active and before exit was clicked

4. Already-ended or already-expired session as the primary explanation
   - not supported by the response mapping
   - those branches return `409`, not `404`

5. Admin auth failure or ownership failure as the primary explanation
   - not supported by the response mapping
   - those branches return `401` or `403`, not `404`

### What The Evidence Now Supports

The stop-path `404` maps specifically to `SESSION_NOT_FOUND`, and the same lookup failure is reproducible on the status endpoint before exit.

That means the narrowest truthful defect shape is:

- the live server cannot resolve the active impersonation session id after start, even though the tenant shell has already booted and the client has stored that id locally

The remaining sub-fork is narrower than the earlier broad candidate and currently unresolved at the server-internals level:

1. either the live start path returns an `impersonationId` that does not correspond to a durably retrievable row
2. or the row is created but not durably available to later live lookup in the deployed runtime/data path

Current repo truth makes the following alternatives less likely:

- client identifier propagation defect
  - repo start/store/stop/status use the same field name and same id handoff shape
- route contract mismatch
  - repo route and client contract align
- stop-only ordering defect
  - status fails before stop is invoked

Current repo truth plus the existing route test also show that the intended contract is valid in code:

- `server/src/__tests__/wave3-realm-isolation.spec.ts` exercises start -> stop -> status successfully for the same `impersonationId`

So the live defect is no longer best described as a generic cleanup ambiguity. It is now most truthfully a server-side session availability or lookup failure that the client later masks during exit.

## Root-Cause Classification

`SERVER_SESSION_LOOKUP_DEFECT`

### Why This Is The Best Fit

- live status lookup on the active stored session id returns `SESSION_NOT_FOUND`
- live stop on that same lifecycle also returns `SESSION_NOT_FOUND`
- repo route and request contract align cleanly
- repo test evidence shows the same contract should work when the session row is retrievable
- the client-side masking behavior is real, but it is secondary to the now-proved lookup failure

## Confidence / Uncertainty

Confidence in the primary classification: HIGH

Basis:

- live runtime start success remains proven
- live stop `404` remains proven
- live pre-exit status `404 SESSION_NOT_FOUND` on the active stored session id was newly proven
- repo trace rules out route/path mismatch and obvious field-name mismatch
- repo test proves the intended start/stop/status contract succeeds when the row is resolvable

Remaining uncertainty: MEDIUM

- current evidence does not fully distinguish between:
  - start returning a non-resolvable id in live deployment
  - start creating a row that is not durably visible to subsequent live lookup
- current evidence also does not prove a deployment-drift mechanism, migration drift, or DB-level side effect by itself

## Candidate Next Move

`bounded remediation opening candidate`

Why that threshold is now justified:

- the defect is live, concrete, and reproducible
- the failing server branch is narrowed to `SESSION_NOT_FOUND`
- the failure exists before exit cleanup runs
- the file surface is already bounded and does not require broad auth redesign:
  - `App.tsx`
  - `services/controlPlaneService.ts`
  - `server/src/routes/admin/impersonation.ts`
  - `server/src/services/impersonation.service.ts`
  - `server/src/lib/database-context.ts`
  - impersonation-session RLS / migration truth if needed for validation

This investigation itself does not open that remediation work.

## Completion Checklist

- used current runtime artifacts as authority
- confirmed start is real and stop returns `404`
- traced UI -> client -> route -> service/session path
- explained the most likely defect shape for the `404`
- did not modify product files
- did not open remediation work
- produced one bounded analysis artifact only

## Guardrail Footer

NO_OPENING_AUTHORITY_CREATED
NO_PRODUCT_FILES_TOUCHED