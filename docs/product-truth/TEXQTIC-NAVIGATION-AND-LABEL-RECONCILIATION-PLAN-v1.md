# TEXQTIC-NAVIGATION-AND-LABEL-RECONCILIATION-PLAN-v1

Status: PRODUCT-TRUTH / BOUNDED PLANNING ARTIFACT ONLY
Date: 2026-04-14
Authority posture: four-artifact-inheriting, planning-only, anti-drift reference

## 1. Purpose and Authority

This artifact records one bounded navigation and label reconciliation plan for TexQtic.

Its purpose is narrow:

- normalize visible shell, dashboard, route/grouping, workspace, and admin language so those labels
  no longer contradict the already-recorded architecture, provisioning, tenant-admin, and taxonomy
  truth
- classify which current labels may remain as continuity shorthand and which must be normalized in
  later implementation-facing work
- prevent WL, Aggregator, package, and runtime shorthand from being misread as peer-family,
  separate-office, or ownership-transferring authority

This artifact does not:

- modify Layer 0 governance posture
- reopen the locked architecture statement
- authorize runtime, route, schema, or contract mutation
- implement navigation, shell, route, taxonomy, provisioning, tenant-admin, or entitlement behavior
- replace the controlling vocabulary/state-map artifact, provisioning alignment matrix,
  tenant-admin surface matrix, or taxonomy propagation/exposure map

Usage rule:

- later bounded planning artifacts and implementation-facing planning must inherit this plan only
  together with the controlling vocabulary/state-map artifact, the provisioning alignment matrix,
  the tenant-admin surface matrix, and the taxonomy propagation/discovery-safe exposure map
- this artifact governs navigation/label interpretation, continuity-shorthand treatment, and
  contradiction-prevention rules only; it is not standalone implementation authority

Authority order used:

1. Layer 0 posture
   - `governance/control/OPEN-SET.md`
   - `governance/control/NEXT-ACTION.md`
   - `governance/control/BLOCKED.md`
   - `governance/control/SNAPSHOT.md`
2. Locked governance architecture truth
   - `docs/governance/control/GOV-OS-001-DESIGN.md`
3. Controlling normalization references
   - `docs/product-truth/TEXQTIC-RUNTIME-TAXONOMY-PROVISIONING-TENANT-ADMIN-CANONICAL-VOCABULARY-STATE-MAP-v1.md`
   - `docs/product-truth/TEXQTIC-PROVISIONING-ALIGNMENT-MATRIX-v1.md`
   - `docs/product-truth/TEXQTIC-TENANT-ADMIN-SURFACE-MATRIX-v1.md`
   - `docs/product-truth/TEXQTIC-TAXONOMY-PROPAGATION-AND-DISCOVERY-SAFE-EXPOSURE-MAP-v1.md`
4. Product-truth boundary anchors
   - `docs/product-truth/TEXQTIC-FINAL-FAMILY-INVENTORY-PLACEMENT-NORMALIZATION-v1.md`
   - `docs/product-truth/WHITE-LABEL-OVERLAY-NORMALIZATION-v1.md`
   - `docs/product-truth/AGGREGATOR-OPERATING-MODE-NORMALIZATION-v1.md`
   - `docs/product-truth/AGGREGATOR-IMPLEMENTATION-DESIGN-v1.md`
   - `docs/product-truth/TENANT-BACK-OFFICE-FAMILY-DESIGN-v1.md`
   - `docs/product-truth/B2B-EXCHANGE-OPERATING-MODE-DESIGN-v1.md`
   - `docs/product-truth/SUBSCRIPTION-ENTITLEMENT-NORMALIZATION-v1.md`
   - `docs/product-truth/TEXQTIC-ONBOARDING-PROVISIONING-HANDOFF-DESIGN-v1.md`
5. Descriptive evidence surfaces only
   - `docs/strategy/TENANT_DASHBOARD_MATRIX.md`
   - `docs/DASHBOARD_MATRIX_CONTROL_TENANT_WL.md`
   - `docs/strategy/CONTROL_CENTER_TAXONOMY.md`

## 2. Scope Boundary

Included:

- navigation and label drift classification across shell labels, dashboard headings, route/grouping
  language, workspace naming, admin naming, and plan/family shorthand
- canonical visible label classes for family, category, capability/overlay, plan, runtime,
  tenant-admin, downstream continuation, and platform supervision
- continuity-shorthand preservation rules versus normalization-required rules
- explicit rejection of labels that imply a separate full Aggregator office or full taxonomy
  ownership transfer

Excluded:

- runtime implementation
- schema, migration, or contract changes
- route rewrite or shell rewrite
- taxonomy implementation
- provisioning implementation
- tenant-admin implementation
- entitlement implementation
- CRM redesign
- Marketing redesign

This artifact is the navigation and label reconciliation plan only.

## 3. Inherited Controlling Truth

This plan inherits, without reinterpretation, all of the following:

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
- B2B owns the full internal textile taxonomy
- Aggregator may consume only the discovery-safe subset of that taxonomy
- no separate full Aggregator back office may be designed
- shared downstream continuation reached from Aggregator context remains downstream-owned rather than
  Aggregator-owned operating depth

## 4. Navigation and Label Drift This Plan Resolves

Current repo/product-truth drift requiring this plan is:

- descriptive dashboard surfaces still use `tenant type` as if it were full architecture truth
- WL shell and dashboard naming can still be over-read as if WL were a peer family rather than an
  overlay-enabled context
- Aggregator headings and module names still overstate a separate board, office, or downstream
  execution loop
- package/plan language still appears fused with family identity in labels such as `B2B
  Professional`
- shell names and runtime identity labels can be mistaken for stronger truth than canonical
  family/category/capability/package axes
- downstream modules reachable from Aggregator context can still be mislabeled as if they are
  Aggregator-owned operating depth
- discovery-oriented supplier/manufacturer/profile language can still be misread as full taxonomy
  ownership transfer into Aggregator

## 5. Canonical Navigation and Label Reconciliation Plan

