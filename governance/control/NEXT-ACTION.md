# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)

**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-22 (TENANT-CATALOG-IMAGE-UPLOAD-GAP-001 decision)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002
type: IMPLEMENTATION
title: Open the bounded placeholder-image DNS/resource implementation unit
prerequisites_met: true
authorized_by: TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-001
date_authorized: 2026-03-22
notes: |
  TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002 is now the sole OPEN implementation unit.
  Scope remains limited to correcting the exact tenant-visible surface currently generating
  `https://via.placeholder.com/400x300` placeholder-image requests in the exercised runtime path.
  TENANT-CATALOG-IMAGE-UPLOAD-GAP-001 is now CLOSED with result OPENING_CANDIDATE only and
  records a separate observed tenant catalog image creation or assignment capability gap.
  That decision does not open implementation, does not widen the placeholder-image DNS unit,
  and does not change the current authorized next action.
  This opening remains explicitly separate from TENANT-EXPERIENCE-RUNTIME-500-002,
  control-plane identity truth, control-plane auth-shell transition, impersonation session
  rehydration, impersonation stop cleanup, broader tenant-shell correctness, broader catalog
  overhaul, white-label behavior, media/CDN/platform redesign, auth redesign, DB/schema work,
  and broader API redesign. No implementation has been executed by this opening operation.
```
