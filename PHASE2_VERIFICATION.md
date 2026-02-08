# Phase 2 Verification Checklist

## Database & Schema

### 1. PostgreSQL Running

```powershell
# Check Docker container
docker ps | findstr texqtic-platform-db

# Or check local PostgreSQL service
Get-Service postgresql* | Select-Object Status, Name
```

**Expected**: Container/service running

---

### 2. Prisma Client Generated

```powershell
cd server
npm run db:generate
```

**Expected**: `@prisma/client` successfully generated

---

### 3. Database Migrated

```powershell
cd server
npm run db:migrate
```

**Expected**: All migrations applied, 15 tables created

---

### 4. RLS Policies Applied

```powershell
cd server
npm run db:rls
```

**Expected**: RLS enabled on tenant-scoped tables

---

### 5. Database Seeded

```powershell
cd server
npx prisma db seed
```

**Expected**:

- 2 tenants created
- 2 tenant users
- 2 admin users
- 4 feature flags
- 5 audit logs

---

## RLS Policy Verification

### 6. Verify Tenant Isolation (Manual SQL Test)

```sql
-- Connect to DB
psql postgresql://postgres:postgres@localhost:5432/texqtic_core_db

-- Get tenant IDs
SELECT id, slug FROM tenants;

-- Set context to tenant A
SELECT set_tenant_context('<tenant_a_id>'::uuid, false);

-- Should only see tenant A memberships
SELECT * FROM memberships;

-- Try to see all memberships (should still only see tenant A)
SELECT * FROM memberships WHERE tenant_id != '<tenant_a_id>'::uuid;
```

**Expected**: Only tenant A data visible

---

### 7. Verify Admin Bypass

```sql
-- Set admin context
SELECT set_admin_context();

-- Should see all memberships across all tenants
SELECT * FROM memberships;

-- Should see all tenants
SELECT * FROM tenants;
```

**Expected**: All tenant data visible

---

### 8. Verify Audit Log Immutability

```sql
-- Try to update audit log
UPDATE audit_logs SET action = 'HACKED' WHERE id = (SELECT id FROM audit_logs LIMIT 1);

-- Try to delete audit log
DELETE FROM audit_logs WHERE id = (SELECT id FROM audit_logs LIMIT 1);
```

**Expected**: Both operations fail with "permission denied"

---

## API Endpoint Testing

### 9. Start Server

```powershell
cd server
npm run dev
```

**Expected**: Server runs on port 3001

---

### 10. Test Health Check

```powershell
curl http://localhost:3001/health
```

**Expected**: `{"status":"ok","timestamp":"..."}`

---

### 11. Admin Cannot Access Without Token

```powershell
curl http://localhost:3001/api/control/tenants
```

**Expected**: `401 Unauthorized` error

---

### 12. Tenant Endpoint Requires Auth

```powershell
curl http://localhost:3001/api/me
```

**Expected**: `401 Unauthorized` error

---

## Security Verification

### 13. Verify Gemini Key Not in Client

**Manual check**:

- Open browser DevTools
- Search for "GEMINI" in client JavaScript bundle
- Check network requests from UI

**Expected**: No Gemini API key visible in client

---

### 14. Verify Password Hashing

```sql
-- Check users table
SELECT email, password_hash FROM users LIMIT 1;
```

**Expected**: password_hash starts with `$2b$` (bcrypt)

---

### 15. Verify Feature Flags in DB

```sql
SELECT key, enabled, description FROM feature_flags;
```

**Expected**:

- KILL_SWITCH_ALL (disabled)
- AI_INSIGHTS_ENABLED (enabled)
- ADVANCED_ANALYTICS (enabled)
- MULTI_CURRENCY (disabled)

---

## Notes

⚠️ **Endpoints 11-12** will properly work after Phase 3-4 (Auth routes implemented).
For now, they verify middleware rejects unauthenticated requests.

✅ **Phase 2 Complete** when all database and RLS tests pass (1-10, 13-15).
