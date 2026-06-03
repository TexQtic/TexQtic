# FAM-11A-SUBSCRIPTION-SCENARIO-MATRIX-AND-ENTITLEMENT-TAXONOMY-001

**Unit:** FAM-11A-SUBSCRIPTION-SCENARIO-MATRIX-AND-ENTITLEMENT-TAXONOMY-001
**Family:** FAM-11 — Subscription and Commercial Gating
**Mode:** TECS Safe Product Architecture / Repo-Truth Design
**Status:** COMPLETE — design-only, no source changes
**Created:** 2026-06-03
**Owner:** Paresh Patel (TexQtic founder)
**Authority boundary:** Design and taxonomy definition only. Does not authorize implementation.
  Does not widen Layer 0. Does not open a TECS unit. Does not modify any source surface.

---

## 1. Unit Summary

This artifact defines the complete subscription scenario matrix and entitlement taxonomy for
TexQtic, to be used as the canonical design reference before any FAM-11 implementation cycle.

It is grounded in current repo truth plus confirmed governance decisions:
- Canonical plan vocabulary is `FREE | STARTER | PROFESSIONAL | ENTERPRISE`
- MVP/pilot posture is **admin-assigned FREE plans only** (PRIT-018 confirmed)
- Self-serve subscription payment is **POST_MVP** (D-011 parked)
- No payment gateway integration exists or is authorized for MVP (§4.1 COMMERCE methodology)
- AI budget enforcement (`ai_budgets` + `ai_usage_meters`) is the **only** materially enforced
  commercial control in runtime today
- Feature gates exist per-named-feature, not per plan tier

---

## 2. Preflight Results

### 2.1 Git State at Start of Unit

```
git status --short   → (empty — clean working tree)
git rev-parse --short HEAD → acd01611
```

**Dirty tree status at start:** CLEAN — no uncommitted source changes.

### 2.2 FAM-07 Guard Checks

```
test ! -d governance/legal/fam-07           → PASS (directory absent)
test ! -f governance/legal/fam-07/supplier-onboarding-terms-authority.json → PASS (file absent)
```

FAM-07 legal hold preserved. Authority file absent, `blocking_reason_code=AUTHORITY_FILE_ABSENT`,
`legal_approved_transition_allowed=false`. This unit did not touch FAM-07.

---

## 3. Files Inspected

All files read as part of this design unit:

| File | Purpose |
|---|---|
| `server/prisma/schema.prisma` | Schema truth — TenantPlan enum, AiBudget, AiUsageMeter, FeatureFlag, TenantFeatureOverride models |
| `types.ts` | Frontend canonical type definitions — CommercialPlan, normalizeCommercialPlan, TenantConfig |
| `App.tsx` | Frontend plan rehydration — resolveTenantIdentityCarrier, normalizeCommercialPlan call paths |
| `server/src/lib/aiBudget.ts` | AI budget enforcement implementation — loadTenantBudget, enforceBudgetOrThrow, upsertUsage |
| `server/src/types/tenantProvision.types.ts` | Provisioning types — TenantProvisionRequest, NormalizedTenantProvisionRequest, resolveProvisioningStorageBridge |
| `server/src/services/tenantProvision.service.ts` | Provisioning service — plan field assignment path |
| `server/src/middleware/ttpFeatureGate.middleware.ts` | TTP feature gate — 2-layer pattern (global flag + tenant override) |
| `server/src/middleware/ncPoolFeatureGate.middleware.ts` | NC Pool feature gate — same pattern, key `nc.procurement_pools.enabled` |
| `server/src/middleware/ncPoolRfqFeatureGate.middleware.ts` | NC RFQ gate — key `nc.procurement_pools.rfq.enabled` |
| `server/src/middleware/ncPoolRfqAwardFeatureGate.middleware.ts` | RFQ Award gate — key `nc.procurement_pools.rfq.award.enabled` |
| `server/src/middleware/ncPoolSupplierInviteFeatureGate.middleware.ts` | Supplier Invite gate — key `nc.procurement_pools.supplier_invites.enabled` |
| `server/src/middleware/ncPoolSupplierQuoteFeatureGate.middleware.ts` | Supplier Quote gate — key `nc.procurement_pools.supplier_quotes.enabled` |
| `server/src/__tests__/gate-d5-ai-governance-rls.integration.test.ts` | AI budget RLS integration test |
| `server/src/__tests__/database-context.organization-identity.test.ts` | Plan propagation test evidence |
| `server/src/__tests__/auth-refresh-performance.integration.test.ts` | plan: 'FREE' in test fixture |
| `server/src/__tests__/auth-wave2-readiness.integration.test.ts` | plan: 'FREE' in test fixture |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | FAM-11 status: NOT_ASSESSED, P1_MVP_MUST_HAVE |
| `governance/launch-readiness/COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md` | MVP/pilot subscription posture, payment gateway gate |
| `docs/product-truth/SUBSCRIPTION-ENTITLEMENT-IMPLEMENTATION-DESIGN-v1.md` | Approved design boundary — canonical vocabulary, 5 modules, 4 build slices |

---

## 4. Current Repo-Truth Summary

### 4.1 What Exists in Runtime Today

