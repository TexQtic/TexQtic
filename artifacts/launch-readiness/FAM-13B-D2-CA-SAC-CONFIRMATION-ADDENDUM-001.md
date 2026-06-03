# FAM-13B-D2-CA-SAC-CONFIRMATION-ADDENDUM-001
## CA SAC Confirmation Addendum and Payment Tax Register Sync

**Unit ID:** FAM-13B-D2-CA-SAC-CONFIRMATION-ADDENDUM-001
**Family:** FAM-13B — Razorpay Payment Architecture Decision Lock
**Mode:** TECS Safe Governance / Tax Decision Addendum / Payment Prerequisite Sync
**Date opened:** 2026-06-03
**Authorizing scope:** Record CA-confirmed SAC codes, reconcile PR-03/PR-08 status, create governance artifact. No payment implementation.
**Predecessor unit:** FAM-13B-D1-PAYMENT-DECISION-LOCK-RECONCILIATION-001 (COMPLETE, sealed `c7dbf5d7`, hash-propagated `fe87916f`)

---

## 1. Unit Summary

### 1.1 Objectives

1. Record CA-confirmed SAC (Service Accounting Code) and GST classification for all TexQtic service types
2. Formally eliminate previously-considered incorrect SAC codes and record their replacements
3. Record CA follow-up answers: MVP marketplace payment model characterization; ECO/TCS applicability analysis
4. Assess and update PR-03 and PR-08 prerequisite gate status
5. Document the Razorpay invoice/SAC field verification risk (blocking for compliant invoice implementation)
6. Assess impact on decision register (D-011 through D-022)
7. Confirm implementation authorization status (unchanged: NOT AUTHORIZED)
8. Update governance files to reflect CA confirmation
9. Recommend next governance unit (FAM-13B-D3)

### 1.2 Explicit Non-Scope

- Does NOT authorize any Razorpay integration or payment implementation
- Does NOT change PR-04, PR-05, PR-06, or PR-07 status (all remain NOT_STARTED)
- Does NOT implement any SAC/GST code in source files
- Does NOT modify schema, migrations, environment variables, or packages
- Does NOT change FAM-07 hold status (HOLD_FOR_HUMAN_LEGAL_INPUTS unchanged)
- Does NOT open FAM-13B-D3 (requires Paresh direction)
- Does NOT constitute legal or tax advice — records a professional CA advisory as a governance input only

---

## 2. Preflight Results

**Run date:** 2026-06-03

| Check | Expected | Observed | Result |
|---|---|---|---|
| `git status --short` | Clean (no modified files) | (empty — clean) | ✅ CLEAN |
| `git rev-parse --short HEAD` | `fe87916f` | `fe87916f` | ✅ MATCH |
| FAM-13B-D1 main commit `9a7a1fbd` | ancestor of HEAD | exit:0 (`True`) | ✅ ANCESTOR |
| FAM-13B-D1 seal commit `c7dbf5d7` | ancestor of HEAD | exit:0 (`True`) | ✅ ANCESTOR |
| FAM-13B-D1 hash-propagation `fe87916f` | = HEAD | = HEAD | ✅ HEAD |
| `governance/legal/fam-07/` directory | ABSENT | `Test-Path` → `False` | ✅ ABSENT — FAM-07 hold preserved |
| Razorpay / SAC codes in source files | ABSENT | 0 matches in all source files | ✅ ABSENT |

**Preflight verdict:** ALL CHECKS PASS. Safe to proceed with FAM-13B-D2 execution.

---

## 3. CA Confirmation Source

**Source type:** Chartered Accountant (CA) advisory — India GST / SAC classification
**Advisory scope:** SAC code assignment for all TexQtic billable service types; GST rate confirmation; marketplace payment deferral analysis; ECO/TCS applicability assessment at MVP
**Input method:** Founder-relayed CA advisory incorporated into this governance unit via FAM-13B-D2 prompt
**Authority level:** CA professional classification — binding for governance purposes pending full invoice implementation verification
**Legal counsel sign-off on Razorpay operating agreement:** Still open (D-015 prerequisite — separate from CA SAC advisory)
**Reconfirmation requirement:** CA/counsel reconfirmation REQUIRED before any future marketplace payment collection, supplier settlement, split-settlement, Razorpay Route integration, or any TCS-activating track opens

