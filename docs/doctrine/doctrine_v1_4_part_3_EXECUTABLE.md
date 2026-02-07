# doctrine_v1_4_part_3_EXECUTABLE

> ⚠️ EXECUTABLE DOCTRINE — ENGINEERING MUST IMPLEMENT EXACTLY AS WRITTEN

# **Ticket — Transformation → Traceability Graph Projection (Automatic, Deterministic, Event-Driven)**

## **Goal**

Eliminate manual edge creation by making the graph a **projection of transformation truth**:

- When a transformation is recorded/finalized:
  - ensure each input/output batch has a `traceability_node`

  - create `traceability_edges` from each input node → each output node

  - enforce “no cycles” and monotonic visibility rules

- Lineage and DPP exports should become reliable because the graph is derived from the accounting ledger.

This enforces v1.4: **Event-first, state-derived** and prevents “Supply Chain Ghosts.”

---

## **Deliverables**

1. Canonical mapping rule (1:1)

- `traceability_nodes.batch_id` \= `material_batches.id` (unique)

2. DB constraints:

- Unique node per batch (`traceability_nodes.batch_id unique`)

3. Projection function:

- `public.project_transformation_to_graph(transformation_id uuid)`

4. Trigger path:

- On `finalize_transformation()` success → call projection

5. Idempotency:

- avoid duplicating edges on retries

6. Tests:

- transform creates edges

- split creates correct fan-out edges

- merge creates correct fan-in edges

- projection is idempotent

- cycle prevention works

---

# **A) 1:1 Mapping (Batch ↔ Node)**

## **Add `batch_id` to `traceability_nodes` and enforce uniqueness**

File: `supabase/migrations/140_node_batch_mapping.sql`

`alter table public.traceability_nodes`  
`add column if not exists batch_id uuid unique references public.material_batches(id);`

`-- If you already have batch_id, ensure uniqueness:`  
`do $$ begin`  
 `create unique index trace_nodes_batch_id_uidx on public.traceability_nodes(batch_id);`  
`exception when duplicate_table then null; end $$;`

### **Contract**

- Every material batch that participates in lineage **must** have a node:
  - node id may be separate from batch id, but `batch_id` is the join key.

- Prefer setting node.id \== batch.id for simplicity (optional).

---

# **B) Graph Edge Idempotency Constraint**

To prevent duplicates across retries, enforce a unique edge identity.

File: `supabase/migrations/141_edge_idempotency.sql`

`-- Add optional transformation_id to edges for traceability provenance`  
`alter table public.traceability_edges`  
`add column if not exists transformation_id uuid references public.batch_transformations(id);`

`-- Unique edge per (from,to,transformation)`  
`do $$ begin`  
 `create unique index trace_edges_unique_projection`  
 `on public.traceability_edges(from_node_id, to_node_id, transformation_id);`  
`exception when duplicate_table then null; end $$;`

---

# **C) Projection Function (DB, Deterministic)**

## **`project_transformation_to_graph(transformation_id)`**

This function:

1. Loads transformation inputs/outputs (batch ids)

2. Upserts nodes for all involved batches

3. Creates edges from each input→output with transformation_id

4. Checks cycles (quick check) and aborts if would create cycle

File: `supabase/migrations/142_project_transformation_to_graph.sql`

`create or replace function public.ensure_node_for_batch(p_batch_id uuid)`  
`returns uuid`  
`language plpgsql`  
`security definer`  
`as $$`  
`declare`  
 `v_node_id uuid;`  
 `v_org uuid;`  
`begin`  
 `select org_id into v_org from public.material_batches where id = p_batch_id;`  
 `if v_org is null then`  
 `raise exception 'Batch not found: %', p_batch_id;`  
 `end if;`

`select id into v_node_id`  
 `from public.traceability_nodes`  
 `where batch_id = p_batch_id;`

`if v_node_id is not null then`  
 `return v_node_id;`  
 `end if;`

`-- Create node (default anonymous; org-scoped)`  
 `insert into public.traceability_nodes (org_id, batch_id, node_type, geo_hash, version_id, visibility)`  
 `values (v_org, p_batch_id, 'batch', null, 1, 'anonymous')`  
 `returning id into v_node_id;`

`return v_node_id;`  
`end;`  
`$$;`

`create or replace function public.would_create_cycle(p_from uuid, p_to uuid)`  
`returns boolean`  
`language sql`  
`stable`  
`as $$`  
 `-- if there is already a path from p_to back to p_from, then adding p_from->p_to creates a cycle`  
 `with recursive r as (`  
 `select e.from_node_id, e.to_node_id`  
 `from public.traceability_edges e`  
 `where e.from_node_id = p_to`

    `union all`
    `select e2.from_node_id, e2.to_node_id`
    `from public.traceability_edges e2`
    `join r on r.to_node_id = e2.from_node_id`

`)`  
 `select exists (select 1 from r where r.to_node_id = p_from)`  
`$$;`

`create or replace function public.project_transformation_to_graph(p_transformation_id uuid)`  
`returns void`  
`language plpgsql`  
`security definer`  
`as $$`  
`declare`  
 `in_rec record;`  
 `out_rec record;`  
 `v_from uuid;`  
 `v_to uuid;`  
`begin`  
 `-- Ensure transformation exists & finalized (projection only after finalize)`  
 `if not exists (`  
 `select 1 from public.batch_transformations`  
 `where id = p_transformation_id and finalized_at is not null`  
 `) then`  
 `raise exception 'Transformation not finalized or not found';`  
 `end if;`

`-- For each input x output, create edge`  
 `for in_rec in`  
 `select batch_id from public.batch_transformation_inputs where transformation_id = p_transformation_id`  
 `loop`  
 `v_from := public.ensure_node_for_batch(in_rec.batch_id);`

    `for out_rec in`
      `select batch_id from public.batch_transformation_outputs where transformation_id = p_transformation_id`
    `loop`
      `v_to := public.ensure_node_for_batch(out_rec.batch_id);`

      `-- Cycle prevention`
      `if public.would_create_cycle(v_from, v_to) then`
        `raise exception 'Cycle detected: edge % -> % would create cycle', v_from, v_to;`
      `end if;`

      `insert into public.traceability_edges (from_node_id, to_node_id, material_type, effective_at, transformation_id)`
      `values (v_from, v_to, null, now(), p_transformation_id)`
      `on conflict (from_node_id, to_node_id, transformation_id) do nothing;`
    `end loop;`

`end loop;`

`return;`  
`end;`  
`$$;`

`revoke all on function public.ensure_node_for_batch(uuid) from authenticated;`  
`revoke all on function public.project_transformation_to_graph(uuid) from authenticated;`

---

# **D) Hook Projection into Finalize Path**

Modify `finalize_transformation()` to call projection at the end:

File: `supabase/migrations/143_finalize_calls_projection.sql`

Add before `return;`:

`perform public.project_transformation_to_graph(p_transformation_id);`

This ensures:

- transformation writes happen

- material availability is consumed

- graph edges are projected only when finalized

---

# **E) Update Lineage \+ DPP to Prefer Projection Truth**

Now lineage walks `traceability_edges`, which are guaranteed to exist after finalize.  
 DPP export becomes more reliable (no manual edges).

Optional enhancement:

- `dpp_product_passport` can now use `material_batches` join to include quantity/unit and transformation summaries.

---

# **F) Tests**

## **Test 1 — Simple transform creates edges**

- input A → output B

- finalize → graph has edge node(A)→node(B) with transformation_id

## **Test 2 — Split creates fan-out**

- input A → outputs B,C

- edges: A→B and A→C

## **Test 3 — Merge creates fan-in**

- inputs A,B → output C

- edges: A→C and B→C

## **Test 4 — Idempotent projection**

- call `project_transformation_to_graph` twice

- edge count unchanged (unique constraint)

## **Test 5 — Cycle prevention**

- create edges B→A existing path

- attempt projection A→B should fail

---

# **Acceptance Criteria**

- Every finalized transformation yields corresponding traceability edges

- Nodes auto-created per batch (1:1 mapping enforced)

- Projection is idempotent and cycle-safe

- Lineage \+ DPP reflect transformation truth with no manual graph maintenance

- Tests cover transform, split, merge, idempotency, cycle prevention

---

## **Next logical task (only one)**

**Next: “DPP Export v2 (Transformation-Aware)”** — extend DPP export to include transformation history (inputs/outputs, yields, timestamps) and attach validity status from lineage report (`is_valid`, missing links, cycles) so regulators and buyers see “proof \+ verdict” together.

# **Ticket — DPP Export v2 (Transformation-Aware “Proof \+ Verdict”)**

## **Goal**

Upgrade DPP export so it becomes a regulator/buyer-ready artifact that contains:

1. **Proof**: transformation history (inputs/outputs, yields, timestamps, sites)

2. **Verdict**: lineage validity status from `get_upstream_lineage()`:
   - `is_valid`

   - `missing_links`

   - `has_cycle`

   - depth \+ counts

This delivers a single payload: **DPP \+ Traceability \+ Validity**.

---

## **Deliverables**

1. SQL view: `public.dpp_product_passport_v2`

2. SQL view: `public.dpp_product_passport_v2_regulator` (gated)

3. SQL view: `public.dpp_product_passport_v2_buyer` (privacy-filtered)

4. Edge: `regulator_fetch_batch` returns v2 instead of v1

5. Next pages:

- `/regulator/batch/[id]` shows v2 proof+verdict

- Buyer view (later): `/marketplace/batch/[id]` shows filtered proof+verdict

6. Tests:

- v2 includes transformations \+ verdict

- invalid lineage shows invalid verdict \+ reasons

- gating works

---

# **A) DPP v2 Structure (what it returns)**

For a `batch_id`, DPP v2 returns:

- `batch`: id, org_id, material_type, unit, quantity_total

- `active_certifications`: list

- `supply_chain_lineage`: (optional) edges summary or omit because lineage report includes edges

- `transformations`: ordered list (occurred_at asc)
  - transformation_id, type, occurred_at, site_id, yield_factor

  - inputs: \[{batch_id, qty, unit}\]

  - outputs: \[{batch_id, qty, unit}\]

- `verdict`: lineage report subset:
  - is_valid, has_cycle, missing_links, node_count, edge_count, max_depth

---

# **B) SQL — DPP v2 View (Core)**

File: `supabase/migrations/150_dpp_v2.sql`

`create or replace view public.dpp_product_passport_v2 as`  
`select`  
 `mb.id as batch_id,`  
 `mb.org_id,`  
 `mb.material_type,`  
 `mb.unit,`  
 `mb.quantity_total,`  
 `mb.effective_at,`

`-- Certifications (verified only)`  
 `coalesce((`  
 `select jsonb_agg(distinct c.cert_type)`  
 `from public.certifications c`  
 `where c.org_id = mb.org_id and c.status = 'verified'`  
 `), '[]'::jsonb) as active_certifications,`

`-- Transformation history that produced or consumed this batch:`  
 `-- include transformations where batch appears in inputs OR outputs`  
 `coalesce((`  
 `select jsonb_agg(t_row order by (t_row->>'occurred_at')::timestamptz asc)`  
 `from (`  
 `select jsonb_build_object(`  
 `'transformation_id', t.id::text,`  
 `'transformation_type', t.transformation_type::text,`  
 `'occurred_at', t.occurred_at,`  
 `'site_id', case when t.site_id is null then null else t.site_id::text end,`  
 `'trade_id', case when t.trade_id is null then null else t.trade_id::text end,`  
 `'yield_factor', t.yield_factor,`  
 `'inputs', coalesce((`  
 `select jsonb_agg(jsonb_build_object(`  
 `'batch_id', i.batch_id::text,`  
 `'unit', i.unit::text,`  
 `'quantity', i.quantity`  
 `))`  
 `from public.batch_transformation_inputs i`  
 `where i.transformation_id = t.id`  
 `), '[]'::jsonb),`  
 `'outputs', coalesce((`  
 `select jsonb_agg(jsonb_build_object(`  
 `'batch_id', o.batch_id::text,`  
 `'unit', o.unit::text,`  
 `'quantity', o.quantity`  
 `))`  
 `from public.batch_transformation_outputs o`  
 `where o.transformation_id = t.id`  
 `), '[]'::jsonb)`  
 `) as t_row`  
 `from public.batch_transformations t`  
 `where exists (`  
 `select 1 from public.batch_transformation_inputs i`  
 `where i.transformation_id = t.id and i.batch_id = mb.id`  
 `)`  
 `or exists (`  
 `select 1 from public.batch_transformation_outputs o`  
 `where o.transformation_id = t.id and o.batch_id = mb.id`  
 `)`  
 `) s`  
 `), '[]'::jsonb) as transformations,`

`-- Verdict (lineage report)`  
 `public.get_upstream_lineage(mb.id, 25) as lineage_report,`

`-- Convenience extracted verdict fields (for UI filters)`  
 `(public.get_upstream_lineage(mb.id, 25)->>'is_valid')::boolean as is_valid,`  
 `(public.get_upstream_lineage(mb.id, 25)->>'has_cycle')::boolean as has_cycle,`  
 `(public.get_upstream_lineage(mb.id, 25)->'missing_links') as missing_links`

`from public.material_batches mb;`

### **Performance note (important)**

This calls `get_upstream_lineage()` **3 times** per row. Fix by using a lateral join.

Preferred optimized version:

`create or replace view public.dpp_product_passport_v2 as`  
`select`  
 `mb.id as batch_id,`  
 `mb.org_id,`  
 `mb.material_type,`  
 `mb.unit,`  
 `mb.quantity_total,`  
 `mb.effective_at,`  
 `...,`  
 `lr.report as lineage_report,`  
 `(lr.report->>'is_valid')::boolean as is_valid,`  
 `(lr.report->>'has_cycle')::boolean as has_cycle,`  
 `(lr.report->'missing_links') as missing_links`  
`from public.material_batches mb`  
`cross join lateral (`  
 `select public.get_upstream_lineage(mb.id, 25) as report`  
`) lr;`

(Engineering should implement the lateral join version.)

---

# **C) Regulator-Gated and Buyer-Filtered Views**

## **1\) Regulator view (gated)**

File: `supabase/migrations/151_dpp_v2_regulator.sql`

`create or replace view public.dpp_product_passport_v2_regulator as`  
`select v2.*`  
`from public.dpp_product_passport_v2 v2`  
`join public.regulator_allowed_batches g on g.batch_id = v2.batch_id`  
`where g.regulator_can_view = true;`

## **2\) Buyer view (privacy-filtered)**

Principle: buyers can see **verdict** \+ **high-level lineage**, but not expose shielded nodes.

Fastest v1 buyer filter:

- show `transformations` but **redact batch_ids not owned by supplier or not public**

- or show only `transformation_type`, `occurred_at`, `yield_factor`, and counts

File: `supabase/migrations/152_dpp_v2_buyer.sql`

`create or replace view public.dpp_product_passport_v2_buyer as`  
`select`  
 `v2.batch_id,`  
 `v2.org_id,`  
 `v2.material_type,`  
 `v2.unit,`  
 `v2.quantity_total,`  
 `v2.effective_at,`  
 `v2.active_certifications,`  
 `-- Redact transformations to high-level summaries (no upstream batch IDs)`  
 `coalesce((`  
 `select jsonb_agg(jsonb_build_object(`  
 `'transformation_id', t->>'transformation_id',`  
 `'transformation_type', t->>'transformation_type',`  
 `'occurred_at', t->>'occurred_at',`  
 `'yield_factor', t->'yield_factor',`  
 `'input_count', jsonb_array_length(coalesce(t->'inputs','[]'::jsonb)),`  
 `'output_count', jsonb_array_length(coalesce(t->'outputs','[]'::jsonb))`  
 `) order by (t->>'occurred_at')::timestamptz asc)`  
 `from jsonb_array_elements(v2.transformations) t`  
 `), '[]'::jsonb) as transformations_summary,`  
 `-- Verdict always visible`  
 `jsonb_build_object(`  
 `'is_valid', v2.is_valid,`  
 `'has_cycle', v2.has_cycle,`  
 `'missing_links', v2.missing_links,`  
 `'node_count', (v2.lineage_report->>'node_count')::int,`  
 `'edge_count', (v2.lineage_report->>'edge_count')::int`  
 `) as verdict`  
`from public.dpp_product_passport_v2 v2;`

---

# **D) Edge \+ UI Updates**

## **1\) Update `regulator_fetch_batch`**

Replace v1 query with:

- `from("dpp_product_passport_v2_regulator").select("*").eq("batch_id", batchId).maybeSingle()`

Return `{ passportV2: row }`.

## **2\) Regulator UI**

Show:

- Valid / Invalid banner (green/red)

- Missing links list (node_id \+ reason)

- Transformations timeline (type, occurred_at, inputs/outputs, yields)

---

# **E) Tests**

## **Test 1 — v2 includes proof \+ verdict**

- create transformation chain \+ projected edges

- fetch v2

- assert transformations array non-empty

- assert lineage_report.is_valid boolean exists

## **Test 2 — invalid verdict propagates**

- break provenance (remove upstream edge or missing parent)

- v2 shows `is_valid=false` and missing_links populated

## **Test 3 — regulator gating**

- batch not allowed → regulator view returns none / 404 in Edge

## **Test 4 — buyer filter does not leak upstream IDs**

- verify `transformations_summary` contains no input/output batch IDs

---

# **Acceptance Criteria**

- DPP v2 produces “proof \+ verdict” in one payload

- Transformations included and ordered

- Verdict fields included and match lineage report

- Regulator gating works; buyer filter does not leak upstream identifiers

- Edge \+ UI display v2 cleanly

- Tests pass

---

## **Next logical task (only one)**

**Next: “Certification Binding to Transformations”** — link `CERTIFICATION_VERIFIED` and `TC_ISSUED` events to specific batches/transformations so DPP can prove not only chain-of-custody, but also **certificate coverage** across the chain (no “cert orphaning”).

# **Ticket — Certification Binding to Transformations (No “Cert Orphaning”, Coverage Proof in DPP)**

## **Goal**

Make certifications and transaction certificates (TCs) _structurally attached_ to the batches/transformations they claim to cover, so DPP can prove:

- Which certs apply to which **batch**

- Which certs cover which **transformation step**

- Which TCs (chain-of-custody documents) cover which **movement/transfer**

- Coverage gaps are detectable: “cert orphaning” becomes impossible

This upgrades “Verified Certification Event” into enforceable data integrity.

---

## **Deliverables**

1. Canonical binding tables:

- `certificates` (already exists) \+ `certificate_scopes`

- `transaction_certificates` (TCs) \+ `tc_scopes`

2. Event types \+ schemas:

- `CERTIFICATION_VERIFIED` (already) → payload includes scope bindings

- `TC_ISSUED` → payload includes scope bindings

- `CERTIFICATE_SCOPE_BOUND`

- `TC_SCOPE_BOUND`

- `CERTIFICATE_COVERAGE_EVALUATED` (computed verdict for DPP)

3. Enforcement:

- DB constraints ensuring:
  - scope references valid batch/transformation ids

  - cert issuer validity window

  - no “floating” TCs/certs without at least one scope

4. DPP v3 addition:

- `certificate_coverage` summary (covered/uncovered steps)

5. Tests:

- cert verified must bind to at least one batch or transformation

- TC issued must bind to at least one batch/transformation/trade

- coverage gaps show in DPP

---

# **A) Data Model — Scopes (SQL)**

## **1\) Certificate scopes**

File: `supabase/migrations/160_certificate_scopes.sql`

`do $$ begin`  
 `create type public.scope_subject_type as enum ('org','batch','transformation','trade');`  
`exception when duplicate_object then null; end $$;`

`create table if not exists public.certificate_scopes (`  
 `id uuid primary key default gen_random_uuid(),`  
 `certificate_id uuid not null references public.certifications(id) on delete cascade,`  
 `subject_type public.scope_subject_type not null,`  
 `subject_id uuid not null,`  
 `coverage_start timestamptz null,`  
 `coverage_end timestamptz null,`  
 `created_at timestamptz not null default now(),`

`-- avoid duplicates`  
 `unique (certificate_id, subject_type, subject_id)`  
`);`

`-- Guard: certificate scopes must reference existing objects`  
`-- Use deferred checks via triggers because subject_id can point to multiple tables.`

`alter table public.certificate_scopes enable row level security;`  
`-- Read: org-scoped (same as certifications)`  
`create policy "cert_scopes_read_own_org"`  
`on public.certificate_scopes for select`  
`to authenticated`  
`using (`  
 `exists (`  
 `select 1 from public.certifications c`  
 `where c.id = certificate_id`  
 `and c.org_id = (auth.jwt() ->> 'org_id')::uuid`  
 `)`  
`);`

`revoke insert, update, delete on public.certificate_scopes from authenticated;`  
`-- Writes by service role / certifier workflow.`

## **2\) Transaction Certificates (TCs) \+ scopes**

File: `supabase/migrations/161_transaction_certificates.sql`

`create table if not exists public.transaction_certificates (`  
 `id uuid primary key default gen_random_uuid(),`  
 `org_id uuid not null references public.organizations(id),`  
 `tc_number text not null,`  
 `issuer_org_id uuid null references public.organizations(id),`  
 `issued_at timestamptz not null,`  
 `valid_to timestamptz null,`  
 `status text not null default 'issued' check (status in ('issued','revoked','expired')),`  
 `artifact_uri text null, -- PDF link or DPP-compatible doc pointer`  
 `created_at timestamptz not null default now(),`

`unique (org_id, tc_number)`  
`);`

`create table if not exists public.tc_scopes (`  
 `id uuid primary key default gen_random_uuid(),`  
 `tc_id uuid not null references public.transaction_certificates(id) on delete cascade,`  
 `subject_type public.scope_subject_type not null,`  
 `subject_id uuid not null,`  
 `created_at timestamptz not null default now(),`  
 `unique (tc_id, subject_type, subject_id)`  
`);`

`alter table public.transaction_certificates enable row level security;`  
`alter table public.tc_scopes enable row level security;`

`create policy "tc_read_own_org"`  
`on public.transaction_certificates for select`  
`to authenticated`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`create policy "tc_scopes_read_own_org"`  
`on public.tc_scopes for select`  
`to authenticated`  
`using (`  
 `exists (`  
 `select 1 from public.transaction_certificates tc`  
 `where tc.id = tc_id`  
 `and tc.org_id = (auth.jwt() ->> 'org_id')::uuid`  
 `)`  
`);`

`revoke insert, update, delete on public.transaction_certificates from authenticated;`  
`revoke insert, update, delete on public.tc_scopes from authenticated;`

---

# **B) Scope Reference Integrity (Triggers)**

Because `subject_id` polymorphically references multiple tables, enforce via triggers.

File: `supabase/migrations/162_scope_fk_triggers.sql`

`create or replace function public.assert_scope_subject_exists(p_type public.scope_subject_type, p_id uuid)`  
`returns void`  
`language plpgsql`  
`stable`  
`as $$`  
`begin`  
 `if p_type = 'org' then`  
 `if not exists (select 1 from public.organizations where id = p_id) then`  
 `raise exception 'Scope subject not found: org %', p_id;`  
 `end if;`  
 `elsif p_type = 'batch' then`  
 `if not exists (select 1 from public.material_batches where id = p_id) then`  
 `raise exception 'Scope subject not found: batch %', p_id;`  
 `end if;`  
 `elsif p_type = 'transformation' then`  
 `if not exists (select 1 from public.batch_transformations where id = p_id) then`  
 `raise exception 'Scope subject not found: transformation %', p_id;`  
 `end if;`  
 `elsif p_type = 'trade' then`  
 `if not exists (select 1 from public.trades where id = p_id) then`  
 `raise exception 'Scope subject not found: trade %', p_id;`  
 `end if;`  
 `else`  
 `raise exception 'Unknown scope subject_type';`  
 `end if;`  
`end;`  
`$$;`

`create or replace function public.trg_assert_certificate_scope()`  
`returns trigger`  
`language plpgsql`  
`as $$`  
`begin`  
 `perform public.assert_scope_subject_exists(new.subject_type, new.subject_id);`  
 `return new;`  
`end;`  
`$$;`

`drop trigger if exists trg_cert_scope_exists on public.certificate_scopes;`  
`create trigger trg_cert_scope_exists`  
`before insert or update on public.certificate_scopes`  
`for each row execute function public.trg_assert_certificate_scope();`

`create or replace function public.trg_assert_tc_scope()`  
`returns trigger`  
`language plpgsql`  
`as $$`  
`begin`  
 `perform public.assert_scope_subject_exists(new.subject_type, new.subject_id);`  
 `return new;`  
`end;`  
`$$;`

`drop trigger if exists trg_tc_scope_exists on public.tc_scopes;`  
`create trigger trg_tc_scope_exists`  
`before insert or update on public.tc_scopes`  
`for each row execute function public.trg_assert_tc_scope();`

---

# **C) Event Schemas — Bindings Included**

## **1\) `CERTIFICATION_VERIFIED` payload extension**

Require at least one scope binding:

`"scopes": {`  
 `"type":"array",`  
 `"minItems": 1,`  
 `"items": {`  
 `"type":"object",`  
 `"required":["subject_type","subject_id"],`  
 `"properties":{`  
 `"subject_type":{"enum":["org","batch","transformation","trade"]},`  
 `"subject_id":{"type":"string","format":"uuid"},`  
 `"coverage_start":{"type":"string","format":"date-time"},`  
 `"coverage_end":{"type":"string","format":"date-time"}`  
 `},`  
 `"additionalProperties":false`  
 `}`  
`}`

## **2\) `TC_ISSUED` schema**

Same `scopes` requirement, plus `tc_number`, `artifact_uri`.

---

# **D) Write Path (Edge \+ DB)**

Implement (later ticket if you want) two Edge functions:

- `verify_certification()` (certifier-only; writes `certifications` \+ `certificate_scopes` \+ event)

- `issue_tc()` (issuer-only; writes `transaction_certificates` \+ `tc_scopes` \+ event)

**Key enforcement:** no scope \= reject.

---

# **E) Coverage Evaluation (DPP “certificate coverage”)**

Add a computed report for a batch:

- Gather upstream transformations from DPP v2

- For each transformation and batch encountered, compute whether there exists:
  - a valid certificate scope covering it (by type \+ time window)

  - and/or a TC scope covering it

Output:

- `coverage`: covered_steps\[\], uncovered_steps\[\], coverage_ratio, violations\[\]

File: `supabase/migrations/163_certificate_coverage_fn.sql` (skeleton)

`create or replace function public.get_certificate_coverage(p_batch_id uuid)`  
`returns jsonb`  
`language plpgsql`  
`security definer`  
`as $$`  
`declare`  
 `lr jsonb;`  
`begin`  
 `lr := public.get_upstream_lineage(p_batch_id, 25);`

`-- v1: mark covered if ANY cert scope exists for batch or any transformation in lineage nodes`  
 `return jsonb_build_object(`  
 `'schema_version','1.0',`  
 `'batch_id', p_batch_id::text,`  
 `'coverage', 'TODO',`  
 `'note','v1 coverage uses existence checks; v2 will enforce cert_type-specific rules'`  
 `);`  
`end;`  
`$$;`

`revoke all on function public.get_certificate_coverage(uuid) from authenticated;`

Then add to DPP view:

- `certificate_coverage = get_certificate_coverage(batch_id)`

---

# **F) Tests**

## **Test 1 — CERTIFICATION_VERIFIED requires scopes**

- attempt emit without scopes → rejected by schema validation

## **Test 2 — Scope subjects must exist**

