/**
 * zohoBooks.lifecycle.ts
 *
 * Feature-flagged lifecycle orchestrator for Zoho Books contact sync.
 *
 * Wired into the organization verification approval seam in GstVerificationService.
 * Invoked via `await maybeSyncZohoBooksContactAfterActivation(orgId).catch(() => undefined)`
 * — identical to the existing CRM notification side-effect pattern.
 *
 * Safety guarantees:
 *   - Default behavior is NO-OP (flag OFF).
 *   - Flag: ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED — must be 'true' to run.
 *   - Duplicate guard: skips if organization_integrations.external_id is already set.
 *   - Never throws into the activation approval flow (all errors are caught internally).
 *   - Access token, DB URLs, and OAuth responses are never returned or logged.
 *   - Raw Zoho response is never returned.
 *
 * DB access:
 *   Uses the global prisma client (postgres role, BYPASSRLS=true per Supabase pooler
 *   constraint) — same pattern as dry-run and smoke scripts.
 *   dbOverride parameter allows injecting a mock prisma for unit tests.
 */

import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { prisma as globalPrisma } from '../../db/prisma.js';
import { readZohoBooksRuntimeConfig } from './zohoBooks.config.js';
import { createZohoBooksContact } from './zohoBooks.sync.js';

// ── Result type ───────────────────────────────────────────────────────────────

export type ZohoBooksLifecycleSyncResult =
  | { status: 'SKIPPED_DISABLED' }
  | { status: 'SKIPPED_CONFIG_NOT_READY'; reason: string }
  | { status: 'SKIPPED_ORG_NOT_FOUND' }
  | { status: 'SKIPPED_ALREADY_SYNCED'; externalId: string }
  | { status: 'SYNC_SUCCESS'; contactId: string; shapeFallbackUsed: boolean }
  | { status: 'SYNC_FAILED_RECORDED'; errorSummary: string }
  | { status: 'SYNC_FAILED_NOT_RECORDED'; errorSummary: string };

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrgRow {
  id: string;
  legal_name: string;
  jurisdiction: string;
  status: string;
  plan: string;
}

