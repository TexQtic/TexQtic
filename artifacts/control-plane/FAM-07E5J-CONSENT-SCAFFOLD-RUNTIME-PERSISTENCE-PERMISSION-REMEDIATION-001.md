# FAM-07E5J-CONSENT-SCAFFOLD-RUNTIME-PERSISTENCE-PERMISSION-REMEDIATION-001

## 1) Unit ID And Mode
- Unit: FAM-07E5J-CONSENT-SCAFFOLD-RUNTIME-PERSISTENCE-PERMISSION-REMEDIATION-001
- Mode: TECS Safe-Write repo-truth diagnosis + narrow implementation remediation

## 2) Branch And HEAD
- Branch: main
- HEAD at unit start: `f3029f18`

## 3) Preflight Results
- `git status --short`: clean before edits
- `git diff --name-only`: clean before edits
- `git rev-parse --short HEAD`: `f3029f18`
- Lineage in HEAD confirmed:
  - `1e7abc41` (E5F)
  - `9b1a9030` (E5G)
  - `9ec9c8c7` (E5H)
  - `f3029f18` (E5I)

## 4) Diagnosis Scope
- Activation persistence path:
  - `server/src/routes/tenant.ts`
  - `recordLegalPendingConsentScaffold(...)` writes `legalConsentSnapshot.upsert` and `legalConsentEvent.create`.
- Control-plane observability read path:
  - `server/src/routes/control.ts`
  - `GET /api/control/tenants/:id` reads `tx.legalConsentSnapshot.findMany(...)` and `tx.legalConsentEvent.findMany(...)`.
- Runtime role enforcement path:
  - `server/src/lib/database-context.ts`
  - `withDbContext(...)` executes `SET LOCAL ROLE texqtic_app` for transaction-local operations.

## 5) Root Cause (Repo Truth)
- FAM-07E1 created legal consent tables in:
  - `server/prisma/migrations/20260537000000_fam_07e1_consent_scaffold_contract/migration.sql`
- That migration does not grant table privileges to `texqtic_app` for:
  - `public.legal_consent_snapshots`
  - `public.legal_consent_events`
- Because transactions run under `texqtic_app`, Postgres privilege checks fail before policy/logic evaluation, matching E5I runtime evidence:
  - `permission denied for table legal_consent_snapshots`

## 6) Remediation Strategy (Minimum Scope)
- Add a grant-only SQL migration for existing tables/types.
- No schema redesign.
- No legal-status semantic changes.
- No activation flow logic changes.
- No auth middleware/role-policy behavior changes.

## 7) Implementation
- Added migration:
  - `server/prisma/migrations/20260539000000_fam_07e5j_consent_scaffold_runtime_grants/migration.sql`
- Migration grants:
  - schema usage: `public` to `texqtic_app`
  - enum type usage: legal consent enums to `texqtic_app`
  - table privileges:
    - `public.legal_consent_snapshots`: `SELECT, INSERT, UPDATE`
    - `public.legal_consent_events`: `SELECT, INSERT`
- Added/updated contract assertions:
  - `server/src/__tests__/fam-07e1-consent-scaffold.contract.test.ts`
  - verifies remediation migration exists, grants required privileges, and does not introduce schema/legal-final behavior changes.

## 8) Validation Results
- `pnpm -C server exec tsc --noEmit`
  - PASS
- `pnpm -C server exec vitest run src/__tests__/tenant-provision-approved-onboarding.integration.test.ts -t "approved-onboarding tenant provisioning route"`
  - PASS (`26 passed`, `16 skipped`)
- `pnpm -C server exec vitest run src/__tests__/tenant-activate.integration.test.ts -t "FAM-07E2 — activation consent scaffold"`
  - PASS (`6 passed`, `21 skipped`)
- `pnpm -C server exec vitest run src/__tests__/fam-07e1-consent-scaffold.contract.test.ts`
  - PASS (`11 passed`)

## 9) Scope Safety
- No edits to:
  - `server/src/routes/tenant.ts`
  - `server/src/routes/control.ts`
  - `server/prisma/schema.prisma`
- No changes to legal-final semantics (`LEGAL_PENDING` posture unchanged).
- No changes to activation request/response contracts.
- No secret-bearing outputs recorded.

## 10) Runtime Sequencing Note
- This unit remediates repository/runtime grant drift.
- Live unblock requires deployment with this migration applied in the target environment.
- Post-deploy rerun should verify:
  - handoff endpoint returns success receipt (not internal error)
  - consent snapshot/event observability reads no longer fail with permission denied.

## 11) Status Decisions
- FAM-07 remains: PARTIALLY_IMPLEMENTED / TEST_CONFIRMED
- FTR-LEGAL-003 remains: OPEN / MVP_CRITICAL
- HD-001 remains: RUNTIME_CONFIRMED_CONFIGURED
- Hub impact decision: NO_HUB_UPDATE_REQUIRED

## 12) Final Enum
- FAM_07E5J_RUNTIME_PERSISTENCE_PERMISSION_REMEDIATION_IMPLEMENTED
