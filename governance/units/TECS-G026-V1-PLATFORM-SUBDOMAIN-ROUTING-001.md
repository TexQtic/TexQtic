---
unit_id: TECS-G026-V1-PLATFORM-SUBDOMAIN-ROUTING-001
title: Bounded platform-subdomain runtime routing for <slug>.texqtic.app
type: IMPLEMENTATION
status: OPEN
wave: W4
plane: BACKEND
opened: 2026-03-20
closed: null
verified: null
commit: null
evidence: null
prerequisite_for: First bounded G-026 v1 routing implementation slice only
doctrine_constraints:
  - D-004: this is one bounded platform-subdomain routing slice only; no broader domain scope may be mixed in
  - D-006: governance control-plane files may change only in the later governance sync / close steps
  - D-011: no tenant-boundary weakening; runtime routing must preserve canonical org_id isolation
  - D-007: this unit must not broaden into custom-domain, apex-domain, or DNS-verification work
decisions_required:
  - GOV-DEC-G026-FIRST-ROUTING-OPENING-ELIGIBILITY: DECIDED (2026-03-20, Paresh)
  - GOV-DEC-G026-FIRST-ROUTING-OPENING: DECIDED (2026-03-20, Paresh)
blockers: []
---

## Unit Summary

`TECS-G026-V1-PLATFORM-SUBDOMAIN-ROUTING-001` is the sole bounded first routing unit for G-026.

It is limited to bounded platform-subdomain runtime routing only for `<slug>.texqtic.app`.

This unit does not open the broad G-026 stream. It does not authorize custom-domain routing,
apex-domain routing, DNS-verification workflow, or broader white-label domain lifecycle work.

## Acceptance Criteria

- [ ] The bounded runtime path supports host-to-tenant resolution for `<slug>.texqtic.app` only
- [ ] The internal signed resolver path required by the bounded platform-subdomain runtime path is present and limited to this routing slice
- [ ] Request-path tenant-context propagation and validation required by the bounded runtime path is present and limited to this routing slice
- [ ] Bounded cache/invalidation behavior required by the same platform-subdomain runtime path is present and limited to this routing slice
- [ ] Safe fallback behavior for unresolved platform-subdomain requests is present and bounded to this runtime path
- [ ] No custom-domain, apex-domain, or DNS-verification workflow scope is introduced
- [ ] No broader white-label domain lifecycle work is introduced
- [ ] No broad G-026 opening is introduced

## Files Allowlisted (Modify)

*To be defined by the TECS-G026-V1-PLATFORM-SUBDOMAIN-ROUTING-001 implementation prompt.*

Expected candidates for the future implementation prompt only:

- `middleware.ts` — only if required for the bounded platform-subdomain runtime path
- `server/src/routes/internal/resolveDomain.ts` — only if required for the bounded internal signed resolver path
- `server/src/hooks/tenantResolutionHook.ts` — only if required for bounded tenant-context propagation/validation on the runtime path
- `server/src/routes/internal/cacheInvalidate.ts` — only if required for bounded cache/invalidation behavior on the same runtime path
- `server/src/index.ts` — only if required to wire the bounded runtime path and no broader scope
- governance files only in later governance sync / close steps

## Files Read-Only

- `governance/control/DOCTRINE.md`
- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/BLOCKED.md`
- `governance/control/SNAPSHOT.md`
- `governance/decisions/GOV-DEC-G026-FIRST-ROUTING-OPENING-ELIGIBILITY.md`
- `governance/decisions/GOV-DEC-G026-FIRST-ROUTING-OPENING.md`
- `governance/decisions/GOV-DEC-G026-DESIGN-CLARIFICATION-001.md`
- `governance/decisions/GOV-DEC-G026-CLEANUP-REMEDIATION-OPENING.md`
- `governance/units/TECS-G026-CLEANUP-REMEDIATION-001.md`
- `docs/architecture/CUSTOM-DOMAIN-ROUTING-DESIGN.md`

## Evidence Record

- Opening decision: `GOV-DEC-G026-FIRST-ROUTING-OPENING`
- Eligibility decision: `GOV-DEC-G026-FIRST-ROUTING-OPENING-ELIGIBILITY`
- Prior prerequisite unit: `TECS-G026-H-001` remains `CLOSED`
- Prior clarification unit: `TECS-G026-DESIGN-CLARIFICATION-001` remains `CLOSED`
- Prior cleanup/remediation unit: `TECS-G026-CLEANUP-REMEDIATION-001` remains `CLOSED`
- This unit exists because the prerequisite and remediation chain is now closed and one bounded platform-subdomain runtime routing slice has been judged governance-eligible

## Allowed Next Step

Bounded implementation work for this routing unit only.

## Forbidden Next Step

- Do **not** open the broad G-026 v1 routing stream in this unit
- Do **not** add custom-domain routing in this unit
- Do **not** add apex-domain routing in this unit
- Do **not** add DNS-verification workflow in this unit
- Do **not** broaden into broader white-label domain lifecycle work in this unit
- Do **not** reopen `TECS-G026-H-001`, `TECS-G026-DESIGN-CLARIFICATION-001`, or `TECS-G026-CLEANUP-REMEDIATION-001`
- Do **not** couple this unit to RFQ, AdminRBAC, DPP, AI, settlement, or money-movement work

## Drift Guards

- This unit is platform-subdomain runtime-routing only. If work requires custom domains, apex domains, or DNS verification, stop and return to governance rather than widening scope implicitly.
- Broad G-026 remains unopened while this unit is active.
- Any later broader domain-scope question must be separately governed and must not be inferred from this unit.

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| Why is this unit open now? | `governance/decisions/GOV-DEC-G026-FIRST-ROUTING-OPENING.md` |
| Why is this routing slice allowed now? | `governance/decisions/GOV-DEC-G026-FIRST-ROUTING-OPENING-ELIGIBILITY.md` |
| What broader stream remains unopened? | bounded G-026 v1 platform-subdomain routing beyond this first slice |
| What is the single authorized next action? | `governance/control/NEXT-ACTION.md` |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**