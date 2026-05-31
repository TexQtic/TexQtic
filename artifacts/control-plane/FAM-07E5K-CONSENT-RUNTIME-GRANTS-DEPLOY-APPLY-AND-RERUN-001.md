# FAM-07E5K-CONSENT-RUNTIME-GRANTS-DEPLOY-APPLY-AND-RERUN-001

## 1) Unit ID And Mode
- Unit: FAM-07E5K-CONSENT-RUNTIME-GRANTS-DEPLOY-APPLY-AND-RERUN-001
- Mode: TECS Safe-Write deployment/migration apply + runtime verification

## 2) Branch And HEAD
- Branch: main
- HEAD at execution start: `0e1d38a0`

## 3) Preflight Results
- `git status --short`: clean (no output)
- `git diff --name-only`: clean (no output)
- `git rev-parse --short HEAD`: `0e1d38a0`
- Required lineage confirmed in HEAD:
  - `1e7abc41` (E5F)
  - `f3029f18` (E5I)
  - `0e1d38a0` (E5J)
- E5I and E5J artifacts read before deploy/runtime actions: confirmed
- Legal-gated posture reconfirmed from governance surfaces:
  - FTR-LEGAL-003 remains OPEN / MVP_CRITICAL
  - FAM-07 remains PARTIALLY_IMPLEMENTED / TEST_CONFIRMED
  - HD-001 remains RUNTIME_CONFIRMED_CONFIGURED

## 4) E5I/E5J Lineage Summary
- E5I confirmed live handoff route parity but runtime blocked on persistence/permission symptoms.
- E5J introduced grant-only remediation migration for consent scaffold tables/enums:
  - `server/prisma/migrations/20260539000000_fam_07e5j_consent_scaffold_runtime_grants/migration.sql`
- E5K objective in this unit: apply that migration to live target and rerun bounded helper + handoff runtime proof.

## 5) E5J Enum Drift Note And E5K Exact Enum Compliance Note
- E5J governance note acknowledged: prior enum text did not exactly match prior allowlist.
- E5K compliance action: final enum selected exactly from the user-provided E5K allowed enum list (no drift).

## 6) Validation Baseline Results
- `pnpm -C server exec tsc --noEmit`
  - PASS (no output)
- `pnpm -C server exec vitest run src/__tests__/tenant-provision-approved-onboarding.integration.test.ts -t "approved-onboarding tenant provisioning route"`
  - PASS (`26 passed`, `16 skipped`)
- `pnpm -C server exec vitest run src/__tests__/tenant-activate.integration.test.ts -t "FAM-07E2 — activation consent scaffold"`
  - PASS (`6 passed`, `21 skipped`)
- `pnpm -C server exec vitest run src/__tests__/fam-07e1-consent-scaffold.contract.test.ts`
  - PASS (`11 passed`)

## 7) Deployment/Migration Apply Method
- Repo-approved tracked migration path identified from `server/package.json` and migration docs:
  - `pnpm -C server run db:migrate:tracked`
  - This executes:
    - `pnpm run prisma:preflight`
    - `pnpm run migrate:deploy:prod`
- No direct SQL path used in this unit.

## 8) Migration Apply Result
- Command executed:
  - `pnpm -C server run db:migrate:tracked`
- Result:
  - Prisma preflight PASS (SESSION_POOLER endpoint class)
  - `prisma migrate deploy` applied:
    - `20260539000000_fam_07e5j_consent_scaffold_runtime_grants`
  - Final status: All migrations successfully applied
- Secret safety:
  - No DB URL values, credentials, or tokens recorded

## 9) Live Deployment Parity Result For E5J
- Command executed:
  - `vercel inspect app.texqtic.com`
- Result:
  - Production deployment ready
  - Alias includes `https://app.texqtic.com`
  - Deployment ID observed for current production alias and used for subsequent runtime/log checks
- Runtime/log evidence collected against that production deployment during this unit.

## 10) Control Plane Session Health Result
- Live target: `https://app.texqtic.com`
- Active control-plane browser session used with explicit bearer attachment
- `GET /api/control/whoami`:
  - status `200`
  - `success: true`
  - `isSuperAdmin: true`
- Token handling:
  - presence-only check (`texqtic_admin_token: present`)
  - token value not captured

## 11) Deterministic Helper Request/Response Summary
- Endpoint:
  - `POST /api/control/tenants/provision/consent-runtime-path`
- Payload posture:
  - `qaMode: FAM_07E5_CONSENT_RUNTIME_PATH`
  - QA-scoped organization fields
  - unique orchestration reference
  - `sendInviteEmail: false` (safest runtime verification behavior)
