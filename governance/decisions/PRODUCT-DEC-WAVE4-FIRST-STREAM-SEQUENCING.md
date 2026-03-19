# PRODUCT-DEC-WAVE4-FIRST-STREAM-SEQUENCING

Decision ID: PRODUCT-DEC-WAVE4-FIRST-STREAM-SEQUENCING
Title: White-label / custom-domain routing remains the first Wave 4 candidate but is not yet authorized to open
Status: DECIDED
Date: 2026-03-19
Authorized by: Paresh

## Context

TexQtic's current authoritative Layer 0 and Layer 2 state is:

- RFQ discovery is closed and governed
- `PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP` is `DECIDED`
- `PRODUCT-DEC-POST-RFQ-WL-DOMAINS-PRIORITY` is `DECIDED`
- `PRODUCT-DEC-WAVE4-BOUNDARY-RATIFIED` is `DECIDED`
- `NEXT-ACTION` remains `OPERATOR_DECISION_REQUIRED`
- no implementation-ready unit is currently `OPEN`
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`

The required sequencing question is whether white-label / custom-domain routing should now
become the first opened Wave 4 implementation stream.

Repo evidence relevant to this decision shows:

1. RFQ is intentionally capped at the installed pre-negotiation posture and may not continue
   without a separate later product decision.
2. Wave 4 is now formally bounded to governed operator/back-office surfaces, white-label
   enablement, compliance/read-model layers, and advisory-only AI / system-of-record money
   visibility. The ratified boundary does not authorize hidden negotiation, settlement, or
   autonomous AI scope.
3. White-label / custom-domain routing is the favored first non-RFQ stream after prerequisites,
   and the dashboard matrices mark domains / branding as `P1` with partial existing coverage.
4. `docs/architecture/CUSTOM-DOMAIN-ROUTING-DESIGN.md` is design-complete and keeps the v1
   slice narrow: platform subdomain routing, signed resolver path, Edge middleware, tenant
   context injection, and later WL domains UI sequencing.
5. That same design anchor records one known unresolved stream-specific gate:
   `G-026-H` — the `texqtic_service` DB role with narrowly-scoped `BYPASSRLS` access is not yet
   created and is explicitly marked as blocking TECS 6C1 deploy.
6. DPP snapshot views remain a broader alternative stream, but the design anchor is still
   `Awaiting Approval (D1-D6)` and still carries a critical approval / schema-linkage blocker.
7. AdminRBAC remains design-gated by two unresolved decisions and cannot be forced open.

## Required Determinations

### 1. Can RFQ continue now?

No.

`PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP` explicitly records RFQ as intentionally capped at the
installed pre-negotiation posture and requires a separate later product decision before any
pricing, negotiation, acceptance, rejection, counter-offers, messaging, comparison, Trade
conversion, checkout coupling, or settlement coupling may continue. No Layer 0 or Layer 2
evidence reopens RFQ.

### 2. Are all known Wave 4 boundary prerequisites satisfied?

At the portfolio boundary level, yes.

The required Layer 2 chain now exists:

- `PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP`
- `PRODUCT-DEC-POST-RFQ-WL-DOMAINS-PRIORITY`
- `PRODUCT-DEC-WAVE4-BOUNDARY-RATIFIED`

This is sufficient to establish the authoritative Wave 4 boundary in governance. The draft
doctrine addendum remains an important strategy artifact, but operational sequencing truth is
owned by Layer 2 decisions and Layer 0 control files.

At the candidate-stream opening level, no.

White-label / custom-domain routing still has one known unsatisfied stream-specific prerequisite:

- `G-026-H` is explicitly recorded in the custom-domain design anchor as blocking TECS 6C1 deploy.

Therefore the Wave 4 boundary is ratified, but this stream is not yet fully openable.

### 3. Does white-label / custom-domain routing fully fit inside the ratified Wave 4 boundary?

Yes, if constrained to the design-anchored v1 slice.

The v1 stream is white-label enablement plus routing infrastructure:

- platform subdomain tenant resolution
- signed internal resolver path
- Edge middleware and tenant-context injection
- cache / invalidation support
- later WL domains management UI

This fits the ratified Wave 4 categories of white-label enablement and enabling platform
infrastructure. It does not require reopening RFQ, authorizing platform money movement,
unlocking autonomous AI, or forcing AdminRBAC open.

However, the broader phrase "custom-domain routing" must not be interpreted as authorizing the
deferred v1.1 custom-domain / apex-domain DNS-verification scope. `G-026-A` remains deferred.
Only the bounded v1 platform-subdomain stream is sequencing-eligible.

### 4. Is this stream more sequencing-ready than other visible candidates?

Yes.

Compared visible alternatives:

- RFQ continuation is invalid because the RFQ cap decision remains in force.
- `TECS-FBW-ADMINRBAC` is less ready because it remains `DESIGN_GATE` behind unresolved product
  and security decisions.
- DPP snapshot views are less ready because the design anchor is still awaiting approval and
  carries unresolved approval-critical design decisions.
- Money, settlement, and AI-forward streams are not more ready because the ratified Wave 4
  boundary preserves system-of-record-only finance visibility and advisory-only AI.

White-label / custom-domain routing is therefore still the strongest first Wave 4 candidate.
It is strategically first, but not yet implementation-authorized.

## Decision

White-label / custom-domain routing remains the correct first Wave 4 implementation candidate,
but a new implementation unit will **not** be opened now.

This decision records the following sequencing posture:

1. RFQ does not continue now and remains capped at pre-negotiation.
2. White-label / custom-domain routing is the most sequencing-ready visible non-RFQ candidate.
3. The stream fits the ratified Wave 4 boundary only when bounded to the v1 platform-subdomain
   routing slice described in `CUSTOM-DOMAIN-ROUTING-DESIGN.md`.
4. Opening the first implementation unit now is not governance-safe because `G-026-H` remains an
   unresolved stream-specific prerequisite.

Accordingly, the portfolio answer is:

- **first candidate:** yes
- **open now:** no

## Consequences

- No implementation-ready unit is opened by this decision.
- `governance/control/NEXT-ACTION.md` remains `OPERATOR_DECISION_REQUIRED`.
- `governance/control/OPEN-SET.md` remains unchanged.
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`.
- RFQ remains capped and closed at pre-negotiation.
- Any future sequencing toward G-026 must first resolve `G-026-H` and then return through a
  separate governance sequencing step that opens at most one bounded implementation unit.

