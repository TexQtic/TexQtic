# FTR-SL-011F1C Shraddha Taxonomy POST 500 Runtime Diagnosis

Unit: FTR-SL-011F1C-SHRADDHA-TAXONOMY-POST-500-RUNTIME-DIAGNOSIS-01
Date: 2026-06-12
Status: DIAGNOSIS_COMPLETE_LOG_EVIDENCE_PENDING
Final enum: FTR_SL_011F1C_RUNTIME_ROOT_CAUSE_UNCONFIRMED_LOGS_REQUIRED

## 1) Final Enum

FTR_SL_011F1C_RUNTIME_ROOT_CAUSE_UNCONFIRMED_LOGS_REQUIRED

## 2) Repo Preflight

Commands run:

- git branch --show-current
- git rev-parse HEAD
- git rev-parse origin/main
- git status --porcelain=v1 -uno
- git log --oneline -10

Observed:

- branch: main
- HEAD: 5286fadca5aa8f1286925398d1fd2d5cae8d7029
- origin/main: 5286fadca5aa8f1286925398d1fd2d5cae8d7029
- worktree: clean
- includes required retry-02 commit: 5286fadca5aa8f1286925398d1fd2d5cae8d7029

Preflight verdict: PASS.

## 3) Files Inspected

Governance/tracker:

- governance/launch-readiness/FUTURE-TODO-REGISTER.md
- governance/launch-readiness/FTR-SL-011F1-RETRY-SHRADDHA-TAXONOMY-CONTROL-PLANE-AUTH-EXECUTION-02.md
- governance/launch-readiness/FTR-SL-011F1A-CONTROL-PLANE-AUTH-SESSION-ACCEPTANCE-PREFLIGHT-01.md
- governance/launch-readiness/FTR-SL-009-SUPPLIER-PROFILE-COMPLETENESS-TOOLING-GAP-IMPLEMENTATION-01.md

Runtime path/auth/context/schema:

- server/src/routes/control.ts
- server/src/middleware/auth.ts
- server/src/lib/database-context.ts
- server/src/lib/auditLog.ts
- server/src/db/prisma.ts
- server/prisma/schema.prisma
- server/prisma/migrations/20260420010000_org_taxonomy_persistence_carrier/migration.sql
- server/src/__tests__/control-supplier-publish-reinvite.integration.test.ts

## 4) Safe Public Verification

Executed only safe read:

- GET /api/public/b2b/suppliers

Result:

- HTTP 200
- success=true
- total=2
- shraddha-industries listed=true
- Shraddha taxonomy remains unchanged:
  - primarySegment: null
  - secondarySegments: []
  - rolePositions: []
- Shraddha offeringPreview count remains 0

No /api/public/supplier/:slug call was made.

## 5) Runtime Logs Inspected Or Not Inspected

Runtime logs availability:

- Attempted runtime log retrieval via available runtime logging tool.
- Result: no data available.

Consequence:

- No direct production stack trace/error code available in this unit.
- Root cause cannot be asserted as fully proven from runtime logs.

## 6) Route Implementation Summary

Implemented at:

- server/src/routes/control.ts
- Route: POST /api/control/tenants/:id/profile-completeness

Behavior summary:

- Protected by adminAuthMiddleware and requireAdminRole('SUPER_ADMIN').
- Validates tenant UUID param and request body via Zod.
- Executes write flow inside withOrgAdminWriteContext(id, adminId, callback).
- Reads current tenant + organization.
- Guards: not found, QA sentinel, not B2B.
- Writes taxonomy fields:
  1) organizations.primary_segment_key update
  2) organization_secondary_segments deleteMany + optional createMany
  3) organization_role_positions deleteMany + createMany
- Attempts admin audit write via writeAuditLog(createAdminAudit(...)).
- Catches all errors and returns:
  - code: INTERNAL_ERROR
  - message: Failed to update supplier profile completeness
  - status: 500

## 7) Validation/Schema Summary

Validation in route:

- id: UUID required.
- primary_segment_key: lowercase slug regex, max 100, required.
- secondary_segment_keys: array of slug regex values, default [].
- role_position_keys: array of enum from ORGANIZATION_ROLE_POSITION_KEYS, min 1.
- role_position enum allows: manufacturer, trader, service_provider.
- Dedup checks:
  - secondary_segment_keys unique
  - role_position_keys unique
  - primary_segment_key cannot appear in secondary_segment_keys

Payload that failed previously remains schema-valid in repo truth:

- primary_segment_key: weaving
- secondary_segment_keys: [fabric_processing]
- role_position_keys: [manufacturer]

## 8) DB/Write-Path Summary

Tables/models touched by route:

- organizations.primary_segment_key (nullable varchar)
- organization_secondary_segments (org_id, segment_key)
- organization_role_positions (org_id, role_position_key)

Write mechanics:

- organizations.update
- organizationSecondarySegment.deleteMany
- organizationSecondarySegment.createMany
- organizationRolePosition.deleteMany
- organizationRolePosition.createMany

Important migration evidence:

- migration 20260420010000 creates organization_secondary_segments and organization_role_positions with RLS enabled and FORCE RLS.
- same migration grants only SELECT on those two tables to texqtic_app.
- no INSERT/UPDATE/DELETE grant for texqtic_app found in inspected migrations.

## 9) Audit/Write-Context Summary

Write context details:

- withOrgAdminWriteContext in control.ts uses prisma.$transaction directly.
- It sets app.org_id, app.actor_id, app.realm=admin, app.request_id, app.bypass_rls=off, app.is_admin=true.
- It intentionally does not call withDbContext (which performs SET LOCAL ROLE texqtic_app).

Audit behavior details:

- Audit write is called after taxonomy writes.
- writeAuditLog catches errors internally and does not throw.
- Therefore audit failure is unlikely to be the direct source of route 500.

## 10) Root Cause Classification

Classification:

- ROOT_CAUSE_NARROWED_NOT_PROVEN_WITH_LOGS
- Most likely class: taxonomy child-table write authorization/policy mismatch in runtime role context.

Why this class is most supported by repo truth:

- 500 occurs inside route try/catch and message is generic.
- taxonomy route performs delete/create DML on child tables with strict RLS.
- migration evidence shows only SELECT grant to texqtic_app for those child tables.
- no later migration found granting required DML privileges on those tables.

## 11) Exact Failing Branch Or Best-Supported Hypothesis

Best-supported hypothesis (not log-proven):

- Failure occurs in one of these write statements inside withOrgAdminWriteContext callback:
  - tx.organizationSecondarySegment.deleteMany(...)
  - tx.organizationSecondarySegment.createMany(...)
  - tx.organizationRolePosition.deleteMany(...)
  - tx.organizationRolePosition.createMany(...)

Most probable immediate error class:

- permission/RLS denial at child-table DML boundary under production runtime role path.

What is ruled less likely from code truth:

- Validation mismatch: unlikely (request passes schema before writes).
- Role key mismatch: unlikely (manufacturer is allowed enum).
- Audit failure as primary cause: unlikely (writeAuditLog swallows errors).

## 12) Whether Taxonomy POST Was Retried

- No.
- No POST/PATCH/PUT/DELETE was executed in this unit.

## 13) FTR-SL-010 Not-Called Confirmation

- Confirmed not called.

## 14) Profile GET Not-Called Confirmation

- Confirmed /api/public/supplier/shraddha-industries not called.
- Confirmed /supplier/shraddha-industries not opened.

## 15) /products Unchanged Confirmation

- Confirmed unchanged and untouched in this unit.

## 16) Tracker/TLRH Sync Summary

Updated in this unit:

- governance/launch-readiness/FTR-SL-011F1C-SHRADDHA-TAXONOMY-POST-500-RUNTIME-DIAGNOSIS-01.md
- governance/launch-readiness/FUTURE-TODO-REGISTER.md

Not updated:

- governance/control/NEXT-ACTION.md
- governance/control/OPEN-SET.md

## 17) Adjacent Findings And Disposition

1. Adjacent finding: runtime root cause is strongly narrowed but not stack-trace-proven.
   - Disposition: register logs-focused follow-up unit.
   - Unit ID: FTR-SL-011F1D-SHRADDHA-TAXONOMY-POST-500-ERROR-CODE-CAPTURE-01
   - Priority: P0
   - Owner: Paresh/Copilot execution lane
   - Status: OPEN

2. Adjacent finding: probable missing DML grant/policy alignment for taxonomy child tables under runtime role path.
   - Disposition: register implementation follow-up unit (not executed here).
   - Unit ID: FTR-SL-011F1E-TAXONOMY-CHILD-TABLE-DML-GRANT-AND-RLS-ALIGNMENT-01
   - Priority: P0
   - Owner: Paresh/Copilot execution lane
   - Status: OPEN

3. Adjacent finding: FTR-SL-010 remains separate and untouched.
   - Disposition: preserve separate path with no action in this unit.

## 18) Risks/Residuals

- Shraddha taxonomy remains empty publicly.
- Re-running taxonomy POST before confirming error class may produce repeated 500 with no forward progress.
- Because route catch masks raw error, diagnosis confidence remains bounded without log evidence.
- FTR-SL-010 remains separate and must stay isolated from this diagnosis path.

## 19) Recommended Next Unit

Primary next unit:

- FTR-SL-011F1D-SHRADDHA-TAXONOMY-POST-500-ERROR-CODE-CAPTURE-01

Scope:

- Capture one safe, redacted runtime stack/error code for the existing 500 path from production logs.
- No production mutation calls.
- Confirm exact failing Prisma/SQL operation and error class.

Then:

- If permission/RLS confirmed, run implementation unit:
  - FTR-SL-011F1E-TAXONOMY-CHILD-TABLE-DML-GRANT-AND-RLS-ALIGNMENT-01

## 20) Diagnosis Questions Coverage Matrix

1. Implementation location: server/src/routes/control.ts.
2. Validation fields: id + primary_segment_key + secondary_segment_keys + role_position_keys (+ uniqueness/collision checks).
3. DB writes: organizations, organization_secondary_segments, organization_role_positions.
4. Update target: organization row + related taxonomy child tables, not tenant profile table.
5. Existing related row required: no; route deletes and recreates child rows.
6-15. Likely cause class: write authorization/policy mismatch on child table DML under runtime role context (best-supported); audit failure less likely; enum mismatch unlikely; JSON shape mismatch unlikely.
16. Catch hides error: yes, generic INTERNAL_ERROR path.
17. Implementation fix needed before retry: likely yes.
18. Data repair vs idempotency: no one-off data repair indicated; route is functionally idempotent by delete+recreate semantics; likely infra/policy/permission alignment needed.
19. Minimum safe next unit: logs-only error-code capture unit FTR-SL-011F1D.
