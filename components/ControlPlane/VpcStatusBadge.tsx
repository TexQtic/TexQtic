/**
 * VpcStatusBadge — Control Plane (TTP Slice 5: VPC Generation)
 *
 * Renders a colour-coded badge for a VPC state key.
 *
 * States:
 *   ACTIVE        → green
 *   ROUTING_READY → blue
 *   TRANSMITTED   → purple
 *   VOIDED        → red
 *   EXPIRED       → gray
 *
 * WARNING: VPC status reflects a verified payable record only.
 *          It does NOT indicate a payment guarantee or financial commitment.
 *
 * Governance: TTP Slice 5, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import React from 'react';
import type { VpcStateKey } from '../../services/vpcService';

interface VpcStatusBadgeProps {
  state: VpcStateKey | string;
}

const STATE_STYLES: Record<string, string> = {
  ACTIVE:        'bg-emerald-100 text-emerald-700',
  ROUTING_READY: 'bg-blue-100 text-blue-700',
  TRANSMITTED:   'bg-purple-100 text-purple-700',
  VOIDED:        'bg-rose-100 text-rose-700',
  EXPIRED:       'bg-gray-100 text-gray-600',
};

const STATE_LABELS: Record<string, string> = {
  ACTIVE:        'Active',
  ROUTING_READY: 'Routing Ready',
  TRANSMITTED:   'Transmitted',
  VOIDED:        'Voided',
  EXPIRED:       'Expired',
};

export function VpcStatusBadge({ state }: VpcStatusBadgeProps): React.ReactElement {
  const cls = STATE_STYLES[state] ?? 'bg-gray-100 text-gray-600';
  const label = STATE_LABELS[state] ?? state;

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

export default VpcStatusBadge;