| Surface | Current State |
|---|---|
| `Tenant.plan: TenantPlan` (Prisma) | Canonical enum — `FREE / STARTER / PROFESSIONAL / ENTERPRISE` |
| `organizations.plan: String` (Prisma) | Legacy plain string — not the TenantPlan enum (type sync gap) |
| `CommercialPlan` (types.ts) | Frontend union type — same 4 canonical values |
| `normalizeCommercialPlan()` (types.ts) | Normalization helper — maps `TRIAL→FREE`, `PAID→PROFESSIONAL`, `BASIC→FREE`, unknown→`FREE` |
| `TenantConfig.commercial_plan` | Runtime plan carrier through auth/session/activation |
| `App.tsx` plan rehydration | Reads `commercial_plan` or `plan`, normalizes via `normalizeCommercialPlan` |
| AI budget (`ai_budgets`) | Per-tenant monthly token limit + hard-stop flag — materially enforced |
| AI usage meter (`ai_usage_meters`) | Per-tenant/month token + cost tracking |
| `aiBudget.ts` | `loadTenantBudget`, `enforceBudgetOrThrow`, `upsertUsage` — fully implemented |
| Feature flags (`feature_flags`) | Per-named-feature global flags |
| Tenant feature overrides (`tenant_feature_overrides`) | Per-tenant per-feature override |
| Feature gate middlewares | 6 feature-specific gates (TTP, NC Pool, RFQ, Award, Invite, Quote) |

### 4.2 What Does NOT Exist

| Missing Capability | Confirmed by |
|---|---|
| Payment gateway integration (Stripe, Razorpay, Adyen) | COMMERCE methodology §4.1; zero code matches in any source file |
| Recurring billing engine | No schema table, no code, no route |
| Self-serve subscription checkout | PRIT-018 POST_MVP confirmation; no route exists |
| Invoice / statement / tax workflows for SaaS subscriptions | No schema table, no route, no service |
| Plan-tier-gated feature access matrix | No middleware checks `commercial_plan`; zero plan-conditional route guards |
| Entitlement rule table / entitlement enforcement | No schema model, no service |
| Self-serve plan upgrade / downgrade routes | No route exists |
| Subscription status field | No `subscription_status` in schema |
| Billing account / customer record | No schema model |

### 4.3 Key Type Sync Gap

`Tenant.plan` uses `TenantPlan` (Prisma enum, strongly typed).
`organizations.plan` uses `String @db.VarChar(30)` (plain string, not enum-constrained).
This gap means plan identity on the `organizations` table is not DB-enforced to canonical values.
Normalization must occur at the read boundary (currently handled by `normalizeCommercialPlan`).

### 4.4 Feature Gate Pattern (Current)

All 6 existing feature gate middlewares follow the same two-layer pattern:
1. **Layer 1** — global `FeatureFlag.enabled` check by key string
2. **Layer 2** — per-tenant `TenantFeatureOverride.enabled` check (if row exists and is `false`, block)

None of these gates inspect `commercial_plan`. They are per-named-feature gates, completely
orthogonal to plan-tier logic. This is the correct separation — feature flags and plan entitlements
are fundamentally different concepts (see §9 of this artifact).

---

## 5. Subscription Concept Separation

Before any implementation, these 8 concepts must be kept strictly separate in naming, typing,
and UI labeling:

| Concept | Definition | Current Status |
|---|---|---|
| **plan_tier** | Canonical commercial tier — `FREE / STARTER / PROFESSIONAL / ENTERPRISE` | EXISTS as metadata |
| **subscription_status** | Lifecycle state of the subscription agreement — e.g., `ACTIVE / TRIALING / PAST_DUE / CANCELLED` | NOT YET MODELED |
| **commercial_status** | Operational commercial state, separate from lifecycle — e.g., `ACTIVE / SUSPENDED / GRACE_PERIOD` | Partially covered by org status (`ACTIVE / SUSPENDED`) |
| **entitlement** | Named capability that a plan tier grants — e.g., `rfq_access`, `ai_assistant_access` | NOT YET MODELED |
| **quota** | Numerical limit on a resource — e.g., `max_team_members: 5` | Only AI tokens currently metered |
| **usage_meter** | Running count of resource consumption — e.g., tokens used this month | EXISTS for AI tokens |
| **feature_flag** | Named operational switch, independent of plan tier — e.g., `nc.procurement_pools.enabled` | EXISTS (6 keys) |
| **override** | Admin-explicit per-tenant deviation from global rule | EXISTS (TenantFeatureOverride) |
| **billing_account** | Commercial payment relationship record — customer ID, payment method | NOT YET MODELED |
| **invoice/payment_state** | State of a specific billing event — e.g., `PAID / UNPAID / OVERDUE` | NOT YET MODELED |

**Critical rule:** `plan_tier` is identity metadata. `subscription_status` is lifecycle. These must
never be collapsed into a single field, and neither must be treated as proof of the other.

---

## 6. Canonical Vocabulary Recommendation

### 6.1 Canonical Plan Tiers (CONFIRMED — do not change)

| Value | Tier Level | Meaning |
|---|---|---|
| `FREE` | 0 | Default pilot/unmetered tier |
| `STARTER` | 1 | Future self-serve entry tier |
| `PROFESSIONAL` | 2 | Future self-serve growth tier |
| `ENTERPRISE` | 3 | Future negotiated/custom tier |

These four values are the ONLY authorized canonical plan tier values. They are already in
`TenantPlan` (Prisma), `CommercialPlan` (types.ts), and provisioning types.

### 6.2 Forbidden Non-Canonical Values

