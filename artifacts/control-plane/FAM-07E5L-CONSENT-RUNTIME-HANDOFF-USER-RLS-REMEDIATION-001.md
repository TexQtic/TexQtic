# FAM-07E5L-CONSENT-RUNTIME-HANDOFF-USER-RLS-REMEDIATION-001

## 1) Unit ID And Mode
- Unit: FAM-07E5L-CONSENT-RUNTIME-HANDOFF-USER-RLS-REMEDIATION-001
- Mode: TECS Safe-Write repo-truth diagnosis + narrow implementation remediation

## 2) Branch And HEAD
- Branch: main
- HEAD at unit start: `04fa7277`

## 3) Preflight Results
- `git status --short`: clean (no output)
- `git diff --name-only`: clean (no output)
- `git rev-parse --short HEAD`: `04fa7277`
- Required lineage checks:
  - `04fa7277` in HEAD: confirmed
  - `0e1d38a0` in HEAD: confirmed
  - `1e7abc41` in HEAD: confirmed
- E5F/E5I/E5J/E5K artifacts reviewed before remediation.
- Governance posture reconfirmed:
  - FTR-LEGAL-003: OPEN / MVP_CRITICAL
  - FAM-07: PARTIALLY_IMPLEMENTED / TEST_CONFIRMED
  - HD-001: RUNTIME_CONFIRMED_CONFIGURED

## 4) E5F/E5I/E5J/E5K Lineage Summary
- E5F: safe handoff endpoint implemented (`POST /api/control/tenants/provision/consent-runtime-path/activate-handoff`).
- E5I: route deployed, runtime blocked on consent scaffold table permissions.
- E5J: grant-only consent scaffold remediation added.
- E5K: remediation applied live; handoff still failed with users-table RLS at `prisma.user.create()`.

## 5) E5K Runtime Blocker Summary
- Runtime evidence from E5K:
  - `500 INTERNAL_ERROR` on safe handoff activation
  - Production logs: Postgres `42501`, `new row violates row-level security policy for table "users"`

## 6) Safe Handoff User-Create Path Trace
- Entry route:
  - `server/src/routes/admin/tenantProvision.ts`
  - `POST /tenants/provision/consent-runtime-path/activate-handoff`
- Handoff implementation:
  - `server/src/routes/tenant.ts`
  - `activateConsentRuntimeInviteById(...)`
- Write sequence in transaction:
  - `withDbContext(...)` -> role switched to `texqtic_app`
  - user lookup/create on `public.users`
  - org status update
  - membership create
  - LEGAL_PENDING scaffold snapshot/event write
  - invite acceptance and audit log

## 7) Existing Normal Activation/User-Create Path Comparison
- Existing invite activation path (`/tenant/activate`) in `server/src/routes/tenant.ts` uses the same transaction pattern:
  - user lookup/create on `public.users`
  - org update
  - membership create
- Same core risk existed there: user lookup/create occurred before explicit admin context in DB session.

## 8) users RLS/Grant/Policy Findings
- DB context helper (`server/src/lib/database-context.ts`) always executes `SET LOCAL ROLE texqtic_app`.
- Grants exist for users table (CRUD to `texqtic_app`) in:
  - `server/prisma/migrations/20260214100312_db_hardening_wave_01_gate_d2_grant_permissions/migration.sql`
- RLS surfaces show:
  - deny-all baseline policy on users in `server/prisma/supabase_hardening.sql` (`users_deny_all` FOR ALL USING false)
  - select policy for users in `server/prisma/rls.sql` (`users_tenant_select`)
  - no permissive INSERT policy for `public.users` in current repo policy surfaces

## 9) Root Cause Classification
- Root cause is DB-policy + context-order combination:
  - users INSERT path lacked a permissive users INSERT policy for admin-scoped bootstrap under `texqtic_app`
  - safe handoff and invite activation user-create happened before setting admin context
- Result: `tx.user.create()` violated RLS at runtime.

## 10) Membership-Creation Risk Assessment
- Membership creation remains tenant-scoped and guarded by existing memberships policies (`tenant_id = app.org_id` and/or explicit admin context branches).
- No broad policy changes were applied to memberships.
- Risk after this remediation: low for membership path, since only users INSERT policy was added and it is admin-scoped.

