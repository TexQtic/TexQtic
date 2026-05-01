/**
 * TECS-DPP-PASSPORT-NETWORK-013 — Product Passport Data Depth
 *
 * Service helpers for the dpp_product_details table.
 *
 * All functions operate within a withDbContext transaction (Prisma.$transaction).
 * org_id is ALWAYS derived from the authenticated dbContext — never from caller input.
 *
 * Material composition is stored as JSONB array of { material, percentage } objects.
 * Maximum 10 entries (DG-06 decision: minimal v1 schema — name + percent only).
 *
 * PUT semantics: upsertDppProductDetailsForNode performs INSERT ... ON CONFLICT DO UPDATE.
 * Role guard (ADMIN/OWNER) must be enforced at the route layer — not here.
 *
 * product_photo_evidence_item_id: nullable FK to dpp_evidence_items. Allowed to be
 * supplied on upsert; FK is enforced at DB level with ON DELETE SET NULL.
 */

import type { PrismaClient } from '@prisma/client';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum number of material composition entries per product detail row (DG-06). */
export const DPP_MATERIAL_MAX_ENTRIES = 10;

/** Maximum total percentage across all material composition entries. */
export const DPP_MATERIAL_TOTAL_MAX_PERCENT = 100;

// ─── Material composition ─────────────────────────────────────────────────────

export interface MaterialCompositionItem {
  material: string;
  percentage: number;
}

// ─── DB row shape returned by $queryRaw ──────────────────────────────────────

export interface DppProductDetailsRow {
  id: string;
  org_id: string;
  node_id: string;
  sku: string | null;
  style_code: string | null;
  batch_lot_number: string | null;
  product_description: string | null;
  season_or_model_year: string | null;
  facility_name: string | null;
  country_of_origin: string | null;
  material_composition: unknown; // JSONB from Postgres
  recycled_content_percent: number | null;
  organic_content_percent: number | null;
  dye_finish_category: string | null;
  restricted_substances_declared: boolean | null;
  product_photo_evidence_item_id: string | null;
  created_at: Date;
  updated_at: Date;
}

// ─── DTO shape for tenant API responses ──────────────────────────────────────

