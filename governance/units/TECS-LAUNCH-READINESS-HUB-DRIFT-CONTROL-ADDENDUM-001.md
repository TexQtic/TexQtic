# TECS-LAUNCH-READINESS-HUB-DRIFT-CONTROL-ADDENDUM-001

**Unit ID:** TECS-LAUNCH-READINESS-HUB-DRIFT-CONTROL-ADDENDUM-001  
**Title:** TexQtic TECS OS Addendum — Launch Readiness Hub Drift-Control System  
**Status:** COMPLETE  
**Type:** TECS_OS_ADDENDUM — Governance-only  
**Date:** 2026-05-19  
**Authorized by:** Paresh  
**Layer 0 posture at authoring:** `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK`  
**Git HEAD at authoring:** `6766fbd` (incremental truth strategy committed)  
**Extends:** `TECS.md` v1.6 — adds §8 (Launch Readiness Hub Drift-Control)  
**Governed by:** This unit and its pointer in `TECS.md` §8  
**Pre-existing modified runtime files (do not stage):**  
- `components/Public/PublicSupplierProfile.tsx` — unstaged M (pre-existing)  
- `tests/frontend/public-referral-landing.test.tsx` — unstaged M (pre-existing)

---

## 0. Critical Operating Constraint

**This document is a TECS OS addendum only. It does NOT:**

- Open any implementation unit
- Populate any hub skeleton document
- Create the family index
- Create the planned requirements intake
- Execute any repo audit
- Authorize any code, schema, migration, route, service, event, or OpenAPI change
- Override the `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK` Layer 0 posture

**It DOES:**

- Add a mandatory drift-control system to the TECS OS for the `governance/launch-readiness/` hub
- Define mandatory evidence fields for all status-bearing hub rows
- Define evidence-level rules that govern when a hub row may change readiness status
- Integrate hub-sync checks into the TECS lifecycle at Opening, Design, Implementation, and Verify-close
- Define the mandatory verify-close hub-sync checklist that all future TECS units must answer
- Define family-cycle, planned requirements, CRM/CAE, and public SEO maintenance rules
- Define drift detection triggers and drift response protocol
- Establish the no-duplication rule and stale-row handling procedure

---

## 1. Unit Summary

### 1.1 Context

The TexQtic Launch Readiness Planning Hub (`governance/launch-readiness/`) was created at commit
`fab5bdc` and its population strategy was refined at commits `8ea1675` and `6766fbd`.

As of this addendum, the hub contains ten skeleton documents:

