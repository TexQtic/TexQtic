# ACTIVATION-VERIFICATION-STATE-ENABLEMENT-001

## Purpose

This runbook defines the bounded operational procedure for preparing one **ephemeral**
activation-eligible verification path when a close gate requires approved-onboarding activation
proof.

It does not authorize permanent seed expansion, canonical-tenant mutation, cleanup execution,
broad tenant management, onboarding redesign, or production mutation without an explicit bounded
verification purpose.

## Chosen Mechanism

Chosen strategy: **ephemeral verification tenant**.

Why this is the smallest lawful option:

1. `Acme Corporation` and `White Label Co` remain the permanent canonical baseline and must not be
   polluted with ad hoc verification state
2. repo truth already supports the required lifecycle seams:
   - approved-onboarding provisioning
   - onboarding outcome persistence
   - approved activation from the control plane
3. the helper can stop at `VERIFICATION_APPROVED`, which is the exact precondition later required
   by the reviewed deep-dive activation smoke check

## Existing Repo Seams Used

- provisioning seam: `POST /api/control/tenants/provision` with `provisioningMode=APPROVED_ONBOARDING`
- onboarding outcome seam: `POST /api/control/tenants/:id/onboarding/outcome` with `outcome=APPROVED`
- later close-grade activation seam: `POST /api/control/tenants/:id/onboarding/activate-approved`
- deep-dive control gate: `components/ControlPlane/TenantDetails.tsx` shows the activation control
  only for `VERIFICATION_APPROVED`

## Helper

Bounded helper:

- `server/scripts/prepare-activation-verification-state.ts`

Default behavior is **dry-run**.

Dry-run prints:

- the governance trail fields that must be recorded
- the planned ephemeral tenant identity
- the exact HTTP sequence that will be used when executed
- confirmation that the mechanism stops at `VERIFICATION_APPROVED`

Execution mode is enabled only with `--execute` and requires admin authentication material.

## Required Governance Trail For Every Run

Every future run must record all of the following before execution:

- purpose
- owner
- close gate or bounded unit requiring the state
- target classification: `EPHEMERAL`
- retention intent
- cleanup or rollback plan
- run tag

If any of the above is missing, the helper must not be treated as lawfully ready for execution.

## Dry-Run Example

```bash
pnpm -C server exec tsx scripts/prepare-activation-verification-state.ts \
  --base-url https://tex-qtic.vercel.app \
  --owner Paresh \
  --purpose "Prepare one approved activation verification tenant for CONTROL-PLANE-TENANT-DEEP-DIVE-TRUTHFULNESS close gate" \
  --close-gate CONTROL-PLANE-TENANT-DEEP-DIVE-TRUTHFULNESS \
  --retention-intent "remove immediately after close verification" \
  --cleanup-plan "delete the ephemeral verification tenant after the reviewed close-grade activation run is complete" \
  --run-tag 2026-04-01-deep-dive
```

Expected dry-run result:

- emits one JSON plan
- classifies the tenant as `EPHEMERAL`
- shows the provisioning request shape
- shows the onboarding outcome transition to `VERIFICATION_APPROVED`
- leaves actual activation for the later close-grade run

## Execute Example

Use execution mode only when a bounded verification run is actively authorized and all governance
trail fields have already been recorded.

Using an existing admin token:

```bash
set TEXQTIC_ADMIN_TOKEN=<REDACTED>
pnpm -C server exec tsx scripts/prepare-activation-verification-state.ts \
  --execute \
  --base-url https://tex-qtic.vercel.app \
  --owner Paresh \
  --purpose "Prepare one approved activation verification tenant for CONTROL-PLANE-TENANT-DEEP-DIVE-TRUTHFULNESS close gate" \
  --close-gate CONTROL-PLANE-TENANT-DEEP-DIVE-TRUTHFULNESS \
  --retention-intent "remove immediately after close verification" \
  --cleanup-plan "delete the ephemeral verification tenant after the reviewed close-grade activation run is complete" \
  --run-tag 2026-04-01-deep-dive
```

Or allow the helper to obtain an admin token via login without printing it:

```bash
set TEXQTIC_ADMIN_EMAIL=admin@texqtic.com
set TEXQTIC_ADMIN_PASSWORD=<REDACTED>
pnpm -C server exec tsx scripts/prepare-activation-verification-state.ts \
  --execute \
  --base-url https://tex-qtic.vercel.app \
  --owner Paresh \
  --purpose "Prepare one approved activation verification tenant for CONTROL-PLANE-TENANT-DEEP-DIVE-TRUTHFULNESS close gate" \
  --close-gate CONTROL-PLANE-TENANT-DEEP-DIVE-TRUTHFULNESS \
  --retention-intent "remove immediately after close verification" \
  --cleanup-plan "delete the ephemeral verification tenant after the reviewed close-grade activation run is complete" \
  --run-tag 2026-04-01-deep-dive
```

## Resulting State After Execution

Successful execution prepares:

- one ephemeral tenant created through the approved-onboarding provisioning seam
- one persisted onboarding outcome of `VERIFICATION_APPROVED`

The helper does **not** call `activate-approved`.

That final activation remains part of the later close-grade verification run that needs to prove the
existing control-plane deep-dive activation path.

## Cleanup / Rollback Discipline

This unit does not execute cleanup.

However, every execution must already define one of these post-run intentions:

- remove immediately after verification
- retain until the linked bounded unit closes
- retain pending dated review

If retained temporarily, the future run record must include:

- why retention is still needed
- who owns it
- when it will be reviewed again

Unknown-purpose or unowned ephemeral verification tenants are policy violations and must be
classified `REVIEW_BEFORE_DELETE` until provenance is restored.

## Operational Note For Future Close-Readiness Runs

When a close gate requires approved-onboarding activation proof and no live tenant currently exists
in `VERIFICATION_APPROVED`, use this helper first in dry-run mode, record the governance trail,
then execute it intentionally to prepare one ephemeral verification tenant. After that, open the
reviewed control-plane tenant deep-dive, confirm the activation control is visible on the eligible
path, perform the later bounded activation smoke check, and finally follow the recorded cleanup or
rollback plan.
