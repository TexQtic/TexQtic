import 'dotenv/config';

type RuntimeOptions = {
  mode: 'dry-run' | 'execute';
  baseUrl: string;
  owner: string;
  purpose: string;
  closeGate: string;
  retentionIntent: string;
  cleanupPlan: string;
  runTag: string;
  legalName: string;
  displayName: string;
  jurisdiction: string;
  tenantCategory: 'B2B' | 'B2C' | 'AGGREGATOR' | 'INTERNAL';
  isWhiteLabel: boolean;
  firstOwnerEmail: string;
  orchestrationReference: string;
  adminToken?: string;
  adminEmail?: string;
  adminPassword?: string;
};

type LoginResponse = {
  data?: {
    token?: string;
  };
  token?: string;
};

type ProvisionResponse = {
  data?: {
    orgId: string;
    slug: string;
    provisioningMode: 'LEGACY_ADMIN' | 'APPROVED_ONBOARDING';
    organization?: {
      status?: string;
    };
  };
};

type ParsedArgs = {
  flags: Record<string, string | boolean>;
};

function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string | boolean> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (!current.startsWith('--')) {
      continue;
    }

    const key = current.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith('--')) {
      flags[key] = true;
      continue;
    }

    flags[key] = next;
    index += 1;
  }

  return { flags };
}

function requireString(flags: Record<string, string | boolean>, key: string, fallback?: string): string {
  const raw = flags[key] ?? fallback;

  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error(`Missing required option --${key}`);
  }

  return raw.trim();
}

function resolveMode(flags: Record<string, string | boolean>): 'dry-run' | 'execute' {
  return flags.execute === true ? 'execute' : 'dry-run';
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 80);
}

function defaultRunTag(): string {
  return new Date().toISOString().replaceAll(/[:.]/g, '-').slice(0, 19);
}

function buildOptions(argv: string[]): RuntimeOptions {
  const { flags } = parseArgs(argv);
  const runTag = requireString(flags, 'run-tag', process.env.ACTIVATION_VERIFY_RUN_TAG ?? defaultRunTag());
  const owner = requireString(flags, 'owner', process.env.ACTIVATION_VERIFY_OWNER);
  const purpose = requireString(flags, 'purpose', process.env.ACTIVATION_VERIFY_PURPOSE);
  const closeGate = requireString(flags, 'close-gate', process.env.ACTIVATION_VERIFY_CLOSE_GATE);
  const retentionIntent = requireString(flags, 'retention-intent', process.env.ACTIVATION_VERIFY_RETENTION_INTENT);
  const cleanupPlan = requireString(flags, 'cleanup-plan', process.env.ACTIVATION_VERIFY_CLEANUP_PLAN);
  const baseUrl = normalizeBaseUrl(requireString(flags, 'base-url', process.env.ACTIVATION_VERIFY_BASE_URL));
  const tenantCategory = (requireString(flags, 'tenant-category', process.env.ACTIVATION_VERIFY_TENANT_CATEGORY ?? 'B2B') as RuntimeOptions['tenantCategory']);
  const isWhiteLabel = flags['white-label'] === true || process.env.ACTIVATION_VERIFY_IS_WHITE_LABEL === 'true';
  const legalName = requireString(
    flags,
    'legal-name',
    process.env.ACTIVATION_VERIFY_LEGAL_NAME ?? `Activation Verification Tenant [ACTIVATION-VERIFICATION-STATE-ENABLEMENT-001][${runTag}]`
  );
  const displayName = requireString(
    flags,
    'display-name',
    process.env.ACTIVATION_VERIFY_DISPLAY_NAME ?? `Activation Verify ${runTag}`
  );
  const jurisdiction = requireString(flags, 'jurisdiction', process.env.ACTIVATION_VERIFY_JURISDICTION ?? 'US-DE');
  const firstOwnerEmail = requireString(
    flags,
    'first-owner-email',
    process.env.ACTIVATION_VERIFY_FIRST_OWNER_EMAIL ?? `activation-verify+${slugify(runTag)}@example.test`
  ).toLowerCase();
  const orchestrationReference = requireString(
    flags,
    'orchestration-reference',
    process.env.ACTIVATION_VERIFY_ORCHESTRATION_REFERENCE ?? `activation-verify:${runTag}`
  );

  return {
    mode: resolveMode(flags),
    baseUrl,
    owner,
    purpose,
    closeGate,
    retentionIntent,
    cleanupPlan,
    runTag,
    legalName,
    displayName,
    jurisdiction,
    tenantCategory,
    isWhiteLabel,
    firstOwnerEmail,
    orchestrationReference,
    adminToken: typeof flags['admin-token'] === 'string' ? flags['admin-token'] : process.env.TEXQTIC_ADMIN_TOKEN,
    adminEmail: typeof flags['admin-email'] === 'string' ? flags['admin-email'] : process.env.TEXQTIC_ADMIN_EMAIL,
    adminPassword: typeof flags['admin-password'] === 'string' ? flags['admin-password'] : process.env.TEXQTIC_ADMIN_PASSWORD,
  };
}

