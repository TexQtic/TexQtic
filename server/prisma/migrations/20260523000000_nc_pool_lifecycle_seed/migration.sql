-- ============================================================================
-- TEXQTIC-NC-PHASE1-POOL-LIFECYCLE-SEED-001
-- Task ID:    TEXQTIC-NC-PHASE1-POOL-LIFECYCLE-SEED-001
-- Doctrine:   v1.4 + TEXQTIC-NETWORK-COMMERCE-DESIGN-FOUNDATION-001
-- Date:       2026-05-23
-- Author:     TexQtic Platform Engineering (Safe-Write Mode)
-- Constitutional Review: NC Phase 1 authorized track
-- ============================================================================
--
-- PURPOSE
--   Seed the POOL lifecycle state graph into lifecycle_states and
--   allowed_transitions for entity_type = 'POOL'.
--
--   This is a PREREQUISITE for inserting any network_pools row because
--   network_pools.pool_lifecycle_state_id is a FK → lifecycle_states(id).
--
-- OBJECTS SEEDED
--   lifecycle_states: 17 rows with entity_type = 'POOL'
--   allowed_transitions: 24 rows with entity_type = 'POOL'
--
-- IDEMPOTENCY
--   Both INSERT statements use ON CONFLICT DO NOTHING.
--   lifecycle_states unique constraint: (entity_type, state_key)
--   allowed_transitions unique constraint: (entity_type, from_state_key, to_state_key)
--
-- ENTITY_TYPE CHECK CONSTRAINT
--   lifecycle_states.entity_type CHECK and allowed_transitions.entity_type CHECK
--   both already include 'POOL' (added by migration 20260520000000_nc_network_lifecycle_logs).
--
-- POOL LIFECYCLE STATES (17)
--   DRAFT, OPEN, AGGREGATING, CLOSED_FOR_BIDS, QUOTED, ACCEPTED, ALLOCATING,
--   ALLOCATED, ORDERED, IN_FULFILMENT, PARTIALLY_DELIVERED, DELIVERED,
--   SETTLEMENT_PENDING, SETTLED (terminal), REJECTED (terminal),
--   WITHDRAWN (terminal), CANCELLED (terminal)
--
-- POOL ALLOWED TRANSITIONS (24)
--   Main flow (16): DRAFT→OPEN, OPEN→AGGREGATING, AGGREGATING→CLOSED_FOR_BIDS,
--     CLOSED_FOR_BIDS→QUOTED, QUOTED→ACCEPTED, QUOTED→REJECTED,
--     ACCEPTED→ALLOCATING, ALLOCATING→ALLOCATED, ALLOCATED→ORDERED,
--     ORDERED→IN_FULFILMENT, IN_FULFILMENT→PARTIALLY_DELIVERED,
--     IN_FULFILMENT→DELIVERED, PARTIALLY_DELIVERED→DELIVERED,
--     PARTIALLY_DELIVERED→SETTLEMENT_PENDING, DELIVERED→SETTLEMENT_PENDING,
--     SETTLEMENT_PENDING→SETTLED
--   Exit/cancellation (8): DRAFT→CANCELLED, OPEN→CANCELLED,
--     AGGREGATING→WITHDRAWN, CLOSED_FOR_BIDS→WITHDRAWN, QUOTED→WITHDRAWN,
--     ACCEPTED→CANCELLED, ALLOCATING→CANCELLED, ALLOCATED→CANCELLED
-- ============================================================================
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §1  PRE-FLIGHT SAFETY CHECKS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$ BEGIN -- Require lifecycle_states table (G-020 must be applied)
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'lifecycle_states'
) THEN RAISE EXCEPTION 'POOL-LIFECYCLE-SEED PRE-FLIGHT BLOCKED: public.lifecycle_states does not exist. Apply G-020 migration before this seed.';
END IF;
-- Require allowed_transitions table (G-020 must be applied)
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'allowed_transitions'
) THEN RAISE EXCEPTION 'POOL-LIFECYCLE-SEED PRE-FLIGHT BLOCKED: public.allowed_transitions does not exist. Apply G-020 migration before this seed.';
END IF;
-- Require network_pools table (NC migration 20260522000000 must be applied)
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'network_pools'
) THEN RAISE EXCEPTION 'POOL-LIFECYCLE-SEED PRE-FLIGHT BLOCKED: public.network_pools does not exist. Apply 20260522000000_nc_network_pools migration before this seed.';
END IF;
-- Idempotency guard: warn if POOL states already exist (not an error — ON CONFLICT handles it)
IF EXISTS (
  SELECT 1
  FROM public.lifecycle_states
  WHERE entity_type = 'POOL'
) THEN RAISE NOTICE 'POOL-LIFECYCLE-SEED: POOL lifecycle_states rows already exist. Proceeding — INSERT ON CONFLICT DO NOTHING will skip duplicates.';
ELSE RAISE NOTICE 'POOL-LIFECYCLE-SEED pre-flight OK: network_pools present, POOL states absent. Seeding now.';
END IF;
END;
$$;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §2  SEED: POOL lifecycle_states (17 rows)
--
--   severity_level: 0=routine, 1=notable, 2=significant, 3=high, 4=critical
--   Terminal states: SETTLED, REJECTED, WITHDRAWN, CANCELLED
--   Irreversible states: same as terminal
--   requires_maker_checker on state: applies to transitions INTO that state
--     ACCEPTED: MC gate when pool admin accepts supplier quote above threshold
--     SETTLED:  MC always required for settlement trigger (per NC design §8.3)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO public.lifecycle_states (
    entity_type,
    state_key,
    is_terminal,
    is_irreversible,
    severity_level,
    requires_maker_checker,
    description
  )
