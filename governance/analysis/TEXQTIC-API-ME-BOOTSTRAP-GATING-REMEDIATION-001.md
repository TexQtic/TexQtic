# TexQtic /api/me Bootstrap Gating Remediation 001

## 1. Header

- Date: 2026-04-07
- Type: bounded remediation record
- Scope: tenant-shell `/api/me` bootstrap gating for Enterprise and White Label continuity only

## 2. Opening Scope

This unit was intentionally limited to the frontend bootstrap seam that was already identified in [governance/analysis/TEXQTIC-BOOTSTRAP-SLOW-LOAD-INVESTIGATION-v1.md](c:\Users\PARESH\TexQtic\governance\analysis\TEXQTIC-BOOTSTRAP-SLOW-LOAD-INVESTIGATION-v1.md).

Allowed focus:

- `App.tsx` tenant login and tenant-session restore behavior around `getCurrentUser()` / `GET /api/me`
- `components/Auth/AuthFlows.tsx` only insofar as tenant-resolution hints needed to survive into bootstrap
- tenant identity helpers directly tied to the same bootstrap seam
- this remediation record only for truthful closeout

This unit did not:

- redesign backend auth or `/api/me`
- change RLS, schema, Prisma, or environment configuration
- broaden into catalog/cart/AI post-shell fetch cleanup
- redesign impersonation bootstrap behavior

## 3. Confirmed Defect Baseline

The investigation baseline already proved that both Enterprise and White Label tenant restore paths were `SLOW_LOAD_BUT_RECOVERS` and that the shared visible blocker was `/api/me` gating.

Repo trace confirmed the frontend contract behind that behavior:

- tenant login in `App.tsx` awaited `getCurrentUser()` before moving from `AUTH` into `EXPERIENCE` or `WL_ADMIN`
- tenant restore in `App.tsx` showed the blocking `Restoring workspace` gate while it awaited `getCurrentUser()`
- `currentTenant` could not resolve unless `tenants[]` had already been seeded
- `AuthFlows.tsx` already knew the resolved tenant slug/name before login submission, but that hint was not preserved into the bootstrap handoff

The net effect was that a valid tenant JWT and a known tenant identity were still insufficient to enter the tenant shell until `/api/me` completed.

## 4. Root Cause

The root cause was not missing tenant identity; it was that canonical `/api/me` hydration was treated as a hard first-paint prerequisite instead of a reconciliation step.

More specifically:

- `handleAuthSuccess(...)` cleared into tenant realm but still blocked shell entry on `getCurrentUser()`
- the tenant restore effect also blocked shell entry on `getCurrentUser()` even when tenant identity hints and JWT claims were already available locally
- when `/api/me` took multiple seconds, the UI remained in `AUTH` / restore gating instead of entering the tenant shell with a bounded provisional tenant snapshot

## 5. Files Changed

Product files changed:

- `App.tsx`
- `components/Auth/AuthFlows.tsx`

Governance file changed:

- `governance/analysis/TEXQTIC-API-ME-BOOTSTRAP-GATING-REMEDIATION-001.md`

No backend, schema, migration, or env files changed in this unit.

## 6. Fix Summary

The bounded fix in `App.tsx` now:

- preserves richer tenant identity hints locally, including `status` and `plan` when later known
- builds a provisional tenant bootstrap snapshot from the tenant JWT, stored tenant hints, and login-time identity hints
- enters `EXPERIENCE` or `WL_ADMIN` immediately when that provisional snapshot is available
- continues to call canonical `/api/me`, but now in the background as a reconciliation step rather than a first-paint gate
- still fails closed when no provisional tenant can be built or when the canonical read returns `401`

The bounded fix in `components/Auth/AuthFlows.tsx` now:

- forwards the resolved tenant slug/name from the server-driven tenant selector into `handleAuthSuccess(...)`
- allows fresh tenant login to seed a truthful first shell label instead of dropping to a generic workspace stub

Important boundary note:

- canonical `/api/me` remains authoritative
- this unit reduces blocking on `/api/me`; it does not remove the read, redesign auth, or claim that `/api/me` latency itself is solved

## 7. Verification Evidence

Targeted local verification completed:

- editor diagnostics for `App.tsx` and `components/Auth/AuthFlows.tsx` reported no new bootstrap-specific errors
- remaining `App.tsx` diagnostics are pre-existing style / complexity findings outside this bounded unit
- `pnpm exec tsc --noEmit` -> PASS
- `pnpm exec eslint App.tsx components/Auth/AuthFlows.tsx --ext ts,tsx` -> blocked by one pre-existing `App.tsx` lint error:
	- `App.tsx:1147:39` `HTMLElement` `no-undef`

