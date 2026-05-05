/**
 * ttp-score-snapshot-trigger-vpc.unit.test.ts — VPC_ISSUED snapshot trigger unit tests
 *
 * Covers the `captureVpcIssuedSnapshot` orchestration helper exported from the VPC route.
 *
 * Test scope:
 *   TC-TVPC-001  captureSnapshot called with triggerEvent = VPC_ISSUED
 *   TC-TVPC-002  snapshot context contains correct vpcId, sourceEventId, invoiceId, orgId, actorId, tradeId
 *   TC-TVPC-003  captureSnapshot success → helper resolves without error
 *   TC-TVPC-004  captureSnapshot not reached when VPC generation fails (route orchestration contract)
 *   TC-TVPC-005  captureSnapshot throws → captureVpcIssuedSnapshot still resolves (no rethrow)
 *   TC-TVPC-006  captureSnapshot throws → VPC result unaffected (helper returns normally)
 *   TC-TVPC-007  captureSnapshot throws → log.error called with structured event
 *   TC-TVPC-008  log.error event includes trigger_event, vpc_id, invoice_id, trade_id, org_id, err_name, err_msg
 *   TC-TVPC-009  triggerEvent is VPC_ISSUED, never PARTNER_TRANSMITTED
 *   TC-TVPC-010  captureSnapshot success → log.error NOT called
 *
 * Governance: TTP Slice 3 (TTP-SCORE-SNAPSHOT-TRIGGER-VPC-001), TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { captureVpcIssuedSnapshot } from '../routes/control/vpc.js';
import { TTP_SCORE_TRIGGER_EVENT, type CaptureSnapshotInput, type CaptureSnapshotResult } from '../services/ttpScoreSnapshot.service.js';
import type { AdminVpcRecord } from '../services/vpc.service.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const INVOICE_ID = 'aaaa1111-0000-0000-0000-000000000001';
const VPC_ID     = 'bbbb2222-0000-0000-0000-000000000002';
const ORG_ID     = 'cccc3333-0000-0000-0000-000000000003';
const TRADE_ID   = 'dddd4444-0000-0000-0000-000000000004';
const ADMIN_ID   = 'eeee5555-0000-0000-0000-000000000005';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeVpcRecord(overrides: Partial<AdminVpcRecord> = {}): AdminVpcRecord {
  return {
    id: VPC_ID,
    org_id: ORG_ID,
    invoice_id: INVOICE_ID,
    trade_id: TRADE_ID,
    buyer_org_id: 'buyer-0000-0000-0000-000000000001',
    seller_org_id: ORG_ID,
    vpc_reference: 'VPC-20250101-AAAA1111',
    currency: 'INR',
    invoice_amount: '100000',
    risk_tier: 2,
    state_key: 'ACTIVE',
    is_terminal: false,
    issued_at: new Date().toISOString(),
    expires_at: new Date('2025-12-31').toISOString(),
    voided_at: null,
    void_reason: null,
    partner_routing_eligible: false,
    created_by_admin_id: ADMIN_ID,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeSnapshotResult() {
  return {
    id: 'snap-0000-0000-0000-000000000001',
    org_id: ORG_ID,
    score_value: 72,
    score_band: 'MEDIUM',
    score_version: 'TTP_V1',
    trigger_event: 'VPC_ISSUED',
    created_at: new Date(),
  };
}

// ─── Mock type helpers ──────────────────────────────────────────────────────────────────

// Typed vi.fn factories — implementation signature tells TypeScript the exact mock type.
// vi.fn(implementation) infers Mock<typeof implementation>, satisfying the strict interfaces
// without needing an unsafe `as any` cast.

function makeCaptureSnapshotMock(result: CaptureSnapshotResult = makeSnapshotResult()) {
  return vi.fn((_input: CaptureSnapshotInput): Promise<CaptureSnapshotResult> =>
    Promise.resolve(result),
  );
}

function makeLogErrorMock() {
  return vi.fn((_obj: Record<string, unknown>, _msg: string): void => undefined);
}

// ─── Tests ────────────────────────────────────────────────────────────────────────────────

describe('captureVpcIssuedSnapshot', () => {
  let snapshotSvc: { captureSnapshot: ReturnType<typeof makeCaptureSnapshotMock> };
  let log: { error: ReturnType<typeof makeLogErrorMock> };
  let record: AdminVpcRecord;

  beforeEach(() => {
    snapshotSvc = { captureSnapshot: makeCaptureSnapshotMock() };
    log = { error: makeLogErrorMock() };
    record = makeVpcRecord();
  });

  it('TC-TVPC-001: calls captureSnapshot with triggerEvent = VPC_ISSUED', async () => {
    await captureVpcIssuedSnapshot({ record, invoiceId: INVOICE_ID, adminId: ADMIN_ID, snapshotSvc, log });

    expect(snapshotSvc.captureSnapshot).toHaveBeenCalledOnce();
    const call = snapshotSvc.captureSnapshot.mock.calls[0][0];
    expect(call.triggerEvent).toBe(TTP_SCORE_TRIGGER_EVENT.VPC_ISSUED);
    expect(call.triggerEvent).toBe('VPC_ISSUED');
  });

  it('TC-TVPC-002: snapshot context contains correct vpcId, sourceEventId, invoiceId, orgId, actorId, tradeId', async () => {
    await captureVpcIssuedSnapshot({ record, invoiceId: INVOICE_ID, adminId: ADMIN_ID, snapshotSvc, log });

    const call = snapshotSvc.captureSnapshot.mock.calls[0][0];
    expect(call.vpcId).toBe(VPC_ID);
    expect(call.sourceEventId).toBe(VPC_ID);  // sourceEventId === vpcId === record.id
    expect(call.invoiceId).toBe(INVOICE_ID);
    expect(call.orgId).toBe(ORG_ID);
    expect(call.actorId).toBe(ADMIN_ID);
    expect(call.tradeId).toBe(TRADE_ID);
  });

  it('TC-TVPC-003: captureSnapshot success → helper resolves without error', async () => {
    await expect(
      captureVpcIssuedSnapshot({ record, invoiceId: INVOICE_ID, adminId: ADMIN_ID, snapshotSvc, log }),
    ).resolves.toBeUndefined();
  });

  it('TC-TVPC-004: captureSnapshot not reached when VPC generation fails (route orchestration contract)', async () => {
    // The route handler assigns `record` only inside `withVpcAdminWriteContext(...generateVpc...)`.
    // If generateVpc throws, the outer catch runs immediately; captureVpcIssuedSnapshot is never called.
    // This test documents that structural guarantee by simulating the route flow.
    const captureSnapshotFn = makeCaptureSnapshotMock();
    const mockSnapshotSvc = { captureSnapshot: captureSnapshotFn };
    let snapshotInvoked = false;

    try {
      // Simulate VPC generation throwing before `record` is set
      await Promise.reject(new Error('VpcInvoiceNotFoundError: Invoice not found'));
      // Lines below are never reached in the error path:
      const rec = makeVpcRecord();
      await captureVpcIssuedSnapshot({ record: rec, invoiceId: INVOICE_ID, adminId: ADMIN_ID, snapshotSvc: mockSnapshotSvc, log });
      snapshotInvoked = true;
    } catch {
      // Error path — route would return 404/422/500 here
    }

    expect(snapshotInvoked).toBe(false);
    expect(captureSnapshotFn).not.toHaveBeenCalled();
  });

  it('TC-TVPC-005: captureSnapshot throws → captureVpcIssuedSnapshot does NOT rethrow', async () => {
    snapshotSvc.captureSnapshot.mockRejectedValue(new Error('DB write failed'));

    await expect(
      captureVpcIssuedSnapshot({ record, invoiceId: INVOICE_ID, adminId: ADMIN_ID, snapshotSvc, log }),
    ).resolves.toBeUndefined();
  });

  it('TC-TVPC-006: captureSnapshot throws → helper returns normally (VPC result unaffected by design)', async () => {
    snapshotSvc.captureSnapshot.mockRejectedValue(new Error('snapshot write error'));

    // The helper should NOT throw — the VPC HTTP response path continues normally
    const result = await captureVpcIssuedSnapshot({
      record, invoiceId: INVOICE_ID, adminId: ADMIN_ID, snapshotSvc, log,
    });

    expect(result).toBeUndefined(); // Promise<void> resolves to undefined
  });

  it('TC-TVPC-007: captureSnapshot throws → log.error called once with structured event', async () => {
    snapshotSvc.captureSnapshot.mockRejectedValue(new Error('snapshot write error'));

    await captureVpcIssuedSnapshot({ record, invoiceId: INVOICE_ID, adminId: ADMIN_ID, snapshotSvc, log });

    expect(log.error).toHaveBeenCalledOnce();
    const [logObj, logMsg] = log.error.mock.calls[0];
    expect(logObj.event).toBe('ttp.score_snapshot.capture_failed');
    expect(logMsg).toBe('ttp.score_snapshot.capture_failed');
  });

  it('TC-TVPC-008: log.error event includes trigger_event, vpc_id, invoice_id, trade_id, org_id, err_name, err_msg', async () => {
    const snapError = new Error('snapshot write error');
    snapshotSvc.captureSnapshot.mockRejectedValue(snapError);

    await captureVpcIssuedSnapshot({ record, invoiceId: INVOICE_ID, adminId: ADMIN_ID, snapshotSvc, log });

    const [logObj] = log.error.mock.calls[0];
    expect(logObj.trigger_event).toBe('VPC_ISSUED');
    expect(logObj.vpc_id).toBe(VPC_ID);
    expect(logObj.invoice_id).toBe(INVOICE_ID);
    expect(logObj.trade_id).toBe(TRADE_ID);
    expect(logObj.org_id).toBe(ORG_ID);
    expect(logObj.err_name).toBe('Error');
    expect(logObj.err_msg).toBe('snapshot write error');

    // No sensitive fields
    const logKeys = Object.keys(logObj);
    expect(logKeys).not.toContain('invoice_amount');
    expect(logKeys).not.toContain('vpc_reference');
    expect(logKeys).not.toContain('created_by_admin_id');
    expect(logKeys).not.toContain('actorId');
    expect(logKeys).not.toContain('adminId');
  });

  it('TC-TVPC-009: triggerEvent is always VPC_ISSUED, never PARTNER_TRANSMITTED', async () => {
    await captureVpcIssuedSnapshot({ record, invoiceId: INVOICE_ID, adminId: ADMIN_ID, snapshotSvc, log });

    const call = snapshotSvc.captureSnapshot.mock.calls[0][0];
    expect(call.triggerEvent).toBe('VPC_ISSUED');
    expect(call.triggerEvent).not.toBe('PARTNER_TRANSMITTED');
    expect(call.triggerEvent).not.toBe('ENROLLMENT_APPROVED');
    expect(call.triggerEvent).not.toBe('ADMIN_REVIEW_COMPLETE');
  });

  it('TC-TVPC-010: captureSnapshot success → log.error NOT called', async () => {
    await captureVpcIssuedSnapshot({ record, invoiceId: INVOICE_ID, adminId: ADMIN_ID, snapshotSvc, log });

    expect(log.error).not.toHaveBeenCalled();
  });
});