**Document retention:** The original CA advisory document is NOT stored in this repository. The founder should retain the original CA engagement document and written advisory in a secure external location. This artifact records the governance impact only.

---

## 4. Locked SAC Register — CA Confirmed

The following SAC codes are the locked TexQtic classification for all billing surfaces as of
this unit. These replace prior provisional or conflicting codes and MUST be used on all
TexQtic invoices from the point of implementation.

| Invoice Surface | SAC Code | GST Rate | Invoice Label (prescribed) |
|---|---|---|---|
| SaaS platform subscription — all tiers (STARTER / PROFESSIONAL / ENTERPRISE) | **998315** | **18%** | `"SaaS platform subscription — [TIER] plan — [period]"` |
| AI budget overage / AI add-on | **998315** | **18%** | `"AI compute add-on — [period]"` |
| B2B marketplace facilitation fee (platform commission / access fee) | **998599** | **18%** | `"B2B trade facilitation platform fee — [period]"` |
| Enterprise professional services / supply chain advisory | **998311** | **18%** | `"Supply chain advisory services — [engagement]"` |

**GST display rule (CA confirmed):** GST must be shown exclusive of the base price.
Display format: `[Base price] + 18% GST`. Inclusive display is not confirmed for any surface.

**SAC 998315 classification basis:** Software as a Service (SaaS) and cloud-based platform
subscription services. Applies to both the core SaaS subscription and AI budget/add-on
services supplied via the same platform.

**SAC 998599 classification basis:** Other support services — trade facilitation intermediary
services for B2B marketplace platform fees (commission, access fee, facilitation fee at MVP).
Applies only to the platform facilitation/access fee charged to vendors/buyers for marketplace
access — NOT to the goods transaction value (which TexQtic does not intermediate at MVP).

**SAC 998311 classification basis:** Management consulting services / supply chain advisory.
Applies to enterprise professional services engagements only.

**IMPLEMENTATION GATE:** These codes are locked for governance purposes only. They may NOT be
used in implementation (invoices, Razorpay configuration, backend fields, frontend display)
until all §4.3 prerequisites are satisfied and implementation is explicitly authorized by
Paresh via a dedicated design unit.

---

## 5. Eliminated Codes

The following SAC codes were previously considered or speculatively referenced for TexQtic
services. They are now formally eliminated and MUST NOT be used.

| Code | Previously Considered For | CA Decision | Replaced By |
|---|---|---|---|
| `998314` | TexQtic base SaaS subscription | Eliminated — not applicable to TexQtic SaaS subscription model | `998315` |
| `998319` | AI compute add-on / AI budget overage | Eliminated — not the correct classification for TexQtic AI add-on | `998315` |
| `998596` | B2B marketplace facilitation fee | Eliminated — not the correct category for TexQtic marketplace facilitation scope | `998599` |

**Repo verification (2026-06-03):** No reference to `998314`, `998319`, or `998596` found in
any TexQtic source file, configuration file, or test file. Elimination is confirmed clean with
no code cleanup required.

---

## 6. CA Follow-Up Answers

### 6.1 MVP Marketplace Payment Model — CA Confirmed

**Question:** What is the correct characterization of TexQtic's marketplace payment model at
MVP? Is TexQtic collecting payment for goods? Does TexQtic act as a payment aggregator?

**CA-Confirmed Answer (recorded 2026-06-03):**

- TexQtic will charge a **flat vendor commission / platform access / facilitation fee ONLY**
  at MVP. This is a platform-access or facilitation fee — NOT a payment for goods.
- TexQtic will **NOT collect payment for goods** at MVP. Marketplace payment collection
  (i.e., collecting buyer payment for supplier goods) is formally deferred and not part of
  MVP scope.
- TexQtic does **NOT act as a payment aggregator** for goods at MVP.
- SAC `998599` (B2B trade facilitation platform fee) is the correct code for the facilitation
  fee TexQtic charges. The goods transaction value is not intermediated by TexQtic at MVP.

**Governance impact:** D-012 item 4 advances from CONFLICTING_EVIDENCE to CA_CONFIRMED_PARTIAL
for the SaaS and marketplace segments (within the scope confirmed above). D-012 marketplace
transaction track remains fully PARKED and deferred — separate from this confirmation.

### 6.2 ECO / TCS Analysis — CA Confirmed