Product commit and deploy evidence:

- product commit: `5e8e83b`
- commit message: `fix: reduce tenant bootstrap api me gating`
- pushed to `origin/main`

Production verification completed against `https://app.texqtic.com/` using a live control-plane session and valid tenant JWT continuity.

### White Label production restore proof

White Label tenant used:

- `White Label Buyer [tag:f527b7d2-62e5-4593-92c3-69a807a99c0d]`
- tenant id `86522cc7-96db-416b-bf55-7529aa4d2d6e`

Live browser proof after reload with a valid tenant JWT present:

- `tenantRestore:effect_enter` recorded with `appState = AUTH` and `hasTenantToken = true`
- `tenantRestore:stub_applied` recorded immediately at `2026-04-07T11:53:04.723Z`
- `tenantRestore:getCurrentUser:start` recorded at the same restore boundary
- app state moved to `WL_ADMIN` immediately after stub application
- canonical `/api/me` completed later, with the first recorded resource duration at about `5478.3 ms`
- the visible page reloaded directly into `Store Admin` rather than holding the blocking restore gate until `/api/me` finished

### Enterprise production restore proof

Enterprise tenant used:

- `Test Tenant [tag:f527b7d2-62e5-4593-92c3-69a807a99c0d]`
- tenant id `24aa7ecb-3302-48f6-94c9-f1005923a0e7`

Live browser proof after reload with a valid tenant JWT present:

- `tenantRestore:effect_enter` recorded with `appState = AUTH` and `hasTenantToken = true`
- `tenantRestore:stub_applied` recorded immediately at `2026-04-07T11:55:23.716Z`
- `tenantRestore:getCurrentUser:start` recorded at the same restore boundary
- app state moved to `EXPERIENCE` immediately after stub application
- canonical `/api/me` completed later, with the first recorded resource duration at about `5379.5 ms`
- the visible page reloaded directly into `Enterprise Management` / `Wholesale Catalog` with `Loading catalog...` instead of holding the tenant restore gate until `/api/me` finished

Non-blocking live observation:

- browser performance capture still showed multiple `/api/me` resource entries during each restore probe
- this remediation does not claim that `/api/me` multiplicity or latency is fully closed; it only proves that shell entry no longer waits on that read in the same way

## 8. Current Posture

What is now truthfully proven:

- Enterprise tenant restore no longer hard-blocks shell entry on `/api/me`
- White Label tenant restore no longer hard-blocks shell entry on `/api/me`
- tenant bootstrap now uses a provisional shell snapshot first and canonical `/api/me` reconciliation second
- shell continuity is visibly restored before the slow `/api/me` read completes

What is not yet fully proven in this bounded unit:

- direct fresh tenant email/password login was not rerun in production during this pass
- `/api/me` latency itself remains slow and still warrants separate closure work if startup performance needs to improve further

Therefore the truthful runtime result for this unit is:

- `PARTIAL_IMPROVEMENT`

## 9. Close Recommendation

Treat this unit as a bounded bootstrap-gating remediation, not as full startup-performance closure.

Truthful close position:

- restore-path `/api/me` gating = reduced and live-proven in Enterprise and White Label
- canonical `/api/me` = still authoritative and still slow
- broader tenant startup weight after shell entry = still out of scope for this unit

## 10. Repeated-Call Containment Follow-up

- Date: 2026-04-07
- Type: bounded follow-up remediation record
- Scope: reduce repeated or overlapping `/api/me` reads during tenant bootstrap and early reconciliation only

### 10.1 Confirmed Follow-up Baseline

After the bootstrap-gating remediation above, production restore no longer hard-blocked shell entry on `/api/me`, but the exercised browser probes still showed multiple `/api/me` resource entries during restore.

Repo trace for this follow-up confirmed:

- tenant login reconciliation in `App.tsx` still called canonical `getCurrentUser()`
- tenant restore in `App.tsx` still called canonical `getCurrentUser()`
- the shared GET helper in `services/apiClient.ts` automatically retried GET requests, so one logical `/api/me` read could replay into multiple network requests on transient failure
- no default first-shell `HOME` surface on the exercised Enterprise or White Label entry path mounted a second immediate `/api/me` caller during first paint

### 10.2 Root Cause

