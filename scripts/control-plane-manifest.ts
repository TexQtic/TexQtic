/**
 * control-plane-manifest.ts
 *
 * Builds an in-memory manifest of all control-plane routes by statically
 * scanning registered route files. No runtime server introspection.
 *
 * Used by control-plane-guard.ts to enforce CI invariants.
 *
 * When run as a standalone script, prints the manifest as JSON to stdout.
 *
 * TECS: OPS-CONTROL-HARDENING-PHASE-2-001
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface RouteEntry {
  method: string;
  path: string;              // normalized: /api/control/..., params as :param
  rawPath: string;           // full path as declared in source (unreplaced params)
  sourceFile: string;        // repo-relative path
  isMutation: boolean;       // POST | PUT | PATCH | DELETE
  auditEvidence: string | null; // which token satisfied the check, or null
  isAuditSatisfied: boolean;
  isSuperAdminRequired: boolean; // true if in REQUIRED_SUPER_ADMIN_SURFACES
  isSuperAdminGated: boolean;    // true if requireAdminRole('SUPER_ADMIN') found
}

// ── Route file configurations ─────────────────────────────────────────────────
// Explicit list: no runtime introspection. Every control-plane route file must
// be listed here with the prefix under which it is registered in index.ts.

interface FileConfig {
  file: string;   // repo-relative
  prefix: string; // e.g. /api/control or /api/control/escalations
}

const FILE_CONFIGS: FileConfig[] = [
  { file: 'server/src/routes/control.ts',                     prefix: '/api/control' },
  { file: 'server/src/routes/control/escalation.g022.ts',     prefix: '/api/control/escalations' },
  { file: 'server/src/routes/control/trades.g017.ts',         prefix: '/api/control/trades' },
  { file: 'server/src/routes/control/escrow.g018.ts',         prefix: '/api/control/escrows' },
  { file: 'server/src/routes/control/settlement.ts',          prefix: '/api/control/settlements' },
  { file: 'server/src/routes/control/certifications.g019.ts', prefix: '/api/control/certifications' },
  { file: 'server/src/routes/admin/traceability.g016.ts',     prefix: '/api/control/traceability' },
  { file: 'server/src/routes/admin/impersonation.ts',         prefix: '/api/control' },
  { file: 'server/src/routes/admin/tenantProvision.ts',       prefix: '/api/control' },
  { file: 'server/src/routes/admin-cart-summaries.ts',        prefix: '/api/control/marketplace' },
];

// ── Audit tokens (file-level scan) ────────────────────────────────────────────
// Any of these found anywhere in the route file satisfies audit coverage for
// mutation routes in that file.

const AUDIT_TOKENS: Array<{ token: string; label: string }> = [
  { token: 'writeAuditLog(',        label: 'writeAuditLog' },
  { token: 'writeAuthorityIntent(', label: 'writeAuthorityIntent' },
  { token: 'boundAudit',            label: 'boundAudit' },
];

/**
 * Service-delegation allowlist.
 *
 * Files where audit is written by an injected service (not inline in the route
 * handler). The audit presence is confirmed at governance review time and
 * recorded here explicitly. This is NOT a broad exemption — each file added
 * must be backed by a governance entry documenting which service writes the audit.
 *
 * Current entries:
 *   impersonation.ts — audit written by startImpersonation() / stopImpersonation()
 *                      services (confirmed: TECS OPS-CONTROL-HARDENING-PHASE-2-001,
 *                      Phase 2 Review, 2026-03-02)
 */
const SERVICE_DELEGATION_FILES: Set<string> = new Set([
  'server/src/routes/admin/impersonation.ts',
]);

// ── Write-audit allowlist ──────────────────────────────────────────────────────
// Mutation-method routes that are semantically read-only or infrastructure
// endpoints requiring no data audit. Each entry must be documented below.
//
// Format: "METHOD /normalized/path"
//
// Entries:
//   POST /api/control/settlements/preview
//     D-020-B: balance derived from ledger SUM; zero DB mutations; zero state changes.
//     HTTP POST used only for body payload; this is a read-only computation.

const WRITE_AUDIT_ALLOWLIST: Set<string> = new Set([
  'POST /api/control/settlements/preview',
]);

// ── Required SUPER_ADMIN surfaces ─────────────────────────────────────────────
// Hardcoded expected surfaces (TECS Phase 3, Guard 2).
// These MUST have requireAdminRole('SUPER_ADMIN') in the route declaration.
// Normalization: any :param_name is stored as the literal in the source file.

interface SuperAdminSurface {
  method: string;           // lowercase (fastify method name)
  normalizedPath: string;   // with :param for drift detection
  sourceFile: string;       // repo-relative
  localPathLiteral: string; // exact string passed to fastify.METHOD('...')
}

