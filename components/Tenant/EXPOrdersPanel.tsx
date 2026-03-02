/**
 * EXPOrdersPanel — EXPERIENCE shell Orders panel (OPS-EXPERIENCE-ORDERS-UX-001 / GAP-EXP-ORDERS-001)
 *
 * Shell constraint: EXPERIENCE only. Must never be imported by WL_ADMIN shell.
 * Equivalent capability to WLOrdersPanel (TECS 2 / GAP-WL-ORDERS-001).
 * Do NOT merge or cross-import between shells — intentional separation (B1/D-5).
 *
 * Derived status semantics (canonical RCP-1 algorithm — MUST NOT be reinterpreted):
 *   The DB OrderStatus enum only has PAYMENT_PENDING | PLACED | CANCELLED.
 *   Derivation order (semantic source of truth = audit_logs):
 *     1) CANCELLED  — order.status === 'CANCELLED'
 *     2) FULFILLED  — audit contains 'order.lifecycle.FULFILLED' for orderId
 *     3) CONFIRMED  — audit contains 'order.lifecycle.CONFIRMED' for orderId
 *     4) PAYMENT_PENDING — order.status === 'PAYMENT_PENDING'
 *     5) PLACED     — order.status === 'PLACED' (no lifecycle audit yet)
 *   TODO(GAP-ORDER-LC-001): Replace derivation with direct CONFIRMED/FULFILLED enum
 *   values once the schema wave adds those to OrderStatus.
 *
 * Role gate: EXPERIENCE users may manage orders through this panel.
 *   The server-side PATCH /api/tenant/orders/:id/status enforces OWNER/ADMIN role (B1/D-5).
 *   Client-side we show actions to all users and rely on the server gate.
 *
 * Non-goals: no new backend routes, no schema/RLS changes, no G-020 SM references,
 *   no shell merge with WL_ADMIN. Uses exactly the TECS 1 endpoint.
 */

import { useState, useEffect, useCallback } from 'react';
import { tenantGet, tenantPatch } from '../../services/tenantApiClient';

// ─── Local types (tenant API shapes — NOT the control-plane AuditLogEntry in types.ts) ──

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface Order {
  id: string;
  status: 'PAYMENT_PENDING' | 'PLACED' | 'CANCELLED';
  grandTotal?: number | null;
  createdAt: string;
  items?: OrderItem[];
}

interface BackendAuditEntry {
  id: string;
  action: string;
  entityId?: string | null;
  createdAt: string;
}

type OrdersResponse = { orders: Order[]; count: number };
type AuditResponse  = { logs: BackendAuditEntry[]; count: number };

// Semantic status — superset of DB enum; displayed in UI
type DerivedStatus   = 'PAYMENT_PENDING' | 'CONFIRMED' | 'PLACED' | 'FULFILLED' | 'CANCELLED';
type TransitionTarget = 'CONFIRMED' | 'FULFILLED' | 'CANCELLED';

interface ConfirmDialog {
  orderId: string;
  target: TransitionTarget;
}

interface Props {
  /** Called when the user navigates back to the storefront home view. */
  onBack: () => void;
}

// ─── Canonical RCP-1 derived-status algorithm ────────────────────────────────
// TODO(GAP-ORDER-LC-001): remove this derivation once CONFIRMED/FULFILLED are
// first-class OrderStatus enum values; replace with direct order.status read.

function deriveStatus(order: Order, auditLogs: BackendAuditEntry[]): DerivedStatus {
  if (order.status === 'CANCELLED') return 'CANCELLED';
  const orderAudits = auditLogs.filter(l => l.entityId === order.id);
  if (orderAudits.some(l => l.action === 'order.lifecycle.FULFILLED')) return 'FULFILLED';
  if (orderAudits.some(l => l.action === 'order.lifecycle.CONFIRMED')) return 'CONFIRMED';
  if (order.status === 'PAYMENT_PENDING') return 'PAYMENT_PENDING';
  return 'PLACED';
}

// ─── Status badge ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<DerivedStatus, string> = {
  PAYMENT_PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
  CONFIRMED:       'bg-blue-50 text-blue-700 border border-blue-200',
  PLACED:          'bg-slate-50 text-slate-600 border border-slate-200',
  FULFILLED:       'bg-emerald-50 text-emerald-700 border border-emerald-200',
  CANCELLED:       'bg-red-50 text-red-600 border border-red-200',
};

const STATUS_LABELS: Record<DerivedStatus, string> = {
  PAYMENT_PENDING: 'Pending',
  CONFIRMED:       'Confirmed',
  PLACED:          'Placed',
  FULFILLED:       'Fulfilled',
  CANCELLED:       'Cancelled',
};

