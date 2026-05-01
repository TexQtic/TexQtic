/**
 * TECS-DPP-PASSPORT-NETWORK-014 — Trade Linkage Foundation
 *
 * Service helpers for the dpp_trade_links table.
 *
 * All functions operate within a withDbContext transaction (Prisma.$transaction).
 * org_id is ALWAYS derived from the authenticated dbContext — never from caller input.
 *
 * ORDERS REALITY NOTE (TECS-DPP-PASSPORT-NETWORK-010-DESIGN-v1.md §8.2):
 *   Orders in TexQtic use tenantId → tenants (not org_id → organizations).
 *   DPP uses org_id → organizations. These are DIFFERENT domain boundaries.
 *   Therefore: NO FK to orders, rfqs, or any marketplace table.
 *   source_table + source_id is a generic tenant-private soft reference only.
 *   Order validation is future-gated pending explicit Paresh approval.
 *
 * VISIBILITY RULES:
 *   PRIVATE           — tenant-only; never surfaced publicly
 *   AUTHENTICATED_BUYER — future-gated; tenant can store, no buyer route in this slice
 *   PUBLIC_COUNT      — future public surfaces may count it, but NEVER expose source IDs
 *
 * Public privacy: sourceId, orderId, rfqId, invoiceId, buyerOrgId, and pricing
 * must NEVER be exposed on public routes. This is enforced at the route layer.
 */

import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Approved link type values — constrained by DB CHECK. */
export const DPP_TRADE_LINK_TYPES = [
  'RFQ',
  'ORDER',
  'INVOICE',
  'SHIPMENT',
  'BUYER_ACCEPTANCE',
  'DISPATCH_PROOF',
  'QC_REFERENCE',
  'PAYMENT_REFERENCE',
  'OTHER',
] as const;

export type DppTradeLinkType = (typeof DPP_TRADE_LINK_TYPES)[number];

/** Approved visibility values — constrained by DB CHECK. */
export const DPP_TRADE_LINK_VISIBILITY_VALUES = [
  'PRIVATE',
  'AUTHENTICATED_BUYER',
  'PUBLIC_COUNT',
] as const;

export type DppTradeLinkVisibility = (typeof DPP_TRADE_LINK_VISIBILITY_VALUES)[number];

/**
 * Conservative allowlist of source_table values that are safe for tenant-side
 * soft-references. Blocks SQL-injection-like strings at the application layer
 * in addition to the DB regex CHECK constraint.
 */
export const DPP_TRADE_LINK_SOURCE_TABLE_ALLOWLIST = [
  'orders',
  'rfqs',
  'rfq_supplier_responses',
  'shipments',
  'invoices',
  'trades',
  'escrow_accounts',
  'dpp_evidence_items',
] as const;

export type DppTradeLinkSourceTable = (typeof DPP_TRADE_LINK_SOURCE_TABLE_ALLOWLIST)[number];

// ─── DB row shape returned by $queryRaw ──────────────────────────────────────

export interface DppTradeLinkRow {
  id: string;
  org_id: string;
  node_id: string;
  link_type: string;
  source_table: string | null;
  source_id: string | null;
  external_reference: string | null;
  title: string | null;
  visibility: string;
  linked_at: Date;
  created_at: Date;
  updated_at: Date;
}

// ─── DTO shape for tenant API responses ──────────────────────────────────────