| Visible label class | Example current label(s) | Canonical interpretation | May remain as continuity shorthand where explicitly bounded | Must be normalized in later implementation-facing work when used in | What it must not imply | Canonical bucket |
| --- | --- | --- | --- | --- | --- | --- |
| Base family label | `B2B`, `B2C` | Canonical base commercial family truth | headings, workspace titles, dashboard sections, route-group descriptions, and admin references where the family itself is truly being described | any surface where a plan, overlay, or runtime label is fused into the family heading | capability/overlay truth, plan truth, or platform-supervision truth | Base family truth |
| Non-commercial category label | `INTERNAL` | Canonical non-commercial category truth | runtime/workspace continuity and platform-internal classification surfaces | any label set that presents `INTERNAL` as a third commercial family or a package | peer commercial family status | Non-commercial category truth |
| White-label overlay label | `White-Label Overlay`, `WL overlay`, `WL enabled` | Bounded capability/overlay truth on top of a lawful parent family | overlay badges, overlay sections, branded-experience notes, and overlay-specific navigation group labels that explicitly preserve the parent family | workspace headings, tenant-type headings, or board titles that would make WL look like a peer family or standalone operating model | peer-family status, replacement of B2B/B2C parent truth, or whole tenant-admin/control-plane authority | Capability / overlay truth |
| White-label admin label | `WL Admin`, `WhiteLabelAdminShell`, `Store Admin`, `Brand Operator` | Bounded overlay-admin surface tied to branded runtime continuity | code-facing shell names, compatibility notes, and displayed operator labels where the overlay-owned nature is explicit | any authoritative dashboard, route-group, or workspace heading that treats WL admin as the whole tenant-admin family | full tenant back office, full control-plane, or separate commercial pillar status | Capability overlay |
| Aggregator capability/workspace label | `Aggregator workspace`, `Curated Directory`, `Intent-Handoff Workspace`, `AggregatorShell` | Bounded discovery, inspection, qualification, and handoff context | code-facing shell names, compatibility notes, bounded workspace naming, and discovery-first headings where the limited scope is explicit | any matrix heading, route-group label, or sidebar grouping that makes Aggregator look like a peer family, a full office, or a full execution owner | peer-family authority, separate full back office, full taxonomy ownership, or full exchange execution ownership | Runtime / workspace continuity plus capability truth |
| Aggregator overclaim label | `Platform Orchestrator`, `Supplier Network`, `Buyer Network`, `RFQ Routing`, `Negotiation Hub`, `Network Revenue`, `Multi-party Threads` inside Aggregator board-level grouping | Historical or descriptive overhang only; not current canonical truth | preserved historical evidence only when clearly marked descriptive/non-authoritative | dashboard/module declarations, shell groupings, route groups, and planning authority surfaces | Aggregator-owned downstream execution depth, negotiated network economics, or transaction-office authority | Prohibited misleading shorthand unless separately reclassified |
| Plan / package label | `FREE`, `STARTER`, `PROFESSIONAL`, `ENTERPRISE` | Canonical commercial / entitlement axis only | plan badges, billing/admin metadata, control-plane plan visibility, and explicit package selectors or summaries | family headings, tenant-type headings, workspace titles, or shell names | family identity, capability identity, or runtime-mode identity | Package / plan truth |
| Legacy or grouped plan shorthand | `TRIAL`, `PAID`, `BASIC`, `B2B Professional`, `Tenant Plans` when used as type shorthand | display-only or legacy grouping language, not canonical family truth | transitional display groupings or historical references only when explicitly marked display-only or split into family plus plan metadata | headings, canonical matrix rows, workspace titles, and routing labels | fused family/plan identity or proof of canonical entitlement semantics | Prohibited misleading shorthand unless separated |
| Runtime identity / tenant-type label | `Tenant Type`, `AGGREGATOR`, `B2B`, `B2C`, `White-Label Tenant` in runtime-facing grouping | convenience routing/workspace shorthand interpreted through the canonical axes | runtime compatibility notes, route-group continuity, provisioning/runtime visibility, and admin display where the underlying axes remain explicit elsewhere | canonical planning headings, authoritative taxonomy/family statements, and any surface that omits the separate family/category/capability/package interpretation | stronger authority than canonical family/category/capability/package truth | Runtime / workspace continuity |
| Common tenant-admin core label | `Tenant Back Office`, `Org Profile`, `Membership & RBAC`, `Integrations`, `Workspace Settings` | Canonical common tenant-owned administrative continuity across lawful parent contexts | shared tenant navigation, admin-domain groupings, and workspace-operating sections | family-owned office labels or overlay-owned whole-office labels | B2B family replacement, B2C family replacement, WL whole-family truth, or Aggregator separate office truth | Common-core admin label |
| Family overlay label | `B2B tenant-admin overlay`, `B2C operator admin overlay`, exchange/admin depth labels | bounded family-specific admin depth attached to the common core | family-specific admin subsections where the common core remains primary | top-level workspace naming or shell naming that makes the overlay look like a separate office | whole-family replacement or stand-alone office proliferation | Family overlay |
| Capability overlay label | `WL admin overlay`, `Aggregator capability surface` | bounded capability-specific surface attached to the common core or bounded workspace | local subsections and bounded navigation groupings where the overlay/capability nature is explicit | top-level office naming, tenant-type headings, or admin architecture summaries | whole tenant-admin family, peer-family authority, or separate office truth | Capability overlay |
| Downstream continuation label | `Orders`, `Trades`, `Traceability`, `Certifications`, `Settlement`, `Team`, `Shared continuation` reached from Aggregator context | downstream or shared tenant continuity owned elsewhere | secondary navigation or continuation breadcrumbs that explicitly mark the surface as downstream, shared, or inherited platform access | Aggregator module declarations, Aggregator board-level navigation, or workspace labels that present these as native Aggregator-owned depth | Aggregator-owned execution loop, negotiation office, or full taxonomy office | Downstream continuation |
| Platform-supervision label | `Control Plane`, `SuperAdmin`, `Platform Control`, `Governance & Risk`, `Finance`, `Operations`, `Control Towers` | platform-supervisory cross-tenant navigation and governance labeling | control-plane navigation, tower groupings, and supervisory dashboards | tenant-admin headings, family-owned workflow naming, or tenant workspace naming | tenant-owned admin continuity or commercial family identity | Platform supervision |
| Taxonomy/discovery boundary label | `Supplier / Manufacturer Capability Directory`, `company discovery`, `counterparty profile`, `manufacturer profile` in Aggregator context | discovery-safe subset exposure only, derived from B2B-owned taxonomy truth | discovery cards, inspection headings, and bounded directory/profile labels where they are explicitly discovery-safe and non-owning | headings or navigation groups that suggest Aggregator owns the full textile taxonomy or supplier/manufacturer classification model | full taxonomy ownership transfer, full participant-classification administration, or B2B execution ownership | Discovery-safe subset / prohibited transfer guard |