function printUsage(): void {
  console.log([
    'prepare-activation-verification-state.ts',
    '',
    'Purpose:',
    '  Prepare one ephemeral verification tenant through the approved-onboarding provisioning seam',
    '  so a later close-readiness run can exercise the existing activate-approved control-plane path',
    '  from a persisted VERIFICATION_APPROVED source state.',
    '',
    'Default mode:',
    '  dry-run (no mutation)',
    '',
    'Required governance flags:',
    '  --base-url <https://host>',
    '  --owner <operator-or-unit-owner>',
    '  --purpose <why this state is needed>',
    '  --close-gate <bounded-unit-or-close-gate>',
    '  --retention-intent <retain-until-close|remove-immediately|review-by-date>',
    '  --cleanup-plan <what will happen after verification>',
    '',
    'Optional flags:',
    '  --run-tag <tag>                       defaults to ISO timestamp fragment',
    '  --legal-name <name>                  defaults to a tagged activation verification tenant name',
    '  --display-name <name>                defaults to Activation Verify <runTag>',
    '  --jurisdiction <code>                defaults to US-DE',
    '  --tenant-category <B2B|B2C|AGGREGATOR|INTERNAL>  defaults to B2B',
    '  --white-label                        marks the ephemeral tenant as white-label',
    '  --first-owner-email <email>          defaults to activation-verify+<runTag>@example.test',
    '  --orchestration-reference <value>    defaults to activation-verify:<runTag>',
    '  --admin-token <jwt>                  uses an existing admin JWT',
    '  --admin-email <email>                admin login email if token not provided',
    '  --admin-password <password>          admin login password if token not provided',
    '  --execute                            performs the provisioning and outcome requests',
    '  --help                               print this usage',
  ].join('\n'));
}

function buildProvisionBody(options: RuntimeOptions) {
  return {
    provisioningMode: 'APPROVED_ONBOARDING' as const,
    orchestrationReference: options.orchestrationReference,
    tenant_category: options.tenantCategory,
    is_white_label: options.isWhiteLabel,
    organization: {
      legalName: options.legalName,
      displayName: options.displayName,
      jurisdiction: options.jurisdiction,
      registrationNumber: options.runTag,
    },
    firstOwner: {
      email: options.firstOwnerEmail,
    },
    approvedOnboardingMetadata: {
      verificationMechanism: 'ACTIVATION-VERIFICATION-STATE-ENABLEMENT-001',
      verificationTenantClass: 'EPHEMERAL',
      purpose: options.purpose,
      owner: options.owner,
      closeGate: options.closeGate,
      retentionIntent: options.retentionIntent,
      cleanupPlan: options.cleanupPlan,
      runTag: options.runTag,
    },
  };
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const raw = await response.text();
  let parsed: unknown = null;

  try {
    parsed = raw.length > 0 ? JSON.parse(raw) : null;
  } catch {
    parsed = raw;
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}: ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`);
  }

  return parsed as T;
}

async function resolveAdminToken(options: RuntimeOptions): Promise<string> {
  if (options.adminToken && options.adminToken.trim().length > 0) {
    return options.adminToken.trim();
  }

  if (!options.adminEmail || !options.adminPassword) {
    throw new Error('Execution requires --admin-token or both --admin-email and --admin-password');
  }

  const response = await requestJson<LoginResponse>(`${options.baseUrl}/api/auth/admin/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: options.adminEmail,
      password: options.adminPassword,
    }),
  });

  const token = response.data?.token ?? response.token;

  if (!token) {
    throw new Error('Admin login succeeded but no token was returned');
  }

  return token;
}