| Value | Status | Reason |
|---|---|---|
| `TRIAL` | FORBIDDEN as canonical | Not a commercial tier; display-only shorthand at most |
| `PAID` | FORBIDDEN as canonical | Not a plan name; a grouped display label only |
| `BASIC` | FORBIDDEN as canonical | Legacy alias — must map to `FREE` via normalizer |
| `PREMIUM` | FORBIDDEN as canonical | Not in vocabulary; any use must be explicit display label |

### 6.3 Canonical Subscription Status Values (Recommended for Post-MVP)

When subscription status is modeled, use these values:

| Value | Meaning |
|---|---|
| `ACTIVE` | Subscription agreement active, plan in effect |
| `TRIALING` | In trial period (for future trial feature) |
| `PAST_DUE` | Payment overdue; grace period may apply |
| `CANCELLED` | Subscription cancelled; may be in run-out period |
| `SUSPENDED` | Manually suspended by operator |
| `PENDING_ACTIVATION` | Provisioned but not yet activated |

### 6.4 Canonical Commercial Status (MVP-Safe)

At pilot, commercial status is conveyed by `organizations.status` (operational lifecycle):

| Value | Meaning |
|---|---|
| `PENDING_VERIFICATION` | Onboarded, awaiting operator review |
| `VERIFICATION_APPROVED` | Operator-reviewed and approved |
| `ACTIVE` | Active tenant |
| `SUSPENDED` | Operator-suspended |
| `CLOSED` | Closed tenant |

Do NOT create a parallel `commercial_status` field for MVP. The operational `status` field on
`organizations` is sufficient for soft-launch. `subscription_status` is post-launch.

---

## 7. Full Scenario Matrix

### 7.1 Plan Tier Matrix

| Plan | Description | Provisioning | Payment | Self-Serve | AI Budget Default | Team Size | Commercial Features |
|---|---|---|---|---|---|---|---|
| FREE | Pilot/default | Admin-assigned | None | No | 50K tokens/mo | Configurable | Core access; admin-controlled features |
| STARTER | Entry commercial | Admin or future self-serve | Post-MVP | Post-MVP | TBD | Configurable | Core + some advanced |
| PROFESSIONAL | Growth commercial | Admin or future self-serve | Post-MVP | Post-MVP | TBD | Configurable | Full feature set |
| ENTERPRISE | Custom | Admin / negotiated | Offline invoice | Post-MVP | Custom/negotiated | Custom | All features + custom |

**MVP/pilot reality:** ALL active tenants at launch will be on `FREE`. STARTER/PROFESSIONAL/
ENTERPRISE tiers exist as identity values only — no differential entitlement logic is wired.

### 7.2 Subscription Lifecycle States Matrix

| Phase | State | MVP Support | Post-Launch |
|---|---|---|---|
| Pre-activation | `PENDING_VERIFICATION` | YES — org status field | YES |
| Active | `ACTIVE` | YES — org status field | YES |
| Paid-up | `subscription_status=ACTIVE` | NO — not modeled | YES |
| Trial | `subscription_status=TRIALING` | NO — not modeled | Candidate (FAM-11 future slice) |
| Grace period | `subscription_status=PAST_DUE` | NO — not modeled | YES |
| Cancelled | `subscription_status=CANCELLED` | NO — not modeled | YES |
| Manually suspended | `SUSPENDED` | YES — org status field | YES |
| Closed | `CLOSED` | YES — org status field | YES |

### 7.3 Commercial / Payment State Matrix

| State | Meaning | MVP Support | Notes |
|---|---|---|---|
| Operator-provisioned FREE | Pilot commercial state | YES | Admin assigns at provision time |
| Offline invoice agreement | Future B2B or pilot upsell | YES — off-platform | No gateway required |
| Self-serve subscription active | Recurring payment active | POST_MVP | Requires Razorpay + D-011 resolve |
| Payment past due | Recurring payment failed | POST_MVP | Requires billing engine |
| Payment in grace period | Soft suspension pending | POST_MVP | Requires billing engine |
| Cancelled + run-out | Access until period ends | POST_MVP | Requires billing engine |
| Platform-suspended | Operator action | YES (via org status) | No billing logic required |

### 7.4 Upgrade / Downgrade Scenario Matrix

| Scenario | MVP Support | Notes |
|---|---|---|
| Admin upgrades tenant plan (control plane) | YES — admin assigns plan | Plan update is metadata write |
| Tenant self-upgrades via checkout | POST_MVP (PRIT-018) | Requires Razorpay + D-011 |
| Admin downgrades tenant plan | YES — admin assigns plan | No billing refund logic at MVP |
| Plan downgrade entitlement enforcement | POST_MVP | Requires entitlement matrix implementation |
| Prorated billing on upgrade | POST_MVP | Requires billing engine |
| Immediate access on upgrade | YES at MVP (admin-side) | No payment gate at MVP |

### 7.5 Suspension / Cancellation / Grace-Period Matrix

| Scenario | MVP Support | Mechanism | Notes |
|---|---|---|---|
| Operator suspends tenant | YES | `organizations.status=SUSPENDED` | Auth enforces — SUSPENDED orgs cannot log in |
| Operator unsuspends tenant | YES | Admin control-plane action | Plan unchanged |
| Tenant cancels subscription | POST_MVP | Requires self-serve billing surface | Admin can close via control plane |
| Automatic suspension on payment failure | POST_MVP | Requires billing engine + webhook | Not in MVP |
| Grace period before suspension | POST_MVP | Requires billing engine | Not in MVP |
| Data retention on cancellation | Future | Needs policy decision (D-013) | Separate governance item |

