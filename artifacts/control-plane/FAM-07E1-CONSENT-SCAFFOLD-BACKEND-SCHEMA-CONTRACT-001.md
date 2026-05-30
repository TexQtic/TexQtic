# FAM-07E1-CONSENT-SCAFFOLD-BACKEND-SCHEMA-CONTRACT-001

Status: IMPLEMENTED
Mode: TECS Safe-Write implementation
Date: 2026-05-30

## 1) Unit ID and Mode

- Unit ID: FAM-07E1-CONSENT-SCAFFOLD-BACKEND-SCHEMA-CONTRACT-001
- Mode: TECS Safe-Write implementation
- Scope: backend schema and contract scaffold only

## 2) Current HEAD and Branch

- Branch at unit open: main
- HEAD at preflight: 7a6e1b84

## 3) Preflight Results

Commands run:
- git status --short
- git rev-parse --short HEAD
- git cat-file -t 7a6e1b84
- git cat-file -t 7fbf7a01
- git cat-file -t 78f3a088
- git cat-file -t 47043ff9
- git cat-file -t 40e2ea1b
- git cat-file -t 4cb2eddf
- git cat-file -t 1ec1843a
- git cat-file -t 672f4d46

Results:
- worktree clean at preflight
- HEAD confirmed: 7a6e1b84
- all required lineage commits present as commit objects

## 4) Prior Design Artifact Path Confirmation

Command run:
- git --no-pager show --name-only --oneline 7a6e1b84

Result:
- prior design artifact committed at canonical path:
  - artifacts/control-plane/FAM-07E-LEGAL-GATED-CONSENT-SCAFFOLD-DESIGN-001.md
- root-path hygiene blocker condition not triggered

## 5) Exact Write Allowlist

Final allowlist used for this implementation unit:
- server/prisma/schema.prisma
- server/prisma/migrations/20260537000000_fam_07e1_consent_scaffold_contract/migration.sql
- server/src/lib/legalConsentContracts.ts
- server/src/__tests__/fam-07e1-consent-scaffold.contract.test.ts
- artifacts/control-plane/FAM-07E1-CONSENT-SCAFFOLD-BACKEND-SCHEMA-CONTRACT-001.md

No other files were edited.

## 6) Exact Files Changed

- server/prisma/schema.prisma
- server/prisma/migrations/20260537000000_fam_07e1_consent_scaffold_contract/migration.sql
- server/src/lib/legalConsentContracts.ts
- server/src/__tests__/fam-07e1-consent-scaffold.contract.test.ts
- artifacts/control-plane/FAM-07E1-CONSENT-SCAFFOLD-BACKEND-SCHEMA-CONTRACT-001.md

## 7) Migration Doctrine Decision

Doctrine source read:
- governance/control/DOCTRINE.md (D-003)

Decision:
- D-003 requires repo-governed schema changes and forbids prisma migrate dev/db push.
- This unit implements scaffold foundations only (no deployment, no production DB mutation).
- A tracked migration SQL artifact was authored to capture intended DB schema contract.
- Migration was not applied in this unit.
- Schema validity and client generation were validated locally with prisma validate and prisma generate.

## 8) Schema and Contract Implementation Summary

Implemented backend scaffold for consent authority with LEGAL_PENDING semantics:

Prisma schema additions:
- new model LegalConsentSnapshot (current-state authority)
  - org/tenant/actor linkage
  - agreementType
  - agreementVersion/agreementHash/agreementSourceUrl placeholders
  - legalStatus enum (LEGAL_PENDING | LEGAL_APPROVED | SUPERSEDED)
  - sourceFlow enum (ACTIVATE_NEW_USER | ACTIVATE_AUTHENTICATED_INVITE | ADMIN_REVIEW)
  - acceptedAt/reviewedAt
  - correlationId/requestId
  - metadataJson
  - unique identity on org+actor+agreementType
- new model LegalConsentEvent (immutable event/history authority)
  - snapshot reference (optional)
  - org/tenant/actor linkage
  - agreement metadata fields
  - legalStatus, sourceFlow, eventType
  - acceptedAt/reviewedAt
  - correlationId/requestId
  - metadataJson
  - occurredAt/createdAt
- relation fields added on Tenant, User, organizations
- new Prisma enums:
  - LegalConsentStatus
  - LegalConsentSourceFlow
  - LegalConsentAgreementType
  - LegalConsentEventType

Migration artifact:
- created migration SQL with enum type definitions and two tables:
  - public.legal_consent_snapshots
  - public.legal_consent_events
- includes indexes and unique identity constraint for snapshot authority

Backend contract module:
- server/src/lib/legalConsentContracts.ts
- zod schemas + exported types for:
  - legal consent status/source flow/agreement type/event type
  - agreement metadata contract
  - acceptance contract
  - snapshot contract

## 9) Legal-Pending Guardrails Preserved

- LEGAL_PENDING is explicitly supported in schema and validators.
- Placeholder metadata values are allowed by contracts (non-empty values required, not legal-final text).
- No final legal wording was introduced.
- No final legal-authoritative enforcement was introduced.

## 10) Intentionally Not Wired Yet

- no wiring to POST /api/tenant/activate
- no wiring to POST /api/tenant/activate-authenticated
- no consent gate rejection behavior added to runtime routes
- no control-plane consent UI
- no frontend consent UI
- no legal-final closure logic

## 11) Tests Added and Updated

Added:
- server/src/__tests__/fam-07e1-consent-scaffold.contract.test.ts

Coverage in this unit:
- static schema scaffold checks for models/enums/placeholder fields
- migration file presence and aligned enum/table scaffold checks
- contract validator checks for LEGAL_PENDING placeholder metadata
- explicit non-wiring check ensuring activation route has no new consent error code enforcement in this unit

## 12) Validation Commands and Results

Validation run:
- pnpm -C server exec prisma validate
  - PASS (schema valid)
  - warning observed from Prisma about SetNull referential action recommendations (non-blocking; schema valid)
- pnpm -C server exec prisma generate
  - PASS
- pnpm -C server exec vitest run src/__tests__/fam-07e1-consent-scaffold.contract.test.ts
  - PASS (9/9)
- pnpm -C server run typecheck
  - PASS

## 13) HD-001 Status Decision

- HD-001 remains: RUNTIME_CONFIRMED_CONFIGURED (unchanged)

## 14) FAM-07 Status Decision

- FAM-07 remains: PARTIALLY_IMPLEMENTED / TEST_CONFIRMED (unchanged)
- FAM-07 remains not VERIFIED_COMPLETE (unchanged)

## 15) FTR-LEGAL-003 Status Decision

- FTR-LEGAL-003 remains: OPEN / MVP_CRITICAL (unchanged)
- no legal closure claim made

## 16) Hub Impact Decision

- Hub impact: NO_HUB_UPDATE_REQUIRED
- Reason: scaffold-only backend foundation does not change launch/legal closure truth or family completion truth

## 17) Remaining FAM-07 Gates

- legal package authority still pending (final wording, version policy, hash/source policy, actor acceptance policy, jurisdiction/locale policy, re-consent policy)
- activation consent enforcement wiring is pending a later bounded unit
- control-plane consent observability wiring is pending a later bounded unit
- legal-final activation/closure gate remains unchanged

## 18) Recommended Next Unit

- FAM-07E2-CONSENT-SCAFFOLD-ACTIVATION-CONTRACT-001

## 19) Final Enum

FINAL_ENUM: FAM_07E1_CONSENT_SCAFFOLD_BACKEND_SCHEMA_CONTRACT_IMPLEMENTED_TEST_CONFIRMED