| File | Current state |
|---|---|
| `README.md` | SKELETON — populated with index, taxonomy, authority boundary |
| `MVP-LAUNCH-READINESS-ROADMAP.md` | SKELETON — PENDING POPULATION |
| `MVP-MUST-HAVES-CHECKLIST.md` | SKELETON — PENDING POPULATION |
| `FUTURE-TODO-REGISTER.md` | SKELETON — partial entries (FTR-SEO-001–004) |
| `BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | SKELETON — PENDING POPULATION |
| `POST-MVP-ROADMAP.md` | SKELETON — PENDING POPULATION |
| `PILOT-READINESS-SURAT.md` | SKELETON — PENDING POPULATION |
| `TEAM-FUNDING-READINESS.md` | SKELETON — PENDING POPULATION |
| `PUBLIC-PAGES-SEO-EXPANSION-REGISTER.md` | SKELETON — PENDING POPULATION |
| `DECISION-PARKING-LOT.md` | SKELETON — partial entries (D-001) |

Hub documents will be populated incrementally per the incremental truth strategy
(`TEXQTIC-LAUNCH-READINESS-INCREMENTAL-TRUTH-STRATEGY-001`). As rows are added and statuses
are updated across many future TECS units, there is a real and growing risk that hub rows
will diverge from actual repo truth — either lagging behind verified implementation, or
leading ahead of it with unverified claims.

### 1.2 Problem: Drift Without a Control System

Without a drift-control system:

| Risk | How it manifests |
|---|---|
| **Optimistic drift** | A hub row is marked `VERIFIED_COMPLETE` or `PRODUCTION_VERIFIED` before the evidence unit closes |
| **Stale-claim drift** | A row that was once correct becomes incorrect after repo truth changes (feature added, flag changed, blocker resolved/added) |
| **Contamination drift** | CRM or CAE details that should stay in their own repos are inlined into the main hub, then become inconsistent |
| **Intake drift** | A planned requirement not yet in any repo is promoted directly to `MVP_CRITICAL` or `LAUNCH_BLOCKER` without Paresh confirmation |
| **Orphan drift** | A hub row references a TECS unit that was subsequently superseded or revised, with no pointer update |
| **Evidence gap drift** | A row claims a status that has no traceable evidence unit — it just "appeared" in a planning update |

### 1.3 Solution: Mandatory Drift-Control System

This addendum defines a mandatory drift-control system for the hub. The system:

1. Defines mandatory evidence fields every status-bearing row must carry
2. Defines evidence-level rules governing when a row may change readiness status
3. Embeds hub-sync checks into the TECS lifecycle at four stages
4. Defines a mandatory verify-close hub-sync checklist
5. Defines per-domain maintenance rules (family, planned requirements, CRM/CAE, SEO)
6. Defines drift detection triggers and drift response protocol
7. Defines stale-row handling

This system is backward-compatible with the existing TECS v1.6 lifecycle. It does not replace
or override any existing TECS rule. It adds hub-sync governance on top of the existing lifecycle.

---

## 2. Authority Model

The TexQtic governance stack has four layers. Each has a defined role in relation to hub truth.
No layer may claim authority it does not hold.

| Layer | File(s) | Role in hub truth |
|---|---|---|
| **Layer 0 — Sequencing authority** | `governance/control/OPEN-SET.md`, `NEXT-ACTION.md`, `BLOCKED.md` | Source of truth for: active delivery unit, live blockers/holds, feature flag posture. Hub reads from Layer 0 — it never writes to it. |
| **TECS OS — Execution authority** | `TECS.md` | Source of truth for: lifecycle steps, static gates, runtime validation, commit discipline. This addendum extends TECS §8. |
| **Repo + unit evidence — Fact authority** | Committed repo files, TECS unit governance docs, Layer 0 BLOCKED entries | Source of truth for: what is actually implemented, tested, and verified. Hub claims must be traceable to this layer. |
| **Hub — Planning and tracking layer** | `governance/launch-readiness/` | Planning and tracking instrument. Not an authority for repo truth. Hub rows must reflect fact authority — they must not invent it. |

> **Golden rule: Repo truth and verified unit evidence win over hub claims, always.**
> If a hub row says `VERIFIED_COMPLETE` but no verify-close unit or production evidence supports
> it, the hub row is wrong and must be corrected.

---

## 3. Why Drift Control Is Needed

### 3.1 Hub Documents Will Be Touched by Many Future Units

The hub will receive updates from:
- Family implementation cycle units (Steps 3, 5, 8 of the §6 cycle in INCREMENTAL-TRUTH-STRATEGY-001)
- Verify-close governance units for any feature in scope
- The planned requirements intake unit
- The family index unit
- CRM and CAE audit units (via XDEP registration in the main repo)
- Paresh planning updates (direct edits)

Each touch point is a potential source of drift if not governed by evidence requirements.

### 3.2 TECS v1.6 Does Not Currently Address the Hub

TECS v1.6 §1.1 step 7 requires "Governance updates (gap-register, wave board, execution log)"
after validation, before close. The launch-readiness hub is a newer construct not covered by
this existing rule. Without an explicit extension, future TECS units will close without
checking hub impact.

### 3.3 The Hub Must Earn Its Claims

A hub row that claims `PRODUCTION_VERIFIED` is more than a planning note — it will be used by
Paresh to make launch decisions. That claim must be backed by objective evidence. The same
standard applies to `LAUNCH_BLOCKER`, `MVP_CRITICAL`, and any readiness status that would
gate or authorize work.

---

## 4. Hub Document Maintenance Scope

The following ten documents in `governance/launch-readiness/` are in scope for the
drift-control system. Each has a maintenance classification.

| File | Maintenance class | Drift risk | Who may update |
|---|---|---|---|
| `README.md` | STRUCTURAL — hub index and authority boundary | LOW — taxonomies and rules change rarely | Paresh or allowlisted governance unit |
| `MVP-LAUNCH-READINESS-ROADMAP.md` | STATUS_BEARING — family-level readiness matrix | HIGH — updated per family cycle | Allowlisted family-cycle or verify-close unit |
| `MVP-MUST-HAVES-CHECKLIST.md` | STATUS_BEARING — binary launch gates | HIGH — each gate checked as family verifies | Allowlisted verify-close unit only |
| `FUTURE-TODO-REGISTER.md` | REGISTRY — deferred items | MEDIUM — items added from family cycles | Allowlisted family-cycle, verify-close, or governance unit |
| `BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | REGISTRY — risks and blind spots | MEDIUM — resolved when blockers close | Allowlisted family-cycle or verify-close unit |
| `POST-MVP-ROADMAP.md` | PLANNING — future phases | LOW — updated rarely; no launch gate | Paresh or allowlisted governance unit |
| `PILOT-READINESS-SURAT.md` | STATUS_BEARING — Surat pilot readiness | MEDIUM — updated as pilot prep progresses | Paresh or allowlisted family-cycle unit |
| `TEAM-FUNDING-READINESS.md` | PLANNING — non-technical readiness | LOW — non-technical; no repo truth claims | Paresh directly |
| `PUBLIC-PAGES-SEO-EXPANSION-REGISTER.md` | REGISTRY — future public pages | MEDIUM — added as page routes are scoped | Allowlisted SEO or implementation unit |
| `DECISION-PARKING-LOT.md` | REGISTRY — parked decisions | LOW — items added/resolved as decisions land | Paresh or allowlisted governance unit |

