# AGENTS.md — TexQtic Codex / Copilot Operating Playbook

> **Canonical operating instructions for all automated agents working in this repository.**
> Read this file in full before making any change of any kind.

---

## 1. Mission

Agents operating in this repository exist to make precise, minimal, auditable changes to the TexQtic platform — without breaking tenant isolation, auth integrity, database safety, or governance contracts.

**The primary directive:** produce the smallest safe change that satisfies the task. No more.

Four non-negotiable constraints:
- **Correctness first.** A working, correct narrow fix beats a clean broad refactor.
- **Minimal diffs.** Change only what the task requires. Every extra line is a liability.
- **Preserve architecture.** Do not reshape boundaries, domains, or tenancy patterns unless explicitly instructed.
- **Preserve tenancy boundaries.** `org_id` isolation is constitutional. It cannot be weakened, removed, or deferred.

---

## 2. Project Context

| Dimension | Value |
|---|---|
| Frontend | Vite + React SPA (not file-based routing) |
| Backend | Fastify 5, running on `http://localhost:3001` |
| Database | Supabase-hosted PostgreSQL (remote; authoritative) |
| ORM | Prisma (repo-pinned via `pnpm -C server exec prisma`) |
| Package manager | pnpm + Turbo monorepo |
| Auth | Supabase Auth with RLS-sensitive behavior and realm separation |
| Tenancy key | **`org_id`** — the canonical tenant boundary throughout the system |
| Platform nature | **Not** an open listing marketplace; private B2B with isolated tenant contexts |
| Finance surfaces | Read-only audit/reporting only; must not imply money movement behavior |
| Node target | Node 22 LTS (Node 24+ is NOT allowed without explicit approval) |

Governance contracts live in `/shared/contracts/` and `/docs/contracts/`. Review the relevant contracts before touching their domains.

> **Active context:** The codebase is undergoing modularization and domain boundary refinement. Work in progress may exist across services. Do not assume any file is stable without reading it first. Do not speculate on future architecture — act only on what is currently present.

---

## 3. Default Working Mode

Every task follows this exact sequence. Do not skip steps.

### Step 1 — Inspect
- Read the relevant file(s) before writing anything.
- Understand the current implementation, not just the surface symptom.
- Check for adjacent dependencies (imports, service calls, DB queries).

### Step 2 — Trace
For any contract-touching change, trace the full call chain:

```
Frontend component → API client → Backend route → Service layer → Prisma → DB
```

Do not patch one layer without understanding what the adjacent layers expect.

### Step 3 — Plan
- Articulate the minimal change required.
- Identify which files must change and which must not.
- Name any governance contracts that apply (`openapi`, `db-naming-rules`, `rls-policy`, `event-names`).
- State any risks before writing a single line.

### Step 4 — Write
- Make only the changes identified in the plan.
- No unrelated refactors, formatting passes, or "while I'm here" edits.
- **Prefer the smallest safe fix over the cleanest possible refactor.** A correct narrow change ships. A broad elegant refactor breaks things.
- Only touch files directly related to the task. If a file is not in the plan, do not open it for editing.
- Preserve existing design patterns and architecture unless the task explicitly requires changing them.

### Step 5 — Validate
- Run the narrowest relevant validation first. Prefer filter-scoped commands:
  ```
  pnpm --filter <target> typecheck
  pnpm --filter <target> lint
  pnpm --filter <target> test
  ```
- Escalate to broader commands only when a narrow check is insufficient and you can justify why.
- Do not run repo-wide formatters or test suites opportunistically.

### Step 6 — Report
- Summarize: plan, root cause (if a bug fix), files changed, changes made, validation output, risks and follow-up.
- Stage only the allowlisted files.
- Propose one atomic commit message.

---

## 4. High-Risk Areas — Do Not Change Without Explicit Need

These areas require explicit user approval before any edit. Do not touch them opportunistically.

