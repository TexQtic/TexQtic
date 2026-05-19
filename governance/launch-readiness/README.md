# governance/launch-readiness/ — Launch Readiness Planning Hub

**Hub version:** 1.0 — skeleton created by `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-DESIGN-001`
**Populated:** PENDING — see `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-POPULATION-001`
**Owner:** Paresh Patel (TexQtic founder)
**Last updated:** 2026-05-19

---

## 1. Purpose

This folder is the single durable home for TexQtic launch readiness planning.

It captures what TexQtic must achieve before onboarding real tenants and users, what has been
deferred and why, what might go wrong, what comes after a successful launch, how the Surat pilot
proof cell is tracking, and what team/funding/operational readiness looks like.

**It is a planning layer — not a governance authority.**

It does not sequence delivery units.
It does not open or close governed implementation units.
It does not override or widen Layer 0.
It does not supersede or replace the live `LAUNCH-ACCELERATION-OVERLAY-001.md`.

---

## 2. Read Order

For current launch-planning context, read these documents in this order:

1. **`README.md`** (this file) — what the hub is and what it is not
2. **`LAUNCH-FAMILY-INDEX.md`** — family sequencing navigation map; proposed cycle order; not a detailed audit
3. **`MVP-LAUNCH-READINESS-ROADMAP.md`** — current family-level readiness matrix and critical path
4. **`MVP-MUST-HAVES-CHECKLIST.md`** — binary launch checklist; what launch blocks on
5. **`BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md`** — risks and hidden dependencies
6. **`FUTURE-TODO-REGISTER.md`** — deferred items with rationale
7. **`DECISION-PARKING-LOT.md`** — open decisions not yet ready to make
8. **`PILOT-READINESS-SURAT.md`** — Surat pilot proof cell readiness
9. **`TEAM-FUNDING-READINESS.md`** — team, funding, and operational readiness
10. **`POST-MVP-ROADMAP.md`** — future phases beyond MVP launch
11. **`PUBLIC-PAGES-SEO-EXPANSION-REGISTER.md`** — future public pages and SEO decisions
12. **`PLANNED-REQUIREMENTS-INTAKE.md`** — intake queue for planned and deferred technical requirements; not implementation authority; planned items require Paresh confirmation and family audit before implementation

---

## 3. Documents in This Hub

