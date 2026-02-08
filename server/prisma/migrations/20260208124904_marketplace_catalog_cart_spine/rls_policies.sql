-- ==========================================
-- RLS Lockdown for Marketplace Tables
-- Defense-in-depth: backend-mediated access only
-- ==========================================
-- Enable RLS on catalog_items
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
-- Enable RLS on carts
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
-- Enable RLS on cart_items  
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
-- Revoke all privileges from anon and authenticated roles
REVOKE ALL ON TABLE public.catalog_items
FROM anon,
  authenticated;
REVOKE ALL ON TABLE public.carts
FROM anon,
  authenticated;
REVOKE ALL ON TABLE public.cart_items
FROM anon,
  authenticated;
-- Create explicit deny policies for catalog_items
CREATE POLICY catalog_items_deny_anon_all ON public.catalog_items FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY catalog_items_deny_authenticated_all ON public.catalog_items FOR ALL TO authenticated USING (false) WITH CHECK (false);
-- Create explicit deny policies for carts
CREATE POLICY carts_deny_anon_all ON public.carts FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY carts_deny_authenticated_all ON public.carts FOR ALL TO authenticated USING (false) WITH CHECK (false);
-- Create explicit deny policies for cart_items
CREATE POLICY cart_items_deny_anon_all ON public.cart_items FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY cart_items_deny_authenticated_all ON public.cart_items FOR ALL TO authenticated USING (false) WITH CHECK (false);
-- ==========================================
-- Summary:
-- - RLS enabled on catalog_items, carts, cart_items
-- - anon/authenticated roles fully denied
-- - Backend access via app_user role (unaffected)
-- - No PostgREST exposure possible
-- ==========================================