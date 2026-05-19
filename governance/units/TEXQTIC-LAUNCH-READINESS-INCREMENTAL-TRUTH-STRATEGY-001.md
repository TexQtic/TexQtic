# TEXQTIC-LAUNCH-READINESS-INCREMENTAL-TRUTH-STRATEGY-001

**Unit ID:** TEXQTIC-LAUNCH-READINESS-INCREMENTAL-TRUTH-STRATEGY-001  
**Title:** TexQtic Platform — Incremental Family-by-Family Launch Readiness Truth Strategy  
**Status:** COMPLETE  
**Type:** GOVERNANCE_STRATEGY — Docs-only  
**Date:** 2026-05-19  
**Authorized by:** Paresh  
**Layer 0 posture at authoring:** `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK`  
**Git HEAD at authoring:** `8ea1675` (technical audit strategy committed)  
**Supersedes (partially):** §22–§25 of `TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-STRATEGY-001`  
**Pre-existing modified runtime files (do not stage):**  
- `components/Public/PublicSupplierProfile.tsx` — unstaged M (pre-existing)  
- `tests/frontend/public-referral-landing.test.tsx` — unstaged M (pre-existing)

---

## 0. Critical Operating Constraint

**This document is a STRATEGY REFINEMENT artifact only. It does NOT:**

- Open any implementation unit
- Populate any hub skeleton document
- Execute any audit of any repo
- Authorize any code, schema, migration, route, service, event, or OpenAPI change
- Override the `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK` Layer 0 posture

**It DOES:**

- Refine the approach defined in `TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-STRATEGY-001`
- Replace the big-bang audit/population model with an incremental, family-by-family process
- Define firm rules for CRM and CAE repo separation
- Define the planned requirements intake process
- Define what the main platform repo records about cross-repo systems
- Define the revised unit sequence that follows from this strategy
- Set the governance expectations for the next two units:
  `TEXQTIC-LAUNCH-FAMILY-INDEX-001` and `TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-001`

**All taxonomies, classification codes, readiness codes, priority codes, evidence levels,
and family definitions from `TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-STRATEGY-001` remain
in force. This document refines the process, not the taxonomy.**

---

## 1. Purpose and Authoritative Prior Context

### 1.1 Prior Strategy Artifacts

This unit refines the approach established by the following governance artifacts, all committed
to the main branch:

| Artifact | Commit | Status |
|---|---|---|
| `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-DESIGN-001` | `fab5bdc` | COMPLETE — hub skeleton created |
| `TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-STRATEGY-001` | `8ea1675` | COMPLETE — taxonomies and classification rules defined; §22–§25 superseded by this unit |

The hub skeleton documents in `governance/launch-readiness/` remain `SKELETON — PENDING POPULATION`.
Hub population follows from the incremental process defined here — it is not a single up-front pass.

### 1.2 What Prompted This Refinement

The prior strategy (AUDIT-STRATEGY-001) defined a large sequential audit that would:
1. Inspect all three repos in one pass
2. Produce a unified feature inventory for all repos
3. Produce cross-repo dependency registers
4. Produce an integrated development plan
5. Then populate all hub skeletons

Paresh has refined the direction:

- The hub should be populated incrementally, family by family, not in one large pass.
- CRM and CAE readiness must be audited inside their own repos.
- The main platform repo records cross-repo dependency truth only — not CRM or CAE
  feature inventories.
- Repo truth must be recorded at the beginning of each family's implementation cycle,
  not in one large pre-audit.
- Planned requirements must be recorded as intake items before classification begins.
- The family index and planned requirements intake come first.

---

## 2. Authoritative Repo and Layer 0 Posture at Strategy Authoring

### 2.1 Repo Presence

| Repo | Local path | Accessible |
|---|---|---|
| Main platform | `c:\Users\PARESH\TexQtic` | YES — open workspace |
| CRM | `c:\Users\PARESH\TexQtic-CRM` | YES — separate repo |
| CAE | `c:\Users\PARESH\TEXQTIC-CUSTOMER-ACQUISITION-ENGINE` | YES — separate monorepo |
| Marketing | `c:\Users\PARESH\texqtic-marketing-` | YES — separate repo |

### 2.2 Layer 0 Posture

