#!/usr/bin/env node --import tsx
/* global process */
/**
 * governance-lint.ts
 *
 * Minimal structural governance linter.
 *
 * Scope intentionally excludes human-only judgment. It validates:
 * - Layer 0 structural consistency
 * - status vocabulary in canonical governance files
 * - required governance co-updates for obvious state transitions
 * - archive-only closure violations where machine-detectable
 * - governance/process diff-scope boundaries
 * - verification taxonomy presence on changed closure/sequencing decision records
 *
 * Emits: artifacts/governance-lint-report.json
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');

const UNIT_STATUSES = new Set([
  'OPEN',
  'IN_PROGRESS',
  'BLOCKED',
  'DEFERRED',
  'DESIGN_GATE',
  'VERIFICATION_REQUIRED',
  'VERIFIED_COMPLETE',
  'CLOSED',
]);

const DECISION_STATUSES = new Set(['OPEN', 'DECIDED', 'SUPERSEDED']);
const LOG_STATUSES = new Set(['VERIFIED_COMPLETE', 'CLOSED']);
const NEXT_ACTION_TYPES = new Set(['IMPLEMENTATION', 'VERIFICATION', 'GOVERNANCE', 'DESIGN', 'POLICY']);
const VERIFICATION_TAXONOMY = [
  'STATIC_VERIFICATION',
  'TEST_VERIFICATION',
  'RUNTIME_VERIFICATION',
  'PRODUCTION_VERIFICATION',
  'GOVERNANCE_RECONCILIATION_CONFIRMATION',
  'HISTORICAL_EVIDENCE_ONLY',
];

const GOVERNANCE_ALLOWLIST = [
  /^governance\//,
  /^scripts\/governance-lint\.ts$/,
  /^\.github\/workflows\/governance-lint\.yml$/,
  /^package\.json$/,
  /^\.github\/pull_request_template\.md$/,
];

const CANONICAL_REFS = [
  'governance/control/',
  'governance/units/',
  'governance/decisions/',
  'governance/log/',
];

const ARCHIVE_ONLY_PATTERNS = [
  /governance\/archive\//i,
  /IMPLEMENTATION-TRACKER-/i,
  /governance\/gap-register\.md/i,
  /governance\/wave-execution-log\.md/i,
];

type Layer0Summary = {
  open: number;
  blocked: number;
  deferred: number;
  designGate: number;
  total: number;
};

type NextAction = {
  unitId: string;
  type: string;
  raw: string;
};

function main(): void {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   TEXQTIC — Governance Linter                              ║');
  console.log('║   Minimal Structural Governance Checks                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const failures: string[] = [];
  const warnings: string[] = [];
  const changedFiles = collectChangedFiles();

  console.log(`[lint] Changed files detected: ${changedFiles.length}`);
  if (changedFiles.length > 0) {
    for (const file of changedFiles) {
      console.log(`[lint]   - ${file}`);
    }
  }

  const layer0Summary = validateLayer0(failures);
  validateSnapshotConsistency(layer0Summary, failures);

  const governanceScopeActive = changedFiles.some(isGovernanceScopeFile);
  if (governanceScopeActive) {
    validateGovernanceScope(changedFiles, failures);
    validateCoUpdates(changedFiles, failures);
    validateChangedFiles(changedFiles, failures, warnings);
  } else {
    console.log('[lint] No governance/process files changed. Running baseline Layer 0 checks only.');
  }

  writeArtifact(changedFiles, failures, warnings, governanceScopeActive);

  console.log('');
  if (warnings.length > 0) {
    console.log('Warnings:');
    for (const warning of warnings) {
      console.log(`  ! ${warning}`);
    }
    console.log('');
  }

  if (failures.length > 0) {
    console.error('╔══════════════════════════════════════════════════════════════╗');
    console.error('║  🚨  GOVERNANCE LINTER FAILED                              ║');
    console.error('╚══════════════════════════════════════════════════════════════╝');
    console.error('');
    for (const failure of failures) {
      console.error(`  ✗ ${failure}`);
    }
    console.error('');
    process.exit(1);
  }

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  ✅  GOVERNANCE LINTER PASSED                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  process.exit(0);
}

function collectChangedFiles(): string[] {
  if (process.env.GITHUB_ACTIONS === 'true') {
    const eventName = process.env.GITHUB_EVENT_NAME;
    const baseRef = process.env.GITHUB_BASE_REF;

    if (eventName === 'pull_request' && baseRef) {
      const diff = gitLines(['diff', '--name-only', `origin/${baseRef}...HEAD`]);
      if (diff.length > 0) {
        return diff;
      }
    }

    if (hasHeadParent()) {
      const diff = gitLines(['diff', '--name-only', 'HEAD^', 'HEAD']);
      if (diff.length > 0) {
        return diff;
      }
    }
  }

  const working = gitLines(['diff', '--name-only', 'HEAD', '--']);
  const staged = gitLines(['diff', '--name-only', '--cached', '--']);
  const untracked = gitLines(['ls-files', '--others', '--exclude-standard']);
  return unique([...working, ...staged, ...untracked]);
}

function validateLayer0(failures: string[]): Layer0Summary {
  const openSetText = readRepoFile('governance/control/OPEN-SET.md');
  const rows = extractOpenSetRows(openSetText);

  if (rows.length === 0) {
    failures.push('[Layer 0] OPEN-SET.md has no canonical non-terminal rows.');
  }

  for (const row of rows) {
    if (!UNIT_STATUSES.has(row.status)) {
      failures.push(`[Layer 0] OPEN-SET.md contains invalid unit status: ${row.status}`);
    }
  }

  const summary = {
    open: rows.filter(row => row.status === 'OPEN').length,
    blocked: rows.filter(row => row.status === 'BLOCKED').length,
    deferred: rows.filter(row => row.status === 'DEFERRED').length,
    designGate: rows.filter(row => row.status === 'DESIGN_GATE').length,
    total: rows.length,
  };

  if (summary.open > 1) {
    failures.push(`[Layer 0] More than one implementation-ready unit is OPEN (${summary.open}).`);
  }

  const summaryLines = extractOpenSetSummary(openSetText);
  if (summaryLines.open !== summary.open) {
    failures.push(`[Layer 0] OPEN summary mismatch: file says ${summaryLines.open}, table says ${summary.open}.`);
  }
  if (summaryLines.blocked !== summary.blocked) {
    failures.push(`[Layer 0] BLOCKED summary mismatch: file says ${summaryLines.blocked}, table says ${summary.blocked}.`);
  }
  if (summaryLines.deferred !== summary.deferred) {
    failures.push(`[Layer 0] DEFERRED summary mismatch: file says ${summaryLines.deferred}, table says ${summary.deferred}.`);
  }
  if (summaryLines.designGate !== summary.designGate) {
    failures.push(`[Layer 0] DESIGN_GATE summary mismatch: file says ${summaryLines.designGate}, table says ${summary.designGate}.`);
  }
  if (summaryLines.total !== summary.total) {
    failures.push(`[Layer 0] Total non-terminal summary mismatch: file says ${summaryLines.total}, table says ${summary.total}.`);
  }

  const nextAction = parseNextAction(readRepoFile('governance/control/NEXT-ACTION.md'), failures);

  if (!NEXT_ACTION_TYPES.has(nextAction.type)) {
    failures.push(`[Layer 0] NEXT-ACTION.md contains invalid type: ${nextAction.type}`);
  }
  if (summary.open === 0 && nextAction.type === 'IMPLEMENTATION') {
    failures.push('[Layer 0] NEXT-ACTION.md points to IMPLEMENTATION while OPEN-SET shows 0 implementation-ready units.');
  }
  if (summary.open > 0 && nextAction.unitId === 'OPERATOR_DECISION_REQUIRED') {
    failures.push('[Layer 0] NEXT-ACTION.md remains OPERATOR_DECISION_REQUIRED while OPEN-SET shows an OPEN unit.');
  }

  return summary;
}

function validateSnapshotConsistency(summary: Layer0Summary, failures: string[]): void {
  const snapshotText = readRepoFile('governance/control/SNAPSHOT.md');
  const openMatch = /\*\*(\d+) implementation units are currently OPEN\.\*\*/.exec(snapshotText);
  if (openMatch) {
    const snapshotOpen = Number(openMatch[1]);
    if (snapshotOpen !== summary.open) {
      failures.push(`[Layer 0] SNAPSHOT.md open-unit count mismatch: snapshot says ${snapshotOpen}, OPEN-SET says ${summary.open}.`);
    }
  }
}

