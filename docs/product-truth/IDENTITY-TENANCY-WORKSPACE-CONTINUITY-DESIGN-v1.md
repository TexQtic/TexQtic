# IDENTITY-TENANCY-WORKSPACE-CONTINUITY-DESIGN-v1

Status: PRODUCT-TRUTH / FAMILY DESIGN ONLY
Date: 2026-04-02
Authority posture: canonical-model-aligned, planning/design only

## 1. Purpose and Authority

This artifact is the canonical current family-level design anchor for
`Identity / Tenancy / Permissions / Workspace Continuity`.

Its purpose is narrow:

- define the lawful cross-cutting identity/workspace family under the adopted canonical model
- separate identity, tenancy, permissions, and workspace continuity from parent commercial access
  model ownership, tenant back-office family ownership, platform control-plane family ownership,
  onboarding/provisioning handoff ownership, and generic auth/session/shell presence
- give later family-specific units one reusable continuity boundary so future planning does not keep
  inferring identity-family truth from tenant admin modules, control-plane RBAC surfaces, first-
  owner activation loops, or login/session evidence alone

This artifact does not authorize implementation, does not redesign adjacent families, and does not
replace Layer 0 governance truth.

Authority order used:

1. `governance/control/NEXT-ACTION.md`
2. `governance/control/SNAPSHOT.md`
3. `docs/strategy/PLATFORM_DOCTRINE_ADDENDUM.md`
4. `docs/product-truth/B2B-EXCHANGE-OPERATING-MODE-DESIGN-v1.md`
5. `docs/product-truth/B2C-OPERATING-MODE-DESIGN-v1.md`
6. `docs/product-truth/WHITE-LABEL-OVERLAY-NORMALIZATION-v1.md`
7. `docs/product-truth/TENANT-BACK-OFFICE-FAMILY-DESIGN-v1.md`
8. `docs/product-truth/PLATFORM-CONTROL-PLANE-FAMILY-REPLAN-v1.md`
9. `docs/product-truth/ORDERS-CHECKOUT-POST-PURCHASE-CONTINUITY-FAMILY-DESIGN-v1.md`
10. `docs/product-truth/PAYMENTS-ESCROW-SETTLEMENT-FAMILY-DESIGN-v1.md`
11. `docs/product-truth/TEXQTIC-ONBOARDING-PROVISIONING-HANDOFF-DESIGN-v1.md`
12. `docs/product-truth/TEXQTIC-ONBOARDING-SYSTEM-DESIGN-v1.md`
13. `docs/status/TEXQTIC_CURRENT_STATE__2026-02-24.md`
14. `docs/strategy/TENANT_DASHBOARD_MATRIX.md`
15. `docs/strategy/CONTROL_CENTER_TAXONOMY.md`

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
- Tenant isolation is constitutional and `org_id` is the canonical tenant boundary.
- Runtime and status truth already evidence dual-realm auth, realm-aware routing/guard behavior,
  membership creation, impersonation entry, and session-scoped RLS variables, but family-level
  planning authority remains fragmented.

The remaining planning gap is not whether identity/workspace continuity exists. The gap is that
current repo truth still describes it through neighboring families and evidence surfaces:

- tenant back office uses membership, RBAC, tenant profile, and tenant-owned workspace controls
  without thereby owning all tenancy or workspace continuity rules
- platform control-plane uses admin RBAC, tenant provisioning, tenant details, and impersonation
  without thereby owning the whole family
- onboarding/provisioning establishes first-owner activation, membership application, and owner-
  ready entry continuity without becoming the whole-family authority
- B2B, B2C, white-label, orders, and payments all depend on lawful tenant/user/workspace context,
  but none of them defines identity-family truth in full
- runtime evidence such as `/api/me`, realm headers, token posture, or shell restore behavior is
  real evidence, but not by itself the canonical family definition

Those are all real evidence surfaces. None of them alone is the canonical whole-family definition.

## 3. Lawful Identity / Tenancy / Permissions / Workspace Continuity Classification

The controlling classification is:

- identity / tenancy / permissions / workspace continuity is a distinct cross-cutting enabling
  family
- this family is not a governed commercial access model
- this family is not identical to tenant back office, platform control-plane, onboarding,
  white-label overlay, B2B exchange, B2C storefront continuity, orders-family continuity, or
  payments-family continuity
- this family defines the lawful continuity by which a user, actor, tenant, role, realm, and
  workspace context remain coherent enough for adjacent families to operate truthfully
- this family is bounded by current repo posture and therefore must not be rewritten as a full auth
  redesign, schema redesign, or permissions-architecture reinvention

Identity / Tenancy / Permissions / Workspace Continuity therefore exists as the cross-cutting
family that carries lawful realm, tenant boundary, actor membership, role scope, impersonation
entry, and workspace context continuity across supported platform surfaces without replacing the
parent or adjacent family that consumes that continuity.

## 4. What Identity / Tenancy / Permissions / Workspace Continuity Means In TexQtic Planning Truth

