# WL-ADMIN-ENTRY-DISCOVERABILITY-001-DESIGN-v1

## Status

- Unit: `WL-ADMIN-ENTRY-DISCOVERABILITY-001`
- Phase: `DESIGN`
- State: `OPEN` / design defined
- Delivery posture: `DECISION_QUEUE` only
- Active-delivery impact: `TENANT-TRUTH-CLEANUP-001` remains the sole product-facing `ACTIVE_DELIVERY`

## Mission

Define the bounded white-label admin-entry and discoverability remediation plan for
`WL-ADMIN-ENTRY-DISCOVERABILITY-001`.

This unit exists only to restore a truthful, discoverable, and reliably reachable WL
owner/admin path into the real `WL_ADMIN` runtime already present in repo truth.

This design is planning only. No implementation has started in this phase.

## Unit Type / Phase

`WL-ADMIN-ENTRY-DISCOVERABILITY-001` is one bounded WL-only admin-entry and discoverability unit.

It exists only to resolve the owner/admin path into `WL_ADMIN` on the bounded white-label
runtime path. It does not authorize broad white-label UX redesign, shell redesign, enterprise
admin redesign, document reconciliation, or reopening any prior closed unit.

## Problem Statement

Current repo truth already contains a real WL admin console, role-gated WL admin admission logic,
and a distinct WL admin shell. The remaining problem is that the WL owner/admin path into that
real console is not discoverable enough and is not reliably reaching `WL_ADMIN` in exercised live
runtime.

This is therefore not a missing-admin-runtime problem. It is a bounded WL-only admin-entry and
discoverability problem across the already investigated owner/admin path.

## Carry-Forward Truth / Prior-Unit Separation

The following truths are carried forward and must remain preserved:

- `WL-ADMIN-ENTRY-DISCOVERABILITY-001` is already lawfully `OPEN`.
- `TENANT-TRUTH-CLEANUP-001` remains the sole product-facing `ACTIVE_DELIVERY`.
- This unit is WL-only and is not shared with enterprise.
- Enterprise admin remains intentionally integrated and no enterprise redesign unit is justified
  now.
- This unit is not part of `TENANT-TRUTH-CLEANUP-001`, because that active unit is document-only.
- This unit is not part of `WL-BLUEPRINT-RUNTIME-RESIDUE-001`, because that unit is limited to the
  live blueprint-authority residue path.
- This unit does not reopen `WL-COMPLETE-001`; it addresses one bounded residual WL owner/admin
  path problem discovered after WL operating-mode closure.

## Why This Is WL-Only

This unit is WL-only because current repo truth and the latest bounded investigation establish two
different admin models:

- enterprise admin is intentionally integrated into the B2B tenant experience and remains reachable
  through that integrated shell model
- white-label admin is modeled as a distinct runtime state and a distinct shell, `WL_ADMIN` and
  `WhiteLabelAdminShell`

The remaining defect family is therefore not a shared enterprise + WL admin problem. It is one
white-label-only mismatch between:

1. the WL admin runtime that repo truth says exists
2. the live owner/admin entry and discoverability path that is not reaching it truthfully enough

## Repo-Truth Findings

### Expected WL owner/admin entry path

Repo truth currently implies the following bounded owner/admin path:

1. WL owner/admin authenticates in tenant realm.
2. `App.tsx` tenant bootstrap calls `/api/me`, hydrates the current tenant, and checks WL admin
   admission eligibility.
3. If `tenant.is_white_label === true` and the authenticated role is one of
   `TENANT_OWNER`, `TENANT_ADMIN`, `OWNER`, or `ADMIN`, app state should route to `WL_ADMIN`.
4. When `appState === 'WL_ADMIN'`, the app renders `WhiteLabelAdminShell`.
5. The storefront remains reachable from `WL_ADMIN` through the shell back link.

That expected path is already present in repo truth and is not itself a speculative design.

### Current bounded findings by surface

#### `App.tsx:1127`

- Owns login-time WL owner/admin admission logic inside tenant bootstrap.
- Defines `WL_ADMIN_ROLES` and the `nextState` decision between `EXPERIENCE` and `WL_ADMIN`.
- This is the canonical routing-admission surface for post-login WL admin entry.

#### `App.tsx:2587`

- Owns the `WL_ADMIN` render branch and the neighboring `EXPERIENCE` / `TEAM_MGMT` /
  `SETTINGS` shell path.
- Confirms that `WhiteLabelAdminShell` is real and that the storefront shell remains separate.
- Also confirms that the storefront shell props still route `onNavigateTeam` into `TEAM_MGMT`, not
  into `WL_ADMIN`, which is directly relevant to discoverability shape.

#### `layouts/Shells.tsx:150`

- `WhiteLabelShell` exposes storefront navigation, including `Access Control`.
- `WhiteLabelAdminShell` exists separately and exposes a back link to storefront, but the reverse
  storefront-to-admin affordance is not symmetrical here.
- This surface therefore controls storefront visibility and affordance language more than routing.

#### `components/Tenant/WhiteLabelSettings.tsx:61`

- The settings surface explicitly tells experience-shell users that custom-domain management lives
  in White Label Admin under Domains.
- In the investigated context, it provides informational discoverability language but no direct
  owner/admin transition path.
- This surface therefore controls settings-level visibility and discoverability messaging.

### Strictly necessary adjacent surfaces

No hidden neighboring file outside the already investigated bounded surfaces was strictly required
to establish design truth.

The listed surfaces already cover:

- login-time admission routing
- WL admin render selection
- storefront affordance visibility
- settings-level discoverability messaging

Any later implementation should resist pulling in adjacent files unless the bounded first pass
proves one is strictly necessary.

