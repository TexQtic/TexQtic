/**
 * control-plane-guard.ts
 *
 * CI guard for Control Plane Hardening Phase 2.
 * TECS: OPS-CONTROL-HARDENING-PHASE-2-001
 *
 * Enforces two architectural invariants via static file analysis:
 *
 *   Guard 1 — Write-side audit enforcement
 *     Every POST|PUT|PATCH|DELETE route under /api/control must have audit
 *     evidence (writeAuditLog / writeAuthorityIntent / boundAudit) in its
 *     source file, unless explicitly allowlisted.
 *
 *   Guard 2 — SUPER_ADMIN surface lock
 *     The 8 hardcoded high-risk routes must declare
 *     requireAdminRole('SUPER_ADMIN') in their preHandler block.
 *
 * Emits: artifacts/control-plane-manifest.json
 *
 * Exit codes:
 *   0 — all invariants pass
 *   1 — one or more invariants fail
 *
 * No runtime server dependencies. No DB access. Pure static analysis.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifest } from './control-plane-manifest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Repo root is one level above /scripts/
const REPO_ROOT = resolve(__dirname, '..');

// ── Expected SUPER_ADMIN surfaces (normalized paths) ─────────────────────────
// This list is the source of truth. The guard fails if any of these are not
// found in the manifest (route removed / path drifted) or if they lack the
// preHandler guard.

const EXPECTED_SUPER_ADMIN_SURFACES: string[] = [
  'POST /api/control/impersonation/start',
  'POST /api/control/impersonation/stop',
  'POST /api/control/tenants/provision',
  'POST /api/control/finance/payouts/:param/approve',
  'POST /api/control/finance/payouts/:param/reject',
  'POST /api/control/escalations/:param/upgrade',
  'POST /api/control/escalations/:param/resolve',
  'PUT /api/control/feature-flags/:param',
];

// ── Run ───────────────────────────────────────────────────────────────────────

function run(): void {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   TEXQTIC — Control Plane Guard (Phase 2)                   ║');
  console.log('║   TECS: OPS-CONTROL-HARDENING-PHASE-2-001                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  console.log('[guard] Building manifest from route files...');
  const manifest = buildManifest(REPO_ROOT);
  console.log(`[guard] Scanned ${manifest.length} route entries across ${countDistinctFiles(manifest)} files.\n`);

  const violations: string[] = [];

  // ──────────────────────────────────────────────────────────────────────────
  // Guard 1: Write-side audit enforcement
  // Every mutation route must have audit evidence in its source file,
  // unless the route is in the WRITE_AUDIT_ALLOWLIST.
  // ──────────────────────────────────────────────────────────────────────────
  console.log('══ Guard 1: Write-side audit enforcement ══════════════════════');

  const mutationRoutes = manifest.filter(r => r.isMutation);

  if (mutationRoutes.length === 0) {
    violations.push('[Guard 1] No mutation routes found — manifest may be empty or file scan failed');
  }

  for (const route of mutationRoutes) {
    const icon = route.isAuditSatisfied ? '✓' : '✗';
    const evidence = route.auditEvidence ?? 'MISSING';
    console.log(`  ${icon} ${route.method.padEnd(6)} ${route.path.padEnd(60)} [${evidence}]`);

    if (!route.isAuditSatisfied) {
      violations.push(
        `[Guard 1 — Audit] MISSING audit evidence for mutation route: ` +
        `${route.method} ${route.path} (source: ${route.sourceFile})`,
      );
    }
  }

  console.log(`\n  Mutation routes checked: ${mutationRoutes.length}`);
  const auditViolations = mutationRoutes.filter(r => !r.isAuditSatisfied).length;
  console.log(`  Audit violations: ${auditViolations === 0 ? '0 ✅' : `${auditViolations} 🚨`}\n`);

  // ──────────────────────────────────────────────────────────────────────────
  // Guard 2: SUPER_ADMIN surface lock
  // Each of the 8 required high-risk routes must:
  //   a) exist in the manifest (no route removal / path drift)
  //   b) have requireAdminRole('SUPER_ADMIN') in its preHandler
  // ──────────────────────────────────────────────────────────────────────────
  console.log('══ Guard 2: SUPER_ADMIN surface lock ══════════════════════════');

  // Build a lookup of normalized paths found in manifest
  const foundSurfaces = new Map<string, typeof manifest[0]>();
  for (const route of manifest) {
    if (route.isSuperAdminRequired) {
      foundSurfaces.set(`${route.method} ${route.path}`, route);
    }
  }

  for (const expected of EXPECTED_SUPER_ADMIN_SURFACES) {
    const found = foundSurfaces.get(expected);

    if (!found) {
      // Route is missing from manifest — route removed or path changed
      console.log(`  ✗ ${expected.padEnd(65)} [ROUTE NOT FOUND]`);
      violations.push(
        `[Guard 2 — SUPER_ADMIN] Required surface NOT FOUND in manifest: ${expected} ` +
        `(route may have been removed, renamed, or prefix changed)`,
      );
      continue;
    }

    const icon = found.isSuperAdminGated ? '✓' : '✗';
    const status = found.isSuperAdminGated ? 'gated ✅' : 'NOT GATED 🚨';
    console.log(`  ${icon} ${expected.padEnd(65)} [${status}]`);

    if (!found.isSuperAdminGated) {
      violations.push(
        `[Guard 2 — SUPER_ADMIN] requireAdminRole('SUPER_ADMIN') MISSING for: ` +
        `${found.method} ${found.path} (source: ${found.sourceFile})`,
      );
    }
  }

  const saViolations = EXPECTED_SUPER_ADMIN_SURFACES.filter(e => {
    const found = foundSurfaces.get(e);
    return !found || !found.isSuperAdminGated;
  }).length;
  console.log(`\n  Required surfaces: ${EXPECTED_SUPER_ADMIN_SURFACES.length}`);
  console.log(`  SUPER_ADMIN violations: ${saViolations === 0 ? '0 ✅' : `${saViolations} 🚨`}\n`);

  // ──────────────────────────────────────────────────────────────────────────
  // Write artifact: artifacts/control-plane-manifest.json
  // ──────────────────────────────────────────────────────────────────────────
  const artifactsDir = resolve(REPO_ROOT, 'artifacts');
  mkdirSync(artifactsDir, { recursive: true });
  const artifactPath = resolve(artifactsDir, 'control-plane-manifest.json');

  const artifact = {
    _meta: {
      tecs: 'OPS-CONTROL-HARDENING-PHASE-2-001',
      description: 'Control-plane route manifest — CI guard artifact',
      generatedAt: new Date().toISOString(),
      guardResult: violations.length === 0 ? 'PASS' : 'FAIL',
      violationCount: violations.length,
      routeCount: manifest.length,
      mutationRouteCount: mutationRoutes.length,
    },
    violations,
    routes: manifest.map(r => ({
      method: r.method,
      path: r.path,
      rawPath: r.rawPath,
      sourceFile: r.sourceFile,
      isMutation: r.isMutation,
      auditEvidence: r.auditEvidence,
      isAuditSatisfied: r.isAuditSatisfied,
      isSuperAdminRequired: r.isSuperAdminRequired,
      isSuperAdminGated: r.isSuperAdminGated,
    })),
  };

  writeFileSync(artifactPath, JSON.stringify(artifact, null, 2), 'utf8');
  console.log(`[guard] Manifest artifact written → artifacts/control-plane-manifest.json`);

  // ──────────────────────────────────────────────────────────────────────────
  // Final result
  // ──────────────────────────────────────────────────────────────────────────
  console.log('');
  if (violations.length > 0) {
    console.error('╔══════════════════════════════════════════════════════════════╗');
    console.error('║  🚨  CONTROL PLANE GUARD FAILED                             ║');
    console.error('╚══════════════════════════════════════════════════════════════╝');
    console.error('');
    console.error(`${violations.length} violation(s):`);
    for (const v of violations) {
      console.error(`  ✗ ${v}`);
    }
    console.error('');
    process.exit(1);
  }

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  ✅  CONTROL PLANE GUARD PASSED                             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  process.exit(0);
}

function countDistinctFiles(manifest: ReturnType<typeof buildManifest>): number {
  return new Set(manifest.map(r => r.sourceFile)).size;
}

run();