- `active_delivery_unit: HOLD_FOR_AUTHORIZATION`
- `next_candidate_unit: HOLD_FOR_COUNSEL_FEEDBACK`
- Last closed: `TEXQTIC-NC-PHASE1-POST-AUDIT-QA-SEED-RESET-001` (VERIFIED_COMPLETE 2026-07-06)
- DPP: `HOLD_FOR_PARESH_DECISION` (UNCHANGED)
- TTP: `ttp_enabled=false` (UNCHANGED)

No implementation unit may be opened until Layer 0 releases `HOLD_FOR_AUTHORIZATION`.
This strategy and its immediate follow-on units (`LAUNCH-FAMILY-INDEX-001` and
`PLANNED-REQUIREMENTS-INTAKE-001`) are governance-only and do not require Layer 0 release.

---

## 3. The Three Explicit Decisions

These decisions are recorded here as the authoritative governance baseline for all
launch-readiness planning work that follows.

---

> **DECISION A:**  
> **Launch-readiness truth will be maintained incrementally, family by family, rather than
> through a single big-bang audit/population pass.**
>
> The hub documents in `governance/launch-readiness/` will be populated one family at a time,
> immediately before or during each family's implementation cycle. A complete hub population
> pass is not required before implementation work begins.

---

> **DECISION B:**  
> **CRM and CAE launch readiness must be audited in their own repos. The main platform repo
> records only cross-repo dependencies and launch-blocking integration status.**
>
> - CRM readiness audits live in `TexQtic-CRM` governance.
> - CAE readiness audits live in `TEXQTIC-CUSTOMER-ACQUISITION-ENGINE` governance.
> - The main platform repo (`TexQtic`) records only: cross-system dependency registrations
>   (XDEP entries), integration contract status, and launch-blocking handoff state.
> - Feature inventories for CRM and CAE are NOT maintained in the main platform repo.

---

> **DECISION C:**  
> **Paresh-planned requirements not yet in any repo are recorded first as planned intake
> items, not as implementation-ready MVP requirements.**
>
> A planned item has no launch-readiness status until it has been through the intake form
> (§3.4 of TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-STRATEGY-001) and Paresh has confirmed
> its classification. Until then, it is `PLANNED_NOT_IN_REPO` / `GOVERNANCE_ONLY` with no
> priority commitment.

---

## 4. Why the Big-Bang Audit/Population Model Is Deprecated

The original AUDIT-STRATEGY-001 §22 defined a 35-step audit sequence that would complete
all three repo inspections, all feature inventories, all cross-repo dependency registrations,
and all hub skeleton populations before any implementation began.

This model has the following structural problems in the TexQtic context:

| Problem | Explanation |
|---|---|
| **Drift risk** | A large upfront audit becomes stale the moment the first family implementation changes repo truth. The audit investment is wasted. |
| **Premature classification** | Classifying CAE and CRM features before those repos are actively worked on produces speculative classifications that must be revised. |
| **Cross-repo contamination** | Maintaining CRM and CAE feature inventories in the main repo violates the separation principle: each repo is the truth source for its own features. |
| **Planning-to-implementation gap** | A large planning pass before any implementation creates a long gap where no real work advances. |
| **Over-production** | The 13-artifact tracker structure (§17 of AUDIT-STRATEGY-001) is more output than is needed before the first family is implemented. |
| **Paresh-planned features** | Recording all planned features in one pass risks locking in classifications before Paresh can confirm them in the context of each family cycle. |

**The big-bang model is NOT deleted. It is deferred.**  
If a specific business need arises for a complete snapshot audit (e.g., investor diligence,
technical due diligence), the AUDIT-STRATEGY-001 artifact remains and can be activated.
For normal development operations, the incremental model defined here applies.

---

## 5. Incremental Truth Maintenance Principle

> **Principle:** Repo truth is recorded at the beginning of each family's implementation cycle,
> not in a single upfront pass. Hub documents are populated and updated family by family.

This means:

1. Before a family implementation unit opens, a family-scoped repo-truth inspection is run.
2. The inspection records only what is needed for that family's design and implementation.
3. The launch readiness hub is updated minimally — only the rows relevant to that family.
4. The planned requirements intake for that family is completed before design begins.
5. MVP vs. post-MVP classification for that family is confirmed at intake, not speculatively.
6. After implementation and verification, the hub row is updated with confirmed evidence.

**Corollary:** The hub is never "fully populated" in one pass. It becomes complete over time
as families are cycled through the implementation process.

