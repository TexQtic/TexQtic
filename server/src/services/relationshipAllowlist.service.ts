/**
 * TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001 — Slice C
 * Supplier allowlist and approval service built on Slice B storage.
 *
 * This service is internal-only and route-agnostic.
 */

import type {
  RelationshipAllowlistErrorCode,
  RelationshipAllowlistAuditEvent,
  RelationshipAllowlistOperationResult,
  RelationshipAllowlistPublicStatus,
  RelationshipAuditActorType,
  RelationshipState,
  RelationshipStateMutationResult,
  RelationshipStateSnapshot,
  RelationshipStateTransitionInput,
  RelationshipStateTransitionOptions,
} from './relationshipAccess.types.js';
import {
  createRelationshipAccessStorageService,
} from './relationshipAccessStorage.service.js';

export interface RelationshipAllowlistStorage {
  getRelationshipOrNone(
    supplierOrgId: string,
    buyerOrgId: string,
  ): Promise<RelationshipStateSnapshot>;
  requestRelationshipAccess(
    input: Omit<RelationshipStateTransitionInput, 'nextState'>,
    options?: RelationshipStateTransitionOptions,
  ): Promise<RelationshipStateMutationResult>;
  approveRelationship(
    input: Omit<RelationshipStateTransitionInput, 'nextState'>,
    options?: RelationshipStateTransitionOptions,
  ): Promise<RelationshipStateMutationResult>;
  rejectRelationship(
    input: Omit<RelationshipStateTransitionInput, 'nextState'>,
    options?: RelationshipStateTransitionOptions,
  ): Promise<RelationshipStateMutationResult>;
  blockRelationship(
    input: Omit<RelationshipStateTransitionInput, 'nextState'>,
    options?: RelationshipStateTransitionOptions,
  ): Promise<RelationshipStateMutationResult>;
  revokeRelationship(
    input: Omit<RelationshipStateTransitionInput, 'nextState'>,
    options?: RelationshipStateTransitionOptions,
  ): Promise<RelationshipStateMutationResult>;
  suspendRelationship(
    input: Omit<RelationshipStateTransitionInput, 'nextState'>,
    options?: RelationshipStateTransitionOptions,
  ): Promise<RelationshipStateMutationResult>;
}

export interface RelationshipAllowlistAuditSink {
  record(event: RelationshipAllowlistAuditEvent): Promise<void> | void;
}

