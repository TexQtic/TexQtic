# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)
**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-18 (GOVERNANCE-SEQUENCE-BUYER-RFQ-READS-001)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: TECS-RFQ-READ-001
type: IMPLEMENTATION / BACKEND
title: Introduce the first buyer RFQ read API slice
prerequisites_met: true
authorized_by: GOVERNANCE-SEQUENCE-BUYER-RFQ-READS-001
date_authorized: 2026-03-18
notes: |
  PRODUCT-DEC-BUYER-RFQ-READS is DECIDED and authorizes a narrow buyer-side
  RFQ read scope covering tenant-plane list + detail together. TECS-RFQ-READ-001
  is the single authorized next action. Scope is backend read-only only:
  buyer RFQ list API, buyer RFQ detail API, org_id-scoped reads, minimal
  field projection, buyer-visible lifecycle statuses, and only the minimal
  search/filter/sort authorized by the decision. Excluded: frontend UI,
  supplier inbox, supplier response actions, negotiation, pricing, order
  conversion, checkout, settlement, control-plane RFQ views, AI automation,
  and schema changes unless a separate defect requires them.
```
