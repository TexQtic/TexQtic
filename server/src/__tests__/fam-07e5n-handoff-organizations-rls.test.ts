import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SERVER_ROOT = path.resolve(__dirname, '../../');
const TENANT_ROUTE_PATH = path.join(SERVER_ROOT, 'src/routes/tenant.ts');
const MIGRATION_PATH = path.join(
  SERVER_ROOT,
  'prisma/migrations/20260602000000_fam_07e5n_handoff_organizations_update_grant/migration.sql',
);
const G015_MIGRATION_PATH = path.join(
  SERVER_ROOT,
  'prisma/migrations/20260224000000_g015_phase_a_introduce_organizations/migration.sql',
);

describe('FAM-07E5N - organizations UPDATE grant migration', () => {
  let migrationSql: string;

  beforeAll(() => {
    expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
    migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
  });

  it('grants UPDATE on organizations to texqtic_app', () => {
    expect(migrationSql).toMatch(/GRANT\s+UPDATE\s+ON\s+TABLE\s+public\.organizations\s+TO\s+texqtic_app/i);
  });

  it('does not drop or alter any RLS policy', () => {
    expect(migrationSql).not.toMatch(/DROP\s+POLICY/i);
    expect(migrationSql).not.toMatch(/ALTER\s+POLICY/i);
    expect(migrationSql).not.toContain('DISABLE ROW LEVEL SECURITY');
    expect(migrationSql).not.toContain('NOFORCE ROW LEVEL SECURITY');
  });

  it('does not grant DELETE or TRUNCATE', () => {
    expect(migrationSql).not.toMatch(/GRANT\s+DELETE/i);
    expect(migrationSql).not.toMatch(/GRANT\s+TRUNCATE/i);
  });

  it('does not grant BYPASSRLS to texqtic_app', () => {
    // The migration may reference BYPASSRLS in comments; ensure no actual GRANT ... BYPASSRLS statement exists
    expect(migrationSql).not.toMatch(/GRANT\s+.*?BYPASSRLS\s+TO/i);
    expect(migrationSql).not.toMatch(/ALTER\s+ROLE.*?BYPASSRLS/i);
  });

  it('includes inline verification DO block', () => {
    expect(migrationSql).toContain('has_table_privilege');
    expect(migrationSql).toContain('texqtic_app');
    expect(migrationSql).toContain('UPDATE');
  });
});

describe('FAM-07E5N - G-015 baseline confirms SELECT-only grant existed before E5N', () => {
  let g015Sql: string;

  beforeAll(() => {
    expect(fs.existsSync(G015_MIGRATION_PATH)).toBe(true);
    g015Sql = fs.readFileSync(G015_MIGRATION_PATH, 'utf-8');
  });

  it('G-015 only granted SELECT to texqtic_app (root cause baseline)', () => {
    // G-015 grants SELECT but NOT UPDATE to texqtic_app
    expect(g015Sql).toContain('GRANT SELECT ON TABLE public.organizations TO texqtic_app');
    // No UPDATE grant to texqtic_app in the original migration
    expect(g015Sql).not.toMatch(/GRANT.*?UPDATE.*?texqtic_app/i);
  });

  it('G-015 has a correct UPDATE RLS policy for admin realm', () => {
    expect(g015Sql).toContain('organizations_control_plane_update');
    expect(g015Sql).toContain("app.current_realm() = 'admin'");
  });
});

describe('FAM-07E5N - handoff path sets admin context before organizations.update', () => {
  let tenantSource: string;

  beforeAll(() => {
    expect(fs.existsSync(TENANT_ROUTE_PATH)).toBe(true);
    tenantSource = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('safe handoff: admin context set before organizations.update call', () => {
    const fnStart = tenantSource.indexOf('export async function activateConsentRuntimeInviteById(input: {');
    expect(fnStart).toBeGreaterThan(-1);

    // Find the first organizations.update inside this function
    const idxOrgUpdate = tenantSource.indexOf('tx.organizations.update(', fnStart);
    expect(idxOrgUpdate).toBeGreaterThan(-1);

    // Admin context must be set before organizations.update
    const idxAdminRealm = tenantSource.indexOf(
      "await tx.$executeRawUnsafe(`SELECT set_config('app.realm', 'admin', true)`);",
      fnStart,
    );
    const idxAdminFlag = tenantSource.indexOf(
      "await tx.$executeRawUnsafe(`SELECT set_config('app.is_admin', 'true', true)`);",
      fnStart,
    );

    expect(idxAdminRealm).toBeGreaterThan(-1);
    expect(idxAdminFlag).toBeGreaterThan(-1);
    expect(idxAdminRealm).toBeLessThan(idxOrgUpdate);
    expect(idxAdminFlag).toBeLessThan(idxOrgUpdate);
  });

  it('safe handoff: realm reset to tenant AFTER organizations.update', () => {
    const fnStart = tenantSource.indexOf('export async function activateConsentRuntimeInviteById(input: {');
    expect(fnStart).toBeGreaterThan(-1);

    const idxOrgUpdate = tenantSource.indexOf('tx.organizations.update(', fnStart);
    expect(idxOrgUpdate).toBeGreaterThan(-1);

    // tenant realm reset must come AFTER organizations.update
    const idxTenantRealm = tenantSource.indexOf(
      "await tx.$executeRawUnsafe(`SELECT set_config('app.realm', 'tenant', true)`);",
      idxOrgUpdate,
    );
    const idxAdminFalse = tenantSource.indexOf(
      "await tx.$executeRawUnsafe(`SELECT set_config('app.is_admin', 'false', true)`);",
      idxOrgUpdate,
    );

    expect(idxTenantRealm).toBeGreaterThan(idxOrgUpdate);
    expect(idxAdminFalse).toBeGreaterThan(idxOrgUpdate);
  });
});
