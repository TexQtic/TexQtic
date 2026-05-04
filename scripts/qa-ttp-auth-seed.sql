-- ============================================================================
-- scripts/qa-ttp-auth-seed.sql
-- QA Auth Seed: TradeTrust Pay — Tenant User Fixtures
-- ============================================================================
-- PURPOSE: Creates QA sentinel users + memberships for tenant-plane E2E auth
--
-- !! WARNING: QA / STAGING / TEST ENVIRONMENTS ONLY !!
-- !! NEVER execute against a production database !!
--
-- IDEMPOTENCY:
--   ON CONFLICT (id) DO NOTHING — safe to re-run
--
-- ACTIVATION GATE:
--   Pre-checks ttp_enabled = false. Aborts if flag is active to prevent
--   seeding while TTP feature is live.
--
-- USAGE:
--   1. Generate a bcrypt hash for the shared QA password:
--        node -e "require('bcryptjs').hash(process.env.QA_AUTH_PWD, 10).then(h => process.stdout.write(h))"
--   2. Execute with psql variable substitution:
--        psql -f scripts/qa-ttp-auth-seed.sql \
--             -v "seller_hash=<bcrypt_hash>" \
--             -v "buyer_hash=<bcrypt_hash>" \
--             -v ON_ERROR_STOP=1
--
-- SENTINEL UUIDs:
--   QA Seller User:       ee000000-0000-0000-0000-000000000101
--   QA Buyer User:        ee000000-0000-0000-0000-000000000102
--   QA Seller Membership: ee000000-0000-0000-0000-000000000201
--   QA Buyer Membership:  ee000000-0000-0000-0000-000000000202
--   QA Seller Tenant:     ee000000-0000-0000-0000-000000000001
--   QA Buyer Tenant:      ee000000-0000-0000-0000-000000000002
--
-- Governance: PRODUCT-DEC-TRADETRUST-PAY-QA-AUTH-TENANT-E2E-VERIFIED-001.md
-- ============================================================================
BEGIN;
-- ============================================================================
-- §0 ACTIVATION GATE
--    Abort if ttp_enabled = true to prevent seeding while TTP is live.
-- ============================================================================
DO $$ BEGIN IF EXISTS (
  SELECT 1
  FROM public.feature_flags
  WHERE key = 'ttp_enabled'
    AND enabled = true
) THEN RAISE EXCEPTION 'QA-AUTH-SEED ABORT: ttp_enabled = true. Must not seed while TTP active.';
END IF;
END;
$$;
-- ============================================================================
-- §AUTH-1: QA Seller User
--    Email: qa-ttp-seller@texqtic.test
--    Role (via membership): OWNER of seller tenant ee000000-...-000000000001
-- ============================================================================
INSERT INTO public.users (
    id,
    email,
    password_hash,
    email_verified,
    email_verified_at,
    created_at,
    updated_at
  )
VALUES (
    'ee000000-0000-0000-0000-000000000101',
    'qa-ttp-seller@texqtic.test',
    :'seller_hash',
    true,
    now(),
    now(),
    now()
  ) ON CONFLICT (id) DO NOTHING;
-- ============================================================================
-- §AUTH-2: QA Buyer User
--    Email: qa-ttp-buyer@texqtic.test
--    Role (via membership): OWNER of buyer tenant ee000000-...-000000000002
-- ============================================================================
INSERT INTO public.users (
    id,
    email,
    password_hash,
    email_verified,
    email_verified_at,
    created_at,
    updated_at
  )
VALUES (
    'ee000000-0000-0000-0000-000000000102',
    'qa-ttp-buyer@texqtic.test',
    :'buyer_hash',
    true,
    now(),
    now(),
    now()
  ) ON CONFLICT (id) DO NOTHING;
-- ============================================================================
-- §AUTH-3: QA Seller Membership → Seller Tenant
--    user_id:  ee000000-...-000000000101 (QA Seller User)
--    tenant_id: ee000000-...-000000000001 (QA Seller Tenant)
--    role: OWNER
-- ============================================================================
INSERT INTO public.memberships (
    id,
    user_id,
    tenant_id,
    role,
    created_at,
    updated_at
  )
VALUES (
    'ee000000-0000-0000-0000-000000000201',
    'ee000000-0000-0000-0000-000000000101',
    'ee000000-0000-0000-0000-000000000001',
    'OWNER'::membership_role,
    now(),
    now()
  ) ON CONFLICT (id) DO NOTHING;
-- ============================================================================
-- §AUTH-4: QA Buyer Membership → Buyer Tenant
--    user_id:  ee000000-...-000000000102 (QA Buyer User)
--    tenant_id: ee000000-...-000000000002 (QA Buyer Tenant)
--    role: OWNER
-- ============================================================================
INSERT INTO public.memberships (
    id,
    user_id,
    tenant_id,
    role,
    created_at,
    updated_at
  )
VALUES (
    'ee000000-0000-0000-0000-000000000202',
    'ee000000-0000-0000-0000-000000000102',
    'ee000000-0000-0000-0000-000000000002',
    'OWNER'::membership_role,
    now(),
    now()
  ) ON CONFLICT (id) DO NOTHING;
COMMIT;
-- ============================================================================
-- §POST-SEED VERIFICATION
-- ============================================================================
SELECT id,
  email,
  email_verified
FROM public.users
WHERE id IN (
    'ee000000-0000-0000-0000-000000000101',
    'ee000000-0000-0000-0000-000000000102'
  );
SELECT id,
  user_id,
  tenant_id,
  role
FROM public.memberships
WHERE id IN (
    'ee000000-0000-0000-0000-000000000201',
    'ee000000-0000-0000-0000-000000000202'
  );