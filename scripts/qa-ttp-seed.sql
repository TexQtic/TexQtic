-- ============================================================================
-- scripts/qa-ttp-seed.sql
-- QA Seed: TradeTrust Pay (TTP) Minimum Viable QA Dataset
-- ============================================================================
--
-- PURPOSE:
--   Creates the minimum viable QA dataset for TTP happy-path testing.
--   Covers all 8 data gaps identified in:
--   governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-FULL-RUNTIME-AUDIT-001.md §7
--
-- !! WARNING: QA / STAGING / TEST ENVIRONMENTS ONLY !!
--   ❌ DO NOT RUN IN PRODUCTION
--   ❌ DO NOT SET ttp_enabled = true (this script never touches that flag)
--   ❌ DO NOT MODIFY EXISTING PRODUCTION DATA
--
-- EXECUTION REQUIREMENT:
--   Run as postgres (superuser) or Supabase service_role.
--   These roles bypass FORCE ROW LEVEL SECURITY automatically.
--   Running via texqtic_app role is NOT SUPPORTED for this seed.
--
-- IDEMPOTENCY:
--   All INSERTs use ON CONFLICT (id) DO NOTHING.
--   Safe to re-run: existing rows are preserved, no duplicates created.
--
-- ACTIVATION GATE:
--   This seed DOES NOT activate TTP.
--   The feature_flags row for 'ttp_enabled' is LEFT UNCHANGED (remains false).
--   TTP activation is gated on Unit 3 sign-off (separate governance decision).
--
-- DATA SCOPE:
--   QA Seller Org:  ee000000-0000-0000-0000-000000000001 (slug: qa-ttp-seller-001)
--   QA Buyer Org:   ee000000-0000-0000-0000-000000000002 (slug: qa-ttp-buyer-001)
--   QA Trade:       ee000000-0000-0000-0000-000000000010
--   Invoices:       3 (INV-001 VERIFIED, INV-002 VERIFIED, INV-003 SUBMITTED)
--   GST:            1 APPROVED record for seller org
--   Eligibility:    1 ELIGIBLE assessment for seller org (risk_tier=1, LOW)
--   VPCs:           1 ACTIVE (from INV-001), 1 ROUTING_READY (from INV-002)
--   Routing Stub:   1 PENDING stub for the ROUTING_READY VPC
--   Enrollment:     2 log rows (NULL→REQUESTED, REQUESTED→APPROVED progression)
--
-- DATA GAP COVERAGE (ref: FULL-RUNTIME-AUDIT-001 §7):
--   Gap 1: Org with APPROVED gst_verifications        → §4 (APPROVED GST for seller)
--   Gap 2: ELIGIBLE ttp_eligibility_assessments        → §5
--   Gap 3: Invoice in VERIFIED state                   → §6 (INV-001, INV-002)
--          Invoice in SUBMITTED state                  → §6 (INV-003)
--   Gap 4: VPC in ACTIVE state                         → §7 (VPC 1)
--   Gap 5: VPC in ROUTING_READY state                  → §7 (VPC 2)
--   Gap 6: ttp_enrollment_logs in REQUESTED state      → §9 (LOG-1)
--   Gap 7: ttp_enrollment_logs in APPROVED state       → §9 (LOG-2)
--   Gap 8: Trade with complete TTP readiness chain     → Assembled by §3–§9
--
-- CLEANUP:
--   See §12 at end of file (commented DELETE statements, dependency-ordered).
--
-- Governance: PRODUCT-DEC-TRADETRUST-PAY-QA-SEED-ARTIFACT-001.md
-- ============================================================================
BEGIN;
-- ── Pre-flight: abort if ttp_enabled = true (refuse to seed into a live TTP env) ──
DO $$ BEGIN IF EXISTS (
  SELECT 1
  FROM public.feature_flags
  WHERE key = 'ttp_enabled'
    AND enabled = true
) THEN RAISE EXCEPTION 'QA-TTP-SEED PRE-CHECK ABORT: ttp_enabled = true detected. This seed must NEVER run while TTP is active. Aborting transaction.';
END IF;
END;
$$;
-- ════════════════════════════════════════════════════════════════════════════
-- §1  QA TENANTS
--     Both seller and buyer orgs require a corresponding tenants row.
--     The organizations table has a FK: organizations.id → tenants.id.
--     Insert tenants first (parent), then organizations (child).
--     Minimum required columns: id, slug, name (rest have DB defaults).
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO public.tenants (id, slug, name, updated_at)
VALUES -- QA TTP Seller Org tenant
  (
    'ee000000-0000-0000-0000-000000000001',
    'qa-ttp-seller-001',
    'QA TTP Seller Org 001',
    now()
  ),
  -- QA TTP Buyer Org tenant
  (
    'ee000000-0000-0000-0000-000000000002',
    'qa-ttp-buyer-001',
    'QA TTP Buyer Org 001',
    now()
  ) ON CONFLICT (id) DO NOTHING;
