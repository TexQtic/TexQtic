/**
 * G-024 — SanctionsService
 * Doctrine v1.4 + G-024 Design v1.0
 *
 * Implements sanctions enforcement for the TexQtic platform.
 *
 * Constitutional guarantees:
 *   G-024-A: Blocking threshold is severity >= 2. severity=1 (FRICTION) is non-blocking.
 *   G-024-B: Only status='ACTIVE' sanctions are considered blocking.
 *   G-024-C: Enforcement bypasses tenant RLS via SECURITY DEFINER DB functions
 *            (public.is_org_sanctioned, public.is_entity_sanctioned). This is required
 *            because the enforcement checks must see sanctions on ANY org involved in a
 *            transaction, not just the org in the current RLS context.
 *   G-024-D: SanctionBlockError message includes sanction_type and severity hint but
 *            does NOT expose the raw 'reason' field (sensitive policy detail).
 *   G-024-E: checkOrgSanction / checkEntitySanction accept an optional db client
 *            to allow callers to run the check inside an existing transaction boundary.
 *
 * Enforcement locations (as of G-024):
 *   1. StateMachineService.transition() — step 3.5a/b (before escalation freeze checks)
 *   2. TradeService.createTrade()       — checks buyer + seller org before transaction
 *   3. CertificationService.createCertification() — checks org before lifecycle lookup
 *   4. EscrowService.createEscrowAccount()         — checks org before INSERT
 *   5. EscrowService.recordTransaction() [RELEASE] — checks org before ledger INSERT
 *
 * Replay safety:
 *   MakerCheckerService.verifyAndReplay() calls StateMachineService.transition() internally.
 *   Since step 3.5a runs inside transition(), any sanction imposed AFTER the MAKER step
 *   will still block the CHECKER replay. No special case needed.
 */

import type { PrismaClient } from '@prisma/client';

// ─── SanctionBlockError ───────────────────────────────────────────────────────

/**
 * Thrown by SanctionsService when an active blocking sanction is found.
 * code is 'SANCTION_BLOCKED' (G-024 canonical error code).
 * message includes sanction_type hint but NOT the raw policy reason (sensitive).
 */
export class SanctionBlockError extends Error {
  readonly code = 'SANCTION_BLOCKED' as const;

  constructor(
    message: string,
    public readonly context: {
      orgId?: string;
      entityType?: string;
      entityId?: string;
    } = {},
  ) {
    super(message);
    this.name = 'SanctionBlockError';
  }
}

// ─── Raw Row Types ─────────────────────────────────────────────────────────────

type IsOrgSanctionedRow = { is_org_sanctioned: boolean };
type IsEntitySanctionedRow = { is_entity_sanctioned: boolean };

// ─── SanctionsService ─────────────────────────────────────────────────────────

export class SanctionsService {
  /**
   * @param db - Prisma client. Injected for testability.
   *             In production, pass the tx-bound client (makeTxBoundPrisma(tx))
   *             so the enforcement check runs within the active transaction boundary.
   *             The underlying SECURITY DEFINER functions bypass RLS regardless.
   */
  constructor(private readonly db: PrismaClient) {}

  /**
   * checkOrgSanction — throws SanctionBlockError if the org has any ACTIVE
   * sanction at or above the blocking threshold (severity >= 2).
   *
   * Calls public.is_org_sanctioned(UUID, SMALLINT) via $queryRaw.
   * The SECURITY DEFINER function bypasses tenant RLS — this is required
   * to enforce sanctions on counterparty orgs (e.g., buyer vs. seller).
   *
   * @param orgId       - UUID of the organization to check.
   * @param opts.db     - Optional override db client (e.g., tx-bound).
   *
   * @throws SanctionBlockError if org is sanctioned.
   */
  async checkOrgSanction(
    orgId: string,
    opts?: { db?: PrismaClient },
  ): Promise<void> {
    const client = opts?.db ?? this.db;

    const rows = (await client.$queryRaw`
      SELECT public.is_org_sanctioned(${orgId}::uuid, 2::smallint) AS is_org_sanctioned
    `) as IsOrgSanctionedRow[];

    if (rows.length > 0 && rows[0].is_org_sanctioned === true) {
      throw new SanctionBlockError(
        `[G-024] SANCTION_BLOCKED: organization ${orgId} has an active blocking sanction ` +
          `(severity >= 2). Action denied. Contact compliance to resolve.`,
        { orgId },
      );
    }
  }

  /**
   * checkEntitySanction — throws SanctionBlockError if the entity has any ACTIVE
   * sanction at or above the blocking threshold (severity >= 2).
   *
   * Calls public.is_entity_sanctioned(TEXT, UUID, SMALLINT) via $queryRaw.
   *
   * @param entityType  - Entity type string (e.g., 'TRADE', 'ESCROW', 'CERTIFICATION').
   * @param entityId    - UUID of the specific entity to check.
   * @param opts.db     - Optional override db client.
   *
   * @throws SanctionBlockError if entity is sanctioned.
   */
  async checkEntitySanction(
    entityType: string,
    entityId: string,
    opts?: { db?: PrismaClient },
  ): Promise<void> {
    const client = opts?.db ?? this.db;

    const rows = (await client.$queryRaw`
      SELECT public.is_entity_sanctioned(${entityType}::text, ${entityId}::uuid, 2::smallint) AS is_entity_sanctioned
    `) as IsEntitySanctionedRow[];

    if (rows.length > 0 && rows[0].is_entity_sanctioned === true) {
      throw new SanctionBlockError(
        `[G-024] SANCTION_BLOCKED: entity ${entityType}:${entityId} has an active blocking sanction ` +
          `(severity >= 2). Action denied. Contact compliance to resolve.`,
        { entityType, entityId },
      );
    }
  }
}
