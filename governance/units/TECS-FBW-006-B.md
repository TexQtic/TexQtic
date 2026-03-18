---
unit_id: TECS-FBW-006-B
title: Escalation Mutations — upgrade / resolve / override
type: IMPLEMENTATION
status: BLOCKED
wave: W3-residual
plane: BOTH
opened: null
closed: null
verified: null
commit: null
evidence: null
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
    description: POST /api/tenant/escalations/:id/resolve does not exist; required for tenant resolve product target
    prerequisite_unit: TECS-FBW-006-B-BE-001
    registered: 2026-03-18
    status: OPEN
---

## Unit Summary

TECS-FBW-006-B covers escalation mutation operations: upgrade, resolve, and override actions
in both the tenant panel and the control-plane oversight view. The parent unit TECS-FBW-006-A
(read-only EscalationsPanel.tsx + EscalationOversight.tsx) is already VERIFIED_COMPLETE.
This B-slice is intentionally deferred to future scope. It must not be implemented until
explicit product authorization is granted.

## Acceptance Criteria

*Not yet active — unit is DEFERRED. Acceptance criteria will be defined when product authorizes.*

Expected future criteria (illustrative only; do not treat as active work):
- [ ] Escalation mutation endpoints designed and implemented (server-side)
- [ ] Tenant-plane: escalation upgrade and resolve actions in EscalationsPanel.tsx
- [ ] Control-plane: escalation override action in EscalationOversight.tsx
- [ ] `freezeRecommendation` remains informational-only per D-022-C doctrine
- [ ] org_id-scoped for tenant operations; super-admin scope for control-plane override
- [ ] Override actions audited (D-002)
- [ ] TypeScript type-check passes (EXIT 0)
- [ ] Lint passes (EXIT 0)

## Files Allowlisted (Modify)
*Not yet defined — pending product authorization.*

## Files Read-Only
- `governance/control/DOCTRINE.md`
- `governance/control/OPEN-SET.md`
- `governance/control/BLOCKED.md`
- `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` (historical reference)

## Evidence Record
*Not yet recorded — unit is DEFERRED.*

## Governance Closure
*Not yet set — unit is DEFERRED and not implementation-ready.*

---

## Allowed Next Step

This unit is **BLOCKED** pending `TECS-FBW-006-B-BE-001` (OPEN).

The only allowed next step is for `TECS-FBW-006-B-BE-001` to reach `VERIFIED_COMPLETE`.
After that, a governance closure unit must transition this unit from BLOCKED → OPEN and
update Layer 0 accordingly. Implementation may not begin until that transition is recorded.

Product authorization is already in place: PRODUCT-DEC-ESCALATION-MUTATIONS (DECIDED, 2026-03-18).
The authorized scope when this unit opens:
  - Tenant plane: create escalation (POST /api/tenant/escalations, severity 0-1 only)
  - Tenant plane: resolve own escalation (POST /api/tenant/escalations/:id/resolve)
  - Control plane: upgrade severity, resolve, override (all routes exist; frontend wiring only)

## Forbidden Next Step

- Do **not** begin any frontend mutation wiring until TECS-FBW-006-B-BE-001 is VERIFIED_COMPLETE
- Do **not** add mutation controls to EscalationsPanel.tsx or EscalationOversight.tsx
- Do **not** treat TECS-FBW-006-A (read-only views, VERIFIED_COMPLETE) as implementation authorization
- Do **not** promote this unit to OPEN or IN_PROGRESS without BLK-006-B-001 resolved
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
| Is this unit open? | `governance/control/OPEN-SET.md` (listed as DEFERRED) |
| Why is it deferred? | `governance/control/BLOCKED.md` — Section 2 |
| What doctrine applies? | `governance/control/DOCTRINE.md` (D-010) |
| When can it open? | After TECS-FBW-006-B-BE-001 reaches VERIFIED_COMPLETE and a governance closure unit transitions BLOCKED → OPEN |
| What authorized it? | `governance/decisions/PRODUCT-DECISIONS.md` — PRODUCT-DEC-ESCALATION-MUTATIONS (DECIDED 2026-03-18) |
| Historical context | `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` line ~103 |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**

## Last Governance Confirmation

2026-03-17 — GOV-OS-003 Unit Record Migration Batch 1. Status confirmed: DEFERRED.
