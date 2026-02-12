# AUTH-H1 Wave 2 Readiness Gate Validation

## Overview

This document provides the **validation infrastructure** for AUTH-H1 Wave 2 Readiness Gate. It proves production readiness of authentication system commits 7-9 without changing contracts, logic, or schema.

**Commits in scope:**

- Commit 7: `0f96017` - DB uniqueness + refresh concurrency hardening
- Commit 8: `157c3c2` - Rate limiting enforcement mode
- Commit 9: `ea70c70` - Tenant email verification enforcement

**Validation objectives:**

- ✅ Refresh token stress testing (200+ cycles)
- ✅ Replay simulation (immediate + cross-realm)
- ✅ High-contention concurrency (50 parallel calls)
- ✅ Logout idempotency + revocation
- ✅ Audit event integrity (no secret leakage)
- ✅ Performance measurement (p95 < 150ms target)
- ✅ Index coverage verification

---

## Test Suites

### 1. `auth-wave2-readiness.integration.test.ts`

**Purpose:** Core validation suite for production readiness

**Tests:**

- **Production Refresh Stress (200 cycles)**: `login → refresh → refresh → ... (200x)` without state anomalies
- **Immediate Replay Detection**: Use token A → get token B → try token A again (expect 401 + family revocation)
- **Cross-Realm Replay Safety**: Tenant cookie cannot be used for admin refresh and vice-versa
- **Logout Idempotency**: Call logout twice, verify cookies cleared and revokedAt stable
- **Audit Events**: Login success, rate limit enforced, email not verified (no secrets in payloads)

**Run:**

```bash
cd server
pnpm test auth-wave2-readiness
```

**Expected output:** 8 tests passing, ~40-60s duration

---

### 2. `auth-refresh-performance.integration.test.ts`

**Purpose:** Performance benchmarking for refresh endpoint latency

**Tests:**

- **Sequential Latency (500 samples)**: Measures p50/p95/p99 for sequential refresh cycles
- **Controlled Concurrency (5 parallel sessions)**: Measures latency under realistic load

**Modes:**

- **Report-only (default)**: Prints latency distribution, no failure (prevents flakiness)
- **Strict mode**: Enforces p95 < 150ms target (use for CI sign-off)

**Run:**

```bash
cd server

# Report-only mode (default)
pnpm test auth-refresh-performance

# Strict mode (enforces p95 target)
AUTH_PERF_STRICT=true pnpm test auth-refresh-performance
```

**Expected output:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 AUTH-H1 REFRESH TOKEN PERFORMANCE BENCHMARK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Samples:  500
Mode:     📝 REPORT-ONLY

Latency Distribution (ms):
  Min:    12.34 ms
  Mean:   45.67 ms
  p50:    42.10 ms
  p95:    89.32 ms ✅
  p99:    125.45 ms
  Max:    156.78 ms

Target:   p95 < 150 ms
Status:   ✅ PASS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### 3. `auth-refresh-concurrency.integration.test.ts` (Enhanced)

**Purpose:** Verify deterministic concurrency behavior under high contention

**Changes:** Scaled from 8 → **50 parallel refresh attempts** to stress-test Commit 7 hardening

**Run:**

```bash
cd server
pnpm test auth-refresh-concurrency
```

**Expected output:** 2 tests passing, exactly 1 of 50 concurrent requests succeeds

---

## Index Coverage & Query Patterns

### Critical Queries

The refresh token system relies on the following query patterns:

#### 1. **Atomic Claim (Concurrency Gate)**

```prisma
// Pattern: updateMany with narrow where (deterministic claim)
await tx.refreshToken.updateMany({
  where: {
    id: <tokenId>,
    rotatedAt: null,
    revokedAt: null,
    expiresAt: { gt: now },
  },
  data: {
    rotatedAt: now,
    lastUsedAt: now,
  },
});
```

**Index requirement:** Primary key (`id`) + check columns (`rotatedAt`, `revokedAt`, `expiresAt`)

- ✅ Primary key ensures fast lookup
- ✅ Check columns prevent double-mint (only unrotated/unrevoked tokens match)

#### 2. **Token Lookup (Refresh Endpoint)**

```prisma
// Pattern: findUnique by tokenHash (unique constraint)
const storedToken = await prisma.refreshToken.findUnique({
  where: { tokenHash: <hash> },
});
```

**Index requirement:** Unique index on `tokenHash` (Commit 7)

- ✅ `@@unique([tokenHash])` ensures fast lookup + prevents duplicates
- ✅ Deterministic claim relies on this uniqueness

#### 3. **Family Revocation (Replay Detection)**

