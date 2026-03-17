# governance/log/ — Execution Log (Layer 3)

**Layer:** 3 — Execution Log (Append-Only)
**Authority:** GOV-OS-001-DESIGN.md (Section 3.5)
**Bootstrapped:** 2026-03-17 (GOV-OS-006)

> Layer 3 is append-only historical context. It is **NOT** operational truth.
> Current operational truth lives exclusively in Layer 0 (`governance/control/`).

---

## Purpose

This layer is the canonical append-only record of completed governance units, governance
bootstrap milestones, governance syncs, and sequencing-relevant governance events.

It answers:
- What governance events have occurred, in what order, and with what result?
- What SHAs correspond to which governance milestones?
- Which layers had truth updated by each event?

It does **NOT** answer:
- What is currently open? → See `governance/control/OPEN-SET.md`
- What is the next authorized action? → See `governance/control/NEXT-ACTION.md`
- What decisions gate a unit? → See `governance/decisions/`
- What is a unit's current status? → See `governance/units/<UNIT-ID>.md`

---

## Files in This Layer

| File | Owns |
|---|---|
| `EXECUTION-LOG.md` | Append-only chronological governance event record |

No other files belong to Layer 3 unless explicitly authorized by a governance unit referencing
GOV-OS-001 Section 3.5 as design authority.

---

## Canonical Read Order (Layer 3 Is Last)

The execution log is consulted **only when historical sequencing context is needed**.
Always read Layers 0–2 before consulting Layer 3.

1. `governance/control/DOCTRINE.md` — active doctrine invariants
2. `governance/control/OPEN-SET.md` — current open portfolio (exact, controlled)
3. `governance/control/NEXT-ACTION.md` — exactly one authorized next action
4. `governance/control/BLOCKED.md` — blockers, deferred units, design gates
5. relevant `governance/units/<UNIT-ID>.md` — per-unit canonical truth
6. relevant `governance/decisions/*.md` — decisions that gate units
7. `governance/log/EXECUTION-LOG.md` — **only** when historical sequencing context is needed

**Layer 3 must never override Layer 0, Layer 1, or Layer 2 truth.**
If log content appears inconsistent with Layer 0, stop and run a governance reconciliation
unit before any sequencing action.

---

## Critical Rule: Log ≠ Operational Truth

A `Status: CLOSED` or `Status: VERIFIED_COMPLETE` entry in this log does not establish
current operational control-plane state. It records that the event occurred.

Only `governance/control/OPEN-SET.md` and `governance/units/<UNIT-ID>.md` determine
whether a unit is currently open, closed, or in transition.

Archive-scale legacy files (`governance/gap-register.md`,
`docs/governance/IMPLEMENTATION-TRACKER-*.md`) remain preserved as historical secondary
references. They are not first-read operational truth. Do not use them to derive "what is
open" or "what is next."

---

## How to Append New Entries

When closing a governance unit, append exactly one entry to `EXECUTION-LOG.md`:

```
### <UNIT-ID> — <YYYY-MM-DD>
Type: <IMPLEMENTATION | VERIFICATION | GOVERNANCE | DESIGN | POLICY>
Status: <CLOSED | VERIFIED_COMPLETE>
Commit: <SHA> | N/A
Title: <one-line title matching unit record or prompt>
Summary: <≤3 sentences: what was done, what changed, what was closed>
Layer Impact: <Layer 0 | Layer 1 | Layer 2 | Layer 3 | Historical only> — <brief description>
Notes: <constraints, cautions, or references applicable after closure — or "none">
Refs: <governance/units/<ID>.md | docs/... | governance/control/ — canonical reference>
```

**Append rules (non-negotiable):**
- Entries are always appended at the end — never inserted, prepended, or modified.
- One entry per closed unit. Do not combine two units in one entry.
- Always use the controlled status vocabulary (CLOSED or VERIFIED_COMPLETE for terminal state).
- Do not embed decision record content in log entries — reference decisions by ID only.
- The log may grow without bound. It is audit history, not operational truth.
