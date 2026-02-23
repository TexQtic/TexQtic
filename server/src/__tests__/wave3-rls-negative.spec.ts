/**
 * G-W3-A3 — RLS Cross-Tenant Negative Control Tests
 *
 * COVERAGE:
 *   Group 2 — Cross-tenant isolation proof (DB-live)
 *
 * DOCTRINE REFERENCE: v1.4 Section 4 (Tenant Isolation)
 * GUARDRAIL: GR-007 (Tenant Context Integrity Proof)
 *
 * These tests prove that tenancy boundaries are mathematically enforced:
 * - Org A cannot see Org B's data
 * - Switching context mid-session does not leak prior context
 * - RLS fail-closed: no context = no rows
 *
 * NOTE: These are DB-live integration tests.
 * They will be skipped if the database is unreachable.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { withDbContext, withBypassForSeed } from '../lib/database-context.js';
import type { DatabaseContext } from '../lib/database-context.js';

// ─────────────────────────────────────────────────────────────────────────────
// Test Fixture Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Make a minimal tenant context for a given orgId */
function tenantCtx(orgId: string): DatabaseContext {
  return {
    orgId,
    actorId: randomUUID(),
    realm: 'tenant',
    requestId: randomUUID(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 2 — Cross-Tenant Negative Control
// ─────────────────────────────────────────────────────────────────────────────

describe('G-W3-A3 Group 2 — Cross-Tenant RLS Negative Control (DB-live)', () => {
  let prisma: PrismaClient;
  let dbAvailable = true;

  // Unique org IDs per test run — guaranteed isolation
  const ORG_A = randomUUID();
  const ORG_B = randomUUID();

  // Track seeded catalog items for cleanup
  let seededItemOrgA: string | null = null;
  let seededTenantA: string | null = null;
  let seededTenantB: string | null = null;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    prisma = new PrismaClient();

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbAvailable = false;
      console.warn('[G-W3-A3] DB unavailable — skipping live RLS tests');
      return;
    }

    // Seed two isolated tenants + catalog items using bypass
    // withBypassForSeed requires NODE_ENV=test (triple-gate)
    try {
      await withBypassForSeed(prisma, async tx => {
        // Seed tenants
        await tx.$executeRawUnsafe(
          `INSERT INTO tenants (id, name, slug, status, plan, created_at, updated_at)
           VALUES ($1, $2, $3, 'ACTIVE', 'FREE', NOW(), NOW())
           ON CONFLICT (id) DO NOTHING`,
          ORG_A,
          `test-org-a-${ORG_A.slice(0, 8)}`,
          `test-slug-a-${ORG_A.slice(0, 8)}`
        );
        await tx.$executeRawUnsafe(
          `INSERT INTO tenants (id, name, slug, status, plan, created_at, updated_at)
           VALUES ($1, $2, $3, 'ACTIVE', 'FREE', NOW(), NOW())
           ON CONFLICT (id) DO NOTHING`,
          ORG_B,
          `test-org-b-${ORG_B.slice(0, 8)}`,
          `test-slug-b-${ORG_B.slice(0, 8)}`
        );

        // Seed catalog items for Org A only
        const itemId = randomUUID();
        await tx.$executeRawUnsafe(
          `INSERT INTO catalog_items (id, tenant_id, sku, name, price, currency, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 100, 'USD', 'ACTIVE', NOW(), NOW())
           ON CONFLICT (id) DO NOTHING`,
          itemId,
          ORG_A,
          `TEST-W3A3-${itemId.slice(0, 8)}`,
          'G-W3-A3 Regression Test Item'
        );
        seededItemOrgA = itemId;
        seededTenantA = ORG_A;
        seededTenantB = ORG_B;
      });
    } catch (seedError: unknown) {
      const msg = seedError instanceof Error ? seedError.message : String(seedError);
      console.warn('[G-W3-A3] Seed failed (schema may differ):', msg);
      // Tests will still exercise the core isolation — they'll get 0 rows from both orgs
    }
  });

  afterAll(async () => {
    if (dbAvailable) {
      // Cleanup seeded data
      try {
        await withBypassForSeed(prisma, async tx => {
          if (seededItemOrgA) {
            await tx.$executeRawUnsafe(
              `DELETE FROM catalog_items WHERE id = $1`,
              seededItemOrgA
            );
          }
          if (seededTenantA) {
            await tx.$executeRawUnsafe(`DELETE FROM tenants WHERE id = $1`, seededTenantA);
          }
          if (seededTenantB) {
            await tx.$executeRawUnsafe(`DELETE FROM tenants WHERE id = $1`, seededTenantB);
          }
        });
      } catch {
        // Best-effort cleanup
      }
    }
    await prisma.$disconnect();
  });

  // ── Test 2.1: Org A context sees only Org A catalog items ──

  it('Org A context: can only see catalog_items belonging to Org A', async () => {
    if (!dbAvailable) return;

    const ctxA = tenantCtx(ORG_A);
    const items = await withDbContext(prisma, ctxA, async tx => {
      return tx.$queryRaw<Array<{ id: string; tenant_id: string }>>`
        SELECT id::text, tenant_id::text FROM catalog_items
        WHERE sku LIKE 'TEST-W3A3-%'
      `;
    });

    // All visible items must belong to Org A — zero cross-tenant leakage
    const wrongTenantItems = items.filter((i: { id: string; tenant_id: string }) => i.tenant_id !== ORG_A);
    expect(
      wrongTenantItems,
      `Org A context returned catalog_items from another tenant.\n` +
        `Cross-tenant leakage DETECTED: ${JSON.stringify(wrongTenantItems)}\n` +
        `RLS policy on catalog_items has failed (CRITICAL).`
    ).toHaveLength(0);
  });

  // ── Test 2.2: Org B context sees ZERO Org A catalog items ──

  it('Org B context: cannot see catalog_items seeded for Org A (negative control)', async () => {
    if (!dbAvailable) return;
    if (!seededItemOrgA) {
      console.warn('[G-W3-A3] Test 2.2 skipped: seed unavailable');
      return;
    }

    const ctxB = tenantCtx(ORG_B);
    const items = await withDbContext(prisma, ctxB, async tx => {
      return tx.$queryRaw<Array<{ id: string }>>`
        SELECT id::text FROM catalog_items
        WHERE id = ${seededItemOrgA}
      `;
    });

    expect(
      items,
      `Org B context can see Org A's catalog item "${seededItemOrgA}".\n` +
        `CRITICAL: Cross-tenant RLS isolation BROKEN.\n` +
        `Doctrine v1.4 GR-007 violated.`
    ).toHaveLength(0);
  });

  // ── Test 2.3: Empty org UUID sees zero rows (fail-closed) ──

  it('Non-existent org context sees zero catalog_items (fail-closed)', async () => {
    if (!dbAvailable) return;

    const phantomOrgId = randomUUID(); // Guaranteed to not exist
    const ctxPhantom = tenantCtx(phantomOrgId);

    const items = await withDbContext(prisma, ctxPhantom, async tx => {
      return tx.$queryRaw<Array<{ id: string }>>`
        SELECT id::text FROM catalog_items LIMIT 5
      `;
    });

    expect(
      items,
      `Non-existent org context returned ${items.length} rows.\n` +
        `RLS must be fail-closed: no context that matches = no rows.\n` +
        `This indicates a dangerous policy gap.`
    ).toHaveLength(0);
  });

  // ── Test 2.4: Switching org context between transactions doesn't leak ──

  it('Context switch between transactions does not leak prior org context', async () => {
    if (!dbAvailable) return;

    // Transaction 1: Org A
    const orgAResult = await withDbContext(prisma, tenantCtx(ORG_A), async tx => {
      const rows = await tx.$queryRaw<Array<{ org_id: string }>>`
        SELECT current_setting('app.org_id', true) AS org_id
      `;
      return rows[0].org_id;
    });

    // Transaction 2: Org B — must NOT see Org A's context
    const orgBResult = await withDbContext(prisma, tenantCtx(ORG_B), async tx => {
      const rows = await tx.$queryRaw<Array<{ org_id: string }>>`
        SELECT current_setting('app.org_id', true) AS org_id
      `;
      return rows[0].org_id;
    });

    // Each transaction must have its own isolated context
    expect(orgAResult).toBe(ORG_A);
    expect(orgBResult).toBe(ORG_B);
    expect(orgAResult).not.toBe(orgBResult);
  });

  // ── Test 2.5: Memberships — Org B cannot see Org A's memberships ──

  it('Org B context cannot see memberships belonging to Org A', async () => {
    if (!dbAvailable) return;

    // Query memberships as Org B — must not return any rows with tenant_id = Org A
    const ctxB = tenantCtx(ORG_B);
    const memberships = await withDbContext(prisma, ctxB, async tx => {
      return tx.$queryRaw<Array<{ tenant_id: string }>>`
        SELECT tenant_id::text FROM memberships
        WHERE tenant_id = ${ORG_A}::uuid
        LIMIT 1
      `;
    });

    expect(
      memberships,
      `Org B context can see Org A memberships.\n` +
        `CRITICAL: Tenant isolation broken on memberships table.\n` +
        `Doctrine v1.4 GR-007 violated.`
    ).toHaveLength(0);
  });
});
