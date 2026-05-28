# FAM-07D3-VERIFY-CLOSE-AND-HUB-SYNC-001

## Verify-Close and Hub-Sync Report — FAM-07D3 Authenticated Invite Acceptance

**Unit ID:** FAM-07D3-VERIFY-CLOSE-AND-HUB-SYNC-001  
**Date:** 2026-05-28  
**Status:** COMPLETE  
**Authorized by:** Paresh Patel  
**Implementation commit verified:** `637326ba`  
**Governed by:** TECS §8, TECS-LAUNCH-READINESS-HUB-DRIFT-CONTROL-ADDENDUM-001  
**TECS unit this closes:** FAM-07D3-TENANT-ONBOARDING-AUTHENTICATED-INVITE-ACCEPTANCE-001  
**Final enum:** `FAM_07D3_VERIFY_CLOSE_HUB_SYNC_COMPLETE_AUTH_PATH_PARTIAL_FAM07_OPEN`

---

## 1. Scope

This unit performs a strict verify-close and hub-sync pass for FAM-07D3 (authenticated existing-user invite acceptance endpoint and frontend trigger).

**In scope:**
- Verify implementation files against 15 functional criteria
- Run validation commands (tsc, backend tests, frontend tests, lint)
- Answer Q1–Q14 (TECS §8.3 hub-sync checklist)
- Answer AR-001–AR-008 (TECS §8.4 FTR/LFI anti-drift rules)
- Correct date anomaly (2026-07-07 → 2026-05-28)
- Update LFI (FAM-07 rows §5, §6, §7, §9)
- Update FTR (FTR-AUTH-001 row)

**Not in scope:**
- FAM-07E through FAM-07J implementation
- Schema, migration, SMTP, ToS/legal changes
- FAM-07 promotion to VERIFIED_COMPLETE
- Any auth/session architecture changes

---

## 2. Repo-Truth Verification

**Worktree state:** CLEAN (`git status --short` → empty)  
**Commit `637326ba`** contained 8 files:
- `M App.tsx`
- `A artifacts/control-plane/FAM-07D3-TENANT-ONBOARDING-AUTHENTICATED-INVITE-ACCEPTANCE-001.md`
- `M governance/control/NEXT-ACTION.md`
- `M governance/control/OPEN-SET.md`
- `M server/src/__tests__/tenant-activate.integration.test.ts`
- `M server/src/routes/tenant.ts`
- `M services/tenantService.ts`
- `M tests/frontend/onboarding-activation.test.tsx`

---

## 3. Functional Verification — 15 Criteria

### 3.1 Backend endpoint — `POST /api/tenant/activate-authenticated` (`server/src/routes/tenant.ts` lines 6518–6675)

| # | Criterion | Verified |
|---|---|---|
| 1 | Route registered without `tenantAuthMiddleware` (user is not yet a member) | ✅ |
| 2 | Inline `request.tenantJwtVerify({ onlyCookie: false })` → 401 on auth failure | ✅ |
| 3 | `authenticatedUserId` from `jwtPayload.userId` (JWT payload only — not client-submitted) | ✅ |
| 4 | `inviteToken` validated via Zod `z.string().min(1)` server-side | ✅ |
| 5 | Invite lookup by SHA-256 `tokenHash`, `acceptedAt: null`, `expiresAt: { gt: new Date() }` | ✅ |
| 6 | INVALID_INVITE (404) if invite not found or expired | ✅ |
| 7 | `prisma.user.findUnique` by `authenticatedUserId` to resolve actual email | ✅ |
| 8 | Email normalized lowercase; compared to invite email → EMAIL_MISMATCH (403) | ✅ |
| 9 | `prisma.membership.findFirst` pre-check → ALREADY_MEMBER (409) | ✅ |
| 10 | `ownerExists` check → `resolvedRole = ownerExists ? invite.role : 'OWNER'` | ✅ |
| 11 | `withDbContext` atomic transaction: `membership.create`, `invite.update({ acceptedAt })`, `writeAuditLog` | ✅ |
| 12 | `resolveTenantSessionIdentity({ tenantId, actorId: authenticatedUserId, userRole: membership.role })` | ✅ |
| 13 | `reply.tenantJwtSign(...)` called; token returned to client | ✅ |
| 14 | Response shape: `{ token, user: { id, email }, tenant: { ...fields }, membership: { role } }` | ✅ |
| 15 | Outer catch: P2002 → ALREADY_MEMBER (409); else INTERNAL_ERROR (500) | ✅ |

