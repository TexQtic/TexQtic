/**
 * G-022 Audit Factory Helpers
 *
 * Pre-typed AuditEntry builders for all G-022 escalation events.
 * Each factory produces a fully-typed AuditEntry ready for writeAuditLog().
 *
 * Guarantee (D-022):
 *   These helpers do NOT call writeAuditLog themselves — the caller is responsible
 *   for passing the result to writeAuditLog() WITHIN the same Prisma transaction
 *   as the corresponding escalation_events INSERT.
 *
 * Audit events:
 *   ESCALATION_CREATED   — root escalation event created
 *   ESCALATION_UPGRADED  — severity upgrade chain inserted
 *   ESCALATION_RESOLVED  — escalation resolved (RESOLVED status row inserted)
 *   ESCALATION_OVERRIDDEN — escalation overridden (D-022-D, OVERRIDDEN status row)
 */

import type { AuditEntry, AuditRealm, ActorType } from '../lib/auditLog.js';

// ─── Shared payload shape ──────────────────────────────────────────────────────

type EscalationAuditBase = {
  realm: AuditRealm;
  tenantId: string;
  actorType: ActorType;
  actorId: string | null;
  orgId: string;
  entityType: string;
  entityId: string;
  escalationId: string;
};

// ─── Factory: ESCALATION_CREATED ──────────────────────────────────────────────

export type EscalationCreatedAuditParams = EscalationAuditBase & {
  severityLevel: number;
  source: string;
  reason: string;
};

export function createEscalationCreatedAudit(
  params: EscalationCreatedAuditParams,
): AuditEntry {
  return {
    realm:     params.realm,
    tenantId:  params.tenantId,
    actorType: params.actorType,
    actorId:   params.actorId,
    action:    'ESCALATION_CREATED',
    entity:    'escalation_event',
    entityId:  params.escalationId,
    metadataJson: {
      orgId:         params.orgId,
      entityType:    params.entityType,
      entityId:      params.entityId,
      severityLevel: params.severityLevel,
      source:        params.source,
      reason:        params.reason,
      escalationId:  params.escalationId,
    },
  };
}

// ─── Factory: ESCALATION_UPGRADED ────────────────────────────────────────────

export type EscalationUpgradedAuditParams = EscalationAuditBase & {
  parentEscalationId: string;
  previousSeverity: number;
  newSeverity: number;
  reason: string;
};

export function createEscalationUpgradedAudit(
  params: EscalationUpgradedAuditParams,
): AuditEntry {
  return {
    realm:     params.realm,
    tenantId:  params.tenantId,
    actorType: params.actorType,
    actorId:   params.actorId,
    action:    'ESCALATION_UPGRADED',
    entity:    'escalation_event',
    entityId:  params.escalationId,
    metadataJson: {
      orgId:              params.orgId,
      entityType:         params.entityType,
      entityId:           params.entityId,
      parentEscalationId: params.parentEscalationId,
      previousSeverity:   params.previousSeverity,
      newSeverity:        params.newSeverity,
      reason:             params.reason,
      newEscalationId:    params.escalationId,
    },
  };
}

// ─── Factory: ESCALATION_RESOLVED ────────────────────────────────────────────

export type EscalationResolvedAuditParams = EscalationAuditBase & {
  originalEscalationId: string;
  resolvedByPrincipal: string;
  reason: string;
};

export function createEscalationResolvedAudit(
  params: EscalationResolvedAuditParams,
): AuditEntry {
  return {
    realm:     params.realm,
    tenantId:  params.tenantId,
    actorType: params.actorType,
    actorId:   params.actorId,
    action:    'ESCALATION_RESOLVED',
    entity:    'escalation_event',
    entityId:  params.escalationId,
    metadataJson: {
      orgId:               params.orgId,
      entityType:          params.entityType,
      entityId:            params.entityId,
      originalId:          params.originalEscalationId,
      resolutionEscId:     params.escalationId,
      resolvedByPrincipal: params.resolvedByPrincipal,
      reason:              params.reason,
    },
  };
}

// ─── Factory: ESCALATION_OVERRIDDEN ──────────────────────────────────────────

