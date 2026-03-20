# GOV-DEC-G026-CLEANUP-REMEDIATION-OPENING

Decision ID: GOV-DEC-G026-CLEANUP-REMEDIATION-OPENING
Title: Open one bounded G-026 cleanup or remediation unit for non-routing texqtic_service dependencies and no routing work
Status: DECIDED
Date: 2026-03-20
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- `TECS-G026-H-001` is `CLOSED`
- `TECS-G026-DESIGN-CLARIFICATION-001` is `CLOSED`
- the broad G-026 v1 routing stream remains unopened
- `NEXT-ACTION` is `OPERATOR_DECISION_REQUIRED`
- the canonical future routing-opening posture for `texqtic_service` remains resolver-only

The completed clarification decision also established that:

- the extra `SELECT` grants on `memberships`, `users`, `catalog_items`, and
  `rfq_supplier_responses` are inconsistent with the future routing-opening target posture
- those grants reflect separately governed non-routing dependencies that must be removed or
  re-homed before any future routing opening may be considered
- duplicate/equivalent `postgres` membership rows are non-blocking unless later evidence shows
  materially broader effective authority
- a separate bounded cleanup or remediation step is required before any routing opening can be
  considered

That means the next truthful move is no longer design clarification. It is one bounded cleanup or
remediation opening only.

## Problem Statement

TexQtic now needs one implementation-ready governed step that remediates the non-routing
`texqtic_service` dependencies identified by the completed clarification, while preserving the
resolver-only target posture and without opening any routing work.

Without this opening, governance would know the blocker precisely but still have no bounded unit
authorized to remove it.

## Decision

TexQtic opens exactly one bounded cleanup or remediation unit:

- `TECS-G026-CLEANUP-REMEDIATION-001`
- title: `Remove or re-home non-routing texqtic_service dependencies before any routing opening`

This is the sole authorized next governed unit for G-026.

The broad G-026 routing stream remains unopened.

No routing unit is opened by this decision.

## Exact In-Scope Boundary

The opened unit is limited to remediation of non-routing `texqtic_service` dependencies tied to:

- `memberships`
- `users`
- `catalog_items`
- `rfq_supplier_responses`

The unit may include only:

- removal or re-homing of the public by-email path's dependency on `texqtic_service`
- removal or re-homing of the RFQ helper read paths' dependency on `texqtic_service`
- retirement of the extra `SELECT` grants on the four non-routing tables once those paths no longer
  depend on them
- preservation of the base resolver posture on `public.tenants` and `public.tenant_domains`
- preservation of transaction-local `postgres` role assumption needed by the bounded resolver path
- duplicate/equivalent `postgres` membership row handling only if implementation evidence shows
  normalization is actually required to preserve the clarified posture

## Exact Out-of-Scope Boundary

This decision does **not** authorize:

- broad G-026 opening
- any routing implementation unit
- resolver endpoint, Edge middleware, cache, invalidation, or WL domains implementation work
- custom-domain, apex-domain, or DNS-verification scope
- reopening `TECS-G026-H-001`
- treating the discrepancy as already resolved before implementation and verification occur
- product code outside the bounded remediation surface

## Implementation Authorization Statement

This decision authorizes exactly one bounded cleanup or remediation unit only:

- `TECS-G026-CLEANUP-REMEDIATION-001`

It does **not** authorize routing work.

## Consequences

- Layer 0 now has exactly one G-026 implementation-ready unit as the authorized next action
- `NEXT-ACTION` moves from `OPERATOR_DECISION_REQUIRED` to `TECS-G026-CLEANUP-REMEDIATION-001`
- broad G-026 remains held and unopened
- any future routing opening question remains blocked until this remediation unit is implemented,
  verified, governance-synced, and closed

## Sequencing Impact

- `OPEN-SET.md` must show the new bounded remediation unit as `OPEN`
- `NEXT-ACTION.md` must point to `TECS-G026-CLEANUP-REMEDIATION-001`
- `SNAPSHOT.md` must reflect that the bounded remediation step is now the active governed unit
- a new Layer 1 unit record must exist for `TECS-G026-CLEANUP-REMEDIATION-001`

This decision opens exactly one bounded cleanup or remediation step and no more.