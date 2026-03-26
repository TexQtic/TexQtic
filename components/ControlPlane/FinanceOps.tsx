/**
 * FinanceOps — Financial Oversight panel (control-plane, admin-only)
 *
 * Re-anchored to durable settlement provenance for OPS-CASEWORK-001.
 * The operator entry surface now reads canonical RELEASE_DEBIT settlement rows
 * instead of payout-intent EventLog entries. Action-path changes remain out of scope.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  getFinanceRecords,
  FinanceRecord,
} from '../../services/controlPlaneService';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import { EmptyState } from '../shared/EmptyState';

export interface FinanceEscrowBridgeTarget {
  financeRecordId: string;
  tenantId: string;
  escrowId: string;
  referenceId: string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface FinanceOpsProps {
  onOpenEscrowScope?: (_target: FinanceEscrowBridgeTarget) => void;
}

export const FinanceOps: React.FC<FinanceOpsProps> = ({ onOpenEscrowScope }) => {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── List fetch ──────────────────────────────────────────────────────────────

  const loadFinanceRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getFinanceRecords();
      setRecords(response.records);
    } catch (err) {
      console.error('Failed to load finance records:', err);
      setError('Failed to load finance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFinanceRecords();
  }, [loadFinanceRecords]);

  const appliedCount = records.filter(record => record.status === 'APPLIED').length;
  const distinctEscrowCount = new Set(records.map(record => record.escrowId)).size;
  const distinctTenantCount = new Set(records.map(record => record.tenantId)).size;

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <LoadingState message="Loading finance operations..." />;
  if (error) return <ErrorState error={{ message: error }} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Financial Oversight</h1>
          <p className="text-slate-400 text-sm">
            Commission rules, fee adjustments, and payout approvals.
          </p>
        </div>
        <button className="bg-emerald-600 text-white px-4 py-2 rounded font-bold text-xs uppercase">
          Adjust Fee Rules
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="text-slate-500 text-xs font-bold uppercase mb-4">Finance Records</h3>
          <div className="text-3xl font-bold">{records.length}</div>
          <div className="text-xs text-slate-400 mt-2">Durable settlement ledger rows</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="text-slate-500 text-xs font-bold uppercase mb-4">Applied Settlements</h3>
          <div className="text-3xl font-bold text-emerald-400">{appliedCount}</div>
          <div className="text-xs text-slate-400 mt-2">Canonical RELEASE_DEBIT entries</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="text-slate-500 text-xs font-bold uppercase mb-4">Scope</h3>
          <div className="text-3xl font-bold text-sky-300">{distinctEscrowCount}</div>
          <div className="text-xs text-slate-400 mt-2">Escrows across {distinctTenantCount} tenant{distinctTenantCount === 1 ? '' : 's'}</div>
        </div>
      </div>

      <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-xs text-sky-100">
        Finance now reads durable settlement provenance from RELEASE_DEBIT ledger rows. Legacy payout approval actions remain out of scope for this bounded read-contract correction.
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 font-bold uppercase text-[10px] text-slate-400">
          Durable Finance Records
        </div>
        {records.length === 0 ? (
          <EmptyState title="No finance records" message="No durable settlement ledger rows recorded yet" />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-500 border-b border-slate-800">
              <tr>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Settlement ID</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Status</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Tenant</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Escrow</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Reference</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Amount</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Recorded At</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Follow-Through</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {records.map(record => (
                <tr key={record.id} className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-mono text-slate-400 text-xs">
                    {record.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-500 text-xs" title={record.tenantId}>
                    {record.tenantId.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-500 text-xs" title={record.escrowId}>
                    {record.escrowId.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">{record.referenceId || '—'}</td>
                  <td className="px-6 py-4 text-slate-200 text-xs">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: record.currency,
                      minimumFractionDigits: 2,
                    }).format(Number(record.amount))}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {new Date(record.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    {onOpenEscrowScope ? (
                      <button
                        onClick={() => onOpenEscrowScope({
                          financeRecordId: record.id,
                          tenantId: record.tenantId,
                          escrowId: record.escrowId,
                          referenceId: record.referenceId,
                        })}
                        className="rounded border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-300 transition-colors hover:bg-sky-500/20"
                      >
                        Open Escrow
                      </button>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};