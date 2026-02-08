/**
 * Event Pipeline Verification (Prompt #18)
 *
 * Remote-first verification checklist:
 * - Confirms event_logs exists + row count
 * - Shows latest audit_logs row
 * - Shows latest event_logs row
 * - Checks whether latest audit action is mapped
 * - Prints clear PASS/FAIL output
 *
 * Usage: npx tsx scripts/verify-event-pipeline.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapped audit actions (from Prompt #17 compatibility mappings)
const MAPPED_ACTIONS = new Set([
  'CREATE_TENANT',
  'INVITE_MEMBER',
  'TENANT_CREATED_ORIGIN',
  'TENANT_OWNER_CREATED',
  'TENANT_OWNER_MEMBERSHIP_CREATED',
  'TEAM_INVITE_CREATED',
]);

interface DbIdentity {
  server_ip: string;
  server_port: number;
  db: string;
  user: string;
  now: Date;
}

interface TableCheck {
  audit_logs?: string | null;
  event_logs?: string | null;
}

interface CountResult {
  audit_count?: number;
  event_count?: number;
}

interface LatestAudit {
  id: string;
  created_at: Date;
  action: string;
  realm: string;
  entity: string;
  tenant_id: string | null;
  entity_id: string | null;
}

interface LatestEvent {
  id: string;
  name: string;
  occurred_at: Date;
  audit_log_id: string;
  tenant_id: string | null;
  entity_type: string;
  entity_id: string;
  metadata_json: any;
}

interface EventCheck {
  id: string;
  name: string;
  audit_log_id: string;
}

async function main() {
  try {
    // Step 0: Print DB identity first (non-negotiable)
    console.log('=== DB Identity Check ===');
    const identityResult = await prisma.$queryRaw<DbIdentity[]>`
      select
        inet_server_addr() as server_ip,
        inet_server_port() as server_port,
        current_database() as db,
        current_user as user,
        now() as now
    `;

    if (!identityResult || identityResult.length === 0) {
      throw new Error('Failed to get DB identity');
    }

    const identity = identityResult[0];
    console.log(
      'VERIFY_DB',
      JSON.stringify({
        server_ip: identity.server_ip,
        server_port: identity.server_port,
        db: identity.db,
        user: identity.user,
        now: identity.now,
      })
    );

    // Step 1: Check tables exist
    console.log('\n=== Table Existence Check ===');
    const auditTableCheck = await prisma.$queryRaw<TableCheck[]>`
      select to_regclass('public.audit_logs')::text as audit_logs
    `;
    const eventTableCheck = await prisma.$queryRaw<TableCheck[]>`
      select to_regclass('public.event_logs')::text as event_logs
    `;

    if (!auditTableCheck[0]?.audit_logs) {
      console.error('VERIFY_FAIL audit_logs table does not exist');
      await prisma.$disconnect();
      process.exit(1);
    }

    if (!eventTableCheck[0]?.event_logs) {
      console.error('VERIFY_FAIL event_logs table does not exist');
      await prisma.$disconnect();
      process.exit(1);
    }

    console.log('✓ audit_logs exists');
    console.log('✓ event_logs exists');

    // Step 2: Counts
    console.log('\n=== Table Counts ===');
    const auditCountResult = await prisma.$queryRaw<CountResult[]>`
      select count(*)::int as audit_count from audit_logs
    `;
    const eventCountResult = await prisma.$queryRaw<CountResult[]>`
      select count(*)::int as event_count from event_logs
    `;

    const auditCount = auditCountResult[0]?.audit_count ?? 0;
    const eventCount = eventCountResult[0]?.event_count ?? 0;

    console.log(
      'VERIFY_COUNTS',
      JSON.stringify({
        audit_count: auditCount,
        event_count: eventCount,
      })
    );

    // Step 3: Latest audit log
    console.log('\n=== Latest Audit Log ===');
    const latestAuditResult = await prisma.$queryRaw<LatestAudit[]>`
      select id, created_at, action, realm, entity, tenant_id, entity_id
      from audit_logs
      order by created_at desc
      limit 1
    `;

    if (!latestAuditResult || latestAuditResult.length === 0) {
      console.log('VERIFY_LATEST_AUDIT null (no audit logs exist)');
      console.log('\nVERIFY_NOTE No audit logs exist; pipeline cannot be tested');
      await prisma.$disconnect();
      process.exit(0);
    }

    const latestAudit = latestAuditResult[0];
    console.log(
      'VERIFY_LATEST_AUDIT',
      JSON.stringify({
        id: latestAudit.id,
        created_at: latestAudit.created_at,
        action: latestAudit.action,
        realm: latestAudit.realm,
        entity: latestAudit.entity,
        tenant_id: latestAudit.tenant_id,
        entity_id: latestAudit.entity_id,
      })
    );

    // Step 4: Latest event log
    console.log('\n=== Latest Event Log ===');
    const latestEventResult = await prisma.$queryRaw<LatestEvent[]>`
      select id, name, occurred_at, audit_log_id, tenant_id, entity_type, entity_id, metadata_json
      from event_logs
      order by occurred_at desc
      limit 1
    `;

    if (!latestEventResult || latestEventResult.length === 0) {
      console.log('VERIFY_LATEST_EVENT null');
    } else {
      const latestEvent = latestEventResult[0];
      console.log(
        'VERIFY_LATEST_EVENT',
        JSON.stringify({
          id: latestEvent.id,
          name: latestEvent.name,
          occurred_at: latestEvent.occurred_at,
          audit_log_id: latestEvent.audit_log_id,
          tenant_id: latestEvent.tenant_id,
          entity_type: latestEvent.entity_type,
          entity_id: latestEvent.entity_id,
          metadata_json: latestEvent.metadata_json,
        })
      );
    }

    // Step 5: Mapping expectation
    console.log('\n=== Mapping Check ===');
    const latestAction = latestAudit.action;
    const isMapped = MAPPED_ACTIONS.has(latestAction);

    if (!isMapped) {
      console.log(
        `VERIFY_NOTE Latest audit action "${latestAction}" is not mapped; no event emission expected`
      );
      await prisma.$disconnect();
      process.exit(0);
    }

    // Latest action is mapped, so we expect an event row
    console.log(`✓ Latest action "${latestAction}" is mapped, checking for event...`);

    const eventCheckResult = await prisma.$queryRaw<EventCheck[]>`
      select e.id, e.name, e.audit_log_id
      from event_logs e
      where e.audit_log_id = ${latestAudit.id}
    `;

    if (!eventCheckResult || eventCheckResult.length === 0) {
      console.error(
        `VERIFY_FAIL Mapped audit action detected but no EventLog row found for audit_log_id "${latestAudit.id}"`
      );
      await prisma.$disconnect();
      process.exit(1);
    }

    const eventRow = eventCheckResult[0];
    console.log(`✓ Event found: ${eventRow.name} (id: ${eventRow.id})`);
    console.log('VERIFY_PASS Event stored for mapped audit action');

    await prisma.$disconnect();
    process.exit(0);
  } catch (err: any) {
    console.error('\n💥 VERIFY_ERROR', err.message || String(err));
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
