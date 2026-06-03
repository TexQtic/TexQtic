# FAM-13B-D1-PAYMENT-DECISION-LOCK-RECONCILIATION-001
# TexQtic — Payment Decision Lock Reconciliation

**Unit:** `FAM-13B-D1-PAYMENT-DECISION-LOCK-RECONCILIATION-001`
**Family:** FAM-11 payment track governance sub-unit
**Status at seal:** COMPLETE — PREREQS_OPEN
**Final enum:** `FAM_13B_D1_PAYMENT_DECISION_RECONCILIATION_COMPLETE_PREREQS_OPEN`
**Governing artifact for:** FAM-13B resolution, D-019–D-022 registration, parking lot repair
**Author:** Copilot agent (Paresh Patel, TexQtic founder, supplying decisions)
**Created:** 2026-06-03

---

> **UNIT SCOPE (NON-NEGOTIABLE)**
>
> This unit performs governance reconciliation ONLY. No Razorpay implementation, no payment
> gateway integration, no subscription checkout code, no schema changes, no environment key
> additions, and no migration files are authorized in this unit.
>
> This unit resolves the governance blockers from FAM-13B (which was BLOCKED due to missing
> human decision inputs). It does NOT authorize implementation.

---

## 1. Unit Summary

FAM-13B (`FAM-13B-RAZORPAY-PAYMENT-ARCHITECTURE-DECISION-LOCK-001`, 2026-06-03) was BLOCKED
because D-011, D-012, D-015, and D-PG-PRIORITY (first payment use case priority) had no
supplied human decision inputs. The unit recorded a comprehensive audit of the 17 required
decision inputs and closed BLOCKED.

This unit (FAM-13B-D1) reconciles a founder decision-supply document
(`FAM-13A-RAZORPAY-SUBSCRIPTION-PAYMENT-READINESS-DECISION-LOCK-001` — see §3 for
naming conflicts) against repo truth. It:

1. Records and reconciles all supplied founder decisions
2. Identifies which decisions are resolved, partially resolved, or still open
3. Registers D-019 through D-022 in the DECISION-PARKING-LOT.md
4. Repairs the parking lot numbering conflict identified in FAM-13B (D-016–D-018 were occupied;
   new payment decisions correctly assigned D-019+)
5. Assesses prerequisite gates PR-01 through PR-08
6. Updates governance tracking files accordingly
7. Explicitly confirms that NO implementation is authorized

**Expected outcome:** Decision reconciliation complete. Prerequisites PR-01/PR-02 partially
satisfied for SaaS scope. PR-03 through PR-08 remain open. Implementation remains blocked.

---

## 2. Preflight Results

| Check | Expected | Result | Status |
|---|---|---|---|
| Working tree clean | No unstaged/untracked changes | No output from `git status --short` | ✅ PASS |
| HEAD | `a0e8eb3d` (FAM-13B seal) | `a0e8eb3d` | ✅ PASS |
| FAM-13B artifact commit ancestor | `ad1b5e2b` in HEAD | `ad1b_exit:0` | ✅ PASS |
| FAM-13B seal commit ancestor | `a0e8eb3d` in HEAD | `a0e8_exit:0` | ✅ PASS |
| `governance/legal/fam-07/` present | ABSENT | `Test-Path` → `False` | ✅ PASS (hold preserved) |
| FAM-07 hold status | `HOLD_FOR_HUMAN_LEGAL_INPUTS` | Confirmed in NEXT-ACTION.md | ✅ CONFIRMED |

All preflight gates passed. Proceeding to execution.

---

## 3. Input Document Review

### 3.1 Document Title and Source

**Supplied document title:** `FAM-13A-RAZORPAY-SUBSCRIPTION-PAYMENT-READINESS-DECISION-LOCK-001`
**Source:** External founder decision document (not present in repo; supplied as prompt attachment)
**Author:** Paresh Patel (TexQtic founder)

### 3.2 Naming Conflicts (to Document, Not to Act On)

The supplied document contains several naming conflicts with existing repo units:

