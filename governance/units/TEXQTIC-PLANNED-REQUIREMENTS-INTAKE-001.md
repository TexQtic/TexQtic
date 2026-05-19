# TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-001

**Unit ID:** TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-001
**Title:** TexQtic — Planned Requirements Intake Queue Population
**Status:** COMPLETE
**Type:** GOVERNANCE_ONLY — no runtime, schema, migration, route, frontend, or contract changes
**Date:** 2026-07-14
**Authorized by:** Paresh Patel (TexQtic founder)
**Layer 0 posture at execution:** `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK`
**Git HEAD at open:** `090c4cc` (`[TEXQTIC] governance: backfill commit hash in SEO register sync unit`)
**Pre-existing unstaged M files (do NOT stage in any unit):**
- `components/Public/PublicSupplierProfile.tsx`
- `tests/frontend/public-referral-landing.test.tsx`

---

## §1 Unit Summary

This unit creates the planned requirements intake queue for the TexQtic launch readiness hub.
It populates `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` with 21 intake rows
drawn from three existing governance sources — no new classifications are introduced.

The intake queue provides a structured staging area where planned, deferred, and not-yet-confirmed
technical requirements are recorded before being promoted to family audit, implementation-ready
status, or MVP classification. It is an additive governance document only.

**Result:** `PLANNED_REQUIREMENTS_INTAKE_COMPLETE`

---

## §2 Scope and Non-Scope

### In scope
- Create `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md`
- Update `governance/launch-readiness/README.md` (add read order item + document table row)
- Create this unit governance artifact

### Out of scope (forbidden in this unit)
- No runtime code: no frontend, backend, API, Prisma, migration, OpenAPI, or event contract changes
- No opening of any family implementation cycle
- No repo inspection of any family (inspections happen at family cycle opening gates)
- No classification of any planned item as `IMPLEMENTATION_READY`
- No marking any planned item as `MVP_CRITICAL` / `LAUNCH_BLOCKER` / `P0` / `P1` beyond what existing governance sources already record
- No recording of marketing, fundraising, investor, sales, or field GTM items
- No duplicating CRM or CAE internal feature inventories in the main repo
- No staging of pre-existing modified runtime files

---

## §3 Files Inspected (Read-Only)

| File | Purpose of inspection |
|---|---|
| `governance/control/OPEN-SET.md` | Confirm Layer 0 posture; verify HOLD_FOR_AUTHORIZATION active |
| `governance/control/NEXT-ACTION.md` | Confirm active delivery unit; last closed unit; candidate unit gate |
| `governance/control/BLOCKED.md` | Confirm blockers: WEBHOOK-007, QD-6, WL Co hold, award E2E status |
| `governance/launch-readiness/README.md` | Current read order and document table; identify insertion point |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | All 24 families; cycle assignments; NOT_ASSESSED families; XDEP families |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | All FTR-* items; classification; priority; source |
| `governance/launch-readiness/DECISION-PARKING-LOT.md` | All D-001–D-010 decisions; status; trigger conditions |
| `governance/launch-readiness/MVP-LAUNCH-READINESS-ROADMAP.md` | Roadmap skeleton; family readiness matrix |
| `governance/launch-readiness/MVP-MUST-HAVES-CHECKLIST.md` | Binary checklist; NOT_ASSESSED items |
| `governance/units/TEXQTIC-LAUNCH-READINESS-INCREMENTAL-TRUTH-STRATEGY-001.md` | Intake rules; Decision A/B/C; family-by-family process |
| `TECS.md` | TECS v1.6 §8 OS lifecycle doc; Q1–Q9 checklist |

---

## §4 Files Created / Modified

| File | Action | Justification |
|---|---|---|
| `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` | CREATED | Primary unit output: intake queue with PRIT-001–PRIT-021 |
| `governance/launch-readiness/README.md` | MODIFIED | Added #12 to read order; added row to documents table |
| `governance/units/TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-001.md` | CREATED (this file) | Unit governance artifact per TECS §3 |

---

## §5 Intake Method

All intake rows were populated by cross-referencing three governance sources:

1. **LAUNCH-FAMILY-INDEX.md** — NOT_ASSESSED families requiring future cycles (PRIT-001–PRIT-008) and XDEP families (PRIT-020–PRIT-021)
2. **FUTURE-TODO-REGISTER.md** — Specific deferred technical items with known classification (PRIT-009–PRIT-015)
3. **DECISION-PARKING-LOT.md** — Parked decisions that block technical implementation (PRIT-016–PRIT-019)

