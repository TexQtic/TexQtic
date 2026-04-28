import { describe, expect, it, vi } from 'vitest';
import type {
  RelationshipAllowlistAuditEvent,
  RelationshipStateMutationResult,
  RelationshipStateSnapshot,
} from '../services/relationshipAccess.types.js';
import {
  createRelationshipAllowlistService,
  type RelationshipAllowlistStorage,
} from '../services/relationshipAllowlist.service.js';
import {
  createRelationshipAccessStorageService,
  type RelationshipStorageDbClient,
} from '../services/relationshipAccessStorage.service.js';

const BUYER_ORG_A = 'buyer-org-uuid-0000-000000000001';
const BUYER_ORG_B = 'buyer-org-uuid-0000-000000000002';
const SUPPLIER_ORG_A = 'supplier-org-uuid-0000-000000000001';
const SUPPLIER_ORG_B = 'supplier-org-uuid-0000-000000000002';

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

  return { client, rows };
}

function createHarness() {
  const backingStore = createInMemoryRelationshipClient();
  const storage = createRelationshipAccessStorageService(backingStore.client);
  const auditEvents: RelationshipAllowlistAuditEvent[] = [];

  const service = createRelationshipAllowlistService({
    storage,
    auditSink: {
      record(event) {
        auditEvents.push(event);
      },
    },
  });

  return {
    service,
    storage,
    rows: backingStore.rows,
    auditEvents,
  };
}