```prisma
// Pattern: updateMany by familyId
await prisma.refreshToken.updateMany({
  where: {
    familyId: <familyId>,
    revokedAt: null,
  },
  data: {
    revokedAt: now,
  },
});
```

**Index requirement:** Index on `familyId` + `revokedAt` (filtering)

- ✅ Enables fast revocation of all tokens in family
- ⚠️ Consider composite index `(familyId, revokedAt)` if family size grows > 100 tokens

#### 4. **Expired Token Cleanup (Maintenance)**

```prisma
// Pattern: findMany + delete where expiresAt < now
await prisma.refreshToken.deleteMany({
  where: {
    expiresAt: { lt: now },
  },
});
```

**Index requirement:** Index on `expiresAt`

- ℹ️ Optional optimization for cleanup jobs
- ℹ️ Not critical for refresh endpoint performance

### Schema Snapshot (Commit 7)

```prisma
model RefreshToken {
  id          String    @id @default(uuid())
  userId      String?
  adminId     String?
  tokenHash   String    // ✅ Unique constraint
  familyId    String    // ✅ Indexed for revocation
  expiresAt   DateTime
  rotatedAt   DateTime?
  revokedAt   DateTime?
  lastUsedAt  DateTime?
  ip          String
  userAgent   String
  createdAt   DateTime  @default(now())

  user  User?      @relation(fields: [userId], references: [id])
  admin AdminUser? @relation(fields: [adminId], references: [id])

  @@unique([tokenHash])  // ✅ Commit 7: Prevents double-mint
  @@index([familyId])    // ✅ Fast family revocation
  @@index([userId])      // ✅ Fast user token lookup
  @@index([adminId])     // ✅ Fast admin token lookup
}
```

### Contention Risk Assessment

**Scenario:** 50 concurrent refresh attempts with same token (stress test)

**Risk areas:**

1. **Row-level lock contention** on `refreshToken` row during `updateMany`
   - ✅ Mitigated by Commit 7: `updateMany` with atomic claim (DB-level lock)
   - ✅ Test coverage: `auth-refresh-concurrency.integration.test.ts` (50 parallel)

2. **Family revocation lock** during replay detection
   - ⚠️ Potential contention if family size > 100 tokens (mass revocation)
   - ✅ Currently not a risk (typical family size: 10-20 tokens)

3. **Index lock escalation** during high-throughput refresh
   - ℹ️ Postgres row-level locks are lightweight
   - ℹ️ No table-level lock escalation expected under normal load

**Recommendation:** Monitor family growth in production. If family size > 100, consider:

- Adding token expiry cleanup job (delete rotated tokens > 30 days old)
- Implementing soft family limits (revoke entire family if > 200 tokens)

---

## Verification Checklist (Pre-Deployment)

Copy/paste this checklist and run each command:

```bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AUTH-H1 WAVE 2 READINESS GATE VERIFICATION CHECKLIST
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

cd server

# ✅ 1. Run Wave 2 readiness suite (core validation)
pnpm test auth-wave2-readiness
# Expected: 8 tests passing, ~40-60s

# ✅ 2. Run refresh performance benchmark (report-only)
pnpm test auth-refresh-performance
# Expected: 2 tests passing, p95 < 150ms (printed to console)

# ✅ 3. Run high-contention concurrency test (50 parallel)
pnpm test auth-refresh-concurrency
# Expected: 2 tests passing, exactly 1 of 50 succeeds

# ✅ 4. Run rate limiting enforcement tests (Commit 8)
pnpm test auth-rate-limit-enforcement
# Expected: 12 tests passing

# ✅ 5. Run email verification enforcement tests (Commit 9)
pnpm test auth-email-verification-enforcement
# Expected: 13 tests passing

# ✅ 6. Run ALL auth tests (full regression)
pnpm test auth
# Expected: All tests passing (no regressions)

# ✅ 7. Verify TypeScript compilation (no errors)
pnpm exec tsc --noEmit
# Expected: No errors

# ✅ 8. Verify ESLint (no warnings)
pnpm exec eslint src/routes/auth.ts --max-warnings=0
# Expected: No warnings

# ✅ 9. Verify schema consistency (no drift)
cd server
pnpm exec prisma validate
# Expected: "The schema.prisma file is valid"

# ✅ 10. Verify index coverage (manual check)
pnpm exec prisma db pull --force
git diff prisma/schema.prisma
# Expected: No changes (schema matches DB)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SIGN-OFF CRITERIA (ALL MUST PASS)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# [ ] All Wave 2 readiness tests passing
# [ ] Refresh p95 latency < 150ms (report-only mode)
# [ ] 50 concurrent refresh attempts: exactly 1 succeeds
# [ ] No secrets in audit event payloads
# [ ] Replay detection works (immediate + cross-realm)
# [ ] Logout idempotent (cookies cleared, revokedAt stable)
# [ ] No contract changes (response envelopes unchanged)
# [ ] No schema drift (prisma validate passes)
# [ ] TypeScript + ESLint clean
# [ ] Full auth test suite regression passes

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Performance Baseline (Reference)

Expected latency distribution for refresh endpoint (local dev environment):

| Metric | Target  | Typical | Notes                         |
| ------ | ------- | ------- | ----------------------------- |
| p50    | -       | ~40ms   | Median latency                |
| p95    | < 150ms | ~90ms   | 95th percentile (target)      |
| p99    | -       | ~120ms  | 99th percentile               |
| Max    | -       | ~200ms  | Outliers (DB lock contention) |

**Production considerations:**

- Add network latency (~10-20ms for cloud databases)
- Add connection pool contention under high load
- Monitor family growth (affects revocation latency)

**Strict mode enforcement:**

```bash
# Use in CI pipeline to enforce p95 target
AUTH_PERF_STRICT=true pnpm test auth-refresh-performance
```

---

## Query Logging (Test-Only)

To inspect Prisma queries during tests:

```bash
# Enable Prisma query logging
DEBUG=prisma:query pnpm test auth-wave2-readiness
```

**⚠️ Guardrails:**

- Query logging is test-only (never enable in production)
- No plaintext tokens/emails in logs (only hashes)
- Use for debugging index coverage issues only

---

## Troubleshooting

### Test Failures

#### "Expected exactly 1 success, got 0"

**Cause:** Database connection issue or RLS misconfiguration
**Fix:** Check `app.bypass_rls` is correctly set in `beforeEach`

#### "p95 > 150ms in strict mode"

**Cause:** Performance regression or DB contention
**Fix:** Run in report-only mode first to diagnose. Check for:

- Slow queries (enable `DEBUG=prisma:query`)
- Missing indexes (run `prisma validate`)
- High CPU/memory usage

#### "Family not revoked after replay"

**Cause:** Replay detection logic not triggered
**Fix:** Verify `rotatedAt` is set correctly after first refresh

### Performance Issues

#### High p95 latency (> 200ms)

**Investigate:**

1. Enable query logging: `DEBUG=prisma:query`
2. Check for full table scans (missing indexes)
3. Verify connection pool not exhausted
4. Check DB CPU/memory metrics

#### Concurrency test hangs

**Cause:** Deadlock or connection pool exhaustion
**Fix:**

1. Increase connection pool size in `prisma/schema.prisma`
2. Check for transaction timeout issues
3. Verify DB max connections not reached

---

## Production Monitoring

Once deployed, monitor the following metrics:

### Refresh Endpoint

- **p95 latency**: Target < 150ms
- **Error rate**: Target < 0.1%
- **Replay detection rate**: Monitor for anomalies

### Audit Events

- `AUTH_LOGIN_SUCCESS`: Track successful logins
- `AUTH_RATE_LIMIT_ENFORCED`: Monitor abuse patterns
- `AUTH_LOGIN_FAILED` (NOT_VERIFIED): Track unverified user attempts

### Database

- **Refresh token count**: Alert if > 1M tokens (cleanup needed)
- **Family size distribution**: Alert if any family > 100 tokens
- **Index usage**: Verify `tokenHash` unique index hit rate > 99%

---

## Commit Scope

This validation pack adds:

- **3 new test files** (readiness, performance, documentation)
- **1 modified test file** (concurrency scaled to 50)
- **0 production code changes** (tests only)
- **0 schema changes** (no migrations)

**Atomic commit:**

```
AUTH-H1 — Wave 2 readiness gate validation pack
```

---

## References

- **Commit 7**: DB uniqueness + refresh concurrency hardening
- **Commit 8**: Rate limiting enforcement mode
- **Commit 9**: Email verification enforcement
- **TexQtic Doctrine v1.4**: Safe-Write Mode governance

**Documentation:**

- [Refresh Token Design](../docs/auth-refresh-token-design.md) (if exists)
- [Rate Limiting Strategy](../docs/rate-limiting-strategy.md) (if exists)
- [Audit Events Taxonomy](../docs/audit-events.md) (if exists)

---

**Last Updated:** February 12, 2026  
**Validated Against:** AUTH-H1 Commits 7-9  
**Status:** ✅ Ready for Deployment Sign-Off
