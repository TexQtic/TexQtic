# PRODUCT-DECISIONS.md — Product Decision Ledger

**Layer:** 2 — Decision Ledger
**Authority:** GOV-OS-001-DESIGN.md (Section 3.4)
**Last Updated:** 2026-03-18 (GOV-RECORD-PRODUCT-DEC-ESCROW-MUTATIONS)

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

Date: 2026-03-18
Authorized by: Paresh
Status: DECIDED
Summary: TECS-FBW-003-B is authorized for implementation with full mutation scope.
  The unit covers frontend wiring of all existing G-018 backend endpoints:
  detail view, create escrow account, record transaction, and lifecycle transition.
  The backend (G-018) is already implemented and tested; this unit is frontend-only.
  Authorized surfaces:
    - GET  /api/tenant/escrows/:escrowId          — detail view with derived balance
    - POST /api/tenant/escrows                    — create escrow account (DRAFT initial state)
    - POST /api/tenant/escrows/:escrowId/transactions — record ledger entry
        Entry types: HOLD, RELEASE, REFUND available to normal tenant operations users.
        ADJUSTMENT restricted to elevated tenant role (tenant-admin or designated ops authority).
        aiTriggered must remain false in this unit (no AI integration).
    - POST /api/tenant/escrows/:escrowId/transition — lifecycle transition
        Frontend must handle all four result states:
        APPLIED / PENDING_APPROVAL / ESCALATION_REQUIRED / DENIED.
  Constitutional constraints (remain mandatory — not altered by this decision):
    - D-017-A: tenantId derived from JWT only; never from request body.
    - D-020-B: balance displayed only as server-derived value; no stored balance.
    - D-020-C: aiTriggered=false enforced in this unit; escrow-strict AI gate not exercised.
    - D-022-B/C: ENTITY_FROZEN error must be handled gracefully in frontend.
    - G-021: PENDING_APPROVAL result must surface "awaiting approval" feedback in UI.
    - Audit: server writes audit atomically; no frontend audit work required.
  Excluded:
    - EscrowAdminPanel.tsx and control-plane escrow surfaces (read-only; separate future unit).
    - Control-plane escrow transitions.
    - aiTriggered=true mutation paths.
Impact: TECS-FBW-003-B transitions DEFERRED → OPEN. Implementation may now proceed.

**Required For:** TECS-FBW-003-B — Escrow Mutations and Detail View (tenant plane)
**Authorizes:** Full frontend wiring of G-018 tenant escrow mutation surfaces.
  Frontend-only unit; no new backend endpoints required.
**Last Governance Confirmation:** 2026-03-18 — GOV-RECORD-PRODUCT-DEC-ESCROW-MUTATIONS.
  Status: DECIDED.

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
