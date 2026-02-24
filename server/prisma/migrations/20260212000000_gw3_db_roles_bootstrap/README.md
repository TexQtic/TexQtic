# G-W3-DB-ROLE-BOOTSTRAP-001 — Postgres Role Bootstrap

**Migration:** `20260212000000_gw3_db_roles_bootstrap`  
**Type:** Infrastructure prerequisite (no table changes)  
**Required by:** G-020, G-021, G-022 (and all future governance migrations)

## Purpose

Creates the two runtime Postgres roles that all TexQtic governance migrations reference in `GRANT` and `CREATE POLICY` statements:

| Role | Purpose | BYPASSRLS |
|---|---|---|
| `texqtic_app` | Tenant-facing API runtime. Used by `DATABASE_URL`. | `false` (CRITICAL) |
| `texqtic_admin` | Control-plane admin operations. Used by `DIRECT_DATABASE_URL`. | `false` |

Both roles are created with `NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS`.

## Idempotency

Uses `IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ...)` guards.  
Safe to run multiple times. If a role already exists it is skipped with a NOTICE.

## Stop Condition

If the connecting DB user lacks `CREATE ROLE` privilege, this migration will fail with:
```
ERROR: must be superuser to create role
```
**Resolution:** Create both roles once in the Supabase SQL Editor using an elevated session, then re-run this migration — it will skip creation and pass verification.

## What This Does NOT Do

- Does **not** create any tables
- Does **not** modify any existing RLS policies
- Does **not** grant table-level privileges (those remain per-migration as designed)
- Does **not** grant `SUPERUSER` or `BYPASSRLS` to any role
