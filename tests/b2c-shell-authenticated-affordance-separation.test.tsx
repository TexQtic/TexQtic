import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../contexts/CartContext', () => ({
  useCart: () => ({ itemCount: 0 }),
}));

import { B2CShell } from '../layouts/Shells';
import { TenantStatus, TenantType, type TenantConfig } from '../types';

function makeTenant(): TenantConfig {
  return {
    id: 'b2c-tenant-1',
    slug: 'texqtic-b2c',
    name: 'TexQtic B2C',
    type: TenantType.B2C,
    tenant_category: TenantType.B2C,
    is_white_label: false,
    status: TenantStatus.ACTIVE,
    plan: 'PROFESSIONAL',
    theme: {
      primaryColor: '#4f46e5',
      secondaryColor: '#0f172a',
      logo: 'T',
    },
    features: [],
    aiBudget: 0,
    aiUsage: 0,
    billingStatus: 'CURRENT',
    riskScore: 0,
  };
}

function renderShell(showAuthenticatedAffordances: boolean) {
  return renderToStaticMarkup(
    <B2CShell
      tenant={makeTenant()}
      onNavigateTeam={() => undefined}
      onNavigateHome={() => undefined}
      onNavigateOrders={() => undefined}
      onNavigateDpp={() => undefined}
      onNavigateEscrow={() => undefined}
      onNavigateEscalations={() => undefined}
      onNavigateSettlement={() => undefined}
      onNavigateCertifications={() => undefined}
      onNavigateTraceability={() => undefined}
      onNavigateAuditLogs={() => undefined}
      onNavigateTrades={() => undefined}
      onNavigateCart={() => undefined}
      showAuthenticatedAffordances={showAuthenticatedAffordances}
      b2cSearchValue="linen"
      onB2CSearchChange={() => undefined}
    >
      <section>New Arrivals</section>
    </B2CShell>,
  );
}

describe('MODE-COMPLETENESS-B2C-SHELL-AUTHENTICATED-AFFORDANCE-SEPARATION — B2C shell boundary', () => {
  it('preserves the branded entry-facing frame while hiding authenticated-only affordances on the exact home path', () => {
    const html = renderShell(false);

    expect(html).toContain('TexQtic B2C');
    expect(html).toContain('Search our collection...');
    expect(html).toContain('value="linen"');
    expect(html).toContain('New Arrivals');
    expect(html).not.toContain('Orders');
    expect(html).not.toContain('DPP Passport');
    expect(html).not.toContain('Escrow');
    expect(html).not.toContain('Escalations');
    expect(html).not.toContain('Settlement');
    expect(html).not.toContain('Certifications');
    expect(html).not.toContain('Traceability');
    expect(html).not.toContain('Audit Log');
    expect(html).not.toContain('Trades');
    expect(html).not.toContain('Team');
    expect(html).not.toContain('Shopping Cart');
  });

  it('continues to render authenticated-only affordances away from the exact home path', () => {
    const html = renderShell(true);

    expect(html).toContain('Orders');
    expect(html).toContain('DPP Passport');
    expect(html).toContain('Escrow');
    expect(html).toContain('Shopping Cart');
    expect(html).toContain('Team');
  });
});