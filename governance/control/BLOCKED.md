# BLOCKED.md — Blocked / Deferred / Design-Gated Register

**Layer:** 0 — Control Plane  
**Authority:** GOV-OS-001-DESIGN.md  
**Last Updated:** 2026-03-19 (GOV-RECONCILE-LAYER0-TECS-FBW-003-B)
**Max Size:** 80 lines (structural gate)

> Detailed register of all non-implementation-ready open units.  
> For the full open set (summary view), see `OPEN-SET.md`.  
> These units must NOT be sequenced for implementation without explicit resolution of the
> blocker, product decision, or design gate recorded below.

---

## Section 1 — BLOCKED (active technical blocker; cannot proceed without resolution)

*(No units currently blocked. BLK-013-001 was resolved 2026-03-18 — see Section 4.)*

---

## Section 2 — DEFERRED (product decision; not a defect; do not implement without authorization)

*(No units currently deferred.)*

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
| TECS-FBW-013 | BLK-013-001 | Tenant RFQ submission route implemented and verified; parent unit may now open | 2026-03-18 | commit 451f45b · VERIFY-TECS-FBW-013-BE-001: VERIFIED_COMPLETE |
| TECS-FBW-006-B | BLK-006-B-001 | Tenant resolve route implemented, severity-capped at LEVEL_0 / LEVEL_1, and verified; parent unit may now open | 2026-03-18 | commits a2d8bfc · d212d0d · VERIFY-TECS-FBW-006-B-BE-001: VERIFIED_COMPLETE |
| TECS-FBW-002-B | BLK-FBW-002-B-001 | GET /api/tenant/trades implemented and verified | 2026-03-17 | commit 5ffd727 · VERIFY-TECS-FBW-002-B-BE-ROUTE-001: VERIFIED_COMPLETE |

TECS-FBW-013's blocker remains resolved. The parent unit later reached VERIFIED_COMPLETE;
see `OPEN-SET.md`, `SNAPSHOT.md`, and the unit record.
