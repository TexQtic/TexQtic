# FAM-13B — Razorpay Payment Architecture Decision Lock
**Artifact ID:** FAM-13B-RAZORPAY-PAYMENT-ARCHITECTURE-DECISION-LOCK-001  
**Date:** 2026-06-03  
**Unit type:** Decision lock — no payment code implemented  
**Mode:** TECS Safe Design / Decision Lock  
**Final enum:** `FAM_13B_PAYMENT_ARCHITECTURE_BLOCKED_MISSING_HUMAN_DECISIONS`

---

## 1. Unit Summary

This is a decision-lock unit for Razorpay/payment architecture. **No payment code was implemented.**

This unit attempted to convert FAM-13A readiness findings into a bounded architecture and decision-lock artifact. All required precondition decisions (D-011, D-012, D-015, and first-payment-use-case priority) were inspected against the current repo governance truth.

**Result: FAM-13B is BLOCKED.**

Four required human decision inputs have not been supplied by Paresh, CA, or Counsel. No architecture can be locked, no implementation unit can be opened, and no Razorpay/payment code may be written until these decisions are explicitly resolved.

**No product code was changed. No source, package, migration, schema, env, or config files were modified.**

---

## 2. Preflight Results

| Check | Result |
|---|---|
| Working tree before changes | ✅ Clean — `git status --short` produced no output |
| HEAD at unit open | `b2b8ab39` |
| FAM-13A artifact commit `8946bda8` is ancestor of HEAD | ✅ `8946_exit: 0` |
| FAM-13A seal commit `b2b8ab39` is ancestor of HEAD | ✅ `b2b8_exit: 0` |
| `governance/legal/fam-07/` | ✅ ABSENT — `Test-Path` returned `False` |
| FAM-07 hold | ✅ Unchanged — `HOLD_FOR_HUMAN_LEGAL_INPUTS` |
| No payment implementation dirty | ✅ Confirmed — no source file changes pending |
| No schema/migration dirty | ✅ Confirmed |

---

## 3. Repo-Truth Confirmation

### 3.1 Files Inspected This Unit

| File | Inspection Purpose |
|---|---|
| `artifacts/launch-readiness/FAM-13A-RAZORPAY-READINESS-DESIGN-AND-DECISION-001.md` | FAM-13A findings baseline |
| `governance/control/NEXT-ACTION.md` | Active unit pointer, FAM-13B as next_candidate |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | FAM-11 CLOSE_READY; FAM-13 (NC award maker-checker) vs payment track distinction |
| `governance/launch-readiness/DECISION-PARKING-LOT.md` | D-011, D-012, D-015, D-016, D-017 statuses |
| `governance/launch-readiness/COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md` | §4.1–4.4 Razorpay methodology |

### 3.2 FAM-13A Truth Re-Verification

All FAM-13A findings remain unchanged. No payment implementation has been added since FAM-13A.

| Area | FAM-13A Finding | Re-verified Status |
|---|---|---|
| Razorpay SDK in dependencies | ABSENT | ✅ Still ABSENT |
| Stripe SDK in dependencies | ABSENT | ✅ Still ABSENT |
| Razorpay env keys in config | ABSENT | ✅ Still ABSENT |
| Razorpay source code | ABSENT | ✅ Still ABSENT |
| Payment webhook route | ABSENT | ✅ Still ABSENT |
| Runtime plan-tier enforcement | ABSENT | ✅ Still ABSENT |
| Subscription billing model | ABSENT | ✅ Still ABSENT |
| `TenantPlan` enum | EXISTS | ✅ Unchanged |
| `Tenant.plan` field | EXISTS (`@default(FREE)`) | ✅ Unchanged |
| `POST /api/tenant/checkout` | B2C order creation only; no payment SDK | ✅ Unchanged |
| `invoices` Prisma model | B2B trade invoices; not subscription billing | ✅ Unchanged |
| `gst_verifications` model | Org GSTIN identity; not billing GST | ✅ Unchanged |
| FAM-07 hold | `HOLD_FOR_HUMAN_LEGAL_INPUTS` | ✅ Unchanged |
| FTR-LEGAL-003 | `MVP_CRITICAL/OPEN` | ✅ Unchanged |

### 3.3 Naming Discrepancy Note — FAM-13A's Proposed D-016 through D-019

