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

## §4. Hub-Sync Checklist (TECS-LAUNCH-READINESS-HUB-DRIFT-CONTROL-ADDENDUM-001 §8)

### Q1 — Did this unit change launch readiness truth?

**Answer: YES.**

FAM-07G verify-close and hub sync recorded FAM-07G FC-03 hardening completion across all four hub files. Evidence rows updated; FTR-AUTH-001 description note updated; LFI FAM-07 row updated. FAM-07 status remains `PARTIALLY_IMPLEMENTED`.

### Q2 — Which family or requirement changed?

**Answer: FAM-07 (Tenant Onboarding and Invite); FTR-AUTH-001 (New-User Activation Path).**

FAM-07 evidence row updated in LFI to note FAM-07G verify-close (2026-05-29, commit `6b4ebd30`). FTR-AUTH-001 description updated in FUTURE-TODO-REGISTER.md to note FAM-07G FC-03 hardening. FAM-07 status remains `PARTIALLY_IMPLEMENTED` — NOT VERIFIED_COMPLETE.

### Q3 — Which hub documents need to be updated as a result of this unit?

**Answer:**
- `governance/control/NEXT-ACTION.md` ✅ updated
- `governance/control/OPEN-SET.md` ✅ updated
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md` ✅ updated
- `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` ✅ updated

### Q4 — What evidence supports the update?

**Evidence level:** `TEST_CONFIRMED`

**Evidence source:** commit `6b4ebd30` — `[TEXQTIC] fix: harden new-user invite activation state (FAM-07G)`

- `pnpm exec tsc --noEmit` → EXIT 0 (no output). PASS.
- Backend: 21/21 tests PASS (`tenant-activate.integration.test.ts`).
- Frontend: 15/15 tests PASS (`onboarding-activation.test.tsx`).
- Artifact: `artifacts/control-plane/FAM-07G-NEW-USER-ACTIVATION-FC03-HARDENING-AND-TEST-COVERAGE-001.md`

### Q5 — Are CRM or CAE details at risk of being duplicated into the main repo hub?

**Answer: NO.**

FAM-07G made no CRM or CAE changes. No CRM/CAE details were inlined into any hub document during this unit. XDEP boundary preserved.

### Q6 — Are any planned items at risk of being incorrectly promoted to MVP status without Paresh confirmation?

**Answer: NO.**

FAM-07 is explicitly NOT promoted to VERIFIED_COMPLETE. FTR-AUTH-001 remains PARTIAL. FTR-LEGAL-003 and HD-001 remain open/blocked. FAM-07E through FAM-07J remain HOLD_FOR_AUTHORIZATION.

### Q7 — Are any stale hub rows now superseded by this unit's findings?

**Answer: YES.**

`governance/control/NEXT-ACTION.md` `last_closed_unit` pointer previously referenced `FAM-07D3-VERIFY-CLOSE-001` (commit `ef025082`). This unit advances the pointer to `FAM-07G-VERIFY-CLOSE-AND-AUTH-PATH-HUB-SYNC-001`. Prior rows preserved for history; pointer updated to reflect current verify-close.

### Q8 — If no hub update is needed, record: NO_HUB_UPDATE_REQUIRED

**Answer: HUB_UPDATE_REQUIRED.** All four hub files updated to record FAM-07G verify-close completion (see Q3).

### Q9 — Were hub files allowlisted in this unit's allowlist?

**Answer: YES.**
- `governance/control/NEXT-ACTION.md` ✅ in allowlist
- `governance/control/OPEN-SET.md` ✅ in allowlist
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md` ✅ in allowlist
- `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` ✅ in allowlist
- `artifacts/control-plane/FAM-07G-VERIFY-CLOSE-AND-AUTH-PATH-HUB-SYNC-001.md` ✅ in allowlist

### Q10 — What FTR items are mapped to this family (from FUTURE-TODO-REGISTER.md)?

**Answer:**

| FTR ID | Current Status | Map Tag |
|--------|---------------|---------|
| FTR-AUTH-001 | PARTIAL | → FAM-07 |
| FTR-LEGAL-003 | OPEN / MVP_CRITICAL | → FAM-07 |
| HD-001 | VERIFIED_BLOCKED | → FAM-07 |
| FTR-AUTH-002 | POST_MVP / BLOCKED | → FAM-07 |
| FTR-AUTH-004 | PILOT_REQUIRED / OPEN | → FAM-07 |

