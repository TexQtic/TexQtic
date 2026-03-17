# governance/archive/ — Layer 4: Frozen Legacy Governance Archive

**Layer:** 4 — Archive (Frozen / Historical / Read-Only)
**Authority:** GOV-OS-001-DESIGN.md (Section 3.6 + Section 5)
**Installed:** 2026-03-17 (GOV-OS-007)
**Max operational authority:** NONE — archived documents are secondary historical references only

> **STOP. Before reading anything in this directory:**
> Current operational governance truth lives exclusively in the Layer 0 control plane at
> `governance/control/`. Read those files first. Do not derive "what is open" or "what is
> next" from anything in this directory.

---

## 1. What Is Layer 4?

Layer 4 is the fifth and final structural layer of the TexQtic Governance OS (designed in
GOV-OS-001, installed in GOV-OS-007). It is a frozen archive of pre-Governance-OS legacy
governance documents.

Layer 4 files are:
- **Preserved as immutable historical records** — contents are not deleted
- **Frozen** — no new entries are added after their archive date
- **Secondary** — they do not override any Layer 0, Layer 1, Layer 2, or Layer 3 truth
- **Audit-usable** — they may be consulted to understand pre-OS governance history
- **Not first-read** — they must never be used as the primary source for sequencing decisions

---

## 2. Files in This Layer

| Archived File | Legacy Source | Archived | Description |
|---|---|---|---|
| `ARCHIVED-gap-register-2026-03.md` | `governance/gap-register.md` | 2026-03-17 | Pre-OS cumulative governance SYNC log (~1964 lines) |
| `ARCHIVED-tracker-2026-03.md` | `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` | 2026-03-17 | March 2026 frontend-backend reachability tracker (~496 lines) |
| `ARCHIVED-audit-matrix-2026-03.md` | `docs/governance/audits/2026-03-audit-reconciliation-matrix.md` | 2026-03-17 | Codex vs Copilot audit reconciliation matrix (~2766 lines) |
| `ARCHIVED-tracker-2026-Q2.md` | `docs/governance/IMPLEMENTATION-TRACKER-2026-Q2.md` | 2026-03-17 | Q2 G-001–G-028 governance history tracker (~464 lines) |

---

## 3. Why Were These Files Archived?

These legacy governance documents were identified in GOV-OS-001 (Section 2.1, Section 3.6)
as primary drivers of governance drift:

| Problem | Impact |
|---|---|
| **Oversized files** | `gap-register.md` (~1964 lines), `2026-03-audit-reconciliation-matrix.md` (~2766 lines) — context-window pollution; AI planners see only a partial view; operational truth becomes invisible |
| **Multi-file truth fragmentation** | The same unit's status appeared simultaneously in the gap-register, the implementation tracker, and the audit matrix — files drifted out of sync |
| **No canonical open-set file** | To know what was open, a full scan of all three large files was required |
| **Unlimited growth** | GOVERNANCE-SYNC entries prepended without bound — no compaction mechanism |
| **Carry-forward pollution** | Session restoration required enormous freeform summaries from these files |

These problems are resolved by the Governance OS (Layers 0–3). The legacy files are archived
here as immutable historical records — they no longer serve as operational governance sources.

---

## 4. Mandatory Rules for Archived Files

### 4.1 Archived Files Are NOT Operational Truth

Archived files in this directory do not determine:
- What units are currently open
- What the authorized next action is
- What the current status of any unit is
- What decisions gate any unit

**Layer 0 is the sole operational truth source for all of the above.**

### 4.2 Canonical Read-First Order

Before consulting this archive for any reason, first read:

1. `governance/control/DOCTRINE.md` — active doctrine invariants
2. `governance/control/OPEN-SET.md` — exact current open set
3. `governance/control/NEXT-ACTION.md` — exactly one authorized next action
4. `governance/control/BLOCKED.md` — blockers, deferred items, design gates
5. `governance/units/<UNIT-ID>.md` — per-unit canonical truth (if applicable)
6. `governance/decisions/*.md` — decisions that gate units (if applicable)
7. `governance/log/EXECUTION-LOG.md` — when historical sequencing context is needed
8. **`governance/archive/*`** — ONLY for legacy historical or audit context

**Archive files are the last resort, not the first read.**

### 4.3 If Archive Content Conflicts with Layer 0

If content in this archive appears inconsistent with the current control plane:

> **Layer 0 wins operationally.**
>
> Stop. Do not act on the archived content. Run a governance reconciliation unit to resolve
> the inconsistency before any sequencing action.

This situation can arise because archived files reflect governance state at their archive
date, which predates the Governance OS. Their status vocabulary differs from the canonical
vocabulary (see Section 5 below).

### 4.4 Archived Files Are Frozen

No new entries are added to archived files after their archive date. If a new governance
audit, reconciliation, or tracking need arises, it belongs in:
- Layer 0 (OPEN-SET.md, BLOCKED.md) for current state
- Layer 1 (governance/units/) for per-unit records
- Layer 3 (governance/log/EXECUTION-LOG.md) for history

---

## 5. Legacy vs. Canonical Status Vocabulary

The archived files use legacy status expressions that predate the Governance OS. Do not
interpret these as canonical statuses.

| Legacy Expression (in archives) | Canonical Equivalent |
|---|---|
| ✅ CLOSED / VERIFIED_COMPLETE | `VERIFIED_COMPLETE` (if evidence exists) or `CLOSED` (if governance unit) |
| TECS VALIDATED | `VERIFIED_COMPLETE` |
| IMPLEMENTED | `VERIFIED_COMPLETE` or `VERIFICATION_REQUIRED` |
| CONDITIONAL PASS | `VERIFIED_COMPLETE` (if remediated) |
| 🔵 FUTURE SCOPE | `DEFERRED` |
| 🚫 BLOCKED | `BLOCKED` |
| ⏳ Pending | `OPEN` or `IN_PROGRESS` |
| REQUIRES_BACKEND_DESIGN | `DESIGN_GATE` |

The canonical vocabulary (OPEN / IN_PROGRESS / BLOCKED / DEFERRED / DESIGN_GATE /
VERIFICATION_REQUIRED / VERIFIED_COMPLETE / CLOSED) is defined in
`governance/control/DOCTRINE.md` and `docs/governance/control/GOV-OS-001-DESIGN.md`.

---

## 6. Historical Relationships to Governance OS Layers

| Archived File | Historical Role | Now Superseded By |
|---|---|---|
| `ARCHIVED-gap-register-2026-03.md` | Cumulative GOVERNANCE-SYNC log; served as the primary governance record through Wave 5 (G-001–G-028, FBW units) | Layer 0 (OPEN-SET.md, BLOCKED.md), Layer 1 (units/), Layer 3 (EXECUTION-LOG.md) |
| `ARCHIVED-tracker-2026-03.md` | March 2026 frontend-backend wiring tracker; tracked TECS-FBW-001 through TECS-FBW-ADMINRBAC across waves | Layer 1 (governance/units/ — 5 open residuals migrated by GOV-OS-003) |
| `ARCHIVED-audit-matrix-2026-03.md` | Codex vs Copilot audit reconciliation matrix; established the cross-audit merged baseline used to create the FBW tracker | Layer 1 unit records; Layer 2 decision ledger |
| `ARCHIVED-tracker-2026-Q2.md` | G-001–G-028 historical tracker; all entries CLOSED before March 2026 | Layer 3 execution log (historical milestone record) |

---

## 7. How to Add Future Archives

If a new governance document grows too large for operational use, the archival procedure is:

1. A governance unit must be authorized to perform the archive migration.
2. The governance unit adds the archival header:
   `> ARCHIVED: This document was superseded by <UNIT-ID> on <YYYY-MM-DD>. Read-only after this date.`
3. The archived file is placed here with an `ARCHIVED-` prefix and a date suffix.
4. The original location is replaced with a pointer stub or removed.
5. The archive README (this file) is updated with the new entry in the files table.
6. The closure is recorded in `governance/log/EXECUTION-LOG.md`.
7. **No new entries are ever added to the archived file after archival.**

---

## 8. Pointer Stubs at Legacy Locations

The following original file locations have been replaced with pointer stubs:

- `governance/gap-register.md` → stub pointing here
- `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` → stub pointing here
- `docs/governance/audits/2026-03-audit-reconciliation-matrix.md` → stub pointing here
- `docs/governance/IMPLEMENTATION-TRACKER-2026-Q2.md` → stub pointing here

These stubs clearly state their contents have been archived and direct human and AI readers
to the Layer 0 control plane and the canonical archive path.

---

*Layer 4 installed 2026-03-17 by GOV-OS-007. GOV-OS-001 design authority.*
