# BLOCKED.md — Blocked / Deferred / Design-Gated Register

**Layer:** 0 — Control Plane  
**Authority:** GOV-OS-001-DESIGN.md  
**Last Updated:** 2026-03-18 (GOV-SEQUENCE-TECS-FBW-013)
**Max Size:** 80 lines (structural gate)

> Detailed register of all non-implementation-ready open units.  
> For the full open set (summary view), see `OPEN-SET.md`.  
> These units must NOT be sequenced for implementation without explicit resolution of the
> blocker, product decision, or design gate recorded below.

---

## Section 1 — BLOCKED (active technical blocker; cannot proceed without resolution)

| UNIT-ID | Blocker ID | Blocker Type | Description | Standing Instruction | Registered |
|---|---|---|---|---|---|
| TECS-FBW-013 | BLK-013-001 | MISSING_BACKEND_ROUTE | Limited B2B quote scope requires a tenant-plane RFQ submission route that does not yet exist | Do not open parent unit or activate CTA; implement backend prerequisite TECS-FBW-013-BE-001 first | 2026-03-18 |

---

## Section 2 — DEFERRED (product decision; not a defect; do not implement without authorization)

| UNIT-ID | Deferred Reason | Standing Instruction | Deferred |
|---|---|---|---|
| TECS-FBW-003-B | Future scope — escrow mutations + detail view | Do NOT implement; await product authorization | 2026-03-17 |

**Doctrine (D-010):** Deferred items are not bugs. They must not be reopened or implemented
without explicit product authorization recorded in `governance/decisions/PRODUCT-DECISIONS.md`.

---

## Section 3 — DESIGN_GATE (requires product + security decision before any work may begin)

| UNIT-ID | Gate Type | Gate Description | Registered |
|---|---|---|---|
| TECS-FBW-ADMINRBAC | Product + Security | HIGH security posture; must not proceed without explicit product + security approval | 2026-03-09 |

**To ungate TECS-FBW-ADMINRBAC:**  
A product decision and a security posture decision must both be recorded in:
- `governance/decisions/DESIGN-DECISIONS.md`
- `governance/decisions/SECURITY-DECISIONS.md`

Only after both decisions are approved may backend design begin.  
**Note:** PW5-U3 applied dead-button gating as a pre-authorization stop-gap only.
That is not the same as ADMINRBAC implementation authorization.

---

> **Rule:** Any prompt that sequences a unit from this register as OPEN (implementation-ready)
> without first recording the required resolution is a governance violation (per GOV-OS-001 Section 4.4).

---

## Section 4 — Recently Resolved Blockers (carry-forward context)

| UNIT-ID | Blocker ID | Resolution | Resolved | Evidence |
|---|---|---|---|---|
| TECS-FBW-006-B | BLK-006-B-001 | Tenant resolve route implemented, severity-capped at LEVEL_0 / LEVEL_1, and verified; parent unit may now open | 2026-03-18 | commits a2d8bfc · d212d0d · VERIFY-TECS-FBW-006-B-BE-001: VERIFIED_COMPLETE |
| TECS-FBW-002-B | BLK-FBW-002-B-001 | GET /api/tenant/trades implemented and verified | 2026-03-17 | commit 5ffd727 · VERIFY-TECS-FBW-002-B-BE-ROUTE-001: VERIFIED_COMPLETE |

TECS-FBW-006-B is now OPEN (implementation-ready). See `OPEN-SET.md` and the unit record.
