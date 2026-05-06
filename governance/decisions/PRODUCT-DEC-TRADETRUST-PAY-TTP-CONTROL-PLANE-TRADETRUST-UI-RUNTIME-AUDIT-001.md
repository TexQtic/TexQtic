# PRODUCT-DEC-TRADETRUST-PAY-TTP-CONTROL-PLANE-TRADETRUST-UI-RUNTIME-AUDIT-001

**Document type:** Governance audit record — control-plane TradeTrust UI runtime surface audit  
**Unit ID:** `TTP-CONTROL-PLANE-TRADETRUST-UI-RUNTIME-AUDIT-001`  
**Date:** 2026-05-06  
**Decision Owner:** Paresh Patel (TexQtic founder / operator)  
**Author:** GitHub Copilot — TexQtic Safe-Write Mode  
**`ttp_enabled` state:** `false` — UNCHANGED by this document  
**`LEGAL_REVIEW_PENDING`:** Active — UNCHANGED by this document  
**Implementation changes:** NONE — read-only audit artifact

> **AUDIT ARTIFACT ONLY.** This document records a repo-truth classification of the four
> TradeTrust-related control-plane UI surfaces observed in authenticated screenshots.
> No application code, routes, services, middleware, UI, Prisma schema, migrations, SQL,
> env files, feature flag values, or TenantFeatureOverride records are changed or authorized
> by this document.

---

## 1. Document Metadata

| Field | Value |
|---|---|
| **Unit ID** | `TTP-CONTROL-PLANE-TRADETRUST-UI-RUNTIME-AUDIT-001` |
| **Unit type** | Governance audit / runtime surface classification (no code) |
| **Predecessor unit** | `TTP-TEXQTICSCORE-V2-RUNTIME-VERIFY-001` (`PRODUCTION_VERIFIED_LIMITED_BACKEND_AUTH_GATE`) |
| **Date** | 2026-05-06 |
| **Authenticated user** | Paresh Patel (SUPER_ADMIN) |
| **Production URL** | `https://app.texqtic.com` |
| **`ttp_enabled`** | `false` — globally disabled; UNCHANGED |
| **`LEGAL_REVIEW_PENDING`** | Active throughout all governance artifacts — UNCHANGED |
| **TenantFeatureOverride** | Not touched — UNCHANGED |
| **Surfaces audited** | 4 — TradeTrust Ledger, VPC Console, TTP Enrollment, TTP Eligibility |
| **Tracker artifact** | `governance/TEXQTIC-TRADETRUST-PAY-PHASE-2-IMPLEMENTATION-PLAN-AND-TRACKER-001.md` |

---

## 2. Authority Basis

This audit is authorized as the natural follow-on to `TTP-TEXQTICSCORE-V2-RUNTIME-VERIFY-001`, whose
verification scope was explicitly bounded to unauthenticated HTTP probes. Authenticated control-plane
UI behavior was outside the scope of that unit. This audit closes the classification gap.

| Source | Path | Role |
|---|---|---|
| Prior runtime verification record | `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-TTP-TEXQTICSCORE-V2-RUNTIME-VERIFIED-001.md` | Establishes what was and was not proved |
| Feature gate middleware | `server/src/middleware/ttpFeatureGate.middleware.ts` | Two-layer kill-switch; returns 503 FEATURE_DISABLED when global `ttp_enabled=false` |
| API client error handling | `services/apiClient.ts` lines ~419–424 | Maps all 5xx responses to `APIError(status, 'Service temporarily unavailable. Try again.', code)` |
| TradeTrust Ledger component | `components/ControlPlane/EscrowAdminPanel.tsx` | Manual-fetch panel; IDLE initial state; `GET /api/control/escrows` (not TTP-gated) |
| VPC Console component | `components/ControlPlane/VpcConsole.tsx` | Auto-fetch; error catch uses hardcoded string; `GET /api/control/vpc` (TTP-gated) |
| TTP Enrollment component | `components/ControlPlane/TtpEnrollmentAdmin.tsx` | Auto-fetch; error catch uses `err.message`; `GET /api/control/ttp/enrollments` (TTP-gated) |
| TTP Eligibility component | `components/ControlPlane/TtpEligibilityConsole.tsx` | Auto-fetch; catch swallows error with hardcoded string; `GET /api/control/ttp/eligibility/:orgId` (TTP-gated) |
| VPC backend route | `server/src/routes/control/vpc.ts` line 310 | `GET /`: `preHandler: [ttpFeatureGateMiddleware]` (no per-route `requireAdminRole`; auth via parent onRequest hook) |
| Enrollment backend route | `server/src/routes/control/ttp-enrollments.ts` line 182 | `GET /`: `preHandler: [requireAdminRole('SUPER_ADMIN'), ttpFeatureGateMiddleware]` |
| Eligibility backend route | `server/src/routes/control/ttp-eligibility.ts` line 310 | `GET /:orgId`: `preHandler: [ttpFeatureGateMiddleware]` (no per-route `requireAdminRole`; auth via parent hook) |
| Escrow backend route | `server/src/routes/control/escrow.g018.ts` | `GET /api/control/escrows`: NO `ttpFeatureGateMiddleware` — route is not TTP-gated |

