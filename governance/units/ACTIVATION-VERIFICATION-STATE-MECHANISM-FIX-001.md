# ACTIVATION-VERIFICATION-STATE-MECHANISM-FIX-001

## Objective

Repair the bounded activation-verification preparation mechanism so approved-onboarding
provisioning prepares one ephemeral verification tenant in `VERIFICATION_APPROVED` without using an
invalid follow-up mutation from `ACTIVE`.

## Repo-Truth Findings

1. `Tenant.status` is limited to tenant-layer values and defaults to `ACTIVE`
2. approved-onboarding provisioning previously copied `tenant.status` into `organizations.status`
3. the helper therefore created an org already persisted as `ACTIVE`
4. `POST /api/control/tenants/:id/onboarding/outcome` lawfully rejects mutation from `ACTIVE`
5. `POST /api/control/tenants/:id/onboarding/activate-approved` still correctly requires a
   persisted `VERIFICATION_APPROVED` source state

## Bounded Change

Chosen fix: initialize `organizations.status` as `VERIFICATION_APPROVED` only for
`APPROVED_ONBOARDING` provisioning, while preserving the tenant-layer `Tenant.status` default.

This keeps the mechanism narrow:

- no schema change
- no tenant model redesign
- no activation-path bypass
- no mutation of canonical baseline tenants
- no onboarding architecture rewrite

## Allowed Surface

- `server/src/services/tenantProvision.service.ts`
- `server/src/services/tenantProvision.service.test.ts`
- `server/src/__tests__/tenant-provision-approved-onboarding.integration.test.ts`
- `server/scripts/prepare-activation-verification-state.ts`
- `docs/ops/ACTIVATION-VERIFICATION-STATE-ENABLEMENT-001.md`

## Verification Standard

1. focused proof that approved-onboarding provisioning now returns `organization.status = VERIFICATION_APPROVED`
2. focused proof that the helper verifies prepared state instead of attempting the invalid
   ACTIVE-to-APPROVED mutation
3. `pnpm exec tsc --noEmit`
4. server typecheck if applicable

## Result Expectation

After this unit, the activation-verification helper should leave one ephemeral tenant lawfully ready
for the later reviewed `activate-approved` smoke check, and the control-plane close gate can resume
without widening scope.