const APPROVED_READ_SIDE_HIDE_SLUG_COUNT = 44;

export const CONTROL_PLANE_TENANT_READ_SIDE_HIDE_APPROVED_SLUGS = [
  'test-tenant-nll-other-f333d3c9-7cc7995d',
  'test-tenant-nll-owner-f333d3c9-3904418f',
  'test-tenant-ni-route-other-201518c0',
  'test-tenant-ni-route-owner-5adce6d0',
  'test-tenant-sri-other-ada20264',
  'test-tenant-sri-supplier-2-00f18b4a',
  'test-tenant-sri-supplier-1-d51e0a13',
  'test-tenant-sri-owner-66a00c2f',
  'test-tenant-ns-comp-dup-member-1c37aa07',
  'test-tenant-ns-prev-mat-member-1ba324dc',
  'test-tenant-ns-prev-member-a5fbe6d8',
  'test-tenant-ns-member-org-9faafb2b',
  'test-tenant-ns-route-other-b33663d6',
  'test-tenant-ns-route-owner-2c8611a0',
  'test-tenant-rfq-read-other-094d5dde',
  'test-tenant-rfq-read-owner-6b707770',
  'test-tenant-award-route-supplier-e77ec63d',
  'test-tenant-award-route-owner-7f7f1a07',
  'test-tenant-rfq-route-other-9eae5cf5',
  'test-tenant-rfq-route-owner-33416ed7',
  'test-tenant-nll-other-43b6a714-2d3bf800',
  'test-tenant-nll-owner-43b6a714-320e600a',
  'test-tenant-email-verification-1779163982162',
  'b2c-browse-proof-20260402080229',
  'activation-verify-2026-04-02-org-status-close-gate-exec',
  'activation-verify-2026-04-01-deep-dive-exec',
  'test-tenant-92693230-db1b-464b-be30-27001e6f1075-1daa4fbc',
  'test-tenant-92693230-db1b-464b-be30-27001e6f1075-4b7e9738',
  'test-tenant-92693230-db1b-464b-be30-27001e6f1075-af635052',
  'test-tenant-365daeb5-1236-4129-85b5-76fa2c7c8233-f678ad58',
  'test-tenant-365daeb5-1236-4129-85b5-76fa2c7c8233-4cb0014e',
  'test-tenant-365daeb5-1236-4129-85b5-76fa2c7c8233-092a4636',
  'test-tenant-59d5422e-53f8-4f6a-b023-b7ee85e8ad7c-3df1138c',
  'test-tenant-59d5422e-53f8-4f6a-b023-b7ee85e8ad7c-1269c633',
  'test-tenant-59d5422e-53f8-4f6a-b023-b7ee85e8ad7c-e30e20b3',
  'test-tenant-2c615571-e305-413f-aeac-4731a1b359c3-719592c3',
  'test-tenant-2c615571-e305-413f-aeac-4731a1b359c3-21245947',
  'test-tenant-2c615571-e305-413f-aeac-4731a1b359c3-aad3f4ef',
  'test-tenant-fe163be8-a177-4847-bae2-030eb41cbcb6-51206629',
  'test-tenant-fe163be8-a177-4847-bae2-030eb41cbcb6-2d974209',
  'test-tenant-fe163be8-a177-4847-bae2-030eb41cbcb6-d3d6228d',
  'test-tenant-fff6eb57-fac7-4587-8a35-6cac006f833b-f638febf',
  'test-tenant-fff6eb57-fac7-4587-8a35-6cac006f833b-254c8dfd',
  'test-tenant-fff6eb57-fac7-4587-8a35-6cac006f833b-f49b0ca1',
] as const;

