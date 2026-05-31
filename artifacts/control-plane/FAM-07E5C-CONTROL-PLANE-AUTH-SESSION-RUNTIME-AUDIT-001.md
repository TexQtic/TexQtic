# FAM-07E5C-CONTROL-PLANE-AUTH-SESSION-RUNTIME-AUDIT-001

## 1) Unit ID And Mode
- Unit: FAM-07E5C-CONTROL-PLANE-AUTH-SESSION-RUNTIME-AUDIT-001
- Mode: TECS Safe-Write runtime audit / blocker diagnosis

## 2) Branch And HEAD
- Branch: main
- HEAD: fd7c6fae

## 3) Preflight Results
- `git status --short`: clean (no output)
- `git rev-parse --short HEAD`: `fd7c6fae`
- HEAD includes required prior commit `fd7c6fae`: confirmed
- E5 retry artifact read: confirmed
- E5B implementation artifact read: confirmed
- Legal-gated posture reconfirmed from governance surfaces:
  - FTR-LEGAL-003 remains OPEN / MVP_CRITICAL
  - FAM-07 remains PARTIALLY_IMPLEMENTED / TEST_CONFIRMED and not VERIFIED_COMPLETE
  - HD-001 remains RUNTIME_CONFIRMED_CONFIGURED

## 4) Prior Blocker Summary (From E5 Retry)
- E5 retry (`FAM-07E5-CONSENT-SCAFFOLD-RUNTIME-VERIFICATION-RETRY-001`) recorded:
  - `POST /api/control/tenants/provision/consent-runtime-path` => `401 UNAUTHORIZED`
  - message: `Invalid or expired admin token`
- Additional probes at that time also returned `401`:
  - `/api/control/tenants`
  - `/api/tenant/activate-authenticated`

## 5) Repo-Truth Auth/Session Path Summary
- Control-plane backend auth is JWT bearer based via admin realm namespace:
  - `server/src/index.ts` registers admin JWT namespace (`adminJwtVerify` / `adminJwtSign`)
- Control-plane routes are admin-auth guarded:
  - `server/src/routes/control.ts` adds `fastify.addHook('onRequest', adminAuthMiddleware)`
  - helper route in `server/src/routes/admin/tenantProvision.ts` uses `adminAuthMiddleware` + `requireAdminRole('SUPER_ADMIN')`
- Frontend control-plane client behavior:
  - `services/adminApiClient.ts` requires CONTROL_PLANE realm and uses `apiClient` to attach Authorization bearer header
  - `services/apiClient.ts` stores admin token in localStorage (`texqtic_admin_token`) and sends bearer on non-auth routes

## 6) Exact Middleware/Guard Path Producing Observed 401
- Message source: `server/src/middleware/auth.ts` in `adminAuthMiddleware` catch block:
  - returns `sendUnauthorized(reply, 'Invalid or expired admin token')`
- This path is reached when `request.adminJwtVerify()` fails (missing/invalid/expired admin bearer token for that request context).

## 7) Route-by-Route Auth Comparison
- `/api/control/tenants`
  - Guard: control plugin `onRequest` => `adminAuthMiddleware`
  - Requires valid admin JWT bearer
- `/api/control/tenants/provision/consent-runtime-path`
  - Guard: preHandler chain executes `adminAuthMiddleware`, then `requireAdminRole('SUPER_ADMIN')`
  - Requires valid admin JWT bearer + SUPER_ADMIN role
- `/api/tenant/activate-authenticated`
  - Guard inside handler calls `request.tenantJwtVerify({ onlyCookie: false })`
  - Requires tenant JWT (not admin JWT)

## 8) Runtime Probes Performed (Sensitive Values Omitted)
- Probe group A (session-state presence)
  - localStorage (presence-only):
    - auth realm: `CONTROL_PLANE`
    - admin token present: true
    - tenant token present: false
  - `/api/me` without explicit bearer header:
    - `401`, `UNAUTHORIZED`, `Invalid or expired token`
    - expected because `/api/me` is tenant route (`tenantAuthMiddleware`)