Within TexQtic planning truth, `Identity / Tenancy / Permissions / Workspace Continuity` means the
shared cross-cutting family of tenant-bounded actor continuity by which supported users and
operators can enter, restore, switch, and operate within the correct realm and workspace context
with truthful membership and permission posture behind that continuity.

At the family level, this means:

- identity continuity that keeps the acting user or operator materially tied to the supported realm
  and role posture rather than to generic shell presence alone
- tenancy continuity that keeps the correct `org_id` and tenant boundary attached to user entry,
  session behavior, RLS posture, and workspace read/write meaning
- permissions continuity that keeps membership, role, and actor scope coherent enough for adjacent
  business families to behave lawfully
- workspace continuity that keeps entry, restore, switching, and bounded impersonation behavior
  aligned with the correct tenant-operating context
- shared continuity reused across tenant-facing, platform-facing, and overlay-enabled experiences
  without turning any one of those consuming families into the owner of identity-family truth

The correct high-level family statement is:

- Identity / Tenancy / Permissions / Workspace Continuity is the cross-cutting enabling family
  that preserves truthful realm, tenant-bound actor, membership, permission, and workspace-context
  continuity across lawful operating surfaces without replacing parent commercial access model,
  tenant-admin, control-plane, onboarding, order, or finance family ownership.

## 5. What Belongs Inside Identity / Tenancy / Permissions / Workspace Continuity Scope

The following belong inside the identity/workspace family boundary:

### 5.1 Tenant-bound identity continuity

- lawful user or operator identity continuity where the purpose is to preserve the acting subject in
  the correct realm and tenant-bounded operating posture
- identity continuity tied to supported realm entry, authenticated session meaning, and actor
  continuity across supported flows
- current tenant-bound actor posture that lets adjacent product families know who is acting and for
  which tenant boundary

### 5.2 Tenancy boundary continuity

- canonical `org_id`-scoped tenant continuity
- tenant boundary continuity expressed through current realm and RLS posture
- continuity that keeps tenant context truthful during entry, restore, and bounded switching

### 5.3 Membership and permission continuity

- membership existence, activation, and continuity where the purpose is to establish lawful tenant-
  scoped operating authority
- role/RBAC continuity where adjacent families need truthful permission posture to operate
- actor-scope continuity across tenant-facing and platform-facing surfaces

### 5.4 Workspace entry, restore, and continuity

- supported workspace entry into the correct tenant-operating context
- session restore, workspace hydration, and bounded continuity after lawful authentication
- bounded workspace switching or impersonation entry where the goal is to preserve a truthful
  reviewed operating context rather than create a new family

### 5.5 Provisioned owner-ready and invited-user continuity where identity/workspace is the seam

- the continuity seam from prepared tenant/user/membership state into materially usable owner-ready
  or invited-user workspace entry
- tenant provisioning outcomes only to the extent they instantiate tenant-bound identity,
  membership, and workspace continuity
- first-owner or invited-user continuity insofar as it establishes the cross-cutting family seam
  that later operating families inherit

### 5.6 Shared continuity reuse across adjacent families

- tenant back-office reuse of membership, RBAC, and workspace continuity without collapsing the
  whole family into tenant admin
- control-plane reuse of admin RBAC, tenant details, provisioning, and impersonation without
  collapsing the whole family into platform supervision
- B2B, B2C, white-label, orders, and payments reuse of tenant/user/workspace truth without
  becoming identity-family owners

## 6. What Does Not Belong Inside Identity / Tenancy / Permissions / Workspace Continuity Scope

The following are adjacent or separate families and must not be silently absorbed into identity-
family design:

### 6.1 Tenant Back Office as a whole family

- tenant profile, branding, settings, integrations, catalog admin, or other tenant-admin workspace
  surfaces as a whole-family substitute
- generic tenant dashboard presence treated as if it defines identity/workspace continuity in full

### 6.2 Platform Control-Plane as a whole family

- cross-tenant supervision, audits, compliance review, finance oversight, or global operator case
  management as a whole-family substitute
- control-plane tenant details or admin shell presence treated as if it defines all identity,
  tenancy, permissions, or workspace truth

### 6.3 B2B Exchange Core, B2C, or White-Label as parent or overlay families

- authenticated business exchange posture, public-safe storefront posture, or branded overlay
  presentation treated as if they define the full cross-cutting family
- parent-mode entry or overlay runtime framing treated as a substitute for identity-family
  ownership

### 6.4 Onboarding / Provisioning as a whole family

- business verification, onboarding approval, provisioning workflow, or first-owner handoff logic
  treated as if it defines the whole identity/workspace family in full
- prepared-tenant creation or owner-ready activation sequencing treated as a substitute for the
  enduring cross-cutting family boundary

### 6.5 Generic auth/session/workspace shell presence

- login screens, token existence, `/api/me` success, shell rendering, or session bootstrap alone
  treated as whole-family proof
- route restore, client hydration, or generic workspace shell presence used as a substitute for
  lawful membership, permission, and tenant-bound continuity

### 6.6 Messaging, domain/routing, orders, payments, or implementation families

