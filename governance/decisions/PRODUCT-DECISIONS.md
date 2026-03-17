# PRODUCT-DECISIONS.md — Product Decision Ledger

**Layer:** 2 — Decision Ledger
**Authority:** GOV-OS-001-DESIGN.md (Section 3.4)
**Last Updated:** 2026-03-17 (GOV-OS-005 bootstrap)

> This file owns all product scope decisions that gate governed units.
> A DEFERRED unit MUST NOT be treated as implementation-ready due to the existence of
> a placeholder entry here. Only `Status: DECIDED` with explicit operator approval
> constitutes authorization. The unit's own record and Layer 0 must then be updated.

---

## Decision Status Vocabulary

| Status | Meaning |
|---|---|
| `OPEN` | Decision is required but not yet made. Unit cannot advance. |
| `DECIDED` | Decision has been formally made with explicit authorization. |
| `SUPERSEDED` | Decision replaced by a later decision. See replacement entry. |

---

### PRODUCT-DEC-ESCROW-MUTATIONS

Date: null — decision not yet made
Authorized by: null — pending operator decision (Paresh)
Summary: Product must decide whether escrow mutation actions (write, update, status change)
  are in scope. The read-only EscrowPanel.tsx (003-A) is VERIFIED_COMPLETE and does not
  authorize write operations.
Impact: Unblocks TECS-FBW-003-B when DECIDED/approved. Unit remains DEFERRED until then.
Status: OPEN

**Required For:** TECS-FBW-003-B — Escrow Mutations and Detail View (tenant plane)
**Current Known Posture:** Not made. Escrow mutations are explicitly future scope. 003-A
  read-only view is complete; it does not constitute authorization for any write path.
**Does Not Authorize:** This placeholder entry does not authorize any escrow mutation
  implementation, escrow detail view, or write path to any escrow-affecting endpoint.
  TECS-FBW-003-B remains DEFERRED regardless of this entry's existence.
**Next Required Step:** Operator (Paresh) formally records a product decision here with
  `Status: DECIDED`, then a governance unit must transition TECS-FBW-003-B from
  DEFERRED → OPEN in its unit record and in `governance/control/OPEN-SET.md`.
**Last Governance Confirmation:** 2026-03-17 — GOV-OS-005 decision ledger bootstrap.
  Status: OPEN (unresolved).

---

### PRODUCT-DEC-ESCALATION-MUTATIONS

Date: null — decision not yet made
Authorized by: null — pending operator decision (Paresh)
Summary: Product must decide whether escalation mutation actions (upgrade, resolve, override)
  are in scope. The read-only EscalationsPanel.tsx + EscalationOversight.tsx (006-A) are
  VERIFIED_COMPLETE and do not authorize write operations.
Impact: Unblocks TECS-FBW-006-B when DECIDED/approved. Unit remains DEFERRED until then.
Status: OPEN

**Required For:** TECS-FBW-006-B — Escalation Mutations (upgrade / resolve / override) (BOTH planes)
**Current Known Posture:** Not made. Escalation mutations are explicitly future scope.
  D-022-C: `freezeRecommendation` is informational-only in current implementation. 006-A
  read-only views are complete; they do not constitute authorization for any mutation path.
**Does Not Authorize:** This placeholder entry does not authorize any escalation mutation
  (upgrade, resolve, override), control-plane override logic, or tenant-plane escalation
  write path. TECS-FBW-006-B remains DEFERRED regardless of this entry's existence.
**Next Required Step:** Operator (Paresh) formally records a product decision here with
  `Status: DECIDED`, then a governance unit must transition TECS-FBW-006-B from
  DEFERRED → OPEN in its unit record and in `governance/control/OPEN-SET.md`.
**Last Governance Confirmation:** 2026-03-17 — GOV-OS-005 decision ledger bootstrap.
  Status: OPEN (unresolved).

---

### PRODUCT-DEC-B2B-QUOTE

Date: null — decision not yet made
Authorized by: null — pending operator decision (Paresh)
Summary: Product must decide whether the B2B Request Quote flow is in scope, and if so, what
  the exact scope (backend route, frontend activation, pricing model) is. The UI currently
  shows a visually disabled button that **must remain in place** until this decision is made.
Impact: Unblocks TECS-FBW-013 when DECIDED/approved. Unit remains DEFERRED until then.
Status: OPEN

**Required For:** TECS-FBW-013 — B2B Request Quote, product decision + backend (tenant plane)
**Current Known Posture:** Not made. B2B Quote is product-deferred, not a defect. The
  disabled UI button is an intentional holding pattern (D-010) — it must not be removed.
**Does Not Authorize:** This placeholder entry does not authorize implementing the quote
  request backend, activating the UI quote button, or removing the disabled button.
  TECS-FBW-013 remains DEFERRED regardless of this entry's existence.
**Next Required Step:** Operator (Paresh) formally records a product decision here with
  `Status: DECIDED`, then a governance unit must transition TECS-FBW-013 from
  DEFERRED → OPEN in its unit record and in `governance/control/OPEN-SET.md`.
**Last Governance Confirmation:** 2026-03-17 — GOV-OS-005 decision ledger bootstrap.
  Status: OPEN (unresolved).
