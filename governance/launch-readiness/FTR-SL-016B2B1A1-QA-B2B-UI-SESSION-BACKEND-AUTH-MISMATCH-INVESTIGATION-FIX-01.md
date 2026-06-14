# FTR-SL-016B2B1A1 - QA B2B UI-Session / Backend-Auth Mismatch Investigation + Localized Fix

## 1. Unit Identity

- Unit ID: FTR-SL-016B2B1A1-QA-B2B-UI-SESSION-BACKEND-AUTH-MISMATCH-INVESTIGATION-FIX-01
- Date: 2026-06-14
- Mode: investigation-first, no-source-fix required
- Final enum: FTR_SL_016B2B1A1_INVESTIGATION_ONLY_INSUFFICIENT_SAFE_PROOF

## 2. Repo Preflight

Required commands run:

- `git branch --show-current`
- `git rev-parse HEAD`
- `git status --short`
- `git log --oneline -20`
- `git remote -v`

Observed:

- Branch: `main`
- HEAD: `9c9804af57d555e21713be08792ba1e9443fc35e`
- `origin/main` alignment: yes (same HEAD during this unit)
- Initial tracked worktree: clean

## 3. Files Inspected (Repo Truth)

Frontend auth/session/bootstrap:

- `App.tsx`
- `services/apiClient.ts`
- `services/authService.ts`

Backend auth verification/protected routes:

- `server/src/middleware/auth.ts`
- `server/src/routes/tenant.ts`
- `server/src/utils/response.ts`

## 4. Repo-Truth Findings

1. Protected tenant APIs require `tenantAuthMiddleware` and therefore a valid Bearer token in the `Authorization` header:
   - `GET /api/me` in `server/src/routes/tenant.ts`
   - `GET /api/tenant/profile` in `server/src/routes/tenant.ts`

2. `tenantAuthMiddleware` verifies tenant JWT via `request.tenantJwtVerify({ onlyCookie: false })` and returns `UNAUTHORIZED Invalid or expired token` on verification failure or missing/invalid payload.

3. Frontend API client (`services/apiClient.ts`) only attaches `Authorization: Bearer <token>` for protected non-auth, non-public routes; it intentionally omits auth headers for `/api/auth/*` and `/api/public/*`.

4. `getCurrentUser()` (`services/authService.ts`) calls `/api/me` via API client, so normal app bootstrap requests include Bearer when a tenant token exists.

5. Prior B2B1A mismatch probes were performed with raw browser `fetch` calls without `Authorization` header, which naturally produce `401` for protected tenant APIs even when a valid tenant token exists in localStorage.

## 5. Runtime Reproduction Matrix (Same IDE Browser Session)

Session context:

- Visible shell: `QA B2B | TexQtic B2B Workspace`
- `localStorage['texqtic_auth_realm'] = TENANT`
- `localStorage['texqtic_tenant_token']` present
- Safe token decode: `userId` present, `tenantId=faf2e4a7-5d79-4b00-811b-8d0dce4f4d80`, `role=OWNER`

Endpoint matrix:

- `GET /api/me` **without** Authorization header -> `401 UNAUTHORIZED`
- `GET /api/me` **with** `Authorization: Bearer <tenant_token>` -> `200`
- `GET /api/tenant/profile` **without** Authorization header -> `401 UNAUTHORIZED`
- `GET /api/tenant/profile` **with** `Authorization: Bearer <tenant_token>` -> `200`

Profile contract proof (with Bearer):

- status: `200`
- payload shape: `success -> data -> profile`
- `profile.displayName = QA B2B`
- `profile.canEdit = true`

Reload proof:

- Hard reload kept same QA B2B session context (`TENANT`, token present)
- Post-reload protected calls remained:
  - `/api/tenant/profile` with Bearer -> `200`
  - `/api/me` with Bearer -> `200`
- Corresponding no-header calls still returned `401` by design

## 6. Root Cause Classification

- Confirmed root cause for the B2B1A mismatch claim: **probe-method mismatch**, not a validated product auth defect.
- The reported contradiction (UI shell present while protected API `401`) was reproduced only when protected endpoints were called without Bearer headers.
- In the same live session, once calls match the app's protected-call contract (Bearer attached), protected endpoints return `200` and profile editability is correct.

## 7. Localized Fix Decision

- Source fix applied: **no**.
- Reason: no repo-proven source defect in allowlisted auth/session/client API surfaces for this unit.
- Safety posture: avoided speculative auth changes.

## 8. Validation

Commands run:

- `git diff --check`

Result:

- PASS for this unit's touched governance files.

Note:

- Existing baseline markdown style warnings in `FUTURE-TODO-REGISTER.md` are historical and not introduced by this unit.

## 9. Browser / Runtime Verification Summary

- QA B2B workspace visible: yes
- Same browser session has tenant auth state: yes
- `GET /api/tenant/profile = 200` in same session: yes (with Bearer)
- `GET /api/me` in same session: `200` with Bearer, `401` without Bearer (expected contract behavior)
- Hard reload invalid-auth-shell issue: not reproduced under contract-correct protected calls

## 10. Public Non-Exposure Smoke Checks

- `GET /api/public/b2b/suppliers`: `200`
- `/b2b`: no private rich-profile leakage signals detected
- `/products`: no private rich-profile leakage signals detected
- Forbidden leak classes checked: private contacts/CIN/Udyam/IEC, certificate document storage/signing/bucket signals

## 11. Files Changed

Source files:

- none

Governance files:

- `governance/launch-readiness/FTR-SL-016B2B1A1-QA-B2B-UI-SESSION-BACKEND-AUTH-MISMATCH-INVESTIGATION-FIX-01.md` (new)
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`
- `governance/launch-readiness/FTR-SL-016B2B1A-QA-B2B-AUTH-SESSION-STABILITY-INVESTIGATION-01.md` (supersession note)

## 12. QA-AUTH-001 / FTR-SL-019 Impact Note

- No inseparable forgot-password/login-recovery defect was found in this unit.
- Current finding is request-contract correctness for protected tenant API probes.

## 13. Residuals and Next Step

- B2B1 can resume because the required gate is now proven in the same live session:
  - `GET /api/tenant/profile = 200`
  - `profile.canEdit = true`
- Residual procedural guardrail: future manual runtime probes for protected endpoints must include `Authorization: Bearer <active tenant token>` or use app/client paths that inject it.

## 14. Commit / Push

- Commit hash: pending at authoring time
- Push status: pending at authoring time