-- ════════════════════════════════════════════════════════════════════════════
-- §2  QA ORGANIZATIONS
--     organizations.id must equal tenants.id (constitutional FK: tenants.id).
--     Seller org is the TTP subject for all downstream TTP records.
--     Buyer org is the trade counterparty only.
--     Minimum required: id, slug, legal_name (rest have DB defaults).
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO public.organizations (
    id,
    slug,
    legal_name,
    jurisdiction,
    org_type,
    status,
    plan,
    is_qa_sentinel
  )
VALUES -- QA TTP Seller Org (TTP subject — all TTP records use this org_id)
  (
    'ee000000-0000-0000-0000-000000000001',
    'qa-ttp-seller-001',
    'QA TTP Seller Org 001 Limited',
    'IN',
    'B2B',
    'ACTIVE',
    'FREE',
    true
  ),
  -- QA TTP Buyer Org (trade counterparty only)
  (
    'ee000000-0000-0000-0000-000000000002',
    'qa-ttp-buyer-001',
    'QA TTP Buyer Org 001 Limited',
    'IN',
    'B2B',
    'ACTIVE',
    'FREE',
    true
  ) ON CONFLICT (id) DO NOTHING;
-- Idempotent sentinel flag: ensure existing rows are marked (ON CONFLICT DO NOTHING skips updates)
UPDATE public.organizations
SET is_qa_sentinel = true
WHERE id IN (
    'ee000000-0000-0000-0000-000000000001',
    'ee000000-0000-0000-0000-000000000002'
  );
-- ════════════════════════════════════════════════════════════════════════════
-- §3  QA TRADE
--     One trade: seller org 001 (tenant) selling to buyer org 002.
--     lifecycle_state_id: first non-terminal TRADE state available.
--     The trade state is not tested in TTP happy-path flows; any valid FK
--     satisfies the referential integrity requirement.
--     Unique per tenant on (tenant_id, trade_reference).
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO public.trades (
    id,
    tenant_id,
    buyer_org_id,
    seller_org_id,
    lifecycle_state_id,
    trade_reference,
    currency,
    gross_amount
  )
VALUES (
    'ee000000-0000-0000-0000-000000000010',
    'ee000000-0000-0000-0000-000000000001',
    -- tenant = seller org
    'ee000000-0000-0000-0000-000000000002',
    -- buyer
    'ee000000-0000-0000-0000-000000000001',
    -- seller
    (
      SELECT id
      FROM public.lifecycle_states
      WHERE entity_type = 'TRADE'
        AND is_terminal = false
      ORDER BY created_at
      LIMIT 1
    ), 'QA-TRADE-TTP-001', 'INR', 500000.000000
  ) ON CONFLICT (id) DO NOTHING;
-- ════════════════════════════════════════════════════════════════════════════
-- §4  QA GST VERIFICATION — APPROVED
--     One-per-org UNIQUE constraint on gst_verifications (org_id).
--     Seller org has an APPROVED GST verification (TTP onboarding gate 1).
--     GSTIN '27AAACQ0000A1ZX': format-valid 15-char string. Not a real GSTIN.
--     ON CONFLICT (org_id) DO NOTHING: safe re-run guard for UNIQUE constraint.
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO public.gst_verifications (
    id,
    org_id,
    gstin,
    legal_name_on_gst,
    state_code,
    registration_type,
    filing_status,
    submitted_at,
    reviewed_at,
    review_outcome,
    review_notes
  )
VALUES (
    'ee000000-0000-0000-0000-000000000030',
    'ee000000-0000-0000-0000-000000000001',
    '27AAACQ0000A1ZX',
    -- Format-valid fake GSTIN (not real)
    'QA TTP Seller Org 001 Limited',
    '27',
    -- Maharashtra state code
    'Regular',
    'ACTIVE',
    now(),
    now(),
    'APPROVED',
    'QA seed: GST verification auto-approved for TTP happy-path testing.'
  ) ON CONFLICT (org_id) DO NOTHING;
