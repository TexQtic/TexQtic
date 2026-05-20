# FAM-06 — Auth and Session Opening Repo-Truth Audit

**Hub:** `governance/launch-readiness/`  
**Family:** FAM-06 — Auth and Session Management  
**Unit:** `FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT-001`  
**Status:** COMPLETE — REPO_TRUTH_AUDIT_ONLY  
**Date:** 2026-05-20  
**Owner:** Paresh Patel  
**Scope posture:** Safe-Write governance audit mode, repo inspection only, no runtime modifications.

---

## 1. Objective

Execute the mandatory Family Opening Audit Gate for FAM-06 before any family-local implementation work.

This audit verifies current repo-truth for:
- backend auth and session routes
- middleware and realm enforcement
- tenant/org boundary behavior in auth-adjacent surfaces
- frontend auth/session state behavior
- noindex/metadata handling for public stub states
- existing tests and test gaps

---

## 2. Authority

- `TEXQTIC-LAUNCH-FAMILY-INDEX-AUDIT-GATE-ADDENDUM-001` (Family Opening Audit Gate, Rules A-H)
- `TEXQTIC-LAUNCH-READINESS-INCREMENTAL-TRUTH-STRATEGY-001` Section 6 Steps 2-3
- `LAUNCH-FAMILY-INDEX.md` Section 12 (Family Opening Audit Gate)
- `FIRST-FAMILY-CYCLE-SELECTION.md` Section 9 (required immediate next unit)

---

## 3. Execution Mode

This unit is governance-only and inspection-only.

No runtime files were modified.
No Prisma commands were run.
No environment or secret files were read.

---

## 4. Preflight Baseline

Observed pre-existing dirty runtime files (unchanged by this unit):
- `components/Public/PublicSupplierProfile.tsx`
- `tests/frontend/public-referral-landing.test.tsx`

---

## 5. Allowlist Realization

Created:
- `governance/launch-readiness/FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT.md`
- `governance/units/FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT-001.md`

Modified (hub-sync only):
- `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md`
- `governance/launch-readiness/README.md`

No runtime file edits.

---

## 6. Evidence Classification Codes

- `CODE_VERIFIED`: confirmed by direct source inspection in this cycle
- `TEST_VERIFIED`: confirmed by existing tests in repo
- `GOVERNANCE_CLAIM_ONLY`: claim exists but this unit found no direct code/test proof
- `GAP_IDENTIFIED`: concrete gap found requiring follow-up unit

---

## 7. Category A — Backend Auth Route Surface

Finding A1 (`CODE_VERIFIED`): unified auth login route exists.
- Evidence: `server/src/routes/auth.ts` line 83 (`POST /login`)

Finding A2 (`CODE_VERIFIED`): refresh and logout routes exist.
- Evidence: `server/src/routes/auth.ts` lines 1430 (`POST /refresh`), 1867 (`POST /logout`)

Finding A3 (`CODE_VERIFIED`): forgot/reset/verify/resend-email flows exist.
- Evidence: `server/src/routes/auth.ts` lines 1127, 1197, 1284, 1361

Finding A4 (`CODE_VERIFIED`): no explicit signup route in `auth.ts`.
- Evidence: direct route inventory of `server/src/routes/auth.ts` found no `POST /signup`.
- Interpretation: onboarding and invitation handling is implemented in tenant/public/control flows, not a public signup endpoint.

---

## 8. Category B — Session and Refresh Security

Finding B1 (`CODE_VERIFIED`): refresh token cookies are issued per realm.
- Evidence: `server/src/routes/auth.ts` lines 341, 556, 762, 1045

Finding B2 (`CODE_VERIFIED`): refresh token hashes are persisted, not raw tokens.
- Evidence: `server/src/routes/auth.ts` lines 325, 540, 746, 1029

Finding B3 (`CODE_VERIFIED`): replay detection and family revocation are implemented.
- Evidence: `server/src/routes/auth.ts` lines 1422, 1526-1574, 1693-1719

Finding B4 (`CODE_VERIFIED`): cookie clearing on invalid/replayed sessions is implemented.
- Evidence: `server/src/routes/auth.ts` lines 1541, 1685, 2090-2128

---

## 9. Category C — Middleware and Realm Enforcement

Finding C1 (`CODE_VERIFIED`): tenant JWT verification enforces userId+tenantId presence.
- Evidence: `server/src/middleware/auth.ts` lines 30-33

Finding C2 (`CODE_VERIFIED`): resolved host-tenant mismatch is denied.
- Evidence: `server/src/middleware/auth.ts` lines 43-44

