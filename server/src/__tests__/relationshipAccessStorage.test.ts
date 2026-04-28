import { describe, expect, it } from 'vitest';
import type {
  RelationshipStateTransitionInput,
  RelationshipStateTransitionOptions,
} from '../services/relationshipAccess.types.js';
import {
  createRelationshipAccessStorageService,
  type RelationshipStorageDbClient,
} from '../services/relationshipAccessStorage.service.js';

const BUYER_ORG_ID = 'buyer-org-uuid-0000-000000000001';
const SUPPLIER_ORG_ID = 'supplier-org-uuid-0000-000000000001';

function tupleKey(supplierOrgId: string, buyerOrgId: string) {
  return `${supplierOrgId}::${buyerOrgId}`;
}

function createInMemoryRelationshipClient() {
  const rows = new Map<string, Record<string, unknown>>();
  let nextId = 1;

  const client: RelationshipStorageDbClient = {
    buyerSupplierRelationship: {
      async findUnique(args) {
        const tuple = args.where.supplierOrgId_buyerOrgId;
        if (!tuple) {
          throw new Error('Missing supplierOrgId_buyerOrgId tuple in findUnique');
        }
        const row = rows.get(tupleKey(tuple.supplierOrgId, tuple.buyerOrgId));
        return row ? ({ ...row } as never) : null;
      },
      async upsert(args) {
        const tuple = args.where.supplierOrgId_buyerOrgId;
        if (!tuple) {
          throw new Error('Missing supplierOrgId_buyerOrgId tuple in upsert');
        }
        const key = tupleKey(tuple.supplierOrgId, tuple.buyerOrgId);
        const existing = rows.get(key);
        const base = existing ?? {
          id: `relationship-${nextId++}`,
          supplierOrgId: tuple.supplierOrgId,
          buyerOrgId: tuple.buyerOrgId,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        };
        const source = existing ? args.update : args.create;
        const row = {
          ...base,
          ...source,
          supplierOrgId: tuple.supplierOrgId,
          buyerOrgId: tuple.buyerOrgId,
          updatedAt:
            (source.updatedAt as Date | undefined) ??
            new Date('2026-01-01T00:00:00.000Z'),
        };
        rows.set(key, row);
        return { ...row } as never;
      },
    },
  };

  return {
    client,
    rows,
  };
}

function createServiceHarness() {
  const backingStore = createInMemoryRelationshipClient();
  return {
    ...backingStore,
    service: createRelationshipAccessStorageService(backingStore.client),
  };
}

function makeTransitionInput(
  nextState: RelationshipStateTransitionInput['nextState'],
  overrides: Partial<RelationshipStateTransitionInput> = {},
): RelationshipStateTransitionInput {
  return {
    supplierOrgId: SUPPLIER_ORG_ID,
    buyerOrgId: BUYER_ORG_ID,
    nextState,
    ...overrides,
  };
}

async function moveToApproved(
  service: ReturnType<typeof createRelationshipAccessStorageService>,
  options: RelationshipStateTransitionOptions = {},
) {
  const requested = await service.requestRelationshipAccess({
    supplierOrgId: SUPPLIER_ORG_ID,
    buyerOrgId: BUYER_ORG_ID,
  }, options);
  expect(requested.ok).toBe(true);

  const approved = await service.approveRelationship({
    supplierOrgId: SUPPLIER_ORG_ID,
    buyerOrgId: BUYER_ORG_ID,
  }, options);
  expect(approved.ok).toBe(true);
}

