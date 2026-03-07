/**
 * TraceabilityAdmin — Control Plane, Read-Only (TECS-FBW-015)
 *
 * Surfaces cross-tenant traceability inspection for super-admin review.
 *   GET /api/control/traceability/nodes — cross-tenant node list
 *   GET /api/control/traceability/edges — cross-tenant edge list
 *
 * Constitutional compliance:
 *   D-017-A  orgId is an optional query-param FILTER only — not an identity
 *            assertion. The server uses admin sentinel + is_admin='true' RLS override.
 *
 * Phase A scope (TECS-FBW-015):
 *   ✅ Cross-tenant node list with optional orgId / nodeType filters
 *   ✅ Cross-tenant edge list with optional orgId / edgeType filters
 *   ❌ Create  — out of scope (Phase A: admin routes are read-only by design)
 *   ❌ Update  — not exposed on admin plane
 *   ❌ Delete  — not exposed on admin plane
 */

import React, { useState, useCallback } from 'react';
import {
  adminListNodes,
  adminListEdges,
  type TraceabilityNodeRow,
  type TraceabilityEdgeRow,
} from '../../services/traceabilityService';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import { EmptyState } from '../shared/EmptyState';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function friendlyError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred.';
}

// ─── Sub-components (dark control-plane theme) ────────────────────────────────

