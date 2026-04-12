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
      navigation={{
        surface: {
          activeRouteKey: 'home',
          activeNavigationKey: 'HOME',
          defaultRouteKey: 'home',
          items: [
            { routeKey: 'home', navigationKey: 'HOME', routeGroupKey: 'home_landing', active: true },
            { routeKey: 'orders', navigationKey: 'ORDERS', routeGroupKey: 'orders_operations', active: false },
            { routeKey: 'dpp', navigationKey: 'DPP', routeGroupKey: 'operational_workspace', active: false },
            { routeKey: 'escrow', navigationKey: 'ESCROW', routeGroupKey: 'operational_workspace', active: false },
            { routeKey: 'escalations', navigationKey: 'ESCALATIONS', routeGroupKey: 'operational_workspace', active: false },
            { routeKey: 'settlement', navigationKey: 'SETTLEMENT', routeGroupKey: 'operational_workspace', active: false },
            { routeKey: 'certifications', navigationKey: 'CERTIFICATIONS', routeGroupKey: 'operational_workspace', active: false },
            { routeKey: 'traceability', navigationKey: 'TRACEABILITY', routeGroupKey: 'operational_workspace', active: false },
            { routeKey: 'audit_logs', navigationKey: 'AUDIT_LOGS', routeGroupKey: 'operational_workspace', active: false },
            { routeKey: 'trades', navigationKey: 'TRADES', routeGroupKey: 'operational_workspace', active: false },
            { routeKey: 'cart', navigationKey: 'CART', routeGroupKey: 'cart_commerce', active: false },
          ],
        },
        onNavigateRoute: () => undefined,
        onNavigateTeam: () => undefined,
        showAuthenticatedAffordances,
        b2cSearchValue: 'linen',
        onB2CSearchChange: () => undefined,
      }}
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
    expect(html).not.toContain('data-mobile-nav="b2c"');
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

    expect(html).toContain('data-mobile-nav="b2c"');
    expect(html).toContain('Orders');
    expect(html).toContain('DPP Passport');
    expect(html).toContain('Escrow');
    expect(html).toContain('Shopping Cart');
    expect(html).toContain('Team');
  });
});