function validateGovernanceScope(changedFiles: string[], failures: string[]): void {
  const disallowed = changedFiles.filter(file => !GOVERNANCE_ALLOWLIST.some(pattern => pattern.test(file)));
  if (disallowed.length > 0) {
    failures.push(`[Scope] Governance/process change set includes forbidden path(s): ${disallowed.join(', ')}`);
  }
}

function validateCoUpdates(changedFiles: string[], failures: string[]): void {
  const changed = new Set(changedFiles);
  const hasSnapshot = changed.has('governance/control/SNAPSHOT.md');
  const hasLog = changed.has('governance/log/EXECUTION-LOG.md');

  if (changed.has('governance/control/OPEN-SET.md') && (!hasSnapshot || !hasLog)) {
    failures.push('[Co-update] OPEN-SET.md changed without both SNAPSHOT.md and EXECUTION-LOG.md.');
  }

  if (changed.has('governance/control/NEXT-ACTION.md') && (!hasSnapshot || !hasLog)) {
    failures.push('[Co-update] NEXT-ACTION.md changed without both SNAPSHOT.md and EXECUTION-LOG.md.');
  }

  const changedUnit = changedFiles.some(file => /^governance\/units\/[^/]+\.md$/.test(file) && !file.endsWith('/README.md'));
  if (changedUnit && (!hasSnapshot || !hasLog)) {
    failures.push('[Co-update] A governance unit record changed without both SNAPSHOT.md and EXECUTION-LOG.md.');
  }

  const changedDecision = changedFiles.some(file => /^governance\/decisions\/[^/]+\.md$/.test(file) && !file.endsWith('/README.md'));
  if (changedDecision && (!hasSnapshot || !hasLog)) {
    failures.push('[Co-update] A decision record changed without both SNAPSHOT.md and EXECUTION-LOG.md.');
  }
}