**All 15 functional criteria: PASS**

### 3.2 Service function — `acceptAuthenticatedInvite` (`services/tenantService.ts` lines 73–78)

- Calls `post<ActivateTenantResponse>('/api/tenant/activate-authenticated', request)` ✅
- Accepts `{ inviteToken: string }` payload ✅
- Returns `ActivateTenantResponse` ✅

### 3.3 App.tsx — `handleAuthSuccess` TENANT path (lines 4360+, `pendingInviteToken` block 4438–4480)

- `pendingInviteToken` handling gated inside `nextRealm === 'TENANT'` check only ✅
- Consumed only after `setTenantRestorePending(false)` (post-bootstrap) ✅
- **Success:** `setPendingInviteToken(null)` → `setToken(inviteResult.token, 'TENANT')` → re-bootstraps with invited tenant ✅
- **ALREADY_MEMBER:** soft success → `setAppState(nextState)`, `setPendingInviteToken(null)` (proceed to existing workspace) ✅
- **EMAIL_MISMATCH / INVALID_INVITE:** `failClosedTenantBootstrap(message)` ✅
- `setPendingInviteToken(null)` called in BOTH success and failure paths (prevents loops) ✅
- Normal sign-in without `pendingInviteToken`: unchanged path, not affected ✅

### 3.4 Backend integration tests (`server/src/__tests__/tenant-activate.integration.test.ts`)

17 tests — all PASS ✅

| Test ID | Description | Result |
|---|---|---|
| ACT-AUTH-001 | No auth header → 401 | ✅ |
| ACT-AUTH-002 | Invalid JWT → 401 | ✅ |
| ACT-AUTH-003 | Invite not found → 404 INVALID_INVITE | ✅ |
| ACT-AUTH-004 | Email mismatch → 403 EMAIL_MISMATCH | ✅ |
| ACT-AUTH-005 | Already member → 409 ALREADY_MEMBER | ✅ |
| ACT-AUTH-006 | Happy path → 200 + token/user/tenant/membership | ✅ |
| ACT-AUTH-007 | Side effects: membership.create, invite.update, writeAuditLog | ✅ |
| B-01, B-02, S-01 (+ 7 more) | Pre-existing security containment tests | ✅ (10 tests) |

`makeTestTenantToken(userId, tenantId, role)` used for JWT generation via `jsonwebtoken.sign` directly (not `app.tenantJwtSign`).

### 3.5 Frontend tests (`tests/frontend/onboarding-activation.test.tsx`)

12 tests — all PASS ✅

- ACT-011: Calls POST to `/api/tenant/activate-authenticated` with `inviteToken` ✅
- ACT-012: Returns response data from API ✅

---

## 4. Validation Evidence

| Gate | Command | Result |
|---|---|---|
| TypeScript | `pnpm exec tsc --noEmit` | EXIT 0 ✅ |
| Backend tests | `pnpm -C server exec vitest run tenant-activate.integration.test.ts` | 17/17 PASS ✅ |
| Frontend tests | `pnpm exec vitest run --config vitest.frontend.config.ts tests/frontend/onboarding-activation` | 12/12 PASS ✅ |
| Lint | `pnpm exec eslint [changed files]` | 1 pre-existing error (App.tsx line 2395 `setInvoiceApprovalTradeId` — not introduced by D3, out-of-scope); no NEW D3 errors ✅ |

---

## 5. Date Anomaly Reconciliation