export const CONTROL_PLANE_TENANT_READ_SIDE_HIDE_PRESERVED_NO_DELETE_SLUGS = [
  'test-tenant-f527b7d2-62e5-4593-92c3-69a807a99c0d-24aa7ecb',
  'test-tenant-f527b7d2-62e5-4593-92c3-69a807a99c0d-97b96136',
  'test-tenant-wave2-1774063117878',
  'qa-b2b',
  'qa-b2c',
  'qa-wl',
  'qa-agg',
  'qa-pend',
  'white-label-co',
  'wl-verify-s1-20260328-0510',
  'wl-verify-s1-20260328-0445',
  'wl-verify-s1-20260328-0440',
  'shraddha-industries',
  'acme-corp-live-verify',
  'ops-casework-seller-681cd6f6',
  'ops-casework-buyer-e13b66cb',
] as const;

type TenantSlugCarrier = {
  slug: string;
};

function normalizeTenantSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

const approvedSlugSet = new Set(
  CONTROL_PLANE_TENANT_READ_SIDE_HIDE_APPROVED_SLUGS.map(normalizeTenantSlug),
);

const preservedNoDeleteSlugSet = new Set(
  CONTROL_PLANE_TENANT_READ_SIDE_HIDE_PRESERVED_NO_DELETE_SLUGS.map(normalizeTenantSlug),
);

const duplicateApprovedSlugs = CONTROL_PLANE_TENANT_READ_SIDE_HIDE_APPROVED_SLUGS.filter(
  (slug, index, all) =>
    all.findIndex(candidate => normalizeTenantSlug(candidate) === normalizeTenantSlug(slug)) !== index,
).map(normalizeTenantSlug);

const preservedOverlapSlugs = Array.from(approvedSlugSet).filter(slug =>
  preservedNoDeleteSlugSet.has(slug),
);

export function getControlPlaneTenantReadSideHideGuardrailReport(): {
  approvedCount: number;
  approvedUniqueCount: number;
  duplicateApprovedSlugs: string[];
  preservedOverlapSlugs: string[];
  expectedApprovedCount: number;
} {
  return {
    approvedCount: CONTROL_PLANE_TENANT_READ_SIDE_HIDE_APPROVED_SLUGS.length,
    approvedUniqueCount: approvedSlugSet.size,
    duplicateApprovedSlugs,
    preservedOverlapSlugs,
    expectedApprovedCount: APPROVED_READ_SIDE_HIDE_SLUG_COUNT,
  };
}

export function assertControlPlaneTenantReadSideHideGuardrails(): void {
  const report = getControlPlaneTenantReadSideHideGuardrailReport();

  if (report.approvedCount !== report.expectedApprovedCount) {
    throw new Error(
      `CONTROL_PLANE_TENANT_READ_SIDE_HIDE_GUARDRAIL_COUNT_MISMATCH: expected ${report.expectedApprovedCount}, received ${report.approvedCount}`,
    );
  }

  if (report.approvedUniqueCount !== report.expectedApprovedCount) {
    throw new Error(
      `CONTROL_PLANE_TENANT_READ_SIDE_HIDE_GUARDRAIL_UNIQUE_COUNT_MISMATCH: expected ${report.expectedApprovedCount}, received ${report.approvedUniqueCount}`,
    );
  }

  if (report.duplicateApprovedSlugs.length > 0) {
    throw new Error(
      `CONTROL_PLANE_TENANT_READ_SIDE_HIDE_GUARDRAIL_DUPLICATE_SLUGS: ${report.duplicateApprovedSlugs.join(',')}`,
    );
  }

  if (report.preservedOverlapSlugs.length > 0) {
    throw new Error(
      `READ_SIDE_HIDE_BLOCKED_BY_GUARDRAIL_VIOLATION: ${report.preservedOverlapSlugs.join(',')}`,
    );
  }
}

assertControlPlaneTenantReadSideHideGuardrails();

export function isControlPlaneTenantExcludedFromLaunchFacingList(slug: string): boolean {
  return approvedSlugSet.has(normalizeTenantSlug(slug));
}

export function filterControlPlaneLaunchFacingTenantList<T extends TenantSlugCarrier>(
  tenants: readonly T[],
): T[] {
  return tenants.filter(tenant => !isControlPlaneTenantExcludedFromLaunchFacingList(tenant.slug));
}