The remaining `/api/me` multiplicity on the bootstrap seam came from two bounded causes:

- overlapping bootstrap callers could race the same canonical `/api/me` read
- the shared GET retry wrapper could replay `/api/me` during the same bootstrap boundary

The issue was not that `/api/me` had become non-canonical; it was that the canonical read still lacked bootstrap-specific containment.

### 10.3 Files Changed In This Follow-up

Product files changed:

- `App.tsx`
- `services/apiClient.ts`
- `services/authService.ts`

No backend, schema, migration, env, or governance files were changed in the product commit for this follow-up.

### 10.4 Fix Summary

This follow-up kept `/api/me` authoritative and narrowed the fix to bootstrap callers only:

- `services/apiClient.ts` now allows a GET caller to disable automatic retry for a specific request
- `services/authService.ts` now supports bounded `getCurrentUser(...)` options and a token-scoped in-flight dedupe path
- `App.tsx` tenant login reconciliation and tenant restore now call `getCurrentUser({ dedupe: true, retry: false })`
- this collapses overlapping bootstrap reads onto one in-flight canonical request and prevents retry fan-out for that exact seam

Important boundary note:

- `/api/me` remains canonical
- this follow-up does not remove later non-bootstrap `/api/me` consumers elsewhere in the tenant product
- this follow-up does not claim `/api/me` latency itself is solved

### 10.5 Verification Evidence

Targeted local verification completed:

- `pnpm exec tsc --noEmit` -> `EXIT 0`

Product commit and deploy evidence:

- product commit: `39ed76b`
- product commit message: `fix: contain repeated api me bootstrap reads`
- push result: `bc09bc0..39ed76b  main -> main`

Production verification completed against `https://app.texqtic.com/` using the seeded Enterprise and White Label owner accounts in live browser sessions.

#### Enterprise production proof

Tenant used:

- `Acme Corporation`

Observed live login continuity before reload:

- tenant email resolution identified `Acme Corporation`
- login completed into the Enterprise shell
- the exercised login boundary produced a single `/api/me` resource entry at about `5392.4 ms`

Observed live restore proof after clearing timings and reloading with a valid tenant JWT present:

- `tenantRestore:stub_applied` and `tenantRestore:getCurrentUser:start` were both recorded at `2026-04-07T12:23:40.098Z`
- app state moved into `EXPERIENCE` immediately after stub application
- exactly one `/api/me` resource entry was recorded during reload
- recorded `/api/me` duration was about `5428.4 ms`
- the visible page reloaded directly into `Enterprise Management` / `Wholesale Catalog`
- no second or replayed `/api/me` resource entry was observed in this exercised production restore probe

#### White Label production proof

Tenant used:

- `White Label Co`

Observed live login continuity before reload:

- tenant email resolution identified `White Label Co`
- login completed into the White Label admin shell
- the exercised login boundary produced a single `/api/me` resource entry at about `5572.8 ms`

Observed live restore proof after clearing timings and reloading with a valid tenant JWT present:

- `tenantRestore:stub_applied` and `tenantRestore:getCurrentUser:start` were both recorded at `2026-04-07T12:24:44.481Z`
- app state moved into `WL_ADMIN` immediately after stub application
- exactly one `/api/me` resource entry was recorded during reload
- recorded `/api/me` duration was about `5552.1 ms`
- the visible page reloaded directly into `Store Admin`
- no second or replayed `/api/me` resource entry was observed in this exercised production restore probe

Observed trace note:

- `tenantRestore:snapshot_invalid` with `cancelled: true` still appeared after `tenantRestore:getCurrentUser:success` in both exercised restore probes
- this reflects the original `AUTH`-scoped restore effect being cleaned up after provisional shell entry changed app state
- it did not create an extra `/api/me` request in either exercised production restore probe

### 10.6 Current Posture After Follow-up

What is now truthfully proven:

- the exercised Enterprise tenant restore produced one canonical `/api/me` network request
- the exercised White Label tenant restore produced one canonical `/api/me` network request
- provisional shell continuity still happens immediately on both paths
- canonical `/api/me` remains authoritative for reconciliation

What this follow-up does not claim:

- it does not remove non-bootstrap `/api/me` consumers in later panels or later tenant actions
- it does not claim `/api/me` latency itself is solved

Therefore the truthful runtime result for this bounded follow-up is:

- repeated `/api/me` bootstrap-read multiplicity was contained on the exercised Enterprise and White Label restore paths
