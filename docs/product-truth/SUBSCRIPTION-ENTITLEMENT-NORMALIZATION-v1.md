# SUBSCRIPTION-ENTITLEMENT-NORMALIZATION-v1

Status: Approved normalization artifact for launch-truth alignment

## 1. Purpose and Authority

This artifact normalizes TexQtic's subscription, plan, entitlement, and commercial-packaging truth for launch planning.

Launch scope for subscription / commercial packaging is already locked. This family is `LOCKED IN FOR LAUNCH`, `PRE-LAUNCH REQUIRED`, and `NORMALIZATION-FIRST` in the approved launch overlay.

This document does not authorize implementation by itself. It does not open a governed unit, does not modify Layer 0, does not design billing systems, and does not imply that broad entitlement enforcement already exists.

Authority order used for this artifact:

1. Layer 0 governance posture:
   - governance/control/OPEN-SET.md
   - governance/control/NEXT-ACTION.md
   - governance/control/SNAPSHOT.md
   - governance/control/BLOCKED.md
   - governance/log/EXECUTION-LOG.md
2. TECS.md
3. Launch overlay:
   - docs/product-truth/TEXQTIC-LAUNCH-READINESS-REQUIREMENTS-v1.md
   - docs/product-truth/TEXQTIC-LAUNCH-SCOPE-DECISION-RECORD-v1.md
   - docs/product-truth/TEXQTIC-LAUNCH-PLANNING-SPLIT-v1.md
4. Active product-truth stack:
   - docs/product-truth/TEXQTIC-GAP-REGISTER-v2.md
   - docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v2.md
   - docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v2.md
5. Current repo evidence surfaces:
   - server/prisma/schema.prisma
   - shared/contracts/openapi.tenant.json
   - shared/contracts/openapi.control-plane.json
   - App.tsx
   - types.ts
   - components/ControlPlane/TenantRegistry.tsx
   - components/ControlPlane/TenantDetails.tsx
   - services/controlPlaneService.ts
   - services/tenantService.ts
   - server/src/lib/aiBudget.ts
   - server/src/services/tenantProvision.service.ts
   - server/src/types/index.ts
   - server/src/types/tenantProvision.types.ts
   - server/src/routes/tenant.ts
   - components/Onboarding/OnboardingFlow.tsx

Repo-path note:

- The required inspected surfaces existed.
- `components/Onboarding/OnboardingFlow.tsx` contains no subscription / plan / billing language in the current repo truth, so it contributes absence-of-evidence rather than an explicit plan-selection model.

## 2. Current Posture Summary

Subscription / commercial packaging is already retained in launch scope. The launch overlay also already says this family is not deferred and must pass through normalization before implementation-design or launch language depends on it.

Normalization is required because current repo truth splits into four different truth classes that are not the same thing:

- `plan identity`: canonical plan values persisted at the data layer
- `plan display`: UI labels and frontend compatibility mappings
- `entitlement truth`: what a plan is supposed to mean in product terms
- `actual enforcement`: what the runtime materially blocks, allows, meters, or caps today

Current repo truth is coherent only at the narrowest level:

- canonical DB plan enums exist
- org-level plan persistence exists
- AI budgets are materially real and enforced

Current repo truth is not coherent at the broader launch-language level:

- frontend/runtime plan vocabulary is mixed
- `TRIAL`, `PAID`, `ENTERPRISE`, `FREE`, `PROFESSIONAL`, and legacy `BASIC` all appear across surfaces
- billing language appears in some admin UI surfaces without equivalent runtime-backed commercial operations
- broad entitlement enforcement is not coherently evidenced across the product

The required normalization outcome is therefore not a monetization redesign. It is one bounded launch-safe commercial truth that later implementation-design can inherit without overstating capability gating or billing maturity.

## 3. Current Repo Truth Summary

Current repo truth is strongest at the persistence and AI-governance layers, and weakest at the vocabulary and entitlement layers.

### DB plan enum truth