function StatusBadge({ status }: { status: DerivedStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// ─── Action buttons per derived status ──────────────────────────────────────

function getActions(derived: DerivedStatus): TransitionTarget[] {
  if (derived === 'PAYMENT_PENDING')                    return ['CONFIRMED', 'CANCELLED'];
  if (derived === 'CONFIRMED' || derived === 'PLACED')  return ['FULFILLED', 'CANCELLED'];
  return []; // FULFILLED | CANCELLED — terminal
}

const ACTION_LABELS: Record<TransitionTarget, string> = {
  CONFIRMED: 'Confirm',
  FULFILLED: 'Fulfill',
  CANCELLED: 'Cancel',
};

const ACTION_STYLES: Record<TransitionTarget, string> = {
  CONFIRMED: 'bg-blue-600 hover:bg-blue-700 text-white',
  FULFILLED: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  CANCELLED: 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200',
};

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-300">
      {message}
    </div>
  );
}

// ─── Confirm dialog ──────────────────────────────────────────────────────────

function ConfirmDialogModal({
  dialog,
  loading,
  onConfirm,
  onCancel,
}: {
  dialog: ConfirmDialog;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
        <h3 className="font-bold text-slate-900 text-lg">Confirm action</h3>
        <p className="text-slate-600 text-sm">
          Mark this order as{' '}
          <span className="font-semibold">{ACTION_LABELS[dialog.target]}</span>?
          {dialog.target === 'CANCELLED' && (
            <span className="block mt-1 text-red-600">This cannot be undone.</span>
          )}
        </p>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition disabled:opacity-50 ${ACTION_STYLES[dialog.target]}`}
          >
            {loading ? 'Processing...' : ACTION_LABELS[dialog.target]}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2 rounded-lg font-bold text-sm text-slate-600 hover:text-slate-900 border border-slate-200 transition disabled:opacity-50"
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main panel ──────────────────────────────────────────────────────────────

export function EXPOrdersPanel({ onBack }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [auditLogs, setAuditLogs] = useState<BackendAuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch orders + order lifecycle audit entries in parallel (both tenant-realm)
  // EXPERIENCE must fetch audit-logs because FULFILLED/CONFIRMED are audit-only
  // (see TODO(GAP-ORDER-LC-001) — no new backend routes per RCP-1 ceiling).
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, auditRes] = await Promise.all([
        tenantGet<OrdersResponse>('/api/tenant/orders'),
        tenantGet<AuditResponse>('/api/tenant/audit-logs'),
      ]);
      setOrders(ordersRes.orders);
      setAuditLogs(auditRes.logs.filter(l => l.action.startsWith('order.lifecycle.')));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const openConfirm = (orderId: string, target: TransitionTarget) =>
    setConfirmDialog({ orderId, target });

  const handleAction = async () => {
    if (!confirmDialog) return;
    const { orderId, target } = confirmDialog;
    setActionLoading(prev => ({ ...prev, [orderId]: true }));
    setConfirmDialog(null);
    try {
      // Uses TECS 1 endpoint — PATCH /api/tenant/orders/:id/status
      await tenantPatch<unknown>(`/api/tenant/orders/${orderId}/status`, { status: target });
      showToast(`Order ${ACTION_LABELS[target].toLowerCase()}d successfully`);
      await fetchData();
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : `Failed to ${ACTION_LABELS[target].toLowerCase()} order`,
      );
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <button
            onClick={onBack}
            className="text-xs font-semibold text-slate-400 hover:text-slate-700 mb-2 flex items-center gap-1 transition"
          >
            ← Back
          </button>
          <h2 className="text-xl font-bold text-slate-800">Orders</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage customer orders and fulfillment status.
          </p>
        </div>
        <button
          onClick={() => void fetchData()}
          disabled={loading}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition disabled:opacity-40"
        >
          {loading ? 'Refreshing…' : '↺ Refresh'}
        </button>
      </div>

      {/* Loading */}
      {loading && orders.length === 0 && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-800 mx-auto" />
          <p className="mt-4 text-slate-500 text-sm">Loading orders…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && orders.length === 0 && (
        <div className="text-center py-16 text-slate-400 text-sm">
          No orders yet. Orders placed by buyers will appear here.
        </div>
      )}

      {/* Orders table */}
      {orders.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Order ID</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Amount</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map(order => {
                const derived = deriveStatus(order, auditLogs);
                const actions = getActions(derived);
                const isActing = actionLoading[order.id] ?? false;

                return (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-500">
                      {order.id.slice(0, 8)}…
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {new Date(order.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">
                      {order.grandTotal != null
                        ? `$${Number(order.grandTotal).toFixed(2)}`
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={derived} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {(() => {
                        if (isActing) {
                          return <span className="text-xs text-slate-400 italic">Processing…</span>;
                        }
                        if (actions.length === 0) {
                          return <span className="text-xs text-slate-300">—</span>;
                        }
                        return (
                          <div className="flex gap-2 justify-end">
                            {actions.map(target => (
                              <button
                                key={target}
                                onClick={() => openConfirm(order.id, target)}
                                className={`px-3 py-1 rounded-lg font-semibold text-xs transition ${ACTION_STYLES[target]}`}
                              >
                                {ACTION_LABELS[target]}
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmDialog && (
        <ConfirmDialogModal
          dialog={confirmDialog}
          loading={actionLoading[confirmDialog.orderId] ?? false}
          onConfirm={() => void handleAction()}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* Toast */}
      <Toast message={toast} />
    </div>
  );
}
