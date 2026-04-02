# B2B-EXCHANGE-OPERATING-MODE-DESIGN-v1

Status: PRODUCT-TRUTH / FAMILY DESIGN ONLY
Date: 2026-04-02
Authority posture: canonical-model-aligned, planning/design only

## 1. Purpose and Authority

This artifact is the canonical current family-level design anchor for `B2B Exchange Core`.

It exists because B2B is already the primary governed commercial access model under the adopted
canonical platform definition, but current repo planning truth still describes B2B diffusely across
launch, delivery, runtime, and tenant-matrix artifacts rather than through one current family-level
anchor.

This document does not open implementation, does not create a TECS unit, does not redesign adjacent
families, and does not replace Layer 0 governance truth.

This document is derived in the following authority order:

1. Layer 0 carry-forward and sequencing posture
   - `governance/control/NEXT-ACTION.md`
   - `governance/control/SNAPSHOT.md`
2. Canonical model authority
   - `docs/strategy/PLATFORM_DOCTRINE_ADDENDUM.md`
3. Launch-family posture
   - `docs/product-truth/TEXQTIC-LAUNCH-SCOPE-DECISION-RECORD-v1.md`
   - `docs/product-truth/TEXQTIC-LAUNCH-PLANNING-SPLIT-v1.md`
   - `docs/product-truth/TEXQTIC-LAUNCH-READINESS-REQUIREMENTS-v1.md`
4. Active broad planning context
   - `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v2.md`
   - `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v2.md`
5. Tenant-surface descriptive context
   - `docs/strategy/TENANT_DASHBOARD_MATRIX.md`
6. Narrower exchange/workflow context
   - `docs/product-truth/RFQ-NEGOTIATION-CONTINUITY-DESIGN-GATE-v1.md`

## 2. Current Controlling Posture

Current repo authority already fixes the following truths:

- TexQtic is the operating system for trusted textile supply chains.
- B2B Exchange is the primary governed commercial access model for authenticated business
  participants.
- B2B is the strongest current day-1 launch anchor.
- Enterprise is not a separate platform mode; it is depth within B2B.
- White-label is an overlay capability and deployment/experience model, not a separate commercial
  access model.
- Control-plane, superadmin, and WL-admin surfaces are governance/operations surfaces, not
  commercial pillars.

The remaining planning gap is not whether B2B exists. The gap is that B2B still lacks one current,
explicit, family-level design anchor that future units can cite without drifting into white-label,
enterprise-as-mode, or generic tenant-surface language.

## 3. Canonical B2B Exchange Core Definition

`B2B Exchange Core` is the primary authenticated business-participant operating family through
which TexQtic delivers structured, permissioned, auditable trade continuity.

At the family level, B2B Exchange Core means:

- business participants discover counterparties in a governed, non-bazaar posture
- commercial engagement begins through authenticated tenant-scoped surfaces
- catalog and commercial continuity support business trade rather than public retail browsing
- RFQ initiation and supplier-response continuity are part of the family
- order, trade, escrow, and settlement visibility are related downstream continuity surfaces inside
  the B2B exchange family boundary
- trade remains governed infrastructure behavior, not an informal listing or messaging layer

The correct high-level B2B family statement is:

- B2B Exchange Core is the authenticated business exchange family that carries participants from
  governed discovery and commercial initiation into transaction continuity and downstream governed
  workflow.

## 4. What Belongs Inside B2B Exchange Core

The following belong inside the B2B family boundary:

### 4.1 Authenticated business exchange entry

- tenant-scoped business participant entry into the B2B exchange context
- governed discovery and commercial engagement between authenticated business parties

### 4.2 Commercial and catalog continuity at B2B level

- tenant-owned business catalog surfaces
- business-facing product and commercial information needed to support exchange
- cart / checkout / order continuity where that continuity operates as part of the business trade
  loop rather than a consumer storefront promise

### 4.3 RFQ and quotation initiation boundary

- buyer RFQ initiation
- buyer RFQ discovery/list/detail continuity
- supplier inbox/detail/respond continuity
- the bounded bridge from RFQ into later trade continuity where repo truth already supports it

### 4.4 Downstream trade and transaction continuity