| Conflict | Supplied Document Claim | Repo Reality |
|---|---|---|
| Unit name uses "FAM-13A" | Names itself `FAM-13A-*` | FAM-13A (`FAM-13A-RAZORPAY-READINESS-DESIGN-DECISION-001`) is already committed at `8946bda8` and sealed at `b2b8ab39`. The supplied document is NOT a repo unit — it is a founder decision-supply document. |
| References FAM-11C/FAM-11D | Claims to feed into FAM-11C/FAM-11D | FAM-11C and FAM-11D are already complete in the repo (FAM-11E sealed at `3834980b`, FAM-11 status `CLOSE_READY`). |
| Uses FAM-11E/FAM-11F | References FAM-11E/FAM-11F with a different meaning | FAM-11E in the repo is `FAM-11E-FAMILY-EVIDENCE-SYNC-AND-CLOSE-READINESS-001` (complete). The supplied document uses FAM-11E/FAM-11F with different scope. |

**Governance position:** These naming conflicts are documented but have no operational impact.
The supplied document is treated as a founder decision-supply artifact only. Its unit naming
does not create any new repo units; it does not supersede existing FAM-13A or FAM-11E.
The decisions within the supplied document are authoritative Paresh inputs regardless of the
naming conflicts.

### 3.3 Internal Conflicts in Supplied Document

| Conflict | Item | Conflicting Statements |
|---|---|---|
| PR-03 GST advisory | CA engagement | DOCX simultaneously claims "CA-confirmed GST display language (exclusive + 18% GST)" AND marks PR-03 (India CA engagement) as NOT STARTED. These cannot both be true. |
| PR-08 pricing review | CA review | DOCX provides provisional prices (STARTER ₹2,499/mo, PROFESSIONAL ₹4,999/mo) but marks CA review as NOT COMPLETE. "Provisional" is accurate; "CA-confirmed" claim in PR-03 is contradicted. |

**Resolution posture:** In all conflicting cases, the MORE CONSERVATIVE interpretation is applied:
- PR-03 is classified as PARTIALLY_COMPLETE / CONFLICTING_EVIDENCE (not CONFIRMED)
- PR-08 is classified as PARTIALLY_COMPLETE (provisional prices recorded; CA review pending)
- Implementation gates that depend on CA advisory remain blocked

### 3.4 Supplied Founder Decisions (Summary)

The following decisions were extracted from the supplied document and are treated as
authoritative Paresh inputs:

| # | Decision Item | Supplied Answer |
|---|---|---|
| 1 | First paid tier | STARTER only |
| 2 | Billing cycle | Monthly + Annual |
| 3 | Failed-payment grace period | 3 days |
| 4 | Non-payment action | Downgrade to FREE; preserve all data |
| 5 | Provisional pricing (STARTER) | ₹2,499/month |
| 6 | Provisional pricing (PROFESSIONAL) | ₹4,999/month |
| 7 | GST display rule | Public prices exclusive of GST; display "+ 18% GST" |
| 8 | SaaS subscription MoR | TexQtic entity (company, not Paresh personally) |
| 9 | B2C/D2C marketplace payments | Deferred (permanently separate track) |
| 10 | SaaS vs marketplace track separation | Permanently separate |
| 11 | Razorpay adoption decision | YES — adopt Razorpay |
| 12 | Razorpay product selection | Razorpay Subscriptions |
| 13 | Integration mode | Test mode first |
| 14 | KYC owner | TexQtic company entity |
| 15 | First payment scope | SaaS subscriptions only |
| 16 | First use case | SaaS subscription billing for tenant plan upgrades, STARTER tier first |
| 17 | B2C checkout | DEFERRED |
| 18 | D2C checkout | DEFERRED |
| 19 | Supplier split settlement | DEFERRED |
| 20 | TTP payment flows | DEFERRED (separate track) |

---

## 4. Repo-Truth Chronology

The following units form the authoritative payment/subscription governance chain in the repo:

| Unit | Commit | Status | Contribution |
|---|---|---|---|
| `TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001` | (2026-05-19) | METHODOLOGY_ESTABLISHED | Established payment methodology, §4.3 prerequisites, D-011/D-012/D-015 registered in parking lot; FTU-COMM-001/002/003 registered in FUTURE-TODO-REGISTER.md |
| FAM-11E: `FAM-11E-FAMILY-EVIDENCE-SYNC-AND-CLOSE-READINESS-001` | `3c9cf5aa` (sealed `3834980b`) | VERIFIED_COMPLETE (2026-06-03) | FAM-11 commercial tier-awareness CLOSE_READY. Display-only read; no self-serve billing. TenantPlan enum confirmed. |
| FAM-13A: `FAM-13A-RAZORPAY-READINESS-DESIGN-DECISION-001` | `8946bda8` (sealed `b2b8ab39`) | VERIFIED_COMPLETE (2026-06-03) | Razorpay ABSENT from all source. §4.3 prerequisites status audited. D-011/D-012/D-015 still PARKED. |
| FAM-13B: `FAM-13B-RAZORPAY-PAYMENT-ARCHITECTURE-DECISION-LOCK-001` | `ad1b5e2b` (sealed `a0e8eb3d`) | BLOCKED (2026-06-03) | All 17 required human decision inputs unresolved. D-PG-PRIORITY unnumbered. Parking lot numbering conflict D-016–D-018 documented. |
| **FAM-13B-D1 (this unit)** | `9a7a1fbd` (seal TBD) | VERIFIED_COMPLETE (2026-06-03) | Reconcile supplied decisions. Register D-019–D-022. Update D-011/D-012/D-015 status. Confirm prereqs. |

---

## 5. Decision Resolution Matrix

### 5.1 D-011 — Subscription Tier Pricing, Entitlement Model, and Self-Serve Billing

**Prior status:** PARKED

| Item | Question | Supplied Answer | Resolution |
|---|---|---|---|
| 1 | Which tier(s) launch first? | STARTER only | ✅ RESOLVED |
| 2 | Pricing per tier | STARTER ₹2,499/mo, PROFESSIONAL ₹4,999/mo (provisional) | ⚠️ PARTIALLY_RESOLVED — provisional; CA review pending |
| 3 | Billing cycle | Monthly + Annual | ✅ RESOLVED |
| 4 | India SaaS GST treatment | Exclusive + 18% GST display (conflicting PR-03 evidence) | ⚠️ CONFLICTING_EVIDENCE — see §3.3 |
| 5 | Grace period | 3 days | ✅ RESOLVED |
| 6 | Non-payment action | Downgrade to FREE, preserve data | ✅ RESOLVED |
| 7 | Feature entitlement scope per tier | NOT SUPPLIED — which specific features are gated behind STARTER vs FREE | ❌ STILL PARKED |

**Updated status:** `PARTIALLY_RESOLVED` — 5 of 7 items resolved; items 2 and 4 provisional
pending CA review; item 7 (feature entitlement scope per tier) still fully open. Full D-011
resolution requires: (a) CA advisory complete (PR-03/PR-08), (b) feature entitlement
scope per tier defined.

---

### 5.2 D-012 — B2C/D2C Merchant-of-Record and Settlement Model

**Prior status:** PARKED — NEEDS_PARESH_DECISION + NEEDS_COUNSEL_CA_REVIEW

| Item | Question | Supplied Answer | Resolution |
|---|---|---|---|
| 1 | SaaS subscription MoR | TexQtic entity (for SaaS only) | ✅ RESOLVED (SaaS scope) |
| 2 | B2C/D2C marketplace MoR | DEFERRED — permanently separate track | ✅ RESOLVED as DEFERRED |
| 3 | Settlement model | SaaS: single-entity TexQtic collection; marketplace deferred | ✅ RESOLVED (SaaS scope) |
| 4 | India CA review of GST/TCS obligations | CONFLICTING EVIDENCE — see §3.3 | ⚠️ CONFLICTING_EVIDENCE |
| 5 | SaaS vs marketplace separation | Permanent separation confirmed | ✅ RESOLVED |

**Updated status:** `PARTIALLY_RESOLVED` (SaaS scope) — SaaS MoR, settlement model, and
separation confirmed. Marketplace track remains PARKED (deferred). GST/TCS CA advisory
still open (PR-03 conflicting). D-012 for marketplace remains fully unresolved; only SaaS-
scoped items are resolved.

---

### 5.3 D-015 — Razorpay/Payment Gateway Platform Adoption Decision

**Prior status:** PARKED — NEEDS_PARESH_DECISION + NEEDS_COUNSEL_CA_REVIEW

