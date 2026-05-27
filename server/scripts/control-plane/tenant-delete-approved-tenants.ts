import 'dotenv/config';

import { PrismaClient } from '@prisma/client';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Mode = 'dry-run' | 'execute' | 'post-check';

type GateStatus = {
  ok: boolean;
  message: string;
};

type DependencyCheck = {
  slug: string;
  tenantId: string;
  reasoningLogCount: number;
  tradeCount: number;
  rfqCount: number;
  rfqResponseCount: number;
  traceabilityNodeCount: number;
  dppEvidenceClaimCount: number;
  invoiceCount: number;
  escrowCount: number;
  blockers: string[];
  notes: string[];
};

type PrecheckReport = {
  metadata: {
    generatedAt: string;
    gitHead: string;
    mode: Mode;
    unitId: string;
    scriptVersion: string;
  };
  gates: Record<string, GateStatus>;
  totals: {
    approvedSlugCount: number;
    approvedUniqueCount: number;
    approvedExistingCount: number;
    approvedMissingCount: number;
    blockedCount: number;
    protectedCount: number;
    ambiguousCount: number;
    unsupportedCount: number;
  };
  approvedMissingSlugs: string[];
  preservedPrePresentSlugs: string[];
  preservedPreMissingSlugs: string[];
  dependencyChecks: DependencyCheck[];
  dependencyDriftUnsafeSlugs: Array<{ slug: string; blockers: string[]; notes: string[] }>;
  overlapViolations: string[];
};

type ExecutionResult = {
  metadata: {
    generatedAt: string;
    gitHead: string;
    mode: Mode;
    unitId: string;
    scriptVersion: string;
    executedDeletion: boolean;
  };
  status:
    | 'EXECUTED'
    | 'BLOCKED_BY_DEPENDENCY_DRIFT'
    | 'BLOCKED_BY_GUARDRAIL'
    | 'BLOCKED_BY_ENV'
    | 'BLOCKED_BY_EXECUTION_DESIGN_GAP'
    | 'BLOCKED_BY_VALIDATION';
  message: string;
  deletedCount: number;
  deletedSlugs: string[];
  skippedSlugs: string[];
  failedSlugs: string[];
  approvedRemainingSlugs: string[];
  preservedPostPresentSlugs: string[];
  preservedDroppedSlugs: string[];
  noDeleteGroupsDeleted: {
    blockedDeleted: string[];
    protectedDeleted: string[];
    ambiguousDeleted: string[];
  };
};

const SCRIPT_VERSION = 'v1.0.0-approved-delete-gated';
const UNIT_ID = 'CONTROL-PLANE-TEST-TENANT-DELETE-EXECUTION-001';
const EXECUTE_CONFIRM_TOKEN = 'PARESH_APPROVED_DELETE_44_TEST_TENANTS';

