# PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP

Decision ID: PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP
Title: RFQ remains capped at pre-negotiation after discovery completion
Status: DECIDED
Date: 2026-03-19
Authorized by: Paresh

## Context

TexQtic's governed RFQ discovery milestone is complete and stable.

Installed RFQ capability now includes:

- buyer RFQ initiation
- buyer RFQ discovery list
- buyer RFQ detail read surface
- buyer-visible bounded supplier response reads
- supplier RFQ inbox reads
- supplier submit-once RFQ response
- parent RFQ transition to RESPONDED
- tenant isolation preserved under DB-level RLS
- audit compatibility preserved

Layer 0 currently shows 0 implementation-ready units OPEN, 0 BLOCKED, 0 DEFERRED,
and 1 DESIGN_GATE (`TECS-FBW-ADMINRBAC`). RFQ has reached the intended discovery
milestone while remaining explicitly pre-negotiation. Prior RFQ decisions consistently
excluded pricing, negotiation, counter-offers, acceptance, rejection, messaging,
comparison, and Trade / checkout / settlement coupling.

The next product decision must determine whether TexQtic should continue extending RFQ
toward negotiation or instead hold the current RFQ posture and redirect the next effort
outside RFQ expansion.

## Decision

TexQtic will hold RFQ at the current pre-negotiation boundary.

The next product-level move after RFQ discovery completion is not RFQ negotiation or Trade
expansion. Instead, RFQ is treated as a governed, installed pre-negotiation capability and
the next product effort must be chosen through a separate later decision outside RFQ
negotiation / pricing / conversion scope.

This decision authorizes no implementation. It records that the current RFQ posture is the
intended stopping point for now and that any future RFQ expansion beyond this boundary must
return as a separate explicit product decision before any sequencing or implementation work
may occur.

## Consequences

- RFQ discovery is now the active product boundary for the RFQ track.
- The installed RFQ posture is treated as complete for the current milestone, not as a partial bug-fix state.
- Future RFQ negotiation, pricing, acceptance, rejection, counter-offers, messaging,
  supplier comparison, and Trade-conversion ideas are deferred product scope pending a
  separate later decision.
- No RFQ implementation unit may be opened from this record.
- TECS-FBW-ADMINRBAC remains DESIGN_GATE and is unaffected by this decision.
- Layer 0 sequencing remains unchanged until a separate operator-led portfolio choice is made.

## Explicit In-Scope

This decision is in scope only for:

- formally capping RFQ at the installed pre-negotiation discovery posture
- recognizing the current RFQ milestone as governed and stable
- directing the next product decision away from RFQ negotiation/trade expansion
- requiring any future RFQ expansion to come back through a separate explicit decision first

## Explicit Out-of-Scope

This decision does not authorize:

- pricing
- negotiation loop
- acceptance
- rejection
- counter-offers
- thread or messaging
- supplier comparison
- trade conversion
- order conversion
- checkout
- settlement
- control-plane RFQ workflows
- reopening or forcing TECS-FBW-ADMINRBAC out of DESIGN_GATE
- any implementation unit
- any source-code, test, schema, migration, RLS-policy, or contract changes

## Sequencing Impact

- No implementation-ready unit is opened by this decision.
- `governance/control/NEXT-ACTION.md` remains `OPERATOR_DECISION_REQUIRED`.
- A separate future decision is required before any RFQ work may move beyond the current
  pre-negotiation boundary.
- A separate future decision is also required to choose the next non-RFQ product direction.

## Relationship To Prior RFQ Decisions And Units

This decision builds on, and does not supersede, the following DECIDED RFQ product records:

- PRODUCT-DEC-B2B-QUOTE
- PRODUCT-DEC-RFQ-DOMAIN-MODEL
- PRODUCT-DEC-BUYER-RFQ-READS
- PRODUCT-DEC-SUPPLIER-RFQ-READS
- PRODUCT-DEC-SUPPLIER-RFQ-RESPONSE

This decision preserves the closure and installed posture of the following VERIFIED_COMPLETE
RFQ units:

- TECS-RFQ-DOMAIN-001
- TECS-RFQ-READ-001
- TECS-RFQ-SUPPLIER-READ-001
- TECS-RFQ-RESPONSE-001
- TECS-RFQ-BUYER-RESPONSE-READ-001
- TECS-RFQ-BUYER-DETAIL-UI-001
- TECS-RFQ-BUYER-LIST-READ-001

Chronology preserved:

1. RFQ initiation was authorized first as a non-binding buyer action.
2. RFQ was then formalized as a first-class domain entity.
3. Buyer and supplier read surfaces were authorized and completed.
4. A single bounded supplier response artifact was authorized and completed.
5. Buyer discovery and bounded response visibility were completed.
6. This decision now stops the RFQ track at pre-negotiation and defers any broader RFQ
   workflow expansion until a later explicit product decision.