**Question:** Does TexQtic have e-commerce operator (ECO) TCS obligations under Section 52 of
the GST Act or Section 194-O of the Income Tax Act at MVP?

**CA-Confirmed Answer (recorded 2026-06-03):**

- TexQtic should treat marketplace-surface obligations as an **e-commerce operator analysis
  item** requiring ongoing tracking.
- Since marketplace payment collection is formally deferred at MVP and TexQtic does NOT
  collect money on behalf of suppliers at MVP, **TCS / marketplace payment-collection
  obligations are NOT activated in the MVP path**.
- This analysis MUST be **reconfirmed with CA/counsel before any future marketplace payment
  collection track opens**, including: Razorpay Route integration, split-settlement, supplier
  payout via TexQtic, or any scenario where TexQtic collects goods payment on behalf of
  suppliers.

**Governance impact:** ECO/TCS recheck is recorded as a standing recheck requirement. Any
future governance unit that opens marketplace payment collection MUST include a CA/counsel TCS
recheck as a mandatory prerequisite. This obligation is parked and not blocking for the
current MVP SaaS subscription billing path.

---

## 7. Prerequisite Status Impact

Per the PR-01 through PR-08 gate matrix established in
`FAM-13B-D1-PAYMENT-DECISION-LOCK-RECONCILIATION-001` §6:

| PR | Prerequisite | FAM-13B-D1 Status | FAM-13B-D2 Impact | Updated Status |
|---|---|---|---|---|
| PR-01 | Merchant-of-record entity confirmed (SaaS scope) | ✅ COMPLETE | No change | ✅ COMPLETE |
| PR-02 | Settlement model: SaaS separate from marketplace | ✅ COMPLETE | No change | ✅ COMPLETE |
| PR-03 | India CA engagement / GST-TDS advisory | ⚠️ CONFLICTING_EVIDENCE | CA confirms SAC classification (998315 for SaaS/AI, 998599 for marketplace facilitation, 998311 for professional services), 18% GST rate, exclusive display rule, marketplace payment formal deferral, ECO/TCS not activated at MVP. CONFLICTING_EVIDENCE resolved. **Remaining open items:** (a) Razorpay invoice SAC/GST field capability not yet verified — see §8; (b) invoice filing cadence and numbering sequence per GST rules not yet confirmed; (c) IGST vs CGST+SGST state-based split treatment not explicitly addressed. | ⚠️ **PARTIALLY_COMPLETE** (advances from CONFLICTING_EVIDENCE) |
| PR-04 | Razorpay KYC and business account setup | ❌ NOT_STARTED | No new information. KYC entity decided (TexQtic company), operational KYC not complete. | ❌ NOT_STARTED |
| PR-05 | Refund and dispute policy | ❌ NOT_STARTED | No new information supplied. | ❌ NOT_STARTED |
| PR-06 | PCI boundary design | ❌ NOT_STARTED | No new information supplied. | ❌ NOT_STARTED |
| PR-07 | Payment event audit/log policy | ❌ NOT_STARTED | No new information supplied. | ❌ NOT_STARTED |
| PR-08 | Price tier INR finalized + CA review complete | ⚠️ PARTIALLY_COMPLETE | CA SAC classification confirmed. Provisional prices (STARTER ₹2,499/mo, PROFESSIONAL ₹4,999/mo) recorded. CA has not explicitly confirmed final prices are authorized for public display. Razorpay invoice format carrying SAC/GST fields not yet verified. | ⚠️ **PARTIALLY_COMPLETE** (unchanged label; CA SAC confirmation recorded as progress) |

**Gate summary after FAM-13B-D2:**

| Status | PRs |
|---|---|
| ✅ COMPLETE | PR-01, PR-02 |
| ⚠️ PARTIALLY_COMPLETE | PR-03 (advanced), PR-08 |
| ❌ NOT_STARTED | PR-04, PR-05, PR-06, PR-07 |

**Gate result:** 2 of 8 prerequisites fully satisfied. PR-03 advances (CONFLICTING_EVIDENCE →
PARTIALLY_COMPLETE). PR-08 records CA SAC progress but label unchanged. PR-04–PR-07 remain
NOT_STARTED.

**IMPLEMENTATION GATE: CLOSED. Implementation is NOT authorized.**

