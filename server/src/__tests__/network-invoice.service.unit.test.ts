/**
 * Unit tests — NetworkInvoiceService (TEXQTIC-NC-PHASE1-INVOICE-FOUNDATION-001)
 *
 * Pure unit tests with mocked Prisma. No DB access. No trade dependency.
 * Proves:
 *   P-NI-01  POOL_ORDER invoice created without trade_id
 *   P-NI-02  SYNDICATE_EXECUTION invoice created without trade_id
 *   P-NI-03  VCO_DELIVERY invoice created without trade_id
 *   P-NI-04  payer_org_id and recipient_org_id are optional (nullable)
 *   F-NI-01  invalid invoice_type rejected
 *   F-NI-02  non-positive gross_amount (zero) rejected
 *   F-NI-03  negative gross_amount rejected
 *   F-NI-04  missing issuer_org_id rejected
 *   F-NI-05  missing currency rejected
 *   F-NI-06  missing network_entity_id rejected
 *   F-NI-07  duplicate invoice number rejected
 *   P-NI-05  getNetworkInvoiceById returns record within org scope
 *   P-NI-06  getNetworkInvoiceById returns null when not found
 *   P-NI-07  network_entity_type auto-derived from invoice_type (POOL_ORDER → POOL)
 *   P-NI-08  network_entity_type auto-derived (SYNDICATE_EXECUTION → SYNDICATE)
 *   P-NI-09  network_entity_type auto-derived (VCO_DELIVERY → VCO_CHAIN)
 *
 * Run (from TexQtic root):
 *   pnpm exec vitest run src/__tests__/network-invoice.service.unit.test.ts
 *   (from server/ directory: pnpm exec vitest run src/__tests__/network-invoice.service.unit.test.ts)
 */

import { describe, it, expect, vi } from 'vitest';
import {
  NetworkInvoiceService,
  NetworkInvoiceInvalidTypeError,
  NetworkInvoiceInvalidAmountError,
  NetworkInvoiceMissingIssuerError,
  NetworkInvoiceMissingCurrencyError,
  NetworkInvoiceMissingEntityError,
  NetworkInvoiceDuplicateError,
  NC_INVOICE_TYPE,
  NC_ENTITY_TYPE_FOR_INVOICE,
} from '../services/networkInvoice.service.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const ORG_ID        = 'aaaa0000-0000-0000-0000-000000000001';
const ISSUER_ORG    = 'bbbb0000-0000-0000-0000-000000000002';
// PAYER_ORG available for future tests: 'cccc0000-0000-0000-0000-000000000003'
const ENTITY_ID     = 'dddd0000-0000-0000-0000-000000000004';
const USER_ID       = 'eeee0000-0000-0000-0000-000000000005';
const INVOICE_ID    = 'ffff0000-0000-0000-0000-000000000006';
const NOW           = new Date('2026-01-01T00:00:00.000Z');

// ─── Mock DB factory ──────────────────────────────────────────────────────────

function makeDb(overrides: Record<string, unknown> = {}): any {
  return {
    network_invoices: {
      create:    vi.fn(),
      findFirst: vi.fn(),
      findMany:  vi.fn(),
    },
    ...overrides,
  };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id:                   INVOICE_ID,
    org_id:               ORG_ID,
    invoice_type:         NC_INVOICE_TYPE.POOL_ORDER,
    network_entity_type:  'POOL',
    network_entity_id:    ENTITY_ID,
    invoice_number:       'NC-INV-001',
    invoice_date:         NOW,
    due_date:             null,
    currency:             'INR',
    gross_amount:         '250000.000000',
    issuer_org_id:        ISSUER_ORG,
    payer_org_id:         null,
    recipient_org_id:     null,
    status:               'DRAFT',
    document_url:         null,
    notes:                null,
    metadata:             null,
    created_by_user_id:   USER_ID,
    created_at:           NOW,
    updated_at:           NOW,
    ...overrides,
  };
}

