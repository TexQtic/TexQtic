# TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001

**Unit type:** Governance review — intake confirmation
**Status:** COMPLETE
**Date:** 2026-05-19
**Authorized by:** Paresh Patel

---

## §1 Unit Summary

This unit records Paresh's explicit decisions for all UNCONFIRMED planned requirements
(PRIT-011 through PRIT-019) in the Planned Requirements Intake queue, and the acceptance
review of all Paresh-provided planned-feature rows (PRIT-022 through PRIT-027).

This unit is governance-only. No implementation work was authorized, designed, or performed.
No family cycle was opened. The Layer 0 posture remains `HOLD_FOR_AUTHORIZATION` /
`HOLD_FOR_COUNSEL_FEEDBACK` — UNCHANGED.

---

## §2 Scope

| Aspect | Value |
|---|---|
| Primary document | `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` |
| Items reviewed | PRIT-011 through PRIT-019 (formerly UNCONFIRMED); PRIT-022 through PRIT-027 (PARESH_CONFIRMED_AS_PLANNED) |
| Decision authority | Paresh Patel |
| Layer 0 posture | `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK` — UNCHANGED |
| Implementation authorized | NO |
| Family cycle opened | NO |

---

## §3 Files Inspected (Read-Only)

| File | Purpose |
|---|---|
| `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` | Primary intake queue |
| `governance/launch-readiness/DECISION-PARKING-LOT.md` | D-005, D-007, D-008, D-010 decision context |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | FTR-LEGAL-002, FTR-LEGAL-003, FTR-OPS-001, FTR-OPS-002, FTR-OPS-003 context |
| `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | R-006 context |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | Family sequencing and FAM destination mapping |
| `governance/control/BLOCKED.md` | G-022 HOLD_FOR_PARESH_DECISION confirmation |
| `governance/control/NEXT-ACTION.md` | G-022 state |
| `governance/units/TEXQTIC-LAUNCH-FAMILY-INDEX-AUDIT-GATE-ADDENDUM-001.md` | Family Opening Audit Gate doctrine |
| `TECS.md` | TECS v1.6 unit lifecycle rules |

---

## §4 Files Changed

| File | Change Type | Summary |
|---|---|---|
| `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` | Modified | §5A PRIT-011–019 confirmation status fields; §5B PRIT-022–027 next-action fields; §7 decision summary table; §10 confirmed items table; §11 checklist rows 15–19 added; §12 update history row added; §14 review section appended |
| `governance/launch-readiness/DECISION-PARKING-LOT.md` | Modified | PRIT cross-reference notes added to D-005, D-008, D-010; update history row added |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | Modified | §12 PRIT confirmation notes table added for FTR-LEGAL-002, FTR-LEGAL-003, FTR-OPS-001, FTR-OPS-002, FTR-OPS-003; update history row added |
| `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | Modified | R-006 evidence column updated with PRIT-011 cross-reference |
| `governance/units/TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001.md` | Created | This file |

---

## §5 PRIT-011–019 Decisions Recorded

| PRIT ID | Title | Paresh Decision | Final Class | Final Priority | Destination Family |
|---|---|---|---|---|---|
| PRIT-011 | Privacy/consent notice for public inquiry form | CONFIRMED MVP_CRITICAL/P1 | MVP_CRITICAL | P1 | FAM-03 |
| PRIT-012 | Supplier ToS / platform agreement acceptance flow | CONFIRMED MVP_CRITICAL/P1 | MVP_CRITICAL | P1 | FAM-07 |
| PRIT-013 | Error monitoring and alerting setup | CONFIRMED MVP_CRITICAL/P1; Sentry preferred | MVP_CRITICAL | P1 | FAM-10 |
| PRIT-014 | Performance budget / load testing before pilot | CONFIRMED PILOT_REQUIRED/P2; load profile 30–50 suppliers, 10–20 concurrent | PILOT_REQUIRED | P2 | FAM-10 |
| PRIT-015 | Rollback procedure documentation | CONFIRMED MVP_CRITICAL/P1; Vercel + Supabase rollback runbook | MVP_CRITICAL | P1 | FAM-10 |
| PRIT-016 | SEO domain canonical strategy | CONFIRMED LAUNCH_DEPENDENCY/P1; canonical target PENDING_PARESH_DECISION | LAUNCH_DEPENDENCY | P1 | FAM-04 |
| PRIT-017 | G-022 maker-checker decision | DEFERRED; G-022 HOLD_FOR_PARESH_DECISION UNCHANGED | LAUNCH_DEPENDENCY (DEFERRED) | P2 | FAM-13 |
| PRIT-018 | Subscription / commercial packaging tier | CONFIRMED POST_MVP/P3; pilot free/manual; no self-serve packaging required at MVP | POST_MVP | P3 | FAM-11 |
| PRIT-019 | Supplier profile publication and indexability policy | CONFIRMED LAUNCH_DEPENDENCY/P2; opt-in only during Surat pilot; no default indexing; policy partial | LAUNCH_DEPENDENCY | P2 | FAM-09 |

