import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SERVER_ROOT = path.resolve(__dirname, '../../');
const TENANT_ROUTE_PATH = path.join(SERVER_ROOT, 'src/routes/tenant.ts');
const MIGRATION_PATH = path.join(
  SERVER_ROOT,
  'prisma/migrations/20260601000000_fam_07e5l_handoff_user_insert_rls_policy/migration.sql',
);

describe('FAM-07E5L - users insert RLS policy remediation', () => {
  let migrationSql: string;

  beforeAll(() => {
    expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
    migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
  });

  it('adds a narrow admin-scoped insert policy for texqtic_app only', () => {
    expect(migrationSql).toContain('CREATE POLICY users_admin_insert ON public.users');
    expect(migrationSql).toMatch(/FOR\s+INSERT\s+TO\s+texqtic_app/i);
    expect(migrationSql).toContain("current_setting('app.is_admin', true) = 'true'");
    expect(migrationSql).toContain("current_setting('app.org_id', true) IS NOT NULL");
    expect(migrationSql).toContain("current_setting('app.actor_id', true) IS NOT NULL");
  });

  it('does not broaden users policy scope', () => {
    expect(migrationSql).not.toMatch(/FOR\s+ALL/i);
    expect(migrationSql).not.toMatch(/TO\s+PUBLIC/i);
    expect(migrationSql).not.toMatch(/TO\s+anon/i);
    expect(migrationSql).not.toMatch(/TO\s+authenticated/i);
    expect(migrationSql).not.toContain('DISABLE ROW LEVEL SECURITY');
  });
});

describe('FAM-07E5L - activation paths set admin context before user bootstrap', () => {
  let tenantSource: string;

  beforeAll(() => {
    expect(fs.existsSync(TENANT_ROUTE_PATH)).toBe(true);
    tenantSource = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('sets admin context before user lookup/create in safe handoff activation', () => {
    const start = tenantSource.indexOf('export async function activateConsentRuntimeInviteById(input: {');
    expect(start).toBeGreaterThan(-1);

    const idxAdminRealm = tenantSource.indexOf(
      "await tx.$executeRawUnsafe(`SELECT set_config('app.realm', 'admin', true)`);",
      start,
    );
    const idxAdminFlag = tenantSource.indexOf(
      "await tx.$executeRawUnsafe(`SELECT set_config('app.is_admin', 'true', true)`);",
      start,
    );
    const idxUserFind = tenantSource.indexOf('let user = await tx.user.findUnique({', start);
    const idxUserCreate = tenantSource.indexOf('user = await tx.user.create({', start);

    expect(idxAdminRealm).toBeGreaterThan(-1);
    expect(idxAdminFlag).toBeGreaterThan(-1);
    expect(idxUserFind).toBeGreaterThan(-1);
    expect(idxUserCreate).toBeGreaterThan(-1);
    expect(idxAdminRealm).toBeLessThan(idxUserFind);
    expect(idxAdminFlag).toBeLessThan(idxUserCreate);
  });

  it('sets admin context before user lookup/create in invite activation', () => {
    const start = tenantSource.indexOf('// B-01: Detect existing TexQtic account');
    expect(start).toBeGreaterThan(-1);

    const idxAdminRealm = tenantSource.indexOf(
      "await tx.$executeRawUnsafe(`SELECT set_config('app.realm', 'admin', true)`);",
      start,
    );
    const idxAdminFlag = tenantSource.indexOf(
      "await tx.$executeRawUnsafe(`SELECT set_config('app.is_admin', 'true', true)`);",
      start,
    );
    const idxUserFind = tenantSource.indexOf('let user = await tx.user.findUnique({', start);
    const idxUserCreate = tenantSource.indexOf('user ??= await tx.user.create({', start);

    expect(idxAdminRealm).toBeGreaterThan(-1);
    expect(idxAdminFlag).toBeGreaterThan(-1);
    expect(idxUserFind).toBeGreaterThan(-1);
    expect(idxUserCreate).toBeGreaterThan(-1);
    expect(idxAdminRealm).toBeLessThan(idxUserFind);
    expect(idxAdminFlag).toBeLessThan(idxUserCreate);
  });
});
