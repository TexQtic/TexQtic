# FAM-07E2-CONSENT-SCAFFOLD-ACTIVATION-CONTRACT-001

Status: IMPLEMENTED
Mode: TECS Safe-Write implementation
Date: 2026-05-30

## 1) Unit ID and Mode

- Unit ID: FAM-07E2-CONSENT-SCAFFOLD-ACTIVATION-CONTRACT-001
- Mode: TECS Safe-Write implementation
- Scope: backend activation contract scaffold only for consent payload handling on activation routes

## 2) Current HEAD and Branch

- Branch at unit open: main
- HEAD at preflight: 7d9a665c

## 3) Preflight Results

Commands run:
- git status --short
- git rev-parse --short HEAD
- git branch --show-current
- git cat-file -t 7d9a665c
- git cat-file -t b2bf6b45
- git cat-file -t 7a6e1b84
- git cat-file -t 7fbf7a01
- git cat-file -t 78f3a088
- git cat-file -t 47043ff9
- git cat-file -t 40e2ea1b
- pnpm -C server run prisma:preflight
- pnpm -C server run migrate:deploy:prod
- pnpm -C server exec prisma migrate status

Results:
- worktree clean at unit open
- HEAD confirmed: 7d9a665c
- branch confirmed: main
- all required lineage commits present as commit objects
- target DB preflight classification: SESSION_POOLER (Supabase remote endpoint)
- migrate deploy result: no pending migrations to apply
- migrate status result: database schema is up to date

## 4) Migration-Applied Confirmation

- FAM-07E1 migration remains applied and clean.
- Repo-approved migration checks in this unit confirmed no pending migrations.
- Activation contract wiring proceeded only after migration status was clean.

## 5) Exact Write Allowlist

Final allowlist used for this implementation unit:
- server/src/routes/tenant.ts
- server/src/__tests__/tenant-activate.integration.test.ts
- server/src/__tests__/fam-07e1-consent-scaffold.contract.test.ts
- artifacts/control-plane/FAM-07E2-CONSENT-SCAFFOLD-ACTIVATION-CONTRACT-001.md

## 6) Exact Files Changed

- server/src/routes/tenant.ts
- server/src/__tests__/tenant-activate.integration.test.ts
- server/src/__tests__/fam-07e1-consent-scaffold.contract.test.ts
- artifacts/control-plane/FAM-07E2-CONSENT-SCAFFOLD-ACTIVATION-CONTRACT-001.md

## 7) Activation Contract Implementation Summary

Implemented scaffold-only consent activation contract wiring on:
- POST /api/tenant/activate
- POST /api/tenant/activate-authenticated

Behavior introduced:
- Optional `consent` payload support on both activation routes.
- Contract parsing via `consentAcceptanceSchema` (from legal consent scaffold contract module).
- Scaffold validation helper enforcing:
  - accepted=true when consent supplied
  - sourceFlow path match
  - legalStatus must be LEGAL_PENDING
  - optional policy-mismatch checks (version/hash/source URL) when configured
- Deterministic scaffold-safe error codes introduced:
  - CONSENT_REQUIRED
  - CONSENT_METADATA_MISSING
  - CONSENT_VERSION_MISMATCH
  - CONSENT_HASH_MISMATCH
  - CONSENT_SOURCE_MISMATCH
  - CONSENT_NOT_ACCEPTED
  - CONSENT_POLICY_UNAVAILABLE
- Scaffold write helper records LEGAL_PENDING consent state/event in transaction scope:
  - upsert into legal_consent_snapshots
  - create ACCEPTED_PENDING event in legal_consent_events
- Metadata sanitizer added for consent metadata_json to redact sensitive keys (token/secret/password/auth/jwt/invite patterns).

## 8) Legal-Pending Guardrails Preserved

- LEGAL_PENDING is the only accepted legalStatus for scaffold route handling.
- No LEGAL_APPROVED behavior is activated.
- No final legal wording introduced.
- No final legal acceptance claim returned by route responses.
- Consent writes are scaffold-state only (ACCEPTED_PENDING), not legal-final completion.

## 9) What Was Intentionally Not Implemented

- No frontend or control-plane UI changes.
- No legal-final package text/version finalization.
- No final legal enforcement closure behavior.
- No launch/legal readiness claims.
- No schema changes or migrations.
- No deployment/runtime ops changes.
- No SMTP/email changes.

## 10) Tests Added and Updated

Updated:
- server/src/__tests__/tenant-activate.integration.test.ts
  - Added FAM-07E2 consent scaffold coverage:
    - non-enforcing path preserves existing activation without consent
    - LEGAL_PENDING consent accepted for new-user activation with scaffold writes
    - LEGAL_PENDING consent accepted for authenticated activation with scaffold writes
    - enforced mode missing consent -> CONSENT_REQUIRED
    - non-LEGAL_PENDING consent -> CONSENT_POLICY_UNAVAILABLE
    - source-flow mismatch -> CONSENT_SOURCE_MISMATCH
    - metadata sanitization assertion (no sensitive consent metadata fields persisted)
- server/src/__tests__/fam-07e1-consent-scaffold.contract.test.ts
  - Updated legacy non-wiring assertion to scaffold-aware expectation aligned with FAM-07E2.

## 11) Validation Commands and Results

Validation run:
- pnpm -C server exec vitest run src/__tests__/tenant-activate.integration.test.ts
  - PASS (27/27)
- pnpm -C server exec vitest run src/__tests__/fam-07e1-consent-scaffold.contract.test.ts
  - PASS (9/9)
- pnpm -C server run typecheck
  - PASS

## 12) Whether Activation Behavior Changed

- Yes, activation behavior changed in a bounded scaffold-safe way:
  - both activation routes now accept optional scaffold consent payloads
  - both routes can record LEGAL_PENDING scaffold consent snapshot/event when consent is provided
  - existing activation flows remain successful without consent when scaffold enforcement is disabled

## 13) Whether Final Legal Enforcement Was Introduced

- No. Final legal enforcement was not introduced.
- This unit remains scaffold-only with LEGAL_PENDING posture.

## 14) HD-001 Status Decision

- HD-001 remains: RUNTIME_CONFIRMED_CONFIGURED (unchanged)

## 15) FAM-07 Status Decision

- FAM-07 remains: PARTIALLY_IMPLEMENTED / TEST_CONFIRMED (unchanged)
- FAM-07 remains not VERIFIED_COMPLETE (unchanged)

## 16) FTR-LEGAL-003 Status Decision

- FTR-LEGAL-003 remains: OPEN / MVP_CRITICAL (unchanged)

## 17) Hub Impact Decision

- Hub impact: NO_HUB_UPDATE_REQUIRED
- Reason: activation scaffold contract wiring does not close legal gate or family completion status.

## 18) Remaining FAM-07 Gates

- legal-final package authority still pending (wording, version policy, hash/source policy, actor acceptance policy, jurisdiction/locale policy, re-consent policy)
- frontend consent checkpoint flow remains pending
- control-plane consent observability/final legal closure surfaces remain pending
- launch/legal closure remains gated by FTR-LEGAL-003

## 19) Recommended Next Unit

- FAM-07E3-CONSENT-SCAFFOLD-FRONTEND-CHECKPOINT-001

## 20) Final Enum

FINAL_ENUM: FAM_07E2_CONSENT_SCAFFOLD_ACTIVATION_CONTRACT_IMPLEMENTED_TEST_CONFIRMED
