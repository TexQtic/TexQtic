import {
  CONTROL_PLANE_TENANT_READ_SIDE_HIDE_APPROVED_SLUGS,
  CONTROL_PLANE_TENANT_READ_SIDE_HIDE_PRESERVED_NO_DELETE_SLUGS,
} from '../../server/src/config/controlPlaneTenantReadExclusions';

import type { Tenant } from '../../services/controlPlaneService';

export type TenantVisibilityClassification = 'REAL' | 'QA_TEST_DEMO' | 'PROTECTED';

const approvedHiddenSlugSet = new Set(
  CONTROL_PLANE_TENANT_READ_SIDE_HIDE_APPROVED_SLUGS.map(slug => slug.toLowerCase())
);

const protectedSlugSet = new Set(
  CONTROL_PLANE_TENANT_READ_SIDE_HIDE_PRESERVED_NO_DELETE_SLUGS.map(slug => slug.toLowerCase())
);

const QA_TEST_DEMO_SLUG_PREFIXES = ['qa-', 'test-', 'fam07'] as const;

const QA_TEST_DEMO_SLUG_MARKERS = ['-synthetic', 'runtime-verify', 'verify-corp-synthetic'] as const;

function normalizeSlug(slug: string | null | undefined): string {
  return (slug ?? '').trim().toLowerCase();
}

export function classifyTenantVisibility(tenant: Pick<Tenant, 'slug'>): TenantVisibilityClassification {
  const normalizedSlug = normalizeSlug(tenant.slug);

  if (protectedSlugSet.has(normalizedSlug)) {
    return 'PROTECTED';
  }

  if (approvedHiddenSlugSet.has(normalizedSlug)) {
    return 'QA_TEST_DEMO';
  }

  if (QA_TEST_DEMO_SLUG_PREFIXES.some(prefix => normalizedSlug.startsWith(prefix))) {
    return 'QA_TEST_DEMO';
  }

  if (QA_TEST_DEMO_SLUG_MARKERS.some(marker => normalizedSlug.includes(marker))) {
    return 'QA_TEST_DEMO';
  }

  return 'REAL';
}

export function isQaTestDemoTenant(tenant: Pick<Tenant, 'slug'>): boolean {
  return classifyTenantVisibility(tenant) === 'QA_TEST_DEMO';
}
