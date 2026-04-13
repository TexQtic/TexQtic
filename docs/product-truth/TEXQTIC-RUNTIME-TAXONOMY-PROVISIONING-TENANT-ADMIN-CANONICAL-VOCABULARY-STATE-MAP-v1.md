# TEXQTIC-RUNTIME-TAXONOMY-PROVISIONING-TENANT-ADMIN-CANONICAL-VOCABULARY-STATE-MAP-v1

Status: PRODUCT-TRUTH / BOUNDED PLANNING ARTIFACT ONLY
Date: 2026-04-13
Authority posture: architecture-lock-preserving, planning-only, anti-drift reference

## 1. Purpose and Authority

This artifact records the first bounded planning output required to align runtime taxonomy,
provisioning terminology, and tenant-admin surface language to the already-locked TexQtic
architecture truth.

Its purpose is narrow:

- define one canonical vocabulary and state map for family, category, capability, package, runtime,
  provisioning, and tenant-admin terms
- stop family-versus-capability drift before later implementation-facing planning slices proceed
- provide one anti-drift reference that later bounded artifacts can inherit without reopening the
  architecture statement

This artifact does not:

- modify Layer 0 governance posture
- rewrite governance doctrine
- authorize runtime, route, schema, or contract mutation
- create a broad implementation roadmap
- reopen CRM or Marketing planning beyond terminology placement
- decide detailed taxonomy propagation mechanics, shell rewiring, or entitlement implementation

Usage rule:

- later bounded planning artifacts and implementation-facing planning must treat this document as
  the controlling normalization reference for terminology and state interpretation unless a later
  governance-approved artifact explicitly supersedes it
- this artifact governs terminology and state interpretation only; it must not be used by itself to
  justify runtime, schema, or contract changes without a later bounded implementation-facing
  artifact

Authority order used:

1. Layer 0 posture
   - `governance/control/OPEN-SET.md`
   - `governance/control/NEXT-ACTION.md`
   - `governance/control/BLOCKED.md`
   - `governance/control/SNAPSHOT.md`
2. Locked governance architecture truth
   - `docs/governance/control/GOV-OS-001-DESIGN.md`
3. Current product-truth family and normalization anchors
   - `docs/product-truth/TEXQTIC-FINAL-FAMILY-INVENTORY-PLACEMENT-NORMALIZATION-v1.md`
   - `docs/product-truth/WHITE-LABEL-OVERLAY-NORMALIZATION-v1.md`
   - `docs/product-truth/AGGREGATOR-OPERATING-MODE-NORMALIZATION-v1.md`
   - `docs/product-truth/SUBSCRIPTION-ENTITLEMENT-NORMALIZATION-v1.md`
   - `docs/product-truth/TENANT-BACK-OFFICE-FAMILY-DESIGN-v1.md`
   - `docs/product-truth/B2B-EXCHANGE-OPERATING-MODE-DESIGN-v1.md`
   - `docs/product-truth/TEXQTIC-ONBOARDING-PROVISIONING-HANDOFF-DESIGN-v1.md`
4. Descriptive evidence surfaces only
   - `docs/strategy/TENANT_DASHBOARD_MATRIX.md`
   - `docs/DASHBOARD_MATRIX_CONTROL_TENANT_WL.md`
   - `docs/strategy/CONTROL_CENTER_TAXONOMY.md`

## 2. Scope Boundary

Included:

- canonical term definitions
- axis separation between family, non-commercial category, capability/overlay, package, runtime
  identity, provisioning stage, and tenant-admin surface class
- deprecated-to-normalized term crosswalks
- bounded provisioning-language crosswalk
- tenant-admin common-core versus overlay terminology
- taxonomy ownership language needed to prevent future planning drift

Excluded:

- runtime implementation
- route, shell, or navigation mutation
- schema redesign or migrations
- contract redesign
- entitlement enforcement design
- CRM redesign
- Marketing redesign
- detailed taxonomy propagation/exposure mechanics
- detailed tenant-admin surface matrix authoring
- detailed navigation reconciliation authoring

