/**
 * VpcConsole — Control Plane (TTP Slice 5: VPC Generation)
 *
 * Displays a list of Verified Payable Certificates (VPCs).
 * Allows SUPER_ADMIN to:
 *   - Generate a VPC from a VERIFIED invoice (by invoice ID)
 *   - Filter VPCs by state / org / invoice
 *   - Transition: Mark Routing Ready, Void, Expire
 *
 * WARNING: A VPC is a verified payable record only.
 *          It is NOT a payment guarantee, financial instrument,
 *          escrow instruction, or funds commitment of any kind.
 *          No money movement is implied or initiated by VPC generation.
 *
 * Governance: TTP Slice 5, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  adminGenerateVpc,
  adminListVpcs,
  adminTransitionVpc,
  type AdminVpcRecord,
  type VpcListFilters,
} from '../../services/vpcService';
import { APIError } from '../../services/apiClient';
import { VpcStatusBadge } from './VpcStatusBadge';
import { PartnerRoutingStubPanel } from './PartnerRoutingStubPanel';

// ─── Generate VPC dialog ──────────────────────────────────────────────────────

interface GenerateDialogProps {
  onComplete: (vpc: AdminVpcRecord) => void;
  onCancel: () => void;
}

function GenerateDialog({ onComplete, onCancel }: GenerateDialogProps): React.ReactElement {
  const [invoiceId, setInvoiceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!invoiceId.trim()) {
      setError('Invoice ID is required');
      return;
    }
    setLoading(true);
    try {
      const vpc = await adminGenerateVpc(invoiceId.trim());
      onComplete(vpc);
    } catch (err) {
      if (err instanceof APIError) {
        const code = err.code ?? '';
        const codeLabels: Record<string, string> = {
          INVOICE_INELIGIBLE_STATE: 'Invoice is not in VERIFIED state.',
          GST_NOT_APPROVED: 'Seller org does not have an approved GST record.',
          ELIGIBILITY_MISSING: 'No TTP eligibility assessment found for the seller org.',
          ELIGIBILITY_OUTCOME: 'Seller org eligibility outcome is not ELIGIBLE.',
          ELIGIBILITY_EXPIRED: 'Seller org TTP eligibility assessment has expired.',
          RISK_TIER_BLOCKED: 'Seller org risk tier (Thin-file) is not eligible for VPC.',
          AMOUNT_EXCEEDS_CAP: 'Invoice amount exceeds the tier cap for this org.',
          DUE_DATE_MISSING: 'Invoice does not have a due date (required for VPC).',
          VPC_DUPLICATE: 'A non-terminal VPC already exists for this invoice.',
        };
        setError(codeLabels[code] ?? err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Generate VPC</h2>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-4">
          A VPC is a verified payable record only. It is not a payment guarantee,
          financial instrument, or escrow instruction. No funds movement is implied.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="vpc-invoice-id">
              Invoice ID (UUID)
            </label>
            <input
              id="vpc-invoice-id"
              type="text"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={invoiceId}
              onChange={e => setInvoiceId(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Generating…' : 'Generate VPC'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Transition dialog ────────────────────────────────────────────────────────

type AllowedTransitionTarget = 'ROUTING_READY' | 'VOIDED' | 'EXPIRED';

interface TransitionDialogProps {
  vpc: AdminVpcRecord;
  target: AllowedTransitionTarget;
  onComplete: (updated: AdminVpcRecord) => void;
  onCancel: () => void;
}

const TRANSITION_LABELS: Record<AllowedTransitionTarget, string> = {
  ROUTING_READY: 'Mark Routing Ready',
  VOIDED: 'Void VPC',
  EXPIRED: 'Expire VPC',
};

function TransitionDialog({ vpc, target, onComplete, onCancel }: TransitionDialogProps): React.ReactElement {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!reason.trim()) {
      setError('Reason is required');
      return;
    }
    setLoading(true);
    try {
      const updated = await adminTransitionVpc(vpc.id, {
        to_state_key: target,
        reason: reason.trim(),
        void_reason: target === 'VOIDED' ? reason.trim() : null,
      });
      onComplete(updated);
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {TRANSITION_LABELS[target]}
        </h2>
        <p className="text-sm text-gray-600 mb-1">
          VPC: <span className="font-mono text-xs text-gray-700">{vpc.vpc_reference}</span>
        </p>
        <p className="text-sm text-gray-600 mb-4">
          Current state: <VpcStatusBadge state={vpc.state_key} />
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="vpc-transition-reason">
              Reason
            </label>
            <textarea
              id="vpc-transition-reason"
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter reason for this transition…"
              value={reason}
              onChange={e => setReason(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 ${
                target === 'VOIDED'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : target === 'EXPIRED'
                  ? 'bg-gray-600 hover:bg-gray-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              disabled={loading}
            >
              {loading ? 'Processing…' : TRANSITION_LABELS[target]}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── VpcConsole ───────────────────────────────────────────────────────────────

export function VpcConsole(): React.ReactElement {
  const [vpcs, setVpcs] = useState<AdminVpcRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterOrgId, setFilterOrgId] = useState('');
  const [filterInvoiceId, setFilterInvoiceId] = useState('');
  const [filterStateKey, setFilterStateKey] = useState('');

  // Dialogs
  const [showGenerate, setShowGenerate] = useState(false);
  const [transition, setTransition] = useState<{
    vpc: AdminVpcRecord;
    target: AllowedTransitionTarget;
  } | null>(null);
  const [routingStubVpc, setRoutingStubVpc] = useState<AdminVpcRecord | null>(null);

  const fetchVpcs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: VpcListFilters = {};
      if (filterOrgId.trim()) filters.org_id = filterOrgId.trim();
      if (filterInvoiceId.trim()) filters.invoice_id = filterInvoiceId.trim();
      if (filterStateKey) filters.state_key = filterStateKey;
      const data = await adminListVpcs(filters);
      setVpcs(data);
    } catch (err) {
      if (err instanceof APIError && err.code === 'FEATURE_DISABLED') {
        setError('TradeTrust Pay is not currently enabled on this platform.');
      } else {
        setError('Failed to load VPCs. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [filterOrgId, filterInvoiceId, filterStateKey]);

  useEffect(() => {
    fetchVpcs();
  }, [fetchVpcs]);

  function handleGenerateComplete(vpc: AdminVpcRecord) {
    setShowGenerate(false);
    setVpcs(prev => [vpc, ...prev]);
  }

  function handleTransitionComplete(updated: AdminVpcRecord) {
    setTransition(null);
    setVpcs(prev => prev.map(v => (v.id === updated.id ? updated : v)));
  }

  function canTransitionTo(vpc: AdminVpcRecord, target: AllowedTransitionTarget): boolean {
    if (vpc.is_terminal) return false;
    if (vpc.state_key === 'ACTIVE') return true;
    if (vpc.state_key === 'ROUTING_READY') return target === 'VOIDED' || target === 'EXPIRED';
    return false;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">VPC Console</h1>
          <p className="text-sm text-gray-500 mt-1">
            Verified Payable Certificates — admin oversight (TTP Slice 5)
          </p>
        </div>
        <button
          onClick={() => setShowGenerate(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
        >
          Generate VPC
        </button>
      </div>

      {/* Governance notice */}
      <div className="bg-amber-50 border border-amber-200 rounded px-4 py-3 text-xs text-amber-800">
        A Verified Payable Certificate (VPC) is a verified payable record only. It is not a
        payment guarantee, financial instrument, escrow instruction, or commitment of funds.
        No money movement is implied or initiated by VPC generation or transition.
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Org ID</label>
          <input
            type="text"
            className="border border-gray-300 rounded px-2 py-1 text-xs w-60"
            placeholder="Filter by org UUID…"
            value={filterOrgId}
            onChange={e => setFilterOrgId(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Invoice ID</label>
          <input
            type="text"
            className="border border-gray-300 rounded px-2 py-1 text-xs w-60"
            placeholder="Filter by invoice UUID…"
            value={filterInvoiceId}
            onChange={e => setFilterInvoiceId(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">State</label>
          <select
            className="border border-gray-300 rounded px-2 py-1 text-xs"
            value={filterStateKey}
            onChange={e => setFilterStateKey(e.target.value)}
          >
            <option value="">All states</option>
            <option value="ACTIVE">Active</option>
            <option value="ROUTING_READY">Routing Ready</option>
            <option value="TRANSMITTED">Transmitted</option>
            <option value="VOIDED">Voided</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
        <button
          onClick={fetchVpcs}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-rose-700">{error}</p>
      ) : vpcs.length === 0 ? (
        <p className="text-sm text-gray-500">No VPCs found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs border border-gray-200 rounded">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Reference</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">State</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Currency</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600">Amount</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Tier</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Issued</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Expires</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vpcs.map(vpc => (
                <tr key={vpc.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono">{vpc.vpc_reference}</td>
                  <td className="px-3 py-2">
                    <VpcStatusBadge state={vpc.state_key} />
                  </td>
                  <td className="px-3 py-2">{vpc.currency}</td>
                  <td className="px-3 py-2 text-right">
                    {parseFloat(vpc.invoice_amount).toLocaleString('en-IN')}
                  </td>
                  <td className="px-3 py-2">Tier {vpc.risk_tier}</td>
                  <td className="px-3 py-2">{new Date(vpc.issued_at).toLocaleDateString('en-IN')}</td>
                  <td className="px-3 py-2">
                    {vpc.expires_at ? new Date(vpc.expires_at).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {!vpc.is_terminal && (
                      <div className="flex gap-1 flex-wrap">
                        {canTransitionTo(vpc, 'ROUTING_READY') && (
                          <button
                            onClick={() => setTransition({ vpc, target: 'ROUTING_READY' })}
                            className="px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-300 rounded hover:bg-blue-50"
                          >
                            Mark Routing Ready
                          </button>
                        )}
                        {canTransitionTo(vpc, 'VOIDED') && (
                          <button
                            onClick={() => setTransition({ vpc, target: 'VOIDED' })}
                            className="px-2 py-0.5 text-xs font-medium text-rose-700 border border-rose-300 rounded hover:bg-rose-50"
                          >
                            Void
                          </button>
                        )}
                        {canTransitionTo(vpc, 'EXPIRED') && (
                          <button
                            onClick={() => setTransition({ vpc, target: 'EXPIRED' })}
                            className="px-2 py-0.5 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                          >
                            Expire
                          </button>
                        )}
                        {(vpc.state_key === 'ACTIVE' || vpc.state_key === 'ROUTING_READY') && (
                          <button
                            onClick={() => setRoutingStubVpc(vpc)}
                            className="px-2 py-0.5 text-xs font-medium text-indigo-700 border border-indigo-300 rounded hover:bg-indigo-50"
                          >
                            View Routing Stub
                          </button>
                        )}
                      </div>
                    )}
                    {vpc.is_terminal && (
                      <span className="text-gray-400 italic">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showGenerate && (
        <GenerateDialog
          onComplete={handleGenerateComplete}
          onCancel={() => setShowGenerate(false)}
        />
      )}
      {transition && (
        <TransitionDialog
          vpc={transition.vpc}
          target={transition.target}
          onComplete={handleTransitionComplete}
          onCancel={() => setTransition(null)}
        />
      )}
      {routingStubVpc && (
        <PartnerRoutingStubPanel
          vpcId={routingStubVpc.id}
          vpcReference={routingStubVpc.vpc_reference}
          onClose={() => setRoutingStubVpc(null)}
        />
      )}
    </div>
  );
}

export default VpcConsole;