## Exact Bounded Scope

This unit is bounded to the already investigated WL admin-entry surfaces only:

- `App.tsx:1127` — login-time WL admin admission and `nextState` routing
- `App.tsx:2587` — `WL_ADMIN` render branch and neighboring storefront-shell branch behavior
- `layouts/Shells.tsx:150` — storefront-shell discoverability affordances and admin-shell symmetry
- `components/Tenant/WhiteLabelSettings.tsx:61` — settings-level White Label Admin visibility
  messaging

At design time, these surfaces map to four bounded concerns:

- routing admission
- shell selection
- storefront discoverability
- settings discoverability

## Out Of Scope

- enterprise admin redesign or stronger enterprise role separation
- `TENANT-TRUTH-CLEANUP-001` document-authority reconciliation work
- `WL-BLUEPRINT-RUNTIME-RESIDUE-001` blueprint-authority residue cleanup
- reopening `WL-COMPLETE-001`, `TRUTH-CLEANUP-001`, or any other closed unit
- broad white-label UX redesign
- broad shell redesign
- routing-system redesign outside the bounded WL admin-entry path
- backend/auth redesign
- control-plane changes
- schema, migration, Prisma, SQL, tests, deployment, or verification execution in this phase
- creating new replacement authority outside the established product-truth stack

## Design Intent / Remediation Shape

The intended remediation shape is the minimum lawful implementation required to make the real WL
admin runtime discoverable and reachable on the bounded owner/admin path.

At design level only, that means:

1. preserve the existing repo-truth WL admin model rather than redesigning it
2. preserve the existing WL-only separation from enterprise admin
3. ensure owner/admin admission can still route directly into `WL_ADMIN` when the login-time truth
   conditions are met
4. ensure the storefront/experience side exposes one truthful, bounded admin-entry affordance for
   eligible WL owner/admin users rather than only implying that White Label Admin exists
5. ensure settings copy no longer points to a practically unreachable admin surface on the bounded
   owner/admin path
6. preserve the existing `WL_ADMIN -> storefront` back path rather than redesigning navigation as a
   broader bidirectional shell system

The minimum lawful implementation shape is therefore a narrow routing-and-affordance repair, not a
new shell architecture.

## Slice Plan

### Slice 1 — Admission path confirmation in `App.tsx`

Confirm and, if needed, minimally repair the WL owner/admin post-login route so the existing
`WL_ADMIN` admission path remains truthful and fail-closed.

### Slice 2 — Storefront discoverability repair

Add or correct one bounded storefront-side admin-entry affordance for eligible WL owner/admin
users without broadening the storefront navigation model.

### Slice 3 — Settings discoverability alignment

Align the settings-level White Label Admin guidance with the real bounded owner/admin entry path so
settings no longer merely references an admin surface without a truthful route shape.

### Slice 4 — Bounded frontend verification

Verify the WL owner/admin entry path in runtime, including both direct admission and storefront-
side discoverability, plus required neighboring shell-path smoke checks.

### Slice 5 — Governance sync and close

If the bounded implementation and verification pass, synchronize governance/product-truth records
and close only if no WL-only admin-entry discoverability defect remains in the bounded scope.

## Verification Plan

The verification discipline for this unit is frontend verification first.

Required verification questions:

1. Does a WL owner/admin login still route truthfully into `WL_ADMIN`?
2. If runtime lands in storefront instead, is there now one bounded, discoverable owner/admin path
   into `WL_ADMIN`?
3. Does the settings surface truthfully align with that path?
4. Does `WL_ADMIN -> storefront` back navigation remain healthy?
5. Are the neighboring white-label experience paths still sound after the bounded change?
6. Is enterprise admin behavior unchanged?
7. Is the blueprint-residue path untouched?

Required smoke checks after implementation:

- WL owner/admin login path
- WL storefront home
- WL storefront `Access Control` path if still present
- WL settings path
- WL admin `Storefront` return path
- neighboring `EXPERIENCE`, `TEAM_MGMT`, `SETTINGS`, and `WL_ADMIN` transitions
- enterprise integrated admin non-regression

Carry-forward rule:

- `implement -> commit -> deploy -> verify -> close`

## Risks / Drift Controls

- Do not widen this unit into enterprise admin redesign.
- Do not widen this unit into broad white-label shell redesign.
- Do not absorb this unit into `TENANT-TRUTH-CLEANUP-001`.
- Do not absorb this unit into `WL-BLUEPRINT-RUNTIME-RESIDUE-001`.
- Do not treat settings copy alone as sufficient if routing truth remains broken.
- Do not treat routing admission alone as sufficient if storefront discoverability remains missing.
- Do not modify backend/auth, database, or unrelated tenant experience paths in the first pass.
- Do not change `TENANT-TRUTH-CLEANUP-001` as the sole `ACTIVE_DELIVERY`.

## Lawful Next Implementation Entry

The lawful first implementation entry file is `App.tsx`.

Rationale:

- It already owns login-time WL admin admission.
- It already owns `WL_ADMIN` render selection.
- It already owns the neighboring storefront-shell state transitions that shape discoverability.

If a bounded implementation later proves that an additional surface must change, the next lawful
secondary files are:

- `layouts/Shells.tsx` for storefront/admin affordance visibility only
- `components/Tenant/WhiteLabelSettings.tsx` for settings-level discoverability alignment only

No additional hidden neighboring surface is pre-authorized by this design.

## Completion Note

This design defines one bounded WL-only remediation path for `WL-ADMIN-ENTRY-DISCOVERABILITY-001`.

The unit remains `OPEN`. No implementation has started. No runtime code, backend code, schema,
tests, deployment, or broader product redesign work is authorized by this design artifact.