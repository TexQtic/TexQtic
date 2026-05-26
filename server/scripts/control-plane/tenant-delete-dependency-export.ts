import 'dotenv/config';

import { PrismaClient } from '@prisma/client';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type CandidateGroup =
  | 'ACTIVE_SAFE_CANDIDATE'
  | 'CLOSED_SAFE_CANDIDATE'
  | 'PROTECTED_NO_ACTION_INPUT'
  | 'AMBIGUOUS_NO_ACTION_INPUT';

type Classification =
  | 'DELETE_POSSIBLE'
  | 'DELETE_BLOCKED'
  | 'DELETE_UNSUPPORTED'
  | 'PROTECTED_NO_ACTION'
  | 'AMBIGUOUS_NO_ACTION';

type BlockerCode =
  | 'PROTECTED_QA_BASELINE'
  | 'PROTECTED_WL_BASELINE'
  | 'AMBIGUOUS_REQUIRES_PARESH_DECISION'
  | 'UNSUPPORTED_NO_DELETE_ROUTE'
  | 'BLOCKED_REASONING_LOG_DEPENDENCY'
  | 'BLOCKED_TRADE_DOMAIN_DEPENDENCY'
  | 'BLOCKED_RFQ_DOMAIN_DEPENDENCY'
  | 'BLOCKED_TRACEABILITY_DEPENDENCY'
  | 'BLOCKED_DPP_DEPENDENCY'
  | 'BLOCKED_TTP_FINANCE_DEPENDENCY'
  | 'BLOCKED_AUDIT_EVIDENCE_RETENTION'
  | 'BLOCKED_UNKNOWN_RELATION'
  | 'BLOCKED_TENANT_NOT_FOUND'
  | 'BLOCKED_STATUS_MISMATCH';

type ExportCounters = {
  membershipCount: number | null;
  userCountViaMemberships: number | null;
  domainCount: number | null;
  tenantBrandingCount: number | null;
  auditLogCount: number | null;
  eventLogCount: number | null;
  reasoningLogCount: number | null;
  marketplaceCatalogCount: number | null;
  cartCount: number | null;
  marketplaceCartSummaryCount: number | null;
  rfqCountAsBuyer: number | null;
  rfqCountAsSupplier: number | null;
  rfqResponseCount: number | null;
  orderCount: number | null;
  orderItemCount: number | null;
  tradeCount: number | null;
  tradeEventCount: number | null;
  invoiceCount: number | null;
  vpcCount: number | null;
  escrowCount: number | null;
  escalationCount: number | null;
  sanctionsCount: number | null;
  traceabilityNodeCount: number | null;
  traceabilityEdgeCount: number | null;
  dppPassportCount: number | null;
  dppEvidenceClaimCount: number | null;
  dppEvidenceItemCount: number | null;
  tenantFeatureOverrideCount: number | null;
  aiBudgetCount: number | null;
  aiUsageMeterCount: number | null;
  inviteCount: number | null;
  impersonationSessionCount: number | null;
  refreshTokenCountViaMembers: number | null;
  wlDomainCount: number | null;
  wlCustomDomainCount: number | null;
  crmCaeReferenceCount: number | null;
  otherDependencyCounts: Record<string, number | null>;
};

type TenantResult = {
  tenantId: string | null;
  tenantSlug: string;
  tenantName: string | null;
  tenantStatus: string | null;
  onboardingStatus: string | null;
  organizationId: string | null;
  candidateGroup: CandidateGroup;
  classification: Classification;
  blockerReasons: BlockerCode[];
  evidenceSnapshotRef: string;
  schemaGapNotes: string[];
} & ExportCounters;

type CountAttempt = {
  value: number | null;
  schemaGap: boolean;
  notes: string[];
};

const SCRIPT_VERSION = 'v1.0.0-readonly-export';
const NO_MUTATION_STATEMENT =
  'This report is read-only. No tenant deletion, archive, lifecycle mutation, or database write was performed.';

const activeSafeCandidates = [
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
] as const;

