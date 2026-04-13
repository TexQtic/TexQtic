# TEXQTIC - TARGET STRUCTURE DECISION TENANT FAMILY WL AGGREGATOR PACKAGE BACKOFFICE WORK ITEM 001 - 2026-04-13

Status: bounded architectural structure-decision record
Date: 2026-04-13
Labels: STRUCTURE-DECISION; AUDIT-ONLY; NO-IMPLEMENTATION; NO-RUNTIME-MUTATION; HOLD-FOR-BOUNDARY-TIGHTENING

## 1. Preflight result

Exact commands run:

`git diff --name-only`

`git status --short`

Result:

- no output
- repo clean before execution

## 2. Exact files read

The exact files read in this pass were:

1. `governance/analysis/TEXQTIC-CROSS-SYSTEM-TENANT-ENTRY-FAMILY-PROVISIONING-PACKAGE-TRUTH-AUDIT-WORK-ITEM-001-2026-04-13.md`
2. `docs/product-truth/TEXQTIC-ONBOARDING-PROVISIONING-HANDOFF-DESIGN-v1.md`
3. `docs/product-truth/ONBOARDING-PROVISIONING-ACTIVATION-FAMILY-CONSOLIDATION-v1.md`
4. `runtime/sessionRuntimeDescriptor.ts`
5. `server/src/routes/admin/tenantProvision.ts`
6. `server/src/types/tenantProvision.types.ts`
7. `server/src/services/tenantProvision.service.ts`
8. `components/ControlPlane/TenantRegistry.tsx`
9. `docs/product-truth/AGGREGATOR-OPERATING-MODE-NORMALIZATION-v1.md`
10. `docs/product-truth/B2C-OPERATING-MODE-DESIGN-v1.md`
11. `docs/product-truth/B2B-EXCHANGE-OPERATING-MODE-DESIGN-v1.md`
12. `docs/product-truth/WL-BLUEPRINT-RUNTIME-RESIDUE-001-DESIGN-v1.md`
13. `docs/product-truth/WHITE-LABEL-OVERLAY-NORMALIZATION-v1.md`
14. `docs/product-truth/TENANT-BACK-OFFICE-FAMILY-DESIGN-v1.md`
15. `docs/product-truth/SUBSCRIPTION-ENTITLEMENT-NORMALIZATION-v1.md`

Why this exact read set was sufficient:

1. the completed cross-system audit reconstructs the current entry, family, WL, and package truth baseline
2. the onboarding and provisioning authorities confirm that subscription posture is downstream of the core owner-ready provisioning loop
3. the platform runtime and provisioning files show the exact current canonical category, WL, and plan persistence model
4. the B2B, B2C, Aggregator, WL, tenant back-office, and subscription normalization artifacts provide the minimum current product-truth authorities needed to decide the future target structure
5. the WL blueprint residue artifact was read while resolving WL authority, but it did not control the classification outcome for this pass

## 3. Exact current structure truth reconstructed

The exact current structure truth reconstructed in this pass is:

1. current platform runtime truth already distinguishes canonical tenant category, white-label capability, operating mode, overlays, and commercial plan as separate axes
2. `runtime/sessionRuntimeDescriptor.ts` currently treats `AGGREGATOR`, `B2B`, `B2C`, and `INTERNAL` as canonical tenant categories, derives WL storefront behavior from base category plus `whiteLabelCapability`, and derives `WL_ADMIN` as a separate overlay path
3. `server/src/routes/admin/tenantProvision.ts` and `server/src/types/tenantProvision.types.ts` treat `tenant_category` and `is_white_label` as explicit provisioning inputs, while plan or package is not a required provisioning input
4. `server/src/services/tenantProvision.service.ts` persists `tenant.type`, `isWhiteLabel`, and `plan` as separate data facts, which means canonical family identity, WL state, and commercial plan are already not the same thing
5. `components/ControlPlane/TenantRegistry.tsx` reflects the same separation by displaying `tenant_category`, WL state, and normalized plan independently in the control-plane tenant view
6. the completed cross-system audit already proved that public entry and CRM onboarding continuity do not yet carry the same canonical family and package fields all the way through to provisioning
7. `B2B-EXCHANGE-OPERATING-MODE-DESIGN-v1.md` and `B2C-OPERATING-MODE-DESIGN-v1.md` classify B2B and B2C as parent commercial access families
8. `WHITE-LABEL-OVERLAY-NORMALIZATION-v1.md` classifies WL as overlay capability and deployment or experience model, not a peer commercial family
9. `TENANT-BACK-OFFICE-FAMILY-DESIGN-v1.md` classifies tenant back office as one cross-mode tenant-owned administrative family rather than a separate admin office per commercial family
10. `SUBSCRIPTION-ENTITLEMENT-NORMALIZATION-v1.md` classifies plan as canonical commercial identity and bounded entitlement metadata, with materially real AI budget enforcement but no proven product-wide plan gating
11. `AGGREGATOR-OPERATING-MODE-NORMALIZATION-v1.md` classifies Aggregator at current truth as curated directory plus intent handoff, warns against reading shared nav or broad surfaces as proof of a distinct full operating loop, and requires future design to separate discovery, qualification, intent capture, handoff, and downstream execution ownership
12. the current runtime still treats `AGGREGATOR` as a peer category, but the same runtime also maps both `AGGREGATOR` and `INTERNAL` to `AGGREGATOR_WORKSPACE`, which is a current structural signal that Aggregator identity and workspace behavior are not yet durably separated from broader shared platform framing

The exact current-structure summary is:

`current truth already supports common tenant core plus parent commercial families plus WL overlays plus separate package posture, while Aggregator remains partially over-elevated in category taxonomy relative to its narrower curated-discovery and intent-handoff product truth`.

## 4. Exact target structure decision across all required axes

The exact target structure decision locked in this pass is:

### A. Canonical family model

The future canonical base taxonomy should not remain `B2B / B2C / AGGREGATOR / INTERNAL` as four peer runtime families.

The smallest truthful target model is:

1. base commercial families: `B2B` and `B2C`
2. non-commercial platform category: `INTERNAL`
3. WL remains an overlay or capability layer on top of a lawful base family
4. Aggregator is replanned out of peer base-family status and into a cross-family discovery, matching, and intent-handoff capability with its own user-facing operating context where entitled

### B. WL model

WL should remain overlay or capability logic on top of a base family.

It should not be replanned as a peer family.

Why this is the smallest truthful future model:

1. current platform runtime already resolves WL from base family plus capability state
2. current WL product-truth normalization already forbids WL from becoming a separate commercial pillar
3. WL-admin surfaces are meaningful, but product truth explicitly says they do not define the full tenant-admin or control-plane model
4. treating WL as peer family would fuse brand or deployment concerns with canonical commercial identity and would work against the stronger current truth already present in runtime and product-truth normalization

### C. Package or subscription model

Package or subscription should remain a separate commercial axis rather than being fused to family identity.

The smallest truthful future model is:

1. family answers what operating context the tenant fundamentally is
2. package answers what commercial posture, bundled entitlement posture, and metered capability posture the tenant has
3. plan-driven access claims must remain bounded to materially enforced or explicitly modeled entitlements rather than inferred from family identity

### D. Canonical point of truth

The future canonical ownership model should be split by responsibility.

The exact target ownership split is:

1. Marketing owns non-canonical discovery, demand capture, and public entry terminology only
2. CRM owns normalized pre-provisioning recommendation and approved handoff terminology for candidate family and package decisions at the case level
3. platform provisioning owns canonical persisted runtime truth for base family, WL overlay state, Aggregator entitlement state, and canonical package assignment at the moment a tenant becomes a real platform runtime object
4. platform runtime identity remains the authoritative consumer-facing read model after provisioning

The exact ownership lock is therefore:

`marketing is never canonical for family or package truth, CRM is canonical only for approved upstream handoff intent and decision state, and platform provisioning plus runtime identity are canonical for persisted tenant family and package truth`.

## 5. Exact Aggregator decision

The exact Aggregator decision locked in this pass is:

1. Aggregator should not remain a peer canonical base runtime family in the future target structure
2. Aggregator should be reclassified as a cross-family entitlement-governed operating capability centered on curated directory, trust-signaled discovery, matching, qualification, and intent handoff
3. Aggregator should have no separate tenant-admin office as a full independent back-office system
4. Aggregator may have a lightweight Aggregator-specific control surface inside a common tenant-admin core where a tenant configures discovery participation, matching posture, directory presence, and handoff preferences
5. Aggregator should keep its own independent user navigation model for discovery, matching, and handoff workflows where a tenant or user is entitled to that capability
6. Aggregator directory or matching workflows must remain structurally separate from tenant-admin commercial and operational workflows

The exact required separation is:

1. Aggregator directory, matching, discovery, qualification, and intent-handoff workflows belong to the user-facing operating capability layer
2. tenant-admin commercial and operational workflows belong to the common tenant-back-office core
3. Aggregator-specific admin configuration is limited to capability-specific controls inside the common core and must not become a separate parallel office
4. downstream execution ownership for RFQ, B2B trade, B2C commerce, overlay administration, and platform supervision remains outside Aggregator capability ownership unless a later bounded family decision explicitly assigns it

The exact candidate test result is:

`the proposed candidate position is accepted, with the refinement that Aggregator may require a lightweight capability-specific control surface inside the shared tenant-admin core but must not retain or gain a separate tenant-admin office`.

## 6. Exact future tenant-admin or back-office structure chosen

The exact future tenant-admin or back-office model chosen in this pass is:

`one common core with family-specific operating overlays`.

Why this exact model is chosen:

1. current tenant back-office product truth already classifies tenant admin as one cross-mode family that supports B2B, B2C, Aggregator, and overlay-enabled contexts
2. WL product truth explicitly forbids collapsing all tenant admin into WL-admin
3. B2B and B2C family truths explicitly exclude tenant back office as their whole-family owner
4. Aggregator normalization supports discovery and handoff specialization without proving the need for a separate administrative office
5. a common-core model preserves coherent org profile, members, staff, settings, integrations, package, and capability administration while allowing bounded family-specific or capability-specific surfaces where they are truly needed

The exact model therefore is:

1. one shared tenant-admin core for organization, team, role, settings, package, integrations, and capability governance
2. family-specific overlays for B2B, B2C, and WL where operating posture truly differs
3. capability-specific overlays for Aggregator participation and discovery configuration
4. no full separate admin office per family

## 7. Exact cross-repo alignment obligations identified

The exact future cross-repo alignment obligations identified in this pass are:

### TexQtic main application

1. normalize canonical persisted tenant taxonomy around base family, overlay state, capability state, and package as separate fields
2. stop treating Aggregator as if it must remain a peer family once the target structure is implemented
3. keep WL and WL-admin expressed as overlay-derived surfaces, not peer-family identity
4. keep plan or package semantics explicit as commercial and entitlement posture rather than family identity
5. ensure runtime terminology distinguishes base family, overlay, capability, and package clearly in provisioning, runtime descriptor, control-plane, and tenant-facing copy

### TexQtic CRM

1. adopt the same canonical vocabulary for base family, WL overlay, Aggregator capability, and package posture in onboarding and customer-account language
2. stop using ambiguous intake labels that blur candidate family interest, overlay interest, and package posture into one generic commercial field
3. carry approved pre-provisioning family recommendation, WL overlay requirement, Aggregator capability requirement, and package recommendation as distinct case-level fields or equivalent normalized terms
4. hand off those normalized decisions into platform provisioning without claiming CRM is itself the canonical persisted runtime source

### TexQtic Marketing Website

1. keep marketing entry terminology non-canonical unless and until it captures structured candidate family, overlay, capability, or package interest using the same shared vocabulary
2. stop implying that WL or Aggregator are peer tenant families if public language is later expanded
3. describe Aggregator as directory, matching, or intent-handoff capability rather than as a separate back-office model or standalone commercial pillar
4. describe package as commercial posture and access packaging rather than as tenant-family identity
5. align request-access wording so the public surface feeds CRM with normalized candidate-family, overlay, capability, and package-interest vocabulary instead of generic drift terms

