# TECS-TTP-CONTROL-PLANE-FEATURE-DISABLED-UX-001 — Design v1

**Unit ID:** `TTP-CONTROL-PLANE-FEATURE-DISABLED-UX-001`  
**Document type:** Bounded design artifact — frontend copy-only fix  
**Status:** `DESIGN_OPEN` — awaiting Paresh approval before any implementation prompt may be opened  
**Date:** 2026-05-06  
**Decision Owner:** Paresh Patel (TexQtic founder / operator)  
**Author:** GitHub Copilot — TexQtic Safe-Write Mode  
**`ttp_enabled` state:** `false` — UNCHANGED by this document  
**`LEGAL_REVIEW_PENDING`:** Active — UNCHANGED by this document  
**Implementation changes:** NONE — design artifact only

> **DESIGN ARTIFACT ONLY.** No application code, routes, services, middleware, Prisma schema,
> SQL migrations, env files, feature flag values, or TenantFeatureOverride records are changed
> or authorized by this document. Implementation may not begin until this design is reviewed
> and explicitly approved by Paresh.

---

## A. Purpose and Scope

### Problem statement

Three TTP-gated control-plane UI surfaces display generic error copy when `ttp_enabled=false`.
The backend feature gate (`ttpFeatureGateMiddleware`) correctly returns HTTP 503 with
`code: 'FEATURE_DISABLED'` — the backend is functioning exactly as designed. The problem is
purely in the frontend catch blocks: they do not inspect `err.code` to distinguish a deliberate
feature-disabled gate from a real service outage. A SUPER_ADMIN operator viewing these panels
cannot tell whether TradeTrust Pay is globally disabled (expected, intentional) or whether
the server is genuinely down (unexpected, requiring action).

### Authority basis

This unit is authorized as the follow-up candidate identified and recorded in:

| Source | Path | Role |
|---|---|---|
| Audit record | `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-TTP-CONTROL-PLANE-TRADETRUST-UI-RUNTIME-AUDIT-001.md` | Classifies 3 affected surfaces as `UI_ERROR_COPY_MISMATCH`; records this unit as follow-up candidate |
| Phase 2 tracker | `governance/TEXQTIC-TRADETRUST-PAY-PHASE-2-IMPLEMENTATION-PLAN-AND-TRACKER-001.md` | §6 Immediate Next Unit; §9 P1 table |
| Feature gate middleware | `server/src/middleware/ttpFeatureGate.middleware.ts` | Returns `sendError(reply, 'FEATURE_DISABLED', 'TradeTrust Pay is not enabled...', 503)` |
| API client error handler | `services/apiClient.ts` lines 419–424 | Maps all 5xx to `APIError(status, 'Service temporarily unavailable. Try again.', errorData.error?.code \|\| 'SERVER_ERROR')` — preserves `code: 'FEATURE_DISABLED'` from body |
| `APIError` class | `services/apiClient.ts` lines 219–230 | `class APIError extends Error` with `status: number`, `code?: string`, `details?: unknown` |

### In scope (this unit)

- **Catch block copy update** in exactly 3 React components:
  1. `VpcConsole` (`fetchVpcs` catch) — `components/ControlPlane/VpcConsole.tsx`
  2. `TtpEnrollmentAdmin` (`load` catch) — `components/ControlPlane/TtpEnrollmentAdmin.tsx`
  3. `TtpEligibilityConsole` (`loadAssessments` catch) — `components/ControlPlane/TtpEligibilityConsole.tsx`
- One new test file covering the `FEATURE_DISABLED` branch for each surface
- No imports to add — `APIError` is already imported in all three components

### Out of scope (this unit — absolute)

- No changes to `services/apiClient.ts` — the 5xx handler is correct; `err.code` is already `'FEATURE_DISABLED'`
- No changes to `ttpFeatureGateMiddleware` — backend is correct
- No changes to any backend route, service, or controller
- No changes to `server/src/ttp/ttp.constants.ts` — this fix adds no new constants
- No Prisma schema or migration changes
- No SQL changes
- No env file changes
- No feature flag value changes (`ttp_enabled=false` — UNCHANGED)
- No `TenantFeatureOverride` data changes
- No changes to legal copy constants (`TTP_DISCLAIMER_TEXT`, `SCORE_DISCLAIMER`, `TEXQTICSCORE_V2_DISCLAIMER`)
- No changes to non-TTP-gated surface: `EscrowAdminPanel` (classified `DATA_EMPTY_STATE_ONLY` in audit — no defect)
- No changes to actions within `VpcConsole` that are not the list-load fetch (`generateVpc`, `transitionVpc` — these have appropriate error handling already)
- No activation of TTP (`ttp_enabled` remains `false`)
- No tenant-facing surfaces
- No `LEGAL_REVIEW_PENDING` wording or disclaimer changes

