/**
 * WLStorefront — White-Label Storefront Page (PW5-WL1)
 *
 * The first tenant-facing white-label surface.
 * Renders the full tenant catalog via ProductGrid.
 *
 * Constitutional compliance:
 *   tenantId is NEVER passed by the client (including this component).
 *   Tenant identity is resolved exclusively from:
 *     1. Tenant JWT (primary)
 *     2. Domain → tenant resolver (future: PW5-WL2)
 *   This prevents cross-tenant data leakage.
 *
 * Scope (PW5-WL1):
 *   ✅ Render ProductGrid with live catalog data
 *   ✅ Loading / empty / error states (delegated to ProductGrid)
 *   ❌ Cart / checkout — out of scope (PW5-WL2+)
 *   ❌ Collections — out of scope (PW5-WL1)
 *   ❌ Search / filter — out of scope (PW5-WL1)
 *
 * Architecture:
 *   White-Label Domain
 *     → Tenant Resolver
 *       → Tenant JWT
 *         → GET /api/tenant/catalog/items
 *           → ProductGrid
 *             → ProductCard
 */

import React from 'react';
import { ProductGrid } from './ProductGrid';

export function WLStorefront() {
  return (
    <div className="animate-in fade-in duration-300">
      {/* Page heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Products
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Browse the catalogue
        </p>
      </div>

      {/* Product grid — fetches tenant catalog items via JWT-scoped endpoint */}
      <ProductGrid />
    </div>
  );
}