const closedSafeCandidates = [
  'test-tenant-email-verification-1779163982162',
  'b2c-browse-proof-20260402080229',
  'activation-verify-2026-04-02-org-status-close-gate-exec',
  'activation-verify-2026-04-01-deep-dive-exec',
  'test-tenant-f527b7d2-62e5-4593-92c3-69a807a99c0d-24aa7ecb',
  'test-tenant-f527b7d2-62e5-4593-92c3-69a807a99c0d-97b96136',
  'test-tenant-92693230-db1b-464b-be30-27001e6f1075-1daa4fbc',
  'test-tenant-92693230-db1b-464b-be30-27001e6f1075-4b7e9738',
  'test-tenant-92693230-db1b-464b-be30-27001e6f1075-af635052',
  'test-tenant-365daeb5-1236-4129-85b5-76fa2c7c8233-f678ad58',
  'test-tenant-365daeb5-1236-4129-85b5-76fa2c7c8233-4cb0014e',
  'test-tenant-365daeb5-1236-4129-85b5-76fa2c7c8233-092a4636',
  'test-tenant-wave2-1774063117878',
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

const protectedNoAction = [
  'qa-b2b',
  'qa-b2c',
  'qa-wl',
  'qa-agg',
  'qa-pend',
  'white-label-co',
  'wl-verify-s1-20260328-0510',
  'wl-verify-s1-20260328-0445',
  'wl-verify-s1-20260328-0440',
  'white-label-co::WHITE LABEL CO',
] as const;

const ambiguousNoAction = [
  'shraddha-industries',
  'acme-corp-live-verify',
  'ops-casework-seller-681cd6f6',
  'ops-casework-buyer-e13b66cb',
] as const;

const criticalCounterKeys = {
  reasoningLogCount: 'BLOCKED_REASONING_LOG_DEPENDENCY',
  tradeCount: 'BLOCKED_TRADE_DOMAIN_DEPENDENCY',
  tradeEventCount: 'BLOCKED_TRADE_DOMAIN_DEPENDENCY',
  escrowCount: 'BLOCKED_TRADE_DOMAIN_DEPENDENCY',
  rfqCountAsBuyer: 'BLOCKED_RFQ_DOMAIN_DEPENDENCY',
  rfqCountAsSupplier: 'BLOCKED_RFQ_DOMAIN_DEPENDENCY',
  rfqResponseCount: 'BLOCKED_RFQ_DOMAIN_DEPENDENCY',
  traceabilityNodeCount: 'BLOCKED_TRACEABILITY_DEPENDENCY',
  traceabilityEdgeCount: 'BLOCKED_TRACEABILITY_DEPENDENCY',
  dppPassportCount: 'BLOCKED_DPP_DEPENDENCY',
  dppEvidenceClaimCount: 'BLOCKED_DPP_DEPENDENCY',
  dppEvidenceItemCount: 'BLOCKED_DPP_DEPENDENCY',
  invoiceCount: 'BLOCKED_TTP_FINANCE_DEPENDENCY',
  vpcCount: 'BLOCKED_TTP_FINANCE_DEPENDENCY',
  auditLogCount: 'BLOCKED_AUDIT_EVIDENCE_RETENTION',
  eventLogCount: 'BLOCKED_AUDIT_EVIDENCE_RETENTION',
} as const satisfies Record<string, BlockerCode>;

const prisma = new PrismaClient();

function getRepoRoot(): string {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDir, '..', '..', '..');
}

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function getGitHead(repoRoot: string): string {
  try {
    return execSync('git rev-parse HEAD', {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'unknown-head';
  }
}

function ensureNoOverlap(): void {
  const protectedSet = new Set(
    protectedNoAction
      .map(slug => slug.split('::')[0])
      .map(normalizeSlug),
  );
  const ambiguousSet = new Set(ambiguousNoAction.map(normalizeSlug));

  const collisions: string[] = [];
  for (const slug of [...activeSafeCandidates, ...closedSafeCandidates]) {
    const normalized = normalizeSlug(slug);
    if (protectedSet.has(normalized) || ambiguousSet.has(normalized)) {
      collisions.push(slug);
    }
  }

  if (collisions.length > 0) {
    throw new Error(
      `Input validation failed. Protected/Ambiguous slugs found in safe candidate sets: ${collisions.join(', ')}`,
    );
  }
}

function getDelegate(modelName: string): any | null {
  const db = prisma as unknown as Record<string, any>;
  const delegate = db[modelName];
  return delegate && typeof delegate === 'object' ? delegate : null;
}

async function safeCount(
  modelName: string,
  whereOptions: Array<Record<string, unknown>>,
  noteKey: string,
): Promise<CountAttempt> {
  const delegate = getDelegate(modelName);
  if (!delegate || typeof delegate.count !== 'function') {
    return {
      value: null,
      schemaGap: true,
      notes: [`${noteKey}:model_missing:${modelName}`],
    };
  }

  for (const where of whereOptions) {
    try {
      const value = await delegate.count({ where });
      return { value, schemaGap: false, notes: [] };
    } catch {
      // try next where option
    }
  }

  return {
    value: null,
    schemaGap: true,
    notes: [`${noteKey}:where_mismatch:${modelName}`],
  };
}

async function safeFindMany(
  modelName: string,
  query: Record<string, unknown>,
  noteKey: string,
): Promise<{ rows: Array<Record<string, unknown>> | null; schemaGap: boolean; notes: string[] }> {
  const delegate = getDelegate(modelName);
  if (!delegate || typeof delegate.findMany !== 'function') {
    return {
      rows: null,
      schemaGap: true,
      notes: [`${noteKey}:model_missing:${modelName}`],
    };
  }

  try {
    const rows = await delegate.findMany(query);
    return { rows, schemaGap: false, notes: [] };
  } catch {
    return {
      rows: null,
      schemaGap: true,
      notes: [`${noteKey}:query_mismatch:${modelName}`],
    };
  }
}

function emptyCounters(): ExportCounters {
  return {
    membershipCount: null,
    userCountViaMemberships: null,
    domainCount: null,
    tenantBrandingCount: null,
    auditLogCount: null,
    eventLogCount: null,
    reasoningLogCount: null,
    marketplaceCatalogCount: null,
    cartCount: null,
    marketplaceCartSummaryCount: null,
    rfqCountAsBuyer: null,
    rfqCountAsSupplier: null,
    rfqResponseCount: null,
    orderCount: null,
    orderItemCount: null,
    tradeCount: null,
    tradeEventCount: null,
    invoiceCount: null,
    vpcCount: null,
    escrowCount: null,
    escalationCount: null,
    sanctionsCount: null,
    traceabilityNodeCount: null,
    traceabilityEdgeCount: null,
    dppPassportCount: null,
    dppEvidenceClaimCount: null,
    dppEvidenceItemCount: null,
    tenantFeatureOverrideCount: null,
    aiBudgetCount: null,
    aiUsageMeterCount: null,
    inviteCount: null,
    impersonationSessionCount: null,
    refreshTokenCountViaMembers: null,
    wlDomainCount: null,
    wlCustomDomainCount: null,
    crmCaeReferenceCount: 0,
    otherDependencyCounts: {},
  };
}

function isProtectedSlug(slug: string): boolean {
  const normalized = normalizeSlug(slug);
  const protectedSlugSet = new Set(
    protectedNoAction
      .map(value => value.split('::')[0])
      .map(normalizeSlug),
  );
  return protectedSlugSet.has(normalized);
}

function protectedBlockerForSlug(slug: string): BlockerCode {
  const normalized = normalizeSlug(slug);
  if (
    normalized.startsWith('qa-') ||
    normalized === 'white-label-co' ||
    normalized === 'qa-b2b' ||
    normalized === 'qa-b2c' ||
    normalized === 'qa-wl' ||
    normalized === 'qa-agg' ||
    normalized === 'qa-pend'
  ) {
    return 'PROTECTED_QA_BASELINE';
  }

  return 'PROTECTED_WL_BASELINE';
}

function isAmbiguousSlug(slug: string): boolean {
  const ambiguousSet = new Set(ambiguousNoAction.map(normalizeSlug));
  return ambiguousSet.has(normalizeSlug(slug));
}

function sanitizeArray<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

async function gatherCounters(
  tenantId: string,
  isWhiteLabel: boolean,
): Promise<{ counters: ExportCounters; schemaGapNotes: string[] }> {
  const notes: string[] = [];
  const counters = emptyCounters();

  const memberships = await safeFindMany(
    'membership',
    {
      where: { tenantId },
      select: { userId: true },
    },
    'membership_users',
  );
  notes.push(...memberships.notes);
  counters.membershipCount = memberships.rows?.length ?? null;

  const membershipUserIds = sanitizeArray(
    (memberships.rows ?? [])
      .map(row => row.userId)
      .filter((value): value is string => typeof value === 'string'),
  );

  counters.userCountViaMemberships = membershipUserIds.length;

  const domainRows = await safeFindMany(
    'tenantDomain',
    {
      where: { tenantId },
      select: { domain: true },
    },
    'tenant_domain_rows',
  );
  notes.push(...domainRows.notes);
  counters.domainCount = domainRows.rows?.length ?? null;

  if (domainRows.rows) {
    const domains = domainRows.rows
      .map(row => row.domain)
      .filter((value): value is string => typeof value === 'string');

    const customDomains = domains.filter(value => !value.endsWith('.texqtic.com'));
    counters.wlCustomDomainCount = customDomains.length;
    counters.wlDomainCount = isWhiteLabel ? domains.length : 0;
  }

  const simpleCountSpecs: Array<{
    field: keyof ExportCounters;
    modelName: string;
    whereOptions: Array<Record<string, unknown>>;
    noteKey: string;
  }> = [
    { field: 'tenantBrandingCount', modelName: 'tenantBranding', whereOptions: [{ tenantId }], noteKey: 'tenant_branding_count' },
    { field: 'auditLogCount', modelName: 'auditLog', whereOptions: [{ tenantId }], noteKey: 'audit_log_count' },
    { field: 'eventLogCount', modelName: 'eventLog', whereOptions: [{ tenantId }], noteKey: 'event_log_count' },
    { field: 'reasoningLogCount', modelName: 'reasoningLog', whereOptions: [{ tenantId }], noteKey: 'reasoning_log_count' },
    { field: 'marketplaceCatalogCount', modelName: 'catalogItem', whereOptions: [{ tenantId }], noteKey: 'catalog_item_count' },
    { field: 'cartCount', modelName: 'cart', whereOptions: [{ tenantId }], noteKey: 'cart_count' },
    { field: 'marketplaceCartSummaryCount', modelName: 'marketplaceCartSummary', whereOptions: [{ tenantId }], noteKey: 'marketplace_cart_summary_count' },
    { field: 'rfqCountAsBuyer', modelName: 'rfq', whereOptions: [{ orgId: tenantId }], noteKey: 'rfq_buyer_count' },
    { field: 'rfqCountAsSupplier', modelName: 'rfq', whereOptions: [{ supplierOrgId: tenantId }], noteKey: 'rfq_supplier_count' },
    { field: 'rfqResponseCount', modelName: 'rfqSupplierResponse', whereOptions: [{ supplierOrgId: tenantId }, { tenantId }], noteKey: 'rfq_response_count' },
    { field: 'orderCount', modelName: 'order', whereOptions: [{ tenantId }], noteKey: 'order_count' },
    { field: 'tradeCount', modelName: 'trade', whereOptions: [{ tenantId }], noteKey: 'trade_count' },
    { field: 'invoiceCount', modelName: 'invoices', whereOptions: [{ org_id: tenantId }, { buyer_org_id: tenantId }, { seller_org_id: tenantId }], noteKey: 'invoice_count' },
    { field: 'vpcCount', modelName: 'verified_payable_certificates', whereOptions: [{ org_id: tenantId }, { buyer_org_id: tenantId }, { seller_org_id: tenantId }], noteKey: 'vpc_count' },
    { field: 'escrowCount', modelName: 'escrow_accounts', whereOptions: [{ tenant_id: tenantId }], noteKey: 'escrow_count' },
    { field: 'escalationCount', modelName: 'escalationEvent', whereOptions: [{ orgId: tenantId }], noteKey: 'escalation_count' },
    { field: 'sanctionsCount', modelName: 'sanction', whereOptions: [{ orgId: tenantId }], noteKey: 'sanction_count' },
    { field: 'traceabilityNodeCount', modelName: 'traceabilityNode', whereOptions: [{ orgId: tenantId }], noteKey: 'traceability_node_count' },
    { field: 'dppPassportCount', modelName: 'dpp_passport_states', whereOptions: [{ org_id: tenantId }], noteKey: 'dpp_passport_count' },
    { field: 'dppEvidenceClaimCount', modelName: 'dppEvidenceClaim', whereOptions: [{ orgId: tenantId }], noteKey: 'dpp_evidence_claim_count' },
    { field: 'dppEvidenceItemCount', modelName: 'dpp_evidence_items', whereOptions: [{ org_id: tenantId }], noteKey: 'dpp_evidence_item_count' },
    { field: 'tenantFeatureOverrideCount', modelName: 'tenantFeatureOverride', whereOptions: [{ tenantId }], noteKey: 'tenant_feature_override_count' },
    { field: 'aiBudgetCount', modelName: 'aiBudget', whereOptions: [{ tenantId }], noteKey: 'ai_budget_count' },
    { field: 'aiUsageMeterCount', modelName: 'aiUsageMeter', whereOptions: [{ tenantId }], noteKey: 'ai_usage_meter_count' },
    { field: 'inviteCount', modelName: 'invite', whereOptions: [{ tenantId }], noteKey: 'invite_count' },
    { field: 'impersonationSessionCount', modelName: 'impersonationSession', whereOptions: [{ tenantId }], noteKey: 'impersonation_session_count' },
  ];

  for (const spec of simpleCountSpecs) {
    const result = await safeCount(spec.modelName, spec.whereOptions, spec.noteKey);
    notes.push(...result.notes);
    counters[spec.field] = result.value;
  }

  if (membershipUserIds.length > 0) {
    const refreshResult = await safeCount(
      'refreshToken',
      [{ userId: { in: membershipUserIds } }, { user_id: { in: membershipUserIds } }],
      'refresh_token_count_via_members',
    );
    notes.push(...refreshResult.notes);
    counters.refreshTokenCountViaMembers = refreshResult.value;
  } else {
    counters.refreshTokenCountViaMembers = 0;
  }

  const tradeRows = await safeFindMany(
    'trade',
    {
      where: { tenantId },
      select: { id: true },
    },
    'trade_id_rows',
  );
  notes.push(...tradeRows.notes);

  const tradeIds = sanitizeArray(
    (tradeRows.rows ?? [])
      .map(row => row.id)
      .filter((value): value is string => typeof value === 'string'),
  );

  if (tradeIds.length > 0) {
    const tradeEventResult = await safeCount(
      'tradeEvent',
      [{ tradeId: { in: tradeIds } }, { trade_id: { in: tradeIds } }],
      'trade_event_count',
    );
    notes.push(...tradeEventResult.notes);
    counters.tradeEventCount = tradeEventResult.value;
  } else {
    counters.tradeEventCount = 0;
  }

  const nodeRows = await safeFindMany(
    'traceabilityNode',
    {
      where: {
        OR: [{ orgId: tenantId }],
      },
      select: { id: true },
    },
    'traceability_node_rows',
  );
  notes.push(...nodeRows.notes);

  const nodeIds = sanitizeArray(
    (nodeRows.rows ?? [])
      .map(row => row.id)
      .filter((value): value is string => typeof value === 'string'),
  );

  if (nodeIds.length > 0) {
    const edgeResult = await safeCount(
      'traceabilityEdge',
      [
        { OR: [{ fromNodeId: { in: nodeIds } }, { toNodeId: { in: nodeIds } }] },
        { OR: [{ from_node_id: { in: nodeIds } }, { to_node_id: { in: nodeIds } }] },
      ],
      'traceability_edge_count',
    );
    notes.push(...edgeResult.notes);
    counters.traceabilityEdgeCount = edgeResult.value;
  } else {
    counters.traceabilityEdgeCount = 0;
  }

  const otherSpecs: Array<{ key: string; modelName: string; whereOptions: Array<Record<string, unknown>> }> = [
    { key: 'networkPoolCount', modelName: 'networkPool', whereOptions: [{ orgId: tenantId }] },
    { key: 'networkPoolMembershipCount', modelName: 'networkPoolMembership', whereOptions: [{ orgId: tenantId }] },
    { key: 'networkInvoiceCount', modelName: 'networkInvoice', whereOptions: [{ orgId: tenantId }] },
    { key: 'pendingApprovalCount', modelName: 'pendingApproval', whereOptions: [{ orgId: tenantId }] },
    { key: 'documentExtractionDraftCount', modelName: 'documentExtractionDraft', whereOptions: [{ orgId: tenantId }] },
  ];

  for (const spec of otherSpecs) {
    const result = await safeCount(spec.modelName, spec.whereOptions, `other_${spec.key}`);
    notes.push(...result.notes);
    counters.otherDependencyCounts[spec.key] = result.value;
  }

  const schemaGapNotes = notes;
  return { counters, schemaGapNotes };
}

function countByClassification(results: TenantResult[]): Record<Classification, number> {
  return {
    DELETE_POSSIBLE: results.filter(row => row.classification === 'DELETE_POSSIBLE').length,
    DELETE_BLOCKED: results.filter(row => row.classification === 'DELETE_BLOCKED').length,
    DELETE_UNSUPPORTED: results.filter(row => row.classification === 'DELETE_UNSUPPORTED').length,
    PROTECTED_NO_ACTION: results.filter(row => row.classification === 'PROTECTED_NO_ACTION').length,
    AMBIGUOUS_NO_ACTION: results.filter(row => row.classification === 'AMBIGUOUS_NO_ACTION').length,
  };
}

function buildBlockerHistogram(results: TenantResult[]): Record<string, number> {
  const histogram: Record<string, number> = {};
  for (const row of results) {
    for (const blocker of row.blockerReasons) {
      histogram[blocker] = (histogram[blocker] ?? 0) + 1;
    }
  }
  return histogram;
}

function buildEvidenceSnapshotRef(timestamp: string, gitHead: string, slug: string): string {
  return `artifacts/control-plane/test-tenant-delete-dependency-export.json#${timestamp}:${gitHead}:${slug}`;
}

function strictStatusExpected(group: CandidateGroup): 'ACTIVE' | 'CLOSED' | null {
  if (group === 'ACTIVE_SAFE_CANDIDATE') {
    return 'ACTIVE';
  }
  if (group === 'CLOSED_SAFE_CANDIDATE') {
    return 'CLOSED';
  }
  return null;
}

function classifyRow(input: {
  group: CandidateGroup;
  slug: string;
  tenantStatus: string | null;
  counters: ExportCounters;
  schemaGapNotes: string[];
  blockerReasons: BlockerCode[];
}): { classification: Classification; blockerReasons: BlockerCode[] } {
  const blockerReasons = [...input.blockerReasons];

  if (input.group === 'PROTECTED_NO_ACTION_INPUT') {
    blockerReasons.push(protectedBlockerForSlug(input.slug));
    return {
      classification: 'PROTECTED_NO_ACTION',
      blockerReasons: sanitizeArray(blockerReasons),
    };
  }

  if (input.group === 'AMBIGUOUS_NO_ACTION_INPUT') {
    blockerReasons.push('AMBIGUOUS_REQUIRES_PARESH_DECISION');
    return {
      classification: 'AMBIGUOUS_NO_ACTION',
      blockerReasons: sanitizeArray(blockerReasons),
    };
  }

  const expected = strictStatusExpected(input.group);
  if (expected && input.tenantStatus && input.tenantStatus.toUpperCase() !== expected) {
    blockerReasons.push('BLOCKED_STATUS_MISMATCH');
  }

  if (input.tenantStatus === null) {
    blockerReasons.push('BLOCKED_TENANT_NOT_FOUND');
  }

  const criticalKeys = Object.keys(criticalCounterKeys) as Array<keyof typeof criticalCounterKeys>;
  for (const key of criticalKeys) {
    const value = input.counters[key as keyof ExportCounters];
    if (typeof value === 'number' && value > 0) {
      blockerReasons.push(criticalCounterKeys[key]);
    }
  }

  if (input.schemaGapNotes.length > 0) {
    blockerReasons.push('BLOCKED_UNKNOWN_RELATION');
  }

  const hasSchemaGap = input.schemaGapNotes.length > 0;
  const hasBlocking = blockerReasons.some(
    code =>
      code === 'BLOCKED_TENANT_NOT_FOUND' ||
      code === 'BLOCKED_STATUS_MISMATCH' ||
      code === 'BLOCKED_REASONING_LOG_DEPENDENCY' ||
      code === 'BLOCKED_TRADE_DOMAIN_DEPENDENCY' ||
      code === 'BLOCKED_RFQ_DOMAIN_DEPENDENCY' ||
      code === 'BLOCKED_TRACEABILITY_DEPENDENCY' ||
      code === 'BLOCKED_DPP_DEPENDENCY' ||
      code === 'BLOCKED_TTP_FINANCE_DEPENDENCY' ||
      code === 'BLOCKED_AUDIT_EVIDENCE_RETENTION',
  );

  if (hasSchemaGap) {
    blockerReasons.push('UNSUPPORTED_NO_DELETE_ROUTE');
    return {
      classification: 'DELETE_UNSUPPORTED',
      blockerReasons: sanitizeArray(blockerReasons),
    };
  }

  if (hasBlocking) {
    return {
      classification: 'DELETE_BLOCKED',
      blockerReasons: sanitizeArray(blockerReasons),
    };
  }

  return {
    classification: 'DELETE_POSSIBLE',
    blockerReasons: sanitizeArray(blockerReasons),
  };
}

async function run(): Promise<void> {
  if (process.argv.length > 2) {
    throw new Error('This script is read-only and accepts no flags or destructive mode switches.');
  }

  ensureNoOverlap();

  const repoRoot = getRepoRoot();
  const gitHead = getGitHead(repoRoot);
  const timestamp = new Date().toISOString();

  const candidateInput: Array<{ slug: string; group: CandidateGroup }> = [
    ...activeSafeCandidates.map(slug => ({ slug, group: 'ACTIVE_SAFE_CANDIDATE' as const })),
    ...closedSafeCandidates.map(slug => ({ slug, group: 'CLOSED_SAFE_CANDIDATE' as const })),
    ...protectedNoAction.map(slug => ({ slug: slug.split('::')[0], group: 'PROTECTED_NO_ACTION_INPUT' as const })),
    ...ambiguousNoAction.map(slug => ({ slug, group: 'AMBIGUOUS_NO_ACTION_INPUT' as const })),
  ];

  const results: TenantResult[] = [];

  const tenantDelegate = getDelegate('tenant');
  if (!tenantDelegate || typeof tenantDelegate.findUnique !== 'function') {
    throw new Error('Prisma tenant model is unavailable. Cannot build dependency export report.');
  }

  for (const input of candidateInput) {
    const slug = normalizeSlug(input.slug);

    let tenant: Record<string, unknown> | null = null;
    try {
      tenant = await tenantDelegate.findUnique({
        where: { slug },
        select: {
          id: true,
          slug: true,
          name: true,
          status: true,
          isWhiteLabel: true,
          organizations: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });
    } catch {
      // keep null tenant and classify conservatively
    }

    const tenantId = typeof tenant?.id === 'string' ? tenant.id : null;
    const tenantName = typeof tenant?.name === 'string' ? tenant.name : null;
    const tenantStatus = typeof tenant?.status === 'string' ? tenant.status : null;

    const organization = (tenant?.organizations ?? null) as Record<string, unknown> | null;
    const organizationId = typeof organization?.id === 'string' ? organization.id : tenantId;
    const onboardingStatus = typeof organization?.status === 'string' ? organization.status : null;

    const isWhiteLabel = Boolean(tenant?.isWhiteLabel);

    const counters = emptyCounters();
    const schemaGapNotes: string[] = [];

    if (tenantId) {
      const gathered = await gatherCounters(tenantId, isWhiteLabel);
      Object.assign(counters, gathered.counters);
      schemaGapNotes.push(...gathered.schemaGapNotes);
    } else {
      schemaGapNotes.push('tenant_lookup:missing');
    }

    const initialBlockers: BlockerCode[] = [];
    if (isProtectedSlug(slug)) {
      initialBlockers.push(protectedBlockerForSlug(slug));
    }
    if (isAmbiguousSlug(slug)) {
      initialBlockers.push('AMBIGUOUS_REQUIRES_PARESH_DECISION');
    }

    const classificationResult = classifyRow({
      group: input.group,
      slug,
      tenantStatus,
      counters,
      schemaGapNotes,
      blockerReasons: initialBlockers,
    });

    const row: TenantResult = {
      tenantId,
      tenantSlug: slug,
      tenantName,
      tenantStatus,
      onboardingStatus,
      organizationId,
      candidateGroup: input.group,
      classification: classificationResult.classification,
      blockerReasons: classificationResult.blockerReasons,
      evidenceSnapshotRef: buildEvidenceSnapshotRef(timestamp, gitHead, slug),
      schemaGapNotes,
      ...counters,
    };

    results.push(row);
  }

  const totalsByClassification = countByClassification(results);
  const blockerHistogram = buildBlockerHistogram(results);

  const protectedRows = results.filter(row => row.candidateGroup === 'PROTECTED_NO_ACTION_INPUT');
  const ambiguousRows = results.filter(row => row.candidateGroup === 'AMBIGUOUS_NO_ACTION_INPUT');

  const protectedExclusionConfirmation = {
    expectedCount: protectedNoAction.length,
    observedCount: protectedRows.length,
    allClassifiedProtectedNoAction: protectedRows.every(
      row => row.classification === 'PROTECTED_NO_ACTION',
    ),
  };

  const ambiguousExclusionConfirmation = {
    expectedCount: ambiguousNoAction.length,
    observedCount: ambiguousRows.length,
    allClassifiedAmbiguousNoAction: ambiguousRows.every(
      row => row.classification === 'AMBIGUOUS_NO_ACTION',
    ),
  };

  const report = {
    metadata: {
      unitId: 'CONTROL-PLANE-TEST-TENANT-DELETE-DEPENDENCY-EXPORT-IMPLEMENTATION-001',
      scriptVersion: SCRIPT_VERSION,
      generatedAt: timestamp,
      gitHead,
      dryRun: true,
      readOnly: true,
      noMutationStatement: NO_MUTATION_STATEMENT,
      deleteAuthorization: 'NOT_AUTHORIZED',
    },
    inputGroups: {
      activeSafeCandidates,
      closedSafeCandidates,
      protectedNoAction,
      ambiguousNoAction,
      counts: {
        activeSafeCandidates: activeSafeCandidates.length,
        closedSafeCandidates: closedSafeCandidates.length,
        protectedNoAction: protectedNoAction.length,
        ambiguousNoAction: ambiguousNoAction.length,
      },
    },
    tenantResults: results,
    totalsByClassification,
    blockerHistogram,
    protectedExclusionConfirmation,
    ambiguousExclusionConfirmation,
    noMutationStatement: NO_MUTATION_STATEMENT,
  };

  const artifactsDir = path.join(repoRoot, 'artifacts', 'control-plane');
  mkdirSync(artifactsDir, { recursive: true });

  const jsonPath = path.join(artifactsDir, 'test-tenant-delete-dependency-export.json');
  const mdPath = path.join(artifactsDir, 'test-tenant-delete-dependency-export.md');

  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(mdPath, `${buildMarkdownReport(report)}\n`, 'utf8');

  console.log('Dependency export report generated (read-only).');
  console.log(`JSON: ${jsonPath}`);
  console.log(`Markdown: ${mdPath}`);
  console.log(`Classification totals: ${JSON.stringify(totalsByClassification)}`);
}

function buildMarkdownReport(report: {
  metadata: {
    unitId: string;
    scriptVersion: string;
    generatedAt: string;
    gitHead: string;
    noMutationStatement: string;
  };
  inputGroups: {
    counts: {
      activeSafeCandidates: number;
      closedSafeCandidates: number;
      protectedNoAction: number;
      ambiguousNoAction: number;
    };
  };
  tenantResults: TenantResult[];
  totalsByClassification: Record<Classification, number>;
  blockerHistogram: Record<string, number>;
  protectedExclusionConfirmation: {
    expectedCount: number;
    observedCount: number;
    allClassifiedProtectedNoAction: boolean;
  };
  ambiguousExclusionConfirmation: {
    expectedCount: number;
    observedCount: number;
    allClassifiedAmbiguousNoAction: boolean;
  };
}): string {
  const rowsByClassification = {
    DELETE_POSSIBLE: report.tenantResults.filter(row => row.classification === 'DELETE_POSSIBLE'),
    DELETE_BLOCKED: report.tenantResults.filter(row => row.classification === 'DELETE_BLOCKED'),
    DELETE_UNSUPPORTED: report.tenantResults.filter(row => row.classification === 'DELETE_UNSUPPORTED'),
    PROTECTED_NO_ACTION: report.tenantResults.filter(row => row.classification === 'PROTECTED_NO_ACTION'),
    AMBIGUOUS_NO_ACTION: report.tenantResults.filter(row => row.classification === 'AMBIGUOUS_NO_ACTION'),
  };

  const tableHeader =
    '| slug | group | status | onboarding | classification | blockers | tradeCount | reasoningLogCount | rfqCountAsBuyer | rfqCountAsSupplier | invoiceCount | dppEvidenceClaimCount | traceabilityNodeCount |\n' +
    '| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |';

  const tableRows = report.tenantResults
    .map(row => {
      const blockers = row.blockerReasons.length > 0 ? row.blockerReasons.join(', ') : '-';
      return `| ${row.tenantSlug} | ${row.candidateGroup} | ${row.tenantStatus ?? '-'} | ${row.onboardingStatus ?? '-'} | ${row.classification} | ${blockers} | ${formatNumber(row.tradeCount)} | ${formatNumber(row.reasoningLogCount)} | ${formatNumber(row.rfqCountAsBuyer)} | ${formatNumber(row.rfqCountAsSupplier)} | ${formatNumber(row.invoiceCount)} | ${formatNumber(row.dppEvidenceClaimCount)} | ${formatNumber(row.traceabilityNodeCount)} |`;
    })
    .join('\n');

  return [
    `# ${report.metadata.unitId}`,
    '',
    '## Executive Summary',
    `- Generated at: ${report.metadata.generatedAt}`,
    `- Git HEAD: ${report.metadata.gitHead}`,
    `- Script version: ${report.metadata.scriptVersion}`,
    `- ${report.metadata.noMutationStatement}`,
    '',
    '## Input Summary',
    `- active safe candidates: ${report.inputGroups.counts.activeSafeCandidates}`,
    `- closed safe candidates: ${report.inputGroups.counts.closedSafeCandidates}`,
    `- protected exclusions: ${report.inputGroups.counts.protectedNoAction}`,
    `- ambiguous exclusions: ${report.inputGroups.counts.ambiguousNoAction}`,
    '',
    '## Classification Summary',
    `- DELETE_POSSIBLE: ${report.totalsByClassification.DELETE_POSSIBLE}`,
    `- DELETE_BLOCKED: ${report.totalsByClassification.DELETE_BLOCKED}`,
    `- DELETE_UNSUPPORTED: ${report.totalsByClassification.DELETE_UNSUPPORTED}`,
    `- PROTECTED_NO_ACTION: ${report.totalsByClassification.PROTECTED_NO_ACTION}`,
    `- AMBIGUOUS_NO_ACTION: ${report.totalsByClassification.AMBIGUOUS_NO_ACTION}`,
    '',
    '## DELETE_POSSIBLE subset',
    rowsByClassification.DELETE_POSSIBLE.length > 0
      ? rowsByClassification.DELETE_POSSIBLE.map(row => `- ${row.tenantSlug}`).join('\n')
      : '- none',
    '',
    '## DELETE_BLOCKED subset',
    rowsByClassification.DELETE_BLOCKED.length > 0
      ? rowsByClassification.DELETE_BLOCKED.map(row => `- ${row.tenantSlug}`).join('\n')
      : '- none',
    '',
    '## DELETE_UNSUPPORTED subset',
    rowsByClassification.DELETE_UNSUPPORTED.length > 0
      ? rowsByClassification.DELETE_UNSUPPORTED.map(row => `- ${row.tenantSlug}`).join('\n')
      : '- none',
    '',
    '## Protected No-Action Confirmation',
    `- expected protected rows: ${report.protectedExclusionConfirmation.expectedCount}`,
    `- observed protected rows: ${report.protectedExclusionConfirmation.observedCount}`,
    `- all protected classified PROTECTED_NO_ACTION: ${report.protectedExclusionConfirmation.allClassifiedProtectedNoAction}`,
    '',
    '## Ambiguous No-Action Confirmation',
    `- expected ambiguous rows: ${report.ambiguousExclusionConfirmation.expectedCount}`,
    `- observed ambiguous rows: ${report.ambiguousExclusionConfirmation.observedCount}`,
    `- all ambiguous classified AMBIGUOUS_NO_ACTION: ${report.ambiguousExclusionConfirmation.allClassifiedAmbiguousNoAction}`,
    '',
    '## Blocker Histogram',
    ...Object.entries(report.blockerHistogram)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([code, count]) => `- ${code}: ${count}`),
    '',
    '## Per-Tenant Table',
    tableHeader,
    tableRows,
    '',
    'This report does not authorize deletion. Deletion remains blocked until Paresh approves an exact DELETE_POSSIBLE subset in a later unit.',
  ].join('\n');
}

function formatNumber(value: number | null): string {
  return value === null ? '-' : String(value);
}

run()
  .catch(error => {
    console.error('Dependency export failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });