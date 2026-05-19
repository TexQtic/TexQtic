# TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001

## 1. Unit Header

| Field | Value |
|---|---|
| **Unit ID** | TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001 |
| **Title** | First Full Family Cycle Selection and Standalone Soft-Launch Prerequisite Queue |
| **Status** | VERIFIED_COMPLETE |
| **Type** | governance-selection |
| **Date** | 2026-07-14 |
| **Authored by** | Copilot — Governance Agent (Claude Sonnet 4.6) |
| **Authorized by** | Paresh Patel |
| **Layer 0 posture at time of execution** | HOLD_FOR_AUTHORIZATION + HOLD_FOR_COUNSEL_FEEDBACK |
| **Commit hash** | TBD — backfill after primary commit |

---

## 2. Objective

Formally select the first full family cycle for the TexQtic Surat pilot soft launch and define the
standalone soft-launch prerequisite queue. This unit produces governance truth only:
- no implementation is opened
- no family cycle is opened
- no repo code is changed
- Layer 0 posture remains unchanged

The selection provides a definitive planning anchor for all subsequent governance units and
replaces the "recommended" qualifier used in prior governance documents.

---

## 3. Allowlist

### Modify (governance files only)

| File | Action |
|---|---|
| `governance/launch-readiness/FIRST-FAMILY-CYCLE-SELECTION.md` | CREATE — primary selection document |
| `governance/units/TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001.md` | CREATE — this unit artifact |
| `governance/launch-readiness/README.md` | MODIFY — add item 16 to §2; add row to §3 table |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | MODIFY — append selection note to FAM-06 §7 row |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | MODIFY — add §14 register; add §11 update history row |
| `governance/launch-readiness/DECISION-PARKING-LOT.md` | MODIFY — add D-018; add §5 update history row |

### Read-only (governance documents inspected, not modified)

- `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` — authoritative family registry
- `governance/launch-readiness/SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md` — soft launch strategy; Decisions A–G
- `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE-REGISTER.md` — PRIT items
- `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` — BS / HD items
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md` — FTR items
- `governance/launch-readiness/DECISION-PARKING-LOT.md` — D-001 through D-017
- `governance/launch-readiness/README.md` — hub read order

---

## 4. Forbidden Actions

- Open FAM-06 or any family cycle
- Change FAM-06 status from `NOT_ASSESSED`
- Change FAM-06 evidence level from `NEEDS_REPO_INSPECTION`
- Run any Prisma commands
- Modify any runtime file (routes, components, schema, migrations)
- Commit any file outside the allowlist
- Stage the pre-existing unstaged M files: `components/Public/PublicSupplierProfile.tsx` and `tests/frontend/public-referral-landing.test.tsx`
- Print `.env` contents, DB URLs, or any secret
- Create helper scripts or temporary files

---

## 5. Approved Commands

```
git diff --name-only
git status --short
git add <allowlisted-file>
git commit -m "[TEXQTIC] governance: ..."
git show --stat HEAD
```

No `prisma`, no `pnpm`, no `npm`, no runtime commands.

---

## 6. Stop Conditions

1. Layer 0 `HOLD_FOR_AUTHORIZATION` forbids governance-only selection → **CONFIRMED: does NOT forbid**
2. Unit would require opening Family Opening Audit Gate → **NO: selection only**
3. Unit would require runtime implementation → **NO: governance only**
4. Pre-existing unstaged runtime M files become staged → **BLOCK**
5. Files outside allowlist would need to change → **BLOCK**
6. Any selection would require schema change or migration → **BLOCK**

---

## 7. Pre-Implementation Preflight Results

| Check | Result |
|---|---|
| `git diff --name-only` | Pre-existing M: `components/Public/PublicSupplierProfile.tsx`, `tests/frontend/public-referral-landing.test.tsx` only |
| `git status --short` | Only pre-existing unstaged M files; no uncommitted governance residue |
| Layer 0 posture | `HOLD_FOR_AUTHORIZATION` — governance-only selection confirmed to proceed |
| Allowlist verified | All 6 modify files are governance-only; no runtime files |

---

## 8. Documents Inspected

| Document | Key Findings |
|---|---|
| `LAUNCH-FAMILY-INDEX.md` §4 Family Summary | FAM-06 Auth and Session Management: LAUNCH_BLOCKER, P0, Group B Cycle 5 |
| `LAUNCH-FAMILY-INDEX.md` §8 Group B | FAM-06 identified as first cycle to open in Group B |
| `LAUNCH-FAMILY-INDEX.md` §13 Soft-Launch Note | FAM-06 remains recommended first full family cycle; nothing in soft-launch strategy changes this |
| `LAUNCH-FAMILY-INDEX.md` §7 Action Register | FAM-06 action: "Open family cycle after Layer 0 authorization; audit auth routes, session, reused-user edge case" |
| `SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md` §15, Q15, Q16 | FAM-06 confirmed as first full family cycle; immediate next unit identified as opening audit |
| `PLANNED-REQUIREMENTS-INTAKE-REGISTER.md` | PRIT-033 Stage 1 (FTR-B2C-004), PRIT-034 (legal pages), PRIT-032 confirmed; source for soft-launch prerequisite queue |
| `BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | BS-001 (real data seeding), HD-002 (supplier profile media), HD-001 prerequisite identified |
| `DECISION-PARKING-LOT.md` | D-017 highest existing D-ID (confirmed); D-018 does not exist yet; §5 Update History last entry 2026-05-19 |
| `FUTURE-TODO-REGISTER.md` | FTR-SL-001–004 confirmed; §11 Update History; §13 Commerce units; FTR-B2C-004 added 2026-07-14 |