export interface RelationshipAccessRequestInput {
  supplierOrgId: string;
  buyerOrgId: string;
  actorUserId?: string | null;
  internalReason?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface SupplierRelationshipDecisionInput {
  supplierOrgId: string;
  buyerOrgId: string;
  actorUserId?: string | null;
  internalReason?: string | null;
  metadata?: Record<string, unknown> | null;
  expiresAt?: Date | string | null;
}

export interface SupplierRelationshipDecisionOptions {
  allowReapply?: boolean;
  allowRenewExpired?: boolean;
  now?: Date;
}

function normalizeOrgId(orgId: string | null | undefined): string | null {
  if (typeof orgId !== 'string') {
    return null;
  }

  const trimmed = orgId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toPublicStatus(
  relationship: RelationshipStateSnapshot,
): RelationshipAllowlistPublicStatus {
  const state = relationship.state;

  let clientSafeReason: RelationshipAllowlistPublicStatus['clientSafeReason'];
  let safeMessageKey: string;
  let canRequestAccess = false;

  switch (state) {
    case 'APPROVED':
      clientSafeReason = 'ACCESS_ALLOWED';
      safeMessageKey = 'relationship.approved';
      break;
    case 'REQUESTED':
      clientSafeReason = 'ACCESS_PENDING';
      safeMessageKey = 'relationship.requested';
      break;
    case 'NONE':
      clientSafeReason = 'REQUEST_ACCESS';
      safeMessageKey = 'relationship.request_access';
      canRequestAccess = true;
      break;
    case 'REJECTED':
    case 'REVOKED':
    case 'EXPIRED':
      clientSafeReason = 'REQUEST_ACCESS';
      safeMessageKey = 'relationship.reapply_allowed';
      canRequestAccess = true;
      break;
    case 'BLOCKED':
    case 'SUSPENDED':
      clientSafeReason = 'ACCESS_DENIED';
      safeMessageKey = 'relationship.access_denied';
      break;
    default:
      clientSafeReason = 'ACCESS_DENIED';
      safeMessageKey = 'relationship.access_denied';
      break;
  }

  return {
    supplierOrgId: relationship.supplierOrgId,
    buyerOrgId: relationship.buyerOrgId,
    state,
    requestedAt: relationship.requestedAt,
    approvedAt: relationship.approvedAt,
    expiresAt: relationship.expiresAt,
    canRequestAccess,
    clientSafeReason,
    safeMessageKey,
  };
}

function failure(
  error: RelationshipAllowlistErrorCode,
  snapshot: RelationshipStateSnapshot,
): RelationshipAllowlistOperationResult {
  return {
    ok: false,
    error,
    currentState: snapshot.state,
    publicStatus: toPublicStatus(snapshot),
  };
}

function success(
  previousState: RelationshipState,
  relationship: RelationshipStateSnapshot,
  wasNoop: boolean,
): RelationshipAllowlistOperationResult {
  return {
    ok: true,
    wasNoop,
    previousState,
    relationship,
    publicStatus: toPublicStatus(relationship),
  };
}

async function maybeRecordAudit(
  auditSink: RelationshipAllowlistAuditSink | null,
  input: {
    previousState: RelationshipState;
    relationship: RelationshipStateSnapshot;
    actorType: RelationshipAuditActorType;
    actorUserId: string | null;
    internalReason: string | null;
    occurredAt: Date;
  },
) {
  if (!auditSink) {
    return;
  }

  if (input.previousState === input.relationship.state) {
    return;
  }

  await auditSink.record({
    supplierOrgId: input.relationship.supplierOrgId,
    buyerOrgId: input.relationship.buyerOrgId,
    previousState: input.previousState,
    newState: input.relationship.state,
    actorType: input.actorType,
    actorUserId: input.actorUserId,
    internalReason: input.internalReason,
    occurredAt: input.occurredAt,
  });
}

function toStoragePayload(
  input: RelationshipAccessRequestInput | SupplierRelationshipDecisionInput,
) {
  return {
    supplierOrgId: input.supplierOrgId,
    buyerOrgId: input.buyerOrgId,
    internalReason: input.internalReason,
    metadata: input.metadata,
  };
}

export function createRelationshipAllowlistService(options: {
  storage?: RelationshipAllowlistStorage;
  auditSink?: RelationshipAllowlistAuditSink;
} = {}) {
  const storage = options.storage ?? createRelationshipAccessStorageService();
  const auditSink = options.auditSink ?? null;

  async function getSupplierBuyerRelationship(
    supplierOrgId: string,
    buyerOrgId: string,
  ) {
    const normalizedSupplierOrgId = normalizeOrgId(supplierOrgId);
    const normalizedBuyerOrgId = normalizeOrgId(buyerOrgId);

    if (!normalizedSupplierOrgId || !normalizedBuyerOrgId) {
      const snapshot: RelationshipStateSnapshot = {
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

      return {
        relationship: snapshot,
        publicStatus: toPublicStatus(snapshot),
      };
    }

    const relationship = await storage.getRelationshipOrNone(
      normalizedSupplierOrgId,
      normalizedBuyerOrgId,
    );

    return {
      relationship,
      publicStatus: toPublicStatus(relationship),
    };
  }

  async function requestSupplierAccess(
    input: RelationshipAccessRequestInput,
    options: SupplierRelationshipDecisionOptions = {},
  ): Promise<RelationshipAllowlistOperationResult> {
    const current = await getSupplierBuyerRelationship(
      input.supplierOrgId,
      input.buyerOrgId,
    );

    if (current.relationship.state === 'APPROVED') {
      return success('APPROVED', current.relationship, true);
    }

    if (current.relationship.state === 'REQUESTED') {
      return success('REQUESTED', current.relationship, true);
    }

    if (current.relationship.state === 'BLOCKED') {
      return failure('RELATIONSHIP_BLOCKED', current.relationship);
    }

    const result = await storage.requestRelationshipAccess(
      toStoragePayload(input),
      {
        allowReapply: options.allowReapply,
        now: options.now,
      },
    );

    if (!result.ok) {
      return failure(result.error, current.relationship);
    }

    await maybeRecordAudit(auditSink, {
      previousState: result.previousState,
      relationship: result.relationship,
      actorType: 'BUYER',
      actorUserId: input.actorUserId ?? null,
      internalReason: input.internalReason ?? null,
      occurredAt: options.now ?? new Date(),
    });

    return success(result.previousState, result.relationship, false);
  }

  async function approveBuyerRelationship(
    input: SupplierRelationshipDecisionInput,
    options: SupplierRelationshipDecisionOptions = {},
  ): Promise<RelationshipAllowlistOperationResult> {
    const current = await getSupplierBuyerRelationship(
      input.supplierOrgId,
      input.buyerOrgId,
    );

    if (current.relationship.state === 'APPROVED') {
      return success('APPROVED', current.relationship, true);
    }

    if (current.relationship.state === 'BLOCKED') {
      return failure('RELATIONSHIP_BLOCKED', current.relationship);
    }

    if (current.relationship.state === 'NONE') {
      return failure('INVALID_RELATIONSHIP_TRANSITION', current.relationship);
    }

    if (current.relationship.state === 'EXPIRED') {
      if (!options.allowRenewExpired) {
        return failure('INVALID_RELATIONSHIP_TRANSITION', current.relationship);
      }

      const reapplyResult = await storage.requestRelationshipAccess(
        toStoragePayload(input),
        {
          allowReapply: true,
          now: options.now,
        },
      );

      if (!reapplyResult.ok) {
        return failure(reapplyResult.error, current.relationship);
      }
    }

    if (
      current.relationship.state === 'REJECTED' ||
      current.relationship.state === 'REVOKED'
    ) {
      const reapplyResult = await storage.requestRelationshipAccess(
        toStoragePayload(input),
        {
          allowReapply: true,
          now: options.now,
        },
      );

      if (!reapplyResult.ok) {
        return failure(reapplyResult.error, current.relationship);
      }
    }

    const approved = await storage.approveRelationship(
      {
        ...toStoragePayload(input),
        expiresAt: input.expiresAt,
      },
      {
        now: options.now,
      },
    );

    if (!approved.ok) {
      return failure(approved.error, current.relationship);
    }

    await maybeRecordAudit(auditSink, {
      previousState: current.relationship.state,
      relationship: approved.relationship,
      actorType: 'SUPPLIER',
      actorUserId: input.actorUserId ?? null,
      internalReason: input.internalReason ?? null,
      occurredAt: options.now ?? new Date(),
    });

    return success(current.relationship.state, approved.relationship, false);
  }

  async function rejectBuyerRelationship(
    input: SupplierRelationshipDecisionInput,
    options: SupplierRelationshipDecisionOptions = {},
  ): Promise<RelationshipAllowlistOperationResult> {
    const current = await getSupplierBuyerRelationship(
      input.supplierOrgId,
      input.buyerOrgId,
    );

    if (current.relationship.state === 'REJECTED') {
      return success('REJECTED', current.relationship, true);
    }

    if (current.relationship.state === 'REQUESTED') {
      const rejected = await storage.rejectRelationship(
        toStoragePayload(input),
        { now: options.now },
      );

      if (!rejected.ok) {
        return failure(rejected.error, current.relationship);
      }

      await maybeRecordAudit(auditSink, {
        previousState: current.relationship.state,
        relationship: rejected.relationship,
        actorType: 'SUPPLIER',
        actorUserId: input.actorUserId ?? null,
        internalReason: input.internalReason ?? null,
        occurredAt: options.now ?? new Date(),
      });

      return success(current.relationship.state, rejected.relationship, false);
    }

    return failure('INVALID_RELATIONSHIP_TRANSITION', current.relationship);
  }

  async function blockBuyerRelationship(
    input: SupplierRelationshipDecisionInput,
    options: SupplierRelationshipDecisionOptions = {},
  ): Promise<RelationshipAllowlistOperationResult> {
    const current = await getSupplierBuyerRelationship(
      input.supplierOrgId,
      input.buyerOrgId,
    );

    if (current.relationship.state === 'BLOCKED') {
      return success('BLOCKED', current.relationship, true);
    }

    const blocked = await storage.blockRelationship(
      toStoragePayload(input),
      { now: options.now },
    );

    if (!blocked.ok) {
      return failure(blocked.error, current.relationship);
    }

    await maybeRecordAudit(auditSink, {
      previousState: current.relationship.state,
      relationship: blocked.relationship,
      actorType: 'SUPPLIER',
      actorUserId: input.actorUserId ?? null,
      internalReason: input.internalReason ?? null,
      occurredAt: options.now ?? new Date(),
    });

    return success(current.relationship.state, blocked.relationship, false);
  }

  async function revokeBuyerRelationship(
    input: SupplierRelationshipDecisionInput,
    options: SupplierRelationshipDecisionOptions = {},
  ): Promise<RelationshipAllowlistOperationResult> {
    const current = await getSupplierBuyerRelationship(
      input.supplierOrgId,
      input.buyerOrgId,
    );

    if (current.relationship.state === 'REVOKED') {
      return success('REVOKED', current.relationship, true);
    }

    if (
      current.relationship.state !== 'APPROVED' &&
      current.relationship.state !== 'SUSPENDED'
    ) {
      return failure('INVALID_RELATIONSHIP_TRANSITION', current.relationship);
    }

    const revoked = await storage.revokeRelationship(
      toStoragePayload(input),
      { now: options.now },
    );

    if (!revoked.ok) {
      return failure(revoked.error, current.relationship);
    }

    await maybeRecordAudit(auditSink, {
      previousState: current.relationship.state,
      relationship: revoked.relationship,
      actorType: 'SUPPLIER',
      actorUserId: input.actorUserId ?? null,
      internalReason: input.internalReason ?? null,
      occurredAt: options.now ?? new Date(),
    });

    return success(current.relationship.state, revoked.relationship, false);
  }

  async function suspendBuyerRelationship(
    input: SupplierRelationshipDecisionInput,
    options: SupplierRelationshipDecisionOptions = {},
  ): Promise<RelationshipAllowlistOperationResult> {
    const current = await getSupplierBuyerRelationship(
      input.supplierOrgId,
      input.buyerOrgId,
    );

    if (current.relationship.state === 'SUSPENDED') {
      return success('SUSPENDED', current.relationship, true);
    }

    if (current.relationship.state !== 'APPROVED') {
      return failure('INVALID_RELATIONSHIP_TRANSITION', current.relationship);
    }

    const suspended = await storage.suspendRelationship(
      toStoragePayload(input),
      { now: options.now },
    );

    if (!suspended.ok) {
      return failure(suspended.error, current.relationship);
    }

    await maybeRecordAudit(auditSink, {
      previousState: current.relationship.state,
      relationship: suspended.relationship,
      actorType: 'SUPPLIER',
      actorUserId: input.actorUserId ?? null,
      internalReason: input.internalReason ?? null,
      occurredAt: options.now ?? new Date(),
    });

    return success(current.relationship.state, suspended.relationship, false);
  }

  async function resumeBuyerRelationship(
    input: SupplierRelationshipDecisionInput,
    options: SupplierRelationshipDecisionOptions = {},
  ): Promise<RelationshipAllowlistOperationResult> {
    const current = await getSupplierBuyerRelationship(
      input.supplierOrgId,
      input.buyerOrgId,
    );

    if (current.relationship.state === 'APPROVED') {
      return success('APPROVED', current.relationship, true);
    }

    if (current.relationship.state === 'BLOCKED') {
      return failure('RELATIONSHIP_BLOCKED', current.relationship);
    }

    if (current.relationship.state === 'EXPIRED') {
      if (!options.allowRenewExpired) {
        return failure('INVALID_RELATIONSHIP_TRANSITION', current.relationship);
      }

      const reapplyResult = await storage.requestRelationshipAccess(
        toStoragePayload(input),
        {
          allowReapply: true,
          now: options.now,
        },
      );

      if (!reapplyResult.ok) {
        return failure(reapplyResult.error, current.relationship);
      }
    } else if (current.relationship.state !== 'SUSPENDED') {
      return failure('INVALID_RELATIONSHIP_TRANSITION', current.relationship);
    }

    const resumed = await storage.approveRelationship(
      toStoragePayload(input),
      { now: options.now },
    );

    if (!resumed.ok) {
      return failure(resumed.error, current.relationship);
    }

    await maybeRecordAudit(auditSink, {
      previousState: current.relationship.state,
      relationship: resumed.relationship,
      actorType: 'SUPPLIER',
      actorUserId: input.actorUserId ?? null,
      internalReason: input.internalReason ?? null,
      occurredAt: options.now ?? new Date(),
    });

    return success(current.relationship.state, resumed.relationship, false);
  }

  return {
    getSupplierBuyerRelationship,
    requestSupplierAccess,
    approveBuyerRelationship,
    rejectBuyerRelationship,
    blockBuyerRelationship,
    revokeBuyerRelationship,
    suspendBuyerRelationship,
    resumeBuyerRelationship,
  };
}

const relationshipAllowlistService = createRelationshipAllowlistService();

export const getSupplierBuyerRelationship =
  relationshipAllowlistService.getSupplierBuyerRelationship;
export const requestSupplierAccess =
  relationshipAllowlistService.requestSupplierAccess;
export const approveBuyerRelationship =
  relationshipAllowlistService.approveBuyerRelationship;
export const rejectBuyerRelationship =
  relationshipAllowlistService.rejectBuyerRelationship;
export const blockBuyerRelationship =
  relationshipAllowlistService.blockBuyerRelationship;
export const revokeBuyerRelationship =
  relationshipAllowlistService.revokeBuyerRelationship;
export const suspendBuyerRelationship =
  relationshipAllowlistService.suspendBuyerRelationship;
export const resumeBuyerRelationship =
  relationshipAllowlistService.resumeBuyerRelationship;