### Q11 — Are any mapped FTR items designated MVP_CRITICAL or LAUNCH_BLOCKER?

**Answer: YES.**

| FTR ID | Priority | Status |
|--------|----------|--------|
| FTR-AUTH-001 | MVP_CRITICAL | PARTIAL — new-user Supabase invite sub-path DESIGN_GATED |
| FTR-LEGAL-003 | MVP_CRITICAL | OPEN — ToS consent not yet implemented |
| HD-001 | MVP_CRITICAL | VERIFIED_BLOCKED — SMTP infrastructure prerequisite unresolved |
| FTR-AUTH-004 | PILOT_REQUIRED | OPEN — branded auth emails deferred to pilot |
| FTR-AUTH-002 | POST_MVP | BLOCKED — WL onboarding deferred |

### Q12 — For each mapped FTR item: what is its scope classification for this family?

**Answer:**

| FTR ID | Scope Classification | Rationale |
|--------|---------------------|-----------|
| FTR-AUTH-001 | CORE | New-user invite activation is a core FAM-07 delivery requirement |
| FTR-LEGAL-003 | CORE | ToS consent gate is a core launch prerequisite for tenant onboarding |
| HD-001 | CORE | SMTP infrastructure is required to send invite emails |
| FTR-AUTH-004 | OVERLAY | Branded auth emails extend the core path; deferred to pilot |
| FTR-AUTH-002 | POST_MVP | White-label onboarding is explicitly post-MVP |

### Q13 — Does LFI §7 action register surface all open MVP_CRITICAL and LAUNCH_BLOCKER overlay gates for this family?

**Answer: YES.**

LFI FAM-07 detail row (updated this unit) notes: FTR-AUTH-001 PARTIAL (new-user sub-path DESIGN_GATED); FTR-LEGAL-003 MVP_CRITICAL/OPEN; HD-001 VERIFIED_BLOCKED. All three MVP_CRITICAL items are visible in the LFI FAM-07 row. FAM-07 status recorded as NOT VERIFIED_COMPLETE.

### Q14 — Does LFI §9 MVP cutline correctly reflect the verified/open split for this family?

**Answer: YES.**

LFI summary table for FAM-07 reflects `TEST_CONFIRMED / PARTIALLY_IMPLEMENTED`. FAM-07 is NOT marked VERIFIED_COMPLETE. The sign-in-first D3 path is verified; the new-user Supabase invite sub-path is DESIGN_GATED/OPEN. The split is correctly represented.

---

## §5. AR Anti-Drift Rule Compliance (TECS-LAUNCH-READINESS-HUB-DRIFT-CONTROL-ADDENDUM-001 §20)

### AR-001 — FTR → FAM Mapping Tag Required

**Status: PASS.**

All FTR items mapped to FAM-07 carry `→ FAM-07` tags (confirmed in FUTURE-TODO-REGISTER.md rows for FTR-AUTH-001, FTR-LEGAL-003, HD-001, FTR-AUTH-002, FTR-AUTH-004). No orphaned FTR items found for this family.

### AR-002 — Verified Family Must Carry Overlay Inventory Note

**Status: N/A.**

FAM-07 is NOT `VERIFIED_COMPLETE`. The overlay inventory note requirement applies only to verified-complete families. FAM-07 remains `PARTIALLY_IMPLEMENTED`. When FAM-07 eventually reaches VERIFIED_COMPLETE, an overlay inventory note in LFI §7 will be mandatory at that time.

### AR-003 — No Family Status Downgrade for Open Overlay Items

**Status: PASS.**

FAM-07 status is NOT downgraded. FAM-07 remains `PARTIALLY_IMPLEMENTED` (unchanged from prior verify-close at FAM-07D3). Open FTR overlay items (FTR-AUTH-004, FTR-AUTH-002) are recorded in the LFI overlay note — they do not downgrade the family status.

### AR-004 — MVP_CRITICAL and LAUNCH_BLOCKER FTR Items Must Be Visible in LFI

**Status: PASS.**