| Item | Question | Supplied Answer | Resolution |
|---|---|---|---|
| 1 | Go/no-go on Razorpay | YES — adopt Razorpay | ✅ RESOLVED |
| 2 | Which Razorpay product | Razorpay Subscriptions | ✅ RESOLVED |
| 3 | Integration mode | Test mode first | ✅ RESOLVED |
| 4 | KYC owner | TexQtic company entity | ✅ RESOLVED |
| 5 | First scope | SaaS subscriptions only | ✅ RESOLVED |
| 6 | Legal counsel sign-off on Razorpay operating agreement | NOT SUPPLIED — counsel review not yet done | ⚠️ PENDING (not a blocking D-015 item per se; tracked via PR-04) |

**Updated status:** `FOUNDER_DECISION_RESOLVED — COUNSEL_REVIEW_PENDING` — All Paresh
founder decisions for D-015 are now supplied. Counsel sign-off on Razorpay operating agreement
is tracked via PR-04 (not a D-015 gate item but an §4.3 prerequisite). D-015's trigger
condition (`Paresh authorizes gateway integration for a specific use case`) is satisfied.
§4.3 prerequisites remain open — implementation is still NOT authorized.

---

### 5.4 D-019 — First Payment Use Case Priority (NEW — registering in parking lot)

**Prior status:** NOT IN PARKING LOT (D-PG-PRIORITY unnumbered in FAM-13B)

| Item | Question | Supplied Answer | Resolution |
|---|---|---|---|
| 1 | First payment use case | SaaS subscription billing for tenant plan upgrades, STARTER tier first | ✅ RESOLVED |
| 2 | B2C checkout priority | DEFERRED | ✅ RESOLVED as DEFERRED |
| 3 | D2C checkout priority | DEFERRED | ✅ RESOLVED as DEFERRED |
| 4 | Supplier split settlement priority | DEFERRED | ✅ RESOLVED as DEFERRED |
| 5 | TTP payment flow priority | DEFERRED (separate track) | ✅ RESOLVED as DEFERRED |

**Status:** `RESOLVED_FOUNDER_DECISION` — All priority items supplied. Registering as D-019.

---

### 5.5 D-020 — Paid Subscription Activation Model (NEW — registering in parking lot)

**Prior status:** NOT IN PARKING LOT

| Item | Question | Supplied Answer | Resolution |
|---|---|---|---|
| 1 | Razorpay product for subscription | Razorpay Subscriptions | ✅ RESOLVED |
| 2 | Initial mode | Test mode (not live) | ✅ RESOLVED |
| 3 | First tier | STARTER | ✅ RESOLVED |
| 4 | Upgrade trigger (in-app flow design) | NOT SUPPLIED — how tenant initiates upgrade not yet designed | ❌ STILL OPEN |
| 5 | Razorpay plan ID mapping to TenantPlan enum | NOT SUPPLIED — design pending | ❌ STILL OPEN |

**Status:** `PARTIALLY_RESOLVED` — product, mode, and first tier selected; full activation
flow design (UI trigger, plan ID mapping) requires a dedicated design unit (FTU-COMM-002 or
subsequent). Registering as D-020.

---

### 5.6 D-021 — SaaS Subscription Refund and Cancellation Policy (NEW — registering in parking lot)

**Prior status:** NOT IN PARKING LOT (mentioned as PR-05 only)

No refund or cancellation policy was supplied in the founder decision document.
This is a required prerequisite (PR-05) before any live payment processing.

**Status:** `PARKED — NOT_STARTED` — Registering as D-021 to track. Must be resolved before
live mode (not blocking for test mode setup only).

---

### 5.7 D-022 — FREE Pilot Tenant Conversion Policy (NEW — registering in parking lot)

**Prior status:** NOT IN PARKING LOT

Partially addressed by supplied decisions:
- Non-payment downgrade policy: downgrade to FREE, preserve data (supplied) ✅
- FREE pilot tenant upgrade invitation policy (when paid tiers launch, how existing FREE
  pilot tenants are invited to convert to STARTER): NOT SUPPLIED ❌

**Status:** `PARKED — PARTIALLY_SUPPLIED` — Non-payment downgrade confirmed. Pilot tenant
upgrade invitation policy not yet defined. Registering as D-022.

---

## 6. Prerequisite Gate Matrix (PR-01 through PR-08)

Per COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md §4.3:

| PR | Prerequisite | Evidence in Supplied Doc | Status |
|---|---|---|---|
| PR-01 | Merchant-of-record entity confirmed (SaaS separate from marketplace) | TexQtic entity confirmed for SaaS; marketplace deferred and permanently separated | ✅ COMPLETE (SaaS scope) |
| PR-02 | Settlement model decision, SaaS separate from marketplace | SaaS: single-entity TexQtic collection. Separation: permanent. Marketplace: deferred. | ✅ COMPLETE |
| PR-03 | India CA engagement / GST-TDS advisory | CONFLICTING: DOCX claims CA-confirmed GST display rule but also marks as NOT STARTED | ⚠️ CONFLICTING_EVIDENCE — treat as OPEN |
| PR-04 | Razorpay KYC and business account setup | KYC owner decided (TexQtic company entity). Actual KYC not operationally complete. | ❌ NOT_STARTED (decision made; operational KYC pending) |
| PR-05 | Refund and dispute policy | Not supplied; mentioned only as open prerequisite | ❌ NOT_STARTED |
| PR-06 | PCI boundary design | Not mentioned in supplied decisions | ❌ NOT_STARTED |
| PR-07 | Payment event audit/log policy | Not mentioned in supplied decisions | ❌ NOT_STARTED |
| PR-08 | Price tier INR finalized + CA review complete | Provisional prices supplied; CA review not complete per PR-03 conflict | ⚠️ PARTIALLY_COMPLETE — provisional prices recorded; CA review pending |

**Summary:**
- PR-01: ✅ COMPLETE (SaaS scope)
- PR-02: ✅ COMPLETE
- PR-03: ⚠️ CONFLICTING_EVIDENCE / OPEN
- PR-04: ❌ NOT_STARTED
- PR-05: ❌ NOT_STARTED
- PR-06: ❌ NOT_STARTED
- PR-07: ❌ NOT_STARTED
- PR-08: ⚠️ PARTIALLY_COMPLETE

**Gate result:** 2 of 8 prerequisites fully satisfied (SaaS scope). 6 remain open.
Implementation gate is NOT cleared. Test mode setup (PR-04) cannot begin until KYC is
operationally complete. Live mode launch requires all 8 prerequisites.

---

## 7. Decision Numbering Repair

### 7.1 Parking Lot Gap Confirmed

From repo inspection of `DECISION-PARKING-LOT.md` (grep `### D-0`):

| Entry | Status |
|---|---|
| D-001 through D-018 | Occupied (sequential from D-001 to D-018) |
| D-019 | **AVAILABLE** (confirmed absent from parking lot) |
| D-020 | **AVAILABLE** (confirmed absent from parking lot) |
| D-021 | **AVAILABLE** (confirmed absent from parking lot) |
| D-022 | **AVAILABLE** (confirmed absent from parking lot) |
| D-023 through D-025 | Available (confirmed absent from parking lot) |
| D-026 | Occupied (Reference Preview Buyer Bridge Activation — PARKED) |
| D-027 | Occupied (Live CRM Provisioning Smoke Authorization — PARKED) |

**Note on D-020-B / D-020-C / D-022-C in archived files:** The codes `D-020-B`, `D-020-C`,
`D-020-D`, `D-022-C` found in `governance/archive/ARCHIVED-tracker-2026-03.md` and
`governance/g019-day3-verification-report.md` are from the TECS internal governance design
decision numbering system (G-019/G-020/G-022 in the TECS context from March 2026). These are
a DIFFERENT numbering namespace from the DECISION-PARKING-LOT.md parking lot entries.
They do NOT conflict with D-020 or D-022 in the parking lot. No collision.

### 7.2 FAM-13B Numbering Conflict Resolution

FAM-13B identified that FAM-13A proposed D-016–D-019 for new payment decisions, but
D-016/D-017/D-018 were already occupied. The correct assignment is:

| Assignment | Reason |
|---|---|
| D-016 | OCCUPIED — Soft-Launch B2B Financial Boundary (CONFIRMED_BOUNDARY) |
| D-017 | OCCUPIED — Soft-Launch Provisioning Model (CONFIRMED) |
| D-018 | OCCUPIED — PRIT-033 Stage 2 Family Assignment (PARKED) |
| D-019 | AVAILABLE → Assigned to: First Payment Use Case Priority (RESOLVED) |
| D-020 | AVAILABLE → Assigned to: Paid Subscription Activation Model (PARTIALLY_RESOLVED) |
| D-021 | AVAILABLE → Assigned to: SaaS Subscription Refund and Cancellation Policy (PARKED) |
| D-022 | AVAILABLE → Assigned to: FREE Pilot Tenant Conversion Policy (PARTIALLY_SUPPLIED) |

