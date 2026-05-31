# FAM-07E5O-HANDOFF-CONSENT-PERSISTENCE-TRANSACTION-REMEDIATION-001

## 1) Unit ID and Mode
- Unit: FAM-07E5O-HANDOFF-CONSENT-PERSISTENCE-TRANSACTION-REMEDIATION-001
- Mode: TECS Safe-Write repo-truth diagnosis + narrow implementation remediation + bounded runtime rerun
- Execution date: 2026-05-31

## 2) Branch and HEAD
- Branch: main
- HEAD at unit start: 2b5cec14

## 3) Preflight Results
- git diff --name-only: clean (no output)
- git rev-parse --short HEAD: 2b5cec14
- Ancestor checks:
  - 1e7abc41: present
  - 04fa7277: present
  - 0484754a: present
  - 6e706fd6: present
  - 2b5cec14: present
- git status --short command intermittently returned terminal control interrupt in this environment; clean-tree status was corroborated by git diff --name-only and changed-files API before edits.

## 4) E5K/E5L/E5M/E5N Lineage Summary
- E5K: applied consent scaffold grants; runtime blocker moved to users RLS.
- E5L: users INSERT RLS + admin context ordering remediation.
- E5M: users blocker cleared; organizations permission blocker surfaced.
- E5N: organizations permission blocker remediated; runtime blocker moved to consent persistence transaction error.

## 5) E5N Runtime Blocker Summary
- Safe handoff remained 500 INTERNAL_ERROR.
- Production logs showed:
  - prisma.legalConsentEvent.create
  - Transaction API error: Transaction not found

## 6) Safe Handoff Transaction Path Trace
- Entry route: POST /api/control/tenants/provision/consent-runtime-path/activate-handoff
- Wrapper: server/src/routes/admin/tenantProvision.ts
- Runtime function: activateConsentRuntimeInviteById in server/src/routes/tenant.ts
- Write order in callback:
  1. tx.user.findUnique / tx.user.create
  2. tx.organizations.update
  3. tx.membership.create
  4. recordLegalPendingConsentScaffold (snapshot/event)
  5. tx.invite.update (acceptedAt)
  6. writeAuditLog(tx,...)

## 7) legalConsentEvent.create Call Path Trace
- activateConsentRuntimeInviteById -> recordLegalPendingConsentScaffold(input)
- recordLegalPendingConsentScaffold performs:
  - input.tx.legalConsentSnapshot.upsert
  - input.tx.legalConsentEvent.create
- Both persistence writes use the passed transaction client path (input.tx), not root prisma.

## 8) Transaction/Client/Context Findings
- No escape to root prisma in consent helper.
- No non-awaited consent persistence promise chain.
- No nested interactive transaction around consent helper.
- withDbContext previously used prisma.$transaction(callback) with default interactive timeout behavior.
- E5N runtime evidence showed handoff request durations above 8s while error occurred during later persistence stage.
- Combined repo truth indicates transaction lifetime expiry risk in safe handoff path before legalConsentEvent.create executed.

## 9) Root Cause Classification
- Root cause class: interactive transaction lifetime timeout in safe handoff path under production latency, with non-DB work (bcrypt hash) occurring inside transaction callback and no explicit timeout override.

## 10) Snapshot/Event Transaction Risk Assessment
- Snapshot/event writes share the same tx client and are sequenced in one callback.
- If callback exceeds transaction timeout window, later writes (including legalConsentEvent.create) can fail with transaction-not-found while earlier writes may or may not have completed.
- Risk applies to this long callback path and is not a DB grant/RLS policy issue in this unit.

## 11) Implementation Summary
- Added bounded transaction option support to withDbContext:
  - optional maxWaitMs / timeoutMs / isolationLevel passthrough.
- Applied narrow safe-handoff options only:
  - SAFE_HANDOFF_TX_OPTIONS { timeoutMs: 20000, maxWaitMs: 5000 }
