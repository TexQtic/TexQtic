-- ============================================================================
-- TECS-DPP-PASSPORT-FOUNDATION-001 D-2 — DPP View Extensions
-- Unit  : TECS-DPP-VIEWS-EXTENSION-001
-- Date  : 2026-04-28
-- Slice : D-2 — Extend dpp_snapshot_lineage_v1 and dpp_snapshot_certifications_v1
--
-- D-2 fields added:
--   dpp_snapshot_lineage_v1        → transformation_id (from traceability_edges)
--   dpp_snapshot_certifications_v1 → issued_at, lifecycle_state_name
--                                    (lifecycle_state_name = lifecycle_states.state_key via LEFT JOIN)
--
-- Predecessor: 20260316000001_g025_dpp_snapshot_views (views created)
--              20260316000000_g025_node_certifications (node_certifications join table — D-1)
--
-- Strategy   : CREATE OR REPLACE VIEW (idempotent); SECURITY INVOKER preserved
-- Scope      : DDL + grants only. No new tables. No RLS policy changes.
--              dpp_snapshot_products_v1 is NOT modified (no D-2 fields required).
-- ============================================================================
-- S0: PREFLIGHT — assert D-2 source columns exist
-- ============================================================================
DO $d2_preflight$
DECLARE v_edges_xform INTEGER;
v_certs_issued INTEGER;
v_ls_id INTEGER;
v_lin_view INTEGER;
v_cert_view INTEGER;
BEGIN
SELECT COUNT(*) INTO v_edges_xform
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'traceability_edges'
  AND column_name = 'transformation_id';
SELECT COUNT(*) INTO v_certs_issued
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'certifications'
  AND column_name = 'issued_at';
SELECT COUNT(*) INTO v_ls_id
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'lifecycle_states'
  AND column_name = 'id';
SELECT COUNT(*) INTO v_lin_view
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'dpp_snapshot_lineage_v1';
SELECT COUNT(*) INTO v_cert_view
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'dpp_snapshot_certifications_v1';
IF v_edges_xform = 0 THEN RAISE EXCEPTION '[D-2 PREFLIGHT FAIL] traceability_edges.transformation_id not found';
END IF;
IF v_certs_issued = 0 THEN RAISE EXCEPTION '[D-2 PREFLIGHT FAIL] certifications.issued_at not found';
END IF;
IF v_ls_id = 0 THEN RAISE EXCEPTION '[D-2 PREFLIGHT FAIL] lifecycle_states.id not found';
END IF;
IF v_lin_view = 0 THEN RAISE EXCEPTION '[D-2 PREFLIGHT FAIL] dpp_snapshot_lineage_v1 view not found (D-1 predecessor missing)';
END IF;
IF v_cert_view = 0 THEN RAISE EXCEPTION '[D-2 PREFLIGHT FAIL] dpp_snapshot_certifications_v1 view not found (D-1 predecessor missing)';
END IF;
RAISE NOTICE '[D-2 PREFLIGHT] PASS — transformation_id, issued_at, lifecycle_states.id confirmed; base views present';
END;
$d2_preflight$;
-- ============================================================================
-- S1: VIEW 2 (extended) — dpp_snapshot_lineage_v1
--   Adds: transformation_id (from traceability_edges)
--   Anchor row (root node): transformation_id = NULL (no edge at root)
--   Recursive rows: transformation_id from the edge that created the hop
--   All other columns: unchanged from 20260316000001_g025_dpp_snapshot_views
-- ============================================================================
CREATE OR REPLACE VIEW public.dpp_snapshot_lineage_v1 WITH (security_invoker = true) AS WITH RECURSIVE lineage(
    root_node_id,
    node_id,
    parent_node_id,
    depth,
    edge_type,
    org_id,
    created_at,
    transformation_id,
    visited_path
  ) AS (
    -- Anchor: the root node itself — no inbound edge, so transformation_id is NULL
    SELECT n.id AS root_node_id,
      n.id AS node_id,
      NULL::UUID AS parent_node_id,
      0 AS depth,
      NULL::TEXT AS edge_type,
      n.org_id,
      n.created_at,
      NULL::TEXT AS transformation_id,
      ARRAY [n.id] AS visited_path
    FROM public.traceability_nodes n
    UNION ALL
    -- Recursive: each hop follows an outbound edge; carry transformation_id from the edge
    SELECT l.root_node_id,
      e.to_node_id AS node_id,
      e.from_node_id AS parent_node_id,
      l.depth + 1 AS depth,
      e.edge_type,
      l.org_id,
      e.created_at,
      e.transformation_id,
      l.visited_path || e.to_node_id
    FROM lineage l
      JOIN public.traceability_edges e ON e.from_node_id = l.node_id
      AND e.org_id = l.org_id
      JOIN public.traceability_nodes next_node ON next_node.id = e.to_node_id
      AND next_node.org_id = l.org_id
    WHERE next_node.id != ALL(l.visited_path)
      AND l.depth < 20
  )