---

## 8. Tenant-Type Commercial Matrix

| Tenant Type | Base Family | Aggregator Cap | White Label Cap | MVP Plan | Commercial Treatment |
|---|---|---|---|---|---|
| B2B Supplier | `B2B` | false | false | FREE | Core profile + catalog + RFQ access (feature-gated by NC flags) |
| B2B Buyer | `B2B` | false | false | FREE | RFQ pool access (feature-gated) |
| B2C/D2C Seller | `B2C` | false | false | FREE | Public storefront + catalog (no auth checkout at MVP) |
| Service Provider | `B2B` (role: service_provider) | false | false | FREE | B2B profile + inquiry inbox |
| White-Label | Any | false | **true** | FREE / future negotiated | FAM-18 hold — WL capabilities REVIEW-UNKNOWN; not in MVP |
| Aggregator/Directory | `INTERNAL` | **true** | configurable | FREE / ENTERPRISE (negotiated) | Aggregator features gated by design; not fully specified yet |
| Internal / Platform | `INTERNAL` | false | false | N/A — admin actor | Control-plane only; no tenant subscription needed |

**Note:** All current pilot tenants at Surat proof cell are B2B suppliers on FREE.

---

## 9. Entitlement Taxonomy

### 9.1 Entitlement Categories

Entitlements are named capabilities granted by plan tier. They do NOT currently exist as
database-modeled objects — this taxonomy defines what the future entitlement matrix should
look like when FAM-11 implementation proceeds beyond vocabulary alignment.

| Category | Examples | MVP Gate | Post-Launch |
|---|---|---|---|
| **Core Access** | Dashboard, profile management, catalog management | All plans | All plans |
| **B2B Commerce** | RFQ participation, Pool access, Supplier invite | Feature-flag gated (NC flags) | Plan-tier + feature flag |
| **AI Assistant** | AI budget-guarded capabilities | AI budget enforced (all plans) | Plan-tier AI budget differential |
| **Marketplace Orders** | B2C cart/checkout, D2C storefront | Not in MVP (auth checkout deferred) | Plan-tier + payment gate |
| **Team/Members** | Team size quota, roles | Not quota-gated at MVP | Plan-tier quota |
| **Analytics/Reporting** | Trade analytics, demand insights | Not gated at MVP | Plan-tier |
| **White-Label Config** | Custom domain, branding | FAM-18 REVIEW-UNKNOWN | ENTERPRISE or WL plan |
| **TTP / Trade Finance** | TTP eligibility, VPC access | HOLD_FOR_COUNSEL_FEEDBACK | ENTERPRISE / TTP-enabled |
| **API Access** | API key generation, webhook config | Not gated at MVP | Plan-tier quota |

### 9.2 B2B Supplier Entitlements

| Entitlement | FREE | STARTER | PROFESSIONAL | ENTERPRISE | MVP Support |
|---|---|---|---|---|---|
| Supplier profile creation | ✓ | ✓ | ✓ | ✓ | YES |
| Product catalog management | ✓ | ✓ | ✓ | ✓ | YES |
| RFQ participation (as supplier) | Feature-gated | Feature-gated | Feature-gated | Feature-gated | Feature flag only |
| Pool membership | Feature-gated | Feature-gated | Feature-gated | Feature-gated | Feature flag only |
| Supplier quote submission | Feature-gated (QD-6 hold) | Feature-gated | Feature-gated | Feature-gated | QD-6 blocked |
| AI assistant access | Budget-capped | Budget-capped | Larger budget | Custom budget | AI budget enforced |
| Inquiry inbox | ✓ | ✓ | ✓ | ✓ | YES |
| TTP enrollment | ✗ | ✗ | Feature-gated | Feature-gated | HOLD_FOR_COUNSEL |
| Advanced analytics | ✗ | ✗ | ✓ | ✓ | Post-MVP |
| API access | ✗ | ✗ | ✓ | ✓ (custom) | Post-MVP |
| White-label branding | ✗ | ✗ | ✗ | ✓ (WL cap) | FAM-18 hold |

### 9.3 B2B Buyer Entitlements

| Entitlement | FREE | STARTER | PROFESSIONAL | ENTERPRISE | MVP Support |
|---|---|---|---|---|---|
| Pool procurement participation | Feature-gated | Feature-gated | Feature-gated | Feature-gated | Feature flag only |
| RFQ issuance (pool owner) | Feature-gated | Feature-gated | Feature-gated | Feature-gated | Feature flag only |
| Award/maker-checker flow | Feature-gated (G-022 hold) | Feature-gated | Feature-gated | Feature-gated | G-022 blocked |
| Demand line management | ✓ | ✓ | ✓ | ✓ | YES (NC Phase 1) |
| Supplier discovery | ✓ | ✓ | ✓ | ✓ | YES |
| AI assistant access | Budget-capped | Budget-capped | Larger budget | Custom budget | AI budget enforced |
| Advanced analytics | ✗ | ✗ | ✓ | ✓ | Post-MVP |

### 9.4 B2C/D2C Seller Entitlements

