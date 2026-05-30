# FAM-07E4-VERCEL-BUILD-TENANTCONFIG-TYPE-HOTFIX-001

## 1) Unit And Mode
- Unit ID: FAM-07E4-VERCEL-BUILD-TENANTCONFIG-TYPE-HOTFIX-001
- Mode: TECS Safe-Write production build hotfix
- Objective: narrow type/contract alignment to restore Vercel/production TypeScript build parity for E4 consent scaffold observability.

## 2) Current HEAD / Branch
- Branch: main
- Pre-hotfix HEAD: 8f8e6ba3

## 3) Preflight Results
- `git status --short`
  - Result: clean (no output)
- `git rev-parse --short HEAD`
  - Result: `8f8e6ba3`
- Lineage verification (`git rev-list --oneline --max-count=400 HEAD`) includes:
  - `8f8e6ba3`
  - `ea61bd15`
  - `d5e15813`
  - `7d9a665c`
  - `b2bf6b45`
  - `7a6e1b84`

## 4) Vercel Build Failure Summary
- Reported Vercel failure:
  - `components/ControlPlane/TenantDetails.tsx(112,13): error TS2339: Property 'consent_scaffold_observability' does not exist on type 'TenantConfig'.`
- Local reproduction before edit:
  - Command: `pnpm exec tsc --noEmit -p tsconfig.json`
  - Result: same TS2339 at `components/ControlPlane/TenantDetails.tsx:112`.

## 5) Root Cause
- E4 introduced `tenant.consent_scaffold_observability` read usage in TenantDetails.
- `TenantConfig` in `types.ts` did not include this property, causing compile-time type mismatch.

## 6) Exact Write Allowlist (Repo-Truth Narrowed)
- `types.ts` (authoritative declaration of `TenantConfig`)
- `artifacts/control-plane/FAM-07E4-VERCEL-BUILD-TENANTCONFIG-TYPE-HOTFIX-001.md`

## 7) Exact Files Changed
- `types.ts`
- `artifacts/control-plane/FAM-07E4-VERCEL-BUILD-TENANTCONFIG-TYPE-HOTFIX-001.md`

## 8) Type / Contract Fix Summary
- Added optional `consent_scaffold_observability` to `TenantConfig` with bounded E4 shape only:
  - `has_records`
  - `has_legal_approved_record`
  - `latest_snapshot`
  - `recent_events`
- Kept bounded-safe fields; no metadata JSON, request/correlation IDs, agreement hash, or agreement source URL added.

## 9) Legal-Pending Guardrails Preserved
- LEGAL_PENDING / NOT LEGAL-APPROVED UI semantics preserved.
- No final legal wording introduced.
- No legal approval/compliance-complete claim introduced.

## 10) Validation Commands And Results
- Pre-fix reproduction:
  - `pnpm exec tsc --noEmit -p tsconfig.json`
  - Result: FAIL (TS2339 on TenantConfig missing property).
- Post-fix typecheck:
  - `pnpm exec tsc --noEmit -p tsconfig.json`
  - Result: PASS.
- Targeted frontend test:
  - `pnpm exec vitest run tests/frontend/control-plane-consent-observability.test.tsx --config vitest.frontend.config.ts`
  - Result: PASS.
- Vercel-equivalent build check:
  - `npm run build`
  - Result: PASS.

## 11) Vercel-Equivalent Build Status
- Local Vercel-equivalent build command executed: `npm run build`
- Outcome: passed locally.

## 12) Backend Behavior Change
- None.

## 13) Final Legal Wording / Approval Claim Introduced?
- No.

## 14) HD-001 Status Decision
- Remains: `RUNTIME_CONFIRMED_CONFIGURED`.

## 15) FAM-07 Status Decision
- Remains: `PARTIALLY_IMPLEMENTED / TEST_CONFIRMED`.
- Not advanced to VERIFIED_COMPLETE.

## 16) FTR-LEGAL-003 Status Decision
- Remains: `OPEN / MVP_CRITICAL`.
- No closure action taken.

## 17) Hub Impact Decision
- `NO_HUB_UPDATE_REQUIRED`.
- Reason: build/type hotfix only; no launch/legal closure truth change.

## 18) Remaining FAM-07 Gates
- Runtime verification and legal-gated completion steps remain pending.
- E5 runtime verification is next only after confirmed build fix.

## 19) Recommended Next Unit
- `FAM-07E5-CONSENT-SCAFFOLD-RUNTIME-VERIFICATION-001`

## 20) Final Enum
- `FAM_07E4_VERCEL_BUILD_TENANTCONFIG_TYPE_HOTFIX_COMPLETE_BUILD_CONFIRMED`
