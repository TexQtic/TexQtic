#!/usr/bin/env node
/**
 * Marketplace Cart Projection Health Report CLI
 *
 * Prompt #35: Read-only health inspection for MarketplaceCartSummary projections.
 *
 * PURPOSE:
 * Inspects the health and freshness of marketplace cart projections for a given
 * tenant, helping operators determine if a replay is needed.
 *
 * USAGE:
 *   npm run projection:health:marketplace-cart -- --tenant-id <uuid> [options]
 *
 * FLAGS:
 *   --tenant-id <uuid>                  (Required) Tenant to inspect
 *   --json                              (Optional) Output JSON instead of human-readable
 *   --stale-threshold-minutes <number>  (Optional) Staleness threshold (default: 5)
 *
 * HEALTH METRICS:
 * - total_carts: Number of carts for tenant
 * - projection_rows: Number of projection rows for tenant
 * - missing_projections: Carts without projection rows
 * - stale_projections: Projections older than newest relevant event + threshold
 * - Freshness timestamps: newest/oldest event and projection times
 *
 * SAFETY:
 * - Read-only: No database writes
 * - Safe to run repeatedly
 * - No projection mutations
 * - No event replay triggering
 *
 * EXIT CODES:
 * - 0: Success (health computed)
 * - 2: Validation error (invalid UUID, bad arguments)
 * - 1: Fatal error (DB query fails, unexpected crash)
 */

import { PrismaClient } from '@prisma/client';

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

interface CliArgs {
  tenantId: string;
  json: boolean;
  staleThresholdMinutes: number;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);

  const parsed: Partial<CliArgs> = {
    json: false,
    staleThresholdMinutes: 5,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--tenant-id':
        if (!next || next.startsWith('--')) {
          console.error('❌ Error: --tenant-id requires a value');
          printUsage();
          process.exit(2);
        }
        parsed.tenantId = next;
        i++;
        break;

      case '--json':
        parsed.json = true;
        break;

      case '--stale-threshold-minutes':
        if (!next || next.startsWith('--')) {
          console.error('❌ Error: --stale-threshold-minutes requires a value');
          printUsage();
          process.exit(2);
        }
        const threshold = parseInt(next, 10);
        if (isNaN(threshold) || threshold < 0) {
          console.error('❌ Error: --stale-threshold-minutes must be a non-negative number');
          process.exit(2);
        }
        parsed.staleThresholdMinutes = threshold;
        i++;
        break;

      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;

      default:
        console.error(`❌ Error: Unknown flag: ${arg}`);
        printUsage();
        process.exit(2);
    }
  }

  // Validate required arguments
  if (!parsed.tenantId) {
    console.error('❌ Error: --tenant-id is required');
    printUsage();
    process.exit(2);
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(parsed.tenantId)) {
    console.error('❌ Error: --tenant-id must be a valid UUID');
    process.exit(2);
  }

  return parsed as CliArgs;
}

function printUsage() {
  console.log(`
Usage:
  npm run projection:health:marketplace-cart -- --tenant-id <uuid> [options]

Options:
  --tenant-id <uuid>                  (Required) Tenant to inspect
  --json                              (Optional) Output JSON summary
  --stale-threshold-minutes <number>  (Optional) Staleness threshold (default: 5)
  --help, -h                          Show this help message

Examples:
  # Basic health check
  npm run projection:health:marketplace-cart -- --tenant-id abc-123

  # JSON output for automation
  npm run projection:health:marketplace-cart -- --tenant-id abc-123 --json

  # Custom staleness threshold
  npm run projection:health:marketplace-cart -- --tenant-id abc-123 --stale-threshold-minutes 10
  `);
}

// ============================================================================
// HEALTH REPORT TYPES
// ============================================================================

interface HealthReport {
  tenant_id: string;
  total_carts: number;
  projection_rows: number;
  missing_projections: number;
  stale_projections: number;
  stale_threshold_minutes: number;
  newest_event_at: string | null;
  oldest_event_at: string | null;
  newest_projection_at: string | null;
  oldest_projection_at: string | null;
  recommend_replay: boolean;
  checked_at: string;
}

// ============================================================================
// EVENT FILTER
// ============================================================================

const MARKETPLACE_CART_EVENTS = [
  'marketplace.cart.created',
  'marketplace.cart.item.added',
  'marketplace.cart.item.updated',
  'marketplace.cart.item.removed',
] as const;

// ============================================================================
// HEALTH CHECK LOGIC
// ============================================================================

