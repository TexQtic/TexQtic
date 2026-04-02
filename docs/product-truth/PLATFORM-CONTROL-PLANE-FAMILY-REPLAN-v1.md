# PLATFORM-CONTROL-PLANE-FAMILY-REPLAN-v1

Status: PRODUCT-TRUTH / FAMILY REPLAN ONLY
Date: 2026-04-02
Authority posture: canonical-model-aligned, planning/replanning only

## 1. Purpose and Authority

This artifact is the canonical current family-level replanning anchor for `Platform Control-Plane`.

Its purpose is narrow:

- define the lawful platform control-plane family under the adopted canonical model
- separate platform-owned supervision, oversight, governance, and cross-tenant administration from
  tenant back-office, white-label overlay, and parent commercial access model truth
- give later family-specific units one reusable control-plane boundary so future planning does not
  keep treating generic admin shells, launch-era taxonomy, or partial launch-boundary artifacts as
  the family definition

This artifact does not authorize implementation, does not redesign adjacent families, and does not
replace Layer 0 governance truth.

Authority order used:

1. `governance/control/NEXT-ACTION.md`
2. `governance/control/SNAPSHOT.md`
3. `docs/strategy/PLATFORM_DOCTRINE_ADDENDUM.md`
4. `docs/product-truth/TENANT-BACK-OFFICE-FAMILY-DESIGN-v1.md`
5. `docs/product-truth/WHITE-LABEL-OVERLAY-NORMALIZATION-v1.md`
6. `docs/product-truth/B2B-EXCHANGE-OPERATING-MODE-DESIGN-v1.md`
7. `docs/product-truth/ENTERPRISE-WITHIN-B2B-DEPTH-BOUNDARY-v1.md`
8. `docs/strategy/CONTROL_CENTER_TAXONOMY.md`
9. `docs/product-truth/PLATFORM-OPS-LAUNCH-BOUNDARY-ARTIFACT-v1.md`
10. `docs/product-truth/TEXQTIC-LAUNCH-READINESS-REQUIREMENTS-v1.md`
11. `docs/status/TEXQTIC_CURRENT_STATE__2026-02-24.md`

## 2. Current Controlling Posture

Current repo authority already fixes the following truths:

- TexQtic is the operating system for trusted textile supply chains.
- The only governed commercial access models are B2B Exchange, B2C Tenant-Branded Commerce, and
  Aggregator Directory Discovery + Intent Handoff.
- White-label is an overlay capability and deployment/experience model, not a separate commercial
  access model.
- Enterprise is subordinate depth within B2B, not a separate platform mode.
- Control-plane, superadmin, and WL-admin surfaces are governance/operations surfaces, not
  commercial pillars.
- Platform-owned supervision, tenant registry depth, feature flags, disputes, finance oversight,
  audit visibility, health/ops surfaces, and bounded AI governance are materially evidenced in repo
  truth now.

The remaining planning gap is not whether platform control-plane exists. The gap is that it is
still split across an older control-center taxonomy, a launch-boundary artifact that is
intentionally narrower than the whole family, and mixed-era planning/status wording rather than one
current explicit family-level replan.

## 3. Lawful Platform Control-Plane Classification

The controlling classification is:

- platform control-plane is a platform-owned supervision, governance, and cross-tenant
  administration family
- platform control-plane is not a governed commercial access model
- platform control-plane is not tenant-owned back-office continuity
- platform control-plane is not a substitute for white-label overlay or for any parent commercial
  access model

Platform control-plane therefore exists as the platform-scoped operating family through which
TexQtic governs tenants, platform safety, operator oversight, and cross-tenant administration.

## 4. What Platform Control-Plane Means In TexQtic Planning Truth

Within TexQtic planning truth, `Platform Control-Plane` means the platform-owned supervision,
governance, oversight, and cross-tenant administrative surfaces required to run TexQtic safely as
the operating system for trusted textile supply chains.

At the family level, this means:

- platform-level supervision and global administration
- tenant registry, tenant deep-dive, activation, and onboarding oversight at platform scope
- platform-level finance visibility, disputes, escalations, and casework where repo truth supports
  them
- compliance, audit, traceability oversight, and governance operations at platform scope
- platform RBAC, admin-authority, feature-governance, and control-center governance surfaces
- bounded AI-governance or platform advisory-control posture where repo truth already supports it
- cross-tenant operational visibility needed to run the platform safely

