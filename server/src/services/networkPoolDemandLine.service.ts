/**
 * NetworkPoolDemandLineService
 * TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-FOUNDATION-001
 *
 * Service foundation for Network Commerce Pool RFQ demand lines.
 *
 * D-017-A: ownerOrgId and userId are ALWAYS sourced from the JWT/dbContext — never from caller body.
 *
 * Authorized methods:
 *   createDemandLine        — create a DRAFT demand line on an owner-scoped pool
 *   updateDemandLine        — partially update an editable (DRAFT/ACTIVE) demand line
 *   listDemandLines         — paginated list of demand lines for an owner-scoped pool
 *   cancelDemandLine        — cancel a DRAFT/ACTIVE demand line
 *   lockDemandLinesForRfq   — lock all ACTIVE lines and capture a demand snapshot for RFQ issuance
 *
 * Design decisions:
 *   createDemandLine / updateDemandLine / listDemandLines / cancelDemandLine:
 *     TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-DECISION-RECORD-001
 *   lockDemandLinesForRfq:
 *     TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DECISION-RECORD-001
 */

import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

// ─── Error Classes ────────────────────────────────────────────────────────────

export class DemandLineNotFoundError extends Error {
  constructor(lineId: string) {
    super(`Demand line not found: ${lineId}`);
    this.name = 'DemandLineNotFoundError';
  }
}

export class DemandLineInvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DemandLineInvalidInputError';
  }
}

export class DemandLineInvalidStateError extends Error {
  constructor(currentStatus: string, allowedStatuses: string[]) {
    super(
      `Demand line status '${currentStatus}' does not permit this operation. ` +
        `Allowed statuses: [${allowedStatuses.join(', ')}]`,
    );
    this.name = 'DemandLineInvalidStateError';
  }
}

export class DemandLineDuplicateRefError extends Error {
  constructor(lineRef: string) {
    super(`Demand line ref '${lineRef}' (revisionNo=1) already exists in this pool`);
    this.name = 'DemandLineDuplicateRefError';
  }
}

/**
 * DemandLineForbiddenError — not thrown by service methods (non-leaking design).
 * Wrong-org line access maps to DemandLineNotFoundError to prevent existence disclosure.
 * Exported for potential future use in route-layer auth checks.
 */
export class DemandLineForbiddenError extends Error {
  constructor() {
    super('Access to this demand line is not permitted');
    this.name = 'DemandLineForbiddenError';
  }
}

export class DemandLinePoolNotFoundError extends Error {
  constructor(poolId: string) {
    super(`Network pool not found: ${poolId}`);
    this.name = 'DemandLinePoolNotFoundError';
  }
}

export class DemandLinePoolStateError extends Error {
  constructor(currentState: string, allowedStates: string[]) {
    super(
      `Pool state '${currentState}' does not permit demand line writes. ` +
        `Allowed pool states: [${allowedStates.join(', ')}]`,
    );
    this.name = 'DemandLinePoolStateError';
  }
}

/**
 * @deprecated No longer thrown by lockDemandLinesForRfq (schema is now deployed).
 * Retained because poolDemandLines route imports and maps this class to HTTP 422.
 * Remove in a future route-cleanup packet.
 */
export class DemandLineSnapshotBlockedError extends Error {
  constructor() {
    super(
      'Lock-for-RFQ is blocked: NetworkPoolDemandSnapshot schema does not exist. ' +
        'Open TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SNAPSHOT-SCHEMA-001 first.',
    );
    this.name = 'DemandLineSnapshotBlockedError';
  }
}

export class DemandLineNoActiveLinesError extends Error {
  constructor(poolId: string) {
    super(`No ACTIVE demand lines found for pool: ${poolId}`);
    this.name = 'DemandLineNoActiveLinesError';
  }
}

export class DemandLineSetChangedError extends Error {
  constructor() {
    super(
      'expected_line_ids did not match the current ACTIVE demand line set. ' +
        'The set changed between read and lock.',
    );
    this.name = 'DemandLineSetChangedError';
  }
}

