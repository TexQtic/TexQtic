/**
 * TECS-DPP-PASSPORT-NETWORK-012 — DPP Evidence Vault Foundation
 *
 * Service helpers for the dpp_evidence_items table.
 *
 * All functions operate within a withDbContext transaction (Prisma.$transaction).
 * org_id is ALWAYS derived from the authenticated dbContext — never from caller input.
 *
 * Evidence items are independent of the AI extraction pipeline:
 *   - No FK to document_extraction_drafts
 *   - source_table / source_id provide soft-reference linkage only
 *   - document_url is included in tenant DTOs; never exposed on public routes
 */

import type { PrismaClient } from '@prisma/client';

// ─── Allowed enum values ──────────────────────────────────────────────────────

export const DPP_EVIDENCE_TYPES = [
  'CERTIFICATE',
  'TEST_REPORT',
  'QC_REPORT',
  'INVOICE',
  'PURCHASE_ORDER',
  'DISPATCH_PROOF',
  'BUYER_ACCEPTANCE',
  'AUDIT_DOCUMENT',
  'EXTRACTION_OUTPUT',
  'HUMAN_REVIEWED_CLAIM',
  'SUSTAINABILITY_DECLARATION',
] as const;

export type DppEvidenceType = (typeof DPP_EVIDENCE_TYPES)[number];

export const DPP_EVIDENCE_VISIBILITY_VALUES = [
  'PRIVATE',
  'AUTHENTICATED_BUYER',
  'PUBLIC_SUMMARY',
  'AUDITOR_FUTURE',
] as const;

export type DppEvidenceVisibility = (typeof DPP_EVIDENCE_VISIBILITY_VALUES)[number];

export const DPP_EVIDENCE_REVIEW_STATES = [
  'PENDING',
  'HUMAN_REVIEWED',
  'REJECTED',
  'EXPIRED',
] as const;

export type DppEvidenceReviewState = (typeof DPP_EVIDENCE_REVIEW_STATES)[number];

// ─── SOURCE_TABLE allowlist — prevents arbitrary table names in the DB ────────
// Soft-reference only; no FK enforced at DB level.
const ALLOWED_SOURCE_TABLES = new Set([
  'dpp_evidence_claims',
  'document_extraction_drafts',
  'certifications',
  'catalog_items',
  'traceability_nodes',
  'invoices',
  'purchase_orders',
]);

export function isAllowedSourceTable(table: string): boolean {
  return ALLOWED_SOURCE_TABLES.has(table);
}

// ─── DB row shape returned by $queryRaw ──────────────────────────────────────

