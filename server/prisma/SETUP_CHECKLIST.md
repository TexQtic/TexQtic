# Phase 3B: Setup Checklist - Restricted Database Role

## ✅ What's Already Done

1. ✅ Created `create-app-user.sql` with complete role setup
2. ✅ Updated `schema.prisma` with `directUrl` configuration
3. ✅ Updated `.env.example` with two-URL pattern documentation
4. ✅ Created `verify-role-setup.ts` to confirm configuration
5. ✅ Created `DB_ROLE_SETUP.md` with detailed documentation
6. ✅ Regenerated Prisma client with new schema

## 📋 What You Need to Do NOW

### Step 1: Create app_user Role in Supabase (5 minutes)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your TexQtic project

2. **Open SQL Editor**
   - Left sidebar → SQL Editor → New query

3. **Copy SQL**
   - Open: `server/prisma/create-app-user.sql`
   - Copy entire contents

4. **Replace Password**
   - Find: `<STRONG_PASSWORD>`
   - Replace with: A secure password (min 16 chars, mixed case, numbers, symbols)
   - **SAVE THIS PASSWORD** (you'll need it in Step 2)

5. **Run SQL**
   - Paste into Supabase SQL Editor
   - Click "Run" or press Ctrl+Enter
   - **Expected output**:
     ```
     NOTICE: Created role: app_user
     NOTICE: ✅ app_user role configured correctly for RLS enforcement
     ```

### Step 2: Update .env File (2 minutes)

1. **Get Supabase Host**
   - Supabase Dashboard → Project Settings → Database
   - Copy "Host" from Connection string section
   - Example: `aws-0-ap-northeast-1.pooler.supabase.com`

2. **Get Project Ref**
   - From same page, find "Project Ref"
   - Example: `abcdefghijklmnop`

3. **Update server/.env**

   Open `server/.env` and **replace** the DATABASE_URL section with:

   ```bash
   # Runtime connection (app_user - RLS enforced)
   DATABASE_URL=postgresql://app_user:<YOUR_NEW_PASSWORD>@<YOUR_HOST>:5432/postgres

   # Migration connection (postgres owner - DDL operations)
   MIGRATION_DATABASE_URL=postgresql://postgres.<YOUR_PROJECT_REF>:<YOUR_POSTGRES_PASSWORD>@<YOUR_HOST>:5432/postgres
   ```

   **Example** (with fake values):

   ```bash
   DATABASE_URL=postgresql://app_user:MyStr0ng!Pass@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
   MIGRATION_DATABASE_URL=postgresql://postgres.abcdefghijklmnop:postgres_password@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
   ```

### Step 3: Verify Role Setup (1 minute)

Run the verification script:

```bash
cd server
npx tsx prisma/verify-role-setup.ts
```

**Expected output:**

```
✅ SUCCESS: Using app_user role (RLS enforced)

Configuration:
  - Tenant isolation: ENFORCED
  - Cross-tenant writes: BLOCKED
  - Audit log immutability: ENFORCED
  - Phase 3B verification: READY

Next step: Run verification script
  npx tsx prisma/verify-ai-budgets.ts
```

**If you see an error:**

- Double-check DATABASE_URL (app_user password, host, port)
- Ensure app_user role was created successfully in Supabase
- Verify Prisma client was regenerated: `npx prisma generate`

### Step 4: Run Phase 3B Verification (1 minute)

```bash
npx tsx prisma/verify-ai-budgets.ts
```

**Expected output:**

```
╔═══════════════════════════════════════════════════════════════════════╗
║        PHASE 3B: AI BUDGET & AUDIT LOG VERIFICATION                  ║
╚═══════════════════════════════════════════════════════════════════════╝

TEST 1: Find test tenant for verification
✅ PASS: Using tenant "Acme Corporation" (...)

TEST 2: Set tenant context via set_tenant_context()
✅ PASS: Tenant context set

TEST 3: Read AI budget policy
✅ PASS: Budget found - 100000 tokens, hardStop=false

TEST 4: Read usage meter for current month
✅ PASS: Usage found - 15000 tokens, $0.75

TEST 5: Write audit log with matching tenant context
✅ PASS: Audit log created successfully

TEST 6: Attempt cross-tenant audit log write (should fail)
✅ PASS: Cross-tenant write blocked by RLS policy (expected)  ← THIS SHOULD NOW PASS!

TEST 7: Clear DB context
✅ PASS: Context cleared

TEST 8: Verify audit logs are readable (admin context)
✅ PASS: Found X audit log(s) for tenant

╔═══════════════════════════════════════════════════════════════════════╗
║                      VERIFICATION SUMMARY                             ║
╚═══════════════════════════════════════════════════════════════════════╝
Tests passed: 8
Tests failed: 0

✅ ALL TESTS PASSED
```

### Step 5: Test Budget Enforcement with Tiny Limit (Optional but Recommended)

Set a tenant to very low budget to test HTTP 429:

```bash
# In Supabase SQL Editor
SELECT set_admin_context();

UPDATE ai_budgets
SET monthly_limit = 100, hard_stop = true
WHERE tenant_id = '362199da-bfb1-4cce-b7aa-4f759cd02f06';  -- Replace with actual tenant ID

SELECT clear_context();
```

Then call the AI endpoint twice:

**First call** (via curl or Postman):

```bash
curl http://localhost:3001/api/ai/insights?tenantType=B2B \
  -H "Authorization: Bearer <TENANT_JWT>"
```

Expected: ✅ 200 OK with AI response

**Second call** (same endpoint, same tenant):

```bash
curl http://localhost:3001/api/ai/insights?tenantType=B2B \
  -H "Authorization: Bearer <TENANT_JWT>"
```

Expected: ✅ 429 with:

```json
{
  "error": "AI_BUDGET_EXCEEDED",
  "message": "Monthly AI budget exceeded",
  "details": {
    "monthlyLimit": 100,
    "tokensUsed": 1500,
    "monthKey": "2026-02"
  }
}
```

## 🎯 Phase 3B Acceptance Criteria

After completing all steps, verify:

- ✅ **8/8 tests pass** in `verify-ai-budgets.ts`
- ✅ **TEST 6 passes**: Cross-tenant RLS enforcement confirmed
- ✅ **Budget hard stop**: Returns HTTP 429 when limit exceeded
- ✅ **Usage metering**: `ai_usage_meters` tracks tokens + cost
- ✅ **Audit logging**: `audit_logs` captures all AI actions
- ✅ **Dev = Prod**: RLS behavior identical in both environments

## 🚨 Troubleshooting

### "Error: P1001: Can't reach database server"

**Cause**: Wrong host or firewall blocking connection  
**Fix**: Verify host from Supabase Dashboard, check network/VPN

### "Error: password authentication failed for user app_user"

**Cause**: Wrong password in DATABASE_URL  
**Fix**: Double-check password matches what you set in create-app-user.sql

### "permission denied for table X"

**Cause**: app_user missing privileges on table X  
**Fix**: Re-run `create-app-user.sql` or add explicit GRANT for that table

### Verification still shows "Using postgres role"

**Cause**: DATABASE_URL still pointing to postgres owner  
**Fix**:

1. Verify `.env` has `DATABASE_URL=postgresql://app_user:...`
2. Restart any running servers
3. Re-run `npx prisma generate`

### TEST 6 still fails (cross-tenant write succeeds)

**Cause**: Still using postgres owner role  
**Fix**:

1. Run `npx tsx prisma/verify-role-setup.ts`
2. Confirm it says "Using app_user role"
3. If not, check DATABASE_URL in `.env`

## 📝 When Complete

Run this command to confirm everything is ready:

```bash
cd server
npx tsx prisma/verify-role-setup.ts && npx tsx prisma/verify-ai-budgets.ts
```

If both scripts show ✅ SUCCESS, **Phase 3B is ACCEPTED** and you're ready to:

1. **Commit changes**:

   ```bash
   git add server/prisma/schema.prisma server/.env.example server/prisma/*.sql server/prisma/*.md
   git commit -m "feat(db): implement two-URL pattern for RLS enforcement (Phase 3B)"
   ```

2. **Update production** (Vercel/Railway/etc.):
   - Add `DATABASE_URL` secret (app_user connection)
   - Add `MIGRATION_DATABASE_URL` secret (postgres owner)

3. **Proceed to Phase 4**: Frontend extraction + deployment architecture

---

## ⏱️ Estimated Time: 10 minutes

Questions? See detailed docs in `server/prisma/DB_ROLE_SETUP.md`
