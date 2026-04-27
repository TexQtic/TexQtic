BEGIN;
-- ─────────────────────────────────────────────────────────────────────────────
-- TECS-DPP-PASSPORT-IDENTITY-001 D-3 — dpp_passport_states table
--
-- Storage decision: Option B — separate dpp_passport_states table.
-- Reason: avoids mutating traceability_nodes core semantics; preserves existing
--   DPP snapshot views; supports audit/history in future slices; keeps passport
--   workflow separate from raw traceability node identity.
--
-- Prerequisites: D-1 (node_certifications), D-2 (view extensions) must be applied.
-- ─────────────────────────────────────────────────────────────────────────────
-- S0: PREFLIGHT — verify required dependencies exist
DO $d3_preflight$ BEGIN -- traceability_nodes table
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'traceability_nodes'
) THEN RAISE EXCEPTION 'D3 PREFLIGHT FAIL: traceability_nodes table not found';
END IF;
-- organizations table
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'organizations'
) THEN RAISE EXCEPTION 'D3 PREFLIGHT FAIL: organizations table not found';
END IF;
-- D-2 prerequisite: dpp_snapshot_certifications_v1 with lifecycle_state_name
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND table_name = 'dpp_snapshot_certifications_v1'
) THEN RAISE EXCEPTION 'D3 PREFLIGHT FAIL: dpp_snapshot_certifications_v1 not found — D-2 must be applied first';
END IF;
-- D-2 prerequisite: lineage view extended
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND table_name = 'dpp_snapshot_lineage_v1'
) THEN RAISE EXCEPTION 'D3 PREFLIGHT FAIL: dpp_snapshot_lineage_v1 not found — D-2 must be applied first';
END IF;
END $d3_preflight$;
-- S1: CREATE TABLE dpp_passport_states
-- One row per (org_id, node_id) — represents passport lifecycle status for a node.
-- Default status = 'DRAFT' (row may not exist; application layer defaults to DRAFT if missing).
CREATE TABLE IF NOT EXISTS public.dpp_passport_states (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  node_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by_user_id UUID,
  CONSTRAINT dpp_passport_states_pkey PRIMARY KEY (id),
  CONSTRAINT dpp_passport_states_org_node_unique UNIQUE (org_id, node_id),
  CONSTRAINT dpp_passport_states_status_check CHECK (
    status IN ('DRAFT', 'INTERNAL', 'TRADE_READY', 'PUBLISHED')
  ),
  CONSTRAINT dpp_passport_states_org_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON UPDATE NO ACTION ON DELETE RESTRICT,
  CONSTRAINT dpp_passport_states_node_id_fk FOREIGN KEY (node_id) REFERENCES public.traceability_nodes(id) ON UPDATE NO ACTION ON DELETE RESTRICT
);
-- S2: updated_at trigger
CREATE OR REPLACE FUNCTION public.trg_dpp_passport_states_set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_dpp_passport_states_set_updated_at ON public.dpp_passport_states;
CREATE TRIGGER trg_dpp_passport_states_set_updated_at BEFORE
UPDATE ON public.dpp_passport_states FOR EACH ROW EXECUTE FUNCTION public.trg_dpp_passport_states_set_updated_at();
-- S3: Index for org_id + node_id lookups
CREATE INDEX IF NOT EXISTS idx_dpp_passport_states_org_node ON public.dpp_passport_states (org_id, node_id);
-- S4: RLS — ENABLE + FORCE (tenant isolation; org_id-scoped)
ALTER TABLE public.dpp_passport_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dpp_passport_states FORCE ROW LEVEL SECURITY;
-- Restrictive guard (fail-closed) — blocks all access unless app.current_org_id matches
CREATE POLICY dpp_passport_states_restrictive ON public.dpp_passport_states AS RESTRICTIVE TO texqtic_app USING (
  org_id = current_setting('app.current_org_id')::uuid
);
-- Tenant SELECT policy — permits reads scoped to current org
CREATE POLICY dpp_passport_states_select ON public.dpp_passport_states FOR
SELECT TO texqtic_app USING (
    org_id = current_setting('app.current_org_id')::uuid
  );
-- S5: GRANT SELECT to texqtic_app (read-only in D-3; status mutation is D-3+ future)
GRANT SELECT ON public.dpp_passport_states TO texqtic_app;
-- S6: VERIFIER — assert all expected objects exist after DDL
DO $d3_verifier$ BEGIN -- Table exists
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'dpp_passport_states'
) THEN RAISE EXCEPTION 'D3 VERIFIER FAIL: dpp_passport_states table not found';
END IF;
-- status column exists
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'dpp_passport_states'
    AND column_name = 'status'
) THEN RAISE EXCEPTION 'D3 VERIFIER FAIL: dpp_passport_states.status not found';
END IF;
-- reviewed_at column exists (nullable)
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'dpp_passport_states'
    AND column_name = 'reviewed_at'
) THEN RAISE EXCEPTION 'D3 VERIFIER FAIL: dpp_passport_states.reviewed_at not found';
END IF;
-- reviewed_by_user_id column exists (nullable)
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'dpp_passport_states'
    AND column_name = 'reviewed_by_user_id'
) THEN RAISE EXCEPTION 'D3 VERIFIER FAIL: dpp_passport_states.reviewed_by_user_id not found';
END IF;
-- Restrictive RLS policy exists
IF NOT EXISTS (
  SELECT 1
  FROM pg_policies
  WHERE tablename = 'dpp_passport_states'
    AND policyname = 'dpp_passport_states_restrictive'
) THEN RAISE EXCEPTION 'D3 VERIFIER FAIL: dpp_passport_states_restrictive policy not found';
END IF;
-- SELECT RLS policy exists
IF NOT EXISTS (
  SELECT 1
  FROM pg_policies
  WHERE tablename = 'dpp_passport_states'
    AND policyname = 'dpp_passport_states_select'
) THEN RAISE EXCEPTION 'D3 VERIFIER FAIL: dpp_passport_states_select policy not found';
END IF;
END $d3_verifier$;
COMMIT;