- messaging / notifications family ownership
- domain / tenant routing / brand-surface management family ownership
- downstream order or downstream finance-state family ownership
- auth rewrite, session redesign, permissions-engine redesign, API redesign, schema changes, or
  runtime completion claims

## 7. Relationship To Adjacent Families

### 7.1 Relationship to Tenant Back Office

- Tenant back office consumes tenant-scoped membership, RBAC, and workspace continuity.
- Tenant back office does not define the whole identity/workspace family.
- Tenant-admin surfaces are evidence of adjacent reuse, not canonical ownership of tenancy and
  workspace continuity in full.

### 7.2 Relationship to Platform Control-Plane

- Platform control-plane consumes admin RBAC, tenant provisioning, tenant details, and bounded
  impersonation entry.
- That supervision does not define the whole identity/workspace family itself.
- Platform-facing admin surfaces are evidence of adjacent reuse, not canonical ownership of all
  tenancy and permissions continuity.

### 7.3 Relationship to Onboarding / Provisioning

- Onboarding and provisioning can instantiate the initial tenant, user, and membership state that
  later enters this family.
- The identity/workspace family begins where that prepared state must remain coherent as a real
  operating context.
- Onboarding handoff does not define the whole enduring cross-cutting family.

### 7.4 Relationship to B2B Exchange Core

- B2B depends on truthful tenant-bounded actor, role, and workspace continuity.
- The identity/workspace family supplies that enabling continuity without replacing B2B as the
  parent commercial access model.
- B2B-specific exchange posture remains separate from the shared boundary defined here.

### 7.5 Relationship to B2C Tenant-Branded Commerce

- B2C depends on lawful authenticated consumer or tenant-branded user continuity where supported.
- The identity/workspace family does not define B2C public-safe discovery, branded browse-entry,
  or consumer parent-family posture.
- B2C and identity continuity must remain separate so storefront entry truth is not mistaken for
  full tenant-bound permissions/workspace ownership.

### 7.6 Relationship to White-Label Overlay

- White-label may overlay or route into lawful tenant/workspace continuity.
- White-label does not define the whole cross-cutting family and does not replace it as an enabling
  boundary.
- WL admin or branded session behavior is evidence of adjacent reuse, not canonical identity-
  family ownership.

### 7.7 Relationship to Orders / Checkout / Post-Purchase

- Orders depends on the correct tenant-bound actor and workspace context to make downstream
  execution continuity truthful.
- Identity/workspace continuity does not define downstream order-family behavior.
- The downstream orders family remains separate from the cross-cutting enabling boundary defined
  here.

### 7.8 Relationship to Payments / Escrow / Settlement / Fee Visibility

- Payments depends on lawful tenant, actor, and permission continuity to make finance-state
  visibility truthful.
- Identity/workspace continuity does not define downstream finance-state behavior.
- The downstream finance-state family remains separate from the cross-cutting enabling boundary
  defined here.

## 8. Current Sources Of Drift This Family Design Is Meant To Stop

This family design is specifically meant to stop the following recurring planning errors:

- treating tenant back-office memberships or tenant-admin RBAC as if they define the whole
  identity/workspace family
- treating control-plane admin RBAC, tenant details, or impersonation as if they define the whole
  family
- treating onboarding activation or first-owner handoff as if it owns all later tenant/workspace
  continuity
- treating B2B, B2C, or white-label entry posture as if the parent or overlay family defines the
  underlying identity/workspace family
- treating generic login/session/shell evidence as sufficient proof of whole-family continuity
- widening identity-family planning into auth rewrite, routing redesign, schema redesign, or
  implementation completion claims

## 9. Inheritance Rules For Later Planning

Later units should inherit the following rules from this family anchor:

- if a later family needs tenant-bounded actor truth, membership truth, permission truth, or
  workspace context truth, it should cite this family rather than silently redefining it
- no later family may claim identity/workspace ownership merely because it exposes admin modules,
  login/session behavior, or impersonation entry
- no later family may replace `org_id` as the canonical tenant boundary
- no later family may use generic shell presence as a substitute for lawful permissions/workspace
  continuity
- later runtime or implementation work must stay bounded to its local problem and must not claim to
  have redesigned the whole cross-cutting family unless explicitly opened as such

## 10. What Remains Deferred After This Anchor

This anchor resolves the family-classification gap only.

It does not by itself resolve:

- messaging / notifications family design
- domain / tenant routing / brand-surface management family design
- any auth/session/runtime defect
- any permissions-engine redesign
- any route-contract, API-contract, or schema redesign
- any production proof that every tenant/workspace continuity path is complete

Those remain separate follow-on concerns if and when later units explicitly open them.

## 11. Readiness Outcome

After this artifact:

- repo planning truth now has an explicit canonical anchor for the cross-cutting identity /
  tenancy / permissions / workspace continuity family
- adjacent family anchors can now reference one shared enabling-family boundary instead of
  repeatedly deferring into ambiguous neighboring evidence
- future planning no longer needs to infer identity-family ownership from tenant admin surfaces,
  control-plane RBAC, onboarding handoff, or generic auth/session evidence alone

That is the full purpose of this unit.