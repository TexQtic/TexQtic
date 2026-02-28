/**
 * G-024 — SanctionsService Unit Tests
 * Task ID: G-024-SANCTIONS-ENFORCEMENT
 *
 * Verifies runtime sanctions enforcement in SanctionsService itself and
 * integration with TradeService / EscrowService.
 *
 * Constitutional guarantees tested:
 *   G-024-A: Blocking threshold severity >= 2 (is_org_sanctioned=true → throws)
 *   G-024-B: Non-blocking on false result (resolves cleanly)
 *   G-024-C: $queryRaw used for RLS-bypass via SECURITY DEFINER function
 *   Buyer-sanction: createTrade returns error when buyer sanctioned
 *   Seller-sanction: createTrade returns error when seller sanctioned
 *   RELEASE-sanction: recordTransaction RELEASE returns error when org sanctioned
 *
 * Test count: 6
 */

import { describe, it, expect, vi } from 'vitest';
import type { Mock } from 'vitest';
import { SanctionsService, SanctionBlockError } from './sanctions.service.js';
import { TradeService } from './trade.g017.service.js';
import { EscrowService } from './escrow.service.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BUYER_ORG_ID  = '00000000-0000-0000-0000-000000000001';
const SELLER_ORG_ID = '00000000-0000-0000-0000-000000000002';
const TENANT_ID     = '00000000-0000-0000-0000-000000000003';
const ESCROW_ID     = '00000000-0000-0000-0000-000000000004';

// ─── Mock DB factories ────────────────────────────────────────────────────────

