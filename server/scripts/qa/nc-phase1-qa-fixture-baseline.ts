#!/usr/bin/env tsx
/**
 * TEXQTIC-NC-PHASE1-POST-AUDIT-QA-SEED-RESET-001
 * NC Phase 1 QA Fixture Baseline Seed Script
 *
 * STATUS: POST_PHASE1_AUDIT_BASELINE — 2026-07-06
 * AUTHORIZED: REQUIRES EXPLICIT PARESH_AUTHORIZED=true ENV VAR BEFORE RUNNING
 *
 * PURPOSE:
 *   Creates a documented, idempotent QA fixture baseline representing the Network
 *   Commerce Phase 1 (CPP Packet 17–21) complete state. Intended for:
 *     - Post-deployment manual verification
 *     - Stakeholder demo data
 *     - Regression anchor after schema or service changes
 *
 * PHASE 1 PACKET COVERAGE:
 *   P17 — Pool RFQ Issue + Supplier Invites (pool in CLOSED_FOR_BIDS, RFQ ISSUED)
 *   P18 — Pool Order flow (pool in AGGREGATING with ACTIVE demand lines)
 *   P19 — NC Invoice (DRAFT POOL_ORDER invoice linked to P18 pool)
 *   P20 — Settlement visibility (PENDING splits on P18 pool, no money movement)
 *   P21 — Lifecycle log read surface (fixture documented; log rows OPTIONAL — see below)
 *
 * QA ORGS CREATED (if absent):
 *   qa-nc-pool-a   — Pool owner org (buyer / aggregator)
 *   qa-nc-sup-a    — Supplier org (invited to RFQ)
 *
 * SAFETY RULES:
 *   - All entity identifiers use qa-nc- prefix or NC-P1x-BASELINE- pool refs
 *   - Idempotent: skips creation of entities whose unique ref already exists
 *   - NO DDL, no schema changes
 *   - NO feature flag activation (flags are not touched by this script)
 *   - NO money movement (settlement splits are PENDING only)
 *   - nc.settlement_waterfall.enabled is NOT read or changed here
 *   - ttp_enabled is NOT read or changed here
 *   - Lifecycle log entries (P21) are APPEND-ONLY per G-020 D-020-D:
 *     they can never be deleted. Creation is SKIPPED by default.
 *     Set INCLUDE_LIFECYCLE_LOGS=true to opt-in to writing log rows.
 *
 * USAGE (AUTHORIZED RUN ONLY):
 *   cd server
 *   PARESH_AUTHORIZED=true tsx scripts/qa/nc-phase1-qa-fixture-baseline.ts
 *
 *   To include lifecycle log rows (permanent, unremovable):
 *   PARESH_AUTHORIZED=true INCLUDE_LIFECYCLE_LOGS=true tsx scripts/qa/nc-phase1-qa-fixture-baseline.ts
 *
 * CLEANUP:
 *   The following entities CAN be deleted via Prisma / SQL (CASCADE deletes children):
 *     network_pools (cascades: demand_lines, snapshots, rfqs, invites, invoices, split fixtures)
 *     tenants (cascades most org-linked entities)
 *   Lifecycle log rows CANNOT be deleted (immutable trigger blocks DELETE).
 *   Run cleanup SQL ONLY with explicit Paresh authorization.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

// ─── Authorization Gate ────────────────────────────────────────────────────────

if (process.env.PARESH_AUTHORIZED !== 'true') {
  console.error(
    '[STOP] This script requires explicit authorization.\n' +
    '       Run with: PARESH_AUTHORIZED=true tsx scripts/qa/nc-phase1-qa-fixture-baseline.ts\n' +
    '       Do NOT run against production Supabase without Paresh decision.'
  );
  process.exit(1);
}

const INCLUDE_LIFECYCLE_LOGS = process.env.INCLUDE_LIFECYCLE_LOGS === 'true';

// ─── QA-prefix safety enforcer ────────────────────────────────────────────────

function assertQaSlug(slug: string) {
  if (!slug.startsWith('qa-')) {
    throw new Error(`STOP: non-QA slug detected: "${slug}"`);
  }
}

function assertQaRef(ref: string) {
  if (!ref.startsWith('NC-P1') && !ref.startsWith('qa-nc-')) {
    throw new Error(`STOP: non-QA poolRef detected: "${ref}"`);
  }
}

// ─── Prisma client ────────────────────────────────────────────────────────────

const prisma = new PrismaClient({ log: ['warn', 'error'] });

// ─── Fixed fixture identifiers (stable, idempotency key) ─────────────────────

/** QA org slugs created by this script. */
const QA_NC_POOL_OWNER_SLUG = 'qa-nc-pool-a';
const QA_NC_SUPPLIER_SLUG   = 'qa-nc-sup-a';

/**
 * Fixed pool refs — unique within (orgId, poolRef).
 * P17 pool: RFQ issued scenario (CLOSED_FOR_BIDS state)
 * P18 pool: Demand aggregation scenario (AGGREGATING state)
 */
const P17_POOL_REF = 'NC-P17-BASELINE-POOL-001';
const P18_POOL_REF = 'NC-P18-BASELINE-POOL-001';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Look up a lifecycle state ID for the given entityType + stateKey.
 * Throws if the state is missing (requires lifecycle seed to have been run).
 */
async function requireLifecycleState(entityType: string, stateKey: string): Promise<string> {
  const state = await prisma.lifecycleState.findUnique({
    where: { entityType_stateKey: { entityType, stateKey } },
    select: { id: true },
  });
  if (!state) {
    throw new Error(
      `STOP: Missing lifecycle state ${entityType}/${stateKey}. ` +
      `Ensure TEXQTIC-NC-PHASE1-POOL-LIFECYCLE-SEED-001 has been applied.`
    );
  }
  return state.id;
}

/**
 * Find or create a QA tenant + linked organization row (shared UUID pattern).
 * Tenant and organizations rows share the same UUID (organizations.id = tenants.id).
 * Returns the org ID (same as tenant ID).
 */
async function upsertQaTenant(
  slug: string,
  name: string,
  label: string,
): Promise<string> {
  assertQaSlug(slug);

  const existing = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (existing) {
    console.log(`  [SKIP] ${label} tenant already exists (slug: ${slug}, id: ${existing.id})`);
    return existing.id;
  }

  const orgId = randomUUID();

  // Block A: Create tenant
  await prisma.tenant.create({
    data: {
      id:        orgId,
      slug,
      name,
      type:      'B2B',
      status:    'ACTIVE',
      plan:      'PROFESSIONAL',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Block B: Create linked organizations row (same ID — required by NC entity FKs)
  await prisma.organizations.upsert({
    where:  { id: orgId },
    create: {
      id:                 orgId,
      slug,
      legal_name:         name,
      jurisdiction:       'UNKNOWN',
      org_type:           'B2B',
      status:             'ACTIVE',
      plan:               'PROFESSIONAL',
      is_white_label:     false,
      publication_posture: 'PRIVATE_OR_AUTH_ONLY',
    },
    update: {},
  });

  console.log(`  [CREATE] ${label} tenant + org created (slug: ${slug}, id: ${orgId})`);
  return orgId;
}

/**
 * Find or create a pool by (orgId, poolRef).
 * Returns the pool ID.
 */
async function upsertPool(
  orgId: string,
  poolRef: string,
  lifecycleStateId: string,
  commodityCategory: string,
  label: string,
  createdByUserId: string,
): Promise<string> {
  assertQaRef(poolRef);

  const existing = await prisma.networkPool.findFirst({
    where: { orgId, poolRef },
    select: { id: true },
  });
  if (existing) {
    console.log(`  [SKIP] ${label} pool already exists (poolRef: ${poolRef}, id: ${existing.id})`);
    return existing.id;
  }

  const pool = await prisma.networkPool.create({
    data: {
      id:                randomUUID(),
      orgId,
      poolRef,
      commodityCategory,
      targetQty:         new Prisma.Decimal(5000),
      qtyUnit:           'KG',
      lifecycleStateId,
      createdByUserId,
    },
    select: { id: true },
  });

  console.log(`  [CREATE] ${label} pool created (poolRef: ${poolRef}, id: ${pool.id})`);
  return pool.id;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[NC-P1-QA-SEED] TEXQTIC-NC-PHASE1-POST-AUDIT-QA-SEED-RESET-001');
  console.log('[NC-P1-QA-SEED] STATUS: POST_PHASE1_AUDIT_BASELINE');
  console.log('[NC-P1-QA-SEED] DB: Supabase PostgreSQL (DATABASE_URL loaded from .env)');
  console.log('[NC-P1-QA-SEED] LIFECYCLE_LOGS:', INCLUDE_LIFECYCLE_LOGS ? 'ENABLED (rows will be permanent)' : 'DISABLED (default)');
  console.log('');

  // ── PREFLIGHT ────────────────────────────────────────────────────────────────

  console.log('[PREFLIGHT] P1: Confirm NC schema tables exist');
  const nccTables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'tenants', 'organizations',
        'network_pools', 'network_pool_memberships',
        'network_pool_demand_lines', 'network_pool_demand_snapshots',
        'network_pool_rfqs', 'network_pool_rfq_supplier_invites',
        'network_invoices', 'network_settlement_splits',
        'lifecycle_states', 'network_lifecycle_logs'
      )
    ORDER BY table_name
  `;
  const tableNames = nccTables.map((t: { table_name: string }) => t.table_name);
  const requiredTables = [
    'tenants', 'organizations',
    'network_pools', 'network_pool_memberships',
    'network_pool_demand_lines', 'network_pool_demand_snapshots',
    'network_pool_rfqs', 'network_pool_rfq_supplier_invites',
    'network_invoices', 'network_settlement_splits',
    'lifecycle_states', 'network_lifecycle_logs',
  ];
  const missingTables = requiredTables.filter(t => !tableNames.includes(t));
  if (missingTables.length > 0) {
    throw new Error(`[PREFLIGHT] STOP: Missing tables: ${missingTables.join(', ')}`);
  }
  console.log('[PREFLIGHT] P1 PASS: All 12 NC Phase 1 schema tables present');

  console.log('[PREFLIGHT] P2: Confirm POOL lifecycle states exist');
  const poolStates = await prisma.lifecycleState.findMany({
    where: { entityType: 'POOL' },
    select: { stateKey: true },
  });
  const poolStateKeys = poolStates.map((s: { stateKey: string }) => s.stateKey);
  const requiredStates = ['DRAFT', 'OPEN', 'AGGREGATING', 'CLOSED_FOR_BIDS', 'ALLOCATED', 'SETTLED', 'CANCELLED'];
  const missingStates = requiredStates.filter(k => !poolStateKeys.includes(k));
  if (missingStates.length > 0) {
    throw new Error(`[PREFLIGHT] STOP: Missing POOL lifecycle states: ${missingStates.join(', ')}`);
  }
  console.log(`[PREFLIGHT] P2 PASS: POOL lifecycle states confirmed (${poolStateKeys.join(', ')})`);

  console.log('');

  // ── STEP 1: QA Tenant orgs ──────────────────────────────────────────────────

  console.log('[STEP 1] Creating / verifying QA NC tenant orgs');

  const poolOwnerOrgId = await upsertQaTenant(
    QA_NC_POOL_OWNER_SLUG,
    'QA NC Pool Owner A',
    'Pool owner',
  );

  const supplierOrgId = await upsertQaTenant(
    QA_NC_SUPPLIER_SLUG,
    'QA NC Supplier A',
    'Supplier',
  );

  // Synthetic user IDs for fixture reference (no real user rows required for pool fields)
  const FIXTURE_CREATED_BY_USER_ID = randomUUID();

  console.log('');

  // ── STEP 2: P18 fixture — Pool in AGGREGATING (demand lines + pool order flow) ──

  console.log('[STEP 2] P18 fixture: Pool in AGGREGATING state with ACTIVE demand lines');

  const aggregatingStateId = await requireLifecycleState('POOL', 'AGGREGATING');

  const p18PoolId = await upsertPool(
    poolOwnerOrgId,
    P18_POOL_REF,
    aggregatingStateId,
    'COTTON_YARN',
    'P18 (Pool Order)',
    FIXTURE_CREATED_BY_USER_ID,
  );

  // P18 demand lines
  const p18ExistingLines = await prisma.networkPoolDemandLine.count({
    where: { poolId: p18PoolId },
  });
  if (p18ExistingLines > 0) {
    console.log(`  [SKIP] P18 demand lines already exist (${p18ExistingLines} rows)`);
  } else {
    await prisma.networkPoolDemandLine.createMany({
      data: [
        {
          id:                        randomUUID(),
          ownerOrgId:                poolOwnerOrgId,
          poolId:                    p18PoolId,
          lineRef:                   'NC-P18-DL-001',
          commodityCategory:         'COTTON_YARN',
          qty:                       new Prisma.Decimal(2500),
          qtyUnit:                   'KG',
          status:                    'ACTIVE',
          sourceType:                'OWNER_DIRECT',
          normalizedFromMemberInput: false,
          revisionNo:                1,
          supersedesLineId:          null,
        },
        {
          id:                        randomUUID(),
          ownerOrgId:                poolOwnerOrgId,
          poolId:                    p18PoolId,
          lineRef:                   'NC-P18-DL-002',
          commodityCategory:         'COTTON_YARN',
          qty:                       new Prisma.Decimal(1500),
          qtyUnit:                   'KG',
          status:                    'ACTIVE',
          sourceType:                'OWNER_DIRECT',
          normalizedFromMemberInput: false,
          revisionNo:                1,
          supersedesLineId:          null,
        },
      ],
    });
    console.log('  [CREATE] P18 demand lines created (2 ACTIVE demand lines, NC-P18-DL-001 + NC-P18-DL-002)');
  }

  // P18 membership (pool owner is a member of their own pool in AGGREGATING state)
  const p18MembershipExists = await prisma.networkPoolMembership.findFirst({
    where: { poolId: p18PoolId, orgId: poolOwnerOrgId },
  });
  if (p18MembershipExists) {
    console.log('  [SKIP] P18 pool membership already exists');
  } else {
    await prisma.networkPoolMembership.create({
      data: {
        id:          randomUUID(),
        poolId:      p18PoolId,
        orgId:       poolOwnerOrgId,
        declaredQty: new Prisma.Decimal(4000),
        qtyUnit:     'KG',
        status:      'APPROVED',
        joinedAt:    new Date(),
        approvedAt:  new Date(),
      },
    });
    console.log('  [CREATE] P18 pool owner membership created (APPROVED)');
  }

  console.log('');

  // ── STEP 3: P17 fixture — Pool in CLOSED_FOR_BIDS with ISSUED RFQ ──────────

  console.log('[STEP 3] P17 fixture: Pool in CLOSED_FOR_BIDS state with ISSUED RFQ');

  const closedForBidsStateId = await requireLifecycleState('POOL', 'CLOSED_FOR_BIDS');

  const p17PoolId = await upsertPool(
    poolOwnerOrgId,
    P17_POOL_REF,
    closedForBidsStateId,
    'GREY_FABRIC',
    'P17 (RFQ Issue)',
    FIXTURE_CREATED_BY_USER_ID,
  );

  // P17 demand line (LOCKED_FOR_RFQ)
  const p17LineRef = 'NC-P17-DL-001';
  let p17LineId: string;

  const existingP17Line = await prisma.networkPoolDemandLine.findFirst({
    where: { poolId: p17PoolId, lineRef: p17LineRef },
    select: { id: true },
  });
  if (existingP17Line) {
    console.log('  [SKIP] P17 demand line already exists');
    p17LineId = existingP17Line.id;
  } else {
    p17LineId = randomUUID();
    await prisma.networkPoolDemandLine.create({
      data: {
        id:                        p17LineId,
        ownerOrgId:                poolOwnerOrgId,
        poolId:                    p17PoolId,
        lineRef:                   p17LineRef,
        commodityCategory:         'GREY_FABRIC',
        qty:                       new Prisma.Decimal(3000),
        qtyUnit:                   'MT',
        status:                    'LOCKED_FOR_RFQ',
        lockedAt:                  new Date(),
        sourceType:                'OWNER_DIRECT',
        normalizedFromMemberInput: false,
        revisionNo:                1,
      },
    });
    console.log(`  [CREATE] P17 demand line created (LOCKED_FOR_RFQ, lineRef: ${p17LineRef})`);
  }

  // P17 demand snapshot
  const p17SnapshotRef = 'NC-P17-SNAP-001';
  let p17SnapshotId: string;

  const existingP17Snapshot = await prisma.networkPoolDemandSnapshot.findFirst({
    where: { poolId: p17PoolId, snapshotRef: p17SnapshotRef },
    select: { id: true },
  });
  if (existingP17Snapshot) {
    console.log('  [SKIP] P17 demand snapshot already exists');
    p17SnapshotId = existingP17Snapshot.id;
  } else {
    p17SnapshotId = randomUUID();
    await prisma.networkPoolDemandSnapshot.create({
      data: {
        id:              p17SnapshotId,
        ownerOrgId:      poolOwnerOrgId,
        poolId:          p17PoolId,
        snapshotRef:     p17SnapshotRef,
        snapshotVersion: 1,
        basis:           'RFQ_ISSUE',
        status:          'CAPTURED',
        capturedAt:      new Date(),
        lineCount:       1,
        totalQty:        new Prisma.Decimal(3000),
        qtyUnit:         'MT',
      },
    });
    console.log('  [CREATE] P17 demand snapshot created (CAPTURED)');
  }

  // P17 snapshot line
  const p17SnapshotLineExists = await prisma.networkPoolDemandSnapshotLine.findFirst({
    where: { snapshotId: p17SnapshotId },
  });
  if (!p17SnapshotLineExists) {
    await prisma.networkPoolDemandSnapshotLine.create({
      data: {
        id:                        randomUUID(),
        snapshotId:                p17SnapshotId,
        ownerOrgId:                poolOwnerOrgId,
        poolId:                    p17PoolId,
        demandLineId:              p17LineId,
        sourceLineRef:             p17LineRef,
        sourceRevisionNo:          1,
        commodityCategory:         'GREY_FABRIC',
        qty:                       new Prisma.Decimal(3000),
        qtyUnit:                   'MT',
        normalizedFromMemberInput: false,
        supersedesLineId:          null,
        sourceMembershipId:        null,
      },
    });
    console.log('  [CREATE] P17 snapshot line created');
  } else {
    console.log('  [SKIP] P17 snapshot line already exists');
  }

  // P17 RFQ
  const p17RfqRef = 'NC-P17-RFQ-001';
  let p17RfqId: string;

  const existingP17Rfq = await prisma.networkPoolRfq.findFirst({
    where: { poolId: p17PoolId, rfqRef: p17RfqRef },
    select: { id: true },
  });
  if (existingP17Rfq) {
    console.log('  [SKIP] P17 RFQ already exists');
    p17RfqId = existingP17Rfq.id;
  } else {
    p17RfqId = randomUUID();
    await prisma.networkPoolRfq.create({
      data: {
        id:                 p17RfqId,
        ownerOrgId:         poolOwnerOrgId,
        poolId:             p17PoolId,
        snapshotId:         p17SnapshotId,
        rfqRef:             p17RfqRef,
        rfqVersion:         1,
        status:             'ISSUED',
        issueBasis:         'SNAPSHOT_LOCK',
        issuedAt:           new Date(),
        issuedByUserId:     FIXTURE_CREATED_BY_USER_ID,
        supplierInviteMode: 'INVITE_ONLY',
        lineCount:          1,
        totalQty:           new Prisma.Decimal(3000),
        qtyUnit:            'MT',
      },
    });
    console.log(`  [CREATE] P17 RFQ created (ISSUED, rfqRef: ${p17RfqRef})`);
  }

  console.log('');

  // ── STEP 4: P17b fixture — Supplier invite (PENDING) ───────────────────────

  console.log('[STEP 4] P17b fixture: Supplier invite (PENDING)');

  const p17InviteExists = await prisma.networkPoolRfqSupplierInvite.findFirst({
    where: { rfqId: p17RfqId, supplierOrgId },
  });
  if (p17InviteExists) {
    console.log('  [SKIP] P17 supplier invite already exists');
  } else {
    await prisma.networkPoolRfqSupplierInvite.create({
      data: {
        id:               randomUUID(),
        ownerOrgId:       poolOwnerOrgId,
        supplierOrgId,
        rfqId:            p17RfqId,
        poolId:           p17PoolId,
        status:           'PENDING',
        inviteRef:        'NC-P17-INV-001',
        expiresAt:        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        invitedByUserId:  FIXTURE_CREATED_BY_USER_ID,  // synthetic; no FK enforced (OD-4)
        cancelReason:     null,
        cancelledAt:      null,
        declineReason:    null,
        declinedAt:       null,
        acceptedAt:       null,
      },
    });
    console.log('  [CREATE] P17 supplier invite created (PENDING, inviteRef: NC-P17-INV-001)');
  }

  console.log('');

  // ── STEP 5: P19 fixture — NC invoice (DRAFT POOL_ORDER) ───────────────────

  console.log('[STEP 5] P19 fixture: NC Invoice (DRAFT POOL_ORDER) for P18 pool');

  const p19InvoiceNumber = 'NC-P19-INV-001';
  const p19InvoiceExists = await prisma.networkInvoice.findFirst({
    where: { orgId: poolOwnerOrgId, invoiceNumber: p19InvoiceNumber },
  });
  if (p19InvoiceExists) {
    console.log('  [SKIP] P19 NC invoice already exists');
  } else {
    await prisma.networkInvoice.create({
      data: {
        id:                randomUUID(),
        orgId:             poolOwnerOrgId,
        invoiceType:       'POOL_ORDER',
        networkEntityType: 'POOL',
        networkEntityId:   p18PoolId,
        invoiceNumber:     p19InvoiceNumber,
        invoiceDate:       new Date('2026-07-06T00:00:00.000Z'),
        dueDate:           new Date('2026-09-05T00:00:00.000Z'),
        currency:          'INR',
        grossAmount:       new Prisma.Decimal(400000),
        issuerOrgId:       poolOwnerOrgId,
        status:            'DRAFT',
      },
    });
    console.log('  [CREATE] P19 NC invoice created (DRAFT, invoiceNumber: NC-P19-INV-001)');
  }

  console.log('');

  // ── STEP 6: P20 fixture — Settlement split (PENDING, no money movement) ────

  console.log('[STEP 6] P20 fixture: Settlement split (PENDING) for P18 pool');
  console.log('         NOTE: nc.settlement_waterfall.enabled=false; only PENDING status is created');
  console.log('         No TRIGGERED/RELEASED rows. No money movement. No platform-held funds.');

  const p20SplitExists = await prisma.networkSettlementSplit.findFirst({
    where: { orgId: poolOwnerOrgId, entityId: p18PoolId, recipientOrgId: poolOwnerOrgId },
  });
  if (p20SplitExists) {
    console.log('  [SKIP] P20 settlement split already exists');
  } else {
    await prisma.networkSettlementSplit.create({
      data: {
        id:               randomUUID(),
        orgId:            poolOwnerOrgId,
        entityType:       'POOL',
        entityId:         p18PoolId,
        recipientOrgId:   poolOwnerOrgId,
        waterfallSeq:     1,
        currency:         'INR',
        grossAmount:      new Prisma.Decimal('400000.000000'),
        holdbackAmount:   new Prisma.Decimal('0'),
        penaltyDeduction: new Prisma.Decimal('0'),
        netPayable:       new Prisma.Decimal('400000.000000'),
        status:           'PENDING',
        escrowAccountId:  null,
        triggeredAt:      null,
        releasedAt:       null,
      },
    });
    console.log('  [CREATE] P20 settlement split created (PENDING, netPayable: 400000 INR)');
  }

  console.log('');

  // ── STEP 7: P21 fixture — Lifecycle log (OPTIONAL — APPEND-ONLY) ──────────

  console.log('[STEP 7] P21 fixture: Lifecycle log entries');

  if (!INCLUDE_LIFECYCLE_LOGS) {
    console.log('  [SKIP] INCLUDE_LIFECYCLE_LOGS=false (default)');
    console.log('         Re-run with INCLUDE_LIFECYCLE_LOGS=true to create append-only log rows.');
    console.log('         WARNING: Lifecycle log rows can NEVER be deleted (G-020 D-020-D).');
  } else {
    console.log('  [WARN] INCLUDE_LIFECYCLE_LOGS=true — log rows will be permanently immutable');
    console.log('         Writing lifecycle log entries for P21 read surface fixture...');

    // Count existing logs for these pools to avoid duplicating entries
    const existingP18Logs = await prisma.networkLifecycleLog.count({
      where: { entityId: p18PoolId },
    });
    const existingP17Logs = await prisma.networkLifecycleLog.count({
      where: { entityId: p17PoolId },
    });

    if (existingP18Logs === 0) {
      await prisma.networkLifecycleLog.create({
        data: {
          id:          randomUUID(),
          orgId:       poolOwnerOrgId,
          entityType:  'POOL',
          entityId:    p18PoolId,
          fromStateKey: 'DRAFT',
          toStateKey:   'OPEN',
          actorType:    'TENANT_ADMIN',
          actorRole:    'ORG_ADMIN',
          actorUserId:  FIXTURE_CREATED_BY_USER_ID,
          aiTriggered:  false,
          reason:       'NC-PHASE1-QA-BASELINE: P18 pool opened for aggregation fixture',
          requestId:    'qa-baseline-seed-001',
        },
      });
      console.log('  [CREATE] P21 lifecycle log: P18 pool DRAFT→OPEN (permanent)');
    } else {
      console.log(`  [SKIP] P21 P18 pool already has ${existingP18Logs} lifecycle log row(s)`);
    }

    if (existingP17Logs === 0) {
      await prisma.networkLifecycleLog.create({
        data: {
          id:          randomUUID(),
          orgId:       poolOwnerOrgId,
          entityType:  'POOL',
          entityId:    p17PoolId,
          fromStateKey: 'DRAFT',
          toStateKey:   'OPEN',
          actorType:    'TENANT_ADMIN',
          actorRole:    'ORG_ADMIN',
          actorUserId:  FIXTURE_CREATED_BY_USER_ID,
          aiTriggered:  false,
          reason:       'NC-PHASE1-QA-BASELINE: P17 pool opened for RFQ fixture',
          requestId:    'qa-baseline-seed-001',
        },
      });
      console.log('  [CREATE] P21 lifecycle log: P17 pool DRAFT→OPEN (permanent)');
    } else {
      console.log(`  [SKIP] P21 P17 pool already has ${existingP17Logs} lifecycle log row(s)`);
    }
  }

  console.log('');

  // ── SUMMARY ──────────────────────────────────────────────────────────────────

  console.log('[SUMMARY] NC Phase 1 QA Fixture Baseline complete');
  console.log('[SUMMARY] QA orgs:');
  console.log(`  Pool owner: ${QA_NC_POOL_OWNER_SLUG} (id: ${poolOwnerOrgId})`);
  console.log(`  Supplier:   ${QA_NC_SUPPLIER_SLUG} (id: ${supplierOrgId})`);
  console.log('[SUMMARY] Fixture pools:');
  console.log(`  P17 (RFQ/Invite): ${P17_POOL_REF} (id: ${p17PoolId}) — state: CLOSED_FOR_BIDS`);
  console.log(`  P18 (Order):      ${P18_POOL_REF} (id: ${p18PoolId}) — state: AGGREGATING`);
  console.log('[SUMMARY] Feature flags: NOT CHANGED by this script');
  console.log('[SUMMARY] Settlement: PENDING splits only, no money movement');
  console.log('[SUMMARY] Lifecycle logs:', INCLUDE_LIFECYCLE_LOGS ? 'WRITTEN (permanent)' : 'SKIPPED');
  console.log('');
  console.log('[DONE] POST_PHASE1_AUDIT_BASELINE seed complete');
}

// ─── Entry ─────────────────────────────────────────────────────────────────────

main()
  .catch((err: unknown) => {
    console.error('[ERROR]', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