- scope references unknown batch_id → DB trigger rejects

## **Test 3 — Coverage shows gaps**

- lineage includes transformation T1, no scope bound → coverage indicates uncovered

## **Test 4 — No orphaning**

- attempt to create certification row without scope via workflow → blocked at Edge (and optionally via DB constraint if you add a “must have scope” finalize step)

---

# **Acceptance Criteria**

- Certifications and TCs are structurally bound to batches/transformations/trades

- No scope-less cert/TC events allowed (schema \+ workflow)

- DPP can compute and display coverage/gaps

- Reference integrity enforced (no binding to nonexistent subjects)

- Tests demonstrate coverage and prevent orphaning

---

## **Next logical task (only one)**

**Next: “Cert-Type Rule Engine (GOTS / OEKO-TEX Coverage Semantics)”** — implement per-cert-type coverage requirements (which transformations must be covered, time windows, issuer constraints) so “coverage” isn’t just existence-based but regulator-grade.

# **Ticket — Cert-Type Rule Engine (GOTS / OEKO-TEX Coverage Semantics, Regulator-Grade)**

## **Goal**

Upgrade certificate coverage from “exists” to **cert-type specific, regulator-grade semantics**:

- Define **coverage rules per cert type** (GOTS, OEKO-TEX, etc.)

- Evaluate a batch’s upstream transformations against those rules

- Enforce:
  - required transformation steps covered (by scope bindings)

  - time-window validity at transformation time

  - issuer constraints (allowed issuer orgs / certifiers)

  - jurisdiction/standard version constraints (optional later)

- Produce a deterministic `certificate_coverage_report` used by DPP.

---

## **Deliverables**

1. Canonical rule tables (data-driven, not hardcoded):

- `cert_types`

- `cert_type_rules`

- `cert_type_required_steps`

- `cert_issuer_allowlist` (optional v1)

2. Evaluation function:

- `public.evaluate_cert_coverage(batch_id uuid, cert_type text)`

3. DPP integration:

- DPP returns `coverage_by_cert_type`

4. Tests:

- GOTS requires specific steps covered; missing step → fail

- OEKO-TEX coverage behaves differently (product/process)

- issuer invalid → fail

- time window mismatch → fail

---

# **A) Rule Model (SQL)**

File: `supabase/migrations/170_cert_rule_tables.sql`

`-- Canonical cert types`  
`create table if not exists public.cert_types (`  
 `id text primary key,                   -- 'GOTS', 'OEKO_TEX', etc.`  
 `name text not null,`  
 `description text null,`  
 `is_active boolean not null default true`  
`);`

`-- Rule header (versionable)`  
`create table if not exists public.cert_type_rules (`  
 `id uuid primary key default gen_random_uuid(),`  
 `cert_type_id text not null references public.cert_types(id),`  
 `rule_version text not null,            -- '2025.1', '2026.0', etc.`  
 `effective_from date not null,`  
 `effective_to date null,`  
 `require_issuer_allowlist boolean not null default false,`  
 `created_at timestamptz not null default now(),`  
 `unique (cert_type_id, rule_version)`  
`);`

`-- Required transformation steps for coverage`  
`create table if not exists public.cert_type_required_steps (`  
 `id uuid primary key default gen_random_uuid(),`  
 `rule_id uuid not null references public.cert_type_rules(id) on delete cascade,`  
 `transformation_type public.transformation_type not null, -- weaving, dyeing, etc.`  
 `is_required boolean not null default true,`  
 `-- optional: apply only when output material matches a class`  
 `material_type_prefix text null,        -- e.g. 'cotton' or 'organic'`  
 `unique (rule_id, transformation_type, material_type_prefix)`  
`);`

`-- Optional issuer allowlist (certifiers)`  
`create table if not exists public.cert_issuer_allowlist (`  
 `id uuid primary key default gen_random_uuid(),`  
 `cert_type_id text not null references public.cert_types(id),`  
 `issuer_org_id uuid not null references public.organizations(id),`  
 `effective_from date not null,`  
 `effective_to date null,`  
 `unique (cert_type_id, issuer_org_id, effective_from)`  
`);`

### **Seed minimal types \+ rules (v1)**

File: `supabase/migrations/171_cert_rule_seed.sql`

`insert into public.cert_types (id, name) values`  
 `('GOTS', 'Global Organic Textile Standard'),`  
 `('OEKO_TEX', 'OEKO-TEX Standard')`  
`on conflict (id) do nothing;`

`-- Example rule versions`  
`insert into public.cert_type_rules (cert_type_id, rule_version, effective_from, require_issuer_allowlist)`  
`values`  
 `('GOTS', '2026.0', '2026-01-01', true),`  
 `('OEKO_TEX', '2026.0', '2026-01-01', false)`  
`on conflict (cert_type_id, rule_version) do nothing;`

`-- GOTS: spinning, weaving/knitting, dyeing/printing, finishing must be covered (example baseline)`  
`insert into public.cert_type_required_steps (rule_id, transformation_type, is_required)`  
`select r.id, x.transformation_type, true`  
`from public.cert_type_rules r`  
`join (values ('spinning'::public.transformation_type),`  
 `('weaving'::public.transformation_type),`  
 `('knitting'::public.transformation_type),`  
 `('dyeing'::public.transformation_type),`  
 `('printing'::public.transformation_type),`  
 `('finishing'::public.transformation_type)) x(transformation_type)`  
`on true`  
`where r.cert_type_id='GOTS' and r.rule_version='2026.0'`  
`on conflict do nothing;`

`-- OEKO-TEX: focus on finishing/dyeing/printing coverage (example baseline)`  
`insert into public.cert_type_required_steps (rule_id, transformation_type, is_required)`  
`select r.id, x.transformation_type, true`  
`from public.cert_type_rules r`  
`join (values ('dyeing'::public.transformation_type),`  
 `('printing'::public.transformation_type),`  
 `('finishing'::public.transformation_type)) x(transformation_type)`  
`on true`  
`where r.cert_type_id='OEKO_TEX' and r.rule_version='2026.0'`  
`on conflict do nothing;`

These seed rules are placeholders; engineering can refine with actual standard semantics later, but the engine is correct and data-driven.

---

# **B) Coverage Evaluation Function (Core)**

## **Inputs**

- `p_batch_id`

- `p_cert_type_id` (e.g., 'GOTS')

## **Outputs (jsonb)**

- `is_covered` boolean

- `missing_required_steps` \[\]

- `uncovered_transformations` \[\]

- `issuer_valid` boolean

- `time_window_valid` boolean

- `rule_version` used

File: `supabase/migrations/172_evaluate_cert_coverage.sql`

`create or replace function public.evaluate_cert_coverage(`  
 `p_batch_id uuid,`  
 `p_cert_type_id text`  
`) returns jsonb`  
`language plpgsql`  
`security definer`  
`as $$`  
`declare`  
 `v_rule record;`  
 `v_lineage jsonb;`  
 `v_transformations uuid[];`  
 `v_missing jsonb := '[]'::jsonb;`  
 `v_uncovered jsonb := '[]'::jsonb;`  
 `v_issuer_ok boolean := true;`  
 `v_time_ok boolean := true;`  
`begin`  
 `-- pick active rule by date (today) - can be parameterized later`  
 `select r.*`  
 `into v_rule`  
 `from public.cert_type_rules r`  
 `where r.cert_type_id = p_cert_type_id`  
 `and r.effective_from <= current_date`  
 `and (r.effective_to is null or r.effective_to >= current_date)`  
 `order by r.effective_from desc`  
 `limit 1;`

`if not found then`  
 `return jsonb_build_object(`  
 `'schema_version','1.0',`  
 `'cert_type', p_cert_type_id,`  
 `'is_covered', false,`  
 `'error', 'No active rule'`  
 `);`  
 `end if;`

`-- lineage report to get nodes/edges (we’ll rely on transformations table for steps)`  
 `v_lineage := public.get_upstream_lineage(p_batch_id, 25);`

`-- all transformations that touch the batch's lineage (v1 approach):`  
 `-- transformations that output any batch in lineage nodes OR input any batch in lineage nodes`  
 `with lineage_batches as (`  
 `select (n->>'id')::uuid as batch_node_id`  
 `from jsonb_array_elements(coalesce(v_lineage->'nodes','[]'::jsonb)) n`  
 `),`  
 `touched as (`  
 `select distinct t.id`  
 `from public.batch_transformations t`  
 `where exists (`  
 `select 1 from public.batch_transformation_outputs o`  
 `join lineage_batches lb on lb.batch_node_id = o.batch_id`  
 `where o.transformation_id = t.id`  
 `)`  
 `or exists (`  
 `select 1 from public.batch_transformation_inputs i`  
 `join lineage_batches lb on lb.batch_node_id = i.batch_id`  
 `where i.transformation_id = t.id`  
 `)`  
 `)`  
 `select array_agg(id) into v_transformations from touched;`

`-- required steps for rule`  
 `for r in`  
 `select transformation_type`  
 `from public.cert_type_required_steps`  
 `where rule_id = v_rule.id and is_required = true`  
 `loop`  
 `-- check whether there exists at least one transformation of this type in lineage`  
 `if not exists (`  
 `select 1`  
 `from public.batch_transformations t`  
 `where t.id = any(coalesce(v_transformations, '{}'::uuid[]))`  
 `and t.transformation_type = r.transformation_type`  
 `) then`  
 `v_missing := v_missing || jsonb_build_object(`  
 `'transformation_type', r.transformation_type::text,`  
 `'reason', 'REQUIRED_STEP_NOT_PRESENT_IN_LINEAGE'`  
 `);`  
 `continue;`  
 `end if;`

    `-- check whether those transformations are covered by cert scopes`
    `if not exists (`
      `select 1`
      `from public.batch_transformations t`
      `where t.id = any(coalesce(v_transformations, '{}'::uuid[]))`
        `and t.transformation_type = r.transformation_type`
        `and exists (`
          `select 1`
          `from public.certificate_scopes cs`
          `join public.certifications c on c.id = cs.certificate_id`
          `where c.cert_type = p_cert_type_id`
            `and c.status = 'verified'`
            `and (`
              `(cs.subject_type = 'transformation' and cs.subject_id = t.id) or`
              `(cs.subject_type = 'batch' and cs.subject_id in (`
                 `select o.batch_id from public.batch_transformation_outputs o where o.transformation_id = t.id`
              `)) or`
              `(cs.subject_type = 'org' and cs.subject_id = c.org_id)`
            `)`
            `-- time window: cert must be valid at transformation time`
            `and c.valid_to >= t.occurred_at`
        `)`
    `) then`
      `v_uncovered := v_uncovered || jsonb_build_object(`
        `'transformation_type', r.transformation_type::text,`
        `'reason', 'REQUIRED_STEP_NOT_COVERED_BY_CERT_SCOPE'`
      `);`
    `end if;`

`end loop;`

`-- issuer allowlist enforcement (optional)`  
 `if v_rule.require_issuer_allowlist then`  
 `if not exists (`  
 `select 1`  
 `from public.certifications c`  
 `where c.cert_type = p_cert_type_id`  
 `and c.status = 'verified'`  
 `and exists (`  
 `select 1 from public.cert_issuer_allowlist a`  
 `where a.cert_type_id = p_cert_type_id`  
 `and a.issuer_org_id = c.issuer`  
 `and a.effective_from <= current_date`  
 `and (a.effective_to is null or a.effective_to >= current_date)`  
 `)`  
 `) then`  
 `v_issuer_ok := false;`  
 `end if;`  
 `end if;`

`return jsonb_build_object(`  
 `'schema_version','1.0',`  
 `'cert_type', p_cert_type_id,`  
 `'rule_version', v_rule.rule_version,`  
 `'issuer_valid', v_issuer_ok,`  
 `'time_window_valid', v_time_ok,`  
 `'missing_required_steps', v_missing,`  
 `'uncovered_required_steps', v_uncovered,`  
 `'is_covered', (jsonb_array_length(v_missing)=0 and jsonb_array_length(v_uncovered)=0 and v_issuer_ok)`  
 `);`  
`end;`  
`$$;`

`revoke all on function public.evaluate_cert_coverage(uuid, text) from authenticated;`

This is “engine-first.” It’s strict enough to be useful and flexible enough to refine as you learn the real compliance semantics.

---

# **C) DPP Integration (Coverage by Cert Type)**

Add to DPP v2 view:

- `coverage_by_cert_type`: array of coverage objects for active cert types relevant to batch

File: `supabase/migrations/173_dpp_add_coverage.sql`

`create or replace view public.dpp_product_passport_v2 as`  
`select`  
 `v2.*,`  
 `coalesce((`  
 `select jsonb_agg(public.evaluate_cert_coverage(v2.batch_id, ct.id))`  
 `from public.cert_types ct`  
 `where ct.is_active = true`  
 `), '[]'::jsonb) as coverage_by_cert_type`  
`from public.dpp_product_passport_v2 v2;`

(Engineering should merge this with the existing v2 definition to avoid view-self-reference; implement as a final composed view `dpp_product_passport_v3` if easier.)

---

# **D) Tests (Must-have)**

## **Test 1 — GOTS missing required step fails**

- lineage contains weaving+dyeing but missing spinning

- evaluate_cert_coverage(GOTS) → is_covered=false, missing_required_steps includes spinning

## **Test 2 — Step present but uncovered fails**

- weaving exists but no cert scope binds weaving transformation/batches

- uncovered_required_steps includes weaving

## **Test 3 — Issuer invalid fails**

- rule requires allowlist, cert issuer not allowlisted

- issuer_valid=false and is_covered=false

## **Test 4 — OEKO-TEX passes when finishing covered**

- finishing transformation exists \+ scoped cert covers it → is_covered=true (given rule set)

---

# **Acceptance Criteria**

- Coverage evaluation is rule-driven (tables), not hardcoded

- Required steps vs uncovered steps are clearly distinguished

- Issuer allowlist and time validity enforced where configured

- DPP can return coverage verdicts per cert type

- Tests demonstrate fail/pass conditions for GOTS and OEKO-TEX

---

## **Next logical task (only one)**

**Next: “TC Coverage Semantics (Chain-of-Custody Continuity)”** — implement rules ensuring every custody boundary (trade shipment / handoff) is covered by a TC scope, and flag missing TC coverage as a regulatory risk in DPP.

# **Ticket — TC Coverage Semantics (Chain-of-Custody Continuity) \+ DPP Risk Flags**

## **Goal**

Make Transaction Certificates (TCs) enforce **continuous chain-of-custody** across trade boundaries:

- Every custody boundary (shipment / handoff / ownership transfer) must be covered by a TC scope

- Missing TC coverage becomes a deterministic **regulatory risk flag** in DPP

- Coverage semantics are event-driven and tied to:
  - `trades`

  - shipment/handoff events (new or existing)

  - transformations that imply custody change (optional)

This prevents “ghost custody” and supports audits.

---

## **Deliverables**

1. Canonical custody boundary model:

- `custody_events` (or use events ledger \+ projection)

- `custody_boundaries` view for evaluation

2. Rule tables:

- `tc_coverage_rules`

3. Evaluation function:

- `public.evaluate_tc_coverage(trade_id uuid)` and/or `(... batch_id uuid)`

4. DPP integration:

- `tc_coverage_report` \+ `regulatory_risk_flags`

5. Tests:

- missing TC for a shipment → fail \+ flag

- TC scoped correctly → pass

- wrong org issuer or expired TC → fail

---

# **A) Define Custody Boundaries (What must be covered)**

## **Minimal v1 boundaries**

Treat the following as custody boundaries:

1. **Trade shipment**: `shipped` state transition (trade domain)

2. **Delivery/receipt**: `inspected` or `received` transition (trade domain)

3. Optional: logistics partner handoff events later

### **Implementation approach (fastest correct)**

Use existing state machine \+ event ledger:

- When trade moves into `shipped`, create boundary record

- When trade moves into `inspected` (or `received`), create boundary record

So we’ll create a **projection table** for custody boundaries driven by trade transitions:

---

# **B) SQL — Custody Boundary Projection Table**

File: `supabase/migrations/180_custody_boundaries.sql`

`do $$ begin`  
 `create type public.custody_boundary_type as enum ('shipment','receipt','handoff');`  
`exception when duplicate_object then null; end $$;`

`create table if not exists public.custody_boundaries (`  
 `id uuid primary key default gen_random_uuid(),`  
 `trade_id uuid not null references public.trades(id) on delete cascade,`  
 `boundary_type public.custody_boundary_type not null,`  
 `occurred_at timestamptz not null,`  
 `from_org_id uuid null references public.organizations(id),`  
 `to_org_id uuid null references public.organizations(id),`  
 `subject_batch_id uuid null references public.material_batches(id),`  
 `source_event_id uuid null references public.events(id),`  
 `created_at timestamptz not null default now(),`  
 `unique (trade_id, boundary_type, occurred_at)`  
`);`

`create index if not exists custody_boundaries_trade_idx`  
`on public.custody_boundaries(trade_id, occurred_at);`

`alter table public.custody_boundaries enable row level security;`  
`create policy "custody_boundaries_read_trade_parties"`  
`on public.custody_boundaries for select`  
`to authenticated`  
`using (`  
 `exists (`  
 `select 1 from public.trades t`  
 `where t.id = trade_id`  
 `and (`  
 `t.buyer_org_id = (auth.jwt() ->> 'org_id')::uuid`  
 `or t.supplier_org_id = (auth.jwt() ->> 'org_id')::uuid`  
 `)`  
 `)`  
`);`

`revoke insert, update, delete on public.custody_boundaries from authenticated;`  
`-- Writes via service role worker.`

---

# **C) Worker — Project boundaries from trade transitions**

When trade transition RPC succeeds, it already checks prerequisite events. We’ll add a worker (or add inside RPC if you prefer) that creates custody boundaries when state reaches:

- `shipped` → boundary_type=`shipment` from supplier_org → buyer_org

- `inspected` (or `received`) → boundary_type=`receipt` from carrier/buyer (use buyer org as to_org)

**Fastest path:** put it inside the trade transition RPC after updating state, because it’s deterministic and part of the same transaction.

In `transition_trade_state`:

- if NEW.state='shipped': insert boundary row (on conflict do nothing)

- if NEW.state='inspected': insert boundary row

(If you want “event-first only,” move it to the worker later; this is still doctrine-aligned because the transition itself is already event-gated.)

---

# **D) TC Coverage Rules**

TC semantics require:

- A TC must exist and be `status='issued'`

- `issued_at <= boundary.occurred_at <= valid_to` (if valid_to present)

- TC scope must include the **trade** OR the **batch** (v1) OR an explicit `custody_boundary` subject (v2)

### **v1 scope matching**

TC covers a boundary if there exists `tc_scopes` where:

- subject_type='trade' subject_id=trade_id OR

- subject_type='batch' subject_id=boundary.subject_batch_id

---

# **E) SQL — TC Coverage Evaluation Function**

File: `supabase/migrations/181_evaluate_tc_coverage.sql`

`create or replace function public.evaluate_tc_coverage_for_trade(p_trade_id uuid)`  
`returns jsonb`  
`language plpgsql`  
`security definer`  
`as $$`  
`declare`  
 `b record;`  
 `v_missing jsonb := '[]'::jsonb;`  
 `v_invalid jsonb := '[]'::jsonb;`  
 `v_ok boolean := true;`  
`begin`  
 `for b in`  
 `select * from public.custody_boundaries`  
 `where trade_id = p_trade_id`  
 `order by occurred_at asc`  
 `loop`  
 `-- find covering TC`  
 `if not exists (`  
 `select 1`  
 `from public.transaction_certificates tc`  
 `join public.tc_scopes s on s.tc_id = tc.id`  
 `where tc.status = 'issued'`  
 `and tc.issued_at <= b.occurred_at`  
 `and (tc.valid_to is null or tc.valid_to >= b.occurred_at)`  
 `and (`  
 `(s.subject_type = 'trade' and s.subject_id = b.trade_id)`  
 `or (b.subject_batch_id is not null and s.subject_type = 'batch' and s.subject_id = b.subject_batch_id)`  
 `)`  
 `) then`  
 `v_missing := v_missing || jsonb_build_object(`  
 `'boundary_id', b.id::text,`  
 `'boundary_type', b.boundary_type::text,`  
 `'occurred_at', b.occurred_at,`  
 `'reason', 'NO_TC_SCOPE_COVERS_BOUNDARY'`  
 `);`  
 `v_ok := false;`  
 `end if;`  
 `end loop;`

`return jsonb_build_object(`  
 `'schema_version','1.0',`  
 `'trade_id', p_trade_id::text,`  
 `'missing_tc_boundaries', v_missing,`  
 `'is_covered', v_ok`  
 `);`  
`end;`  
`$$;`

`revoke all on function public.evaluate_tc_coverage_for_trade(uuid) from authenticated;`

### **Batch-level evaluation (for DPP)**

We need coverage for a batch’s custody boundaries. Minimal approach:

- find trades that include this batch (via transformations or trade payload)  
   If trade↔batch isn’t modeled yet, v1 DPP can:

- attach TC coverage per **trade** when viewing trade DPP

- or leave batch DPP with `tc_coverage: "unknown"` until trade→batch mapping is implemented.

**Best path:** add `subject_batch_id` to custody boundaries at creation time (from trade’s batch/lot), so batch DPP can query boundaries directly.

---

# **F) DPP Integration — Regulatory Risk Flags**

Add to DPP v2 (or v3) a `regulatory_risk_flags` array, including TC coverage issues:

Example flags:

- `TC_COVERAGE_GAP`

- `CERT_COVERAGE_GAP`

- `LINEAGE_INVALID`

- `FORCED_LABOR_FLAG`

### **DPP field addition (concept)**

- `tc_coverage_report`: result of `evaluate_tc_coverage_for_trade(trade_id)` or batch variant

- `regulatory_risk_flags`: derive from:
  - lineage_report.is_valid \== false → LINEAGE_INVALID

  - missing_tc_boundaries non-empty → TC_COVERAGE_GAP

  - cert coverage fails → CERT_COVERAGE_GAP

  - sanctions severity forced_labor_flag → FORCED_LABOR_FLAG

---

# **G) Tests**

## **Test 1 — Missing TC produces gap**

- Create trade → transition to shipped (creates custody boundary)

- No TC scopes added

- evaluate_tc_coverage_for_trade(trade_id) → is_covered=false, missing list non-empty

## **Test 2 — TC scope covers trade**

- Create TC \+ tc_scope(subject_type='trade', subject_id=trade_id)

- evaluate → is_covered=true

## **Test 3 — TC expired**

- TC valid_to \< boundary.occurred_at

- evaluate → missing boundary

## **Test 4 — Multiple boundaries**

- shipped \+ receipt

- only one covered → missing list size 1

---

# **Acceptance Criteria**

- Custody boundaries are created deterministically from trade lifecycle

- TC coverage evaluation flags uncovered boundaries

- Time validity enforced (issued_at/valid_to)

- DPP exposes TC coverage report and risk flags

- Tests demonstrate gap detection and pass cases

---

## **Next logical task (only one)**

**Next: “Custody Boundary Event Primitives (LOGISTICS_HANDOFF_RECORDED)”** — introduce explicit handoff events (supplier→carrier→port→buyer) and require TC scopes per handoff, making chain-of-custody granular and audit-ready beyond just shipped/received.

# **Ticket — Custody Boundary Event Primitives: `LOGISTICS_HANDOFF_RECORDED` (+ TC required per handoff)**

## **Goal**

Make chain-of-custody granular and audit-ready by introducing explicit handoff events:

- supplier → carrier pickup

- carrier → port/warehouse handoff

- port → carrier onward

- carrier → buyer delivery

- optional: customs/inspection checkpoints

Each handoff becomes a **custody boundary** that must be covered by a **TC scope** (or flagged as risk).

This extends TC coverage from “trade shipped/received” into a continuous custody trail.

---

## **Deliverables**

1. Event types \+ schemas:

- `LOGISTICS_HANDOFF_RECORDED`

- `CUSTODY_BOUNDARY_PROJECTED` (optional audit)

2. Projection:

- Service-role worker projects handoff events into `custody_boundaries`

3. TC scope semantics upgrade:

- Add subject_type=`custody_boundary` (v2) OR keep trade/batch scope (v1) and require `handoff_id` in payload

4. Evaluation:

- `evaluate_tc_coverage_for_trade` checks each handoff boundary is covered

5. Guards:

- kill-switch domain=`trade` blocks handoff recording

- maker–checker thresholds for high-risk lanes (optional)

6. UI:

- minimal “Logistics Timeline” view for trade

7. Tests:

- handoff event produces custody boundary

- missing TC for a handoff is flagged

- correct TC scope covers it

---

# **A) Update Scope Types (Add custody_boundary)**

File: `supabase/migrations/190_scope_subject_add_boundary.sql`

`-- Add new enum value (Postgres enum alteration)`  
`do $$ begin`  
 `alter type public.scope_subject_type add value if not exists 'custody_boundary';`  
`exception when duplicate_object then null; end $$;`

Update `assert_scope_subject_exists`:

File: `supabase/migrations/191_scope_subject_exists_boundary.sql`

`create or replace function public.assert_scope_subject_exists(p_type public.scope_subject_type, p_id uuid)`  
`returns void`  
`language plpgsql`  
`stable`  
`as $$`  
`begin`  
 `if p_type = 'org' then`  
 `if not exists (select 1 from public.organizations where id = p_id) then`  
 `raise exception 'Scope subject not found: org %', p_id;`  
 `end if;`  
 `elsif p_type = 'batch' then`  
 `if not exists (select 1 from public.material_batches where id = p_id) then`  
 `raise exception 'Scope subject not found: batch %', p_id;`  
 `end if;`  
 `elsif p_type = 'transformation' then`  
 `if not exists (select 1 from public.batch_transformations where id = p_id) then`  
 `raise exception 'Scope subject not found: transformation %', p_id;`  
 `end if;`  
 `elsif p_type = 'trade' then`  
 `if not exists (select 1 from public.trades where id = p_id) then`  
 `raise exception 'Scope subject not found: trade %', p_id;`  
 `end if;`  
 `elsif p_type = 'custody_boundary' then`  
 `if not exists (select 1 from public.custody_boundaries where id = p_id) then`  
 `raise exception 'Scope subject not found: custody_boundary %', p_id;`  
 `end if;`  
 `else`  
 `raise exception 'Unknown scope subject_type';`  
 `end if;`  
`end;`  
`$$;`

---

# **B) New Event Schema — `LOGISTICS_HANDOFF_RECORDED`**

## **Event type**

Domain: `trade`

Payload (v1):

`{`  
 `"schema_version": "1.0",`  
 `"subject_id": "<handoff_event_id>",`  
 `"occurred_at": "2026-02-07T10:00:00Z",`  
 `"trade_id": "<uuid>",`  
 `"batch_id": "<uuid>",`  
 `"from_org_id": "<uuid>",`  
 `"to_org_id": "<uuid>",`  
 `"handoff_type": "pickup|port_in|port_out|warehouse_in|warehouse_out|customs_hold|delivery",`  
 `"location": {`  
 `"geo_hash": "…",`  
 `"country": "IN",`  
 `"city": "Surat"`  
 `},`  
 `"carrier_ref": "BL/CMR/AWB reference",`  
 `"notes": "optional"`  
`}`

Add it to the TS `eventSchemas` registry and Edge validator.

---

# **C) Project Handoff Events → Custody Boundaries**

## **Add `handoff_event_id` to custody boundaries**

File: `supabase/migrations/192_custody_boundary_handoff.sql`