function makeDb(queryRawImpl?: () => unknown) {
  const db: Record<string, unknown> = {
    $queryRaw: vi.fn(queryRawImpl ?? (() => [{ is_org_sanctioned: false }])),
    trade:           { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    tradeEvent:      { create: vi.fn() },
    lifecycleState:  { findFirst: vi.fn().mockResolvedValue({ id: 'state-id-0001' }) },
    escrowAccount:   { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    ledgerEntry:     { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() },
    certification:   { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    certificationEvent: { create: vi.fn() },
    pendingApproval: { findFirst: vi.fn(), create: vi.fn() },
    escalationEvent: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  };
  (db as any).$transaction = vi.fn((cb: (tx: unknown) => unknown) => cb(db));
  return db;
}

function makeSmSvc() {
  return { transition: vi.fn() };
}

function makeEscSvc() {
  return {
    checkOrgFreeze:    vi.fn().mockResolvedValue(undefined),
    checkEntityFreeze: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Returns a SanctionsService whose checkOrgSanction always throws SanctionBlockError.
 * Used to isolate enforcement-path tests from DB mock complexity.
 */
function makeBlockingSancSvc(orgId = BUYER_ORG_ID): Pick<SanctionsService, 'checkOrgSanction' | 'checkEntitySanction'> {
  return {
    checkOrgSanction: vi.fn().mockRejectedValue(
      new SanctionBlockError('Organisation is sanctioned (severity 2).', { orgId }),
    ),
    checkEntitySanction: vi.fn().mockRejectedValue(
      new SanctionBlockError('Entity is sanctioned (severity 2).', { entityType: 'TRADE', entityId: orgId }),
    ),
  };
}

function makePassingSancSvc(): Pick<SanctionsService, 'checkOrgSanction' | 'checkEntitySanction'> {
  return {
    checkOrgSanction:    vi.fn().mockResolvedValue(undefined),
    checkEntitySanction: vi.fn().mockResolvedValue(undefined),
  };
}

// ─── G-024-A/B/C: SanctionsService unit tests ────────────────────────────────

describe('G-024 SanctionsService — checkOrgSanction', () => {
  it('T-G024-01 — resolves without error when is_org_sanctioned=false', async () => {
    const db = makeDb(() => [{ is_org_sanctioned: false }]);
    const svc = new SanctionsService(db as any);

    await expect(svc.checkOrgSanction(BUYER_ORG_ID)).resolves.toBeUndefined();
    expect(db.$queryRaw as Mock).toHaveBeenCalledOnce();
  });

  it('T-G024-02 — throws SanctionBlockError (code=SANCTION_BLOCKED) when is_org_sanctioned=true', async () => {
    const db = makeDb(() => [{ is_org_sanctioned: true }]);
    const svc = new SanctionsService(db as any);

    const err = await svc.checkOrgSanction(BUYER_ORG_ID).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(SanctionBlockError);
    expect((err as SanctionBlockError).code).toBe('SANCTION_BLOCKED');
    expect((err as SanctionBlockError).context.orgId).toBe(BUYER_ORG_ID);
    expect((err as SanctionBlockError).name).toBe('SanctionBlockError');
  });

  it('T-G024-03 — checkEntitySanction throws SanctionBlockError when is_entity_sanctioned=true', async () => {
    const db = makeDb();
    (db.$queryRaw as Mock).mockResolvedValue([{ is_entity_sanctioned: true }]);
    const svc = new SanctionsService(db as any);

    const err = await svc.checkEntitySanction('TRADE', 'ref-001').catch((e: unknown) => e);

    expect(err).toBeInstanceOf(SanctionBlockError);
    expect((err as SanctionBlockError).code).toBe('SANCTION_BLOCKED');
    expect((err as SanctionBlockError).context.entityType).toBe('TRADE');
  });
});

// ─── TradeService sanction enforcement ────────────────────────────────────────

describe('G-024 TradeService — sanctions enforcement on createTrade', () => {
  const validInput = {
    tenantId:     TENANT_ID,
    buyerOrgId:   BUYER_ORG_ID,
    sellerOrgId:  SELLER_ORG_ID,
    tradeReference: 'TRD-G024-001',
    currency:     'USD',
    grossAmount:  50000,
    reason:       'G-024 sanction test trade',
  };

  it('T-G024-04 — buyer sanctioned: createTrade returns ERROR with code DB_ERROR', async () => {
    const db     = makeDb();
    const smSvc  = makeSmSvc();
    const escSvc = makeEscSvc();

    // First call (buyer check) → blocked; second (seller) would pass but never reached
    const sancSvc = makeBlockingSancSvc(BUYER_ORG_ID);

    const tradeSvc = new TradeService(db as any, smSvc as any, escSvc as any, undefined, sancSvc as any);

    const result = await tradeSvc.createTrade(validInput);

    expect(result.status).toBe('ERROR');
    expect((result as { status: 'ERROR'; code: string }).code).toBe('DB_ERROR');
    // Buyer check blocked; seller check must NOT have been called
    expect(sancSvc.checkOrgSanction).toHaveBeenCalledOnce();
  });

  it('T-G024-05 — seller sanctioned: createTrade returns ERROR with code DB_ERROR', async () => {
    const db     = makeDb();
    const smSvc  = makeSmSvc();
    const escSvc = makeEscSvc();

    // Buyer passes; seller blocked
    const buyerSancSvc  = makePassingSancSvc();
    const sellerBlockFn = vi.fn()
      .mockResolvedValueOnce(undefined)  // buyer → pass
      .mockRejectedValueOnce(           // seller → blocked
        new SanctionBlockError('Seller is sanctioned (severity 2).', { orgId: SELLER_ORG_ID }),
      );

    const sancSvc = {
      checkOrgSanction:    sellerBlockFn,
      checkEntitySanction: buyerSancSvc.checkEntitySanction,
    };

    const tradeSvc = new TradeService(db as any, smSvc as any, escSvc as any, undefined, sancSvc as any);

    const result = await tradeSvc.createTrade(validInput);

    expect(result.status).toBe('ERROR');
    expect((result as { status: 'ERROR'; code: string }).code).toBe('DB_ERROR');
    // Both buyer and seller checks were attempted
    expect(sellerBlockFn).toHaveBeenCalledTimes(2);
  });
});

// ─── EscrowService RELEASE sanction enforcement ───────────────────────────────

describe('G-024 EscrowService — sanctions enforcement on RELEASE recordTransaction', () => {
  it('T-G024-06 — RELEASE blocked when org sanctioned: recordTransaction returns ERROR', async () => {
    const db     = makeDb();
    const smSvc  = makeSmSvc();
    const escSvc = makeEscSvc();
    const sancSvc = makeBlockingSancSvc(TENANT_ID);

    // EscrowService.recordTransaction() uses $queryRaw to load the escrow account
    // before the sanction check. First call returns a valid account; there is no
    // referenceId so the idempotency $queryRaw call is skipped; then the mock
    // SanctionsService.checkOrgSanction() fires and throws SanctionBlockError.
    (db.$queryRaw as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        id:                 ESCROW_ID,
        tenant_id:          TENANT_ID,
        currency:           'USD',
        lifecycle_state_id: '00000000-0000-0000-0000-000000000099',
      },
    ]);

    const escrowSvc = new EscrowService(db as any, smSvc as any, escSvc as any, undefined, sancSvc as any);

    const result = await escrowSvc.recordTransaction({
      escrowId:  ESCROW_ID,
      tenantId:  TENANT_ID,
      amount:    500,
      direction: 'DEBIT',
      entryType: 'RELEASE',
      currency:  'USD',
    });

    expect(result.status).toBe('ERROR');
    expect((result as { status: 'ERROR'; code: string }).code).toBe('DB_ERROR');
    expect(sancSvc.checkOrgSanction).toHaveBeenCalledOnce();
  });
});