function makeBaseInput(overrides: Record<string, unknown> = {}) {
  return {
    invoice_type:       NC_INVOICE_TYPE.POOL_ORDER as string,
    network_entity_id:  ENTITY_ID,
    invoice_number:     'NC-INV-001',
    invoice_date:       '2026-01-01T00:00:00.000Z',
    currency:           'INR',
    gross_amount:       250000,
    issuer_org_id:      ISSUER_ORG,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('NetworkInvoiceService', () => {

  // ── P-NI-01: POOL_ORDER without trade_id ───────────────────────────────────
  it('P-NI-01: POOL_ORDER invoice created without trade_id', async () => {
    const row = makeRow({
      invoice_type:        NC_INVOICE_TYPE.POOL_ORDER,
      network_entity_type: 'POOL',
    });
    const db = makeDb({
      network_invoices: {
        create:    vi.fn().mockResolvedValue(row),
        findFirst: vi.fn().mockResolvedValue(null), // no duplicate
      },
    });
    const svc = new NetworkInvoiceService(db);
    const result = await svc.createNetworkInvoice(ORG_ID, USER_ID, makeBaseInput({
      invoice_type: NC_INVOICE_TYPE.POOL_ORDER,
    }));
    expect(result.invoice_type).toBe('POOL_ORDER');
    expect(result.network_entity_type).toBe('POOL');
    expect(result.status).toBe('DRAFT');
    // Confirm trade.findUnique was never called (no trade dependency)
    expect(db.network_invoices.create).toHaveBeenCalledOnce();
    const created = db.network_invoices.create.mock.calls[0][0].data;
    expect(created).not.toHaveProperty('trade_id');
  });

  // ── P-NI-02: SYNDICATE_EXECUTION without trade_id ──────────────────────────
  it('P-NI-02: SYNDICATE_EXECUTION invoice created without trade_id', async () => {
    const row = makeRow({
      invoice_type:        NC_INVOICE_TYPE.SYNDICATE_EXECUTION,
      network_entity_type: 'SYNDICATE',
    });
    const db = makeDb({
      network_invoices: {
        create:    vi.fn().mockResolvedValue(row),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });
    const svc = new NetworkInvoiceService(db);
    const result = await svc.createNetworkInvoice(ORG_ID, USER_ID, makeBaseInput({
      invoice_type: NC_INVOICE_TYPE.SYNDICATE_EXECUTION,
    }));
    expect(result.invoice_type).toBe('SYNDICATE_EXECUTION');
    expect(result.network_entity_type).toBe('SYNDICATE');
    const created = db.network_invoices.create.mock.calls[0][0].data;
    expect(created).not.toHaveProperty('trade_id');
  });

  // ── P-NI-03: VCO_DELIVERY without trade_id ─────────────────────────────────
  it('P-NI-03: VCO_DELIVERY invoice created without trade_id', async () => {
    const row = makeRow({
      invoice_type:        NC_INVOICE_TYPE.VCO_DELIVERY,
      network_entity_type: 'VCO_CHAIN',
    });
    const db = makeDb({
      network_invoices: {
        create:    vi.fn().mockResolvedValue(row),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });
    const svc = new NetworkInvoiceService(db);
    const result = await svc.createNetworkInvoice(ORG_ID, USER_ID, makeBaseInput({
      invoice_type: NC_INVOICE_TYPE.VCO_DELIVERY,
    }));
    expect(result.invoice_type).toBe('VCO_DELIVERY');
    expect(result.network_entity_type).toBe('VCO_CHAIN');
    const created = db.network_invoices.create.mock.calls[0][0].data;
    expect(created).not.toHaveProperty('trade_id');
  });

  // ── P-NI-04: payer_org_id and recipient_org_id optional ────────────────────
  it('P-NI-04: payer_org_id and recipient_org_id are optional', async () => {
    const row = makeRow({ payer_org_id: null, recipient_org_id: null });
    const db = makeDb({
      network_invoices: {
        create:    vi.fn().mockResolvedValue(row),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });
    const svc = new NetworkInvoiceService(db);
    // No payer_org_id or recipient_org_id supplied — must not throw
    const result = await svc.createNetworkInvoice(ORG_ID, USER_ID, makeBaseInput());
    expect(result.payer_org_id).toBeNull();
    expect(result.recipient_org_id).toBeNull();
  });

  // ── P-NI-07: entity type auto-derived from POOL_ORDER ──────────────────────
  it('P-NI-07: POOL_ORDER → network_entity_type = POOL', () => {
    expect(NC_ENTITY_TYPE_FOR_INVOICE[NC_INVOICE_TYPE.POOL_ORDER]).toBe('POOL');
  });

  // ── P-NI-08: entity type auto-derived from SYNDICATE_EXECUTION ─────────────
  it('P-NI-08: SYNDICATE_EXECUTION → network_entity_type = SYNDICATE', () => {
    expect(NC_ENTITY_TYPE_FOR_INVOICE[NC_INVOICE_TYPE.SYNDICATE_EXECUTION]).toBe('SYNDICATE');
  });

  // ── P-NI-09: entity type auto-derived from VCO_DELIVERY ────────────────────
  it('P-NI-09: VCO_DELIVERY → network_entity_type = VCO_CHAIN', () => {
    expect(NC_ENTITY_TYPE_FOR_INVOICE[NC_INVOICE_TYPE.VCO_DELIVERY]).toBe('VCO_CHAIN');
  });

  // ── F-NI-01: invalid invoice_type rejected ─────────────────────────────────
  it('F-NI-01: invalid invoice_type rejected', async () => {
    const db = makeDb({ network_invoices: { create: vi.fn(), findFirst: vi.fn() } });
    const svc = new NetworkInvoiceService(db);
    await expect(
      svc.createNetworkInvoice(ORG_ID, USER_ID, makeBaseInput({ invoice_type: 'TRADE_INVOICE' })),
    ).rejects.toThrow(NetworkInvoiceInvalidTypeError);
    expect(db.network_invoices.findFirst).not.toHaveBeenCalled();
    expect(db.network_invoices.create).not.toHaveBeenCalled();
  });

  // ── F-NI-02: zero gross_amount rejected ────────────────────────────────────
  it('F-NI-02: zero gross_amount rejected', async () => {
    const db = makeDb({ network_invoices: { create: vi.fn(), findFirst: vi.fn() } });
    const svc = new NetworkInvoiceService(db);
    await expect(
      svc.createNetworkInvoice(ORG_ID, USER_ID, makeBaseInput({ gross_amount: 0 })),
    ).rejects.toThrow(NetworkInvoiceInvalidAmountError);
  });

  // ── F-NI-03: negative gross_amount rejected ────────────────────────────────
  it('F-NI-03: negative gross_amount rejected', async () => {
    const db = makeDb({ network_invoices: { create: vi.fn(), findFirst: vi.fn() } });
    const svc = new NetworkInvoiceService(db);
    await expect(
      svc.createNetworkInvoice(ORG_ID, USER_ID, makeBaseInput({ gross_amount: -1 })),
    ).rejects.toThrow(NetworkInvoiceInvalidAmountError);
  });

  // ── F-NI-04: missing issuer_org_id rejected ────────────────────────────────
  it('F-NI-04: missing issuer_org_id rejected', async () => {
    const db = makeDb({ network_invoices: { create: vi.fn(), findFirst: vi.fn() } });
    const svc = new NetworkInvoiceService(db);
    await expect(
      svc.createNetworkInvoice(ORG_ID, USER_ID, makeBaseInput({ issuer_org_id: '' })),
    ).rejects.toThrow(NetworkInvoiceMissingIssuerError);
  });

  // ── F-NI-05: missing currency rejected ────────────────────────────────────
  it('F-NI-05: missing currency rejected', async () => {
    const db = makeDb({ network_invoices: { create: vi.fn(), findFirst: vi.fn() } });
    const svc = new NetworkInvoiceService(db);
    await expect(
      svc.createNetworkInvoice(ORG_ID, USER_ID, makeBaseInput({ currency: '' })),
    ).rejects.toThrow(NetworkInvoiceMissingCurrencyError);
  });

  // ── F-NI-06: missing network_entity_id rejected ────────────────────────────
  it('F-NI-06: missing network_entity_id rejected', async () => {
    const db = makeDb({ network_invoices: { create: vi.fn(), findFirst: vi.fn() } });
    const svc = new NetworkInvoiceService(db);
    await expect(
      svc.createNetworkInvoice(ORG_ID, USER_ID, makeBaseInput({ network_entity_id: '   ' })),
    ).rejects.toThrow(NetworkInvoiceMissingEntityError);
  });

  // ── F-NI-07: duplicate invoice number rejected ─────────────────────────────
  it('F-NI-07: duplicate invoice_number for same entity rejected', async () => {
    const db = makeDb({
      network_invoices: {
        create:    vi.fn(),
        findFirst: vi.fn().mockResolvedValue({ id: INVOICE_ID }), // existing found
      },
    });
    const svc = new NetworkInvoiceService(db);
    await expect(
      svc.createNetworkInvoice(ORG_ID, USER_ID, makeBaseInput()),
    ).rejects.toThrow(NetworkInvoiceDuplicateError);
    expect(db.network_invoices.create).not.toHaveBeenCalled();
  });

  // ── P-NI-05: getNetworkInvoiceById returns record ──────────────────────────
  it('P-NI-05: getNetworkInvoiceById returns record within org scope', async () => {
    const row = makeRow();
    const db = makeDb({
      network_invoices: {
        create:    vi.fn(),
        findFirst: vi.fn().mockResolvedValue(row),
      },
    });
    const svc = new NetworkInvoiceService(db);
    const result = await svc.getNetworkInvoiceById(ORG_ID, INVOICE_ID);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(INVOICE_ID);
    expect(result!.org_id).toBe(ORG_ID);
    expect(result!.invoice_type).toBe('POOL_ORDER');
    // Confirm org_id was passed to findFirst (tenant scoping)
    const findArgs = db.network_invoices.findFirst.mock.calls[0][0];
    expect(findArgs.where.org_id).toBe(ORG_ID);
    expect(findArgs.where.id).toBe(INVOICE_ID);
  });

  // ── P-NI-06: getNetworkInvoiceById returns null when not found ─────────────
  it('P-NI-06: getNetworkInvoiceById returns null when not found', async () => {
    const db = makeDb({
      network_invoices: {
        create:    vi.fn(),
        findFirst: vi.fn().mockResolvedValue(null),
        findMany:  vi.fn(),
      },
    });
    const svc = new NetworkInvoiceService(db);
    const result = await svc.getNetworkInvoiceById(ORG_ID, INVOICE_ID);
    expect(result).toBeNull();
  });

  // ── P-NI-10: listNetworkInvoicesForPool returns mapped records ─────────────
  it('P-NI-10: listNetworkInvoicesForPool returns records for org+pool scope', async () => {
    const POOL_ID = 'cccc0000-0000-0000-0000-000000000003';
    const row1 = makeRow({ id: INVOICE_ID, network_entity_id: POOL_ID });
    const row2 = makeRow({
      id: 'aaaa1111-0000-0000-0000-000000000007',
      invoice_number: 'NC-INV-002',
      network_entity_id: POOL_ID,
    });
    const db = makeDb({
      network_invoices: {
        create:    vi.fn(),
        findFirst: vi.fn(),
        findMany:  vi.fn().mockResolvedValue([row1, row2]),
      },
    });
    const svc = new NetworkInvoiceService(db);
    const results = await svc.listNetworkInvoicesForPool(ORG_ID, POOL_ID);
    expect(results).toHaveLength(2);
    expect(results[0]!.id).toBe(INVOICE_ID);
    expect(results[1]!.invoice_number).toBe('NC-INV-002');
  });

  // ── P-NI-11: listNetworkInvoicesForPool returns empty array when no invoices
  it('P-NI-11: listNetworkInvoicesForPool returns empty array when no invoices exist', async () => {
    const POOL_ID = 'cccc0000-0000-0000-0000-000000000003';
    const db = makeDb({
      network_invoices: {
        create:    vi.fn(),
        findFirst: vi.fn(),
        findMany:  vi.fn().mockResolvedValue([]),
      },
    });
    const svc = new NetworkInvoiceService(db);
    const results = await svc.listNetworkInvoicesForPool(ORG_ID, POOL_ID);
    expect(results).toEqual([]);
  });

  // ── P-NI-12: listNetworkInvoicesForPool passes correct where clause ─────────
  it('P-NI-12: listNetworkInvoicesForPool queries with org_id + POOL entity type + poolId', async () => {
    const POOL_ID = 'cccc0000-0000-0000-0000-000000000003';
    const db = makeDb({
      network_invoices: {
        create:    vi.fn(),
        findFirst: vi.fn(),
        findMany:  vi.fn().mockResolvedValue([]),
      },
    });
    const svc = new NetworkInvoiceService(db);
    await svc.listNetworkInvoicesForPool(ORG_ID, POOL_ID);
    const findArgs = db.network_invoices.findMany.mock.calls[0][0];
    expect(findArgs.where.org_id).toBe(ORG_ID);
    expect(findArgs.where.network_entity_type).toBe('POOL');
    expect(findArgs.where.network_entity_id).toBe(POOL_ID);
    expect(findArgs.orderBy).toEqual({ created_at: 'desc' });
  });
});