### Shared alignment obligation across all three repos

All three repos must later converge on the same canonical language for:

1. base family: `B2B` or `B2C` or `INTERNAL` where applicable
2. WL: overlay or capability, never peer family
3. Aggregator: cross-family discovery, matching, and intent-handoff capability, not separate back-office pillar
4. package: commercial and entitlement axis, not family identity
5. canonical persistence: platform provisioning and runtime identity
6. pre-canonical intake and handoff: marketing then CRM using normalized but non-persisted upstream language

## 8. Exact classification outcome

`TARGET-STRUCTURE-DECISION-LOCKED-HYBRID-WITH-AGGREGATOR-AS-CROSS-FAMILY-CAPABILITY`.

Why this classification is exact:

1. the evidence is strong enough to lock a common-core tenant-admin model rather than an insufficient-evidence result
2. the evidence rejects a fully separate family-admin model because tenant back-office is already normalized as a cross-mode family and WL is already normalized as overlay
3. the evidence also goes beyond a generic common-core-with-overlays result because the exact unresolved structural tension is Aggregator, and the current product truth plus runtime truth support reclassifying it into a cross-family capability model rather than keeping it as a peer family

## 9. Exact bounded proof added

The exact bounded proof added in this pass is:

1. proof that current runtime and provisioning truth already separate family, WL, and plan as distinct axes
2. proof that current B2B and B2C product truth support parent-family commercial access classification without absorbing tenant-admin or WL ownership
3. proof that current WL product truth locks WL as overlay and forbids peer-family promotion
4. proof that current tenant back-office truth supports one common tenant-owned administrative family across modes
5. proof that current subscription normalization supports package as separate commercial identity and entitlement axis rather than family identity
6. proof that current Aggregator normalization defines a narrower discovery and intent-handoff model than a full separate tenant-admin or transaction office, which is sufficient to lock the future reclassification decision

## 10. Exact validation checks run and results

Validation and closeout checks run in this pass:

1. diagnostics check
   - result: this artifact reported no relevant diagnostics
2. scope check: `git diff --name-only`
   - result: no output
3. scope check: `git status --short`
   - result: `?? governance/analysis/TEXQTIC-TARGET-STRUCTURE-DECISION-TENANT-FAMILY-WL-AGGREGATOR-PACKAGE-BACKOFFICE-WORK-ITEM-001-2026-04-13.md`
4. scope conclusion
   - result: the only changed path before staging was this exact artifact
5. procedural closeout gate
   - result: same-pass artifact-only commit remained lawful

## 11. Governance state changed: yes/no

Governance state changed: no.

The governing posture remains `HOLD-FOR-BOUNDARY-TIGHTENING`.

Layer 0 remains read-only.

## 12. Recording artifact path updated

`governance/analysis/TEXQTIC-TARGET-STRUCTURE-DECISION-TENANT-FAMILY-WL-AGGREGATOR-PACKAGE-BACKOFFICE-WORK-ITEM-001-2026-04-13.md`

## 13. Final git diff --name-only

Exact final output observed after writing the artifact and before the same-pass procedural closeout commit:

```text

```

## 14. Final git status --short

Exact final output observed after writing the artifact and before the same-pass procedural closeout commit:

```text
?? governance/analysis/TEXQTIC-TARGET-STRUCTURE-DECISION-TENANT-FAMILY-WL-AGGREGATOR-PACKAGE-BACKOFFICE-WORK-ITEM-001-2026-04-13.md
```

## 15. Commit hash if any

No commit existed at the moment this artifact body was finalized for staging.

## 16. Final verdict

`TARGET-STRUCTURE-DECISION-LOCKED-HYBRID-WITH-AGGREGATOR-AS-CROSS-FAMILY-CAPABILITY`

## 17. Next prompt draft

Prompt: `TEXQTIC - SAFE-WRITE MODE TASK: Using the locked target structure decision for tenant family, WL, Aggregator, package, canonical ownership, and tenant-admin/back-office structure, draft the smallest truthful architectural governance statement only, without reopening implementation planning, runtime mutation, CRM white-paper work, or marketing white-paper work.`
<!-- end -->