`alter table public.custody_boundaries`  
`add column if not exists handoff_event_id uuid null references public.events(id);`

`create unique index if not exists custody_boundary_handoff_uidx`  
`on public.custody_boundaries(handoff_event_id)`  
`where handoff_event_id is not null;`

## **Worker function: `project_handoff_to_custody_boundary(event_id)`**

File: `supabase/migrations/193_project_handoff.sql`

`create or replace function public.project_handoff_to_custody_boundary(p_event_id uuid)`  
`returns void`  
`language plpgsql`  
`security definer`  
`as $$`  
`declare`  
 `e record;`  
 `p jsonb;`  
 `v_trade uuid;`  
 `v_batch uuid;`  
 `v_from uuid;`  
 `v_to uuid;`  
 `v_at timestamptz;`  
`begin`  
 `select * into e from public.events where id = p_event_id;`

`if not found then raise exception 'Event not found'; end if;`  
 `if e.event_type <> 'LOGISTICS_HANDOFF_RECORDED' then`  
 `raise exception 'Wrong event type for handoff projection';`  
 `end if;`

`p := e.payload;`  
 `v_trade := (p->>'trade_id')::uuid;`  
 `v_batch := nullif(p->>'batch_id','')::uuid;`  
 `v_from := (p->>'from_org_id')::uuid;`  
 `v_to := (p->>'to_org_id')::uuid;`  
 `v_at := (p->>'occurred_at')::timestamptz;`

`insert into public.custody_boundaries (`  
 `trade_id, boundary_type, occurred_at, from_org_id, to_org_id, subject_batch_id, source_event_id, handoff_event_id`  
 `) values (`  
 `v_trade, 'handoff', v_at, v_from, v_to, v_batch, e.id, e.id`  
 `)`  
 `on conflict (handoff_event_id) do nothing;`

`return;`  
`end;`  
`$$;`

`revoke all on function public.project_handoff_to_custody_boundary(uuid) from authenticated;`

## **Apply path**

Option A (fastest): in the `emit_event` Edge function:

- if event_type \== LOGISTICS_HANDOFF_RECORDED

- after inserting event → call RPC `project_handoff_to_custody_boundary(event_id)` via service role

Option B: worker polls governance/trade events and applies projections (more “pure”)

- do later if needed

---

# **D) TC Requirement per Handoff (Coverage Semantics)**

Update `evaluate_tc_coverage_for_trade`:

- boundaries now include `handoff` rows

- require TC scope for each boundary

**Prefer binding to boundary id**:

- When TC is issued for a handoff, it should include `tc_scopes(subject_type='custody_boundary', subject_id=<boundary_id>)`

So adjust evaluation logic to check for scope match in this order:

1. custody_boundary scope (strongest)

2. trade scope (fallback)

3. batch scope (fallback)

Patch: `supabase/migrations/194_tc_coverage_pref_boundary.sql`

`-- inside the exists() clause add:`  
`or (s.subject_type = 'custody_boundary' and s.subject_id = b.id)`

---

# **E) Guards**

Recording a handoff must respect kill-switch domain=`trade`:

- Edge `emit_event` already calls guard for trade events (or should).

- Ensure `LOGISTICS_HANDOFF_RECORDED` is classified as `trade` domain.

Maker–checker (optional v1):

- Require checker when:
  - from_org_id \!= supplier_org_id OR to_org_id not in allowlisted logistics partners

  - or cross-border lane (country mismatch)

Keep this as a future refinement; don’t block v1 delivery.

---

# **F) Minimal UI (Trade Timeline)**

Add a read-only timeline section on trade detail page:

- list custody boundaries ordered by occurred_at

- highlight uncovered boundaries with “TC missing” badge (from evaluation report)

---

# **G) Tests**

## **Test 1 — Handoff event creates boundary**

- Emit LOGISTICS_HANDOFF_RECORDED

- Assert custody_boundaries row exists with boundary_type=handoff and handoff_event_id set

## **Test 2 — Missing TC flagged**

- evaluate_tc_coverage_for_trade includes this boundary in missing list

## **Test 3 — TC covers boundary**

- Create TC \+ tc_scope(custody_boundary, boundary_id)

- evaluate reports covered

## **Test 4 — Idempotent projection**

- project same event twice → only one boundary row exists

---

# **Acceptance Criteria**

- LOGISTICS_HANDOFF_RECORDED exists (schema \+ registry \+ validator)

- Handoff events project into custody_boundaries deterministically and idempotently

- TC coverage evaluation requires coverage for each handoff boundary

- Trade timeline can display custody boundaries and missing coverage flags

- Tests cover projection \+ coverage logic

---

## **Next logical task (only one)**

**Next: “Logistics Partner Identity & Allowlisting”** — introduce logistics partner org_type \+ allowlist policies so only approved carriers/ports can submit handoff events for a trade, preventing forged custody events.

# **Ticket — Logistics Partner Identity & Allowlisting (Prevent Forged Custody Events)**

## **Goal**

Ensure only **approved logistics partners** (carriers, ports, warehouses, customs brokers) can submit `LOGISTICS_HANDOFF_RECORDED` events for a trade.

This prevents forged custody events and enforces “systemic risk begins” governance controls.

---

## **Deliverables**

1. Identity model:

- confirm `org_type` includes `logistics_partner` (already in baseline enums)

- add `logistics_partner_profiles` (capabilities \+ compliance)

2. Allowlisting model (per trade):

- `trade_logistics_allowlist` table:
  - trade_id

  - logistics_org_id

  - allowed_actions (pickup/port/warehouse/customs/delivery)

  - effective window

3. Enforcement:

- Edge `emit_event` (or dedicated `record_handoff`) validates:
  - actor’s org is `logistics_partner`

  - logistics org is allowlisted for that trade \+ action

  - from/to orgs are consistent with allowlist \+ trade parties

4. RLS policies:

- logistics partners can read only the trades they’re allowlisted on (minimal fields)

5. UI:

- Trade admin: manage allowlist (maker–checker required)

6. Tests:

- non-allowlisted partner cannot record handoff

- allowlisted partner can

- allowlist changes require maker–checker and are auditable

---

# **A) Data Model (SQL)**

## **1\) Logistics partner profile**

File: `supabase/migrations/200_logistics_partner_profiles.sql`

`create table if not exists public.logistics_partner_profiles (`  
 `org_id uuid primary key references public.organizations(id) on delete cascade,`  
 `legal_name text not null,`  
 `registration_id text null,`  
 `coverage_regions text[] null,              -- e.g. ["IN-GJ","AE-DU"]`  
 `modes text[] null,                         -- e.g. ["road","sea","air"]`  
 `status text not null default 'active' check (status in ('active','suspended')),`  
 `created_at timestamptz not null default now()`  
`);`

`alter table public.logistics_partner_profiles enable row level security;`

`-- Partner can read their own profile`  
`create policy "lpp_read_own"`  
`on public.logistics_partner_profiles for select`  
`to authenticated`  
`using (org_id = (auth.jwt() ->> 'org_id')::uuid);`

`revoke insert, update, delete on public.logistics_partner_profiles from authenticated;`  
`-- managed by governance / onboarding flows`

## **2\) Trade logistics allowlist**

File: `supabase/migrations/201_trade_logistics_allowlist.sql`

`do $$ begin`  
 `create type public.handoff_action as enum ('pickup','port_in','port_out','warehouse_in','warehouse_out','customs_hold','delivery');`  
`exception when duplicate_object then null; end $$;`

`create table if not exists public.trade_logistics_allowlist (`  
 `id uuid primary key default gen_random_uuid(),`  
 `trade_id uuid not null references public.trades(id) on delete cascade,`  
 `logistics_org_id uuid not null references public.organizations(id),`  
 `allowed_actions public.handoff_action[] not null,`  
 `effective_from timestamptz not null default now(),`  
 `effective_to timestamptz null,`  
 `status text not null default 'active' check (status in ('active','revoked')),`  
 `created_at timestamptz not null default now(),`  
 `unique (trade_id, logistics_org_id)`  
`);`

`create index if not exists tla_trade_idx on public.trade_logistics_allowlist(trade_id);`

`alter table public.trade_logistics_allowlist enable row level security;`

`-- Trade parties can read allowlist for their trade`  
`create policy "tla_read_trade_parties"`  
`on public.trade_logistics_allowlist for select`  
`to authenticated`  
`using (`  
 `exists (`  
 `select 1 from public.trades t`  
 `where t.id = trade_id`  
 `and (`  
 `t.buyer_org_id = (auth.jwt() ->> 'org_id')::uuid`  
 `or t.supplier_org_id = (auth.jwt() ->> 'org_id')::uuid`  
 `)`  
 `)`  
 `or logistics_org_id = (auth.jwt() ->> 'org_id')::uuid`  
`);`

`revoke insert, update, delete on public.trade_logistics_allowlist from authenticated;`  
`-- writes via governance RPC (maker–checker)`

---

# **B) Governance Write Path (Maker–Checker)**

## **Event type**

- `TRADE_LOGISTICS_ALLOWLIST_UPDATED`  
   Payload:

`{`  
 `"schema_version":"1.0",`  
 `"subject_id":"<trade_id>",`  
 `"occurred_at":"...",`  
 `"logistics_org_id":"<uuid>",`  
 `"allowed_actions":["pickup","delivery"],`  
 `"effective_from":"...",`  
 `"effective_to":"...",`  
 `"status":"active|revoked",`  
 `"maker_id":"...",`  
 `"checker_id":"..."`  
`}`

Worker applies event to `trade_logistics_allowlist`.

---

# **C) Enforcement in Handoff Recording**

**Strongest approach:** use a dedicated Edge function `record_handoff()` instead of generic `emit_event` for handoffs.  
 It can do domain guard \+ allowlist checks _before_ event insertion.

## **Enforcement rules (v1, strict)**

When `LOGISTICS_HANDOFF_RECORDED` is submitted:

1. Actor’s org must be `org_type='logistics_partner'`

2. Actor’s org must be allowlisted on the trade:
   - allowlist row exists, status=active

   - `handoff_type` is contained in `allowed_actions`

   - now within effective window

3. from/to org constraints:
   - `from_org_id` must be one of:
     - supplier org

     - allowlisted logistics orgs on trade

   - `to_org_id` must be one of:
     - buyer org

     - allowlisted logistics orgs on trade

   - (i.e., custody must stay inside the trade’s approved custody set)

If any check fails → 403\.

### **Minimal DB helper RPC**

File: `supabase/migrations/202_is_allowlisted_for_handoff.sql`

`create or replace function public.is_allowlisted_for_handoff(`  
 `p_trade_id uuid,`  
 `p_logistics_org_id uuid,`  
 `p_action public.handoff_action,`  
 `p_at timestamptz`  
`) returns boolean`  
`language sql`  
`stable`  
`as $$`  
 `select exists (`  
 `select 1 from public.trade_logistics_allowlist a`  
 `where a.trade_id = p_trade_id`  
 `and a.logistics_org_id = p_logistics_org_id`  
 `and a.status = 'active'`  
 `and (a.effective_from <= p_at)`  
 `and (a.effective_to is null or a.effective_to >= p_at)`  
 `and p_action = any(a.allowed_actions)`  
 `)`  
`$$;`

`revoke all on function public.is_allowlisted_for_handoff(uuid, uuid, public.handoff_action, timestamptz) from authenticated;`

### **Edge function enforcement (outline)**

- decode user \+ org_id from JWT

- query trade (buyer_org_id/supplier_org_id)

- call `is_allowlisted_for_handoff(trade_id, actor_org_id, handoff_type, occurred_at)`

- validate `from_org_id`/`to_org_id` are in `{supplier, buyer, allowlisted logistics orgs}`

- if pass:
  - emit event

  - project to custody boundary (existing)

---

# **D) Trade Read Access for Logistics Partners (minimal safe)**

Logistics partners need a way to see the trades they’re allowlisted on (basic fields only).

Create view `logistics_trade_roster`:

- trade_id

- supplier org name

- buyer org name

- allowed_actions

- effective window

- current trade state

RLS ensures logistics partner sees only trades they are allowlisted on.

---

# **E) Tests**

## **Test 1 — Not logistics_partner blocked**

- supplier user attempts to submit handoff event → 403

## **Test 2 — Logistics org not allowlisted blocked**

- logistics user submits handoff for trade not allowlisted → 403

## **Test 3 — Action not allowed blocked**

- allowlisted for pickup only; submits delivery → 403

## **Test 4 — Allowed passes**

- allowlisted for pickup; submits pickup → event inserted \+ custody boundary projected

## **Test 5 — from/to constraints**

- tries to handoff to non-allowlisted org → 403

---

# **Acceptance Criteria**

- Logistics partners have explicit identity profile and status

- Trade-specific allowlist exists with allowed actions \+ effective window

- Only allowlisted logistics partners can submit handoff events for that trade/action

- from/to orgs constrained to approved custody set

- Allowlist writes are governance-controlled (maker–checker)

- Tests cover blocked \+ allowed paths

---

## **Next logical task (only one)**

**Next: “Logistics Handoff RPC (Dedicated) \+ Mobile-Friendly Scan Flow”** — implement `record_handoff()` as the official endpoint (not generic emit), and add a minimal QR/scan-based UI to log pickup/delivery quickly while preserving doctrine enforcement.

# **Ticket — Logistics Handoff RPC (Dedicated) \+ Mobile-Friendly Scan Flow (QR → `record_handoff`)**

## **Goal**

Make custody logging usable in the real world (drivers/warehouse/port) while staying doctrine-safe:

- Implement **dedicated Edge RPC** `record_handoff()` (not generic `emit_event`)

- Enforce:
  - schema validation

  - trade domain kill-switch guard

  - logistics partner identity \+ allowlist action checks

  - from/to org constraints

  - TC coverage hooks (flag if missing, don’t block v1 unless required)

- Provide a **mobile-friendly scan flow**:
  - QR code on shipment/trade

  - open `/handoff/scan?trade=...&batch=...`

  - one-tap log “Pickup” / “Delivery” (and later: port/warehouse/customs)

- Project handoff to `custody_boundaries` and update trade timeline.

---

## **Deliverables**

1. Edge function: `/functions/v1/record_handoff`

2. Event schema: `LOGISTICS_HANDOFF_RECORDED.v1` in shared schema pack

3. Projection call: `project_handoff_to_custody_boundary(event_id)`

4. Mobile UI:

- `/handoff/scan` (scan \+ choose action)

- `/handoff/confirm` (submit \+ success receipt)

5. QR code generator:

- on trade page: “Generate Handoff QR”

6. Tests:

- allowlist enforcement

- kill-switch enforcement

- invalid schema rejected

- happy path inserts event \+ boundary

---

# **A) API Contract — `record_handoff`**

**POST** `/functions/v1/record_handoff`

Body:

`{`  
 `payload: {`  
 `schema_version: "1.0",`  
 `subject_id: string,         // uuid`  
 `occurred_at: string,        // ISO`  
 `trade_id: string,           // uuid`  
 `batch_id?: string,          // uuid`  
 `from_org_id: string,        // uuid`  
 `to_org_id: string,          // uuid`  
 `handoff_type: "pickup" | "port_in" | "port_out" | "warehouse_in" | "warehouse_out" | "customs_hold" | "delivery",`  
 `location?: { geo_hash?: string; country?: string; city?: string },`  
 `carrier_ref?: string,`  
 `notes?: string`  
 `},`  
 `reasoning_hash?: string`  
`}`

Response:

`{ ok: true, event_id: string, custody_boundary_id?: string }`

---

# **B) Shared Schema Pack Addition (TS \+ Deno)**

Add `LOGISTICS_HANDOFF_RECORDED` to `eventSchemas` registry and bundle it for Next \+ Edge (same mechanism you already planned).

Schema must require:

- subject_id, occurred_at, trade_id, from_org_id, to_org_id, handoff_type

---

# **C) Edge Function — Implementation Outline (strict)**

## **Steps**

1. AuthN: require session user

2. Determine actor_org_id from JWT claim `org_id`

3. Domain kill-switch guard:
   - `require_not_frozen(... domain='trade')`

4. Verify actor org is `logistics_partner`

5. Allowlist check:
   - `is_allowlisted_for_handoff(trade_id, actor_org_id, handoff_type, occurred_at)` must be true

6. Trade party \+ custody set enforcement:
   - fetch trade supplier_org_id \+ buyer_org_id

   - ensure `from_org_id` and `to_org_id` are in allowed custody set:
     - {supplier, buyer, all allowlisted logistics orgs on trade}

7. Insert `events` row:
   - domain=`trade`, type=`LOGISTICS_HANDOFF_RECORDED`, org_id \= actor_org_id (or trade org scope if you prefer)

8. Project:
   - call `project_handoff_to_custody_boundary(event_id)`

9. Return ids

This function is the only write path for handoffs. UI must use it.

---

# **D) Mobile-Friendly Scan Flow (Next.js)**

## **1\) QR Code Content**

QR encodes a URL like:  
 `/handoff/scan?trade_id=<uuid>&batch_id=<uuid>&token=<optional short-lived>`

**v1 (fastest):** no token, rely on auth session \+ allowlist.  
 **v2:** add signed short-lived token if you need “offline-ish” checks.

## **2\) `/handoff/scan`**

Mobile-first page:

- shows trade_id \+ batch_id summary (fetch minimal read model)

- large buttons:
  - Pickup

  - Delivery

  - (expand) Port In/Out, Warehouse In/Out, Customs Hold

- optional location capture:
  - manual country/city

  - geo_hash (if you already compute)

- submit → calls `record_handoff`

## **3\) `/handoff/confirm`**

Success screen:

- “Handoff recorded”

- shows timestamp \+ event id

- “View trade timeline” link

---

# **E) QR Generator on Trade Page**

- Button “Generate Handoff QR”

- Renders QR in a modal

- QR URL includes trade_id \+ batch_id

(Use a small QR library in Next.js; no backend needed.)

---

# **F) Tests**

## **API tests (Edge)**

1. Non-logistics user → 403

2. Logistics not allowlisted → 403

3. Wrong action not allowed → 403

4. Kill-switch trade read_only → 422/403 (consistent with your guard behavior)

5. Happy path:
   - event inserted

   - custody_boundary inserted (handoff)

   - evaluate_tc_coverage flags missing TC if none (non-blocking)

## **UI tests (light)**

- scan page renders and can submit

- shows error states clearly

---

# **Acceptance Criteria**

- `record_handoff()` is the only supported endpoint for handoff logging

- Enforces logistics identity \+ trade allowlist \+ from/to custody set

- Respects trade kill-switch modes

- Projects handoff into custody_boundaries

- Mobile scan flow works end-to-end with QR

- Tests cover blocked \+ allowed flows

---

## **Next logical task (only one)**

**Next: “TC Issuance UX \+ Auto-Prompt on Missing Coverage”** — after a handoff is recorded, if TC coverage is missing for that custody boundary, automatically prompt the issuer to attach/issue a TC scope (or open a guided “Issue TC for this boundary” flow).

# **Ticket — TC Issuance UX \+ Auto-Prompt on Missing Coverage (Boundary → “Issue TC” Guided Flow)**

## **Goal**

Close the loop from custody logging → compliance completion:

- After `record_handoff()` creates a custody boundary, the system checks TC coverage.

- If **missing**, prompt the appropriate issuer (supplier/certifier/logistics—per your policy) to:
  1. **Attach an existing TC** to this custody boundary, or

  2. **Issue a new TC** scoped to this custody boundary

- Result: every custody boundary can be brought to “covered” quickly with minimal operator friction.

---

## **Deliverables**

1. Coverage check integration:

- `record_handoff()` returns `tc_required: boolean` \+ `missing_boundary_id`

- or emits `TC_COVERAGE_GAP_DETECTED` event

2. UI prompt (Next.js):

- Inline banner/toast on handoff success \+ trade timeline

- “Issue TC for this boundary” CTA

3. Guided TC issuance flow:

- `/trade/[id]/tc/issue?boundary=<id>`
  - Step 1: choose issuer org \+ TC number \+ artifact URI

  - Step 2: confirm scope \= custody_boundary

  - Step 3: submit

4. Backend write path:

- Edge function `issue_tc_for_boundary()`:
  - validates schema

  - enforces permissions

  - writes `transaction_certificates` \+ `tc_scopes(subject_type='custody_boundary')`

  - emits `TC_ISSUED` event (with scope)

5. Tests:

- missing TC triggers prompt

- attach existing TC resolves gap

- issue new TC resolves gap

- unauthorized user cannot issue/attach

---

# **A) Define “Who is allowed to issue a TC?”**

Pick a strict v1 policy (fastest to ship, easy to refine):

**v1 policy**

- Only **supplier org** (trade supplier) OR **approved certifier org** can issue TCs.

- Logistics partners cannot issue (they only log custody events).

Enforcement:

- issuer must be:
  - supplier_org_id for the trade, OR

  - org_type='certifier' and allowlisted for trade/org (future)

---

# **B) Backend: Gap Signaling Strategy**

## **Option 1 (simplest): return gap info from `record_handoff()`**

After projecting boundary:

- run evaluation for that trade (or boundary-only check)

- return:

`{`  
 `"ok": true,`  
 `"event_id": "...",`  
 `"custody_boundary_id": "...",`  
 `"tc_gap": { "missing": true, "boundary_id": "..." }`  
`}`

## **Option 2 (more doctrine-pure): emit `TC_COVERAGE_GAP_DETECTED`**

Insert an event into `events`:

- `event_domain='trade'`

- `event_type='TC_COVERAGE_GAP_DETECTED'`

- payload includes boundary_id, trade_id

UI subscribes/polls recent events for the trade.

**Recommendation:** Do both:

- return gap immediately for UX

- also emit event for audit \+ automation

---

# **C) Boundary-Scoped Coverage Check (fast)**

Instead of evaluating whole trade every time, add a helper:

File: `supabase/migrations/210_tc_boundary_check.sql`

`create or replace function public.is_tc_covering_boundary(p_boundary_id uuid)`  
`returns boolean`  
`language sql`  
`stable`  
`as $$`  
 `select exists (`  
 `select 1`  
 `from public.custody_boundaries b`  
 `join public.transaction_certificates tc on true`  
 `join public.tc_scopes s on s.tc_id = tc.id`  
 `where b.id = p_boundary_id`  
 `and tc.status = 'issued'`  
 `and tc.issued_at <= b.occurred_at`  
 `and (tc.valid_to is null or tc.valid_to >= b.occurred_at)`  
 `and (`  
 `(s.subject_type = 'custody_boundary' and s.subject_id = b.id)`  
 `or (s.subject_type = 'trade' and s.subject_id = b.trade_id)`  
 `or (b.subject_batch_id is not null and s.subject_type = 'batch' and s.subject_id = b.subject_batch_id)`  
 `)`  
 `)`  
`$$;`

`revoke all on function public.is_tc_covering_boundary(uuid) from authenticated;`

---

# **D) Edge Function — `issue_tc_for_boundary`**

## **Endpoint**

**POST** `/functions/v1/issue_tc_for_boundary`

Body:

`{`  
 `payload: {`  
 `schema_version: "1.0",`  
 `subject_id: "<tc_id uuid>",`  
 `occurred_at: "<ISO>",`  
 `trade_id: "<uuid>",`  
 `custody_boundary_id: "<uuid>",`  
 `tc_number: "TC-123",`  
 `issuer_org_id?: "<uuid>",     // optional; default to caller org`  
 `valid_to?: "<ISO>",`  
 `artifact_uri?: "https://...",`  
 `notes?: "..."`  
 `}`  
`}`

## **Server actions**

1. Auth \+ org_id from JWT

2. Permission:
   - caller org must be supplier_org_id on trade OR certifier role

3. Insert `transaction_certificates`

4. Insert `tc_scopes`:
   - `(custody_boundary, boundary_id)`

   - optionally also `(trade, trade_id)` for convenience

5. Emit `TC_ISSUED` event with scopes

6. Return ok

---

# **E) UI — Auto Prompt \+ Guided Flow**

## **1\) Where prompt appears**

- After successful handoff submission (mobile confirm page)

- On trade timeline page (if there are uncovered custody boundaries)

UI logic:

- call `GET /trade/[id]/tc_gaps` (or query computed view)

- if gaps exist:
  - show banner: “1 custody boundary missing TC coverage”

  - show list with “Issue TC” and “Attach existing TC” actions

## **2\) “Attach existing TC”**

- Search TCs for org: `transaction_certificates where org_id = my_org and status='issued'`

- On select TC, call `attach_tc_scope(boundary_id, tc_id)` (service role Edge)
  - inserts into `tc_scopes(custody_boundary, boundary_id)` if not exists

  - emits `TC_SCOPE_BOUND` event

## **3\) “Issue TC for this boundary” wizard**

- Step 1: enter TC number \+ artifact URI

- Step 2: confirm boundary details (from/to org, occurred_at)

- Step 3: submit to `issue_tc_for_boundary`

---

# **F) Read Models for Gaps (for timeline UI)**

Create view:

File: `supabase/migrations/211_tc_gaps_view.sql`

`create or replace view public.tc_coverage_gaps as`  
`select`  
 `b.id as custody_boundary_id,`  
 `b.trade_id,`  
 `b.boundary_type,`  
 `b.occurred_at,`  
 `b.from_org_id,`  
 `b.to_org_id,`  
 `b.subject_batch_id,`  
 `not public.is_tc_covering_boundary(b.id) as missing_tc`  
`from public.custody_boundaries b;`

In UI, filter where `missing_tc=true`.

---

# **G) Tests**

1. After `record_handoff()`, if no TC scopes exist:

- response contains `tc_gap.missing=true`

- `tc_coverage_gaps` shows missing_tc=true

2. After issuing TC for boundary:

- `is_tc_covering_boundary(boundary_id)=true`

- gaps view missing_tc=false

3. Unauthorized issuer blocked:

- logistics partner tries issuing TC → 403

4. Attach existing TC:

- inserts scope \+ resolves gap

---

# **Acceptance Criteria**

- Handoff success path immediately signals missing TC coverage

- Trade timeline clearly shows uncovered custody boundaries

- Users can attach an existing TC or issue a new TC scoped to boundary

- Permissions enforced (only supplier/certifier issuers)

- Resolving TC coverage clears the gap deterministically

- Tests validate end-to-end prompt → issue/attach → cleared

---

## **Next logical task (only one)**

**Next: “Compliance Kill-Switch for Custody (TC_REQUIRED_MODE)”** — add a domain/tenant flag that switches policy from “warn on missing TC” to “block downstream transitions unless TC coverage exists,” enabling staged rollout from soft enforcement to hard enforcement.

# **🎫 Ticket — Compliance Kill-Switch for Custody**

## **`TC_REQUIRED_MODE` (Soft → Hard Enforcement Switch)**

## **Goal**

Introduce a **governance-controlled kill-switch** that upgrades TC enforcement in stages:

- **Soft mode (default):**  
   Missing TC coverage → warnings, risk flags, UI prompts

- **Hard mode:**  
   Missing TC coverage → **block downstream transitions** (trade settlement, delivery confirmation, certification issuance, DPP validity)

This enables **gradual rollout**, regulator pilots, and jurisdiction-specific enforcement.

---

## **Deliverables**

### **1\) Flag Model (Domain \+ Tenant Scoped)**

#### **Flag definition**

- `TC_REQUIRED_MODE`

- Scope:
  - Platform-wide (default)

  - Per-tenant override (supplier/buyer org)

- Domain: `compliance` \+ `trade`

#### **Values**

