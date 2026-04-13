# TEXQTIC-PROVISIONING-ALIGNMENT-MATRIX-v1

Status: PRODUCT-TRUTH / BOUNDED PLANNING ARTIFACT ONLY
Date: 2026-04-13
Authority posture: vocabulary-state-map-inheriting, planning-only, anti-drift reference

## 1. Purpose and Authority

This artifact records one bounded provisioning alignment matrix for TexQtic.

Its purpose is narrow:

- align provisioning terminology to the controlling vocabulary/state-map artifact
- separate recommendation language from canonical persisted ownership language
- prevent provisioning-stage drift from collapsing family, non-commercial category, capability,
  package, runtime identity, and stage identity into one overloaded classification surface

This artifact does not:

- modify Layer 0 governance posture
- reopen the locked architecture statement
- authorize runtime, route, schema, or contract mutation
- redesign CRM or Marketing
- implement provisioning, activation, entitlement, taxonomy propagation, or tenant-admin behavior
- replace the controlling vocabulary/state-map artifact

Usage rule:

- later bounded planning artifacts and implementation-facing planning must inherit this matrix only
  together with the controlling vocabulary/state-map artifact
- this artifact governs provisioning terminology, ownership boundaries, and allowed interpretation
  patterns only; it is not standalone implementation authority

Authority order used:

1. Layer 0 posture
   - `governance/control/OPEN-SET.md`
   - `governance/control/NEXT-ACTION.md`
   - `governance/control/BLOCKED.md`
   - `governance/control/SNAPSHOT.md`
2. Locked governance architecture truth
   - `docs/governance/control/GOV-OS-001-DESIGN.md`
3. Controlling normalization reference
   - `docs/product-truth/TEXQTIC-RUNTIME-TAXONOMY-PROVISIONING-TENANT-ADMIN-CANONICAL-VOCABULARY-STATE-MAP-v1.md`
4. Product-truth inputs
   - `docs/product-truth/TEXQTIC-FINAL-FAMILY-INVENTORY-PLACEMENT-NORMALIZATION-v1.md`
   - `docs/product-truth/WHITE-LABEL-OVERLAY-NORMALIZATION-v1.md`
   - `docs/product-truth/AGGREGATOR-OPERATING-MODE-NORMALIZATION-v1.md`
   - `docs/product-truth/SUBSCRIPTION-ENTITLEMENT-NORMALIZATION-v1.md`
   - `docs/product-truth/TEXQTIC-ONBOARDING-PROVISIONING-HANDOFF-DESIGN-v1.md`
   - `docs/product-truth/TENANT-BACK-OFFICE-FAMILY-DESIGN-v1.md`
   - `docs/product-truth/B2B-EXCHANGE-OPERATING-MODE-DESIGN-v1.md`
5. Descriptive evidence surfaces only
   - `docs/strategy/TENANT_DASHBOARD_MATRIX.md`
   - `docs/DASHBOARD_MATRIX_CONTROL_TENANT_WL.md`
   - `docs/strategy/CONTROL_CENTER_TAXONOMY.md`

## 2. Scope Boundary

Included:

- provisioning-language drift classification
- canonical stage-by-stage terminology and ownership boundaries
- allowed family/category/capability/package values at planning level
- recommendation-versus-canonical truth separation rules
- allowed versus disallowed state interpretation patterns

Excluded:

- runtime implementation
- schema, migration, or contract changes
- provisioning or activation implementation
- CRM redesign
- Marketing redesign
- tenant-admin surface matrix authoring
- taxonomy propagation/exposure map authoring
- navigation or shell reconciliation authoring

This artifact is the provisioning alignment matrix only.

## 3. Inherited Controlling Truth

This matrix inherits, without reinterpretation, all of the following:

- base commercial families remain `B2B` and `B2C`
- `INTERNAL` remains a non-commercial category
- `WHITE_LABEL` remains an overlay/capability, not a peer family
- `AGGREGATOR` remains a cross-family capability and bounded runtime/workspace context, not a peer
  family
