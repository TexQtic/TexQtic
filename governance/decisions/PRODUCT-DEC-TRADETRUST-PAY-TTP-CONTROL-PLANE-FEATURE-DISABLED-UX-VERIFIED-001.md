# PRODUCT-DEC-TRADETRUST-PAY-TTP-CONTROL-PLANE-FEATURE-DISABLED-UX-VERIFIED-001

## Governance Verification Record — TTP Control-Plane Feature-Disabled UX Copy Fix

---

| Field | Value |
|---|---|
| **Unit ID** | `TTP-CONTROL-PLANE-FEATURE-DISABLED-UX-001` |
| **Record type** | Frontend implementation verification |
| **Date** | 2026-05-06 |
| **Author** | Paresh Patel |
| **Platform state** | `ttp_enabled=false` — UNCHANGED |
| **Legal state** | `LEGAL_REVIEW_PENDING` — active, UNCHANGED |
| **Implementation commit** | `3e2dbab` |
| **Status** | `TRUTH_SYNCED` |

---

## 1. Context

`TTP-CONTROL-PLANE-FEATURE-DISABLED-UX-001` was opened as the immediate follow-on to the
control-plane TradeTrust UI runtime audit (`TTP-CONTROL-PLANE-TRADETRUST-UI-RUNTIME-AUDIT-001`
`AUDIT_COMPLETE`). The audit classified 3 control-plane surfaces as `UI_ERROR_COPY_MISMATCH`:
VpcConsole, TtpEnrollmentAdmin, and TtpEligibilityConsole.

When `ttp_enabled=false`, the backend's `ttpFeatureGateMiddleware` returns HTTP 503 with body
`{ error: { code: 'FEATURE_DISABLED', message: 'TradeTrust Pay is not enabled for this platform.' } }`.
The `apiClient.ts` 5xx handler promotes this to `APIError` with:
- `err.status` → `503`
- `err.code` → `'FEATURE_DISABLED'`
- `err.message` → `'Service temporarily unavailable. Try again.'` (hardcoded generic string)

Before this fix, all 3 components displayed their generic fallback copy, giving SUPER_ADMIN
operators no signal that the feature is simply disabled rather than experiencing a real error.

Design artifact: `docs/TECS-TTP-CONTROL-PLANE-FEATURE-DISABLED-UX-001-DESIGN-v1.md`.

---

## 2. Implementation Scope

**Scope:** Frontend copy-only — 3 catch-block additions.

**What changed:**

- No backend code changed
- No API routes changed
- No services changed
- No middleware changed
- No Prisma schema changed
- No SQL / migrations applied
- No feature flags changed
- No env files changed
- No tenant-plane components changed
- No legal constants changed
- No auth / session logic changed

**Approved copy (verbatim, confirmed by Paresh Patel):**

> `TradeTrust Pay is not currently enabled on this platform.`

This string is inlined in each catch block independently. No shared constant is introduced
(no need for a shared constant for 3 locations; inlining avoids import coupling for copy-only
text that is unlikely to diverge from its context).

---

## 3. Files Changed

| File | Change type | Description |
|---|---|---|
| `components/ControlPlane/VpcConsole.tsx` | Modified | `fetchVpcs` catch block: added `FEATURE_DISABLED` branch |
| `components/ControlPlane/TtpEnrollmentAdmin.tsx` | Modified | `load` catch block: added `FEATURE_DISABLED` branch |
| `components/ControlPlane/TtpEligibilityConsole.tsx` | Modified | `loadAssessments` catch block: added `FEATURE_DISABLED` branch |
| `tests/ttp-control-plane-feature-disabled-ux.test.tsx` | Created | 9 unit tests TC-FDU-001 through TC-FDU-009 |
| `governance/TEXQTIC-TRADETRUST-PAY-PHASE-2-IMPLEMENTATION-PLAN-AND-TRACKER-001.md` | Modified | Status → `TRUTH_SYNCED`; token appended to §20 |

---

## 4. Component Implementation Summary

### 4.1 VpcConsole.tsx — `fetchVpcs` catch block

`APIError` was already imported. Changed the generic `setError('...')` to:

```typescript
} catch (err) {
  if (err instanceof APIError && err.code === 'FEATURE_DISABLED') {
    setError('TradeTrust Pay is not currently enabled on this platform.');
  } else {
    setError('Failed to load VPCs. Please try again.');
  }
} finally {
  setLoading(false);
}
```

**Untouched:** `generateVpc` catch, `transitionVpc` catch — these are mutation paths; the
feature-disabled guard is at list-load (first thing the user sees on open). Mutation catches
show action-specific error copy which is appropriate for their context.

### 4.2 TtpEnrollmentAdmin.tsx — `load` catch block

