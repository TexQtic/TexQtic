# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)

**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-23 (TENANT-CATALOG-IMAGE-UPLOAD-GAP-002 opening)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: TENANT-CATALOG-IMAGE-UPLOAD-GAP-002
type: IMPLEMENTATION
title: Open the bounded tenant catalog image upload or assignment implementation unit
prerequisites_met: true
authorized_by: TENANT-CATALOG-IMAGE-UPLOAD-GAP-001
date_authorized: 2026-03-23
notes: |
  TENANT-CATALOG-IMAGE-UPLOAD-GAP-002 is now OPEN as one additional bounded implementation unit.
  Scope remains limited to the exercised tenant catalog add-item flow and the minimum directly
  coupled capability needed for a tenant user to attach, upload, or assign an image and save a
  non-empty image reference in that flow.
  TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002 remains OPEN and unchanged in scope as the separate
  placeholder-image DNS/resource failure stream on the exact tenant-visible catalog-card surface.
  TENANT-CATALOG-IMAGE-UPLOAD-GAP-001 remains CLOSED with result OPENING_CANDIDATE only and is
  the opening authority for this new unit. This opening remains explicitly separate from
  TENANT-EXPERIENCE-RUNTIME-500-002, control-plane identity truth, control-plane auth-shell
  transition, impersonation session rehydration, impersonation stop cleanup, broader tenant-shell
  correctness, broader catalog overhaul, white-label behavior, media/CDN/platform redesign, auth
  redesign, DB/schema work, and broader API redesign. No implementation has been executed by this
  opening operation.
```
