# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)

**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-20 (GOV-CLOSE-TECS-G026-DESIGN-CLARIFICATION-001)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: OPERATOR_DECISION_REQUIRED
type: DECISION_REQUIRED
title: Decide whether to open the bounded texqtic_service cleanup or remediation step
prerequisites_met: true
authorized_by: GOV-DEC-G026-DESIGN-CLARIFICATION-001
date_authorized: 2026-03-20
notes: |
  TECS-G026-H-001 remains CLOSED.
  TECS-G026-DESIGN-CLARIFICATION-001 is now CLOSED.
  The canonical future routing-opening posture for texqtic_service remains
  resolver-only: NOLOGIN, BYPASSRLS, tx-local SET LOCAL ROLE from postgres,
  SELECT-only, and base grants limited to public.tenants + public.tenant_domains.
  The extra SELECT grants on memberships, users, catalog_items, and
  rfq_supplier_responses are classified as separately governed non-routing
  dependencies and must be removed or re-homed before any routing opening may
  be considered.
  Duplicate/equivalent postgres membership rows are non-blocking if they remain
  semantically equivalent and do not widen effective authority.
  The broad bounded G-026 v1 routing stream is not open.
  No routing unit or cleanup implementation unit is authorized by this closure.
  TECS-FBW-ADMINRBAC remains DESIGN_GATE.
  RFQ remains capped at pre-negotiation.
  Forbidden: no broad G-026 opening, no routing opening, no implicit cleanup
  opening, no apex/custom-domain scope, no AdminRBAC opening.
```