export interface DppProductDetailsDto {
  id: string;
  orgId: string;
  nodeId: string;
  sku: string | null;
  styleCode: string | null;
  batchLotNumber: string | null;
  productDescription: string | null;
  seasonOrModelYear: string | null;
  facilityName: string | null;
  countryOfOrigin: string | null;
  materialComposition: MaterialCompositionItem[] | null;
  recycledContentPercent: number | null;
  organicContentPercent: number | null;
  dyeFinishCategory: string | null;
  restrictedSubstancesDeclared: boolean | null;
  productPhotoEvidenceItemId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Parse a JSONB value from Postgres into a typed array (or null). */
function parseMaterialComposition(raw: unknown): MaterialCompositionItem[] | null {
  if (raw === null || raw === undefined) return null;
  if (!Array.isArray(raw)) return null;
  // Filter to only well-shaped entries; silently drop malformed items at read time.
  const result: MaterialCompositionItem[] = [];
  for (const item of raw) {
    if (
      item !== null &&
      typeof item === 'object' &&
      typeof (item as Record<string, unknown>).material === 'string' &&
      typeof (item as Record<string, unknown>).percentage === 'number'
    ) {
      result.push({
        material: (item as Record<string, unknown>).material as string,
        percentage: (item as Record<string, unknown>).percentage as number,
      });
    }
  }
  return result.length > 0 ? result : null;
}

/** Map a DB row to the tenant API DTO. */
export function toDppProductDetailsDto(row: DppProductDetailsRow): DppProductDetailsDto {
  return {
    id: row.id,
    orgId: row.org_id,
    nodeId: row.node_id,
    sku: row.sku,
    styleCode: row.style_code,
    batchLotNumber: row.batch_lot_number,
    productDescription: row.product_description,
    seasonOrModelYear: row.season_or_model_year,
    facilityName: row.facility_name,
    countryOfOrigin: row.country_of_origin,
    materialComposition: parseMaterialComposition(row.material_composition),
    recycledContentPercent:
      row.recycled_content_percent !== null ? Number(row.recycled_content_percent) : null,
    organicContentPercent:
      row.organic_content_percent !== null ? Number(row.organic_content_percent) : null,
    dyeFinishCategory: row.dye_finish_category,
    restrictedSubstancesDeclared: row.restricted_substances_declared,
    productPhotoEvidenceItemId: row.product_photo_evidence_item_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Input shape for upsertDppProductDetailsForNode ──────────────────────────

export interface UpsertDppProductDetailsInput {
  sku?: string | null;
  styleCode?: string | null;
  batchLotNumber?: string | null;
  productDescription?: string | null;
  seasonOrModelYear?: string | null;
  facilityName?: string | null;
  countryOfOrigin?: string | null;
  materialComposition?: MaterialCompositionItem[] | null;
  recycledContentPercent?: number | null;
  organicContentPercent?: number | null;
  dyeFinishCategory?: string | null;
  restrictedSubstancesDeclared?: boolean | null;
  productPhotoEvidenceItemId?: string | null;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface MaterialCompositionValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a material composition array.
 * - Max DPP_MATERIAL_MAX_ENTRIES entries.
 * - Each percentage must be 0–100.
 * - Each material name must be non-empty string.
 * - Total percentage across entries must not exceed 100.
 */
export function validateMaterialComposition(
  items: MaterialCompositionItem[],
): MaterialCompositionValidationResult {
  if (items.length > DPP_MATERIAL_MAX_ENTRIES) {
    return {
      valid: false,
      error: `material_composition may have at most ${DPP_MATERIAL_MAX_ENTRIES} entries`,
    };
  }
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.material || typeof item.material !== 'string' || item.material.trim() === '') {
      return { valid: false, error: `material_composition[${i}].material must be a non-empty string` };
    }
    if (typeof item.percentage !== 'number' || item.percentage < 0 || item.percentage > 100) {
      return {
        valid: false,
        error: `material_composition[${i}].percentage must be a number between 0 and 100`,
      };
    }
    total += item.percentage;
  }
  if (total > DPP_MATERIAL_TOTAL_MAX_PERCENT) {
    return {
      valid: false,
      error: `material_composition total percentage (${total.toFixed(2)}) exceeds 100`,
    };
  }
  return { valid: true };
}

// ─── Service functions ────────────────────────────────────────────────────────

type TxClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

/**
 * Fetch product details for a node (RLS-scoped). Returns null if not found.
 */
export async function getDppProductDetailsForNode(
  tx: TxClient,
  nodeId: string,
): Promise<DppProductDetailsRow | null> {
  const rows = await tx.$queryRaw<DppProductDetailsRow[]>`
    SELECT
      id, org_id, node_id, sku, style_code, batch_lot_number, product_description,
      season_or_model_year, facility_name, country_of_origin, material_composition,
      recycled_content_percent, organic_content_percent, dye_finish_category,
      restricted_substances_declared, product_photo_evidence_item_id,
      created_at, updated_at
    FROM dpp_product_details
    WHERE node_id = ${nodeId}::uuid
    LIMIT 1
  `;
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Upsert product details for a node within the current RLS-scoped transaction.
 * org_id is explicit for INSERT; RLS enforces the same constraint for both ops.
 * updated_at is refreshed on every UPDATE via the DB trigger.
 */
export async function upsertDppProductDetailsForNode(
  tx: TxClient,
  orgId: string,
  nodeId: string,
  input: UpsertDppProductDetailsInput,
): Promise<DppProductDetailsRow> {
  const materialCompositionJson =
    input.materialComposition !== undefined
      ? JSON.stringify(input.materialComposition ?? null)
      : null;

  const rows = await tx.$queryRaw<DppProductDetailsRow[]>`
    INSERT INTO dpp_product_details
      (org_id, node_id, sku, style_code, batch_lot_number, product_description,
       season_or_model_year, facility_name, country_of_origin,
       material_composition,
       recycled_content_percent, organic_content_percent,
       dye_finish_category, restricted_substances_declared,
       product_photo_evidence_item_id)
    VALUES
      (${orgId}::uuid, ${nodeId}::uuid,
       ${input.sku ?? null},
       ${input.styleCode ?? null},
       ${input.batchLotNumber ?? null},
       ${input.productDescription ?? null},
       ${input.seasonOrModelYear ?? null},
       ${input.facilityName ?? null},
       ${input.countryOfOrigin ?? null},
       ${materialCompositionJson}::jsonb,
       ${input.recycledContentPercent ?? null},
       ${input.organicContentPercent ?? null},
       ${input.dyeFinishCategory ?? null},
       ${input.restrictedSubstancesDeclared ?? null},
       ${input.productPhotoEvidenceItemId ?? null}::uuid)
    ON CONFLICT (org_id, node_id) DO UPDATE SET
      sku                             = EXCLUDED.sku,
      style_code                      = EXCLUDED.style_code,
      batch_lot_number                = EXCLUDED.batch_lot_number,
      product_description             = EXCLUDED.product_description,
      season_or_model_year            = EXCLUDED.season_or_model_year,
      facility_name                   = EXCLUDED.facility_name,
      country_of_origin               = EXCLUDED.country_of_origin,
      material_composition            = EXCLUDED.material_composition,
      recycled_content_percent        = EXCLUDED.recycled_content_percent,
      organic_content_percent         = EXCLUDED.organic_content_percent,
      dye_finish_category             = EXCLUDED.dye_finish_category,
      restricted_substances_declared  = EXCLUDED.restricted_substances_declared,
      product_photo_evidence_item_id  = EXCLUDED.product_photo_evidence_item_id,
      updated_at                      = now()
    RETURNING
      id, org_id, node_id, sku, style_code, batch_lot_number, product_description,
      season_or_model_year, facility_name, country_of_origin, material_composition,
      recycled_content_percent, organic_content_percent, dye_finish_category,
      restricted_substances_declared, product_photo_evidence_item_id,
      created_at, updated_at
  `;
  return rows[0];
}
