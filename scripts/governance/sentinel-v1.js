import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');

const CANONICAL_PATHS = {
  spec: 'governance/sentinel/GOVERNANCE-SENTINEL-V1-SPEC.md',
  schema: 'governance/schema/GOVERNANCE-SENTINEL-V1-GATE-RESULT-SCHEMA.md',
  template:
    'governance/templates/GOVERNANCE-SENTINEL-V1-CORRECTION-ORDER-TEMPLATE.md',
  openSet: 'governance/control/OPEN-SET.md',
  nextAction: 'governance/control/NEXT-ACTION.md',
  snapshot: 'governance/control/SNAPSHOT.md',
  normalizationLedger: 'governance/analysis/CANDIDATE-NORMALIZATION-LEDGER.md',
  transitionalLedger: 'governance/analysis/STEP2-PENDING-CANDIDATE-LEDGER.md',
  specOpeningDecision:
    'governance/decisions/GOV-DEC-GOVERNANCE-SENTINEL-V1-SPEC-OPENING.md',
  automationOpeningDecision:
    'governance/decisions/GOV-DEC-GOVERNANCE-SENTINEL-V1-AUTOMATION-OPENING.md',
  automationUnit: 'governance/units/GOVERNANCE-SENTINEL-V1-AUTOMATION-001.md',
};

const DELIVERY_CLASSES = new Set([
  'ACTIVE_DELIVERY',
  'OPENING_QUEUE',
  'DECISION_QUEUE',
  'DESIGN_GATE_QUEUE',
  'BLOCKED_QUEUE',
  'DEFERRED_QUEUE',
]);

const CHECKS = {
  'SENTINEL-V1-CHECK-001': {
    name: 'candidate_normalization_schema_conformance',
    directive:
      'Restore authoritative normalization usage and required canonical row fields before progression.',
  },
  'SENTINEL-V1-CHECK-002': {
    name: 'delivery_class_presence',
    directive:
      'Restore one approved delivery class on every required Layer 0 or candidate-bearing surface.',
  },
  'SENTINEL-V1-CHECK-003': {
    name: 'mirror_check_traceability',
    directive:
      'Add the missing bounded mirror-check references before progression.',
  },
  'SENTINEL-V1-CHECK-004': {
    name: 'negative_evidence_review',
    directive:
      'Provide the exact negative-evidence record and verdict before progression.',
  },
  'SENTINEL-V1-CHECK-005': {
    name: 'layer0_consistency',
    directive: 'Repair Layer 0 contradictions before progression.',
  },
  'SENTINEL-V1-CHECK-006': {
    name: 'allowlist_boundary_conformance',
    directive:
      'Constrain the change set to the exact allowlisted surfaces for the bounded unit.',
  },
  'SENTINEL-V1-CHECK-007': {
    name: 'execution_log_linkage_applicability',
    directive:
      'Restore exact execution-log linkage or mark the claim not applicable before progression.',
  },
  'SENTINEL-V1-CHECK-008': {
    name: 'spec_surface_linkage_consistency',
    directive:
      'Repair spec-surface linkage inconsistencies before progression.',
  },
  'SENTINEL-V1-CHECK-009': {
    name: 'correction_order_completion',
    directive:
      'Complete the correction order and required retry evidence before rerun.',
  },
};

const CHECKPOINTS = new Set([
  'candidate_normalization_progression',
  'opening_progression',
  'governance_sync_progression',
  'close_progression',
  'layer0_next_action_change',
  'clean_governance_review_claim',
]);

const CHECKPOINT_MATRIX = {
  candidate_normalization_progression(context) {
    const checks = [
      'SENTINEL-V1-CHECK-001',
      'SENTINEL-V1-CHECK-002',
      'SENTINEL-V1-CHECK-003',
      'SENTINEL-V1-CHECK-004',
      'SENTINEL-V1-CHECK-006',
      'SENTINEL-V1-CHECK-008',
    ];
    if (context.executionLogClaimed) {
      checks.push('SENTINEL-V1-CHECK-007');
    }
    return checks;
  },
  opening_progression(context) {
    const checks = [
      'SENTINEL-V1-CHECK-002',
      'SENTINEL-V1-CHECK-005',
      'SENTINEL-V1-CHECK-006',
      'SENTINEL-V1-CHECK-008',
    ];
    if (context.candidateBearing) {
      checks.unshift('SENTINEL-V1-CHECK-001');
    }
    if (context.candidateDriven) {
      checks.push('SENTINEL-V1-CHECK-003');
    }
    if (context.negativeEvidenceRequired) {
      checks.push('SENTINEL-V1-CHECK-004');
    }
    return dedupe(checks);
  },
  governance_sync_progression(context) {
    const checks = [
      'SENTINEL-V1-CHECK-005',
      'SENTINEL-V1-CHECK-006',
      'SENTINEL-V1-CHECK-008',
    ];
    if (context.executionLogClaimed) {
      checks.push('SENTINEL-V1-CHECK-007');
    }
    if (context.retryFromFail) {
      checks.push('SENTINEL-V1-CHECK-009');
    }
    return checks;
  },
  close_progression(context) {
    const checks = [
      'SENTINEL-V1-CHECK-005',
      'SENTINEL-V1-CHECK-006',
      'SENTINEL-V1-CHECK-008',
    ];
    if (context.executionLogClaimed) {
      checks.push('SENTINEL-V1-CHECK-007');
    }
    if (context.retryFromFail) {
      checks.push('SENTINEL-V1-CHECK-009');
    }
    return checks;
  },
  layer0_next_action_change(context) {
    const checks = [
      'SENTINEL-V1-CHECK-002',
      'SENTINEL-V1-CHECK-005',
      'SENTINEL-V1-CHECK-006',
      'SENTINEL-V1-CHECK-008',
    ];
    if (context.retryFromFail) {
      checks.push('SENTINEL-V1-CHECK-009');
    }
    return checks;
  },
  clean_governance_review_claim(context) {
    const checks = [
      'SENTINEL-V1-CHECK-003',
      'SENTINEL-V1-CHECK-004',
      'SENTINEL-V1-CHECK-005',
      'SENTINEL-V1-CHECK-006',
      'SENTINEL-V1-CHECK-008',
    ];
    if (context.executionLogClaimed) {
      checks.push('SENTINEL-V1-CHECK-007');
    }
    return checks;
  },
};

