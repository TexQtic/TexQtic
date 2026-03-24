---
unit_id: GOVERNANCE-MIGRATION-EXECUTION-POLICY-001
title: Decide canonical migration execution and remote validation policy
type: GOVERNANCE
status: CLOSED
wave: W5
plane: CONTROL
opened: 2026-03-23
closed: 2026-03-23
verified: null
commit: null
evidence: "REPO_TRUTH_CONFLICT_CONFIRMATION: older governance and ops records preserve psql-plus-resolve migration history while newer repo tooling and ops guidance preserve DIRECT_DATABASE_URL plus prisma migrate deploy as the modern tracked-migration path · PACKAGE_SURFACE_CONFLICT_CONFIRMATION: server/package.json and root package.json still expose db:migrate and db:push entry points that conflict with current safe-write and database-governance doctrine · RECENT_EXECUTION_FRICTION_CONFIRMATION: the just-completed certification unit required an explicit correction from raw SQL execution to repo-managed Prisma deploy in order to preserve ledger authority and avoid execution-path drift"
doctrine_constraints:
  - D-004: this unit is governance-only and may not execute migrations, modify env files, or change application, schema, or migration code
  - D-007: this unit may decide canonical doctrine only; any later script cleanup, docs cleanup, or package-surface remediation remains separately governed
  - D-011: the decision must preserve Supabase remote authority, Prisma ledger integrity, safe-write doctrine, and secret-safe execution rules without widening current Layer 0 delivery authorization
  - D-013: execution-path ambiguity, ledger ambiguity, and secret exposure risk must resolve to blocker behavior rather than operator guesswork
decisions_required:
  - GOV-DEC-GOVERNANCE-MIGRATION-EXECUTION-POLICY-001: DECIDED (2026-03-23, Paresh)
blockers: []
---

## Unit Summary

`GOVERNANCE-MIGRATION-EXECUTION-POLICY-001` records one bounded governance-only doctrine
decision.

It decides TexQtic's canonical policy for remote migration execution, Prisma-ledger preservation,
lawful use of direct SQL, execution-path switching, blocker conditions, secret-safe migration
handling, and mandatory post-migration remote database validation.

## Acceptance Criteria

- [x] Canonical execution path is fixed for repo-managed Prisma migrations
- [x] Lawful exception class is fixed for direct SQL / ops SQL execution
- [x] Forbidden execution paths are fixed explicitly
- [x] Execution-path switching doctrine is fixed explicitly
- [x] Mandatory blocker classes are fixed explicitly
- [x] Secret-safe migration handling is fixed explicitly
- [x] Mandatory post-migration remote validation sequence is fixed explicitly
- [x] Current Layer 0 authorization remains unchanged
- [x] Legacy conflicting scripts/docs are classified as follow-on remediation only

## Files Allowlisted (Modify)

- `governance/units/GOVERNANCE-MIGRATION-EXECUTION-POLICY-001.md`
- `governance/decisions/GOV-DEC-GOVERNANCE-MIGRATION-EXECUTION-POLICY-001.md`
- `governance/log/EXECUTION-LOG.md`

## Files Read-Only

- `governance/control/*`
- `docs/governance/**`
- `docs/ops/**`
- `package.json`
- `server/package.json`
- all application/product source files
- all env files
- all schema files
- all migration files
- all secret-bearing surfaces

## Findings / Root Cause

### 1. Repo truth currently contains two competing migration traditions

Older governance and implementation records preserve a manual pattern of `psql` apply followed by
`prisma migrate resolve --applied`, especially for RLS-heavy and ops-style changes.

Newer repo tooling and ops guidance preserve a safer tracked-migration path based on
`DIRECT_DATABASE_URL`, `prisma:preflight`, and `migrate:deploy:prod` for Prisma-managed deploys.

### 2. Package surfaces still advertise unsafe or superseded entry points

Current package manifests still expose `db:migrate`, `db:push`, and related shortcuts that conflict
with safe-write doctrine and with the stricter migration posture already recorded elsewhere.

### 3. Recent execution proved that migration-path ambiguity creates avoidable operator risk

The certification implementation stream had to stop and explicitly correct from a raw-SQL apply
path to the repo-managed Prisma deploy path so the migration ledger remained authoritative. That is
strong evidence that execution-path selection must be frozen up front and not improvised mid-unit.

### 4. Remote validation doctrine is currently fragmented across guides and trackers

Repo truth already contains pieces of the right rule set, but they are split across governance
trackers, ops guides, package scripts, and incident history. A single canonical policy artifact is
needed so future implementation prompts do not re-litigate migration method selection.

## Decision

Approved bounded doctrine result:

- tracked repo migrations must use the repo-managed Prisma migration path by default
- direct SQL remains lawful only as an explicitly classified exception path
- execution method must be fixed before migration work begins and may not switch silently mid-unit
- migration ambiguity, secret exposure risk, or ledger uncertainty must produce a blocker
- every remote migration execution must end with mandatory remote validation evidence

## Exact Policy Scope

This decision governs:

- files under `server/prisma/migrations/`
- ops SQL and standalone RLS/grant/corrective SQL execution posture
- Prisma ledger preservation rules
- approved migration command classes
- blocker behavior for migration execution ambiguity
- required remote validation after migration work

This decision does not itself authorize:

- script cleanup
- package cleanup
- docs cleanup
- schema changes
- migration execution
- env modification
- broader database-governance redesign

## Permanent Artifact Location

The permanent reusable governance artifact for this policy is:

- `governance/decisions/GOV-DEC-GOVERNANCE-MIGRATION-EXECUTION-POLICY-001.md`

This unit file records the bounded decision event only.

## Risks / Follow-Up

- `server/package.json` and root `package.json` still expose legacy-unsafe migration entry points;
  separate remediation is required if the repo should stop advertising them
- older governance docs still preserve historical psql-plus-resolve patterns that are truthful as
  history but no longer sufficient as canonical forward policy for tracked Prisma migrations
- any future migration TECS must freeze the execution method in its prompt/body or the blocker rule
  will trigger by design

## Atomic Commit

`[GOVERNANCE-MIGRATION-EXECUTION-POLICY-001] decide canonical migration execution and remote validation policy`