`off        → no TC checks (dev / legacy onboarding only)`  
`warn       → allow but flag missing TC`  
`enforce    → block downstream actions if missing TC`

---

### **2\) Flag Storage (SQL)**

File: `supabase/migrations/220_tc_required_mode.sql`

`create table if not exists public.compliance_flags (`  
 `id uuid primary key default gen_random_uuid(),`  
 `scope_type text not null check (scope_type in ('platform','org')),`  
 `scope_id uuid null, -- null for platform-wide`  
 `flag_key text not null,`  
 `flag_value text not null,`  
 `effective_from timestamptz not null default now(),`  
 `effective_to timestamptz null,`  
 `created_at timestamptz not null default now(),`  
 `unique (scope_type, scope_id, flag_key)`  
`);`

`alter table public.compliance_flags enable row level security;`

`-- Read-only for tenants`  
`create policy "flags_read"`  
`on public.compliance_flags for select`  
`to authenticated`  
`using (true);`

`revoke insert, update, delete on public.compliance_flags from authenticated;`  
`-- writes only via governance worker`

---

### **3\) Flag Resolution Helper (DB)**

File: `supabase/migrations/221_get_tc_required_mode.sql`

`create or replace function public.get_tc_required_mode(p_org_id uuid)`  
`returns text`  
`language sql`  
`stable`  
`as $$`  
 `select coalesce(`  
 `-- org override`  
 `(select flag_value`  
 `from public.compliance_flags`  
 `where flag_key='TC_REQUIRED_MODE'`  
 `and scope_type='org'`  
 `and scope_id=p_org_id`  
 `and (effective_to is null or effective_to >= now())`  
 `limit 1),`  
 `-- platform default`  
 `(select flag_value`  
 `from public.compliance_flags`  
 `where flag_key='TC_REQUIRED_MODE'`  
 `and scope_type='platform'`  
 `and (effective_to is null or effective_to >= now())`  
 `limit 1),`  
 `'warn'`  
 `)`  
`$$;`

`revoke all on function public.get_tc_required_mode(uuid) from authenticated;`

---

### **4\) Enforcement Points (Critical)**

#### **A) Trade State Transitions**

Block when:

- `TC_REQUIRED_MODE = enforce`

- AND there exists any custody boundary with missing TC coverage

- AND transition is one of:
  - `inspected → settled`

  - `shipped → inspected` (optional, stricter)

Add guard in:

- `transition_trade_state` RPC

`if public.get_tc_required_mode(buyer_org_id) = 'enforce' then`  
 `if exists (`  
 `select 1 from public.tc_coverage_gaps g`  
 `where g.trade_id = p_trade_id and g.missing_tc = true`  
 `) then`  
 `raise exception 'TC_REQUIRED_MODE enforced: custody boundaries missing TC coverage';`  
 `end if;`  
`end if;`

---

#### **B) Certification Issuance**

Block `CERTIFICATION_VERIFIED` if:

- Any upstream custody boundary lacks TC coverage

- Mode \= `enforce`

This prevents **certificate laundering**.

---

#### **C) DPP Verdict**

- `warn` → DPP valid but flagged

- `enforce` → DPP marked `INVALID_COMPLIANCE`

---

### **5\) Governance Control (Maker–Checker)**

#### **Event**

`COMPLIANCE_FLAG_UPDATED`

Payload:

`{`  
 `"schema_version": "1.0",`  
 `"flag_key": "TC_REQUIRED_MODE",`  
 `"flag_value": "warn|enforce",`  
 `"scope_type": "platform|org",`  
 `"scope_id": "<uuid|null>",`  
 `"reason": "Regulator pilot / jurisdiction mandate",`  
 `"maker_id": "...",`  
 `"checker_id": "..."`  
`}`

Worker:

- applies to `compliance_flags`

- emits `FLAG_APPLIED` audit event

---

### **6\) UI (Minimal)**

- Governance console:
  - toggle TC enforcement per org

  - badge: Soft / Enforced

- Trade timeline:
  - show “Blocked by TC_REQUIRED_MODE” when enforcement active

---

### **7\) Tests**

1. `warn` mode:
   - missing TC → trade settles with warning

2. `enforce` mode:
   - missing TC → settlement blocked

3. org override:
   - org A enforced, org B warn

4. governance audit:
   - flag change logged and immutable

---

## **Acceptance Criteria**

- TC enforcement is configurable (platform \+ org)

- Soft vs hard enforcement works as designed

- Trade \+ certification paths respect enforcement

- DPP reflects enforcement status

- Governance-only control with full audit trail

## **Next Logical Task (after this one)**

👉 **“Jurisdictional Compliance Profiles”**  
 Map TC_REQUIRED_MODE \+ cert rules to **EU / US / buyer-specific mandates**, so enforcement auto-adjusts by destination market.

# **Ticket — Jurisdictional Compliance Profiles (EU / US / Buyer Mandates → Auto-Enforcement)**

## **Goal**

Introduce a **jurisdiction-aware compliance layer** that automatically selects and enforces the correct policy set based on:

- destination market (EU / US / UK / buyer policy)

- product category (textiles/apparel)

- trade route / importer of record

- cert requirements (GOTS / OEKO-TEX / others)

- custody requirements (TC_REQUIRED_MODE)

So the platform can move from “one global rule” to **market-specific compliance physics**.

---

## **Deliverables**

1. Canonical tables:

- `compliance_profiles`

- `compliance_profile_rules`

- `org_compliance_preferences` (buyer-specific overlays)

- `trade_compliance_context` (resolved profile per trade)

2. Resolution function:

- `public.resolve_compliance_profile(trade_id uuid)` → profile_id

3. Enforcement hooks:

- `get_tc_required_mode(trade_id)` becomes jurisdiction-aware

- `evaluate_cert_coverage(...)` uses the correct cert rule version for that market

4. DPP integration:

- `compliance_profile_applied` \+ `required_controls` list

5. Governance console:

- manage profiles and activate them (maker–checker)

6. Tests:

- EU trade enforces TC_REQUIRED_MODE=enforce \+ stricter cert coverage

- US trade uses UFLPA-required flags (even if cert rules differ)

- buyer overlay can tighten but not loosen (monotonic governance)

---

# **A) Data Model (SQL)**

File: `supabase/migrations/230_compliance_profiles.sql`

`create table if not exists public.compliance_profiles (`  
 `id uuid primary key default gen_random_uuid(),`  
 `code text not null unique,        -- 'EU_2027_TEXTILES', 'US_UFLPA_2026', 'BUYER_STRICT_V1'`  
 `name text not null,`  
 `description text null,`  
 `is_active boolean not null default true,`  
 `created_at timestamptz not null default now()`  
`);`

`-- Rules are key/value to keep it extensible`  
`create table if not exists public.compliance_profile_rules (`  
 `id uuid primary key default gen_random_uuid(),`  
 `profile_id uuid not null references public.compliance_profiles(id) on delete cascade,`  
 `rule_key text not null,           -- 'TC_REQUIRED_MODE', 'REQUIRE_CERT_TYPES', 'CERT_RULE_VERSION:GOTS'`  
 `rule_value jsonb not null,        -- typed value`  
 `created_at timestamptz not null default now(),`  
 `unique (profile_id, rule_key)`  
`);`

### **Buyer-specific overlays (monotonic tightening)**

File: `supabase/migrations/231_org_compliance_preferences.sql`

`create table if not exists public.org_compliance_preferences (`  
 `id uuid primary key default gen_random_uuid(),`  
 `org_id uuid not null references public.organizations(id) on delete cascade,`  
 `applies_to text not null default 'buyer', -- for later: supplier overlays etc.`  
 `profile_id uuid not null references public.compliance_profiles(id),`  
 `mode text not null default 'tighten_only' check (mode in ('tighten_only')),`  
 `created_at timestamptz not null default now(),`  
 `unique (org_id, profile_id)`  
`);`

---

# **B) Trade Context (Resolved Profile per Trade)**

We need deterministic profile assignment per trade. Minimal input fields needed on `trades`:

- `destination_market` (EU/US/UK/etc.)

- `importer_org_id` (optional)

- `buyer_org_id` already exists

File: `supabase/migrations/232_trade_compliance_fields.sql`

`alter table public.trades`  
`add column if not exists destination_market text null, -- 'EU','US','UK','IN'`  
`add column if not exists importer_org_id uuid null references public.organizations(id);`

Create resolved context table:

File: `supabase/migrations/233_trade_compliance_context.sql`

`create table if not exists public.trade_compliance_context (`  
 `trade_id uuid primary key references public.trades(id) on delete cascade,`  
 `base_profile_id uuid not null references public.compliance_profiles(id),`  
 `effective_profile_id uuid not null references public.compliance_profiles(id),`  
 `resolved_at timestamptz not null default now()`  
`);`

`revoke insert, update, delete on public.trade_compliance_context from authenticated;`  
`-- written by worker or transition RPC`

---

# **C) Profile Resolution Function**

Resolution logic (v1):

1. Base profile chosen by `trades.destination_market`

2. Apply buyer overlay (if exists) by **tightening only**:
   - TC_REQUIRED_MODE can be upgraded (warn → enforce) but not downgraded

   - required cert types can add more but not remove

File: `supabase/migrations/234_resolve_compliance_profile.sql`

`create or replace function public.resolve_compliance_profile(p_trade_id uuid)`  
`returns uuid`  
`language plpgsql`  
`security definer`  
`as $$`  
`declare`  
 `t record;`  
 `base_profile uuid;`  
 `buyer_overlay uuid;`  
`begin`  
 `select * into t from public.trades where id = p_trade_id;`  
 `if not found then raise exception 'Trade not found'; end if;`

`-- Base mapping`  
 `select id into base_profile`  
 `from public.compliance_profiles`  
 `where code = case`  
 `when t.destination_market = 'EU' then 'EU_2027_TEXTILES'`  
 `when t.destination_market = 'US' then 'US_UFLPA_2026'`  
 `else 'GLOBAL_BASELINE'`  
 `end;`

`if base_profile is null then`  
 `select id into base_profile from public.compliance_profiles where code='GLOBAL_BASELINE';`  
 `end if;`

`-- Buyer overlay (tighten-only)`  
 `select ocp.profile_id into buyer_overlay`  
 `from public.org_compliance_preferences ocp`  
 `where ocp.org_id = t.buyer_org_id`  
 `limit 1;`

`-- For v1: if overlay exists, use overlay as effective (later: merge rules)`  
 `return coalesce(buyer_overlay, base_profile);`  
`end;`  
`$$;`

`revoke all on function public.resolve_compliance_profile(uuid) from authenticated;`

v2 later: merge profile rules rather than replace.

---

# **D) Make TC_REQUIRED_MODE Jurisdiction-Aware**

Replace org-only `get_tc_required_mode(org_id)` with trade-aware:

### **New function**

`public.get_tc_required_mode_for_trade(trade_id uuid)`

Resolution order:

1. effective profile rule `TC_REQUIRED_MODE`

2. org override (if you want to keep it)

3. platform default

File: `supabase/migrations/235_get_tc_required_mode_for_trade.sql`

`create or replace function public.get_profile_rule_text(p_profile_id uuid, p_key text)`  
`returns text`  
`language sql`  
`stable`  
`as $$`  
 `select (rule_value->>0)`  
 `from public.compliance_profile_rules`  
 `where profile_id = p_profile_id and rule_key = p_key`  
 `limit 1`  
`$$;`

`create or replace function public.get_tc_required_mode_for_trade(p_trade_id uuid)`  
`returns text`  
`language plpgsql`  
`security definer`  
`as $$`  
`declare`  
 `v_profile uuid;`  
 `v_mode text;`  
 `t record;`  
`begin`  
 `select * into t from public.trades where id = p_trade_id;`  
 `v_profile := public.resolve_compliance_profile(p_trade_id);`

`select rule_value->>'mode' into v_mode`  
 `from public.compliance_profile_rules`  
 `where profile_id = v_profile and rule_key = 'TC_REQUIRED_MODE'`  
 `limit 1;`

`return coalesce(v_mode, 'warn');`  
`end;`  
`$$;`

`revoke all on function public.get_tc_required_mode_for_trade(uuid) from authenticated;`

### **Update enforcement points**

- Trade settlement RPC uses `get_tc_required_mode_for_trade(trade_id)`

- Certification issuance uses effective profile too

---

# **E) Cert Rules Versioning by Jurisdiction**

Add a profile rule:

- `CERT_RULE_VERSION` per cert type, e.g.
  - `{"GOTS":"2026.0","OEKO_TEX":"2026.0"}`

Then:

- `evaluate_cert_coverage(batch_id, cert_type)` receives optional `rule_version` sourced from profile.

Minimal change:

- create `evaluate_cert_coverage_with_rule(batch_id, cert_type, rule_version)`

- DPP chooses rule_version based on effective profile.

---

# **F) Seed Initial Profiles**

File: `supabase/migrations/236_seed_profiles.sql`

Create:

- `GLOBAL_BASELINE`

- `EU_2027_TEXTILES`

- `US_UFLPA_2026`

Rules examples (v1 placeholders but structurally correct):

- EU: `TC_REQUIRED_MODE=enforce`, require DPP validity strict

- US: `TC_REQUIRED_MODE=enforce`, forced labor flag escalation

- Global: `TC_REQUIRED_MODE=warn`

---

# **G) DPP Additions**

DPP v2/v3 includes:

- `compliance_profile_applied: {code, name}`

- `required_controls: [...]` (derived from profile rules)

- `regulatory_risk_flags` includes market-specific flags

---

# **H) Tests**

1. Trade destination EU → mode=enforce, settlement blocked if missing TC

2. Trade destination IN → warn

3. Buyer overlay tightens IN trade to enforce

4. Cert evaluation uses jurisdictional rule version (once implemented)

---

## **Acceptance Criteria**

- Every trade resolves an effective compliance profile deterministically

- TC_REQUIRED_MODE becomes market-aware (EU vs US vs baseline)

- Cert evaluation can be made rule-version-aware via profile rules

- Buyer overlays can tighten but not loosen enforcement

- DPP shows profile applied and required controls

- Tests validate EU/US/buyer overlay behavior

---

## **Next logical task (only one)**

**Next: “Profile Merge Engine (Tighten-Only Rule Composition)”** — instead of replacing base profile with buyer overlay, implement a proper merge that composes rule sets (max severity wins, unions for required certs, strictest time windows).

# **Ticket — Profile Merge Engine (Tighten-Only Rule Composition)**

## **Goal**

Implement a **deterministic “tighten-only” merge engine** so compliance overlays (buyer requirements, importer mandates, regulator mandates) can be layered without weakening baseline jurisdiction rules.

Instead of “overlay replaces base”, we compute:

- `effective_profile = merge(base_profile, overlay_profiles[])`

- Merge semantics are **monotonic**:
  - severity can only increase

  - required sets can only expand

  - time windows can only tighten

  - issuer allowlists can only restrict

This is the mechanism that prevents policy drift and “buyer loopholes”.

---

## **Deliverables**

1. Canonical merge rules (table-driven):

- `compliance_rule_catalog` (rule_key → merge_strategy)

2. Merge output store:

- `trade_compliance_effective_rules` (materialized resolved rules per trade)

3. Merge function:

- `public.merge_compliance_profiles(base_profile_id, overlay_profile_ids[])`

4. Resolver:

- `resolve_compliance_profile(trade_id)` now returns:
  - base_profile_id

  - overlays

  - merged_rules JSONB

  - effective_rule_hash

5. Update enforcement:

- `get_tc_required_mode_for_trade()` reads from merged rules

- cert rule versions read from merged rules

6. Tests:

- warn \+ enforce → enforce

- required cert sets union

- time windows tighten (min end date / max start date)

- issuer allowlist intersection

---

# **A) Rule Catalog (Merge Strategy Registry)**

File: `supabase/migrations/240_compliance_rule_catalog.sql`

`create table if not exists public.compliance_rule_catalog (`  
 `rule_key text primary key,`  
 `merge_strategy text not null check (merge_strategy in (`  
 `'max_severity',         -- off < warn < enforce`  
 `'union_set',            -- required cert types union`  
 `'intersection_set',     -- issuer allowlists intersection`  
 `'tightest_window',      -- stricter time windows`  
 `'boolean_or',           -- safety flags`  
 `'boolean_and',          -- strict gating flags`  
 `'override_if_stricter'  -- numeric thresholds: take smaller max, larger min, etc.`  
 `)),`  
 `schema_hint jsonb null,`  
 `created_at timestamptz not null default now()`  
`);`

`-- seed baseline rule keys used today`  
`insert into public.compliance_rule_catalog(rule_key, merge_strategy) values`  
 `('TC_REQUIRED_MODE', 'max_severity'),`  
 `('REQUIRE_CERT_TYPES', 'union_set'),`  
 `('CERT_RULE_VERSIONS', 'override_if_stricter'),`  
 `('ISSUER_ALLOWLIST', 'intersection_set'),`  
 `('MAX_TRACEABILITY_DEPTH', 'override_if_stricter'),`  
 `('DPP_STRICT_MODE', 'boolean_or')`  
`on conflict (rule_key) do nothing;`

---

# **B) Materialized Effective Rules Per Trade**

File: `supabase/migrations/241_trade_compliance_effective_rules.sql`

`create table if not exists public.trade_compliance_effective_rules (`  
 `trade_id uuid primary key references public.trades(id) on delete cascade,`  
 `base_profile_id uuid not null references public.compliance_profiles(id),`  
 `overlay_profile_ids uuid[] not null default '{}'::uuid[],`  
 `merged_rules jsonb not null,`  
 `merged_rule_hash text not null,`  
 `resolved_at timestamptz not null default now()`  
`);`

`revoke insert, update, delete on public.trade_compliance_effective_rules from authenticated;`  
`-- written by worker or trade transition pipeline`

---

# **C) Merge Semantics (Core Function)**

## **Severity ordering**

`off=0, warn=1, enforce=2` → take max.

File: `supabase/migrations/242_merge_compliance_profiles.sql`

`create or replace function public.severity_rank(p text)`  
`returns int language sql immutable as $$`  
 `select case p`  
 `when 'off' then 0`  
 `when 'warn' then 1`  
 `when 'enforce' then 2`  
 `else 1 -- default warn`  
 `end`  
`$$;`

`create or replace function public.merge_rules_jsonb(`  
 `base_rules jsonb,`  
 `overlay_rules jsonb`  
`) returns jsonb`  
`language plpgsql`  
`immutable`  
`as $$`  
`declare`  
 `result jsonb := coalesce(base_rules, '{}'::jsonb);`  
 `k text;`  
 `strat text;`  
 `b jsonb;`  
 `o jsonb;`  
`begin`  
 `-- iterate keys in overlay`  
 `for k in select jsonb_object_keys(coalesce(overlay_rules,'{}'::jsonb))`  
 `loop`  
 `select merge_strategy into strat`  
 `from public.compliance_rule_catalog`  
 `where rule_key = k;`

    `b := result->k;`
    `o := overlay_rules->k;`

    `if strat is null then`
      `-- unknown keys: safest default is override only if overlay is "stricter"`
      `-- but we can't know; so default to overlay replaces (v1) OR ignore.`
      `-- choose strict default: overlay replaces.`
      `result := result || jsonb_build_object(k, o);`
      `continue;`
    `end if;`

    `if strat = 'max_severity' then`
      `-- expects { "mode": "warn|enforce|off" }`
      `if public.severity_rank(coalesce(o->>'mode','warn')) > public.severity_rank(coalesce(b->>'mode','warn')) then`
        `result := result || jsonb_build_object(k, o);`
      `end if;`

    `elsif strat = 'union_set' then`
      `-- expects { "values": [..] }`
      `result := result || jsonb_build_object(`
        `k,`
        `jsonb_build_object(`
          `'values',`
          `(select jsonb_agg(distinct v) from (`
            `select jsonb_array_elements_text(coalesce(b->'values','[]'::jsonb)) as v`
            `union`
            `select jsonb_array_elements_text(coalesce(o->'values','[]'::jsonb)) as v`
          `) u)`
        `)`
      `);`

    `elsif strat = 'intersection_set' then`
      `-- expects { "values": [..] } intersection (more restrictive)`
      `result := result || jsonb_build_object(`
        `k,`
        `jsonb_build_object(`
          `'values',`
          `(select jsonb_agg(v) from (`
            `select v`
            `from (select jsonb_array_elements_text(coalesce(b->'values','[]'::jsonb)) v) bset`
            `where v in (select jsonb_array_elements_text(coalesce(o->'values','[]'::jsonb)))`
          `) i)`
        `)`
      `);`

    `elsif strat = 'tightest_window' then`
      `-- expects { "start": "...", "end": "..." } -> take later start and earlier end`
      `result := result || jsonb_build_object(`
        `k,`
        `jsonb_build_object(`
          `'start', greatest(`
            `coalesce((b->>'start')::timestamptz, 'epoch'::timestamptz),`
            `coalesce((o->>'start')::timestamptz, 'epoch'::timestamptz)`
          `),`
          `'end', least(`
            `coalesce((b->>'end')::timestamptz, 'infinity'::timestamptz),`
            `coalesce((o->>'end')::timestamptz, 'infinity'::timestamptz)`
          `)`
        `)`
      `);`

    `elsif strat = 'boolean_or' then`
      `result := result || jsonb_build_object(`
        `k,`
        `jsonb_build_object('enabled', coalesce((b->>'enabled')::boolean,false) or coalesce((o->>'enabled')::boolean,false))`
      `);`

    `elsif strat = 'boolean_and' then`
      `result := result || jsonb_build_object(`
        `k,`
        `jsonb_build_object('enabled', coalesce((b->>'enabled')::boolean,true) and coalesce((o->>'enabled')::boolean,true))`
      `);`

    `elsif strat = 'override_if_stricter' then`
      `-- numeric thresholds: default behavior depends on schema`
      `-- v1: support { "max": number } take smaller max; { "min": number } take larger min`
      `if (b ? 'max') and (o ? 'max') then`
        `result := result || jsonb_build_object(k, jsonb_build_object('max', least((b->>'max')::numeric, (o->>'max')::numeric)));`
      `elsif (o ? 'max') and not (b ? 'max') then`
        `result := result || jsonb_build_object(k, o);`
      `elsif (b ? 'min') and (o ? 'min') then`
        `result := result || jsonb_build_object(k, jsonb_build_object('min', greatest((b->>'min')::numeric, (o->>'min')::numeric)));`
      `elsif (o ? 'min') and not (b ? 'min') then`
        `result := result || jsonb_build_object(k, o);`
      `else`
        `-- fallback replace`
        `result := result || jsonb_build_object(k, o);`
      `end if;`
    `end if;`

`end loop;`

`return result;`  
`end;`  
`$$;`

`create or replace function public.merge_compliance_profiles(`  
 `p_base_profile_id uuid,`  
 `p_overlay_profile_ids uuid[]`  
`) returns jsonb`  
`language plpgsql`  
`security definer`  
`as $$`  
`declare`  
 `base jsonb := '{}'::jsonb;`  
 `merged jsonb := '{}'::jsonb;`  
 `pid uuid;`  
 `rules jsonb;`  
`begin`  
 `-- base rules`  
 `select coalesce(jsonb_object_agg(rule_key, rule_value), '{}'::jsonb)`  
 `into base`  
 `from public.compliance_profile_rules`  
 `where profile_id = p_base_profile_id;`

`merged := base;`

`-- overlays (apply in provided order)`  
 `foreach pid in array coalesce(p_overlay_profile_ids, '{}'::uuid[])`  
 `loop`  
 `select coalesce(jsonb_object_agg(rule_key, rule_value), '{}'::jsonb)`  
 `into rules`  
 `from public.compliance_profile_rules`  
 `where profile_id = pid;`

    `merged := public.merge_rules_jsonb(merged, rules);`

`end loop;`

`return merged;`  
`end;`  
`$$;`

`revoke all on function public.merge_compliance_profiles(uuid, uuid[]) from authenticated;`

---

# **D) Update Trade Resolution Pipeline**

Modify `resolve_compliance_profile(trade_id)` to return base \+ overlays list, then compute merged rules using `merge_compliance_profiles`.

Overlay sources (v1):

- buyer overlay profile(s)

- importer overlay (optional later)

- regulator override (optional later)

Then write result to `trade_compliance_effective_rules` with a hash:

- `merged_rule_hash = sha256(merged_rules::text)` (compute in Edge/worker)

---

# **E) Update Enforcement Consumers**

## **1\) TC required mode**

`get_tc_required_mode_for_trade(trade_id)` now reads from `trade_compliance_effective_rules.merged_rules->'TC_REQUIRED_MODE'->>'mode'`

## **2\) Cert rule versions**

Read from:

- `merged_rules->'CERT_RULE_VERSIONS'` (json map)

---

# **F) Tests (Must-have)**

1. **Severity max wins**

- base: warn, overlay: enforce → enforce

2. **Union required certs**

- base: \[GOTS\], overlay: \[OEKO_TEX\] → \[GOTS, OEKO_TEX\]

3. **Tightest window**

- base start=Jan1 end=Dec31

- overlay start=Mar1 end=Sep1  
   → start=Mar1 end=Sep1

4. **Issuer allowlist intersection**

- base allowlist \[A,B,C\]

- overlay allowlist \[B,C\]  
   → \[B,C\]

5. **Unknown key strict default**

- overlay replaces base for unknown keys (documented)

---

# **Acceptance Criteria**

- Base \+ overlays merge deterministically with tighten-only semantics

- Severity increases only (off\<warn\<enforce)

- Required sets union; allowlists intersect; windows tighten

- Resolved rules are materialized per trade with a stable hash

- Enforcement reads from merged rules (no ad-hoc fallbacks)

- Tests cover severity, union, intersection, windows, overrides

---

## **Next logical task (only one)**

**Next: “Compliance Context Worker (Auto-Recompute on Trade Changes)”** — whenever destination_market, buyer, importer, or overlays change, automatically recompute and persist `trade_compliance_effective_rules` (with audit events), so enforcement never uses stale policy.

# **Ticket — Compliance Context Worker (Auto-Recompute \+ Audit Events, No Stale Policy)**

## **Goal**

Guarantee enforcement always uses the **latest** jurisdiction \+ overlay policy by automatically recomputing:

- `trade_compliance_effective_rules`

whenever any of these change:

- `trades.destination_market`

- `trades.buyer_org_id`

- `trades.importer_org_id`

- buyer compliance overlays (`org_compliance_preferences`)

- compliance profile rules (`compliance_profile_rules`)

- profile activation status (`compliance_profiles.is_active`)

This closes the loop: **policy change → audit event → applied state**.

---

## **Deliverables**

1. Worker mechanism (choose one):

- **Option A (fastest):** DB trigger → enqueue in `jobs` table → Edge cron worker processes

- **Option B:** Edge function called synchronously on trade updates (less safe)

2. Job queue table:

- `compliance_recompute_jobs`

3. Worker Edge function:

- `/functions/v1/recompute_trade_compliance_context`

4. Audit events:

- `COMPLIANCE_CONTEXT_RECOMPUTE_REQUESTED`

- `COMPLIANCE_CONTEXT_RECOMPUTED_APPLIED`

5. Stale protection:

- rule hash stored; only write if changed

6. Tests:

- updating destination_market triggers recompute

- updating buyer overlay triggers recompute

- profile rule edit triggers recompute for affected trades

---

# **A) Job Queue (SQL)**

File: `supabase/migrations/250_compliance_jobs.sql`