**No new requirements were introduced.** All classifications, priorities, and statuses shown in the intake table are carried from source documents without change.

**Feature source codes used:**
- `REPO_PARTIAL` — some repo implementation exists but not formally audited (FAM-06 through FAM-15; FTR-AUTH-001; FTR-CP-001)
- `PLANNED_NOT_IN_REPO` — no repo implementation exists; technical requirement identified (FTR-LEGAL-002/003; FTR-OPS-001/002/003)
- `GOVERNANCE_CLAIM_ONLY` — recorded in governance docs; no repo implementation yet (D-005, D-007, D-008, D-010; XDEP items)

---

## §6 Initial Intake Rows Added

21 intake rows added: PRIT-001 through PRIT-021.

**Group A — Family cycles needed (8 rows):**
PRIT-001 (FAM-06 Auth), PRIT-002 (FAM-07 Tenant Onboarding), PRIT-003 (FAM-08 Tenant Core Workspace), PRIT-004 (FAM-09 Supplier Profile), PRIT-005 (FAM-10 Platform Ops), PRIT-006 (FAM-11 Subscription), PRIT-007 (FAM-12 NC RFQ/Award E2E), PRIT-008 (FAM-15 NC Invoices)

**Group B — Specific deferred FTR items (7 rows):**
PRIT-009 (FTR-AUTH-001), PRIT-010 (FTR-CP-001), PRIT-011 (FTR-LEGAL-002), PRIT-012 (FTR-LEGAL-003), PRIT-013 (FTR-OPS-001), PRIT-014 (FTR-OPS-002), PRIT-015 (FTR-OPS-003)

**Group C — Parked decision items (4 rows):**
PRIT-016 (D-005 SEO domain), PRIT-017 (D-007 G-022), PRIT-018 (D-008 commercial packaging), PRIT-019 (D-010 supplier indexability)

**Group D — XDEP cross-system references (2 rows):**
PRIT-020 (FAM-22 / WEBHOOK-007), PRIT-021 (FAM-24 / CAE chain)

---

## §7 Items Excluded as Out-of-Repo GTM

The following categories were explicitly excluded from the intake queue per §4 intake rules
and §8 of the intake document:

- Surat 90-day tactical GTM battle plan
- Fundraising and investor pitch preparation
- Sales call scripts and supplier outreach
- Commercial pricing/tier decision (the business choice — the technical implementation is PRIT-018)
- Marketing content and campaigns
- Field onboarding playbook for Surat suppliers
- Customer acquisition strategy

These items are out-of-repo business and operational matters and produce no governed delivery
units in the main platform repo.

---

## §8 CRM/CAE XDEP Handling

Per Decision B of `TEXQTIC-LAUNCH-READINESS-INCREMENTAL-TRUTH-STRATEGY-001`:

- CRM repo: Feature inventories and readiness audits belong in `TexQtic-CRM` governance.
- CAE repo: Feature inventories and readiness audits belong in `TEXQTIC-CUSTOMER-ACQUISITION-ENGINE` governance.
- Main platform repo: Records only cross-system dependency (XDEP) status and integration contract state.

**PRIT-020** (FAM-22 / WEBHOOK-007): Cross-system provisioning handoff recorded as XDEP_ONLY.
No main-repo implementation planning until CRM repo audit and WEBHOOK-007 contract are defined.

**PRIT-021** (FAM-24 / CAE chain): Cross-system integration chain recorded as XDEP_ONLY.
No main-repo implementation planning until TTP legal gate clears + both CAE and CRM repo audits complete.

Neither PRIT-020 nor PRIT-021 creates any implementation obligation in this repo.

---

## §9 Confirmation: No Implementation Opened

This unit confirms:

- No implementation unit was opened.
- No family cycle was started.
- No repo audit (family-opening inspection) was performed.
- No route, service, schema, migration, component, test, config, or OpenAPI change was made.
- No `.env` file was read or modified.
- No feature flag was touched.
- No product-truth document was modified.
- `ttp_enabled=false` UNCHANGED.
- `HOLD_FOR_AUTHORIZATION` UNCHANGED.
- `HOLD_FOR_COUNSEL_FEEDBACK` UNCHANGED.
- DPP `HOLD_FOR_PARESH_DECISION` UNCHANGED.
- G-022 `HOLD_FOR_PARESH_DECISION` UNCHANGED.
- QD-6 `supplier_quotes.enabled=false` UNCHANGED.