---

## B. Repo-Truth Confirmation

### Backend: what the feature gate sends

`ttpFeatureGateMiddleware` calls `sendError(reply, 'FEATURE_DISABLED', '...', 503)`.
Inspecting `server/src/utils/response.ts` pattern: the response body is:

```json
{ "error": { "code": "FEATURE_DISABLED", "message": "TradeTrust Pay is not enabled for this platform." } }
```

### API client: what the catch block receives

The `apiClient.ts` 5xx handler (line ~422):

```typescript
throw new APIError(
  response.status,                          // 503
  'Service temporarily unavailable. Try again.',  // hardcoded message
  errorData.error?.code || 'SERVER_ERROR'   // → 'FEATURE_DISABLED' from body
);
```

Therefore in the component catch block:

| Property | Value |
|---|---|
| `err instanceof APIError` | `true` |
| `err.status` | `503` |
| `err.code` | `'FEATURE_DISABLED'` |
| `err.message` | `'Service temporarily unavailable. Try again.'` (hardcoded by apiClient 5xx handler) |

### Current catch block behavior (repo truth)

| Surface | Current catch pattern | What admin sees |
|---|---|---|
| VpcConsole `fetchVpcs` (line ~272) | `catch (err) { setError('Failed to load VPCs. Please try again.'); }` — swallows `err` entirely, no `instanceof` check | "Failed to load VPCs. Please try again." |
| TtpEnrollmentAdmin `load` (lines 195–199) | `catch (err) { if (err instanceof APIError) { setError(err.message ?? 'Failed to load enrollments.'); } else { setError('Failed to load enrollments.'); } }` — checks `instanceof` but uses `err.message`, not `err.code` | "Service temporarily unavailable. Try again." (apiClient 5xx hardcoded `message`) |
| TtpEligibilityConsole `loadAssessments` (line ~272) | `catch { setLoadError('Failed to load eligibility assessments.'); }` — binds no variable, swallows error completely | "Failed to load eligibility assessments." |

---

## C. Proposed Disabled-State Copy

The following copy is **proposed for Paresh confirmation** before implementation.

> The copy below is a design proposal only. Paresh must confirm or revise wording
> before any implementation prompt may be opened. No legal gate applies to admin-only
> operational copy. This string is never shown to tenants or buyers.

### Proposed disabled-state copy string

```
TradeTrust Pay is not currently enabled on this platform.
```

This string is identical across all three surfaces. Rationale:

1. **Factually correct** — the feature gate is blocking because `ttp_enabled=false` globally.
2. **Not a service-outage message** — does not say "unavailable", "try again", or "failed to load".
3. **Not a legal statement** — contains no score advisory, fee disclosure, or regulatory claim. It is a
   purely operational status message for SUPER_ADMIN operators.
4. **Short and unambiguous** — the admin immediately understands this is a platform switch, not an error.
5. **No "contact administrator" tail** — the SUPER_ADMIN IS the administrator; directing them to contact
   themselves would be confusing. The copy stops at the status statement.

### Fallback (existing copy) — preserved unchanged

Each component retains its existing generic copy as the fallback for non-`FEATURE_DISABLED` errors:

| Surface | Existing fallback copy (preserved) |
|---|---|
| VpcConsole | "Failed to load VPCs. Please try again." |
| TtpEnrollmentAdmin `instanceof APIError` branch | `err.message ?? 'Failed to load enrollments.'` |
| TtpEnrollmentAdmin non-APIError branch | "Failed to load enrollments." |
| TtpEligibilityConsole | "Failed to load eligibility assessments." |

---

## D. Component-by-Component Design

### D.1 VpcConsole — `fetchVpcs` catch block

**File:** `components/ControlPlane/VpcConsole.tsx`  
**Function:** `fetchVpcs` (inner `useCallback`, component `VpcConsole`)  
**Current code (line ~270–276):**

```typescript
    } catch (err) {
      setError('Failed to load VPCs. Please try again.');
    } finally {
```

**Proposed replacement:**

