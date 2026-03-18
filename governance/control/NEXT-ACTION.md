# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)
**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-18 (GOVERNANCE-SEQUENCE-RFQ-DOMAIN-001)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: TECS-RFQ-DOMAIN-001
type: IMPLEMENTATION / BACKEND-SCHEMA
title: Introduce RFQ domain persistence as the first implementation-ready follow-on unit
prerequisites_met: true
authorized_by: GOVERNANCE-SEQUENCE-RFQ-DOMAIN-001
date_authorized: 2026-03-18
notes: |
  PRODUCT-DEC-RFQ-DOMAIN-MODEL is DECIDED and authorizes the canonical RFQ
  domain model. TECS-RFQ-DOMAIN-001 is the single authorized next action.
  Scope is backend/schema persistence only: canonical rfqs table, rfq_status
  enum, existing RFQ create-path persistence, direct supplier derivation from
  the catalog item owner, and preservation of rfq.RFQ_INITIATED.
  Excluded: frontend surfaces, seller responses, threads, negotiation, pricing,
  order conversion, checkout, settlement, control-plane RFQ workflows,
  multi-supplier routing, and AI automation.
```
