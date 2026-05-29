# FAM-07G — Verify-Close and Auth-Path Hub Sync

**Unit ID:** FAM-07G-VERIFY-CLOSE-AND-AUTH-PATH-HUB-SYNC-001
**Family:** FAM-07 — Tenant Onboarding and Invite
**Date:** 2026-05-29
**HEAD at verify-close:** 6b4ebd30
**Status:** VERIFIED_COMPLETE

---

## §1. Authority

**Implementation commit:** `6b4ebd30` — `[TEXQTIC] fix: harden new-user invite activation state (FAM-07G)`

**Implementation artifact:** `artifacts/control-plane/FAM-07G-NEW-USER-ACTIVATION-FC03-HARDENING-AND-TEST-COVERAGE-001.md`

**HEAD at verify-close (current):** `6b4ebd30` — clean worktree confirmed (`git status --short` produced no output).

---

## §2. Scope Recap

FAM-07G applied the FC-03 hardening fix to `App.tsx` (new-user onboarding `onComplete` handler) and added backend and frontend test coverage for the new-user activation path (T-MISS-01..T-MISS-04, F-MISS-01..F-MISS-03). This unit does NOT implement the new-user Supabase invite handling (design still DESIGN_GATED). The D3 authenticated existing-user path was not changed.

---

## §3. Validation Evidence

### Q1 — TypeScript

```
pnpm exec tsc --noEmit
```
**Result:** EXIT 0 (no output). PASS.

### Q2 — Backend Tests

```
pnpm -C server exec vitest run tenant-activate.integration.test
```
**Result:**
```
✓ src/__tests__/tenant-activate.integration.test.ts (21 tests) 540ms
Test Files  1 passed (1)
     Tests  21 passed (21)
```
21 tests PASS (17 pre-existing ACT-001..ACT-007 + 4 new T-MISS-01..T-MISS-04).

### Q3 — Frontend Tests

```
pnpm exec vitest run --config vitest.frontend.config.ts tests/frontend/onboarding-activation.test.tsx
```
**Result:**
```
✓ tests/frontend/onboarding-activation.test.tsx (15 tests) 388ms
Test Files  1 passed (1)
     Tests  15 passed (15)
```
15 tests PASS (12 pre-existing ACT-001..ACT-012 + 3 new F-MISS-01..F-MISS-03 / ACT-013..ACT-015).

---

## §4. Hub-Sync Decisions

### Q4 — Does FAM-07G close the remaining auth-path portion of FTR-AUTH-001?

**Answer: NO.**

FAM-07G hardens the activation state machine and closes test coverage gaps identified in FAM-07F. The FC-03 fix prevents a specific stuck-retry failure mode in the new-user path. However, the new-user Supabase invite sub-path (the Supabase invite dispatch, token validation, and full new-user registration flow) remains DESIGN_GATED. FAM-07G is a hardening and test-coverage unit; it is not an implementation of the new-user invite ingestion path.

**FTR-AUTH-001 classification:** remains **PARTIAL**. No change in status.

- Sign-in-first sub-path: IMPLEMENTED AND VERIFIED (FAM-07D3, commit `637326ba`)
- New-user Supabase invite sub-path: DESIGN_GATED / OPEN (unchanged)
- FC-03 stale-state guard: HARDENED by FAM-07G (activation state recovery no longer stuck after bootstrap failure)

### Q5 — Should LFI FAM-07 status change?

**Answer: NO advance to VERIFIED_COMPLETE.**

FAM-07 remains `PARTIALLY_IMPLEMENTED`. FAM-07G is an authorized bounded sub-unit whose verify-close is captured here. The LFI FAM-07 evidence row will be updated with FAM-07G completion note (test counts, commit). Overall family status unchanged: FTR-LEGAL-003 (ToS consent) remains OPEN / MVP_CRITICAL; HD-001 (SMTP) remains VERIFIED_BLOCKED. Neither can be resolved by this unit.

### Q6 — NEXT-ACTION.md update

`last_closed_unit` advances to `FAM-07G-VERIFY-CLOSE-AND-AUTH-PATH-HUB-SYNC-001`. Status: `VERIFIED_COMPLETE`. `active_delivery_unit_status` remains `HOLD_FOR_AUTHORIZATION`. Do NOT auto-open FAM-07E through FAM-07J.