const AUTOMATION_ALLOWLIST = [
  'governance/sentinel/GOVERNANCE-SENTINEL-V1-SPEC.md',
  'governance/schema/GOVERNANCE-SENTINEL-V1-GATE-RESULT-SCHEMA.md',
  'governance/templates/GOVERNANCE-SENTINEL-V1-CORRECTION-ORDER-TEMPLATE.md',
  'governance/control/OPEN-SET.md',
  'governance/control/NEXT-ACTION.md',
  'governance/control/SNAPSHOT.md',
  'governance/log/EXECUTION-LOG.md',
  'governance/analysis/CANDIDATE-NORMALIZATION-LEDGER.md',
  'governance/analysis/STEP2-PENDING-CANDIDATE-LEDGER.md',
  'governance/units/GOVERNANCE-SENTINEL-V1-SPEC-001.md',
  'governance/units/GOVERNANCE-SENTINEL-V1-AUTOMATION-001.md',
  'governance/decisions/GOV-DEC-GOVERNANCE-SENTINEL-V1-SPEC-OPENING.md',
  'governance/sentinel/',
  'governance/schema/',
  'governance/templates/',
  'scripts/governance/',
  'tools/governance/',
  'package.json',
  'pnpm-workspace.yaml',
  'turbo.json',
  'docs/governance/',
];

const CORRECTION_FAILURE_CLASSES = new Set([
  'taxonomy_schema',
  'delivery_class_presence',
  'mirror_check_traceability',
  'negative_evidence_review',
  'layer0_consistency',
  'execution_log_linkage',
  'spec_surface_linkage',
  'linkage_consistency',
  'allowlist_boundary',
  'correction_order_completion',
]);

function main() {
  try {
    const { command, options } = parseCli(process.argv.slice(2));

    if (!command || command === 'help' || options.help) {
      printHelp();
      return;
    }

    if (command === 'run') {
      const result = runSentinel(options);
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      process.exitCode = result.status === 'PASS' ? 0 : 1;
      return;
    }

    if (command === 'correction-order') {
      const yaml = buildCorrectionOrder(options);
      process.stdout.write(`${yaml}\n`);
      return;
    }

    throw new Error(`Unknown command: ${command}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Sentinel v1 automation error: ${message}\n`);
    process.exitCode = 1;
  }
}