**Finding:** Commit `637326ba` was timestamped `2026-05-28 20:34:17 +0530`. However, governance files written in that session contained date `2026-07-07` (a future/incorrect date):

| File | Location | Incorrect | Corrected |
|---|---|---|---|
| `artifacts/control-plane/FAM-07D3-...-001.md` | line 7 | `2026-07-07` | `2026-05-28` |
| `governance/control/NEXT-ACTION.md` | header + 8 D3/D2-specific entries | `2026-07-07` | `2026-05-28` |
| `governance/control/OPEN-SET.md` | header + D3 operating note | `2026-07-07` | `2026-05-28` |

**Scope boundary:** FAM-07C reference at `NEXT-ACTION.md` line 114 was left unchanged — that entry was written in a separate session and its date integrity is outside D3 scope. This is consistent with the existing `Date-integrity finding` note already present at the bottom of `NEXT-ACTION.md`.

**Root cause:** Same AI date-integrity pattern noted in the existing `Date-integrity finding` at NEXT-ACTION.md bottom — sessions write future dates. No functional impact; governance truth is unaffected.

---

## 6. Hub-Sync Checklist (Q1–Q14)

**Q1. Did this unit change launch readiness truth?**  
YES. FAM-07D3 implemented and verified the sign-in-first (authenticated existing user) invite acceptance path, which is the primary deferred element of FTR-AUTH-001. Family status advances from NOT_ASSESSED to PARTIALLY_IMPLEMENTED.

**Q2. Which family or requirement changed?**  
FAM-07 (Tenant Onboarding and Invite). FTR-AUTH-001 (Reused-existing-user onboarding path) — sign-in-first sub-path now PARTIALLY RESOLVED.

**Q3. Which hub documents need to be updated?**  
1. `governance/launch-readiness/FUTURE-TODO-REGISTER.md` — FTR-AUTH-001 OPEN → PARTIAL; `→ FAM-07` tag added; description updated  
2. `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` — §5 FAM-07 NOT_ASSESSED → PARTIALLY_IMPLEMENTED; §6 evidence REPO_CONFIRMED → TEST_CONFIRMED, Last Verified By updated; §7 action register updated; §9 MVP cutline updated  
3. `governance/control/NEXT-ACTION.md` — date anomaly corrected + header updated  
4. `governance/control/OPEN-SET.md` — date anomaly corrected + header updated  
5. `artifacts/control-plane/FAM-07D3-TENANT-ONBOARDING-AUTHENTICATED-INVITE-ACCEPTANCE-001.md` — date corrected  
6. `artifacts/control-plane/FAM-07D3-VERIFY-CLOSE-AND-HUB-SYNC-001.md` — this file (new)

**Q4. What evidence supports the update?**  
- Commit `637326ba` (verified via `git show --stat`)  
- 17/17 backend integration tests PASS (ACT-AUTH-001..ACT-AUTH-007)  
- 12/12 frontend tests PASS (ACT-011, ACT-012)  
- `pnpm exec tsc --noEmit` EXIT 0  
- 15/15 functional criteria verified against implementation source

**Q5. Are CRM/CAE details at risk of being duplicated into the main hub?**  
NO. This is a pure tenant auth path change. No CRM/CAE involvement.

**Q6. Are any planned items at risk of incorrect MVP promotion?**  
NO. FTR-AUTH-001 is PARTIAL (not VERIFIED_COMPLETE). New-user Supabase invite handling remainder is OPEN/DESIGN_GATED. FTR-LEGAL-003 (ToS gate) remains NOT_ASSESSED/OPEN. FAM-07 is not promoted to VERIFIED_COMPLETE.

**Q7. Are any stale hub rows now superseded?**  
YES — FTR-AUTH-001 `BOUNDED_DEFERRED_REMAINDER` description and `OPEN` status are now stale for the sign-in-first sub-path. Corrected in this unit.

**Q8. Hub update required?**  
YES — see Q3 above.

**Q9. Were hub files allowlisted?**  
YES — all files listed in Q3 were within the allowlist for this verify-close unit.