- package/plan remains a separate commercial and entitlement axis
- Marketing remains non-canonical interest capture only
- CRM remains normalized pre-provisioning recommendation and handoff only
- provisioning/runtime remains the first canonical persisted owner of family/package truth
- tenant-admin remains one common core with bounded overlays
- B2B owns the full internal textile taxonomy and Aggregator consumes only the discovery-safe
  subset

## 4. Provisioning Drift This Matrix Resolves

Current repo/product-truth drift requiring this matrix is:

- intake-stage recommendation language can be mistaken for canonical assignment language
- approved onboarding can be misread as if it already owns final runtime family/package truth
- provisioning, activation, and runtime language can blur into one generic `tenant type` story
- capability and overlay labels can be mistaken for base-family assignment at provisioning time
- plan/package labels can be mistaken for tenant family or stage identity
- runtime identity labels can be mistaken for full architecture truth
- descriptive dashboard surfaces can over-read identity, package, and capability terms as if they
  were all owned by one stage

## 5. Canonical Provisioning Alignment Matrix

| Stage term | Canonical stage role | What may be recommended at this stage | What may become canonical at this stage | What this stage must not own | Family/category/capability/package/runtime separation rule | Recommendation versus persisted truth rule |
| --- | --- | --- | --- | --- | --- | --- |
| `Marketing intake` | non-canonical interest capture | likely parent family fit, likely capability interest, broad commercial packaging interest, high-level runtime path hints | nothing | final family assignment, final non-commercial category assignment, final capability assignment, final package assignment, canonical runtime identity | family, capability, package, and runtime labels are descriptive only here | all outputs remain advisory and disposable until later stages |
| `CRM normalization and handoff` | pre-provisioning recommendation and routing | normalized recommendation for `B2B` or `B2C`, potential `INTERNAL` classification signal, potential `WHITE_LABEL` or `AGGREGATOR` capability relevance, provisional package recommendation | nothing | persisted family truth, persisted package truth, final runtime identity ownership | CRM may recommend multiple axes separately but must not collapse them into one tenant-type field | CRM language remains recommendation/handoff language only |
| `Approved onboarding` | eligibility confirmation | confirmation that the tenant/prospect is eligible to enter provisioning continuity, carry-forward of recommended family/capability/package posture for review | nothing beyond eligibility state | final persisted family/package/runtime ownership | onboarding state is not family identity, capability identity, package identity, or runtime identity | approval confirms readiness to provision, not that canonical assignment is already owned |
| `Provisioning assignment` | first canonical persisted assignment boundary | no new speculative recommendation should be invented here beyond the reviewed handoff inputs | canonical family or non-commercial category, canonical capability/overlay posture, canonical package/plan, canonical runtime identity record | CRM-style speculation, dashboard shorthand, shell-derived classification | family/category, capability, package, and runtime identity must be persisted as separate axes rather than one fused tenant-type label | this is the first stage where persisted truth becomes canonical |
| `First-owner activation / owner-ready handoff` | activation and entry continuity consumer of provisioning truth | none except bounded entry guidance based on already assigned truth | no new family/capability/package assignment; only activation continuity status may become canonical here | reclassification of family, category, capability, package, or runtime identity | activation consumes existing canonical assignment; it does not redefine it | activation may expose canonical truth but must not mutate classification meaning |
| `Active runtime` | canonical persisted operating state | none; runtime may expose already-owned truth and bounded display/grouping labels | canonical persisted family/category/capability/package/runtime posture remains live operating truth | top-of-funnel recommendation language, speculative reassignment, shell-as-authority logic | runtime identity labels may appear for routing and UX continuity, but they do not override family/category/capability/package truth | persisted runtime truth wins over any earlier recommendation or later shorthand |

## 6. Stage Ownership Rules