function validateChangedFiles(changedFiles: string[], failures: string[], warnings: string[]): void {
  for (const file of changedFiles) {
    if (!existsSync(resolve(REPO_ROOT, file))) {
      continue;
    }

    if (file === 'governance/log/EXECUTION-LOG.md') {
      validateExecutionLog(readRepoFile(file), failures);
      continue;
    }

    if (file === 'governance/control/OPEN-SET.md') {
      validateOpenSetStatuses(readRepoFile(file), failures);
      continue;
    }

    if (/^governance\/units\/[^/]+\.md$/.test(file) && !file.endsWith('/README.md')) {
      const text = readRepoFile(file);
      validateUnitStatus(file, text, failures);
      validateVerificationTaxonomy(file, text, failures);
      validateArchiveOnlyClosure(file, text, failures);
      addHumanBoundaryWarnings(file, text, warnings);
      continue;
    }

    if (/^governance\/decisions\/[^/]+\.md$/.test(file) && !file.endsWith('/README.md')) {
      const text = readRepoFile(file);
      validateDecisionStatus(file, text, failures);
      validateVerificationTaxonomy(file, text, failures);
      validateArchiveOnlyClosure(file, text, failures);
      addHumanBoundaryWarnings(file, text, warnings);
    }
  }
}

function validateExecutionLog(text: string, failures: string[]): void {
  const textWithoutCodeBlocks = text.replaceAll(/```[\s\S]*?```/g, '');
  const statuses = [...textWithoutCodeBlocks.matchAll(/^Status:\s*(.+)$/gm)].map(match => match[1].trim());
  for (const status of statuses) {
    if (!LOG_STATUSES.has(status)) {
      failures.push(`[Layer 3] EXECUTION-LOG.md contains invalid log status: ${status}`);
    }
  }
}

