# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)

**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-20 (GOV-DEC-G026-CLEANUP-REMEDIATION-OPENING)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: TECS-G026-CLEANUP-REMEDIATION-001
type: IMPLEMENTATION
title: Remove or re-home non-routing texqtic_service dependencies before any routing opening
prerequisites_met: true
authorized_by: GOV-DEC-G026-CLEANUP-REMEDIATION-OPENING
date_authorized: 2026-03-20
notes: |
  TECS-G026-H-001 remains CLOSED.
  TECS-G026-DESIGN-CLARIFICATION-001 is now CLOSED.
  This bounded next step is cleanup or remediation only.
  Remove or re-home the separately governed non-routing texqtic_service
  dependencies on memberships, users, catalog_items, and
  rfq_supplier_responses while preserving the resolver-only target posture:
  NOLOGIN, BYPASSRLS, tx-local SET LOCAL ROLE from postgres, SELECT-only,
  and base grants limited to public.tenants + public.tenant_domains.
  Duplicate/equivalent postgres membership rows are non-blocking if they remain
  semantically equivalent and do not widen effective authority, and should be
  touched only if implementation evidence shows normalization is actually
  required.
  The broad bounded G-026 v1 routing stream is not open.
  No routing unit is authorized by this opening.
  TECS-FBW-ADMINRBAC remains DESIGN_GATE.
  RFQ remains capped at pre-negotiation.
  Forbidden: no broad G-026 opening, no routing opening, no apex/custom-domain
  scope, no DNS-verification scope, no AdminRBAC opening.
```
