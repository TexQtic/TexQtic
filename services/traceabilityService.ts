/**
 * TECS-FBW-015: G-016 Traceability CRUD — Frontend Service
 *
 * D-017-A: orgId is NEVER sent in request bodies from the frontend.
 * The backend derives orgId from the verified JWT via tenantAuthMiddleware.
 *
 * Phase A: Tenant plane — CREATE + READ (nodes + edges + 1-hop neighbors)
 *          Control plane — READ-ONLY (cross-tenant admin inspection)
 *
 * Node/edge types are normalised to UPPERCASE by the backend service.
 * The meta field is an arbitrary JSON object (16 KB stop-loss on server).
 */

import { tenantGet, tenantPost } from './tenantApiClient';
import { adminGet } from './adminApiClient';

// ─── Tenant-plane types ──────────────────────────────────────────────────────

/** D-017-A: orgId excluded — derived from JWT by backend */
export interface NodeCreateBody {
  batchId: string;
  nodeType: string;
  meta?: Record<string, unknown>;
  visibility?: 'TENANT' | 'SHARED';
  geoHash?: string | null;
}

export interface NodeCreateResponse {
  nodeId: string;
}

export interface TraceabilityNodeRow {
  id: string;
  orgId: string;
  batchId: string;
  nodeType: string;
  meta: Record<string, unknown>;
  visibility: string;
  geoHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NodeListResponse {
  rows: TraceabilityNodeRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface NodeNeighborsResponse {
  node: TraceabilityNodeRow;
  edgesFrom: TraceabilityEdgeRow[];
  edgesTo: TraceabilityEdgeRow[];
}

/** D-017-A: orgId excluded — derived from JWT by backend */
export interface EdgeCreateBody {
  fromNodeId: string;
  toNodeId: string;
  edgeType: string;
  transformationId?: string | null;
  meta?: Record<string, unknown>;
}

export interface EdgeCreateResponse {
  edgeId: string;
}

export interface TraceabilityEdgeRow {
  id: string;
  orgId: string;
  fromNodeId: string;
  toNodeId: string;
  edgeType: string;
  transformationId: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
}

export interface EdgeListResponse {
  rows: TraceabilityEdgeRow[];
  total: number;
  limit: number;
  offset: number;
}

// ─── Control-plane types ──────────────────────────────────────────────────────

/** Phase A admin read — orgId is an optional query filter, not an identity claim */
export interface AdminNodeListResponse {
  rows: TraceabilityNodeRow[];
  limit: number;
  offset: number;
}

export interface AdminEdgeListResponse {
  rows: TraceabilityEdgeRow[];
  limit: number;
  offset: number;
}

// ─── Tenant-plane API functions ───────────────────────────────────────────────

/** POST /api/tenant/traceability/nodes — Create a traceability node */
export function createNode(body: NodeCreateBody): Promise<NodeCreateResponse> {
  return tenantPost<NodeCreateResponse>('/api/tenant/traceability/nodes', body);
}

/** GET /api/tenant/traceability/nodes — List nodes (paginated) */
export function listNodes(params?: {
  nodeType?: string;
  limit?: number;
  offset?: number;
}): Promise<NodeListResponse> {
  const qs = new URLSearchParams();
  if (params?.nodeType) qs.set('nodeType', params.nodeType);
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  if (params?.offset !== undefined) qs.set('offset', String(params.offset));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return tenantGet<NodeListResponse>(`/api/tenant/traceability/nodes${query}`);
}

/** GET /api/tenant/traceability/nodes/:id/neighbors — 1-hop graph context */
export function getNodeNeighbors(nodeId: string): Promise<NodeNeighborsResponse> {
  return tenantGet<NodeNeighborsResponse>(
    `/api/tenant/traceability/nodes/${encodeURIComponent(nodeId)}/neighbors`
  );
}

/** POST /api/tenant/traceability/edges — Create a traceability edge */
export function createEdge(body: EdgeCreateBody): Promise<EdgeCreateResponse> {
  return tenantPost<EdgeCreateResponse>('/api/tenant/traceability/edges', body);
}

/** GET /api/tenant/traceability/edges — List edges (paginated) */
export function listEdges(params?: {
  edgeType?: string;
  fromNodeId?: string;
  toNodeId?: string;
  limit?: number;
  offset?: number;
}): Promise<EdgeListResponse> {
  const qs = new URLSearchParams();
  if (params?.edgeType) qs.set('edgeType', params.edgeType);
  if (params?.fromNodeId) qs.set('fromNodeId', params.fromNodeId);
  if (params?.toNodeId) qs.set('toNodeId', params.toNodeId);
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  if (params?.offset !== undefined) qs.set('offset', String(params.offset));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return tenantGet<EdgeListResponse>(`/api/tenant/traceability/edges${query}`);
}

// ─── Control-plane API functions ──────────────────────────────────────────────

/** GET /api/control/traceability/nodes — Cross-tenant admin read (Phase A: read-only) */
export function adminListNodes(params?: {
  orgId?: string;
  nodeType?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminNodeListResponse> {
  const qs = new URLSearchParams();
  if (params?.orgId) qs.set('orgId', params.orgId);
  if (params?.nodeType) qs.set('nodeType', params.nodeType);
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  if (params?.offset !== undefined) qs.set('offset', String(params.offset));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return adminGet<AdminNodeListResponse>(`/api/control/traceability/nodes${query}`);
}

/** GET /api/control/traceability/edges — Cross-tenant admin read (Phase A: read-only) */
export function adminListEdges(params?: {
  orgId?: string;
  edgeType?: string;
  fromNodeId?: string;
  toNodeId?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminEdgeListResponse> {
  const qs = new URLSearchParams();
  if (params?.orgId) qs.set('orgId', params.orgId);
  if (params?.edgeType) qs.set('edgeType', params.edgeType);
  if (params?.fromNodeId) qs.set('fromNodeId', params.fromNodeId);
  if (params?.toNodeId) qs.set('toNodeId', params.toNodeId);
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  if (params?.offset !== undefined) qs.set('offset', String(params.offset));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return adminGet<AdminEdgeListResponse>(`/api/control/traceability/edges${query}`);
}
