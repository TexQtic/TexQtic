# TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001

**Type:** Governance / Methodology Design Unit
**Status:** COMPLETE
**Date:** 2026-05-19
**Author:** Copilot / Design unit
**Authorized by:** Paresh Patel

---

## §1 Unit Summary

This unit establishes the authoritative commerce, subscription, and payments methodology for TexQtic
before the first B2C or D2C authenticated family cycle opens. It defines the boundary between what
TexQtic's platform owns vs. what is out-of-scope at MVP, records the confirmed B2B no-money-movement
guardrail, parks all unresolved payment/commerce decisions, and creates a methodology document that
future family cycles must read before touching any commerce surface.

---

## §2 Objective

1. Define TexQtic's B2B, B2C, and D2C commerce surface boundaries for MVP and post-MVP.
2. Establish subscription tier methodology (pilot FREE/manual; self-serve POST_MVP).
3. Document Razorpay/payment gateway methodology and the 7 prerequisites required before integration.
4. Confirm the B2B no-platform-financial-transaction guardrail as a constitutional boundary.
5. Park all unresolved B2C/D2C merchant-of-record, settlement, commission, and gateway decisions.
6. Produce PRIT-028 through PRIT-031 for the PLANNED-REQUIREMENTS-INTAKE register.
7. Update DECISION-PARKING-LOT (D-011–D-015), FUTURE-TODO-REGISTER (FTU-COMM-001–005),
   BLIND-SPOT-DEPENDENCY-RISK-REGISTER (R-008–R-012), and README.md (TLRH formal name).

---

## §3 Scope

**In scope (governance/design only):**
- Commerce surface boundary definition (B2B, B2C, D2C)
- Subscription tier methodology and pilot posture
- Payment gateway methodology and prerequisite gate
- B2B financial transaction boundary confirmation
- Commission/deduction policy documentation (parked state)
- PRIT register updates (PRIT-028–031)
- Decision parking lot updates (D-011–D-015)
- Future design unit registration (FTU-COMM-001–005)
- Risk register updates (R-008–R-012)
- README.md hub naming update (TLRH)

**Absolutely forbidden:**
- No code changes of any kind
- No schema changes
- No migration files
- No route or API contract changes
- No event contract changes
- No OpenAPI contract changes
- No Razorpay/payment gateway SDK, API, or webhook added
- No subscription billing implementation
- No commission calculation implementation
- No checkout or cart-to-payment implementation
- No family cycle opening
- No Family Opening Audit Gate
- No legal/tax/accounting determination
- No B2B financial transaction implementation
- No `.env` modifications
- No staging of pre-existing unstaged M files

---

## §4 Authoritative Documents Read

The following documents were read before this unit was authored:

| # | Document | Path | Key Information Extracted |
|---|---|---|---|
| 1 | LAUNCH-FAMILY-INDEX.md | governance/launch-readiness/ | FAM numbering, cycle sequencing, commercial families FAM-11/FAM-15/FAM-16 |
| 2 | NEXT-ACTION.md | governance/control/ | B2B no-money-movement policy confirmed; Layer 0 posture HOLD_FOR_AUTHORIZATION |
| 3 | COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md | governance/launch-readiness/ | Methodology document (created this unit) |
| 4 | Slice 4A closeout artifact | governance/units/ | Plan tiers FREE/STARTER/PROFESSIONAL/ENTERPRISE confirmed; pilot FREE/operator-provisioned |
| 5 | B2C checkout boundary decision | governance/units/ or docs/ | Downstream-authenticated checkout boundary confirmed |
| 6 | B2C tracker | governance/launch-readiness/ | FAM-06/07/08 auth families proceed without payment decisions |
| 7 | PLANNED-REQUIREMENTS-INTAKE.md | governance/launch-readiness/ | PRIT-027 last; PRIT-018 POST_MVP confirmed; PRIT-022–027 tracked |
| 8 | DECISION-PARKING-LOT.md | governance/launch-readiness/ | D-010 last entry before this unit |
| 9 | FUTURE-TODO-REGISTER.md | governance/launch-readiness/ | §12 PRIT confirmation notes last section before this unit |
| 10 | BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md | governance/launch-readiness/ | R-007 last risk before this unit |
| 11 | README.md | governance/launch-readiness/ | Hub index; no formal TLRH name; no pointer to commerce methodology |

