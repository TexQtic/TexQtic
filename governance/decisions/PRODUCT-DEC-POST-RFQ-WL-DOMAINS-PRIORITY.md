# PRODUCT-DEC-POST-RFQ-WL-DOMAINS-PRIORITY

Decision ID: PRODUCT-DEC-POST-RFQ-WL-DOMAINS-PRIORITY
Title: Post-RFQ priority favors white-label domain routing after Wave 4 boundary ratification
Status: DECIDED
Date: 2026-03-19
Authorized by: Paresh

## Context

RFQ discovery is closed and intentionally capped at pre-negotiation by
`PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP`.

Layer 0 currently shows:

- 0 implementation-ready units `OPEN`
- 0 `BLOCKED`
- 0 `DEFERRED`
- 1 `DESIGN_GATE` (`TECS-FBW-ADMINRBAC`)
- `NEXT-ACTION = OPERATOR_DECISION_REQUIRED`

The next operator/product decision must therefore select the next non-RFQ direction using
repo evidence and current governance constraints, without forcing open any gated work.

Relevant non-RFQ candidate streams visible in the repo are:

1. **Admin governance / access control**
   - `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`
   - `DESIGN-DEC-ADMINRBAC-PRODUCT` is `OPEN`
   - `SECURITY-DEC-ADMINRBAC-POSTURE` is `OPEN`
   - the unit record explicitly says nothing may open until both decisions are recorded

2. **White-label / custom-domain routing**
   - TexQtic platform vision includes full white-label storefront support
   - dashboard and tenant matrix artifacts mark domains/branding as `P1` with API done and UI partial
   - `CUSTOM-DOMAIN-ROUTING-DISCOVERY.md` is complete
   - `CUSTOM-DOMAIN-ROUTING-DESIGN.md` is complete and identifies WL domains panel work as unblocked by design
   - scope size is comparatively narrow and oriented to a visible platform gap

3. **DPP / compliance read-model evolution**
   - `DPP-SNAPSHOT-VIEWS-DESIGN.md` exists and is design-complete
   - however it is explicitly `Awaiting Approval` and still carries approval gates before TECS 4A / 4B
   - scope is broader and more complex than the custom-domain stream

4. **Wave 4 boundary / settlement / AI ratification**
   - `docs/DOCTRINE_ADDENDUM_POSITIONING_MONEY.md` states that no Wave 4 module may ship until:
     - the addendum is signed off
     - the settlement scope decision is formally recorded
     - the AI stance is ratified
   - no settlement-boundary decision is recorded in the current governance decision ledger

## Considered Options

### Option A — Prioritize AdminRBAC next

Rejected for now.

Reason:
- `TECS-FBW-ADMINRBAC` is still `DESIGN_GATE`
- both required gate decisions remain unresolved
- it is explicitly high-risk and cannot be advanced by a single product-priority decision alone

### Option B — Prioritize DPP snapshot expansion next

Not selected as the first post-RFQ direction.

Reason:
- DPP is a valid strategic stream, but the design anchor is still awaiting operator approvals
- it is an XL-style compliance stream relative to the narrower white-label domain gap
- it is also subject to the broader Wave 4 boundary prerequisites recorded in the doctrine addendum

### Option C — Prioritize white-label / custom-domain routing next

Selected as the favored feature stream, but not yet for implementation.

Reason:
- it directly supports TexQtic's white-label platform posture
- repo evidence marks domains/branding as `P1` and still partial/stubbed
- discovery and design are already complete, making it the most governance-ready non-RFQ product stream once portfolio prerequisites are satisfied
- it is narrower and lower-governance-risk than DPP expansion and less blocked than AdminRBAC

### Option D — Prioritize Wave 4 boundary ratification first

Selected as the immediate operator prerequisite.

Reason:
- the doctrine addendum explicitly blocks Wave 4 shipping until settlement scope and AI posture are ratified
- a post-RFQ decision that ignores this boundary would create sequencing drift
- this is the narrowest operator-safe step that preserves governance integrity while still identifying the favored next stream

## Decision

TexQtic's next operator/product priority is **Wave 4 boundary ratification**, with
**white-label / custom-domain routing** designated as the favored first non-RFQ feature
stream after that boundary is formally cleared.

This decision is directional only.

It does **not** authorize implementation, does **not** open G-026 work, does **not** open
WL domains UI work, and does **not** resolve AdminRBAC gates. It records two things only:

1. the immediate operator priority is to clear the documented Wave 4 boundary prerequisites
   rather than reopen RFQ or force-open AdminRBAC
2. once those prerequisites are satisfied, white-label / custom-domain routing is the
   favored next non-RFQ stream ahead of DPP expansion or AdminRBAC implementation

## Consequences

- RFQ remains closed and capped at pre-negotiation
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`
- DPP remains a valid future stream but is not the favored next one at this time
- white-label / custom-domain routing becomes the leading post-ratification product candidate
- no implementation-ready unit is created by this decision
- Layer 0 sequencing remains unchanged until a later governance unit records a valid next step

## Explicit In-Scope

This decision is in scope only for:

- setting the next post-RFQ operator/product direction
- identifying visible non-RFQ candidate streams from repo evidence
- favoring white-label / custom-domain routing as the next candidate feature stream
- requiring documented Wave 4 boundary ratification before any sequencing toward that stream

## Explicit Out-of-Scope

This decision does not authorize:

- reopening RFQ scope
- RFQ negotiation, pricing, acceptance, rejection, messaging, comparison, or trade conversion
- opening `TECS-FBW-ADMINRBAC`
- recording AdminRBAC design or security gate resolution
- opening G-026 implementation, TECS 6C, or TECS 6D
- approving DPP TECS 4A / 4B
- settlement implementation
- AI implementation or autonomous actions
- source-code, test, schema, migration, RLS-policy, or contract changes

## Sequencing Impact

- No implementation unit is opened by this decision
- `governance/control/NEXT-ACTION.md` remains `OPERATOR_DECISION_REQUIRED`
- Before any future sequencing toward white-label / custom-domain routing, the following
  must first be formally satisfied in governance:
  - the Wave 4 doctrine addendum sign-off
  - the settlement scope decision record
  - the AI stance ratification record
- After those prerequisites are recorded, a separate governance sequencing decision may
  evaluate whether G-026 custom-domain routing should open as the next implementation stream

## Relationship To Prior Decisions And Current Control-Plane State

This decision follows and preserves:

- `PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP`
- the RFQ unit chain now recorded as `VERIFIED_COMPLETE`
- the current Layer 0 state of zero `OPEN` units and one `DESIGN_GATE`

This decision does not supersede:

- `DESIGN-DEC-ADMINRBAC-PRODUCT` (`OPEN`)
- `SECURITY-DEC-ADMINRBAC-POSTURE` (`OPEN`)

This decision uses the following repo evidence as the basis for prioritization:

- TexQtic platform vision includes full white-label storefront support
- white-label domains/branding remains a visible `P1` partial/stubbed area
- custom-domain discovery and design are already complete
- DPP design remains approval-gated and broader in scope
- Wave 4 shipment is explicitly blocked pending settlement and AI ratification

Resulting chronology:

1. RFQ discovery was intentionally completed and capped.
2. No implementation-ready work remains open.
3. AdminRBAC remains gated and cannot be forced open.
4. Wave 4 boundary ratification becomes the immediate operator priority.
5. White-label / custom-domain routing is designated as the favored next non-RFQ stream once that boundary is cleared.