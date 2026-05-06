/**
 * TEXQTIC-NC-PHASE1-POOL-SERVICE-INTEGRATION-HARNESS-001
 *
 * Disposable integration test harness for NetworkPoolService.
 * Tests real DB behaviour for:
 *   createNetworkPool, openNetworkPool (with NetworkLifecycleLog verification),
 *   joinNetworkPool, duplicate membership rejection, invalid-state join rejection.
 *
 * SKIP GUARD:
 *   Skipped unless DATABASE_URL is set in the environment.
 *   Label: SERVICE_INTEGRATION_HARNESS_SKIPPED_NO_TEST_DB
 *   (describe.skipIf(!hasDb) — see helpers/dbGate.ts)
 *
 * PREREQUISITES (all committed before this harness):
 *   TEXQTIC-NC-PHASE1-STATEMACHINE-001       2f5c52b
 *   TEXQTIC-NC-PHASE1-INVOICE-FOUNDATION-001 f479ac8
 *   TEXQTIC-NC-PHASE1-POOL-SCHEMA-001        70f83b2
 *   TEXQTIC-NC-PHASE1-MIGRATION-DEPLOY-001   29331e1 + cf092dd
 *   TEXQTIC-NC-PHASE1-POOL-LIFECYCLE-SEED-001 f4d81af
 *   TEXQTIC-NC-PHASE1-POOL-SERVICE-FOUNDATION-001 481f2562
 *
 * CLEANUP STRATEGY:
 *   Explicit deletion in afterEach via withBypassForSeed (bypasses RLS).
 *   network_pool_memberships and network_pools are deleted after each test.
 *   network_lifecycle_logs are append-only — D-020-D trigger
 *   (trg_immutable_network_lifecycle_log) unconditionally blocks UPDATE/DELETE.
 *   For tests that call openNetworkPool, the lifecycle log rows and their
 *   parent org/tenant rows persist in the test DB as intentional immutable
 *   artifacts. Each test uses a randomUUID() org ID to prevent conflicts.
 *
 * ACTOR TYPE NOTE:
 *   DRAFT→OPEN transition requires actor_type='TENANT_ADMIN' or 'PLATFORM_ADMIN'
 *   (seeded in TEXQTIC-NC-PHASE1-POOL-LIFECYCLE-SEED-001).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

import { hasDb } from './helpers/dbGate.js';
import { seedTenantForTest } from './helpers/seedRls.js';
import { prisma } from '../db/prisma.js';
import { withBypassForSeed } from '../lib/database-context.js';
import {
  NetworkPoolService,
  NetworkPoolDuplicateMembershipError,
  NetworkPoolInvalidStateError,
} from '../services/networkPool.service.js';
import { StateMachineService } from '../services/stateMachine.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// Harness suite — skipped when DATABASE_URL is absent
// ─────────────────────────────────────────────────────────────────────────────

describe.skipIf(!hasDb)('NC-POOL-SERVICE-INTEGRATION — NetworkPoolService real-DB harness', () => {
  let svc: NetworkPoolService;
  let ownerOrgId: string;
  let memberOrgId: string;
  let testRunId: string;

  // Pool IDs created during the current test — used for cleanup
  const createdPoolIds: string[] = [];

  beforeEach(async () => {
    testRunId = randomUUID();
    ownerOrgId = randomUUID();
    memberOrgId = randomUUID();

    // Create disposable test orgs.
    // seedTenantForTest creates a `tenants` row; the DB trigger
    // sync_tenants_to_organizations auto-creates the matching `organizations` row.
    await seedTenantForTest(ownerOrgId, testRunId);
    await seedTenantForTest(memberOrgId, testRunId);

    // Instantiate real services.
    // Raw prisma connects as the `postgres` role (BYPASSRLS=true per DATABASE_URL).
    // EscalationService and SanctionsService are omitted — not required for pool harness.
    const stateMachine = new StateMachineService(prisma, null, null);
    svc = new NetworkPoolService(prisma, stateMachine);
  });

  afterEach(async () => {
    // ── Step 1: Delete network_pool_memberships and network_pools (safe to delete) ──
    if (createdPoolIds.length > 0) {
      try {
        await withBypassForSeed(prisma, async tx => {
          for (const poolId of createdPoolIds) {
            await tx.$executeRawUnsafe(
              `DELETE FROM network_pool_memberships WHERE pool_id = $1::uuid`,
              poolId,
            );
            await tx.$executeRawUnsafe(
              `DELETE FROM network_pools WHERE id = $1::uuid`,
              poolId,
            );
          }
        });
      } catch (_e) {
        // Best-effort — log suppressed intentionally
      } finally {
        createdPoolIds.length = 0;
      }
    }

    // ── Step 2: Try to delete test tenant/org rows (best-effort) ──
    // This WILL fail for tests that wrote to network_lifecycle_logs (openNetworkPool).
    // The CASCADE from organizations → network_lifecycle_logs is blocked by the
    // immutability trigger. Those org/tenant rows persist as harmless test artifacts,
    // identifiable by their randomUUID slug prefix and testRunId tags.
    await withBypassForSeed(prisma, async tx => {
      await tx.tenant.deleteMany({
        where: { id: { in: [ownerOrgId, memberOrgId] } },
      });
    }).catch(() => {
      // Intentional: lifecycle logs are immutable; org rows persist when logs exist
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // IT-NP-INT-01 — createNetworkPool: DRAFT pool persisted in DB
  // ───────────────────────────────────────────────────────────────────────────

  it('IT-NP-INT-01: createNetworkPool creates a DRAFT pool in the DB', async () => {
    const userId = randomUUID();
    const poolRef = `HARNESS-${testRunId}-001`;

    const result = await svc.createNetworkPool(ownerOrgId, userId, {
      pool_ref:           poolRef,
      commodity_category: 'COTTON_YARN',
      target_qty:         5000,
      qty_unit:           'KG',
    });

    createdPoolIds.push(result.id);

    // Service-level assertions
    expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/i);
    expect(result.org_id).toBe(ownerOrgId);
    expect(result.pool_ref).toBe(poolRef);
    expect(result.commodity_category).toBe('COTTON_YARN');
    expect(result.lifecycle_state_key).toBe('DRAFT');

    // DB-level verification — row must exist and match
    const dbRow = await (prisma as any).network_pools.findFirst({
      where: { id: result.id },
    });
    expect(dbRow).not.toBeNull();
    expect(dbRow.pool_ref).toBe(poolRef);
    expect(dbRow.org_id).toBe(ownerOrgId);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // IT-NP-INT-02 — openNetworkPool: DRAFT→OPEN + NetworkLifecycleLog written
  // ───────────────────────────────────────────────────────────────────────────

  it('IT-NP-INT-02: openNetworkPool transitions DRAFT→OPEN and writes a NetworkLifecycleLog entry', async () => {
    const userId = randomUUID();
    const poolRef = `HARNESS-${testRunId}-002`;

    // Create a DRAFT pool
    const pool = await svc.createNetworkPool(ownerOrgId, userId, {
      pool_ref:           poolRef,
      commodity_category: 'GREY_FABRIC',
      target_qty:         10000,
      qty_unit:           'MT',
    });
    createdPoolIds.push(pool.id);

    // Open the pool — requires TENANT_ADMIN actor type (POOL-LIFECYCLE-SEED-001)
    const opened = await svc.openNetworkPool(ownerOrgId, {
      pool_id:       pool.id,
      actor_type:    'TENANT_ADMIN',
      actor_user_id: userId,
      actor_role:    'ORG_ADMIN',
      reason:        `IT-NP-INT-02: open for integration harness [run:${testRunId}]`,
    });

    // Service-level assertions
    expect(opened.id).toBe(pool.id);
    expect(opened.lifecycle_state_key).toBe('OPEN');

    // NetworkLifecycleLog verification — row must exist for this transition
    const logEntry = await prisma.networkLifecycleLog.findFirst({
      where: {
        entityType:   'POOL',
        entityId:     pool.id,
        fromStateKey: 'DRAFT',
        toStateKey:   'OPEN',
      },
    });
    expect(logEntry).not.toBeNull();
    expect(logEntry!.orgId).toBe(ownerOrgId);
    expect(logEntry!.actorType).toBe('TENANT_ADMIN');
    expect(logEntry!.actorUserId).toBe(userId);
    expect(logEntry!.reason).toContain('IT-NP-INT-02');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // IT-NP-INT-03 — joinNetworkPool: PENDING membership created in DB
  // ───────────────────────────────────────────────────────────────────────────

  it('IT-NP-INT-03: joinNetworkPool creates a PENDING membership for a valid member org', async () => {
    const userId = randomUUID();
    const poolRef = `HARNESS-${testRunId}-003`;

    const pool = await svc.createNetworkPool(ownerOrgId, userId, {
      pool_ref:           poolRef,
      commodity_category: 'COTTON_YARN',
      target_qty:         2000,
      qty_unit:           'KG',
    });
    createdPoolIds.push(pool.id);

    // Open the pool before joining
    await svc.openNetworkPool(ownerOrgId, {
      pool_id:       pool.id,
      actor_type:    'TENANT_ADMIN',
      actor_user_id: userId,
      actor_role:    'ORG_ADMIN',
      reason:        `IT-NP-INT-03: open before join [run:${testRunId}]`,
    });

    // Member org joins the open pool
    const membership = await svc.joinNetworkPool(memberOrgId, null, {
      pool_id:      pool.id,
      declared_qty: 500,
      qty_unit:     'KG',
    });

    // Service-level assertions
    expect(membership.pool_id).toBe(pool.id);
    expect(membership.org_id).toBe(memberOrgId);
    expect(membership.status).toBe('PENDING');
    expect(Number(membership.declared_qty)).toBe(500);
    expect(membership.qty_unit).toBe('KG');

    // DB-level verification — membership row must exist
    const dbRow = await (prisma as any).network_pool_memberships.findFirst({
      where: { id: membership.id },
    });
    expect(dbRow).not.toBeNull();
    expect(dbRow.status).toBe('PENDING');
    expect(dbRow.org_id).toBe(memberOrgId);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // IT-NP-INT-04 — joinNetworkPool: rejects duplicate membership (same org)
  // ───────────────────────────────────────────────────────────────────────────

  it('IT-NP-INT-04: joinNetworkPool rejects a duplicate membership from the same org', async () => {
    const userId = randomUUID();
    const poolRef = `HARNESS-${testRunId}-004`;

    const pool = await svc.createNetworkPool(ownerOrgId, userId, {
      pool_ref:           poolRef,
      commodity_category: 'GREY_FABRIC',
      target_qty:         3000,
      qty_unit:           'MT',
    });
    createdPoolIds.push(pool.id);

    await svc.openNetworkPool(ownerOrgId, {
      pool_id:       pool.id,
      actor_type:    'TENANT_ADMIN',
      actor_user_id: userId,
      actor_role:    'ORG_ADMIN',
      reason:        `IT-NP-INT-04: open before duplicate test [run:${testRunId}]`,
    });

    // First join — must succeed
    await svc.joinNetworkPool(memberOrgId, null, {
      pool_id:      pool.id,
      declared_qty: 300,
      qty_unit:     'MT',
    });

    // Second join from same org — must throw NetworkPoolDuplicateMembershipError
    await expect(
      svc.joinNetworkPool(memberOrgId, null, {
        pool_id:      pool.id,
        declared_qty: 100,
        qty_unit:     'MT',
      }),
    ).rejects.toThrow(NetworkPoolDuplicateMembershipError);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // IT-NP-INT-05 — joinNetworkPool: rejects join on a DRAFT pool
  // ───────────────────────────────────────────────────────────────────────────

  it('IT-NP-INT-05: joinNetworkPool rejects join when pool is still in DRAFT state', async () => {
    const userId = randomUUID();
    const poolRef = `HARNESS-${testRunId}-005`;

    // Create pool but intentionally do NOT open it — stays in DRAFT
    const pool = await svc.createNetworkPool(ownerOrgId, userId, {
      pool_ref:           poolRef,
      commodity_category: 'COTTON_YARN',
      target_qty:         1000,
      qty_unit:           'KG',
    });
    createdPoolIds.push(pool.id);

    // Join attempt on DRAFT pool — must throw NetworkPoolInvalidStateError
    await expect(
      svc.joinNetworkPool(memberOrgId, null, {
        pool_id:      pool.id,
        declared_qty: 100,
        qty_unit:     'KG',
      }),
    ).rejects.toThrow(NetworkPoolInvalidStateError);
  });
});
