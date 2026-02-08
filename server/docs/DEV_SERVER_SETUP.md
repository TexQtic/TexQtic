# Dev Server Setup Guide

**Canonical guide for starting the TexQtic backend dev server**

---

## Prerequisites

- **Node.js**: v22.x (recommended) or v20.x minimum
- **PostgreSQL**: 14+ or Supabase project
- **npm**: Comes with Node.js

---

## Quick Start (Copy/Paste)

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your configuration (see below)
npm run dev
```

---

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

This installs all required packages (Fastify, Prisma, etc.)

### 2. Configure Environment

```bash
cp .env.example .env
```

**Edit `server/.env`** and configure the following **required** variables:

#### 🔴 DATABASE_URL (Required)

PostgreSQL connection string using the **app_user** role (RLS enforced):

```dotenv
DATABASE_URL=postgresql://app_user:<PASSWORD>@<HOST>:5432/postgres
```

**Where to get:**
- **Supabase**: Dashboard → Settings → Database → Connection String (use "Session mode")
  - Create `app_user` role first (see `.env.example` for SQL)
- **Local Docker**: `postgresql://app_user:password@localhost:5432/postgres`

#### 🔴 JWT Secrets (Required)

Generate strong secrets (minimum 32 characters):

```bash
# Generate random secrets (macOS/Linux)
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Windows PowerShell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Set all four JWT secrets in `.env`:

```dotenv
JWT_ACCESS_SECRET=<your-generated-secret>
JWT_REFRESH_SECRET=<your-generated-secret>
JWT_ADMIN_ACCESS_SECRET=<your-generated-secret>
JWT_ADMIN_REFRESH_SECRET=<your-generated-secret>
```

#### 🔴 GEMINI_API_KEY (Required)

Get your API key from Google AI Studio:

1. Visit: https://aistudio.google.com/apikey
2. Create new API key
3. Copy to `.env`:

```dotenv
GEMINI_API_KEY=AIzaSy...yourkey
```

#### ✅ Optional Variables

These have defaults and can be left as-is for dev:

```dotenv
NODE_ENV=development
PORT=3001
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:5173
```

### 3. Database Migrations

**After configuring DATABASE_URL:**

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations (creates tables)
npm run db:migrate

# Seed initial data (admin user, feature flags)
npx prisma db seed
```

### 4. Start Dev Server

```bash
npm run dev
```

**What happens:**
1. Preflight check validates required env vars
2. If missing/invalid → clear error with fix instructions
3. If valid → server starts on http://localhost:3001

### 5. Verify Server is Running

```bash
curl http://localhost:3001/health
```

**Expected response:**
```json
{"status":"ok","timestamp":"2026-02-08T..."}
```

---

## Common Issues & Fixes

### ❌ "Missing .env file"

**Problem:** `npm run dev` fails with "PREFLIGHT FAILED: Missing .env file"

**Fix:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

---

### ❌ "DATABASE_URL invalid"

**Problem:** Preflight fails with "Invalid configuration: DATABASE_URL"

**Checklist:**
- [ ] Starts with `postgresql://`
- [ ] Uses `app_user` role (not `postgres`)
- [ ] Database is accessible from your machine
- [ ] Port is correct (usually 5432)

**Test connection:**
```bash
psql "$DATABASE_URL" -c "SELECT 1"
```

---

### ❌ "JWT secrets too short"

**Problem:** Preflight fails with "Must be at least 32 characters long"

**Fix:** Generate proper secrets (see Step 2 above)

---

### ❌ "GEMINI_API_KEY invalid"

**Problem:** Preflight fails for GEMINI_API_KEY

**Checklist:**
- [ ] Not still using placeholder `your-gemini-api-key-here`
- [ ] Copied from https://aistudio.google.com/apikey
- [ ] No extra spaces or quotes

---

### ❌ Port 3001 already in use

**Problem:** Server fails with "EADDRINUSE: address already in use 0.0.0.0:3001"

**Fix (Windows PowerShell):**
```powershell
$proc = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | 
        Select-Object -ExpandProperty OwningProcess | 
        Sort-Object -Unique
if ($proc) { Stop-Process -Id $proc -Force }
```