## 11) Implementation Summary
- Added narrow migration:
  - `server/prisma/migrations/20260601000000_fam_07e5l_handoff_user_insert_rls_policy/migration.sql`
  - Adds `users_admin_insert` policy on `public.users` for INSERT to `texqtic_app` with strict checks:
    - `app.is_admin = true`
    - `app.org_id IS NOT NULL`
    - `app.actor_id IS NOT NULL`
- Updated activation context ordering in `server/src/routes/tenant.ts`:
  - In safe handoff path, admin context is set before user lookup/create.
  - In normal `/tenant/activate` path, admin context is set before user lookup/create.
  - Existing reset back to tenant context before membership/scaffold writes is preserved.
- Added focused test coverage:
  - `server/src/__tests__/fam-07e5l-handoff-user-rls.test.ts`

## 12) Exact Files Changed
- `server/src/routes/tenant.ts`
- `server/prisma/migrations/20260601000000_fam_07e5l_handoff_user_insert_rls_policy/migration.sql`
- `server/src/__tests__/fam-07e5l-handoff-user-rls.test.ts`
- `artifacts/control-plane/FAM-07E5L-CONSENT-RUNTIME-HANDOFF-USER-RLS-REMEDIATION-001.md`

## 13) RLS/Tenant-Isolation Safety Proof
- No RLS disable.
- No policy granted to `PUBLIC`, `anon`, or `authenticated`.
- New policy is INSERT-only and role-scoped to `texqtic_app`.
- New policy requires explicit admin flag + org context + actor context.
- No broadened cross-tenant SELECT policy added.
- LEGAL_PENDING scaffold behavior unchanged.

## 14) Secret Non-Leak Confirmation
- No secrets, token values, invite URLs, hashes, DB URLs, or credentials were emitted in code, tests, or artifact content.

## 15) Validation Commands And Results
- `pnpm -C server exec tsc --noEmit`
  - PASS (no output)
- `pnpm -C server exec vitest run src/__tests__/tenant-provision-approved-onboarding.integration.test.ts -t "approved-onboarding tenant provisioning route"`
  - PASS (26 passed, 16 skipped)
- `pnpm -C server exec vitest run src/__tests__/tenant-activate.integration.test.ts -t "FAM-07E2 — activation consent scaffold"`
  - PASS (6 passed, 21 skipped)
- `pnpm -C server exec vitest run src/__tests__/fam-07e5l-handoff-user-rls.test.ts`
  - PASS (4 passed)

## 16) Runtime Smoke Result, If Attempted
- Not attempted in E5L.
- Rationale: this unit is repo-truth diagnosis + narrow implementation remediation; live apply/rerun should be sequenced as next bounded deploy/apply verification unit.

## 17) Remaining Blockers, If Any
- No code-level blocker identified in allowed E5L scope.
- Remaining operational step: deploy/apply migration and rerun bounded live handoff proof.

## 18) E5 Runtime Proof Sequencing Decision
- Defer full live rerun to next unit after migration deployment/apply (same pattern as E5K runtime verification envelope).

## 19) FAM-07 Status Decision
- Remains: PARTIALLY_IMPLEMENTED / TEST_CONFIRMED.
- Not promoted to VERIFIED_COMPLETE in this unit.

## 20) FTR-LEGAL-003 Status Decision
- Remains: OPEN / MVP_CRITICAL.
- No legal-final authority change introduced.

## 21) HD-001 Status Decision
- Remains: RUNTIME_CONFIRMED_CONFIGURED.

## 22) Hub Impact Decision
- No governance hub files edited.
- No family-level closeout claims made.

## 23) Recommended Next Unit
- Deploy/apply `20260601000000_fam_07e5l_handoff_user_insert_rls_policy` through repo-approved migration path, then rerun bounded live helper + safe handoff runtime proof and classify runtime outcome.

## 24) Final Enum
- `FAM_07E5L_HANDOFF_USER_RLS_REMEDIATED_TEST_CONFIRMED`