- `server/prisma/schema.prisma` defines `TenantPlan` as `FREE`, `STARTER`, `PROFESSIONAL`, `ENTERPRISE`
- `Tenant.plan` is a typed enum field with default `FREE`
- `organizations.plan` also persists plan state, but as a string-backed field rather than an enum-backed field
- `server/src/types/index.ts` mirrors the backend union as `FREE | STARTER | PROFESSIONAL | ENTERPRISE`

### Org / tenant plan persistence truth

- tenant session identity returned by `server/src/routes/tenant.ts` reads `organizations.plan`
- tenant provisioning copies the created tenant plan into the canonical `organizations` row in `server/src/services/tenantProvision.service.ts`
- frontend control-plane and tenant services expose `plan` as plain strings, not as a canonical normalized enum

### Frontend / runtime plan vocabulary truth

- `App.tsx` normalizes plan display to `TRIAL | PAID | ENTERPRISE`
- `App.tsx` maps `PROFESSIONAL -> PAID`
- `types.ts` defines tenant config plan as `TRIAL | PAID | ENTERPRISE`
- `components/ControlPlane/TenantRegistry.tsx` maps legacy `BASIC -> TRIAL`
- `App.tsx` falls back to `TRIAL` when tenant plan is absent during some frontend rehydration paths

### AI budget enforcement truth

- `server/src/lib/aiBudget.ts` loads tenant AI budget policy from `ai_budgets`
- the runtime meters usage monthly
- the runtime enforces hard-stop behavior through `BudgetExceededError`
- tenant OpenAPI surfaces explicitly document AI routes as budget-enforced and can return `429 Budget exceeded`

### Onboarding / provisioning plan-selection truth

- current provisioning request surfaces do not take plan as an explicit input
- `components/Onboarding/OnboardingFlow.tsx` contains no plan-selection or subscription language
- current repo truth therefore does not evidence a launch-grade plan-selection flow during provisioning or onboarding

### Broad entitlement / gating truth

- no inspected product-wide entitlement matrix is evidenced
- no inspected launch-family access model is gated by plan in the reviewed runtime surfaces
- no inspected control-plane or tenant-plane route family was evidenced as broadly switching behavior by plan tier
- the materially real enforcement class in the inspected surfaces is AI budget policy, not broad feature entitlement

Normalization conclusion:

- `plan persistence` is real
- `AI budget enforcement` is real
- `broad entitlement enforcement` is `UNKNOWN / VERIFY IN REPO` at best and not safe to claim as launch truth today

## 4. Subscription Normalization Surface Audit

