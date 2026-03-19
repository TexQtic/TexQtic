# PRODUCT-DEC-G026-V1-FIRST-STREAM-DISPOSITION

Decision ID: PRODUCT-DEC-G026-V1-FIRST-STREAM-DISPOSITION
Title: Bounded G-026 v1 does not open as a new first Wave 4 implementation stream
Status: DECIDED
Date: 2026-03-19
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state already records:

- `PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP`
- `PRODUCT-DEC-POST-RFQ-WL-DOMAINS-PRIORITY`
- `PRODUCT-DEC-WAVE4-BOUNDARY-RATIFIED`
- `PRODUCT-DEC-WAVE4-FIRST-STREAM-SEQUENCING`
- `PRODUCT-DEC-G026-H-PREREQUISITE-POSTURE`

Those decisions establish that:

- RFQ remains intentionally capped at pre-negotiation
- Wave 4 is ratified as a bounded strategic domain
- white-label / domain-routing remains the favored first Wave 4 candidate when narrowly bounded
- `G-026-H` is satisfied for the bounded v1 resolver path
- broader custom-domain and apex-domain scope remains bounded by deferred `G-026-A`
- no implementation-ready unit is currently `OPEN`
- `NEXT-ACTION` remains `OPERATOR_DECISION_REQUIRED`
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`

The remaining sequencing question is whether the bounded G-026 v1 resolver / domain-routing slice
should now be opened as the first Wave 4 implementation stream.

Repo evidence for this question must be interpreted conservatively:

1. The bounded v1 design boundary is narrow and explicit in
   `docs/architecture/CUSTOM-DOMAIN-ROUTING-DESIGN.md`: platform subdomain routing only,
   signed resolver path, Edge middleware, cache/invalidation support, and WL domains operator
   surface, with broader custom-domain and apex-domain lifecycle deferred.
2. The live repository already contains the bounded resolver stack and the WL domains operator path,
   including `middleware.ts`, `server/src/routes/internal/resolveDomain.ts`,
   `server/src/hooks/tenantResolutionHook.ts`, `server/src/routes/internal/cacheInvalidate.ts`,
   `components/WhiteLabelAdmin/WLDomainsPanel.tsx`, `server/src/routes/tenant.ts`, and
   `server/src/lib/cacheInvalidateEmitter.ts`.
3. Historical repo records in `governance/gap-register.md`, `governance/wave-execution-log.md`,
   and related archived tracker artifacts consistently describe TECS 6C1, 6C2, 6C3, and 6D as
   already implemented and validated for the bounded v1 path.
4. Current Layer 0 does not carry an `OPEN` G-026 implementation unit, so this decision must not
   create a fictional implementation opening for work that repo evidence already shows as materially present.

## Required Determinations

### 1. Can RFQ continue now?

No.

`PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP` remains `DECIDED` and explicitly holds RFQ at the installed
pre-negotiation posture. No Layer 0 or Layer 2 record reopens pricing, negotiation, acceptance,
rejection, counter-offers, messaging, comparison, Trade conversion, checkout coupling, settlement,
or any other RFQ continuation path.

### 2. Does bounded G-026 v1 fit the ratified Wave 4 boundary?

Yes, if constrained to the bounded v1 platform-subdomain slice.

That bounded slice is white-label enablement and enabling infrastructure only:

- platform subdomain tenant resolution (`<slug>.texqtic.app`)
- signed internal resolver path
- Edge middleware and backend validation
- cache / invalidation support
- WL domains operator surface bounded to the same v1 path

This fits the ratified Wave 4 boundary for white-label enablement and supporting infrastructure.
It does not require reopening RFQ, authorizing money movement, authorizing autonomous AI, or
forcing AdminRBAC out of `DESIGN_GATE`.

### 3. Is G-026-H satisfied for the bounded slice?

Yes.

`PRODUCT-DEC-G026-H-PREREQUISITE-POSTURE` is already `DECIDED`, and the repository contains the
resolver-secret config, resolver route, Edge/Backend HMAC path, and historical validation record
that reconcile `G-026-H` as satisfied for the bounded resolver path.

### 4. Does G-026-A still constrain broader scope?

Yes.

`G-026-A` still bounds the broader custom-domain / apex-domain path. The following remain excluded
from any bounded v1 authorization:

- custom apex domains (`brand.com`)
- custom tenant subdomains (`shop.brand.com`)
- TXT record DNS challenge / verification flow
- DNS lifecycle automation
- broader multi-domain lifecycle expansion
- wildcard-domain support

### 5. Would opening bounded v1 violate money, AI, RFQ, or AdminRBAC constraints?

The bounded scope itself does not violate those constraints.

However, opening a new implementation unit for the bounded v1 stream now would be governance-unsafe
because it would duplicate already-present bounded implementation and risk hidden scope drift into
the deferred broader domain lifecycle.

### 6. Does the repo support a cleanly bounded implementation unit for v1 right now?

No.

The repo does not present one clean unimplemented bounded-v1 unit to open. Instead, the bounded v1
resolver/domain-routing path already appears materially implemented in current code and historical
validation records. Creating a new `OPEN` implementation unit for the same bounded slice would
misstate repo reality and violate minimal-diff sequencing discipline.

### 7. Is any remaining prerequisite still blocking the bounded slice?

No stream-specific prerequisite remains blocking for the bounded v1 slice itself.

The reason not to open a unit now is not an unresolved technical prerequisite. The reason is that
repo evidence does not support a still-unimplemented bounded-v1 implementation delta that can be
opened without duplicating already-present work or authorizing deferred broader scope.

## Decision

Bounded G-026 v1 is governance-compatible as a bounded Wave 4 scope, but it will **not** now be
opened as a new first Wave 4 implementation stream.

This decision records the following authoritative sequencing answer:

1. the bounded v1 slice is now safe to reason about within Wave 4 because RFQ remains capped,
   Wave 4 is ratified, and `G-026-H` is satisfied for the resolver path
2. the exact bounded v1 scope is limited to the platform-subdomain resolver / routing path and the
   corresponding WL operator surface already bounded by that same design anchor
3. the broader custom-domain / apex-domain / DNS-verification lifecycle remains excluded under
   deferred `G-026-A`
4. no new implementation unit is created now because repo evidence shows the bounded v1 slice is
   already materially implemented and therefore does not present one clean implementation opening

Accordingly, the sequencing answer is:

- **bounded scope as Wave 4 category:** yes
- **open a new implementation unit now:** no

## Consequences

- No implementation-ready unit is opened by this decision.
- `governance/control/NEXT-ACTION.md` remains `OPERATOR_DECISION_REQUIRED`.
- `governance/control/OPEN-SET.md` remains unchanged.
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`.
- RFQ remains capped and closed at pre-negotiation.
- Broader custom-domain and apex-domain scope remains deferred under `G-026-A`.
- This decision does not retroactively create, reopen, or duplicate a bounded G-026 implementation unit.