**Q10. What FTR items are mapped to FAM-07?**  
- FTR-AUTH-001 (Reused-existing-user path, MVP_CRITICAL/P1) — PARTIAL after D3  
- FTR-AUTH-002 (WL onboarding, POST_MVP/BLOCKED) — out of scope  
- FTR-AUTH-004 (Branded invite email, PILOT_REQUIRED/P2) — out of scope  
- FTR-LEGAL-003 (Supplier ToS gate, MVP_CRITICAL/P1) — OPEN/NOT_ASSESSED; no work done in D3  
- HD-001 (SMTP infra, VERIFIED_BLOCKED) — infrastructure only; no change

**Q11. Are any mapped FTR items MVP_CRITICAL or LAUNCH_BLOCKER?**  
YES — FTR-AUTH-001 (MVP_CRITICAL) and FTR-LEGAL-003 (MVP_CRITICAL) are both LAUNCH_BLOCKER-class items. FTR-AUTH-001 is now PARTIAL (sign-in-first resolved); FTR-LEGAL-003 remains OPEN.

**Q12. What is each mapped FTR item's scope classification for this family?**  
- FTR-AUTH-001: IN_SCOPE — sign-in-first sub-path RESOLVED by D3; new-user sub-path DESIGN_GATED/OPEN remainder  
- FTR-LEGAL-003: IN_SCOPE/UNRESOLVED — no work done in D3; remains NOT_ASSESSED/OPEN  
- FTR-AUTH-002: OUT_OF_SCOPE/POST_MVP/BLOCKED  
- FTR-AUTH-004: OUT_OF_SCOPE/PILOT_REQUIRED  
- HD-001: IN_SCOPE/VERIFIED_BLOCKED/NO_CHANGE

**Q13. Does LFI §7 surface all open MVP_CRITICAL/LAUNCH_BLOCKER gates for this family?**  
YES — after this unit, §7 FAM-07 action register explicitly notes FTR-AUTH-001 PARTIAL (sign-in-first RESOLVED; new-user sub-path DESIGN_GATED remainder) and FTR-LEGAL-003 MVP_CRITICAL/OPEN. All blocking gates remain visible.

**Q14. Does LFI §9 MVP cutline reflect the verified/open split for this family?**  
YES — after this unit, §9 FAM-07 row updated to TEST_CONFIRMED/PARTIALLY_IMPLEMENTED. FAM-07 remains in the above-cutline LAUNCH_BLOCKER section (not promoted). D3 progress noted; remaining open gates explicit.

---

## 7. AR-001 through AR-008 Checklist

**AR-001:** Every FTR item must carry a `→ FAM-xx` tag.  
FINDING: FTR-AUTH-001 did not carry a `→ FAM-07` tag before this unit.  
RESOLVED: `→ FAM-07` tag added to FTR-AUTH-001 description in this commit.

**AR-002:** Every VERIFIED_COMPLETE family must carry an overlay inventory note in LFI §7.  
N/A — FAM-07 is not VERIFIED_COMPLETE.

**AR-003:** Family status must NOT be downgraded solely because open FTR overlay items exist.  
CONFIRMED — FAM-07 status advanced NOT_ASSESSED → PARTIALLY_IMPLEMENTED (uplift, not downgrade).

**AR-004:** MVP_CRITICAL and LAUNCH_BLOCKER FTR items must be visible in LFI §7 or §9.  
CONFIRMED — FTR-AUTH-001 (MVP_CRITICAL) and FTR-LEGAL-003 (MVP_CRITICAL) remain explicitly visible in LFI §7 FAM-07 action register and §9 MVP cutline after this update.

**AR-005:** Any FTR status change must answer the family impact question explicitly.  
CONFIRMED — FTR-AUTH-001 OPEN → PARTIAL. Family impact: FAM-07 advances to PARTIALLY_IMPLEMENTED. Sign-in-first sub-path RESOLVED by commit `637326ba`. Remainder (new-user sub-path) remains DESIGN_GATED/OPEN.

