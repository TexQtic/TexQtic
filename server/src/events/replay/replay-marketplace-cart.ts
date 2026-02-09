#!/usr/bin/env node
/**
 * CLI Replay for Marketplace Cart Projections
 *
 * Prompt #33: Idempotent backfill utility for MarketplaceCartSummary projections.
 * Prompt #34: Operator-safe hardening with JSON output, confirmation gates, and exit codes.
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
 *   --json                     (Optional) Output machine-readable JSON summary
 *   --confirm                  (Optional) Confirm destructive runs (required for limit > 5000)
 *   --max-runtime-seconds <n>  (Optional) Kill switch for long operations (1-86400)
 *
 * CONSTRAINTS:
 * - Cannot use both --since-event-id and --since together
 * - Limit must be between 1 and 50000
 * - Tenant ID must be a valid UUID
 * - Non-dry-run with limit > 5000 requires --confirm
 *
 * SAFETY:
 * - Best-effort: projection failures are logged but don't stop processing
 * - Idempotent: safe to rerun (existing projections are updated/skipped)
 * - Tenant-isolated: only processes events for specified tenant
 * - Stable ordering: createdAt ASC, id ASC (deterministic replay)
 * - Timeout protection via --max-runtime-seconds
 *
 * EXIT CODES:
 * - 0: Success (no failures)
 * - 2: Validation/usage error
 * - 3: Partial failure (some projections failed or timed out)
 * - 1: Fatal error (DB query fails, unexpected crash)
 *
 * OUTPUT:
 * - Progress logs during processing (stderr if --json)
 * - Final summary: scanned, applied, failed, duration
 * - JSON summary line to stdout (if --json)
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
  json: boolean;
  confirm: boolean;
  maxRuntimeSeconds?: number;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);

  const parsed: Partial<CliArgs> = {
    limit: 5000,
    dryRun: false,
    verbose: false,
    json: false,
    confirm: false,
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

      case '--since-event-id':
        if (!next || next.startsWith('--')) {
          console.error('❌ Error: --since-event-id requires a value');
          printUsage();
          process.exit(2);
        }
        parsed.sinceEventId = next;
        i++;
        break;

      case '--since':
        if (!next || next.startsWith('--')) {
          console.error('❌ Error: --since requires a value');
          printUsage();
          process.exit(2);
        }
        parsed.since = next;
        i++;
        break;

      case '--limit':
        if (!next || next.startsWith('--')) {
          console.error('❌ Error: --limit requires a value');
          printUsage();
          process.exit(2);
        }
        const limit = parseInt(next, 10);
        if (isNaN(limit) || limit < 1 || limit > 50000) {
          console.error('❌ Error: --limit must be between 1 and 50000');
          process.exit(2);
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

      case '--json':
        parsed.json = true;
        break;

      case '--confirm':
        parsed.confirm = true;
        break;

      case '--max-runtime-seconds':
        if (!next || next.startsWith('--')) {
          console.error('❌ Error: --max-runtime-seconds requires a value');
          printUsage();
          process.exit(2);
        }
        const maxRuntime = parseInt(next, 10);
        if (isNaN(maxRuntime) || maxRuntime < 1 || maxRuntime > 86400) {
          console.error('❌ Error: --max-runtime-seconds must be between 1 and 86400');
          process.exit(2);
        }
        parsed.maxRuntimeSeconds = maxRuntime;
        i++;
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

  // Validate mutual exclusion
  if (parsed.sinceEventId && parsed.since) {
    console.error('❌ Error: Cannot use both --since-event-id and --since together');
    printUsage();
    process.exit(2);
  }

  // Validate UUID format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(parsed.tenantId)) {
    console.error('❌ Error: --tenant-id must be a valid UUID');
    process.exit(2);
  }

  if (parsed.sinceEventId && !uuidRegex.test(parsed.sinceEventId)) {
    console.error('❌ Error: --since-event-id must be a valid UUID');
    process.exit(2);
  }

  // Validate ISO datetime (basic check)
  if (parsed.since) {
    const date = new Date(parsed.since);
    if (isNaN(date.getTime())) {
      console.error('❌ Error: --since must be a valid ISO datetime');
      process.exit(2);
    }
  }

  return parsed as CliArgs;
}

function printUsage() {
  console.log(`
Usage:
  npm run replay:marketplace-cart -- --tenant-id <uuid> [options]

Options:
  --tenant-id <uuid>           (Required) Tenant to replay events for
  --since-event-id <uuid>      (Optional) Resume from event ID (exclusive)
  --since <iso-datetime>       (Optional) Resume from timestamp (exclusive)
  --limit <number>             (Optional) Max events to process (default: 5000, max: 50000)
  --dry-run                    (Optional) Count events without applying projections
  --verbose                    (Optional) Log every event name/id
  --json                       (Optional) Output machine-readable JSON summary
  --confirm                    (Optional) Confirm destructive runs (required for limit > 5000)
  --max-runtime-seconds <n>    (Optional) Max runtime in seconds (1-86400)

Examples:
  # Dry-run for a tenant
  npm run replay:marketplace-cart -- --tenant-id abc-123 --dry-run

  # Replay up to 1000 events
  npm run replay:marketplace-cart -- --tenant-id abc-123 --limit 1000

  # Large replay with confirmation
  npm run replay:marketplace-cart -- --tenant-id abc-123 --limit 10000 --confirm

  # JSON output for automation
  npm run replay:marketplace-cart -- --tenant-id abc-123 --json

  # With timeout protection
  npm run replay:marketplace-cart -- --tenant-id abc-123 --max-runtime-seconds 300

  # Resume from a specific event
  npm run replay:marketplace-cart -- --tenant-id abc-123 --since-event-id xyz-789
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
  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  // Confirmation gate for destructive runs
  if (!args.dryRun && args.limit > 5000 && !args.confirm) {
    const log = args.json ? console.error : console.log;
    log('❌ Error: Non-dry-run with limit > 5000 requires --confirm flag');
    log('');
    log('This is a destructive operation that will apply projections to more than 5000 events.');
    log('To proceed, add the --confirm flag:');
    log('');
    log(
      `  npm run replay:marketplace-cart -- --tenant-id ${args.tenantId} --limit ${args.limit} --confirm`
    );
    log('');
    process.exit(2);
  }

  const prisma = new PrismaClient();
  const log = args.json ? console.error : console.log;

  log('🔄 Marketplace Cart Projection Replay');
  log('━'.repeat(60));
  log(`Tenant:     ${args.tenantId}`);
  log(`Limit:      ${args.limit}`);
  log(`Dry-run:    ${args.dryRun ? 'YES' : 'NO'}`);
  log(`Verbose:    ${args.verbose ? 'YES' : 'NO'}`);
  log(`JSON:       ${args.json ? 'YES' : 'NO'}`);

  if (args.maxRuntimeSeconds) {
    log(`Timeout:    ${args.maxRuntimeSeconds}s`);
  }

  if (args.sinceEventId) {
    log(`Resume:     Event ID > ${args.sinceEventId}`);
  } else if (args.since) {
    log(`Resume:     Timestamp > ${args.since}`);
  }

  log('━'.repeat(60));

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
        const logErr = args.json ? console.error : console.log;
        logErr(`❌ Error: Event with ID ${args.sinceEventId} not found`);
        await prisma.$disconnect();
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
    log('📊 Querying EventLog...');
    const events = await prisma.eventLog.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: args.limit,
    });

    log(`✅ Found ${events.length} events\n`);

    if (events.length === 0) {
      log('✨ No events to process');
      await prisma.$disconnect();

      if (args.json) {
        const finishedAt = new Date().toISOString();
        const summary = {
          tenant_id: args.tenantId,
          dry_run: args.dryRun,
          since_event_id: args.sinceEventId || null,
          since: args.since || null,
          limit: args.limit,
          scanned: 0,
          applied: 0,
          skipped: 0,
          failed: 0,
          duration_ms: Date.now() - startTime,
          exit_code: 0,
          started_at: startedAt,
          finished_at: finishedAt,
        };
        console.log(JSON.stringify(summary));
      }

      return;
    }

    // Process events
    let appliedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    let timedOut = false;

    for (const row of events) {
      // Check timeout
      if (args.maxRuntimeSeconds) {
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed >= args.maxRuntimeSeconds) {
          timedOut = true;
          log(`\n⏱️  Timeout: Reached ${args.maxRuntimeSeconds}s limit, stopping...`);
          break;
        }
      }

      const envelope = mapEventLogToEnvelope(row);

      if (args.verbose) {
        log(`  ${envelope.name} [${envelope.id}]`);
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
              log(`⚠️  Projection failed: ${result.projectionName} for event ${envelope.id}`);
              if (result.error) {
                log(`   Error: ${result.error}`);
              }
            }
          }

          // If no handlers matched, treat as skipped
          if (results.length === 0) {
            skippedCount++;
          }
        } catch (error) {
          failedCount++;
          log(`❌ Unexpected error processing event ${envelope.id}:`);
          if (args.json) {
            console.error(error);
          } else {
            log(error);
          }
        }
      }
    }

    const finishedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;
    const duration = (durationMs / 1000).toFixed(2);

    // Determine exit code
    let exitCode = 0;
    if (failedCount > 0 || timedOut) {
      exitCode = 3; // Partial failure
    }

    // Print summary
    log('\n' + '━'.repeat(60));
    log('📈 Summary');
    log('━'.repeat(60));
    log(`Scanned:    ${events.length}`);

    if (args.dryRun) {
      log(`Mode:       DRY-RUN (no projections applied)`);
      log(`Would process: ${events.length} events`);
    } else {
      log(`Applied:    ${appliedCount}`);
      log(`Skipped:    ${skippedCount}`);
      log(`Failed:     ${failedCount}`);
    }

    log(`Duration:   ${duration}s`);
    if (timedOut) {
      log(`Status:     TIMED OUT (partial results)`);
    }
    log('━'.repeat(60));

    if (!args.dryRun && failedCount > 0) {
      log(`\n⚠️  Warning: ${failedCount} projection(s) failed (see logs above)`);
    }

    if (timedOut) {
      log(`\n⏱️  Timeout: Processing stopped after ${duration}s`);
    }

    log('\n✅ Replay complete');

    // Output JSON summary if requested
    if (args.json) {
      const summary = {
        tenant_id: args.tenantId,
        dry_run: args.dryRun,
        since_event_id: args.sinceEventId || null,
        since: args.since || null,
        limit: args.limit,
        scanned: events.length,
        applied: appliedCount,
        skipped: skippedCount,
        failed: failedCount,
        duration_ms: durationMs,
        exit_code: exitCode,
        started_at: startedAt,
        finished_at: finishedAt,
        timed_out: timedOut,
      };
      console.log(JSON.stringify(summary));
    }

    await prisma.$disconnect();
    process.exit(exitCode);
  } catch (error) {
    const logErr = args.json ? console.error : console.log;
    logErr('\n❌ Fatal error:');
    logErr(error);
    await prisma.$disconnect();

    if (args.json) {
      const finishedAt = new Date().toISOString();
      const summary = {
        tenant_id: args.tenantId,
        dry_run: args.dryRun,
        since_event_id: args.sinceEventId || null,
        since: args.since || null,
        limit: args.limit,
        scanned: 0,
        applied: 0,
        skipped: 0,
        failed: 0,
        duration_ms: Date.now() - startTime,
        exit_code: 1,
        started_at: startedAt,
        finished_at: finishedAt,
        error: error instanceof Error ? error.message : String(error),
      };
      console.log(JSON.stringify(summary));
    }

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
