# TEXQTIC EXECUTION & COMPLIANCE SYSTEM (TECS) — v1.6
> **Purpose:** Make every change verifiable, reversible, and governance-traceable.  
> **Core principle:** No "it seems fine." Every gap must end with **objective proof** (static + runtime + prod smoke as applicable).

---

## 0) Operating Mode (Always On)

### 0.1 Safe-Write Mode (Default)
- **Allowed actions:** edit only files explicitly allowlisted for the current task.
- **Forbidden actions:** editing any file not allowlisted; "drive-by refactors"; schema changes unless explicitly scoped; modifying prod DB without an explicit DB-apply step + proof.
- **Atomic history:** implementation and governance must be **separate commits**.

### 0.2 Hard Stop Conditions
Stop immediately (no further edits) if any of the following occur:
- Discovery discrepancies (unexpected additional call sites, policies, or routes outside stated scope).
- Any regression in **tenant login** or **admin login** during local runtime.
- Any prod smoke failure on endpoints listed in the Validation Checklist.
- Any formatter/tooling makes governance files dirty **without semantic intent** (must be reverted or fixed via tooling rules).

### 0.3 Prompt Discipline
Every execution prompt MUST include:
- **Allowlist** (files that may be modified)
- **Forbidden list** (files/areas that must not be touched)
- **Completion checklist**
- **Commit instructions** (2 commits: implementation + governance)
- **Stop-loss** instructions and what constitutes "BLOCKED"

---

## 1) Gap Lifecycle (Wave Discipline)

### 1.1 Discovery → Approval → Implementation → Validation → Close
A gap may only move forward in this order:
1. **Discovery** (blast radius + exact lines + risks)
2. **User approval** (scope lock)
3. **Implementation** (allowlist enforced)
4. **Static gates** (typecheck + lint baseline)
5. **Runtime validation** (local)
6. **Production smoke** (if change can affect prod behavior)
7. **Governance updates** (gap-register, wave board, execution log)
8. **Close**

### 1.2 Governance Law
A gap cannot be marked VALIDATED unless:
- static gates pass AND
- runtime validation passes AND
- required prod smoke passes (if applicable) AND
- governance entries include the proof artifacts.

---

## 2) Required Static Gates (Always)

Run and record:
- `pnpm -C server run typecheck` → **EXIT 0**
- `pnpm -C server run lint` → **baseline warnings unchanged OR explicitly approved**; **0 errors**

If gates fail: stop, fix, re-run.

---

## 3) Required Runtime Validation (Task-Specific)

### 3.1 Local Runtime Validation (Default Set)
When auth, RLS, middleware, or tenancy is touched:
- Start server locally and verify:
  - **T1** admin login → 200 + token present
  - **T2** control route (e.g., `/api/control/tenants`) → 200
  - **T3** tenant login → 200 + token present
  - **T4** tenant route (e.g., `/api/tenant/orders`) → 200 (or expected domain error like 404/400, but **not** 401/500)

Record: endpoint + status + note.

### 3.2 Production Smoke (Required When Risk Exists)
If any change affects:
- auth / login
- RLS policies
- db context helpers
- control plane / tenant provisioning
then prod smoke is mandatory.

Record:
- request payload (redacted)
- response status
- result category (PASS / FAIL / STUB / OUT-OF-SCOPE)

---

## 4) Repo Hygiene (Formatter/Markdown Discipline)

### 4.1 Markdown formatting control
To prevent "phantom diffs" in governance:
- Disable format-on-save for markdown in VS Code
- Ensure `.gitattributes` and `.prettierrc` keep stable line endings and prose wrapping

**Rule:** Governance files may only change when semantic content changes.  
If formatter changes them unintentionally: revert and fix tooling.

---

## 5) DB Apply Governance (Mandatory for SQL Changes)

### 5.1 DB Apply Requires Explicit Approval
Any change that requires running SQL against production must include:
- exact SQL snippet
- apply method (Supabase SQL editor or psql)
- rollback plan
- post-apply proof query outputs

### 5.2 Post-Apply Proof Is Non-Negotiable
No "assumed applied." Must verify:
- function defs / policies exist
- visibility checks pass under `app_user`
- prod smoke validates behavior

---

# ✅ Permanent Guardrails

---