FAM-13A proposed adding four new decisions labeled D-016 through D-019 (payment use case priority, activation model, refund policy, FREE conversion policy). However, inspection of `DECISION-PARKING-LOT.md` confirms:

| FAM-13A Label | Existing Parking Lot Entry | Conflict? |
|---|---|---|
| D-016 (payment use case priority) | **D-016 = "Soft-Launch B2B Financial Boundary Confirmation" — CONFIRMED_BOUNDARY** | ⚠️ NUMBER CONFLICT |
| D-017 (paid subscription activation model) | **D-017 = "Soft-Launch Provisioning Model" — CONFIRMED** | ⚠️ NUMBER CONFLICT |
| D-018 (refund/cancellation policy) | D-018 = "PRIT-033 Stage 2 Family Assignment" — PARKED | ⚠️ NUMBER CONFLICT |
| D-019 (FREE pilot tenant conversion policy) | D-019: not found — may be available | N/A |

**The new payment decisions proposed by FAM-13A must be re-numbered before being formally added to the parking lot.** For this artifact, the "first payment use case priority" decision referenced in the FAM-13B prompt as "D-016" will be tracked as **D-PG-PRIORITY** (unnumbered pending parking lot registration). Its decision status remains **NOT_YET_OPENED** in the parking lot regardless of number.

---

## 4. Human Decision Input Review

The following table records whether each required decision has been explicitly supplied by Paresh, CA, or Counsel. Inputs were searched in: this unit's prompt, FAM-13A artifact, current parking lot, COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md, and NEXT-ACTION.md.

### D-011 — Subscription Tier Pricing, Entitlement Model, Self-Serve Billing

| Required Answer Item | Supplied Answer | Source | Status |
|---|---|---|---|
| 1. Exact paid tier names to activate first | ❌ Not supplied | — | UNRESOLVED |
| 2. INR amount per paid tier, or explicit "contact-only" decision | ❌ Not supplied | — | UNRESOLVED |
| 3. Billing cycle: monthly / annual / both / manual invoice | ❌ Not supplied | — | UNRESOLVED |
| 4. GST treatment / tax display expectation | ❌ Not supplied | — | UNRESOLVED |
| 5. Grace period after failed payment | ❌ Not supplied | — | UNRESOLVED |
| 6. Deactivation / downgrade policy after non-payment | ❌ Not supplied | — | UNRESOLVED |
| 7. Feature entitlement scope by tier | ❌ Not supplied | — | UNRESOLVED |

**D-011 overall status: PARKED (unchanged) — all 7 items unresolved**  
**Parking lot status:** `PARKED` — `PRIT-028` | owner: Paresh + CA/accountant  
**Blocker impact:** 🔴 CRITICAL — blocks SaaS subscription billing design, schema, and implementation

---

### D-012 — Merchant-of-Record and Settlement Model

| Required Answer Item | Supplied Answer | Source | Status |
|---|---|---|---|
| 1. Is TexQtic merchant-of-record for SaaS subscriptions? | ❌ Not supplied | — | UNRESOLVED |
| 2. Is TexQtic merchant-of-record for B2C/D2C marketplace payments? | ❌ Not supplied | — | UNRESOLVED |
| 3. Supplier settlement model: TexQtic payout / Razorpay Route / direct / manual? | ❌ Not supplied | — | UNRESOLVED |
| 4. CA/Counsel note on GST/TCS §194-O/TDS implications | ❌ Not supplied | — | UNRESOLVED |
| 5. SaaS subscription billing vs. marketplace checkout: same or separate? | ❌ Not supplied | — | UNRESOLVED |

**D-012 overall status: PARKED (unchanged) — all 5 items unresolved**  
**Parking lot status:** `PARKED — NEEDS_PARESH_DECISION + NEEDS_COUNSEL_CA_REVIEW`  
**Blocker impact:** 🔴 CRITICAL — upstream hard gate for D-013, D-014, D-015; no B2C/D2C checkout can begin without this

---

### D-015 — Razorpay/Payment Gateway Platform Adoption Decision