**Fix (macOS/Linux):**
```bash
lsof -ti:3001 | xargs kill -9
```

---

### ❌ Prisma Client not generated

**Problem:** TypeScript errors or "Cannot find module '@prisma/client'"

**Fix:**
```bash
npm run db:generate
```

---

## Recommended Dev Workflow

1. **Start server in one terminal:**
   ```bash
   cd server
   npm run dev
   ```

2. **Watch logs** (server auto-restarts on file changes)

3. **In another terminal, run migrations when schema changes:**
   ```bash
   npm run db:migrate
   ```

4. **View data:**
   ```bash
   npm run db:studio
   # Opens Prisma Studio at http://localhost:5555
   ```

---

## Environment Variable Reference

### Required (No Defaults)

| Variable | Purpose | Where to Get |
|----------|---------|--------------|
| `DATABASE_URL` | PostgreSQL connection (app_user) | Supabase dashboard or local setup |
| `JWT_ACCESS_SECRET` | Tenant JWT signing | Generate with `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | Tenant refresh tokens | Generate with `openssl rand -base64 32` |
| `JWT_ADMIN_ACCESS_SECRET` | Admin JWT signing | Generate with `openssl rand -base64 32` |
| `JWT_ADMIN_REFRESH_SECRET` | Admin refresh tokens | Generate with `openssl rand -base64 32` |
| `GEMINI_API_KEY` | Google AI API access | https://aistudio.google.com/apikey |

### Optional (Have Defaults)

| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `3001` | Server port |
| `HOST` | `0.0.0.0` | Bind address |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `JWT_ACCESS_EXPIRY` | `15m` | Tenant token lifetime |
| `JWT_REFRESH_EXPIRY` | `7d` | Refresh token lifetime |
| `KILL_SWITCH_ALL` | `false` | Emergency shutdown |

---

## Next Steps

Once dev server is running:

1. **Test health endpoint:**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Create admin user** (if not seeded):
   ```bash
   npx prisma db seed
   ```

3. **Admin login:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/admin/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@texqtic.com","password":"Password123!"}'
   ```

4. **Start frontend** (separate terminal):
   ```bash
   cd ..  # Back to root
   npm run dev
   ```

---

## Troubleshooting Checklist

If `npm run dev` fails, check in order:

1. [ ] Node.js version is 20+ (`node --version`)
2. [ ] Dependencies installed (`npm install`)
3. [ ] `.env` file exists (`ls -la .env`)
4. [ ] All required env vars set (preflight will tell you)
5. [ ] Database is accessible (`psql "$DATABASE_URL" -c "SELECT 1"`)
6. [ ] Prisma Client generated (`npm run db:generate`)
7. [ ] Migrations applied (`npm run db:migrate`)
8. [ ] Port 3001 is free (kill existing process)

---

## Architecture Notes

### Two-URL Database Pattern

TexQtic uses **two separate connection strings** for security:

1. **DATABASE_URL** (app_user)
   - Used by: Application runtime (dev + prod)
   - Role: `app_user` (non-superuser, RLS enforced)
   - Purpose: Ensures Row-Level Security policies are enforced

2. **MIGRATION_DATABASE_URL** (postgres owner)
   - Used by: Prisma Migrate, DDL operations
   - Role: `postgres` (owner, can bypass RLS)
   - Purpose: Schema changes, policy creation

**Why?** Supabase/managed Postgres defaults to superuser, which bypasses RLS. Using `app_user` ensures multi-tenant isolation is enforced at the database level.

### Preflight Check

`npm run dev` automatically runs a preflight validation:

- ✅ Validates required env vars exist
- ✅ Validates format (URL structure, minimum lengths)
- ✅ Fails fast with actionable instructions
- ✅ No network calls, no database access (pure validation)

**To skip preflight** (not recommended):
```bash
tsx watch src/index.ts
```

---

## Support

- **Governance docs:** `server/docs/`
- **Schema reference:** `server/prisma/schema.prisma`
- **API routes:** `server/src/routes/`
- **RLS policies:** `server/prisma/rls.sql`

---

**Version:** Tooling Exception (Feb 2026)  
**Purpose:** Standardize dev server bring-up
