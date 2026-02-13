/**
 * GATE C.3 — DB Hardening: No Role Switching + Transaction Barriers
 * 
 * CRITICAL TESTS:
 * 1. No SET ROLE (non-LOCAL) or RESET ROLE in production paths
 * 2. Context is transaction-scoped (no leakage)
 * 3. Fail-closed behavior without context
 * 4. Pooler-safe execution (deterministic, no flakes)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { withDbContext } from '../../lib/database-context.js';
import type { DatabaseContext } from '../../lib/database-context.js';

describe('GATE C.3 — DB Hardening', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Ensure connection pool is clean before each test
    await prisma.$connect();
  });

  describe('No Unsafe Role Switching (Production Path)', () => {
    it('should NOT execute unsafe SET ROLE or RESET ROLE queries', async () => {
      // Use separate client with logging to avoid connection pool contamination
      const logPrisma = new PrismaClient({ log: ['query'] });
      const queries: string[] = [];
      
      logPrisma.$on('query', (e: any) => {
        queries.push(e.query.toUpperCase());
      });

      const context: DatabaseContext = {
        orgId: '00000000-0000-0000-0000-000000000001',
        actorId: '00000000-0000-0000-0000-000000000001',
        realm: 'tenant',
        requestId: 'test-req-001'
      };

      // Execute a simple query
      await withDbContext(logPrisma, context, async (tx) => {
        const result = await tx.$queryRaw`SELECT 1 as test`;
        return result;
      });

      // Cleanup logging client
      await logPrisma.$disconnect();

      // Assert: No unsafe role switching queries
      // SET LOCAL ROLE is allowed (transaction-scoped, pooler-safe)
      // SET ROLE (non-LOCAL) is forbidden (requires RESET ROLE cleanup)
      // RESET ROLE is forbidden (should not be needed with SET LOCAL)
      const unsafeRoleQueries = queries.filter(q => {
        // Forbidden patterns
        if (q.match(/(?<!LOCAL\s)SET\s+ROLE/)) return true; // SET ROLE without LOCAL
        if (q.includes('RESET ROLE')) return true; // RESET ROLE
        return false;
      });

      expect(unsafeRoleQueries).toEqual([]);
      
      // Verify SET LOCAL ROLE is used (expected for current implementation)
      const setLocalRoleQueries = queries.filter(q => q.includes('SET LOCAL ROLE'));
      expect(setLocalRoleQueries.length).toBeGreaterThan(0); // Should have at least one
    }, 10000);
  });

  describe('Transaction-Scoped Context (No Leakage)', () => {
    it('should isolate context between sequential transactions', async () => {
      const orgA = '00000000-0000-0000-0000-000000000001';
      const orgB = '00000000-0000-0000-0000-000000000002';

      // Transaction 1: Org A
      await withDbContext(prisma, {
        orgId: orgA,
        actorId: '00000000-0000-0000-0000-000000000001',
        realm: 'tenant',
        requestId: 'req-001'
      }, async (tx) => {
        const result = await tx.$queryRaw<Array<{ value: string }>>`
          SELECT current_setting('app.org_id', true) as value
        `;
        expect(result[0]?.value).toBe(orgA);
      });

      // Transaction 2: Org B
      await withDbContext(prisma, {
        orgId: orgB,
        actorId: '00000000-0000-0000-0000-000000000002',
        realm: 'tenant',
        requestId: 'req-002'
      }, async (tx) => {
        const result = await tx.$queryRaw<Array<{ value: string }>>`
          SELECT current_setting('app.org_id', true) as value
        `;
        expect(result[0]?.value).toBe(orgB);
      });

      // Transaction 3: Back to Org A
      await withDbContext(prisma, {
        orgId: orgA,
        actorId: '00000000-0000-0000-0000-000000000001',
        realm: 'tenant',
        requestId: 'req-003'
      }, async (tx) => {
        const result = await tx.$queryRaw<Array<{ value: string }>>`
          SELECT current_setting('app.org_id', true) as value
        `;
        expect(result[0]?.value).toBe(orgA);
      });
    }, 15000);

    it('should clear context after transaction ends', async () => {
      // Set context in transaction
      await withDbContext(prisma, {
        orgId: '00000000-0000-0000-0000-000000000001',
        actorId: '00000000-0000-0000-0000-000000000001',
        realm: 'tenant',
        requestId: 'req-001'
      }, async (tx) => {
        const result = await tx.$queryRaw<Array<{ value: string }>>`
          SELECT current_setting('app.org_id', true) as value
        `;
        expect(result[0]?.value).toBe('00000000-0000-0000-0000-000000000001');
      });

      // Query outside transaction (pooler-safe check)
      const result = await prisma.$queryRaw<Array<{ value: string | null }>>`
        SELECT current_setting('app.org_id', true) as value
      `;
      
      // Context should be cleared (null or empty string)
      const value = result[0]?.value;
      expect(value === null || value === '' || value === undefined).toBe(true);
    }, 10000);
  });

  describe('Fail-Closed Behavior', () => {
    it('should reject transactions with incomplete context', async () => {
      const invalidContexts = [
        { actorId: 'actor1', realm: 'tenant', requestId: 'req1' }, // missing orgId
        { orgId: 'org1', realm: 'tenant', requestId: 'req1' }, // missing actorId
        { orgId: 'org1', actorId: 'actor1', requestId: 'req1' }, // missing realm
        { orgId: 'org1', actorId: 'actor1', realm: 'tenant' }, // missing requestId
      ];

      for (const ctx of invalidContexts) {
        await expect(
          // @ts-expect-error Testing invalid context
          withDbContext(prisma, ctx, async (tx) => {
            return tx.$queryRaw`SELECT 1`;
          })
        ).rejects.toThrow(/Invalid context/);
      }
    });
  });

  describe('Pooler Safety (Deterministic Execution)', () => {
    it('should produce identical results across 3 consecutive runs', async () => {
      const context: DatabaseContext = {
        orgId: '00000000-0000-0000-0000-000000000001',
        actorId: '00000000-0000-0000-0000-000000000001',
        realm: 'tenant',
        requestId: 'req-deterministic'
      };

      const results: Array<{ test: number }> = [];

      // Run 3 times
      for (let i = 0; i < 3; i++) {
        const result = await withDbContext(prisma, context, async (tx) => {
          return tx.$queryRaw<Array<{ test: number }>>`SELECT 1 as test`;
        });
        results.push(result[0]);
      }

      // All results should be identical
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
    }, 15000);
  });
});