| Required Answer Item | Supplied Answer | Source | Status |
|---|---|---|---|
| 1. Formal decision: Razorpay yes / no / defer | ❌ Not supplied | — | UNRESOLVED |
| 2. Razorpay product preference (Standard / Subscriptions / Payment Links / Route / undecided) | ❌ Not supplied | — | UNRESOLVED |
| 3. Test-mode first or live-mode gate? | ❌ Not supplied | — | UNRESOLVED |
| 4. Who owns Razorpay account/KYC? | ❌ Not supplied | — | UNRESOLVED |
| 5. SaaS subscription only, or also marketplace checkout? | ❌ Not supplied | — | UNRESOLVED |

**D-015 overall status: PARKED (unchanged) — all 5 items unresolved**  
**Parking lot status:** `PARKED — NEEDS_PARESH_DECISION + NEEDS_COUNSEL_CA_REVIEW`  
**Blocker impact:** 🔴 CRITICAL — no Razorpay SDK may be installed, no Razorpay account/KYC begun, no test-mode integration without this decision

---

### D-PG-PRIORITY — First Payment Use Case Priority
*(Referenced as "D-016" in the FAM-13B prompt; NOT YET OPENED in parking lot due to numbering conflict — see §3.3)*

| Required Answer Item | Supplied Answer | Source | Status |
|---|---|---|---|
| Choose exactly one first priority: SaaS subscription billing / B2C checkout / D2C checkout / manual payment links / defer | ❌ Not supplied | — | UNRESOLVED |
| Why this is first and what remains deferred | ❌ Not supplied | — | UNRESOLVED |

**D-PG-PRIORITY overall status: NOT_YET_OPENED — unresolved**  
**Blocker impact:** 🔴 CRITICAL — determines whether FAM-13C is subscription schema design, B2C checkout design, or another unit; architecture lock cannot proceed without this

---

### Human Decision Summary

| Decision | Parking Lot Status | Answers Supplied? | FAM-13B Impact |
|---|---|---|---|
| D-011 (subscription pricing) | PARKED | ❌ None | Blocks subscription billing schema + implementation |
| D-012 (merchant-of-record) | PARKED | ❌ None | Blocks all B2C/D2C checkout + gateway config |
| D-015 (Razorpay adoption) | PARKED | ❌ None | Blocks all Razorpay integration |
| D-PG-PRIORITY (payment use case first) | NOT_YET_OPENED | ❌ None | Blocks FAM-13C scope definition |

**No decisions are resolved. FAM-13B is BLOCKED.**

---

## 5. Decision-Lock Outcome

**FAM-13B is BLOCKED — missing human decisions.**

None of the four required decision inputs have been supplied. Architecture cannot be locked. No implementation unit may be opened. The following exact inputs are needed before FAM-13B may re-open:

### Required from Paresh (Founder Decision)

1. **D-011 item 1**: Which paid tier to activate first (STARTER only, or STARTER + PROFESSIONAL together)?
2. **D-011 item 2**: INR pricing for activated paid tier(s), or explicit confirmation that pricing remains "contact us / quote only" (no public INR amounts)
3. **D-011 item 3**: Billing cycle preference: monthly-only to start, annual-only, or both from day one?
4. **D-011 item 6**: Deactivation policy: downgrade-to-FREE on payment failure (preserving data) or suspend access?
5. **D-011 item 7**: Which features are locked behind paid tiers? (Network Commerce invite/award, AI budget, NC pool access, etc.) — specific feature list needed
6. **D-012 item 1**: Is TexQtic the SaaS subscription merchant-of-record (platform charges tenants directly for plan access)?
7. **D-012 item 5**: Is SaaS subscription billing completely separate from marketplace checkout? Or do they share the same Razorpay account and implementation track?
8. **D-015 item 1**: Formal go/no-go on Razorpay adoption
9. **D-015 item 3**: Start with test-mode integration first, or only integrate when live keys are ready?
10. **D-015 item 4**: Who is completing Razorpay KYC? (Paresh personally as TexQtic operator, or company entity?)
11. **D-PG-PRIORITY**: Choose first payment use case: SaaS subscription billing, B2C marketplace checkout, D2C marketplace checkout, or manual payment links / defer automation

### Required from CA / Accountant (India Tax and Compliance)