**Corollary:** The main platform hub (`governance/launch-readiness/`) reflects only:
- Families that have been audited and classified
- Cross-repo integration status (XDEP entries)
- Production-verified families (already confirmed rows)
- Explicitly deferred families (post-MVP, blocked, or parked)

---

## 6. Family-by-Family Repo-Truth Cycle

Each family implementation cycle follows these eight steps in order. Do not skip steps.

### Step 1 — Select Family

Choose the next family from the family index (`TEXQTIC-LAUNCH-FAMILY-INDEX-001`).
The family index defines the priority-ordered sequence of families.
Only one family cycle may be open at a time.

### Step 2 — Inspect Repo Truth for This Family

For the selected family, inspect only the repos and files relevant to that family:
- Main platform: routes, services, schema fields, frontend components, tests for this family
- If the family is cross-system (e.g., FAM-22 CRM→Platform Handoff): inspect the
  integration surface in the main repo only; do not inline CRM or CAE feature details

Record current state with evidence level codes (REPO_CONFIRMED, TEST_CONFIRMED, etc.)
from §13 of TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-STRATEGY-001.

### Step 3 — Record Current State

Write a family-scoped repo-truth note:
- What is implemented (with evidence)
- What is partially implemented (with gap evidence)
- What is in governance/design only (no repo artifact)
- Feature flags affecting this family
- Any blocked or held state from Layer 0

This is a brief technical note — not a full feature inventory. It lives in the
family's unit governance file, not in a global registry.

### Step 4 — Record Planned Requirements

Using the intake form (§3.4 of TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-STRATEGY-001),
record all planned requirements for this family:
- Requirements already in repo (confirmed at Step 2)
- Requirements Paresh has communicated that are not yet in repo
- Requirements inferred from governance docs but not confirmed with Paresh

Mark all `PLANNED_NOT_IN_REPO` items as unconfirmed until Paresh reviews them.

### Step 5 — Classify MVP vs. Post-MVP

Using the launch classification taxonomy (§10 of TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-STRATEGY-001)
and the priority taxonomy (§12), classify every requirement for this family:
- Is this requirement in the MVP cutline for the Surat pilot?
- Is it a LAUNCH_BLOCKER, LAUNCH_DEPENDENCY, PILOT_REQUIRED, or POST_MVP?
- Confirm all `PLANNED_NOT_IN_REPO` items with Paresh before assigning MVP status

### Step 6 — Create Bounded Design

Create the design artifact for this family's implementation slice:
- Scope: only the MVP-classified requirements from Step 5
- Post-MVP requirements go to `FUTURE-TODO-REGISTER.md`
- Blocked or design-gated requirements go to `DECISION-PARKING-LOT.md`

### Step 7 — Implement Slice

Implement the family's MVP slice under Layer 0 authorization.
This step requires explicit Layer 0 release (`active_delivery_unit` must be authorized).

### Step 8 — Verify and Update Hub

After implementation:
- Run verification per the family's evidence requirements
- Update the hub roadmap row for this family with `PRODUCTION_VERIFIED` or current status
- Update `MVP-MUST-HAVES-CHECKLIST.md` if this family covers a binary launch gate
- Update `BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` if a blind spot is resolved
- Close the family unit

---

## 7. Family Index First — TEXQTIC-LAUNCH-FAMILY-INDEX-001

Before any family cycle begins, the family index unit must be created and committed.

### 7.1 Purpose

`TEXQTIC-LAUNCH-FAMILY-INDEX-001` produces a single governance artifact that:
- Lists all families (FAM-01 through FAM-24) from §9 of AUDIT-STRATEGY-001
- Records the current high-level status of each family (NOT_ASSESSED, PRODUCTION_VERIFIED, BLOCKED, etc.)
- Records the family's system owner (MAIN / CRM / CAE / CROSS_SYSTEM)
- Records the MVP cutline classification for each family (from §10 of AUDIT-STRATEGY-001)
- Defines the priority-ordered sequence for family implementation cycles
- Identifies which families require Layer 0 release to begin

### 7.2 What the Family Index Is NOT

- It is NOT a complete feature inventory (that is done family-by-family in Step 2–3 of §6 above)
- It is NOT an audit of any repo (no repo inspection beyond confirming status)
- It is NOT hub population (the hub skeletons are not populated by this unit)

### 7.3 Family Index Output Artifact