| Surface / Source | Current Subscription / Plan Truth | Alignment | Why | Normalization Needed? | Required Normalized Interpretation |
| --- | --- | --- | --- | --- | --- |
| `server/prisma/schema.prisma` | Canonical `TenantPlan` enum exists as `FREE / STARTER / PROFESSIONAL / ENTERPRISE`; `Tenant.plan` defaults to `FREE`; `AiBudget` is real; `organizations.plan` is persisted as string | `PARTIAL` | Canonical plan identity exists, but org-level mirror is string-backed rather than enum-backed | `YES` | Treat `TenantPlan` as the `CANONICAL PLAN VOCABULARY`; treat `organizations.plan` as org-level persistence that must carry canonical values, not as an invitation for alternate vocabularies |
| `server/src/types/index.ts` | Backend type alias mirrors `FREE / STARTER / PROFESSIONAL / ENTERPRISE` | `ALIGNED` | Supports the DB enum truth cleanly | `NO` | Preserve as backend-adjacent canonical vocabulary |
| `server/src/routes/tenant.ts` | Tenant session identity returns `organizations.plan` as a raw string | `PARTIAL` | Plan is exposed, but not normalized or typed as a canonical enum at the route boundary | `YES` | Read tenant plan as persisted identity metadata, not as proof of broad entitlements |
| `shared/contracts/openapi.tenant.json` | Tenant identity exposes `plan` as plain string; AI endpoints explicitly budget-enforced with `429 Budget exceeded` | `PARTIAL` | AI budget enforcement is explicit, but plan meaning is underdefined and unconstrained in contract shape | `YES` | Treat contracts as proving plan exposure plus AI-budget enforcement only; do not infer plan-driven feature gating |
| `shared/contracts/openapi.control-plane.json` | Control-plane tenant object exposes `plan` as plain string; tenant details mention AI budget | `PARTIAL` | Control-plane sees plan metadata and AI budget, but contract does not define canonical plan values or entitlement model | `YES` | Treat control-plane contract as administrative visibility, not entitlement semantics |
| `services/controlPlaneService.ts` | Tenant interfaces expose `plan: string`; provisioning request has no plan field | `PARTIAL` | Service layer carries plan metadata but does not normalize it; provisioning does not evidence plan selection | `YES` | Treat control-plane service truth as visibility plus admin provisioning only; no launch-safe claim of commercial assignment workflow |
| `services/tenantService.ts` | Activation response exposes tenant `plan: string` only | `PARTIAL` | Plan survives activation response, but carries no entitlement semantics | `YES` | Treat tenant service plan as identity metadata only |
| `server/src/services/tenantProvision.service.ts` + `server/src/types/tenantProvision.types.ts` | Provisioning creates tenant with default plan and mirrors it into `organizations`; no request-time plan selection | `ALIGNED` | Confirms manual/admin provisioning exists, but does not expose commercial selection depth | `NO` | Treat plan assignment at provisioning as system default persistence, not launch-grade subscription checkout or sales-ops workflow |
| `components/Onboarding/OnboardingFlow.tsx` | No plan / subscription / billing language present | `UNDERDEFINED` | Onboarding does not currently represent subscription truth at all | `YES` | Treat onboarding as non-evidence for subscription selection, packaging, or entitlement assignment |
| `App.tsx` plan mapping / display | Frontend compatibility layer normalizes to `TRIAL / PAID / ENTERPRISE`; maps `PROFESSIONAL -> PAID`; defaults to `TRIAL`; sets `billingStatus: CURRENT` in UI config | `MISALIGNED` | This is a display-driven compatibility model, not canonical plan truth; it also implies billing posture without backend-backed billing evidence | `YES` | Treat `TRIAL / PAID / ENTERPRISE` as `DISPLAY-ONLY` shorthand at most; they must stop being treated as canonical plan names |
| `types.ts` plan-related types | `TenantConfig.plan` is the frontend-only union `TRIAL, PAID, ENTERPRISE`; `billingStatus` is a fixed frontend union | `MISALIGNED` | Frontend type system codifies drifted plan vocabulary and a billing model not evidenced as canonical | `YES` | Treat these as legacy compatibility types, not source-of-truth subscription semantics |
| `components/ControlPlane/TenantRegistry.tsx` | Maps `BASIC -> TRIAL`; labels one metric `Active (Paid)` while counting `status === ACTIVE`; displays plan column and AI cap; sets `billingStatus: CURRENT` | `OVERCLAIM` | This surface mixes plan, status, and billing truth and contains legacy mapping not backed by canonical DB enums | `YES` | Treat the registry as admin display only; none of its labels prove canonical plan meaning, paid state, or broad entitlements |
| `components/ControlPlane/TenantDetails.tsx` | `Plan & Quotas` tab exists but falls under under-construction default view; `Billing` tab shows fixed billing widgets and statement generation language | `OVERCLAIM` | Billing/commercial depth is suggested in UI without equivalent runtime-backed billing operations in the inspected surfaces | `YES` | Treat this surface as non-authoritative for launch claims about invoices, MRR, unbilled usage, or statement generation |
| `server/src/lib/aiBudget.ts` | Loads budget policy from DB, meters usage monthly, and hard-stops requests when over limit | `ALIGNED` | This is clear `MATERIALLY ENFORCED` entitlement-like behavior | `NO` | Treat AI budget control as the one inspected commercial enforcement class that is currently safe to claim |

## 5. Canonical Normalized Plan Vocabulary