| Entitlement | FREE | STARTER | PROFESSIONAL | ENTERPRISE | MVP Support |
|---|---|---|---|---|---|
| Public storefront/collections | ✓ | ✓ | ✓ | ✓ | YES |
| Product catalog | ✓ | ✓ | ✓ | ✓ | YES |
| Authenticated checkout (seller side) | ✗ | ✗ | ✓ | ✓ | POST_MVP — merchant-of-record decision pending |
| D2C settlement / payouts | ✗ | ✗ | ✓ | ✓ | POST_MVP — D-012 pending |
| AI assistant | Budget-capped | Budget-capped | Larger budget | Custom budget | AI budget enforced |

### 9.5 White-Label Tenant Entitlements

White-label capability is a tenant-identity flag (`white_label_capability=true`), not a plan-tier
entitlement. FAM-18 is under REVIEW-UNKNOWN hold. No WL-specific entitlements should be modeled
for MVP. This row remains design-parked until FAM-18 reopens.

### 9.6 Aggregator / Directory Tenant Entitlements

Aggregator capability is also a tenant-identity flag (`aggregator_capability=true`), not a plan-tier
entitlement. Aggregator feature scope is not fully specified. Post-MVP. Future design decision.

### 9.7 Manual Provisioning / Pilot Scenarios

| Scenario | MVP Support | Notes |
|---|---|---|
| Admin provisions tenant with FREE plan | YES | Canonical path for all pilot tenants |
| Admin changes plan to PROFESSIONAL via control plane | YES (metadata write) | No billing effect at MVP |
| Admin seeds AI budget for tenant | YES — `ai_budgets` table exists | `loadTenantBudget` fallback defaults to env config |
| Pilot tenant with custom AI budget override | YES — insert into `ai_budgets` | Per-tenant row, hardStop configurable |
| Admin toggles feature flag for tenant | YES — `tenant_feature_overrides` | Per-tenant per-feature override supported |
| Admin provisions WHITE_LABEL tenant | NOT at MVP — FAM-18 hold | Design-parked |

---

## 10. Usage / Quota Taxonomy

### 10.1 Current Quota Infrastructure

Only one quota type is currently metered in runtime:

| Resource | Storage | Unit | Enforcement | Per Plan | Notes |
|---|---|---|---|---|---|
| AI tokens | `ai_usage_meters` | tokens + cost_estimate | Hard-stop or soft-warn per `ai_budgets.hardStop` | Configurable per tenant (default via env) | The only materially enforced commercial control |

### 10.2 Future Quota Types Recommended

For post-MVP plan-tier differentiation, the following quotas are recommended (design only, not
to be implemented in Slice 1):

| Resource | Recommended Quota Type | Rationale |
|---|---|---|
| AI tokens per month | Per-tier tiered limit | Already metered; extend to plan-linked defaults |
| Team members / org users | Per-tier count limit | Prevents unlimited org sprawl on FREE |
| Active catalog products | Per-tier count limit | Distinguishes FREE from paid tiers |
| RFQ submissions per month | Per-tier count or feature gate | B2B commerce access control |
| API requests per day | Per-tier rate limit | Future API plan differentiation |
| Storage (images/documents) | Per-tier storage cap | Future media-heavy feature scaling |

### 10.3 Quota Enforcement Architecture Recommendation

When quotas beyond AI tokens are added:
- Persist quota definitions in a `plan_quotas` table (plan_tier → resource_type → limit)
- Persist usage in resource-specific meters (extend `ai_usage_meters` pattern)
- Load quota at request time via a quota service (extend `aiBudget.ts` pattern)
- Enforce at route/middleware level, not DB-trigger level
- Soft-warn before hard-stop where user experience matters
- Hard-stop only for clearly metered resources (AI tokens, API calls)

---

## 11. AI Budget Taxonomy

### 11.1 Current Implementation

The AI budget system is the reference implementation for all future commercial enforcement.

| Component | Description |
|---|---|
| `ai_budgets` table | Per-tenant budget policy: `monthlyLimit (Int)`, `hardStop (Boolean)` |
| `ai_usage_meters` table | Per-tenant/month usage: `tokens (Int)`, `costEstimate (Decimal)` |
| `loadTenantBudget()` | Reads `ai_budgets` for tenant; falls back to env-configured defaults |
| `getUsage()` | Reads current month usage from `ai_usage_meters` |
| `enforceBudgetOrThrow()` | Throws `BudgetExceededError` if hard-stop and projected tokens exceed limit |
| `upsertUsage()` | Atomically increments tokens + cost after AI call |
| Default tokens | `AI_BUDGET_DEFAULT_TOKENS` env — defaults to 50,000/month |
| Default hard-stop | `AI_BUDGET_DEFAULT_HARD_STOP` env — defaults to true |

### 11.2 AI Budget Scenario Matrix

| Scenario | Behavior |
|---|---|
| No `ai_budgets` row for tenant | Falls back to env-configured defaults (50K tokens, hardStop=true) |
| `hardStop=false`, usage over limit | Soft-warn logged; request allowed |
| `hardStop=true`, projected tokens > limit | `BudgetExceededError` thrown; 429 response |
| `hardStop=true`, exactly at limit | Allowed (enforcement is `>`, not `>=`) |
| Reset cadence | Monthly — new `ai_usage_meters` row per YYYY-MM month key |
| Multi-call concurrency | `upsertUsage` uses Prisma increment (atomic DB operation) |
| Plan-linked AI budget | NOT YET WIRED — budget is per-tenant override only, no plan-default linkage |

### 11.3 AI Budget vs Plan Tier Recommendation

For MVP/pilot: keep AI budget as independent per-tenant configuration (current behavior is correct).

For post-MVP plan differentiation, add plan-default AI budget records at provisioning time:

| Plan | Recommended Default Monthly Tokens | Recommended Hard-Stop |
|---|---|---|
| FREE | 50,000 | true |
| STARTER | 200,000 | true |
| PROFESSIONAL | 1,000,000 | false (soft warn) |
| ENTERPRISE | Custom / negotiated | Configurable |

Implementation path: seed `ai_budgets` row at provisioning time based on `commercial_plan`.
The existing `tenantProvision.service.ts` is the right insertion point.

---

## 12. Feature Flag vs Entitlement Boundary

This is the most important conceptual separation in FAM-11.

### 12.1 Feature Flags (Operational Switches)

**Definition:** Feature flags are named operational switches that control whether a feature area
is active on the platform. They are orthogonal to plan tier.

**Current keys:**

| Key | Purpose | Scope |
|---|---|---|
| `ttp_enabled` | TradeTrust Pay global enable | Global + per-tenant |
| `nc.procurement_pools.enabled` | NC Pool access | Global + per-tenant |
| `nc.procurement_pools.rfq.enabled` | RFQ issuance in pools | Global + per-tenant |
| `nc.procurement_pools.rfq.award.enabled` | RFQ award flow | Global + per-tenant |
| `nc.procurement_pools.supplier_invites.enabled` | Supplier invites to pools | Global + per-tenant |
| `nc.procurement_pools.supplier_quotes.enabled` | Supplier quote submission | Global + per-tenant |

**Use cases for feature flags:**
- Global kill-switches for features not yet ready for all tenants
- Controlled rollout to specific pilot tenants before general availability
- A/B testing or staged feature activation
- Emergency disable of a specific feature area

**NOT appropriate for feature flags:**
- Plan-tier entitlement logic
- Commercial access differentiation between paying tiers
- Quota enforcement

### 12.2 Entitlements (Plan-Tier Commercial Access)

**Definition:** Entitlements are named capabilities that a tenant's plan tier grants as part of
their commercial agreement. They reflect what the tenant has paid for.

**Relationship rule:**

```
feature_flag.enabled = true     → feature is operationally available to eligible tenants
entitlement.granted = true      → tenant's plan includes this capability
access = feature_flag AND entitlement (when both are modeled)
```

At MVP: Feature flags are the ONLY gate that exists. Since all tenants are FREE and the FREE plan
has the same access as all other plans (entitlements not yet differentiated), using feature flags
alone is correct for pilot.

At post-MVP: Feature flags and entitlements operate independently. A PROFESSIONAL tenant with
`rfq_access` entitlement still needs the `nc.procurement_pools.rfq.enabled` feature flag to be
globally active. A FREE tenant whose plan doesn't include `rfq_access` is blocked even if the
flag is globally on.

### 12.3 Override Layer

`TenantFeatureOverride` provides per-tenant override for feature flags (already implemented).
An equivalent per-tenant entitlement override should be designed for enterprise scenarios where
a tenant on PROFESSIONAL needs a specific capability normally only on ENTERPRISE.

---

## 13. Billing / Payment Provider Boundary

### 13.1 MVP Boundary (CONFIRMED — do not cross)

| Item | Status | Gate |
|---|---|---|
| Razorpay integration | NOT authorized | D-011 parked + PRIT-018 POST_MVP |
| Stripe integration | NOT in scope | No gate even defined |
| Any recurring billing engine | NOT authorized | No gate defined |
| Self-serve checkout route | NOT authorized | PRIT-018 POST_MVP |
| Invoice generation for SaaS | NOT authorized | No gate defined |
| Platform-side GST/TDS calculation for SaaS | NOT authorized | India CA review required (D-012) |

### 13.2 What Is Allowed at MVP for Commercial Agreements

| Mechanism | Allowed | Notes |
|---|---|---|
| Operator-assigned FREE plan via control plane | YES | Current provisioning path |
| Offline invoice / manual commercial agreement | YES | Off-platform; no code needed |
| Admin-configured AI budget per tenant | YES | `ai_budgets` table |
| Admin-toggled feature flags per tenant | YES | `tenant_feature_overrides` table |

### 13.3 Payment Provider Prerequisites (All Must Be Satisfied Before Any Gateway Integration)

1. Merchant-of-record decision (D-012) — Paresh explicit decision required
2. Settlement model decision (D-012) — payout cadence + split-settlement rules
3. India CA review — GST/TDS obligations for SaaS subscriptions
4. Legal review of Razorpay operating agreement
5. Refund/cancellation policy definition (D-013/D-014)
6. Audit/logging requirements for payment events
7. PCI boundary design (no card data through TexQtic servers)
8. Razorpay KYC/account setup with GSTIN/PAN

None of these prerequisites are met. No gateway integration may proceed.

---

## 14. Soft-Launch Recommendation

### 14.1 MVP / Soft-Launch Posture — RECOMMENDED OPTION

**Recommended: Option E — Hybrid Pilot Model**

| Option | Description | Recommendation |
|---|---|---|
| A | Admin-assigned plans only, no payment provider | Acceptable but incomplete without entitlement vocabulary |
| B | Admin-assigned plans + entitlement matrix | Better — wires correct vocabulary without payment |
| C | Self-serve checkout before launch | NOT ACCEPTABLE — PRIT-018 explicitly deferred |
| D | Manual invoice / offline commercial agreement | Too bare; no plan identity alignment |
| **E** | **Hybrid pilot model** | **RECOMMENDED** |

**Option E — Hybrid Pilot Model definition:**

1. Admin-assigned plans via control plane (current path — already works)
2. Canonical plan vocabulary aligned across frontend + backend + contracts (Slice 1 implementation)
3. AI budget enforcement remains the only materially enforced commercial control
4. Feature flags remain as operational gates (existing infrastructure)
5. Entitlement taxonomy documented (this artifact) but enforcement implementation is MVP-lite:
   - FREE plan = access to all enabled features for pilot (no differential restrictions)
   - AI budget = differentiator for pilot tenant capacity management
6. Billing/payment — zero implementation; offline agreements only for any early commercial pilots
7. Subscription status — not modeled at soft-launch; org `ACTIVE/SUSPENDED` status is sufficient

**Why Option E:**
- PRIT-018 POST_MVP rules out Option C
- Doing only Option A misses the vocabulary alignment that the design doc identifies as Slice 1 work
- Option E allows pilot tenants to be provisioned correctly, receive plan identity in their session
  context, and have AI budgets enforced — all without requiring any payment infrastructure
- It positions the codebase for clean Option B (entitlement matrix) when post-MVP billing cycles begin

### 14.2 Soft-Launch Minimum Model

At soft-launch, the subscription/commercial system must provide:

| Requirement | Status | Notes |
|---|---|---|
| Canonical plan vocabulary in session | PARTIAL — exists in auth/session, needs frontend alignment | Slice 1 |
| Plan identity visible in tenant workspace | PARTIAL — present in API responses, needs UI cleanup | Slice 2 |
| AI budget enforcement active | COMPLETE | No work needed |
| Feature flags operational | COMPLETE | 6 keys active |
| Admin plan assignment via control plane | COMPLETE | Provisioning + plan update routes exist |
| No payment gateway required | CONFIRMED | PRIT-018 scope |
| org_id isolation preserved throughout | CONSTITUTIONAL | Cannot be weakened |

---

## 15. Post-Launch Recommendation

When post-MVP subscription work begins, the recommended sequence is:

**Phase 1 — Entitlement Matrix Implementation (no billing)**
- Model `plan_quotas` and `plan_entitlements` tables
- Seed entitlement rules per plan tier
- Wire entitlement checks to appropriate route/middleware points
- Implement plan-linked AI budget default seeding at provisioning

**Phase 2 — Self-Serve Plan Management (no payment)**
- Tenant-facing plan display in workspace
- Admin-side plan change with entitlement re-evaluation
- Entitlement enforcement on access to paid features

**Phase 3 — Billing Integration (Razorpay)**
- Requires all prerequisites from §13.3
- Subscription creation → Razorpay recurring plan
- Webhook handling for payment events
- `billing_accounts` and `invoices` schema additions
- `subscription_status` field on `organizations` or new `subscriptions` table

**Phase 4 — Commercial Operations**
- Invoice generation and download
- MRR/ARR reporting in control plane
- Grace period automation
- Upgrade/downgrade prorating

---

## 16. Architecture Model Recommendation

### 16.1 Recommended Architecture Model

**Recommended: Plan tier + AI usage meter (current) → extend to Plan tier + entitlements + usage meters + billing provider (post-MVP)**

For MVP: `plan_tier + usage_meter`
For post-MVP Phases 1-2: `plan_tier + entitlements + usage_meters`
For post-MVP Phase 3+: `plan_tier + entitlements + usage_meters + billing_provider`

Feature flags remain separate from this model at all phases.

### 16.2 Model Component Separation

```
plan_tier           → commercial identity (already exists)
subscription_status → billing lifecycle state (post-MVP)
commercial_status   → operational state (use org.status at MVP)
entitlement         → named capability from plan (post-MVP Phase 1)
quota               → numerical limit from plan (post-MVP, extend AI budget pattern)
usage_meter         → consumption tracking (exists for AI; extend per resource)
feature_flag        → operational switch, plan-independent (exists, 6 keys)
override            → admin per-tenant deviation (exists for feature flags)
billing_account     → payment relationship record (post-MVP Phase 3)
invoice/payment     → billing event state (post-MVP Phase 3)
```

---

## 17. Slice 1 Implementation Recommendation

### 17.1 What Slice 1 Should Implement (Vocabulary Alignment)

Based on `SUBSCRIPTION-ENTITLEMENT-IMPLEMENTATION-DESIGN-v1.md` Module A + B + C guidance:

1. **types.ts cleanup**
   - Ensure `CommercialPlan` only exposes `FREE | STARTER | PROFESSIONAL | ENTERPRISE`
   - Ensure `normalizeCommercialPlan` maps only to canonical values
   - Remove or isolate any implicit treatment of `TRIAL` / `PAID` as canonical plan identity
   - Ensure `TenantConfig.plan` and `TenantConfig.commercial_plan` are both typed as `CommercialPlan | null`

2. **App.tsx plan rehydration cleanup**
   - Ensure rehydration path always normalizes through `normalizeCommercialPlan`
   - Ensure no display path treats `TRIAL` or `PAID` as plan identity strings
   - Ensure fallback to `FREE` is explicit and documented

3. **Control-plane label correction**
   - Remove or bound `Active (Paid)` labels that collapse operational status + billing truth
   - Preserve plan column and AI budget column in TenantRegistry and TenantDetails
   - Plan display should show canonical value, not a derivative billing label

