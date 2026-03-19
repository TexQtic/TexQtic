# Governance Linter

## Purpose

`pnpm run governance:lint` runs the minimal structural governance linter introduced by the
governance hardening workflow.

It is intentionally narrow.

It checks machine-verifiable structure only and does not attempt to automate historical,
materiality, chronology, or sequencing judgment.

## What It Checks

1. Layer 0 structural consistency in `OPEN-SET.md`, `NEXT-ACTION.md`, and `SNAPSHOT.md`
2. allowed status vocabulary in canonical governance files
3. required co-updates for obvious governance state transitions
4. archive-only closure violations where machine-detectable
5. governance/process diff-scope boundaries
6. verification taxonomy presence on changed closure, sequencing, or reconciliation records

## What It Does Not Decide

The linter does not auto-decide:

1. Case A/B/C/D/E historical classification
2. whether evidence is exact enough for Layer 1 backfill
3. whether repo reality is materially implemented
4. whether chronology is sufficient
5. whether snapshot/log-only reconciliation is the minimum truthful fix
6. product or operator sequencing choice among valid options

Those remain human-only judgment per recorded governance policy.

## Local Use

Run from the repo root:

```bash
pnpm run governance:lint
```

The command inspects the current working-tree/staged diff plus baseline Layer 0 consistency.

## CI Behavior

GitHub Actions runs the same command in `.github/workflows/governance-lint.yml`.

CI hard-fails only for structural violations.
Human-only judgment remains outside automation.

The workflow uploads `artifacts/governance-lint-report.json` for inspection on both pass and fail.
