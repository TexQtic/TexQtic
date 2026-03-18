---
unit_id: TECS-FBW-006-B
title: Escalation Mutations — upgrade / resolve / override
type: IMPLEMENTATION
status: OPEN
wave: W3-residual
plane: BOTH
opened: 2026-03-18
closed: null
verified: null
commit: null
evidence: "BLK-006-B-001 resolved by TECS-FBW-006-B-BE-001 (a2d8bfc · d212d0d) · VERIFY-TECS-FBW-006-B-BE-001 PASS"
doctrine_constraints:
  - D-011: org_id must scope all escalation mutations; no cross-tenant write permitted
  - D-001: RLS must enforce tenant isolation on escalation write path
  - D-002: control-plane escalation override actions must be explicit and audited
  - D-004: one logical unit; frontend wiring is the scope; backend prereq is TECS-FBW-006-B-BE-001
decisions_required:
  - PRODUCT-DEC-ESCALATION-MUTATIONS: DECIDED (2026-03-18, Paresh) — authorized limited, role-differentiated scope
blockers:
  - id: BLK-006-B-001
    type: MISSING_BACKEND_ROUTE
    description: POST /api/tenant/escalations/:id/resolve did not exist; required for tenant resolve product target
    prerequisite_unit: TECS-FBW-006-B-BE-001
    registered: 2026-03-18
    resolved: 2026-03-18
    status: RESOLVED
    resolution_evidence: "a2d8bfc · d212d0d · VERIFY-TECS-FBW-006-B-BE-001 PASS"
---

## Unit Summary

TECS-FBW-006-B covers escalation mutation operations: upgrade, resolve, and override actions
in both the tenant panel and the control-plane oversight view. The parent unit TECS-FBW-006-A
(read-only EscalationsPanel.tsx + EscalationOversight.tsx) is already VERIFIED_COMPLETE.
This B-slice is now OPEN following verified completion of the backend prerequisite unit
TECS-FBW-006-B-BE-001 and resolution of BLK-006-B-001. Product authorization is already
in place via PRODUCT-DEC-ESCALATION-MUTATIONS (DECIDED 2026-03-18).

## Acceptance Criteria

*Active — unit is OPEN. Acceptance criteria below are implementation requirements.*

- [x] Escalation mutation endpoints designed and implemented (server-side)
  (`a2d8bfc` + `d212d0d`; VERIFY-TECS-FBW-006-B-BE-001 PASS)
- [ ] Tenant-plane: escalation upgrade and resolve actions in EscalationsPanel.tsx
- [ ] Control-plane: escalation override action in EscalationOversight.tsx
- [ ] `freezeRecommendation` remains informational-only per D-022-C doctrine
- [ ] org_id-scoped for tenant operations; super-admin scope for control-plane override
- [ ] Override actions audited (D-002)
- [ ] TypeScript type-check passes (EXIT 0)
- [ ] Lint passes (EXIT 0)

## Files Allowlisted (Modify)
*To be defined by the TECS-FBW-006-B implementation prompt.*

## Files Read-Only
- `governance/control/DOCTRINE.md`
- `governance/control/OPEN-SET.md`
- `governance/control/BLOCKED.md`
- `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` (historical reference)

## Evidence Record

- Backend prerequisite resolved by `TECS-FBW-006-B-BE-001`
- Implementation commits: `a2d8bfc` · `d212d0d`
- Verification result: `VERIFY-TECS-FBW-006-B-BE-001` — `PASS`
- Gap Decision: `VERIFIED_COMPLETE`
- BLK-006-B-001 resolved on 2026-03-18

## Governance Closure

- Blocker-resolution governance unit: `GOV-CLOSE-TECS-FBW-006-B-BE-001`
- Status transition: `BLOCKED` → `OPEN`
- Parent unit is implementation-ready; not yet verified or closed

---

## Allowed Next Step

This unit is **OPEN**.

The allowed next step is implementation of the authorized frontend mutation wiring for:
  - Tenant plane: create escalation (POST /api/tenant/escalations, severity 0-1 only)
  - Tenant plane: resolve own escalation (POST /api/tenant/escalations/:id/resolve)
  - Control plane: upgrade severity, resolve, override (all routes exist; frontend wiring only)

Implementation may now proceed under `governance/control/NEXT-ACTION.md`.

## Forbidden Next Step

- Do **not** add mutation controls to EscalationsPanel.tsx or EscalationOversight.tsx
- Do **not** treat TECS-FBW-006-A (read-only views, VERIFIED_COMPLETE) as implementation authorization
- Do **not** implement `freezeRecommendation` as an actionable control — it is informational-only (D-022-C)

## Drift Guards

- Parent TECS-FBW-006-A is VERIFIED_COMPLETE (commit: GOVERNANCE-SYNC-113 area). That is the
  read-only EscalationsPanel.tsx + EscalationOversight.tsx. It does not authorize write operations.
- **Plane distinction critical:** tenant operations must be scoped by org_id (D-011); control-plane
  override actions are super-admin only and must be audited (D-002). Do not merge these two scopes.
- D-022-C: `freezeRecommendation` is informational-only. Any future design must preserve this.
- The tracker records this as "🔵 FUTURE SCOPE" — canonical equivalent: DEFERRED.

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| Is this unit open? | `governance/control/OPEN-SET.md` (listed as OPEN) |
| What was the blocker? | `governance/control/BLOCKED.md` — BLK-006-B-001 resolved 2026-03-18 |
| What doctrine applies? | `governance/control/DOCTRINE.md` (D-010) |
| When can implementation begin? | Immediately — this unit is OPEN via GOV-CLOSE-TECS-FBW-006-B-BE-001 |
| What authorized it? | `governance/decisions/PRODUCT-DECISIONS.md` — PRODUCT-DEC-ESCALATION-MUTATIONS (DECIDED 2026-03-18) |
| Historical context | `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` line ~103 |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**

## Last Governance Confirmation

2026-03-18 — GOV-CLOSE-TECS-FBW-006-B-BE-001. Status transitioned: BLOCKED → OPEN.