`create table if not exists public.compliance_recompute_jobs (`  
 `id uuid primary key default gen_random_uuid(),`  
 `trade_id uuid not null references public.trades(id) on delete cascade,`  
 `reason text not null,`  
 `status text not null default 'queued' check (status in ('queued','processing','done','failed')),`  
 `attempts int not null default 0,`  
 `last_error text null,`  
 `created_at timestamptz not null default now(),`  
 `updated_at timestamptz not null default now(),`  
 `unique (trade_id, status) deferrable initially deferred`  
`);`

`create index if not exists crj_status_idx on public.compliance_recompute_jobs(status, created_at);`

`revoke insert, update, delete on public.compliance_recompute_jobs from authenticated;`  
`-- writes by triggers/service role only`

---

# **B) Triggers to Enqueue Jobs (Trade Changes)**

File: `supabase/migrations/251_enqueue_on_trade_update.sql`

`create or replace function public.enqueue_compliance_recompute(p_trade_id uuid, p_reason text)`  
`returns void`  
`language plpgsql`  
`security definer`  
`as $$`  
`begin`  
 `insert into public.compliance_recompute_jobs (trade_id, reason)`  
 `values (p_trade_id, p_reason)`  
 `on conflict do nothing;`  
`end;`  
`$$;`

`create or replace function public.trg_trade_compliance_enqueue()`  
`returns trigger`  
`language plpgsql`  
`as $$`  
`begin`  
 `if (old.destination_market is distinct from new.destination_market)`  
 `or (old.buyer_org_id is distinct from new.buyer_org_id)`  
 `or (old.importer_org_id is distinct from new.importer_org_id)`  
 `then`  
 `perform public.enqueue_compliance_recompute(new.id, 'TRADE_FIELDS_CHANGED');`  
 `end if;`  
 `return new;`  
`end;`  
`$$;`

`drop trigger if exists trg_trade_compliance_enqueue on public.trades;`  
`create trigger trg_trade_compliance_enqueue`  
`after update on public.trades`  
`for each row execute function public.trg_trade_compliance_enqueue();`

---

# **C) Triggers to Enqueue Jobs (Overlay Changes)**

When `org_compliance_preferences` changes, enqueue recompute for all trades where that org is buyer.

File: `supabase/migrations/252_enqueue_on_overlay_change.sql`

`create or replace function public.trg_overlay_enqueue()`  
`returns trigger`  
`language plpgsql`  
`as $$`  
`begin`  
 `-- enqueue all trades where this org is the buyer`  
 `insert into public.compliance_recompute_jobs (trade_id, reason)`  
 `select t.id, 'BUYER_OVERLAY_CHANGED'`  
 `from public.trades t`  
 `where t.buyer_org_id = new.org_id`  
 `on conflict do nothing;`

`return new;`  
`end;`  
`$$;`

`drop trigger if exists trg_overlay_enqueue on public.org_compliance_preferences;`  
`create trigger trg_overlay_enqueue`  
`after insert or update or delete on public.org_compliance_preferences`  
`for each row execute function public.trg_overlay_enqueue();`

(For delete, use `old.org_id` in a second trigger variant if needed.)

---

# **D) Enqueue Jobs When Profile Rules Change (High Impact)**

When `compliance_profile_rules` changes, enqueue recompute for trades using that profile (base or overlay). For v1, simplest is broad enqueue by destination_market mapping or by matching overlay usage.

File: `supabase/migrations/253_enqueue_on_profile_rule_change.sql`

`create or replace function public.trg_profile_rule_enqueue()`  
`returns trigger`  
`language plpgsql`  
`as $$`  
`begin`  
 `-- Conservative v1: enqueue ALL trades (safe but heavy)`  
 `-- Replace with targeted lookup once trade_compliance_effective_rules is populated.`  
 `insert into public.compliance_recompute_jobs (trade_id, reason)`  
 `select t.id, 'PROFILE_RULE_CHANGED'`  
 `from public.trades t`  
 `on conflict do nothing;`

`return new;`  
`end;`  
`$$;`

`drop trigger if exists trg_profile_rule_enqueue on public.compliance_profile_rules;`  
`create trigger trg_profile_rule_enqueue`  
`after insert or update or delete on public.compliance_profile_rules`  
`for each row execute function public.trg_profile_rule_enqueue();`

**Optimization v2:** enqueue only trades whose `trade_compliance_effective_rules` includes that profile in base/overlays.

---

# **E) Worker Edge Function**

## **`/functions/v1/recompute_trade_compliance_context`**

Runs on cron (every 1–5 minutes) and processes queued jobs.

### **Worker steps**

1. claim N jobs (status=queued) → set to processing (FOR UPDATE SKIP LOCKED)

2. for each trade:
   - compute base profile (jurisdiction mapping)

   - gather overlay profiles (buyer overlays, importer overlays, regulator overrides)

   - call DB merge function `merge_compliance_profiles(base, overlays)`

   - compute hash

   - upsert into `trade_compliance_effective_rules`

   - emit audit event `COMPLIANCE_CONTEXT_RECOMPUTED_APPLIED`

3. mark job done

### **Audit events**

- `COMPLIANCE_CONTEXT_RECOMPUTE_REQUESTED` (optional; can be emitted on enqueue)

- `COMPLIANCE_CONTEXT_RECOMPUTED_APPLIED` emitted by worker with:
  - trade_id

  - base_profile_id

  - overlay_profile_ids

  - merged_rule_hash

  - diff summary (optional)

---

# **F) Prevent Stale Enforcement**

Update enforcement entrypoints to always read from:

- `trade_compliance_effective_rules.merged_rules`

If missing (not computed yet):

- fail safe:
  - treat as `enforce` for high-risk operations OR

  - treat as `warn` but block settlement (your call)

**Recommended doctrine-safe fallback:**

- allow read-only operations

- block irreversible transitions until context exists

---

# **G) Tests**

1. Update trade destination_market → job enqueued → worker recomputes → hash changes

2. Add buyer overlay → worker recomputes → severity increases

3. Modify profile rules → jobs enqueued → recompute occurs

4. Recompute is idempotent:

- if merged hash unchanged, no rewrite and still emits “no-op applied” or skips event

---

# **Acceptance Criteria**

- Any trade context change triggers recompute job

- Worker recomputes merged rules and stores them with a stable hash

- Worker emits immutable audit event on apply

- Enforcement reads only from effective rules (no stale policy)

- Tests validate enqueue \+ recompute \+ apply

---

## **Next logical task (only one)**

**Next: “Hard Enforcement Gate: Block Irreversible Actions When Compliance Context Missing”** — update trade settlement / certification issuance / DPP export to refuse (or degrade to read-only) if `trade_compliance_effective_rules` is absent or stale, guaranteeing policy is always present before high-stakes actions.

# **Ticket — Hard Enforcement Gate: Block Irreversible Actions When Compliance Context Missing/Stale**

## **Goal**

Guarantee no high-stakes action runs without an applied, current compliance context:

- If `trade_compliance_effective_rules` is **missing** or **stale**, then:
  - irreversible actions are blocked

  - DPP export degrades (read-only \+ “context pending”) or refuses per profile

  - certification issuance is blocked

This prevents “policy blind spots” and aligns with Doctrine v1.2 (containment over continuity).

---

## **Deliverables**

1. Staleness model:

- `trade_compliance_effective_rules.resolved_at`

- `profile_rules_updated_at` (global marker) OR per-profile updated timestamp

2. Gate function:

- `public.require_compliance_context(trade_id, action_key)`

3. Enforcement wiring:

- trade settlement RPC

- certification issuance Edge/RPC

- DPP export Edge function

4. UI messaging:

- “Compliance context pending — governance policy recomputation in progress”

5. Tests:

- missing context blocks settlement

- stale context blocks settlement

- fresh context allows

- DPP returns “pending context” status

---

# **A) Define “Missing” and “Stale”**

## **Missing**

No row exists in `trade_compliance_effective_rules` for trade.

## **Stale (v1 pragmatic)**

Stale if:

- `resolved_at < max(profile_rules_updated_at, org_overlay_updated_at, trade_updated_at)`  
   We’ll implement a simple conservative check:

### **Add a global “rules last changed” marker**

File: `supabase/migrations/260_compliance_global_clock.sql`

`create table if not exists public.compliance_global_clock (`  
 `id int primary key default 1,`  
 `rules_updated_at timestamptz not null default now()`  
`);`

`insert into public.compliance_global_clock(id, rules_updated_at)`  
`values (1, now())`  
`on conflict (id) do nothing;`

`-- bump clock whenever profile rules change (conservative, safe)`  
`create or replace function public.bump_compliance_clock()`  
`returns trigger`  
`language plpgsql`  
`as $$`  
`begin`  
 `update public.compliance_global_clock`  
 `set rules_updated_at = now()`  
 `where id = 1;`  
 `return new;`  
`end;`  
`$$;`

`drop trigger if exists trg_bump_compliance_clock on public.compliance_profile_rules;`  
`create trigger trg_bump_compliance_clock`  
`after insert or update or delete on public.compliance_profile_rules`  
`for each row execute function public.bump_compliance_clock();`

`drop trigger if exists trg_bump_compliance_clock_overlay on public.org_compliance_preferences;`  
`create trigger trg_bump_compliance_clock_overlay`  
`after insert or update or delete on public.org_compliance_preferences`  
`for each row execute function public.bump_compliance_clock();`

This is conservative: any rule/overlay change marks all contexts potentially stale until recomputed.

---

# **B) Gate Function: `require_compliance_context`**

## **Actions to gate**

- `TRADE_SETTLE`

- `CERTIFICATION_ISSUE`

- `DPP_EXPORT` (degrade or block depending on strictness)

File: `supabase/migrations/261_require_compliance_context.sql`

`create or replace function public.require_compliance_context(`  
 `p_trade_id uuid,`  
 `p_action_key text`  
`) returns void`  
`language plpgsql`  
`security definer`  
`as $$`  
`declare`  
 `ctx record;`  
 `clk timestamptz;`  
 `is_missing boolean := false;`  
 `is_stale boolean := false;`  
 `strict boolean := false;`  
`begin`  
 `select rules_updated_at into clk`  
 `from public.compliance_global_clock`  
 `where id = 1;`

`select *`  
 `into ctx`  
 `from public.trade_compliance_effective_rules`  
 `where trade_id = p_trade_id;`

`if not found then`  
 `is_missing := true;`  
 `else`  
 `if ctx.resolved_at < clk then`  
 `is_stale := true;`  
 `end if;`  
 `end if;`

`-- strict mode: if profile says DPP_STRICT_MODE enabled, block exports too`  
 `-- v1: treat settlement + certification as always strict, DPP as degrade unless strict enabled.`  
 `if p_action_key in ('TRADE_SETTLE','CERTIFICATION_ISSUE') then`  
 `strict := true;`  
 `elsif p_action_key = 'DPP_EXPORT' then`  
 `-- if we have ctx, read strict flag`  
 `if not is_missing then`  
 `strict := coalesce((ctx.merged_rules->'DPP_STRICT_MODE'->>'enabled')::boolean,false);`  
 `end if;`  
 `end if;`

`if is_missing or is_stale then`  
 `if strict then`  
 `raise exception 'COMPLIANCE_CONTEXT_UNAVAILABLE: action=% missing=% stale=%', p_action_key, is_missing, is_stale;`  
 `else`  
 `-- for non-strict actions caller can handle degrade-to-read-only`  
 `raise notice 'COMPLIANCE_CONTEXT_UNAVAILABLE: action=% missing=% stale=%', p_action_key, is_missing, is_stale;`  
 `end if;`  
 `end if;`  
`end;`  
`$$;`

`revoke all on function public.require_compliance_context(uuid, text) from authenticated;`

---

# **C) Wire Into Enforcement Points**

## **1\) Trade settlement RPC**

Before allowing `inspected → settled`:

`perform public.require_compliance_context(p_trade_id, 'TRADE_SETTLE');`

## **2\) Certification issuance (Edge or RPC)**

Before writing certification scopes / events:

`perform public.require_compliance_context(p_trade_id, 'CERTIFICATION_ISSUE');`

(or if certification bound to batch, resolve trade via batch/trade mapping; v1 can gate by org \+ destination market until full mapping.)

## **3\) DPP export Edge endpoint**

- Call `require_compliance_context(trade_id,'DPP_EXPORT')`

- If exception thrown:
  - if strict → return 409 “Compliance context pending”

  - else → return DPP with:
    - `verdict: pending_context`

    - `risk_flags: ["COMPLIANCE_CONTEXT_PENDING"]`

    - and omit “enforced validity” fields

---

# **D) UI Messaging**

Where to show:

- Settlement button disabled with tooltip:
  - “Blocked: compliance context pending recompute”

- Certification issuance flow blocked similarly

- Regulator DPP view shows banner:
  - “Compliance context pending — export is provisional”

---

# **E) Tests**

1. **Missing context blocks settlement**

- no `trade_compliance_effective_rules` row

- transition to settled → fails with `COMPLIANCE_CONTEXT_UNAVAILABLE`

2. **Stale context blocks**

- set `ctx.resolved_at` to past

- bump global clock

- settlement blocked

3. **Fresh context passes**

- update ctx.resolved_at \= now()

- settlement allowed (assuming other guards satisfied)

4. **DPP degrade**

- strict mode off → DPP returns provisional with pending flag (Edge behavior)

---

# **Acceptance Criteria**

- Settlement and certification issuance are blocked if context missing/stale

- DPP export degrades or blocks depending on strict flag

- Global clock invalidates contexts conservatively on rule changes

- UI surfaces clear “pending context” message

- Tests validate missing \+ stale \+ fresh flows

---

## **Next logical task (only one)**

**Next: “Context Freshness Optimization (Targeted Staleness)”** — replace global clock invalidation with targeted invalidation (only trades affected by changed profile/overlay), reducing recompute load while keeping correctness.

# **Ticket — Context Freshness Optimization (Targeted Staleness, No Global Invalidation)**

## **Goal**

Replace the conservative **global compliance clock** (invalidates everything) with a **targeted staleness system** that invalidates only trades impacted by:

- a specific profile rule change

- a specific buyer overlay change

- a specific trade field change

This reduces recompute load while preserving correctness and auditability.

---

## **Deliverables**

1. Dependency tracking:

- `trade_compliance_dependencies` (trade → profile_ids \+ overlay sources)

2. Targeted invalidation:

- on profile rule change: invalidate only trades that depend on that profile

- on buyer overlay change: invalidate only trades where buyer matches that org

3. Staleness check upgrade:

- `trade_compliance_effective_rules.dep_hash` \+ `last_dep_refresh_at`

- `require_compliance_context()` checks dependency timestamps, not global clock

4. Worker updates:

- worker writes dependencies and a stable `dependency_hash`

5. Tests:

- changing EU profile invalidates only EU trades

- changing buyer overlay invalidates only trades for that buyer

- unrelated trades remain fresh

---

# **A) Add Dependency Table**

File: `supabase/migrations/270_trade_compliance_dependencies.sql`

`create table if not exists public.trade_compliance_dependencies (`  
 `trade_id uuid primary key references public.trades(id) on delete cascade,`  
 `base_profile_id uuid not null references public.compliance_profiles(id),`  
 `overlay_profile_ids uuid[] not null default '{}'::uuid[],`  
 `buyer_org_id uuid not null references public.organizations(id),`  
 `importer_org_id uuid null references public.organizations(id),`  
 `destination_market text null,`  
 `dependency_hash text not null,`  
 `deps_resolved_at timestamptz not null default now()`  
`);`

`create index if not exists tcd_base_profile_idx on public.trade_compliance_dependencies(base_profile_id);`  
`create index if not exists tcd_buyer_idx on public.trade_compliance_dependencies(buyer_org_id);`

`revoke insert, update, delete on public.trade_compliance_dependencies from authenticated;`  
`-- written by worker`

### **Dependency hash**

Compute from:

- base_profile_id

- overlay_profile_ids (sorted)

- buyer_org_id, importer_org_id, destination_market

---

# **B) Add “Profile Updated At” and “Overlay Updated At” Signals**

Instead of global clock, maintain:

### **1\) Per-profile `rules_updated_at`**

File: `supabase/migrations/271_profile_rules_updated_at.sql`

`alter table public.compliance_profiles`  
`add column if not exists rules_updated_at timestamptz not null default now();`

`create or replace function public.bump_profile_rules_updated_at()`  
`returns trigger`  
`language plpgsql`  
`as $$`  
`begin`  
 `update public.compliance_profiles`  
 `set rules_updated_at = now()`  
 `where id = coalesce(new.profile_id, old.profile_id);`  
 `return coalesce(new, old);`  
`end;`  
`$$;`

`drop trigger if exists trg_bump_profile_rules on public.compliance_profile_rules;`  
`create trigger trg_bump_profile_rules`  
`after insert or update or delete on public.compliance_profile_rules`  
`for each row execute function public.bump_profile_rules_updated_at();`

### **2\) Per-org overlay `updated_at`**

File: `supabase/migrations/272_org_overlay_updated_at.sql`

`create table if not exists public.org_compliance_overlay_clock (`  
 `org_id uuid primary key references public.organizations(id) on delete cascade,`  
 `overlays_updated_at timestamptz not null default now()`  
`);`

`create or replace function public.bump_org_overlay_clock()`  
`returns trigger`  
`language plpgsql`  
`as $$`  
`begin`  
 `insert into public.org_compliance_overlay_clock(org_id, overlays_updated_at)`  
 `values (coalesce(new.org_id, old.org_id), now())`  
 `on conflict (org_id) do update set overlays_updated_at = excluded.overlays_updated_at;`  
 `return coalesce(new, old);`  
`end;`  
`$$;`

`drop trigger if exists trg_bump_overlay_clock on public.org_compliance_preferences;`  
`create trigger trg_bump_overlay_clock`  
`after insert or update or delete on public.org_compliance_preferences`  
`for each row execute function public.bump_org_overlay_clock();`

---

# **C) Targeted Job Enqueue Improvements**

## **1\) Profile rule changes → enqueue only dependent trades**

File: `supabase/migrations/273_enqueue_targeted_profile_change.sql`

`create or replace function public.enqueue_recompute_for_profile(p_profile_id uuid, p_reason text)`  
`returns void`  
`language plpgsql`  
`security definer`  
`as $$`  
`begin`  
 `insert into public.compliance_recompute_jobs (trade_id, reason)`  
 `select d.trade_id, p_reason`  
 `from public.trade_compliance_dependencies d`  
 `where d.base_profile_id = p_profile_id`  
 `or p_profile_id = any(d.overlay_profile_ids)`  
 `on conflict do nothing;`  
`end;`  
`$$;`

`create or replace function public.trg_profile_rule_targeted_enqueue()`  
`returns trigger`  
`language plpgsql`  
`as $$`  
`begin`  
 `perform public.enqueue_recompute_for_profile(coalesce(new.profile_id, old.profile_id), 'PROFILE_RULE_CHANGED_TARGETED');`  
 `return coalesce(new, old);`  
`end;`  
`$$;`

`drop trigger if exists trg_profile_rule_enqueue on public.compliance_profile_rules;`  
`create trigger trg_profile_rule_enqueue`  
`after insert or update or delete on public.compliance_profile_rules`  
`for each row execute function public.trg_profile_rule_targeted_enqueue();`

## **2\) Buyer overlay changes already targeted by buyer org (keep as-is)**

But ensure it uses `old.org_id` on delete (separate trigger or coalesce).

---

# **D) Upgrade Worker to Write Dependencies \+ Hash**

When recomputing trade context, worker writes:

- `trade_compliance_dependencies` (base/overlays/buyer/importer/market \+ dependency_hash \+ deps_resolved_at)

- `trade_compliance_effective_rules` (merged rules \+ merged_rule_hash \+ resolved_at)

This makes staleness checks precise.

---

# **E) Upgrade `require_compliance_context()` Staleness Logic**

New staleness conditions:

1. Missing `trade_compliance_effective_rules` OR `trade_compliance_dependencies` → missing

2. Any dependency updated after `resolved_at`:
   - base profile `rules_updated_at > ctx.resolved_at`

   - any overlay profile `rules_updated_at > ctx.resolved_at`

   - buyer overlay clock `overlays_updated_at > ctx.resolved_at`

   - trade’s own relevant fields updated after ctx.resolved_at (optional; or handled by enqueue)

File: `supabase/migrations/274_require_context_targeted.sql`

`create or replace function public.is_context_stale(p_trade_id uuid)`  
`returns boolean`  
`language plpgsql`  
`stable`  
`as $$`  
`declare`  
 `ctx record;`  
 `dep record;`  
 `buyer_clock timestamptz;`  
 `max_profile_update timestamptz;`  
`begin`  
 `select * into ctx from public.trade_compliance_effective_rules where trade_id = p_trade_id;`  
 `if not found then return true; end if;`

`select * into dep from public.trade_compliance_dependencies where trade_id = p_trade_id;`  
 `if not found then return true; end if;`

`select overlays_updated_at into buyer_clock`  
 `from public.org_compliance_overlay_clock`  
 `where org_id = dep.buyer_org_id;`

`-- max profile rules_updated_at across base + overlays`  
 `select max(p.rules_updated_at) into max_profile_update`  
 `from public.compliance_profiles p`  
 `where p.id = dep.base_profile_id`  
 `or p.id = any(dep.overlay_profile_ids);`

`if max_profile_update is not null and max_profile_update > ctx.resolved_at then`  
 `return true;`  
 `end if;`

`if buyer_clock is not null and buyer_clock > ctx.resolved_at then`  
 `return true;`  
 `end if;`

`return false;`  
`end;`  
`$$;`

Then `require_compliance_context()` becomes:

- stale if `is_context_stale(trade_id)` is true.

---

# **F) Decommission Global Clock (after cutover)**

- remove `compliance_global_clock`

- remove global clock triggers

- ensure all enqueue paths are targeted

---

# **G) Tests**

1. Change EU profile rule → only EU-dependent trades enqueue \+ become stale

2. Change buyer overlay for buyer X → only trades with buyer X enqueue

3. Change unrelated profile → unrelated trades remain fresh

4. `is_context_stale()` returns correct results for base+overlay changes

---

# **Acceptance Criteria**

- Profile/overlay changes invalidate only dependent trades

- Worker writes dependencies for accurate targeting

- Staleness checks use per-profile/per-org clocks, not global clock

- Global invalidation removed without loss of safety

- Tests validate targeted invalidation correctness

---

## **Next logical task (only one)**

**Next: “Compliance Observability Dashboard (Stale/Blocked Counters)”** — add admin metrics showing: trades blocked due to missing/stale context, recompute job backlog, and time-to-freshness, so governance can operationally manage enforcement rollout.

# **Ticket — Compliance Observability Dashboard (Stale/Blocked Counters \+ Recompute Health)**

## **Goal**

Give governance/ops a **single pane of glass** to manage rollout safely by showing:

- how many trades are blocked due to missing/stale compliance context

- recompute job backlog \+ failures

- time-to-freshness (how long contexts stay stale)

- top offenders (buyers/suppliers/markets) and reasons

This prevents silent policy drift and makes enforcement operationally manageable.

---

## **Deliverables**

1. Read models (SQL views) for metrics:

- `compliance_context_status`

- `compliance_recompute_job_metrics`

- `compliance_blocked_actions`

- `compliance_time_to_freshness`

2. Minimal Governance UI page:

- `/admin/compliance/observability`

3. Optional: daily snapshot table for trend charts (later)

4. Tests:

- metrics populate correctly when jobs queued/failed

- blocked actions count increments when gates reject

---

# **A) Metrics — SQL Read Models**

## **1\) Context Status View (per trade)**

Shows: missing/stale/fresh.

File: `supabase/migrations/280_compliance_context_status_view.sql`

`create or replace view public.compliance_context_status as`  
`select`  
 `t.id as trade_id,`  
 `t.destination_market,`  
 `t.buyer_org_id,`  
 `t.supplier_org_id,`  
 `ctx.resolved_at as context_resolved_at,`  
 `dep.deps_resolved_at as deps_resolved_at,`  
 `case`  
 `when ctx.trade_id is null or dep.trade_id is null then 'missing'`  
 `when public.is_context_stale(t.id) then 'stale'`  
 `else 'fresh'`  
 `end as context_status`  
`from public.trades t`  
`left join public.trade_compliance_effective_rules ctx on ctx.trade_id = t.id`  
`left join public.trade_compliance_dependencies dep on dep.trade_id = t.id;`

---

## **2\) Recompute Job Metrics View**

Counts queued/processing/done/failed \+ oldest queue age.

File: `supabase/migrations/281_recompute_job_metrics.sql`

`create or replace view public.compliance_recompute_job_metrics as`  
`select`  
 `status,`  
 `count(*) as job_count,`  
 `min(created_at) as oldest_created_at,`  
 `max(updated_at) as newest_updated_at`  
`from public.compliance_recompute_jobs`  
`group by status;`

---

## **3\) Time-to-Freshness (Approx)**

Compute staleness duration as `now - ctx.resolved_at` for stale trades, and queue age for queued jobs.

File: `supabase/migrations/282_time_to_freshness.sql`

`create or replace view public.compliance_time_to_freshness as`  
`select`  
 `t.id as trade_id,`  
 `(now() - ctx.resolved_at) as age_since_resolved,`  
 `(select min(now() - j.created_at) from public.compliance_recompute_jobs j where j.trade_id = t.id and j.status in ('queued','processing')) as pending_job_age,`  
 `public.is_context_stale(t.id) as is_stale`  
`from public.trades t`  
`left join public.trade_compliance_effective_rules ctx on ctx.trade_id = t.id;`

---

## **4\) Blocked Actions Counter (Requires audit events)**

Add a lightweight audit event whenever a gate blocks an action:

- `COMPLIANCE_ACTION_BLOCKED`  
   Payload:

`{`  
 `"schema_version":"1.0",`  
 `"trade_id":"...",`  
 `"action":"TRADE_SETTLE|CERTIFICATION_ISSUE|DPP_EXPORT",`  
 `"reason":"MISSING_CONTEXT|STALE_CONTEXT",`  
 `"occurred_at":"..."`  
`}`

Then create a view:

File: `supabase/migrations/283_blocked_actions_view.sql`

`create or replace view public.compliance_blocked_actions as`  
`select`  
 `(payload->>'action') as action,`  
 `(payload->>'reason') as reason,`  
 `count(*) as blocked_count,`  
 `max(created_at) as last_blocked_at`  
`from public.events`  
`where event_type = 'COMPLIANCE_ACTION_BLOCKED'`  
`group by 1,2;`

---

# **B) RLS / Access (Admin Only)**

Expose these views only to governance/admin roles via your existing admin-check predicate (security definer function or role claim).

If you already use `is_global_admin()` security definer:

- apply RLS on views via underlying tables, or

- serve metrics through an Edge admin endpoint using service role.

**Fastest:** admin Edge endpoint queries with service role.

---

# **C) UI — `/admin/compliance/observability` (Minimal)**

## **Sections**

1. **Status cards**

- Trades missing context (count)

- Trades stale context (count)

- Trades fresh context (count)

- Jobs queued / failed

2. **Backlog**

- table: job id, trade_id, status, reason, age, attempts

3. **Blocked actions**

- table: action, reason, count, last_blocked_at

4. **Top offenders (optional v1)**

- group stale/missing by destination_market and buyer_org_id

---

# **D) Implementation Notes (Fastest Path)**

- Build an admin-only Edge function `get_compliance_observability()` that returns:
  - aggregated counts from views

  - lists of top stale trades \+ queued jobs

- UI calls that endpoint.

---

# **E) Tests**

1. Enqueue jobs → metrics view reflects queued count

