TEXQTIC — GitHub Copilot Governance Instructions (Safe-Write Always On)
CRITICAL: You are ALWAYS in “Safe-Write Mode”

If any rule is violated, you MUST STOP and output only the TexQtic Blocker Report.

0) Absolute Behavioral Override (NON-NEGOTIABLE)
SAFE-WRITE MODE — ALWAYS ON

Allowlist Enforcement: You may edit ONLY files explicitly listed in the prompt’s ALLOWLIST (Modify).

No File Creep: You must NOT create new files unless explicitly allowlisted.

No Hidden Fixes: You must NOT “fix environment,” “refactor,” or “clean up” beyond the task.

No Command Drift: You must use ONLY the “Approved Commands” in the prompt. No improvisation.

No Secrets: Never print DB URLs, .env contents, passwords, JWTs, API keys, or tokens.

Evidence Protocol: No claim is valid without raw terminal output (as specified).

Stop-Loss: If blocked, do not guess. Output the Blocker Report and wait.

1) TexQtic Repo Reality (Authoritative Context)
Tech Stack (current)

Monorepo: pnpm + Turbo

Frontend: Next.js 15 / React 19

Backend: Node 22 LTS preferred (Node 20 LTS acceptable; Node 24+ is NOT allowed unless explicitly approved)

Backend server: Fastify, typically on http://localhost:3001

Database: Supabase Postgres + RLS

ORM: Prisma (repo-pinned; do NOT use global/npx drift)

Tooling Rules (critical)

Use pnpm. Avoid npm install unless explicitly instructed.

Prisma commands MUST be run via:

pnpm -C server exec prisma …

Do NOT run:

npx prisma …

prisma db pull / db push / migrate dev
unless the prompt explicitly allows it.

1A) DATABASE AUTHORITY & URL GOVERNANCE (MANDATORY)

Canonical Database Definition

TexQtic uses Supabase-hosted PostgreSQL as the single source of truth.

Copilot MUST assume:

✅ Remote Supabase Postgres is authoritative

❌ Local Postgres is NEVER authoritative

❌ Prisma migrations are NEVER auto-applied without explicit approval

DATABASE_URL CLASSES (CRITICAL DISTINCTION)

Copilot MUST understand and respect the following URL roles:

1️⃣ DATABASE_URL — MIGRATION / RLS / SQL AUTHORITY

Used ONLY for:

psql -f prisma/*.sql

Applying RLS policies

Manual SQL inspection

Prisma db pull (schema introspection)

📌 Points to Supabase pooler (transaction or session)
📌 Must include sslmode=require

🚨 Copilot Rules

MUST NOT print this URL

MUST NOT rewrite this URL

MUST NOT assume it points to localhost

MUST NOT attempt to "fix" it

2️⃣ DIRECT_DATABASE_URL — PRISMA MIGRATION ENGINE ONLY

Used ONLY for:

prisma migrate deploy

prisma migrate resolve

Long-running DDL operations

📌 Direct connection (NOT pooler)
📌 Used only when explicitly instructed

🚨 Copilot Rules

NEVER invent this variable

NEVER switch Prisma to use it implicitly

If missing → BLOCK and report

3️⃣ SHADOW_DATABASE_URL — FORBIDDEN BY DEFAULT

❌ No shadow DB in TexQtic Phase 2

❌ Copilot must not enable or reference it

If Prisma demands it → STOP

PRISMA EXECUTION RULES (NON-NEGOTIABLE)

Prisma Command Matrix

Command	Allowed	Conditions
prisma db pull	✅	After SQL applied
prisma generate	✅	After schema confirmed
prisma migrate dev	❌	NEVER
prisma migrate deploy	⚠️	ONLY with explicit approval
prisma db push	❌	NEVER
prisma studio	⚠️	Read-only inspection only

REQUIRED EXECUTION SEQUENCE (WHEN SQL IS INVOLVED)

Copilot MUST follow this exact order and STOP if interrupted:

1. Apply SQL manually via psql using DATABASE_URL
2. Verify SQL success (no ERROR / ROLLBACK)
3. Run: prisma db pull
4. Run: prisma generate
5. Restart server

🚨 Any deviation → STOP

ABSOLUTE PROHIBITIONS

Copilot MUST NOT:

❌ Auto-apply Prisma migrations

❌ Infer database topology

❌ Switch database URLs

❌ Retry SQL execution with guessed flags

❌ Create helper scripts for DB access

❌ Modify .env files

❌ Log or echo connection strings

REQUIRED FAILURE MODE — DATABASE BLOCKER REPORT

If any of the following occur, Copilot MUST STOP and emit a blocker report:

DATABASE_URL missing

SSL error

Prisma asks for shadow DB

Migration requires schema change

RLS policy affects write path

Pooler connection rejects DDL

Prisma reports timeout or deadlock

Mandatory Response Format

🛑 DATABASE EXECUTION BLOCKER

Task:
[Task ID]

Blocker Type:
(Database URL / Prisma Migration / RLS Policy / Permission / Pooler Limitation)

Evidence:
- Command:
- Error:
- Affected table/policy:

Required User Action:
- [Explicit approval OR clarification]

No further actions taken.

COPILOT BEHAVIORAL OVERRIDE (ADD THIS VERBATIM)

STRICT DATABASE MODE ENABLED.
You are forbidden from modifying database configuration, Prisma migration state,
or connection URLs unless explicitly instructed.

If a database action requires inference, retries, or alternative execution paths,
you must STOP and emit a Database Execution Blocker report.

2) Pre-Implementation Protocol (MANDATORY)

Before implementing ANY change, you MUST:

A) Read & confirm constraints

Re-read this file (copilot-instructions.md)

Identify the prompt’s:

Objective

Allowlist (Modify + Read-only)

Forbidden actions

Approved command set

Stop conditions

Verification evidence required

B) Repo safety preflight (MUST RUN)

Run exactly:

git diff --name-only
git status --short


If ANY unexpected file is modified, STOP and report.

C) Staging safety rule (prevents “accidental commit creep”)

Before ANY commit:

You MUST run:

git status --short

You MUST ensure staged files contain ONLY allowlisted files.

If not, STOP and fix staging (do NOT proceed).

3) Secrets & Redaction (ZERO TOLERANCE)
Forbidden to print (ever)

.env contents (any line)

DB URLs / connection strings (including partial)

Passwords

JWTs or tokens (including first N chars)

API keys

Allowed

“Loaded DATABASE_URL (redacted)” (no characters shown)

HTTP status codes and non-secret response fields

For token verification: show presence only:

token: "<REDACTED>" (no length, no prefix)

If any secret is printed, STOP immediately and output the Blocker Report noting a Secrets Leak.

4) Governance Files (MANDATORY REVIEW — Only if applicable)

Governance files are located in /shared/contracts/.
Only review the ones relevant to the prompt scope.

Database & Schema Changes

Review:

/shared/contracts/db-naming-rules.md

/shared/contracts/schema-budget.md

/shared/contracts/rls-policy.md

Applies if modifying:

server/prisma/schema.prisma

SQL migration files

RLS policy files

table/column naming, enums, JSONB

API & Routes

Review:

/shared/contracts/openapi.control-plane.json

/shared/contracts/openapi.tenant.json

Applies if modifying:

server routes

request/response schema

auth middleware

plane boundaries

Event System

Review:

/shared/contracts/event-names.md

Applies if modifying:

event emission/handlers

projection pipelines

pub/sub topics

Architecture & Domains

Review:

/shared/contracts/ARCHITECTURE-GOVERNANCE.md

Applies if adding:
tables/routes/domains
control/tenant plane boundaries

5) TexQtic Doctrine v1.4 Execution Rules (KEY)
Atomic Commit Rule

One prompt = one atomic commit (unless the prompt explicitly allows multiple commits).
No mixing “fix + feature” in the same commit.

Minimal Diff Discipline

Make the smallest change that satisfies the success criteria.
No refactors, no formatting churn, no “cleanup.”
No “Optimism Claims”
Do not say “works” unless verification outputs are pasted.

6) Verification & Evidence Protocol (MUST FOLLOW)

Each prompt will specify evidence requirements.
If not specified, default minimum:

Preflight:
git diff --name-only
git status --short

Implementation gate:

git diff --name-only (must show only allowlisted files)
Runtime proof (as required):
server start line OR health check output
curl -i outputs (with secrets redacted)

Commit gate:

git status --short showing staged files
git show --stat HEAD

If any proof cannot be produced, STOP and output Blocker Report.

7) Stop-Loss Protocol (When to STOP)

You MUST STOP immediately if:

A required file is not in allowlist
A required dependency/package is missing
A command outside “Approved Commands” is required
An endpoint contract is ambiguous
Any output would reveal secrets
You would need a second hypothesis / “try another approach”
You feel tempted to refactor to “make it cleaner”
When blocked: output the Blocker Report only.

8) TexQtic Blocker Report Template (MANDATORY)

🛑 TEXQTIC EXECUTION BLOCKER DETECTED
Task ID: <prompt-id>
Status: Execution Halted

1) Blocker

Type: (Out-of-Scope File / Missing Dependency / Spec Ambiguity / Env Mismatch / Secrets Risk / Governance Conflict)
Description: (precise, short)

2) Technical Evidence

Command run: <exact command>
Observed output: <key lines only>
Location: <file:line OR endpoint>

3) Allowed Options Within Current Scope

Option A: <within allowlist>
Option B: <within allowlist>
If none: No alternative within current constraints

4) Required User Decision

Choose exactly one:
Expand allowlist: <files>
Approve dependency install: <package>
Clarify spec: <question>
Waiting for instruction.

9) Commit Message Requirements (TexQtic)

Commit message must be prompt-scoped and atomic:
prompt-<id> <short description>
Optional footer (only if asked):
Governance review: PASS/FAIL/N/A lines

10) TexQtic-Specific “Never Again” Rules (from incident history)

Never embed DB URLs in psql commands in chat logs.
Never use npx prisma if repo Prisma exists; use pnpm -C server exec prisma.
Never create “temporary scripts” unless explicitly allowlisted.
Never modify more than allowlisted files—even for “small fixes.”
Never commit with pre-staged files; always verify staged set first.