export type EscalationOverriddenAuditParams = EscalationAuditBase & {
  originalEscalationId: string;
  resolvedByPrincipal: string;
  reason: string;
};

/**
 * D-022-D: Override path audit entry.
 * The caller MUST write this in the same Prisma transaction as the OVERRIDDEN row INSERT.
 * No partial-write is permitted — audit without escalation row or vice-versa is a bug.
 */
export function createEscalationOverriddenAudit(
  params: EscalationOverriddenAuditParams,
): AuditEntry {
  return {
    realm:     params.realm,
    tenantId:  params.tenantId,
    actorType: params.actorType,
    actorId:   params.actorId,
    action:    'ESCALATION_OVERRIDDEN',
    entity:    'escalation_event',
    entityId:  params.escalationId,
    metadataJson: {
      orgId:               params.orgId,
      entityType:          params.entityType,
      entityId:            params.entityId,
      originalId:          params.originalEscalationId,
      overrideEscId:       params.escalationId,
      resolvedByPrincipal: params.resolvedByPrincipal,
      reason:              params.reason,
    },
  };
}

// ─── G-017 Trade Audit Factories ─────────────────────────────────────────────

/**
 * G-017 Day 3: Typed audit entry builders for trade domain actions.
 * Callers must pass the result to writeAuditLog() in the SAME Prisma tx
 * as the corresponding trade mutation.
 */

export type TradeAuditBase = {
  realm: AuditRealm;
  tenantId: string;
  actorType: ActorType;
  actorId: string | null;
  tradeId: string;
};

// ─── TRADE_CREATED ────────────────────────────────────────────────────────────

export type TradeCreatedAuditParams = TradeAuditBase & {
  tradeReference: string;
  grossAmount: number;
  currency: string;
  reason: string;
};

export function createTradeCreatedAudit(params: TradeCreatedAuditParams): AuditEntry {
  return {
    realm:     params.realm,
    tenantId:  params.tenantId,
    actorType: params.actorType,
    actorId:   params.actorId,
    action:    'TRADE_CREATED',
    entity:    'trade',
    entityId:  params.tradeId,
    metadataJson: {
      tradeId:        params.tradeId,
      tradeReference: params.tradeReference,
      grossAmount:    params.grossAmount,
      currency:       params.currency,
      reason:         params.reason,
    },
  };
}

// ─── TRADE_TRANSITION_APPLIED ─────────────────────────────────────────────────

export type TradeTransitionAppliedAuditParams = TradeAuditBase & {
  fromStateKey: string;
  toStateKey: string;
  transitionId?: string;
  reason: string;
};

export function createTradeTransitionAppliedAudit(
  params: TradeTransitionAppliedAuditParams,
): AuditEntry {
  return {
    realm:     params.realm,
    tenantId:  params.tenantId,
    actorType: params.actorType,
    actorId:   params.actorId,
    action:    'TRADE_TRANSITION_APPLIED',
    entity:    'trade',
    entityId:  params.tradeId,
    metadataJson: {
      tradeId:      params.tradeId,
      fromStateKey: params.fromStateKey,
      toStateKey:   params.toStateKey,
      transitionId: params.transitionId ?? null,
      reason:       params.reason,
    },
  };
}

// ─── TRADE_TRANSITION_PENDING ─────────────────────────────────────────────────

export type TradeTransitionPendingAuditParams = TradeAuditBase & {
  fromStateKey: string;
  toStateKey: string;
  requiredActors: string[];
  reason: string;
};

export function createTradeTransitionPendingAudit(
  params: TradeTransitionPendingAuditParams,
): AuditEntry {
  return {
    realm:     params.realm,
    tenantId:  params.tenantId,
    actorType: params.actorType,
    actorId:   params.actorId,
    action:    'TRADE_TRANSITION_PENDING',
    entity:    'trade',
    entityId:  params.tradeId,
    metadataJson: {
      tradeId:        params.tradeId,
      fromStateKey:   params.fromStateKey,
      toStateKey:     params.toStateKey,
      requiredActors: params.requiredActors,
      reason:         params.reason,
    },
  };
}

// ─── TRADE_TRANSITION_REJECTED ────────────────────────────────────────────────