## TECS-GR-007 — Tenant Context Integrity Proof (Permanent Anti-Regression)

### Why this exists
Tenant login regressions repeatedly occurred when:
- canonical tenant context key drifted (`app.org_id` vs `app.tenant_id`)
- `set_config(..., false)` introduced pooler/session bleed risk
- RLS made `users` or `memberships` invisible under `app_user`

### Trigger Conditions (When to run)
Mandatory whenever any of the following change:
- `server/prisma/supabase_hardening.sql`
- `server/prisma/rls.sql`
- any SQL functions: `set_tenant_context`, `set_admin_context`, `clear_context`
- any middleware/context code: `withDbContext`, `databaseContextMiddleware`, dbContext helpers
- any policies touching `users`, `memberships`, `tenants`
- any auth/login handler

### Required Evidence (Must be logged in wave-execution-log)
You must collect and paste the results of **all** three sections.

---

### GR-007.1 — Function Definition Proof (Production DB)
Run in Supabase SQL editor:

```sql
SELECT pg_get_functiondef('public.set_tenant_context(uuid,boolean)'::regprocedure);
SELECT pg_get_functiondef('public.clear_context()'::regprocedure);
```

**Pass criteria**

- `set_tenant_context` includes: `set_config('app.org_id', ..., true)`
- no occurrence of `set_config(..., false)` inside these helpers
- `clear_context` clears: `app.org_id`, `app.tenant_id` (optional), `app.is_admin` (tx-local `true`)

---

### GR-007.2 — RLS Visibility Proof (Production DB, app_user)

Run (replace values):

```sql
BEGIN;
SET LOCAL ROLE app_user;

SELECT public.set_tenant_context('<TENANT_UUID>'::uuid, false);

SELECT COUNT(*) AS users_visible
FROM public.users
WHERE email = '<TENANT_OWNER_EMAIL>';

SELECT COUNT(*) AS memberships_visible
FROM public.memberships m
JOIN public.users u ON u.id = m.user_id
WHERE u.email = '<TENANT_OWNER_EMAIL>'
  AND m.tenant_id = '<TENANT_UUID>'::uuid;

ROLLBACK;
```

**Pass criteria**

- `users_visible = 1`
- `memberships_visible >= 1`

If either is 0 → **STOP-LOSS triggered.**

---

### GR-007.3 — Production Login Smoke (UI or API)

Verify both tenants can log in:

- ACME owner login → 200 + token present
- WhiteLabel owner login → 200 + token present

Record:
- endpoint
- status
- timestamp
- tenant

---

### Stop-Loss Rule (Hard)

If any GR-007 proof fails:
- STOP immediately
- mark gap as BLOCKED
- open a Hotfix sub-gap (e.g., G-007C)
- do NOT mark VALIDATED until proof passes

---

### Optional Repo Enforcement (Recommended CI/Pre-commit)

Add a guard grep that fails if `set_config(..., false)` reappears in Prisma SQL:

- Fail if regex matches: `set_config\(.*,\s*false\)`
- Scope: `server/prisma/*.sql`

---

## 6) Commit & Reporting Protocol (Always)

### 6.1 Two Commits Required

**Implementation commit**
- Only allowlisted runtime code/SQL changes.
- Message includes: gap id, summary, excluded paths, gates.

**Governance commit**
- Only governance files (`governance/gap-register.md`, `governance/wave-*-board.md`, `governance/wave-execution-log.md`, and `TECS.md` if introduced).
- Must reference implementation commit hash.

### 6.2 Implementation Report (Must Include)

Every completion report must include:
- what changed
- static gates output
- runtime validation summary
- production smoke steps + what to verify manually (frontend + backend)
- known stubs/out-of-scope items explicitly labeled (A/B/C)
- follow-ons logged (if any)

---

## 7) Manual Production Validation Checklist (Required Section)

Include in every implementation report when UI is involved:

- Tenant login success (ACME + WhiteLabel)
- Control plane login success
- One tenant API call that requires dbContext (e.g., `/tenant/orders`)
- One control plane API call (e.g., `/control/tenants`)
- UI smoke: page loads, tenant branding correct, console errors checked
- Any affected buttons/flows: note "stub/unimplemented" vs "regression"

---

*End of TECS v1.6*