## Exact Authorized Bounded v1 Scope (no unit opened)

If the bounded v1 slice is referenced in future governance, its exact allowed boundary remains:

- platform-subdomain routing only: `<slug>.texqtic.app`
- signed internal host resolver path
- Edge middleware tenant resolution and anti-spoofing validation
- cache and invalidation support for the same path
- WL domains operator surface only insofar as it belongs to that bounded v1 resolver path

This decision authorizes no new implementation work from that scope.

## Exact Excluded Broader Scope

The following broader scope remains excluded and unopened:

- apex-domain support
- tenant-owned custom-domain lifecycle beyond the bounded v1 path
- DNS verification workflow
- TXT challenge generation or polling
- broader domain status automation
- wildcard domain support
- broader WL dashboard expansion unrelated to bounded domains routing
- payments, settlement expansion, PSP activation, custody, or platform money movement
- RFQ reopening or negotiation expansion
- AdminRBAC opening
- AI expansion beyond advisory-only posture

## Explicit In-Scope

This decision is in scope only for:

- deciding whether bounded G-026 v1 should now become the first opened Wave 4 stream
- distinguishing bounded v1 platform-subdomain routing from broader deferred domain scope
- reconciling current repo evidence against current Layer 0 opening posture
- preserving RFQ, money, AI, and AdminRBAC constraints while answering the sequencing question

## Explicit Out-of-Scope

This decision does not authorize:

- creating an implementation unit
- reopening RFQ
- opening broader G-026-A scope
- opening apex-domain or DNS-verification work
- opening AdminRBAC
- settlement implementation or money movement
- autonomous or irreversible AI actions
- source-code, schema, migration, RLS-policy, test, or contract changes

## Sequencing Impact

- `NEXT-ACTION` remains `OPERATOR_DECISION_REQUIRED`.
- No bounded G-026 implementation unit is opened.
- Any future governance action concerning G-026 must distinguish between:
  - historical bounded-v1 implementation evidence already present in the repo
  - broader deferred custom-domain scope still excluded by `G-026-A`

## Relationship To Prior Decisions

This decision follows and preserves:

- `PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP`
- `PRODUCT-DEC-POST-RFQ-WL-DOMAINS-PRIORITY`
- `PRODUCT-DEC-WAVE4-BOUNDARY-RATIFIED`
- `PRODUCT-DEC-WAVE4-FIRST-STREAM-SEQUENCING`
- `PRODUCT-DEC-G026-H-PREREQUISITE-POSTURE`

It clarifies the remaining opening question without superseding:

- the RFQ pre-negotiation cap
- the deferred broader custom-domain / apex-domain path under `G-026-A`
- the `DESIGN_GATE` posture of `TECS-FBW-ADMINRBAC`

Resulting chronology:

1. RFQ was intentionally capped.
2. White-label / domain-routing remained the favored first Wave 4 candidate.
3. Wave 4 boundary was ratified.
4. `G-026-H` was reconciled as satisfied for the bounded resolver path.
5. This decision now records that the bounded G-026 v1 slice should not be opened as a new
   implementation stream because the bounded slice is already materially present in repo evidence,
   while broader domain scope remains deferred.