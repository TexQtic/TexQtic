/**
 * Unit tests — InvoiceService (TTP Slice 4)
 *
 * Pure unit tests with mocked Prisma. No DB access.
 * Covers: createInvoice, tenantTransition, buyerAction (ACKNOWLEDGE + DISPUTE),
 *         adminTransition (MC gate, transition validation).
 *
 * Run: pnpm exec vitest run src/__tests__/invoice.service.unit.test.ts
 *       (from server/ directory)
 */

import { describe, it, expect, vi } from 'vitest';
import {
  InvoiceService,
  InvoiceNotFoundError,
  InvoiceTradeNotFoundError,
  InvoiceSellerMismatchError,
  InvoiceCurrencyMismatchError,
  InvoiceDuplicateNumberError,
  InvoiceTerminalStateError,
  InvoiceTransitionNotAllowedError,
  InvoiceMakerCheckerRequiredError,
  InvoiceBuyerMismatchError,
  InvoiceBuyerActionNotAllowedError,
} from '../services/invoice.service.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const ORG_ID    = 'aaaa0000-0000-0000-0000-000000000001';
const BUYER_ORG = 'bbbb0000-0000-0000-0000-000000000002';
const TRADE_ID  = 'cccc0000-0000-0000-0000-000000000003';
const INV_ID    = 'dddd0000-0000-0000-0000-000000000004';
const USER_ID   = 'eeee0000-0000-0000-0000-000000000005';
const ADMIN_ID  = '00000000-0000-0000-0000-000000000001';
const NOW = new Date('2025-06-01T00:00:00.000Z');

const STATE_DRAFT_ID        = 'f1000000-0000-0000-0000-000000000001';
const STATE_SUBMITTED_ID    = 'f1000000-0000-0000-0000-000000000002';
const STATE_UNDER_REVIEW_ID = 'f1000000-0000-0000-0000-000000000003';
const STATE_VERIFIED_ID     = 'f1000000-0000-0000-0000-000000000004';
const STATE_DISPUTED_ID     = 'f1000000-0000-0000-0000-000000000005';

// ─── Mock DB factory ──────────────────────────────────────────────────────────