---

## 9. Selection Outcome

**SELECTED: FAM-06 — Auth and Session Management**

| Attribute | Value |
|---|---|
| Family name | Auth and Session Management |
| Launch category | LAUNCH_BLOCKER |
| Priority | P0 |
| Status at selection | NOT_ASSESSED — unchanged by this selection |
| Evidence level | NEEDS_REPO_INSPECTION — unchanged by this selection |
| Soft-launch note | Unauthenticated surfaces (aggregator directory + public inquiry form) may proceed before FAM-06 opens; standalone units may also precede FAM-06 |
| Next unit | `FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT-001` |
| Gate condition | Layer 0 `HOLD_FOR_AUTHORIZATION` must release before opening |

**Selection is formal governance truth.** The prior "recommended" qualifier in LAUNCH-FAMILY-INDEX §8 and
SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY §15 is superseded by this selection.

---

## 10. Rationale Summary

FAM-06 is unambiguously the correct first full family cycle. The converging evidence from four authoritative
governance documents produces a single answer:

1. **LFINDEX §8 Group B Cycle 5**: explicitly names FAM-06 as "first cycle to open"
2. **LFINDEX §13 Soft-Launch Note**: explicitly states FAM-06 "remains the recommended first full family cycle"
3. **SOFT-LAUNCH-STRATEGY §15, Q15, Q16**: identifies FAM-06 opening audit as the immediate next unit
4. **Constitutional tenant isolation**: `org_id` isolation validation requires FAM-06 to be complete before any tenant-facing surface can be verified safe for real production users

No candidate option achieves the same convergence score. The Surat pilot involves real authenticated
supplier users receiving tenant access — auth architecture verification cannot be deferred.

---

## 11. Standalone Soft-Launch Prerequisite Queue

Items that may be implemented BEFORE FAM-06 opens, as standalone units, once Layer 0 releases:

| Item | Unit name | Rationale |
|---|---|---|
| (a) | `PUBLIC-LEGAL-PAGES-BUNDLE-001` | PRIT-034 standalone; privacy policy + terms of service required before any public outreach or data collection |
| (b) | `INQUIRY-NOTIFICATION-MINIMUM-SOFT-LAUNCH-001` | FTR-B2C-004 / FTR-SL-003 standalone; minimum notification loop for buyer inquiries; required before buyer-facing outreach |
| (c) | `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001` | FTR-SEO-001 / D-005 standalone; canonical domain strategy required before press, GSC, or backlink campaigns |
| (d) | `SOFT-LAUNCH-AGGREGATOR-DIRECTORY-READINESS-DESIGN-001` | FTR-SL-001 standalone; design unit for aggregator/directory promotion readiness; required before directory listings |
| (e) | `SUPPLIER-REAL-DATA-SEEDING-AND-PROFILE-READINESS-001` | BS-001 / HD-002 partial family gate; real Surat supplier data must be seeded and profiles verified; HD-001 prerequisite |

All 5 items are non-auth-gated (items a–d are fully standalone). Item (e) requires HD-001 but not FAM-06.
None of these items open a family cycle.

---

## 12. Immediate Next Unit

**After Layer 0 `HOLD_FOR_AUTHORIZATION` releases:**

`FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT-001`

This unit will:
- Audit all Fastify auth routes and middleware chain
- Audit frontend auth context and session state management
- Document reused-user edge case resolution (BOUNDED_DEFERRED_REMAINDER per Layer 0)
- Audit `org_id` scoping on all tenant-facing routes
- Audit noindex enforcement on tenant/private routes
- Produce family-local repo-truth note (FAM-06-REPO-TRUTH.md or equivalent)
- Produce gap register for FAM-06 scope

---

## 13. Items Deferred

| Item | Reason |
|---|---|
| Selecting second and third family cycles | Requires FAM-06 opening audit to complete; may reveal dependency order changes |
| PRIT-033 Stage 2 (full supplier inquiry inbox) family assignment | Requires FAM-06 auth architecture; parked as D-018 |
| CRM/CAE integration implementation | XDEP dependency only; FTR-SL-002 remains parked until CAE/CRM readiness confirmed |
| D-001 DPP launch authorization | Paresh decision deferred; LAUNCH_GATE_CLOSED maintained |
| Ranking candidate families below FAM-06 | Sufficient for this governance unit to select FAM-06; second-cycle selection deferred |

---

## 14. CRM/CAE Handling

The CRM (TexQtic CRM module) and CAE (TexQtic Commerce Automation Engine) are external dependency (XDEP) items only.

- No CRM/CAE automation is opened by this unit
- No CRM/CAE implementation is queued by this unit
- FTR-SL-002 (XDEP CAE+CRM integration strategy) remains in the FUTURE-TODO-REGISTER as PARKED
- Any CRM/CAE duplication risk: **NOT APPLICABLE** — this unit contains governance selection only

---

## 15. Layer 0 Status

| Layer 0 flag | Status | Impact on this unit |
|---|---|---|
| `HOLD_FOR_AUTHORIZATION` | ACTIVE | Does NOT block governance-only selection. Blocks ALL implementation, including family cycle opening. FAM-06 family cycle may NOT open until this releases. |
| `HOLD_FOR_COUNSEL_FEEDBACK` | ACTIVE | Applies to TTP/FAM-16 scope. Does not affect FAM-06 selection. |

---

## 16. TLRH Register Changes

| Register | Change |
|---|---|
| `governance/launch-readiness/README.md` | Added item 16 to §2 Read Order; added row to §3 Documents table |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | Appended selection note to FAM-06 §7 Action Register row; FAM-06 status and evidence level unchanged |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | Added §14 Register — Launch Family Cycle Opening Audit Units (FTR-FAM-001, FTR-FAM-002, FTR-FAM-003); added §11 Update History row |
| `governance/launch-readiness/DECISION-PARKING-LOT.md` | Added D-018 (PRIT-033 Stage 2 family assignment — PARKED); added §5 Update History row |
| `governance/launch-readiness/FIRST-FAMILY-CYCLE-SELECTION.md` | CREATED — primary selection document (16 sections) |

---

## 17. TECS Hub-Sync

### Q1: Does this unit change planning truth that other governance documents depend on?