const Badge: React.FC<{ label: string; className?: string }> = ({ label, className = '' }) => (
  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${className}`}>
    {label}
  </span>
);

// ─── NodeAdminRow ─────────────────────────────────────────────────────────────

const NodeAdminRow: React.FC<{ node: TraceabilityNodeRow }> = ({ node }) => (
  <div className="border border-slate-700 rounded-lg p-4 bg-slate-800/50">
    <div className="flex items-start gap-3">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge label={node.nodeType} className="bg-indigo-900/60 text-indigo-300" />
          <Badge
            label={node.visibility}
            className={
              node.visibility === 'SHARED'
                ? 'bg-emerald-900/50 text-emerald-300'
                : 'bg-slate-700 text-slate-400'
            }
          />
        </div>
        <p className="text-sm text-slate-200 font-mono truncate">Batch: {node.batchId}</p>
        <p className="text-[10px] text-slate-400 font-mono">Node: {node.id}</p>
        <p className="text-[10px] text-slate-500 font-mono">Org: {node.orgId}</p>
        {node.geoHash && (
          <p className="text-[10px] text-slate-500">GeoHash: {node.geoHash}</p>
        )}
        <p className="text-[10px] text-slate-500">{fmtDate(node.createdAt)}</p>
      </div>
    </div>
  </div>
);

// ─── EdgeAdminRow ─────────────────────────────────────────────────────────────

const EdgeAdminRow: React.FC<{ edge: TraceabilityEdgeRow }> = ({ edge }) => (
  <div className="border border-slate-700 rounded-lg p-4 bg-slate-800/50">
    <div className="flex items-start gap-3">
      <Badge label={edge.edgeType} className="bg-violet-900/60 text-violet-300 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-400 font-mono truncate">{edge.fromNodeId}</span>
          <span className="text-slate-500 text-xs">→</span>
          <span className="text-[10px] text-slate-400 font-mono truncate">{edge.toNodeId}</span>
        </div>
        <p className="text-[10px] text-slate-500 font-mono">Edge: {edge.id}</p>
        <p className="text-[10px] text-slate-500 font-mono">Org: {edge.orgId}</p>
        {edge.transformationId && (
          <p className="text-[10px] text-slate-500">Transform: {edge.transformationId}</p>
        )}
        <p className="text-[10px] text-slate-500">{fmtDate(edge.createdAt)}</p>
      </div>
    </div>
  </div>
);

// ─── NodesAdminTab ────────────────────────────────────────────────────────────

const NodesAdminTab: React.FC = () => {
  const [orgId, setOrgId] = useState('');
  const [nodeType, setNodeType] = useState('');
  const [nodes, setNodes] = useState<TraceabilityNodeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const limit = 20;

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminListNodes({
      orgId: orgId.trim() || undefined,
      nodeType: nodeType.trim() || undefined,
      limit,
      offset,
    })
      .then((res) => {
        setNodes(res.rows);
        setHasLoaded(true);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(friendlyError(err));
        setLoading(false);
      });
  }, [orgId, nodeType, offset]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={orgId}
          onChange={(e) => { setOrgId(e.target.value); setOffset(0); }}
          placeholder="Filter by Org ID (UUID)…"
          className="border border-slate-600 bg-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-72 placeholder:text-slate-500"
        />
        <input
          type="text"
          value={nodeType}
          onChange={(e) => { setNodeType(e.target.value); setOffset(0); }}
          placeholder="Filter by node type…"
          className="border border-slate-600 bg-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56 placeholder:text-slate-500"
        />
        <button
          onClick={() => { setOffset(0); load(); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          Search
        </button>
      </div>

      {loading && <LoadingState message="Loading nodes…" />}
      {error && <ErrorState error={{ message: error }} />}
      {!loading && !error && hasLoaded && nodes.length === 0 && (
        <EmptyState title="No nodes found" message="No traceability nodes found for the given filters." />
      )}
      {!loading && !error && nodes.length > 0 && (
        <>
          <div className="space-y-2">
            {nodes.map((node) => (
              <NodeAdminRow key={node.id} node={node} />
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              disabled={offset === 0}
              onClick={() => { setOffset((o) => Math.max(0, o - limit)); load(); }}
              className="px-3 py-1 border border-slate-600 text-slate-300 rounded hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              ← Prev
            </button>
            <button
              disabled={nodes.length < limit}
              onClick={() => { setOffset((o) => o + limit); load(); }}
              className="px-3 py-1 border border-slate-600 text-slate-300 rounded hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              Next →
            </button>
          </div>
        </>
      )}
      {!hasLoaded && !loading && (
        <p className="text-sm text-slate-500 italic">
          Enter filters and press Search to inspect nodes cross-tenant.
        </p>
      )}
    </div>
  );
};

// ─── EdgesAdminTab ────────────────────────────────────────────────────────────

const EdgesAdminTab: React.FC = () => {
  const [orgId, setOrgId] = useState('');
  const [edgeType, setEdgeType] = useState('');
  const [edges, setEdges] = useState<TraceabilityEdgeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const limit = 20;

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminListEdges({
      orgId: orgId.trim() || undefined,
      edgeType: edgeType.trim() || undefined,
      limit,
      offset,
    })
      .then((res) => {
        setEdges(res.rows);
        setHasLoaded(true);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(friendlyError(err));
        setLoading(false);
      });
  }, [orgId, edgeType, offset]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={orgId}
          onChange={(e) => { setOrgId(e.target.value); setOffset(0); }}
          placeholder="Filter by Org ID (UUID)…"
          className="border border-slate-600 bg-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-72 placeholder:text-slate-500"
        />
        <input
          type="text"
          value={edgeType}
          onChange={(e) => { setEdgeType(e.target.value); setOffset(0); }}
          placeholder="Filter by edge type…"
          className="border border-slate-600 bg-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56 placeholder:text-slate-500"
        />
        <button
          onClick={() => { setOffset(0); load(); }}
          className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-violet-700 transition-colors"
        >
          Search
        </button>
      </div>

      {loading && <LoadingState message="Loading edges…" />}
      {error && <ErrorState error={{ message: error }} />}
      {!loading && !error && hasLoaded && edges.length === 0 && (
        <EmptyState title="No edges found" message="No traceability edges found for the given filters." />
      )}
      {!loading && !error && edges.length > 0 && (
        <>
          <div className="space-y-2">
            {edges.map((edge) => (
              <EdgeAdminRow key={edge.id} edge={edge} />
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              disabled={offset === 0}
              onClick={() => { setOffset((o) => Math.max(0, o - limit)); load(); }}
              className="px-3 py-1 border border-slate-600 text-slate-300 rounded hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              ← Prev
            </button>
            <button
              disabled={edges.length < limit}
              onClick={() => { setOffset((o) => o + limit); load(); }}
              className="px-3 py-1 border border-slate-600 text-slate-300 rounded hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              Next →
            </button>
          </div>
        </>
      )}
      {!hasLoaded && !loading && (
        <p className="text-sm text-slate-500 italic">
          Enter filters and press Search to inspect edges cross-tenant.
        </p>
      )}
    </div>
  );
};

// ─── TraceabilityAdmin (root) ─────────────────────────────────────────────────

type AdminTab = 'NODES' | 'EDGES';

export const TraceabilityAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('NODES');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">🔗 Traceability — Cross-Tenant Inspection</h2>
          <p className="text-sm text-slate-400 mt-1">
            G-016 supply-chain traceability data. Controls: none (Phase A: read-only).
          </p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-slate-700 text-slate-300 border border-slate-600">
          READ-ONLY
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-700">
        {(['NODES', 'EDGES'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab === 'NODES' ? '📦 Nodes' : '🔀 Edges'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'NODES' && <NodesAdminTab />}
      {activeTab === 'EDGES' && <EdgesAdminTab />}
    </div>
  );
};