2. Force a stale context → status view marks stale

3. Trigger a blocked settlement → `COMPLIANCE_ACTION_BLOCKED` exists and view counts it

---

# **Acceptance Criteria**

- Governance can see missing/stale/fresh trade counts

- Job backlog and failure counts visible with oldest queue age

- Blocked actions are counted by action/reason

- UI page loads quickly and is admin-restricted

- Tests confirm metrics correctness

---

## **Next logical task (only one)**

**Next: “Auto-Remediation: Priority Recompute on Block”** — when an action is blocked due to missing/stale context, automatically enqueue a high-priority recompute job (and optionally trigger an immediate worker run), reducing operator friction and time-to-freshness.

# **Ticket — Auto-Remediation: Priority Recompute on Block (Fast-to-Freshness)**

## **Goal**

When an action is blocked due to **missing/stale compliance context**, automatically:

1. enqueue a **high-priority recompute job** for that trade

2. optionally trigger an **immediate worker run** (bounded, safe)

3. record an audit trail

Outcome: fewer manual interventions, faster unlocks, safer enforcement rollout.

---

## **Deliverables**

1. Priority \+ de-dup in job queue:

- add `priority` and `run_after`

2. Block hook:

- `require_compliance_context` (or caller) calls `auto_enqueue_priority_recompute(trade_id, reason)`

3. Worker upgrade:

- processes highest priority first

- supports “fast lane” for blocked trades

4. Optional immediate run:

- Edge `kick_compliance_worker()` (admin/service only)

5. Audit events:

- `COMPLIANCE_CONTEXT_RECOMPUTE_ESCALATED`

6. Tests:

- blocked action enqueues high priority job

- de-dup prevents queue spam

- worker respects priority ordering

---

# **A) Upgrade Job Queue Schema (SQL)**

File: `supabase/migrations/290_jobs_priority.sql`

`alter table public.compliance_recompute_jobs`  
`add column if not exists priority int not null default 50,   -- 0 highest`  
`add column if not exists run_after timestamptz not null default now();`

`create index if not exists crj_priority_idx`  
`on public.compliance_recompute_jobs(status, priority, run_after, created_at);`

Priority convention:

- `0` \= emergency unblock (blocked action)

- `10` \= targeted invalidation (profile/overlay change)

- `50` \= background reconcile

---

# **B) Add Auto-Enqueue Helper (DB)**

File: `supabase/migrations/291_auto_enqueue_priority.sql`

`create or replace function public.auto_enqueue_priority_recompute(`  
 `p_trade_id uuid,`  
 `p_reason text,`  
 `p_priority int default 0`  
`) returns void`  
`language plpgsql`  
`security definer`  
`as $$`  
`begin`  
 `-- Upsert: if queued/processing exists, bump priority if current is lower priority (higher number)`  
 `insert into public.compliance_recompute_jobs (trade_id, reason, status, priority, run_after)`  
 `values (p_trade_id, p_reason, 'queued', p_priority, now())`  
 `on conflict do nothing;`

`-- If an existing queued job exists for this trade, escalate priority`  
 `update public.compliance_recompute_jobs`  
 `set priority = least(priority, p_priority),`  
 `updated_at = now()`  
 `where trade_id = p_trade_id`  
 `and status in ('queued','processing');`  
`end;`  
`$$;`

`revoke all on function public.auto_enqueue_priority_recompute(uuid, text, int) from authenticated;`

If you want strict de-dupe by trade regardless of status, enforce a unique constraint on `(trade_id)` and manage status transitions carefully. Current approach is safe and minimal.

---

# **C) Hook at Block Point**

## **Where to call it**

When blocking occurs in:

- settlement RPC

- certification issuance

- DPP export (strict mode)

### **Preferred pattern**

- Caller catches `COMPLIANCE_CONTEXT_UNAVAILABLE`

- Emits `COMPLIANCE_ACTION_BLOCKED` event

- Calls `auto_enqueue_priority_recompute(trade_id, 'BLOCKED_ACTION:'+action, 0)`

This keeps `require_compliance_context()` purely a gate, not a side-effect function.

---

# **D) Worker Priority Processing**

Update worker query:

- fetch queued jobs ordered by:
  1. `priority asc`

  2. `run_after asc`

  3. `created_at asc`

- use `FOR UPDATE SKIP LOCKED`

- bound processing batch size N (e.g., 25\)

---

# **E) Optional Immediate Worker Kick (Safe)**

Add Edge endpoint:

- `/functions/v1/kick_compliance_worker`

- requires admin/service role

- triggers recompute function once (no infinite loops)

**Safety constraints:**

- rate limit (e.g., 1 call/minute)

- only processes priority \<= 10 in the kick run

This prevents abuse.

---

# **F) Audit Event: Escalation**

Emit `COMPLIANCE_CONTEXT_RECOMPUTE_ESCALATED` with:

- trade_id

- action blocked

- reason missing/stale

- job id (if available)

---

# **G) Tests**

1. Block settlement due to missing context:

- action blocked event exists

- recompute job exists with priority 0

2. Block again within 1 minute:

- no duplicate spam; priority remains 0

- updated_at advances

3. Worker consumes priority jobs first:

- create jobs priority 50 and 0

- confirm 0 processed first

4. Kick endpoint:

- only admin can call

- processes only emergency jobs

---

# **Acceptance Criteria**

- Blocked actions automatically enqueue (or escalate) high-priority recompute jobs

- Job queue does not spam duplicates for repeated blocks

- Worker processes priority jobs first

- Optional kick endpoint exists with safety limits (if implemented)

- Audit events recorded for escalation

- Tests validate escalation \+ priority ordering

---

## **Next logical task (only one)**

**Next: “User-Facing Recovery UX (Retry After Recompute)”** — when an action is blocked, show a “Recompute in progress… Retry” UI that polls context freshness and automatically re-enables the button when the worker applies updated rules.

# **Ticket — User-Facing Recovery UX (Blocked → “Recompute in progress… Retry” → Auto-Unblock)**

## **Goal**

When a user is blocked by missing/stale compliance context, the UI should:

- clearly explain _why_ it’s blocked

- automatically trigger remediation (already: priority recompute job)

- show progress state (“Recompute in progress…”)

- poll for freshness and **auto-enable** the action once context is applied

- provide a manual “Retry now” control (safe, idempotent)

This reduces confusion and prevents humans from “working around” governance controls.

---

## **Deliverables**

1. API endpoints (read-only):

- `GET /functions/v1/compliance_context_status?trade_id=...`

- `GET /functions/v1/compliance_recompute_job_status?trade_id=...` (optional)

2. UI patterns:

- standard `BlockedActionBanner` component

- action button states: Disabled → Pending → Enabled

3. Integration points:

- trade settlement button

- certification issuance CTA

- strict DPP export CTA (if blocking)

4. Tests:

- blocked shows banner \+ retry

- polling re-enables after worker update

- retry action is idempotent

---

# **A) Backend Read APIs**

## **1\) Compliance context status endpoint**

**GET** `/functions/v1/compliance_context_status?trade_id=<uuid>`

Response:

`{`  
 `"trade_id": "...",`  
 `"status": "missing|stale|fresh",`  
 `"resolved_at": "…",`  
 `"merged_rule_hash": "…",`  
 `"latest_dependency_change_at": "…",`  
 `"recommended_action": "wait|retry|contact_admin"`  
`}`

Implementation:

- query `trade_compliance_effective_rules`

- query `trade_compliance_dependencies`

- compute `is_context_stale(trade_id)`

- return status

## **2\) Recompute job status endpoint (optional but useful)**

**GET** `/functions/v1/compliance_recompute_job_status?trade_id=<uuid>`

Response:

`{`  
 `"trade_id": "...",`  
 `"has_queued_job": true,`  
 `"status": "queued|processing|done|failed",`  
 `"priority": 0,`  
 `"age_seconds": 42,`  
 `"last_error": null`  
`}`

---

# **B) Standard UI Component: `BlockedActionBanner`**

## **Props**

`{`  
 `title: string;`  
 `reason: "missing_context" | "stale_context" | "tc_missing" | ...;`  
 `tradeId: string;`  
 `actionKey: "TRADE_SETTLE" | "CERTIFICATION_ISSUE" | "DPP_EXPORT";`  
 `onRetry: () => Promise<void>;`  
`}`

## **Behavior**

- Shows:
  - “Compliance context pending recompute”

  - “We’re applying the latest jurisdiction & buyer rules”

- CTA buttons:
  - **Retry now** (calls original action; safe \+ idempotent)

  - optional: “View status” (opens drawer with context \+ job status)

---

# **C) Polling Strategy (Safe \+ Efficient)**

When blocked due to missing/stale context:

1. start polling `compliance_context_status` every 2–3s for first 15s

2. then back off to 5–10s

3. stop after:
   - status becomes `fresh` → enable action

   - job status becomes `failed` → show “needs admin”

   - timeout (e.g., 2 minutes) → show manual instructions

**Key:** polling only when blocked, not always.

---

# **D) Auto-Unblock Flow (Trade Settlement Example)**

### **When user clicks “Settle”**

- Call settlement RPC

- If returns `COMPLIANCE_CONTEXT_UNAVAILABLE`:
  - show banner

  - call auto-remediation already exists (priority recompute)

  - start polling

  - when fresh → re-enable “Settle” button automatically

  - optionally auto-retry once (careful) or require click

**Recommended:** auto-enable only; user clicks again. Keeps intent explicit.

---

# **E) “Retry Now” semantics**

Retry should be:

- idempotent (original RPC already should be)

- safe if recompute is still running:
  - if still stale → keep banner and continue polling

- rate-limited client-side (disable retry for 2 seconds after click)

---

# **F) UI Integration Points**

1. **Trade settlement**

- show banner above settlement button area

2. **Certification issuance**

- block “Verify Certification” submit with same banner

3. **DPP export**

- if strict mode blocks export:
  - show banner with “Export will resume when context is fresh”

- if non-strict mode degrades:
  - show info banner instead (not blocked)

---

# **G) Tests**

## **Frontend (component tests)**

1. blocked → banner renders \+ button disabled

2. polling to fresh → button becomes enabled

3. retry click while stale → remains blocked \+ no crash

## **E2E (happy path)**

- simulate stale context

- action blocked

- worker updates context

- UI unblocks within polling window

---

# **Acceptance Criteria**

- Blocked actions show a consistent banner with clear reason

- UI polls context freshness only when blocked

- Action auto-enables when context becomes fresh

- Retry is safe and idempotent

- Works for settlement \+ certification \+ strict DPP export

- Tests validate unblock behavior

---

## **Next logical task (only one)**

**Next: “Unified Block Reason Codes (Backend → UI Contract)”** — standardize backend error codes and payloads (e.g., `COMPLIANCE_CONTEXT_UNAVAILABLE`, `TC_REQUIRED_MODE_BLOCKED`) so UI can render consistent recovery flows without parsing strings.

# **Ticket — Unified Block Reason Codes (Backend → UI Contract)**

## **Goal**

Standardize all enforcement failures into **machine-readable error codes \+ structured payloads** so the UI can:

- render consistent banners

- trigger the right remediation (recompute, issue TC, request approval)

- avoid parsing exception strings

- support analytics and governance metrics

This turns doctrine enforcement into a stable API contract.

---

## **Deliverables**

1. Canonical error code registry (shared TS pack):

- `BlockCode` enum \+ type definitions

2. Backend error format (Edge \+ RPC):

- consistent JSON error response

- consistent Postgres exception mapping

3. Block reason payload schemas:

- per code, required fields

4. Update enforcement points:

- settlement RPC

- certification issuance

- DPP export

- record_handoff \+ TC issuance

5. Tests:

- each blocked scenario returns correct code \+ payload

- UI uses code mapping (no string parsing)

---

# **A) Canonical Block Codes (v1)**

Create a single enum list (doctrine-aligned):

### **Compliance context**

- `COMPLIANCE_CONTEXT_MISSING`

- `COMPLIANCE_CONTEXT_STALE`

### **Kill-switch**

- `PLATFORM_READ_ONLY`

- `PLATFORM_APPROVAL_ONLY`

- `TENANT_READ_ONLY`

- `TENANT_APPROVAL_ONLY`

- `DOMAIN_FROZEN` (trade/compliance/ai)

### **Custody / TC enforcement**

- `TC_COVERAGE_GAP`

- `TC_REQUIRED_MODE_ENFORCED`

### **Maker–Checker**

- `MAKER_CHECKER_REQUIRED`

- `CHECKER_MISMATCH`

### **Authorization / allowlist**

- `NOT_ALLOWLISTED`

- `ROLE_INSUFFICIENT`

- `ORG_SCOPE_VIOLATION`

### **Data validity**

- `SCHEMA_INVALID`

- `STATE_TRANSITION_INVALID`

- `PREREQUISITE_EVENT_MISSING`

- `LINEAGE_INVALID`

---

# **B) Standard Error Response Shape**

All Edge functions return (HTTP 4xx/5xx):

`{`  
 `"ok": false,`  
 `"code": "TC_REQUIRED_MODE_ENFORCED",`  
 `"message": "Settlement blocked: TC coverage required for all custody boundaries.",`  
 `"details": {`  
 `"trade_id": "…",`  
 `"missing_boundary_ids": ["…"],`  
 `"mode": "enforce",`  
 `"next_actions": ["ISSUE_TC", "ATTACH_TC", "RETRY_AFTER_RECOMPUTE"]`  
 `}`  
`}`

**Rules**

- `code` is mandatory and stable

- `details` is code-specific and versioned where needed

- `message` is for humans, not parsing

---

# **C) Shared Types (Schema Pack)**

Add to shared “schema pack” (importable by Next.js \+ Edge):

`contracts/blockCodes.ts`

`export const BlockCode = {`  
 `COMPLIANCE_CONTEXT_MISSING: "COMPLIANCE_CONTEXT_MISSING",`  
 `COMPLIANCE_CONTEXT_STALE: "COMPLIANCE_CONTEXT_STALE",`  
 `TC_COVERAGE_GAP: "TC_COVERAGE_GAP",`  
 `TC_REQUIRED_MODE_ENFORCED: "TC_REQUIRED_MODE_ENFORCED",`  
 `MAKER_CHECKER_REQUIRED: "MAKER_CHECKER_REQUIRED",`  
 `DOMAIN_FROZEN: "DOMAIN_FROZEN",`  
 `SCHEMA_INVALID: "SCHEMA_INVALID",`  
 `STATE_TRANSITION_INVALID: "STATE_TRANSITION_INVALID",`  
 `PREREQUISITE_EVENT_MISSING: "PREREQUISITE_EVENT_MISSING",`  
 `NOT_ALLOWLISTED: "NOT_ALLOWLISTED",`  
 `ROLE_INSUFFICIENT: "ROLE_INSUFFICIENT",`  
 `ORG_SCOPE_VIOLATION: "ORG_SCOPE_VIOLATION"`  
`} as const;`

`export type BlockCode = (typeof BlockCode)[keyof typeof BlockCode];`

`export type BlockError = {`  
 `ok: false;`  
 `code: BlockCode;`  
 `message: string;`  
 `details?: Record<string, unknown> & { schema_version?: string };`  
`};`

---

# **D) Postgres → Edge Error Mapping (Critical)**

### **Problem**

PL/pgSQL `raise exception` returns strings and SQLSTATE codes. We need a structured mapping.

### **Solution (fast, robust)**

Adopt a convention:

- raise exceptions with **SQLSTATE** \+ JSON payload in message OR

- use `RAISE EXCEPTION USING ERRCODE = 'TX001', MESSAGE = '…', DETAIL = 'json…'`

**Recommended convention**

- Use `ERRCODE` for coarse category

- Use `DETAIL` for JSON payload that includes `code`

Example in RPC:

`raise exception using`  
 `errcode = 'P0001',`  
 `message = 'Blocked',`  
 `detail = jsonb_build_object(`  
 `'code','TC_REQUIRED_MODE_ENFORCED',`  
 `'schema_version','1.0',`  
 `'trade_id', p_trade_id::text,`  
 `'missing_boundary_ids', v_missing_ids`  
 `)::text;`

Then Edge catches PostgREST error, parses `detail` JSON.

---

# **E) Implement Helper: `raise_block(code, details, message?)`**

File: `supabase/migrations/300_raise_block_helper.sql`

`create or replace function public.raise_block(`  
 `p_code text,`  
 `p_details jsonb,`  
 `p_message text default 'Blocked by policy'`  
`) returns void`  
`language plpgsql`  
`immutable`  
`as $$`  
`begin`  
 `raise exception using`  
 `errcode = 'P0001',`  
 `message = p_message,`  
 `detail = jsonb_build_object(`  
 `'schema_version','1.0',`  
 `'code', p_code,`  
 `'details', coalesce(p_details,'{}'::jsonb)`  
 `)::text;`  
`end;`  
`$$;`

Now enforcement code becomes:

`perform public.raise_block(`  
 `'COMPLIANCE_CONTEXT_STALE',`  
 `jsonb_build_object('trade_id', p_trade_id::text, 'action','TRADE_SETTLE'),`  
 `'Compliance context stale'`  
`);`

---

# **F) Update Enforcement Points (Examples)**

## **1\) `require_compliance_context`**

Instead of generic exception, call `raise_block`:

- missing → `COMPLIANCE_CONTEXT_MISSING`

- stale → `COMPLIANCE_CONTEXT_STALE`

## **2\) Settlement blocked by TC_REQUIRED_MODE**

- `TC_REQUIRED_MODE_ENFORCED` with boundary ids

## **3\) Missing TC coverage (warn mode)**

Not blocked. Return `ok: true` \+ warnings array:

`{ "ok": true, "warnings": [{ "code":"TC_COVERAGE_GAP", "details": {...}}] }`

---

# **G) UI Consumption Contract**

Frontend mapping table:

- code → banner text \+ CTA set

- never inspect raw messages

Example:

- `COMPLIANCE_CONTEXT_*` → show recompute-in-progress panel \+ poll

- `TC_REQUIRED_MODE_ENFORCED` → show “Issue/Attach TC” panel

- `MAKER_CHECKER_REQUIRED` → show “Await approval” \+ link to governance console

---

# **H) Tests**

1. Settlement with missing context returns:

- HTTP 409 (or 412\)

- `code=COMPLIANCE_CONTEXT_MISSING`

- details include trade_id \+ action

2. Settlement blocked by TC enforced:

- code=TC_REQUIRED_MODE_ENFORCED

- details include missing_boundary_ids

3. Schema invalid:

- code=SCHEMA_INVALID with ajv errors summary

4. Ensure UI uses code mapping:

- snapshot test renders correct banner for each code

---

# **Acceptance Criteria**

- Every blocked enforcement path returns `{ok:false, code, message, details}`

- DB uses `raise_block()` to emit structured codes

- Edge functions parse and forward structured errors consistently

- UI renders flows based on codes (no string parsing)

- Tests validate codes \+ payloads for key enforcement paths

---

## **Next logical task (only one)**

**Next: “Warning Channel Standard (ok:true \+ warnings\[\])”** — standardize non-blocking risk signals (TC gaps, provisional DPP, low confidence AI) so clients can show consistent nudges without treating them as errors.

# **Ticket — Warning Channel Standard (`ok:true` \+ `warnings[]`) for Non-Blocking Risk Signals**

## **Goal**

Standardize “soft” enforcement and risk signals into a consistent response channel so the UI can:

- show nudges/banners without treating them as failures

- render consistent “provisional / needs action” states

- log analytics and governance metrics

- avoid string parsing

This complements block codes: **errors block**, **warnings inform**.

---

## **Deliverables**

1. Canonical warning code registry (shared TS pack)

2. Standard response envelope:

- `ok:true` with `warnings?: Warning[]`

3. DB \+ Edge helpers:

- `append_warning()` (Edge)

- optional `WARNING_EMITTED` audit event

4. Adoption across key endpoints:

- DPP export

- record_handoff

- issue/attach TC

- AI scoring endpoints (later)

5. Tests:

- endpoints return warnings consistently

- UI maps warnings to banners

---

# **A) Warning Codes (v1)**

### **Custody / TC**

- `TC_COVERAGE_GAP` (one or more custody boundaries uncovered)

- `TC_EXPIRING_SOON` (valid_to near)

- `TC_SCOPE_TOO_BROAD` (trade-scoped when boundary-scoped expected — informational)

### **DPP / Traceability**

- `DPP_PROVISIONAL_CONTEXT_PENDING` (context missing/stale but non-strict export allowed)

- `LINEAGE_INCOMPLETE` (missing edges \-\> DPP invalid or provisional depending on mode)

- `CERT_COVERAGE_PARTIAL` (coverage incomplete but allowed to proceed in warn mode)

### **AI (non-blocking)**

- `AI_LOW_CONFIDENCE`

- `AI_DRIFT_SUSPECTED`

- `AI_EXPLAINABILITY_MISSING` (reasoning_hash missing where expected)

### **Governance / Ops**

- `RECOMPUTE_QUEUED` (auto-remediation triggered)

- `FEATURE_FLAG_DEGRADED` (domain throttled but not blocked)

---

# **B) Standard Warning Type (Shared Contract)**

`contracts/warnings.ts`

`export const WarningCode = {`  
 `TC_COVERAGE_GAP: "TC_COVERAGE_GAP",`  
 `DPP_PROVISIONAL_CONTEXT_PENDING: "DPP_PROVISIONAL_CONTEXT_PENDING",`  
 `LINEAGE_INCOMPLETE: "LINEAGE_INCOMPLETE",`  
 `CERT_COVERAGE_PARTIAL: "CERT_COVERAGE_PARTIAL",`  
 `AI_LOW_CONFIDENCE: "AI_LOW_CONFIDENCE",`  
 `RECOMPUTE_QUEUED: "RECOMPUTE_QUEUED"`  
`} as const;`

`export type WarningCode = (typeof WarningCode)[keyof typeof WarningCode];`

`export type Warning = {`  
 `code: WarningCode;`  
 `message: string;`  
 `details?: Record<string, unknown> & { schema_version?: string };`  
`};`

---

# **C) Standard Response Envelope (All endpoints)**

## **Success with warnings**

`{`  
 `"ok": true,`  
 `"data": { ... },`  
 `"warnings": [`  
 `{`  
 `"code": "TC_COVERAGE_GAP",`  
 `"message": "1 custody boundary is missing TC coverage.",`  
 `"details": {`  
 `"schema_version": "1.0",`  
 `"trade_id": "…",`  
 `"missing_boundary_ids": ["…"],`  
 `"next_actions": ["ISSUE_TC", "ATTACH_TC"]`  
 `}`  
 `}`  
 `]`  
`}`

## **Success without warnings**

`{ "ok": true, "data": { ... } }`

**Rule:** warnings never change `ok:true`.

---

# **D) Backend Implementation Pattern**

## **Edge helper (recommended)**

In each Edge function:

- maintain a `warnings: Warning[] = []`

- append warnings based on checks

- return `{ ok:true, data, warnings }` if any

Example helpers:

`function addWarning(warnings, w) {`  
 `warnings.push({ ...w, details: { schema_version: "1.0", ...(w.details ?? {}) } });`  
`}`

---

# **E) Endpoint Adoption (Minimum Set)**

## **1\) `record_handoff()`**

After projecting custody boundary:

- if `is_tc_covering_boundary(boundary_id) = false`:
  - add warning `TC_COVERAGE_GAP`

  - include `boundary_id`, `trade_id`, `next_actions`

Also add `RECOMPUTE_QUEUED` warning if you queued a recompute job (optional).

## **2\) `dpp_export()`**

If strict mode is OFF and context is missing/stale:

- return DPP with warning `DPP_PROVISIONAL_CONTEXT_PENDING`

- DPP verdict becomes `provisional`

If lineage incomplete but warn-mode allows viewing:

- warning `LINEAGE_INCOMPLETE`

- include missing edges list (bounded)

## **3\) `issue_tc_for_boundary()`**

If TC is expiring soon:

- `TC_EXPIRING_SOON` warning

---

# **F) Optional Audit Event for Warnings (Not Required v1)**

If you want governance metrics:

- emit `WARNING_EMITTED` event only for **high-value warnings**:
  - TC_COVERAGE_GAP

  - LINEAGE_INCOMPLETE

  - DPP_PROVISIONAL_CONTEXT_PENDING  
     This keeps event ledger lean.

---

# **G) UI Mapping Rules**

UI should treat warnings like:

- banners (yellow/info)

- inline chips next to timeline items

- “Resolve” CTAs if `next_actions` present

No retries needed (that’s for block codes).

---

# **H) Tests**

1. `record_handoff()` without TC coverage:

- ok:true

- warnings\[0\].code \= TC_COVERAGE_GAP

2. `dpp_export()` with context stale but non-strict:

- ok:true

- warning \= DPP_PROVISIONAL_CONTEXT_PENDING

3. `dpp_export()` strict mode:

- ok:false with block code (already handled by block contract)

4. Ensure warnings always include schema_version and stable details shape.

---

# **Acceptance Criteria**

- Shared warning code registry exists (Next \+ Edge)

- All success responses may include `warnings[]`

- record_handoff and dpp_export emit warnings appropriately

- UI consumes warnings by code, never by message parsing

- Tests validate warnings for key flows

---

## **Next logical task (only one)**

**Next: “Unified Response Envelope Standard (ok/data/warnings/error)”** — formalize a single response wrapper used across all Edge functions and client SDK calls, so every endpoint looks identical to the frontend and contract tests become trivial.

# **Ticket — Unified Response Envelope Standard (`ok/data/warnings/error`) Across Edge \+ Client SDK**

## **Goal**

Make every API call look identical to the frontend and contract tests:

- no ad-hoc shapes per endpoint

- consistent handling of:
  - success data

  - warnings

  - block errors

  - unexpected failures

- shared types imported by:
  - Next.js app (TS)

  - Supabase Edge (Deno)

This becomes the “wire contract” for TexQtic.

---

## **Deliverables**

1. Shared contract package:

- `ApiResponse<T>` type

- `BlockError` type (from previous ticket)

- `Warning[]` type (from previous ticket)

2. Edge response helper:

- `ok(data, warnings?)`

- `fail(blockError, httpStatus?)`

- `unexpected(err)`

3. Client SDK wrapper:

- `callEdge<T>(fn, body)` that returns `ApiResponse<T>`

- helpers:
  - `isOk(res)`

  - `getDataOrThrow(res)`

  - `getWarnings(res)`

4. Contract tests:

- assert every Edge function returns this envelope

5. Migrate top endpoints first:

- `emit_event` (if still used)

- `record_handoff`

- `issue_tc_for_boundary`

- `dpp_export`

- `transition_trade_state` (if Edge proxied; otherwise map PostgREST errors similarly)

---

# **A) Canonical Response Types (Shared Schema Pack)**

`contracts/apiResponse.ts`

`import type { Warning } from "./warnings";`  
`import type { BlockError } from "./blockCodes";`

`export type ApiSuccess<T> = {`  
 `ok: true;`  
 `data: T;`  
 `warnings?: Warning[];`  
`};`

`export type ApiFailure = {`  
 `ok: false;`  
 `error: BlockError;`  
`};`

`export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;`

`export function isOk<T>(r: ApiResponse<T>): r is ApiSuccess<T> {`  
 `return r.ok === true;`  
`}`

---

# **B) Edge Helpers (Deno)**

`edge/_shared/response.ts`

`import { ApiResponse } from "../../contracts/apiResponse.ts";`  
`import { Warning } from "../../contracts/warnings.ts";`  
`import { BlockError } from "../../contracts/blockCodes.ts";`