describe('relationshipAllowlist.service', () => {
  it('requests access from NONE to REQUESTED', async () => {
    const { service } = createHarness();

    const result = await service.requestSupplierAccess({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.relationship.state).toBe('REQUESTED');
  });

  it('approves REQUESTED to APPROVED', async () => {
    const { service } = createHarness();
    await service.requestSupplierAccess({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });

    const result = await service.approveBuyerRelationship({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
      actorUserId: 'supplier-user-1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.relationship.state).toBe('APPROVED');
  });

  it('rejects REQUESTED to REJECTED', async () => {
    const { service } = createHarness();
    await service.requestSupplierAccess({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });

    const result = await service.rejectBuyerRelationship({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.relationship.state).toBe('REJECTED');
  });

  it('blocks REQUESTED to BLOCKED', async () => {
    const { service } = createHarness();
    await service.requestSupplierAccess({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });

    const result = await service.blockBuyerRelationship({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.relationship.state).toBe('BLOCKED');
  });

  it('revokes APPROVED to REVOKED', async () => {
    const { service } = createHarness();
    await service.requestSupplierAccess({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });
    await service.approveBuyerRelationship({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });

    const result = await service.revokeBuyerRelationship({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.relationship.state).toBe('REVOKED');
  });

  it('suspends APPROVED to SUSPENDED', async () => {
    const { service } = createHarness();
    await service.requestSupplierAccess({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });
    await service.approveBuyerRelationship({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });

    const result = await service.suspendBuyerRelationship({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.relationship.state).toBe('SUSPENDED');
  });

  it('resumes SUSPENDED to APPROVED', async () => {
    const { service } = createHarness();
    await service.requestSupplierAccess({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });
    await service.approveBuyerRelationship({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });
    await service.suspendBuyerRelationship({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });

    const result = await service.resumeBuyerRelationship({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.relationship.state).toBe('APPROVED');
  });

  it('does not allow BLOCKED to be overwritten by buyer request', async () => {
    const { service } = createHarness();
    await service.blockBuyerRelationship({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });

    const result = await service.requestSupplierAccess({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error).toBe('RELATIONSHIP_BLOCKED');
    expect(result.currentState).toBe('BLOCKED');
  });

  it('does not allow BLOCKED to be approved without unblock path', async () => {
    const { service } = createHarness();
    await service.blockBuyerRelationship({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });

    const result = await service.approveBuyerRelationship({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error).toBe('RELATIONSHIP_BLOCKED');
  });

  it('treats request for APPROVED state as idempotent no-op', async () => {
    const { service } = createHarness();
    await service.requestSupplierAccess({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });
    await service.approveBuyerRelationship({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });

    const result = await service.requestSupplierAccess({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.wasNoop).toBe(true);
    expect(result.relationship.state).toBe('APPROVED');
  });

  it('treats request for REQUESTED state as idempotent no-op', async () => {
    const { service } = createHarness();
    await service.requestSupplierAccess({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });

    const result = await service.requestSupplierAccess({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.wasNoop).toBe(true);
    expect(result.relationship.state).toBe('REQUESTED');
  });

  it('allows REJECTED reapply only when explicit option is enabled', async () => {
    const { service } = createHarness();
    await service.requestSupplierAccess({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });
    await service.rejectBuyerRelationship({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });

    const denied = await service.requestSupplierAccess({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });
    expect(denied.ok).toBe(false);

    const allowed = await service.requestSupplierAccess(
      {
        supplierOrgId: SUPPLIER_ORG_A,
        buyerOrgId: BUYER_ORG_A,
      },
      { allowReapply: true },
    );
    expect(allowed.ok).toBe(true);
    if (!allowed.ok) {
      return;
    }

    expect(allowed.relationship.state).toBe('REQUESTED');
  });

  it('allows REVOKED reapply only when explicit option is enabled', async () => {
    const { service } = createHarness();
    await service.requestSupplierAccess({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });
    await service.approveBuyerRelationship({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });
    await service.revokeBuyerRelationship({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });

    const denied = await service.requestSupplierAccess({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });
    expect(denied.ok).toBe(false);

    const allowed = await service.requestSupplierAccess(
      {
        supplierOrgId: SUPPLIER_ORG_A,
        buyerOrgId: BUYER_ORG_A,
      },
      { allowReapply: true },
    );
    expect(allowed.ok).toBe(true);
    if (!allowed.ok) {
      return;
    }

    expect(allowed.relationship.state).toBe('REQUESTED');
  });

  it('does not let supplier A mutate supplier B tuple', async () => {
    const { service } = createHarness();
    await service.requestSupplierAccess({
      supplierOrgId: SUPPLIER_ORG_B,
      buyerOrgId: BUYER_ORG_A,
    });

    const wrongSupplierResult = await service.approveBuyerRelationship({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });

    expect(wrongSupplierResult.ok).toBe(false);

    const untouched = await service.getSupplierBuyerRelationship(
      SUPPLIER_ORG_B,
      BUYER_ORG_A,
    );
    expect(untouched.relationship.state).toBe('REQUESTED');
  });

  it('returns NONE for wrong buyer tuple lookup', async () => {
    const { service } = createHarness();

    const result = await service.getSupplierBuyerRelationship(
      SUPPLIER_ORG_A,
      BUYER_ORG_B,
    );

    expect(result.relationship.state).toBe('NONE');
  });

  it('returns NONE for wrong supplier tuple lookup', async () => {
    const { service } = createHarness();

    const result = await service.getSupplierBuyerRelationship(
      SUPPLIER_ORG_B,
      BUYER_ORG_A,
    );

    expect(result.relationship.state).toBe('NONE');
  });

  it('public-safe output excludes internal reason, audit metadata, and graph data', async () => {
    const { service } = createHarness();
    const result = await service.requestSupplierAccess({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
      internalReason: 'internal reason only',
      metadata: { private: true },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const publicStatus = result.publicStatus as unknown as Record<string, unknown>;
    expect(publicStatus.internalReason).toBeUndefined();
    expect(publicStatus.auditMetadata).toBeUndefined();
    expect(publicStatus.approvedBuyerIds).toBeUndefined();
    expect(publicStatus.relationshipGraph).toBeUndefined();
  });

  it('records audit event for transition when audit sink exists', async () => {
    const { service, auditEvents } = createHarness();

    const result = await service.requestSupplierAccess({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
      actorUserId: 'buyer-user-1',
      internalReason: 'request note',
    });

    expect(result.ok).toBe(true);
    expect(auditEvents).toHaveLength(1);
    expect(auditEvents[0]?.previousState).toBe('NONE');
    expect(auditEvents[0]?.newState).toBe('REQUESTED');
    expect(auditEvents[0]?.actorType).toBe('BUYER');
    expect(auditEvents[0]?.actorUserId).toBe('buyer-user-1');
  });

  it('does not record audit event for no-op transition', async () => {
    const { service, auditEvents } = createHarness();
    await service.requestSupplierAccess({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });

    const eventCountBefore = auditEvents.length;
    const noop = await service.requestSupplierAccess({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });

    expect(noop.ok).toBe(true);
    if (!noop.ok) {
      return;
    }

    expect(noop.wasNoop).toBe(true);
    expect(auditEvents.length).toBe(eventCountBefore);
  });

  it('uses storage layer calls rather than duplicating persistence', async () => {
    const noneSnapshot: RelationshipStateSnapshot = {
      id: null,
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
      state: 'NONE',
      requestedAt: null,
      approvedAt: null,
      decidedAt: null,
      suspendedAt: null,
      revokedAt: null,
      expiresAt: null,
      createdAt: null,
      updatedAt: null,
    };

    const requestedMutation: RelationshipStateMutationResult = {
      ok: true,
      previousState: 'NONE',
      relationship: {
        id: 'relationship-1',
        supplierOrgId: SUPPLIER_ORG_A,
        buyerOrgId: BUYER_ORG_A,
        state: 'REQUESTED',
        requestedAt: new Date('2026-06-01T00:00:00.000Z'),
        approvedAt: null,
        decidedAt: null,
        suspendedAt: null,
        revokedAt: null,
        expiresAt: null,
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      },
    };

    const storage: RelationshipAllowlistStorage = {
      getRelationshipOrNone: vi.fn(async () => noneSnapshot),
      requestRelationshipAccess: vi.fn(async () => requestedMutation),
      approveRelationship: vi.fn(),
      rejectRelationship: vi.fn(),
      blockRelationship: vi.fn(),
      revokeRelationship: vi.fn(),
      suspendRelationship: vi.fn(),
    };

    const service = createRelationshipAllowlistService({ storage });
    await service.requestSupplierAccess({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: BUYER_ORG_A,
    });

    expect(storage.getRelationshipOrNone).toHaveBeenCalledTimes(1);
    expect(storage.requestRelationshipAccess).toHaveBeenCalledTimes(1);
  });

  it('requires supplier and buyer org for supplier decisions', async () => {
    const { service } = createHarness();

    const missingSupplier = await service.approveBuyerRelationship({
      supplierOrgId: '',
      buyerOrgId: BUYER_ORG_A,
    });
    const missingBuyer = await service.approveBuyerRelationship({
      supplierOrgId: SUPPLIER_ORG_A,
      buyerOrgId: '',
    });

    expect(missingSupplier.ok).toBe(false);
    expect(missingBuyer.ok).toBe(false);
  });
});
