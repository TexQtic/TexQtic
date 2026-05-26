# FTR-FAM-001 — Auth Session Opening Repo-Truth Audit

## 1. Status Header

- Unit ID: FTR-FAM-001-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT
- Status: COMPLETE (AUDIT_ONLY)
- Scope Lock: NO_IMPLEMENTATION, NO_RUNTIME_BEHAVIOR_CHANGE, NO_SCHEMA_CHANGE, NO_DB_CHANGE
- Date: 2026-05-26
- Branch at execution: main

## 2. Objective

Execute the opening family repo-truth audit for Main App auth/session boundaries and produce evidence-backed findings before any implementation work.

## 3. Constraints and Mode

- Inspection-only governance mode.
- No runtime code changes.
- No database commands or schema operations.
- No env/secrets inspection.

## 4. Audit Surface Coverage

Covered surfaces:

- Frontend auth/session orchestration: `App.tsx`, `services/apiClient.ts`, `services/authService.ts`, `services/tenantApiClient.ts`, `services/adminApiClient.ts`, `runtime/sessionRuntimeDescriptor.ts`, `components/Auth/AuthFlows.tsx`
- Backend auth/session/realm boundaries: `server/src/middleware/auth.ts`, `server/src/middleware/realmGuard.ts`, `server/src/index.ts`, `server/src/routes/tenant.ts`, `server/src/routes/public.ts`, `api/index.ts`, `middleware.ts`
- Test coverage inventory: `tests/auth-route-session.test.ts`, `tests/frontend/auth-service-session.test.ts`, `server/src/__tests__/gate-e-2-cross-realm.integration.test.ts`, and related auth integration suites

## 5. Evidence Classification Taxonomy

- CODE_VERIFIED: directly confirmed in source
- TEST_VERIFIED: directly confirmed in existing tests
- GAP_IDENTIFIED: concrete verification gap or residual risk requiring follow-up
- GOVERNANCE_CLAIM_ONLY: claim present in docs but not independently re-validated in this cycle

## 6. Repo-Truth Findings

### F1. Frontend session authority is realm-scoped and fail-closed (`CODE_VERIFIED`)
- `services/apiClient.ts` stores tenant/admin tokens separately, persists realm, and clears all auth state atomically.
- `services/tenantApiClient.ts` and `services/adminApiClient.ts` enforce client-side realm checks before request dispatch and attach explicit realm headers.
- `App.tsx` bootstraps app state from session/public-entry context and routes to AUTH/EXPERIENCE/CONTROL_PLANE with explicit fallbacks.

### F2. Backend realm boundary is enforced pre-auth and in auth middleware (`CODE_VERIFIED`)
- `server/src/middleware/realmGuard.ts` maps endpoint prefixes to expected realms and returns 403 WRONG_REALM for mismatches.
- `server/src/middleware/auth.ts` validates JWT payload shape, verifies membership/admin records, and rejects cross-tenant or invalid identities.
- `server/src/index.ts` installs tenant resolution and realm-hint guard on `onRequest` prior to protected route execution.

### F3. Route registration parity exists between server and Vercel handler (`CODE_VERIFIED`)
- `server/src/index.ts` and `api/index.ts` register public/auth/control/tenant routes with matching realm-guard and tenant-resolution hooks.
- `api/index.ts` includes impersonation and tenant-provision control-plane routes, reducing runtime parity drift.

### F4. Tenant `/api/me` and membership surfaces are auth-gated and tenant-scoped (`CODE_VERIFIED`)
- `server/src/routes/tenant.ts` gates `/me` with tenant auth middleware and validates tenant context.
- Membership/invite flows are scoped with org context and explicit tenant-bound queries.

### F5. Public by-email discovery path exists with controlled role-context handling (`CODE_VERIFIED`)
- `server/src/routes/public.ts` exposes by-email discovery and emits `EMAIL_MEMBERSHIP_DISCOVERY` disposition pathways.
- Tx-local role switching (`SET LOCAL ROLE texqtic_public_lookup`) is used for constrained lookup behavior.

### F6. Runtime shell selection is descriptor-driven, not token-guess driven (`CODE_VERIFIED`)
- `runtime/sessionRuntimeDescriptor.ts` derives operating mode, manifest key, overlays, and app-state from normalized tenant/control descriptors.
- WL admin overlay is role-gated via explicit allowlist roles.

### F7. Auth/session tests are substantial and split across DB-free and integration layers (`TEST_VERIFIED`)
- `tests/auth-route-session.test.ts` covers refresh token/session contracts and auth route validation mirrors.
- `tests/frontend/auth-service-session.test.ts` covers apiClient/authService contracts including realm login pathing and header behavior.
- `server/src/__tests__/gate-e-2-cross-realm.integration.test.ts` covers tenant/admin cross-realm rejection and positive-path acceptance.

## 7. Boundary Compliance Table

| Boundary | Classification | Evidence | Result |
|---|---|---|---|
| Tenant vs Control realm entrypoints | CODE_VERIFIED | `server/src/middleware/realmGuard.ts`, `server/src/middleware/auth.ts` | PASS |
| Frontend realm-isolated token access | CODE_VERIFIED | `services/apiClient.ts`, `services/tenantApiClient.ts`, `services/adminApiClient.ts` | PASS |
| App bootstrap auth/public control flow | CODE_VERIFIED | `App.tsx`, `runtime/sessionRuntimeDescriptor.ts` | PASS |
| Serverless vs server route registration parity | CODE_VERIFIED | `api/index.ts`, `server/src/index.ts` | PASS |
| Cross-realm rejection tests | TEST_VERIFIED | `server/src/__tests__/gate-e-2-cross-realm.integration.test.ts` | PASS |

## 8. Gap and Risk Register

- G1 (`GAP_IDENTIFIED`): No fresh runtime execution evidence was produced in this unit (inspection-only), so findings are static repo-truth, not live behavior proof.
- G2 (`GAP_IDENTIFIED`): TODO/stub signal is broad in the monorepo; auth-adjacent areas appear covered, but unrelated feature stubs increase noise risk in future audits unless scope filters stay strict.
- G3 (`GAP_IDENTIFIED`): SEO/indexability enforcement for authenticated/private views is primarily app-layer behavior and prior-unit claims; a dedicated current-cycle re-verification unit would reduce residual ambiguity.

## 9. Test Coverage Matrix (Auth/Session Opening Scope)

| Area | Key test file(s) | Coverage type | Status |
|---|---|---|---|
| Frontend auth/session client contracts | `tests/frontend/auth-service-session.test.ts` | DB-free unit | VERIFIED |
| Backend auth route/session contracts | `tests/auth-route-session.test.ts` | DB-free unit | VERIFIED |
| Cross-realm enforcement behavior | `server/src/__tests__/gate-e-2-cross-realm.integration.test.ts` | DB-backed integration (skipIf guard) | PRESENT |
| Refresh/rate-limit/email-verification auth integrations | `server/src/__tests__/auth-wave2-readiness.integration.test.ts` and related auth integration files | DB-backed integration | PRESENT |

## 10. Recommendation and Next Unit

- Opening audit gate recommendation: PASS_FOR_NEXT_UNIT
- Recommended next unit: execution-backed verification-close for auth/session boundaries (targeting realm mismatch behavior, `/api/me` auth contract, and app bootstrap transitions) to convert repo-truth into runtime-proof for this cycle.

## 11. Non-Goals Confirmed

- No implementation performed.
- No runtime behavior change introduced.
- No schema changes performed.
- No database changes performed.
- No secret or environment mutation performed.