| Area | Why it is high-risk |
|---|---|
| Auth middleware and session logic | Breaks realm separation and RLS enforcement; affects all authenticated requests |
| `org_id` tenancy enforcement | Canonical tenancy boundary; any weakening is a data isolation failure |
| RLS-sensitive query logic | Incorrect queries can leak cross-tenant data silently |
| Payment / checkout critical logic | Financial correctness; cannot imply platform-held funds |
| `server/prisma/schema.prisma` | Schema drift breaks migrations, RLS policies, and downstream types |
| `server/prisma/migrations/` | Migration history is immutable once applied |
| `.env` / environment variables | Secrets and DB URL governance; never print or modify |
| Supabase RLS policies | Tenant data isolation; incorrect policy = data leak |
| `shared/contracts/` | Cross-system API and event contracts |
| `package.json` (any) | Version drift causes runtime incompatibilities |
| `middleware.ts` (root) | Affects all request handling |
| `server/src/plugins/` | Auth and Fastify plugin chain |
| Infra / deployment config | Vercel config, Docker compose, env-level changes affect all environments |
| Broad Prisma schema redesign | Cascades into migrations, generated types, API contracts, and runtime behavior |
| Finance-related components | Must not imply money movement or platform-held funds |

---

## 5. Multi-Tenancy / Data Safety Rules

1. **`org_id` is the canonical tenancy boundary.** Every DB query, API route, and service call that accesses tenant-scoped data MUST scope by `org_id`. There is no alternative tenancy key. Do not use `tenant_id` as a substitute.

2. **Never weaken tenant scoping.** Do not remove `org_id` filters, relax RLS policies, or add query paths that bypass tenant isolation — even temporarily.

3. **Preserve `org_id` isolation in all new code.** Any new route, service, or query that touches tenant data must include `org_id` as a required, validated input — not an optional one.

4. **RLS is not optional.** Supabase RLS is a constitutional constraint. Do not add service-role queries that bypass RLS without explicit, documented approval.

5. **Cross-tenant queries are forbidden** unless you are operating in the control-plane context with explicit super-admin auth. Control-plane and tenant-plane must remain separate.

6. **Flag cross-tenant risk immediately.** If any proposed change touches a query, route, or data path that could expose one tenant's data to another, stop and flag it before writing any code.

7. **Prefer explicit tenant-safe filters.** When adding or modifying DB queries, explicitly include `where: { org_id }` rather than relying on implicit RLS alone. Defense in depth.

8. **Do not create shared mutable state** across tenant contexts. Caches, in-memory stores, or global maps MUST be keyed by `org_id` at minimum.

---

## 6. Prisma / Database Rules

### Execution Model

- **Database authority:** Remote Supabase PostgreSQL. Never treat local Postgres as authoritative.
- **Prisma must be run via:** `pnpm -C server exec prisma <command>`
- **Never use:** `npx prisma`, `prisma db push`, `prisma migrate dev`, or global Prisma installs.

### Allowed Prisma Commands

| Command | Allowed | Condition |
|---|---|---|
| `prisma db pull` | ✅ | After SQL is applied and verified |
| `prisma generate` | ✅ | After schema is confirmed correct |
| `prisma migrate deploy` | ⚠️ | Explicit user approval only |
| `prisma migrate dev` | ❌ | Never |
| `prisma db push` | ❌ | Never |
| `prisma studio` | ⚠️ | Read-only inspection only |

### When SQL Changes Are Required

Follow this sequence exactly. Stop if any step fails.

1. Apply SQL manually via `psql` using `DATABASE_URL`
2. Verify SQL success — no `ERROR` or `ROLLBACK` in output
3. Run `pnpm -C server exec prisma db pull`
4. Run `pnpm -C server exec prisma generate`
5. Restart the server

### Database URL Rules

- **Never print, log, or echo** any connection string or `.env` value.
- `DATABASE_URL` is for SQL inspection, RLS policy application, and schema introspection only.
- `DIRECT_DATABASE_URL` is for Prisma migration engine only — do not use it implicitly.
- `SHADOW_DATABASE_URL` — **forbidden** in TexQtic. If Prisma demands it, stop and report.

### Schema Change Rules

