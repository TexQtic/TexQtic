/**
 * FAM-08D2-NC-POOL-FEATURE-FLAG-PROVISIONING-TEST-001
 *
 * Integration test proving that the canonical NC primary feature flags
 * seeded by migration 20260603000000_nc_pool_primary_flag_seed are present
 * in the remote DB with enabled=true and that both NC feature-gate middlewares
 * allow the request without returning 503 FEATURE_DISABLED.
 *
 * Proves FAM-08 GAP-T3-01B: "No integration test for NC pool route access
 * post-provisioning"
 *
 * SCOPE:
 *   - Reads the two NC primary global feature flags from the real DB
 *   - Calls each middleware with a real Prisma client (no mocking)
 *   - Layer 2: a random UUID orgId is used so no TenantFeatureOverride row
 *     exists — NC Layer 2 is fail-open (no override = allow), so no 503
 *   - No tenant rows are created or deleted
 *   - No feature flag rows are created, modified, or deleted
 *   - No DB mutations of any kind
 *
 * SKIP GUARD:
 *   Skipped unless DATABASE_URL is set in the environment.
 *   Label: NC_PRIMARY_FLAG_INTEGRATION_SKIPPED_NO_TEST_DB
 *   (describe.skipIf(!hasDb))
 *
 * FEATURE FLAG KEYS (Layer 1 global gates):
 *   nc.procurement_pools.enabled       — ncPoolFeatureGateMiddleware
 *   nc.procurement_pools.rfq.enabled   — ncPoolRfqFeatureGateMiddleware
 */

import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';

import { hasDb } from './helpers/dbGate.js';
import { prisma } from '../db/prisma.js';
import { ncPoolFeatureGateMiddleware } from '../middleware/ncPoolFeatureGate.middleware.js';
import { ncPoolRfqFeatureGateMiddleware } from '../middleware/ncPoolRfqFeatureGate.middleware.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const NC_POOL_FLAG_KEY = 'nc.procurement_pools.enabled';
const NC_POOL_RFQ_FLAG_KEY = 'nc.procurement_pools.rfq.enabled';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * Minimal Fastify-shaped request with a random orgId in dbContext.
 * The orgId is a random UUID so no TenantFeatureOverride row will exist for it.
 * NC Layer 2 is fail-open: no override row = allow (override is the exception).
 */
function makeRequest(orgId: string): any {
  return {
    url: '/api/tenant/network-commerce/pools',
    method: 'GET',
    log: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
    dbContext: {
      orgId,
      actorId: 'integration-test-actor',
      realm: 'tenant',
      requestId: `fam08d2-test-${orgId}`,
    },
    params: {},
  };
}

/**
 * Minimal Fastify-shaped reply for asserting gate outcome.
 * Tracks code/body without sending an actual HTTP response.
 */
function makeReply(): { _code: number; _sent: unknown; code: (n: number) => any; send: (b: unknown) => any } {
  const reply: any = {
    _code: 200,
    _sent: null as unknown,
    code(statusCode: number) {
      reply._code = statusCode;
      return reply;
    },
    send(body: unknown) {
      reply._sent = body;
      return reply;
    },
  };
  return reply;
}

// ─── Teardown ─────────────────────────────────────────────────────────────────

afterAll(async () => {
  // No rows were created; disconnect is a courtesy flush only.
  await prisma.$disconnect();
});

// ─── Suite ────────────────────────────────────────────────────────────────────

describe.skipIf(!hasDb)(
  'FAM-08D2 — NC primary feature flags: DB integration proof (GAP-T3-01B)',
  () => {
    // ── §1 — Raw flag row presence (read-only assertion) ──────────────────

    it(
      'INT-001: nc.procurement_pools.enabled flag row exists in DB with enabled=true',
      async () => {
        const row = await prisma.featureFlag.findUnique({
          where: { key: NC_POOL_FLAG_KEY },
          select: { key: true, enabled: true },
        });

        expect(row).not.toBeNull();
        expect(row?.key).toBe(NC_POOL_FLAG_KEY);
        expect(row?.enabled).toBe(true);
      },
    );

    it(
      'INT-002: nc.procurement_pools.rfq.enabled flag row exists in DB with enabled=true',
      async () => {
        const row = await prisma.featureFlag.findUnique({
          where: { key: NC_POOL_RFQ_FLAG_KEY },
          select: { key: true, enabled: true },
        });

        expect(row).not.toBeNull();
        expect(row?.key).toBe(NC_POOL_RFQ_FLAG_KEY);
        expect(row?.enabled).toBe(true);
      },
    );

    // ── §2 — Middleware behaviour with seeded flags ────────────────────────

    it(
      'INT-003: ncPoolFeatureGateMiddleware does not return 503 when global flag is enabled (Layer 1 PASS)',
      async () => {
        // Use a random orgId — no TenantFeatureOverride row will exist for it.
        // Layer 2 is fail-open: no override = allow.
        const orgId = randomUUID();
        const request = makeRequest(orgId);
        const reply = makeReply();

        await ncPoolFeatureGateMiddleware(request as any, reply as any);

        expect(reply._code).toBe(200);
        expect(reply._sent).toBeNull();
      },
    );

    it(
      'INT-004: ncPoolRfqFeatureGateMiddleware does not return 503 when global flag is enabled (Layer 1 PASS)',
      async () => {
        // Same pattern: random orgId, no override row, Layer 2 fail-open.
        const orgId = randomUUID();
        const request = makeRequest(orgId);
        const reply = makeReply();

        await ncPoolRfqFeatureGateMiddleware(request as any, reply as any);

        expect(reply._code).toBe(200);
        expect(reply._sent).toBeNull();
      },
    );

    it(
      'INT-005: neither NC gate returns error code FEATURE_DISABLED for primary global flags',
      async () => {
        const orgId = randomUUID();

        const poolRequest = makeRequest(orgId);
        const poolReply = makeReply();
        await ncPoolFeatureGateMiddleware(poolRequest as any, poolReply as any);

        const rfqRequest = makeRequest(orgId);
        const rfqReply = makeReply();
        await ncPoolRfqFeatureGateMiddleware(rfqRequest as any, rfqReply as any);

        // Confirm neither gate sent a FEATURE_DISABLED error body
        expect((poolReply._sent as any)?.error?.code).not.toBe('FEATURE_DISABLED');
        expect((rfqReply._sent as any)?.error?.code).not.toBe('FEATURE_DISABLED');
      },
    );
  },
);
