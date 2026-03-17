# DESIGN-DECISIONS.md — Design Decision Ledger

**Layer:** 2 — Decision Ledger
**Authority:** GOV-OS-001-DESIGN.md (Section 3.4)
**Last Updated:** 2026-03-17 (GOV-OS-005 bootstrap)

> This file owns architecture and design decisions that gate implementation of governed units.
> A DESIGN_GATE unit MUST NOT be treated as implementation-ready due to the existence of
> a placeholder entry here. Only `Status: DECIDED` with explicit operator approval — AND
> the corresponding security decision (where required) — constitutes authorization.

---

## Decision Status Vocabulary

| Status | Meaning |
|---|---|
| `OPEN` | Decision is required but not yet made. Unit cannot advance. |
| `DECIDED` | Decision has been formally made with explicit authorization. |
| `SUPERSEDED` | Decision replaced by a later decision. See replacement entry. |

---

### DESIGN-DEC-ADMINRBAC-PRODUCT

Date: null — decision not yet made
Authorized by: null — pending operator decision (Paresh)
Summary: Product and design-architecture must decide whether admin invite and revoke
  operations are in scope, what the exact scope of AdminRBAC is, and what the
  architectural model for admin provisioning should be. This is one of two required
  gate decisions for TECS-FBW-ADMINRBAC (the other is SECURITY-DEC-ADMINRBAC-POSTURE).
Impact: When DECIDED (together with SECURITY-DEC-ADMINRBAC-POSTURE), unblocks TECS-FBW-ADMINRBAC.
  Unit remains DESIGN_GATE until BOTH decisions are DECIDED.
Status: OPEN

**Required For:** TECS-FBW-ADMINRBAC — AdminRBAC Invite and Revoke Authority (control plane)
**Current Known Posture:** Not made. No product scope decision exists for admin invite/revoke.
  PW5-U3 (commit d5ee430, 2026-03-09) applied a dead-button UI stop-gap in AdminRBAC.tsx —
  this is explicitly NOT implementation authorization and does not satisfy this gate.
**Does Not Authorize:** This placeholder entry does not authorize any admin invite logic,
  revoke logic, backend endpoint design, or admin provisioning pathway. TECS-FBW-ADMINRBAC
  remains DESIGN_GATE regardless of this entry's existence. This decision alone (even if
  DECIDED) is insufficient — SECURITY-DEC-ADMINRBAC-POSTURE must also be DECIDED.
**Next Required Step:** Operator (Paresh) formally records this decision here with
  `Status: DECIDED`. SECURITY-DEC-ADMINRBAC-POSTURE must also reach `Status: DECIDED`.
  Only then may a governance unit transition TECS-FBW-ADMINRBAC from DESIGN_GATE → OPEN.
**Last Governance Confirmation:** 2026-03-17 — GOV-OS-005 decision ledger bootstrap.
  Status: OPEN (unresolved). SECURITY counterpart also OPEN.