`export function ok<T>(data: T, warnings?: Warning[]): Response {`  
 `const body: ApiResponse<T> = warnings?.length`  
 `? { ok: true, data, warnings }`  
 `: { ok: true, data };`  
 `return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });`  
`}`

`export function fail<T = never>(error: BlockError, status = 409): Response {`  
 `const body: ApiResponse<T> = { ok: false, error };`  
 `return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });`  
`}`

`export function unexpected(err: unknown): Response {`  
 `const body = {`  
 `ok: false,`  
 `error: {`  
 `ok: false,`  
 `code: "UNEXPECTED_ERROR",`  
 `message: "Unexpected error",`  
 `details: { schema_version: "1.0" }`  
 `}`  
 `};`  
 `return new Response(JSON.stringify(body), { status: 500, headers: { "content-type": "application/json" } });`  
`}`

Add `UNEXPECTED_ERROR` to `BlockCode` (or keep it Edge-only and map it in UI).

---

# **C) Standard Edge Function Pattern**

Every Edge function does:

1. validate auth

2. validate schema (ajv)

3. do logic

4. return `ok(data, warnings)` OR `fail(blockError,status)` OR `unexpected(err)`

And never returns raw JSON.

---

# **D) Client SDK Wrapper (Next.js)**

`sdk/edgeClient.ts`

`import type { ApiResponse } from "../contracts/apiResponse";`  
`import type { BlockError } from "../contracts/blockCodes";`

`export async function callEdge<T>(`  
 `fn: string,`  
 `body?: unknown,`  
 `init?: RequestInit`  