function runSentinel(options) {
  const checkpoint = getSingle(options, 'checkpoint');
  const subject = getSingle(options, 'subject');

  if (!CHECKPOINTS.has(checkpoint)) {
    throw new Error(
      `checkpoint must be one of: ${Array.from(CHECKPOINTS).join(', ')}`
    );
  }

  const context = {
    checkpoint,
    subject,
    candidateBearing: getBoolean(options, 'candidate-bearing'),
    candidateDriven: getBoolean(options, 'candidate-driven'),
    executionLogClaimed: hasValues(options, 'execution-log-ref'),
    negativeEvidenceRequired: getBoolean(options, 'negative-evidence-required'),
    retryFromFail: getBoolean(options, 'retry-from-fail'),
  };

  const requiredChecks = CHECKPOINT_MATRIX[checkpoint](context);
  const layer0Reference =
    getOptional(options, 'layer0-reference') ||
    [
      CANONICAL_PATHS.openSet,
      CANONICAL_PATHS.nextAction,
      CANONICAL_PATHS.snapshot,
    ].join(' | ');
  const normalizationReference =
    getOptional(options, 'normalization-reference') ||
    (context.candidateBearing
      ? CANONICAL_PATHS.normalizationLedger
      : 'not_applicable');
  const decisionReferences = getArray(options, 'decision-ref');
  const evidenceReferences = dedupe([
    ...getArray(options, 'evidence-ref'),
    CANONICAL_PATHS.spec,
    CANONICAL_PATHS.schema,
    CANONICAL_PATHS.template,
  ]);

  const checkResults = [];

  for (const checkId of requiredChecks) {
    checkResults.push(runCheck(checkId, options, context));
  }

  const failedChecks = checkResults
    .filter((result) => result.status === 'FAIL')
    .map((result) => result.check_id);
  const status = failedChecks.length === 0 ? 'PASS' : 'FAIL';
  const gateResult = {
    sentinel_version: 'v1',
    checkpoint,
    subject,
    status,
    checks_run: requiredChecks,
    checks_failed: failedChecks,
    layer0_reference: layer0Reference,
    normalization_reference: normalizationReference,
    decision_references: decisionReferences,
    evidence_references: evidenceReferences,
    check_results: checkResults,
    allowlist_scope_checked: requiredChecks.includes('SENTINEL-V1-CHECK-006'),
    correction_order_required: status === 'FAIL',
    correction_order_reference: context.retryFromFail
      ? getOptional(options, 'correction-order-reference') ||
        'missing_required_correction_order_reference'
      : 'not_applicable',
    negative_evidence_required: context.negativeEvidenceRequired,
    broad_claim_under_review: context.negativeEvidenceRequired
      ? getSingle(options, 'broad-claim-under-review')
      : 'not_applicable',
    negative_evidence_references: context.negativeEvidenceRequired
      ? getArray(options, 'negative-evidence-ref')
      : [],
    prior_exclusion_references:
      getArray(options, 'prior-exclusion-ref').length > 0
        ? getArray(options, 'prior-exclusion-ref')
        : 'not_applicable',
    negative_evidence_verdict: context.negativeEvidenceRequired
      ? getSingle(options, 'negative-evidence-verdict')
      : 'not_applicable',
    generated_on: new Date().toISOString().slice(0, 10),
  };

  const schemaErrors = validateGateResult(gateResult, requiredChecks, context);
  if (schemaErrors.length > 0) {
    throw new Error(
      `generated gate result is invalid: ${schemaErrors.join(' | ')}`
    );
  }

  return gateResult;
}

function runCheck(checkId, options, context) {
  switch (checkId) {
    case 'SENTINEL-V1-CHECK-001':
      return runCheck001(options, context);
    case 'SENTINEL-V1-CHECK-002':
      return runCheck002();
    case 'SENTINEL-V1-CHECK-003':
      return runCheck003(options, context);
    case 'SENTINEL-V1-CHECK-004':
      return runCheck004(options, context);
    case 'SENTINEL-V1-CHECK-005':
      return runCheck005();
    case 'SENTINEL-V1-CHECK-006':
      return runCheck006(options, context);
    case 'SENTINEL-V1-CHECK-007':
      return runCheck007(options, context);
    case 'SENTINEL-V1-CHECK-008':
      return runCheck008();
    case 'SENTINEL-V1-CHECK-009':
      return runCheck009(options, context);
    default:
      throw new Error(`Unsupported check: ${checkId}`);
  }
}

function runCheck001(options, context) {
  const evidence = [
    CANONICAL_PATHS.normalizationLedger,
    CANONICAL_PATHS.transitionalLedger,
  ];
  const normalizationReference =
    getOptional(options, 'normalization-reference') ||
    'missing_normalization_reference';
  const ledger = readRepoFile(CANONICAL_PATHS.normalizationLedger);
  const transitional = readRepoFile(CANONICAL_PATHS.transitionalLedger);
  const missingHeaders = [
    'Exact Candidate Name',
    'Candidate Kind',
    'Disposition',
    'Delivery Class',
    'Negative Evidence Summary',
    'Next Lawful Step',
    'Confidence',
    'Last Validated',
  ].filter((header) => !ledger.includes(`| ${header} |`));

  const failures = [];

  if (!context.candidateBearing) {
    failures.push(
      'candidate-bearing context was not provided for a checkpoint that requires normalization validation'
    );
  }
  if (normalizationReference !== CANONICAL_PATHS.normalizationLedger) {
    failures.push(
      'normalization_reference is not the canonical normalization ledger'
    );
  }
  if (missingHeaders.length > 0) {
    failures.push(
      `canonical normalization ledger is missing required fields: ${missingHeaders.join(', ')}`
    );
  }
  if (!ledger.includes('## Sentinel v1 Validation Contract')) {
    failures.push(
      'canonical normalization ledger is missing the Sentinel v1 validation contract section'
    );
  }
  if (!transitional.includes('## Sentinel v1 Transitional Access Rule')) {
    failures.push(
      'transitional Step 2 ledger is missing the transitional access rule section'
    );
  }

  return buildCheckResult('SENTINEL-V1-CHECK-001', failures, evidence);
}