12. **D-011 item 4**: GST treatment for SaaS subscription: Is TexQtic software/SaaS covered under 18% GST (SAC 998314)? Should invoice show CGST+SGST or IGST based on buyer state?
13. **D-011 item 5**: Grace period for failed subscription payment — standard India practice recommendation?
14. **D-012 item 4**: TCS §194-O applicability: Does TexQtic as a marketplace operator need to deduct TCS from supplier payouts? Is this mandatory for the chosen merchant-of-record model?
15. **D-012 item 3**: Settlement model: Must supplier payouts occur within a specific time window under FEMA/GST/TDS rules?

### Required from Legal Counsel (Contract and Regulatory)

16. **D-012 item 2**: B2C/D2C merchant-of-record: Can TexQtic act as marketplace facilitator without becoming a payment aggregator under RBI PPI guidelines?
17. **D-015 item 2**: Razorpay operating agreement review — does TexQtic's intended use case require a marketplace account (Razorpay Route) or a standard payment gateway account?

---

## 6. Architecture Boundary

**DECISION_BLOCKED — architecture lock cannot proceed.**

Because D-011, D-012, D-015, and D-PG-PRIORITY are unresolved, no architecture boundary can be locked. The high-level guarded options from FAM-13A (§8 architecture sketch) remain the only non-binding reference.

The architecture boundary will be populated in a future FAM-13B re-open (or FAM-13B-D1 decision capture unit) once human inputs are supplied.

---

## 7. Decision Register Updates

**No changes made to `DECISION-PARKING-LOT.md`.**

Rationale: The prompt states updates are permitted only if decisions are explicitly supplied. No decisions were supplied. Statuses remain:
- D-011: PARKED  
- D-012: PARKED — NEEDS_PARESH_DECISION + NEEDS_COUNSEL_CA_REVIEW  
- D-015: PARKED — NEEDS_PARESH_DECISION + NEEDS_COUNSEL_CA_REVIEW  
- D-016 (existing, soft-launch B2B boundary): CONFIRMED_BOUNDARY (unrelated to payment use case priority)
- D-PG-PRIORITY (payment use case priority): NOT_YET_OPENED in parking lot

**Parking lot numbering repair needed (future unit):** FAM-13A incorrectly proposed D-016 through D-019 for payment-related decisions when those numbers are already occupied in the parking lot. The new payment decisions (use case priority, activation model, refund policy, FREE tenant conversion policy) need numbers D-019 (check first), D-020+, or explicit re-numbering. This repair should occur in the FAM-13B re-open or FAM-13B-D1 unit when Paresh supplies decision inputs.

---

## 8. Risk / Compliance Notes

All risks from FAM-13A §7 are preserved and unchanged.

| Risk | Current Status |
|---|---|
| India SaaS GST treatment not reviewed | 🔴 OPEN — CA review required before D-011 can close |
| TCS §194-O marketplace operator obligation | 🔴 OPEN — Counsel/CA required before D-012 can close |
| Razorpay merchant account KYC not started | 🔴 OPEN — requires D-015 formal decision first |
| Subscription billing schema introduces RLS drift | ⚪ FUTURE — mitigated by requiring explicit approval before any Prisma schema change |
| `TenantPlan` enum numbering drift | ✅ MITIGATED — enum stable; no change since Subscription Slice 4A |
| Existing FREE pilot tenants affected by paid gating | 🟡 FUTURE — D-PG-PRIORITY + D-011 item 6 must be resolved before any enforcement lands |
| PCI scope boundary | ⚪ FUTURE — Razorpay-hosted checkout form required; TexQtic servers must never receive card data |
| Payment event logging / audit trail | ⚪ FUTURE — must be designed in FAM-13D before live payments |
| FAM-07 / TTP hold | ✅ PRESERVED — `HOLD_FOR_HUMAN_LEGAL_INPUTS`; `FTR-LEGAL-003 MVP_CRITICAL/OPEN`; no TTP added |
| B2B no-money-movement constitutional boundary | ✅ INTACT — D-016 in parking lot CONFIRMED; no platform-held B2B funds |

---

## 9. Recommended Next Unit

**`FAM-13B-D1 — Razorpay Business/Tax Decision Capture`**

Because all blockers are human/business/legal decisions (not technical unknowns), the recommended next step is not a code unit — it is a synchronous decision-capture session with Paresh (and potentially a CA call):

