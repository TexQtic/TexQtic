import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { CertificationService } from '../services/certification.g019.service.js';

const ORG_ID = '11111111-1111-1111-1111-111111111111';
const CERT_ID = '22222222-2222-2222-2222-222222222222';
const USER_ID = '33333333-3333-3333-3333-333333333333';
const CURRENT_STATE_ID = '44444444-4444-4444-4444-444444444444';
const TARGET_STATE_ID = '55555555-5555-5555-5555-555555555555';

function makeDb() {
  const db = {
    certification: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    lifecycleState: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  db.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: typeof db) => Promise<unknown>)(db);
    }
    return arg;
  });

  return db;
}

describe('CertificationService.transitionCertification', () => {
  const stateMachine = {
    transition: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies a certification transition and updates lifecycleStateId', async () => {
    const db = makeDb();
    db.certification.findFirst.mockResolvedValue({
      id: CERT_ID,
      orgId: ORG_ID,
      lifecycleStateId: CURRENT_STATE_ID,
    });
    db.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'SUBMITTED' })
      .mockResolvedValueOnce({ id: TARGET_STATE_ID });
    db.certification.update.mockResolvedValue({ id: CERT_ID });
    stateMachine.transition.mockResolvedValue({
      status: 'APPLIED',
      toStateKey: 'APPROVED',
    });

    const service = new CertificationService(
      db as unknown as PrismaClient,
      stateMachine as never,
      null,
    );

    const result = await service.transitionCertification({
      certificationId: CERT_ID,
      orgId: ORG_ID,
      toStateKey: 'approved',
      reason: 'Approve certification after document review.',
      actorRole: 'tenant_admin',
      actorUserId: USER_ID,
    });

    expect(result).toEqual({ status: 'APPLIED', newStateKey: 'APPROVED' });
    expect(stateMachine.transition).toHaveBeenCalledOnce();
    expect(db.certification.update).toHaveBeenCalledWith({
      where: { id: CERT_ID },
      data: { lifecycleStateId: TARGET_STATE_ID },
    });
  });

  it('maps denied state-machine transitions to TRANSITION_NOT_APPLIED', async () => {
    const db = makeDb();
    db.certification.findFirst.mockResolvedValue({
      id: CERT_ID,
      orgId: ORG_ID,
      lifecycleStateId: CURRENT_STATE_ID,
    });
    db.lifecycleState.findFirst.mockResolvedValueOnce({ stateKey: 'SUBMITTED' });
    stateMachine.transition.mockResolvedValue({
      status: 'DENIED',
      code: 'TRANSITION_NOT_PERMITTED',
      message: 'Transition denied by policy.',
    });

    const service = new CertificationService(
      db as unknown as PrismaClient,
      stateMachine as never,
      null,
    );

    const result = await service.transitionCertification({
      certificationId: CERT_ID,
      orgId: ORG_ID,
      toStateKey: 'approved',
      reason: 'Attempt transition.',
      actorRole: 'tenant_admin',
      actorUserId: USER_ID,
    });

    expect(result).toEqual({
      status: 'ERROR',
      code: 'TRANSITION_NOT_APPLIED',
      message: 'Transition denied by policy.',
    });
    expect(db.certification.update).not.toHaveBeenCalled();
  });

  it('passes through pending approval without mutating certification state', async () => {
    const db = makeDb();
    db.certification.findFirst.mockResolvedValue({
      id: CERT_ID,
      orgId: ORG_ID,
      lifecycleStateId: CURRENT_STATE_ID,
    });
    db.lifecycleState.findFirst.mockResolvedValueOnce({ stateKey: 'SUBMITTED' });
    stateMachine.transition.mockResolvedValue({ status: 'PENDING_APPROVAL' });

    const service = new CertificationService(
      db as unknown as PrismaClient,
      stateMachine as never,
      null,
    );

    const result = await service.transitionCertification({
      certificationId: CERT_ID,
      orgId: ORG_ID,
      toStateKey: 'under_review',
      reason: 'Submit for checker approval.',
      actorRole: 'tenant_admin',
      actorUserId: USER_ID,
    });

    expect(result).toEqual({
      status: 'PENDING_APPROVAL',
      newStateKey: 'UNDER_REVIEW',
    });
    expect(db.certification.update).not.toHaveBeenCalled();
  });
});