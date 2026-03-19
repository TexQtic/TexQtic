# PRODUCT-DEC-WAVE4-BOUNDARY-RATIFIED

Decision ID: PRODUCT-DEC-WAVE4-BOUNDARY-RATIFIED
Title: Wave 4 is ratified as a bounded strategic domain with explicit settlement, AI, and sequencing constraints
Status: DECIDED
Date: 2026-03-19
Authorized by: Paresh

## Context

TexQtic has already recorded two prerequisite decisions for the post-RFQ portfolio state:

- `PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP`
- `PRODUCT-DEC-POST-RFQ-WL-DOMAINS-PRIORITY`

Those decisions closed the RFQ discovery chain, kept RFQ capped at pre-negotiation, and
identified Wave 4 boundary ratification as the immediate operator priority.

Repo evidence shows that Wave 4 is currently constrained by multiple draft strategy and doctrine
artifacts rather than by a single formal governance decision:

- `docs/DOCTRINE_ADDENDUM_POSITIONING_MONEY.md`
- `docs/strategy/PLATFORM_DOCTRINE_ADDENDUM.md`
- `docs/status/TEXQTIC_CURRENT_STATE__2026-02-24.md`
- `docs/DASHBOARD_MATRIX_CONTROL_TENANT_WL.md`
- `docs/strategy/TENANT_DASHBOARD_MATRIX.md`
- `docs/architecture/CUSTOM-DOMAIN-ROUTING-DESIGN.md`
- `docs/tecs/G-028-ai-vector-inference-separation.md`

These artifacts consistently indicate:

- Wave 4 is about platform/operator expansion, white-label enablement, compliance/read-model
  surfaces, and enabling infrastructure
- settlement is still bounded by the "Not Fintech Now" rule
- AI is still bounded to advisory-only posture
- white-label/custom-domain routing is design-ready but not yet sequenced
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE` and cannot be forced open

No Layer 2 decision currently ratifies the Wave 4 boundary as a whole. This record fills that
governance gap without authorizing implementation.

## Considered Options

### Option A — Ratify Wave 4 broadly as customer-facing commercial expansion

Rejected.

Reason:
- this would create hidden authorization for negotiation, trade conversion, checkout ownership,
  settlement, and other commercial flows that remain unresolved or explicitly excluded
- it would conflict with the RFQ cap decision and with the draft money/settlement doctrine

### Option B — Ratify Wave 4 only as internal operator tooling

Rejected.

Reason:
- repo evidence clearly includes white-label/store-admin, custom-domain routing, DPP/read-model,
  and advisory AI enabling work inside Wave 4 planning
- restricting Wave 4 to internal-only tools would ignore documented platform direction

### Option C — Ratify Wave 4 as a bounded strategic domain covering operator tooling,
tenant back-office surfaces, white-label enablement, compliance/read models, and advisory AI /
infrastructure layers, while explicitly excluding money movement, negotiation expansion, and
autonomous AI

Selected.

Reason:
- this matches the draft doctrine addendum, platform doctrine addendum, dashboard matrices, and
  current state backlog
- it is broad enough to remove ambiguity and narrow enough to avoid implied implementation approval
- it preserves the already-recorded preference for white-label/custom-domain routing without forcing
  sequencing or opening work

## Decision

Wave 4 is formally ratified as a **bounded strategic domain** for TexQtic.

Wave 4 is allowed to consider both:

1. **internal/operator and tenant back-office surfaces** that strengthen governed workflow,
   visibility, branding, compliance, and white-label operations
2. **enabling platform infrastructure and read-model layers** required to support those surfaces,
   including custom-domain routing, DPP/read-model evolution, and advisory-only AI/vector
   infrastructure when separately sequenced

Wave 4 is **not** ratified as open commercial-flow expansion.

This decision ratifies the following Wave 4 posture:

- **Settlement posture:** Phase 2 remains "Not Fintech Now". The platform may record settlement
  status or acknowledgement as system-of-record workflow visibility only. Platform fund custody,
  payment execution, PSP activation, or managed settlement are not authorized in Wave 4 by this decision.
- **AI posture:** AI remains advisory only. Advisory insights, risk surfacing, retrieval,
  inference separation, and budgeted explainable assistance may be part of Wave 4 consideration,
  but no autonomous irreversible decisions are authorized.
- **White-label posture:** White-label/store-admin capability remains in-bounds for Wave 4 and
  white-label/custom-domain routing remains the favored first non-RFQ stream once separate
  sequencing occurs.
- **RFQ posture:** RFQ remains capped at pre-negotiation and is not reopened by this decision.

This decision is a boundary-ratification record only. It does not authorize shipping,
implementation, or unit opening by implication.

## Consequences

- Wave 4 now has a formal governance boundary at Layer 2 instead of relying only on draft strategy artifacts
- the "Not Fintech Now" settlement posture is now formally preserved as the governing Wave 4 money boundary
- the advisory-only AI posture is now formally preserved as the governing Wave 4 AI boundary
- white-label/custom-domain routing remains aligned with the already-recorded post-RFQ prioritization
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`
- no implementation-ready unit is created by this decision