FTR-AUTH-001 (MVP_CRITICAL / PARTIAL) is visible in LFI FAM-07 detail row. FTR-LEGAL-003 (MVP_CRITICAL / OPEN) is visible. HD-001 (MVP_CRITICAL / VERIFIED_BLOCKED) is noted. All three MVP_CRITICAL items are surfaced in the LFI FAM-07 row.

### AR-005 — FTR Status Changes Must Answer the Family Impact Question

**Status: PASS.**

FTR-AUTH-001 status is unchanged (PARTIAL → PARTIAL). The description note was updated to record FAM-07G FC-03 hardening (2026-05-29, commit `6b4ebd30`). LFI impact: LFI FAM-07 row updated accordingly. No FTR status change affected a different LFI family row. `NO_LFI_IMPACT` on non-FAM-07 families.

### AR-006 — Verify-Close Hub-Sync Checklist Extended with Q10–Q14

**Status: PASS.**

Q1 through Q14 are answered in §4 of this artifact. Q10–Q14 overlay gate inventory is completed above.

### AR-007 — CRM/CAE XDEP Hard Boundary

**Status: PASS.**

FAM-07G made no CRM or CAE changes. No CRM/CAE implementation details were inlined into any hub document during this unit. XDEP boundary preserved. No contamination drift introduced.

### AR-008 — Bidirectional Cross-Reference Discipline for New Items

**Status: PASS.**

This verify-close unit writes a new LFI FAM-07 verify-close note (commit `6b4ebd30`, 2026-05-29). All open FTR items mapped to FAM-07 were checked for MVP_CRITICAL/LAUNCH_BLOCKER status (Q10–Q11). FTR-AUTH-001, FTR-LEGAL-003, and HD-001 are surfaced in the LFI FAM-07 row. The verify-close artifact bidirectionally references hub rows; LFI FAM-07 row references this verify-close artifact. No new FTR items were created in this unit.

---

## §6. Hub-Sync Changes Applied

| File | Change |
|------|--------|
| `governance/control/NEXT-ACTION.md` | `last_closed_unit` → FAM-07G-VERIFY-CLOSE. Status VERIFIED_COMPLETE. Runtime verdict note updated. |
| `governance/control/OPEN-SET.md` | Operating note added: FAM-07F+G complete, commit `6b4ebd30`. |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | FTR-AUTH-001 description note: FAM-07G FC-03 hardening added. Status remains PARTIAL. |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | FAM-07 evidence rows updated: FAM-07G verify-close noted. NOT VERIFIED_COMPLETE. |
| `artifacts/control-plane/FAM-07G-VERIFY-CLOSE-AND-AUTH-PATH-HUB-SYNC-001.md` | This file — created, force-added; governance normalization applied. |

---

## §7. Allowlist Boundary Confirmation

Files modified in this verify-close unit:
- `governance/control/NEXT-ACTION.md` ✅
- `governance/control/OPEN-SET.md` ✅
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md` ✅
- `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` ✅
- `artifacts/control-plane/FAM-07G-VERIFY-CLOSE-AND-AUTH-PATH-HUB-SYNC-001.md` ✅

No source files, test files, schema files, or .env files modified.

---

## §8. Governance Review

| Contract | Status | Note |
|----------|--------|-------|
| `openapi.tenant.json` | N/A | No route changes in FAM-07G |
| `db-naming-rules.md` | N/A | No schema changes |
| `rls-policy.md` | N/A | No RLS changes |
| `event-names.md` | N/A | No event changes |
| `ARCHITECTURE-GOVERNANCE.md` | N/A | No boundary changes |

---

## §9. Hard Constraints Preserved

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

## §10. Commit

```
[TEXQTIC] governance: verify-close FAM-07G auth-path hub sync
```

---

## §11. Final Enum

`FAM_07G_VERIFY_CLOSE_COMPLETE_FTR_AUTH_001_REMAINS_PARTIAL`

---

*Verify-close performed at HEAD `6b4ebd30` — 2026-05-29*
*Governance normalization applied 2026-05-29: Q1–Q14 formal checklist and AR-001..AR-008 compliance added per TECS-LAUNCH-READINESS-HUB-DRIFT-CONTROL-ADDENDUM-001 §8 and §20.*
