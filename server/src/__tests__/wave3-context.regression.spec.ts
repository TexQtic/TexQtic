/**
 * G-W3-A3 — Context Regression Tests (Doctrine v1.4 Enforcement)
 *
 * COVERAGE:
 *   Group 1 — Canonical context key enforcement (DB-live)
 *   Group 3 — Static source drift detection (no DB required)
 *
 * DOCTRINE REFERENCE: v1.4 Section 11.3
 * GUARDRAIL: GR-007 (Tenant Context Integrity Proof)
 *
 * These tests MUST FAIL CI if removed or bypassed.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { withDbContext } from '../lib/database-context.js';
import type { DatabaseContext } from '../lib/database-context.js';

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 3 — Static Source Drift Detection (no DB required)
// Runs first so CI fails fast on drift without needing a live DB.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recursively collect all .ts files under a directory, excluding node_modules.
 */
function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(full));
    } else if (entry.name.endsWith('.ts')) {
      results.push(full);
    }
  }
  return results;
}

describe('G-W3-A3 Group 3 — Static Drift Detection (no DB)', () => {
  // Resolve server/src from this test file location
  const srcRoot = path.resolve(__dirname, '..');
  let allSourceFiles: string[];
  let allSourceContents: Map<string, string>;

  beforeAll(() => {
    allSourceFiles = collectTsFiles(srcRoot);
    allSourceContents = new Map(
      allSourceFiles.map(f => [f, fs.readFileSync(f, 'utf-8')])
    );
  });

  it('no source file sets app.tenant_id except the defensive clear in db/withDbContext.ts', () => {
    // Match ONLY actual set_config invocations — not prohibition comments or JSDoc.
    // Comment-only mentions (e.g. "NEVER sets app.tenant_id") are legitimate docs.
    const legacyKeyPattern = /set_config\s*\(\s*['"]app\.tenant_id['"]/;
    // FIX: allowedFile resolves relative to srcRoot (= server/src). 'db/' is a subdir.
    // Prior bug: '../db/withDbContext.ts' resolved to server/db/... (wrong level).
    const allowedFile = path.resolve(srcRoot, 'db/withDbContext.ts');

    const violations: string[] = [];
    for (const [filePath, content] of allSourceContents) {
      if (!legacyKeyPattern.test(content)) continue;
      // Allowed: the lone defensive clear in src/db/withDbContext.ts
      if (filePath === allowedFile) continue;
      // Also allow this test file itself (assertion strings reference the key)
      if (filePath === __filename) continue;
      violations.push(path.relative(srcRoot, filePath));
    }

    expect(
      violations,
      `Legacy key "app.tenant_id" found outside allowed defensive-clear location.\n` +
        `Violations: ${violations.join(', ')}\n` +
        `DOCTRINE v1.4 §11.3: Only canonical key app.org_id is permitted.`
    ).toHaveLength(0);
  });

  it('no source file uses "SET ROLE app_user" (non-local role switch forbidden)', () => {
    const forbidden = 'SET ROLE app_user';
    const violations: string[] = [];
    for (const [filePath, content] of allSourceContents) {
      if (filePath === __filename) continue; // self-reference in string literal
      if (content.includes(forbidden)) {
        violations.push(path.relative(srcRoot, filePath));
      }
    }

    expect(
      violations,
      `Forbidden pattern "SET ROLE app_user" found in source.\n` +
        `Violations: ${violations.join(', ')}\n` +
        `G-W3-A1 mandate: Use SET LOCAL ROLE texqtic_app (tx-local only).`
    ).toHaveLength(0);
  });

  it('no source file uses X-Tenant-Id header bypass pattern', () => {
    const forbidden = 'x-tenant-id';
    const violations: string[] = [];
    for (const [filePath, content] of allSourceContents) {
      if (filePath === __filename) continue; // self-reference in string literal
      // Per-line scan: skip pure comment lines (JSDoc '* …', '//', '/*').
      // Prohibition docs that say "X-Tenant-Id removed" are legitimate; actual
      // code that reads the header (e.g. headers['x-tenant-id']) is a violation.
      const hasViolation = content.split('\n').some(line => {
        const trimmed = line.trimStart();
        if (
          trimmed.startsWith('* ') ||
          trimmed.startsWith('*/') ||
          trimmed.startsWith('/*') ||
          trimmed.startsWith('//')
        ) {
          return false; // comment-only line — skip
        }
        return line.toLowerCase().includes(forbidden);
      });
      if (hasViolation) {
        violations.push(path.relative(srcRoot, filePath));
      }
    }

    expect(
      violations,
      `Forbidden pattern "x-tenant-id" (case-insensitive) found in source.\n` +
        `Violations: ${violations.join(', ')}\n` +
        `G-W3-A1 mandate: Header fallback removed; JWT auth mandatory.`
    ).toHaveLength(0);
  });

  it('no set_config call in src uses false (non-tx-local) — static scan', () => {
    // Pattern: set_config( ... , false) or set_config( ... ,false)
    // Only flags production src files, not test helpers that may legitimately test/scan
    const nonLocalPattern = /set_config\s*\([^)]+,\s*false\s*\)/g;
    const violations: string[] = [];

    for (const [filePath, content] of allSourceContents) {
      // Exclude test files (they may reference the pattern for assertion purposes)
      if (filePath.includes('__tests__')) continue;
      if (nonLocalPattern.test(content)) {
        violations.push(path.relative(srcRoot, filePath));
      }
      nonLocalPattern.lastIndex = 0; // Reset regex state
    }

    expect(
      violations,
      `Non-tx-local set_config(..., false) detected in production source.\n` +
        `Violations: ${violations.join(', ')}\n` +
        `Doctrine v1.4: All set_config calls MUST use true (transaction-local).`
    ).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 1 — Canonical Context Key Enforcement (DB-live)
// ─────────────────────────────────────────────────────────────────────────────

describe('G-W3-A3 Group 1 — Canonical Context Key Enforcement (DB-live)', () => {
  let prisma: PrismaClient;
  let dbAvailable = true;

  const TEST_ORG_ID = randomUUID();
  const TEST_ACTOR_ID = randomUUID();

  const baseContext = (): DatabaseContext => ({
    orgId: TEST_ORG_ID,
    actorId: TEST_ACTOR_ID,
    realm: 'tenant',
    requestId: randomUUID(),
  });

  beforeAll(async () => {
    prisma = new PrismaClient();
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbAvailable = false;
      console.warn('[G-W3-A3] DB unavailable — skipping live context tests');
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('app.org_id equals context.orgId inside withDbContext transaction', async () => {
    if (!dbAvailable) return;

    const ctx = baseContext();
    const result = await withDbContext(prisma, ctx, async tx => {
      const rows = await tx.$queryRaw<Array<{ org_id: string }>>`
        SELECT current_setting('app.org_id', true) AS org_id
      `;
      return rows[0].org_id;
    });

    expect(result).toBe(TEST_ORG_ID);
  });

  it('app.tenant_id is empty/null inside canonical withDbContext (never set by lib)', async () => {
    if (!dbAvailable) return;

    const ctx = baseContext();
    const result = await withDbContext(prisma, ctx, async tx => {
      const rows = await tx.$queryRaw<Array<{ tenant_id: string | null }>>`
        SELECT current_setting('app.tenant_id', true) AS tenant_id
      `;
      return rows[0].tenant_id;
    });

    // canonical lib/database-context.ts NEVER sets app.tenant_id (Doctrine §11.3)
    // It should be null or empty string (never a real UUID)
    const isBlank = result === null || result === '' || result === undefined;
    expect(
      isBlank,
      `app.tenant_id must be empty/null — canonical context sets ONLY app.org_id.\n` +
        `Got: "${result}"\nDoctrine v1.4 §11.3 violation if any UUID here.`
    ).toBe(true);
  });

  it('app.bypass_rls is "off" inside withDbContext (RLS always enforced)', async () => {
    if (!dbAvailable) return;

    const ctx = baseContext();
    const result = await withDbContext(prisma, ctx, async tx => {
      const rows = await tx.$queryRaw<Array<{ bypass: string }>>`
        SELECT current_setting('app.bypass_rls', true) AS bypass
      `;
      return rows[0].bypass;
    });

    expect(result).toBe('off');
  });

  it('app.org_id is cleared (tx-local) after withDbContext transaction completes', async () => {
    if (!dbAvailable) return;

    // First: set org_id inside a transaction
    const ctx = baseContext();
    await withDbContext(prisma, ctx, async tx => {
      await tx.$queryRaw`SELECT current_setting('app.org_id', true)`;
    });

    // Then: read app.org_id OUTSIDE any transaction
    // Because set_config used true (tx-local), it must be null/empty after tx commit
    const rows = await prisma.$queryRaw<Array<{ org_id: string | null }>>`
      SELECT current_setting('app.org_id', true) AS org_id
    `;
    const orgIdAfterTx = rows[0].org_id;

    // Must be null, empty, or NOT equal to the value set inside. Proves tx-local.
    const isCleared = orgIdAfterTx === null || orgIdAfterTx === '' || orgIdAfterTx !== TEST_ORG_ID;
    expect(
      isCleared,
      `app.org_id leaked out of transaction: got "${orgIdAfterTx}".\n` +
        `set_config MUST use true (tx-local). Context leaked into session scope.`
    ).toBe(true);
  });

  it('withDbContext throws if context is missing orgId (fail-closed)', async () => {
    if (!dbAvailable) return;

    const badContext = {
      orgId: '', // missing
      actorId: TEST_ACTOR_ID,
      realm: 'tenant' as const,
      requestId: randomUUID(),
    };

    await expect(
      withDbContext(prisma, badContext, async tx => {
        return tx.$queryRaw`SELECT 1`;
      })
    ).rejects.toThrow();
  });
});
