# TEXQTIC-TENANT-ADMIN-SURFACE-MATRIX-v1

Status: PRODUCT-TRUTH / BOUNDED PLANNING ARTIFACT ONLY
Date: 2026-04-13
Authority posture: vocabulary-and-provisioning-matrix-inheriting, planning-only, anti-drift reference

## 1. Purpose and Authority

This artifact records one bounded tenant-admin surface matrix for TexQtic.

Its purpose is narrow:

- separate the common tenant back-office core from bounded family overlays and bounded capability
  overlays
- prevent WL and Aggregator surfaces from drifting into false peer-family admin structures
- classify shared continuation surfaces, bounded overlay-owned surfaces, and platform supervision
  surfaces without widening into implementation

This artifact does not:

- modify Layer 0 governance posture
- reopen the locked architecture statement
- authorize runtime, route, schema, or contract mutation
- implement tenant-admin, provisioning, entitlement, taxonomy, or navigation behavior
- replace the controlling vocabulary/state-map artifact or the provisioning alignment matrix

Usage rule:

- later bounded planning artifacts and implementation-facing planning must inherit this matrix only
  together with the controlling vocabulary/state-map artifact and the provisioning alignment matrix
- this artifact governs tenant-admin surface interpretation only; it is not standalone
  implementation authority

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
4. Product-truth boundary anchors
   - `docs/product-truth/TENANT-BACK-OFFICE-FAMILY-DESIGN-v1.md`
   - `docs/product-truth/TEXQTIC-FINAL-FAMILY-INVENTORY-PLACEMENT-NORMALIZATION-v1.md`
   - `docs/product-truth/WHITE-LABEL-OVERLAY-NORMALIZATION-v1.md`
   - `docs/product-truth/AGGREGATOR-OPERATING-MODE-NORMALIZATION-v1.md`
   - `docs/product-truth/AGGREGATOR-IMPLEMENTATION-DESIGN-v1.md`
   - `docs/product-truth/B2B-EXCHANGE-OPERATING-MODE-DESIGN-v1.md`
   - `docs/product-truth/SUBSCRIPTION-ENTITLEMENT-NORMALIZATION-v1.md`
5. Descriptive evidence surfaces only
   - `docs/strategy/TENANT_DASHBOARD_MATRIX.md`
   - `docs/DASHBOARD_MATRIX_CONTROL_TENANT_WL.md`
   - `docs/strategy/CONTROL_CENTER_TAXONOMY.md`

## 2. Scope Boundary

Included:

- tenant-admin surface drift classification
- canonical surface classes for common core, family overlays, capability overlays, shared
  continuation, and platform supervision
- exact separation of tenant-owned versus platform-supervisory surfaces
- explicit rejection of a separate full Aggregator back office
- bounded interpretation rules for shared surfaces versus overlay-owned surfaces

Excluded:

- runtime implementation
- schema, migration, or contract changes
- tenant-admin implementation
- provisioning implementation
- entitlement implementation
- taxonomy propagation/exposure authoring
- navigation or shell reconciliation authoring
- CRM redesign
- Marketing redesign

This artifact is the tenant-admin surface matrix only.

## 3. Inherited Controlling Truth

This matrix inherits, without reinterpretation, all of the following:

- base commercial families remain `B2B` and `B2C`
- `INTERNAL` remains a non-commercial category
- `WHITE_LABEL` remains an overlay/capability, not a peer family
- `AGGREGATOR` remains a cross-family capability and bounded runtime/workspace context, not a peer
  family
- package/plan remains a separate commercial and entitlement axis
- provisioning/runtime remains the first canonical persisted owner of family/package truth
- tenant-admin remains one common core with bounded overlays
- no separate full Aggregator back office may be designed
- platform control-plane and superadmin surfaces remain platform supervision, not tenant admin

## 4. Tenant-Admin Drift This Matrix Resolves

Current repo/product-truth drift requiring this matrix is:

- shell and dashboard surfaces can make partial admin exposure look like separate family-owned
  offices