---

## 8. Implementation Authorization Status

**Implementation remains NOT authorized.** This unit records decisions only.

| Area | Authorization Status | Reason |
|---|---|---|
| Razorpay SDK installation | ❌ NOT AUTHORIZED | PR-04 (KYC) not operationally complete |
| `RAZORPAY_KEY_*` env keys | ❌ NOT AUTHORIZED | No KYC; no counsel sign-off |
| Razorpay subscription checkout code | ❌ NOT AUTHORIZED | 6 of 8 prerequisites open |
| Schema changes for billing | ❌ NOT AUTHORIZED | Requires design unit (FTU-COMM-002) |
| Migration files | ❌ NOT AUTHORIZED | No schema changes authorized |
| Subscription webhook endpoint | ❌ NOT AUTHORIZED | PR-06/PR-07 (PCI + audit) not started |
| Self-serve upgrade UI | ❌ NOT AUTHORIZED | PR-04/PR-05/PR-06/PR-07 open |
| Live mode Razorpay | ❌ NOT AUTHORIZED | All 8 prerequisites required for live mode |
| Test mode Razorpay account | 🟡 CONDITIONALLY ALLOWED | Test account setup (PR-04 operational) may begin when Paresh confirms KYC is operationally complete — but this is an off-platform operational action; no repo code changes authorized until next design unit. |

**What IS authorized after this unit:**
- Paresh may initiate Razorpay test account KYC process (off-platform; no code changes)
- India CA engagement for PR-03 (GST-TDS advisory) — off-platform action
- Refund/cancellation policy drafting (PR-05) — off-platform action
- Opening `FAM-13B-D2` governance unit for payment prerequisite design once Paresh directs

---

## 9. Tracker and Register Updates Made in This Unit

| File | Update Type | What Changed |
|---|---|---|
| `governance/launch-readiness/DECISION-PARKING-LOT.md` | UPDATE | D-011 status → PARTIALLY_RESOLVED; D-012 status → PARTIALLY_RESOLVED (SaaS scope); D-015 status → FOUNDER_DECISION_RESOLVED — COUNSEL_REVIEW_PENDING; D-019/D-020/D-021/D-022 NEW entries added; update history row added |
| `governance/control/NEXT-ACTION.md` | UPDATE | `active_delivery_unit` → FAM-13B-D1; `active_delivery_unit_status` → COMPLETE; `last_closed_unit` → FAM-13B-D1; `next_candidate_unit` → FAM-13B-D2 |
| `governance/launch-readiness/COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md` | UPDATE | §4.1 note: D-015 resolved; §4.4 D-015 status updated; update history row added |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | UPDATE | FTU-COMM-002 status note: D-015 FOUNDER_DECISION_RESOLVED; prerequisites still open; update history row added |
| `artifacts/launch-readiness/FAM-13B-D1-PAYMENT-DECISION-LOCK-RECONCILIATION-001.md` | CREATE | This document |

**Files NOT updated (with reason):**
| File | Reason |
|---|---|
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | No family cycle opened or closed; FAM-11 CLOSE_READY status unchanged; no family status change warranted from a decision reconciliation governance sub-unit |
| `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` | PRIT-028 and PRIT-029 status remains PARKED/DESIGN_GATED; D-015 founder decision resolved but §4.3 prerequisites still open — DESIGN_GATED status for PRIT-029 remains accurate pending all prerequisites |
| Any source file | Not in scope — governance reconciliation only |

---

## 10. Recommended Next Unit

**Recommended:** `FAM-13B-D2-PAYMENT-PREREQUISITE-TRACKER-AND-DESIGN-001`

**Scope:**
- Track PR-03 through PR-08 to completion
- Design the Razorpay Subscriptions integration architecture (for review, not implementation)
- Record CA advisory outcome for PR-03 and PR-08
- Clarify feature entitlement scope per tier (D-011 item 7)
- Define D-021 (refund/cancellation policy)
- Clarify D-022 (FREE pilot tenant upgrade invitation policy)
- Authorize PR-04 operational KYC start