function makeDb(overrides: Record<string, unknown> = {}): any {
  return {
    invoices: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    invoice_lifecycle_logs: {
      create: vi.fn(),
    },
    featureFlag: {
      findUnique: vi.fn(),
    },
    lifecycleState: {
      findFirst: vi.fn(),
    },
    trade: {
      findUnique: vi.fn(),
    },
    ...overrides,
  };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeTrade(overrides: Record<string, unknown> = {}) {
  return {
    id: TRADE_ID,
    sellerOrgId: ORG_ID,
    buyerOrgId: BUYER_ORG,
    currency: 'INR',
    ...overrides,
  };
}

function makeInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: INV_ID,
    org_id: ORG_ID,
    buyer_org_id: BUYER_ORG,
    trade_id: TRADE_ID,
    invoice_number: 'INV-001',
    invoice_date: NOW,
    due_date: null,
    currency: 'INR',
    gross_amount: '100000.00',
    lifecycle_state_id: STATE_DRAFT_ID,
    document_url: null,
    notes: null,
    created_by_user_id: USER_ID,
    maker_user_id: null,
    checker_user_id: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function makeLifecycleState(stateKey: string, id: string, isTerminal = false) {
  return { id, entityType: 'INVOICE', stateKey, isTerminal, isIrreversible: false };
}

// ─── createInvoice ────────────────────────────────────────────────────────────

describe('InvoiceService.createInvoice', () => {
  it('creates invoice in DRAFT state — happy path', async () => {
    const db = makeDb();
    const trade = makeTrade();
    const draftState = makeLifecycleState('DRAFT', STATE_DRAFT_ID);
    const createdInvoice = makeInvoice();

    db.trade.findUnique.mockResolvedValue(trade);
    db.lifecycleState.findFirst.mockResolvedValue(draftState);
    db.invoices.findFirst.mockResolvedValue(null); // no duplicate
    db.invoices.create.mockResolvedValue(createdInvoice);
    db.invoice_lifecycle_logs.create.mockResolvedValue({});

    const svc = new InvoiceService(db);
    const result = await svc.createInvoice(ORG_ID, USER_ID, {
      trade_id: TRADE_ID,
      invoice_number: 'INV-001',
      invoice_date: NOW.toISOString(),
      currency: 'INR',
      gross_amount: 100000,
    });

    expect(db.invoices.create).toHaveBeenCalledOnce();
    expect(result).toBeDefined();
    expect(result.invoice_number).toBe('INV-001');
  });

  it('throws InvoiceTradeNotFoundError when trade is missing', async () => {
    const db = makeDb();
    db.trade.findUnique.mockResolvedValue(null);

    const svc = new InvoiceService(db);
    await expect(
      svc.createInvoice(ORG_ID, USER_ID, {
        trade_id: TRADE_ID,
        invoice_number: 'INV-002',
        invoice_date: NOW.toISOString(),
        currency: 'INR',
        gross_amount: 50000,
      }),
    ).rejects.toBeInstanceOf(InvoiceTradeNotFoundError);
  });

  it('throws InvoiceSellerMismatchError when seller org does not match', async () => {
    const db = makeDb();
    db.trade.findUnique.mockResolvedValue(makeTrade({ sellerOrgId: 'different-org' }));

    const svc = new InvoiceService(db);
    await expect(
      svc.createInvoice(ORG_ID, USER_ID, {
        trade_id: TRADE_ID,
        invoice_number: 'INV-002',
        invoice_date: NOW.toISOString(),
        currency: 'INR',
        gross_amount: 50000,
      }),
    ).rejects.toBeInstanceOf(InvoiceSellerMismatchError);
  });

  it('throws InvoiceCurrencyMismatchError when currency does not match trade', async () => {
    const db = makeDb();
    db.trade.findUnique.mockResolvedValue(makeTrade({ currency: 'USD' }));
    const svc = new InvoiceService(db);
    await expect(
      svc.createInvoice(ORG_ID, USER_ID, {
        trade_id: TRADE_ID,
        invoice_number: 'INV-003',
        invoice_date: NOW.toISOString(),
        currency: 'INR',
        gross_amount: 50000,
      }),
    ).rejects.toBeInstanceOf(InvoiceCurrencyMismatchError);
  });

  it('throws InvoiceDuplicateNumberError when invoice_number already exists for trade', async () => {
    const db = makeDb();
    db.trade.findUnique.mockResolvedValue(makeTrade());
    db.lifecycleState.findFirst.mockResolvedValue(makeLifecycleState('DRAFT', STATE_DRAFT_ID));
    db.invoices.findFirst.mockResolvedValue(makeInvoice()); // duplicate found

    const svc = new InvoiceService(db);
    await expect(
      svc.createInvoice(ORG_ID, USER_ID, {
        trade_id: TRADE_ID,
        invoice_number: 'INV-001',
        invoice_date: NOW.toISOString(),
        currency: 'INR',
        gross_amount: 50000,
      }),
    ).rejects.toBeInstanceOf(InvoiceDuplicateNumberError);
  });
});

// ─── tenantTransition ─────────────────────────────────────────────────────────

describe('InvoiceService.tenantTransition', () => {
  it('transitions DRAFT → SUBMITTED — happy path', async () => {
    const db = makeDb();
    const draftInvoice = makeInvoice({ lifecycle_state_id: STATE_DRAFT_ID });
    const submittedState = makeLifecycleState('SUBMITTED', STATE_SUBMITTED_ID);

    db.invoices.findFirst
      .mockResolvedValueOnce(draftInvoice)   // fetch invoice
    db.lifecycleState.findFirst
      .mockResolvedValueOnce(makeLifecycleState('DRAFT', STATE_DRAFT_ID)) // resolveCurrentState
      .mockResolvedValueOnce(submittedState);                              // resolve target state
    db.invoices.update.mockResolvedValue({ ...draftInvoice, lifecycle_state_id: STATE_SUBMITTED_ID });
    db.invoice_lifecycle_logs.create.mockResolvedValue({});

    const svc = new InvoiceService(db);
    const result = await svc.tenantTransition(ORG_ID, INV_ID, 'SUBMITTED', 'Submitting for review', USER_ID);
    expect(result).toBeDefined();
    expect(db.invoices.update).toHaveBeenCalledOnce();
  });

  it('throws InvoiceNotFoundError when invoice not found for org', async () => {
    const db = makeDb();
    db.invoices.findFirst.mockResolvedValue(null);

    const svc = new InvoiceService(db);
    await expect(
      svc.tenantTransition(ORG_ID, INV_ID, 'SUBMITTED', 'reason', USER_ID),
    ).rejects.toBeInstanceOf(InvoiceNotFoundError);
  });

  it('throws InvoiceTerminalStateError when invoice is in terminal state', async () => {
    const db = makeDb();
    const withdrawnInvoice = makeInvoice({ lifecycle_state_id: 'withdrawn-state-id' });
    db.invoices.findFirst.mockResolvedValue(withdrawnInvoice);
    db.lifecycleState.findFirst.mockResolvedValue(
      { id: 'withdrawn-state-id', entityType: 'INVOICE', stateKey: 'WITHDRAWN', isTerminal: true },
    );

    const svc = new InvoiceService(db);
    await expect(
      svc.tenantTransition(ORG_ID, INV_ID, 'SUBMITTED', 'reason', USER_ID),
    ).rejects.toBeInstanceOf(InvoiceTerminalStateError);
  });

  it('throws InvoiceTransitionNotAllowedError when transition is not in tenant allowed set', async () => {
    const db = makeDb();
    // Invoice is SUBMITTED, tenant tries to move to UNDER_REVIEW (only PLATFORM_ADMIN can)
    const submittedInvoice = makeInvoice({ lifecycle_state_id: STATE_SUBMITTED_ID });
    db.invoices.findFirst.mockResolvedValue(submittedInvoice);
    db.lifecycleState.findFirst.mockResolvedValue(
      makeLifecycleState('SUBMITTED', STATE_SUBMITTED_ID),
    );

    const svc = new InvoiceService(db);
    await expect(
      svc.tenantTransition(ORG_ID, INV_ID, 'UNDER_REVIEW', 'reason', USER_ID),
    ).rejects.toBeInstanceOf(InvoiceTransitionNotAllowedError);
  });
});

// ─── buyerAction — ACKNOWLEDGE ────────────────────────────────────────────────

describe('InvoiceService.buyerAction (ACKNOWLEDGE)', () => {
  it('writes lifecycle log without state change — happy path', async () => {
    const db = makeDb();
    const submittedInvoice = makeInvoice({ lifecycle_state_id: STATE_SUBMITTED_ID, buyer_org_id: BUYER_ORG });
    db.invoices.findFirst.mockResolvedValue(submittedInvoice);
    db.lifecycleState.findFirst.mockResolvedValue(
      makeLifecycleState('SUBMITTED', STATE_SUBMITTED_ID),
    );
    db.invoice_lifecycle_logs.create.mockResolvedValue({});

    const svc = new InvoiceService(db);
    const result = await svc.buyerAction(BUYER_ORG, INV_ID, 'ACKNOWLEDGE', 'Reviewed and acknowledged', USER_ID);

    expect(db.invoice_lifecycle_logs.create).toHaveBeenCalledOnce();
    expect(db.invoices.update).not.toHaveBeenCalled(); // no state change
    expect(result).toMatchObject({ acknowledged: true });
  });

  it('throws InvoiceBuyerMismatchError when buyer org does not match', async () => {
    const db = makeDb();
    db.invoices.findFirst.mockResolvedValue(null); // findFirst with buyer_org_id filter returns null

    const svc = new InvoiceService(db);
    await expect(
      svc.buyerAction('wrong-org', INV_ID, 'ACKNOWLEDGE', 'reason', USER_ID),
    ).rejects.toBeInstanceOf(InvoiceBuyerMismatchError);
  });
});

// ─── buyerAction — DISPUTE ────────────────────────────────────────────────────

describe('InvoiceService.buyerAction (DISPUTE)', () => {
  it('transitions SUBMITTED → DISPUTED — happy path', async () => {
    const db = makeDb();
    const submittedInvoice = makeInvoice({ lifecycle_state_id: STATE_SUBMITTED_ID, buyer_org_id: BUYER_ORG });
    const disputedState = makeLifecycleState('DISPUTED', STATE_DISPUTED_ID);

    db.invoices.findFirst.mockResolvedValue(submittedInvoice);
    db.lifecycleState.findFirst
      .mockResolvedValueOnce(makeLifecycleState('SUBMITTED', STATE_SUBMITTED_ID))
      .mockResolvedValueOnce(disputedState);
    db.invoices.update.mockResolvedValue({ ...submittedInvoice, lifecycle_state_id: STATE_DISPUTED_ID });
    db.invoice_lifecycle_logs.create.mockResolvedValue({});

    const svc = new InvoiceService(db);
    const result = await svc.buyerAction(BUYER_ORG, INV_ID, 'DISPUTE', 'Invoice amount incorrect', USER_ID);

    expect(db.invoices.update).toHaveBeenCalledOnce();
    expect(result).toBeDefined();
  });

  it('throws InvoiceBuyerActionNotAllowedError when disputing from VERIFIED state', async () => {
    const db = makeDb();
    const verifiedInvoice = makeInvoice({ lifecycle_state_id: STATE_VERIFIED_ID, buyer_org_id: BUYER_ORG });
    db.invoices.findFirst.mockResolvedValue(verifiedInvoice);
    db.lifecycleState.findFirst.mockResolvedValue(
      makeLifecycleState('VERIFIED', STATE_VERIFIED_ID),
    );

    const svc = new InvoiceService(db);
    await expect(
      svc.buyerAction(BUYER_ORG, INV_ID, 'DISPUTE', 'Disputing', USER_ID),
    ).rejects.toBeInstanceOf(InvoiceBuyerActionNotAllowedError);
  });
});

// ─── adminTransition ──────────────────────────────────────────────────────────

describe('InvoiceService.adminTransition', () => {
  it('transitions SUBMITTED → UNDER_REVIEW — happy path', async () => {
    const db = makeDb();
    const submittedInvoice = makeInvoice({ lifecycle_state_id: STATE_SUBMITTED_ID });
    const underReviewState = makeLifecycleState('UNDER_REVIEW', STATE_UNDER_REVIEW_ID);

    db.invoices.findFirst.mockResolvedValue(submittedInvoice);
    db.lifecycleState.findFirst
      .mockResolvedValueOnce(makeLifecycleState('SUBMITTED', STATE_SUBMITTED_ID))
      .mockResolvedValueOnce(underReviewState);
    db.invoices.update.mockResolvedValue({ ...submittedInvoice, lifecycle_state_id: STATE_UNDER_REVIEW_ID });
    db.invoice_lifecycle_logs.create.mockResolvedValue({});

    const svc = new InvoiceService(db);
    const result = await svc.adminTransition(ADMIN_ID, INV_ID, {
      to_state_key: 'UNDER_REVIEW',
      reason: 'Starting review',
      maker_user_id: null,
      checker_user_id: null,
    });

    expect(db.invoices.update).toHaveBeenCalledOnce();
    expect(result).toBeDefined();
  });

  it('throws InvoiceMakerCheckerRequiredError when gross_amount >= threshold and MC IDs missing', async () => {
    const db = makeDb();
    // High-value invoice (above 500,000 INR threshold)
    const underReviewInvoice = makeInvoice({
      lifecycle_state_id: STATE_UNDER_REVIEW_ID,
      gross_amount: '600000.00',
    });
    const verifiedState = makeLifecycleState('VERIFIED', STATE_VERIFIED_ID);

    db.invoices.findFirst.mockResolvedValue(underReviewInvoice);
    db.lifecycleState.findFirst
      .mockResolvedValueOnce(makeLifecycleState('UNDER_REVIEW', STATE_UNDER_REVIEW_ID))
      .mockResolvedValueOnce(verifiedState);
    // featureFlag returns null → use default 500,000
    db.featureFlag.findUnique.mockResolvedValue(null);

    const svc = new InvoiceService(db);
    await expect(
      svc.adminTransition(ADMIN_ID, INV_ID, {
        to_state_key: 'VERIFIED',
        reason: 'Verifying',
        maker_user_id: null,
        checker_user_id: null,
      }),
    ).rejects.toBeInstanceOf(InvoiceMakerCheckerRequiredError);
  });

  it('succeeds UNDER_REVIEW → VERIFIED with MC IDs on high-value invoice', async () => {
    const db = makeDb();
    const underReviewInvoice = makeInvoice({
      lifecycle_state_id: STATE_UNDER_REVIEW_ID,
      gross_amount: '600000.00',
    });
    const verifiedState = makeLifecycleState('VERIFIED', STATE_VERIFIED_ID);

    db.invoices.findFirst.mockResolvedValue(underReviewInvoice);
    db.lifecycleState.findFirst
      .mockResolvedValueOnce(makeLifecycleState('UNDER_REVIEW', STATE_UNDER_REVIEW_ID))
      .mockResolvedValueOnce(verifiedState);
    db.featureFlag.findUnique.mockResolvedValue(null); // default 500,000
    db.invoices.update.mockResolvedValue({ ...underReviewInvoice, lifecycle_state_id: STATE_VERIFIED_ID });
    db.invoice_lifecycle_logs.create.mockResolvedValue({});

    const svc = new InvoiceService(db);
    const result = await svc.adminTransition(ADMIN_ID, INV_ID, {
      to_state_key: 'VERIFIED',
      reason: 'Dual-approved',
      maker_user_id: 'maker-uuid-0000-0000-0000-000000000001',
      checker_user_id: 'checker-uuid-000-0000-0000-000000000002',
    });

    expect(db.invoices.update).toHaveBeenCalledOnce();
    expect(result).toBeDefined();
  });

  it('throws InvoiceTransitionNotAllowedError for unsupported admin transition', async () => {
    const db = makeDb();
    // VERIFIED → DISPUTED is NOT seeded → should be rejected
    const verifiedInvoice = makeInvoice({ lifecycle_state_id: STATE_VERIFIED_ID });
    db.invoices.findFirst.mockResolvedValue(verifiedInvoice);
    db.lifecycleState.findFirst.mockResolvedValue(
      makeLifecycleState('VERIFIED', STATE_VERIFIED_ID),
    );

    const svc = new InvoiceService(db);
    await expect(
      svc.adminTransition(ADMIN_ID, INV_ID, {
        to_state_key: 'INELIGIBLE',
        reason: 'Invalid path',
        maker_user_id: null,
        checker_user_id: null,
      }),
    ).rejects.toBeInstanceOf(InvoiceTransitionNotAllowedError);
  });

  it('throws InvoiceTerminalStateError for WITHDRAWN invoice', async () => {
    const db = makeDb();
    const withdrawnInvoice = makeInvoice({ lifecycle_state_id: 'withdrawn-id' });
    db.invoices.findFirst.mockResolvedValue(withdrawnInvoice);
    db.lifecycleState.findFirst.mockResolvedValue(
      { id: 'withdrawn-id', entityType: 'INVOICE', stateKey: 'WITHDRAWN', isTerminal: true },
    );

    const svc = new InvoiceService(db);
    await expect(
      svc.adminTransition(ADMIN_ID, INV_ID, {
        to_state_key: 'UNDER_REVIEW',
        reason: 'attempt',
        maker_user_id: null,
        checker_user_id: null,
      }),
    ).rejects.toBeInstanceOf(InvoiceTerminalStateError);
  });
});