VALUES (
    'POOL',
    'DRAFT',
    false,
    false,
    0,
    false,
    'Pool created by pool administrator. Awaiting opening for member demand registration.'
  ),
  (
    'POOL',
    'OPEN',
    false,
    false,
    0,
    false,
    'Pool open for member demand registration. Members may submit demand lines.'
  ),
  (
    'POOL',
    'AGGREGATING',
    false,
    false,
    0,
    false,
    'Demand collection window active. Pool is aggregating member demand lines.'
  ),
  (
    'POOL',
    'CLOSED_FOR_BIDS',
    false,
    false,
    0,
    false,
    'Demand window closed. Consolidated RFQ issued to supplier(s); awaiting supplier quotes.'
  ),
  (
    'POOL',
    'QUOTED',
    false,
    false,
    0,
    false,
    'Supplier quote received. Pool administrator reviewing quote for acceptance or rejection.'
  ),
  (
    'POOL',
    'ACCEPTED',
    false,
    false,
    1,
    true,
    'Pool administrator accepted supplier quote. MakerChecker required for high-value acceptance. Allocation computation begins.'
  ),
  (
    'POOL',
    'ALLOCATING',
    false,
    false,
    0,
    false,
    'Demand allocation being computed per member based on declared demand shares.'
  ),
  (
    'POOL',
    'ALLOCATED',
    false,
    false,
    0,
    false,
    'Allocation confirmed and communicated to all pool members. Awaiting consolidated order placement.'
  ),
  (
    'POOL',
    'ORDERED',
    false,
    false,
    0,
    false,
    'Consolidated order placed to supplier. Supplier executing fulfilment.'
  ),
  (
    'POOL',
    'IN_FULFILMENT',
    false,
    false,
    1,
    false,
    'Supplier executing order. Delivery updates expected. May transition to PARTIALLY_DELIVERED or DELIVERED.'
  ),
  (
    'POOL',
    'PARTIALLY_DELIVERED',
    false,
    false,
    1,
    false,
    'Partial delivery received and acknowledged. Remaining delivery in progress or settlement negotiation underway.'
  ),
  (
    'POOL',
    'DELIVERED',
    false,
    false,
    0,
    false,
    'Full delivery received and confirmed by pool administrator. Awaiting settlement.'
  ),
  (
    'POOL',
    'SETTLEMENT_PENDING',
    false,
    false,
    1,
    false,
    'Delivery confirmed. Settlement computation and disbursement in progress. MakerChecker required for settlement trigger.'
  ),
  (
    'POOL',
    'SETTLED',
    true,
    true,
    0,
    true,
    'Settlement completed and disbursed to all pool members. Terminal and irreversible. MakerChecker always required.'
  ),
  (
    'POOL',
    'REJECTED',
    true,
    true,
    2,
    false,
    'Pool administrator rejected all supplier quotes. Pool closed without execution. Terminal and irreversible.'
  ),
  (
    'POOL',
    'WITHDRAWN',
    true,
    true,
    1,
    false,
    'Pool withdrawn by pool administrator before order execution. Terminal and irreversible.'
  ),
  (
    'POOL',
    'CANCELLED',
    true,
    true,
    2,
    false,
    'Pool cancelled by platform admin (admin-initiated). Terminal and irreversible.'
  ) ON CONFLICT DO NOTHING;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §3  SEED: POOL allowed_transitions (24 rows)
