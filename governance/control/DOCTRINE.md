# DOCTRINE.md — TexQtic Active Governance Doctrine

**Layer:** 0 — Control Plane  
**Authority:** GOV-OS-001-DESIGN.md  
**Doctrine Version:** v1.6  
**Last Updated:** 2026-04-04 (GOV-RECONCILE-LAYER0-CONTROL-FILE-CONSISTENCY-001)  
**Max Size:** 150 lines (structural gate)

> This file is the canonical summary of active doctrine invariants.  
> Enforcement-grade sources: `AGENTS.md` (repo root) · `.github/copilot-instructions.md`  
> If any conflict exists between this file and those sources, AGENTS.md and copilot-instructions.md govern.

---

## CONTROL-PLANE GOVERNANCE READING RULE

**MANDATORY for ALL prompts — governance, implementation, verification, and design alike.**

Before taking a governance action or checking governed-unit state, read these files first:

1. `governance/control/OPEN-SET.md` — exact current governed open set
2. `governance/control/NEXT-ACTION.md` — derived Layer 0 pointer or active governance exception
3. `governance/control/BLOCKED.md` — blocked, deferred, and design-gated posture
4. `governance/control/SNAPSHOT.md` — carry-forward session context (for session restores)

For general product execution sequencing and next-delivery priority, use the product-truth
authority stack:

1. `docs/product-truth/TEXQTIC-GAP-REGISTER-v2.md`
2. `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v2.md`
3. `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v2.md`

The `-v1` product-truth stack is historical baseline only. It must not be used as current
sequencing authority unless a later governance unit explicitly restores it.

**Rule:** Layer 0 owns governed-unit state, blockers, audit posture, and governance exceptions.
The product-truth authority stack owns general product execution sequencing. Files like
`governance/gap-register.md` and `docs/governance/IMPLEMENTATION-TRACKER-*.md` are historical
secondary references only. They must not be used to derive what is open, what governance
exception is active, or what product delivery comes next outside the product-truth stack.

---

## Active Doctrine Invariants

### D-001 — DB-Level RLS Is Mandatory
Database-level Row-Level Security is mandatory on all tenant-scoped tables.  
Application code must never trust client-supplied tenant or org identifiers.  
All RLS policies are source-controlled and repo-governed.

### D-002 — Admin Bypass Is Explicit and Audited
Super-admin operations that bypass RLS or tenant scope must be explicit, documented, and audited.  
Service-role queries that bypass RLS require authorised justification.

### D-003 — Repo-Governed DB Changes Only
All schema changes: apply SQL manually via `psql` → `prisma db pull` → `prisma generate` → restart.  
Prisma must be run via `pnpm -C server exec prisma`.  
`prisma migrate dev` and `prisma db push` are unconditionally forbidden.

### D-004 — One Logical Unit at a Time
One governed unit is active at a time. No unit may mix implementation + verification + governance.  
If a unit discovers it needs another unit's work, STOP and record the dependency.

### D-005 — One Atomic Commit Per Unit
Each governed unit closes with exactly one atomic commit touching only allowlisted files.  
No squashing of multiple units. No mixed-type commits.

### D-006 — No Governance in Implementation Units
Implementation units must not touch governance control-plane files during main work.  
Governance update (OPEN-SET.md, NEXT-ACTION.md) is the governance closure step only.

### D-007 — No Implementation in Governance Units
Governance units must not touch application code, schema, tests, or CI scripts.

### D-008 — Closed Units Stay Closed
A unit with terminal status (VERIFIED_COMPLETE or CLOSED) must not be reopened.  
If reopening is needed, a new governance unit must explicitly authorize it.

### D-009 — Design-Gated Items Must Not Be Forced Into Implementation
Units with status DESIGN_GATE must not be promoted to IN_PROGRESS without a matching decision  
recorded in `governance/decisions/DESIGN-DECISIONS.md`.

### D-010 — Product-Deferred Items Are Not Bugs
Units with status DEFERRED reflect product decisions, not defects.  
They must not be treated as bugs, reopened, or implemented without explicit product authorization.

### D-011 — org_id Is the Canonical Tenancy Boundary
Every DB query, API route, and service call accessing tenant-scoped data must scope by `org_id`.  
This boundary cannot be weakened, removed, or deferred under any circumstance.  
Cross-tenant queries are forbidden outside the control-plane super-admin context.

### D-012 — Secrets Are Never Printed
DB URLs, .env contents, passwords, JWTs, and API keys must never be logged or echoed.

### D-013 — Closure Requires Mandatory Post-Close Audit Output
A governance close step is incomplete unless it emits the mandatory post-close audit output in the
same closure operation or as an explicitly required closure sub-step completed immediately with the
close. The audit remains advisory only and must not authorize work. If a close is recorded without
the audit output, treat the closure procedure as incomplete and run an immediate governance
correction unit before any further sequencing, opening, or implementation work.

---

## Allowed Status Vocabulary (complete — no others permitted)

| Status | Terminal? |
|---|---|
| `OPEN` | No |
| `IN_PROGRESS` | No |
| `BLOCKED` | No |
| `DEFERRED` | No |
| `DESIGN_GATE` | No |
| `VERIFICATION_REQUIRED` | No |
| `VERIFIED_COMPLETE` | Yes |
| `CLOSED` | Yes |

---

## Governance OS Layer Model

| Layer | Location | Owns |
|---|---|---|
| 0 — Control Plane | `governance/control/` | Open set, next action, blockers (this directory) |
| 1 — Unit Records | `governance/units/` | Per-unit canonical status and evidence |
| 2 — Decision Ledger | `governance/decisions/` | Product, design, security decisions |
| 3 — Execution Log | `governance/log/` | Append-only history (not operational truth) |
| 4 — Archive | `governance/archive/` | Legacy frozen documents (read-only) |

Design documents live in `docs/governance/control/`. Operational files live here.

---

*Design authority: `docs/governance/control/GOV-OS-001-DESIGN.md`*