-- ════════════════════════════════════════════════════════════════════════════
-- §5  QA TTP ELIGIBILITY ASSESSMENT — ELIGIBLE (risk_tier=1, LOW)
--     No UNIQUE constraint on org_id — multiple assessments per org allowed.
--     max_invoice_amount = 250000 INR: matches ttp_max_invoice_amount_tier_1_inr
--     feature flag default value (set in TTP-FOUNDATION-001 migration).
--     valid_until = 180 days from seed execution.
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO public.ttp_eligibility_assessments (
    id,
    org_id,
    assessment_type,
    risk_tier,
    eligibility_outcome,
    max_invoice_amount,
    currency,
    assessed_at,
    valid_until,
    assessment_notes
  )
VALUES (
    'ee000000-0000-0000-0000-000000000040',
    'ee000000-0000-0000-0000-000000000001',
    'MANUAL',
    1,
    -- TTP_RISK_TIER.LOW
    'ELIGIBLE',
    250000.000000,
    -- Tier-1 cap (matches feature flag default)
    'INR',
    now(),
    now() + INTERVAL '180 days',
    'QA seed: MANUAL eligibility assessment. ELIGIBLE at risk tier 1 (LOW). Valid 180 days.'
  ) ON CONFLICT (id) DO NOTHING;
-- ════════════════════════════════════════════════════════════════════════════
-- §6  QA INVOICES
--     3 invoices against QA trade ee000000-...-000000000010:
--       INV-001: VERIFIED  — source invoice for VPC ACTIVE  (§7, VPC 1)
--       INV-002: VERIFIED  — source invoice for VPC ROUTING_READY (§7, VPC 2)
--       INV-003: SUBMITTED — InvoiceOversight pending-review queue view
--     lifecycle_state_id resolved by (entity_type, state_key) subquery.
--     UNIQUE constraint: (org_id, trade_id, invoice_number). ON CONFLICT (id) guards re-runs.
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO public.invoices (
    id,
    org_id,
    buyer_org_id,
    trade_id,
    invoice_number,
    invoice_date,
    due_date,
    currency,
    gross_amount,
    lifecycle_state_id,
    notes
  )
VALUES -- INV-001: VERIFIED — source for VPC ACTIVE
  (
    'ee000000-0000-0000-0000-000000000020',
    'ee000000-0000-0000-0000-000000000001',
    'ee000000-0000-0000-0000-000000000002',
    'ee000000-0000-0000-0000-000000000010',
    'QA-INV-001',
    now(),
    now() + INTERVAL '30 days',
    'INR',
    200000.000000,
    (
      SELECT id
      FROM public.lifecycle_states
      WHERE entity_type = 'INVOICE'
        AND state_key = 'VERIFIED'
    ),
    'QA seed: VERIFIED invoice 1. Source for VPC ACTIVE (ee000000-...-000000000050).'
  ),
  -- INV-002: VERIFIED — source for VPC ROUTING_READY
  (
    'ee000000-0000-0000-0000-000000000021',
    'ee000000-0000-0000-0000-000000000001',
    'ee000000-0000-0000-0000-000000000002',
    'ee000000-0000-0000-0000-000000000010',
    'QA-INV-002',
    now(),
    now() + INTERVAL '30 days',
    'INR',
    150000.000000,
    (
      SELECT id
      FROM public.lifecycle_states
      WHERE entity_type = 'INVOICE'
        AND state_key = 'VERIFIED'
    ),
    'QA seed: VERIFIED invoice 2. Source for VPC ROUTING_READY (ee000000-...-000000000051).'
  ),
  -- INV-003: SUBMITTED — InvoiceOversight pending-review queue
  (
    'ee000000-0000-0000-0000-000000000022',
    'ee000000-0000-0000-0000-000000000001',
    'ee000000-0000-0000-0000-000000000002',
    'ee000000-0000-0000-0000-000000000010',
    'QA-INV-003',
    now(),
    now() + INTERVAL '30 days',
    'INR',
    100000.000000,
    (
      SELECT id
      FROM public.lifecycle_states
      WHERE entity_type = 'INVOICE'
        AND state_key = 'SUBMITTED'
    ),
    'QA seed: SUBMITTED invoice. Tests InvoiceOversight pending-review queue.'
  ) ON CONFLICT (id) DO NOTHING;
