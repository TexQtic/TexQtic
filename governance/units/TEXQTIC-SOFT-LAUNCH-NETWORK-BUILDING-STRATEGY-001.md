# TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001

**Unit type:** Governance / Strategy Design  
**Status:** COMPLETE  
**Date completed:** 2026-05-19  
**Author:** Copilot / Paresh Patel (Paresh confirmed via live session instruction)  
**Layer 0 posture at execution:** `HOLD_FOR_AUTHORIZATION` + `HOLD_FOR_COUNSEL_FEEDBACK` (unchanged)

---

## 1. Purpose

Define the TexQtic network-building soft launch strategy. Answer the question: *What does TexQtic's soft launch look like, and what must be true before Paresh begins real supplier/buyer outreach using the live platform?*

This unit:
- Draws a clear line between soft launch (network-building phase) and hard MVP launch
- Records Decisions A–G that unblock `TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001`
- Updates the TLRH register set (6 files) to reflect resolved items, new risks, and new deferred units
- Does NOT open a family cycle
- Does NOT authorize any implementation
- Does NOT authorize payment, legal, or tax decisions

---

## 2. Trigger

Paresh instruction: "run TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001" — following the completion of `TEXQTIC-LAUNCH-READINESS-MISSING-FAMILY-AND-FEATURE-SCAN-001` and `TEXQTIC-NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001`.

---

## 3. Predecessor Units

| Unit | Relevance |
|---|---|
| `TEXQTIC-LAUNCH-READINESS-MISSING-FAMILY-AND-FEATURE-SCAN-001` | Identified PRIT-032–035, R-013/R-014, and the gap in network-building strategy |
| `TEXQTIC-NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001` | Resolved R-013 classification conflict (MITIGATED); PRIT-032–035 Paresh-confirmed; FTR-B2C-004 created |
| `TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001` | Established D-015, PRIT-028–031, financial boundary (D-016 precursor) |
| `TEXQTIC-LAUNCH-FAMILY-INDEX-001` | Established FAM-01 through FAM-24 sequence; FAM-06 recommended first full cycle |

---

## 4. Scope

**In scope:**
- Define soft launch vs hard MVP launch boundary
- Define allowed and prohibited surfaces during soft launch
- Minimum readiness checklists (supplier, buyer, directory/aggregator)
- Record Decisions A–G (governance confirmations and strategic decisions)
- Update 6 TLRH registers
- Create FTR-SL-001 through FTR-SL-004 (deferred future units)
- Add D-016 and D-017 (confirmed decisions)
- Add R-015 (new risk)

**Out of scope:**
- Opening any family cycle
- Any implementation
- Payment, financial, or legal decisions
- CAE or CRM implementation
- Any runtime code change

---

## 5. Authority Boundary

This unit is governance-only. It does not authorize implementation of any feature. Every action item it generates must be tracked through the appropriate family cycle opening or standalone governance unit. The strategy document is located at:

```
governance/launch-readiness/SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md
```

---

## 6. TECS Hub-Sync Answers

### Q1: Did this unit change any governance classifications?

**YES.**

| Item | Prior classification | New classification |
|---|---|---|
| R-013 | `MITIGATED` | `RESOLVED` |
| PRIT-032 | Confirmed P2/PILOT_REQUIRED | Soft-launch context added (Decision B) |
| PRIT-033 | Confirmed MVP_CRITICAL/P1 | Soft-launch context added: FTR-B2C-004 = hard blocker before buyer outreach (Decision C) |
| PRIT-034 | Confirmed MVP_CRITICAL/P1 | Soft-launch context added: hard prerequisite before data collection (Decision D) |
| PRIT-035 | Confirmed P2/PILOT_REQUIRED | Soft-launch context added: not first-cohort blocker (Decision E) |

### Q2: What governance artifacts changed?