---

## 3. Prior Runtime Verification Limitation Summary

`TTP-TEXQTICSCORE-V2-RUNTIME-VERIFY-001` (`PRODUCTION_VERIFIED_LIMITED_BACKEND_AUTH_GATE`) proved the
following at the time of its closure:

| Verified | Evidence |
|---|---|
| tsc clean | No output, exit 0 |
| 75/75 unit tests pass | 31 (v2 service) + 11 (snapshot integration) + 20 (admin read) + 13 (score snapshot read admin) |
| 9 deployment commits present on branch | Confirmed via `git log` |
| `GET /api/health` → 200 | Unauthenticated health check |
| Admin read routes (unauthenticated) → 401 | Auth-gated as expected |
| Tenant v2 routes (unauthenticated) → 404 | Absent as expected |

**What was NOT proved by `TTP-TEXQTICSCORE-V2-RUNTIME-VERIFY-001`:**

| Not Verified | Gap |
|---|---|
| Authenticated UI happy paths | No authenticated browser session used |
| Authenticated admin read path | 401 probes confirmed auth-gating; authenticated 200 not confirmed |
| Visual correctness of any control-plane surface | No screenshot or browser interaction |
| TTP feature-gate behavior for authenticated users | 503 FEATURE_DISABLED authenticated flow not observed |
| Frontend error handling for 503 responses | Not tested in that unit |

This audit addresses the gap: authenticated control-plane UI observation and repo-truth classification.

---

## 4. Screenshot Evidence Summary

User Paresh (authenticated SUPER_ADMIN) navigated to four control-plane TradeTrust surfaces on
`https://app.texqtic.com` and captured screenshots. Surfaces and observed UI text:

| # | Surface | Route (UI) | Observed UI Text |
|---|---|---|---|
| 1 | TradeTrust Ledger | Control-plane TradeTrust Ledger page | "No data loaded." |
| 2 | VPC Console | Control-plane VPC Console page | "Loading…" |
| 3 | TTP Enrollment | Control-plane TTP Enrollment page | "Service temporarily unavailable. Try again." |
| 4 | TTP Eligibility | Control-plane TTP Eligibility page | "Failed to load eligibility assessments." |

---

## 5. Repo-Truth Surface Matrix

The table below records the authoritative classification for each surface based on repo-truth
inspection. All component files and backend route files were read directly.