-- ════════════════════════════════════════════════════════════════════════════
-- §7  QA VERIFIED PAYABLE CERTIFICATES (VPCs)
--     VPC 1: ACTIVE         — VpcConsole happy path (ACTIVE tab)
--     VPC 2: ROUTING_READY  — PartnerRoutingStubPanel happy path
--     vpc_reference is UNIQUE globally; uses deterministic QA prefixes.
--     invoice_id is UNIQUE (one VPC per invoice).
--     risk_tier=1 matches the eligibility assessment in §5.
--     partner_routing_eligible: false for ACTIVE, true for ROUTING_READY.
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO public.verified_payable_certificates (
    id,
    org_id,
    invoice_id,
    trade_id,
    buyer_org_id,
    seller_org_id,
    vpc_reference,
    currency,
    invoice_amount,
    risk_tier,
    lifecycle_state_id,
    issued_at,
    expires_at,
    partner_routing_eligible
  )
VALUES -- VPC 1: ACTIVE
  (
    'ee000000-0000-0000-0000-000000000050',
    'ee000000-0000-0000-0000-000000000001',
    'ee000000-0000-0000-0000-000000000020',
    -- INV-001
    'ee000000-0000-0000-0000-000000000010',
    'ee000000-0000-0000-0000-000000000002',
    'ee000000-0000-0000-0000-000000000001',
    'QA-VPC-ACTIVE-001',
    'INR',
    200000.000000,
    1,
    (
      SELECT id
      FROM public.lifecycle_states
      WHERE entity_type = 'VPC'
        AND state_key = 'ACTIVE'
    ),
    now(),
    now() + INTERVAL '90 days',
    false
  ),
  -- VPC 2: ROUTING_READY
  (
    'ee000000-0000-0000-0000-000000000051',
    'ee000000-0000-0000-0000-000000000001',
    'ee000000-0000-0000-0000-000000000021',
    -- INV-002
    'ee000000-0000-0000-0000-000000000010',
    'ee000000-0000-0000-0000-000000000002',
    'ee000000-0000-0000-0000-000000000001',
    'QA-VPC-ROUTING-001',
    'INR',
    150000.000000,
    1,
    (
      SELECT id
      FROM public.lifecycle_states
      WHERE entity_type = 'VPC'
        AND state_key = 'ROUTING_READY'
    ),
    now() + INTERVAL '1 second',
    -- issued_at: 1 second after VPC 1 so orderBy({issued_at:'desc'}) always
    -- selects VPC 2 as latestVpc → routing stub (§8) consistently found.
    now() + INTERVAL '90 days',
    true
  ) ON CONFLICT (id) DO NOTHING;
-- ════════════════════════════════════════════════════════════════════════════
-- §8  QA PARTNER ROUTING STUB
--     One stub for VPC 2 (ROUTING_READY). Transmission status: PENDING.
--     partner_type: NBFC_STUB (TTP_PARTNER_TYPE.NBFC_STUB — Phase 1 constant).
--     No UNIQUE constraint on (org_id, vpc_id) — ON CONFLICT (id) guards re-runs.
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO public.partner_routing_stubs (
    id,
    org_id,
    vpc_id,
    partner_type,
    payload_json,
    payload_version,
    transmission_status
  )
VALUES (
    'ee000000-0000-0000-0000-000000000060',
    'ee000000-0000-0000-0000-000000000001',
    'ee000000-0000-0000-0000-000000000051',
    -- VPC 2 (ROUTING_READY)
    'NBFC_STUB',
    '{"qa": true, "note": "QA seed partner routing stub. No real transmission."}',
    '1.0',
    'PENDING'
  ) ON CONFLICT (id) DO NOTHING;
-- ════════════════════════════════════════════════════════════════════════════
-- §8a  VPC ISSUED_AT ORDERING CORRECTION (QA ROUTING READINESS ALIGNMENT)
--      Ensures VPC 2 (ROUTING_READY, ee000000-...-000051) has a strictly
--      later issued_at than VPC 1 (ACTIVE, ee000000-...-000050).
--
--      Root cause: §7 inserts both VPCs with issued_at=now() in the same
--      VALUES clause → identical timestamps. TtpSummaryService.step-6
--      selects the single latest VPC via orderBy({issued_at:'desc'})+take:1.
--      With equal timestamps the selection is non-deterministic; when VPC 1
--      (ACTIVE) is selected its routing stub does not exist →
--      routing_readiness.found=false → Factor 7 FAIL → score=95 (not 100).
--
--      Fix: set VPC 2's issued_at to VPC 1's issued_at + 1 second so
--      TtpSummaryService always selects VPC 2 (ROUTING_READY) as latestVpc,
--      and the existing routing stub (§8) is consistently found.
--
--      Idempotent: the WHERE predicate is a no-op if VPC 2 already has a
--      strictly later issued_at than VPC 1 (correction already applied).
--
--      Scope: QA sentinel UUIDs only — never touches production data.
-- ════════════════════════════════════════════════════════════════════════════
UPDATE public.verified_payable_certificates
SET issued_at = (
    SELECT issued_at + INTERVAL '1 second'
    FROM public.verified_payable_certificates
    WHERE id = 'ee000000-0000-0000-0000-000000000050'
  )