```typescript
    } catch (err) {
      if (err instanceof APIError && err.code === 'FEATURE_DISABLED') {
        setError('TradeTrust Pay is not currently enabled on this platform.');
      } else {
        setError('Failed to load VPCs. Please try again.');
      }
    } finally {
```

**Impact analysis:**

- `APIError` already imported at line 26 — no new import needed.
- `finally { setLoading(false) }` block unchanged.
- All other catch blocks in `VpcConsole` (lines ~54, ~168) are for actions (`submitInvoice`, `handleVoidOrExpire`), not the list-load fetch. Those are NOT touched by this unit.
- The `generateVpc` and `transitionVpc` sub-components each have their own `error` state — not affected.

### D.2 TtpEnrollmentAdmin — `load` catch block

**File:** `components/ControlPlane/TtpEnrollmentAdmin.tsx`  
**Function:** `load` (inner `useCallback`, component `TtpEnrollmentAdmin`)  
**Current code (lines ~195–201):**

```typescript
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message ?? 'Failed to load enrollments.');
      } else {
        setError('Failed to load enrollments.');
      }
    } finally {
```

**Proposed replacement:**

```typescript
    } catch (err) {
      if (err instanceof APIError && err.code === 'FEATURE_DISABLED') {
        setError('TradeTrust Pay is not currently enabled on this platform.');
      } else if (err instanceof APIError) {
        setError(err.message ?? 'Failed to load enrollments.');
      } else {
        setError('Failed to load enrollments.');
      }
    } finally {
```

**Impact analysis:**

- `APIError` already imported at line 28 — no new import needed.
- `FEATURE_DISABLED` branch inserted as the first `if` — takes precedence over the existing
  `err instanceof APIError` branch that would use `err.message` (the generic 5xx string).
- The `ReviewDialog` component catch (line ~72) is for the `adminReviewEnrollment` mutation,
  not the list-load fetch. That catch is NOT touched by this unit.
- `finally { setLoading(false) }` block unchanged.

### D.3 TtpEligibilityConsole — `loadAssessments` catch block

**File:** `components/ControlPlane/TtpEligibilityConsole.tsx`  
**Function:** `loadAssessments` (inner `useCallback`, component `TtpEligibilityConsole`)  
**Current code (line ~272–275):**

```typescript
    } catch {
      setLoadError('Failed to load eligibility assessments.');
    } finally {
```

**Proposed replacement:**

```typescript
    } catch (err) {
      if (err instanceof APIError && err.code === 'FEATURE_DISABLED') {
        setLoadError('TradeTrust Pay is not currently enabled on this platform.');
      } else {
        setLoadError('Failed to load eligibility assessments.');
      }
    } finally {
```

**Impact analysis:**

- `APIError` already imported at line 29 — no new import needed.
- Anonymous `catch` becomes `catch (err)` — TypeScript permits this. `err` is typed `unknown`.
  The `instanceof APIError` guard narrows the type safely.
- The assessment-submission catch (line ~101) is for `adminAssessTtpEligibility`, a mutation.
  That catch is NOT touched by this unit.
- `finally { setLoading(false) }` block unchanged.

---

## E. Minimal Frontend File Allowlist

The implementation prompt for this unit may ONLY modify or create the following files:

### Modify (existing files)

| File | Change |
|---|---|
| `components/ControlPlane/VpcConsole.tsx` | Catch block in `fetchVpcs` — add `FEATURE_DISABLED` branch (3 lines) |
| `components/ControlPlane/TtpEnrollmentAdmin.tsx` | Catch block in `load` — add `FEATURE_DISABLED` branch (2 lines) |
| `components/ControlPlane/TtpEligibilityConsole.tsx` | Catch block in `loadAssessments` — anonymous `catch` → `catch (err)` + `FEATURE_DISABLED` branch (4 lines net change) |

### Create (new test file)

| File | Change |
|---|---|
| `tests/ttp-control-plane-feature-disabled-ux.test.tsx` | New unit test file (see §F) |

### Forbidden (must not be touched)

- `services/apiClient.ts` — no changes
- `server/src/middleware/ttpFeatureGate.middleware.ts` — no changes
- `server/src/ttp/ttp.constants.ts` — no changes
- Any backend route, service, or controller
- `server/prisma/schema.prisma` — no changes
- Any `.env` or environment config file
- `components/ControlPlane/EscrowAdminPanel.tsx` — `DATA_EMPTY_STATE_ONLY`; no defect; not in scope
- Any tenant-plane or WL component
- Any existing test file

---

## F. Test and Verification Plan

### F.1 Unit tests (new test file)

