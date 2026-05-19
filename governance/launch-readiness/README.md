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
2. **`MVP-LAUNCH-READINESS-ROADMAP.md`** — current family-level readiness matrix and critical path
3. **`MVP-MUST-HAVES-CHECKLIST.md`** — binary launch checklist; what launch blocks on
4. **`BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md`** — risks and hidden dependencies
5. **`FUTURE-TODO-REGISTER.md`** — deferred items with rationale
6. **`DECISION-PARKING-LOT.md`** — open decisions not yet ready to make
7. **`PILOT-READINESS-SURAT.md`** — Surat pilot proof cell readiness
8. **`TEAM-FUNDING-READINESS.md`** — team, funding, and operational readiness
9. **`POST-MVP-ROADMAP.md`** — future phases beyond MVP launch
10. **`PUBLIC-PAGES-SEO-EXPANSION-REGISTER.md`** — future public pages and SEO decisions

---

## 3. Documents in This Hub

| File | Purpose |
|---|---|
| `README.md` (this file) | Folder index, usage rules, authority boundary |
| `MVP-LAUNCH-READINESS-ROADMAP.md` | Phase/status matrix; critical path to real tenants/users |
| `MVP-MUST-HAVES-CHECKLIST.md` | Binary launch checklist; minimum acceptable production readiness |
| `FUTURE-TODO-REGISTER.md` | All deferred implementation candidates; reason deferred; priority |
| `BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | Blind spots; hidden deps; unresolved risks |
| `POST-MVP-ROADMAP.md` | Non-launch-critical future phases and enhancements |
| `PILOT-READINESS-SURAT.md` | Surat 30–50 supplier proof cell; buyer response; proof pack |
| `TEAM-FUNDING-READINESS.md` | Team gaps; funding signals; operational readiness criteria |
| `PUBLIC-PAGES-SEO-EXPANSION-REGISTER.md` | Future public pages; SEO gate per page; deferred SEO units |
| `DECISION-PARKING-LOT.md` | Decisions not ready to make; trigger conditions; who decides |

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

## 10. Design Authority

This hub was created by: `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-DESIGN-001`

Full design rationale, taxonomy definitions, update rules, ownership boundaries, and stop conditions
are documented in that unit file.

Population of all skeleton docs is governed by: `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-POPULATION-001` (next recommended unit — not yet started).