| Mode | Description | When |
|---|---|---|
| **Paresh working session** | Go through D-011 items 1–3, 6–7; D-012 item 1 + 5; D-015 items 1, 3–4; D-PG-PRIORITY | Before FAM-13B re-open |
| **CA/accountant consultation** | D-011 items 4–5; D-012 items 3–4 (GST, TCS §194-O) | Can run in parallel with Paresh session |
| **Legal counsel review** | D-012 item 2; D-015 item 2 (RBI PPI, Razorpay agreement type) | Can run in parallel |

Once Paresh provides explicit written answers (attached to the FAM-13B re-open prompt or in an addendum artifact), FAM-13B may re-open and resolve to `FAM_13B_PAYMENT_ARCHITECTURE_DECISION_LOCK_COMPLETE`.

**Alternative: continue on non-payment tracks.** The following units do not require D-011/D-012/D-015 resolution and may proceed independently:
- FAM-13 (NC award maker-checker, pending G-022 gate) — entirely separate family
- Any soft-launch readiness units from the SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY
- Any FAM-06 supplier auth units

---

## 10. Explicit Non-Implementation Confirmation

| Check | Confirmed |
|---|---|
| No Razorpay code added | ✅ None |
| No Stripe code added | ✅ None |
| No checkout route added | ✅ None |
| No payment verification route added | ✅ None |
| No webhook route added | ✅ None |
| No Prisma/schema/migration changed | ✅ None |
| No package dependencies added | ✅ None |
| No env/config files changed | ✅ None |
| No exact paid INR pricing added to public UI | ✅ None |
| No pricing page CTAs changed | ✅ None |
| No TTP added to any surface | ✅ None |
| `governance/legal/fam-07/` unchanged | ✅ Not created; ABSENT |
| No legal authority created | ✅ None |
| No source file modified | ✅ Only artifact + tracker files created/modified |

---

## 11. Current FAM-11 Display-Only Status Confirmation

FAM-11 remains display-only. **No payment implementation was introduced.**

| Surface | Status |
|---|---|
| `/pricing` page | ✅ Informational only — unchanged from FAM-11D |
| Paid-tier CTAs | ✅ `mailto:hello@texqtic.com` — unchanged |
| `Get started free` CTA | ✅ `https://texqtic.com/request-access` — unchanged |
| `PlanAndUsagePanel` upgrade CTA | ✅ mailto only — unchanged |
| Backend entitlement enforcement | ✅ Absent — unchanged |
| Payment gateway | ✅ Absent — unchanged |
| Self-serve billing flow | ✅ Absent — unchanged |

---

## 12. Validation

| Check | Result |
|---|---|
| `pnpm tsc --noEmit` | N/A — documentation-only unit; no source files changed |
| `git diff --name-only` | ✅ Only `artifacts/launch-readiness/FAM-13B-*` + `governance/control/NEXT-ACTION.md` staged |
| No product code staged | ✅ Confirmed |
| No backend/server/prisma files staged | ✅ Confirmed |
| No package/env/config files staged | ✅ Confirmed |

---

## 13. Final Decision

**FAM-13B is BLOCKED — missing human decisions.**

- D-011 (subscription pricing): **UNRESOLVED** — 7 items, all unanswered
- D-012 (merchant-of-record): **UNRESOLVED** — 5 items, all unanswered
- D-015 (Razorpay adoption): **UNRESOLVED** — 5 items, all unanswered
- D-PG-PRIORITY (payment use case first): **NOT_YET_OPENED** — unresolved
- Architecture boundary: **DECISION_BLOCKED**
- No payment implementation performed: ✅
- FAM-11 display-only posture: ✅ Intact

**Razorpay implementation cannot proceed until Paresh, CA, and Counsel supply the 17 explicit decision inputs listed in §5.**

---

## 14. Final Enum

`FAM_13B_PAYMENT_ARCHITECTURE_BLOCKED_MISSING_HUMAN_DECISIONS`

---

## 15. Commit Information

- **Artifact commit:** `ad1b5e2b`
- **HEAD at unit open:** `b2b8ab39`
- **Files committed:** `artifacts/launch-readiness/FAM-13B-RAZORPAY-PAYMENT-ARCHITECTURE-DECISION-LOCK-001.md`, `governance/control/NEXT-ACTION.md`