| File | Purpose |
|---|---|
| `README.md` (this file) | Folder index, usage rules, authority boundary |
| `LAUNCH-FAMILY-INDEX.md` | Navigation map for family sequencing; proposed cycle order; not a detailed audit |
| `MVP-LAUNCH-READINESS-ROADMAP.md` | Phase/status matrix; critical path to real tenants/users |
| `MVP-MUST-HAVES-CHECKLIST.md` | Binary launch checklist; minimum acceptable production readiness |
| `FUTURE-TODO-REGISTER.md` | All deferred implementation candidates; reason deferred; priority |
| `BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | Blind spots; hidden deps; unresolved risks |
| `POST-MVP-ROADMAP.md` | Non-launch-critical future phases and enhancements |
| `PILOT-READINESS-SURAT.md` | Surat 30–50 supplier proof cell; buyer response; proof pack |
| `TEAM-FUNDING-READINESS.md` | Team gaps; funding signals; operational readiness criteria |
| `PUBLIC-PAGES-SEO-EXPANSION-REGISTER.md` | Future public pages; SEO gate per page; deferred SEO units |
| `DECISION-PARKING-LOT.md` | Decisions not ready to make; trigger conditions; who decides |
| `PLANNED-REQUIREMENTS-INTAKE.md` | Intake queue for planned/deferred technical requirements; not implementation authorization; items require Paresh confirmation + family audit before implementation |

---

## 4. Authority Boundary

### This hub IS:
- A planning and tracking layer for Paresh to maintain a current launch picture
- A durable home for deferred items, parked decisions, and risk registers
- A complement to the live Layer 0 governance OS
- A planning input for future governance units

### This hub IS NOT:
- A replacement for Layer 0 (`governance/control/OPEN-SET.md`, `NEXT-ACTION.md`, `BLOCKED.md`)
- An extension or widening of `LAUNCH-ACCELERATION-OVERLAY-001.md`
- A unit-sequencing authority
- A product-truth authority (see `docs/product-truth/` for that)
- A governance-OS component (see `governance/control/` for that)
- A supersession of `docs/product-truth/TEXQTIC-LAUNCH-READINESS-REQUIREMENTS-v1.md` (which remains a preserved historical baseline)

---

## 5. Layer 0 Relationship

Layer 0 (`governance/control/`) remains the sole live authority for:
- Current repo posture (`OPEN-SET.md`)
- Active delivery unit (`NEXT-ACTION.md`)
- Active blockers and holds (`BLOCKED.md`)
- Unit sequencing decisions

This hub **reads from** Layer 0. It does not write to Layer 0.

Any item in this hub that becomes a live blocker should be escalated to Layer 0 by Paresh — not by updating this hub alone.

---

## 6. Update Rules

### Who may update this hub:
- **Paresh directly**: any document, any time
- **Copilot/AI agents**: only when the specific file is in the explicit `ALLOWLIST (Modify)` of the active prompt
- **Governance implementation units**: may update `FUTURE-TODO-REGISTER.md`, `BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md`, and `PUBLIC-PAGES-SEO-EXPANSION-REGISTER.md` when allowlisted

### When to update:
- After any governance unit closes as `VERIFIED_COMPLETE` (check checklist and future-todo)
- When any item is newly deferred (add to future-todo or decision-parking-lot)
- When a new risk or blind spot is identified (add to blind-spot register)
- When a new public page is scoped (add to SEO expansion register)
- At each planning review cycle (Paresh-driven)

### Update governance rule:
**Updates to this hub do not require a full TECS governance unit.** They are planning updates, not product implementations. However, if an update to this hub requires a product decision or implementation authorization, that must still go through Layer 0.

---

## 7. Non-Duplication Clause

This hub does NOT attempt to re-state facts already governed in:
- Layer 0 control files (OPEN-SET, NEXT-ACTION, BLOCKED)
- Live family trackers (B2C tracker, D2C tracker)
- TECS governance units (individual unit files)
- Product-truth historical docs (docs/product-truth/)

If a fact is already recorded in those locations, this hub references it — it does not re-record it.

---

## 8. Status Taxonomy

| Status | Meaning |
|---|---|
| `MVP_CRITICAL` | Required for launch; blocks real tenant onboarding if absent |
| `LAUNCH_BLOCKER` | Hard blocker; launch cannot proceed without this |
| `LAUNCH_DEPENDENCY` | Launch depends on this but may be in parallel |
| `PILOT_REQUIRED` | Required for Surat proof cell specifically |
| `POST_MVP` | Confirmed not required for launch; scheduled for after |
| `PARKED_DECISION` | Decision deferred; not ready to decide yet |
| `WATCH_ITEM` | Not a blocker today; may become one |
| `VERIFIED_COMPLETE` | Confirmed done in production |
| `DEFERRED` | Explicitly deferred with reason; not abandoned |

---

## 9. Priority Taxonomy

| Priority | Meaning |
|---|---|
| `P0` | Launch blocker; cannot launch without this |
| `P1` | MVP must-have; launch is significantly degraded without this |
| `P2` | Pilot enhancer; improves proof quality but not a hard requirement |
| `P3` | Post-MVP; valuable after real tenants are onboarded |
| `P4` | Idea/backlog; worth capturing but no delivery timeline |

---

## 10. Design and Planning Strategy Authority

This hub was created by: `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-DESIGN-001`

Full design rationale, taxonomy definitions, update rules, ownership boundaries, and stop conditions
are documented in that unit file.

### Planning Strategy Artifacts (read before populating or amending this hub)

| Artifact | Location | Purpose |
|---|---|---|
| `TEXQTIC-LAUNCH-READINESS-TECHNICAL-AUDIT-STRATEGY-001` | `governance/units/` | Taxonomies, classification codes, readiness codes, family registry, evidence levels — all IN FORCE |
| `TEXQTIC-LAUNCH-READINESS-INCREMENTAL-TRUTH-STRATEGY-001` | `governance/units/` | **Execution process authority** — incremental, family-by-family population model; CRM/CAE separation rules; planned requirements intake |

### How This Hub Is Populated

Hub documents are populated **incrementally, family by family**, not in a single audit pass.
The process is:

1. `TEXQTIC-LAUNCH-FAMILY-INDEX-001` — family index with priority ordering (COMPLETE — see `LAUNCH-FAMILY-INDEX.md`)
2. `TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-001` — planned requirements confirmed with Paresh
3. Family-local implementation cycles — one family at a time, with hub rows updated per cycle

CRM and CAE readiness are audited in their own repos. This hub records only cross-repo
dependency status and main platform launch readiness. See
`TEXQTIC-LAUNCH-READINESS-INCREMENTAL-TRUTH-STRATEGY-001` §9–§10 for the CRM/CAE separation rules.

---

## 11. Drift-Control Maintenance

**Full rules:** `governance/units/TECS-LAUNCH-READINESS-HUB-DRIFT-CONTROL-ADDENDUM-001.md`  
**Extends:** `TECS.md` §8  
**Effective:** 2026-05-19

The drift-control system ensures hub rows remain synchronized with actual repo truth as
implementation cycles complete. The following rules are mandatory; they supersede the
weaker update guidance in §6 where they conflict.

### Evidence Required for Status Changes

Every status-bearing hub row MUST carry mandatory evidence fields before its readiness status
may advance. The minimum fields are:

```
status:                [STATUS_CODE]
readiness:             [READINESS_CODE]
priority:              [P0 / P1 / P2 / P3 / P4]
evidence_level:        [PRODUCTION_CONFIRMED | TEST_CONFIRMED | REPO_CONFIRMED |
                        GOVERNANCE_CLAIM_ONLY | USER_PLANNED_ONLY]