`APIError` was already imported. Changed the catch to:

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
  setLoading(false);
}
```

Note: this component's prior catch had a passthrough for `err.message` on APIError (not
`FEATURE_DISABLED`). That pass-through is preserved in the else-if branch to avoid
regressing informative error messages for other failure modes.

**Untouched:** `ReviewDialog` mutation catch.

### 4.3 TtpEligibilityConsole.tsx — `loadAssessments` catch block

`APIError` was already imported. Changed the anonymous catch to:

```typescript
} catch (err) {
  if (err instanceof APIError && err.code === 'FEATURE_DISABLED') {
    setLoadError('TradeTrust Pay is not currently enabled on this platform.');
  } else {
    setLoadError('Failed to load eligibility assessments.');
  }
} finally {
  setLoading(false);
}
```

The audit noted this component's original catch swallowed the error entirely (no `setLoadError`
call at all). This fix both adds the `FEATURE_DISABLED` branch and restores the generic fallback
for other errors — the audit finding is now fully resolved.

**Untouched:** assessment submission mutation catch.

---

## 5. Test Summary

**File:** `tests/ttp-control-plane-feature-disabled-ux.test.tsx`

**Strategy:** Pure logic tests — three inline resolver functions mirror the exact catch-block
conditional logic from each component. Real `APIError` class is used directly (not mocked).
No component rendering required; no jsdom; no `@testing-library/react` (confirmed absent from
`node_modules` in this repo). This is the correct and only viable pattern for async stateful
components in this codebase.

| Test ID | Surface | Scenario | Expected result |
|---|---|---|---|
| TC-FDU-001 | VpcConsole | `APIError` 503 `FEATURE_DISABLED` | Feature-disabled copy |
| TC-FDU-002 | VpcConsole | `APIError` 500 `SERVER_ERROR` | Generic VPC error copy |
| TC-FDU-003 | VpcConsole | Non-`APIError` (plain `Error`) | Generic VPC error copy |
| TC-FDU-004 | TtpEnrollmentAdmin | `APIError` 503 `FEATURE_DISABLED` | Feature-disabled copy |
| TC-FDU-005 | TtpEnrollmentAdmin | `APIError` 500 with message (no FEATURE_DISABLED) | `err.message` passthrough |
| TC-FDU-006 | TtpEnrollmentAdmin | Non-`APIError` (plain `Error`) | Generic enrollment error copy |
| TC-FDU-007 | TtpEligibilityConsole | `APIError` 503 `FEATURE_DISABLED` | Feature-disabled copy |
| TC-FDU-008 | TtpEligibilityConsole | `APIError` 500 `SERVER_ERROR` | Generic eligibility error copy |
| TC-FDU-009 | TtpEligibilityConsole | Non-`APIError` (plain `Error`) | Generic eligibility error copy |

**Result:** 9/9 pass.

---

## 6. Validation Evidence

### F.1 — Typecheck (tsc --noEmit)

```
Command: pnpm exec tsc --noEmit
Output: (no output)
Result: PASS — zero type errors
```

### F.2 — New tests (targeted run)

```
Command: pnpm --dir server exec vitest run ../tests/ttp-control-plane-feature-disabled-ux.test.tsx

 ✓ ../tests/ttp-control-plane-feature-disabled-ux.test.tsx (9 tests) 3ms
   ✓ TTP-CONTROL-PLANE-FEATURE-DISABLED-UX-001 — VpcConsole fetchVpcs catch (3)
     ✓ TC-FDU-001: APIError 503 FEATURE_DISABLED → shows feature-disabled copy 1ms
     ✓ TC-FDU-002: APIError 500 SERVER_ERROR → shows generic VPC error copy 0ms
     ✓ TC-FDU-003: non-APIError (plain Error) → shows generic VPC error copy 0ms
   ✓ TTP-CONTROL-PLANE-FEATURE-DISABLED-UX-001 — TtpEnrollmentAdmin load catch (3)
     ✓ TC-FDU-004: APIError 503 FEATURE_DISABLED → shows feature-disabled copy 0ms
     ✓ TC-FDU-005: APIError 500 with message (no FEATURE_DISABLED code) → shows err.message 0ms
     ✓ TC-FDU-006: non-APIError (plain Error) → shows generic enrollment error copy 0ms
   ✓ TTP-CONTROL-PLANE-FEATURE-DISABLED-UX-001 — TtpEligibilityConsole loadAssessments catch (3)
     ✓ TC-FDU-007: APIError 503 FEATURE_DISABLED → shows feature-disabled copy 0ms
     ✓ TC-FDU-008: APIError 500 SERVER_ERROR → shows generic eligibility error copy 0ms
     ✓ TC-FDU-009: non-APIError (plain Error) → shows generic eligibility error copy 0ms

 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  08:40:59
   Duration  404ms