This artifact is the first controlling vocabulary/state map only.

## 3. Preserved Controlling Architecture Truth

The following architecture truth is preserved exactly and is not reopened here:

- B2B and B2C are the base commercial families.
- INTERNAL is a non-commercial category.
- White Label is an overlay/capability, not a peer family.
- Aggregator is a cross-family discovery, matching, and intent-handoff capability, not a peer
  family.
- package/plan is a separate commercial and entitlement axis, not family identity.
- Marketing is non-canonical interest capture only.
- CRM is normalized pre-provisioning recommendation and handoff only.
- platform provisioning and runtime are the canonical persisted owners of family/package truth.
- tenant-admin remains one common core with bounded family overlays and bounded capability overlays.
- B2B owns the canonical internal textile taxonomy.
- Aggregator may consume only the discovery-safe subset of that B2B taxonomy.
- no separate full admin office may be designed for Aggregator.

## 4. Canonical State Axes

TexQtic planning and implementation-facing language must use the following state axes separately.

| Axis | Canonical question answered | Canonical values / classes | Must not be collapsed into |
| --- | --- | --- | --- |
| Commercial family axis | What base commercial family is this runtime or workflow grounded in? | `B2B`, `B2C` | capability, overlay, package, shell label |
| Non-commercial category axis | Is this non-commercial internal platform posture? | `INTERNAL` | commercial family or package |
| Capability / overlay axis | What bounded cross-family capability or overlay is present? | `WHITE_LABEL`, `AGGREGATOR` | base family identity |
| Package / plan axis | What commercial package / entitlement label is assigned? | `FREE`, `STARTER`, `PROFESSIONAL`, `ENTERPRISE` | family or capability identity |
| Runtime identity axis | What runtime-facing label or branch is being routed, provisioned, or persisted for current continuity? | bounded runtime labels only, interpreted through this map | canonical family truth by itself |
| Provisioning stage axis | Where is the prospect / tenant in the handoff chain? | Marketing, CRM, approved onboarding, provisioning, active runtime | family or package identity |
| Tenant-admin surface axis | Is this common tenant back office, family overlay, capability overlay, or platform supervision? | common core plus bounded overlays | family identity or separate office proliferation |

## 5. Canonical Vocabulary and State Map

| Term | Canonical axis | Canonical status | Exact meaning | Must not be read as |
| --- | --- | --- | --- | --- |
| `B2B` | Commercial family | Canonical | Base commercial family for authenticated business exchange continuity | WL variant, Aggregator variant, or package name |
| `B2C` | Commercial family | Canonical | Base commercial family for tenant-branded consumer-commerce continuity | WL synonym, public-shell synonym, or package name |
| `INTERNAL` | Non-commercial category | Canonical | Non-commercial platform/internal category | third commercial family |
| `WHITE_LABEL` / `WL` | Capability / overlay | Canonical as overlay term only | Branded presentation, operator, and deployment overlay that can sit on a lawful parent family | peer family, standalone tenant-admin family, or package |
| `AGGREGATOR` | Capability / overlay and bounded runtime identity | Canonical only as bounded discovery-plus-intent-handoff capability and workspace context | discovery, qualification, and handoff capability that may appear in runtime identity/routing without becoming a peer family | peer commercial family, full exchange family, or separate full admin office |
| `FREE` / `STARTER` / `PROFESSIONAL` / `ENTERPRISE` | Package / plan | Canonical | Commercial package / entitlement axis | family, overlay, or runtime mode |
| `Tenant Back Office` | Tenant-admin surface | Canonical | Common tenant-owned administrative and operational core across lawful parent contexts | WL-admin only, Aggregator-admin only, or platform control plane |
| `WL Admin` | Capability overlay surface | Canonical as bounded overlay-admin term | White-label-specific operator/admin surface tied to branded experience | whole tenant-admin family or control plane |
| `Aggregator workspace` | Capability overlay surface | Canonical as bounded capability context | discovery, inspection, intent submission, and handoff confirmation context | full transaction office or separate family-owned back office |
| `Control Plane` / `SuperAdmin` | Platform supervision surface | Canonical | Platform supervision and cross-tenant governance surface | tenant-admin core or commercial family |