function runCheck002() {
  const evidence = [
    CANONICAL_PATHS.openSet,
    CANONICAL_PATHS.nextAction,
    CANONICAL_PATHS.snapshot,
  ];
  const openSet = parseOpenSet(readRepoFile(CANONICAL_PATHS.openSet));
  const nextAction = parseYamlBlock(readRepoFile(CANONICAL_PATHS.nextAction));
  const failures = [];

  for (const row of openSet.rows) {
    if (!row.deliveryClass || !DELIVERY_CLASSES.has(row.deliveryClass)) {
      failures.push(
        `OPEN-SET row ${row.unitId} is missing an approved delivery class`
      );
    }
  }

  if (nextAction.delivery_class !== 'ACTIVE_DELIVERY') {
    failures.push(
      'NEXT-ACTION does not preserve ACTIVE_DELIVERY authorization'
    );
  }

  if (!DELIVERY_CLASSES.has(openSet.summary.activeDeliveryLabel)) {
    failures.push(
      'OPEN-SET summary does not preserve the ACTIVE_DELIVERY label'
    );
  }

  return buildCheckResult('SENTINEL-V1-CHECK-002', failures, evidence);
}

function runCheck003(options, context) {
  const evidence = dedupe(
    [
      ...getArray(options, 'analysis-ref'),
      ...getArray(options, 'decision-ref'),
      ...getArray(options, 'evidence-ref'),
      context.candidateBearing ? CANONICAL_PATHS.normalizationLedger : null,
    ].filter(Boolean)
  );
  const failures = [];

  if (getArray(options, 'analysis-ref').length === 0) {
    failures.push('analysis-ref is required for mirror-check traceability');
  }

  if (getArray(options, 'decision-ref').length === 0) {
    failures.push('decision-ref is required for mirror-check traceability');
  }

  for (const ref of evidence) {
    if (!repoPathExists(ref)) {
      failures.push(`required traceability reference is missing: ${ref}`);
    }
  }

  if (getBoolean(options, 'layer0-effect-claimed')) {
    const openSet = readRepoFile(CANONICAL_PATHS.openSet);
    const snapshot = readRepoFile(CANONICAL_PATHS.snapshot);
    if (
      !openSet.includes(context.subject) ||
      !snapshot.includes(context.subject)
    ) {
      failures.push(
        'claimed Layer 0 effect is not mirrored by Layer 0 surfaces'
      );
    }
  }

  return buildCheckResult('SENTINEL-V1-CHECK-003', failures, evidence);
}

function runCheck004(options, context) {
  const evidence = getArray(options, 'negative-evidence-ref');
  const failures = [];
  const verdict = getSingle(options, 'negative-evidence-verdict');

  if (!context.negativeEvidenceRequired) {
    failures.push(
      'negative-evidence review was required by the checkpoint context but not enabled'
    );
  }

  if (!getOptional(options, 'broad-claim-under-review')) {
    failures.push(
      'broad-claim-under-review is required when negative evidence is required'
    );
  }

  if (evidence.length === 0) {
    failures.push(
      'negative-evidence-ref is required when negative evidence is required'
    );
  }

  if (!['broad_claim_disproved', 'broad_claim_not_proven'].includes(verdict)) {
    failures.push(
      'negative-evidence-verdict must be broad_claim_disproved or broad_claim_not_proven'
    );
  }

  for (const ref of evidence) {
    if (!repoPathExists(ref)) {
      failures.push(`negative evidence reference does not exist: ${ref}`);
    }
  }

  return buildCheckResult('SENTINEL-V1-CHECK-004', failures, evidence);
}

function runCheck005() {
  const evidence = [
    CANONICAL_PATHS.openSet,
    CANONICAL_PATHS.nextAction,
    CANONICAL_PATHS.snapshot,
  ];
  const openSet = parseOpenSet(readRepoFile(CANONICAL_PATHS.openSet));
  const nextAction = parseYamlBlock(readRepoFile(CANONICAL_PATHS.nextAction));
  const snapshot = readRepoFile(CANONICAL_PATHS.snapshot);
  const failures = [];

  const openRows = openSet.rows.filter((row) => row.status === 'OPEN');
  const designGateRows = openSet.rows.filter(
    (row) => row.status === 'DESIGN_GATE'
  );
  const activeDeliveryRows = openSet.rows.filter(
    (row) => row.deliveryClass === 'ACTIVE_DELIVERY'
  );
  const decisionQueueRows = openSet.rows.filter(
    (row) => row.deliveryClass === 'DECISION_QUEUE'
  );

  if (openRows.length !== openSet.summary.openCount) {
    failures.push('OPEN-SET summary OPEN count does not match the table truth');
  }
  if (designGateRows.length !== openSet.summary.designGateCount) {
    failures.push(
      'OPEN-SET summary DESIGN_GATE count does not match the table truth'
    );
  }
  if (activeDeliveryRows.length !== openSet.summary.activeDeliveryCount) {
    failures.push(
      'OPEN-SET summary ACTIVE_DELIVERY count does not match the table truth'
    );
  }
  if (decisionQueueRows.length !== openSet.summary.decisionQueueCount) {
    failures.push(
      'OPEN-SET summary DECISION_QUEUE count does not match the table truth'
    );
  }
  if (openSet.rows.length !== openSet.summary.totalNonTerminalCount) {
    failures.push(
      'OPEN-SET summary total non-terminal count does not match the table truth'
    );
  }
  if (
    activeDeliveryRows.length !== 1 ||
    activeDeliveryRows[0]?.unitId !== nextAction.unit_id
  ) {
    failures.push(
      'NEXT-ACTION does not match the sole ACTIVE_DELIVERY Layer 0 unit'
    );
  }
  const expectedSnapshotOpenUnits = `**Open governed units: ${openSet.rows.length}**`;
  if (!snapshot.includes(expectedSnapshotOpenUnits)) {
    failures.push(
      'SNAPSHOT does not reflect the current open governed unit count'
    );
  }
  if (!snapshot.includes('CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002')) {
    failures.push(
      'SNAPSHOT does not preserve the current ACTIVE_DELIVERY unit'
    );
  }
  if (!snapshot.includes('GOVERNANCE-SENTINEL-V1-AUTOMATION-001')) {
    failures.push(
      'SNAPSHOT does not preserve the concurrent automation unit posture'
    );
  }

  return buildCheckResult('SENTINEL-V1-CHECK-005', failures, evidence);
}

