# NEXT-ACTION.md — Layer 0 Next-Action Pointer (Layer 0 · Max: 20 lines)

**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-31 (PRODUCT-MODAL-IMAGE-EDIT-CAPABILITY-GAP opening)
> This file is a Layer 0 governance-facing pointer. It does not originate general product execution sequencing. Changing this requires a governance unit.

---

```yaml
mode: DERIVED_PRODUCT_TRUTH_POINTER
governance_exception_active: false
product_delivery_priority: PRODUCT-MODAL-IMAGE-EDIT-CAPABILITY-GAP
product_delivery_title: Shared catalog edit modal image update gap
product_delivery_status: OPEN
product_truth_sources: docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v2.md, docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v2.md
layer_0_action: PRODUCT-MODAL-IMAGE-EDIT-CAPABILITY-GAP is now the sole current product-facing ACTIVE_DELIVERY; future work must remain bounded to adding image update capability to the existing shared catalog edit modal and its directly coupled update path only.
notes: |
  Repo truth narrows the newly surfaced issue to one exact shared edit-modal gap: App.tsx exposes
  Edit in enterprise catalog cards and WL_ADMIN Products, but the shared modal, client contract,
  and tenant PATCH route do not currently accept or persist imageUrl updates. WL storefront detail
  remains a shopper surface with no edit affordance and is explicitly out of scope for this unit.
```