**Maintenance class definitions:**

- `STATUS_BEARING` — the document contains rows with readiness status claims that must be
  traceable to evidence. These documents are the highest-priority targets for drift control.
- `REGISTRY` — the document is an append-only or update-controlled register. Items may be
  added freely; status changes require evidence.
- `STRUCTURAL` — the document defines hub structure, not status claims. Lower drift risk.
- `PLANNING` — the document contains planning content, not repo-truth claims. May be
  updated by Paresh directly.

---

## 5. Mandatory Evidence Fields for Every Status-Bearing Hub Row

Every row in a `STATUS_BEARING` hub document that makes a readiness or status claim MUST
carry the following mandatory evidence fields. Rows without these fields are `GOVERNANCE_CLAIM_ONLY`
and must be treated as unverified.

| Field | Description | Allowed values |
|---|---|---|
| `status` | Current readiness status | From hub README §8 taxonomy |
| `readiness` | Implementation readiness | `PRODUCTION_VERIFIED` / `TEST_CONFIRMED` / `REPO_IMPLEMENTED` / `LOCAL_DEV_ONLY` / `GOVERNANCE_ONLY` / `PLANNED_NOT_IN_REPO` / `GOVERNANCE_CLAIM_ONLY` |
| `priority` | Launch priority | From hub README §9 taxonomy (`P0`–`P4`) |
| `evidence_level` | Strongest available evidence | See §6 below |
| `evidence_source` | Where the evidence was produced | Unit ID (e.g., `TEXQTIC-NC-PHASE1-POOL-DISCOVERY-PROD-VERIFY-GOV-CLOSE-001`) or `REPO_INSPECTION:<path>` |
| `last_verified_by_unit` | Which TECS unit last confirmed this row | Unit ID or `PARESH_DIRECT` |
| `last_verified_date` | Date of last verification | ISO date (YYYY-MM-DD) |
| `next_review_trigger` | What event should prompt re-inspection | Free text — e.g., "Layer 0 releases feature flag QD-6" or "CRM provisioning webhook unblocked" |

**Minimum required fields for a status claim to be valid:**
- `status` + `readiness` + `evidence_level` + `evidence_source` + `last_verified_by_unit`

If any of these five fields is absent for a `STATUS_BEARING` row, the row is treated as
`GOVERNANCE_CLAIM_ONLY` regardless of what its `status` field says.

---

## 6. Evidence-Level Rules

### 6.1 Evidence Levels

Evidence levels are ordered from strongest to weakest:

| Level | Code | Description |
|---|---|---|
| 1 (strongest) | `PRODUCTION_CONFIRMED` | Production smoke or prod data evidence from a verify-close unit |
| 2 | `TEST_CONFIRMED` | Automated test suite passing against real DB or in CI |
| 3 | `REPO_CONFIRMED` | Route, service, schema, or component artifact confirmed in committed code by a repo inspection |
| 4 | `GOVERNANCE_CLAIM_ONLY` | Claimed in a governance doc or planning doc; no repo inspection performed |
| 5 (weakest) | `USER_PLANNED_ONLY` | Communicated by Paresh; not yet in any repo artifact or governance doc |

### 6.2 Binding Rules

These rules are non-negotiable. They cannot be overridden by a planning update alone.

| Hub status claim | Minimum required evidence | Rule |
|---|---|---|
| `PRODUCTION_VERIFIED` | `PRODUCTION_CONFIRMED` | Production verify-close unit must be cited. No exceptions. |
| `VERIFIED_COMPLETE` | `TEST_CONFIRMED` or `PRODUCTION_CONFIRMED` | A TECS verify-close unit or production smoke run must be cited. |
| `REPO_IMPLEMENTED` | `REPO_CONFIRMED` | A repo inspection note or unit must be cited. |
| `LOCAL_VALIDATION_PASS` | `TEST_CONFIRMED` | Passing test run output must be cited. |
| `GOVERNANCE_ONLY` | `GOVERNANCE_CLAIM_ONLY` | Acceptable for planning notes; must not imply implementation. |
| `PLANNED_NOT_IN_REPO` | `USER_PLANNED_ONLY` or `GOVERNANCE_CLAIM_ONLY` | Acceptable for intake rows; must not be elevated without Paresh confirmation. |
| Any `LAUNCH_BLOCKER` or `MVP_CRITICAL` designation | `REPO_CONFIRMED` minimum + Paresh confirmation | Cannot be assigned on the basis of `USER_PLANNED_ONLY` alone. |
| Any row claiming `POST_MVP` deferral | `PARESH_CONFIRMED_DEFERRAL` | Cannot be deferred by a governance agent alone. Paresh must confirm. |

### 6.3 Cross-Evidence Rule

A hub row whose evidence is `GOVERNANCE_CLAIM_ONLY` or `USER_PLANNED_ONLY` must be explicitly
labelled as such. These rows must NOT be surfaced as `LAUNCH_BLOCKER` or `MVP_CRITICAL` in
planning outputs, summaries, or reports without the `PARESH_CONFIRMED` tag.

### 6.4 CRM/CAE Evidence Rule

Evidence for CRM or CAE features CANNOT be drawn from main repo inspections. It must come from:
- A cited CRM audit unit (running in `TexQtic-CRM`)
- A cited CAE audit unit (running in `TEXQTIC-CUSTOMER-ACQUISITION-ENGINE`)
- Or a direct Paresh confirmation of the CRM/CAE state

Main repo hub rows that describe CRM or CAE status must carry `evidence_source: XDEP_ONLY`
and `evidence_level: GOVERNANCE_CLAIM_ONLY` unless a CRM/CAE audit unit is cited.

---

## 7. TECS Lifecycle Integration

This section defines the mandatory hub-sync touchpoints in the TECS lifecycle. These apply
to every future TECS unit that is allowlisted to modify any file in this repo.

### 7.1 Opening Prompt — Hub Impact Assessment

Every TECS unit opening prompt MUST include the following question:

> **Hub Impact Assessment:** Can this unit change the readiness, implementation status, blockers,
> or planned requirements recorded in `governance/launch-readiness/`?
>
> If YES: list which hub documents may be affected and confirm they are in the allowlist.  
> If NO: record `NO_HUB_IMPACT_EXPECTED` and confirm in the verify-close checklist.

If hub documents are expected to change, they must appear in the allowlist explicitly.
Hub documents must not be updated as a side effect of a unit whose allowlist does not list them.

### 7.2 Design Prompt — Hub Impact Recording

When a TECS unit produces a design artifact, the design must explicitly state:

> **Expected hub impact:**
> - Which family row(s) in `MVP-LAUNCH-READINESS-ROADMAP.md` will change on verify-close?
> - Which binary gate(s) in `MVP-MUST-HAVES-CHECKLIST.md` will be checkable on verify-close?
> - Which future-todo or blind-spot items will be resolved or added?
> - What evidence level will the implementation produce?

If the design expects no hub changes, record `NO_HUB_IMPACT_EXPECTED` in the design doc.

### 7.3 Implementation Prompt — Hub Update Allowlist Enforcement

During implementation, hub updates must be restricted to:
- Only the hub files explicitly allowlisted in the implementation prompt
- Only status changes that are supportable by evidence available at implementation time
- No optimistic status advances (e.g., do not mark a row `PRODUCTION_VERIFIED` during
  implementation — that requires the verify-close step)

If an implementation-time hub update would require `PRODUCTION_CONFIRMED` evidence that is
not yet available, defer the update to the verify-close prompt.

### 7.4 Verify-Close Prompt — Mandatory Hub-Sync Checklist

Every TECS verify-close prompt MUST answer the mandatory hub-sync checklist defined in §8 below.

The verify-close prompt must NOT be considered complete until the hub-sync checklist is answered.
If hub updates are needed and the hub files are not in the allowlist, the verify-close report
must explicitly flag the required updates as pending for a follow-on allowlisted prompt.

---

## 8. Mandatory Verify-Close Hub-Sync Checklist

The following checklist must be answered in every TECS verify-close governance artifact.
Each item must have a documented answer — not just a checkbox.