function runCheck006(options, context) {
  const modifiedFiles = getArray(options, 'modified-file').map(
    normalizeRepoPath
  );
  const failures = [];
  const allowlist = buildAllowlistForCheck006(options, context, failures);

  if (modifiedFiles.length === 0) {
    failures.push(
      'modified-file must be supplied for allowlist boundary validation'
    );
  }

  for (const filePath of modifiedFiles) {
    if (!isAllowlisted(filePath, allowlist)) {
      failures.push(`non-allowlisted file in change scope: ${filePath}`);
    }
  }

  return buildCheckResult('SENTINEL-V1-CHECK-006', failures, modifiedFiles);
}

function buildAllowlistForCheck006(options, context, failures) {
  const allowlist = [...AUTOMATION_ALLOWLIST];

  if (context.checkpoint !== 'close_progression') {
    return allowlist;
  }

  const unitFile = getOptional(options, 'unit-file');

  if (!unitFile) {
    failures.push(
      'unit-file is required for close_progression allowlist boundary validation'
    );
    return allowlist;
  }

  allowlist.push(normalizeRepoPath(unitFile));
  return dedupe(allowlist);
}

function runCheck007(options, context) {
  const executionLogRefs = getArray(options, 'execution-log-ref');
  const failures = [];

  if (!context.executionLogClaimed) {
    failures.push(
      'execution-log linkage was required but no execution-log-ref was supplied'
    );
    return buildCheckResult(
      'SENTINEL-V1-CHECK-007',
      failures,
      executionLogRefs
    );
  }

  for (const ref of executionLogRefs) {
    if (!repoPathExists(ref)) {
      failures.push(`execution-log reference does not exist: ${ref}`);
      continue;
    }

    const content = readRepoFile(ref);
    if (!content.includes(context.subject)) {
      failures.push(
        `execution-log reference does not mention subject ${context.subject}: ${ref}`
      );
    }
  }

  return buildCheckResult('SENTINEL-V1-CHECK-007', failures, executionLogRefs);
}

function runCheck008() {
  const evidence = [
    CANONICAL_PATHS.spec,
    CANONICAL_PATHS.schema,
    CANONICAL_PATHS.template,
    CANONICAL_PATHS.specOpeningDecision,
    CANONICAL_PATHS.automationOpeningDecision,
    CANONICAL_PATHS.automationUnit,
  ];
  const failures = [];
  const spec = readRepoFile(CANONICAL_PATHS.spec);
  const schema = readRepoFile(CANONICAL_PATHS.schema);
  const template = readRepoFile(CANONICAL_PATHS.template);
  const specDecision = readRepoFile(CANONICAL_PATHS.specOpeningDecision);
  const automationDecision = readRepoFile(
    CANONICAL_PATHS.automationOpeningDecision
  );
  const automationUnit = readRepoFile(CANONICAL_PATHS.automationUnit);

  for (const checkId of Object.keys(CHECKS)) {
    if (!spec.includes(checkId)) {
      failures.push(`spec surface is missing ${checkId}`);
    }
    if (!schema.includes(checkId)) {
      failures.push(`schema surface is missing ${checkId}`);
    }
  }

  for (const checkpoint of CHECKPOINTS) {
    if (!spec.includes(`\`${checkpoint}\``)) {
      failures.push(`spec surface is missing checkpoint ${checkpoint}`);
    }
    if (!schema.includes(`- \`${checkpoint}\``)) {
      failures.push(`schema surface is missing checkpoint ${checkpoint}`);
    }
  }

  if (!template.includes('directive_verdict: RETRY_BLOCKED')) {
    failures.push('correction-order template does not preserve RETRY_BLOCKED');
  }
  if (
    !specDecision.includes(CANONICAL_PATHS.spec) ||
    !specDecision.includes(CANONICAL_PATHS.schema) ||
    !specDecision.includes(CANONICAL_PATHS.template)
  ) {
    failures.push(
      'spec opening decision does not preserve the canonical artifact surfaces'
    );
  }
  if (
    !automationDecision.includes('exact approved check catalog') ||
    !automationDecision.includes('exact approved checkpoint set')
  ) {
    failures.push(
      'automation opening decision does not preserve the approved automation boundary'
    );
  }
  if (
    !automationUnit.includes('authoritative normalized truth') ||
    !automationUnit.includes('transitional/reference only')
  ) {
    failures.push(
      'automation unit record does not preserve the authoritative versus transitional ledger posture'
    );
  }

  return buildCheckResult('SENTINEL-V1-CHECK-008', failures, evidence);
}