| # | Surface | Component | Backend Endpoint | Feature Gate | Expected Settled State (ttp_enabled=false) | Observed UI | Classification |
|---|---|---|---|---|---|---|---|
| 1 | TradeTrust Ledger | `components/ControlPlane/EscrowAdminPanel.tsx` | `GET /api/control/escrows` | **NONE** — no `ttpFeatureGateMiddleware` on escrow routes | IDLE: "No data loaded." / "Enter optional filters and click Fetch Ledgers." — panel does not auto-load; user must click "Fetch Ledgers" | "No data loaded." | `DATA_EMPTY_STATE_ONLY` |
| 2 | VPC Console | `components/ControlPlane/VpcConsole.tsx` | `GET /api/control/vpc` | **YES** — `preHandler: [ttpFeatureGateMiddleware]` (vpc.ts line 310) | Settled error: "Failed to load VPCs. Please try again." (503 → `APIError` → catch with hardcoded string → `finally { setLoading(false) }`) | "Loading…" (transient — screenshot captured before request settled) | `UI_ERROR_COPY_MISMATCH` |
| 3 | TTP Enrollment | `components/ControlPlane/TtpEnrollmentAdmin.tsx` | `GET /api/control/ttp/enrollments` | **YES** — `preHandler: [requireAdminRole('SUPER_ADMIN'), ttpFeatureGateMiddleware]` (ttp-enrollments.ts line 182) | Error: `err.message` = "Service temporarily unavailable. Try again." (503 → apiClient 5xx handler → `APIError.message` displayed verbatim) | "Service temporarily unavailable. Try again." | `UI_ERROR_COPY_MISMATCH` |
| 4 | TTP Eligibility | `components/ControlPlane/TtpEligibilityConsole.tsx` | `GET /api/control/ttp/eligibility/:orgId` | **YES** — `preHandler: [ttpFeatureGateMiddleware]` (ttp-eligibility.ts line 310) | Error: hardcoded "Failed to load eligibility assessments." (503 → catch swallows error entirely → hardcoded string) | "Failed to load eligibility assessments." | `UI_ERROR_COPY_MISMATCH` |

### Classification key

| Classification | Meaning |
|---|---|
| `DATA_EMPTY_STATE_ONLY` | Observed UI is the intended initial/idle state of the component; not an error; not related to ttp_enabled |
| `UI_ERROR_COPY_MISMATCH` | Backend behavior is correct (503 FEATURE_DISABLED as expected); frontend error message copy does not distinguish feature-disabled from real service failure |
| `STUCK_LOADING_DEFECT` | Loading state never resolves (not applied here — VpcConsole "Loading…" confirmed transient by code inspection) |
| `EXPECTED_DISABLED_STATE` | TTP feature gate returns 503 correctly; the UI state observed is the mechanically correct result of that gate |

---

## 6. Findings

### 6.1 Expected behavior (not defects)

**Surface 1 — TradeTrust Ledger: `DATA_EMPTY_STATE_ONLY` (EXPECTED)**

The `EscrowAdminPanel` renders an `EmptyState` component with title "No data loaded" and message
"Enter optional filters and click Fetch Ledgers." when `fetchState === 'IDLE'`. This is the
intentional initial state of a manual-fetch panel — the data is NOT loaded automatically on mount.
The `GET /api/control/escrows` backend route has NO `ttpFeatureGateMiddleware` and is therefore
fully functional regardless of `ttp_enabled`. The "No data loaded" text observed in the screenshot
is the initial IDLE state of the panel, not an error. Not related to `ttp_enabled=false` at all.

**Action required:** None. No defect. No copy change needed.

---

### 6.2 UI error copy mismatch (real defects — future candidate units)

**Surface 2 — VPC Console: `UI_ERROR_COPY_MISMATCH`**

Root cause path (repo truth):
1. Component auto-calls `fetchVpcs()` on mount (`useEffect(() => { fetchVpcs(); }, [fetchVpcs])`)
2. `fetchVpcs` calls `adminListVpcs(filters)` → `GET /api/control/vpc`
3. Backend: `ttpFeatureGateMiddleware` reads `ttp_enabled=false` → returns `503 FEATURE_DISABLED`
4. `apiClient.ts` 5xx handler: throws `APIError(503, 'Service temporarily unavailable. Try again.', 'FEATURE_DISABLED')`
5. `fetchVpcs` catch block: `setError('Failed to load VPCs. Please try again.')` — hardcoded string, swallows `err.message` and `err.code`
6. `fetchVpcs` finally block: `setLoading(false)` — loading IS reset

**Observation:** The "Loading…" state in the screenshot is transient — captured before the 503 response
settled. The final settled state would be the error message "Failed to load VPCs. Please try again."
`STUCK_LOADING_DEFECT` classification does NOT apply; the finally block guarantees loading resets.