Finding C3 (`CODE_VERIFIED`): membership check gates tenant realm access.
- Evidence: `server/src/middleware/auth.ts` lines 48-55

Finding C4 (`CODE_VERIFIED`): admin realm middleware exists separately.
- Evidence: `server/src/middleware/auth.ts` line 71

---

## 10. Category D — Server Registration and Hook Chain

Finding D1 (`CODE_VERIFIED`): tenant resolution hook is globally installed.
- Evidence: `server/src/index.ts` line 128

Finding D2 (`CODE_VERIFIED`): realm-hint guard hook is installed.
- Evidence: `server/src/index.ts` line 131

Finding D3 (`CODE_VERIFIED`): route registration chain includes public/auth/tenant roots.
- Evidence: `server/src/index.ts` lines 147-150

---

## 11. Category E — Tenant Auth-Adjacent Routes and /api/me

Finding E1 (`CODE_VERIFIED`): tenant current-user route exists and is auth-gated.
- Evidence: `server/src/routes/tenant.ts` lines 1329-1332

Finding E2 (`CODE_VERIFIED`): memberships and invite management are tenant-auth protected.
- Evidence: `server/src/routes/tenant.ts` lines 1412-1413, 1473-1474, 1596-1597, 1714-1715

Finding E3 (`CODE_VERIFIED`): invite operations are tenant-bound by `dbContext.orgId`.
- Evidence: `server/src/routes/tenant.ts` lines 1504, 1541, 1636, 1674, 1741, 1766

Finding E4 (`CODE_VERIFIED`): owner invariant protections appear in membership role mutation flow.
- Evidence: `server/src/routes/tenant.ts` lines 1863, 1894, 1911

---

## 12. Category F — Public Entry and By-Email Discovery

Finding F1 (`CODE_VERIFIED`): public by-email tenant discovery route exists.
- Evidence: `server/src/routes/public.ts` lines 563, 583

Finding F2 (`CODE_VERIFIED`): by-email membership lookup uses tx-local role switch.
- Evidence: `server/src/routes/public.ts` line 359 (and repeated use at lines 878, 910)

Finding F3 (`CODE_VERIFIED`): resolution source records include `EMAIL_MEMBERSHIP_DISCOVERY`.
- Evidence: `server/src/routes/public.ts` lines 45, 462, 470, 478

---

## 13. Category G — Frontend Auth and Session State

Finding G1 (`CODE_VERIFIED`): login flow resolves endpoint by realm and clears stale auth before login.
- Evidence: `services/authService.ts` lines 109, 116

Finding G2 (`CODE_VERIFIED`): public entry helpers exist for slug/email discovery.
- Evidence: `services/authService.ts` lines 207, 256-257

Finding G3 (`CODE_VERIFIED`): realm-aware token storage helpers exist in API client.
- Evidence: `services/apiClient.ts` lines 66, 153-154, 166, 183

Finding G4 (`CODE_VERIFIED`): `App.tsx` keeps auth realm synchronized in AUTH state.
- Evidence: `App.tsx` lines 2162, 2367

---

## 14. Category H — Noindex and Metadata Surface

Finding H1 (`CODE_VERIFIED`): stub public surfaces are explicitly fail-closed to `noindex,nofollow`.
- Evidence: `App.tsx` lines 3459, 3478, 3497

Finding H2 (`CODE_VERIFIED`): non-public states clear managed public metadata.
- Evidence: `App.tsx` line 3517

Finding H3 (`GAP_IDENTIFIED`): no explicit backend-level robots guard for authenticated routes was verified in this unit.
- Notes: this is not necessarily a defect because app-level handling exists; retain as follow-up verification gap.

---

## 15. Category I — Tenant Provisioning/Auth Adjacency

Finding I1 (`CODE_VERIFIED`): control-plane tenant provisioning requires super-admin lane.
- Evidence: `server/src/routes/admin/tenantProvision.ts` line 201

Finding I2 (`CODE_VERIFIED`): approved onboarding service token lane exists and is restricted.
- Evidence: `server/src/routes/admin/tenantProvision.ts` lines 134, 225, 248, 265, 374, 419

Interpretation: provisioning and auth/session concerns are split across control-plane and tenant/public auth surfaces, not centralized in `auth.ts` alone.

---

## 16. Category J — Existing Tests (Auth/Invite Related)

Finding J1 (`TEST_VERIFIED`): membership authorization contract tests exist and are detailed.
- Evidence: `tests/membership-authz.test.ts` lines 38, 42, 96, 185, 306, 727+

Finding J2 (`TEST_VERIFIED`): tests include invite issuance/resend/revoke and role transition errors.
- Evidence: `tests/membership-authz.test.ts` lines 128, 217, 354, 646, 687, 980+

