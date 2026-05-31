# FAM-07E5N-HANDOFF-ORGANIZATIONS-PERMISSION-REMEDIATION-AND-RERUN-001

## 1) Unit ID and Mode
- Unit: FAM-07E5N-HANDOFF-ORGANIZATIONS-PERMISSION-REMEDIATION-AND-RERUN-001
- Mode: TECS Safe-Write repo-truth diagnosis + narrow remediation + bounded runtime rerun
- Execution date: 2026-05-31

## 2) Branch and HEAD
- Branch: main
- HEAD at execution start: bf282f21

## 3) Preflight Results
- git status --short: clean (no output)
- git diff --name-only: clean (no output)
- git rev-parse --short HEAD: bf282f21
- Required ancestry present in HEAD:
  - 1e7abc41: confirmed
  - 04fa7277: confirmed
  - 0484754a: confirmed
  - 6e706fd6: confirmed
- Clean working tree at preflight: confirmed

## 4) E5K/E5L/E5M Lineage Summary
- E5K: consent runtime grants apply/rerun; handoff still failed.
- E5L: users INSERT RLS remediation + admin-context ordering hardening.
- E5M: E5L applied live; users blocker cleared; handoff still failed with organizations permission 42501.

## 5) E5M Blocker Summary
- Prior live blocker (from E5M evidence):
  - prisma.organizations.update failure
  - Postgres 42501 permission denied for table organizations

## 6) Required Status Reconfirmation
- FAM-07 remains PARTIALLY_IMPLEMENTED / TEST_CONFIRMED: reconfirmed from control-plane artifacts and E5M artifact.
- FTR-LEGAL-003 remains OPEN / MVP_CRITICAL: reconfirmed.
- HD-001 remains RUNTIME_CONFIRMED_CONFIGURED: reconfirmed.

## 7) Organization-Update Path Trace
- Safe handoff transaction path:
  - Route: POST /api/control/tenants/provision/consent-runtime-path/activate-handoff
  - Handler file: server/src/routes/admin/tenantProvision.ts
  - Runtime function: activateConsentRuntimeInviteById in server/src/routes/tenant.ts
- Exact update call:
  - await tx.organizations.update({ where: { id: invite.tenantId }, data: { status: 'PENDING_VERIFICATION' } })
- Active DB role/context at update:
  - withDbContext executes SET LOCAL ROLE texqtic_app
  - app.realm set to admin and app.is_admin set to true before organizations.update

## 8) Existing Successful Organizations-Update Path Comparison
- Standard invite activation path (/api/tenant/activate) in server/src/routes/tenant.ts also performs tx.organizations.update with admin context set before update.
- Safe handoff and standard activation paths now match on context ordering before organizations.update.

## 9) Organizations Grants/RLS/Policy Findings
- G-015 baseline migration (20260224000000_g015_phase_a_introduce_organizations):
  - Granted SELECT on public.organizations to texqtic_app
  - Did not grant UPDATE to texqtic_app
  - RLS UPDATE policy already required admin realm
- E5N remediation migration present in repo:
  - server/prisma/migrations/20260602000000_fam_07e5n_handoff_organizations_update_grant/migration.sql
  - Grants UPDATE on public.organizations to texqtic_app only
  - No RLS policy drops/weakening
  - No DELETE/TRUNCATE grants
  - No BYPASSRLS grant

## 10) Root Cause Classification
- Organizations permission root cause class: missing UPDATE grant for runtime role texqtic_app in baseline G-015 grant set.
- Additional runtime check outcome in this unit:
  - organizations permission blocker is now cleared in live logs.
- Current active blocker class after rerun:
  - consent persistence path failure (transaction lifetime), not organizations permission.

## 11) Membership/Consent Next-Blocker Risk Assessment
- Membership creation is likely no longer first blocker on this rerun path.
- Next blocker observed in live logs is consent persistence step:
  - prisma.legalConsentEvent.create failed with transaction-not-found error.
- This indicates likely transaction timeout/lifecycle behavior in handoff path, and should be handled in next bounded unit.

## 12) Implementation Summary (This Unit)
- No new source/migration remediation added in this unit.
- Repo-truth diagnosis confirmed organizations remediation already exists in repo and that live blocker shifted.

