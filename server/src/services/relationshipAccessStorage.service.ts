/**
 * TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001 — Slice B
 * Persistent relationship storage and deterministic state management.
 *
 * No route integration, no PDP/catalog/price/RFQ runtime enforcement,
 * and no public leakage of internal reason or metadata.
 */

import { Prisma, type BuyerSupplierRelationship } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import type {
  PersistedRelationshipState,
  RelationshipState,
  RelationshipStateMutationResult,
  RelationshipStateSnapshot,
  RelationshipStateTransitionInput,
  RelationshipStateTransitionOptions,
  RelationshipStorageErrorCode,
} from './relationshipAccess.types.js';

export interface RelationshipStorageDbClient {
  buyerSupplierRelationship: {
    findUnique(
      args: Prisma.BuyerSupplierRelationshipFindUniqueArgs,
    ): Promise<BuyerSupplierRelationship | null>;
    upsert(
      args: Prisma.BuyerSupplierRelationshipUpsertArgs,
    ): Promise<BuyerSupplierRelationship>;
  };
}

const PERSISTED_RELATIONSHIP_STATES: readonly PersistedRelationshipState[] = [
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'BLOCKED',
  'SUSPENDED',
  'EXPIRED',
  'REVOKED',
] as const;

function normalizeOrgId(orgId: string | null | undefined): string | null {
  if (typeof orgId !== 'string') {
    return null;
  }

  const trimmed = orgId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isPersistedRelationshipState(
  state: unknown,
): state is PersistedRelationshipState {
  return PERSISTED_RELATIONSHIP_STATES.includes(
    state as PersistedRelationshipState,
  );
}

function parseOptionalDate(
  value: Date | string | null | undefined,
): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function tupleWhere(supplierOrgId: string, buyerOrgId: string) {
  return {
    supplierOrgId_buyerOrgId: {
      supplierOrgId,
      buyerOrgId,
    },
  } satisfies Prisma.BuyerSupplierRelationshipWhereUniqueInput;
}

function toRelationshipStateSnapshot(
  relationship: BuyerSupplierRelationship | null,
  supplierOrgId: string,
  buyerOrgId: string,
): RelationshipStateSnapshot {
  if (!relationship) {
    return {
      id: null,
      supplierOrgId,
      buyerOrgId,
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
  }

  return {
    id: relationship.id,
    supplierOrgId: relationship.supplierOrgId,
    buyerOrgId: relationship.buyerOrgId,
    state: isPersistedRelationshipState(relationship.state)
      ? relationship.state
      : 'NONE',
    requestedAt: relationship.requestedAt,
    approvedAt: relationship.approvedAt,
    decidedAt: relationship.decidedAt,
    suspendedAt: relationship.suspendedAt,
    revokedAt: relationship.revokedAt,
    expiresAt: relationship.expiresAt,
    createdAt: relationship.createdAt,
    updatedAt: relationship.updatedAt,
  };
}

export function isRelationshipTransitionAllowed(
  currentState: RelationshipState,
  nextState: PersistedRelationshipState,
  options: RelationshipStateTransitionOptions = {},
): boolean {
  if (currentState === nextState) {
    return true;
  }

  switch (currentState) {
    case 'NONE':
      return nextState === 'REQUESTED';
    case 'REQUESTED':
      return (
        nextState === 'APPROVED' ||
        nextState === 'REJECTED' ||
        nextState === 'BLOCKED'
      );
    case 'APPROVED':
      return (
        nextState === 'REVOKED' ||
        nextState === 'SUSPENDED' ||
        nextState === 'EXPIRED'
      );
    case 'SUSPENDED':
      return nextState === 'APPROVED';
    case 'REJECTED':
    case 'REVOKED':
    case 'EXPIRED':
      return options.allowReapply === true && nextState === 'REQUESTED';
    case 'BLOCKED':
      return false;
    default:
      return false;
  }
}

function buildWriteData(
  existing: BuyerSupplierRelationship | null,
  input: RelationshipStateTransitionInput,
  now: Date,
): Prisma.BuyerSupplierRelationshipUncheckedCreateInput {
  const expiresAt = parseOptionalDate(input.expiresAt);
  const internalReason = input.internalReason?.trim() || null;
  const metadataJson = input.metadata
    ? (input.metadata as Prisma.InputJsonValue)
    : Prisma.DbNull;

  const base: Prisma.BuyerSupplierRelationshipUncheckedCreateInput = {
    supplierOrgId: input.supplierOrgId,
    buyerOrgId: input.buyerOrgId,
    state: input.nextState,
    requestedAt: existing?.requestedAt ?? null,
    approvedAt: existing?.approvedAt ?? null,
    decidedAt: existing?.decidedAt ?? null,
    suspendedAt: existing?.suspendedAt ?? null,
    revokedAt: existing?.revokedAt ?? null,
    expiresAt: existing?.expiresAt ?? null,
    internalReason,
    metadataJson,
  };

  switch (input.nextState) {
    case 'REQUESTED':
      return {
        ...base,
        requestedAt: now,
        approvedAt: null,
        decidedAt: null,
        suspendedAt: null,
        revokedAt: null,
        expiresAt,
      };
    case 'APPROVED':
      return {
        ...base,
        requestedAt: existing?.requestedAt ?? now,
        approvedAt: now,
        decidedAt: now,
        suspendedAt: null,
        expiresAt,
      };
    case 'REJECTED':
      return {
        ...base,
        requestedAt: existing?.requestedAt ?? now,
        approvedAt: null,
        decidedAt: now,
        suspendedAt: null,
        revokedAt: null,
        expiresAt: null,
      };
    case 'BLOCKED':
      return {
        ...base,
        requestedAt: existing?.requestedAt ?? now,
        approvedAt: null,
        decidedAt: now,
        suspendedAt: null,
        revokedAt: null,
        expiresAt: null,
      };
    case 'SUSPENDED':
      return {
        ...base,
        suspendedAt: now,
      };
    case 'EXPIRED':
      return {
        ...base,
        expiresAt: expiresAt ?? now,
      };
    case 'REVOKED':
      return {
        ...base,
        revokedAt: now,
        decidedAt: now,
      };
  }
}

function storageFailure(
  error: RelationshipStorageErrorCode,
  currentState: RelationshipState,
): RelationshipStateMutationResult {
  return {
    ok: false,
    error,
    currentState,
  };
}

export function createRelationshipAccessStorageService(
  db: RelationshipStorageDbClient = prisma,
) {
  async function findRelationship(
    supplierOrgId: string,
    buyerOrgId: string,
  ): Promise<BuyerSupplierRelationship | null> {
    return db.buyerSupplierRelationship.findUnique({
      where: tupleWhere(supplierOrgId, buyerOrgId),
    });
  }

  async function getRelationshipOrNone(
    supplierOrgId: string,
    buyerOrgId: string,
  ): Promise<RelationshipStateSnapshot> {
    const normalizedSupplierOrgId = normalizeOrgId(supplierOrgId);
    const normalizedBuyerOrgId = normalizeOrgId(buyerOrgId);

    if (!normalizedSupplierOrgId || !normalizedBuyerOrgId) {
      return {
        id: null,
        supplierOrgId: normalizedSupplierOrgId ?? '',
        buyerOrgId: normalizedBuyerOrgId ?? '',
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
    }

    const relationship = await findRelationship(
      normalizedSupplierOrgId,
      normalizedBuyerOrgId,
    );

    return toRelationshipStateSnapshot(
      relationship,
      normalizedSupplierOrgId,
      normalizedBuyerOrgId,
    );
  }

  async function getRelationshipState(
    supplierOrgId: string,
    buyerOrgId: string,
  ): Promise<RelationshipState> {
    const relationship = await getRelationshipOrNone(supplierOrgId, buyerOrgId);
    return relationship.state;
  }

  async function createOrUpdateRelationshipState(
    input: RelationshipStateTransitionInput,
    options: RelationshipStateTransitionOptions = {},
  ): Promise<RelationshipStateMutationResult> {
    const supplierOrgId = normalizeOrgId(input.supplierOrgId);
    if (!supplierOrgId) {
      return storageFailure('SUPPLIER_ORG_REQUIRED', 'NONE');
    }

    const buyerOrgId = normalizeOrgId(input.buyerOrgId);
    if (!buyerOrgId) {
      return storageFailure('BUYER_ORG_REQUIRED', 'NONE');
    }

    if (!isPersistedRelationshipState(input.nextState)) {
      return storageFailure('INVALID_RELATIONSHIP_STATE', 'NONE');
    }

    const existing = await findRelationship(supplierOrgId, buyerOrgId);
    const currentState = existing
      ? isPersistedRelationshipState(existing.state)
        ? existing.state
        : 'NONE'
      : 'NONE';

    if (existing && !isPersistedRelationshipState(existing.state)) {
      return storageFailure('INVALID_RELATIONSHIP_STATE', currentState);
    }

    if (
      currentState === 'BLOCKED' &&
      input.nextState === 'REQUESTED'
    ) {
      return storageFailure('RELATIONSHIP_BLOCKED', currentState);
    }

    if (
      !isRelationshipTransitionAllowed(
        currentState,
        input.nextState,
        options,
      )
    ) {
      return storageFailure('INVALID_RELATIONSHIP_TRANSITION', currentState);
    }

    if (existing && currentState === input.nextState) {
      return {
        ok: true,
        previousState: currentState,
        relationship: toRelationshipStateSnapshot(existing, supplierOrgId, buyerOrgId),
      };
    }

    const now = options.now ?? new Date();
    const data = buildWriteData(
      existing,
      {
        ...input,
        supplierOrgId,
        buyerOrgId,
      },
      now,
    );

    try {
      const relationship = await db.buyerSupplierRelationship.upsert({
        where: tupleWhere(supplierOrgId, buyerOrgId),
        create: data,
        update: data,
      });

      return {
        ok: true,
        previousState: currentState,
        relationship: toRelationshipStateSnapshot(
          relationship,
          supplierOrgId,
          buyerOrgId,
        ),
      };
    } catch {
      return storageFailure('STORAGE_ERROR', currentState);
    }
  }

  async function requestRelationshipAccess(
    input: Omit<RelationshipStateTransitionInput, 'nextState'>,
    options: RelationshipStateTransitionOptions = {},
  ) {
    return createOrUpdateRelationshipState(
      {
        ...input,
        nextState: 'REQUESTED',
      },
      options,
    );
  }

  async function approveRelationship(
    input: Omit<RelationshipStateTransitionInput, 'nextState'>,
    options: RelationshipStateTransitionOptions = {},
  ) {
    return createOrUpdateRelationshipState(
      {
        ...input,
        nextState: 'APPROVED',
      },
      options,
    );
  }

  async function rejectRelationship(
    input: Omit<RelationshipStateTransitionInput, 'nextState'>,
    options: RelationshipStateTransitionOptions = {},
  ) {
    return createOrUpdateRelationshipState(
      {
        ...input,
        nextState: 'REJECTED',
      },
      options,
    );
  }

  async function blockRelationship(
    input: Omit<RelationshipStateTransitionInput, 'nextState'>,
    options: RelationshipStateTransitionOptions = {},
  ) {
    return createOrUpdateRelationshipState(
      {
        ...input,
        nextState: 'BLOCKED',
      },
      options,
    );
  }

  async function revokeRelationship(
    input: Omit<RelationshipStateTransitionInput, 'nextState'>,
    options: RelationshipStateTransitionOptions = {},
  ) {
    return createOrUpdateRelationshipState(
      {
        ...input,
        nextState: 'REVOKED',
      },
      options,
    );
  }

  async function suspendRelationship(
    input: Omit<RelationshipStateTransitionInput, 'nextState'>,
    options: RelationshipStateTransitionOptions = {},
  ) {
    return createOrUpdateRelationshipState(
      {
        ...input,
        nextState: 'SUSPENDED',
      },
      options,
    );
  }

  async function expireRelationship(
    input: Omit<RelationshipStateTransitionInput, 'nextState'>,
    options: RelationshipStateTransitionOptions = {},
  ) {
    return createOrUpdateRelationshipState(
      {
        ...input,
        nextState: 'EXPIRED',
      },
      options,
    );
  }

  return {
    getRelationshipState,
    getRelationshipOrNone,
    createOrUpdateRelationshipState,
    requestRelationshipAccess,
    approveRelationship,
    rejectRelationship,
    blockRelationship,
    revokeRelationship,
    suspendRelationship,
    expireRelationship,
  };
}

const relationshipAccessStorageService = createRelationshipAccessStorageService();

export const getRelationshipState =
  relationshipAccessStorageService.getRelationshipState;
export const getRelationshipOrNone =
  relationshipAccessStorageService.getRelationshipOrNone;
export const createOrUpdateRelationshipState =
  relationshipAccessStorageService.createOrUpdateRelationshipState;
export const requestRelationshipAccess =
  relationshipAccessStorageService.requestRelationshipAccess;
export const approveRelationship =
  relationshipAccessStorageService.approveRelationship;
export const rejectRelationship =
  relationshipAccessStorageService.rejectRelationship;
export const blockRelationship =
  relationshipAccessStorageService.blockRelationship;
export const revokeRelationship =
  relationshipAccessStorageService.revokeRelationship;
export const suspendRelationship =
  relationshipAccessStorageService.suspendRelationship;
export const expireRelationship =
  relationshipAccessStorageService.expireRelationship;