```
### Hub-Sync Checklist (TECS-LAUNCH-READINESS-HUB-DRIFT-CONTROL-ADDENDUM-001)

Q1. Did this unit change launch readiness truth?
    Answer: YES / NO / PARTIAL
    (If NO or PARTIAL: explain what was not changed and why)

Q2. Which family or requirement changed?
    Answer: [Family ID(s) / requirement name(s) / NONE]

Q3. Which hub documents need to be updated as a result of this unit?
    Answer: [File list, or NONE]

Q4. What evidence supports the update?
    Evidence level: [PRODUCTION_CONFIRMED / TEST_CONFIRMED / REPO_CONFIRMED / GOVERNANCE_CLAIM_ONLY / USER_PLANNED_ONLY]
    Evidence source: [Unit ID / commit hash / prod smoke output reference]

Q5. Are CRM or CAE details at risk of being duplicated into the main repo hub?
    Answer: YES (explain what was/was not inlined) / NO

Q6. Are any planned items at risk of being incorrectly promoted to MVP status without Paresh confirmation?
    Answer: YES (explain and block the promotion) / NO

Q7. Are any stale hub rows now superseded by this unit's findings?
    Answer: YES (list rows and their required update) / NO

Q8. If no hub update is needed, record: NO_HUB_UPDATE_REQUIRED
    Reason: [brief explanation]

Q9. Were hub files allowlisted in this unit's allowlist?
    Answer: YES — list files / NO — list required updates as pending for next allowlisted prompt
```

**If Q3 lists hub files that are NOT in the unit's allowlist:** record them as pending required
updates in the final report. They must be addressed in the next available governance unit.
They must NOT be silently left as known drift.

---

## 9. Family-Cycle Hub Maintenance Rule

### 9.1 When Hub Rows May Change During Family Cycles

Hub rows for a given family may only change readiness status:

1. **At Step 3 of the family-cycle** (Record Current State): row status may advance from
   `NOT_ASSESSED` to `GOVERNANCE_CLAIM_ONLY` or `REPO_IMPLEMENTED` based on repo inspection.
2. **At Step 5 of the family-cycle** (Classify MVP vs. Post-MVP): row priority and MVP cutline
   classification may be set, pending Paresh confirmation.
3. **At Step 8 of the family-cycle** (Verify and Update Hub): row status may advance to
   `TEST_CONFIRMED`, `LOCAL_VALIDATION_PASS`, or `PRODUCTION_VERIFIED` based on verification evidence.

### 9.2 Prohibited Family-Cycle Hub Changes

The following hub changes are prohibited during family cycles:

| Prohibited action | Why prohibited |
|---|---|
| Marking a row `PRODUCTION_VERIFIED` before Step 8 evidence | Optimistic claim; no production evidence yet |
| Marking a row `LAUNCH_BLOCKER` based on inference alone | Requires Paresh confirmation or Layer 0 escalation |
| Removing a row from the hub entirely | Rows are never deleted without explicit Paresh instruction |
| Changing another family's rows without opening that family's cycle | Each family owns its own rows |

### 9.3 No Global Population Pass

No single TECS unit may populate all hub rows in a single pass unless that unit is explicitly
scoped as a comprehensive hub population unit and is allowlisted for all hub files. Such a unit
is not on the current roadmap. Hub population proceeds family by family.

---

## 10. Planned Requirements Hub Maintenance Rule

### 10.1 Planned Items Enter Intake First

All requirements Paresh has communicated that are not yet in any repo must be recorded through
the `TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-001` process before they appear in any hub document
as a readiness row.

A planned requirement that appears in a hub row without passing through intake is a governance
violation. It must be flagged in the next verify-close checklist (Q6) and corrected.

### 10.2 Planned Items Are Unconfirmed Until Paresh Confirms

A hub row sourced from `USER_PLANNED_ONLY` carries:
- `readiness: PLANNED_NOT_IN_REPO`
- `evidence_level: USER_PLANNED_ONLY`
- Status `UNCONFIRMED` until Paresh confirms in the intake unit

An unconfirmed planned item:
- MAY appear in hub documents as `PLANNED_NOT_IN_REPO`
- MUST NOT be designated `LAUNCH_BLOCKER`, `MVP_CRITICAL`, or `P0`/`P1`
- MUST NOT be implemented in any TECS unit

### 10.3 Implementation Gate for Planned Items

A planned item may only become implementation-ready after:
1. Passing through `TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-001` and marked `CONFIRMED`
2. Being classified via family-cycle Step 5 (Classify MVP vs. Post-MVP)
3. Being included in a bounded design artifact (family-cycle Step 6)
4. Being opened under Layer 0 authorization (family-cycle Step 7)

