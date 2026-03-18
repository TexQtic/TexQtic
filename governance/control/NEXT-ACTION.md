# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)
**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-18 (GOVERNANCE-SEQUENCE-SUPPLIER-RFQ-READS-001)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: TECS-RFQ-SUPPLIER-READ-001
type: IMPLEMENTATION / BACKEND
title: Introduce the first supplier RFQ inbox read API slice
prerequisites_met: true
authorized_by: GOVERNANCE-SEQUENCE-SUPPLIER-RFQ-READS-001
date_authorized: 2026-03-18
notes: |
  PRODUCT-DEC-SUPPLIER-RFQ-READS is DECIDED and authorizes a narrow supplier-side
  RFQ read scope covering inbox list + detail together. TECS-RFQ-SUPPLIER-READ-001
  is the single authorized next action. Scope is backend read-only only:
  supplier RFQ inbox list API, supplier RFQ detail API, supplier_org_id-scoped
  reads, minimal field projection, buyer identity withheld in the first slice,
  buyer-visible lifecycle statuses, and only the minimal search/filter/sort
  authorized by the decision. Excluded: frontend UI, supplier response actions,
  negotiation, pricing, order conversion, checkout, settlement, control-plane
  RFQ views, AI automation, and schema changes unless a separate defect
  requires them.
```