| Field | Description |
|---|---|
| Family ID | FAM-01 through FAM-24 |
| Family name | Short label |
| System owner | MAIN / CRM / CAE / CROSS_SYSTEM |
| Current status | HIGH_LEVEL_ONLY: PRODUCTION_VERIFIED / NOT_ASSESSED / BLOCKED / DEFERRED |
| MVP cutline | YES / POST_MVP / PARKED / GATED |
| Layer 0 gate | YES (requires authorization) / NO (governance-only; may proceed) |
| Proposed cycle order | Integer priority (1 = first) |
| Notes | Key blockers, known gaps, or holds |

### 7.4 Family Index Approval

Paresh reviews and approves the family index before the first family cycle opens.
The index may be amended between family cycles if new information emerges.

---

## 8. Planned Requirements Intake — TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-001

After the family index is approved, the planned requirements intake unit runs.

### 8.1 Purpose

`TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-001` produces a governance artifact that:
- Records all requirements Paresh has communicated (verbally, in planning docs, or in
  governance docs) that are not yet in any repo
- Records all requirements inferred from existing governance docs that lack repo confirmation
- Does NOT classify any item as MVP until Paresh confirms it in the context of this unit
- Does NOT create design artifacts or implementation plans

### 8.2 Intake Process

For each planned requirement:

1. Record using the intake form (§3.4 of TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-STRATEGY-001)
2. Assign source classification `PLANNED_NOT_IN_REPO` or `GOVERNANCE_CLAIM_ONLY`
3. Assign readiness `GOVERNANCE_ONLY`
4. Assign provisional family (may be revised during family cycle)
5. Mark as `UNCONFIRMED` until Paresh reviews
6. After Paresh review: mark as `CONFIRMED` or `WITHDRAWN` or `DEFERRED_TO_POST_MVP`

### 8.3 What Intake Does NOT Authorize

- Recording a planned requirement in the intake does NOT authorize implementation
- Recording a planned requirement does NOT elevate it to `IMPLEMENTATION_READY`
- Intake items must pass through the family cycle (§6) before they can be implemented
- No planned requirement may be classified as `LAUNCH_BLOCKER` or `MVP_CRITICAL` without
  Paresh confirmation at the intake step

### 8.4 Sources for Planned Requirements

