---
unit_id: TECS-FBW-006-B
title: Escalation Mutations — upgrade / resolve / override
type: IMPLEMENTATION
status: DEFERRED
wave: W3-residual
plane: BOTH
opened: 2026-03-07
closed: null
verified: null
commit: null
evidence: null
doctrine_constraints:
  - D-010: product-deferred; must not be treated as a bug or reopened without product authorization
  - D-011: org_id must scope all escalation mutations; no cross-tenant write permitted
  - D-001: RLS must enforce tenant isolation on escalation write path
  - D-002: control-plane escalation override actions must be explicit and audited
decisions_required:
  - PRODUCT-DEC-ESCALATION-MUTATIONS (not yet made; future product decision required)
blockers: []
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

**Nothing.** This unit is DEFERRED.

The only allowed next step is a **product authorization event** recorded in
`governance/decisions/PRODUCT-DECISIONS.md` (Layer 2 — Decision Ledger), followed by
a governance unit that transitions this unit from DEFERRED → OPEN. Until that authorization
exists in the decision ledger, no implementation work may begin.

## Forbidden Next Step

- Do **not** begin any escalation mutation, upgrade, resolve, or override implementation
- Do **not** add mutation controls to EscalationsPanel.tsx or EscalationOversight.tsx
- Do **not** treat TECS-FBW-006-A (read-only views, VERIFIED_COMPLETE) as authorization for mutations
- Do **not** promote this unit to OPEN or IN_PROGRESS without a product decision record
- Do **not** treat this as a gap or defect — mutation scope was explicitly deferred, not forgotten
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
| When can it be reopened? | After product decision in `governance/decisions/PRODUCT-DECISIONS.md` |
| Historical context | `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` line ~103 |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**

## Last Governance Confirmation

2026-03-17 — GOV-OS-003 Unit Record Migration Batch 1. Status confirmed: DEFERRED.