## 6. Deprecated or Drifted Term Crosswalk

| Drifted or risky term | Normalized interpretation | Rule |
| --- | --- | --- |
| `White-label operating mode` | `White-label overlay` on top of a lawful parent family | Do not use as peer-family authority |
| `White-label tenant type` | overlay-enabled tenant/runtime context | Use only when explicitly marked overlay-enabled, not as family truth |
| `Aggregator tenant type` | bounded runtime identity / workspace context for discovery and handoff | Do not use as peer-family authority |
| `Aggregator as platform orchestrator` | rejected launch-unsafe interpretation | Must not be used as current planning truth |
| `Aggregator back office` | bounded Aggregator capability surface inside common tenant back office only | Must not imply a separate full office |
| `B2B + WL` as a fused family | `B2B` family with `WHITE_LABEL` overlay enabled | Keep the axes separate |
| `B2C + WL` as a fused family | `B2C` family with `WHITE_LABEL` overlay enabled | Keep the axes separate |
| `Plan`, `tier`, or `package` used as family identity | package/plan axis only | Must not classify runtime family or capability |
| `TRIAL`, `PAID`, `BASIC` used as canonical plan truth | display-only legacy drift or non-canonical legacy term | Must not be treated as canonical package vocabulary |
| `Tenant type` used as complete architecture truth | runtime-facing convenience label only | Must be interpreted through the full state map |
| shell presence or route presence as family proof | descriptive runtime evidence only | Must not define family ownership by itself |

## 7. Runtime Identity Versus Family / Capability Map

Runtime-facing labels may remain present in current repo truth, but they must be interpreted through
the canonical axes rather than treated as self-defining architecture truth.

| Runtime-facing label posture | Canonical interpretation |
| --- | --- |
| runtime label `B2B` | runtime identity aligned directly to the `B2B` base family |
| runtime label `B2C` | runtime identity aligned directly to the `B2C` base family |
| runtime label `INTERNAL` | runtime identity aligned to non-commercial internal category only |
| runtime label `AGGREGATOR` | bounded discovery/handoff workspace identity and capability context; not proof of peer-family status |
| WL-facing route, shell, or admin label | overlay-enabled presentation or operator context on top of a lawful parent family |

Interpretation rule:

- runtime identity labels are allowed to support current routing, provisioning, and shell continuity
- runtime identity labels do not by themselves settle family truth, capability truth, or package
  truth
- when a runtime label appears to conflict with family truth, family/category/capability truth wins

## 8. Provisioning Language Crosswalk

Provisioning language must preserve the handoff chain and ownership boundaries below.

| Stage term | Canonical role | What it may truthfully do | What it must not own |
| --- | --- | --- | --- |
| `Marketing` | Non-canonical interest capture | capture interest, describe demand, collect top-of-funnel signals | persisted family truth, persisted package truth, canonical provisioning authority |
| `CRM` | Normalized pre-provisioning recommendation and handoff | normalize prospect data, recommend likely family/capability fit, hand off to onboarding/provisioning | persisted runtime truth or final family/package ownership |
| `Approved onboarding` | Eligibility state | confirm readiness to move into provisioning continuity | final runtime ownership by itself |
| `Provisioning` | Canonical assignment stage | create or prepare the canonical tenant/runtime state and persist family/package truth | CRM-style speculative ownership |
| `Active runtime` | Canonical persisted operating state | own the persisted family/category/capability/package posture used by the platform | top-of-funnel recommendation language |

Provisioning rule:

- family and package truth may be recommended before provisioning
- family and package truth become canonical only at provisioning/runtime ownership

## 9. Tenant-Admin Common Core Versus Overlay Terminology

Tenant-admin language must preserve one common core plus bounded overlays.

| Surface class | Canonical term | Exact meaning | Must not be read as |
| --- | --- | --- | --- |
| Common tenant-admin core | `Tenant Back Office` | Shared tenant-owned administrative and operational continuity across lawful contexts | family replacement or capability-owned whole office |
| Family-specific overlay | `B2B tenant-admin overlay` | B2B-specific admin depth attached to the common core | whole tenant-admin architecture |
| Family-specific overlay | `B2C tenant-admin overlay` | B2C-specific admin depth attached to the common core | whole tenant-admin architecture |
| Capability overlay | `WL admin overlay` | brand/operator admin slice tied to branded experience | whole tenant-admin family or control plane |
| Capability overlay | `Aggregator capability surface` | lightweight discovery/handoff controls inside common tenant-admin continuity | separate full back office |
| Platform supervision | `Control Plane` | cross-tenant platform oversight, governance, finance visibility, and operator controls | tenant-owned back office |

Tenant-admin rule:

- later planning may define bounded overlays
- later planning must not multiply whole admin families where a bounded overlay or bounded
  capability surface is sufficient

## 10. Taxonomy Ownership and Discovery-Safe Boundary Terms

This artifact fixes the required taxonomy language only. It does not author the later detailed
propagation/exposure map.

| Term | Canonical owner / scope | Canonical meaning |
| --- | --- | --- |
| `B2B textile taxonomy` | B2B family | the full canonical internal textile classification used for business exchange truth |
| `Primary segment` | B2B taxonomy | singular top-level business segment anchor |
| `Secondary segments` | B2B taxonomy | multiple subordinate segment qualifiers inside the B2B taxonomy |
| `Role-position axis` | B2B taxonomy | separate role positioning dimension such as `manufacturer`, `trader`, `service_provider` |
| `Discovery-safe subset` | Aggregator-consumable subset only | the bounded portion of B2B taxonomy safe to expose for discovery, qualification, and handoff without transferring full B2B ownership |

Taxonomy rule:

- B2B owns the full taxonomy
- Aggregator may consume only the discovery-safe subset
- consuming a subset does not transfer administrative or execution ownership to Aggregator

## 11. Anti-Drift Inheritance Rules

Later bounded artifacts and implementation-facing planning must inherit all of the following:

1. Base commercial family truth is always evaluated before capability, overlay, package, shell, or
   runtime-label shorthand.
2. `INTERNAL` is never promoted into a peer commercial family.
3. `WHITE_LABEL` is always overlay/capability truth, never peer-family truth.
4. `AGGREGATOR` is always bounded capability/workspace truth, even when current runtime identity
   uses that label.
5. package/plan language must remain a separate axis from family/capability language.
6. Marketing and CRM may recommend or describe, but provisioning/runtime own persisted truth.
7. tenant-admin remains one common core with bounded overlays rather than separate whole offices.
8. shell presence, route presence, or dashboard presence may evidence runtime reality but must not
   define canonical family truth.

## 12. Non-Decisions and Deferred Follow-On Work

This artifact does not decide:

- the detailed provisioning alignment matrix
- the detailed tenant-admin surface matrix
- the detailed taxonomy propagation/exposure map
- the detailed navigation/label reconciliation plan
- runtime code, contracts, routes, schema, or entitlements work

Those remain later bounded artifacts or later bounded implementation-facing units.

## 13. Readiness Outcome

Result of this artifact:

- TexQtic now has one bounded canonical vocabulary/state map for runtime taxonomy, provisioning
  terminology, and tenant-admin language
- later bounded planning slices can inherit one anti-drift reference without reopening the locked
  architecture statement
- this artifact records planning truth only and does not change live Layer 0 posture or runtime
  behavior
