# GOV-DEC-GOVERNANCE-MIGRATION-EXECUTION-POLICY-001

Decision ID: GOV-DEC-GOVERNANCE-MIGRATION-EXECUTION-POLICY-001
Title: Decide canonical migration execution and remote validation policy
Status: DECIDED
Date: 2026-03-23
Authorized by: Paresh

## Decision Summary

TexQtic approves one bounded migration-execution doctrine decision that preserves remote Supabase as
the single database authority, preserves Prisma ledger integrity, fixes when Prisma deploy is
mandatory, fixes when direct SQL remains lawful, and requires mandatory post-migration remote
validation.

This decision does not execute migrations and does not authorize schema changes.

## Why This Decision Exists

Current repo truth preserves two real but competing migration traditions:

- older governance history uses `psql` apply plus `prisma migrate resolve --applied`
- newer ops tooling uses `DIRECT_DATABASE_URL`, `prisma:preflight`, and `prisma migrate deploy`

Recent bounded execution friction proved that leaving the choice implicit causes avoidable
governance drift, ledger uncertainty, and operator risk.

## Non-Negotiable Preserved Rules

The following remain unchanged:

- remote Supabase is authoritative
- `DATABASE_URL` and `DIRECT_DATABASE_URL` remain distinct roles
- `SHADOW_DATABASE_URL` remains forbidden unless separately governed
- repo-pinned Prisma only; no `npx prisma`
- `prisma migrate dev` and `prisma db push` remain forbidden for governed remote execution
- secrets must never be printed, echoed, copied into chat, or committed

## Canonical Migration Classes

TexQtic now recognizes exactly two lawful migration execution classes.

### 1. Repo-Managed Prisma Migration Class

Use this class when the change is represented by repo-tracked Prisma migration artifacts under:

- `server/prisma/migrations/`

This class is mandatory when any of the following are true:

- the change must be reflected in `public._prisma_migrations`
- ordered repo migration history must remain authoritative for later teammates or deployments
- the change is being shipped as a normal Prisma migration rather than a standalone ops SQL repair
- pending repo migrations already exist and must be applied in canonical order

Approved canonical path for this class:

1. `pnpm -C server prisma:preflight`
2. `pnpm -C server migrate:deploy:prod`

Equivalent lower-level invocation is allowed only when the prompt explicitly fixes the env-loading
method and preserves the same doctrine:

- `pnpm -C server exec prisma migrate deploy`

Raw `psql -f` is not the canonical primary apply path for this class.

## 2. Direct SQL Exception Class

Use this class only when the change is intentionally outside the repo-managed Prisma deploy path,
such as:

- `server/prisma/ops/` SQL
- standalone RLS policy/grant/backfill/corrective SQL
- emergency/manual SQL explicitly authorized as a non-deploy exception

This class is lawful only when the execution plan explicitly states all of the following before any
execution occurs:

- why the change is not using the repo-managed Prisma deploy path
- whether Prisma ledger impact is `none` or requires explicit reconciliation
- exact remote verifier expectations
- exact post-apply validation sequence

If direct SQL corresponds to a repo migration that should remain tracked in
`public._prisma_migrations`, then skipping the repo-managed path is forbidden unless the prompt or
governance decision explicitly authorizes a manual reconciliation strategy.

## Forbidden Execution Paths

The following are not canonical and may not be used as governed remote migration paths:

- `pnpm -C server exec prisma migrate dev`
- `pnpm -C server exec prisma db push`
- `npx prisma ...`
- root or server `db:migrate` shortcuts when they resolve to `migrate dev`
- root or server `db:push` shortcuts
- any migration command that requires printing or pasting secrets into chat
- any deploy attempt against the transaction pooler

Current package scripts that still expose these paths are treated as legacy or unsafe surfaces,
not as forward-authoritative policy.

## Execution Method Freeze Rule

Migration method must be fixed at Opening or in the approved implementation prompt before any apply
step begins.

Once the unit starts, switching between:

- repo-managed Prisma deploy
- direct SQL / manual reconciliation

is forbidden unless explicit user authorization updates the plan after the prior state is examined.

No silent path-switching is allowed in response to friction, convenience, or guesswork.

## Mandatory Blocker Conditions

Migration execution must stop and emit a blocker if any of the following are true:

- it is unclear whether the work belongs to the repo-managed Prisma class or the direct SQL class
- `DIRECT_DATABASE_URL` is missing, unsafe, or points to the transaction pooler for a deploy path
- `DATABASE_URL` is missing for a direct-SQL path that requires it
- `SHADOW_DATABASE_URL` is requested or implied unexpectedly
- repo migration history and intended apply method are out of sync
- pending earlier tracked migrations exist but the proposed method would leapfrog ledger order
- exact ledger posture after execution is unspecified
- execution would require secrets to be pasted, echoed, or validated in chat
- remote validation proof cannot be produced
- a mid-unit path switch is proposed without explicit authorization

## Secrets Rule

Migration execution is secret-safe only if secrets remain outside chat output.

Approved posture:

- load env variables locally or via approved wrapper scripts
- report presence/type only in redacted form
- never quote, paste, or echo the actual values

If a secret is pasted into chat, it must not be repeated or used as command text in chat output.
That event converts the task into a blocker unless execution can continue through an env-loaded,
non-echo path with explicit user direction.

## Mandatory Post-Migration Remote Validation

Every governed remote migration execution must end with all applicable evidence below.

### A. Apply Evidence

One of:

- Prisma deploy success showing all intended migrations applied successfully
- direct SQL apply success showing no `ERROR` and no `ROLLBACK`

### B. Remote Object / Policy Proof

Read-only remote verification must prove the intended remote state exists, such as:

- table/view/index existence
- policy existence and RLS posture
- grant posture
- expected corrective/backfill state

If the SQL file contains an embedded verifier or `DO` block, that verifier is required but is not
the only acceptable final proof when additional remote object checks are materially needed.

### C. Ledger Proof

One of:

- repo-managed Prisma class: `public._prisma_migrations` proves the intended tracked migration set
  is applied and no unintended pending state remains
- direct SQL exception class: explicit proof that no ledger change was intended, or exact proof of
  the separately authorized reconciliation step such as `prisma migrate resolve --applied`

### D. Prisma Alignment Proof

When schema or Prisma surfaces are affected:

1. `pnpm -C server exec prisma db pull`
2. `pnpm -C server exec prisma generate`

### E. Focused Runtime / Test Proof

Run the narrowest focused validation required by the unit after alignment succeeds.

### F. Governance Recording Proof

The execution record must state:

- which migration class was used
- why that class was lawful
- what remote validation proved
- what ledger posture resulted

## Policy For Future Implementation Prompts

Future migration-bearing prompts must explicitly freeze all of the following before execution:

- migration class: `repo-managed-prisma` or `direct-sql-exception`
- approved command sequence
- ledger posture after execution
- required remote validation evidence
- blocker conditions if the plan becomes ambiguous

If a prompt does not freeze those points, the correct response is a blocker rather than an
operator guess.

## Legacy Surface Classification

The following repo truths remain historically valid but are not sufficient as forward policy by
themselves:

- historical docs centered on `psql` plus `prisma migrate resolve --applied`
- package scripts that route `db:migrate` to `migrate dev`
- package scripts that expose `db:push`
- older docs that say only `npm run db:migrate`

These are candidates for later remediation. This decision does not modify them.

## Next Governance Recommendation

Recommended later follow-on only if desired:

- one bounded remediation unit to retire or relabel legacy-unsafe migration scripts and stale docs

That recommendation is not an opening and does not change current Layer 0 authority.