function validateOpenSetStatuses(text: string, failures: string[]): void {
  for (const row of extractOpenSetRows(text)) {
    if (!UNIT_STATUSES.has(row.status)) {
      failures.push(`[Layer 0] OPEN-SET.md contains invalid status in canonical row: ${row.status}`);
    }
  }
}

function validateUnitStatus(file: string, text: string, failures: string[]): void {
  const match = /^status:\s*(.+)$/m.exec(text);
  if (!match) {
    failures.push(`[Layer 1] ${file} is missing a canonical unit status.`);
    return;
  }
  const status = match[1].trim();
  if (!UNIT_STATUSES.has(status)) {
    failures.push(`[Layer 1] ${file} contains invalid unit status: ${status}`);
  }
}

function validateDecisionStatus(file: string, text: string, failures: string[]): void {
  const match = /^Status:\s*(.+)$/m.exec(text);
  if (!match) {
    failures.push(`[Layer 2] ${file} is missing a decision status.`);
    return;
  }
  const status = match[1].trim();
  if (!DECISION_STATUSES.has(status)) {
    failures.push(`[Layer 2] ${file} contains invalid decision status: ${status}`);
  }
}

function validateVerificationTaxonomy(file: string, text: string, failures: string[]): void {
  const isClosureOrSequencingRecord = /(closure|sequencing|reconciliation|verification)/i.test(text);
  if (!isClosureOrSequencingRecord) {
    return;
  }

  const hasTaxonomy = VERIFICATION_TAXONOMY.some(token => text.includes(token));
  if (!hasTaxonomy) {
    failures.push(`[Policy] ${file} changes closure/sequencing/reconciliation content without an explicit verification taxonomy label.`);
  }
}

function validateArchiveOnlyClosure(file: string, text: string, failures: string[]): void {
  const hasArchiveLikeRef = ARCHIVE_ONLY_PATTERNS.some(pattern => pattern.test(text));
  if (!hasArchiveLikeRef) {
    return;
  }

  const hasCanonicalRef = CANONICAL_REFS.some(prefix => text.includes(prefix));
  if (!hasCanonicalRef) {
    failures.push(`[Policy] ${file} appears to make a closure-grade claim with archive-only or tracker-only references.`);
  }
}

function addHumanBoundaryWarnings(file: string, text: string, warnings: string[]): void {
  const touchesHistorical = /(historical|reconciliation|backfill|Case A|Case B|Case C|Case D|Case E)/i.test(text);
  const touchesSequencing = /(sequencing|materially present|materially implemented)/i.test(text);

  if (!touchesHistorical && !touchesSequencing) {
    return;
  }

  const categories: string[] = [];
  if (touchesHistorical) {
    categories.push('historical classification / exactness');
  }
  if (touchesSequencing) {
    categories.push('sequencing / materiality');
  }

  pushUniqueWarning(
    warnings,
    `${file} touches human-review-only governance judgment (${categories.join(', ')}). These remain outside automation.`
  );
}

function pushUniqueWarning(warnings: string[], warning: string): void {
  if (!warnings.includes(warning)) {
    warnings.push(warning);
  }
}