**File:** `tests/ttp-control-plane-feature-disabled-ux.test.tsx`

The test file must cover the following cases using vitest + React Testing Library (matching repo test patterns):

| Test ID | Surface | Scenario | Expected Outcome |
|---|---|---|---|
| TC-FDU-001 | VpcConsole | `adminListVpcs` rejects with `APIError(503, '...', 'FEATURE_DISABLED')` | Renders "TradeTrust Pay is not currently enabled on this platform." |
| TC-FDU-002 | VpcConsole | `adminListVpcs` rejects with `APIError(500, '...', 'SERVER_ERROR')` | Renders "Failed to load VPCs. Please try again." |
| TC-FDU-003 | VpcConsole | `adminListVpcs` rejects with non-APIError (network error) | Renders "Failed to load VPCs. Please try again." |
| TC-FDU-004 | TtpEnrollmentAdmin | `adminListTtpEnrollments` rejects with `APIError(503, '...', 'FEATURE_DISABLED')` | Renders "TradeTrust Pay is not currently enabled on this platform." |
| TC-FDU-005 | TtpEnrollmentAdmin | `adminListTtpEnrollments` rejects with `APIError(500, 'Unexpected server error', undefined)` | Renders "Unexpected server error" (falls through to `err.message ?? 'Failed to load enrollments.'`) |
| TC-FDU-006 | TtpEnrollmentAdmin | `adminListTtpEnrollments` rejects with plain `Error` | Renders "Failed to load enrollments." |
| TC-FDU-007 | TtpEligibilityConsole | `adminGetTtpEligibilityAssessments` rejects with `APIError(503, '...', 'FEATURE_DISABLED')` | Renders "TradeTrust Pay is not currently enabled on this platform." |
| TC-FDU-008 | TtpEligibilityConsole | `adminGetTtpEligibilityAssessments` rejects with `APIError(500, '...', 'SERVER_ERROR')` | Renders "Failed to load eligibility assessments." |
| TC-FDU-009 | TtpEligibilityConsole | `adminGetTtpEligibilityAssessments` rejects with non-APIError | Renders "Failed to load eligibility assessments." |

**Mock setup:** Vitest `vi.mock` for `services/adminService` or the direct service function used by each
component. The `APIError` class from `services/apiClient` must be used directly (not mocked) so that
`instanceof` checks behave correctly in tests.

### F.2 Regression: existing error copy preserved

TC-FDU-002, TC-FDU-003, TC-FDU-005, TC-FDU-006, TC-FDU-008, TC-FDU-009 confirm that the existing
generic error copy is NOT broken by the change. These are required — not optional.

### F.3 Type check

```
pnpm --filter frontend typecheck
```

Must pass clean (no `tsc --noEmit` errors) after implementation.

### F.4 Full existing test suite

```
pnpm --filter frontend test
```

All pre-existing tests must continue to pass. No existing test may be deleted or modified.

### F.5 No E2E change

No Playwright test changes are required or permitted in this unit. The visual copy change in a
SUPER_ADMIN-only panel does not affect any E2E scenario in the current suite (all 38 tests cover
tenant, buyer, or public surfaces — not TTP admin panels).

### F.6 Production verification (after deploy)

After production deploy, Paresh navigates (authenticated SUPER_ADMIN) to the three panels:

| Surface | Expected production copy (settled state) |
|---|---|
| VPC Console | "TradeTrust Pay is not currently enabled on this platform." |
| TTP Enrollment | "TradeTrust Pay is not currently enabled on this platform." |
| TTP Eligibility | "TradeTrust Pay is not currently enabled on this platform." |

Screenshot evidence required before closure. `ttp_enabled=false` confirmed unchanged.

---

## G. Stop Conditions

The implementation prompt must stop and emit a blocker report if any of the following occur:

| Stop Condition | Reason |
|---|---|
| Any file outside the allowlist is required | No file creep — governance rule |
| `APIError` is NOT already imported at the targeted line | Import investigation required; do not auto-add without confirming no duplicate import |
| `err.code` type does not match `string` at compile time | Confirm `APIError.code: string \| undefined`; do not suppress with `@ts-ignore` or `any` cast |
| The catch block line numbers differ from design by more than ±5 lines | Re-read the file; do not apply blind patch; confirm exact context before patching |
| Any existing test begins failing after the change | Stop; do not delete or skip the failing test |
| `tsc --noEmit` reports new errors after implementation | Stop; fix the type error or report it |
| The copy string needs to change | Paresh must confirm the revised string before committing |
| The `FEATURE_DISABLED` check needs to apply to any mutation catch block | Stop; mutation error handling is out of scope; do not expand the change |
| Any second `catch` block in any of the 3 files incidentally touches TTP | Stop; each component has exactly one list-load catch in scope — do not touch other catch blocks |