**YES.** The selection of FAM-06 as the first full family cycle supersedes all prior "recommended" qualifiers
in LAUNCH-FAMILY-INDEX.md and SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md. Any governance unit that references
the first family cycle should be read with FIRST-FAMILY-CYCLE-SELECTION.md as the authority.

### Q2: What changed in planning truth?

- FAM-06 is now **formally selected** as the first full family cycle (not merely recommended)
- Immediate next unit (`FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT-001`) is formally identified
- Standalone soft-launch prerequisite queue (items a–e) is formally recorded
- D-018 is created and parked (PRIT-033 Stage 2 family assignment)
- FTR-FAM-001, FTR-FAM-002, FTR-FAM-003 are registered in FUTURE-TODO-REGISTER §14

### Q3: Which files were created or modified by this unit?

- **CREATED**: `governance/launch-readiness/FIRST-FAMILY-CYCLE-SELECTION.md`
- **CREATED**: `governance/units/TEXQTIC-FIRST-FAMILY-CYCLE-SELECTION-001.md`
- **MODIFIED**: `governance/launch-readiness/README.md`
- **MODIFIED**: `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md`
- **MODIFIED**: `governance/launch-readiness/FUTURE-TODO-REGISTER.md`
- **MODIFIED**: `governance/launch-readiness/DECISION-PARKING-LOT.md`

### Q4: Which governance documents are now the authoritative source for family cycle selection?

Primary: `governance/launch-readiness/FIRST-FAMILY-CYCLE-SELECTION.md`
Context: `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` (family registry, FAM-06 §7 action updated)
Context: `governance/launch-readiness/SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY.md` (soft-launch strategy, Decisions A–G)
Context: `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE-REGISTER.md` (PRIT sources for prerequisite queue)
Context: `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` (BS/HD sources for prerequisite queue)

### Q5: CRM/CAE duplication risk?

**NO.** This unit contains governance selection only. No automation or integration was opened.
FTR-SL-002 remains PARKED. No CRM/CAE implementation unit was created or queued.

### Q6: Were any planned items promoted to MVP without Paresh confirmation?

**NO.** All items in the standalone prerequisite queue (a–e) were already classified as P1/MVP_CRITICAL
or P1/LAUNCH_DEPENDENCY in prior governance documents (PRIT, FTR, BS, HD registers). No re-classification
was performed by this unit.

### Q7: Does this unit address the "next unit" pointer from a prior unit?

**YES.** `TEXQTIC-SOFT-LAUNCH-NETWORK-BUILDING-STRATEGY-001` §21 (Next Governance Action) identified
the immediate next unit as a first full family cycle selection unit. This unit fulfills that pointer.
The prior "recommended" language is superseded.

### Q8: Runtime safety gate (N/A for governance-only units)?

**N/A.** No runtime code was changed. No routes, components, schema, or migrations were touched.
`org_id` isolation is unaffected. RLS policies are unaffected.

### Q9: Are all modified/created files within the allowlist?

**YES.** All 6 files listed in §3 Allowlist (Modify) were the only files touched. Pre-existing unstaged
M files (`components/Public/PublicSupplierProfile.tsx`, `tests/frontend/public-referral-landing.test.tsx`)
were not staged or modified.

---

## 18. Validation Results

| Check | Result |
|---|---|
| `git diff --name-only` | Only allowlisted governance files (A + M); no runtime files |
| `git status --short` | Pre-existing unstaged M files remain unstaged; no unintended staged files |
| Preflight verified | PASS |

---

## 19. Commit Hash

**TBD** — backfill after primary commit lands.

Primary commit: `[TEXQTIC] governance: select first launch family cycle`

---

## 20. Completion Status

**VERIFIED_COMPLETE**

Selection: FAM-06 — Auth and Session Management
Governance truth updated: ✅ README, LAUNCH-FAMILY-INDEX, FUTURE-TODO-REGISTER, DECISION-PARKING-LOT, FIRST-FAMILY-CYCLE-SELECTION
Unit artifact: ✅ this file
Runtime changes: NONE — governance only
Family cycle opened: NO — Layer 0 HOLD_FOR_AUTHORIZATION in effect