WHERE id = 'ee000000-0000-0000-0000-000000000051'
  AND issued_at <= (
    SELECT issued_at
    FROM public.verified_payable_certificates
    WHERE id = 'ee000000-0000-0000-0000-000000000050'
  );
-- ════════════════════════════════════════════════════════════════════════════
-- §9  QA TTP ENROLLMENT LOGS
--     Two append-only log rows simulating a complete enrollment progression:
--       LOG-1: NULL     → REQUESTED  (tenant user initiates enrollment)
--       LOG-2: REQUESTED → APPROVED  (platform admin approves enrollment)
--     Enrollment state is inferred by the caller as the latest to_state.
--     These rows are immutable at the DB layer (trigger + RLS UPDATE block).
--     actor_type values from TTP_ACTOR_TYPE constants.
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO public.ttp_enrollment_logs (
    id,
    org_id,
    from_state,
    to_state,
    actor_type,
    actor_id,
    reason
  )
VALUES -- LOG-1: Enrollment REQUESTED by tenant user
  (
    'ee000000-0000-0000-0000-000000000070',
    'ee000000-0000-0000-0000-000000000001',
    NULL,
    'REQUESTED',
    'TENANT_USER',
    NULL,
    'QA seed: TTP enrollment requested by seller org tenant user.'
  ),
  -- LOG-2: Enrollment APPROVED by platform admin
  (
    'ee000000-0000-0000-0000-000000000071',
    'ee000000-0000-0000-0000-000000000001',
    'REQUESTED',
    'APPROVED',
    'PLATFORM_ADMIN',
    NULL,
    'QA seed: TTP enrollment approved by platform admin. All gates confirmed passed.'
  ) ON CONFLICT (id) DO NOTHING;
-- ════════════════════════════════════════════════════════════════════════════
-- §10 POST-SEED ACTIVATION GATE ASSERTION
--     Verify ttp_enabled remains false. This seed DOES NOT activate TTP.
--     Fail loudly if the feature flag was changed mid-transaction.
-- ════════════════════════════════════════════════════════════════════════════
DO $$ BEGIN IF EXISTS (
  SELECT 1
  FROM public.feature_flags
  WHERE key = 'ttp_enabled'
    AND enabled = true
) THEN RAISE EXCEPTION 'QA-TTP-SEED POST-CHECK ABORT: ttp_enabled = true detected after seed writes. This script never activates TTP. Investigate and rollback immediately.';
END IF;
RAISE NOTICE 'QA-TTP-SEED: ttp_enabled = false confirmed. TTP kill-switch remains active.';
END;
$$;
COMMIT;
-- ════════════════════════════════════════════════════════════════════════════
-- §11 VERIFICATION QUERIES
--     Run these AFTER COMMIT to confirm the seed was applied correctly.
--     All queries should return the expected row counts and field values.
-- ════════════════════════════════════════════════════════════════════════════
/*
 -- Expected: 2 rows (seller + buyer tenants)
 SELECT id, slug, name
 FROM public.tenants
 WHERE id IN (
 'ee000000-0000-0000-0000-000000000001',
 'ee000000-0000-0000-0000-000000000002'
 );
 
 -- Expected: 2 rows, both is_qa_sentinel = true
 SELECT id, slug, legal_name, status, is_qa_sentinel
 FROM public.organizations
 WHERE id IN (
 'ee000000-0000-0000-0000-000000000001',
 'ee000000-0000-0000-0000-000000000002'
 );
 
 -- Expected: 1 row, trade_reference='QA-TRADE-TTP-001', gross_amount=500000
 SELECT id, trade_reference, currency, gross_amount
 FROM public.trades
 WHERE id = 'ee000000-0000-0000-0000-000000000010';
 
 -- Expected: 1 row, review_outcome='APPROVED', filing_status='ACTIVE'
 SELECT id, gstin, review_outcome, filing_status
 FROM public.gst_verifications
 WHERE org_id = 'ee000000-0000-0000-0000-000000000001';
 
 -- Expected: 1 row, eligibility_outcome='ELIGIBLE', risk_tier=1
 SELECT id, eligibility_outcome, risk_tier, max_invoice_amount
 FROM public.ttp_eligibility_assessments
 WHERE id = 'ee000000-0000-0000-0000-000000000040';
 
 -- Expected: 3 rows — states VERIFIED, VERIFIED, SUBMITTED
 SELECT i.id, i.invoice_number, ls.state_key AS state
 FROM public.invoices i
 JOIN public.lifecycle_states ls ON ls.id = i.lifecycle_state_id
 WHERE i.org_id = 'ee000000-0000-0000-0000-000000000001'
 ORDER BY i.invoice_number;
 
 -- Expected: 2 rows — states ACTIVE, ROUTING_READY
 SELECT v.id, v.vpc_reference, ls.state_key AS state, v.partner_routing_eligible
 FROM public.verified_payable_certificates v
 JOIN public.lifecycle_states ls ON ls.id = v.lifecycle_state_id
 WHERE v.org_id = 'ee000000-0000-0000-0000-000000000001'
 ORDER BY v.vpc_reference;
 
 -- Expected: 1 row, partner_type='NBFC_STUB', transmission_status='PENDING'
 SELECT id, org_id, partner_type, transmission_status
 FROM public.partner_routing_stubs
 WHERE org_id = 'ee000000-0000-0000-0000-000000000001';
 
 -- Expected: 2 rows — to_state REQUESTED then APPROVED
 SELECT id, from_state, to_state, actor_type
 FROM public.ttp_enrollment_logs
 WHERE org_id = 'ee000000-0000-0000-0000-000000000001'
 ORDER BY created_at;
 
 -- Expected: key='ttp_enabled', enabled=false
 SELECT key, enabled, value
 FROM public.feature_flags
 WHERE key = 'ttp_enabled';
 */