export class DemandLineSnapshotConflictError extends Error {
  constructor() {
    super('Snapshot version or ref conflict — likely a concurrent lock attempt. Retry.');
    this.name = 'DemandLineSnapshotConflictError';
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const DEMAND_LINE_STATUS = {
  DRAFT:          'DRAFT',
  ACTIVE:         'ACTIVE',
  LOCKED_FOR_RFQ: 'LOCKED_FOR_RFQ',
  SUPERSEDED:     'SUPERSEDED',
  CANCELLED:      'CANCELLED',
} as const;

export const DEMAND_LINE_SOURCE_TYPE = {
  OWNER_DIRECT:       'OWNER_DIRECT',
  OWNER_NORMALIZED:   'OWNER_NORMALIZED',
  MEMBERSHIP_DERIVED: 'MEMBERSHIP_DERIVED',
} as const;

const EDITABLE_LINE_STATUSES:            string[] = [DEMAND_LINE_STATUS.DRAFT, DEMAND_LINE_STATUS.ACTIVE];
const CANCELLABLE_LINE_STATUSES:          string[] = [DEMAND_LINE_STATUS.DRAFT, DEMAND_LINE_STATUS.ACTIVE];
const POOL_STATES_ALLOWING_DEMAND_WRITES: string[] = ['DRAFT', 'OPEN', 'AGGREGATING'];

// ─── Input / Output Types ─────────────────────────────────────────────────────

export interface CreateDemandLineInput {
  pool_id:                          string;
  line_ref:                         string;
  commodity_category:               string;
  product_category?:                string | null;
  product_spec_summary?:            string | null;
  qty:                              number;
  qty_unit:                         string;
  quality_requirements_json?:       Record<string, unknown> | null;
  certification_requirements_json?: Record<string, unknown> | null;
  packaging_requirements_json?:     Record<string, unknown> | null;
  delivery_location?:               string | null;
  delivery_window_start?:           string | null;
  delivery_window_end?:             string | null;
  tolerance_pct?:                   number | null;
  priority?:                        number | null;
  source_type?:                     string;
}

export interface UpdateDemandLineInput {
  commodity_category?:              string;
  product_category?:                string | null;
  product_spec_summary?:            string | null;
  qty?:                             number;
  qty_unit?:                        string;
  quality_requirements_json?:       Record<string, unknown> | null;
  certification_requirements_json?: Record<string, unknown> | null;
  packaging_requirements_json?:     Record<string, unknown> | null;
  delivery_location?:               string | null;
  delivery_window_start?:           string | null;
  delivery_window_end?:             string | null;
  tolerance_pct?:                   number | null;
  priority?:                        number | null;
}

export interface DemandLineListQuery {
  limit?:              number;
  offset?:             number;
  status?:             string;
  commodity_category?: string;
  source_type?:        string;
}

/** Demand line record returned by all service methods. Excludes metadata_internal_json. */
export interface DemandLineRecord {
  id:                              string;
  owner_org_id:                    string;
  pool_id:                         string;
  line_ref:                        string;
  commodity_category:              string;
  product_category:                string | null;
  product_spec_summary:            string | null;
  qty:                             string;
  qty_unit:                        string;
  quality_requirements_json:       Prisma.JsonValue | null;
  certification_requirements_json: Prisma.JsonValue | null;
  packaging_requirements_json:     Prisma.JsonValue | null;
  delivery_location:               string | null;
  delivery_window_start:           string | null;
  delivery_window_end:             string | null;
  tolerance_pct:                   string | null;
  priority:                        number | null;
  status:                          string;
  source_type:                     string;
  source_membership_id:            string | null;
  normalized_from_member_input:    boolean;
  revision_no:                     number;
  supersedes_line_id:              string | null;
  created_at:                      string;
  updated_at:                      string;
  locked_at:                       string | null;
}

export interface DemandLineListPagination {
  limit:  number;
  offset: number;
  count:  number;
  total:  number;
}

export interface DemandLineListResult {
  items:      DemandLineRecord[];
  pagination: DemandLineListPagination;
}

export interface LockDemandLinesForRfqInput {
  pool_id:           string;
  captured_reason?:  string | null;
  expected_line_ids?: string[] | null;
}

/** Snapshot header returned by lockDemandLinesForRfq. Excludes metadata_internal_json and lines array. */
export interface DemandSnapshotRecord {
  id:                  string;
  owner_org_id:        string;
  pool_id:             string;
  snapshot_ref:        string;
  snapshot_version:    number;
  basis:               string;
  status:              string;
  captured_at:         string | null;
  captured_by_user_id: string | null;
  captured_reason:     string | null;
  line_count:          number;
  total_qty:           string | null;
  qty_unit:            string | null;
  created_at:          string;
  updated_at:          string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class NetworkPoolDemandLineService {
  constructor(private readonly db: PrismaClient) {}

  // ── Private helpers ─────────────────────────────────────────────────────────

  private toRecord(row: Record<string, unknown>): DemandLineRecord {
    return {
      id:                              String(row['id']),
      owner_org_id:                    String(row['ownerOrgId']),
      pool_id:                         String(row['poolId']),
      line_ref:                        String(row['lineRef']),
      commodity_category:              String(row['commodityCategory']),
      product_category:                row['productCategory'] != null ? String(row['productCategory']) : null,
      product_spec_summary:            row['productSpecSummary'] != null ? String(row['productSpecSummary']) : null,
      qty:                             String(row['qty']),
      qty_unit:                        String(row['qtyUnit']),
      quality_requirements_json:       row['qualityRequirementsJson'] != null
        ? (row['qualityRequirementsJson'] as Prisma.JsonValue) : null,
      certification_requirements_json: row['certificationRequirementsJson'] != null
        ? (row['certificationRequirementsJson'] as Prisma.JsonValue) : null,
      packaging_requirements_json:     row['packagingRequirementsJson'] != null
        ? (row['packagingRequirementsJson'] as Prisma.JsonValue) : null,
      delivery_location:               row['deliveryLocation'] != null ? String(row['deliveryLocation']) : null,
      delivery_window_start:           row['deliveryWindowStart'] != null
        ? (row['deliveryWindowStart'] as Date).toISOString() : null,
      delivery_window_end:             row['deliveryWindowEnd'] != null
        ? (row['deliveryWindowEnd'] as Date).toISOString() : null,
      tolerance_pct:                   row['tolerancePct'] != null ? String(row['tolerancePct']) : null,
      priority:                        row['priority'] != null ? Number(row['priority']) : null,
      status:                          String(row['status']),
      source_type:                     String(row['sourceType']),
      source_membership_id:            row['sourceMembershipId'] != null ? String(row['sourceMembershipId']) : null,
      normalized_from_member_input:    Boolean(row['normalizedFromMemberInput']),
      revision_no:                     Number(row['revisionNo']),
      supersedes_line_id:              row['supersedesLineId'] != null ? String(row['supersedesLineId']) : null,
      created_at:                      (row['createdAt'] as Date).toISOString(),
      updated_at:                      (row['updatedAt'] as Date).toISOString(),
      locked_at:                       row['lockedAt'] != null ? (row['lockedAt'] as Date).toISOString() : null,
    };
  }

  private normalizeListQuery(query: DemandLineListQuery): { limit: number; offset: number } {
    const limit  = query.limit  ?? 20;
    const offset = query.offset ?? 0;

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new DemandLineInvalidInputError('limit must be an integer between 1 and 100');
    }
    if (!Number.isInteger(offset) || offset < 0) {
      throw new DemandLineInvalidInputError('offset must be a non-negative integer');
    }

    return { limit, offset };
  }

  // ── createDemandLine ────────────────────────────────────────────────────────

  /**
   * Create a new DRAFT demand line on a pool owned by ownerOrgId.
   *
   * D-017-A: ownerOrgId from JWT/dbContext — not from input body.
   *
   * Guards:
   *   - required field validation (line_ref, commodity_category, qty > 0, qty_unit)
   *   - source_type must be one of OWNER_DIRECT | OWNER_NORMALIZED | MEMBERSHIP_DERIVED
   *   - delivery window ordering: start <= end when both provided
   *   - pool existence scoped to ownerOrgId → DemandLinePoolNotFoundError
   *   - pool state in DRAFT/OPEN/AGGREGATING → DemandLinePoolStateError
   *   - no duplicate lineRef at revisionNo=1 → DemandLineDuplicateRefError
   */
  async createDemandLine(
    ownerOrgId: string,
    _userId: string,
    input: CreateDemandLineInput,
  ): Promise<DemandLineRecord> {
    // ── Required field validation ────────────────────────────────────────────
    if (!input.pool_id || input.pool_id.trim() === '') {
      throw new DemandLineInvalidInputError('pool_id is required');
    }
    if (!input.line_ref || input.line_ref.trim() === '') {
      throw new DemandLineInvalidInputError('line_ref is required and must not be blank');
    }
    if (!input.commodity_category || input.commodity_category.trim() === '') {
      throw new DemandLineInvalidInputError('commodity_category is required and must not be blank');
    }
    if (typeof input.qty !== 'number' || !isFinite(input.qty) || input.qty <= 0) {
      throw new DemandLineInvalidInputError('qty must be a positive number');
    }
    if (!input.qty_unit || input.qty_unit.trim() === '') {
      throw new DemandLineInvalidInputError('qty_unit is required and must not be blank');
    }

    // ── Validate source_type ─────────────────────────────────────────────────
    const allowedSourceTypes = Object.values(DEMAND_LINE_SOURCE_TYPE) as string[];
    if (input.source_type != null && !allowedSourceTypes.includes(input.source_type)) {
      throw new DemandLineInvalidInputError(
        `source_type must be one of: ${allowedSourceTypes.join(', ')}`,
      );
    }

    // ── Validate delivery window ordering ─────────────────────────────────────
    if (input.delivery_window_start != null && input.delivery_window_end != null) {
      const start = new Date(input.delivery_window_start);
      const end   = new Date(input.delivery_window_end);
      if (start.getTime() > end.getTime()) {
        throw new DemandLineInvalidInputError(
          'delivery_window_start must be before or equal to delivery_window_end',
        );
      }
    }

    // ── Pool existence + state gate ──────────────────────────────────────────
    const pool = await this.db.networkPool.findFirst({
      where:   { id: input.pool_id, orgId: ownerOrgId },
      include: { lifecycleState: { select: { stateKey: true } } },
    });
    if (!pool) {
      throw new DemandLinePoolNotFoundError(input.pool_id);
    }
    const poolStateKey = pool.lifecycleState?.stateKey ?? '';
    if (!POOL_STATES_ALLOWING_DEMAND_WRITES.includes(poolStateKey)) {
      throw new DemandLinePoolStateError(poolStateKey, POOL_STATES_ALLOWING_DEMAND_WRITES);
    }

    // ── Duplicate lineRef guard (revisionNo=1) ─────────────────────────────
    const existing = await this.db.networkPoolDemandLine.findUnique({
      where: {
        poolId_lineRef_revisionNo: {
          poolId:    input.pool_id,
          lineRef:   input.line_ref.trim(),
          revisionNo: 1,
        },
      },
      select: { id: true },
    });
    if (existing) {
      throw new DemandLineDuplicateRefError(input.line_ref.trim());
    }

    // ── Create ───────────────────────────────────────────────────────────────
    const row = await this.db.networkPoolDemandLine.create({
      data: {
        id:                           randomUUID(),
        ownerOrgId,
        poolId:                       input.pool_id,
        lineRef:                      input.line_ref.trim(),
        commodityCategory:            input.commodity_category.trim(),
        productCategory:              input.product_category?.trim() ?? null,
        productSpecSummary:           input.product_spec_summary ?? null,
        qty:                          input.qty,
        qtyUnit:                      input.qty_unit.trim(),
        qualityRequirementsJson:      (input.quality_requirements_json ?? undefined) as Prisma.InputJsonValue | undefined,
        certificationRequirementsJson: (input.certification_requirements_json ?? undefined) as Prisma.InputJsonValue | undefined,
        packagingRequirementsJson:    (input.packaging_requirements_json ?? undefined) as Prisma.InputJsonValue | undefined,
        deliveryLocation:             input.delivery_location ?? null,
        deliveryWindowStart:          input.delivery_window_start ? new Date(input.delivery_window_start) : null,
        deliveryWindowEnd:            input.delivery_window_end  ? new Date(input.delivery_window_end)  : null,
        tolerancePct:                 input.tolerance_pct  ?? null,
        priority:                     input.priority       ?? null,
        status:                       DEMAND_LINE_STATUS.DRAFT,
        sourceType:                   input.source_type ?? DEMAND_LINE_SOURCE_TYPE.OWNER_DIRECT,
        sourceMembershipId:           null,
        normalizedFromMemberInput:    false,
        revisionNo:                   1,
        supersedesLineId:             null,
      },
    });

    return this.toRecord(row as unknown as Record<string, unknown>);
  }

  // ── updateDemandLine ────────────────────────────────────────────────────────

  /**
   * Partially update an editable (DRAFT/ACTIVE) demand line.
   *
   * Guards:
   *   - at least one allowed update field must be provided
   *   - line existence scoped to ownerOrgId (non-leaking: not-found for missing or wrong-org)
   *   - line status in DRAFT/ACTIVE → DemandLineInvalidStateError
   *   - pool state in DRAFT/OPEN/AGGREGATING → DemandLinePoolStateError
   *   - qty must be positive if provided
   *   - commodity_category and qty_unit must not be blank if provided
   *   - delivery window coherence against existing stored values if only one side is provided
   */
  async updateDemandLine(
    ownerOrgId: string,
    lineId: string,
    input: UpdateDemandLineInput,
  ): Promise<DemandLineRecord> {
    // ── At least one field must be provided ───────────────────────────────────
    const hasUpdate = [
      input.commodity_category,
      input.product_category,
      input.product_spec_summary,
      input.qty,
      input.qty_unit,
      input.quality_requirements_json,
      input.certification_requirements_json,
      input.packaging_requirements_json,
      input.delivery_location,
      input.delivery_window_start,
      input.delivery_window_end,
      input.tolerance_pct,
      input.priority,
    ].some((v) => v !== undefined);

    if (!hasUpdate) {
      throw new DemandLineInvalidInputError('At least one update field must be provided');
    }

    // ── Load line (scoped to ownerOrgId — non-leaking) ────────────────────────
    const line = await this.db.networkPoolDemandLine.findFirst({
      where: { id: lineId, ownerOrgId },
    });
    if (!line) {
      throw new DemandLineNotFoundError(lineId);
    }

    // ── Line status gate ──────────────────────────────────────────────────────
    const lineStatus = String(line.status);
    if (!EDITABLE_LINE_STATUSES.includes(lineStatus)) {
      throw new DemandLineInvalidStateError(lineStatus, EDITABLE_LINE_STATUSES);
    }

    // ── Pool state gate ───────────────────────────────────────────────────────
    const pool = await this.db.networkPool.findFirst({
      where:   { id: String(line.poolId), orgId: ownerOrgId },
      include: { lifecycleState: { select: { stateKey: true } } },
    });
    // Pool cannot be missing if line exists (CASCADE delete), but guard defensively.
    const poolStateKey = pool?.lifecycleState?.stateKey ?? '';
    if (!POOL_STATES_ALLOWING_DEMAND_WRITES.includes(poolStateKey)) {
      throw new DemandLinePoolStateError(poolStateKey, POOL_STATES_ALLOWING_DEMAND_WRITES);
    }

    // ── Field-level validation ────────────────────────────────────────────────
    if (input.qty !== undefined) {
      if (typeof input.qty !== 'number' || !isFinite(input.qty) || input.qty <= 0) {
        throw new DemandLineInvalidInputError('qty must be a positive number');
      }
    }
    if (input.commodity_category !== undefined && input.commodity_category.trim() === '') {
      throw new DemandLineInvalidInputError('commodity_category must not be blank');
    }
    if (input.qty_unit !== undefined && input.qty_unit.trim() === '') {
      throw new DemandLineInvalidInputError('qty_unit must not be blank');
    }

    // ── Delivery window coherence (partial update uses stored values for missing side) ──
    const newStart = input.delivery_window_start !== undefined
      ? (input.delivery_window_start ? new Date(input.delivery_window_start) : null)
      : (line.deliveryWindowStart ?? null);
    const newEnd = input.delivery_window_end !== undefined
      ? (input.delivery_window_end ? new Date(input.delivery_window_end) : null)
      : (line.deliveryWindowEnd ?? null);

    if (newStart != null && newEnd != null && newStart.getTime() > newEnd.getTime()) {
      throw new DemandLineInvalidInputError(
        'delivery_window_start must be before or equal to delivery_window_end',
      );
    }

    // ── Build update data (only include provided fields) ──────────────────────
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (input.commodity_category  !== undefined) updateData['commodityCategory']  = input.commodity_category.trim();
    if (input.product_category    !== undefined) updateData['productCategory']    = input.product_category;
    if (input.product_spec_summary !== undefined) updateData['productSpecSummary'] = input.product_spec_summary;
    if (input.qty                 !== undefined) updateData['qty']                = input.qty;
    if (input.qty_unit            !== undefined) updateData['qtyUnit']            = input.qty_unit.trim();
    if (input.delivery_location   !== undefined) updateData['deliveryLocation']   = input.delivery_location;
    if (input.delivery_window_start !== undefined) {
      updateData['deliveryWindowStart'] = input.delivery_window_start
        ? new Date(input.delivery_window_start) : null;
    }
    if (input.delivery_window_end !== undefined) {
      updateData['deliveryWindowEnd'] = input.delivery_window_end
        ? new Date(input.delivery_window_end) : null;
    }
    if (input.tolerance_pct !== undefined) updateData['tolerancePct'] = input.tolerance_pct;
    if (input.priority      !== undefined) updateData['priority']     = input.priority;

    // JSON nullable fields: explicit null → Prisma.DbNull (SQL NULL); value → cast to InputJsonValue
    if (input.quality_requirements_json !== undefined) {
      updateData['qualityRequirementsJson'] = input.quality_requirements_json === null
        ? Prisma.DbNull
        : (input.quality_requirements_json as Prisma.InputJsonValue);
    }
    if (input.certification_requirements_json !== undefined) {
      updateData['certificationRequirementsJson'] = input.certification_requirements_json === null
        ? Prisma.DbNull
        : (input.certification_requirements_json as Prisma.InputJsonValue);
    }
    if (input.packaging_requirements_json !== undefined) {
      updateData['packagingRequirementsJson'] = input.packaging_requirements_json === null
        ? Prisma.DbNull
        : (input.packaging_requirements_json as Prisma.InputJsonValue);
    }

    // ── Execute update ────────────────────────────────────────────────────────
    const updated = await this.db.networkPoolDemandLine.update({
      where: { id: lineId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data:  updateData as any,
    });

    return this.toRecord(updated as unknown as Record<string, unknown>);
  }

  // ── listDemandLines ─────────────────────────────────────────────────────────

  /**
   * Paginated list of demand lines for an owner-scoped pool.
   *
   * Decision 8: explicitly checks pool existence — never returns a silent empty list
   * for an unknown or wrong-org pool.
   *
   * Default pagination: limit=20, offset=0. Maximum limit=100.
   * Order: updatedAt DESC, id DESC.
   */
  async listDemandLines(
    ownerOrgId: string,
    poolId: string,
    query: DemandLineListQuery,
  ): Promise<DemandLineListResult> {
    if (!ownerOrgId || ownerOrgId.trim() === '') {
      throw new DemandLineInvalidInputError('ownerOrgId is required');
    }
    if (!poolId || poolId.trim() === '') {
      throw new DemandLineInvalidInputError('poolId is required');
    }

    const { limit, offset } = this.normalizeListQuery(query);

    // ── Explicit pool existence check (Decision 8) ────────────────────────────
    const pool = await this.db.networkPool.findFirst({
      where:  { id: poolId, orgId: ownerOrgId },
      select: { id: true },
    });
    if (!pool) {
      throw new DemandLinePoolNotFoundError(poolId);
    }

    // ── Build where clause ────────────────────────────────────────────────────
    const where: Record<string, unknown> = { poolId, ownerOrgId };
    if (query.status             != null) where['status']            = query.status;
    if (query.commodity_category != null) where['commodityCategory'] = query.commodity_category;
    if (query.source_type        != null) where['sourceType']        = query.source_type;

    // ── Execute count + findMany ──────────────────────────────────────────────
    const [items, total] = await Promise.all([
      this.db.networkPoolDemandLine.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take:    limit,
        skip:    offset,
      }),
      this.db.networkPoolDemandLine.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toRecord(item as unknown as Record<string, unknown>)),
      pagination: {
        limit,
        offset,
        count: items.length,
        total,
      },
    };
  }

  // ── cancelDemandLine ────────────────────────────────────────────────────────

  /**
   * Cancel a DRAFT or ACTIVE demand line.
   *
   * Non-leaking: wrong-org line access maps to DemandLineNotFoundError —
   * does not reveal that the line exists for another org.
   *
   * Pool state gate applies: pool must be in DRAFT/OPEN/AGGREGATING.
   */
  async cancelDemandLine(
    ownerOrgId: string,
    lineId: string,
  ): Promise<DemandLineRecord> {
    // ── Load line (scoped to ownerOrgId — non-leaking) ────────────────────────
    const line = await this.db.networkPoolDemandLine.findFirst({
      where: { id: lineId, ownerOrgId },
    });
    if (!line) {
      throw new DemandLineNotFoundError(lineId);
    }

    // ── Line status gate ──────────────────────────────────────────────────────
    const lineStatus = String(line.status);
    if (!CANCELLABLE_LINE_STATUSES.includes(lineStatus)) {
      throw new DemandLineInvalidStateError(lineStatus, CANCELLABLE_LINE_STATUSES);
    }

    // ── Pool state gate ───────────────────────────────────────────────────────
    const pool = await this.db.networkPool.findFirst({
      where:   { id: String(line.poolId), orgId: ownerOrgId },
      include: { lifecycleState: { select: { stateKey: true } } },
    });
    // Pool cannot be missing if line exists (CASCADE delete), but guard defensively.
    const poolStateKey = pool?.lifecycleState?.stateKey ?? '';
    if (!POOL_STATES_ALLOWING_DEMAND_WRITES.includes(poolStateKey)) {
      throw new DemandLinePoolStateError(poolStateKey, POOL_STATES_ALLOWING_DEMAND_WRITES);
    }

    // ── Execute cancel ────────────────────────────────────────────────────────
    const cancelled = await this.db.networkPoolDemandLine.update({
      where: { id: lineId },
      data:  { status: DEMAND_LINE_STATUS.CANCELLED, updatedAt: new Date() },
    });

    return this.toRecord(cancelled as unknown as Record<string, unknown>);
  }

  // ── lockDemandLinesForRfq ───────────────────────────────────────────────────

  /**
   * Lock all ACTIVE demand lines for RFQ issuance.
   *
   * TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-LOCK-DECISION-RECORD-001 §4.
   *
   * Authorised scope:
   *   - Pool must be AGGREGATING (D-2).
   *   - Lines must be ACTIVE; zero ACTIVE → DemandLineNoActiveLinesError (D-3).
   *   - Optional expected_line_ids: set-mismatch → DemandLineSetChangedError (D-4).
   *   - Creates NetworkPoolDemandSnapshot (status=CAPTURED, basis=RFQ_ISSUE) (D-5).
   *   - Creates NetworkPoolDemandSnapshotLine rows (fully immutable copies) (D-7).
   *   - Updates demand lines to LOCKED_FOR_RFQ with lockedAt timestamp.
   *   - P2002 unique-constraint conflict → DemandLineSnapshotConflictError (race backstop).
   *   - Does NOT transition pool lifecycle state (D-12).
   *   - Does NOT write NetworkLifecycleLog (D-13).
   *
   * D-017-A: ownerOrgId and userId are always sourced from the JWT/dbContext.
   */
  async lockDemandLinesForRfq(
    ownerOrgId: string,
    userId: string | null,
    input: LockDemandLinesForRfqInput,
  ): Promise<DemandSnapshotRecord> {
    // ── Input validation ──────────────────────────────────────────────────────
    if (!ownerOrgId || ownerOrgId.trim() === '') {
      throw new DemandLineInvalidInputError('ownerOrgId is required');
    }
    if (!input.pool_id || input.pool_id.trim() === '') {
      throw new DemandLineInvalidInputError('pool_id is required');
    }
    if (
      input.captured_reason != null &&
      input.captured_reason.length > 1000
    ) {
      throw new DemandLineInvalidInputError('captured_reason must not exceed 1000 characters');
    }
    if (input.expected_line_ids != null) {
      if (!Array.isArray(input.expected_line_ids)) {
        throw new DemandLineInvalidInputError('expected_line_ids must be an array');
      }
      for (const id of input.expected_line_ids) {
        if (typeof id !== 'string' || id.trim() === '') {
          throw new DemandLineInvalidInputError('expected_line_ids must contain non-empty string UUIDs');
        }
      }
    }

    try {
      return await this.db.$transaction(async (tx) => {
        // ── Fetch and guard pool ────────────────────────────────────────────
        const pool = await tx.networkPool.findFirst({
          where:   { id: input.pool_id, orgId: ownerOrgId },
          include: { lifecycleState: { select: { stateKey: true } } },
        });
        if (!pool) {
          throw new DemandLinePoolNotFoundError(input.pool_id);
        }
        const poolStateKey = pool.lifecycleState?.stateKey ?? '';
        if (poolStateKey !== 'AGGREGATING') {
          throw new DemandLinePoolStateError(poolStateKey, ['AGGREGATING']);
        }

        // ── Fetch ACTIVE lines (stable order for deterministic processing) ──
        const activeLines = await tx.networkPoolDemandLine.findMany({
          where:   { poolId: input.pool_id, ownerOrgId, status: DEMAND_LINE_STATUS.ACTIVE },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });
        if (activeLines.length === 0) {
          throw new DemandLineNoActiveLinesError(input.pool_id);
        }

        // ── Optional set-match guard (D-4) ──────────────────────────────────
        if (input.expected_line_ids != null) {
          const expectedSet  = new Set(input.expected_line_ids);
          const currentSet   = new Set(activeLines.map((l) => String(l.id)));
          const setsMatch    =
            expectedSet.size === currentSet.size &&
            [...expectedSet].every((id) => currentSet.has(id));
          if (!setsMatch) {
            throw new DemandLineSetChangedError();
          }
        }

        // ── Compute next snapshotVersion ────────────────────────────────────
        const agg = await tx.networkPoolDemandSnapshot.aggregate({
          where: { poolId: input.pool_id },
          _max:  { snapshotVersion: true },
        });
        const nextVersion = (agg._max.snapshotVersion ?? 0) + 1;

        // ── Compute qty summary (D-9: common unit only) ──────────────────────
        const units = new Set(activeLines.map((l) => String(l.qtyUnit)));
        let totalQty: string | null = null;
        let commonUnit: string | null = null;
        if (units.size === 1) {
          commonUnit = [...units][0]!;
          const sum = activeLines.reduce((acc, l) => acc + parseFloat(String(l.qty)), 0);
          totalQty = sum.toFixed(6);
        }

        // ── Create snapshot header ───────────────────────────────────────────
        const now          = new Date();
        const snapshotId   = randomUUID();
        const snapshotRef  = randomUUID();
        const snapshot = await tx.networkPoolDemandSnapshot.create({
          data: {
            id:                  snapshotId,
            ownerOrgId,
            poolId:              input.pool_id,
            snapshotRef,
            snapshotVersion:     nextVersion,
            basis:               'RFQ_ISSUE',
            status:              'CAPTURED',
            capturedAt:          now,
            capturedByUserId:    userId ?? null,
            capturedReason:      input.captured_reason ?? null,
            lineCount:           activeLines.length,
            totalQty:            totalQty ?? null,
            qtyUnit:             commonUnit ?? null,
            metadataInternalJson: Prisma.DbNull,
            createdAt:           now,
            updatedAt:           now,
          },
        });

        // ── Create snapshot lines (immutable copies) ─────────────────────────
        await tx.networkPoolDemandSnapshotLine.createMany({
          data: activeLines.map((line) => ({
            id:                            randomUUID(),
            snapshotId:                    snapshot.id,
            ownerOrgId,
            poolId:                        input.pool_id,
            demandLineId:                  String(line.id),
            sourceLineRef:                 String(line.lineRef),
            sourceRevisionNo:              Number(line.revisionNo),
            commodityCategory:             String(line.commodityCategory),
            productCategory:               line.productCategory != null ? String(line.productCategory) : null,
            productSpecSummary:            line.productSpecSummary != null ? String(line.productSpecSummary) : null,
            qty:                           line.qty,
            qtyUnit:                       String(line.qtyUnit),
            qualityRequirementsJson:       line.qualityRequirementsJson == null
              ? Prisma.DbNull
              : (line.qualityRequirementsJson as Prisma.InputJsonValue),
            certificationRequirementsJson: line.certificationRequirementsJson == null
              ? Prisma.DbNull
              : (line.certificationRequirementsJson as Prisma.InputJsonValue),
            packagingRequirementsJson:     line.packagingRequirementsJson == null
              ? Prisma.DbNull
              : (line.packagingRequirementsJson as Prisma.InputJsonValue),
            deliveryLocation:              line.deliveryLocation != null ? String(line.deliveryLocation) : null,
            deliveryWindowStart:           line.deliveryWindowStart ?? null,
            deliveryWindowEnd:             line.deliveryWindowEnd ?? null,
            tolerancePct:                  line.tolerancePct ?? null,
            priority:                      line.priority != null ? Number(line.priority) : null,
            sourceType:                    String(line.sourceType),
            normalizedFromMemberInput:     Boolean(line.normalizedFromMemberInput),
            sourceMembershipId:            line.sourceMembershipId != null ? String(line.sourceMembershipId) : null,
            supersedesLineId:              line.supersedesLineId != null ? String(line.supersedesLineId) : null,
            metadataInternalJson:          line.metadataInternalJson == null
              ? Prisma.DbNull
              : (line.metadataInternalJson as Prisma.InputJsonValue),
            createdAt:                     now,
          })),
        });

        // ── Lock demand lines ────────────────────────────────────────────────
        const activeLineIds = activeLines.map((l) => String(l.id));
        const updateResult = await tx.networkPoolDemandLine.updateMany({
          where: { id: { in: activeLineIds }, ownerOrgId, status: DEMAND_LINE_STATUS.ACTIVE },
          data:  { status: DEMAND_LINE_STATUS.LOCKED_FOR_RFQ, lockedAt: now, updatedAt: now },
        });
        if (updateResult.count !== activeLines.length) {
          // Concurrent modification: fewer rows updated than expected — abort transaction
          throw new DemandLineSetChangedError();
        }

        // ── Return snapshot header DTO (no metadataInternalJson, no lines) ──
        return {
          id:                  String(snapshot.id),
          owner_org_id:        String(snapshot.ownerOrgId),
          pool_id:             String(snapshot.poolId),
          snapshot_ref:        String(snapshot.snapshotRef),
          snapshot_version:    Number(snapshot.snapshotVersion),
          basis:               String(snapshot.basis),
          status:              String(snapshot.status),
          captured_at:         snapshot.capturedAt != null ? (snapshot.capturedAt as Date).toISOString() : null,
          captured_by_user_id: snapshot.capturedByUserId != null ? String(snapshot.capturedByUserId) : null,
          captured_reason:     snapshot.capturedReason != null ? String(snapshot.capturedReason) : null,
          line_count:          Number(snapshot.lineCount),
          total_qty:           snapshot.totalQty != null ? String(snapshot.totalQty) : null,
          qty_unit:            snapshot.qtyUnit != null ? String(snapshot.qtyUnit) : null,
          created_at:          (snapshot.createdAt as Date).toISOString(),
          updated_at:          (snapshot.updatedAt as Date).toISOString(),
        } satisfies DemandSnapshotRecord;
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new DemandLineSnapshotConflictError();
      }
      throw err;
    }
  }
}