## 13) Exact Files Changed
- artifacts/control-plane/FAM-07E5N-HANDOFF-ORGANIZATIONS-PERMISSION-REMEDIATION-AND-RERUN-001.md

## 14) RLS/Tenant-Isolation Safety Proof
- No RLS disable actions performed.
- No blanket public grants performed.
- No organizations policy broadening performed.
- No activation route contract broadening performed.
- LEGAL_PENDING-only posture preserved in runtime payload.

## 15) Validation Commands and Results
- pnpm -C server exec tsc --noEmit: PASS
- pnpm -C server exec vitest run src/__tests__/tenant-provision-approved-onboarding.integration.test.ts -t "approved-onboarding tenant provisioning route": PASS (26 passed, 16 skipped)
- pnpm -C server exec vitest run src/__tests__/tenant-activate.integration.test.ts -t "FAM-07E2 — activation consent scaffold": PASS (6 passed, 21 skipped)
- pnpm -C server exec vitest run src/__tests__/fam-07e5l-handoff-user-rls.test.ts: PASS (4 passed)
- pnpm -C server exec vitest run src/__tests__/fam-07e5n-handoff-organizations-rls.test.ts: PASS (9 passed)

## 16) Migration Apply Result
- Command: pnpm -C server run db:migrate:tracked
- Result:
  - Prisma preflight PASS
  - migrate deploy PASS
  - No pending migrations to apply

## 17) Runtime Rerun Result (Live)
- Target: https://app.texqtic.com
- Session mode: active Control Plane session with explicit bearer attachment
- Token handling: presence confirmed only; value not recorded
- GET /api/control/whoami:
  - 200, success true, isSuperAdmin true
- POST /api/control/tenants/provision/consent-runtime-path:
  - 201, runtimePathReady true
  - safe identifiers captured: orgId, inviteId
  - legalStatusExpected: LEGAL_PENDING
- POST /api/control/tenants/provision/consent-runtime-path/activate-handoff:
  - 500 INTERNAL_ERROR
  - no success receipt emitted
- Production logs for that failing handoff request now show:
  - prisma.legalConsentEvent.create transaction-not-found
  - no organizations permission denied error in this rerun window

## 18) Secret Non-Leak Confirmation
- No raw invite tokens, invite URLs, token hashes, bearer values, JWTs, cookies, DB URLs, Supabase credentials, or service keys captured.

## 19) LEGAL_PENDING Confirmation
- Helper response legalStatusExpected remained LEGAL_PENDING.
- No LEGAL_APPROVED state was requested or observed.

## 20) Consent Snapshot Evidence
- Handoff returned 500, so no successful handoff receipt for snapshot creation was emitted.
- Tenant-detail observability shows has_records false for rerun target.

## 21) Consent Event Evidence
- Handoff returned 500, so no successful handoff receipt for event creation was emitted.
- Live logs show failure during legalConsentEvent.create, confirming event persistence did not complete.

## 22) Tenant-Detail Observability Result
- GET /api/control/tenants/:id for rerun org returned 200 success.
- consent_scaffold_observability present with has_records false.

## 23) Remaining Blockers
- Active blocker is now handoff consent persistence transaction failure.
- Organizations permission blocker is not the active blocker after this rerun.

## 24) FAM-07 Status Decision
- Remains PARTIALLY_IMPLEMENTED / TEST_CONFIRMED.

## 25) FTR-LEGAL-003 Status Decision
- Remains OPEN / MVP_CRITICAL.

## 26) HD-001 Status Decision
- Remains RUNTIME_CONFIRMED_CONFIGURED.

## 27) Hub Impact Decision
- No governance hub files edited in this unit.
- Hub sync remains pending to later authorized verify-close flow.

## 28) Recommended Next Unit
- Bounded next unit should remediate handoff consent persistence transaction-lifetime failure (legalConsentEvent create path) without broadening contracts or legal posture.

## 29) Final Enum
- FAM_07E5N_ORGANIZATIONS_PERMISSION_REMEDIATED_RUNTIME_PROOF_BLOCKED_CONSENT_PERSISTENCE