- Probe group B (control-plane endpoints without and with bearer attachment)
  - `/api/control/whoami`:
    - without bearer: `401` `Invalid or expired admin token`
    - with bearer: `200` success
  - `/api/control/tenants`:
    - without bearer: `401` `Invalid or expired admin token`
    - with bearer: `200` success
- Probe group C (deterministic helper auth behavior)
  - `POST /api/control/tenants/provision/consent-runtime-path` with QA payload and `sendInviteEmail:false`:
    - without bearer: `401` `Invalid or expired admin token`
    - with bearer: `201` success, safe envelope fields present (`runtimePathReady`, orgId, masked slug, invitePurpose, masked recipient, legalStatusExpected)
- Probe group D (tenant activation route auth realm check)
  - `/api/tenant/activate-authenticated`:
    - no auth / admin auth / tenant auth absent in storage => `401` `Invalid or expired token`
    - confirms tenant route does not accept control-plane admin JWT

## 9) Secret-Safety Confirmation
- No raw token values were captured in this artifact.
- No cookie values were captured.
- No auth headers were persisted.
- No JWT payload values were persisted.
- No DB URLs, Supabase credentials, SMTP secrets, service tokens, invite tokens, or invite URLs were captured.

## 10) Diagnosis Classification
- Primary diagnosis:
  - prior blocker was a request-auth attachment mismatch during browser fetch probing, not proven session expiration.
- Evidence basis:
  - same active control-plane token (presence-only confirmed) succeeds on control-plane endpoints when attached as bearer.
  - same endpoints fail with identical 401 when bearer is omitted.
- Additional classification outcomes:
  - SUPER_ADMIN role mismatch: not supported by evidence (helper succeeded with bearer)
  - route-specific guard defect: not supported by evidence
  - deployment/runtime mismatch: not supported by evidence in this audit

## 11) E5 Retry Readiness After Session Refresh
- E5 runtime retry is ready from auth/session perspective using valid control-plane bearer-auth request path.
- Manual re-login was not required in this audit to prove auth viability.
- Practical safe note:
  - for runtime probes executed outside app client wrappers, explicit bearer attachment is required
  - plain same-origin fetch with `credentials: include` alone is insufficient for these admin JWT-guarded routes

## 12) Minimum Corrective Next Unit (If Needed)
- No code-fix unit is required based on this audit.
- Recommended continuation unit:
  - retry consent runtime verification with correct auth attachment path and bounded secret-safe evidence handling

## 13) Validation Commands And Results
- Required baseline command run:
  - `pnpm -C server exec vitest run src/__tests__/tenant-provision-approved-onboarding.integration.test.ts -t "approved-onboarding tenant provisioning route"`
  - Result: PASS (`17 passed`, `16 skipped`)
- No broad suite required for this auth-session diagnosis.

## 14) FAM-07 Status Decision
- Remains: PARTIALLY_IMPLEMENTED / TEST_CONFIRMED
- Not promoted to VERIFIED_COMPLETE

## 15) FTR-LEGAL-003 Status Decision
- Remains: OPEN / MVP_CRITICAL
- No closure action and no legal-final claim

## 16) HD-001 Status Decision
- Remains: RUNTIME_CONFIRMED_CONFIGURED

## 17) Hub Impact Decision
- NO_HUB_UPDATE_REQUIRED
- Reason: this unit is blocker diagnosis/audit only; no launch/family/legal closure truth changed.

## 18) Adjacent Findings (Separate)
- Provision New Tenant form dynamicity/dropdown visibility remains separate and untouched:
  - FAM-07K-CONTROL-PLANE-PROVISION-FORM-DYNAMICITY-AUDIT-001

## 19) Final Enum
- FAM_07E5C_AUTH_SESSION_AUDIT_CONFIRMED_SESSION_REFRESH_READY_FOR_E5_RETRY
