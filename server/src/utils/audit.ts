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