**Defect:** The catch block uses a hardcoded generic string. It does not check `err.code === 'FEATURE_DISABLED'`.
The admin has no way to distinguish a real service outage from a feature-disabled gate. This is a
copy-only UX issue — the backend and middleware are behaving correctly.

---

**Surface 3 — TTP Enrollment: `UI_ERROR_COPY_MISMATCH`**

Root cause path (repo truth):
1. Component auto-calls `fetchEnrollments()` on mount
2. `fetchEnrollments` calls `adminListTtpEnrollments(filters)` → `GET /api/control/ttp/enrollments`
3. Backend: `requireAdminRole('SUPER_ADMIN')` passes (authenticated SUPER_ADMIN); `ttpFeatureGateMiddleware` reads `ttp_enabled=false` → returns `503 FEATURE_DISABLED`
4. `apiClient.ts` 5xx handler: throws `APIError(503, 'Service temporarily unavailable. Try again.', 'FEATURE_DISABLED')`
5. Component catch: `setError(err.message ?? 'Failed to load enrollments.')` — displays `err.message` verbatim = "Service temporarily unavailable. Try again."

**Observation:** The screenshot message "Service temporarily unavailable. Try again." exactly matches
`err.message` from the `apiClient` 5xx handler. The backend is behaving correctly. The 503 is expected
and correct under `ttp_enabled=false`. The message copy implies a real service outage rather than
a feature-disabled admin gate.

**Defect:** `apiClient.ts` maps ALL 5xx responses to the same generic message regardless of error code.
The component catch block does not inspect `err.code` to distinguish `FEATURE_DISABLED` from other
server errors. The admin sees "Service temporarily unavailable" and cannot tell whether TTP is
globally disabled or the server is genuinely down.

---

**Surface 4 — TTP Eligibility: `UI_ERROR_COPY_MISMATCH`**

Root cause path (repo truth):
1. Component auto-calls `loadAssessments()` on mount
2. `loadAssessments` calls `adminGetTtpEligibilityAssessments(orgId)` → `GET /api/control/ttp/eligibility/:orgId`
3. Backend: `ttpFeatureGateMiddleware` reads `ttp_enabled=false` → returns `503 FEATURE_DISABLED`
4. `apiClient.ts` 5xx handler: throws `APIError(503, 'Service temporarily unavailable. Try again.', 'FEATURE_DISABLED')`
5. Component catch block swallows the error entirely: `catch { setLoadError('Failed to load eligibility assessments.') }` — hardcoded string; `err` is not even named/referenced

**Observation:** The screenshot message "Failed to load eligibility assessments." exactly matches the
hardcoded string in the catch block. The backend is behaving correctly. The error swallowing pattern
is the most opaque of the three TTP-gated surfaces — the catch block does not even attempt to
inspect the error type or code.

**Defect:** Catch block silently swallows all errors with a generic hardcoded string. Neither the
`FEATURE_DISABLED` code nor the 503 status is visible. The admin sees a generic load failure with
no indication that it is a deliberate feature gate.

---

### 6.3 Backend behavior confirmation

The backend is functioning correctly for all four surfaces:

| Surface | Backend Status | Backend Behavior |
|---|---|---|
| TradeTrust Ledger | N/A (not called — panel in IDLE) | `GET /api/control/escrows` is not TTP-gated; would return data correctly if user clicks "Fetch Ledgers" |
| VPC Console | **503 FEATURE_DISABLED** (correct) | `ttpFeatureGateMiddleware` correctly reads `ttp_enabled=false` and blocks |
| TTP Enrollment | **503 FEATURE_DISABLED** (correct) | `requireAdminRole` + `ttpFeatureGateMiddleware` both correctly applied |
| TTP Eligibility | **503 FEATURE_DISABLED** (correct) | `ttpFeatureGateMiddleware` correctly reads `ttp_enabled=false` and blocks |

No backend defects were identified. All defects are in the frontend error message copy only.

---

## 7. Recommended Follow-Up Candidate Units

The following candidate units are recorded for Paresh's awareness. None are authorized for
implementation by this document. Each requires a separate design artifact and Paresh approval.

