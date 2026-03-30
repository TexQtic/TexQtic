---
unit_id: AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS
title: Bounded opening draft for the first lawful Aggregator discovery workspace truthfulness unit
type: OPENING_DRAFT
status: OPENING_DRAFT_ONLY
wave: W5
plane: TENANT
commit: N/A
evidence: N/A
doctrine_constraints:
  - FIRST OPENING CANDIDATE only; do not merge counterparty inspection, intent capture, downstream handoff visibility, AI contextualization, or broader Aggregator redesign into this unit
  - AGGREGATOR-OWNED and READ-FIRST only; keep the unit on the Aggregator home/discovery surface and treat backend read support as CONDITIONAL BACKEND SUPPORT ONLY
  - No Layer 0 edits, governance sync, runtime implementation, schema/migration work, contract expansion, or TECS opening execution occur in this draft step
  - Opening validity fails if truthful discovery requires slice 2 or slice 3 scope in the same unit, or if unbounded schema/directory-model work is discovered
decisions_required: []
blockers: []
---

# 1. Unit Identity

- exact unit name: `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS`
- mode/status: `OPENING DRAFT ONLY`
- scope label: `bounded Aggregator first-opening candidate`
- opening class: `FIRST OPENING CANDIDATE`
- ownership posture: `AGGREGATOR-OWNED`
- implementation posture if later opened: `READ-FIRST`

# 2. Why This Unit Exists

Current repo truth keeps Aggregator locked in launch scope, but the reviewed runtime still stops at a largely static discovery/promo surface in `App.tsx`. Aggregator shell presence, tenant-category identity, provisioning support, and AI insight support are real, but they do not yet amount to a materially truthful Aggregator-owned discovery workspace.

This unit exists to open the smallest lawful correction to that defect:

- make the Aggregator home/discovery surface materially truthful
- keep the correction on an Aggregator-owned surface
- avoid early coupling to inquiry semantics, downstream RFQ/trade ownership, or broader directory/orchestrator claims

This is the lawful first candidate because approved product-truth authority already concluded:

- the Aggregator model is fixed as `Curated Directory and Intent-Handoff Workspace`
- the first implementation slice is `Discovery workspace truthfulness`
- later slices are more coupled, more optional, or both

Why the other slices are not included:

- `Counterparty inspection` is not included because a detail surface without truthful discovery continuity risks becoming another isolated decorative page
- `Intent capture` is not included because current repo truth ties the closest existing workflow to catalog-item-centered RFQ semantics, which is too coupled for the first opening
- `Downstream handoff visibility` is not included because it depends on an already-created intent/handoff object
- `AI insight contextualization` is not included as a primary goal because it is supportive only and does not close the core truth defect by itself

# 3. Repo-Truth Basis

This opening draft follows the approved authority chain in this order:

1. Layer 0 posture in `governance/control/OPEN-SET.md`, `NEXT-ACTION.md`, `SNAPSHOT.md`, `BLOCKED.md`, and `governance/log/EXECUTION-LOG.md`
2. TECS doctrine in `TECS.md`
3. Launch overlay authority in:
   - `docs/product-truth/TEXQTIC-LAUNCH-READINESS-REQUIREMENTS-v1.md`
   - `docs/product-truth/TEXQTIC-LAUNCH-SCOPE-DECISION-RECORD-v1.md`
   - `docs/product-truth/TEXQTIC-LAUNCH-PLANNING-SPLIT-v1.md`
4. Aggregator authority in:
   - `docs/product-truth/AGGREGATOR-OPERATING-MODE-DESIGN-GATE-v1.md`
   - `docs/product-truth/AGGREGATOR-OPERATING-MODE-NORMALIZATION-v1.md`
   - `docs/product-truth/AGGREGATOR-IMPLEMENTATION-DESIGN-v1.md`
   - `docs/product-truth/AGGREGATOR-BOUNDED-TECS-OPENING-CANDIDATE-ANALYSIS-v1.md`
5. Active `-v2` planning stack in:
   - `docs/product-truth/TEXQTIC-GAP-REGISTER-v2.md`
   - `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v2.md`
   - `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v2.md`

