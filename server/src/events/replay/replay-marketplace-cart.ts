#!/usr/bin/env node
/**
 * CLI Replay for Marketplace Cart Projections
 *
 * Prompt #33: Idempotent backfill utility for MarketplaceCartSummary projections.
 *
 * PURPOSE:
 * Replays historical marketplace.cart.* events from EventLog and applies
 * projections via the existing projection engine. Enables backfill and rebuild
 * of projection tables without modifying write paths.
 *
 * USAGE:
 *   npm run replay:marketplace-cart -- --tenant-id <uuid> [options]
 *
 * FLAGS:
 *   --tenant-id <uuid>         (Required) Tenant to replay events for
 *   --since-event-id <uuid>    (Optional) Resume from event ID (exclusive)
 *   --since <iso-datetime>     (Optional) Resume from timestamp (exclusive)
 *   --limit <number>           (Optional) Max events to process (default: 5000, max: 50000)
 *   --dry-run                  (Optional) Count events without applying projections
 *   --verbose                  (Optional) Log every event name/id
 *
 * CONSTRAINTS:
 * - Cannot use both --since-event-id and --since together
 * - Limit must be between 1 and 50000
 * - Tenant ID must be a valid UUID
 *
 * SAFETY:
 * - Best-effort: projection failures are logged but don't stop processing
 * - Idempotent: safe to rerun (existing projections are updated/skipped)
 * - Tenant-isolated: only processes events for specified tenant
 * - Stable ordering: createdAt ASC, id ASC (deterministic replay)
 *
 * OUTPUT:
 * - Progress logs during processing
 * - Final summary: scanned, applied, failed, duration
 * - Exit code 0 on success, 1 on error
 */

import { PrismaClient, Prisma } from '@prisma/client';
import type { EventEnvelope, EventActor, EventEntity } from '../../lib/events.js';
import { applyProjections } from '../projections/index.js';
// Auto-register projection handlers
import '../handlers/index.js';

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

interface CliArgs {
  tenantId: string;
  sinceEventId?: string;
  since?: string;
  limit: number;
  dryRun: boolean;
  verbose: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);

  const parsed: Partial<CliArgs> = {
    limit: 5000,
    dryRun: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--tenant-id':
        if (!next || next.startsWith('--')) {
          console.error('❌ Error: --tenant-id requires a value');
          printUsage();
          process.exit(1);
        }
        parsed.tenantId = next;
        i++;
        break;

      case '--since-event-id':
        if (!next || next.startsWith('--')) {
          console.error('❌ Error: --since-event-id requires a value');
          printUsage();
          process.exit(1);
        }
        parsed.sinceEventId = next;
        i++;
        break;

      case '--since':
        if (!next || next.startsWith('--')) {
          console.error('❌ Error: --since requires a value');
          printUsage();
          process.exit(1);
        }
        parsed.since = next;
        i++;
        break;

      case '--limit':
        if (!next || next.startsWith('--')) {
          console.error('❌ Error: --limit requires a value');
          printUsage();
          process.exit(1);
        }
        const limit = parseInt(next, 10);
        if (isNaN(limit) || limit < 1 || limit > 50000) {
          console.error('❌ Error: --limit must be between 1 and 50000');
          process.exit(1);
        }
        parsed.limit = limit;
        i++;
        break;

      case '--dry-run':
        parsed.dryRun = true;
        break;

      case '--verbose':
        parsed.verbose = true;
        break;

      default:
        console.error(`❌ Error: Unknown flag: ${arg}`);
        printUsage();
        process.exit(1);
    }
  }

  // Validate required arguments
  if (!parsed.tenantId) {
    console.error('❌ Error: --tenant-id is required');
    printUsage();
    process.exit(1);
  }

  // Validate mutual exclusion
  if (parsed.sinceEventId && parsed.since) {
    console.error('❌ Error: Cannot use both --since-event-id and --since together');
    printUsage();
    process.exit(1);
  }

  // Validate UUID format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(parsed.tenantId)) {
    console.error('❌ Error: --tenant-id must be a valid UUID');
    process.exit(1);
  }

  if (parsed.sinceEventId && !uuidRegex.test(parsed.sinceEventId)) {
    console.error('❌ Error: --since-event-id must be a valid UUID');
    process.exit(1);
  }

  // Validate ISO datetime (basic check)
  if (parsed.since) {
    const date = new Date(parsed.since);
    if (isNaN(date.getTime())) {
      console.error('❌ Error: --since must be a valid ISO datetime');
      process.exit(1);
    }
  }

  return parsed as CliArgs;
}