function runCheck009(options, context) {
  const correctionOrderRef = getOptional(options, 'correction-order-reference');
  const failures = [];

  if (!context.retryFromFail) {
    failures.push(
      'retry-from-fail must be supplied for correction-order completion validation'
    );
    return buildCheckResult(
      'SENTINEL-V1-CHECK-009',
      failures,
      correctionOrderRef ? [correctionOrderRef] : []
    );
  }

  if (!correctionOrderRef) {
    failures.push(
      'correction-order-reference is required for retry validation'
    );
    return buildCheckResult('SENTINEL-V1-CHECK-009', failures, []);
  }

  if (!repoPathExists(correctionOrderRef)) {
    failures.push(
      `correction-order-reference does not exist: ${correctionOrderRef}`
    );
    return buildCheckResult('SENTINEL-V1-CHECK-009', failures, [
      correctionOrderRef,
    ]);
  }

  const content = readRepoFile(correctionOrderRef);
  if (!content.includes('directive_verdict: RETRY_BLOCKED')) {
    failures.push(
      'correction order does not preserve directive_verdict: RETRY_BLOCKED'
    );
  }
  if (!content.includes('pass_fail_recheck_targets:')) {
    failures.push(
      'correction order does not include pass_fail_recheck_targets'
    );
  }
  if (!content.includes('evidence_required_for_retry:')) {
    failures.push(
      'correction order does not include evidence_required_for_retry'
    );
  }

  return buildCheckResult('SENTINEL-V1-CHECK-009', failures, [
    correctionOrderRef,
  ]);
}

function buildCorrectionOrder(options) {
  const correctionOrderId = getSingle(options, 'correction-order-id');
  const failedCheckpoint = getSingle(options, 'failed-checkpoint');
  const failedSubject = getSingle(options, 'failed-subject');
  const failedGateResult = getSingle(options, 'failed-gate-result');
  const failureClass = getArray(options, 'failure-class');
  const requiredCorrections = getArray(options, 'required-correction');
  const owners = getArray(options, 'owner');
  const retryBlockedUntil = getArray(options, 'retry-blocked-until');
  const evidenceRequired = getArray(options, 'evidence-required-for-retry');
  const recheckTargets = getArray(options, 'pass-fail-recheck-target');
  const notes = getSingle(options, 'notes');

  if (!CHECKPOINTS.has(failedCheckpoint)) {
    throw new Error(
      `failed-checkpoint must be one of: ${Array.from(CHECKPOINTS).join(', ')}`
    );
  }

  if (failureClass.length === 0) {
    throw new Error('At least one --failure-class is required.');
  }
  for (const item of failureClass) {
    if (!CORRECTION_FAILURE_CLASSES.has(item)) {
      throw new Error(`Invalid failure-class: ${item}`);
    }
  }

  if (
    requiredCorrections.length === 0 ||
    owners.length === 0 ||
    retryBlockedUntil.length === 0 ||
    evidenceRequired.length === 0 ||
    recheckTargets.length === 0
  ) {
    throw new Error(
      'required-correction, owner, retry-blocked-until, evidence-required-for-retry, and pass-fail-recheck-target are all required.'
    );
  }

  for (const target of recheckTargets) {
    if (!CHECKS[target]) {
      throw new Error(`Invalid pass-fail-recheck-target: ${target}`);
    }
  }

  return [
    `correction_order_id: ${correctionOrderId}`,
    'sentinel_version: v1',
    `failed_checkpoint: ${failedCheckpoint}`,
    `failed_subject: ${failedSubject}`,
    `failed_gate_result: ${failedGateResult}`,
    'failure_class:',
    ...failureClass.map((item) => `  - ${item}`),
    'required_corrections:',
    ...requiredCorrections.map((item) => `  - ${quoteYaml(item)}`),
    'owners:',
    ...owners.map((item) => `  - ${quoteYaml(item)}`),
    'retry_blocked_until:',
    ...retryBlockedUntil.map((item) => `  - ${quoteYaml(item)}`),
    'evidence_required_for_retry:',
    ...evidenceRequired.map((item) => `  - ${quoteYaml(item)}`),
    'pass_fail_recheck_targets:',
    ...recheckTargets.map((item) => `  - ${item}`),
    'directive_verdict: RETRY_BLOCKED',
    `notes: ${quoteYaml(notes)}`,
  ].join('\n');
}

function validateGateResult(result, requiredChecks, context) {
  return [
    ...validateGateCore(result, context),
    ...validateRequiredCheckCoverage(result, requiredChecks),
    ...validateCheckResultEntries(result),
    ...validateNegativeEvidenceRules(result, context),
  ];
}