The correct high-level family statement is:

- Platform Control-Plane is the platform-owned supervision and governance family that operates
  TexQtic across tenants without replacing tenant back-office, overlay, or commercial access model
  classification.

## 5. What Belongs Inside Platform Control-Plane Scope

The following belong inside the control-plane family boundary:

### 5.1 Platform supervision and global administration

- platform-owned control-center supervision
- global administrative visibility and governance needed to operate TexQtic itself
- cross-tenant platform casework, inspection, and operator oversight

### 5.2 Tenant registry, deep-dive, activation, and oversight posture

- tenant registry and tenant selection
- tenant deep-dive inspection at platform scope
- onboarding review, approved activation, and bounded tenant lifecycle oversight
- bounded impersonation, handoff, or cross-tenant operator entry where repo truth supports it

### 5.3 Platform-level governance, risk, and casework

- disputes, escalations, compliance queue, audit visibility, and governance casework at platform
  scope
- platform oversight of certifications, traceability, and audit-facing surfaces where control-plane
  read or governance posture is already evidenced
- platform-level support and governance actions that are constitutionally separate from tenant-owned
  operation

### 5.4 Platform-level finance visibility and supervision

- finance oversight, fee visibility, settlement-event visibility, and billing-status supervision at
  platform scope where repo truth supports them
- system-of-record-only finance supervision rather than money movement
- platform-wide commercial visibility needed to operate safely, not tenant-owned accounting as a
  substitute family

### 5.5 Platform RBAC, feature governance, and operator controls

- admin RBAC and bounded admin-authority surfaces
- feature flags, kill-switch posture, release-control visibility, and platform operating levers
- platform-only governance controls distinct from tenant-owned settings

### 5.6 Platform AI-governance and operational observability in bounded form

- bounded control-plane AI governance or advisory-control surfaces already evidenced in repo truth
- health, event-stream, system-level observability, and platform-scope operational monitoring
- cross-tenant operational visibility required to run the platform safely

## 6. What Does Not Belong Inside Platform Control-Plane Scope

The following are adjacent or later families and must not be silently absorbed into control-plane
replanning:

### 6.1 Tenant Back Office as a whole family

- tenant-owned org/workspace administration
- tenant-owned memberships, branding, integrations, and settings as the whole tenant-admin family
- tenant-owned operational continuity treated as if it were platform supervision

### 6.2 White-Label Overlay as a whole family

- white-label branded storefront/runtime behavior
- overlay-owned operator/admin continuity as the whole-family substitute for platform control-plane
- WL-admin treated as if it were platform control authority

### 6.3 Parent commercial access models as whole-family substitutes

- B2B Exchange Core as a whole family
- B2C Tenant-Branded Commerce as a whole family
- Aggregator Directory Discovery + Intent Handoff as a whole family
- parent-mode workflow or storefront truth treated as if it defines platform governance

### 6.4 Identity / tenancy / permissions / workspace continuity as a whole family

- the full cross-cutting identity/workspace family
- all tenancy rules, permissions architecture, or workspace continuity ownership in full
- any attempt to solve the whole identity family through control-plane replanning alone

### 6.5 Domain / tenant routing / brand-surface management as a whole family

- full domain-family ownership
- tenant resolution, routing, and brand-surface management as a whole cross-cutting family
- any attempt to fully solve domain/routing through control-plane replanning alone

### 6.6 Catalog, orders, payments, messaging, or implementation work as whole-family substitutes

- catalog/discovery cross-mode family ownership
- orders / checkout / post-purchase family ownership
- payments / escrow / settlement family ownership beyond bounded platform supervision posture
- messaging / notifications family ownership
- implementation planning or runtime completion work

## 7. Relationship To Adjacent Families

### 7.1 Relationship to tenant back office

- Tenant back office remains tenant-owned and tenant-scoped.
- Platform control-plane remains cross-tenant and platform-owned.
- Platform supervision must not be collapsed into tenant-owned admin continuity.

### 7.2 Relationship to White-Label Overlay and WL-admin

- White-label overlay remains a separate family for branded presentation and overlay-owned operator
  continuity.
- WL-admin may overlap with operational administration in overlay contexts, but WL-admin is not a
  substitute for platform control-plane.
- Control-plane must not be derived from white-label shell or operator presence.