## Explicit In-Scope Statement

This decision puts the following categories in-bounds for **Wave 4 consideration only**:

- control-plane and tenant/operator tooling that strengthens governed visibility, governance,
  branding, compliance, and back-office execution
- white-label/store-admin capability and supporting white-label infrastructure
- custom-domain routing and tenant-resolution infrastructure
- DPP/read-model and compliance visibility layers
- advisory-only AI, vector, retrieval, and inference-separation foundations
- finance and settlement visibility surfaces that remain system-of-record only and do not move money

## Explicit Out-of-Scope Statement

This decision does not put the following in-bounds for Wave 4:

- RFQ negotiation expansion
- pricing authorization beyond already-installed surfaces
- negotiation loops, acceptance, rejection, counter-offers, or messaging
- trade conversion or order-conversion by implication
- platform checkout expansion by implication
- platform fund custody
- payment execution, PSP activation, or bank integration activation
- milestone escrow as a new Wave 4 product authorization
- platform-managed settlement
- autonomous AI decisions or AI-driven irreversible workflow actions
- forced opening of `TECS-FBW-ADMINRBAC`
- any implementation unit, source-code change, schema change, migration, RLS-policy change, or test change

## Sequencing Prerequisites

Before any Wave 4 feature stream may be sequenced for implementation, all of the following must hold:

1. this Wave 4 boundary ratification decision must exist as the governing Layer 2 record
2. the candidate stream must fit entirely within the in-scope boundary recorded here
3. the candidate stream must have its own explicit sequencing decision or governance unit before opening
4. any stream-specific design gates or approval gates must still be satisfied
5. `DESIGN_GATE` items remain blocked until their own required decisions are recorded

Specific carry-forward prerequisites preserved by this decision:

- `TECS-FBW-ADMINRBAC` still requires both `DESIGN-DEC-ADMINRBAC-PRODUCT` and
  `SECURITY-DEC-ADMINRBAC-POSTURE`
- custom-domain routing remains sequencing-blocked until a separate governance step chooses whether to open it
- DPP evolution remains sequencing-blocked until separately chosen and approved for the relevant TECS path

## Non-Authorization Statement

This decision does **not**:

- open G-026
- open TECS 6C or TECS 6D
- approve DPP TECS 4A / 4B
- approve any AI feature beyond advisory-only posture
- approve settlement implementation beyond visibility/system-of-record posture
- approve shipping of any Wave 4 module
- change any unit status

## Relationship To Prior Decisions

This decision follows and preserves:

- `PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP`
- `PRODUCT-DEC-POST-RFQ-WL-DOMAINS-PRIORITY`

It clarifies, rather than supersedes, the strategic intent described in:

- `docs/DOCTRINE_ADDENDUM_POSITIONING_MONEY.md`
- `docs/strategy/PLATFORM_DOCTRINE_ADDENDUM.md`
- `docs/status/TEXQTIC_CURRENT_STATE__2026-02-24.md`
- `docs/DASHBOARD_MATRIX_CONTROL_TENANT_WL.md`
- `docs/strategy/TENANT_DASHBOARD_MATRIX.md`

It does not supersede any existing `DESIGN_GATE`, `OPEN`, or future stream-specific decision.

## Effect On Future Feature Sequencing

- `NEXT-ACTION` remains `OPERATOR_DECISION_REQUIRED`
- white-label/custom-domain routing remains the favored first non-RFQ stream after this boundary ratification
- that preference is still strategic only; it is not an immediately open implementation track
- any next step after this decision must be a separate governance sequencing choice, not inferred implementation authorization