The `CANONICAL PLAN VOCABULARY` for launch truth is:

- `FREE`
- `STARTER`
- `PROFESSIONAL`
- `ENTERPRISE`

Strict basis:

- this is the canonical enum in `server/prisma/schema.prisma`
- this is the backend type union in `server/src/types/index.ts`
- tenant provisioning and tenant session identity already persist and propagate plan values from this backend-aligned model

Mapping from current drifted labels:

| Drifted label | Normalized treatment | Why |
| --- | --- | --- |
| `TRIAL` | `DISPLAY-ONLY` shorthand at most; do not treat as canonical plan | Not in canonical DB plan enum; currently used in frontend compatibility code and can be confused with lifecycle/state language |
| `PAID` | `DISPLAY-ONLY` grouping at most; do not treat as canonical plan | Not a canonical plan value; collapses distinct canonical plans into one label |
| `BASIC` | Non-canonical legacy drift; stop treating as current truth | Not present in canonical DB enum; only appears in legacy frontend mapping |
| `PROFESSIONAL -> PAID` | Unsafe canonical remap; keep only as temporary display grouping if explicitly marked display-only | Hides the canonical plan identity actually stored in repo truth |

Safe shorthand preservation rules:

- `ENTERPRISE` is safe as both canonical and display label because it already matches canonical truth
- `TRIAL` may be preserved only as narrow UX shorthand for a free or evaluation posture if the surface explicitly avoids claiming it is the canonical persisted plan name
- `PAID` may be preserved only as a non-canonical grouped display label if implementation-design later decides that grouped display is still useful

Labels that must stop being treated as canonical:

- `TRIAL`
- `PAID`
- `BASIC`

## 6. Normalized Entitlement / Commercial Truth Statement

The canonical normalized internal launch truth is:

- At launch, a `plan` means the canonical commercial identity assigned to an organization / tenant using the persisted vocabulary `FREE / STARTER / PROFESSIONAL / ENTERPRISE`.
- At launch, `plan assignment` means an operator-controlled or system-default commercial label persisted on the tenant / organization record. It does not mean self-serve checkout, automated billing activation, or a fully expressed entitlement matrix.
- At launch, `entitlement` means only a capability that the runtime materially meters, caps, blocks, or otherwise enforces through code and data-path behavior.

What is `MATERIALLY ENFORCED` today in the inspected repo truth:

- AI budget policy loading from `ai_budgets`
- monthly AI usage metering
- hard-stop or soft-limit AI budget behavior based on stored policy
- tenant AI endpoints documented to return `429 Budget exceeded`

What is not materially enforced today in the inspected repo truth:

- broad product-wide feature availability by plan tier
- mode access by plan tier
- onboarding approval by plan tier
- provisioning choice by plan tier
- billing status progression by plan tier
- invoice / statement / revenue-operation behavior by plan tier
- coherent product-wide entitlements matrix

The normalized launch-safe statement is therefore:

- TexQtic has canonical persisted plan identity and materially real AI budget governance.
- TexQtic does not yet evidence broad plan-driven entitlement enforcement across the product.
- TexQtic may safely claim bounded commercial packaging and manual/commercial plan assignment for launch only if it does not imply automated billing operations or product-wide entitlement gating.

## 7. Allowed vs Forbidden Launch Claims

### ALLOWED TO CLAIM

- subscription / commercial packaging is `LOCKED IN FOR LAUNCH`
- canonical plan values exist in repo truth
- plan identity is persisted at the tenant / organization level
- AI budget controls are real and `MATERIALLY ENFORCED`
- plan data is visible in tenant and control-plane identity surfaces
- commercial assignment may be treated as bounded internal / operator-controlled launch truth

### NOT ALLOWED TO CLAIM YET

- broad product-wide entitlement gating by plan
- fully automated billing or subscription lifecycle management
- invoice generation, revenue operations, or statement workflows as materially real commercial truth
- launch-grade self-serve plan selection during onboarding or provisioning
- `TRIAL`, `PAID`, or `BASIC` as canonical plan vocabulary
- plan display fields as proof of entitlement enforcement
- AI budget enforcement as proof that all commercial entitlements are already real

