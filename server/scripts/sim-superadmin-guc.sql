-- OPS-SUPERADMIN-CAPABILITY-001 Gate 4 Sims

-- === Sim A: Superadmin context ===
BEGIN;
  SET LOCAL ROLE texqtic_app;
  SELECT set_config('app.realm',          'control',                             true);
  SELECT set_config('app.actor_id',       '00000000-0000-0000-0000-000000000001', true);
  SELECT set_config('app.org_id',         '00000000-0000-0000-0000-000000000001', true);
  SELECT set_config('app.is_admin',       'true',                                true);
  SELECT set_config('app.is_superadmin',  'true',                                true);
  SELECT
    current_setting('app.realm',         true) AS realm,
    current_setting('app.is_admin',      true) = 'true' AS is_admin_true,
    current_setting('app.is_superadmin', true) = 'true' AS is_superadmin_true;
ROLLBACK;

-- === Sim B: Platform admin (no superadmin) ===
BEGIN;
  SET LOCAL ROLE texqtic_app;
  SELECT set_config('app.realm',     'control',                             true);
  SELECT set_config('app.actor_id',  '00000000-0000-0000-0000-000000000001', true);
  SELECT set_config('app.org_id',    '00000000-0000-0000-0000-000000000001', true);
  SELECT set_config('app.is_admin',  'true',                                true);
  SELECT
    current_setting('app.realm',         true)         AS realm,
    current_setting('app.is_admin',      true) = 'true' AS is_admin_true,
    coalesce(current_setting('app.is_superadmin', true), '') = 'true' AS is_superadmin_true;
ROLLBACK;

-- === Sim C: Tenant context ===
BEGIN;
  SET LOCAL ROLE texqtic_app;
  SELECT set_config('app.realm',    'tenant',                              true);
  SELECT set_config('app.org_id',   '11111111-1111-1111-1111-111111111111', true);
  SELECT set_config('app.actor_id', '22222222-2222-2222-2222-222222222222', true);
  SELECT
    current_setting('app.realm',         true)         AS realm,
    coalesce(current_setting('app.is_admin',      true), '') = 'true' AS is_admin_true,
    coalesce(current_setting('app.is_superadmin', true), '') = 'true' AS is_superadmin_true;
ROLLBACK;