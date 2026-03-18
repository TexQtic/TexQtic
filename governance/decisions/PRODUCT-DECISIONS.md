# PRODUCT-DECISIONS.md — Product Decision Ledger

**Layer:** 2 — Decision Ledger
**Authority:** GOV-OS-001-DESIGN.md (Section 3.4)
**Last Updated:** 2026-03-18 (GOV-RECORD-PRODUCT-DEC-B2B-QUOTE)

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

Date: 2026-03-18
Authorized by: Paresh
Status: DECIDED
Summary: TECS-FBW-006-B is product-authorized for limited, role-differentiated escalation
  mutation scope.

  Authorized target scope:

  Tenant plane:
    - create root escalation via POST /api/tenant/escalations
        - severity levels 0-1 only
        - entity types limited to TRADE | ESCROW | APPROVAL | LIFECYCLE_LOG
        - tenant-scoped only (org_id derived from JWT; D-011 mandatory)
        - two-phase confirmation required
    - tenant resolution of own escalation is authorized as a product target,
      but may not be implemented unless the required tenant-plane backend route
      is first established through governance-approved sequencing

  Control plane:
    - upgrade severity
    - resolve
    - override
    - restricted to platform roles per control-plane posture
    - override remains explicitly audited and reason-required (D-002)

  Excluded:
    - freezeRecommendation as an actionable control (D-022-C: forever informational-only)
    - kill-switch / freeze toggle
    - tenant upgrade
    - tenant override
    - tenant LEVEL 2-4 escalation creation
    - tenant ORG / GLOBAL entity types
    - bulk / batch / cross-org actions

  Constitutional constraints remain mandatory and unchanged:
    - D-017-A: tenantId derived from JWT only; never from request body
    - D-011: org_id is the canonical tenancy boundary; cannot be weakened
    - D-022-A, D-022-B, D-022-C, D-022-D: escalation doctrine invariants
    - D-002: control-plane override actions must be explicit and audited

  Sequencing note:
    This decision authorizes the product scope only.
    Governance must next determine whether TECS-FBW-006-B can open with an
    existing-route-first slice, or whether a backend prerequisite sub-unit must
    be installed before implementation opens. TECS-FBW-006-B status is NOT changed
    by this decision record alone — a subsequent governance sequencing unit must
    make that determination explicitly.

Impact: Product scope authorized. TECS-FBW-006-B remains DEFERRED until a governance
  sequencing unit determines the correct next step (narrowed first slice vs. backend
  prerequisite sub-unit installation).

**Required For:** TECS-FBW-006-B — Escalation Mutations (upgrade / resolve / override) (BOTH planes)
**Authorizes:** Limited, role-differentiated escalation mutation scope as defined above.
  Tenant create (severity 0-1, restricted entity types) and control-plane upgrade / resolve /
  override are the authorized surfaces. Tenant resolve is authorized as a product target
  only — sequencing-dependent on backend route availability.
**Does Not Authorize:** This decision does not directly open TECS-FBW-006-B. A governance
  sequencing unit must follow to determine whether the unit opens with a narrowed
  existing-route-first slice, or whether a backend prerequisite sub-unit is required first.
**Last Governance Confirmation:** 2026-03-18 — GOV-RECORD-PRODUCT-DEC-ESCALATION-MUTATIONS.
  Status: DECIDED.

---

### PRODUCT-DEC-B2B-QUOTE

Date: 2026-03-18
Authorized by: Paresh
Status: DECIDED
Summary: TECS-FBW-013 is authorized for limited tenant-plane B2B quote scope only.

  Authorized scope:
    - buyer-initiated RFQ submission from the existing B2B Request Quote CTA
    - org_id-scoped, auditable backend route for RFQ submission
    - corresponding frontend activation only after that route exists
    - quote semantics are non-binding RFQ initiation only

  Excluded:
    - seller negotiation workflows
    - counter-offers
    - multi-round negotiation loops
    - compliance progression
    - order conversion
    - checkout
    - settlement
    - AI-autonomous quote decisions
    - control-plane quote actions
    - public or cross-tenant quote actions

  Constraints:
    - authenticated tenant users only
    - org_id scoping mandatory
    - auditable human-triggered submission only
    - no auto-promotion from DEFERRED to OPEN in this decision record

Impact: Product scope authorized only. This decision does not itself open TECS-FBW-013.
  Future sequencing must determine whether a backend prerequisite unit is needed before the
  parent can move beyond DEFERRED.

**Required For:** TECS-FBW-013 — B2B Request Quote, product decision + backend (tenant plane)
**Authorizes:** Limited tenant-plane B2B quote scope only: buyer-initiated RFQ submission,
  an org_id-scoped auditable backend submission route, and frontend activation only after the
  route exists. Quote semantics are non-binding RFQ initiation only.
**Does Not Authorize:** This decision does not directly open TECS-FBW-013, does not change
  any Layer 0 sequencing state, and does not authorize seller negotiation workflows,
  counter-offers, multi-round negotiation loops, compliance progression, order conversion,
  checkout, settlement, AI-autonomous quote decisions, or any control-plane, public, or
  cross-tenant quote actions.
**Next Required Step:** A future governance sequencing unit must determine whether a backend
  prerequisite unit is required before TECS-FBW-013 can move beyond DEFERRED.
**Last Governance Confirmation:** 2026-03-18 — GOV-RECORD-PRODUCT-DEC-B2B-QUOTE.
  Status: DECIDED.
