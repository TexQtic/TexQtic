---
unit_id: TECS-FBW-006-B
title: Escalation Mutations — upgrade / resolve / override
type: IMPLEMENTATION
status: VERIFIED_COMPLETE
wave: W3-residual
plane: BOTH
opened: 2026-03-18
closed: 2026-03-18
verified: 2026-03-18
commit: "d6e5e77 · d2e28ff · a5151a6 · 0f2d212 · a4c7fc9"
evidence: "VERIFY-TECS-FBW-006-B PASS · commits d6e5e77 · d2e28ff · a5151a6 · 0f2d212 · a4c7fc9 · GOV-CLOSE-TECS-FBW-006-B"
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
This B-slice is now VERIFIED_COMPLETE following the frontend implementation commit,
corrective remediations, contract-alignment remediation, and final verification PASS.
The backend prerequisite unit TECS-FBW-006-B-BE-001 remains VERIFIED_COMPLETE and
PRODUCT-DEC-ESCALATION-MUTATIONS remains the governing authorization.

## Acceptance Criteria

*Satisfied — unit is VERIFIED_COMPLETE. All criteria met across commits d6e5e77 · d2e28ff · a5151a6 · 0f2d212 · a4c7fc9.*

- [x] Escalation mutation endpoints designed and implemented (server-side)
  (`a2d8bfc` + `d212d0d`; VERIFY-TECS-FBW-006-B-BE-001 PASS)
- [x] Tenant-plane: create and resolve actions implemented in `EscalationsPanel.tsx`
  create limited to severity 0–1 with approved tenant entity types only
  two-phase confirmation preserved; tenant upgrade absent; tenant override absent
- [x] Control-plane: upgrade, resolve, and override actions implemented in `EscalationOversight.tsx`
  override visually distinct; downgrade not implied; override threshold preserved
- [x] `freezeRecommendation` remains informational-only per D-022-C doctrine
- [x] org_id-scoped for tenant operations; super-admin scope for control-plane override
- [x] Override actions audited (D-002)
- [x] Backend truth, service payloads, and governed OpenAPI are aligned
- [x] TypeScript type-check passes (EXIT 0)
- [x] Lint passes (EXIT 0)

## Files Allowlisted (Modify)
*To be defined by the TECS-FBW-006-B implementation prompt.*

## Files Read-Only
- `governance/control/DOCTRINE.md`
- `governance/control/OPEN-SET.md`
- `governance/control/BLOCKED.md`
- `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` (historical reference)

## Evidence Record

- Backend prerequisite resolved by `TECS-FBW-006-B-BE-001`
- Main implementation commit: `d6e5e77` — escalation mutation flows across tenant and control plane
- Corrective UI diagnostics commit: `d2e28ff`
- Duplicate-fix commit: `a5151a6`
- controlPlaneService diagnostics remediation commit: `0f2d212`
- Contract-alignment commit: `a4c7fc9`
- Final verification: `VERIFY-TECS-FBW-006-B` — Result: **PASS** — Gap Decision: **VERIFIED_COMPLETE**
- Verification date: 2026-03-18
- Verified implementation surface: `components/Tenant/EscalationsPanel.tsx` · `components/ControlPlane/EscalationOversight.tsx` · `services/escalationService.ts` · `services/controlPlaneService.ts`
- Verified contract-alignment surface: `shared/contracts/openapi.control-plane.json` · `shared/contracts/openapi.tenant.json`
- No client orgId / tenantId introduced; no freeze or kill-switch UI introduced; no bulk actions introduced
- Backend truth, service payloads, and governed OpenAPI aligned at close

## Governance Closure

- Governance close unit: `GOV-CLOSE-TECS-FBW-006-B` — 2026-03-18
- Status transition: `OPEN` → `VERIFIED_COMPLETE`
- All Layer 0 and Layer 1 files updated by GOV-CLOSE-TECS-FBW-006-B
- Unit is terminal. Do not reopen (D-008).

---

## Allowed Next Step

**This unit is VERIFIED_COMPLETE and closed.** No further action on this unit is authorized (D-008).

The remaining portfolio is: TECS-FBW-013 (DEFERRED) · TECS-FBW-ADMINRBAC (DESIGN_GATE).
An operator decision is required before any further implementation work may begin.

## Forbidden Next Step

- Do **not** reopen this unit (D-008)
- Do **not** treat TECS-FBW-006-A (read-only views, VERIFIED_COMPLETE) as authorization for new escalation work
- Do **not** implement `freezeRecommendation` as an actionable control — it is informational-only (D-022-C)
- Do **not** add tenant upgrade or tenant override surfaces
- Do **not** add freeze / kill-switch UI, bulk actions, or tenant ORG / GLOBAL create options

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
| What is this unit's final status? | `governance/control/OPEN-SET.md` (removed from non-terminal set) |
| What was the blocker? | `governance/control/BLOCKED.md` — BLK-006-B-001 resolved 2026-03-18 |
| What doctrine applies? | `governance/control/DOCTRINE.md` (D-010) |
| What closed it? | `governance/log/EXECUTION-LOG.md` — GOV-CLOSE-TECS-FBW-006-B |
| What authorized it? | `governance/decisions/PRODUCT-DECISIONS.md` — PRODUCT-DEC-ESCALATION-MUTATIONS (DECIDED 2026-03-18) |
| Historical context | `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` line ~103 |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**

## Last Governance Confirmation

2026-03-18 — GOV-CLOSE-TECS-FBW-006-B. TECS-FBW-006-B VERIFIED_COMPLETE and closed.
Status transitioned: OPEN → VERIFIED_COMPLETE. Verification: VERIFY-TECS-FBW-006-B — PASS.