```

### F.3 — Regression (4 test files including new)

```
Command: pnpm --dir server exec vitest run --no-file-parallelism
  "../tests/b2b-buyer-catalog-listing.test.tsx"
  "../tests/adminrbac-registry-read-ui.test.tsx"
  "../tests/rfq-buyer-list-ui.test.tsx"
  "../tests/ttp-control-plane-feature-disabled-ux.test.tsx"

 ✓ ../tests/adminrbac-registry-read-ui.test.tsx (6 tests) 22ms
 ✓ ../tests/rfq-buyer-list-ui.test.tsx (6 tests) 21ms
 ✓ ../tests/b2b-buyer-catalog-listing.test.tsx (32 tests) 7ms
 ✓ ../tests/ttp-control-plane-feature-disabled-ux.test.tsx (9 tests) 3ms

 Test Files  4 passed (4)
      Tests  53 passed (53)
   Start at  08:44:28
   Duration  2.38s
```

### F.4 — Commit gate (diff)

```
Command: git diff --name-only (before stage)
Output:
  components/ControlPlane/TtpEligibilityConsole.tsx
  components/ControlPlane/TtpEnrollmentAdmin.tsx
  components/ControlPlane/VpcConsole.tsx
  governance/TEXQTIC-TRADETRUST-PAY-PHASE-2-IMPLEMENTATION-PLAN-AND-TRACKER-001.md
  tests/ttp-control-plane-feature-disabled-ux.test.tsx (untracked)

Result: Exactly 5 allowlisted files — PASS
```

### F.5 — Commit 1

```
[main 3e2dbab] [TEXQTIC] fix(tradetrust-pay): show feature-disabled copy in control-plane ttp panels
 5 files changed, 197 insertions(+), 12 deletions(-)
 create mode 100644 tests/ttp-control-plane-feature-disabled-ux.test.tsx
```

---

## 7. Safety / No-Go Confirmation

| Invariant | Required state | Actual state |
|---|---|---|
| `ttp_enabled` | `false` — UNCHANGED | `false` — UNCHANGED ✓ |
| `LEGAL_REVIEW_PENDING` | Active — UNCHANGED | Active — UNCHANGED ✓ |
| `services/apiClient.ts` | NOT MODIFIED | NOT MODIFIED ✓ |
| Backend routes / services / middleware | NOT MODIFIED | NOT MODIFIED ✓ |
| Prisma schema / SQL / migrations | NOT MODIFIED | NOT MODIFIED ✓ |
| Env files / feature flags | NOT MODIFIED | NOT MODIFIED ✓ |
| Tenant-plane components | NOT MODIFIED | NOT MODIFIED ✓ |
| `EscrowAdminPanel.tsx` | NOT MODIFIED | NOT MODIFIED ✓ |
| Legal constants | NOT MODIFIED | NOT MODIFIED ✓ |
| Auth / session logic | NOT MODIFIED | NOT MODIFIED ✓ |
| Wave 3/4/5 gates | UNCHANGED | UNCHANGED ✓ |

---

## 8. Production Verification Requirement (OPEN)

**Visual verification is required after next production deployment before this record may be
closed as fully complete.** The following screenshots must be captured by a SUPER_ADMIN operator
while `ttp_enabled=false`:

| Screenshot ID | Surface | URL path (approx.) | Expected content |
|---|---|---|---|
| SS-FDU-001 | VPC Console | `/control-plane/vpc` | Error panel shows `"TradeTrust Pay is not currently enabled on this platform."` |
| SS-FDU-002 | TTP Enrollment | `/control-plane/ttp/enrollment` | Error panel shows `"TradeTrust Pay is not currently enabled on this platform."` |
| SS-FDU-003 | TTP Eligibility | `/control-plane/ttp/eligibility` | Error panel shows `"TradeTrust Pay is not currently enabled on this platform."` |

Until these screenshots are captured and appended to this record (or a separate visual
verification document), `TTP-CONTROL-PLANE-FEATURE-DISABLED-UX-001` remains `TRUTH_SYNCED`
(code complete + tests pass) but not `PRODUCTION_VERIFIED`.

---

## 9. Final Decision Token

```
TTP_CONTROL_PLANE_FEATURE_DISABLED_UX_001_VERIFIED_COMPLETE
```

**Authority:** Paresh Patel — TexQtic founder / operator
**`ttp_enabled` state:** `false` — UNCHANGED
**`LEGAL_REVIEW_PENDING` state:** Active — UNCHANGED
**Implementation commit:** `3e2dbab`
**Governance commit:** (this file — commit 2)