Repo-truth conclusions this unit inherits directly:

- Aggregator remains `LOCKED IN FOR LAUNCH`
- the approved normalized model is fixed as `Curated Directory and Intent-Handoff Workspace`
- the implementation-design artifact defines `Discovery workspace truthfulness` as slice 1
- the candidate-analysis artifact selects that slice as the `FIRST OPENING CANDIDATE`
- this unit therefore follows the approved normalized model and must not reopen the design-gate question

# 4. Objective

The exact objective of this unit is to make the Aggregator home/discovery surface materially truthful as a bounded curated discovery workspace rather than a static promotional card set, while preserving the approved Aggregator stop boundary: discovery becomes real, trust-signaled, and meaningfully browseable, but no counterparty-detail continuity, intent capture, handoff creation, downstream workflow ownership, or orchestrator behavior enters the unit.

# 5. Included Scope

Included scope is limited to the following:

- `AGGREGATOR-OWNED` Aggregator home/discovery surface currently anchored in `App.tsx`
- curated discovery entries rendered as real list items, cards, or equivalent bounded discovery records
- minimal list-level trust-signaled cues such as verification-oriented or capability-oriented summary signals
- minimum read-only data shaping needed to make the discovery surface truthful
- `CONDITIONAL BACKEND SUPPORT ONLY` if no truthful read source exists already through the current tenant/org truth
- optional bounded reuse of `services/aiService.ts` market insight support only if it remains secondary, non-blocking, and clearly subordinate to the discovery list itself

Explicit scope posture:

- `READ-FIRST`
- `BOUNDED`
- `CONDITIONAL BACKEND SUPPORT ONLY`

Scope conclusions required for later implementation if this unit opens:

- the unit should stay mostly read-only
- dedicated Aggregator UI components are implied rather than keeping all discovery rendering inside `App.tsx` alone
- `App.tsx` may remain an orchestration/entry surface, but it is not the preferred sole implementation surface for a truthful discovery workspace

# 6. Explicitly Excluded Scope

`OUT OF SCOPE` for this unit:

- counterparty detail continuity
- intent capture
- handoff creation
- downstream ownership changes
- RFQ changes
- trade changes
- order changes
- negotiation flows
- matching flows
- routing flows
- network-management consoles
- supplier-network administration
- buyer-network administration
- broad schema redesign
- broad directory/network model redesign
- public marketplace redesign
- Aggregator-owned settlement, escrow, invoice, revenue, or take-rate logic
- strategy-level platform-orchestrator expansion

More specific exclusions:

- do not treat shared shell access to trades, orders, certifications, traceability, escrow, settlement, or audit logs as part of this unit's acceptance proof
- do not use static copy cleanup alone as sufficient truth closure if real discovery data shaping is required
- do not absorb slice 2 (`Counterparty inspection`) or slice 3 (`Intent capture and confirmation`) into this opening

# 7. Allowed File Families

The future implementation allowlist for this unit, if later opened lawfully, should remain conservative.

Primary likely file families:

- `App.tsx`
- one or more new Aggregator-specific UI component files under `components/`

Conditional file families only if unavoidable:

- one narrow tenant service file for read support, most likely `services/tenantService.ts` or one new bounded Aggregator-specific service surface
- one narrow tenant backend read surface under `server/src/routes/tenant.ts` or one new tenant-scoped route file only if current repo truth cannot support the discovery read from existing tenant/org data

Condition rules:

- backend read support is `UNKNOWN / VERIFY IN REPO` until implementation discovery confirms whether current tenant or organization truth is enough
- schema work is not assumed, not pre-authorized, and not part of this draft allowlist
- AI insight reuse may remain in-scope only if it is a secondary enhancement and does not widen the unit beyond discovery truthfulness

# 8. Forbidden File Families

The following file families must be treated as forbidden in this unit unless a later separate lawful change explicitly re-bounds the work:

- all Layer 0 files under `governance/control/`
- governance sync files and execution-log synchronization surfaces
- broad trade workflow files beyond read-only linkage assumptions
- settlement, escrow, and order execution files
- broad schema, migration, and SQL families
- control-plane tenant-ops deep-dive surfaces
- B2B, B2C, or white-label continuity surfaces unrelated to Aggregator discovery
- RFQ detail, RFQ submission, supplier response, or trade-creation workflow surfaces
- broad contract files where a narrow read-only tenant surface would suffice

Examples of forbidden families for this unit boundary:

- `server/prisma/migrations/`
- `server/prisma/*.sql`
- broad edits to `shared/contracts/`
- `components/Tenant/BuyerRfq*`
- `components/Tenant/Trades*`
- control-plane files under `components/ControlPlane/`

# 9. Acceptance Criteria

Acceptance for this unit, if later opened, should require all of the following:

- the Aggregator discovery surface becomes materially truthful rather than primarily promotional
- static promo-only behavior no longer carries the discovery claim by itself
- the surface exposes real curated discovery entries, cards, or equivalent list records
- minimal list-level trust-signaled discovery cues are present
- no counterparty detail continuity is introduced
- no intent, inquiry, or handoff semantics are introduced
- the `AGGREGATOR-OWNED` stop boundary remains preserved on the discovery surface only
- no scope drift into downstream RFQ, trade, order, escrow, settlement, or negotiation workflows occurs
- any added backend support remains read-only, narrow, and specific to the discovery surface
- shared tenant continuity outside the discovery surface remains non-regressed

Drift-prevention acceptance rule:

- the unit must be able to close successfully without creating a selected-company detail page or a submit-intent action

# 10. Rejection / Escalation Triggers

`REJECTION TRIGGER` conditions for implementation of this unit:

- truthful discovery cannot be achieved without introducing counterparty detail in the same unit
- truthful discovery cannot be achieved without introducing intent/handoff semantics in the same unit
- the discovery slice requires unbounded schema work before any user-visible truth can improve
- the discovery slice requires a broad cross-tenant directory model rather than a narrow read-first discovery model
- the unit drifts into a company-network console or supplier-management surface rather than remaining a bounded discovery workspace

`UNKNOWN / VERIFY IN REPO` escalation points:

- whether current tenant/org truth can populate a minimal read-first discovery surface without new backend contract work
- whether a narrow tenant-plane read route is unavoidable
- whether a dedicated Aggregator-specific service surface is cleaner than reusing existing tenant service files

Escalation rule:

- if any of the above unknowns force slice 2 or slice 3 scope, stop and re-scope rather than widening this unit silently

# 11. Verification Requirements

Before this unit could later be considered complete, verification must prove:

- user-visible discovery truth is materially improved on the Aggregator home/discovery surface
- the implementation touched only the bounded allowlist selected for the unit
- no later-slice behavior was introduced by implication
- no counterparty-detail route or detail panel became part of the unit
- no inquiry, RFQ, trade, or handoff creation behavior became part of the unit
- the Aggregator-owned stop boundary remains preserved
- any conditional backend support remained read-only and narrowly scoped
- neighboring shared tenant continuity remained non-regressed

Verification categories to require later:

- bounded UI truth verification
- bounded file-family compliance verification
- absence-of-scope-drift verification
- non-regression verification for shared tenant continuity used by the surrounding shell

# 12. Boundaries and Non-Decisions

This draft does not:

- open the unit by itself
- authorize implementation
- revise launch scope
- decide the later slice order beyond confirming this first candidate
- solve intent, handoff, or downstream ownership questions
- authorize schema changes
- authorize contract expansion by default
- decide the final data model for Aggregator directory records

Non-decision clarification:

- this draft preserves the approved Aggregator boundary but does not resolve the later questions of counterparty detail, intent capture, or downstream handoff design

# 13. Completion / Readiness Note

`READY FOR LAWFUL OPENING DECISION`

Strict justification:

- the bounded problem is clear
- the first-candidate selection is already settled by approved product-truth authority
- the stop boundary is explicit enough to prevent later-slice drift
- the allowlist can remain small enough for TECS if backend support stays conditional and narrow
- remaining uncertainty is bounded to `UNKNOWN / VERIFY IN REPO` read-support shape, not to Aggregator scope itself