interface IntegRow {
  external_id: string | null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Attempt to sync a Zoho Books contact after org verification approval.
 *
 * Must be called with `.catch(() => undefined)` at the call site so that
 * any unhandled internal error does NOT fail the lifecycle transition.
 *
 * Behavior when feature flag is OFF (default):
 *   Returns SKIPPED_DISABLED immediately. No DB access. No Zoho call.
 *
 * Behavior when feature flag is ON:
 *   1. Checks Zoho config readiness.
 *   2. Reads org data from DB (legal_name, jurisdiction, status, plan).
 *   3. Checks organization_integrations.external_id — skips if already set.
 *   4. Calls createZohoBooksContact() with the org snapshot.
 *   5. On success: updates organization_integrations with contactId + SYNC_SUCCESS.
 *   6. On failure: records SYNC_FAILED + sanitized error summary.
 *   7. Returns typed result. Never throws.
 *
 * @param orgId - The organization UUID that was just approved
 * @param dbOverride - Optional prisma client override for unit tests
 */
export async function maybeSyncZohoBooksContactAfterActivation(
  orgId: string,
  dbOverride?: PrismaClient,
): Promise<ZohoBooksLifecycleSyncResult> {
  // ── 1. Feature flag gate ─────────────────────────────────────────────────
  if (process.env['ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED'] !== 'true') {
    return { status: 'SKIPPED_DISABLED' };
  }

  // ── 2. Config readiness ──────────────────────────────────────────────────
  const configResult = readZohoBooksRuntimeConfig(process.env);
  if (configResult.status !== 'READY') {
    return { status: 'SKIPPED_CONFIG_NOT_READY', reason: configResult.status };
  }
  const config = configResult.config;

  const db = dbOverride ?? globalPrisma;

  try {
    // ── 3. Read org data ───────────────────────────────────────────────────
    // Uses global prisma (postgres role, BYPASSRLS=true) — no RLS context needed.
    const orgRows = await db.$queryRaw<OrgRow[]>(
      Prisma.sql`
        SELECT id, legal_name, jurisdiction, status, plan
        FROM organizations
        WHERE id = ${orgId}::uuid
        LIMIT 1
      `,
    );

    if (orgRows.length === 0) {
      return { status: 'SKIPPED_ORG_NOT_FOUND' };
    }

    const org = orgRows[0]!;

    // ── 4. Duplicate guard — check existing external_id ───────────────────
    const integRows = await db.$queryRaw<IntegRow[]>(
      Prisma.sql`
        SELECT external_id
        FROM organization_integrations
        WHERE organization_id = ${orgId}::uuid
          AND provider_key = 'zoho_books'
          AND external_object_type = 'contact'
        LIMIT 1
      `,
    );

    if (integRows.length > 0 && integRows[0]!.external_id !== null) {
      return { status: 'SKIPPED_ALREADY_SYNCED', externalId: integRows[0]!.external_id };
    }

    // ── 5. Build activation snapshot ──────────────────────────────────────
    // tradeName is not stored in organizations; set to null.
    // activatedAt = now (the moment of sync trigger).
    const snapshot = {
      organization: {
        id: org.id,
        legalName: org.legal_name,
        tradeName: null as string | null,
        jurisdiction: org.jurisdiction,
        status: org.status,
      },
      tenant: {
        id: org.id,         // tenant_id === org_id in current schema
        name: org.legal_name,
        plan: org.plan,
      },
      activatedAt: new Date().toISOString(),
      source: 'TexQtic Main App',
    };

    // ── 6. Live Zoho upsert ───────────────────────────────────────────────
    const syncResult = await createZohoBooksContact(config, snapshot);

    if (syncResult.status === 'SYNC_FAILED') {
      // Sanitize before storing or returning (no OAuth/token fragments in DB or result)
      const safeError = syncResult.errorSummary
        .replace(/Zoho-oauthtoken\s+\S+/gi, '[REDACTED_TOKEN]')
        .slice(0, 500);

      // 7a. Record failure — best-effort, never throws
      await db.$executeRaw(
        Prisma.sql`
          INSERT INTO organization_integrations (
            id, organization_id, provider_key, external_object_type,
            sync_status, last_attempted_at, last_error_summary, attempt_count,
            created_at, updated_at
          )
          VALUES (
            gen_random_uuid(), ${orgId}::uuid, 'zoho_books', 'contact',
            'SYNC_FAILED', NOW(), ${safeError}, 1, NOW(), NOW()
          )
          ON CONFLICT (organization_id, provider_key, external_object_type)
          DO UPDATE SET
            sync_status        = 'SYNC_FAILED',
            last_attempted_at  = NOW(),
            last_error_summary = ${safeError},
            attempt_count      = organization_integrations.attempt_count + 1,
            updated_at         = NOW()
        `,
      ).catch(() => undefined); // DB write failure must not surface

      return { status: 'SYNC_FAILED_RECORDED', errorSummary: safeError };
    }

    // ── 7b. Record success ────────────────────────────────────────────────
    const contactId = syncResult.contactId;
    const shapeFallbackUsed = syncResult.shapeFallbackUsed;

    await db.$executeRaw(
      Prisma.sql`
        INSERT INTO organization_integrations (
          id, organization_id, provider_key, external_object_type,
          external_id, sync_status, last_attempted_at, last_error_summary,
          attempt_count, created_at, updated_at
        )
        VALUES (
          gen_random_uuid(), ${orgId}::uuid, 'zoho_books', 'contact',
          ${contactId}, 'SYNC_SUCCESS', NOW(), NULL, 1, NOW(), NOW()
        )
        ON CONFLICT (organization_id, provider_key, external_object_type)
        DO UPDATE SET
          external_id        = ${contactId},
          sync_status        = 'SYNC_SUCCESS',
          last_attempted_at  = NOW(),
          last_error_summary = NULL,
          attempt_count      = organization_integrations.attempt_count + 1,
          updated_at         = NOW()
      `,
    ).catch(() => undefined); // DB write failure must not surface

    return { status: 'SYNC_SUCCESS', contactId, shapeFallbackUsed };

  } catch (err: unknown) {
    // Top-level catch — sanitize and return without throw
    const raw = err instanceof Error ? err.message : String(err);
    const safeMsg = raw
      .replace(/postgres:\/\/[^\s]*/gi, '[REDACTED_DB_URL]')
      .replace(/password=[^\s&]*/gi, '[REDACTED]')
      .replace(/Zoho-oauthtoken\s+\S+/gi, '[REDACTED_TOKEN]')
      .slice(0, 200);
    return { status: 'SYNC_FAILED_NOT_RECORDED', errorSummary: safeMsg };
  }
}