SELECT root_node_id,
  node_id,
  parent_node_id,
  depth,
  edge_type,
  org_id,
  created_at,
  transformation_id
FROM lineage
ORDER BY root_node_id,
  depth ASC,
  created_at ASC;
-- ============================================================================
-- S2: VIEW 3 (extended) — dpp_snapshot_certifications_v1
--   Adds: issued_at (from certifications)
--         lifecycle_state_name (= lifecycle_states.state_key via LEFT JOIN on lifecycle_state_id)
--   lifecycle_states has RLS: SELECT TO texqtic_app USING (true) — platform-readable
--   All other columns: unchanged from 20260316000001_g025_dpp_snapshot_views
-- ============================================================================
CREATE OR REPLACE VIEW public.dpp_snapshot_certifications_v1 WITH (security_invoker = true) AS
SELECT n.id AS node_id,
  c.id AS certification_id,
  c.certification_type,
  c.lifecycle_state_id,
  c.expires_at AS expiry_date,
  n.org_id,
  ls.state_key AS lifecycle_state_name,
  c.issued_at
FROM public.traceability_nodes n
  LEFT JOIN public.node_certifications nc ON nc.node_id = n.id
  AND nc.org_id = n.org_id
  LEFT JOIN public.certifications c ON c.id = nc.certification_id
  AND c.org_id = n.org_id
  LEFT JOIN public.lifecycle_states ls ON ls.id = c.lifecycle_state_id;
-- ============================================================================
-- S3: GRANTS — re-issue (idempotent; views already granted in G-025)
-- ============================================================================
GRANT SELECT ON public.dpp_snapshot_lineage_v1 TO texqtic_app;
GRANT SELECT ON public.dpp_snapshot_certifications_v1 TO texqtic_app;
-- ============================================================================
-- S4: VERIFIER DO block
-- ============================================================================
DO $d2_verifier$
DECLARE v_lin_col_xform INTEGER;
v_cert_col_issued INTEGER;
v_cert_col_lsname INTEGER;
v_lin_sec BOOLEAN;
v_cert_sec BOOLEAN;
BEGIN -- Check transformation_id column present in lineage view
SELECT COUNT(*) INTO v_lin_col_xform
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'dpp_snapshot_lineage_v1'
  AND column_name = 'transformation_id';
-- Check issued_at column present in certifications view
SELECT COUNT(*) INTO v_cert_col_issued
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'dpp_snapshot_certifications_v1'
  AND column_name = 'issued_at';
-- Check lifecycle_state_name column present in certifications view
SELECT COUNT(*) INTO v_cert_col_lsname
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'dpp_snapshot_certifications_v1'
  AND column_name = 'lifecycle_state_name';
-- Confirm security_invoker still set
SELECT COALESCE(
    reloptions @> ARRAY ['security_invoker=true'::text],
    false
  ) INTO v_lin_sec
FROM pg_class
WHERE relname = 'dpp_snapshot_lineage_v1'
  AND relkind = 'v';
SELECT COALESCE(
    reloptions @> ARRAY ['security_invoker=true'::text],
    false
  ) INTO v_cert_sec
FROM pg_class
WHERE relname = 'dpp_snapshot_certifications_v1'
  AND relkind = 'v';
IF v_lin_col_xform = 0 THEN RAISE EXCEPTION '[D-2 VERIFIER FAIL] dpp_snapshot_lineage_v1.transformation_id column not found';
END IF;
IF v_cert_col_issued = 0 THEN RAISE EXCEPTION '[D-2 VERIFIER FAIL] dpp_snapshot_certifications_v1.issued_at column not found';
END IF;
IF v_cert_col_lsname = 0 THEN RAISE EXCEPTION '[D-2 VERIFIER FAIL] dpp_snapshot_certifications_v1.lifecycle_state_name column not found';
END IF;
IF NOT v_lin_sec THEN RAISE EXCEPTION '[D-2 VERIFIER FAIL] dpp_snapshot_lineage_v1 security_invoker=on not confirmed';
END IF;
IF NOT v_cert_sec THEN RAISE EXCEPTION '[D-2 VERIFIER FAIL] dpp_snapshot_certifications_v1 security_invoker=on not confirmed';
END IF;
RAISE NOTICE '[D-2 VERIFIER] PASS — lineage.transformation_id=%, certifications.issued_at=%, certifications.lifecycle_state_name=%, both security_invoker=on',
v_lin_col_xform,
v_cert_col_issued,
v_cert_col_lsname;
END;
$d2_verifier$;