function validateGateCore(result, context) {
  const errors = [];

  if (result.sentinel_version !== 'v1') {
    errors.push('sentinel_version must equal v1');
  }
  if (!CHECKPOINTS.has(result.checkpoint)) {
    errors.push('checkpoint is invalid');
  }
  if (!Array.isArray(result.checks_run) || result.checks_run.length === 0) {
    errors.push('checks_run must be a non-empty array');
  }
  if (
    !Array.isArray(result.check_results) ||
    result.check_results.length === 0
  ) {
    errors.push('check_results must be a non-empty array');
  }
  if (result.status === 'FAIL' && result.checks_failed.length === 0) {
    errors.push('checks_failed must be non-empty on FAIL');
  }
  if (result.status === 'PASS' && result.checks_failed.length > 0) {
    errors.push('checks_failed must be empty on PASS');
  }
  if (
    context.candidateBearing &&
    result.normalization_reference !== CANONICAL_PATHS.normalizationLedger
  ) {
    errors.push(
      'candidate-bearing result must use the canonical normalization ledger'
    );
  }
  if (!result.layer0_reference) {
    errors.push('layer0_reference is required');
  }
  if (
    !Array.isArray(result.decision_references) ||
    result.decision_references.length === 0
  ) {
    errors.push(
      'decision_references must be non-empty for governance-gated work'
    );
  }

  return errors;
}

function validateRequiredCheckCoverage(result, requiredChecks) {
  const errors = [];

  for (const requiredCheck of requiredChecks) {
    if (
      !result.check_results.some((entry) => entry.check_id === requiredCheck)
    ) {
      errors.push(`missing required check_result for ${requiredCheck}`);
    }
  }

  return errors;
}

function validateCheckResultEntries(result) {
  const errors = [];

  for (const entry of result.check_results) {
    if (!CHECKS[entry.check_id]) {
      errors.push(`invalid check_results.check_id: ${entry.check_id}`);
    }
    if (entry.status !== 'PASS' && entry.status !== 'FAIL') {
      errors.push(`invalid check status for ${entry.check_id}`);
    }
    if (entry.status === 'FAIL' && entry.failure_reason === 'not_applicable') {
      errors.push(
        `failed check ${entry.check_id} must provide a failure_reason`
      );
    }
    if (entry.status === 'PASS' && entry.failure_reason !== 'not_applicable') {
      errors.push(
        `passed check ${entry.check_id} must use failure_reason not_applicable`
      );
    }
  }

  return errors;
}

function validateNegativeEvidenceRules(result, context) {
  const errors = [];

  if (context.negativeEvidenceRequired) {
    if (
      !result.broad_claim_under_review ||
      result.broad_claim_under_review === 'not_applicable'
    ) {
      errors.push(
        'broad_claim_under_review is required when negative evidence is required'
      );
    }
    if (
      !Array.isArray(result.negative_evidence_references) ||
      result.negative_evidence_references.length === 0
    ) {
      errors.push(
        'negative_evidence_references are required when negative evidence is required'
      );
    }
    if (
      !['broad_claim_disproved', 'broad_claim_not_proven'].includes(
        result.negative_evidence_verdict
      )
    ) {
      errors.push('negative_evidence_verdict is invalid');
    }
    return errors;
  }

  if (result.negative_evidence_verdict !== 'not_applicable') {
    errors.push(
      'negative_evidence_verdict must be not_applicable when negative evidence is not required'
    );
  }

  return errors;
}

function buildCheckResult(checkId, failures, evidenceRefs) {
  const hasFailure = failures.length > 0;
  return {
    check_id: checkId,
    check_name: CHECKS[checkId].name,
    status: hasFailure ? 'FAIL' : 'PASS',
    failure_reason: hasFailure ? failures.join(' | ') : 'not_applicable',
    evidence_refs: dedupe(evidenceRefs.map(normalizeRepoPath)),
    directive: hasFailure ? CHECKS[checkId].directive : 'not_applicable',
  };
}

function parseOpenSet(content) {
  const rows = content
    .split(/\r?\n/)
    .filter((line) => line.startsWith('| '))
    .map((line) => line.trim())
    .filter(
      (line) => !line.includes('| --- |') && !line.includes('| UNIT-ID |')
    )
    .map((line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim())
    )
    .map((cells) => ({
      unitId: cells[0],
      title: cells[1],
      status: cells[2],
      deliveryClass: cells[3],
      wave: cells[4],
      lastUpdated: cells[5],
    }))
    .filter((row) => row.unitId && row.wave);

  return {
    rows,
    summary: {
      openCount: readSummaryCount(content, 'OPEN'),
      designGateCount: readSummaryCount(content, 'DESIGN_GATE'),
      activeDeliveryCount: readSummaryCount(content, 'ACTIVE_DELIVERY'),
      decisionQueueCount: readSummaryCount(content, 'DECISION_QUEUE'),
      totalNonTerminalCount: readSummaryCount(
        content,
        'Total non-terminal units'
      ),
      activeDeliveryLabel: 'ACTIVE_DELIVERY',
    },
  };
}

