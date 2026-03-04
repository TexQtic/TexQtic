-- ============================================================================
-- G-025 TECS 4B: DPP Snapshot Views (G-025-DPP-SNAPSHOT-VIEWS-IMPLEMENT-001)
-- Date       : 2026-03-04
-- Doctrine   : v1.4  Strategy: Option A -- Live SQL Views (SECURITY INVOKER)
-- Governance : GOVERNANCE-SYNC-081
-- Design Anchor: G-025-DPP-SNAPSHOT-VIEWS-DESIGN-001
-- Predecessors: TECS 4A (node_certifications) -- GOVERNANCE-SYNC-080
--
-- D4 Gate Result: FAIL
--   organizations has FORCE RLS=t but SELECT policy is admin/bypass-only.
--   No tenant-scoped SELECT arm present.
--   Gap registered: G-025-ORGS-RLS-001
--   ACTION: manufacturer_* columns removed from dpp_snapshot_products_v1.
--           No organizations JOIN in any view.
--
-- Views created (3):
--   1. dpp_snapshot_products_v1        -- node identity (no org JOIN per D4 gate fail)
--   2. dpp_snapshot_lineage_v1         -- recursive forward traversal (depth cap 20)
--   3. dpp_snapshot_certifications_v1  -- node-level certs via node_certifications
--
-- All views: SECURITY INVOKER (RLS inherited from base tables -- FORCE RLS fires)
-- Grants: SELECT TO texqtic_app on all 3 views
-- ============================================================================
BEGIN;

-- ============================================================================
-- S0: PREFLIGHT -- assert required base tables and columns exist
-- ============================================================================
DO $preflight$
DECLARE
  v_nodes_id      INTEGER;
  v_nodes_org     INTEGER;
  v_nodes_batch   INTEGER;
  v_edges_from    INTEGER;
  v_edges_to      INTEGER;
  v_edges_org     INTEGER;
  v_nc_node       INTEGER;
  v_nc_cert       INTEGER;
  v_certs_id      INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_nodes_id    FROM information_schema.columns WHERE table_schema='public' AND table_name='traceability_nodes' AND column_name='id';
  SELECT COUNT(*) INTO v_nodes_org   FROM information_schema.columns WHERE table_schema='public' AND table_name='traceability_nodes' AND column_name='org_id';
  SELECT COUNT(*) INTO v_nodes_batch FROM information_schema.columns WHERE table_schema='public' AND table_name='traceability_nodes' AND column_name='batch_id';
  SELECT COUNT(*) INTO v_edges_from  FROM information_schema.columns WHERE table_schema='public' AND table_name='traceability_edges' AND column_name='from_node_id';
  SELECT COUNT(*) INTO v_edges_to    FROM information_schema.columns WHERE table_schema='public' AND table_name='traceability_edges' AND column_name='to_node_id';
  SELECT COUNT(*) INTO v_edges_org   FROM information_schema.columns WHERE table_schema='public' AND table_name='traceability_edges' AND column_name='org_id';
  SELECT COUNT(*) INTO v_nc_node     FROM information_schema.columns WHERE table_schema='public' AND table_name='node_certifications' AND column_name='node_id';
  SELECT COUNT(*) INTO v_nc_cert     FROM information_schema.columns WHERE table_schema='public' AND table_name='node_certifications' AND column_name='certification_id';
  SELECT COUNT(*) INTO v_certs_id    FROM information_schema.columns WHERE table_schema='public' AND table_name='certifications' AND column_name='id';

  IF v_nodes_id    = 0 THEN RAISE EXCEPTION '[G-025 PREFLIGHT FAIL] traceability_nodes.id not found'; END IF;
  IF v_nodes_org   = 0 THEN RAISE EXCEPTION '[G-025 PREFLIGHT FAIL] traceability_nodes.org_id not found'; END IF;
  IF v_nodes_batch = 0 THEN RAISE EXCEPTION '[G-025 PREFLIGHT FAIL] traceability_nodes.batch_id not found'; END IF;
  IF v_edges_from  = 0 THEN RAISE EXCEPTION '[G-025 PREFLIGHT FAIL] traceability_edges.from_node_id not found'; END IF;
  IF v_edges_to    = 0 THEN RAISE EXCEPTION '[G-025 PREFLIGHT FAIL] traceability_edges.to_node_id not found'; END IF;
  IF v_edges_org   = 0 THEN RAISE EXCEPTION '[G-025 PREFLIGHT FAIL] traceability_edges.org_id not found'; END IF;
  IF v_nc_node     = 0 THEN RAISE EXCEPTION '[G-025 PREFLIGHT FAIL] node_certifications.node_id not found -- TECS 4A prerequisite'; END IF;
  IF v_nc_cert     = 0 THEN RAISE EXCEPTION '[G-025 PREFLIGHT FAIL] node_certifications.certification_id not found -- TECS 4A prerequisite'; END IF;
  IF v_certs_id    = 0 THEN RAISE EXCEPTION '[G-025 PREFLIGHT FAIL] certifications.id not found'; END IF;

  RAISE NOTICE '[G-025 PREFLIGHT] PASS -- all required base columns confirmed (traceability_nodes, traceability_edges, node_certifications, certifications)';
