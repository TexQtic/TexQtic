# FAM-13A — Razorpay Readiness Design and Decision
**Artifact ID:** FAM-13A-RAZORPAY-READINESS-DESIGN-AND-DECISION-001  
**Date:** 2026-06-03  
**Unit type:** Design/decision — no payment code implemented  
**Mode:** TECS Safe Design / Decision  
**Final enum:** `FAM_13A_RAZORPAY_READINESS_DESIGN_COMPLETE`

---

## 1. Unit Summary

This is a design-and-decision unit for Razorpay/payment readiness. **No payment code was implemented.**

This unit investigated current repo truth to establish the minimum safe readiness plan for TexQtic payment infrastructure, without implementing any payment code. All five candidate Razorpay use cases (PG-01 through PG-05) remain blocked by unresolved business, legal, and technical decisions recorded in this artifact.

**No product code was changed. No source, package, migration, schema, env, or config files were modified.**

---

## 2. Preflight Results

| Check | Result |
|---|---|
| Working tree before changes | ✅ Clean — `git status --short` showed no output |
| HEAD at unit open | `3834980b` |
| FAM-11E commit (`3834980b`) ancestor of HEAD | ✅ `ancestor_exit: 0` |
| `governance/legal/fam-07/` | ✅ ABSENT — `Test-Path` returned `False` |
| FAM-07 hold | ✅ Unchanged — `HOLD_FOR_HUMAN_LEGAL_INPUTS` |
| Backend/server/prisma/migration files dirty | ✅ None |
| Payment/Razorpay implementation already staged | ✅ None |

---

## 3. Repo-Truth Investigation

### 3.1 Files / Areas Inspected

| File / Area | Purpose |
|---|---|
| `governance/launch-readiness/COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md` | Authoritative payment methodology; §4.3 prerequisites; §4.2 candidate use cases |
| `governance/launch-readiness/DECISION-PARKING-LOT.md` | D-011 through D-015 decision status |
| `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` | PRIT-029 Razorpay methodology record |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | FTU-COMM-002 Razorpay gateway design record |
| `governance/launch-readiness/SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md` | Commerce gates at soft launch |
| `governance/control/NEXT-ACTION.md` | Current active/next unit pointers |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | FAM-11 close-ready status confirmed |
| `artifacts/launch-readiness/FAM-11E-*` | FAM-11 close-readiness evidence |
| `server/prisma/schema.prisma` | TenantPlan enum, organizations.plan field, invoices model, gst_verifications model |
| `server/src/config/index.ts` | Env key registry — no Razorpay keys present |
| `server/src/routes/tenant.ts` | POST /api/tenant/checkout route |
| `server/src/middleware/ncPoolFeatureGate.middleware.ts` | Network pool feature gate (not plan-tier gate) |
| `package.json` (root + server) | Dependency search for Razorpay/Stripe SDKs |

### 3.2 Search Terms Used

```
razorpay, Razorpay, stripe, Stripe
payment, billing, invoice, checkout, subscription
commercial_plan, subscription_status, plan_tier
order_id, payment_id, webhook
gst, tax
RAZORPAY_KEY, RAZORPAY_KEY_ID, rzp_
plan.*enforcement, entitlement.*gate
```

### 3.3 Key Findings Summary

| Area | Finding |
|---|---|
| Razorpay SDK in dependencies | **ABSENT** — no `razorpay` in root or server `package.json` |
| Stripe SDK in dependencies | **ABSENT** |
| Any payment gateway SDK | **ABSENT** |
| Razorpay env keys in config | **ABSENT** — `server/src/config/index.ts` has no `RAZORPAY_*` entries |
| Razorpay references in source | **ABSENT** — governance docs only; zero source file matches |
| Existing payment/checkout backend route | **EXISTS** — `POST /api/tenant/checkout` in `tenant.ts` but this is B2C order creation only (creates order with `PAYMENT_PENDING` status); NO payment gateway call, NO payment capture, NO webhook, NO payment SDK call |
| Existing `invoices` Prisma model | **EXISTS** — but these are B2B trade invoices (linked to `trades`, `org_id`, `buyer_org_id`); NOT platform subscription billing invoices |
| `TenantPlan` enum | **EXISTS** — `FREE / STARTER / PROFESSIONAL / ENTERPRISE` in schema.prisma (line 2476); `plan` field on `Tenant` model (line 17) defaulting to `FREE` |
| `commercial_plan` on organizations | **EXISTS** — in CAE/CRM auth context (`tenantProvision.types.ts`) |
| Runtime plan entitlement enforcement | **ABSENT** — `ncPoolFeatureGate` gates network/pool access, not plan tier; no plan-gated middleware operates by tier |
| `gst_verifications` model | **EXISTS** — tenant GSTIN verification for B2B identity; NOT platform billing GST |
| Payment webhook route | **ABSENT** — `ACQUISITION_PROVISIONING_WEBHOOK_SECRET` is an internal CRM HMAC secret (not a payment gateway webhook) |
| Any "subscription billing" model | **ABSENT** |

