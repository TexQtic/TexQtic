# governance/units/ — Unit Record Layer

This directory is **Layer 1** of the TexQtic Governance OS (defined in GOV-OS-001).
Each file is a canonical unit record for one governed work unit.

---

## Control-Plane Read Order (Mandatory)

**Before reading or acting on any unit file, always read Layer 0 first:**

1. `governance/control/DOCTRINE.md` — active doctrine invariants
2. `governance/control/OPEN-SET.md` — current open portfolio (exact, controlled)
3. `governance/control/NEXT-ACTION.md` — exactly one authorized next action
4. `governance/control/BLOCKED.md` — blockers, deferred units, design gates
5. `governance/control/SNAPSHOT.md` — carry-forward session context

Unit files refine unit-specific truth only. They do not supersede Layer 0 control-plane files.

---

## Unit Index

| Unit ID | Title | Status | Plane |
|---|---|---|---|
| TECS-FBW-002-B | Trades Tenant Panel — backend route prerequisite | BLOCKED | TENANT |
| TECS-FBW-003-B | Escrow Mutations and Detail View — future scope | DEFERRED | TENANT |
| TECS-FBW-006-B | Escalation Mutations — upgrade / resolve / override | DEFERRED | BOTH |
| TECS-FBW-013 | B2B Request Quote — product decision + backend | DEFERRED | TENANT |
| TECS-FBW-ADMINRBAC | AdminRBAC Invite and Revoke Authority | DESIGN_GATE | CONTROL |

---

## Controlled Status Vocabulary

| Status | Meaning |
|---|---|
| OPEN | Scoped, not started |
| IN_PROGRESS | Authorized, implementation active (max one at a time) |
| BLOCKED | Cannot proceed; external dependency unresolved |
| DEFERRED | Product-deferred; not a defect; requires product authorization |
| DESIGN_GATE | Requires formal design/security decision before any work |
| VERIFICATION_REQUIRED | Implementation done; awaiting verification |
| VERIFIED_COMPLETE | Verified; acceptance criteria met; evidence recorded |
| CLOSED | Formally closed; no re-opening without governance record |

---

*Layer model and schema defined in `docs/governance/control/GOV-OS-001-DESIGN.md`*
*Layer 0 control plane bootstrapped in GOV-OS-002 (SHA: 1c0669c)*
*This directory bootstrapped in GOV-OS-003*