Finding J3 (`LOCATION_MISMATCH_CORRECTED`): the original J3 finding incorrectly reported no auth tests because it searched `server/src/routes/`. Auth integration tests exist in `server/src/__tests__/` (9 files: `auth-email-verification-enforcement`, `auth-rate-limit-enforcement`, `auth-refresh-concurrency`, `auth-refresh-performance`, `auth-wave2-readiness`, `gate-e-1-refresh-rotation`, `gate-e-2-cross-realm`, `gate-e-3-rate-limit`, `gate-e-4-audit`). All use `describe.skipIf(!hasDb)` guards; all require live Supabase DB.
- Corrected by: `FAM-06-AUTH-SESSION-BACKEND-INTEGRATION-TEST-COVERAGE-001` (2026-07-21).

Finding J4 (`GAP_IDENTIFIED`): no dedicated frontend test file directly covering `services/authService.ts` was found.
- Evidence: no `*authService*.test*` file found.
- Still open as G-06-002.

Finding J5 (`TEST_VERIFIED`): DB-free pure-logic contract tests added for validation schema rejection contracts, token utility behaviors (`generateRefreshToken`, `hashRefreshToken`, `createRefreshSession`), rate-limit key hashing, IP parsing, cookie realm naming, and no-signup surface assertion.
- Evidence: `tests/auth-route-session.test.ts` — 60 tests, all passing.
- Added by: `FAM-06-AUTH-SESSION-BACKEND-INTEGRATION-TEST-COVERAGE-001` (2026-07-21).

---

## 17. Category K — Family-Opening Gate Result

`PASS` for opening-audit completion.

This unit satisfies Family Opening Audit Gate requirements for FAM-06 as a current-cycle repo-truth inspection.

It does not authorize implementation by itself.

---

## 18. Gap Register

Gap G-06-001 (`CLOSED`): was "missing dedicated backend auth route integration suite for `auth.ts`".
- Root cause: location mismatch — integration tests existed in `server/src/__tests__/`, not `server/src/routes/`.
- Closed by: `FAM-06-AUTH-SESSION-BACKEND-INTEGRATION-TEST-COVERAGE-001` (2026-07-21).
- Evidence: `tests/auth-route-session.test.ts` created — 60 DB-free pure-logic contract tests; J3 finding corrected.

Gap G-06-002 (`P1`): missing dedicated frontend auth service/session suite for `authService.ts` and `apiClient.ts` auth branches.
- Suggested unit: `FAM-06-AUTH-SESSION-FRONTEND-TEST-COVERAGE-001`.

Gap G-06-003 (`P2`): no explicit verification artifact proving authenticated/private route crawl exclusion outside app metadata handling.
- Suggested unit: include in later SEO/auth hardening verification.

---

## 19. Evidence-Level Decision

Family evidence for FAM-06 is upgraded from `NEEDS_REPO_INSPECTION` to `REPO_CONFIRMED`.

Reason:
- current-cycle direct code inspection completed
- explicit route/middleware/session evidence captured
- concrete test/gap inventory produced

Family status remains `NOT_ASSESSED` for implementation readiness until follow-on FAM-06 units close.

---

## 20. Recommended First Implementation Sequence

1. FAM-06 test coverage hardening units for backend and frontend auth/session paths.
2. Targeted fix unit(s) only if test hardening exposes concrete defects.
3. Verification-close unit to promote status beyond `NOT_ASSESSED`.

---

## 21. CRM/CAE Scope Handling

No CRM/CAE runtime inspection was performed.
No CRM/CAE rows were modified.
This unit remains main-repo FAM-06 scoped.

---

## 22. Runtime Safety Statement

No runtime files were changed.
No schema or migration files were changed.
No environment files were changed.

---

## 23. Hub Sync Intent

This audit supports:
- `LAUNCH-FAMILY-INDEX.md` FAM-06 evidence update (`NEEDS_REPO_INSPECTION` -> `REPO_CONFIRMED`)
- FAM-06 action register transition from opening-audit instruction to follow-on implementation/test coverage instruction
- launch-readiness read-order inclusion of this artifact

---

## 24. Limitations

- No command-based test execution performed in this audit unit.
- Findings are repo-truth inspection findings, not runtime behavior proof.

---

## 25. Close Readiness

Audit complete: `YES`.
Family implementation open-ready: `CONDITIONALLY YES`, subject to Layer 0 authorization posture and explicit next-unit selection.

---

## 26. Final Output

This document is the family-local repo-truth note required by the Family Opening Audit Gate for FAM-06.