evidence_source:       [unit ID or REPO_INSPECTION:<path> or XDEP_ONLY]
last_verified_by_unit: [unit ID or PARESH_DIRECT]
```

A row without these fields is treated as `GOVERNANCE_CLAIM_ONLY` regardless of its `status` value.

Evidence minimums:
- `PRODUCTION_VERIFIED` → `PRODUCTION_CONFIRMED` from a verify-close unit
- `VERIFIED_COMPLETE` / `LAUNCH_BLOCKER` → `TEST_CONFIRMED` or `REPO_CONFIRMED`
- `LAUNCH_BLOCKER` / `MVP_CRITICAL` → `REPO_CONFIRMED` + Paresh confirmation
- `PLANNED_NOT_IN_REPO` → `USER_PLANNED_ONLY` (intake required before implementation)

### Verify-Close Hub-Sync Checklist

Every TECS verify-close artifact must answer the mandatory hub-sync checklist (9 items).
This checklist is defined in addendum §8 and governs which hub rows change, what evidence
applies, and whether CRM/CAE or planned items have been correctly handled. The verify-close
is not complete until the checklist is answered.

### No Big-Bang Population

Hub documents are populated incrementally — one family at a time — per the process defined
in `TEXQTIC-LAUNCH-READINESS-INCREMENTAL-TRUTH-STRATEGY-001`. No single governance unit may
populate all hub rows in a global pass unless explicitly scoped as a comprehensive hub
population unit and allowlisted for all hub files.

### CRM/CAE Separation — No Duplication

CRM readiness truth lives in `TexQtic-CRM/governance/`.  
CAE readiness truth lives in `TEXQTIC-CUSTOMER-ACQUISITION-ENGINE/governance/`.

This hub records XDEP status only: dependency status + CRM/CAE audit unit ID. It does NOT
inline CRM/CAE route, schema, or UI implementation details. Any hub row that contains such
details must be reduced to an XDEP reference.

### Planned Requirements Are Intake-First

Requirements Paresh has communicated that are not yet in any repo must pass through
`TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-001` before appearing in any hub row. Until confirmed:
- They carry `readiness: PLANNED_NOT_IN_REPO` and `evidence_level: USER_PLANNED_ONLY`
- They MUST NOT be designated `LAUNCH_BLOCKER`, `MVP_CRITICAL`, or `P0`/`P1`
- They MUST NOT be implemented in any TECS unit

### No Silent Drift

When a hub row is discovered to be inconsistent with current repo truth, it must be either:
- Corrected in the active unit (if hub file is in allowlist)
- Recorded as `PENDING_HUB_UPDATE` in the verify-close report (if not allowlisted)

Silent drift — leaving a known-incorrect row without recording it as pending — is a governance
violation. The next unit allowlisted for the affected hub file must resolve it.

### Family Opening Audit Gate

**Governing unit:** `TEXQTIC-LAUNCH-FAMILY-INDEX-AUDIT-GATE-ADDENDUM-001`  
**Full rule text:** `LAUNCH-FAMILY-INDEX.md` §12

Before opening any family implementation cycle, the Family Opening Audit Gate must be observed:

1. Read the family's current index row in `LAUNCH-FAMILY-INDEX.md`.
2. Perform a current-cycle family-local repo-truth inspection (routes, services, schema, frontend, tests, feature flags, blockers, prior unit evidence, production limitations).
3. Produce a short family-local repo-truth note in the unit governance file before any design or implementation begins.

**The family index row is not sufficient evidence to open a family cycle.** Steps 2 and 3 above are
mandatory and non-skippable. Old trackers and hub rows may guide the inspection but cannot replace it.