---

## 4. Current Commercial Surface Boundary

This section confirms the FAM-11 display-only boundary is intact.

| Surface | Status |
|---|---|
| `GET /pricing` | ✅ Informational only — plan comparison page; no checkout, no payment intent |
| FREE card CTA | ✅ `onRequestAccess` → `https://texqtic.com/request-access` (external) |
| STARTER/PRO/ENT card CTAs | ✅ `mailto:hello@texqtic.com` only; no payment links |
| Bottom CTA | ✅ `onRequestAccess` — identical to FREE card |
| `PlanAndUsagePanel` upgrade CTA | ✅ `href={UPGRADE_CTA_MAILTO}` — mailto only; no checkout intent |
| Plan enforcement at runtime | ✅ None — `entitlementDisplay.ts` is display config; no route/middleware guards by plan tier |
| Payment gateway call | ✅ Absent everywhere |
| Subscription billing flow | ✅ Absent everywhere |
| `POST /api/tenant/checkout` | ✅ B2C marketplace order creation only (cart → PAYMENT_PENDING order record); no Razorpay/Stripe/payment SDK called |

**The FAM-11 display-only boundary is fully intact. No checkout or payment path exists anywhere in the platform.**

---

## 5. Payment Readiness Gap Analysis

### 5.1 What Exists Already

| Infrastructure | Exists | Notes |
|---|---|---|
| `TenantPlan` enum (`FREE / STARTER / PROFESSIONAL / ENTERPRISE`) | ✅ | In Prisma schema; used on `Tenant.plan` field |
| `organizations.commercial_plan` field | ✅ | Used in CAE auth context for display purposes |
| `invoices` model | ✅ | B2B trade invoices only (linked to trades); not subscription billing |
| `gst_verifications` model | ✅ | Tenant GSTIN identity verification; not billing GST |
| `POST /api/tenant/checkout` | ✅ | B2C order creation into PAYMENT_PENDING state; no payment processing |
| `normalizeCommercialPlan()` | ✅ | Frontend utility normalizing plan strings to canonical `TenantPlan` values |
| Control-plane provisioning modal | ✅ | Allows operator to assign plan tier during tenant provisioning |

### 5.2 What is Missing Before Payment Implementation

| Missing Element | Reason | Required Before |
|---|---|---|
| Razorpay SDK dependency | Not installed | FAM-13D |
| Razorpay API key env vars | Not configured | FAM-13D |
| Razorpay merchant account KYC | Not started | FAM-13D |
| Subscription billing schema (Prisma) | No `subscription_records`, `billing_events`, `plan_changes` models | FAM-13C |
| Plan upgrade/downgrade flow | Not designed | FAM-13B |
| Payment order creation route | No `/api/tenant/billing/create-order` | FAM-13D |
| Payment verification route | No `/api/tenant/billing/verify-payment` | FAM-13D |
| Razorpay webhook handler | No webhook route or signature verification | FAM-13E |
| Webhook idempotency store | No idempotency key table | FAM-13E |
| Plan lifecycle state machine | Not designed | FAM-13B/13C |
| Self-serve plan upgrade UI | Not designed | Future FAM-13F |
| Billing portal / invoice UI | Not designed | Post-FAM-13F |
| D-011 resolution | Paid tier pricing not decided | FAM-13B |
| D-012 resolution | Merchant-of-record not decided | FAM-13B |
| D-015 resolution | Razorpay adoption formally decided | FAM-13B |
| Counsel/CA review (India SaaS GST, TCS §194-O) | Not performed | FAM-13B |
| Refund/cancellation policy | Not defined | FAM-13D |
| PCI boundary documentation | Not performed | FAM-13D |