export interface DppEvidenceItemRow {
  id: string;
  org_id: string;
  node_id: string;
  evidence_type: string;
  title: string;
  source_table: string | null;
  source_id: string | null;
  document_url: string | null;
  issuing_body: string | null;
  reference_number: string | null;
  issued_at: Date | null;
  expires_at: Date | null;
  visibility: string;
  review_state: string;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// ─── DTO shape for tenant API responses ──────────────────────────────────────

export interface DppEvidenceItemDto {
  id: string;
  orgId: string;
  nodeId: string;
  evidenceType: DppEvidenceType;
  title: string;
  sourceTable: string | null;
  sourceId: string | null;
  documentUrl: string | null;
  issuingBody: string | null;
  referenceNumber: string | null;
  issuedAt: Date | null;
  expiresAt: Date | null;
  visibility: DppEvidenceVisibility;
  reviewState: DppEvidenceReviewState;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Map a DB row to the tenant API DTO. document_url is included for tenant callers. */
export function toDppEvidenceItemDto(row: DppEvidenceItemRow): DppEvidenceItemDto {
  return {
    id: row.id,
    orgId: row.org_id,
    nodeId: row.node_id,
    evidenceType: row.evidence_type as DppEvidenceType,
    title: row.title,
    sourceTable: row.source_table,
    sourceId: row.source_id,
    documentUrl: row.document_url,
    issuingBody: row.issuing_body,
    referenceNumber: row.reference_number,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    visibility: row.visibility as DppEvidenceVisibility,
    reviewState: row.review_state as DppEvidenceReviewState,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Input shape for createDppEvidenceItem ───────────────────────────────────

export interface CreateDppEvidenceItemInput {
  evidenceType: DppEvidenceType;
  title: string;
  visibility?: DppEvidenceVisibility;
  reviewState?: DppEvidenceReviewState;
  sourceTable?: string | null;
  sourceId?: string | null;
  documentUrl?: string | null;
  issuingBody?: string | null;
  referenceNumber?: string | null;
  issuedAt?: Date | null;
  expiresAt?: Date | null;
}

// ─── Service functions ────────────────────────────────────────────────────────

type TxClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

/**
 * Assert the given node exists and belongs to the given org.
 * Uses RLS-scoped dpp_snapshot_products_v1 view (same pattern as certifications route).
 *
 * Returns true if found, false if not found / access denied.
 */
export async function assertNodeBelongsToOrg(
  tx: TxClient,
  nodeId: string,
  _orgId: string,
): Promise<boolean> {
  // RLS already enforces org_id scoping via app.current_org_id(); no need to pass orgId explicitly.
  const rows = await tx.$queryRaw<Array<{ node_id: string }>>`
    SELECT node_id FROM dpp_snapshot_products_v1
    WHERE node_id = ${nodeId}::uuid
    LIMIT 1
  `;
  return rows.length > 0;
}

/**
 * Create a new dpp_evidence_item row within the current RLS-scoped transaction.
 * orgId is required as the explicit WHERE value; RLS INSERT policy enforces the same.
 */
export async function createDppEvidenceItem(
  tx: TxClient,
  orgId: string,
  nodeId: string,
  input: CreateDppEvidenceItemInput,
): Promise<DppEvidenceItemRow> {
  const visibility = input.visibility ?? 'PRIVATE';
  const reviewState = input.reviewState ?? 'PENDING';

  const rows = await tx.$queryRaw<DppEvidenceItemRow[]>`
    INSERT INTO dpp_evidence_items
      (org_id, node_id, evidence_type, title,
       source_table, source_id, document_url,
       issuing_body, reference_number,
       issued_at, expires_at,
       visibility, review_state)
    VALUES
      (${orgId}::uuid, ${nodeId}::uuid, ${input.evidenceType}, ${input.title},
       ${input.sourceTable ?? null}, ${input.sourceId ? input.sourceId + '::uuid' : null}::uuid,
       ${input.documentUrl ?? null},
       ${input.issuingBody ?? null}, ${input.referenceNumber ?? null},
       ${input.issuedAt ?? null}, ${input.expiresAt ?? null},
       ${visibility}, ${reviewState})
    RETURNING
      id, org_id, node_id, evidence_type, title,
      source_table, source_id, document_url,
      issuing_body, reference_number,
      issued_at, expires_at,
      visibility, review_state,
      reviewed_by, reviewed_at,
      created_at, updated_at
  `;
  return rows[0];
}

/**
 * List all dpp_evidence_items for a node, ordered by created_at ASC.
 * RLS enforces org_id scoping.
 */
export async function listDppEvidenceItemsForNode(
  tx: TxClient,
  nodeId: string,
): Promise<DppEvidenceItemRow[]> {
  return tx.$queryRaw<DppEvidenceItemRow[]>`
    SELECT
      id, org_id, node_id, evidence_type, title,
      source_table, source_id, document_url,
      issuing_body, reference_number,
      issued_at, expires_at,
      visibility, review_state,
      reviewed_by, reviewed_at,
      created_at, updated_at
    FROM dpp_evidence_items
    WHERE node_id = ${nodeId}::uuid
    ORDER BY created_at ASC
  `;
}
