# SUBSCRIPTION-ENTITLEMENT-IMPLEMENTATION-DESIGN-v1

Status: Bounded implementation-design artifact derived from approved subscription normalization

## 1. Purpose and Authority

This artifact translates the approved subscription / entitlement normalization into a bounded implementation-design plan.

This family is already locked in launch scope and has already passed the required normalization-first phase through `SUBSCRIPTION-ENTITLEMENT-NORMALIZATION-v1`. The remaining question is not what commercial truth means. The remaining question is what minimum implementation slices are required to make that normalized truth materially consistent across current runtime surfaces.

This artifact does not:

- open a governed TECS unit
- modify Layer 0
- redesign billing operations
- introduce payment processor integration
- define invoice, collections, finance-ops, or revenue-recognition architecture
- claim that broad plan-driven entitlements already exist

Authority order used for this artifact:

1. Layer 0 governance posture
2. `TECS.md`
3. Launch overlay:
   - `docs/product-truth/TEXQTIC-LAUNCH-READINESS-REQUIREMENTS-v1.md`
   - `docs/product-truth/TEXQTIC-LAUNCH-SCOPE-DECISION-RECORD-v1.md`
   - `docs/product-truth/TEXQTIC-LAUNCH-PLANNING-SPLIT-v1.md`
4. Approved normalization artifact:
   - `docs/product-truth/SUBSCRIPTION-ENTITLEMENT-NORMALIZATION-v1.md`
5. Active planning stack:
   - `docs/product-truth/TEXQTIC-GAP-REGISTER-v2.md`
   - `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v2.md`
   - `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v2.md`
6. Current repo evidence surfaces reviewed for this design:
   - `server/prisma/schema.prisma`
   - `shared/contracts/openapi.tenant.json`
   - `shared/contracts/openapi.control-plane.json`
   - `App.tsx`
   - `types.ts`
   - `components/ControlPlane/TenantRegistry.tsx`
   - `components/ControlPlane/TenantDetails.tsx`
   - `services/controlPlaneService.ts`
   - `services/tenantService.ts`
   - `server/src/lib/aiBudget.ts`
   - `server/src/services/tenantProvision.service.ts`
   - `server/src/types/index.ts`
   - `server/src/types/tenantProvision.types.ts`
   - `server/src/routes/tenant.ts`
   - `components/Onboarding/OnboardingFlow.tsx`

## 2. Design Baseline Inherited From Normalization

The following truths are fixed and must not be re-litigated by implementation design:

1. `CANONICAL PLAN VOCABULARY` is `FREE / STARTER / PROFESSIONAL / ENTERPRISE`.
2. Canonical plan identity already exists in persisted runtime truth.
3. `TRIAL`, `PAID`, and legacy `BASIC` are not canonical plan names.
4. Current repo truth materially proves AI budget governance and does not materially prove broad product-wide plan gating.
5. Current plan truth is split across persistence, display, and enforcement layers.
6. Launch-safe implementation must reconcile those layers without inventing a monetization platform.

That means the goal is bounded coherence, not commercial-system completeness.

## 3. Implementation Problem Statement

Current repo truth exposes four concrete implementation gaps inside this family:

1. Canonical plan identity exists in backend and persistence surfaces, but frontend runtime still codifies a drifted display vocabulary.
2. Tenant and control-plane contracts expose `plan` as an unconstrained string, so the runtime does not communicate canonical plan truth cleanly at the boundary.
3. Control-plane surfaces mix plan, billing, and status language in ways that overclaim commercial maturity.
4. AI budget enforcement is materially real, but it is not yet presented as the bounded enforcement class that it actually is.

The minimum implementation-design target is therefore:

- make canonical plan identity consistent across backend-adjacent and frontend-adjacent runtime
- separate canonical plan identity from display grouping
- preserve AI budget as the one materially enforced commercial control
- reduce or remove UI overclaim where current surfaces imply billing depth or paid-state certainty that repo truth does not support
- keep provisioning and onboarding truthful by not pretending they already support launch-grade plan selection