4. **Provisioning default documentation**
   - Ensure `commercial_plan: 'FREE'` is the correct and documented default for APPROVED_ONBOARDING
   - Ensure legacy `BASIC` → `FREE` normalization is tested in provisioningTypes tests

5. **OpenAPI contract tightening (if allowlisted)**
   - Add `enum: [FREE, STARTER, PROFESSIONAL, ENTERPRISE]` to `plan` fields in
     `openapi.tenant.json` and `openapi.control-plane.json` where they currently accept any string

### 17.2 Explicit Non-Goals for Slice 1

Slice 1 must NOT implement any of the following:

| Non-Goal | Reason |
|---|---|
| Payment gateway integration (Stripe, Razorpay) | POST_MVP (PRIT-018) |
| Subscription checkout route | POST_MVP |
| Invoice generation | POST_MVP |
| Self-serve plan upgrade/downgrade UI | POST_MVP |
| Entitlement matrix database modeling | Post-MVP Phase 1 |
| Quota enforcement for non-AI resources | Post-MVP Phase 1 |
| `subscription_status` field | Post-MVP Phase 1 |
| `billing_accounts` table | Post-MVP Phase 3 |
| `plan_entitlements` table | Post-MVP Phase 1 |
| Plan-gated route access control (backend) | Post-MVP Phase 1 |
| Plan-gated UI feature access (frontend) | Post-MVP Phase 1 |
| Per-plan AI budget default seeding | Post-MVP Phase 1 (nice-to-have, not Slice 1) |
| Changing organizations.plan to enum constraint | Schema migration — separate bounded unit |
| Any modification to existing feature gate middlewares | Out of scope |
| Any change to `ai_budgets` or `ai_usage_meters` logic | Working correctly — do not touch |

---

## 18. Risk Classification

| Risk | Severity | Status |
|---|---|---|
| `organizations.plan` type gap (String vs TenantPlan enum) | MEDIUM | Known; normalization at read boundary mitigates; schema fix is post-MVP |
| Display vocabulary drift (`TRIAL`/`PAID` in UI labels) | LOW | Identified; Slice 1 corrects |
| No plan-tier enforcement means all tenants are functionally equal | ACCEPTED for MVP | Deliberate; pilot posture |
| AI budget defaults only from env (no per-plan seeding) | LOW | Default protects against runaway usage |
| Entitlement gaps create commercial positioning risk | MEDIUM | Post-MVP Phase 1 must address |
| No billing gateway = no self-serve revenue path | ACCEPTED for MVP | Deliberate; PRIT-018 |
| Feature flags can be changed by admin without plan-tier control | ACCEPTED for MVP | Deliberate; pilot control needed |
| WL and Aggregator entitlements undefined | LOW-MEDIUM | FAM-18 hold; not blocking pilot |

---

## 19. Recommended Next FAM-11 Unit

**Recommended next unit title:**
`FAM-11B-SUBSCRIPTION-CANONICAL-VOCABULARY-ALIGNMENT-SLICE-1-001`

**Scope:** Implement the vocabulary alignment changes identified as Slice 1 in §17.1 above.
This is a bounded implementation unit, not a design unit.

**Proposed allowed write files for FAM-11B:**

```
types.ts
App.tsx
components/ControlPlane/TenantRegistry.tsx
components/ControlPlane/TenantDetails.tsx
shared/contracts/openapi.tenant.json          (if contract tightening is allowlisted)
shared/contracts/openapi.control-plane.json   (if contract tightening is allowlisted)
artifacts/launch-readiness/FAM-11B-SUBSCRIPTION-CANONICAL-VOCABULARY-ALIGNMENT-SLICE-1-001.md
```

**Proposed validation commands for FAM-11B:**

```
pnpm --filter client typecheck
pnpm --filter client lint
pnpm --filter server typecheck
pnpm --filter server test --reporter=verbose --run (scoped to auth + tenantProvision suites)
git diff --name-only
git status --short
```

**Prerequisite read for FAM-11B:**
`governance/launch-readiness/COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md §3`
`docs/product-truth/SUBSCRIPTION-ENTITLEMENT-IMPLEMENTATION-DESIGN-v1.md`
`This artifact (FAM-11A)`

---

## 20. Scope Safety Confirmations

- **No source files were changed.** This is a design-only artifact.
- **No schema or migration files were changed.** Schema is read-only in this unit.
- **No billing or payment actions were executed.** No gateway integration, no checkout session.
- **No secrets were printed.** No DB URLs, API keys, JWTs, tokens, Supabase keys, or env values.
- **FAM-07 legal hold remains preserved.** `governance/legal/fam-07/` absent; authority file absent; `legal_approved_transition_allowed=false`.
- **FAM-08 remains CLOSE_READY_WITH_RESIDUALS.** This unit did not touch FAM-08 scope.
- **FAM-09 remains CLOSE_READY_WITH_LAUNCH_TEST_RESIDUALS.** This unit did not touch FAM-09 scope.
- **No governance trackers were modified.** LAUNCH-FAMILY-INDEX.md was read only.
- **Dirty tree at start:** CLEAN (git status --short produced no output, HEAD=acd01611).

---

## 21. Validation

```
git diff --name-only    → (empty — no source changes)
git status --short      → (shows only the new artifact under artifacts/ which is .gitignored)
```

The artifact is under `artifacts/` which is git-ignored. Use `git add -f` to stage it.

---

## Final Enum

`FAM_11A_SUBSCRIPTION_SCENARIO_MATRIX_COMPLETE`