| Artifact | Change |
|---|---|
| `BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | R-013 MITIGATED → RESOLVED (confirmed by Decision A); R-015 added; Update History row added |
| `PLANNED-REQUIREMENTS-INTAKE.md` | §6 PRIT-032–035 confirmation rows extended with soft-launch context; §12 Update History row added |
| `DECISION-PARKING-LOT.md` | D-016 (B2B financial boundary confirmed) and D-017 (free/manual provisioning confirmed) added; Update History row added |
| `FUTURE-TODO-REGISTER.md` | §10 Soft-Launch register added (FTR-SL-001 through FTR-SL-004); §11 Update History row added |
| `LAUNCH-FAMILY-INDEX.md` | §13 Soft-Launch Strategy Note added |
| `README.md` | Item 15 added to §2 Read Order; `SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md` added to §3 Documents table |
| `SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md` | **Created** — 22-section strategy document |

### Q3: Which files changed or were created?

| File | Action |
|---|---|
| `governance/launch-readiness/SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md` | **Created** |
| `governance/units/TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001.md` | **Created** (this file) |
| `governance/launch-readiness/README.md` | **Modified** |
| `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` | **Modified** |
| `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | **Modified** |
| `governance/launch-readiness/DECISION-PARKING-LOT.md` | **Modified** |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | **Modified** |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | **Modified** |

### Q4: What was the authority source for the decisions recorded?

1. **Paresh instruction** — live session instruction to run this unit
2. `TEXQTIC-LAUNCH-READINESS-MISSING-FAMILY-AND-FEATURE-SCAN-001` — TLRH scan findings (PRIT-032–035, R-013/R-014)
3. `TEXQTIC-NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001` — R-013 mitigated; PRIT-032–035 confirmed; FTR-B2C-004 created
4. `TEXQTIC-COMMERCE-SUBSCRIPTION-PAYMENTS-METHODOLOGY-DESIGN-001` — financial boundary established (D-016 confirmation); provisioning model precedent (D-017 confirmation)

### Q5: Did this unit open any cross-system (XDEP) work?

**NO.** CAE and CRM are referenced in the strategy (§13–§15) but explicitly deferred to FTR-SL-002 (P2/PILOT_REQUIRED). No XDEP unit was opened. No implementation was initiated.

### Q6: Did this unit open any family cycle?

**NO.** `TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001` is the next unit. No family cycle is open.

### Q7: What risk items were resolved?

| Risk ID | Resolution |
|---|---|
| R-013 | RESOLVED — classification conflict definitively closed. Split-scope is the authoritative final state. No further escalation to Paresh required. See Decision A and `TEXQTIC-NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001`. |

### Q8: What runtime code changed?

**NONE.** This unit is governance-only. Zero runtime files modified.

### Q9: What is the next recommended unit?

**`TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001`**

Now that the soft-launch strategy is defined and recorded, Paresh can select the first family cycle. Recommended: FAM-06 (supplier auth), which is the minimum prerequisite for any tenant-facing feature. Standalone prerequisites (legal pages, inquiry notification loop) may open as parallel standalone units before or alongside FAM-06 selection.

---

## 7. Decisions Recorded

| Decision | Recorded In | Status |
|---|---|---|
| A — R-013 split-scope classification is the authoritative final resolution | `BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` R-013; strategy §11 | RESOLVED |
| B — PRIT-032 (Cart governance) P2/PILOT_REQUIRED, not a soft-launch blocker | `PLANNED-REQUIREMENTS-INTAKE.md` §6; strategy §12 | CONFIRMED |
| C — PRIT-033 (Inquiry notification) FTR-B2C-004 is a hard blocker before buyer outreach | `PLANNED-REQUIREMENTS-INTAKE.md` §6; strategy §12 | CONFIRMED |
| D — PRIT-034 (Legal pages) is a hard prerequisite before any real data collection | `PLANNED-REQUIREMENTS-INTAKE.md` §6; strategy §12 | CONFIRMED |
| E — PRIT-035 (Analytics) P2/PILOT_REQUIRED, not first-cohort blocker | `PLANNED-REQUIREMENTS-INTAKE.md` §6; strategy §12 | CONFIRMED |
| F — B2B no-platform-financial-transaction boundary applies in full during soft launch | `DECISION-PARKING-LOT.md` D-016; strategy §12 | CONFIRMED_BOUNDARY |
| G — First cohort (5–10 suppliers) provisioned free/manually by Paresh; D-011 not required for soft launch | `DECISION-PARKING-LOT.md` D-017; strategy §12 | CONFIRMED |