## 4. Fixed Boundary For This Design

This implementation design is bounded to subscription truth alignment and surface correction in the current repo.

Included boundary:

- canonical plan vocabulary propagation
- frontend type and mapping alignment
- tenant identity and control-plane identity plan handling
- AI budget visibility alignment
- bounded admin/UI copy and label correction where current wording overclaims billing truth
- explicit separation between metadata-only plan identity and materially enforced controls

Excluded boundary:

- payment gateway integration
- subscription checkout
- recurring billing engine
- invoices, statements, receivables, collections, or tax calculation systems
- finance-ops redesign
- broad feature-flag or mode-access gating by plan
- migration strategy beyond minimal notes about existing persisted fields
- changing launch scope or opening governance units

## 5. Existing Capability Reuse Map

This design intentionally reuses current repo reality instead of inventing new subsystems.

### 5.1 Canonical plan source

Existing reusable authority:

- `server/prisma/schema.prisma` already defines canonical `TenantPlan`
- `server/src/types/index.ts` already mirrors the canonical backend union
- `server/src/services/tenantProvision.service.ts` already persists plan identity into canonical organization-linked data
- `server/src/routes/tenant.ts` already returns tenant session identity with a `plan` field

Implementation implication:

- the design should treat existing backend canonical plan persistence as the source of truth, not replace it

### 5.2 AI budget enforcement source

Existing reusable authority:

- `server/src/lib/aiBudget.ts` already loads budget policy, meters monthly usage, and enforces hard-stop behavior
- tenant contract already documents budget-exceeded behavior
- control-plane list/detail surfaces already expose AI-budget-related data in some form

Implementation implication:

- the first implementation slice should reuse AI budget as the benchmark example of real commercial enforcement rather than inventing a full entitlement matrix

### 5.3 Control-plane visibility source

Existing reusable authority:

- `services/controlPlaneService.ts` already exposes tenant plan metadata
- `components/ControlPlane/TenantRegistry.tsx` and `components/ControlPlane/TenantDetails.tsx` already show plan-adjacent surfaces

Implementation implication:

- current control-plane surfaces can be corrected and bounded rather than replaced

### 5.4 Tenant runtime identity source

Existing reusable authority:

- `services/tenantService.ts` activation response exposes plan metadata
- `App.tsx` already performs tenant rehydration and plan mapping
- `types.ts` already centralizes frontend tenant config typing

Implementation implication:

- tenant runtime alignment should occur by tightening plan typing and mapping at the shared frontend identity layer, not by adding a second parallel plan model

## 6. Required Bounded Modules

This family breaks into five bounded implementation modules.

### Module A: Canonical Plan Identity Alignment

Goal:

- make frontend-adjacent plan identity consume the canonical vocabulary `FREE / STARTER / PROFESSIONAL / ENTERPRISE`

Primary surfaces:

- `types.ts`
- `App.tsx`
- `services/controlPlaneService.ts`
- `services/tenantService.ts`

Required outcome:

- frontend shared types stop treating `TRIAL / PAID / ENTERPRISE` as the canonical plan model
- tenant config and service types represent canonical plan identity directly or through an explicit compatibility wrapper that marks display-only values as non-canonical
- plan rehydration paths stop defaulting to misleading pseudo-canonical labels where repo truth does not support them

Non-goal:

- no new billing lifecycle or plan-purchase flow

### Module B: Display Vocabulary Containment

Goal:

- preserve any needed grouped or friendly plan labels only as explicit display shorthand

Primary surfaces:

- `App.tsx`
- `components/ControlPlane/TenantRegistry.tsx`
- any shared formatting helper introduced in a later code unit

Required outcome:

- `PAID` becomes, at most, a grouped display label and no longer substitutes for canonical persisted plan identity
- `TRIAL` stops acting like the default canonical commercial identity unless explicitly rendered as UI shorthand
- legacy `BASIC` mapping is either removed or isolated as migration-compatibility display behavior only