---

## 6. Decision Register

| ID | Decision | Owner | Current Status | Required Before | Blocker Severity |
|---|---|---|---|---|---|
| D-011 | Subscription tier pricing, feature entitlement scope, billing cycle, grace/deactivation policy | Paresh (pricing) + CA (India SaaS GST) | PARKED | FAM-13B | 🔴 CRITICAL — blocks all paid subscription design |
| D-012 | B2C/D2C merchant-of-record and settlement model | Paresh + Counsel/CA | PARKED | FAM-13B | 🔴 CRITICAL — upstream gate for D-013, D-014, D-015 |
| D-013 | B2C commission/deduction policy | Paresh + Counsel/CA | PARKED (pending D-012) | Post-FAM-13B | 🟡 HIGH — not blocking subscription billing; blocking B2C commerce |
| D-014 | D2C commission/deduction policy | Paresh + Counsel/CA | PARKED (pending D-012) | Post-FAM-13B | 🟡 HIGH — not blocking subscription billing; blocking D2C commerce |
| D-015 | Razorpay/payment gateway platform adoption decision | Paresh + Counsel/CA | PARKED | FAM-13B | 🔴 CRITICAL — no implementation may begin without this |
| D-016 | Subscription use case priority (B2C checkout vs. SaaS subscription billing vs. D2C first?) | Paresh | NOT YET OPENED | FAM-13B | 🔴 CRITICAL — determines which PG-0x use case is first |
| D-017 | Paid subscription activation model: manual approval by Paresh, automatic on payment, or hybrid? | Paresh | NOT YET OPENED | FAM-13C | 🟡 HIGH — determines subscription lifecycle state machine |
| D-018 | Refund and cancellation policy for SaaS subscriptions | Paresh | NOT YET OPENED | FAM-13D | 🟡 HIGH — required before live payments |
| D-019 | Trial / early-access conversion rule for current FREE pilot tenants | Paresh | NOT YET OPENED | FAM-13C | 🟡 HIGH — affects plan migration for existing tenants |

### Decision Ownership Classification

| Category | Decisions |
|---|---|
| Founder (Paresh) decision | D-011, D-015, D-016, D-017, D-018, D-019 |
| CA/GST decision (requires CA/accountant) | D-011 (India SaaS GST, TDS treatment), D-012 (merchant-of-record, TCS §194-O) |
| Legal decision | D-012 (Razorpay operating agreement review), D-015 |
| Implementation dependency | D-016 → sequence of FAM-13B through FAM-13F |
| Technical design | FAM-13B architecture lock before FAM-13C/D/E |

---

## 7. Risk Register

| Risk | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|
| India SaaS GST treatment not reviewed before live billing | Legal liability — incorrect GST charged/remitted | Engage CA before D-011 resolution; no live billing until CA sign-off | Paresh / CA | 🔴 OPEN |
| TCS §194-O marketplace operator obligation (if D-012 = platform merchant) | Compliance liability for marketplace tax collection | Require counsel review of merchant-of-record decision before any B2C/D2C checkout | Paresh / Counsel | 🔴 OPEN |
| Razorpay webhook not idempotent → duplicate plan upgrades or duplicate charges | Financial inconsistency; incorrect plan state | Idempotency store (deduplicated by Razorpay `payment_id`) must be designed before FAM-13E | Technical | ⚪ FUTURE |
| `TenantPlan` enum order mismatch between Prisma schema and frontend | Plan comparison logic broken | Enum is `FREE < STARTER < PROFESSIONAL < ENTERPRISE` — canonical; frontend `normalizeCommercialPlan()` confirmed compatible | Technical | ✅ MITIGATED |
| Existing FREE pilot tenants lose access when paid gating is introduced | Tenant disruption | D-019 (conversion policy) must be decided before any enforcement is introduced | Paresh | 🟡 FUTURE |
| PCI scope boundary violation (card data through TexQtic server) | PCI DSS compliance risk | Razorpay-hosted checkout form only; TexQtic servers must never receive raw card data | Technical | ⚪ FUTURE |
| Payment metadata (`razorpay_payment_id`, `razorpay_order_id`) accidentally logged | PII/financial data exposure | Webhook handler must sanitize before logging; audit log design must exclude payment credentials | Technical | ⚪ FUTURE |
| Subscription billing schema changes break existing RLS policies | Tenant data leak | New billing tables must have RLS policies designed before migration; require explicit approval | Technical | ⚪ FUTURE |
| D-015 implementation before D-012 resolves | Incorrect gateway configuration for merchant-of-record role | D-015 is hard-gated on D-012; implementation sequence must respect this | Process | 🟡 CONTROLLED |