**Search results confirming no payment/Razorpay integration exists:**
- Search for "razorpay" across workspace → 0 results
- Search for "payment" in server/src → 0 results in implementation files
- Search for "checkout" in server/src → 0 integration results
- Confirmed: TexQtic has no payment gateway integration anywhere.

---

## §5 Findings from Document Reads

| Finding | Source | Impact |
|---|---|---|
| No Razorpay or payment gateway integration exists anywhere | File search (0 results) | Starting from zero; no debt; §4.3 prerequisites apply |
| Plan tier infrastructure exists (FREE/STARTER/PROFESSIONAL/ENTERPRISE) | Subscription Slice 4A | Tiers exist; entitlement enforcement per-tier is NOT implemented |
| B2B no-money-movement confirmed in NEXT-ACTION.md | NEXT-ACTION.md | Constitutional boundary; no further decision required for B2B MVP |
| B2C checkout confirmed as downstream-authenticated | B2C checkout boundary decision | Checkout gated behind auth; D-012 (merchant-of-record) must resolve before checkout implementation |
| PRIT-018 confirmed POST_MVP | TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001 | Pilot free/manual; self-serve commercial packaging not required at MVP |
| FAM-11/15/16 are the commercial families | LAUNCH-FAMILY-INDEX.md | Commerce work routes to these three families |
| FAM-06/07/08/09/10 auth families unblocked by payment decisions | LAUNCH-FAMILY-INDEX.md | Auth families can proceed without D-012 resolving |
| No commission policy exists anywhere | File search + governance review | Commission completely unresolved; must park as D-013/D-014 |

---

## §6 Methodology Established

The commerce, subscription, and payments methodology is fully documented in:

**`governance/launch-readiness/COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md`**

This document is the authoritative methodology authority. All future family cycles touching
commerce, subscriptions, or payments MUST read this document before their opening gate.

Key methodology outcomes:

| Topic | Outcome |
|---|---|
| B2B financial boundary | CONFIRMED_GUARDRAIL — no platform B2B transactions in MVP |
| Subscription at pilot | FREE tier, operator-provisioned; no self-serve billing |
| Self-serve subscription | POST_MVP; D-011 must resolve; PRIT-028 |
| B2C checkout | Downstream-authenticated; D-012 blocks implementation |
| D2C commerce (post-auth) | D-012 blocks implementation |
| Razorpay/gateway | No integration; 7 prerequisites must be satisfied; D-015 |
| B2C commission | No policy; D-013 parked |
| D2C commission | No policy; D-014 parked |
| Family cycles unblocked | FAM-06/07/08/09/10/11 (auth/pilot surface) can proceed |
| Family cycles blocked | B2C checkout, D2C commerce, FAM-15, FAM-16 TTP path |

---

## §7 PRIT Register Updates (PRIT-028–031)

Added to `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md`:

| PRIT ID | Name | Status | Source |
|---|---|---|---|
| PRIT-028 | Subscription tier entitlement model (self-serve, post-MVP) | PARESH_CONFIRMED_AS_PLANNED | Methodology §3 |
| PRIT-029 | Razorpay/payment gateway methodology for B2C/D2C commerce | DESIGN_GATED | Methodology §4 |
| PRIT-030 | B2B no-platform-financial-transaction boundary (guardrail) | CONFIRMED_BOUNDARY | Methodology §5 |
| PRIT-031 | Commission/deduction methodology across B2B/B2C/D2C | DESIGN_GATED | Methodology §8 |

§7 (next PRIT ID) updated to PRIT-032.
§11 checklist rows 20–24 added.
§12 update history row added.
§15 new section added.

---

## §8 Decision Parking Lot Updates (D-011–D-015)

Added to `governance/launch-readiness/DECISION-PARKING-LOT.md`:

| Decision ID | Topic | Status |
|---|---|---|
| D-011 | Subscription tier pricing, entitlement model, self-serve billing | PARKED — NEEDS_PARESH_DECISION |
| D-012 | B2C/D2C merchant-of-record and settlement model | PARKED — NEEDS_PARESH_DECISION + NEEDS_COUNSEL_CA_REVIEW |
| D-013 | B2C commission/deduction policy | PARKED — NEEDS_PARESH_DECISION + NEEDS_COUNSEL_CA_REVIEW |
| D-014 | D2C commission/deduction policy | PARKED — NEEDS_PARESH_DECISION + NEEDS_COUNSEL_CA_REVIEW |
| D-015 | Razorpay/payment gateway platform adoption decision | PARKED — NEEDS_PARESH_DECISION + NEEDS_COUNSEL_CA_REVIEW |

Update history row added for 2026-05-19.

---

## §9 Future TODO Register Updates (FTU-COMM-001–005)

Added to `governance/launch-readiness/FUTURE-TODO-REGISTER.md` as §13:

| Unit ID | Unit Name | Status |
|---|---|---|
| FTU-COMM-001 | SUBSCRIPTION-TIER-ENTITLEMENT-DESIGN-001 | PARKED — POST_MVP |
| FTU-COMM-002 | RAZORPAY-PAYMENT-GATEWAY-DESIGN-001 | PARKED — DESIGN_GATED |
| FTU-COMM-003 | B2C-D2C-CHECKOUT-PAYMENT-DESIGN-001 | PARKED — DESIGN_GATED |
| FTU-COMM-004 | COMMISSION-DEDUCTION-POLICY-DESIGN-001 | PARKED — DESIGN_GATED |
| FTU-COMM-005 | B2B-FINANCIAL-BOUNDARY-GUARDRAIL-001 | PARKED — HOLD_FOR_COUNSEL_FEEDBACK |

Update history row added for 2026-05-19.

---

## §10 Blind-Spot Risk Register Updates (R-008–R-012)

Added to `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md`:

| Risk ID | Type | Title | Priority |
|---|---|---|---|
| R-008 | COMMERCE | Payment implementation without merchant/settlement model decided | P1 |
| R-009 | COMMERCE | B2B family cycles drift into financial transaction handling | P1 |
| R-010 | COMMERCE | Commission policy unclear before checkout/order implementation | P2 |
| R-011 | COMMERCE | Razorpay integration before refund/cancellation/accounting policy | P1 |
| R-012 | COMMERCE | Subscription gating implemented before tier model decided | P2 |

Update history row added for 2026-05-19.

---

## §11 README.md Updates

Updated `governance/launch-readiness/README.md`:

1. §1 Purpose — added formal hub name: **TexQtic Launch Readiness Hub (TLRH)**
2. §2 Read Order — added item 13: `COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md` with mandatory reading note
3. §3 Documents table — added row for `COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md`

---

## §12 Pre-Implementation Discipline

This unit is governance-only. No implementation was performed. Confirming:

- ✅ No code changes made
- ✅ No schema changes made
- ✅ No migration files created
- ✅ No route or API contract changes made
- ✅ No event contract changes made
- ✅ No OpenAPI contract changes made
- ✅ No payment gateway integration started
- ✅ No subscription billing implementation started
- ✅ No commission logic implemented
- ✅ No family cycle opened

---

## §13 Forbidden Actions — Confirmed Not Taken

| Forbidden Action | Confirmed Not Taken |
|---|---|
| `prisma migrate dev` | ✅ Not run |
| `prisma db push` | ✅ Not run |
| Stage pre-existing unstaged M files | ✅ Not staged |
| Modify `.env` | ✅ Not modified |
| Implement Razorpay/payment gateway | ✅ Not started |
| Implement B2B financial transaction path | ✅ Not started |
| Open any family cycle | ✅ Not opened |

Pre-existing unstaged M files that must NEVER be staged:
- `components/Public/PublicSupplierProfile.tsx`
- `tests/frontend/public-referral-landing.test.tsx`

---

## §14 Static Gates for Future Units

Any future family cycle or design unit that touches commerce, payment, or subscription MUST:

1. Read `COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md` before opening gate
2. Confirm B2B financial boundary compliance (PRIT-030) in opening section
3. Confirm D-012 status before any checkout, cart-to-payment, or settlement implementation
4. Confirm D-015 status and all §4.3 prerequisites before any gateway integration
5. Not implement any commission/deduction logic until D-013/D-014 resolve

---

## §15 Validation

No runtime validation required for a governance-only unit.

Pre-commit validation (to be run before commit):
```
git diff --name-only
git status --short
```

Expected allowlisted files only:
- `governance/launch-readiness/COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md` (CREATED)
- `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` (MODIFIED)
- `governance/launch-readiness/DECISION-PARKING-LOT.md` (MODIFIED)
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md` (MODIFIED)
- `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` (MODIFIED)
- `governance/launch-readiness/README.md` (MODIFIED)
- `governance/units/TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001.md` (CREATED)

---

## §16 Hub Sync

All TexQtic Launch Readiness Hub (TLRH) documents updated:

| Document | Change |
|---|---|
| `COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md` | CREATED — methodology authority |
| `PLANNED-REQUIREMENTS-INTAKE.md` | PRIT-028–031 added; §7, §11, §12, §15 updated |
| `DECISION-PARKING-LOT.md` | D-011–D-015 added; update history row added |
| `FUTURE-TODO-REGISTER.md` | §13 FTU-COMM-001–005 added; update history row added |
| `BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | R-008–R-012 added; update history row added |
| `README.md` | TLRH formal name added; §2 read order item 13 added; §3 table row added |

---

## §17 Risks and Follow-up

| Risk / Follow-up | Note |
|---|---|
| D-012 is a hard gate for B2C/D2C checkout | Paresh should resolve merchant-of-record decision before FAM-15 or B2C commerce cycle begins |
| Razorpay KYC timeline is unknown | India Razorpay merchant account setup can take 2–4 weeks; should start early once D-015 approved |
| Counsel/CA review is blocking D-012–D-015 | External counsel availability is unknown; Paresh should initiate engagement when commerce cycle selection begins |
| PRIT-030 guardrail must be enforced at every B2B family opening | Consider adding PRIT-030 compliance as a standard item in every B2B family cycle opening template |
| Next unit: `TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001` | Select the first authenticated family cycle to open; recommendations informed by this methodology |

---

## §18 Files Modified

| File | Action | Change Summary |
|---|---|---|
| `governance/launch-readiness/COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md` | CREATED | 15-section methodology authority document |
| `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` | MODIFIED | PRIT-028–031 rows in §5A and §5B; §7 next PRIT ID updated to PRIT-032; §11 rows 20–24; §12 update history row; §15 new section |
| `governance/launch-readiness/DECISION-PARKING-LOT.md` | MODIFIED | D-011 through D-015 entries added; update history row |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | MODIFIED | §13 FTU-COMM-001–005 added; update history row |
| `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | MODIFIED | R-008 through R-012 added; update history row |
| `governance/launch-readiness/README.md` | MODIFIED | TLRH formal name in §1; §2 item 13; §3 table row |
| `governance/units/TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001.md` | CREATED | This unit artifact |

---

## §19 Risks / Follow-up (Governance)

No governance or contract risks introduced. All changes are additive documentation only.
This unit introduces 5 new freeze guardrails (§14) that apply to all future commerce-adjacent
family cycles.

---

## §20 Commit Hash

`ecfb01e072614ea44b63826bb177035ae679b465`

---

## §21 Next Unit

**`TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001`**

Select the first authenticated B2C or D2C family cycle to open. Recommendations:
- FAM-06 (Supplier Auth / Session Mgmt) is unblocked and is likely the safest first cycle
- FAM-07 (Buyer Auth) follows naturally from FAM-06
- FAM-11 (Subscription/Commercial Gating) requires only FREE-tier gating at pilot (D-011 deferred)
- FAM-15 (Invoices/Settlement) and B2C/D2C checkout are blocked by D-012

---

## §22 Version History

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-05-19 | Initial unit artifact created |