-- ════════════════════════════════════════════════════════════════════════════
-- §12 CLEANUP
--     !! Destructive. Run ONLY with explicit operator approval !!
--     Removes all QA TTP seed data in reverse dependency order.
--     Governance: requires sign-off on governance decision record before execution.
-- ════════════════════════════════════════════════════════════════════════════
/*
 BEGIN;
 
 -- NOTE: ttp_enrollment_logs has an immutability trigger at DB layer.
 -- To delete QA seed rows, the trigger must be temporarily disabled
 -- OR the table must be accessed as a superuser (trigger fires for all roles
 -- including superuser via pg_trigger but can be disabled via:
 --   ALTER TABLE public.ttp_enrollment_logs DISABLE TRIGGER trg_ttp_enrollment_log_immutable;
 -- Re-enable after delete:
 --   ALTER TABLE public.ttp_enrollment_logs ENABLE TRIGGER trg_ttp_enrollment_log_immutable;
 -- Operator must confirm this is acceptable before running cleanup.
 
 DELETE FROM public.ttp_enrollment_logs
 WHERE id IN (
 'ee000000-0000-0000-0000-000000000070',
 'ee000000-0000-0000-0000-000000000071'
 );
 
 DELETE FROM public.partner_routing_stubs
 WHERE id = 'ee000000-0000-0000-0000-000000000060';
 
 DELETE FROM public.verified_payable_certificates
 WHERE id IN (
 'ee000000-0000-0000-0000-000000000050',
 'ee000000-0000-0000-0000-000000000051'
 );
 
 DELETE FROM public.invoices
 WHERE id IN (
 'ee000000-0000-0000-0000-000000000020',
 'ee000000-0000-0000-0000-000000000021',
 'ee000000-0000-0000-0000-000000000022'
 );
 
 DELETE FROM public.ttp_eligibility_assessments
 WHERE id = 'ee000000-0000-0000-0000-000000000040';
 
 DELETE FROM public.gst_verifications
 WHERE id = 'ee000000-0000-0000-0000-000000000030';
 
 DELETE FROM public.trades
 WHERE id = 'ee000000-0000-0000-0000-000000000010';
 
 -- organizations and tenants deleted last (parent tables)
 DELETE FROM public.organizations
 WHERE id IN (
 'ee000000-0000-0000-0000-000000000001',
 'ee000000-0000-0000-0000-000000000002'
 );
 
 DELETE FROM public.tenants
 WHERE id IN (
 'ee000000-0000-0000-0000-000000000001',
 'ee000000-0000-0000-0000-000000000002'
 );
 
 COMMIT;
 */