The intake unit should draw from:
- `governance/launch-readiness/MVP-LAUNCH-READINESS-ROADMAP.md` (skeleton rows NOT_ASSESSED)
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md` (known deferred items)
- `governance/launch-readiness/DECISION-PARKING-LOT.md` (items awaiting Paresh decision)
- `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` (known gaps)
- `docs/product-truth/` trackers (planned feature records)
- CRM and CAE governance docs — only cross-system dependency items that belong in the
  main repo (see §9–§11 below for scope rules)
- Paresh's verbal or written communications about planned features

---

## 9. CRM Separate-Repo Audit Rule

### 9.1 Core Rule

> **CRM launch readiness is owned by the `TexQtic-CRM` repo.  
> CRM feature inventories, readiness assessments, and design artifacts live in `TexQtic-CRM/governance/`.  
> The main platform repo does NOT maintain a CRM feature inventory.**

### 9.2 What the Main Repo Records About CRM

The main platform repo (`TexQtic`) records only:

| Record type | Example | Where it lives |
|---|---|---|
| Cross-repo dependency registration | `XDEP-CRM-001: CRM provisioning webhook → WEBHOOK-007` | `governance/audit/` or a dedicated XDEP register |
| Integration contract status | `WEBHOOK-007: BLOCKED_PENDING_ORF_EVENTS_JURISDICTION_AUTH_OPENAPI` | `governance/control/BLOCKED.md` |
| Cross-system handoff state | `GAP-ACQ-007: CRM omits jurisdiction field` | `docs/product-truth/` planning trackers |
| Launch-blocking CRM dependency | "Pilot cannot launch until CRM provisioning webhook is unblocked" | Hub roadmap — cross-system row only |

### 9.3 What the Main Repo Does NOT Record About CRM

- CRM route inventory
- CRM schema details (unless they are the payload of a cross-system contract)
- CRM UI surface assessments
- CRM test coverage status
- CRM feature implementation timelines or design artifacts
- CRM Supabase migration history

### 9.4 CRM Audit Location

When a CRM audit is needed, it is opened as a unit inside `TexQtic-CRM`:
- The unit is authored in `TexQtic-CRM/governance/units/`
- The unit inspects only `TexQtic-CRM/` sources
- The main repo references the outcome of the CRM audit unit by ID — it does not inline
  the audit results

---

## 10. CAE Separate-Repo Audit Rule

### 10.1 Core Rule

> **CAE launch readiness is owned by the `TEXQTIC-CUSTOMER-ACQUISITION-ENGINE` repo.  
> CAE feature inventories, readiness assessments, and design artifacts live in that repo's governance.  
> The main platform repo does NOT maintain a CAE feature inventory.**

### 10.2 What the Main Repo Records About CAE

| Record type | Example | Where it lives |
|---|---|---|
| CAE → Main integration status | `ROUTE-001 through ROUTE-006: all gated behind TTP legal gate` | `docs/product-truth/` planning trackers |
| Cross-repo dependency | `XDEP-CAE-001: CAE supplier acquisition event → CRM lead intake` | XDEP register (main repo `governance/audit/` or inline in unit) |
| Launch-blocking CAE dependency | "Surat pilot does not require CAE live; acquisition is manual for pilot" | Hub roadmap — cross-system row |

### 10.3 What the Main Repo Does NOT Record About CAE

- CAE service implementation details
- CAE admin UI surface
- CAE worker pipeline internals
- CAE test coverage
- CAE deployment or infra posture
- CAE feature implementation timelines

### 10.4 CAE Audit Location

CAE audits are opened as units inside `TEXQTIC-CUSTOMER-ACQUISITION-ENGINE`.
The main repo references the outcome by unit ID only.

---

## 11. Main Repo Cross-Repo Dependency Recording Rule

### 11.1 What Qualifies as a Cross-Repo Dependency

A cross-repo dependency must be registered in the main platform repo when:

1. The dependency is on the critical path to pilot launch
2. The dependency involves a contract between two systems (event schema, webhook payload, API call)
3. The dependency's status (BLOCKED / IMPLEMENTED / PLANNED) affects the main platform's
   launch readiness assessment

### 11.2 XDEP Registration

Every cross-repo dependency recorded in the main repo uses the XDEP format from §8.2 of
TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-STRATEGY-001:

```
XDEP-[SYSTEM]-NNN
Source system → Target system
Type: EVENT / WEBHOOK / API_CALL / SHARED_CONTRACT / DB_JOIN / FEATURE_FLAG
Status: IMPLEMENTED / PLANNED / BLOCKED / NOT_STARTED
```

### 11.3 XDEP Placement

XDEP registrations belong in the main repo at:
- Inline in the family's unit governance doc (when first discovered)
- In `governance/audit/TEXQTIC-CROSS-REPO-DEPENDENCY-REGISTER-v1.md` (consolidated, when created)

The consolidated register is created on demand, not upfront. It is created when the number of
XDEP entries grows beyond what can be tracked inline.

---

## 12. Connectivity Verification Model

### 12.1 Integration Chain

```
Marketing site
    ↓ form submission
CAE [TEXQTIC-CUSTOMER-ACQUISITION-ENGINE]
    ↓ acquisition event (ROUTE-001 — GATED: TTP legal gate)
CRM [TexQtic-CRM]
    ↓ qualification → onboarding case → approval
CRM provisioning webhook (WEBHOOK-007 — BLOCKED: ORF_EVENTS_JURISDICTION_AUTH_OPENAPI)
    ↓
Main Platform [TexQtic]
    ↓ tenant provisioning → invite → activation