Before proposing any `schema.prisma` change:
1. Explain precisely what is changing and why.
2. Identify every downstream impact: generated types, API response shapes, frontend consumers.
3. Confirm no opportunistic "while I'm here" field additions or type changes are included.
4. Get explicit approval before running any migration command.

### Stop Conditions

Stop and emit a blocker report if:
- Any DB URL is missing or invalid
- Prisma requests a shadow database
- A migration requires schema changes not in the plan
- An RLS policy affects the write path unexpectedly
- A pooler rejects DDL
- A schema change would break downstream API contracts not covered by the task

---

## 7. API / Backend Rules

1. **Backend is Fastify 5.** Do not introduce Express patterns or incompatible Fastify v4 APIs.

2. **All routes must respect the control-plane / tenant-plane separation.** Control-plane routes operate on all tenants; tenant-plane routes must be scoped to the authenticated `org_id`.

3. **Validate `org_id` at the route level** — not just in the service layer — for all tenant-scoped endpoints.

4. **API contracts are governed by:**
   - `/shared/contracts/openapi.control-plane.json`
   - `/shared/contracts/openapi.tenant.json`

   Do not change request/response shapes without updating the relevant OpenAPI contract.

5. **Do not add unauthenticated routes** without explicit approval.

6. **Trace before patching.** When a frontend API call breaks, trace the full path — do not patch the client without understanding what the server returns, and vice versa. Document both sides before changing a mismatch.

7. **Fix root cause, not symptom.** Do not mask a backend contract failure with a frontend workaround, a hardcoded fallback, or a silent error catch. Identify the actual failure point and fix it there.

8. **Health check endpoint (`GET /health`) must remain stable.** Do not alter its response shape.

9. **Error responses must follow the established error schema.** Do not introduce novel error shapes.

---

## 8. Frontend Rules

1. **TexQtic uses Vite + React SPA — not file-based routing.** Do not introduce Next.js, Remix, or file-system routing patterns.

2. **Routing is managed explicitly** in the React + router configuration. Verify existing route structure before adding routes.

3. **Do not patch missing backend behavior with mock-only UI.** If a backend endpoint does not exist or returns incorrect data, fix the backend — do not wrap the frontend in fake data, hardcoded stubs, or silent fallbacks. Exception: only if the task explicitly requests a mock-first approach.

4. **Finance surfaces are read-only.** Components that display financial data must not include action elements that imply money movement (e.g., withdraw, transfer, payout buttons) without explicit product approval.

5. **`org_id` must flow through all tenant-scoped API calls** from the frontend. Do not hardcode tenant identifiers.

6. **Auth state is managed by `authService` and the auth context.** Do not read auth tokens or session state outside of established patterns.

7. **Keep state and data-flow changes minimal.** When fixing a data display issue, change only the affected component and its direct data dependencies. Do not reshape the state model or context structure opportunistically.

8. **Do not add new npm dependencies** without explicit approval and a stated reason.

9. **Component boundaries matter.** `ControlPlane/` components are for super-admin contexts only. `Tenant/` components are for tenant-scoped views. Do not mix them.

10. **Preserve existing design and UI patterns.** Match the component style, spacing conventions, and interaction patterns already present in the surrounding code.

11. **Do not run `vite build` or broad type-checks** across the full repo as part of a single-file patch. Run narrowly scoped validation only.

---

## 9. Validation Rules

**Validation hierarchy — always prefer narrower over broader:**

```
pnpm --filter <target> typecheck     ← preferred first
pnpm --filter <target> lint
pnpm --filter <target> test
```

Escalate to broader commands only when a narrower check is insufficient and the reason is explicit.

1. **Run the narrowest validation first.** For a single-file change, run the type-check or unit test for that file or package only. Do not trigger full repo builds opportunistically.

2. **Type errors must be resolved, not suppressed.** Do not add `// @ts-ignore` or `any` casts as a workaround without explicit approval.

3. **Lint only the changed files or package.** Do not run formatters or linters across the entire repo.