describe('relationshipAccessStorage.service', () => {
  it('resolves a missing relationship row to NONE', async () => {
    const { service } = createServiceHarness();

    const snapshot = await service.getRelationshipOrNone(
      SUPPLIER_ORG_ID,
      BUYER_ORG_ID,
    );

    expect(snapshot.state).toBe('NONE');
    expect(snapshot.id).toBeNull();
  });

  it('persists REQUESTED and reads it back', async () => {
    const { service } = createServiceHarness();
    const now = new Date('2026-04-01T10:00:00.000Z');

    const result = await service.requestRelationshipAccess(
      {
        supplierOrgId: SUPPLIER_ORG_ID,
        buyerOrgId: BUYER_ORG_ID,
        internalReason: 'requested internally',
        metadata: { source: 'unit-test' },
      },
      { now },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.relationship.state).toBe('REQUESTED');
    expect(result.relationship.requestedAt).toEqual(now);
    expect(await service.getRelationshipState(SUPPLIER_ORG_ID, BUYER_ORG_ID)).toBe(
      'REQUESTED',
    );
  });

  it('persists APPROVED and reads it back', async () => {
    const { service } = createServiceHarness();
    const now = new Date('2026-04-01T11:00:00.000Z');

    await moveToApproved(service, { now });

    const snapshot = await service.getRelationshipOrNone(
      SUPPLIER_ORG_ID,
      BUYER_ORG_ID,
    );
    expect(snapshot.state).toBe('APPROVED');
    expect(snapshot.approvedAt).toEqual(now);
  });

  it('persists REJECTED and reads it back', async () => {
    const { service } = createServiceHarness();
    await service.requestRelationshipAccess({
      supplierOrgId: SUPPLIER_ORG_ID,
      buyerOrgId: BUYER_ORG_ID,
    });

    const result = await service.rejectRelationship({
      supplierOrgId: SUPPLIER_ORG_ID,
      buyerOrgId: BUYER_ORG_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.relationship.state).toBe('REJECTED');
  });

  it('persists BLOCKED and reads it back', async () => {
    const { service } = createServiceHarness();
    await service.requestRelationshipAccess({
      supplierOrgId: SUPPLIER_ORG_ID,
      buyerOrgId: BUYER_ORG_ID,
    });

    const result = await service.blockRelationship({
      supplierOrgId: SUPPLIER_ORG_ID,
      buyerOrgId: BUYER_ORG_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.relationship.state).toBe('BLOCKED');
  });

  it('persists SUSPENDED and reads it back', async () => {
    const { service } = createServiceHarness();
    await moveToApproved(service);

    const result = await service.suspendRelationship({
      supplierOrgId: SUPPLIER_ORG_ID,
      buyerOrgId: BUYER_ORG_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.relationship.state).toBe('SUSPENDED');
    expect(result.relationship.suspendedAt).toBeInstanceOf(Date);
  });

  it('persists EXPIRED and reads it back', async () => {
    const { service } = createServiceHarness();
    const expiresAt = new Date('2026-05-01T00:00:00.000Z');
    await moveToApproved(service);

    const result = await service.expireRelationship({
      supplierOrgId: SUPPLIER_ORG_ID,
      buyerOrgId: BUYER_ORG_ID,
      expiresAt,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.relationship.state).toBe('EXPIRED');
    expect(result.relationship.expiresAt).toEqual(expiresAt);
  });

  it('persists REVOKED and reads it back', async () => {
    const { service } = createServiceHarness();
    await moveToApproved(service);

    const result = await service.revokeRelationship({
      supplierOrgId: SUPPLIER_ORG_ID,
      buyerOrgId: BUYER_ORG_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.relationship.state).toBe('REVOKED');
    expect(result.relationship.revokedAt).toBeInstanceOf(Date);
  });

  it('keeps tuple lookups isolated per supplier and buyer', async () => {
    const { service } = createServiceHarness();
    await service.requestRelationshipAccess({
      supplierOrgId: SUPPLIER_ORG_ID,
      buyerOrgId: BUYER_ORG_ID,
    });

    const wrongBuyer = await service.getRelationshipOrNone(
      SUPPLIER_ORG_ID,
      'buyer-org-uuid-0000-000000000999',
    );
    const wrongSupplier = await service.getRelationshipOrNone(
      'supplier-org-uuid-0000-000000000999',
      BUYER_ORG_ID,
    );

    expect(wrongBuyer.state).toBe('NONE');
    expect(wrongSupplier.state).toBe('NONE');
  });

  it('preserves one stored row per supplier/buyer tuple', async () => {
    const { service, rows } = createServiceHarness();
    await service.requestRelationshipAccess({
      supplierOrgId: SUPPLIER_ORG_ID,
      buyerOrgId: BUYER_ORG_ID,
    });
    await service.approveRelationship({
      supplierOrgId: SUPPLIER_ORG_ID,
      buyerOrgId: BUYER_ORG_ID,
    });

    expect(rows.size).toBe(1);
  });

  it('supports NONE to REQUESTED transitions', async () => {
    const { service } = createServiceHarness();

    const result = await service.createOrUpdateRelationshipState(
      makeTransitionInput('REQUESTED'),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.previousState).toBe('NONE');
    expect(result.relationship.state).toBe('REQUESTED');
  });

  it('supports REQUESTED to APPROVED transitions', async () => {
    const { service } = createServiceHarness();
    await service.requestRelationshipAccess({
      supplierOrgId: SUPPLIER_ORG_ID,
      buyerOrgId: BUYER_ORG_ID,
    });

    const result = await service.createOrUpdateRelationshipState(
      makeTransitionInput('APPROVED'),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.previousState).toBe('REQUESTED');
    expect(result.relationship.state).toBe('APPROVED');
  });

  it('supports REQUESTED to REJECTED transitions', async () => {
    const { service } = createServiceHarness();
    await service.requestRelationshipAccess({
      supplierOrgId: SUPPLIER_ORG_ID,
      buyerOrgId: BUYER_ORG_ID,
    });

    const result = await service.createOrUpdateRelationshipState(
      makeTransitionInput('REJECTED'),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.relationship.state).toBe('REJECTED');
  });

  it('supports REQUESTED to BLOCKED transitions', async () => {
    const { service } = createServiceHarness();
    await service.requestRelationshipAccess({
      supplierOrgId: SUPPLIER_ORG_ID,
      buyerOrgId: BUYER_ORG_ID,
    });

    const result = await service.createOrUpdateRelationshipState(
      makeTransitionInput('BLOCKED'),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.relationship.state).toBe('BLOCKED');
  });

  it('supports APPROVED to REVOKED transitions', async () => {
    const { service } = createServiceHarness();
    await moveToApproved(service);

    const result = await service.createOrUpdateRelationshipState(
      makeTransitionInput('REVOKED'),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.relationship.state).toBe('REVOKED');
  });

  it('supports APPROVED to SUSPENDED transitions', async () => {
    const { service } = createServiceHarness();
    await moveToApproved(service);

    const result = await service.createOrUpdateRelationshipState(
      makeTransitionInput('SUSPENDED'),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.relationship.state).toBe('SUSPENDED');
  });

  it('supports SUSPENDED to APPROVED transitions', async () => {
    const { service } = createServiceHarness();
    await moveToApproved(service);
    await service.suspendRelationship({
      supplierOrgId: SUPPLIER_ORG_ID,
      buyerOrgId: BUYER_ORG_ID,
    });

    const result = await service.createOrUpdateRelationshipState(
      makeTransitionInput('APPROVED'),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.relationship.state).toBe('APPROVED');
  });

  it('fails safely on unsupported transitions', async () => {
    const { service } = createServiceHarness();

    const result = await service.createOrUpdateRelationshipState(
      makeTransitionInput('APPROVED'),
    );

    expect(result).toEqual({
      ok: false,
      error: 'INVALID_RELATIONSHIP_TRANSITION',
      currentState: 'NONE',
    });
  });

  it('does not allow a blocked relationship to be overwritten by a buyer request', async () => {
    const { service } = createServiceHarness();
    await service.requestRelationshipAccess({
      supplierOrgId: SUPPLIER_ORG_ID,
      buyerOrgId: BUYER_ORG_ID,
    });
    await service.blockRelationship({
      supplierOrgId: SUPPLIER_ORG_ID,
      buyerOrgId: BUYER_ORG_ID,
    });

    const result = await service.requestRelationshipAccess({
      supplierOrgId: SUPPLIER_ORG_ID,
      buyerOrgId: BUYER_ORG_ID,
    });

    expect(result).toEqual({
      ok: false,
      error: 'RELATIONSHIP_BLOCKED',
      currentState: 'BLOCKED',
    });
  });

  it('sets state-specific timestamps during updates', async () => {
    const { service } = createServiceHarness();
    const requestedAt = new Date('2026-04-01T12:00:00.000Z');
    const approvedAt = new Date('2026-04-01T13:00:00.000Z');

    const requested = await service.requestRelationshipAccess(
      {
        supplierOrgId: SUPPLIER_ORG_ID,
        buyerOrgId: BUYER_ORG_ID,
      },
      { now: requestedAt },
    );
    expect(requested.ok).toBe(true);

    const approved = await service.approveRelationship(
      {
        supplierOrgId: SUPPLIER_ORG_ID,
        buyerOrgId: BUYER_ORG_ID,
      },
      { now: approvedAt },
    );

    expect(approved.ok).toBe(true);
    if (!approved.ok) {
      return;
    }
    expect(approved.relationship.requestedAt).toEqual(requestedAt);
    expect(approved.relationship.approvedAt).toEqual(approvedAt);
    expect(approved.relationship.decidedAt).toEqual(approvedAt);
  });

  it('keeps internal reason and metadata out of public-safe snapshots', async () => {
    const { service } = createServiceHarness();

    const result = await service.requestRelationshipAccess({
      supplierOrgId: SUPPLIER_ORG_ID,
      buyerOrgId: BUYER_ORG_ID,
      internalReason: 'supplier-only note',
      metadata: { escalation: false },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const publicShape = result.relationship as unknown as Record<string, unknown>;
    expect(publicShape.internalReason).toBeUndefined();
    expect(publicShape.metadataJson).toBeUndefined();
    expect(publicShape.metadata).toBeUndefined();
  });

  it('allows explicit reapply from REJECTED when the option is enabled', async () => {
    const { service } = createServiceHarness();
    await service.requestRelationshipAccess({
      supplierOrgId: SUPPLIER_ORG_ID,
      buyerOrgId: BUYER_ORG_ID,
    });
    await service.rejectRelationship({
      supplierOrgId: SUPPLIER_ORG_ID,
      buyerOrgId: BUYER_ORG_ID,
    });

    const result = await service.requestRelationshipAccess(
      {
        supplierOrgId: SUPPLIER_ORG_ID,
        buyerOrgId: BUYER_ORG_ID,
      },
      { allowReapply: true },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.relationship.state).toBe('REQUESTED');
  });

  it('fails reapply from REVOKED by default', async () => {
    const { service } = createServiceHarness();
    await moveToApproved(service);
    await service.revokeRelationship({
      supplierOrgId: SUPPLIER_ORG_ID,
      buyerOrgId: BUYER_ORG_ID,
    });

    const result = await service.requestRelationshipAccess({
      supplierOrgId: SUPPLIER_ORG_ID,
      buyerOrgId: BUYER_ORG_ID,
    });

    expect(result).toEqual({
      ok: false,
      error: 'INVALID_RELATIONSHIP_TRANSITION',
      currentState: 'REVOKED',
    });
  });
});