## 8. Normalized Inheritance Rules for Future Implementation-Design

Future implementation-design planning must inherit the following fixed truth:

1. `CANONICAL PLAN VOCABULARY` is `FREE / STARTER / PROFESSIONAL / ENTERPRISE`
2. `MATERIALLY ENFORCED` means runtime logic materially meters, caps, blocks, or changes behavior through code plus persisted data-path support
3. AI budget policy is the current benchmark example of real commercial enforcement
4. `DISPLAY-ONLY` plan truth includes grouped labels, compatibility mappings, hardcoded billing status, and UI widgets not backed by runtime commercial operations
5. existing fields alone do not prove entitlement maturity; `Tenant.plan`, `organizations.plan`, and control-plane plan display are insufficient by themselves
6. first implementation-design for this family must stay out of payment processor integration, invoice operations, finance-ops redesign, and broad monetization architecture
7. future work must not infer that every launch family is already plan-gated just because plan metadata exists

What counts as real enforcement:

- an inspected route, service, or server library materially accepting or denying behavior based on commercial policy
- persisted policy plus runtime hard-stop or bounded allow/deny behavior

What counts as display-only or metadata-only truth:

- compatibility mappings like `PROFESSIONAL -> PAID`
- legacy mapping like `BASIC -> TRIAL`
- fixed `billingStatus: CURRENT`
- billing widgets with static numbers
- plan strings returned without entitlement semantics

What is out of scope for the first implementation-design phase:

- payment processor integration
- invoicing / receivables redesign
- platform-wide commercial ledger design
- broad finance operations redesign
- marketing/pricing strategy redesign

## 9. Remaining Normalization Gaps

- mixed naming across DB/backend/frontend remains present today
- org-level plan persistence is string-backed rather than enum-backed in the current schema surface
- frontend compatibility layers still treat `TRIAL / PAID / ENTERPRISE` as the practical plan model
- legacy `BASIC` mapping still exists in control-plane tenant registry logic
- plan display and billing display are mixed together in admin surfaces
- onboarding / provisioning do not yet express a coherent plan-selection posture
- entitlements are not represented coherently beyond AI budget policy
- billing/package wording in some admin UI surfaces outruns inspected runtime truth

These are still normalization gaps, not proof that a billing system design should start now.

## 10. Post-Normalization Recommendation

### READY FOR IMPLEMENTATION-DESIGN PLANNING

Strict justification:

1. canonical plan vocabulary is now selectable from current repo truth without invention
2. the distinction between canonical plan identity, display vocabulary, entitlement truth, and actual enforcement is now explicit
3. the repo-backed enforcement boundary is now clear: AI budget governance is real; broad entitlement gating is not yet evidenced
4. future implementation-design can now inherit one bounded truthful model without needing another normalization pass first

This recommendation does not imply that implementation-design should widen into billing architecture. It means the family is now coherent enough for a bounded design phase that reconciles naming, display, and enforcement posture without overstating commercial maturity.

## 11. Boundaries and Non-Decisions

This document does not:

- authorize implementation
- design billing systems
- decide payment processor integration
- design invoice or finance-ops architecture
- normalize unrelated launch families
- assume broad entitlement enforcement already exists
- revise launch scope
- create a TECS opening
- claim that display-only billing or plan surfaces are commercially authoritative

## 12. Completion Checklist

- [x] Layer 0 reviewed
- [x] TECS doctrine reviewed
- [x] Launch overlay docs reviewed
- [x] Relevant schema/contracts/runtime surfaces inspected
- [x] Surface audit completed
- [x] Canonical plan vocabulary selected
- [x] Allowed vs forbidden launch claims written
- [x] Inheritance rules defined
- [x] Remaining normalization gaps listed
- [x] Post-normalization recommendation made
- [x] No runtime/schema/governance files modified beyond allowlist