function parseYamlBlock(content) {
  const match = content.match(/```yaml\s*([\s\S]*?)```/);
  if (!match) {
    throw new Error('Could not locate yaml block in NEXT-ACTION');
  }

  const parsed = {};
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trimEnd();
    const simpleMatch = trimmed.match(/^([a-z_]+):\s*(.+)$/i);
    if (simpleMatch && !trimmed.endsWith('|')) {
      parsed[simpleMatch[1]] = simpleMatch[2].trim();
    }
  }
  return parsed;
}

function readSummaryCount(content, label) {
  const line = content
    .split(/\r?\n/)
    .find(
      (candidateLine) =>
        candidateLine.includes(`**${label}**`) ||
        candidateLine.includes(`**${label}:`)
    );

  if (!line) {
    throw new Error(`Unable to read summary count for ${label} from OPEN-SET`);
  }

  const count = line.match(/\d+/);
  if (count) {
    return Number(count[0]);
  }
  throw new Error(`Unable to read summary count for ${label} from OPEN-SET`);
}

function parseCli(argv) {
  const [command = 'help', ...rest] = argv;
  const options = {};

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) {
      throw new Error(`Unexpected token: ${token}`);
    }
    const key = token.slice(2);
    const next = rest[index + 1];
    if (!next || next.startsWith('--')) {
      pushOption(options, key, 'true');
      continue;
    }
    pushOption(options, key, next);
    index += 1;
  }

  return { command, options };
}

function pushOption(target, key, value) {
  if (!Object.hasOwn(target, key)) {
    target[key] = [];
  }
  target[key].push(value);
}

function getSingle(options, key) {
  const values = getArray(options, key);
  if (values.length === 0) {
    throw new Error(`--${key} is required`);
  }
  if (values.length > 1) {
    throw new Error(`--${key} must be supplied once`);
  }
  return values[0];
}

function getOptional(options, key) {
  const values = getArray(options, key);
  if (values.length === 0) {
    return '';
  }
  if (values.length > 1) {
    throw new Error(`--${key} must be supplied once`);
  }
  return values[0];
}

function getArray(options, key) {
  return (options[key] || []).map(String);
}

function hasValues(options, key) {
  return getArray(options, key).length > 0;
}

function getBoolean(options, key) {
  const value = getOptional(options, key);
  if (!value) {
    return false;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  throw new Error(`--${key} must be true or false`);
}

function dedupe(values) {
  return Array.from(new Set(values));
}

function repoPathExists(relativePath) {
  const normalized = normalizeRepoPath(relativePath);
  return fs.existsSync(path.join(repoRoot, normalized));
}

function readRepoFile(relativePath) {
  const normalized = normalizeRepoPath(relativePath);
  const absolutePath = path.join(repoRoot, normalized);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${normalized}`);
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function normalizeRepoPath(value) {
  const normalized = String(value).replaceAll('\\', '/');
  return normalized.startsWith('./') ? normalized.slice(2) : normalized;
}

function isAllowlisted(relativePath, allowlist = AUTOMATION_ALLOWLIST) {
  return allowlist.some((allowed) => {
    if (allowed.endsWith('/')) {
      return relativePath.startsWith(allowed);
    }
    return relativePath === allowed;
  });
}

function quoteYaml(value) {
  return JSON.stringify(String(value));
}

function printHelp() {
  process.stdout.write(
    [
      'Sentinel v1 bounded automation runner',
      '',
      'Commands:',
      '  run               Execute the approved Sentinel v1 checkpoint checks and emit one gate-result JSON record.',
      '  correction-order  Emit one correction-order YAML artifact matching the approved template.',
      '',
      'Common run options:',
      '  --checkpoint <label>',
      '  --subject <unit-or-artifact>',
      '  --decision-ref <path>            Repeatable.',
      '  --evidence-ref <path>            Repeatable.',
      '  --modified-file <path>           Repeatable. Required when allowlist validation runs.',
      '  --candidate-bearing true|false',
      '  --candidate-driven true|false',
      '  --negative-evidence-required true|false',
      '  --broad-claim-under-review <label>',
      '  --negative-evidence-ref <path>   Repeatable.',
      '  --negative-evidence-verdict <broad_claim_disproved|broad_claim_not_proven>',
      '  --analysis-ref <path>            Repeatable for mirror-check traceability.',
      '  --layer0-effect-claimed true|false',
      '  --execution-log-ref <path>       Repeatable when linkage is claimed.',
      '  --unit-file <path>               Required for close_progression when the unit record is part of the lawful close surface.',
      '  --retry-from-fail true|false     Required when rerunning a checkpoint after a prior FAIL.',
      '  --correction-order-reference <path> Required whenever --retry-from-fail is true; must point to an existing bounded correction-order artifact.',
      '',
      'Use docs/governance/GOVERNANCE-SENTINEL-V1-AUTOMATION.md for exact invocation examples.',
    ].join('\n')
  );
}

main();