4. **Unit tests must pass before commit.** If the change affects a tested module, run the relevant test suite and confirm it passes.

5. **Do not silently skip failing tests.** If a test fails unexpectedly, stop and report — do not delete, comment out, or skip the test.

6. **Health check after server changes.** After backend changes, verify `GET /health` returns 200 before reporting completion.

---

## 10. Commit Discipline

1. **One prompt = one atomic commit.** Do not mix features, fixes, and refactors in the same commit.

2. **Stage only the allowlisted files.** Before committing, run `git status --short` and confirm only intended files are staged.

3. **Commit message format:**
   ```
   [TEXQTIC] <scope>: <short description>
   ```
   Examples:
   - `[TEXQTIC] backend: fix org_id scoping on invoice route`
   - `[TEXQTIC] frontend: add dispute status badge to tenant view`
   - `[TEXQTIC] governance: add repo agent operating playbook`

4. **Do not commit without evidence.** Required before committing:
   - `git diff --name-only` — must show only allowlisted files
   - Runtime proof (server start line or health check output, where applicable)

5. **Do not auto-commit.** Propose the commit message and wait for user approval unless the prompt explicitly authorizes automatic commit.

6. **Do not amend or force-push** without explicit instruction.

---

## 11. Forbidden Actions

The following are unconditionally forbidden:

| Action | Reason |
|---|---|
| Printing `.env` contents, DB URLs, passwords, JWTs, or API keys | Secrets governance — zero tolerance |
| Modifying files outside the prompt's explicit allowlist | No file creep |
| Running `prisma migrate dev` or `prisma db push` | Schema mutation without migration trail |
| Using `npx prisma` instead of `pnpm -C server exec prisma` | ORM version drift |
| Installing packages without approval | Version and supply-chain safety |
| Upgrading package versions without approval | Runtime compatibility |
| Removing `org_id` filters from any query | Tenant isolation is constitutional |
| Adding unauthenticated routes without approval | Auth integrity |
| Mixing control-plane and tenant-plane logic | Plane separation doctrine |
| Creating "temporary" scripts or helper files not in allowlist | No file creep |
| Refactoring unrelated code while patching a specific bug | Minimal diff discipline |
| Suppressing TypeScript errors with `@ts-ignore` or `any` casts | Type safety |
| Running broad formatters (Prettier, ESLint fix-all) across the repo | Diff pollution |
| Committing with unstaged unintended files | Atomic commit discipline |
| Deleting files without an explicit need stated in the task | Irreversible without git history review |
| Implying money movement in finance UI components | Product policy |
| Touching auth/session logic without explicit approval | Auth integrity |
| Modifying RLS policies without explicit approval | Tenant isolation |
| Changing infra/deployment config without explicit approval | Environment-wide impact |
| Mass-formatting files unrelated to the task | Diff pollution; obscures real changes |

---

## 12. Required Output Format For Every Task

Every task response must include all of the following sections, in order:

```
### Plan
[What change is being made and why. Which files will change. Which governance contracts apply.]

### Findings / Root Cause
[What was observed during inspection. Current behavior vs. expected behavior.
Root cause if this is a bug fix. "No issue found" is a valid finding.]

### Files to Change
[Exact list of files that will be modified, created, or deleted — stated before writing.]

### Changes Made
[What was actually changed. Diff summary or description of each edit.]

### Validation Run
[Commands run. Full output or key lines. Pass / Fail status for each.]

### Risks / Follow-up
[Edge cases, downstream effects, or concerns the user should review.
Any follow-up tasks that are out of scope for this prompt.]

### Commit Message
[TEXQTIC] <scope>: <brief summary>
```

If any section cannot be completed (e.g., validation blocked), emit a blocker report instead of proceeding:

```
🛑 TEXQTIC EXECUTION BLOCKER DETECTED
Task: <description>
Blocker Type: <type>
Evidence: <command> → <output>
Required User Decision: <explicit question or approval needed>
No further actions taken.
```

---

*Last updated: 2026-03-06 — TexQtic governance corpus, main branch.*