## 6. Continuity-Shorthand vs Canonical-Truth Rules

- Existing shell class names and runtime identifiers may remain as code-facing continuity shorthand,
  but they must not be reused as the sole architecture authority in planning-facing labels.
- `tenant type` may remain only as a convenience display or runtime grouping label when the
  underlying family/category/capability/package axes remain separately visible or otherwise fixed by
  stronger authority.
- A label may remain as shorthand only if its immediate context makes the parent family, overlay,
  plan, or downstream-ownership boundary explicit enough that the shorthand cannot be reasonably
  read as stronger truth.
- When a heading, sidebar group, dashboard row, workspace title, or route grouping can be read as
  peer-family truth, separate-office truth, or ownership transfer, that label must be normalized in
  later implementation-facing work.
- Plan labels may appear as badges, summaries, or administrative metadata, but family headings and
  workspace names must split plan/package from family identity.
- Aggregator-facing labels may preserve `workspace`, `directory`, or `intent-handoff` shorthand, but
  any shared downstream destination reached from Aggregator context must be labeled as downstream,
  shared, or inherited continuation rather than Aggregator-owned depth.
- WL labels may preserve branded operator continuity, but any displayed label must still make it
  clear that the branded surface overlays a lawful parent family instead of replacing it.

## 7. Allowed and Disallowed Label Interpretations

Allowed:

- `B2B` and `B2C` may remain direct visible family labels because they are canonical family truth.
- `White-Label Overlay` or `WL enabled` may remain visible when clearly attached to a lawful parent
  family or branded operator context.
- `Aggregator workspace` and `Curated Directory` may remain visible when they are explicitly limited
  to discovery, inspection, qualification, and handoff.
- `Control Plane`, `SuperAdmin`, and the four control-tower groupings may remain visible because
  they are platform-supervision labels, not tenant-family labels.
- downstream destinations reached from Aggregator context may remain visible if they are framed as
  downstream or shared continuation rather than native Aggregator modules.

Disallowed:

- treating WL labels as a peer family, standalone tenant type, or substitute for the whole
  tenant-admin family
- treating Aggregator labels as a peer family, separate full office, or owner of downstream
  execution, negotiation, finance, or full taxonomy administration
- treating package/plan labels as if they define family identity, tenant type, or runtime mode
- treating shell names, route-group names, or runtime identity labels as stronger than canonical
  family/category/capability/package truth
- treating supplier/manufacturer/profile labels in Aggregator context as proof that full B2B
  taxonomy ownership transferred into Aggregator

## 8. Blockers and Edge Conditions Inside The Plan Boundary

- descriptive dashboard matrices still carry older authority claims such as `canonical dashboard
  surfaces for each tenant type` and `authoritative dashboard surface definition`, so later
  implementation-facing work must normalize labels without accidentally re-promoting those older
  documents above the four controlling artifacts and this plan
- current code-facing shell names and route/group references may need to remain for compatibility,
  so this plan preserves continuity shorthand rather than requiring immediate renaming
- White Label Co remains a preserved Layer 0 hold, but that hold does not block this artifact
  because the pass inherits existing WL overlay truth and does not reopen WL completeness or
  disposition

## 9. Readiness Outcome

Result of this artifact:

- TexQtic now has one bounded navigation and label reconciliation plan that inherits the four
  controlling anti-drift artifacts without reinterpretation
- visible label classes, continuity shorthand rules, and prohibited interpretations are separated
  explicitly
- later planning or implementation-facing work can normalize shell, dashboard, route, and workspace
  language without reopening architecture or drifting back into WL, Aggregator, plan, runtime, or
  downstream-ownership contradictions