---

## H. No-Go Confirmation

The following invariants are confirmed UNCHANGED as a result of this design document:

| Invariant | State |
|---|---|
| `ttp_enabled` | `false` — UNCHANGED; this unit does not activate TTP |
| `LEGAL_REVIEW_PENDING` | Active — UNCHANGED; no legal copy is touched |
| Backend routes | UNCHANGED — no route, controller, or service change |
| `ttpFeatureGateMiddleware` | UNCHANGED — backend gate behavior preserved |
| `services/apiClient.ts` | UNCHANGED — 5xx handler preserved |
| Prisma schema | UNCHANGED |
| SQL / migrations | UNCHANGED |
| Env files | UNCHANGED |
| Feature flag DB values | UNCHANGED |
| TenantFeatureOverride records | UNCHANGED |
| TTP legal constants | UNCHANGED (`TTP_DISCLAIMER_TEXT`, `SCORE_DISCLAIMER`, `TEXQTICSCORE_V2_DISCLAIMER`) |
| Tenant-plane surfaces | UNCHANGED — this is a SUPER_ADMIN control-plane only fix |
| Buyer / public surfaces | UNCHANGED |
| Wave 3 / Wave 4 / Wave 5 gates | UNCHANGED |
| EscrowAdminPanel | UNCHANGED — `DATA_EMPTY_STATE_ONLY`; not in scope |
| TTP activation | Not initiated — no pilot org activated |

---

## I. Tracker Stale-Text Note (§9 / §20)

**Identified stale text:** The §20 "Wave 2+ status" footer of
`governance/TEXQTIC-TRADETRUST-PAY-PHASE-2-IMPLEMENTATION-PLAN-AND-TRACKER-001.md` contains:

> `TTP-TEXQTICSCORE-V2-SERVICE-001` `IMPLEMENTATION_OPEN` (service-only: `computeTexQticScore` + v2
> types + `TEXQTICSCORE_V2_DISCLAIMER` + 17 unit tests; ...; explicit Paresh authorization 2026-05-05)

This label was written when the unit was first opened. The unit is now `TRUTH_SYNCED` (commits
`3999a2c` + `2c01c38`; 31/31 unit tests pass). The `IMPLEMENTATION_OPEN` label in this legacy
footer paragraph is stale. A minimal fix (`IMPLEMENTATION_OPEN` → `TRUTH_SYNCED`) is applied to
the tracker alongside this design unit's tracker row addition. No broader history rewrite is needed
— all §17 and §9 table rows correctly reflect `TRUTH_SYNCED` already.

---

## J. Design Decision Record

| Field | Value |
|---|---|
| **Unit ID** | `TTP-CONTROL-PLANE-FEATURE-DISABLED-UX-001` |
| **Type** | Frontend — copy-only fix (no backend, no schema, no routes) |
| **Status** | `DESIGN_OPEN` — awaiting Paresh approval |
| **Predecessor** | `TTP-CONTROL-PLANE-TRADETRUST-UI-RUNTIME-AUDIT-001` (`AUDIT_COMPLETE`) |
| **Surfaces** | VpcConsole · TtpEnrollmentAdmin · TtpEligibilityConsole (3 TTP-gated control-plane surfaces only) |
| **Files to modify** | `VpcConsole.tsx` · `TtpEnrollmentAdmin.tsx` · `TtpEligibilityConsole.tsx` |
| **Files to create** | `tests/ttp-control-plane-feature-disabled-ux.test.tsx` |
| **Proposed copy** | `"TradeTrust Pay is not currently enabled on this platform."` (pending Paresh confirmation) |
| **Test count** | 9 new unit tests (TC-FDU-001 through TC-FDU-009) |
| **Legal gate** | None — admin-only operational copy; not shown to tenants |
| **Activation impact** | None — `ttp_enabled=false` unchanged throughout |
| **Commit scope** | Single atomic commit: frontend catch-block fix + unit tests |

**Authority:** Paresh Patel — TexQtic founder / operator  
**`ttp_enabled` state:** `false` — UNCHANGED  
**Implementation authorized:** No — design only; Paresh must explicitly approve before implementation prompt is opened  