---

## §6 Rows Reviewed — PRIT-022–027

All six rows reviewed and accepted as planned features with conservative default classifications retained.

| PRIT ID | Title | Accepted | Classification Retained |
|---|---|---|---|
| PRIT-022 | PWA installability and offline shell strategy | YES | P2_PILOT_ENABLER / DESIGN_GATED |
| PRIT-023 | TexQtic CoWorker / AI Workbench foundation | YES | POST_MVP / DESIGN_GATED |
| PRIT-024 | China+1 Discovery Engine / RFQ matching strategy | YES | POST_MVP / DESIGN_GATED |
| PRIT-025 | AI Pricing Oracle | YES | POST_MVP / DESIGN_GATED |
| PRIT-026 | Collective Sustainability Certification Pool | YES | POST_MVP / DESIGN_GATED |
| PRIT-027 | Artisan IP and Heritage Commerce Layer | YES | POST_MVP / DESIGN_GATED |

---

## §7 Items Confirmed

| PRIT ID | Confirmed Classification | Notes |
|---|---|---|
| PRIT-011 | MVP_CRITICAL / P1 | Small privacy notice; counsel review may follow |
| PRIT-012 | MVP_CRITICAL / P1 | Simplified agreement acceptable at pilot; full review later |
| PRIT-013 | MVP_CRITICAL / P1 | Sentry or equivalent; FAM-10 cycle |
| PRIT-014 | PILOT_REQUIRED / P2 | Load profile: 30–50 suppliers, 10–20 concurrent sessions |
| PRIT-015 | MVP_CRITICAL / P1 | Vercel + Supabase + feature-flag rollback runbook; FAM-10 |
| PRIT-016 | LAUNCH_DEPENDENCY / P1 | Canonical target PENDING; D-005 remains PARKED |
| PRIT-019 | LAUNCH_DEPENDENCY / P2 | Opt-in only during pilot; D-010 remains PARKED; policy partial |
| PRIT-022–027 | As classified at intake (no change) | Accepted as planned features; DESIGN_GATED retained |

---

## §8 Items Deferred / Parked / Post-MVP

| PRIT ID | Status | Rationale |
|---|---|---|
| PRIT-017 | DEFERRED | G-022 design artifact exists; Paresh decision not yet given; HOLD_FOR_PARESH_DECISION in BLOCKED.md UNCHANGED; D-007 remains PARKED |
| PRIT-018 | POST_MVP_CONFIRMED | Pilot can launch free/manual; self-serve commercial packaging not required for MVP; D-008 remains PARKED pending pilot proof pack |
| D-005 | PARKED | Confirmed LAUNCH_DEPENDENCY but canonical domain target not yet decided; status cannot move to DECIDED until Paresh decides the canonical domain |
| D-010 | PARKED | Policy direction confirmed (opt-in only) but partial; full supplier consent policy pending; status remains PARKED |

---

## §9 PRIT-022–027 — Review Conclusion

- All six rows accepted as Paresh-planned features with their intake-stage conservative classifications.
- None promoted to P0, P1, MVP_CRITICAL, or LAUNCH_BLOCKER.
- None alter MVP launch readiness (FAM-01 through FAM-12, FAM-15 critical path unaffected).
- All remain `PARESH_CONFIRMED_AS_PLANNED` / `DESIGN_GATED`.
- Family Opening Audit Gate required before any cycle is opened for these items.

---

## §10 Pillar 7 Note

The 7 Pillars document provided by Paresh contained Pillars 1 through 6. Pillar 7 was not
present in the provided artifact. No PRIT row was created for Pillar 7 at intake (§13.6 of
PLANNED-REQUIREMENTS-INTAKE.md) and no row is created by this review unit. Next available
PRIT ID: **PRIT-028**.

---

## §11 Exclusions

The following were explicitly NOT done by this review unit:

- No implementation work of any kind
- No schema, migration, route, event, or API contract change
- No family audit or family cycle opening
- No promotion of PRIT-022–027 to P0/P1/MVP_CRITICAL/LAUNCH_BLOCKER
- No change to Layer 0 HOLD_FOR_AUTHORIZATION / HOLD_FOR_COUNSEL_FEEDBACK posture
- No staging or committing of pre-existing unstaged M files (`components/Public/PublicSupplierProfile.tsx`, `tests/frontend/public-referral-landing.test.tsx`)

---

## §12 CRM and CAE Handling

- PRIT-020 (CRM provisioning handoff / WEBHOOK-007): XDEP_ONLY posture unchanged.
- PRIT-021 (CAE → CRM → Platform chain): XDEP_ONLY posture unchanged.
- No CRM or CAE feature inventories created or modified.
- No duplication risk with CRM/CAE governance.

---

## §13 No Implementation Performed

This review is governance-only:
- No code changes made
- No schema changes made
- No migration files created
- No route or API contract changes made
- No event contract changes made
- No OpenAPI contract changes made
- No runtime files staged or committed

---

## §14 No Family Audit Gate Cleared

This review unit does not satisfy the Family Opening Audit Gate for any family. Per
`TEXQTIC-LAUNCH-FAMILY-INDEX-AUDIT-GATE-ADDENDUM-001`, every family still requires a
family-local repo-truth audit before its implementation cycle opens.

---

## §15 TECS Hub-Sync Checklist

| Q | Question | Answer |
|---|---|---|
| Q1 | Does this unit produce intake confirmation status changes? | YES — PRIT-011–019 confirmation statuses updated in §5A and §7 of PLANNED-REQUIREMENTS-INTAKE.md |
| Q2 | Which PRIT IDs are affected? | PRIT-011 through PRIT-019; PRIT-022 through PRIT-027 (review status) |
| Q3 | Which governance documents were updated? | PLANNED-REQUIREMENTS-INTAKE.md (primary); DECISION-PARKING-LOT.md; FUTURE-TODO-REGISTER.md; BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md; this unit artifact |
| Q4 | What is the evidence source for Paresh decisions? | Paresh-provided decisions in unit prompt for TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001 (2026-05-19) |
| Q5 | CRM/CAE duplication risk? | NO — PRIT-020 and PRIT-021 remain XDEP_ONLY unchanged |
| Q6 | Any planned item promoted to MVP without Paresh confirmation? | NO — all classifications confirmed by Paresh; none added beyond what was confirmed |
| Q7 | Any stale rows superseded without deletion? | PRIT-011–019 status fields updated (not deleted); no row deleted |
| Q8 | Hub-sync updates complete? | YES — all four cross-register files updated |
| Q9 | All modified files allowlisted? | YES — five files: PLANNED-REQUIREMENTS-INTAKE.md, DECISION-PARKING-LOT.md, FUTURE-TODO-REGISTER.md, BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md, this unit artifact |

---

## §16 Validation

| Check | Result |
|---|---|
| `git diff --name-only` before staging | Run at commit time; only allowlisted files staged |
| Pre-existing unstaged M files not staged | `components/Public/PublicSupplierProfile.tsx` — NOT staged; `tests/frontend/public-referral-landing.test.tsx` — NOT staged |
| No runtime/frontend/backend/Prisma/OpenAPI/event file changes | CONFIRMED |
| PLANNED-REQUIREMENTS-INTAKE.md integrity | §5A, §5B, §7, §10, §11, §12, §14 all updated; no section lost |
| Layer 0 posture unchanged | CONFIRMED — `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK` |

---

## §17 Pre-Existing Unstaged M Files (Never Stage)

The following files had pre-existing unstaged modifications at the start of this session.
They must NEVER be staged or committed as part of this or any governance unit:

- `components/Public/PublicSupplierProfile.tsx`
- `tests/frontend/public-referral-landing.test.tsx`

---

## §18 Commit Hash

`[TO BE BACKFILLED after commit]`

---

## §19 Next Unit

**Recommended next unit:** `TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001`

This unit should identify and confirm which family cycle should be opened first once Layer 0
releases. Candidates include FAM-10 (platform ops / FTR-CP-001 IMPLEMENTATION_READY) and
FAM-06 (auth and session — Layer 0 release dependency). Paresh should confirm the opening
sequence and the family opening audit gate order before any family cycle is opened.