---

## 8. Recommended Razorpay Architecture Direction

**Architecture direction: Razorpay Standard Integration with server-side order creation and client-side Razorpay Checkout (hosted form).**

This direction is recommended based on:
1. India-first market (Razorpay is the strongest India-market gateway)
2. TexQtic's existing Fastify/Node backend (Razorpay Node SDK available)
3. PCI boundary requirement: Razorpay-hosted checkout form keeps card data off TexQtic servers
4. Existing `Tenant.plan` field provides the anchor for plan upgrade on payment confirmation
5. Existing `invoices` B2B infrastructure is separate — subscription billing schema can be additive

### Preliminary Architecture Sketch (design-only, subject to D-011/D-012/D-015)

```
[Tenant dashboard] → [Upgrade CTA] → POST /api/tenant/billing/create-order
                                           ↓
                                    Razorpay Order API (server-side)
                                           ↓ order_id returned
[Client loads Razorpay Checkout JS with order_id]
                                           ↓ payment.success
                                    POST /api/tenant/billing/verify-payment
                                           ↓ HMAC signature verification
                                    Prisma: update Tenant.plan + write subscription_records
                                           ↓
                                    Razorpay webhook (backup/audit path)
                                    POST /api/internal/webhook/razorpay
                                           ↓ signature verify + idempotency check
                                    Audit log + event emission
```

**Limitations of this sketch:**
- D-011 must decide subscription billing cycle (one-time vs. Razorpay Subscriptions API)
- D-012 must decide merchant-of-record (affects settlement configuration)
- D-016 must decide use case priority (SaaS subscription billing first vs. B2C checkout first)
- This is a design-only recommendation, not authorization to implement

### What CANNOT be decided at FAM-13A

- Exact Razorpay product to use (Razorpay Standard vs. Razorpay Subscriptions API vs. Payment Links) — requires D-011/D-016
- Webhook endpoint path — requires threat model and replay-protection design
- Schema for `subscription_records` — requires D-011 + billing cycle decision
- Feature flag strategy — requires D-016/D-017

---

## 9. Recommended Future Unit Sequence

| Unit | Title | Purpose | Expected Write Surface | Validation Requirement | Status |
|---|---|---|---|---|---|
| FAM-13B | Razorpay Payment Architecture Design Lock | Resolve D-011/D-012/D-015/D-016; select Razorpay product; define payment flow and schema anchors | `artifacts/` + possibly `DECISION-PARKING-LOT.md` D-status updates | Documentation only; no tsc required | DECISION-GATED (Paresh + CA/Counsel must resolve D-011, D-012, D-015 first) |
| FAM-13C | Subscription Schema and API Design | Design `subscription_records`, `billing_events`, `plan_changes` Prisma models; design API contract for billing routes | SQL + `schema.prisma` + OpenAPI contract update | Schema review + `prisma db pull` + `prisma generate` | DESIGN-GATED (FAM-13B must complete first) |
| FAM-13D | Razorpay Test-Mode Integration | Implement order creation, payment verification, plan update on confirmation — test mode only; no live keys | `server/src/routes/`, `server/prisma/`, Razorpay env (test) | Integration tests + test-mode payment flow verified | IMPLEMENTATION-READY only after FAM-13B + FAM-13C |
| FAM-13E | Webhook, Idempotency, and Audit Verification | Implement Razorpay webhook handler, idempotency store, HMAC signature verification, audit log path | `server/src/routes/`, `server/prisma/` | Webhook unit tests; idempotency confirmed; no duplicate plan changes | IMPLEMENTATION-READY only after FAM-13D |
| FAM-13F | Production Readiness and Payment Rollout Gate | Live Razorpay keys, feature flag, rollout, monitoring, refund policy check, billing portal | Env keys (production), config, feature flag | Production smoke test; manual payment verified; refund path tested | IMPLEMENTATION-READY only after FAM-13E + D-018 resolved |

