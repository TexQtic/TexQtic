-- =============================================================================
-- TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SCHEMA-001
-- Migration: nc_pool_rfq_supplier_invite_schema
-- Date:      2026-05-29
-- Summary:   Creates network_pool_rfq_supplier_invites table.
--            Dual RLS anchor: owner_org_id (pool owner / buyer) and
--            supplier_org_id (invited supplier).
--            Status transitions: PENDING → ACCEPTED | DECLINED | CANCELLED.
--            EXPIRED is a lazy-computed read-only state (OD-2); never stored in DB.
--            Decisions locked in:
--              TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DECISION-AUDIT-001
--              commit f8152aa (2026-05-30)
--            Parent design:
--              TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DESIGN-001
--              commit 8a36a2f
-- =============================================================================
-- §1  Pre-flight guard
-- §2  CREATE TABLE network_pool_rfq_supplier_invites
-- §3  Unique constraints
-- §4  Indexes
-- §5  RLS — network_pool_rfq_supplier_invites
-- §6  Grants
-- =============================================================================
-- §1 Pre-flight guard ---------------------------------------------------------
DO $$ BEGIN IF EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'network_pool_rfq_supplier_invites'
) THEN RAISE EXCEPTION 'PREFLIGHT_ABORT: table public.network_pool_rfq_supplier_invites already exists — migration may have been applied already. Halting.';
END IF;
END $$;
-- §2 CREATE TABLE network_pool_rfq_supplier_invites ---------------------------
CREATE TABLE public.network_pool_rfq_supplier_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  -- ── RLS anchors ────────────────────────────────────────────────────────────
  owner_org_id UUID NOT NULL,
  -- pool owner (buyer org); primary RLS anchor
  supplier_org_id UUID NOT NULL,
  -- invited supplier org; secondary RLS anchor
  -- ── Context FKs ────────────────────────────────────────────────────────────
  rfq_id UUID NOT NULL,
  -- FK → network_pool_rfqs(id)   ON DELETE CASCADE
  pool_id UUID NOT NULL,
  -- denormalized FK → network_pools(id)  ON DELETE CASCADE
  -- ── Identity ───────────────────────────────────────────────────────────────
  invite_ref VARCHAR(100) NOT NULL,
  -- service-generated UUID-derived ref; non-empty
  -- ── Status ─────────────────────────────────────────────────────────────────
  -- OD-2: 'EXPIRED' is NOT a valid DB status; lazy expiry computed at service layer
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  -- ── Timing ─────────────────────────────────────────────────────────────────
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  invited_by_user_id UUID,
  -- nullable; actor user (nullable for system-generated invites)
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  -- OD-3: no DB default; service inherits rfq.response_deadline_at when present
  -- ── Reason / context ───────────────────────────────────────────────────────
  message_to_supplier TEXT,
  -- optional owner note included with invite
  decline_reason TEXT,
  -- optional supplier-provided reason (decline only)
  cancel_reason TEXT,
  -- optional owner-provided reason (cancel only)
  -- ── Internal ───────────────────────────────────────────────────────────────
  metadata_internal_json JSONB,
  -- internal ops metadata; NEVER exposed to suppliers
  -- ── Timestamps ─────────────────────────────────────────────────────────────
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- ── Primary key ────────────────────────────────────────────────────────────
  CONSTRAINT nc_pool_rfq_supplier_invites_pkey PRIMARY KEY (id),
  -- ── Foreign keys ───────────────────────────────────────────────────────────
  CONSTRAINT nc_pool_rfq_supplier_invites_owner_org_id_fk FOREIGN KEY (owner_org_id) REFERENCES public.organizations(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT nc_pool_rfq_supplier_invites_supplier_org_id_fk FOREIGN KEY (supplier_org_id) REFERENCES public.organizations(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT nc_pool_rfq_supplier_invites_rfq_id_fk FOREIGN KEY (rfq_id) REFERENCES public.network_pool_rfqs(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT nc_pool_rfq_supplier_invites_pool_id_fk FOREIGN KEY (pool_id) REFERENCES public.network_pools(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  -- ── Check constraints ──────────────────────────────────────────────────────
  -- OD-2: EXPIRED not a valid DB status value — lazy expiry is service-computed
  CONSTRAINT nc_pool_rfq_supplier_invites_status_check CHECK (
    status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED')
  ),
  CONSTRAINT nc_pool_rfq_supplier_invites_invite_ref_nonempty_check CHECK (length(trim(invite_ref)) > 0)
);
-- §3 Unique constraints -------------------------------------------------------
-- OD-1: No re-invite — standard unique constraint (not a partial index)
ALTER TABLE public.network_pool_rfq_supplier_invites
ADD CONSTRAINT nc_pool_rfq_supplier_invites_rfq_supplier_unique UNIQUE (rfq_id, supplier_org_id);
ALTER TABLE public.network_pool_rfq_supplier_invites
ADD CONSTRAINT nc_pool_rfq_supplier_invites_invite_ref_unique UNIQUE (invite_ref);
-- §4 Indexes ------------------------------------------------------------------
-- Primary query patterns: by rfq, by owner, by supplier, by pool, by status
CREATE INDEX idx_nc_pool_rfq_supplier_invites_rfq_id ON public.network_pool_rfq_supplier_invites (rfq_id);
CREATE INDEX idx_nc_pool_rfq_supplier_invites_owner_org_id_created_at ON public.network_pool_rfq_supplier_invites (owner_org_id, created_at DESC);
CREATE INDEX idx_nc_pool_rfq_supplier_invites_supplier_org_id_created_at ON public.network_pool_rfq_supplier_invites (supplier_org_id, created_at DESC);
CREATE INDEX idx_nc_pool_rfq_supplier_invites_pool_id ON public.network_pool_rfq_supplier_invites (pool_id);
CREATE INDEX idx_nc_pool_rfq_supplier_invites_status ON public.network_pool_rfq_supplier_invites (status);
CREATE INDEX idx_nc_pool_rfq_supplier_invites_invited_at ON public.network_pool_rfq_supplier_invites (invited_at DESC);
-- §5 RLS — network_pool_rfq_supplier_invites ----------------------------------
ALTER TABLE public.network_pool_rfq_supplier_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_pool_rfq_supplier_invites FORCE ROW LEVEL SECURITY;
-- Owner: read own invites (primary RLS anchor — owner_org_id)
CREATE POLICY nc_pool_rfq_supplier_invites_owner_select ON public.network_pool_rfq_supplier_invites FOR
SELECT TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND owner_org_id::text = current_setting('app.org_id', true)
  );
-- Owner: insert (create invite)
CREATE POLICY nc_pool_rfq_supplier_invites_owner_insert ON public.network_pool_rfq_supplier_invites FOR
INSERT TO texqtic_app WITH CHECK (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND owner_org_id::text = current_setting('app.org_id', true)
  );
-- Supplier: read own invites (secondary RLS anchor — supplier_org_id)
CREATE POLICY nc_pool_rfq_supplier_invites_supplier_select ON public.network_pool_rfq_supplier_invites FOR
SELECT TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND supplier_org_id::text = current_setting('app.org_id', true)
  );
-- Owner: update (cancel invite — sets status to CANCELLED)
CREATE POLICY nc_pool_rfq_supplier_invites_owner_update ON public.network_pool_rfq_supplier_invites FOR
UPDATE TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND owner_org_id::text = current_setting('app.org_id', true)
  );
-- Supplier: update (accept / decline — sets status to ACCEPTED or DECLINED)
CREATE POLICY nc_pool_rfq_supplier_invites_supplier_update ON public.network_pool_rfq_supplier_invites FOR
UPDATE TO texqtic_app USING (
    NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
    AND supplier_org_id::text = current_setting('app.org_id', true)
  );
-- No delete ever (invites are permanent audit records)
CREATE POLICY nc_pool_rfq_supplier_invites_no_delete ON public.network_pool_rfq_supplier_invites FOR DELETE TO texqtic_app USING (false);
-- Control-plane read-only
CREATE POLICY nc_pool_rfq_supplier_invites_admin_select ON public.network_pool_rfq_supplier_invites FOR
SELECT TO texqtic_admin USING (current_setting('app.is_admin', true) = 'true');
-- §6 Grants -------------------------------------------------------------------
GRANT SELECT,
  INSERT,
  UPDATE ON public.network_pool_rfq_supplier_invites TO texqtic_app;
GRANT SELECT ON public.network_pool_rfq_supplier_invites TO texqtic_admin;