## Explicit In-Scope

This decision is in scope only for:

- deciding whether white-label / custom-domain routing should become the first opened Wave 4 stream
- distinguishing strategic priority from implementation authorization
- explicitly rejecting RFQ continuation under current repo evidence
- comparing visible alternatives for sequencing readiness
- preserving the current Wave 4 money, AI, AdminRBAC, and RFQ boundaries

## Explicit Out-of-Scope

This decision does not authorize:

- reopening RFQ
- pricing, negotiation, acceptance, rejection, counter-offers, messaging, comparison, or trade conversion
- opening `TECS-FBW-ADMINRBAC`
- settlement implementation beyond visibility-only posture
- AI implementation beyond advisory-only posture
- opening TECS 6C1, 6C2, 6C3, or 6D
- custom apex-domain or self-service DNS-verification scope
- source-code, schema, migration, RLS-policy, test, or contract changes

## Sequencing Impact

- The first favored Wave 4 stream remains white-label / custom-domain routing.
- The stream is design-ready but sequencing-blocked.
- No new implementation unit is opened from this decision record.
- The next governance move remains an operator decision after the unresolved G-026-H prerequisite
  is addressed through the appropriate governed path.

## Relationship To Prior Decisions

This decision follows and preserves:

- `PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP`
- `PRODUCT-DEC-POST-RFQ-WL-DOMAINS-PRIORITY`
- `PRODUCT-DEC-WAVE4-BOUNDARY-RATIFIED`

It does not supersede:

- `TECS-FBW-ADMINRBAC` design gating
- the deferred G-026 v1.1 custom-domain scope
- any future stream-specific sequencing decision required to actually open G-026 work

Resulting chronology:

1. RFQ was closed and capped.
2. White-label / custom-domain routing was identified as the favored post-RFQ stream.
3. Wave 4 boundary was ratified.
4. This decision now confirms that white-label / custom-domain routing remains first in sequence,
   but cannot yet be opened because its own known stream-specific prerequisite is still unresolved.