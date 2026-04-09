---
unit_id: REALM-BOUNDARY-SHELL-AFFORDANCE-001
title: Enforce tenant versus control-plane shell affordance boundary in deployed runtime
type: IMPLEMENTATION
status: CLOSED
wave: W5
plane: BOTH
opened: 2026-03-22
closed: 2026-03-22
verified: 2026-03-22
commit: ddeb579
evidence: "DEPLOYED_RUNTIME_VERIFICATION: B2B workspace shell PASS on https://texqtic-godq32ri1-tex-qtic.vercel.app · DEPLOYED_RUNTIME_VERIFICATION: white-label overlay shell PASS on the same verified deployment · DEPLOYED_RUNTIME_VERIFICATION: control-plane login to Tenant Registry PASS on the same verified deployment · DEPLOYMENT_PROOF: Vercel build logs confirmed commit ddeb579 and frontend asset /assets/index-UrHe-g8J.js"
doctrine_constraints:
  - D-004: this unit remains one bounded realm-boundary shell affordance repair only; no second runtime defect unit may be mixed in
  - D-007: no governance, schema, migration, Prisma, or broader auth redesign work may be introduced under this implementation unit
  - D-011: tenant versus control-plane realm truth must remain explicit and must not leak control-plane affordances into tenant sessions
decisions_required: []
blockers: []
---

## Unit Summary

`REALM-BOUNDARY-SHELL-AFFORDANCE-001` is the bounded deployed-runtime repair for tenant-visible
control-plane shell leakage.

The unit is limited to one truth-preserving boundary correction only:

- B2B workspace and white-label overlay shells must not expose a `Control Plane` affordance
- control-plane rendering must remain available only for real control-plane users
- realm truth must resolve from one canonical source instead of diverging between app state and admin-client checks

This unit does not authorize broad auth redesign, impersonation redesign, new routing work,
new governance artifacts outside the canonical unit record, or any additional deployed-audit unit.

## Acceptance Criteria

- [x] B2B workspace runtime no longer shows `Control Plane` on the verified deployed build
- [x] White-label overlay runtime no longer shows `Control Plane` on the verified deployed build
- [x] Real control-plane login still reaches the control-plane registry on the verified deployed build
- [x] Control-plane eligibility now resolves from one canonical realm source
- [x] Tenant sessions are prevented from entering control-plane rendering paths through app-root affordances
- [x] No schema, migration, Prisma, or environment changes were introduced
- [x] No broad auth redesign or unrelated runtime audit scope was introduced

## Files Allowlisted (Modify)

- `App.tsx`
- `layouts/SuperAdminShell.tsx`
- `services/apiClient.ts`
- `services/adminApiClient.ts`

## Files Read-Only

- `governance/control/DOCTRINE.md`
- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/BLOCKED.md`
- `governance/control/SNAPSHOT.md`
- deployed preview runtime at `https://texqtic-godq32ri1-tex-qtic.vercel.app`

## Evidence Record

- Historical bounded attempts preserved: `064a84c` and `47cf89b` were deployed but did not clear the runtime defect
- Final implementation commit: `ddeb579` — `[REALM-BOUNDARY-SHELL-AFFORDANCE-001] unify canonical realm source for admin gating`
- Verified deployment proof: Vercel logs showed `Cloning github.com/TexQtic/TexQtic (Branch: main, Commit: ddeb579)`
- Verified deployment URL: `https://texqtic-godq32ri1-tex-qtic.vercel.app`
- Verified frontend asset on that deployment: `/assets/index-UrHe-g8J.js`
- Deployed runtime verification PASS:
  - B2B workspace account no longer exposed `Control Plane`
  - white-label overlay account no longer exposed `Control Plane`
  - real control-plane account still reached `Tenant Registry`
- Final repair scope remained bounded to app-root realm gating plus canonical admin realm resolution only; no schema, migration, Prisma, environment, or unrelated UX work was introduced

## Exact In-Scope Boundary

The exact in-scope boundary of this unit is:

- remove tenant-visible `Control Plane` shell affordance leakage
- preserve legitimate control-plane entry for real control-plane users
- unify app-root and admin-client control-plane eligibility on one canonical stored realm source
- keep the repair limited to the already-identified realm-boundary defect class only

## Exact Exclusions

The exact out-of-scope boundary of this unit is:

- auth identity-truth redesign beyond the shell-affordance boundary
- impersonation cleanup redesign beyond the bounded shell-affordance path
- broad navigation redesign
- new control-plane feature work
- new tenant feature work
- schema, migration, Prisma, env, or deployment-configuration work
- governance dashboards, matrices, or historical document reconciliation beyond this canonical unit record and Layer 0 sync

## Boundary Locks Preserved

- tenant shells remain tenant-only
- control-plane rendering remains control-plane only
- canonical realm truth is shared between app-root gating and admin request gating
- no new authorization surface is introduced
- no broader auth, routing, or runtime-audit scope is implied

## Governance Sync

- Governance sync unit: `GOVERNANCE-SYNC-REALM-BOUNDARY-SHELL-AFFORDANCE-001`
- Status transition: `OPEN` -> `VERIFIED_COMPLETE`
- Normalized verification verdict: `VERIFIED_COMPLETE`
- Next-action posture after sync: `GOV-CLOSE-REALM-BOUNDARY-SHELL-AFFORDANCE-001`

## Governance Closure

- Governance close unit: `GOV-CLOSE-REALM-BOUNDARY-SHELL-AFFORDANCE-001`
- Status transition: `VERIFIED_COMPLETE` -> `CLOSED`
- Next-action posture after closure: `AUTH-IDENTITY-TRUTH-DEPLOYED-001` decision only
- Mandatory post-close audit result: `DECISION`
- Closure preserves the bounded realm-boundary repair only; it does not open impersonation redesign, auth redesign, or any broader control-plane or tenant remediation stream by implication

## Allowed Next Step

One separate decision step may now assess `AUTH-IDENTITY-TRUTH-DEPLOYED-001` as the next bounded
deployed-runtime governance candidate.

## Forbidden Next Step

- Do **not** reopen this unit for additional shell or auth work
- Do **not** broaden this unit into a general auth redesign
- Do **not** broaden this unit into impersonation-stop cleanup redesign
- Do **not** treat this closure as authorization for any second implementation unit
- Do **not** infer schema, migration, Prisma, or environment work from this closure
- Do **not** treat governance sync as closure; closure is recorded separately above

## Drift Guards

- This unit is closed on deployed-runtime evidence, not on local inference alone
- The verified fix is `ddeb579`; earlier failed bounded attempts remain historical evidence only
- The canonical deployed proof remains tied to `https://texqtic-godq32ri1-tex-qtic.vercel.app` and the build-log commit mapping to `ddeb579`
- Future auth identity-truth analysis must open as a separate decision or unit and must not be smuggled into this closed shell-affordance record

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| What fix actually cleared the deployed defect? | This unit record and commit `ddeb579` |
| What is the single authorized next action after closure? | `governance/control/NEXT-ACTION.md` |
| What broader work remains unopened? | `governance/control/OPEN-SET.md` and this unit's forbidden next-step section |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**

## Last Governance Confirmation

2026-03-22 — `GOV-CLOSE-REALM-BOUNDARY-SHELL-AFFORDANCE-001`. Status transitioned:
`VERIFIED_COMPLETE` -> `CLOSED` after final implementation commit `ddeb579`, verified Vercel
deployment mapping to `https://texqtic-godq32ri1-tex-qtic.vercel.app`, deployed runtime PASS for
B2B workspace crossover, deployed runtime PASS for white-label overlay crossover, preserved
control-plane login PASS to `Tenant Registry`, and mandatory post-close audit result `DECISION`.
Scope remained bounded to the realm-boundary shell-affordance defect only, no broader auth or
impersonation redesign was authorized, and the next governance move is decision-only for
`AUTH-IDENTITY-TRUTH-DEPLOYED-001`.