---

## 11. CRM/CAE Hub Maintenance Rule

### 11.1 Main Repo Hub Records Only XDEP Status for CRM/CAE

The main platform hub (`governance/launch-readiness/`) records CRM and CAE information only
in the form of cross-repo dependency (XDEP) entries. See §11 of
`TEXQTIC-LAUNCH-READINESS-INCREMENTAL-TRUTH-STRATEGY-001` for the XDEP format.

A hub row that describes CRM or CAE feature implementation state is a governance violation
unless it is:
- Explicitly tagged as `evidence_source: XDEP_ONLY`
- Carrying `evidence_level: GOVERNANCE_CLAIM_ONLY`
- Citing a CRM or CAE audit unit ID as the authoritative source

### 11.2 CRM Readiness Truth Location

CRM readiness truth lives in `TexQtic-CRM/governance/`. The main repo references CRM audit
outcomes by unit ID only. When a CRM audit unit closes, the main repo hub is updated with:
- The CRM audit unit ID as `evidence_source`
- The XDEP status (IMPLEMENTED / PLANNED / BLOCKED / NOT_STARTED)
- NO inlining of CRM route, schema, or UI implementation details

### 11.3 CAE Readiness Truth Location

CAE readiness truth lives in `TEXQTIC-CUSTOMER-ACQUISITION-ENGINE/governance/`. Same principle
as CRM: reference by unit ID; record XDEP status only; no inlining of CAE implementation details.

### 11.4 Contamination Detection

In every verify-close checklist (§8 Q5), explicitly answer whether CRM or CAE details were
inlined into any hub document during the unit. If yes: identify the exact rows and correct them
by removing inline details and replacing with XDEP references.

---

## 12. Public SEO/Page Hub Maintenance Rule

### 12.1 SEO Expansion Register Rule

The `PUBLIC-PAGES-SEO-EXPANSION-REGISTER.md` tracks future public pages and their SEO gate.
A new page entry may be added to this register when:

1. A public page route is being scoped or designed in a TECS unit
2. The route's `/path` is confirmed or proposed (even if not yet implemented)
3. The SEO gate (sitemap inclusion, `robots.txt`, JSON-LD type) is either:
   - Confirmed from a TECS unit that implemented the page
   - Explicitly marked `SEO_DECISION_PENDING` if not yet decided

### 12.2 SEO Decision Rules

SEO decisions (canonical URL, sitemap inclusion, JSON-LD schema type, `robots.txt` directive)
MUST NOT be guessed in a hub row. Each decision must be:
- Supported by a TECS SEO implementation unit (e.g., `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001`)
- Or explicitly marked `SEO_DECISION_PENDING` awaiting Paresh confirmation
- Or drawn from a committed implementation artifact (canonical tag in HTML, sitemap XML)

Evidence level `GOVERNANCE_CLAIM_ONLY` is acceptable for SEO rows pending implementation.
Evidence level `REPO_CONFIRMED` is required before a sitemap entry is treated as final.

### 12.3 No Proactive Sitemap Claims

Hub rows must not claim a URL is indexed, canonicalized, or included in a sitemap unless
that is confirmed by a production verification unit or a committed sitemap artifact.

---

## 13. Drift Detection Triggers

The following events must trigger a review of relevant hub rows for potential drift.
Whenever one of these triggers fires, the active or next TECS unit must include a hub-sync
assessment in its opening checklist.

| Trigger | Which hub documents to check |
|---|---|
| A TECS verify-close unit closes | `MVP-LAUNCH-READINESS-ROADMAP.md`, `MVP-MUST-HAVES-CHECKLIST.md` — check family rows covered by the unit |
| A family implementation cycle completes a step | `MVP-LAUNCH-READINESS-ROADMAP.md` — update the family's row if step evidence warrants it |
| A blocker in `BLOCKED.md` changes status (resolves, escalates, or is added) | `BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md`, `MVP-LAUNCH-READINESS-ROADMAP.md` — check any rows referencing the blocker |
| A feature flag changes state | `MVP-LAUNCH-READINESS-ROADMAP.md` — check rows gated on that flag |
| A production verification passes or fails | `MVP-LAUNCH-READINESS-ROADMAP.md`, `MVP-MUST-HAVES-CHECKLIST.md` — update readiness status |
| A CRM or CAE integration status changes | `BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` — update XDEP status |
| Paresh confirms a planned requirement | `MVP-LAUNCH-READINESS-ROADMAP.md` — update from `PLANNED_NOT_IN_REPO` to family-classified row |
| Paresh withdraws a planned requirement | `MVP-LAUNCH-READINESS-ROADMAP.md` — mark row `WITHDRAWN` or `DEFERRED_TO_POST_MVP` |
| A new risk or blind spot is identified | `BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` — add entry |
| A decision is parked | `DECISION-PARKING-LOT.md` — add entry |
| A decision is resolved | `DECISION-PARKING-LOT.md` — mark resolved; update affected roadmap rows |
| A new public page route is scoped | `PUBLIC-PAGES-SEO-EXPANSION-REGISTER.md` — add entry |
| A public page is verified in production | `PUBLIC-PAGES-SEO-EXPANSION-REGISTER.md` — update row with production evidence |