function printUsage() {
  console.log(`
Usage:
  npm run replay:marketplace-cart -- --tenant-id <uuid> [options]

Options:
  --tenant-id <uuid>         (Required) Tenant to replay events for
  --since-event-id <uuid>    (Optional) Resume from event ID (exclusive)
  --since <iso-datetime>     (Optional) Resume from timestamp (exclusive)
  --limit <number>           (Optional) Max events to process (default: 5000, max: 50000)
  --dry-run                  (Optional) Count events without applying projections
  --verbose                  (Optional) Log every event name/id

Examples:
  # Dry-run for a tenant
  npm run replay:marketplace-cart -- --tenant-id abc-123 --dry-run

  # Replay up to 1000 events
  npm run replay:marketplace-cart -- --tenant-id abc-123 --limit 1000

  # Resume from a specific event
  npm run replay:marketplace-cart -- --tenant-id abc-123 --since-event-id xyz-789

  # Resume from a timestamp
  npm run replay:marketplace-cart -- --tenant-id abc-123 --since 2026-01-01T00:00:00Z
  `);
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
// EVENT LOG TO ENVELOPE MAPPING
// ============================================================================

type EventLogRow = {
  id: string;
  version: string;
  name: string;
  occurredAt: Date;
  tenantId: string | null;
  realm: string;
  actorType: string;
  actorId: string | null;
  entityType: string;
  entityId: string;
  payloadJson: Prisma.JsonValue | null;
  metadataJson: Prisma.JsonValue | null;
  createdAt: Date;
};

function mapEventLogToEnvelope(row: EventLogRow): EventEnvelope {
  // Map database row to EventEnvelope structure
  const actor: EventActor = {
    type: row.actorType as 'ADMIN' | 'USER' | 'SYSTEM',
    id: row.actorId,
  };

  const entity: EventEntity = {
    type: row.entityType,
    id: row.entityId,
  };

  const envelope: EventEnvelope = {
    id: row.id,
    version: row.version as 'v1',
    name: row.name,
    occurredAt: row.occurredAt.toISOString(),
    tenantId: row.tenantId,
    realm: row.realm as 'ADMIN' | 'TENANT',
    actor,
    entity,
    payload: (row.payloadJson as Record<string, unknown>) || {},
    metadata: (row.metadataJson as Record<string, unknown>) || {},
  };

  return envelope;
}

// ============================================================================
// MAIN REPLAY LOGIC
// ============================================================================

async function main() {
  const args = parseArgs();
  const prisma = new PrismaClient();

  console.log('🔄 Marketplace Cart Projection Replay');
  console.log('━'.repeat(60));
  console.log(`Tenant:     ${args.tenantId}`);
  console.log(`Limit:      ${args.limit}`);
  console.log(`Dry-run:    ${args.dryRun ? 'YES' : 'NO'}`);
  console.log(`Verbose:    ${args.verbose ? 'YES' : 'NO'}`);
  
  if (args.sinceEventId) {
    console.log(`Resume:     Event ID > ${args.sinceEventId}`);
  } else if (args.since) {
    console.log(`Resume:     Timestamp > ${args.since}`);
  }
  
  console.log('━'.repeat(60));

  const startTime = Date.now();

  try {
    // Build WHERE clause
    type WhereInput = Prisma.EventLogWhereInput;
    const where: WhereInput = {
      tenantId: args.tenantId,
      name: {
        in: MARKETPLACE_CART_EVENTS as unknown as string[],
      },
    };

    // Add resume condition if specified
    if (args.sinceEventId) {
      // Resume from event ID: need to find that event's createdAt and ID for comparison
      const sinceEvent = await prisma.eventLog.findUnique({
        where: { id: args.sinceEventId },
        select: { createdAt: true, id: true },
      });

      if (!sinceEvent) {
        console.error(`❌ Error: Event with ID ${args.sinceEventId} not found`);
        process.exit(1);
      }

      // Use OR condition to handle createdAt boundary + id tie-breaker
      where.OR = [
        { createdAt: { gt: sinceEvent.createdAt } },
        {
          createdAt: sinceEvent.createdAt,
          id: { gt: sinceEvent.id },
        },
      ];
    } else if (args.since) {
      where.createdAt = {
        gt: new Date(args.since),
      };
    }

    // Query events with stable ordering
    console.log('📊 Querying EventLog...');
    const events = await prisma.eventLog.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: args.limit,
    });

    console.log(`✅ Found ${events.length} events\n`);

    if (events.length === 0) {
      console.log('✨ No events to process');
      await prisma.$disconnect();
      return;
    }

    // Process events
    let appliedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const row of events) {
      const envelope = mapEventLogToEnvelope(row);

      if (args.verbose) {
        console.log(`  ${envelope.name} [${envelope.id}]`);
      }

      if (!args.dryRun) {
        try {
          const results = await applyProjections(prisma, envelope);

          // Count successes and failures
          for (const result of results) {
            if (result.success) {
              if (result.skipped) {
                skippedCount++;
              } else {
                appliedCount++;
              }
            } else {
              failedCount++;
              console.warn(
                `⚠️  Projection failed: ${result.projectionName} for event ${envelope.id}`
              );
              if (result.error) {
                console.warn(`   Error: ${result.error}`);
              }
            }
          }

          // If no handlers matched, treat as skipped
          if (results.length === 0) {
            skippedCount++;
          }
        } catch (error) {
          failedCount++;
          console.error(`❌ Unexpected error processing event ${envelope.id}:`, error);
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Print summary
    console.log('\n' + '━'.repeat(60));
    console.log('📈 Summary');
    console.log('━'.repeat(60));
    console.log(`Scanned:    ${events.length}`);

    if (args.dryRun) {
      console.log(`Mode:       DRY-RUN (no projections applied)`);
      console.log(`Would process: ${events.length} events`);
    } else {
      console.log(`Applied:    ${appliedCount}`);
      console.log(`Skipped:    ${skippedCount}`);
      console.log(`Failed:     ${failedCount}`);
    }

    console.log(`Duration:   ${duration}s`);
    console.log('━'.repeat(60));

    if (!args.dryRun && failedCount > 0) {
      console.log(`\n⚠️  Warning: ${failedCount} projection(s) failed (see logs above)`);
    }

    console.log('\n✅ Replay complete');

    await prisma.$disconnect();
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
