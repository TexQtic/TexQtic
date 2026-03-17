# BLOCKED.md — Blocked / Deferred / Design-Gated Register

**Layer:** 0 — Control Plane  
**Authority:** GOV-OS-001-DESIGN.md  
**Last Updated:** 2026-03-17 (GOV-OS-002 bootstrap)  
**Max Size:** 80 lines (structural gate)

> Detailed register of all non-implementation-ready open units.  
> For the full open set (summary view), see `OPEN-SET.md`.  
> These units must NOT be sequenced for implementation without explicit resolution of the
> blocker, product decision, or design gate recorded below.

---

## Section 1 — BLOCKED (active technical blocker; cannot proceed without resolution)

| UNIT-ID | Blocker Type | Blocker Description | Registered |
|---|---|---|---|
| TECS-FBW-002-B | Backend dependency | GET /api/tenant/trades route not yet designed or implemented | 2026-03-07 |

**To unblock TECS-FBW-002-B:**  
A new implementation unit must design and implement the backend `GET /api/tenant/trades` route
(tenant-plane, `org_id`-scoped, RLS-enforced). That unit is a prerequisite before
TECS-FBW-002-B (frontend TradesPanel.tsx) may begin. The backend unit is not yet authorized.

---

## Section 2 — DEFERRED (product decision; not a defect; do not implement without authorization)

| UNIT-ID | Deferred Reason | Standing Instruction | Deferred |
|---|---|---|---|
| TECS-FBW-003-B | Future scope — escrow mutations + detail view | Do NOT implement; await product authorization | 2026-03-17 |
| TECS-FBW-006-B | Future scope — escalation mutations (upgrade/resolve/override) | Do NOT implement; await product authorization | 2026-03-17 |
| TECS-FBW-013 | Product decision — B2B Request Quote | Do NOT implement or remove UI (keep visually disabled); await product decision | 2026-03-07 |

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