---

## 14. Drift Response Protocol

When drift is detected (a hub row is inconsistent with current repo truth or unit evidence):

### 14.1 If Hub Files Are Allowlisted in the Active Unit

1. Correct the drift in the same unit
2. Record the correction in the verify-close report under Q7
3. Cite the evidence that supports the corrected status

### 14.2 If Hub Files Are NOT Allowlisted in the Active Unit

1. Do NOT silently leave known drift in place
2. Record the known drift in the verify-close report under Q3 and Q7
3. Mark the drift as `PENDING_HUB_UPDATE: <file>: <row>: <required change> — awaiting allowlisted prompt`
4. The next governance unit that allowlists the affected hub file MUST resolve the pending update
   before adding new content

### 14.3 No Silent Drift

Silently leaving a hub row in a known-incorrect state is a governance violation. The response
is always one of:
- Correct it now (if allowlisted)
- Record it as pending (if not allowlisted)

There is no third option.

### 14.4 Drift Severity Classification

| Severity | Condition | Required action |
|---|---|---|
| `CRITICAL` | A row claims `PRODUCTION_VERIFIED` or `LAUNCH_BLOCKER` without supporting evidence | Must be corrected before the unit closes, regardless of allowlist |
| `HIGH` | A row claims `MVP_CRITICAL` or `LAUNCH_DEPENDENCY` without `REPO_CONFIRMED` evidence | Must be recorded as pending; must be resolved in the next allowlisted governance unit |
| `MEDIUM` | A row has an outdated `last_verified_date` but its status appears correct | Record as pending review; priority is lower |
| `LOW` | A row is missing a `next_review_trigger` | Add on next allowlisted touch; non-blocking |

---

## 15. No-Duplication Rule

### 15.1 Hub Rows Reference — They Do Not Copy

Hub rows must reference authoritative sources rather than duplicating them:

| Instead of copying... | Reference by... |
|---|---|
| A Layer 0 BLOCKED entry | Cite `governance/control/BLOCKED.md: <item>` |
| A TECS verify-close unit's findings | Cite the unit ID as `evidence_source` |
| A CRM or CAE audit result | Cite the CRM/CAE audit unit ID + XDEP status |
| A family tracker's detailed implementation status | Cite the tracker file path |
| A governance unit's design decisions | Cite the unit ID |

### 15.2 Duplication Detection

If a hub row contains text that is also present verbatim in another governance file, that
is evidence of duplication. The hub row should be reduced to a reference plus a brief summary.

---

## 16. Stale-Row Handling

### 16.1 A Row Is Stale When

A hub row is stale when:
- Its status no longer reflects current repo truth
- The TECS unit it cites as `evidence_source` was subsequently superseded
- The feature flag it describes has changed state
- The blocker it records has been resolved or escalated

### 16.2 Stale-Row Response

When a stale row is detected:

| Action | When to use |
|---|---|
| Update with current status and new evidence | When the current state is known and evidenced |
| Mark `NEEDS_REPO_INSPECTION` | When the current state is not known without a fresh repo inspection |
| Mark `SUPERSEDED: see <unit ID>` | When the superseding unit or design is known |
| Mark `DEFERRED: <reason>` | When the item was deliberately deferred (never mark deferred without Paresh confirmation) |

### 16.3 No Deletion Without Instruction

Hub rows must NEVER be deleted without an explicit instruction from Paresh. Historical rows
provide a deferred-items record and a planning lineage. Mark them as `SUPERSEDED`, `DEFERRED`,
or `WITHDRAWN` rather than deleting them.

---

## 17. Pre-Existing Modified Files Rule

This rule applies to every TECS governance unit, including governance-only units.

> **Never stage files that are not in the unit's explicit allowlist.**

