# NEXT-ACTION.md — Authorized Next Action (Layer 0 · Max: 20 lines)

**Authority:** GOV-OS-001-DESIGN.md · **Updated:** 2026-03-20 (GOV-DEC-G026-FIRST-ROUTING-OPENING)
> One authorized next action. Read before any work begins. Changing this requires a governance unit.

---

```yaml
unit_id: TECS-G026-V1-PLATFORM-SUBDOMAIN-ROUTING-001
type: IMPLEMENTATION
title: Bounded platform-subdomain runtime routing for <slug>.texqtic.app
prerequisites_met: true
authorized_by: GOV-DEC-G026-FIRST-ROUTING-OPENING
date_authorized: 2026-03-20
notes: |
  TECS-G026-H-001 remains CLOSED.
  TECS-G026-DESIGN-CLARIFICATION-001 is now CLOSED.
  TECS-G026-CLEANUP-REMEDIATION-001 remains CLOSED after the already-recorded
  implementation, verification, governance sync, and closure chain.
  GOV-DEC-G026-FIRST-ROUTING-OPENING-ELIGIBILITY is now DECIDED and permits
  one separate bounded routing opening only.
  This bounded next step is platform-subdomain runtime routing only for
  <slug>.texqtic.app.
  Allowed scope only: internal signed resolver path, host-to-tenant resolution
  for platform subdomains, request-path tenant-context propagation and
  validation required by that bounded runtime path, bounded cache/invalidation
  behavior required by that same path, and safe fallback behavior for
  unresolved platform-subdomain requests.
  The broad bounded G-026 v1 routing stream is not open.
  TECS-FBW-ADMINRBAC remains DESIGN_GATE.
  RFQ remains capped at pre-negotiation.
  Forbidden: no broad G-026 opening, no custom-domain routing, no apex-domain
  routing, no DNS-verification workflow, no broader white-label domain
  lifecycle work, and no AdminRBAC opening.
```