### Q7 — OPEN-SET.md update

Add operating note: FAM-07F + FAM-07G complete. `artifacts/control-plane/FAM-07G-NEW-USER-ACTIVATION-FC03-HARDENING-AND-TEST-COVERAGE-001.md` committed at `6b4ebd30`.

### Q8 — FUTURE-TODO-REGISTER.md FTR-AUTH-001 update

Update Description cell to note FAM-07G FC-03 hardening (commit `6b4ebd30`, 2026-05-29). Status remains PARTIAL. No readiness or launch-class change.

### Q9 — LAUNCH-FAMILY-INDEX.md FAM-07 row update

Update evidence and status rows to note FAM-07G verify-close complete (2026-05-29, commit `6b4ebd30`). FAM-07 status remains `PARTIALLY_IMPLEMENTED`. NOT VERIFIED_COMPLETE.

### Q10 — FTR-LEGAL-003 (ToS)

Unchanged: OPEN / MVP_CRITICAL. FAM-07G made no ToS changes.

### Q11 — HD-001 (SMTP)

Unchanged: VERIFIED_BLOCKED. Infrastructure prerequisite unchanged.

### Q12 — FTR-AUTH-002 (WL onboarding)

Unchanged: POST_MVP / BLOCKED.

### Q13 — FTR-AUTH-004 (branded auth emails)

Unchanged: PILOT_REQUIRED / OPEN.

### Q14 — FAM-07 family cycle authorized?

**NO.** FAM-07E through FAM-07J remain HOLD_FOR_AUTHORIZATION. Do NOT auto-open any unit.

---

## §5. Hub-Sync Changes Applied

| File | Change |
|------|--------|
| `governance/control/NEXT-ACTION.md` | `last_closed_unit` → FAM-07G-VERIFY-CLOSE. Status VERIFIED_COMPLETE. Runtime verdict note updated. |
| `governance/control/OPEN-SET.md` | Operating note added: FAM-07F+G complete, commit `6b4ebd30`. |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | FTR-AUTH-001 description note: FAM-07G FC-03 hardening added. Status remains PARTIAL. |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | FAM-07 evidence rows updated: FAM-07G verify-close noted. NOT VERIFIED_COMPLETE. |
| `artifacts/control-plane/FAM-07G-VERIFY-CLOSE-AND-AUTH-PATH-HUB-SYNC-001.md` | This file — created, force-added. |

---

## §6. Allowlist Boundary Confirmation

Files modified in this verify-close unit:
- `governance/control/NEXT-ACTION.md` ✅
- `governance/control/OPEN-SET.md` ✅
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md` ✅
- `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` ✅
- `artifacts/control-plane/FAM-07G-VERIFY-CLOSE-AND-AUTH-PATH-HUB-SYNC-001.md` ✅

No source files, test files, schema files, or .env files modified.

---

## §7. Governance Review

| Contract | Status | Note |
|----------|--------|-------|
| `openapi.tenant.json` | N/A | No route changes in FAM-07G |
| `db-naming-rules.md` | N/A | No schema changes |
| `rls-policy.md` | N/A | No RLS changes |
| `event-names.md` | N/A | No event changes |
| `ARCHITECTURE-GOVERNANCE.md` | N/A | No boundary changes |

---

## §8. Hard Constraints Preserved

| Constraint | Preserved |
|------------|-----------|
| FAM-07 NOT marked VERIFIED_COMPLETE | ✅ — status remains PARTIALLY_IMPLEMENTED |
| FTR-LEGAL-003 remains OPEN / MVP_CRITICAL | ✅ |
| HD-001 SMTP remains VERIFIED_BLOCKED | ✅ |
| FTR-AUTH-002 remains POST_MVP / BLOCKED | ✅ |
| FTR-AUTH-004 remains PILOT_REQUIRED / OPEN | ✅ |
| No source code changes in this unit | ✅ |
| FAM-07E through FAM-07J remain HOLD_FOR_AUTHORIZATION | ✅ |

---

## §9. Commit

```
[TEXQTIC] governance: verify-close FAM-07G auth-path hub sync
```

---

## §10. Final Enum

`FAM_07G_VERIFY_CLOSE_AND_HUB_SYNC_COMPLETE`

---

*Verify-close performed at HEAD `6b4ebd30` — 2026-05-29*