- WL-admin can be over-read as if it defines the whole tenant-admin family rather than a bounded
  overlay-admin slice
- Aggregator workspace identity and shared downstream navigation can be over-read as if they prove a
  full Aggregator back office
- descriptive matrices can mix common tenant-admin continuity with B2B, B2C, WL, and Aggregator
  operating depth without one common-core boundary
- control-plane deep-dive and tenant-facing admin language can blur into one blended admin model

## 5. Canonical Tenant-Admin Surface Matrix

| Surface class | Canonical owner / classification | Exact meaning | What the surface may truthfully contain | What the surface must not imply | Matrix bucket | Surface logic class |
| --- | --- | --- | --- | --- | --- | --- |
| Workspace identity and org profile admin | Tenant Back Office | Tenant-owned workspace identity, organization profile, basic status visibility, and lawful self-description | org profile, tenant-owned identity fields, basic tenant status visibility, tenant-owned profile settings | whole B2B office, whole B2C office, WL-only admin, or platform supervision | Common tenant back-office core | Common core |
| Membership, staff, and tenant-scoped role admin | Tenant Back Office | Tenant-owned people/admin continuity for the workspace | invite, staff management, bounded tenant-facing role/access administration, member maintenance | platform admin RBAC, cross-tenant governance authority, or Aggregator-specific full office logic | Common tenant back-office core | Common core |
| Tenant-owned settings, integrations, and bounded domain/config controls | Tenant Back Office | Workspace-operating configuration owned by the tenant | integrations setup, bounded settings, bounded domain/config controls where tenant-owned rather than full cross-cutting domain-family authority | whole routing family, whole identity family, or platform control-plane authority | Common tenant back-office core | Common core |
| Tenant-owned brand/store continuity not sufficient to define WL as a whole family | Tenant Back Office | Tenant-owned branding or store/profile continuity that remains part of running the workspace coherently | store/profile basics, tenant-owned branding continuity, bounded presentation settings | the whole White-Label overlay family or a separate store-admin office outside the common core | Common tenant back-office core | Common core |
| B2B exchange-specific tenant admin depth | B2B family overlay | Family-specific admin depth attached to the common core for governed business-exchange participation | B2B-specific org posture, exchange-facing compliance/admin configuration, business-participant admin depth needed to support B2B operation | the whole B2B exchange family, trade workflow ownership, or a separate B2B back-office family | Bounded B2B family overlay | Bounded family overlay |
| B2C operator/admin depth | B2C family overlay | Simpler operator/store-admin depth attached to the common core for consumer-commerce contexts | B2C store-profile administration, bounded storefront operator settings, simpler consumer-commerce admin depth | the whole B2C family, public storefront family truth, or a separate B2C office | Bounded B2C family overlay | Bounded family overlay |
| WL admin overlay surfaces | White-Label capability overlay | Brand/operator-specific admin slice tied to branded runtime and deployment experience | store branding, theme/presentation controls, branded domain concerns, overlay-specific operator controls, overlay-owned collections/product-presentation administration | peer family status, whole tenant-admin family, or platform supervision | Bounded WHITE_LABEL capability overlay | Bounded capability overlay |
| Aggregator discovery/handoff workspace surfaces | Aggregator capability/workspace surface | Lightweight capability/workspace surfaces for curated discovery, inspection, intent submission, and handoff confirmation | discovery workspace, counterparty inspection, intent capture, handoff confirmation, supportive market-intelligence context | full Aggregator back office, full negotiation office, full network-governance office, or peer-family admin structure | Bounded AGGREGATOR capability/workspace surface | Bounded capability overlay |
| Shared downstream continuation surfaces reached from Aggregator context | Shared tenant continuation owned elsewhere | Shared tenant-plane surfaces that may be reachable after Aggregator handoff but are not Aggregator-owned admin surfaces | downstream orders, trades, certifications, traceability, settlement, team, and similar continuation destinations where current repo truth exposes them | proof of Aggregator-owned operating depth or proof of a separate Aggregator back office | Shared continuation outside tenant-admin ownership expansion | Shared continuation |
| Platform control-plane / superadmin surfaces | Platform supervision | Cross-tenant supervision, governance, audit, finance visibility, disputes, tenant registry, and platform operations | tenant registry, provisioning oversight, audit, disputes, finance visibility, feature controls, system supervision | tenant-owned admin continuity, family overlay, or capability overlay | Platform control plane | Platform supervision |
| Separate full Aggregator back office | Prohibited interpretation | Explicitly rejected surface model | nothing | any claim that Aggregator owns a complete standalone office parallel to tenant back office or platform control plane | Prohibited | Prohibited separate office logic |

