# FTR-SL-011F1A Control Plane Auth Session Acceptance Preflight

Unit: FTR-SL-011F1A-CONTROL-PLANE-AUTH-SESSION-ACCEPTANCE-PREFLIGHT-01
Date: 2026-06-12
Status: BLOCKED_UI_API_MISMATCH
Final enum: FTR_SL_011F1A_AUTH_SESSION_ACCEPTANCE_BLOCKED_UI_API_MISMATCH

## 1) Final Enum

FTR_SL_011F1A_AUTH_SESSION_ACCEPTANCE_BLOCKED_UI_API_MISMATCH

## 2) Repo Preflight

Commands run:

- git branch --show-current
- git rev-parse HEAD
- git rev-parse origin/main
- git status --porcelain=v1 -uno
- git log --oneline -7

Observed:

- branch: main
- HEAD: b00342d7a6315a7890fb5facc71c9af4029b2e89
- origin/main: b00342d7a6315a7890fb5facc71c9af4029b2e89
- worktree: clean
- history includes latest blocked retry commit b00342d7a6315a7890fb5facc71c9af4029b2e89

Preflight verdict: PASS.

## 3) Files Inspected

Governance:

- governance/launch-readiness/FUTURE-TODO-REGISTER.md
- governance/launch-readiness/FTR-SL-011F1-RETRY-SHRADDHA-TAXONOMY-CONTROL-PLANE-AUTH-EXECUTION-01.md
- governance/control/NEXT-ACTION.md
- governance/control/OPEN-SET.md

Backend auth/route:

- server/src/routes/control.ts
- server/src/middleware/auth.ts
- server/src/config/index.ts
- server/src/index.ts (actual runtime bootstrap; listed server/src/app.ts not present)

Frontend auth/session (listed src paths absent; resolved by constrained term search):

- App.tsx (actual path; listed src/App.tsx not present)
- services/apiClient.ts (actual path; listed src/lib/api.ts not present)
- services/adminApiClient.ts (actual path; listed src/lib/controlPlaneAuth.ts not present)

Missing listed paths confirmed:

- server/src/plugins/jwt.ts (not present)
- server/src/app.ts (not present)
- src/App.tsx (not present)
- src/lib/auth.ts (not present)
- src/lib/api.ts (not present)
- src/lib/controlPlaneAuth.ts (not present)

## 4) Browser Probe Results

Probe A (active control page):

- href: https://app.texqtic.com/b2b
- origin: https://app.texqtic.com
- title: Active Tenants | TexQtic Control Plane
- hasControlPlaneText: false
- hasActiveTenantsText: true
- hasSignInText: false

Probe C (presence-only session signals):

- cookieNameCount: 0
- localStorageKeys (auth-related):
  - texqtic_auth_realm
  - texqtic_admin_token
  - texqtic_control_plane_identity
- sessionStorageKeys (auth-related): []

## 5) Admin API Probe Results

Probe B (mandatory direct fetch):

- fetch('/api/control/tenants?limit=1', { credentials: 'include' })
- status: 401
- ok: false
- contentType: application/json; charset=utf-8
- bodyPreview: {"success":false,"error":{"code":"UNAUTHORIZED","message":"Invalid or expired admin token"}}

Relative vs absolute checks:

- GET /api/control/tenants?limit=1 (relative): 401
- GET https://app.texqtic.com/api/control/tenants?limit=1 (absolute): 401

Control check with Authorization header present (status-only, no token output):

- hasToken: true
- realm: CONTROL_PLANE
- GET /api/control/tenants?limit=1 with Authorization: Bearer <stored admin token> and X-Texqtic-Realm: control
- status: 200
- ok: true

## 6) Auth/Session Architecture Finding

Backend and frontend are aligned on admin-auth model; mismatch is between probe method and expected auth transport.

Evidence:

- server/src/routes/control.ts:432 applies adminAuthMiddleware globally to /api/control routes.
- server/src/routes/control.ts:437 defines GET /api/control/tenants under that middleware.
- server/src/middleware/auth.ts:71 uses request.adminJwtVerify() (admin JWT verifier).
- server/src/index.ts:107-111 registers admin JWT namespace (adminJwtVerify/adminJwtSign).
- services/apiClient.ts:335 attaches Authorization bearer token from localStorage for protected routes.
- services/apiClient.ts:352 fetch call does not force credentials include and relies on header token for protected routes.
- services/adminApiClient.ts:11-56 enforces CONTROL_PLANE realm and injects X-Texqtic-Realm: control.
- App.tsx:2375 computes canAccessControlPlane from getCurrentAuthRealm() stored realm.

Conclusion: direct browser fetch with credentials include and no Authorization header is not equivalent to app control-plane API calls.

## 7) Root Cause Classification

Primary classification: UI/API mismatch due probe transport mismatch.

- UI control-plane state is driven by localStorage realm/token/identity presence.
- Control API middleware validates admin JWT; without Authorization header, probe fails 401.
- Since header-based probe reaches 200 in the same tab, route/auth contract drift and deployment mismatch are not indicated.

## 8) Whether Re-auth Was Attempted

No explicit re-auth flow was executed in this unit.

Reason: same-tab header-based probe already proved API acceptance (HTTP 200) with existing session artifacts.

## 9) Whether Admin Probe Reached HTTP 200

- Mandatory direct fetch probe: NO (401)
- Header-aligned control probe: YES (200)

## 10) Whether Taxonomy POST Was Called

No. The taxonomy POST endpoint was not called in this unit.

## 11) FTR-SL-010 Not-Called Confirmation

Confirmed not called.

## 12) Profile GET Not-Called Confirmation

Confirmed /api/public/supplier/shraddha-industries was not called.

## 13) /products Unchanged Confirmation

Confirmed unchanged; no source edits were made.

## 14) Tracker/TLRH Sync Summary

Updated:

- governance/launch-readiness/FUTURE-TODO-REGISTER.md
- governance/launch-readiness/FTR-SL-011F1A-CONTROL-PLANE-AUTH-SESSION-ACCEPTANCE-PREFLIGHT-01.md

Not updated:

- governance/control/NEXT-ACTION.md
- governance/control/OPEN-SET.md

## 15) Adjacent Findings And Disposition

1. Adjacent finding: mandatory probe contract (cookie-style direct fetch) does not match deployed control API auth transport (Authorization bearer).
   - Disposition: registered as follow-up unit
   - Unit ID: FTR-SL-011F1B-CONTROL-PROBE-CONTRACT-ALIGNMENT-AND-EXECUTION-GATE-UPDATE-01
   - Priority: P1
   - Owner: Paresh/Copilot execution lane
   - Status: OPEN

2. Adjacent finding: FTR-SL-010 item UUID/state discovery remains separate and untouched.
   - Disposition: keep as separate follow-up unit (no action in this preflight)

## 16) Risks/Residuals

- If the gate continues to require direct fetch without Authorization header, false 401 blocks will persist despite valid control-plane session.
- Shraddha taxonomy update remains pending until retry unit executes with an auth-valid control probe definition.
- /supplier/:slug guardrail and /products B2C-only posture remain unchanged.

## 17) Commit Hash And Push Status

Recorded after commit/push in execution log for this unit.

## 18) Recommended Next Unit

FTR-SL-011F1-RETRY-SHRADDHA-TAXONOMY-CONTROL-PLANE-AUTH-EXECUTION-02

Execution guidance for that next unit:

- Keep taxonomy payload and endpoint unchanged.
- Use auth-valid control readiness probe consistent with repo truth (admin client path or explicit Authorization + X-Texqtic-Realm header status check).
- Perform taxonomy POST exactly once only after auth-valid probe passes.
