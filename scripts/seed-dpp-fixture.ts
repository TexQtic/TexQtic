#!/usr/bin/env node --import tsx
/* global process */
/**
 * seed-dpp-fixture.ts — TECS-DPP-PASSPORT-NETWORK-010-B QA Published Fixture
 *
 * Idempotent script that finds or promotes a QA traceability node to PUBLISHED
 * passport status and writes fixture metadata to .auth/dpp-qa-fixture.json
 * for consumption by E2E tests (DPP-E2E-12/13/14).
 *
 * Usage:
 *   node --import tsx scripts/seed-dpp-fixture.ts
 *
 * Prerequisites:
 *   - .auth/qa-b2b.json must exist with { token, orgId }
 *   - If no traceability node exists: script auto-creates QA sentinel node via Prisma
 *   - Evidence gate (cert + lineage) is auto-satisfied via Prisma when not yet met
 *
 * Output:
 *   .auth/dpp-qa-fixture.json  (gitignored)
 *   Contents: { nodeId, publicPassportId, productLabel }
 *
 * Security: never prints token, orgId, connection strings, or credentials.
 *
 * AUTHORIZED: QA-only direct Prisma seed exception for DPP fixture activation
 * DATA-ONLY: no DDL, no schema changes
 * QA-PREFIX SAFETY: every write scoped to qa-prefixed org slug
 * SECRETS: no password/token/cookie/connection-string printed
 * PRODUCT SAFETY: does not alter maker-checker routes or production API behavior
 * Authorized by: TECS-DPP-PASSPORT-NETWORK-010-B-ACTIVATE-PRISMA-SEED
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
// Prisma import: resolved from server/node_modules (QA seed exception — C-first/A-fallback)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — relative path to server Prisma client; intentional in QA seed only
import { PrismaClient } from '../server/node_modules/@prisma/client';

// ── Constants ─────────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const BASE_URL = (process.env.PLAYWRIGHT_BASE_URL ?? 'https://app.texqtic.com').replace(/\/$/, '');

/**
 * Sentinel UUID for the QA APPROVED cert created by strategy A fallback.
 * Fixed so subsequent runs are idempotent (upsert by this id).
 * This value is deterministic fixture metadata — NOT a secret.
 */
const QA_CERT_SENTINEL_ID = 'f0000000-0000-4000-a000-000000000001';

/**
 * Sentinel batchId for the QA root traceability node created when the org has none.
 * Fixed so subsequent runs are idempotent (upsert by orgId + batchId).
 */
const QA_NODE_SENTINEL_BATCH_ID = 'qa-dpp-fixture-node-001';

// ── QA-prefix safety guards ───────────────────────────────────────────────────

function assertQaSlug(slug: string): void {
  if (!slug.startsWith('qa-')) {
    throw new Error(`STOP: non-QA org slug encountered: "${slug}" — refusing to write`);
  }
}