## 6. Common-Core Versus Overlay Rules

- If a surface is tenant-owned and recurs across B2B, B2C, Aggregator, and overlay-enabled contexts,
  it belongs to the common tenant back-office core unless a narrower bounded overlay rule proves
  otherwise.
- If a surface is directly tied to branded runtime, branded operator presentation, or branded domain
  delivery, it may belong to the WL capability overlay, but it must not redefine the whole
  tenant-admin family.
- If a surface adds business-exchange-specific tenant admin depth, it may belong to the B2B family
  overlay, but it must not absorb the whole B2B exchange family.
- If a surface adds consumer/store-operator admin depth, it may belong to the B2C family overlay,
  but it must not absorb the whole B2C family.
- If a surface is limited to discovery, inspection, intent submission, or handoff confirmation, it
  may belong to the Aggregator capability/workspace surface, but it must not expand into a separate
  full back office.
- If a surface is cross-tenant or platform-supervisory, it belongs to platform control-plane /
  superadmin even when it displays tenant details.
- If a surface is reachable from Aggregator context but is owned by downstream execution or shared
  tenant continuity, it must be classified as shared continuation rather than Aggregator-owned
  admin depth.

## 7. Allowed and Disallowed Surface Interpretations

Allowed interpretation patterns:

- Common tenant-admin core may support B2B, B2C, Aggregator, and overlay-enabled tenant contexts
  without changing parent-family truth.
- WL-admin may exist as a bounded capability overlay on top of a lawful parent family.
- Aggregator may expose lightweight capability/workspace controls for discovery and handoff inside
  the common tenant-admin environment.
- Shared downstream continuation surfaces may be reached from Aggregator context without becoming
  Aggregator-owned modules.
- Platform control-plane may deep-dive into tenant state without becoming tenant-owned back-office
  continuity.

Disallowed interpretation patterns:

- treating WL-admin as the whole tenant-admin family
- treating Aggregator workspace identity or shell presence as proof of a full separate Aggregator
  back office
- treating shared downstream surfaces as Aggregator-owned office depth
- treating control-plane deep-dive, audit, finance, or governance surfaces as tenant-owned admin
  surfaces
- multiplying separate family-owned offices when a common-core-plus-bounded-overlay interpretation
  is sufficient
- reading package/plan or runtime identity labels as stronger than the common-core and overlay
  boundary rules

## 8. Blockers and Edge Conditions Inside The Matrix Boundary

- descriptive matrices still use `tenant type` and shell-based grouping language loosely, so this
  matrix must be treated as the stronger tenant-admin interpretation reference until later bounded
  reconciliation updates those descriptive surfaces
- White Label Co remains a preserved Layer 0 hold, but that hold does not block authoring this
  matrix because this pass inherits existing WL overlay truth and does not reopen WL completeness
  or disposition
- Aggregator remains present in runtime identity and shell surfaces; this matrix therefore preserves
  only its bounded capability/workspace admin slice and explicitly rejects a full separate office

## 9. Readiness Outcome

Result of this artifact:

- TexQtic now has one bounded tenant-admin surface matrix that inherits the controlling
  vocabulary/state-map artifact and the provisioning alignment matrix
- common core, family overlays, capability overlays, shared continuation, and platform supervision
  are separated explicitly
- later planning can inherit a tighter anti-drift admin-surface reference without widening into
  implementation or reopening architecture