### Sequence Gate Summary

```
D-011 + D-012 + D-015 + D-016 resolved by Paresh + CA/Counsel
    → FAM-13B (architecture lock)
        → FAM-13C (schema + API design)
            → FAM-13D (test-mode implementation)
                → FAM-13E (webhook + idempotency)
                    → FAM-13F (production rollout)
```

No implementation unit (FAM-13C onward) may open until FAM-13B is complete.  
FAM-13B may not complete until D-011, D-012, D-015, and D-016 are resolved.

---

## 10. Explicit Non-Implementation Confirmation

| Check | Confirmed |
|---|---|
| No Razorpay code added | ✅ None |
| No Stripe code added | ✅ None |
| No checkout code added | ✅ None |
| No backend payment route added | ✅ None |
| No Prisma/schema/migration changed | ✅ None |
| No env file changed | ✅ None |
| No exact paid INR/₹ pricing added | ✅ None |
| No TTP added to any surface | ✅ None |
| No package dependencies added | ✅ None |
| No source file modified | ✅ Only artifact file created |

---

## 11. Residuals

The following residuals are explicitly preserved from FAM-11 and are now the forward backlog for payment readiness:

| Residual | Status | Next Action |
|---|---|---|
| Paid plan amounts (₹/GST) | Pending D-011 | Paresh + CA decision before FAM-13B |
| GST/TCS/TDS treatment (India SaaS) | Pending CA/counsel review | Required before FAM-13B |
| Merchant-of-record decision | Pending D-012 | Required before FAM-13B |
| Razorpay adoption decision | Pending D-015 | Required before FAM-13B |
| Subscription use case priority | Pending D-016 (new — not yet opened) | Required before FAM-13B |
| Paid subscription activation model | Pending D-017 (new — not yet opened) | Required before FAM-13C |
| Refund/cancellation policy | Pending D-018 (new — not yet opened) | Required before FAM-13D |
| FREE pilot tenant conversion policy | Pending D-019 (new — not yet opened) | Required before FAM-13C |
| FAM-07 / TTP hold | `HOLD_FOR_HUMAN_LEGAL_INPUTS` unchanged | Do not touch |
| FTR-LEGAL-003 | `MVP_CRITICAL/OPEN` unchanged | Do not touch |
| FAM-11 display-only posture | Intentional; intact | Must remain until paid enforcement is explicitly authorized in FAM-13C+ |
| `POST /api/tenant/checkout` (B2C order route) | B2C marketplace order creation only; no payment processing | Separate from subscription billing; do not conflate |

---

## 12. Validation

| Check | Result |
|---|---|
| `pnpm tsc --noEmit` | N/A — documentation-only unit; no source files changed |
| `git diff --name-only` | ✅ Only `artifacts/launch-readiness/FAM-13A-*` staged |
| No product code staged | ✅ Confirmed |
| No backend/server/prisma files staged | ✅ Confirmed |
| No package/env/config files staged | ✅ Confirmed |

---

## 13. Final Decision

**FAM-13A is complete as a design/decision unit.**

- Repo truth inspected: ✅
- Current payment/Razorpay truth documented: ✅ (ABSENT from all source surfaces)
- Blockers and decisions clearly classified: ✅ (D-011 through D-019; §4.3 prerequisites)
- Future unit sequence defined: ✅ (FAM-13B through FAM-13F with explicit gate conditions)
- No implementation performed: ✅
- No source/package/env/schema files changed: ✅

**Razorpay cannot be implemented until FAM-13B completes, which requires D-011 + D-012 + D-015 + D-016 to resolve first.**

---

## 14. Final Enum

`FAM_13A_RAZORPAY_READINESS_DESIGN_COMPLETE`

---

## 15. Commit Information

- **Artifact commit:** *(to be filled after commit)*
- **HEAD at unit open:** `3834980b`
- **Files committed:** `artifacts/launch-readiness/FAM-13A-RAZORPAY-READINESS-DESIGN-AND-DECISION-001.md`
