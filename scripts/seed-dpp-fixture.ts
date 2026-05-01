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
 *   - At least one traceability node must exist for the QA org
 *   - To advance INTERNAL → TRADE_READY: node needs ≥1 approved cert + ≥1 lineage depth
 *
 * Output:
 *   .auth/dpp-qa-fixture.json  (gitignored)
 *   Contents: { nodeId, publicPassportId, productLabel }
 *
 * Security: never prints token, orgId, connection strings, or credentials.
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

// ── Constants ─────────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const BASE_URL = (process.env.PLAYWRIGHT_BASE_URL ?? 'https://app.texqtic.com').replace(/\/$/, '');

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
    if (!res.ok) return null;
    const body = (await res.json()) as { success: boolean; data?: { passport?: PassportApiView } };
    return body?.data?.passport ?? null;
  } catch { return null; }
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

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('[seed-dpp-fixture] TECS-DPP-PASSPORT-NETWORK-010-B — QA published fixture seed');
  console.log(`[seed-dpp-fixture] Target: ${BASE_URL}`);

  const auth = loadAuth();
  console.log('[seed-dpp-fixture] Auth: loaded (token redacted)');

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
  const nodes: NodeRow[] = listBody?.data?.rows ?? [];
  if (nodes.length === 0) {
    throw new Error(
      'SEED_BLOCKED: No traceability nodes found in QA org. Create one via the tenant UI first.',
    );
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
      ` Node needs ≥1 approved certification AND ≥1 lineage depth to reach TRADE_READY.` +
      ` Add evidence via the tenant UI, then re-run this script.`,
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

main().catch(err => {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.startsWith('SEED_BLOCKED:')) {
    console.error(`\n🛑 ${msg}\n`);
  } else {
    console.error('\n🛑 Unexpected seed error:', msg);
  }
  process.exit(1);
});