`): Promise<ApiResponse<T>> {`  
 ``const res = await fetch(`/api/edge/${fn}`, {``  
 `method: "POST",`  
 `headers: { "content-type": "application/json" },`  
 `body: body ? JSON.stringify(body) : "{}",`  
 `...init`  
 `});`

`const json = (await res.json()) as ApiResponse<T>;`

`// Safety: if server didn't conform, normalize`  
 `if (typeof json !== "object" || json === null || !("ok" in json)) {`  
 `const error: BlockError = {`  
 `ok: false,`  
 `code: "UNEXPECTED_ERROR" as any,`  
 `message: "Non-conforming response envelope",`  
 `details: { schema_version: "1.0", http_status: res.status }`  
 `};`  
 `return { ok: false, error };`  
 `}`

`return json;`  
`}`

---

# **E) Migration Plan (Fastest \+ Safe)**

1. Update one endpoint (`record_handoff`) to use the envelope

2. Update client call path to use `callEdge()`

3. Add contract test that rejects non-envelope shapes

4. Migrate remaining endpoints

---

# **F) Contract Tests (Must-have)**

Write a small suite that:

- calls each Edge function with valid payload → expects `{ok:true,data}`

- calls each with invalid schema → expects `{ok:false,error.code=SCHEMA_INVALID}`

- calls each with policy block → expects `{ok:false,error.code in BlockCode}`

---

# **Acceptance Criteria**

- Shared `ApiResponse<T>` is the only response type used

- Edge helpers enforce envelope consistently

- Client SDK consumes envelope consistently

- Contract tests ensure every endpoint conforms

- At least 3 critical endpoints migrated and passing tests

---

## **Next logical task (only one)**

**Next: “Edge Gateway Route in Next.js (/api/edge/\*) \+ Auth Forwarding”** — implement a single Next.js route handler that forwards requests to Supabase Edge functions, attaches the user session JWT, and guarantees every call passes through the same envelope-aware client path.

# **Ticket — Next.js Edge Gateway (`/api/edge/*`) \+ Auth Forwarding (Single Pipe for All Edge Calls)**

## **Goal**

Create **one** Next.js route handler that:

- forwards requests to Supabase Edge Functions

- attaches the **user’s JWT** (Auth forwarding)

- normalizes responses into the **Unified Response Envelope**

- becomes the **only** client entrypoint for calling Edge functions

Outcome: production discipline \+ consistent auth \+ consistent contracts.

---

## **Deliverables**

1. Next.js route handler:

- `app/api/edge/[fn]/route.ts`

2. JWT extraction:

- from Supabase Auth cookies/session

3. Request forwarding:

- to `${SUPABASE_URL}/functions/v1/${fn}`

4. Response normalization:

- guarantees `{ok,data,warnings}` or `{ok:false,error}`

5. Local dev ergonomics:

- supports staging vs prod function base URL

6. Tests:

- valid call forwarded with auth

- unauthorized returns `ok:false` envelope

- non-conforming Edge response gets normalized to `UNEXPECTED_ERROR`

---

# **A) Environment Variables**

Add to Next.js env:

- `NEXT_PUBLIC_SUPABASE_URL`

- `SUPABASE_ANON_KEY` (server-side optional, not needed if forwarding user JWT)

- `SUPABASE_FUNCTIONS_URL` (optional override; else derive from Supabase URL)

Example:

- `SUPABASE_FUNCTIONS_URL = https://<project>.supabase.co/functions/v1`

---

# **B) Route Handler Implementation (App Router)**

`app/api/edge/[fn]/route.ts`

`import { NextRequest } from "next/server";`  
`import { createServerClient } from "@supabase/ssr";`  
`import { cookies } from "next/headers";`

`type ApiFailure = {`  
 `ok: false;`  
 `error: { ok: false; code: string; message: string; details?: any };`  
`};`

`function fail(code: string, message: string, details?: any, status = 401): Response {`  
 `const body: ApiFailure = {`  
 `ok: false,`  
 `error: { ok: false, code, message, details: { schema_version: "1.0", ...(details ?? {}) } }`  
 `};`  
 `return new Response(JSON.stringify(body), {`  
 `status,`  
 `headers: { "content-type": "application/json" }`  
 `});`  
`}`

`export async function POST(req: NextRequest, ctx: { params: Promise<{ fn: string }> }) {`  
 `const { fn } = await ctx.params;`

`// 1) Get user JWT from Supabase session (server)`  
 `const cookieStore = await cookies();`  
 `const supabase = createServerClient(`  
 `process.env.NEXT_PUBLIC_SUPABASE_URL!,`  
 `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // ok for SSR client; JWT is what matters`  
 `{ cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }`  
 `);`

`const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();`  
 `const accessToken = sessionData?.session?.access_token;`

`if (!accessToken) {`  
 `return fail("UNAUTHENTICATED", "No active session", { fn }, 401);`  
 `}`

`// 2) Forward body to Edge function`  
 `const functionsBase =`  
 `process.env.SUPABASE_FUNCTIONS_URL ??`  
 `` `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`; ``

``const url = `${functionsBase}/${encodeURIComponent(fn)}`;``

`let payload: any = {};`  
 `try {`  
 `payload = await req.json();`  
 `} catch {`  
 `// allow empty body`  
 `}`

`let edgeRes: Response;`  
 `try {`  
 `edgeRes = await fetch(url, {`  
 `method: "POST",`  
 `headers: {`  
 `"content-type": "application/json",`  
 `` authorization: `Bearer ${accessToken}` ``  
 `},`  
 `body: JSON.stringify(payload ?? {})`  
 `});`  
 `} catch (e: any) {`  
 `return fail("EDGE_UNREACHABLE", "Edge function call failed", { fn, error: String(e) }, 502);`  
 `}`

`// 3) Normalize Edge response to unified envelope`  
 `const text = await edgeRes.text();`  
 `let json: any;`  
 `try {`  
 `json = text ? JSON.parse(text) : null;`  
 `} catch {`  
 `return fail("UNEXPECTED_ERROR", "Non-JSON response from Edge", { fn, status: edgeRes.status, text }, 502);`  
 `}`

`// If already conforming envelope, pass through status (or normalize status)`  
 `if (json && typeof json === "object" && typeof json.ok === "boolean") {`  
 `return new Response(JSON.stringify(json), {`  
 `status: edgeRes.status,`  
 `headers: { "content-type": "application/json" }`  
 `});`  
 `}`

`// Not conforming -> normalize`  
 `return fail("UNEXPECTED_ERROR", "Non-conforming Edge response envelope", { fn, status: edgeRes.status, json }, 502);`  
`}`

Notes:

- This uses the user’s JWT; Edge functions can enforce RLS \+ tenant scoping.

- If you prefer, you can also forward `x-texqtic-trace-id` for observability.

---

# **C) Client Usage (Single Pipe)**

All client calls become:

`await callEdge<T>("record_handoff", body);`

Where `callEdge` hits `/api/edge/record_handoff` (not Supabase directly).

---

# **D) Security Rules**

- Only allow `POST` by default.

- Optional allowlist of function names to avoid arbitrary invocation:
  - `const ALLOWED = new Set(["record_handoff","issue_tc_for_boundary","dpp_export", ...])`

- If not in allowlist → return `ok:false` with `code=FUNCTION_NOT_ALLOWED`

---

# **E) Tests**

## **1\) Unauthenticated**

- no session cookie

- POST `/api/edge/record_handoff` returns:
  - `{ok:false,error.code="UNAUTHENTICATED"}`

## **2\) Happy path forward**

- mock session

- mock Edge response envelope

- ensure gateway returns same envelope

## **3\) Non-conforming Edge response**

- Edge returns `{foo:"bar"}`

- gateway returns `{ok:false,error.code="UNEXPECTED_ERROR"}`

---

# **Acceptance Criteria**

- `/api/edge/[fn]` forwards requests to Edge with user JWT

- Gateway returns unified envelope always

- Client SDK uses gateway exclusively

- Allowlist optional but recommended

- Tests validate auth forwarding \+ normalization

---

## **Next logical task (only one)**

**Next: “End-to-End Contract Test Harness (Gateway \+ Edge \+ DB)”** — write a single test runner that hits `/api/edge/*` and verifies: schema validation, RLS scoping, block codes, warnings, and success envelopes for your critical flows (handoff → TC gap → issue TC → settlement).

# **Ticket — End-to-End Contract Test Harness (Gateway \+ Edge \+ DB)**

## **Goal**

Create a single automated test runner that verifies the **full contract** across:

**Next.js Gateway** → **Supabase Edge Functions** → **DB/RLS** → **Unified Envelope**

And covers the critical flow:

1. `record_handoff` → returns `ok:true` \+ `warnings[]` (TC gap)

2. `issue_tc_for_boundary` → returns `ok:true`

3. `transition_trade_state` (or `settle_trade`) → succeeds only when context \+ TC coverage satisfied

Also tests:

- schema validation failures (`SCHEMA_INVALID`)

- org scoping/RLS violations (`ORG_SCOPE_VIOLATION`)

- allowlist failures (`NOT_ALLOWLISTED`)

- kill-switch blocks (`DOMAIN_FROZEN`)

- compliance-context blocks (`COMPLIANCE_CONTEXT_MISSING|STALE`)

- envelope conformity for all endpoints

---

## **Deliverables**

1. Test runner package:

- `tests/e2e/contract-harness.test.ts`

2. Deterministic seed fixtures:

- orgs: supplier, buyer, logistics_partner, certifier

- users for each org (session tokens)

- one trade \+ one batch

- allowlist logistics org for handoff actions

- compliance context present (or intentionally absent per test)

3. Helper library:

- `asUser(user).post(fn, body)` hitting `/api/edge/${fn}`

- assertions: `expectOk`, `expectFail(code)`, `expectWarnings([...])`

4. CI-ready config:

- points to staging Supabase project or local (if you run supabase locally)

5. A “golden contract snapshot”:

- ensures response envelope shape never drifts

---

# **A) Test Environment Strategy**

## **Option A (recommended for speed): Staging Supabase Project**

- run migrations on staging

- tests use real DB \+ Edge

- CI uses:
  - `SUPABASE_STAGING_URL`

  - `TEST_USER_*` credentials or service role to create users once

## **Option B: Local Supabase**

- more complex but fully isolated

- fine later; start with staging

---

# **B) Required Test Setup Artifacts (Fixtures)**

### **Seed entities (either via SQL seed or service-role setup script)**

- `organizations`:
  - supplier_org

  - buyer_org

  - logistics_org

  - certifier_org

- users:
  - supplier_user (org_id=supplier)

  - buyer_user

  - logistics_user

  - certifier_user

- trade:
  - buyer_org_id \= buyer

  - supplier_org_id \= supplier

  - destination_market \= EU (to exercise strictness)

- batch:
  - batch belongs to supplier org

- allowlist:
  - trade_logistics_allowlist(trade, logistics_org, actions=\[pickup,delivery\])

### **Compliance context**

Two modes:

- “present & fresh” for happy path tests

- “missing/stale” for block tests

---

# **C) Test Helper API**

`tests/e2e/helpers.ts`

- `loginAs(role)` returns cookie jar/session for Next.js (or uses Playwright request context)

- `postEdge(fn, body, cookie)` calls `POST /api/edge/${fn}`

- `expectEnvelope(res)`

- `expectOk(res)`

- `expectFail(res, code)`

- `expectWarning(res, code)`

**Important:** Always validate:

- `res.ok` boolean exists

- `ok:true` → has `data`

- `ok:false` → has `error.code`

---

# **D) Contract Test Cases (Must-have)**

## **1\) Envelope conformity smoke (all endpoints)**

For each function in allowlist:

- call with minimal invalid body

- assert response is unified envelope

## **2\) Schema validation**

Call `record_handoff` with missing `trade_id`:

- expect `ok:false`

- `error.code = SCHEMA_INVALID`

- `error.details` contains field errors (bounded)

## **3\) RLS/org scoping**

As buyer_user, try to issue TC for supplier boundary (if policy disallows):

- expect `ROLE_INSUFFICIENT` or `ORG_SCOPE_VIOLATION`

## **4\) Allowlist enforcement**

As logistics_user (not allowlisted), record handoff:

- expect `NOT_ALLOWLISTED`

## **5\) Happy path flow: handoff → TC gap warning**

As allowlisted logistics_user:

- call `record_handoff`

- expect `ok:true`

- expect warning `TC_COVERAGE_GAP`

- capture `custody_boundary_id`

## **6\) Fix gap: issue TC**

As supplier_user (or certifier_user if allowed):

- call `issue_tc_for_boundary(boundary_id)`

- expect `ok:true`

## **7\) Settlement enforcement**

As supplier/buyer user:

- attempt settle transition while context present:
  - expect `ok:true`

- In a separate test where TC_REQUIRED_MODE=enforce and TC missing:
  - expect `TC_REQUIRED_MODE_ENFORCED`

## **8\) Compliance context missing/stale gate**

Delete or omit `trade_compliance_effective_rules`:

- attempt settle → expect:
  - `COMPLIANCE_CONTEXT_MISSING`

- Make context stale:
  - bump profile rules updated_at without recompute

  - settle → `COMPLIANCE_CONTEXT_STALE`

## **9\) Kill-switch block**

Set trade domain kill-switch to read_only:

- record_handoff → `DOMAIN_FROZEN`

---

# **E) “Golden Snapshot” Contract**

Store a snapshot per endpoint:

- success envelope keys

- failure envelope keys

- warning envelope keys

This prevents accidental contract drift.

---

# **F) Execution Order**

Run tests in deterministic order:

1. setup fixtures

2. run negative contract checks

3. run happy path flow

4. cleanup (optional; or reuse a dedicated test tenant schema)

---

# **Acceptance Criteria**

- One test file executes full flow via `/api/edge/*`

- Validates schema validation, RLS scoping, allowlist, kill-switch, compliance gates

- Validates warning channel \+ block codes

- Enforces unified response envelope for every call

- CI-ready and deterministic

---

## **Next logical task (only one)**

**Next: “Test Data Factory \+ Reset Mechanism (Idempotent Seeds)”** — build a small service-role script (or SQL) that resets and reseeds test fixtures on demand, so the contract harness can run repeatedly without flaky state.

# **Ticket — Test Data Factory \+ Reset Mechanism (Idempotent Seeds, Zero Flake)**

## **Goal**

Provide a deterministic, repeatable way to:

- **reset** test state

- **reseed** required fixtures (orgs/users/trade/batch/allowlist/context)

- run locally and in CI

- avoid flaky test runs due to leftover data

This becomes the foundation for reliable end-to-end contract tests.

---

## **Deliverables**

1. One reset \+ seed entrypoint (choose one):

- **Option A (recommended):** Edge admin function `test_reset_and_seed()` (service-role only)

- **Option B:** Node script using Supabase service-role key

- **Option C:** SQL-only seed run via migration (less flexible)

2. Idempotent fixture creation:

- uses deterministic IDs and `upsert`

3. Cleanup strategy:

- deletes by `test_run_id` tag **or**

- truncates only test tables in a test schema

4. Output manifest:

- returns created IDs \+ test user credentials/tokens

5. CI integration:

- step runs reset+seed before harness

6. Safety:

- only allowed in staging/local, never production

---

# **A) Strategy (Recommended)**

### **Use deterministic IDs \+ `upsert`, and delete by deterministic IDs.**

This avoids needing cascading deletes across unknown relationships.

**Approach:**

- Hardcode UUIDs for test fixtures (stable)

- Always `delete where id in (…fixtures…)` first

- Then insert/upsert

---

# **B) Deterministic Fixture IDs (Example)**

Create a single file holding IDs:

- supplier_org_id

- buyer_org_id

- logistics_org_id

- certifier_org_id

- trade_id

- batch_id

- allowlist_id

- context row IDs (if needed)

---

# **C) Edge Admin Function (Option A)**

## **Endpoint**

`POST /functions/v1/test_reset_and_seed`

### **Auth**

- requires service-role secret header, e.g.:
  - `x-texqtic-test-admin: <secret>`

- AND environment gate:
  - only allow if `ENV in ("local","staging")`

### **Steps**

1. Delete existing fixtures by known IDs:

- trade_compliance_effective_rules

- trade_compliance_dependencies

- compliance_recompute_jobs

- tc_scopes / transaction_certificates

- custody_boundaries

- events (only those tied to fixture trade)

- trade_logistics_allowlist

- material_batches

- trades

- organizations (or keep orgs stable and only reset dependent rows)

2. Insert organizations (upsert)

3. Create users in auth (if possible) or ensure users exist:

- If creating auth users is hard in Edge, keep users pre-created and only return their emails.

4. Insert trade, batch, allowlist

5. Insert compliance context row (fresh)

6. Return manifest JSON:

`{`  
 `"ok": true,`  
 `"data": {`  
 `"orgs": {...},`  
 `"users": {...},`  
 `"trade_id": "...",`  
 `"batch_id": "...",`  
 `"allowlisted_logistics_org_id": "...",`  
 `"context": { "status":"fresh" }`  
 `}`  
`}`

---

# **D) Node Service Role Script (Option B, Often Easiest)**

Create `scripts/testSeed.ts` run with `SUPABASE_SERVICE_ROLE_KEY`.

### **Benefits**

- can create auth users programmatically via Admin API

- can set custom JWT claims if needed

- runs in CI easily

### **Output**

Write `tests/e2e/manifest.json`:

- trade_id, batch_id, user emails/passwords or magic-link tokens (prefer passwords in staging only)

---

# **E) Reseed Compliance Context (Fresh)**

Ensure:

- `trade_compliance_effective_rules` exists and is fresh

- `trade_compliance_dependencies` exists

- optionally mark destination_market \= EU for strict path coverage

---

# **F) Safety Gate (Mandatory)**

Hard stop if production:

- require `process.env.NODE_ENV !== 'production'`

- require `SUPABASE_URL` matches staging/local allowlist

- require `TEST_SEED_ENABLED=true`

---

# **G) CI Workflow Integration**

Pipeline:

1. `pnpm test:seed` (reset+seed)

2. `pnpm test:e2e:contract`

---

# **Acceptance Criteria**

- One command resets and reseeds fixtures deterministically

- Repeated runs yield identical IDs and state

- Contract harness reads manifest (or uses known IDs)

- Seed step fails fast in production environments

- No flaky test failures due to leftover state

---

## **Next logical task (only one)**

**Next: “Auth Test Personas (Deterministic JWT Claims \+ Session Bootstrap)”** — standardize how test users get sessions (login helper / token minting) with correct `org_id` JWT claims, so all RLS \+ org scoping tests are reliable.

# **Ticket — Auth Test Personas (Deterministic JWT Claims \+ Session Bootstrap)**

## **Goal**

Make E2E contract tests reliable by standardizing **how test users authenticate** and ensuring their JWTs include correct custom claims (especially `org_id`) used by RLS.

This removes flakiness from:

- inconsistent sessions

- missing `org_id` in JWT

- role mismatches across tests

---

## **Deliverables**

1. Deterministic test personas:

- supplier_user

- buyer_user

- logistics_user

- certifier_user

- governance_admin (optional)

2. Session bootstrap mechanism (choose one):

- **Option A (recommended):** service-role “token mint” endpoint to issue short-lived JWTs for test personas

- Option B: password login flow per persona (slower)

- Option C: magic-link (harder in CI)

3. Confirmed JWT claims:

- `org_id`

- `role` (tenant role / global admin if needed)

4. Test helper:

- `asPersona("supplier").fetchEdge(fn, body)`

5. Assertions:

- sanity-check endpoint `whoami()` returns org_id/role for each persona

---

# **A) Decide the Session Strategy**

## **Option A (Recommended): Token Minting for Tests**

Create a **service-role only** Edge function:

`POST /functions/v1/test_mint_token`

Input:

`{ "persona": "supplier|buyer|logistics|certifier|admin" }`

Output:

`{ "ok": true, "data": { "access_token": "...", "expires_in": 3600, "org_id":"...", "user_id":"..." } }`

Tests then call Next.js gateway but attach token in a cookie/header used by gateway.

### **Why this is best**

- deterministic

- fast

- avoids password rotation/magic links

- guarantees custom claims are present

---

# **B) How to Guarantee `org_id` Claim Exists**

You already plan to use custom JWT claims for RLS. Ensure your auth pipeline includes an `org_id` claim for user sessions.

For test personas, you can enforce this by either:

1. Storing `org_id` in `auth.users.user_metadata` and using a JWT hook/claim mapping (Supabase supported patterns), OR

2. Bypassing normal login and minting a signed JWT with the claim directly (test-only).

**For tests only**, minting is acceptable if:

- staging/local only

- service role protected

- short expiration

---

# **C) Token Mint Function (Test-only)**

### **Inputs**

- persona → maps to deterministic user_id \+ org_id

- optional `scopes` array

### **Server action**

- validate environment gate: `TEST_SEED_ENABLED=true`

- look up persona from deterministic manifest (from seed step)

- mint JWT containing:
  - `sub` \= user_id

  - `org_id` \= org_id

  - optional `role`

- return token

Implementation detail depends on whether you want Supabase-native tokens or a parallel signing secret. Fastest is a test-only signing secret checked by gateway; more “native” is using Supabase admin auth session creation if available.

---

# **D) Next.js Gateway Must Accept Test Tokens**

Update `/api/edge/[fn]` gateway:

Priority order for auth:

1. If `x-test-access-token` header present (CI only), use it

2. Else use normal Supabase session cookie

This allows tests to remain pure HTTP without a browser login.

**Safety gate:** only honor `x-test-access-token` if `TEST_SEED_ENABLED=true`.

---

# **E) `whoami()` Sanity Endpoint**

Add an Edge function `whoami` that returns:

`{`  
 `"ok": true,`  
 `"data": {`  
 `"user_id": "...",`  
 `"org_id": "...",`  
 `"org_type": "...",`  
 `"roles": ["..."],`  
 `"claims": { ... } // optional`  
 `}`  
`}`

Tests call `whoami` for every persona at startup and assert:

- org_id matches expected

- org_type matches expected

---

# **F) Test Helper API**

`tests/e2e/personas.ts`

- `mintToken(persona)` → token

- `asPersona(persona).post(fn, body)`:
  - calls `/api/edge/${fn}` with `x-test-access-token: <token>`

---

# **G) Acceptance Criteria**

- Each persona can obtain a deterministic session/token in CI

- Tokens reliably include `org_id` claim used by RLS

- `whoami()` confirms claims for each persona

- E2E harness can swap personas without login flows

- Test tokens are disabled in production and require explicit env flag

---

## **Next logical task (only one)**

**Next: “RLS Verification Suite (Policy Assertions as Tests)”** — add a small set of tests that explicitly verify core RLS invariants (org isolation, allowlist read constraints, append-only events) using these personas, before running larger workflow tests.

# **Ticket — RLS Verification Suite (Policy Assertions as Tests)**

## **Goal**

Before running workflow E2E tests, run a fast “policy unit test” suite that proves core Row-Level Security invariants hold for all personas:

- strict org isolation

- allowlist-scoped access

- append-only event ledger

- no cross-tenant joins/leaks through views

This catches regressions early and prevents false confidence from workflows that “happen to pass.”

---

## **Deliverables**

1. Test file:

- `tests/e2e/rls-suite.test.ts`

2. Persona harness integration:

- uses minted tokens (supplier/buyer/logistics/certifier/admin)

3. Core RLS assertions:

- org isolation across tables

- allowlist read constraints (logistics)

- immutable events (no update/delete)

- view safety (DPP / context status)

4. CI step:

- run RLS suite before workflow contract harness

---

# **A) Tables/Views to Validate (Minimum Set)**

### **Tenant-scoped tables**

- `organizations` (limited fields or admin-only)

- `trades`

- `traceability_nodes`

- `traceability_edges`

- `custody_boundaries`

- `transaction_certificates`

- `tc_scopes`

- `trade_logistics_allowlist`

### **Control Plane tables**

- `events` (append-only, org-scoped reads, insert allowed within org only)

### **Views (leak checks)**

- `dpp_product_passport` (regulator/buyer rules later; for now ensure no cross-org)

- `compliance_context_status` (admin-only or restricted)

---

# **B) Test Setup Assumptions**

Seed step provides:

- 1 trade between buyer and supplier

- 1 batch

- allowlisted logistics partner for that trade

- at least one “foreign” trade/batch belonging to another org (or create one in setup)

- personas minted with correct `org_id` claim

---

# **C) Core RLS Tests (Must-have)**

## **1\) Org Isolation — Trades**

**Buyer** can read trade where buyer_org_id \= buyer  
 **Supplier** can read same trade  
 **Third-party org** cannot read it

Assertions:

- buyer sees 1 trade

- supplier sees 1 trade

- certifier/logistics (unless allowlisted read model exists) sees 0

## **2\) Allowlist Read Constraint — Logistics**

**Allowlisted logistics** can read only allowlisted trade roster (minimal fields)  
 **Non-allowlisted logistics** sees nothing

If you implemented `logistics_trade_roster` view:

- allowlisted sees the trade

- non-allowlisted sees 0 rows

## **3\) Custody Boundaries Write Constraint**

- logistics partner can create custody only via Edge RPC; but DB direct writes should be denied (if applicable)

- at minimum, ensure they cannot insert directly into custody table via PostgREST (403)

## **4\) Events Append-Only**

As any authenticated persona:

- INSERT allowed only if `org_id == jwt.org_id`

- UPDATE forbidden

- DELETE forbidden

Test:

- insert event with matching org_id → success (200)

- insert event with different org_id → denied (403)

- update inserted event → denied

- delete inserted event → denied

## **5\) Cross-Org Leakage Through Views**

As supplier:

- query DPP view rows for batch belonging to supplier → allowed (if permitted)

- attempt to query batch belonging to another org → 0 rows (or denied)

## **6\) RLS Invariants for `trade_logistics_allowlist`**

- buyer/supplier can read allowlist rows for their trade

- logistics org can read its own allowlist row

- other org cannot read

---

# **D) Implementation Detail — How Tests Query**

Use the same `/api/edge/*` gateway or direct PostgREST?

**Best:** Direct PostgREST for pure RLS assertions, because it tests the DB layer without Edge logic.

Pattern:

- `asPersona().db.from("trades").select("*")` with JWT token

- Ensure your test harness can call Supabase REST with `Authorization: Bearer <token>`

---

# **E) Example Test List (Readable Spec)**

### **`rls-suite.test.ts`**

1. `buyer_can_read_own_trade`

2. `supplier_can_read_own_trade`

3. `certifier_cannot_read_trade_by_default`

4. `allowlisted_logistics_can_read_roster_only`

5. `non_allowlisted_logistics_cannot_read_roster`

6. `events_insert_scoped_to_org`

7. `events_update_delete_denied`

8. `allowlist_read_rules_enforced`

9. `dpp_view_no_cross_org_leak`

---

# **F) Acceptance Criteria**

- RLS suite runs fast (\<30–60s typical) and deterministically

- Validates org isolation for core domain tables

- Validates allowlist constraints for logistics access

- Validates events append-only \+ org scoping

- Validates no cross-tenant leakage through key views

- CI runs RLS suite before workflow harness

---

## **Next logical task (only one)**

**Next: “RLS Policy Hardening Pass (Security Definer Predicates \+ JWT Claim Usage Audit)”** — once the suite exists, tighten policies by centralizing predicates (e.g., `is_member_of_org()`, `is_global_admin()`), replacing subqueries with JWT claims, and verifying performance/consistency across all tables.

# **Ticket — RLS Policy Hardening Pass (Security Definer Predicates \+ JWT Claim Audit)**

## **Goal**

Make RLS policies:

- **consistent** (one predicate used everywhere)

- **fast** (no per-row subqueries when JWT claims suffice)

- **maintainable** (policy logic centralized in SECURITY DEFINER functions)

- **provable** (validated by the RLS Verification Suite)

This is the “Database Fortress” hardening pass for production.

---

## **Deliverables**

1. Canonical SECURITY DEFINER predicate functions:

- `current_org_id()`

- `is_global_admin()`

- `is_org_member(org_id)`

- `is_trade_party(trade_id)`

- `is_allowlisted_logistics(trade_id, org_id)`

- `has_role(role_key)`

2. JWT claim audit:

- confirm `org_id`, `roles`, `org_type` claims exist and are stable

3. Policy rewrite across key tables:

- remove subqueries in policies

- standardize select/insert rules

4. Performance verification:

- EXPLAIN plans on high-volume tables (`events`, `traceability_*`)

5. Regression checks:

- RLS suite passes unchanged

---

# **A) Standardize JWT Claims (Contract)**

Required claims (minimum):

- `org_id` (uuid string)

- `roles` (string\[\] or CSV)

- optionally `org_type`

**Decision:** Treat `org_id` as mandatory for all authenticated sessions.  
 If absent → reject writes / reduce to read-only.

---

# **B) Canonical Helper Functions (SQL)**

File: `supabase/migrations/310_rls_predicates.sql`

`create or replace function public.current_org_id()`  
`returns uuid`  
`language sql`  
`stable`  
`as $$`  
 `select (auth.jwt() ->> 'org_id')::uuid`  
`$$;`

`create or replace function public.current_roles()`  
`returns text[]`  
`language sql`  
`stable`  
`as $$`  
 `select coalesce(`  
 `(select array_agg(value::text)`  
 `from jsonb_array_elements_text(coalesce(auth.jwt() -> 'roles', '[]'::jsonb)) as value),`  
 `'{}'::text[]`  
 `)`  
`$$;`

`create or replace function public.has_role(p_role text)`  
`returns boolean`  
`language sql`  
`stable`  
`as $$`  
 `select p_role = any(public.current_roles())`  
`$$;`

`-- Global admin check (centralized)`  
`create or replace function public.is_global_admin()`  
`returns boolean`  
`language sql`  
`stable`  
`security definer`  
`as $$`  
 `select public.has_role('GLOBAL_ADMIN') or public.has_role('DOCTRINE_COUNCIL')`  
`$$;`

`-- Safe org membership primitive (v1: org_id claim implies membership)`  
`create or replace function public.is_org_member(p_org_id uuid)`  
`returns boolean`  
`language sql`  
`stable`  
`as $$`  
 `select public.current_org_id() = p_org_id`  
`$$;`

`revoke all on function public.current_org_id() from authenticated;`  
`revoke all on function public.current_roles() from authenticated;`  
`revoke all on function public.has_role(text) from authenticated;`  
`revoke all on function public.is_global_admin() from authenticated;`  
`revoke all on function public.is_org_member(uuid) from authenticated;`

Note: `security definer` only where needed. `current_org_id()` can be plain stable; revoking is optional.

---

# **C) Domain-Specific Predicates**

File: `supabase/migrations/311_rls_trade_predicates.sql`

`create or replace function public.is_trade_party(p_trade_id uuid)`  
`returns boolean`  
`language sql`  
`stable`  
`security definer`  
`as $$`  
 `select exists (`  
 `select 1`  
 `from public.trades t`  
 `where t.id = p_trade_id`  
 `and (t.buyer_org_id = public.current_org_id() or t.supplier_org_id = public.current_org_id())`  
 `)`  
`$$;`

`create or replace function public.is_allowlisted_logistics(p_trade_id uuid, p_org_id uuid)`  
`returns boolean`  
`language sql`  
`stable`  
`security definer`  
`as $$`  
 `select exists (`  
 `select 1`  
 `from public.trade_logistics_allowlist a`  
 `where a.trade_id = p_trade_id`  
 `and a.logistics_org_id = p_org_id`  
 `and a.is_active = true`  
 `)`  
`$$;`

`revoke all on function public.is_trade_party(uuid) from authenticated;`  
`revoke all on function public.is_allowlisted_logistics(uuid,uuid) from authenticated;`

---

# **D) Rewrite RLS Policies (Examples)**

## **1\) `events` (append-only)**

**Goal:** No updates/deletes, org-scoped reads, org-scoped inserts.

`alter table public.events enable row level security;`

`drop policy if exists events_read on public.events;`  
`create policy events_read`  
`on public.events for select`  
`using (`  
 `public.is_global_admin()`  
 `or org_id = public.current_org_id()`  
`);`

`drop policy if exists events_insert on public.events;`  
`create policy events_insert`  
`on public.events for insert`  
`with check (`  
 `org_id = public.current_org_id()`  
`);`

`revoke update, delete on public.events from authenticated;`

## **2\) `trades`**

`alter table public.trades enable row level security;`

`drop policy if exists trades_read on public.trades;`  
`create policy trades_read`  
`on public.trades for select`  
`using (`  
 `public.is_global_admin()`  
 `or buyer_org_id = public.current_org_id()`  
 `or supplier_org_id = public.current_org_id()`  
`);`

## **3\) `trade_logistics_allowlist`**

`alter table public.trade_logistics_allowlist enable row level security;`

`drop policy if exists allowlist_read on public.trade_logistics_allowlist;`  
`create policy allowlist_read`  
`on public.trade_logistics_allowlist for select`  
`using (`  
 `public.is_global_admin()`  
 `or public.is_trade_party(trade_id)`  
 `or logistics_org_id = public.current_org_id()`  
`);`

---

# **E) Replace Subqueries with Claims (Audit Checklist)**

Search and fix policies that do things like:

- `org_id in (select org_id from memberships where user_id = auth.uid())`  
   Replace with:

- `org_id = current_org_id()`

**Rationale:** membership lookup becomes a login-time concern; RLS becomes O(1).

---

# **F) Performance Verification**

For high-volume tables (`events`, `traceability_edges`, `traceability_nodes`):

- Ensure `org_id` is indexed

- Run:
  - `EXPLAIN (ANALYZE, BUFFERS)` for typical queries

- Confirm:
  - index scans on org_id

  - no repeated subquery evaluation per row

---

# **G) Safety: Don’t Over-Privileged `security definer`**

Rules:

- security definer functions must:
  - be `stable`/`immutable` where possible

  - not return broad data; only boolean predicates

  - live in `public` with tightly controlled privileges

- set `search_path` inside function if needed (optional hardening)

---

# **H) Acceptance Criteria**

- All key tables use centralized predicates (no duplicated RLS logic)

- All org-scoped policies rely on JWT `org_id`, not subqueries

- `events` remains append-only for authenticated users

- RLS suite passes with no test changes

- EXPLAIN confirms improved performance on high-volume tables

---

## **Next logical task (only one)**

**Next: “JWT Claim Provisioning Pipeline (Org Membership → Claim Minting)”** — implement the canonical way users get `org_id` \+ roles into JWTs at login (and keep it current on org switches), so RLS remains correct without manual hacks.

# **Ticket — JWT Claim Provisioning Pipeline (Org Membership → Claim Minting \+ Org Switch)**

## **Goal**

Make JWT claims **authoritative and automatic** so RLS can rely on them:

- `org_id` and `roles` are present in every authenticated session

- claims are derived from canonical membership tables

- users can switch orgs (multi-tenant) safely

- token refresh updates claims without manual steps

- no app-layer subqueries required by RLS

This is the “claim minting” foundation for production-grade tenant isolation.

---

## **Deliverables**

1. Canonical membership \+ roles model:

- `org_memberships`

- `org_roles`

2. Claim generation function:

- `public.get_jwt_claims(uid)` → jsonb

3. Claim propagation mechanism (choose):

- **Option A (recommended):** Edge “Session Bootstrap” endpoint that returns a Supabase custom access token or session \+ sets org context

- Option B: “Org switch” endpoint that stores active org in DB and forces re-auth/refresh

4. Org switch flow:

- `POST /api/org/switch {org_id}`

- refresh session to pick up new claims

5. Safety checks:

- user must be a member of target org

- default org selection rules

6. Tests:

- login → token contains org_id \+ roles

- switch org → new token contains new org_id

- removed from org → claims revoked on next refresh

---

# **A) Canonical Tables**

File: `supabase/migrations/320_org_memberships.sql`

`create table if not exists public.org_memberships (`  
 `id uuid primary key default gen_random_uuid(),`  
 `user_id uuid not null references auth.users(id) on delete cascade,`  
 `org_id uuid not null references public.organizations(id) on delete cascade,`  
 `status text not null default 'active' check (status in ('active','suspended','revoked')),`  
 `is_default boolean not null default false,`  
 `created_at timestamptz not null default now(),`  
 `unique (user_id, org_id)`  
`);`

`create table if not exists public.org_roles (`  
 `id uuid primary key default gen_random_uuid(),`  
 `user_id uuid not null references auth.users(id) on delete cascade,`  
 `org_id uuid not null references public.organizations(id) on delete cascade,`  
 `role_key text not null, -- 'SUPPLIER_ADMIN','BUYER_USER','GLOBAL_ADMIN', etc.`  
 `created_at timestamptz not null default now(),`  
 `unique (user_id, org_id, role_key)`  
`);`

---

# **B) Track Active Org (for org switching)**

You need a single source of truth for the user’s “current org context”.

File: `supabase/migrations/321_user_active_org.sql`

`create table if not exists public.user_active_org (`  
 `user_id uuid primary key references auth.users(id) on delete cascade,`  
 `org_id uuid not null references public.organizations(id),`  
 `updated_at timestamptz not null default now()`  
`);`

Rules:

- if absent, use default org from `org_memberships.is_default=true`

- if none default, pick most-recent active membership

---

# **C) Claim Builder Function (DB)**

File: `supabase/migrations/322_get_jwt_claims.sql`

`create or replace function public.get_jwt_claims(p_uid uuid)`  
`returns jsonb`  
`language plpgsql`  
`security definer`  
`stable`  
`as $$`  
`declare`  
 `v_org uuid;`  
 `v_roles text[];`  
`begin`  
 `-- Determine active org`  
 `select org_id into v_org`  
 `from public.user_active_org`  
 `where user_id = p_uid;`

`if v_org is null then`  
 `select org_id into v_org`  
 `from public.org_memberships`  
 `where user_id = p_uid and status='active' and is_default=true`  
 `limit 1;`  
 `end if;`

`if v_org is null then`  
 `select org_id into v_org`  
 `from public.org_memberships`  
 `where user_id = p_uid and status='active'`  
 `order by created_at desc`  
 `limit 1;`  
 `end if;`

`if v_org is null then`  
 `-- No org: issue minimal claims; RLS will lock down writes.`  
 `return jsonb_build_object('roles', jsonb_build_array());`  
 `end if;`

`select coalesce(array_agg(role_key order by role_key), '{}'::text[]) into v_roles`  
 `from public.org_roles`  
 `where user_id = p_uid and org_id = v_org;`

`return jsonb_build_object(`  
 `'org_id', v_org::text,`  
 `'roles', to_jsonb(v_roles),`  
 `'org_scope', 'tenant'`  
 `);`  
`end;`  
`$$;`

`revoke all on function public.get_jwt_claims(uuid) from authenticated;`

---

# **D) How Claims Get Into JWTs (Practical v1)**

Supabase JWT claim injection is typically done via an auth hook / JWT customization mechanism. The fastest production-safe approach for your stack:

## **Recommended v1: “Session Bootstrap \+ Org Switch” via Edge \+ refresh**

1. User logs in normally via Supabase Auth

2. Client calls `POST /api/org/bootstrap` (Next.js route)

3. That route calls Edge function `set_active_org(org_id)` (writes `user_active_org`)

4. Client triggers `supabase.auth.refreshSession()` to get a fresh JWT

5. RLS now uses updated org_id claim

**Key idea:** active org is stored server-side; refresh picks it up.

---

# **E) Org Switch Endpoint**

## **API**

`POST /api/org/switch { org_id }`

### **Server checks**

- user is member of org_id and status=active

- update `user_active_org`

- return `ok:true`

Client then calls `refreshSession()` and reloads.

---

# **F) Guardrails**

- If membership revoked, next refresh returns no org_id claim (RLS locks down)

- If multiple org memberships, switching is explicit and audited:
  - emit `ORG_CONTEXT_SWITCHED` event (optional but recommended)

---

# **G) Tests**

1. Login \+ bootstrap sets org → token contains org_id

2. Switch org → token org_id changes

3. Remove membership → refresh removes org claim and access is restricted

4. Roles update → refresh updates roles array

---

# **Acceptance Criteria**

- Canonical membership \+ role tables exist

- Active org context stored and switchable

- Claim builder function returns `{org_id, roles}`

- Tokens reliably reflect org context after refresh

- RLS relies on org_id claim without subqueries

- Tests validate login, switch, revoke flows

---

## **Next logical task (only one)**

**Next: “Org Switch UX \+ Safe Session Refresh (No Stale Claims)”** — add a small UI control for switching orgs, enforce a full session refresh \+ cache clear, and show the active org context everywhere in the app header to prevent operator mistakes.

# **Ticket — Org Switch UX \+ Safe Session Refresh (No Stale Claims)**

## **Goal**

Add a minimal but production-safe org switch experience that:

- makes the active org unambiguous at all times

- refreshes session so JWT claims update immediately

- clears client caches to prevent cross-tenant data bleed

- prevents switching to orgs the user isn’t a member of

- integrates with the new `/api/org/switch` pipeline

This is the human-proofing layer for multi-tenant correctness.

---

## **Deliverables**

1. Header UI:

- active org badge (name \+ org_type)

- org switch dropdown (only member orgs)

2. Session refresh workflow:

- calls `/api/org/switch`

- forces `supabase.auth.refreshSession()`

- clears app caches (React Query/SWR/local state)

- hard navigates to a safe landing route

3. Server endpoint:

- `GET /api/org/list` returns orgs user can access (from `org_memberships`)

4. Safety UX:

- loading state

- error state (“Not authorized to switch”)

- confirm dialog if leaving an in-progress workflow

5. Tests:

- switching org changes header org badge

- switching org causes subsequent calls to be org-scoped correctly (no stale data)

---

# **A) UX Spec (Minimal, Must-Have)**

## **Header**

- Left: TexQtic logo

- Right: `Active Org: <OrgName> (<OrgType>)` pill

- Dropdown: list of accessible orgs
  - default org shown with indicator

  - disabled entries for suspended/revoked (if returned; ideally don’t return them)

## **Org Switch Actions**

- user selects org

- UI shows “Switching…”

- after refresh, user lands on:
  - `/dashboard` (or `/app/home`)

- show toast: “Switched to \<OrgName\>”

---

# **B) API Endpoints**

## **1\) List orgs for user**

`GET /api/org/list`

Response:

`{`  
 `"ok": true,`  
 `"data": {`  
 `"active_org_id": "…",`  
 `"orgs": [`  
 `{ "org_id":"…", "name":"…", "org_type":"buyer", "is_default":true }`  
 `]`  
 `}`  
`}`

Implementation:

- query `org_memberships join organizations`

- read active from `user_active_org`

## **2\) Switch org**

`POST /api/org/switch { org_id }`

- validates membership

- updates `user_active_org`

- returns `ok:true`

---

# **C) Client Switch Flow (No Stale Claims)**

### **Steps**

1. `await fetch('/api/org/switch', { org_id })`

2. `await supabase.auth.refreshSession()`

3. `clearCaches()`:
   - React Query: `queryClient.clear()` (or `invalidateQueries` on org-scoped keys)

   - SWR: `mutate(() => true, undefined, { revalidate: false })` or reset store

   - local Zustand/Redux: reset org-scoped slices

4. Hard navigation:
   - `window.location.assign('/dashboard')` (forces full reload, safest)

5. On load, header calls `/api/org/list` again and shows new active org

**Why hard reload?**  
 It’s the simplest way to guarantee:

- no stale in-memory data

- no leaked org-scoped caches

- JWT is definitely applied everywhere

You can optimize later once confident.

---

# **D) Cache Key Discipline (Required)**

All client-side caches must include `org_id` in the key or be cleared on switch.

Example:

- `['trades', orgId, filters]`

- `['batches', orgId]`

Even with hard reload, do this for correctness.

---

# **E) UI Component Sketch**

## **`OrgSwitcher` component**

- loads org list on mount

- shows active org pill

- dropdown selection triggers switch flow

States:

- loading org list

- switching org

- error

---

# **F) Guardrails**

- Disable switch while `approval_only` workflows open? (optional)

- Confirm modal if user has unsaved changes:
  - “Switching org will discard unsaved changes.”

---

# **G) Tests**

1. Unit:

- renders active org badge from `/api/org/list`

- dropdown renders correct orgs

2. Integration:

- select org B

- `/api/org/switch` called

- refreshSession called

- cache clear called

- navigation triggered

3. E2E:

- switch org

- call an org-scoped endpoint

- verify result belongs only to new org

---

# **Acceptance Criteria**

- Active org shown prominently in header at all times

- Switch dropdown lists only accessible orgs

- Switch triggers `/api/org/switch` \+ refreshSession

- Client caches are cleared and page reloads to safe route

- Tests confirm no stale org data after switch

---

## **Next logical task (only one)**

**Next: “Org-Scoped Cache & Query Key Standard (Prevent Cross-Tenant Bleed)”** — formalize a convention for cache keys, query wrappers, and data stores so org_id is always present (and enforce it with lint rules or helper APIs), reducing reliance on hard reload over time.

# **Ticket — Org-Scoped Cache & Query Key Standard (Prevent Cross-Tenant Bleed)**

## **Goal**

Eliminate cross-tenant data bleed by enforcing a single convention:

- every cached query **must** be scoped by `org_id`

- every client store slice holding tenant data **must** be org-scoped or reset on switch

- provide helpers so engineers can’t “forget org_id”

- optional lint rule / codemod to enforce discipline

This reduces reliance on hard reloads and prevents subtle production leaks.

---

## **Deliverables**

1. Canonical `OrgContext` provider:

- exposes `activeOrgId`, `activeOrg`, `orgVersion` (increments on switch)

2. Query key factory:

- `qk(orgId).trades.list(filters)`

- `qk(orgId).batches.byId(id)`

3. Fetch wrappers:

- `edgeQuery(fn, body)` automatically tags requests with orgVersion (optional)

4. Store discipline:

- `createOrgStore()` helper that namespaces state by org_id

- reset hooks on org switch

5. Enforcement:

- ESLint rule or TypeScript helper patterns that make unscoped keys hard/impossible

6. Migration plan:

- update top 10 queries first (trades, batches, DPP, custody, certifications)

---

# **A) Canonical Org Context (Client)**

## **`OrgProvider`**

- loads active org via `/api/org/list`

- provides:
  - `orgId`

  - `orgName/orgType`

  - `orgVersion` (number increments when org changes)

`orgVersion` is a cheap “cache bust” component.

---

# **B) Query Key Standard (React Query / SWR)**

## **React Query example**

Create a single file: `lib/queryKeys.ts`

`export const qk = (orgId: string) => ({`  
 `trades: {`  
 `list: (filters: Record<string, any>) => ["org", orgId, "trades", "list", filters] as const,`  
 `byId: (tradeId: string) => ["org", orgId, "trades", "byId", tradeId] as const`  
 `},`  
 `dpp: {`  
 `export: (tradeId: string) => ["org", orgId, "dpp", "export", tradeId] as const`  
 `}`  
`});`

**Non-negotiable rule:** every key begins with `["org", orgId, ...]`.

---

# **C) Query Wrapper Helpers (Make It Hard to Do Wrong)**

## **`useOrgQuery`**

Wrap React Query so devs don’t pass raw keys:

`export function useOrgQuery<T>(`  
 `orgId: string,`  
 `key: readonly unknown[],`  
 `fn: () => Promise<T>`  
`) {`  
 `if (!orgId) throw new Error("orgId required");`  
 `return useQuery({ queryKey: key, queryFn: fn });`  
`}`

Then usage is always:

`const key = qk(orgId).trades.byId(tradeId);`  
`useOrgQuery(orgId, key, () => fetchTrade(tradeId));`

---

# **D) Client State Stores (Zustand/Redux)**

## **Option A: Namespace by orgId (preferred)**

Store shape:

`state = {`  
 `byOrg: {`  
 `[orgId]: { ...tenantState }`  
 `}`  
`}`

## **Option B: Single org state \+ reset on switch**

If you don’t want multi-org memory:

- reset tenant slices on org switch event

Provide helper:

- `resetOnOrgChange(orgVersion)` hooks

---

# **E) Enforce via Lint / Helper API**

## **Lightweight enforcement (fastest)**

- ban direct `useQuery({ queryKey: [...] })` usage in codebase via ESLint rule:
  - require `qk(orgId)` prefix in first two elements

- or ban `["trades", ...]` keys not starting with `["org", ...]`

## **Strong enforcement (best)**

- only export `useOrgQuery` and disallow importing `useQuery` directly (via lint)

---

# **F) Migration Plan (Keep Focus)**

Phase 1 (critical):

- trades list/byId

- custody boundaries list

- DPP export

- certifications list

- compliance context status

Phase 2:

- traceability graph

- AI risk scores

- governance console

---

# **Acceptance Criteria**

- Query key factory exists and is used by new code

- Top critical queries migrated to org-scoped keys

- Org switch triggers cache invalidation or orgVersion bump

- Store data is org-namespaced or reset on switch

- Lint/enforcement prevents new unscoped keys

- No cross-tenant cache bleed in E2E org switch test

---

## **Next logical task (only one)**

**Next: “Org Switch E2E Leak Test (Black-box)”** — add an automated test that switches orgs and verifies that previously fetched tenant data cannot be accessed or displayed after switching (including cached screens and back button behavior).

# **Ticket — Org Switch E2E Leak Test (Black-box Cross-Tenant Cache Safety)**

## **Goal**

Add an automated end-to-end test that proves: after switching orgs, **no data from the previous org** can be:

- displayed from client cache

- accessed via back button/history

- rendered from stale state stores

- retrieved via API with the new org JWT

This is a “black-box” leak test: it doesn’t assume implementation details—only observable behavior.

---

## **Deliverables**

1. E2E test spec:

- `tests/e2e/org-switch-leak.spec.ts`

2. Requires two orgs with distinct data:

- Org A has Trade A (unique marker)

- Org B has Trade B (different marker)

3. Test steps cover:

- cache reuse prevention

- back button behavior

- direct deep-link access after switch

4. CI integration

---

# **A) Prerequisites (Test Data)**

Seed must guarantee:

- Persona user has membership in **Org A and Org B**

- Org A contains:
  - `trade_A` with obvious unique string e.g. `reference_code = "TRADE_A_UNIQUE_123"`

- Org B contains:
  - `trade_B` with `reference_code = "TRADE_B_UNIQUE_456"`

Also ensure:

- `/trades/[id]` page displays `reference_code` (or any stable unique field)

---

# **B) Test Tooling**

Use Playwright (recommended) or Cypress. The test must drive a real browser to validate cache/history behavior.

---

# **C) Test Cases (Must-have)**

## **1\) Cache Leak Prevention on Switch**

**Steps**

1. Login as multi-org user

2. Ensure active org \= Org A

3. Navigate to `/trades/trade_A`

4. Assert page shows `TRADE_A_UNIQUE_123`

5. Switch org to Org B via UI

6. Navigate to `/trades/trade_B`

7. Assert shows `TRADE_B_UNIQUE_456`

8. Assert **does not** show `TRADE_A_UNIQUE_123` anywhere

**Pass condition**

- No Org A marker appears in Org B state.

---

## **2\) Back Button / History Leak**

**Steps**

1. From Org B trade page, click browser **Back**

2. If route returns to Org A trade URL:
   - page must show “Not found / Unauthorized / Wrong org” OR redirect to safe page

   - and must not show `TRADE_A_UNIQUE_123`

3. If route returns to listing:
   - listing must reflect Org B only

**Pass condition**

- Back navigation does not reveal Org A data.

---

## **3\) Deep-link access after switch (Hard check)**

**Steps**

1. While still in Org B, directly visit `/trades/trade_A` (paste URL)

2. Expect:
   - 403-style UX or “Trade not available in current org”

   - and no Org A data rendered

**Pass condition**

- Deep link cannot load previous org’s resource after switch.

---

## **4\) Client cache poisoning check (optional but high value)**

**Steps**

1. In Org A, open `/trades` list and ensure it contains `TRADE_A_UNIQUE_123`

2. Switch to Org B

3. Immediately open `/trades` list

4. Ensure it contains `TRADE_B_UNIQUE_456` and not Org A trade

**Pass condition**

- list cache is org-scoped or invalidated.

---

# **D) Implementation Notes (What the test expects)**

The app should implement at least one of:

- hard reload on org switch (most robust)

- org-scoped cache keys (`["org", orgId, ...]`)

- store reset on org change

- server rejects cross-org reads via RLS (must be true regardless)

The test does not care how—you just must not leak.

---

# **E) Suggested Playwright Skeleton (Non-code checklist)**

- Use seeded persona tokens or UI login

- Use `data-testid="org-switcher"` for stable switching

- Use assertions on unique marker strings

- Use `page.goBack()` for history test

- Use direct `page.goto()` for deep link test

---

# **Acceptance Criteria**

- After org switch, previous org’s trade marker never appears again

- Back button cannot reveal previous org’s trade data

- Deep-link to previous org trade is blocked/redirected safely

- Trades list reflects only active org after switch

- Test runs deterministically in CI

---

## **Next logical task (only one)**

**Next: “Cross-Org URL Guard (Server-side)”** — add a server-side guard that checks route params against current org scope (via RLS-backed fetch) and returns 404/redirect before rendering, so even SSR/streaming can’t momentarily flash stale data.

- doctrine_v1_4_part_4_EXECUTABLE.md