**AR-006:** Verify-close checklist extended to Q14 (replaces former Q9 termination).  
CONFIRMED — Q1–Q14 answered above.

**AR-007:** CRM/CAE XDEP hard boundary applies to LFI rows.  
CONFIRMED — No CRM/CAE content inlined into main hub rows.

**AR-008:** New FTR items and new LFI verify-close rows require bidirectional cross-referencing.  
CONFIRMED — No new FTR items created. Existing FTR-AUTH-001 updated with `→ FAM-07` tag and D3 cross-reference. LFI §6 Last Verified By updated to FAM-07D3-VERIFY-CLOSE-AND-HUB-SYNC-001. Cross-referencing established bidirectionally.

---

## 8. FTR-AUTH-001 Status Summary

| Aspect | Before D3 | After D3 Verify-Close |
|---|---|---|
| Status | OPEN | PARTIAL |
| Readiness | DESIGN_GATED | DESIGN_GATED |
| Sign-in-first sub-path | BOUNDED_DEFERRED_REMAINDER | IMPLEMENTED AND VERIFIED (commit 637326ba) |
| New-user sub-path | BOUNDED_DEFERRED_REMAINDER | DESIGN_GATED/OPEN (unchanged) |
| `→ FAM-07` tag | Missing | Added (AR-001 compliance) |

---

## 9. FAM-07 Launch Readiness Status

| Dimension | Before D3 | After D3 Verify-Close |
|---|---|---|
| LFI §5 Status | NOT_ASSESSED | PARTIALLY_IMPLEMENTED |
| LFI §6 Evidence Level | REPO_CONFIRMED | TEST_CONFIRMED |
| LFI §6 Last Verified By | LAYER0-FAM-07-AUTHORIZATION-RELEASE-001 | FAM-07D3-VERIFY-CLOSE-AND-HUB-SYNC-001 |
| LFI §6 Last Date | 2026-05-28 | 2026-05-28 |
| VERIFIED_COMPLETE | NO | NO (not promoted) |

**FAM-07 is NOT VERIFIED_COMPLETE.** Remaining open gates:
- FTR-AUTH-001 new-user sub-path (DESIGN_GATED/OPEN)
- FTR-LEGAL-003 ToS gate (NOT_ASSESSED/OPEN, MVP_CRITICAL)
- HD-001 SMTP infra (VERIFIED_BLOCKED)
- FAM-07E through FAM-07J units not authorized

---

## 10. Hub Files Modified in This Commit

| File | Change |
|---|---|
| `artifacts/control-plane/FAM-07D3-TENANT-ONBOARDING-AUTHENTICATED-INVITE-ACCEPTANCE-001.md` | Date anomaly corrected: 2026-07-07 → 2026-05-28 |
| `artifacts/control-plane/FAM-07D3-VERIFY-CLOSE-AND-HUB-SYNC-001.md` | This file — new |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | FTR-AUTH-001: Status OPEN → PARTIAL; `→ FAM-07` tag added; description updated |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | FAM-07 §5 NOT_ASSESSED → PARTIALLY_IMPLEMENTED; §6 evidence TEST_CONFIRMED + updated; §7 action register updated; §9 MVP cutline updated |
| `governance/control/NEXT-ACTION.md` | Date anomaly corrected (D3-specific: 2026-07-07 → 2026-05-28); header updated to reference verify-close |
| `governance/control/OPEN-SET.md` | Date anomaly corrected (D3-specific: 2026-07-07 → 2026-05-28); header updated to reference verify-close |

---

## 11. Final Enum

`FAM_07D3_VERIFY_CLOSE_HUB_SYNC_COMPLETE_AUTH_PATH_PARTIAL_FAM07_OPEN`

**Meaning:**
- FAM-07D3 verify-close: **COMPLETE**
- Hub-sync (LFI + FTR): **COMPLETE**
- FTR-AUTH-001 sign-in-first sub-path: **RESOLVED** (status: PARTIAL)
- FAM-07: **NOT VERIFIED_COMPLETE** (open gates remain)