--
--   allowed_actor_type values (D-020-A):
--     TENANT_USER | TENANT_ADMIN | PLATFORM_ADMIN | SYSTEM_AUTOMATION | MAKER | CHECKER
--
--   Composite FKs to lifecycle_states(entity_type, state_key) enforced by DB.
--   lifecycle_states for POOL must exist (seeded in §2 above).
--
--   requires_maker_checker=true:
--     QUOTED→ACCEPTED: high-value quote acceptance (pool admin is Maker;
--       second pool admin or PLATFORM_ADMIN is Checker per NC design §8.3)
--     SETTLEMENT_PENDING→SETTLED: settlement trigger always requires MC
--
--   requires_escalation=true:
--     ACCEPTED→CANCELLED, ALLOCATING→CANCELLED, ALLOCATED→CANCELLED:
--       late-stage cancellation requires escalation event (severity ≥ 2)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO public.allowed_transitions (
    entity_type,
    from_state_key,
    to_state_key,
    allowed_actor_type,
    requires_maker_checker,
    requires_escalation
  )
VALUES -- ── MAIN FLOW (16) ──────────────────────────────────────────────────────
  -- DRAFT → OPEN: pool administrator opens for member demand registration
  (
    'POOL',
    'DRAFT',
    'OPEN',
    ARRAY ['TENANT_ADMIN', 'PLATFORM_ADMIN'],
    false,
    false
  ),
  -- OPEN → AGGREGATING: demand collection window activated
  (
    'POOL',
    'OPEN',
    'AGGREGATING',
    ARRAY ['TENANT_ADMIN', 'SYSTEM_AUTOMATION'],
    false,
    false
  ),
  -- AGGREGATING → CLOSED_FOR_BIDS: pool admin closes demand window and issues RFQ
  (
    'POOL',
    'AGGREGATING',
    'CLOSED_FOR_BIDS',
    ARRAY ['TENANT_ADMIN', 'PLATFORM_ADMIN'],
    false,
    false
  ),
  -- CLOSED_FOR_BIDS → QUOTED: supplier quote received; pool admin records quote
  (
    'POOL',
    'CLOSED_FOR_BIDS',
    'QUOTED',
    ARRAY ['TENANT_ADMIN', 'PLATFORM_ADMIN'],
    false,
    false
  ),
  -- QUOTED → ACCEPTED: pool admin accepts supplier quote (MC for high-value)
  (
    'POOL',
    'QUOTED',
    'ACCEPTED',
    ARRAY ['TENANT_ADMIN', 'PLATFORM_ADMIN', 'CHECKER'],
    true,
    false
  ),
  -- QUOTED → REJECTED: pool admin rejects all supplier quotes; pool closed
  (
    'POOL',
    'QUOTED',
    'REJECTED',
    ARRAY ['TENANT_ADMIN', 'PLATFORM_ADMIN'],
    false,
    false
  ),
  -- ACCEPTED → ALLOCATING: allocation computation begins
  (
    'POOL',
    'ACCEPTED',
    'ALLOCATING',
    ARRAY ['TENANT_ADMIN', 'SYSTEM_AUTOMATION'],
    false,
    false
  ),
  -- ALLOCATING → ALLOCATED: allocation confirmed to all members
  (
    'POOL',
    'ALLOCATING',
    'ALLOCATED',
    ARRAY ['TENANT_ADMIN', 'SYSTEM_AUTOMATION'],
    false,
    false
  ),
  -- ALLOCATED → ORDERED: consolidated order placed to supplier
  (
    'POOL',
    'ALLOCATED',
    'ORDERED',
    ARRAY ['TENANT_ADMIN', 'PLATFORM_ADMIN'],
    false,
    false
  ),
  -- ORDERED → IN_FULFILMENT: supplier begins executing the order
  (
    'POOL',
    'ORDERED',
    'IN_FULFILMENT',
    ARRAY ['TENANT_ADMIN', 'SYSTEM_AUTOMATION'],
    false,
    false
  ),
  -- IN_FULFILMENT → PARTIALLY_DELIVERED: partial delivery received
  (
    'POOL',
    'IN_FULFILMENT',
    'PARTIALLY_DELIVERED',
    ARRAY ['TENANT_ADMIN', 'PLATFORM_ADMIN'],
    false,
    false
  ),
  -- IN_FULFILMENT → DELIVERED: full delivery received directly from fulfilment
  (
    'POOL',
    'IN_FULFILMENT',
    'DELIVERED',
    ARRAY ['TENANT_ADMIN', 'PLATFORM_ADMIN'],
    false,
    false
  ),
  -- PARTIALLY_DELIVERED → DELIVERED: remaining delivery completes
  (
    'POOL',
    'PARTIALLY_DELIVERED',
    'DELIVERED',
    ARRAY ['TENANT_ADMIN', 'PLATFORM_ADMIN'],
    false,
    false
  ),
  -- PARTIALLY_DELIVERED → SETTLEMENT_PENDING: partial delivery accepted; settlement begins
  (
    'POOL',
    'PARTIALLY_DELIVERED',
    'SETTLEMENT_PENDING',
    ARRAY ['TENANT_ADMIN', 'PLATFORM_ADMIN'],
    false,
    false
  ),
  -- DELIVERED → SETTLEMENT_PENDING: delivery confirmed; settlement computation begins
  (
    'POOL',
    'DELIVERED',
    'SETTLEMENT_PENDING',
    ARRAY ['TENANT_ADMIN', 'SYSTEM_AUTOMATION'],
    false,
    false
  ),
  -- SETTLEMENT_PENDING → SETTLED: settlement disbursed (always requires MC)
  (
    'POOL',
    'SETTLEMENT_PENDING',
    'SETTLED',
    ARRAY ['PLATFORM_ADMIN', 'CHECKER'],
    true,
    false
  ),
  -- ── EXIT / CANCELLATION (8) ─────────────────────────────────────────────
  -- DRAFT → CANCELLED: admin cancels pool before opening
  (
    'POOL',
    'DRAFT',
    'CANCELLED',
    ARRAY ['TENANT_ADMIN', 'PLATFORM_ADMIN'],
    false,
    false
  ),
  -- OPEN → CANCELLED: admin cancels pool during registration window
  (
    'POOL',
    'OPEN',
    'CANCELLED',
    ARRAY ['TENANT_ADMIN', 'PLATFORM_ADMIN'],
    false,
    false
  ),
  -- AGGREGATING → WITHDRAWN: pool withdrawn during demand collection
  (
    'POOL',
    'AGGREGATING',
    'WITHDRAWN',
    ARRAY ['TENANT_ADMIN', 'PLATFORM_ADMIN'],
    false,
    false
  ),
  -- CLOSED_FOR_BIDS → WITHDRAWN: pool withdrawn after demand closed but no quote accepted
  (
    'POOL',
    'CLOSED_FOR_BIDS',
    'WITHDRAWN',
    ARRAY ['TENANT_ADMIN', 'PLATFORM_ADMIN'],
    false,
    false
  ),
  -- QUOTED → WITHDRAWN: pool withdrawn after quote received but before acceptance decision
  (
    'POOL',
    'QUOTED',
    'WITHDRAWN',
    ARRAY ['TENANT_ADMIN', 'PLATFORM_ADMIN'],
    false,
    false
  ),
  -- ACCEPTED → CANCELLED: admin force-cancels after acceptance (escalation required)
  (
    'POOL',
    'ACCEPTED',
    'CANCELLED',
    ARRAY ['PLATFORM_ADMIN'],
    false,
    true
  ),
  -- ALLOCATING → CANCELLED: admin force-cancels during allocation (escalation required)
  (
    'POOL',
    'ALLOCATING',
    'CANCELLED',
    ARRAY ['PLATFORM_ADMIN'],
    false,
    true
  ),
  -- ALLOCATED → CANCELLED: admin force-cancels after allocation confirmed (escalation required)
  (
    'POOL',
    'ALLOCATED',
    'CANCELLED',
    ARRAY ['PLATFORM_ADMIN'],
    false,
    true
  ) ON CONFLICT DO NOTHING;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §4  INLINE VERIFICATION
--     Aborts if expected row counts are not present after seeding.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
DECLARE v_state_count INTEGER;
v_trans_count INTEGER;
BEGIN
SELECT COUNT(*) INTO v_state_count
FROM public.lifecycle_states
WHERE entity_type = 'POOL';
SELECT COUNT(*) INTO v_trans_count
FROM public.allowed_transitions
WHERE entity_type = 'POOL';
IF v_state_count < 17 THEN RAISE EXCEPTION 'POOL-LIFECYCLE-SEED VERIFY FAIL: expected 17 lifecycle_states for POOL, found %.',
v_state_count;
END IF;
IF v_trans_count < 24 THEN RAISE EXCEPTION 'POOL-LIFECYCLE-SEED VERIFY FAIL: expected 24 allowed_transitions for POOL, found %.',
v_trans_count;
END IF;
RAISE NOTICE 'POOL-LIFECYCLE-SEED VERIFY PASS: % lifecycle_states and % allowed_transitions seeded for POOL.',
v_state_count,
v_trans_count;
END;
$$;