**Gate to open FAM-13B-D2:** Paresh explicitly directs it after reviewing this unit.

**Gate to authorize Razorpay implementation:** All 8 prerequisites in §4.3 satisfied AND
Paresh issues explicit written implementation authorization.

---

## 11. Residuals (Out of Scope for This Unit)

| Item | Status | Owner | Resolution Path |
|---|---|---|---|
| D-011 item 7: feature entitlement scope per tier | OPEN | Paresh | FAM-13B-D2 or dedicated design unit |
| D-021: refund and cancellation policy | NOT_STARTED | Paresh + counsel | PR-05 resolution track |
| D-022: FREE pilot tenant upgrade invitation policy | PARTIALLY_SUPPLIED | Paresh | FAM-13B-D2 clarification |
| PR-03: CA engagement / GST-TDS advisory | CONFLICTING / OPEN | Paresh + India CA | Off-platform action; result feeds back into PR-08 |
| PR-04: Razorpay KYC / business account | NOT_STARTED | Paresh (TexQtic company) | Off-platform operational action |
| PR-05: Refund and dispute policy | NOT_STARTED | Paresh + counsel | Off-platform action |
| PR-06: PCI boundary design | NOT_STARTED | Design unit | FAM-13B-D2 design scope |
| PR-07: Payment event audit/log policy | NOT_STARTED | Design unit | FAM-13B-D2 design scope |
| PR-08: Price tier INR + CA review | PARTIALLY_COMPLETE | Paresh + CA | Dependent on PR-03 resolution |
| B2C checkout (D-013, PG-01) | DEFERRED | Paresh | Permanently separate track; requires D-012 marketplace resolution |
| D2C checkout (D-014, PG-02) | DEFERRED | Paresh | Permanently separate track; requires D-012 marketplace resolution |
| Supplier split settlement | DEFERRED | Paresh | Separate future track |
| TTP payment flows | DEFERRED + HOLD | Paresh + counsel | HOLD_FOR_COUNSEL_FEEDBACK; separate TTP track |
| FAM-11 display-only plan surfaces | CLOSE_READY | — | FAM-11 CLOSE_READY; no billing UI in scope |
| D-020 items 4–5: activation flow + plan ID mapping | OPEN | Design unit | Requires FTU-COMM-002 design unit |
| FAM-07 legal hold | HOLD_FOR_HUMAN_LEGAL_INPUTS | Paresh + legal counsel | Unaffected; unchanged |

---

## 12. Final Enum

```
FAM_13B_D1_PAYMENT_DECISION_RECONCILIATION_COMPLETE_PREREQS_OPEN
```

**Rationale:**
- Founder decisions for D-015 fully captured; D-011/D-012 partially captured
- D-019 registered and RESOLVED; D-020 registered and PARTIALLY_RESOLVED
- D-021 and D-022 registered as new open parking lot items
- Parking lot numbering conflict from FAM-13B repaired (D-019–D-022 correctly assigned)
- 2 of 8 prerequisites (PR-01/PR-02) satisfied for SaaS scope
- 6 prerequisites still open (PR-03 through PR-08)
- Implementation NOT authorized
- All governance reconciliation work complete

---

## 13. Commit Hash

**Artifact commit:** `9a7a1fbd`
**Seal commit:** TBD — written after seal commit

---

## 14. Non-Implementation Confirmation Table

| Check | Status |
|---|---|
| Razorpay SDK added to `package.json` or `server/package.json` | ❌ NOT DONE |
| Razorpay env keys added to any `.env` file | ❌ NOT DONE |
| New checkout or subscription route added to backend | ❌ NOT DONE |
| `schema.prisma` modified | ❌ NOT DONE |
| New Prisma migration file created | ❌ NOT DONE |
| Frontend subscription upgrade UI added | ❌ NOT DONE |
| Any source file modified | ❌ NOT DONE |
| Any test file modified | ❌ NOT DONE |

**Scope of changes in this unit:** GOVERNANCE FILES ONLY.
Files modified: `DECISION-PARKING-LOT.md`, `NEXT-ACTION.md`,
`COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY.md`, `FUTURE-TODO-REGISTER.md`.
File created: this artifact.
