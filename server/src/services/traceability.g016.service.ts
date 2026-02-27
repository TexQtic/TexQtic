/**
 * G-016 — TraceabilityService (Phase A)
 *
 * Implements supply-chain traceability graph CRUD:
 *   - createNode / listNodes
 *   - createEdge / listEdges
 *   - getNodeNeighbors (1-hop, tenant-scoped)
 *
 * Constitutional compliance:
 *   - All DB operations use the Prisma client passed in (injected, db-context-scoped).
 *   - The caller (route handler) MUST establish withDbContext before invoking any method.
 *   - orgId is NEVER accepted from request body — always from dbContext (D-017-A).
 *   - meta JSONB is validated for max size (stop-loss: 16 KB).
 *   - Phase A only: no maker-checker wiring, no AI/vector infra.
 */

import type { PrismaClient, Prisma } from '@prisma/client';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Stop-loss: maximum serialised byte-size for meta JSONB blobs. */
const META_MAX_BYTES = 16 * 1024; // 16 KB

// ─── Error Codes ─────────────────────────────────────────────────────────────

export type TraceabilityServiceErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'DB_ERROR';

// ─── Types ───────────────────────────────────────────────────────────────────

export type NodeCreateInput = {
  /** RLS boundary — set from authenticated session (dbContext.orgId). Never from body. */
  orgId: string;
  batchId: string;
  nodeType: string;
  meta?: Record<string, unknown>;
  visibility?: string;
  geoHash?: string | null;
};

export type NodeCreateResult =
  | { status: 'CREATED'; nodeId: string }
  | { status: 'ERROR'; code: TraceabilityServiceErrorCode; message: string };

export type NodeListInput = {
  orgId: string;
  nodeType?: string;
  limit?: number;
  offset?: number;
};

export type NodeListResult =
  | { status: 'OK'; rows: TraceabilityNodeRow[]; total: number }
  | { status: 'ERROR'; code: TraceabilityServiceErrorCode; message: string };