- trade continuity as the governed downstream continuation of exchange
- order continuity as the commercial execution continuation of exchange
- escrow and settlement visibility as governed transaction-state continuity, not platform-held funds

### 4.5 Compliance-aware exchange participation

- compliance-aware gating as part of governed exchange behavior
- evidence-ready workflow and auditable trade progression within the B2B operating family

## 5. What Does Not Belong Inside B2B Exchange Core

The following are adjacent or subordinate families and must not be silently absorbed into B2B core:

### 5.1 White-label overlay

- white-label storefront/admin runtime
- white-label brand-operator back-office continuity
- white-label domains/branding/operator surfaces as a separate overlay family

### 5.2 B2C tenant-branded commerce

- public-safe storefront discovery
- consumer-facing browse-entry continuity
- consumer-oriented post-purchase behavior outside the authenticated B2B exchange loop

### 5.3 Aggregator directory and intent handoff

- curated directory behavior
- intent-routing and handoff semantics
- aggregator-owned discovery that stops short of owning B2B execution itself

### 5.4 Control-plane / superadmin / platform admin

- platform supervision, compliance, audit, finance oversight, feature governance, and admin RBAC
- tenant-registry and tenant deep-dive operations

### 5.5 Tenant admin / tenant back office

- org profile administration
- memberships, branding, integrations, staff administration, and non-exchange admin controls as a
  cross-mode family

### 5.6 Cross-cutting governance families

- identity / tenancy / permissions / workspace continuity
- workflow / evidence / governed operational state
- AI governance / advisory automation
- feature governance / release controls / kill-switches
- domain / routing / brand-surface management as a distinct cross-cutting family

## 6. Relationship To Launch and Runtime Truth

Launch and runtime truth already support treating B2B as the strongest current exchange anchor.

Current evidence cited by controlling planning artifacts includes:

- tenant discovery and realm-safe authenticated business entry
- B2B catalog, cart, checkout, and orders continuity
- buyer and supplier RFQ continuity
- trades continuity
- escrow and settlement visibility continuity

This family artifact does not claim that every adjacent B2B-adjacent surface is equally complete.
It instead states the lawful family boundary future planning should use.

## 7. Enterprise Within B2B

Enterprise is not a separate commercial access model and not a separate platform mode.

Within this family:

- enterprise denotes deeper operating complexity within B2B exchange
- enterprise-specific RFQ, negotiation, partner, compliance, approval, or commercial depth remains
  subordinate to B2B family truth
- enterprise-specific bounded units may exist later, but they remain B2B child continuity or depth
  units rather than separate commercial-mode programs

The dedicated boundary note in
`docs/product-truth/ENTERPRISE-WITHIN-B2B-DEPTH-BOUNDARY-v1.md` is controlling for that specific
classification and must be inherited by later family units.

## 8. Inheritance Rules For Later Family Units

Later family-specific planning and implementation units must inherit the following rules:

1. B2B remains the primary governed commercial access model for authenticated business trade.
2. Enterprise depth does not create a separate platform mode.
3. White-label overlay work must not redefine B2B as a white-label family.
4. Tenant back-office work must not be mistaken for the whole B2B family.
5. Catalog/discovery cross-mode work must preserve B2B-specific business exchange posture rather
   than flattening it into public discovery semantics.
6. Orders, payments, identity, messaging, and governance families may connect to B2B but are not
   to be silently merged into the B2B family anchor.
7. B2B must not be described as an open marketplace or undifferentiated directory.

## 9. Explicit Non-Decisions

This artifact does not:

- redesign enterprise depth behavior in detail
- define white-label overlay normalization
- define tenant back-office family scope
- define cross-mode catalog family scope
- define B2C family scope
- define payments, messaging, identity, or orders family designs
- authorize implementation
- rewrite the broad v2 planning stack

Those moves belong to later bounded family units.

## 10. Readiness Outcome

Result of this artifact:

- `B2B Exchange Core` now has a current explicit family-level planning/design anchor
- future planning may lawfully cite this file when classifying what belongs inside B2B versus what
  belongs to overlay, control-plane, tenant-admin, or cross-cutting families
- future planning must no longer rely on diffuse launch/runtime references alone to infer the B2B
  family boundary