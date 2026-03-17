# docs/governance/control/ — Design Documents

This directory holds governance **design documents**.

The **operational control-plane files** live in `governance/control/` (repo root level).

---

## Operational Control-Plane Files — Read These First

All prompts (governance, implementation, verification, design) must read the following files
before consulting any large legacy governance artifact:

| File | Purpose | Max Size |
|---|---|---|
| [`governance/control/DOCTRINE.md`](../../governance/control/DOCTRINE.md) | Active doctrine invariants + control-plane-first rule | 150 lines |
| [`governance/control/OPEN-SET.md`](../../governance/control/OPEN-SET.md) | Exact current governed open set | 50 lines |
| [`governance/control/NEXT-ACTION.md`](../../governance/control/NEXT-ACTION.md) | Exactly one authorized next action | 20 lines |
| [`governance/control/BLOCKED.md`](../../governance/control/BLOCKED.md) | Blocked / deferred / design-gated register | 80 lines |
| [`governance/control/SNAPSHOT.md`](../../governance/control/SNAPSHOT.md) | Carry-forward session context | 100 lines |

---

## Design Documents in This Directory

| File | Purpose |
|---|---|
| [GOV-OS-001-DESIGN.md](./GOV-OS-001-DESIGN.md) | Governance OS architecture design (CLOSED) |
| [README.md](./README.md) | This file — directory index + location guide |

---

## Naming Convention Note

The GOV-OS-002 bootstrap prompt suggested these file names under `docs/governance/control/`:

| Prompt-suggested name | Canonical name (GOV-OS-001) | Location |
|---|---|---|
| `current-doctrine.md` | `DOCTRINE.md` | `governance/control/` |
| `governed-open-set.md` | `OPEN-SET.md` | `governance/control/` |
| `current-next-action.md` | `NEXT-ACTION.md` | `governance/control/` |
| `blocked-deferred-register.md` | `BLOCKED.md` | `governance/control/` |

**GOV-OS-001 is the design authority.** Per GOV-OS-002's own instruction: "If GOV-OS-001
established a different exact naming convention, follow GOV-OS-001."

GOV-OS-001 separated design docs (`docs/governance/control/`) from operational files
(`governance/control/`). That separation is preserved here.

---

## Legacy Governance Files (Historical — Secondary Reference Only)

These files are preserved but are **not** the operational source of truth after GOV-OS-002:

- `governance/gap-register.md` — historical GOVERNANCE-SYNC log
- `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` — wave execution history
- `docs/governance/IMPLEMENTATION-TRACKER-2026-Q2.md` — Q2 historical tracker
- `docs/governance/audits/2026-03-audit-reconciliation-matrix.md` — audit reconciliation

These files will be moved to `governance/archive/` in a future migration phase (GOV-OS-001 Phase 5).
Until then: read for historical context only. Never use them to derive "what is open" or "what is next."