Live tenant workspace
```

### 12.2 Pilot Launch Connectivity Requirement

For the Surat pilot, the full automation chain (Marketing → CAE → CRM → Main) is NOT
required to be live. The pilot may use manual provisioning through the control plane if
the integration chain is not ready.

The main repo's connectivity verification model therefore covers two scenarios:

| Scenario | Required for pilot | Integration chain needed |
|---|---|---|
| Manual pilot provisioning | YES | Main platform control plane only |
| Automated acquisition chain | POST_MVP (unless explicitly elevated) | Full CAE → CRM → WEBHOOK-007 → Main |

### 12.3 CAE → CRM Connectivity

- Assessed in CAE and CRM repos, not in the main repo
- Main repo records: XDEP status only
- Main repo does NOT verify: CAE API calls, CRM lead intake, CRM onboarding logic

### 12.4 CRM → Main Connectivity

- Assessed by inspecting `WEBHOOK-007` status in `governance/control/BLOCKED.md`
- Current status: `BLOCKED_PENDING_ORF_EVENTS_JURISDICTION_AUTH_OPENAPI`
- Main repo records: webhook contract status, blocked state, and what would be needed to unblock
- Main repo does NOT verify: CRM internal webhook-trigger logic

### 12.5 CAE → Main (Direct Integration)

- Currently: no confirmed direct CAE → Main integration (all ROUTE-001..006 are gated)
- Main repo records: XDEP entry with status BLOCKED / NOT_STARTED
- If a direct integration is planned for pilot: must be explicitly added to the family index
  with a cross-system XDEP registration before any design begins

---

## 13. Technical-Only Recording Boundary

All repo records in the main platform repo, including this strategy and all units that follow,
must be technical in nature. The following boundary applies:

### 13.1 What May Be Recorded in the Main Repo

| Category | Examples |
|---|---|
| Implemented routes, services, and schema | Fastify route paths, Prisma models, service files |
| Planned routes, services, and schema | PLANNED_NOT_IN_REPO intake items |
| Feature flag states | `supplier_quotes.enabled=false`, `ttp_enabled=false` |
| Test coverage status | Test files, pass/fail counts, evidence type |
| Production verification evidence | Smoke test output, production data confirmation |
| Cross-system API contracts | Webhook payload schema, event names, XDEP registrations |
| Deployment posture | Where the service runs; what infra it depends on |
| Known bugs and blockers with repo evidence | BLOCKED entries in Layer 0 control |
| Technical prerequisites for launch | What must be built before the pilot |

### 13.2 What Must NOT Be Recorded in the Main Repo

| Category | Where it belongs instead |
|---|---|
| Fundraising milestones and investor plan | Outside repo (private planning docs) |
| Investor pitch narrative | Outside repo |
| Marketing campaigns and field outreach | Outside repo |
| Sales battle plan and field ops | Outside repo |
| 90-day commercial battle plan | Outside repo |
| Brand narrative and messaging | Outside repo |
| Legal counsel communications | Outside repo (private) |
| Business model analysis (non-technical) | Outside repo |
| Team org structure and hiring plan | Outside repo; or in `TEAM-FUNDING-READINESS.md` header only |
| Pricing strategy and commercial terms | Outside repo |
| Pilot GTM sequencing (non-technical) | `governance/launch-readiness/PILOT-READINESS-SURAT.md` header only |

### 13.3 Boundary in Practice

When Paresh communicates a planned feature that also has commercial or GTM implications:
- Record the technical requirement in the intake form (§8 above)
- Do NOT record the commercial or GTM framing
- If the classification of a requirement depends on a business decision, record the dependency
  as `NEEDS_BUSINESS_DECISION` and park the decision in `DECISION-PARKING-LOT.md`

---

## 14. What Remains Outside the Repo

The following planning activities are part of TexQtic launch planning but are explicitly
outside the scope of any repo document:

| Category | Owner | Status in repo |
|---|---|---|
| Fundraising and investor materials | Paresh | NOT in repo |
| 90-day field sales battle plan | Paresh | NOT in repo |
| Marketing campaigns and launch messaging | Marketing/Paresh | NOT in repo (brand copy only) |
| Surat pilot outreach and relationship mapping | Paresh | NOT in repo |
| Legal counsel packet (TTP) | Paresh / Counsel | `governance/control/` reference only; packet content private |
| Board or advisor communications | Paresh | NOT in repo |
| Team compensation and equity plans | Paresh | NOT in repo |
| Customer pricing and commercial proposals | Paresh | NOT in repo |

The hub documents `PILOT-READINESS-SURAT.md` and `TEAM-FUNDING-READINESS.md` may contain
headers and readiness criteria for these topics, but they do not contain the operational
content (no investor deck text, no battle plan actions, no pricing).

---

## 15. Revised Unit Sequence

The following sequence supersedes §25 of TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-STRATEGY-001.

### 15.1 Immediate Next Units (Governance-Only — No Layer 0 Release Required)

| Order | Unit ID | Purpose | Gate |
|---|---|---|---|
| 1 | `TEXQTIC-LAUNCH-FAMILY-INDEX-001` | Create family index with priority ordering | Paresh approval of index |
| 2 | `TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-001` | Record and confirm all planned requirements | Paresh confirmation of intake |

These two units may proceed while Layer 0 is `HOLD_FOR_AUTHORIZATION` because they are
governance-only — they produce no implementation, no schema change, no runtime change.

### 15.2 Family Implementation Cycles (Layer 0 Release Required)

After the family index and planned requirements intake are complete, family implementation
cycles begin. Each cycle follows the eight-step process in §6.

The cycle order is defined by the family index output. Preliminary expected order
(to be confirmed by the family index unit):

| Cycle | Family | System | MVP gate | Notes |
|---|---|---|---|---|
| 1 | FAM-06 Auth and Session Management | MAIN | LAUNCH_BLOCKER | May already have significant implementation |
| 2 | FAM-07 Tenant Onboarding and Invite | MAIN | LAUNCH_BLOCKER | Invite flow partially implemented |
| 3 | FAM-08 Tenant Core Workspace | MAIN | LAUNCH_BLOCKER | Core tenant routes present |
| 4 | FAM-09 Supplier Profile and Catalog | MAIN | LAUNCH_BLOCKER | Profile routes present |
| 5 | FAM-10 Platform Ops and Control Plane | MAIN | LAUNCH_BLOCKER | Control plane implemented |
| 6 | FAM-11 Subscription and Commercial Gating | MAIN | P1_MVP_MUST_HAVE | Gating logic present |
| 7 | FAM-12 Network Commerce — RFQ and Pools | MAIN | P1_MVP_MUST_HAVE | Phase 1 AUDIT_COMPLETE |

> **Note:** The cycle order above is preliminary. The family index unit (§7) produces the
> authoritative order based on dependency analysis and Paresh confirmation.

### 15.3 CRM and CAE Audit Tracks

These are parallel workstreams, not blocked by main platform implementation:

| Track | Repo | Unit name | Gate |
|---|---|---|---|
| CRM readiness audit | `TexQtic-CRM` | `TEXQTIC-CRM-LAUNCH-READINESS-AUDIT-001` (in CRM repo) | Paresh authorization in CRM repo |
| CAE readiness audit | `TEXQTIC-CUSTOMER-ACQUISITION-ENGINE` | `TEXQTIC-CAE-LAUNCH-READINESS-AUDIT-001` (in CAE repo) | Paresh authorization in CAE repo |

These units produce audit artifacts in their own repos. The main platform references their
outcomes via XDEP registrations only.

### 15.4 Cross-Repo Dependency Register

A consolidated `TEXQTIC-CROSS-REPO-DEPENDENCY-REGISTER-v1.md` is created in the main repo
when the number of XDEP entries exceeds what can be tracked inline. It is populated
incrementally as each family cycle and CRM/CAE audit track produces XDEP entries.

It is NOT created upfront as part of the family index or planned requirements intake.

### 15.5 Integrated Development Plan

The `TEXQTIC-INTEGRATED-DEVELOPMENT-PLAN-MVP-v1.md` is created in the main repo after
enough family truth exists to make it meaningful — specifically, after:
- At least the first 3–4 family cycles are complete or in progress
- The CRM and CAE audit tracks have produced initial outcomes
- The planned requirements intake is confirmed by Paresh

It is NOT created upfront as an output of a single audit pass.

### 15.6 Unit Sequence Diagram

```
[NOW — No Layer 0 release needed]
TEXQTIC-LAUNCH-FAMILY-INDEX-001
    ↓
TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-001
    ↓
[REQUIRES Layer 0 release]
Family cycle 1 (FAM-06 Auth — or as ordered by family index)
    ↓
Family cycle 2 (FAM-07 Onboarding)
    ↓
... (family by family) ...

[PARALLEL — In respective repos]
TEXQTIC-CRM-LAUNCH-READINESS-AUDIT-001 (in TexQtic-CRM)
TEXQTIC-CAE-LAUNCH-READINESS-AUDIT-001 (in TEXQTIC-CUSTOMER-ACQUISITION-ENGINE)

[AFTER sufficient family truth exists]
TEXQTIC-CROSS-REPO-DEPENDENCY-REGISTER-v1.md (consolidated, on demand)
TEXQTIC-INTEGRATED-DEVELOPMENT-PLAN-MVP-v1.md (after 3-4 family cycles + CRM/CAE outcomes)

[GATED — awaiting Paresh SEO canonical decision]
PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001
```

---

## 16. Stop Conditions

The incremental truth process must STOP and emit a Blocker Report if:

| Condition | Action |
|---|---|
| A family cycle requires inspecting CRM or CAE repo to understand main platform state | Stop; apply §9–§10 separation rules; record only XDEP status |
| A planned requirement cannot be classified without a business decision from Paresh | Stop; record in `DECISION-PARKING-LOT.md`; do not infer |
| A family cycle finds a runtime issue that requires fixing before the audit truth is clean | Stop; open a runtime fix unit under Layer 0; do not mix audit and implementation |
| A planned intake item is proposed as MVP-critical without Paresh confirmation | Stop; mark as UNCONFIRMED; do not elevate |
| A family index entry would require opening an implementation unit to verify its status | Stop; use governance-claim evidence only; note evidence gap |
| The Layer 0 posture changes while a governance-only unit is in progress | Stop; re-read `NEXT-ACTION.md` before proceeding |
| Any file outside the prompt allowlist would need to be modified | Stop; emit Blocker Report |
| Pre-existing modified runtime files appear to have been staged | Stop; unstage; re-verify |
| A CRM or CAE audit finding requires a main platform schema change | Stop; flag as XDEP blocker; escalate to Paresh |
| Two governance artifacts make conflicting claims about a LAUNCH_BLOCKER feature | Stop; escalate to Paresh; do not infer resolution |

---

## 17. Completion Checklist

This strategy unit is complete when ALL of the following are true:

- [x] Inspected: `TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-STRATEGY-001.md` — full read
- [x] Inspected: `governance/launch-readiness/README.md`
- [x] Inspected: `governance/launch-readiness/FUTURE-TODO-REGISTER.md`
- [x] Inspected: `governance/launch-readiness/DECISION-PARKING-LOT.md`
- [x] Inspected: `governance/control/NEXT-ACTION.md`
- [x] Inspected: `governance/control/OPEN-SET.md`
- [x] Inspected: `governance/control/BLOCKED.md`
- [x] Inspected: Workspace presence of main platform, CRM, and CAE repos — confirmed
- [x] Three explicit decisions recorded (§3)
- [x] Incremental truth maintenance principle defined (§5)
- [x] Big-bang model deprecated with reasons (§4)
- [x] Family-by-family cycle defined (§6)
- [x] Family index unit defined (§7)
- [x] Planned requirements intake unit defined (§8)
- [x] CRM separate-repo audit rule defined (§9)
- [x] CAE separate-repo audit rule defined (§10)
- [x] Main repo cross-repo dependency recording rule defined (§11)
- [x] Connectivity verification model defined (§12)
- [x] Technical-only recording boundary defined (§13)
- [x] What remains outside repo defined (§14)
- [x] Revised unit sequence defined (§15)
- [x] Stop conditions defined (§16)
- [x] Prior strategy artifact amended with addendum (§26 added to AUDIT-STRATEGY-001)
- [x] Hub README updated with strategy reference
- [x] Git preflight passed: no unexpected staged or modified files
- [x] Only allowlisted governance files staged
- [x] Pre-existing M files confirmed NOT staged
- [x] Commit made with correct message format

---

## 18. Drift-Control Enforcement Addendum Reference

The principles in this strategy (incremental truth, CRM/CAE separation, planned requirements
intake, no big-bang population) are enforced at the TECS OS level by:

**`governance/units/TECS-LAUNCH-READINESS-HUB-DRIFT-CONTROL-ADDENDUM-001.md`**  
**Extends:** `TECS.md` §8 — effective 2026-05-19

That addendum translates the principles in this strategy into mandatory TECS lifecycle rules:

| Strategy principle | Drift-control enforcement |
|---|---|
| Incremental, family-by-family (§5–§6) | Addendum §9 — family-cycle hub maintenance rule |
| Planned requirements intake-first (§8) | Addendum §10 — planned requirements maintenance rule |
| CRM audited separately (§9) | Addendum §11 — CRM/CAE hub maintenance rule |
| CAE audited separately (§10) | Addendum §11 — CRM/CAE hub maintenance rule |
| XDEP status only in main repo (§11) | Addendum §11.1 — XDEP-only enforcement |
| No false repo truth from planning docs | Addendum §6 — evidence-level binding rules |

All future population and maintenance work on `governance/launch-readiness/` must comply with
both this strategy and the drift-control addendum.

---

*Strategy authored: 2026-05-19 — TexQtic governance corpus, `governance/units/`, main branch.*
