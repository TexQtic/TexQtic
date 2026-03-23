# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)

**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-23 (TENANT-CATALOG-IMAGE-UPLOAD-GAP-002 close)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002
type: VERIFICATION
title: Verify the bounded placeholder-image DNS/resource failure unit on the exercised tenant catalog-card surface
prerequisites_met: true
authorized_by: TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-001
date_authorized: 2026-03-23
notes: |
  TENANT-CATALOG-IMAGE-UPLOAD-GAP-002 is now CLOSED after production verification PASS on the
  bounded image-capability slice only. The exercised add-item flow exposed the Image URL control,
  accepted a lawful non-empty image URL, persisted imageUrl in tenant API results, and rendered a
  real catalog-card image from the stored value.
  TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002 remains OPEN and unchanged in scope as the active open
  stream for the separate placeholder-image DNS/resource failure on the exact tenant-visible
  catalog-card surface. The newly closed image-capability unit likely provides the positive-control
  runtime path needed to finish the still-open placeholder-image DNS verification stream, but the
  two units remain strictly separate and neither widens the other by implication.
```