export type TradeTransitionRejectedAuditParams = TradeAuditBase & {
  toStateKey: string;
  errorCode: string;
  errorMessage: string;
  reason: string;
};

export function createTradeTransitionRejectedAudit(
  params: TradeTransitionRejectedAuditParams,
): AuditEntry {
  return {
    realm:     params.realm,
    tenantId:  params.tenantId,
    actorType: params.actorType,
    actorId:   params.actorId,
    action:    'TRADE_TRANSITION_REJECTED',
    entity:    'trade',
    entityId:  params.tradeId,
    metadataJson: {
      tradeId:      params.tradeId,
      toStateKey:   params.toStateKey,
      errorCode:    params.errorCode,
      errorMessage: params.errorMessage,
      reason:       params.reason,
    },
  };
}

// ─── G-023 AI Reasoning Audit Data Builders ──────────────────────────────────

/**
 * G-023: AI audit data shape for direct Prisma auditLog.create() calls.
 *
 * These builders produce a data object that includes `reasoningLogId` for the
 * FK column added in the G-023 migration. They are used ONLY in AI routes
 * (ai.ts) which call tx.auditLog.create() directly rather than writeAuditLog(),
 * because writeAuditLog() pre-dates G-023 and does not carry the FK field.
 *
 * Invariant (G-023):
 *   The reasoning_log row MUST be created FIRST in the same Prisma transaction,
 *   and its id passed as `reasoningLogId` before calling tx.auditLog.create().
 *   No partial-write is permitted.
 */
export type AiReasoningAuditData = {
  realm: 'TENANT';
  tenantId: string;
  actorType: ActorType;
  actorId: string | null;
  action: string;
  entity: 'ai';
  entityId: null;
  metadataJson: Record<string, unknown>;
  reasoningLogId: string;
};

export type AiInsightsReasoningAuditParams = {
  tenantId: string;
  userId: string | null;
  model: string;
  tokensUsed: number;
  costEstimateUSD: number;
  monthKey: string;
  requestId?: string;
  tenantType?: string;
  experience?: string;
  reasoningLogId: string;
};

export function buildAiInsightsReasoningAudit(
  params: AiInsightsReasoningAuditParams,
): AiReasoningAuditData {
  return {
    realm:     'TENANT',
    tenantId:  params.tenantId,
    actorType: params.userId ? 'USER' : 'SYSTEM',
    actorId:   params.userId,
    action:    'AI_INSIGHTS',
    entity:    'ai',
    entityId:  null,
    metadataJson: {
      model:             params.model,
      tokensUsed:        params.tokensUsed,
      costEstimateUSD:   params.costEstimateUSD,
      monthKey:          params.monthKey,
      requestId:         params.requestId,
      tenantType:        params.tenantType,
      experience:        params.experience,
      reasoningLogId:    params.reasoningLogId,
      timestamp:         new Date().toISOString(),
    },
    reasoningLogId: params.reasoningLogId,
  };
}

export type AiNegotiationReasoningAuditParams = {
  tenantId: string;
  userId: string | null;
  model: string;
  tokensUsed: number;
  costEstimateUSD: number;
  monthKey: string;
  requestId?: string;
  productName?: string;
  targetPrice?: number;
  quantity?: number;
  reasoningLogId: string;
};

export function buildAiNegotiationReasoningAudit(
  params: AiNegotiationReasoningAuditParams,
): AiReasoningAuditData {
  return {
    realm:     'TENANT',
    tenantId:  params.tenantId,
    actorType: params.userId ? 'USER' : 'SYSTEM',
    actorId:   params.userId,
    action:    'AI_NEGOTIATION_ADVICE',
    entity:    'ai',
    entityId:  null,
    metadataJson: {
      model:           params.model,
      tokensUsed:      params.tokensUsed,
      costEstimateUSD: params.costEstimateUSD,
      monthKey:        params.monthKey,
      requestId:       params.requestId,
      productName:     params.productName,
      targetPrice:     params.targetPrice,
      quantity:        params.quantity,
      reasoningLogId:  params.reasoningLogId,
      timestamp:       new Date().toISOString(),
    },
    reasoningLogId: params.reasoningLogId,
  };
}