async function computeHealth(args: CliArgs, prisma: PrismaClient): Promise<HealthReport> {
  const checkedAt = new Date().toISOString();

  // 1. Count total carts for tenant
  const totalCarts = await prisma.cart.count({
    where: { tenantId: args.tenantId },
  });

  // 2. Count projection rows for tenant
  const projectionRows = await prisma.marketplaceCartSummary.count({
    where: { tenantId: args.tenantId },
  });

  // 3. Find missing projections (carts without summary)
  const cartsWithProjections = await prisma.marketplaceCartSummary.findMany({
    where: { tenantId: args.tenantId },
    select: { cartId: true },
  });

  const projectedCartIds = new Set(cartsWithProjections.map(p => p.cartId));

  const allCarts = await prisma.cart.findMany({
    where: { tenantId: args.tenantId },
    select: { id: true },
  });

  const missingProjections = allCarts.filter(cart => !projectedCartIds.has(cart.id)).length;

  // 4. Find stale projections
  // A projection is stale if there's an event for that cart
  // created after (projection.lastUpdatedAt + threshold)
  const thresholdMs = args.staleThresholdMinutes * 60 * 1000;

  const projections = await prisma.marketplaceCartSummary.findMany({
    where: { tenantId: args.tenantId },
    select: {
      cartId: true,
      lastUpdatedAt: true,
    },
  });

  let staleCount = 0;

  for (const projection of projections) {
    const thresholdDate = new Date(projection.lastUpdatedAt.getTime() + thresholdMs);

    // Check if there are any relevant events for this cart after the threshold
    const newerEvents = await prisma.eventLog.count({
      where: {
        tenantId: args.tenantId,
        name: { in: MARKETPLACE_CART_EVENTS as unknown as string[] },
        createdAt: { gt: thresholdDate },
        // Events related to this cart (either cart entity or cart_item entity)
        OR: [
          {
            entityType: 'cart',
            entityId: projection.cartId,
          },
          {
            entityType: 'cart_item',
            payloadJson: {
              path: ['cartId'],
              equals: projection.cartId,
            },
          },
        ],
      },
    });

    if (newerEvents > 0) {
      staleCount++;
    }
  }

  // 5. Get event timestamps
  const eventStats = await prisma.eventLog.aggregate({
    where: {
      tenantId: args.tenantId,
      name: { in: MARKETPLACE_CART_EVENTS as unknown as string[] },
    },
    _min: { createdAt: true },
    _max: { createdAt: true },
  });

  // 6. Get projection timestamps
  const projectionStats = await prisma.marketplaceCartSummary.aggregate({
    where: { tenantId: args.tenantId },
    _min: { lastUpdatedAt: true },
    _max: { lastUpdatedAt: true },
  });

  // 7. Determine recommendation
  const recommendReplay = missingProjections > 0 || staleCount > 0;

  return {
    tenant_id: args.tenantId,
    total_carts: totalCarts,
    projection_rows: projectionRows,
    missing_projections: missingProjections,
    stale_projections: staleCount,
    stale_threshold_minutes: args.staleThresholdMinutes,
    newest_event_at: eventStats._max.createdAt?.toISOString() || null,
    oldest_event_at: eventStats._min.createdAt?.toISOString() || null,
    newest_projection_at: projectionStats._max.lastUpdatedAt?.toISOString() || null,
    oldest_projection_at: projectionStats._min.lastUpdatedAt?.toISOString() || null,
    recommend_replay: recommendReplay,
    checked_at: checkedAt,
  };
}

// ============================================================================
// OUTPUT FORMATTING
// ============================================================================

function printHumanReport(report: HealthReport) {
  console.log('\n📊 Marketplace Cart Projection Health');
  console.log('━'.repeat(60));
  console.log(`Tenant: ${report.tenant_id}`);
  console.log();

  console.log('Carts:');
  console.log(`  Total carts:              ${report.total_carts}`);
  console.log(`  Projection rows:          ${report.projection_rows}`);
  console.log(`  Missing projections:      ${report.missing_projections}`);
  console.log();

  console.log('Freshness:');
  console.log(
    `  Stale projections:        ${report.stale_projections} (threshold: ${report.stale_threshold_minutes} min)`
  );
  console.log(`  Newest event at:          ${report.newest_event_at || 'N/A'}`);
  console.log(`  Newest projection at:     ${report.newest_projection_at || 'N/A'}`);
  console.log();

  console.log('Status:');
  if (report.recommend_replay) {
    console.log('  ⚠️  Replay recommended');
    if (report.missing_projections > 0) {
      console.log(`      - ${report.missing_projections} cart(s) missing projections`);
    }
    if (report.stale_projections > 0) {
      console.log(`      - ${report.stale_projections} projection(s) stale`);
    }
  } else {
    console.log('  ✅ Projections healthy');
  }

  console.log('━'.repeat(60));
  console.log(`Checked at: ${report.checked_at}\n`);
}

function printJsonReport(report: HealthReport) {
  console.log(JSON.stringify(report));
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main() {
  const args = parseArgs();
  const prisma = new PrismaClient();

  try {
    const report = await computeHealth(args, prisma);

    if (args.json) {
      printJsonReport(report);
    } else {
      printHumanReport(report);
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// ============================================================================
// ENTRY POINT
// ============================================================================

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