function extractOpenSetRows(text: string): Array<{ unitId: string; status: string }> {
  const lines = text.split(/\r?\n/);
  const headerIndex = lines.findIndex(line => line.trim() === '| UNIT-ID | Title | Status | Wave | Last Updated |');
  if (headerIndex === -1) {
    return [];
  }

  const rows: Array<{ unitId: string; status: string }> = [];
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line.startsWith('|')) {
      break;
    }

    const cells = line.split('|').map(cell => cell.trim()).filter(Boolean);
    if (cells.length < 5) {
      continue;
    }

    rows.push({
      unitId: cells[0],
      status: cells[2],
    });
  }

  return rows;
}

function extractOpenSetSummary(text: string): Layer0Summary {
  return {
    open: extractSummaryValue(text, /- \*\*OPEN\*\* \(implementation-ready\): \*\*(\d+)\*\*/),
    blocked: extractSummaryValue(text, /- \*\*BLOCKED\*\*: (\d+)/),
    deferred: extractSummaryValue(text, /- \*\*DEFERRED\*\*: (\d+)/),
    designGate: extractSummaryValue(text, /- \*\*DESIGN_GATE\*\*: (\d+)/),
    total: extractSummaryValue(text, /- \*\*Total non-terminal units: (\d+)\*\*/),
  };
}

function extractSummaryValue(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  return match ? Number(match[1]) : -1;
}

function parseNextAction(text: string, failures: string[]): NextAction {
  const blockMatch = /```yaml\s*([\s\S]*?)```/m.exec(text);
  if (!blockMatch) {
    failures.push('[Layer 0] NEXT-ACTION.md is missing its YAML block.');
    return { unitId: '', type: '', raw: '' };
  }

  const yaml = blockMatch[1];
  const requiredKeys = ['unit_id', 'type', 'title', 'prerequisites_met', 'authorized_by', 'date_authorized'];
  for (const key of requiredKeys) {
    const count = [...yaml.matchAll(new RegExp(`^${key}:`, 'gm'))].length;
    if (count !== 1) {
      failures.push(`[Layer 0] NEXT-ACTION.md must contain exactly one ${key} field.`);
    }
  }

  return {
    unitId: extractYamlValue(yaml, 'unit_id'),
    type: extractYamlValue(yaml, 'type'),
    raw: yaml,
  };
}

function extractYamlValue(text: string, key: string): string {
  const match = new RegExp(String.raw`^${key}:\s*(.+)$`, 'm').exec(text);
  return match ? match[1].trim() : '';
}

function readRepoFile(filePath: string): string {
  return readFileSync(resolve(REPO_ROOT, filePath), 'utf8');
}

function gitLines(args: string[]): string[] {
  try {
    const output = execFileSync('git', args, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    return output
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(normalizePath);
  } catch {
    return [];
  }
}

function hasHeadParent(): boolean {
  try {
    execFileSync('git', ['rev-parse', '--verify', 'HEAD^'], {
      cwd: REPO_ROOT,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function normalizePath(value: string): string {
  return value.replaceAll('\\', '/');
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function isGovernanceScopeFile(file: string): boolean {
  return GOVERNANCE_ALLOWLIST.some(pattern => pattern.test(file));
}

function writeArtifact(changedFiles: string[], failures: string[], warnings: string[], governanceScopeActive: boolean): void {
  const artifactDir = resolve(REPO_ROOT, 'artifacts');
  mkdirSync(artifactDir, { recursive: true });

  const artifactPath = resolve(artifactDir, 'governance-lint-report.json');
  const artifact = {
    _meta: {
      description: 'Minimal governance linter report',
      generatedAt: new Date().toISOString(),
      result: failures.length === 0 ? 'PASS' : 'FAIL',
      changedFileCount: changedFiles.length,
      governanceScopeActive,
      failureCount: failures.length,
      warningCount: warnings.length,
    },
    changedFiles,
    failures,
    warnings,
  };

  writeFileSync(artifactPath, JSON.stringify(artifact, null, 2), 'utf8');
  console.log(`[lint] Report written → ${relative(REPO_ROOT, artifactPath).replaceAll('\\', '/')}`);
}

main();