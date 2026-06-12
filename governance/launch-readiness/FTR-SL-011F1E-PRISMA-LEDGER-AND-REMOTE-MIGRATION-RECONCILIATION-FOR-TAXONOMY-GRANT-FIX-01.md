# FTR-SL-011F1E Prisma Ledger and Remote Migration Reconciliation for Taxonomy Grant Fix

Unit: FTR-SL-011F1E-PRISMA-LEDGER-AND-REMOTE-MIGRATION-RECONCILIATION-FOR-TAXONOMY-GRANT-FIX-01
Date: 2026-06-12
Status: RECONCILIATION_COMPLETE_READY_FOR_EXECUTION_RETRY
Final enum: FTR_SL_011F1E_PRISMA_LEDGER_RECONCILED_REMOTE_MIGRATION_APPLIED_READY_FOR_EXECUTION_RETRY

## 1) Final Enum

FTR_SL_011F1E_PRISMA_LEDGER_RECONCILED_REMOTE_MIGRATION_APPLIED_READY_FOR_EXECUTION_RETRY

## 2) Scope And Guardrails

Objective:

- Reconcile Prisma migration ledger and remote-applied state for taxonomy child-table DML grant fix added in FTR-SL-011F1D/E.

In scope:

- migration naming reconciliation (if required)
- Prisma status/validation checks
- governed remote migration apply path (`db:migrate:tracked`)
- tracker and unit artifact sync

Out of scope:

- production taxonomy mutation POST execution
- route/auth logic changes
- schema redesign or policy rewrites
- direct SQL/manual DB edits

## 3) Repo Preflight

Commands run:

- git branch --show-current
- git rev-parse HEAD
- git rev-parse origin/main
- git status --porcelain=v1 -uno
- git status --short

Observed:

- branch: main
- HEAD: 9b3674c939e12711f679a1dba271d74dee17a321
- origin/main: 9b3674c939e12711f679a1dba271d74dee17a321
- starting state for this unit was synced to origin/main
- migration rename working set reflected as expected after reconciliation step

Preflight verdict: PASS.

## 4) Inputs Inspected

- server/prisma/migrations/_taxonomy_child_table_dml_grant_rls_alignment/migration.sql
- server/prisma/schema.prisma
- server/scripts/prisma-env-preflight.ts
- server/scripts/migrate-deploy.ts
- server/package.json

Key config truth confirmed:

- schema datasource uses `url = env("DATABASE_URL")` and `directUrl = env("DIRECT_DATABASE_URL")`
- governed migration path is present: `db:migrate:tracked` -> `prisma:preflight` + `migrate:deploy:prod`

## 5) Prisma Detection And Naming Reconciliation

Initial ledger check command:

- pnpm -C server exec prisma migrate status --schema prisma/schema.prisma

Observed:

- 138 migrations found
- pending migration detected as `_taxonomy_child_table_dml_grant_rls_alignment`

Risk identified:

- underscore-prefixed migration folder was non-canonical against Prisma timestamped migration naming convention used in repo

Reconciliation action executed:

- renamed folder:
  - from: server/prisma/migrations/_taxonomy_child_table_dml_grant_rls_alignment/
  - to: server/prisma/migrations/20260612120000_taxonomy_child_table_dml_grant_rls_alignment/

Post-rename ledger check:

- pending migration now detected as `20260612120000_taxonomy_child_table_dml_grant_rls_alignment`

Reconciliation verdict: PASS.

## 6) Validation

Command run:

- pnpm -C server exec prisma validate --schema prisma/schema.prisma

Observed:

- schema valid
- existing warning (non-blocking): relation `onDelete: SetNull` with required referenced field

Validation verdict: PASS (warning acknowledged; unchanged by this unit).

## 7) Governed Remote Migration Apply Proof

Command run:

- pnpm -C server run db:migrate:tracked

Observed:

1. `prisma:preflight` PASS:
   - var used: DIRECT_DATABASE_URL
   - endpoint classification: SESSION_POOLER
   - not TX pooler

2. `migrate:deploy:prod` PASS:
   - wrapper preflight passed
   - `prisma migrate deploy` executed
   - migration applied:
     - 20260612120000_taxonomy_child_table_dml_grant_rls_alignment
   - output: all migrations successfully applied

Remote apply verdict: PASS.

## 8) Post-Deploy Ledger Proof

Command run:

- pnpm -C server exec prisma migrate status --schema prisma/schema.prisma

Observed:

- 138 migrations found
- `Database schema is up to date!`

Ledger verdict: PASS (no pending migrations).

## 9) Files Changed In This Unit

- governance/launch-readiness/FUTURE-TODO-REGISTER.md
- governance/launch-readiness/FTR-SL-011F1E-PRISMA-LEDGER-AND-REMOTE-MIGRATION-RECONCILIATION-FOR-TAXONOMY-GRANT-FIX-01.md
- server/prisma/migrations/_taxonomy_child_table_dml_grant_rls_alignment/migration.sql (renamed path)
- server/prisma/migrations/20260612120000_taxonomy_child_table_dml_grant_rls_alignment/migration.sql (renamed path)

## 10) Not Called / Not Changed Confirmation

- no production POST/PATCH/PUT/DELETE control-plane route call executed
- no change to server route logic (`server/src/routes/control.ts` unchanged)
- no auth middleware change
- no RLS policy text change
- no FORCE RLS removal
- no schema model change
- no direct SQL/manual DB mutation command

## 11) Risk And Residuals

- taxonomy runtime success still requires the next bounded execution retry unit to perform the actual control-plane taxonomy POST and verify public outcomes
- runtime log unavailability from prior units remains an observability residual, but migration ledger and remote-apply posture are now reconciled

## 12) Recommended Next Unit

FTR-SL-011F1F-DEPLOY-VERIFY-AND-SHRADDHA-TAXONOMY-EXECUTION-01

Expected scope:

1. auth-valid control probe
2. execute bounded taxonomy POST once
3. verify public-safe supplier list response
4. verify /b2b render state
5. preserve FTR-SL-010 separation
