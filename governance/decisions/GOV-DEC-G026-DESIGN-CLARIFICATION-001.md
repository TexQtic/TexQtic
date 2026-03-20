# GOV-DEC-G026-DESIGN-CLARIFICATION-001

Decision ID: GOV-DEC-G026-DESIGN-CLARIFICATION-001
Title: Clarify the canonical texqtic_service posture required before any future G-026 routing opening
Status: DECIDED
Date: 2026-03-20
Authorized by: Paresh

## Context

TexQtic opened `TECS-G026-DESIGN-CLARIFICATION-001` because the closed prerequisite unit
`TECS-G026-H-001` preserved unresolved discrepancy notes on:

- additional `SELECT` grants on `catalog_items`, `memberships`, `rfq_supplier_responses`, and `users`
- duplicate/equivalent `postgres` membership rows for `texqtic_service`

The design anchor for bounded G-026 routing still states that `texqtic_service` exists for the
narrow pre-auth resolver path only.

Repo truth reviewed in this clarification shows three distinct facts:

1. `server/prisma/migrations/20260317000000_g026_texqtic_service_role/migration.sql` created the
   original bounded posture: `NOLOGIN`, `BYPASSRLS`, `SELECT` on `public.tenants` and
   `public.tenant_domains`, and `GRANT texqtic_service TO postgres`.
2. `server/prisma/migrations/20260319000001_pw5_by_email_service_role_grants/migration.sql` and
   `server/src/routes/public.ts` later used the same role for the public by-email tenant lookup,
   requiring `SELECT` on `public.memberships` and `public.users`.
3. `server/prisma/migrations/20260319010003_tecs_rfq_buyer_response_read_001/migration.sql` and
   `server/src/routes/tenant.ts` later used the same role for bounded RFQ helper reads,
   requiring `SELECT` on `public.catalog_items` and `public.rfq_supplier_responses`.

The reconcile migration for `TECS-G026-H-001` explicitly preserved these supplementary grants as
historical observations only and did not treat them as routing authorization.

## Decision

### 1. Canonical target posture for any future G-026 routing opening

The canonical target posture remains the original bounded resolver posture, not the currently wider
historical footprint.

Before any future G-026 routing opening may be considered, `texqtic_service` must be governed as:

- `NOLOGIN`
- `BYPASSRLS`
- readable by `postgres` through transaction-local `SET LOCAL ROLE` only
- `SELECT`-only table posture
- base grants limited to `public.tenants` and `public.tenant_domains`
- used only by the internal resolver path for host-to-tenant routing primitives

This clarification keeps the design anchor narrow. It does not broaden G-026 to absorb unrelated
historical consumers of the role.

### 2. Classification of `memberships` and `users`

The extra `SELECT` grants on `public.memberships` and `public.users` are not acceptable residuals
for the future routing-opening target posture.

They are governance-authorized historical dependencies of the separately shipped public by-email
tenant lookup path, but they are inconsistent with the resolver-only target posture for G-026.

Therefore:

- they may remain as historical current-state truth for now
- they do not reopen `TECS-G026-H-001`
- they do block any future routing opening until that by-email path no longer depends on
  `texqtic_service` or the role is otherwise explicitly re-designed through a separate stronger
  decision

### 3. Classification of `catalog_items` and `rfq_supplier_responses`

The extra `SELECT` grants on `public.catalog_items` and `public.rfq_supplier_responses` are also
not acceptable residuals for the future routing-opening target posture.

They are governance-authorized historical dependencies of the separately shipped RFQ bounded read
helpers, but they are likewise inconsistent with the resolver-only target posture for G-026.

Therefore:

- they may remain as historical current-state truth for now
- they do not reopen the closed prerequisite unit
- they do block any future routing opening until those RFQ helper reads no longer depend on
  `texqtic_service` or the role is otherwise explicitly re-designed through a separate stronger
  decision

### 4. Classification of duplicate/equivalent `postgres` membership rows

The canonical invariant is effective `postgres` assumability of `texqtic_service`, not row
multiplicity by itself.

If the observed duplicate/equivalent membership rows are semantically equivalent and do not widen
the set of assumers, grant options, or effective authority, they are acceptable as a non-blocking
normalization observation for this bounded clarification.

Therefore:

- duplicate/equivalent `postgres` membership rows are not, by themselves, a blocker to any later
  routing-opening question
- a standalone normalization unit for those rows is not required before routing opening
- if later authoritative DB evidence shows that the apparent duplicates reflect materially distinct
  authority, assumers, or grant options, that becomes a new discrepancy and must be governed
  separately

### 5. Exact posture required before any future routing opening

Before any future bounded G-026 routing opening may be considered, all of the following must be
true:

1. `texqtic_service` still satisfies the bounded prerequisite invariants proven by
   `TECS-G026-H-001`
2. no non-routing route depends on `texqtic_service` for `memberships`, `users`, `catalog_items`,
   or `rfq_supplier_responses`
3. the role's effective table-grant surface for routing is again limited to `public.tenants` and
   `public.tenant_domains`
4. no non-resolver route uses `SET LOCAL ROLE texqtic_service`
5. no stronger design decision has broadened the canonical G-026 role posture

### 6. Is a later cleanup unit required?

Yes.

A later separately authorized bounded cleanup or remediation unit is required before any routing
opening can be considered.

Its exact scope is:

- remove or re-home the public by-email path's dependency on `texqtic_service`
- remove or re-home the RFQ helper read paths' dependency on `texqtic_service`
- remove the extra `SELECT` grants on `memberships`, `users`, `catalog_items`, and
  `rfq_supplier_responses` once those paths no longer require them
- preserve the base resolver posture on `public.tenants` and `public.tenant_domains`
- preserve transaction-local `postgres` role assumption needed by the bounded resolver path

That later unit must remain cleanup/remediation only. It does not implicitly open routing.

## Non-Authorization Statement

This clarification does **not**:

- open the broad G-026 routing stream
- open a routing implementation unit
- open the cleanup/remediation unit
- broaden the design anchor to legitimize the extra grants
- reopen `TECS-G026-H-001`
- authorize custom-domain, apex-domain, or DNS-verification scope

## Consequences

- `TECS-G026-DESIGN-CLARIFICATION-001` may close after recording this clarification result
- `NEXT-ACTION` returns to `OPERATOR_DECISION_REQUIRED`
- the future routing-opening question is still blocked, but now for a precise reason:
  non-routing `texqtic_service` dependencies must first be removed or re-homed by a separate
  bounded unit
- duplicate/equivalent `postgres` membership rows remain a non-blocking normalization observation
  unless later evidence proves broader authority than currently understood