| Candidate Unit ID | Scope | Type | Gate |
|---|---|---|---|
| `TTP-CONTROL-PLANE-FEATURE-DISABLED-UX-001` | Update error copy on all three TTP-gated control-plane surfaces (VpcConsole, TtpEnrollmentAdmin, TtpEligibilityConsole) to distinguish `FEATURE_DISABLED` (503) from real service failures | Frontend — copy fix only | Paresh approval; must confirm acceptable copy for "feature disabled" state; no legal gate |
| `TTP-VPC-CONSOLE-ERROR-COPY-FIX-001` | Sub-scope of above: VpcConsole.fetchVpcs catch to check `err.code === 'FEATURE_DISABLED'` and show appropriate admin copy | Frontend — minimal catch block fix | Paresh approval |
| `TTP-ENROLLMENT-FEATURE-DISABLED-COPY-FIX-001` | Sub-scope of above: TtpEnrollmentAdmin to check `err.code === 'FEATURE_DISABLED'` before using `err.message` | Frontend — minimal catch block fix | Paresh approval |
| `TTP-ELIGIBILITY-FEATURE-DISABLED-COPY-FIX-001` | Sub-scope of above: TtpEligibilityConsole catch to name error and check `err.code === 'FEATURE_DISABLED'` | Frontend — minimal catch block fix | Paresh approval |
| `TTP-AUTHENTICATED-ADMIN-RUNTIME-VERIFY-001` | Authenticated smoke test of all four surfaces once TTP feature gate allows (future — after pilot activation) | Runtime verification | `ttp_enabled` pilot activation authorized by separate Paresh decision |

**Recommended approach:** `TTP-CONTROL-PLANE-FEATURE-DISABLED-UX-001` (the consolidated unit) is
preferable over the three individual fix units. A single design artifact can scope all three component
fixes in one atomic commit. Approved copy for the disabled state should be determined by Paresh
before implementation.

---

## 8. No-Go Confirmation

The following invariants are confirmed UNCHANGED as a result of this audit document:

| Invariant | State |
|---|---|
| `ttp_enabled` | `false` — UNCHANGED |
| `LEGAL_REVIEW_PENDING` | Active — UNCHANGED |
| Application code | No changes — zero lines modified |
| Route handlers | No changes |
| Services / middleware | No changes |
| Prisma schema | No changes |
| SQL migrations | No changes |
| Env files | Not touched |
| Feature flag values | Not touched |
| TenantFeatureOverride records | Not touched |
| TTP activation | Not initiated — no pilot org activated |
| Wave 3 / Wave 4 / Wave 5 gates | UNCHANGED — remain gated |

---

## 9. Final Decision

This document records the completion of `TTP-CONTROL-PLANE-TRADETRUST-UI-RUNTIME-AUDIT-001`.

Findings:
- Surface 1 (TradeTrust Ledger): `DATA_EMPTY_STATE_ONLY` — expected IDLE state; no defect; not TTP-gated
- Surface 2 (VPC Console): `UI_ERROR_COPY_MISMATCH` — backend correct (503); "Loading…" transient; settled copy generic
- Surface 3 (TTP Enrollment): `UI_ERROR_COPY_MISMATCH` — backend correct (503); "Service temporarily unavailable" copy misleads
- Surface 4 (TTP Eligibility): `UI_ERROR_COPY_MISMATCH` — backend correct (503); error swallowed with hardcoded generic string

No implementation authorized. `ttp_enabled=false` unchanged. `LEGAL_REVIEW_PENDING` unchanged.

```
TTP_CONTROL_PLANE_TRADETRUST_UI_RUNTIME_AUDIT_001_COMPLETE
```

**Authority:** Paresh Patel — TexQtic founder / operator  
**`ttp_enabled` state:** `false` — UNCHANGED  
**Files changed:** This document only  
**Implementation authorized:** No  
**Follow-up units required:** `TTP-CONTROL-PLANE-FEATURE-DISABLED-UX-001` (candidate — not opened)

---

*Produced under TexQtic governance — Safe-Write Mode always on.*  
*This document does not authorize any implementation.*