### 7.3 Relationship to B2B Exchange Core

- Platform control-plane may supervise or inspect B2B-related operations at platform scope.
- That does not make B2B the definition of the control-plane family.
- Exchange-family truth remains separate from platform-owned supervision.

### 7.4 Relationship to B2C Tenant-Branded Commerce

- Platform control-plane may supervise B2C-facing platform posture in bounded form.
- It does not define the whole B2C family or broader storefront truth.

### 7.5 Relationship to Aggregator

- Platform control-plane may supervise Aggregator-adjacent platform operations in bounded form.
- Aggregator discovery, routing, and handoff truth remain separate from platform control-plane as a
  family definition.

### 7.6 Relationship to identity / tenancy / permissions / workspace continuity

- identity, tenancy, permissions, and workspace continuity overlap with control-plane because admin
  authority and cross-tenant governance depend on them
- the full cross-cutting identity/workspace family remains separate and later

### 7.7 Relationship to compliance / certifications / traceability / audit

- platform control-plane intersects with compliance, certifications, traceability oversight, and
  audit because platform supervision needs cross-tenant governance visibility
- that overlap does not authorize absorbing each adjacent cross-cutting family in full detail here

### 7.8 Relationship to feature governance / release controls / kill-switches

- feature flags, release controls, and kill-switch posture can sit inside platform control-plane
  where they are platform-owned operating levers
- the broader feature-governance family still remains separately refinable later if needed

### 7.9 Relationship to AI governance / advisory automation

- bounded control-plane AI governance or advisory-control posture can sit inside platform
  control-plane where repo truth already evidences it
- the broader AI governance / advisory automation family remains separately refinable later if
  needed

### 7.10 Relationship to domain / tenant routing / brand-surface management

- domain or routing concerns may overlap with platform supervision when platform operators verify or
  govern them
- the full domain / tenant routing / brand-surface management family remains separate and later

## 8. Current Sources Of Drift

The main current drift classes are:

- the control-center taxonomy being useful for navigation grouping but easy to misread as the full
  family authority
- the platform-ops launch boundary artifact being intentionally narrower than the whole family, yet
  easy to reuse as if it were the full control-plane definition
- launch-readiness phrasing that groups super admin, platform admin, and tenant admin surfaces in a
  mixed posture statement
- generic control shell presence being treated as if it defines a lawful family boundary
- mixed-era planning/status language that still talks about control centers without one current
  family-level replan

These sources remain useful as evidence of runtime truth or launch posture, but they must not serve
as the canonical family-classification authority going forward.

## 9. Inheritance Rules For Later Family Units

Later family-specific units must inherit all of the following:

1. Platform control-plane is a platform-owned supervision and governance family, not a commercial
   access model.
2. Platform control-plane is cross-tenant and platform-scoped, not tenant-owned.
3. Tenant back-office remains separate and tenant-owned.
4. WL-admin or overlay-owned operator surfaces must not be used as the definition of control-plane.
5. Parent commercial access models must remain separate from platform supervision family truth.
6. Identity / tenancy / permissions / workspace work must remain a distinct later cross-cutting
   family unless a later unit explicitly narrows itself to a control-plane subset.
7. Domain / tenant routing / brand-surface management must remain a distinct later family even when
   platform operators supervise parts of it.
8. Control-plane work must not silently absorb B2B, B2C, Aggregator, tenant back-office, catalog,
   orders, payments, messaging, or implementation-family truth.
9. Family boundary truth must not be inferred from generic admin shell presence or launch-era
   taxonomy alone.

## 10. Deferred To Later Units

This family replan deliberately does not solve:

- tenant back-office redesign
- identity / tenancy / permissions / workspace family design
- domain / tenant routing / brand-surface management family design
- B2C broader family design
- catalog / discovery cross-mode design
- orders / checkout / post-purchase family design
- payments / escrow / settlement family design
- messaging / notifications family design
- implementation planning or runtime changes

Those remain later bounded units.

## 11. Readiness Outcome

Result of this artifact:

- platform control-plane now has a current explicit family-level replanning anchor
- future planning can no longer lawfully collapse platform supervision/control-plane into tenant
  back-office, WL-admin, or parent mode truth without violating current repo authority
- adjacent-family boundaries are explicit enough that later units can inherit them without widening
  into tenant back-office, identity, domain, B2B, B2C, Aggregator, or implementation work
