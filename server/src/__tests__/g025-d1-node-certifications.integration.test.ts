/**
 * G-025 D-1 — node_certifications join table verification
 *
 * Unit: TECS-DPP-PASSPORT-FOUNDATION-001
 * Slice: D-1 — node_certifications DDL + RLS
 * Migration: 20260316000000_g025_node_certifications
 *
 * Test Strategy:
 *   Group 1 — Static structural checks (no DB required)
 *     Verify migration file shape and Prisma schema model.
 *   Group 2 — DB integration checks (gated by hasDb)
 *     Verify table structure, RLS posture, policies, and grants.
 *
 * Doctrine: v1.4 (app.org_id = tenant boundary)
 * RLS Pattern: Wave 3 Tail — 1 RESTRICTIVE guard + 4 PERMISSIVE policies TO texqtic_app
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { hasDb } from './helpers/dbGate.js';
import { PrismaClient } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Paths
// ─────────────────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const MIGRATION_PATH = path.join(
  REPO_ROOT,
  'server/prisma/migrations/20260316000000_g025_node_certifications/migration.sql'
);
const SCHEMA_PATH = path.join(REPO_ROOT, 'server/prisma/schema.prisma');

// ─────────────────────────────────────────────────────────────────────────────
// Group 1 — Static Structural Checks (no DB required)
// ─────────────────────────────────────────────────────────────────────────────

describe('G-025 D-1 — Static: migration file structure', () => {
  let sql: string;

  beforeAll(() => {
    expect(
      fs.existsSync(MIGRATION_PATH),
      `Migration file not found at ${MIGRATION_PATH}`
    ).toBe(true);
    sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
  });

  it('D1-S01 — migration file exists', () => {
    expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
  });

  it('D1-S02 — CREATE TABLE node_certifications present', () => {
    expect(sql).toMatch(/CREATE TABLE\s+IF NOT EXISTS\s+public\.node_certifications/i);
  });

  it('D1-S03 — id column: UUID PK with gen_random_uuid()', () => {
    expect(sql).toMatch(/id\s+UUID\s+NOT NULL\s+DEFAULT\s+gen_random_uuid\(\)\s+PRIMARY KEY/i);
  });

  it('D1-S04 — org_id column: UUID NOT NULL FK to organizations', () => {
    expect(sql).toMatch(/org_id\s+UUID\s+NOT NULL\s+REFERENCES\s+public\.organizations\(id\)/i);
  });

  it('D1-S05 — node_id column: UUID NOT NULL FK to traceability_nodes (CASCADE)', () => {
    expect(sql).toMatch(
      /node_id\s+UUID\s+NOT NULL\s+REFERENCES\s+public\.traceability_nodes\(id\)\s+ON DELETE CASCADE/i
    );
  });

  it('D1-S06 — certification_id column: UUID NOT NULL FK to certifications (CASCADE)', () => {
    expect(sql).toMatch(
      /certification_id\s+UUID\s+NOT NULL\s+REFERENCES\s+public\.certifications\(id\)\s+ON DELETE CASCADE/i
    );
  });

  it('D1-S07 — created_at column: TIMESTAMPTZ NOT NULL DEFAULT now()', () => {
    expect(sql).toMatch(/created_at\s+TIMESTAMPTZ\s+NOT NULL\s+DEFAULT\s+now\(\)/i);
  });

  it('D1-S08 — unique constraint on (org_id, node_id, certification_id)', () => {
    expect(sql).toMatch(
      /CONSTRAINT\s+node_certifications_unique_per_org_node_cert\s+UNIQUE\s*\(\s*org_id\s*,\s*node_id\s*,\s*certification_id\s*\)/i
    );
  });

  it('D1-S09 — ENABLE ROW LEVEL SECURITY', () => {
    expect(sql).toMatch(/ALTER TABLE public\.node_certifications ENABLE ROW LEVEL SECURITY/i);
  });

  it('D1-S10 — FORCE ROW LEVEL SECURITY', () => {
    expect(sql).toMatch(/ALTER TABLE public\.node_certifications FORCE ROW LEVEL SECURITY/i);
  });

  it('D1-S11 — RESTRICTIVE guard policy present (Wave 3 Tail)', () => {
    expect(sql).toMatch(
      /CREATE POLICY node_certifications_guard[\s\S]*?AS RESTRICTIVE FOR ALL TO texqtic_app/i
    );
  });

  it('D1-S12 — PERMISSIVE SELECT policy present', () => {
    expect(sql).toMatch(
      /CREATE POLICY node_certifications_select_unified[\s\S]*?AS PERMISSIVE FOR SELECT TO texqtic_app/i
    );
  });

  it('D1-S13 — PERMISSIVE INSERT policy present', () => {
    expect(sql).toMatch(
      /CREATE POLICY node_certifications_insert_unified[\s\S]*?AS PERMISSIVE FOR INSERT TO texqtic_app/i
    );
  });

  it('D1-S14 — PERMISSIVE UPDATE policy present (permanently false)', () => {
    expect(sql).toMatch(
      /CREATE POLICY node_certifications_update_unified[\s\S]*?AS PERMISSIVE FOR UPDATE TO texqtic_app/i
    );
  });

  it('D1-S15 — PERMISSIVE DELETE policy present (permanently false)', () => {
    expect(sql).toMatch(
      /CREATE POLICY node_certifications_delete_unified[\s\S]*?AS PERMISSIVE FOR DELETE TO texqtic_app/i
    );
  });

  it('D1-S16 — GRANT SELECT, INSERT to texqtic_app', () => {
    expect(sql).toMatch(
      /GRANT SELECT,\s*INSERT ON public\.node_certifications TO texqtic_app/i
    );
  });

  it('D1-S17 — org_id scoping uses app.current_org_id()', () => {
    expect(sql).toMatch(/app\.current_org_id\(\)/);
  });
});

describe('G-025 D-1 — Static: Prisma schema model', () => {
  let schema: string;

  beforeAll(() => {
    expect(
      fs.existsSync(SCHEMA_PATH),
      `Prisma schema not found at ${SCHEMA_PATH}`
    ).toBe(true);
    schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  });

  it('D1-P01 — node_certifications model exists in schema.prisma', () => {
    expect(schema).toMatch(/model node_certifications\s*\{/);
  });

  it('D1-P02 — id field: @id UUID', () => {
    expect(schema).toMatch(/id\s+String\s+@id.*@db\.Uuid/);
  });

  it('D1-P03 — org_id field: UUID', () => {
    // Within the node_certifications block
    const modelBlock = extractModelBlock(schema, 'node_certifications');
    expect(modelBlock).toMatch(/org_id\s+String\s+@db\.Uuid/);
  });

  it('D1-P04 — node_id field: UUID', () => {
    const modelBlock = extractModelBlock(schema, 'node_certifications');
    expect(modelBlock).toMatch(/node_id\s+String\s+@db\.Uuid/);
  });

  it('D1-P05 — certification_id field: UUID', () => {
    const modelBlock = extractModelBlock(schema, 'node_certifications');
    expect(modelBlock).toMatch(/certification_id\s+String\s+@db\.Uuid/);
  });

  it('D1-P06 — created_at field: DateTime TIMESTAMPTZ', () => {
    const modelBlock = extractModelBlock(schema, 'node_certifications');
    expect(modelBlock).toMatch(/created_at\s+DateTime\s+@default\(now\(\)\)\s+@db\.Timestamptz/);
  });

  it('D1-P07 — @@unique on (org_id, node_id, certification_id)', () => {
    const modelBlock = extractModelBlock(schema, 'node_certifications');
    expect(modelBlock).toMatch(
      /@@unique\(\[org_id,\s*node_id,\s*certification_id\]/
    );
  });

  it('D1-P08 — @@index on (org_id, node_id)', () => {
    const modelBlock = extractModelBlock(schema, 'node_certifications');
    expect(modelBlock).toMatch(/@@index\(\[org_id,\s*node_id\]/);
  });

  it('D1-P09 — @@index on (org_id, certification_id)', () => {
    const modelBlock = extractModelBlock(schema, 'node_certifications');
    expect(modelBlock).toMatch(/@@index\(\[org_id,\s*certification_id\]/);
  });

  it('D1-P10 — FK relation to certifications', () => {
    const modelBlock = extractModelBlock(schema, 'node_certifications');
    expect(modelBlock).toMatch(/certifications\s+Certification\s+@relation/);
  });

  it('D1-P11 — FK relation to traceability_nodes', () => {
    const modelBlock = extractModelBlock(schema, 'node_certifications');
    expect(modelBlock).toMatch(/traceability_nodes\s+TraceabilityNode\s+@relation/);
  });

  it('D1-P12 — FK relation to organizations', () => {
    const modelBlock = extractModelBlock(schema, 'node_certifications');
    expect(modelBlock).toMatch(/organizations\s+organizations\s+@relation/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 2 — DB Integration Checks (gated by hasDb)
// ─────────────────────────────────────────────────────────────────────────────

describe.skipIf(!hasDb)('G-025 D-1 — DB: table structure and RLS posture', () => {
  const prisma = new PrismaClient();

  it('D1-DB01 — table exists in information_schema', async () => {
    const rows = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'node_certifications'
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0].table_name).toBe('node_certifications');
  });

  it('D1-DB02 — RLS enabled on node_certifications', async () => {
    const rows = await prisma.$queryRaw<{ relrowsecurity: boolean }[]>`
      SELECT relrowsecurity
      FROM pg_class
      WHERE relname = 'node_certifications'
        AND relnamespace = 'public'::regnamespace
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0].relrowsecurity).toBe(true);
  });

  it('D1-DB03 — FORCE RLS enabled on node_certifications', async () => {
    const rows = await prisma.$queryRaw<{ relforcerowsecurity: boolean }[]>`
      SELECT relforcerowsecurity
      FROM pg_class
      WHERE relname = 'node_certifications'
        AND relnamespace = 'public'::regnamespace
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0].relforcerowsecurity).toBe(true);
  });

  it('D1-DB04 — guard policy exists and is RESTRICTIVE', async () => {
    const rows = await prisma.$queryRaw<{ permissive: string }[]>`
      SELECT permissive
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'node_certifications'
        AND policyname = 'node_certifications_guard'
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0].permissive).toBe('RESTRICTIVE');
  });

  it('D1-DB05 — select_unified policy exists and is PERMISSIVE', async () => {
    const rows = await prisma.$queryRaw<{ permissive: string }[]>`
      SELECT permissive
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'node_certifications'
        AND policyname = 'node_certifications_select_unified'
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0].permissive).toBe('PERMISSIVE');
  });

  it('D1-DB06 — insert_unified policy exists and is PERMISSIVE', async () => {
    const rows = await prisma.$queryRaw<{ permissive: string }[]>`
      SELECT permissive
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'node_certifications'
        AND policyname = 'node_certifications_insert_unified'
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0].permissive).toBe('PERMISSIVE');
  });

  it('D1-DB07 — update_unified policy exists (permanently false)', async () => {
    const rows = await prisma.$queryRaw<{ policyname: string }[]>`
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'node_certifications'
        AND policyname = 'node_certifications_update_unified'
    `;
    expect(rows).toHaveLength(1);
  });

  it('D1-DB08 — delete_unified policy exists (permanently false)', async () => {
    const rows = await prisma.$queryRaw<{ policyname: string }[]>`
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'node_certifications'
        AND policyname = 'node_certifications_delete_unified'
    `;
    expect(rows).toHaveLength(1);
  });

  it('D1-DB09 — no {public}-role policies on node_certifications', async () => {
    const rows = await prisma.$queryRaw<{ policyname: string }[]>`
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'node_certifications'
        AND roles = '{public}'
    `;
    expect(rows).toHaveLength(0);
  });

  it('D1-DB10 — texqtic_app has SELECT grant', async () => {
    const rows = await prisma.$queryRaw<{ privilege_type: string }[]>`
      SELECT privilege_type
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND table_name = 'node_certifications'
        AND grantee = 'texqtic_app'
        AND privilege_type = 'SELECT'
    `;
    expect(rows).toHaveLength(1);
  });

  it('D1-DB11 — texqtic_app has INSERT grant', async () => {
    const rows = await prisma.$queryRaw<{ privilege_type: string }[]>`
      SELECT privilege_type
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND table_name = 'node_certifications'
        AND grantee = 'texqtic_app'
        AND privilege_type = 'INSERT'
    `;
    expect(rows).toHaveLength(1);
  });

  it('D1-DB12 — unique constraint (org_id, node_id, certification_id) exists', async () => {
    const rows = await prisma.$queryRaw<{ conname: string }[]>`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.node_certifications'::regclass
        AND contype = 'u'
        AND conname = 'node_certifications_unique_per_org_node_cert'
    `;
    expect(rows).toHaveLength(1);
  });

  it('D1-DB13 — FK to organizations exists', async () => {
    const rows = await prisma.$queryRaw<{ conname: string }[]>`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.node_certifications'::regclass
        AND contype = 'f'
        AND confrelid = 'public.organizations'::regclass
    `;
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it('D1-DB14 — FK to traceability_nodes exists', async () => {
    const rows = await prisma.$queryRaw<{ conname: string }[]>`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.node_certifications'::regclass
        AND contype = 'f'
        AND confrelid = 'public.traceability_nodes'::regclass
    `;
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it('D1-DB15 — FK to certifications exists', async () => {
    const rows = await prisma.$queryRaw<{ conname: string }[]>`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.node_certifications'::regclass
        AND contype = 'f'
        AND confrelid = 'public.certifications'::regclass
    `;
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Boundary: no DPP view/route/UI/PDP changes authorized in D-1
// ─────────────────────────────────────────────────────────────────────────────

describe('G-025 D-1 — Boundary: D-1 scope is DDL only (no DPP passport route/view/UI)', () => {
  it('D1-B01 — DPP snapshot views are NOT altered in 20260316000000 migration', () => {
    // D-1 migration scope = CREATE TABLE node_certifications only.
    // DPP snapshot views belong to 20260316000001_g025_dpp_snapshot_views.
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
    expect(sql).not.toMatch(/CREATE\s+(OR REPLACE\s+)?VIEW\s+dpp_/i);
    expect(sql).not.toMatch(/CREATE\s+(OR REPLACE\s+)?VIEW\s+v_dpp_/i);
  });

  it('D1-B02 — migration does not modify DPP Passport route or DPPPassport.tsx', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
    expect(sql).not.toMatch(/DPPPassport/);
    expect(sql).not.toMatch(/api\/tenant\/dpp/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts the Prisma model block for `modelName` from the schema string.
 * Returns the text between `model <name> {` and the matching closing `}`.
 */
function extractModelBlock(schema: string, modelName: string): string {
  const startIdx = schema.indexOf(`model ${modelName} {`);
  if (startIdx === -1) return '';
  let depth = 0;
  let i = startIdx;
  while (i < schema.length) {
    if (schema[i] === '{') depth++;
    else if (schema[i] === '}') {
      depth--;
      if (depth === 0) return schema.slice(startIdx, i + 1);
    }
    i++;
  }
  return schema.slice(startIdx);
}
