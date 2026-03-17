# SECURITY-DECISIONS.md — Security Decision Ledger

**Layer:** 2 — Decision Ledger
**Authority:** GOV-OS-001-DESIGN.md (Section 3.4)
**Last Updated:** 2026-03-17 (GOV-OS-005 bootstrap)

> This file owns security posture decisions (admin boundaries, auth policy, RLS scope) that
> gate governed units. A DESIGN_GATE unit MUST NOT be treated as implementation-ready due to
> the existence of a placeholder entry here. Only `Status: DECIDED` with explicit operator
> approval — AND the corresponding design decision (where required) — constitutes authorization.

---

## Decision Status Vocabulary

| Status | Meaning |
|---|---|
| `OPEN` | Decision is required but not yet made. Unit cannot advance. |
| `DECIDED` | Decision has been formally made with explicit authorization. |
| `SUPERSEDED` | Decision replaced by a later decision. See replacement entry. |

---

## Standing Security Invariants (Non-Negotiable — D-001, D-002)

These are doctrine invariants (DOCTRINE.md), not decisions. They apply to all security decisions:

- DB-level RLS is mandatory. No security decision may waive RLS.
- Admin bypass must be explicit and audited. No security decision may grant silent bypass.
- `org_id` is the canonical tenancy boundary. Cross-tenant data access is forbidden.
- App code never trusts client-supplied tenant identifiers.

Any security decision that contradicts these invariants is void and must not be recorded as DECIDED.

---

### SECURITY-DEC-ADMINRBAC-POSTURE

Date: null — decision not yet made
Authorized by: null — pending operator decision (Paresh)
Summary: A security posture decision must determine the audit model, session requirements,
  role-assignment scope, and RLS implications for admin invite and revoke operations.
  This is one of two required gate decisions for TECS-FBW-ADMINRBAC (the other is
  DESIGN-DEC-ADMINRBAC-PRODUCT).
Impact: When DECIDED (together with DESIGN-DEC-ADMINRBAC-PRODUCT), unblocks TECS-FBW-ADMINRBAC.
  Unit remains DESIGN_GATE until BOTH decisions are DECIDED.
Status: OPEN

**Required For:** TECS-FBW-ADMINRBAC — AdminRBAC Invite and Revoke Authority (control plane)
**Current Known Posture:** Not made. No security posture decision exists for admin provisioning.
  HIGH risk: currently there is no auditable admin provisioning pathway (D-002). PW5-U3
  (commit d5ee430, 2026-03-09) applied a dead-button UI stop-gap — this is NOT authorization.
  Security posture must address: audit trail requirements, invitation expiry, revocation
  propagation to active sessions, RLS enforcement on admin-role assignment.
**Does Not Authorize:** This placeholder entry does not authorize any admin provisioning
  implementation, invite/revoke endpoint, role-assignment logic, or bypass of the audit
  requirement (D-002). TECS-FBW-ADMINRBAC remains DESIGN_GATE regardless of this entry.
  This decision alone (even if DECIDED) is insufficient — DESIGN-DEC-ADMINRBAC-PRODUCT
  must also be DECIDED before any work may begin.
**Next Required Step:** Operator (Paresh) formally records this decision here with
  `Status: DECIDED`, including explicit audit model, session scope, and RLS coverage.
  DESIGN-DEC-ADMINRBAC-PRODUCT must also reach `Status: DECIDED`. Only then may a
  governance unit transition TECS-FBW-ADMINRBAC from DESIGN_GATE → OPEN.
**Last Governance Confirmation:** 2026-03-17 — GOV-OS-005 decision ledger bootstrap.
  Status: OPEN (unresolved). DESIGN counterpart also OPEN.