At the time of this addendum authoring, the following files are pre-existing modified (unstaged)
in the main TexQtic repo:

- `components/Public/PublicSupplierProfile.tsx` — unstaged M (pre-existing)
- `tests/frontend/public-referral-landing.test.tsx` — unstaged M (pre-existing)

These files MUST NOT be staged in any governance unit that is not specifically allowlisted to
modify them. Any git staging operation that accidentally captures these files MUST be corrected
before commit by running `git reset HEAD <file>`.

The verify-close hub-sync checklist (§8 Q9) confirms that only allowlisted files were staged.

---

## 18. TECS Lifecycle Summary Reference Card

| TECS lifecycle stage | Mandatory hub-sync action |
|---|---|
| **Opening prompt** | Answer Hub Impact Assessment: `YES (list files)` or `NO_HUB_IMPACT_EXPECTED` |
| **Design prompt** | Record expected hub impact: which rows change, what evidence level will result |
| **Implementation** | Restrict hub updates to allowlisted files; no optimistic status advances |
| **Verify-close** | Answer all 9 items of the verify-close hub-sync checklist (§8) |

| Evidence level | Minimum required for... |
|---|---|
| `PRODUCTION_CONFIRMED` | `PRODUCTION_VERIFIED` status |
| `TEST_CONFIRMED` | `VERIFIED_COMPLETE` / `LOCAL_VALIDATION_PASS` status |
| `REPO_CONFIRMED` | `REPO_IMPLEMENTED` status; required minimum for `LAUNCH_BLOCKER` / `MVP_CRITICAL` |
| `GOVERNANCE_CLAIM_ONLY` | Acceptable for planning rows; not sufficient for any launch-gate claim |
| `USER_PLANNED_ONLY` | Intake rows only; never sufficient for any readiness claim |

| Drift severity | Required action |
|---|---|
| `CRITICAL` | Correct before unit closes, regardless of allowlist |
| `HIGH` | Record as pending; resolve in next allowlisted governance unit |
| `MEDIUM` | Record as pending review |
| `LOW` | Add on next allowlisted touch |

---

## 19. Completion Checklist

This addendum unit is complete when ALL of the following are true:

- [x] Inspected: `TECS.md` (v1.6) — confirmed no existing launch-readiness hub sync rules
- [x] Inspected: `governance/control/NEXT-ACTION.md` — Layer 0 posture confirmed
- [x] Inspected: `governance/control/OPEN-SET.md` — control-plane read order confirmed
- [x] Inspected: `governance/control/BLOCKED.md` — live blockers and holds confirmed
- [x] Inspected: `governance/launch-readiness/README.md` — hub update rules confirmed weak
- [x] Inspected: `governance/units/TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-STRATEGY-001.md` — taxonomies confirmed in force
- [x] Inspected: `governance/units/TEXQTIC-LAUNCH-READINESS-INCREMENTAL-TRUTH-STRATEGY-001.md` — execution process confirmed
- [x] Inspected: representative verify-close artifacts — TECS pattern confirmed (no hub-sync step)
- [x] 10 inspection questions answered before writing (§0 above)
- [x] Authority model defined (§2)
- [x] Hub document maintenance scope defined (§4)
- [x] Mandatory evidence fields defined (§5)
- [x] Evidence-level rules defined (§6)
- [x] TECS lifecycle integration defined (§7)
- [x] Mandatory verify-close hub-sync checklist defined (§8)
- [x] Family-cycle maintenance rule defined (§9)
- [x] Planned requirements maintenance rule defined (§10)
- [x] CRM/CAE maintenance rule defined (§11)
- [x] Public SEO/page maintenance rule defined (§12)
- [x] Drift detection triggers defined (§13)
- [x] Drift response protocol defined (§14)
- [x] No-duplication rule defined (§15)
- [x] Stale-row handling defined (§16)
- [x] Pre-existing modified files rule defined (§17)
- [x] TECS.md amended with §8 pointer to this addendum
- [x] Hub README amended with Drift-Control Maintenance section
- [x] TEXQTIC-LAUNCH-READINESS-INCREMENTAL-TRUTH-STRATEGY-001.md amended with drift-control reference
- [x] Git preflight passed: no unexpected staged or modified files
- [x] Only allowlisted governance files staged
- [x] Pre-existing M files confirmed NOT staged
- [x] Commit made with correct message format

---

*Addendum authored: 2026-05-19 — TexQtic governance corpus, `governance/units/`, main branch.*
*Extends TECS.md v1.6 §8. Authority: Paresh Patel, TexQtic founder.*