const APPROVED_SLUGS = [
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

const DELETE_BLOCKED_SLUGS = [
  'test-tenant-f527b7d2-62e5-4593-92c3-69a807a99c0d-24aa7ecb',
  'test-tenant-f527b7d2-62e5-4593-92c3-69a807a99c0d-97b96136',
  'test-tenant-wave2-1774063117878',
] as const;

const PROTECTED_NO_ACTION_SLUGS = [
  'qa-b2b',
  'qa-b2c',
  'qa-wl',
  'qa-agg',
  'qa-pend',
  'white-label-co',
  'wl-verify-s1-20260328-0510',
  'wl-verify-s1-20260328-0445',
  'wl-verify-s1-20260328-0440',
] as const;

const AMBIGUOUS_NO_ACTION_SLUGS = [
  'shraddha-industries',
  'acme-corp-live-verify',
  'ops-casework-seller-681cd6f6',
  'ops-casework-buyer-e13b66cb',
] as const;

const prisma = new PrismaClient();

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function getRepoRoot(): string {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDir, '..', '..', '..');
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

function parseMode(argv: string[]): { mode: Mode; confirmToken: string | null } {
  const args = new Set(argv);
  const execute = args.has('--execute');
  const postCheck = args.has('--post-check');
  const dryRun = args.has('--dry-run') || (!execute && !postCheck);

  const allowedPrefixes = ['--confirm='];
  for (const arg of argv) {
    if (arg === '--execute' || arg === '--post-check' || arg === '--dry-run') {
      continue;
    }
    if (allowedPrefixes.some(prefix => arg.startsWith(prefix))) {
      continue;
    }
    throw new Error(`Unsupported flag: ${arg}`);
  }

  if (execute && postCheck) {
    throw new Error('Use either --execute or --post-check, not both.');
  }

  const confirmArg = argv.find(arg => arg.startsWith('--confirm='));
  const confirmToken = confirmArg ? confirmArg.slice('--confirm='.length) : null;

  if (execute) {
    if (confirmToken !== EXECUTE_CONFIRM_TOKEN) {
      throw new Error('Execution requires --confirm=PARESH_APPROVED_DELETE_44_TEST_TENANTS');
    }
    return { mode: 'execute', confirmToken };
  }

  if (postCheck && dryRun) {
    return { mode: 'post-check', confirmToken };
  }

  return { mode: 'dry-run', confirmToken };
}

function writeJson(filePath: string, content: unknown): void {
  writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
}

function getDelegate(name: string): any {
  const client = prisma as unknown as Record<string, unknown>;
  const delegate = client[name];
  if (!delegate || typeof delegate !== 'object') {
    throw new Error(`Missing Prisma delegate: ${name}`);
  }
  return delegate as any;
}

async function safeCount(modelName: string, where: Record<string, unknown>): Promise<{ value: number; notes: string[] }> {
  const notes: string[] = [];
  try {
    const delegate = getDelegate(modelName);
    if (typeof delegate.count !== 'function') {
      notes.push(`${modelName}:count_unavailable`);
      return { value: 0, notes };
    }
    const value = await delegate.count({ where });
    return { value: typeof value === 'number' ? value : 0, notes };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    notes.push(`${modelName}:count_error:${message}`);
    return { value: 0, notes };
  }
}

async function buildPrecheck(mode: Mode, repoRoot: string): Promise<PrecheckReport> {
  const timestamp = new Date().toISOString();
  const gitHead = getGitHead(repoRoot);

  const overlapViolations = APPROVED_SLUGS.filter(slug => {
    const normalized = normalizeSlug(slug);
    return (
      DELETE_BLOCKED_SLUGS.some(item => normalizeSlug(item) === normalized) ||
      PROTECTED_NO_ACTION_SLUGS.some(item => normalizeSlug(item) === normalized) ||
      AMBIGUOUS_NO_ACTION_SLUGS.some(item => normalizeSlug(item) === normalized)
    );
  });

  const reviewPath = path.join(repoRoot, 'artifacts', 'control-plane', 'CONTROL-PLANE-TEST-TENANT-DELETE-EXPORT-REVIEW-DECISION-001.md');
  const approvalPath = path.join(repoRoot, 'artifacts', 'control-plane', 'CONTROL-PLANE-TEST-TENANT-DELETE-PARESH-APPROVAL-DECISION-001.md');
  const exportJsonPath = path.join(repoRoot, 'artifacts', 'control-plane', 'test-tenant-delete-dependency-export.json');

  const reviewExists = existsSync(reviewPath);
  const approvalExists = existsSync(approvalPath);
  const exportJsonExists = existsSync(exportJsonPath);

  const reviewText = reviewExists ? readFileSync(reviewPath, 'utf8') : '';
  const approvalText = approvalExists ? readFileSync(approvalPath, 'utf8') : '';

  const reviewEnumOk = reviewText.includes('Final recommendation enum: REVIEW_READY_FOR_PARESH_DECISION');
  const approvalEnumOk = approvalText.includes('Final recommendation enum: APPROVAL_READY_FOR_EXECUTION_DESIGN');

  const exportJson = exportJsonExists ? JSON.parse(readFileSync(exportJsonPath, 'utf8')) : null;
  const rows: Array<{ tenantSlug: string; classification: string }> = exportJson?.tenantResults ?? [];

  const byClassification = (name: string): string[] => rows.filter(row => row.classification === name).map(row => row.tenantSlug);
  const deletePossibleSet = new Set(byClassification('DELETE_POSSIBLE').map(normalizeSlug));
  const deleteBlockedSet = new Set(byClassification('DELETE_BLOCKED').map(normalizeSlug));
  const deleteUnsupportedSet = new Set(byClassification('DELETE_UNSUPPORTED').map(normalizeSlug));
  const protectedSet = new Set(byClassification('PROTECTED_NO_ACTION').map(normalizeSlug));
  const ambiguousSet = new Set(byClassification('AMBIGUOUS_NO_ACTION').map(normalizeSlug));

  const approvedNormalized = APPROVED_SLUGS.map(normalizeSlug);
  const approvedUniqueCount = new Set(approvedNormalized).size;
  const approvedMissingSlugs = APPROVED_SLUGS.filter(slug => !deletePossibleSet.has(normalizeSlug(slug)));

  const blockedConflicts = APPROVED_SLUGS.filter(slug => deleteBlockedSet.has(normalizeSlug(slug)));
  const unsupportedConflicts = APPROVED_SLUGS.filter(slug => deleteUnsupportedSet.has(normalizeSlug(slug)));
  const protectedConflicts = APPROVED_SLUGS.filter(slug => protectedSet.has(normalizeSlug(slug)));
  const ambiguousConflicts = APPROVED_SLUGS.filter(slug => ambiguousSet.has(normalizeSlug(slug)));

  const tenantDelegate = getDelegate('tenant');
  const approvedRows: Array<{ id: string; slug: string }> = await tenantDelegate.findMany({
    where: { slug: { in: [...APPROVED_SLUGS] } },
    select: { id: true, slug: true },
  });

  const approvedExistingCount = approvedRows.length;
  const approvedFoundSet = new Set(approvedRows.map(row => normalizeSlug(row.slug)));
  const approvedMissingNow = APPROVED_SLUGS.filter(slug => !approvedFoundSet.has(normalizeSlug(slug)));

  const preservedUniverse = [
    ...DELETE_BLOCKED_SLUGS,
    ...PROTECTED_NO_ACTION_SLUGS,
    ...AMBIGUOUS_NO_ACTION_SLUGS,
  ];

  const preservedRows: Array<{ slug: string }> = await tenantDelegate.findMany({
    where: { slug: { in: preservedUniverse } },
    select: { slug: true },
  });

  const preservedPrePresentSlugs = Array.from(new Set(preservedRows.map(row => row.slug))).sort();
  const preservedPreMissingSlugs = preservedUniverse
    .filter(slug => !preservedPrePresentSlugs.some(existing => normalizeSlug(existing) === normalizeSlug(slug)))
    .sort();

  const dependencyChecks: DependencyCheck[] = [];
  const dependencyDriftUnsafeSlugs: Array<{ slug: string; blockers: string[]; notes: string[] }> = [];

  for (const row of approvedRows) {
    const notes: string[] = [];
    const blockers: string[] = [];

    const reasoning = await safeCount('reasoningLog', { tenantId: row.id });
    notes.push(...reasoning.notes);
    if (reasoning.value > 0) {
      blockers.push('BLOCKED_REASONING_LOG_DEPENDENCY');
    }

    const trade = await safeCount('trade', { tenantId: row.id });
    notes.push(...trade.notes);
    if (trade.value > 0) {
      blockers.push('BLOCKED_TRADE_DOMAIN_DEPENDENCY');
    }

    const rfqBuyer = await safeCount('rfq', { orgId: row.id });
    const rfqSupplier = await safeCount('rfq', { supplierOrgId: row.id });
    notes.push(...rfqBuyer.notes, ...rfqSupplier.notes);
    const rfqCount = rfqBuyer.value + rfqSupplier.value;
    if (rfqCount > 0) {
      blockers.push('BLOCKED_RFQ_DOMAIN_DEPENDENCY');
    }

    const rfqResponse = await safeCount('rfqSupplierResponse', { supplierOrgId: row.id });
    notes.push(...rfqResponse.notes);
    if (rfqResponse.value > 0) {
      blockers.push('BLOCKED_RFQ_DOMAIN_DEPENDENCY');
    }

    const traceability = await safeCount('traceabilityNode', { orgId: row.id });
    notes.push(...traceability.notes);
    if (traceability.value > 0) {
      blockers.push('BLOCKED_TRACEABILITY_DEPENDENCY');
    }

    const dppEvidenceClaim = await safeCount('dppEvidenceClaim', { orgId: row.id });
    notes.push(...dppEvidenceClaim.notes);
    if (dppEvidenceClaim.value > 0) {
      blockers.push('BLOCKED_DPP_DEPENDENCY');
    }

    const invoicesOrg = await safeCount('invoices', { org_id: row.id });
    const invoicesBuyer = await safeCount('invoices', { buyer_org_id: row.id });
    const invoicesSeller = await safeCount('invoices', { seller_org_id: row.id });
    notes.push(...invoicesOrg.notes, ...invoicesBuyer.notes, ...invoicesSeller.notes);
    const invoiceCount = invoicesOrg.value + invoicesBuyer.value + invoicesSeller.value;
    if (invoiceCount > 0) {
      blockers.push('BLOCKED_TTP_FINANCE_DEPENDENCY');
    }

    const escrow = await safeCount('escrow_accounts', { tenant_id: row.id });
    notes.push(...escrow.notes);
    if (escrow.value > 0) {
      blockers.push('BLOCKED_TRADE_DOMAIN_DEPENDENCY');
    }

    const dedupedBlockers = Array.from(new Set(blockers));

    const result: DependencyCheck = {
      slug: row.slug,
      tenantId: row.id,
      reasoningLogCount: reasoning.value,
      tradeCount: trade.value,
      rfqCount,
      rfqResponseCount: rfqResponse.value,
      traceabilityNodeCount: traceability.value,
      dppEvidenceClaimCount: dppEvidenceClaim.value,
      invoiceCount,
      escrowCount: escrow.value,
      blockers: dedupedBlockers,
      notes,
    };

    dependencyChecks.push(result);

    if (dedupedBlockers.length > 0) {
      dependencyDriftUnsafeSlugs.push({ slug: row.slug, blockers: dedupedBlockers, notes });
    }
  }

  const gates: Record<string, GateStatus> = {
    reviewArtifactExists: {
      ok: reviewExists,
      message: reviewExists ? 'review artifact found' : 'missing review artifact',
    },
    approvalArtifactExists: {
      ok: approvalExists,
      message: approvalExists ? 'approval artifact found' : 'missing approval artifact',
    },
    exportJsonExists: {
      ok: exportJsonExists,
      message: exportJsonExists ? 'export json found' : 'missing export json',
    },
    reviewEnum: {
      ok: reviewEnumOk,
      message: reviewEnumOk ? 'review enum ready' : 'review enum mismatch',
    },
    approvalEnum: {
      ok: approvalEnumOk,
      message: approvalEnumOk ? 'approval enum ready' : 'approval enum mismatch',
    },
    approvedCount: {
      ok: APPROVED_SLUGS.length === 44,
      message: `approved count=${APPROVED_SLUGS.length}`,
    },
    approvedUniqueCount: {
      ok: approvedUniqueCount === 44,
      message: `approved unique count=${approvedUniqueCount}`,
    },
    overlapGuardrail: {
      ok: overlapViolations.length === 0,
      message: overlapViolations.length === 0 ? 'no overlap with preserved groups' : `overlap: ${overlapViolations.join(', ')}`,
    },
    exportClassificationMatch: {
      ok:
        exportJson?.totalsByClassification?.DELETE_POSSIBLE === 44 &&
        exportJson?.totalsByClassification?.DELETE_BLOCKED === 3 &&
        exportJson?.totalsByClassification?.DELETE_UNSUPPORTED === 0 &&
        exportJson?.totalsByClassification?.PROTECTED_NO_ACTION === 10 &&
        exportJson?.totalsByClassification?.AMBIGUOUS_NO_ACTION === 4,
      message: `totals=${JSON.stringify(exportJson?.totalsByClassification ?? {})}`,
    },
    approvedInDeletePossible: {
      ok:
        approvedMissingSlugs.length === 0 &&
        blockedConflicts.length === 0 &&
        unsupportedConflicts.length === 0 &&
        protectedConflicts.length === 0 &&
        ambiguousConflicts.length === 0,
      message:
        approvedMissingSlugs.length === 0 &&
        blockedConflicts.length === 0 &&
        unsupportedConflicts.length === 0 &&
        protectedConflicts.length === 0 &&
        ambiguousConflicts.length === 0
          ? 'approved subset matches DELETE_POSSIBLE only'
          : 'classification conflicts found',
    },
    approvedCurrentlyExist: {
      ok: approvedExistingCount === 44,
      message: approvedExistingCount === 44 ? 'all approved slugs currently exist' : `existing approved=${approvedExistingCount}`,
    },
    dependencyDriftGate: {
      ok: dependencyDriftUnsafeSlugs.length === 0,
      message: dependencyDriftUnsafeSlugs.length === 0 ? 'no dependency blockers detected' : `unsafe slugs=${dependencyDriftUnsafeSlugs.length}`,
    },
  };

  return {
    metadata: {
      generatedAt: timestamp,
      gitHead,
      mode,
      unitId: UNIT_ID,
      scriptVersion: SCRIPT_VERSION,
    },
    gates,
    totals: {
      approvedSlugCount: APPROVED_SLUGS.length,
      approvedUniqueCount,
      approvedExistingCount,
      approvedMissingCount: approvedMissingNow.length,
      blockedCount: DELETE_BLOCKED_SLUGS.length,
      protectedCount: PROTECTED_NO_ACTION_SLUGS.length,
      ambiguousCount: AMBIGUOUS_NO_ACTION_SLUGS.length,
      unsupportedCount: 0,
    },
    approvedMissingSlugs: approvedMissingNow,
    preservedPrePresentSlugs,
    preservedPreMissingSlugs,
    dependencyChecks,
    dependencyDriftUnsafeSlugs,
    overlapViolations,
  };
}

function buildPrecheckMarkdown(report: PrecheckReport): string {
  const gateLines = Object.entries(report.gates)
    .map(([key, value]) => `- ${key}: ${value.ok ? 'PASS' : 'FAIL'} (${value.message})`)
    .join('\n');

  const driftLines =
    report.dependencyDriftUnsafeSlugs.length === 0
      ? '- none'
      : report.dependencyDriftUnsafeSlugs
          .map(item => `- ${item.slug}: ${item.blockers.join(', ')}`)
          .join('\n');

  return [
    `# ${UNIT_ID} precheck`,
    '',
    `- generatedAt: ${report.metadata.generatedAt}`,
    `- gitHead: ${report.metadata.gitHead}`,
    `- mode: ${report.metadata.mode}`,
    '',
    '## Gate Results',
    gateLines,
    '',
    '## Totals',
    `- approvedSlugCount: ${report.totals.approvedSlugCount}`,
    `- approvedExistingCount: ${report.totals.approvedExistingCount}`,
    `- approvedMissingCount: ${report.totals.approvedMissingCount}`,
    '',
    '## Dependency Drift',
    driftLines,
    '',
    'This precheck is evidence-only and performs no deletion.',
  ].join('\n');
}

function buildResultMarkdown(result: ExecutionResult): string {
  const noDeleteDeleted =
    result.noDeleteGroupsDeleted.blockedDeleted.length === 0 &&
    result.noDeleteGroupsDeleted.protectedDeleted.length === 0 &&
    result.noDeleteGroupsDeleted.ambiguousDeleted.length === 0;

  return [
    `# ${UNIT_ID} execution result`,
    '',
    `- generatedAt: ${result.metadata.generatedAt}`,
    `- gitHead: ${result.metadata.gitHead}`,
    `- mode: ${result.metadata.mode}`,
    `- executedDeletion: ${result.metadata.executedDeletion}`,
    `- status: ${result.status}`,
    '',
    '## Summary',
    `- message: ${result.message}`,
    `- deletedCount: ${result.deletedCount}`,
    `- approvedRemainingCount: ${result.approvedRemainingSlugs.length}`,
    `- preservedDroppedCount: ${result.preservedDroppedSlugs.length}`,
    `- noDeleteGroupsDeleted: ${noDeleteDeleted ? 'none' : 'present'}`,
    '',
    '## Deleted Slugs',
    result.deletedSlugs.length === 0 ? '- none' : result.deletedSlugs.map(slug => `- ${slug}`).join('\n'),
    '',
    '## Approved Remaining Slugs',
    result.approvedRemainingSlugs.length === 0
      ? '- none'
      : result.approvedRemainingSlugs.map(slug => `- ${slug}`).join('\n'),
    '',
    '## Preserved Dropped Slugs',
    result.preservedDroppedSlugs.length === 0
      ? '- none'
      : result.preservedDroppedSlugs.map(slug => `- ${slug}`).join('\n'),
    '',
    'This script either deletes exactly the approved subset or blocks before mutation.',
  ].join('\n');
}

async function run(): Promise<void> {
  const repoRoot = getRepoRoot();
  const artifactsDir = path.join(repoRoot, 'artifacts', 'control-plane');
  mkdirSync(artifactsDir, { recursive: true });

  const precheckJsonPath = path.join(artifactsDir, 'test-tenant-delete-execution-precheck.json');
  const precheckMdPath = path.join(artifactsDir, 'test-tenant-delete-execution-precheck.md');
  const resultJsonPath = path.join(artifactsDir, 'test-tenant-delete-execution-result.json');
  const resultMdPath = path.join(artifactsDir, 'test-tenant-delete-execution-result.md');

  const { mode } = parseMode(process.argv.slice(2));
  const precheck = await buildPrecheck(mode, repoRoot);
  writeJson(precheckJsonPath, precheck);
  writeFileSync(precheckMdPath, `${buildPrecheckMarkdown(precheck)}\n`, 'utf8');

  const gateFailures = Object.entries(precheck.gates).filter(([, status]) => !status.ok);
  if (gateFailures.length > 0 && mode !== 'post-check') {
    const result: ExecutionResult = {
      metadata: {
        generatedAt: new Date().toISOString(),
        gitHead: getGitHead(repoRoot),
        mode,
        unitId: UNIT_ID,
        scriptVersion: SCRIPT_VERSION,
        executedDeletion: false,
      },
      status: precheck.dependencyDriftUnsafeSlugs.length > 0 ? 'BLOCKED_BY_DEPENDENCY_DRIFT' : 'BLOCKED_BY_GUARDRAIL',
      message: `Precheck failed: ${gateFailures.map(([key]) => key).join(', ')}`,
      deletedCount: 0,
      deletedSlugs: [],
      skippedSlugs: [...APPROVED_SLUGS],
      failedSlugs: [],
      approvedRemainingSlugs: [...APPROVED_SLUGS],
      preservedPostPresentSlugs: precheck.preservedPrePresentSlugs,
      preservedDroppedSlugs: [],
      noDeleteGroupsDeleted: {
        blockedDeleted: [],
        protectedDeleted: [],
        ambiguousDeleted: [],
      },
    };

    writeJson(resultJsonPath, result);
    writeFileSync(resultMdPath, `${buildResultMarkdown(result)}\n`, 'utf8');
    console.log(`Execution blocked: ${result.message}`);
    return;
  }

  const tenantDelegate = getDelegate('tenant');
  const preservedUniverse = [
    ...DELETE_BLOCKED_SLUGS,
    ...PROTECTED_NO_ACTION_SLUGS,
    ...AMBIGUOUS_NO_ACTION_SLUGS,
  ];

  if (mode === 'dry-run') {
    const result: ExecutionResult = {
      metadata: {
        generatedAt: new Date().toISOString(),
        gitHead: getGitHead(repoRoot),
        mode,
        unitId: UNIT_ID,
        scriptVersion: SCRIPT_VERSION,
        executedDeletion: false,
      },
      status: 'BLOCKED_BY_VALIDATION',
      message: 'Dry-run complete. No deletion executed.',
      deletedCount: 0,
      deletedSlugs: [],
      skippedSlugs: [],
      failedSlugs: [],
      approvedRemainingSlugs: [],
      preservedPostPresentSlugs: precheck.preservedPrePresentSlugs,
      preservedDroppedSlugs: [],
      noDeleteGroupsDeleted: {
        blockedDeleted: [],
        protectedDeleted: [],
        ambiguousDeleted: [],
      },
    };

    writeJson(resultJsonPath, result);
    writeFileSync(resultMdPath, `${buildResultMarkdown(result)}\n`, 'utf8');
    console.log('Dry-run complete. No deletion executed.');
    return;
  }

  if (mode === 'post-check') {
    const approvedRemainingRows: Array<{ slug: string }> = await tenantDelegate.findMany({
      where: { slug: { in: [...APPROVED_SLUGS] } },
      select: { slug: true },
    });

    const preservedRows: Array<{ slug: string }> = await tenantDelegate.findMany({
      where: { slug: { in: preservedUniverse } },
      select: { slug: true },
    });

    const preservedPostPresent = Array.from(new Set(preservedRows.map(row => row.slug))).sort();
    const preservedDropped = precheck.preservedPrePresentSlugs.filter(
      slug => !preservedPostPresent.some(post => normalizeSlug(post) === normalizeSlug(slug)),
    );

    const noDeleteGroupsDeleted = {
      blockedDeleted: DELETE_BLOCKED_SLUGS.filter(
        slug => !preservedPostPresent.some(post => normalizeSlug(post) === normalizeSlug(slug)),
      ),
      protectedDeleted: PROTECTED_NO_ACTION_SLUGS.filter(
        slug => !preservedPostPresent.some(post => normalizeSlug(post) === normalizeSlug(slug)),
      ),
      ambiguousDeleted: AMBIGUOUS_NO_ACTION_SLUGS.filter(
        slug => !preservedPostPresent.some(post => normalizeSlug(post) === normalizeSlug(slug)),
      ),
    };

    const result: ExecutionResult = {
      metadata: {
        generatedAt: new Date().toISOString(),
        gitHead: getGitHead(repoRoot),
        mode,
        unitId: UNIT_ID,
        scriptVersion: SCRIPT_VERSION,
        executedDeletion: false,
      },
      status:
        approvedRemainingRows.length === 0 &&
        preservedDropped.length === 0 &&
        noDeleteGroupsDeleted.blockedDeleted.length === 0 &&
        noDeleteGroupsDeleted.protectedDeleted.length === 0 &&
        noDeleteGroupsDeleted.ambiguousDeleted.length === 0
          ? 'EXECUTED'
          : 'BLOCKED_BY_VALIDATION',
      message:
        approvedRemainingRows.length === 0 &&
        preservedDropped.length === 0 &&
        noDeleteGroupsDeleted.blockedDeleted.length === 0 &&
        noDeleteGroupsDeleted.protectedDeleted.length === 0 &&
        noDeleteGroupsDeleted.ambiguousDeleted.length === 0
          ? 'Post-check passed. Approved rows absent and preserved rows still present.'
          : 'Post-check failed. Approved rows remain or preserved rows dropped.',
      deletedCount: 0,
      deletedSlugs: [],
      skippedSlugs: [],
      failedSlugs: [],
      approvedRemainingSlugs: approvedRemainingRows.map(row => row.slug).sort(),
      preservedPostPresentSlugs: preservedPostPresent,
      preservedDroppedSlugs: preservedDropped,
      noDeleteGroupsDeleted,
    };

    writeJson(resultJsonPath, result);
    writeFileSync(resultMdPath, `${buildResultMarkdown(result)}\n`, 'utf8');
    console.log(result.message);
    return;
  }

  const prePreserved = precheck.preservedPrePresentSlugs;
  const deleted = await prisma.$transaction(async tx => {
    const deleteResult = await tx.tenant.deleteMany({ where: { slug: { in: [...APPROVED_SLUGS] } } });
    if (deleteResult.count !== 44) {
      throw new Error(`Deleted count mismatch. expected=44 actual=${deleteResult.count}`);
    }

    const remaining = await tx.tenant.findMany({
      where: { slug: { in: [...APPROVED_SLUGS] } },
      select: { slug: true },
    });

    if (remaining.length > 0) {
      throw new Error(`Approved slugs still present after delete: ${remaining.map(row => row.slug).join(', ')}`);
    }

    const postPreservedRows: Array<{ slug: string }> = await tx.tenant.findMany({
      where: { slug: { in: preservedUniverse } },
      select: { slug: true },
    });

    const postPreserved = Array.from(new Set(postPreservedRows.map(row => row.slug))).sort();
    const preservedDropped = prePreserved.filter(
      slug => !postPreserved.some(post => normalizeSlug(post) === normalizeSlug(slug)),
    );

    if (preservedDropped.length > 0) {
      throw new Error(`Preserved slugs were removed: ${preservedDropped.join(', ')}`);
    }

    return {
      deletedCount: deleteResult.count,
      postPreserved,
    };
  });

  const postApprovedRemaining: Array<{ slug: string }> = await tenantDelegate.findMany({
    where: { slug: { in: [...APPROVED_SLUGS] } },
    select: { slug: true },
  });

  const postPreservedRows: Array<{ slug: string }> = await tenantDelegate.findMany({
    where: { slug: { in: preservedUniverse } },
    select: { slug: true },
  });

  const preservedPostPresent = Array.from(new Set(postPreservedRows.map(row => row.slug))).sort();

  const result: ExecutionResult = {
    metadata: {
      generatedAt: new Date().toISOString(),
      gitHead: getGitHead(repoRoot),
      mode,
      unitId: UNIT_ID,
      scriptVersion: SCRIPT_VERSION,
      executedDeletion: true,
    },
    status: postApprovedRemaining.length === 0 ? 'EXECUTED' : 'BLOCKED_BY_VALIDATION',
    message:
      postApprovedRemaining.length === 0
        ? 'Deleted exactly approved 44 slugs and preserved no-delete groups.'
        : 'Deletion executed but post-check found remaining approved rows.',
    deletedCount: deleted.deletedCount,
    deletedSlugs: [...APPROVED_SLUGS],
    skippedSlugs: [],
    failedSlugs: [],
    approvedRemainingSlugs: postApprovedRemaining.map(row => row.slug).sort(),
    preservedPostPresentSlugs: preservedPostPresent,
    preservedDroppedSlugs: [],
    noDeleteGroupsDeleted: {
      blockedDeleted: [],
      protectedDeleted: [],
      ambiguousDeleted: [],
    },
  };

  writeJson(resultJsonPath, result);
  writeFileSync(resultMdPath, `${buildResultMarkdown(result)}\n`, 'utf8');
  console.log('Deletion executed for approved subset.');
}

run()
  .catch(error => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Execution failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