---

## 8. Razorpay Invoice / SAC Verification Risk

**Risk ID:** RAZORPAY-INVOICE-SAC-VERIFICATION-001
**Risk level:** HIGH — potentially blocking for GST-compliant invoice issuance via Razorpay
**Discovery date:** 2026-06-03 (FAM-13B-D2)
**Status:** OPEN — must be resolved before any implementation

### 8.1 Risk Description

Razorpay's API and product documentation indicates that GST-compliant invoice fields —
specifically: tax rate percentage, HSN/SAC code, item-level GST breakdown (IGST/CGST/SGST) —
**cannot be customized or added through the Razorpay Subscription or Invoice API endpoints**
in all configurations. If this limitation holds for the Razorpay Subscriptions product as
configured for TexQtic:

1. Razorpay-generated invoices would not carry the CA-confirmed SAC code (`998315`) or GST
   breakdown required by India GST rules
2. TexQtic may need to generate separate GST-compliant tax invoices (distinct from Razorpay's
   payment confirmation receipts)
3. This could require a separate invoice generation system, accounting software integration,
   or a CA-reviewed workaround process

### 8.2 Required Action Before Any Implementation

A dedicated verification step MUST confirm how Razorpay's Subscriptions product, Dashboard
configuration, and invoice API capabilities handle SAC code and GST field display for India
merchants. This verification MUST occur in a design unit (FAM-13B-D3 or later), NOT during
implementation.

### 8.3 Blocking Condition

This verification is a HARD prerequisite for implementation. If Razorpay cannot carry
SAC/GST fields natively on subscription invoices, TexQtic must design and obtain CA review
for an alternative compliant invoice pathway before any payment collection begins.

### 8.4 Verification Questions for FAM-13B-D3

1. Can Razorpay Subscriptions Dashboard be configured to display the SAC code on invoices?
2. Can the Razorpay Subscription plan or order metadata carry HSN/SAC fields that propagate
   to the generated invoice?
3. Does Razorpay's GST integration (if activated on the merchant account) satisfy the
   CA-confirmed display requirements (SAC 998315, 18% GST exclusive breakdown)?
4. If Razorpay cannot generate compliant tax invoices: what is the CA-reviewed alternative?
   (separate invoice series, accounting software integration, manual invoice with Razorpay
   payment reference)
5. What is the regulatory requirement for invoice timing relative to Razorpay subscription
   charge events?

---

## 9. Decision Register Impact

| Decision | Prior Status (FAM-13B-D1) | FAM-13B-D2 Input | Updated Status |
|---|---|---|---|
| **D-011 item 4:** India SaaS GST treatment | ⚠️ CONFLICTING_EVIDENCE (PR-03 OPEN) | CA confirms SAC 998315, 18% GST, exclusive display rule. PR-03 advances to PARTIALLY_COMPLETE. | ✅ **CA_CONFIRMED** for SAC/GST classification. Razorpay invoice capability verification still pending (see §8). |
| **D-011 item 2:** Provisional prices | ⚠️ CA review pending | CA SAC confirmed; prices still provisional pending explicit CA authorization for public display | ⚠️ **PROVISIONAL — CA pricing confirmation not yet complete** |
| **D-011 item 7:** Feature entitlement scope per tier | ❌ PARKED — NOT_STARTED | No new input supplied | ❌ PARKED — NOT_STARTED |
| **D-011 overall** | PARTIALLY_RESOLVED (5/7 items) | Item 4 advances to CA_CONFIRMED. Item 2 still provisional. Item 7 still parked. | **PARTIALLY_RESOLVED** (item 4 advanced; items 2/7 still open) |
| **D-012 item 4:** India CA review of GST/TCS | ⚠️ CONFLICTING_EVIDENCE (PR-03 OPEN) | CA confirms: SaaS GST/SAC confirmed (998315, 18%); marketplace payment collection formally deferred at MVP; ECO/TCS NOT activated at MVP. Must recheck CA/counsel before any future marketplace payment collection track. | ✅ **CA_CONFIRMED_PARTIAL** — SaaS SAC/GST confirmed; marketplace track obligations parked pending recheck |
| **D-012 overall** | PARTIALLY_RESOLVED (SaaS scope) | Item 4 advances to CA_CONFIRMED_PARTIAL. Marketplace track still PARKED and deferred. | **PARTIALLY_RESOLVED** (SaaS scope; item 4 advanced) |
| **D-015** | FOUNDER_DECISION_RESOLVED — COUNSEL_REVIEW_PENDING | No change | **FOUNDER_DECISION_RESOLVED — COUNSEL_REVIEW_PENDING** (unchanged) |
| **D-019** | RESOLVED_FOUNDER_DECISION | No change | **RESOLVED** (unchanged) |
| **D-020** | PARTIALLY_RESOLVED | No change | **PARTIALLY_RESOLVED** (unchanged) |
| **D-021** | PARKED — NOT_STARTED | No change | **PARKED — NOT_STARTED** (unchanged) |
| **D-022** | PARKED — PARTIALLY_SUPPLIED | No change | **PARKED — PARTIALLY_SUPPLIED** (unchanged) |

---

## 10. Implementation Authorization Status

| Surface | Status |
|---|---|
| Razorpay SDK installation (any package) | ❌ NOT AUTHORIZED |
| Razorpay Subscriptions integration (any environment) | ❌ NOT AUTHORIZED |
| Payment route / checkout endpoint | ❌ NOT AUTHORIZED |
| Payment webhook endpoint | ❌ NOT AUTHORIZED |
| Razorpay Subscription plan creation (Dashboard) | ❌ NOT AUTHORIZED |
| KYC merchant account setup (PR-04) | ❌ NOT AUTHORIZED (entity decided; operational start requires explicit authorization in next governance unit) |
| Invoice issuance with SAC codes | ❌ NOT AUTHORIZED (SAC locked for governance; implementation gate not cleared; Razorpay invoice capability not yet verified) |
| Price display on public surfaces (e.g., STARTER ₹2,499) | ❌ NOT AUTHORIZED (provisional; CA pricing confirmation for public display not yet complete) |
| Schema / migration changes for billing or subscriptions | ❌ NOT AUTHORIZED |
| Environment variable changes (Razorpay keys of any kind) | ❌ NOT AUTHORIZED |

**Implementation gate condition:** ALL §4.3 prerequisites (PR-03 through PR-08) must be FULLY
satisfied AND Paresh must issue explicit written implementation authorization before any of
the above may proceed.

---

## 11. External Reference Note

This unit records a professional CA advisory as a governance input only. The CA advisory is
captured by its governance impact (SAC classifications, decisions, and constraints) — not by
its document contents, engagement details, or identifying credentials.

The original CA engagement document and written advisory should be retained by the founder in
a secure external location outside this repository. No CA document content is stored here.

For legal/compliance purposes, the CA advisory should be preserved with version, date, and
engagement reference in the founder's external records.

---

## 12. Tracker / Register Updates

The following governance files were updated as part of this unit:

| File | Update Summary |
|---|---|
| `governance/launch-readiness/DECISION-PARKING-LOT.md` | D-011 status updated: item 4 advances from CONFLICTING_EVIDENCE to CA_CONFIRMED (SAC 998315, 18% GST, exclusive display; PR-03 PARTIALLY_COMPLETE; Razorpay invoice SAC verification still pending). D-012 status updated: item 4 advances to CA_CONFIRMED_PARTIAL (marketplace payment deferred; ECO/TCS not activated at MVP; SaaS SAC/GST confirmed; recheck before future marketplace payment collection). Update history row added. |
| `governance/control/NEXT-ACTION.md` | Active delivery unit updated to FAM-13B-D2 COMPLETE. Last closed unit updated to FAM-13B-D2. Next candidate unit updated to FAM-13B-D3. |
| `governance/launch-readiness/COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md` | §4.3 PR-03 and §4.4 updated: CA SAC confirmation recorded; PR-03 advances to PARTIALLY_COMPLETE. Razorpay invoice SAC verification risk noted. Implementation gate still CLOSED. |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | Update history row added: FAM-13B-D2 CA SAC confirmation recorded; PR-03 PARTIALLY_COMPLETE noted. |

**Confirmed NOT updated (with rationale):**

| File | Reason not updated |
|---|---|
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | No family cycle status change. FAM-11 CLOSE_READY unchanged. No FAM cycle closed or advanced. |
| `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` | PRIT-029 remains DESIGN_GATED. Not all §4.3 prerequisites satisfied; no status change warranted. |
| `governance/legal/fam-07/` | ABSENT. FAM-07 hold HOLD_FOR_HUMAN_LEGAL_INPUTS unchanged. No action. |
| All source files | No changes. SAC codes are governance-only at this stage. No implementation authorized. |
| `server/prisma/schema.prisma` | No schema changes. Billing schema design not yet authorized. |

---

## 13. Recommended Next Unit

**FAM-13B-D3 — Payment Prerequisite Tracker and Operational Readiness Plan**

**Recommended scope:**

1. Verify Razorpay invoice SAC/GST field capability (RAZORPAY-INVOICE-SAC-VERIFICATION-001)
   — required before any invoice design can proceed
2. Define the prerequisite completion path for PR-04 through PR-07
3. Authorize PR-04 KYC operational start (if Paresh confirms entity and timing readiness)
4. Define D-021: SaaS subscription refund and cancellation policy
5. Clarify D-022: FREE pilot tenant upgrade invitation policy
6. Clarify D-011 item 7: per-tier feature entitlement scope
7. Assess timeline and sequencing for all remaining §4.3 prerequisites to full closure
8. Determine whether any partial authorization (e.g., test-mode KYC only) can be granted before
   full prerequisite closure — this requires explicit CA/counsel input

**Gate to open FAM-13B-D3:** Paresh explicitly directs after reviewing this unit (FAM-13B-D2).

---

## 14. Residuals

| Residual | Description | Disposition |
|---|---|---|
| RAZORPAY-INVOICE-SAC-VERIFICATION-001 | Razorpay invoice SAC/GST field capability unverified | OPEN — must be addressed in FAM-13B-D3 before any invoice implementation |
| D-011 item 7 | Feature entitlement scope per tier not yet supplied | PARKED — must be addressed before full D-011 resolution |
| D-011 item 2 | Provisional prices not CA-confirmed for public display | PARKED — CA pricing confirmation pending |
| D-021 | Refund/cancellation policy not defined | PARKED — required before live mode |
| D-022 | FREE pilot tenant upgrade invitation policy not defined | PARKED |
| PR-04 | Razorpay KYC operational start not yet authorized | PARKED — requires explicit authorization in FAM-13B-D3 |
| PR-05 | Refund and dispute policy not defined | NOT_STARTED |
| PR-06 | PCI boundary design not defined | NOT_STARTED |
| PR-07 | Payment event audit/log policy not defined | NOT_STARTED |
| ECO/TCS recheck obligation | Must recheck with CA/counsel before any future marketplace payment collection, Razorpay Route, split-settlement, or supplier payout track | Standing obligation — recorded here; enforcement REQUIRED before any marketplace payment track opens |
| FAM-07 legal hold | HOLD_FOR_HUMAN_LEGAL_INPUTS | Unchanged — no L14 authorized |
| D-015 counsel review | Legal counsel sign-off on Razorpay operating agreement | Still open — tracked in D-015 |

---

## 15. Final Enum

```
FAM_13B_D2_CA_SAC_CONFIRMATION_SYNC_COMPLETE_PREREQS_OPEN
```

**Summary:** CA-confirmed SAC codes for all TexQtic service types locked in governance.
Eliminated codes (998314, 998319, 998596) formally removed. CA answers on MVP marketplace
payment model and ECO/TCS analysis recorded. PR-03 advances from CONFLICTING_EVIDENCE to
PARTIALLY_COMPLETE. PR-08 records CA SAC progress (label unchanged: PARTIALLY_COMPLETE).
PR-04 through PR-07 remain NOT_STARTED. Implementation gate remains CLOSED. No source,
schema, migration, or environment changes. Governance documentation only.

---

## 16. Commit Chronology

| Step | Commit Hash | Description |
|---|---|---|
| FAM-13B-D1 main | `9a7a1fbd` | Decision reconciliation artifact + 4 governance files |
| FAM-13B-D1 seal | `c7dbf5d7` | Seal commit — commit hash backfilled |
| FAM-13B-D1 hash propagation | `fe87916f` | Seal hash + NEXT-ACTION.md `last_closed_unit_commits` |
| FAM-13B-D2 main | `2f342bb9` | This artifact + governance file updates |
| FAM-13B-D2 seal | TBD — backfill after seal commit | Seal hash backfilled |