Non-goal:

- do not build a plan-marketing taxonomy or pricing-table system

### Module C: Contract and Service Boundary Tightening

Goal:

- make tenant-plane and control-plane service boundaries truthful about what plan data means

Primary surfaces:

- `shared/contracts/openapi.tenant.json`
- `shared/contracts/openapi.control-plane.json`
- `services/controlPlaneService.ts`
- `services/tenantService.ts`
- `server/src/routes/tenant.ts`

Required outcome:

- plan remains exposed as identity metadata
- contract language, service typing, or adjacent documentation no longer imply that `plan` alone proves entitlement completeness
- AI budget remains the only explicit enforcement class described as materially enforced in this family

Non-goal:

- do not over-specify a product-wide entitlement matrix that repo truth cannot currently defend

### Module D: Control-Plane Commercial Surface Truthfulness

Goal:

- remove or reduce commercial overclaim in currently mixed admin surfaces

Primary surfaces:

- `components/ControlPlane/TenantRegistry.tsx`
- `components/ControlPlane/TenantDetails.tsx`

Required outcome:

- status labels stop implying that `ACTIVE` means `Paid`
- plan and AI budget remain visible as operator metadata
- billing tabs or widgets that suggest statement generation, MRR depth, or unbilled-usage truth are either bounded explicitly or no longer presented as launch-grade commercial operations

Non-goal:

- do not turn this family into the broader platform-ops boundary family or a finance console redesign

### Module E: Onboarding and Provisioning Truth Preservation

Goal:

- keep plan-selection truth honest where current provisioning/onboarding flows do not support commercial assignment choice

Primary surfaces:

- `components/Onboarding/OnboardingFlow.tsx`
- `server/src/services/tenantProvision.service.ts`
- `server/src/types/tenantProvision.types.ts`
- `shared/contracts/openapi.control-plane.json`

Required outcome:

- current provisioning continues to be treated as admin-led tenant creation with default or operator-assigned plan identity, not subscription checkout
- onboarding is not described as a commercial plan-selection surface unless that later becomes materially real through a separate bounded unit

Non-goal:

- do not add self-serve subscription activation to onboarding in this family

## 7. Minimal Data / Entity Notes

This family is intentionally light on data-model change.

Current authoritative data truth already exists:

- canonical backend plan enum exists
- organization-level plan persistence exists
- AI budget persistence exists

Implementation-design conclusion:

- first bounded implementation should prefer consuming and aligning existing plan fields rather than introducing new subscription entities
- no new subscription ledger, invoice, entitlement-rule, or payment-provider entity is required for this family's first bounded implementation
- if later implementation finds canonical typing drift between `Tenant.plan` and `organizations.plan`, that should be handled as bounded alignment work, not a broad schema redesign in this artifact

Practical data rule:

- persisted `plan` is identity metadata first
- `ai_budgets` is the materially enforced commercial-control table now
- all broader commercial semantics remain explicitly out of scope unless separately designed later

## 8. Endpoint and Service Design Notes

### Tenant-plane

Current truth:

- tenant identity already returns `plan`
- AI endpoints already expose budget-exceeded behavior through contract truth

Design direction:

- keep tenant session identity plan exposure
- tighten interpretation so tenant-plane code treats `plan` as canonical identity metadata plus any explicitly implemented enforcement hooks
- avoid implying that tenant mode access, checkout behavior, or exchange capabilities are broadly plan-gated today

### Control-plane

Current truth:

- control-plane lists and details already expose `plan`
- provisioning exists but does not accept explicit launch-grade plan-selection input

Design direction:

- control-plane service types should remain the admin visibility layer for plan identity
- any future plan-assignment affordance must be framed as operator administration, not subscription checkout, unless a later bounded family explicitly changes that

### Shared type boundary

Current truth:

- frontend shared types are where canonical truth drifts hardest today

Design direction:

- shared types become the first enforcement point for canonical vocabulary alignment
- any display grouping should be represented separately from persisted plan identity

## 9. UI / Surface Design Notes

### Tenant-facing surfaces

- plan display may remain simple and low-emphasis
- canonical plan name should be available where identity is shown
- AI budget surfaces may be emphasized because they are the strongest commercially enforced truth in current repo reality

### Control-plane registry

- plan column remains useful
- AI cap visibility remains useful
- labels such as `Active (Paid)` should be treated as design debt to remove because they collapse status and billing truth into one misleading metric

### Control-plane tenant details

- `Plan & Quotas` is the appropriate bounded place for plan identity plus AI-budget truth
- `Billing` should not imply a mature statement/invoice operations stack unless later bounded work proves it
- if static billing widgets remain temporarily, they must not drive launch truth or canonical commercial language

### Onboarding

- onboarding should remain verification- and activation-oriented in this family
- do not inject pseudo-subscription UX into onboarding without a separate bounded commercial-assignment decision

## 10. Workflow and State Notes

This family should standardize four different state classes instead of conflating them.

### State Class 1: Plan Identity

- canonical values: `FREE / STARTER / PROFESSIONAL / ENTERPRISE`
- persisted on tenant / organization surfaces

### State Class 2: Activation / Operational Status

- examples: `ACTIVE`, `SUSPENDED`, `PENDING_VERIFICATION`
- operational lifecycle state is not billing state and must not be presented as such

### State Class 3: Display Grouping

- examples: legacy or grouped labels such as `TRIAL` or `PAID`
- may exist only as compatibility display language, not canonical persistence truth

### State Class 4: Material Enforcement

- current materially evidenced commercial enforcement: AI budget policy and usage caps

Design requirement:

- implementation must keep these state classes separate in naming, typing, and UI labeling

## 11. Bounded Build Slices

The first lawful implementation sequence for this family is:

### Slice 1: Frontend canonical vocabulary alignment

- align `types.ts` and `App.tsx` with canonical plan values
- isolate any display-only grouping logic
- remove implicit treatment of drifted labels as canonical

### Slice 2: Control-plane surface correction

- correct registry labels and tenant-detail language that overclaim billing or paid-state truth
- preserve plan and AI-budget operator visibility

### Slice 3: Contract and service boundary tightening

- tighten plan interpretation across service interfaces and, if later allowlisted, adjacent contract descriptions
- make AI-budget enforcement the explicitly named bounded enforcement class

### Slice 4: Optional bounded operator plan-assignment refinement

- only if later repo-truth review supports it, add or clarify bounded admin-operated plan assignment semantics
- this remains optional and must not be reframed as checkout or automated subscription lifecycle

This ordering preserves the core principle:

- vocabulary and truth alignment first
- overclaim reduction second
- only then any bounded administrative refinement

## 12. Out Of Scope

Out of scope for the first implementation opened from this design:

- Stripe, Razorpay, Adyen, or any payment processor
- recurring billing engine
- invoices, statements, downloadable billing documents, or tax workflows
- collections, delinquency automation, or revenue reporting architecture
- product-wide entitlement matrix across all modes
- plan-gated B2B, B2C, WL, or Aggregator access control
- finance-ops redesign
- launch-scope changes
- database migration program for commercial-platform maturity

## 13. Readiness Recommendation

Recommendation: `READY FOR BOUNDED TECS OPENING CANDIDATE ANALYSIS`

Basis:

- normalization already fixed the commercial truth boundary
- current repo evidence is sufficient to define a narrow first implementation target
- the first target can be bounded cleanly around canonical vocabulary alignment, display containment, AI-budget truth reuse, and commercial overclaim reduction
- this family does not require one more implementation-design refinement before bounded opening analysis

The candidate opening implied by this artifact should remain narrow:

- it should not be framed as subscription platform build-out
- it should be framed as canonical subscription-truth alignment across identity, display, and bounded enforcement surfaces