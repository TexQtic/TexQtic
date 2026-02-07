# Phase 3B: Database Role Setup for RLS Enforcement

## Problem

Development and testing were using the `postgres` owner role, which bypasses RLS even with `FORCE RLS` enabled. This meant cross-tenant isolation couldn't be verified during development.

## Solution

Implement **two-URL pattern** with separate database roles:

1. **`app_user` (runtime)**: Non-superuser role with RLS enforced
2. **`postgres` (migrations)**: Owner role for DDL operations only

This aligns development with production behavior and ensures RLS enforcement is testable.

## Setup Instructions

### Step 1: Create app_user Role in Supabase

1. Open **Supabase SQL Editor**
2. Run the SQL from [`prisma/create-app-user.sql`](./create-app-user.sql)
3. **IMPORTANT**: Replace `<STRONG_PASSWORD>` with a secure password before running
4. Store password securely (1Password, AWS Secrets Manager, etc.)

Expected output:

```
✅ app_user role configured correctly for RLS enforcement
```

### Step 2: Update Environment Variables

Copy your existing `.env` to `.env.local` if not already done:

```bash
cp .env .env.local
```

Update `.env.local` with two connection strings:

```bash
# Runtime connection (app_user - RLS enforced)
DATABASE_URL=postgresql://app_user:<PASSWORD>@<SUPABASE_HOST>:5432/postgres

# Migration connection (postgres owner - DDL operations)
MIGRATION_DATABASE_URL=postgresql://postgres.<PROJECT>:<PASSWORD>@<SUPABASE_HOST>:5432/postgres
```

**How to find your host:**

- Supabase Dashboard → Project Settings → Database → Connection string
- Host format: `aws-0-<region>.pooler.supabase.com` (use direct connection, port 5432)

### Step 3: Update Prisma Schema (Already Done ✅)

The schema now uses `directUrl` for migrations:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")           // Runtime (app_user)
  directUrl = env("MIGRATION_DATABASE_URL") // Migrations (postgres)
}
```

### Step 4: Regenerate Prisma Client

```bash
cd server
npx prisma generate
```

### Step 5: Verify RLS Enforcement

Run the Phase 3B verification script:

```bash
npx tsx prisma/verify-ai-budgets.ts
```

**Expected output:**

```
✅ ALL 8 TESTS PASSED

Including:
- TEST 6: Cross-tenant audit write blocked by RLS ✅
```

## What This Changes

### Before (postgres owner role)

```
❌ TEST 6: Cross-tenant audit write succeeded (RLS not enforcing!)
```

### After (app_user role)

```
✅ TEST 6: Cross-tenant write blocked by RLS policy (expected)
```

## Role Permissions Summary

### app_user (Runtime Role)

✅ **CAN**:

- SELECT, INSERT, UPDATE, DELETE on tenant-scoped tables:
  - `tenant_domains`, `tenant_branding`, `memberships`, `invites`
  - `tenant_feature_overrides`, `ai_budgets`, `ai_usage_meters`
  - `impersonation_sessions`, `password_reset_tokens`, `audit_logs`
- SELECT on reference tables: `feature_flags`
- Connect to database, use public schema
- Access sequences (for auto-increment columns)

❌ **CANNOT**:

- Bypass RLS (tenant isolation enforced)
- Access control-plane tables:
  - `tenants`, `users`, `admin_users`, `_prisma_migrations`
- Create/alter tables or schemas
- Grant privileges to other roles

### postgres (Migration Role)

✅ **CAN**:

- Everything (database owner)
- Create/alter/drop tables
- Create RLS policies
- Run Prisma migrations
- Bypass RLS for schema operations

❌ **SHOULD NOT**:

- Be used by application runtime
- Be exposed in production app servers

## Migration Command Changes

### Running Migrations

Prisma automatically uses `directUrl` for migrations:

```bash
# Development
npx prisma migrate dev --name <migration_name>

# Production
npx prisma migrate deploy
```

Both commands use `MIGRATION_DATABASE_URL` (postgres owner).

### Applying Security Hardening SQL

Use the postgres owner connection:

```bash
# Requires MIGRATION_DATABASE_URL set
npx tsx prisma/apply-hardening.ts
```

## Production Deployment

### Environment Variables (Vercel/Production)

Set **both** connection strings:

```bash
# Runtime (app_user - used by Next.js API routes)
DATABASE_URL=postgresql://app_user:<PASSWORD>@<HOST>:5432/postgres

# Migrations (postgres owner - used by build-time migrations)
MIGRATION_DATABASE_URL=postgresql://postgres.<PROJECT>:<PASSWORD>@<HOST>:5432/postgres
```

### CI/CD Pipeline

```yaml
# Example: GitHub Actions deployment
- name: Run migrations
  env:
    MIGRATION_DATABASE_URL: ${{ secrets.MIGRATION_DATABASE_URL }}
  run: npx prisma migrate deploy

- name: Start application
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }} # Uses app_user
  run: npm start
```

## Security Benefits

1. **RLS Enforcement**: Runtime role cannot bypass RLS policies
2. **Least Privilege**: app_user has minimal required permissions
3. **Defense in Depth**: Control-plane tables explicitly denied
4. **Testable Security**: Dev environment matches prod behavior
5. **Audit Trail Protection**: Append-only enforcement verified

## Troubleshooting

### "permission denied for table X"

**Cause**: app_user doesn't have privileges on that table

**Fix**: Run `create-app-user.sql` again to grant privileges, or add explicit GRANT for the table

### "Cannot find migration table"

**Cause**: Using app_user for migrations (should use MIGRATION_DATABASE_URL)

**Fix**: Ensure `MIGRATION_DATABASE_URL` is set to postgres owner connection

### "relation does not exist"

**Cause**: Migrations not run, or Prisma client not regenerated

**Fix**:

```bash
npx prisma migrate deploy
npx prisma generate
```

## Phase 3B Acceptance Criteria ✅

With app_user role configured:

- ✅ 8/8 verification tests pass
- ✅ Cross-tenant RLS enforcement verified
- ✅ Budget hard stop returns HTTP 429
- ✅ Usage metering tracks tokens + cost
- ✅ Audit logs are append-only
- ✅ Dev environment matches prod behavior

## Next Steps

After successful verification:

1. **Commit changes**:

   ```bash
   git add server/prisma/schema.prisma server/.env.example server/prisma/create-app-user.sql
   git commit -m "feat(db): implement two-URL pattern for RLS enforcement"
   ```

2. **Update production secrets** (Vercel/Railway/etc.):
   - Add `DATABASE_URL` (app_user)
   - Add `MIGRATION_DATABASE_URL` (postgres)

3. **Proceed to Phase 4**: Frontend extraction and deployment architecture