function assertQaOrg(orgId: string, slug: string): void {
  assertQaSlug(slug);
  if (typeof orgId !== 'string' || orgId.length === 0) {
    throw new Error('STOP: orgId is empty — refusing to write');
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthState { token: string; orgId: string; }

interface DppFixtureMeta { nodeId: string; publicPassportId: string; productLabel: string; }

interface PassportApiView {
  passportStatus: string;
  publicPassportId: string | null;
  passportEvidenceSummary?: {
    approvedCertCount: number;
    lineageDepth: number;
    aiExtractedClaimsCount: number;
  };
}

interface NodeRow { id: string; batchId: string; nodeType: string; }

type PatchResult =
  | { ok: true; changed: boolean; publicPassportId: string | null }
  | { ok: false; errorCode: string };

// ── File helpers ──────────────────────────────────────────────────────────────

function loadAuth(): AuthState {
  const file = join(ROOT, '.auth', 'qa-b2b.json');
  if (!existsSync(file)) {
    throw new Error('SEED_BLOCKED: .auth/qa-b2b.json not found — run auth setup first.');
  }
  const s = JSON.parse(readFileSync(file, 'utf8')) as AuthState;
  if (typeof s.token !== 'string' || s.token.length === 0 ||
      typeof s.orgId !== 'string' || s.orgId.length === 0) {
    throw new Error('SEED_BLOCKED: .auth/qa-b2b.json is missing token or orgId.');
  }
  return s;
}

function loadExistingFixture(): DppFixtureMeta | null {
  try {
    const file = join(ROOT, '.auth', 'dpp-qa-fixture.json');
    if (!existsSync(file)) return null;
    const m = JSON.parse(readFileSync(file, 'utf8')) as DppFixtureMeta;
    if (typeof m.nodeId === 'string' && m.nodeId.length > 0 &&
        typeof m.publicPassportId === 'string' && m.publicPassportId.length > 0) {
      return m;
    }
    return null;
  } catch { return null; }
}

function writeFixture(meta: DppFixtureMeta): void {
  writeFileSync(
    join(ROOT, '.auth', 'dpp-qa-fixture.json'),
    JSON.stringify(meta, null, 2),
    'utf8',
  );
}

// ── API helpers ───────────────────────────────────────────────────────────────

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function getPassport(token: string, nodeId: string): Promise<PassportApiView | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/api/tenant/dpp/${encodeURIComponent(nodeId)}/passport`,
      { headers: authHeaders(token) },
    );
    if (!res.ok) {
      const errBody = await res.text().catch(() => '(unreadable)');
      console.error(`  [getPassport] HTTP ${res.status} for node ${nodeId.slice(0, 8)}…: ${errBody.slice(0, 300)}`);
      return null;
    }
    const body = (await res.json()) as { success: boolean; data?: { passport?: PassportApiView } };
    return body?.data?.passport ?? null;
  } catch (e) {
    console.error(`  [getPassport] fetch threw for node ${nodeId.slice(0, 8)}…:`, e instanceof Error ? e.message : String(e));
    return null;
  }
}

async function patchPassportStatus(
  token: string,
  nodeId: string,
  targetStatus: string,
): Promise<PatchResult> {
  try {
    const res = await fetch(
      `${BASE_URL}/api/tenant/dpp/${encodeURIComponent(nodeId)}/passport/status`,
      {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify({ targetStatus }),
      },
    );
    const body = (await res.json()) as {
      success?: boolean;
      data?: {
        passport?: { publicPassportId: string | null };
        transition?: { changed: boolean };
      };
      error?: { code?: string };
    };
    if (!res.ok || !body.success) {
      return { ok: false, errorCode: body?.error?.code ?? `HTTP_${res.status}` };
    }
    return {
      ok: true,
      changed: body.data?.transition?.changed ?? false,
      publicPassportId: body.data?.passport?.publicPassportId ?? null,
    };
  } catch (err) {
    return { ok: false, errorCode: err instanceof Error ? err.message : 'NETWORK_ERROR' };
  }
}

// ── Transition ladder ─────────────────────────────────────────────────────────

/**
 * Legal promotion path from each status to PUBLISHED.
 * Steps are applied in order; each must succeed before the next is attempted.
 * INTERNAL → TRADE_READY is subject to the evidence gate (approvedCerts ≥ 1, lineageDepth ≥ 1).
 */
const TRANSITION_CHAIN: Readonly<Record<string, readonly string[]>> = {
  DRAFT:       ['INTERNAL', 'TRADE_READY', 'PUBLISHED'],
  INTERNAL:    ['TRADE_READY', 'PUBLISHED'],
  TRADE_READY: ['PUBLISHED'],
  PUBLISHED:   [],
};

async function promoteToPublished(
  token: string,
  nodeId: string,
  fromStatus: string,
): Promise<{ publicPassportId: string } | 'EVIDENCE_GATE_FAILED' | null> {
  const steps = TRANSITION_CHAIN[fromStatus] ?? [];
  if (steps.length === 0) return null; // already PUBLISHED or unrecognised status

  for (const targetStatus of steps) {
    const result = await patchPassportStatus(token, nodeId, targetStatus);
    if (!result.ok) {
      if (result.errorCode === 'EVIDENCE_GATE_FAILED') return 'EVIDENCE_GATE_FAILED';
      console.error(`  ✗ PATCH ${targetStatus} failed: ${result.errorCode}`);
      return null;
    }
    console.log(`  ✓ Transitioned → ${targetStatus} (changed: ${result.changed})`);
  }

  // Read back confirmed state — single reliable source of publicPassportId
  const finalPassport = await getPassport(token, nodeId);
  if (
    !finalPassport ||
    finalPassport.passportStatus !== 'PUBLISHED' ||
    !finalPassport.publicPassportId
  ) {
    console.error('  ✗ Read-back after promotion: status is not PUBLISHED');
    return null;
  }
  return { publicPassportId: finalPassport.publicPassportId };
}

// ── Prisma instance (QA seed exception — disconnected at end of main) ────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new (PrismaClient as any)();

// ── Prisma helpers (QA-only, C-first/A-fallback) ──────────────────────────────

/**
 * Strategy C-first: look for an existing APPROVED cert in this org.
 * Strategy A fallback: create a QA-sentinel cert row directly in APPROVED state.
 * Returns the certificationId to link to the node.
 *
 * Safety guards: assertQaOrg must have been called before entering this function.
 */
async function ensureApprovedCert(qaOrgId: string): Promise<string> {
  // Resolve the APPROVED lifecycle state for CERTIFICATION entity type
  const approvedState = await prisma.lifecycleState.findFirst({
    where: { entityType: 'CERTIFICATION', stateKey: 'APPROVED' },
    select: { id: true },
  }) as { id: string } | null;
  if (!approvedState) {
    throw new Error('SEED_BLOCKED: Could not find lifecycle_state with entityType=CERTIFICATION stateKey=APPROVED. Run state machine seed first.');
  }

  // C-first: check for any existing APPROVED cert in the QA org
  const existingCert = await prisma.certification.findFirst({
    where: { orgId: qaOrgId, lifecycleStateId: approvedState.id },
    select: { id: true },
  }) as { id: string } | null;
  if (existingCert) {
    console.log(`[seed-dpp-fixture] C-strategy: reusing existing APPROVED cert (id prefix: ${existingCert.id.slice(0, 8)}…)`);
    return existingCert.id;
  }

  // A-fallback: upsert a QA-sentinel cert row set to APPROVED state
  console.log('[seed-dpp-fixture] A-strategy: no existing APPROVED cert — creating QA sentinel cert...');
  const cert = await prisma.certification.upsert({
    where: { id: QA_CERT_SENTINEL_ID },
    create: {
      id: QA_CERT_SENTINEL_ID,
      orgId: qaOrgId,
      certificationType: 'ISO_9001',
      lifecycleStateId: approvedState.id,
    },
    update: {
      lifecycleStateId: approvedState.id,
    },
    select: { id: true },
  }) as { id: string };
  console.log(`[seed-dpp-fixture] A-strategy: QA sentinel cert created/confirmed (id: ${cert.id})`);
  return cert.id;
}

/**
 * Links a certification to a node via node_certifications (idempotent upsert).
 */
async function linkCertToNode(qaOrgId: string, nodeId: string, certId: string): Promise<void> {
  await prisma.node_certifications.upsert({
    where: {
      org_id_node_id_certification_id: {
        org_id: qaOrgId,
        node_id: nodeId,
        certification_id: certId,
      },
    },
    create: {
      org_id: qaOrgId,
      node_id: nodeId,
      certification_id: certId,
    },
    update: {},
  });
  console.log(`[seed-dpp-fixture] Cert linked to node (cert: ${certId.slice(0, 8)}… node: ${nodeId.slice(0, 8)}…)`);
}

/**
 * Ensures a dpp_passport_states row exists for the given node (DRAFT by default).
 * Required because nodes created directly via Prisma bypass the API which auto-creates the state.
 * Safe to call on any node — idempotent upsert with update: {}.
 */
async function ensurePassportState(qaOrgId: string, nodeId: string): Promise<void> {
  await prisma.dpp_passport_states.upsert({
    where: { org_id_node_id: { org_id: qaOrgId, node_id: nodeId } },
    create: { org_id: qaOrgId, node_id: nodeId, status: 'DRAFT' },
    update: {},
  });
}

/**
 * Creates a QA sentinel traceability node when the org has none.
 * Also seeds the initial DRAFT passport state row.
 * Uses upsert by (orgId, batchId) — fully idempotent.
 */
async function ensureTraceabilityNode(qaOrgId: string): Promise<void> {
  const node = await prisma.traceabilityNode.upsert({
    where: { orgId_batchId: { orgId: qaOrgId, batchId: QA_NODE_SENTINEL_BATCH_ID } },
    create: { orgId: qaOrgId, batchId: QA_NODE_SENTINEL_BATCH_ID, nodeType: 'PROCESSING', meta: {} },
    update: {},
    select: { id: true },
  }) as { id: string };
  // Also ensure the passport state row exists (getPassport returns null without it)
  await prisma.dpp_passport_states.upsert({
    where: { org_id_node_id: { org_id: qaOrgId, node_id: node.id } },
    create: { org_id: qaOrgId, node_id: node.id, status: 'DRAFT' },
    update: {},
  });
  console.log(`[seed-dpp-fixture] QA sentinel node + DRAFT passport state created/confirmed (id prefix: ${node.id.slice(0, 8)}…)`);
}

/**
 * Creates a child node + SOURCED_FROM edge from nodeId → child.
 * Satisfies lineageDepth >= 1 for the evidence gate (INTERNAL → TRADE_READY).
 * Fully idempotent — skips edge creation if one already exists.
 */
async function ensureLineageEdge(qaOrgId: string, nodeId: string): Promise<void> {
  const childBatchId = `qa-dpp-child-${nodeId.slice(0, 8)}`;
  const childNode = await prisma.traceabilityNode.upsert({
    where: { orgId_batchId: { orgId: qaOrgId, batchId: childBatchId } },
    create: { orgId: qaOrgId, batchId: childBatchId, nodeType: 'PROCESSING', meta: {} },
    update: {},
    select: { id: true },
  }) as { id: string };
  const existingEdge = await prisma.traceabilityEdge.findFirst({
    where: { orgId: qaOrgId, fromNodeId: nodeId, toNodeId: childNode.id },
    select: { id: true },
  }) as { id: string } | null;
  if (!existingEdge) {
    await prisma.traceabilityEdge.create({
      data: { orgId: qaOrgId, fromNodeId: nodeId, toNodeId: childNode.id, edgeType: 'SOURCED_FROM' },
    });
    console.log(`[seed-dpp-fixture] Lineage edge created: ${nodeId.slice(0, 8)}… → ${childNode.id.slice(0, 8)}…`);
  } else {
    console.log('[seed-dpp-fixture] Lineage edge already exists (idempotent).');
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('[seed-dpp-fixture] TECS-DPP-PASSPORT-NETWORK-010-B — QA published fixture seed');
  console.log(`[seed-dpp-fixture] Target: ${BASE_URL}`);

  const auth = loadAuth();
  console.log('[seed-dpp-fixture] Auth: loaded (token redacted)');

  // ── QA safety guard: resolve org slug and assert qa- prefix ─────────────────
  console.log('[seed-dpp-fixture] Resolving org slug for QA safety guard...');
  const orgRow = await prisma.organizations.findUnique({
    where: { id: auth.orgId },
    select: { slug: true },
  }) as { slug: string } | null;
  if (!orgRow) {
    throw new Error(`SEED_BLOCKED: org not found for orgId (redacted). Ensure QA org exists.`);
  }
  assertQaOrg(auth.orgId, orgRow.slug);
  console.log('[seed-dpp-fixture] QA safety guard: PASSED (slug prefix: qa-)');

  // ── Step 1: idempotency — verify existing fixture ────────────────────────────
  const existing = loadExistingFixture();
  if (existing) {
    console.log(
      `[seed-dpp-fixture] Existing fixture: nodeId=${existing.nodeId} publicPassportId=${existing.publicPassportId}`,
    );
    console.log('[seed-dpp-fixture] Verifying fixture is still PUBLISHED...');
    const passport = await getPassport(auth.token, existing.nodeId);
    if (passport?.passportStatus === 'PUBLISHED' && passport.publicPassportId !== null) {
      console.log('[seed-dpp-fixture] ✓ Fixture is still PUBLISHED — no action needed.');
      console.log(`[seed-dpp-fixture] publicPassportId: ${passport.publicPassportId}`);
      console.log(`[seed-dpp-fixture] productLabel: ${existing.productLabel}`);
      return;
    }
    console.log('[seed-dpp-fixture] Fixture is stale — re-seeding...');
  }

  // ── Step 2: list traceability nodes ─────────────────────────────────────────
  console.log('[seed-dpp-fixture] Fetching traceability nodes (limit=50)...');
  const listRes = await fetch(`${BASE_URL}/api/tenant/traceability/nodes?limit=50`, {
    headers: authHeaders(auth.token),
  });
  if (!listRes.ok) {
    throw new Error(
      `SEED_BLOCKED: GET /api/tenant/traceability/nodes → HTTP ${listRes.status}. Is the server running?`,
    );
  }
  const listBody = (await listRes.json()) as {
    success: boolean;
    data?: { rows?: NodeRow[]; total?: number };
  };
  let nodes: NodeRow[] = listBody?.data?.rows ?? [];
  if (nodes.length === 0) {
    console.log('[seed-dpp-fixture] No nodes found — creating QA sentinel node via Prisma (QA exception)...');
    await ensureTraceabilityNode(auth.orgId);
    // Re-fetch after creation so the rest of main() sees the new node
    const refetchRes = await fetch(`${BASE_URL}/api/tenant/traceability/nodes?limit=50`, {
      headers: authHeaders(auth.token),
    });
    if (!refetchRes.ok) {
      throw new Error(`SEED_BLOCKED: Re-fetch after node creation → HTTP ${refetchRes.status}.`);
    }
    const refetchBody = (await refetchRes.json()) as {
      success: boolean;
      data?: { rows?: NodeRow[]; total?: number };
    };
    nodes = refetchBody?.data?.rows ?? [];
    if (nodes.length === 0) {
      throw new Error(
        'SEED_BLOCKED: Node created via Prisma but API still returns 0 rows. Check RLS policies.',
      );
    }
  }
  // ── Step 2b: ensure passport state rows exist for ALL fetched nodes ────────
  // Sentinel nodes created via Prisma bypass the API which normally auto-creates the state row.
  // This idempotent upsert repairs any such orphan nodes (update: {} is a no-op for existing rows).
  for (const node of nodes) {
    await ensurePassportState(auth.orgId, node.id);
  }

  console.log(
    `[seed-dpp-fixture] Found ${nodes.length} node(s) — checking passport states...`,
  );

  // ── Step 3: read passport state for each node ─────────────────────────────
  type CandidateInfo = {
    nodeId: string;
    batchId: string;
    passportStatus: string;
    publicPassportId: string | null;
    approvedCertCount: number;
    lineageDepth: number;
  };
  const candidates: CandidateInfo[] = [];

  for (const node of nodes) {
    const passport = await getPassport(auth.token, node.id);
    if (!passport) {
      console.log(`  node ${node.id.slice(0, 8)}… batchId=${node.batchId} — passport read failed (skipping)`);
      continue;
    }
    const approvedCertCount = passport.passportEvidenceSummary?.approvedCertCount ?? 0;
    const lineageDepth = passport.passportEvidenceSummary?.lineageDepth ?? 0;
    candidates.push({
      nodeId: node.id,
      batchId: node.batchId,
      passportStatus: passport.passportStatus,
      publicPassportId: passport.publicPassportId,
      approvedCertCount,
      lineageDepth,
    });
    console.log(
      `  node ${node.id.slice(0, 8)}… batchId=${node.batchId} status=${passport.passportStatus}` +
      ` certs=${approvedCertCount} lineage=${lineageDepth}`,
    );
  }

  if (candidates.length === 0) {
    throw new Error('SEED_BLOCKED: Could not read passport state for any node.');
  }

  // ── Step 4: select best candidate ────────────────────────────────────────────
  // Priority: already PUBLISHED > TRADE_READY > INTERNAL+gate OK > DRAFT+gate OK > INTERNAL any > DRAFT any
  const already     = candidates.find(c => c.passportStatus === 'PUBLISHED' && c.publicPassportId !== null);
  const trReady     = candidates.find(c => c.passportStatus === 'TRADE_READY');
  const intGateOk   = candidates.find(c => c.passportStatus === 'INTERNAL' && c.approvedCertCount >= 1 && c.lineageDepth >= 1);
  const draftGateOk = candidates.find(c => c.passportStatus === 'DRAFT'    && c.approvedCertCount >= 1 && c.lineageDepth >= 1);
  const intAny      = candidates.find(c => c.passportStatus === 'INTERNAL');
  const draftAny    = candidates.find(c => c.passportStatus === 'DRAFT');
  const chosen      = already ?? trReady ?? intGateOk ?? draftGateOk ?? intAny ?? draftAny;

  if (!chosen) {
    throw new Error('SEED_BLOCKED: No suitable node found. All nodes may be in an unsupported state.');
  }

  // ── Step 4b: ensure APPROVED cert + node_certifications link (QA Prisma exception) ──────
  // This satisfies the evidence gate (approvedCertCount >= 1) for the chosen node.
  // C-first: reuse existing APPROVED cert in org. A-fallback: create QA sentinel cert.
  if (!already) {
    console.log('[seed-dpp-fixture] Ensuring APPROVED cert linked to chosen node (QA Prisma exception)...');
    const certId = await ensureApprovedCert(auth.orgId);
    await linkCertToNode(auth.orgId, chosen.nodeId, certId);
    if (chosen.lineageDepth < 1) {
      console.log('[seed-dpp-fixture] lineageDepth=0 — creating lineage edge via Prisma (QA exception)...');
      await ensureLineageEdge(auth.orgId, chosen.nodeId);
      console.log('[seed-dpp-fixture] Lineage edge created — evidence gate preconditions now met.');
    } else {
      console.log('[seed-dpp-fixture] Evidence gate preconditions satisfied (cert linked, lineageDepth ok).');
    }
  }

  // ── Step 5: use or promote ───────────────────────────────────────────────────
  if (already) {
    writeFixture({
      nodeId: already.nodeId,
      publicPassportId: already.publicPassportId!,
      productLabel: already.batchId,
    });
    console.log('[seed-dpp-fixture] ✓ Used already-PUBLISHED node.');
    console.log(`[seed-dpp-fixture] nodeId: ${already.nodeId}`);
    console.log(`[seed-dpp-fixture] publicPassportId: ${already.publicPassportId!}`);
    console.log(`[seed-dpp-fixture] productLabel: ${already.batchId}`);
    return;
  }

  console.log(
    `[seed-dpp-fixture] Promoting node ${chosen.nodeId.slice(0, 8)}…` +
    ` (${chosen.passportStatus} → PUBLISHED)...`,
  );
  const result = await promoteToPublished(auth.token, chosen.nodeId, chosen.passportStatus);

  if (result === 'EVIDENCE_GATE_FAILED') {
    throw new Error(
      `SEED_BLOCKED: Evidence gate failed for node ${chosen.nodeId.slice(0, 8)}…` +
      ` (approvedCerts=${chosen.approvedCertCount}, lineageDepth=${chosen.lineageDepth}).` +
      ` Node cert was linked — lineage depth may still be 0.` +
      ` Ensure the node has ≥1 traceability edge, then re-run this script.`,
    );
  }
  if (result === null) {
    throw new Error(
      `SEED_BLOCKED: Promotion failed for node ${chosen.nodeId.slice(0, 8)}…. Check server logs.`,
    );
  }

  writeFixture({
    nodeId: chosen.nodeId,
    publicPassportId: result.publicPassportId,
    productLabel: chosen.batchId,
  });
  console.log('[seed-dpp-fixture] ✓ Fixture seeded successfully.');
  console.log(`[seed-dpp-fixture] nodeId: ${chosen.nodeId}`);
  console.log(`[seed-dpp-fixture] publicPassportId: ${result.publicPassportId}`);
  console.log(`[seed-dpp-fixture] productLabel: ${chosen.batchId}`);
  console.log('[seed-dpp-fixture] Written → .auth/dpp-qa-fixture.json');
}

main()
  .catch(err => {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith('SEED_BLOCKED:')) {
      console.error(`\n🛑 ${msg}\n`);
    } else {
      console.error('\n🛑 Unexpected seed error:', msg);
    }
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