---

## 8. New Deferred Units Created

| FTR ID | Title | Priority | Launch Class |
|---|---|---|---|
| FTR-SL-001 | Soft-launch aggregator directory readiness design | P1 | MVP_CRITICAL |
| FTR-SL-002 | XDEP CAE + CRM + Main App soft-launch integration strategy | P2 | PILOT_REQUIRED |
| FTR-SL-003 | Minimum inquiry notification loop implementation (FTR-B2C-004 unit) | P1 | MVP_CRITICAL |
| FTR-SL-004 | Supplier inquiry inbox design (tenant dashboard) | P1 | MVP_CRITICAL |

---

## 9. New Risks Created

| Risk ID | Title | Priority | Status |
|---|---|---|---|
| R-015 | Aggregator directory promoted before supplier consent/profile completeness | P1 | OPEN |

---

## 10. Soft-Launch Prerequisites Summary

The following gates must be confirmed before Paresh promotes the directory or initiates real buyer outreach:

**Supplier prerequisites (from §8 checklist):**
- S-1: ≥5 real Surat supplier tenants provisioned manually
- S-2: All supplier profiles complete (business name, categories, contact, region)
- S-3: Supplier privacy consent on file (see PRIT-034)
- S-4: Aggregator directory cards verified (show correct supplier info)
- S-5: At least one supplier tested inquiry receipt
- S-6: Supplier informed of pilot status and feedback expectation
- S-7: Legal pages live (PRIT-034)
- S-8: Terms of service acknowledged by supplier (PRIT-034 scope)
- S-9: At least one supplier profile tested end-to-end by Paresh

**Buyer prerequisites (from §9 checklist):**
- B-1: Legal pages and privacy notice live before first buyer link shared
- B-2: FTR-B2C-004 notification loop operational (at least email to Paresh as operator)
- B-3: Buyer landing page (directory or TECS intro page) live and tested
- B-4: Inquiry form tested by Paresh (submit → notification confirmed)
- B-5: Buyer links contain no personally identifying info that violates privacy stance
- B-6: Paresh has a manual process for routing buyer inquiries to the right supplier contact
- B-7: Paresh can tell a buyer what happens after inquiry submission

**Aggregator directory prerequisites (from §10 checklist):**
- A-1: FAM-01 PRODUCTION_VERIFIED status confirmed still valid
- A-2: Directory lists only fully consented and profiled suppliers
- A-3: SEO metadata accurate for all listed supplier cards
- A-4: No broken links or 404s on directory or profile cards
- A-5: PRIT-034 legal pages live and linked from directory footer

---

## 11. Layer 0 Posture

**Unchanged.** Both `HOLD_FOR_AUTHORIZATION` and `HOLD_FOR_COUNSEL_FEEDBACK` postures remain in effect. The soft-launch strategy operates within the unauthenticated surface perimeter only. No TTP, no payment, no commission, no D2C/B2C checkout.

---

## 12. Files NOT touched

The following pre-existing modified files were intentionally not staged or touched:

| File | Reason |
|---|---|
| `components/Public/PublicSupplierProfile.tsx` | Pre-existing unstaged M; not in allowlist; not related to this unit |
| `tests/frontend/public-referral-landing.test.tsx` | Pre-existing unstaged M; not in allowlist; not related to this unit |

---

## 13. Commit

**Commit message:** `[TEXQTIC] governance: define soft launch network building strategy`

**Commit hash:** `594a46b`

**Files staged:**
- `governance/launch-readiness/SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md` (new)
- `governance/units/TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001.md` (new)
- `governance/launch-readiness/README.md` (modified)
- `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` (modified)
- `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` (modified)
- `governance/launch-readiness/DECISION-PARKING-LOT.md` (modified)
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md` (modified)
- `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` (modified)

**Files NOT staged:**
- `components/Public/PublicSupplierProfile.tsx` (pre-existing unstaged M)
- `tests/frontend/public-referral-landing.test.tsx` (pre-existing unstaged M)

---

*Unit authored: 2026-05-19 — TexQtic governance corpus, `governance/units/`, main branch.*
*Next recommended unit: `TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001`*