END;
$preflight$;

-- ============================================================================
-- S1: D4 GATE RECORDED -- organizations RLS incompatible with tenant views
-- ============================================================================
DO $d4gate$
DECLARE
  v_sel_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_sel_count
    FROM pg_policies
   WHERE tablename = 'organizations'
     AND cmd = 'SELECT';
  RAISE NOTICE '[G-025 D4 GATE] FAIL: organizations.SELECT policies found=%, but none are tenant-scoped (org_id predicate absent). Gap G-025-ORGS-RLS-001 registered. Views proceed without organizations JOIN.', v_sel_count;
END;
$d4gate$;

-- ============================================================================
-- S2: VIEW 1 -- dpp_snapshot_products_v1
--   Node identity view -- no organizations JOIN (D4 gate FAIL)
--   SECURITY INVOKER: RLS on traceability_nodes fires automatically
-- ============================================================================
CREATE OR REPLACE VIEW public.dpp_snapshot_products_v1
WITH (security_invoker = true)
AS
SELECT
  n.id          AS node_id,
  n.org_id,
  n.batch_id,
  n.node_type,
  n.meta,
  n.geo_hash,
  n.visibility,
  n.created_at,
  n.updated_at
FROM public.traceability_nodes n;

-- ============================================================================
-- S3: VIEW 2 -- dpp_snapshot_lineage_v1
--   Recursive CTE forward traversal (depth cap 20, cycle guard via visited_path)
--   SECURITY INVOKER: RLS on traceability_nodes + traceability_edges fires
--   Caller filters by: WHERE root_node_id = '<uuid>'
-- ============================================================================
CREATE OR REPLACE VIEW public.dpp_snapshot_lineage_v1
WITH (security_invoker = true)
AS
WITH RECURSIVE lineage(
  root_node_id,
  node_id,
  parent_node_id,
  depth,
  edge_type,
  org_id,
  created_at,
  visited_path
) AS (
  SELECT
    n.id          AS root_node_id,
    n.id          AS node_id,
    NULL::UUID    AS parent_node_id,
    0             AS depth,
    NULL::TEXT    AS edge_type,
    n.org_id,
    n.created_at,
    ARRAY[n.id]   AS visited_path
  FROM public.traceability_nodes n

  UNION ALL

  SELECT
    l.root_node_id,
    e.to_node_id  AS node_id,
    e.from_node_id AS parent_node_id,
    l.depth + 1   AS depth,
    e.edge_type,
    l.org_id,
    e.created_at,
    l.visited_path || e.to_node_id
  FROM lineage l
  JOIN public.traceability_edges e
       ON  e.from_node_id = l.node_id
       AND e.org_id       = l.org_id
  JOIN public.traceability_nodes next_node
       ON  next_node.id     = e.to_node_id
       AND next_node.org_id = l.org_id
  WHERE next_node.id != ALL(l.visited_path)
    AND l.depth < 20
)
SELECT
  root_node_id,
  node_id,
  parent_node_id,
  depth,
  edge_type,
  org_id,
  created_at
FROM lineage
ORDER BY root_node_id, depth ASC, created_at ASC;

