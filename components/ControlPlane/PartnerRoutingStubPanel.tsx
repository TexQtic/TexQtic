/**
 * PartnerRoutingStubPanel — Control Plane (TTP Slice 6: Partner Routing Stub)
 *
 * Read-only admin panel to view a partner routing stub for a VPC.
 *
 * WARNING: Routing stub only — no partner transmission, financing approval,
 *          or payment action occurs. A VPC is a verified payable record only,
 *          not a payment guarantee, financial instrument, or escrow instruction.
 *
 * No "Send", "Transmit", "Submit to Bank", "Fund", or "Route Now" button.
 *
 * Governance: TTP Slice 6, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import React, { useState } from 'react';
import {
  adminGetPartnerRoutingStub,
  type AdminRoutingStubRecord,
  type RoutingStubPayload,
} from '../../services/partnerRoutingService';
import { APIError } from '../../services/apiClient';

// ─── Props ────────────────────────────────────────────────────────────────────

interface PartnerRoutingStubPanelProps {
  vpcId: string;
  vpcReference: string;
  onClose: () => void;
}

// ─── Row component ────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 w-48 shrink-0">{label}</span>
      <span className="text-xs text-gray-900 font-mono break-all">{value ?? <span className="text-gray-400 italic">—</span>}</span>
    </div>
  );
}

// ─── Section component ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 pb-1 border-b border-gray-200">
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─── Payload view ─────────────────────────────────────────────────────────────

function StubPayloadView({ payload }: { payload: RoutingStubPayload }): React.ReactElement {
  return (
    <div>
      <Section title="VPC">
        <InfoRow label="VPC ID" value={payload.vpc_id} />
        <InfoRow label="VPC Reference" value={payload.vpc_reference} />
        <InfoRow label="VPC State" value={payload.vpc_state} />
        <InfoRow label="VPC Expires At" value={payload.vpc_expires_at} />
      </Section>

      <Section title="Invoice">
        <InfoRow label="Invoice ID" value={payload.invoice_id} />
        <InfoRow label="Invoice Number" value={payload.invoice_number} />
        <InfoRow label="Invoice Date" value={payload.invoice_date} />
        <InfoRow label="Invoice Due Date" value={payload.invoice_due_date} />
        <InfoRow label="Amount" value={`${payload.currency} ${payload.amount}`} />
      </Section>

      <Section title="Seller">
        <InfoRow label="Seller Org ID" value={payload.seller_org_id} />
        <InfoRow label="Legal Name" value={payload.seller_legal_name} />
        <InfoRow label="GSTIN" value={payload.seller_gstin} />
        <InfoRow label="GST Status" value={payload.seller_gst_status} />
      </Section>

      <Section title="Buyer">
        <InfoRow label="Buyer Org ID" value={payload.buyer_org_id} />
        <InfoRow label="Legal Name" value={payload.buyer_legal_name} />
      </Section>

      <Section title="Trade">
        <InfoRow label="Trade ID" value={payload.trade_id} />
        <InfoRow label="Trade Reference" value={payload.trade_reference} />
      </Section>

      <Section title="TTP Eligibility">
        <InfoRow label="Risk Tier" value={String(payload.ttp_risk_tier)} />
        <InfoRow label="Eligibility Outcome" value={payload.ttp_eligibility_outcome} />
        <InfoRow label="Eligibility Valid Until" value={payload.ttp_eligibility_valid_until} />
        <InfoRow label="Max Invoice Amount" value={payload.ttp_max_invoice_amount} />
      </Section>

      <Section title="Metadata">
        <InfoRow label="Generated At" value={payload.generated_at} />
      </Section>

      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
        {payload.disclaimer}
      </div>
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function PartnerRoutingStubPanel({
  vpcId,
  vpcReference,
  onClose,
}: PartnerRoutingStubPanelProps): React.ReactElement {
  const [stub, setStub] = useState<AdminRoutingStubRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function handleLoad() {
    setError(null);
    setLoading(true);
    try {
      const result = await adminGetPartnerRoutingStub(vpcId);
      setStub(result);
      setLoaded(true);
    } catch (err) {
      if (err instanceof APIError) {
        const codeLabels: Record<string, string> = {
          ROUTING_STUB_VPC_VOIDED: 'This VPC is VOIDED and cannot have a routing stub.',
          ROUTING_STUB_VPC_EXPIRED: 'This VPC is EXPIRED and cannot have a routing stub.',
          ROUTING_STUB_VPC_TERMINAL: 'This VPC is in a terminal state and cannot have a routing stub.',
        };
        setError(codeLabels[err.code ?? ''] ?? err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Routing Stub</h2>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{vpcReference}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Governance warning */}
        <div className="px-6 pt-3">
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            <strong>Read-only:</strong> Routing stub only — no partner transmission, financing approval,
            or payment action occurs. No money movement is implied.
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!loaded && (
            <div className="flex flex-col items-center py-8 gap-4">
              <p className="text-sm text-gray-600">
                Click the button below to load the routing stub for this VPC.
              </p>
              {error && (
                <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2 w-full text-center">
                  {error}
                </p>
              )}
              <button
                onClick={handleLoad}
                disabled={loading}
                className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Loading…' : 'Load Routing Stub'}
              </button>
            </div>
          )}

          {loaded && stub && (
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="text-xs font-medium text-gray-500">Stub ID:</span>
                <span className="text-xs font-mono text-gray-700">{stub.id}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {stub.transmission_status}
                </span>
              </div>
              <StubPayloadView payload={stub.payload} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
