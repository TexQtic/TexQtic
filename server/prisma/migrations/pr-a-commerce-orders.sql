-- ============================================================
-- PR-A: Commerce Core — Orders + Checkout (stub payment)
-- Applies: orders table, order_items table, RLS, grants
-- Doctrine: app.org_id (constitutional boundary)
-- Apply via: psql $DATABASE_URL -f prisma/migrations/pr-a-commerce-orders.sql
-- ============================================================
BEGIN;
-- ============================================================
-- 1. ENUM: order_status
-- ============================================================
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM pg_type
  WHERE typname = 'order_status'
) THEN CREATE TYPE order_status AS ENUM ('PAYMENT_PENDING', 'PLACED', 'CANCELLED');
RAISE NOTICE 'Created enum: order_status';
ELSE RAISE NOTICE 'Enum order_status already exists, skipping';
END IF;
END $$;
-- ============================================================
-- 2. TABLE: orders
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  cart_id UUID REFERENCES carts(id) ON DELETE
  SET NULL,
    status order_status NOT NULL DEFAULT 'PAYMENT_PENDING',
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ============================================================
-- 3. TABLE: order_items (pricing snapshot)
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  catalog_item_id UUID REFERENCES catalog_items(id) ON DELETE
  SET NULL,
    sku VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    line_total DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ============================================================
-- 4. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_created ON orders(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_cart_id ON orders(cart_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_tenant_id ON order_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_catalog_item ON order_items(catalog_item_id);
-- ============================================================
-- 5. RLS: Enable + Force
-- ============================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items FORCE ROW LEVEL SECURITY;
-- ============================================================
-- 6. RLS POLICIES: orders
-- Uses app.org_id (constitutional boundary — withDbContext sets this)
-- ============================================================
DROP POLICY IF EXISTS orders_tenant_select ON orders;
DROP POLICY IF EXISTS orders_tenant_insert ON orders;
DROP POLICY IF EXISTS orders_admin_all ON orders;
-- Tenant: read own orders
CREATE POLICY orders_tenant_select ON orders FOR
SELECT USING (
    current_setting('app.org_id', true) IS NOT NULL
    AND current_setting('app.org_id', true) <> ''
    AND tenant_id = current_setting('app.org_id', true)::uuid
  );
-- Tenant: insert orders (system writes during checkout)
CREATE POLICY orders_tenant_insert ON orders FOR
INSERT WITH CHECK (
    current_setting('app.org_id', true) IS NOT NULL
    AND current_setting('app.org_id', true) <> ''
    AND tenant_id = current_setting('app.org_id', true)::uuid
  );
-- Admin: full read access (admin context sets app.is_admin = 'true')
CREATE POLICY orders_admin_all ON orders FOR ALL USING (current_setting('app.is_admin', true) = 'true');
-- ============================================================
-- 7. RLS POLICIES: order_items
-- ============================================================
DROP POLICY IF EXISTS order_items_tenant_select ON order_items;
DROP POLICY IF EXISTS order_items_tenant_insert ON order_items;
DROP POLICY IF EXISTS order_items_admin_all ON order_items;
-- Tenant: read own order items
CREATE POLICY order_items_tenant_select ON order_items FOR
SELECT USING (
    current_setting('app.org_id', true) IS NOT NULL
    AND current_setting('app.org_id', true) <> ''
    AND tenant_id = current_setting('app.org_id', true)::uuid
  );
-- Tenant: insert order items (system writes during checkout)
CREATE POLICY order_items_tenant_insert ON order_items FOR
INSERT WITH CHECK (
    current_setting('app.org_id', true) IS NOT NULL
    AND current_setting('app.org_id', true) <> ''
    AND tenant_id = current_setting('app.org_id', true)::uuid
  );
-- Admin: full read access
CREATE POLICY order_items_admin_all ON order_items FOR ALL USING (current_setting('app.is_admin', true) = 'true');
-- ============================================================
-- 8. GRANTS to app_user
-- ============================================================
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT,
  INSERT ON orders TO app_user;
GRANT SELECT,
  INSERT ON order_items TO app_user;
GRANT USAGE,
  SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
-- Also grant to texqtic_app (used by SET LOCAL ROLE in withDbContext)
DO $$ BEGIN IF EXISTS (
  SELECT 1
  FROM pg_roles
  WHERE rolname = 'texqtic_app'
) THEN
GRANT USAGE ON SCHEMA public TO texqtic_app;
GRANT SELECT,
  INSERT ON orders TO texqtic_app;
GRANT SELECT,
  INSERT ON order_items TO texqtic_app;
GRANT USAGE,
  SELECT ON ALL SEQUENCES IN SCHEMA public TO texqtic_app;
RAISE NOTICE 'Granted orders/order_items to texqtic_app';
ELSE RAISE NOTICE 'texqtic_app role not found — skipping (grants to app_user only)';
END IF;
END $$;
COMMIT;
-- ============================================================
-- VERIFICATION (run separately after COMMIT)
-- ============================================================
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_name IN ('orders', 'order_items');
-- SELECT schemaname, tablename, rowsecurity, forcerls
--   FROM pg_tables WHERE tablename IN ('orders', 'order_items');
-- SELECT policyname, tablename, cmd FROM pg_policies
--   WHERE tablename IN ('orders', 'order_items');