- Moved bootstrap password hashing outside safe handoff transaction callback to reduce in-transaction non-DB work.
- No route contract changes.
- No migration/schema changes.

## 12) Exact Files Changed
- server/src/lib/database-context.ts
- server/src/routes/tenant.ts
- server/src/__tests__/fam-07e5o-handoff-consent-transaction.test.ts
- artifacts/control-plane/FAM-07E5O-HANDOFF-CONSENT-PERSISTENCE-TRANSACTION-REMEDIATION-001.md

## 13) Transaction Safety Proof
- Safe handoff consent writes remain on input.tx transaction client path.
- withDbContext now supports bounded transaction options for long callback paths.
- Safe handoff path now explicitly opts into bounded extended timeout.
- Non-DB bcrypt hash moved before transaction entry for this path.
- No RLS disable, no tenant isolation change, no broad permissions/grants introduced.

## 14) Validation Commands and Results
- pnpm -C server exec tsc --noEmit: PASS
- pnpm -C server exec vitest run src/__tests__/tenant-provision-approved-onboarding.integration.test.ts -t "approved-onboarding tenant provisioning route": PASS
- pnpm -C server exec vitest run src/__tests__/tenant-activate.integration.test.ts -t "FAM-07E2 — activation consent scaffold": PASS
- pnpm -C server exec vitest run src/__tests__/fam-07e5l-handoff-user-rls.test.ts: PASS
- pnpm -C server exec vitest run src/__tests__/fam-07e5n-handoff-organizations-rls.test.ts: PASS
- pnpm -C server exec vitest run src/__tests__/fam-07e5o-handoff-consent-transaction.test.ts: PASS

## 15) Deployment/Runtime Rerun Result
- Source remediation deployed to production via:
  - vercel deploy --prod --yes
  - Production alias: https://app.texqtic.com
  - Deployment id: dpl_9xgjiHSdCjqSHVEJBZ3ZTSyDUxKU
- Runtime rerun against live target completed.

## 16) Secret Non-Leak Confirmation
- No raw invite token, invite URL, token hash, bearer value, JWT, cookie, DB URL, Supabase credentials, or service tokens captured.

## 17) LEGAL_PENDING Posture Confirmation
- Helper response preserved legalStatusExpected: LEGAL_PENDING.
- Handoff receipt legalStatus: LEGAL_PENDING.
- No LEGAL_APPROVED/legal-final state created.

## 18) Consent Snapshot Runtime Evidence
- Safe handoff returned 200.
- Receipt contained consentSnapshot.present = true and snapshot id present.
- Tenant-detail observability latest_snapshot legal_status = LEGAL_PENDING.

## 19) Consent Event Runtime Evidence
- Safe handoff returned 200.
- Receipt contained consentEvent.present = true and event id present.
- Tenant-detail observability recent_events included ACCEPTED_PENDING.

## 20) Tenant-Detail Observability Result
- GET /api/control/tenants/:id returned 200.
- consent_scaffold_observability present.
- has_records = true.
- latest_source_flow = ACTIVATE_AUTHENTICATED_INVITE.

## 21) Remaining Blockers
- No active blocker in this bounded E5O scope after remediation/rerun.
- Prior transaction-not-found signature not observed in rerun logs for this flow.

## 22) FAM-07 Status Decision
- Remains PARTIALLY_IMPLEMENTED / TEST_CONFIRMED.

## 23) FTR-LEGAL-003 Status Decision
- Remains OPEN / MVP_CRITICAL.

## 24) HD-001 Status Decision
- Remains RUNTIME_CONFIRMED_CONFIGURED.

## 25) Hub Impact Decision
- HUB_UPDATE_REQUIRED_PENDING

## 26) Recommended Next Unit
- Authorized next bounded unit should cover hub-sync/verify-close recording for E5O chain without changing family/legal closure posture.

## 27) Final Enum
- FAM_07E5O_CONSENT_PERSISTENCE_TRANSACTION_REMEDIATED_RUNTIME_PROOF_CONFIRMED_HUB_SYNC_PENDING