const REQUIRED_SUPER_ADMIN_SURFACES: SuperAdminSurface[] = [
  {
    method: 'post',
    normalizedPath: '/api/control/impersonation/start',
    sourceFile: 'server/src/routes/admin/impersonation.ts',
    localPathLiteral: '/impersonation/start',
  },
  {
    method: 'post',
    normalizedPath: '/api/control/impersonation/stop',
    sourceFile: 'server/src/routes/admin/impersonation.ts',
    localPathLiteral: '/impersonation/stop',
  },
  {
    method: 'post',
    normalizedPath: '/api/control/tenants/provision',
    sourceFile: 'server/src/routes/admin/tenantProvision.ts',
    localPathLiteral: '/tenants/provision',
  },
  {
    method: 'post',
    normalizedPath: '/api/control/finance/payouts/:param/approve',
    sourceFile: 'server/src/routes/control.ts',
    localPathLiteral: '/finance/payouts/:payout_id/approve',
  },
  {
    method: 'post',
    normalizedPath: '/api/control/finance/payouts/:param/reject',
    sourceFile: 'server/src/routes/control.ts',
    localPathLiteral: '/finance/payouts/:payout_id/reject',
  },
  {
    method: 'post',
    normalizedPath: '/api/control/escalations/:param/upgrade',
    sourceFile: 'server/src/routes/control/escalation.g022.ts',
    localPathLiteral: '/:id/upgrade',
  },
  {
    method: 'post',
    normalizedPath: '/api/control/escalations/:param/resolve',
    sourceFile: 'server/src/routes/control/escalation.g022.ts',
    localPathLiteral: '/:id/resolve',
  },
  {
    method: 'put',
    normalizedPath: '/api/control/feature-flags/:param',
    sourceFile: 'server/src/routes/control.ts',
    localPathLiteral: '/feature-flags/:key',
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Normalize path params: replace :anyParamName with :param */
function normalizePath(path: string): string {
  return path.replace(/:[a-zA-Z0-9_]+/g, ':param');
}

/** Find first matching audit token in file content (file-level scan). */
function findAuditEvidence(content: string): string | null {
  for (const { token, label } of AUDIT_TOKENS) {
    if (content.includes(token)) return label;
  }
  return null;
}

/**
 * Check whether a specific fastify.METHOD('localPathLiteral') declaration
 * has requireAdminRole('SUPER_ADMIN') in its preHandler block.
 *
 * Strategy: find the route declaration line by method + exact path literal,
 * then scan the next 700 chars for the preHandler guard string. This reliably
 * captures both same-line preHandler objects and multi-line declarations.
 */
function hasRequireAdminRoleGuard(
  content: string,
  method: string,
  localPathLiteral: string,
): boolean {
  // Escape regex special chars in localPathLiteral (handles / : characters)
  const escaped = localPathLiteral.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const routeRe = new RegExp(
    `fastify\\.${method}\\s*\\(\\s*['"]${escaped}['"]`,
    'i',
  );
  const match = routeRe.exec(content);
  if (!match) return false;
  // Scan 700 chars forward — enough to capture { preHandler: requireAdminRole('SUPER_ADMIN') }
  const context = content.slice(match.index, match.index + 700);
  return /requireAdminRole\s*\(\s*['"]SUPER_ADMIN['"]\s*\)/.test(context);
}

// ── Main builder ──────────────────────────────────────────────────────────────

export function buildManifest(repoRoot: string): RouteEntry[] {
  const entries: RouteEntry[] = [];

  for (const { file, prefix } of FILE_CONFIGS) {
    const absPath = resolve(repoRoot, file);

    if (!existsSync(absPath)) {
      console.warn(`[manifest] WARNING: route file not found: ${file}`);
      continue;
    }

    const content = readFileSync(absPath, 'utf8');

    // Extract all fastify.METHOD('path') declarations.
    // Handles both single and double quotes; optional whitespace.
    const routeRe = /fastify\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/gi;
    let m: RegExpExecArray | null;

    while ((m = routeRe.exec(content)) !== null) {
      const methodLower = m[1].toLowerCase();
      const method = methodLower.toUpperCase();
      const rawLocalPath = m[2];

      // Build full paths
      const slash = rawLocalPath === '/' ? '' : rawLocalPath;
      const fullRaw = `${prefix}${slash}`;
      const normalizedFull = normalizePath(fullRaw);

      const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

      // ── Audit satisfaction ────────────────────────────────────────────────
      let auditEvidence: string | null = null;
      let isAuditSatisfied: boolean;

      if (!isMutation) {
        // Read routes: audit not required by this guard
        isAuditSatisfied = true;
        auditEvidence = 'not-required (read-only)';
      } else if (WRITE_AUDIT_ALLOWLIST.has(`${method} ${normalizedFull}`)) {
        isAuditSatisfied = true;
        auditEvidence = 'allowlisted (semantically read-only POST)';
      } else if (SERVICE_DELEGATION_FILES.has(file)) {
        isAuditSatisfied = true;
        auditEvidence = 'service-delegation (audit confirmed in service layer)';
      } else {
        auditEvidence = findAuditEvidence(content);
        isAuditSatisfied = auditEvidence !== null;
      }

      // ── SUPER_ADMIN gating (per-route, per-file) ─────────────────────────
      const surface = REQUIRED_SUPER_ADMIN_SURFACES.find(
        s =>
          s.sourceFile === file &&
          s.method === methodLower &&
          s.localPathLiteral === rawLocalPath,
      );
      const isSuperAdminRequired = surface !== undefined;
      const isSuperAdminGated = surface
        ? hasRequireAdminRoleGuard(content, methodLower, rawLocalPath)
        : false;

      entries.push({
        method,
        path: normalizedFull,
        rawPath: fullRaw,
        sourceFile: file,
        isMutation,
        auditEvidence,
        isAuditSatisfied,
        isSuperAdminRequired,
        isSuperAdminGated,
      });
    }
  }

  return entries;
}

// ── Standalone entry point ────────────────────────────────────────────────────
// When this file is executed directly (not imported), print the manifest JSON.

const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] === __filename ||
  process.argv[1]?.endsWith('control-plane-manifest.ts') ||
  process.argv[1]?.endsWith('control-plane-manifest.js');

if (isMain) {
  const repoRoot = resolve(dirname(__filename), '..');
  const manifest = buildManifest(repoRoot);
  console.log(JSON.stringify(manifest, null, 2));
}