export type TraceabilityNodeRow = {
  id: string;
  orgId: string;
  batchId: string;
  nodeType: string;
  meta: Prisma.JsonValue;
  visibility: string;
  geoHash: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type EdgeCreateInput = {
  orgId: string;
  fromNodeId: string;
  toNodeId: string;
  edgeType: string;
  transformationId?: string | null;
  meta?: Record<string, unknown>;
};

export type EdgeCreateResult =
  | { status: 'CREATED'; edgeId: string }
  | { status: 'ERROR'; code: TraceabilityServiceErrorCode; message: string };

export type EdgeListInput = {
  orgId: string;
  edgeType?: string;
  fromNodeId?: string;
  toNodeId?: string;
  limit?: number;
  offset?: number;
};

export type EdgeListResult =
  | { status: 'OK'; rows: TraceabilityEdgeRow[]; total: number }
  | { status: 'ERROR'; code: TraceabilityServiceErrorCode; message: string };

export type TraceabilityEdgeRow = {
  id: string;
  orgId: string;
  fromNodeId: string;
  toNodeId: string;
  edgeType: string;
  transformationId: string | null;
  meta: Prisma.JsonValue;
  createdAt: Date;
};

export type NodeNeighborsResult =
  | {
      status: 'OK';
      node: TraceabilityNodeRow;
      edgesFrom: TraceabilityEdgeRow[];
      edgesTo: TraceabilityEdgeRow[];
    }
  | { status: 'ERROR'; code: TraceabilityServiceErrorCode; message: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function validateMeta(meta: Record<string, unknown>): string | null {
  const serialised = JSON.stringify(meta);
  if (Buffer.byteLength(serialised, 'utf8') > META_MAX_BYTES) {
    return `meta exceeds ${META_MAX_BYTES} bytes size limit`;
  }
  return null;
}

// ─── TraceabilityService ──────────────────────────────────────────────────────

export class TraceabilityService {
  /**
   * @param db - Prisma client (injected; scoped via withDbContext at route level).
   */
  constructor(private readonly db: PrismaClient) {}

  // ─── createNode ─────────────────────────────────────────────────────────────

  async createNode(input: NodeCreateInput): Promise<NodeCreateResult> {
    const { orgId, batchId, nodeType, meta = {}, visibility = 'TENANT', geoHash = null } = input;

    if (!batchId || batchId.trim().length === 0) {
      return { status: 'ERROR', code: 'INVALID_INPUT', message: 'batchId is required' };
    }
    if (!nodeType || nodeType.trim().length === 0) {
      return { status: 'ERROR', code: 'INVALID_INPUT', message: 'nodeType is required' };
    }

    const metaError = validateMeta(meta);
    if (metaError) {
      return { status: 'ERROR', code: 'INVALID_INPUT', message: metaError };
    }

    try {
      const node = await this.db.traceabilityNode.create({
        data: {
          orgId,
          batchId: batchId.trim(),
          nodeType: nodeType.trim().toUpperCase(),
          meta: meta as Prisma.InputJsonValue,
          visibility: visibility.trim().toUpperCase(),
          geoHash: geoHash ?? null,
        },
        select: { id: true },
      });
      return { status: 'CREATED', nodeId: node.id };
    } catch (err) {
      // Unique constraint: (org_id, batch_id) — duplicate batchId within org
      if (err instanceof Error && err.message.includes('traceability_nodes_org_batch_unique')) {
        return {
          status: 'ERROR',
          code: 'CONFLICT',
          message: `A node with batchId '${batchId}' already exists for this org`,
        };
      }
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message: err instanceof Error ? err.message : 'Unknown DB error',
      };
    }
  }

  // ─── listNodes ──────────────────────────────────────────────────────────────

  async listNodes(input: NodeListInput): Promise<NodeListResult> {
    const { orgId, nodeType, limit = 50, offset = 0 } = input;

    const where: Prisma.TraceabilityNodeWhereInput = {
      orgId,
      ...(nodeType ? { nodeType: nodeType.trim().toUpperCase() } : {}),
    };

    try {
      const [rows, total] = await this.db.$transaction([
        this.db.traceabilityNode.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        this.db.traceabilityNode.count({ where }),
      ]);
      return {
        status: 'OK',
        rows: rows as TraceabilityNodeRow[],
        total,
      };
    } catch (err) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message: err instanceof Error ? err.message : 'Unknown DB error',
      };
    }
  }

  // ─── createEdge ─────────────────────────────────────────────────────────────

  async createEdge(input: EdgeCreateInput): Promise<EdgeCreateResult> {
    const { orgId, fromNodeId, toNodeId, edgeType, transformationId = null, meta = {} } = input;

    if (!fromNodeId || !toNodeId) {
      return { status: 'ERROR', code: 'INVALID_INPUT', message: 'fromNodeId and toNodeId are required' };
    }
    if (!edgeType || edgeType.trim().length === 0) {
      return { status: 'ERROR', code: 'INVALID_INPUT', message: 'edgeType is required' };
    }

    const metaError = validateMeta(meta);
    if (metaError) {
      return { status: 'ERROR', code: 'INVALID_INPUT', message: metaError };
    }

    try {
      const edge = await this.db.traceabilityEdge.create({
        data: {
          orgId,
          fromNodeId,
          toNodeId,
          edgeType: edgeType.trim().toUpperCase(),
          transformationId: transformationId ?? null,
          meta: meta as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
      return { status: 'CREATED', edgeId: edge.id };
    } catch (err) {
      if (err instanceof Error) {
        if (
          err.message.includes('traceability_edges_unique_no_transform') ||
          err.message.includes('traceability_edges_unique_with_transform')
        ) {
          return {
            status: 'ERROR',
            code: 'CONFLICT',
            message: 'A duplicate edge already exists for this combination',
          };
        }
        // FK violation: node not found / not in same org
        if (err.message.includes('foreign key') || err.message.includes('violates')) {
          return {
            status: 'ERROR',
            code: 'NOT_FOUND',
            message: 'One or both referenced nodes do not exist in this org',
          };
        }
      }
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message: err instanceof Error ? err.message : 'Unknown DB error',
      };
    }
  }

  // ─── listEdges ──────────────────────────────────────────────────────────────

  async listEdges(input: EdgeListInput): Promise<EdgeListResult> {
    const { orgId, edgeType, fromNodeId, toNodeId, limit = 50, offset = 0 } = input;

    const where: Prisma.TraceabilityEdgeWhereInput = {
      orgId,
      ...(edgeType ? { edgeType: edgeType.trim().toUpperCase() } : {}),
      ...(fromNodeId ? { fromNodeId } : {}),
      ...(toNodeId ? { toNodeId } : {}),
    };

    try {
      const [rows, total] = await this.db.$transaction([
        this.db.traceabilityEdge.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        this.db.traceabilityEdge.count({ where }),
      ]);
      return {
        status: 'OK',
        rows: rows as TraceabilityEdgeRow[],
        total,
      };
    } catch (err) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message: err instanceof Error ? err.message : 'Unknown DB error',
      };
    }
  }

  // ─── getNodeNeighbors (1-hop) ────────────────────────────────────────────────

  async getNodeNeighbors(nodeId: string, orgId: string): Promise<NodeNeighborsResult> {
    try {
      const node = await this.db.traceabilityNode.findFirst({
        where: { id: nodeId, orgId },
      });
      if (!node) {
        return { status: 'ERROR', code: 'NOT_FOUND', message: 'Node not found' };
      }

      const [edgesFrom, edgesTo] = await this.db.$transaction([
        this.db.traceabilityEdge.findMany({
          where: { fromNodeId: nodeId, orgId },
          orderBy: { createdAt: 'desc' },
        }),
        this.db.traceabilityEdge.findMany({
          where: { toNodeId: nodeId, orgId },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      return {
        status: 'OK',
        node: node as TraceabilityNodeRow,
        edgesFrom: edgesFrom as TraceabilityEdgeRow[],
        edgesTo: edgesTo as TraceabilityEdgeRow[],
      };
    } catch (err) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message: err instanceof Error ? err.message : 'Unknown DB error',
      };
    }
  }
}