function printPlan(options: RuntimeOptions): void {
  const tenantSlug = slugify(options.displayName);

  console.log(JSON.stringify({
    mode: options.mode,
    strategy: 'EPHEMERAL_VERIFICATION_TENANT',
    baseUrl: options.baseUrl,
    governanceTrail: {
      owner: options.owner,
      purpose: options.purpose,
      closeGate: options.closeGate,
      classification: 'EPHEMERAL',
      retentionIntent: options.retentionIntent,
      cleanupPlan: options.cleanupPlan,
      runTag: options.runTag,
    },
    tenantPlan: {
      legalName: options.legalName,
      displayName: options.displayName,
      expectedSlug: tenantSlug,
      firstOwnerEmail: options.firstOwnerEmail,
      orchestrationReference: options.orchestrationReference,
      targetStateAfterPreparation: 'VERIFICATION_APPROVED',
      activationStepLeftForLaterCloseRun: true,
    },
    sequence: [
      'POST /api/control/tenants/provision with provisioningMode=APPROVED_ONBOARDING',
      'Verify the provisioning response reports organization.status=VERIFICATION_APPROVED',
      'Open the tenant in control-plane deep-dive and verify the activation control is visible before later activate-approved proof',
      'After close-grade verification, apply the recorded cleanup or rollback plan',
    ],
  }, null, 2));
}

async function executePlan(options: RuntimeOptions): Promise<void> {
  const token = await resolveAdminToken(options);
  const provision = await requestJson<ProvisionResponse>(`${options.baseUrl}/api/control/tenants/provision`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Texqtic-Realm': 'control',
    },
    body: JSON.stringify(buildProvisionBody(options)),
  });

  const tenantId = provision.data?.orgId;
  const tenantSlug = provision.data?.slug;

  if (!tenantId || !tenantSlug) {
    throw new Error('Provisioning response did not include orgId and slug');
  }

  const preparedStatus = provision.data?.organization?.status;

  if (preparedStatus !== 'VERIFICATION_APPROVED') {
    throw new Error(
      `Provisioning did not prepare VERIFICATION_APPROVED state for ${tenantId}; received ${preparedStatus ?? 'UNKNOWN'}`
    );
  }

  console.log(JSON.stringify({
    mode: options.mode,
    preparedTenant: {
      id: tenantId,
      slug: tenantSlug,
      classification: 'EPHEMERAL',
      targetState: preparedStatus,
    },
    governanceTrail: {
      owner: options.owner,
      purpose: options.purpose,
      closeGate: options.closeGate,
      retentionIntent: options.retentionIntent,
      cleanupPlan: options.cleanupPlan,
      runTag: options.runTag,
    },
    nextStep: 'Use the reviewed tenant deep-dive to verify the Activate Approved Tenant control and complete the later close-grade activation smoke check.',
  }, null, 2));
}

async function main(): Promise<void> {
  if (process.argv.includes('--help')) {
    printUsage();
    return;
  }

  const options = buildOptions(process.argv.slice(2));

  if (options.mode === 'dry-run') {
    printPlan(options);
    return;
  }

  await executePlan(options);
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}