-- ============================================================================
-- S4: VIEW 3 -- dpp_snapshot_certifications_v1
--   Node-cert join via node_certifications (TECS 4A prerequisite)
--   LEFT JOIN: nodes without certifications still appear (NULL cert columns)
--   SECURITY INVOKER: RLS on all base tables fires automatically
-- ============================================================================
CREATE OR REPLACE VIEW public.dpp_snapshot_certifications_v1
WITH (security_invoker = true)
AS
SELECT
  n.id                    AS node_id,
  c.id                    AS certification_id,
  c.certification_type,
  c.lifecycle_state_id,
  c.expires_at            AS expiry_date,
  n.org_id
FROM public.traceability_nodes n
LEFT JOIN public.node_certifications nc
       ON  nc.node_id = n.id
       AND nc.org_id  = n.org_id
LEFT JOIN public.certifications c
       ON  c.id     = nc.certification_id
       AND c.org_id = n.org_id;

-- ============================================================================
-- S5: GRANTS
-- ============================================================================
GRANT SELECT ON public.dpp_snapshot_products_v1        TO texqtic_app;
GRANT SELECT ON public.dpp_snapshot_lineage_v1         TO texqtic_app;
GRANT SELECT ON public.dpp_snapshot_certifications_v1  TO texqtic_app;

-- ============================================================================
-- S6: VERIFIER DO block
-- ============================================================================
DO $verifier$
DECLARE
  v_prod_count  INTEGER;
  v_lin_count   INTEGER;
  v_cert_count  INTEGER;
  v_prod_sec    BOOLEAN;
  v_lin_sec     BOOLEAN;
  v_cert_sec    BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO v_prod_count  FROM information_schema.views WHERE table_schema='public' AND table_name='dpp_snapshot_products_v1';
  SELECT COUNT(*) INTO v_lin_count   FROM information_schema.views WHERE table_schema='public' AND table_name='dpp_snapshot_lineage_v1';
  SELECT COUNT(*) INTO v_cert_count  FROM information_schema.views WHERE table_schema='public' AND table_name='dpp_snapshot_certifications_v1';

  IF v_prod_count  = 0 THEN RAISE EXCEPTION '[G-025 VERIFIER FAIL] dpp_snapshot_products_v1 not found in information_schema.views'; END IF;
  IF v_lin_count   = 0 THEN RAISE EXCEPTION '[G-025 VERIFIER FAIL] dpp_snapshot_lineage_v1 not found in information_schema.views'; END IF;
  IF v_cert_count  = 0 THEN RAISE EXCEPTION '[G-025 VERIFIER FAIL] dpp_snapshot_certifications_v1 not found in information_schema.views'; END IF;

  SELECT COALESCE(reloptions @> ARRAY['security_invoker=true'::text], false) INTO v_prod_sec  FROM pg_class WHERE relname='dpp_snapshot_products_v1'       AND relkind='v';
  SELECT COALESCE(reloptions @> ARRAY['security_invoker=true'::text], false) INTO v_lin_sec   FROM pg_class WHERE relname='dpp_snapshot_lineage_v1'         AND relkind='v';
  SELECT COALESCE(reloptions @> ARRAY['security_invoker=true'::text], false) INTO v_cert_sec  FROM pg_class WHERE relname='dpp_snapshot_certifications_v1'  AND relkind='v';

  IF NOT v_prod_sec  THEN RAISE EXCEPTION '[G-025 VERIFIER FAIL] dpp_snapshot_products_v1 security_invoker=on not confirmed in pg_class.reloptions'; END IF;
  IF NOT v_lin_sec   THEN RAISE EXCEPTION '[G-025 VERIFIER FAIL] dpp_snapshot_lineage_v1 security_invoker=on not confirmed in pg_class.reloptions'; END IF;
  IF NOT v_cert_sec  THEN RAISE EXCEPTION '[G-025 VERIFIER FAIL] dpp_snapshot_certifications_v1 security_invoker=on not confirmed in pg_class.reloptions'; END IF;

  RAISE NOTICE '[G-025] VERIFIER PASS: DPP snapshot views created -- products=%, lineage=%, certifications=%, all security_invoker=on', v_prod_count, v_lin_count, v_cert_count;
END;
$verifier$;

COMMIT;