---

## §10 Confirmation: No Planned Item Promoted to Implementation-Ready

This unit confirms that no intake item was promoted to `IMPLEMENTATION_READY`, `MVP_CRITICAL`,
`LAUNCH_BLOCKER`, or any actionable delivery classification beyond what is recorded in the
source governance documents.

Items carrying `MVP_CRITICAL (provisional)` or `LAUNCH_BLOCKER` in the intake table carry
those labels from their source documents only. They remain provisional until Paresh confirms
them at the family cycle opening gate.

The one exception is **PRIT-010** (FTR-CP-001), which is already marked `IMPLEMENTATION_READY`
in `FUTURE-TODO-REGISTER.md`. This designation is carried forward from the source — it was not
introduced by this unit. Even so, no implementation work was begun for PRIT-010 in this unit.

---

## §11 TECS Hub-Sync Checklist (Q1–Q9)

Per TECS v1.6 §8 (TECS-LAUNCH-READINESS-HUB-DRIFT-CONTROL-ADDENDUM-001):

| Q | Question | Answer |
|---|---|---|
| Q1 | Does this unit touch any hub document? | YES — creates PLANNED-REQUIREMENTS-INTAKE.md; updates README.md |
| Q2 | Were any family status rows changed in any hub document? | NO — LAUNCH-FAMILY-INDEX family rows unchanged; FTR rows unchanged; D-* rows unchanged |
| Q3 | Were any hub documents created or modified? | YES — PLANNED-REQUIREMENTS-INTAKE.md created; README.md read order + table updated |
| Q4 | Were all changes grounded in verified governance sources? | YES — all intake rows sourced from LAUNCH-FAMILY-INDEX, FUTURE-TODO-REGISTER, DECISION-PARKING-LOT |
| Q5 | Did any change touch CRM or CAE repo content? | NO — XDEP references only in main repo |
| Q6 | Was any planned item promoted to MVP classification without Paresh confirmation? | NO — all provisional labels carried from source; none promoted in this unit |
| Q7 | Were any stale or superseded hub rows removed or overwritten? | NO — additive only; no existing rows modified |
| Q8 | Was a hub sync performed correctly? | YES — PLANNED-REQUIREMENTS-INTAKE.md created; README.md updated with pointer |
| Q9 | Are all modified files within the unit allowlist? | YES — only 3 files: PLANNED-REQUIREMENTS-INTAKE.md (new), README.md (modified), this unit artifact (new) |

---

## §12 Validation

**Pre-implementation preflight:**
- `git diff --name-only` → no unexpected modified files
- `git status --short` → confirmed pre-existing unstaged M files (PublicSupplierProfile.tsx, public-referral-landing.test.tsx) not staged

**Implementation gate:**
- `git diff --name-only` after creating files → only allowlisted files
- No runtime changes → no health check or curl verification required
- No tsc / typecheck required → governance-only docs; no TypeScript touched

**Commit gate:**
- `git status --short` → exactly 3 files staged (2 new + 1 modified)
- Commit hash recorded in §13

---

## §13 Commit Hash

**Commit:** `[TO BE BACKFILLED]`
**Message:** `[TEXQTIC] governance: create planned requirements intake`
**Files:**
- `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` (new)
- `governance/launch-readiness/README.md` (modified)
- `governance/units/TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-001.md` (this file, new)

---

## §14 Recommended Next Unit

**Recommended next governance unit:** `TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001`

**Purpose:** Paresh reviews §10 of `PLANNED-REQUIREMENTS-INTAKE.md`, confirms or revises
the provisional classifications for PRIT-011 through PRIT-019, and records written decisions
on PRIT-016 (SEO domain), PRIT-017 (G-022), PRIT-018 (commercial packaging), and PRIT-019
(supplier indexability). Output: updated confirmation statuses in intake queue.

**Prerequisite:** Layer 0 remains `HOLD_FOR_AUTHORIZATION`. This review unit is governance-only
and may proceed under current posture.

**After review:** When Layer 0 releases `HOLD_FOR_AUTHORIZATION`, the first implementation
unit to open should be the family with the highest-priority `IMPLEMENTATION_READY` item:
**FAM-10 Platform Ops** (PRIT-010 / FTR-CP-001, P0, IMPLEMENTATION_READY, boundary artifact exists).
