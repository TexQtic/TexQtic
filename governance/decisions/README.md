# governance/decisions/ — Decision Ledger (Layer 2)

**Layer:** 2 — Decision Ledger
**Authority:** GOV-OS-001-DESIGN.md (Section 3.4)
**Bootstrapped:** 2026-03-17 (GOV-OS-005)

> Layer 2 owns all authorized decisions that gate or ungate governed units.
> Decisions are referenced from unit files by ID. They are **never** duplicated in unit files or logs.

---

## Files in This Layer

| File | Owns |
|---|---|
| `PRODUCT-DECISIONS.md` | Product scope decisions, feature gates, deferred-item authorization |
| `DESIGN-DECISIONS.md` | Architecture and design decisions that gate implementation |
| `SECURITY-DECISIONS.md` | Security posture decisions (admin boundaries, auth policy, RLS scope) |

---

## Canonical Read Order

Before acting on any unit or sequencing decision-gated work, read in this order:

1. `governance/control/DOCTRINE.md`
2. `governance/control/OPEN-SET.md`
3. `governance/control/NEXT-ACTION.md`
4. `governance/control/BLOCKED.md`
5. `governance/units/<UNIT-ID>.md` (relevant unit record)
6. `governance/decisions/<DECISION-FILE>.md` (relevant decision records)

**Layer 0 is always read first. Unit records are read before decision records.
Decision records refine decision-specific truth only. They do not supersede Layer 0 or Layer 1.**

---

## CRITICAL: Placeholder Does Not Equal Authorization

A decision record existing in this ledger **does not authorize implementation**.

A decision record with `Status: OPEN` means the decision is **required but not yet made**.
Only a record with `Status: DECIDED` and explicit operator approval constitutes authorization.

A unit may advance from its current status only when ALL of the following are true:
1. Its gating decision is recorded here with `Status: DECIDED`
2. A governance unit explicitly transitions the unit status in its unit record
3. `governance/control/OPEN-SET.md` and `governance/control/NEXT-ACTION.md` are updated

**No shortcut is valid. "Placeholder exists" does not equal "authorized."**

---

## Decision Record Schema (GOV-OS-001 Section 3.4)

Each decision uses this base schema plus required extended fields:

```
### <DECISION-ID>
Date: YYYY-MM-DD | null
Authorized by: <name> | null
Summary: <≤2 sentences>
Impact: <units gated or ungated by this decision>
Status: OPEN | DECIDED | SUPERSEDED
```

Extended fields recorded in each entry:
- **Required For** — unit(s) blocked on this decision
- **Current Known Posture** — what is known about this decision today
- **Does Not Authorize** — what this record alone cannot authorize
- **Next Required Step** — what must happen before the dependent unit can advance
- **Last Governance Confirmation** — date + unit that last confirmed this posture

---

*Layer model defined in `docs/governance/control/GOV-OS-001-DESIGN.md`*
*Bootstrapped by GOV-OS-005 (SHA: see git log)*