- `B2B` and `B2C` are the only allowed base commercial family values in provisioning ownership.
- `INTERNAL` is the only allowed non-commercial category value in provisioning ownership.
- `WHITE_LABEL` and `AGGREGATOR` are allowed only as bounded capability/overlay or bounded
  runtime/workspace context values; they are never base-family replacements.
- `FREE`, `STARTER`, `PROFESSIONAL`, and `ENTERPRISE` are the only allowed canonical package/plan
  values.
- Marketing may describe likely fit, but it owns no canonical classification state.
- CRM may normalize and recommend, but it owns no canonical persisted classification state.
- approved onboarding owns eligibility only; it does not own final family/category/capability/
  package/runtime truth.
- provisioning is the first stage that may canonically persist family/category/capability/package/
  runtime truth.
- first-owner activation may only consume and expose already-assigned provisioning truth; it must
  not reclassify it.
- active runtime is the live operating owner of the persisted provisioning assignment until a later
  separately authorized lifecycle change updates it.

## 7. Allowed and Disallowed Planning-Level State Interpretations

Allowed interpretation patterns:

- `B2B` or `B2C` may be assigned as the base family while `WHITE_LABEL` is present as an overlay.
- `B2B` or `B2C` may remain the canonical family while `AGGREGATOR` appears as a bounded capability
  or runtime/workspace context.
- `INTERNAL` may exist without a commercial family assignment because it is a non-commercial
  category, not a third family.
- canonical package/plan values may coexist with any lawful family/category/capability posture as a
  separate axis.
- runtime identity labels may appear in routing, provisioning records, or UX continuity so long as
  they are interpreted through the separate canonical axes.

Disallowed interpretation patterns:

- treating `WHITE_LABEL` as a peer family or as standalone family truth
- treating `AGGREGATOR` as a peer family or as full exchange/runtime-office truth
- treating package/plan values as family identity
- treating approved onboarding as if it already owns canonical persisted family/package truth
- treating activation as if it is the stage that authoritatively classifies family/capability/
  package posture
- treating shell labels, route labels, or dashboard labels as stronger than persisted runtime truth
- collapsing family, capability, package, and runtime identity into one undifferentiated `tenant
  type`

## 8. Allowed Value Set Reference

| Axis | Allowed canonical values | Special interpretation rule |
| --- | --- | --- |
| Base commercial family | `B2B`, `B2C` | only these values may satisfy the base-family axis |
| Non-commercial category | `INTERNAL` | never interpreted as a third commercial family |
| Capability / overlay | `WHITE_LABEL`, `AGGREGATOR` | additive or bounded-context values only; never base-family replacements |
| Package / plan | `FREE`, `STARTER`, `PROFESSIONAL`, `ENTERPRISE` | always separate from family/category/capability identity |
| Runtime identity | bounded routing/workspace labels derived from canonical assignment | may appear in runtime records or UX, but must not override the canonical axes |

## 9. Blockers and Edge Conditions Inside The Matrix Boundary

- current descriptive surfaces still use `tenant type`, plan, and overlay language loosely, so this
  matrix must be treated as the stronger normalization reference for provisioning interpretation
  until later bounded reconciliation work updates those surfaces
- Aggregator remains present in provisioning and runtime identity surfaces; this matrix therefore
  preserves its presence only as bounded capability/workspace context rather than treating that
  current identity presence as peer-family authority
- White Label Co remains a preserved Layer 0 hold, but that hold does not block authoring this
  matrix because the matrix inherits existing WL overlay truth and does not reopen WL completeness
  or disposition

## 10. Readiness Outcome

Result of this artifact:

- TexQtic now has one bounded provisioning alignment matrix that inherits the controlling
  vocabulary/state-map artifact
- recommendation language and canonical persisted ownership language are separated stage by stage
- later implementation-facing planning can use a tighter provisioning interpretation baseline
  without reopening architecture or widening into implementation
