/**
 * TraceabilityPanel — Tenant Plane, G-016 (TECS-FBW-015)
 *
 * Surfaces supply-chain traceability CRUD for the authenticated tenant:
 *   - Nodes list   : GET  /api/tenant/traceability/nodes
 *   - Create node  : POST /api/tenant/traceability/nodes
 *   - Node detail  : GET  /api/tenant/traceability/nodes/:id/neighbors (1-hop graph)
 *   - Edges list   : GET  /api/tenant/traceability/edges
 *   - Create edge  : POST /api/tenant/traceability/edges
 *
 * Constitutional compliance:
 *   D-017-A  No orgId in any request body — server derives from JWT via
 *            tenantAuthMiddleware. All requests use tenantPost / tenantGet.
 *
 * Phase A scope (TECS-FBW-015):
 *   ✅ List nodes + edges (paginated)
 *   ✅ Create node (SUBMITTED → nodeId)
 *   ✅ Create edge (fromNode → toNode link)
 *   ✅ 1-hop neighbor view (read-only graph context)
 *   ❌ UPDATE / DELETE — not exposed on any plane in Phase A
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  createNode,
  listNodes,
  getNodeNeighbors,
  createEdge,
  listEdges,
  type TraceabilityNodeRow,
  type TraceabilityEdgeRow,
  type NodeNeighborsResponse,
} from '../../services/traceabilityService';
import { APIError } from '../../services/apiClient';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import { EmptyState } from '../shared/EmptyState';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

// ─── Panel view state machine ─────────────────────────────────────────────────

type MainTab = 'NODES' | 'EDGES';
type PanelView = 'LIST' | 'CREATE_NODE' | 'CREATE_EDGE' | 'NODE_DETAIL';
type SubmitPhase = 'IDLE' | 'SUBMITTING' | 'CREATED' | 'ERROR';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function friendlyError(err: unknown): string {
  if (err instanceof APIError) return err.message;
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred.';
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const Badge: React.FC<{ label: string; className?: string }> = ({ label, className = '' }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${className}`}>
    {label}
  </span>
);

const SectionHeader: React.FC<{ title: string; action?: React.ReactNode }> = ({ title, action }) => (
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-lg font-bold text-slate-800">{title}</h2>
    {action}
  </div>
);

// ─── NodeRow component ────────────────────────────────────────────────────────

const NodeRowItem: React.FC<{
  node: TraceabilityNodeRow;
  onViewNeighbors: (node: TraceabilityNodeRow) => void;
}> = ({ node, onViewNeighbors }) => (
  <div className="border border-slate-200 rounded-lg p-4 bg-white hover:border-slate-300 transition-colors">
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge label={node.nodeType} className="bg-indigo-100 text-indigo-700" />
          <Badge
            label={node.visibility}
            className={node.visibility === 'SHARED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}
          />
        </div>
        <p className="text-sm font-medium text-slate-900 font-mono truncate">Batch: {node.batchId}</p>
        <p className="text-[10px] text-slate-400 mt-1">ID: {node.id}</p>
        {node.geoHash && (
          <p className="text-[10px] text-slate-400">GeoHash: {node.geoHash}</p>
        )}
        <p className="text-[10px] text-slate-400">{fmtDate(node.createdAt)}</p>
      </div>
      <button
        onClick={() => onViewNeighbors(node)}
        className="flex-shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-200 px-3 py-1 rounded hover:bg-indigo-50 transition-colors"
      >
        View graph →
      </button>
    </div>
  </div>
);

// ─── EdgeRow component ────────────────────────────────────────────────────────

const EdgeRowItem: React.FC<{ edge: TraceabilityEdgeRow }> = ({ edge }) => (
  <div className="border border-slate-200 rounded-lg p-4 bg-white">
    <div className="flex items-start gap-3">
      <Badge label={edge.edgeType} className="bg-violet-100 text-violet-700 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-[10px] text-slate-500 font-mono truncate">{edge.fromNodeId}</span>
          <span className="text-slate-400 text-xs">→</span>
          <span className="text-[10px] text-slate-500 font-mono truncate">{edge.toNodeId}</span>
        </div>
        {edge.transformationId && (
          <p className="text-[10px] text-slate-400">Transform: {edge.transformationId}</p>
        )}
        <p className="text-[10px] text-slate-400">{fmtDate(edge.createdAt)}</p>
      </div>
    </div>
  </div>
);

// ─── NodeDetailView ───────────────────────────────────────────────────────────

const NodeDetailView: React.FC<{
  node: TraceabilityNodeRow;
  onBack: () => void;
}> = ({ node, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [neighbors, setNeighbors] = useState<NodeNeighborsResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getNodeNeighbors(node.id);
      setNeighbors(data);
    } catch (err: unknown) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [node.id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <button
        onClick={onBack}
        className="text-sm text-indigo-600 hover:text-indigo-800 mb-4 flex items-center gap-1"
      >
        ← Back to nodes
      </button>
      <div className="border border-slate-200 rounded-lg p-4 bg-white mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Badge label={node.nodeType} className="bg-indigo-100 text-indigo-700" />
          <Badge
            label={node.visibility}
            className={node.visibility === 'SHARED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}
          />
        </div>
        <p className="text-sm font-semibold text-slate-900">Batch: {node.batchId}</p>
        <p className="text-[10px] text-slate-500 font-mono mt-1">ID: {node.id}</p>
        {node.geoHash && <p className="text-[10px] text-slate-400">GeoHash: {node.geoHash}</p>}
        <p className="text-[10px] text-slate-400">Created: {fmtDate(node.createdAt)}</p>
      </div>

      {loading && <LoadingState message="Loading 1-hop graph…" />}
      {error && <ErrorState error={{ message: error }} />}
      {!loading && !error && neighbors && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3">
              Edges from this node ({neighbors.edgesFrom.length})
            </h3>
            {neighbors.edgesFrom.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No outgoing edges.</p>
            ) : (
              <div className="space-y-2">
                {neighbors.edgesFrom.map((e) => (
                  <EdgeRowItem key={e.id} edge={e} />
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3">
              Edges to this node ({neighbors.edgesTo.length})
            </h3>
            {neighbors.edgesTo.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No incoming edges.</p>
            ) : (
              <div className="space-y-2">
                {neighbors.edgesTo.map((e) => (
                  <EdgeRowItem key={e.id} edge={e} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── CreateNodeForm ───────────────────────────────────────────────────────────

const CreateNodeForm: React.FC<{
  onCreated: (nodeId: string) => void;
  onCancel: () => void;
}> = ({ onCreated, onCancel }) => {
  const [batchId, setBatchId] = useState('');
  const [nodeType, setNodeType] = useState('');
  const [visibility, setVisibility] = useState<'TENANT' | 'SHARED'>('TENANT');
  const [geoHash, setGeoHash] = useState('');
  const [metaRaw, setMetaRaw] = useState('{}');
  const [metaError, setMetaError] = useState<string | null>(null);
  const [phase, setPhase] = useState<SubmitPhase>('IDLE');
  const [submitError, setSubmitError] = useState<string | null>(null);

  function validateMeta(): Record<string, unknown> | null {
    try {
      const parsed = JSON.parse(metaRaw);
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
        setMetaError('Meta must be a JSON object {}');
        return null;
      }
      setMetaError(null);
      return parsed;
    } catch {
      setMetaError('Invalid JSON');
      return null;
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!batchId.trim() || !nodeType.trim()) return;
    const meta = validateMeta();
    if (meta === null) return;

    setPhase('SUBMITTING');
    setSubmitError(null);

    createNode({
      batchId: batchId.trim(),
      nodeType: nodeType.trim(),
      meta,
      visibility,
      geoHash: geoHash.trim() || null,
    })
      .then((res) => {
        setPhase('CREATED');
        onCreated(res.nodeId);
      })
      .catch((err: unknown) => {
        setPhase('ERROR');
        setSubmitError(friendlyError(err));
      });
  }

  return (
    <div>
      <button
        onClick={onCancel}
        className="text-sm text-indigo-600 hover:text-indigo-800 mb-4 flex items-center gap-1"
      >
        ← Back to list
      </button>
      <h2 className="text-lg font-bold text-slate-800 mb-4">Create Traceability Node</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
        <div>
          <label htmlFor="node-batchId" className="block text-sm font-semibold text-slate-700 mb-1">
            Batch ID <span className="text-rose-500">*</span>
          </label>
          <input
            id="node-batchId"
            type="text"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            placeholder="e.g. BATCH-2025-001"
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-[10px] text-slate-400 mt-1">Must be unique within your organisation.</p>
        </div>

        <div>
          <label htmlFor="node-nodeType" className="block text-sm font-semibold text-slate-700 mb-1">
            Node Type <span className="text-rose-500">*</span>
          </label>
          <input
            id="node-nodeType"
            type="text"
            value={nodeType}
            onChange={(e) => setNodeType(e.target.value)}
            placeholder="e.g. BATCH, SHIPMENT, FACTORY"
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-[10px] text-slate-400 mt-1">Normalised to uppercase by the server.</p>
        </div>

        <div>
          <label htmlFor="node-visibility" className="block text-sm font-semibold text-slate-700 mb-1">Visibility</label>
          <select
            id="node-visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as 'TENANT' | 'SHARED')}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="TENANT">TENANT (private to org)</option>
            <option value="SHARED">SHARED (visible cross-org)</option>
          </select>
        </div>

        <div>
          <label htmlFor="node-geoHash" className="block text-sm font-semibold text-slate-700 mb-1">
            GeoHash <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="node-geoHash"
            type="text"
            value={geoHash}
            onChange={(e) => setGeoHash(e.target.value)}
            placeholder="e.g. u09tvw"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="node-meta" className="block text-sm font-semibold text-slate-700 mb-1">
            Meta <span className="text-slate-400 font-normal">(JSON object)</span>
          </label>
          <textarea
            id="node-meta"
            value={metaRaw}
            onChange={(e) => setMetaRaw(e.target.value)}
            rows={4}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {metaError && (
            <p className="text-[10px] text-rose-600 mt-1">{metaError}</p>
          )}
        </div>

        {submitError && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
            <p className="text-sm text-rose-700">{submitError}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={phase === 'SUBMITTING' || !batchId.trim() || !nodeType.trim()}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {phase === 'SUBMITTING' ? 'Creating…' : 'Create Node'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="border border-slate-300 text-slate-600 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── CreateEdgeForm ───────────────────────────────────────────────────────────

const CreateEdgeForm: React.FC<{
  onCreated: (edgeId: string) => void;
  onCancel: () => void;
}> = ({ onCreated, onCancel }) => {
  const [fromNodeId, setFromNodeId] = useState('');
  const [toNodeId, setToNodeId] = useState('');
  const [edgeType, setEdgeType] = useState('');
  const [transformationId, setTransformationId] = useState('');
  const [metaRaw, setMetaRaw] = useState('{}');
  const [metaError, setMetaError] = useState<string | null>(null);
  const [phase, setPhase] = useState<SubmitPhase>('IDLE');
  const [submitError, setSubmitError] = useState<string | null>(null);

  function validateMeta(): Record<string, unknown> | null {
    try {
      const parsed = JSON.parse(metaRaw);
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
        setMetaError('Meta must be a JSON object {}');
        return null;
      }
      setMetaError(null);
      return parsed;
    } catch {
      setMetaError('Invalid JSON');
      return null;
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fromNodeId.trim() || !toNodeId.trim() || !edgeType.trim()) return;
    const meta = validateMeta();
    if (meta === null) return;

    setPhase('SUBMITTING');
    setSubmitError(null);

    createEdge({
      fromNodeId: fromNodeId.trim(),
      toNodeId: toNodeId.trim(),
      edgeType: edgeType.trim(),
      transformationId: transformationId.trim() || null,
      meta,
    })
      .then((res) => {
        setPhase('CREATED');
        onCreated(res.edgeId);
      })
      .catch((err: unknown) => {
        setPhase('ERROR');
        setSubmitError(friendlyError(err));
      });
  }

  return (
    <div>
      <button
        onClick={onCancel}
        className="text-sm text-indigo-600 hover:text-indigo-800 mb-4 flex items-center gap-1"
      >
        ← Back to list
      </button>
      <h2 className="text-lg font-bold text-slate-800 mb-4">Create Traceability Edge</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
        <div>
          <label htmlFor="edge-fromNodeId" className="block text-sm font-semibold text-slate-700 mb-1">
            From Node ID <span className="text-rose-500">*</span>
          </label>
          <input
            id="edge-fromNodeId"
            type="text"
            value={fromNodeId}
            onChange={(e) => setFromNodeId(e.target.value)}
            placeholder="UUID of the source node"
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="edge-toNodeId" className="block text-sm font-semibold text-slate-700 mb-1">
            To Node ID <span className="text-rose-500">*</span>
          </label>
          <input
            id="edge-toNodeId"
            type="text"
            value={toNodeId}
            onChange={(e) => setToNodeId(e.target.value)}
            placeholder="UUID of the destination node"
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="edge-edgeType" className="block text-sm font-semibold text-slate-700 mb-1">
            Edge Type <span className="text-rose-500">*</span>
          </label>
          <input
            id="edge-edgeType"
            type="text"
            value={edgeType}
            onChange={(e) => setEdgeType(e.target.value)}
            placeholder="e.g. CONTAINS, TRANSFORMS, TRANSPORTS"
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-[10px] text-slate-400 mt-1">Normalised to uppercase by the server.</p>
        </div>

        <div>
          <label htmlFor="edge-transformationId" className="block text-sm font-semibold text-slate-700 mb-1">
            Transformation ID <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="edge-transformationId"
            type="text"
            value={transformationId}
            onChange={(e) => setTransformationId(e.target.value)}
            placeholder="Reference to a transformation record"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="edge-meta" className="block text-sm font-semibold text-slate-700 mb-1">
            Meta <span className="text-slate-400 font-normal">(JSON object)</span>
          </label>
          <textarea
            id="edge-meta"
            value={metaRaw}
            onChange={(e) => setMetaRaw(e.target.value)}
            rows={4}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {metaError && (
            <p className="text-[10px] text-rose-600 mt-1">{metaError}</p>
          )}
        </div>

        {submitError && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
            <p className="text-sm text-rose-700">{submitError}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={phase === 'SUBMITTING' || !fromNodeId.trim() || !toNodeId.trim() || !edgeType.trim()}
            className="bg-violet-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {phase === 'SUBMITTING' ? 'Creating…' : 'Create Edge'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="border border-slate-300 text-slate-600 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── NodesListView ────────────────────────────────────────────────────────────

const NodesListView: React.FC<{
  onCreateNode: () => void;
  onViewNeighbors: (node: TraceabilityNodeRow) => void;
}> = ({ onCreateNode, onViewNeighbors }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes] = useState<TraceabilityNodeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [nodeTypeFilter, setNodeTypeFilter] = useState('');
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listNodes({
        nodeType: nodeTypeFilter.trim() || undefined,
        limit,
        offset,
      });
      setNodes(res.rows);
      setTotal(res.total);
    } catch (err: unknown) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [nodeTypeFilter, offset]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <SectionHeader
        title="Traceability Nodes"
        action={
          <button
            onClick={onCreateNode}
            className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Create Node
          </button>
        }
      />

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={nodeTypeFilter}
          onChange={(e) => { setNodeTypeFilter(e.target.value); setOffset(0); }}
          placeholder="Filter by node type…"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
        />
        <button
          onClick={load}
          className="border border-slate-300 text-slate-600 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading && <LoadingState message="Loading nodes…" />}
      {error && <ErrorState error={{ message: error }} />}
      {!loading && !error && nodes.length === 0 && (
        <EmptyState title="No nodes found" message="No traceability nodes found. Create your first node to get started." />
      )}
      {!loading && !error && nodes.length > 0 && (
        <>
          <div className="space-y-3">
            {nodes.map((node) => (
              <NodeRowItem key={node.id} node={node} onViewNeighbors={onViewNeighbors} />
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
            <span>Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}</span>
            <div className="flex gap-2">
              <button
                disabled={offset === 0}
                onClick={() => setOffset((o) => Math.max(0, o - limit))}
                className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <button
                disabled={offset + limit >= total}
                onClick={() => setOffset((o) => o + limit)}
                className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─── EdgesListView ────────────────────────────────────────────────────────────

const EdgesListView: React.FC<{
  onCreateEdge: () => void;
}> = ({ onCreateEdge }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edges, setEdges] = useState<TraceabilityEdgeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [edgeTypeFilter, setEdgeTypeFilter] = useState('');
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listEdges({
        edgeType: edgeTypeFilter.trim() || undefined,
        limit,
        offset,
      });
      setEdges(res.rows);
      setTotal(res.total);
    } catch (err: unknown) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [edgeTypeFilter, offset]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <SectionHeader
        title="Traceability Edges"
        action={
          <button
            onClick={onCreateEdge}
            className="bg-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors"
          >
            + Create Edge
          </button>
        }
      />

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={edgeTypeFilter}
          onChange={(e) => { setEdgeTypeFilter(e.target.value); setOffset(0); }}
          placeholder="Filter by edge type…"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
        />
        <button
          onClick={load}
          className="border border-slate-300 text-slate-600 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading && <LoadingState message="Loading edges…" />}
      {error && <ErrorState error={{ message: error }} />}
      {!loading && !error && edges.length === 0 && (
        <EmptyState title="No edges found" message="No traceability edges found. Link two nodes to create a supply-chain connection." />
      )}
      {!loading && !error && edges.length > 0 && (
        <>
          <div className="space-y-3">
            {edges.map((edge) => (
              <EdgeRowItem key={edge.id} edge={edge} />
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
            <span>Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}</span>
            <div className="flex gap-2">
              <button
                disabled={offset === 0}
                onClick={() => setOffset((o) => Math.max(0, o - limit))}
                className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <button
                disabled={offset + limit >= total}
                onClick={() => setOffset((o) => o + limit)}
                className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─── TraceabilityPanel (root) ─────────────────────────────────────────────────

export const TraceabilityPanel: React.FC<Props> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<MainTab>('NODES');
  const [panelView, setPanelView] = useState<PanelView>('LIST');
  const [selectedNode, setSelectedNode] = useState<TraceabilityNodeRow | null>(null);

  function handleViewNeighbors(node: TraceabilityNodeRow) {
    setSelectedNode(node);
    setPanelView('NODE_DETAIL');
  }

  function handleNodeCreated(_nodeId: string) {
    setPanelView('LIST');
  }

  function handleEdgeCreated(_edgeId: string) {
    setPanelView('LIST');
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-slate-900">🔗 Traceability</h1>
        </div>
        <Badge label="Supply Chain" className="bg-indigo-100 text-indigo-700" />
      </div>

      {/* Tab bar — only shown in LIST view */}
      {panelView === 'LIST' && (
        <div className="flex gap-1 border-b border-slate-200 mb-6">
          {(['NODES', 'EDGES'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'NODES' ? '📦 Nodes' : '🔀 Edges'}
            </button>
          ))}
        </div>
      )}

      {/* Panel views */}
      {panelView === 'LIST' && activeTab === 'NODES' && (
        <NodesListView
          onCreateNode={() => setPanelView('CREATE_NODE')}
          onViewNeighbors={handleViewNeighbors}
        />
      )}
      {panelView === 'LIST' && activeTab === 'EDGES' && (
        <EdgesListView
          onCreateEdge={() => setPanelView('CREATE_EDGE')}
        />
      )}
      {panelView === 'CREATE_NODE' && (
        <CreateNodeForm
          onCreated={handleNodeCreated}
          onCancel={() => setPanelView('LIST')}
        />
      )}
      {panelView === 'CREATE_EDGE' && (
        <CreateEdgeForm
          onCreated={handleEdgeCreated}
          onCancel={() => { setActiveTab('EDGES'); setPanelView('LIST'); }}
        />
      )}
      {panelView === 'NODE_DETAIL' && selectedNode && (
        <NodeDetailView
          node={selectedNode}
          onBack={() => { setSelectedNode(null); setPanelView('LIST'); }}
        />
      )}
    </div>
  );
};