- Response:
  - status `201`
  - `runtimePathReady: true`
  - safe identifiers present:
    - `tenant.orgId`
    - `firstOwnerPreparation.inviteId`
  - safe envelope fields present:
    - masked slug
    - invite purpose `FIRST_OWNER_PREPARATION`
    - masked recipient `p***@texqtic.com`
    - activation state `INVITE_PENDING`
    - activation paths
    - expected legal posture `LEGAL_PENDING`
    - invite email delivery `NOT_ATTEMPTED`

## 12) Safe Handoff Request/Response Summary
- Endpoint:
  - `POST /api/control/tenants/provision/consent-runtime-path/activate-handoff`
- Payload used only safe identifiers + bounded LEGAL_PENDING scaffold consent payload:
  - `qaMode`
  - `inviteId`
  - `orgId`
  - `orchestrationReference`
  - consent scaffold payload with:
    - `legalStatus: LEGAL_PENDING`
    - `sourceFlow: ACTIVATE_AUTHENTICATED_INVITE`
- Response:
  - status `500`
  - error code `INTERNAL_ERROR`
  - message `Runtime handoff activation failed.`

## 13) Secret Non-Leak Confirmation
- No raw invite token captured
- No raw invite URL captured
- No token hash captured
- No admin bearer token value captured
- No auth header/cookie/JWT values captured
- No DB URL, Supabase credential, or service key captured
- Runtime evidence retained only safe identifiers and masked fields

## 14) LEGAL_PENDING Posture Confirmation
- Helper response confirms expected posture:
  - `activation.legalStatusExpected: LEGAL_PENDING`
- No evidence of `LEGAL_APPROVED` or legal-final state creation in this unit.

## 15) Consent Snapshot Runtime Evidence
- Safe handoff did not complete (`500`), so handoff receipt did not prove snapshot creation.
- Bounded control-plane tenant-detail read for target org returned `200` after migration apply and showed:
  - `consent_scaffold_observability.has_records: false`
  - no snapshot/event records for this failed handoff attempt
- Interpretation: prior table-permission read blocker is no longer observed on tenant-detail route in this rerun; snapshot persistence for the attempted handoff remains unconfirmed because handoff failed before completion.

## 16) Consent Event Runtime Evidence
- Safe handoff did not complete (`500`), so handoff receipt did not prove event creation.
- Tenant detail observability for target org indicated no consent scaffold records after failed handoff.

## 17) Tenant-Detail Observability Result
- Endpoint probed:
  - `GET /api/control/tenants/:id` (using target orgId from helper)
- Result in E5K rerun:
  - status `200`
  - `success: true`
  - `consent_scaffold_observability` object returned
- Contrast to E5I:
  - E5I previously showed tenant-detail `500` with `permission denied for table legal_consent_snapshots`
  - E5K rerun no longer reproduces that permission-denied read failure

## 18) Remaining Blockers
- Live handoff remains blocked at runtime with `500 INTERNAL_ERROR`.
- Production structured logs for the failing handoff request show:
  - `prisma.user.create()` failure
  - Postgres `42501`: `new row violates row-level security policy for table "users"`
- Current blocker classification:
  - handoff runtime blocked by user-create RLS path, not by consent-table grant absence

## 19) Tenant-Detail 500 Sequencing Decision
- Decision: tenant-detail `500` is not the active blocker in this rerun.
- Sequencing implication:
  - do not open a tenant-detail observability fix unit from E5K evidence
  - prioritize handoff runtime RLS blocker unit first

## 20) E5 Runtime Proof Sequencing Decision
- Decision: E5 runtime proof cannot be marked confirmed in E5K because safe handoff still fails with `500` before consent snapshot/event receipt.
- Next verification sequencing:
  - remediate handoff user-create RLS path
  - redeploy/apply
  - rerun same bounded helper + handoff proof

## 21) FAM-07 Status Decision
- Remains: PARTIALLY_IMPLEMENTED / TEST_CONFIRMED
- Not promoted to VERIFIED_COMPLETE in this unit

## 22) FTR-LEGAL-003 Status Decision
- Remains: OPEN / MVP_CRITICAL
- No legal-final closure claim

## 23) HD-001 Status Decision
- Remains: RUNTIME_CONFIRMED_CONFIGURED

## 24) Hub Impact Decision
- NO_HUB_UPDATE_REQUIRED

## 25) Recommended Next Unit
- Recommended next bounded corrective unit:
  - FAM-07E5L-CONSENT-RUNTIME-HANDOFF-USER-RLS-REMEDIATION-001
- Scope intent:
  - diagnose/remediate `users` RLS failure in safe handoff activation path
  - preserve LEGAL_PENDING posture and existing consent scaffold contracts
  - rerun bounded helper + handoff proof after remediation

## 26) Final Enum
- FAM_07E5K_CONSENT_RUNTIME_GRANTS_APPLIED_RUNTIME_PROOF_BLOCKED_HANDOFF