export interface DppTradeLinkDto {
  id: string;
  nodeId: string;
  linkType: string;
  sourceTable: string | null;
  sourceId: string | null;
  externalReference: string | null;
  title: string | null;
  visibility: string;
  linkedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Input shape for creating a trade link ───────────────────────────────────

export interface CreateDppTradeLinkInput {
  linkType: DppTradeLinkType;
  visibility?: DppTradeLinkVisibility;
  sourceTable?: string | null;
  sourceId?: string | null;
  externalReference?: string | null;
  title?: string | null;
  linkedAt?: Date | null;
}

// ─── DTO mapper ──────────────────────────────────────────────────────────────

/**
 * Maps a raw DB row to the tenant-facing DTO.
 * Deliberately includes sourceId/sourceTable because the TENANT owns them.
 * Public routes must NOT call this — they must never serialize sourceId.
 */
export function toDppTradeLinkDto(row: DppTradeLinkRow): DppTradeLinkDto {
  return {
    id: row.id,
    nodeId: row.node_id,
    linkType: row.link_type,
    sourceTable: row.source_table,
    sourceId: row.source_id,
    externalReference: row.external_reference,
    title: row.title,
    visibility: row.visibility,
    linkedAt: row.linked_at instanceof Date ? row.linked_at.toISOString() : String(row.linked_at),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

// ─── Node ownership check ─────────────────────────────────────────────────────

/**
 * Verifies that the traceability node exists and belongs to the given org.
 * Used within withDbContext — RLS enforces additional org_id scoping.
 *
 * Returns true if the node belongs to orgId; false otherwise.
 * Throws on DB errors.
 */
export async function assertTradeLinkNodeBelongsToOrg(
  tx: PrismaClient,
  nodeId: string,
  orgId: string,
): Promise<boolean> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id
    FROM traceability_nodes
    WHERE id = ${nodeId}::uuid
      AND org_id = ${orgId}::uuid
    LIMIT 1
  `;
  return rows.length > 0;
}

// ─── Source table/ID validation ──────────────────────────────────────────────

/**
 * Validates that a sourceTable value is from the conservative application-layer
 * allowlist. This is a defense-in-depth check — the DB also has a regex CHECK.
 *
 * Returns null if valid; an error message string if invalid.
 */
export function validateDppTradeLinkSource(
  sourceTable: string | null | undefined,
  sourceId: string | null | undefined,
): string | null {
  if (sourceTable != null) {
    const isAllowed = (DPP_TRADE_LINK_SOURCE_TABLE_ALLOWLIST as readonly string[]).includes(
      sourceTable,
    );
    if (!isAllowed) {
      return `source_table '${sourceTable}' is not in the allowed list`;
    }
    // If sourceTable is provided, sourceId must be a valid UUID (if provided)
    if (sourceId != null) {
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!UUID_RE.test(sourceId)) {
        return 'source_id must be a valid UUID when provided';
      }
    }
  }
  return null;
}

// ─── List trade links ─────────────────────────────────────────────────────────

/**
 * Returns all dpp_trade_links for the given node, scoped to the current org.
 * RLS enforces org_id isolation — only rows matching app.current_org_id() are returned.
 *
 * No visibility filter is applied at list time: tenant may see all visibility levels.
 * Public routes must NOT call this function.
 */
export async function listDppTradeLinksForNode(
  tx: PrismaClient,
  nodeId: string,
): Promise<DppTradeLinkRow[]> {
  return tx.$queryRaw<DppTradeLinkRow[]>`
    SELECT
      id,
      org_id,
      node_id,
      link_type,
      source_table,
      source_id,
      external_reference,
      title,
      visibility,
      linked_at,
      created_at,
      updated_at
    FROM dpp_trade_links
    WHERE node_id = ${nodeId}::uuid
    ORDER BY linked_at DESC, created_at DESC
  `;
}

// ─── Create trade link ────────────────────────────────────────────────────────

/**
 * Inserts a new dpp_trade_links row.
 * org_id comes from the RLS context (app.current_org_id()) — not the caller's input.
 *
 * If a duplicate hard-referenced trade link exists (same org/node/type/source),
 * Postgres will raise a unique constraint violation — the caller should handle it.
 */
export async function createDppTradeLink(
  tx: PrismaClient,
  orgId: string,
  nodeId: string,
  input: CreateDppTradeLinkInput,
): Promise<DppTradeLinkRow> {
  const visibility = input.visibility ?? 'PRIVATE';
  const linkedAt = input.linkedAt ?? new Date();

  const rows = await tx.$queryRaw<DppTradeLinkRow[]>`
    INSERT INTO dpp_trade_links (
      org_id,
      node_id,
      link_type,
      source_table,
      source_id,
      external_reference,
      title,
      visibility,
      linked_at
    )
    VALUES (
      ${orgId}::uuid,
      ${nodeId}::uuid,
      ${input.linkType},
      ${input.sourceTable ?? null},
      ${input.sourceId ? Prisma.sql`${input.sourceId}::uuid` : Prisma.sql`NULL`},
      ${input.externalReference ?? null},
      ${input.title ?? null},
      ${visibility},
      ${linkedAt}
    )
    RETURNING
      id,
      org_id,
      node_id,
      link_type,
      source_table,
      source_id,
      external_reference,
      title,
      visibility,
      linked_at,
      created_at,
      updated_at
  `;

  if (!rows[0]) {
    throw new Error('[D9] dpp_trade_links INSERT returned no rows');
  }
  return rows[0];
}
