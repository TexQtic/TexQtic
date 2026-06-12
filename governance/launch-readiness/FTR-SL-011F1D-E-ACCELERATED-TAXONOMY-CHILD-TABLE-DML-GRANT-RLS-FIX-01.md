# FTR-SL-011F1D/E Accelerated Taxonomy Child-Table DML Grant/RLS Fix

Unit: FTR-SL-011F1D-E-ACCELERATED-TAXONOMY-CHILD-TABLE-DML-GRANT-RLS-FIX-01
Date: 2026-06-12
Status: IMPLEMENTATION_COMPLETE_PENDING_DEPLOY_VERIFY
Final enum: FTR_SL_011F1DE_IMPLEMENTATION_FIX_COMMITTED_READY_FOR_DEPLOY_VERIFY

## 1) Final Enum

FTR_SL_011F1DE_IMPLEMENTATION_FIX_COMMITTED_READY_FOR_DEPLOY_VERIFY

## 2) Repo Preflight

Commands run:

- git branch --show-current
- git rev-parse HEAD
- git rev-parse origin/main
- git status --porcelain=v1 -uno
- git log --oneline -12

Observed:

- branch: main
- HEAD: 6f7178b935e6dfb5248980e86f31cb9bab78a885
- origin/main: 6f7178b935e6dfb5248980e86f31cb9bab78a885
- worktree: clean
- includes required carry-forward commit: 6f7178b935e6dfb5248980e86f31cb9bab78a885

Preflight verdict: PASS.

## 3) Files Inspected

Governance:

- governance/launch-readiness/FUTURE-TODO-REGISTER.md
- governance/launch-readiness/FTR-SL-011F1C-SHRADDHA-TAXONOMY-POST-500-RUNTIME-DIAGNOSIS-01.md
- governance/launch-readiness/FTR-SL-011F1-RETRY-SHRADDHA-TAXONOMY-CONTROL-PLANE-AUTH-EXECUTION-02.md
- governance/launch-readiness/FTR-SL-009-SUPPLIER-PROFILE-COMPLETENESS-TOOLING-GAP-IMPLEMENTATION-01.md

Backend/migration truth:

- server/src/routes/control.ts
- server/src/middleware/auth.ts
- server/src/lib/database-context.ts
- server/src/lib/auditLog.ts
- server/src/db/prisma.ts
- server/prisma/schema.prisma
- server/prisma/migrations/20260420010000_org_taxonomy_persistence_carrier/migration.sql
- server/prisma/migrations/** (targeted grant/policy grep)
- server/src/__tests__/control-supplier-publish-reinvite.integration.test.ts
- server/package.json

## 4) Runtime Logs Availability

Runtime log probe attempted once.

Result:

- no data available

Outcome:

- no stack trace available from runtime logs in this unit
- accelerated path continued under Gate B repo-truth confirmation

## 5) Root Cause Evidence

Gate B conditions confirmed from repo truth:

1. Route DML confirmed:
   - server/src/routes/control.ts performs
     - organizationSecondarySegment.deleteMany/createMany
     - organizationRolePosition.deleteMany/createMany
     in POST /api/control/tenants/:id/profile-completeness

2. RLS/FORCE RLS confirmed on target tables:
   - migration 20260420010000 sets ENABLE ROW LEVEL SECURITY and FORCE ROW LEVEL SECURITY on
     - public.organization_secondary_segments
     - public.organization_role_positions

3. Missing DML grant confirmed:
   - same migration grants only SELECT to texqtic_app on those two tables
   - targeted grep across migrations found no later GRANT INSERT/UPDATE/DELETE for those tables

4. Write context confirmed:
   - withOrgAdminWriteContext sets app.org_id, app.actor_id, app.realm=admin, app.is_admin=true

5. Proposed fix bounded to child-table grant alignment only:
   - no route logic change
   - no auth transport change
   - no broad RLS weakening

## 6) Migration/Policy/Grant Changes Made

Created migration:

- server/prisma/migrations/_taxonomy_child_table_dml_grant_rls_alignment/migration.sql

SQL change:

- GRANT INSERT, UPDATE, DELETE ON TABLE public.organization_secondary_segments TO texqtic_app;
- GRANT INSERT, UPDATE, DELETE ON TABLE public.organization_role_positions TO texqtic_app;

No policy text changed.
No RLS disablement.
No FORCE RLS removal.
No public/anon/authenticated broad grants.

## 7) RLS/Tenant-Isolation Safety Explanation

Safety posture preserved:

- Existing RLS and FORCE RLS remain intact.
- Existing restrictive policies remain intact.
- app realm/org admin context remains required for control-plane path.
- Fix grants DML only to texqtic_app on exactly two taxonomy child tables required by the bounded route.
- No cross-org expansion or broad role exposure introduced.

## 8) Tests/Validation Run

Executed:

- git diff --check
- pnpm -C server test -- control-supplier-publish-reinvite.integration.test.ts

Observed:

- git diff --check: PASS (no whitespace/conflict issues)
- focused route test command: PASS

## 9) Safe Public Verification

Executed safe read only:

- GET /api/public/b2b/suppliers

Observed:

- HTTP 200
- Shraddha remains listed
- taxonomy remains unchanged (primary null, secondary empty, rolePositions empty)

No /api/public/supplier/:slug call.
No /supplier/:slug navigation.

## 10) Whether Taxonomy POST Was Called

- No.
- No production POST/PATCH/PUT/DELETE route was called.

## 11) FTR-SL-010 Not-Called Confirmation

- Confirmed not called.

## 12) Profile GET Not-Called Confirmation

- Confirmed /api/public/supplier/shraddha-industries not called.
- Confirmed /supplier/shraddha-industries not opened.

## 13) /products Unchanged Confirmation

- Confirmed unchanged and untouched in this unit.

## 14) Tracker/TLRH Sync Summary

Updated in this unit:

- governance/launch-readiness/FUTURE-TODO-REGISTER.md
- governance/launch-readiness/FTR-SL-011F1D-E-ACCELERATED-TAXONOMY-CHILD-TABLE-DML-GRANT-RLS-FIX-01.md

Created in this unit:

- server/prisma/migrations/_taxonomy_child_table_dml_grant_rls_alignment/migration.sql

Not updated:

- governance/control/NEXT-ACTION.md
- governance/control/OPEN-SET.md

## 15) Adjacent Findings And Disposition

1. Adjacent finding: runtime logs still unavailable for direct stack-trace confirmation.
   - Disposition: converted into deploy-verify execution requirement in next unit.
   - Unit ID: FTR-SL-011F1F-DEPLOY-VERIFY-AND-SHRADDHA-TAXONOMY-EXECUTION-01
   - Priority: P0
   - Owner: Paresh/Copilot execution lane
   - Status: OPEN

2. Adjacent finding: Shraddha taxonomy execution remains pending by design.
   - Disposition: preserved as separate post-deploy execution step.

3. Adjacent finding: FTR-SL-010 remains separate.
   - Disposition: preserve separate path, no action in this unit.

## 16) Risks/Residuals

- This unit applies a minimal grant fix but does not prove runtime success until deployed and re-tested.
- Shraddha taxonomy remains publicly empty until post-deploy execution unit runs.
- FTR-SL-010 remains separate and untouched.
- /supplier/:slug remains excluded from ordinary verification due side effects.
- lt-b2b-001 remains demo/pilot only.

## 17) Recommended Next Unit

FTR-SL-011F1F-DEPLOY-VERIFY-AND-SHRADDHA-TAXONOMY-EXECUTION-01

Scope:

1. Confirm deployment includes this migration fix.
2. Re-check auth-valid control probe.
3. Execute Shraddha taxonomy POST exactly once.
4. Verify GET /api/public/b2b/suppliers.
5. Verify /b2b.
6. Keep FTR-SL-010 separate.
